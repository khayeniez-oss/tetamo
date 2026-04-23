import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import PublicBlogClient from "./PublicBlogClient";

type PublicBlog = {
  id: string;
  title: string | null;
  title_id: string | null;
  slug: string;
  excerpt: string | null;
  excerpt_id: string | null;
  category: string | null;
  author_name: string | null;
  cover_image_url: string | null;
  view_count: number | null;
  published_at: string | null;
  created_at: string | null;
};

export const metadata: Metadata = {
  title: "Tetamo Blog | Insight, Tips, dan Panduan Properti",
  description:
    "Baca artikel terbaru seputar properti, investasi, tren pasar, dan panduan praktis dari Tetamo.",
  alternates: {
    canonical: "https://www.tetamo.com/blog",
  },
  openGraph: {
    title: "Tetamo Blog | Insight, Tips, dan Panduan Properti",
    description:
      "Baca artikel terbaru seputar properti, investasi, tren pasar, dan panduan praktis dari Tetamo.",
    url: "https://www.tetamo.com/blog",
    siteName: "Tetamo",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

function isLiveNow(publishedAt?: string | null) {
  if (!publishedAt) return true;

  const publishTime = new Date(publishedAt).getTime();
  if (Number.isNaN(publishTime)) return false;

  return publishTime <= Date.now();
}

async function getPublicBlogs(): Promise<PublicBlog[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("blogs")
    .select(`
      id,
      title,
      title_id,
      slug,
      excerpt,
      excerpt_id,
      category,
      author_name,
      cover_image_url,
      view_count,
      published_at,
      created_at
    `)
    .eq("status", "published")
    .eq("access_type", "public")
    .order("published_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load public blogs:", error);
    return [];
  }

  return ((data ?? []) as PublicBlog[]).filter((blog) =>
    isLiveNow(blog.published_at)
  );
}

export default async function PublicBlogPage() {
  const blogs = await getPublicBlogs();

  return <PublicBlogClient initialBlogs={blogs} />;
}