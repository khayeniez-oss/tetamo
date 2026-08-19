export type AgentProposalMode =
  | "single"
  | "portfolio";

export type AgentProposalLanguage =
  | "id"
  | "en";

export type AgentProposalAgent = {
  id: string;
  fullName: string;
  agency: string;
  phone: string;
  email: string;
  photoUrl: string;
  address: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  linkedinUrl: string;
};

export type AgentProposalProperty = {
  id: string;
  slug: string;
  kode: string;

  title: string;
  description: string;

  priceText: string;
  listingType: string;
  rentalType: string;
  saleType: string;
  propertyType: string;

  location: string;
  address: string;

  bedrooms: number | null;
  bathrooms: number | null;
  buildingSize: number | null;
  landSize: number | null;
  landUnit: string;

  floors: number | null;
  parking: number | null;

  furnishing: string;
  certificate: string;
  roadAccess: string;
  ownershipType: string;
  landType: string;
  zoningType: string;

  electricity: string;
  water: string;

  facilities: string[];
  nearby: string[];

  images: string[];
  publicUrl: string;
};

export type AgentProposalData = {
  mode: AgentProposalMode;
  language: AgentProposalLanguage;

  buyerName: string;
  buyerCompany: string;
  introduction: string;

  createdAt: string;

  agent: AgentProposalAgent;
  properties: AgentProposalProperty[];
};

export function cleanProposalText(
  value: unknown
) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function proposalNumber(
  value: unknown
): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

export function formatProposalIdr(
  value: unknown
) {
  const amount =
    proposalNumber(value);

  if (
    amount === null ||
    amount <= 0
  ) {
    return "-";
  }

  return new Intl.NumberFormat(
    "id-ID",
    {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }
  ).format(amount);
}

export function buildProposalLocation(
  ...values: unknown[]
) {
  const seen =
    new Set<string>();

  const parts: string[] = [];

  for (const raw of values) {
    const value =
      cleanProposalText(raw);

    if (!value) continue;

    const key =
      value.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    parts.push(value);
  }

  return parts.join(", ");
}

export function humanizeProposalKey(
  value: string
) {
  return value
    .replace(
      /^(fac_|near_|facility_|nearby_)/i,
      ""
    )
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

export function extractEnabledLabels(
  value: unknown
) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return [];
  }

  return Object.entries(
    value as Record<
      string,
      unknown
    >
  )
    .filter(
      ([, enabled]) =>
        enabled === true ||
        enabled === "true" ||
        enabled === 1 ||
        enabled === "1"
    )
    .map(([key]) =>
      humanizeProposalKey(key)
    )
    .filter(Boolean);
}

export function sanitizeProposalFileName(
  value: string
) {
  const cleaned =
    cleanProposalText(value)
      .replace(
        /[^a-zA-Z0-9._-]+/g,
        "-"
      )
      .replace(/-+/g, "-")
      .replace(
        /^-+|-+$/g,
        ""
      );

  return (
    cleaned ||
    "tetamo-property-proposal"
  );
}
