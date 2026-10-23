"use client";
import { supabase } from "../supabase";
export const THARA_SESSION_KEY = "thara_session_token_v1";
export type BrowserSnapshot = {
  conversation: { id: string; status: string; handoff_status: string; handoff_requested?: boolean } | null;
  messages: { id: string; conversation_id: string; sender_type: "user" | "ai" | "admin"; message_text: string; ai_status: string | null; suggested_action: string | null; suggested_action_label: string | null; created_at: string }[];
  hasOlder?: boolean; cursor?: string | null;
};
export class TharaClientError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function websiteThara(action: "history" | "send" | "handoff", payload: Record<string, unknown> = {}): Promise<BrowserSnapshot> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  let token = localStorage.getItem(THARA_SESSION_KEY);
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  else if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(THARA_SESSION_KEY, token);
  }
  if (token && /^[a-f0-9]{64}$/.test(token)) headers["x-thara-session"] = token;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch("/api/thara", { method: "POST", headers, body: JSON.stringify({ ...payload, action }), signal: controller.signal });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new TharaClientError(response.status, body.error || "Thara is temporarily unavailable.");
    if (!Array.isArray(body.messages) || !(body.conversation === null || typeof body.conversation?.id === "string")) throw new TharaClientError(503, "Unable to load this conversation.");
    // The server verifies account ownership and claims the guest history before returning success.
    if (session?.access_token && token && localStorage.getItem(THARA_SESSION_KEY) === token) localStorage.removeItem(THARA_SESSION_KEY);
    return body;
  } finally { clearTimeout(timeout); }
}
