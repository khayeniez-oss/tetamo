"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";

type NotificationRow = {
  id: string;
  user_id: string | null;
  related_user_id: string | null;
  property_id: string | null;
  lead_id: string | null;
  type: string;
  title: string;
  body: string | null;
  audience: string | null;
  is_read: boolean | null;
  priority: "low" | "normal" | "high" | string | null;
  created_at: string | null;
};

type NotificationBellProps = {
  userId: string | null;
  role: string | null;
  label: string;
  variant: "desktop" | "mobile";
  onProtectedNavigate: (href: string) => void;
};

const NOTIFICATIONS_HREF = "/notifications";

function formatTime(value: string | null, lang: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffMinutes < 1) return lang === "id" ? "Baru saja" : "Just now";
  if (diffMinutes < 60) {
    return lang === "id"
      ? `${diffMinutes} menit lalu`
      : `${diffMinutes} min ago`;
  }
  if (diffHours < 24) {
    return lang === "id" ? `${diffHours} jam lalu` : `${diffHours}h ago`;
  }

  return new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function priorityClass(priority: string | null) {
  if (priority === "high") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (priority === "low") {
    return "border-gray-200 bg-gray-50 text-gray-600";
  }

  return "border-yellow-200 bg-yellow-50 text-yellow-700";
}

function getNotificationHref(item: NotificationRow, role: string | null) {
  const type = String(item.type || "").toLowerCase();

  if (type.includes("lead") || type.includes("whatsapp")) {
    if (role === "agent") return "/agentdashboard/leads";
    if (role === "owner") return "/pemilikdashboard/leads";
    if (role === "admin") return "/admindashboard/leads";
  }

  if (type.includes("viewing")) {
    if (role === "agent") return "/agentdashboard/jadwal-viewing";
    if (role === "owner") return "/pemilikdashboard/jadwal-viewing";
    if (role === "admin") return "/admindashboard/leads";
  }

  if (
    type.includes("payment") ||
    type.includes("invoice") ||
    type.includes("receipt") ||
    type.includes("membership") ||
    type.includes("package")
  ) {
    if (role === "agent") return "/agentdashboard/tagihan";
    if (role === "owner") return "/pemilikdashboard/tagihan";
    if (role === "admin") return "/admindashboard";
  }

  if (
    type.includes("listing") ||
    type.includes("property") ||
    type.includes("approval") ||
    type.includes("rejected")
  ) {
    if (role === "agent") return "/agentdashboard/listing-saya";
    if (role === "owner") return "/pemilikdashboard/listing-saya";
    if (role === "admin") return "/admindashboard";
  }

  if (type.includes("blog")) return "/blog";
  if (type.includes("education")) return "/education";

  return NOTIFICATIONS_HREF;
}

