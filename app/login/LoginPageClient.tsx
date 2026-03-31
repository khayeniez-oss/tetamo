"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";

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

function AppleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M16.365 12.16c.02 2.23 1.956 2.97 1.978 2.98-.016.052-.309 1.064-1.018 2.11-.612.904-1.247 1.804-2.246 1.823-.98.019-1.295-.58-2.416-.58-1.12 0-1.472.561-2.397.599-.964.037-1.699-.966-2.316-1.866-1.26-1.824-2.223-5.154-.93-7.397.642-1.113 1.79-1.816 3.037-1.835.946-.019 1.84.637 2.416.637.576 0 1.656-.788 2.79-.672.475.02 1.806.192 2.66 1.443-.069.043-1.588.926-1.558 2.758Zm-1.974-6.727c.512-.621.858-1.485.764-2.347-.738.03-1.631.49-2.16 1.11-.474.548-.89 1.43-.778 2.274.822.064 1.662-.419 2.174-1.037Z" />
    </svg>
  );
}

function FormInput({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
}: {
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[#1C1C1E]">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-[#d2d2d7] bg-white px-4 py-3 text-sm text-[#1C1C1E] placeholder:text-gray-500 outline-none transition focus:border-[#1C1C1E]"
      />
    </div>
  );
}

export default function LoginPageClient() {
  const { lang } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectingRef = useRef(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "apple" | null>(
    null
  );

  const rawNext = searchParams.get("next") || "";
  const roleFromUrl = searchParams.get("role") || "";
  const safeNext = rawNext.startsWith("/") ? rawNext : "";

  const signupHref = useMemo(() => {
    const params = new URLSearchParams();

    if (roleFromUrl) params.set("role", roleFromUrl);
    if (safeNext) params.set("next", safeNext);

    const query = params.toString();
    return query ? `/signup?${query}` : "/signup";
  }, [roleFromUrl, safeNext]);

  const oauthRedirectTo = useMemo(() => {
    if (typeof window === "undefined") return undefined;

    const params = new URLSearchParams();
    if (roleFromUrl) params.set("role", roleFromUrl);
    if (safeNext) params.set("next", safeNext);

    const query = params.toString();
    return `${window.location.origin}/login${query ? `?${query}` : ""}`;
  }, [roleFromUrl, safeNext]);

  const finishLogin = async (userId: string) => {
    if (redirectingRef.current) return;
    redirectingRef.current = true;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    setLoading(false);
    setSocialLoading(null);

    if (profileError || !profile) {
      redirectingRef.current = false;
      alert(
        lang === "id"
          ? "Profil pengguna tidak ditemukan."
          : "User profile not found."
      );
      return;
    }

    if (profile.role === "owner") {
      router.push("/pemilikdashboard");
      return;
    }

    if (profile.role === "agent") {
      router.push(safeNext || "/agentdashboard");
      return;
    }

    if (profile.role === "admin") {
      router.push("/admindashboard");
      return;
    }

    if (profile.role === "developer") {
      redirectingRef.current = false;
      alert(
        lang === "id"
          ? "Dashboard developer belum dibuat."
          : "Developer dashboard has not been created yet."
      );
      return;
    }

    router.push("/");
  };

  useEffect(() => {
    let mounted = true;

    const checkExistingSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted || !session?.user) return;

      setLoading(true);
      await finishLogin(session.user.id);
    };

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
  }, [lang, router, safeNext]);

  const handleLogin = async () => {
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setLoading(false);
      alert(error.message);
      return;
    }

    const user = data.user;

    if (!user) {
      setLoading(false);
      alert(lang === "id" ? "User tidak ditemukan." : "User not found.");
      return;
    }

    await finishLogin(user.id);
  };

  const handleOAuthLogin = async (provider: "google" | "apple") => {
    setSocialLoading(provider);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: oauthRedirectTo
        ? {
            redirectTo: oauthRedirectTo,
          }
        : undefined,
    });

    if (error) {
      setSocialLoading(null);
      alert(error.message);
    }
  };

  const isBusy = loading || socialLoading !== null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] px-4 py-10 sm:px-6 sm:py-16">
      <div className="w-full max-w-md rounded-[28px] border border-[#e5e5e7] bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:rounded-[32px] sm:p-8">
        <div className="mb-7 text-center sm:mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-[#1C1C1E] sm:text-3xl">
            {lang === "id" ? "Selamat datang kembali" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#6e6e73]">
            {lang === "id"
              ? "Masuk ke akun TeTamo Anda"
              : "Log in to your TeTamo account"}
          </p>
        </div>

        <div className="space-y-4">
          <FormInput
            label={lang === "id" ? "Email" : "Email"}
            type="email"
            placeholder={
              lang === "id" ? "Masukkan email Anda" : "Enter your email"
            }
            value={email}
            onChange={setEmail}
          />

          <FormInput
            label={lang === "id" ? "Kata Sandi" : "Password"}
            type="password"
            placeholder={
              lang === "id"
                ? "Masukkan kata sandi Anda"
                : "Enter your password"
            }
            value={password}
            onChange={setPassword}
          />

          <button
            type="button"
            onClick={handleLogin}
            disabled={isBusy}
            className="w-full rounded-2xl bg-[#1C1C1E] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {loading
              ? lang === "id"
                ? "Sedang masuk..."
                : "Logging in..."
              : lang === "id"
              ? "Masuk"
              : "Log in"}
          </button>
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#e5e5e7]" />
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#8e8e93]">
            {lang === "id" ? "atau" : "or"}
          </span>
          <div className="h-px flex-1 bg-[#e5e5e7]" />
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleOAuthLogin("google")}
            disabled={isBusy}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#d2d2d7] bg-white px-4 py-3 text-sm font-semibold text-[#1C1C1E] transition hover:border-[#1C1C1E] disabled:opacity-60"
          >
            <GoogleIcon className="h-5 w-5 text-[#1C1C1E]" />
            <span>
              {socialLoading === "google"
                ? lang === "id"
                  ? "Menghubungkan ke Google..."
                  : "Connecting to Google..."
                : lang === "id"
                ? "Lanjutkan dengan Google"
                : "Continue with Google"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleOAuthLogin("apple")}
            disabled={isBusy}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#d2d2d7] bg-white px-4 py-3 text-sm font-semibold text-[#1C1C1E] transition hover:border-[#1C1C1E] disabled:opacity-60"
          >
            <AppleIcon className="h-5 w-5 text-[#1C1C1E]" />
            <span>
              {socialLoading === "apple"
                ? lang === "id"
                  ? "Menghubungkan ke Apple..."
                  : "Connecting to Apple..."
                : lang === "id"
                ? "Lanjutkan dengan Apple"
                : "Continue with Apple"}
            </span>
          </button>
        </div>

        <p className="mt-6 text-center text-sm leading-6 text-[#6e6e73]">
          {lang === "id" ? "Belum punya akun?" : "Don’t have an account?"}{" "}
          <Link
            href={signupHref}
            className="font-semibold text-[#1C1C1E] underline underline-offset-4"
          >
            {lang === "id" ? "Daftar" : "Sign up"}
          </Link>
        </p>
      </div>
    </div>
  );
}