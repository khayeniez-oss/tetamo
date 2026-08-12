import type { SupabaseClient } from "@supabase/supabase-js";

export type MonaMemoryMessage = {
  id: string;
  speaker: "Customer" | "Mona" | "Admin";
  message: string;
  createdAt: string;
  direction: string;
  aiGenerated: boolean;
  adminGenerated: boolean;
};

export type MonaConversationMemory = {
  conversationId: string;
  messages: MonaMemoryMessage[];
  totalMessages: number;
  firstMessageAt: string | null;
  lastMessageAt: string | null;
  transcript: string;
};

type StoredMessageRow = {
  id: string;
  direction: string;
  message: string | null;
  created_at: string;
  admin_generated?: boolean | null;
  ai_generated?: boolean | null;
};

type LoadConversationMemoryParams = {
  supabase: SupabaseClient;
  conversationId: string;
  excludedMessageIds?: string[];
};

const PAGE_SIZE = 500;

function resolveSpeaker(row: StoredMessageRow): MonaMemoryMessage["speaker"] {
  if (row.direction !== "outbound") {
    return "Customer";
  }

  if (row.admin_generated) {
    return "Admin";
  }

  return "Mona";
}

function formatTranscriptMessage(message: MonaMemoryMessage) {
  return `[${message.createdAt}] ${message.speaker}: ${message.message}`;
}

/**
 * Loads the complete stored WhatsApp conversation from the beginning.
 *
 * Important:
 * - No arbitrary "last 16 messages" limit.
 * - No 8,000-character truncation.
 * - Reads in pages so long conversations are still retrievable.
 * - Preserves Customer / Mona / Admin identity.
 * - Excluded IDs allow the webhook to omit messages currently being
 *   processed as part of a burst.
 *
 * This function retrieves memory only.
 * It does NOT decide what Mona should say.
 * It does NOT summarize or discard earlier customer information.
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
        "id, direction, message, created_at, admin_generated, ai_generated"
      )
      .eq("conversation_id", params.conversationId)
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(
        `Failed to load Mona conversation memory: ${error.message}`
      );
    }

    const page = (data || []) as StoredMessageRow[];

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

      return {
        id: String(row.id),
        speaker: resolveSpeaker(row),
        message,
        createdAt: String(row.created_at),
        direction: String(row.direction || ""),
        aiGenerated: row.ai_generated === true,
        adminGenerated: row.admin_generated === true,
      };
    })
    .filter((message): message is MonaMemoryMessage => message !== null);

  return {
    conversationId: params.conversationId,
    messages,
    totalMessages: messages.length,
    firstMessageAt: messages[0]?.createdAt || null,
    lastMessageAt: messages[messages.length - 1]?.createdAt || null,
    transcript: messages.map(formatTranscriptMessage).join("\n"),
  };
}
