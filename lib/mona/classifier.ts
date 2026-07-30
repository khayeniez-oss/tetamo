import type { MonaConversationIntent } from "./conversation-engine";

export type MonaClassificationInput = {
  customerMessage: string;
  messageType?: string | null;
};

export type MonaClassificationResult = {
  intent: MonaConversationIntent;
  confidence: number;
  reason: string;

  isTextMessage: boolean;
  normalizedText: string;

  requiresHumanReview: boolean;
  isSimpleAcknowledgement: boolean;
  isAutomaticReply: boolean;
};

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeText(value?: string | null): string {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMessageType(
  value?: string | null
): string {
  const normalizedType = normalizeText(value);

  return normalizedType || "text";
}

function matchesAny(
  text: string,
  patterns: RegExp[]
): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function isAutomaticBusinessReply(
  text: string
): boolean {
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
    /auto[\s-]?reply/i,

    /pesan otomatis/i,
    /balasan otomatis/i,
    /terima kasih telah menghubungi/i,
    /kami telah menerima pesan/i,
    /kami akan segera menghubungi/i,
    /kami sedang tidak tersedia/i,
    /kami tidak tersedia saat ini/i,
    /jam operasional kami/i,
    /di luar jam operasional/i,
  ]);
}

function isSimpleAcknowledgement(
  text: string
): boolean {
  return matchesAny(text, [
    /^(ok|okay|oke|okey)$/i,
    /^(noted|noted thanks)$/i,
    /^(thanks|thank you|thankyou)$/i,
    /^(thank you very much|thanks a lot)$/i,
    /^(understood|got it|received)$/i,
    /^(yes|yep|yup|sure)$/i,
    /^(no|not yet)$/i,

    /^(terima kasih|makasih|trimakasih|tks|thx)$/i,
    /^(baik|baiklah|siap|sip)$/i,
    /^(ya|iya|yup)$/i,
    /^(tidak|belum)$/i,

    /^(👍|🙏|👌|✅)$/u,
  ]);
}

function isGreeting(text: string): boolean {
  return matchesAny(text, [
    /^(hi|hello|hey)$/i,
    /^(good morning|good afternoon|good evening)$/i,

    /^(halo|hai)$/i,
    /^(selamat pagi|selamat siang|selamat sore|selamat malam)$/i,
    /^(assalamualaikum|salam)$/i,
  ]);
}

function isUnsubscribeRequest(
  text: string
): boolean {
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
    /\bberhenti promosi\b/i,
    /\bjangan hubungi\b/i,
    /\bjangan kirim pesan\b/i,
    /\bhapus nomor saya\b/i,
    /\bkeluarkan saya\b/i,
  ]);
}

function isHumanSupportRequest(
  text: string
): boolean {
  return matchesAny(text, [
    /\bspeak to a human\b/i,
    /\btalk to a human\b/i,
    /\bspeak to someone\b/i,
    /\btalk to someone\b/i,
    /\breal person\b/i,
    /\bcustomer service\b/i,
    /\bsupport team\b/i,
    /\bconnect me to admin\b/i,
    /\bspeak to admin\b/i,
    /\btalk to admin\b/i,

    /\bbicara dengan admin\b/i,
    /\bhubungi admin\b/i,
    /\bsambungkan ke admin\b/i,
    /\bhubungkan ke admin\b/i,
    /\bsaya butuh admin\b/i,
    /\bsaya ingin bicara dengan admin\b/i,
    /\bsaya mau bicara dengan admin\b/i,
    /\bsaya ingin bantuan manusia\b/i,
  ]);
}

function isComplaintMessage(
  text: string
): boolean {
  return matchesAny(text, [
    /\bcomplaint\b/i,
    /\bcomplain\b/i,
    /\bscam\b/i,
    /\bscammer\b/i,
    /\bfraud\b/i,
    /\bfake company\b/i,
    /\bterrible service\b/i,
    /\bbad service\b/i,

    /\bkeluhan\b/i,
    /\bpenipu\b/i,
    /\bpenipuan\b/i,
    /\bbohong\b/i,
    /\bpalsu\b/i,
    /\bkecewa\b/i,
    /\bpelayanan buruk\b/i,
  ]);
}

