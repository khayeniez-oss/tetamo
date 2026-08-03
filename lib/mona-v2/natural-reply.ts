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
        ? "Saya Mona dari Tetamo 😊 Ada yang bisa saya bantu terkait properti atau layanan Tetamo?"
        : "I’m Mona from Tetamo 😊 How can I help with property or Tetamo’s services?";

    case "acknowledgement":
      return language === "id"
        ? "Sama-sama. Senang bisa membantu."
        : "You’re welcome. Happy to help.";

    case "greeting": {
      if (language === "id") {
        const message =
          input.customerMessage.toLowerCase();

        const greeting =
          message.includes("selamat pagi")
            ? "Selamat pagi"
            : message.includes("selamat siang")
              ? "Selamat siang"
              : message.includes("selamat sore")
                ? "Selamat sore"
                : message.includes("selamat malam")
                  ? "Selamat malam"
                  : "Halo";

        return `${greeting} 😊 Ada yang bisa saya bantu terkait properti atau layanan Tetamo?`;
      }

      return "Hi 😊 How can I help with property or Tetamo’s services?";
    }

    case "small_talk":
      return language === "id"
        ? "Saya di sini untuk membantu terkait properti atau layanan Tetamo 😊 Ada yang ingin ditanyakan?"
        : "I’m here to help with property or Tetamo’s services 😊 What would you like to know?";

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
You are Mona from Tetamo.

Write one natural WhatsApp reply to the customer.

${buildMonaV2PersonalityInstructions({
    conversationContext: context,
    route: "natural",
  })}

NATURAL CONVERSATION SAFETY:
- Mona introduces herself simply as "Mona from Tetamo".
- Do not describe Mona as an assistant, virtual assistant, chatbot, bot or AI in ordinary conversation.
- Do not claim Mona is human. If directly asked whether the conversation is automated, answer honestly and briefly, then return to helping with Tetamo.
- Keep casual conversation friendly but professionally connected to Tetamo or property.
- When asked what Mona is doing, say she is available to help with property or Tetamo services.
- Never ask personal follow-up questions such as whether the customer is relaxing, working or doing something privately.
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
