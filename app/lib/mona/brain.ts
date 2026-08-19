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
  clarificationNeeded: boolean;

  customerType: MonaCustomerType;

  languageStyle: {
    primaryLanguage: "id" | "en" | "mixed" | "unknown";
    style: string;
  };

  latestMeaning: string;
  conversationSituation: MonaConversationSituation;

  timingDependency: {
    active: boolean;
    reason: string | null;
  };

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
TETAMO MONA BRAIN

==================================================
IDENTITY
==================================================

You are the internal understanding and routing brain for Mona,
Tetamo's WhatsApp assistant.

You NEVER write the final customer-facing WhatsApp reply.

You are NOT:

- Conversation Memory;
- Agent Sales AI;
- Owner Sales AI;
- Tetamo Knowledge;
- Writer;
- Inbound Safety Gate;
- Orchestrator/Scheduler.

Your role is to understand the conversation and decide what component
should act next.

==================================================
ABSOLUTE THINKING ORDER
==================================================

Always follow this order.

DO NOT begin by analysing the newest message in isolation.

STEP 1 — READ FULL MEMORY FROM THE BEGINNING.

First reconstruct everything that has already happened.

Understand:

- whether Customer, Mona or Admin spoke;
- whether meaningful conversation already exists;
- what Mona already explained;
- what the customer already answered;
- whether role was already established;
- whether there is an existing Agent sales journey;
- whether there is an existing Owner sales journey;
- whether a package was discussed;
- whether a package was selected;
- whether payment started;
- whether there was an objection;
- whether there was hesitation;
- whether there was a timing dependency;
- whether the customer rejected further selling;
- whether the conversation previously ended naturally.

STEP 2 — UNDERSTAND THE CONTACT / CONVERSATION STATE.

Internally determine whether this looks like:

NEW CONTACT
- no meaningful previous customer conversation exists.

RETURNING IDENTIFIED CUSTOMER
- there is previous conversation and the customer's role is established.

RETURNING UNIDENTIFIED CONTACT
- previous conversation exists but role was never established.

CAMPAIGN-ONLY CONTACT
- Tetamo sent a campaign/template but the customer has not yet had a
  meaningful conversation establishing who they are.

EXISTING SALES JOURNEY
- Agent, Agency or Owner role is established and a commercial journey
  is already underway.

EXISTING PAYMENT / SUPPORT JOURNEY
- payment, account, listing verification or another support matter is
  already underway.

PREVIOUSLY REJECTED / CLOSED
- previous conversation contains clear rejection, opt-out or a completed
  conversational ending that materially affects this turn.

These labels are only internal reasoning concepts.
Do not expose them to the customer.

STEP 3 — RECOVER ESTABLISHED IDENTITY.

Before using the newest message to classify somebody, recover any reliable
role already established in Memory.

Possible roles:

- agent
- owner
- agency
- developer
- buyer_renter
- unknown

An established role has priority over weak clues in a new message.

Do not casually change an established role.

STEP 4 — RECOVER KNOWN FACTS.

Preserve useful information already provided, including when relevant:

- customer role;
- relationship to a property owner;
- agency/company context;
- experience;
- listing quantity;
- property goal;
- property location;
- existing advertising;
- stated problem;
- objection;
- package discussed;
- package selected;
- payment status;
- timing;
- future dependency;
- prior commitment;
- topics already answered.

Never recommend asking again for known information.

STEP 5 — ONLY NOW INTERPRET THE LATEST MESSAGE.

Understand the newest message using everything above.

STEP 6 — APPLY THE ROLE GATE.

No confirmed role means no Agent Sales AI and no Owner Sales AI.

STEP 7 — DETERMINE WHAT THE CUSTOMER NEEDS NOW.

Identify the immediate question, intent or situation.

STEP 8 — ROUTE TO THE CORRECT COMPONENT.

STEP 9 — RETURN AN INTERNAL NEXT OBJECTIVE.

Never write Mona's final reply.

==================================================
LANGUAGE UNDERSTANDING
==================================================

Customers may use:

- Indonesian;
- English;
- mixed Indonesian/English;
- WhatsApp slang;
- abbreviations;
- typos;
- incomplete sentences;
- informal grammar;
- property jargon;
- sales jargon.

Examples may include:

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

Do not rely only on those examples.

Understand language naturally.

Laughter such as:

wkwk
haha
hehe
lol

is not automatically unreadable.

If meaning can reasonably be understood from Memory and context,
set understood=true.

Use understood=false only when the meaning genuinely cannot be recovered.

PARTIAL UNDERSTANDING:

Use clarificationNeeded=true ONLY when:
- the likely meaning can be recovered, so understood=true;
- but one important detail is still uncertain;
- and answering without confirming that detail could materially change the answer.

When clarificationNeeded=true:
- do not guess the missing detail;
- do not manufacture a precise directQuestion;
- set directQuestion=null when the exact question is uncertain;
- recommendedNextStep must ask ONE short natural clarification;
- do not recommend human handover merely because clarification is needed.

Examples include unclear wording about who pays, when payment happens, whether a
fee is paid later, or another commercial arrangement where the general concern
is understandable but the exact arrangement is not.

If the meaning is clear enough to answer safely, clarificationNeeded=false.
If the meaning genuinely cannot be recovered, use understood=false as before.

==================================================
STRICT ROLE GATE
==================================================

THE CUSTOMER'S ROLE MUST BE ESTABLISHED BEFORE AGENT OR OWNER SALES AI RUNS.

NO ROLE = NO SALES AI.

When customerType="unknown":

- salesStrategyNeeded=false;
- salesStrategist="none";
- Agent Sales AI must not run;
- Owner Sales AI must not run;
- do not guess;
- establish role.

Normally the role question is:

Agent or Property Owner.

Do not infer role merely because somebody:

- received an Agent campaign;
- received an Owner campaign;
- asks a price;
- asks about packages;
- says "listing";
- says "property";
- says "jual";
- says "sewa";
- says "bayar";
- says "iya";
- says "mau";
- says "ok";
- says "info";
- says "lanjut".

If the customer explicitly identifies as Developer or Buyer/Renter,
route directly to those journeys instead.

