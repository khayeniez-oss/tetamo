"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";

export default function UpdatePasswordPage() {
  const { lang } = useLanguage();
  const router = useRouter();
  const isID = lang === "id";

  const [initializing, setInitializing] = useState(true);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const ui = useMemo(
    () => ({
      badge: isID ? "Buat Password Baru" : "Create New Password",
      title: isID ? "Atur ulang kata sandi Anda" : "Reset your password",
      subtitle: isID
        ? "Masukkan kata sandi baru untuk akun Tetamo Anda."
        : "Enter a new password for your Tetamo account.",
      helperTitle: isID ? "Aman dan cepat" : "Secure and quick",
      helperText: isID
        ? "Gunakan kata sandi yang kuat dan mudah Anda ingat. Setelah berhasil, silakan login kembali."
        : "Use a strong password that you can remember. After success, please log in again.",
      newPassword: isID ? "Kata Sandi Baru" : "New Password",
      confirmPassword: isID ? "Konfirmasi Kata Sandi" : "Confirm Password",
      newPasswordPlaceholder: isID
        ? "Masukkan kata sandi baru"
        : "Enter new password",
      confirmPasswordPlaceholder: isID
        ? "Ulangi kata sandi baru"
        : "Repeat new password",
      updateButton: isID ? "Update Password" : "Update Password",
      updating: isID ? "Mengupdate password..." : "Updating password...",
      backToLogin: isID ? "Kembali ke Login" : "Back to Login",
      successTitle: isID ? "Password berhasil diupdate" : "Password updated",
      successMessage: isID
        ? "Kata sandi Anda sudah berhasil diperbarui. Silakan login kembali dengan password baru."
        : "Your password has been updated successfully. Please log in again with your new password.",
      loadingSession: isID
        ? "Memeriksa link reset password..."
        : "Checking password reset link...",
      invalidLink: isID
        ? "Link reset password tidak valid atau sudah expired. Silakan request link baru."
        : "The password reset link is invalid or expired. Please request a new link.",
      emptyPassword: isID
        ? "Masukkan kata sandi baru."
        : "Enter your new password.",
      shortPassword: isID
        ? "Kata sandi minimal 8 karakter."
        : "Password must be at least 8 characters.",
      mismatchPassword: isID
        ? "Konfirmasi kata sandi tidak sama."
        : "Password confirmation does not match.",
      requestNewLink: isID ? "Request link baru" : "Request new link",
    }),
    [isID]
  );

  useEffect(() => {
    let mounted = true;

    async function prepareRecoverySession() {
      setInitializing(true);
      setErrorMessage("");

      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        const hashParams = new URLSearchParams(
          window.location.hash.replace("#", "")
        );
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            throw error;
          }

          window.history.replaceState(null, "", "/update-password");
        }

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            throw error;
          }

          window.history.replaceState(null, "", "/update-password");
        }

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!session?.user) {
          throw new Error(ui.invalidLink);
        }

        if (!mounted) return;

        setReady(true);
        setInitializing(false);
      } catch (error: any) {
        if (!mounted) return;

        setReady(false);
        setInitializing(false);
        setErrorMessage(error?.message || ui.invalidLink);
      }
    }

    void prepareRecoverySession();

    return () => {
      mounted = false;
    };
  }, [ui.invalidLink]);

  async function handleUpdatePassword() {
    setErrorMessage("");

    const newPassword = password.trim();
    const confirmNewPassword = confirmPassword.trim();

    if (!newPassword) {
      setErrorMessage(ui.emptyPassword);
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage(ui.shortPassword);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage(ui.mismatchPassword);
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setLoading(false);
      setErrorMessage(error.message);
      return;
    }

    await supabase.auth.signOut();

    setLoading(false);
    setSuccess(true);
    setPassword("");
    setConfirmPassword("");
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
                <LockKeyhole className="h-6 w-6" />
              </div>

              <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
                {success ? ui.successTitle : ui.title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#6E6E73]">
                {success ? ui.successMessage : ui.subtitle}
              </p>
            </div>

            {initializing ? (
              <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-center text-sm leading-6 text-gray-600">
                {ui.loadingSession}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                  <div className="text-sm leading-6 text-red-700">
                    <p>{errorMessage}</p>

                    {!ready ? (
                      <Link
                        href="/forgot-password"
                        className="mt-2 inline-flex font-semibold underline underline-offset-4"
                      >
                        {ui.requestNewLink}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {success ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                  <div>
                    <p className="font-semibold text-emerald-800">
                      {ui.successTitle}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-emerald-700">
                      {ui.successMessage}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-[#111827] px-4 py-3 text-sm font-semibold text-white transition hover:bg-black"
                >
                  {ui.backToLogin}
                </button>
              </div>
            ) : null}

            {!initializing && ready && !success ? (
              <form
                className="mt-6 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleUpdatePassword();
                }}
              >
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#1C1C1E]">
                    {ui.newPassword}
                  </label>

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrorMessage("");
                      }}
                      placeholder={ui.newPasswordPlaceholder}
                      autoComplete="new-password"
                      className="w-full rounded-2xl border border-[#D8D8DD] bg-white px-4 py-3 pr-12 text-sm text-[#1C1C1E] outline-none transition placeholder:text-[#8E8E93] focus:border-[#1C1C1E] focus:ring-4 focus:ring-black/5"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-3 flex items-center text-[#6E6E73] transition hover:text-[#111827]"
                      aria-label={
                        showPassword
                          ? isID
                            ? "Sembunyikan kata sandi"
                            : "Hide password"
                          : isID
                          ? "Tampilkan kata sandi"
                          : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#1C1C1E]">
                    {ui.confirmPassword}
                  </label>

                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setErrorMessage("");
                      }}
                      placeholder={ui.confirmPasswordPlaceholder}
                      autoComplete="new-password"
                      className="w-full rounded-2xl border border-[#D8D8DD] bg-white px-4 py-3 pr-12 text-sm text-[#1C1C1E] outline-none transition placeholder:text-[#8E8E93] focus:border-[#1C1C1E] focus:ring-4 focus:ring-black/5"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((prev) => !prev)
                      }
                      className="absolute inset-y-0 right-3 flex items-center text-[#6E6E73] transition hover:text-[#111827]"
                      aria-label={
                        showConfirmPassword
                          ? isID
                            ? "Sembunyikan konfirmasi kata sandi"
                            : "Hide confirm password"
                          : isID
                          ? "Tampilkan konfirmasi kata sandi"
                          : "Show confirm password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-[#111827] px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
                >
                  {loading ? ui.updating : ui.updateButton}
                </button>
              </form>
            ) : null}

            {!initializing && !ready && !success ? (
              <div className="mt-6">
                <Link
                  href="/forgot-password"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-[#111827] px-4 py-3 text-sm font-semibold text-white transition hover:bg-black"
                >
                  {ui.requestNewLink}
                </Link>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}