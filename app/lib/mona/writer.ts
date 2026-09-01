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
- Brain.intent is authoritative for WHAT the customer wants in the current turn.
- Brain.intentSubject is authoritative for the current feature, package, or referent when supplied.
- Brain.normalizedMessage and Brain.latestMeaning provide the resolved semantic context.
- If an older or less-specific latestMeaning phrasing appears to conflict with Brain.intent or
  Brain.intentSubject, follow Brain.intent and Brain.intentSubject for what to answer.
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
5A. PRECISE INTENT DISCIPLINE
==================================================

Brain.intent is the authoritative current-turn intent.
Brain.intentSubject is the authoritative current feature/package/referent when supplied.

Do not collapse distinct intents into a generic sales answer.

platform_features:
- explain Tetamo/Tetamo Partner capabilities and customer value;
- for Agent, frame Tetamo Partner as tools that help the Agent's real-estate work;
- normally choose the 3–5 strongest LIVE capabilities relevant to the customer's role instead of listing every available feature;
- do NOT enumerate Inventory Ready, LOI, Rental Agreement, Sale Agreement, or other roadmap items unless the customer actually asked about future/coming-soon features;
- if future tools are genuinely useful context but were not asked for, at most use one short generic sentence that more Agent Tools are being prepared; do not turn the reply into a roadmap catalogue;
- do NOT answer with membership prices or a package catalogue unless the customer asked for package information.

package_features:
- if approved package facts say a Verification Badge is available after approval, preserve that condition explicitly; never imply buying the package automatically gives Verified status or an unconditional verification badge;
- explain package features only;
- do not repeat pricing unless price was also asked.

package_price:
- answer price directly.

competitor_comparison:
- answer the comparison directly using Tetamo's own value;
- do not automatically treat a neutral comparison as resistance;
- describe Tetamo's own marketplace and working tools; do not characterize Rumah123, 99.co, or another competitor as "only", "just", "cuma", "hanya", or merely a place to post ads;
- do not attack or diminish competitors;
- do not add a download/signup CTA unless the customer asked how to start or the supplied Sales strategy shows a genuine high buying signal.

existing_solution_objection:
- the customer is NOT accepting the offer;
- they are saying they already have/use something similar;
- explain incremental Tetamo value and do not assume purchase readiness.

proof_testimonial:
- answer approved testimonial/proof facts first;
- do not turn the answer into traffic/user disclaimers;
- do not immediately push package/payment after a weak acknowledgement.

traffic_growth:
- answer approved growth/adoption facts;
- only discuss unavailable exact numbers if the customer explicitly asked for an exact number.

feature_details / feature_example / feature_availability / how_to_use:
- stay on Brain.intentSubject;
- do not switch to package examples;
- preserve LIVE vs COMING SOON status exactly;
- for feature_example, answer the customer's request to SEE an example, not merely what the feature does;
- if approved capability says Mona cannot send screenshots/demo, say that directly and then give a concise text example or walkthrough using only the approved facts for that feature.

how_to_list / registration:
- for an Owner listing, preserve the approved verification sequence: after successful payment is confirmed, the listing becomes active and can appear publicly on the marketplace as Pending Verification while Tetamo completes verification; final verification later changes the status to Verified;
- never say an Owner listing must wait until final Tetamo verification before it can appear publicly if approved facts say Pending Verification can be public;
- when approved facts say Tetamo Partner is the primary Agent/Owner route, direct them to download/open Tetamo Partner on iOS or Android.

acknowledgement:
- do not reopen selling;
- if Brain says replyNeeded=false, remain silent;
- if a reply is needed, one brief natural acknowledgement is enough.

LIVE VS COMING SOON:
- LIVE NOW may be described as available/currently usable.
- COMING SOON must be explicitly described as coming soon / sedang disiapkan / belum live.
- For COMING SOON, do not invent a launch date, launch timing, or promise that Mona/Tetamo will proactively notify the customer when it becomes live unless that notification capability is explicitly approved.
- Do not imply an unapproved future-update channel with phrases such as "nanti akan diinformasikan", "kami kabari kalau sudah live", or "kalau ada update bisa dicek di aplikasi". Just state the approved current status and value.
- PLANNED must not be advertised as available.
- NOT OFFERED must be stated as unavailable only when the customer actually asks about it.
- NOT OFFERED is not the same as COMING SOON: do not say "belum", "akan hadir", or otherwise imply a future launch unless Product Truth explicitly says one is planned.
- Never upgrade a feature's status yourself.

CAPABILITY BOUNDARY:
- Do not promise to send screenshots, demos, demo access, documents, or arrange support demos unless that exact capability is explicitly approved in supplied facts.
- Do not invent website live chat, support channels, email addresses, or human actions that are not supplied.
- Do not claim Tetamo provides a notary/notarisation solution when approved Product Truth says it is not offered.

VALUE-FIRST / LIMITATION RULE:
- For normal feature questions, comparisons, proof questions, existing-solution objections, self-marketing objections, price/value objections, bad past experience, and growth questions, lead with the relevant Tetamo value.
- Do NOT volunteer "Tetamo does not guarantee leads/closing" as a generic disclaimer.
- A no-guarantee boundary should be prominent when Brain.intent="guarantee_question".
- For Brain.intent="buyer_quality", explain matching/available lead information and then state the buyer-quality boundary.
- Never guarantee results under any intent.

