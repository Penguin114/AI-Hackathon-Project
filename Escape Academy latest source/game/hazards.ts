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
      if(current===from){
        // Skip grid corners whenever the creature can travel directly to a
        // later point on the route without crossing an obstacle.
        let cursor=parent[current],best=locations[cursor];
        while(cursor!==to){
          const next=parent[cursor];
          if(!clearPath(start.x,start.z,locations[next].x,locations[next].y,canWalk))break;
          best=locations[next];cursor=next;
        }
        return best;
      }
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

// canWalk includes the room's collision clearance. Sample the whole segment
// so a long shortcut cannot pass through a thin obstacle.
export function clearPath(x1:number,z1:number,x2:number,z2:number,canWalk:Walkable){
  const count=Math.max(1,Math.ceil(Math.hypot(x2-x1,z2-z1)/.1));
  for(let i=1;i<=count;i++)if(!canWalk(x1+(x2-x1)*i/count,z1+(z2-z1)*i/count))return false;
  return true;
}

export function cityBrightness(remaining:number,activeTime:number,stabilized:boolean,reducedMotion:boolean){
  if(stabilized)return 1;
  const progress=T.MathUtils.clamp(1-remaining,0,1);
  const brightness=Math.sqrt(Math.max(0,1-progress**4));
  // Short, irregular dips begin only after 70% of the timer has elapsed.
  if(progress<=.7 || reducedMotion)return brightness;
  const flicker=Math.max(0,Math.sin(activeTime*19)*Math.sin(activeTime*7.3));
  return brightness*(1-.35*flicker);
}

export function greenhouseFogDensity(remaining:number){
  const progress=T.MathUtils.clamp(1-remaining,0,1);
  return 1-Math.sqrt(Math.max(0,1-progress**4));
}

export function laboratoryHeat(remaining:number){
  return .7*greenhouseFogDensity(remaining);
}

