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

EXTERNAL IDENTITY:
- Your customer-facing identity is: Mona, Admin Assistant for Tetamo.
- If the customer asks who they are talking to, who is replying, whether this is admin,
  whether this is AI, a bot, chatbot, robot, automated system, GPT/ChatGPT, human,
  "admin asli", "bot ya", "AI kah", "ini auto", "siapa ini", "sama siapa",
  or equivalent Indonesian slang/typos/shorthand, do NOT discuss the underlying technology.
- Do NOT say you are AI, a bot, chatbot, robot, OpenAI, ChatGPT, GPT, model, or automation.
- Do NOT claim to be human either.
- Simply identify yourself naturally as Mona, Admin Assistant for Tetamo.
- NEVER begin an answer to an AI/bot identity challenge with "iya", "ya", "yes",
  "betul", "benar", "correct", or another confirmation word because that confirms
  the customer's premise.
- Do not directly confirm or deny the AI/bot premise. State Mona's approved external
  identity instead.
- Never expose internal components such as Brain, Agent Sales, Owner Sales,
  Knowledge, Orchestrator, strategist, internal routing, or internal reasoning.
- If the customer asks an identity question together with a real Tetamo question,
  identify yourself briefly and answer the real question in the same message.
- Do not let an identity question derail the commercial/support conversation.

IDENTITY REPETITION RULE:
- Read the FULL conversation before answering an identity question.
- If Mona already identified herself earlier, do NOT repeat the same introduction.
- If the customer asks the same identity question again, answer naturally without
  repeating "Saya Mona, Admin Assistant Tetamo".
- A later reply may simply say "Saya yang handle chat ini untuk Tetamo Kak." and
  continue the customer's actual topic.

SEMANTIC AUTHORITY:
- Use the RAW customer message to understand the customer's writing style only.
- Use Brain's normalizedMessage and latestMeaning as the authoritative semantic
  interpretation of what the customer said.
- Do NOT independently reinterpret Indonesian WhatsApp shorthand after Brain has
  already resolved it.
- Example: if Brain normalized "byr" as "bayar", do not reinterpret it as "buyer".
- If Brain marks clarification as needed, follow that clarification decision
  instead of guessing.

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
3. CLARIFICATION
==================================================

Brain owns ambiguity handling.

If Brain says clarification.needed=true:
- ask exactly ONE short, natural clarification that matches clarification.goal;
- do not invent an interpretation;
- do not route yourself into a commercial journey;
- do not ask multiple questions;
- do not ask the same clarification again if Brain says it was already attempted.

If Brain says a general Tetamo fact should be answered before role clarification:
- answer that approved factual question first;
- then ask the ONE short role/journey clarification.

Writer does NOT decide that an unclear message needs Admin.
Brain decides whether the first ambiguity gets one clarification or whether the
conversation has already exhausted that clarification and genuinely requires
handover.

==================================================
4. COMMERCIAL OWNERSHIP
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
5. GENERAL TETAMO KNOWLEDGE
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
6. DIRECT QUESTIONS
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

ANSWER COMPLETENESS:
- If the customer asks for package names, prices, fees, capacities, or package
  differences and the relevant approved facts are supplied, answer with those
  facts NOW.
- Do not say "I can send the details", "boleh saya kirim paketnya", "nanti saya
  kirim", or similar when the approved information is already available in this
  turn.
- Do not make the customer ask a second time for information already supplied to
  you internally.

==================================================
7. ASSISTED LISTING RULE
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
8. DEVELOPER AND BUYER/RENTER ROUTES
==================================================

If Brain says DEVELOPER:
- do not sell Agent or Owner packages;
- direct them naturally to the Developer destination supplied below.

If Brain says BUYER_RENTER:
- do not sell Agent or Owner packages;
- direct them naturally to the Buyer/Renter destination supplied below.

==================================================
9. SALES CONVERSATION STYLE
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
- an objection is a normal sales conversation, NOT a reason to ignore the customer;
- when Sales Guidance says recommendedObjective="handle_objection", you MUST write a substantive objection response;
- acknowledge the customer's actual concern briefly;
- answer the concern directly before asking anything else;
- follow Sales Guidance recommendedDirection as the sales strategy;
- use relevant APPROVED COMMERCIAL FACTS and GENERAL APPROVED TETAMO KNOWLEDGE as factual support;
- do not merely say "saya mengerti", "baik Kak", "noted", or another acknowledgement without answering the concern;
- do not replace the objection response with a generic discovery question;
- do not restart qualification unless Sales Guidance explicitly says one material question is required;
- if Sales Guidance says shouldAskQuestion=false, do not add a question;
- do not argue;
- do not attack competitors;
- do not become defensive;
- do not immediately discount unless an approved promotion exists;
- do not promise that Tetamo will produce a better result than another portal;
- do not guarantee leads, views, enquiries, buyers, sales, rentals, conversions, or closing;
- if approved factual support is available, use enough of it to explain WHY Tetamo may still be relevant to the customer's concern;
- never ignore the objection and never leave the customer without a substantive answer.

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
10. PAYMENT
==================================================

