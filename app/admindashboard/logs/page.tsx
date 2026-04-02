"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Shield,
  AlertTriangle,
  Users,
  CreditCard,
  PencilLine,
  Settings2,
  ServerCrash,
} from "lucide-react";

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
  if (type === "LOGIN") {
    return {
      label: "Login",
      badge: "bg-blue-50 text-blue-700 border-blue-200",
      Icon: Users,
    };
  }

  if (type === "PAYMENT") {
    return {
      label: "Payment",
      badge: "bg-green-50 text-green-700 border-green-200",
      Icon: CreditCard,
    };
  }

  if (type === "LISTING_EDIT") {
    return {
      label: "Listing Edit",
      badge: "bg-purple-50 text-purple-700 border-purple-200",
      Icon: PencilLine,
    };
  }

  if (type === "ADMIN_ACTION") {
    return {
      label: "Admin Action",
      badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
      Icon: Settings2,
    };
  }

  return {
    label: "Error",
    badge: "bg-red-50 text-red-700 border-red-200",
    Icon: ServerCrash,
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

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-400 sm:text-xs">
        {title}
      </p>
      <p className="mt-2 text-xl font-semibold text-[#1C1C1E] sm:text-2xl">
        {value}
      </p>
    </div>
  );
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

    const words = searchQuery.toLowerCase().split(" ").filter(Boolean);

    return logs.filter((log) => {
      const searchable = `
        ${log.user}
        ${log.action}
        ${log.ip}
        ${log.type}
      `.toLowerCase();

      return words.every((w) => searchable.includes(w));
    });
  }, [logs, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: logs.length,
      login: logs.filter((log) => log.type === "LOGIN").length,
      payment: logs.filter((log) => log.type === "PAYMENT").length,
      listingEdit: logs.filter((log) => log.type === "LISTING_EDIT").length,
      adminAction: logs.filter((log) => log.type === "ADMIN_ACTION").length,
      error: logs.filter((log) => log.type === "ERROR").length,
    };
  }, [logs]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, logs.length]);

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

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}

      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight text-[#1C1C1E] sm:text-2xl">
          System Logs
        </h1>
        <p className="text-xs leading-5 text-gray-500 sm:text-sm sm:leading-6">
          Monitor platform activity, admin actions, payment events, and system
          errors.
        </p>
      </div>

      {/* Summary */}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <SummaryCard title="Total Logs" value={stats.total} />
        <SummaryCard title="Login" value={stats.login} />
        <SummaryCard title="Payment" value={stats.payment} />
        <SummaryCard title="Listing Edit" value={stats.listingEdit} />
        <SummaryCard title="Admin Action" value={stats.adminAction} />
        <SummaryCard title="Error" value={stats.error} />
      </div>

      {/* Main layout */}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
        {/* Left side */}

        <div className="min-w-0 space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-base font-semibold text-[#1C1C1E] sm:text-lg">
              Log Overview
            </h2>
            <p className="mt-1 text-xs leading-5 text-gray-500 sm:text-sm">
              Review the number of events and quickly understand the activity mix.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-gray-400">
                  Search Result
                </p>
                <p className="mt-2 text-lg font-semibold text-[#1C1C1E] sm:text-xl">
                  {filtered.length}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-gray-400">
                  Current Page
                </p>
                <p className="mt-2 text-lg font-semibold text-[#1C1C1E] sm:text-xl">
                  {page} / {totalPages}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {(Object.keys({
                LOGIN: 1,
                PAYMENT: 1,
                LISTING_EDIT: 1,
                ADMIN_ACTION: 1,
                ERROR: 1,
              }) as LogType[]).map((type) => {
                const ui = typeUI(type);
                const Icon = ui.Icon;

                const count =
                  type === "LOGIN"
                    ? stats.login
                    : type === "PAYMENT"
                    ? stats.payment
                    : type === "LISTING_EDIT"
                    ? stats.listingEdit
                    : type === "ADMIN_ACTION"
                    ? stats.adminAction
                    : stats.error;

                return (
                  <div
                    key={type}
                    className="flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-3"
                  >
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium sm:text-xs ${ui.badge}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {ui.label}
                    </span>

                    <span className="text-sm font-semibold text-[#1C1C1E]">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-base font-semibold text-[#1C1C1E] sm:text-lg">
              Security Notes
            </h2>
            <p className="mt-1 text-xs leading-5 text-gray-500 sm:text-sm">
              Use this page to review important activity patterns and unusual
              platform events.
            </p>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-semibold text-blue-800">
                  Login Events
                </p>
                <p className="mt-1 text-xs leading-5 text-blue-700">
                  Track user access and recent sign-in activity.
                </p>
              </div>

              <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-semibold text-green-800">
                  Payment Events
                </p>
                <p className="mt-1 text-xs leading-5 text-green-700">
                  Review payment-related activity and completed purchase actions.
                </p>
              </div>

              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-800">
                  Error Events
                </p>
                <p className="mt-1 text-xs leading-5 text-red-700">
                  Watch for verification issues, failed actions, or system problems.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side */}

        <div className="min-w-0 space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-4 sm:px-6 sm:py-5">
              <h2 className="text-base font-semibold text-[#1C1C1E] sm:text-lg">
                All Logs
              </h2>
              <p className="mt-1 text-xs leading-5 text-gray-500 sm:text-sm">
                Search by user, activity, IP address, or event type.
              </p>

              <div className="relative mt-4">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  size={18}
                />

                <input
                  type="text"
                  placeholder="Search user, activity, IP, type..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="h-11 w-full rounded-2xl border border-gray-300 pl-11 pr-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#1C1C1E]"
                />
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {paginated.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500 sm:px-6">
                  No logs found.
                </div>
              ) : (
                paginated.map((log) => {
                  const ui = typeUI(log.type);
                  const Icon = ui.Icon;

                  return (
                    <div key={log.id} className="px-4 py-4 sm:px-6 sm:py-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium sm:text-xs ${ui.badge}`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {ui.label}
                            </span>
                          </div>

                          <p className="mt-3 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                            {log.action}
                          </p>

                          <p className="mt-1 text-sm text-gray-500">
                            User: {log.user}
                          </p>

                          <p className="mt-1 text-xs leading-5 text-gray-500 sm:text-sm">
                            IP: {log.ip}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                          {log.type === "ERROR" ? (
                            <AlertTriangle className="h-4 w-4 text-red-500 sm:h-[18px] sm:w-[18px]" />
                          ) : (
                            <Shield className="h-4 w-4 text-gray-400 sm:h-[18px] sm:w-[18px]" />
                          )}

                          <p className="text-[11px] text-gray-500 sm:text-xs">
                            {log.date}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pagination */}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500 sm:text-sm">
              Showing {startItem}–{endItem} of {filtered.length} logs
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-300 bg-[#1C1C1E] px-4 text-sm font-medium text-white disabled:opacity-50"
                type="button"
              >
                Previous
              </button>

              {visiblePages.map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`inline-flex h-10 min-w-[40px] items-center justify-center rounded-xl border px-3 text-sm font-medium ${
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
                className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-300 bg-[#1C1C1E] px-4 text-sm font-medium text-white disabled:opacity-50"
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}