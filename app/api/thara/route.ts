import { readJson } from "../../../lib/thara/request";
import { randomBytes, createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { guestPrincipal, HttpError, send, type Principal } from "../../../lib/thara/service";
import { databaseStore } from "../../../lib/thara/store";
import { loadKnowledge } from "../../../lib/thara/knowledge";
import { contentSource } from "../../../lib/thara/source";
import { makeConversationalPlanner } from "../../../lib/thara/natural";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
export async function POST(req: Request) {
  try {
    if (process.env.THARA_ENABLED !== "true") throw new HttpError(503, "Thara is not available yet");
    const body = await readJson(req, 12000) as { action?: string; before?: string; request_id: string; message_text?: string; language: "en" | "id" };
    if (!body || !["session", "history", "send", "handoff"].includes(body.action || "")) throw new HttpError(400, "Invalid action");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const rateKey = process.env.THARA_RATE_SECRET;
    // Configure a header overwritten by the trusted edge, never an arbitrary client-supplied IP header.
    const ipHeader = process.env.THARA_TRUSTED_IP_HEADER;
    const ip = ipHeader ? req.headers.get(ipHeader)?.split(",")[0]?.trim() : null;
    if (!url || !key || !rateKey || !ip) throw new HttpError(503, "Chat configuration unavailable");
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const store = databaseStore(db);
    const bucket = createHmac("sha256", rateKey).update(ip).digest("hex");
    const reading = body.action === "history" || body.action === "session";
    if (!await store.rate(`${reading ? "edge-read" : "edge-write"}:${bucket}`, reading ? 1000 : 100)) throw new HttpError(429, "Please wait and try again");
    let principal: Principal;
    const authorization = req.headers.get("authorization");
    if (authorization) {
      const token = /^Bearer (.+)$/.exec(authorization)?.[1];
      if (!token) throw new HttpError(401, "Invalid authentication");
      const { data, error } = await db.auth.getUser(token);
      if (error || !data.user) throw new HttpError(401, "Please log in again");
      principal = { key: `u:${data.user.id}`, userId: data.user.id };
    } else {
      const token = req.headers.get("x-thara-session");
      if (!token && body.action === "session") {
        if (process.env.THARA_RELEASE_MODE !== "public") throw new HttpError(503, "Chat activation is pending");
        return reply({ token: randomBytes(32).toString("hex") });
      }
      principal = guestPrincipal(token || "");
    }
    const mode = process.env.THARA_RELEASE_MODE;
    if (mode !== "canary" && mode !== "public") throw new HttpError(503, "Chat activation is pending");
    if (mode === "canary" && (!principal.userId || !(process.env.THARA_CANARY_USER_IDS || "").split(",").map(v => v.trim()).includes(principal.userId))) throw new HttpError(503, "Chat activation is pending");
    const guestToken = principal.userId ? req.headers.get("x-thara-session") : null;
    if (guestToken) await store.claimGuest?.(principal, guestToken);
    if (reading && !await store.rate(`read:${principal.key}`, 60)) throw new HttpError(429, "Please wait and try again");
    if (body.before && (typeof body.before !== "string" || !/^\d{4}-\d{2}-\d{2}T[^|]{8,40}\|[0-9a-f-]{36}$/.test(body.before) || !Number.isFinite(Date.parse(body.before.split("|")[0])))) throw new HttpError(400, "Invalid history cursor");
    if (body.action === "session" || body.action === "history") return reply(await store.read(principal, body.before));
    if (body.action === "handoff") return reply(await store.handoff(principal));
    if (!process.env.OPENAI_API_KEY) throw new HttpError(503, "Thara is temporarily unavailable");
    return reply(await send(store, principal, { requestId: body.request_id, text: typeof body.message_text === "string" ? body.message_text : "", language: body.language }, () => loadKnowledge(contentSource(db)), makeConversationalPlanner(process.env.OPENAI_API_KEY, process.env.THARA_MODEL || "gpt-4.1-mini")));
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    // No request bodies, contacts, tokens, or database errors in responses/logs.
    return reply({ error: error instanceof HttpError ? error.message : "Unable to complete this request" }, status);
  }
}
