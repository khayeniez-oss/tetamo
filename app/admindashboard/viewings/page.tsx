"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  CalendarDays,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
} from "lucide-react";

/* =========================
TYPES
========================= */

type ViewingStatus =
  | "SCHEDULED"
  | "RESCHEDULED"
  | "DONE"
  | "NO_SHOW"
  | "CANCELLED";

type AdminViewing = {
  id: string;
  listingKode: string;
  propertyTitle: string;
  buyerName: string;
  buyerPhone: string;
  agentName: string;
  ownerName: string;
  city: string;
  date: string;
  time: string;
  status: ViewingStatus;
};

/* =========================
DEMO DATA
========================= */

const DEMO_VIEWINGS: AdminViewing[] = [
  {
    id: "viewing_001",
    listingKode: "TTM-2026-00021",
    propertyTitle: "Rumah Modern Minimalis — Lokasi Strategis",
    buyerName: "Andi Pratama",
    buyerPhone: "0812-7788-9911",
    agentName: "Kevin Halim",
    ownerName: "Gunawan",
    city: "Jakarta Selatan",
    date: "06 Mar 2026",
    time: "10:00",
    status: "SCHEDULED",
  },
  {
    id: "viewing_002",
    listingKode: "TTM-2026-00022",
    propertyTitle: "Apartemen 2BR — Dekat MRT",
    buyerName: "Rina Setiawan",
    buyerPhone: "0813-5566-1122",
    agentName: "Sinta Lestari",
    ownerName: "Michael Tan",
    city: "Jakarta Pusat",
    date: "06 Mar 2026",
    time: "14:30",
    status: "RESCHEDULED",
  },
  {
    id: "viewing_003",
    listingKode: "TTM-2026-00023",
    propertyTitle: "Ruko 2 Lantai — Jalan Besar",
    buyerName: "Kevin Halim",
    buyerPhone: "0812-3344-8899",
    agentName: "Dimas Pratama",
    ownerName: "Budi Santoso",
    city: "Jakarta Utara",
    date: "07 Mar 2026",
    time: "11:00",
    status: "DONE",
  },
];

/* =========================
STATUS UI
========================= */

function statusUI(status: ViewingStatus) {
  if (status === "SCHEDULED")
    return {
      label: "Scheduled",
      badge: "bg-blue-50 text-blue-700 border-blue-200",
    };

  if (status === "RESCHEDULED")
    return {
      label: "Rescheduled",
      badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
    };

  if (status === "DONE")
    return {
      label: "Done",
      badge: "bg-green-50 text-green-700 border-green-200",
    };

  if (status === "NO_SHOW")
    return {
      label: "No Show",
      badge: "bg-gray-100 text-gray-700 border-gray-200",
    };

  return {
    label: "Cancelled",
    badge: "bg-red-50 text-red-700 border-red-200",
  };
}

/* =========================
PAGE
========================= */

export default function AdminViewingsPage() {
  const [viewings] = useState(DEMO_VIEWINGS);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const ITEMS_PER_PAGE = 12;

  /* =========================
  SEARCH
  ========================= */

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return viewings;

    const words = searchQuery.toLowerCase().split(" ");

    return viewings.filter((v) => {
      const searchable = `
      ${v.propertyTitle}
      ${v.buyerName}
      ${v.buyerPhone}
      ${v.agentName}
      ${v.ownerName}
      ${v.city}
      ${v.listingKode}
      `.toLowerCase();

      return words.every((w) => searchable.includes(w));
    });
  }, [searchQuery, viewings]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  const paginated = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const startItem =
    filtered.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;

  const endItem = Math.min(page * ITEMS_PER_PAGE, filtered.length);

  return (
    <div>

      {/* Header */}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1C1C1E]">
          Viewing Schedule
        </h1>
        <p className="text-sm text-gray-500">
          Monitor all scheduled property viewings.
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
          placeholder="Cari buyer, property, agent, kota..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          className="w-full border border-gray-400 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-[#1C1C1E] placeholder-gray-500"
        />

      </div>

      {/* Viewings Card */}

      <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm">

        <div className="divide-y divide-gray-100">

          {paginated.map((item) => {

            const ui = statusUI(item.status);

            return (
              <div
                key={item.id}
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
                    {item.propertyTitle}
                  </p>

                  <p className="text-sm text-gray-500">
                    Buyer: {item.buyerName} • {item.buyerPhone}
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    Agent: {item.agentName} • Owner: {item.ownerName}
                  </p>

                  <p className="text-xs text-gray-400">
                    {item.city} • {item.date} • {item.time}
                  </p>

                  <p className="text-xs text-gray-400">
                    Listing: {item.listingKode}
                  </p>

                </div>

                {/* ACTION */}

                <div className="flex items-center gap-2">

                  <button className="px-3 py-2 border rounded-lg hover:bg-gray-50">
                    <CalendarDays size={16}/>
                  </button>

                  <button className="px-3 py-2 border rounded-lg hover:bg-gray-50">
                    <RotateCcw size={16}/>
                  </button>

                  <button className="px-3 py-2 border rounded-lg hover:bg-gray-50">
                    <CheckCircle size={16}/>
                  </button>

                  <button className="px-3 py-2 border rounded-lg hover:bg-gray-50">
                    <XCircle size={16}/>
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
          Menampilkan {startItem}–{endItem} dari {filtered.length} jadwal
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