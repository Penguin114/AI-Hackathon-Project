"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Backpack, BookOpen, Check, Clock3, Compass, DoorOpen, KeyRound, Lightbulb, LockKeyhole, Pause, Play, RotateCcw, Settings2, Volume2, VolumeX, X } from "lucide-react";
import RoomView from "@/game/RoomView";
import PuzzleForm from "./PuzzleForm";
import type { Target } from "@/game/scenery";
import { layouts } from "@/game/layouts";
import type { Progress } from "@/lib/db";
import type { Adventure, Setup } from "@/lib/plan";

type Panel = Target | "hint" | "pause" | "briefing" | "journal";
type Props = { plan:Adventure; id:string; topic:string; setup:Setup; onLeave:()=>void; onRestart:()=>void; onComplete:(progress:Progress)=>void };

export default function PlayRoom({plan,id,topic,setup,onLeave,onRestart,onComplete}:Props) {
  const [index,setIndex]=useState(0);
  const [panel,setPanel]=useState<Panel|null>("briefing");
  const [found,setFound]=useState<string[]>([]);
  const [collected,setCollected]=useState(false);
  const [installed,setInstalled]=useState(false);
  const [storageOpen,setStorageOpen]=useState(false);
  const [storageCode,setStorageCode]=useState("");
  const [storageError,setStorageError]=useState(false);
  const [unlocked,setUnlocked]=useState(false);
  const [hints,setHints]=useState(0);
  const [shownHints,setShownHints]=useState(0);

  const [sound,setSound]=useState(true);
  const [toast,setToast]=useState("");
  const [selected,setSelected]=useState("");
  const audio=useRef<AudioContext|null>(null);
  const savedQueue=useRef(Promise.resolve());
  const room=plan.rooms[index];
  const last=index===plan.rooms.length-1;
  const [firstStation,secondStation,storageStation,consoleStation]=layouts[plan.theme].fixtures;
  const labels: Record<Target,string>={
    notes:firstStation, log:secondStation, cabinet:storageStation,
    mechanism:consoleStation, door:last?"Exit hatch":"Room hatch",
  };
  const firstSerial=2+((index+plan.title.length)%7);
  const secondSerial=(firstSerial+3)%9+1;
  const storageRule = {
    tower: { instruction:"Set the lower station ID before the higher ID.", code:[firstSerial,secondSerial].sort((a,b)=>a-b).join("") },
    archive: { instruction:"File the two station IDs in descending order.", code:[firstSerial,secondSerial].sort((a,b)=>b-a).join("") },
    ocean: { instruction:"Enter both station IDs in order from the shallower reading to the deeper reading.", code:String(firstSerial)+String(secondSerial) },
    city: { instruction:"The keypad expects the sum of the station IDs, written as two digits.", code:String(firstSerial+secondSerial).padStart(2,"0") },
  };
  const {instruction,code:accessCode} = storageRule[plan.theme as keyof typeof storageRule] ?? {
    instruction:secondStation+" → "+firstStation,code:String(secondSerial)+String(firstSerial),
  };
  const itemKey=index+":item";

  useEffect(()=>{
    if(!toast)return;
    const timer=setTimeout(()=>setToast(""),2600);return()=>clearTimeout(timer);
  },[toast]);
  useEffect(()=>{
    const pause=(event:KeyboardEvent)=>{if(event.key==="Escape"&&!event.defaultPrevented)setPanel(p=>p===null?"pause":null);};
    window.addEventListener("keydown",pause);
    return()=>window.removeEventListener("keydown",pause);
  },[]);
  useEffect(()=>()=>{void audio.current?.close();},[]);

  function chime(high=false){
    if(!sound)return;
    try {
      const context=audio.current??new AudioContext();audio.current=context;
      void context.resume().catch(()=>{});
      const time=context.currentTime;
      (high?[392,523.25,659.25]:[329.63,440]).forEach((freq,i)=>{
        const tone=context.createOscillator(),amp=context.createGain(),start=time+i*.11;
        tone.type="sine";tone.frequency.value=freq;amp.gain.setValueAtTime(.001,start);
        amp.gain.exponentialRampToValueAtTime(.065,start+.024);amp.gain.exponentialRampToValueAtTime(.001,start+.29);
        tone.connect(amp).connect(context.destination);tone.start(start);tone.stop(start+.31);
      });
    } catch {}
  }
  function save(progress:Progress) {
    if(!id)return;
    savedQueue.current=savedQueue.current.then(async()=>{
      await fetch("/api/adventure",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,progress}),keepalive:true});
    }).catch(()=>{});
  }
  const currentProgress=():Progress=>({room:index,solved:index+Number(unlocked),hints,seconds:0,complete:false});
  function inspect(target:Target) {
    if(target==="notes"||target==="log"){
      const key=index+":"+target;
      if(!found.includes(key)){setFound([...found,key]);chime();}
    }
    setPanel(target);
  }
  function nextRoom(){
    if(!unlocked)return;
    if(last){const progress={room:index,solved:plan.rooms.length,hints,seconds:0,complete:true};save(progress);chime(true);onComplete(progress);return;}
    save({room:index+1,solved:index+1,hints,seconds:0,complete:false});
    setIndex(index+1);setFound([]);setPanel(null);setCollected(false);setInstalled(false);setStorageOpen(false);setStorageCode("");setStorageError(false);setUnlocked(false);setShownHints(0);setSelected("");chime(true);setToast("New room discovered");
  }
  const interactIcons={notes:BookOpen,log:BookOpen,cabinet:Backpack,mechanism:Settings2,door:DoorOpen};
  const showHint=()=>{
    if(!shownHints&&!unlocked&&storageOpen){setShownHints(1);setHints(hints+1);}
    setPanel("hint");
  };
  const inv=found.filter(key=>key.startsWith(index+":" )).map(key=>{const [n,kind]=key.split(":");const entry=plan.rooms[Number(n)].clues[kind==="notes"?0:1];return {key,name:entry.name,text:entry.text,serial:kind==="notes"?firstSerial:secondSerial};});
  const inventory=[...inv,...(collected?[{key:itemKey,...room.item,serial:null}]:[])];
  const entry=inventory.find(x=>x.key===selected);
  const title=panel==="briefing"?plan.title:panel==="pause"?"Paused":panel==="hint"?"A little help":panel==="journal"?entry?.name??"Inventory":panel?labels[panel]:"";
  return <main className="shell play-page">
    <div className="game-heading"><div><div className="eyebrow"><Compass size={15}/> {topic} <span className="heading-dot"/> {({Explorer:"Easy",Adventurer:"Medium",Expert:"Hard"} as const)[setup.level]}</div><h1>{plan.title}</h1></div><div className="hud-actions"><button className="icon-button" aria-label={sound?"Mute sound":"Enable sound"} onClick={()=>setSound(!sound)}>{sound?<Volume2 size={18}/>:<VolumeX size={18}/>}</button><button className="icon-button" aria-label="Get a hint" onClick={showHint}><Lightbulb size={18}/></button><button className="icon-button" aria-label="Pause" onClick={()=>setPanel("pause")}><Pause size={18}/></button></div></div>
    <div className="game-layout">
      <section className="game-stage" aria-label="Room">
        <div className="game-ribbon"><span><span className="live-dot"/> ROOM {index+1} / {plan.rooms.length}</span><strong>{room.name}</strong></div>
        <RoomView key={index} theme={plan.theme} index={index} unlocked={unlocked} cabinetOpen={storageOpen} paused={panel!==null} labels={labels} onTarget={inspect}/>
        {toast&&<div className="game-toast" role="status"><Check size={17}/>{toast}</div>}
        <div className="inventory-bar"><span className="eyebrow"><Backpack size={15}/> INVENTORY</span><div className="inventory">{inventory.length ? inventory.map(x=><button key={x.key} onClick={()=>{setSelected(x.key);setPanel("journal");}}>{x.key.endsWith(":item")?<KeyRound size={16}/>:<BookOpen size={16}/>}<span>{x.name}</span>{x.key===itemKey&&installed&&<Check size={14}/>}</button>) : <span className="inventory-empty">Collected clues and items appear here.</span>}</div></div>
      </section>
    </div>
    {panel&&<div className="modal-shade" onClick={()=>setPanel(null)}><section className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={e=>e.stopPropagation()}>
      <button className="icon-button close" autoFocus aria-label="Close panel" onClick={()=>setPanel(null)}><X size={21}/></button>
      <span className="eyebrow">{panel==="briefing"?plan.setting:panel==="pause"?"SESSION MENU":panel==="hint"?"GUIDANCE":panel==="journal"?"INVENTORY":"ROOM "+(index+1)}</span>
      <h2>{title}</h2>
      {panel==="briefing"&&<><p>{plan.premise}</p><p>Drag to look around. Move with WASD, arrows, or the touch controls. Explore the room and approach objects to inspect them. Collected records appear in your inventory.</p><button className="button primary" onClick={()=>setPanel(null)}><Play size={16}/> Enter the room</button></>}
      {panel==="pause"&&<div className="pause-actions"><button className="button primary" onClick={()=>setPanel(null)}><Play size={17}/> Resume</button><button className="button secondary" onClick={()=>{save(currentProgress());onRestart();}}><RotateCcw size={17}/> Restart adventure</button><button className="button secondary" onClick={()=>{save(currentProgress());onLeave();}}><ArrowRight size={17}/> Return to academy</button></div>}
      {(panel==="notes"||panel==="log")&&<><p className="station-serial">Station ID <strong>{panel==="notes"?firstSerial:secondSerial}</strong>{plan.theme==="ocean"&&(panel==="notes"?"80 m":"240 m")}</p><div className="note">{room.clues[panel==="notes"?0:1].text}</div><p className="muted saved-label"><Check size={15}/> Added to inventory</p></>}
      {panel==="cabinet"&&<>{!storageOpen?<form className="puzzle-form" onSubmit={event=>{
        event.preventDefault();
        if(storageCode!==accessCode){setStorageError(true);return;}
        setStorageOpen(true);setStorageError(false);chime(true);
      }}>
        <p>{instruction}</p>
        <label className="answer-label">Storage code<input required inputMode="numeric" pattern="[0-9]{2}" maxLength={2} autoComplete="off" value={storageCode} onChange={event=>{setStorageCode(event.target.value);setStorageError(false);}}/></label>
        {storageError&&<p className="inline-error" role="alert">The storage lock rejected that code.</p>}
        <button className="button primary" type="submit"><LockKeyhole size={16}/> Unlock storage</button>
      </form>:collected?<p>You’ve already collected the {room.item.name.toLowerCase()}.</p>:<><p>{room.item.text}</p><button className="button primary" onClick={()=>{setCollected(true);setPanel(null);setToast(room.item.name+" collected");chime();}}><Backpack size={17}/> Take {room.item.name}</button></>}</>}
      {panel==="journal"&&entry&&<>{entry.serial!==null&&<p className="station-serial">Station ID <strong>{entry.serial}</strong>{plan.theme==="ocean"&&(entry.key.endsWith(":notes")?"80 m":"240 m")}</p>}<div className="note">{entry.text}</div></>}
      {panel==="mechanism"&&(unlocked?<><div className="success"><Check size={17}/> Mechanism restored</div><p>{room.puzzle.explanation}</p><button className="button primary" onClick={()=>setPanel(null)}>Back to the room <ArrowRight size={17}/></button></>:!collected?<><p>The console has an empty component socket.</p><button className="button secondary" onClick={()=>setPanel(null)}><LockKeyhole size={16}/> Keep exploring</button></>:!installed?<><button className="button primary" onClick={()=>{setInstalled(true);chime();}}><KeyRound size={17}/> Use {room.item.name}</button></>:<><PuzzleForm key={index} puzzle={room.puzzle} onSolved={()=>{setUnlocked(true);setToast("Door unlocked");chime(true);save({room:index,solved:index+1,hints,seconds:0,complete:false});}}/>{(["notes","log"] as const).map((kind, clueIndex)=>found.includes(index+":"+kind)&&<details className="puzzle-notes" key={kind}><summary>Re-read {room.clues[clueIndex].name}</summary><div className="note">{room.clues[clueIndex].text}</div></details>)}</>)}
      {panel==="door"&&<>{unlocked?<><p>{last?"The exit opens. You’ve restored the final mechanism.":"The lock clicks. The next room is ready to explore."}</p><button className="button primary" onClick={nextRoom}><DoorOpen size={18}/>{last?"Step outside":"Enter the next room"} <ArrowRight size={17}/></button></>:<p><LockKeyhole size={17} className="inline-icon"/> The hatch is locked.</p>}</>}
      {panel==="hint"&&(unlocked?<p>The mechanism is restored. Look for the unlocked hatch.</p>:!storageOpen?<p>Inspect the two record stations. Each has an ID that appears on its panel and in your inventory.</p>:<><ol className="hint-list">{room.puzzle.hints.slice(0,shownHints).map((hint,i)=><li key={i}>{hint}</li>)}</ol>{shownHints<3&&<button className="button secondary" onClick={()=>{setShownHints(shownHints+1);setHints(hints+1);}}><Lightbulb size={17}/> Reveal another hint</button>}</>)}
    </section></div>}
  </main>;
}