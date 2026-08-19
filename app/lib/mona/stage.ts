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

function normalizeStage(
  value?: string | null
): MonaSalesStage | null {
  const normalized = String(value || "")
    .trim()
    .toLowerCase() as MonaSalesStage;

  return SALES_STAGES.has(normalized)
    ? normalized
    : null;
}

function normalizeText(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function hasExplicitPaymentFailure(
  text: string
) {
  return /(?:qris|bayar|payment|pembayaran|checkout|transfer|transaksi|transaction)[\s\S]{0,45}(?:gagal|failed|fail|error|tidak\s+berhasil|nggak\s+berhasil|gak\s+berhasil|ga\s+berhasil|tidak\s+masuk|belum\s+masuk|didn'?t\s+go\s+through|did\s+not\s+go\s+through)|(?:gagal|failed|fail|error)[\s\S]{0,45}(?:qris|bayar|payment|pembayaran|checkout|transfer|transaksi|transaction)/i.test(
    text
  );
}

function hasExplicitPaymentSuccess(
  text: string
) {
  return /(?:sudah|udah|udh|telah|already)\s+(?:berhasil\s+)?(?:bayar|transfer|payment|paid)|(?:pembayaran|payment|transfer|transaksi)\s+(?:sudah\s+)?(?:berhasil|sukses|success)|(?:sudah|udah|udh)\s+kirim\s+(?:bukti|receipt)|payment\s+(?:is\s+)?complete|payment\s+completed/i.test(
    text
  );
}

function hasExplicitPaymentIntent(
  text: string
) {
  return /(?:bayarnya\s+(?:gimana|bagaimana|gmana|gmn)|cara\s+bayar|mau\s+bayar|siap\s+bayar|lanjut\s+bayar|how\s+to\s+pay|where\s+to\s+pay|bayar\s+di\s+mana|bayar\s+dimana|payment\s+link|link\s+bayar|rekening\s+(?:mana|nya)|saya\s+ambil\s+(?:silver|gold|agent\s+pro|basic|priority|featured))/i.test(
    text
  );
}

/*
 * Protect advanced commercial stages from accidental regression.
 *
 * Examples:
 * - payment_started should not fall back to agent_package just because
 *   the customer asks another information question.
 * - closed_won should not be automatically reopened by ordinary chat.
 * - closed_lost should only change when a future explicit journey
 *   genuinely restarts and Brain/Orchestrator decides to reopen it.
 *
 * payment_failed is allowed to move forward again when the customer
 * explicitly retries payment or confirms payment success.
 */
function shouldProtectCurrentStage(
  currentStage: MonaSalesStage | null,
  nextStage: MonaSalesStage
) {
  if (!currentStage) {
    return false;
  }

  if (currentStage === "closed_won") {
    return nextStage !== "closed_won";
  }

  if (currentStage === "closed_lost") {
    return nextStage !== "closed_lost";
  }

  if (
    currentStage === "payment_started" &&
    [
      "new_inquiry",
      "lead",
      "agent_package",
      "owner_package",
      "developer_agency",
      "follow_up",
    ].includes(nextStage)
  ) {
    return true;
  }

  return false;
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

  if (
    shouldProtectCurrentStage(
      currentStage,
      stage
    )
  ) {
    return null;
  }

  return {
    stage,
    reason,
    confidence: Math.max(
      0,
      Math.min(
        100,
        Math.round(confidence)
      )
    ),
  };
}

/*
 * Stage tracks CRM journey state only.
 *
 * It does NOT:
 * - decide customer role;
 * - override Brain;
 * - route Sales AI;
 * - decide what Mona says;
 * - schedule a follow-up.
 *
 * Brain customerType is authoritative.
 */
export function evaluateMonaSalesStage(
  params: EvaluateMonaSalesStageParams
): MonaSalesStageSuggestion | null {
  const currentStage =
    normalizeStage(params.currentStage);

  if (
    !params.brain.understood ||
    params.brain.confidence < 0.55
  ) {
    return null;
  }

  const text = normalizeText(
    [
      params.latestCustomerMessage,
      params.brain.latestMeaning,
      params.brain.directQuestion || "",
    ].join(" ")
  );

  /*
   * Explicit transaction evidence has highest stage priority.
   */
  if (
    hasExplicitPaymentFailure(text)
  ) {
    return makeSuggestion(
      "payment_failed",
      "Customer explicitly reported a payment or transaction failure.",
      98,
      currentStage
    );
  }

  if (
    hasExplicitPaymentSuccess(text)
  ) {
    return makeSuggestion(
      "closed_won",
      "Customer explicitly stated that payment was completed.",
      98,
      currentStage
    );
  }

  /*
   * Hard rejection closes the current sales journey.
   */
  if (
    params.brain.conversationSituation ===
    "rejection"
  ) {
    return makeSuggestion(
      "closed_lost",
      "Customer clearly rejected or ended the sales conversation.",
      96,
      currentStage
    );
  }

  /*
   * Timing/dependency means follow-up may be appropriate later.
   * Stage records that state; Timing/Orchestrator decides when.
   */
  if (
    params.brain.conversationSituation ===
    "hesitation"
  ) {
    return makeSuggestion(
      "follow_up",
      "Customer wants to continue later or has a timing dependency.",
      94,
      currentStage
    );
  }

  /*
   * Payment stage requires actual payment intent, not merely asking
   * whether Tetamo has a fee.
   */
  if (
    params.brain.conversationSituation ===
      "payment" ||
    hasExplicitPaymentIntent(text)
  ) {
    return makeSuggestion(
      "payment_started",
      "Customer explicitly asked for or indicated intent to proceed with payment.",
      96,
      currentStage
    );
  }

  if (
    params.brain.conversationSituation ===
    "closing"
  ) {
    return makeSuggestion(
      "payment_started",
      "Customer selected an option or clearly asked for the next purchase step.",
      90,
      currentStage
    );
  }

  /*
   * Support does not automatically change the commercial stage.
   */
  if (
    params.brain.conversationSituation ===
    "support"
  ) {
    return null;
  }

  const isActiveSalesSituation = [
    "information",
    "interest",
    "comparison",
    "objection",
  ].includes(
    params.brain.conversationSituation
  );

  /*
   * Agent and Agency share the Agent commercial journey.
   */
  if (
    isActiveSalesSituation &&
    (
      params.brain.customerType ===
        "agent" ||
      params.brain.customerType ===
        "agency"
    )
  ) {
    return makeSuggestion(
      "agent_package",
      params.brain.customerType ===
        "agency"
        ? "Customer is identified as an agency in the Agent commercial journey."
        : "Customer is identified as an agent in an active Tetamo sales conversation.",
      90,
      currentStage
    );
  }

  /*
   * Owner includes owner representatives/family relationships already
   * interpreted by Brain as Owner.
   */
  if (
    isActiveSalesSituation &&
    params.brain.customerType ===
      "owner"
  ) {
    return makeSuggestion(
      "owner_package",
      "Customer is identified in the Owner commercial journey.",
      90,
      currentStage
    );
  }

  /*
   * Developer remains a CRM stage for dashboard compatibility,
   * but Developer does NOT enter Agent or Owner Sales AI.
   */
  if (
    isActiveSalesSituation &&
    params.brain.customerType ===
      "developer"
  ) {
    return makeSuggestion(
      "developer_agency",
      "Customer is identified as a property developer and should follow the Developer journey.",
      92,
      currentStage
    );
  }

  /*
   * Buyer/Renter is a property-demand lead, not an Agent/Owner package lead.
   */
  if (
    params.brain.customerType ===
      "buyer_renter" &&
    [
      "information",
      "interest",
      "comparison",
    ].includes(
      params.brain
        .conversationSituation
    )
  ) {
    return makeSuggestion(
      "lead",
      "Buyer or renter has a genuine property enquiry.",
      84,
      currentStage
    );
  }

  /*
   * Unknown role must remain a new inquiry.
   *
   * Showing interest does NOT establish Agent, Owner, Buyer, Agency
   * or Developer status.
   */
  if (
    params.brain.customerType ===
    "unknown"
  ) {
    if (
      !currentStage ||
      currentStage === "new_inquiry"
    ) {
      return makeSuggestion(
        "new_inquiry",
        "Customer has engaged with Tetamo but their role or journey is not yet established.",
        82,
        currentStage
      );
    }

    return null;
  }

  return null;
}

export function evaluateExplicitTransactionStage(
  params: {
    latestCustomerMessage: string;
    currentStage?: string | null;
  }
): MonaSalesStageSuggestion | null {
  const currentStage =
    normalizeStage(
      params.currentStage
    );

  const text = normalizeText(
    params.latestCustomerMessage
  );

  if (
    hasExplicitPaymentFailure(text)
  ) {
    return makeSuggestion(
      "payment_failed",
      "Customer explicitly reported a payment or transaction failure.",
      98,
      currentStage
    );
  }

  if (
    hasExplicitPaymentSuccess(text)
  ) {
    return makeSuggestion(
      "closed_won",
      "Customer explicitly stated that payment was completed.",
      98,
      currentStage
    );
  }

  return null;
}
