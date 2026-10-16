/*
 * Explicit no-contact requests must be honored at transport level, before
 * any language model runs. Ordinary sales objections are not permanent opt-outs.
 */
export function isExplicitMonaContactOptOut(message: string): boolean {
  const text = String(message || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!text) return false;
  if (/\b(?:unsubscribe|stop\s+(?:messages?|contacting|messaging|chatting|whatsapp|wa|sms))\b/i.test(text)) return true;
  if (/\b(?:don'?t|do not|please don'?t)\s+(?:contact|message|text|call|whatsapp)\s+me\b/i.test(text)) return true;
  if (/(?:jangan|tidak usah|nggak usah|gak usah|ga usah)\s+(?:lagi\s+)?(?:hubungi|kontak|chat|wa|whatsapp|telepon|telpon|sms|kirim\s+pesan)/i.test(text)) return true;
  if (/(?:jangan|tidak usah|nggak usah|gak usah|ga usah)\s+(?:hubungi|kontak|chat|wa|whatsapp|telepon|telpon|sms|kirim\s+pesan).{0,35}\blagi\b/i.test(text)) return true;
  if (/(?:hapus|delete|remove)\s+(?:nomor|number|kontak).{0,20}(?:saya|aku|me|my)/i.test(text)) return true;
  return false;
}
