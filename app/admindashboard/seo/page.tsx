"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Globe, Pencil, Save, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

/* =========================
TYPES
========================= */

type SEOType = "STATIC" | "TEMPLATE" | "TECHNICAL";

type SEOPage = {
  id: string;
  page: string;
  slug: string;
  title: string;
  description: string;
  indexed: boolean;
  canonical: string;
  includedInSitemap: boolean;
  type: SEOType;
  sortOrder: number;
};

type SEORow = {
  id: string;
  page: string | null;
  slug: string | null;
  title: string | null;
  description: string | null;
  indexed: boolean | null;
  canonical: string | null;
  included_in_sitemap: boolean | null;
  type: string | null;
  sort_order: number | null;
};

/* =========================
HELPERS
========================= */

function normalizeSEOType(value?: string | null): SEOType {
  const v = String(value || "").toUpperCase();

  if (v === "TEMPLATE") return "TEMPLATE";
  if (v === "TECHNICAL") return "TECHNICAL";
  return "STATIC";
}

function seoTypeUI(type: SEOType) {
  if (type === "STATIC") {
    return {
      label: "Static",
      badge: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }

  if (type === "TEMPLATE") {
    return {
      label: "Template",
      badge: "bg-purple-50 text-purple-700 border-purple-200",
    };
  }

  return {
    label: "Technical",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  };
}

function mapRowToSEOPage(row: SEORow): SEOPage {
  return {
    id: row.id,
    page: row.page || "-",
    slug: row.slug || "-",
    title: row.title || "",
    description: row.description || "",
    indexed: Boolean(row.indexed),
    canonical: row.canonical || "",
    includedInSitemap: Boolean(row.included_in_sitemap),
    type: normalizeSEOType(row.type),
    sortOrder: row.sort_order ?? 1000,
  };
}

function visiblePageNumbers(current: number, total: number) {
  const pages: number[] = [];
  const start = Math.max(1, current - 2);
  const end = Math.min(total, current + 2);

  for (let p = start; p <= end; p += 1) {
    pages.push(p);
  }

  return pages;
}

/* =========================
PAGE
========================= */

export default function AdminSEOPage() {
  const [pages, setPages] = useState<SEOPage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SEOPage | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [workingId, setWorkingId] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    let ignore = false;

    async function loadSEO() {
      setLoading(true);
      setLoadError("");

      const { data, error } = await supabase
        .from("seo_pages")
        .select(
          "id, page, slug, title, description, indexed, canonical, included_in_sitemap, type, sort_order"
        )
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (ignore) return;

      if (error) {
        console.error("Failed to load SEO pages:", error);
        setLoadError(error.message || "Failed to load SEO pages.");
        setPages([]);
        setLoading(false);
        return;
      }

      const mapped = ((data || []) as SEORow[]).map(mapRowToSEOPage);

      setPages(mapped);
      setLoading(false);
    }

    loadSEO();

    return () => {
      ignore = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return pages;

    const words = searchQuery.toLowerCase().split(" ").filter(Boolean);

    return pages.filter((p) => {
      const searchable = `
        ${p.page}
        ${p.slug}
        ${p.title}
        ${p.description}
        ${p.type}
        ${p.canonical}
      `.toLowerCase();

      return words.every((w) => searchable.includes(w));
    });
  }, [pages, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, pages.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginated = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const startItem =
    filtered.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;

  const endItem = Math.min(page * ITEMS_PER_PAGE, filtered.length);

  const visiblePages = useMemo(
    () => visiblePageNumbers(page, totalPages),
    [page, totalPages]
  );

  async function toggleIndex(id: string) {
    const target = pages.find((p) => p.id === id);
    if (!target) return;

    const nextValue = !target.indexed;
    setWorkingId(id);

    const { error } = await supabase
      .from("seo_pages")
      .update({ indexed: nextValue })
      .eq("id", id);

    if (error) {
      console.error("Failed to toggle index:", error);
      alert(error.message || "Failed to update indexing.");
      setWorkingId(null);
      return;
    }

    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, indexed: nextValue } : p))
    );

    if (editingId === id && draft) {
      setDraft({ ...draft, indexed: nextValue });
    }

    setWorkingId(null);
  }

  async function toggleSitemap(id: string) {
    const target = pages.find((p) => p.id === id);
    if (!target) return;

    const nextValue = !target.includedInSitemap;
    setWorkingId(id);

    const { error } = await supabase
      .from("seo_pages")
      .update({ included_in_sitemap: nextValue })
      .eq("id", id);

    if (error) {
      console.error("Failed to toggle sitemap:", error);
      alert(error.message || "Failed to update sitemap flag.");
      setWorkingId(null);
      return;
    }

    setPages((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, includedInSitemap: nextValue } : p
      )
    );

    if (editingId === id && draft) {
      setDraft({ ...draft, includedInSitemap: nextValue });
    }

    setWorkingId(null);
  }

  function startEdit(seo: SEOPage) {
    setEditingId(seo.id);
    setDraft({ ...seo });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  async function saveEdit() {
    if (!draft) return;

    const trimmedPage = draft.page.trim();
    const trimmedSlug = draft.slug.trim();
    const trimmedTitle = draft.title.trim();
    const trimmedDescription = draft.description.trim();
    const trimmedCanonical = draft.canonical.trim();

    if (!trimmedPage) {
      alert("Page name is required.");
      return;
    }

    if (!trimmedSlug) {
      alert("Slug is required.");
      return;
    }

    if (!trimmedTitle) {
      alert("SEO title is required.");
      return;
    }

    setWorkingId(draft.id);

    const { error } = await supabase
      .from("seo_pages")
      .update({
        page: trimmedPage,
        slug: trimmedSlug,
        title: trimmedTitle,
        description: trimmedDescription,
        canonical: trimmedCanonical || null,
        indexed: draft.indexed,
        included_in_sitemap: draft.includedInSitemap,
        type: draft.type,
      })
      .eq("id", draft.id);

    if (error) {
      console.error("Failed to save SEO row:", error);
      alert(error.message || "Failed to save SEO rule.");
      setWorkingId(null);
      return;
    }

    setPages((prev) =>
      prev.map((p) =>
        p.id === draft.id
          ? {
              ...draft,
              page: trimmedPage,
              slug: trimmedSlug,
              title: trimmedTitle,
              description: trimmedDescription,
              canonical: trimmedCanonical,
            }
          : p
      )
    );

    setEditingId(null);
    setDraft(null);
    setWorkingId(null);
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold tracking-tight text-[#1C1C1E] sm:text-xl">
          SEO Manager
        </h1>
        <p className="text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
          Kelola metadata, template SEO, canonical, sitemap, dan indexing halaman Tetamo.
        </p>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      ) : null}

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          size={16}
        />

        <input
          type="text"
          placeholder="Cari halaman SEO, template, slug, canonical..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          className="h-10 w-full rounded-2xl border border-gray-300 pl-10 pr-4 text-[13px] outline-none transition placeholder:text-gray-400 focus:border-[#1C1C1E] sm:h-11 sm:pl-11 sm:text-sm"
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading SEO pages...</div>
          ) : paginated.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">
              Tidak ada halaman SEO yang cocok.
            </div>
          ) : (
            paginated.map((seo) => {
              const typeBadge = seoTypeUI(seo.type);
              const isEditing = editingId === seo.id && draft;
              const isWorking = workingId === seo.id;

              return (
                <div key={seo.id} className="px-3.5 py-4 sm:px-5">
                  <div className="flex flex-col gap-3.5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium sm:text-[11px] ${
                            seo.indexed
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-gray-100 text-gray-700 border-gray-200"
                          }`}
                        >
                          {seo.indexed ? "Indexed" : "No Index"}
                        </span>

                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium sm:text-[11px] ${typeBadge.badge}`}
                        >
                          {typeBadge.label}
                        </span>

                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium sm:text-[11px] ${
                            seo.includedInSitemap
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-gray-100 text-gray-700 border-gray-200"
                          }`}
                        >
                          {seo.includedInSitemap ? "In Sitemap" : "Not in Sitemap"}
                        </span>
                      </div>

                      {isEditing ? (
                        <div className="mt-3 grid grid-cols-1 gap-2.5">
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                                Page Name
                              </label>
                              <input
                                type="text"
                                value={draft.page}
                                onChange={(e) =>
                                  setDraft({ ...draft, page: e.target.value })
                                }
                                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-[12px] outline-none focus:border-[#1C1C1E] sm:text-sm"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                                Slug
                              </label>
                              <input
                                type="text"
                                value={draft.slug}
                                onChange={(e) =>
                                  setDraft({ ...draft, slug: e.target.value })
                                }
                                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-[12px] outline-none focus:border-[#1C1C1E] sm:text-sm"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                              SEO Title
                            </label>
                            <input
                              type="text"
                              value={draft.title}
                              onChange={(e) =>
                                setDraft({ ...draft, title: e.target.value })
                              }
                              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-[12px] outline-none focus:border-[#1C1C1E] sm:text-sm"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                              Meta Description
                            </label>
                            <textarea
                              value={draft.description}
                              onChange={(e) =>
                                setDraft({ ...draft, description: e.target.value })
                              }
                              rows={3}
                              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-[12px] outline-none focus:border-[#1C1C1E] sm:text-sm"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                                Canonical
                              </label>
                              <input
                                type="text"
                                value={draft.canonical}
                                onChange={(e) =>
                                  setDraft({ ...draft, canonical: e.target.value })
                                }
                                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-[12px] outline-none focus:border-[#1C1C1E] sm:text-sm"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                                Type
                              </label>
                              <select
                                value={draft.type}
                                onChange={(e) =>
                                  setDraft({
                                    ...draft,
                                    type: e.target.value as SEOType,
                                  })
                                }
                                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-[12px] outline-none focus:border-[#1C1C1E] sm:text-sm"
                              >
                                <option value="STATIC">STATIC</option>
                                <option value="TEMPLATE">TEMPLATE</option>
                                <option value="TECHNICAL">TECHNICAL</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="mt-2 text-[13px] font-semibold text-[#1C1C1E] sm:text-sm md:text-[15px]">
                            {seo.page}
                          </p>

                          <div className="mt-3 grid grid-cols-2 gap-2.5">
                            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                                Slug
                              </p>
                              <p className="mt-1 break-words text-[11px] text-gray-600 sm:text-xs md:text-sm">
                                {seo.slug}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                                Canonical
                              </p>
                              <p className="mt-1 break-words text-[11px] text-gray-600 sm:text-xs md:text-sm">
                                {seo.canonical || "-"}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                                SEO Title
                              </p>
                              <p className="mt-1 text-[11px] leading-5 text-gray-600 sm:text-xs md:text-sm">
                                {seo.title}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                                Description
                              </p>
                              <p className="mt-1 text-[11px] leading-5 text-gray-600 sm:text-xs md:text-sm">
                                {seo.description || "-"}
                              </p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {isEditing ? (
                        <>
                          <button
                            onClick={saveEdit}
                            disabled={isWorking}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 text-[12px] font-medium text-green-700 transition hover:bg-green-100 disabled:opacity-50 sm:text-sm"
                            type="button"
                          >
                            <Save size={15} />
                            <span>Save</span>
                          </button>

                          <button
                            onClick={cancelEdit}
                            disabled={isWorking}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-[12px] font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 sm:text-sm"
                            type="button"
                          >
                            <X size={15} />
                            <span>Cancel</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(seo)}
                            disabled={isWorking}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-[12px] font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 sm:text-sm"
                            type="button"
                          >
                            <Pencil size={15} />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => toggleIndex(seo.id)}
                            disabled={isWorking}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-[12px] font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 sm:text-sm"
                            type="button"
                            title="Toggle Index"
                          >
                            <Globe size={15} />
                            <span>Index</span>
                          </button>

                          <button
                            onClick={() => toggleSitemap(seo.id)}
                            disabled={isWorking}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-[12px] font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 sm:text-sm"
                            type="button"
                            title="Toggle Sitemap"
                          >
                            <span>SM</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-gray-500 sm:text-xs md:text-sm">
          Menampilkan {startItem}–{endItem} dari {filtered.length} halaman
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-gray-300 bg-[#1C1C1E] px-3.5 text-[12px] font-medium text-white disabled:opacity-50 sm:h-10 sm:px-4 sm:text-sm"
            type="button"
          >
            Sebelumnya
          </button>

          {visiblePages.map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`inline-flex h-9 min-w-[36px] items-center justify-center rounded-xl border px-3 text-[12px] font-medium sm:h-10 sm:min-w-[40px] sm:text-sm ${
                page === p
                  ? "border-black bg-black text-white"
                  : "border-gray-300 bg-white text-gray-700"
              }`}
              type="button"
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-gray-300 bg-[#1C1C1E] px-3.5 text-[12px] font-medium text-white disabled:opacity-50 sm:h-10 sm:px-4 sm:text-sm"
            type="button"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
}