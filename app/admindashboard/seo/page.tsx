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

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  const paginated = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const startItem =
    filtered.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;

  const endItem = Math.min(page * ITEMS_PER_PAGE, filtered.length);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

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
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1C1C1E]">
          SEO Manager
        </h1>
        <p className="text-sm text-gray-500">
          Kelola metadata, template SEO, canonical, sitemap, dan indexing halaman Tetamo.
        </p>
      </div>

      {loadError ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      ) : null}

      <div className="mt-6 relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
          size={18}
        />

        <input
          type="text"
          placeholder="Cari halaman SEO, template, slug, canonical..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          className="w-full border border-gray-400 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-[#1C1C1E] placeholder-gray-500"
        />
      </div>

      <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading SEO pages...</div>
          ) : paginated.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">
              Tidak ada halaman SEO yang cocok.
            </div>
          ) : (
            paginated.map((seo) => {
              const typeUI = seoTypeUI(seo.type);
              const isEditing = editingId === seo.id && draft;
              const isWorking = workingId === seo.id;

              return (
                <div
                  key={seo.id}
                  className="p-6 flex items-start justify-between gap-6"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex text-xs px-3 py-1 rounded-full border ${
                          seo.indexed
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-gray-100 text-gray-700 border-gray-200"
                        }`}
                      >
                        {seo.indexed ? "Indexed" : "No Index"}
                      </span>

                      <span
                        className={`inline-flex text-xs px-3 py-1 rounded-full border ${typeUI.badge}`}
                      >
                        {typeUI.label}
                      </span>

                      <span
                        className={`inline-flex text-xs px-3 py-1 rounded-full border ${
                          seo.includedInSitemap
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-gray-100 text-gray-700 border-gray-200"
                        }`}
                      >
                        {seo.includedInSitemap ? "In Sitemap" : "Not in Sitemap"}
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="mt-4 space-y-3">
                        <div>
                          <label className="text-xs text-gray-500">Page Name</label>
                          <input
                            type="text"
                            value={draft.page}
                            onChange={(e) =>
                              setDraft({ ...draft, page: e.target.value })
                            }
                            className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#1C1C1E]"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-gray-500">Slug</label>
                          <input
                            type="text"
                            value={draft.slug}
                            onChange={(e) =>
                              setDraft({ ...draft, slug: e.target.value })
                            }
                            className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#1C1C1E]"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-gray-500">SEO Title</label>
                          <input
                            type="text"
                            value={draft.title}
                            onChange={(e) =>
                              setDraft({ ...draft, title: e.target.value })
                            }
                            className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#1C1C1E]"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-gray-500">Meta Description</label>
                          <textarea
                            value={draft.description}
                            onChange={(e) =>
                              setDraft({ ...draft, description: e.target.value })
                            }
                            rows={3}
                            className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#1C1C1E]"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-gray-500">Canonical</label>
                          <input
                            type="text"
                            value={draft.canonical}
                            onChange={(e) =>
                              setDraft({ ...draft, canonical: e.target.value })
                            }
                            className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#1C1C1E]"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-gray-500">Type</label>
                          <select
                            value={draft.type}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                type: e.target.value as SEOType,
                              })
                            }
                            className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#1C1C1E]"
                          >
                            <option value="STATIC">STATIC</option>
                            <option value="TEMPLATE">TEMPLATE</option>
                            <option value="TECHNICAL">TECHNICAL</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="mt-2 font-medium text-[#1C1C1E]">
                          {seo.page}
                        </p>

                        <p className="text-sm text-gray-500">
                          {seo.slug}
                        </p>

                        <p className="text-xs text-gray-500 mt-1">
                          {seo.title}
                        </p>

                        <p className="text-xs text-gray-500 mt-1">
                          {seo.description}
                        </p>

                        <p className="text-xs text-gray-400 mt-2">
                          Canonical: {seo.canonical || "-"}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isEditing ? (
                      <>
                        <button
                          onClick={saveEdit}
                          disabled={isWorking}
                          className="px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                          <Save size={16} />
                        </button>

                        <button
                          onClick={cancelEdit}
                          disabled={isWorking}
                          className="px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(seo)}
                          disabled={isWorking}
                          className="px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          onClick={() => toggleIndex(seo.id)}
                          disabled={isWorking}
                          className="px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                          title="Toggle Index"
                        >
                          <Globe size={16} />
                        </button>

                        <button
                          onClick={() => toggleSitemap(seo.id)}
                          disabled={isWorking}
                          className="px-3 py-2 border rounded-lg hover:bg-gray-50 text-xs font-medium disabled:opacity-50"
                          title="Toggle Sitemap"
                        >
                          SM
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-gray-900">
          Menampilkan {startItem}–{endItem} dari {filtered.length} halaman
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-2 border rounded-lg bg-[#1C1C1E] text-white disabled:opacity-50"
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
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-2 border rounded-lg bg-[#1C1C1E] text-white disabled:opacity-50"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
}