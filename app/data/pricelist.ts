export type OwnerPackage = {
  id: string;
  name: string;
  nameEn: string;
  audience: "owner";
  productType: "listing";

  priceIdr: number;
  durationDays: number;
  maxListings: number;
  renewable: boolean;
  autoRenewDefault: boolean;

  isFeatured: boolean;
  featuredDurationDays?: number;
  downgradeToBasicAfterFeatured?: boolean;

  badge?: string;
  badgeEn?: string;

  hasSocialMediaBoost: boolean;
  hasVerificationBadge: boolean;
  hasAgentSupport: boolean;
  hasDirectWhatsapp: boolean;
  hasScheduling: boolean;

  paymentTitle: string;
  paymentTitleEn: string;
  paymentDescription: string;
  paymentDescriptionEn: string;
  renewalLabel: string;
  renewalLabelEn: string;
  billingNote: string;
  billingNoteEn: string;

  features: string[];
  featuresEn: string[];
};

export const OWNER_PACKAGES: OwnerPackage[] = [
  {
    id: "basic",
    name: "Basic Listing",
    nameEn: "Basic Listing",
    audience: "owner",
    productType: "listing",

    priceIdr: 150000,
    durationDays: 60,
    maxListings: 1,
    renewable: true,
    autoRenewDefault: true,

    isFeatured: false,
    featuredDurationDays: 0,
    downgradeToBasicAfterFeatured: false,

    badge: undefined,
    badgeEn: undefined,

    hasSocialMediaBoost: false,
    hasVerificationBadge: false,
    hasAgentSupport: false,
    hasDirectWhatsapp: true,
    hasScheduling: true,

    paymentTitle: "Basic Listing",
    paymentTitleEn: "Basic Listing",
    paymentDescription:
      "Paket listing standar untuk pemilik yang ingin menampilkan 1 properti aktif di marketplace TETAMO selama 60 hari.",
    paymentDescriptionEn:
      "A standard listing package for owners who want to display 1 active property on the TETAMO marketplace for 60 days.",
    renewalLabel: "Perpanjang Basic Listing",
    renewalLabelEn: "Renew Basic Listing",
    billingNote:
      "Listing akan aktif selama 60 hari dan diperpanjang otomatis kecuali Anda menonaktifkan auto renew dari dashboard.",
    billingNoteEn:
      "The listing will stay active for 60 days and renew automatically unless you disable auto renew from the dashboard.",

    features: [
      "1 Listing Aktif",
      "Durasi aktif 60 hari",
      "Direct WhatsApp (Buyer/Renter contact langsung)",
      "Tampil di Tetamo Marketplace & App",
      "Jadwal Scheduling Viewing",
      "Auto renew aktif secara default",
    ],
    featuresEn: [
      "1 Active Listing",
      "60-day active duration",
      "Direct WhatsApp (direct buyer/renter contact)",
      "Visible on Tetamo Marketplace & App",
      "Viewing scheduling",
      "Auto renew enabled by default",
    ],
  },
  {
    id: "featured",
    name: "Featured Listing",
    nameEn: "Featured Listing",
    audience: "owner",
    productType: "listing",

    priceIdr: 550000,
    durationDays: 60,
    maxListings: 1,
    renewable: true,
    autoRenewDefault: true,

    isFeatured: true,
    featuredDurationDays: 30,
    downgradeToBasicAfterFeatured: true,

    badge: "FEATURED",
    badgeEn: "FEATURED",

    hasSocialMediaBoost: true,
    hasVerificationBadge: true,
    hasAgentSupport: true,
    hasDirectWhatsapp: true,
    hasScheduling: true,

    paymentTitle: "Featured Listing",
    paymentTitleEn: "Featured Listing",
    paymentDescription:
      "Paket premium untuk pemilik yang ingin mendapatkan visibilitas lebih tinggi. Listing aktif total 60 hari, dengan status featured selama 30 hari pertama.",
    paymentDescriptionEn:
      "A premium package for owners who want higher visibility. The listing stays active for 60 days in total, with featured status for the first 30 days.",
    renewalLabel: "Perpanjang Featured Listing",
    renewalLabelEn: "Renew Featured Listing",
    billingNote:
      "Featured berlaku 30 hari. Setelah itu listing otomatis turun menjadi Basic hingga hari ke-60. Auto renew aktif secara default kecuali dimatikan dari dashboard.",
    billingNoteEn:
      "Featured status applies for 30 days. After that, the listing automatically downgrades to Basic until day 60. Auto renew is enabled by default unless turned off from the dashboard.",

    features: [
      "1 Listing Aktif",
      "Listing aktif total 60 hari",
      "Featured / highlighted selama 30 hari",
      "Direct WhatsApp (Buyer/Renter contact langsung)",
      "Tampil di Tetamo Marketplace & App",
      "Posting di Social Media (FB / IG / TikTok)",
      "Jadwal Scheduling Viewing",
      "Verification Badge",
      "Tetamo Agent Support",
      "Auto renew aktif secara default",
    ],
    featuresEn: [
      "1 Active Listing",
      "Listing active for 60 days in total",
      "Featured / highlighted for 30 days",
      "Direct WhatsApp (direct buyer/renter contact)",
      "Visible on Tetamo Marketplace & App",
      "Posted on Social Media (FB / IG / TikTok)",
      "Viewing scheduling",
      "Verification Badge",
      "Tetamo Agent Support",
      "Auto renew enabled by default",
    ],
  },
];

