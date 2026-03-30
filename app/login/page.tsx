"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";

export default function LoginPage() {
  const { lang } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    setLoading(false);

    if (profileError || !profile) {
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
      alert(
        lang === "id"
          ? "Dashboard developer belum dibuat."
          : "Developer dashboard has not been created yet."
      );
      return;
    }

    router.push("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] px-6 py-16">
      <div className="w-full max-w-md rounded-[32px] border border-[#e5e5e7] bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-[#1C1C1E]">
            {lang === "id" ? "Selamat datang kembali" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-[#6e6e73]">
            {lang === "id"
              ? "Masuk ke akun TeTamo Anda"
              : "Log in to your TeTamo account"}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[#1C1C1E]">
              {lang === "id" ? "Email" : "Email"}
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
                lang === "id"
                  ? "Masukkan kata sandi Anda"
                  : "Enter your password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-[#d2d2d7] bg-white px-4 py-3 text-[#1C1C1E] placeholder:text-gray-500 outline-none transition focus:border-[#1C1C1E]"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
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

        <p className="mt-6 text-center text-sm text-[#6e6e73]">
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