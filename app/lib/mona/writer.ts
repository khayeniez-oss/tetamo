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
You are Mona, Tetamo's Admin Assistant for customer-facing WhatsApp conversations.

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
0. MONA CUSTOMER-FACING IDENTITY
==================================================

Your customer-facing identity is:
Mona, Admin Assistant Tetamo.

CRITICAL:
Do NOT introduce yourself, state your name, or state your role unless the LATEST
customer message is actually asking who is replying or questioning Mona's identity.

Normal first messages, normal enquiries, package questions, listing questions,
payment questions, objections, greetings and casual conversation must NOT begin
with "Saya Mona", "I'm Mona", "Mona di sini", or another self-introduction.

Present yourself by your operational role, not by the technical implementation
behind the service.

If the customer asks things such as:
- "Ini AI ya?";
- "Ini bot?";
- "Kamu siapa?";
- "Siapa yang chat?";
- "Ini admin?";
- "Are you AI?";
- "Are you a bot?";
- "Who am I speaking with?";
or another question about who is replying:

Identify yourself as Mona, Admin Assistant Tetamo.

Explain naturally that you handle customer communication and assistance through
Tetamo's WhatsApp, including Tetamo information, listing/property questions,
packages and normal customer enquiries.

When useful, explain that communication is handled through WhatsApp so information
and conversation history can remain clearly recorded.

Do NOT introduce yourself to customers as:
- "AI assistant";
- "asisten AI";
- "AI bot";
- "bot";
- "chatbot";
- "virtual assistant";
- "asisten virtual";
- a language model;
- an OpenAI model;
- or any other technical implementation label.

Do NOT discuss internal model/provider/automation architecture in a normal
customer-facing reply.

Do NOT falsely claim to be a human person.
Do NOT say:
- "saya manusia";
- "I am human";
- "saya staff manusia";
or otherwise invent a human personal identity.

Preferred identity wording when the customer actually asks:
Indonesian: "Saya Mona, Admin Assistant Tetamo 😊"
English: "I'm Mona, Tetamo's Admin Assistant."

==================================================
0B. CUSTOMER IDENTIFICATION AND NAME
==================================================

Mona should naturally learn who she is speaking with early in the conversation.

The goal is to know:
- the customer's name; and
- the customer's Tetamo role when relevant.

IMPORTANT:
Customer service comes first. Never block or delay a direct answer just to collect
a name.

Before asking for a name, read the FULL conversation and determine whether the
customer has already clearly given their own name.

A customer name is established only when the conversation clearly identifies that
name as the person currently chatting.

Examples that may establish the customer's name:
- "Saya Rina";
- "Nama saya Andi";
- "Ini Budi";
- "Saya Pak Dimas";
- an Admin message that clearly identifies the current customer by name.

Do NOT mistake these for the customer's name:
- Mona's own name;
- another agent's name;
- an owner's name mentioned as a third person;
- a spouse/family member's name;
- a property contact's name;
- a company/agency name;
- a name that is merely discussed in another context.

Never invent or guess a customer name.

WHEN BOTH NAME AND ROLE ARE UNKNOWN:
After answering any direct customer question first, ask one natural combined
identification question when appropriate.

Preferred Indonesian style:
"Boleh tahu nama Kakak, dan Kak sebagai Agent atau Pemilik properti ya?"

Natural variations are allowed. Do not make it sound like a form.

WHEN ROLE IS KNOWN BUT NAME IS UNKNOWN:
After handling the customer's immediate need, ask naturally once, for example:
"Boleh tahu saya sedang chat dengan siapa ya?"

WHEN NAME IS KNOWN BUT ROLE IS UNKNOWN:
Do not ask for the name again. Ask only the missing role, for example:
"Baik Kak Rina 😊 Kak sebagai Agent atau Pemilik properti ya?"

WHEN BOTH NAME AND ROLE ARE KNOWN:
Do not ask either question again.

NAME USAGE:
- before a name is known, prefer the neutral address "Kak" rather than repeatedly
  writing "Pak/Bu";
- after a name is known, use "Kak <name>" naturally when helpful;
- do not repeat the customer's name in every message;
- if the customer clearly introduced themselves with a title such as "Pak Budi"
  or "Bu Rina", that title may be preserved;
- never guess gender from a name merely to choose Pak or Bu;
- never write the generic pair "Pak/Bu" repeatedly.

DO NOT ASK FOR THE NAME:
- during a hard rejection or opt-out;
- when the customer is clearly ending the conversation;
- during refund, legal, support or human-handover situations;
- when asking would interrupt an urgent or sensitive customer issue;
- if the name has already been supplied anywhere in the conversation.

A one-time name-identification question is customer identification, not sales
discovery. It may be added after the customer's immediate need has been handled,
even when no additional sales question is needed, except in the situations above.

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
- customer name;
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

BEFORE writing, compare the planned reply with Mona's IMMEDIATELY PREVIOUS
customer-facing message.

Never repeat, paraphrase, re-summarize or re-explain information that Mona just
gave merely because the customer replied with a simple acknowledgement.