function looksLikeQuestion(text: string): boolean {
  if (text.includes("?")) {
    return true;
  }

  return matchesAny(text, [
    /^(how|what|when|where|why|who|which)\b/i,
    /^(can|could|would|do|does|is|are)\b/i,
    /\bhow much\b/i,
    /\bhow can i\b/i,
    /\bmore info\b/i,
    /\bmore information\b/i,
    /\bcan i get\b/i,
    /\bdo you accept\b/i,
    /\bwhat payment\b/i,

    /^(bagaimana|apa|kapan|dimana|di mana)\b/i,
    /^(kenapa|mengapa|siapa|berapa)\b/i,
    /^(bisa|boleh|apakah)\b/i,
    /\bberapa harga\b/i,
    /\bberapa biaya\b/i,
    /\bcaranya\b/i,
    /\binformasi lebih lanjut\b/i,
    /\bminta informasi\b/i,
    /\bbisa dapat\b/i,
    /\bbisa mendapatkan\b/i,
  ]);
}

function createResult(params: {
  intent: MonaConversationIntent;
  confidence: number;
  reason: string;
  isTextMessage: boolean;
  normalizedText: string;
  requiresHumanReview?: boolean;
  isSimpleAcknowledgement?: boolean;
  isAutomaticReply?: boolean;
}): MonaClassificationResult {
  return {
    intent: params.intent,
    confidence: params.confidence,
    reason: params.reason,
    isTextMessage: params.isTextMessage,
    normalizedText: params.normalizedText,
    requiresHumanReview:
      params.requiresHumanReview ?? false,
    isSimpleAcknowledgement:
      params.isSimpleAcknowledgement ?? false,
    isAutomaticReply:
      params.isAutomaticReply ?? false,
  };
}

export function classifyMonaMessage(
  input: MonaClassificationInput
): MonaClassificationResult {
  const normalizedText = normalizeText(
    input.customerMessage
  );

  const messageType = normalizeMessageType(
    input.messageType
  );

  const isTextMessage = messageType === "text";

  /*
   * Mona currently processes text messages only.
   */
  if (!isTextMessage) {
    return createResult({
      intent: "media",
      confidence: 1,
      reason:
        `Incoming WhatsApp message type is "${messageType}".`,
      isTextMessage: false,
      normalizedText,
    });
  }

  /*
   * Empty text cannot be searched against the Knowledge Base.
   */
  if (!normalizedText) {
    return createResult({
      intent: "unknown",
      confidence: 1,
      reason:
        "Incoming text message contains no usable text.",
      isTextMessage: true,
      normalizedText,
    });
  }

  /*
   * Automatic business responses are ignored to prevent
   * automated systems from replying to each other.
   */
  if (isAutomaticBusinessReply(normalizedText)) {
    return createResult({
      intent: "automatic_reply",
      confidence: 0.99,
      reason:
        "Detected an automatic business response.",
      isTextMessage: true,
      normalizedText,
      isAutomaticReply: true,
    });
  }

  /*
   * These classifications describe the message only.
   *
   * They do not automatically decide admin handover.
   * Knowledge retrieval and the conversation engine make
   * the final reply, pause and handover decision.
   */
  if (isUnsubscribeRequest(normalizedText)) {
    return createResult({
      intent: "unsubscribe",
      confidence: 0.99,
      reason:
        "Customer requested to stop receiving messages.",
      isTextMessage: true,
      normalizedText,
    });
  }

  if (isHumanSupportRequest(normalizedText)) {
    return createResult({
      intent: "human_support",
      confidence: 0.98,
      reason:
        "Customer explicitly requested human assistance.",
      isTextMessage: true,
      normalizedText,
    });
  }

  if (isComplaintMessage(normalizedText)) {
    return createResult({
      intent: "complaint",
      confidence: 0.98,
      reason:
        "Customer appears to be making a complaint.",
      isTextMessage: true,
      normalizedText,
    });
  }

  if (isSimpleAcknowledgement(normalizedText)) {
    return createResult({
      intent: "acknowledgement",
      confidence: 0.98,
      reason:
        "Detected a short acknowledgement or contextual reply.",
      isTextMessage: true,
      normalizedText,
      isSimpleAcknowledgement: true,
    });
  }

  if (isGreeting(normalizedText)) {
    return createResult({
      intent: "greeting",
      confidence: 0.95,
      reason: "Customer sent a greeting.",
      isTextMessage: true,
      normalizedText,
    });
  }

  if (looksLikeQuestion(normalizedText)) {
    return createResult({
      intent: "question",
      confidence: 0.92,
      reason:
        "Customer appears to be asking a question.",
      isTextMessage: true,
      normalizedText,
    });
  }

  return createResult({
    intent: "unknown",
    confidence: 0.6,
    reason:
      "Message is valid text and must be checked against the approved Knowledge Base.",
    isTextMessage: true,
    normalizedText,
  });
}