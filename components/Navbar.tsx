"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/app/context/LanguageContext";
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
} from "lucide-react";

type ProfileData = {
  full_name: string | null;
  role: string | null;
};

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

export default function Navbar() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();

  const isID = lang === "id";

  const t = {
    brandTagline: isID
      ? "SEMUA DALAM SATU - PUSAT PROPERTI"
      : "ALL IN ONE - REAL ESTATE HUB",

    allProperties: isID ? "Properti" : "Properties",
    forSale: isID ? "Dijual" : "Sale",
    forRent: isID ? "Disewa" : "Rent",
    buyers: isID ? "Pembeli" : "Buyers",

    account: isID ? "Akun" : "Account",
    loading: isID ? "Memuat..." : "Loading...",
    dashboard: "Dashboard",
    loadingDashboard: isID ? "Memuat dashboard..." : "Loading dashboard...",
    logout: isID ? "Keluar" : "Logout",

    login: isID ? "Masuk" : "Login",
    agentLogin: isID ? "Masuk Agen" : "Agent Login",
    adminLogin: isID ? "Masuk Admin" : "Admin Login",
    developer: "Developer",
    agentPro: isID ? "Agen Pro" : "Agent Pro",
    signUp: isID ? "Daftar" : "Sign Up",
    menu: isID ? "Menu" : "Menu",
    quickAccess: isID ? "Akses Cepat" : "Quick Access",
  };

  const [authUserEmail, setAuthUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const [sessionLoading, setSessionLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const [langOpen, setLangOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const desktopLangRef = useRef<HTMLDivElement | null>(null);
  const mobileLangRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  function closeAllMenus() {
    setLangOpen(false);
    setAccountOpen(false);
    setMobileMenuOpen(false);
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

  useEffect(() => {
    let mounted = true;

    async function loadAuth() {
      setSessionLoading(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (!user) {
          setAuthUserEmail(null);
          setProfile(null);
          setSessionLoading(false);
          setProfileLoading(false);
          return;
        }

        setAuthUserEmail(user.email ?? null);
        setSessionLoading(false);

        loadProfileByUserId(user.id, user.email ?? null);
      } catch {
        if (!mounted) return;
        setAuthUserEmail(null);
        setProfile(null);
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
        setSessionLoading(false);
        setProfileLoading(false);
        return;
      }

      setAuthUserEmail(user.email ?? null);
      setSessionLoading(false);

      loadProfileByUserId(user.id, user.email ?? null);
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
      const insideMobileLang =
        mobileLangRef.current?.contains(target) ?? false;

      if (!insideDesktopLang && !insideMobileLang) {
        setLangOpen(false);
      }

      if (accountRef.current && !accountRef.current.contains(target)) {
        setAccountOpen(false);
      }

      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        setMobileMenuOpen(false);
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
    setAccountOpen(false);
    setMobileMenuOpen(false);
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
            className="flex min-w-0 max-w-[calc(100%-108px)] items-center gap-3 sm:max-w-none sm:gap-4"
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

          <div className="hidden items-center gap-6 md:flex lg:gap-10">
            <nav className="flex items-center gap-5 text-[15px] font-medium text-[#2C2C2E] lg:gap-9">
              <Link href="/properti" className="transition hover:text-black">
                {t.allProperties}
              </Link>

              <Link
                href="/properti?jenisListing=dijual"
                className="transition hover:text-black"
              >
                {t.forSale}
              </Link>

              <Link
                href="/properti?jenisListing=disewa"
                className="transition hover:text-black"
              >
                {t.forRent}
              </Link>

              <Link href="/pembeli" className="transition hover:text-black">
                {t.buyers}
              </Link>
            </nav>

            <div className="flex shrink-0 items-center gap-3">
              <div ref={desktopLangRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setLangOpen((prev) => !prev);
                    setAccountOpen(false);
                  }}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl border border-gray-300 bg-white px-4 text-[15px] font-medium text-[#1C1C1E] transition hover:bg-gray-50 lg:h-14 lg:px-5"
                >
                  <Globe className="h-4 w-4" />
                  <span>{lang.toUpperCase()}</span>
                  <ChevronDown className="h-4 w-4" />
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

              <div ref={accountRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setAccountOpen((prev) => !prev);
                    setLangOpen(false);
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
                  <div className="absolute right-0 top-[calc(100%+8px)] w-56 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
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
                          className="block px-4 py-3 text-sm text-[#1C1C1E] transition hover:bg-gray-50"
                        >
                          {t.login}
                        </Link>

                        <Link
                          href="/login?role=agent"
                          onClick={() => setAccountOpen(false)}
                          className="block px-4 py-3 text-sm text-[#1C1C1E] transition hover:bg-gray-50"
                        >
                          {t.agentLogin}
                        </Link>

                        <Link
                          href="/login?role=admin"
                          onClick={() => setAccountOpen(false)}
                          className="block px-4 py-3 text-sm text-[#1C1C1E] transition hover:bg-gray-50"
                        >
                          {t.adminLogin}
                        </Link>

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
            <div ref={mobileLangRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setLangOpen((prev) => !prev);
                  setMobileMenuOpen(false);
                  setAccountOpen(false);
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
                  setAccountOpen(false);
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
                <div className="absolute right-0 top-[calc(100%+10px)] w-[min(92vw,360px)] overflow-hidden rounded-[32px] border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.14)]">
                  <div className="p-4">
                    <nav className="grid grid-cols-2 gap-2">
                      <Link
                        href="/properti"
                        onClick={closeAllMenus}
                        className="rounded-2xl border border-gray-200 bg-[#fafafa] px-4 py-3 text-center text-sm font-medium text-[#1C1C1E] transition hover:bg-gray-50"
                      >
                        {t.allProperties}
                      </Link>

                      <Link
                        href="/properti?jenisListing=dijual"
                        onClick={closeAllMenus}
                        className="rounded-2xl border border-gray-200 bg-[#fafafa] px-4 py-3 text-center text-sm font-medium text-[#1C1C1E] transition hover:bg-gray-50"
                      >
                        {t.forSale}
                      </Link>

                      <Link
                        href="/properti?jenisListing=disewa"
                        onClick={closeAllMenus}
                        className="rounded-2xl border border-gray-200 bg-[#fafafa] px-4 py-3 text-center text-sm font-medium text-[#1C1C1E] transition hover:bg-gray-50"
                      >
                        {t.forRent}
                      </Link>

                      <Link
                        href="/pembeli"
                        onClick={closeAllMenus}
                        className="rounded-2xl border border-gray-200 bg-[#fafafa] px-4 py-3 text-center text-sm font-medium text-[#1C1C1E] transition hover:bg-gray-50"
                      >
                        {t.buyers}
                      </Link>
                    </nav>

                    <div className="mt-4 rounded-[28px] border border-gray-200 bg-gradient-to-b from-[#fafafa] to-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                      {sessionLoading ? (
                        <div className="text-sm text-gray-500">{t.loading}</div>
                      ) : isLoggedIn ? (
                        <>
                          <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1C1C1E] text-xs font-bold text-white">
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

                          {!profileLoading ? (
                            <Link
                              href={dashboardHref}
                              onClick={closeAllMenus}
                              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1C1C1E] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                            >
                              <LayoutDashboard className="h-4 w-4" />
                              {t.dashboard}
                            </Link>
                          ) : (
                            <div className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-200 px-4 py-3 text-sm font-medium text-gray-500">
                              <LayoutDashboard className="h-4 w-4" />
                              {t.loadingDashboard}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={handleLogout}
                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                          >
                            <LogOut className="h-4 w-4" />
                            {t.logout}
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                            {t.quickAccess}
                          </div>

                          <div className="grid grid-cols-2 gap-2.5">
                            <Link
                              href="/login"
                              onClick={closeAllMenus}
                              className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-[#1C1C1E] px-3 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
                            >
                              <User className="h-4 w-4" />
                              {t.login}
                            </Link>

                            <Link
                              href="/signup?role=agent"
                              onClick={closeAllMenus}
                              className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white px-3 py-3 text-center text-sm font-semibold text-[#1C1C1E] transition hover:bg-gray-50"
                            >
                              <BriefcaseBusiness className="h-4 w-4" />
                              {t.agentPro}
                            </Link>

                            <Link
                              href="/signup?role=developer"
                              onClick={closeAllMenus}
                              className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white px-3 py-3 text-center text-sm font-semibold text-[#1C1C1E] transition hover:bg-gray-50"
                            >
                              <Building2 className="h-4 w-4" />
                              {t.developer}
                            </Link>

                            <Link
                              href="/login?role=admin"
                              onClick={closeAllMenus}
                              className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white px-3 py-3 text-center text-sm font-semibold text-[#1C1C1E] transition hover:bg-gray-50"
                            >
                              <Shield className="h-4 w-4" />
                              Admin
                            </Link>
                          </div>

                          <Link
                            href="/signup"
                            onClick={closeAllMenus}
                            className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-yellow-300 bg-gradient-to-r from-yellow-400 via-yellow-300 to-amber-300 px-4 py-3 text-sm font-semibold text-[#1C1C1E] shadow-[0_12px_30px_-16px_rgba(234,179,8,0.75)] transition hover:brightness-[1.02]"
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