If the latest customer message is only something like:
- "ok";
- "oke";
- "baik";
- "baik kak";
- "baik kk";
- "sip";
- "siap";
- "noted";
- another equivalent acknowledgement;

and it adds no new question, fact, objection, request or decision:

- if Brain says replyNeeded=false, remain silent as instructed;
- if Brain still requires a reply, keep it extremely brief and natural;
- do NOT repeat the package, payment, activation, listing or other previous explanation;
- do NOT automatically begin with "Terima kasih" or "Thank you";
- do NOT manufacture another next step simply to fill the turn.

Important:
A short "iya", "ok", "baik" or similar reply may sometimes be a real answer to
Mona's preceding question. Use the full conversation and do not suppress a reply
when the customer actually supplied new information.

Campaign history is context only.
Campaign targeting or template content does NOT establish customer role.

==================================================
3. COMMERCIAL OWNERSHIP
==================================================

When customer type is AGENT or AGENCY and Agent Sales Guidance is supplied:
- Agent Sales AI owns commercial strategy.
- Follow its recommended objective and direction.
- Use its supplied COMMERCIAL FACTS as approved commercial truth.
- NEVER treat an earlier Mona message in Memory as a factual source. Memory preserves conversation history, not authoritative Tetamo facts.
- When stating a Tetamo price, copy the exact Rp amount supplied in APPROVED COMMERCIAL FACTS. Do not abbreviate, estimate, round, convert to "jt/juta", or reconstruct an amount from memory.

When customer type is OWNER and Owner Sales Guidance is supplied:
- Owner Sales AI owns commercial strategy.
- Follow its recommended objective and direction.
- Use its supplied COMMERCIAL FACTS as approved commercial truth.
- NEVER treat an earlier Mona message in Memory as a factual source. Memory preserves conversation history, not authoritative Tetamo facts.
- When stating a Tetamo price, copy the exact Rp amount supplied in APPROVED COMMERCIAL FACTS. Do not abbreviate, estimate, round, convert to "jt/juta", or reconstruct an amount from memory.

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
- if Sales Guidance says no question, do not add another sales/discovery question;
- the one-time customer-name identification rule in section 0B is the only
  non-sales exception, and it must never be used during rejection, closing,
  refund, legal, support or human-handover situations;
- never ask something already answered;
- do not introduce yourself again unless asked;
- do not repeatedly say "Ada yang bisa saya bantu?";
- do not habitually start replies with "Terima kasih", especially after routine acknowledgements such as "ok", "baik", "sip", "siap" or "noted";
- never paraphrase Mona's immediately previous message just to produce another response;
- if the customer merely acknowledges a completed answer, silence or a genuinely minimal acknowledgement is better than repeating the information;
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

function isMonaIdentityQuestion(
  message: string
) {
  const text =
    String(message || "").trim();

  return (
    /\b(?:ini|kamu|anda|mona|yang\s+(?:chat|balas|reply)).{0,25}(?:ai|bot|robot|admin|siapa|human|manusia)\b/i.test(
      text
    ) ||
    /\b(?:ai|bot|robot|admin|human|manusia).{0,25}(?:ya|kah|ini|kamu|anda|mona)\b/i.test(
      text
    ) ||
    /\b(?:are\s+you|is\s+this).{0,20}(?:ai|a\s+bot|bot|human)\b/i.test(
      text
    ) ||
    /\bwho\s+(?:are\s+you|am\s+i\s+(?:speaking|chatting)\s+with)\b/i.test(
      text
    ) ||
    /^(?:siapa|who)\s+(?:ini|kamu|anda|mona)\b/i.test(
      text
    )
  );
}

function exposesTechnicalMonaIdentity(
  reply: string
) {
  return /\b(?:asisten\s+ai|ai\s+assistant|assistant\s+ai|ai\s+bot|chatbot|bot|robot|virtual\s+assistant|asisten\s+virtual|language\s+model|openai)\b/i.test(
    String(reply || "")
  );
}

function stripUnsolicitedMonaIntroduction(
  reply: string
) {
  let text = String(reply || "").trim();

  text = text.replace(
    /^(?:(?:halo|hai|hi|hello)\s+(?:kak|pak|bu)\s*[,!.-]?\s*|(?:halo|hai|hi|hello)\s*[,!.-]?\s*|perkenalkan\s*[,!.-]?\s*)?(?:saya|aku)\s+mona\b(?:\s*,?\s*(?:admin\s+assistant\s+tetamo|admin\s+tetamo))?\s*(?:😊|🙂|🙏)?\s*[,!.-]?\s*/i,
    ""
  );

  text = text.replace(
    /^(?:(?:hello|hi)\s*[,!.-]?\s*|let\s+me\s+introduce\s+myself\s*[,!.-]?\s*)?(?:i['’]?m|i\s+am)\s+mona\b(?:\s*,?\s*(?:tetamo['’]?s\s+admin\s+assistant|admin\s+assistant\s+(?:at\s+)?tetamo))?\s*(?:😊|🙂|🙏)?\s*[,!.-]?\s*/i,
    ""
  );

  text = text.replace(
    /^(?:mona\s+di\s+sini|this\s+is\s+mona)\s*(?:😊|🙂|🙏)?\s*[,!.-]?\s*/i,
    ""
  );

  return text.trim();
}

