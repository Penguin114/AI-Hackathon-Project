"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowDown, ArrowRight, BookOpen, Check, ChevronRight, Clock3, Compass, DoorOpen, FileUp, FlaskConical, Footprints, GraduationCap, KeyRound, Landmark, Leaf, Play, Sparkles, Telescope, X } from "lucide-react";
import { levels, timePerRoom, validatePlan, type Adventure, type Setup } from "@/lib/plan";
import { defaultSetup, presets, sampleFor } from "@/lib/samples";
import { worlds } from "@/game/world-rules";
import { maxNotesCharacters } from "@/lib/notes";
import type { Progress } from "@/lib/db";
import { readNotesFile, type NotesFile } from "./notes-file";

const PlayRoom = dynamic(()=>import("./PlayRoom"),{ssr:false,loading:()=> <div className="preparing"><Compass/><p>Opening the room…</p></div>});
type Session = { plan: Adventure; id: string; topic: string; setup: Setup };
type History = { id: string; title: string; topic: string; progress: Progress };
const worldOptions = [
  { value:"space", label:"Space station" }, { value:"ocean", label:"Underwater laboratory" },
  { value:"city", label:"Future city" }, { value:"alien", label:"Alien research base" },
  { value:"tower", label:"Clockwork tower" }, { value:"greenhouse", label:"Greenhouse" },
  { value:"archive", label:"Archive" }, { value:"lab", label:"Science laboratory" },
] as const;
const initial = "Turn anything you want to learn into an escape-room adventure.";

