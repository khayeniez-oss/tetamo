import OpenAI from "openai";
import type { MonaBrainDecision } from "./brain";

export type OwnerSalesGuidance = {
  customerType: "owner";

  knownInformation: {
    propertyGoal: string | null;
    propertyType: string | null;
    location: string | null;
    listingStatus: string | null;
    photosReady: string | null;
    packageDiscussed: string | null;
    packageSelected: string | null;
    paymentStatus: string | null;
    hesitationReason: string | null;
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

  recommendedPackage: "basic" | "priority" | "featured" | null;
  packageRecommendationReason: string | null;
  commercialFacts: string[];

  needsTetamoFacts: boolean;
  factsNeeded: string[];

  semanticConflict: {
    detected: boolean;
    reason: string | null;
    suggestedMeaning: string | null;
  };

  handoverRecommended: boolean;
};

type GenerateOwnerSalesGuidanceParams = {
  brain: MonaBrainDecision;
  customerMessage: string;
  conversationContext: string | null;
  salesStage?: string | null;
};

type OwnerPackageId = "basic" | "priority" | "featured";

type OwnerCommercialPackage = {
  id: OwnerPackageId;
  name: string;
  priceIdr: number;
  durationDays: number;
  facts: string[];
};

const OWNER_PACKAGES: Record<
  OwnerPackageId,
  OwnerCommercialPackage
> = {
  basic: {
    id: "basic",
    name: "Basic Listing",
    priceIdr: 50000,
    durationDays: 365,
    facts: [
      "Basic Listing costs Rp50.000.",
      "Basic Listing is active for 1 year.",
      "Basic Listing supports 1 active property listing.",
      "Basic includes AI-generated title and description.",
      "Basic can receive a Verification Badge after approval.",
      "Basic includes Direct WhatsApp Buyer/Renter contact.",
      "Basic includes Viewing Scheduling.",
      "Basic appears on the Tetamo Marketplace and App.",
      "Basic receives standard/basic marketplace visibility.",
      "Basic auto renew is enabled by default and may be disabled for future renewal.",
    ],
  },

  priority: {
    id: "priority",
    name: "Priority Listing",
    priceIdr: 150000,
    durationDays: 365,
    facts: [
      "Priority Listing costs Rp150.000.",
      "Priority Listing is active for 1 year.",
      "Priority Listing supports 1 active property listing.",
      "Priority includes AI-generated title and description.",
      "Priority can receive a Verification Badge after approval.",
      "Priority includes Direct WhatsApp Buyer/Renter contact.",
      "Priority includes Viewing Scheduling.",
      "Priority appears on the Tetamo Marketplace and App.",
      "Priority provides higher marketplace visibility than Basic.",
      "Priority receives marketplace display priority over Basic.",
      "Priority auto renew is enabled by default and may be disabled for future renewal.",
    ],
  },

  featured: {
    id: "featured",
    name: "Featured Listing",
    priceIdr: 550000,
    durationDays: 365,
    facts: [
      "Featured Listing costs Rp550.000.",
      "Featured Listing is active for 1 year.",
      "Featured Listing supports 1 active property listing.",
      "Featured status remains active for 1 year.",
      "Featured includes AI-generated title and description.",
      "Featured can receive a Verification Badge after approval.",
      "Featured includes Direct WhatsApp Buyer/Renter contact.",
      "Featured includes Viewing Scheduling.",
      "Featured appears on the Tetamo Marketplace and App.",
      "Featured includes a Featured Badge.",
      "Featured provides the highest Owner-package marketplace visibility.",
      "Featured includes posting on Tetamo social media channels Facebook, Instagram and TikTok.",
      "Featured includes Tetamo support for the listing.",
      "Featured auto renew is enabled by default and may be disabled for future renewal.",
    ],
  },
};

const BOOST_FACTS = [
  "Boost Listing is available to both owners and agents.",
  "Boost Listing costs Rp300.000.",
  "Boost Listing is active for 14 days.",
  "Boost gives the listing higher display priority in the Tetamo marketplace.",
  "Boost auto renew is enabled by default unless disabled.",
  "Boost does not guarantee views, enquiries, leads, sales, rentals or closing.",
];

const SPOTLIGHT_FACTS = [
  "Homepage Spotlight is available to both owners and agents.",
  "Homepage Spotlight costs Rp200.000.",
  "Homepage Spotlight is active for 7 days.",
  "Homepage Spotlight places the property in the Tetamo homepage Spotlight area.",
  "Homepage Spotlight has limited availability with a maximum of 3 active Spotlight listings.",
  "Homepage Spotlight auto renew is enabled by default unless disabled.",
  "Homepage Spotlight does not guarantee views, enquiries, leads, sales, rentals or closing.",
];

const OWNER_PAYMENT_FACTS = [
  "For Owner listing payment, the Owner should use the Tetamo Partner app.",
  "The Owner should download or open Tetamo Partner, log in, choose the applicable Owner package or product, complete the property listing when required, and continue to payment.",
  "The Owner completes payment by following the payment flow shown inside Tetamo Partner.",
  "The customer should complete payment only through the payment options presented by the payment system in the app.",
  "After successful payment is confirmed, the Owner listing or purchased product is activated and can follow the applicable verification flow.",
  "If the customer asks about transfer, rekening, or how to pay, do not explain banking infrastructure or offer a manual transfer route. Direct them to Tetamo Partner and tell them to follow the payment flow shown there.",
  "Do not provide or promise Tetamo bank-account details.",
  "Do not instruct the customer to make a manual or direct transfer to Tetamo.",
];

const OWNER_REGISTRATION_STEPS = [
  "Download or open Tetamo Partner on iOS or Android.",
  "Register or log in as an Owner in Tetamo Partner.",
  "Choose the applicable Owner listing package and create the property listing.",
  "Review the listing and continue to the payment flow in Tetamo Partner.",
  "Complete payment by following the payment flow shown inside Tetamo Partner.",
  "After successful payment, the listing becomes active and can appear publicly as Pending Verification while Tetamo completes verification.",
];

const OWNER_LISTING_STEPS = [
  "Download or open Tetamo Partner on iOS or Android.",
  "Register or log in as an Owner in Tetamo Partner.",
  "Choose the applicable Owner listing package and start the listing.",
  "Enter the property details, location, price, transaction type, facilities and other required information.",
  "Upload property photos and supported videos.",
  "Use Generate AI to create the listing title and description when desired.",
  "Complete the required listing verification information.",
  "Review the property information.",
  "Complete payment through the payment flow shown inside Tetamo Partner.",
  "After payment is successfully confirmed, the listing becomes active.",
  "The listing automatically appears publicly with Pending Verification status while awaiting Tetamo verification.",
  "Tetamo reviews and verifies the listing.",
  "After successful verification, the listing becomes Verified.",
  "The owner can continue managing or editing the listing and receive applicable leads, Direct WhatsApp enquiries and viewing requests.",
];

const OWNER_SALES_PLAYBOOK = `
TETAMO OWNER SALES AI

IDENTITY

You are the private Owner Sales strategist behind Mona, Tetamo's
customer-facing WhatsApp assistant.

You NEVER write the final customer-facing WhatsApp reply.

Your job is to:
- understand the property owner's commercial intent;
- understand whether the property is for sale or rent when relevant;
- understand objections and buying signals;
- decide the smartest next sales objective;
- recommend an Owner listing package when appropriate;
- provide approved Owner commercial facts;
- tell Mona what direction to take;
- request general Tetamo Knowledge only when general platform facts are needed.

ROLE BOUNDARY

This Sales AI runs only after the customer has genuinely been established as
an Owner or a person acting for the property owner.

Do NOT infer Owner merely because:
- the customer mentions a property;
- they say "saya punya listing";
- a campaign was owner-focused;
- they reply with "iya", "ya", "mau", "ok", "boleh" or another short reply.

Role identification belongs to Mona Brain.

BRAIN AUTHORITY

Brain has already read full Memory and resolved the customer's semantic meaning
before this Sales AI runs.

Treat the following Brain fields as authoritative semantic context:

- customerType;
- latestMeaning;
- directQuestion;
- conversationSituation;
- intent;
- intentSubject;
- knownContext;
- clarification state;
- languageStyle;
- confidence;
- recommendedNextStep.

The raw customer message is still supplied so you can understand:

- the customer's tone;
- WhatsApp style;
- sales nuance;
- emphasis;
- emotional intensity;
- slang nuance that does NOT change Brain's resolved meaning.

You must understand Indonesian slang, abbreviations, typos, mixed language and
informal WhatsApp writing yourself, but you must NOT silently reinterpret a
meaning that Brain has already resolved.

Example:

Raw message:
"ada byr?"

Brain latestMeaning:
"The owner is asking whether there is a fee / whether they need to pay."

For Indonesian WhatsApp shorthand in this system, "byr" means "bayar" / payment,
not buyer. Treat that meaning consistently unless the customer explicitly writes
"buyer", "pembeli", "penyewa", or other clear buyer/renter language.

If the raw message contains clear explicit evidence that makes Brain's resolved
meaning genuinely contradictory or impossible, do NOT invent a different
meaning. Set semanticConflict.detected=true, explain the contradiction briefly,
and provide suggestedMeaning only when the evidence supports it.

A semantic conflict is exceptional. Ordinary slang, shorthand, spelling errors,
or your own uncertainty are NOT semantic conflicts.

If Brain says clarification.needed=true, Sales AI should not be running yet.

PRECISE INTENT CONTRACT

Brain owns the semantic intent of the latest turn.
Do not invent a second competing customer intent when Brain.intent is specific.

Important distinctions:
- platform_features = explain current Owner/Tetamo Partner capabilities, NOT Owner package prices;
- package_features = explain the applicable package features only;
- package_price = pricing only;
- package_recommendation = package fit only;
- competitor_comparison = answer the comparison without automatically treating it as resistance;
- existing_solution_objection = the owner already uses something similar and questions additional value;
- proof_testimonial = answer approved proof/testimonial facts, NOT generic traffic disclaimers;
- feature_example / feature_details / feature_availability = stay on Brain.intentSubject;
- how_to_list = Tetamo Partner is the primary listing route on iOS/Android;
- acknowledgement = do not reopen selling.

A named competitor alone does not make a turn an objection.
A testimonial/proof question alone does not make a turn an objection.

CORE PRINCIPLES

- Read the conversation before deciding.
- Never run a fixed questionnaire.
- Never collect information simply because a field is empty.
- Never ask again for information already provided.
- Answer a direct question before discovery.
- Ask at most ONE useful question when genuinely needed.
- If the owner wants to register/list/pay, stop unnecessary discovery.
- If an Owner package is selected, progress toward listing/payment.
- If payment has started, focus on completing or resolving payment.
- If the customer clearly rejects the offer, stop selling.
- If the customer is simply ending politely, do not create another sales question.
- Never pressure a customer who says they will proceed later.
- Never invent Tetamo facts, prices, packages, discounts, success statistics,
  payment methods, guarantees or policies.
- Never guarantee leads, enquiries, buyer quality, viewings, sales, rentals,
  conversions or closing.

OWNER GOAL

Property goal is normally:
- sell;
- rent.

Advertising/listing is NOT a third goal.

If owner says:
- "mau iklan rumah";
- "mau pasang properti";
- "mau listing villa";

and sell/rent is genuinely needed for the next step but is unknown, you may ask:

"Properti ini mau dijual atau disewakan?"

Do NOT ask:
"mau dijual, disewakan, atau cuma diiklankan?"

However, if the owner asks a direct question about price, packages, Tetamo,
features, buyer matching, advertising or another topic, ANSWER that direct
question first. Do not hide the answer behind the sell/rent question.

BUILT-IN OWNER COMMERCIAL KNOWLEDGE

Do NOT request Owner package pricing/features from general Tetamo Knowledge.

BASIC LISTING

- Rp50.000.
- Active for 1 year.
- 1 active listing.
- AI-generated title and description.
- Verification Badge after approval.
- Direct WhatsApp Buyer/Renter.
- Viewing Scheduling.
- Appears in Tetamo Marketplace & App.
- Basic marketplace visibility.
- Auto renew enabled by default; may be disabled for future renewal.

PRIORITY LISTING

- Rp150.000.
- Active for 1 year.
- 1 active listing.
- AI-generated title and description.
- Verification Badge after approval.
- Direct WhatsApp Buyer/Renter.
- Viewing Scheduling.
- Appears in Tetamo Marketplace & App.
- Higher visibility than Basic.
- Marketplace display priority.
- Auto renew enabled by default; may be disabled for future renewal.

FEATURED LISTING

- Rp550.000.
- Active for 1 year.
- 1 active listing.
- Featured for the full 1-year listing term.
- AI-generated title and description.
- Verification Badge after approval.
- Direct WhatsApp Buyer/Renter.
- Viewing Scheduling.
- Appears in Tetamo Marketplace & App.
- Featured Badge.
- Highest Owner-package marketplace visibility.
- Posting on Tetamo Facebook, Instagram and TikTok.
- Tetamo support for the listing.
- Auto renew enabled by default; may be disabled for future renewal.

BOOST LISTING

- Available to owners and agents.
- Rp300.000.
- 14 days.
- Higher marketplace display priority.
- Auto renew enabled by default unless disabled.
- No guarantee of views, enquiries, leads or closing.

HOMEPAGE SPOTLIGHT

- Available to owners and agents.
- Rp200.000.
- 7 days.
- Homepage Spotlight placement.
- Maximum 3 active Spotlight listings.
- Auto renew enabled by default unless disabled.
- No guarantee of views, enquiries, leads or closing.

OWNER PACKAGE RECOMMENDATION

All standard Owner packages support 1 active property listing.

Do NOT recommend based on listing count alone.

Recommend according to the owner's desired visibility and features:

BASIC
- suitable when the owner mainly wants a standard Tetamo listing at the lowest
  Owner package price.

PRIORITY
- suitable when the owner wants stronger marketplace visibility and display
  priority compared with Basic.

FEATURED
- suitable when the owner wants the strongest Owner-package marketplace
  visibility, Featured status for 1 year and social media posting on Tetamo
  Facebook, Instagram and TikTok.

Never automatically upsell.

If the owner asks for a package recommendation without explicitly asking for
higher marketplace priority, the strongest visibility, or included social-media
posting, Basic is the standard recommendation. Do not inherit a model-selected
Priority or Featured package without a matching customer need.

If the owner asks for the cheapest package, Basic is the lowest-priced Owner
listing option.

If a smaller package satisfies the owner's stated need, recommending the
smaller package is valid.

If the owner explicitly wants higher marketplace priority, Priority may be
appropriate.

If the owner explicitly wants the strongest Owner visibility and included
Tetamo social-media posting, Featured may be appropriate.

Explain WHY a package fits.

DIRECT PACKAGE QUESTIONS

If the owner asks:
- harga paket;
- paket owner;
- yang paling murah;
- Basic vs Priority;
- Priority vs Featured;
- duration;
- Featured;
- social media posting;
- Boost;
- Spotlight;
- auto renew;

answer from built-in Owner commercial knowledge.

Set commercialFacts with only relevant facts.

Do NOT set needsTetamoFacts=true just because an Owner package price or package
feature was requested.

GENERAL TETAMO KNOWLEDGE

Set needsTetamoFacts=true only when broader Tetamo facts are required.

Examples:
- buyer database;
- buyer matching;
- international/overseas buyers;
- how buyer leads work;
- buyer quality;
- Tetamo advertising;
- Tetamo vs another property platform;
- Tetamo vs posting alone on Instagram/Facebook;
- Tetamo growth and coverage;
- testimonials/proof;
- transaction commission;
- verification policy;
- refund/cancellation policy;
- general platform features.

OWNER REGISTRATION

If owner asks:
- cara daftar;
- cara register;
- cara mulai;
- how do I register;
- where do I start;

recommend giving Owner registration steps directly.

Do not restart discovery.

OWNER REGISTRATION FLOW

1. Download/open Tetamo Partner on iOS or Android.
2. Register/login as Owner in Tetamo Partner.
3. Choose the applicable Owner listing package and create the property listing.
4. Review the listing and proceed to the applicable Tetamo Owner checkout.
5. Complete payment by following the payment flow shown in Tetamo Partner.
6. After successful payment, the listing becomes active and can appear publicly as Pending Verification while Tetamo completes verification.

OWNER LISTING FLOW

If the owner asks:
- cara pasang iklan;
- cara listing;
- gimana upload property;
- how do I list;
- setelah daftar terus apa;

recommend a clear numbered step-by-step answer.

1. Download/open Tetamo Partner on iOS or Android.
2. Register/login as Owner in Tetamo Partner.
3. Choose the applicable Owner listing package and start listing.
4. Enter property details, location, price, transaction type, facilities and
   required information.
5. Upload photos and supported videos.
6. Use Generate AI to create title and description when desired.
7. Complete required verification information.
8. Review the listing.
9. Complete payment through the payment flow shown in Tetamo Partner.
10. After successful payment confirmation, listing becomes active.
11. Listing automatically appears publicly as Pending Verification.
12. Tetamo reviews/verifies the listing.
13. Successful verification changes status to Verified.
14. Owner can manage/edit the listing and receive applicable leads,
    Direct WhatsApp enquiries and viewing requests.

IMPORTANT:
The Owner listing does NOT need to wait until final verification before it
appears publicly after successful payment.
It can appear publicly as Pending Verification.

ASSISTED LISTING REQUEST

If owner says:
- "bisa kalian listing-in?";
- "tolong upload property saya";
- "saya kirim foto kalian pasang";
- "can you list it for me?";
- "Tetamo aja yang upload";

Tetamo does NOT create or upload the listing on behalf of the owner.

The Owner needs to create the listing themselves through Tetamo Partner or
the Owner Dashboard.

Recommend explaining this politely and then providing the Owner listing steps.

Do NOT hand over merely because they asked Tetamo to create the listing.

CAN TETAMO SELL OR RENT IT FOR ME?

If owner asks:
- "Tetamo bisa jualin rumah saya?";
- "bisa carikan penyewa?";
- "kalian yang jual?";
- "kalian yang nego?";
- "can Tetamo sell it for me?";
- "can you manage the property for me?";

distinguish platform assistance from brokerage/property management.

Tetamo provides the marketplace, listing, exposure, buyer/renter matching,
enquiry, lead and viewing tools supported by approved Tetamo Knowledge.

Tetamo does NOT act as the owner's broker, negotiator or property manager as
part of the standard marketplace service.

The Owner remains responsible for property negotiations and transaction
completion.

Use general Tetamo Knowledge for the exact approved platform/buyer matching
facts when answering this type of question.

BUYING SIGNALS

HIGH buying signals include:
- owner selects Basic, Priority or Featured;
- asks for payment link;
- asks how/where to pay with intention to proceed;
- says they want to continue now;
- says they want to list now;
- asks what happens after payment;
- payment has started;
- reports payment problem while trying to purchase.

MEDIUM buying signals include:
- asks exact package price;
- compares Owner packages;
- asks which Owner package fits their desired visibility;
- asks listing steps;
- asks registration steps;
- asks what is included in a package.

LOW buying signals include general curiosity without a clear next action.

When buying signal is HIGH:
- stop unnecessary discovery;
- make the next action easy;
- do not restart qualification.

PAYMENT INTENT

Do NOT treat:
"Bayar ya?"
"Ada fee?"
"Ini berbayar?"
as readiness to pay.

Those are fee/value questions.

Strong payment intent is more like:
- "saya mau bayar";
- "kirim link bayar";
- "cara bayar gimana?";
- "QRIS mana?";
- "saya pilih Featured";
- "sudah transfer";
- "payment error".

Package prices, billing terms AND the Indonesia Owner payment method are
built-in commercial knowledge owned directly by Owner Sales.

APPROVED INDONESIA OWNER PAYMENT FLOW
1. Complete the Owner property listing and review it.
2. Proceed to Tetamo Owner checkout.
3. Continue to payment through Tetamo Partner.
4. Follow the payment options shown by the payment system and complete payment there.
5. After successful payment, the listing becomes active and can appear publicly
   as Pending Verification while Tetamo completes verification.

Never invent a direct bank-transfer flow.
Never say Tetamo will send bank-account details.
Never describe transfer to a Tetamo bank account as the normal Owner listing
payment method in Indonesia.

For ordinary Owner questions such as:
- "bayarnya gimana?";
- "cara bayar?";
- "pake apa bayarnya?";
- "bisa QRIS?";
- "ada byr?";
- "paymentnya lewat mana?";
answer from the built-in Owner payment facts.
Do NOT request general Tetamo Knowledge just to answer the standard Indonesia
Owner payment method.


UNIVERSAL SALES OBJECTION FRAMEWORK

Sales objections are normal sales conversations. They are NOT Admin cases.

For every objection:
1. Identify the real concern.
2. Acknowledge it briefly without agreeing with an incorrect assumption.
3. Answer the concern directly.
4. Use only approved Tetamo commercial facts and approved Knowledge facts.
5. Reframe around the customer's actual goal.
6. Never attack a competitor.
7. Never guarantee leads, views, buyers, sales, rentals or closing.
8. Never force a question when a complete answer can be given.
9. Ask at most ONE question only when it materially changes the next sales step.
10. Respect timing, budget and hard rejection.

Recognize these objection families semantically, including slang, typos and mixed Indonesian/English:

PRICE / VALUE
Examples: "mahal", "kemahalan", "kok bayar", "kenapa bayar", "ada yg murah",
"worth it ga", "mahal bgt", "facebook gratis", "ig gratis".
Strategy: do not argue or instantly discount. Explain relevant value and package fit.
If the objection compares paid Tetamo with free self-posting, request approved
Tetamo comparison/advertising/differentiator facts.

BUDGET / CASH FLOW
Examples: "belum ada duit", "budget blm ada", "habis gajian", "bulan depan".
Strategy: acknowledge timing. Do not pressure. Do not invent discounts.
Treat a real future dependency as timing, not rejection.

COMPETITOR / EXISTING PLATFORM
Examples: "sudah pakai Rumah123", "udah di 99.co", "portal lain",
"listing saya tenggelam", "ngapain tambah platform".
Strategy: never invent competitor facts or attack competitors. Position Tetamo as
an additional channel using approved differentiator/comparison facts.

TRUST / CREDIBILITY
Examples: "Tetamo baru?", "aman?", "beneran?", "siapa yg pakai?",
"ada kantor?", "company mana?".
Strategy: use approved company/growth/proof facts only. Never fabricate scale.

TRAFFIC / ADOPTION
Examples: "rame ga?", "traffic berapa?", "berapa user?", "ada yg lihat?".
Strategy: use approved growth/coverage facts. If no approved number exists,
do not invent one.

LEADS / BUYER AVAILABILITY
Examples: "ada lead?", "punya buyer?", "ada penyewa?", "buyer drmn?".
Strategy: use approved buyer/leads/matching facts.

LEAD QUALITY
Examples: "buyer serius ga?", "qualified?", "cuma kepo", "lead bagus ga?".
Strategy: explain matching and available lead information, but never promise that
every buyer is serious, qualified, verified or ready to transact.

RESULT / GUARANTEE
Examples: "jamin laku?", "jamin closing?", "berapa lama sold?",
"kalau ga dapat lead gimana?".
Strategy: clearly state no guaranteed result, then explain what Tetamo actually
provides and factors that affect outcomes.

PROOF / SOCIAL PROOF
Examples: "ada testimonial?", "ada yg closing?", "bukti?", "contohnya?".
Strategy: use only approved proof/testimonial facts and only give a specific
example/link if actually supplied and verified.

DIY / SELF-MARKETING
Examples: "saya bisa post FB sendiri", "IG sendiri gratis",
"Facebook Marketplace gratis", "saya punya database sendiri".
Strategy: agree that self-posting can remain useful. Do not frame Tetamo as a
replacement. Explain the additional property-specific marketplace, matching,
enquiry, lead, viewing, app and exposure value using approved Knowledge facts.

FEATURE / FIT
Examples: "buat apa fiturnya?", "saya cuma punya sedikit listing",
"kenapa perlu paket ini?".
Strategy: explain only the features relevant to the customer's stated need.
Never upsell automatically.

COMMITMENT / SUBSCRIPTION
Examples: "kenapa setahun?", "bisa bulanan?", "auto renew?",
"kalau cancel gimana?".
Strategy: answer from approved package/subscription facts. Never invent a billing
option or refund promise.

PAYMENT
Examples: "cara bayar?", "bisa QRIS?", "byr gmn?", "payment error".
Strategy: use the built-in approved role-specific payment flow. Normal payment
questions are not Admin cases. Account-specific unresolved payment failures may
require Admin only when staff access/action is genuinely needed.

EFFORT / FRICTION
Examples: "ribet ga?", "harus download app?", "lama ga?",
"males upload satu2".
Strategy: explain the actual steps concisely. Do not pretend Tetamo staff will
perform self-service actions for the customer.

BAD PAST EXPERIENCE
Examples: "pernah bayar portal ga dapet apa2", "kapok bayar iklan",
"dulu ga ada lead".
Strategy: acknowledge the concern, avoid promising a different outcome, and
explain Tetamo's actual differentiators and no-guarantee boundary.

DISCOUNT / NEGOTIATION
Examples: "ada diskon?", "harga net?", "bisa kurang?", "special price?".
Strategy: use only an approved promotion/discount if one exists in supplied
facts. Otherwise do not invent one. A normal discount request is not Admin.

AUTHORITY / OTHER DECISION MAKER
Examples: "tanya bos dulu", "diskusi partner", "tanya suami/istri".
Strategy: respect the dependency. Do not push. Do not schedule follow-up yourself.

SOFT STALL
Examples: "kirim info aja", "pikir2 dulu", "nanti saya kabarin".
Strategy: answer any pending direct question, then leave the door open without
restarting discovery.

HARD REJECTION
Examples: "ga tertarik", "jangan chat lagi", "stop", "hapus nomor saya".
Strategy: stop selling immediately. No follow-up pressure.

PRICE / VALUE OBJECTION

Examples:
- "bayar ya?";
- "kok bayar?";
- "mahal";
- "Facebook gratis";
- "Instagram gratis";
- "kenapa harus bayar?";
- "saya bisa iklan sendiri";

This is not automatically rejection.

Do not argue.
Do not immediately discount.
Do not attack another platform.

Use approved Tetamo comparison, advertising, marketplace, buyer matching and
Owner value facts where relevant.

BUYER AVAILABILITY

Examples:
- "Tetamo punya buyer?";
- "bisa cariin buyer?";
- "ada penyewa?";
- "property saya dikirim ke buyer?";
- "ada buyer luar negeri?";

Use approved Buyers / Leads / Matching knowledge.

BUYER QUALITY

Examples:
- "buyer serius?";
- "qualified?";
- "cuma kepo?";
- "lead bagus gak?";

Never promise every buyer is serious, qualified, verified or ready to buy/rent.

Use approved Buyer Quality / Lead Expectations knowledge.

PERFORMANCE / GUARANTEE

Examples:
- "jamin laku?";
- "jamin tersewa?";
- "jamin dapat buyer?";
- "berapa lama sampai laku?";
- "kalau gak ada lead gimana?";

Never promise results.

Use approved Tetamo no-guarantee/performance-boundary facts.

NEW PLATFORM / CREDIBILITY

Examples:
- "Tetamo baru?";
- "rame gak?";
- "traffic gimana?";
- "ada testimoni?";
- "ada proof?";
- "ada yang sudah sold/rented?";

Treat this as credibility/adoption concern.

Use approved Tetamo Growth / Proof / Testimonials knowledge.

COMPETITOR / OTHER CHANNEL

Examples:
- Rumah123;
- 99.co;
- portal lain;
- Facebook Marketplace;
- Instagram;
- social media;
- advertising sendiri.

Understand the real value objection.

Do not invent competitor facts.

Use approved Tetamo comparison/differentiator information.

OWNER HESITATION

Soft hesitation examples:
- mahal;
- pikir dulu;
- nanti;
- bulan depan;
- belum siap;
- tunggu foto;
- tunggu dokumen;
- tunggu suami/istri;
- tanya keluarga;
- tanya partner;
- belum ada budget.

These are NOT hard rejection.

Acknowledge the stated timing/dependency and do not pressure.

HARD REJECTION

Examples:
- tidak tertarik;
- nggak mau;
- jangan hubungi lagi;
- stop;
- unsubscribe;
- jangan chat lagi;
- hapus nomor saya;
- don't contact me;
- not interested.

For hard rejection:
- pressureLevel="stop";
- recommendedObjective="stop_selling";
- shouldAskQuestion=false;
- never continue pitching.

POLITE CLOSING

Examples:
- makasih;
- terima kasih;
- thanks;
- noted;
- sip;
- oke makasih;
- sudah jelas;
- cukup.

Do not restart the sales journey.
Do not add a new discovery question.

FOLLOW-UP DEPENDENCY

If owner says:
- next month;
- after salary;
- after spouse/family approval;
- after management approval;
- after photos;
- after documents;
- after property is ready;

record the dependency in sales reasoning.

Do NOT schedule it yourself.

Actual 1-hour / 12-hour silence follow-up belongs to the
Orchestrator/Scheduler.

MEMORY

Use conversation memory and populate doNotAsk for already-known information:

- customer_type;
- property_goal;
- property_type;
- location;
- listing_status;
- photos_ready;
- package_preference;
- payment_status;
- hesitation_reason.

Do not ask again for facts the owner already supplied.

HANDOVER

Human handover is exceptional.

Recommend human handover only when genuinely necessary, such as:
- account-specific issue requiring staff access;
- unresolved payment problem requiring staff access;
- exceptional contract or custom negotiated commercial request outside approved products;
- unusual commercial requirement outside the standard Owner products;
- a manual action that Mona cannot perform;
- the customer explicitly requests a human/admin conversation.

A normal discount question is a price/value objection. Handle it using approved facts.
It is NOT automatically a human handover.

Do NOT hand over merely because:
- owner raises an objection or hesitation;
- owner asks whether Tetamo is paid;
- owner asks how to list;
- owner asks Tetamo to list it for them;
- owner asks package price;
- owner asks a buyer/renter question;
- owner asks a normal Tetamo question;
- owner asks how Tetamo helps find buyers/renters.

OUTPUT

Return private Owner sales strategy only.

Never write Mona's final customer-facing WhatsApp reply.
`.trim();

function fallbackGuidance(): OwnerSalesGuidance {
  return {
    customerType: "owner",
    knownInformation: {
      propertyGoal: null,
      propertyType: null,
      location: null,
      listingStatus: null,
      photosReady: null,
      packageDiscussed: null,
      packageSelected: null,
      paymentStatus: null,
      hesitationReason: null,
    },
    customerIntent: "unknown",
    salesState: "unknown",
    buyingSignal: "low",
    objection: null,
    recommendedObjective: "answer_current_question",
    recommendedDirection:
      "Respond to the owner's current message naturally without forcing discovery.",
    reason:
      "No reliable Owner Sales AI guidance was available, so use the safest conversational path.",
    shouldAskQuestion: false,
    doNotAsk: [],
    pressureLevel: "low",
    recommendedPackage: null,
    packageRecommendationReason: null,
    commercialFacts: [],
    needsTetamoFacts: false,
    factsNeeded: [],
    semanticConflict: {
      detected: false,
      reason: null,
      suggestedMeaning: null,
    },
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
    .slice(0, 40);
}

function normalizePackageId(
  value: unknown
): OwnerPackageId | null {
  const text = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (
    text === "basic" ||
    text === "basic_listing"
  ) {
    return "basic";
  }

  if (
    text === "priority" ||
    text === "priority_listing"
  ) {
    return "priority";
  }

  if (
    text === "featured" ||
    text === "featured_listing"
  ) {
    return "featured";
  }

  return null;
}

function parseOwnerSalesGuidance(
  raw: string
): OwnerSalesGuidance {
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
      parsed.knownInformation &&
      typeof parsed.knownInformation === "object"
        ? parsed.knownInformation
        : {};

    const semanticConflict =
      parsed.semanticConflict &&
      typeof parsed.semanticConflict === "object"
        ? parsed.semanticConflict
        : {};

    const buyingSignal = ["low", "medium", "high"].includes(
      String(parsed.buyingSignal)
    )
      ? (parsed.buyingSignal as OwnerSalesGuidance["buyingSignal"])
      : fallback.buyingSignal;

    const pressureLevel = ["low", "medium", "stop"].includes(
      String(parsed.pressureLevel)
    )
      ? (parsed.pressureLevel as OwnerSalesGuidance["pressureLevel"])
      : fallback.pressureLevel;

    return {
      customerType: "owner",
      knownInformation: {
        propertyGoal: cleanString(known.propertyGoal),
        propertyType: cleanString(known.propertyType),
        location: cleanString(known.location),
        listingStatus: cleanString(known.listingStatus),
        photosReady: cleanString(known.photosReady),
        packageDiscussed: cleanString(known.packageDiscussed),
        packageSelected: cleanString(known.packageSelected),
        paymentStatus: cleanString(known.paymentStatus),
        hesitationReason: cleanString(
          known.hesitationReason
        ),
      },
      customerIntent:
        cleanString(parsed.customerIntent) ||
        fallback.customerIntent,
      salesState:
        cleanString(parsed.salesState) ||
        fallback.salesState,
      buyingSignal,
      objection: cleanString(parsed.objection),
      recommendedObjective:
        cleanString(parsed.recommendedObjective) ||
        fallback.recommendedObjective,
      recommendedDirection:
        cleanString(parsed.recommendedDirection) ||
        fallback.recommendedDirection,
      reason:
        cleanString(parsed.reason) ||
        fallback.reason,
      shouldAskQuestion:
        parsed.shouldAskQuestion === true,
      doNotAsk:
        cleanStringArray(parsed.doNotAsk),
      pressureLevel,
      recommendedPackage:
        normalizePackageId(
          parsed.recommendedPackage
        ),
      packageRecommendationReason:
        cleanString(
          parsed.packageRecommendationReason
        ),
      // Commercial facts are never trusted from model output.
      // Deterministic guards rebuild them only from approved Owner package data.
      commercialFacts: [],
      needsTetamoFacts:
        parsed.needsTetamoFacts === true,
      factsNeeded:
        cleanStringArray(parsed.factsNeeded),
      semanticConflict: {
        detected: semanticConflict.detected === true,
        reason: cleanString(semanticConflict.reason),
        suggestedMeaning: cleanString(
          semanticConflict.suggestedMeaning
        ),
      },
      // Model-authored handover is advisory only.
      // Deterministic rules own actual human escalation.
      handoverRecommended: false,
    };
  } catch {
    return fallback;
  }
}

function canonicalMemoryField(value: string) {
  const key = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const compact = key.replace(/_/g, "");

  const aliases: Record<string, string> = {
    customertype: "customer_type",
    propertygoal: "property_goal",
    propertytype: "property_type",
    location: "location",
    listingstatus: "listing_status",
    photosready: "photos_ready",
    packagepreference: "package_preference",
    packagediscussed: "package_preference",
    packageselected: "package_preference",
    paymentstatus: "payment_status",
    hesitationreason: "hesitation_reason",
  };

  return aliases[compact] || key;
}

function includesAny(
  text: string,
  patterns: RegExp[]
) {
  return patterns.some((pattern) =>
    pattern.test(text)
  );
}

function relevantOwnerCommercialFacts(
  latestMessage: string,
  guidance: OwnerSalesGuidance
) {
  const facts = new Set<string>();

  const mentionsBasic =
    /\bbasic(?:\s+listing)?\b/i.test(
      latestMessage
    );

  const mentionsPriority =
    /\bpriority(?:\s+listing)?\b/i.test(
      latestMessage
    );

  const mentionsFeatured =
    /\bfeatured(?:\s+listing)?\b/i.test(
      latestMessage
    );

  const comparison =
    /\b(?:beda|bedanya|compare|banding|pilih mana|yang mana|versus|vs)\b/i.test(
      latestMessage
    );

  if (
    mentionsBasic ||
    (comparison && mentionsPriority)
  ) {
    for (
      const fact of
      OWNER_PACKAGES.basic.facts
    ) {
      facts.add(fact);
    }
  }

  if (
    mentionsPriority ||
    (comparison &&
      (mentionsBasic || mentionsFeatured))
  ) {
    for (
      const fact of
      OWNER_PACKAGES.priority.facts
    ) {
      facts.add(fact);
    }
  }

  if (
    mentionsFeatured ||
    (comparison && mentionsPriority)
  ) {
    for (
      const fact of
      OWNER_PACKAGES.featured.facts
    ) {
      facts.add(fact);
    }
  }

  if (/\bboost\b/i.test(latestMessage)) {
    for (const fact of BOOST_FACTS) {
      facts.add(fact);
    }
  }

  if (
    /\bspotlight\b|homepage spotlight/i.test(
      latestMessage
    )
  ) {
    for (const fact of SPOTLIGHT_FACTS) {
      facts.add(fact);
    }
  }

  if (
    guidance.recommendedPackage
  ) {
    for (
      const fact of
      OWNER_PACKAGES[
        guidance.recommendedPackage
      ].facts
    ) {
      facts.add(fact);
    }
  }

  return Array.from(facts);
}

function applyDeterministicOwnerSalesGuards(
  guidance: OwnerSalesGuidance,
  params: GenerateOwnerSalesGuidanceParams
): OwnerSalesGuidance {
  const latestMessage = String(
    params.customerMessage || ""
  ).trim();

  const brainContextText = [
    params.brain.knownContext.summary || "",
    ...params.brain.knownContext.importantFacts,
    ...params.brain.knownContext.alreadyAnsweredTopics,
  ]
    .filter(Boolean)
    .join("\n");

  const fullConversation = [
    params.conversationContext || "",
    brainContextText,
    latestMessage,
  ]
    .filter(Boolean)
    .join("\n");

  /*
   * Brain's resolved meaning is the primary semantic signal.
   * Raw text is retained only as supporting evidence and tone context.
   */
  const semanticSignal = [
    params.brain.latestMeaning || "",
    params.brain.directQuestion || "",
    latestMessage,
  ]
    .filter(Boolean)
    .join("\n");

  const known = {
    ...guidance.knownInformation,
  };

  const doNotAsk = new Set(
    guidance.doNotAsk
      .map(canonicalMemoryField)
      .filter(Boolean)
  );

  if (known.propertyGoal) {
    doNotAsk.add("property_goal");
  }

  if (known.propertyType) {
    doNotAsk.add("property_type");
  }

  if (known.location) {
    doNotAsk.add("location");
  }

  if (known.listingStatus) {
    doNotAsk.add("listing_status");
  }

  if (known.photosReady) {
    doNotAsk.add("photos_ready");
  }

  if (
    known.packageDiscussed ||
    known.packageSelected
  ) {
    doNotAsk.add("package_preference");
  }

  if (known.paymentStatus) {
    doNotAsk.add("payment_status");
  }

  if (
    !known.hesitationReason &&
    params.brain.timingDependency.active &&
    params.brain.timingDependency.reason
  ) {
    known.hesitationReason =
      params.brain.timingDependency.reason;
  }

  if (known.hesitationReason) {
    doNotAsk.add("hesitation_reason");
  }

  let buyingSignal =
    guidance.buyingSignal;

  let objection =
    guidance.objection;

  let recommendedObjective =
    guidance.recommendedObjective;

  let recommendedDirection =
    guidance.recommendedDirection;

  let reason =
    guidance.reason;

  let shouldAskQuestion =
    guidance.shouldAskQuestion;

  let pressureLevel =
    guidance.pressureLevel;

  let recommendedPackage =
    guidance.recommendedPackage;

  let packageRecommendationReason =
    guidance.packageRecommendationReason;

  let needsTetamoFacts =
    guidance.needsTetamoFacts ||
    params.brain.factualKnowledgeNeeded;

  // Sales model never has final handover authority.
  let handoverRecommended = false;

  const factsNeeded = new Set([
    ...guidance.factsNeeded,
    ...params.brain.knowledgeRequest,
  ]);

  // Never promote model-authored strings to approved commercial truth.
  const commercialFacts = new Set<string>();

  const semanticConflict = {
    ...guidance.semanticConflict,
  };

  const hardRejection =
    params.brain.conversationSituation === "rejection" ||
    includesAny(
      semanticSignal,
      [
      /\b(?:tidak|nggak|gak|ga)\s+(?:tertarik|minat|mau)\b/i,
      /\bjangan\s+(?:hubungi|chat|wa|contact)\b/i,
      /\bstop\b/i,
      /\bunsubscribe\b/i,
      /\bhapus\s+nomor\b/i,
      /\bdon'?t\s+contact\s+me\b/i,
      /\bnot\s+interested\b/i,
    ]
  );

  if (hardRejection) {
    pressureLevel = "stop";
    recommendedObjective =
      "stop_selling";
    recommendedDirection =
      "Respect the owner's rejection. Do not continue selling or ask another sales question.";
    reason =
      "The owner clearly rejected further sales contact.";
    shouldAskQuestion = false;
    buyingSignal = "low";
    handoverRecommended = false;
  }

  const politeClosing =
    params.brain.conversationSituation === "casual" &&
    includesAny(
      latestMessage,
      [
        /^(?:ok|oke|okay|baik|baik\s+(?:kak|kk)|siap|iya\s+baik|ya\s+baik|makasih|terima\s+kasih|thanks|thank\s+you|thx|noted|sip|oke\s+makasih|ok\s+makasih|sudah\s+jelas|cukup)[.! ]*$/i,
      ]
    );

  if (!hardRejection && politeClosing) {
    recommendedObjective =
      "stop_selling";
    recommendedDirection =
      "Acknowledge the owner's polite closing naturally. Do not restart discovery or add another sales question.";
    reason =
      "The owner is politely ending the current exchange.";
    shouldAskQuestion = false;
  }

  const assistedListingRequest =
    includesAny(
      semanticSignal,
      [
        /(?:bisa|boleh|tolong).{0,35}(?:listing|upload|pasang).{0,25}(?:buat|untuk|property|properti|saya)/i,
        /(?:listing|upload|pasang).{0,35}(?:untuk|buat).{0,15}(?:saya|aku|kami)/i,
        /can\s+you\s+(?:list|upload).{0,30}(?:for\s+me|my\s+property)/i,
        /saya\s+kirim\s+(?:foto|data).{0,30}(?:kalian|tetamo).{0,20}(?:pasang|upload|listing)/i,
      ]
    );

  if (
    !hardRejection &&
    assistedListingRequest
  ) {
    recommendedObjective =
      "explain_self_service_listing";

    recommendedDirection =
      "Explain that Tetamo does not create or upload the owner's listing on their behalf. The owner needs to create the listing through Tetamo Partner or Owner Dashboard. Then give the Owner listing steps clearly.";

    reason =
      "The owner is asking Tetamo to create the listing for them, but Owner listings are self-service.";

    shouldAskQuestion = false;

    for (
      const step of OWNER_LISTING_STEPS
    ) {
      commercialFacts.add(step);
    }
  }

  const asksHowToList = includesAny(
    semanticSignal,
    [
      /cara.{0,20}(?:listing|pasang iklan)/i,
      /gimana.{0,20}(?:listing|pasang iklan)/i,
      /bagaimana.{0,20}(?:listing|pasang iklan)/i,
      /how.{0,20}(?:list|upload property|create listing)/i,
      /setelah.{0,20}(?:daftar|register).{0,20}(?:apa|gimana)/i,
    ]
  );

  if (
    !hardRejection &&
    !assistedListingRequest &&
    asksHowToList
  ) {
    recommendedObjective =
      "explain_listing_process";

    recommendedDirection =
      "Give the Owner listing process as clear numbered steps. Do not restart discovery.";

    reason =
      "The owner directly asked how to create a property listing.";

    shouldAskQuestion = false;

    buyingSignal =
      buyingSignal === "low"
        ? "medium"
        : buyingSignal;

    for (
      const step of OWNER_LISTING_STEPS
    ) {
      commercialFacts.add(step);
    }
  }

  const asksHowToRegister = includesAny(
    semanticSignal,
    [
      /cara.{0,20}(?:daftar|register|join)/i,
      /gimana.{0,20}(?:daftar|register|join)/i,
      /bagaimana.{0,20}(?:daftar|register|join)/i,
      /how.{0,20}(?:register|join|sign up)/i,
      /mulai.{0,15}(?:dari mana|gimana)/i,
    ]
  );

  if (
    !hardRejection &&
    !assistedListingRequest &&
    !asksHowToList &&
    asksHowToRegister
  ) {
    recommendedObjective =
      "move_to_registration";

    recommendedDirection =
      "Give the Owner registration steps directly and make the next action easy. Do not restart qualification.";

    reason =
      "The owner directly asked how to register or start.";

    shouldAskQuestion = false;

    buyingSignal =
      buyingSignal === "low"
        ? "medium"
        : buyingSignal;

    for (
      const step of OWNER_REGISTRATION_STEPS
    ) {
      commercialFacts.add(step);
    }
  }

  const selectedPackageMatch =
    semanticSignal.match(
      /\b(?:pilih|ambil|mau|choose|take)\s+(basic(?:\s+listing)?|priority(?:\s+listing)?|featured(?:\s+listing)?)\b/i
    );

  if (
    !hardRejection &&
    selectedPackageMatch
  ) {
    const selected =
      normalizePackageId(
        selectedPackageMatch[1]
      );

    if (selected) {
      recommendedPackage = selected;

      known.packageSelected =
        OWNER_PACKAGES[selected].name;

      doNotAsk.add(
        "package_preference"
      );

      recommendedObjective =
        "move_to_listing";

      recommendedDirection =
        `The owner selected ${OWNER_PACKAGES[selected].name}. Stop unnecessary discovery and move toward creating the listing and completing the applicable payment.`;

      reason =
        "The owner has already selected an Owner listing package.";

      shouldAskQuestion = false;
      buyingSignal = "high";

      for (
        const fact of
        OWNER_PACKAGES[selected].facts
      ) {
        commercialFacts.add(fact);
      }

      for (const fact of OWNER_PAYMENT_FACTS) {
        commercialFacts.add(fact);
      }
    }
  }

  const asksOnlyWhetherPaid =
    params.brain.conversationSituation === "information" &&
    (
      /^(?:ini\s+)?(?:bayar|byr|berbayar|ada\s+(?:fee|biaya|byr)|bayar\s+ya|bayar\s+yaa|bayar\s+kah|is\s+it\s+paid|do\s+i\s+have\s+to\s+pay)[?.! ]*$/i.test(
        latestMessage
      ) ||
      /(?:asking|asks|question).{0,40}(?:whether|if).{0,20}(?:tetamo|listing|package).{0,20}(?:paid|has a fee|costs money)/i.test(
        params.brain.latestMeaning
      )
    );

  const asksOwnerPaymentMethod =
    includesAny(
      semanticSignal,
      [
        /(?:cara|gimana|gmana|gmn|bagaimana|how).{0,25}(?:bayar|byr|payment)/i,
        /(?:bayar|byr|payment).{0,25}(?:gimana|gmana|gmn|bagaimana|lewat mana|via apa|pakai apa|pake apa)/i,
        /(?:qris).{0,20}(?:bisa|pakai|pake|bayar|payment|gimana|gmn|mana)/i,
        /(?:bisa|boleh|pakai|pake|via).{0,20}(?:qris)/i,
        /(?:payment|pembayaran).{0,20}(?:method|metode|cara|via|lewat)/i,
      ]
    );

  const hasStrongPaymentIntent =
    includesAny(
      semanticSignal,
      [
        /(?:saya|aku|kami|sy)\s+(?:mau|ingin|mo|pengen)\s+(?:bayar|byr|payment|lanjut\s+bayar)/i,
        /(?:mau|ingin|boleh|tolong|kirim|send).{0,20}(?:payment link|link bayar)/i,
        /(?:payment link|link bayar).{0,20}(?:mana|dong|please|pls)/i,
        /(?:cara|gimana|gmana|gmn|bagaimana|how).{0,20}(?:bayar|byr|payment)/i,
        /(?:qris|rekening|transfer|kartu|card|bank|ewallet|e-wallet).{0,20}(?:mana|bisa|boleh|pakai|pake|gunakan|bayar)/i,
        /(?:sudah|udah|telah).{0,15}(?:bayar|byr|payment|transfer)/i,
        /(?:gagal|error|problem|masalah).{0,20}(?:bayar|byr|payment|qris|transfer)/i,
      ]
    );

  if (
    !hardRejection &&
    asksOnlyWhetherPaid
  ) {
    recommendedObjective =
      "answer_current_question";

    recommendedDirection =
      "Answer the owner's fee question directly. Explain that Owner advertising uses paid listing packages and provide relevant Owner package information. Do not treat this question alone as readiness to pay.";

    reason =
      "The owner is asking whether Tetamo advertising is paid, not yet explicitly asking to complete payment.";

    shouldAskQuestion = false;

    if (buyingSignal === "high") {
      buyingSignal = "medium";
    }
  } else if (
    !hardRejection &&
    (asksOwnerPaymentMethod || hasStrongPaymentIntent)
  ) {
    buyingSignal = "high";

    if (
      recommendedObjective !==
      "assist_payment_issue"
    ) {
      recommendedObjective =
        "move_to_payment";
    }

    recommendedDirection =
      "Answer the Owner payment question directly and simply: direct the customer to download or open Tetamo Partner -> choose the applicable package or product -> complete/review the listing when required -> follow the payment flow shown in the app -> complete payment there. If they ask about transfer, rekening, or payment method, do not explain banking infrastructure and do not offer manual transfer; redirect them to the Tetamo Partner payment flow.";

    reason =
      "The Owner is asking how to pay or is ready to proceed with the listing payment.";

    shouldAskQuestion = false;

    for (const fact of OWNER_PAYMENT_FACTS) {
      commercialFacts.add(fact);
    }

    needsTetamoFacts = false;
    factsNeeded.delete(
      "approved Tetamo payment methods and payment instructions"
    );
  }

  const asksBuyerDatabase =
    includesAny(
      semanticSignal,
      [
        /punya.{0,15}(?:buyer|pembeli|penyewa|renter)/i,
        /database.{0,15}(?:buyer|pembeli|penyewa|renter)/i,
        /cariin.{0,15}(?:buyer|pembeli|penyewa|renter)/i,
        /match.{0,15}(?:buyer|pembeli|penyewa|renter)/i,
        /(?:buyer|pembeli).{0,15}(?:luar negeri|international|internasional)/i,
        /kirim.{0,20}(?:property|properti).{0,20}(?:buyer|pembeli|penyewa)/i,
      ]
    );

  if (
    !hardRejection &&
    asksBuyerDatabase
  ) {
    needsTetamoFacts = true;

    factsNeeded.add(
      "approved Tetamo buyer and renter database, matching, direct property recommendation and audience facts"
    );
  }

  const asksBuyerQuality =
    includesAny(
      semanticSignal,
      [
        /(?:buyer|pembeli|penyewa).{0,15}(?:serius|serious|qualified|verified)/i,
        /lead.{0,15}(?:bagus|berkualitas|quality|serius)/i,
        /cuma.{0,10}(?:kepo|tanya)/i,
        /filter.{0,15}(?:buyer|pembeli|penyewa).{0,15}serius/i,
      ]
    );

  if (
    !hardRejection &&
    asksBuyerQuality
  ) {
    objection =
      objection ||
      "buyer_quality_concern";

    recommendedObjective =
      "handle_objection";

    needsTetamoFacts = true;

    factsNeeded.add(
      "approved Tetamo buyer quality, qualification boundaries and lead expectations"
    );
  }

  const asksGuarantee = includesAny(
    semanticSignal,
    [
      /jamin.{0,20}(?:buyer|lead|closing|jual|sewa|laku|terjual|tersewa)/i,
      /guarantee.{0,20}(?:lead|closing|sale|rent)/i,
      /berapa lama.{0,20}(?:closing|laku|terjual|tersewa)/i,
      /kalau.{0,20}(?:gak|nggak|tidak).{0,15}(?:dapat|dapet).{0,10}(?:lead|buyer|penyewa)/i,
    ]
  );

  if (
    !hardRejection &&
    asksGuarantee
  ) {
    objection =
      objection ||
      "performance_guarantee_concern";

    recommendedObjective =
      "handle_objection";

    needsTetamoFacts = true;

    factsNeeded.add(
      "approved Tetamo lead expectations, buyer behaviour and no-guarantee boundaries"
    );
  }

  const competitorConcern =
    includesAny(
      semanticSignal,
      [
        /rumah\s*123/i,
        /99\.?co/i,
        /portal lain/i,
        /platform lain/i,
      ]
    );

  if (
    !hardRejection &&
    competitorConcern
  ) {
    objection =
      objection ||
      "existing_portal_or_comparison";

    recommendedObjective =
      "handle_objection";

    needsTetamoFacts = true;

    factsNeeded.add(
      "approved Tetamo differentiators, affordability positioning and comparison guidance"
    );
  }

  const badPastExperienceConcern =
    includesAny(
      semanticSignal,
      [
        /(?:pernah|dulu|udah|sudah).{0,30}(?:bayar|iklan|portal|platform).{0,40}(?:ga|gak|nggak|tidak).{0,15}(?:dapet|dapat|ada).{0,15}(?:lead|hasil|closing|buyer|penyewa)/i,
        /(?:kapok|trauma).{0,20}(?:bayar|iklan|portal|platform)/i,
        /(?:waste|buang).{0,15}(?:uang|duit|budget)/i,
      ]
    );

  if (
    !hardRejection &&
    badPastExperienceConcern
  ) {
    objection =
      objection ||
      "bad_past_advertising_experience";

    recommendedObjective =
      "handle_objection";

    recommendedDirection =
      "Acknowledge the owner's bad past advertising experience. Do not promise Tetamo will produce a different result. Explain only approved Tetamo differentiators and the no-guarantee boundary.";

    reason =
      "The owner is hesitant because of a disappointing previous paid advertising experience.";

    shouldAskQuestion = false;
    needsTetamoFacts = true;

    factsNeeded.add(
      "approved Tetamo differentiators, advertising value, buyer/renter matching, lead tools and no-guarantee boundaries relevant to an owner disappointed by another paid portal or advertising channel"
    );
  }

  const selfMarketingConcern =
    includesAny(
      semanticSignal,
      [
        /(?:post|posting|pasang|iklan).{0,45}(?:instagram|ig|facebook|fb|sosmed|social media|marketplace).{0,45}(?:sendiri|saya sendiri|gratis|free)/i,
        /(?:post|posting|pasang|iklan).{0,45}(?:sendiri|saya sendiri|gratis|free).{0,45}(?:instagram|ig|facebook|fb|sosmed|social media|marketplace)/i,
        /(?:instagram|ig|facebook|fb|sosmed|social media|marketplace).{0,45}(?:sendiri|saya sendiri|gratis|free)/i,
        /(?:sendiri|saya sendiri|gratis|free).{0,45}(?:instagram|ig|facebook|fb|sosmed|social media|marketplace)/i,
        /kenapa.{0,15}bayar.{0,30}(?:instagram|facebook|fb|ig|sosmed|social media|marketplace)/i,
        /(?:ngapain|buat apa).{0,20}bayar.{0,40}(?:instagram|facebook|fb|ig|sosmed|social media|marketplace)/i,
      ]
    );

  if (
    !hardRejection &&
    selfMarketingConcern
  ) {
    objection =
      objection ||
      "self_marketing_value_concern";

    recommendedObjective =
      "handle_objection";

    recommendedDirection =
      "Handle the self-marketing/value objection directly. Acknowledge that the owner can continue posting on Facebook/Instagram for free, then explain Tetamo as an additional property-specific marketplace and sales/rental channel using approved Tetamo buyer/renter matching, direct WhatsApp enquiry, lead, viewing, app, verification and exposure facts. Do not attack free channels and do not guarantee a sale, rental, enquiry or lead.";

    reason =
      "The owner is questioning the value of paying for Tetamo when self-posting on social media or Facebook Marketplace can be free.";

    shouldAskQuestion = false;
    needsTetamoFacts = true;

    factsNeeded.add(
      "approved Tetamo comparison, advertising, property-marketplace, buyer/renter-matching, direct-enquiry, lead, viewing, app, verification and exposure facts for an owner who says they can post on Facebook or Instagram themselves for free"
    );
  }

  const proofQuestion =
    includesAny(
      semanticSignal,
      [
        /(?:proof|bukti|testimoni|testimonial)/i,
        /ada.{0,20}(?:closing|sold|rented|terjual|tersewa)/i,
        /(?:sudah|pernah).{0,20}(?:closing|sold|rented|terjual|tersewa)/i,
      ]
    );

  if (!hardRejection && proofQuestion) {
    objection = null;
    recommendedObjective = "answer_proof_question";
    recommendedDirection =
      "Answer the proof/testimonial question directly with approved proof facts. Do not substitute traffic/user disclaimers or a package pitch.";
    reason = "The owner directly asked for proof/testimonials/results evidence.";
    shouldAskQuestion = false;
    needsTetamoFacts = true;
    factsNeeded.add("approved Tetamo proof, testimonials and sold/rented result facts only");
  }

  const existingSolutionConcern =
    includesAny(
      semanticSignal,
      [
        /(?:sudah|udah|telah).{0,25}(?:ada|punya|pakai|gunakan).{0,35}(?:seperti itu|kayak gitu|mirip|sama|yang seperti|fitur seperti)/i,
        /(?:fitur|tools?|sistem|solution|solusi).{0,30}(?:sudah|udah).{0,20}(?:ada|punya|pakai)/i,
      ]
    );

  if (!hardRejection && existingSolutionConcern) {
    objection = "existing_solution_or_duplicate_value";
    recommendedObjective = "handle_objection";
    recommendedDirection =
      "Do not treat this as acceptance. Explain the incremental Tetamo value alongside what the owner already uses.";
    reason = "The owner says they already have or use something similar and is questioning additional value.";
    shouldAskQuestion = false;
    needsTetamoFacts = true;
    factsNeeded.add("approved current Tetamo Owner differentiators for an existing-solution objection");
  }

  const credibilityConcern =
    includesAny(
      semanticSignal,
      [
        /tetamo.{0,10}(?:baru|new)/i,
        /(?:traffic|rame|ramai|user|pengguna).{0,20}tetamo/i,
      ]
    );

  if (
    !hardRejection &&
    credibilityConcern
  ) {
    objection =
      objection ||
      "credibility_or_growth_concern";

    recommendedObjective =
      "handle_objection";

    needsTetamoFacts = true;

    factsNeeded.add(
      "approved Tetamo growth, coverage, traffic, testimonials and results facts"
    );
  }

  /*
   * FALSE MODEL SELF-MARKETING OBJECTION GUARD
   * -------------------------------------------
   *
   * A normal package question can mention social media because Featured
   * includes Tetamo social-media posting. That alone is not a self-marketing
   * objection.
   *
   * Keep a real deterministic self-marketing objection when the current text
   * actually says things such as posting by oneself, free posting, or
   * questioning why Tetamo should be paid.
   */
  const brainPackageQuestion =
    params.brain.intent === "package_recommendation" ||
    params.brain.intent === "package_features";

  if (
    brainPackageQuestion &&
    !selfMarketingConcern &&
    objection === "self_marketing_value_concern"
  ) {
    objection = null;

    if (recommendedObjective === "handle_objection") {
      recommendedObjective =
        params.brain.intent === "package_recommendation"
          ? "recommend_owner_option"
          : "answer_current_question";
    }

    recommendedDirection =
      params.brain.intent === "package_recommendation"
        ? "Recommend the Owner package that matches the customer's explicitly stated need. Do not invent a self-marketing objection."
        : "Answer the Owner package question directly using the applicable canonical package facts. Do not invent a self-marketing objection.";

    reason =
      "The current Owner turn is a package question, and there is no deterministic evidence of a self-marketing objection.";

    shouldAskQuestion = false;
  }

  /*
   * CURRENT-TURN OBJECTION PRIORITY LOCK
   * ------------------------------------
   *
   * Once the latest Owner turn is deterministically classified as a normal
   * sales objection, that objection owns this turn. Older recommendation or
   * discovery objectives must not pull Mona away from answering it.
   */
  const currentTurnObjectionLocked =
    !hardRejection &&
    recommendedObjective ===
      "handle_objection" &&
    Boolean(objection);

  if (currentTurnObjectionLocked) {
    shouldAskQuestion = false;
    handoverRecommended = false;

    /*
     * A deterministic current-turn objection is already semantically resolved.
     * Do not let a model-authored semantic conflict derail the objection.
     */
    semanticConflict.detected = false;
    semanticConflict.reason = null;
    semanticConflict.suggestedMeaning = null;
  }

  const asksTetamoToSellOrManage =
    includesAny(
      semanticSignal,
      [
        /tetamo.{0,25}(?:jualin|sewain|carikan pembeli|carikan penyewa|nego|manage|kelola)/i,
        /(?:kalian|mona).{0,25}(?:jualin|sewain|carikan pembeli|carikan penyewa|nego|manage|kelola)/i,
        /can\s+(?:tetamo|you).{0,25}(?:sell|rent|manage).{0,25}(?:for me|my property)/i,
      ]
    );

  if (
    !hardRejection &&
    asksTetamoToSellOrManage
  ) {
    recommendedObjective =
      "explain_platform_boundary";

    recommendedDirection =
      "Explain the difference between Tetamo's marketplace/listing/buyer-matching services and acting as the owner's broker, negotiator or property manager. Do not imply Tetamo completes the transaction for the owner.";

    reason =
      "The owner is asking whether Tetamo personally handles the sale, rental, negotiation or property management.";

    shouldAskQuestion = false;
    needsTetamoFacts = true;

    factsNeeded.add(
      "approved Tetamo owner services, marketplace role, buyer matching and transaction boundaries"
    );
  }

  const commercialFromMessage =
    relevantOwnerCommercialFacts(
      semanticSignal,
      guidance
    );

  for (
    const fact of commercialFromMessage
  ) {
    commercialFacts.add(fact);
  }

  const asksOwnerPackageRecommendation =
    includesAny(
      semanticSignal,
      [
        /paket.{0,20}(?:cocok|sesuai|recommend|rekomendasi)/i,
        /(?:cocok|sesuai).{0,20}paket/i,
        /paket.{0,15}mana/i,
        /which.{0,15}package/i,
      ]
    ) ||
    recommendedObjective ===
      "recommend_owner_option";

  if (
    !hardRejection &&
    !currentTurnObjectionLocked &&
    asksOwnerPackageRecommendation
  ) {
    const wantsCheapest =
      /\b(?:paling murah|termurah|cheapest|lowest price)\b/i.test(
        semanticSignal
      );

    const wantsSocial =
      /\b(?:social media|sosmed|instagram|facebook|tiktok|posting sosmed)\b/i.test(
        semanticSignal
      );

    const wantsHighestVisibility =
      /\b(?:tertinggi|highest|maksimal|maximal|maximum|premium exposure|paling kelihatan)\b/i.test(
        semanticSignal
      );

    const wantsPriority =
      /\b(?:priority|prioritas|lebih tinggi|higher visibility)\b/i.test(
        semanticSignal
      );

    if (
      wantsSocial ||
      wantsHighestVisibility
    ) {
      recommendedPackage = "featured";

      packageRecommendationReason =
        "Featured is appropriate when the owner explicitly wants the strongest Owner-package visibility and included Tetamo social-media posting.";

    } else if (wantsPriority) {
      recommendedPackage = "priority";

      packageRecommendationReason =
        "Priority is appropriate when the owner wants stronger marketplace visibility and display priority than Basic.";

    } else if (wantsCheapest) {
      recommendedPackage = "basic";

      packageRecommendationReason =
        "Basic is the lowest-priced standard Owner listing package.";

    } else {
      /*
       * Do not inherit a model-authored package recommendation when the
       * Owner has not explicitly asked for stronger visibility or promotion.
       * Basic is the conservative standard fit and prevents silent upselling.
       */
      recommendedPackage = "basic";

      packageRecommendationReason =
        "Basic is the appropriate standard Owner recommendation when the customer has not explicitly asked for higher marketplace priority, the strongest visibility, or included social-media posting.";
    }

    if (recommendedPackage) {
      recommendedObjective =
        "recommend_owner_option";

      recommendedDirection =
        `Recommend ${OWNER_PACKAGES[recommendedPackage].name} and explain why it fits the owner's stated visibility or promotional needs. Do not upsell beyond the stated need.`;

      reason =
        packageRecommendationReason ||
        "The Owner package recommendation matches the customer's stated requirement.";

      shouldAskQuestion = false;

      for (
        const fact of
        OWNER_PACKAGES[
          recommendedPackage
        ].facts
      ) {
        commercialFacts.add(fact);
      }
    }
  }

  const namesSpecificOwnerPackage =
    /\b(?:basic(?:\s+listing)?|priority(?:\s+listing)?|featured(?:\s+listing)?|boost|spotlight)\b/i.test(
      semanticSignal
    );

  const ownerRecommendationWording = includesAny(
    semanticSignal,
    [
      /paket.{0,20}(?:cocok|sesuai|recommend|rekomendasi)/i,
      /(?:cocok|sesuai).{0,20}paket/i,
      /paket.{0,15}mana/i,
      /which.{0,15}package/i,
    ]
  );

  const genericOwnerPackageOptionsQuestion =
    !ownerRecommendationWording &&
    !namesSpecificOwnerPackage &&
    includesAny(
      semanticSignal,
      [
        /(?:kirim|send|lihat|show|minta).{0,25}(?:paket|package)/i,
        /(?:paket|package).{0,25}(?:apa\s*saja|apa aja|pilihan|opsi|options|tersedia|available)/i,
        /(?:ada|punya).{0,15}(?:paket|package)/i,
        /(?:paket|package)\s*(?:owner|pemilik)?\s*(?:apa|gimana|mana saja)?/i,
      ]
    );

  if (
    !hardRejection &&
    !currentTurnObjectionLocked &&
    genericOwnerPackageOptionsQuestion
  ) {
    recommendedPackage = null;
    packageRecommendationReason = null;
    recommendedObjective =
      "answer_current_question";
    recommendedDirection =
      "Show the Owner the available Basic, Priority and Featured listing choices using only the canonical commercial facts. Answer the request directly and do not ask about visibility preferences unless the customer later asks for a recommendation.";
    reason =
      "The Owner asked to see the available package choices, not for a personalized recommendation.";
    shouldAskQuestion = false;

    commercialFacts.clear();

    for (const packageId of [
      "basic",
      "priority",
      "featured",
    ] as OwnerPackageId[]) {
      for (
        const fact of
        OWNER_PACKAGES[packageId].facts
      ) {
        commercialFacts.add(fact);
      }
    }
  }

  const genericOwnerPriceQuestion =
    !ownerRecommendationWording &&
    !namesSpecificOwnerPackage &&
    includesAny(
      semanticSignal,
      [
        /(?:harga|price|biaya|fee).{0,25}(?:paket|package|listing|owner|pemilik)/i,
        /(?:paket|package|listing).{0,25}(?:harga|price|biaya|fee|berapa)/i,
        /(?:berapa).{0,20}(?:harga|biaya|paket|package|listing)/i,
      ]
    );

  if (
    !hardRejection &&
    !currentTurnObjectionLocked &&
    genericOwnerPriceQuestion
  ) {
    recommendedPackage = null;
    packageRecommendationReason = null;
    recommendedObjective =
      "answer_current_question";
    recommendedDirection =
      "Answer the Owner's generic price question directly with the canonical Basic, Priority and Featured prices. Do not ask another discovery question just to answer price.";
    reason =
      "The Owner asked for Owner listing pricing, not for a personalized recommendation.";
    shouldAskQuestion = false;

    commercialFacts.clear();

    commercialFacts.add(
      OWNER_PACKAGES.basic.facts[0]
    );
    commercialFacts.add(
      OWNER_PACKAGES.priority.facts[0]
    );
    commercialFacts.add(
      OWNER_PACKAGES.featured.facts[0]
    );
  }

  const ownerGoalKnown =
    Boolean(known.propertyGoal);

  const genericListingIntent =
    /\b(?:mau|ingin|pengen|mo).{0,20}(?:iklan|listing|pasang).{0,20}(?:rumah|villa|property|properti|tanah|apartemen|apartment)?/i.test(
      semanticSignal
    );

  const directQuestionPresent =
    Boolean(params.brain.directQuestion) ||
    /\?|berapa|harga|paket|cara|gimana|bagaimana|buyer|pembeli|penyewa|tetamo|boost|spotlight|featured|priority|basic/i.test(
      semanticSignal
    );

  if (
    !hardRejection &&
    genericListingIntent &&
    !ownerGoalKnown &&
    !directQuestionPresent &&
    recommendedObjective ===
      "understand_owner_goal"
  ) {
    recommendedDirection =
      "Ask only whether the property is for sale or rent. Do not treat advertising as a third property goal.";

    reason =
      "The owner wants to advertise a property, but sale versus rental is still relevant and unknown.";

    shouldAskQuestion = true;
  }

  if (
    known.hesitationReason &&
    recommendedObjective ===
      "continue_discovery"
  ) {
    recommendedObjective =
      "acknowledge_follow_up_timing";

    recommendedDirection =
      "Acknowledge the owner's already-known hesitation or timing dependency and do not restart qualification.";

    reason =
      "The owner has already explained why they are not proceeding immediately.";

    shouldAskQuestion = false;
  }

  /*
   * BRAIN INTENT PRIORITY LOCK
   * --------------------------
   * Brain is the semantic authority. Older Sales regex remains fallback protection,
   * but a precise Brain intent owns the latest turn.
   */
  const brainIntent = params.brain.intent;
  const brainIntentSubject = params.brain.intentSubject;

  if (brainIntent === "platform_features") {
    objection = null;
    recommendedPackage = null;
    packageRecommendationReason = null;
    recommendedObjective = "explain_platform_features";
    recommendedDirection =
      "Explain the current Owner/Tetamo Partner capabilities that help an owner list and manage a property. Do not answer a general feature question with Basic/Priority/Featured pricing. Mention only relevant live features and keep coming-soon Agent-only tools out of the Owner answer.";
    reason = "Brain resolved a general Owner platform-feature question.";
    shouldAskQuestion = false;
    commercialFacts.clear();
    needsTetamoFacts = true;
    factsNeeded.clear();
    factsNeeded.add("current live Tetamo Partner Owner product features and Owner property workflow; do not return package pricing");
  } else if (
    brainIntent === "feature_details" ||
    brainIntent === "feature_example" ||
    brainIntent === "feature_availability" ||
    brainIntent === "how_to_use"
  ) {
    objection = null;
    recommendedPackage = null;
    packageRecommendationReason = null;
    recommendedObjective =
      brainIntent === "feature_example"
        ? "explain_feature_example"
        : brainIntent === "feature_availability"
          ? "explain_feature_availability"
          : "explain_feature_details";
    recommendedDirection =
      `Answer only the requested feature topic${brainIntentSubject ? `: ${brainIntentSubject}` : ""}. Use Product Truth and preserve live vs coming-soon status. Do not promise a screenshot/demo/media capability unless explicitly approved.`;
    reason = "Brain resolved a specific feature question.";
    shouldAskQuestion = false;
    commercialFacts.clear();
    needsTetamoFacts = true;
    factsNeeded.clear();
    factsNeeded.add(`approved current product truth for ${brainIntentSubject || "the feature referenced in conversation"}, including status and boundaries`);
  } else if (brainIntent === "competitor_comparison") {
    objection = null;
    recommendedPackage = null;
    packageRecommendationReason = null;
    recommendedObjective = "explain_comparison";
    recommendedDirection =
      "Answer the comparison directly using Tetamo's own Owner value, marketplace, matching, Direct WhatsApp, viewing, verification and listing-management capabilities. Do not attack the other platform, force a package pitch, or add a no-guarantee disclaimer unless asked.";
    reason = "Brain resolved a neutral comparison question.";
    shouldAskQuestion = false;
    commercialFacts.clear();
    needsTetamoFacts = true;
    factsNeeded.clear();
    factsNeeded.add("approved Tetamo differentiators and current Owner workflow value for a neutral platform comparison");
  } else if (brainIntent === "proof_testimonial") {
    objection = null;
    recommendedPackage = null;
    packageRecommendationReason = null;
    recommendedObjective = "answer_proof_question";
    recommendedDirection =
      "Answer the proof/testimonial question directly with approved proof facts. Do not lead with traffic limitations, no-guarantee language, or a package pitch. Do not invent a specific testimonial, property or link.";
    reason = "Brain resolved a proof/testimonial request.";
    shouldAskQuestion = false;
    commercialFacts.clear();
    needsTetamoFacts = true;
    factsNeeded.clear();
    factsNeeded.add("approved Tetamo proof, testimonials and sold/rented result facts only; exclude unrelated traffic disclaimers");
  } else if (brainIntent === "traffic_growth") {
    objection = null;
    recommendedPackage = null;
    packageRecommendationReason = null;
    recommendedObjective = "answer_growth_question";
    recommendedDirection =
      "Answer the growth/adoption question using approved current growth facts. Do not lead with unavailable traffic numbers unless the owner explicitly asks for an exact number.";
    reason = "Brain resolved a growth/adoption question.";
    shouldAskQuestion = false;
    commercialFacts.clear();
    needsTetamoFacts = true;
    factsNeeded.clear();
    factsNeeded.add("approved Tetamo growth, coverage and market-presence facts relevant to the exact question");
  } else if (brainIntent === "buyer_availability") {
    objection = null;
    recommendedPackage = null;
    packageRecommendationReason = null;
    recommendedObjective = "answer_buyer_availability";
    recommendedDirection =
      "Explain the approved buyer/renter database, matching, recommendation and lead flow. Lead with what Tetamo provides; do not add quality/guarantee limitations unless that is the actual question.";
    reason = "Brain resolved a buyer/renter availability question.";
    shouldAskQuestion = false;
    commercialFacts.clear();
    needsTetamoFacts = true;
    factsNeeded.clear();
    factsNeeded.add("approved Tetamo buyer/renter database, matching, recommendation and lead workflow facts");
  } else if (brainIntent === "existing_solution_objection") {
    objection = "existing_solution_or_duplicate_value";
    recommendedPackage = null;
    packageRecommendationReason = null;
    recommendedObjective = "handle_objection";
    recommendedDirection =
      "Acknowledge that the owner already uses something similar. Do not interpret this as acceptance. Explain what Tetamo adds as an additional property-specific channel and workflow without repeating package pricing unless asked.";
    reason = "The owner is questioning incremental value because they already have something similar.";
    shouldAskQuestion = false;
    commercialFacts.clear();
    needsTetamoFacts = true;
    factsNeeded.clear();
    factsNeeded.add("approved current Tetamo Owner differentiators for an existing-solution/duplicate-value objection");
  } else if (brainIntent === "bad_past_experience") {
    objection = "bad_past_advertising_experience";
    recommendedPackage = null;
    packageRecommendationReason = null;
    recommendedObjective = "handle_objection";
    recommendedDirection =
      "Acknowledge the previous bad portal/advertising experience briefly, then explain the most relevant Tetamo value. Do not lead with a no-guarantee disclaimer and do not promise a better outcome.";
    reason = "Brain resolved a bad-past-experience objection.";
    shouldAskQuestion = false;
    commercialFacts.clear();
    needsTetamoFacts = true;
    factsNeeded.clear();
    factsNeeded.add("approved value-first Tetamo Owner differentiators for a bad previous portal/advertising experience");
  } else if (brainIntent === "self_marketing_objection") {
    objection = "self_marketing_value_concern";
    recommendedPackage = null;
    packageRecommendationReason = null;
    recommendedObjective = "handle_objection";
    recommendedDirection =
      "Acknowledge that free/self-managed channels can remain useful, then explain Tetamo as an additional property-specific discovery, matching, direct-enquiry, viewing and verification channel. Do not lead with a guarantee disclaimer.";
    reason = "Brain resolved a self-marketing/additional-value objection.";
    shouldAskQuestion = false;
    commercialFacts.clear();
    needsTetamoFacts = true;
    factsNeeded.clear();
    factsNeeded.add("approved Tetamo comparison and Owner value facts for a self-marketing objection");
  } else if (brainIntent === "price_objection") {
    objection = "price_value_concern";
    recommendedObjective = "handle_objection";
    recommendedDirection =
      "Address the price/value concern using relevant Owner value. Do not automatically discount, upsell, or make the answer mainly about guarantees.";
    reason = "Brain resolved a price/value objection.";
    shouldAskQuestion = false;
    needsTetamoFacts = true;
    factsNeeded.add("approved Tetamo Owner value facts relevant to a price/value objection");
  } else if (brainIntent === "buyer_quality") {
    objection = "buyer_quality_concern";
    recommendedObjective = "handle_objection";
    recommendedDirection =
      "Explain matching/lead information first, then state the buyer-quality boundary because the owner specifically asked about seriousness/qualification.";
    reason = "Brain resolved a buyer-quality concern.";
    shouldAskQuestion = false;
    commercialFacts.clear();
    needsTetamoFacts = true;
    factsNeeded.clear();
    factsNeeded.add("approved Tetamo buyer quality, matching and lead-expectation boundaries");
  } else if (brainIntent === "guarantee_question") {
    objection = "performance_guarantee_concern";
    recommendedObjective = "handle_objection";
    recommendedDirection =
      "Clearly answer the explicit guarantee/result question with the approved no-guarantee boundary, then explain the relevant Tetamo value.";
    reason = "Brain resolved an explicit guarantee/result question.";
    shouldAskQuestion = false;
    commercialFacts.clear();
    needsTetamoFacts = true;
    factsNeeded.clear();
    factsNeeded.add("approved Tetamo guarantee/result boundaries plus the relevant value provided");
  } else if (brainIntent === "how_to_list") {
    objection = null;
    recommendedPackage = null;
    packageRecommendationReason = null;
    recommendedObjective = "explain_listing_process";
    recommendedDirection =
      "Direct the Owner to download/open Tetamo Partner on iOS or Android and give the self-service listing steps. Tetamo Partner is the primary listing route. Do not add unrelated package details.";
    reason = "Brain resolved a direct how-to-list question.";
    shouldAskQuestion = false;
    commercialFacts.clear();
    for (const step of OWNER_LISTING_STEPS) commercialFacts.add(step);
    needsTetamoFacts = true;
    factsNeeded.clear();
    factsNeeded.add("current Tetamo Partner availability on iOS/Android and Owner listing-route facts");
  } else if (brainIntent === "registration") {
    objection = null;
    recommendedObjective = "move_to_registration";
    recommendedDirection =
      "Direct the Owner to download/open Tetamo Partner on iOS or Android and give the Owner registration steps without restarting qualification.";
    reason = "Brain resolved a registration/start question.";
    shouldAskQuestion = false;
    commercialFacts.clear();
    for (const step of OWNER_REGISTRATION_STEPS) commercialFacts.add(step);
    needsTetamoFacts = true;
    factsNeeded.add("current Tetamo Partner availability on iOS/Android");
  } else if (brainIntent === "acknowledgement") {
    recommendedObjective = "stop_selling";
    recommendedDirection =
      "Do not reopen the sales conversation. If Brain says a reply is needed, keep it to one natural acknowledgement; otherwise remain silent.";
    reason = "Brain resolved a natural acknowledgement/closing.";
    shouldAskQuestion = false;
    recommendedPackage = null;
    packageRecommendationReason = null;
    commercialFacts.clear();
  }

  const allowLegacyPackageFacts =
    brainIntent === "unknown" ||
    brainIntent === "package_features" ||
    brainIntent === "package_price" ||
    brainIntent === "package_recommendation" ||
    brainIntent === "payment";

  if (!allowLegacyPackageFacts && brainIntent !== "how_to_list" && brainIntent !== "registration") {
    commercialFacts.clear();
  }

  /*
   * A genuine semantic conflict goes back to Brain.
   *
   * Do not answer from a Sales reinterpretation and do not request Knowledge
   * for a meaning that has not been semantically resolved.
   * Orchestrator will intercept this before Writer.
   */
  if (
    semanticConflict.detected &&
    !currentTurnObjectionLocked
  ) {
    recommendedObjective =
      "semantic_conflict";
    recommendedDirection =
      "Return this turn to Mona Brain for semantic re-evaluation. Do not reinterpret Brain silently and do not write a customer-facing answer from the conflicting meaning.";
    reason =
      semanticConflict.reason ||
      "Owner Sales detected explicit evidence that conflicts with Brain's resolved meaning.";
    shouldAskQuestion = false;
    needsTetamoFacts = false;
    factsNeeded.clear();
    commercialFacts.clear();
    handoverRecommended = false;
  }

  return {
    ...guidance,
    knownInformation: known,
    customerIntent: params.brain.intent,
    buyingSignal,
    objection,
    recommendedObjective,
    recommendedDirection,
    reason,
    shouldAskQuestion,
    doNotAsk:
      Array.from(doNotAsk),
    pressureLevel,
    recommendedPackage,
    packageRecommendationReason,
    commercialFacts:
      Array.from(
        commercialFacts
      ).slice(0, 40),
    needsTetamoFacts,
    factsNeeded:
      Array.from(
        factsNeeded
      ).slice(0, 20),
    semanticConflict,
    handoverRecommended,
  };
}

export async function generateOwnerSalesGuidance(
  params: GenerateOwnerSalesGuidanceParams
): Promise<OwnerSalesGuidance> {
  if (!process.env.OPENAI_API_KEY) {
    return applyDeterministicOwnerSalesGuards(
      fallbackGuidance(),
      params
    );
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = `
${OWNER_SALES_PLAYBOOK}

CRM SALES STAGE (OBSERVATIONAL CONTEXT ONLY):
${params.salesStage || "none"}

Do not let CRM stage override the actual conversation or Brain understanding.

BRAIN RESOLVED UNDERSTANDING:
${JSON.stringify(
  {
    customerType: params.brain.customerType,
    normalizedMessage: params.brain.normalizedMessage,
    latestMeaning: params.brain.latestMeaning,
    confidence: params.brain.confidence,
    conversationSituation:
      params.brain.conversationSituation,
    intent: params.brain.intent,
    intentSubject: params.brain.intentSubject,
    directQuestion: params.brain.directQuestion,
    knownContext: params.brain.knownContext,
    clarification: params.brain.clarification,
    languageStyle: params.brain.languageStyle,
    factualKnowledgeNeeded:
      params.brain.factualKnowledgeNeeded,
    knowledgeRequest:
      params.brain.knowledgeRequest,
    recommendedNextStep:
      params.brain.recommendedNextStep,
  },
  null,
  2
)}

IMPORTANT SEMANTIC AUTHORITY:
- Brain has already read full Memory and resolved the customer's meaning.
- Trust Brain's customerType, normalizedMessage and resolved latestMeaning.
- Treat normalizedMessage as Brain's recovered Indonesian WhatsApp wording.
- Understand slang, abbreviations, typos and mixed language yourself for commercial nuance.
- Do NOT silently reinterpret ambiguous shorthand differently from Brain.
- Use the raw customer message mainly for tone, emphasis and commercial nuance.
- If explicit wording genuinely contradicts Brain's resolved meaning, set semanticConflict.detected=true instead of inventing a different interpretation.
- Ordinary uncertainty is not a semantic conflict.

RECENT / AVAILABLE CONVERSATION:
${params.conversationContext || "No earlier conversation."}

LATEST CUSTOMER MESSAGE:
${params.customerMessage}

Analyse the conversation as Tetamo's private Owner Sales AI.

Return ONLY valid JSON in exactly this structure:

{
  "customerType": "owner",
  "knownInformation": {
    "propertyGoal": null,
    "propertyType": null,
    "location": null,
    "listingStatus": null,
    "photosReady": null,
    "packageDiscussed": null,
    "packageSelected": null,
    "paymentStatus": null,
    "hesitationReason": null
  },
  "customerIntent": "mirror Brain.intent",
  "salesState": "short description",
  "buyingSignal": "low|medium|high",
  "objection": null,
  "recommendedObjective": "single objective",
  "recommendedDirection": "private sales strategy for Mona, not customer-facing wording",
  "reason": "brief explanation",
  "shouldAskQuestion": false,
  "doNotAsk": [],
  "pressureLevel": "low|medium|stop",
  "recommendedPackage": null,
  "packageRecommendationReason": null,
  "commercialFacts": [],
  "needsTetamoFacts": false,
  "factsNeeded": [],
  "semanticConflict": {
    "detected": false,
    "reason": null,
    "suggestedMeaning": null
  },
  "handoverRecommended": false
}

RULES FOR commercialFacts:
- Commercial truth comes only from the built-in Owner package data and deterministic guards.
- Do not invent, estimate or alter package facts.
- Do not use commercialFacts for general Tetamo platform facts.

RULES FOR semanticConflict:
- false in normal cases.
- true only when explicit wording makes Brain's resolved meaning genuinely contradictory or impossible.
- do not use semanticConflict merely because slang is unfamiliar or the message is short.
- never silently replace Brain's meaning with your own.

RULES FOR customerIntent:
- mirror Brain.intent when Brain.intent is specific;
- do not create a competing semantic classification.

RULES FOR needsTetamoFacts:
- true only when general Tetamo Knowledge is required.
- false for Basic, Priority, Featured, Boost and Spotlight facts already defined here.

Do not include a WhatsApp reply.
Do not include markdown.
`.trim();

  try {
    const response =
      await openai.responses.create({
        model: "gpt-4.1-mini",
        input: prompt,
        temperature: 0.1,
        max_output_tokens: 950,
      });

    return applyDeterministicOwnerSalesGuards(
      parseOwnerSalesGuidance(
        String(
          response.output_text || ""
        )
      ),
      params
    );
  } catch (error) {
    console.error(
      "Tetamo Owner Sales AI guidance failed:",
      error
    );

    return applyDeterministicOwnerSalesGuards(
      fallbackGuidance(),
      params
    );
  }
}
