"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { supabase } from "@/lib/supabase";

/* =========================
TYPES
========================= */

type PublicBlog = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
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

/* =========================
PAGE
========================= */

export default function PublicBlogPage() {
  const { lang } = useLanguage();

  const [blogs, setBlogs] = useState<PublicBlog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadBlogs() {
      setLoading(true);

      const { data, error } = await supabase
        .from("blogs")
        .select(`
          id,
          title,
          slug,
          excerpt,
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

      if (!ignore) {
        setBlogs((data ?? []) as PublicBlog[]);
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
      const searchable = `
        ${blog.title}
        ${blog.excerpt ?? ""}
        ${blog.category ?? ""}
        ${blog.author_name ?? ""}
      `.toLowerCase();

      return words.every((word) => searchable.includes(word));
    });
  }, [blogs, searchQuery]);

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      {/* Hero */}

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

          {/* Search */}

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

      {/* List */}

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
              {filteredBlogs.map((blog) => (
                <article
                  key={blog.id}
                  className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Link href={`/blog/${blog.slug}`} className="block">
                    <div className="relative">
                      {blog.cover_image_url ? (
                        <img
                          src={blog.cover_image_url}
                          alt={blog.title}
                          className="h-56 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-56 w-full items-center justify-center bg-[#1C1C1E] text-4xl font-bold text-white">
                          {getInitials(blog.title)}
                        </div>
                      )}

                      {blog.category && (
                        <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#1C1C1E] shadow-sm">
                          {blog.category}
                        </div>
                      )}
                    </div>

                    <div className="p-5 sm:p-6">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span>{blog.author_name || "Tetamo Editorial"}</span>
                        <span>•</span>
                        <span>
                          {formatBlogDate(blog.published_at || blog.created_at)}
                        </span>
                        <span>•</span>
                        <span>{blog.view_count ?? 0} views</span>
                      </div>

                      <h2 className="mt-3 line-clamp-2 text-lg font-bold leading-7 text-[#1C1C1E]">
                        {blog.title}
                      </h2>

                      <p className="mt-3 line-clamp-3 text-sm leading-7 text-gray-600">
                        {blog.excerpt ||
                          (lang === "id"
                            ? "Klik untuk membaca artikel lengkap."
                            : "Click to read the full article.")}
                      </p>

                      <div className="mt-5 inline-flex items-center text-sm font-semibold text-[#1C1C1E]">
                        {lang === "id" ? "Baca Selengkapnya" : "Read More"}
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}