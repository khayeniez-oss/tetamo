import { Suspense } from "react";
import type { Metadata } from "next";
import PropertiPageClient from "./PropertiPageClient";
import { getSEOBySlug, getSiteUrl } from "@/lib/seo-server";

export const dynamic = "force-dynamic";

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

export default function PropertiPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white text-gray-900" />}>
      <PropertiPageClient />
    </Suspense>
  );
}