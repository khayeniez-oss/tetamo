import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  MonaKnowledgeEntry,
} from "@/lib/mona/knowledge";

import type {
  MonaV2Analysis,
  MonaV2ConversationContext,
} from "./types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_KNOWLEDGE_CANDIDATES = 250;

type KnowledgeRow = {
  id: unknown;
  category: unknown;
  canonical_question: unknown;
  approved_answer: unknown;
  language: unknown;
  priority: unknown;
  usage_count: unknown;
};

export type MonaV2KnowledgeSelectionInput = {
  supabase: SupabaseClient;

  customerMessage: string;

  analysis: MonaV2Analysis;

  conversationContext?: MonaV2ConversationContext | null;
};

export type MonaV2KnowledgeSelectionResult = {
  matched: boolean;

  entry: MonaKnowledgeEntry | null;

  confidence: number;

  candidateCount: number;

  reason: string;
};

const selectionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    matched: {
      type: "boolean",
    },
    selectedKnowledgeId: {
      type: "string",
      maxLength: 200,
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
    reason: {
      type: "string",
      maxLength: 300,
    },
  },
  required: [
    "matched",
    "selectedKnowledgeId",
    "confidence",
    "reason",
  ],
} as const;

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

function readNumber(value: unknown): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function mapKnowledgeRow(
  row: KnowledgeRow
): MonaKnowledgeEntry | null {
  const id = cleanText(row.id);
  const canonicalQuestion = cleanText(
    row.canonical_question
  );
  const approvedAnswer = cleanText(
    row.approved_answer
  );

  if (!id || !canonicalQuestion || !approvedAnswer) {
    return null;
  }

  return {
    id,
    category:
      cleanText(row.category) || "general",
    canonicalQuestion,
    approvedAnswer,
    language:
      cleanText(row.language).toLowerCase() || "id",
    priority: readNumber(row.priority),
    usageCount: readNumber(row.usage_count),
  };
}

function buildSelectorPrompt(params: {
  input: MonaV2KnowledgeSelectionInput;
  candidates: MonaKnowledgeEntry[];
}): string {
  const { input, candidates } = params;

  const compactCandidates = candidates.map(
    (entry) => ({
      id: entry.id,
      category: entry.category,
      canonicalQuestion: entry.canonicalQuestion,
      language: entry.language,
      answerPreview:
        entry.approvedAnswer.slice(0, 500),
    })
  );

  return `
You are Mona V2's approved Tetamo Knowledge Base selector.

Your only job is to select the single approved Knowledge Base entry that most directly answers the customer's real intention.

Do not write the customer reply.

IMPORTANT:
- Understand slang, abbreviations, spelling mistakes and mixed English-Indonesian.
- Use the supplied Mona V2 intent and conversation context.
- Meaning is more important than exact word overlap.
- For tetamo_pricing, select an entry containing the relevant price, cost, fee or package facts.
- Do not select a listing-process entry merely because the message contains words such as listing, advertise or property.
- For tetamo_listing, select listing instructions rather than pricing unless the customer specifically asks about cost.
- For tetamo_membership, prefer agent membership information.
- For tetamo_payment_general, select general approved payment-method information.
- Never use an official Tetamo entry for private account status, payment checking, refunds or complaints.
- Select exactly one entry only when it directly answers the message.
- When no candidate directly answers, return matched false and selectedKnowledgeId as an empty string.
- Never invent an ID.

CUSTOMER MESSAGE:
${input.customerMessage}

MONA V2 INTENT:
${input.analysis.intent}

CUSTOMER ROLE:
${input.analysis.customerRole}

CUSTOMER LANGUAGE:
${input.analysis.language}

PREFERRED REPLY LANGUAGE:
${input.analysis.preferredReplyLanguage}

CURRENT TOPIC:
${input.conversationContext?.currentTopic || "none"}

RECENT CONVERSATION:
${input.conversationContext?.recentMessages || "none"}

APPROVED KNOWLEDGE CANDIDATES:
${JSON.stringify(compactCandidates, null, 2)}
`.trim();
}

async function loadApprovedKnowledge(
  supabase: SupabaseClient
): Promise<MonaKnowledgeEntry[]> {
  const { data, error } = await supabase
    .from("knowledge_base_entries")
    .select(
      [
        "id",
        "category",
        "canonical_question",
        "approved_answer",
        "language",
        "priority",
        "usage_count",
      ].join(", ")
    )
    .eq("status", "active")
    .order("priority", { ascending: false })
    .limit(MAX_KNOWLEDGE_CANDIDATES);

  if (error) {
    throw new Error(
      `Failed to load approved Tetamo knowledge: ${error.message}`
    );
  }

  const rows: KnowledgeRow[] = Array.isArray(data)
    ? (data as unknown as KnowledgeRow[])
    : [];

  return rows
    .map(mapKnowledgeRow)
    .filter(
      (
        entry
      ): entry is MonaKnowledgeEntry => entry !== null
    );
}

export async function selectMonaV2TetamoKnowledge(
  input: MonaV2KnowledgeSelectionInput
): Promise<MonaV2KnowledgeSelectionResult> {
  try {
    const candidates = await loadApprovedKnowledge(
      input.supabase
    );

    if (!candidates.length) {
      return {
        matched: false,
        entry: null,
        confidence: 0,
        candidateCount: 0,
        reason:
          "No active Tetamo Knowledge Base entries are available.",
      };
    }

    if (!process.env.OPENAI_API_KEY) {
      return {
        matched: false,
        entry: null,
        confidence: 0,
        candidateCount: candidates.length,
        reason:
          "The intelligent Tetamo knowledge selector is unavailable.",
      };
    }

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "Select the single best approved Tetamo Knowledge Base entry. Return only the required structured selection.",
        },
        {
          role: "user",
          content: buildSelectorPrompt({
            input,
            candidates,
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "mona_v2_tetamo_knowledge_selection",
          description:
            "Selection of the approved Tetamo knowledge entry that best answers the customer.",
          strict: true,
          schema: selectionSchema,
        },
      },
      temperature: 0.1,
      max_output_tokens: 300,
      store: false,
    });

    const rawSelection = cleanText(
      response.output_text
    );

    if (!rawSelection) {
      return {
        matched: false,
        entry: null,
        confidence: 0,
        candidateCount: candidates.length,
        reason:
          "The intelligent Tetamo knowledge selector returned no result.",
      };
    }

    const selection = JSON.parse(rawSelection) as {
      matched: boolean;
      selectedKnowledgeId: string;
      confidence: number;
      reason: string;
    };

    if (
      !selection.matched ||
      !selection.selectedKnowledgeId ||
      selection.confidence < 0.65
    ) {
      return {
        matched: false,
        entry: null,
        confidence: selection.confidence,
        candidateCount: candidates.length,
        reason: selection.reason,
      };
    }

    const selectedEntry =
      candidates.find(
        (entry) =>
          entry.id === selection.selectedKnowledgeId
      ) ?? null;

    if (!selectedEntry) {
      return {
        matched: false,
        entry: null,
        confidence: 0,
        candidateCount: candidates.length,
        reason:
          "The selector returned an unknown Knowledge Base ID.",
      };
    }

    return {
      matched: true,
      entry: selectedEntry,
      confidence: selection.confidence,
      candidateCount: candidates.length,
      reason: selection.reason,
    };
  } catch (error) {
    console.error(
      "Mona V2 Tetamo knowledge selection failed:",
      error
    );

    return {
      matched: false,
      entry: null,
      confidence: 0,
      candidateCount: 0,
      reason:
        "The approved Tetamo knowledge selection failed.",
    };
  }
}
