import { normalize, type Puzzle } from "./plan";

export function isSolved(puzzle: Puzzle, entries: string[]) {
  if (puzzle.type === "text") {
    return entries.length === 1 && puzzle.solution.some(answer => normalize(answer) === normalize(entries[0]));
  }
  if (puzzle.type === "switches") {
    const active = new Set(entries.map(normalize));
    return active.size === puzzle.solution.length && active.size === entries.length
      && puzzle.solution.every(answer => active.has(normalize(answer)));
  }
  return puzzle.solution.length === entries.length && puzzle.solution.every((answer, i) => normalize(answer) === normalize(entries[i]));
}
