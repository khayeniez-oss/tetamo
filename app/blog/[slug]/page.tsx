"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { supabase } from "@/lib/supabase";

/* =========================
TYPES
========================= */

type BlogDetail = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  category: string | null;
  author_name: string | null;
  cover_image_url: string | null;
  view_count: number | null;
  published_at: string | null;
  created_at: string | null;
};

/* =========================
HELPERS
========================= */

function formatBlogDate(value?: string | null) {
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanText(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
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

function isHeadingLike(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const withoutNumber = trimmed.replace(/^\d+[\).\s-]+/, "").trim();
  const wordCount = withoutNumber.split(/\s+/).filter(Boolean).length;

  if (/^\d+[\).\s-]+/.test(trimmed) && wordCount <= 12) return true;

  const hasSentenceEnding = /[.!?]$/.test(trimmed);
  const shortEnough = trimmed.length <= 90;
  const wordsOkay = wordCount >= 2 && wordCount <= 10;

  if (!hasSentenceEnding && shortEnough && wordsOkay) return true;

  return false;
}

function normalizePlainTextContent(raw: string, blogTitle?: string | null) {
  const lines = raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim());

  const blocks: string[] = [];
  let currentParagraph: string[] = [];
  let skippedDuplicateTitle = false;

  const flushParagraph = () => {
    if (!currentParagraph.length) return;
    blocks.push(`<p>${escapeHtml(currentParagraph.join(" "))}</p>`);
    currentParagraph = [];
  };

  for (const line of lines) {
    if (!line) {
      flushParagraph();
      continue;
    }

    if (
      !skippedDuplicateTitle &&
      blogTitle &&
      cleanText(line) === cleanText(blogTitle)
    ) {
      skippedDuplicateTitle = true;
      continue;
    }

    if (isHeadingLike(line)) {
      flushParagraph();
      const headingText = line.replace(/^\d+[\).\s-]+/, "").trim();
      blocks.push(`<h2>${escapeHtml(headingText)}</h2>`);
      continue;
    }

    currentParagraph.push(line);
  }

  flushParagraph();

  return blocks.join("");
}

function sanitizeAndUpgradeHtml(raw: string, blogTitle?: string | null) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, "text/html");

  doc.querySelectorAll("script, style").forEach((node) => node.remove());

  const allowedTags = new Set([
    "P",
    "BR",
    "H1",
    "H2",
    "H3",
    "H4",
    "UL",
    "OL",
    "LI",
    "BLOCKQUOTE",
    "STRONG",
    "B",
    "EM",
    "I",
    "U",
    "A",
    "IMG",
    "DIV",
    "SPAN",
  ]);

  const nodes = Array.from(doc.body.querySelectorAll("*"));

  for (const node of nodes) {
    const tag = node.tagName.toUpperCase();

    if (!allowedTags.has(tag)) {
      const parent = node.parentNode;
      while (node.firstChild) {
        parent?.insertBefore(node.firstChild, node);
      }
      parent?.removeChild(node);
      continue;
    }

    const attrs = Array.from(node.attributes);

    for (const attr of attrs) {
      const name = attr.name.toLowerCase();
      const keepHref = tag === "A" && name === "href";
      const keepImg = tag === "IMG" && (name === "src" || name === "alt");

      if (!keepHref && !keepImg) {
        node.removeAttribute(attr.name);
      }
    }

    if (tag === "A") {
      const href = node.getAttribute("href") || "#";
      node.setAttribute("href", href);
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noreferrer noopener");
      node.setAttribute("class", "font-semibold underline underline-offset-4");
    }

    if (tag === "IMG") {
      if (!node.getAttribute("alt")) {
        node.setAttribute("alt", "Blog image");
      }
      node.setAttribute("class", "my-8 w-full rounded-3xl object-cover");
    }
  }

  doc.body.querySelectorAll("div").forEach((div) => {
    const replacement = doc.createElement("p");
    replacement.innerHTML = div.innerHTML;
    div.replaceWith(replacement);
  });

  doc.body.querySelectorAll("span").forEach((span) => {
    const parent = span.parentNode;
    while (span.firstChild) {
      parent?.insertBefore(span.firstChild, span);
    }
    parent?.removeChild(span);
  });

  const paragraphs = Array.from(doc.body.querySelectorAll("p"));
  let removedDuplicateTitle = false;

  for (const p of paragraphs) {
    const text = (p.textContent || "").replace(/\u00a0/g, " ").trim();
    const hasImage = !!p.querySelector("img");
    const hasList = !!p.querySelector("ul, ol, li");
    const hasLinkOnly = !!p.querySelector("a");

    if (!text && !hasImage) {
      p.remove();
      continue;
    }

    if (
      !removedDuplicateTitle &&
      blogTitle &&
      cleanText(text) === cleanText(blogTitle)
    ) {
      removedDuplicateTitle = true;
      p.remove();
      continue;
    }

    if (!hasImage && !hasList && !hasLinkOnly && isHeadingLike(text)) {
      const h2 = doc.createElement("h2");
      h2.textContent = text.replace(/^\d+[\).\s-]+/, "").trim();
      p.replaceWith(h2);
      continue;
    }
  }

  return doc.body.innerHTML.trim();
}

