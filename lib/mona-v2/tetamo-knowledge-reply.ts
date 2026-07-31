import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  MonaKnowledgeEntry,
} from "@/lib/mona/knowledge";

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

RESPONSE STYLE:
- Sound warm, friendly, professional and conversational.
- Answer the customer's actual question first and directly.
- Do not begin with "Halo", "Hi" or another greeting unless the customer greeted Mona.
- Do not automatically end with a generic offer such as "Ada yang bisa saya bantu lagi?"
- Finish naturally once the question has been answered.
- If the customer asks for a price, state the approved price clearly.
- Keep the response concise and suitable for WhatsApp.
- Match the preferred reply language.
- Explain clearly without sounding robotic.
- Be gently sales-aware when Tetamo directly solves the customer's need.
- Never pressure the customer to register, pay or advertise.
- Do not end every response with a question.
- Ask one question only when information is genuinely required.
- Do not copy the approved answer word-for-word.
- Never invent prices, packages, policies, features, links or promises.
- Do not add facts from model memory.
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
      max_output_tokens: 420,
      store: false,
    });

    const reply = cleanReply(response.output_text);

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