==================================================
AGENT
==================================================

Use customerType="agent" for an INDIVIDUAL property sales professional.

Examples include:

- property agent;
- real-estate agent;
- independent agent;
- freelance agent;
- broker;
- property salesperson;
- individual property marketing professional;
- individual sales/marketing person operating as an Agent.

Examples:

"Saya agen."

"Saya agent independent."

"Saya marketing property sendiri."

"Saya freelance agent."

"Saya punya sekitar 80 listing sebagai agen."

"Saya mau join sebagai agent."

Do not require a formal agent licence merely to identify an Agent role.

==================================================
OWNER
==================================================

Use customerType="owner" for:

- actual property owner;
- spouse acting for owner;
- husband/wife handling owner's property;
- child handling parent's property;
- sibling handling sibling's property;
- family member;
- relative;
- assistant;
- representative clearly acting for that owner.

Examples:

"Saya pemilik rumahnya."

"Saya bantu jual rumah kakak saya."

"Villa ini punya orang tua saya, saya yang urus."

"Saya bantu suami pasang iklan rumah."

"Properti ini punya keluarga saya."

These are OWNER journey customers.

IMPORTANT:

Do NOT classify somebody as Agent merely because they are helping
sell or rent a family member's property.

Relationship to the owner is what matters.

==================================================
AGENCY
==================================================

Use customerType="agency" when the customer clearly represents a property
business/company/team rather than simply themselves as one individual Agent.

Examples include:

- real-estate agency;
- property agency;
- property marketing company;
- property sales company;
- agency team;
- staff speaking for agency/company.

Examples:

"Saya dari ABC Property."

"Kami agency."

"Kami property marketing company."

"Agency kami punya 20 agent."

Agency follows Agent Sales AI for now.

When commercial reasoning is useful:

customerType="agency"
salesStrategyNeeded=true
salesStrategist="agent"

==================================================
DEVELOPER
==================================================

Use customerType="developer" when customer clearly represents:

- a property developer;
- developer company;
- development company;
- a development project;
- developer/project business.

Examples:

"Kami developer."

"Saya dari developer XYZ."

"Kami mau advertise project kami."

"Project kami ada 200 unit."

DEVELOPER IS A DIRECT ROUTE.

Developer does NOT go to Agent Sales AI.

Developer does NOT go to Owner Sales AI.

For Developer:

customerType="developer"
salesStrategyNeeded=false
salesStrategist="none"
factualKnowledgeNeeded=true

Request the approved Developer destination.

The response should direct them to:

https://www.tetamo.com/developer-license

Do not continue Agent/Owner qualification.

==================================================
BUYER / RENTER
==================================================

Use customerType="buyer_renter" when the person is primarily looking for
property to buy or rent.

This includes somebody searching:

- for themselves;
- for family;
- for investment;
- for a company.

Examples:

"Saya cari rumah."

"Saya mau beli villa."

"Cari apartment untuk sewa."

"Saya cari properti untuk keluarga."

BUYER/RENTER IS A DIRECT ROUTE.

Buyer/Renter does NOT go to Agent Sales AI.

Buyer/Renter does NOT go to Owner Sales AI.

For Buyer/Renter:

customerType="buyer_renter"
salesStrategyNeeded=false
salesStrategist="none"
factualKnowledgeNeeded=true

Request the approved Buyer/Renter destination.

The response should direct them to:

https://www.tetamo.com/pembeli

==================================================
BOTH AGENT AND OWNER
==================================================

If customer clearly says they are BOTH an Agent and Owner:

do not choose arbitrarily.

Use:

customerType="unknown"
salesStrategyNeeded=false
salesStrategist="none"

The immediate next step is to ask which journey they want to handle first:

Agent or Owner.

==================================================
NEW / UNKNOWN CUSTOMER
==================================================

If no role has been established:

NO SALES AI.

If the customer asks a GENERAL Tetamo question:

Examples:

"Tetamo itu apa?"

"Cover seluruh Indonesia?"

"Ada app?"

"Tetamo baru ya?"

Brain may request the exact approved general Tetamo facts needed.

The direct question may be answered first.

But the reply must still move toward establishing role afterward.

If the customer asks a ROLE-DEPENDENT commercial question:

Examples:

"Berapa harganya?"

"Paketnya apa?"

"Bayar ya?"

"Membership berapa?"

"Berapa listing?"

"Caranya join?"

do NOT guess Agent or Owner.

Role comes first because the applicable commercial product depends on role.

==================================================
FIRST INQUIRY PRINCIPLE
==================================================

For a genuinely new or unidentified contact:

Mona must not pretend she already knows whether they are Agent or Owner.

Mona must not imply Tetamo/Mona will personally create or upload their listing.

The conversational objective is:

1. respond appropriately to the immediate inquiry when a general factual
   answer is genuinely needed;
2. establish whether they are Agent or Property Owner;
3. only after role is established may the applicable Sales AI take over.

==================================================
CAMPAIGN CONTEXT
==================================================

Campaign context is WEAK CONTEXT ONLY.

It can help understand what campaign the customer may be reacting to.

IT CAN NEVER ESTABLISH CUSTOMER ROLE.

An Agent campaign does not make someone an Agent.

An Owner campaign does not make someone an Owner.

Example:

Agent campaign sent.
Customer: "iya"

Role remains unknown unless actual conversation establishes role.

Do not force Agent because templateName contains "agent" or "agen".

Do not force Owner because templateName contains "owner" or "pemilik".

==================================================
SHORT REPLIES
==================================================

Short replies must inherit meaning from the immediately preceding REAL
conversation when that context exists.

Examples:

Mona:
"Gold sampai 100 listing. Mau saya jelaskan Gold?"

Customer:
"iya"

If Agent role was already established, this can mean continue the Gold
conversation.

Another example:

Mona:
"Properti Ibu mau dijual atau disewakan?"

Customer:
"disewakan"

If Owner role was already established, this continues Owner journey.

But:

Campaign sent.
Customer:
"iya"

does NOT establish role by itself.

The same rule applies to:

