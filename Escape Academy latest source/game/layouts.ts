import type { Theme } from "@/lib/plan";
import type { ChamberDesign } from "@/lib/world-design";

type Point = readonly [x: number, z: number];
type Layout = {
  outline: readonly Point[];
  stations: readonly [Point, Point, Point, Point];
  landmark: Point;
  door: Point;
  spawn: Point;
  height: number;
  colors: readonly [wall: string, ground: string, structure: string, accent: string, light: string];
  fixtures: readonly [string, string, string, string];
};

// Stations are ordered as the first clue, second clue, storage, and console.
export const layouts: Record<Theme, Layout> = {
  tower: {
    outline: [[-4,-6],[3,-6],[5,-4],[5,1],[3,4],[1,6],[-4,6],[-6,3],[-6,-3]],
    stations: [[-4.7,2.4],[3,-4.7],[-4.6,-3.1],[2.9,.6]],
    landmark: [-.7,-1.1], door: [0,-5.75], spawn: [-1,4.3], height: 5.8,
    colors: ["#645d78","#6c5160","#26384e","#f4ab59","#ffdca5"],
    fixtures: ["Clockmaker’s desk","Maintenance ledger","Parts chest","Clockwork drive"],
  },
  greenhouse: {
    outline: [[-4,-6],[4,-6],[6,-2],[6,3],[3,5],[-1,5],[-1,7],[-5,7],[-6,2],[-6,-3]],
    stations: [[-4.7,-1.1],[4.7,2.4],[3.5,-4.6],[-3.6,4.7]],
    landmark: [.3,.4], door: [0,-5.75], spawn: [-1,3.7], height: 5.4,
    colors: ["#457675","#678976","#234957","#f4d46e","#dfffd5"],
    fixtures: ["Specimen tags","Climate monitor","Seed vault","Irrigation control"],
  },
  archive: {
    outline: [[-5,-6],[5,-6],[5,-1],[7,1],[7,5],[2,5],[2,3],[-5,3],[-5,6],[-8,6],[-8,0],[-5,-2]],
    stations: [[-6.8,3.9],[5.8,3.5],[-3.6,-4.6],[3.6,-3]],
    landmark: [-1.8,-1.35], door: [0,-5.75], spawn: [-2.6,2], height: 5.8,
    colors: ["#ad8273","#9c7468","#493d59","#f9bd69","#ffe8ba"],
    fixtures: ["Reading lectern","Catalog terminal","Relic case","Archive lock"],
  },
  lab: {
    outline: [[-3,-7],[3,-7],[3,-4],[6,-4],[6,4],[3,4],[3,6],[-3,6],[-3,3],[-6,3],[-6,-3],[-3,-3]],
    stations: [[-4.8,-1],[4.7,2.6],[4.4,-2.8],[-1.65,4.6]],
    landmark: [.15,-1.5], door: [0,-6.75], spawn: [1.15,4.6], height: 5,
    colors: ["#6c929d","#4c7986","#244859","#49e1cd","#d4f4ff"],
    fixtures: ["Lab bench","Readout station","Sample locker","Analysis console"],
  },
  space: {
    outline: [[-2,-7],[2,-7],[4,-5],[4,-2],[6,0],[6,5],[2.5,5],[2,3],[-4,3],[-6,1],[-6,-3],[-3,-5]],
    stations: [[-4.7,-2],[4.9,3.5],[3.3,-3.15],[-4.35,.95]],
    landmark: [.1,-1.3], door: [0,-6.75], spawn: [2.2,2.15], height: 5.4,
    colors: ["#657b9b","#435575","#26304e","#ffbc56","#c4e5ff"],
    fixtures: ["Navigation charts","Observation terminal","Cargo locker","Flight computer"],
  },
  ocean: {
    outline: [[-2,-6.9],[2,-6.9],[4.3,-5.3],[5.8,-2.65],[6.35,.15],[5.8,2.9],[4.2,5], [1.4,6.2],[-1.4,6.2],[-4.2,5],[-5.8,2.9],[-6.35,.15],[-5.8,-2.65],[-4.3,-5.3]],
    stations: [[-4.75,1.9],[4.25,-3.25],[-3.6,-4.5],[4.55,2.9]],
    landmark: [0,-.8], door: [0,-6.65], spawn: [0,4.7], height: 5.2,
    colors: ["#448bab","#367180","#143e59","#73ecda","#9fddff"],
    fixtures: ["Specimen bench","Dive recorder","Pressure locker","Research console"],
  },
  city: {
    outline: [[-3,-7],[4,-7],[6,-5],[6,1],[3,1],[3,5],[-2,5],[-2,2],[-6,2],[-7,0],[-7,-3],[-3,-3]],
    stations: [[-5.7,-.8],[4.8,-4.8],[-1.7,-5.7],[1.8,3.8]],
    landmark: [.9,-2.1], door: [.4,-6.75], spawn: [-.3,3.8], height: 5.7,
    colors: ["#67608d","#50446f","#303657","#ff93cd","#f8cfef"],
    fixtures: ["Transit map","Signal terminal","Service locker","Transit console"],
  },
  alien: {
    outline: [[-2,-7],[2,-7],[5,-5],[4,-2],[7,1],[5,5],[1,5],[-2,7],[-5,4],[-4,1],[-7,-1],[-5,-4]],
    stations: [[-5.4,-1.6],[5.35,1.45],[3,-4.9],[-2.3,4.6]],
    landmark: [.3,-.9], door: [0,-6.75], spawn: [.2,3.8], height: 6.2,
    colors: ["#615486","#655482","#342855","#c9fa79","#b7a1ff"],
    fixtures: ["Survey stone","Echo scanner","Specimen cache","Resonance control"],
  },
};

