import OpenAI from "openai";

export type AgentSalesGuidance = {
  customerType: "agent";
  knownInformation: {
    experience: string | null;
    listingCount: number | null;
    agentType: string | null;
    currentAdvertising: string | null;
    problem: string | null;
    packageDiscussed: string | null;
    packageSelected: string | null;
    paymentStatus: string | null;
  };
  customerIntent: string;
  salesState: string;
  buyingSignal: "low" | "medium" | "high";
  objection: string | null;
  recommendedObjective: string;
  recommendedDirection: string;
  reason: string;
  shouldAskQuestion: boolean;
  doNotAsk: string[];
  pressureLevel: "low" | "medium" | "stop";
  needsTetamoFacts: boolean;
  factsNeeded: string[];
  handoverRecommended: boolean;
};

type GenerateAgentSalesGuidanceParams = {
  customerMessage: string;
  conversationContext: string | null;
  salesStage?: string | null;
};

const AGENT_SALES_PLAYBOOK = `
TETAMO AGENT SALES PLAYBOOK

PURPOSE
You are the private sales strategist behind Mona, Tetamo's customer-facing
WhatsApp assistant.

You NEVER write the WhatsApp reply.

Your job is to understand the agent's situation and tell Mona what the
smartest sales objective is right now.

CORE PRINCIPLES
- Read the full recent conversation before deciding anything.
- Never run a fixed questionnaire.
- Never collect information simply because a field is empty.
- Never ask again for information the customer already provided.
- Answering a direct customer question takes priority over discovery.
- Recommend discovery only when the answer would materially improve the sale.
- Ask at most one useful question when a question is genuinely needed.
- If the customer is ready to register or pay, stop discovery.
- If payment has already started, focus on payment.
- If the customer clearly rejects the offer, stop selling.
- If the customer is simply closing politely, do not invent another sales question.
- Do not invent Tetamo facts, prices, packages, discounts, performance claims,
  success statistics, guarantees or policies.

USEFUL AGENT INFORMATION
When genuinely relevant, useful information may include:
- whether the person is a new or experienced agent;
- approximate active listing volume;
- independent agent or part of an agency;
- current advertising channels;
- current business or marketing problem;
- what result they want;
- package already discussed;
- package already selected;
- payment status;
- objection or hesitation already expressed.

IMPORTANT
These are NOT mandatory questions.

SALES OBJECTIVES
Choose the single most useful objective for the current moment.

Possible objectives include:
- answer_current_question
- continue_discovery
- understand_problem
- explain_relevant_value
- recommend_package
- handle_objection
- compare_options
- move_to_registration
- move_to_payment
- assist_payment_issue
- acknowledge_follow_up_timing
- stop_selling
- handover

DIRECT QUESTIONS
If the customer directly asks about price, package, features, duration,
registration, payment, Tetamo, or another factual topic:
- recommend answering that question first;
- do not hide the answer behind another qualification question;
- set needsTetamoFacts=true when approved Tetamo information is required.

PACKAGE RECOMMENDATION
Do not invent package facts.

You may recommend that Mona evaluate a package only when enough information
is known to make a sensible recommendation.

If listing capacity is necessary to choose the correct package and is unknown,
you may recommend understanding approximate listing volume.

Do not force experience, advertising channel, property type, area, pain,
timing and decision-maker questions before recommending a package.

BUYING SIGNALS
Strong buying signals include:
- wants to register;
- asks how to join;
- asks where/how to pay;
- asks for payment link;
- chooses a package;
- says they want to proceed;
- asks about activation after payment.

When these appear:
- stop unnecessary discovery;
- make the next action easy.

PAYMENT
If package is selected or payment has started:
- do not restart qualification;
- do not ask experience or listing volume unless absolutely required for the
  customer's immediate request;
- focus on completing or resolving the payment step.

OBJECTIONS
For price, timing, another portal, lead quality, effectiveness or similar concerns:
- understand the actual concern;
- do not argue;
- do not attack competitors;
- do not immediately discount;
- do not invent claims;
- never claim Tetamo will improve lead quality, conversion rate, enquiry quality, sales results or closing rate unless that exact claim is supported by approved Tetamo facts;
- when explaining how Tetamo may help with a stated business problem, set needsTetamoFacts=true and request the relevant approved Tetamo features/value;
- recommend answering the objection naturally and factually using only approved Tetamo information.

FOLLOW-UP / LATER
If the customer says next month, after salary, after approval, after inventory,
after photos, after speaking with a partner/manager, or another clear future timing:
- acknowledge it;
- do not pressure;
- do not restart qualification.

REJECTION
If the customer clearly says they are not interested or wants to stop:
- pressureLevel must be "stop";
- recommendedObjective must be "stop_selling";
- shouldAskQuestion must be false.

MEMORY
Populate doNotAsk with subjects already answered.

Examples:
- customer_type
- experience
- listing_count
- agent_type
- current_advertising
- problem
- package_preference
- payment_status

The goal is to prevent Mona from restarting the sales journey.

OUTPUT
Return sales strategy only.
Never write Mona's customer-facing WhatsApp message.
`.trim();

