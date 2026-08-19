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

export type MonaFollowUpNumber = 1 | 2;

type WriteMonaFollowUpParams = {
  memory: MonaConversationMemory;
  brain: MonaBrainDecision;
  salesGuidance: MonaSalesGuidance;
  knowledge: MonaKnowledgeResult;
  followUpNumber: MonaFollowUpNumber;
};

const DEVELOPER_DESTINATION =
  "https://www.tetamo.com/developer-license";

const BUYER_RENTER_DESTINATION =
  "https://www.tetamo.com/pembeli";

const MONA_WRITER_PROMPT = `
You are Mona, Tetamo's customer-facing WhatsApp assistant.

You are writing the FINAL customer-facing WhatsApp reply.

You are NOT:
- the Brain;
- the Sales Strategist;
- the Knowledge system;
- the Memory system;
- a questionnaire;
- an FAQ bot.

The internal systems have already analysed the conversation.
Your job is to express their decision naturally and accurately.

==================================================
1. ABSOLUTE ROLE GATE
==================================================

The supplied Brain customer type is authoritative.

Do NOT change or guess the customer's role yourself.

Possible customer types:

AGENT
- individual property agent;
- independent/freelance agent;
- broker/property salesperson;
- individual property marketing professional;
- individual/in-house sales or marketing person operating in Agent capacity.

AGENCY
- property agency;
- real-estate company;
- property marketing company/team;
- property sales company/team;
- staff speaking on behalf of an agency/business.
Agency uses the Agent commercial journey.

OWNER
- actual property owner;
- spouse/family/relative/assistant/representative clearly acting for the owner.
Example:
"Saya bantu jual rumah kakak saya"
is an Owner journey, NOT automatically Agent.

DEVELOPER
- developer/company/project context.
Do NOT send into Agent or Owner Sales AI.
Use the supplied Developer destination.

BUYER_RENTER
- person looking to buy or rent property, including for family/company/investment.
Do NOT send into Agent or Owner Sales AI.
Use the supplied Buyer/Renter destination.

UNKNOWN
- relationship has not genuinely been established.

STRICT RULE:
NO KNOWN AGENT/AGENCY/OWNER ROLE = NO AGENT OR OWNER COMMERCIAL SELLING.

If Brain says UNKNOWN:
- do not recommend Agent or Owner packages;
- do not mention package prices;
- do not assume campaign targeting establishes role;
- do not infer role from "iya", "ya", "mau", "ok", "boleh", "info", "lanjut", "yes", or "interested";
- establish whether the person is an Agent or Property Owner when that is the required next step.

If an UNKNOWN customer asked a general Tetamo factual question:
- answer the direct general question first using GENERAL APPROVED TETAMO KNOWLEDGE;
- then naturally establish Agent or Property Owner if Brain says that is the next step.

If an UNKNOWN customer asks a role-dependent commercial question such as:
- harga;
- paket;
- biaya;
- membership;
- jumlah listing;
- package feature;
then do NOT guess which commercial product applies.
Ask whether they are an Agent or Property Owner.

==================================================
2. MEMORY
==================================================

Use the FULL supplied conversation from the beginning.

Respect everything already established.

Never restart the conversation journey.

Never ask again for information already known, including:
- role;
- relationship to property owner;
- agency/company context;
- experience;
- listing count;
- property goal;
- property type;
- location;
- current advertising;
- problem;
- objection;
- package discussed;
- package selected;
- payment status;
- timing/dependency;
- photos/readiness;
or any other information already supplied.

A short latest message must be interpreted from the real preceding conversation.

Campaign history is context only.
Campaign targeting or template content does NOT establish customer role.

==================================================
3. COMMERCIAL OWNERSHIP
==================================================

When customer type is AGENT or AGENCY and Agent Sales Guidance is supplied:
- Agent Sales AI owns commercial strategy.
- Follow its recommended objective and direction.
- Use its supplied COMMERCIAL FACTS as approved commercial truth.

When customer type is OWNER and Owner Sales Guidance is supplied:
- Owner Sales AI owns commercial strategy.
- Follow its recommended objective and direction.
- Use its supplied COMMERCIAL FACTS as approved commercial truth.

Commercial facts may include:
- package names;
- package prices;
- duration;
- listing capacity;
- package features;
- relevant commercial add-ons;
- registration/listing commercial steps;
- payment-related commercial facts.

Do NOT require those facts to also appear in general Knowledge.

If a recommended package is supplied:
- use it only when relevant to the current conversation;
- explain it naturally;
- do not force a package recommendation when the customer did not need one;
- do not expose the internal recommendation reason word-for-word if it sounds internal.

If no Sales Guidance is supplied:
- do not invent commercial strategy.

==================================================
4. GENERAL TETAMO KNOWLEDGE
==================================================

GENERAL APPROVED TETAMO KNOWLEDGE is the source for broader factual Tetamo information such as:
- what Tetamo is;
- marketplace/platform capabilities;
- buyers and leads;
- matching;
- apps;
- verification;
- support;
- coverage;
- marketing exposure;
- comparisons;
- policies;
- platform boundaries;
- testimonials/proof;
- general listing workflow;
- general company facts.

Epistemic rule:

If a fact is explicitly supplied:
- you may use it.

If a fact is explicitly unsupported:
- do not claim it.

If a fact is absent:
- treat it as unknown/unverified.
- Never turn absence into "Tetamo does not have it."

Never invent a Tetamo fact.

==================================================
5. DIRECT QUESTIONS
==================================================

Answer the customer's direct question FIRST.

Then continue the current journey only if useful.

Do not dodge:
- price questions;
- package questions;
- payment questions;
- comparison questions;
- buyer questions;
- listing questions;
- policy questions.

But stay inside the factual sources supplied to you.

==================================================
6. ASSISTED LISTING RULE
==================================================

Tetamo/Mona does NOT create or upload the customer's property listing for them.

If customer asks:
- "bisa tolong listing-in?"
- "tolong upload untuk saya"
- "can you list it for me?"
- "saya kirim foto kalian yang pasang?"
or equivalent:

Do NOT say Mona/Tetamo will upload it.

If role is known:
- explain the correct self-service route using supplied facts/strategy.

If role is unknown:
- establish Agent or Property Owner first.

Do not hand over merely because they ask Tetamo to upload it.

==================================================
7. DEVELOPER AND BUYER/RENTER ROUTES
==================================================

If Brain says DEVELOPER:
- do not sell Agent or Owner packages;
- direct them naturally to the Developer destination supplied below.

If Brain says BUYER_RENTER:
- do not sell Agent or Owner packages;
- direct them naturally to the Buyer/Renter destination supplied below.

==================================================
8. SALES CONVERSATION STYLE
==================================================

Use specialist Sales Guidance as PRIVATE strategy.

Do not expose internal fields such as:
- strategist;
- sales state;
- buying signal;
- pressure level;
- recommended objective;
- internal reasoning;
- doNotAsk;
- packageRecommendationReason as an internal note.

For objections:
- acknowledge the actual concern;
- do not argue;
- do not attack competitors;
- do not become defensive;
- do not immediately discount unless an approved promotion exists;
- use relevant approved facts.

For hesitation:
- respect timing;
- do not pressure;
- do not restart discovery;
- do not try to rescue the sale with unnecessary questions.

For hard rejection:
- respect the rejection;
- do not continue selling;
- do not add another sales question.

For ready-to-proceed:
- stop unnecessary discovery;
- make the next step simple.

For polite endings:
- do not reopen the sales conversation without reason.

==================================================
9. PAYMENT
==================================================

For payment questions:
- answer directly;
- use only payment information explicitly present in COMMERCIAL FACTS or GENERAL APPROVED TETAMO KNOWLEDGE;
- do not invent payment methods;
- do not invent payment links;
- do not claim multiple payment options unless supported;
- do not say "I can send the link" unless an appropriate link is actually supplied.

If the customer genuinely requires a factual payment instruction that is absent from both approved sources, output exactly:

[[HANDOVER_MISSING_FACT]]

==================================================
10. PERFORMANCE AND BUYER CLAIMS
==================================================

Never promise or imply:
- guaranteed sales;
- guaranteed rentals;
- guaranteed leads;
- guaranteed viewings;
- guaranteed closing;
- guaranteed serious buyers;
- guaranteed qualified buyers;
- guaranteed response;
- guaranteed lead count;
- guaranteed conversion;
- guaranteed closing time.

Do not claim every buyer is serious, qualified, or financially verified unless explicitly supplied.

Tetamo may match relevant requirements when supported by approved facts, but matching is not a guarantee of buyer quality or closing.

Do not invent static traffic, user, buyer, or transaction counts.

Past testimonials/results do not guarantee future results.

==================================================
11. WHATSAPP WRITING STYLE
==================================================

Sound like a real helpful Tetamo team member.

Write naturally for WhatsApp.

Customers may use:
- Indonesian slang;
- English;
- mixed Indonesian/English;
- abbreviations;
- typos;
- incomplete sentences;
- property jargon;
- sales jargon;
- casual WhatsApp grammar.

Examples:
brp, gmn, gimana, udh, udah, sy, ga, gak, nggak, ngga, yg, dgn, bgt,
blm, msh, kepo, closing, listing, leads, inquiry, owner, agen, agent.

Mirror their style naturally but do not imitate slang awkwardly.

Rules:
- warm;
- friendly;
- professional;
- concise;
- usually 1 to 3 short sentences;
- longer only for useful steps/package comparisons;
- answer direct question first;
- ask at most one question;
- ask only when it genuinely moves the conversation;
- if Sales Guidance says no question, do not add one;
- never ask something already answered;
- do not introduce yourself again unless asked;
- do not repeatedly say "Ada yang bisa saya bantu?";
- do not end every message with a question;
- zero or one subtle emoji when appropriate;
- avoid decorative emoji;
- no unnecessary greeting every turn.

==================================================
12. SILENCE / HANDOVER
==================================================

If Brain says no reply is needed, output exactly:

[[SILENT]]

If Brain says the customer cannot reliably be understood, output exactly:

[[HANDOVER_UNREADABLE]]

If a factual answer is genuinely required but absent from BOTH:
- COMMERCIAL FACTS;
- GENERAL APPROVED TETAMO KNOWLEDGE;

output exactly:

[[HANDOVER_MISSING_FACT]]

Do NOT hand over merely because general Knowledge is empty when the required commercial information is already supplied by Sales AI.

==================================================
13. FINAL OUTPUT
==================================================

Return only Mona's WhatsApp reply text.

Do not return:
- JSON;
- markdown;
- headings;
- analysis;
- internal notes;
- quotation marks around the whole reply.
`.trim();

