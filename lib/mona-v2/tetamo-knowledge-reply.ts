import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  MonaKnowledgeEntry,
} from "@/lib/mona/knowledge";

import {
  buildMonaV2PersonalityInstructions,
  finaliseMonaV2Reply,
} from "./personality";
import {
  selectMonaV2TetamoKnowledge,
} from "./tetamo-knowledge-selector";

import type {
  MonaV2Analysis,
  MonaV2ConversationContext,
} from "./types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type MonaV2TetamoKnowledgeInput = {
  customerMessage: string;

  analysis: MonaV2Analysis;

  conversationContext?: MonaV2ConversationContext | null;

  supabase: SupabaseClient;
};

export type MonaV2TetamoKnowledgeResult = {
  matched: boolean;

  reply: string | null;

  matchCount: number;

  candidateCount: number;

  selectedKnowledgeId: string | null;

  selectedCategory: string | null;

  selectionConfidence: number;

  shouldSaveKnowledgeCandidate: boolean;

  shouldPauseForAdmin: boolean;

  reason: string;
};

function cleanReply(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/\n{3,}/g, "\n\n")
    .slice(0, 1600);
}

function buildTetamoKnowledgePrompt(params: {
  input: MonaV2TetamoKnowledgeInput;
  knowledgeEntry: MonaKnowledgeEntry;
}): string {
  const { input, knowledgeEntry } = params;

  return `
You are Mona, Tetamo's WhatsApp assistant.

Answer the customer using only the approved Tetamo Knowledge Base entry supplied below.

${buildMonaV2PersonalityInstructions({
    conversationContext:
      input.conversationContext ?? null,
    route: "tetamo_knowledge",
  })}

TETAMO FACTUAL GROUNDING:
- Use only the selected approved Tetamo knowledge supplied below.
- Do not copy the approved answer word-for-word, but preserve every factual detail exactly.
- Never invent prices, packages, policies, features, links or promises.
- Do not add facts from model memory.
- Do not pressure the customer to register, advertise or pay.
- Do not mention the Knowledge Base, internal analysis or routing.

CUSTOMER MESSAGE:
${input.customerMessage}

MAPPED INTENT:
${input.analysis.intent}

PREFERRED REPLY LANGUAGE:
${input.analysis.preferredReplyLanguage}

CUSTOMER ROLE:
${input.analysis.customerRole}

CUSTOMER EMOTION:
${input.analysis.emotion}

SALES OPPORTUNITY:
${input.analysis.salesOpportunity}

CURRENT TOPIC:
${input.conversationContext?.currentTopic || "none"}

RECENT CONVERSATION:
${input.conversationContext?.recentMessages || "none"}

SELECTED APPROVED KNOWLEDGE:
Knowledge ID: ${knowledgeEntry.id}
Category: ${knowledgeEntry.category}
Language: ${knowledgeEntry.language}
Official question:
${knowledgeEntry.canonicalQuestion}

Approved answer:
${knowledgeEntry.approvedAnswer}

Write only Mona's final WhatsApp reply.
`.trim();
}

