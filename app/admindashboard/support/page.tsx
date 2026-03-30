"use client";

import { useState, useMemo } from "react";
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

    const words = searchQuery.toLowerCase().split(" ");

    return tickets.filter((t) => {

      const searchable = `
        ${t.user}
        ${t.email}
        ${t.subject}
        ${t.message}
      `.toLowerCase();

      return words.every((w) => searchable.includes(w));

    });

  }, [tickets, searchQuery]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  const paginated = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const startItem =
    filtered.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;

  const endItem = Math.min(page * ITEMS_PER_PAGE, filtered.length);

  function resolveTicket(id: string) {

    setTickets((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: "RESOLVED" } : t
      )
    );

  }

  return (
    <div>

      {/* Header */}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1C1C1E]">
          Support Tickets
        </h1>
        <p className="text-sm text-gray-500">
          Kelola permintaan bantuan dari users.
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
          placeholder="Cari user, email, masalah..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          className="w-full border border-gray-400 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-[#1C1C1E] placeholder-gray-500"
        />

      </div>

      {/* Ticket List */}

      <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm">

        <div className="divide-y divide-gray-100">

          {paginated.map((ticket) => {

            const ui = statusUI(ticket.status);

            return (
              <div
                key={ticket.id}
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
                    {ticket.subject}
                  </p>

                  <p className="text-sm text-gray-500">
                    {ticket.message}
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    {ticket.user} • {ticket.email}
                  </p>

                </div>

                {/* RIGHT */}

                <div className="flex items-center gap-2">

                  <button
                    className="px-3 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    <MessageCircle size={16}/>
                  </button>

                  <button
                    onClick={() => resolveTicket(ticket.id)}
                    className="px-3 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    <CheckCircle2 size={16}/>
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
          Menampilkan {startItem}–{endItem} dari {filtered.length} tiket
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