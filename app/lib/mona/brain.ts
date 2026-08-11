import OpenAI from "openai";
import type { MonaConversationMemory } from "./memory";

export type MonaCustomerType =
  | "agent"
  | "owner"
  | "agency"
  | "developer"
  | "buyer_renter"
  | "unknown";

export type MonaConversationSituation =
  | "information"
  | "interest"
  | "comparison"
  | "objection"
  | "hesitation"
  | "rejection"
  | "closing"
  | "payment"
  | "support"
  | "casual"
  | "unknown";

export type MonaBrainDecision = {
  understood: boolean;
  confidence: number;

  customerType: MonaCustomerType;

  languageStyle: {
    primaryLanguage: "id" | "en" | "mixed" | "unknown";
    style: string;
  };

  latestMeaning: string;
  conversationSituation: MonaConversationSituation;

  knownContext: {
    summary: string;
    importantFacts: string[];
    alreadyAnsweredTopics: string[];
  };

  replyNeeded: boolean;
  handoverRecommended: boolean;
  handoverReason: string | null;

  salesStrategyNeeded: boolean;
  salesStrategist:
    | "agent"
    | "owner"
    | "developer"
    | "buyer_renter"
    | "none";

  factualKnowledgeNeeded: boolean;
  knowledgeRequest: string[];

  directQuestion: string | null;
  recommendedNextStep: string;
};

type MonaBrainCampaignContext = {
  templateName?: string | null;
  templateLanguage?: string | null;
  templateCategory?: string | null;
  sendType?: string | null;
  sentAt?: string | null;
} | null;

type AnalyseMonaBrainParams = {
  memory: MonaConversationMemory;
  latestCustomerMessage: string;
  salesStage?: string | null;
  campaignContext?: MonaBrainCampaignContext;
};