For payment questions:
- answer directly;
- use only payment information explicitly present in COMMERCIAL FACTS or GENERAL APPROVED TETAMO KNOWLEDGE;
- do not invent payment methods;
- do not invent payment links;
- do not invent bank-transfer instructions, bank account details, rekening numbers, or manual transfer flows;
- do not invent named banks or named e-wallets such as BCA, BNI, BRI, Mandiri, OVO, GoPay, DANA, LinkAja, ShopeePay, or others unless those exact names are explicitly supplied in approved facts for this turn;
- do not claim multiple payment options unless supported;
- do not say "I can send the link", "saya kirim rekening", "saya kirim detail rekening", or similar unless an appropriate approved link/account detail is actually supplied;
- when approved commercial facts specify Tetamo Partner App -> QRIS for Agent payment, preserve that exact operational path;
- when approved commercial facts specify Owner checkout -> QRIS for Owner payment, preserve that exact operational path;
- never replace an approved QRIS flow with bank transfer, direct transfer, manual rekening payment, or invented e-wallet choices.

If the customer genuinely requires a factual payment instruction that is absent
from both approved sources:
- do not invent it;
- do not claim the payment method is unsupported;
- briefly say that you cannot confirm that specific detail from the approved
  information available;
- do NOT hand over merely because a factual detail is missing.
A human handover happens only when Brain or an approved Sales decision has
already determined that real staff action/access is required.

==================================================
11. PERFORMANCE AND BUYER CLAIMS
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
12. WHATSAPP WRITING STYLE
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

Examples of the customer's natural shorthand may include:
brp, gmn, gmna, dmn, drmn, knp, klo, kpn, udh, sy, sya, ga, gak, gk,
nggak, ngga, yg, dgn, bgt, bngt, blm, msh, bs, bsa, mw, mo, pgn, jd,
jdi, skrg, kmrn, byr, byrnya, hrg, hrgnya, rmh, djual, d jual, dsewa,
disewain, sosmed, kepo, closing, listing, leads, inquiry, owner, agen,
agent, and many other compressed forms.

Do not treat this as a fixed dictionary. Brain has already normalized the latest
message. Use the raw message only to mirror the customer's level of casualness,
sentence length, Indonesian/English mix, and WhatsApp rhythm.

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
- do not automatically begin every turn with "Baik Kak", "Terima kasih",
  "Tentu", "Siap", or another filler acknowledgement;
- when the customer asked a direct question, prefer answering it immediately;
- do not end every message with a question;
- zero or one subtle emoji when appropriate;
- avoid decorative emoji;
- no unnecessary greeting every turn.

==================================================
13. SILENCE / HANDOVER
==================================================

If Brain says no reply is needed, output exactly:

[[SILENT]]

Writer does NOT independently create an Admin handover because:
- a message is hard to understand;
- Knowledge returned no match;
- an approved factual detail is missing;
- OpenAI generation failed;
- Writer produced a bad draft.

For ambiguity, follow Brain's clarification decision.
For missing factual detail, state only that the specific detail cannot be
confirmed from the approved information available, without inventing a negative
claim.

Actual human handover is controlled by Brain or a genuine approved Sales
handover condition before Writer composes the reply.

Do NOT hand over merely because general Knowledge is empty when the required
commercial information is already supplied by Sales AI.

==================================================
14. FINAL OUTPUT
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

function customerAskedIdentity(
  params: WriteMonaReplyParams
) {
  const signal = [
    params.latestCustomerMessage,
    params.brain.normalizedMessage,
    params.brain.latestMeaning,
    params.brain.directQuestion || "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /(?:siapa\s+(?:ini|kamu|anda|yg|yang)|sama\s+siapa|ngobrol\s+sama\s+siapa|yang\s+bales\s+siapa|yg\s+bales\s+siapa|admin(?:nya)?\s+siapa|ini\s+admin|admin\s+asli|real\s+admin|are\s+you\s+(?:ai|a\s+bot|bot|chatbot|human|real)|you\s+ai|you\s+a\s+bot|ini\s+(?:ai|bot|chatbot|robot|auto|otomatis|mesin|gpt|chatgpt)|(?:ai|bot|chatbot|robot|otomatis|auto|gpt|chatgpt)\s+(?:ya|kah|kan|bukan)|kamu\s+(?:ai|bot|chatbot|robot)|km\s+(?:ai|bot)|lu\s+(?:ai|bot)|manusia\s+apa\s+bot|orang\s+apa\s+bot|yg\s+jawab\s+manusia|yang\s+jawab\s+manusia)/i.test(
    signal
  );
}

