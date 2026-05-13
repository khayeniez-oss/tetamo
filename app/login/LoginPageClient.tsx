"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Eye, EyeOff, KeyRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";

type SocialProvider = "google";

function GoogleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M21.805 10.023H12.24v3.956h5.484c-.236 1.27-.96 2.347-2.006 3.069v2.548h3.246c1.9-1.75 3-4.327 3-7.39 0-.73-.063-1.426-.159-2.183Z" />
      <path d="M12.24 22c2.73 0 5.021-.903 6.695-2.452l-3.246-2.548c-.903.608-2.055.973-3.449.973-2.65 0-4.896-1.786-5.698-4.189H3.19v2.63A10.115 10.115 0 0 0 12.24 22Z" />
      <path d="M6.542 13.784A6.083 6.083 0 0 1 6.224 12c0-.62.111-1.222.318-1.784V7.586H3.19A10.115 10.115 0 0 0 2.125 12c0 1.633.39 3.18 1.065 4.414l3.352-2.63Z" />
      <path d="M12.24 6.027c1.483 0 2.813.51 3.862 1.51l2.895-2.895C17.257 3.028 14.966 2 12.24 2A10.115 10.115 0 0 0 3.19 7.586l3.352 2.63c.802-2.403 3.048-4.189 5.698-4.189Z" />
    </svg>
  );
}

