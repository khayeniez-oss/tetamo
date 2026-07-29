export type MonaConversationAction =
  | "reply"
  | "ignore"
  | "handover";

export type MonaConversationIntent =
  | "question"
  | "greeting"
  | "acknowledgement"
  | "automatic_reply"
  | "unsubscribe"
  | "human_support"
  | "complaint"
  | "abuse"
  | "media"
  | "unknown";

export type MonaConversationSource =
  | "organic"
  | "campaign"
  | "advertisement"
  | "support"
  | "unknown";

export type MonaCampaignContext = {
  campaignId?: string | null;
  recipientId?: string | null;
  templateName?: string | null;
  templateLanguage?: string | null;
  templateCategory?: string | null;
  sendType?: string | null;
};

export type MonaConversationEngineInput = {
  customerMessage: string;
  messageType?: string | null;

  conversationId?: string | null;
  customerPhone?: string | null;

  source?: MonaConversationSource;
  campaignContext?: MonaCampaignContext | null;

  isBlocked?: boolean;
  aiEnabled?: boolean;
  handoverToAdmin?: boolean;
};

export type MonaConversationDecision = {
  action: MonaConversationAction;
  intent: MonaConversationIntent;
  source: MonaConversationSource;
  confidence: number;
  reason: string;

  shouldGenerateReply: boolean;
  shouldHandover: boolean;

  campaignContext: MonaCampaignContext | null;

  promptContext: {
    source: MonaConversationSource;
    intent: MonaConversationIntent;
    campaignTemplateName: string | null;
    campaignTemplateCategory: string | null;
    campaignSendType: string | null;
  };
};

