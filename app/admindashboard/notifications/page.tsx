"use client";

import { useState, useMemo, useEffect } from "react";
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1C1E]">
            Notifications
          </h1>
          <p className="text-sm text-gray-500">
            Kirim dan kelola notifikasi sistem Tetamo.
          </p>
        </div>

        <button className="rounded-xl bg-[#1C1C1E] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 flex items-center gap-2">
          <Send size={16} />
          New Notification
        </button>
      </div>

      {loadError ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      ) : null}

      {/* Search */}
      <div className="mt-6 relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
          size={18}
        />

        <input
          type="text"
          placeholder="Cari notifikasi..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          className="w-full border border-gray-400 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-[#1C1C1E] placeholder-gray-500"
        />
      </div>

      {/* Notifications Card */}
      <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm">
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
                <div
                  key={notif.id}
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
                      {notif.title}
                    </p>

                    <p className="text-sm text-gray-500">
                      {notif.message}
                    </p>
                  </div>

                  {/* RIGHT */}
                  <div className="text-right">
                    <Bell size={20} className="text-gray-400" />

                    <p className="text-xs text-gray-500 mt-2">
                      {notif.date}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-gray-900">
          Menampilkan {startItem}–{endItem} dari {filtered.length} notifikasi
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-2 border rounded-lg bg-[#1C1C1E] text-white disabled:opacity-50"
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
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-2 border rounded-lg bg-[#1C1C1E] text-white disabled:opacity-50"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
}