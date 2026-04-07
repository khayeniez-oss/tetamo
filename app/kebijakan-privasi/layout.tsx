import type { Metadata } from "next";
import { getSEOBySlug, getSiteUrl } from "@/lib/seo-server";

export const dynamic = "force-dynamic";

const PAGE_SLUG = "/kebijakan-privasi";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSEOBySlug(PAGE_SLUG);
  const siteUrl = getSiteUrl();

  const title =
    seo?.title || "Privacy Policy | Tetamo Property Marketplace Indonesia";
  const description =
    seo?.description ||
    "Read Tetamo's Privacy Policy to understand how personal information is collected, used, stored, and protected on the platform.";

  const canonical =
    seo?.canonical &&
    seo.canonical !== "self-canonical" &&
    seo.canonical !== "none"
      ? seo.canonical
      : `${siteUrl}${PAGE_SLUG}`;

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

export default function KebijakanPrivasiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}