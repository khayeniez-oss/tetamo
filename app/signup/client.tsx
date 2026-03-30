"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";

type AllowedRole = "owner" | "agent" | "developer" | "admin";
type OAuthProvider = "google" | "apple";

function normalizeRole(value: string | null): AllowedRole {
  const v = String(value || "").toLowerCase();

  if (v === "agent") return "agent";
  if (v === "developer") return "developer";
  if (v === "admin") return "admin";
  return "owner";
}

function GoogleDarkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 text-[#1C1C1E]"
      fill="currentColor"
    >
      <path d="M21.805 10.023H12.24v3.955h5.49c-.236 1.272-.962 2.35-2.015 3.075v2.553h3.257c1.907-1.757 3.008-4.346 3.008-7.424 0-.72-.065-1.412-.175-2.159Z" />
      <path d="M12.24 22c2.73 0 5.02-.904 6.693-2.394l-3.257-2.553c-.904.608-2.062.967-3.436.967-2.64 0-4.879-1.784-5.678-4.183H3.2v2.633A10.11 10.11 0 0 0 12.24 22Z" />
      <path d="M6.562 13.837A6.08 6.08 0 0 1 6.245 12c0-.638.11-1.257.317-1.837V7.53H3.2A10.11 10.11 0 0 0 2.12 12c0 1.631.39 3.177 1.08 4.47l3.362-2.633Z" />
      <path d="M12.24 5.98c1.484 0 2.815.51 3.862 1.511l2.897-2.897C17.255 2.966 14.965 2 12.24 2A10.11 10.11 0 0 0 3.2 7.53l3.362 2.633C7.36 7.764 9.6 5.98 12.24 5.98Z" />
    </svg>
  );
}

function AppleDarkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 text-[#1C1C1E]"
      fill="currentColor"
    >
      <path d="M16.365 12.498c.024 2.633 2.31 3.51 2.336 3.521-.019.062-.365 1.253-1.203 2.483-.724 1.062-1.474 2.118-2.659 2.14-1.163.022-1.537-.69-2.868-.69-1.332 0-1.747.668-2.846.712-1.145.044-2.019-1.145-2.75-2.203-1.494-2.16-2.635-6.106-1.103-8.767.76-1.321 2.12-2.158 3.594-2.18 1.123-.022 2.183.756 2.868.756.684 0 1.968-.934 3.317-.797.565.023 2.152.228 3.171 1.72-.082.051-1.891 1.103-1.857 3.305ZM14.48 5.21c.606-.734 1.015-1.756.904-2.77-.873.034-1.929.582-2.555 1.316-.562.648-1.053 1.687-.92 2.68.972.075 1.965-.495 2.57-1.226Z" />
    </svg>
  );
}

