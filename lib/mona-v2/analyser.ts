import OpenAI from "openai";

import type {
  MonaV2AnalyseInput,
  MonaV2Analysis,
} from "./types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    language: {
      type: "string",
      enum: ["id", "en", "mixed", "unknown"],
    },
    preferredReplyLanguage: {
      type: "string",
      enum: ["id", "en"],
    },
    intent: {
      type: "string",
      enum: [
        "greeting",
        "acknowledgement",
        "language_switch",
        "mona_identity",
        "small_talk",
        "tetamo_info",
        "tetamo_pricing",
        "tetamo_listing",
        "tetamo_membership",
        "tetamo_payment_general",
        "account_payment_check",
        "property_search",
        "property_education",
        "buyer_support",
        "seller_support",
        "agent_support",
        "legal_tax_sensitive",
        "verification_issue",
        "refund",
        "complaint",
        "human_support",
        "unsubscribe",
        "automatic_reply",
        "abuse",
        "unsupported_media",
        "unknown",
      ],
    },
    customerRole: {
      type: "string",
      enum: [
        "owner",
        "agent",
        "buyer",
        "renter",
        "investor",
        "general",
        "unknown",
      ],
    },
    emotion: {
      type: "string",
      enum: [
        "neutral",
        "friendly",
        "interested",
        "confused",
        "hesitant",
        "frustrated",
        "angry",
        "urgent",
        "distressed",
        "unknown",
      ],
    },
    riskLevel: {
      type: "string",
      enum: ["low", "medium", "high"],
    },
    knowledgeRoute: {
      type: "string",
      enum: [
        "natural_conversation",
        "tetamo_official",
        "property_education",
        "tetamo_system_tool",
        "admin_handover",
        "none",
      ],
    },
    action: {
      type: "string",
      enum: [
        "reply",
        "clarify",
        "use_tool",
        "handover",
        "ignore",
      ],
    },
    salesOpportunity: {
      type: "string",
      enum: ["none", "soft", "relevant"],
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
    needsClarification: {
      type: "boolean",
    },
    requiresAccountData: {
      type: "boolean",
    },
    requiresHumanReview: {
      type: "boolean",
    },
    shouldSaveKnowledgeCandidate: {
      type: "boolean",
    },
    reason: {
      type: "string",
      maxLength: 300,
    },
  },
  required: [
    "language",
    "preferredReplyLanguage",
    "intent",
    "customerRole",
    "emotion",
    "riskLevel",
    "knowledgeRoute",
    "action",
    "salesOpportunity",
    "confidence",
    "needsClarification",
    "requiresAccountData",
    "requiresHumanReview",
    "shouldSaveKnowledgeCandidate",
    "reason",
  ],
} as const;

