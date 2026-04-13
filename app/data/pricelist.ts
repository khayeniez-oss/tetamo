export type OwnerPackage = {
  id: string;
  name: string;
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

  hasSocialMediaBoost: boolean;
  hasVerificationBadge: boolean;
  hasAgentSupport: boolean;
  hasDirectWhatsapp: boolean;
  hasScheduling: boolean;

  paymentTitle: string;
  paymentDescription: string;
  renewalLabel: string;
  billingNote: string;

  features: string[];
};

export const OWNER_PACKAGES: OwnerPackage[] = [
  {
    id: "basic",
    name: "Basic Listing",
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

    hasSocialMediaBoost: false,
    hasVerificationBadge: false,
    hasAgentSupport: false,
    hasDirectWhatsapp: true,
    hasScheduling: true,

    paymentTitle: "Basic Listing",
    paymentDescription:
      "Paket listing standar untuk pemilik yang ingin menampilkan 1 properti aktif di marketplace TETAMO selama 60 hari.",
    renewalLabel: "Perpanjang Basic Listing",
    billingNote:
      "Listing akan aktif selama 60 hari dan diperpanjang otomatis kecuali Anda menonaktifkan auto renew dari dashboard.",

    features: [
      "1 Listing Aktif",
      "Durasi aktif 60 hari",
      "Direct WhatsApp (Buyer/Renter contact langsung)",
      "Tampil di Tetamo Marketplace & App",
      "Jadwal Scheduling Viewing",
      "Auto renew aktif secara default",
    ],
  },
  {
    id: "featured",
    name: "Featured Listing",
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

    hasSocialMediaBoost: true,
    hasVerificationBadge: true,
    hasAgentSupport: true,
    hasDirectWhatsapp: true,
    hasScheduling: true,

    paymentTitle: "Featured Listing",
    paymentDescription:
      "Paket premium untuk pemilik yang ingin mendapatkan visibilitas lebih tinggi. Listing aktif total 60 hari, dengan status featured selama 30 hari pertama.",
    renewalLabel: "Perpanjang Featured Listing",
    billingNote:
      "Featured berlaku 30 hari. Setelah itu listing otomatis turun menjadi Basic hingga hari ke-60. Auto renew aktif secara default kecuali dimatikan dari dashboard.",

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
  },
];

export type AgentPackage = {
  id: string;
  name: string;
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
  paymentDescription: string;
  renewalLabel: string;
  billingNote: string;

  features: string[];
};

export const AGENT_PACKAGES: AgentPackage[] = [
  {
    id: "silver",
    name: "Silver",
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
    paymentDescription:
      "Paket tahunan untuk agen properti yang ingin mulai tampil profesional, mengelola listing aktif, leads, viewing, billing, dan insight dalam satu dashboard TETAMO.",
    renewalLabel: "Perpanjang Silver Membership",
    billingNote:
      "Membership aktif selama 1 tahun dan diperpanjang otomatis secara tahunan kecuali Anda menonaktifkan auto renew dari dashboard. Jika auto renew dimatikan, membership tetap aktif hingga akhir masa aktif saat ini.",

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
  },
  {
    id: "gold",
    name: "Gold",
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
    paymentDescription:
      "Paket tahunan untuk agen aktif yang ingin branding lebih kuat, prioritas visibilitas listing, dan fitur marketing tambahan di TETAMO.",
    renewalLabel: "Perpanjang Gold Membership",
    billingNote:
      "Membership aktif selama 1 tahun dan diperpanjang otomatis secara tahunan kecuali Anda menonaktifkan auto renew dari dashboard. Jika auto renew dimatikan, membership tetap aktif hingga akhir masa aktif saat ini.",

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
  },
  {
    id: "agent-pro",
    name: "Agent Pro",
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
    paymentDescription:
      "Paket tahunan premium untuk agen serius dan agensi yang ingin skala lebih besar, prioritas placement premium, dan opsi bayar bulanan dengan komitmen 12 bulan.",
    renewalLabel: "Perpanjang Agent Pro Membership",
    billingNote:
      "Membership aktif selama 1 tahun. Tersedia pembayaran tahunan penuh atau pembayaran bulanan dengan komitmen 12 bulan. Auto renew aktif secara default kecuali Anda menonaktifkan auto renew dari dashboard. Jika auto renew dimatikan, membership tetap aktif hingga akhir masa aktif / komitmen saat ini.",

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
  },
];