const MONA_BRAIN_PROMPT = `
You are the internal reasoning brain for Mona, Tetamo's WhatsApp assistant.

You do NOT write the customer-facing WhatsApp reply.

Your job is to understand the customer and the entire available conversation
before any sales strategist or Tetamo Knowledge Base is used.

CORE RULES

- Read the conversation from the beginning.
- Use the latest message together with the full conversation context.
- Never treat the latest message as isolated if earlier messages change its meaning.
- Never ask or recommend asking for information the customer already provided.
- Never invent Tetamo facts.
- Never invent prices, packages, policies, features, performance claims, links,
  payment instructions, guarantees or company information.
- Tetamo factual information must come from approved knowledge later.
- Understand natural WhatsApp language rather than requiring formal grammar.

LANGUAGE UNDERSTANDING

Customers may use:

- Indonesian;
- English;
- mixed Indonesian and English;
- slang;
- abbreviations;
- typos;
- incomplete sentences;
- informal grammar;
- property jargon;
- sales jargon;
- regional conversational language;
- short follow-up messages whose meaning depends on earlier conversation.

Examples include forms such as:

brp
gmn
gimana
udh
udah
sy
saya
gw
aku
ga
gak
nggak
ngga
yg
dgn
bgt
msh
blm
mau
minat
kepo
closing
listing
lead
inquiry
enquiry
prospek
owner
agen
agent
developer
agency

Do NOT rely only on these examples.
Understand language naturally from context.

IMPORTANT

Laughter, casual expressions and slang are not automatically unreadable.

Examples:
wkwk
wkwkwk
haha
hehe
lol

If the message can reasonably be understood from the conversation, mark it understood.

If the message genuinely cannot be understood even after reading the whole
conversation, set understood=false and recommend handover.

CUSTOMER TYPES

Identify the customer from the conversation, not from a single keyword.

Possible customer types:

- agent
- owner
- agency
- developer
- buyer_renter
- unknown

Do not switch an established customer type casually because one message mentions
another customer type in a different context.

CONVERSATION SITUATION

Choose the best description of what is happening now:

- information
- interest
- comparison
- objection
- hesitation
- rejection
- closing
- payment
- support
- casual
- unknown

Examples:

A customer asking what Tetamo is:
information

A customer asking how to join or showing buying intent:
interest

A customer comparing Tetamo with another portal:
comparison

A customer saying the fee is expensive:
objection

A customer saying they will think about it or proceed next month:
hesitation

A customer clearly saying they do not want to continue:
rejection

A customer who has chosen an option and wants the next step:
closing

A customer asking how or where to pay:
payment

A customer reporting payment/account/verification problems:
support

A simple conversational acknowledgement:
casual

DIRECT QUESTIONS

If the latest message contains a direct question, identify what the customer is
actually asking.

The direct question takes priority over unnecessary discovery.

FACTUAL KNOWLEDGE

Set factualKnowledgeNeeded=true only when the final reply requires approved
Tetamo facts.

IMPORTANT PERFORMANCE-CLAIM RULE

If the customer complains about:
- low-quality enquiries;
- people who are only curious;
- weak leads;
- conversion;
- closing;
- sales performance;
- rental performance;
- enquiry quality;

do NOT assume Tetamo improves, filters, qualifies or converts those leads.

Do NOT create a knowledgeRequest such as:
- how Tetamo improves lead quality;
- how Tetamo converts enquiries;
- how Tetamo filters serious buyers;
- how Tetamo reduces non-serious enquiries.

Instead request only approved Tetamo FEATURES that may be relevant to the
customer's workflow or stated problem.

For example:
- direct WhatsApp enquiry features;
- leads dashboard;
- viewing scheduling;
- listing presentation features;
- other approved platform tools.

The final sales strategist and writer may explain those features, but must not
turn them into an unsupported commercial outcome.

Set factualKnowledgeNeeded=true only when the final reply requires approved
Tetamo facts.

Examples:

- pricing;
- packages;
- features;
- listing duration;
- payment instructions;
- company information;
- policies;
- verification;
- registration;
- listing process;
- links;
- supported services;
- factual comparisons involving Tetamo.

knowledgeRequest must contain concise descriptions of the exact approved facts
needed.

Do not put invented answers into knowledgeRequest.

SALES STRATEGY

Sales strategy is separate from factual knowledge.

Set salesStrategyNeeded=true when the customer is in a commercial conversation
that would benefit from specialist sales reasoning.

Routing:

agent -> agent strategist
owner -> owner strategist
developer -> developer strategist
buyer_renter -> buyer/renter strategist

For agency customers, use agent strategist unless the conversation clearly
requires future agency-specific logic.

If no specialist strategy is needed, use "none".

Do NOT create sales strategy here.
Only decide whether specialist strategy is needed and which specialist should
handle it.

REPLY DECISION

replyNeeded=false when the message should naturally receive no conversational
reply.

However, deterministic safety such as media, reaction, emoji-only messages and
admin takeover is handled before this brain.

If the conversation is understandable but is simply a casual acknowledgement,
you may still set replyNeeded=false when silence would be more human.

HANDOVER

Set handoverRecommended=true only when:

- the message genuinely cannot be understood after considering context; or
- the customer needs a human for something the AI should not handle.

Do not use handover merely because the message contains slang, typo or jargon.

MEMORY

Extract important remembered information from the whole conversation.

importantFacts should include useful customer-provided facts such as:

- customer role;
- experience;
- listing quantity;
- property goal;
- property location;
- advertising channels;
- stated problem;
- package preference;
- payment status;
- timing;
- objection;
- decision dependency;
- relevant prior commitment.

alreadyAnsweredTopics should identify subjects that Mona should not ask again.

OUTPUT

Return internal reasoning only.

Never write Mona's customer-facing WhatsApp message.
`.trim();

