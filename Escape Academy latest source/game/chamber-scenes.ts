import * as T from "three";
import type { Theme } from "@/lib/plan";
import type { Landmark } from "@/lib/world-design";
import type { roomMeshes } from "./room-meshes";

type Fixtures = readonly [string, string, string, string];

type ChamberScene = {
  apparatus: Landmark;
  accent: string;
  fixtures: Fixtures;
};

const scenes = {
  ocean: [
    {apparatus:"pumps",accent:"#ffa552",fixtures:["Pressure gauges","Pump service sheet","Valve cabinet","Manifold panel"]},
    {apparatus:"sensors",accent:"#56cfff",fixtures:["Sensor display","Depth profile","Survey crate","Sonar desk"]},
    {apparatus:"submersible",accent:"#ffe18a",fixtures:["Launch checklist","Ballast readout","Spare parts case","Ascent controls"]},
  ],
  space: [
    {apparatus:"rover",accent:"#f78850",fixtures:["Dock manifest","Cargo scanner","Tool chest","Gantry controls"]},
    {apparatus:"orrery",accent:"#83d2ff",fixtures:["Star chart","Orbit tracker","Chart drawer","Guidance desk"]},
    {apparatus:"shuttle",accent:"#fde0a0",fixtures:["Flight checklist","Fuel telemetry","Flight kit","Launch controls"]},
  ],
  city: [
    {apparatus:"servers",accent:"#ff69be",fixtures:["Patch panel","Signal trace","Switch cabinet","Network controls"]},
    {apparatus:"train",accent:"#58e4d8",fixtures:["Route board","Track monitor","Service cart","Dispatch desk"]},
    {apparatus:"elevator",accent:"#f7c56e",fixtures:["Lift schematic","Load meter","Relay case","Elevator controls"]},
  ],
  alien: [
    {apparatus:"pods",accent:"#ff977b",fixtures:["Specimen tags","Containment log","Isolation chest","Quarantine panel"]},
    {apparatus:"crystals",accent:"#7cf5e3",fixtures:["Resonance slate","Echo recorder","Mineral case","Frequency desk"]},
    {apparatus:"portal",accent:"#dba0ff",fixtures:["Gate inscriptions","Field monitor","Conduit cache","Gate controls"]},
  ],
  lab: [
    {apparatus:"reactor",accent:"#ff9752",fixtures:["Reactor chart","Heat monitor","Coolant cabinet","Reactor controls"]},
    {apparatus:"pipes",accent:"#63dcff",fixtures:["Flow diagram","Test results","Sample case","Spectrometer desk"]},
    {apparatus:"purifier",accent:"#acffc6",fixtures:["Filter checklist","Air quality meter","Filter rack","Airlock panel"]},
  ],
  tower: [
    {apparatus:"gears",accent:"#ffc479",fixtures:["Gear ratios","Repair ledger","Tool chest","Drive controls"]},
    {apparatus:"bell",accent:"#c9beff",fixtures:["Chime score","Timing ledger","Clapper case","Bell lever"]},
    {apparatus:"counterweight",accent:"#ffd880",fixtures:["Rope diagram","Weight markings","Winch parts","Hoist controls"]},
  ],
  greenhouse: [
    {apparatus:"planters",accent:"#c8ef81",fixtures:["Growing trays","Canopy readings","Gardening cabinet","Grow light panel"]},
    {apparatus:"vines",accent:"#76e6cc",fixtures:["Irrigation chart","Flow meter","Pipe fittings case","Watering desk"]},
    {apparatus:"seedbank",accent:"#ffe381",fixtures:["Crop records","Vent readings","Seed drawer","Vent panel"]},
  ],
  archive: [
    {apparatus:"shelves",accent:"#edb077",fixtures:["Accession cards","Shelf index","Catalog chest","Index controls"]},
    {apparatus:"tablets",accent:"#96d1ea",fixtures:["Tablet rubbings","Relic ledger","Conservation case","Translation desk"]},
    {apparatus:"vault",accent:"#fdd182",fixtures:["Seal impressions","Vault register","Key coffer","Vault dial"]},
  ],
} satisfies Record<Theme, readonly [ChamberScene, ChamberScene, ChamberScene]>;

