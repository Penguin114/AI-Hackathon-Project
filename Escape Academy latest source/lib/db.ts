import type { Adventure } from "./plan";

export type Progress = { room: number; solved: number; hints: number; seconds: number; complete: boolean };
type Insert = { user: string; id: string; topic: string; plan: Adventure };
export interface AcademyStore {
  add(record: Insert): Promise<void>;
  update(user: string, id: string, progress: Progress): Promise<void>;
}
export const initialProgress: Progress = { room: 0, solved: 0, hints: 0, seconds: 0, complete: false };
export const tables = `CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS adventures (
  id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id),
  topic TEXT NOT NULL, title TEXT NOT NULL, plan TEXT NOT NULL,
  progress TEXT NOT NULL, updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS adventures_account ON adventures(account_id, updated DESC);`;
