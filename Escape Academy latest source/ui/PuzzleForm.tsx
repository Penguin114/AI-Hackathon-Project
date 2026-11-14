"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Grid2X2 } from "lucide-react";
import { isSolved } from "@/lib/puzzles";
import type { Puzzle } from "@/lib/plan";

export default function PuzzleForm({ puzzle, onSolved }: { puzzle:Puzzle; onSolved:()=>void }) {
  const [entries,setEntries]=useState<string[]>(puzzle.type==="order"?puzzle.options:[]);
  const [error,setError]=useState(false);
  const select=(index:number,value:string)=>{setEntries(previous=>{const next=[...previous];next[index]=value;return next;});setError(false);};
  const move=(index:number,change:number)=>{setEntries(previous=>{const next=[...previous];[next[index],next[index+change]]=[next[index+change],next[index]];return next;});setError(false);};
  return <form className="puzzle-form" onSubmit={e=>{e.preventDefault(); if(isSolved(puzzle,entries))onSolved();else setError(true);}}>
    <p>{puzzle.prompt}</p>
    {puzzle.type==="order" && <ol className="order-list">{entries.map((entry,i)=><li key={entry}><span className="order-num">{i+1}</span><span>{entry}</span><span className="order-actions"><button type="button" aria-label={"Move "+entry+" up"} disabled={i===0} onClick={()=>move(i,-1)}><ArrowUp size={16}/></button><button type="button" aria-label={"Move "+entry+" down"} disabled={i===entries.length-1} onClick={()=>move(i,1)}><ArrowDown size={16}/></button></span></li>)}</ol>}
    {puzzle.type==="match" && <div className="match-list">{puzzle.labels.map((label,i)=><label key={label}>{label}<select required value={entries[i]??""} onChange={e=>select(i,e.target.value)}><option value="">Choose a match</option>{puzzle.options.map(x=><option key={x}>{x}</option>)}</select></label>)}</div>}
    {puzzle.type==="spatial" && <div className="spatial-grid">{puzzle.options.map(x=><button key={x} aria-pressed={entries[0]===x} type="button" onClick={()=>select(0,x)}><Grid2X2 size={18}/>{x}</button>)}</div>}
    {(puzzle.type==="text"||puzzle.type==="code") && <label className="answer-label">{puzzle.type==="code"?"Combination":"Your answer"}<input required maxLength={72} autoComplete="off" inputMode={puzzle.type==="code"?"numeric":"text"} value={entries[0]??""} onChange={e=>select(0,e.target.value)} placeholder={puzzle.type==="code"?"Enter the code":"Type your answer"}/></label>}
    {error&&<p className="inline-error" role="alert">The lock didn’t budge. Check the field notes or try a hint.</p>}
    <button type="submit" className="button primary"><Check size={17}/> Try mechanism</button>
  </form>;
}