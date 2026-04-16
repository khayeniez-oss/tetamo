"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
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

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="absolute -right-1 -top-1 inline-flex min-w-[14px] items-center justify-center rounded-full bg-[#B8860B] px-1 py-0.5 text-[8px] font-bold leading-none text-white shadow-md">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function DesktopNotificationButton({
  label,
  count,
  onClick,
}: {
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#1C1C1E] bg-[#1C1C1E] text-white transition hover:opacity-90 lg:h-9 lg:w-9"
    >
      <Bell className="h-3 w-3" />
      <CountBadge count={count} />
    </button>
  );
}

function MobileNotificationButton({
  href,
  label,
  count,
  onClick,
}: {
  href: string;
  label: string;
  count: number;
  onClick: (href: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(href)}
      className="relative inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-[#1C1C1E] bg-[#1C1C1E] px-3 py-2.5 text-center text-sm font-semibold text-white transition hover:opacity-90"
    >
      <Bell className="h-3.5 w-3.5" />
      <span>{label}</span>
      {count > 0 ? (
        <span className="inline-flex min-w-[14px] items-center justify-center rounded-full bg-[#B8860B] px-1 py-0.5 text-[8px] font-bold leading-none text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
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
      ? "PROPERTI • BISNIS • GAYA HIDUP"
      : "PROPERTY • BUSINESS • LIFESTYLE",

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
    menu: isID ? "Menu" : "Menu",
    quickAccess: isID ? "Akses Cepat" : "Quick Access",
    notifications: isID ? "Notifikasi" : "Notifications",
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

  const [authUserEmail, setAuthUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const [sessionLoading, setSessionLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const [notificationCount, setNotificationCount] = useState(0);

  const [langOpen, setLangOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopDropdownOpen, setDesktopDropdownOpen] = useState<"properties" | null>(null);

  const desktopLangRef = useRef<HTMLDivElement | null>(null);
  const desktopCurrencyRef = useRef<HTMLDivElement | null>(null);
  const mobileLangRef = useRef<HTMLDivElement | null>(null);
  const mobileCurrencyRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const desktopNavRef = useRef<HTMLDivElement | null>(null);

  function closeAllMenus() {
    setLangOpen(false);
    setCurrencyOpen(false);
    setAccountOpen(false);
    setMobileMenuOpen(false);
    setDesktopDropdownOpen(null);
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

  async function loadNavbarCounts(userId: string) {
    try {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      setNotificationCount(count ?? 0);
    } catch {
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
          setAuthUserEmail(null);
          setProfile(null);
          setNotificationCount(0);
          setSessionLoading(false);
          setProfileLoading(false);
          return;
        }

        setAuthUserEmail(user.email ?? null);
        setSessionLoading(false);

        loadProfileByUserId(user.id, user.email ?? null);
        loadNavbarCounts(user.id);
      } catch {
        if (!mounted) return;
        setAuthUserEmail(null);
        setProfile(null);
        setNotificationCount(0);
        setSessionLoading(false);
        setProfileLoading(false);
      }
    }

    loadAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;

      if (!mounted) return;

      if (!user) {
        setAuthUserEmail(null);
        setProfile(null);
        setNotificationCount(0);
        setSessionLoading(false);
        setProfileLoading(false);
        return;
      }

      setAuthUserEmail(user.email ?? null);
      setSessionLoading(false);

      loadProfileByUserId(user.id, user.email ?? null);
      loadNavbarCounts(user.id);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;

      const insideDesktopLang =
        desktopLangRef.current?.contains(target) ?? false;
      const insideDesktopCurrency =
        desktopCurrencyRef.current?.contains(target) ?? false;
      const insideMobileLang =
        mobileLangRef.current?.contains(target) ?? false;
      const insideMobileCurrency =
        mobileCurrencyRef.current?.contains(target) ?? false;

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
    setNotificationCount(0);
    setAccountOpen(false);
    setMobileMenuOpen(false);
    setDesktopDropdownOpen(null);
    router.push("/");
    router.refresh();
  }

  const isLoggedIn = Boolean(authUserEmail);
  const displayName = getDisplayName(
    profile?.full_name ?? null,
    authUserEmail,
    t.account
  );
  const initials = getInitials(profile?.full_name ?? null, authUserEmail);
  const dashboardHref = getDashboardHref(profile?.role ?? null);

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

              <DesktopNotificationButton
                label={t.notifications}
                count={notificationCount}
                onClick={() => goToProtectedRoute(NOTIFICATIONS_HREF)}
              />

              <div ref={accountRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setAccountOpen((prev) => !prev);
                    setLangOpen(false);
                    setCurrencyOpen(false);
                    setDesktopDropdownOpen(null);
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

                          <div className="mb-2 grid grid-cols-1 gap-2">
                            <MobileNotificationButton
                              href={NOTIFICATIONS_HREF}
                              label={t.notifications}
                              count={notificationCount}
                              onClick={goToProtectedRoute}
                            />
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