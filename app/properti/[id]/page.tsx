import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import PropertyDetailClient from "./PropertyDetailClient";
import { fillTemplate, getSEOTemplate, getSiteUrl } from "@/lib/seo-server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

type PropertyImageRow = {
  image_url: string | null;
  sort_order: number | null;
  is_cover: boolean | null;
};

type PropertySEOData = {
  id: string;
  slug: string | null;
  kode: string | null;
  title: string | null;
  description: string | null;
  price: number | null;
  province: string | null;
  city: string | null;
  area: string | null;
  property_type: string | null;
  listing_type: string | null;
  rental_type: string | null;
  status: string | null;
  verification_status: string | null;
  verified_ok: boolean | null;
  is_paused: boolean | null;
  listing_expires_at: string | null;
  transaction_status: string | null;
  property_images: PropertyImageRow[] | null;
};

type OrderedPropertyRef = {
  id: string;
  slug?: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  agency: string | null;
  photo_url: string | null;
  email?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  tiktok_url?: string | null;
  youtube_url?: string | null;
  linkedin_url?: string | null;
};

type PropertyRow = {
  [key: string]: any;
  id: string;
  slug: string | null;
  kode: string | null;
  posted_date: string | null;

  title: string | null;
  title_id: string | null;

  price: number | null;
  province: string | null;
  city: string | null;
  area: string | null;
  building_size: number | null;
  land_size: number | null;
  bedrooms: number | null;
  furnishing: string | null;
  certificate: string | null;
  market_type: string | null;

  description: string | null;
  description_id: string | null;
  description_en: string | null;

  view_count: number | null;

  facilities: Record<string, boolean> | null;
  nearby: Record<string, boolean> | null;
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
  video_url: string | null;
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

const FALLBACK_POSTER_PHOTO =
  "https://randomuser.me/api/portraits/men/32.jpg";

const PROPERTY_SELECT = `
  id,
  slug,
  kode,
  title,
  description,
  price,
  province,
  city,
  area,
  property_type,
  listing_type,
  rental_type,
  status,
  verification_status,
  verified_ok,
  is_paused,
  listing_expires_at,
  transaction_status,
  property_images (
    image_url,
    sort_order,
    is_cover
  )
`;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRole) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function cleanText(value?: string | null) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function trimToLength(value: string, max: number) {
  const cleaned = cleanText(value);
  if (!cleaned) return "";
  if (cleaned.length <= max) return cleaned;

  const sliced = cleaned.slice(0, max).trim();
  const lastSpace = sliced.lastIndexOf(" ");

  return `${(lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
}

function joinLocation(parts: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const raw of parts) {
    const value = cleanText(raw);
    if (!value) continue;

    const key = value.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    output.push(value);
  }

  return output.join(", ");
}

function formatPropertyType(value?: string | null) {
  const raw = cleanText(value).toLowerCase();
  if (!raw) return "Property";

  return raw
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatListingIntent(
  listingType?: string | null,
  rentalType?: string | null
) {
  const listing = cleanText(listingType).toLowerCase();
  const rental = cleanText(rentalType).toLowerCase();

  if (listing === "disewa") {
    if (rental === "bulanan" || rental === "monthly") return "for monthly rent";
    if (rental === "tahunan" || rental === "yearly") return "for yearly rent";
    return "for rent";
  }

  if (listing === "dijual") return "for sale";

  return "";
}

function formatPriceIDR(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) return "";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

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

function toNumberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toStringOrEmpty(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeWhatsapp(phone?: string | null) {
  if (!phone) return "";
  const digits = phone.replace(/[^\d]/g, "");

  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;

  return digits;
}

function mapFurnishing(value?: string | null) {
  if (!value) return "-";

  const v = value.toLowerCase();

  if (v === "full") return "Full Furnished";
  if (v === "semi") return "Semi Furnished";
  if (v === "unfurnished") return "Unfurnished";

  return value;
}

function isFutureDate(value?: string | null) {
  if (!value) return false;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;

  return d.getTime() > Date.now();
}

function normalizeTransactionStatus(value?: string | null) {
  const v = cleanText(value).toLowerCase();
  if (v === "sold") return "sold";
  if (v === "rented") return "rented";
  return "available";
}

function isPromotionActive(flag?: boolean | null, expiresAt?: string | null) {
  return Boolean(flag) && (!expiresAt || isFutureDate(expiresAt));
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

function normalizeRentalType(value?: string | null) {
  const v = String(value || "").trim().toLowerCase();

  if (v === "monthly" || v === "bulanan") return "monthly";
  if (v === "yearly" || v === "tahunan") return "yearly";

  return "";
}

function isPropertyIndexable(property: PropertySEOData | null) {
  if (!property) return false;

  const status = cleanText(property.status).toLowerCase();
  const transactionStatus = normalizeTransactionStatus(property.transaction_status);

  if (!cleanText(property.title)) return false;
  if (status === "rejected") return false;
  if (property.is_paused) return false;
  if (transactionStatus !== "available") return false;

  if (property.listing_expires_at && !isFutureDate(property.listing_expires_at)) {
    return false;
  }

  return true;
}

function isListingPublic(
  row: Pick<
    PropertyRow,
    "status" | "is_paused" | "listing_expires_at" | "transaction_status"
  >
) {
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

function sortImages(images?: PropertyImageRow[] | null) {
  return [...(images || [])].sort((a, b) => {
    const coverA = a.is_cover ? 1 : 0;
    const coverB = b.is_cover ? 1 : 0;

    if (coverA !== coverB) return coverB - coverA;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
}

function toAbsoluteUrl(siteUrl: string, value?: string | null) {
  const raw = cleanText(value);
  if (!raw) return "";

  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${siteUrl}${raw}`;

  return `${siteUrl}/${raw}`;
}

