import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import PublicBlogDetailClient from "./PublicBlogDetailClient";

type BlogDetail = {
  id: string;
  title: string | null;
  title_id: string | null;
  slug: string;
  excerpt: string | null;
  excerpt_id: string | null;
  content: string | null;
  content_id: string | null;
  category: string | null;
  author_name: string | null;
  cover_image_url: string | null;
  view_count: number | null;
  published_at: string | null;
  created_at: string | null;
};

type BlogContentBlock = {
  id: string;
  blog_id: string;
  block_type: string | null;
  step_number: number | null;
  heading: string | null;
  heading_id: string | null;
  content: string | null;
  content_id: string | null;
  image_url: string | null;
  image_alt: string | null;
  image_alt_id: string | null;
  caption: string | null;
  caption_id: string | null;
  sort_order: number | null;
  is_active: boolean | null;
};

export const dynamic = "force-dynamic";

function cleanText(value?: string | null) {
  return String(value || "").trim();
}

function isLiveNow(publishedAt?: string | null) {
  if (!publishedAt) return true;

  const publishTime = new Date(publishedAt).getTime();
  if (Number.isNaN(publishTime)) return false;

  return publishTime <= Date.now();
}

function hasTutorialBlocks(blocks: BlogContentBlock[]) {
  return blocks.some((block) => {
    return Boolean(
      cleanText(block.heading) ||
        cleanText(block.heading_id) ||
        cleanText(block.content) ||
        cleanText(block.content_id) ||
        cleanText(block.image_url)
    );
  });
}

function isTutorialContent(blog: BlogDetail | null, blocks: BlogContentBlock[]) {
  const category = cleanText(blog?.category).toLowerCase();
  const hasBlocks = hasTutorialBlocks(blocks);
  const hasMainContent = Boolean(cleanText(blog?.content));
  const hasMainContentId = Boolean(cleanText(blog?.content_id));

  if (category === "tutorial") return true;
  if (hasBlocks && !hasMainContent && !hasMainContentId) return true;

  return false;
}

function getTutorialTitle(
  preferredLang: "en" | "id",
  blog: BlogDetail | null,
  blocks: BlogContentBlock[]
) {
  const firstBlock = blocks.find((block) => {
    return Boolean(
      cleanText(block.heading) ||
        cleanText(block.heading_id) ||
        cleanText(block.content) ||
        cleanText(block.content_id) ||
        cleanText(block.image_url)
    );
  });

  if (preferredLang === "id") {
    return (
      cleanText(firstBlock?.heading_id) ||
      cleanText(firstBlock?.heading) ||
      cleanText(blog?.title_id) ||
      cleanText(blog?.title)
    );
  }

  return (
    cleanText(firstBlock?.heading) ||
    cleanText(firstBlock?.heading_id) ||
    cleanText(blog?.title) ||
    cleanText(blog?.title_id)
  );
}

function getMetadataTitle(blog: BlogDetail, blocks: BlogContentBlock[]) {
  if (isTutorialContent(blog, blocks)) {
    return (
      getTutorialTitle("en", blog, blocks) ||
      getTutorialTitle("id", blog, blocks) ||
      "Tetamo Blog"
    );
  }

  return cleanText(blog.title) || cleanText(blog.title_id) || "Tetamo Blog";
}

function getMetadataDescription(blog: BlogDetail) {
  return (
    cleanText(blog.excerpt) ||
    cleanText(blog.excerpt_id) ||
    "Read the latest property insights, market updates, and practical guidance from Tetamo."
  );
}

async function getBlogBySlug(slug: string): Promise<{
  blog: BlogDetail;
  blocks: BlogContentBlock[];
} | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("blogs")
    .select(
      "id, title, title_id, slug, excerpt, excerpt_id, content, content_id, category, author_name, cover_image_url, view_count, published_at, created_at"
    )
    .eq("slug", slug)
    .eq("status", "published")
    .eq("access_type", "public")
    .limit(1)
    .maybeSingle();

  if (error || !data || !isLiveNow(data.published_at)) {
    return null;
  }

  const blog = data as BlogDetail;

  const { data: blockData, error: blockError } = await supabase
    .from("blog_content_blocks")
    .select(
      "id, blog_id, block_type, step_number, heading, heading_id, content, content_id, image_url, image_alt, image_alt_id, caption, caption_id, sort_order, is_active"
    )
    .eq("blog_id", blog.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (blockError) {
    console.error("Failed to load blog tutorial blocks:", blockError);
  }

  return {
    blog,
    blocks: (blockData ?? []) as BlogContentBlock[],
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getBlogBySlug(slug);

  if (!result) {
    return {
      title: "Article Not Found | Tetamo",
      description: "This Tetamo blog article is unavailable.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const { blog, blocks } = result;
  const title = `${getMetadataTitle(blog, blocks)} | Tetamo`;
  const description = getMetadataDescription(blog);
  const url = `https://www.tetamo.com/blog/${blog.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "Tetamo",
      type: "article",
      images: blog.cover_image_url
        ? [
            {
              url: blog.cover_image_url,
              width: 1200,
              height: 630,
              alt: getMetadataTitle(blog, blocks),
            },
          ]
        : [],
    },
    twitter: {
      card: blog.cover_image_url ? "summary_large_image" : "summary",
      title,
      description,
      images: blog.cover_image_url ? [blog.cover_image_url] : [],
    },
  };
}

export default async function PublicBlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getBlogBySlug(slug);

  if (!result) {
    notFound();
  }

  return (
    <PublicBlogDetailClient
      initialBlog={result.blog}
      initialBlocks={result.blocks}
    />
  );
}