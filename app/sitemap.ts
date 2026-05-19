import type { MetadataRoute } from "next";
import {
  getIndexableSEOEntries,
  getPublicPropertiesForSitemap,
  getSiteUrl,
} from "@/lib/seo-server";

export const dynamic = "force-dynamic";

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

type SitemapEntry = MetadataRoute.Sitemap[number];

const FALLBACK_STATIC_SLUGS: Array<{
  slug: string;
  changeFrequency: SitemapEntry["changeFrequency"];
  priority: number;
}> = [
  { slug: "/", changeFrequency: "daily", priority: 1 },
  { slug: "/properti", changeFrequency: "daily", priority: 0.9 },
  { slug: "/about-us", changeFrequency: "weekly", priority: 0.7 },
  { slug: "/faq", changeFrequency: "weekly", priority: 0.7 },
];

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

function safeDate(value?: string | null) {
  if (!value) return new Date();

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return new Date();

  return date;
}

async function getSafeSitemapData() {
  const [seoEntriesResult, propertiesResult] = await Promise.allSettled([
    getIndexableSEOEntries(),
    getPublicPropertiesForSitemap(),
  ]);

  const seoEntries =
    seoEntriesResult.status === "fulfilled"
      ? (seoEntriesResult.value as SEOEntry[])
      : [];

  const properties =
    propertiesResult.status === "fulfilled"
      ? (propertiesResult.value as SitemapProperty[])
      : [];

  if (seoEntriesResult.status === "rejected") {
    console.error("sitemap seoEntries fallback:", seoEntriesResult.reason);
  }

  if (propertiesResult.status === "rejected") {
    console.error("sitemap properties fallback:", propertiesResult.reason);
  }

  return {
    seoEntries,
    properties,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const { seoEntries, properties } = await getSafeSitemapData();

  const fallbackUrls: MetadataRoute.Sitemap = FALLBACK_STATIC_SLUGS.map(
    (entry) => ({
      url: buildAbsoluteUrl(siteUrl, entry.slug),
      lastModified: new Date(),
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
    }),
  );

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
        lastModified: safeDate(row.updated_at),
        changeFrequency: slug === "/" ? "daily" : "weekly",
        priority: slug === "/" ? 1 : 0.8,
      };
    });

  const listingUrls: MetadataRoute.Sitemap = properties
    .filter((property) => property?.id || property?.slug)
    .map((property) => {
      const publicPathPart = String(property.slug || property.id || "").trim();

      return {
        url: `${siteUrl}/properti/${encodeURIComponent(publicPathPart)}`,
        lastModified: safeDate(property.updated_at || property.created_at),
        changeFrequency: "daily",
        priority: 0.7,
      };
    });

  const deduped = new Map<string, MetadataRoute.Sitemap[number]>();

  for (const entry of [...fallbackUrls, ...staticUrls, ...listingUrls]) {
    deduped.set(entry.url, entry);
  }

  return Array.from(deduped.values());
}