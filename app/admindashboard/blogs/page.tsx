"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, PenSquare, Eye, EyeOff } from "lucide-react";
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
  category: string | null;
  author_name: string | null;
  view_count: number | null;
  status: BlogStatus;
  access_type: BlogAccessType;
  published_at: string | null;
  created_at: string | null;
};

/* =========================
UI HELPERS
========================= */

function statusUI(status: BlogStatus) {
  if (status === "published") {
    return {
      label: "Published",
      badge: "bg-green-50 text-green-700 border-green-200",
    };
  }

  return {
    label: "Draft",
    badge: "bg-gray-100 text-gray-700 border-gray-200",
  };
}

function accessUI(accessType: BlogAccessType) {
  if (accessType === "paid_agent") {
    return {
      label: "Paid Agent Only",
      badge: "bg-amber-50 text-amber-700 border-amber-200",
    };
  }

  return {
    label: "Public",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  };
}

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

/* =========================
PAGE
========================= */

export default function AdminBlogsPage() {
  const [blogs, setBlogs] = useState<AdminBlog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 12;

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
          category,
          author_name,
          view_count,
          status,
          access_type,
          published_at,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load blogs:", error);
        if (!ignore) setBlogs([]);
        if (!ignore) setLoading(false);
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
        ${blog.category ?? ""}
        ${blog.author_name ?? ""}
        ${blog.status}
        ${blog.access_type}
      `.toLowerCase();

      return words.every((word) => searchable.includes(word));
    });
  }, [searchQuery, blogs]);

  const totalPages = Math.max(1, Math.ceil(filteredBlogs.length / ITEMS_PER_PAGE));
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

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1C1E]">Blog Manager</h1>
          <p className="text-sm text-gray-500">
            Kelola blog public dan paid agent Tetamo.
          </p>
        </div>

        <Link
          href="/admindashboard/blogs/new"
          className="rounded-xl bg-[#1C1C1E] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
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

      {/* Blog Card */}

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading blogs...</div>
        ) : filteredBlogs.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">
            No blogs found yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {paginatedBlogs.map((blog) => {
              const blogStatusUI = statusUI(blog.status);
              const blogAccessUI = accessUI(blog.access_type);

              return (
                <div
                  key={blog.id}
                  className="flex items-center justify-between gap-6 p-6"
                >
                  {/* LEFT */}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs ${blogStatusUI.badge}`}
                      >
                        {blogStatusUI.label}
                      </span>

                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs ${blogAccessUI.badge}`}
                      >
                        {blogAccessUI.label}
                      </span>
                    </div>

                    <p className="mt-2 font-medium text-[#1C1C1E]">
                      {blog.title}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {blog.category || "Uncategorized"} •{" "}
                      {blog.author_name || "Tetamo Editorial"}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Slug: {blog.slug}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {blog.status === "published"
                        ? `Published: ${formatBlogDate(blog.published_at)}`
                        : `Created: ${formatBlogDate(blog.created_at)}`}{" "}
                      • {blog.view_count ?? 0} views
                    </p>
                  </div>

                  {/* ACTIONS */}

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admindashboard/blogs/${blog.id}/edit`}
                      className="rounded-lg border px-3 py-2 hover:bg-gray-50"
                    >
                      <PenSquare size={16} />
                    </Link>

                    <button
                      type="button"
                      onClick={() => toggleStatus(blog.id)}
                      disabled={togglingId === blog.id}
                      className="rounded-lg border px-3 py-2 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {blog.status === "published" ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-gray-900">
          Menampilkan {startItem}–{endItem} dari {filteredBlogs.length} artikel
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="rounded-lg border bg-[#1C1C1E] px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Sebelumnya
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={`rounded-lg border px-3 py-2 text-sm ${
                safePage === p
                  ? "border-black bg-black text-white"
                  : "border-gray-400"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="rounded-lg border bg-[#1C1C1E] px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
}