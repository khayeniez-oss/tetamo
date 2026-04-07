import type { Metadata } from "next";
import { getSEOBySlug, getSiteUrl } from "@/lib/seo-server";

export const dynamic = "force-dynamic";

// Change this only if your real FAQ route is different.
const PAGE_SLUG = "/faq";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSEOBySlug(PAGE_SLUG);
  const siteUrl = getSiteUrl();

  const title = seo?.title || "FAQ | Tetamo Property Marketplace Indonesia";
  const description =
    seo?.description ||
    "Find answers to common questions about Tetamo, listings, verification, agents, owners, buyers, and platform support.";

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

export default function FAQLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}