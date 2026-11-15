import { z } from "zod";
import { setupSchema, validatePlan } from "./plan";
import { prepareAdventure } from "./generate";
import { maxNotesCharacters, maxPdfBase64 } from "./notes";
import type { AcademyStore } from "./db";

const cookie = "academy_guest";
function identify(request: Request, hosted: boolean) {
  if (hosted) {
    const account = request.headers.get("oai-authenticated-user-id");
    if (account) return { account, headers: {} as Record<string,string> };
  }
  const id = request.headers.get("cookie")?.match(/(?:^|;\s*)academy_guest=([0-9a-f-]{36})(?:;|$)/i)?.[1];
  if (id) return { account: id, headers: {} as Record<string,string> };
  const account = crypto.randomUUID();
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return { account, headers: { "Set-Cookie": cookie + "=" + account + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000" + secure } };
}
const progressSchema = z.strictObject({
  id: z.uuid(),
  progress: z.strictObject({
    room: z.number().int().min(0).max(3), solved: z.number().int().min(0).max(4),
    hints: z.number().int().min(0).max(100), seconds: z.number().int().min(0).max(86400), complete: z.boolean(),
  }),
});
const demoSchema = z.strictObject({ topic: z.string().min(2).max(100), plan: z.unknown() });
export async function adventureApi(request: Request, db: AcademyStore, config: { key?: string; model?: string; geminiKey?: string; geminiModel?: string; hosted: boolean }) {
  const { account, headers } = identify(request, config.hosted);
  const reply = (value: unknown, status = 200) => Response.json(value, { status, headers: { ...headers, "Cache-Control": "no-store" } });
  if (request.method === "GET") return reply({ adventures: await db.list(account) });
  const limit = request.method === "POST" ? maxPdfBase64 + maxNotesCharacters * 6 + 3000 : 30_000;
  if(Number(request.headers.get("content-length")) > limit) return reply({ error: "Request is too large." },413);
  const raw = await request.text();
  if (raw.length > limit) return reply({ error: "Request is too large." },413);
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return reply({ error: "Invalid request." },400); }
  if (request.method === "PATCH") {
    const result = progressSchema.safeParse(data);
    if (!result.success) return reply({ error: "Invalid progress." },400);
    await db.update(account,result.data.id,result.data.progress);
    return reply({ saved: true });
  }
  if (request.method === "PUT") {
    const result = demoSchema.safeParse(data);
    if (!result.success) return reply({ error: "Invalid sample." },400);
    let plan;
    try { plan = validatePlan(result.data.plan); } catch { return reply({ error: "Invalid sample plan." },400); }
    const id = crypto.randomUUID();
    await db.add({ user: account,id,topic:result.data.topic,plan });
    return reply({ id });
  }
  if (request.method !== "POST") return reply({ error: "Method unavailable." },405);
  const setup = setupSchema.safeParse(data);
  if (!setup.success) return reply({ error: "Check the topic, world details, difficulty, and duration." },400);
  if (setup.data.notesPdf && !config.geminiKey) return reply({ error: "PDF notes require the Gemini connection. You can also paste the text or attach a Word file." },503);
  if (setup.data.world && !config.geminiKey) return reply({ error: "World Generator needs the Gemini API connection." },503);
  const adventure = await prepareAdventure(setup.data,config.geminiKey || config.key,config.geminiKey ? (config.geminiModel || "gemini-flash-lite-latest") : config.model,Boolean(config.geminiKey));
  if (setup.data.world && adventure.source==="sample") return reply({ error:adventure.notice },502);
  const id = crypto.randomUUID();
  await db.add({ user:account,id,topic:adventure.topic,plan:adventure.plan });
  return reply({ ...adventure,id });
}
