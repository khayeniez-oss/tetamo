"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { supabase } from "@/lib/supabase";

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
          "id, title, slug, excerpt, content, category, author_name, cover_image_url, view_count, published_at, created_at"
        )
        .eq("slug", slug)
        .eq("status", "published")
        .eq("access_type", "public")
        .single();

      if (ignore) return;

      if (error || !data) {
        console.error("Failed to load blog:", error);
        setNotFound(true);
        setLoading(false);
        return;
      }

      setBlog(data as BlogDetail);
      setLoading(false);
    }

    loadBlog();

    return () => {
      ignore = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] px-4 py-10">
        <div className="mx-auto max-w-4xl rounded-3xl border border-gray-200 bg-white p-8 text-sm text-gray-500 shadow-sm">
          {lang === "id" ? "Memuat artikel..." : "Loading article..."}
        </div>
      </main>
    );
  }

  if (notFound || !blog) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] px-4 py-10">
        <div className="mx-auto max-w-4xl rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-[#1C1C1E]">
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
    <main className="min-h-screen bg-[#FAFAF8] px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/blog"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#1C1C1E]"
        >
          <ArrowLeft size={16} />
          {lang === "id" ? "Kembali ke Blog" : "Back to Blog"}
        </Link>

        <article className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          {blog.cover_image_url ? (
            <img
              src={blog.cover_image_url}
              alt={blog.title}
              className="h-[260px] w-full object-cover sm:h-[360px]"
            />
          ) : null}

          <div className="p-6 sm:p-8">
            {blog.category ? (
              <div className="mb-4 inline-flex rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-gray-600">
                {blog.category}
              </div>
            ) : null}

            <h1 className="text-3xl font-bold text-[#1C1C1E] sm:text-4xl">
              {blog.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
              <span>{blog.author_name || "Tetamo Editorial"}</span>
              <span>•</span>
              <span>{formatDate(blog.published_at || blog.created_at)}</span>
              <span>•</span>
              <span>{blog.view_count ?? 0} views</span>
            </div>

            {blog.excerpt ? (
              <p className="mt-6 text-base leading-8 text-gray-600">
                {blog.excerpt}
              </p>
            ) : null}

            <div
              className="mt-8 border-t border-gray-100 pt-8 text-gray-700"
              dangerouslySetInnerHTML={{
                __html: blog.content || "<p>No content yet.</p>",
              }}
            />
          </div>
        </article>
      </div>
    </main>
  );
}