export function chamberScene(theme:Theme,index:number):ChamberScene|undefined {
  return scenes[theme][index-1];
}

export function buildChamberLandmark(
  kind:Landmark, root:T.Group, kit:ReturnType<typeof roomMeshes>, structure:T.Material, accent:T.Material, glow:T.Material, height:number,
) {
  const {mesh,box,cylinder,hoop,material}=kit;
  const obstacles:T.Mesh[]=[];
  const footprint:Array<{x:number;z:number;radius:number}>=[];
  const glass=new T.MeshStandardMaterial({color:"#87e5ff",transparent:true,opacity:.26,side:T.DoubleSide,depthWrite:false});
  const copper=material("#ba7650");
  const steel=material("#64778c");

  function solid(object:T.Mesh,x:number,z:number,radius:number) {
    object.castShadow=true;
    obstacles.push(object);
    footprint.push({x:root.position.x+x,z:root.position.z+z,radius});
  }
  function pipe(points:T.Vector3[],radius:number,surface:T.Material) {
    return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),24,radius,10,false),surface,0,0,0,root);
  }
  function horizontalRing(radius:number,y:number,surface:T.Material) {
    const ring=hoop(radius,.045,0,y,0,surface,root);
    ring.rotation.x=Math.PI/2;
    return ring;
  }
  function gear(radius:number,x:number,y:number,z:number) {
    const wheel=new T.Group();
    wheel.position.set(x,y,z);
    root.add(wheel);
    cylinder(radius*.76,radius*.76,.20,0,0,0,copper,wheel,20).rotation.x=Math.PI/2;
    hoop(radius*.56,.058,0,0,.14,accent,wheel);
    for(let tooth=0;tooth<14;tooth++){
      const angle=tooth*Math.PI/7;
      box(radius*.23,radius*.24,.22,Math.sin(angle)*radius*.81,Math.cos(angle)*radius*.81,0,copper,wheel,.025).rotation.z=-angle;
    }
    return wheel;
  }

  switch(kind){
    case "pumps":
    case "reactor":
    case "pods": {
      const tank=kind==="pods"?glass:kind==="pumps"?copper:steel;
      for(const [x,z] of [[-1.05,-.25],[1.05,-.25],[0,.88]]){
        const base=box(.94,.27,.94,x,.14,z,structure,root,.08);
        solid(base,x,z,.56);
        const vessel=cylinder(.36,.42,1.81,x,1.13,z,tank,root,24);
        if(kind!=="pods")obstacles.push(vessel);
        cylinder(.41,.47,.22,x,2.10,z,structure,root,24);
        for(const y of [.48,1.77])cylinder(.445,.445,.08,x,y,z,accent,root,24);
        if(kind==="pods"){
          mesh(new T.IcosahedronGeometry(.28,2),accent,x,1.20,z,root).scale.set(.81,1.82,.83);
          for(const y of [.90,1.29,1.61])box(.54,.031,.031,x,y,z+.42,glow,root);
        } else {
          const gauge=cylinder(.17,.17,.14,x,1.55,z+.39,structure,root,16);
          gauge.rotation.x=Math.PI/2;
          hoop(.142,.025,x,1.55,z+.47,glow,root);
          box(.022,.16,.025,x,1.57,z+.48,accent,root).rotation.z=.60;
        }
        pipe([new T.Vector3(x,2.19,z),new T.Vector3(x,2.64,z),new T.Vector3(x*.76,2.89,-.25),new T.Vector3(0,2.89,-.25)],.10,kind==="pumps"?copper:steel);
      }
      break;
    }
    case "rover":
    case "servers":
    case "planters":
    case "shelves":
    case "gears": {
      for(const x of [-.95,.95]){
        const cabinet=box(.83,kind==="planters"||kind==="rover"?.65:2.14,1.93,x,kind==="planters"||kind==="rover"?.37:1.11,0,structure,root,.085);
        solid(cabinet,x,-.59,.55);
        footprint.push({x:root.position.x+x,z:root.position.z+.59,radius:.55});
        if(kind==="gears"){
          gear(.49,x,1.36,1);
          gear(.33,x-.14,.61,1);
        }
        if(kind==="servers" || kind==="shelves"){
          for(let level=0;level<6;level++){
            box(.70,.095,.12,x,.44+level*.235,1,steel,root,.018);
            for(const lightX of [-.23,0,.23])box(.083,.028,.031,x+lightX,.45+level*.235,1.07,level%2?glow:accent,root);
          }
        }
        if(kind==="planters"){
          for(const z of [-.65,0,.65]){
            for(let leafIndex=0;leafIndex<5;leafIndex++){
              const angle=leafIndex*2.4;
              const blade=mesh(new T.SphereGeometry(.15,12,8),material(leafIndex%2?"#73bc60":"#a5c668"),x+Math.cos(angle)*.15,.90+leafIndex*.12,z+Math.sin(angle)*.18,root);
              blade.scale.set(.75,2.3,.83);
              blade.rotation.z=Math.cos(angle)*.57;
            }
          }
        }
        if(kind==="rover"){
          box(.67,.41,1.30,x,.84,0,accent,root,.075);
          for(const z of [-.62,0,.62]){
            cylinder(.18,.18,.92,x,.27,z,steel,root,14).rotation.z=Math.PI/2;
          }
          cylinder(.034,.034,.86,x,1.21,-.19,steel,root,10);
          box(.38,.19,.24,x,1.67,-.19,glow,root,.036);
        }
      }
      if(kind==="rover"){
        box(2.84,.23,.36,0,height-.50,0,structure,root,.08);
        box(2.66,.055,.19,0,height-.64,0,glow,root);
      }
      break;
    }
    case "orrery":
    case "sensors":
    case "pipes":
    case "train":
    case "crystals":
    case "bell":
    case "vines":
    case "tablets": {
      // This gallery can be crossed below the display.
      const y=Math.min(3.32,height-.95);
      const hanging=new T.Group();
      hanging.position.y=y;
      root.add(hanging);
      horizontalRing(1.55,.022,accent);
      horizontalRing(1.38,.023,glow);
      for(let tick=0;tick<24;tick++){
        const angle=tick*Math.PI/12;
        box(.024,.012,tick%3===0?.19:.11,Math.sin(angle)*1.27,.024,Math.cos(angle)*1.27,accent,root).rotation.y=angle;
      }
      if(kind==="orrery"){
        mesh(new T.SphereGeometry(.57,28,16),glow,0,0,0,hanging);
        for(const [rank,radius] of [1,1.37,1.73].entries()){
          const path=hoop(radius,.019,0,0,0,steel,hanging);
          path.rotation.x=1.16+rank*.29;
          mesh(new T.SphereGeometry(.16+rank*.035,18,12),accent,Math.cos(rank*2.6)*radius,0,Math.sin(rank*2.6)*radius,hanging);
        }
        hanging.userData.update=(time:number)=>{hanging.rotation.y=time*.22;};
      } else if(kind==="sensors" || kind==="pipes"){
        for(const [i,x] of [-.9,0,.9].entries()){
          pipe([new T.Vector3(x,height-.05,-1.7),new T.Vector3(x,y,-1.32),new T.Vector3(x,y-.16,0),new T.Vector3(x,y,1.32),new T.Vector3(x,height-.05,1.7)],.16,glass);
          for(const z of [-.9,.9])cylinder(.21,.21,.15,x,y-.06,z,steel,root,16).rotation.x=Math.PI/2;
          const sensor=mesh(new T.SphereGeometry(.13,12,8),glow,x,y-.14,0,root);
          sensor.userData.update=(time:number)=>{sensor.position.z=Math.sin(time*.75+i)*.82;};
        }
      } else if(kind==="train"){
        box(1.48,.83,3.58,0,.02,0,accent,hanging,.20);
        for(const x of [-.747,.747]){
          for(const z of [-1,0,1])box(.03,.29,.64,x,.12,z,material("#17294b"),hanging,.03);
        }
        box(1.29,.12,4.35,0,-.51,0,structure,hanging,.05);
        box(.8,.08,3.8,0,-.57,0,glow,hanging,.02);
      } else if(kind==="crystals" || kind==="tablets"){
        for(let i=0;i<7;i++){
          const angle=i*2.4;
          const radius=.8+(i%3)*.40;
          const geometry=kind==="crystals"?new T.OctahedronGeometry(.33):new T.DodecahedronGeometry(.33);
          const specimen=mesh(geometry,i%2?accent:glow,Math.cos(angle)*radius,Math.sin(i)*.33,Math.sin(angle)*radius,hanging);
          specimen.scale.set(.84,1.45+i%3*.29,kind==="crystals"?1:.34);
          specimen.rotation.y=angle;
        }
        hanging.userData.update=(time:number)=>{hanging.rotation.y=time*.13;};
      } else if(kind==="bell"){
        cylinder(.31,.67,.81,0,.10,0,copper,hanging,32);
        hoop(.67,.055,0,-.30,0,accent,hanging).rotation.x=Math.PI/2;
        mesh(new T.SphereGeometry(.13,14,8),steel,0,-.44,0,hanging);
        hanging.userData.update=(time:number)=>{hanging.rotation.z=Math.sin(time*1.55)*.13;};
      } else {
        for(let i=0;i<10;i++){
          const angle=i*2.4;
          const leaf=mesh(new T.SphereGeometry(.24,12,8),material(i%2?"#a2c963":"#63ad69"),Math.cos(angle)*(i%3*.34+.48),Math.sin(i)*.41,Math.sin(angle)*(i%3*.34+.48),hanging);
          leaf.scale.set(.82,2.1,1);
          leaf.rotation.z=.55*Math.cos(angle);
        }
      }
      break;
    }
    case "submersible":
    case "shuttle":
    case "purifier":
    case "seedbank": {
      const base=box(2.66,.24,2.32,0,.13,0,structure,root,.09);
      solid(base,0,0,1.35);
      if(kind==="submersible" || kind==="shuttle"){
        mesh(new T.CapsuleGeometry(.49,1.44,6,24),accent,0,1.02,0,root).rotation.x=Math.PI/2;
        mesh(new T.SphereGeometry(.41,22,14),material("#18365a"),0,1.21,.83,root).scale.set(1,.64,.95);
        for(const x of [-.67,.67]){
          cylinder(.19,.24,1.33,x,.76,-.22,steel,root,18).rotation.x=Math.PI/2;
          hoop(.16,.047,x,.76,-.86,glow,root);
          box(.13,.10,1.72,x,.41,-.22,structure,root,.045);
        }
      } else {
        for(const x of [-.81,0,.81]){
          box(.70,2.22,.83,x,1.36,0,steel,root,.09);
          box(.48,1.38,.12,x,1.40,.46,accent,root,.08);
          for(const y of [.83,1.13,1.43,1.73])box(.33,.067,.07,x,y,.53,glow,root,.022);
        }
      }
      break;
    }
    case "elevator":
    case "portal":
    case "counterweight":
    case "vault": {
      for(const x of [-1.24,1.24]){
        const post=box(.37,Math.min(3.65,height-.3),.62,x,1.8,0,structure,root,.085);
        solid(post,x,0,.34);
        box(.065,2.66,.037,x,1.71,.335,glow,root,.016);
      }
      box(2.83,.25,.62,0,3.62,0,steel,root,.08);
      if(kind==="portal" || kind==="vault"){
        hoop(1.09,.16,0,1.76,0,accent,root);
        hoop(.91,.037,0,1.76,.07,glow,root);
        mesh(new T.CircleGeometry(.89,40),kind==="vault"?material("#96715c"):glass,0,1.76,.02,root);
      } else {
        box(kind==="elevator"?1.75:.92,1.61,.41,0,1.86,0,accent,root,.12);
        for(const y of [1.46,1.74,2.02])box(.67,.044,.065,0,y,.235,glow,root);
      }
      const barrier=box(1.64,.16,.39,0,.09,0,structure,root,.042);
      solid(barrier,0,0,.54);
    }
  }
  return {obstacles,footprint};
}
