import {
  TETAMO_KNOWLEDGE,
  type TetamoKnowledgeSection,
} from "../../data/tetamo-knowledge";
import {
  MONA_CAPABILITIES,
  TETAMO_PRODUCT_FEATURES,
  type TetamoProductAudience,
  type TetamoProductFeature,
} from "../../data/tetamo-product";
import type { MonaBrainDecision } from "./brain";
import type { MonaSalesGuidance } from "./sales-router";

export type MonaKnowledgeStatus =
  | "not_required"
  | "found"
  | "not_found";

export type MonaKnowledgeMatch = {
  section: TetamoKnowledgeSection;
  score: number;
};

export type MonaKnowledgeResult = {
  needed: boolean;
  status: MonaKnowledgeStatus;
  retrievalQuery: string;
  matches: MonaKnowledgeMatch[];
  approvedFactsText: string;
};

type RetrieveMonaKnowledgeParams = {
  // Kept temporarily for orchestrator compatibility.
  // General Tetamo knowledge is no longer retrieved from Supabase.
  supabase?: unknown;
  brain: MonaBrainDecision;
  salesGuidance: MonaSalesGuidance;
  language?: "id" | "en" | "mixed" | "unknown";
};

function normalize(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s:/?.=&_-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function audienceForBrain(
  brain: MonaBrainDecision
): TetamoProductAudience | null {
  if (
    brain.customerType === "agent" ||
    brain.customerType === "agency"
  ) {
    return "agent";
  }

  if (brain.customerType === "owner") {
    return "owner";
  }

  if (brain.customerType === "buyer_renter") {
    return "buyer_renter";
  }

  if (brain.customerType === "developer") {
    return "developer";
  }

  return null;
}

function featureAppliesToAudience(
  feature: TetamoProductFeature,
  audience: TetamoProductAudience | null
) {
  if (feature.audience.includes("all")) return true;
  if (!audience) return true;
  return feature.audience.includes(audience);
}

function featureStatusLabel(
  feature: TetamoProductFeature
) {
  switch (feature.status) {
    case "live":
      return "LIVE NOW";
    case "coming_soon":
      return "COMING SOON";
    case "planned":
      return "PLANNED / NOT LIVE";
    case "retired":
      return "RETIRED / NOT AVAILABLE";
    case "internal_only":
      return "INTERNAL ONLY / DO NOT ADVERTISE";
    case "not_offered":
      return "NOT OFFERED";
    default:
      return String(feature.status);
  }
}

function productFeatureFacts(
  feature: TetamoProductFeature
) {
  return [
    `${feature.name} status: ${featureStatusLabel(feature)}.`,
    feature.summary,
    `Customer value: ${feature.customerValue}`,
    ...feature.facts,
  ];
}

function findProductFeaturesBySubject(
  subject: string | null,
  audience: TetamoProductAudience | null
) {
  const normalizedSubject = normalize(subject || "");

  if (!normalizedSubject) return [];

  return TETAMO_PRODUCT_FEATURES
    .filter((feature) =>
      featureAppliesToAudience(feature, audience)
    )
    .map((feature) => {
      const names = [
        feature.name,
        feature.id.replace(/_/g, " "),
        ...feature.aliases,
      ].map(normalize);

      const score = names.reduce(
        (best, name) => {
          if (!name) return best;
          if (normalizedSubject === name) return Math.max(best, 100);
          if (
            normalizedSubject.includes(name) ||
            name.includes(normalizedSubject)
          ) {
            return Math.max(best, 80);
          }

          const subjectTokens = tokenise(normalizedSubject);
          const nameTokens = tokenise(name);
          const overlap = subjectTokens.filter((token) =>
            nameTokens.includes(token)
          ).length;

          return Math.max(best, overlap * 10);
        },
        0
      );

      return { feature, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.feature);
}

function buildProductTruthSections(
  brain: MonaBrainDecision
): TetamoKnowledgeSection[] {
  const audience = audienceForBrain(brain);
  const intent = brain.intent;
  const sections: TetamoKnowledgeSection[] = [];

  const featureIntents = new Set([
    "platform_features",
    "feature_details",
    "feature_example",
    "feature_availability",
    "how_to_use",
    "competitor_comparison",
    "existing_solution_objection",
  ]);

  if (!featureIntents.has(intent)) {
    if (intent === "how_to_list" || intent === "registration") {
      const relevant = TETAMO_PRODUCT_FEATURES.filter(
        (feature) =>
          ["tetamo_partner", "listing_management"].includes(feature.id) &&
          featureAppliesToAudience(feature, audience)
      );

      if (relevant.length) {
        sections.push({
          id: "product-truth-listing-route",
          title: "Current Tetamo Partner Listing Route",
          description:
            "Current product truth for how agents and owners should start listing.",
          facts: relevant.flatMap(productFeatureFacts),
        });
      }
    }

    return sections;
  }

  if (
    intent === "feature_details" ||
    intent === "feature_example" ||
    intent === "feature_availability" ||
    intent === "how_to_use"
  ) {
    const specific = findProductFeaturesBySubject(
      brain.intentSubject,
      audience
    );

    for (const feature of specific) {
      sections.push({
        id: `product-feature-${feature.id}`,
        title: `${feature.name} — Product Truth`,
        description:
          "Structured Tetamo product truth for one specifically referenced feature.",
        facts: productFeatureFacts(feature),
      });
    }

    if (intent === "feature_example") {
      sections.push({
        id: "mona-feature-demo-capability",
        title: "Mona Feature Explanation and Demo Capability",
        description:
          "Approved boundary for what Mona may promise when a customer asks to see a feature example or demo.",
        facts: [
          `Mona can explain Tetamo features in chat: ${MONA_CAPABILITIES.explain_features ? "yes" : "no"}.`,
          `Mona can send screenshots directly in the current approved capability set: ${MONA_CAPABILITIES.send_screenshot ? "yes" : "no"}.`,
          `Mona can send a feature demo directly in the current approved capability set: ${MONA_CAPABILITIES.send_demo ? "yes" : "no"}.`,
          `Mona can create demo access: ${MONA_CAPABILITIES.create_demo_access ? "yes" : "no"}.`,
          `Mona can arrange a demo with support: ${MONA_CAPABILITIES.arrange_demo ? "yes" : "no"}.`,
          "If the requested media/demo capability is false, Mona must not promise to send screenshots, demos, demo access, or support-arranged demo access. Mona may explain the feature in text using approved facts.",
        ],
      });
    }

    if (specific.length) return sections;
  }

  const relevantFeatures = TETAMO_PRODUCT_FEATURES
    .filter((feature) =>
      featureAppliesToAudience(feature, audience)
    )
    .filter((feature) =>
      feature.status === "live" ||
      feature.status === "coming_soon"
    )
    .sort((a, b) => b.priority - a.priority);

  if (relevantFeatures.length) {
    const live = relevantFeatures.filter(
      (feature) => feature.status === "live"
    );
    const comingSoon = relevantFeatures.filter(
      (feature) => feature.status === "coming_soon"
    );

    const audienceLabel = audience || "relevant customer";

    sections.push({
      id: `product-truth-${audienceLabel}-features`,
      title: `Current Tetamo Product Features for ${audienceLabel}`,
      description:
        "Structured current product truth. Live and coming-soon features are explicitly separated so Mona can evolve with Tetamo without treating roadmap items as live.",
      facts: [
        "LIVE NOW:",
        ...live.flatMap((feature) =>
          productFeatureFacts(feature)
        ),
        ...(comingSoon.length
          ? [
              "COMING SOON — MUST NOT BE DESCRIBED AS LIVE:",
              ...comingSoon.flatMap((feature) =>
                productFeatureFacts(feature)
              ),
            ]
          : []),
      ],
    });
  }

  return sections;
}

const SEARCH_ALIASES: Record<string, string[]> = {
  agent: [
    "agent",
    "agen",
    "marketing property",
    "marketing properti",
    "property sales",
    "sales property",
    "sales properti",
    "agent independent",
    "agen independent",
    "independent agent",
    "agency",
    "agensi",
  ],

  owner: [
    "owner",
    "pemilik",
    "pemilik property",
    "pemilik properti",
    "punya property",
    "punya properti",
    "property saya",
    "properti saya",
    "rumah saya",
    "villa saya",
  ],

  buyer: [
    "buyer",
    "pembeli",
    "calon buyer",
    "calon pembeli",
    "beli property",
    "beli properti",
    "cari property",
    "cari properti",
  ],

  renter: [
    "renter",
    "tenant",
    "penyewa",
    "calon penyewa",
    "sewa property",
    "sewa properti",
  ],

  listing: [
    "listing",
    "iklan",
    "pasang iklan",
    "pasang listing",
    "property listing",
    "listing property",
    "listing properti",
    "properti",
    "property",
    "tayang",
    "publish",
  ],

  self_service_listing: [
    "tolong listing",
    "listing untuk saya",
    "pasang untuk saya",
    "upload untuk saya",
    "bisa kalian listing",
    "can you list it for me",
    "can you upload it for me",
    "kalian yang pasang",
    "tetamo yang pasang",
  ],

  payment: [
    "payment",
    "pay",
    "bayar",
    "pembayaran",
    "qris",
    "bank",
    "transfer",
    "rekening",
    "kartu",
    "card",
    "ewallet",
    "e-wallet",
    "payment link",
    "link bayar",
  ],

  fees: [
    "berbayar",
    "ada fee",
    "ada biaya",
    "bayar ya",
    "bayar gak",
    "bayar nggak",
    "fee tetamo",
    "biaya tetamo",
  ],

  subscription: [
    "subscription",
    "berlangganan",
    "langganan",
    "membership",
    "auto renew",
    "renewal",
    "perpanjang",
    "perpanjangan",
  ],

  cancellation: [
    "cancel",
    "cancellation",
    "batal",
    "batalkan",
    "pembatalan",
    "tutup akun",
    "berhenti",
    "stop subscription",
    "cancel membership",
  ],

  refund: [
    "refund",
    "pengembalian",
    "uang kembali",
    "balikin uang",
    "uang balik",
    "refund membership",
  ],

  commission: [
    "commission",
    "komisi",
    "potong komisi",
    "ambil komisi",
    "fee closing",
    "komisi closing",
    "persen closing",
  ],

  verification: [
    "verification",
    "verified",
    "verify",
    "verifikasi",
    "terverifikasi",
    "pending verification",
    "pending verifikasi",
    "verification badge",
    "verified listing",
  ],

  leads: [
    "lead",
    "leads",
    "inquiry",
    "inquiries",
    "enquiry",
    "enquiries",
    "calon buyer",
    "calon pembeli",
    "lead dashboard",
    "dashboard leads",
  ],

  buyer_matching: [
    "buyer database",
    "database buyer",
    "database pembeli",
    "punya buyer",
    "punya pembeli",
    "cariin buyer",
    "carikan buyer",
    "carikan pembeli",
    "match buyer",
    "matching buyer",
    "buyer matching",
    "kirim property ke buyer",
    "kirim properti ke buyer",
    "recommend property",
    "rekomendasi properti",
    "buyer luar negeri",
    "buyer international",
    "buyer internasional",
    "overseas buyer",
  ],

  buyer_quality: [
    "buyer serius",
    "buyer serious",
    "serious buyer",
    "qualified buyer",
    "buyer qualified",
    "buyer verified",
    "cuma kepo",
    "lead quality",
    "kualitas lead",
    "lead berkualitas",
    "filter buyer serius",
    "jamin lead",
    "jamin closing",
    "guarantee lead",
    "guarantee closing",
    "berapa lama closing",
    "lead bagus",
  ],

  viewing: [
    "viewing",
    "schedule viewing",
    "jadwal viewing",
    "jadwal lihat",
    "lihat property",
    "lihat properti",
    "booking viewing",
    "request viewing",
  ],

  notification: [
    "notification",
    "notifications",
    "notifikasi",
    "push notification",
    "push notif",
    "notif viewing",
  ],

  whatsapp: [
    "whatsapp",
    "wa",
    "chat whatsapp",
    "direct whatsapp",
    "langsung whatsapp",
    "langsung wa",
  ],

  promotion: [
    "promotion",
    "promosi",
    "featured",
    "boost",
    "boost listing",
    "spotlight",
    "homepage spotlight",
    "sundul",
    "disundul",
    "naikin listing",
  ],

  exposure: [
    "exposure",
    "visibility",
    "visibilitas",
    "promosi",
    "marketing",
    "social media",
    "sosmed",
    "instagram",
    "facebook",
    "tiktok",
    "google",
    "search visibility",
  ],

  advertising: [
    "advertising",
    "ads",
    "iklan berbayar",
    "running ads",
    "run ads",
    "social media advertising",
    "instagram ads",
    "facebook ads",
    "meta ads",
    "google ads",
    "posting saja",
    "posting doang",
  ],

  comparison: [
    "beda",
    "bedanya",
    "perbedaan",
    "compare",
    "comparison",
    "dibanding",
    "keunggulan",
    "kelebihan",
    "kenapa tetamo",
    "why tetamo",
    "rumah123",
    "rumah 123",
    "99.co",
    "99 co",
    "portal lain",
    "platform lain",
    "facebook marketplace",
    "posting sendiri",
    "instagram sendiri",
  ],

  growth: [
    "tetamo baru",
    "masih baru",
    "new platform",
    "sudah lama",
    "udah lama",
    "berapa lama",
    "traffic",
    "rame",
    "ramai",
    "user tetamo",
    "pengguna tetamo",
    "berapa user",
    "berapa buyer",
    "berapa agent",
    "berapa agen",
    "growing",
    "berkembang",
    "pertumbuhan",
  ],

  coverage: [
    "cover mana",
    "cover daerah",
    "seluruh indonesia",
    "se-Indonesia",
    "seluruh indonesia",
    "nationwide",
    "cuma bali",
    "hanya bali",
    "luar bali",
    "international",
    "internasional",
    "overseas",
    "luar negeri",
  ],

  proof: [
    "proof",
    "bukti",
    "testimoni",
    "testimonial",
    "review",
    "ada yang closing",
    "sudah closing",
    "pernah closing",
    "sudah sold",
    "sudah rented",
    "sudah terjual",
    "sudah tersewa",
    "contoh sold",
    "contoh rented",
    "hasilnya",
  ],

  registration: [
    "register",
    "registration",
    "daftar",
    "pendaftaran",
    "cara daftar",
    "cara join",
    "join tetamo",
    "sign up",
    "signup",
    "syarat join",
    "syarat daftar",
    "lisensi agent",
    "lisensi agen",
    "independent agent",
    "agency",
  ],

  proposal: [
    "proposal",
    "property proposal",
    "proposal property",
    "proposal properti",
    "portfolio",
    "property portfolio",
    "portfolio property",
    "pdf property",
    "pdf properti",
    "download pdf",
    "kirim portfolio",
    "kirim proposal",
    "share portfolio",
    "share proposal",
  ],

  app: [
    "app",
    "application",
    "aplikasi",
    "partner app",
    "tetamo partner",
    "marketplace app",
    "tetamo marketplace app",
  ],

  support: [
    "support",
    "bantuan",
    "customer service",
    "cs",
    "admin",
    "help",
    "human",
    "orang",
  ],

  platform_boundary: [
    "tetamo yang jual",
    "tetamo jualin",
    "tetamo sewain",
    "tetamo nego",
    "tetamo manage",
    "tetamo kelola",
    "can tetamo sell",
    "can tetamo rent",
    "can tetamo manage",
    "kalian yang jual",
    "kalian yang sewa",
    "property manager",
    "broker",
  ],

  sale: [
    "sale",
    "sell",
    "sold",
    "jual",
    "dijual",
    "terjual",
  ],

  rent: [
    "rent",
    "rental",
    "rented",
    "sewa",
    "disewa",
    "tersewa",
  ],
};

const CHAPTER_QUERY_HINTS: Record<string, string[]> = {
  "who-is-tetamo": [
    "tetamo itu apa",
    "apa itu tetamo",
    "how tetamo works",
    "cara kerja tetamo",
    "tetamo cara kerjanya",
  ],

  "official-tetamo-destinations": [
    "website tetamo",
    "link tetamo",
    "buyer page",
    "owner page",
    "agent signup",
    "developer license",
    "support tetamo",
  ],

  "what-agents-can-do": [
    "agent bisa apa",
    "agen bisa apa",
    "benefit agent",
    "fitur agent",
    "dashboard agent",
  ],

  "what-owners-can-do": [
    "owner bisa apa",
    "pemilik bisa apa",
    "benefit owner",
    "fitur owner",
    "dashboard owner",
  ],

  "what-buyers-renters-can-do": [
    "buyer bisa apa",
    "pembeli bisa apa",
    "penyewa bisa apa",
    "cari property",
    "cari properti",
  ],

  "tetamo-apps": [
    "tetamo partner",
    "marketplace app",
    "aplikasi tetamo",
    "app tetamo",
  ],

  "tetamo-marketing-exposure": [
    "promosi dimana",
    "promosi di mana",
    "social media",
    "sosmed",
    "google",
    "instagram",
    "facebook",
    "tiktok",
    "exposure",
    "visibility",
  ],

  "tetamo-support-contact": [
    "support",
    "bantuan",
    "customer service",
    "admin tetamo",
  ],

  "tetamo-business-model": [
    "ambil komisi",
    "potong komisi",
    "fee closing",
    "tetamo dapat persen",
    "tetamo berbayar",
    "ada fee",
  ],

  "how-agent-listings-work": [
    "cara listing agent",
    "cara listing agen",
    "cara pasang iklan agent",
    "pending verification agent",
  ],

  "how-owner-listings-work": [
    "cara listing owner",
    "cara listing pemilik",
    "cara pasang iklan owner",
    "setelah bayar listing",
  ],

  "listing-verification-statuses": [
    "pending verification",
    "verified",
    "verifikasi listing",
    "listing ditolak",
    "listing rejected",
    "listing paused",
    "listing sold",
    "listing rented",
  ],

  "subscription-cancellation-refund": [
    "cancel membership",
    "cancel subscription",
    "refund",
    "uang kembali",
    "auto renew",
    "perpanjang",
  ],

  "tetamo-promotions-visibility": [
    "boost",
    "spotlight",
    "featured",
    "sundul",
    "homepage",
    "priority listing",
  ],

  "tetamo-platform-limitations": [
    "jamin closing",
    "jamin lead",
    "tetamo nego",
    "tetamo yang jual",
    "guarantee",
    "broker",
    "property manager",
  ],

  "tetamo-buyers-leads-matching": [
    "buyer database",
    "database buyer",
    "punya buyer",
    "cariin buyer",
    "match buyer",
    "buyer matching",
    "kirim property ke buyer",
    "buyer luar negeri",
    "international buyer",
    "leads page",
  ],

  "tetamo-differentiators": [
    "apa bedanya",
    "beda tetamo",
    "keunggulan tetamo",
    "kenapa tetamo",
    "why tetamo",
    "rumah123",
    "99.co",
  ],

  "tetamo-growth-coverage": [
    "tetamo baru",
    "traffic",
    "rame",
    "berapa user",
    "berapa buyer",
    "berapa agent",
    "seluruh indonesia",
    "cuma bali",
    "international",
    "growing",
  ],

  "agent-registration-requirements-capabilities": [
    "syarat agent",
    "syarat agen",
    "cara daftar agent",
    "cara daftar agen",
    "lisensi agent",
    "independent agent",
    "proposal",
    "portfolio",
    "pdf property",
    "push notification",
  ],

  "buyer-quality-lead-expectations": [
    "buyer serius",
    "qualified buyer",
    "buyer verified",
    "cuma kepo",
    "kualitas lead",
    "lead quality",
    "jamin lead",
    "jamin closing",
    "berapa lama closing",
  ],

  "tetamo-comparisons-advertising-objections": [
    "rumah123",
    "99.co",
    "facebook marketplace",
    "posting instagram sendiri",
    "posting facebook sendiri",
    "kenapa bayar",
    "portal lain",
    "platform lain",
    "advertising",
    "running ads",
  ],

  "tetamo-proof-testimonials-results": [
    "testimoni",
    "testimonial",
    "proof",
    "bukti",
    "sudah closing",
    "sudah sold",
    "sudah rented",
    "traffic",
    "hasil",
  ],
};

function tokenise(value: string) {
  return Array.from(
    new Set(
      normalize(value)
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2)
    )
  );
}

function expandSearchTerms(value: string) {
  const normalized = normalize(value);
  const terms = new Set<string>(tokenise(normalized));

  for (const [concept, aliases] of Object.entries(SEARCH_ALIASES)) {
    const matched =
      normalized.includes(concept) ||
      aliases.some((alias) => normalized.includes(normalize(alias)));

    if (!matched) {
      continue;
    }

    terms.add(concept);

    for (const alias of aliases) {
      for (const token of tokenise(alias)) {
        terms.add(token);
      }
    }
  }

  return Array.from(terms).slice(0, 140);
}

function getSalesFactsNeeded(
  salesGuidance: MonaSalesGuidance
): string[] {
  const guidance = salesGuidance.guidance;

  if (!guidance || !guidance.needsTetamoFacts) {
    return [];
  }

  return Array.isArray(guidance.factsNeeded)
    ? guidance.factsNeeded
    : [];
}

function buildRetrievalQuery(
  brain: MonaBrainDecision,
  salesGuidance: MonaSalesGuidance
) {
  const explicitFactRequests = [
    ...brain.knowledgeRequest,
    ...getSalesFactsNeeded(salesGuidance),
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  /*
   * Knowledge does not reinterpret the customer.
   *
   * Brain already recovered Indonesian WhatsApp shorthand and resolved
   * the customer's meaning. Use Brain's normalized wording and semantic
   * interpretation only as retrieval signals.
   *
   * Explicit Knowledge requests from Brain / Sales are included first so
   * they remain the strongest description of what factual information is
   * actually required.
   */
  const semanticContext = [
    `Intent: ${brain.intent}`,
    brain.intentSubject
      ? `Intent subject: ${brain.intentSubject}`
      : "",
    brain.normalizedMessage,
    brain.latestMeaning,
    brain.directQuestion || "",
    brain.customerType !== "unknown"
      ? `Customer type: ${brain.customerType}`
      : "",
    ...brain.knownContext.importantFacts,
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  return Array.from(
    new Set([
      ...explicitFactRequests,
      ...semanticContext,
    ])
  ).join("\n");
}

function scoreSection(
  retrievalQuery: string,
  section: TetamoKnowledgeSection
) {
  const query = normalize(retrievalQuery);
  const terms = expandSearchTerms(retrievalQuery);

  const id = normalize(section.id);
  const title = normalize(section.title);
  const description = normalize(section.description);
  const facts = normalize(section.facts.join(" "));

  let score = 0;

  if (query.includes(title) && title.length >= 4) {
    score += 30;
  }

  if (query.includes(id.replace(/-/g, " "))) {
    score += 24;
  }

  for (const term of terms) {
    if (term.length < 2) {
      continue;
    }

    if (id.includes(term)) {
      score += 5;
    }

    if (title.includes(term)) {
      score += 6;
    }

    if (description.includes(term)) {
      score += 3;
    }

    if (facts.includes(term)) {
      score += 2;
    }
  }

  const chapterHints = CHAPTER_QUERY_HINTS[section.id] || [];

  for (const hint of chapterHints) {
    const normalizedHint = normalize(hint);

    if (!normalizedHint) {
      continue;
    }

    if (query.includes(normalizedHint)) {
      score += 18;
      continue;
    }

    const hintTokens = tokenise(normalizedHint);

    if (
      hintTokens.length >= 2 &&
      hintTokens.every((token) => query.includes(token))
    ) {
      score += 10;
    }
  }

  return score;
}

function chooseMatches(
  retrievalQuery: string
): MonaKnowledgeMatch[] {
  const ranked = TETAMO_KNOWLEDGE
    .map((section) => ({
      section,
      score: scoreSection(retrievalQuery, section),
    }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) {
    return [];
  }

  const bestScore = ranked[0].score;

  const minimumRelevantScore = Math.max(
    6,
    Math.floor(bestScore * 0.45)
  );

  return ranked
    .filter((match) => match.score >= minimumRelevantScore)
    .slice(0, 4);
}

function formatApprovedFacts(
  matches: MonaKnowledgeMatch[]
) {
  if (!matches.length) {
    return "";
  }

  const sections = matches.map(({ section }) => {
    return [
      `TETAMO KNOWLEDGE SECTION: ${section.title}`,
      `Purpose: ${section.description}`,
      ...section.facts.map((fact) => `- ${fact}`),
    ].join("\n");
  });

  return [
    "APPROVED HARDCODED TETAMO KNOWLEDGE",
    "",
    ...sections,
    "",
    "KNOWLEDGE BOUNDARY:",
    "- The information above is approved Tetamo factual information.",
    "- If a requested Tetamo fact is not stated above, it is unknown or unverified for this reply.",
    "- Absence of a fact does NOT mean Tetamo does not provide, support, or have that feature.",
    "- Never turn missing knowledge into a negative claim.",
  ].join("\n");
}

/**
 * Tetamo Knowledge Retriever
 *
 * RESPONSIBILITY:
 * - retrieve approved general Tetamo facts only;
 * - use Brain / Sales requests as retrieval instructions;
 * - return factual material to downstream reasoning / Writer.
 *
 * NON-RESPONSIBILITIES:
 * - do not reinterpret customer language;
 * - do not identify customer role;
 * - do not choose Agent or Owner packages;
 * - do not create sales strategy;
 * - do not decide human handover.
 *
 * Missing knowledge is returned as status="not_found". It is not, by itself,
 * a reason to pause Mona or send the conversation to Admin.
 */
export async function retrieveMonaKnowledge(
  params: RetrieveMonaKnowledgeParams
): Promise<MonaKnowledgeResult> {
  const salesFactsNeeded = getSalesFactsNeeded(
    params.salesGuidance
  );

  const needed =
    params.brain.factualKnowledgeNeeded ||
    params.brain.knowledgeRequest.length > 0 ||
    salesFactsNeeded.length > 0;

  const retrievalQuery = buildRetrievalQuery(
    params.brain,
    params.salesGuidance
  );

  if (!needed || !retrievalQuery) {
    return {
      needed: false,
      status: "not_required",
      retrievalQuery,
      matches: [],
      approvedFactsText: "",
    };
  }

  const productTruthSections =
    buildProductTruthSections(params.brain);

  const productMatches: MonaKnowledgeMatch[] =
    productTruthSections.map((section, index) => ({
      section,
      score: 1000 - index,
    }));

  /*
   * For a specifically referenced product feature, the structured Product Truth
   * section is authoritative for that feature's current status and capability.
   * Do not append broad legacy chapters here: a roadmap chapter can contain
   * several other feature statuses (for example, Proposal LIVE + Inventory/LOI
   * COMING SOON + Notary NOT OFFERED), which can contaminate Writer status
   * decisions for the one feature the customer actually asked about.
   */
  const hasSpecificProductTruth = productTruthSections.some((section) =>
    section.id.startsWith("product-feature-")
  );

  const legacyMatches = hasSpecificProductTruth
    ? []
    : chooseMatches(retrievalQuery);

  const seen = new Set<string>();
  const matches = [
    ...productMatches,
    ...legacyMatches,
  ]
    .filter((match) => {
      if (seen.has(match.section.id)) return false;
      seen.add(match.section.id);
      return true;
    })
    .slice(0, 6);

  if (!matches.length) {
    return {
      needed: true,
      status: "not_found",
      retrievalQuery,
      matches: [],
      approvedFactsText: "",
    };
  }

  return {
    needed: true,
    status: "found",
    retrievalQuery,
    matches,
    approvedFactsText: formatApprovedFacts(matches),
  };
}