ya
iya
mau
boleh
ok
oke
lanjut
info
yes
interested

==================================================
DIRECT QUESTIONS
==================================================

Identify what the customer is actually asking.

Do not replace a direct question with unnecessary discovery.

However, role gate still applies.

GENERAL QUESTION + UNKNOWN ROLE:

- use general Tetamo Knowledge if needed;
- answer the relevant factual question;
- then establish role.

ROLE-DEPENDENT COMMERCIAL QUESTION + UNKNOWN ROLE:

- establish role first;
- do not guess the applicable package/product.

==================================================
CONVERSATION SITUATION
==================================================

Choose one:

information
interest
comparison
objection
hesitation
rejection
closing
payment
support
casual
unknown

Examples:

"What is Tetamo?"
-> information

"Bedanya sama Rumah123?"
-> comparison

"Mahal."
-> objection

"Bulan depan aja."
-> hesitation

"Nggak tertarik."
-> rejection

"Saya pilih Gold."
-> closing

"Kirim link bayar."
-> payment

"Payment saya error."
-> support

"Makasih."
-> casual or closing depending context.

==================================================
PAYMENT DISTINCTION
==================================================

Do NOT treat these as readiness to pay:

"Bayar ya?"

"Ada fee?"

"Berbayar?"

"Kena biaya?"

"Harus bayar?"

These are fee/value questions.

Strong payment intent is more like:

"Saya mau bayar."

"Kirim link bayar."

"Cara bayar gimana?"

"QRIS mana?"

"Saya sudah transfer."

"Payment error."

==================================================
SALES AI OWNERSHIP
==================================================

Once role is established:

AGENT
-> Agent Sales AI owns commercial reasoning when needed.

AGENCY
-> Agent Sales AI owns commercial reasoning when needed.

OWNER
-> Owner Sales AI owns commercial reasoning when needed.

DEVELOPER
-> no Agent/Owner Sales AI.

BUYER_RENTER
-> no Agent/Owner Sales AI.

UNKNOWN
-> no Agent/Owner Sales AI.

IMPORTANT:

Once Agent/Agency/Owner role is established, a temporary general factual
question does NOT remove the customer from their commercial journey.

Example:

Established Agent:
"Tetamo punya buyer?"

Brain keeps customerType="agent".

Agent Sales AI remains commercial strategist.

Agent Sales AI can request general Tetamo Knowledge for approved buyer facts.

After answering that factual question, Sales AI can naturally decide when
to return to the commercial conversation.

Do NOT reset the journey.

==================================================
COMMERCIAL KNOWLEDGE OWNERSHIP
==================================================

Agent commercial facts belong to Agent Sales AI.

Examples:

- Silver;
- Gold;
- Agent Pro;
- Agent package price;
- Agent package capacity;
- Agent package features;
- Agent package recommendation.

Owner commercial facts belong to Owner Sales AI.

Examples:

- Basic;
- Priority;
- Featured;
- Owner package price;
- Owner package features;
- Owner package recommendation.

Boost and Spotlight commercial pricing are also available inside Sales AIs.

Brain should NOT request general Tetamo Knowledge merely to answer those
commercial package facts.

==================================================
GENERAL TETAMO KNOWLEDGE
==================================================

Set factualKnowledgeNeeded=true only when approved general Tetamo facts
are required.

Examples include:

- what Tetamo is;
- official Tetamo destinations;
- website/app;
- buyer/renter database;
- buyer matching;
- international buyers;
- lead workflow;
- buyer quality boundaries;
- Tetamo coverage;
- nationwide Indonesia coverage;
- growth;
- traffic;
- advertising;
- social media exposure;
- search exposure;
- comparison with another portal;
- comparison with posting yourself;
- proof;
- testimonials;
- results;
- verification;
- listing status;
- commission/business model;
- cancellation;
- refund;
- subscription policy;
- payment methods;
- support contact;
- general platform capabilities;
- registration requirements;
- proposal/portfolio capability;
- push notifications;
- Developer destination;
- Buyer/Renter destination.

knowledgeRequest must describe ONLY the exact facts needed.

==================================================
KNOWLEDGE EPISTEMIC RULE
==================================================

Approved Knowledge explicitly supports something:
-> it may be stated.

Approved Knowledge explicitly says something is unsupported:
-> it may be stated as unsupported.

Information is absent:
-> UNKNOWN / UNVERIFIED.

Never turn missing information into:

"Tetamo doesn't have it."

==================================================
BUYER / LEAD / PERFORMANCE QUESTIONS
==================================================

Questions may include:

"Buyer serius gak?"

"Qualified gak?"

"Cuma kepo?"

"Lead bagus?"

"Jamin dapat lead?"

"Jamin closing?"

"Berapa lama closing?"

"Berapa lama sampai laku?"

Request the approved Buyer Quality / Lead Expectations / no-guarantee facts.

Do NOT automatically turn every concern into:

- Direct WhatsApp;
- Leads Dashboard;
- Viewing Schedule;
- listing presentation;
- generic feature dumping.

Retrieve only facts relevant to the actual concern.

==================================================
MEMORY / DO NOT RESTART
==================================================

Memory is authoritative for what has already happened.

If earlier:

"Saya agent, 2 tahun, sekitar 80 listing."

and later:

"Kalau Gold gimana?"

do NOT ask role again.

Do NOT ask listing count again.

If earlier:

"Saya bantu jual rumah kakak saya."

and later:

"Fotonya sudah siap."

keep Owner journey.

If earlier package was selected:

do not restart package discovery.

If payment started:

do not restart sales qualification.

If objection was already answered:

do not blindly repeat the same explanation.

==================================================
REJECTION
==================================================

Hard rejection includes:

tidak tertarik
nggak tertarik
gak tertarik
tidak mau
nggak mau
gak mau
jangan hubungi lagi
jangan chat lagi
stop
unsubscribe
hapus nomor saya
don't contact me
not interested

For hard rejection:

conversationSituation="rejection"
factualKnowledgeNeeded=false
knowledgeRequest=[]

If an Agent/Agency role is already established:
salesStrategyNeeded=true
salesStrategist="agent"

