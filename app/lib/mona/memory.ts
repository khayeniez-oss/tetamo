import type { SupabaseClient } from "@supabase/supabase-js";

export type MonaMemorySpeaker =
  | "Customer"
  | "Mona"
  | "Admin"
  | "Campaign"
  | "System";

export type MonaMemoryMessage = {
  id: string;
  speaker: MonaMemorySpeaker;
  message: string;
  createdAt: string;
  direction: string;
  source: string | null;
  aiGenerated: boolean;
  adminGenerated: boolean;
  isCampaign: boolean;
  isSystem: boolean;
};

export type MonaConversationMemory = {
  conversationId: string;
  messages: MonaMemoryMessage[];
  totalMessages: number;
  firstMessageAt: string | null;
  lastMessageAt: string | null;
  transcript: string;

  hasCustomerMessages: boolean;
  hasMonaMessages: boolean;
  hasAdminMessages: boolean;
  hasCampaignMessages: boolean;
  hasSystemMessages: boolean;

  campaignOnlyBeforeCustomerConversation: boolean;
  humanInterventionDetected: boolean;
};

type StoredMessageRow = {
  id: string;
  direction: string;
  message: string | null;
  created_at: string;
  source?: string | null;
  admin_generated?: boolean | null;
  ai_generated?: boolean | null;
  raw_payload?: unknown;
};

type LoadConversationMemoryParams = {
  supabase: SupabaseClient;
  conversationId: string;
  excludedMessageIds?: string[];
};

const PAGE_SIZE = 500;

const CAMPAIGN_SOURCES = new Set([
  "meta_template_followup_3_day",
  "meta_template_followup_14_day",
  "admin_meta_template",
  "meta_template_business_initiated",
]);

function cleanSource(value: unknown): string | null {
  const source = String(value || "").trim();
  return source || null;
}

function rawPayloadLooksLikeTemplate(rawPayload: unknown): boolean {
  if (!rawPayload || typeof rawPayload !== "object") {
    return false;
  }

  const payload = rawPayload as Record<string, unknown>;

  return Boolean(
    String(payload.template_name || "").trim() ||
      String(payload.template_language || "").trim() ||
      String(payload.send_type || "").trim()
  );
}

function isCampaignMessage(row: StoredMessageRow): boolean {
  const source = cleanSource(row.source);

  if (source && CAMPAIGN_SOURCES.has(source)) {
    return true;
  }

  if (source?.startsWith("meta_template_")) {
    return true;
  }

  return rawPayloadLooksLikeTemplate(row.raw_payload);
}

function resolveSpeaker(row: StoredMessageRow): MonaMemorySpeaker {
  const direction = String(row.direction || "").trim().toLowerCase();

  if (direction === "system") {
    return "System";
  }

  if (direction !== "outbound") {
    return "Customer";
  }

  if (isCampaignMessage(row)) {
    return "Campaign";
  }

  if (row.admin_generated === true) {
    return "Admin";
  }

  if (row.ai_generated === true) {
    return "Mona";
  }

  /*
   * Legacy outbound rows may predate reliable ai_generated/admin_generated flags.
   * Treat non-admin, non-campaign outbound conversation messages as Mona so old
   * conversation history remains usable by Brain.
   */
  return "Mona";
}

function formatTranscriptMessage(message: MonaMemoryMessage) {
  const sourceSuffix = message.source ? ` source=${message.source}` : "";

  return `[${message.createdAt}] ${message.speaker}${sourceSuffix}: ${message.message}`;
}

/**
 * Loads the complete stored WhatsApp conversation from the beginning.
 *
 * MEMORY RESPONSIBILITY
 * ---------------------
 * Memory preserves what happened.
 *
 * It does NOT:
 * - decide the customer's role
 * - decide what the customer means
 * - recommend packages
 * - decide what Mona should say
 * - schedule follow-ups
 *
 * Brain receives this full history and performs the interpretation.
 *
 * Important:
 * - No arbitrary recent-message limit.
 * - No transcript character truncation.
 * - Reads in pages so long conversations remain retrievable.
 * - Preserves chronological order.
 * - Distinguishes Customer / Mona / Admin / Campaign / System.
 * - Preserves timestamps and message-origin metadata.
 * - Excluded IDs allow the webhook to omit messages currently being
 *   processed as part of a burst.
 * - Does not summarize or discard earlier customer information.
 */
