export type MonaSafetyAction =
  | "continue"
  | "silent"
  | "handover";

export type MonaSafetyCategory =
  | "none"
  | "reaction"
  | "emoji_only"
  | "sticker"
  | "media"
  | "unreadable"
  | "human_requested"
  | "support"
  | "legal"
  | "custom_proposal"
  | "automatic_business_reply"
  | "admin_takeover"
  | "ai_paused"
  | "blocked"
  | "opt_out"
  | "campaign_event"
  | "system_event"
  | "self_generated";

export type MonaSafetyDecision = {
  action: MonaSafetyAction;
  reason: string;
  category: MonaSafetyCategory;
};

export type MonaSafetyMessage = {
  type?: string | null;
  text?: string | null;

  /*
   * Optional origin metadata.
   *
   * Orchestrator/webhook can supply these once available.
   * They are optional so existing callers remain compatible.
   */
  direction?: string | null;
  source?: string | null;
  aiGenerated?: boolean;
  adminGenerated?: boolean;
  isCampaign?: boolean;
  isSystem?: boolean;
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
  aiPaused?: boolean;
  blocked?: boolean;
  optedOut?: boolean;
};

function normalizeText(
  value?: string | null
) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ");
}

function includesAny(
  text: string,
  patterns: string[]
) {
  return patterns.some(
    (pattern) =>
      text.includes(pattern)
  );
}

function isReaction(
  type?: string | null
) {
  return (
    normalizeText(type) ===
    "reaction"
  );
}

function isSticker(
  type?: string | null
) {
  return (
    normalizeText(type) ===
    "sticker"
  );
}

function isMediaType(
  type?: string | null
) {
  return [
    "image",
    "video",
    "audio",
    "document",
    "location",
    "contacts",
    "contact",
  ].includes(
    normalizeText(type)
  );
}

function isTextLikeType(
  type?: string | null
) {
  const normalized =
    normalizeText(type);

  return (
    !normalized ||
    normalized === "text" ||
    normalized === "button" ||
    normalized === "interactive"
  );
}

function isEmojiOnlyText(
  value?: string | null
) {
  const raw =
    String(value || "").trim();

  if (!raw) {
    return false;
  }

  const remaining = raw
    .replace(
      /[0-9#*]\uFE0F?\u20E3/gu,
      ""
    )
    .replace(
      /\p{Extended_Pictographic}/gu,
      ""
    )
    .replace(
      /\p{Regional_Indicator}/gu,
      ""
    )
    .replace(
      /\p{Emoji_Modifier}/gu,
      ""
    )
    .replace(
      /[\u200D\uFE0E\uFE0F]/gu,
      ""
    )
    .replace(
      /[\s\p{P}]/gu,
      ""
    )
    .trim();

  return remaining.length === 0;
}

/*
 * Deliberately conservative.
 *
 * Slang, abbreviations, broken Indonesian, mixed language,
 * laughter, jargon and unusual spelling must NOT be rejected here.
 *
 * Safety catches only very obvious keyboard-smash / nonsense.
 * Ambiguous language belongs to Brain.
 */
function isObviouslyUnreadable(
  value?: string | null
) {
  const raw =
    String(value || "").trim();

  if (!raw) {
    return false;
  }

  const normalized = raw
    .toLowerCase()
    .replace(
      /[^\p{L}\p{N}\s]/gu,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return false;
  }

  const compact =
    normalized.replace(
      /\s+/g,
      ""
    );

  const latinLetters =
    compact.replace(
      /[^a-z]/g,
      ""
    );

  /*
   * Normal conversational laughter.
   */
  if (
    /^(ha){2,}$|^(he){2,}$|^(hi){2,}$|^(wkwk)+$|^(wk)+$|^(kwk)+$/i.test(
      latinLetters
    )
  ) {
    return false;
  }

  if (
    /(qwerty|asdfg|zxcv|poiuy|lkjhg|asdasd|qazwsx|mnbvc)/i.test(
      compact
    )
  ) {
    return true;
  }

  if (
    latinLetters.length >= 8
  ) {
    const keyboardFragments =
      latinLetters.match(
        /(?:asd|jkl|qwe|zxc|poi|lkj|mnb)/gi
      ) || [];

    if (
      keyboardFragments.length >= 3
    ) {
      return true;
    }
  }

  if (
    latinLetters.length >= 8 &&
    /^([a-z]{1,3})\1{3,}$/i.test(
      latinLetters
    )
  ) {
    return true;
  }

  return false;
}

function isOptOutText(
  text: string
) {
  return (
    /\b(?:stop|unsubscribe)\b/i.test(
      text
    ) ||
    /\bjangan\s+(?:hubungi|chat|wa|contact)\b/i.test(
      text
    ) ||
    /\bhapus\s+nomor\b/i.test(
      text
    ) ||
    /\bdon'?t\s+contact\s+me\b/i.test(
      text
    ) ||
    /\bdo\s+not\s+contact\s+me\b/i.test(
      text
    )
  );
}