RESPONSE FOCUS:
- normally use the 2–5 most relevant facts/benefits, not every available feature;
- for a generic platform_features turn, keep the answer to the strongest live capabilities unless the customer explicitly asks for a complete list or future roadmap;
- do not repeat facts already answered unless needed to answer the latest turn;
- one natural CTA is allowed only when the current strategy/buying signal genuinely calls for a next action;
- a neutral competitor comparison is not, by itself, a reason to push download/signup;
- "baik", "ok", "makasih", or a thumbs-up is not by itself a buying signal.

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
- when approved commercial facts specify Tetamo Partner for payment, keep the customer inside the Tetamo Partner payment flow;
- if the customer asks about transfer, rekening, or how to pay, answer operationally: download/open Tetamo Partner -> choose the membership/package/product -> follow the payment flow shown in the app -> complete payment there;
- do not explain Tetamo banking infrastructure, do not provide bank-account details, and do not offer a manual/direct transfer route;
- do not require QRIS or any other specific payment method unless the approved facts for that exact turn explicitly require it.

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
    /proposal\s*&?\s*portfolio|property proposal|property portfolio/i.test(
      approvedText
    )
  ) {
    approvedValuePartsId.push(
      "Proposal & Portfolio untuk presentasi property ke client"
    );
    approvedValuePartsEn.push(
      "Proposal & Portfolio tools for client property presentations"
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
    /guarantee|jamin|closing|kalau.*(?:ga|gak|nggak|tidak).*lead|performance_guarantee/i.test(
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
        ? `Tetamo can help match and surface relevant buyer or lead information, but buyer readiness still depends on the individual buyer.${valueEn}`
        : `Tetamo bisa membantu matching dan menampilkan informasi buyer/lead yang relevan Kak, tapi kesiapan buyer tetap tergantung masing-masing buyer.${valueId}`;
  } else if (
    /bad_past|past.*experience|kapok|trauma|pernah.*bayar|dulu.*bayar|ga.*dapet.*lead|gak.*dapet.*lead|nggak.*dapet.*lead|tidak.*dapat.*lead/i.test(
      signal
    )
  ) {
    reply =
      language === "en"
        ? `I understand why you'd be cautious after a disappointing paid-portal experience.${valueEn} Tetamo is best considered for the additional property-specific channels and workflow it provides, without replacing what you already use.`
        : `Paham Kak kenapa jadi lebih hati-hati setelah pengalaman portal berbayar sebelumnya.${valueId} Tetamo lebih tepat dilihat dari tambahan channel dan workflow khusus properti yang diberikan, tanpa harus menggantikan yang sudah Kakak gunakan.`;
  } else if (
    /self_marketing|facebook|instagram|\bfb\b|\big\b|post.*sendiri|gratis|free/i.test(
      signal
    )
  ) {
    reply =
      language === "en"
        ? `You can absolutely keep using your own Facebook or Instagram channels.${valueEn} Tetamo is an additional property-specific channel and workflow, not a replacement for the channels you already manage.`
        : `Posting sendiri di Facebook atau Instagram tetap bisa Kak.${valueId} Tetamo menjadi channel dan workflow khusus properti tambahan, bukan pengganti channel yang sudah Kakak kelola sendiri.`;
  } else if (
    /existing_solution|duplicate_value|existing_portal|competitor|rumah\s*123|99\.?co|portal lain|platform lain|sudah.*(?:ada|punya|pakai).*(?:seperti|mirip|sama)/i.test(
      signal
    )
  ) {
    reply =
      language === "en"
        ? `You can keep the solution or portal you already use.${valueEn} The point of Tetamo is the additional property-specific workflow and discovery channel it can add alongside your current setup.`
        : `Yang sudah Kakak pakai tetap bisa dilanjutkan.${valueId} Nilai Tetamo adalah menambah workflow dan channel discovery khusus properti di samping sistem yang sudah Kakak punya.`;
  } else if (
    /credibility|traffic|proof|bukti|testimonial|testimoni|baru|rame|ramai/i.test(
      signal
    )
  ) {
    reply =
      language === "en"
        ? `Tetamo is growing its property marketplace and partner ecosystem using the approved channels available to it.${valueEn}`
        : `Tetamo terus mengembangkan marketplace dan ekosistem partner propertinya melalui channel yang tersedia.${valueId}`;
  } else {
    reply =
      language === "en"
        ? `I understand the concern.${valueEn}`
        : `Paham Kak kekhawatirannya.${valueId}`;
  }

  return {
    action: "reply",
    reply: reply
      .replace(/\s+/g, " ")
      .trim(),
    source: "fallback",
  };
}

function deterministicPaymentFlowReply(
  params: WriteMonaReplyParams
): MonaWriterResult | null {
  const guidance =
    params.salesGuidance.guidance;

  if (
    !guidance ||
    guidance.recommendedObjective !==
      "move_to_payment"
  ) {
    return null;
  }

  const language =
    params.brain.languageStyle.primaryLanguage;

  const isOwner =
    params.brain.customerType === "owner";

  return {
    action: "reply",
    reply:
      language === "en"
        ? isOwner
          ? "For payment, download or open Tetamo Partner, choose the applicable package or product, complete or review the listing when required, then follow the payment flow shown in the app and pay directly there."
          : "For payment, download or open Tetamo Partner, choose the membership or product you want, then follow the payment flow shown in the app and pay directly there."
        : isOwner
          ? "Untuk pembayaran, Kakak bisa download atau buka Tetamo Partner, pilih paket atau produk yang sesuai, selesaikan atau review listing jika diperlukan, lalu ikuti proses pembayaran langsung di aplikasi ya."
          : "Untuk pembayaran, Kakak bisa download atau buka Tetamo Partner, pilih membership atau produk yang diinginkan, lalu ikuti proses pembayaran langsung di aplikasi ya.",
    source: "fallback",
  };
}

function deterministicIntentFallbackReply(
  params: WriteMonaReplyParams
): MonaWriterResult | null {
  const language = params.brain.languageStyle.primaryLanguage;
  const intent = params.brain.intent;
  const subject = params.brain.intentSubject;
  const facts = params.knowledge.approvedFactsText || "";

  /*
   * Feature status must come from the specifically matched Product Truth section,
   * never from every retrieved fact in the turn. Broad Knowledge may legitimately
   * mention other roadmap features with different statuses.
   */
  const specificProductFacts = params.knowledge.matches
    .filter((match) => match.section.id.startsWith("product-feature-"))
    .flatMap((match) => match.section.facts)
    .join("\n");

  const has = (pattern: RegExp) => pattern.test(facts);

  if (intent === "acknowledgement") {
    return {
      action: "reply",
      reply: language === "en" ? "You're welcome." : "Sama-sama Kak.",
      source: "fallback",
    };
  }

  if (intent === "proof_testimonial") {
    const parts: string[] = [];
    if (/existing customer and agent testimonials/i.test(facts)) {
      parts.push(
        language === "en"
          ? "Tetamo already has customer and agent testimonials"
          : "Tetamo sudah memiliki testimoni dari customer dan agent"
      );
    }
    if (/official Instagram presence/i.test(facts)) {
      parts.push(
        language === "en"
          ? "the available testimonials can be viewed through Tetamo's official Instagram presence"
          : "testimoni yang tersedia dapat dilihat melalui Instagram resmi Tetamo"
      );
    }
    if (/marked or recorded as sold or rented/i.test(facts)) {
      parts.push(
        language === "en"
          ? "and Tetamo has properties already recorded as sold or rented"
          : "dan ada properti di Tetamo yang sudah tercatat sold atau rented"
      );
    }
    if (parts.length) {
      return {
        action: "reply",
        reply: language === "en"
          ? `${parts.join(", ")}.`
          : `${parts.join(", ")}.`,
        source: "fallback",
      };
    }
  }

  if (intent === "platform_features") {
    const isOwner =
      params.brain.customerType === "owner";

    const features: string[] = [];
    const add = (pattern: RegExp, id: string, en: string) => {
      if (has(pattern) && features.length < 5) {
        features.push(language === "en" ? en : id);
      }
    };
    add(/create.*edit.*manage property listings|create, edit.*manage/i, "buat, edit dan kelola listing", "create, edit and manage listings");
    add(/direct whatsapp/i, "Direct WhatsApp enquiry", "Direct WhatsApp enquiries");
    add(/jadwal viewing|viewing schedule/i, "Jadwal Viewing", "Viewing Schedule");
    add(/leads dashboard/i, "Leads Dashboard", "Leads Dashboard");
    if (!isOwner) {
      add(/proposal.*portfolio/i, "Proposal & Portfolio untuk satu atau beberapa property dan print untuk client", "Proposal & Portfolio for one or multiple properties, prepared for client printing");
    }
    add(/generate ai/i, "Generate AI", "Generate AI");
    if (features.length) {
      return {
        action: "reply",
        reply: language === "en"
          ? isOwner
            ? `Tetamo Partner helps property owners manage their own property advertising. Key live tools include ${features.join(", ")}.`
            : `Tetamo Partner is built as a working toolkit for property partners, not only a place to upload ads. Key live tools include ${features.join(", ")}.`
          : isOwner
            ? `Tetamo Partner membantu Pemilik mengelola iklan properti sendiri Kak. Fitur live utamanya antara lain ${features.join(", ")}.`
            : `Tetamo Partner dibuat sebagai toolkit kerja untuk bisnis properti, bukan cuma tempat upload iklan Kak. Fitur live utamanya antara lain ${features.join(", ")}.`,
        source: "fallback",
      };
    }
  }

  if (intent === "competitor_comparison") {
    const valueParts: string[] = [];
    const add = (pattern: RegExp, id: string, en: string) => {
      if (has(pattern) && valueParts.length < 4) {
        valueParts.push(language === "en" ? en : id);
      }
    };

    add(/tetamo partner/i, "Tetamo Partner untuk kelola listing dan workflow agent", "Tetamo Partner for listing and agent workflow management");
    add(/direct whatsapp/i, "Direct WhatsApp enquiry", "Direct WhatsApp enquiries");
    add(/leads dashboard|manage property leads/i, "Leads Dashboard", "Leads Dashboard");
    add(/jadwal viewing|viewing schedule/i, "Jadwal Viewing", "Viewing Schedule");
    add(/proposal.*portfolio/i, "Proposal & Portfolio", "Proposal & Portfolio");

    const values = valueParts.length
      ? valueParts.join(", ")
      : language === "en"
        ? "its property marketplace and partner workflow tools"
        : "marketplace properti dan tools kerja untuk partner";

    return {
      action: "reply",
      reply: language === "en"
        ? `There is a similarity in the property-marketplace function. Tetamo's own focus also includes ${values}, so it supports both property discovery and day-to-day property workflow.`
        : `Ada kemiripan di fungsi marketplace properti Kak. Untuk Tetamo sendiri, fokusnya juga mencakup ${values}, jadi bisa dipakai untuk discovery properti sekaligus workflow kerja sehari-hari.`,
      source: "fallback",
    };
  }

  if (
    intent === "feature_details" ||
    intent === "feature_example" ||
    intent === "feature_availability" ||
    intent === "how_to_use"
  ) {
    const statusFacts = specificProductFacts || facts;
    const live = /status:\s*LIVE NOW|\bLIVE NOW\b/i.test(statusFacts);
    const comingSoon = /status:\s*COMING SOON|\bCOMING SOON\b/i.test(statusFacts);
    const notOffered = /status:\s*NOT OFFERED|\bNOT OFFERED\b|does not currently provide a notary/i.test(statusFacts);
    const cannotSendDemo =
      /Mona can send screenshots directly[^\n]*:\s*no|Mona can send a feature demo directly[^\n]*:\s*no/i.test(facts);
    if (intent === "feature_example" && cannotSendDemo && !comingSoon && !notOffered) {
      const isProposal =
        /Proposal & Portfolio/i.test(subject || "") ||
        /Proposal & Portfolio is a live Tetamo Agent Tool/i.test(statusFacts);

      return {
        action: "reply",
        reply: isProposal
          ? language === "en"
            ? "I can't send a screenshot or demo directly from this chat, but here's the text example: an Agent selects one or multiple properties, then prepares them as a Proposal & Portfolio that can be printed and presented to the client."
            : "Untuk contoh visualnya saya belum bisa kirim screenshot atau demo langsung dari chat ini Kak. Tapi gambaran Proposal & Portfolio-nya: Agent pilih satu atau beberapa properti, lalu dibuat menjadi materi proposal/portfolio yang bisa disiapkan untuk print dan dipresentasikan ke client."
          : language === "en"
            ? `I can't send a screenshot or demo directly from this chat, but I can explain ${subject || "that feature"} here using the approved feature details.`
            : `Untuk contoh visualnya saya belum bisa kirim screenshot atau demo langsung dari chat ini Kak, tapi saya bisa jelaskan ${subject || "fitur itu"} di sini berdasarkan detail fitur yang tersedia.`,
        source: "fallback",
      };
    }

    if (notOffered) {
      const isNotary = /notar/i.test(subject || "") || /notar/i.test(statusFacts);
      return {
        action: "reply",
        reply: isNotary
          ? language === "en"
            ? "Tetamo does not provide a notary or notarisation service."
            : "Tetamo tidak menyediakan layanan notaris atau notarisation, Kak."
          : language === "en"
            ? `${subject || "That feature"} is not offered by Tetamo.`
            : `${subject || "Fitur itu"} tidak disediakan oleh Tetamo Kak.`,
        source: "fallback",
      };
    }
    if (comingSoon) {
      const isInventoryReady = /Inventory Ready/i.test(subject || "");
      const isLoi = /\bLOI\b|Letter of Intent/i.test(subject || "");
      const isRentalAgreement = /Rental Agreement/i.test(subject || "");
      const isSaleAgreement = /Sale Agreement/i.test(subject || "");

      let reply = language === "en"
        ? `${subject || "That feature"} is being prepared and is not live yet.`
        : `${subject || "Fitur itu"} sedang disiapkan dan belum live saat ini, Kak.`;

      if (isInventoryReady) {
        reply = language === "en"
          ? "Inventory Ready is being prepared and is not live yet. It is designed to help agents choose available property inventory more conveniently for client needs."
          : "Inventory Ready sedang disiapkan dan belum live saat ini, Kak. Fitur ini dirancang untuk membantu agent memilih inventory properti yang tersedia dengan lebih praktis sesuai kebutuhan client.";
      } else if (isLoi) {
        reply = language === "en"
          ? "Editable LOI is being prepared and is not live yet. It is planned as an editable working document/template for agent workflows."
          : "Editable LOI sedang disiapkan dan belum live saat ini, Kak. Fitur ini direncanakan sebagai dokumen/template kerja yang bisa diedit untuk kebutuhan workflow agent.";
      } else if (isRentalAgreement) {
        reply = language === "en"
          ? "Editable Rental Agreement is being prepared and is not live yet. It is planned as an editable working document/template for agent rental workflows."
          : "Editable Rental Agreement sedang disiapkan dan belum live saat ini, Kak. Fitur ini direncanakan sebagai dokumen/template kerja yang bisa diedit untuk kebutuhan rental agent.";
      } else if (isSaleAgreement) {
        reply = language === "en"
          ? "Editable Sale Agreement is being prepared and is not live yet. It is planned as an editable working document/template for agent sale workflows."
          : "Editable Sale Agreement sedang disiapkan dan belum live saat ini, Kak. Fitur ini direncanakan sebagai dokumen/template kerja yang bisa diedit untuk kebutuhan transaksi jual agent.";
      }

      return {
        action: "reply",
        reply,
        source: "fallback",
      };
    }

    if (live && intent === "feature_availability") {
      const proposal = /Proposal & Portfolio/i.test(subject || "") ||
        /Proposal & Portfolio is a live Tetamo Agent Tool/i.test(statusFacts);

      return {
        action: "reply",
        reply: proposal
          ? language === "en"
            ? "Yes. Proposal & Portfolio is live in Tetamo. Agents can use one or multiple properties to prepare a proposal or portfolio for a client and prepare it for printing."
            : "Bisa Kak. Proposal & Portfolio sudah live di Tetamo. Agent bisa pilih satu atau beberapa properti untuk dibuat menjadi proposal atau portfolio untuk client dan disiapkan untuk print."
          : language === "en"
            ? `${subject || "That feature"} is live and currently available in Tetamo.`
            : `${subject || "Fitur itu"} sudah live dan tersedia saat ini di Tetamo Kak.`,
        source: "fallback",
      };
    }
  }

  return null;
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

  const intentFallback =
    deterministicIntentFallbackReply(params);

  if (intentFallback) {
    return intentFallback;
  }

  /*
   * For other non-objection technical failures, remain silent rather than inventing
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
  generalFactsText: string,
  requireApprovedPaymentRoute: boolean
): string | null {
  const approvedText = [
    commercialFactsText,
    generalFactsText,
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();

  const draft = raw.toLowerCase();

  const approvedTetamoPartner =
    /tetamo partner/i.test(approvedText);

  /*
   * Tetamo payments must stay inside the approved payment system.
   * Even when the customer asks about "transfer" or "rekening", Mona should
   * redirect to Tetamo Partner rather than describing a manual bank route.
   */
  const draftMentionsManualBankRoute =
    /(?:transfer\s+(?:bank|langsung|manual)|bank\s+transfer|transfer\s+ke\s+rekening|rekening\s+tetamo|detail\s+rekening|nomor\s+rekening|kirim\s+(?:detail\s+)?rekening)/i.test(
      draft
    );

  if (draftMentionsManualBankRoute) {
    return "The draft discussed a manual/direct bank-transfer or Tetamo rekening route. Payment must stay inside the approved Tetamo Partner payment flow.";
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

  /*
   * Only validate named payment brands during an actual payment turn.
   * Outside payment, normal Indonesian can overlap with brand names
   * (for example "secara mandiri") and must not trigger a false block.
   */
  if (requireApprovedPaymentRoute) {
    for (const brand of namedPaymentBrands) {
      if (
        draft.includes(brand) &&
        !approvedText.includes(brand)
      ) {
        return `The draft invented the payment brand "${brand}" even though it was not supplied in approved facts.`;
      }
    }
  }

  if (
    requireApprovedPaymentRoute &&
    approvedTetamoPartner &&
    !/tetamo\s+partner/i.test(draft)
  ) {
    return "Approved payment facts require the Tetamo Partner payment flow, but the draft omitted Tetamo Partner.";
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

  /*
   * A positive buyer-quality claim is also unsupported even when Writer does
   * not use words such as "guaranteed" or "pasti".
   *
   * Examples that must be blocked:
   * - "pembeli yang serius"
   * - "qualified buyers"
   * - "verified buyers"
   *
   * Negative/boundary explanations remain allowed, for example:
   * "Tetamo tidak menjamin setiap pembeli serius."
   */
  const buyerQualityPhrase =
    /(?:pembeli|penyewa|buyers?|renters?|leads?)\b.{0,50}\b(?:serius|serious|qualified|terkualifikasi|verified|terverifikasi)\b/i;

  const hasBuyerQualityPhrase =
    buyerQualityPhrase.test(raw);

  const hasBuyerQualityBoundary =
    /(?:tidak|nggak|gak|ga|bukan|belum(?:\s+tentu)?|not|no|cannot|can't|doesn't|does not|do not)\b.{0,100}(?:pembeli|penyewa|buyers?|renters?|leads?)\b.{0,50}\b(?:serius|serious|qualified|terkualifikasi|verified|terverifikasi)\b/i.test(
      raw
    ) ||
    /(?:pembeli|penyewa|buyers?|renters?|leads?)\b.{0,40}\b(?:tidak|nggak|gak|ga|belum(?:\s+tentu)?|not|aren't|are not|isn't|is not)\b.{0,25}\b(?:serius|serious|qualified|terkualifikasi|verified|terverifikasi)\b/i.test(
      raw
    ) ||
    /(?:tidak|nggak|gak|ga|not|cannot|can't|doesn't|does not|do not)\b.{0,40}(?:jamin|menjamin|guarantee).{0,80}(?:serius|serious|qualified|terkualifikasi|verified|terverifikasi)/i.test(
      raw
    );

  if (
    hasBuyerQualityPhrase &&
    !hasBuyerQualityBoundary
  ) {
    return "The draft made an unsupported positive buyer-quality claim.";
  }

  /*
   * OWNER TRANSACTION-DIRECTION GUARD
   * ---------------------------------
   *
   * If Brain resolved that an Owner wants to rent/lease OUT their property,
   * Writer must not reverse that meaning and describe the Owner as wanting
   * to rent the property as a tenant.
   */
  const ownerRentOutMeaning =
    params.brain.customerType === "owner" &&
    /(?:sewakan|disewakan|menyewakan|rent\s+out|renting\s+out|lease\s+out|leasing\s+out)/i.test(
      [
        params.brain.latestMeaning || "",
        params.brain.directQuestion || "",
      ].join("\n")
    );

  const reversesOwnerRentOutMeaning =
    ownerRentOutMeaning &&
    /\b(?:mau|ingin|pengen|pgn|untuk|want(?:s)?\s+to)\s+(?:sewa|rent)\s+(?:villa|rumah|properti|property|apartemen|apartment)\b/i.test(
      raw
    );

  if (reversesOwnerRentOutMeaning) {
    return "The draft reversed the Owner's transaction direction. The Owner wants to rent/lease out the property, not rent the property as a tenant.";
  }

  /*
   * OWNER PENDING-VERIFICATION VISIBILITY GUARD
   * -------------------------------------------
   *
   * Approved Owner facts allow a successfully paid listing to become active
   * and publicly visible as Pending Verification while Tetamo verifies it.
   * Writer must not reverse that sequence and say marketplace visibility waits
   * until final verification.
   */
  const ownerHowToList =
    params.brain.customerType === "owner" &&
    params.brain.intent === "how_to_list";

  const approvedPendingPublicFlow =
    /Pending Verification/i.test(
      [commercialFactsText, generalFactsText].join("\n")
    );

  const draftMakesVisibilityWaitForVerification =
    /(?:tampil|muncul|tayang|public|publik|marketplace).{0,70}(?:setelah|sesudah|setelah\s+itu).{0,35}(?:diverifikasi|verifikasi\s+selesai|verified)|(?:setelah|sesudah).{0,40}(?:diverifikasi|verifikasi\s+selesai|verified).{0,70}(?:tampil|muncul|tayang|public|publik|marketplace)/i.test(
      raw
    );

  if (
    ownerHowToList &&
    approvedPendingPublicFlow &&
    draftMakesVisibilityWaitForVerification
  ) {
    return "The draft reversed the approved Owner listing sequence. After successful payment, the listing can be active/public as Pending Verification while Tetamo completes verification; it does not need to wait for final verification before appearing publicly.";
  }

  const paymentViolation =
    paymentFactBoundaryViolation(
      raw,
      commercialFactsText,
      generalFactsText,
      params.brain.intent === "payment"
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

  const intent = params.brain.intent;

  /*
   * VERIFICATION BADGE QUALIFIER GUARD
   * ----------------------------------
   *
   * Owner package facts say a listing can receive a Verification Badge
   * AFTER approval. Buying a package does not automatically make the
   * listing verified.
   *
   * Allowed:
   * - "bisa mendapat badge verifikasi setelah disetujui"
   * - "Verification Badge after approval"
   *
   * Blocked:
   * - "sudah termasuk badge verifikasi"
   * - "dapat badge verifikasi"
   * - "mendapat tanda verifikasi"
   * when the approval condition is omitted.
   */
  const approvedVerificationBadgeRequiresApproval =
    /(?:verification badge|badge verifikasi|tanda verifikasi).{0,80}(?:after approval|after being approved|once approved|if approved|setelah disetujui|setelah approval|jika disetujui|kalau disetujui)/i.test(
      commercialFactsText
    ) ||
    /(?:after approval|after being approved|once approved|if approved|setelah disetujui|setelah approval|jika disetujui|kalau disetujui).{0,80}(?:verification badge|badge verifikasi|tanda verifikasi)/i.test(
      commercialFactsText
    );

  const draftMentionsVerificationBadge =
    /(?:verification badge|badge verifikasi|tanda verifikasi)/i.test(
      raw
    );

  const draftPreservesBadgeApprovalQualifier =
    /(?:verification badge|badge verifikasi|tanda verifikasi).{0,80}(?:after approval|after being approved|once approved|if approved|setelah disetujui|setelah approval|jika disetujui|kalau disetujui)/i.test(
      raw
    ) ||
    /(?:after approval|after being approved|once approved|if approved|setelah disetujui|setelah approval|jika disetujui|kalau disetujui).{0,80}(?:verification badge|badge verifikasi|tanda verifikasi)/i.test(
      raw
    );

  if (
    approvedVerificationBadgeRequiresApproval &&
    draftMentionsVerificationBadge &&
    !draftPreservesBadgeApprovalQualifier
  ) {
    return "Approved package facts say the Verification Badge is available only after approval, but the draft presented the badge without preserving that approval condition.";
  }

  if (
    intent === "platform_features" &&
    /\b(?:silver|gold|agent\s*pro|basic(?:\s+listing)?|priority(?:\s+listing)?|featured(?:\s+listing)?|rp\s*[\d.])\b/i.test(raw)
  ) {
    return "Brain asked for platform features, but the draft turned the answer into package/pricing information.";
  }

  if (
    intent === "package_features" &&
    !/(?:harga|price|biaya|fee|berapa)/i.test(semanticQuestion) &&
    /\brp\s*[\d.]/i.test(raw)
  ) {
    return "Brain asked for package features, but the draft unnecessarily repeated package pricing that was not requested on this turn.";
  }

  if (
    intent === "proof_testimonial" &&
    /(?:tidak\s+mau|nggak\s+mau|cannot|can't|do not want).{0,35}(?:traffic|jumlah\s+user|user\s+number|angka\s+traffic)|(?:traffic|jumlah\s+user).{0,35}(?:belum\s+terverifikasi|not\s+verified)/i.test(raw)
  ) {
    return "Brain asked for proof/testimonials, but the draft answered with an unrelated traffic/user disclaimer.";
  }

  const guidance =
    params.salesGuidance.guidance;

  const askedForRoadmap =
    /(?:coming\s+soon|roadmap|future\s+feature|fitur\s+(?:yang\s+)?akan\s+datang|fitur\s+kedepan|fitur\s+ke\s+depan|nanti\s+ada\s+apa|sedang\s+disiapkan)/i.test(
      semanticQuestion
    );

  const askedForCompleteFeatureList =
    /(?:semua\s+fitur|fitur.{0,20}(?:lengkap|semuanya)|fitur\s+apa\s+saja\s+semua|all\s+features|complete\s+(?:feature\s+)?list)/i.test(
      semanticQuestion
    );

  if (intent === "platform_features") {
    const featureSignals = [
      /(?:buat|create).{0,20}(?:edit|kelola|manage).{0,30}(?:listing|property|properti)/i,
      /direct\s+whatsapp/i,
      /jadwal\s+viewing|viewing\s+schedule/i,
      /leads?\s+dashboard|kelola\s+leads?/i,
      /proposal\s*&?\s*portfolio/i,
      /generate\s+ai/i,
      /agent\s+profile|profil\s+agen/i,
      /commission\s+tracking|tracking\s+komisi|komisi/i,
      /featured|boost|spotlight/i,
      /inventory\s+ready/i,
      /\bLOI\b|letter\s+of\s+intent/i,
      /rental\s+agreement/i,
      /sale\s+agreement/i,
    ].filter((pattern) => pattern.test(raw)).length;

    if (
      !askedForCompleteFeatureList &&
      featureSignals > 5
    ) {
      return "Brain asked for general platform features, but the draft dumped too many capabilities instead of focusing on the 3–5 strongest live features.";
    }

    if (
      !askedForRoadmap &&
      /(?:inventory\s+ready|\bLOI\b|letter\s+of\s+intent|rental\s+agreement|sale\s+agreement|coming\s+soon|sedang\s+disiapkan|belum\s+live)/i.test(
        raw
      )
    ) {
      return "The customer asked for current platform features, but the draft unnecessarily expanded into the future roadmap.";
    }
  }

  if (intent === "competitor_comparison") {
    const competitorDiminishingClaim =
      /(?:cuma|hanya|sekadar|just|only|merely).{0,55}(?:rumah\s*123|99\.?co|propertyguru|lamudi|portal\s+lain|platform\s+lain)|(?:rumah\s*123|99\.?co|propertyguru|lamudi|portal\s+lain|platform\s+lain).{0,55}(?:cuma|hanya|sekadar|just|only|merely)/i.test(
        raw
      );

    if (competitorDiminishingClaim) {
      return "The comparison draft diminished or characterized a competitor as merely/only a listing portal instead of describing Tetamo's own value.";
    }

    const customerAskedHowToStart =
      /(?:download|unduh|install|daftar|register|sign\s*up|signup|join|mulai\s+pakai|cara\s+mulai|how\s+to\s+start|how\s+to\s+join)/i.test(
        semanticQuestion
      );

    const pushesActionCta =
      /(?:download|unduh|install|daftar|register|sign\s*up|signup|join|mulai\s+pakai|coba.{0,20}tetamo\s+partner)/i.test(
        raw
      );

    if (
      pushesActionCta &&
      !customerAskedHowToStart &&
      guidance?.buyingSignal !== "high"
    ) {
      return "The customer asked for a neutral competitor comparison, but the draft added a download/signup CTA without a genuine buying signal.";
    }
  }

  const limitationShouldNotLead = [
    "platform_features",
    "feature_details",
    "feature_example",
    "feature_availability",
    "competitor_comparison",
    "existing_solution_objection",
    "bad_past_experience",
    "self_marketing_objection",
    "price_objection",
    "proof_testimonial",
    "traffic_growth",
    "buyer_availability",
  ].includes(intent);

  if (
    limitationShouldNotLead &&
    /(?:tetamo\s+)?(?:tidak|nggak|gak)\s+(?:bisa\s+)?menjamin|does\s+not\s+guarantee|cannot\s+guarantee|can't\s+guarantee/i.test(raw)
  ) {
    return "This intent requires a value-first answer, but the draft volunteered a no-guarantee disclaimer that the customer did not ask for.";
  }

  if (
    intent === "feature_availability" &&
    /COMING SOON|status:\s*COMING SOON/i.test(generalFactsText) &&
    !/(?:coming\s+soon|segera|sedang\s+disiapkan|belum\s+live|belum\s+tersedia|akan\s+hadir)/i.test(raw)
  ) {
    return "Product Truth says the requested feature is coming soon, but the draft failed to label it as not live yet.";
  }

  if (
    intent === "feature_availability" &&
    /COMING SOON|status:\s*COMING SOON/i.test(generalFactsText) &&
    /(?:pasti\s+)?(?:kami|saya|mona|tetamo).{0,25}(?:kabari|kabarin|beritahu|informasikan|notify|let\s+you\s+know)|(?:kalau|jika).{0,20}(?:ada\s+)?(?:update|pembaruan).{0,35}(?:(?:kami|saya|mona|tetamo).{0,20}(?:kabari|kabarin|beritahu|informasikan|notify)|(?:nanti\s+)?(?:akan\s+)?(?:diinformasikan|dikabari|diberitahu|notified)|(?:bisa\s+)?(?:dicek|cek|dilihat|lihat).{0,25}(?:aplikasi|app|tetamo\s+partner))|(?:nanti\s+)?(?:akan\s+)?(?:diinformasikan|dikabari|diberitahu).{0,30}(?:kalau|jika|saat|ketika|update|pembaruan|live|tersedia)|(?:kami|saya).{0,20}(?:akan\s+)?(?:menghubungi|hubungi).{0,30}(?:saat|ketika|kalau).{0,30}(?:live|tersedia|launch)/i.test(raw)
  ) {
    return "The draft invented a future notification or update-check channel for a coming-soon feature, but no such capability is approved.";
  }

  if (
    intent === "feature_availability" &&
    /status:\s*NOT OFFERED|\bNOT OFFERED\b/i.test(generalFactsText) &&
    /(?:belum\s+(?:menyediakan|ada|tersedia)|akan\s+hadir|coming\s+soon|segera\s+hadir)/i.test(raw)
  ) {
    return "Product Truth says the requested feature is not offered, but the draft implied that it is merely not live yet or may be launching later.";
  }

  if (
    intent === "feature_example" &&
    /Mona can send screenshots directly[^\n]*:\s*no|Mona can send a feature demo directly[^\n]*:\s*no|Mona can create demo access[^\n]*:\s*no|Mona can arrange a demo with support[^\n]*:\s*no/i.test(generalFactsText)
  ) {
    const promisesUnsupportedDemo =
      /(?:saya|kami|mona|tim\s+support|tim\s+tetamo).{0,25}(?:kirim|send|berikan|kasih|siapkan|buatkan|arrange).{0,30}(?:screenshot|demo|demo\s+access|akses\s+demo)/i.test(
        raw
      );

    if (promisesUnsupportedDemo) {
      return "The draft promised a screenshot/demo capability that Product Truth explicitly says Mona does not have.";
    }

    const statesDemoBoundary =
      /(?:(?:belum|tidak|nggak|gak)\s+bisa|cannot|can't|unable\s+to).{0,45}(?:kirim|send|share|berikan|kasih)?\s*.{0,20}(?:screenshot|demo|contoh\s+visual)|(?:screenshot|demo|contoh\s+visual).{0,45}(?:(?:belum|tidak|nggak|gak)\s+bisa|cannot|can't|unable\s+to)/i.test(
        raw
      );

    if (!statesDemoBoundary) {
      return "Brain asked for a feature example and Mona cannot send screenshots/demo, but the draft only explained the feature instead of directly stating that visual/demo media cannot be sent in this chat.";
    }

    const proposalExample =
      /Proposal & Portfolio/i.test(
        params.brain.intentSubject || ""
      );

    const givesTextualExample =
      proposalExample
        ? /(?:pilih|memilih|select|satu\s+atau\s+beberapa|one\s+or\s+multiple|print|cetak|present)/i.test(
            raw
          )
        : /(?:gambaran|misalnya|alur|cara\s+kerja|for\s+example|example\s+flow)/i.test(
            raw
          );

    if (!givesTextualExample) {
      return "Brain asked for a feature example; after stating the screenshot/demo boundary, the draft still failed to give a useful text example from approved facts.";
    }
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

  const paymentFlowReply =
    deterministicPaymentFlowReply(params);

  if (paymentFlowReply) {
    return paymentFlowReply;
  }

  /*
   * Proof/testimonial answers must stay tightly bounded to approved proof facts.
   * This intent previously drifted into generic no-guarantee disclaimers and
   * unrelated growth language even when the customer only asked for evidence.
   *
   * We already maintain a fact-bounded deterministic proof reply below, so use
   * it directly for this narrow intent instead of allowing model variability to
   * reintroduce the original production failure.
   */
  if (params.brain.intent === "proof_testimonial") {
    const proofReply =
      deterministicIntentFallbackReply(params);

    if (proofReply) {
      return proofReply;
    }
  }

  /*
   * Product Truth already gives decisive customer-facing answers for feature
   * examples and availability. Use that deterministic answer before OpenAI so
   * Writer cannot first invent screenshot/demo capability or turn NOT OFFERED
   * into a future/coming-soon feature.
   */
  if (
    params.brain.intent === "feature_example" ||
    params.brain.intent === "feature_availability"
  ) {
    const featureReply =
      deterministicIntentFallbackReply(params);

    if (featureReply) {
      return featureReply;
    }
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
Intent: ${params.brain.intent}
Intent subject: ${params.brain.intentSubject || "none"}
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
- preserve Brain.intent and Brain.intentSubject exactly; do not switch a platform-feature question into packages/pricing;
- for platform_features, normally use only the 3–5 strongest LIVE capabilities and do not enumerate future roadmap items unless the customer asked for future features;
- for feature_example, if screenshots/demo are not an approved capability, say that directly and then give a concise text example using approved feature facts;
- for competitor_comparison, describe Tetamo's own value without saying Rumah123, 99.co, or another competitor is "only/just/cuma/hanya" a listing portal; do not add a download/signup CTA unless the customer asked how to start or buyingSignal is high;
- preserve Product Truth status: live stays live, coming soon must be called coming soon/not live, not-offered stays not offered;
- for proof_testimonial, answer proof/testimonial facts first and do not substitute traffic/user disclaimers;
- for normal feature/comparison/value objections, do not volunteer no-guarantee language unless Brain.intent is guarantee_question or the customer explicitly asked for a guarantee;
- do not promise screenshots, demos, demo access, or support-arranged demos unless approved facts explicitly permit it;
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
- for Owner how_to_list, preserve the approved sequence: successful payment -> listing active/public as Pending Verification while Tetamo verifies -> later Verified; never say marketplace visibility must wait for final verification;
- if approved package facts say a Verification Badge is available after approval, explicitly preserve "after approval / setelah disetujui"; never present the verification badge as automatically included merely because the package was purchased;
- for payment replies, preserve the approved Tetamo Partner payment flow and do not invent manual/direct bank transfer, rekening details, named banks, named e-wallets, or payment links;
- if approved facts say Tetamo Partner, explicitly retain Tetamo Partner and tell the customer to follow the payment flow shown in the app;
- if the customer asked about transfer or rekening, do not explain banking infrastructure; simply redirect them to the Tetamo Partner payment flow;
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