export type AgentPackage = {
  id: string;
  name: string;
  nameEn: string;
  audience: "agent";
  productType: "membership";

  billingCycle: "monthly" | "yearly";
  availableBillingCycles: Array<"monthly" | "yearly">;

  priceIdr: number;
  durationDays: number;

  renewable: boolean;
  autoRenewDefault: boolean;

  packageTermDays: number;
  billingIntervalDays: number;
  cancelStopsFutureRenewalOnly: boolean;
  monthlyPriceIdr?: number;
  monthlyCommitmentMonths?: number;
  monthlyBillingNote?: string;
  monthlyBillingNoteEn?: string;

  maxListings: number;
  maxFeaturedListings: number;

  hasProfileWebsite: boolean;
  hasAiAvatar: boolean;
  hasSocialMediaPromotion: boolean;
  hasBuyerRecommendation: boolean;
  hasAdminSupport: boolean;

  hasSocialMediaIntegration: boolean;
  hasViewingSchedule: boolean;
  hasLeadsDashboard: boolean;
  hasBillingAccess: boolean;
  hasAnalyticsInsights: boolean;
  hasCommissionTracking: boolean;
  hasBoostSpotlightAccess: boolean;
  hasFeaturedAgentPlacement: boolean;
  featuredAgentSlotsLimit?: number;

  paymentTitle: string;
  paymentTitleEn: string;
  paymentDescription: string;
  paymentDescriptionEn: string;
  renewalLabel: string;
  renewalLabelEn: string;
  billingNote: string;
  billingNoteEn: string;

  features: string[];
  featuresEn: string[];
};

