import "server-only";
import { createClient } from "@supabase/supabase-js";

type SEOType = "STATIC" | "TEMPLATE" | "TECHNICAL";

export type SEOPageRow = {
  id: string;
  page: string | null;
  slug: string | null;
  title: string | null;
  description: string | null;
  canonical: string | null;
  indexed: boolean | null;
  included_in_sitemap: boolean | null;
  type: SEOType | null;
  sort_order: number | null;
};

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://www.tetamo.com";

const SUPABASE_QUERY_TIMEOUT_MS = 8000;
const SITEMAP_PROPERTY_LIMIT = 1500;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!serviceRole) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function withTimeout<T>(
  promise: PromiseLike<T>,
  fallback: T,
  label: string,
  ms = SUPABASE_QUERY_TIMEOUT_MS,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.error(`${label} timeout after ${ms}ms`);
      resolve(fallback);
    }, ms);
  });

  try {
    return await Promise.race([Promise.resolve(promise), timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function getSiteUrl() {
  return SITE_URL;
}

export async function getSEOBySlug(slug: string) {
  try {
    const supabase = getSupabaseAdmin();

    const response = await withTimeout<any>(
      supabase
        .from("seo_pages")
        .select(
          "id, page, slug, title, description, canonical, indexed, included_in_sitemap, type, sort_order",
        )
        .eq("slug", slug)
        .maybeSingle() as any,
      { data: null, error: null },
      "getSEOBySlug",
    );

    if (response.error) {
      console.error("getSEOBySlug error:", response.error);
      return null;
    }

    return (response.data as SEOPageRow | null) || null;
  } catch (error) {
    console.error("getSEOBySlug fatal error:", error);
    return null;
  }
}

export async function getSEOTemplate(slug: string) {
  try {
    const supabase = getSupabaseAdmin();

    const response = await withTimeout<any>(
      supabase
        .from("seo_pages")
        .select(
          "id, page, slug, title, description, canonical, indexed, included_in_sitemap, type, sort_order",
        )
        .eq("slug", slug)
        .eq("type", "TEMPLATE")
        .maybeSingle() as any,
      { data: null, error: null },
      "getSEOTemplate",
    );

    if (response.error) {
      console.error("getSEOTemplate error:", response.error);
      return null;
    }

    return (response.data as SEOPageRow | null) || null;
  } catch (error) {
    console.error("getSEOTemplate fatal error:", error);
    return null;
  }
}

export async function getIndexableSEOEntries() {
  try {
    const supabase = getSupabaseAdmin();

    const response = await withTimeout<any>(
      supabase
        .from("seo_pages")
        .select(
          "id, page, slug, title, description, canonical, indexed, included_in_sitemap, type, sort_order, updated_at",
        )
        .eq("indexed", true)
        .eq("included_in_sitemap", true)
        .order("sort_order", { ascending: true }) as any,
      { data: [], error: null },
      "getIndexableSEOEntries",
    );

    if (response.error) {
      console.error("getIndexableSEOEntries error:", response.error);
      return [];
    }

    return response.data || [];
  } catch (error) {
    console.error("getIndexableSEOEntries fatal error:", error);
    return [];
  }
}

export async function getPublicPropertiesForSitemap() {
  try {
    const supabase = getSupabaseAdmin();

    const response = await withTimeout<any>(
      supabase
        .from("properties")
        .select(
          "id, slug, kode, updated_at, created_at, status, verification_status, transaction_status",
        )
        .neq("status", "rejected")
        .or("verification_status.eq.verified,verification_status.is.null")
        .eq("transaction_status", "available")
        .order("updated_at", { ascending: false })
        .limit(SITEMAP_PROPERTY_LIMIT) as any,
      { data: [], error: null },
      "getPublicPropertiesForSitemap",
    );

    if (response.error) {
      console.error("getPublicPropertiesForSitemap error:", response.error);
      return [];
    }

    return response.data || [];
  } catch (error) {
    console.error("getPublicPropertiesForSitemap fatal error:", error);
    return [];
  }
}

export function fillTemplate(
  template: string,
  values: Record<string, string | number | null | undefined>,
) {
  let output = template;

  for (const [key, rawValue] of Object.entries(values)) {
    const value = String(rawValue ?? "").trim();
    output = output.replaceAll(`{${key}}`, value);
  }

  return output.replace(/\s+/g, " ").trim();
}