// Later chambers have their own circulation and station locations within each world.
const chambers = [
  {
    outline:[[-3,-7],[3,-7],[3,-4],[7,-4],[7,1],[4,1],[4,5],[-4,5],[-4,3],[-7,3],[-7,-2],[-3,-2]],
    stations:[[-5.7,1.6],[5.9,-2.5],[-1.9,-5.7],[2.7,3.6]],
    landmark:[.4,-1.9],door:[0,-6.72],spawn:[-.4,3.6],
  },
  {
    outline:[[-2.7,-7],[2.7,-7],[3.5,-5],[3.5,-2],[6.6,-2],[7,1],[5,4.5],[.3,6.5],[-3,5],[-3,3],[-6,3],[-7,-.4],[-5.5,-3.7],[-2.7,-3.7]],
    stations:[[5.55,-.7],[-5.7,.5],[-4.45,-2.8],[2.1,4.36]],
    landmark:[.9,-1],door:[0,-6.72],spawn:[-1,3.9],
  },
  {
    outline:[[-2.3,-8],[2.3,-8],[3.6,-6],[3.6,-4],[6.3,-3],[6.6,2],[4.5,5.8],[-4.5,5.8],[-6.6,2],[-6.3,-3],[-3.6,-4],[-3.6,-6]],
    stations:[[4.9,2.5],[-4.9,2.5],[2.2,-4.8],[-3.1,-3.95]],
    landmark:[0,-1.15],door:[0,-7.72],spawn:[.45,4.65],
  },
] as const;

const round: Pick<Layout,"outline"|"stations"|"landmark"|"door"|"spawn"> = {
  outline:[[-2.5,-7],[2.5,-7],[5.5,-5.3],[7,-2.4],[7,2.4],[4.6,5.7],[1.9,7],[-1.9,7],[-4.6,5.7],[-7,2.4],[-7,-2.4],[-5.5,-5.3]],
  stations:[[-5.5,1.5],[5.4,-1.4],[-3.8,-4.6],[4.4,3.8]],
  landmark:[0,-.8],door:[0,-6.72],spawn:[0,5.35],
};
const diamond: typeof round = {
  outline:[[-1.6,-7],[1.6,-7],[7,0],[1.6,7],[-1.6,7],[-7,0]],
  stations:[[-4.5,-.45],[4.6,.05],[-2.6,-3.6],[2.3,4]],
  landmark:[0,-1.65],door:[0,-6.72],spawn:[0,5.35],
};
const cross: typeof round = {
  outline:[[-2.5,-7.1],[2.5,-7.1],[2.5,-2.5],[7,-2.5],[7,2.5],[2.5,2.5],[2.5,6],[-2.5,6],[-2.5,2.5],[-7,2.5],[-7,-2.5],[-2.5,-2.5]],
  stations:[[-5.6,1.1],[5.65,-1.08],[1.55,-5.1],[-1.28,3.9]],
  landmark:[.2,-.45],door:[0,-6.83],spawn:[.62,4.55],
};
const galleries: typeof round = {
  outline:[[-2.2,-7],[2.4,-7],[2.4,-4],[6.6,-4],[6.6,-.3],[3,-.3],[3,3.5],[-.2,3.5],[-.2,6.6],[-5,6.6],[-5,1.8],[-3.6,1.8],[-3.6,-2.9],[-2.2,-2.9]],
  stations:[[-3.55,5.1],[5.25,-2.45],[1.35,-5.75],[1.72,1.75]],
  landmark:[-.2,-.86],door:[0,-6.72],spawn:[-1.45,4.4],
};

const worldChambers = {
  tower:[diamond,round,chambers[0]],
  greenhouse:[round,cross,chambers[1]],
  archive:[galleries,diamond,chambers[0]],
  lab:[chambers[0],round,cross],
  space:[cross,chambers[2],diamond],
  ocean:[chambers[0],diamond,round],
  city:[chambers[1],galleries,cross],
  alien:[diamond,cross,chambers[2]],
} satisfies Record<Theme,readonly (typeof round)[]>;

const customLayouts = {
  round, diamond, cross, galleries, junction:chambers[0], annex:chambers[1], corridor:chambers[2],
} satisfies Record<ChamberDesign["layout"], typeof round>;

export function chamberLayout(theme:Theme, index:number, design?:ChamberDesign):Layout {
  const base=layouts[theme];
  if(design){
    const height=design.style==="gallery"?6.2:design.style==="airlock"?4.9:5.4;
    return {...base,...customLayouts[design.layout],height};
  }
  const chamber=worldChambers[theme][index-1];
  return chamber ? {...base,...chamber,height:base.height+[.3,-.24,.65][index-1]} : base;
}