export const AGENT_PACKAGES: AgentPackage[] = [
  {
    id: "silver",
    name: "Silver",
    nameEn: "Silver",
    audience: "agent",
    productType: "membership",

    billingCycle: "yearly",
    availableBillingCycles: ["yearly"],

    priceIdr: 499000,
    durationDays: 365,
    renewable: true,
    autoRenewDefault: true,

    packageTermDays: 365,
    billingIntervalDays: 365,
    cancelStopsFutureRenewalOnly: true,

    maxListings: 30,
    maxFeaturedListings: 0,

    hasProfileWebsite: true,
    hasAiAvatar: false,
    hasSocialMediaPromotion: false,
    hasBuyerRecommendation: false,
    hasAdminSupport: false,

    hasSocialMediaIntegration: true,
    hasViewingSchedule: true,
    hasLeadsDashboard: true,
    hasBillingAccess: true,
    hasAnalyticsInsights: true,
    hasCommissionTracking: true,
    hasBoostSpotlightAccess: true,
    hasFeaturedAgentPlacement: false,

    paymentTitle: "Silver Membership - Yearly",
    paymentTitleEn: "Silver Membership - Yearly",
    paymentDescription:
      "Paket tahunan untuk agen properti yang ingin mulai tampil profesional, mengelola listing aktif, leads, viewing, billing, dan insight dalam satu dashboard TETAMO.",
    paymentDescriptionEn:
      "A yearly package for property agents who want to build a professional presence and manage active listings, leads, viewings, billing, and insights in one TETAMO dashboard.",
    renewalLabel: "Perpanjang Silver Membership",
    renewalLabelEn: "Renew Silver Membership",
    billingNote:
      "Membership aktif selama 1 tahun dan diperpanjang otomatis secara tahunan kecuali Anda menonaktifkan auto renew dari dashboard. Jika auto renew dimatikan, membership tetap aktif hingga akhir masa aktif saat ini.",
    billingNoteEn:
      "The membership stays active for 1 year and renews automatically on a yearly basis unless you disable auto renew from the dashboard. If auto renew is turned off, the membership stays active until the end of the current term.",

    features: [
      "30 Listing Aktif",
      "Membership aktif selama 1 tahun",
      "Website Profil Agen",
      "Integrasi Media Sosial",
      "Dashboard Leads",
      "Jadwal Viewing",
      "Paket & Tagihan",
      "Pembayaran / Receipt",
      "Analytics / Insights",
      "Tracking Komisi",
      "Akses Boost & Spotlight",
      "Auto renew aktif secara default",
    ],
    featuresEn: [
      "30 Active Listings",
      "Membership active for 1 year",
      "Agent Profile Website",
      "Social Media Integration",
      "Leads Dashboard",
      "Viewing Schedule",
      "Packages & Billing",
      "Payments / Receipts",
      "Analytics / Insights",
      "Commission Tracking",
      "Boost & Spotlight Access",
      "Auto renew enabled by default",
    ],
  },
  {
    id: "gold",
    name: "Gold",
    nameEn: "Gold",
    audience: "agent",
    productType: "membership",

    billingCycle: "yearly",
    availableBillingCycles: ["yearly"],

    priceIdr: 1800000,
    durationDays: 365,
    renewable: true,
    autoRenewDefault: true,

    packageTermDays: 365,
    billingIntervalDays: 365,
    cancelStopsFutureRenewalOnly: true,

    maxListings: 100,
    maxFeaturedListings: 3,

    hasProfileWebsite: true,
    hasAiAvatar: true,
    hasSocialMediaPromotion: true,
    hasBuyerRecommendation: false,
    hasAdminSupport: false,

    hasSocialMediaIntegration: true,
    hasViewingSchedule: true,
    hasLeadsDashboard: true,
    hasBillingAccess: true,
    hasAnalyticsInsights: true,
    hasCommissionTracking: true,
    hasBoostSpotlightAccess: true,
    hasFeaturedAgentPlacement: false,

    paymentTitle: "Gold Membership - Yearly",
    paymentTitleEn: "Gold Membership - Yearly",
    paymentDescription:
      "Paket tahunan untuk agen aktif yang ingin branding lebih kuat, prioritas visibilitas listing, dan fitur marketing tambahan di TETAMO.",
    paymentDescriptionEn:
      "A yearly package for active agents who want stronger branding, better listing visibility priority, and additional marketing features on TETAMO.",
    renewalLabel: "Perpanjang Gold Membership",
    renewalLabelEn: "Renew Gold Membership",
    billingNote:
      "Membership aktif selama 1 tahun dan diperpanjang otomatis secara tahunan kecuali Anda menonaktifkan auto renew dari dashboard. Jika auto renew dimatikan, membership tetap aktif hingga akhir masa aktif saat ini.",
    billingNoteEn:
      "The membership stays active for 1 year and renews automatically on a yearly basis unless you disable auto renew from the dashboard. If auto renew is turned off, the membership stays active until the end of the current term.",

    features: [
      "100 Listing Aktif",
      "Membership aktif selama 1 tahun",
      "Website Profil Agen",
      "Integrasi Media Sosial",
      "Dashboard Leads",
      "Jadwal Viewing",
      "Paket & Tagihan",
      "Pembayaran / Receipt",
      "Analytics / Insights",
      "Tracking Komisi",
      "Akses Boost & Spotlight",
      "1 AI Avatar Video Perkenalan",
      "3 Listing Unggulan Gratis (90 hari masing-masing)",
      "Prioritas visibilitas listing",
      "Auto renew aktif secara default",
    ],
    featuresEn: [
      "100 Active Listings",
      "Membership active for 1 year",
      "Agent Profile Website",
      "Social Media Integration",
      "Leads Dashboard",
      "Viewing Schedule",
      "Packages & Billing",
      "Payments / Receipts",
      "Analytics / Insights",
      "Commission Tracking",
      "Boost & Spotlight Access",
      "1 AI Avatar Introduction Video",
      "3 Free Featured Listings (90 days each)",
      "Priority listing visibility",
      "Auto renew enabled by default",
    ],
  },
  {
    id: "agent-pro",
    name: "Agent Pro",
    nameEn: "Agent Pro",
    audience: "agent",
    productType: "membership",

    billingCycle: "yearly",
    availableBillingCycles: ["yearly", "monthly"],

    priceIdr: 3999000,
    durationDays: 365,
    renewable: true,
    autoRenewDefault: true,

    packageTermDays: 365,
    billingIntervalDays: 365,
    cancelStopsFutureRenewalOnly: true,
    monthlyPriceIdr: 399000,
    monthlyCommitmentMonths: 12,
    monthlyBillingNote:
      "Tersedia opsi bayar bulanan dengan komitmen 12 bulan. Membership tetap aktif untuk 1 tahun penuh. Jika auto renew dimatikan, renewal berikutnya akan berhenti setelah masa komitmen berakhir.",
    monthlyBillingNoteEn:
      "A monthly payment option is available with a 12-month commitment. The membership remains active for a full year. If auto renew is turned off, the next renewal will stop after the commitment period ends.",

    maxListings: 500,
    maxFeaturedListings: 3,

    hasProfileWebsite: true,
    hasAiAvatar: true,
    hasSocialMediaPromotion: true,
    hasBuyerRecommendation: false,
    hasAdminSupport: false,

    hasSocialMediaIntegration: true,
    hasViewingSchedule: true,
    hasLeadsDashboard: true,
    hasBillingAccess: true,
    hasAnalyticsInsights: true,
    hasCommissionTracking: true,
    hasBoostSpotlightAccess: true,
    hasFeaturedAgentPlacement: true,
    featuredAgentSlotsLimit: 7,

    paymentTitle: "Agent Pro Membership",
    paymentTitleEn: "Agent Pro Membership",
    paymentDescription:
      "Paket tahunan premium untuk agen serius dan agensi yang ingin skala lebih besar, prioritas placement premium, dan opsi bayar bulanan dengan komitmen 12 bulan.",
    paymentDescriptionEn:
      "A premium yearly package for serious agents and agencies that want to scale bigger, get premium placement priority, and use a monthly payment option with a 12-month commitment.",
    renewalLabel: "Perpanjang Agent Pro Membership",
    renewalLabelEn: "Renew Agent Pro Membership",
    billingNote:
      "Membership aktif selama 1 tahun. Tersedia pembayaran tahunan penuh atau pembayaran bulanan dengan komitmen 12 bulan. Auto renew aktif secara default kecuali Anda menonaktifkan auto renew dari dashboard. Jika auto renew dimatikan, membership tetap aktif hingga akhir masa aktif / komitmen saat ini.",
    billingNoteEn:
      "The membership stays active for 1 year. Full yearly payment or monthly payment with a 12-month commitment is available. Auto renew is enabled by default unless you disable it from the dashboard. If auto renew is turned off, the membership remains active until the end of the current term / commitment.",

    features: [
      "500 Listing Aktif",
      "Membership aktif selama 1 tahun",
      "Website Profil Agen",
      "Integrasi Media Sosial",
      "Dashboard Leads",
      "Jadwal Viewing",
      "Paket & Tagihan",
      "Pembayaran / Receipt",
      "Analytics / Insights",
      "Tracking Komisi",
      "Akses Boost & Spotlight",
      "1 AI Avatar Video Perkenalan",
      "3 Listing Unggulan Gratis (90 hari masing-masing)",
      "Eligible untuk penempatan Agen Unggulan",
      "Kesempatan eksposur premium di platform",
      "Slot Agen Unggulan terbatas (7 agen)",
      "Tersedia opsi bayar bulanan",
      "Auto renew aktif secara default",
    ],
    featuresEn: [
      "500 Active Listings",
      "Membership active for 1 year",
      "Agent Profile Website",
      "Social Media Integration",
      "Leads Dashboard",
      "Viewing Schedule",
      "Packages & Billing",
      "Payments / Receipts",
      "Analytics / Insights",
      "Commission Tracking",
      "Boost & Spotlight Access",
      "1 AI Avatar Introduction Video",
      "3 Free Featured Listings (90 days each)",
      "Eligible for Featured Agent placement",
      "Premium exposure opportunity on the platform",
      "Limited Featured Agent slots (7 agents)",
      "Monthly payment option available",
      "Auto renew enabled by default",
    ],
  },
];

