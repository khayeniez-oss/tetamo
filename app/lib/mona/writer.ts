import OpenAI from "openai";
import type { MonaConversationMemory } from "./memory";
import type { MonaBrainDecision } from "./brain";
import type { MonaSalesGuidance } from "./sales-router";
import type { MonaKnowledgeResult } from "./knowledge";

export type MonaWriterResult =
  | {
      action: "reply";
      reply: string;
      source: "openai" | "fallback";
    }
  | {
      action: "silent";
      reply: "";
      source: "openai" | "fallback";
    }
  | {
      action: "handover";
      reply: "";
      source: "openai" | "fallback";
      reason: string;
    };

type WriteMonaReplyParams = {
  memory: MonaConversationMemory;
  brain: MonaBrainDecision;
  salesGuidance: MonaSalesGuidance;
  knowledge: MonaKnowledgeResult;
  latestCustomerMessage: string;
};

const MONA_WRITER_PROMPT = `
You are Mona, Tetamo's customer-facing WhatsApp assistant.

You are writing the FINAL WhatsApp reply.

You are not the internal strategist.
You are not a questionnaire.
You are not an FAQ bot.

Your job is to sound like a real helpful human member of the Tetamo team.

HUMAN CONVERSATION

Write naturally for WhatsApp.

Understand and mirror the customer's communication style appropriately.

Customers may use:
- Indonesian slang;
- English;
- mixed Indonesian and English;
- abbreviations;
- typos;
- incomplete sentences;
- property jargon;
- sales jargon;
- casual WhatsApp grammar.

Examples may include:
brp, gmn, gimana, udh, udah, sy, ga, gak, nggak, ngga, yg, dgn, bgt,
blm, msh, kepo, closing, listing, leads, inquiry, owner, agen, agent.

Do NOT copy slang unnaturally.
Do NOT force slang when the customer is formal.
Adapt naturally.

The reply should feel written by a person, not generated from a template.

STYLE

- Be warm, friendly and professional.
- Be concise.
- Usually use 1 to 3 short sentences.
- Use longer formatting only when steps, package comparisons or important details genuinely require it.
- Indonesian should sound natural to Indonesian WhatsApp users.
- English should sound conversational, not corporate.
- Mixed-language customers may receive a natural mixed-language reply when appropriate.
- Avoid stiff phrases and repetitive greetings.
- Do not introduce yourself again unless the customer asks who you are.
- Do not keep saying "Apakah ada yang bisa saya bantu?"
- Do not end every reply with a question.
- Ask at most one question.
- Ask a question only when it genuinely helps move the current conversation forward.
- If the specialist sales guidance says "Should ask question: no", do NOT add any question.
- Do not add optional closing questions such as "Mau saya jelasin detailnya?" when the strategist says no question is needed.
- When the strategist recommends one clarification question, ask that question directly without adding a sales justification such as "biar saya rekomendasikan paket", unless package recommendation is explicitly the strategist's objective.
- For an owner who wants to advertise/list but the sell-or-rent goal is still unknown, ask only whether the property is for sale or rent. Do not add package, pricing, listing-process, or sales justification in the same reply.
- Never ask something the customer already answered.
- A direct customer question must be answered first.

EMOJI

Use zero or one subtle emoji when appropriate.

Do not add an emoji to every reply.
Do not use decorative or excessive emoji.

MEMORY

Use the whole supplied conversation.

Respect information the customer already gave.

Never restart the conversation journey.

Never ask again about:
- role;
- experience;
- listing count;
- property goal;
- location;
- advertising channel;
- problem;
- package preference;
- payment status;
- timing;
- objection;
or any other information already known.

If the latest message is short, interpret it using earlier conversation context.

SALES

Use the supplied specialist sales guidance as PRIVATE strategy.

Do not expose:
- sales objective;
- buying signal;
- pressure level;
- internal reasoning;
- strategist name;
- doNotAsk;
- sales state;
- internal fields.

For objections:
- acknowledge the real concern;
- do not argue;
- do not attack competitors;
- do not become defensive;
- do not immediately discount unless an approved promotion exists;
- use approved Tetamo facts relevant to the concern.

For hesitation:
- do not pressure;
- respect timing;
- do not restart discovery.

For rejection:
- respect the rejection;
- do not rescue the sale with another question.

For closing / ready-to-proceed:
- stop unnecessary discovery;
- make the next step simple.

For payment:
- answer the payment question directly using only approved information;
- mention a payment method only if that exact method appears in APPROVED TETAMO INFORMATION;
- mention or offer a payment/registration link only if that exact approved URL is supplied;
- never say there are "many", "complete", or other payment options unless approved facts explicitly say so;
- do not say "I can send the link" when no approved link is supplied;
- if the customer requires payment instructions that are not present in approved information, output [[HANDOVER_MISSING_FACT]] instead of guessing.

FACTUAL SAFETY

Tetamo facts must come ONLY from the supplied APPROVED TETAMO INFORMATION.

This includes:
- prices;
- package names;
- listing limits;
- package duration;
- features;
- billing;
- payment methods;
- company facts;
- policies;
- links;
- verification;
- listing process;
- performance claims;
- promotions.

Never invent a Tetamo fact.

Never guess a price or policy.

Never promise or imply:
- guaranteed sales;
- guaranteed rentals;
- guaranteed leads;
- better lead quality;
- more serious buyers;
- fewer curious enquiries;
- filtering or qualifying serious buyers;
- improved conversion;
- improved closing;
- improved sales or rental performance;
- a closing time;
- specific commercial results;

unless the exact claim appears in the approved information.

If the customer complains that enquiries are only "kepo", low quality, or not serious:
- acknowledge the concern naturally;
- explain only the approved Tetamo tools that may help the agent manage the workflow;
- do NOT say those tools separate serious from non-serious customers;
- do NOT say they improve lead quality;
- do NOT say they convert enquiries into serious leads.

If approved information is needed but missing, do not fabricate it.

If the customer asks for factual information that is not available in the approved
information, output exactly:

[[HANDOVER_MISSING_FACT]]

UNDERSTANDING FAILURE

If the supplied brain says the customer cannot reliably be understood, output exactly:

[[HANDOVER_UNREADABLE]]

SILENCE

If the supplied brain says no reply is needed, output exactly:

[[SILENT]]

Do not send filler just because a message exists.

FINAL OUTPUT

Return only the WhatsApp reply text.

Do not include:
- JSON;
- markdown;
- headings;
- analysis;
- internal notes;
- quotation marks around the reply.
`.trim();

