"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { BadgeDollarSign, CheckCircle2, Clock, XCircle } from "lucide-react";

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

    const words = searchQuery.toLowerCase().split(" ");

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
          Sales & Transactions
        </h1>
        <p className="text-sm text-gray-500">
          Monitor listing purchases, payments, and platform revenue.
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
          placeholder="Cari owner, listing, package, payment..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          className="w-full border border-gray-400 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-[#1C1C1E] placeholder-gray-500"
        />

      </div>

      {/* Sales Card */}

      <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm">

        <div className="divide-y divide-gray-100">

          {paginated.map((item) => {

            const ui = statusUI(item.status);
            const Icon = ui.Icon;

            return (
              <div
                key={item.id}
                className="p-6 flex items-center justify-between gap-6"
              >

                {/* LEFT */}

                <div className="min-w-0">

                  <span
                    className={`inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border ${ui.badge}`}
                  >
                    <Icon size={14}/>
                    {ui.label}
                  </span>

                  <p className="mt-2 font-medium text-[#1C1C1E]">
                    {item.propertyTitle}
                  </p>

                  <p className="text-sm text-gray-500">
                    Owner: {item.ownerName}
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    Listing: {item.listingKode}
                  </p>

                  <p className="text-xs text-gray-400">
                    Package: {item.packageType} • {item.paymentMethod}
                  </p>

                </div>

                {/* RIGHT */}

                <div className="text-right">

                  <p className="font-semibold text-[#1C1C1E]">
                    {item.price}
                  </p>

                  <p className="text-xs text-gray-500">
                    {item.date}
                  </p>

                </div>

              </div>
            );
          })}

        </div>

      </div>

      {/* Pagination */}

      <div className="flex items-center justify-between mt-6">

        <p className="text-sm text-gray-900">
          Menampilkan {startItem}–{endItem} dari {filtered.length} transaksi
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