If an Owner role is already established:
salesStrategyNeeded=true
salesStrategist="owner"

If role is unknown:
salesStrategyNeeded=false
salesStrategist="none"

The established Sales AI owns the stop_selling strategy and natural acknowledgement.
Do not recommend another sales question. Do not hand over merely because the customer rejected the sale.

==================================================
HESITATION / FUTURE DEPENDENCY
==================================================

Examples:

nanti dulu
bulan depan
belum sekarang
habis gajian
tunggu foto
tunggu dokumen
tanya suami
tanya istri
tanya keluarga
tanya bos
diskusi partner

These are hesitation, not hard rejection.

Do not pressure.

Do not restart discovery.

Preserve the future dependency in knownContext when useful.

You MUST also classify it explicitly in timingDependency.

timingDependency.active=true ONLY when the customer has a real future
condition, waiting point, dependency, or stated later time before continuing.

Examples that ARE timing dependencies:

- bulan depan
- minggu depan
- nanti setelah gajian
- habis gajian
- tunggu foto
- tunggu dokumen
- saya tanya suami dulu
- saya tanya istri dulu
- tunggu keluarga
- tunggu bos
- saya diskusi partner dulu
- setelah owner jawab
- nanti saya kabari setelah meeting

Examples that are NOT automatically timing dependencies:

- mahal ya
- saya ragu
- saya pikir-pikir dulu
- belum yakin
- saya bandingkan dulu
- kurang cocok
- ada diskon?

Do not mark timingDependency.active=true merely because
conversationSituation="hesitation".

timingDependency.reason must briefly state the actual dependency when active.
Otherwise reason=null.

Actual follow-up timing belongs to Orchestrator/Scheduler.

==================================================
POLITE ENDING
==================================================

Examples:

makasih
terima kasih
thanks
noted
sip
oke makasih
sudah jelas
cukup

Also recognize SHORT CONTEXTUAL ACKNOWLEDGEMENTS such as:

ok
oke
baik
baik kak
baik kk
sip
siap
iya baik

These are acknowledgement-only messages ONLY when the real preceding conversation
shows the customer is simply acknowledging Mona's completed explanation or next step.

Do NOT treat "iya", "ok", "baik" or similar short replies as an ending when they are
actually answering a question Mona asked or supplying information that moves the
conversation forward.

When the latest customer message is only an acknowledgement AND:

- it contains no new question;
- it contains no new fact, objection, request or decision;
- Mona's immediately previous message already gave the relevant answer or next step;

then normally:

replyNeeded=false

Do not create another reply merely to acknowledge the acknowledgement.
Do not repeat, paraphrase or summarize Mona's immediately previous answer.

Do not invent another sales question.

replyNeeded may be false if silence is more natural.

==================================================
HANDOVER
==================================================

Recommend handover only when:

- meaning genuinely cannot be understood even after Memory; or
- human access/action is genuinely required.

The handover flag is advisory reasoning only. Deterministic application code decides
whether Mona is actually paused for a human.

Do NOT hand over merely because:

- slang is used;
- customer asks normal Tetamo information;
- customer asks package questions or whether Tetamo is paid;
- customer raises an objection or hesitation;
- customer rejects the sales offer;
- customer asks how to list;
- customer asks about buyers;
- customer asks about features.

==================================================
INBOUND SAFETY BOUNDARY
==================================================

Brain does NOT own webhook/event filtering.

Inbound Gate will separately own:

- emoji/reaction-only events;
- sticker-only events;
- attachment-only handling;
- delivery/status events;
- campaign/template echoes;
- Mona-generated events;
- Admin-generated events;
- human takeover suppression;
- opt-out suppression;
- duplicate webhook idempotency;
- message burst grouping.

==================================================
ORCHESTRATOR BOUNDARY
==================================================

Brain does NOT schedule follow-ups.

Brain may recognize:

- future dependency;
- silence-sensitive sales state;
- payment pending;
- photos pending;
- approval pending;
- customer will return later.

But actual timing belongs to Orchestrator/Scheduler.

==================================================
OUTPUT
==================================================

Return internal reasoning only.

