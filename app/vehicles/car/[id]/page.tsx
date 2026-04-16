import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import CarDetailClient from "./CarDetailClient";

type MaybePromise<T> = T | Promise<T>;

type PageProps = {
  params: MaybePromise<{
    id: string;
  }>;
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

async function resolveParams(params: MaybePromise<{ id: string }>) {
  return await params;
}

function formatIdr(value: number | null | undefined) {
  if (typeof value !== "number") return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function mapBodyType(row: VehicleRow) {
  return String(
    row?.body_type ||
      row?.bodyType ||
      row?.vehicle_body_type ||
      row?.category ||
      ""
  ).trim();
}

function buildCarTitle(row: VehicleRow) {
  const title = String(row?.title || "Car");
  const area = String(row?.city || row?.area || "").trim();

  if (area) {
    return `${title} for Sale in ${area} | Tetamo`;
  }

  return `${title} | Tetamo`;
}

function buildCarDescription(row: VehicleRow) {
  const title = String(row?.title || "Car");
  const city = String(row?.city || row?.area || "").trim();
  const province = String(row?.province || "").trim();
  const year = String(row?.year || "").trim();
  const bodyType = mapBodyType(row);
  const transmission = String(row?.transmission || "").trim();
  const fuel = String(row?.fuel || "").trim();
  const mileage = String(row?.mileage || row?.odometer || "").trim();
  const price = typeof row?.price === "number" ? formatIdr(row.price) : "";

  const parts = [
    city || province ? `${city}${city && province ? ", " : ""}${province}` : "",
    year,
    bodyType,
    transmission,
    fuel,
    mileage,
    price ? `Price ${price}` : "",
  ].filter(Boolean);

  if (parts.length > 0) {
    return `${title} in ${parts.join(" • ")} on Tetamo.`;
  }

  return `Explore ${title} on Tetamo.`;
}

async function fetchVehicleBySlugOrId(idOrSlug: string) {
  const supabase = getSupabaseServerClient();
  const key = String(idOrSlug || "").trim();

  async function fetchFromTable(tableName: "vehicle_marketplace_view" | "vehicles") {
    const bySlug = await supabase
      .from(tableName)
      .select("*")
      .eq("vehicle_type", "car")
      .eq("slug", key)
      .limit(1)
      .maybeSingle();

    if (!bySlug.error && bySlug.data) {
      return bySlug.data as VehicleRow;
    }

    const byId = await supabase
      .from(tableName)
      .select("*")
      .eq("vehicle_type", "car")
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

  let imageUrl = String(row?.cover_image_url || "").trim();

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
      imageUrl = String(
        firstPhoto?.file_url || firstPhoto?.public_url || ""
      ).trim();
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
    const resolved = await resolveParams(params);
    const result = await fetchVehicleBySlugOrId(resolved.id);

    if (!result) {
      const fallbackUrl = `${SITE_URL}/vehicles/car/${resolved.id}`;

      return {
        title: "Car Detail | Tetamo",
        description: "Explore car details on Tetamo.",
        alternates: {
          canonical: fallbackUrl,
        },
        robots: {
          index: false,
          follow: false,
        },
      };
    }

    const { row, imageUrl } = result;
    const slugOrId = String(row?.slug || row?.id || resolved.id);
    const canonicalUrl = `${SITE_URL}/vehicles/car/${slugOrId}`;
    const title = buildCarTitle(row);
    const description = buildCarDescription(row);

    return {
      title,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        siteName: "Tetamo",
        type: "article",
        images: imageUrl
          ? [
              {
                url: imageUrl,
                width: 1200,
                height: 630,
                alt: String(row?.title || "Car"),
              },
            ]
          : [],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: imageUrl ? [imageUrl] : [],
      },
      robots: {
        index: true,
        follow: true,
      },
    };
  } catch {
    const resolved = await resolveParams(params);
    const fallbackUrl = `${SITE_URL}/vehicles/car/${resolved.id}`;

    return {
      title: "Car Detail | Tetamo",
      description: "Explore car details on Tetamo.",
      alternates: {
        canonical: fallbackUrl,
      },
      robots: {
        index: false,
        follow: false,
      },
    };
  }
}

export default async function CarDetailPage({ params }: PageProps) {
  const resolved = await resolveParams(params);
  return <CarDetailClient id={resolved.id} />;
}