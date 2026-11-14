import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { tables, decodeRows, initialProgress, type AcademyStore, type StorageRow } from "./db";

let database: DatabaseSync | undefined;
export function localStore(): AcademyStore {
  if (!database) {
    mkdirSync("data", { recursive: true });
    database = new DatabaseSync("data/academy.sqlite");
    database.exec(tables);
  }
  const db = database;
  return {
    async add({ user, id, topic, plan }) {
      db.prepare("INSERT OR IGNORE INTO accounts (id) VALUES (?)").run(user);
      db.prepare("INSERT INTO adventures (id,account_id,topic,title,plan,progress) VALUES (?,?,?,?,?,?)").run(id,user,topic,plan.title,JSON.stringify(plan),JSON.stringify(initialProgress));
    },
    async update(user,id,progress) {
      db.prepare("UPDATE adventures SET progress=?, updated=STRFTIME('%Y-%m-%d %H:%M:%f','now') WHERE id=? AND account_id=?").run(JSON.stringify(progress),id,user);
    },
    async list(user) {
      return decodeRows(db.prepare("SELECT id,topic,title,progress FROM adventures WHERE account_id=? ORDER BY updated DESC, rowid DESC LIMIT 30").all(user) as StorageRow[]);
    },
  };
}