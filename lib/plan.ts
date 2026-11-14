import { z } from "zod";

const line = (max: number) => z.string().min(1).max(max);
const entry = z.strictObject({ name: line(50), text: line(500) });
export const themes = ["tower", "lab", "archive", "greenhouse"] as const;
export const levels = ["Explorer", "Adventurer", "Expert"] as const;
export const setupSchema = z.strictObject({
  topic: z.string().trim().min(2).max(100),
  notes: z.string().trim().max(12000).optional(),
  level: z.enum(levels),
  minutes: z.union([z.literal(5), z.literal(10), z.literal(15)]),
});
const puzzle = z.strictObject({
  type: z.enum(["order", "match", "code", "text", "spatial"]),
  name: line(55),
  prompt: line(520),
  options: z.array(line(72)).max(6),
  labels: z.array(line(72)).max(6),
  solution: z.array(line(72)).min(1).max(6),
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
});
export const normalize = (value: string) => value.normalize("NFKC").trim().toLowerCase().replace(/[.!?]+$/, "").replace(/\s+/g, " ");
export function validatePlan(value: unknown, minutes?: number) {
  const parsed = adventureSchema.parse(value);
  if (minutes && parsed.rooms.length !== roomCount(minutes)) throw new Error("Unexpected room count");
  if (new Set(parsed.rooms.map(r => r.puzzle.type)).size < 2) throw new Error("Puzzle types must vary");
  for (const { puzzle: p } of parsed.rooms) {
    const unique = (parts: string[]) => new Set(parts.map(normalize)).size === parts.length;
    if (!unique(p.options) || !unique(p.labels) || p.solution.some(x => !normalize(x))) throw new Error("Invalid puzzle entries");
    if (p.type === "order" || p.type === "match") {
      if (p.options.length < 2 || p.solution.length !== p.options.length || !unique(p.solution) || p.solution.some(x => !p.options.includes(x))) throw new Error("Invalid puzzle permutation");
      if (p.type === "match" ? p.labels.length !== p.options.length : p.labels.length !== 0) throw new Error("Invalid matching labels");
      if (p.options.every((x, i) => x === p.solution[i])) throw new Error("Puzzle is already solved");
    } else if (p.type === "spatial") {
      if (p.labels.length || p.options.length !== 4 || p.solution.length !== 1 || !p.options.includes(p.solution[0])) throw new Error("Invalid grid");
    } else {
      if (p.options.length || p.labels.length || (p.type === "code" && (p.solution.length !== 1 || !/^\d{2,8}$/.test(p.solution[0])))) throw new Error("Invalid entry puzzle");
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