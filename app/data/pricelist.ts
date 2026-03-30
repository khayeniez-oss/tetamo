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

  // Featured logic
  isFeatured: boolean;
  featuredDurationDays?: number;
  downgradeToBasicAfterFeatured?: boolean;

  // Visual / positioning
  badge?: string;

  // Functional flags
  hasSocialMediaBoost: boolean;
  hasVerificationBadge: boolean;
  hasAgentSupport: boolean;
  hasDirectWhatsapp: boolean;
  hasScheduling: boolean;

  // Payment / summary content
  paymentTitle: string;
  paymentDescription: string;
  renewalLabel: string;
  billingNote: string;

  // Display list
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

  priceIdr: number;
  durationDays: number;
  renewable: boolean;
  autoRenewDefault: boolean;

  maxListings: number;
  maxFeaturedListings: number;

  hasProfileWebsite: boolean;
  hasAiAvatar: boolean;
  hasSocialMediaPromotion: boolean;
  hasBuyerRecommendation: boolean;
  hasAdminSupport: boolean;

  paymentTitle: string;
  paymentDescription: string;
  renewalLabel: string;
  billingNote: string;

  features: string[];
};

export const AGENT_PACKAGES: AgentPackage[] = [
  {
    id: "agent-pro-monthly",
    name: "Agen Properti TETAMO - Monthly",
    audience: "agent",
    productType: "membership",

    billingCycle: "monthly",

    priceIdr: 250000,
    durationDays: 30,
    renewable: true,
    autoRenewDefault: true,

    maxListings: 100,
    maxFeaturedListings: 3,

    hasProfileWebsite: true,
    hasAiAvatar: true,
    hasSocialMediaPromotion: true,
    hasBuyerRecommendation: true,
    hasAdminSupport: true,

    paymentTitle: "Agent Membership - Monthly",
    paymentDescription:
      "Keanggotaan bulanan untuk agen properti yang ingin mengelola listing, membangun profil profesional, dan mendapatkan eksposur lebih besar di TETAMO.",
    renewalLabel: "Perpanjang Agent Membership Monthly",
    billingNote:
      "Membership aktif selama 30 hari dan diperpanjang otomatis kecuali Anda menonaktifkan auto renew dari dashboard.",

    features: [
      "100 Listing Aktif",
      "Membership aktif selama 30 hari",
      "Website Profil Agen (Terhubung ke Media Sosial)",
      "1 AI Avatar Video Perkenalan",
      "3 Featured Listing Slot",
      "Prioritas Lead dari Buyer, WhatsApp Langsung dari Listing",
      "Optimasi Judul & Deskripsi (SEO Friendly)",
      "Promosi Featured Listing di Media Sosial TETAMO",
      "Direkomendasikan ke Buyer sesuai Area",
      "Support Admin 09.00 – 14.00",
      "Auto renew aktif secara default",
    ],
  },
  {
    id: "agent-pro-yearly",
    name: "Agen Properti TETAMO - Yearly",
    audience: "agent",
    productType: "membership",

    billingCycle: "yearly",

    priceIdr: 1800000,
    durationDays: 365,
    renewable: true,
    autoRenewDefault: true,

    maxListings: 100,
    maxFeaturedListings: 3,

    hasProfileWebsite: true,
    hasAiAvatar: true,
    hasSocialMediaPromotion: true,
    hasBuyerRecommendation: true,
    hasAdminSupport: true,

    paymentTitle: "Agent Membership - Yearly",
    paymentDescription:
      "Keanggotaan tahunan untuk agen properti yang ingin mengelola listing, membangun profil profesional, dan mendapatkan eksposur lebih besar di TETAMO.",
    renewalLabel: "Perpanjang Agent Membership Yearly",
    billingNote:
      "Membership aktif selama 365 hari dan diperpanjang otomatis kecuali Anda menonaktifkan auto renew dari dashboard.",

    features: [
      "100 Listing Aktif",
      "Membership aktif selama 1 tahun",
      "Website Profil Agen (Terhubung ke Media Sosial)",
      "1 AI Avatar Video Perkenalan",
      "3 Featured Listing Slot",
      "Prioritas Lead dari Buyer, WhatsApp Langsung dari Listing",
      "Optimasi Judul & Deskripsi (SEO Friendly)",
      "Promosi Featured Listing di Media Sosial TETAMO",
      "Direkomendasikan ke Buyer sesuai Area",
      "Support Admin 09.00 – 14.00",
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

export type TetamoProduct = OwnerPackage | AgentPackage | AddOnProduct;

export function getOwnerPackageById(id: string) {
  return OWNER_PACKAGES.find((item) => item.id === id) ?? null;
}

export function getAgentPackageById(id: string) {
  return AGENT_PACKAGES.find((item) => item.id === id) ?? null;
}

export function getAddOnProductById(id: string) {
  return ADD_ON_PRODUCTS.find((item) => item.id === id) ?? null;
}

export function getAnyProductById(id: string): TetamoProduct | null {
  return (
    getOwnerPackageById(id) ||
    getAgentPackageById(id) ||
    getAddOnProductById(id) ||
    null
  );
}