export type AddOnProduct = {
  id: string;
  name: string;
  audience: "owner" | "agent" | "all";
  productType: "addon";

  priceIdr: number;
  durationDays: number;
  renewable: boolean;
  autoRenewDefault: boolean;

  badge?: string;
  placement: "marketplace" | "homepage";

  paymentTitle: string;
  paymentDescription: string;
  renewalLabel: string;
  billingNote: string;

  features: string[];
};

export const ADD_ON_PRODUCTS: AddOnProduct[] = [
  {
    id: "boost-listing",
    name: "Boost Listing",
    audience: "all",
    productType: "addon",

    priceIdr: 300000,
    durationDays: 14,
    renewable: true,
    autoRenewDefault: true,

    badge: "BOOST",
    placement: "marketplace",

    paymentTitle: "Boost Listing",
    paymentDescription:
      "Add-on untuk meningkatkan visibilitas listing di marketplace TETAMO selama 14 hari.",
    renewalLabel: "Perpanjang Boost Listing",
    billingNote:
      "Boost aktif selama 14 hari dan diperpanjang otomatis kecuali Anda menonaktifkan auto renew dari dashboard.",

    features: [
      "Durasi boost 14 hari",
      "Prioritas tampil lebih tinggi di marketplace",
      "Tersedia untuk owner dan agent",
      "Auto renew aktif secara default",
    ],
  },
  {
    id: "homepage-spotlight",
    name: "Homepage Spotlight",
    audience: "all",
    productType: "addon",

    priceIdr: 200000,
    durationDays: 7,
    renewable: true,
    autoRenewDefault: true,

    badge: "SPOTLIGHT",
    placement: "homepage",

    paymentTitle: "Homepage Spotlight",
    paymentDescription:
      "Add-on premium untuk menampilkan listing di area spotlight homepage TETAMO selama 7 hari.",
    renewalLabel: "Perpanjang Homepage Spotlight",
    billingNote:
      "Spotlight aktif selama 7 hari dan diperpanjang otomatis kecuali Anda menonaktifkan auto renew dari dashboard. Slot homepage spotlight sangat terbatas.",

    features: [
      "Durasi spotlight 7 hari",
      "Tampil di homepage TETAMO",
      "Slot terbatas (maksimal 3 listing aktif)",
      "Tersedia untuk owner dan agent",
      "Auto renew aktif secara default",
    ],
  },
];

export type EducationProduct = {
  id: string;
  name: string;
  audience: "all";
  productType: "education";

  priceIdr: number;
  durationDays: number;
  renewable: boolean;
  autoRenewDefault: boolean;

  badge?: string;

  paymentTitle: string;
  paymentDescription: string;
  renewalLabel: string;
  billingNote: string;

  features: string[];
};

export const EDUCATION_PRODUCTS: EducationProduct[] = [
  {
    id: "education-pass",
    name: "Education Pass",
    audience: "all",
    productType: "education",

    priceIdr: 100000,
    durationDays: 90,
    renewable: false,
    autoRenewDefault: false,

    badge: "90 DAYS",

    paymentTitle: "Education Pass - 90 Days",
    paymentDescription:
      "Akses premium untuk video edukasi TETAMO selama 90 hari bagi owner atau non-member agent.",
    renewalLabel: "Perpanjang Education Pass",
    billingNote:
      "Education Pass aktif selama 90 hari sejak pembayaran berhasil. Paket ini tidak auto renew.",

    features: [
      "Akses premium video edukasi TETAMO",
      "Aktif selama 90 hari",
      "Berlaku untuk owner dan non-member agent",
      "Tidak auto renew",
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