import { z } from "zod";
import { maxNotesCharacters, maxPdfBase64 } from "./notes";
import { worldDesignSchema, worldPromptSchema } from "./world-design";

const line = (max: number) => z.string().min(1).max(max);
const entry = z.strictObject({ name: line(50), text: line(500) });
export const stationQuestion = z.strictObject({ prompt: line(300), options: z.array(line(120)).length(3), answer: line(120), explanation: line(300) });
export const stationQuestions = z.array(stationQuestion).length(4);
export const themes = ["tower", "lab", "archive", "greenhouse", "space", "ocean", "city", "alien"] as const;
export const levels = ["Explorer", "Adventurer", "Expert"] as const;
export const timePerRoom = { Explorer:10, Adventurer:7, Expert:5 } as const;
export const setupSchema = z.strictObject({
  topic: z.string().trim().min(2).max(100),
  notes: z.string().trim().max(maxNotesCharacters).optional(),
  notesPdf: z.base64().max(maxPdfBase64).startsWith("JVBERi0").optional(),
  preferredTheme: z.enum(themes).optional(),
  world: worldPromptSchema.optional(),
  level: z.enum(levels),
  minutes: z.union([z.literal(5), z.literal(10), z.literal(15)]),
});
const puzzle = z.strictObject({
  type: z.enum(["order", "match", "code", "text", "spatial", "switches", "route"]),
  name: line(55),
  prompt: line(520),
  options: z.array(line(72)).max(9),
  labels: z.array(line(72)).max(6),
  solution: z.array(line(72)).min(1).max(9),
  explanation: line(460),
  hints: z.array(line(225)).length(3),
});
const room = z.strictObject({
  name: line(55), objective: line(125), clues: z.array(entry).length(2),
  item: entry, use: line(160), puzzle, stationQuestions: stationQuestions.optional(),
});
export const adventureSchema = z.strictObject({
  title: line(65), setting: line(70), premise: line(430), theme: z.enum(themes),
  objectives: z.array(line(150)).min(2).max(4),
  rooms: z.array(room).min(2).max(4),
  review: z.array(line(160)).min(1).max(4),
  worldDesign: worldDesignSchema.optional(),
});
export const normalize = (value: string) => value.normalize("NFKC").trim().toLowerCase().replace(/[.!?]+$/, "").replace(/\s+/g, " ");

export function adjacentTiles(from:number,to:number) {
  return from >= 0 && from < 9 && to >= 0 && to < 9
    && Math.abs(from%3-to%3)+Math.abs(Math.floor(from/3)-Math.floor(to/3))===1;
}

