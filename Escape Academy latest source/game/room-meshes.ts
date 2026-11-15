import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export function roomMeshes(scene:T.Scene) {
  const materials = new Map<string,T.MeshStandardMaterial>();
  function material(color:string, emissive=false) {
    const key = color + emissive;
    if (!materials.has(key)) materials.set(key,new T.MeshStandardMaterial({
      color, roughness:.57, metalness:.17,
      emissive:emissive ? color : "#000000", emissiveIntensity:emissive ? .6 : 0,
    }));
    return materials.get(key)!;
  }
  function mesh<M extends T.Material>(geometry:T.BufferGeometry, surface:M, x:number,y:number,z:number,parent:T.Object3D=scene) {
    const object=new T.Mesh(geometry,surface);
    object.position.set(x,y,z);
    object.receiveShadow=true;
    parent.add(object);
    return object;
  }
  function box(w:number,h:number,d:number,x:number,y:number,z:number,surface:T.Material,parent:T.Object3D=scene,radius=0) {
    const geometry=radius ? new RoundedBoxGeometry(w,h,d,2,radius) : new T.BoxGeometry(w,h,d);
    return mesh(geometry,surface,x,y,z,parent);
  }
  function cylinder(top:number,bottom:number,height:number,x:number,y:number,z:number,surface:T.Material,parent:T.Object3D=scene,sides=24) {
    return mesh(new T.CylinderGeometry(top,bottom,height,sides),surface,x,y,z,parent);
  }
  function hoop(radius:number,tube:number,x:number,y:number,z:number,surface:T.Material,parent:T.Object3D=scene) {
    return mesh(new T.TorusGeometry(radius,tube,8,40),surface,x,y,z,parent);
  }
  return {material,mesh,box,cylinder,hoop};
}
