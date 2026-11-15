import * as T from "three";
import type { Theme } from "@/lib/plan";
import { floodProgress } from "./world-rules";

type Walkable = (x:number,z:number)=>boolean;
const step=.5;
const side=41;
const gridOrigin=(side-1)*step/2;
const directions=[[-1,0],[1,0],[0,-1],[0,1]] as const;

// Route on the same floor and obstacle geometry as the player.
function createNavigator(canWalk:Walkable){
  const locations=Array.from({length:side*side},(_,i)=>new T.Vector2(i%side*step-gridOrigin,Math.floor(i/side)*step-gridOrigin));
  const walkable=locations.map(point=>canWalk(point.x,point.y));
  function closest(x:number,z:number){
    let index=-1;
    let distance=Infinity;
    for(let i=0;i<locations.length;i++){
      if(!walkable[i])continue;
      const point=locations[i];
      const nextDistance=(point.x-x)**2+(point.y-z)**2;
      if(nextDistance<distance){index=i;distance=nextDistance;}
    }
    return index;
  }
  function nextWaypoint(start:T.Vector3,target:T.Vector3){
    const from=closest(start.x,start.z);
    const to=closest(target.x,target.z);
    if(from===to || from<0 || to<0)return new T.Vector2(target.x,target.z);
    const parent=new Int16Array(locations.length).fill(-1);
    const queue=[to];
    parent[to]=to;
    for(let read=0;read<queue.length;read++){
      const current=queue[read];
      if(current===from)return locations[parent[current]];
      const x=current%side, z=Math.floor(current/side);
      for(const [dx,dz] of directions){
        const nx=x+dx,nz=z+dz;
        if(nx<0 || nx>=side || nz<0 || nz>=side)continue;
        const neighbor=nz*side+nx;
        if(!walkable[neighbor] || parent[neighbor]!==-1)continue;
        const a=locations[current],b=locations[neighbor];
        if(!canWalk((a.x+b.x)/2,(a.y+b.y)/2))continue;
        parent[neighbor]=current;
        queue.push(neighbor);
      }
    }
    return locations[from];
  }
  return {locations:locations.filter((_,i)=>walkable[i]),nextWaypoint};
}

