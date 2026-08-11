export type MonaSafetyAction = "continue" | "silent" | "handover";

export type MonaSafetyDecision = {
  action: MonaSafetyAction;
  reason: string;
  category:
    | "none"
    | "reaction"
    | "emoji_only"
    | "media"
    | "unreadable"
    | "human_requested"
    | "support"
    | "legal"
    | "custom_proposal"
    | "automatic_business_reply"
    | "admin_takeover";
};

export type MonaSafetyMessage = {
  type?: string | null;
  text?: string | null;
};

export type MonaSafetyCampaignContext = {
  templateName?: string | null;
  templateLanguage?: string | null;
  templateCategory?: string | null;
  sendType?: string | null;
  sentAt?: string | null;
} | null;

type EvaluateMonaSafetyParams = {
  message: MonaSafetyMessage;
  campaignContext?: MonaSafetyCampaignContext;
  adminTakeover?: boolean;
};

function normalizeText(value?: string | null) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ");
}

function includesAny(text: string, patterns: string[]) {
  return patterns.some((pattern) => text.includes(pattern));
}

function isReaction(type?: string | null) {
  return normalizeText(type) === "reaction";
}

function isMediaOrUnsupported(type?: string | null) {
  return [
    "image",
    "video",
    "audio",
    "document",
    "sticker",
    "location",
    "contacts",
    "contact",
  ].includes(normalizeText(type));
}