function normalizeText(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isNonTextMessage(messageType?: string | null) {
  const type = normalizeText(messageType);

  if (!type) {
    return false;
  }

  return type !== "text";
}

function matchesAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function isAutomaticBusinessReply(text: string) {
  return matchesAny(text, [
    /thank you for contacting/i,
    /thanks for contacting/i,
    /we have received your message/i,
    /we received your message/i,
    /we will get back to you/i,
    /we'll get back to you/i,
    /we are currently unavailable/i,
    /we're currently unavailable/i,
    /our business hours/i,
    /outside.*business hours/i,
    /this is an automated message/i,
    /automated response/i,
    /auto.?reply/i,
    /pesan otomatis/i,
    /terima kasih telah menghubungi/i,
    /kami telah menerima pesan/i,
    /kami akan segera menghubungi/i,
    /kami sedang tidak tersedia/i,
    /jam operasional kami/i,
  ]);
}

function isAcknowledgement(text: string) {
  return matchesAny(text, [
    /^(ok|okay|oke|okey)$/i,
    /^(noted|noted thanks)$/i,
    /^(thanks|thank you|thankyou)$/i,
    /^(thank you very much|thanks a lot)$/i,
    /^(terima kasih|makasih|trimakasih|tks|thx)$/i,
    /^(baik|baiklah|siap|sip)$/i,
    /^(ya|iya|yes|yep|yup)$/i,
    /^(understood|got it)$/i,
    /^(received)$/i,
    /^(👍|🙏|👌|✅)$/u,
  ]);
}

function isUnsubscribeRequest(text: string) {
  return matchesAny(text, [
    /\bstop\b/i,
    /\bunsubscribe\b/i,
    /\bremove me\b/i,
    /\bopt me out\b/i,
    /\bdo not contact\b/i,
    /\bdon't contact\b/i,
    /\bdo not message\b/i,
    /\bdon't message\b/i,
    /\bberhenti\b/i,
    /\bjangan hubungi\b/i,
    /\bjangan kirim pesan\b/i,
    /\bhapus nomor saya\b/i,
    /\bkeluarkan saya\b/i,
  ]);
}

function isHumanSupportRequest(text: string) {
  return matchesAny(text, [
    /\bhuman\b/i,
    /\breal person\b/i,
    /\breal agent\b/i,
    /\bcustomer service\b/i,
    /\bsupport team\b/i,
    /\bspeak to someone\b/i,
    /\btalk to someone\b/i,
    /\badmin\b/i,
    /\boperator\b/i,
    /\bmanusia\b/i,
    /\borang asli\b/i,
    /\bagen manusia\b/i,
    /\btim support\b/i,
    /\btim bantuan\b/i,
    /\bbicara dengan admin\b/i,
    /\bhubungi admin\b/i,
  ]);
}

function isComplaintOrScamAccusation(text: string) {
  return matchesAny(text, [
    /\bscam\b/i,
    /\bscammer\b/i,
    /\bfraud\b/i,
    /\bfake company\b/i,
    /\bpenipu\b/i,
    /\bpenipuan\b/i,
    /\bbohong\b/i,
    /\bpalsu\b/i,
    /\bcomplaint\b/i,
    /\bcomplain\b/i,
    /\bkeluhan\b/i,
    /\bkecewa\b/i,
    /\bterrible service\b/i,
    /\bbad service\b/i,
    /\bpelayanan buruk\b/i,
  ]);
}

function isAbusiveMessage(text: string) {
  return matchesAny(text, [
    /\bfuck\b/i,
    /\bfucking\b/i,
    /\bshit\b/i,
    /\bbitch\b/i,
    /\basshole\b/i,
    /\bstupid\b/i,
    /\bidiot\b/i,
    /\bbodoh\b/i,
    /\bbangsat\b/i,
    /\bbrengsek\b/i,
    /\bkontol\b/i,
    /\bmemek\b/i,
    /\banjing\b/i,
    /\bbabi\b/i,
  ]);
}

function isGreeting(text: string) {
  return matchesAny(text, [
    /^(hi|hello|hey|good morning|good afternoon|good evening)$/i,
    /^(halo|hai|selamat pagi|selamat siang|selamat sore|selamat malam)$/i,
    /^(assalamualaikum|salam)$/i,
  ]);
}

function looksLikeQuestion(text: string) {
  return (
    text.includes("?") ||
    matchesAny(text, [
      /^(how|what|when|where|why|who|which|can|could|would|do|does|is|are)\b/i,
      /^(bagaimana|apa|kapan|dimana|di mana|kenapa|mengapa|siapa|berapa|bisa|boleh|apakah)\b/i,
      /\bhow much\b/i,
      /\bberapa harga\b/i,
      /\bberapa biaya\b/i,
      /\bhow can i\b/i,
      /\bcaranya\b/i,
      /\bmore info\b/i,
      /\binformasi lebih lanjut\b/i,
      /\binterested\b/i,
      /\btertarik\b/i,
    ])
  );
}

function resolveSource(
  input: MonaConversationEngineInput
): MonaConversationSource {
  if (input.campaignContext?.campaignId) {
    return "campaign";
  }

  return input.source || "unknown";
}

function createDecision(params: {
  action: MonaConversationAction;
  intent: MonaConversationIntent;
  source: MonaConversationSource;
  confidence: number;
  reason: string;
  campaignContext?: MonaCampaignContext | null;
}): MonaConversationDecision {
  const campaignContext = params.campaignContext || null;

  return {
    action: params.action,
    intent: params.intent,
    source: params.source,
    confidence: params.confidence,
    reason: params.reason,

    shouldGenerateReply: params.action === "reply",
    shouldHandover: params.action === "handover",

    campaignContext,

    promptContext: {
      source: params.source,
      intent: params.intent,
      campaignTemplateName:
        campaignContext?.templateName || null,
      campaignTemplateCategory:
        campaignContext?.templateCategory || null,
      campaignSendType:
        campaignContext?.sendType || null,
    },
  };
}

export function runMonaConversationEngine(
  input: MonaConversationEngineInput
): MonaConversationDecision {
  const source = resolveSource(input);
  const campaignContext = input.campaignContext || null;
  const text = normalizeText(input.customerMessage);

  if (input.isBlocked) {
    return createDecision({
      action: "ignore",
      intent: "unknown",
      source,
      confidence: 1,
      reason: "Customer phone number is blocked.",
      campaignContext,
    });
  }

  if (input.aiEnabled === false) {
    return createDecision({
      action: "ignore",
      intent: "unknown",
      source,
      confidence: 1,
      reason: "AI is disabled for this conversation.",
      campaignContext,
    });
  }

  if (input.handoverToAdmin) {
    return createDecision({
      action: "ignore",
      intent: "human_support",
      source,
      confidence: 1,
      reason: "Conversation is already assigned to an administrator.",
      campaignContext,
    });
  }

  if (isNonTextMessage(input.messageType)) {
    if (source === "campaign") {
      return createDecision({
        action: "ignore",
        intent: "media",
        source,
        confidence: 1,
        reason:
          "Media sent in response to a campaign should not receive an automatic listing instruction.",
        campaignContext,
      });
    }

    return createDecision({
      action: "reply",
      intent: "media",
      source,
      confidence: 0.9,
      reason:
        "Organic media message may receive the standard media guidance response.",
      campaignContext,
    });
  }

  if (!text) {
    return createDecision({
      action: "ignore",
      intent: "unknown",
      source,
      confidence: 1,
      reason: "Incoming message contains no usable text.",
      campaignContext,
    });
  }

  if (isAutomaticBusinessReply(text)) {
    return createDecision({
      action: "ignore",
      intent: "automatic_reply",
      source,
      confidence: 0.99,
      reason: "Detected an automatic business response.",
      campaignContext,
    });
  }

  if (isUnsubscribeRequest(text)) {
    return createDecision({
      action: "handover",
      intent: "unsubscribe",
      source,
      confidence: 0.99,
      reason:
        "Customer requested to stop receiving messages. An administrator should process the opt-out.",
      campaignContext,
    });
  }

  if (isHumanSupportRequest(text)) {
    return createDecision({
      action: "handover",
      intent: "human_support",
      source,
      confidence: 0.98,
      reason: "Customer explicitly requested human assistance.",
      campaignContext,
    });
  }

  if (isComplaintOrScamAccusation(text)) {
    return createDecision({
      action: "handover",
      intent: "complaint",
      source,
      confidence: 0.98,
      reason:
        "Customer expressed a complaint or scam accusation requiring human review.",
      campaignContext,
    });
  }

  if (isAbusiveMessage(text)) {
    return createDecision({
      action: "handover",
      intent: "abuse",
      source,
      confidence: 0.96,
      reason:
        "Abusive language detected. The AI should not continue the conversation automatically.",
      campaignContext,
    });
  }

  if (isAcknowledgement(text)) {
    if (source === "campaign") {
      return createDecision({
        action: "ignore",
        intent: "acknowledgement",
        source,
        confidence: 0.98,
        reason:
          "Simple campaign acknowledgement does not require an automated response.",
        campaignContext,
      });
    }

    return createDecision({
      action: "reply",
      intent: "acknowledgement",
      source,
      confidence: 0.85,
      reason:
        "Organic acknowledgement may receive a brief conversational response.",
      campaignContext,
    });
  }

  if (isGreeting(text)) {
    return createDecision({
      action: "reply",
      intent: "greeting",
      source,
      confidence: 0.95,
      reason: "Customer sent a greeting.",
      campaignContext,
    });
  }

  if (looksLikeQuestion(text)) {
    return createDecision({
      action: "reply",
      intent: "question",
      source,
      confidence: 0.92,
      reason:
        source === "campaign"
          ? "Customer asked a genuine question related to a campaign."
          : "Customer asked a genuine question.",
      campaignContext,
    });
  }

  return createDecision({
    action: "reply",
    intent: "unknown",
    source,
    confidence: 0.55,
    reason:
      "No blocking business rule matched. Allow Mona to interpret the message.",
    campaignContext,
  });
}
