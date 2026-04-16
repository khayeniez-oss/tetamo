import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import MotorDetailClient from "./MotorDetailClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

type VehicleRow = Record<string, any>;
type VehicleMediaRow = Record<string, any>;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://www.tetamo.com";

function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function cleanText(value?: string | null) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function formatPriceIDR(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) return "";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function mapBodyType(row: VehicleRow) {
  return cleanText(
    row?.body_type ||
      row?.bodyType ||
      row?.vehicle_body_type ||
      row?.category ||
      ""
  );
}

function buildMotorTitle(motor: VehicleRow) {
  const title = cleanText(motor?.title) || "Motorbike";
  const area = cleanText(motor?.city || motor?.area || motor?.province);

  if (area) return `${title} for Sale in ${area} | Tetamo`;
  return `${title} | Tetamo`;
}

function buildMotorDescription(motor: VehicleRow) {
  const title = cleanText(motor?.title) || "Motorbike";
  const bodyType = mapBodyType(motor);
  const area = cleanText(motor?.city || motor?.area || motor?.province);
  const year = cleanText(motor?.year);
  const transmission = cleanText(motor?.transmission);
  const fuel = cleanText(motor?.fuel);
  const mileage = cleanText(motor?.mileage || motor?.odometer);
  const price = formatPriceIDR(motor?.price);
  const description = cleanText(motor?.description);

  const parts = [
    bodyType,
    area,
    year,
    transmission,
    fuel,
    mileage,
    price ? `Price ${price}` : "",
    description,
  ].filter(Boolean);

  return parts.length > 0
    ? `${title}. ${parts.join(". ")}`
    : `Explore ${title} on Tetamo.`;
}

async function fetchMotorBySlugOrId(idOrSlug: string) {
  const supabase = getSupabaseServerClient();
  const key = cleanText(idOrSlug);

  async function fetchFromTable(tableName: "vehicle_marketplace_view" | "vehicles") {
    const bySlug = await supabase
      .from(tableName)
      .select("*")
      .eq("vehicle_type", "motor")
      .eq("slug", key)
      .limit(1)
      .maybeSingle();

    if (!bySlug.error && bySlug.data) {
      return bySlug.data as VehicleRow;
    }

    const byId = await supabase
      .from(tableName)
      .select("*")
      .eq("vehicle_type", "motor")
      .eq("id", key)
      .limit(1)
      .maybeSingle();

    if (!byId.error && byId.data) {
      return byId.data as VehicleRow;
    }

    return null;
  }

  let row = await fetchFromTable("vehicle_marketplace_view");

  if (!row) {
    row = await fetchFromTable("vehicles");
  }

  if (!row) return null;

  let imageUrl = cleanText(row?.cover_image_url);

  if (!imageUrl) {
    const mediaResult = await supabase
      .from("vehicle_media")
      .select("*")
      .eq("vehicle_id", String(row.id))
      .eq("media_type", "photo")
      .order("is_cover", { ascending: false })
      .order("sort_order", { ascending: true })
      .limit(1);

    if (!mediaResult.error) {
      const firstPhoto = (mediaResult.data?.[0] || null) as VehicleMediaRow | null;
      imageUrl = cleanText(firstPhoto?.file_url || firstPhoto?.public_url);
    }
  }

  return {
    row,
    imageUrl,
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  try {
    const { id: routeValue } = await params;
    const result = await fetchMotorBySlugOrId(routeValue);
    const canonical = `${SITE_URL}/vehicles/motor/${routeValue}`;

    if (!result) {
      return {
        title: "Motorbike Not Found | Tetamo",
        description: "This motorbike is no longer available on Tetamo.",
        alternates: { canonical },
        robots: { index: false, follow: false },
      };
    }

    const { row, imageUrl } = result;
    const finalPathPart = cleanText(row?.slug) || cleanText(row?.id) || routeValue;
    const finalCanonical = `${SITE_URL}/vehicles/motor/${finalPathPart}`;
    const title = buildMotorTitle(row);
    const description = buildMotorDescription(row);

    return {
      title,
      description,
      alternates: { canonical: finalCanonical },
      robots: { index: true, follow: true },
      openGraph: {
        title,
        description,
        url: finalCanonical,
        siteName: "Tetamo",
        type: "website",
        images: imageUrl
          ? [
              {
                url: imageUrl,
                width: 1200,
                height: 630,
                alt: title,
              },
            ]
          : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: imageUrl ? [imageUrl] : undefined,
      },
    };
  } catch {
    const { id: routeValue } = await params;
    const canonical = `${SITE_URL}/vehicles/motor/${routeValue}`;

    return {
      title: "Motorbike Detail | Tetamo",
      description: "Explore motorbike details on Tetamo.",
      alternates: { canonical },
      robots: { index: false, follow: false },
    };
  }
}

export default async function Page({ params }: PageProps) {
  const { id: routeValue } = await params;
  const result = await fetchMotorBySlugOrId(routeValue);

  if (!result?.row?.id) {
    notFound();
  }

  const slug = cleanText(result.row.slug);

  if (slug && routeValue !== slug) {
    redirect(`/vehicles/motor/${slug}`);
  }

  return <MotorDetailClient id={String(result.row.id)} />;
}