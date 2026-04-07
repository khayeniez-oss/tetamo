import type { MetadataRoute } from "next";
import {
  getIndexableSEOEntries,
  getPublicPropertiesForSitemap,
  getSiteUrl,
} from "@/lib/seo-server";

type SEOEntry = {
  slug?: string | null;
  updated_at?: string | null;
};

type SitemapProperty = {
  id?: string | null;
  slug?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

function normalizeSlug(value?: string | null) {
  const raw = String(value || "").trim();

  if (!raw) return "";
  if (raw === "/") return "/";

  return raw.startsWith("/") ? raw : `/${raw}`;
}

function buildAbsoluteUrl(siteUrl: string, slug: string) {
  if (slug === "/") return `${siteUrl}/`;
  return `${siteUrl}${slug}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const seoEntries = (await getIndexableSEOEntries()) as SEOEntry[];
  const properties = (await getPublicPropertiesForSitemap()) as SitemapProperty[];

  const staticUrls: MetadataRoute.Sitemap = seoEntries
    .filter((row) => {
      const slug = normalizeSlug(row.slug);

      if (!slug) return false;
      if (slug.includes("[")) return false;
      if (slug.includes("{")) return false;
      if (slug.includes("*")) return false;

      return true;
    })
    .map((row) => {
      const slug = normalizeSlug(row.slug);

      return {
        url: buildAbsoluteUrl(siteUrl, slug),
        lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
        changeFrequency: slug === "/" ? "daily" : "weekly",
        priority: slug === "/" ? 1 : 0.8,
      };
    });

  const listingUrls: MetadataRoute.Sitemap = properties
    .filter((property) => property?.id || property?.slug)
    .map((property) => {
      const publicPathPart = String(property.slug || property.id || "").trim();

      return {
        url: `${siteUrl}/properti/${publicPathPart}`,
        lastModified: new Date(
          property.updated_at || property.created_at || Date.now()
        ),
        changeFrequency: "daily",
        priority: 0.7,
      };
    });

  const deduped = new Map<string, MetadataRoute.Sitemap[number]>();

  for (const entry of [...staticUrls, ...listingUrls]) {
    deduped.set(entry.url, entry);
  }

  return Array.from(deduped.values());
}