"use client";

import { useState, useMemo } from "react";
import { Search, PenSquare, Eye, EyeOff } from "lucide-react";

/* =========================
TYPES
========================= */

type BlogStatus = "PUBLISHED" | "DRAFT";

type Blog = {
  id: string;
  title: string;
  category: string;
  author: string;
  date: string;
  views: number;
  status: BlogStatus;
};

/* =========================
DEMO DATA
========================= */

const DEMO_BLOGS: Blog[] = [
  {
    id: "blog_001",
    title: "Why Property Prices in Jakarta Keep Rising",
    category: "Market Insight",
    author: "Tetamo Editorial",
    date: "10 Mar 2026",
    views: 1284,
    status: "PUBLISHED",
  },
  {
    id: "blog_002",
    title: "Top 5 Areas to Invest in Bali Property",
    category: "Investment",
    author: "Tetamo Editorial",
    date: "08 Mar 2026",
    views: 972,
    status: "PUBLISHED",
  },
  {
    id: "blog_003",
    title: "How Owners Can Sell Property Faster",
    category: "Tips",
    author: "Tetamo Editorial",
    date: "05 Mar 2026",
    views: 540,
    status: "DRAFT",
  },
];

/* =========================
STATUS UI
========================= */

function statusUI(status: BlogStatus) {
  if (status === "PUBLISHED") {
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

/* =========================
PAGE
========================= */

export default function AdminBlogsPage() {

  const [blogs, setBlogs] = useState(DEMO_BLOGS);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const ITEMS_PER_PAGE = 12;

  const filteredBlogs = useMemo(() => {

    if (!searchQuery.trim()) return blogs;

    const words = searchQuery.toLowerCase().split(" ");

    return blogs.filter((blog) => {

      const searchable = `
        ${blog.title}
        ${blog.category}
        ${blog.author}
      `.toLowerCase();

      return words.every((word) => searchable.includes(word));

    });

  }, [searchQuery, blogs]);

  const totalPages = Math.ceil(filteredBlogs.length / ITEMS_PER_PAGE);

  const paginatedBlogs = filteredBlogs.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const startItem =
    filteredBlogs.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;

  const endItem = Math.min(page * ITEMS_PER_PAGE, filteredBlogs.length);

  function toggleStatus(id: string) {

    setBlogs((prev) =>
      prev.map((b) =>
        b.id === id
          ? { ...b, status: b.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" }
          : b
      )
    );

  }

  return (
    <div>

      {/* Header */}

      <div className="flex items-center justify-between mb-8">

        <div>
          <h1 className="text-2xl font-bold text-[#1C1C1E]">
            Blog CMS
          </h1>
          <p className="text-sm text-gray-500">
            Kelola artikel dan konten blog Tetamo.
          </p>
        </div>

        <button
          className="rounded-xl bg-[#1C1C1E] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          + New Blog
        </button>

      </div>

      {/* Search */}

      <div className="mt-6 relative">

        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
          size={18}
        />

        <input
          type="text"
          placeholder="Cari artikel, kategori, author..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          className="w-full border border-gray-400 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-[#1C1C1E] placeholder-gray-500"
        />

      </div>

      {/* Blog Card */}

      <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm">

        <div className="divide-y divide-gray-100">

          {paginatedBlogs.map((blog) => {

            const ui = statusUI(blog.status);

            return (
              <div
                key={blog.id}
                className="p-6 flex items-center justify-between gap-6"
              >

                {/* LEFT */}

                <div className="min-w-0">

                  <span
                    className={`inline-flex text-xs px-3 py-1 rounded-full border ${ui.badge}`}
                  >
                    {ui.label}
                  </span>

                  <p className="mt-2 font-medium text-[#1C1C1E]">
                    {blog.title}
                  </p>

                  <p className="text-sm text-gray-500">
                    {blog.category} • {blog.author}
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    {blog.date} • {blog.views} views
                  </p>

                </div>

                {/* ACTIONS */}

                <div className="flex items-center gap-2">

                  <button
                    className="px-3 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    <PenSquare size={16}/>
                  </button>

                  <button
                    onClick={() => toggleStatus(blog.id)}
                    className="px-3 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    {blog.status === "PUBLISHED" ? (
                      <EyeOff size={16}/>
                    ) : (
                      <Eye size={16}/>
                    )}
                  </button>

                </div>

              </div>
            );

          })}

        </div>

      </div>

      {/* Pagination */}

      <div className="flex items-center justify-between mt-6">

        <p className="text-sm text-gray-900">
          Menampilkan {startItem}–{endItem} dari {filteredBlogs.length} artikel
        </p>

        <div className="flex items-center gap-2">

          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-2 border rounded-lg bg-[#1C1C1E] text-white"
          >
            Sebelumnya
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-3 py-2 border rounded-lg text-sm ${
                page === p
                  ? "bg-black text-white border-black"
                  : "border-gray-400"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() =>
              setPage((p) => Math.min(totalPages, p + 1))
            }
            className="px-3 py-2 border rounded-lg bg-[#1C1C1E] text-white"
          >
            Berikutnya
          </button>

        </div>

      </div>

    </div>
  );
}