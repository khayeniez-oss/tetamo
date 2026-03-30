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

export function getSiteUrl() {
  return SITE_URL;
}

export async function getSEOBySlug(slug: string) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("seo_pages")
    .select(
      "id, page, slug, title, description, canonical, indexed, included_in_sitemap, type, sort_order"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("getSEOBySlug error:", error);
    return null;
  }

  return (data as SEOPageRow | null) || null;
}

export async function getSEOTemplate(slug: string) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("seo_pages")
    .select(
      "id, page, slug, title, description, canonical, indexed, included_in_sitemap, type, sort_order"
    )
    .eq("slug", slug)
    .eq("type", "TEMPLATE")
    .maybeSingle();

  if (error) {
    console.error("getSEOTemplate error:", error);
    return null;
  }

  return (data as SEOPageRow | null) || null;
}

export async function getIndexableSEOEntries() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("seo_pages")
    .select(
      "id, page, slug, title, description, canonical, indexed, included_in_sitemap, type, sort_order, updated_at"
    )
    .eq("indexed", true)
    .eq("included_in_sitemap", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("getIndexableSEOEntries error:", error);
    return [];
  }

  return data || [];
}

export async function getPublicPropertiesForSitemap() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("properties")
    .select(
      "id, kode, updated_at, created_at, status, verification_status, transaction_status"
    )
    .neq("status", "rejected")
    .or("verification_status.eq.verified,verification_status.is.null")
    .eq("transaction_status", "available")
    .order("updated_at", { ascending: false })
    .limit(5000);

  if (error) {
    console.error("getPublicPropertiesForSitemap error:", error);
    return [];
  }

  return data || [];
}

export function fillTemplate(
  template: string,
  values: Record<string, string | number | null | undefined>
) {
  let output = template;

  for (const [key, rawValue] of Object.entries(values)) {
    const value = String(rawValue ?? "").trim();
    output = output.replaceAll(`{${key}}`, value);
  }

  return output.replace(/\s+/g, " ").trim();
}