function ensureTetamoPricingLink(
  reply: string,
  input: MonaV2TetamoKnowledgeInput
): string {
  const pricingLink =
    "https://www.tetamo.com/pricelist";

  if (
    input.analysis.intent !== "tetamo_pricing" ||
    reply.includes(pricingLink)
  ) {
    return reply;
  }

  const language =
    input.analysis.preferredReplyLanguage;

  const asksWhereToView =
    /(?:lihat(?:nya)?|cek(?:nya)?|buka|view|see).*\b(?:di|dimana|di mana|where)\b/i.test(
      input.customerMessage
    );

  if (asksWhereToView) {
    return language === "id"
      ? `Paket dan harga terbaru bisa dilihat di ${pricingLink}. Mau saya jelaskan juga cara pasang listingnya?`
      : `You can see the latest packages and prices at ${pricingLink}. Would you like the listing instructions too?`;
  }

  const linkSentence =
    language === "id"
      ? `Paket dan harga terbaru bisa dilihat di ${pricingLink}.`
      : `See the latest packages and prices at ${pricingLink}.`;

  const finalQuestion = reply.match(
    /([^.!?\n][^.!?\n]*\?)\s*$/
  );

  const body =
    finalQuestion?.index != null
      ? reply
          .slice(0, finalQuestion.index)
          .trim()
      : reply.trim();

  const bodyParts = body
    .split(
      /(?<=[.!?😊🙂😉])\s+(?=[A-ZÀ-ÖØ-Þ])/u
    )
    .map((part) => part.trim())
    .filter(Boolean);

  const greeting =
    bodyParts.length > 1 &&
    /^(halo|hai|hi|hello)[!,.]?$/i.test(
      bodyParts[0]
    )
      ? bodyParts.shift() ?? null
      : null;

  const conciseAnswer =
    bodyParts[0] ?? body;

  const greetingAndAnswer = [
    greeting,
    conciseAnswer,
  ]
    .filter(Boolean)
    .join(" ");

  return [
    greetingAndAnswer,
    linkSentence,
    finalQuestion?.[1]?.trim() ?? null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function generateMonaV2TetamoKnowledgeReply(
  input: MonaV2TetamoKnowledgeInput
): Promise<MonaV2TetamoKnowledgeResult> {
  try {
    const selection =
      await selectMonaV2TetamoKnowledge({
        supabase: input.supabase,
        customerMessage: input.customerMessage,
        analysis: input.analysis,
        conversationContext:
          input.conversationContext ?? null,
      });

    if (!selection.matched || !selection.entry) {
      return {
        matched: false,
        reply: null,
        matchCount: 0,
        candidateCount: selection.candidateCount,
        selectedKnowledgeId: null,
        selectedCategory: null,
        selectionConfidence: selection.confidence,
        shouldSaveKnowledgeCandidate: true,
        shouldPauseForAdmin: true,
        reason: selection.reason,
      };
    }

    const knowledgeEntry = selection.entry;

    if (!process.env.OPENAI_API_KEY) {
      return {
        matched: true,
        reply: null,
        matchCount: 1,
        candidateCount: selection.candidateCount,
        selectedKnowledgeId: knowledgeEntry.id,
        selectedCategory: knowledgeEntry.category,
        selectionConfidence: selection.confidence,
        shouldSaveKnowledgeCandidate: false,
        shouldPauseForAdmin: true,
        reason:
          "Approved Tetamo knowledge was selected, but reply generation is unavailable.",
      };
    }

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "Write Mona's factual Tetamo WhatsApp reply using only the selected approved knowledge.",
        },
        {
          role: "user",
          content: buildTetamoKnowledgePrompt({
            input,
            knowledgeEntry,
          }),
        },
      ],
      temperature: 0.3,
      max_output_tokens: 220,
      store: false,
    });

    const reply = finaliseMonaV2Reply({
      reply: ensureTetamoPricingLink(
        cleanReply(response.output_text),
        input
      ),
      language:
        input.analysis.preferredReplyLanguage,
      intent: input.analysis.intent,
      customerMessage: input.customerMessage,
      isFirstReply:
        input.conversationContext?.isFirstReply,
    });

    if (!reply) {
      return {
        matched: true,
        reply: null,
        matchCount: 1,
        candidateCount: selection.candidateCount,
        selectedKnowledgeId: knowledgeEntry.id,
        selectedCategory: knowledgeEntry.category,
        selectionConfidence: selection.confidence,
        shouldSaveKnowledgeCandidate: false,
        shouldPauseForAdmin: true,
        reason:
          "Approved Tetamo knowledge was selected, but Mona produced an empty reply.",
      };
    }

    return {
      matched: true,
      reply,
      matchCount: 1,
      candidateCount: selection.candidateCount,
      selectedKnowledgeId: knowledgeEntry.id,
      selectedCategory: knowledgeEntry.category,
      selectionConfidence: selection.confidence,
      shouldSaveKnowledgeCandidate: false,
      shouldPauseForAdmin: false,
      reason:
        "Mona selected and used the approved Tetamo knowledge that matched the analysed intent.",
    };
  } catch (error) {
    console.error(
      "Mona V2 Tetamo knowledge reply failed:",
      error
    );

    return {
      matched: false,
      reply: null,
      matchCount: 0,
      candidateCount: 0,
      selectedKnowledgeId: null,
      selectedCategory: null,
      selectionConfidence: 0,
      shouldSaveKnowledgeCandidate: false,
      shouldPauseForAdmin: true,
      reason:
        "Tetamo Knowledge Base selection or reply generation failed.",
    };
  }
}