function fallbackBrainDecision(
  latestCustomerMessage: string
): MonaBrainDecision {
  return {
    understood: true,
    confidence: 0.2,

    customerType: "unknown",

    languageStyle: {
      primaryLanguage: "unknown",
      style: "natural WhatsApp conversation",
    },

    latestMeaning:
      String(latestCustomerMessage || "").trim() || "No readable message.",

    conversationSituation: "unknown",

    knownContext: {
      summary: "",
      importantFacts: [],
      alreadyAnsweredTopics: [],
    },

    replyNeeded: true,
    handoverRecommended: false,
    handoverReason: null,

    salesStrategyNeeded: false,
    salesStrategist: "none",

    factualKnowledgeNeeded: false,
    knowledgeRequest: [],

    directQuestion: null,

    recommendedNextStep:
      "Understand the customer's current message conservatively and avoid inventing Tetamo facts.",
  };
}

function cleanString(value: unknown): string {
  return String(value ?? "").trim();
}

function cleanNullableString(value: unknown): string | null {
  const text = cleanString(value);
  return text || null;
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => cleanString(item))
    .filter(Boolean)
    .slice(0, 40);
}

function parseBrainDecision(
  raw: string,
  fallback: MonaBrainDecision
): MonaBrainDecision {
  try {
    const parsed = JSON.parse(
      String(raw || "")
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/```$/i, "")
        .trim()
    ) as Record<string, any>;

    const allowedCustomerTypes = new Set<MonaCustomerType>([
      "agent",
      "owner",
      "agency",
      "developer",
      "buyer_renter",
      "unknown",
    ]);

    const allowedSituations = new Set<MonaConversationSituation>([
      "information",
      "interest",
      "comparison",
      "objection",
      "hesitation",
      "rejection",
      "closing",
      "payment",
      "support",
      "casual",
      "unknown",
    ]);

    const allowedLanguages = new Set([
      "id",
      "en",
      "mixed",
      "unknown",
    ]);

    const allowedStrategists = new Set([
      "agent",
      "owner",
      "developer",
      "buyer_renter",
      "none",
    ]);

    const languageStyle =
      parsed.languageStyle && typeof parsed.languageStyle === "object"
        ? parsed.languageStyle
        : {};

    const knownContext =
      parsed.knownContext && typeof parsed.knownContext === "object"
        ? parsed.knownContext
        : {};

    const confidenceNumber = Number(parsed.confidence);

    return {
      understood:
        typeof parsed.understood === "boolean"
          ? parsed.understood
          : fallback.understood,

      confidence:
        Number.isFinite(confidenceNumber)
          ? Math.max(0, Math.min(1, confidenceNumber))
          : fallback.confidence,

      customerType: allowedCustomerTypes.has(
        parsed.customerType as MonaCustomerType
      )
        ? (parsed.customerType as MonaCustomerType)
        : fallback.customerType,

      languageStyle: {
        primaryLanguage: allowedLanguages.has(
          String(languageStyle.primaryLanguage)
        )
          ? (languageStyle.primaryLanguage as
              | "id"
              | "en"
              | "mixed"
              | "unknown")
          : fallback.languageStyle.primaryLanguage,

        style:
          cleanString(languageStyle.style) ||
          fallback.languageStyle.style,
      },

      latestMeaning:
        cleanString(parsed.latestMeaning) ||
        fallback.latestMeaning,

      conversationSituation: allowedSituations.has(
        parsed.conversationSituation as MonaConversationSituation
      )
        ? (parsed.conversationSituation as MonaConversationSituation)
        : fallback.conversationSituation,

      knownContext: {
        summary: cleanString(knownContext.summary),
        importantFacts: cleanStringArray(knownContext.importantFacts),
        alreadyAnsweredTopics: cleanStringArray(
          knownContext.alreadyAnsweredTopics
        ),
      },

      replyNeeded:
        typeof parsed.replyNeeded === "boolean"
          ? parsed.replyNeeded
          : fallback.replyNeeded,

      handoverRecommended:
        parsed.handoverRecommended === true,

      handoverReason:
        cleanNullableString(parsed.handoverReason),

      salesStrategyNeeded:
        parsed.salesStrategyNeeded === true,

      salesStrategist: allowedStrategists.has(
        String(parsed.salesStrategist)
      )
        ? (parsed.salesStrategist as
            | "agent"
            | "owner"
            | "developer"
            | "buyer_renter"
            | "none")
        : "none",

      factualKnowledgeNeeded:
        parsed.factualKnowledgeNeeded === true,

      knowledgeRequest:
        cleanStringArray(parsed.knowledgeRequest),

      directQuestion:
        cleanNullableString(parsed.directQuestion),

      recommendedNextStep:
        cleanString(parsed.recommendedNextStep) ||
        fallback.recommendedNextStep,
    };
  } catch {
    return fallback;
  }
}

function buildConversationForBrain(memory: MonaConversationMemory) {
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

export async function analyseMonaBrain(
  params: AnalyseMonaBrainParams
): Promise<MonaBrainDecision> {
  const fallback = fallbackBrainDecision(
    params.latestCustomerMessage
  );

  if (!process.env.OPENAI_API_KEY) {
    return fallback;
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const conversation = buildConversationForBrain(params.memory);

  const prompt = `
${MONA_BRAIN_PROMPT}

OFFICIAL SALES STAGE:
${params.salesStage || "none"}

RECENT TETAMO CAMPAIGN CONTEXT:
${params.campaignContext
  ? JSON.stringify(params.campaignContext, null, 2)
  : "none"}

IMPORTANT CAMPAIGN RULE:
If a recent Tetamo campaign exists, interpret short replies such as "ya", "mau",
"boleh", "info", "berapa", "gimana", "yes", or "interested" in the context of
that campaign instead of treating them as isolated messages. Do not invent the
campaign body or facts that are not present in the supplied context.

FULL AVAILABLE CONVERSATION FROM THE BEGINNING:
${conversation}

LATEST CUSTOMER MESSAGE:
${params.latestCustomerMessage}

Return ONLY valid JSON in exactly this structure:

{
  "understood": true,
  "confidence": 0.95,

  "customerType": "agent|owner|agency|developer|buyer_renter|unknown",

  "languageStyle": {
    "primaryLanguage": "id|en|mixed|unknown",
    "style": "short description of how this customer naturally communicates"
  },

  "latestMeaning": "plain-language interpretation of the latest customer message",

  "conversationSituation": "information|interest|comparison|objection|hesitation|rejection|closing|payment|support|casual|unknown",

  "knownContext": {
    "summary": "short useful summary of the conversation so far",
    "importantFacts": [],
    "alreadyAnsweredTopics": []
  },

  "replyNeeded": true,

  "handoverRecommended": false,
  "handoverReason": null,

  "salesStrategyNeeded": true,
  "salesStrategist": "agent|owner|developer|buyer_renter|none",

  "factualKnowledgeNeeded": true,
  "knowledgeRequest": [],

  "directQuestion": null,

  "recommendedNextStep": "brief internal instruction for what should happen next"
}

Do not write the WhatsApp response.
Do not include markdown.
`.trim();

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      temperature: 0.1,
      max_output_tokens: 900,
    });

    let decision = parseBrainDecision(
      String(response.output_text || ""),
      fallback
    );

    const campaignTemplateName = String(
      params.campaignContext?.templateName || ""
    ).toLowerCase();

    const shortAffirmativeCampaignReply =
      /^(?:ya|iya|y|yes|mau|boleh|ok|oke|okay|interested|minat|info|lanjut)$/i.test(
        params.latestCustomerMessage.trim()
      );

    const campaignClearlyAgentFocused =
      /(?:agent|agen)/i.test(campaignTemplateName);

    if (
      shortAffirmativeCampaignReply &&
      campaignClearlyAgentFocused
    ) {
      decision = {
        ...decision,
        customerType: "agent",
        conversationSituation: "interest",
        salesStrategyNeeded: true,
        salesStrategist: "agent",
        factualKnowledgeNeeded: false,
        knowledgeRequest: [],
        directQuestion: null,
        knownContext: {
          ...decision.knownContext,
          importantFacts: Array.from(
            new Set([
              ...decision.knownContext.importantFacts,
              "customer replied affirmatively to a recent agent-focused Tetamo campaign",
            ])
          ),
        },
        recommendedNextStep:
          "Continue the agent membership or package conversation in the context of the recent Tetamo campaign. Do not ask whether the customer is an owner, wants to list privately, is selling or renting, or is interested in a promotion unless the customer explicitly brings that up. If one clarification is needed, keep it about the agent membership or package journey.",
      };
    }

    const performanceConcern =
      /\b(?:inquir(?:y|ies)|enquir(?:y|ies)|lead|leads|kepo|serius|serious|quality|kualitas|conversion|closing|prospek)\b/i.test(
        [
          params.latestCustomerMessage,
          decision.latestMeaning,
          decision.directQuestion || "",
        ].join(" ")
      );

    if (performanceConcern) {
      decision = {
        ...decision,
        factualKnowledgeNeeded: true,
        knowledgeRequest: [
          "approved Tetamo listing presentation features",
          "approved Tetamo direct WhatsApp enquiry features",
          "approved Tetamo leads dashboard and enquiry-management features",
          "approved Tetamo viewing scheduling features",
        ],
        recommendedNextStep:
          "Explain only approved Tetamo tools relevant to managing the agent's enquiry workflow. Do not say or imply Tetamo filters serious buyers, reduces curious enquiries, improves lead quality, improves conversion, increases enquiries, or improves sales, rentals or closing results.",
      };
    }

    const asksOnlyWhetherThereIsAFee =
      /(?:bayar\s+ya\??|ada\s+biaya|kena\s+biaya|berbayar|gratis\s+atau\s+bayar|harus\s+bayar)/i.test(
        params.latestCustomerMessage
      ) &&
      !/(?:bayarnya\s+(?:gimana|bagaimana|gmana|gmn)|cara\s+bayar|how\s+to\s+pay|where\s+to\s+pay|bayar\s+di\s+mana|bayar\s+dimana|qris|transfer|rekening|payment\s+link|link\s+bayar)/i.test(
        params.latestCustomerMessage
      );

    if (asksOnlyWhetherThereIsAFee) {
      decision = {
        ...decision,
        factualKnowledgeNeeded: true,
        knowledgeRequest: [
          "approved Tetamo pricing or fee information relevant to the customer's listing or package"
        ],
        recommendedNextStep:
          "Answer only whether there is a fee and provide the relevant approved pricing if useful. Do not retrieve or mention payment methods, payment links, or payment instructions unless the customer asks how to pay.",
      };
    }

    const declineForNow =
      /(?:nggak|gak|ga|ngga|enggak|tidak)\s+dulu|belum\s+(?:mau|bisa|siap)\s+(?:daftar|join|gabung|ambil)|nanti\s+(?:aja|saja)|bulan\s+depan|belum\s+sekarang/i.test(
        params.latestCustomerMessage
      );

    if (declineForNow) {
      decision = {
        ...decision,
        conversationSituation: "hesitation",
        factualKnowledgeNeeded: false,
        knowledgeRequest: [],
        directQuestion: null,
        recommendedNextStep:
          "Acknowledge the customer's timing or decision without pressure. Do not restart discovery, do not search for package benefits, promotions, trials or demos, and do not try to rescue the sale with another question.",
      };
    }

    if (!decision.understood) {
      return {
        ...decision,
        replyNeeded: false,
        handoverRecommended: true,
        handoverReason:
          decision.handoverReason ||
          "Mona could not reliably understand the message from the available conversation.",
        salesStrategyNeeded: false,
        salesStrategist: "none",
      };
    }

    return decision;
  } catch (error) {
    console.error("Tetamo Mona Brain analysis failed:", error);
    return fallback;
  }
}
