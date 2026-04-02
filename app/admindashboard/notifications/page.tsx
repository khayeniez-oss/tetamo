"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Bell, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";

/* =========================
TYPES
========================= */

type NotificationTarget = "ALL" | "AGENTS" | "OWNERS" | "ADMIN";

type Notification = {
  id: string;
  title: string;
  message: string;
  target: NotificationTarget;
  date: string;
};

type NotificationRow = {
  id: string;
  title: string | null;
  body: string | null;
  audience: string | null;
  created_at: string | null;
  user_id: string | null;
};

type ProfileRow = {
  id: string;
  role: string | null;
};

/* =========================
HELPERS
========================= */

function formatDate(value?: string | null) {
  if (!value) return "-";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function targetUI(target: NotificationTarget) {
  if (target === "ALL")
    return {
      label: "All Users",
      badge: "bg-blue-50 text-blue-700 border-blue-200",
    };

  if (target === "AGENTS")
    return {
      label: "Agents",
      badge: "bg-green-50 text-green-700 border-green-200",
    };

  if (target === "OWNERS")
    return {
      label: "Owners",
      badge: "bg-purple-50 text-purple-700 border-purple-200",
    };

  return {
    label: "Admin",
    badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
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

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    let ignore = false;

    async function loadNotifications() {
      setLoading(true);
      setLoadError("");

      try {
        const { data: notifData, error: notifError } = await supabase
          .from("notifications")
          .select("id,title,body,audience,created_at,user_id")
          .order("created_at", { ascending: false });

        if (notifError) throw notifError;

        const rows = (notifData ?? []) as NotificationRow[];

        const userIds = Array.from(
          new Set(rows.map((x) => x.user_id).filter(Boolean))
        ) as string[];

        let profileMap = new Map<string, ProfileRow>();

        if (userIds.length > 0) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("id,role")
            .in("id", userIds);

          if (profileError) throw profileError;

          profileMap = new Map(
            ((profileData ?? []) as ProfileRow[]).map((p) => [p.id, p])
          );
        }

        const mapped: Notification[] = rows.map((row) => {
          const profile = row.user_id ? profileMap.get(row.user_id) : null;

          let target: NotificationTarget = "ALL";

          const audience = (row.audience || "").toLowerCase();
          const role = (profile?.role || "").toLowerCase();

          if (audience === "admin") {
            target = "ADMIN";
          } else if (role === "agent") {
            target = "AGENTS";
          } else if (role === "owner") {
            target = "OWNERS";
          } else {
            target = "ALL";
          }

          return {
            id: row.id,
            title: row.title || "-",
            message: row.body || "-",
            target,
            date: formatDate(row.created_at),
          };
        });

        if (!ignore) {
          setNotifications(mapped);
        }
      } catch (error: any) {
        console.error("Failed to load notifications:", error);
        if (!ignore) {
          setLoadError(error?.message || "Failed to load notifications.");
          setNotifications([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadNotifications();

    return () => {
      ignore = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return notifications;

    const words = searchQuery.toLowerCase().split(" ").filter(Boolean);

    return notifications.filter((n) => {
      const searchable = `
        ${n.title}
        ${n.message}
        ${n.target}
      `.toLowerCase();

      return words.every((w) => searchable.includes(w));
    });
  }, [notifications, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, notifications.length]);

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-[#1C1C1E] sm:text-xl">
            Notifications
          </h1>
          <p className="text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
            Kirim dan kelola notifikasi sistem Tetamo.
          </p>
        </div>

        <button className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1C1C1E] px-4 text-[12px] font-semibold text-white shadow-sm hover:opacity-90 sm:h-11 sm:w-auto sm:px-5 sm:text-sm">
          <Send size={15} />
          <span>New Notification</span>
        </button>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      ) : null}

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          size={16}
        />

        <input
          type="text"
          placeholder="Cari notifikasi..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          className="h-10 w-full rounded-2xl border border-gray-300 pl-10 pr-4 text-[13px] outline-none focus:border-[#1C1C1E] placeholder:text-gray-400 sm:h-11 sm:pl-11 sm:text-sm"
        />
      </div>

      {/* Notifications Card */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Loading notifications...
            </div>
          ) : paginated.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No notifications found.
            </div>
          ) : (
            paginated.map((notif) => {
              const ui = targetUI(notif.target);

              return (
                <div key={notif.id} className="px-3.5 py-4 sm:px-5">
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

                        <p className="mt-2 text-[13px] font-semibold text-[#1C1C1E] sm:text-sm md:text-[15px]">
                          {notif.title}
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-2.5">
                          <div className="col-span-2 rounded-2xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                              Message
                            </p>
                            <p className="mt-1 text-[11px] leading-5 text-gray-600 sm:text-xs md:text-sm">
                              {notif.message}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                              Target
                            </p>
                            <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-[13px]">
                              {ui.label}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                              Date
                            </p>
                            <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-[13px]">
                              {notif.date}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT */}
                      <div className="grid grid-cols-1 gap-2 xl:w-[120px] xl:shrink-0">
                        <div className="flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-500">
                          <Bell size={16} />
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
          Menampilkan {startItem}–{endItem} dari {filtered.length} notifikasi
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-gray-300 bg-[#1C1C1E] px-3.5 text-[12px] font-medium text-white disabled:opacity-50 sm:h-10 sm:px-4 sm:text-sm"
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
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-gray-300 bg-[#1C1C1E] px-3.5 text-[12px] font-medium text-white disabled:opacity-50 sm:h-10 sm:px-4 sm:text-sm"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
}