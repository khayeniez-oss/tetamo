"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  FileCheck2,
  FileSearch,
  MapPin,
  ShieldCheck,
  Target,
  TrendingUp,
  Wallet,
  Wrench,
  Users,
} from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { supabase } from "@/lib/supabase";

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

type GuideSection = {
  heading: string;
  paragraphs: string[];
};

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getInitials(title?: string | null) {
  if (!title) return "TB";

  return title
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

function decodeHtmlEntities(raw: string) {
  let decoded = raw;

  for (let i = 0; i < 3; i += 1) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = decoded;
    const next = textarea.value;

    if (next === decoded) break;
    decoded = next;
  }

  return decoded;
}

function normalizeText(value: string) {
  return value.replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
}

function compareText(value: string) {
  return normalizeText(value).toLowerCase();
}

function stripLeadingNumber(value: string) {
  return normalizeText(value).replace(/^\d+[\).\s-]+/, "").trim();
}

function isHeadingLike(value: string) {
  const text = stripLeadingNumber(value);
  if (!text) return false;

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const endsLikeSentence = /[.!?:;]$/.test(text);

  if (wordCount < 2 || wordCount > 12) return false;
  if (text.length > 90) return false;
  if (endsLikeSentence) return false;

  return true;
}

function isLiveNow(publishedAt?: string | null) {
  if (!publishedAt) return true;

  const publishTime = new Date(publishedAt).getTime();
  if (Number.isNaN(publishTime)) return false;

  return publishTime <= Date.now();
}

function cleanText(value?: string | null) {
  return String(value || "").trim();
}

function contentToLines(raw?: string | null, blogTitle?: string | null) {
  if (!raw || !raw.trim()) return [];

  const decoded = decodeHtmlEntities(raw);
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(decoded);

  let lines: string[] = [];

  if (hasHtml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(decoded, "text/html");

    const blockNodes = Array.from(
      doc.body.querySelectorAll("p, h1, h2, h3, h4, li, blockquote")
    );

    lines = blockNodes
      .map((node) => normalizeText(node.textContent || ""))
      .filter(Boolean);
  } else {
    lines = decoded
      .replace(/\r\n/g, "\n")
      .split(/\n+/)
      .map((line) => normalizeText(line))
      .filter(Boolean);
  }

  const cleaned: string[] = [];
  let removedTitle = false;

  for (const line of lines) {
    if (
      !removedTitle &&
      blogTitle &&
      compareText(line) === compareText(blogTitle)
    ) {
      removedTitle = true;
      continue;
    }

    cleaned.push(line);
  }

  return cleaned;
}

function extractFirstBodyImage(raw?: string | null) {
  if (!raw || !raw.trim()) return null;

  const decoded = decodeHtmlEntities(raw);
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(decoded);

  if (!hasHtml) return null;

  const parser = new DOMParser();
  const doc = parser.parseFromString(decoded, "text/html");
  const firstImg = doc.body.querySelector("img");

  return firstImg?.getAttribute("src") || null;
}

function buildGuideContent(lines: string[]) {
  const intro: string[] = [];
  const sections: GuideSection[] = [];

  let currentSection: GuideSection | null = null;
  let headingStarted = false;

  for (const line of lines) {
    if (isHeadingLike(line)) {
      headingStarted = true;
      currentSection = {
        heading: stripLeadingNumber(line),
        paragraphs: [],
      };
      sections.push(currentSection);
      continue;
    }

    if (!headingStarted) {
      intro.push(line);
      continue;
    }

    if (currentSection) {
      currentSection.paragraphs.push(line);
    }
  }

  return { intro, sections };
}