export type AddOnProduct = {
  id: string;
  name: string;
  nameEn: string;
  audience: "owner" | "agent" | "all";
  productType: "addon";

  priceIdr: number;
  durationDays: number;
  renewable: boolean;
  autoRenewDefault: boolean;

  badge?: string;
  badgeEn?: string;
  placement: "marketplace" | "homepage";

  paymentTitle: string;
  paymentTitleEn: string;
  paymentDescription: string;
  paymentDescriptionEn: string;
  renewalLabel: string;
  renewalLabelEn: string;
  billingNote: string;
  billingNoteEn: string;

  features: string[];
  featuresEn: string[];
};

export const ADD_ON_PRODUCTS: AddOnProduct[] = [
  {
    id: "boost-listing",
    name: "Boost Listing",
    nameEn: "Boost Listing",
    audience: "all",
    productType: "addon",

    priceIdr: 300000,
    durationDays: 14,
    renewable: true,
    autoRenewDefault: true,

    badge: "BOOST",
    badgeEn: "BOOST",
    placement: "marketplace",

    paymentTitle: "Boost Listing",
    paymentTitleEn: "Boost Listing",
    paymentDescription:
      "Add-on untuk meningkatkan visibilitas listing di marketplace TETAMO selama 14 hari.",
    paymentDescriptionEn:
      "An add-on to increase listing visibility on the TETAMO marketplace for 14 days.",
    renewalLabel: "Perpanjang Boost Listing",
    renewalLabelEn: "Renew Boost Listing",
    billingNote:
      "Boost aktif selama 14 hari dan diperpanjang otomatis kecuali Anda menonaktifkan auto renew dari dashboard.",
    billingNoteEn:
      "Boost stays active for 14 days and renews automatically unless you disable auto renew from the dashboard.",

    features: [
      "Durasi boost 14 hari",
      "Prioritas tampil lebih tinggi di marketplace",
      "Tersedia untuk owner dan agent",
      "Auto renew aktif secara default",
    ],
    featuresEn: [
      "14-day boost duration",
      "Higher display priority in the marketplace",
      "Available for owners and agents",
      "Auto renew enabled by default",
    ],
  },
  {
    id: "homepage-spotlight",
    name: "Homepage Spotlight",
    nameEn: "Homepage Spotlight",
    audience: "all",
    productType: "addon",

    priceIdr: 200000,
    durationDays: 7,
    renewable: true,
    autoRenewDefault: true,

    badge: "SPOTLIGHT",
    badgeEn: "SPOTLIGHT",
    placement: "homepage",

    paymentTitle: "Homepage Spotlight",
    paymentTitleEn: "Homepage Spotlight",
    paymentDescription:
      "Add-on premium untuk menampilkan listing di area spotlight homepage TETAMO selama 7 hari.",
    paymentDescriptionEn:
      "A premium add-on to display a listing in the TETAMO homepage spotlight area for 7 days.",
    renewalLabel: "Perpanjang Homepage Spotlight",
    renewalLabelEn: "Renew Homepage Spotlight",
    billingNote:
      "Spotlight aktif selama 7 hari dan diperpanjang otomatis kecuali Anda menonaktifkan auto renew dari dashboard. Slot homepage spotlight sangat terbatas.",
    billingNoteEn:
      "Spotlight stays active for 7 days and renews automatically unless you disable auto renew from the dashboard. Homepage spotlight slots are very limited.",

    features: [
      "Durasi spotlight 7 hari",
      "Tampil di homepage TETAMO",
      "Slot terbatas (maksimal 3 listing aktif)",
      "Tersedia untuk owner dan agent",
      "Auto renew aktif secara default",
    ],
    featuresEn: [
      "7-day spotlight duration",
      "Visible on the TETAMO homepage",
      "Limited slots (maximum 3 active listings)",
      "Available for owners and agents",
      "Auto renew enabled by default",
    ],
  },
];

