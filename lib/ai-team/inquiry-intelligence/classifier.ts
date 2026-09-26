import "server-only";

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey:
    process.env.OPENAI_API_KEY,
});

const MODEL =
  "gpt-4.1-mini";

export type InquiryClassificationInput = {
  sourceKey: string;
  text: string;
};

export type InquiryClassification = {
  sourceKey: string;

  language:
    | "id"
    | "en"
    | "mixed"
    | "unknown";

  customerType:
    | "agent"
    | "owner"
    | "agency"
    | "developer"
    | "buyer_renter"
    | "unknown";

  inquiryKind:
    | "question"
    | "objection"
    | "pain_point"
    | "confusion"
    | "request"
    | "comparison"
    | "feedback"
    | "other";

  themeKey: string;
  themeTitle: string;
  questionSummary: string;

  contentRelevance: number;
  growthRelevance: number;
  confidence: number;

  contentCandidate: boolean;

  privacyStatus:
    | "sanitized"
    | "review_required"
    | "blocked";

  reason: string;
};

const CLASSIFICATION_SCHEMA = {
  type: "object",

  additionalProperties:
    false,

  properties: {
    signals: {
      type: "array",

      minItems: 1,
      maxItems: 10,

      items: {
        type: "object",

        additionalProperties:
          false,

        properties: {
          source_key: {
            type: "string",
          },

          language: {
            type: "string",
            enum: [
              "id",
              "en",
              "mixed",
              "unknown",
            ],
          },

          customer_type: {
            type: "string",
            enum: [
              "agent",
              "owner",
              "agency",
              "developer",
              "buyer_renter",
              "unknown",
            ],
          },

          inquiry_kind: {
            type: "string",
            enum: [
              "question",
              "objection",
              "pain_point",
              "confusion",
              "request",
              "comparison",
              "feedback",
              "other",
            ],
          },

          theme_key: {
            type: "string",
          },

          theme_title: {
            type: "string",
          },

          question_summary: {
            type: "string",
          },

          content_relevance: {
            type: "integer",
            minimum: 0,
            maximum: 100,
          },

          growth_relevance: {
            type: "integer",
            minimum: 0,
            maximum: 100,
          },

          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },

          content_candidate: {
            type: "boolean",
          },

          privacy_status: {
            type: "string",
            enum: [
              "sanitized",
              "review_required",
              "blocked",
            ],
          },

          reason: {
            type: "string",
          },
        },

        required: [
          "source_key",
          "language",
          "customer_type",
          "inquiry_kind",
          "theme_key",
          "theme_title",
          "question_summary",
          "content_relevance",
          "growth_relevance",
          "confidence",
          "content_candidate",
          "privacy_status",
          "reason",
        ],
      },
    },
  },

  required: [
    "signals",
  ],
} as const;

function asRecord(
  value: unknown
): Record<string, unknown> {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  )
    ? value as Record<
        string,
        unknown
      >
    : {};
}

function cleanString(
  value: unknown
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function numberBetween(
  value: unknown,
  minimum: number,
  maximum: number
) {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed)
  ) {
    return minimum;
  }

  return Math.min(
    maximum,
    Math.max(
      minimum,
      parsed
    )
  );
}

function normalizeThemeKey(
  value: unknown
) {
  return cleanString(value)
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "_"
    )
    .replace(
      /^_+|_+$/g,
      ""
    )
    .slice(0, 120);
}

