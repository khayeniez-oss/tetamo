import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import PropertyDetailClient from "./PropertyDetailClient";
import { fillTemplate, getSEOTemplate, getSiteUrl } from "@/lib/seo-server";

type PageProps = {
  params: Promise<{ id: string }>;
};

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

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const siteUrl = getSiteUrl();

  const { data: property } = await supabase
    .from("properties")
    .select("id, title, city, area, province")
    .eq("id", id)
    .maybeSingle();

  const template = await getSEOTemplate("/properti/[id]");

  const title = fillTemplate(
    template?.title || "{title} in {city} | Tetamo",
    {
      title: property?.title || "Property",
      city: property?.city || property?.area || "",
      province: property?.province || "",
    }
  );

  const description = fillTemplate(
    template?.description ||
      "View complete property details, photos, location, and contact information on Tetamo.",
    {
      title: property?.title || "Property",
      city: property?.city || property?.area || "",
      province: property?.province || "",
    }
  );

  return {
    title,
    description,
    alternates: {
      canonical: `/properti/${id}`,
    },
    robots: {
      index: template?.indexed ?? true,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/properti/${id}`,
      siteName: "Tetamo",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <PropertyDetailClient id={id} />;
}