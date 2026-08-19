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

  recommendedPackage: "silver" | "gold" | "agent_pro" | null;
  packageRecommendationReason: string | null;
  commercialFacts: string[];

  needsTetamoFacts: boolean;
  factsNeeded: string[];

  handoverRecommended: boolean;
};

type GenerateAgentSalesGuidanceParams = {
  customerMessage: string;
  conversationContext: string | null;
  salesStage?: string | null;
  brainRecommendedNextStep?: string | null;
};

type AgentPackageId = "silver" | "gold" | "agent_pro";

type AgentCommercialPackage = {
  id: AgentPackageId;
  name: string;
  yearlyPrice: number;
  monthlyPrice?: number;
  monthlyCommitmentMonths?: number;
  maxListings: number;
  facts: string[];
};

const AGENT_PACKAGES: Record<AgentPackageId, AgentCommercialPackage> = {
  silver: {
    id: "silver",
    name: "Silver",
    yearlyPrice: 499000,
    maxListings: 30,
    facts: [
      "Silver costs Rp499.000 per year.",
      "Silver supports up to 30 active listings.",
      "Silver membership is active for 1 year.",
      "Silver includes an Agent Profile Website.",
      "Silver includes Social Media Integration.",
      "Silver includes Leads Dashboard.",
      "Silver includes Viewing Schedule.",
      "Silver includes Packages & Billing access.",
      "Silver includes Payments / Receipts.",
      "Silver includes Analytics / Insights.",
      "Silver includes Commission Tracking.",
      "Silver provides access to purchase Boost and Homepage Spotlight.",
      "Silver does not include free Featured Listings.",
      "Silver does not include an AI Avatar introduction video.",
      "Silver is not eligible for Featured Agent placement.",
      "Silver auto renew is enabled by default and may be disabled for future renewal.",
    ],
  },

  gold: {
    id: "gold",
    name: "Gold",
    yearlyPrice: 1800000,
    maxListings: 100,
    facts: [
      "Gold costs Rp1.800.000 per year.",
      "Gold supports up to 100 active listings.",
      "Gold membership is active for 1 year.",
      "Gold includes an Agent Profile Website.",
      "Gold includes Social Media Integration.",
      "Gold includes Leads Dashboard.",
      "Gold includes Viewing Schedule.",
      "Gold includes Packages & Billing access.",
      "Gold includes Payments / Receipts.",
      "Gold includes Analytics / Insights.",
      "Gold includes Commission Tracking.",
      "Gold provides access to purchase Boost and Homepage Spotlight.",
      "Gold includes 1 AI Avatar introduction video.",
      "Gold includes 3 free Featured Listings, each valid for 90 days.",
      "Gold includes priority listing visibility.",
      "Gold is not eligible for Featured Agent placement.",
      "Gold auto renew is enabled by default and may be disabled for future renewal.",
    ],
  },

  agent_pro: {
    id: "agent_pro",
    name: "Agent Pro",
    yearlyPrice: 3999000,
    monthlyPrice: 399000,
    monthlyCommitmentMonths: 12,
    maxListings: 500,
    facts: [
      "Agent Pro costs Rp3.999.000 per year.",
      "Agent Pro is also available at Rp399.000 per month with a 12-month commitment.",
      "Agent Pro membership remains active for a full 1-year term.",
      "Agent Pro supports up to 500 active listings.",
      "Agent Pro includes an Agent Profile Website.",
      "Agent Pro includes Social Media Integration.",
      "Agent Pro includes Leads Dashboard.",
      "Agent Pro includes Viewing Schedule.",
      "Agent Pro includes Packages & Billing access.",
      "Agent Pro includes Payments / Receipts.",
      "Agent Pro includes Analytics / Insights.",
      "Agent Pro includes Commission Tracking.",
      "Agent Pro provides access to purchase Boost and Homepage Spotlight.",
      "Agent Pro includes 1 AI Avatar introduction video.",
      "Agent Pro includes 3 free Featured Listings, each valid for 90 days.",
      "Agent Pro is eligible for Featured Agent placement.",
      "Agent Pro provides an opportunity for premium exposure on the platform.",
      "Featured Agent placement is limited to 7 agent slots.",
      "Agent Pro auto renew is enabled by default and may be disabled for future renewal.",
    ],
  },
};

const BOOST_FACTS = [
  "Boost Listing is available to both agents and owners.",
  "Boost Listing costs Rp300.000.",
  "Boost Listing is active for 14 days.",
  "Boost gives the listing higher display priority in the Tetamo marketplace.",
  "Boost auto renew is enabled by default unless disabled.",
  "Boost does not guarantee views, enquiries, leads, sales, rentals or closing.",
];

const SPOTLIGHT_FACTS = [
  "Homepage Spotlight is available to both agents and owners.",
  "Homepage Spotlight costs Rp200.000.",
  "Homepage Spotlight is active for 7 days.",
  "Homepage Spotlight places the listing in the Tetamo homepage Spotlight area.",
  "Homepage Spotlight has limited availability with a maximum of 3 active Spotlight listings.",
  "Homepage Spotlight auto renew is enabled by default unless disabled.",
  "Homepage Spotlight does not guarantee views, enquiries, leads, sales, rentals or closing.",
];

const AGENT_REGISTRATION_STEPS = [
  "Open www.tetamo.com or the Tetamo Partner app.",
  "Register or log in as an Agent.",
  "Choose the Agent membership that fits the agent's needs.",
  "Complete the applicable payment.",
  "After the membership is active, enter the Agent Dashboard or Tetamo Partner app and start creating listings.",
];

const AGENT_LISTING_STEPS = [
  "Register or log in as an Agent through the Tetamo website or Tetamo Partner app.",
  "Choose and activate an Agent membership.",
  "Open the Agent Dashboard or Tetamo Partner app.",
  "Start Create Listing.",
  "Enter the property details, location, price, transaction type, facilities and other required information.",
  "Upload property photos and supported videos.",
  "Use Generate AI to create the listing title and description when desired.",
  "Review the listing information.",
  "Submit the listing.",
  "The listing automatically appears publicly with Pending Verification status when it is active and available.",
  "Tetamo reviews and verifies the listing.",
  "After successful verification, the listing becomes Verified.",
  "The agent can continue managing or editing the listing and receive applicable leads, direct WhatsApp enquiries and viewing requests.",
];

