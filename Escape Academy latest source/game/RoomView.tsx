"use client";

import { useEffect, useRef, useState } from "react";
import * as T from "three";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CircleDot, Mouse, Move } from "lucide-react";
import { buildRoom, type Target } from "./scenery";
import type { Theme } from "@/lib/plan";

type Props = { theme: Theme; index: number; unlocked: boolean; cabinetOpen: boolean; paused: boolean; labels: Record<Target,string>; onTarget: (target:Target)=>void; };

export default function RoomView(props: Props) {
  const frame=useRef<HTMLDivElement>(null);
  const markers=useRef<Partial<Record<Target,HTMLButtonElement|null>>>({});
  const mobile=useRef(new Set<string>());
  const current=useRef(props);
  current.current=props;
  const [fallback,setFallback]=useState(false);
  const { theme,index,labels,onTarget }=props;
  useEffect(()=>{
    const host=frame.current;
    if(!host) return;
    let renderer: T.WebGLRenderer;
    try { renderer=new T.WebGLRenderer({ antialias:true, powerPreference:"high-performance" }); }
    catch { setFallback(true); return; }
    const scene=new T.Scene();
    const room=buildRoom(scene,theme,index);
    const camera=new T.PerspectiveCamera(65,1,.045,32);
    camera.rotation.order="YXZ";camera.position.set(.05,1.68,3.56);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
    renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
    renderer.domElement.setAttribute("aria-label","First-person view of the current room");
    host.prepend(renderer.domElement);
    let yaw=0,pitch=-.033, raf=0,prev=performance.now();
    let pointer:{ id:number; x:number; y:number; dragged:boolean } | null=null;
    const keys=new Set<string>();
    const size=()=>{const w=host.clientWidth,h=host.clientHeight; if(!w||!h)return; camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);};
    const resize=new ResizeObserver(size);resize.observe(host);size();
    const down=(e:KeyboardEvent)=>{
      if(current.current.paused || (e.target instanceof HTMLElement && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName))) return;
      const key=e.key.toLowerCase();
      if(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright","q","e"].includes(key)){keys.add(key);e.preventDefault();}
    };
    const up=(e:KeyboardEvent)=>keys.delete(e.key.toLowerCase());
    const blur=()=>{keys.clear();mobile.current.clear();};
    const canvas=renderer.domElement;
    const start=(e:PointerEvent)=>{if(!current.current.paused){pointer={id:e.pointerId,x:e.clientX,y:e.clientY,dragged:false};canvas.setPointerCapture(e.pointerId);}};
    const look=(e:PointerEvent)=>{
      if(!pointer || current.current.paused || pointer.id!==e.pointerId)return;
      const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;
      if(Math.abs(dx)+Math.abs(dy)>1) pointer.dragged=true;
      yaw-=dx*.0047;pitch=T.MathUtils.clamp(pitch-dy*.0047,-1.05,1.05);
      pointer.x=e.clientX;pointer.y=e.clientY;
    };
    const ray=new T.Raycaster();
    const release=(e:PointerEvent)=>{
      if(pointer&&!pointer.dragged&&!current.current.paused&&e.type!=="pointercancel"){
        const rect=canvas.getBoundingClientRect();
        ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);
        const groups=Object.entries(room.groups) as [Target,T.Group][];
        const hit=ray.intersectObjects(groups.map(([,g])=>g),true)[0]?.object;
        for(let node=hit;node;node=node.parent as T.Object3D){
          const target=groups.find(([,g])=>g===node)?.[0];
          if(target){current.current.onTarget(target);break;}
        }
      }
      pointer=null;
    };
    window.addEventListener("keydown",down);window.addEventListener("keyup",up);window.addEventListener("blur",blur);
    canvas.addEventListener("pointerdown",start);canvas.addEventListener("pointermove",look);canvas.addEventListener("pointerup",release);canvas.addEventListener("pointercancel",release);
    const projected=new T.Vector3();
    const collisions=(x:number,z:number)=>room.blocked.some(o=>Math.abs(x-o.x)<o.w/2+.22&&Math.abs(z-o.z)<o.d/2+.22);
    const targets=Object.keys(room.anchors) as Target[];
    const tick=(now:number)=>{
      const dt=Math.min((now-prev)/1000,.045);prev=now;
      if(!current.current.paused){
        const has=(...names:string[])=>names.some(n=>keys.has(n)||mobile.current.has(n));
        const forward=Number(has("w","arrowup"))-Number(has("s","arrowdown"));
        const strafe=Number(has("d","arrowright"))-Number(has("a","arrowleft"));
        yaw+=(Number(has("q"))-Number(has("e")))*dt*1.6;
        const speed=dt*2.65/Math.max(1,Math.hypot(forward,strafe));
        const x=T.MathUtils.clamp(camera.position.x+(strafe*Math.cos(yaw)-forward*Math.sin(yaw))*speed,-4.54,4.54);
        const z=T.MathUtils.clamp(camera.position.z+(-forward*Math.cos(yaw)-strafe*Math.sin(yaw))*speed,-4.31,4.51);
        if(!collisions(x,camera.position.z))camera.position.x=x;
        if(!collisions(camera.position.x,z))camera.position.z=z;
        camera.position.y=T.MathUtils.lerp(camera.position.y,1.68+(forward||strafe ? Math.sin(now*.011)*.022 : 0),.18);
        camera.rotation.set(pitch,yaw,0,"YXZ");
      } else if(keys.size||mobile.current.size){keys.clear();mobile.current.clear();}
      const open=current.current.unlocked;
      room.door.rotation.y=T.MathUtils.lerp(room.door.rotation.y,open ? -Math.PI*.43 : 0,.082);
      room.escapeLight.intensity=T.MathUtils.lerp(room.escapeLight.intensity,open ? 19 : 0,.09);
      room.status.material.emissive.set(open?"#81e299":"#e48940");
      room.status.material.color.set(open?"#a2ffbe":"#e48940");
      room.drawer.position.z=T.MathUtils.lerp(room.drawer.position.z,current.current.cabinetOpen?-2.91:-3.33,.12);
      if(open) room.dial.rotation.z-=dt*1.3;
      room.dust.position.y=Math.sin(now*.00039)*.13;
      renderer.render(scene,camera);
      const w=host.clientWidth,h=host.clientHeight;
      for(const target of targets){
        const node=markers.current[target];
        if(!node)continue;
        projected.copy(room.anchors[target]).project(camera);
        const visible=projected.z>-1&&projected.z<1&&Math.abs(projected.x)<.91&&Math.abs(projected.y)<.86;
        node.style.visibility=visible?"visible":"hidden";
        if(visible)node.style.transform="translate3d("+((projected.x*.5+.5)*w)+"px,"+((.5-projected.y*.5)*h)+"px,0) translate(-50%,-50%)";
      }
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return ()=>{
      cancelAnimationFrame(raf);resize.disconnect();
      window.removeEventListener("keydown",down);window.removeEventListener("keyup",up);window.removeEventListener("blur",blur);
      canvas.removeEventListener("pointerdown",start);canvas.removeEventListener("pointermove",look);canvas.removeEventListener("pointerup",release);canvas.removeEventListener("pointercancel",release);
      const materials=new Set<T.Material>();
      scene.traverse(obj=>{if(obj instanceof T.Mesh||obj instanceof T.Points){obj.geometry.dispose();for(const m of Array.isArray(obj.material)?obj.material:[obj.material])materials.add(m);}});
      materials.forEach(m=>m.dispose());renderer.dispose();canvas.remove();
    };
  },[theme,index]);

  return <div className={"room-view room-"+theme} ref={frame}>
    <div className="room-vignette" aria-hidden="true"/>
    {fallback ? <div className="webgl-fallback"><p>3D rendering is unavailable. Explore using the room objects below.</p></div> : (Object.keys(labels) as Target[]).map(target=><button className={"marker marker-"+target} key={target} aria-label={labels[target]} ref={el=>{markers.current[target]=el;}} onClick={()=>onTarget(target)}><CircleDot size={15}/><span>{labels[target]}</span></button>)}
    <div className="view-controls"><span><Mouse size={14}/> Drag to look</span><span><Move size={14}/> WASD to move</span></div>
    {!fallback && <div className="touch-controls" aria-label="Movement controls">
      {([{key:"w",Icon:ArrowUp,label:"Move forward"},{key:"a",Icon:ArrowLeft,label:"Move left"},{key:"s",Icon:ArrowDown,label:"Move back"},{key:"d",Icon:ArrowRight,label:"Move right"}]).map(({key,Icon,label})=><button key={key} className={"move-"+key} aria-label={label} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);mobile.current.add(key);}} onPointerUp={()=>mobile.current.delete(key)} onPointerCancel={()=>mobile.current.delete(key)} onLostPointerCapture={()=>mobile.current.delete(key)}><Icon size={19}/></button>)}
    </div>}
  </div>;
}