function canonicalizeThemeKey(
  params: {
    themeKey: string;
    themeTitle: string;
    questionSummary: string;
    sourceText: string;
  }
) {
  const normalizedKey =
    normalizeThemeKey(
      params.themeKey
    );

  /*
   * Original sanitized customer text is authoritative for
   * protected commercial-intent themes.
   *
   * Model-generated titles, summaries and theme keys may
   * describe the signal, but cannot manufacture evidence.
   */
  const sourceText =
    cleanString(
      params.sourceText
    ).toLowerCase();

  /*
   * Tetamo property listing / advertising process.
   *
   * Require the ORIGINAL customer message to contain:
   * - a listing / advertising concept,
   * - a process / how-to concept,
   * - and either property context or explicit Tetamo context.
   *
   * This prevents generic "how does Tetamo work?" messages
   * and model-generated listing labels from being counted
   * as listing-process recurrence.
   */
  const sourceHasListingOrAdvertisingLanguage =
    /\b(listing|list|iklan|advertis[a-z]*|pasang|posting|post|publish|upload)\b/.test(
      sourceText
    );

  const sourceHasListingProcessLanguage =
    /\b(process|proses|step|steps|langkah|cara|bagaimana|gimana|procedure|prosedur|how)\b/.test(
      sourceText
    );

  const sourceHasListingSubject =
    /\b(property|properti|rumah|villa|tanah|unit|apartment|apartemen|tetamo)\b/.test(
      sourceText
    );

  if (
    sourceHasListingOrAdvertisingLanguage &&
    sourceHasListingProcessLanguage &&
    sourceHasListingSubject
  ) {
    return "tetamo_property_listing_process";
  }

  /*
   * Listing-process labels are protected from model-only
   * classification.
   *
   * If the source-grounded rule above did not match, a model
   * key containing listing/advertising + process/steps cannot
   * create or join the canonical listing-process theme.
   */
  const modelClaimsListingOrAdvertising =
    /(listing|advertis[a-z]*|iklan)/.test(
      normalizedKey
    );

  const modelClaimsListingProcess =
    modelClaimsListingOrAdvertising &&
    /(process|steps|procedure)/.test(
      normalizedKey
    );

  if (
    (
      modelClaimsListingOrAdvertising &&
      !sourceHasListingOrAdvertisingLanguage
    ) ||
    (
      modelClaimsListingProcess &&
      !sourceHasListingProcessLanguage
    )
  ) {
    return "";
  }

  /*
   * Value objection:
   *
   * Keep this separate from ordinary fee / commission questions.
   * This requires both a payment/value concept AND a free/social
   * alternative such as Facebook or Instagram.
   */
  if (
    /(pay|payment|fee|cost|charge|bayar|biaya)/.test(
      sourceText
    ) &&
    /(free|gratis|facebook|instagram|social media|sosial media)/.test(
      sourceText
    )
  ) {
    return "pricing_value_objection";
  }

  /*
   * Package selection:
   *
   * Normalize wording such as:
   * - package recommendation
   * - assistance choosing package
   * - which package is suitable
   */
  if (
    /(package|paket)/.test(
      sourceText
    ) &&
    /(choose|choosing|choice|recommend|recommendation|suitable|appropriate|which|help|pilih|memilih|cocok|sesuai)/.test(
      sourceText
    )
  ) {
    return "tetamo_package_selection";
  }

  /*
   * Payment method / bank transfer:
   *
   * Keep this separate from:
   * - package selection
   * - pricing/value objection
   * - general fee/commission questions
   */
  const sourceHasExplicitPaymentLanguage =
    /\b(pay|payment|paid|paying|bayar|bayarnya|membayar|dibayar|pembayaran|pembayarannya)\b/.test(
      sourceText
    );

  const sourceHasPaymentMethodIndicator =
    /\b(method|metode|transfer|bank|account|rekening|qris|card|kartu)\b|how to pay|cara bayar/.test(
      sourceText
    );

  if (
    sourceHasExplicitPaymentLanguage &&
    sourceHasPaymentMethodIndicator
  ) {
    return "tetamo_payment_methods";
  }

  /*
   * Payment timing tied to a completed property sale.
   *
   * Keep this broader than "commission":
   * the source message must itself support payment language
   * and after-sale timing, but does not need to mention
   * commission explicitly.
   */
  const sourceHasPaymentLanguage =
    /\b(pay|payment|paid|bayar|dibayar|pembayaran|fee|biaya)\b/.test(
      sourceText
    );

  const sourceHasBeforeSaleMarker =
    /\b(sebelum|before)\b/.test(
      sourceText
    );

  const sourceHasAfterSaleTiming =
    /(after.{0,20}(sale|sold)|setelah.{0,20}(jual|terjual|laku)|sesudah.{0,20}(jual|terjual|laku)|kalau.{0,20}(terjual|laku)|sudah.{0,20}(terjual|laku))/.test(
      sourceText
    ) ||
    /(pay|payment|paid|paying|bayar|bayarnya|membayar|dibayar|pembayaran|pembayarannya|fee|biaya).{0,25}(baru|nanti|setelah|sesudah|after|then).{0,25}(sold|terjual|laku)/.test(
      sourceText
    );

  if (
    sourceHasPaymentLanguage &&
    sourceHasAfterSaleTiming &&
    !sourceHasBeforeSaleMarker
  ) {
    return "payment_timing_after_sale";
  }

  /*
   * General Tetamo pricing / service cost:
   *
   * Examples:
   * - how much does it cost?
   * - what is the package price?
   * - berapa harga / biaya layanan?
   *
   * Deliberately NOT:
   * - payment method / bank transfer
   * - package selection
   * - free-social-media value objection
   * - commission model
   */
  const sourceHasPricing =
    /(price|pricing|harga|cost|biaya|service fee|package price|how much|berapa\s+(harga|biaya|bayar|harganya|biayanya))/.test(
      sourceText
    );

  const sourceHasServiceContext =
    /(tetamo|package|paket|service|layanan|membership|subscription)/.test(
      sourceText
    );

  const sourceHasPropertyContext =
    /(property|properti|villa|rumah|tanah|apartment|apartemen|unit)/.test(
      sourceText
    );

  /*
   * Tetamo service/package pricing.
   *
   * Requires BOTH:
   * - explicit pricing language in the customer's message, and
   * - explicit Tetamo/service/package context.
   */
  if (
    sourceHasPricing &&
    sourceHasServiceContext &&
    !/(commission|komisi)/.test(
      sourceText
    ) &&
    !/(free|gratis|facebook|instagram|social media|sosial media)/.test(
      sourceText
    ) &&
    !/(transfer|bank|account|rekening|payment method|metode pembayaran)/.test(
      sourceText
    )
  ) {
    return "tetamo_pricing_inquiry";
  }

  /*
   * Property-price inquiries are a different customer need.
   *
   * A property advertisement may legitimately contain words such
   * as "harga" or "price". That alone is not evidence that the
   * customer is asking about a property's price.
   *
   * Require explicit price-question language from the original
   * sanitized source message.
   */
  const sourceAsksPropertyPrice =
    /(berapa\s+(harga|harganya)|harga(nya)?\s+berapa|how much|what(?:'s| is)\s+(the\s+)?price)/.test(
      sourceText
    );

  if (
    sourceHasPropertyContext &&
    sourceAsksPropertyPrice
  ) {
    return "property_price_inquiry";
  }

  /*
   * Do not allow model-only classifications into protected
   * aggregate buckets without supporting source-message evidence.
   *
   * The model may invent new pricing-style keys such as:
   * - pricing_information
   * - property_price_inquiry
   * - service_cost_question
   * - payment_amount_inquiry
   *
   * If source-grounded rules above did not already accept the
   * message, pricing-like model labels are audit-only.
   */
  const modelClaimsPricing =
    /(^|_)(price|pricing|cost|fee|charge|amount|harga|biaya)(_|$)/.test(
      normalizedKey
    );

  if (
    modelClaimsPricing ||
    /^(package_recommendation|assistance_with_package_selection|choosing_appropriate_service_package|tetamo_package_selection)$/.test(
      normalizedKey
    ) ||
    /^(payment_methods|payment_methods_and_account_info|payment_methods_bank_transfer_info|tetamo_payment_methods|payment_timing_after_sale)$/.test(
      normalizedKey
    ) ||
    /^(payment_reason_vs_free_social_media_posting|pricing_value_objection)$/.test(
      normalizedKey
    )
  ) {
    return "";
  }

  return normalizedKey;
}

export function redactInquiryText(
  value: string
) {
  return String(value || "")
    .replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      "[redacted_email]"
    )
    .replace(
      /\bhttps?:\/\/\S+|\bwww\.\S+/gi,
      "[redacted_url]"
    )
    .replace(
      /(?:\+?\d[\d\s().-]{7,}\d)/g,
      "[redacted_number]"
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim()
    .slice(0, 2500);
}

type InquiryClassificationWithoutSourceKey =
  Omit<
    InquiryClassification,
    "sourceKey"
  >;

function classifyGenericInformationRequestOnly(
  value: string
):
  InquiryClassificationWithoutSourceKey |
  null {
  const normalized =
    cleanString(value)
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  if (
    !normalized ||
    normalized.length > 180
  ) {
    return null;
  }

  /*
   * Generic requests such as:
   * - more info
   * - informasi lengkap
   * - details please
   *
   * are not independently useful intelligence unless
   * the source message itself identifies what the
   * customer wants information about.
   */
  const hasGenericInfoRequest =
    /\b(info|informasi|information|detail|details|lengkap|selengkapnya|complete)\b/.test(
      normalized
    );

  if (
    !hasGenericInfoRequest
  ) {
    return null;
  }

  /*
   * If the source itself contains a meaningful business subject,
   * leave classification to the normal classifier.
   */
  const hasExplicitSubject =
    /\b(tetamo|property|properti|villa|rumah|tanah|apartment|apartemen|unit|listing|list|advertis[a-z]*|iklan|post|posting|harga|price|cost|biaya|paket|package|service|layanan|payment|bayar|pembayaran|transfer|bank|rekening|commission|komisi|dokumen|document|notary|notaris|location|lokasi|fasilitas|facility|bedroom|kamar|luas|sertifikat|certificate|leasehold|freehold|deposit|escrow|rent|rental|sewa|sell|sale|sold|jual|owner|pemilik|agent|agen|agency|agensi|developer|pengembang|buyer|pembeli|renter|tenant|penyewa)\b/.test(
      normalized
    );

  if (
    hasExplicitSubject
  ) {
    return null;
  }

  return {
    language:
      "unknown",

    customerType:
      "unknown",

    inquiryKind:
      "request",

    themeKey:
      "",

    themeTitle:
      "Generic information request",

    questionSummary:
      "Customer requests more information without identifying a specific subject.",

    contentRelevance:
      10,

    growthRelevance:
      10,

    confidence:
      1,

    contentCandidate:
      false,

    privacyStatus:
      "sanitized",

    reason:
      "Generic information request without an explicit transferable business subject.",
  };
}

function classifyRoleIdentificationOnly(
  value: string
):
  InquiryClassificationWithoutSourceKey |
  null {
  const normalized =
    cleanString(value)
      .toLowerCase()
      .replace(
        /\bi['’]?m\b/g,
        "i am"
      )
      .replace(
        /[^a-z0-9]+/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  if (
    !normalized ||
    normalized.length > 80
  ) {
    return null;
  }

  /*
   * Conservative deterministic protection.
   *
   * A short message that identifies only the customer's
   * role is not itself evidence of a question, pain point,
   * objection, listing request or content opportunity.
   *
   * If any meaningful action/question intent appears,
   * classification is left to the normal classifier.
   */
  const hasQuestionOrActionIntent =
    /\b(apa|apakah|berapa|bagaimana|gimana|kenapa|mengapa|cara|how|what|why|which|can|could)\b/.test(
      normalized
    ) ||
    /\b(mau|ingin|need|butuh|bantu|help|jual|menjual|sell|sewa|rent|listing|list|advertis[a-z]*|iklan|pasang|upload|publish|post|harga|price|paket|package|komisi|commission|bayar|payment|transfer|bank|dokumen|document)\b/.test(
      normalized
    );

  if (
    hasQuestionOrActionIntent
  ) {
    return null;
  }

  const roleChecks = [
    {
      customerType:
        "owner" as const,

      pattern:
        /\b(owner|pemilik)\b/,
    },

    {
      customerType:
        "agent" as const,

      pattern:
        /\b(agent|agen)\b/,
    },

    {
      customerType:
        "agency" as const,

      pattern:
        /\b(agency|agensi)\b/,
    },

    {
      customerType:
        "developer" as const,

      pattern:
        /\b(developer|pengembang)\b/,
    },

    {
      customerType:
        "buyer_renter" as const,

      pattern:
        /\b(buyer|pembeli|renter|penyewa)\b/,
    },
  ];

  const matches =
    roleChecks.filter(
      (item) =>
        item.pattern.test(
          normalized
        )
    );

  /*
   * Ambiguous multiple-role statements stay with the model.
   */
  if (
    matches.length !== 1
  ) {
    return null;
  }

  const customerType =
    matches[0].customerType;

  const roleLabel =
    customerType ===
      "buyer_renter"
      ? "buyer or renter"
      : customerType;

  return {
    language:
      "unknown",

    customerType,

    inquiryKind:
      "other",

    themeKey:
      "customer_role_identification",

    themeTitle:
      "Customer role identification",

    questionSummary:
      `Customer identifies as ${roleLabel}`,

    contentRelevance:
      0,

    growthRelevance:
      0,

    confidence:
      1,

    contentCandidate:
      false,

    privacyStatus:
      "sanitized",

    reason:
      "Role identification only; no explicit question, action request, objection, pain point, or transferable content signal.",
  };
}

export async function classifyInquiryMessages(
  inputs:
    InquiryClassificationInput[]
): Promise<
  InquiryClassification[]
> {
  if (!inputs.length) {
    return [];
  }

  if (
    inputs.length > 10
  ) {
    throw new Error(
      "Inquiry preview supports at most 10 messages per classification batch."
    );
  }

  const safeInputs =
    inputs.map(
      (input) => ({
        sourceKey:
          cleanString(
            input.sourceKey
          ),

        text:
          redactInquiryText(
            input.text
          ),
      })
    );

  const sourceKeys =
    new Set(
      safeInputs.map(
        (item) =>
          item.sourceKey
      )
    );

  const safeInputBySourceKey =
    new Map(
      safeInputs.map(
        (item) => [
          item.sourceKey,
          item.text,
        ])
    );

  if (
    sourceKeys.size !==
    safeInputs.length
  ) {
    throw new Error(
      "Inquiry classification source keys must be unique."
    );
  }

  const response =
    await openai.responses.create({
      model:
        MODEL,

      text: {
        format: {
          type:
            "json_schema",

          name:
            "tetamo_inquiry_intelligence_preview",

          strict:
            true,

          schema:
            CLASSIFICATION_SCHEMA,
        },
      },

      input: `
You are working inside Tetamo's INTERNAL Inquiry Intelligence system.

This is NOT a customer-facing conversation.

Your job is to identify whether already-saved customer inquiries contain useful anonymized signals for Tetamo's Content, SEO and Growth teams.

IMPORTANT CONTEXT

Tetamo is an Indonesian property marketplace.

Customers may include:
- property agents,
- agencies,
- property owners,
- developers,
- buyers,
- renters.

PRIVACY RULES

Never repeat or preserve:
- a person's name,
- phone number,
- email address,
- account identifier,
- exact private address,
- booking identifier,
- payment identifier,
- private document details,
- URLs that identify the customer.

Some obvious contact data may already have been replaced with [redacted_*].

question_summary and theme_title MUST be anonymized.

If a message cannot be safely transformed into an anonymous business/content signal:
privacy_status = "blocked"
content_candidate = false.

If privacy is ambiguous:
privacy_status = "review_required"
content_candidate = false.

CONTENT INTELLIGENCE

A useful content signal may reveal:
- a recurring customer question,
- confusion about property processes,
- a common objection,
- a pain point,
- a comparison people make,
- something agents or owners repeatedly struggle with,
- buyer/renter education needs,
- a useful FAQ,
- a possible blog/Reel/education/SEO topic.

Do NOT automatically call every customer message a content opportunity.

Usually NOT useful:
- greetings,
- acknowledgements,
- thank-you messages,
- personal appointment details,
- individual payment status,
- account-specific troubleshooting,
- private transaction details,
- contact exchanges,
- media placeholders,
- messages with no transferable educational or business value.

SCORING

content_relevance:
0 = no transferable content value
100 = extremely strong educational/content opportunity

growth_relevance:
0 = no meaningful business/growth signal
100 = strong evidence of customer friction, demand, objection or opportunity

content_candidate should normally be true only when:
- privacy_status = sanitized,
- the topic has genuine transferable value,
- content_relevance is meaningfully strong.

THEME KEY

theme_key must:
- represent the concept, not the wording,
- be lowercase snake_case,
- contain no customer identity,
- be reusable for grouping similar future inquiries.

Examples:
"Does Tetamo charge commission?"
→ tetamo_commission_model

"What documents should I prepare before taking a listing?"
→ agent_listing_documents

"Where does my rental deposit go?"
→ rental_deposit_handling

CUSTOMER TYPE

Infer customer_type only when the text supports it.
Otherwise use "unknown".

Do not invent facts.

MESSAGES

${safeInputs
  .map(
    (item) =>
      [
        `SOURCE_KEY: ${item.sourceKey}`,
        `TEXT: ${item.text}`,
      ].join("\n")
  )
  .join("\n\n")}

Return exactly one signal for every SOURCE_KEY.
`,
    });

  const output =
    response.output_text
      .trim();

  if (!output) {
    throw new Error(
      "Inquiry classifier returned no output."
    );
  }

  let parsed:
    Record<string, unknown>;

  try {
    parsed =
      asRecord(
        JSON.parse(output)
      );
  } catch {
    throw new Error(
      "Inquiry classifier returned invalid JSON."
    );
  }

  const rows =
    Array.isArray(
      parsed.signals
    )
      ? parsed.signals
      : [];

  if (
    rows.length !==
    safeInputs.length
  ) {
    throw new Error(
      "Inquiry classifier did not return exactly one result per source message."
    );
  }

  const results =
    rows.map(
      (raw) => {
        const row =
          asRecord(raw);

        const sourceKey =
          cleanString(
            row.source_key
          );

        if (
          !sourceKeys.has(
            sourceKey
          )
        ) {
          throw new Error(
            "Inquiry classifier returned an unknown source key."
          );
        }

        const sourceText =
          safeInputBySourceKey.get(
            sourceKey
          ) || "";

        const genericInfoOnly =
          classifyGenericInformationRequestOnly(
            sourceText
          );

        /*
         * Generic information requests with no explicit subject
         * remain audit-only and cannot manufacture recurring
         * intelligence themes.
         */
        if (genericInfoOnly) {
          return {
            sourceKey,
            ...genericInfoOnly,
          };
        }

        const roleOnly =
          classifyRoleIdentificationOnly(
            sourceText
          );

        /*
         * The original sanitized message has authority over
         * model inference for this narrow deterministic case.
         */
        if (roleOnly) {
          return {
            sourceKey,
            ...roleOnly,
          };
        }

        const themeTitle =
          cleanString(
            row.theme_title
          );

        const questionSummary =
          cleanString(
            row.question_summary
          );

        const contentRelevance =
          Math.round(
            numberBetween(
              row.content_relevance,
              0,
              100
            )
          );

        const growthRelevance =
          Math.round(
            numberBetween(
              row.growth_relevance,
              0,
              100
            )
          );

        const confidence =
          numberBetween(
            row.confidence,
            0,
            1
          );

        const privacyStatus =
          cleanString(
            row.privacy_status
          ) as
            InquiryClassification["privacyStatus"];

        const themeKey =
          canonicalizeThemeKey({
            themeKey:
              cleanString(
                row.theme_key
              ),
            themeTitle,
            questionSummary,
            sourceText,
          });

        /*
         * Source-grounded metadata overrides.
         *
         * When Tetamo deterministically identifies a theme from
         * the original sanitized customer message, do not allow
         * unsupported model wording or role inference to become
         * stored intelligence.
         */
        const finalThemeTitle =
          themeKey ===
          "payment_timing_after_sale"
            ? "Payment timing after property sale"
            : themeTitle;

        const finalQuestionSummary =
          themeKey ===
          "payment_timing_after_sale"
            ? "Customer asks or objects about payment timing after a property is sold."
            : questionSummary;

        const finalCustomerType:
          InquiryClassification["customerType"] =
            themeKey ===
            "payment_timing_after_sale"
              ? "unknown"
              : (
                  cleanString(
                    row.customer_type
                  ) as
                    InquiryClassification["customerType"]
                );

        /*
         * Deterministic quality gate.
         *
         * The model may recommend content, but it cannot override
         * Tetamo's minimum evidence/privacy standard.
         */
        const contentCandidate =
          row.content_candidate === true &&
          privacyStatus === "sanitized" &&
          contentRelevance >= 70 &&
          confidence >= 0.7;

        return {
          sourceKey,

          language:
            cleanString(
              row.language
            ) as
              InquiryClassification["language"],

          customerType:
            finalCustomerType,

          inquiryKind:
            cleanString(
              row.inquiry_kind
            ) as
              InquiryClassification["inquiryKind"],

          themeKey,
          themeTitle:
            finalThemeTitle,
          questionSummary:
            finalQuestionSummary,
          contentRelevance,
          growthRelevance,
          confidence,
          contentCandidate,
          privacyStatus,

          reason:
            cleanString(
              row.reason
            ),
        };
      }
    );

  const returnedKeys =
    new Set(
      results.map(
        (item) =>
          item.sourceKey
      )
    );

  if (
    returnedKeys.size !==
    sourceKeys.size
  ) {
    throw new Error(
      "Inquiry classifier returned duplicate or missing source keys."
    );
  }

  return results;
}
