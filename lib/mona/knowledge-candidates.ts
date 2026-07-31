import type { SupabaseClient } from "@supabase/supabase-js";

export type SaveKnowledgeCandidateInput = {
  supabase: SupabaseClient;
  sourceMessageId?: string | null;
  conversationId: string;
  customerMessage: string;
  language: string;
  suggestedCategory?: string | null;
  suggestedAnswer?: string | null;
  candidateType?: string;
  confidence?: number;
};

export type SaveKnowledgeCandidateResult = {
  saved: boolean;
  skipped: boolean;
  reason: string;
};

const IGNORED_KNOWLEDGE_MESSAGES = new Set([
  "halo",
  "hai",
  "hi",
  "hello",
  "hey",
  "ok",
  "oke",
  "okay",
  "makasih",
  "terima kasih",
  "thanks",
  "thank you",
  "selamat pagi",
  "selamat siang",
  "selamat sore",
  "selamat malam",
]);

export function normaliseKnowledgeQuestion(
  value?: string | null
): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function saveKnowledgeCandidate(
  params: SaveKnowledgeCandidateInput
): Promise<SaveKnowledgeCandidateResult> {
  const originalMessage = String(
    params.customerMessage || ""
  ).trim();

  const normalisedQuestion =
    normaliseKnowledgeQuestion(originalMessage);

  if (!originalMessage || normalisedQuestion.length < 3) {
    return {
      saved: false,
      skipped: true,
      reason: "Question was empty or too short.",
    };
  }

  if (
    IGNORED_KNOWLEDGE_MESSAGES.has(
      normalisedQuestion
    )
  ) {
    return {
      saved: false,
      skipped: true,
      reason:
        "Message was a greeting or acknowledgement.",
    };
  }

  const {
    data: existingCandidate,
    error: duplicateError,
  } = await params.supabase
    .from("knowledge_base_candidates")
    .select("id")
    .eq("conversation_id", params.conversationId)
    .eq("normalised_question", normalisedQuestion)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  if (duplicateError) {
    console.error(
      "Failed to check duplicate Mona Knowledge candidate:",
      duplicateError
    );
  }

  if (existingCandidate?.id) {
    return {
      saved: false,
      skipped: true,
      reason:
        "A matching pending candidate already exists in this conversation.",
    };
  }

  const confidence = Number.isFinite(
    params.confidence
  )
    ? Math.max(
        0,
        Math.min(1, Number(params.confidence))
      )
    : 0;

  const { error } = await params.supabase
    .from("knowledge_base_candidates")
    .insert({
      source_message_id:
        params.sourceMessageId || null,
      conversation_id: params.conversationId,
      original_message: originalMessage,
      extracted_question: originalMessage,
      normalised_question: normalisedQuestion,
      suggested_category:
        params.suggestedCategory || null,
      suggested_answer:
        params.suggestedAnswer || null,
      detected_language:
        String(params.language || "id"),
      candidate_type:
        params.candidateType ||
        "general_question",
      status: "pending",
      confidence,
      grouped_entry_id: null,
      processing_batch_id: null,
      reviewed_at: null,
    });

  if (error) {
    console.error(
      "Failed to save Mona Knowledge candidate:",
      error
    );

    return {
      saved: false,
      skipped: false,
      reason:
        "Supabase rejected the Knowledge candidate.",
    };
  }

  console.log(
    "Saved unmatched question for Knowledge review.",
    {
      conversationId: params.conversationId,
      sourceMessageId:
        params.sourceMessageId || null,
      normalisedQuestion,
      language: params.language,
    }
  );

  return {
    saved: true,
    skipped: false,
    reason:
      "Question was saved for Knowledge Base review.",
  };
}
