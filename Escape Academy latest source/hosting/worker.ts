import { adventureApi } from "../lib/server";
import { decodeRows, initialProgress, type AcademyStore, type StorageRow } from "../lib/db";
// The build bundles the prerendered Next.js page and its static assets.
import assets from "academy-assets";

type Statement = {
  bind(...values: string[]): Statement;
  run(): Promise<unknown>;
  all<T>(): Promise<{ results: T[] }>;
};
type Env = { DB: { prepare(sql:string):Statement; batch(statements:Statement[]):Promise<unknown> }; OPENAI_API_KEY?: string; OPENAI_MODEL?: string };
function store(db: Env["DB"]): AcademyStore {
  return {
    async add({ user,id,topic,plan }) {
      await db.batch([
        db.prepare("INSERT OR IGNORE INTO accounts (id) VALUES (?)").bind(user),
        db.prepare("INSERT INTO adventures (id,account_id,topic,title,plan,progress) VALUES (?,?,?,?,?,?)").bind(id,user,topic,plan.title,JSON.stringify(plan),JSON.stringify(initialProgress)),
      ]);
    },
    async update(user,id,progress) {
      await db.prepare("UPDATE adventures SET progress=?,updated=STRFTIME('%Y-%m-%d %H:%M:%f','now') WHERE id=? AND account_id=?").bind(JSON.stringify(progress),id,user).run();
    },
    async list(user) {
      const {results} = await db.prepare("SELECT id,topic,title,progress FROM adventures WHERE account_id=? ORDER BY updated DESC, rowid DESC LIMIT 30").bind(user).all<StorageRow>();
      return decodeRows(results);
    },
  };
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/adventure") return adventureApi(request, store(env.DB), {key:env.OPENAI_API_KEY,model:env.OPENAI_MODEL,hosted:true});
    if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method unavailable",{status:405});
    const asset = Object.hasOwn(assets,pathname) ? assets[pathname] : undefined;
    if (!asset) return new Response("Page not found",{status:404});
    const [type, data] = asset;
    const bytes = request.method === "HEAD" ? null : Uint8Array.from(atob(data), x => x.charCodeAt(0));
    return new Response(bytes, { headers: {
      "Content-Type": type,
      "Cache-Control": pathname.startsWith("/_next/static/") ? "public, max-age=31536000, immutable" : "no-cache",
      "X-Content-Type-Options": "nosniff",
    } });
  },
};