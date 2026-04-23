"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  UserRound,
  BriefcaseBusiness,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";

type AllowedRole = "owner" | "agent" | "developer" | "admin";
type OAuthProvider = "google" | "facebook" | "apple";

function normalizeRole(value: string | null): AllowedRole | null {
  const v = String(value || "").toLowerCase();

  if (v === "owner") return "owner";
  if (v === "agent") return "agent";
  if (v === "developer") return "developer";
  if (v === "admin") return "admin";

  return null;
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

function FacebookDarkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 text-[#1C1C1E]"
      fill="currentColor"
    >
      <path d="M13.642 21v-8.201h2.757l.413-3.197h-3.17V7.561c0-.926.257-1.557 1.586-1.557H16.9V3.145C16.61 3.106 15.618 3 14.463 3c-2.412 0-4.064 1.472-4.064 4.176v2.426H7.67v3.197h2.729V21h3.243Z" />
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

function FormInput({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
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
        autoComplete={autoComplete}
        className="w-full rounded-2xl border border-[#d2d2d7] bg-white px-4 py-3 text-sm text-[#1C1C1E] outline-none transition placeholder:text-gray-500 focus:border-[#1C1C1E]"
      />
    </div>
  );
}

function RoleCard({
  active,
  disabled,
  icon,
  title,
  desc,
  badge,
  onClick,
}: {
  active?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  title: string;
  desc: string;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={[
        "relative w-full rounded-3xl border p-4 text-left transition sm:p-5",
        disabled
          ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-70"
          : active
            ? "border-[#1C1C1E] bg-white shadow-sm ring-1 ring-[#1C1C1E]"
            : "border-[#e5e5e7] bg-white hover:border-gray-300 hover:shadow-sm",
      ].join(" ")}
    >
      {badge ? (
        <span className="absolute right-4 top-4 rounded-full bg-[#1C1C1E] px-2.5 py-1 text-[10px] font-semibold text-white">
          {badge}
        </span>
      ) : null}

      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-[#e5e5e7] bg-[#f8f8f8] p-2.5">
          {icon}
        </div>

        <div className="pr-14">
          <div className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
            {title}
          </div>
          <div className="mt-1 text-xs leading-6 text-[#6e6e73] sm:text-sm">
            {desc}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function SignupPageClient() {
  const { lang } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const isID = lang === "id";
  const developerLicensePath = "/developer-license";
  const showFacebook = process.env.NEXT_PUBLIC_ENABLE_FACEBOOK_AUTH === "true";

  const initialRole = normalizeRole(searchParams.get("role"));
  const packageId = searchParams.get("package") || "";
  const planId = searchParams.get("plan") || "";
  const from = searchParams.get("from") || "";
  const next = searchParams.get("next") || "";

  const [selectedRole, setSelectedRole] = useState<AllowedRole | null>(
    initialRole
  );
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<OAuthProvider | null>(
    null
  );

  useEffect(() => {
    setSelectedRole(initialRole);
  }, [initialRole]);

  useEffect(() => {
    if (selectedRole === "developer") {
      router.replace(developerLicensePath);
    }
  }, [selectedRole, router]);

  const currentRole = selectedRole;
  const isAdminSignup = currentRole === "admin";
  const isDeveloperRole = currentRole === "developer";

  const roleLabel = useMemo(() => {
    if (currentRole === "agent") return isID ? "Agen" : "Agent";
    if (currentRole === "developer") return "Developer";
    if (currentRole === "admin") return "Admin";
    if (currentRole === "owner") return isID ? "Pemilik" : "Owner";
    return "";
  }, [currentRole, isID]);

  const ownerNextPath = next || "/pemilik";
  const agentNextPath = next || "/agentdashboard/paket";
  const adminNextPath = next || "/admindashboard";

  const loginRedirect =
    currentRole === "agent"
      ? `/login?role=agent&next=${encodeURIComponent(agentNextPath)}`
      : currentRole === "owner"
        ? `/login?role=owner&next=${encodeURIComponent(ownerNextPath)}`
        : currentRole === "admin"
          ? `/login?role=admin&next=${encodeURIComponent(adminNextPath)}`
          : "/login";

  const footerLoginHref =
    currentRole && currentRole !== "developer"
      ? loginRedirect
      : next
        ? `/login?next=${encodeURIComponent(next)}`
        : "/login";

  function getOAuthRedirectTo(provider: OAuthProvider) {
    const params = new URLSearchParams();

    if (currentRole) params.set("role", currentRole);
    params.set("provider", provider);
    params.set("flow", "signup");

    if (packageId) params.set("package", packageId);
    if (planId) params.set("plan", planId);
    if (from) params.set("from", from);
    if (next) params.set("next", next);

    return `${window.location.origin}/auth/callback?${params.toString()}`;
  }

  async function handleOAuthSignup(provider: OAuthProvider) {
    if (!currentRole) return;

    if (isAdminSignup) {
      alert(
        isID
          ? "Signup Admin harus menggunakan email, password, dan admin code."
          : "Admin signup must use email, password, and admin code."
      );
      return;
    }

    if (isDeveloperRole) {
      router.push(developerLicensePath);
      return;
    }

    setLoading(true);
    setSocialLoading(provider);

    try {
      const options: {
        redirectTo: string;
        queryParams?: Record<string, string>;
      } = {
        redirectTo: getOAuthRedirectTo(provider),
      };

      if (provider === "google") {
        options.queryParams = { prompt: "select_account" };
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options,
      });

      if (error) {
        setLoading(false);
        setSocialLoading(null);
        alert(error.message);
      }
    } catch (err: any) {
      setLoading(false);
      setSocialLoading(null);
      alert(err?.message || "OAuth signup failed.");
    }
  }

  async function handleSignup() {
    if (!currentRole) {
      alert(
        isID
          ? "Silakan pilih peran terlebih dahulu."
          : "Please choose a role first."
      );
      return;
    }

    if (isDeveloperRole) {
      router.push(developerLicensePath);
      return;
    }

    const trimmedFullName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedAdminCode = adminCode.trim();

    if (!trimmedFullName || !trimmedEmail || !trimmedPassword) {
      alert(isID ? "Mohon lengkapi semua field." : "Please complete all fields.");
      return;
    }

    if (trimmedPassword.length < 6) {
      alert(
        isID
          ? "Kata sandi minimal 6 karakter."
          : "Password must be at least 6 characters."
      );
      return;
    }

    if (isAdminSignup) {
      const expectedAdminCode =
        process.env.NEXT_PUBLIC_ADMIN_SIGNUP_CODE?.trim() || "";

      if (!expectedAdminCode) {
        alert(
          isID
            ? "Admin signup code belum dikonfigurasi."
            : "Admin signup code is not configured."
        );
        return;
      }

      if (trimmedAdminCode !== expectedAdminCode) {
        alert(
          isID ? "Admin signup code tidak valid." : "Invalid admin signup code."
        );
        return;
      }
    }

    setLoading(true);
    setSocialLoading(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
        options: {
          data: {
            full_name: trimmedFullName,
            role: currentRole,
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
            role: currentRole,
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

      if (currentRole === "owner") {
        if (data.session) {
          router.push(ownerNextPath);
        } else {
          router.push(
            `/login?role=owner&next=${encodeURIComponent(ownerNextPath)}`
          );
        }
        return;
      }

      if (currentRole === "agent") {
        if (data.session) {
          router.push(agentNextPath);
        } else {
          router.push(
            `/login?role=agent&next=${encodeURIComponent(agentNextPath)}`
          );
        }
        return;
      }

      if (currentRole === "admin") {
        if (data.session) {
          router.push(adminNextPath);
        } else {
          alert(
            isID
              ? "Akun admin berhasil dibuat. Silakan login."
              : "Admin account created successfully. Please log in."
          );
          router.push(
            `/login?role=admin&next=${encodeURIComponent(adminNextPath)}`
          );
        }
        return;
      }

      router.push("/");
    } catch (err: any) {
      setLoading(false);
      alert(err?.message || "Signup failed.");
    }
  }

  const isBusy = loading || socialLoading !== null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7] px-4 py-8 sm:px-6 sm:py-14 lg:px-8">
      <div className="w-full max-w-xl rounded-[28px] border border-[#e5e5e7] bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:rounded-[32px] sm:p-8">
        <div className="mb-7 text-center sm:mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-[#1C1C1E] sm:text-3xl">
            {isID ? "Buat Akun TETAMO" : "Create Your TETAMO Account"}
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#6e6e73]">
            {isID
              ? "Pilih peran Anda untuk melanjutkan ke alur yang sesuai."
              : "Choose your role to continue with the right flow."}
          </p>
        </div>

        {!currentRole ? (
          <div className="space-y-4">
            <RoleCard
              icon={<UserRound className="h-5 w-5 text-[#1C1C1E]" />}
              title={isID ? "Pemilik Properti" : "Property Owner"}
              desc={
                isID
                  ? "Untuk pemilik yang ingin memasang listing dan mengelola properti di TETAMO."
                  : "For owners who want to list and manage their properties on TETAMO."
              }
              onClick={() => setSelectedRole("owner")}
            />

            <RoleCard
              icon={<BriefcaseBusiness className="h-5 w-5 text-[#1C1C1E]" />}
              title={isID ? "Agen Properti" : "Property Agent"}
              desc={
                isID
                  ? "Untuk agent yang ingin memilih paket, mengelola listing, leads, jadwal viewing, dan komisi."
                  : "For agents who want to choose a package, manage listings, leads, viewing schedules, and commissions."
              }
              onClick={() => setSelectedRole("agent")}
            />

            <RoleCard
              badge="Request Quote"
              icon={<Building2 className="h-5 w-5 text-[#1C1C1E]" />}
              title="Developer"
              desc={
                isID
                  ? "Untuk developer atau project owner yang ingin meminta quotation untuk menggunakan TETAMO License."
                  : "For developers or project owners who want to request a quotation to use the TETAMO License."
              }
              onClick={() => router.push(developerLicensePath)}
            />

            <p className="pt-2 text-center text-sm leading-6 text-[#6e6e73]">
              {isID ? "Sudah punya akun?" : "Already have an account?"}{" "}
              <Link
                href={footerLoginHref}
                className="font-semibold text-[#1C1C1E] underline underline-offset-4"
              >
                {isID ? "Masuk" : "Log in"}
              </Link>
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-[#e5e5e7] bg-[#fafafa] px-4 py-3">
              <div>
                <p className="text-xs text-[#6e6e73]">
                  {isID ? "Peran terpilih" : "Selected role"}
                </p>
                <p className="text-sm font-semibold text-[#1C1C1E]">
                  {roleLabel}
                </p>
              </div>

              {currentRole !== "admin" ? (
                <button
                  type="button"
                  onClick={() => setSelectedRole(null)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-xs font-medium text-[#1C1C1E] transition hover:bg-[#f8f8f8]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {isID ? "Ganti" : "Change"}
                </button>
              ) : null}
            </div>

            {!isAdminSignup ? (
              <>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => void handleOAuthSignup("google")}
                    disabled={isBusy}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#d2d2d7] bg-white px-4 py-3 text-sm font-semibold text-[#1C1C1E] transition hover:bg-[#f8f8f8] disabled:opacity-60"
                  >
                    <GoogleDarkIcon />
                    <span>
                      {socialLoading === "google"
                        ? isID
                          ? "Menghubungkan ke Google..."
                          : "Connecting to Google..."
                        : isID
                          ? "Daftar dengan Google"
                          : "Sign up with Google"}
                    </span>
                  </button>

                  {showFacebook ? (
                    <button
                      type="button"
                      onClick={() => void handleOAuthSignup("facebook")}
                      disabled={isBusy}
                      className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#d2d2d7] bg-white px-4 py-3 text-sm font-semibold text-[#1C1C1E] transition hover:bg-[#f8f8f8] disabled:opacity-60"
                    >
                      <FacebookDarkIcon />
                      <span>
                        {socialLoading === "facebook"
                          ? isID
                            ? "Menghubungkan ke Facebook..."
                            : "Connecting to Facebook..."
                          : isID
                            ? "Daftar dengan Facebook"
                            : "Sign up with Facebook"}
                      </span>
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => void handleOAuthSignup("apple")}
                    disabled={isBusy}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#d2d2d7] bg-white px-4 py-3 text-sm font-semibold text-[#1C1C1E] transition hover:bg-[#f8f8f8] disabled:opacity-60"
                  >
                    <AppleDarkIcon />
                    <span>
                      {socialLoading === "apple"
                        ? isID
                          ? "Menghubungkan ke Apple..."
                          : "Connecting to Apple..."
                        : isID
                          ? "Daftar dengan Apple"
                          : "Sign up with Apple"}
                    </span>
                  </button>
                </div>

                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[#e5e5e7]" />
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#6e6e73]">
                    {isID ? "Atau" : "Or"}
                  </span>
                  <div className="h-px flex-1 bg-[#e5e5e7]" />
                </div>
              </>
            ) : null}

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void handleSignup();
              }}
            >
              <FormInput
                label={isID ? "Nama Lengkap" : "Full Name"}
                placeholder={
                  isID ? "Masukkan nama lengkap Anda" : "Enter your full name"
                }
                value={fullName}
                onChange={setFullName}
                autoComplete="name"
              />

              <FormInput
                label="Email"
                type="email"
                placeholder={isID ? "Masukkan email Anda" : "Enter your email"}
                value={email}
                onChange={setEmail}
                autoComplete="email"
              />

              <FormInput
                label={isID ? "Kata Sandi" : "Password"}
                type="password"
                placeholder={isID ? "Buat kata sandi" : "Create a password"}
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
              />

              {isAdminSignup ? (
                <FormInput
                  label="Admin Code"
                  type="password"
                  placeholder={
                    isID
                      ? "Masukkan admin signup code"
                      : "Enter admin signup code"
                  }
                  value={adminCode}
                  onChange={setAdminCode}
                  autoComplete="off"
                />
              ) : null}

              <button
                type="submit"
                disabled={isBusy}
                className="w-full rounded-2xl bg-[#1C1C1E] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {loading && !socialLoading
                  ? isID
                    ? "Sedang membuat akun..."
                    : "Creating account..."
                  : isID
                    ? "Daftar"
                    : "Sign up"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm leading-6 text-[#6e6e73]">
              {isID ? "Sudah punya akun?" : "Already have an account?"}{" "}
              <Link
                href={footerLoginHref}
                className="font-semibold text-[#1C1C1E] underline underline-offset-4"
              >
                {isID ? "Masuk" : "Log in"}
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}