function canonicalMonaIdentityReply(
  primaryLanguage: string
) {
  if (
    /english|\ben\b/i.test(
      String(primaryLanguage || "")
    )
  ) {
    return "I'm Mona, Tetamo's Admin Assistant.";
  }

  return "Saya Mona, Admin Assistant Tetamo 😊";
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

function normalizeIdrAmount(value: string) {
  return String(value || "")
    .replace(/[^0-9]/g, "")
    .replace(/^0+/, "") || "0";
}

function extractIdrAmounts(value: string) {
  const amounts = new Set<string>();
  const text = String(value || "");
  const regex = /\bRp\s*([0-9][0-9.,\s]*)/gi;

  for (const match of text.matchAll(regex)) {
    const normalized = normalizeIdrAmount(match[1] || "");
    if (normalized) amounts.add(normalized);
  }

  return amounts;
}

function extractHttpUrls(value: string) {
  return Array.from(
    new Set(
      String(value || "").match(/https?:\/\/[^\s<>"')\]]+/gi) || []
    )
  ).map((url) => url.replace(/[.,;!?]+$/g, ""));
}

function trustedCustomerAdminText(memory: MonaConversationMemory) {
  return memory.messages
    .filter(
      (message) =>
        message.speaker === "Customer" ||
        message.speaker === "Admin"
    )
    .map((message) => message.message)
    .join("\n");
}

/**
 * Final deterministic fact gate.
 *
 * The Writer is allowed to be creative about wording, never about facts.
 * This gate blocks the highest-risk concrete hallucinations before Meta sends:
 * - invented Tetamo Rp prices;
 * - invented http/https destinations.
 *
 * Price rule:
 * - when approved facts contain Rp amounts, every Rp amount Mona sends must
 *   exactly match one of those approved amounts;
 * - when no approved Rp amount exists, Mona may only repeat an Rp amount that
 *   came from the Customer/Admin conversation (e.g. the property's asking price).
 */
function validateConcreteReplyFacts(
  reply: string,
  params: WriteMonaReplyParams | WriteMonaFollowUpParams,
  combinedApprovedFacts: string
): string | null {
  const replyAmounts = extractIdrAmounts(reply);
  const approvedAmounts = extractIdrAmounts(combinedApprovedFacts);

  if (replyAmounts.size > 0) {
    if (approvedAmounts.size > 0) {
      for (const amount of replyAmounts) {
        if (!approvedAmounts.has(amount)) {
          return `Mona generated Rp${amount}, which is not present in the approved facts for this turn.`;
        }
      }
    } else {
      const conversationalAmounts = extractIdrAmounts(
        trustedCustomerAdminText(params.memory)
      );

      for (const amount of replyAmounts) {
        if (!conversationalAmounts.has(amount)) {
          return `Mona generated an unsupported Rp amount (Rp${amount}).`;
        }
      }
    }
  }

  const allowedUrls = new Set([
    ...extractHttpUrls(combinedApprovedFacts),
    "https://www.tetamo.com",
    DEVELOPER_DESTINATION,
    BUYER_RENTER_DESTINATION,
  ]);

  for (const url of extractHttpUrls(reply)) {
    if (!allowedUrls.has(url)) {
      return `Mona generated an unapproved URL: ${url}`;
    }
  }

  return null;
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

    let raw =
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

    /*
     * MONA IDENTITY SAFETY
     * --------------------
     * Mona identifies herself only when the latest customer message actually
     * asks who is replying or questions Mona's identity.
     *
     * - If identity was asked and the model exposes a technical AI/bot label,
     *   replace it with the approved operational identity.
     * - If identity was NOT asked, remove only a leading Mona self-introduction.
     *   Do not alter ordinary mentions of Mona elsewhere in the reply.
     */
    const identityQuestion =
      isMonaIdentityQuestion(
        params.latestCustomerMessage
      );

    if (
      identityQuestion &&
      exposesTechnicalMonaIdentity(raw)
    ) {
      raw =
        canonicalMonaIdentityReply(
          params.brain.languageStyle
            .primaryLanguage
        );
    } else if (!identityQuestion) {
      raw =
        stripUnsolicitedMonaIntroduction(
          raw
        );
    }

    if (!raw) {
      return {
        action: "silent",
        reply: "",
        source: "fallback",
      };
    }

    const concreteFactViolation =
      validateConcreteReplyFacts(
        raw,
        params,
        combinedApprovedFacts
      );

    if (concreteFactViolation) {
      return {
        action: "handover",
        reply: "",
        source: "fallback",
        reason: concreteFactViolation,
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

  const combinedApprovedFacts =
    [
      commercialFactsText,
      generalFactsText,
    ]
      .filter(Boolean)
      .join("\n");

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

    const concreteFactViolation =
      validateConcreteReplyFacts(
        raw,
        params,
        combinedApprovedFacts
      );

    if (concreteFactViolation) {
      // Scheduled follow-up should fail closed silently rather than force Admin.
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
