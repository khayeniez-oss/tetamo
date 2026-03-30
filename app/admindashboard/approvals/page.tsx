"use client";

import { useMemo, useState } from "react";
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

export default function AdminApprovalsPage() {
  const [items, setItems] = useState(DEMO_APPROVALS);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const words = searchQuery.toLowerCase().split(" ");
    return items.filter((item) => {
      const searchable = `${item.title} ${item.subtitle} ${item.type}`.toLowerCase();
      return words.every((w) => searchable.includes(w));
    });
  }, [items, searchQuery]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const startItem = filtered.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(page * ITEMS_PER_PAGE, filtered.length);

  function updateStatus(id: string, status: ApprovalStatus) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1C1C1E]">Approvals Center</h1>
        <p className="text-sm text-gray-500">
          Review listings, registrations, featured requests, and payment verification.
        </p>
      </div>

      <div className="mt-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
        <input
          type="text"
          placeholder="Cari approval..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          className="w-full border border-gray-400 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-[#1C1C1E] placeholder:text-gray-500"
        />
      </div>

      <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="divide-y divide-gray-100">
          {paginated.map((item) => (
            <div key={item.id} className="p-6 flex items-center justify-between gap-6">
              <div>
                <span className={`inline-flex text-xs px-3 py-1 rounded-full border ${typeUI(item.type)}`}>
                  {item.type}
                </span>
                <p className="mt-2 font-medium text-[#1C1C1E]">{item.title}</p>
                <p className="text-sm text-gray-500">{item.subtitle}</p>
                <p className="text-xs text-gray-400 mt-1">{item.date}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateStatus(item.id, "APPROVED")}
                  className="px-3 py-2 border rounded-lg hover:bg-gray-50"
                >
                  <CheckCircle2 size={16} />
                </button>

                <button
                  onClick={() => updateStatus(item.id, "REJECTED")}
                  className="px-3 py-2 border rounded-lg hover:bg-gray-50"
                >
                  <XCircle size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-gray-900">
          Menampilkan {startItem}–{endItem} dari {filtered.length} approvals
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
                page === p ? "bg-black text-white border-black" : "border-gray-400"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-2 border rounded-lg bg-[#1C1C1E] text-white"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
}