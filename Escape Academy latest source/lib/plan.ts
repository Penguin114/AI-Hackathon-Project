import { z } from "zod";
import { maxNotesCharacters, maxPdfBase64 } from "./notes";
import { worldDesignSchema, worldPromptSchema } from "./world-design";

const line = (max: number) => z.string().min(1).max(max);
const entry = z.strictObject({ name: line(50), text: line(500) });
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
  item: entry, use: line(160), puzzle,
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
  for (const { puzzle: p } of parsed.rooms) {
    const unique = (parts: string[]) => new Set(parts.map(normalize)).size === parts.length;
    if (!unique(p.options) || !unique(p.labels) || p.solution.some(x => !normalize(x))) throw new Error("Invalid puzzle entries");
    if (p.type === "order" || p.type === "match") {
      if (p.options.length < 2 || p.options.length > 6 || p.solution.length !== p.options.length || !unique(p.solution) || p.solution.some(x => !p.options.includes(x))) throw new Error("Invalid puzzle permutation");
      if (p.type === "match" ? p.labels.length !== p.options.length : p.labels.length !== 0) throw new Error("Invalid matching labels");
      if (p.options.every((x, i) => x === p.solution[i])) throw new Error("Puzzle is already solved");
    } else if (p.type === "spatial") {
      if (p.labels.length || p.options.length !== 4 || p.solution.length !== 1 || !p.options.includes(p.solution[0])) throw new Error("Invalid grid");
    } else if (p.type === "switches") {
      if (p.labels.length || p.options.length < 4 || p.options.length > 6 || p.solution.length < 2
        || p.solution.length >= p.options.length || !unique(p.solution) || p.solution.some(x => !p.options.includes(x))) {
        throw new Error("Switch puzzles need 4–6 options and at least two correct choices with a distractor");
      }
    } else if (p.type === "route") {
      const path=p.solution.map(tile=>p.options.indexOf(tile));
      if(p.labels.length || p.options.length!==9 || path.length<5 || !unique(p.solution) || path[0]!==0
        || path.at(-1)!==8 || path.slice(1).some((tile,index)=>!adjacentTiles(path[index],tile))) {
        throw new Error("Route puzzles need a continuous 3×3 path from the top left to the bottom right, with no repeated tiles");
      }
    } else {
      if (p.options.length || p.labels.length || p.solution.length > 6 || (p.type === "code" && (p.solution.length !== 1 || !/^\d{2,8}$/.test(p.solution[0])))) throw new Error("Invalid entry puzzle");
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