export default function SignupPage() {
  const { lang } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const role = normalizeRole(searchParams.get("role"));
  const packageId = searchParams.get("package") || "";
  const planId = searchParams.get("plan") || "";
  const from = searchParams.get("from") || "";
  const next = searchParams.get("next") || "";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [loading, setLoading] = useState(false);

  const roleLabel = useMemo(() => {
    if (role === "agent") return lang === "id" ? "Agen" : "Agent";
    if (role === "developer") return "Developer";
    if (role === "admin") return "Admin";
    return lang === "id" ? "Pemilik" : "Owner";
  }, [role, lang]);

  const isAdminSignup = role === "admin";

  const agentNextPath =
    next ||
    (packageId
      ? `/agentdashboard/paket?package=${encodeURIComponent(packageId)}`
      : "/agentdashboard/paket");

  const loginRedirect =
    role === "agent"
      ? `/login?role=agent&next=${encodeURIComponent(agentNextPath)}`
      : "/login";

  const getOAuthRedirectTo = (provider: OAuthProvider) => {
    const params = new URLSearchParams();

    params.set("role", role);
    params.set("provider", provider);
    params.set("flow", "signup");

    if (packageId) params.set("package", packageId);
    if (planId) params.set("plan", planId);
    if (from) params.set("from", from);
    if (next) params.set("next", next);

    return `${window.location.origin}/auth/callback?${params.toString()}`;
  };

  const handleOAuthSignup = async (provider: OAuthProvider) => {
    if (isAdminSignup) {
      alert(
        lang === "id"
          ? "Signup Admin harus menggunakan email, password, dan admin code."
          : "Admin signup must use email, password, and admin code."
      );
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getOAuthRedirectTo(provider),
          ...(provider === "google"
            ? {
                queryParams: {
                  prompt: "select_account",
                },
              }
            : {}),
        },
      });

      if (error) {
        setLoading(false);
        alert(error.message);
      }
    } catch (err: any) {
      setLoading(false);
      alert(err?.message || "OAuth signup failed.");
    }
  };

  const handleSignup = async () => {
    const trimmedFullName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedAdminCode = adminCode.trim();

    if (!trimmedFullName || !trimmedEmail || !trimmedPassword) {
      alert(
        lang === "id"
          ? "Mohon lengkapi semua field."
          : "Please complete all fields."
      );
      return;
    }

    if (isAdminSignup) {
      const expectedAdminCode =
        process.env.NEXT_PUBLIC_ADMIN_SIGNUP_CODE?.trim() || "";

      if (!expectedAdminCode) {
        alert(
          lang === "id"
            ? "Admin signup code belum dikonfigurasi."
            : "Admin signup code is not configured."
        );
        return;
      }

      if (trimmedAdminCode !== expectedAdminCode) {
        alert(
          lang === "id"
            ? "Admin signup code tidak valid."
            : "Invalid admin signup code."
        );
        return;
      }
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
        options: {
          data: {
            full_name: trimmedFullName,
            role,
            package: packageId,
            plan: planId,
            from,
            next,
          },
        },
      });

      if (error) {
        setLoading(false);
        alert(error.message);
        return;
      }

      if (data.user) {
        const { error: profileError } = await supabase.from("profiles").upsert(
          {
            id: data.user.id,
            email: trimmedEmail,
            full_name: trimmedFullName,
            role,
          },
          {
            onConflict: "id",
          }
        );

        if (profileError) {
          setLoading(false);
          alert(profileError.message);
          return;
        }
      }

      setLoading(false);

      if (role === "owner") {
        router.push(`/pemilik/iklan?plan=${planId || "basic"}`);
        return;
      }

      if (role === "agent") {
        if (data.session) {
          router.push(agentNextPath);
        } else {
          router.push(loginRedirect);
        }
        return;
      }

      if (role === "developer") {
        if (data.session) {
          router.push("/developerdashboard");
        } else {
          router.push("/login");
        }
        return;
      }

      if (role === "admin") {
        if (data.session) {
          router.push("/admindashboard");
        } else {
          alert(
            lang === "id"
              ? "Akun admin berhasil dibuat. Silakan login."
              : "Admin account created successfully. Please log in."
          );
          router.push("/login");
        }
        return;
      }

      router.push("/");
    } catch (err: any) {
      setLoading(false);
      alert(err?.message || "Signup failed.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] px-6 py-16">
      <div className="w-full max-w-md rounded-[32px] border border-[#e5e5e7] bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-[#1C1C1E]">
            {lang === "id" ? "Buat akun Anda" : "Create your account"}
          </h1>

          <p className="mt-2 text-sm text-[#6e6e73]">
            {lang === "id"
              ? "Daftar untuk mulai menggunakan TeTamo"
              : "Sign up to start using TeTamo"}
          </p>

          <p className="mt-3 text-sm font-medium text-[#1C1C1E]">
            {lang === "id"
              ? `Anda mendaftar sebagai ${roleLabel}`
              : `You are signing up as ${roleLabel}`}
          </p>

          {(packageId || planId) && (
            <p className="mt-1 text-xs text-[#6e6e73]">
              {lang === "id"
                ? `Paket terpilih: ${packageId || planId}`
                : `Selected package: ${packageId || planId}`}
            </p>
          )}
        </div>

        {!isAdminSignup && (
          <>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleOAuthSignup("google")}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#d2d2d7] bg-white px-4 py-3 text-sm font-semibold text-[#1C1C1E] transition hover:bg-[#f8f8f8] disabled:opacity-60"
              >
                <GoogleDarkIcon />
                <span>
                  {lang === "id" ? "Daftar dengan Google" : "Sign up with Google"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleOAuthSignup("apple")}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#d2d2d7] bg-white px-4 py-3 text-sm font-semibold text-[#1C1C1E] transition hover:bg-[#f8f8f8] disabled:opacity-60"
              >
                <AppleDarkIcon />
                <span>
                  {lang === "id" ? "Daftar dengan Apple" : "Sign up with Apple"}
                </span>
              </button>
            </div>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#e5e5e7]" />
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#6e6e73]">
                {lang === "id" ? "Atau" : "Or"}
              </span>
              <div className="h-px flex-1 bg-[#e5e5e7]" />
            </div>
          </>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[#1C1C1E]">
              {lang === "id" ? "Nama Lengkap" : "Full name"}
            </label>
            <input
              type="text"
              placeholder={
                lang === "id"
                  ? "Masukkan nama lengkap Anda"
                  : "Enter your full name"
              }
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-2xl border border-[#d2d2d7] bg-white px-4 py-3 text-[#1C1C1E] placeholder:text-gray-500 outline-none transition focus:border-[#1C1C1E]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#1C1C1E]">
              Email
            </label>
            <input
              type="email"
              placeholder={
                lang === "id" ? "Masukkan email Anda" : "Enter your email"
              }
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-[#d2d2d7] bg-white px-4 py-3 text-[#1C1C1E] placeholder:text-gray-500 outline-none transition focus:border-[#1C1C1E]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#1C1C1E]">
              {lang === "id" ? "Kata Sandi" : "Password"}
            </label>
            <input
              type="password"
              placeholder={
                lang === "id" ? "Buat kata sandi" : "Create a password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-[#d2d2d7] bg-white px-4 py-3 text-[#1C1C1E] placeholder:text-gray-500 outline-none transition focus:border-[#1C1C1E]"
            />
          </div>

          {isAdminSignup && (
            <div>
              <label className="mb-2 block text-sm font-medium text-[#1C1C1E]">
                {lang === "id" ? "Admin Code" : "Admin Code"}
              </label>
              <input
                type="password"
                placeholder={
                  lang === "id"
                    ? "Masukkan admin signup code"
                    : "Enter admin signup code"
                }
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                className="w-full rounded-2xl border border-[#d2d2d7] bg-white px-4 py-3 text-[#1C1C1E] placeholder:text-gray-500 outline-none transition focus:border-[#1C1C1E]"
              />
            </div>
          )}

          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full rounded-2xl bg-[#1C1C1E] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {loading
              ? lang === "id"
                ? "Sedang membuat akun..."
                : "Creating account..."
              : lang === "id"
              ? "Daftar"
              : "Sign up"}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-[#6e6e73]">
          {lang === "id" ? "Sudah punya akun?" : "Already have an account?"}{" "}
          <Link
            href="/login"
            className="font-semibold text-[#1C1C1E] underline underline-offset-4"
          >
            {lang === "id" ? "Masuk" : "Log in"}
          </Link>
        </p>
      </div>
    </div>
  );
}