function monaAlreadyIdentifiedHerself(
  memory: MonaConversationMemory
) {
  return memory.messages.some((item) => {
    if (item.speaker !== "Mona") return false;

    return /(?:saya\s+mona|aku\s+mona|i'?m\s+mona|i\s+am\s+mona|mona\s+dari\s+tetamo|mona,?\s*admin\s+assistant|admin\s+assistant\s+tetamo)/i.test(
      item.message
    );
  });
}

function deterministicIdentityReply(
  params: WriteMonaReplyParams
): MonaWriterResult | null {
  if (!customerAskedIdentity(params)) {
    return null;
  }

  const language =
    params.brain.languageStyle.primaryLanguage;

  const alreadyIdentified =
    monaAlreadyIdentifiedHerself(
      params.memory
    );

  const identityText =
    alreadyIdentified
      ? language === "en"
        ? "I'm the one handling this chat for Tetamo."
        : "Saya yang handle chat ini untuk Tetamo Kak."
      : language === "en"
        ? "I'm Mona, Admin Assistant for Tetamo."
        : "Saya Mona, Admin Assistant Tetamo Kak.";

  if (
    params.brain.clarification.needed &&
    !params.brain.clarification.alreadyAttempted
  ) {
    if (
      params.brain.clarification.kind ===
      "role"
    ) {
      return {
        action: "reply",
        reply:
          language === "en"
            ? `${identityText} May I know whether you're here as a property agent/agency, property owner, developer, or looking to buy/rent?`
            : `${identityText} Boleh tahu Kak, di sini sebagai agen/agency, pemilik properti, developer, atau sedang cari properti untuk beli/sewa?`,
        source: "fallback",
      };
    }

    if (
      params.brain.clarification.kind ===
      "journey_choice"
    ) {
      return {
        action: "reply",
        reply:
          language === "en"
            ? `${identityText} Which would you like to handle first: your Agent side or Property Owner side?`
            : `${identityText} Kak mau bahas yang sebagai Agent atau Pemilik properti dulu?`,
        source: "fallback",
      };
    }
  }

  return {
    action: "reply",
    reply: identityText,
    source: "fallback",
  };
}

function fallbackClarificationReply(
  params: WriteMonaReplyParams
): MonaWriterResult | null {
  if (!params.brain.clarification.needed) {
    return null;
  }

  const language =
    params.brain.languageStyle.primaryLanguage;

  let reply: string;

  if (
    params.brain.clarification.kind ===
    "journey_choice"
  ) {
    reply =
      language === "en"
        ? "Which would you like to handle first: your Agent side or your Property Owner side?"
        : "Kak mau bahas yang sebagai Agent atau sebagai Pemilik properti dulu?";
  } else if (
    params.brain.clarification.kind ===
    "role"
  ) {
    reply =
      language === "en"
        ? "May I know which applies to you here: property agent/agency, property owner, developer, or are you looking to buy or rent?"
        : "Boleh tahu Kak, di sini Anda sebagai agen/agency, pemilik properti, developer, atau sedang cari properti untuk beli/sewa?";
  } else {
    reply =
      language === "en"
        ? "Could you clarify what you mean there so I don't misunderstand you?"
        : "Maksudnya yang bagian mana ya Kak? Boleh dijelasin sedikit biar saya nggak salah tangkap.";
  }

  return {
    action: "reply",
    reply,
    source: "fallback",
  };
}