export async function loadFullConversationMemory(
  params: LoadConversationMemoryParams
): Promise<MonaConversationMemory> {
  const excludedIds = new Set(
    (params.excludedMessageIds || [])
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  );

  const rows: StoredMessageRow[] = [];

  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await params.supabase
      .from("whatsapp_messages")
      .select(
        [
          "id",
          "direction",
          "message",
          "created_at",
          "source",
          "admin_generated",
          "ai_generated",
          "raw_payload",
        ].join(", ")
      )
      .eq("conversation_id", params.conversationId)
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(
        `Failed to load Mona conversation memory: ${error.message}`
      );
    }

    const page = (data || []) as unknown as StoredMessageRow[];

    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  const messages = rows
    .filter((row) => !excludedIds.has(String(row.id)))
    .map((row): MonaMemoryMessage | null => {
      const message = String(row.message || "").trim();

      if (!message) {
        return null;
      }

      const speaker = resolveSpeaker(row);
      const campaign = isCampaignMessage(row);
      const direction = String(row.direction || "");

      return {
        id: String(row.id),
        speaker,
        message,
        createdAt: String(row.created_at),
        direction,
        source: cleanSource(row.source),
        aiGenerated: row.ai_generated === true,
        adminGenerated: row.admin_generated === true,
        isCampaign: campaign,
        isSystem: direction.toLowerCase() === "system",
      };
    })
    .filter((message): message is MonaMemoryMessage => message !== null);

  const hasCustomerMessages = messages.some(
    (message) => message.speaker === "Customer"
  );

  const hasMonaMessages = messages.some(
    (message) => message.speaker === "Mona"
  );

  const hasAdminMessages = messages.some(
    (message) => message.speaker === "Admin"
  );

  const hasCampaignMessages = messages.some(
    (message) => message.speaker === "Campaign"
  );

  const hasSystemMessages = messages.some(
    (message) => message.speaker === "System"
  );

  /*
   * True when the stored outbound history before the first genuine customer
   * message consisted only of Campaign/System events, with no prior Mona/Admin
   * conversation.
   *
   * Brain can use the transcript plus this metadata to recognize that an
   * inbound "iya", "ok", "mau", etc. may be a reply to a campaign rather than
   * evidence of an already-established sales relationship.
   */
  const firstCustomerIndex = messages.findIndex(
    (message) => message.speaker === "Customer"
  );

  const beforeFirstCustomer =
    firstCustomerIndex >= 0
      ? messages.slice(0, firstCustomerIndex)
      : messages;

  const campaignOnlyBeforeCustomerConversation =
    beforeFirstCustomer.some(
      (message) => message.speaker === "Campaign"
    ) &&
    !beforeFirstCustomer.some(
      (message) =>
        message.speaker === "Mona" ||
        message.speaker === "Admin"
    );

  /*
   * Human intervention means a real Admin conversation message exists.
   * System audit events alone do not count as a conversational takeover.
   */
  const humanInterventionDetected = hasAdminMessages;

  return {
    conversationId: params.conversationId,
    messages,
    totalMessages: messages.length,
    firstMessageAt: messages[0]?.createdAt || null,
    lastMessageAt: messages[messages.length - 1]?.createdAt || null,
    transcript: messages.map(formatTranscriptMessage).join("\n"),

    hasCustomerMessages,
    hasMonaMessages,
    hasAdminMessages,
    hasCampaignMessages,
    hasSystemMessages,

    campaignOnlyBeforeCustomerConversation,
    humanInterventionDetected,
  };
}
