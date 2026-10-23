import { confirmedRole, statedListingCount } from "./role";
import type { SupabaseClient } from "@supabase/supabase-js";
import { guestPrincipal, HttpError, type Principal, type Snapshot, type Store } from "./service";
export function databaseStore(db: SupabaseClient): Store {
  async function rpc(name: string, args: Record<string, unknown>) {
    const { data, error } = await db.rpc(name, args);
    if (error?.code === "28000") throw new HttpError(401, "This guest session has moved to a signed-in account");
    if (error) throw new HttpError(503, "Chat storage is unavailable");
    return data;
  }
  const actor = (p: Principal) => ({ p_principal: p.key, p_user_id: p.userId });
  return {
    async claimGuest(p, token) { if (!p.userId) throw new HttpError(401, "Login required"); await rpc("thara_claim_guest", { p_guest_principal: guestPrincipal(token).key, p_user_id: p.userId }); },
    rate: (key, limit) => rpc("thara_rate", { p_key: key, p_limit: limit }),
    read: (p, before) => rpc("thara_snapshot", { ...actor(p), p_before_time: before?.split("|")[0] || null, p_before_id: before?.split("|")[1] || null }) as Promise<Snapshot>,
    async handoff(p) { if (!p.userId) throw new HttpError(401, "Please log in for human assistance"); await rpc("thara_handoff", actor(p)); return this.read(p); },
    async begin(p, requestId, text, language, lease) {
      const job = await rpc("thara_begin", { ...actor(p), p_request_id: requestId, p_text: text, p_language: language, p_lease: lease, p_confirmed_role: confirmedRole(text) });
      if (job.state !== "ready" || confirmedRole(text) !== null) return job;
      // Legacy customer messages may predate session memory or its 24-turn AI window.
      // Read only customer evidence, newest first, and persist it before generation.
      let before: { created_at: string; id: string } | undefined;
      let count: number | null = null;
      for (let scanned = 0; scanned < 20000; scanned += 100) {
        const rows = await rpc("thara_role_history", { ...actor(p), p_before_time: before?.created_at || null, p_before_id: before?.id || null }) as { id: string; message_text: string; created_at: string }[];
        for (const message of rows) {
          count ??= statedListingCount(message.message_text);
          const role = confirmedRole(message.message_text);
          if (role !== null) {
            job.memory = await rpc("thara_remember_role", { ...actor(p), p_message_id: message.id, p_role: role, p_count: count });
            return job;
          }
        }
        if (rows.length < 100) return job;
        before = rows.at(-1);
      }
      throw new HttpError(503, "Conversation context is temporarily unavailable");
    },
    finish: (p, requestId, lease, reply, handoff, version, memory) => rpc("thara_finish", { ...actor(p), p_request_id: requestId, p_lease: lease, p_reply: reply, p_handoff: handoff, p_version: version, p_memory: memory || null }),
  };
}