Never write Mona's customer-facing WhatsApp reply.
`.trim();

function fallbackBrainDecision(
  latestCustomerMessage: string
): MonaBrainDecision {
  return {
    understood: true,
    confidence: 0.2,
    clarificationNeeded: false,

    customerType: "unknown",

    languageStyle: {
      primaryLanguage: "unknown",
      style: "natural WhatsApp conversation",
    },

    latestMeaning:
      String(latestCustomerMessage || "").trim() ||
      "No readable message.",

    conversationSituation: "unknown",

    timingDependency: {
      active: false,
      reason: null,
    },

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
      "Establish the customer's role before any Agent or Owner Sales AI can run. Do not guess.",
  };
}

function cleanString(value: unknown): string {
  return String(value ?? "").trim();
}

function cleanNullableString(
  value: unknown
): string | null {
  const text = cleanString(value);
  return text || null;
}

function cleanStringArray(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

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

    const allowedCustomerTypes =
      new Set<MonaCustomerType>([
        "agent",
        "owner",
        "agency",
        "developer",
        "buyer_renter",
        "unknown",
      ]);

    const allowedSituations =
      new Set<MonaConversationSituation>([
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
      parsed.languageStyle &&
      typeof parsed.languageStyle === "object"
        ? parsed.languageStyle
        : {};

    const knownContext =
      parsed.knownContext &&
      typeof parsed.knownContext === "object"
        ? parsed.knownContext
        : {};

    const timingDependency =
      parsed.timingDependency &&
      typeof parsed.timingDependency === "object"
        ? parsed.timingDependency
        : {};

    const confidenceNumber =
      Number(parsed.confidence);

    return {
      understood:
        typeof parsed.understood === "boolean"
          ? parsed.understood
          : fallback.understood,

      confidence:
        Number.isFinite(confidenceNumber)
          ? Math.max(
              0,
              Math.min(1, confidenceNumber)
            )
          : fallback.confidence,

      clarificationNeeded:
        parsed.clarificationNeeded === true,

      customerType:
        allowedCustomerTypes.has(
          parsed.customerType as MonaCustomerType
        )
          ? (parsed.customerType as MonaCustomerType)
          : fallback.customerType,

      languageStyle: {
        primaryLanguage:
          allowedLanguages.has(
            String(
              languageStyle.primaryLanguage
            )
          )
            ? (languageStyle.primaryLanguage as
                | "id"
                | "en"
                | "mixed"
                | "unknown")
            : fallback.languageStyle
                .primaryLanguage,

        style:
          cleanString(
            languageStyle.style
          ) ||
          fallback.languageStyle.style,
      },

      latestMeaning:
        cleanString(parsed.latestMeaning) ||
        fallback.latestMeaning,

      conversationSituation:
        allowedSituations.has(
          parsed.conversationSituation as
            MonaConversationSituation
        )
          ? (parsed.conversationSituation as
              MonaConversationSituation)
          : fallback.conversationSituation,

      timingDependency: {
        active:
          timingDependency.active === true,
        reason:
          timingDependency.active === true
            ? cleanNullableString(
                timingDependency.reason
              )
            : null,
      },

      knownContext: {
        summary:
          cleanString(
            knownContext.summary
          ),

        importantFacts:
          cleanStringArray(
            knownContext.importantFacts
          ),

        alreadyAnsweredTopics:
          cleanStringArray(
            knownContext.alreadyAnsweredTopics
          ),
      },

      replyNeeded:
        typeof parsed.replyNeeded === "boolean"
          ? parsed.replyNeeded
          : fallback.replyNeeded,

      // HANDOVER SAFETY:
      // The model may describe that human help could be useful, but it does
      // not get final authority to pause Mona. enforceBrainRouting() below
      // owns deterministic handover decisions.
      handoverRecommended: false,

      handoverReason:
        cleanNullableString(
          parsed.handoverReason
        ),

      salesStrategyNeeded:
        parsed.salesStrategyNeeded === true,

      salesStrategist:
        allowedStrategists.has(
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
        cleanStringArray(
          parsed.knowledgeRequest
        ),

      directQuestion:
        cleanNullableString(
          parsed.directQuestion
        ),

      recommendedNextStep:
        cleanString(
          parsed.recommendedNextStep
        ) ||
        fallback.recommendedNextStep,
    };
  } catch {
    return fallback;
  }
}

function buildConversationForBrain(
  memory: MonaConversationMemory
) {
  if (!memory.messages.length) {
    return "No earlier conversation.";
  }

  const memoryContext = [
    "MEMORY CONTEXT:",
    `Campaign-only before first customer conversation: ${
      memory.campaignOnlyBeforeCustomerConversation ? "yes" : "no"
    }`,
    `Human/Admin intervention detected: ${
      memory.humanInterventionDetected ? "yes" : "no"
    }`,
    "",
    "FULL CONVERSATION FROM THE BEGINNING:",
  ].join("\n");

  const transcript = memory.messages
    .map(
      (item) =>
        `[${item.createdAt}] ${item.speaker}: ${item.message}`
    )
    .join("\n");

  return `${memoryContext}\n${transcript}`;
}

function isHardRejection(
  message: string
) {
  return (
    /\b(?:tidak|nggak|gak|ga)\s+(?:tertarik|minat|mau)\b/i.test(
      message
    ) ||
    /\bjangan\s+(?:hubungi|chat|wa|contact)\b/i.test(
      message
    ) ||
    /\bstop\b/i.test(message) ||
    /\bunsubscribe\b/i.test(message) ||
    /\bhapus\s+nomor\b/i.test(message) ||
    /\bdon'?t\s+contact\s+me\b/i.test(
      message
    ) ||
    /\bnot\s+interested\b/i.test(
      message
    )
  );
}

function isFeeQuestion(
  message: string
) {
  return /^(?:ini\s+)?(?:(?:bayar|berbayar|kena\s+biaya|harus\s+bayar)(?:\s+(?:ya+|kah|kan|gak|nggak|ga|enggak))?|ada\s+(?:fee|biaya)(?:\s+(?:ya+|kah|kan|gak|nggak|ga|enggak))?|is\s+it\s+paid|do\s+i\s+have\s+to\s+pay)[?.! ]*$/i.test(
    message
  );
}

function isCommercialPackageQuestion(
  decision: MonaBrainDecision,
  latestMessage: string
) {
  const signal = [
    latestMessage,
    decision.latestMeaning,
    decision.directQuestion || "",
    ...decision.knowledgeRequest,
    decision.recommendedNextStep,
  ]
    .join(" ")
    .toLowerCase();

  const mentionsCommercialPackage =
    /\b(?:harga|harganya|price|pricing|cost|biaya|fee|berbayar|paket|package|membership|silver|gold|agent\s*pro|basic|priority|featured|boost|spotlight)\b/i.test(
      signal
    );

  const looksLikeAccountOrPaymentSupport =
    decision.conversationSituation === "support" ||
    /\b(?:error|gagal|failed|double|dua\s*kali|sudah\s+bayar|udah\s+bayar|sudah\s+transfer|udah\s+transfer|belum\s+aktif|tidak\s+aktif|nggak\s+aktif)\b/i.test(
      latestMessage
    );

  return (
    mentionsCommercialPackage &&
    !looksLikeAccountOrPaymentSupport
  );
}

function isExplicitHumanRequest(
  message: string
) {
  return (
    /(?:hubungkan|sambungkan|connect).{0,20}(?:admin|cs|customer service|human|orang|staff)/i.test(
      message
    ) ||
    /(?:mau|ingin|pengen|boleh|bisa).{0,20}(?:bicara|ngobrol|chat|talk|speak).{0,20}(?:admin|cs|customer service|human|orang|staff)/i.test(
      message
    ) ||
    /(?:speak|talk|chat).{0,20}(?:to|with).{0,10}(?:a\s+)?(?:human|admin|staff|customer service)/i.test(
      message
    ) ||
    /^(?:admin|human|cs|customer service|staff)\s*(?:please|pls|ya|dong)?[?.! ]*$/i.test(
      message
    )
  );
}

function deterministicHumanHandoverReason(
  decision: MonaBrainDecision,
  latestMessage: string
): string | null {
  const signal = [
    latestMessage,
    decision.latestMeaning,
    decision.directQuestion || "",
    ...decision.knowledgeRequest,
    decision.recommendedNextStep,
  ]
    .join(" ")
    .toLowerCase();

  // Refund belongs to the human team. Mona may know the policy, but an actual
  // refund/refund-eligibility conversation should be escalated rather than
  // negotiated or decided by Sales AI.
  if (
    /\b(?:refund|chargeback)\b|pengembalian\s+uang|uang\s+kembali|balikin\s+uang|kembalikan\s+uang/i.test(
      signal
    )
  ) {
    return "The customer is asking about a refund/refund action that requires the Tetamo team.";
  }

  // Legal disputes, notices and legal-action requests must never be handled as
  // ordinary sales objections.
  if (
    /\b(?:legal|lawyer|attorney|lawsuit|sue|litigation)\b|pengacara|somasi|gugatan|sengketa|legal\s+notice|surat\s+hukum/i.test(
      signal
    )
  ) {
    return "The customer raised a legal matter that requires human handling.";
  }

  // Brain already classifies account/payment/verification problems as support.
  // Support is a human-owned route, not a Sales AI objection route.
  if (decision.conversationSituation === "support") {
    return "The customer has a support issue that requires the Tetamo team.";
  }

  if (isExplicitHumanRequest(latestMessage)) {
    return "The customer explicitly requested a human/admin conversation.";
  }

  return null;
}

function isTimingHesitation(
  message: string
) {
  return (
    /(?:nggak|gak|ga|ngga|enggak|tidak)\s+dulu/i.test(
      message
    ) ||
    /belum\s+(?:mau|bisa|siap)\s+(?:daftar|join|gabung|ambil)/i.test(
      message
    ) ||
    /nanti\s+(?:aja|saja)/i.test(
      message
    ) ||
    /bulan\s+depan/i.test(
      message
    ) ||
    /belum\s+sekarang/i.test(
      message
    ) ||
    /habis\s+gajian/i.test(
      message
    ) ||
    /tunggu\s+(?:foto|dokumen)/i.test(
      message
    ) ||
    /tanya\s+(?:suami|istri|keluarga|bos)/i.test(
      message
    ) ||
    /diskusi\s+partner/i.test(
      message
    )
  );
}

function enforceBrainRouting(
  decision: MonaBrainDecision,
  latestCustomerMessage: string
): MonaBrainDecision {
  const latestMessage = String(
    latestCustomerMessage || ""
  ).trim();

  // Preserve Brain's original clarification instruction before deterministic
  // routing can rewrite recommendedNextStep for package, fee or sales handling.
  const clarificationNextStep =
    decision.clarificationNeeded
      ? decision.recommendedNextStep
      : null;

  // Preserve an intentional model decision to stay silent on a completed
  // acknowledgement turn before normal commercial routing can re-open it.
  const acknowledgementSilence =
    decision.replyNeeded === false &&
    decision.conversationSituation === "casual";

  // Model output may classify or recommend, but deterministic routing owns
  // whether Mona is actually paused for a human. Start every understood turn
  // with handover cleared and only enable it below for explicit human-only cases.
  let result: MonaBrainDecision = {
    ...decision,
    handoverRecommended: false,
    handoverReason: null,
  };

  /*
   * STRICT ROLE GATE
   */
  if (result.customerType === "unknown") {
    result = {
      ...result,
      salesStrategyNeeded: false,
      salesStrategist: "none",
      recommendedNextStep:
        result.factualKnowledgeNeeded &&
        result.directQuestion
          ? "Answer only the approved general Tetamo question that the customer asked, then establish whether the customer is an Agent or Property Owner before any Agent/Owner Sales AI can run."
          : "Establish whether the customer is an Agent or Property Owner before any Agent/Owner Sales AI can run. Do not guess the role.",
    };
  }

  /*
   * DEVELOPER DIRECT ROUTE
   */
  if (result.customerType === "developer") {
    result = {
      ...result,
      salesStrategyNeeded: false,
      salesStrategist: "none",
      factualKnowledgeNeeded: true,
      knowledgeRequest: [
        "approved Tetamo Developer destination and developer-license link",
      ],
      recommendedNextStep:
        "Direct the customer to Tetamo's Developer journey at https://www.tetamo.com/developer-license. Do not route into Agent or Owner Sales AI.",
    };
  }

  /*
   * BUYER / RENTER DIRECT ROUTE
   */
  if (
    result.customerType ===
    "buyer_renter"
  ) {
    result = {
      ...result,
      salesStrategyNeeded: false,
      salesStrategist: "none",
      factualKnowledgeNeeded: true,
      knowledgeRequest: [
        "approved Tetamo Buyer/Renter destination and buyer requirements link",
      ],
      recommendedNextStep:
        "Direct the customer to Tetamo's Buyer/Renter journey at https://www.tetamo.com/pembeli. Do not route into Agent or Owner Sales AI.",
    };
  }

  /*
   * STRATEGIST CONSISTENCY
   */
  if (
    result.customerType === "agent" ||
    result.customerType === "agency"
  ) {
    result = {
      ...result,
      salesStrategist:
        result.salesStrategyNeeded
          ? "agent"
          : "none",
    };
  }

  if (
    result.customerType === "owner"
  ) {
    result = {
      ...result,
      salesStrategist:
        result.salesStrategyNeeded
          ? "owner"
          : "none",
    };
  }

  /*
   * SALES CONVERSATION OWNERSHIP
   *
   * Brain classifies the situation; Agent/Owner Sales AI owns the commercial
   * response strategy for objections, comparisons, hesitation and rejection.
   * These normal sales situations must never be escalated merely because the
   * model suggested a handover.
   */
  const salesConversationSituation =
    result.conversationSituation === "objection" ||
    result.conversationSituation === "comparison" ||
    result.conversationSituation === "hesitation" ||
    result.conversationSituation === "rejection";

  if (salesConversationSituation) {
    if (
      result.customerType === "agent" ||
      result.customerType === "agency"
    ) {
      result = {
        ...result,
        replyNeeded: true,
        salesStrategyNeeded: true,
        salesStrategist: "agent",
        handoverRecommended: false,
        handoverReason: null,
      };
    } else if (result.customerType === "owner") {
      result = {
        ...result,
        replyNeeded: true,
        salesStrategyNeeded: true,
        salesStrategist: "owner",
        handoverRecommended: false,
        handoverReason: null,
      };
    }
  }

  /*
   * COMMERCIAL PACKAGE / PRICE QUESTIONS
   *
   * Owner/Agent package names, prices and package features belong to the
   * relevant Sales AI, not general Tetamo Knowledge. This also covers short
   * contextual follow-ups such as "Harganya mana?" when Brain's semantic
   * interpretation identifies the package/pricing topic.
   */
  if (
    isCommercialPackageQuestion(
      result,
      latestMessage
    )
  ) {
    if (
      result.customerType === "agent" ||
      result.customerType === "agency"
    ) {
      result = {
        ...result,
        replyNeeded: true,
        salesStrategyNeeded: true,
        salesStrategist: "agent",
        factualKnowledgeNeeded: false,
        knowledgeRequest: [],
        handoverRecommended: false,
        handoverReason: null,
        recommendedNextStep:
          "Route the Agent package/price question to Agent Sales AI so canonical commercial facts can answer it. Do not hand over for a normal package or price question.",
      };
    } else if (
      result.customerType === "owner"
    ) {
      result = {
        ...result,
        replyNeeded: true,
        salesStrategyNeeded: true,
        salesStrategist: "owner",
        factualKnowledgeNeeded: false,
        knowledgeRequest: [],
        handoverRecommended: false,
        handoverReason: null,
        recommendedNextStep:
          "Route the Owner package/price question to Owner Sales AI so canonical commercial facts can answer it. Do not hand over for a normal package or price question.",
      };
    }
  }

  /*
   * FEE QUESTION IS NOT PAYMENT INTENT
   */
  if (isFeeQuestion(latestMessage)) {
    if (
      result.customerType === "agent" ||
      result.customerType === "agency"
    ) {
      result = {
        ...result,
        conversationSituation:
          "information",
        replyNeeded: true,
        salesStrategyNeeded: true,
        salesStrategist: "agent",
        factualKnowledgeNeeded: false,
        knowledgeRequest: [],
        handoverRecommended: false,
        handoverReason: null,
        recommendedNextStep:
          "Route the fee/value question to Agent Sales AI. This is not active payment intent.",
      };
    } else if (
      result.customerType === "owner"
    ) {
      result = {
        ...result,
        conversationSituation:
          "information",
        replyNeeded: true,
        salesStrategyNeeded: true,
        salesStrategist: "owner",
        factualKnowledgeNeeded: false,
        knowledgeRequest: [],
        handoverRecommended: false,
        handoverReason: null,
        recommendedNextStep:
          "Route the fee/value question to Owner Sales AI. This is not active payment intent.",
      };
    } else if (
      result.customerType === "unknown"
    ) {
      result = {
        ...result,
        conversationSituation:
          "information",
        replyNeeded: true,
        salesStrategyNeeded: false,
        salesStrategist: "none",
        factualKnowledgeNeeded: true,
        knowledgeRequest: [
          "approved Tetamo business model and whether Tetamo charges applicable paid services",
        ],
        handoverRecommended: false,
        handoverReason: null,
        recommendedNextStep:
          "Answer from approved general Tetamo business-model knowledge that Tetamo has applicable paid services, then establish whether the customer is an Agent or Property Owner before giving role-specific prices.",
      };
    }
  }

  /*
   * HESITATION DOES NOT TRIGGER SALES RESCUE
   */
  if (
    !isHardRejection(latestMessage) &&
    isTimingHesitation(latestMessage)
  ) {
    const isAgentRole =
      result.customerType === "agent" ||
      result.customerType === "agency";
    const isOwnerRole =
      result.customerType === "owner";

    result = {
      ...result,
      conversationSituation:
        "hesitation",
      replyNeeded: true,
      salesStrategyNeeded:
        isAgentRole || isOwnerRole
          ? true
          : result.salesStrategyNeeded,
      salesStrategist: isAgentRole
        ? "agent"
        : isOwnerRole
          ? "owner"
          : result.salesStrategist,
      factualKnowledgeNeeded: false,
      knowledgeRequest: [],
      directQuestion: null,
      handoverRecommended: false,
      handoverReason: null,
      recommendedNextStep:
        isAgentRole || isOwnerRole
          ? "Route the hesitation to the established Sales AI. Acknowledge the customer's timing or dependency without pressure and do not restart discovery."
          : "Acknowledge the customer's timing or dependency without pressure. Do not restart discovery or try to rescue the sale with another question.",
    };
  }

  /*
   * HARD REJECTION HAS FINAL PRIORITY
   */
  if (
    isHardRejection(latestMessage)
  ) {
    const isAgentRole =
      result.customerType === "agent" ||
      result.customerType === "agency";
    const isOwnerRole =
      result.customerType === "owner";

    result = {
      ...result,
      conversationSituation:
        "rejection",
      replyNeeded: true,
      salesStrategyNeeded:
        isAgentRole || isOwnerRole,
      salesStrategist: isAgentRole
        ? "agent"
        : isOwnerRole
          ? "owner"
          : "none",
      factualKnowledgeNeeded: false,
      knowledgeRequest: [],
      directQuestion: null,
      handoverRecommended: false,
      handoverReason: null,
      recommendedNextStep:
        isAgentRole || isOwnerRole
          ? "Route the rejection to the established Sales AI so it can stop selling, acknowledge the rejection naturally and prevent another sales question."
          : "Respect the customer's rejection, acknowledge it naturally and do not ask the customer to establish a role.",
    };
  }

  /*
   * PARTIAL UNDERSTANDING / CLARIFICATION
   * -------------------------------------
   * Brain may understand the likely meaning but still need one material detail
   * confirmed before Sales AI or Knowledge should answer.
   *
   * This intentionally does NOT apply when understood=false. Truly unreadable
   * messages keep the existing immediate human handover behavior.
   */
  if (
    result.understood &&
    result.clarificationNeeded &&
    !isHardRejection(latestMessage)
  ) {
    result = {
      ...result,
      replyNeeded: true,
      handoverRecommended: false,
      handoverReason: null,
      salesStrategyNeeded: false,
      salesStrategist: "none",
      factualKnowledgeNeeded: false,
      knowledgeRequest: [],
      directQuestion: null,
      recommendedNextStep:
        clarificationNextStep ||
        "Ask one short natural clarification about the uncertain detail before answering. Do not guess.",
    };
  }

  /*
   * ACKNOWLEDGEMENT SILENCE
   * ----------------------
   * If Brain already determined that a casual acknowledgement needs no reply,
   * ordinary package/sales routing must not reopen the conversation merely
   * because remembered context contains a package, price or payment topic.
   */
  if (
    acknowledgementSilence &&
    !result.clarificationNeeded
  ) {
    result = {
      ...result,
      replyNeeded: false,
      salesStrategyNeeded: false,
      salesStrategist: "none",
      factualKnowledgeNeeded: false,
      knowledgeRequest: [],
      directQuestion: null,
      handoverRecommended: false,
      handoverReason: null,
    };
  }

  /*
   * DETERMINISTIC HUMAN-ONLY ROUTES
   * Refund, legal, support and an explicit request for a human belong to the
   * Tetamo team. Normal pricing, package questions, objections, hesitation and
   * rejection do NOT belong here.
   */
  const humanHandoverReason =
    deterministicHumanHandoverReason(
      result,
      latestMessage
    );

  if (humanHandoverReason) {
    result = {
      ...result,
      replyNeeded: false,
      handoverRecommended: true,
      handoverReason: humanHandoverReason,
      salesStrategyNeeded: false,
      salesStrategist: "none",
    };
  }

  return result;
}

export async function analyseMonaBrain(
  params: AnalyseMonaBrainParams
): Promise<MonaBrainDecision> {
  const fallback =
    fallbackBrainDecision(
      params.latestCustomerMessage
    );

  if (!process.env.OPENAI_API_KEY) {
    return enforceBrainRouting(
      fallback,
      params.latestCustomerMessage
    );
  }

  const openai = new OpenAI({
    apiKey:
      process.env.OPENAI_API_KEY,
  });

  const conversation =
    buildConversationForBrain(
      params.memory
    );

  const prompt = `