function FormInput({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  autoComplete,
  rightSlot,
}: {
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  rightSlot?: ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[#1C1C1E]">
        {label}
      </label>

      <div className="relative">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className={`w-full rounded-2xl border border-[#D8D8DD] bg-white px-4 py-3 text-sm text-[#1C1C1E] outline-none transition placeholder:text-[#8E8E93] focus:border-[#1C1C1E] focus:ring-4 focus:ring-black/5 ${
            rightSlot ? "pr-12" : ""
          }`}
        />

        {rightSlot ? (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {rightSlot}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-[#D8D8DD] bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B7280] shadow-sm">
      {children}
    </span>
  );
}

function InfoCard({
  eyebrow,
  title,
  description,
  tone,
}: {
  eyebrow: string;
  title: string;
  description: string;
  tone: "amber" | "emerald";
}) {
  const cardClass =
    tone === "amber"
      ? "border-[#F2D67A] bg-[linear-gradient(180deg,#FFFDF6_0%,#FFFFFF_100%)]"
      : "border-[#9EECCF] bg-[linear-gradient(180deg,#F5FFFB_0%,#FFFFFF_100%)]";

  const eyebrowClass = tone === "amber" ? "text-[#B45309]" : "text-[#047857]";

  return (
    <div className={`rounded-[28px] border p-4 sm:p-6 ${cardClass}`}>
      <p className={`text-xs font-semibold sm:text-sm ${eyebrowClass}`}>
        {eyebrow}
      </p>
      <h3 className="mt-2 text-lg font-bold leading-tight text-[#111827] sm:mt-3 sm:text-2xl lg:text-[30px]">
        {title}
      </h3>
      <p className="mt-3 text-xs leading-6 text-[#6B7280] sm:mt-4 sm:text-sm sm:leading-7 lg:text-base">
        {description}
      </p>
    </div>
  );
}

function isSafeInternalPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//");
}

export default function LoginPageClient() {
  const { lang } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectingRef = useRef(false);

  const isID = lang === "id";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(
    null
  );

  const rawNext = searchParams.get("next") || "";
  const roleFromUrl = searchParams.get("role") || "";
  const safeNext = isSafeInternalPath(rawNext) ? rawNext : "";

  const signupHref = useMemo(() => {
    const params = new URLSearchParams();

    if (roleFromUrl) params.set("role", roleFromUrl);
    if (safeNext) params.set("next", safeNext);

    const query = params.toString();
    return query ? `/signup?${query}` : "/signup";
  }, [roleFromUrl, safeNext]);

  const forgotPasswordHref = useMemo(() => {
    const params = new URLSearchParams();

    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedEmail) params.set("email", trimmedEmail);

    const query = params.toString();
    return query ? `/forgot-password?${query}` : "/forgot-password";
  }, [email]);

  const oauthRedirectTo = useMemo(() => {
    if (typeof window === "undefined") return undefined;

    const params = new URLSearchParams();

    if (roleFromUrl) params.set("role", roleFromUrl);
    if (safeNext) params.set("next", safeNext);

    params.set("flow", "login");

    return `${window.location.origin}/auth/callback?${params.toString()}`;
  }, [roleFromUrl, safeNext]);

  async function finishLogin(userId: string) {
    if (redirectingRef.current) return;
    redirectingRef.current = true;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    setLoading(false);
    setSocialLoading(null);

    if (profileError || !profile) {
      redirectingRef.current = false;
      setLoginError(
        isID ? "Profil pengguna tidak ditemukan." : "User profile not found."
      );
      return;
    }

    if (profile.role === "owner") {
      router.push(safeNext || "/pemilikdashboard");
      return;
    }

    if (profile.role === "agent") {
      router.push(safeNext || "/agentdashboard");
      return;
    }

    if (profile.role === "admin") {
      router.push(safeNext || "/admindashboard");
      return;
    }

    if (profile.role === "developer") {
      router.push("/developer-license");
      return;
    }

    router.push(safeNext || "/");
  }

  useEffect(() => {
    let mounted = true;

    async function checkExistingSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted || !session?.user) return;

      setLoading(true);
      await finishLogin(session.user.id);
    }

    checkExistingSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted || !session?.user) return;

      setLoading(true);
      await finishLogin(session.user.id);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, router, safeNext]);

  async function handleLogin() {
    const trimmedEmail = email.trim().toLowerCase();
    setLoginError("");

    if (!trimmedEmail || !password) {
      setLoginError(
        isID
          ? "Masukkan email dan kata sandi."
          : "Enter your email and password."
      );
      return;
    }

    setLoading(true);
    setSocialLoading(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error) {
      setLoading(false);
      setLoginError(
        isID
          ? "Email atau kata sandi salah. Jika lupa kata sandi, gunakan reset password di bawah."
          : "Wrong email or password. If you forgot your password, use reset password below."
      );
      return;
    }

    const user = data.user;

    if (!user) {
      setLoading(false);
      setLoginError(isID ? "User tidak ditemukan." : "User not found.");
      return;
    }

    await finishLogin(user.id);
  }

  async function handleOAuthLogin(provider: SocialProvider) {
    setLoginError("");
    setLoading(false);
    setSocialLoading(provider);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: oauthRedirectTo
        ? {
            redirectTo: oauthRedirectTo,
            queryParams: {
              prompt: "select_account",
            },
          }
        : {
            queryParams: {
              prompt: "select_account",
            },
          },
    });

    if (error) {
      setSocialLoading(null);
      setLoginError(error.message);
    }
  }

  const isBusy = loading || socialLoading !== null;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#FFFDF8_0%,#FFFFFF_36%,#F6FFFB_100%)] px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
        <section className="overflow-hidden rounded-[32px] border border-[#ECE8DD] bg-[linear-gradient(135deg,#FFF7EA_0%,#F3FFF9_100%)] shadow-[0_24px_60px_rgba(17,24,39,0.07)]">
          <div className="px-5 py-7 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
            <Pill>{isID ? "Tetamo Login" : "Tetamo Login"}</Pill>

            <div className="mt-5 max-w-3xl">
              <h1 className="text-[32px] font-black leading-[1.08] tracking-[-0.03em] text-[#0F172A] sm:text-[42px] lg:text-[56px]">
                {isID ? "Masuk ke akun Tetamo" : "Log in to Tetamo"}
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-8 text-[#5F6368] sm:text-lg">
                {isID
                  ? "Lanjutkan ke dashboard Anda untuk mengelola akun, listing, leads, dan aktivitas Tetamo."
                  : "Continue to your dashboard to manage your account, listings, leads, and Tetamo activity."}
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4">
              <InfoCard
                eyebrow={isID ? "Akses Cepat" : "Quick Access"}
                title={isID ? "Masuk dan lanjutkan" : "Log in and continue"}
                description={
                  isID
                    ? "Kembali ke dashboard Anda dengan alur yang sederhana."
                    : "Return to your dashboard with a simple flow."
                }
                tone="amber"
              />

              <InfoCard
                eyebrow={isID ? "Dashboard" : "Dashboard"}
                title={
                  isID ? "Kelola aktivitas Tetamo" : "Manage Tetamo activity"
                }
                description={
                  isID
                    ? "Untuk pemilik, agent, admin, dan pengguna Tetamo."
                    : "For owners, agents, admins, and Tetamo users."
                }
                tone="emerald"
              />
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[32px] border border-[#E7E7EA] bg-white shadow-[0_24px_60px_rgba(17,24,39,0.07)]">
          <div className="px-5 py-6 sm:px-8 sm:py-8">
            <div className="mb-7 text-center sm:mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
                {isID ? "Selamat Datang" : "Welcome Back"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#6E6E73]">
                {isID ? "Masuk ke akun Anda" : "Log in to your account"}
              </p>
            </div>

            {loginError ? (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <div className="text-sm leading-6 text-red-700">
                    <p>{loginError}</p>
                    <Link
                      href={forgotPasswordHref}
                      className="mt-1 inline-flex font-semibold underline underline-offset-4"
                    >
                      {isID
                        ? "Lupa kata sandi? Reset di sini."
                        : "Forgot password? Reset it here."}
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void handleLogin();
              }}
            >
              <FormInput
                label="Email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(value) => {
                  setEmail(value);
                  setLoginError("");
                }}
                autoComplete="email"
              />

              <div>
                <FormInput
                  label={isID ? "Kata Sandi" : "Password"}
                  type={showPassword ? "text" : "password"}
                  placeholder={isID ? "Kata sandi" : "Password"}
                  value={password}
                  onChange={(value) => {
                    setPassword(value);
                    setLoginError("");
                  }}
                  autoComplete="current-password"
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#6E6E73] transition hover:bg-gray-100 hover:text-[#1C1C1E]"
                      aria-label={
                        showPassword
                          ? isID
                            ? "Sembunyikan kata sandi"
                            : "Hide password"
                          : isID
                          ? "Tampilkan kata sandi"
                          : "Show password"
                      }
                      title={
                        showPassword
                          ? isID
                            ? "Sembunyikan"
                            : "Hide"
                          : isID
                          ? "Tampilkan"
                          : "Show"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                />

                <div className="mt-2 flex justify-end">
                  <Link
                    href={forgotPasswordHref}
                    className="text-sm font-semibold text-[#111827] underline underline-offset-4 transition hover:text-black"
                  >
                    {isID ? "Lupa kata sandi?" : "Forgot password?"}
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={isBusy}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-[#111827] px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
              >
                {loading
                  ? isID
                    ? "Sedang masuk..."
                    : "Logging in..."
                  : isID
                  ? "Masuk"
                  : "Log In"}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#E5E5E7]" />
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#8E8E93]">
                {isID ? "atau" : "or"}
              </span>
              <div className="h-px flex-1 bg-[#E5E5E7]" />
            </div>

            <button
              type="button"
              onClick={() => void handleOAuthLogin("google")}
              disabled={isBusy}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#D8D8DD] bg-white px-4 py-3 text-sm font-semibold text-[#1C1C1E] transition hover:bg-[#F8F8FA] disabled:opacity-60"
            >
              <GoogleIcon className="h-5 w-5 text-[#1C1C1E]" />
              <span>
                {socialLoading === "google"
                  ? isID
                    ? "Menghubungkan..."
                    : "Connecting..."
                  : isID
                  ? "Lanjutkan dengan Google"
                  : "Continue with Google"}
              </span>
            </button>

            <div className="mt-6 rounded-[24px] border border-[#ECECF1] bg-[#FAFAFB] p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl border border-white bg-white p-2 shadow-sm">
                  <KeyRound className="h-4 w-4 text-[#111827]" />
                </div>
                <div className="text-sm leading-6 text-[#6E6E73]">
                  {isID
                    ? "Belum punya akun? Daftar untuk mulai menggunakan Tetamo."
                    : "Don’t have an account? Sign up to start using Tetamo."}
                </div>
              </div>
            </div>

            <p className="mt-6 text-center text-sm leading-6 text-[#6E6E73]">
              {isID ? "Belum punya akun?" : "Don’t have an account?"}{" "}
              <Link
                href={signupHref}
                className="font-semibold text-[#111827] underline underline-offset-4"
              >
                {isID ? "Daftar" : "Sign Up"}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}