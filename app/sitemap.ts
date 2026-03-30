import type { MetadataRoute } from "next";
import {
  getIndexableSEOEntries,
  getPublicPropertiesForSitemap,
  getSiteUrl,
} from "@/lib/seo-server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const seoEntries = await getIndexableSEOEntries();
  const properties = await getPublicPropertiesForSitemap();

  const staticUrls: MetadataRoute.Sitemap = seoEntries
    .filter((row) => {
      const slug = String(row.slug || "");
      return !slug.includes("[") && !slug.includes("{") && !slug.includes("*");
    })
    .map((row) => {
      const slug = String(row.slug || "").startsWith("/")
        ? String(row.slug || "")
        : `/${String(row.slug || "")}`;

      return {
        url: `${siteUrl}${slug === "/" ? "" : slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: slug === "/" ? 1 : 0.8,
      };
    });

  const listingUrls: MetadataRoute.Sitemap = properties.map((property: any) => ({
    url: `${siteUrl}/properti/${property.kode}`,
    lastModified: new Date(property.updated_at || property.created_at || Date.now()),
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...staticUrls, ...listingUrls];
}