import type { Theme } from "@/lib/plan";
import type { RoomModel } from "@/lib/world-design";

export const clueTargets = ["notes","log","artifact"] as const;
export type ClueTarget = (typeof clueTargets)[number];
type Vector = [number,number,number];
type Part = RoomModel["parts"][number];

function part(shape:Part["shape"],size:Vector,at:Vector,color:string,rotate:Vector=[0,0,0],finish:Part["finish"]="metal"):Part {
  return {shape,size,at,color,rotate,finish};
}

const copper="#c66839", steel="#4e6981", gold="#edb66a", glow="#72eee2", dark="#222942";
const props = {
  fox:{name:"Clockwork fox",motion:"still",parts:[
    part("capsule",[1,.85,1.55],[0,.88,-.1],copper,[90,0,0]),
    part("sphere",[.84,.73,.78],[0,1.36,.57],copper),
    ...[-.26,.26].map(x=>part("cone",[.25,.60,.31],[x,1.82,.54],gold,[0,0,-x*45])),
    part("cone",[.46,.76,.42],[0,1.26,.96],"#ec9a55",[90,0,0]),
    part("sphere",[.22,.18,.20],[0,1.26,1.27],dark),
    ...[-.22,.22].map(x=>part("sphere",[.09,.09,.09],[x,1.45,.89],glow,[0,0,0],"glow")),
    ...[-.31,.31].flatMap(x=>[-.51,.37].map(z=>part("capsule",[.19,.7,.21],[x,.35,z],dark))),
    part("capsule",[.43,1.08,.42],[.68,.95,-.66],copper,[0,0,50]),
    part("sphere",[.44,.46,.44],[1.02,1.31,-.69],"#fff1cb"),
  ]},
  manta:{name:"Manta survey drone",motion:"hover",parts:[
    part("sphere",[1.1,.39,1.55],[0,.74,0],"#138a9a"),
    ...[-1,1].flatMap(side=>[
      part("wedge",[1,.15,1.07],[side*.70,.66,-.14],"#42b5ba",[0,side===1?180:0,0]),
      part("cylinder",[.22,.50,.22],[side*.43,.54,-.49],dark,[90,0,0]),
      part("sphere",[.13,.12,.13],[side*.32,.73,.67],glow,[0,0,0],"glow"),
    ]),
    part("sphere",[.36,.26,.36],[0,.71,.64],dark),
    part("capsule",[.10,.69,.11],[.2,.73,-.92],steel,[72,0,13]),
    part("ring",[.38,.38,.09],[0,.71,.81],gold),
  ]},
  antenna:{name:"Orbital dish",motion:"rotate",parts:[
    part("cylinder",[.87,.14,.87],[0,.11,0],dark),
    part("cylinder",[.24,1.23,.24],[0,.69,0],steel),
    part("sphere",[1.48,.37,1.48],[0,1.41,0],steel,[28,0,24]),
    part("ring",[1.12,.08,1.12],[0,1.61,.10],gold,[116,0,-21]),
    part("cylinder",[.11,.53,.11],[-.14,1.70,.19],dark,[30,0,19]),
    part("crystal",[.25,.28,.25],[-.17,1.94,.34],glow,[0,0,0],"glow"),
  ]},
  locomotive:{name:"Maglev prototype",motion:"hover",parts:[
    part("capsule",[.75,1.91,.71],[0,.62,0],"#8540c3",[90,0,0]),
    part("sphere",[.62,.35,.52],[0,.76,.60],dark),
    part("block",[.65,.1,1.55],[0,.32,-.05],steel),
    ...[-.29,.29].flatMap(x=>[
      part("capsule",[.09,1.40,.09],[x,.47,-.08],glow,[90,0,0],"glow"),
      part("sphere",[.11,.11,.11],[x,.59,.73],"#ffe2bd",[0,0,0],"glow"),
    ]),
  ]},
  trilobite:{name:"Resonant trilobite",motion:"rotate",parts:[
    part("sphere",[.68,.83,.54],[0,1.33,.01],"#a270cd"),
    ...[.25,.48,.72,.95,1.15].map((y,i)=>part("sphere",[.36+i*.09,.27,.46],[0,y,0],i%2?"#5d368d":"#8f69cb")),
    ...[-.21,.21].flatMap(x=>[
      part("sphere",[.14,.12,.14],[x,1.48,.22],"#d8fd68",[0,0,0],"glow"),
      part("capsule",[.08,.48,.08],[x*1.3,1.69,.1],steel,[0,0,-x*96]),
    ]),
  ]},
  flower:{name:"Glass orchid",motion:"still",parts:[
    part("cylinder",[.64,.34,.64],[0,.19,0],copper),
    part("capsule",[.10,1.34,.10],[0,.86,0],"#547a4c"),
    ...Array.from({length:6},(_,i)=>{
      const angle=i*Math.PI/3;
      return part("sphere",[.30,.69,.18],[Math.sin(angle)*.36,1.65+Math.cos(angle)*.36,.10],"#ef86c5",[0,0,-i*60],"glass");
    }),
    part("sphere",[.27,.27,.30],[0,1.65,.21],gold,[0,0,0],"glow"),
    part("wedge",[.52,.12,.32],[-.25,.68,.02],"#8fb769",[15,0,-12],"matte"),
  ]},
  relic:{name:"Obsidian jackal",motion:"still",parts:[
    part("block",[.72,.15,.85],[0,.09,0],gold),
    part("capsule",[.61,1.13,.54],[0,.71,0],dark),
    part("sphere",[.48,.51,.49],[0,1.34,.1],dark),
    part("wedge",[.30,.29,.57],[0,1.28,.39],dark,[0,90,0]),
    ...[-.17,.17].flatMap(x=>[
      part("cone",[.19,.61,.26],[x,1.69,.07],dark,[0,0,-x*60]),
      part("sphere",[.09,.085,.08],[x,1.4,.29],gold,[0,0,0],"glow"),
    ]),
    part("ring",[.59,.60,.08],[0,1.04,.02],gold,[90,0,0]),
  ]},
  arm:{name:"Calibration arm",motion:"still",parts:[
    part("cylinder",[.91,.22,.91],[0,.12,0],dark),
    part("block",[.29,1.21,.31],[-.21,.71,0],gold,[0,0,25]),
    part("cylinder",[.31,.11,.31],[-.42,1.26,.09],steel,[90,0,0]),
    part("block",[.99,.24,.22],[.02,1.42,0],gold,[0,0,14]),
    part("block",[.26,.41,.22],[.56,1.22,0],steel,[0,0,-10]),
    ...[-.09,.09].map(x=>part("wedge",[.14,.26,.23],[.56+x,1.03,.04],dark,[0,x<0?0:180,0])),
    part("crystal",[.24,.29,.24],[.59,.81,.03],glow,[0,0,0],"glow"),
  ]},
  rotor:{name:"Numbered impeller",motion:"rotate",parts:[
    part("ring",[1.4,1.4,.18],[0,.77,0],copper),
    ...Array.from({length:5},(_,i)=>part("wedge",[.31,.54,.13],[Math.sin(i*1.257)*.34,.77+Math.cos(i*1.257)*.34,.06],gold,[0,0,-i*72])),
    part("cylinder",[.31,.27,.31],[0,.77,.15],steel,[90,0,0]),
    part("sphere",[.16,.16,.14],[0,.77,.30],glow,[0,0,0],"glow"),
  ]},
  sphere:{name:"Gyroscopic register",motion:"rotate",parts:[
    part("sphere",[.53,.53,.53],[0,.76,0],steel),
    part("ring",[1.23,1.23,.13],[0,.76,0],copper,[45,0,0]),
    part("ring",[1.05,1.05,.12],[0,.76,0],gold,[0,65,0]),
    part("ring",[.87,.87,.12],[0,.76,0],glow,[0,0,30],"glow"),
    part("crystal",[.21,.30,.21],[0,1.29,.02],glow,[0,0,0],"glow"),
  ]},
  canister:{name:"Specimen cylinder",motion:"still",parts:[
    part("cylinder",[.68,1.28,.68],[0,.78,0],glow,[0,0,0],"glass"),
    part("cylinder",[.73,.15,.73],[0,.14,0],steel),
    part("cylinder",[.73,.15,.73],[0,1.39,0],steel),
    part("crystal",[.35,.57,.37],[0,.78,0],"#9ac85a",[0,25,13],"glow"),
    part("ring",[.74,.74,.09],[0,.82,0],gold,[90,0,0]),
  ]},
  beacon:{name:"Emergency beacon",motion:"still",parts:[
    part("cylinder",[.84,.18,.84],[0,.13,0],dark),
    part("cone",[.67,1.28,.67],[0,.73,0],steel),
    part("sphere",[.67,.52,.67],[0,1.43,0],gold,[0,0,0],"glow"),
    part("ring",[.81,.81,.12],[0,1.42,0],dark,[90,0,0]),
    part("cone",[.84,.37,.84],[0,1.73,0],copper),
  ]},
} satisfies Record<string,RoomModel>;

