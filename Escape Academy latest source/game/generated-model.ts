import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { RoomModel } from "@/lib/world-design";

type Part = RoomModel["parts"][number];

const shapes: Record<Part["shape"],()=>T.BufferGeometry> = {
  block:()=>new RoundedBoxGeometry(1,1,1,2,.075),
  cylinder:()=>new T.CylinderGeometry(.5,.5,1,28),
  cone:()=>new T.ConeGeometry(.5,1,26),
  sphere:()=>new T.SphereGeometry(.5,24,16),
  ring:()=>new T.TorusGeometry(.4,.10,12,36),
  arch:()=>new T.TorusGeometry(.4,.10,12,30,Math.PI),
  crystal:()=>new T.OctahedronGeometry(.68),
  wedge:()=>{
    const profile=new T.Shape().moveTo(-.5,-.5).lineTo(.5,-.5).lineTo(-.5,.5).closePath();
    return new T.ExtrudeGeometry(profile,{depth:1,bevelEnabled:false});
  },
  capsule:()=>new T.CapsuleGeometry(.35,.3,8,24),
};

export function buildGeneratedModel(model:RoomModel, root:T.Group, ceiling:number, maxRadius=1.52, lift=0) {
  const materials=new Map<string,T.MeshStandardMaterial>();
  const content=new T.Group();
  const meshes=model.parts.map(part=>{
    const geometry=shapes[part.shape]();
    geometry.computeBoundingBox();
    const size=geometry.boundingBox!.getSize(new T.Vector3());
    geometry.center();
    // Author every piece in the same local units, regardless of its native geometry.
    geometry.scale(part.size[0]/size.x,part.size[1]/size.y,part.size[2]/size.z);
    const key=part.color+part.finish;
    let material=materials.get(key);
    if(!material){
      material=new T.MeshStandardMaterial({
        color:part.color,
        roughness:part.finish==="matte"?.72:part.finish==="glass"?.18:.37,
        metalness:part.finish==="metal"?.45:.04,
        emissive:part.finish==="glow"?part.color:"#000000",
        emissiveIntensity:part.finish==="glow"?1.15:0,
        transparent:part.finish==="glass",
        opacity:part.finish==="glass"?.47:1,
        depthWrite:part.finish!=="glass",
      });
      materials.set(key,material);
    }
    const object=new T.Mesh(geometry,material);
    object.position.fromArray(part.at);
    object.rotation.set(...part.rotate.map(T.MathUtils.degToRad) as [number,number,number]);
    object.castShadow=part.finish!=="glass";
    object.receiveShadow=true;
    content.add(object);
    return object;
  });

  // Fit the structure to the layout's exhibit space, leaving the routes around it clear.
  const bounds=new T.Box3().setFromObject(content,true);
  const center=bounds.getCenter(new T.Vector3());
  const size=bounds.getSize(new T.Vector3());
  const radius=Math.hypot(size.x,size.z)/2;
  const scale=Math.min(maxRadius/radius,(ceiling-.88-lift)/size.y,1.55);
  content.position.set(-center.x,-bounds.min.y,-center.z);
  const exhibit=new T.Group();
  exhibit.add(content);
  exhibit.scale.setScalar(scale);
  const baseY=(model.motion==="hover"?.37:.09)+lift;
  exhibit.position.y=baseY;
  root.add(exhibit);
  if(model.motion==="rotate")exhibit.userData.update=(time:number)=>{exhibit.rotation.y=time*.40;};
  if(model.motion==="hover")exhibit.userData.update=(time:number)=>{exhibit.position.y=baseY+Math.sin(time*1.55)*.16;};
  return {meshes,radius:Math.max(.42,radius*scale),anchorHeight:T.MathUtils.clamp(baseY+size.y*scale*.58,.75,2.15)};
}
