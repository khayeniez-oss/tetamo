import OpenAI from "openai";

import {
  buildMonaV2PersonalityInstructions,
  finaliseMonaV2Reply,
} from "./personality";
import type {
  MonaV2Analysis,
  MonaV2ConversationContext,
} from "./types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type MonaV2NaturalReplyInput = {
  customerMessage: string;
  analysis: MonaV2Analysis;
  conversationContext?: MonaV2ConversationContext | null;
};

function cleanReply(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/\n{3,}/g, "\n\n")
    .slice(0, 1200);
}

/**
 * Some simple conversational intentions should always have
 * a dependable response without requiring Knowledge Base facts.
 */
function getSafeNaturalReply(
  input: MonaV2NaturalReplyInput
): string | null {
  const language = input.analysis.preferredReplyLanguage;
  const firstReplyGreeting =
    input.conversationContext?.isFirstReply === true
      ? language === "id"
        ? "Halo! "
        : "Hi! "
      : "";

  switch (input.analysis.intent) {
    case "language_switch":
      return language === "id"
        ? "Bisa, saya jawab dalam Bahasa Indonesia ya."
        : "Of course, I’ll reply in English.";

    case "mona_identity":
      return language === "id"
        ? "Saya Mona, asisten WhatsApp Tetamo. Saya bisa membantu menjelaskan layanan Tetamo dan memberikan panduan umum seputar properti di Indonesia."
        : "I’m Mona, Tetamo’s WhatsApp assistant. I can help explain Tetamo’s services and provide general guidance about property in Indonesia.";

    case "acknowledgement":
      return language === "id"
        ? "Sama-sama. Senang bisa membantu."
        : "You’re welcome. Happy to help.";

    case "greeting":
      return language === "id"
        ? "Halo! Selamat datang di Tetamo 😊 Ada yang bisa saya bantu?"
        : "Hi! Welcome to Tetamo 😊 How can I help?";

    default:
      return null;
  }
}

function getFallbackNaturalReply(
  input: MonaV2NaturalReplyInput
): string {
  return input.analysis.preferredReplyLanguage === "id"
    ? "Baik, saya mengerti. Saya akan membantu sebisa saya."
    : "Okay, I understand. I’ll help as best I can.";
}

function buildNaturalReplyPrompt(
  input: MonaV2NaturalReplyInput
): string {
  const context = input.conversationContext;

  return `
You are Mona, Tetamo's WhatsApp assistant.

Write one natural WhatsApp reply to the customer.

${buildMonaV2PersonalityInstructions({
    conversationContext: context,
    route: "natural",
  })}

NATURAL CONVERSATION SAFETY:
- Do not invent Tetamo prices, packages, policies or features.
- Do not provide unsupported property, legal or tax facts.
- Do not pretend to check private accounts.

CUSTOMER MESSAGE:
${input.customerMessage}

PREFERRED REPLY LANGUAGE:
${input.analysis.preferredReplyLanguage}

INTENT:
${input.analysis.intent}

CUSTOMER ROLE:
${input.analysis.customerRole}

CUSTOMER EMOTION:
${input.analysis.emotion}

SALES OPPORTUNITY:
${input.analysis.salesOpportunity}

CURRENT TOPIC:
${context?.currentTopic || "none"}

RECENT CONVERSATION:
${context?.recentMessages || "none"}

Write only Mona's final WhatsApp reply.
`.trim();
}

export async function generateMonaV2NaturalReply(
  input: MonaV2NaturalReplyInput
): Promise<string> {
  const safeReply = getSafeNaturalReply(input);

  if (safeReply) {
    return safeReply;
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error(
      "Mona V2 natural reply generation skipped because OPENAI_API_KEY is unavailable."
    );

    return getFallbackNaturalReply(input);
  }

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "Write Mona's natural WhatsApp reply. Return only the reply.",
        },
        {
          role: "user",
          content: buildNaturalReplyPrompt(input),
        },
      ],
      temperature: 0.45,
      max_output_tokens: 220,
      store: false,
    });

    const reply = finaliseMonaV2Reply({
      reply: cleanReply(response.output_text),
      language: input.analysis.preferredReplyLanguage,
      intent: input.analysis.intent,
      customerMessage: input.customerMessage,
      isFirstReply:
        input.conversationContext?.isFirstReply,
    });

    return reply || getFallbackNaturalReply(input);
  } catch (error) {
    console.error(
      "Mona V2 natural reply generation failed:",
      error
    );

    return getFallbackNaturalReply(input);
  }
}
