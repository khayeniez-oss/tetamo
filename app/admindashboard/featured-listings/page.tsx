"use client";

import { useState, useMemo } from "react";
import { Search, Star, StarOff } from "lucide-react";

/* =========================
TYPES
========================= */

type Listing = {
  id: string;
  kode: string;
  title: string;
  owner: string;
  city: string;
  price: string;
  featured: boolean;
};

/* =========================
DEMO DATA
========================= */

const DEMO_LISTINGS: Listing[] = [
  {
    id: "listing_001",
    kode: "TTM-2026-00021",
    title: "Rumah Modern Minimalis — Lokasi Strategis",
    owner: "Gunawan",
    city: "Jakarta Selatan",
    price: "Rp 2.500.000.000",
    featured: true,
  },
  {
    id: "listing_002",
    kode: "TTM-2026-00022",
    title: "Apartemen 2BR — Dekat MRT",
    owner: "Michael Tan",
    city: "Jakarta Pusat",
    price: "Rp 1.750.000.000",
    featured: false,
  },
];

/* =========================
PAGE
========================= */

export default function AdminFeaturedListingsPage() {

  const [listings, setListings] = useState(DEMO_LISTINGS);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const ITEMS_PER_PAGE = 12;

  const filtered = useMemo(() => {

    if (!searchQuery.trim()) return listings;

    const words = searchQuery.toLowerCase().split(" ");

    return listings.filter((l) => {

      const searchable = `
      ${l.title}
      ${l.owner}
      ${l.city}
      ${l.kode}
      `.toLowerCase();

      return words.every((w) => searchable.includes(w));

    });

  }, [searchQuery, listings]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  const paginated = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const startItem =
    filtered.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;

  const endItem = Math.min(page * ITEMS_PER_PAGE, filtered.length);

  function toggleFeatured(id: string) {

    setListings((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, featured: !l.featured } : l
      )
    );

  }

  return (
    <div>

      {/* Header */}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1C1C1E]">
          Featured Listings
        </h1>
        <p className="text-sm text-gray-500">
          Kelola listing yang tampil di homepage dan spotlight.
        </p>
      </div>

      {/* Search */}

      <div className="mt-6 relative">

        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
          size={18}
        />

        <input
          type="text"
          placeholder="Cari listing, owner, kota..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          className="w-full border border-gray-400 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-[#1C1C1E] placeholder-gray-500"
        />

      </div>

      {/* Listings Card */}

      <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm">

        <div className="divide-y divide-gray-100">

          {paginated.map((listing) => (

            <div
              key={listing.id}
              className="p-6 flex items-center justify-between gap-6"
            >

              {/* LEFT */}

              <div>

                <p className="font-medium text-[#1C1C1E]">
                  {listing.title}
                </p>

                <p className="text-sm text-gray-500">
                  Owner: {listing.owner}
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  {listing.kode} • {listing.city}
                </p>

                <p className="text-xs text-gray-400">
                  {listing.price}
                </p>

              </div>

              {/* ACTION */}

              <button
                onClick={() => toggleFeatured(listing.id)}
                className="px-3 py-2 border rounded-lg hover:bg-gray-50"
              >
                {listing.featured ? (
                  <Star size={18}/>
                ) : (
                  <StarOff size={18}/>
                )}
              </button>

            </div>

          ))}

        </div>

      </div>

      {/* Pagination */}

      <div className="flex items-center justify-between mt-6">

        <p className="text-sm text-gray-900">
          Menampilkan {startItem}–{endItem} dari {filtered.length} listing
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