${MONA_BRAIN_PROMPT}

OFFICIAL SALES STAGE:
${params.salesStage || "none"}

CAMPAIGN CONTEXT:
${
  params.campaignContext
    ? JSON.stringify(
        params.campaignContext,
        null,
        2
      )
    : "none"
}

IMPORTANT:
Campaign context is supplied only as weak context.
It must NEVER establish Agent, Owner, Agency, Developer or Buyer/Renter role.

FULL AVAILABLE CONVERSATION FROM THE BEGINNING:
${conversation}

LATEST CUSTOMER MESSAGE:
${params.latestCustomerMessage}

Before returning JSON:

1. Reconstruct the conversation from Memory.
2. Determine whether this is new, returning, campaign-only, an existing sales
   journey, payment/support journey or previously closed/rejected.
3. Recover any established customer role and facts.
4. Only then interpret the latest message.
5. Decide whether one important detail still requires clarification.
6. Apply the strict role gate.
7. Decide routing and Knowledge requirements.

Return ONLY valid JSON in exactly this structure:

{
  "understood": true,
  "confidence": 0.95,
  "clarificationNeeded": false,

  "customerType": "agent|owner|agency|developer|buyer_renter|unknown",

  "languageStyle": {
    "primaryLanguage": "id|en|mixed|unknown",
    "style": "short description of how this customer naturally communicates"
  },

  "latestMeaning": "plain-language interpretation of the latest customer message in full conversation context",

  "conversationSituation": "information|interest|comparison|objection|hesitation|rejection|closing|payment|support|casual|unknown",

  "timingDependency": {
    "active": false,
    "reason": null
  },

  "knownContext": {
    "summary": "short useful summary including customer/conversation state and any established journey",
    "importantFacts": [],
    "alreadyAnsweredTopics": []
  },

  "replyNeeded": true,

  "handoverRecommended": false,
  "handoverReason": null,

  "salesStrategyNeeded": false,
  "salesStrategist": "agent|owner|none",

  "factualKnowledgeNeeded": false,
  "knowledgeRequest": [],

  "directQuestion": null,

  "recommendedNextStep": "brief internal instruction for what should happen next"
}

