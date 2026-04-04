"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Check,
  RefreshCw,
  Search,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";

type AppRole = "owner" | "agent" | "admin" | "developer" | "user" | null;

type NotificationRow = {
  id: string;
  user_id: string | null;
  type: string | null;
  title: string | null;
  body: string | null;
  priority: string | null;
  is_read: boolean | null;
  created_at: string | null;
  property_id?: string | null;
  lead_id?: string | null;
};

function getDashboardHref(role: AppRole) {
  if (role === "owner") return "/pemilikdashboard";
  if (role === "agent") return "/agentdashboard";
  if (role === "admin") return "/admindashboard";
  if (role === "developer") return "/";
  return "/";
}

function formatDisplayDate(value: string | null, lang: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getRelativeTime(value: string | null, lang: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const diffMs = date.getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat(lang === "id" ? "id-ID" : "en", {
    numeric: "auto",
  });

  const minutes = Math.round(diffMs / (1000 * 60));
  const hours = Math.round(diffMs / (1000 * 60 * 60));
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  return rtf.format(days, "day");
}

function priorityUI(priority: string | null, lang: string) {
  const value = String(priority || "").toLowerCase();

  if (value === "high") {
    return {
      label: lang === "id" ? "Tinggi" : "High",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }

  if (value === "medium") {
    return {
      label: lang === "id" ? "Sedang" : "Medium",
      className: "border-yellow-200 bg-yellow-50 text-yellow-700",
    };
  }

  return {
    label: lang === "id" ? "Normal" : "Normal",
    className: "border-gray-200 bg-gray-50 text-gray-700",
  };
}

function typeLabel(type: string | null, lang: string) {
  const value = String(type || "").toLowerCase();

  const mapId: Record<string, string> = {
    new_whatsapp_inquiry: "WhatsApp Inquiry Baru",
    new_viewing_request: "Permintaan Viewing Baru",
    listing_marked_sold: "Listing Ditandai Terjual",
    listing_marked_rented: "Listing Ditandai Tersewa",
    listing_approved: "Listing Disetujui",
    listing_rejected: "Listing Ditolak",
    payment_success: "Pembayaran Berhasil",
    receipt_ready: "Receipt Siap",
    membership_expiring: "Membership Akan Habis",
    admin_alert: "Alert Admin",
  };

  const mapEn: Record<string, string> = {
    new_whatsapp_inquiry: "New WhatsApp Inquiry",
    new_viewing_request: "New Viewing Request",
    listing_marked_sold: "Listing Marked Sold",
    listing_marked_rented: "Listing Marked Rented",
    listing_approved: "Listing Approved",
    listing_rejected: "Listing Rejected",
    payment_success: "Payment Success",
    receipt_ready: "Receipt Ready",
    membership_expiring: "Membership Expiring",
    admin_alert: "Admin Alert",
  };

  return lang === "id"
    ? mapId[value] || "Notifikasi"
    : mapEn[value] || "Notification";
}

export default function NotificationsPage() {
  const router = useRouter();
  const { lang } = useLanguage();

  const t =
    lang === "id"
      ? {
          title: "Notifikasi",
          subtitle:
            "Semua notifikasi untuk akun Anda akan muncul di sini.",
          back: "Kembali",
          loading: "Memuat notifikasi...",
          loginFirst: "Silakan login terlebih dahulu.",
          failed: "Gagal memuat notifikasi.",
          all: "Semua",
          unread: "Belum Dibaca",
          search: "Cari judul, isi, atau tipe notifikasi...",
          empty: "Belum ada notifikasi.",
          emptyUnread: "Tidak ada notifikasi yang belum dibaca.",
          unreadOnly: "Belum dibaca saja",
          read: "Sudah dibaca",
          markRead: "Tandai Dibaca",
          markAllRead: "Tandai Semua Dibaca",
          marking: "Memproses...",
          refresh: "Refresh",
          noTitle: "Tanpa Judul",
          noBody: "Tidak ada isi notifikasi.",
        }
      : {
          title: "Notifications",
          subtitle: "All notifications for your account will appear here.",
          back: "Back",
          loading: "Loading notifications...",
          loginFirst: "Please log in first.",
          failed: "Failed to load notifications.",
          all: "All",
          unread: "Unread",
          search: "Search title, body, or notification type...",
          empty: "No notifications yet.",
          emptyUnread: "No unread notifications.",
          unreadOnly: "Unread only",
          read: "Read",
          markRead: "Mark as Read",
          markAllRead: "Mark All as Read",
          marking: "Processing...",
          refresh: "Refresh",
          noTitle: "Untitled",
          noBody: "No notification body.",
        };

  const [role, setRole] = useState<AppRole>(null);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = useMemo(() => {
    return notifications.filter((item) => !item.is_read).length;
  }, [notifications]);

  async function loadNotifications() {
    try {
      setLoading(true);
      setPageError("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setPageError(t.loginFirst);
        setNotifications([]);
        setLoading(false);
        router.push(`/login?next=${encodeURIComponent("/notifications")}`);
        return;
      }

      const [profileRes, notificationsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("notifications")
          .select(
            "id, user_id, type, title, body, priority, is_read, created_at, property_id, lead_id"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (profileRes.error) {
        console.error("Failed to load profile role:", profileRes.error);
      }

      if (notificationsRes.error) {
        throw notificationsRes.error;
      }

      setRole((profileRes.data?.role as AppRole) ?? "user");
      setNotifications((notificationsRes.data || []) as NotificationRow[]);
    } catch (error: any) {
      console.error("Notifications load error:", error);
      setPageError(error?.message || t.failed);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const filteredNotifications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return notifications.filter((item) => {
      if (showUnreadOnly && item.is_read) return false;

      if (!query) return true;

      const searchable = [
        item.title || "",
        item.body || "",
        item.type || "",
        item.priority || "",
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [notifications, searchQuery, showUnreadOnly]);

  async function handleMarkAsRead(id: string) {
    try {
      setMarkingId(id);

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_read: true } : item
        )
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    } finally {
      setMarkingId(null);
    }
  }

  async function handleMarkAllAsRead() {
    try {
      setMarkingAll(true);

      const unreadIds = notifications.filter((item) => !item.is_read).map((item) => item.id);

      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", unreadIds);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          is_read: true,
        }))
      );
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    } finally {
      setMarkingAll(false);
    }
  }

  const dashboardHref = getDashboardHref(role);

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              href={dashboardHref}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-[#1C1C1E] transition hover:bg-gray-50 sm:text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.back}
            </Link>

            <h1 className="mt-4 text-xl font-bold tracking-tight text-[#1C1C1E] sm:text-2xl lg:text-3xl">
              {t.title}
            </h1>
            <p className="mt-1 text-xs text-gray-500 sm:text-sm">
              {t.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadNotifications}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-[#1C1C1E] transition hover:bg-gray-50 sm:text-sm"
            >
              <RefreshCw className="h-4 w-4" />
              {t.refresh}
            </button>

            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={markingAll || unreadCount === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1C1C1E] px-3 py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
            >
              <CheckCheck className="h-4 w-4" />
              {markingAll ? t.marking : t.markAllRead}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-[11px] text-gray-500 sm:text-xs">{t.all}</div>
            <div className="mt-1 text-lg font-semibold text-[#1C1C1E] sm:text-2xl">
              {notifications.length}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-[11px] text-gray-500 sm:text-xs">{t.unread}</div>
            <div className="mt-1 text-lg font-semibold text-[#1C1C1E] sm:text-2xl">
              {unreadCount}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-[11px] text-gray-500 sm:text-xs">{t.read}</div>
            <div className="mt-1 text-lg font-semibold text-[#1C1C1E] sm:text-2xl">
              {Math.max(0, notifications.length - unreadCount)}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-[11px] text-gray-500 sm:text-xs">{t.unreadOnly}</div>
            <button
              type="button"
              onClick={() => setShowUnreadOnly((prev) => !prev)}
              className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-medium transition ${
                showUnreadOnly
                  ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {showUnreadOnly ? t.unread : t.all}
            </button>
          </div>
        </div>

        <div className="relative mt-5 sm:mt-6">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.search}
            className="w-full rounded-2xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-[13px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#1C1C1E] sm:py-3 sm:pl-11 sm:text-sm"
          />
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm sm:mt-8">
          {loading ? (
            <div className="p-5 text-sm text-gray-500 sm:p-6">{t.loading}</div>
          ) : pageError ? (
            <div className="p-5 text-sm text-red-600 sm:p-6">{pageError}</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                <Bell className="h-6 w-6 text-gray-400" />
              </div>
              <p className="mt-4 text-sm font-medium text-[#1C1C1E]">
                {showUnreadOnly ? t.emptyUnread : t.empty}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredNotifications.map((item) => {
                const unread = !item.is_read;
                const priority = priorityUI(item.priority, lang);

                return (
                  <div
                    key={item.id}
                    className={`p-4 sm:p-5 lg:p-6 ${
                      unread ? "bg-[#FFFCF2]" : "bg-white"
                    }`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium sm:px-3 sm:text-xs ${priority.className}`}
                          >
                            {priority.label}
                          </span>

                          <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-700 sm:px-3 sm:text-xs">
                            {typeLabel(item.type, lang)}
                          </span>

                          {unread ? (
                            <span className="rounded-full border border-[#1C1C1E] bg-[#1C1C1E] px-2.5 py-1 text-[11px] font-medium text-white sm:px-3 sm:text-xs">
                              {t.unread}
                            </span>
                          ) : null}
                        </div>

                        <h2 className="mt-3 text-sm font-semibold leading-snug text-[#1C1C1E] sm:text-base">
                          {item.title?.trim() || t.noTitle}
                        </h2>

                        <p className="mt-1 text-xs leading-6 text-gray-600 sm:text-sm">
                          {item.body?.trim() || t.noBody}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 sm:text-xs">
                          <span>{formatDisplayDate(item.created_at, lang)}</span>
                          <span>{getRelativeTime(item.created_at, lang)}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                        {unread ? (
                          <button
                            type="button"
                            onClick={() => handleMarkAsRead(item.id)}
                            disabled={markingId === item.id}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-[#1C1C1E] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                          >
                            <Check className="h-4 w-4" />
                            {markingId === item.id ? t.marking : t.markRead}
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3.5 py-2 text-xs font-medium text-green-700 sm:text-sm">
                            <Check className="h-4 w-4" />
                            {t.read}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}