function deterministicObjectionFallbackReply(
  params: WriteMonaReplyParams
): MonaWriterResult | null {
  const guidance =
    params.salesGuidance.guidance;

  if (
    !guidance ||
    guidance.recommendedObjective !==
      "handle_objection"
  ) {
    return null;
  }

  const language =
    params.brain.languageStyle.primaryLanguage;

  const objection =
    String(guidance.objection || "")
      .toLowerCase();

  const signal = [
    objection,
    params.latestCustomerMessage,
    params.brain.normalizedMessage,
    params.brain.latestMeaning,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const approvedText = [
    guidance.commercialFacts.join("\n"),
    params.knowledge.approvedFactsText || "",
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();

  const approvedValuePartsId: string[] = [];
  const approvedValuePartsEn: string[] = [];

  if (
    /\bmarketplace\b|property-specific|property marketplace|marketplace properti/i.test(
      approvedText
    )
  ) {
    approvedValuePartsId.push(
      "marketplace yang khusus untuk properti"
    );
    approvedValuePartsEn.push(
      "a property-focused marketplace"
    );
  }

  if (
    /buyer matching|matching|match(?:ing)? buyer|pencocokan|mencocokkan/i.test(
      approvedText
    )
  ) {
    approvedValuePartsId.push(
      "buyer/renter matching"
    );
    approvedValuePartsEn.push(
      "buyer/renter matching"
    );
  }

  if (
    /direct whatsapp|whatsapp enquir|direct enquiry|direct inquiry|langsung.*whatsapp/i.test(
      approvedText
    )
  ) {
    approvedValuePartsId.push(
      "inquiry langsung lewat WhatsApp"
    );
    approvedValuePartsEn.push(
      "direct WhatsApp enquiries"
    );
  }

  if (
    /leads dashboard|lead dashboard/i.test(
      approvedText
    )
  ) {
    approvedValuePartsId.push(
      "Leads Dashboard"
    );
    approvedValuePartsEn.push(
      "the Leads Dashboard"
    );
  }

  if (
    /viewing schedule|schedule viewing|jadwal viewing/i.test(
      approvedText
    )
  ) {
    approvedValuePartsId.push(
      "Viewing Schedule"
    );
    approvedValuePartsEn.push(
      "Viewing Schedule"
    );
  }

  if (
    /social media|marketing exposure|exposure|promosi|promotion|visibility|visibilitas/i.test(
      approvedText
    )
  ) {
    approvedValuePartsId.push(
      "tambahan exposure pemasaran"
    );
    approvedValuePartsEn.push(
      "additional marketing exposure"
    );
  }

  const uniqueId =
    Array.from(
      new Set(approvedValuePartsId)
    ).slice(0, 4);

  const uniqueEn =
    Array.from(
      new Set(approvedValuePartsEn)
    ).slice(0, 4);

  const valueId =
    uniqueId.length
      ? ` Yang Tetamo tambahkan adalah ${uniqueId.join(", ")}.`
      : "";

  const valueEn =
    uniqueEn.length
      ? ` What Tetamo adds is ${uniqueEn.join(", ")}.`
      : "";

  const noGuaranteeId =
    "Tetamo juga tidak menjamin lead atau closing, jadi saya tidak mau menjanjikan hasil yang belum pasti.";

  const noGuaranteeEn =
    "Tetamo also does not guarantee leads or closing, so I do not want to promise an outcome that cannot be guaranteed.";

  let reply: string;

  if (
    /bad_past|past.*experience|kapok|trauma|pernah.*bayar|dulu.*bayar|ga.*dapet.*lead|gak.*dapet.*lead|nggak.*dapet.*lead|tidak.*dapat.*lead/i.test(
      signal
    )
  ) {
    reply =
      language === "en"
        ? `I understand why you'd be cautious after paying another portal and not getting leads. ${noGuaranteeEn}${valueEn}`
        : `Paham Kak kenapa jadi kapok setelah pernah bayar portal tapi tidak dapat lead. ${noGuaranteeId}${valueId}`;
  } else if (
    /self_marketing|facebook|instagram|\bfb\b|\big\b|post.*sendiri|gratis|free/i.test(
      signal
    )
  ) {
    reply =
      language === "en"
        ? `You can absolutely keep posting on Facebook or Instagram yourself. Tetamo is not meant to replace those free channels; it can be used as an additional property channel.${valueEn} ${noGuaranteeEn}`
        : `Posting sendiri di Facebook atau Instagram tetap bisa Kak. Tetamo bukan untuk menggantikan channel gratis itu, tapi bisa dipakai sebagai channel properti tambahan.${valueId} ${noGuaranteeId}`;
  } else if (
    /competitor|existing_portal|rumah\s*123|99\.?co|portal lain|platform lain/i.test(
      signal
    )
  ) {
    reply =
      language === "en"
        ? `You can keep using the other portal as well. Tetamo can be an additional property channel rather than a replacement.${valueEn} ${noGuaranteeEn}`
        : `Portal yang sekarang tetap bisa dipakai Kak. Tetamo bisa jadi channel properti tambahan, bukan harus menggantikan platform yang sudah digunakan.${valueId} ${noGuaranteeId}`;
  } else if (
    /guarantee|jamin|closing|kalau.*(?:ga|gak|nggak|tidak).*lead/i.test(
      signal
    )
  ) {
    reply =
      language === "en"
        ? `${noGuaranteeEn}${valueEn}`
        : `${noGuaranteeId}${valueId}`;
  } else if (
    /buyer_quality|lead quality|serius|qualified|kepo/i.test(
      signal
    )
  ) {
    reply =
      language === "en"
        ? `Tetamo cannot guarantee that every buyer or lead will be serious or ready to transact.${valueEn}`
        : `Tetamo tidak bisa menjamin setiap buyer atau lead pasti serius atau siap transaksi Kak.${valueId}`;
  } else if (
    /credibility|traffic|proof|bukti|testimonial|testimoni|baru|rame|ramai/i.test(
      signal
    )
  ) {
    reply =
      language === "en"
        ? `I don't want to give you traffic, user, or result claims that are not verified.${valueEn}`
        : `Saya tidak mau kasih angka traffic, jumlah user, atau klaim hasil yang belum terverifikasi Kak.${valueId}`;
  } else {
    reply =
      language === "en"
        ? `I understand the concern. ${noGuaranteeEn}${valueEn}`
        : `Paham Kak kekhawatirannya. ${noGuaranteeId}${valueId}`;
  }

  return {
    action: "reply",
    reply: reply
      .replace(/\s+/g, " ")
      .trim(),
    source: "fallback",
  };
}

function fallbackReply(
  params: WriteMonaReplyParams
): MonaWriterResult {
  /*
   * Only Brain / approved Sales logic can create a human handover.
   * Writer or OpenAI failure must never pause Mona by itself.
   */
  if (params.brain.handoverRecommended) {
    return {
      action: "handover",
      reply: "",
      source: "fallback",
      reason:
        params.brain.handoverReason ||
        "Mona Brain determined that human action is required.",
    };
  }

  if (!params.brain.replyNeeded) {
    return {
      action: "silent",
      reply: "",
      source: "fallback",
    };
  }

  const clarification =
    fallbackClarificationReply(params);

  if (clarification) {
    return clarification;
  }

  /*
   * A live Sales objection must never disappear just because Writer generation
   * or validation failed. Sales already decided that this turn requires a
   * substantive response, so use a deterministic, fact-bounded objection reply.
   */
  const objectionFallback =
    deterministicObjectionFallbackReply(
      params
    );

  if (objectionFallback) {
    return objectionFallback;
  }

  /*
   * For non-objection technical failures, remain silent rather than inventing
   * content or creating a false Needs Admin state.
   */
  return {
    action: "silent",
    reply: "",
    source: "fallback",
  };
}

function paymentFactBoundaryViolation(
  raw: string,
  commercialFactsText: string,
  generalFactsText: string
): string | null {
  const approvedText = [
    commercialFactsText,
    generalFactsText,
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();

  const draft = raw.toLowerCase();

  const approvedQris = /\bqris\b/i.test(approvedText);
  const approvedTetamoPartner =
    /tetamo partner/i.test(approvedText);
  const approvedOwnerCheckout =
    /owner (?:listing )?checkout|tetamo owner checkout/i.test(
      approvedText
    );

  const approvedDirectBankTransfer =
    /(?:direct|langsung).{0,25}(?:bank transfer|transfer bank|rekening)|(?:bank transfer|transfer bank).{0,25}(?:tetamo bank account|rekening tetamo)/i.test(
      approvedText
    );

  const draftInventsDirectBankTransfer =
    /(?:transfer\s+bank|transfer\s+ke\s+rekening|rekening\s+tetamo|detail\s+rekening|nomor\s+rekening|kirim\s+(?:detail\s+)?rekening|bank\s+transfer)/i.test(
      draft
    );

  if (
    draftInventsDirectBankTransfer &&
    !approvedDirectBankTransfer
  ) {
    return "The draft invented a direct bank-transfer/rekening payment flow that was not present in approved facts.";
  }

  const namedPaymentBrands = [
    "ovo",
    "gopay",
    "go pay",
    "dana",
    "linkaja",
    "link aja",
    "shopeepay",
    "shopee pay",
    "bca",
    "bni",
    "bri",
    "mandiri",
    "cimb",
    "permata",
  ];

  for (const brand of namedPaymentBrands) {
    if (
      draft.includes(brand) &&
      !approvedText.includes(brand)
    ) {
      return `The draft invented the payment brand "${brand}" even though it was not supplied in approved facts.`;
    }
  }

  if (
    approvedQris &&
    !/\bqris\b/i.test(draft)
  ) {
    return "Approved facts specify QRIS for this payment flow, but the draft omitted QRIS.";
  }

  if (
    approvedTetamoPartner &&
    !/tetamo\s+partner/i.test(draft)
  ) {
    return "Approved Agent payment facts require the Tetamo Partner app, but the draft omitted it.";
  }

  if (
    approvedOwnerCheckout &&
    !/(?:checkout|tetamo)/i.test(draft)
  ) {
    return "Approved Owner payment facts require the Tetamo Owner checkout flow, but the draft omitted it.";
  }

  return null;
}

function objectionResponseViolation(
  raw: string,
  params: WriteMonaReplyParams,
  commercialFactsText: string,
  generalFactsText: string
): string | null {
  const guidance =
    params.salesGuidance.guidance;

  if (
    !guidance ||
    guidance.recommendedObjective !==
      "handle_objection"
  ) {
    return null;
  }

  const draft = raw.trim();

  if (!draft) {
    return "Sales required objection handling, but Writer returned no substantive response.";
  }

  /*
   * Reject generic acknowledgement-only answers. These are common ways a model
   * can technically reply while still failing to handle the objection.
   */
  const acknowledgementOnly =
    /^(?:baik|iya|ya|oke|ok|noted|mengerti|saya mengerti|paham|saya paham|wajar|terima kasih|thanks)(?:\s+(?:kak|pak|bu))?[.! ]*$/i.test(
      draft
    );

  if (acknowledgementOnly) {
    return "Sales required objection handling, but Writer only acknowledged the customer without answering the objection.";
  }

  const asksQuestion =
    draft.includes("?");

  if (
    guidance.shouldAskQuestion === false &&
    asksQuestion
  ) {
    return "Sales required a direct objection response with no question, but Writer added a question instead of simply resolving the concern.";
  }

  /*
   * If factual support exists, the objection reply should contain at least some
   * concrete Tetamo substance rather than a generic empathy statement.
   */
  const approvedText = [
    commercialFactsText,
    generalFactsText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const hasApprovedSupport =
    approvedText.trim().length > 0;

  if (hasApprovedSupport) {
    const concreteTetamoSubstance =
      /\b(?:tetamo|marketplace|listing|buyer|pembeli|penyewa|lead|leads|whatsapp|viewing|partner|aplikasi|app|exposure|visibility|visibilitas|matching|match|database|google|instagram|facebook|tiktok|featured|boost|spotlight|dashboard|verifikasi|verified|promosi|iklan|property|properti)\b/i.test(
        draft
      );

    if (!concreteTetamoSubstance) {
      return "Sales required objection handling and approved Tetamo support was available, but Writer did not use any concrete Tetamo value or factual support.";
    }
  }

  /*
   * Prevent Writer from deferring a live objection when Sales has already chosen
   * the strategy and facts are present.
   */
  const defersInsteadOfAnswering =
    /(?:nanti\s+(?:saya|kami)\s+(?:jelaskan|kirim)|saya\s+akan\s+(?:cek|tanyakan|kirim)|boleh\s+saya\s+(?:cek|tanyakan)|saya\s+teruskan|hubungi\s+admin|tim\s+kami\s+akan\s+hubungi)/i.test(
      draft
    );

  if (defersInsteadOfAnswering) {
    return "Sales required the objection to be handled now, but Writer deferred the answer instead.";
  }

  return null;
}

function replyViolationReason(
  raw: string,
  params: WriteMonaReplyParams,
  commercialFactsText: string,
  generalFactsText: string
): string | null {
  const unsupportedPerformanceClaim =
    /(?:jamin|menjamin|guarantee|guaranteed)\s+(?:lead|leads|closing|sales|penjualan|rentals?|penyewaan|viewing|buyer|buyers|pembeli)|(?:serious|serius|qualified|terkualifikasi)\s+(?:buyer|buyers|pembeli|lead|leads)\s+(?:pasti|guaranteed|terjamin)|(?:pasti|dijamin)\s+(?:closing|laku|terjual|tersewa|dapat\s+lead)/i.test(
      raw
    );

  if (unsupportedPerformanceClaim) {
    return "The draft made an unsupported performance or buyer-quality guarantee.";
  }

  const paymentViolation =
    paymentFactBoundaryViolation(
      raw,
      commercialFactsText,
      generalFactsText
    );

  if (paymentViolation) {
    return paymentViolation;
  }

  const objectionViolation =
    objectionResponseViolation(
      raw,
      params,
      commercialFactsText,
      generalFactsText
    );

  if (objectionViolation) {
    return objectionViolation;
  }

  const unknownRoleCommercialLeak =
    params.brain.customerType ===
      "unknown" &&
    /\b(?:silver|gold|agent\s*pro|basic|priority|featured|rp\s*[\d.]|499\.?000|1\.?800\.?000|3\.?999\.?000|50\.?000|150\.?000|550\.?000)\b/i.test(
      raw
    );

  if (unknownRoleCommercialLeak) {
    return "The draft exposed role-dependent package information before the customer's role was established.";
  }

  const assistedListingPromise =
    /\b(?:kami|mona|tim\s+tetamo|tetamo)\s+(?:akan\s+)?(?:buatkan|upload(?:kan)?|pasangkan|postingkan|listingkan|create|upload)\s+(?:listing|iklan|properti|property)?/i.test(
      raw
    );

  if (assistedListingPromise) {
    return "The draft implied that Mona or Tetamo staff would create/upload the customer's listing.";
  }

  const internalArchitectureLeak =
    /\b(?:mona\s+brain|agent\s+sales(?:\s+ai)?|owner\s+sales(?:\s+ai)?|sales\s+strategist|knowledge\s+system|orchestrator|internal\s+routing|internal\s+reasoning)\b/i.test(
      raw
    );

  if (internalArchitectureLeak) {
    return "The draft exposed Mona's private internal architecture.";
  }

  const aiIdentityLeak =
    /\b(?:openai|chatgpt)\b|\b(?:saya|aku|i\s+am|i'm)\s+(?:adalah\s+)?(?:ai|bot|chatbot|an\s+ai|a\s+bot)\b/i.test(
      raw
    );

  if (aiIdentityLeak) {
    return "The draft described Mona as AI/bot/OpenAI/ChatGPT instead of simply Mona from Tetamo.";
  }

  const semanticQuestion = [
    params.brain.normalizedMessage,
    params.brain.latestMeaning,
    params.brain.directQuestion || "",
  ]
    .join(" ")
    .toLowerCase();

  const asksCommercialPackageOrPrice =
    /\b(?:paket|package|harga|price|biaya|fee|membership|berapa|bayar)\b/i.test(
      semanticQuestion
    );

  const approvedCommercialAnswerAvailable =
    /\b(?:silver|gold|agent\s*pro|basic\s+listing|priority\s+listing|featured\s+listing|rp\s*[\d.])/i.test(
      commercialFactsText
    );

  const draftActuallyUsesCommercialAnswer =
    /\b(?:silver|gold|agent\s*pro|basic(?:\s+listing)?|priority(?:\s+listing)?|featured(?:\s+listing)?|rp\s*[\d.])/i.test(
      raw
    );

  if (
    asksCommercialPackageOrPrice &&
    approvedCommercialAnswerAvailable &&
    !draftActuallyUsesCommercialAnswer
  ) {
    return "The customer asked for package/price information, approved commercial facts were available, but the draft deferred or failed to give the answer.";
  }

  if (params.brain.clarification.needed) {
    const looksLikeClarification =
      raw.includes("?") ||
      /\b(?:maksud|boleh\s+tahu|yang\s+mana|agen|agent|agency|pemilik|owner|developer|beli|sewa|which|what\s+do\s+you\s+mean|may\s+i\s+know)\b/i.test(
        raw
      );

    if (!looksLikeClarification) {
      return "Brain required one clarification, but the draft did not actually ask a clarification question.";
    }
  }

  return null;
}

export async function writeMonaReply(
  params: WriteMonaReplyParams
): Promise<MonaWriterResult> {
  /*
   * Brain owns clarification and human handover.
   * Do not turn Writer uncertainty into Needs Admin.
   */
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

  if (!params.brain.understood) {
    return fallbackReply(params);
  }

  if (!params.brain.replyNeeded) {
    return {
      action: "silent",
      reply: "",
      source: "fallback",
    };
  }

  const identityReply =
    deterministicIdentityReply(params);

  if (identityReply) {
    return identityReply;
  }

  if (
    params.salesGuidance.guidance
      ?.semanticConflict.detected
  ) {
    /*
     * Orchestrator should intercept semantic conflict and return it to Brain
     * once. Writer must not answer from a disputed interpretation.
     */
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
        "Approved Sales logic determined that human commercial action is required.",
    };
  }

  const commercialFactsText =
    getCommercialFactsText(
      params.salesGuidance
    );

  const generalFactsText =
    params.knowledge
      .approvedFactsText || "";

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
Normalized latest message: ${params.brain.normalizedMessage}
Latest meaning: ${params.brain.latestMeaning}
Direct question: ${params.brain.directQuestion || "none"}
Clarification needed: ${params.brain.clarification.needed ? "yes" : "no"}
Clarification kind: ${params.brain.clarification.kind}
Clarification already attempted: ${params.brain.clarification.alreadyAttempted ? "yes" : "no"}
Clarification goal: ${params.brain.clarification.goal || "none"}
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

OBJECTION EXECUTION RULE:
${
  params.salesGuidance.guidance?.recommendedObjective === "handle_objection"
    ? `ACTIVE. The customer raised a sales objection.
You MUST answer the objection substantively in this reply.
Do not ignore it, defer it, hand it off, or replace it with generic discovery.
Use the strategist's Recommended direction as the sales approach.
Use only supplied approved facts as factual support.
Should ask question: ${
        params.salesGuidance.guidance.shouldAskQuestion ? "yes" : "no"
      }.`
    : "Not active for this turn."
}

GENERAL APPROVED TETAMO KNOWLEDGE:
Knowledge status: ${params.knowledge.status}
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
    const createDraft = async (
      input: string
    ) => {
      const response =
        await openai.responses.create({
          model: "gpt-4.1-mini",
          input,
          temperature: 0.45,
          max_output_tokens: 700,
        });

      return cleanReply(
        String(
          response.output_text || ""
        )
      );
    };

    let raw =
      await createDraft(prompt);

    const tokenViolation = (
      value: string
    ) => {
      if (
        value ===
          "[[HANDOVER_UNREADABLE]]" ||
        value ===
          "[[HANDOVER_MISSING_FACT]]"
      ) {
        return "Writer attempted to create an Admin handover instead of following Brain/fact-boundary rules.";
      }

      if (
        value === "[[SILENT]]" &&
        params.brain.replyNeeded
      ) {
        return "Writer attempted silence even though Brain says a reply is needed.";
      }

      return null;
    };

    let violation =
      tokenViolation(raw) ||
      (
        raw
          ? replyViolationReason(
              raw,
              params,
              commercialFactsText,
              generalFactsText
            )
          : "Writer returned an empty draft."
      );

    /*
     * One controlled rewrite is allowed when Writer violates a safety,
     * completeness, identity, or architecture boundary.
     *
     * A bad Writer draft is a Writer problem, not an Admin problem.
     */
    if (violation) {
      const correctionPrompt = `
${prompt}

==================================================
DRAFT CORRECTION
==================================================

The previous draft was rejected internally for this reason:
${violation}

Rewrite the WhatsApp reply ONCE.

Requirements:
- follow Brain's normalizedMessage and latestMeaning;
- answer the direct question now when approved facts are available;
- if Brain requires clarification, ask exactly that one clarification;
- never expose Brain, Sales AI, Knowledge, Orchestrator, or internal routing;
- customer-facing identity is Mona, Admin Assistant for Tetamo;
- never call yourself AI, bot, chatbot, robot, OpenAI, ChatGPT, GPT, model, or automation;
- never claim to be human;
- never answer an AI/bot challenge with "iya/ya/yes/betul/benar" because that confirms the premise;
- if Mona already identified herself earlier, do not repeat the same introduction;
- never invent a missing fact;
- if Sales Guidance says recommendedObjective="handle_objection", answer the objection substantively now; do not ignore, defer, hand it off, or replace it with generic discovery;
- for an objection, follow Sales Guidance recommendedDirection and use relevant approved facts;
- if Sales Guidance says shouldAskQuestion=false, do not add a question to the objection response;
- for payment replies, preserve the exact approved payment flow and do not invent bank transfer, rekening details, named banks, named e-wallets, or payment links;
- if approved facts say Tetamo Partner App + QRIS, explicitly retain Tetamo Partner App + QRIS;
- if approved facts say Owner checkout + QRIS, explicitly retain Owner checkout + QRIS;
- never create a human handover yourself;
- return only the corrected customer-facing WhatsApp text.
      `.trim();

      raw =
        await createDraft(
          correctionPrompt
        );

      violation =
        tokenViolation(raw) ||
        (
          raw
            ? replyViolationReason(
                raw,
                params,
                commercialFactsText,
                generalFactsText
              )
            : "Corrected Writer draft was empty."
        );
    }

    if (
      raw === "[[SILENT]]" &&
      !params.brain.replyNeeded
    ) {
      return {
        action: "silent",
        reply: "",
        source: "openai",
      };
    }

    if (!raw || violation) {
      console.error(
        "Tetamo Mona Writer draft blocked:",
        violation ||
          "Unknown Writer validation failure."
      );

      return fallbackReply(params);
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
Normalized latest customer message: ${params.brain.normalizedMessage}
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