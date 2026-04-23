import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import PropertiPageClient from "./PropertiPageClient";
import { getSEOBySlug, getSiteUrl } from "@/lib/seo-server";

export const dynamic = "force-dynamic";

type RentalType = "monthly" | "yearly" | "";

type Property = {
  verifiedListing: boolean;

  ownerVerified: boolean;
  ownerPendingVerification: boolean;

  agentVerified: boolean;
  agentPendingVerification: boolean;

  developerVerified: boolean;
  developerPendingApproval: boolean;

  spotlight?: boolean;
  featured?: boolean;
  boosted?: boolean;

  id: string;
  slug?: string;
  jenisListing: "dijual" | "disewa";
  rentalType: RentalType;
  propertyType: string;
  kode?: string;
  postedDate?: string;
  sortDateRaw?: string | null;

  title: string;
  titleId?: string;
  description?: string;
  descriptionId?: string;
  viewCount: number;

  priceValue: number;
  province: string;
  area: string;
  size: string;
  bed: string;
  furnished: string;

  agentName: string;
  agency: string;
  whatsapp: string;
  images: string[];

  postedByType: "owner" | "agent" | "developer";
  receiverId: string;
  receiverName: string;
  receiverWhatsapp: string;

  rankingScore?: number;
};

type PropertyImageRow = {
  image_url: string;
  sort_order: number | null;
  is_cover: boolean | null;
};

type PropertyRow = {
  id: string;
  slug: string | null;
  kode: string | null;
  posted_date: string | null;

  title: string | null;
  title_id: string | null;
  description: string | null;
  description_id: string | null;
  view_count: number | null;

  price: number | null;
  province: string | null;
  city: string | null;
  area: string | null;
  building_size: number | null;
  land_size: number | null;
  bedrooms: number | null;
  furnishing: string | null;
  listing_type: string | null;
  rental_type: string | null;
  property_type: string | null;
  source: string | null;
  status: string | null;
  verification_status: string | null;
  verified_ok: boolean | null;
  plan_id: string | null;
  created_at: string | null;
  user_id: string | null;
  is_paused: boolean | null;
  listing_expires_at: string | null;
  featured_expires_at: string | null;
  boost_active: boolean | null;
  boost_expires_at: string | null;
  spotlight_active: boolean | null;
  spotlight_expires_at: string | null;
  transaction_status: string | null;

  contact_user_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_role: string | null;
  contact_agency: string | null;
  created_by_user_id: string | null;

  property_images: PropertyImageRow[] | null;
};