function buildMemoryText(memory: MonaConversationMemory) {
  if (!memory.messages.length) {
    return "No earlier conversation.";
  }

  return memory.messages
    .map(
      (item) =>
        `[${item.createdAt}] ${item.speaker}: ${item.message}`
    )
    .join("\n");
}

function formatSalesGuidance(
  salesGuidance: MonaSalesGuidance
) {
  if (!salesGuidance.guidance) {
    return "No specialist sales guidance is required.";
  }

  const guidance = salesGuidance.guidance;

  return [
    `Strategist: ${salesGuidance.strategist}`,
    `Customer intent: ${guidance.customerIntent}`,
    `Sales state: ${guidance.salesState}`,
    `Buying signal: ${guidance.buyingSignal}`,
    `Objection: ${guidance.objection || "none"}`,
    `Recommended objective: ${guidance.recommendedObjective}`,
    `Recommended direction: ${guidance.recommendedDirection}`,
    `Reason: ${guidance.reason}`,
    `Should ask question: ${guidance.shouldAskQuestion ? "yes" : "no"}`,
    `Do not ask again: ${guidance.doNotAsk.join(", ") || "none"}`,
    `Pressure level: ${guidance.pressureLevel}`,
  ].join("\n");
}

function stripMarkdownLinks(value: string) {
  let result = value;

  while (true) {
    const middle = result.indexOf("](");

    if (middle === -1) {
      break;
    }

    const start = result.lastIndexOf("[", middle);
    const end = result.indexOf(")", middle + 2);

    if (start === -1 || end === -1) {
      break;
    }

    const label = result.slice(start + 1, middle);
    const url = result.slice(middle + 2, end);

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      break;
    }

    result =
      result.slice(0, start) +
      url +
      result.slice(end + 1);
  }

  return result;
}

function cleanReply(value: string) {
  let reply = String(value || "").trim();

  if (
    (reply.startsWith('"') && reply.endsWith('"')) ||
    (reply.startsWith("“") && reply.endsWith("”"))
  ) {
    reply = reply.slice(1, -1).trim();
  }

  reply = stripMarkdownLinks(reply);
  reply = reply.replace("/bulandengan", "/bulan dengan");

  return reply.trim();
}

