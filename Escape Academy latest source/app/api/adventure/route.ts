import { adventureApi } from "@/lib/server";
import { localStore } from "@/lib/db-local";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const handler = (request: Request) => adventureApi(request,localStore(), {
  geminiKey: process.env.GEMINI_API_KEY, geminiModel: process.env.GEMINI_MODEL, key: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL, hosted:false,
});
export { handler as POST, handler as PATCH, handler as PUT };
