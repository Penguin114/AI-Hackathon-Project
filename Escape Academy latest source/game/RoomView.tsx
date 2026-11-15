"use client";

import { useEffect, useRef, useState } from "react";
import * as T from "three";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CircleDot, Mouse, Move } from "lucide-react";
import { buildRoom, type Target } from "./scenery";
import { collapseProgress } from "./collapse";
import type { Theme } from "@/lib/plan";
import type { WorldDesign } from "@/lib/world-design";

type Props = { theme: Theme; world?: WorldDesign; index: number; unlocked: boolean; cabinetOpen: boolean; paused: boolean; active: boolean; remaining: number; stabilized: boolean; collapsing:boolean; onCollapseComplete:()=>void; onCaught:()=>void; labels: Record<Target,string>; onTarget: (target:Target)=>void; };

export default function RoomView(props: Props) {
  const frame=useRef<HTMLDivElement>(null);
  const hazardLayer=useRef<HTMLDivElement>(null);
  const lightingLayer=useRef<HTMLDivElement>(null);
  const heatLayer=useRef<HTMLDivElement>(null);
  const collapseLayer=useRef<HTMLDivElement>(null);
  const markers=useRef<Partial<Record<Target,HTMLButtonElement|null>>>({});
  const mobile=useRef(new Set<string>());
  const wakeRenderer=useRef<(()=>void)|null>(null);
  const current=useRef(props);
  current.current=props;
  const [fallback,setFallback]=useState(false);
  const { theme,world,index,labels,onTarget }=props;
  const [nearby, setNearby] = useState<Target | null>(null);
  useEffect(()=>{wakeRenderer.current?.();},[props.paused,props.unlocked,props.cabinetOpen,props.stabilized]);
  useEffect(()=>{
    if(!fallback||!props.collapsing)return;
    const started=performance.now();let frame=0;
    const tick=(now:number)=>{
      const t=Math.min(1,(now-started)/3000);
      if(collapseLayer.current)collapseLayer.current.style.opacity=String(collapseProgress(t).white);
      if(t>=1)current.current.onCollapseComplete();else frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(frame);
  },[fallback,props.collapsing]);
  useEffect(()=>{
    const host=frame.current;
    if(!host) return;
    let renderer: T.WebGLRenderer;
    try { renderer=new T.WebGLRenderer({ antialias:true, powerPreference:"high-performance" }); }
    catch { setFallback(true); return; }
    const scene=new T.Scene();
    const room=buildRoom(scene,theme,index,world);
    const camera=new T.PerspectiveCamera(65,1,.045,32);
    camera.rotation.order="YXZ";camera.position.copy(room.spawn);
    camera.rotation.set(room.pitch,room.heading,0,"YXZ");
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
    renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
    renderer.domElement.setAttribute("aria-label","First-person view of the current room");
    host.prepend(renderer.domElement);
    let yaw=room.heading,pitch=room.pitch, raf=0,prev=performance.now();
    let pointer:{ id:number; x:number; y:number; dragged:boolean } | null=null;
    const keys=new Set<string>();
    const size=()=>{const w=host.clientWidth,h=host.clientHeight; if(!w||!h)return; camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);wake();};
    const resize=new ResizeObserver(size);
    const down=(e:KeyboardEvent)=>{
      if(current.current.paused || (e.target instanceof HTMLElement && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName))) return;
      const key=e.key.toLowerCase();
      if(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright","q","e","shift"].includes(key)){keys.add(key);e.preventDefault();}
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
    const inReach=(target:Target)=>room.canInspect(target,camera.position);
    let focusedTarget:Target|null=null;
    const interact=()=>{if(focusedTarget && !current.current.paused)current.current.onTarget(focusedTarget);};
    const inspectKey=(event:KeyboardEvent)=>{
      if(event.key.toLowerCase()==="f" && !event.repeat && !(event.target instanceof HTMLElement && event.target.closest("input, textarea, select")))interact();
    };
    window.addEventListener("keydown",inspectKey);
    const release=(e:PointerEvent)=>{
      if(pointer&&!pointer.dragged&&!current.current.paused&&e.type!=="pointercancel"){
        const rect=canvas.getBoundingClientRect();
        ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);
        const groups=Object.entries(room.groups) as [Target,T.Group][];
        const firstHit=ray.intersectObjects([...room.blockers,...groups.map(([,g])=>g)],true)[0];
        const hit=firstHit?.object;
        for(let node=hit;node;node=node.parent as T.Object3D){
          const target=groups.find(([,g])=>g===node)?.[0];
          if(target&&inReach(target)){current.current.onTarget(target);break;}
        }
      }
      pointer=null;
    };
    window.addEventListener("keydown",down);window.addEventListener("keyup",up);window.addEventListener("blur",blur);
    canvas.addEventListener("pointerdown",start);canvas.addEventListener("pointermove",look);canvas.addEventListener("pointerup",release);canvas.addEventListener("pointercancel",release);
    const projected=new T.Vector3();
    const targets=Object.keys(room.anchors) as Target[];
    let elapsed=0;
    const reduceMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let pace=2.65;
    let pursuedTime=0;
    let collapseStart:number|null=null,collapsePitch=0,collapseHeight=0,collapseDone=false;
    const tick=(now:number)=>{
      raf=0;
      const dt=Math.min((now-prev)/1000,.045);prev=now;
      const state=current.current;
      if(document.hidden)return;
      // Keep the existing scene in memory, but stop simulation, raycasts and
      // continuous GPU rendering while any panel covers the room.
      if(state.paused){
        keys.clear();mobile.current.clear();pointer=null;
        renderer.render(scene,camera);
        return;
      }
      if(state.active&&!state.paused)pursuedTime+=dt;
      const hazard=room.hazard(dt,pursuedTime,state.remaining,camera.position,state.active&&!state.paused,state.stabilized,reduceMotion);
      hazardLayer.current?.style.setProperty("--hazard-tint",String(hazard.tint));
      hazardLayer.current?.style.setProperty("--waterline",(hazard.waterline*100)+"%");
      lightingLayer.current?.style.setProperty("opacity",String(1-hazard.brightness));
      heatLayer.current?.style.setProperty("opacity",String(hazard.vignette));
      room.setHeat(hazard.heat);
      if(hazard.caught)state.onCaught();
      if(state.collapsing){
        if(collapseStart===null){collapseStart=now;collapsePitch=pitch;collapseHeight=camera.position.y;keys.clear();mobile.current.clear();}
        const t=Math.min(1,(now-collapseStart)/3000);
        const progress=collapseProgress(t);
        pitch=T.MathUtils.lerp(collapsePitch,Math.PI/2,progress.pitch);
        camera.position.y=T.MathUtils.lerp(collapseHeight,.05,progress.height);
        camera.rotation.set(pitch,yaw,0,"YXZ");
        if(collapseLayer.current)collapseLayer.current.style.opacity=String(progress.white);
        if(t>=1&&!collapseDone){collapseDone=true;state.onCollapseComplete();}
      } else if(!state.paused&&!hazard.caught){
        const has=(...names:string[])=>names.some(n=>keys.has(n)||mobile.current.has(n));
        const forward=Number(has("w","arrowup"))-Number(has("s","arrowdown"));
        const strafe=Number(has("d","arrowright"))-Number(has("a","arrowleft"));
        yaw+=(Number(has("q"))-Number(has("e")))*dt*1.6;
        const sprinting=has("shift") && Boolean(forward||strafe);
        pace=T.MathUtils.damp(pace,sprinting?4.4:2.65,9,dt);
        if(!reduceMotion){
          const fov=T.MathUtils.damp(camera.fov,sprinting?71:65,7,dt);
          if(Math.abs(fov-camera.fov)>.035){camera.fov=fov;camera.updateProjectionMatrix();}
        }
        const speed=dt*pace*hazard.pace/Math.max(1,Math.hypot(forward,strafe));
        const x=camera.position.x+(strafe*Math.cos(yaw)-forward*Math.sin(yaw))*speed;
        const z=camera.position.z+(-forward*Math.cos(yaw)-strafe*Math.sin(yaw))*speed;
        if(room.canWalk(x,camera.position.z))camera.position.x=x;
        if(room.canWalk(camera.position.x,z))camera.position.z=z;
        elapsed+=dt;
        camera.position.y=T.MathUtils.lerp(camera.position.y,1.68+(!reduceMotion&&(forward||strafe) ? Math.sin(elapsed*pace*4.2)*(sprinting?.041:.024) : 0),.18);
        camera.rotation.set(pitch,yaw,0,"YXZ");
      } else if(keys.size||mobile.current.size){keys.clear();mobile.current.clear();}
      const open=current.current.unlocked;
      room.door.rotation.y=T.MathUtils.lerp(room.door.rotation.y,open ? -Math.PI*.43 : 0,.082);
      room.escapeLight.intensity=T.MathUtils.lerp(room.escapeLight.intensity,open ? 19 : 0,.09);
      room.status.material.emissive.set(open?"#81e299":"#e48940");
      room.status.material.color.set(open?"#a2ffbe":"#e48940");
      room.drawer.position.z=T.MathUtils.lerp(room.drawer.position.z,current.current.cabinetOpen?.40:0,.12);
      if(open) room.dial.rotation.z-=dt*1.3;
      room.dust.position.y=Math.sin(now*.00039)*.13;
      room.animate(reduceMotion?0:elapsed,state.stabilized);
      renderer.render(scene,camera);
      const w=host.clientWidth,h=host.clientHeight;
      let closest:Target|null=null;
      let nearest=Infinity;
      for(const target of targets){
        const node=markers.current[target];
        if(!node)continue;
        projected.copy(room.anchors[target]).project(camera);
        const visible=projected.z>-1&&projected.z<1&&Math.abs(projected.x)<.91&&Math.abs(projected.y)<.86&&inReach(target);
        node.style.visibility=visible?"visible":"hidden";
        if(visible){
          const distance=projected.x**2+projected.y**2;
          if(distance<nearest){nearest=distance;closest=target;}
          node.style.transform="translate3d("+((projected.x*.5+.5)*w)+"px,"+((.5-projected.y*.5)*h)+"px,0) translate(-50%,-50%)";
        }
      }
      if(closest!==focusedTarget){focusedTarget=closest;setNearby(closest);}
      raf=requestAnimationFrame(tick);
    };
    function wake(){
      if(raf || document.hidden)return;
      prev=performance.now();
      raf=requestAnimationFrame(tick);
    }
    const visibility=()=>{
      if(document.hidden){cancelAnimationFrame(raf);raf=0;keys.clear();mobile.current.clear();pointer=null;}
      else wake();
    };
    wakeRenderer.current=wake;
    document.addEventListener("visibilitychange",visibility);
    resize.observe(host);size();
    return ()=>{
      wakeRenderer.current=null;cancelAnimationFrame(raf);resize.disconnect();
      document.removeEventListener("visibilitychange",visibility);
      window.removeEventListener("keydown",down);window.removeEventListener("keyup",up);window.removeEventListener("blur",blur);
      canvas.removeEventListener("pointerdown",start);canvas.removeEventListener("pointermove",look);canvas.removeEventListener("pointerup",release);canvas.removeEventListener("pointercancel",release);
      const materials=new Set<T.Material>();
      scene.traverse(obj=>{if(obj instanceof T.Mesh||obj instanceof T.Points){obj.geometry.dispose();for(const m of Array.isArray(obj.material)?obj.material:[obj.material])materials.add(m);}});
      window.removeEventListener("keydown",inspectKey);
      materials.forEach(m=>{for(const value of Object.values(m))if(value instanceof T.Texture)value.dispose();m.dispose();});renderer.dispose();canvas.remove();
    };
  },[theme,index,world]);

  return <div className={"room-view room-"+theme} ref={frame}>
    <div className="world-hazard" ref={hazardLayer} aria-hidden="true"/>
    <div className="room-lighting" ref={lightingLayer} aria-hidden="true"/>
    <div className="room-heat" ref={heatLayer} aria-hidden="true"/>
    <div className="collapse-white" ref={collapseLayer} aria-hidden="true"/>
    <div className="room-vignette" aria-hidden="true"/>
    {fallback ? <div className="webgl-fallback"><p>Explore the room’s stations.</p><div className="object-bar">{(Object.keys(labels) as Target[]).map(target=><button key={target} onClick={()=>onTarget(target)}>{labels[target]}</button>)}</div></div> : (Object.keys(labels) as Target[]).map(target=><button className={"marker marker-"+target} key={target} aria-label={labels[target]} ref={el=>{markers.current[target]=el;}} onClick={()=>onTarget(target)}><CircleDot size={15}/><span>{labels[target]}</span></button>)}
    <div className="view-controls"><span><Mouse size={14}/> Drag to look</span><span><Move size={14}/> WASD to move</span><span className="sprint-hint">Shift to sprint</span>{nearby&&<span>F to inspect</span>}</div>
    {!fallback && <div className="touch-controls" aria-label="Movement controls">
      {([{key:"w",Icon:ArrowUp,label:"Move forward"},{key:"a",Icon:ArrowLeft,label:"Move left"},{key:"s",Icon:ArrowDown,label:"Move back"},{key:"d",Icon:ArrowRight,label:"Move right"}]).map(({key,Icon,label})=><button key={key} className={"move-"+key} aria-label={label} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);mobile.current.add(key);}} onPointerUp={()=>mobile.current.delete(key)} onPointerCancel={()=>mobile.current.delete(key)} onLostPointerCapture={()=>mobile.current.delete(key)}><Icon size={19}/></button>)}
    </div>}
  </div>;
}