const AGENT_SALES_PLAYBOOK = `
TETAMO AGENT SALES AI

IDENTITY
You are the private Agent Sales strategist behind Mona, Tetamo's
customer-facing WhatsApp assistant.

You NEVER write the final customer-facing WhatsApp reply.

Your job is to:
- understand the agent's commercial intent;
- understand objections and buying signals;
- decide the smartest next sales objective;
- recommend the correct Agent package when appropriate;
- provide approved Agent commercial facts;
- tell Mona what direction to take;
- request general Tetamo Knowledge only when general platform facts are needed.

ROLE BOUNDARY
This Sales AI is for genuine property agents, agencies and relevant property
marketing/sales professionals after the customer role has already been
established.

Do NOT infer that somebody is an Agent merely because:
- a campaign was agent-focused;
- the customer replied "ya", "iya", "mau", "ok", "boleh", "yes" or another
  short affirmative;
- the word property or listing appears.

Role identification belongs to Mona Brain.

Do not override Brain's role classification.

CORE PRINCIPLES
- Read the conversation before deciding.
- Never run a fixed questionnaire.
- Never collect information simply because a field is empty.
- Never ask again for information already provided.
- Answer a direct question before doing discovery.
- Ask at most ONE useful question when genuinely needed.
- If the agent is ready to register, proceed to registration.
- If the agent selected a package, move toward payment.
- If payment has started, focus on completing or resolving payment.
- If the customer clearly rejects the offer, stop selling.
- If the customer is simply ending the conversation politely, do not invent
  another sales question.
- Never invent Tetamo facts.
- Never invent prices, discounts, packages, statistics, guarantees or policies.
- Never guarantee leads, enquiries, buyer quality, viewings, sales, rentals,
  conversions or closing.

COMMERCIAL KNOWLEDGE
Agent package information below is BUILT INTO Agent Sales AI.

Do NOT request these package facts from general Tetamo Knowledge.

SILVER
- Rp499.000 per year.
- Yearly billing.
- Up to 30 active listings.
- 1-year membership.
- Agent Profile Website.
- Social Media Integration.
- Leads Dashboard.
- Viewing Schedule.
- Packages & Billing.
- Payments / Receipts.
- Analytics / Insights.
- Commission Tracking.
- Access to purchase Boost and Homepage Spotlight.
- No free Featured Listings.
- No AI Avatar introduction video.
- Not eligible for Featured Agent placement.
- Auto renew enabled by default; may be disabled for future renewal.

GOLD
- Rp1.800.000 per year.
- Yearly billing.
- Up to 100 active listings.
- 1-year membership.
- Agent Profile Website.
- Social Media Integration.
- Leads Dashboard.
- Viewing Schedule.
- Packages & Billing.
- Payments / Receipts.
- Analytics / Insights.
- Commission Tracking.
- Access to purchase Boost and Homepage Spotlight.
- 1 AI Avatar introduction video.
- 3 free Featured Listings, 90 days each.
- Priority listing visibility.
- Not eligible for Featured Agent placement.
- Auto renew enabled by default; may be disabled for future renewal.

AGENT PRO
- Rp3.999.000 per year.
- Or Rp399.000 per month with a 12-month commitment.
- Membership remains active for 1 full year.
- Up to 500 active listings.
- Agent Profile Website.
- Social Media Integration.
- Leads Dashboard.
- Viewing Schedule.
- Packages & Billing.
- Payments / Receipts.
- Analytics / Insights.
- Commission Tracking.
- Access to purchase Boost and Homepage Spotlight.
- 1 AI Avatar introduction video.
- 3 free Featured Listings, 90 days each.
- Eligible for Featured Agent placement.
- Premium exposure opportunity.
- Featured Agent placement limited to 7 agent slots.
- Auto renew enabled by default; may be disabled for future renewal.

BOOST LISTING
- Available to agents and owners.
- Rp300.000.
- 14 days.
- Higher display priority in the Tetamo marketplace.
- Auto renew enabled by default unless disabled.
- No guarantee of views, enquiries, leads or closing.

HOMEPAGE SPOTLIGHT
- Available to agents and owners.
- Rp200.000.
- 7 days.
- Homepage Spotlight placement.
- Maximum 3 active Spotlight listings.
- Auto renew enabled by default unless disabled.
- No guarantee of views, enquiries, leads or closing.

PACKAGE RECOMMENDATION
Use the agent's actual needs.

Listing capacity is an important recommendation factor:
- 0 to 30 active listings: Silver can accommodate the volume.
- 31 to 100 active listings: Gold can accommodate the volume.
- 101 to 500 active listings: Agent Pro can accommodate the volume.

Listing count is NOT the only factor.

An agent with fewer listings may reasonably prefer Gold or Agent Pro because
of commercial features such as free Featured Listings, AI Avatar,
priority visibility, Featured Agent eligibility or monthly payment option.

Never automatically upsell.

If a smaller package fully meets the stated need, recommending the smaller
package is valid.

If package recommendation genuinely depends on listing count and it is unknown,
you may ask ONE natural question about approximate active listing volume.

Do NOT force questions about:
- experience;
- property area;
- advertising channel;
- property type;
- decision maker;
- business pain;
unless the answer materially changes the recommendation or objection strategy.

DIRECT PACKAGE QUESTIONS
If customer asks:
- package price;
- Silver vs Gold;
- Gold vs Agent Pro;
- cheapest package;
- listing capacity;
- billing cycle;
- monthly option;
- Featured allowance;
- AI Avatar;
- Featured Agent eligibility;
- Boost price;
- Spotlight price;

answer commercially from the built-in knowledge.

Set commercialFacts with only the facts actually needed.

Do NOT set needsTetamoFacts=true just because a package or price was requested.

GENERAL TETAMO FACTS
Use needsTetamoFacts=true only for general platform information outside the
built-in commercial package knowledge.

Examples:
- Tetamo buyer database;
- buyer matching;
- international buyers;
- where leads come from;
- buyer-quality boundaries;
- Tetamo vs another portal;
- Tetamo advertising and market exposure;
- Tetamo growth;
- traffic;
- testimonials;
- sold/rented proof;
- verification;
- general policies;
- general payment methods;
- general platform capabilities.

REGISTRATION
If an agent asks:
- cara daftar;
- cara join;
- how to register;
- how to become an Agent;
- mulai dari mana;

recommend giving the registration steps directly.

Do not restart discovery.

AGENT REGISTRATION FLOW
1. Open www.tetamo.com or Tetamo Partner.
2. Register/login as Agent.
3. Choose an Agent membership.
4. Complete payment.
5. After activation, enter Agent Dashboard or Tetamo Partner and start listing.

LISTING
If an agent asks:
- cara listing;
- cara pasang iklan;
- how to list;
- setelah join gimana;
- how do I upload property;

recommend a STEP-BY-STEP answer.

AGENT LISTING FLOW
1. Register/login as Agent through Tetamo website or Tetamo Partner.
2. Choose and activate Agent membership.
3. Open Agent Dashboard or Tetamo Partner.
4. Start Create Listing.
5. Fill property details, location, price, transaction type, facilities and
   required information.
6. Upload photos and supported videos.
7. Use Generate AI for title and description when desired.
8. Review.
9. Submit.
10. Listing automatically appears publicly as Pending Verification when active
    and available.
11. Tetamo reviews/verifies the listing.
12. Successful verification changes status to Verified.
13. Agent can continue managing/editing the listing and receive applicable
    leads, direct WhatsApp enquiries and viewing requests.

ASSISTED LISTING REQUEST
If customer says:
- "bisa tolong listing-in?";
- "tolong upload untuk saya";
- "can you list it for me?";
- "saya kirim foto kalian yang pasang";
or equivalent:

Tetamo does NOT create or upload the listing on behalf of the agent.

Recommend politely explaining that the agent needs to create the listing
through Tetamo Partner or Agent Dashboard, then provide the listing steps.

Do NOT hand over merely because the customer asks Tetamo to list it for them.

BUYING SIGNALS
HIGH buying signals include:
- customer selects a package;
- asks for payment link;
- asks how/where to pay;
- says they want to proceed;
- says "daftar sekarang";
- asks what happens after payment;
- has started payment;
- reports a payment problem while trying to complete purchase.

MEDIUM buying signals include:
- asks exact package price;
- compares packages;
- gives listing volume for package recommendation;
- asks registration steps;
- asks whether payment is monthly/yearly;
- asks what is included in a specific package.

LOW signals include general curiosity without action.

When buying signal is HIGH:
- stop unnecessary discovery;
- make the next action easy;
- do not restart qualification.

PAYMENT
If package is selected or payment has started:
- focus on payment;
- do not ask experience/listing volume again unless absolutely necessary;
- do not re-sell the package from zero.

Built-in package prices and billing terms are commercial knowledge.

If the customer asks about a general payment METHOD such as QRIS, card,
banking method, payment link mechanics or another platform payment detail that
is not in the built-in package facts, request the appropriate general Tetamo
Knowledge.

OBJECTION TYPES
Identify the REAL concern.

Common objection categories include:

PRICE
Examples:
- "mahal";
- "bayar ya?";
- "berbayar ya?";
- "kemahalan";
- "nggak ada budget".

This is price sensitivity, not automatically rejection.

EXISTING PORTAL / DUPLICATION
Examples:
- "saya sudah pakai Rumah123";
- "sudah pakai 99.co";
- "udah iklan di portal lain".

The concern is whether Tetamo adds enough extra value.

Do not attack competitors.
Use approved Tetamo comparison/differentiator knowledge.

SELF-MARKETING
Examples:
- "kenapa bayar kalau saya bisa post IG sendiri?";
- "saya sudah punya Instagram";
- "bisa post Facebook sendiri".

The concern is perceived additional value.
Use approved Tetamo advertising/comparison facts.

NEW PLATFORM / CREDIBILITY
Examples:
- "Tetamo baru ya?";
- "udah rame?";
- "traffic gimana?";
- "ada proof?";
- "ada testimonial?";
- "ada yang closing?".

The concern is credibility or adoption risk.
Use approved Growth / Proof / Testimonials knowledge.

BUYER AVAILABILITY
Examples:
- "punya buyer?";
- "bisa cariin buyer?";
- "buyer luar negeri ada?";
- "property saya dikirim ke buyer?".

Use approved Buyer / Leads / Matching knowledge.

BUYER QUALITY
Examples:
- "buyer serius gak?";
- "qualified gak?";
- "cuma kepo?";
- "lead berkualitas?".

Never promise serious or qualified buyers.
Use approved Buyer Quality / Lead Expectations knowledge.

PERFORMANCE / GUARANTEE
Examples:
- "jamin dapat lead?";
- "jamin closing?";
- "berapa lama closing?";
- "kalau gak dapat lead gimana?".

Never promise results.
Use approved buyer-quality and performance-boundary facts.

TIMING
Examples:
- "nanti dulu";
- "bulan depan";
- "habis gajian";
- "tunggu listing siap";
- "tanya bos dulu";
- "diskusi partner dulu".

This is not necessarily rejection.
Acknowledge timing and do not pressure.

SOFT VS HARD REJECTION
Soft hesitation is NOT the same as rejection.

Examples of soft hesitation:
- mahal;
- pikir dulu;
- nanti;
- belum yakin;
- tanya partner dulu;
- belum ada budget sekarang.

Do not set pressureLevel="stop" merely for those.

Hard rejection examples:
- tidak tertarik;
- nggak mau;
- jangan hubungi lagi;
- stop;
- unsubscribe;
- hapus nomor saya;
- jangan chat saya lagi.

For hard rejection:
- pressureLevel="stop";
- recommendedObjective="stop_selling";
- shouldAskQuestion=false;
- do not continue pitching.

POLITE CLOSING
Examples:
- makasih;
- thanks;
- oke makasih;
- noted;
- sip;
- baik makasih.

If the customer is merely closing politely:
- do not restart sales;
- do not ask another discovery question;
- acknowledge naturally.

FOLLOW-UP DEPENDENCY
If customer gives a future dependency such as:
- next month;
- after salary;
- after manager approval;
- after partner discussion;
- after property photos;
- after inventory is ready;

record that in the sales reasoning.

Do NOT schedule the follow-up yourself.
Actual 1-hour / 12-hour silence follow-up timing belongs to the
Orchestrator/Scheduler.

LEAD / PERFORMANCE OBJECTIONS
Do NOT automatically answer every performance concern with the same list of:
WhatsApp + Leads Dashboard + Viewing Schedule.

Choose the facts that actually address the customer's concern.

For example:
- buyer database concern -> buyer database/matching facts;
- serious buyer concern -> buyer-quality boundary;
- exposure concern -> marketing/exposure facts;
- competitor concern -> comparison facts;
- proof concern -> testimonials/results facts.

Do not invent performance claims.

MEMORY
Populate doNotAsk for subjects already answered.

Useful fields include:
- customer_type;
- experience;
- listing_count;
- agent_type;
- current_advertising;
- problem;
- package_preference;
- payment_status.

If information is already known from conversation memory, do not ask again.

HANDOVER
Recommend human handover only when genuinely necessary, for example:
- unresolved account-specific payment issue;
- exceptional contract or custom negotiated pricing request outside approved products;
- account-specific problem requiring staff access;
- information unavailable to Mona where human action is required;
- the customer explicitly requests a human/admin conversation.

A normal discount question is a price objection for Sales AI to handle using approved facts;
it is not automatically a handover.

The handover field is advisory reasoning only. Deterministic application code decides
whether Mona is actually paused for a human.

Do not recommend handover merely because:
- customer raises an objection, hesitation or rejection;
- customer asks whether Tetamo is paid;
- customer asks how to list;
- customer asks Tetamo to upload a listing for them;
- customer asks a normal package question;
- customer asks a normal general Tetamo question.

OUTPUT
Return private sales strategy only.

Never write Mona's final customer-facing WhatsApp reply.
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
      "No reliable Agent Sales AI guidance was available, so use the safest conversational path.",
    shouldAskQuestion: false,
    doNotAsk: [],
    pressureLevel: "low",
    recommendedPackage: null,
    packageRecommendationReason: null,
    commercialFacts: [],
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
    .slice(0, 40);
}

function normalizePackageId(value: unknown): AgentPackageId | null {
  const text = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (text === "silver") return "silver";
  if (text === "gold") return "gold";
  if (
    text === "agent_pro" ||
    text === "agentpro" ||
    text === "pro"
  ) {
    return "agent_pro";
  }

  return null;
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
      parsed.knownInformation &&
      typeof parsed.knownInformation === "object"
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
      salesState:
        cleanString(parsed.salesState) || fallback.salesState,
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
      recommendedPackage: normalizePackageId(
        parsed.recommendedPackage
      ),
      packageRecommendationReason: cleanString(
        parsed.packageRecommendationReason
      ),
      // SECURITY / FACT-SAFETY:
      // Commercial facts are NEVER trusted from model output.
      // applyDeterministicAgentSalesGuards() rebuilds them from
      // AGENT_PACKAGES / BOOST_FACTS / SPOTLIGHT_FACTS / fixed flows.
      commercialFacts: [],
      needsTetamoFacts: parsed.needsTetamoFacts === true,
      factsNeeded: cleanStringArray(parsed.factsNeeded),
      // HANDOVER SAFETY:
      // Model-authored handover flags are not authoritative. Deterministic
      // guards below decide whether a human is actually required.
      handoverRecommended: false,
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

    if (
      Number.isFinite(value) &&
      value >= 0 &&
      value <= 5000
    ) {
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

    if (
      Number.isFinite(value) &&
      value > 0 &&
      value <= 80
    ) {
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

function packageForListingCount(
  listingCount: number | null
): AgentPackageId | null {
  if (listingCount === null) return null;

  if (listingCount <= 30) return "silver";
  if (listingCount <= 100) return "gold";
  if (listingCount <= 500) return "agent_pro";

  return null;
}

function includesAny(
  text: string,
  patterns: RegExp[]
) {
  return patterns.some((pattern) => pattern.test(text));
}

function requiresDeterministicHumanHandover(
  message: string
) {
  return includesAny(message, [
    /(?:sudah|udah|telah).{0,20}(?:bayar|transfer).{0,35}(?:belum|nggak|gak|tidak).{0,20}(?:aktif|masuk|tercatat|update|muncul)/i,
    /(?:uang|saldo).{0,15}(?:terpotong|kepotong|deducted|charged).{0,35}(?:belum|nggak|gak|tidak).{0,20}(?:aktif|masuk|tercatat|update|muncul)/i,
    /(?:double|duplicate|dua\s+kali).{0,20}(?:charge|charged|payment|bayar|debit|potong)/i,
    /(?:payment|pembayaran|qris|transfer).{0,25}(?:gagal|error|failed).{0,25}(?:terus|berulang|lagi|still|repeated)/i,
    /(?:akun|account).{0,25}(?:terkunci|locked|suspended|ditangguhkan|disabled)/i,
    /(?:hubungkan|sambungkan|connect).{0,20}(?:admin|cs|customer service|human|orang|staff)/i,
    /(?:mau|ingin|pengen).{0,20}(?:bicara|ngobrol|chat|talk|speak).{0,20}(?:admin|cs|human|staff)/i,
  ]);
}

function relevantCommercialFacts(
  customerMessage: string,
  guidance: AgentSalesGuidance,
  listingCount: number | null
): string[] {
  const message = customerMessage.toLowerCase();
  const facts = new Set<string>();

  const mentionsSilver = /\bsilver\b/i.test(message);
  const mentionsGold = /\bgold\b/i.test(message);
  const mentionsPro =
    /\bagent\s*pro\b|\bagent-pro\b|\bpro\b/i.test(message);

  const asksPackageComparison =
    /\b(?:beda|bedanya|compare|comparison|banding|pilih mana|yang mana)\b/i.test(
      message
    );

  const asksPrice =
    /\b(?:harga|berapa|biaya|price|cost|bayar)\b/i.test(message);

  const asksListings =
    /\b(?:listing|listings|iklan|properti|property)\b/i.test(
      message
    );

  const mentionsBoost = /\bboost\b/i.test(message);
  const mentionsSpotlight =
    /\bspotlight\b|homepage spotlight/i.test(message);

  if (
    mentionsSilver ||
    (asksPackageComparison && mentionsGold)
  ) {
    for (const fact of AGENT_PACKAGES.silver.facts) {
      facts.add(fact);
    }
  }

  if (
    mentionsGold ||
    (asksPackageComparison && (mentionsSilver || mentionsPro))
  ) {
    for (const fact of AGENT_PACKAGES.gold.facts) {
      facts.add(fact);
    }
  }

  if (
    mentionsPro ||
    (asksPackageComparison && mentionsGold)
  ) {
    for (const fact of AGENT_PACKAGES.agent_pro.facts) {
      facts.add(fact);
    }
  }

  if (mentionsBoost) {
    for (const fact of BOOST_FACTS) {
      facts.add(fact);
    }
  }

  if (mentionsSpotlight) {
    for (const fact of SPOTLIGHT_FACTS) {
      facts.add(fact);
    }
  }

  if (
    listingCount !== null &&
    (guidance.recommendedObjective === "recommend_package" ||
      asksPrice ||
      asksListings)
  ) {
    const packageId = packageForListingCount(listingCount);

    if (packageId) {
      for (const fact of AGENT_PACKAGES[packageId].facts) {
        facts.add(fact);
      }
    }
  }

  return Array.from(facts);
}

function applyDeterministicAgentSalesGuards(
  guidance: AgentSalesGuidance,
  params: GenerateAgentSalesGuidanceParams
): AgentSalesGuidance {
  const fullConversation = [
    params.conversationContext || "",
    params.customerMessage || "",
  ].join("\n");

  const latestMessage = String(
    params.customerMessage || ""
  ).trim();

  const known = {
    ...guidance.knownInformation,
  };

  const rememberedListingCount =
    extractKnownListingCount(fullConversation);

  const rememberedExperience =
    extractKnownExperience(fullConversation);

  if (
    known.listingCount === null &&
    rememberedListingCount !== null
  ) {
    known.listingCount = rememberedListingCount;
  }

  if (!known.experience && rememberedExperience) {
    known.experience = rememberedExperience;
  }

  const doNotAsk = new Set(
    guidance.doNotAsk
      .map(canonicalMemoryField)
      .filter(Boolean)
  );

  if (known.experience) doNotAsk.add("experience");

  if (known.listingCount !== null) {
    doNotAsk.add("listing_count");
  }

  if (known.agentType) {
    doNotAsk.add("agent_type");
  }

  if (known.currentAdvertising) {
    doNotAsk.add("current_advertising");
  }

  if (known.problem) {
    doNotAsk.add("problem");
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

  let recommendedObjective =
    guidance.recommendedObjective;

  let recommendedDirection =
    guidance.recommendedDirection;

  let reason = guidance.reason;

  let shouldAskQuestion =
    guidance.shouldAskQuestion;

  let pressureLevel = guidance.pressureLevel;

  let buyingSignal = guidance.buyingSignal;

  let objection = guidance.objection;

  let recommendedPackage =
    guidance.recommendedPackage;

  let packageRecommendationReason =
    guidance.packageRecommendationReason;

  // Final handover authority belongs to deterministic code, never the Sales LLM.
  let handoverRecommended = false;

  let needsTetamoFacts =
    guidance.needsTetamoFacts;

  const factsNeeded = new Set(
    guidance.factsNeeded
  );

  // IMPORTANT: start empty. Never promote model-authored strings to
  // approved commercial truth. Only deterministic code below may add facts.
  const commercialFacts = new Set<string>();

  if (
    /handover|hand over|escalat|human(?: review| assistance| help)|admin(?: review| assistance| help)|staff(?: review| assistance| help)|pass.{0,20}(?:admin|human|staff)/i.test(
      String(recommendedObjective || "") + " " + String(recommendedDirection || "")
    )
  ) {
    recommendedObjective = "answer_current_question";
    recommendedDirection =
      "Handle the customer's normal Agent conversation inside Mona unless a deterministic human-only condition below is actually met.";
    reason =
      "Model-only handover recommendations are not authoritative.";
    shouldAskQuestion = false;
  }

  const hardRejection = includesAny(
    latestMessage,
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
    recommendedObjective = "stop_selling";
    recommendedDirection =
      "Respect the customer's rejection. Do not continue selling or ask another sales question.";
    reason =
      "The customer clearly rejected further sales contact.";
    shouldAskQuestion = false;
    buyingSignal = "low";
    handoverRecommended = false;
  }

  const politeClosing = includesAny(
    latestMessage,
    [
      /^(?:makasih|terima kasih|thanks|thank you|thx|noted|sip|baik|oke makasih|ok makasih)[.! ]*$/i,
    ]
  );

  if (!hardRejection && politeClosing) {
    recommendedObjective = "stop_selling";
    recommendedDirection =
      "Acknowledge the customer's polite closing naturally. Do not restart discovery or add another sales question.";
    reason =
      "The customer is politely ending the current exchange.";
    shouldAskQuestion = false;
  }

  const assistedListingRequest = includesAny(
    latestMessage,
    [
      /(?:bisa|boleh|tolong).{0,35}(?:listing|upload|pasang).{0,25}(?:buat|untuk|property|properti|saya)/i,
      /(?:listing|upload|pasang).{0,35}(?:untuk|buat).{0,15}(?:saya|aku|kami)/i,
      /can\s+you\s+(?:list|upload).{0,30}(?:for\s+me|my\s+property)/i,
      /saya\s+kirim\s+(?:foto|data).{0,30}(?:kalian|tetamo).{0,20}(?:pasang|upload|listing)/i,
    ]
  );

  if (!hardRejection && assistedListingRequest) {
    recommendedObjective = "explain_self_service_listing";
    recommendedDirection =
      "Explain that Tetamo does not create or upload the agent's listing on their behalf. The agent needs to create the listing through Tetamo Partner or Agent Dashboard. Then give the Agent listing steps clearly.";
    reason =
      "The customer is asking Tetamo to create the listing for them, but Agent listings are self-service.";
    shouldAskQuestion = false;

    for (const step of AGENT_LISTING_STEPS) {
      commercialFacts.add(step);
    }
  }

  const asksHowToList = includesAny(
    latestMessage,
    [
      /cara.{0,20}(?:listing|pasang iklan)/i,
      /gimana.{0,20}(?:listing|pasang iklan)/i,
      /bagaimana.{0,20}(?:listing|pasang iklan)/i,
      /how.{0,20}(?:list|upload property|create listing)/i,
      /setelah.{0,20}(?:join|daftar).{0,20}(?:apa|gimana)/i,
    ]
  );

  if (
    !hardRejection &&
    !assistedListingRequest &&
    asksHowToList
  ) {
    recommendedObjective = "explain_listing_steps";
    recommendedDirection =
      "Give the Agent listing process as clear numbered steps. Do not restart discovery.";
    reason =
      "The agent directly asked how to create a listing.";
    shouldAskQuestion = false;

    for (const step of AGENT_LISTING_STEPS) {
      commercialFacts.add(step);
    }
  }

  const asksHowToRegister = includesAny(
    latestMessage,
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
    recommendedObjective = "move_to_registration";
    recommendedDirection =
      "Give the Agent registration steps directly and make the next action easy. Do not restart qualification.";
    reason =
      "The customer directly asked how to register or join as an Agent.";
    shouldAskQuestion = false;
    buyingSignal =
      buyingSignal === "low"
        ? "medium"
        : buyingSignal;

    for (const step of AGENT_REGISTRATION_STEPS) {
      commercialFacts.add(step);
    }
  }

  const selectedPackageMatch =
    latestMessage.match(
      /\b(?:pilih|ambil|mau|choose|take)\s+(silver|gold|agent\s*pro|pro)\b/i
    );

  if (selectedPackageMatch) {
    const selected = normalizePackageId(
      selectedPackageMatch[1]
    );

    if (selected) {
      recommendedPackage = selected;
      known.packageSelected =
        AGENT_PACKAGES[selected].name;

      doNotAsk.add("package_preference");

      recommendedObjective = "move_to_payment";
      recommendedDirection =
        `The customer selected ${AGENT_PACKAGES[selected].name}. Stop discovery and move toward the payment/activation step.`;
      reason =
        "The customer has already selected an Agent package.";
      shouldAskQuestion = false;
      buyingSignal = "high";

      for (const fact of AGENT_PACKAGES[selected].facts) {
        commercialFacts.add(fact);
      }
    }
  }

  const asksOnlyWhetherPaid =
    /^(?:ini\s+)?(?:(?:bayar|berbayar|kena\s+biaya|harus\s+bayar)(?:\s+(?:ya+|kah|kan|gak|nggak|ga|enggak))?|ada\s+(?:fee|biaya)(?:\s+(?:ya+|kah|kan|gak|nggak|ga|enggak))?|is\s+it\s+paid|do\s+i\s+have\s+to\s+pay)[?.! ]*$/i.test(
      latestMessage
    );

  const hasStrongPaymentIntent = includesAny(
    latestMessage,
    [
      /(?:saya|aku|kami|sy)\s+(?:mau|ingin|mo|pengen)\s+(?:bayar|payment|lanjut\s+bayar)/i,
      /(?:mau|ingin|boleh|tolong|kirim|send).{0,20}(?:payment link|link bayar)/i,
      /(?:payment link|link bayar).{0,20}(?:mana|dong|please|pls)/i,
      /(?:cara|gimana|bagaimana|how).{0,20}(?:bayar|payment)/i,
      /(?:qris|rekening|transfer|kartu|card|bank|ewallet|e-wallet).{0,20}(?:mana|bisa|boleh|pakai|gunakan|bayar)/i,
      /(?:sudah|udah|telah).{0,15}(?:bayar|payment|transfer)/i,
      /(?:gagal|error|problem|masalah).{0,20}(?:bayar|payment|qris|transfer)/i,
    ]
  );

  if (!hardRejection && asksOnlyWhetherPaid) {
    recommendedObjective = "answer_current_question";
    recommendedDirection =
      "Answer the customer's fee question directly. Explain that Tetamo Agent membership is paid and provide relevant package information if appropriate. Do not treat this question alone as readiness to pay.";
    reason =
      "The customer is asking whether Tetamo is paid, not yet explicitly asking to complete payment.";
    shouldAskQuestion = false;

    if (buyingSignal === "high") {
      buyingSignal = "medium";
    }
  } else if (!hardRejection && hasStrongPaymentIntent) {
    buyingSignal = "high";

    if (
      recommendedObjective !== "assist_payment_issue"
    ) {
      recommendedObjective = "move_to_payment";
    }

    shouldAskQuestion = false;

    if (
      /\b(?:qris|transfer|rekening|kartu|card|bank|ewallet|e-wallet|payment link|link bayar)\b/i.test(
        latestMessage
      )
    ) {
      needsTetamoFacts = true;

      factsNeeded.add(
        "approved Tetamo payment methods and payment instructions"
      );
    }
  }

  const asksBuyerDatabase = includesAny(
    latestMessage,
    [
      /punya.{0,15}(?:buyer|pembeli)/i,
      /database.{0,10}(?:buyer|pembeli)/i,
      /cariin.{0,10}(?:buyer|pembeli)/i,
      /match.{0,10}(?:buyer|pembeli)/i,
      /buyer.{0,15}(?:luar negeri|international|internasional)/i,
      /kirim.{0,20}(?:property|properti).{0,20}(?:buyer|pembeli)/i,
    ]
  );

  if (!hardRejection && asksBuyerDatabase) {
    needsTetamoFacts = true;
    factsNeeded.add(
      "approved Tetamo buyer database, buyer matching, direct property recommendation and buyer network facts"
    );
  }

  const asksBuyerQuality = includesAny(
    latestMessage,
    [
      /buyer.{0,15}(?:serius|serious|qualified|verified)/i,
      /lead.{0,15}(?:bagus|berkualitas|quality|serius)/i,
      /cuma.{0,10}(?:kepo|tanya)/i,
      /filter.{0,15}(?:buyer|pembeli).{0,15}serius/i,
    ]
  );

  if (!hardRejection && asksBuyerQuality) {
    objection =
      objection || "buyer_quality_concern";
    recommendedObjective = "handle_objection";
    needsTetamoFacts = true;

    factsNeeded.add(
      "approved Tetamo buyer quality, qualification boundaries and lead expectations"
    );
  }

  const asksGuarantee = includesAny(
    latestMessage,
    [
      /jamin.{0,20}(?:lead|closing|jual|sewa|laku)/i,
      /guarantee.{0,20}(?:lead|closing|sale|rent)/i,
      /berapa lama.{0,20}(?:closing|laku|terjual|tersewa)/i,
      /kalau.{0,20}(?:gak|nggak|tidak).{0,15}(?:dapat|dapet).{0,10}lead/i,
    ]
  );

  if (!hardRejection && asksGuarantee) {
    objection =
      objection || "performance_guarantee_concern";
    recommendedObjective = "handle_objection";
    needsTetamoFacts = true;

    factsNeeded.add(
      "approved Tetamo lead expectations, buyer behaviour and no-guarantee boundaries"
    );
  }

  const competitorConcern = includesAny(
    latestMessage,
    [
      /rumah\s*123/i,
      /99\.?co/i,
      /portal lain/i,
      /platform lain/i,
    ]
  );

  if (!hardRejection && competitorConcern) {
    objection =
      objection || "existing_portal_or_comparison";
    recommendedObjective = "handle_objection";
    needsTetamoFacts = true;

    factsNeeded.add(
      "approved Tetamo differentiators, affordability positioning and comparison guidance"
    );
  }

  const selfMarketingConcern = includesAny(
    latestMessage,
    [
      /(?:post|posting|iklan).{0,25}(?:instagram|ig|facebook|fb).{0,25}(?:sendiri|saya sendiri)/i,
      /kenapa.{0,15}bayar.{0,30}(?:instagram|facebook|sosmed|social media)/i,
    ]
  );

  if (!hardRejection && selfMarketingConcern) {
    objection =
      objection || "self_marketing_value_concern";
    recommendedObjective = "handle_objection";
    needsTetamoFacts = true;

    factsNeeded.add(
      "approved Tetamo advertising, marketplace and social media value compared with self-posting"
    );
  }

  const credibilityConcern = includesAny(
    latestMessage,
    [
      /tetamo.{0,10}(?:baru|new)/i,
      /(?:traffic|rame|ramai|user|pengguna).{0,20}tetamo/i,
      /(?:proof|bukti|testimoni|testimonial)/i,
      /ada.{0,20}(?:closing|sold|rented|terjual|tersewa)/i,
    ]
  );

  if (!hardRejection && credibilityConcern) {
    objection =
      objection || "credibility_or_growth_concern";
    recommendedObjective = "handle_objection";
    needsTetamoFacts = true;

    factsNeeded.add(
      "approved Tetamo growth, coverage, traffic, testimonials and results facts"
    );
  }

  const relevantFacts = relevantCommercialFacts(
    latestMessage,
    guidance,
    known.listingCount
  );

  for (const fact of relevantFacts) {
    commercialFacts.add(fact);
  }

  /*
   * GENERIC AGENT PACKAGE OPTIONS
   * -----------------------------
   * A customer may ask for "paket agent", "kirim paketnya", or "package
   * options" without using the word harga. Because model-authored commercial
   * facts are intentionally discarded, supply all canonical Agent package
   * facts deterministically for a neutral package-options request.
   */
  const genericAgentPackageOptionsQuestion =
    /\b(?:paket|package|membership)\b/i.test(
      latestMessage
    ) &&
    !/\b(?:silver|gold|agent\s*pro|agent-pro|boost|spotlight)\b/i.test(
      latestMessage
    ) &&
    !/(?:paket|package).{0,20}(?:cocok|sesuai|recommend|rekomendasi|mana)|(?:cocok|sesuai).{0,20}(?:paket|package)/i.test(
      latestMessage
    );

  if (
    !hardRejection &&
    genericAgentPackageOptionsQuestion
  ) {
    recommendedPackage = null;
    packageRecommendationReason = null;
    recommendedObjective =
      "answer_current_question";
    recommendedDirection =
      "Give the Agent the available Silver, Gold and Agent Pro options using only the canonical commercial facts supplied below. Summarize naturally and do not invent package benefits.";
    reason =
      "The Agent asked to see the available package options. Canonical package facts are supplied deterministically.";
    shouldAskQuestion = false;

    for (const packageId of [
      "silver",
      "gold",
      "agent_pro",
    ] as AgentPackageId[]) {
      for (const fact of
        AGENT_PACKAGES[packageId].facts) {
        commercialFacts.add(fact);
      }
    }
  }

  /*
   * GENERIC AGENT PRICE / FEE QUESTION
   * ----------------------------------
   * A known Agent may ask simply "berapa harganya?", "ada fee?",
   * "bayar ya?" etc. Do not depend on the Sales LLM to author prices.
   * Supply the canonical package prices directly from AGENT_PACKAGES.
   */
  const genericAgentPriceQuestion =
    /\b(?:harga|price|cost|biaya|fee|berapa|berbayar|bayar)\b/i.test(
      latestMessage
    ) &&
    !/\b(?:silver|gold|agent\s*pro|agent-pro|boost|spotlight)\b/i.test(
      latestMessage
    );

  if (
    !hardRejection &&
    genericAgentPriceQuestion
  ) {
    // A generic price question is not a package recommendation request.
    // Do not let a speculative model recommendation narrow the answer.
    recommendedPackage = null;
    packageRecommendationReason = null;
    recommendedObjective = "answer_current_question";
    recommendedDirection =
      "Answer the Agent's price/fee question directly using the canonical Silver, Gold and Agent Pro prices. Do not invent, estimate or change any amount.";
    reason =
      "The Agent asked a generic package price or fee question. Canonical package prices are supplied deterministically.";
    shouldAskQuestion = false;

    commercialFacts.add(AGENT_PACKAGES.silver.facts[0]);
    commercialFacts.add(AGENT_PACKAGES.gold.facts[0]);
    commercialFacts.add(AGENT_PACKAGES.agent_pro.facts[0]);

    // Include the approved monthly Agent Pro alternative too.
    if (AGENT_PACKAGES.agent_pro.facts[1]) {
      commercialFacts.add(AGENT_PACKAGES.agent_pro.facts[1]);
    }
  }

  const asksForPackageRecommendation =
    includesAny(
      latestMessage,
      [
        /paket.{0,20}(?:cocok|sesuai|recommend|rekomendasi)/i,
        /(?:cocok|sesuai).{0,20}paket/i,
        /ambil.{0,15}(?:silver|gold|agent\s*pro|pro).{0,20}(?:atau|or)/i,
        /which.{0,15}package/i,
        /paket.{0,15}mana/i,
      ]
    ) ||
    recommendedObjective === "recommend_package";

  if (
    !hardRejection &&
    asksForPackageRecommendation
  ) {
    if (known.listingCount !== null) {
      const capacityPackage =
        packageForListingCount(
          known.listingCount
        );

      if (capacityPackage) {
        recommendedPackage =
          recommendedPackage ||
          capacityPackage;

        packageRecommendationReason =
          packageRecommendationReason ||
          `${AGENT_PACKAGES[capacityPackage].name} can accommodate approximately ${known.listingCount} active listings based on its listing capacity. Final recommendation may also consider any premium features the agent specifically wants.`;

        recommendedObjective =
          "recommend_package";

        recommendedDirection =
          `Recommend ${AGENT_PACKAGES[recommendedPackage].name} based on the known requirement and explain the relevant package facts. Do not upsell beyond the customer's needs without a clear reason.`;

        shouldAskQuestion = false;

        for (
          const fact of
          AGENT_PACKAGES[recommendedPackage].facts
        ) {
          commercialFacts.add(fact);
        }
      } else if (
        known.listingCount > 500
      ) {
        recommendedObjective =
          "handover";

        recommendedDirection =
          "The agent needs capacity beyond the standard Agent Pro limit of 500 active listings. Recommend human assistance for an appropriate commercial solution.";

        reason =
          "The requested listing volume exceeds the standard Agent package capacities.";

        handoverRecommended = true;
        shouldAskQuestion = false;
      }
    } else {
      recommendedObjective =
        "recommend_package";

      recommendedDirection =
        "Ask one natural question about approximately how many active listings the agent wants to manage, because listing capacity materially affects the package recommendation.";

      reason =
        "Listing volume is not yet known and is useful for choosing between Silver, Gold and Agent Pro.";

      shouldAskQuestion = true;
    }
  }

  if (
    known.problem &&
    recommendedObjective === "understand_problem"
  ) {
    recommendedObjective =
      "explain_relevant_value";

    recommendedDirection =
      "The customer's problem is already known. Address that problem using only relevant approved Tetamo facts instead of asking them to explain it again.";

    reason =
      "The customer's problem is already present in conversation memory.";

    shouldAskQuestion = false;

    needsTetamoFacts = true;

    factsNeeded.add(
      "approved Tetamo facts relevant to the agent's stated problem"
    );
  }

  if (
    !hardRejection &&
    requiresDeterministicHumanHandover(latestMessage)
  ) {
    handoverRecommended = true;
    recommendedObjective = "handover";
    recommendedDirection =
      "A human Tetamo team member is required because this appears to be an account-specific/payment-action issue or the customer explicitly requested a human.";
    reason =
      "Deterministic human-only handover condition matched.";
    shouldAskQuestion = false;
  }

  return {
    ...guidance,
    knownInformation: known,
    buyingSignal,
    objection,
    recommendedObjective,
    recommendedDirection,
    reason,
    shouldAskQuestion,
    doNotAsk: Array.from(doNotAsk),
    pressureLevel,
    recommendedPackage,
    packageRecommendationReason,
    commercialFacts:
      Array.from(commercialFacts).slice(0, 40),
    needsTetamoFacts,
    factsNeeded:
      Array.from(factsNeeded).slice(0, 20),
    handoverRecommended,
  };
}

