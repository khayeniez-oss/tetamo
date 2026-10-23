import { createHash, randomUUID } from "node:crypto";
import { answer } from "./engine";
import type { Knowledge, Language, Memory, Message, Planner } from "./types";
export class HttpError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
export type Principal = { key: string; userId: string | null };
export type Snapshot = { conversation: { id: string; handoff_status: string; status: string } | null; messages: Message[]; hasOlder?: boolean; cursor?: string | null };
export interface Store {
  claimGuest?(p: Principal, token: string): Promise<void>;
  rate(key: string, limit: number): Promise<boolean>;
  read(p: Principal, before?: string): Promise<Snapshot>;
  handoff(p: Principal): Promise<Snapshot>;
  begin(p: Principal, requestId: string, text: string, language: Language, lease: string): Promise<{ state: string; history: Message[]; memory?: Memory }>;
  finish(p: Principal, requestId: string, lease: string, reply: string | null, handoff: boolean, version: string, memory?: Memory): Promise<void>;
}
export function guestPrincipal(token: string): Principal {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new HttpError(401, "Invalid session");
  return { key: `g:${createHash("sha256").update(token).digest("hex")}`, userId: null };
}
export async function send(store: Store, principal: Principal, input: { requestId: string; text: string; language: Language }, load: () => Promise<Knowledge>, planner: Planner): Promise<Snapshot> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(input.requestId) || !input.text.trim() || input.text.length > 2000 || !["en", "id"].includes(input.language)) throw new HttpError(400, "Invalid message");
  if (!await store.rate(`send:${principal.key}`, 12)) throw new HttpError(429, "Please wait before sending another message");
  const lease = randomUUID();
  const job = await store.begin(principal, input.requestId, input.text.trim(), input.language, lease);
  if (job.state === "busy") throw new HttpError(409, "A reply is still being prepared. Retry this message shortly.");
  if (job.state !== "ready") return store.read(principal);
  try {
    const knowledge = await load();
    const result = await answer(input.text, input.language, job.history, knowledge, planner, job.memory);
    await store.finish(principal, input.requestId, lease, result.text, Boolean(result.suggestedAction), result.knowledgeVersion, result.memory);
  } catch {
    await store.finish(principal, input.requestId, lease, null, false, "");
    throw new HttpError(503, "Thara is temporarily unavailable. Retry your message shortly.");
  }
  return store.read(principal);
}