function formatPostedDate(value?: string | null) {
  if (!value) return "-";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function mapFurnishing(value?: string | null) {
  if (!value) return "-";

  const v = value.toLowerCase();

  if (v === "full") return "Full Furnished";
  if (v === "semi") return "Semi Furnished";
  if (v === "unfurnished") return "Unfurnished";

  return value;
}

function normalizeWhatsapp(phone?: string | null) {
  if (!phone) return "";

  const digits = phone.replace(/[^\d]/g, "");

  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;

  return digits;
}

function isFutureDate(value?: string | null) {
  if (!value) return false;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;

  return d.getTime() > Date.now();
}

function isPromotionActive(flag?: boolean | null, expiresAt?: string | null) {
  return Boolean(flag) && (!expiresAt || isFutureDate(expiresAt));
}

function normalizeTransactionStatus(value?: string | null) {
  const v = (value || "").trim().toLowerCase();
  if (v === "sold") return "sold";
  if (v === "rented") return "rented";
  return "available";
}

function isListingPublic(row: PropertyRow) {
  if (row.status === "rejected") return false;
  if (row.is_paused) return false;

  if (normalizeTransactionStatus(row.transaction_status) !== "available") {
    return false;
  }

  if (row.listing_expires_at && !isFutureDate(row.listing_expires_at)) {
    return false;
  }

  return true;
}

function normalizePostedByType(
  role?: string | null,
  source?: string | null
): "owner" | "agent" | "developer" {
  const value = (role || source || "owner").toLowerCase();

  if (value === "agent") return "agent";
  if (value === "developer") return "developer";
  return "owner";
}

function normalizeRentalType(value?: string | null): RentalType {
  const v = String(value || "").trim().toLowerCase();

  if (v === "monthly" || v === "bulanan") return "monthly";
  if (v === "yearly" || v === "tahunan") return "yearly";

  return "";
}

async function getInitialProperties(): Promise<Property[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("properties")
    .select(`
      id,
      slug,
      kode,
      posted_date,
      title,
      title_id,
      description,
      description_id,
      view_count,
      price,
      province,
      city,
      area,
      building_size,
      land_size,
      bedrooms,
      furnishing,
      listing_type,
      rental_type,
      property_type,
      source,
      status,
      verification_status,
      verified_ok,
      plan_id,
      created_at,
      user_id,
      is_paused,
      listing_expires_at,
      featured_expires_at,
      boost_active,
      boost_expires_at,
      spotlight_active,
      spotlight_expires_at,
      transaction_status,
      contact_user_id,
      contact_name,
      contact_phone,
      contact_role,
      contact_agency,
      created_by_user_id,
      property_images (
        image_url,
        sort_order,
        is_cover
      )
    `)
    .neq("status", "rejected")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load initial marketplace properties:", error);
    return [];
  }

  const rows = ((data ?? []) as PropertyRow[]).filter(isListingPublic);

  return rows.map((row) => {
    const sortedImages = [...(row.property_images ?? [])].sort((a, b) => {
      const coverA = a.is_cover ? 1 : 0;
      const coverB = b.is_cover ? 1 : 0;

      if (coverA !== coverB) return coverB - coverA;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });

    const images = sortedImages.length
      ? sortedImages.map((img) => img.image_url)
      : ["/placeholder-property.jpg"];

    const receiverId =
      row.contact_user_id || row.user_id || row.created_by_user_id || "";

    const postedByType = normalizePostedByType(row.contact_role, row.source);

    const isVerified =
      row.verification_status === "verified" || Boolean(row.verified_ok);

    const spotlight = isPromotionActive(
      row.spotlight_active,
      row.spotlight_expires_at
    );

    const featured =
      row.plan_id === "featured" &&
      (!row.featured_expires_at || isFutureDate(row.featured_expires_at));

    const boosted = isPromotionActive(
      row.boost_active,
      row.boost_expires_at
    );

    const ownerPendingVerification =
      postedByType === "owner" &&
      !isVerified &&
      (
        row.status === "pending" ||
        row.status === "pending_approval" ||
        row.verification_status === "pending_verification" ||
        row.verification_status === "pending_approval"
      );

    const agentPendingVerification =
      postedByType === "agent" &&
      !isVerified &&
      (
        row.status === "pending" ||
        row.status === "pending_approval" ||
        row.verification_status === "pending_verification" ||
        row.verification_status === "pending_approval"
      );

    const developerPendingApproval =
      postedByType === "developer" &&
      !isVerified &&
      (
        row.status === "pending" ||
        row.status === "pending_approval" ||
        row.verification_status === "pending_verification" ||
        row.verification_status === "pending_approval"
      );

    const resolvedName = row.contact_name || "Tetamo User";
    const resolvedAgency = row.contact_agency || "";
    const resolvedWhatsapp = normalizeWhatsapp(row.contact_phone);
    const liveDate = row.posted_date || row.created_at || null;

    return {
      verifiedListing: isVerified,

      ownerVerified: postedByType === "owner" && isVerified,
      ownerPendingVerification,

      agentVerified: postedByType === "agent" && isVerified,
      agentPendingVerification,

      developerVerified: postedByType === "developer" && isVerified,
      developerPendingApproval,

      spotlight,
      featured,
      boosted,

      id: row.id,
      slug: row.slug ?? undefined,
      jenisListing: row.listing_type === "disewa" ? "disewa" : "dijual",
      rentalType: normalizeRentalType(row.rental_type),
      propertyType: row.property_type || "",
      kode: row.kode ?? undefined,
      postedDate: formatPostedDate(liveDate),
      sortDateRaw: liveDate,

      title: row.title ?? "-",
      titleId: row.title_id ?? undefined,
      description: row.description ?? undefined,
      descriptionId: row.description_id ?? undefined,
      viewCount: Number(row.view_count ?? 0),

      priceValue: Number(row.price ?? 0),
      province: row.province ?? "-",
      area: row.city || row.area || "-",
      size: `${row.building_size ?? row.land_size ?? 0} m²`,
      bed: `${row.bedrooms ?? 0} Kamar`,
      furnished: mapFurnishing(row.furnishing),

      agentName: resolvedName,
      agency: resolvedAgency,
      whatsapp: resolvedWhatsapp,
      images,

      postedByType,
      receiverId,
      receiverName: resolvedName,
      receiverWhatsapp: resolvedWhatsapp,

      rankingScore: 0,
    };
  });
}

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSEOBySlug("/properti");
  const siteUrl = getSiteUrl();

  const title = seo?.title || "Property Marketplace Indonesia | Tetamo";
  const description =
    seo?.description ||
    "Browse active property listings for sale and rent across Indonesia on Tetamo.";

  const canonical =
    seo?.canonical &&
    seo.canonical !== "self-canonical" &&
    seo.canonical !== "none"
      ? seo.canonical
      : `${siteUrl}/properti`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    robots: {
      index: seo?.indexed ?? true,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Tetamo",
      type: "website",
    },
  };
}

export default async function PropertiPage() {
  const initialProperties = await getInitialProperties();

  return (
    <Suspense fallback={<main className="min-h-screen bg-white text-gray-900" />}>
      <PropertiPageClient initialProperties={initialProperties} />
    </Suspense>
  );
}