export type EducationProduct = {
  id: string;
  name: string;
  nameEn: string;
  audience: "all";
  productType: "education";

  priceIdr: number;
  durationDays: number;
  renewable: boolean;
  autoRenewDefault: boolean;

  badge?: string;
  badgeEn?: string;

  paymentTitle: string;
  paymentTitleEn: string;
  paymentDescription: string;
  paymentDescriptionEn: string;
  renewalLabel: string;
  renewalLabelEn: string;
  billingNote: string;
  billingNoteEn: string;

  features: string[];
  featuresEn: string[];
};

export const EDUCATION_PRODUCTS: EducationProduct[] = [
  {
    id: "education-pass",
    name: "Education Pass",
    nameEn: "Education Pass",
    audience: "all",
    productType: "education",

    priceIdr: 100000,
    durationDays: 90,
    renewable: false,
    autoRenewDefault: false,

    badge: "90 DAYS",
    badgeEn: "90 DAYS",

    paymentTitle: "Education Pass - 90 Days",
    paymentTitleEn: "Education Pass - 90 Days",
    paymentDescription:
      "Akses premium untuk video edukasi TETAMO selama 90 hari bagi owner atau non-member agent.",
    paymentDescriptionEn:
      "Premium access to TETAMO educational videos for 90 days for owners or non-member agents.",
    renewalLabel: "Perpanjang Education Pass",
    renewalLabelEn: "Renew Education Pass",
    billingNote:
      "Education Pass aktif selama 90 hari sejak pembayaran berhasil. Paket ini tidak auto renew.",
    billingNoteEn:
      "The Education Pass stays active for 90 days from successful payment. This package does not auto renew.",

    features: [
      "Akses premium video edukasi TETAMO",
      "Aktif selama 90 hari",
      "Berlaku untuk owner dan non-member agent",
      "Tidak auto renew",
    ],
    featuresEn: [
      "Premium access to TETAMO educational videos",
      "Active for 90 days",
      "Valid for owners and non-member agents",
      "No auto renew",
    ],
  },
];

export type TetamoProduct =
  | OwnerPackage
  | AgentPackage
  | AddOnProduct
  | EducationProduct;

export function getOwnerPackageById(id: string) {
  return OWNER_PACKAGES.find((item) => item.id === id) ?? null;
}

export function getAgentPackageById(id: string) {
  return AGENT_PACKAGES.find((item) => item.id === id) ?? null;
}

export function getAddOnProductById(id: string) {
  return ADD_ON_PRODUCTS.find((item) => item.id === id) ?? null;
}

export function getEducationProductById(id: string) {
  return EDUCATION_PRODUCTS.find((item) => item.id === id) ?? null;
}

export function getAnyProductById(id: string): TetamoProduct | null {
  return (
    getOwnerPackageById(id) ||
    getAgentPackageById(id) ||
    getAddOnProductById(id) ||
    getEducationProductById(id) ||
    null
  );
}