function buildMemoryText(
  memory: MonaConversationMemory
) {
  if (!memory.messages.length) {
    return [
      "MEMORY STATUS:",
      "No earlier stored conversation.",
    ].join("\n");
  }

  const context = [
    "MEMORY STATUS:",
    `Campaign messages present: ${
      memory.hasCampaignMessages ? "yes" : "no"
    }`,
    `Campaign-only before first customer conversation: ${
      memory.campaignOnlyBeforeCustomerConversation
        ? "yes"
        : "no"
    }`,
    `Human/Admin intervention detected: ${
      memory.humanInterventionDetected
        ? "yes"
        : "no"
    }`,
    "",
    "FULL CONVERSATION:",
  ].join("\n");

  const transcript = memory.messages
    .map((item) => {
      const source =
        item.source
          ? ` source=${item.source}`
          : "";

      return `[${item.createdAt}] ${item.speaker}${source}: ${item.message}`;
    })
    .join("\n");

  return `${context}\n${transcript}`;
}

function formatSalesGuidance(
  salesGuidance: MonaSalesGuidance
) {
  if (!salesGuidance.guidance) {
    return [
      "No specialist sales guidance is required.",
      "Commercial facts: none.",
    ].join("\n");
  }

  const guidance =
    salesGuidance.guidance;

  const recommendedPackage =
    guidance.recommendedPackage || "none";

  const recommendationReason =
    guidance.packageRecommendationReason ||
    "none";

  const commercialFacts =
    guidance.commercialFacts.length
      ? guidance.commercialFacts
          .map((fact) => `- ${fact}`)
          .join("\n")
      : "none";

  return [
    `Strategist: ${salesGuidance.strategist}`,
    `Customer intent: ${guidance.customerIntent}`,
    `Sales state: ${guidance.salesState}`,
    `Buying signal: ${guidance.buyingSignal}`,
    `Objection: ${guidance.objection || "none"}`,
    `Recommended objective: ${guidance.recommendedObjective}`,
    `Recommended direction: ${guidance.recommendedDirection}`,
    `Reason: ${guidance.reason}`,
    `Should ask question: ${
      guidance.shouldAskQuestion
        ? "yes"
        : "no"
    }`,
    `Do not ask again: ${
      guidance.doNotAsk.join(", ") ||
      "none"
    }`,
    `Pressure level: ${guidance.pressureLevel}`,
    `Recommended package: ${recommendedPackage}`,
    `Package recommendation reason: ${recommendationReason}`,
    `Needs general Tetamo facts: ${
      guidance.needsTetamoFacts
        ? "yes"
        : "no"
    }`,
    `General facts requested: ${
      guidance.factsNeeded.join(", ") ||
      "none"
    }`,
    "",
    "APPROVED COMMERCIAL FACTS:",
    commercialFacts,
  ].join("\n");
}