function fallbackGuidance(): AgentSalesGuidance {
  return {
    customerType: "agent",
    knownInformation: {
      experience: null,
      listingCount: null,
      agentType: null,
      currentAdvertising: null,
      problem: null,
      packageDiscussed: null,
      packageSelected: null,
      paymentStatus: null,
    },
    customerIntent: "unknown",
    salesState: "unknown",
    buyingSignal: "low",
    objection: null,
    recommendedObjective: "answer_current_question",
    recommendedDirection:
      "Respond to the customer's current message naturally without forcing discovery.",
    reason:
      "No reliable Sales AI guidance was available, so use the safest conversational path.",
    shouldAskQuestion: false,
    doNotAsk: [],
    pressureLevel: "low",
    needsTetamoFacts: false,
    factsNeeded: [],
    handoverRecommended: false,
  };
}

function cleanString(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, 20);
}

function parseAgentSalesGuidance(raw: string): AgentSalesGuidance {
  const fallback = fallbackGuidance();

  try {
    const parsed = JSON.parse(
      String(raw || "")
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/```$/i, "")
        .trim()
    ) as Record<string, any>;

    const known =
      parsed.knownInformation && typeof parsed.knownInformation === "object"
        ? parsed.knownInformation
        : {};

    const buyingSignal = ["low", "medium", "high"].includes(
      String(parsed.buyingSignal)
    )
      ? (parsed.buyingSignal as AgentSalesGuidance["buyingSignal"])
      : fallback.buyingSignal;

    const pressureLevel = ["low", "medium", "stop"].includes(
      String(parsed.pressureLevel)
    )
      ? (parsed.pressureLevel as AgentSalesGuidance["pressureLevel"])
      : fallback.pressureLevel;

    const parsedListingCount =
      known.listingCount === null ||
      known.listingCount === undefined ||
      String(known.listingCount).trim() === ""
        ? null
        : Number(known.listingCount);

    return {
      customerType: "agent",
      knownInformation: {
        experience: cleanString(known.experience),
        listingCount:
          parsedListingCount !== null &&
          Number.isFinite(parsedListingCount) &&
          parsedListingCount >= 0
            ? parsedListingCount
            : null,
        agentType: cleanString(known.agentType),
        currentAdvertising: cleanString(known.currentAdvertising),
        problem: cleanString(known.problem),
        packageDiscussed: cleanString(known.packageDiscussed),
        packageSelected: cleanString(known.packageSelected),
        paymentStatus: cleanString(known.paymentStatus),
      },
      customerIntent:
        cleanString(parsed.customerIntent) || fallback.customerIntent,
      salesState: cleanString(parsed.salesState) || fallback.salesState,
      buyingSignal,
      objection: cleanString(parsed.objection),
      recommendedObjective:
        cleanString(parsed.recommendedObjective) ||
        fallback.recommendedObjective,
      recommendedDirection:
        cleanString(parsed.recommendedDirection) ||
        fallback.recommendedDirection,
      reason: cleanString(parsed.reason) || fallback.reason,
      shouldAskQuestion: parsed.shouldAskQuestion === true,
      doNotAsk: cleanStringArray(parsed.doNotAsk),
      pressureLevel,
      needsTetamoFacts: parsed.needsTetamoFacts === true,
      factsNeeded: cleanStringArray(parsed.factsNeeded),
      handoverRecommended: parsed.handoverRecommended === true,
    };
  } catch {
    return fallback;
  }
}

function extractKnownListingCount(text: string): number | null {
  const patterns = [
    /(?:sekitar|kira-kira|kurang lebih|±)?\s*(\d{1,4})\s*(?:listing|listings|iklan(?:\s+properti)?|properti)\b/i,
    /(?:listing|listings|iklan(?:\s+properti)?|properti)\s*(?:saya|sy|aku|kami)?\s*(?:ada|sekitar|kira-kira|kurang lebih|±|:)?\s*(\d{1,4})\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    const value = Number(match[1]);
    if (Number.isFinite(value) && value >= 0 && value <= 5000) {
      return value;
    }
  }

  return null;
}

function extractKnownExperience(text: string): string | null {
  const patterns = [
    /(?:sudah lama jadi agen|berapa lama[\s\S]{0,40}?agen|pengalaman[\s\S]{0,40}?agen)[\s\S]{0,120}?(?:sudah\s*)?(\d{1,2})\s*(?:tahun|thn|th)\b/i,
    /(?:been\s+(?:a\s+)?(?:real estate\s+)?agent|experience[\s\S]{0,40}?agent)[\s\S]{0,120}?(\d{1,2})\s*years?\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    const value = Number(match[1]);
    if (Number.isFinite(value) && value > 0 && value <= 80) {
      return `${value} years`;
    }
  }

  return null;
}

function canonicalMemoryField(value: string) {
  const key = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const compact = key.replace(/_/g, "");

  const aliases: Record<string, string> = {
    customertype: "customer_type",
    experience: "experience",
    listingcount: "listing_count",
    agenttype: "agent_type",
    currentadvertising: "current_advertising",
    problem: "problem",
    packagepreference: "package_preference",
    packagediscussed: "package_preference",
    packageselected: "package_preference",
    paymentstatus: "payment_status",
  };

  return aliases[compact] || key;
}

function applyDeterministicAgentSalesGuards(
  guidance: AgentSalesGuidance,
  params: GenerateAgentSalesGuidanceParams
): AgentSalesGuidance {
  const fullConversation = [
    params.conversationContext || "",
    params.customerMessage || "",
  ].join("\n");

  const known = {
    ...guidance.knownInformation,
  };

  const rememberedListingCount = extractKnownListingCount(fullConversation);
  const rememberedExperience = extractKnownExperience(fullConversation);

  if (known.listingCount === null && rememberedListingCount !== null) {
    known.listingCount = rememberedListingCount;
  }

  if (!known.experience && rememberedExperience) {
    known.experience = rememberedExperience;
  }

  const doNotAsk = new Set(
    guidance.doNotAsk.map(canonicalMemoryField).filter(Boolean)
  );

  if (known.experience) doNotAsk.add("experience");
  if (known.listingCount !== null) doNotAsk.add("listing_count");
  if (known.agentType) doNotAsk.add("agent_type");
  if (known.currentAdvertising) doNotAsk.add("current_advertising");
  if (known.problem) doNotAsk.add("problem");
  if (known.packageDiscussed || known.packageSelected) {
    doNotAsk.add("package_preference");
  }
  if (known.paymentStatus) doNotAsk.add("payment_status");

  let recommendedObjective = guidance.recommendedObjective;
  let recommendedDirection = guidance.recommendedDirection;
  let reason = guidance.reason;
  let shouldAskQuestion = guidance.shouldAskQuestion;
  let needsTetamoFacts = guidance.needsTetamoFacts;
  const factsNeeded = new Set(guidance.factsNeeded);

  // If the problem is already known, do not ask Mona to discover it again.
  if (known.problem && recommendedObjective === "understand_problem") {
    recommendedObjective = "explain_relevant_value";
    recommendedDirection =
      "Address the already-known problem using only approved Tetamo features and value that are relevant. Do not claim Tetamo will improve lead quality, conversion, sales, rentals, or closing results.";
    reason =
      "The customer's problem is already known, so Mona should not ask the agent to explain the same problem again.";
    shouldAskQuestion = false;
    needsTetamoFacts = true;
    factsNeeded.add(
      "approved Tetamo features and value relevant to the agent's stated problem"
    );
  }

  const discussesPerformanceProblem =
    /\b(?:inquir(?:y|ies)|enquir(?:y|ies)|lead|leads|conversion|closing|kepo|serius|serious|quality|kualitas|efektif|effectiv)\b/i.test(
      fullConversation
    );

  // Performance/value claims must always be grounded in approved Tetamo facts.
  if (
    known.problem &&
    (discussesPerformanceProblem ||
      recommendedObjective === "explain_relevant_value" ||
      recommendedObjective === "handle_objection")
  ) {
    needsTetamoFacts = true;
    factsNeeded.add(
      "approved Tetamo features and value relevant to the agent's stated problem"
    );
  }

  const asksAboutPayment =
    /\b(?:bayar|bayarnya|pembayaran|payment|pay|qris|transfer|rekening|payment link|link bayar)\b/i.test(
      params.customerMessage
    );

  if (
    asksAboutPayment ||
    recommendedObjective === "move_to_payment" ||
    recommendedObjective === "assist_payment_issue"
  ) {
    needsTetamoFacts = true;
    factsNeeded.add(
      "approved Tetamo payment instructions, payment methods and relevant payment link"
    );
  }

  return {
    ...guidance,
    knownInformation: known,
    recommendedObjective,
    recommendedDirection,
    reason,
    shouldAskQuestion,
    doNotAsk: Array.from(doNotAsk),
    needsTetamoFacts,
    factsNeeded: Array.from(factsNeeded),
  };
}

export async function generateAgentSalesGuidance(
  params: GenerateAgentSalesGuidanceParams
): Promise<AgentSalesGuidance> {
  if (!process.env.OPENAI_API_KEY) {
    return applyDeterministicAgentSalesGuards(fallbackGuidance(), params);
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = `
${AGENT_SALES_PLAYBOOK}

OFFICIAL SALES STAGE:
${params.salesStage || "none"}

RECENT CONVERSATION:
${params.conversationContext || "No earlier conversation."}

LATEST CUSTOMER MESSAGE:
${params.customerMessage}

Analyse the conversation as Tetamo's private Agent Sales AI.

Return ONLY valid JSON in exactly this structure:

{
  "customerType": "agent",
  "knownInformation": {
    "experience": null,
    "listingCount": null,
    "agentType": null,
    "currentAdvertising": null,
    "problem": null,
    "packageDiscussed": null,
    "packageSelected": null,
    "paymentStatus": null
  },
  "customerIntent": "short description",
  "salesState": "short description",
  "buyingSignal": "low|medium|high",
  "objection": null,
  "recommendedObjective": "single objective",
  "recommendedDirection": "sales strategy for Mona, not customer-facing wording",
  "reason": "brief explanation",
  "shouldAskQuestion": false,
  "doNotAsk": [],
  "pressureLevel": "low|medium|stop",
  "needsTetamoFacts": false,
  "factsNeeded": [],
  "handoverRecommended": false
}

Do not include a WhatsApp reply.
Do not include markdown.
`.trim();

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      temperature: 0.1,
      max_output_tokens: 650,
    });

    return applyDeterministicAgentSalesGuards(
      parseAgentSalesGuidance(String(response.output_text || "")),
      params
    );
  } catch (error) {
    console.error("Tetamo Agent Sales AI guidance failed:", error);
    return applyDeterministicAgentSalesGuards(fallbackGuidance(), params);
  }
}
