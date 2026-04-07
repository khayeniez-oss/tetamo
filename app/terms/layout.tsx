import type { Metadata } from "next";
import { getSEOBySlug, getSiteUrl } from "@/lib/seo-server";

export const dynamic = "force-dynamic";

// Change this only if your real terms route is different.
const PAGE_SLUG = "/terms";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSEOBySlug(PAGE_SLUG);
  const siteUrl = getSiteUrl();

  const title =
    seo?.title || "Terms & Conditions | Tetamo Property Marketplace Indonesia";
  const description =
    seo?.description ||
    "Read Tetamo's Terms & Conditions for platform use, listings, accounts, responsibilities, and general rules.";

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

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}