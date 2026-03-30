import type { Metadata } from "next";
import HomeClient from "./home-client";
import { getSEOBySlug, getSiteUrl } from "@/lib/seo-server";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSEOBySlug("/");
  const siteUrl = getSiteUrl();

  const title = seo?.title || "Tetamo | Property Marketplace Indonesia";
  const description =
    seo?.description ||
    "Temukan properti dijual dan disewa di Indonesia dengan Tetamo.";

  const canonical =
    seo?.canonical &&
    seo.canonical !== "self-canonical" &&
    seo.canonical !== "none"
      ? seo.canonical
      : `${siteUrl}/`;

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
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function Page() {
  return <HomeClient />;
}