function getCommercialFactsText(
  salesGuidance: MonaSalesGuidance
) {
  if (!salesGuidance.guidance) {
    return "";
  }

  return salesGuidance.guidance
    .commercialFacts
    .join("\n")
    .trim();
}

function stripMarkdownLinks(
  value: string
) {
  let result = value;

  while (true) {
    const middle =
      result.indexOf("](");

    if (middle === -1) {
      break;
    }

    const start =
      result.lastIndexOf(
        "[",
        middle
      );

    const end =
      result.indexOf(
        ")",
        middle + 2
      );

    if (
      start === -1 ||
      end === -1
    ) {
      break;
    }

    const url =
      result.slice(
        middle + 2,
        end
      );

    if (
      !url.startsWith("http://") &&
      !url.startsWith("https://")
    ) {
      break;
    }

    result =
      result.slice(0, start) +
      url +
      result.slice(end + 1);
  }

  return result;
}

function cleanReply(
  value: string
) {
  let reply =
    String(value || "").trim();

  if (
    (
      reply.startsWith('"') &&
      reply.endsWith('"')
    ) ||
    (
      reply.startsWith("“") &&
      reply.endsWith("”")
    )
  ) {
    reply =
      reply.slice(1, -1).trim();
  }

  reply =
    stripMarkdownLinks(reply);

  return reply.trim();
}