const missions = {
  ocean:      {artifacts:["manta","rotor","canister","beacon"], center:[0,2], order:0, console:[1,3]},
  space:      {artifacts:["antenna","beacon","sphere","rotor"], center:[0,3], order:2, console:[0,2]},
  city:       {artifacts:["locomotive","sphere","antenna","beacon"], center:[0,2], order:4, console:[1]},
  alien:      {artifacts:["trilobite","canister","sphere","beacon"], center:[0,3], order:1, console:[2,3]},
  tower:      {artifacts:["fox","rotor","sphere","beacon"], center:[0,2], order:3, console:[1,3]},
  archive:    {artifacts:["relic","beacon","canister","sphere"], center:[1,3], order:5, console:[0,3]},
  greenhouse: {artifacts:["flower","canister","rotor","sphere"], center:[0,3], order:2, console:[2]},
  lab:        {artifacts:["arm","rotor","canister","sphere"], center:[0,2], order:4, console:[1,2]},
} satisfies Record<Theme,{artifacts:[keyof typeof props,keyof typeof props,keyof typeof props,keyof typeof props];center:number[];order:number;console:number[]}>;

const stationOrders = [[0,1,2,3],[2,1,3,0],[1,2,0,3],[3,2,1,0],[1,0,3,2],[0,3,1,2]] as const;
const lockOrders:readonly (readonly ClueTarget[])[] = [
  ["notes","log","artifact"],
  ["artifact","log","notes"],
  ["log","artifact","notes"],
  ["notes","artifact","log"],
];

export function expedition(theme:Theme,index:number){
  const mission=missions[theme];
  return {
    artifact:props[mission.artifacts[index]],
    centerpiece:mission.center.includes(index),
    stationOrder:stationOrders[(mission.order+index)%stationOrders.length],
    artifactSide:(mission.order+Math.floor(index/2))%2?1:-1,
    artifactDepth:index%2?3.6:-2.9,
    consoleFirst:mission.console.includes(index),
    lockOrder:lockOrders[(mission.order+index)%lockOrders.length],
  };
}

export function interlock(theme:Theme,index:number,title:string,labels:Record<ClueTarget,string>){
  const seed=(index*7+title.length)%9;
  const ids = {notes:1+(seed+1)%9,log:1+(seed+4)%9,artifact:1+(seed+7)%9};
  const {lockOrder}=expedition(theme,index);
  return {
    ids,
    plate:lockOrder.map((kind,step)=>`${step+1}. ${kind==="artifact"?"This artifact":labels[kind]}`).join("\n"),
    code:lockOrder.map(kind=>ids[kind]).join(""),
  };
}