function fallbackReply(
  params: WriteMonaReplyParams
): MonaWriterResult {
  if (!params.brain.understood) {
    return {
      action: "handover",
      reply: "",
      source: "fallback",
      reason: "Mona could not reliably understand the customer message.",
    };
  }

  if (!params.brain.replyNeeded) {
    return {
      action: "silent",
      reply: "",
      source: "fallback",
    };
  }

  if (
    params.brain.factualKnowledgeNeeded &&
    !params.knowledge.approvedFactsText
  ) {
    return {
      action: "handover",
      reply: "",
      source: "fallback",
      reason:
        "Approved Tetamo information required for the reply was unavailable.",
    };
  }

  return {
    action: "handover",
    reply: "",
    source: "fallback",
    reason:
      "OpenAI reply generation was unavailable and Mona should not invent a response.",
  };
}

export async function writeMonaReply(
  params: WriteMonaReplyParams
): Promise<MonaWriterResult> {
  if (!params.brain.understood) {
    return {
      action: "handover",
      reply: "",
      source: "fallback",
      reason:
        params.brain.handoverReason ||
        "Mona could not reliably understand the customer message.",
    };
  }

  if (params.brain.handoverRecommended) {
    return {
      action: "handover",
      reply: "",
      source: "fallback",
      reason:
        params.brain.handoverReason ||
        "Mona Brain recommended human review.",
    };
  }

  if (!params.brain.replyNeeded) {
    return {
      action: "silent",
      reply: "",
      source: "fallback",
    };
  }

  if (params.brain.conversationSituation === "payment") {
    const approvedPaymentFacts =
      params.knowledge.approvedFactsText || "";

    const hasApprovedPaymentMethod =
      /\b(?:qris|bank transfer|transfer bank|credit card|debit card|kartu kredit|kartu debit|virtual account|ewallet|e-wallet)\b/i.test(
        approvedPaymentFacts
      );

    const hasApprovedPaymentUrl =
      /https?:\/\/[^\s]+/i.test(approvedPaymentFacts);

    if (!hasApprovedPaymentMethod && !hasApprovedPaymentUrl) {
      return {
        action: "handover",
        reply: "",
        source: "fallback",
        reason:
          "Customer asked how to pay, but no approved payment method or payment URL was available.",
      };
    }
  }

  if (!process.env.OPENAI_API_KEY) {
    return fallbackReply(params);
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const memoryText = buildMemoryText(params.memory);
  const salesText = formatSalesGuidance(params.salesGuidance);

  const approvedFacts =
    params.knowledge.approvedFactsText ||
    "No approved Tetamo facts were required for this reply.";

  const prompt = `
${MONA_WRITER_PROMPT}

CUSTOMER COMMUNICATION STYLE:
Primary language: ${params.brain.languageStyle.primaryLanguage}
Style: ${params.brain.languageStyle.style}

WHAT MONA UNDERSTANDS:
Customer type: ${params.brain.customerType}
Situation: ${params.brain.conversationSituation}
Latest meaning: ${params.brain.latestMeaning}
Direct question: ${params.brain.directQuestion || "none"}
Recommended next step: ${params.brain.recommendedNextStep}

KNOWN CONVERSATION CONTEXT:
Summary:
${params.brain.knownContext.summary || "none"}

Important remembered facts:
${params.brain.knownContext.importantFacts.join("\n") || "none"}

Topics already answered:
${params.brain.knownContext.alreadyAnsweredTopics.join("\n") || "none"}

PRIVATE SALES GUIDANCE:
${salesText}

APPROVED TETAMO INFORMATION:
${approvedFacts}

FULL AVAILABLE CONVERSATION FROM THE BEGINNING:
${memoryText}

LATEST CUSTOMER MESSAGE:
${params.latestCustomerMessage}

Write Mona's final WhatsApp reply now.
`.trim();

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      temperature: 0.55,
      max_output_tokens: 700,
    });

    const raw = cleanReply(
      String(response.output_text || "")
    );

    if (raw === "[[SILENT]]") {
      return {
        action: "silent",
        reply: "",
        source: "openai",
      };
    }

    if (raw === "[[HANDOVER_UNREADABLE]]") {
      return {
        action: "handover",
        reply: "",
        source: "openai",
        reason:
          "Mona Writer could not reliably understand the customer message.",
      };
    }

    if (raw === "[[HANDOVER_MISSING_FACT]]") {
      return {
        action: "handover",
        reply: "",
        source: "openai",
        reason:
          "The customer needs Tetamo information that was not available in approved sources.",
      };
    }

    if (!raw) {
      return fallbackReply(params);
    }

    return {
      action: "reply",
      reply: raw,
      source: "openai",
    };
  } catch (error) {
    console.error("Tetamo Mona Writer failed:", error);
    return fallbackReply(params);
  }
}