function buildAnalysisPrompt(
  input: MonaV2AnalyseInput
): string {
  const context = input.conversationContext;

  return `
You are the internal message analyser for Mona, Tetamo's WhatsApp AI assistant.

Tetamo is an Indonesian property marketplace for owners, agents, buyers and renters.

Your job is to understand the customer's message before any reply is written.

Analyse:
- the customer's language and preferred reply language;
- their actual intention;
- their likely role;
- their emotion;
- whether the matter is safe, sensitive or account-specific;
- which knowledge or action route is required;
- whether Tetamo is naturally relevant.

IMPORTANT ROUTING RULES:

1. NATURAL CONVERSATION
Use natural_conversation for greetings, thanks, acknowledgements, language changes,
identity questions and harmless small talk.

2. TETAMO OFFICIAL
Use tetamo_official for questions about Tetamo services, pricing, packages,
membership, listing processes, payment methods, dashboards, viewing features,
verification rules and other official Tetamo information.

3. PROPERTY EDUCATION
Use the property_education knowledge route for general Indonesian property
education, agent guidance, buyer support, seller support, property documents,
marketing, negotiation, ownership concepts and general legal or tax education.

Choose the most specific intent:
- agent_support when someone asks how to become, work as or improve as an agent;
- buyer_support when someone needs guidance as a buyer;
- seller_support when someone needs guidance as an owner or seller;
- property_education for broader property concepts that do not fit those roles.

Treat a prospective real estate agent as customerRole "agent".

4. TETAMO SYSTEM TOOL
Use tetamo_system_tool when the customer asks about their own payment, account,
listing status, verification status, membership status or other private records.
Do not assume private account information.

5. ADMIN HANDOVER
Use admin_handover for explicit human-support requests, complaints, refunds,
serious disputes, threats, suspected fraud, case-specific legal problems,
custom proposals or matters Mona cannot safely resolve.

6. IGNORE
Use ignore for automatic business replies, unsupported media without usable text,
spam loops or clear unsubscribe processing that should not receive a normal AI reply.

7. CLARIFICATION
Use clarify only when one missing fact is genuinely required.
Do not ask unnecessary follow-up questions.

8. SALES
Sales opportunity must be:
- none when Tetamo is irrelevant or the customer is upset;
- soft when Tetamo may be mentioned naturally;
- relevant when Tetamo directly solves the customer's stated need.

9. CURRENT MESSAGE PRIORITY
Analyse the CURRENT MESSAGE independently before considering conversation history.

The current explicit message is always the primary source of intent.
Conversation context is secondary and may only:
- resolve pronouns or references such as "that one", "it", "the package";
- complete short elliptical follow-ups such as "how much?", "why?", "yes", or "continue";
- preserve a known language or customer role when the current message does not change it.

Conversation context must not replace or override a complete, self-contained current message.

When the customer clearly starts a new topic, use the new topic even when recent messages discussed pricing, payment, membership, listings or something else.

Examples:
- "Bisa tak bahasa Indonesia?" = language_switch and natural_conversation, regardless of the previous topic.
- "Can you reply in English?" = language_switch and natural_conversation.
- "What is Tetamo?" = tetamo_info and tetamo_official, regardless of earlier pricing discussion.
- "Apa itu Tetamo?" = tetamo_info and tetamo_official.
- "How much?" may use recent context because it is incomplete by itself.

10. ACCURACY
Do not treat every unknown message as an admin handover.
Harmless uncertainty may be clarified.
Do not invent facts.

CURRENT MESSAGE:
${input.customerMessage}

MESSAGE TYPE:
${input.messageType || "text"}

KNOWN PREFERRED LANGUAGE:
${context?.preferredLanguage || "unknown"}

KNOWN CUSTOMER ROLE:
${context?.knownCustomerRole || "unknown"}

CURRENT TOPIC:
${context?.currentTopic || "none"}

UNRESOLVED ISSUE:
${context?.unresolvedIssue || "none"}

CAMPAIGN CONTEXT:
${context?.campaignContext || "none"}

RECENT CONVERSATION:
${context?.recentMessages || "none"}
`.trim();
}

function normaliseExplicitMessage(
  value?: string | null
): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}\s?]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function applyExplicitCurrentMessageOverride(
  input: MonaV2AnalyseInput,
  analysis: MonaV2Analysis
): MonaV2Analysis {
  const message = normaliseExplicitMessage(
    input.customerMessage
  );

  const languageSwitchPatterns = [
    /\bbisa(?:kah)?\s+(?:tak\s+)?(?:pakai|gunakan|jawab(?:\s+dengan)?|bicara)?\s*bahasa indonesia\b/,
    /\bpakai bahasa indonesia\b/,
    /\bgunakan bahasa indonesia\b/,
    /\bjawab(?:lah)? (?:dengan )?bahasa indonesia\b/,
    /\bbahasa indonesia (?:ya|dong|please)\b/,
    /\bcan you (?:reply|answer|speak) in indonesian\b/,
    /\bplease (?:reply|answer|speak) in indonesian\b/,
    /\bin indonesian please\b/,
    /\bcan you (?:reply|answer|speak) in english\b/,
    /\bplease (?:reply|answer|speak) in english\b/,
    /\bin english please\b/,
    /\bpakai bahasa inggris\b/,
    /\bgunakan bahasa inggris\b/,
    /\bjawab(?:lah)? (?:dengan )?bahasa inggris\b/,
  ];

  if (
    languageSwitchPatterns.some(
      (pattern) => pattern.test(message)
    )
  ) {
    const wantsEnglish =
      /\benglish\b|\bbahasa inggris\b/.test(
        message
      );

    return {
      ...analysis,
      language:
        wantsEnglish ? "en" : "id",
      preferredReplyLanguage:
        wantsEnglish ? "en" : "id",
      intent: "language_switch",
      knowledgeRoute:
        "natural_conversation",
      action: "reply",
      salesOpportunity: "none",
      confidence: Math.max(
        analysis.confidence,
        0.99
      ),
      needsClarification: false,
      requiresAccountData: false,
      requiresHumanReview: false,
      shouldSaveKnowledgeCandidate: false,
      reason:
        "The current message explicitly requests a reply-language change, so it overrides the previous conversation topic.",
    };
  }

  const tetamoInfoPatterns = [
    /^what is tetamo\??$/,
    /^whats tetamo\??$/,
    /^what exactly is tetamo\??$/,
    /^tell me about tetamo\??$/,
    /^apa itu tetamo\??$/,
    /^tetamo itu apa\??$/,
    /^apa sebenarnya tetamo\??$/,
    /^jelaskan tetamo\??$/,
    /^tentang tetamo\??$/,
  ];

  if (
    tetamoInfoPatterns.some(
      (pattern) => pattern.test(message)
    )
  ) {
    return {
      ...analysis,
      intent: "tetamo_info",
      customerRole:
        analysis.customerRole,
      knowledgeRoute: "tetamo_official",
      action: "reply",
      salesOpportunity: "soft",
      confidence: Math.max(
        analysis.confidence,
        0.99
      ),
      needsClarification: false,
      requiresAccountData: false,
      requiresHumanReview: false,
      shouldSaveKnowledgeCandidate: false,
      reason:
        "The current message explicitly asks what Tetamo is, so it overrides the previous conversation topic.",
    };
  }

  return analysis;
}