export default function Academy() {
  const [setup,setSetup]=useState<Setup>({...defaultSetup,topic:""});
  const [attached,setAttached]=useState<NotesFile|null>(null);
  const [readingFile,setReadingFile]=useState(false);
  const [fileError,setFileError]=useState("");
  const [stage,setStage]=useState<"home"|"loading"|"recovery"|"play"|"done">("home");
  const [session,setSession]=useState<Session|null>(null);
  const [notice,setNotice]=useState("");
  const [result,setResult]=useState<Progress|null>(null);
  const [showHelp,setShowHelp]=useState(false);
  const [showHistory,setShowHistory]=useState(false);
  const [history,setHistory]=useState<History[]>([]);
  const [historyStatus,setHistoryStatus]=useState("");
  const currentRequest=useRef<AbortController|null>(null);
  const topicInput=useRef<HTMLTextAreaElement>(null);
  const notesInput=useRef<HTMLInputElement>(null);
  const started=useRef(false);
  useEffect(()=>()=>currentRequest.current?.abort(),[]);
  useEffect(()=>{if(stage!=="home")window.scrollTo(0,0);},[stage]);
  useEffect(()=>{
    const close=(event:KeyboardEvent)=>{if(event.key==="Escape"){setShowHelp(false);setShowHistory(false);}};
    window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close);
  },[]);
  const home=()=>{ currentRequest.current?.abort();started.current=false;setStage("home");setSession(null);setNotice("");setResult(null);window.scrollTo(0,0); };
  const focus=(topic?:string)=>{
    if(topic!==undefined)setSetup(prev=>({...prev,topic}));
    if(stage!=="home")home();
    requestAnimationFrame(()=>{
      const input=topicInput.current;
      input?.scrollIntoView({behavior:"smooth",block:"center"});
      input?.focus({preventScroll:true});
    });
  };
  const openHistory=async()=>{
    setShowHistory(true);setHistoryStatus("Loading saved adventures…");
    try {
      const res=await fetch("/api/adventure",{cache:"no-store"});
      if(!res.ok)throw new Error();
      const data=await res.json();
      setHistory(data.adventures);setHistoryStatus(data.adventures.length?"":"Your completed and in-progress adventures will appear here.");
    } catch {setHistory([]);setHistoryStatus("The journal is temporarily unavailable.");}
  };
  const launch=(entry:Session)=>{setSession(entry);setNotice("");setStage("play");};
  async function attachNotes(file?:File) {
    if(!file)return;
    setFileError("");
    setReadingFile(true);
    try {
      setAttached(await readNotesFile(file));
      setNotice("");
    } catch(error) {
      setFileError(error instanceof Error ? error.message : "Couldn’t read this file.");
    } finally {
      setReadingFile(false);
    }
  }
  async function sample(settings:Setup) {
    if(started.current)return;
    started.current=true;
    const {plan:samplePlan,matched}=sampleFor(settings);
    const worldName=worldOptions.find(option=>option.value===settings.preferredTheme)?.label;
    const chosenPlan=worldName && settings.preferredTheme && settings.preferredTheme!==samplePlan.theme ? {
      ...samplePlan, theme:settings.preferredTheme, title:worldName+" · Practice escape",
      setting:worldName,
      premise:"The original route out is sealed. Investigate the stations in each chamber and restore their escape mechanisms.",
    } : samplePlan;
    const names=worlds[chosenPlan.theme].chambers;
    const plan={...chosenPlan,rooms:chosenPlan.rooms.map((room,index)=>({...room,name:names[index]}))};
    const topic=matched?settings.topic:"Fractions";
    const controller=new AbortController();
    currentRequest.current=controller;
    setStage("loading");
    let id="";
    try {
      const res=await fetch("/api/adventure",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic,plan}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(3500)])});
      if(res.ok)id=(await res.json()).id;
    } catch {}
    if(controller.signal.aborted)return;
    started.current=false;launch({plan,id,topic,setup:{...settings,topic}});
  }
  async function generate() {
    if(started.current||readingFile)return;
    const input=setup.topic.trim();
    const isNotes=input.length>100 || input.includes("\n");
    if(input.length<2&&!attached){
      setNotice("Enter a topic or attach your study notes.");
      return;
    }
    const notes=[attached&&"text" in attached?attached.text:"",isNotes?input:""].filter(Boolean).join("\n\n");
    if(notes.length>maxNotesCharacters){
      setNotice("Use up to 24,000 characters across the attached and pasted notes.");
      return;
    }
    const notesPdf=attached&&"pdf" in attached?attached.pdf:undefined;
    const settings:Setup={...setup,topic:isNotes||input.length<2?"Study notes":input,notes:notes||undefined,notesPdf};
    started.current=true;setStage("loading");
    const controller=new AbortController();
    currentRequest.current=controller;
    try {
      const response=await fetch("/api/adventure",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(settings),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(200000)])});
      const data=await response.json().catch(()=>null);
      if(controller.signal.aborted)return;
      if(!response.ok){
        setSession(null);
        setNotice(typeof data?.error==="string"?data.error:"The adventure couldn’t be generated. Try again.");
        setStage("recovery");
        return;
      }
      const plan=validatePlan(data.plan,settings.minutes);
      const entry={plan,id:data.id,topic:data.topic,setup:{...setup,topic:data.topic}};
      if(data.source==="sample"){setSession(entry);setNotice(data.notice);setStage("recovery");}
      else launch(entry);
    } catch {
      if(controller.signal.aborted)return;
      setSession(null);setNotice("Your custom adventure couldn’t be prepared. Try again or step into a ready-to-play room.");setStage("recovery");
    } finally {if(currentRequest.current===controller)started.current=false;}
  }

  return <>
    <header className="topbar"><div className="shell top-inner">
      <button className="brand" onClick={home}><span className="brand-mark"><DoorOpen size={23}/></span><span>Escape<span className="brand-accent"> Academy</span></span></button>
      <nav aria-label="Main navigation"><button className="nav-help" onClick={()=>setShowHelp(true)}><Compass size={16}/> How to play</button><button onClick={openHistory} aria-label="Journal"><BookOpen size={16}/> <span>Journal</span></button><button className="button nav-play" onClick={()=>focus()}>Play now <ArrowRight size={16}/></button></nav>
    </div></header>
    {stage==="home" && <main className="simple-home">
      <div className="home-art" role="img" aria-label="A warmly lit clockwork tower room" />
      <div className="home-content"><div className="simple-intro"><h1>Learn your way <em>out.</em></h1><p>{initial}</p></div>
      <form className="simple-setup" onSubmit={e=>{e.preventDefault();void generate();}}>
        <label htmlFor="topic">Topic or study notes</label>
        <textarea ref={topicInput} id="topic" value={setup.topic} onChange={e=>{setSetup({...setup,topic:e.target.value});setNotice("");}} placeholder="Enter a topic or paste your notes here" minLength={2} maxLength={maxNotesCharacters} required={!attached} rows={6}/>
        <div className="notes-upload">
          <input ref={notesInput} type="file" hidden accept=".docx,.pdf,.txt,.md" onChange={event=>{
            void attachNotes(event.currentTarget.files?.[0]);
            event.currentTarget.value="";
          }}/>
          <button type="button" className="button secondary" disabled={readingFile} aria-describedby="notes-file-help"
            onClick={()=>notesInput.current?.click()}><FileUp size={17}/>{readingFile?"Reading notes…":attached?"Replace notes file":"Add notes file"}</button>
          <p id="notes-file-help">Word (.docx), PDF, TXT, or Markdown, up to 4 MB. Gemini uses the notes to write questions.</p>
          {attached&&<div className="notes-attachment"><span role="status">{attached.name}</span>
            <button type="button" className="icon-button" aria-label="Remove notes file" disabled={readingFile} onClick={()=>{setAttached(null);setFileError("");setNotice("");}}><X size={16}/></button>
          </div>}
          {fileError&&<p className="inline-error" role="alert">{fileError}</p>}
        </div>
        <label htmlFor="world">World</label>
        <select id="world" value={setup.preferredTheme??""} onChange={e=>{
          const value=e.target.value;
          setSetup({...setup,preferredTheme:worldOptions.find(option=>option.value===value)?.value});
          setNotice("");
        }}>
          <option value="">Choose for my topic</option>
          {worldOptions.map(world=><option value={world.value} key={world.value}>{world.label}</option>)}
        </select>
        <fieldset><legend>Difficulty</legend><div className="difficulty-options">{([["Explorer","Easy"],["Adventurer","Medium"],["Expert","Hard"]] as const).map(([value,label])=><label key={value} className={setup.level===value?"selected":""}><input type="radio" name="difficulty" value={value} checked={setup.level===value} onChange={()=>setSetup({...setup,level:value})}/><span>{label}</span>{" "}<small>{timePerRoom[value]} min</small></label>)}</div></fieldset>
        {notice&&<p role="alert" className="inline-error">{notice}</p>}
        <button className="button primary create" type="submit" disabled={readingFile}>Create adventure <ArrowRight size={19}/></button>
      </form>
      <button className="text-button world-preview" onClick={()=>void sample({...defaultSetup,level:setup.level,topic:setup.preferredTheme==="ocean"?"Ocean zones":defaultSetup.topic,preferredTheme:setup.preferredTheme})}>Play a sample in this world <ArrowRight size={15}/></button>
      </div>
    </main>}
    {stage==="loading" && <main className="shell state-wrap"><div className="state-card preparing"><div className="state-icon"><Compass size={42}/></div><span className="eyebrow">PREPARING YOUR ADVENTURE</span><h1>Setting the scene.</h1><p>Building your room and puzzles. This can take a minute.</p><div className="load-bar"/><button className="text-button" onClick={home}>Cancel</button></div></main>}
    {stage==="recovery" && <main className="shell state-wrap"><div className="state-card"><div className="state-icon"><KeyRound size={34}/></div><h1>There’s another door.</h1><p>{notice}</p><div className="state-actions"><button className="button primary" onClick={()=>session?launch(session):void sample(defaultSetup)}>Play sample adventure <ArrowRight size={18}/></button><button className="button secondary" onClick={()=>{setStage("home");void generate();}}>Try again</button><button className="button secondary" onClick={()=>focus()}>Edit my topic</button></div></div></main>}
    {stage==="play" && session && <PlayRoom {...session} onLeave={home} onRestart={()=>void sampleOrRestart()} onComplete={progress=>{setResult(progress);setStage("done");}}/>}
    {stage==="done" && result && session && <main className="shell state-wrap"><div className="state-card recap"><div className="state-icon"><GraduationCap size={40}/></div><span className="eyebrow">ADVENTURE COMPLETE</span><h1>You escaped!</h1><p>{session.plan.title}</p><div className="recap-stats"><span><KeyRound size={17}/> {result.solved} puzzles solved</span><span><Sparkles size={17}/> {result.hints} hints</span><span><Clock3 size={17}/> {Math.floor(result.seconds/60)}m {result.seconds%60}s</span></div><div className="recap-lists"><div><h2>What you learned</h2><ul>{session.plan.objectives.map(x=><li key={x}><Check size={17}/>{x}</li>)}</ul></div><div><h2>What to review</h2><ul>{session.plan.review.map(x=><li key={x}><ChevronRight size={17}/>{x}</li>)}</ul></div><div><h2>Puzzles solved</h2><ul>{session.plan.rooms.map(x=><li key={x.name}><KeyRound size={16}/><span><strong>{x.puzzle.name}</strong><br/>{x.puzzle.explanation}</span></li>)}</ul></div></div><button className="button primary" onClick={()=>focus("")}>Play another room <ArrowRight size={18}/></button></div></main>}
    
    {(showHelp||showHistory)&&<div className="modal-shade" onClick={()=>{setShowHelp(false);setShowHistory(false);}}><section className="modal global-modal" role="dialog" aria-modal="true" aria-label={showHelp?"How to play":"Adventure journal"} onClick={e=>e.stopPropagation()}><button autoFocus className="icon-button close" aria-label="Close" onClick={()=>{setShowHelp(false);setShowHistory(false);}}><X size={21}/></button>
    {showHelp?<><span className="eyebrow"><Compass size={16}/> FIELD GUIDE</span><h2>How to play</h2><p>Drag to look around. Move with WASD, arrow keys or the on-screen arrows. Inspect glowing markers to find objects.</p><p>Explore the room for records and inspect equipment up close. Use your inventory to review what you discover.</p><p>The hint button reveals one tip at a time. Pause whenever you need a break.</p><button className="button primary" onClick={()=>setShowHelp(false)}><Check size={17}/> Got it</button></>:<><span className="eyebrow"><BookOpen size={16}/> YOUR PROGRESS</span><h2>Adventure journal</h2><p role="status">{historyStatus}</p><div className="journal-list">{history.map(x=><div key={x.id}><strong>{x.title}</strong><span>{x.topic} · {x.progress.complete?"Escaped":x.progress.solved+" solved"}</span></div>)}</div></>}
    </section></div>}
  </>;

  async function sampleOrRestart(){
    if(!session || started.current)return;
    const entry=session;
    setStage("loading");started.current=true;
    let id="";
    const controller=new AbortController();currentRequest.current=controller;
    try {
      const res=await fetch("/api/adventure",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic:entry.topic,plan:entry.plan}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(3500)])});
      if(res.ok)id=(await res.json()).id;
    } catch {}
    if(controller.signal.aborted)return;
    started.current=false;launch({...entry,id});
  }
}
