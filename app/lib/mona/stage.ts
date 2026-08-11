import type { MonaBrainDecision } from "./brain";

export type MonaSalesStage =
  | "new_inquiry"
  | "lead"
  | "agent_package"
  | "owner_package"
  | "developer_agency"
  | "follow_up"
  | "payment_started"
  | "payment_failed"
  | "closed_won"
  | "closed_lost";

export type MonaSalesStageSuggestion = {
  stage: MonaSalesStage;
  reason: string;
  confidence: number;
};

type EvaluateMonaSalesStageParams = {
  brain: MonaBrainDecision;
  latestCustomerMessage: string;
  currentStage?: string | null;
};

const SALES_STAGES = new Set<MonaSalesStage>([
  "new_inquiry",
  "lead",
  "agent_package",
  "owner_package",
  "developer_agency",
  "follow_up",
  "payment_started",
  "payment_failed",
  "closed_won",
  "closed_lost",
]);

function normalizeStage(value?: string | null): MonaSalesStage | null {
  const normalized = String(value || "")
    .trim()
    .toLowerCase() as MonaSalesStage;

  return SALES_STAGES.has(normalized) ? normalized : null;
}

function normalizeText(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function hasExplicitPaymentFailure(text: string) {
  return /(?:qris|bayar|payment|pembayaran|checkout|transfer|transaksi|transaction)[\s\S]{0,45}(?:gagal|failed|fail|error|tidak\s+berhasil|nggak\s+berhasil|gak\s+berhasil|ga\s+berhasil|tidak\s+masuk|belum\s+masuk|didn'?t\s+go\s+through|did\s+not\s+go\s+through)|(?:gagal|failed|fail|error)[\s\S]{0,45}(?:qris|bayar|payment|pembayaran|checkout|transfer|transaksi|transaction)/i.test(
    text
  );
}

function hasExplicitPaymentSuccess(text: string) {
  return /(?:sudah|udah|udh|telah|already)\s+(?:berhasil\s+)?(?:bayar|transfer|payment|paid)|(?:pembayaran|payment|transfer|transaksi)\s+(?:sudah\s+)?(?:berhasil|sukses|success)|(?:sudah|udah|udh)\s+kirim\s+(?:bukti|receipt)|payment\s+(?:is\s+)?complete|payment\s+completed/i.test(
    text
  );
}

function hasExplicitPaymentIntent(text: string) {
  return /(?:bayarnya\s+(?:gimana|bagaimana|gmana|gmn)|cara\s+bayar|mau\s+bayar|siap\s+bayar|lanjut\s+bayar|how\s+to\s+pay|where\s+to\s+pay|bayar\s+di\s+mana|bayar\s+dimana|qris|payment\s+link|link\s+bayar|rekening\s+(?:mana|nya)|saya\s+ambil\s+(?:silver|gold|agent\s+pro|basic|priority|featured))/i.test(
    text
  );
}

function makeSuggestion(
  stage: MonaSalesStage,
  reason: string,
  confidence: number,
  currentStage: MonaSalesStage | null
): MonaSalesStageSuggestion | null {
  if (stage === currentStage) {
    return null;
  }

  return {
    stage,
    reason,
    confidence: Math.max(0, Math.min(100, Math.round(confidence))),
  };
}

export function evaluateMonaSalesStage(
  params: EvaluateMonaSalesStageParams
): MonaSalesStageSuggestion | null {
  const currentStage = normalizeStage(params.currentStage);

  if (!params.brain.understood || params.brain.confidence < 0.55) {
    return null;
  }

  const text = normalizeText(
    [
      params.latestCustomerMessage,
      params.brain.latestMeaning,
      params.brain.directQuestion || "",
    ].join(" ")
  );

  if (hasExplicitPaymentFailure(text)) {
    return makeSuggestion(
      "payment_failed",
      "Customer explicitly reported a payment or transaction failure.",
      98,
      currentStage
    );
  }

  if (hasExplicitPaymentSuccess(text)) {
    return makeSuggestion(
      "closed_won",
      "Customer explicitly stated that payment was completed.",
      98,
      currentStage
    );
  }

  if (params.brain.conversationSituation === "rejection") {
    return makeSuggestion(
      "closed_lost",
      "Customer clearly rejected or ended the sales conversation.",
      96,
      currentStage
    );
  }

  if (params.brain.conversationSituation === "hesitation") {
    return makeSuggestion(
      "follow_up",
      "Customer wants to continue later or has a timing dependency.",
      94,
      currentStage
    );
  }

  if (
    params.brain.conversationSituation === "payment" ||
    hasExplicitPaymentIntent(text)
  ) {
    return makeSuggestion(
      "payment_started",
      "Customer explicitly asked for or indicated intent to proceed with payment.",
      96,
      currentStage
    );
  }

  if (params.brain.conversationSituation === "closing") {
    return makeSuggestion(
      "payment_started",
      "Customer selected an option or clearly asked for the next purchase step.",
      90,
      currentStage
    );
  }

  if (params.brain.conversationSituation === "support") {
    return null;
  }

  const isActiveSalesSituation = [
    "information",
    "interest",
    "comparison",
    "objection",
  ].includes(params.brain.conversationSituation);

  if (isActiveSalesSituation && params.brain.customerType === "agent") {
    return makeSuggestion(
      "agent_package",
      "Customer is identified as an agent in an active Tetamo sales conversation.",
      88,
      currentStage
    );
  }

  if (isActiveSalesSituation && params.brain.customerType === "owner") {
    return makeSuggestion(
      "owner_package",
      "Customer is identified as a property owner in an active Tetamo listing conversation.",
      88,
      currentStage
    );
  }

  if (
    isActiveSalesSituation &&
    (params.brain.customerType === "agency" ||
      params.brain.customerType === "developer")
  ) {
    return makeSuggestion(
      "developer_agency",
      "Customer is identified as an agency or developer.",
      90,
      currentStage
    );
  }

  if (
    params.brain.customerType === "buyer_renter" &&
    ["information", "interest", "comparison"].includes(
      params.brain.conversationSituation
    )
  ) {
    return makeSuggestion(
      "lead",
      "Buyer or renter has a genuine property enquiry.",
      82,
      currentStage
    );
  }

  if (
    params.brain.customerType === "unknown" &&
    params.brain.conversationSituation === "interest"
  ) {
    return makeSuggestion(
      "lead",
      "Customer shows genuine interest but their Tetamo journey is not yet identified.",
      78,
      currentStage
    );
  }

  if (
    !currentStage &&
    params.brain.customerType === "unknown" &&
    params.brain.conversationSituation === "information"
  ) {
    return {
      stage: "new_inquiry",
      reason: "Customer has a fresh Tetamo information enquiry.",
      confidence: 75,
    };
  }

  return null;
}

export function evaluateExplicitTransactionStage(params: {
  latestCustomerMessage: string;
  currentStage?: string | null;
}): MonaSalesStageSuggestion | null {
  const currentStage = normalizeStage(params.currentStage);
  const text = normalizeText(params.latestCustomerMessage);

  if (hasExplicitPaymentFailure(text)) {
    return makeSuggestion(
      "payment_failed",
      "Customer explicitly reported a payment or transaction failure.",
      98,
      currentStage
    );
  }

  if (hasExplicitPaymentSuccess(text)) {
    return makeSuggestion(
      "closed_won",
      "Customer explicitly stated that payment was completed.",
      98,
      currentStage
    );
  }

  return null;
}