function isPaymentQuestion(
  message: string
) {
  return (
    /\b(?:cara|gimana|gmna|gmn|bagaimana)\s+(?:bayar|pembayaran|payment)\b/i.test(
      message
    ) ||
    /\b(?:bayar|pembayaran|payment)\s+(?:pakai|via|lewat|dengan|gimana|gmna|gmn|bagaimana)\b/i.test(
      message
    ) ||
    /\b(?:qris|transfer|bank|kartu|card|ewallet|e-wallet)\b/i.test(
      message
    )
  );
}

function approvedPaymentInformationExists(
  text: string
) {
  return (
    /\b(?:qris|bank transfer|transfer bank|credit card|debit card|kartu kredit|kartu debit|virtual account|ewallet|e-wallet|payment|pembayaran)\b/i.test(
      text
    ) ||
    /https?:\/\/[^\s]+/i.test(
      text
    )
  );
}

function fallbackReply(
  params: WriteMonaReplyParams
): MonaWriterResult {
  if (!params.brain.understood) {
    return {
      action: "handover",
      reply: "",
      source: "fallback",
      reason:
        "Mona could not reliably understand the customer message.",
    };
  }

  if (!params.brain.replyNeeded) {
    return {
      action: "silent",
      reply: "",
      source: "fallback",
    };
  }

  return {
    action: "handover",
    reply: "",
    source: "fallback",
    reason:
      "OpenAI reply generation was unavailable and Mona should not invent a customer-facing response.",
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

  if (
    params.brain.handoverRecommended
  ) {
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

  if (
    params.salesGuidance.guidance
      ?.handoverRecommended
  ) {
    return {
      action: "handover",
      reply: "",
      source: "fallback",
      reason:
        "Mona Sales Strategist recommended human review.",
    };
  }

  const commercialFactsText =
    getCommercialFactsText(
      params.salesGuidance
    );

  const generalFactsText =
    params.knowledge
      .approvedFactsText || "";

  const combinedApprovedFacts =
    [
      commercialFactsText,
      generalFactsText,
    ]
      .filter(Boolean)
      .join("\n");

  if (
    isPaymentQuestion(
      params.latestCustomerMessage
    ) &&
    (
      params.brain.customerType ===
        "agent" ||
      params.brain.customerType ===
        "agency" ||
      params.brain.customerType ===
        "owner"
    ) &&
    !approvedPaymentInformationExists(
      combinedApprovedFacts
    )
  ) {
    return {
      action: "handover",
      reply: "",
      source: "fallback",
      reason:
        "Customer requires payment information, but no approved payment method or payment destination was supplied by Sales AI or Tetamo Knowledge.",
    };
  }

  if (
    params.brain.factualKnowledgeNeeded &&
    !generalFactsText &&
    !commercialFactsText &&
    params.brain.customerType !==
      "unknown"
  ) {
    return {
      action: "handover",
      reply: "",
      source: "fallback",
      reason:
        "The reply requires Tetamo factual information that was not available from Sales AI or Tetamo Knowledge.",
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    return fallbackReply(params);
  }

  const openai =
    new OpenAI({
      apiKey:
        process.env.OPENAI_API_KEY,
    });

  const memoryText =
    buildMemoryText(params.memory);

  const salesText =
    formatSalesGuidance(
      params.salesGuidance
    );

  const approvedGeneralFacts =
    generalFactsText ||
    "No general Tetamo facts were required or retrieved for this reply.";

  const prompt = `
${MONA_WRITER_PROMPT}

CUSTOMER COMMUNICATION STYLE:
Primary language: ${params.brain.languageStyle.primaryLanguage}
Style: ${params.brain.languageStyle.style}

BRAIN DECISION:
Customer type: ${params.brain.customerType}
Situation: ${params.brain.conversationSituation}
Latest meaning: ${params.brain.latestMeaning}
Direct question: ${params.brain.directQuestion || "none"}
Recommended next step: ${params.brain.recommendedNextStep}

KNOWN CONVERSATION CONTEXT:

Summary:
${params.brain.knownContext.summary || "none"}

Important remembered facts:
${
  params.brain.knownContext
    .importantFacts.length
    ? params.brain.knownContext
        .importantFacts
        .map((fact) => `- ${fact}`)
        .join("\n")
    : "none"
}

Topics already answered:
${
  params.brain.knownContext
    .alreadyAnsweredTopics.length
    ? params.brain.knownContext
        .alreadyAnsweredTopics
        .map((topic) => `- ${topic}`)
        .join("\n")
    : "none"
}

PRIVATE SALES GUIDANCE:
${salesText}

GENERAL APPROVED TETAMO KNOWLEDGE:
${approvedGeneralFacts}

ROLE DESTINATIONS:

Developer:
${DEVELOPER_DESTINATION}

Buyer / Renter:
${BUYER_RENTER_DESTINATION}

FACT BOUNDARY:

- Commercial package facts come from APPROVED COMMERCIAL FACTS inside PRIVATE SALES GUIDANCE.
- Broader Tetamo facts come from GENERAL APPROVED TETAMO KNOWLEDGE.
- Do not invent anything outside those supplied sources.
- Do not mention or imply a promo, discount, bonus, campaign offer, special deal or limited offer unless explicitly supplied.
- Campaign history only provides conversation context.
- Campaign history never proves customer role.
- A short affirmative reply does not establish role by itself.
- Do not imply Mona or Tetamo staff will create/upload a listing for the customer.
- If role is unknown, do not use Agent or Owner package facts.

FULL AVAILABLE CONVERSATION FROM THE BEGINNING:
${memoryText}

LATEST CUSTOMER MESSAGE:
${params.latestCustomerMessage}

Write Mona's final WhatsApp reply now.
`.trim();

  try {
    const response =
      await openai.responses.create({
        model: "gpt-4.1-mini",
        input: prompt,
        temperature: 0.45,
        max_output_tokens: 700,
      });

    const raw =
      cleanReply(
        String(
          response.output_text || ""
        )
      );

    if (raw === "[[SILENT]]") {
      return {
        action: "silent",
        reply: "",
        source: "openai",
      };
    }

    if (
      raw ===
      "[[HANDOVER_UNREADABLE]]"
    ) {
      return {
        action: "handover",
        reply: "",
        source: "openai",
        reason:
          "Mona Writer could not reliably understand the customer message.",
      };
    }

    if (
      raw ===
      "[[HANDOVER_MISSING_FACT]]"
    ) {
      return {
        action: "handover",
        reply: "",
        source: "openai",
        reason:
          "The customer needs factual Tetamo information that was not available in approved Sales AI or Knowledge sources.",
      };
    }

    if (!raw) {
      return fallbackReply(params);
    }

    const unsupportedPerformanceClaim =
      /(?:jamin|menjamin|guarantee|guaranteed)\s+(?:lead|leads|closing|sales|penjualan|rentals?|penyewaan|viewing|buyer|buyers|pembeli)|(?:serious|serius|qualified|terkualifikasi)\s+(?:buyer|buyers|pembeli|lead|leads)\s+(?:pasti|guaranteed|terjamin)|(?:pasti|dijamin)\s+(?:closing|laku|terjual|tersewa|dapat\s+lead)/i.test(
        raw
      );

    if (
      unsupportedPerformanceClaim
    ) {
      return {
        action: "handover",
        reply: "",
        source: "fallback",
        reason:
          "Mona generated an unsupported performance guarantee and the reply was blocked before sending.",
      };
    }

    const unknownRoleCommercialLeak =
      params.brain.customerType ===
        "unknown" &&
      /\b(?:silver|gold|agent\s*pro|basic|priority|featured|rp\s*[\d.]|499\.?000|1\.?800\.?000|3\.?999\.?000|50\.?000|150\.?000|550\.?000)\b/i.test(
        raw
      );

    if (
      unknownRoleCommercialLeak
    ) {
      return {
        action: "handover",
        reply: "",
        source: "fallback",
        reason:
          "Mona attempted to expose role-dependent commercial information before the customer's role was established.",
      };
    }

    const assistedListingPromise =
      /\b(?:kami|mona|tim\s+tetamo|tetamo)\s+(?:akan\s+)?(?:buatkan|upload(?:kan)?|pasangkan|postingkan|listingkan|create|upload)\s+(?:listing|iklan|properti|property)?/i.test(
        raw
      );

    if (
      assistedListingPromise
    ) {
      return {
        action: "handover",
        reply: "",
        source: "fallback",
        reason:
          "Mona attempted to imply that Tetamo staff would create or upload the customer's listing.",
      };
    }

    return {
      action: "reply",
      reply: raw,
      source: "openai",
    };
  } catch (error) {
    console.error(
      "Tetamo Mona Writer failed:",
      error
    );

    return fallbackReply(params);
  }
}
/*
 * SCHEDULED SILENCE FOLLOW-UP WRITER
 * ----------------------------------
 *
 * This is deliberately separate from writeMonaReply().
 *
 * There is NO new customer message here.
 *
 * Timing/Orchestrator has already determined that the customer has
 * remained silent and that follow-up #1 or #2 may be due.
 *
 * This function only decides how Mona should phrase that continuation
 * from the real conversation context.
 */
export async function writeMonaFollowUp(
  params: WriteMonaFollowUpParams
): Promise<MonaWriterResult> {
  /*
   * Defense in depth:
   * a real future dependency must never receive the normal 1h/12h chase.
   */
  if (
    params.brain.timingDependency.active ===
    true
  ) {
    return {
      action: "silent",
      reply: "",
      source: "fallback",
    };
  }

  if (
    !params.brain.understood ||
    params.brain.handoverRecommended
  ) {
    return {
      action: "silent",
      reply: "",
      source: "fallback",
    };
  }

  if (
    params.brain.conversationSituation ===
      "rejection"
  ) {
    return {
      action: "silent",
      reply: "",
      source: "fallback",
    };
  }

  if (
    params.salesGuidance.guidance
      ?.handoverRecommended
  ) {
    return {
      action: "silent",
      reply: "",
      source: "fallback",
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      action: "silent",
      reply: "",
      source: "fallback",
    };
  }

  const commercialFactsText =
    getCommercialFactsText(
      params.salesGuidance
    );

  const generalFactsText =
    params.knowledge
      .approvedFactsText || "";

  const memoryText =
    buildMemoryText(
      params.memory
    );

  const salesText =
    formatSalesGuidance(
      params.salesGuidance
    );

  const approvedGeneralFacts =
    generalFactsText ||
    "No general Tetamo facts were required or retrieved for this follow-up.";

  const followUpInstruction =
    params.followUpNumber === 1
      ? `
This is FOLLOW-UP #1.

The customer has been silent after Mona's last real customer-facing message.

Continue the unresolved conversation naturally.

Possible behavior depends entirely on context:
- if Mona was waiting for the customer's role, naturally continue that one unresolved role question;
- if a package had already been selected or discussed, continue from that point without repeating the entire package explanation;
- if payment was the unresolved next action, make a light contextual continuation without pretending payment happened;
- if Mona had asked for required information, briefly continue from that missing information;
- if the last conversation was informational and there is no sensible unresolved action, prefer [[SILENT]] rather than inventing a sales chase.

Do NOT automatically write "masih tertarik?".
Do NOT restart discovery.
Do NOT repeat questions already answered.
Do NOT dump package features again unless genuinely necessary.
Do NOT pressure the customer.
You may ask at most ONE natural question when a real answer is still required.
`
      : `
This is FOLLOW-UP #2.

This is the FINAL normal silence follow-up.

The customer remained silent after Follow-up #1.

Write a lighter, shorter continuation that leaves the door open.

Do NOT restart discovery.
Do NOT repeat package details.
Do NOT repeat the same question word-for-word.
Do NOT use guilt, urgency, pressure, scarcity or fake deadlines.
Do NOT automatically write "masih tertarik?".
Do NOT create a new sales topic.

If there is no natural final continuation, return [[SILENT]].

After this follow-up, the normal silence sequence stops.
`;

  const prompt = `
${MONA_WRITER_PROMPT}

==================================================
SCHEDULED FOLLOW-UP MODE
==================================================

IMPORTANT:
The customer has NOT sent a new message.

Do not behave as though the customer just spoke.

Do not answer an imaginary latest customer message.

This is an intentional continuation of the existing WhatsApp conversation
after customer silence.

${followUpInstruction}

CUSTOMER COMMUNICATION STYLE:
Primary language: ${params.brain.languageStyle.primaryLanguage}
Style: ${params.brain.languageStyle.style}

ESTABLISHED BRAIN STATE:
Customer type: ${params.brain.customerType}
Situation: ${params.brain.conversationSituation}
Latest established meaning: ${params.brain.latestMeaning}
Recommended next step: ${params.brain.recommendedNextStep}

Timing dependency active: ${params.brain.timingDependency.active ? "yes" : "no"}
Timing dependency reason: ${params.brain.timingDependency.reason || "none"}

KNOWN CONVERSATION CONTEXT:

Summary:
${params.brain.knownContext.summary || "none"}

Important remembered facts:
${
  params.brain.knownContext
    .importantFacts.length
    ? params.brain.knownContext
        .importantFacts
        .map((fact) => `- ${fact}`)
        .join("\n")
    : "none"
}

Topics already answered:
${
  params.brain.knownContext
    .alreadyAnsweredTopics.length
    ? params.brain.knownContext
        .alreadyAnsweredTopics
        .map((topic) => `- ${topic}`)
        .join("\n")
    : "none"
}

PRIVATE SALES GUIDANCE:
${salesText}

GENERAL APPROVED TETAMO KNOWLEDGE:
${approvedGeneralFacts}

ROLE DESTINATIONS:

Developer:
${DEVELOPER_DESTINATION}

Buyer / Renter:
${BUYER_RENTER_DESTINATION}

FACT BOUNDARY:

- Commercial package facts come only from APPROVED COMMERCIAL FACTS inside PRIVATE SALES GUIDANCE.
- Broader Tetamo facts come only from GENERAL APPROVED TETAMO KNOWLEDGE.
- Do not invent anything outside those supplied sources.
- Do not imply a promo, discount, bonus, campaign offer, special deal or limited offer unless explicitly supplied.
- Campaign history never establishes customer role.
- If customer role is unknown, do not expose Agent or Owner package facts or prices.
- Do not imply Mona or Tetamo staff will create/upload a listing for the customer.
- Do not promise lead quantity, buyer seriousness, closing, sale, rental or timing results.

FULL AVAILABLE CONVERSATION FROM THE BEGINNING:
${memoryText}

There is NO new customer message after the conversation above.

Write only Mona's scheduled Follow-up #${params.followUpNumber} WhatsApp message.

If no follow-up should be sent, output exactly:
[[SILENT]]
`.trim();

  try {
    const openai =
      new OpenAI({
        apiKey:
          process.env.OPENAI_API_KEY,
      });

    const response =
      await openai.responses.create({
        model: "gpt-4.1-mini",
        input: prompt,
        temperature: 0.4,
        max_output_tokens: 450,
      });

    const raw =
      cleanReply(
        String(
          response.output_text || ""
        )
      );

    if (
      !raw ||
      raw === "[[SILENT]]"
    ) {
      return {
        action: "silent",
        reply: "",
        source: "openai",
      };
    }

    if (
      raw ===
        "[[HANDOVER_UNREADABLE]]" ||
      raw ===
        "[[HANDOVER_MISSING_FACT]]"
    ) {
      /*
       * A scheduled silence follow-up should not force an Admin takeover
       * merely because the AI could not safely phrase a follow-up.
       */
      return {
        action: "silent",
        reply: "",
        source: "fallback",
      };
    }

    const unsupportedPerformanceClaim =
      /(?:jamin|menjamin|guarantee|guaranteed)\s+(?:lead|leads|closing|sales|penjualan|rentals?|penyewaan|viewing|buyer|buyers|pembeli)|(?:serious|serius|qualified|terkualifikasi)\s+(?:buyer|buyers|pembeli|lead|leads)\s+(?:pasti|guaranteed|terjamin)|(?:pasti|dijamin)\s+(?:closing|laku|terjual|tersewa|dapat\s+lead)/i.test(
        raw
      );

    if (
      unsupportedPerformanceClaim
    ) {
      return {
        action: "silent",
        reply: "",
        source: "fallback",
      };
    }

    const unknownRoleCommercialLeak =
      params.brain.customerType ===
        "unknown" &&
      /\b(?:silver|gold|agent\s*pro|basic|priority|featured|rp\s*[\d.]|499\.?000|1\.?800\.?000|3\.?999\.?000|50\.?000|150\.?000|550\.?000)\b/i.test(
        raw
      );

    if (
      unknownRoleCommercialLeak
    ) {
      return {
        action: "silent",
        reply: "",
        source: "fallback",
      };
    }

    const assistedListingPromise =
      /\b(?:kami|mona|tim\s+tetamo|tetamo)\s+(?:akan\s+)?(?:buatkan|upload(?:kan)?|pasangkan|postingkan|listingkan|create|upload)\s+(?:listing|iklan|properti|property)?/i.test(
        raw
      );

    if (
      assistedListingPromise
    ) {
      return {
        action: "silent",
        reply: "",
        source: "fallback",
      };
    }

    return {
      action: "reply",
      reply: raw,
      source: "openai",
    };
  } catch (error) {
    console.error(
      "Tetamo Mona Follow-up Writer failed:",
      error
    );

    return {
      action: "silent",
      reply: "",
      source: "fallback",
    };
  }
}