function normalizeBlogContent(raw?: string | null, blogTitle?: string | null) {
  if (!raw || !raw.trim()) return "";

  const decoded = decodeHtmlEntities(raw.trim());
  const hasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(decoded);

  if (!hasHtmlTags) {
    return normalizePlainTextContent(decoded, blogTitle);
  }

  return sanitizeAndUpgradeHtml(decoded, blogTitle);
}

/* =========================
PAGE
========================= */

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
  const [renderedContent, setRenderedContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const viewTrackedRef = useRef(false);

  useEffect(() => {
    let ignore = false;

    async function loadBlog() {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("blogs")
        .select(`
          id,
          title,
          slug,
          excerpt,
          content,
          category,
          author_name,
          cover_image_url,
          view_count,
          published_at,
          created_at
        `)
        .eq("slug", slug)
        .eq("status", "published")
        .eq("access_type", "public")
        .single();

      if (ignore) return;

      if (error || !data) {
        console.error("Failed to load public blog:", error);
        setNotFound(true);
        setLoading(false);
        return;
      }

      const typedBlog = data as BlogDetail;

      setBlog(typedBlog);
      setRenderedContent(normalizeBlogContent(typedBlog.content, typedBlog.title));
      setLoading(false);

      if (viewTrackedRef.current) return;

      try {
        const storageKey = `tetamo_blog_viewed_${typedBlog.id}`;
        const alreadyViewed =
          typeof window !== "undefined" &&
          window.sessionStorage.getItem(storageKey) === "1";

        if (!alreadyViewed) {
          viewTrackedRef.current = true;

          const nextViewCount = (typedBlog.view_count ?? 0) + 1;

          setBlog((prev) =>
            prev
              ? {
                  ...prev,
                  view_count: nextViewCount,
                }
              : prev
          );

          const { error: updateError } = await supabase
            .from("blogs")
            .update({ view_count: nextViewCount })
            .eq("id", typedBlog.id);

          if (updateError) {
            console.error("Failed to update blog view count:", updateError);
          } else if (typeof window !== "undefined") {
            window.sessionStorage.setItem(storageKey, "1");
          }
        }
      } catch (viewError) {
        console.error("Failed to track blog view:", viewError);
      }
    }

    loadBlog();

    return () => {
      ignore = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          {lang === "id" ? "Memuat artikel..." : "Loading article..."}
        </div>
      </main>
    );
  }

  if (notFound || !blog) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-[#1C1C1E]">
            {lang === "id" ? "Artikel tidak ditemukan" : "Article not found"}
          </h1>

          <p className="mt-3 text-sm leading-7 text-gray-600">
            {lang === "id"
              ? "Artikel yang Anda cari tidak tersedia, belum dipublikasikan, atau URL-nya tidak valid."
              : "The article you are looking for is unavailable, unpublished, or the URL is invalid."}
          </p>

          <Link
            href="/blog"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#1C1C1E] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            <ArrowLeft size={16} />
            {lang === "id" ? "Kembali ke Blog" : "Back to Blog"}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      <section className="px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#1C1C1E] hover:opacity-70"
          >
            <ArrowLeft size={16} />
            {lang === "id" ? "Kembali ke Blog" : "Back to Blog"}
          </Link>
        </div>
      </section>

      <section className="px-4 pb-12 sm:px-6 lg:px-8 lg:pb-16">
        <article className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          {blog.cover_image_url ? (
            <img
              src={blog.cover_image_url}
              alt={blog.title}
              className="h-[260px] w-full object-cover sm:h-[360px] lg:h-[440px]"
            />
          ) : (
            <div className="flex h-[260px] w-full items-center justify-center bg-[#1C1C1E] text-5xl font-bold text-white sm:h-[360px] lg:h-[440px]">
              {getInitials(blog.title)}
            </div>
          )}

          <div className="p-6 sm:p-8 lg:p-10">
            {blog.category && (
              <div className="mb-4 inline-flex rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-gray-600">
                {blog.category}
              </div>
            )}

            <h1 className="text-3xl font-bold leading-tight text-[#1C1C1E] sm:text-4xl">
              {blog.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
              <span>{blog.author_name || "Tetamo Editorial"}</span>
              <span>•</span>
              <span>{formatBlogDate(blog.published_at || blog.created_at)}</span>
              <span>•</span>
              <span>{blog.view_count ?? 0} views</span>
            </div>

            {blog.excerpt && (
              <p className="mt-6 text-base leading-8 text-gray-600 sm:text-lg">
                {blog.excerpt}
              </p>
            )}

            <div className="mt-8 border-t border-gray-100 pt-8">
              <div
                className="prose prose-base max-w-none text-gray-700
                  prose-headings:font-bold prose-headings:text-[#1C1C1E]
                  prose-h1:mt-0 prose-h1:mb-6 prose-h1:text-3xl
                  prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-2xl
                  prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-xl
                  prose-p:my-5 prose-p:leading-9
                  prose-ul:my-5 prose-ul:pl-6
                  prose-ol:my-5 prose-ol:pl-6
                  prose-li:my-2 prose-li:leading-8
                  prose-blockquote:my-6 prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic
                  prose-img:my-8 prose-img:w-full prose-img:rounded-3xl"
                dangerouslySetInnerHTML={{
                  __html:
                    renderedContent ||
                    "<p style='color:#9ca3af;'>Article content is not available yet.</p>",
                }}
              />
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}