function getPrimaryImage(siteUrl: string, images?: PropertyImageRow[] | null) {
  const sorted = sortImages(images);
  const first = sorted.find((img) => cleanText(img.image_url));

  if (!first?.image_url) return "";
  return toAbsoluteUrl(siteUrl, first.image_url);
}

function buildFallbackTitle(property: PropertySEOData, location: string) {
  const title = cleanText(property.title) || "Property";
  const pieces = [title];

  if (location) pieces.push(location);
  pieces.push("Tetamo");

  return trimToLength(pieces.join(" | "), 70);
}

function buildFallbackDescription(property: PropertySEOData, location: string) {
  const title = cleanText(property.title) || "Property";
  const propertyType = formatPropertyType(property.property_type);
  const listingIntent = formatListingIntent(
    property.listing_type,
    property.rental_type
  );
  const price = formatPriceIDR(property.price);
  const content = cleanText(property.description);

  const sentenceParts = [
    title,
    location ? `located in ${location}` : "",
    propertyType ? `${propertyType}${listingIntent ? ` ${listingIntent}` : ""}` : "",
    price ? `priced at ${price}` : "",
  ].filter(Boolean);

  const lead = sentenceParts.join(". ");
  const full = content ? `${lead}. ${content}` : lead;

  return trimToLength(full || "View complete property details on Tetamo.", 160);
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function getPropertyBySlugOrId(routeValue: string) {
  const supabase = getSupabaseAdmin();

  const { data: bySlug, error: slugError } = await supabase
    .from("properties")
    .select(PROPERTY_SELECT)
    .eq("slug", routeValue)
    .maybeSingle();

  if (slugError) {
    console.error("Property slug query error:", slugError);
  }

  if (bySlug) {
    return (bySlug as PropertySEOData) || null;
  }

  if (!looksLikeUuid(routeValue)) {
    return null;
  }

  const { data: byId, error: idError } = await supabase
    .from("properties")
    .select(PROPERTY_SELECT)
    .eq("id", routeValue)
    .maybeSingle();

  if (idError) {
    console.error("Property id query error:", idError);
  }

  return (byId as PropertySEOData | null) || null;
}

async function getFullPropertyRowBySlugOrId(routeValue: string) {
  const supabase = getSupabaseAdmin();

  const { data: bySlug, error: slugError } = await supabase
    .from("properties")
    .select(`
      *,
      property_images (
        image_url,
        sort_order,
        is_cover
      )
    `)
    .eq("slug", routeValue)
    .maybeSingle();

  if (slugError) {
    console.error("Full property slug query error:", slugError);
  }

  if (bySlug) {
    return (bySlug as PropertyRow) || null;
  }

  if (!looksLikeUuid(routeValue)) {
    return null;
  }

  const { data: byId, error: idError } = await supabase
    .from("properties")
    .select(`
      *,
      property_images (
        image_url,
        sort_order,
        is_cover
      )
    `)
    .eq("id", routeValue)
    .maybeSingle();

  if (idError) {
    console.error("Full property id query error:", idError);
  }

  return (byId as PropertyRow | null) || null;
}

async function getPropertyTemplate() {
  const slugTemplate = await getSEOTemplate("/properti/[slug]");
  if (slugTemplate) return slugTemplate;
  return getSEOTemplate("/properti/[id]");
}

async function getInitialDetailData(routeValue: string): Promise<{
  row: PropertyRow;
  initialProperty: any;
  initialOrderedProperties: OrderedPropertyRef[];
} | null> {
  const supabase = getSupabaseAdmin();

  const [row, idsRes] = await Promise.all([
    getFullPropertyRowBySlugOrId(routeValue),
    supabase
      .from("properties")
      .select(
        "id, slug, created_at, status, is_paused, listing_expires_at, transaction_status"
      )
      .neq("status", "rejected")
      .order("created_at", { ascending: false }),
  ]);

  if (!row || !isListingPublic(row)) {
    return null;
  }

  const orderedProperties: OrderedPropertyRef[] = (
    ((idsRes.data ?? []) as Array<{
      id: string;
      slug: string | null;
      status: string | null;
      is_paused: boolean | null;
      listing_expires_at: string | null;
      transaction_status: string | null;
    }>)
      .filter((item) =>
        isListingPublic({
          status: item.status ?? "",
          is_paused: item.is_paused,
          listing_expires_at: item.listing_expires_at,
          transaction_status: item.transaction_status,
        })
      )
      .map((x) => ({ id: x.id, slug: x.slug ?? undefined }))
  );

  const possibleProfileIds = Array.from(
    new Set(
      [row.contact_user_id, row.user_id].filter(
        (value): value is string => Boolean(value)
      )
    )
  );

  let contactProfile: ProfileRow | null = null;
  let userProfile: ProfileRow | null = null;

  if (possibleProfileIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        phone,
        role,
        agency,
        photo_url,
        email,
        instagram_url,
        facebook_url,
        tiktok_url,
        youtube_url,
        linkedin_url
      `)
      .in("id", possibleProfileIds);

    if (profilesError) {
      console.error("Failed to load poster profiles:", profilesError);
    }

    const profilesMap = new Map(
      ((profilesData ?? []) as ProfileRow[]).map((profile) => [
        profile.id,
        profile,
      ])
    );

    contactProfile = row.contact_user_id
      ? profilesMap.get(row.contact_user_id) ?? null
      : null;

    userProfile = row.user_id ? profilesMap.get(row.user_id) ?? null : null;
  }

  const posterProfile =
    (contactProfile?.photo_url ? contactProfile : null) ||
    (userProfile?.photo_url ? userProfile : null) ||
    contactProfile ||
    userProfile ||
    null;

  const sortedImages = sortImages(row.property_images);
  const images = sortedImages.length
    ? sortedImages
        .map((img) => img.image_url)
        .filter((img): img is string => Boolean(img))
    : ["/placeholder-property.jpg"];

  const postedByType = normalizePostedByType(row.contact_role, row.source);

  const spotlight = isPromotionActive(
    row.spotlight_active,
    row.spotlight_expires_at
  );

  const featured =
    row.plan_id === "featured" &&
    (!row.featured_expires_at || isFutureDate(row.featured_expires_at));

  const boosted = isPromotionActive(row.boost_active, row.boost_expires_at);

  const isVerified =
    row.verification_status === "verified" || Boolean(row.verified_ok);

  const bedroomsValue = toNumberOrNull(row.bedrooms ?? row.bed);
  const bathroomsValue = toNumberOrNull(
    row.bathrooms ?? row.bathroom ?? row.bath
  );
  const floorsValue = toNumberOrNull(
    row.floors ?? row.floor ?? row.floor_count
  );
  const parkingValue = toNumberOrNull(
    row.parking_spaces ?? row.parking ?? row.garage_count ?? row.carport_count
  );

  const rawParking = toStringOrEmpty(row.garage ?? row.parking).toLowerCase();
  const parkingAvailable =
    Boolean(row.facilities?.fac_parking) ||
    rawParking === "ada" ||
    rawParking === "available" ||
    rawParking === "yes" ||
    rawParking === "true";

  const initialProperty: any = {
    id: row.id,
    slug: row.slug ?? undefined,
    jenisListing: row.listing_type === "disewa" ? "disewa" : "dijual",
    rentalType: normalizeRentalType(row.rental_type),
    propertyType: row.property_type || "",

    title: toStringOrEmpty(row.title) || "-",
    titleId: toStringOrEmpty(row.title_id),

    price: formatPriceIDR(row.price ?? 0),
    priceValue: Number(row.price ?? 0),
    province: row.province ?? "-",
    area: row.city || row.area || "-",
    furnished: mapFurnishing(row.furnishing ?? row.furnished),
    certificate: toStringOrEmpty(row.certificate ?? row.sertifikat) || "-",
    marketType: toStringOrEmpty(row.market_type ?? row.marketType),

    description: toStringOrEmpty(row.description) || "-",
    descriptionId: toStringOrEmpty(row.description_id),
    descriptionEn: row.description_en || "",

    viewCount: Number(row.view_count ?? 0),

    agency:
      row.contact_agency ||
      posterProfile?.agency ||
      (postedByType === "agent"
        ? "Tetamo Agent"
        : postedByType === "developer"
          ? "Developer"
          : "Owner"),
    agentName:
      row.contact_name ||
      contactProfile?.full_name ||
      userProfile?.full_name ||
      "Tetamo User",
    images: images.length ? images : ["/placeholder-property.jpg"],
    videoUrl: row.video_url ?? null,
    photo: posterProfile?.photo_url || FALLBACK_POSTER_PHOTO,

    facilities: row.facilities ?? {},
    nearby: row.nearby ?? {},

    kodeListing: row.kode ?? "-",
    postedDate: formatPostedDate(row.posted_date || row.created_at),

    boosted,
    featured,
    spotlight,

    verifiedListing: isVerified,
    ownerApproved: postedByType === "owner" && isVerified,
    agentVerified: postedByType === "agent" && isVerified,

    postedByType,
    receiverId: row.contact_user_id || row.user_id || "",
    receiverName:
      row.contact_name ||
      contactProfile?.full_name ||
      userProfile?.full_name ||
      "Tetamo User",
    receiverWhatsapp: normalizeWhatsapp(
      row.contact_phone || contactProfile?.phone || userProfile?.phone
    ),

    instagramUrl:
      posterProfile?.instagram_url ||
      contactProfile?.instagram_url ||
      userProfile?.instagram_url ||
      "",
    facebookUrl:
      posterProfile?.facebook_url ||
      contactProfile?.facebook_url ||
      userProfile?.facebook_url ||
      "",
    tiktokUrl:
      posterProfile?.tiktok_url ||
      contactProfile?.tiktok_url ||
      userProfile?.tiktok_url ||
      "",
    youtubeUrl:
      posterProfile?.youtube_url ||
      contactProfile?.youtube_url ||
      userProfile?.youtube_url ||
      "",
    linkedinUrl:
      posterProfile?.linkedin_url ||
      contactProfile?.linkedin_url ||
      userProfile?.linkedin_url ||
      "",

    buildingSizeValue: toNumberOrNull(row.building_size ?? row.lb),
    landSizeValue: toNumberOrNull(row.land_size ?? row.lt),
    bedroomsValue,
    bathroomsValue,
    floorsValue,
    parkingValue,
    parkingAvailable,
    electricityValue: toStringOrEmpty(
      row.electricity ?? row.listrik ?? row.power_capacity
    ),
    waterValue: toStringOrEmpty(
      row.water_source ?? row.water ?? row.air ?? row.jenis_air
    ),

    landUnit: toStringOrEmpty(row.land_unit ?? row.lt_unit) || "m2",
    pricePerSqmValue: toNumberOrNull(
      row.price_per_sqm ?? row.price_per_m2 ?? row.price_per_meter
    ),
    pricePerAreValue: toNumberOrNull(row.price_per_are),
    pricePerHectareValue: toNumberOrNull(
      row.price_per_hectare ?? row.price_per_hektare
    ),
    frontageValue: toNumberOrNull(row.frontage ?? row.width),
    depthValue: toNumberOrNull(row.depth ?? row.length),
    dimensionText: toStringOrEmpty(
      row.dimension_text ?? row.dimension ?? row.land_dimension
    ),
    roadAccess: toStringOrEmpty(row.road_access ?? row.akses_jalan),
    ownershipType: toStringOrEmpty(
      row.ownership_type ?? row.jenis_kepemilikan ?? row.ownership
    ),
    landType: toStringOrEmpty(row.land_type ?? row.jenis_tanah),
    zoningType: toStringOrEmpty(
      row.zoning_type ?? row.jenis_zoning ?? row.zoning
    ),
    unitFloorValue: toNumberOrNull(
      row.unit_floor ?? row.floor_level ?? row.lantai_unit
    ),
    towerBlock: toStringOrEmpty(
      row.tower_block ?? row.tower ?? row.block ?? row.blok
    ),
    ceilingHeightValue: toNumberOrNull(
      row.ceiling_height ?? row.high_ceiling ?? row.tinggi_plafon
    ),
  };

  return {
    row,
    initialProperty,
    initialOrderedProperties: orderedProperties,
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id: routeValue } = await params;
  const siteUrl = getSiteUrl();
  const property = await getPropertyBySlugOrId(routeValue);
  const template = await getPropertyTemplate();

  const finalPathPart = cleanText(property?.slug) || routeValue;
  const canonical = `${siteUrl}/properti/${finalPathPart}`;

  if (!property) {
    return {
      title: "Property Not Found | Tetamo",
      description: "This property is no longer available on Tetamo.",
      alternates: {
        canonical,
      },
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const location = joinLocation([property.area, property.city, property.province]);

  const templateValues = {
    id: property.id,
    slug: property.slug || "",
    kode: property.kode || "",
    title: cleanText(property.title) || "Property",
    city: cleanText(property.city) || cleanText(property.area) || "",
    area: cleanText(property.area) || "",
    province: cleanText(property.province) || "",
    location,
    property_type: formatPropertyType(property.property_type),
    listing_type: cleanText(property.listing_type),
    rental_type: cleanText(property.rental_type),
    listing_intent: formatListingIntent(
      property.listing_type,
      property.rental_type
    ),
    price: formatPriceIDR(property.price),
    description: cleanText(property.description),
  };

  const title = trimToLength(
    template?.title
      ? fillTemplate(template.title, templateValues)
      : buildFallbackTitle(property, location),
    70
  );

  const description = template?.description
    ? trimToLength(fillTemplate(template.description, templateValues), 160)
    : buildFallbackDescription(property, location);

  const ogImage = getPrimaryImage(siteUrl, property.property_images);
  const shouldIndex =
    Boolean(template?.indexed ?? true) && isPropertyIndexable(property);

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    robots: {
      index: shouldIndex,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Tetamo",
      type: "website",
      images: ogImage
        ? [
            {
              url: ogImage,
              width: 1200,
              height: 630,
              alt: title,
            },
          ]
        : undefined,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { id: routeValue } = await params;
  const detailData = await getInitialDetailData(routeValue);

  if (!detailData?.row?.id) {
    notFound();
  }

  if (detailData.row.slug && routeValue !== detailData.row.slug) {
    redirect(`/properti/${detailData.row.slug}`);
  }

  return (
    <PropertyDetailClient
      id={detailData.row.id}
      initialProperty={detailData.initialProperty}
      initialOrderedProperties={detailData.initialOrderedProperties}
    />
  );
}