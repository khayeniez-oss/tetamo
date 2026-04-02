"use client";

import { useMemo, useState, useEffect } from "react";
import { Search, CheckCircle2, XCircle } from "lucide-react";

type ApprovalType =
  | "LISTING"
  | "AGENT"
  | "OWNER"
  | "FEATURED"
  | "PAYMENT";

type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

type ApprovalItem = {
  id: string;
  title: string;
  subtitle: string;
  type: ApprovalType;
  date: string;
  status: ApprovalStatus;
};

const DEMO_APPROVALS: ApprovalItem[] = [
  {
    id: "app_001",
    title: "Rumah Modern Minimalis — Lokasi Strategis",
    subtitle: "Listing • Owner: Gunawan • Agent: Kevin Halim",
    type: "LISTING",
    date: "12 Mar 2026",
    status: "PENDING",
  },
  {
    id: "app_002",
    title: "Michael Tan",
    subtitle: "Owner registration • Jakarta Barat",
    type: "OWNER",
    date: "12 Mar 2026",
    status: "PENDING",
  },
  {
    id: "app_003",
    title: "Featured request — TTM-2026-00022",
    subtitle: "Listing upgrade request",
    type: "FEATURED",
    date: "11 Mar 2026",
    status: "PENDING",
  },
  {
    id: "app_004",
    title: "Payment verification — Rp 750.000",
    subtitle: "Owner: Gunawan • FEATURED package",
    type: "PAYMENT",
    date: "11 Mar 2026",
    status: "PENDING",
  },
];

function typeUI(type: ApprovalType) {
  if (type === "LISTING")
    return "bg-blue-50 text-blue-700 border-blue-200";
  if (type === "AGENT")
    return "bg-green-50 text-green-700 border-green-200";
  if (type === "OWNER")
    return "bg-purple-50 text-purple-700 border-purple-200";
  if (type === "FEATURED")
    return "bg-yellow-50 text-yellow-700 border-yellow-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function statusUI(status: ApprovalStatus) {
  if (status === "APPROVED") {
    return "bg-green-50 text-green-700 border-green-200";
  }

  if (status === "REJECTED") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  return "bg-gray-100 text-gray-700 border-gray-200";
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

export default function AdminApprovalsPage() {
  const [items, setItems] = useState(DEMO_APPROVALS);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return items;

    const words = searchQuery.toLowerCase().split(" ").filter(Boolean);

    return items.filter((item) => {
      const searchable = `${item.title} ${item.subtitle} ${item.type} ${item.status}`.toLowerCase();
      return words.every((w) => searchable.includes(w));
    });
  }, [items, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, items.length]);

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

  const startItem = filtered.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(page * ITEMS_PER_PAGE, filtered.length);

  const visiblePages = useMemo(
    () => visiblePageNumbers(page, totalPages),
    [page, totalPages]
  );

  function updateStatus(id: string, status: ApprovalStatus) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold tracking-tight text-[#1C1C1E] sm:text-xl">
          Approvals Center
        </h1>
        <p className="text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
          Review listings, registrations, featured requests, and payment verification.
        </p>
      </div>

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          size={16}
        />
        <input
          type="text"
          placeholder="Cari approval..."
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
          {paginated.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 sm:px-5">
              No approvals found.
            </div>
          ) : (
            paginated.map((item) => (
              <div key={item.id} className="px-3.5 py-4 sm:px-5">
                <div className="flex flex-col gap-3.5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium sm:text-[11px] ${typeUI(item.type)}`}
                      >
                        {item.type}
                      </span>

                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium sm:text-[11px] ${statusUI(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <p className="mt-2 line-clamp-2 text-[13px] font-semibold text-[#1C1C1E] sm:text-sm md:text-[15px]">
                      {item.title}
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-2.5">
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                          Details
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-gray-600 sm:text-xs md:text-sm">
                          {item.subtitle}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                          Date
                        </p>
                        <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-[13px]">
                          {item.date}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateStatus(item.id, "APPROVED")}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 text-[12px] font-medium text-green-700 transition hover:bg-green-100 sm:text-sm"
                      type="button"
                    >
                      <CheckCircle2 size={15} />
                      <span>Approve</span>
                    </button>

                    <button
                      onClick={() => updateStatus(item.id, "REJECTED")}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-[12px] font-medium text-red-700 transition hover:bg-red-100 sm:text-sm"
                      type="button"
                    >
                      <XCircle size={15} />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-gray-500 sm:text-xs md:text-sm">
          Menampilkan {startItem}–{endItem} dari {filtered.length} approvals
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