function detectExplicitHandover(
  text: string
): MonaSafetyDecision | null {
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
    includesAny(
      text,
      explicitHumanRequest
    ) ||
    text === "cs" ||
    text === "admin please" ||
    text === "admin pls"
  ) {
    return {
      action: "handover",
      reason:
        "Customer explicitly requested human or admin support.",
      category:
        "human_requested",
    };
  }

  /*
   * Narrow support cases only.
   *
   * Ordinary payment progress such as:
   * - sudah bayar
   * - mau bayar
   * - payment failed
   *
   * should continue through Brain/Stage first.
   */
  const humanSupportIssues = [
    "cannot login",
    "can't login",
    "tidak bisa login",
    "gagal login",
    "akun diblokir",
    "account locked",
    "verification rejected",
    "verifikasi ditolak",
    "document rejected",
    "dokumen ditolak",
    "listing rejected",
    "listing ditolak",
    "iklan ditolak",
    "complaint",
    "komplain",
    "keluhan resmi",
  ];

  if (
    includesAny(
      text,
      humanSupportIssues
    )
  ) {
    return {
      action: "handover",
      reason:
        "Customer raised an account, refund, rejection, or formal support issue requiring human review.",
      category: "support",
    };
  }

  const legalIssues = [
    "legal advice",
    "legal issue",
    "lawsuit",
    "court",
    "compliance issue",
    "masalah hukum",
    "gugatan",
    "pengadilan",
  ];

  if (
    includesAny(
      text,
      legalIssues
    )
  ) {
    return {
      action: "handover",
      reason:
        "Legal, compliance, or official company matter requires human review.",
      category: "legal",
    };
  }

  /*
   * Commercial exceptions such as custom packages, enterprise enquiries,
   * bulk listing requests, or unusual negotiated arrangements are NOT
   * Safety decisions.
   *
   * They continue to Brain -> Sales. Sales can recommend human assistance
   * only when the request genuinely falls outside approved products or
   * requires staff action.
   */

  return null;
}

function isRecentCampaign(
  context:
    MonaSafetyCampaignContext,
  hours = 48
) {
  if (!context?.sentAt) {
    return false;
  }

  const sentAt =
    new Date(
      context.sentAt
    ).getTime();

  if (
    !Number.isFinite(sentAt)
  ) {
    return false;
  }

  const age =
    Date.now() - sentAt;

  return (
    age >= 0 &&
    age <=
      hours *
        60 *
        60 *
        1000
  );
}

function looksLikeRealCustomerIntent(
  text: string
) {
  if (
    text.includes("?")
  ) {
    return true;
  }

  return includesAny(
    text,
    [
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
    ]
  );
}

function isLikelyAutomaticBusinessReply(
  message: string,
  campaignContext:
    MonaSafetyCampaignContext
) {
  if (
    !isRecentCampaign(
      campaignContext,
      48
    )
  ) {
    return false;
  }

  const text =
    normalizeText(message);

  if (!text) {
    return false;
  }

  const strongAutomaticReplyPatterns = [
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
  ];

  if (
    includesAny(
      text,
      strongAutomaticReplyPatterns
    )
  ) {
    return true;
  }

  /*
   * Preserve genuine customer questions/intention.
   */
  if (
    looksLikeRealCustomerIntent(
      text
    )
  ) {
    return false;
  }

  return false;
}

/*
 * SAFETY RESPONSIBILITY
 * ---------------------
 *
 * Safety decides whether an inbound event should enter Mona's
 * conversation-processing pipeline.
 *
 * It does NOT:
 * - decide customer role;
 * - decide sales strategy;
 * - choose a package;
 * - write a reply;
 * - calculate follow-up timing;
 * - update CRM stage;
 * - detect database-level duplicate webhook IDs.
 *
 * Duplicate/idempotency checking belongs at the webhook/orchestrator
 * persistence boundary.
 */