export function validatePlan(value: unknown, minutes?: number) {
  const parsed = adventureSchema.parse(value);
  if (minutes && parsed.rooms.length !== roomCount(minutes)) throw new Error("Unexpected room count");
  if (parsed.worldDesign) {
    const { chambers } = parsed.worldDesign;
    if (chambers.length !== parsed.rooms.length) throw new Error("Provide one chamber design per room");
    if (new Set(chambers.map(chamber => chamber.layout)).size !== chambers.length) throw new Error("Choose a different layout for each room");
    const silhouettes = chambers.map(({ landmark, model }) => {
      if (Boolean(landmark) === Boolean(model)) throw new Error("Provide exactly one landmark design for each room");
      if (!model) return landmark;
      const parts = model.parts.map(({ shape, size, at, rotate }) => JSON.stringify([shape, size, at, rotate]));
      if (new Set(parts).size < 4) throw new Error("Compose each model from at least four different shapes or placements");
      return JSON.stringify(parts.sort());
    });
    if (new Set(silhouettes).size !== chambers.length) throw new Error("Design a different 3D structure for each room");
  }
  if (new Set(parsed.rooms.map(r => r.puzzle.type)).size < 2) throw new Error("Puzzle types must vary");
  for (const [roomIndex, room] of parsed.rooms.entries()) if (room.stationQuestions) {
    for (const [index, question] of room.stationQuestions.entries()) {
      const station=["notes","log","artifact","equipment"][index];
      const options = question.options.map(normalize);
      if (new Set(options).size !== options.length || !options.includes(normalize(question.answer))) throw new Error(`Room ${roomIndex+1} ${station} question must have three distinct options and an answer matching one option`);
    }
  }
  for (const [roomIndex, { puzzle: p }] of parsed.rooms.entries()) {
    const fail=(detail:string):never=>{throw new Error(`Room ${roomIndex+1} ${p.type} puzzle: ${detail}`);};
    const unique = (parts: string[]) => new Set(parts.map(normalize)).size === parts.length;
    for (const [field,entries] of [["options",p.options],["labels",p.labels]] as const) {
      const seen=new Map<string,number>();
      for (const [index,value] of entries.entries()) {
        const key=normalize(value);
        const first=seen.get(key);
        if (first!==undefined) throw new Error(`Room ${roomIndex+1} ${p.type} puzzle has duplicate ${field} at positions ${first+1} and ${index+1}; make each ${field} entry distinct even ignoring case, spacing and trailing punctuation`);
        seen.set(key,index);
      }
    }
    const blankAnswer=p.solution.findIndex(answer=>!normalize(answer));
    if (blankAnswer!==-1) throw new Error(`Room ${roomIndex+1} ${p.type} puzzle has a blank solution at position ${blankAnswer+1}; provide a non-empty answer`);
    if (p.type === "order" || p.type === "match") {
      if (p.options.length < 2 || p.options.length > 6) fail("provide 2–6 options");
      if (p.solution.length !== p.options.length) fail("solution must contain exactly one answer for each option");
      if (!unique(p.solution)) fail("solution must contain each option only once");
      if (p.solution.some(x => !p.options.includes(x))) fail("every solution entry must exactly match an option");
      if (p.type === "match" ? p.labels.length !== p.options.length : p.labels.length !== 0) fail(p.type === "match"?"provide one distinct label for each option":"leave labels empty for an order puzzle");
      if (p.options.every((x, i) => x === p.solution[i])) fail("shuffle the options so they are not already in solution order");
    } else if (p.type === "spatial") {
      if (p.labels.length) fail("leave labels empty");
      if (p.options.length !== 4) fail("provide exactly four options");
      if (p.solution.length !== 1) fail("provide exactly one solution entry");
      if (!p.options.includes(p.solution[0])) fail("the solution must exactly match one of the options");
    } else if (p.type === "switches") {
      if (p.labels.length) fail("leave labels empty");
      if (p.options.length < 4 || p.options.length > 6) fail("provide 4–6 options");
      if (p.solution.length < 2 || p.solution.length >= p.options.length) fail("select at least two correct options and leave at least one distractor");
      if (!unique(p.solution)) fail("do not repeat a solution entry");
      if (p.solution.some(x => !p.options.includes(x))) fail("every solution entry must exactly match an option");
    } else if (p.type === "route") {
      const path=p.solution.map(tile=>p.options.indexOf(tile));
      if(p.labels.length) fail("leave labels empty");
      if(p.options.length!==9) fail("provide exactly nine distinct options in row-major order for a 3×3 grid");
      if(path.length<5) fail("the path must contain at least five tiles");
      if(!unique(p.solution)) fail("the path must not repeat tiles");
      if(path[0]!==0) fail("the path must start at the first option, the top-left tile");
      if(path.at(-1)!==8) fail("the path must end at the ninth option, the bottom-right tile");
      if(path.slice(1).some((tile,index)=>!adjacentTiles(path[index],tile))) fail("each path entry must exactly match an option and consecutive tiles must be horizontally or vertically adjacent");
    } else {
      if (p.options.length) fail("leave options empty");
      if (p.labels.length) fail("leave labels empty");
      if (p.solution.length > 6) fail("provide at most six solution entries");
      if (p.type === "code" && p.solution.length !== 1) fail("provide exactly one solution entry");
      if (p.type === "code" && !/^\d{2,8}$/.test(p.solution[0])) fail("the solution must be one string of 2–8 digits; for a one-digit answer, specify a leading zero in the prompt and code");
    }
  }
  return parsed;
}
export const roomCount = (minutes: number) => minutes === 5 ? 2 : minutes === 15 ? 4 : 3;
export type Setup = z.infer<typeof setupSchema>;
export type Adventure = z.infer<typeof adventureSchema>;
export type Room = Adventure["rooms"][number];
export type Puzzle = Room["puzzle"];
export type Theme = Adventure["theme"];
