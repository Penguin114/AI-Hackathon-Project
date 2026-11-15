"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Backpack, BookOpen, Check, Clock3, Compass, DoorOpen, KeyRound, Lightbulb, LockKeyhole, Pause, Play, RotateCcw, Settings2, Volume2, VolumeX, X } from "lucide-react";
import RoomView from "@/game/RoomView";
import PuzzleForm from "./PuzzleForm";
import type { Target } from "@/game/scenery";
import { chamberScene } from "@/game/chamber-scenes";
import { layouts } from "@/game/layouts";
import { clueTargets, expedition, interlock, type ClueTarget } from "@/game/expedition";
import { dangerReadouts, floodProgress, worlds } from "@/game/world-rules";
import type { Progress } from "@/lib/db";
import { normalize, timePerRoom, type Adventure, type Setup } from "@/lib/plan";

type Panel = Target | "hint" | "pause" | "briefing" | "journal";
type RoomClock = { spent:number; startedAt:number|null };
type Props = { plan:Adventure; id:string; topic:string; setup:Setup; onLeave:()=>void; onRestart:()=>void; onComplete:(progress:Progress)=>void };

export default function PlayRoom({plan,id,topic,setup,onLeave,onRestart,onComplete}:Props) {
  const [index,setIndex]=useState(0);
  const [panel,setPanel]=useState<Panel|null>("briefing");
  const [found,setFound]=useState<ClueTarget[]>([]);
  const [collected,setCollected]=useState(false);
  const [installed,setInstalled]=useState(false);
  const [storageOpen,setStorageOpen]=useState(false);
  const [storageCode,setStorageCode]=useState("");
  const [storageError,setStorageError]=useState(false);
  const [unlocked,setUnlocked]=useState(false);
  const [consoleSolved,setConsoleSolved]=useState(false);
  const [puzzleDraft,setPuzzleDraft]=useState<string[]|null>(null);
  const [attempt,setAttempt]=useState(0);
  const [arriving,setArriving]=useState(false);
  const [elapsed,setElapsed]=useState(0);
  const [caught,setCaught]=useState(false);
  const [collapseComplete,setCollapseComplete]=useState(false);
  const [reserveUsed,setReserveUsed]=useState(false);
  const [answeredStations,setAnsweredStations]=useState<Array<ClueTarget|"equipment">>([]);
  const [stationAnswer,setStationAnswer]=useState("");
  const [stationError,setStationError]=useState(false);
  const [extraTime,setExtraTime]=useState(0);
  const [stabilizedUntil,setStabilizedUntil]=useState(0);
  const clock=useRef<RoomClock>({spent:0,startedAt:null});
  const pastRooms=useRef(0);
  const world=worlds[plan.theme];
  const baseLimit=timePerRoom[setup.level]*60_000;
  const limit=baseLimit+extraTime;
  const timedOut=elapsed>=limit;
  const swarm=plan.theme==="alien" && timedOut && !caught;
  const collapseTrigger=plan.theme==="alien"?caught:(plan.theme==="lab" || plan.theme==="space" || plan.theme==="ocean") && timedOut;
  const collapsing=collapseTrigger && !collapseComplete;
  const expired=(caught||(timedOut && plan.theme!=="alien")) && !collapsing;
  const stabilized=elapsed<stabilizedUntil;
  const remaining=Math.min(1,Math.max(0,(limit-elapsed)/baseLimit));
  const danger=dangerReadouts[plan.theme];
  const dangerValue=Math.round((plan.theme==="ocean"?floodProgress(remaining):remaining)*100);
  const running=(swarm || (panel!=="briefing" && panel!=="pause")) && !arriving && !expired && !collapsing;
  const secondsLeft=Math.ceil(Math.max(0,limit-elapsed)/1000);
  const countdown=Math.floor(secondsLeft/60)+":"+String(secondsLeft%60).padStart(2,"0");
  const [hints,setHints]=useState(0);
  const [shownHints,setShownHints]=useState(0);

  const [sound,setSound]=useState(true);
  const [toast,setToast]=useState("");
  const [selected,setSelected]=useState("");
  const audio=useRef<AudioContext|null>(null);
  const savedQueue=useRef(Promise.resolve());
  const room=plan.rooms[index];
  const last=index===plan.rooms.length-1;
  const hunt=expedition(plan.theme,index);
  const consoleFirst=hunt.consoleFirst;
  const customFixtures=[plan.worldDesign?.chambers[index].model?.name??room.clues[0].name,room.clues[1].name,"Parts locker",room.puzzle.name];
  const [firstStation,secondStation,storageStation,consoleStation]=plan.worldDesign ? customFixtures
    : chamberScene(plan.theme,index)?.fixtures??layouts[plan.theme].fixtures;
  const labels: Record<Target,string>={
    notes:firstStation, log:secondStation, artifact:hunt.artifact.name, cabinet:storageStation,
    mechanism:consoleStation, equipment:world.equipment, door:last?"Exit hatch":"Room hatch",
  };
  const {ids,plate,code:accessCode}=interlock(plan.theme,index,plan.title,labels);
  const clues={
    notes:room.clues[0],
    log:room.clues[1],
    artifact:{name:labels.artifact,text:plate},
  };
  const cluesReady=found.length===clueTargets.length;
  const itemKey=index+":item";

  useEffect(()=>{
    if(!running)return;
    const roomClock=clock.current;
    roomClock.startedAt=performance.now();
    const tick=()=>setElapsed(Math.min(limit,clockElapsed(roomClock)));
    const timer=window.setInterval(tick,125);
    tick();
    return ()=>{
      window.clearInterval(timer);
      roomClock.spent=Math.min(limit,clockElapsed(roomClock));
      roomClock.startedAt=null;
    };
  },[running,attempt,limit]);
  useEffect(()=>{
    if(!arriving)return;
    const timer=window.setTimeout(()=>setArriving(false),650);
    return()=>window.clearTimeout(timer);
  },[arriving,attempt]);
  useEffect(()=>{
    if(!toast)return;
    const timer=setTimeout(()=>setToast(""),2600);return()=>clearTimeout(timer);
  },[toast]);
  useEffect(()=>{
    const pause=(event:KeyboardEvent)=>{if(!swarm && !collapsing && event.key==="Escape"&&!event.defaultPrevented)setPanel(p=>p===null?"pause":null);};
    window.addEventListener("keydown",pause);
    return()=>window.removeEventListener("keydown",pause);
  },[swarm,collapsing]);
  useEffect(()=>{if(swarm||collapsing)setPanel(null);},[swarm,collapsing]);
  useEffect(()=>{
    const skipTime=(event:KeyboardEvent)=>{
      if(!running || event.repeat || !event.shiftKey || event.code!=="Minus" || event.ctrlKey || event.altKey || event.metaKey)return;
      if(event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable='true']"))return;
      event.preventDefault();
      const roomClock=clock.current;
      const now=performance.now();
      const current=roomClock.spent+(roomClock.startedAt===null?0:now-roomClock.startedAt);
      roomClock.spent=Math.min(limit,current+30_000);
      if(roomClock.startedAt!==null)roomClock.startedAt=now;
      setElapsed(roomClock.spent);
    };
    window.addEventListener("keydown",skipTime);
    return()=>window.removeEventListener("keydown",skipTime);
  },[running,limit]);
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
  function clockElapsed(roomClock=clock.current) {
    return roomClock.spent+(roomClock.startedAt===null?0:performance.now()-roomClock.startedAt);
  }
  function hasTime() {
    if(caught)return false;
    if(clockElapsed()<limit)return true;
    setElapsed(limit);
    return false;
  }
  const currentProgress=():Progress=>({
    room:index,solved:index+Number(unlocked),hints,
    seconds:Math.min(86400,Math.floor((pastRooms.current+Math.min(limit,clockElapsed()))/1000)),complete:false,
  });
  function inspect(target:Target) {
    if(!hasTime() || arriving)return;
    if((target==="notes"||target==="log"||target==="artifact") && !room.stationQuestions){
      if(!found.includes(target)){setFound([...found,target]);chime();}
    }
    setStationAnswer("");setStationError(false);
    setPanel(target);
  }
  function resetRoom() {
    pastRooms.current+=Math.min(limit,clockElapsed());
    clock.current={spent:0,startedAt:null};
    setElapsed(0);
    setCaught(false);
    setCollapseComplete(false);
    setReserveUsed(false);
    setAnsweredStations([]);setStationAnswer("");setStationError(false);
    setExtraTime(0);
    setStabilizedUntil(0);
    setAttempt(value=>value+1);
    setArriving(true);
    setFound([]);
    setPanel(null);
    setCollected(false);
    setInstalled(false);
    setStorageOpen(false);
    setStorageCode("");
    setStorageError(false);
    setConsoleSolved(false);
    setPuzzleDraft(null);
    setUnlocked(false);
    setShownHints(0);
    setSelected("");
    setToast("");
  }
  function unlockHatch() {
    setUnlocked(true);
    setToast("Hatch unlocked");
    chime(true);
    save({...currentProgress(),solved:index+1});
  }
  function nextRoom(){
    if(!unlocked || !hasTime())return;
    const progress=currentProgress();
    if(last){
      const completed={...progress,complete:true};
      save(completed);
      chime(true);
      onComplete(completed);
      return;
    }
    save({...progress,room:index+1});
    setIndex(index+1);
    resetRoom();
    chime(true);
  }
  function useEquipment(){
    if(reserveUsed || !hasTime())return;
    setReserveUsed(true);
    if(plan.theme==="space" || plan.theme==="ocean")setExtraTime(30_000);
    else setStabilizedUntil(clockElapsed()+(plan.theme==="alien"?12_000:24_000));
    setPanel(null);
    setToast(world.effect);
    chime();
  }
  function revealPuzzleHint() {
    if(shownHints>=room.puzzle.hints.length)return;
    setShownHints(shownHints+1);
    setHints(Math.min(100,hints+1));
  }
  const readyForPuzzle=consoleFirst?!consoleSolved:installed;
  const showHint=()=>{
    if(collapsing)return;
    if(!shownHints&&!unlocked&&readyForPuzzle)revealPuzzleHint();
    setPanel("hint");
  };
  const inv=found.map(kind=>({key:index+":"+kind,kind,...clues[kind],serial:ids[kind]}));
  const inventory=[...inv,...(collected?[{key:itemKey,...room.item,serial:null}]:[])];
  const entry=inventory.find(x=>x.key===selected);
  const failureTitle=caught?"Creature contact":world.expired;
  const title=expired?failureTitle:panel==="briefing"?plan.title:panel==="pause"?"Paused":panel==="hint"?"A little help":panel==="journal"?entry?.name??"Inventory":panel?labels[panel]:"";
  const station=panel==="notes"||panel==="log"||panel==="artifact"||panel==="equipment"?panel:null;
  const question=station?room.stationQuestions?.[["notes","log","artifact","equipment"].indexOf(station)]:undefined;
  const stationLocked=Boolean(station && question && !answeredStations.includes(station));
  return <main className="shell play-page">
    <div className="game-heading"><div><div className="eyebrow"><Compass size={15}/> {topic} <span className="heading-dot"/> {({Explorer:"Easy",Adventurer:"Medium",Expert:"Hard"} as const)[setup.level]}</div><h1>{plan.title}</h1></div><div className="hud-actions"><span className={"timer"+(secondsLeft<=30?" timer-urgent":"")} role="timer" aria-label={world.meter+" time remaining "+countdown}><Clock3 size={18}/><span className="timer-readout"><span className="world-meter-name">{world.meter}</span><span className="timer-digits">{countdown}</span></span></span><button className="icon-button" aria-label={sound?"Mute sound":"Enable sound"} onClick={()=>setSound(!sound)}>{sound?<Volume2 size={18}/>:<VolumeX size={18}/>}</button><button className="icon-button" aria-label="Get a hint" disabled={swarm} onClick={showHint}><Lightbulb size={18}/></button><button className="icon-button" aria-label="Pause" disabled={swarm} onClick={()=>{if(hasTime())setPanel("pause");}}><Pause size={18}/></button></div></div>
    <div className="game-layout">
      <section className="game-stage" aria-label="Room">
        <div className="game-ribbon"><span><span className="live-dot"/> ROOM {index+1} / {plan.rooms.length}</span><strong>{room.name}</strong></div>
        <RoomView key={attempt} theme={plan.theme} world={plan.worldDesign} index={index} unlocked={unlocked} cabinetOpen={storageOpen}
          paused={collapsing||(!swarm&&panel!==null)||expired||arriving} active={running} remaining={remaining} stabilized={stabilized}
          collapsing={collapsing} onCollapseComplete={()=>setCollapseComplete(true)}
          labels={labels} onTarget={inspect} onCaught={()=>setCaught(true)}/>
        {arriving&&<div className="chamber-arrival" role="status"><strong>{room.name}</strong></div>}
        {toast&&<div className="game-toast" role="status"><Check size={17}/>{toast}</div>}
        <div className="inventory-bar"><span className="eyebrow"><Backpack size={15}/> INVENTORY</span><div className="inventory">{inventory.length ? inventory.map(x=><button key={x.key} onClick={()=>{setSelected(x.key);setPanel("journal");}}>{x.key.endsWith(":item")?<KeyRound size={16}/>:<BookOpen size={16}/>}<span>{x.name}</span>{x.key===itemKey&&installed&&<Check size={14}/>}</button>) : <span className="inventory-empty">Collected clues and items appear here.</span>}</div></div>
      </section>
      <aside className={"danger-panel hazard-"+plan.theme} aria-label="Room conditions">
        <div className="danger-heading"><span>{danger.label}</span><strong>{dangerValue}%</strong></div>
        <div className="hazard-meter" role="progressbar" aria-label={danger.label} aria-valuenow={dangerValue}><div style={{width:dangerValue+"%"}}/></div>
        <p>{stabilized?world.effect:danger.detail}</p>
        <div className="clue-count"><BookOpen size={15}/> <span>Clues found</span><strong>{found.length} / {clueTargets.length}</strong></div>
      </aside>
    </div>
    {expired&&<div className="modal-shade"><section className="modal" role="dialog" aria-modal="true" aria-label={failureTitle}>
      <h2>{failureTitle}</h2><p>{caught?"The creature reached you. You've been severely injured after the encounter.":world.reason} Retry this chamber to continue.</p>
      <div className="pause-actions"><button className="button primary" autoFocus onClick={resetRoom}><RotateCcw size={17}/> Retry this room</button><button className="button secondary" onClick={()=>{save(currentProgress());onLeave();}}>Return to academy</button></div>
    </section></div>}
    {!expired&&!swarm&&!collapsing&&panel&&<div className="modal-shade" onClick={()=>setPanel(null)}><section className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={e=>e.stopPropagation()}>
      <button className="icon-button close" autoFocus aria-label="Close panel" onClick={()=>setPanel(null)}><X size={21}/></button>
      <span className="eyebrow">{panel==="briefing"?plan.setting:panel==="pause"?"SESSION MENU":panel==="hint"?"GUIDANCE":panel==="journal"?"INVENTORY":"ROOM "+(index+1)}</span>
      <h2>{title}</h2>
      {panel==="briefing"&&<><p>{plan.premise}</p><p>You have {timePerRoom[setup.level]} minutes per chamber. Reach its hatch before time runs out.</p><p>{world.warning}</p><p>Move with WASD, arrows, or the touch controls. Find two records and inspect the room’s artifact for the locker rule. Approach objects to inspect them and reread clues in your inventory.</p><button className="button primary" onClick={()=>setPanel(null)}><Play size={16}/> Enter the room</button></>}
      {panel==="pause"&&<div className="pause-actions"><button className="button primary" onClick={()=>setPanel(null)}><Play size={17}/> Resume</button><button className="button secondary" onClick={()=>{save(currentProgress());onRestart();}}><RotateCcw size={17}/> Restart adventure</button><button className="button secondary" onClick={()=>{save(currentProgress());onLeave();}}><ArrowRight size={17}/> Return to academy</button></div>}
      {stationLocked&&station&&question&&<form className="puzzle-form" onSubmit={event=>{event.preventDefault();if(!hasTime())return;if(normalize(stationAnswer)!==normalize(question.answer)){setStationError(true);return;}setAnsweredStations(previous=>[...previous,station]);if(station!=="equipment")setFound(previous=>previous.includes(station)?previous:[...previous,station]);setStationError(false);chime();}}>
        <p>{question.prompt}</p><fieldset><legend>Choose an answer</legend>{question.options.map(option=><label key={option} style={{display:"block",padding:"6px 0"}}><input type="radio" name="station-answer" required checked={stationAnswer===option} onChange={()=>{setStationAnswer(option);setStationError(false);}}/> {option}</label>)}</fieldset>
        {stationError&&<p className="inline-error" role="alert">That answer isn’t correct. Try again.</p>}
        <button className="button primary" type="submit"><Check size={17}/> Check answer</button>
      </form>}
      {!stationLocked&&station&&question&&answeredStations.includes(station)&&<div className="note">{question.explanation}</div>}
      {!stationLocked&&(panel==="notes"||panel==="log"||panel==="artifact")&&<><p className="station-serial">{panel==="artifact"?"Artifact digit":"Station ID"} <strong>{ids[panel]}</strong></p><div className="note">{clues[panel].text}</div><p className="muted saved-label"><Check size={15}/> Added to inventory</p></>}
      {!stationLocked&&panel==="equipment"&&<><p>{reserveUsed?"This station has already been used in this chamber.":world.warning}</p>{question&&<p>Use the station IDs and artifact reading to open {storageStation}. Its component and the {consoleStation} are needed to unlock the hatch.</p>}
        {!reserveUsed&&<button className="button primary" onClick={useEquipment}>{world.action}</button>}
      </>}
      {panel==="cabinet"&&<>{consoleFirst&&!consoleSolved?<p>The keypad is offline. Restore the {consoleStation.toLowerCase()} to power it.</p>:!storageOpen?<form className="puzzle-form" onSubmit={event=>{
        event.preventDefault();
        if(!hasTime()||!cluesReady)return;
        if(storageCode!==accessCode){setStorageError(true);return;}
        setStorageOpen(true);setStorageError(false);chime(true);
      }}>
        <p>{cluesReady?"Enter the three digits in the order shown on the artifact.":"Find both records and the artifact to activate the three-digit keypad."}</p>
        {inv.length>0&&<ul className="lock-readings">{inv.map(record=><li key={record.key}>
          <strong>{record.kind==="artifact"?"This artifact":labels[record.kind]}</strong> · {record.serial}{record.kind==="artifact"&&<div className="artifact-order">{record.text}</div>}
        </li>)}</ul>}
        <label className="answer-label">Storage code<input required disabled={!cluesReady} inputMode="numeric" pattern="[0-9]{3}" maxLength={3} autoComplete="off" value={storageCode} onChange={event=>{setStorageCode(event.target.value);setStorageError(false);}}/></label>
        {storageError&&<p className="inline-error" role="alert">The storage lock rejected that code.</p>}
        <button className="button primary" type="submit" disabled={!cluesReady}><LockKeyhole size={16}/> Unlock storage</button>
      </form>:collected?<p>You’ve already collected the {room.item.name.toLowerCase()}.</p>:<><p>{room.item.text}</p><button className="button primary" onClick={()=>{if(!hasTime())return;setCollected(true);setPanel(null);setToast(room.item.name+" collected");chime();}}><Backpack size={17}/> Take {room.item.name}</button></>}</>}
      {panel==="journal"&&entry&&<>{entry.serial!==null&&<p className="station-serial">{entry.key.endsWith(":artifact")?"Artifact digit":"Station ID"} <strong>{entry.serial}</strong></p>}<div className="note">{entry.text}</div></>}
      {panel==="mechanism"&&<>
        {unlocked ? <>
          <div className="success"><Check size={17}/> Mechanism restored</div><p>{room.puzzle.explanation}</p>
          <button className="button primary" onClick={()=>setPanel(null)}>Back to the room <ArrowRight size={17}/></button>
        </> : !consoleFirst && !collected ? <p>The console has an empty component socket. Check the {storageStation.toLowerCase()} for the part.</p>
          : (consoleFirst ? consoleSolved && collected : !installed) ? <button className="button primary" onClick={()=>{
            if(!hasTime())return;
            setInstalled(true);
            if(consoleFirst)unlockHatch();
            else chime();
          }}><KeyRound size={17}/> Use {room.item.name}</button>
          : consoleFirst && consoleSolved ? <p>The storage keypad has power. Open the {storageStation.toLowerCase()} and bring back its component.</p>
          : <>
            <PuzzleForm key={attempt} puzzle={room.puzzle} draft={puzzleDraft} onChange={setPuzzleDraft} onSolved={()=>{
              if(!hasTime())return;
              if(!consoleFirst){unlockHatch();return;}
              setConsoleSolved(true);
              setToast("Storage keypad powered");
              chime(true);
            }}/>
            {shownHints>0&&<ol className="hint-list inline-puzzle-hints">{room.puzzle.hints.slice(0,shownHints).map((hint,i)=><li key={i}>{hint}</li>)}</ol>}
            {shownHints<room.puzzle.hints.length&&<button type="button" className="text-button" onClick={revealPuzzleHint}><Lightbulb size={15}/> {shownHints?"Another hint":"Show a hint"}</button>}
            {found.map(kind=><details className="puzzle-notes" key={kind}><summary>Re-read {clues[kind].name}</summary><div className="note">{clues[kind].text}</div></details>)}
          </>}
      </>}
      {panel==="door"&&<>{unlocked?<><p>{last?"The exit opens. You’ve restored the final mechanism.":"The passage to the next chamber is open."}</p><button className="button primary" onClick={nextRoom}><DoorOpen size={18}/>{last?"Step outside":"Enter the next room"} <ArrowRight size={17}/></button></>:<p><LockKeyhole size={17} className="inline-icon"/> The hatch is locked.</p>}</>}
      {panel==="hint"&&(unlocked
        ? <p>The mechanism is restored. Look for the unlocked hatch.</p>
        : readyForPuzzle
          ? <><ol className="hint-list">{room.puzzle.hints.slice(0,shownHints).map((hint,i)=><li key={i}>{hint}</li>)}</ol>{shownHints<room.puzzle.hints.length&&<button className="button secondary" onClick={revealPuzzleHint}><Lightbulb size={17}/> Reveal another hint</button>}</>
          : collected
            ? <p>Bring the {room.item.name.toLowerCase()} to the {consoleStation.toLowerCase()}.</p>
            : storageOpen
              ? <p>The {storageStation.toLowerCase()} is open. Inspect it to collect the missing part.</p>
              : cluesReady
                ? <p>Use the artifact’s plate and the two record IDs at the {storageStation.toLowerCase()}.</p>
                : <p>Look for {clueTargets.filter(kind=>!found.includes(kind)).map(kind=>labels[kind].toLowerCase()).join(", ")}. Each reading goes into the storage code.</p>)}
    </section></div>}
  </main>;
}
