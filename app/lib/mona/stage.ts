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
 * Stage is observational CRM state only.
 *
 * It must not pull the conversation backwards merely because a later
 * customer message is informational.
 *
 * Memory + Brain represent what has actually happened in the conversation
 * and therefore outrank a stale CRM stage.
 */
function shouldProtectCurrentStage(
  currentStage: MonaSalesStage | null,
  nextStage: MonaSalesStage
) {
  if (!currentStage) {
    return false;
  }

  /*
   * Completed journeys stay completed unless another system explicitly
   * reopens the journey.
   */
  if (currentStage === "closed_won") {
    return nextStage !== "closed_won";
  }

  if (currentStage === "closed_lost") {
    return nextStage !== "closed_lost";
  }

  /*
   * Once payment has started, ordinary information/package conversation
   * must not push CRM backwards.
   */
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

  /*
   * A failed payment also remains an advanced transaction state.
   *
   * It may move forward again when:
   * - customer retries payment -> payment_started;
   * - payment succeeds -> closed_won;
   * - customer explicitly rejects -> closed_lost.
   *
   * It should not fall back to an ordinary package stage.
   */
  if (
    currentStage === "payment_failed" &&
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
 * ==================================================
 * MONA CRM STAGE OBSERVER
 * ==================================================
 *
 * Stage tracks CRM journey state only.
 *
 * Stage does NOT:
 * - understand Indonesian language;
 * - reinterpret customer meaning;
 * - decide customer role;
 * - override Brain;
 * - override Memory;
 * - route Agent / Owner Sales AI;
 * - decide what Mona says;
 * - decide human handover;
 * - decide clarification;
 * - schedule follow-ups;
 * - create commercial strategy.
 *
 * Brain is the semantic authority.
 * Memory is the historical authority.
 *
 * Stage merely observes their result and suggests a CRM label.
 */
export function evaluateMonaSalesStage(
  params: EvaluateMonaSalesStageParams
): MonaSalesStageSuggestion | null {
  const currentStage =
    normalizeStage(params.currentStage);

  /*
   * Do not make CRM-stage decisions while Brain is still uncertain.
   */
  if (
    !params.brain.understood ||
    params.brain.confidence < 0.55
  ) {
    return null;
  }

  /*
   * Clarification belongs to Brain -> Writer.
   *
   * Do not mutate commercial CRM state while the actual meaning or role
   * is still being clarified.
   */
  if (
    params.brain.clarification.needed
  ) {
    return null;
  }

  /*
   * Human handover is an operational state, not a commercial sales stage.
   *
   * Do not make another commercial-stage decision while Brain has already
   * determined that human action is required.
   */
  if (
    params.brain.handoverRecommended
  ) {
    return null;
  }

  /*
   * Brain has already recovered shorthand / Indonesian WhatsApp wording.
   *
   * Stage may use all of these as evidence, but must never independently
   * reinterpret them.
   */
  const text = normalizeText(
    [
      params.latestCustomerMessage,
      params.brain.normalizedMessage,
      params.brain.latestMeaning,
      params.brain.directQuestion || "",
    ].join(" ")
  );

  /*
   * ==================================================
   * TRANSACTION EVIDENCE
   * ==================================================
   *
   * Explicit payment evidence has the highest CRM-stage priority.
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
   * ==================================================
   * REJECTION
   * ==================================================
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
   * ==================================================
   * TIMING / HESITATION
   * ==================================================
   *
   * Stage records that the journey is waiting.
   *
   * Orchestrator / Timing decides whether and when any follow-up occurs.
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
   * ==================================================
   * PAYMENT INTENT
   * ==================================================
   *
   * Asking whether Tetamo charges a fee is NOT enough.
   *
   * We require actual payment/proceed intent.
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

  /*
   * Package selected / customer clearly moving toward purchase.
   */
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
   * ==================================================
   * SUPPORT
   * ==================================================
   *
   * Support does not automatically alter the commercial journey.
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
   * ==================================================
   * AGENT / AGENCY
   * ==================================================
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
   * ==================================================
   * OWNER
   * ==================================================
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
   * ==================================================
   * DEVELOPER
   * ==================================================
   *
   * developer_agency remains only for dashboard / CRM compatibility.
   *
   * Developer does NOT enter Agent or Owner Sales AI.
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
   * ==================================================
   * BUYER / RENTER
   * ==================================================
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
   * ==================================================
   * UNKNOWN
   * ==================================================
   *
   * Unknown customer remains a new inquiry.
   *
   * Interest, campaign targeting, "iya", "mau", etc. do not establish
   * Agent / Owner / Buyer / Developer role.
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

/*
 * Lightweight deterministic transaction observer.
 *
 * This can be used when a full Brain decision is unavailable but the system
 * needs to recognise a very explicit payment success/failure event.
 *
 * It must NOT be expanded into a second Brain.
 */
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