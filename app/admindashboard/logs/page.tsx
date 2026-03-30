"use client";

import { useState, useMemo } from "react";
import { Search, Shield, AlertTriangle } from "lucide-react";

/* =========================
TYPES
========================= */

type LogType = "LOGIN" | "PAYMENT" | "LISTING_EDIT" | "ADMIN_ACTION" | "ERROR";

type Log = {
  id: string;
  user: string;
  action: string;
  type: LogType;
  ip: string;
  date: string;
};

/* =========================
DEMO DATA
========================= */

const DEMO_LOGS: Log[] = [
  {
    id: "log_001",
    user: "Gunawan",
    action: "Agent login",
    type: "LOGIN",
    ip: "103.22.120.45",
    date: "12 Mar 2026 09:20",
  },
  {
    id: "log_002",
    user: "Michael Tan",
    action: "Purchased Featured Listing",
    type: "PAYMENT",
    ip: "103.44.211.21",
    date: "12 Mar 2026 08:40",
  },
  {
    id: "log_003",
    user: "Admin",
    action: "Edited pricing plan",
    type: "ADMIN_ACTION",
    ip: "192.168.1.12",
    date: "11 Mar 2026 18:20",
  },
  {
    id: "log_004",
    user: "System",
    action: "Payment verification error",
    type: "ERROR",
    ip: "-",
    date: "11 Mar 2026 16:12",
  },
];

/* =========================
TYPE UI
========================= */

function typeUI(type: LogType) {
  if (type === "LOGIN")
    return {
      label: "Login",
      badge: "bg-blue-50 text-blue-700 border-blue-200",
    };

  if (type === "PAYMENT")
    return {
      label: "Payment",
      badge: "bg-green-50 text-green-700 border-green-200",
    };

  if (type === "LISTING_EDIT")
    return {
      label: "Listing Edit",
      badge: "bg-purple-50 text-purple-700 border-purple-200",
    };

  if (type === "ADMIN_ACTION")
    return {
      label: "Admin",
      badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
    };

  return {
    label: "Error",
    badge: "bg-red-50 text-red-700 border-red-200",
  };
}

/* =========================
PAGE
========================= */

export default function AdminLogsPage() {

  const [logs] = useState(DEMO_LOGS);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const ITEMS_PER_PAGE = 12;

  const filtered = useMemo(() => {

    if (!searchQuery.trim()) return logs;

    const words = searchQuery.toLowerCase().split(" ");

    return logs.filter((log) => {

      const searchable = `
        ${log.user}
        ${log.action}
        ${log.ip}
      `.toLowerCase();

      return words.every((w) => searchable.includes(w));

    });

  }, [logs, searchQuery]);

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
          System Logs
        </h1>
        <p className="text-sm text-gray-500">
          Monitor aktivitas sistem dan keamanan platform.
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
          placeholder="Cari user, aktivitas, IP..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          className="w-full border border-gray-400 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-[#1C1C1E] placeholder-gray-500"
        />

      </div>

      {/* Logs Card */}

      <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm">

        <div className="divide-y divide-gray-100">

          {paginated.map((log) => {

            const ui = typeUI(log.type);

            return (
              <div
                key={log.id}
                className="p-6 flex items-center justify-between gap-6"
              >

                {/* LEFT */}

                <div>

                  <span
                    className={`inline-flex text-xs px-3 py-1 rounded-full border ${ui.badge}`}
                  >
                    {ui.label}
                  </span>

                  <p className="mt-2 font-medium text-[#1C1C1E]">
                    {log.action}
                  </p>

                  <p className="text-sm text-gray-500">
                    User: {log.user}
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    IP: {log.ip}
                  </p>

                </div>

                {/* RIGHT */}

                <div className="text-right flex flex-col items-end gap-1">

                  {log.type === "ERROR" ? (
                    <AlertTriangle size={18} className="text-red-500"/>
                  ) : (
                    <Shield size={18} className="text-gray-400"/>
                  )}

                  <p className="text-xs text-gray-500">
                    {log.date}
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
          Menampilkan {startItem}–{endItem} dari {filtered.length} logs
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