export default function NotificationBell({
  userId,
  role,
  label,
  variant,
  onProtectedNavigate,
}: NotificationBellProps) {
  const { lang } = useLanguage();
  const isID = lang === "id";

  const ui = useMemo(
    () =>
      isID
        ? {
            empty: "Belum ada notifikasi.",
            markAll: "Tandai semua dibaca",
            viewAll: "Lihat semua",
            unread: "Belum dibaca",
            open: "Buka",
          }
        : {
            empty: "No notifications yet.",
            markAll: "Mark all as read",
            viewAll: "View all",
            unread: "Unread",
            open: "Open",
          },
    [isID]
  );

  const rootRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundUnlocked, setSoundUnlocked] = useState(false);

  useEffect(() => {
    audioRef.current = new Audio("/tetamo-notification.mp3");
    audioRef.current.volume = 0.65;
  }, []);

  useEffect(() => {
    function unlockSound() {
      setSoundUnlocked(true);
    }

    document.addEventListener("click", unlockSound, { once: true });
    document.addEventListener("keydown", unlockSound, { once: true });

    return () => {
      document.removeEventListener("click", unlockSound);
      document.removeEventListener("keydown", unlockSound);
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  async function loadNotifications() {
    if (!userId) {
      setItems([]);
      setUnreadCount(0);
      return;
    }

    const [listResult, countResult] = await Promise.all([
      supabase
        .from("notifications")
        .select(
          "id, user_id, related_user_id, property_id, lead_id, type, title, body, audience, is_read, priority, created_at"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),

      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false),
    ]);

    if (listResult.error) {
      setItems([]);
    } else {
      setItems((listResult.data || []) as NotificationRow[]);
    }

    if (countResult.error) {
      setUnreadCount(0);
    } else {
      setUnreadCount(countResult.count ?? 0);
    }
  }

  useEffect(() => {
    void loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`navbar-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const nextItem = payload.new as NotificationRow;

          setItems((prev) => [
            nextItem,
            ...prev.filter((item) => item.id !== nextItem.id),
          ].slice(0, 10));

          if (nextItem.is_read !== true) {
            setUnreadCount((prev) => prev + 1);
          }

          if (soundUnlocked && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, soundUnlocked]);

  async function markRead(item: NotificationRow) {
    if (!userId || item.is_read) return;

    setItems((prev) =>
      prev.map((current) =>
        current.id === item.id ? { ...current, is_read: true } : current
      )
    );

    setUnreadCount((prev) => Math.max(0, prev - 1));

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", item.id)
      .eq("user_id", userId);
  }

  async function markAllRead() {
    if (!userId) return;

    setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
    setUnreadCount(0);

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
  }

  async function openNotification(item: NotificationRow) {
    await markRead(item);
    setOpen(false);
    onProtectedNavigate(getNotificationHref(item, role));
  }

  function handleBellClick() {
    if (!userId) {
      onProtectedNavigate(NOTIFICATIONS_HREF);
      return;
    }

    setOpen((prev) => !prev);
  }

  const countText = unreadCount > 99 ? "99+" : String(unreadCount);

  if (variant === "mobile") {
    return (
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={handleBellClick}
          className="relative inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-[#1C1C1E] bg-[#1C1C1E] px-3 py-2.5 text-center text-sm font-semibold text-white transition hover:opacity-90"
        >
          <Bell className="h-3.5 w-3.5" />
          <span>{label}</span>

          {unreadCount > 0 ? (
            <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#B8860B] px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
              {countText}
            </span>
          ) : null}
        </button>

        {open ? (
          <div className="mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
            <NotificationDropdown
              items={items}
              unreadCount={unreadCount}
              ui={ui}
              lang={lang}
              onMarkAllRead={markAllRead}
              onOpenNotification={openNotification}
              onViewAll={() => {
                setOpen(false);
                onProtectedNavigate(NOTIFICATIONS_HREF);
              }}
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={handleBellClick}
        aria-label={label}
        title={label}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#1C1C1E] bg-[#1C1C1E] text-white transition hover:opacity-90 lg:h-9 lg:w-9"
      >
        <Bell className="h-3.5 w-3.5" />

        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[16px] items-center justify-center rounded-full bg-[#B8860B] px-1 py-0.5 text-[8px] font-bold leading-none text-white shadow-md">
            {countText}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+10px)] w-[360px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.16)]">
          <NotificationDropdown
            items={items}
            unreadCount={unreadCount}
            ui={ui}
            lang={lang}
            onMarkAllRead={markAllRead}
            onOpenNotification={openNotification}
            onViewAll={() => {
              setOpen(false);
              onProtectedNavigate(NOTIFICATIONS_HREF);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function NotificationDropdown({
  items,
  unreadCount,
  ui,
  lang,
  onMarkAllRead,
  onOpenNotification,
  onViewAll,
}: {
  items: NotificationRow[];
  unreadCount: number;
  ui: {
    empty: string;
    markAll: string;
    viewAll: string;
    unread: string;
    open: string;
  };
  lang: string;
  onMarkAllRead: () => void;
  onOpenNotification: (item: NotificationRow) => void;
  onViewAll: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[#1C1C1E]">Notifications</p>
          <p className="text-xs text-gray-500">
            {unreadCount > 0 ? `${unreadCount} ${ui.unread}` : ui.empty}
          </p>
        </div>

        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-[#1C1C1E] hover:bg-gray-50"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {ui.markAll}
          </button>
        ) : null}
      </div>

      <div className="max-h-[360px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-500">
            {ui.empty}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((item) => {
              const unread = item.is_read !== true;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenNotification(item)}
                  className={[
                    "block w-full px-4 py-3 text-left transition hover:bg-gray-50",
                    unread ? "bg-yellow-50/40" : "bg-white",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={[
                        "mt-1 h-2.5 w-2.5 shrink-0 rounded-full border",
                        priorityClass(item.priority),
                      ].join(" ")}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="line-clamp-1 text-sm font-semibold text-[#1C1C1E]">
                          {item.title}
                        </p>
                        <span className="shrink-0 text-[11px] text-gray-400">
                          {formatTime(item.created_at, lang)}
                        </span>
                      </div>

                      {item.body ? (
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                          {item.body}
                        </p>
                      ) : null}

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">
                          {item.type}
                        </span>

                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1C1C1E]">
                          {ui.open}
                          <ExternalLink className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onViewAll}
        className="flex w-full items-center justify-center border-t border-gray-100 px-4 py-3 text-sm font-semibold text-[#1C1C1E] hover:bg-gray-50"
      >
        {ui.viewAll}
      </button>
    </div>
  );
}