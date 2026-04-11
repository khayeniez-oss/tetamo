"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Eye,
  EyeOff,
  PenSquare,
  Search,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/* =========================
TYPES
========================= */

type BlogStatus = "draft" | "published";
type BlogAccessType = "public" | "paid_agent";

type AdminBlog = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string | null;
  author_name: string | null;
  cover_image_url: string | null;
  view_count: number | null;
  status: BlogStatus;
  access_type: BlogAccessType;
  published_at: string | null;
  updated_at: string | null;
  created_at: string | null;
};

/* =========================
UI HELPERS
========================= */

function statusUI(status: BlogStatus) {
  if (status === "published") {
    return {
      label: "Published",
      badge: "border-green-200 bg-green-50 text-green-700",
    };
  }

  return {
    label: "Draft",
    badge: "border-gray-200 bg-gray-100 text-gray-700",
  };
}

function accessUI(accessType: BlogAccessType) {
  if (accessType === "paid_agent") {
    return {
      label: "Paid Agent Only",
      badge: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Public",
    badge: "border-blue-200 bg-blue-50 text-blue-700",
  };
}

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

function truncateText(value?: string | null, maxLength = 180) {
  if (!value) return "";
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}...`;
}

/* =========================
PAGE
========================= */

export default function AdminBlogsPage() {
  const [blogs, setBlogs] = useState<AdminBlog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 8;

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
          status,
          access_type,
          published_at,
          updated_at,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load blogs:", error);
        if (!ignore) {
          setBlogs([]);
          setLoading(false);
        }
        return;
      }

      if (!ignore) {
        setBlogs((data ?? []) as AdminBlog[]);
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
        ${blog.slug}
        ${blog.excerpt ?? ""}
        ${blog.category ?? ""}
        ${blog.author_name ?? ""}
        ${blog.status}
        ${blog.access_type}
      `.toLowerCase();

      return words.every((word) => searchable.includes(word));
    });
  }, [searchQuery, blogs]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredBlogs.length / ITEMS_PER_PAGE)
  );
  const safePage = Math.min(page, totalPages);

  const paginatedBlogs = filteredBlogs.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const startItem =
    filteredBlogs.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1;

  const endItem = Math.min(safePage * ITEMS_PER_PAGE, filteredBlogs.length);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  async function toggleStatus(id: string) {
    const currentBlog = blogs.find((b) => b.id === id);
    if (!currentBlog) return;

    const nextStatus: BlogStatus =
      currentBlog.status === "published" ? "draft" : "published";

    const nextPublishedAt =
      nextStatus === "published" ? new Date().toISOString() : null;

    const previousBlogs = blogs;

    setTogglingId(id);
    setBlogs((prev) =>
      prev.map((blog) =>
        blog.id === id
          ? {
              ...blog,
              status: nextStatus,
              published_at: nextPublishedAt,
            }
          : blog
      )
    );

    const { error } = await supabase
      .from("blogs")
      .update({
        status: nextStatus,
        published_at: nextPublishedAt,
      })
      .eq("id", id);

    if (error) {
      console.error("Failed to update blog status:", error);
      setBlogs(previousBlogs);
      alert(error.message || "Failed to update blog status.");
    }

    setTogglingId(null);
  }

  return (
    <div>
      {/* Header */}

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1C1E]">Blog Manager</h1>
          <p className="text-sm text-gray-500">
            Kelola blog public dan paid agent Tetamo.
          </p>
        </div>

        <Link
          href="/admindashboard/blogs/new"
          className="inline-flex items-center justify-center rounded-xl bg-[#1C1C1E] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          + New Blog
        </Link>
      </div>

      {/* Search */}

      <div className="relative mt-6">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
          size={18}
        />

        <input
          type="text"
          placeholder="Cari judul, kategori, author, slug..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-2xl border border-gray-400 py-3 pl-12 pr-4 text-sm outline-none placeholder-gray-500 focus:border-[#1C1C1E]"
        />
      </div>

      {/* Content */}

      <div className="mt-8">
        {loading ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-8 text-sm text-gray-500 shadow-sm">
            Loading blogs...
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-8 text-sm text-gray-500 shadow-sm">
            No blogs found yet.
          </div>
        ) : (
          <div className="space-y-5">
            {paginatedBlogs.map((blog) => {
              const blogStatusUI = statusUI(blog.status);
              const blogAccessUI = accessUI(blog.access_type);

              return (
                <div
                  key={blog.id}
                  className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
                >
                  <div className="flex flex-col lg:flex-row">
                    {/* Image */}

                    <div className="w-full shrink-0 lg:w-[240px] xl:w-[280px]">
                      {blog.cover_image_url ? (
                        <img
                          src={blog.cover_image_url}
                          alt={blog.title}
                          className="h-[220px] w-full object-cover lg:h-full"
                        />
                      ) : (
                        <div className="flex h-[220px] w-full items-center justify-center bg-[#1C1C1E] text-3xl font-bold text-white lg:h-full">
                          {getInitials(blog.title)}
                        </div>
                      )}
                    </div>

                    {/* Body */}

                    <div className="flex min-w-0 flex-1 flex-col justify-between p-5 sm:p-6">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${blogStatusUI.badge}`}
                          >
                            {blogStatusUI.label}
                          </span>

                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${blogAccessUI.badge}`}
                          >
                            {blogAccessUI.label}
                          </span>
                        </div>

                        <h2 className="mt-3 text-xl font-bold leading-8 text-[#1C1C1E]">
                          {blog.title}
                        </h2>

                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                          <span>{blog.category || "Uncategorized"}</span>
                          <span>•</span>
                          <span>{blog.author_name || "Tetamo Editorial"}</span>
                        </div>

                        <p className="mt-4 text-sm leading-7 text-gray-600">
                          {truncateText(
                            blog.excerpt || "No short summary added yet.",
                            210
                          )}
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
                          <span>
                            <span className="font-medium text-gray-700">
                              Slug:
                            </span>{" "}
                            {blog.slug}
                          </span>

                          <span className="inline-flex items-center gap-1">
                            <CalendarDays size={14} />
                            {blog.status === "published"
                              ? `Published: ${formatDate(blog.published_at)}`
                              : `Updated: ${formatDate(
                                  blog.updated_at || blog.created_at
                                )}`}
                          </span>

                          <span>
                            <span className="font-medium text-gray-700">
                              Views:
                            </span>{" "}
                            {blog.view_count ?? 0}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}

                      <div className="mt-6 flex flex-wrap items-center gap-3">
                        <Link
                          href={`/admindashboard/blogs/${blog.id}/edit`}
                          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-[#1C1C1E] hover:bg-gray-50"
                        >
                          <PenSquare size={16} />
                          Edit
                        </Link>

                        <button
                          type="button"
                          onClick={() => toggleStatus(blog.id)}
                          disabled={togglingId === blog.id}
                          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-[#1C1C1E] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {blog.status === "published" ? (
                            <>
                              <EyeOff size={16} />
                              Unpublish
                            </>
                          ) : (
                            <>
                              <Eye size={16} />
                              Publish
                            </>
                          )}
                        </button>

                        <Link
                          href={`/blog/${blog.slug}`}
                          target="_blank"
                          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-[#1C1C1E] hover:bg-gray-50"
                        >
                          <Eye size={16} />
                          View Public
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-900">
          Menampilkan {startItem}–{endItem} dari {filteredBlogs.length} artikel
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="rounded-lg border bg-[#1C1C1E] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Sebelumnya
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                safePage === p
                  ? "border-black bg-black text-white"
                  : "border-gray-400 bg-white text-[#1C1C1E]"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="rounded-lg border bg-[#1C1C1E] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
}