function isEmojiOnlyText(value?: string | null) {
  const raw = String(value || "").trim();

  if (!raw) return false;

  const remaining = raw
    .replace(/[0-9#*]\uFE0F?\u20E3/gu, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\p{Regional_Indicator}/gu, "")
    .replace(/\p{Emoji_Modifier}/gu, "")
    .replace(/[\u200D\uFE0E\uFE0F]/gu, "")
    .replace(/[\s\p{P}]/gu, "")
    .trim();

  return remaining.length === 0;
}

/**
 * Deliberately conservative.
 *
 * Slang, abbreviations, broken Indonesian, mixed language, laughter,
 * jargon and unusual spelling must NOT be rejected here.
 *
 * This only catches obvious keyboard-smash / nonsense patterns.
 * Ambiguous language is left for Mona's OpenAI understanding layer.
 */
function isObviouslyUnreadable(value?: string | null) {
  const raw = String(value || "").trim();

  if (!raw) return false;

  const normalized = raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return false;

  const compact = normalized.replace(/\s+/g, "");
  const latinLetters = compact.replace(/[^a-z]/g, "");

  // Normal laughter / conversational noise should reach Mona.
  if (
    /^(ha){2,}$|^(he){2,}$|^(hi){2,}$|^(wkwk)+$|^(wk)+$|^(kwk)+$/i.test(
      latinLetters
    )
  ) {
    return false;
  }

  // Obvious keyboard patterns.
  if (
    /(qwerty|asdfg|zxcv|poiuy|lkjhg|asdasd|qazwsx|mnbvc)/i.test(compact)
  ) {
    return true;
  }

  // Multiple keyboard-smash fragments in one otherwise meaningless token.
  // Example: asdjklqwezx
  if (latinLetters.length >= 8) {
    const keyboardFragments =
      latinLetters.match(/(?:asd|jkl|qwe|zxc|poi|lkj|mnb)/gi) || [];

    if (keyboardFragments.length >= 3) {
      return true;
    }
  }

  // Extremely long repeated nonsense token.
  if (
    latinLetters.length >= 8 &&
    /^([a-z]{1,3})\1{3,}$/i.test(latinLetters)
  ) {
    return true;
  }

  return false;
}

function detectExplicitHandover(text: string): MonaSafetyDecision | null {
  const explicitHumanRequest = [
    "sambungkan ke admin",
    "hubungkan ke admin",
    "mau bicara dengan admin",
    "ingin bicara dengan admin",
    "saya mau bicara dengan admin",
    "saya ingin bicara dengan admin",
    "mau ngomong sama admin",
    "ingin ngomong sama admin",
    "hubungi admin",
    "tolong hubungi admin",
    "minta admin",
    "minta dihubungi admin",
    "admin hubungi saya",
    "bicara dengan manusia",
    "bicara dengan orang",
    "orang asli",
    "orang beneran",
    "customer service",
    "speak to human",
    "speak to a human",
    "speak to someone",
    "real person",
    "connect me to admin",
    "connect me to a human",
    "connect me to support",
    "talk to admin",
    "talk to a human",
    "human support",
  ];

  if (
    includesAny(text, explicitHumanRequest) ||
    text === "cs" ||
    text === "admin please" ||
    text === "admin pls"
  ) {
    return {
      action: "handover",
      reason: "Customer explicitly requested human or admin support",
      category: "human_requested",
    };
  }

  const supportIssues = [
    "i already paid",
    "already paid",
    "payment failed",
    "payment problem",
    "paid but",
    "payment not active",
    "invoice issue",
    "receipt issue",
    "account problem",
    "account issue",
    "cannot login",
    "can't login",
    "refund",
    "complaint",
    "verification rejected",
    "document rejected",
    "verification problem",
    "sudah bayar",
    "saya sudah bayar",
    "sudah transfer",
    "sudah bayar tapi",
    "pembayaran gagal",
    "masalah pembayaran",
    "paket belum aktif",
    "iklan belum aktif",
    "bukti bayar",
    "akun bermasalah",
    "masalah akun",
    "tidak bisa login",
    "gagal login",
    "komplain",
    "keluhan",
    "pengembalian dana",
    "uang kembali",
    "verifikasi ditolak",
    "dokumen ditolak",
    "ktp bermasalah",
    "sertifikat bermasalah",
    "masalah verifikasi",
    "listing ditolak",
    "iklan ditolak",
  ];

  if (includesAny(text, supportIssues)) {
    return {
      action: "handover",
      reason: "Payment, refund, verification, complaint, or account support issue",
      category: "support",
    };
  }

  const legalIssues = [
    "legal advice",
    "legal issue",
    "lawsuit",
    "court",
    "notaris",
    "ppat",
    "tax issue",
    "government registration",
    "compliance issue",
    "masalah hukum",
    "gugatan",
    "pengadilan",
    "izin usaha",
    "legalitas perusahaan",
  ];

  if (includesAny(text, legalIssues)) {
    return {
      action: "handover",
      reason: "Legal, compliance, or official company matter",
      category: "legal",
    };
  }

  const customProposalIssues = [
    "custom package",
    "special package",
    "paket khusus",
    "custom quotation",
    "custom quote",
    "proposal khusus",
    "kerja sama khusus",
    "enterprise",
    "bulk listing",
    "bulk upload",
  ];

  if (includesAny(text, customProposalIssues)) {
    return {
      action: "handover",
      reason: "Custom package or proposal inquiry",
      category: "custom_proposal",
    };
  }

  return null;
}

function isRecentCampaign(
  context: MonaSafetyCampaignContext,
  hours = 48
) {
  if (!context?.sentAt) return false;

  const age = Date.now() - new Date(context.sentAt).getTime();

  return (
    Number.isFinite(age) &&
    age >= 0 &&
    age <= hours * 60 * 60 * 1000
  );
}

function looksLikeRealCustomerIntent(text: string) {
  if (text.includes("?")) return true;

  return includesAny(text, [
    "tetamo",
    "harga",
    "harganya",
    "berapa",
    "brp",
    "biaya",
    "paket",
    "membership",
    "listing",
    "properti",
    "property",
    "rumah",
    "villa",
    "apartemen",
    "tanah",
    "agen",
    "agent",
    "owner",
    "pemilik",
    "developer",
    "agency",
    "jual",
    "sewa",
    "beli",
    "bayar",
    "payment",
    "qris",
    "checkout",
    "daftar",
    "register",
    "join",
    "gabung",
    "minat",
    "tertarik",
    "info",
    "informasi",
    "fitur",
    "cara",
    "gimana",
    "gmn",
    "dibantu",
    "bantu saya",
    "mau tahu",
    "ingin tahu",
    "lebih lanjut",
    "how much",
    "tell me more",
    "more information",
    "interested",
    "want to join",
    "want to register",
    "want to list",
    "want to buy",
    "want to rent",
    "can you help",
    "please explain",
  ]);
}

function isLikelyAutomaticBusinessReply(
  message: string,
  campaignContext: MonaSafetyCampaignContext
) {
  if (!isRecentCampaign(campaignContext, 48)) return false;

  const text = normalizeText(message);

  if (!text) return false;

  // Never suppress something that looks like a genuine customer question/intention.
  if (looksLikeRealCustomerIntent(text)) return false;

  const exactReplies = new Set([
    "thank you",
    "thanks",
    "thankyou",
    "terima kasih",
    "trimakasih",
    "makasih",
    "hi thank you",
    "hi thanks",
    "hello thank you",
    "hello thanks",
    "halo thank you",
    "halo thanks",
    "hi terima kasih",
    "hello terima kasih",
    "halo terima kasih",
    "hello saya",
    "hi saya",
    "halo saya",
  ]);

  if (exactReplies.has(text)) return true;

  return includesAny(text, [
    "thank you for contacting",
    "thanks for contacting",
    "thank you for reaching out",
    "thanks for reaching out",
    "thank you for your message",
    "thanks for your message",
    "please let us know how we can help",
    "we have received your message",
    "your message has been received",
    "we will get back to you",
    "we will reply as soon as possible",
    "we are currently away",
    "we are currently unavailable",
    "our business hours",
    "office hours",
    "out of office",
    "automatic reply",
    "automated reply",
    "terima kasih telah menghubungi",
    "terima kasih sudah menghubungi",
    "terima kasih atas pesan anda",
    "pesan anda telah kami terima",
    "pesan anda sudah kami terima",
    "kami telah menerima pesan anda",
    "kami akan segera membalas",
    "kami akan membalas secepatnya",
    "kami akan menghubungi kembali",
    "admin akan segera membalas",
    "tim kami akan segera membalas",
    "saat ini kami sedang tidak tersedia",
    "saat ini kami belum tersedia",
    "saat ini kami sedang tutup",
    "kami sedang offline",
    "di luar jam operasional",
    "jam operasional kami",
    "pesan otomatis",
    "balasan otomatis",
  ]);
}

export function evaluateMonaSafety(
  params: EvaluateMonaSafetyParams
): MonaSafetyDecision {
  const type = normalizeText(params.message.type);
  const text = normalizeText(params.message.text);

  if (params.adminTakeover) {
    return {
      action: "silent",
      reason: "Conversation is currently controlled by an admin",
      category: "admin_takeover",
    };
  }

  if (isReaction(type)) {
    return {
      action: "silent",
      reason: "WhatsApp reaction does not require a Mona reply",
      category: "reaction",
    };
  }

  if (isMediaOrUnsupported(type)) {
    return {
      action: "handover",
      reason: "Media or unsupported WhatsApp content requires admin review",
      category: "media",
    };
  }

  if (isEmojiOnlyText(text)) {
    return {
      action: "silent",
      reason: "Emoji-only message does not contain enough conversational meaning",
      category: "emoji_only",
    };
  }

  if (isObviouslyUnreadable(text)) {
    return {
      action: "handover",
      reason: "Message is obviously unreadable and requires admin review",
      category: "unreadable",
    };
  }

  const explicitHandover = detectExplicitHandover(text);

  if (explicitHandover) {
    return explicitHandover;
  }

  if (isLikelyAutomaticBusinessReply(text, params.campaignContext || null)) {
    return {
      action: "silent",
      reason: "Likely automatic business reply to a recent Tetamo campaign",
      category: "automatic_business_reply",
    };
  }

  return {
    action: "continue",
    reason: "",
    category: "none",
  };
}
