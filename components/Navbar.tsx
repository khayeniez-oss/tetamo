"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/app/context/LanguageContext";
import { useCurrency } from "@/app/context/CurrencyContext";
import { supabase } from "@/lib/supabase";
import {
  ChevronDown,
  Globe,
  User,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  BriefcaseBusiness,
  Building2,
  Shield,
  BadgeDollarSign,
  Bell,
  Home,
  CheckCheck,
  ExternalLink,
} from "lucide-react";

type ProfileData = {
  full_name: string | null;
  role: string | null;
};

type MenuItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

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
  priority: string | null;
  created_at: string | null;
};

const NOTIFICATIONS_HREF = "/notifications";

function getDashboardHref(role: string | null) {
  if (role === "owner") return "/pemilikdashboard";
  if (role === "agent") return "/agentdashboard";
  if (role === "admin") return "/admindashboard";
  if (role === "developer") return "/";
  return "/";
}

function getDisplayName(
  fullName: string | null,
  email: string | null,
  fallback: string
) {
  if (fullName?.trim()) return fullName.trim();
  if (email?.trim()) return email.trim();
  return fallback;
}

function getInitials(fullName: string | null, email: string | null) {
  const source = fullName?.trim() || email?.trim() || "A";
  const parts = source.split(" ").filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function formatNotificationTime(value: string | null, lang: string) {
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
  if (priority === "high") return "border-red-200 bg-red-500";
  if (priority === "low") return "border-gray-200 bg-gray-400";
  return "border-yellow-200 bg-[#B8860B]";
}

function getNotificationHref(item: NotificationRow, role: string | null) {
  const type = String(item.type || "").toLowerCase();

  if (type.includes("lead") || type.includes("whatsapp")) {
    if (role === "agent") return "/agentdashboard/leads";
    if (role === "owner") return "/pemilikdashboard/leads";
    if (role === "admin") return "/admindashboard";
  }

  if (type.includes("viewing")) {
    if (role === "agent") return "/agentdashboard/jadwal-viewing";
    if (role === "owner") return "/pemilikdashboard/jadwal-viewing";
    if (role === "admin") return "/admindashboard";
  }

  if (
    type.includes("payment") ||
    type.includes("invoice") ||
    type.includes("receipt") ||
    type.includes("membership") ||
    type.includes("package") ||
    type.includes("billing")
  ) {
    if (role === "agent") return "/agentdashboard/tagihan";
    if (role === "owner") return "/pemilikdashboard/tagihan";
    if (role === "admin") return "/admindashboard";
  }

  if (
    type.includes("listing") ||
    type.includes("property") ||
    type.includes("approval") ||
    type.includes("approved") ||
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

function NotificationBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="absolute -right-1 -top-1 inline-flex min-w-[16px] items-center justify-center rounded-full bg-[#B8860B] px-1 py-0.5 text-[8px] font-bold leading-none text-white shadow-md">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function NotificationDropdown({
  items,
  unreadCount,
  lang,
  emptyText,
  unreadText,
  markAllText,
  viewAllText,
  openText,
  notificationsTitle,
  onMarkAllRead,
  onOpenNotification,
  onViewAll,
}: {
  items: NotificationRow[];
  unreadCount: number;
  lang: string;
  emptyText: string;
  unreadText: string;
  markAllText: string;
  viewAllText: string;
  openText: string;
  notificationsTitle: string;
  onMarkAllRead: () => void;
  onOpenNotification: (item: NotificationRow) => void;
  onViewAll: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#1C1C1E]">
            {notificationsTitle}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {unreadCount > 0 ? `${unreadCount} ${unreadText}` : emptyText}
          </p>
        </div>

        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-[#1C1C1E] transition hover:bg-gray-50"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {markAllText}
          </button>
        ) : null}
      </div>

      <div className="max-h-[360px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            {emptyText}
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
                    unread ? "bg-yellow-50/50" : "bg-white",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={[
                        "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border",
                        priorityDotClass(item.priority),
                      ].join(" ")}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="line-clamp-1 text-sm font-semibold text-[#1C1C1E]">
                          {item.title}
                        </p>
                        <span className="shrink-0 text-[11px] text-gray-400">
                          {formatNotificationTime(item.created_at, lang)}
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
                          {openText}
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
        className="flex w-full items-center justify-center border-t border-gray-100 px-4 py-3 text-sm font-semibold text-[#1C1C1E] transition hover:bg-gray-50"
      >
        {viewAllText}
      </button>
    </div>
  );
}

function DesktopDropdown({
  label,
  items,
  isOpen,
  onToggle,
  onNavigate,
}: {
  label: string;
  items: MenuItem[];
  isOpen: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1 text-[15px] font-medium text-[#2C2C2E] transition hover:text-black"
      >
        <span>{label}</span>
        <ChevronDown
          className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+12px)] min-w-[240px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={`${label}-${item.href}`}
                href={item.href}
                onClick={onNavigate}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[#1C1C1E] transition hover:bg-gray-50"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-[#FAFAFA] text-[#1C1C1E]">
                  <Icon className="h-4 w-4" />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const { currency, setCurrency } = useCurrency();

  const isID = lang === "id";

  const t = {
    brandTagline: isID
      ? "PROPERTI • MARKETPLACE"
      : "PROPERTY • MARKETPLACE ",

    properties: isID ? "Properti" : "Properties",
    allProperties: isID ? "Semua Properti" : "All Properties",
    forSale: isID ? "Dijual" : "Sale",
    forRent: isID ? "Disewa" : "Rent",

    buyers: isID ? "Pembeli" : "Buyers",
    career: isID ? "Karier" : "Career",

    account: isID ? "Akun" : "Account",
    loading: isID ? "Memuat..." : "Loading...",
    dashboard: "Dashboard",
    loadingDashboard: isID ? "Memuat dashboard..." : "Loading dashboard...",
    logout: isID ? "Keluar" : "Logout",

    login: isID ? "Masuk" : "Login",
    developer: "Developer",
    agentPro: isID ? "Agen Pro" : "Agent Pro",
    signUp: isID ? "Daftar" : "Sign Up",
    menu: "Menu",
    quickAccess: isID ? "Akses Cepat" : "Quick Access",
    notifications: isID ? "Notifikasi" : "Notifications",
    noNotifications: isID ? "Belum ada notifikasi." : "No notifications yet.",
    unread: isID ? "belum dibaca" : "unread",
    markAllRead: isID ? "Tandai semua dibaca" : "Mark all as read",
    viewAll: isID ? "Lihat semua" : "View all",
    open: isID ? "Buka" : "Open",
  };

  const propertyItems: MenuItem[] = [
    { label: t.allProperties, href: "/properti", icon: Building2 },
    {
      label: t.forSale,
      href: "/properti?jenisListing=dijual",
      icon: BadgeDollarSign,
    },
    { label: t.forRent, href: "/properti?jenisListing=disewa", icon: Home },
  ];

  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authUserEmail, setAuthUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const [sessionLoading, setSessionLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [soundUnlocked, setSoundUnlocked] = useState(false);

  const [langOpen, setLangOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopDropdownOpen, setDesktopDropdownOpen] = useState<
    "properties" | null
  >(null);

  const desktopLangRef = useRef<HTMLDivElement | null>(null);
  const desktopCurrencyRef = useRef<HTMLDivElement | null>(null);
  const mobileLangRef = useRef<HTMLDivElement | null>(null);
  const mobileCurrencyRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const desktopNavRef = useRef<HTMLDivElement | null>(null);
  const notificationRef = useRef<HTMLDivElement | null>(null);
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);

  function closeAllMenus() {
    setLangOpen(false);
    setCurrencyOpen(false);
    setAccountOpen(false);
    setMobileMenuOpen(false);
    setDesktopDropdownOpen(null);
    setNotificationOpen(false);
  }

  async function loadProfileByUserId(
    userId: string,
    fallbackEmail: string | null
  ) {
    setProfileLoading(true);

    try {
      const result = await Promise.race([
        supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", userId)
          .maybeSingle(),
        new Promise<{ data: null; error: null }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: null }), 4000)
        ),
      ]);

      const profileData = result?.data as ProfileData | null;
      setProfile(profileData ?? null);
      setAuthUserEmail(fallbackEmail);
    } catch {
      setProfile(null);
      setAuthUserEmail(fallbackEmail);
    } finally {
      setProfileLoading(false);
    }
  }

  async function loadNotifications(userId: string | null) {
    if (!userId) {
      setNotifications([]);
      setNotificationCount(0);
      return;
    }

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
          .or("is_read.eq.false,is_read.is.null"),
      ]);

      if (listResult.error) {
        setNotifications([]);
      } else {
        setNotifications((listResult.data ?? []) as NotificationRow[]);
      }

      if (countResult.error) {
        setNotificationCount(0);
      } else {
        setNotificationCount(countResult.count ?? 0);
      }
    } catch {
      setNotifications([]);
      setNotificationCount(0);
    }
  }

  function goToProtectedRoute(href: string) {
    closeAllMenus();

    if (!authUserEmail) {
      router.push(`/login?next=${encodeURIComponent(href)}`);
      return;
    }

    router.push(href);
  }

  function resetAuthState() {
    setAuthUserId(null);
    setAuthUserEmail(null);
    setProfile(null);
    setNotificationCount(0);
    setNotifications([]);
    setNotificationOpen(false);
    setSessionLoading(false);
    setProfileLoading(false);
  }

  useEffect(() => {
    notificationAudioRef.current = new Audio("/tetamo-notification.mp3");
    notificationAudioRef.current.volume = 0.65;
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
    let mounted = true;

    async function loadAuth() {
      setSessionLoading(true);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        const user = session?.user ?? null;

        if (!user) {
          resetAuthState();
          return;
        }

        setAuthUserId(user.id);
        setAuthUserEmail(user.email ?? null);
        setSessionLoading(false);

        void loadProfileByUserId(user.id, user.email ?? null);
        void loadNotifications(user.id);
      } catch {
        if (!mounted) return;
        resetAuthState();
      }
    }

    loadAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;

      if (!mounted) return;

      if (!user) {
        resetAuthState();
        return;
      }

      setAuthUserId(user.id);
      setAuthUserEmail(user.email ?? null);
      setSessionLoading(false);

      void loadProfileByUserId(user.id, user.email ?? null);
      void loadNotifications(user.id);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authUserId) return;

    const channel = supabase
      .channel(`navbar-notifications-${authUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${authUserId}`,
        },
        (payload) => {
          const nextItem = payload.new as NotificationRow;

          setNotifications((prev) => [
            nextItem,
            ...prev.filter((item) => item.id !== nextItem.id),
          ].slice(0, 10));

          if (nextItem.is_read !== true) {
            setNotificationCount((prev) => prev + 1);
          }

          if (soundUnlocked) {
            const audio = notificationAudioRef.current;
            if (audio) {
              audio.currentTime = 0;
              audio.play().catch(() => {});
            }
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [authUserId, soundUnlocked]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;

      const insideDesktopLang =
        desktopLangRef.current?.contains(target) ?? false;
      const insideDesktopCurrency =
        desktopCurrencyRef.current?.contains(target) ?? false;
      const insideMobileLang = mobileLangRef.current?.contains(target) ?? false;
      const insideMobileCurrency =
        mobileCurrencyRef.current?.contains(target) ?? false;
      const insideNotification =
        notificationRef.current?.contains(target) ?? false;

      if (!insideDesktopLang && !insideMobileLang) {
        setLangOpen(false);
      }

      if (!insideDesktopCurrency && !insideMobileCurrency) {
        setCurrencyOpen(false);
      }

      if (accountRef.current && !accountRef.current.contains(target)) {
        setAccountOpen(false);
      }

      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        setMobileMenuOpen(false);
      }

      if (desktopNavRef.current && !desktopNavRef.current.contains(target)) {
        setDesktopDropdownOpen(null);
      }

      if (!insideNotification) {
        setNotificationOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    resetAuthState();
    setAccountOpen(false);
    setMobileMenuOpen(false);
    setDesktopDropdownOpen(null);
    router.push("/");
    router.refresh();
  }

  async function markNotificationRead(item: NotificationRow) {
    if (!authUserId || item.is_read === true) return;

    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === item.id
          ? { ...notification, is_read: true }
          : notification
      )
    );

    setNotificationCount((prev) => Math.max(0, prev - 1));

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", item.id)
      .eq("user_id", authUserId);
  }

  async function markAllNotificationsRead() {
    if (!authUserId) return;

    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, is_read: true }))
    );
    setNotificationCount(0);

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", authUserId)
      .or("is_read.eq.false,is_read.is.null");
  }

  async function openNotification(item: NotificationRow) {
    await markNotificationRead(item);
    setNotificationOpen(false);
    goToProtectedRoute(getNotificationHref(item, profile?.role ?? null));
  }

  function handleNotificationClick() {
    setLangOpen(false);
    setCurrencyOpen(false);
    setAccountOpen(false);
    setDesktopDropdownOpen(null);

    if (!authUserEmail) {
      goToProtectedRoute(NOTIFICATIONS_HREF);
      return;
    }

    setNotificationOpen((prev) => !prev);
  }

  const isLoggedIn = Boolean(authUserEmail);
  const displayName = getDisplayName(
    profile?.full_name ?? null,
    authUserEmail,
    t.account
  );
  const initials = getInitials(profile?.full_name ?? null, authUserEmail);
  const dashboardHref = getDashboardHref(profile?.role ?? null);

  const notificationDropdown = (
    <NotificationDropdown
      items={notifications}
      unreadCount={notificationCount}
      lang={lang}
      emptyText={t.noNotifications}
      unreadText={t.unread}
      markAllText={t.markAllRead}
      viewAllText={t.viewAll}
      openText={t.open}
      notificationsTitle={t.notifications}
      onMarkAllRead={() => void markAllNotificationsRead()}
      onOpenNotification={(item) => void openNotification(item)}
      onViewAll={() => goToProtectedRoute(NOTIFICATIONS_HREF)}
    />
  );

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 md:py-4">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            onClick={closeAllMenus}
            className="flex min-w-0 max-w-[calc(100%-132px)] items-center gap-3 sm:max-w-none sm:gap-4"
          >
            <div className="relative h-12 w-12 shrink-0 sm:h-14 sm:w-14 md:h-16 md:w-16">
              <Image
                src="/tetamo-logo-transparent1.png"
                alt="TeTamo logo"
                fill
                priority
                sizes="64px"
                className="object-contain"
              />
            </div>

            <div className="min-w-0 leading-tight">
              <span className="block truncate text-[18px] font-semibold tracking-[-0.01em] text-[#1C1C1E] sm:text-[20px]">
                TeTaMo
              </span>

              <span className="hidden text-[11px] font-medium uppercase tracking-[0.06em] text-[#6B7280] md:block">
                {t.brandTagline}
              </span>
            </div>
          </Link>

          <div className="hidden items-center gap-5 md:flex lg:gap-8">
            <nav
              ref={desktopNavRef}
              className="flex items-center gap-4 text-[15px] font-medium text-[#2C2C2E] lg:gap-6"
            >
              <DesktopDropdown
                label={t.properties}
                items={propertyItems}
                isOpen={desktopDropdownOpen === "properties"}
                onToggle={() =>
                  setDesktopDropdownOpen((prev) =>
                    prev === "properties" ? null : "properties"
                  )
                }
                onNavigate={closeAllMenus}
              />

              <Link href="/pembeli" className="transition hover:text-black">
                {t.buyers}
              </Link>

              <Link href="/career" className="transition hover:text-black">
                {t.career}
              </Link>
            </nav>

            <div className="flex shrink-0 items-center gap-3">
              <div ref={desktopLangRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setLangOpen((prev) => !prev);
                    setCurrencyOpen(false);
                    setAccountOpen(false);
                    setDesktopDropdownOpen(null);
                    setNotificationOpen(false);
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 text-[13px] font-medium text-[#1C1C1E] transition hover:bg-gray-50 lg:h-10 lg:px-3.5 lg:text-[13px]"
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>{lang.toUpperCase()}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>

                {langOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] w-24 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setLang("id");
                        setLangOpen(false);
                      }}
                      className={`flex w-full items-center justify-center px-4 py-3 text-sm font-medium transition ${
                        lang === "id"
                          ? "bg-[#1C1C1E] text-white"
                          : "text-[#1C1C1E] hover:bg-gray-50"
                      }`}
                    >
                      ID
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLang("en");
                        setLangOpen(false);
                      }}
                      className={`flex w-full items-center justify-center px-4 py-3 text-sm font-medium transition ${
                        lang === "en"
                          ? "bg-[#1C1C1E] text-white"
                          : "text-[#1C1C1E] hover:bg-gray-50"
                      }`}
                    >
                      EN
                    </button>
                  </div>
                )}
              </div>

              <div ref={desktopCurrencyRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setCurrencyOpen((prev) => !prev);
                    setLangOpen(false);
                    setAccountOpen(false);
                    setDesktopDropdownOpen(null);
                    setNotificationOpen(false);
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 text-[13px] font-medium text-[#1C1C1E] transition hover:bg-gray-50 lg:h-10 lg:px-3.5 lg:text-[13px]"
                >
                  <BadgeDollarSign className="h-3.5 w-3.5" />
                  <span>{currency}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>

                {currencyOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] w-28 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrency("IDR");
                        setCurrencyOpen(false);
                      }}
                      className={`flex w-full items-center justify-center px-4 py-3 text-sm font-medium transition ${
                        currency === "IDR"
                          ? "bg-[#1C1C1E] text-white"
                          : "text-[#1C1C1E] hover:bg-gray-50"
                      }`}
                    >
                      IDR
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrency("USD");
                        setCurrencyOpen(false);
                      }}
                      className={`flex w-full items-center justify-center px-4 py-3 text-sm font-medium transition ${
                        currency === "USD"
                          ? "bg-[#1C1C1E] text-white"
                          : "text-[#1C1C1E] hover:bg-gray-50"
                      }`}
                    >
                      USD
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrency("AUD");
                        setCurrencyOpen(false);
                      }}
                      className={`flex w-full items-center justify-center px-4 py-3 text-sm font-medium transition ${
                        currency === "AUD"
                          ? "bg-[#1C1C1E] text-white"
                          : "text-[#1C1C1E] hover:bg-gray-50"
                      }`}
                    >
                      AUD
                    </button>
                  </div>
                )}
              </div>

              <div ref={notificationRef} className="relative">
                <button
                  type="button"
                  onClick={handleNotificationClick}
                  aria-label={t.notifications}
                  title={t.notifications}
                  className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#1C1C1E] bg-[#1C1C1E] text-white transition hover:opacity-90 lg:h-9 lg:w-9"
                >
                  <Bell className="h-3.5 w-3.5" />
                  <NotificationBadge count={notificationCount} />
                </button>

                {notificationOpen && isLoggedIn ? (
                  <div className="absolute right-0 top-[calc(100%+10px)] w-[360px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.16)]">
                    {notificationDropdown}
                  </div>
                ) : null}
              </div>

              <div ref={accountRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setAccountOpen((prev) => !prev);
                    setLangOpen(false);
                    setCurrencyOpen(false);
                    setDesktopDropdownOpen(null);
                    setNotificationOpen(false);
                  }}
                  className="inline-flex h-12 items-center gap-3 rounded-2xl bg-[#1C1C1E] px-4 text-[15px] font-semibold text-white transition hover:opacity-90 lg:h-14 lg:px-5"
                >
                  {isLoggedIn ? (
                    <>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-bold text-white">
                        {initials}
                      </div>
                      <span className="hidden max-w-[140px] truncate lg:inline">
                        {displayName}
                      </span>
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">{t.account}</span>
                    </>
                  )}
                  <ChevronDown className="h-4 w-4" />
                </button>

                {accountOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] w-64 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                    {sessionLoading ? (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        {t.loading}
                      </div>
                    ) : isLoggedIn ? (
                      <>
                        <div className="border-b border-gray-100 px-4 py-3">
                          <p className="truncate text-sm font-semibold text-[#1C1C1E]">
                            {displayName}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {authUserEmail}
                          </p>
                        </div>

                        {!profileLoading ? (
                          <Link
                            href={dashboardHref}
                            onClick={() => setAccountOpen(false)}
                            className="flex items-center gap-2 px-4 py-3 text-sm text-[#1C1C1E] transition hover:bg-gray-50"
                          >
                            <LayoutDashboard className="h-4 w-4" />
                            {t.dashboard}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-400">
                            <LayoutDashboard className="h-4 w-4" />
                            {t.loadingDashboard}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-red-600 transition hover:bg-red-50"
                        >
                          <LogOut className="h-4 w-4" />
                          {t.logout}
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/login"
                          onClick={() => setAccountOpen(false)}
                          className="flex items-center gap-2 px-4 py-3 text-sm text-[#1C1C1E] transition hover:bg-gray-50"
                        >
                          <User className="h-4 w-4" />
                          {t.login}
                        </Link>

                        <Link
                          href="/signup?role=agent&next=/agentdashboard/paket"
                          onClick={() => setAccountOpen(false)}
                          className="flex items-center gap-2 px-4 py-3 text-sm text-[#1C1C1E] transition hover:bg-gray-50"
                        >
                          <BriefcaseBusiness className="h-4 w-4" />
                          {t.agentPro}
                        </Link>

                        <Link
                          href="/signup?role=developer"
                          onClick={() => setAccountOpen(false)}
                          className="flex items-center gap-2 px-4 py-3 text-sm text-[#1C1C1E] transition hover:bg-gray-50"
                        >
                          <Building2 className="h-4 w-4" />
                          {t.developer}
                        </Link>

                        <Link
                          href="/login?role=admin"
                          onClick={() => setAccountOpen(false)}
                          className="flex items-center gap-2 px-4 py-3 text-sm text-[#1C1C1E] transition hover:bg-gray-50"
                        >
                          <Shield className="h-4 w-4" />
                          Admin
                        </Link>

                        <div className="border-t border-gray-100" />

                        <Link
                          href="/signup"
                          onClick={() => setAccountOpen(false)}
                          className="block px-4 py-3 text-sm font-semibold text-[#1C1C1E] transition hover:bg-gray-50"
                        >
                          {t.signUp}
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 md:hidden">
            <div ref={mobileCurrencyRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setCurrencyOpen((prev) => !prev);
                  setLangOpen(false);
                  setMobileMenuOpen(false);
                  setAccountOpen(false);
                  setDesktopDropdownOpen(null);
                  setNotificationOpen(false);
                }}
                className="inline-flex h-10 items-center gap-1.5 rounded-2xl border border-gray-300 bg-white px-3 text-sm font-medium text-[#1C1C1E] transition hover:bg-gray-50"
              >
                <BadgeDollarSign className="h-4 w-4" />
                <span>{currency}</span>
              </button>

              {currencyOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-28 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrency("IDR");
                      setCurrencyOpen(false);
                    }}
                    className={`flex w-full items-center justify-center px-4 py-3 text-sm font-medium transition ${
                      currency === "IDR"
                        ? "bg-[#1C1C1E] text-white"
                        : "text-[#1C1C1E] hover:bg-gray-50"
                    }`}
                  >
                    IDR
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrency("USD");
                      setCurrencyOpen(false);
                    }}
                    className={`flex w-full items-center justify-center px-4 py-3 text-sm font-medium transition ${
                      currency === "USD"
                        ? "bg-[#1C1C1E] text-white"
                        : "text-[#1C1C1E] hover:bg-gray-50"
                    }`}
                  >
                    USD
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrency("AUD");
                      setCurrencyOpen(false);
                    }}
                    className={`flex w-full items-center justify-center px-4 py-3 text-sm font-medium transition ${
                      currency === "AUD"
                        ? "bg-[#1C1C1E] text-white"
                        : "text-[#1C1C1E] hover:bg-gray-50"
                    }`}
                  >
                    AUD
                  </button>
                </div>
              )}
            </div>

            <div ref={mobileLangRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setLangOpen((prev) => !prev);
                  setCurrencyOpen(false);
                  setMobileMenuOpen(false);
                  setAccountOpen(false);
                  setDesktopDropdownOpen(null);
                  setNotificationOpen(false);
                }}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-gray-300 bg-white px-3 text-sm font-medium text-[#1C1C1E] transition hover:bg-gray-50"
              >
                <Globe className="h-4 w-4" />
                <span>{lang.toUpperCase()}</span>
              </button>

              {langOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-24 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setLang("id");
                      setLangOpen(false);
                    }}
                    className={`flex w-full items-center justify-center px-4 py-3 text-sm font-medium transition ${
                      lang === "id"
                        ? "bg-[#1C1C1E] text-white"
                        : "text-[#1C1C1E] hover:bg-gray-50"
                    }`}
                  >
                    ID
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLang("en");
                      setLangOpen(false);
                    }}
                    className={`flex w-full items-center justify-center px-4 py-3 text-sm font-medium transition ${
                      lang === "en"
                        ? "bg-[#1C1C1E] text-white"
                        : "text-[#1C1C1E] hover:bg-gray-50"
                    }`}
                  >
                    EN
                  </button>
                </div>
              )}
            </div>

            <div ref={mobileMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen((prev) => !prev);
                  setLangOpen(false);
                  setCurrencyOpen(false);
                  setAccountOpen(false);
                  setDesktopDropdownOpen(null);
                  setNotificationOpen(false);
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1C1C1E] text-white transition hover:opacity-90"
                aria-label={t.menu}
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>

              {mobileMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] w-[min(92vw,380px)] overflow-hidden rounded-[32px] border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.14)]">
                  <div className="p-3">
                    <div className="space-y-3">
                      <div className="rounded-[26px] border border-gray-200 bg-[#fafafa] p-3">
                        <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                          {t.properties}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {propertyItems.map((item) => {
                            const Icon = item.icon;

                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={closeAllMenus}
                                className="rounded-2xl border border-gray-200 bg-white px-3 py-3 text-center text-sm font-medium text-[#1C1C1E] transition hover:bg-gray-50"
                              >
                                <div className="flex flex-col items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  <span>{item.label}</span>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          href="/pembeli"
                          onClick={closeAllMenus}
                          className="rounded-2xl border border-gray-200 bg-[#fafafa] px-3 py-2.5 text-center text-sm font-medium text-[#1C1C1E] transition hover:bg-gray-50"
                        >
                          {t.buyers}
                        </Link>

                        <Link
                          href="/career"
                          onClick={closeAllMenus}
                          className="rounded-2xl border border-gray-200 bg-[#fafafa] px-3 py-2.5 text-center text-sm font-medium text-[#1C1C1E] transition hover:bg-gray-50"
                        >
                          {t.career}
                        </Link>
                      </div>
                    </div>

                    <div className="mt-3 rounded-[26px] border border-gray-200 bg-gradient-to-b from-[#fafafa] to-white p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                      {sessionLoading ? (
                        <div className="text-sm text-gray-500">{t.loading}</div>
                      ) : isLoggedIn ? (
                        <>
                          <div className="mb-3 flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1C1C1E] text-xs font-bold text-white">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#1C1C1E]">
                                {displayName}
                              </p>
                              <p className="truncate text-xs text-gray-500">
                                {authUserEmail}
                              </p>
                            </div>
                          </div>

                          <div ref={notificationRef} className="mb-2">
                            <button
                              type="button"
                              onClick={handleNotificationClick}
                              className="relative inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-[#1C1C1E] bg-[#1C1C1E] px-3 py-2.5 text-center text-sm font-semibold text-white transition hover:opacity-90"
                            >
                              <Bell className="h-3.5 w-3.5" />
                              <span>{t.notifications}</span>

                              {notificationCount > 0 ? (
                                <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#B8860B] px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
                                  {notificationCount > 99
                                    ? "99+"
                                    : notificationCount}
                                </span>
                              ) : null}
                            </button>

                            {notificationOpen ? (
                              <div className="mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                                {notificationDropdown}
                              </div>
                            ) : null}
                          </div>

                          {!profileLoading ? (
                            <Link
                              href={dashboardHref}
                              onClick={closeAllMenus}
                              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1C1C1E] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                            >
                              <LayoutDashboard className="h-4 w-4" />
                              {t.dashboard}
                            </Link>
                          ) : (
                            <div className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-200 px-4 py-2.5 text-sm font-medium text-gray-500">
                              <LayoutDashboard className="h-4 w-4" />
                              {t.loadingDashboard}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={handleLogout}
                            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                          >
                            <LogOut className="h-4 w-4" />
                            {t.logout}
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                            {t.quickAccess}
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <Link
                              href="/login"
                              onClick={closeAllMenus}
                              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-[#1C1C1E] px-3 py-2.5 text-center text-sm font-semibold text-white transition hover:opacity-90"
                            >
                              <User className="h-4 w-4" />
                              {t.login}
                            </Link>

                            <Link
                              href="/signup?role=agent&next=/agentdashboard/paket"
                              onClick={closeAllMenus}
                              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-center text-sm font-semibold text-[#1C1C1E] transition hover:bg-gray-50"
                            >
                              <BriefcaseBusiness className="h-4 w-4" />
                              {t.agentPro}
                            </Link>

                            <Link
                              href="/signup?role=developer"
                              onClick={closeAllMenus}
                              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-center text-sm font-semibold text-[#1C1C1E] transition hover:bg-gray-50"
                            >
                              <Building2 className="h-4 w-4" />
                              {t.developer}
                            </Link>

                            <Link
                              href="/login?role=admin"
                              onClick={closeAllMenus}
                              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-center text-sm font-semibold text-[#1C1C1E] transition hover:bg-gray-50"
                            >
                              <Shield className="h-4 w-4" />
                              Admin
                            </Link>
                          </div>

                          <Link
                            href="/signup"
                            onClick={closeAllMenus}
                            className="mt-2.5 inline-flex w-full items-center justify-center rounded-2xl border border-yellow-300 bg-gradient-to-r from-yellow-400 via-yellow-300 to-amber-300 px-4 py-2.5 text-sm font-semibold text-[#1C1C1E] shadow-[0_12px_30px_-16px_rgba(234,179,8,0.75)] transition hover:brightness-[1.02]"
                          >
                            {t.signUp}
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}