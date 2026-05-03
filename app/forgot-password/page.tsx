"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Mail, Send, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function ForgotPasswordPage() {
  const { lang } = useLanguage();
  const isID = lang === "id";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const ui = useMemo(
    () => ({
      badge: isID ? "Reset Password" : "Password Reset",
      title: isID ? "Lupa kata sandi?" : "Forgot your password?",
      subtitle: isID
        ? "Masukkan email akun Tetamo Anda. Kami akan mengirimkan link untuk membuat kata sandi baru."
        : "Enter your Tetamo account email. We will send you a link to create a new password.",
      emailLabel: "Email",
      emailPlaceholder: isID ? "Masukkan email Anda" : "Enter your email",
      sendButton: isID ? "Kirim Link Reset" : "Send Reset Link",
      sending: isID ? "Mengirim link..." : "Sending link...",
      backToLogin: isID ? "Kembali ke Login" : "Back to Login",
      successTitle: isID ? "Cek email Anda" : "Check your email",
      successMessage: isID
        ? "Jika email tersebut terdaftar, link reset password sudah dikirim. Silakan cek inbox atau folder spam."
        : "If that email is registered, a password reset link has been sent. Please check your inbox or spam folder.",
      emptyEmail: isID ? "Masukkan email Anda." : "Enter your email.",
      invalidEmail: isID
        ? "Format email tidak valid."
        : "Please enter a valid email address.",
      helperTitle: isID ? "Aman dan mudah" : "Secure and simple",
      helperText: isID
        ? "Link reset hanya dikirim ke email akun Anda. Setelah itu, Anda bisa membuat kata sandi baru."
        : "The reset link is sent only to your account email. After that, you can create a new password.",
    }),
    [isID]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const emailFromUrl = params.get("email");

    if (emailFromUrl) {
      setEmail(emailFromUrl.trim().toLowerCase());
    }
  }, []);

  async function handleResetPassword() {
    const trimmedEmail = email.trim().toLowerCase();

    setMessage("");
    setErrorMessage("");

    if (!trimmedEmail) {
      setErrorMessage(ui.emptyEmail);
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setErrorMessage(ui.invalidEmail);
      return;
    }

    setLoading(true);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/update-password`
        : "https://www.tetamo.com/update-password";

    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo,
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage(ui.successMessage);
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#FFFDF8_0%,#FFFFFF_40%,#F6FFFB_100%)] px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
        <section className="overflow-hidden rounded-[32px] border border-[#ECE8DD] bg-[linear-gradient(135deg,#FFF7EA_0%,#F3FFF9_100%)] shadow-[0_24px_60px_rgba(17,24,39,0.07)]">
          <div className="flex h-full flex-col justify-between px-5 py-7 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
            <div>
              <span className="inline-flex rounded-full border border-[#D8D8DD] bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B7280] shadow-sm">
                {ui.badge}
              </span>

              <h1 className="mt-5 text-[34px] font-black leading-[1.08] tracking-[-0.03em] text-[#0F172A] sm:text-[44px] lg:text-[56px]">
                {ui.title}
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-8 text-[#5F6368] sm:text-lg">
                {ui.subtitle}
              </p>
            </div>

            <div className="mt-8 rounded-[28px] border border-[#D8D8DD] bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-[#111827] p-2 text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-bold text-[#111827]">
                    {ui.helperTitle}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-[#6B7280]">
                    {ui.helperText}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[32px] border border-[#E7E7EA] bg-white shadow-[0_24px_60px_rgba(17,24,39,0.07)]">
          <div className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#111827] underline underline-offset-4"
            >
              <ArrowLeft className="h-4 w-4" />
              {ui.backToLogin}
            </Link>

            <div className="mt-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#111827] text-white shadow-sm">
                <Mail className="h-6 w-6" />
              </div>

              <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
                {ui.title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#6E6E73]">
                {ui.subtitle}
              </p>
            </div>

            {message ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                  <div>
                    <p className="font-semibold text-emerald-800">
                      {ui.successTitle}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-emerald-700">
                      {message}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {errorMessage ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                {errorMessage}
              </div>
            ) : null}

            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void handleResetPassword();
              }}
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-[#1C1C1E]">
                  {ui.emailLabel}
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setMessage("");
                    setErrorMessage("");
                  }}
                  placeholder={ui.emailPlaceholder}
                  autoComplete="email"
                  className="w-full rounded-2xl border border-[#D8D8DD] bg-white px-4 py-3 text-sm text-[#1C1C1E] outline-none transition placeholder:text-[#8E8E93] focus:border-[#1C1C1E] focus:ring-4 focus:ring-black/5"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#111827] px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {loading ? ui.sending : ui.sendButton}
              </button>
            </form>

            <p className="mt-6 text-center text-sm leading-6 text-[#6E6E73]">
              {isID ? "Ingat kata sandi Anda?" : "Remember your password?"}{" "}
              <Link
                href="/login"
                className="font-semibold text-[#111827] underline underline-offset-4"
              >
                {isID ? "Masuk" : "Log in"}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}