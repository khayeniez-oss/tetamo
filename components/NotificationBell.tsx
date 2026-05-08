"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCheck,
  CreditCard,
  ExternalLink,
  Home,
  Info,
  MessageCircle,
  RefreshCcw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";

type NotificationRow = {
  id: string;
  user_id: string | null;
  related_user_id: string | null;
  property_id: string | null;
  lead_id: string | null;
  type: string | null;
  title: string | null;
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

type NotificationUiText = {
  title: string;
  empty: string;
  markAll: string;
  viewAll: string;
  unread: string;
  open: string;
  loading: string;
  failed: string;
  retry: string;
  allCaughtUp: string;
};

type RealtimeNotificationPayload = {
  eventType?: "INSERT" | "UPDATE" | "DELETE" | string;
  new?: unknown;
  old?: unknown;
};

const NOTIFICATIONS_HREF = "/notifications";

function toNotificationRow(value: unknown) {
  if (typeof value === "object" && value !== null) {
    return value as NotificationRow;
  }

  return null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return "Unable to load notifications.";
}

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

function priorityDotClass(priority: string | null) {
  if (priority === "high") {
    return "border-red-200 bg-red-500";
  }

  if (priority === "low") {
    return "border-gray-200 bg-gray-400";
  }

  return "border-[#B8860B]/30 bg-[#B8860B]";
}

function typePillClass(type: string | null) {
  const normalizedType = String(type || "").toLowerCase();

  if (
    normalizedType.includes("rejected") ||
    normalizedType.includes("failed") ||
    normalizedType.includes("error")
  ) {
    return "border-red-100 bg-red-50 text-red-700";
  }

  if (
    normalizedType.includes("approved") ||
    normalizedType.includes("paid") ||
    normalizedType.includes("success")
  ) {
    return "border-green-100 bg-green-50 text-green-700";
  }

  if (
    normalizedType.includes("payment") ||
    normalizedType.includes("invoice") ||
    normalizedType.includes("receipt") ||
    normalizedType.includes("membership") ||
    normalizedType.includes("package")
  ) {
    return "border-blue-100 bg-blue-50 text-blue-700";
  }

  if (
    normalizedType.includes("lead") ||
    normalizedType.includes("whatsapp") ||
    normalizedType.includes("viewing")
  ) {
    return "border-yellow-100 bg-yellow-50 text-yellow-700";
  }

  return "border-gray-200 bg-white text-gray-500";
}

function getNotificationIcon(type: string | null) {
  const normalizedType = String(type || "").toLowerCase();

  if (normalizedType.includes("lead") || normalizedType.includes("whatsapp")) {
    return MessageCircle;
  }

  if (normalizedType.includes("viewing") || normalizedType.includes("schedule")) {
    return CalendarDays;
  }

  if (
    normalizedType.includes("payment") ||
    normalizedType.includes("invoice") ||
    normalizedType.includes("receipt") ||
    normalizedType.includes("membership") ||
    normalizedType.includes("package")
  ) {
    return CreditCard;
  }

  if (
    normalizedType.includes("listing") ||
    normalizedType.includes("property") ||
    normalizedType.includes("approval") ||
    normalizedType.includes("rejected")
  ) {
    return Home;
  }

  if (normalizedType.includes("education")) return BookOpen;

  if (normalizedType.includes("alert") || normalizedType.includes("warning")) {
    return AlertCircle;
  }

  return Info;
}

function withQuery(
  href: string,
  values: {
    propertyId?: string | null;
    leadId?: string | null;
    type?: string | null;
  }
) {
  const params = new URLSearchParams();

  if (values.propertyId) params.set("property_id", values.propertyId);
  if (values.leadId) params.set("lead_id", values.leadId);
  if (values.type) params.set("type", values.type);

  const query = params.toString();

  return query ? `${href}?${query}` : href;
}

function getNotificationHref(item: NotificationRow, role: string | null) {
  const type = String(item.type || "").toLowerCase();

  if (type.includes("lead") || type.includes("whatsapp")) {
    if (role === "agent") {
      return withQuery("/agentdashboard/leads", {
        leadId: item.lead_id,
        propertyId: item.property_id,
        type: item.type,
      });
    }

    if (role === "owner") {
      return withQuery("/pemilikdashboard/leads", {
        leadId: item.lead_id,
        propertyId: item.property_id,
        type: item.type,
      });
    }

    if (role === "admin") {
      return withQuery("/admindashboard/leads", {
        leadId: item.lead_id,
        propertyId: item.property_id,
        type: item.type,
      });
    }
  }

  if (type.includes("viewing") || type.includes("schedule")) {
    if (role === "agent") {
      return withQuery("/agentdashboard/jadwal-viewing", {
        leadId: item.lead_id,
        propertyId: item.property_id,
        type: item.type,
      });
    }

    if (role === "owner") {
      return withQuery("/pemilikdashboard/jadwal-viewing", {
        leadId: item.lead_id,
        propertyId: item.property_id,
        type: item.type,
      });
    }

    if (role === "admin") {
      return withQuery("/admindashboard/leads", {
        leadId: item.lead_id,
        propertyId: item.property_id,
        type: item.type,
      });
    }
  }

  if (
    type.includes("payment") ||
    type.includes("invoice") ||
    type.includes("receipt") ||
    type.includes("membership") ||
    type.includes("package")
  ) {
    if (role === "agent") {
      return withQuery("/agentdashboard/tagihan", {
        propertyId: item.property_id,
        type: item.type,
      });
    }

    if (role === "owner") {
      return withQuery("/pemilikdashboard/tagihan", {
        propertyId: item.property_id,
        type: item.type,
      });
    }

    if (role === "admin") {
      return withQuery("/admindashboard", {
        propertyId: item.property_id,
        type: item.type,
      });
    }
  }

  if (
    type.includes("listing") ||
    type.includes("property") ||
    type.includes("approval") ||
    type.includes("rejected")
  ) {
    if (role === "agent") {
      return withQuery("/agentdashboard/listing-saya", {
        propertyId: item.property_id,
        type: item.type,
      });
    }

    if (role === "owner") {
      return withQuery("/pemilikdashboard/listing-saya", {
        propertyId: item.property_id,
        type: item.type,
      });
    }

    if (role === "admin") {
      return withQuery("/admindashboard", {
        propertyId: item.property_id,
        type: item.type,
      });
    }
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

  const ui = useMemo<NotificationUiText>(
    () =>
      isID
        ? {
            title: "Notifikasi",
            empty: "Belum ada notifikasi.",
            markAll: "Tandai semua dibaca",
            viewAll: "Lihat semua",
            unread: "belum dibaca",
            open: "Buka",
            loading: "Memuat notifikasi...",
            failed: "Gagal memuat notifikasi.",
            retry: "Coba lagi",
            allCaughtUp: "Semua sudah dibaca.",
          }
        : {
            title: "Notifications",
            empty: "No notifications yet.",
            markAll: "Mark all as read",
            viewAll: "View all",
            unread: "unread",
            open: "Open",
            loading: "Loading notifications...",
            failed: "Failed to load notifications.",
            retry: "Try again",
            allCaughtUp: "All caught up.",
          },
    [isID]
  );

  const rootRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundUnlocked, setSoundUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    audioRef.current = new Audio("/tetamo-notification.mp3");
    audioRef.current.volume = 0.65;
    audioRef.current.preload = "auto";
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

  const loadNotifications = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!userId) {
        setItems([]);
        setUnreadCount(0);
        setErrorMessage("");
        setLoading(false);
        return;
      }

      if (!options?.silent) {
        setLoading(true);
      }

      setErrorMessage("");

      try {
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

        if (listResult.error) throw listResult.error;
        if (countResult.error) throw countResult.error;

        setItems((listResult.data || []) as NotificationRow[]);
        setUnreadCount(countResult.count ?? 0);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`navbar-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimeNotificationPayload) => {
          const nextItem = toNotificationRow(payload.new);

          const shouldPlaySound =
            payload.eventType === "INSERT" && nextItem?.is_read !== true;

          if (shouldPlaySound && soundUnlocked && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          }

          void loadNotifications({ silent: true });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, soundUnlocked, loadNotifications]);

  async function markRead(item: NotificationRow) {
    if (!userId || item.is_read === true) return;

    const previousItems = items;
    const previousUnreadCount = unreadCount;

    setItems((prev) =>
      prev.map((current) =>
        current.id === item.id ? { ...current, is_read: true } : current
      )
    );

    setUnreadCount((prev) => Math.max(0, prev - 1));

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", item.id)
      .eq("user_id", userId);

    if (error) {
      setItems(previousItems);
      setUnreadCount(previousUnreadCount);
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function markAllRead() {
    if (!userId || unreadCount <= 0) return;

    const previousItems = items;
    const previousUnreadCount = unreadCount;

    setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
    setUnreadCount(0);

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      setItems(previousItems);
      setUnreadCount(previousUnreadCount);
      setErrorMessage(getErrorMessage(error));
      return;
    }

    void loadNotifications({ silent: true });
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

    setOpen((prev) => {
      const nextOpen = !prev;

      if (nextOpen) {
        void loadNotifications({ silent: true });
      }

      return nextOpen;
    });
  }

  const countText = unreadCount > 99 ? "99+" : String(unreadCount);

  if (variant === "mobile") {
    return (
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={handleBellClick}
          aria-label={label}
          aria-expanded={open}
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
              loading={loading}
              errorMessage={errorMessage}
              onRetry={() => loadNotifications()}
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
        aria-expanded={open}
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
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[360px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.16)]">
          <NotificationDropdown
            items={items}
            unreadCount={unreadCount}
            ui={ui}
            lang={lang}
            loading={loading}
            errorMessage={errorMessage}
            onRetry={() => loadNotifications()}
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
  loading,
  errorMessage,
  onRetry,
  onMarkAllRead,
  onOpenNotification,
  onViewAll,
}: {
  items: NotificationRow[];
  unreadCount: number;
  ui: NotificationUiText;
  lang: string;
  loading: boolean;
  errorMessage: string;
  onRetry: () => void;
  onMarkAllRead: () => void;
  onOpenNotification: (item: NotificationRow) => void;
  onViewAll: () => void;
}) {
  return (
    <div>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[#1C1C1E]">{ui.title}</p>
          <p className="text-xs text-gray-500">
            {loading
              ? ui.loading
              : unreadCount > 0
                ? `${unreadCount} ${ui.unread}`
                : ui.allCaughtUp}
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
        {loading && items.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-500">
            {ui.loading}
          </div>
        ) : errorMessage ? (
          <div className="px-4 py-6 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertCircle className="h-5 w-5" />
            </div>

            <p className="mt-3 text-sm font-semibold text-[#1C1C1E]">
              {ui.failed}
            </p>

            <p className="mt-1 text-xs leading-5 text-gray-500">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={onRetry}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-[#1C1C1E] hover:bg-gray-50"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              {ui.retry}
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-500">
            {ui.empty}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((item) => {
              const unread = item.is_read !== true;
              const Icon = getNotificationIcon(item.type);
              const displayTitle =
                item.title ||
                (lang === "id" ? "Notifikasi Tetamo" : "Tetamo notification");

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
                    <div className="relative shrink-0">
                      <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-gray-200 bg-white text-[#1C1C1E]">
                        <Icon className="h-4 w-4" />
                      </span>

                      {unread ? (
                        <span
                          className={[
                            "absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white",
                            priorityDotClass(item.priority),
                          ].join(" ")}
                        />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="line-clamp-1 text-sm font-semibold text-[#1C1C1E]">
                          {displayTitle}
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
                        <span
                          className={[
                            "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]",
                            typePillClass(item.type),
                          ].join(" ")}
                        >
                          {item.type || "info"}
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