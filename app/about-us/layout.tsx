import type { Metadata } from "next";
import { getSEOBySlug, getSiteUrl } from "@/lib/seo-server";

export const dynamic = "force-dynamic";

// Change this only if your real route is different.
const PAGE_SLUG = "/about-us";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSEOBySlug(PAGE_SLUG);
  const siteUrl = getSiteUrl();

  const title = seo?.title || "About Tetamo | Property Marketplace Indonesia";
  const description =
    seo?.description ||
    "Learn about Tetamo, our mission, our vision, and how we are building a more modern and trusted property marketplace in Indonesia.";

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

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}