"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, MessageCircle, CheckCircle2 } from "lucide-react";

/* =========================
TYPES
========================= */

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

type Ticket = {
  id: string;
  user: string;
  email: string;
  subject: string;
  message: string;
  date: string;
  status: TicketStatus;
};

/* =========================
DEMO DATA
========================= */

const DEMO_TICKETS: Ticket[] = [
  {
    id: "ticket_001",
    user: "Gunawan",
    email: "gunawan@email.com",
    subject: "Listing not appearing",
    message: "My property listing is not showing in search results.",
    date: "12 Mar 2026",
    status: "OPEN",
  },
  {
    id: "ticket_002",
    user: "Michael Tan",
    email: "michael@email.com",
    subject: "Payment verification",
    message: "I paid for featured listing but status still pending.",
    date: "11 Mar 2026",
    status: "IN_PROGRESS",
  },
  {
    id: "ticket_003",
    user: "Budi Santoso",
    email: "budi@email.com",
    subject: "Agent contact issue",
    message: "Agent never contacted me after submitting lead.",
    date: "10 Mar 2026",
    status: "RESOLVED",
  },
];

/* =========================
STATUS UI
========================= */

function statusUI(status: TicketStatus) {
  if (status === "OPEN")
    return {
      label: "Open",
      badge: "bg-red-50 text-red-700 border-red-200",
    };

  if (status === "IN_PROGRESS")
    return {
      label: "In Progress",
      badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
    };

  return {
    label: "Resolved",
    badge: "bg-green-50 text-green-700 border-green-200",
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

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState(DEMO_TICKETS);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const ITEMS_PER_PAGE = 12;

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return tickets;

    const words = searchQuery.toLowerCase().split(" ").filter(Boolean);

    return tickets.filter((t) => {
      const searchable = `
        ${t.user}
        ${t.email}
        ${t.subject}
        ${t.message}
        ${t.status}
      `.toLowerCase();

      return words.every((w) => searchable.includes(w));
    });
  }, [tickets, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, tickets.length]);

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

  function resolveTicket(id: string) {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: "RESOLVED" } : t
      )
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}

      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold tracking-tight text-[#1C1C1E] sm:text-xl">
          Support Tickets
        </h1>
        <p className="text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
          Kelola permintaan bantuan dari users.
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
          placeholder="Cari user, email, masalah..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          className="h-10 w-full rounded-2xl border border-gray-300 pl-10 pr-4 text-[13px] outline-none transition placeholder:text-gray-400 focus:border-[#1C1C1E] sm:h-11 sm:pl-11 sm:text-sm"
        />
      </div>

      {/* Ticket List */}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="divide-y divide-gray-100">
          {paginated.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 sm:px-5">
              No tickets found.
            </div>
          ) : (
            paginated.map((ticket) => {
              const ui = statusUI(ticket.status);

              return (
                <div key={ticket.id} className="px-3.5 py-4 sm:px-5">
                  <div className="flex flex-col gap-3.5">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      {/* LEFT */}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium sm:text-[11px] ${ui.badge}`}
                          >
                            {ui.label}
                          </span>
                        </div>

                        <p className="mt-2 line-clamp-2 text-[13px] font-semibold text-[#1C1C1E] sm:text-sm md:text-[15px]">
                          {ticket.subject}
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-2.5">
                          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                              Message
                            </p>
                            <p className="mt-1 text-[11px] leading-5 text-gray-600 sm:text-xs md:text-sm">
                              {ticket.message}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                              User
                            </p>
                            <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-[13px]">
                              {ticket.user}
                            </p>
                            <p className="mt-1 break-words text-[11px] text-gray-500 sm:text-xs">
                              {ticket.email}
                            </p>
                          </div>

                          <div className="col-span-2 rounded-2xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                              Date
                            </p>
                            <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-[13px]">
                              {ticket.date}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT */}

                      <div className="grid grid-cols-2 gap-2 xl:w-[170px] xl:shrink-0">
                        <button
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-700 transition hover:bg-gray-50"
                          type="button"
                        >
                          <MessageCircle size={15} />
                        </button>

                        <button
                          onClick={() => resolveTicket(ticket.id)}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-green-200 bg-green-50 text-green-700 transition hover:bg-green-100"
                          type="button"
                        >
                          <CheckCircle2 size={15} />
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
          Menampilkan {startItem}–{endItem} dari {filtered.length} tiket
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