export function buildHazard(scene:T.Scene,theme:Theme,shape:T.Shape,spawn:T.Vector3,landmark:T.Vector3,canWalk:Walkable){
  const water=theme==="ocean"?new T.Mesh(
    new T.ShapeGeometry(shape),
    new T.MeshPhysicalMaterial({color:"#38b8cd",transparent:true,opacity:.39,roughness:.25,metalness:.28,side:T.DoubleSide,depthWrite:false}),
  ):null;
  if(water){
    water.rotation.x=-Math.PI/2;
    water.position.y=.015;
    water.renderOrder=4;
    scene.add(water);
  }
  let trail:ReturnType<typeof createNavigator>|null=null;
  let creature:T.Group|null=null;
  const limbs:T.Mesh[]=[];
  if(theme==="alien"){
    trail=createNavigator(canWalk);
    const start=trail.locations.reduce((best,point)=>{
      const distance=(p:T.Vector2)=>(p.x-spawn.x)**2+(p.y-spawn.z)**2;
      return distance(point)>distance(best)?point:best;
    });
    creature=new T.Group();
    creature.position.set(start.x,.15,start.y);
    creature.visible=false;
    scene.add(creature);
    const body=new T.MeshStandardMaterial({color:"#7968b5",roughness:.42,metalness:.25,emissive:"#372450",emissiveIntensity:.55});
    const membrane=new T.MeshStandardMaterial({color:"#caff86",roughness:.35,emissive:"#82d936",emissiveIntensity:1});
    const shell=new T.Mesh(new T.IcosahedronGeometry(.59,2),body);
    shell.position.y=.84;shell.scale.set(.82,1.16,1.05);shell.castShadow=true;
    creature.add(shell);
    for(const x of [-.19,.19]){
      const eye=new T.Mesh(new T.SphereGeometry(.108,14,10),membrane);
      eye.position.set(x,.99,.47);creature.add(eye);
    }
    for(let i=0;i<4;i++){
      const leg=new T.Mesh(new T.CapsuleGeometry(.074,.47,4,9),body);
      const side=i%2?-1:1;
      leg.position.set(side*.36,.39,i<2?.23:-.23);leg.rotation.z=side*.52;
      creature.add(leg);
      limbs.push(leg);
    }
  }

  let destination:T.Vector2|null=null;
  let nextPathUpdate=0;
  const dryFloor=.015;
  const fullFlood=2.735;
  let waterHeight=dryFloor;
  const hemisphere=scene.children.find(child=>child instanceof T.HemisphereLight);
  const normalLighting=hemisphere?.intensity??0;
  return function update(
    dt:number, activeTime:number, remaining:number, player:T.Vector3, running:boolean, stabilized:boolean, reducedMotion:boolean,
  ){
    const spent=1-remaining;
    const distance=Math.hypot(player.x-landmark.x,player.z-landmark.z);
    let tint=0;
    let pace=1;
    let caught=false;
    if(water){
      const target=dryFloor+(fullFlood-dryFloor)*floodProgress(remaining);
      waterHeight=T.MathUtils.damp(waterHeight,target,remaining===0?5:2.8,dt);
      water.position.y=waterHeight;
      tint=T.MathUtils.smoothstep(waterHeight-player.y,-.13,.27)*.73;
      if(waterHeight>player.y-.14)pace=.80;
    }
    if(creature && trail){
      creature.visible=activeTime>=9;
      if(creature.visible && running && !stabilized){
        if(activeTime>=nextPathUpdate || !destination){
          destination=trail.nextWaypoint(creature.position,player);
          nextPathUpdate=activeTime+.32;
        }
        const dx=destination.x-creature.position.x;
        const dz=destination.y-creature.position.z;
        const stride=Math.min(Math.hypot(dx,dz),dt*(.72+spent*.42));
        const angle=Math.atan2(dx,dz);
        const x=creature.position.x+Math.sin(angle)*stride;
        const z=creature.position.z+Math.cos(angle)*stride;
        if(canWalk(x,z))creature.position.set(x,creature.position.y,z);
        else nextPathUpdate=activeTime;
        if(stride>.0001)creature.rotation.y=angle;
        creature.position.y=reducedMotion?.15:.15+Math.sin(activeTime*8)*.065;
        limbs.forEach((leg,i)=>{leg.rotation.x=reducedMotion?0:Math.sin(activeTime*9+i*Math.PI)*.26;});
        const separation=Math.hypot(player.x-creature.position.x,player.z-creature.position.z);
        tint=Math.max(0,(2.6-separation)/2.6)*.42;
        caught=separation<.68;
      }
    }
    if(theme==="space"&&!stabilized)tint=Math.max(0,(spent-.64)*1.02);
    if(theme==="greenhouse"&&!stabilized)tint=(.08+spent*.26)*T.MathUtils.smoothstep(6-distance,0,4);
    if(theme==="lab"&&!stabilized && distance<2.5){tint=.13+spent*.12;pace=.69;}
    if(theme==="tower"&&!stabilized && distance<2.4 && Math.abs(Math.sin(activeTime*1.6))>.76){tint=.11;pace=.72;}
    if(hemisphere){
      const dimmer=theme==="city" ? 1-(.24+spent*.30)*(.5-.5*Math.cos(activeTime*.58))
        : theme==="archive" ? 1-spent*.62 : 1;
      hemisphere.intensity=T.MathUtils.damp(hemisphere.intensity,normalLighting*(stabilized?1:dimmer),3,dt);
    }
    const waterline=water ? remaining===0 ? 1 : (waterHeight-dryFloor)/(fullFlood-dryFloor) : 0;
    return {tint,pace,caught,waterline};
  };
}
