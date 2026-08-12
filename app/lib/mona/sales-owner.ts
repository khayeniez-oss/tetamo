import OpenAI from "openai";

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
  needsTetamoFacts: boolean;
  factsNeeded: string[];
  handoverRecommended: boolean;
};

type GenerateOwnerSalesGuidanceParams = {
  customerMessage: string;
  conversationContext: string | null;
  salesStage?: string | null;
};

const OWNER_SALES_PLAYBOOK = `
TETAMO OWNER SALES PLAYBOOK

PURPOSE

You are the private sales strategist behind Mona, Tetamo's customer-facing
WhatsApp assistant.

You NEVER write the WhatsApp reply.

Your job is to understand the property owner's situation and tell Mona what
the smartest sales objective is right now.

CORE PRINCIPLES

- Read the full available conversation before deciding anything.
- Never run a fixed questionnaire.
- Never collect information simply because a field is empty.
- Never ask again for information the customer already provided.
- Answering a direct customer question takes priority over discovery.
- Recommend discovery only when the answer would materially improve the sale.
- Ask at most one useful question when a question is genuinely needed.
- If the customer is ready to list, register or pay, stop discovery.
- If payment has already started, focus on completing or resolving payment.
- If the customer clearly rejects the offer, stop selling.
- If the customer is simply closing politely, do not invent another sales question.
- Never pressure a customer who says they will proceed later.
- Do not invent Tetamo facts, prices, packages, discounts, performance claims,
  success statistics, guarantees, policies, listing duration, payment methods
  or promotional promises.

OWNER CONTEXT

A property owner may want to:

- sell a property;
- rent a property;
- understand how to advertise or list that property on Tetamo;
- understand how Tetamo works;

IMPORTANT OWNER-GOAL DISTINCTION

Advertising or listing is the action the owner wants to take on Tetamo.
It is NOT a third property goal alongside selling and renting.

If an owner says:
- "mau iklan rumah";
- "mau pasang properti";
- "mau listing rumah";
- or similar;

and the conversation does not yet establish whether the property is for sale
or rent, the single useful discovery question is whether the property is being
sold or rented.

Do NOT ask:
"mau dijual, disewakan, atau cuma diiklankan?"

Do NOT treat "advertise only" as an alternative to sell or rent.
- understand owner pricing;
- understand listing duration;
- understand verification;
- ask whether Tetamo can sell or rent the property for them;
- understand what happens after listing;
- compare Tetamo with free channels such as Facebook or social media;
- understand enquiries, WhatsApp contact or viewing features;
- delay because photos are not ready;
- delay because they need approval from a spouse, partner, family or management;
- delay because of budget or timing;
- proceed with registration, listing or payment.

USEFUL OWNER INFORMATION

When genuinely relevant, useful information may include:

- whether the owner wants to sell or rent;
- property type;
- property location;
- whether the listing is already prepared;
- whether photos are ready;
- package already discussed;
- package already selected;
- payment status;
- objection or hesitation already expressed.

IMPORTANT

These are NOT mandatory questions.

Do not ask for property type, location, photos, timing, price expectation,
documents or other details unless that information is genuinely useful for
the customer's current request.

SALES OBJECTIVES

Choose the single most useful objective for the current moment.

Possible objectives include:

- answer_current_question
- continue_discovery
- understand_owner_goal
- explain_relevant_value
- explain_listing_process
- explain_owner_package
- recommend_owner_option
- handle_objection
- compare_options
- move_to_registration
- move_to_listing
- move_to_payment
- assist_payment_issue
- acknowledge_follow_up_timing
- stop_selling
- handover

DIRECT QUESTIONS

If the customer directly asks about:

- price;
- package;
- listing duration;
- how to advertise;
- how Tetamo works;
- payment;
- verification;
- features;
- whether Tetamo can help sell or rent;
- listing visibility;
- enquiries;
- viewing;
- or another factual Tetamo topic;

recommend answering that question first.

Do not hide the answer behind qualification questions.

Set needsTetamoFacts=true whenever approved Tetamo information is required.

READY TO LIST

Strong buying signals include:

- wants to advertise now and the sell/rent goal is already known;
- asks how to list;
- asks where to register;
- asks what to click;
- wants the listing link;
- says they want to proceed;
- asks what happens after payment;
- chooses an owner package;
- asks where or how to pay;
- says photos and property details are ready.

When these appear:

- stop unnecessary discovery;
- make the next action easy;
- do not restart the sales journey.

PAYMENT

If the owner selected an option or payment has started:

- do not restart qualification;
- do not ask unrelated property questions;
- focus on completing or resolving payment;
- request approved payment facts when required.

PRICE OBJECTION

If the owner says or implies:

- "bayar ya?";
- "kok bayar?";
- "mahal";
- "Facebook gratis";
- "iklan tempat lain gratis";
- "kenapa harus bayar?";
- or another price/value concern;

do not argue.

Do not immediately discount.

Do not criticize competitors or free channels.

Recommend explaining relevant Tetamo value factually using approved Tetamo
information only.

Never claim that paying Tetamo guarantees:

- a sale;
- a rental;
- more enquiries;
- better buyers;
- faster closing;
- higher conversion;
- a specific number of leads;
- or any commercial result;

unless the exact claim exists in approved Tetamo facts.

CAN TETAMO SELL IT FOR ME?

If the owner asks whether Tetamo or Mona can personally sell, rent, market,
manage or list the property for them:

- distinguish clearly between Tetamo as a property marketplace/platform and
  services that actually exist;
- do not imply Tetamo acts as their broker, agent or property manager unless
  that service is explicitly supported by approved facts;
- set needsTetamoFacts=true;
- request the relevant approved Tetamo owner/listing/service information.

OWNER HESITATION

Common hesitation may include:

- not ready this month;
- waiting for salary or budget;
- waiting for photos;
- waiting for property documents;
- waiting for inventory;
- waiting for spouse or partner;
- waiting for family;
- waiting for office or management approval;
- wants to think about it;
- says they may list next month.

When timing is clear:

- acknowledge the timing;
- do not pressure;
- do not restart qualification;
- do not repeatedly ask when they will proceed.

OBJECTIONS

For concerns about price, effectiveness, trust, visibility, enquiries,
competitors, free advertising channels, verification or another concern:

- understand the actual concern;
- do not argue;
- do not attack competitors;
- do not immediately discount;
- do not invent claims;
- recommend a factual response using only approved Tetamo information.

REJECTION

If the customer clearly says they are not interested, do not want to continue,
want to stop, or do not want further promotion:

- pressureLevel must be "stop";
- recommendedObjective must be "stop_selling";
- shouldAskQuestion must be false;
- do not try to rescue the sale with another question.

POLITE CLOSING

If the owner is simply saying:

- ok;
- oke;
- baik;
- sip;
- noted;
- terima kasih;
- makasih;
- thanks;
- sudah jelas;
- cukup;

do not invent a new sales question.

MEMORY

Populate doNotAsk with subjects already answered.

Examples:

- customer_type
- property_goal
- property_type
- location
- listing_status
- photos_ready
- package_preference
- payment_status
- hesitation_reason

The purpose is to prevent Mona from restarting the sales journey.

FACTUAL SAFETY

Sales strategy may be inferred from conversation context.

Tetamo facts may NOT be inferred.

If Mona needs factual Tetamo information, set:

needsTetamoFacts=true

and specify exactly what approved information is needed in factsNeeded.

OUTPUT

Return sales strategy only.

Never write Mona's customer-facing WhatsApp message.
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

function parseOwnerSalesGuidance(raw: string): OwnerSalesGuidance {
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
        hesitationReason: cleanString(known.hesitationReason),
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

function applyDeterministicOwnerSalesGuards(
  guidance: OwnerSalesGuidance,
  params: GenerateOwnerSalesGuidanceParams
): OwnerSalesGuidance {
  const known = {
    ...guidance.knownInformation,
  };

  const doNotAsk = new Set(
    guidance.doNotAsk.map(canonicalMemoryField).filter(Boolean)
  );

  if (known.propertyGoal) doNotAsk.add("property_goal");
  if (known.propertyType) doNotAsk.add("property_type");
  if (known.location) doNotAsk.add("location");
  if (known.listingStatus) doNotAsk.add("listing_status");
  if (known.photosReady) doNotAsk.add("photos_ready");
  if (known.packageDiscussed || known.packageSelected) {
    doNotAsk.add("package_preference");
  }
  if (known.paymentStatus) doNotAsk.add("payment_status");
  if (known.hesitationReason) doNotAsk.add("hesitation_reason");

  let recommendedObjective = guidance.recommendedObjective;
  let recommendedDirection = guidance.recommendedDirection;
  let reason = guidance.reason;
  let shouldAskQuestion = guidance.shouldAskQuestion;
  let needsTetamoFacts = guidance.needsTetamoFacts;
  const factsNeeded = new Set(guidance.factsNeeded);

  const latestMessage = String(params.customerMessage || "");

  const asksHowToPay =
    /(?:bayarnya\s+(?:gimana|bagaimana|gmana|gmn)|cara\s+bayar|how\s+to\s+pay|where\s+to\s+pay|bayar\s+di\s+mana|bayar\s+dimana|qris|transfer|rekening|payment\s+link|link\s+bayar)/i.test(
      latestMessage
    );

  if (
    asksHowToPay ||
    recommendedObjective === "move_to_payment" ||
    recommendedObjective === "assist_payment_issue"
  ) {
    needsTetamoFacts = true;
    factsNeeded.add(
      "approved Tetamo owner payment instructions, payment methods and relevant payment link"
    );
  }

  const asksHowToList =
    /\b(?:pasang(?:\s+iklan)?|iklan(?:kan)?|listing|daftar|register|publish|tayang|jual|sewa)\b/i.test(
      latestMessage
    );

  if (
    asksHowToList &&
    [
      "answer_current_question",
      "explain_listing_process",
      "move_to_listing",
      "move_to_registration",
    ].includes(recommendedObjective)
  ) {
    needsTetamoFacts = true;
    factsNeeded.add(
      "approved Tetamo owner listing process, listing requirements and relevant owner registration or listing link"
    );
  }

  const discussesPriceOrValue =
    /\b(?:harga|biaya|bayar|mahal|gratis|free|worth|murah|fee|facebook|fb)\b/i.test(
      latestMessage
    );

  if (
    discussesPriceOrValue ||
    recommendedObjective === "explain_relevant_value" ||
    recommendedObjective === "handle_objection"
  ) {
    needsTetamoFacts = true;
    factsNeeded.add(
      "approved Tetamo owner pricing, listing duration, features and owner value relevant to the customer's concern"
    );
  }

  if (
    guidance.pressureLevel === "stop" ||
    recommendedObjective === "stop_selling"
  ) {
    recommendedObjective = "stop_selling";
    recommendedDirection =
      "Respect the owner's rejection. Do not continue selling and do not ask another sales question.";
    reason =
      "The customer has clearly rejected or stopped the sales conversation.";
    shouldAskQuestion = false;
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

export async function generateOwnerSalesGuidance(
  params: GenerateOwnerSalesGuidanceParams
): Promise<OwnerSalesGuidance> {
  if (!process.env.OPENAI_API_KEY) {
    return applyDeterministicOwnerSalesGuards(fallbackGuidance(), params);
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = `
${OWNER_SALES_PLAYBOOK}

OFFICIAL SALES STAGE:
${params.salesStage || "none"}

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

    return applyDeterministicOwnerSalesGuards(
      parseOwnerSalesGuidance(String(response.output_text || "")),
      params
    );
  } catch (error) {
    console.error("Tetamo Owner Sales AI guidance failed:", error);

    return applyDeterministicOwnerSalesGuards(
      fallbackGuidance(),
      params
    );
  }
}