export async function generateAgentSalesGuidance(
  params: GenerateAgentSalesGuidanceParams
): Promise<AgentSalesGuidance> {
  if (!process.env.OPENAI_API_KEY) {
    return applyDeterministicAgentSalesGuards(
      fallbackGuidance(),
      params
    );
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = `
${AGENT_SALES_PLAYBOOK}

OFFICIAL SALES STAGE:
${params.salesStage || "none"}

MONA BRAIN DIRECTION:
${params.brainRecommendedNextStep || "No additional Brain direction."}

IMPORTANT:
Brain direction is context only.
Do NOT allow campaign wording or an ambiguous short reply to override the
actual established customer role or conversation meaning.

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
  "handoverRecommended": false
}

RULES FOR commercialFacts:
- Include only approved Agent commercial facts actually relevant to this turn.
- Package prices/features come from the built-in Agent Sales knowledge.
- Do not invent commercial facts.
- Do not use commercialFacts for general Tetamo platform facts.

RULES FOR needsTetamoFacts:
- true only when general Tetamo Knowledge is needed.
- false for package price/capacity/features already defined here.

Do not include a WhatsApp reply.
Do not include markdown.
`.trim();

  try {
    const response =
      await openai.responses.create({
        model: "gpt-4.1-mini",
        input: prompt,
        temperature: 0.1,
        max_output_tokens: 850,
      });

    return applyDeterministicAgentSalesGuards(
      parseAgentSalesGuidance(
        String(response.output_text || "")
      ),
      params
    );
  } catch (error) {
    console.error(
      "Tetamo Agent Sales AI guidance failed:",
      error
    );

    return applyDeterministicAgentSalesGuards(
      fallbackGuidance(),
      params
    );
  }
}