export function buildHazard(scene:T.Scene,theme:Theme,shape:T.Shape,spawn:T.Vector3,landmark:T.Vector3,canWalk:Walkable){
  // Exponential fog affects scene geometry according to its distance from the
  // camera; the normalized curve controls its maximum optical density.
  const greenhouseFog=theme==="greenhouse"?new T.FogExp2("#bacdb9",0):null;
  if(greenhouseFog)scene.fog=greenhouseFog;
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
  const swarm:Array<{group:T.Group; outside:T.Vector2; wall:T.Vector2; entry:T.Vector2; breach:T.Mesh; emergence:number; destination:T.Vector2|null; nextUpdate:number}>=[];
  if(theme==="alien"){
    trail=createNavigator(canWalk);
    // Favor a clear position in front of the player over a hidden far corner.
    const visibleStarts=trail.locations.filter(point=>{
      const dx=point.x-spawn.x,dz=point.y-spawn.z,distance=Math.hypot(dx,dz);
      if(distance<3 || distance>5 || dz>=-Math.abs(dx)*1.5)return false;
      return Array.from({length:10},(_,i)=>canWalk(spawn.x+dx*(i+1)/10,spawn.z+dz*(i+1)/10)).every(Boolean);
    });
    const candidates=visibleStarts.length?visibleStarts:trail.locations;
    const start=candidates.reduce((best,point)=>
      Math.abs(Math.hypot(point.x-spawn.x,point.y-spawn.z)-3.8)<Math.abs(Math.hypot(best.x-spawn.x,best.y-spawn.z)-3.8)?point:best
    );
    creature=new T.Group();
    creature.position.set(start.x,0,start.y);
    creature.rotation.y=Math.atan2(spawn.x-start.x,spawn.z-start.y);
    scene.add(creature);
    const body=new T.MeshStandardMaterial({color:"#7968b5",roughness:.42,metalness:.25,emissive:"#372450",emissiveIntensity:.55});
    const membrane=new T.MeshStandardMaterial({color:"#caff86",roughness:.35,emissive:"#82d936",emissiveIntensity:1});
    // A denser rounded shell and capsules retain the original creature while
    // smoothing its silhouette and lighting.
    const shell=new T.Mesh(new T.SphereGeometry(.59,48,32),body);
    shell.position.y=.84;shell.scale.set(.82,1.16,1.05);shell.castShadow=true;
    creature.add(shell);
    for(const x of [-.19,.19]){
      const eye=new T.Mesh(new T.SphereGeometry(.108,24,16),membrane);
      eye.position.set(x,.99,.57);creature.add(eye);
    }
    for(let i=0;i<4;i++){
      const leg=new T.Mesh(new T.CapsuleGeometry(.074,.47,8,20),body);
      const side=i%2?-1:1;
      leg.position.set(side*.36,.31,i<2?.23:-.23);leg.rotation.z=side*.52;
      leg.castShadow=true;creature.add(leg);limbs.push(leg);
    }
    for(const side of [-1,1]){
      const curve=new T.CatmullRomCurve3([
        new T.Vector3(side*.34,1.05,-.12),new T.Vector3(side*.62,1.35,-.16),
        new T.Vector3(side*.8,1.63,-.04),new T.Vector3(side*.65,1.8,.08),
      ]);
      creature.add(new T.Mesh(new T.TubeGeometry(curve,24,.045,10,false),body));
    }
    // Distribute arrivals along the actual wall perimeter; find a walkable
    // entry point for each one so the swarm can navigate around room objects.
    const outline=shape.getPoints().map(p=>new T.Vector2(p.x,-p.y));
    if(outline.length>1 && outline[0].distanceToSquared(outline[outline.length-1])<1e-8)outline.pop();
    const lengths=outline.map((p,i)=>p.distanceTo(outline[(i+1)%outline.length]));
    const perimeter=lengths.reduce((sum,length)=>sum+length,0);
    const signedArea=outline.reduce((sum,p,i)=>{const next=outline[(i+1)%outline.length];return sum+p.x*next.y-next.x*p.y;},0);
    const smallBody=new T.SphereGeometry(.32,20,14);
    const smallEye=new T.SphereGeometry(.065,12,8);
    const smallLeg=new T.CapsuleGeometry(.045,.23,4,10);
    const breachGeometry=new T.CircleGeometry(.4,32);
    const breachMaterial=new T.MeshBasicMaterial({color:0x07050d,side:T.DoubleSide});
    for(let i=0;i<20 && perimeter>0;i++){
      let distance=perimeter*(i+.5)/20,edge=0;
      while(edge<lengths.length-1 && distance>lengths[edge]){distance-=lengths[edge];edge++;}
      const wall=outline[edge].clone().lerp(outline[(edge+1)%outline.length],distance/lengths[edge]);
      const direction=outline[(edge+1)%outline.length].clone().sub(outline[edge]).normalize();
      const inward=new T.Vector2(-direction.y,direction.x).multiplyScalar(signedArea>=0?1:-1);
      const outside=wall.clone().addScaledVector(inward,-.8);
      const entry=trail.locations.reduce((best,p)=>p.distanceToSquared(wall)<best.distanceToSquared(wall)?p:best).clone();
      const breach=new T.Mesh(breachGeometry,breachMaterial);
      breach.name="alien-breach";breach.visible=false;
      breach.position.set(wall.x+inward.x*.155,.48,wall.y+inward.y*.155);
      breach.rotation.y=Math.atan2(inward.x,inward.y);scene.add(breach);
      const group=new T.Group();group.name="alien-swarm";group.visible=false;
      const shell=new T.Mesh(smallBody,body);shell.position.y=.43;shell.scale.set(.85,.85,1);group.add(shell);
      for(const side of [-1,1]){
        const eye=new T.Mesh(smallEye,membrane);eye.position.set(side*.13,.48,.28);group.add(eye);
        for(const z of [-.14,.14]){
          const leg=new T.Mesh(smallLeg,body);leg.position.set(side*.22,.17,z);leg.rotation.z=side*.48;group.add(leg);
        }
      }
      group.position.set(outside.x,0,outside.y);
      group.rotation.y=Math.atan2(inward.x,inward.y);scene.add(group);
      swarm.push({group,outside,wall,entry,breach,emergence:0,destination:null,nextUpdate:0});
    }
  }

  let destination:T.Vector2|null=null;
  let nextPathUpdate=0;
  let detouring=false;
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
      if(running && !stabilized){
        if(detouring && clearPath(creature.position.x,creature.position.z,player.x,player.z,canWalk)){
          detouring=false;destination=null;
        }
        if(detouring && (activeTime>=nextPathUpdate || !destination || creature.position.distanceTo(new T.Vector3(destination.x,creature.position.y,destination.y))<.08)){
          destination=trail.nextWaypoint(creature.position,player);
          nextPathUpdate=activeTime+.32;
        }
        const target=detouring && destination?destination:new T.Vector2(player.x,player.z);
        const dx=target.x-creature.position.x;
        const dz=target.y-creature.position.z;
        const stride=Math.min(Math.hypot(dx,dz),dt*(.72+spent*.42));
        const angle=Math.atan2(dx,dz);
        const x=creature.position.x+Math.sin(angle)*stride;
        const z=creature.position.z+Math.cos(angle)*stride;
        if(clearPath(creature.position.x,creature.position.z,x,z,canWalk))creature.position.set(x,creature.position.y,z);
        else {detouring=true;destination=null;nextPathUpdate=activeTime;}
        if(stride>.0001)creature.rotation.y=angle;
        creature.position.y=reducedMotion?0:Math.sin(activeTime*8)*.035;
        limbs.forEach((leg,i)=>{leg.rotation.x=reducedMotion?0:Math.sin(activeTime*9+i*Math.PI)*.26;});
        const separation=Math.hypot(player.x-creature.position.x,player.z-creature.position.z);
        tint=Math.max(0,(2.6-separation)/2.6)*.42;
        caught=separation<.68;
      }
      if(remaining<=0 && running){
        for(const member of swarm){
          const {group,outside,wall,entry,breach}=member;
          group.visible=true;
          member.emergence=Math.min(1,member.emergence+dt/1.2);
          if(member.emergence>=.4)breach.visible=true;
          if(member.emergence<1){
            const from=member.emergence<.5?outside:wall;
            const to=member.emergence<.5?wall:entry;
            const progress=member.emergence<.5?member.emergence*2:(member.emergence-.5)*2;
            group.position.set(T.MathUtils.lerp(from.x,to.x,progress),0,T.MathUtils.lerp(from.y,to.y,progress));
          }else{
            if(!canWalk(group.position.x,group.position.z))group.position.set(entry.x,0,entry.y);
            if(clearPath(group.position.x,group.position.z,player.x,player.z,canWalk))member.destination=null;
            else if(!member.destination || activeTime>=member.nextUpdate || Math.hypot(group.position.x-member.destination.x,group.position.z-member.destination.y)<.1){
              member.destination=trail.nextWaypoint(group.position,player);member.nextUpdate=activeTime+.45;
            }
            const target=member.destination??new T.Vector2(player.x,player.z);
            const dx=target.x-group.position.x,dz=target.y-group.position.z;
            const angle=Math.atan2(dx,dz),stride=Math.min(Math.hypot(dx,dz),dt*5.8);
            const x=group.position.x+Math.sin(angle)*stride,z=group.position.z+Math.cos(angle)*stride;
            if(clearPath(group.position.x,group.position.z,x,z,canWalk))group.position.set(x,0,z);
            else {member.destination=null;member.nextUpdate=0;}
            if(stride>.0001)group.rotation.y=angle;
          }
          const separation=Math.hypot(player.x-group.position.x,player.z-group.position.z);
          tint=Math.max(tint,Math.max(0,(2.6-separation)/2.6)*.42);
          if(member.emergence>=1 && separation<.68)caught=true;
        }
      }
    }
    if(greenhouseFog)greenhouseFog.density=stabilized?0:.65*greenhouseFogDensity(remaining);
    if(theme==="lab"&&!stabilized && distance<2.5)pace=.69;
    if(theme==="tower"&&!stabilized && distance<2.4 && Math.abs(Math.sin(activeTime*1.6))>.76){tint=.11;pace=.72;}
    if(hemisphere){
      const dimmer=theme==="archive" ? 1-spent*.62 : 1;
      hemisphere.intensity=T.MathUtils.damp(hemisphere.intensity,normalLighting*(stabilized?1:dimmer),3,dt);
    }
    const waterline=water ? remaining===0 ? 1 : (waterHeight-dryFloor)/(fullFlood-dryFloor) : 0;
    const brightness=theme==="city"?cityBrightness(remaining,activeTime,stabilized,reducedMotion):1;
    const heat=theme==="lab"&&!stabilized?laboratoryHeat(remaining):0;
    const vignette=theme==="space"?laboratoryHeat(remaining):heat;
    return {tint,pace,caught,waterline,brightness,heat,vignette};
  };
}