function getSafeFallbackAnalysis(
  input: MonaV2AnalyseInput
): MonaV2Analysis {
  const message = String(input.customerMessage || "").trim();

  return {
    language: "unknown",
    preferredReplyLanguage:
      input.conversationContext?.preferredLanguage || "id",
    intent: message ? "unknown" : "unsupported_media",
    customerRole:
      input.conversationContext?.knownCustomerRole ||
      "unknown",
    emotion: "unknown",
    riskLevel: "high",
    knowledgeRoute: "admin_handover",
    action: "handover",
    salesOpportunity: "none",
    confidence: 0,
    needsClarification: false,
    requiresAccountData: false,
    requiresHumanReview: true,
    shouldSaveKnowledgeCandidate: Boolean(message),
    reason:
      "Mona V2 could not safely analyse the customer message.",
  };
}

export async function analyseMonaV2Message(
  input: MonaV2AnalyseInput
): Promise<MonaV2Analysis> {
  if (!process.env.OPENAI_API_KEY) {
    console.error(
      "Mona V2 analysis skipped because OPENAI_API_KEY is unavailable."
    );

    return getSafeFallbackAnalysis(input);
  }

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "Analyse the customer message. Return only the required structured analysis.",
        },
        {
          role: "user",
          content: buildAnalysisPrompt(input),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "mona_v2_message_analysis",
          description:
            "Mona's structured analysis of an incoming WhatsApp message.",
          strict: true,
          schema: analysisSchema,
        },
      },
      temperature: 0.2,
      max_output_tokens: 600,
      store: false,
    });

    const rawAnalysis = String(
      response.output_text || ""
    ).trim();

    if (!rawAnalysis) {
      console.error(
        "Mona V2 analyser returned an empty response."
      );

      return getSafeFallbackAnalysis(input);
    }

    const parsedAnalysis =
      applyExplicitCurrentMessageOverride(
        input,
        JSON.parse(rawAnalysis) as MonaV2Analysis
      );

    /*
     * Knowledge candidates can only be identified after the
     * selected Knowledge Base has actually been searched.
     */
    let inferredCustomerRole =
      parsedAnalysis.customerRole;

    /*
     * Infer the customer's practical role from a clear,
     * role-specific support intent when the model returns
     * an overly cautious unknown or general role.
     */
    if (
      parsedAnalysis.intent === "agent_support" &&
      ["unknown", "general"].includes(inferredCustomerRole)
    ) {
      inferredCustomerRole = "agent";
    }

    if (
      parsedAnalysis.intent === "buyer_support" &&
      ["unknown", "general"].includes(inferredCustomerRole)
    ) {
      inferredCustomerRole = "buyer";
    }

    if (
      parsedAnalysis.intent === "seller_support" &&
      ["unknown", "general"].includes(inferredCustomerRole)
    ) {
      inferredCustomerRole = "owner";
    }

    const analysis: MonaV2Analysis = {
      ...parsedAnalysis,
      customerRole: inferredCustomerRole,
      shouldSaveKnowledgeCandidate: false,
    };

    /*
     * Private Tetamo records must first be handled through
     * an authorised system tool. The router may hand over
     * later if the tool is unavailable or cannot resolve it.
     */
    if (analysis.knowledgeRoute === "tetamo_system_tool") {
      return {
        ...analysis,
        action: "use_tool",
        requiresAccountData: true,
        requiresHumanReview: false,
        shouldSaveKnowledgeCandidate: false,
        salesOpportunity: "none",
      };
    }

    return analysis;
  } catch (error) {
    console.error("Mona V2 analysis failed:", error);

    return getSafeFallbackAnalysis(input);
  }
}
