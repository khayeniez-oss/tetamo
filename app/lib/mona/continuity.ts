import type { MonaConversationMemory } from "./memory";
import type { MonaBrainDecision } from "./brain";
import type { MonaSalesGuidance } from "./sales-router";

/*
 * Deterministic continuity and permission boundaries. The AI still decides
 * how to converse; these checks prevent repetitive or unwanted outreach.
 */
export function isReturningGenericMonaEnquiry(
  memory: MonaConversationMemory,
  latestCustomerMessage: string,
  priorRoleQuestion: string | null,
): boolean {
  if (!priorRoleQuestion) return false;
  const latest = latestCustomerMessage.toLowerCase().replace(/\s+/g, " ").trim();
  const generic =
    /^(?:(?:hi|hello|hey|halo|hai|pagi|siang|sore|malam|permisi)[!.,? ]*)?(?:may i (?:know|get|have) (?:the |more )?(?:details?|info|information)|can i (?:get|have) (?:more )?(?:details?|info|information)|(?:boleh|bisa|mau|ingin) (?:minta |tahu |tau |dapat )?(?:info|informasi|detail|penjelasan)(?: lebih lanjut)?|info (?:dong|kak|ya)|tell me more|details? please)[!.,? ]*$/i.test(latest);
  if (!generic) return false;

  const messages = memory.messages;
  const lastMona = [...messages].reverse().find((item) => item.speaker === "Mona");
  if (!lastMona || lastMona.message !== priorRoleQuestion) return false;
  const customerAfter = [...messages].reverse().find((item) =>
    item.speaker === "Customer" &&
    Number.isFinite(Date.parse(item.createdAt)) &&
    Date.parse(item.createdAt) > Date.parse(lastMona.createdAt)
  );
  // The current inbound is normally already in Memory. If not, use the real
  // message processing time rather than assuming a historical reopening.
  const newestTimestamp = customerAfter?.createdAt ?? new Date().toISOString();
  const elapsed = Date.parse(newestTimestamp) - Date.parse(lastMona.createdAt);
  if (!Number.isFinite(elapsed) || elapsed < 24 * 60 * 60 * 1000) return false;

  // Allow one context-aware reconnection, not an endless series of greetings.
  const previousRoleQuestions = messages.filter((item) =>
    item.speaker === "Mona" &&
    /\b(?:agent|agen)\b/i.test(item.message) &&
    /\b(?:owner|pemilik)\b/i.test(item.message) &&
    /\?|boleh tahu|may i know|could you tell/i.test(item.message)
  );
  return previousRoleQuestions.length === 1;
}

export function shouldPauseMonaProactiveFollowUps(message: string): boolean {
  const text = String(message || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!text) return false;
  return (
    /\b(?:not now|not yet|maybe later|i'?ll (?:contact|message|text|let you know|get back to) you|i will (?:contact|message|let you know|get back to) you|i'?m not ready|please wait)\b/i.test(text) ||
    /(?:nanti\s+(?:aja|saja|dulu)|(?:bukan|nggak|gak|ga|tidak)\s+sekarang|(?:pikir|pertimbangkan)\s*(?:-?pikir)?\s+dulu)/i.test(text) ||
    /(?:belum|tidak|nggak|gak|ga)\s+(?:mau|ingin|siap|bisa)\s+(?:bayar|lanjut|daftar|join|sekarang)/i.test(text) ||
    /(?:nanti|kalau sudah|setelah).{0,35}(?:saya|aku|kami).{0,30}(?:kabari|hubungi|kontak|chat|wa|info)/i.test(text) ||
    /(?:saya|aku|kami).{0,15}(?:kabari|hubungi|kontak|chat|wa).{0,20}(?:nanti|lagi|kalau|setelah)/i.test(text) ||
    /(?:bulan depan|minggu depan|besok)\s+(?:aja|saja|ya|dulu)\b/i.test(text) ||
    /(?:diskusi|tanya|bicarakan|runding|cek).{0,25}(?:dulu|suami|istri|partner|bos|keluarga)/i.test(text) ||
    /(?:tunggu|menunggu|nunggu).{0,30}(?:foto|fotografer|suami|istri|partner|persetujuan|gajian)/i.test(text)
  );
}

function normalizedWords(value: string): string[] {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !/^(?:kak|halo|hello|hai|hi|ya|yah|dong|nih|saya|aku|mona)$/.test(word));
}

export function isRepetitiveMonaFollowUp(
  memory: MonaConversationMemory,
  proposed: string,
  followUpNumber: 1 | 2,
): boolean {
  const proposedWords = new Set(normalizedWords(proposed));
  if (proposedWords.size < 3) return false;
  const previous = memory.messages.filter((m) => m.speaker === "Mona").slice(-6);
  for (const item of previous) {
    const previousWords = new Set(normalizedWords(item.message));
    if (previousWords.size < 3) continue;
    const overlap = [...proposedWords].filter((word) => previousWords.has(word)).length;
    const union = new Set([...proposedWords, ...previousWords]).size;
    // A contextual reminder is allowed, a near-copy is not.
    if (overlap >= 4 && overlap / union >= 0.72) return true;
  }

  // After the first reminder about an unanswered role question, a second
  // reminder asking the same thing is not a meaningful sales continuation.
  if (followUpNumber === 2 && previous.some((item) =>
    /\b(?:agent|agen)\b/i.test(item.message) &&
    /\b(?:owner|pemilik)\b/i.test(item.message) &&
    /\?|boleh tahu|may i know|could you tell/i.test(item.message)
  )) {
    return /\b(?:agent|agen)\b/i.test(proposed) &&
      /\b(?:owner|pemilik)\b/i.test(proposed) &&
      /\?|boleh tahu|may i know|could you tell/i.test(proposed);
  }
  return false;
}

export function isTerminalMonaJourney(status?: string | null): boolean {
  return status === "stopped" || status === "resolved";
}

/*
 * Follow-up #2 is considered only for an unresolved, concrete sales step.
 * Qualification here permits an AI review; it never mandates a message.
 * A vague enquiry, completed information answer or missing role is not enough.
 */
export function shouldConsiderMonaSecondFollowUp(params: {
  brain: MonaBrainDecision;
  salesGuidance: MonaSalesGuidance;
  salesStage?: string | null;
}): boolean {
  const { brain, salesGuidance } = params;
  if (
    !brain.understood || brain.handoverRecommended ||
    brain.timingDependency.active || brain.clarification.needed ||
    brain.conversationSituation === "rejection" ||
    brain.conversationSituation === "hesitation"
  ) return false;
  if (!["agent", "agency", "owner"].includes(brain.customerType)) return false;
  const guidance = salesGuidance.guidance;
  if (!guidance || guidance.pressureLevel === "stop") return false;
  if (params.salesStage === "payment_started") return true;
  return (
    (brain.conversationSituation === "payment" || brain.conversationSituation === "closing") &&
    guidance.buyingSignal === "high"
  ) || (
    guidance.buyingSignal === "high" &&
    guidance.recommendedObjective === "move_to_payment"
  );
}
