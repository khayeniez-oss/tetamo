
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

export type MonaBrainIntent =
  | "platform_features"
  | "feature_details"
  | "feature_example"
  | "feature_availability"
  | "package_features"
  | "package_price"
  | "package_recommendation"
  | "competitor_comparison"
  | "existing_solution_objection"
  | "bad_past_experience"
  | "self_marketing_objection"
  | "price_objection"
  | "proof_testimonial"
  | "traffic_growth"
  | "buyer_availability"
  | "buyer_quality"
  | "guarantee_question"
  | "how_to_list"
  | "how_to_use"
  | "registration"
  | "payment"
  | "acknowledgement"
  | "support"
  | "general_information"
  | "unknown";


export type MonaBrainClarificationKind =
  | "role"
  | "meaning"
  | "journey_choice"
  | "none";

export type MonaBrainDecision = {
  understood: boolean;
  confidence: number;

  customerType: MonaCustomerType;

  clarification: {
    needed: boolean;
    kind: MonaBrainClarificationKind;
    alreadyAttempted: boolean;
    attemptCount: 0 | 1;
    goal: string | null;
  };

  languageStyle: {
    primaryLanguage: "id" | "en" | "mixed" | "unknown";
    style: string;
  };

  normalizedMessage: string;
  latestMeaning: string;
  conversationSituation: MonaConversationSituation;
  intent: MonaBrainIntent;
  intentSubject: string | null;

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

type MonaBrainSemanticReview = {
  source: "agent_sales" | "owner_sales";
  reason: string;
  suggestedMeaning?: string | null;
} | null;

type AnalyseMonaBrainParams = {
  memory: MonaConversationMemory;
  latestCustomerMessage: string;
  salesStage?: string | null;
  campaignContext?: MonaBrainCampaignContext;

  /*
   * Optional one-time private feedback from a Sales specialist when the
   * specialist detects a genuine contradiction in Brain's resolved meaning.
   *
   * This is NOT customer text and must never be treated as a new customer
   * message or as factual truth. Brain remains the semantic authority.
   */
  semanticReview?: MonaBrainSemanticReview;
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
- Indonesian WhatsApp slang;
- shortened words;
- omitted vowels;
- omitted prefixes or suffixes;
- words joined together;
- words split apart;
- phonetic spelling;
- regional/informal spelling;
- abbreviations;
- typos;
- incomplete sentences;
- informal grammar;
- property jargon;
- sales jargon.

INDONESIAN WHATSAPP IS OFTEN COMPRESSED.

Do NOT require formal Indonesian spelling before understanding a message.
Recover the intended normal Indonesian meaning from the conversation.

Common high-confidence forms include, but are NOT limited to:

brp -> berapa
gmn -> gimana / bagaimana
dmn -> di mana
drmn -> dari mana
knp -> kenapa
krn -> karena
klo / kl -> kalau
kpn -> kapan
hrg -> harga
hrgnya -> harganya
byr -> bayar
byrnya -> bayarnya
udh / udh -> sudah
blm -> belum
msh -> masih
sy / sya -> saya
gw / gue -> aku / saya
aq -> aku
yg -> yang
dgn -> dengan
bgt / bngt -> banget
gk / ga / gak / nggak / ngga / enggak -> tidak / no
bs / bsa -> bisa
mw / mo -> mau
pgn -> pengen / ingin
jd / jdi -> jadi
tp -> tapi
lg -> lagi
org -> orang
sm -> sama (when context supports it)
dpt / dapet -> dapat
trs -> terus
trus -> terus
sgt -> sangat
skrg -> sekarang
bsk -> besok
kmrn -> kemarin
mingdep -> minggu depan
blndpn / bln dpn -> bulan depan
adminnya -> admin
cs -> customer service / admin depending context
wa -> WhatsApp
no wa / nowa -> nomor WhatsApp
sosmed -> social media
ig -> Instagram
fb -> Facebook
tt -> TikTok only when context clearly supports it
app -> application / aplikasi
web -> website

PROPERTY / SALES-SPECIFIC COMPRESSED INDONESIAN MAY INCLUDE:

djual -> dijual
d jual -> dijual
di jual -> dijual
djualin -> dijualkan / jualkan
jualin -> jualkan / menjualkan
jualkn -> jualkan
mw jual / mo jual -> mau menjual
dsewa -> disewa
d sewa -> disewa
di sewa -> disewa
disewain -> disewakan
sewain -> sewakan / disewakan
sewakan -> sewakan
rmh -> rumah
aprt / apt -> apartemen / apartment
villa / vila -> villa
tnh -> tanah
ruko -> ruko
kav -> kavling when context supports it
prop -> properti / property when context supports it
properti sy -> properti saya
listing sy -> listing saya
list -> listing when property context supports it
listingan -> listing / daftar listing
agen -> agent
agt -> agent only when property context clearly supports it
marketing property -> property sales/marketing context
buyer -> buyer / pembeli
renter -> penyewa
lead -> lead / calon pelanggan
prospek -> prospect / lead
closing -> closing / transaksi berhasil
komisi -> commission
fee -> biaya
member / membership -> membership
paket -> package
fitur -> feature
boost -> Boost listing
spotlight -> Homepage Spotlight
featured -> Featured listing / placement depending context

NUMBER / QUANTITY FORMS:

30an -> approximately 30
50an -> approximately 50
100+ -> more than 100
50 lebih -> more than 50
sekitar 60 -> approximately 60
60 listingan -> around 60 listings

Do not interpret every token literally. Interpret the SENTENCE.

Examples:

"rmh sy mw djual gmn"
-> normalized meaning: "rumah saya mau dijual, bagaimana caranya?"

"klo dsewa byr brp"
-> normalized meaning: "kalau disewakan, bayar berapa?"

"sy agent ada 60an listing paket yg cocok yg mn"
-> normalized meaning: "saya agent, punya sekitar 60 listing, paket yang cocok yang mana?"

"udh byr tp blm aktif"
-> normalized meaning: "sudah bayar tetapi belum aktif"

"bs listing dr app ga"
-> normalized meaning: "bisa listing dari aplikasi tidak?"

"ada byr?"
-> normally means "ada bayar? / apakah berbayar? / ada biaya?"
It does NOT normally mean "ada buyer?".
Use buyer/pembeli meaning only when the actual wording or strong context supports buyer.

VERY IMPORTANT:

- The examples above are a guide, not a closed dictionary.
- Indonesians create new abbreviations constantly.
- Use linguistic reasoning, Memory and local conversational context to recover unseen compressed forms.
- Missing vowels, dropped "di-", shortened suffixes, merged words and phonetic spellings are normal WhatsApp behaviour.
- Do not mark a message unreadable merely because the spelling is informal.
- Do not ask clarification when a normal Indonesian reader could reasonably recover the meaning from context.
- If multiple materially different meanings remain genuinely plausible after Memory/context, use ONE clarification.

Laughter such as:

wkwk
haha
hehe
lol

is not automatically unreadable.

If meaning can reasonably be understood from Memory and context,
set understood=true.

Use understood=false only when the meaning genuinely cannot be recovered
after the one allowed clarification attempt.

NORMALIZED MESSAGE OUTPUT:

Return normalizedMessage as a short, natural-language normalization of the
LATEST customer message only.

Examples:
raw: "rmh sy mw djual byr brp"
normalizedMessage: "Rumah saya mau dijual, bayar berapa?"

raw: "sy agent 60an listing yg cocok mn"
normalizedMessage: "Saya agent, punya sekitar 60 listing. Paket yang cocok mana?"

normalizedMessage is an internal semantic aid.
It must preserve the customer's intended meaning and must not invent facts.

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
PRECISE CURRENT-TURN INTENT
==================================================

conversationSituation describes HOW the conversation is behaving.
intent describes WHAT the customer actually wants on the latest turn.

Always resolve the latest turn into ONE primary intent.

Allowed intents:

platform_features
- customer asks what Tetamo / Tetamo Partner can do in general;
- "fitur Tetamo apa?";
- "fitur untuk agent apa?";
- "what features do you have?".

feature_details
- customer asks how one named/currently discussed feature works;
- "Proposal Portfolio itu apa?";
- "Jadwal Viewing gimana?".

feature_example
- customer asks for an example, appearance, illustration or "contohnya"
  of a feature currently being discussed.

feature_availability
- customer asks whether a particular feature exists, is already available,
  is live, or is coming soon.

package_features
- customer asks what a particular membership/package includes;
- "Gold fiturnya apa?";
- "Basic dapat apa?".

package_price
- customer asks package/membership/listing price or fee.

package_recommendation
- customer asks which package fits their needs.

competitor_comparison
- customer neutrally asks whether/how Tetamo compares with another platform;
- mentioning Rumah123/99.co by itself is NOT automatically an objection.

existing_solution_objection
- customer says they already have/use something similar and questions why
  Tetamo adds value;
- "saya sudah ada yang seperti itu";
- "fitur begitu saya sudah punya";
- "sudah pakai portal/CRM yang sama".

bad_past_experience
- customer describes disappointing previous paid portal/advertising experience.

self_marketing_objection
- customer says they can market/post themselves for free or already has their
  own Facebook/Instagram/database and questions Tetamo's added value.

price_objection
- customer expresses that price is expensive or questions value because of cost.

proof_testimonial
- customer asks for testimonials, proof, successful users, sold/rented examples,
  or whether anyone has succeeded using Tetamo.
- This is NOT automatically a traffic question and NOT automatically an objection.

traffic_growth
- customer asks whether Tetamo is new, busy, growing, traffic/user size or adoption.

buyer_availability
- customer asks whether Tetamo has buyers/renters/leads or matching.

buyer_quality
- customer asks whether buyers/leads are serious, qualified, verified or just curious.

guarantee_question
- customer explicitly asks for guaranteed leads, guaranteed sale/rent/closing,
  guaranteed buyer quality, guaranteed result or guaranteed timing.

how_to_list
- customer asks how to create/upload/publish/list a property.

how_to_use
- customer asks operationally how to use a Tetamo feature/tool.

registration
- customer asks how to register/join/start.

payment
- customer asks how/where to pay or has active payment intent.

acknowledgement
- customer is only acknowledging/closing naturally: "baik", "ok", "makasih",
  "sip", thumbs-up equivalent after the substantive exchange.

support
- customer needs ordinary platform/account/listing/payment support.

general_information
- general Tetamo information not better represented above.

unknown
- no reliable intent can be resolved.

INTENT SUBJECT:

intentSubject is the specific thing the customer is referring to when useful.

Examples:

"Gold fiturnya apa?"
-> intent="package_features"
-> intentSubject="Gold"

"Proposal Portfolio itu apa?"
-> intent="feature_details"
-> intentSubject="Proposal & Portfolio"

Mona: "Ada Proposal & Portfolio..."
Customer: "Bisa lihat contohnya?"
-> intent="feature_example"
-> intentSubject="Proposal & Portfolio"

"Inventory Ready sudah ada?"
-> intent="feature_availability"
-> intentSubject="Inventory Ready"

CONTEXTUAL REFERENT RESOLUTION:

Resolve short references against the immediately preceding REAL conversation before
interpreting them independently.

Examples include:

- "contohnya"
- "yang tadi"
- "yang itu"
- "fiturnya"
- "bisa lihat?"
- "gimana tampilannya?"
- "boleh lihat"
- "itu gimana?"

If the preceding topic was a feature, these usually refer to that feature.
Do not turn a feature example request into a package example or package recommendation.

FEATURES VS PACKAGES:

"Fitur Tetamo / Tetamo Partner" means platform_features.
Do NOT silently convert it into package_features or pricing.

"Fitur Gold/Silver/Agent Pro/Basic/Priority/Featured" means package_features.

If Mona just gave a generic list of package prices and the customer then says only
"fiturnya apa?" / "tolong jelaskan fiturnya" without naming a package, use the full
conversation to decide the referent. Do NOT automatically dump all package features.
If the customer is asking what Tetamo/Tetamo Partner actually does, prefer
platform_features. Use package_features only when a specific package or package set
is clearly the subject.

PRICING is a separate intent.
PACKAGE RECOMMENDATION is a separate intent.

PROOF VS TRAFFIC:

A testimonial/proof question should normally be proof_testimonial.
Do not convert it into traffic_growth merely because proof can relate to credibility.

COMPARISON VS OBJECTION:

A neutral comparison is competitor_comparison.
Only use existing_solution_objection when the customer actually expresses duplicate
value / already-has-it resistance.

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

"Dulu saya pernah bayar portal tapi tidak dapat lead, kapok."
-> objection

"Saya bisa post sendiri di Facebook gratis."
-> objection

"Lead-nya serius tidak? Saya tidak mau cuma orang kepo."
-> objection

"Rumah123 sudah ramai banget, listing saya tenggelam."
-> comparison or objection depending the immediate intent.

IMPORTANT OBJECTION ROUTING:
- Normal sales objections are processable conversation, not Admin cases.
- Price/value concern, bad past portal experience, competitor concern, self-marketing,
  lead-quality concern, trust concern, proof concern, guarantee concern, and "kapok"
  language must normally keep understood=true and handoverRecommended=false.
- When Agent/Agency/Owner role is already established, route a normal objection to
  the relevant Sales AI.
- Do not recommend human handover merely because a customer is skeptical, frustrated,
  disappointed by another portal, says "kapok", says "mahal", compares Tetamo with
  another platform, or challenges Tetamo's value.
- Human handover remains appropriate only for an explicit human request or a genuine
  human-action/account/legal/payment-review condition.

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
salesStrategyNeeded=false
salesStrategist="none"
factualKnowledgeNeeded=false
knowledgeRequest=[]

Do not recommend another sales question.

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

Do not invent another sales question.

If Mona already gave a natural closing/acknowledgement and the customer sends another
pure acknowledgement such as "baik", "ok", "makasih", "sip", or equivalent with no
new question or buying signal, prefer intent="acknowledgement" and replyNeeded=false.

replyNeeded may be false if silence is more natural.

==================================================
CLARIFICATION / HANDOVER PROTOCOL
==================================================

Brain gets ONE clarification attempt before handing an unclear conversation
to Admin.

Use clarification.needed=true when either:

- the latest message meaning is materially unclear after reading Memory; or
- the customer role is required for this turn but still unknown; or
- the customer is both Agent and Owner and must choose which journey to handle first.

FIRST unresolved attempt:

- keep understood=true because the conversation is still processable;
- set clarification.needed=true;
- set clarification.kind to "meaning", "role", or "journey_choice";
- set replyNeeded=true;
- do NOT route to Sales AI yet if the unresolved point affects routing;
- do NOT recommend human handover yet;
- recommendedNextStep must tell Writer the ONE clarification goal.

If a previous Mona clarification of the SAME unresolved type was already asked
and the customer's newest reply still does not resolve it:

- set understood=false;
- set replyNeeded=false;
- set handoverRecommended=true;
- explain the unresolved point in handoverReason;
- do not ask another clarification;
- do not route to Sales AI or Knowledge.

A general Tetamo question may still be answered with approved Knowledge before
asking the ONE role clarification if role is not required to answer that
general fact.

Recommend handover only when:

- a clarification was already attempted and the required meaning/role remains
  unresolved; or
- human access/action is genuinely required; or
- the customer explicitly asks for a human/admin.

Do NOT hand over merely because:

- slang is used;
- a message is short;
- spelling is poor;
- customer asks normal Tetamo information;
- customer asks package questions;
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

    customerType: "unknown",

    clarification: {
      needed: false,
      kind: "none",
      alreadyAttempted: false,
      attemptCount: 0,
      goal: null,
    },

    languageStyle: {
      primaryLanguage: "unknown",
      style: "natural WhatsApp conversation",
    },

    normalizedMessage:
      String(latestCustomerMessage || "").trim() ||
      "No readable message.",

    latestMeaning:
      String(latestCustomerMessage || "").trim() ||
      "No readable message.",

    conversationSituation: "unknown",
    intent: "unknown",
    intentSubject: null,

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

    const allowedIntents =
      new Set<MonaBrainIntent>([
        "platform_features",
        "feature_details",
        "feature_example",
        "feature_availability",
        "package_features",
        "package_price",
        "package_recommendation",
        "competitor_comparison",
        "existing_solution_objection",
        "bad_past_experience",
        "self_marketing_objection",
        "price_objection",
        "proof_testimonial",
        "traffic_growth",
        "buyer_availability",
        "buyer_quality",
        "guarantee_question",
        "how_to_list",
        "how_to_use",
        "registration",
        "payment",
        "acknowledgement",
        "support",
        "general_information",
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

    const allowedClarificationKinds =
      new Set<MonaBrainClarificationKind>([
        "role",
        "meaning",
        "journey_choice",
        "none",
      ]);

    const clarification =
      parsed.clarification &&
      typeof parsed.clarification === "object"
        ? parsed.clarification
        : {};

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

      customerType:
        allowedCustomerTypes.has(
          parsed.customerType as MonaCustomerType
        )
          ? (parsed.customerType as MonaCustomerType)
          : fallback.customerType,

      clarification: {
        needed:
          clarification.needed === true,
        kind:
          allowedClarificationKinds.has(
            clarification.kind as
              MonaBrainClarificationKind
          )
            ? (clarification.kind as
                MonaBrainClarificationKind)
            : "none",
        alreadyAttempted:
          clarification.alreadyAttempted === true,
        attemptCount:
          clarification.attemptCount === 1 ? 1 : 0,
        goal:
          cleanNullableString(
            clarification.goal
          ),
      },

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

      normalizedMessage:
        cleanString(parsed.normalizedMessage) ||
        fallback.normalizedMessage,

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

      intent:
        allowedIntents.has(
          parsed.intent as MonaBrainIntent
        )
          ? (parsed.intent as MonaBrainIntent)
          : fallback.intent,

      intentSubject:
        cleanNullableString(parsed.intentSubject),

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

      handoverRecommended:
        parsed.handoverRecommended === true,

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

const INDONESIAN_WHATSAPP_NORMALIZATION_RULES: Array<[RegExp, string]> = [
  [/\bhrgnya\b/gi, "harganya"],
  [/\bhrg\b/gi, "harga"],
  [/\bbyrnya\b/gi, "bayarnya"],
  [/\bbyr\b/gi, "bayar"],
  [/\bbrp\b/gi, "berapa"],
  [/\bgmn\b/gi, "gimana"],
  [/\bdmn\b/gi, "di mana"],
  [/\bdrmn\b/gi, "dari mana"],
  [/\bknp\b/gi, "kenapa"],
  [/\bkrn\b/gi, "karena"],
  [/\bklo\b/gi, "kalau"],
  [/\bkpn\b/gi, "kapan"],
  [/\budh\b/gi, "sudah"],
  [/\bblm\b/gi, "belum"],
  [/\bmsh\b/gi, "masih"],
  [/\bsya\b/gi, "saya"],
  [/\bsy\b/gi, "saya"],
  [/\byg\b/gi, "yang"],
  [/\bdgn\b/gi, "dengan"],
  [/\bbngt\b/gi, "banget"],
  [/\bbgt\b/gi, "banget"],
  [/\b(?:gk|ga|gak|nggak|ngga|enggak)\b/gi, "tidak"],
  [/\bbsa\b/gi, "bisa"],
  [/\bbs\b/gi, "bisa"],
  [/\bpgn\b/gi, "pengen"],
  [/\b(?:mw|mo)\b/gi, "mau"],
  [/\bjdi\b/gi, "jadi"],
  [/\bjd\b/gi, "jadi"],
  [/\bskrg\b/gi, "sekarang"],
  [/\bbsk\b/gi, "besok"],
  [/\bkmrn\b/gi, "kemarin"],
  [/\bdjualin\b/gi, "dijualkan"],
  [/\bdjual\b/gi, "dijual"],
  [/\bd\s+jual\b/gi, "dijual"],
  [/\bdi\s+jual\b/gi, "dijual"],
  [/\bdisewain\b/gi, "disewakan"],
  [/\bdsewa\b/gi, "disewa"],
  [/\bd\s+sewa\b/gi, "disewa"],
  [/\bdi\s+sewa\b/gi, "disewa"],
  [/\brmh\b/gi, "rumah"],
  [/\baprt\b/gi, "apartemen"],
  [/\bapt\b/gi, "apartemen"],
  [/\btnh\b/gi, "tanah"],
  [/\bsosmed\b/gi, "social media"],
  [/\bnowa\b/gi, "nomor WhatsApp"],
  [/\bno\s+wa\b/gi, "nomor WhatsApp"],
];

function buildIndonesianWhatsAppNormalizationHint(
  message: string
): string {
  let normalized = String(message || "").trim();

  if (!normalized) {
    return "No readable message.";
  }

  for (const [pattern, replacement] of
    INDONESIAN_WHATSAPP_NORMALIZATION_RULES) {
    normalized = normalized.replace(
      pattern,
      replacement
    );
  }

  normalized = normalized
    .replace(/\s+/g, " ")
    .trim();

  return normalized;
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
  return /^(?:ini\s+)?(?:bayar|berbayar|ada\s+fee|ada\s+biaya|bayar\s+ya|bayar\s+yaa|bayar\s+kah|kena\s+biaya|harus\s+bayar|is\s+it\s+paid|do\s+i\s+have\s+to\s+pay)[?.! ]*$/i.test(
    message
  );
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


function looksLikeNormalSalesObjection(
  message: string
) {
  const text = String(message || "")
    .toLowerCase()
    .trim();

  if (!text) return false;

  return (
    /\b(?:mahal|kemahalan|pricey|expensive|keberatan\s+harga)\b/i.test(text) ||
    /\b(?:kapok|trauma|zonk|buang\s+(?:duit|uang)|rugi)\b/i.test(text) ||
    /(?:pernah|dulu|sudah|udah).{0,40}(?:bayar|pakai|coba|join|pasang).{0,50}(?:portal|platform|iklan).{0,60}(?:tidak|nggak|gak|ga|ngga|belum).{0,35}(?:lead|inquiry|closing|hasil|buyer|pembeli|penyewa)/i.test(text) ||
    /(?:tidak|nggak|gak|ga|ngga).{0,30}(?:dapat|dapet|ada).{0,20}(?:lead|inquiry|closing|hasil)/i.test(text) ||
    /(?:post|posting|pasang|iklan).{0,50}(?:sendiri).{0,50}(?:facebook|fb|instagram|ig|sosmed|social\s+media|marketplace)/i.test(text) ||
    /(?:facebook|fb|instagram|ig|sosmed|social\s+media|marketplace).{0,50}(?:gratis|free|sendiri|post|posting|pasang|iklan)/i.test(text) ||
    /(?:gratis|free).{0,50}(?:facebook|fb|instagram|ig|sosmed|social\s+media|marketplace|post|posting|iklan)/i.test(text) ||
    /(?:sudah|udah|telah|pernah|pakai|gunakan|punya|ada).{0,45}(?:rumah123|99\.?co|propertyguru|lamudi|facebook\s+marketplace|portal\s+lain|platform\s+lain)/i.test(text) ||
    /(?:rumah123|99\.?co|propertyguru|lamudi|facebook\s+marketplace|portal\s+lain|platform\s+lain).{0,45}(?:sudah|udah|pakai|punya|ngapain|buat\s+apa|tidak\s+perlu|nggak\s+perlu|gak\s+perlu)/i.test(text) ||
    /(?:lead|buyer|pembeli|penyewa).{0,40}(?:serius|qualified|bagus|kepo|asal|beneran|benaran)/i.test(text) ||
    /(?:serius|qualified|kepo|asal).{0,40}(?:lead|buyer|pembeli|penyewa)/i.test(text) ||
    /(?:jamin|garansi|guarantee|pasti).{0,30}(?:lead|closing|laku|terjual|tersewa|buyer|pembeli|penyewa)/i.test(text) ||
    /(?:tidak|nggak|gak|ga).{0,20}(?:percaya|yakin|trust)|(?:susah|sulit).{0,20}(?:percaya|yakin)/i.test(text)
  );
}

function recoverEstablishedCustomerType(
  memory: MonaConversationMemory
): MonaCustomerType | null {
  /*
   * Recover only HIGH-CONFIDENCE explicit role statements from Customer history.
   * This is defense-in-depth for cases where the model accidentally forgets a role
   * that the customer already stated clearly.
   */
  for (
    let index = memory.messages.length - 1;
    index >= 0;
    index -= 1
  ) {
    const item = memory.messages[index];

    if (item.speaker !== "Customer") {
      continue;
    }

    const text = String(item.message || "")
      .toLowerCase()
      .trim();

    if (!text) continue;

    if (
      /\b(?:kami|saya|aku|sy|gue|gw)\s+(?:dari\s+)?(?:developer|pengembang)\b/i.test(text) ||
      /\b(?:kami|perusahaan|company)\s+(?:adalah\s+)?developer\b/i.test(text)
    ) {
      return "developer";
    }

    if (
      /\b(?:kami|saya|aku|sy)\s+(?:dari\s+)?(?:agency|agensi|property\s+agency|real\s*estate\s+agency|property\s+marketing\s+company)\b/i.test(text) ||
      /\bagency\s+(?:kami|saya)\b/i.test(text)
    ) {
      return "agency";
    }

    if (
      /\b(?:saya|aku|sy|gue|gw)\s+(?:adalah\s+|sebagai\s+)?(?:agen|agent|broker|property\s+agent|real\s*estate\s+agent|marketing\s+property)\b/i.test(text) ||
      /\b(?:agen|agent)\s+(?:independent|freelance)\b/i.test(text)
    ) {
      return "agent";
    }

    if (
      /\b(?:saya|aku|sy|gue|gw)\s+(?:adalah\s+|sebagai\s+)?(?:owner|pemilik)\b/i.test(text) ||
      /\b(?:properti|property|rumah|villa|vila|apartemen|tanah)\s+(?:ini\s+)?(?:punya\s+saya|milik\s+saya)\b/i.test(text)
    ) {
      return "owner";
    }

    if (
      /\b(?:saya|aku|sy|gue|gw)\s+(?:lagi\s+|sedang\s+|mau\s+|ingin\s+)?(?:cari|mencari)\s+(?:rumah|villa|vila|apartemen|property|properti|tanah)\b/i.test(text) ||
      /\b(?:saya|aku|sy|gue|gw)\s+mau\s+(?:beli|sewa)\s+(?:rumah|villa|vila|apartemen|property|properti|tanah)\b/i.test(text)
    ) {
      return "buyer_renter";
    }
  }

  return null;
}

type PriorClarificationState = {
  attempted: boolean;
  kind: MonaBrainClarificationKind;
  question: string | null;
};

function classifyMonaClarification(
  message: string
): MonaBrainClarificationKind {
  const text = String(message || "").trim();

  if (!text) {
    return "none";
  }

  const hasAgent =
    /\b(?:agent|agen)\b/i.test(text);

  const hasOwner =
    /\b(?:owner|pemilik)\b/i.test(text);

  if (
    hasAgent &&
    hasOwner &&
    /(?:atau|or|sebagai|yang mana|pilih|which)/i.test(
      text
    )
  ) {
    if (
      /(?:dulu|first|mana yang mau|which journey|handle first)/i.test(
        text
      )
    ) {
      return "journey_choice";
    }

    return "role";
  }

  if (
    /\b(?:maksud|maksudnya|yang dimaksud|what do you mean|which one do you mean|could you clarify|can you clarify)\b/i.test(
      text
    ) ||
    /(?:boleh|bisa|could|can).{0,20}(?:jelas|jelasin|jelaskan|perjelas|clarify)/i.test(
      text
    ) ||
    /(?:buyer|pembeli).{0,20}(?:atau|or).{0,20}(?:bayar|payment|pembayaran)/i.test(
      text
    ) ||
    /(?:bayar|payment|pembayaran).{0,20}(?:atau|or).{0,20}(?:buyer|pembeli)/i.test(
      text
    )
  ) {
    return "meaning";
  }

  return "none";
}

function detectPriorClarificationAttempt(
  memory: MonaConversationMemory
): PriorClarificationState {
  for (
    let index = memory.messages.length - 1;
    index >= 0;
    index -= 1
  ) {
    const item = memory.messages[index];

    if (item.speaker === "Customer") {
      continue;
    }

    if (item.speaker === "Mona") {
      const kind =
        classifyMonaClarification(
          item.message
        );

      return {
        attempted: kind !== "none",
        kind,
        question:
          kind !== "none"
            ? item.message
            : null,
      };
    }

    if (item.speaker === "Admin") {
      return {
        attempted: false,
        kind: "none",
        question: null,
      };
    }
  }

  return {
    attempted: false,
    kind: "none",
    question: null,
  };
}

function isExplicitHumanRequest(
  message: string
) {
  return (
    /\b(?:admin|cs|customer service|human|orang|staff)\b/i.test(
      message
    ) &&
    /\b(?:mau|ingin|pengen|boleh|bisa|hubungkan|sambungkan|bicara|ngobrol|chat|talk|speak)\b/i.test(
      message
    )
  );
}

function looksLikeHumanActionRequired(
  message: string
) {
  return (
    /\b(?:refund|pengembalian dana|legal|lawyer|pengacara|somasi)\b/i.test(
      message
    ) ||
    /(?:sudah|udah|telah).{0,25}(?:bayar|transfer).{0,35}(?:belum|tidak|nggak|gak|ga).{0,20}(?:aktif|masuk|terverifikasi|verified)/i.test(
      message
    ) ||
    /(?:double|dua kali|2x).{0,20}(?:charge|charged|bayar|debit|terpotong)/i.test(
      message
    ) ||
    /(?:akun|account).{0,20}(?:locked|terkunci|diblokir|blocked)/i.test(
      message
    )
  );
}

function modelHandoverLooksHumanOnly(
  reason: string | null
) {
  if (!reason) {
    return false;
  }

  return /(?:human access|staff access|admin access|account-specific|refund|legal|contract|custom negotiated|manual verification|manual review|payment check|account check)/i.test(
    reason
  );
}


function canonicalPackageSubject(message: string): string | null {
  const text = String(message || "").toLowerCase();

  if (/\bagent\s*pro\b|\bagent-pro\b/i.test(text)) return "Agent Pro";
  if (/\bsilver\b/i.test(text)) return "Silver";
  if (/\bgold\b/i.test(text)) return "Gold";
  if (/\bbasic(?:\s+listing)?\b/i.test(text)) return "Basic";
  if (/\bpriority(?:\s+listing)?\b/i.test(text)) return "Priority";
  if (/\bfeatured(?:\s+listing)?\b/i.test(text)) return "Featured";

  return null;
}

function repairPreciseBrainIntent(
  decision: MonaBrainDecision,
  latestCustomerMessage: string
): MonaBrainDecision {
  const latest = String(latestCustomerMessage || "").trim();
  const lower = latest.toLowerCase();

  if (!latest) return decision;

  let intent = decision.intent;
  let intentSubject = decision.intentSubject;
  let latestMeaning = decision.latestMeaning;
  let directQuestion = decision.directQuestion;

  const applyPreciseMeaning = (
    nextIntent: MonaBrainIntent,
    nextSubject: string | null,
    meaning: string,
    question: string | null
  ) => {
    intent = nextIntent;
    intentSubject = nextSubject;
    latestMeaning = meaning;
    directQuestion = question;
  };

  const packageSubject = canonicalPackageSubject(latest);
  const asksFeatures = /\bfitur(?:nya)?\b|\bfeatures?\b/i.test(latest);

  if (packageSubject && asksFeatures) {
    applyPreciseMeaning(
      "package_features",
      packageSubject,
      `Customer is asking for the features included in the ${packageSubject} package.`,
      `What features are included in the ${packageSubject} package?`
    );
  }

  const availabilityLanguage =
    /\b(?:ada|sudah ada|udah ada|tersedia|available|live|coming soon|bisa|bsa|bs|support|buat|create|generate|punya)\b/i.test(
      latest
    );

  if (/\bnotar(?:y|is|ise|ize|isation|ization)?\b/i.test(lower)) {
    applyPreciseMeaning(
      "feature_availability",
      "Notary / Notarisation",
      "Customer is asking whether Tetamo provides a notary or notarisation solution.",
      "Does Tetamo provide a notary or notarisation solution?"
    );
  } else if (/\binventory\s+ready\b/i.test(lower)) {
    applyPreciseMeaning(
      "feature_availability",
      "Inventory Ready",
      "Customer is asking whether the Inventory Ready feature is currently available in Tetamo.",
      "Is Inventory Ready currently available in Tetamo?"
    );
  } else if (/\b(?:loi|letter\s+of\s+intent)\b/i.test(lower)) {
    applyPreciseMeaning(
      availabilityLanguage ? "feature_availability" : "feature_details",
      "LOI",
      availabilityLanguage
        ? "Customer is asking whether Tetamo provides an editable LOI (Letter of Intent) feature."
        : "Customer is asking how Tetamo's LOI (Letter of Intent) feature works.",
      availabilityLanguage
        ? "Is an editable LOI feature available in Tetamo?"
        : "How does Tetamo's LOI feature work?"
    );
  } else if (/\brental\s+agreement\b/i.test(lower)) {
    applyPreciseMeaning(
      availabilityLanguage ? "feature_availability" : "feature_details",
      "Rental Agreement",
      availabilityLanguage
        ? "Customer is asking whether Tetamo provides an editable Rental Agreement feature."
        : "Customer is asking how Tetamo's Rental Agreement feature works.",
      availabilityLanguage
        ? "Is an editable Rental Agreement feature available in Tetamo?"
        : "How does Tetamo's Rental Agreement feature work?"
    );
  } else if (/\bsale\s+agreement\b/i.test(lower)) {
    applyPreciseMeaning(
      availabilityLanguage ? "feature_availability" : "feature_details",
      "Sale Agreement",
      availabilityLanguage
        ? "Customer is asking whether Tetamo provides an editable Sale Agreement feature."
        : "Customer is asking how Tetamo's Sale Agreement feature works.",
      availabilityLanguage
        ? "Is an editable Sale Agreement feature available in Tetamo?"
        : "How does Tetamo's Sale Agreement feature work?"
    );
  } else if (/\bproposal\b|\bportfolio\b/i.test(lower)) {
    if (/\b(?:contoh|example|lihat|tampilan|preview)\b/i.test(lower)) {
      applyPreciseMeaning(
        "feature_example",
        "Proposal & Portfolio",
        "Customer is asking for an example or preview of the Proposal & Portfolio feature.",
        "What does the Proposal & Portfolio feature look like in practice?"
      );
    } else if (availabilityLanguage) {
      applyPreciseMeaning(
        "feature_availability",
        "Proposal & Portfolio",
        "Customer is asking whether Tetamo provides the Proposal & Portfolio feature for client presentations.",
        "Is Proposal & Portfolio available in Tetamo?"
      );
    } else {
      applyPreciseMeaning(
        "feature_details",
        "Proposal & Portfolio",
        "Customer is asking how the Proposal & Portfolio feature works.",
        "How does the Proposal & Portfolio feature work?"
      );
    }
  }

  if (
    asksFeatures &&
    !packageSubject &&
    intent === "package_features" &&
    !intentSubject
  ) {
    applyPreciseMeaning(
      "platform_features",
      null,
      "Customer is asking what Tetamo/Tetamo Partner can do for them at platform level, not for package-by-package pricing or package differences.",
      "What features and capabilities does Tetamo/Tetamo Partner provide?"
    );
  }

  if (
    asksFeatures &&
    !packageSubject &&
    !intentSubject &&
    /\b(?:tetamo|tetamo\s+partner|platform|aplikasi|app)\b/i.test(lower)
  ) {
    applyPreciseMeaning(
      "platform_features",
      null,
      "Customer is asking what Tetamo/Tetamo Partner can do for them at platform level.",
      "What features and capabilities does Tetamo/Tetamo Partner provide?"
    );
  }

  if (/\b(?:testimoni|testimonial|proof|bukti)\b/i.test(lower)) {
    applyPreciseMeaning(
      "proof_testimonial",
      null,
      "Customer is asking for approved Tetamo testimonials, proof, or success evidence.",
      "What approved Tetamo testimonials or success evidence are available?"
    );
  }

  if (
    /\b(?:saya|aku|kami|sy)\b.{0,30}\b(?:sudah|udah|telah)\b.{0,30}\b(?:ada|punya|pakai|menggunakan)\b.{0,35}\b(?:seperti itu|yang sama|mirip|similar|portal|platform|crm|tool|fitur)\b/i.test(
      lower
    ) ||
    /\b(?:sudah|udah)\s+(?:punya|ada|pakai)\s+(?:yang\s+)?(?:seperti\s+itu|sama|mirip)\b/i.test(
      lower
    )
  ) {
    applyPreciseMeaning(
      "existing_solution_objection",
      null,
      "Customer says they already have or use a similar solution and wants to understand whether Tetamo adds distinct value.",
      "What additional value would Tetamo provide if the customer already uses a similar solution?"
    );
  }

  if (
    intent === decision.intent &&
    intentSubject === decision.intentSubject &&
    latestMeaning === decision.latestMeaning &&
    directQuestion === decision.directQuestion
  ) {
    return decision;
  }

  return {
    ...decision,
    intent,
    intentSubject,
    latestMeaning,
    directQuestion,
  };
}

function applyKnownRoleIntentRouting(
  decision: MonaBrainDecision
): MonaBrainDecision {
  const role = decision.customerType;
  const commercialRole =
    role === "agent" || role === "agency" || role === "owner";

  if (!commercialRole || !decision.replyNeeded) {
    return decision;
  }

  const salesOwnedIntents = new Set<MonaBrainIntent>([
    "platform_features",
    "feature_details",
    "feature_example",
    "feature_availability",
    "package_features",
    "package_price",
    "package_recommendation",
    "competitor_comparison",
    "existing_solution_objection",
    "bad_past_experience",
    "self_marketing_objection",
    "price_objection",
    "proof_testimonial",
    "traffic_growth",
    "buyer_availability",
    "buyer_quality",
    "guarantee_question",
    "how_to_list",
    "how_to_use",
    "registration",
    "payment",
  ]);

  const knowledgeBackedIntents = new Set<MonaBrainIntent>([
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
    "buyer_quality",
    "guarantee_question",
    "how_to_list",
    "how_to_use",
    "registration",
  ]);

  let result = { ...decision };

  if (salesOwnedIntents.has(result.intent)) {
    result = {
      ...result,
      salesStrategyNeeded: true,
      salesStrategist: role === "owner" ? "owner" : "agent",
      recommendedNextStep:
        `Route Brain intent ${result.intent}${result.intentSubject ? ` (${result.intentSubject})` : ""} to the ${role === "owner" ? "Owner" : "Agent"} Sales AI. Brain intent is authoritative for this turn.`,
    };
  }

  if (knowledgeBackedIntents.has(result.intent)) {
    result = {
      ...result,
      factualKnowledgeNeeded: true,
      knowledgeRequest:
        result.knowledgeRequest.length > 0
          ? result.knowledgeRequest
          : [
              `approved Tetamo facts for current intent: ${result.intent}${result.intentSubject ? ` (${result.intentSubject})` : ""}`,
            ],
    };
  } else if (
    result.intent === "package_features" ||
    result.intent === "package_price" ||
    result.intent === "package_recommendation" ||
    result.intent === "payment"
  ) {
    result = {
      ...result,
      factualKnowledgeNeeded: false,
      knowledgeRequest: [],
    };
  }

  return result;
}

function enforceBrainRouting(
  decision: MonaBrainDecision,
  latestCustomerMessage: string,
  priorClarification: PriorClarificationState,
  memory: MonaConversationMemory
): MonaBrainDecision {
  const latestMessage = String(
    latestCustomerMessage || ""
  ).trim();

  const originalHandoverReason =
    decision.handoverReason;

  const modelRequestedHumanOnly =
    decision.handoverRecommended &&
    modelHandoverLooksHumanOnly(
      originalHandoverReason
    );

  let result: MonaBrainDecision = {
    ...decision,
    handoverRecommended: false,
    handoverReason: null,
    clarification: {
      ...decision.clarification,
      alreadyAttempted:
        priorClarification.attempted,
      attemptCount:
        priorClarification.attempted
          ? 1
          : 0,
    },
  };

  const establishedCustomerType =
    recoverEstablishedCustomerType(memory);

  /*
   * Memory wins over an accidental model regression to UNKNOWN when the customer
   * explicitly established their role earlier (for example: "saya agen").
   */
  if (
    result.customerType === "unknown" &&
    establishedCustomerType
  ) {
    result = {
      ...result,
      customerType: establishedCustomerType,
    };
  }

  result = repairPreciseBrainIntent(
    result,
    latestMessage
  );

  const explicitObjectionIntents =
    new Set<MonaBrainIntent>([
      "existing_solution_objection",
      "bad_past_experience",
      "self_marketing_objection",
      "price_objection",
      "buyer_quality",
      "guarantee_question",
    ]);

  const explicitNonObjectionIntents =
    new Set<MonaBrainIntent>([
      "platform_features",
      "feature_details",
      "feature_example",
      "feature_availability",
      "package_features",
      "package_price",
      "package_recommendation",
      "competitor_comparison",
      "proof_testimonial",
      "traffic_growth",
      "buyer_availability",
      "how_to_list",
      "how_to_use",
      "registration",
      "payment",
      "acknowledgement",
      "support",
      "general_information",
    ]);

  const normalSalesObjection =
    explicitObjectionIntents.has(result.intent) ||
    (
      !explicitNonObjectionIntents.has(result.intent) &&
      looksLikeNormalSalesObjection(
        latestMessage
      )
    );

  /*
   * Deterministic objection protection.
   *
   * A normal, understandable commercial objection must not become Needs Admin just
   * because the model used an overly cautious handover reason. Explicit human
   * requests and genuine human-action cases are still handled below.
   */
  if (
    normalSalesObjection &&
    (
      result.customerType === "agent" ||
      result.customerType === "agency" ||
      result.customerType === "owner"
    )
  ) {
    result = {
      ...result,
      understood: true,
      replyNeeded: true,
      conversationSituation: "objection",
      clarification: {
        needed: false,
        kind: "none",
        alreadyAttempted:
          priorClarification.attempted,
        attemptCount:
          priorClarification.attempted
            ? 1
            : 0,
        goal: null,
      },
      handoverRecommended: false,
      handoverReason: null,
      salesStrategyNeeded: true,
      salesStrategist:
        result.customerType === "owner"
          ? "owner"
          : "agent",
      recommendedNextStep:
        "Route this normal sales objection to the relevant Sales AI. Handle the concern directly and do not pause AI merely because the customer is skeptical, disappointed, comparing platforms, or describing a bad past advertising experience.",
    };
  }

  /*
   * HUMAN-ONLY CONDITIONS HAVE PRIORITY.
   *
   * Brain may understand the conversation perfectly and still determine that
   * a real person must act because account access, payment verification,
   * legal/refund handling or an explicitly requested human is required.
   */
  if (
    isExplicitHumanRequest(latestMessage) ||
    looksLikeHumanActionRequired(
      latestMessage
    ) ||
    (
      modelRequestedHumanOnly &&
      !normalSalesObjection
    )
  ) {
    return {
      ...result,
      understood: true,
      clarification: {
        needed: false,
        kind: "none",
        alreadyAttempted:
          priorClarification.attempted,
        attemptCount:
          priorClarification.attempted
            ? 1
            : 0,
        goal: null,
      },
      replyNeeded: false,
      handoverRecommended: true,
      handoverReason:
        isExplicitHumanRequest(
          latestMessage
        )
          ? "The customer explicitly requested a human/admin."
          : looksLikeHumanActionRequired(
                latestMessage
              )
            ? "The customer needs a human action or account-specific review."
            : originalHandoverReason ||
              "A human action is required.",
      salesStrategyNeeded: false,
      salesStrategist: "none",
      factualKnowledgeNeeded: false,
      knowledgeRequest: [],
      recommendedNextStep:
        "Pause AI and hand this conversation to Admin. Do not send another Mona reply until Admin resumes AI.",
    };
  }

  /*
   * HARD REJECTION IS CLEAR ENOUGH TO PROCESS.
   */
  if (isHardRejection(latestMessage)) {
    return {
      ...result,
      understood: true,
      conversationSituation:
        "rejection",
      clarification: {
        needed: false,
        kind: "none",
        alreadyAttempted:
          priorClarification.attempted,
        attemptCount:
          priorClarification.attempted
            ? 1
            : 0,
        goal: null,
      },
      salesStrategyNeeded: false,
      salesStrategist: "none",
      factualKnowledgeNeeded: false,
      knowledgeRequest: [],
      directQuestion: null,
      handoverRecommended: false,
      handoverReason: null,
      recommendedNextStep:
        "Respect the customer's rejection. Do not continue selling or ask another sales question.",
    };
  }

  /*
   * MEANING CLARIFICATION.
   *
   * The first unresolved meaning does NOT become an immediate handover.
   * Brain gets exactly one clarification attempt.
   */
  const meaningStillUnresolved =
    !result.understood ||
    (
      result.clarification.needed &&
      result.clarification.kind ===
        "meaning"
    );

  if (meaningStillUnresolved) {
    const meaningWasAlreadyClarified =
      priorClarification.attempted &&
      priorClarification.kind ===
        "meaning";

    if (meaningWasAlreadyClarified) {
      return {
        ...result,
        understood: false,
        clarification: {
          needed: false,
          kind: "none",
          alreadyAttempted: true,
          attemptCount: 1,
          goal: null,
        },
        replyNeeded: false,
        handoverRecommended: true,
        handoverReason:
          "Mona already asked one meaning clarification, but the customer's latest reply is still not reliably understandable.",
        salesStrategyNeeded: false,
        salesStrategist: "none",
        factualKnowledgeNeeded: false,
        knowledgeRequest: [],
        recommendedNextStep:
          "Pause AI and hand the conversation to Admin for review. Do not ask another clarification.",
      };
    }

    return {
      ...result,
      understood: true,
      clarification: {
        needed: true,
        kind: "meaning",
        alreadyAttempted: false,
        attemptCount: 0,
        goal:
          result.clarification.goal ||
          "Clarify the exact meaning of the customer's latest message with one short, natural question.",
      },
      replyNeeded: true,
      handoverRecommended: false,
      handoverReason: null,
      salesStrategyNeeded: false,
      salesStrategist: "none",
      factualKnowledgeNeeded: false,
      knowledgeRequest: [],
      recommendedNextStep:
        "Ask ONE short clarification about the unresolved meaning. Do not guess, do not route to Sales yet, and do not hand over on the first ambiguity.",
    };
  }

  /*
   * DEVELOPER DIRECT ROUTE
   */
  if (result.customerType === "developer") {
    return {
      ...result,
      understood: true,
      clarification: {
        needed: false,
        kind: "none",
        alreadyAttempted:
          priorClarification.attempted,
        attemptCount:
          priorClarification.attempted
            ? 1
            : 0,
        goal: null,
      },
      salesStrategyNeeded: false,
      salesStrategist: "none",
      factualKnowledgeNeeded: true,
      knowledgeRequest: [
        "approved Tetamo Developer destination and developer-license link",
      ],
      handoverRecommended: false,
      handoverReason: null,
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
    return {
      ...result,
      understood: true,
      clarification: {
        needed: false,
        kind: "none",
        alreadyAttempted:
          priorClarification.attempted,
        attemptCount:
          priorClarification.attempted
            ? 1
            : 0,
        goal: null,
      },
      salesStrategyNeeded: false,
      salesStrategist: "none",
      factualKnowledgeNeeded: true,
      knowledgeRequest: [
        "approved Tetamo Buyer/Renter destination and buyer requirements link",
      ],
      handoverRecommended: false,
      handoverReason: null,
      recommendedNextStep:
        "Direct the customer to Tetamo's Buyer/Renter journey at https://www.tetamo.com/pembeli. Do not route into Agent or Owner Sales AI.",
    };
  }

  /*
   * STRICT ROLE GATE + ONE ROLE CLARIFICATION.
   *
   * If role is still unknown, Sales AI cannot run.
   * A general Tetamo factual question may still use Knowledge before the role
   * clarification is appended by Writer.
   */
  if (result.customerType === "unknown") {
    const looksLikeBothRoles =
      (
        /\b(?:agent|agen)\b/i.test(
          latestMessage
        ) &&
        /\b(?:owner|pemilik)\b/i.test(
          latestMessage
        )
      );

    const clarificationKind:
      MonaBrainClarificationKind =
        result.clarification.kind ===
        "journey_choice" ||
        looksLikeBothRoles
          ? "journey_choice"
          : "role";

    const sameClarificationAlreadyAsked =
      priorClarification.attempted &&
      priorClarification.kind ===
        clarificationKind;

    /*
     * Do not force a role question on a natural acknowledgement / ending.
     */
    if (
      result.replyNeeded === false ||
      (
        result.conversationSituation ===
          "casual" &&
        !result.directQuestion &&
        !result.factualKnowledgeNeeded
      )
    ) {
      return {
        ...result,
        salesStrategyNeeded: false,
        salesStrategist: "none",
        clarification: {
          needed: false,
          kind: "none",
          alreadyAttempted:
            priorClarification.attempted,
          attemptCount:
            priorClarification.attempted
              ? 1
              : 0,
          goal: null,
        },
        handoverRecommended: false,
        handoverReason: null,
      };
    }

    if (sameClarificationAlreadyAsked) {
      return {
        ...result,
        understood: false,
        clarification: {
          needed: false,
          kind: "none",
          alreadyAttempted: true,
          attemptCount: 1,
          goal: null,
        },
        replyNeeded: false,
        handoverRecommended: true,
        handoverReason:
          clarificationKind ===
          "journey_choice"
            ? "Mona already asked which Agent/Owner journey the customer wants to handle first, but the latest reply still does not resolve it."
            : "Mona already asked one role clarification, but the customer's latest reply still does not establish whether they are an Agent/Agency, Owner, Developer or Buyer/Renter.",
        salesStrategyNeeded: false,
        salesStrategist: "none",
        factualKnowledgeNeeded: false,
        knowledgeRequest: [],
        recommendedNextStep:
          "Pause AI and hand the conversation to Admin for review. Do not ask the same role clarification again.",
      };
    }

    const canAnswerGeneralFactFirst =
      result.factualKnowledgeNeeded &&
      Boolean(result.directQuestion);

    return {
      ...result,
      understood: true,
      clarification: {
        needed: true,
        kind: clarificationKind,
        alreadyAttempted: false,
        attemptCount: 0,
        goal:
          clarificationKind ===
          "journey_choice"
            ? "Ask which journey the customer wants to handle first: Agent or Owner."
            : "Establish whether the customer is an Agent/Agency, Property Owner, Developer, or Buyer/Renter.",
      },
      salesStrategyNeeded: false,
      salesStrategist: "none",
      factualKnowledgeNeeded:
        canAnswerGeneralFactFirst
          ? result.factualKnowledgeNeeded
          : false,
      knowledgeRequest:
        canAnswerGeneralFactFirst
          ? result.knowledgeRequest
          : [],
      handoverRecommended: false,
      handoverReason: null,
      recommendedNextStep:
        canAnswerGeneralFactFirst
          ? "Answer the customer's approved general Tetamo question first, then ask ONE short role clarification. Do not guess the commercial journey."
          : clarificationKind ===
              "journey_choice"
            ? "Ask ONE short question to determine whether the customer wants to handle the Agent or Owner journey first. Do not route to Sales until they choose."
            : "Ask ONE short role clarification. Do not route to Agent or Owner Sales AI until the role is established.",
    };
  }

  /*
   * A KNOWN ROLE MEANS ANY PREVIOUS ROLE CLARIFICATION HAS BEEN RESOLVED.
   */
  result = {
    ...result,
    understood: true,
    clarification: {
      needed: false,
      kind: "none",
      alreadyAttempted:
        priorClarification.attempted,
      attemptCount:
        priorClarification.attempted
          ? 1
          : 0,
      goal: null,
    },
    handoverRecommended: false,
    handoverReason: null,
  };

  result = applyKnownRoleIntentRouting(result);

  /*
   * STRATEGIST CONSISTENCY.
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
   * NORMAL COMMERCIAL SITUATIONS BELONG TO THE RELEVANT SALES AI.
   */
  const commercialSituation =
    result.conversationSituation ===
      "interest" ||
    result.conversationSituation ===
      "comparison" ||
    result.conversationSituation ===
      "objection" ||
    result.conversationSituation ===
      "hesitation" ||
    result.conversationSituation ===
      "closing" ||
    result.conversationSituation ===
      "payment";

  if (
    result.replyNeeded &&
    commercialSituation &&
    (
      result.customerType ===
        "agent" ||
      result.customerType ===
        "agency"
    )
  ) {
    result = {
      ...result,
      salesStrategyNeeded: true,
      salesStrategist: "agent",
    };
  }

  if (
    result.replyNeeded &&
    commercialSituation &&
    result.customerType === "owner"
  ) {
    result = {
      ...result,
      salesStrategyNeeded: true,
      salesStrategist: "owner",
    };
  }

  /*
   * FEE QUESTION IS NOT PAYMENT INTENT.
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
        salesStrategyNeeded: true,
        salesStrategist: "agent",
        factualKnowledgeNeeded: false,
        knowledgeRequest: [],
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
        salesStrategyNeeded: true,
        salesStrategist: "owner",
        factualKnowledgeNeeded: false,
        knowledgeRequest: [],
        recommendedNextStep:
          "Route the fee/value question to Owner Sales AI. This is not active payment intent.",
      };
    }
  }

  /*
   * HESITATION IS STILL A SALES SITUATION, BUT SALES MUST NOT PRESSURE.
   */
  if (
    !isHardRejection(latestMessage) &&
    isTimingHesitation(latestMessage)
  ) {
    result = {
      ...result,
      conversationSituation:
        "hesitation",
      factualKnowledgeNeeded: false,
      knowledgeRequest: [],
      directQuestion: null,
      recommendedNextStep:
        "Let the relevant Sales AI handle the hesitation with low pressure: acknowledge the timing/dependency, do not restart discovery, and do not force another question.",
    };

    if (
      result.customerType === "agent" ||
      result.customerType === "agency"
    ) {
      result = {
        ...result,
        salesStrategyNeeded: true,
        salesStrategist: "agent",
      };
    } else if (
      result.customerType === "owner"
    ) {
      result = {
        ...result,
        salesStrategyNeeded: true,
        salesStrategist: "owner",
      };
    }
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

  const priorClarification =
    detectPriorClarificationAttempt(
      params.memory
    );

  if (!process.env.OPENAI_API_KEY) {
    return enforceBrainRouting(
      fallback,
      params.latestCustomerMessage,
      priorClarification,
      params.memory
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

CURRENT CRM SALES STAGE (OBSERVATIONAL CONTEXT ONLY):
${params.salesStage || "none"}

IMPORTANT ABOUT STAGE:
- Stage is NOT authority for customer identity or meaning.
- Full conversation Memory outranks Stage if they conflict.
- Stage must never force routing by itself.

PRIOR MONA CLARIFICATION STATE:
${JSON.stringify(priorClarification, null, 2)}

IMPORTANT ABOUT CLARIFICATION:
- If priorClarification.attempted=false and meaning/role is unresolved, ask ONE clarification.
- If priorClarification.attempted=true for the same unresolved issue and the newest reply still does not resolve it, recommend Admin handover and no further AI reply.

ONE-TIME SALES SEMANTIC REVIEW FEEDBACK:
${
  params.semanticReview
    ? JSON.stringify(
        params.semanticReview,
        null,
        2
      )
    : "none"
}

IMPORTANT ABOUT SALES SEMANTIC REVIEW:
- This is private internal feedback from Agent Sales or Owner Sales, NOT a customer message.
- It is supplied only when Sales detected a genuine contradiction with Brain's prior resolved meaning.
- Re-read the RAW customer message, normalized wording, and full Memory yourself.
- Do NOT blindly accept Sales' suggested meaning. Brain remains the semantic authority.
- If the earlier Brain meaning was wrong, correct normalizedMessage/latestMeaning and routing.
- If the meaning remains genuinely ambiguous, use the normal ONE-clarification rule.
- If that same clarification was already attempted and ambiguity still remains, recommend Admin handover.
- Never invent a second clarification or an infinite Brain/Sales loop.

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

DETERMINISTIC INDONESIAN WHATSAPP NORMALIZATION HINT:
${buildIndonesianWhatsAppNormalizationHint(params.latestCustomerMessage)}

IMPORTANT ABOUT THE NORMALIZATION HINT:
- This hint contains only conservative, high-confidence text normalization.
- It is supporting context, not authority.
- Raw message + Memory + linguistic reasoning remain authoritative.
- Recover additional slang/compressed forms naturally even when they are not present in the deterministic hint.

LATEST CUSTOMER MESSAGE (RAW):
${params.latestCustomerMessage}

Before returning JSON:

1. Reconstruct the conversation from Memory.
2. Determine whether this is new, returning, campaign-only, an existing sales
   journey, payment/support journey or previously closed/rejected.
3. Recover any established customer role and facts.
4. Normalize Indonesian WhatsApp shorthand/compressed language into normalizedMessage.
5. Interpret the latest message using raw text + normalizedMessage + Memory/context.
6. Resolve the precise current-turn intent and intentSubject, including short contextual references.
7. Apply the strict role gate.
8. If ONE-TIME SALES SEMANTIC REVIEW FEEDBACK is present, explicitly re-check the disputed meaning before deciding routing.
9. Decide routing and Knowledge requirements.

Return ONLY valid JSON in exactly this structure:

{
  "understood": true,
  "confidence": 0.95,

  "customerType": "agent|owner|agency|developer|buyer_renter|unknown",

  "clarification": {
    "needed": false,
    "kind": "role|meaning|journey_choice|none",
    "alreadyAttempted": false,
    "attemptCount": 0,
    "goal": null
  },

  "languageStyle": {
    "primaryLanguage": "id|en|mixed|unknown",
    "style": "short description of how this customer naturally communicates"
  },

  "normalizedMessage": "natural Indonesian/English normalization of the latest raw customer message without inventing facts",

  "latestMeaning": "plain-language interpretation of the latest customer message in full conversation context",

  "conversationSituation": "information|interest|comparison|objection|hesitation|rejection|closing|payment|support|casual|unknown",

  "intent": "platform_features|feature_details|feature_example|feature_availability|package_features|package_price|package_recommendation|competitor_comparison|existing_solution_objection|bad_past_experience|self_marketing_objection|price_objection|proof_testimonial|traffic_growth|buyer_availability|buyer_quality|guarantee_question|how_to_list|how_to_use|registration|payment|acknowledgement|support|general_information|unknown",

  "intentSubject": null,

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

- intent must describe the customer's PRIMARY latest-turn need, not merely repeat conversationSituation.
- intentSubject should name the specific package, feature, product, or referent when context supports one; otherwise null.
- Resolve "contohnya", "yang tadi", "fiturnya", "yang itu", "bisa lihat?", and similar short references from the immediate real conversation before assigning intent.
- A general feature question is platform_features, not package_features.
- A named package feature question is package_features.
- A testimonial/proof question is proof_testimonial and must not be collapsed into traffic_growth.
- A neutral portal comparison is competitor_comparison and must not be turned into an objection solely because a competitor name appears.
- "Saya sudah ada/punya/pakai yang seperti itu" is existing_solution_objection, not acceptance or buying readiness.
- Only explicit guarantee/result questions use guarantee_question.
- normalizedMessage must normalize the latest customer message only and must not invent information.
- Common Indonesian WhatsApp shorthand such as byr=bayar, djual=dijual, dsewa=disewa, brp=berapa must be understood when context supports it.
- Use broader linguistic/context reasoning for slang not listed in the examples.
- If meaning is unclear for the first time, do NOT set understood=false just to force handover. Set clarification.needed=true and clarification.kind="meaning".
- If role is required but unknown for the first time, set clarification.needed=true and clarification.kind="role".
- If both Agent and Owner are established and the journey must be chosen, use clarification.kind="journey_choice".
- If the same clarification was already attempted and still remains unresolved, set understood=false, replyNeeded=false and handoverRecommended=true.
- If semanticReview is present, independently re-evaluate the disputed meaning; do not simply echo Sales feedback.
- If semanticReview reveals genuine unresolved ambiguity, use the same one-clarification rule rather than silently choosing a meaning.
- customerType unknown means salesStrategyNeeded=false and salesStrategist=none.
- Developer means no Sales AI and direct Developer journey.
- Buyer/Renter means no Sales AI and direct Buyer/Renter journey.
- Agent/Agency may use Agent Sales AI.
- Owner may use Owner Sales AI.
- Campaign never establishes role.
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
        max_output_tokens: 1050,
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
        params.latestCustomerMessage,
        priorClarification,
        params.memory
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
      params.latestCustomerMessage,
      priorClarification,
      params.memory
    );
  }
}