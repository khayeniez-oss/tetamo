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

async function getPropertyTemplate() {
  const slugTemplate = await getSEOTemplate("/properti/[slug]");
  if (slugTemplate) return slugTemplate;
  return getSEOTemplate("/properti/[id]");
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
  const property = await getPropertyBySlugOrId(routeValue);

  if (!property?.id) {
    notFound();
  }

  if (property.slug && routeValue !== property.slug) {
    redirect(`/properti/${property.slug}`);
  }

  return <PropertyDetailClient id={property.id} />;
}