"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  Eye,
  Heart,
  Search,
  Share2,
} from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { supabase } from "@/lib/supabase";

/* =========================
TYPES
========================= */

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

function isLiveNow(publishedAt?: string | null) {
  if (!publishedAt) return true;

  const publishTime = new Date(publishedAt).getTime();
  if (Number.isNaN(publishTime)) return false;

  return publishTime <= Date.now();
}

function getBlogUrl(slug: string) {
  if (typeof window === "undefined") return `/blog/${slug}`;
  return `${window.location.origin}/blog/${slug}`;
}

/* =========================
PAGE
========================= */

export default function PublicBlogPage() {
  const { lang } = useLanguage();

  const [blogs, setBlogs] = useState<PublicBlog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [savedBlogs, setSavedBlogs] = useState<Record<string, boolean>>({});
  const [likedBlogs, setLikedBlogs] = useState<Record<string, boolean>>({});
  const [shareCopiedId, setShareCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadBlogs() {
      setLoading(true);

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

        if (!ignore) {
          setBlogs([]);
          setLoading(false);
        }

        return;
      }

      const liveBlogs = ((data ?? []) as PublicBlog[]).filter((blog) =>
        isLiveNow(blog.published_at)
      );

      if (!ignore) {
        setBlogs(liveBlogs);

        const savedState: Record<string, boolean> = {};
        const likedState: Record<string, boolean> = {};

        liveBlogs.forEach((blog) => {
          savedState[blog.id] =
            localStorage.getItem(`tetamo_blog_saved_${blog.id}`) === "true";
          likedState[blog.id] =
            localStorage.getItem(`tetamo_blog_liked_${blog.id}`) === "true";
        });

        setSavedBlogs(savedState);
        setLikedBlogs(likedState);
        setLoading(false);
      }
    }

    loadBlogs();

    return () => {
      ignore = true;
    };
  }, []);

  const filteredBlogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    if (!q) return blogs;

    const words = q.split(/\s+/).filter(Boolean);

    return blogs.filter((blog) => {
      const activeTitle =
        lang === "id"
          ? blog.title_id?.trim() || blog.title?.trim() || ""
          : blog.title?.trim() || blog.title_id?.trim() || "";

      const activeExcerpt =
        lang === "id"
          ? blog.excerpt_id?.trim() || blog.excerpt?.trim() || ""
          : blog.excerpt?.trim() || blog.excerpt_id?.trim() || "";

      const searchable = `
        ${activeTitle}
        ${activeExcerpt}
        ${blog.category ?? ""}
        ${blog.author_name ?? ""}
      `.toLowerCase();

      return words.every((word) => searchable.includes(word));
    });
  }, [blogs, searchQuery, lang]);

  function toggleSave(blogId: string) {
    setSavedBlogs((prev) => {
      const nextValue = !prev[blogId];

      localStorage.setItem(
        `tetamo_blog_saved_${blogId}`,
        String(nextValue)
      );

      return {
        ...prev,
        [blogId]: nextValue,
      };
    });
  }

  function toggleLike(blogId: string) {
    setLikedBlogs((prev) => {
      const nextValue = !prev[blogId];

      localStorage.setItem(
        `tetamo_blog_liked_${blogId}`,
        String(nextValue)
      );

      return {
        ...prev,
        [blogId]: nextValue,
      };
    });
  }

  async function handleShare(blog: PublicBlog, activeTitle: string) {
    const url = getBlogUrl(blog.slug);
    const title = activeTitle || "Tetamo Blog";

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title,
          text:
            lang === "id"
              ? "Baca artikel ini di Tetamo."
              : "Read this article on Tetamo.",
          url,
        });

        return;
      }

      await navigator.clipboard.writeText(url);
      setShareCopiedId(blog.id);

      window.setTimeout(() => {
        setShareCopiedId(null);
      }, 1800);
    } catch (error) {
      console.error("Failed to share blog:", error);
    }
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      <section className="border-b border-gray-200 bg-white px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600">
              TETAMO BLOG
            </span>

            <h1 className="mt-4 text-3xl font-bold leading-tight text-[#1C1C1E] sm:text-4xl lg:text-5xl">
              {lang === "id"
                ? "Blog properti Tetamo untuk insight, tips, dan panduan pasar"
                : "Tetamo property blog for insights, tips, and market guidance"}
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-600 sm:text-base">
              {lang === "id"
                ? "Baca artikel terbaru seputar properti, investasi, tren pasar, dan panduan praktis dari Tetamo."
                : "Read the latest articles on property, investment, market trends, and practical guidance from Tetamo."}
            </p>
          </div>

          <div className="relative mt-8 max-w-2xl">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
              size={18}
            />

            <input
              type="text"
              placeholder={
                lang === "id"
                  ? "Cari judul, kategori, author..."
                  : "Search title, category, author..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-gray-300 bg-white py-3 pl-12 pr-4 text-sm outline-none placeholder-gray-400 focus:border-[#1C1C1E]"
            />
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="text-sm text-gray-500">
              {lang === "id"
                ? `${filteredBlogs.length} artikel ditemukan`
                : `${filteredBlogs.length} articles found`}
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
              {lang === "id" ? "Memuat blog..." : "Loading blogs..."}
            </div>
          ) : filteredBlogs.length === 0 ? (
            <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
              {lang === "id"
                ? "Belum ada blog public yang tersedia."
                : "No public blogs available yet."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredBlogs.map((blog) => {
                const activeTitle =
                  lang === "id"
                    ? blog.title_id?.trim() || blog.title?.trim() || ""
                    : blog.title?.trim() || blog.title_id?.trim() || "";

                const activeExcerpt =
                  lang === "id"
                    ? blog.excerpt_id?.trim() || blog.excerpt?.trim() || ""
                    : blog.excerpt?.trim() || blog.excerpt_id?.trim() || "";

                const isSaved = Boolean(savedBlogs[blog.id]);
                const isLiked = Boolean(likedBlogs[blog.id]);
                const isCopied = shareCopiedId === blog.id;

                return (
                  <article
                    key={blog.id}
                    className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <Link href={`/blog/${blog.slug}`} className="block">
                      <div className="relative">
                        {blog.cover_image_url ? (
                          <img
                            src={blog.cover_image_url}
                            alt={activeTitle}
                            className="h-56 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-56 w-full items-center justify-center bg-[#1C1C1E] text-4xl font-bold text-white">
                            {getInitials(activeTitle)}
                          </div>
                        )}

                        {blog.category && (
                          <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#1C1C1E] shadow-sm">
                            {blog.category}
                          </div>
                        )}
                      </div>
                    </Link>

                    <div className="p-5 sm:p-6">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span>{blog.author_name || "Tetamo Editorial"}</span>
                        <span>•</span>
                        <span>
                          {formatBlogDate(blog.published_at || blog.created_at)}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Eye size={13} />
                          {Number(blog.view_count ?? 0).toLocaleString()} views
                        </span>
                      </div>

                      <Link href={`/blog/${blog.slug}`} className="block">
                        <h2 className="mt-3 line-clamp-2 text-lg font-bold leading-7 text-[#1C1C1E] hover:opacity-80">
                          {activeTitle}
                        </h2>

                        <p className="mt-3 line-clamp-3 text-sm leading-7 text-gray-600">
                          {activeExcerpt ||
                            (lang === "id"
                              ? "Klik untuk membaca artikel lengkap."
                              : "Click to read the full article.")}
                        </p>
                      </Link>

                      <div className="mt-5 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleSave(blog.id)}
                          className={`inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
                            isSaved
                              ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                              : "border-gray-200 bg-white text-[#1C1C1E] hover:bg-gray-50"
                          }`}
                        >
                          <Bookmark
                            size={14}
                            className={isSaved ? "fill-current" : ""}
                          />
                          {isSaved
                            ? lang === "id"
                              ? "Tersimpan"
                              : "Saved"
                            : lang === "id"
                              ? "Simpan"
                              : "Save"}
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleLike(blog.id)}
                          className={`inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
                            isLiked
                              ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                              : "border-gray-200 bg-white text-[#1C1C1E] hover:bg-gray-50"
                          }`}
                        >
                          <Heart
                            size={14}
                            className={isLiked ? "fill-current" : ""}
                          />
                          {isLiked
                            ? lang === "id"
                              ? "Disukai"
                              : "Liked"
                            : lang === "id"
                              ? "Suka"
                              : "Like"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShare(blog, activeTitle)}
                          className="inline-flex items-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-[#1C1C1E] transition hover:bg-gray-50"
                        >
                          <Share2 size={14} />
                          {isCopied
                            ? lang === "id"
                              ? "Disalin"
                              : "Copied"
                            : lang === "id"
                              ? "Bagikan"
                              : "Share"}
                        </button>
                      </div>

                      <Link
                        href={`/blog/${blog.slug}`}
                        className="mt-5 inline-flex items-center text-sm font-semibold text-[#1C1C1E] hover:opacity-80"
                      >
                        {lang === "id" ? "Baca Selengkapnya" : "Read More"}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}