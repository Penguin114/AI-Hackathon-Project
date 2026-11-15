"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Grid2X2, Undo2 } from "lucide-react";
import { isSolved } from "@/lib/puzzles";
import { adjacentTiles, type Puzzle } from "@/lib/plan";

const instructions:Record<Puzzle["type"],string>={
  order:"Use the arrows to reorder the entries from top to bottom, then submit.",
  match:"Choose one match for each description. Use each option once.",
  spatial:"Select one position on the grid, then submit.",
  text:"Enter a short answer based on the clues you found.",
  code:"Enter the digits in order without spaces.",
  switches:"Turn on every switch that fits the rule.",
  route:"Build a path from Start to Exit. Move one square at a time, up, down, left, or right.",
};

type Props = { puzzle:Puzzle; draft:string[]|null; onChange:(entries:string[])=>void; onSolved:()=>void };

export default function PuzzleForm({ puzzle, draft, onChange, onSolved }: Props) {
  const entries=draft??(puzzle.type==="order"?puzzle.options:puzzle.type==="route"?[puzzle.options[0]]:[]);
  const [error,setError]=useState(false);
  function update(next:string[]) {
    onChange(next);
    setError(false);
  }
  const select=(index:number,value:string)=>{const next=[...entries];next[index]=value;update(next);};
  const move=(index:number,change:number)=>{const next=[...entries];[next[index],next[index+change]]=[next[index+change],next[index]];update(next);};
  const lastTile=puzzle.type==="route"?puzzle.options.indexOf(entries.at(-1)??""):-1;
  const canSubmit=puzzle.type==="route"?lastTile===8:puzzle.type==="switches"?entries.length>0:true;
  return <form className="puzzle-form" onSubmit={e=>{e.preventDefault(); if(isSolved(puzzle,entries))onSolved();else setError(true);}}>
    <p>{puzzle.prompt}</p>
    <p className="puzzle-instructions">{instructions[puzzle.type]}</p>
    {puzzle.type==="order" && <ol className="order-list">{entries.map((entry,i)=><li key={entry}><span className="order-num">{i+1}</span><span>{entry}</span><span className="order-actions"><button type="button" aria-label={"Move "+entry+" up"} disabled={i===0} onClick={()=>move(i,-1)}><ArrowUp size={16}/></button><button type="button" aria-label={"Move "+entry+" down"} disabled={i===entries.length-1} onClick={()=>move(i,1)}><ArrowDown size={16}/></button></span></li>)}</ol>}
    {puzzle.type==="match" && <div className="match-list">{puzzle.labels.map((label,i)=><label key={label}>{label}<select aria-label={label} required value={entries[i]??""} onChange={e=>select(i,e.target.value)}><option value="">Choose a match</option>{puzzle.options.map(x=><option key={x}>{x}</option>)}</select></label>)}</div>}
    {puzzle.type==="spatial" && <div className="spatial-grid">{[...puzzle.options].sort((a,b)=>["NW","NE","SW","SE"].indexOf(a)-["NW","NE","SW","SE"].indexOf(b)).map(x=><button key={x} aria-pressed={entries[0]===x} type="button" onClick={()=>select(0,x)}><Grid2X2 size={18}/>{x}</button>)}</div>}
    {puzzle.type==="switches"&&<div className="puzzle-switches" role="group" aria-label="Switch panel">
      {puzzle.options.map(option=>{
        const active=entries.includes(option);
        return <button key={option} type="button" aria-pressed={active}
          onClick={()=>update(active?entries.filter(entry=>entry!==option):[...entries,option])}>
          <span className="switch-indicator" aria-hidden="true"/><span>{option}</span>
        </button>;
      })}
    </div>}
    {puzzle.type==="route"&&<>
      <div className="route-grid" role="group" aria-label="Route grid">
        {puzzle.options.map((tile,index)=>{
          const step=entries.indexOf(tile);
          const canExtend=lastTile!==8&&step<0&&adjacentTiles(lastTile,index);
          const endpoint=index===0?"Start":index===8?"Exit":null;
          return <button key={tile} type="button" disabled={!canExtend} aria-pressed={step>=0}
            onClick={()=>update([...entries,tile])}>
            {(endpoint||step>=0)&&<span className="route-step">{endpoint||step+1}</span>}
            <span>{tile}</span>
          </button>;
        })}
      </div>
      <button type="button" className="text-button undo-route" disabled={entries.length<=1} onClick={()=>update(entries.slice(0,-1))}><Undo2 size={16}/> Undo last step</button>
    </>}
    {(puzzle.type==="text"||puzzle.type==="code") && <label className="answer-label">{puzzle.type==="code"?"Combination":"Your answer"}<input required pattern={puzzle.type==="code"?"[0-9]{2,8}":undefined} maxLength={puzzle.type==="code"?8:72} autoComplete="off" inputMode={puzzle.type==="code"?"numeric":"text"} value={entries[0]??""} onChange={e=>select(0,e.target.value)} placeholder={puzzle.type==="code"?"Enter the code":"Type your answer"}/></label>}
    {error&&<p className="inline-error" role="alert">The lock didn’t budge. Check the field notes or try a hint.</p>}
    <button type="submit" className="button primary" disabled={!canSubmit}><Check size={17}/> Try mechanism</button>
  </form>;
}
