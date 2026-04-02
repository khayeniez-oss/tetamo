"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

/* =========================
TYPES
========================= */

type PaymentStatus = "PAID" | "PENDING" | "FAILED";

type Sale = {
  id: string;
  ownerName: string;
  propertyTitle: string;
  listingKode: string;
  packageType: "BASIC" | "FEATURED";
  price: string;
  paymentMethod: string;
  date: string;
  status: PaymentStatus;
};

/* =========================
DEMO DATA
========================= */

const DEMO_SALES: Sale[] = [
  {
    id: "sale_001",
    ownerName: "Gunawan",
    propertyTitle: "Rumah Modern Minimalis — Lokasi Strategis",
    listingKode: "TTM-2026-00021",
    packageType: "FEATURED",
    price: "Rp 750.000",
    paymentMethod: "Bank Transfer",
    date: "05 Mar 2026",
    status: "PAID",
  },
  {
    id: "sale_002",
    ownerName: "Michael Tan",
    propertyTitle: "Apartemen 2BR — Dekat MRT",
    listingKode: "TTM-2026-00022",
    packageType: "BASIC",
    price: "Rp 250.000",
    paymentMethod: "Virtual Account",
    date: "03 Mar 2026",
    status: "PENDING",
  },
  {
    id: "sale_003",
    ownerName: "Budi Santoso",
    propertyTitle: "Tanah Komersial — Pinggir Jalan Utama",
    listingKode: "TTM-2026-00023",
    packageType: "FEATURED",
    price: "Rp 750.000",
    paymentMethod: "E-Wallet",
    date: "02 Mar 2026",
    status: "FAILED",
  },
];

/* =========================
STATUS UI
========================= */

function statusUI(status: PaymentStatus) {
  if (status === "PAID")
    return {
      label: "Paid",
      badge: "bg-green-50 text-green-700 border-green-200",
      Icon: CheckCircle2,
    };

  if (status === "PENDING")
    return {
      label: "Pending",
      badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
      Icon: Clock,
    };

  return {
    label: "Failed",
    badge: "bg-red-50 text-red-700 border-red-200",
    Icon: XCircle,
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

export default function AdminSalesPage() {
  const [sales] = useState(DEMO_SALES);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const ITEMS_PER_PAGE = 12;

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return sales;

    const words = searchQuery.toLowerCase().split(" ").filter(Boolean);

    return sales.filter((s) => {
      const searchable = `
        ${s.ownerName}
        ${s.propertyTitle}
        ${s.listingKode}
        ${s.packageType}
        ${s.paymentMethod}
        ${s.status}
      `.toLowerCase();

      return words.every((w) => searchable.includes(w));
    });
  }, [searchQuery, sales]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, sales.length]);

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

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}

      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold tracking-tight text-[#1C1C1E] sm:text-xl">
          Sales & Transactions
        </h1>
        <p className="text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
          Monitor listing purchases, payments, and platform revenue.
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
          placeholder="Cari owner, listing, package, payment..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          className="h-10 w-full rounded-2xl border border-gray-300 pl-10 pr-4 text-[13px] outline-none transition placeholder:text-gray-400 focus:border-[#1C1C1E] sm:h-11 sm:pl-11 sm:text-sm"
        />
      </div>

      {/* Sales Card */}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="divide-y divide-gray-100">
          {paginated.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 sm:px-5">
              No transactions found.
            </div>
          ) : (
            paginated.map((item) => {
              const ui = statusUI(item.status);
              const Icon = ui.Icon;

              return (
                <div key={item.id} className="px-3.5 py-4 sm:px-5">
                  <div className="flex flex-col gap-3.5">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      {/* LEFT */}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium sm:text-[11px] ${ui.badge}`}
                          >
                            <Icon size={13} />
                            {ui.label}
                          </span>
                        </div>

                        <p className="mt-2 line-clamp-2 text-[13px] font-semibold text-[#1C1C1E] sm:text-sm md:text-[15px]">
                          {item.propertyTitle}
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-2.5">
                          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                              Owner
                            </p>
                            <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-[13px]">
                              {item.ownerName}
                            </p>
                            <p className="mt-1 text-[11px] text-gray-500 sm:text-xs">
                              Listing: {item.listingKode}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                              Payment
                            </p>
                            <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-[13px]">
                              {item.paymentMethod}
                            </p>
                            <p className="mt-1 text-[11px] text-gray-500 sm:text-xs">
                              Package: {item.packageType}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT */}

                      <div className="grid grid-cols-2 gap-2.5 xl:w-[200px] xl:shrink-0">
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-center xl:text-right">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                            Amount
                          </p>
                          <p className="mt-1 text-[13px] font-semibold text-[#1C1C1E] sm:text-sm">
                            {item.price}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-center xl:text-right">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                            Date
                          </p>
                          <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-[13px]">
                            {item.date}
                          </p>
                        </div>
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
          Menampilkan {startItem}–{endItem} dari {filtered.length} transaksi
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