"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  CalendarDays,
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

    const words = searchQuery.toLowerCase().split(" ").filter(Boolean);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

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

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}

      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold tracking-tight text-[#1C1C1E] sm:text-xl">
          Viewing Schedule
        </h1>
        <p className="text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
          Monitor all scheduled property viewings.
        </p>
      </div>

      {/* Search */}

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          size={16}
        />

        <input
          type="text"
          placeholder="Cari buyer, property, agent, kota..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          className="h-10 w-full rounded-2xl border border-gray-300 pl-10 pr-4 text-[13px] outline-none transition placeholder:text-gray-400 focus:border-[#1C1C1E] sm:h-11 sm:pl-11 sm:text-sm"
        />
      </div>

      {/* Viewings Card */}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="divide-y divide-gray-100">
          {paginated.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 sm:px-5">
              No viewing schedules found.
            </div>
          ) : (
            paginated.map((item) => {
              const ui = statusUI(item.status);

              return (
                <div key={item.id} className="px-3.5 py-4 sm:px-5">
                  <div className="flex flex-col gap-3.5">
                    {/* TOP */}

                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      {/* LEFT */}

                      <div className="min-w-0 flex-1">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium sm:text-[11px] ${ui.badge}`}
                        >
                          {ui.label}
                        </span>

                        <p className="mt-2 line-clamp-2 text-[13px] font-semibold text-[#1C1C1E] sm:text-sm md:text-[15px]">
                          {item.propertyTitle}
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-2.5">
                          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                              Buyer
                            </p>
                            <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-[13px]">
                              {item.buyerName}
                            </p>
                            <p className="mt-1 text-[11px] text-gray-500 sm:text-xs">
                              {item.buyerPhone}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                              Listing
                            </p>
                            <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-[13px]">
                              {item.listingKode}
                            </p>
                            <p className="mt-1 text-[11px] text-gray-500 sm:text-xs">
                              {item.city}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                              Agent
                            </p>
                            <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-[13px]">
                              {item.agentName}
                            </p>
                            <p className="mt-1 text-[11px] text-gray-500 sm:text-xs">
                              Owner: {item.ownerName}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                              Schedule
                            </p>
                            <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-[13px]">
                              {item.date}
                            </p>
                            <p className="mt-1 text-[11px] text-gray-500 sm:text-xs">
                              {item.time}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* ACTION */}

                      <div className="grid grid-cols-2 gap-2 xl:w-[170px] xl:shrink-0">
                        <button
                          type="button"
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-700 transition hover:bg-gray-50"
                          title="Reschedule date"
                        >
                          <CalendarDays size={15} />
                        </button>

                        <button
                          type="button"
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-700 transition hover:bg-gray-50"
                          title="Reset schedule"
                        >
                          <RotateCcw size={15} />
                        </button>

                        <button
                          type="button"
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-green-200 bg-green-50 text-green-700 transition hover:bg-green-100"
                          title="Mark done"
                        >
                          <CheckCircle size={15} />
                        </button>

                        <button
                          type="button"
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100"
                          title="Cancel"
                        >
                          <XCircle size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pagination */}

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-gray-500 sm:text-xs md:text-sm">
          Menampilkan {startItem}–{endItem} dari {filtered.length} jadwal
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