export function evaluateMonaSafety(
  params:
    EvaluateMonaSafetyParams
): MonaSafetyDecision {
  const type =
    normalizeText(
      params.message.type
    );

  const text =
    normalizeText(
      params.message.text
    );

  const source =
    normalizeText(
      params.message.source
    );

  const direction =
    normalizeText(
      params.message.direction
    );

  /*
   * Absolute suppression state.
   */
  if (params.blocked) {
    return {
      action: "silent",
      reason:
        "Conversation/contact is blocked.",
      category: "blocked",
    };
  }

  if (
    params.optedOut ||
    isOptOutText(text)
  ) {
    return {
      action: "silent",
      reason:
        "Customer opted out or requested no further contact.",
      category: "opt_out",
    };
  }

  if (
    params.adminTakeover
  ) {
    return {
      action: "silent",
      reason:
        "Conversation is currently controlled by an admin.",
      category:
        "admin_takeover",
    };
  }

  if (params.aiPaused) {
    return {
      action: "silent",
      reason:
        "Mona AI is paused for this conversation.",
      category: "ai_paused",
    };
  }

  /*
   * Never process Tetamo's own generated events as new customer input.
   */
  if (
    params.message
      .aiGenerated === true ||
    params.message
      .adminGenerated === true ||
    direction === "outbound"
  ) {
    return {
      action: "silent",
      reason:
        "Message was generated by Mona, Admin, or Tetamo outbound processing.",
      category:
        "self_generated",
    };
  }

  if (
    params.message
      .isSystem === true ||
    direction === "system" ||
    type === "system" ||
    source === "admin_dashboard"
  ) {
    return {
      action: "silent",
      reason:
        "System event does not require Mona conversation processing.",
      category:
        "system_event",
    };
  }

  if (
    params.message
      .isCampaign === true ||
    source.startsWith(
      "meta_template_"
    ) ||
    source ===
      "admin_meta_template"
  ) {
    return {
      action: "silent",
      reason:
        "Campaign/template event is not a new customer conversational message.",
      category:
        "campaign_event",
    };
  }

  if (isReaction(type)) {
    return {
      action: "silent",
      reason:
        "WhatsApp reaction does not require a Mona reply.",
      category: "reaction",
    };
  }

  if (isSticker(type)) {
    return {
      action: "silent",
      reason:
        "Sticker-only message does not require a full Mona sales response.",
      category: "sticker",
    };
  }

  /*
   * Attachment-only inbound media should not be interpreted as sales intent.
   *
   * If the platform provides a usable caption/text with the media,
   * allow Brain to interpret that text normally.
   */
  if (
    isMediaType(type) &&
    !text
  ) {
    return {
      action: "silent",
      reason:
        "Attachment-only message has no usable text for Mona to interpret safely.",
      category: "media",
    };
  }

  if (
    isEmojiOnlyText(text)
  ) {
    return {
      action: "silent",
      reason:
        "Emoji-only message does not contain enough conversational meaning.",
      category:
        "emoji_only",
    };
  }

  if (
    isObviouslyUnreadable(text)
  ) {
    return {
      action: "continue",
      reason:
        "Message appears unreadable, but Brain must receive it so the one-clarification rule can be applied before any human handover.",
      category:
        "unreadable",
    };
  }

  const explicitHandover =
    detectExplicitHandover(
      text
    );

  if (explicitHandover) {
    return explicitHandover;
  }

  if (
    isLikelyAutomaticBusinessReply(
      text,
      params.campaignContext ||
        null
    )
  ) {
    return {
      action: "silent",
      reason:
        "Likely automatic business greeting or away reply to a recent Tetamo campaign.",
      category:
        "automatic_business_reply",
    };
  }

  /*
   * Unknown-but-valid text should reach Brain.
   *
   * Safety should not reject slang, short replies, broken language,
   * payment statements, or unusual phrasing merely because Safety
   * cannot interpret them.
   */
  if (
    text ||
    isTextLikeType(type) ||
    (
      isMediaType(type) &&
      Boolean(text)
    )
  ) {
    return {
      action: "continue",
      reason: "",
      category: "none",
    };
  }

  return {
    action: "silent",
    reason:
      "Inbound event contains no usable conversational content.",
    category: "none",
  };
}

