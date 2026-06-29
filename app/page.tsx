import type { Metadata } from "next";
import HomeClient from "./home-client";
import { getSEOBySlug, getSiteUrl } from "@/lib/seo-server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSEOBySlug("/");
  const siteUrl = getSiteUrl();

  const title = seo?.title || "Tetamo | Property Marketplace Indonesia";
  const description =
    seo?.description ||
    "Browse properties for sale and rent in Indonesia with Tetamo.";

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
    verification: {
      other: {
        "facebook-domain-verification": "286u4enpbco0icw5hwrhe82eow8h3c",
      },
    },
  };
}

export default function Page() {
  return <HomeClient />;
}