function getSectionIcon(heading: string) {
  const text = heading.toLowerCase();

  if (text.includes("goal") || text.includes("tujuan")) return Target;
  if (text.includes("location") || text.includes("lokasi")) return MapPin;
  if (
    text.includes("budget") ||
    text.includes("price") ||
    text.includes("anggaran") ||
    text.includes("harga")
  ) {
    return Wallet;
  }
  if (
    text.includes("legal") ||
    text.includes("document") ||
    text.includes("dokumen")
  ) {
    return FileCheck2;
  }
  if (text.includes("condition") || text.includes("kondisi")) return Wrench;
  if (text.includes("compare") || text.includes("banding")) return BarChart3;
  if (
    text.includes("reputation") ||
    text.includes("seller") ||
    text.includes("reputasi") ||
    text.includes("penjual")
  ) {
    return ShieldCheck;
  }
  if (
    text.includes("long-term") ||
    text.includes("value") ||
    text.includes("jangka panjang") ||
    text.includes("nilai")
  ) {
    return TrendingUp;
  }
  if (text.includes("professionals") || text.includes("profesional")) {
    return Users;
  }
  if (text.includes("final") || text.includes("akhir")) return FileSearch;

  return FileSearch;
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
  lang: string,
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

  if (lang === "id") {
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

export default function PublicBlogDetailPage() {
  const { lang } = useLanguage();
  const params = useParams();

  const slug =
    typeof params?.slug === "string"
      ? params.slug
      : Array.isArray(params?.slug)
        ? params.slug[0]
        : "";

  const [blog, setBlog] = useState<BlogDetail | null>(null);
  const [blocks, setBlocks] = useState<BlogContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadBlog() {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("blogs")
        .select(
          "id, title, title_id, slug, excerpt, excerpt_id, content, content_id, category, author_name, cover_image_url, view_count, published_at, created_at"
        )
        .eq("slug", slug)
        .eq("status", "published")
        .eq("access_type", "public")
        .single();

      if (ignore) return;

      if (error || !data || !isLiveNow(data.published_at)) {
        console.error("Failed to load blog:", error);
        setNotFound(true);
        setLoading(false);
        return;
      }

      const blogData = data as BlogDetail;

      const { data: blockData, error: blockError } = await supabase
        .from("blog_content_blocks")
        .select(
          "id, blog_id, block_type, step_number, heading, heading_id, content, content_id, image_url, image_alt, image_alt_id, caption, caption_id, sort_order, is_active"
        )
        .eq("blog_id", blogData.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (ignore) return;

      if (blockError) {
        console.error("Failed to load blog tutorial blocks:", blockError);
      }

      setBlog(blogData);
      setBlocks((blockData ?? []) as BlogContentBlock[]);
      setLoading(false);
    }

    loadBlog();

    return () => {
      ignore = true;
    };
  }, [slug]);

  const isTutorial = useMemo(() => {
    return isTutorialContent(blog, blocks);
  }, [blog, blocks]);

  const activeTitle = useMemo(() => {
    if (isTutorial) {
      return getTutorialTitle(lang, blog, blocks);
    }

    return lang === "id"
      ? blog?.title_id?.trim() || blog?.title?.trim() || ""
      : blog?.title?.trim() || blog?.title_id?.trim() || "";
  }, [isTutorial, lang, blog, blocks]);

  const activeExcerpt =
    lang === "id"
      ? blog?.excerpt_id?.trim() || blog?.excerpt?.trim() || ""
      : blog?.excerpt?.trim() || blog?.excerpt_id?.trim() || "";

  const activeContent =
    lang === "id"
      ? blog?.content_id?.trim() || blog?.content?.trim() || ""
      : blog?.content?.trim() || blog?.content_id?.trim() || "";

  const activeTutorialBlocks = useMemo(() => {
    return blocks.filter((block) => {
      return Boolean(
        cleanText(block.heading) ||
          cleanText(block.heading_id) ||
          cleanText(block.content) ||
          cleanText(block.content_id) ||
          cleanText(block.image_url)
      );
    });
  }, [blocks]);

  const guide = useMemo(() => {
    const lines = contentToLines(activeContent, activeTitle);
    return buildGuideContent(lines);
  }, [activeContent, activeTitle]);

  const firstBodyImage = useMemo(() => {
    return extractFirstBodyImage(activeContent);
  }, [activeContent]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-3xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm sm:p-8">
          {lang === "id" ? "Memuat artikel..." : "Loading article..."}
        </div>
      </main>
    );
  }

  if (notFound || !blog) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-bold text-[#1C1C1E] sm:text-2xl">
            {lang === "id" ? "Artikel tidak ditemukan" : "Article not found"}
          </h1>

          <p className="mt-3 text-sm text-gray-600">
            {lang === "id"
              ? "Artikel tidak tersedia."
              : "Article is unavailable."}
          </p>

          <Link
            href="/blog"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white"
          >
            <ArrowLeft size={16} />
            {lang === "id" ? "Kembali ke Blog" : "Back to Blog"}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/blog"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#1C1C1E] hover:opacity-70"
        >
          <ArrowLeft size={16} />
          {lang === "id" ? "Kembali ke Blog" : "Back to Blog"}
        </Link>

        <article className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          {blog.cover_image_url ? (
            <img
              src={blog.cover_image_url}
              alt={activeTitle || "Blog cover"}
              className="h-[220px] w-full object-cover sm:h-[300px] lg:h-[380px]"
            />
          ) : (
            <div className="flex h-[220px] w-full items-center justify-center bg-[#1C1C1E] text-4xl font-bold text-white sm:h-[300px]">
              {getInitials(activeTitle)}
            </div>
          )}

          <div className="p-5 sm:p-7 lg:p-8">
            <div className="flex flex-wrap items-center gap-2">
              {blog.category ? (
                <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-600">
                  {blog.category}
                </div>
              ) : null}

              <div className="inline-flex rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                {isTutorial
                  ? lang === "id"
                    ? "Tutorial"
                    : "Tutorial"
                  : lang === "id"
                    ? "Panduan"
                    : "Guide"}
              </div>
            </div>

            <h1 className="mt-4 text-2xl font-bold leading-tight text-[#1C1C1E] sm:text-3xl lg:text-4xl">
              {activeTitle}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 sm:text-sm">
              <span>{blog.author_name || "Tetamo Editorial"}</span>
              <span>•</span>
              <span>{formatDate(blog.published_at || blog.created_at)}</span>
              <span>•</span>
              <span>{blog.view_count ?? 0} views</span>
            </div>

            {activeExcerpt ? (
              <p className="mt-5 text-sm leading-7 text-gray-600 sm:text-base sm:leading-8">
                {activeExcerpt}
              </p>
            ) : null}

            {isTutorial ? (
              activeTutorialBlocks.length > 0 ? (
                <div className="mt-8 space-y-6">
                  <div className="rounded-3xl border border-gray-200 bg-[#FAFAF8] p-5 sm:p-6">
                    <h2 className="text-lg font-bold text-[#1C1C1E] sm:text-xl">
                      {lang === "id"
                        ? "Panduan Langkah demi Langkah"
                        : "Step-by-Step Tutorial"}
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-gray-600">
                      {lang === "id"
                        ? "Ikuti langkah-langkah berikut untuk menyelesaikan tutorial ini."
                        : "Follow the steps below to complete this tutorial."}
                    </p>
                  </div>

                  {activeTutorialBlocks.map((block, index) => {
                    const heading =
                      lang === "id"
                        ? cleanText(block.heading_id) || cleanText(block.heading)
                        : cleanText(block.heading) || cleanText(block.heading_id);

                    const content =
                      lang === "id"
                        ? cleanText(block.content_id) || cleanText(block.content)
                        : cleanText(block.content) || cleanText(block.content_id);

                    const caption =
                      lang === "id"
                        ? cleanText(block.caption_id) || cleanText(block.caption)
                        : cleanText(block.caption) || cleanText(block.caption_id);

                    const altText =
                      lang === "id"
                        ? cleanText(block.image_alt_id) ||
                          cleanText(block.image_alt) ||
                          heading ||
                          `Langkah ${index + 1}`
                        : cleanText(block.image_alt) ||
                          cleanText(block.image_alt_id) ||
                          heading ||
                          `Step ${index + 1}`;

                    return (
                      <section
                        key={block.id}
                        className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
                      >
                        <div className="p-5 sm:p-6">
                          <div className="inline-flex rounded-full bg-[#1C1C1E] px-3 py-1 text-xs font-semibold text-white">
                            {lang === "id"
                              ? `Langkah ${index + 1}`
                              : `Step ${index + 1}`}
                          </div>

                          {heading ? (
                            <h2 className="mt-4 text-lg font-bold text-[#1C1C1E] sm:text-xl">
                              {heading}
                            </h2>
                          ) : null}

                          {content ? (
                            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-700 sm:text-base sm:leading-8">
                              {content}
                            </p>
                          ) : null}
                        </div>

                        {block.image_url ? (
                          <div className="border-t border-gray-200 bg-[#FAFAF8] p-4 sm:p-5">
                            <img
                              src={block.image_url}
                              alt={altText}
                              className="w-full rounded-3xl border border-gray-200 bg-white object-cover"
                            />

                            {caption ? (
                              <p className="mt-3 text-center text-xs leading-5 text-gray-500 sm:text-sm">
                                {caption}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </section>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                  <p className="text-sm leading-7 text-gray-700 sm:text-base sm:leading-8">
                    {lang === "id"
                      ? "Konten tutorial belum tersedia."
                      : "Tutorial content is not available yet."}
                  </p>
                </div>
              )
            ) : (
              <>
                {guide.intro.length > 0 ? (
                  <div className="mt-6 rounded-3xl border border-gray-200 bg-[#FAFAF8] p-5 sm:p-6">
                    <div className="space-y-4 text-sm leading-7 text-gray-700 sm:text-base sm:leading-8">
                      {guide.intro.map((paragraph, index) => (
                        <p key={`intro-${index}`}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                ) : null}

                {firstBodyImage ? (
                  <div className="mt-6 overflow-hidden rounded-3xl border border-gray-200">
                    <img
                      src={firstBodyImage}
                      alt={activeTitle || "Blog image"}
                      className="h-[220px] w-full object-cover sm:h-[300px]"
                    />
                  </div>
                ) : null}

                {guide.sections.length > 0 ? (
                  <div className="mt-6 grid gap-4 sm:gap-5">
                    {guide.sections.map((section, index) => {
                      const Icon = getSectionIcon(section.heading);

                      return (
                        <section
                          key={`${section.heading}-${index}`}
                          className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition sm:p-6"
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1C1C1E] text-white">
                              <Icon size={18} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <h2 className="text-lg font-bold text-[#1C1C1E] sm:text-xl">
                                {section.heading}
                              </h2>

                              <div className="mt-3 space-y-4 text-sm leading-7 text-gray-700 sm:text-base sm:leading-8">
                                {section.paragraphs.map((paragraph, pIndex) => (
                                  <p key={`${section.heading}-${pIndex}`}>
                                    {paragraph}
                                  </p>
                                ))}
                              </div>
                            </div>
                          </div>
                        </section>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                    <p className="text-sm leading-7 text-gray-700 sm:text-base sm:leading-8">
                      {lang === "id"
                        ? "Konten belum tersedia."
                        : "Content is not available yet."}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </article>
      </div>
    </main>
  );
}