OUTPUT RULES:

- customerType unknown means salesStrategyNeeded=false and salesStrategist=none.
- Developer means no Sales AI and direct Developer journey.
- Buyer/Renter means no Sales AI and direct Buyer/Renter journey.
- Agent/Agency may use Agent Sales AI.
- Owner may use Owner Sales AI.
- Campaign never establishes role.
- clarificationNeeded=true only when understood=true but one material detail must be confirmed before answering safely.
- clarificationNeeded=true means ask one clarification; do not guess and do not hand over merely for clarification.
- If the latest message is only a contextual acknowledgement of Mona's already-complete previous answer and adds no new question, fact, request, objection or decision, normally set replyNeeded=false.
- Never generate another turn merely to repeat or paraphrase Mona's immediately previous answer.
- timingDependency.active=true only for a real future dependency, waiting condition, or stated later time.
- Generic objection or hesitation alone does not activate timingDependency.
- Do not write a WhatsApp reply.
- Do not include markdown.
`.trim();

  try {
    const response =
      await openai.responses.create({
        model: "gpt-4.1-mini",
        input: prompt,
        temperature: 0.1,
        max_output_tokens: 900,
      });

    let decision =
      parseBrainDecision(
        String(
          response.output_text || ""
        ),
        fallback
      );

    decision =
      enforceBrainRouting(
        decision,
        params.latestCustomerMessage
      );

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
    console.error(
      "Tetamo Mona Brain analysis failed:",
      error
    );

    return enforceBrainRouting(
      fallback,
      params.latestCustomerMessage
    );
  }
}
