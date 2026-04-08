"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, UserRound, BriefcaseBusiness, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";

type AllowedRole = "owner" | "agent" | "developer" | "admin";
type OAuthProvider = "google" | "apple" | "facebook";

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
  icon: React.ReactNode;
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

  useEffect(() => {
    if (initialRole && initialRole !== selectedRole) {
      setSelectedRole(initialRole);
    }
  }, [initialRole, selectedRole]);

  const currentRole = selectedRole;
  const isAdminSignup = currentRole === "admin";
  const isDeveloperSoon = currentRole === "developer";

  const roleLabel = useMemo(() => {
    if (currentRole === "agent") return lang === "id" ? "Agen" : "Agent";
    if (currentRole === "developer") return "Developer";
    if (currentRole === "admin") return "Admin";
    if (currentRole === "owner") return lang === "id" ? "Pemilik" : "Owner";
    return "";
  }, [currentRole, lang]);

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

  const getOAuthRedirectTo = (provider: OAuthProvider) => {
    if (!currentRole) return `${window.location.origin}/auth/callback`;

    const params = new URLSearchParams();
    params.set("role", currentRole);
    params.set("provider", provider);
    params.set("flow", "signup");

    if (packageId) params.set("package", packageId);
    if (planId) params.set("plan", planId);
    if (from) params.set("from", from);
    if (next) params.set("next", next);

    return `${window.location.origin}/auth/callback?${params.toString()}`;
  };

  const handleOAuthSignup = async (provider: OAuthProvider) => {
    if (!currentRole) return;

    if (isAdminSignup) {
      alert(
        lang === "id"
          ? "Signup Admin harus menggunakan email, password, dan admin code."
          : "Admin signup must use email, password, and admin code."
      );
      return;
    }

    if (isDeveloperSoon) {
      alert(
        lang === "id"
          ? "Paket Developer belum siap. Flow developer akan ditambahkan kemudian."
          : "Developer package is not ready yet. The developer flow will be added later."
      );
      return;
    }

    setLoading(true);

    try {
      const oauthOptions: Parameters<typeof supabase.auth.signInWithOAuth>[0]["options"] = {
        redirectTo: getOAuthRedirectTo(provider),
      };

      if (provider === "google") {
        oauthOptions.queryParams = {
          prompt: "select_account",
        };
      }

      

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: oauthOptions,
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
    if (!currentRole) {
      alert(
        lang === "id"
          ? "Silakan pilih peran terlebih dahulu."
          : "Please choose a role first."
      );
      return;
    }

    if (isDeveloperSoon) {
      alert(
        lang === "id"
          ? "Flow developer belum dibuat. Untuk sementara belum bisa daftar sebagai developer."
          : "The developer flow is not created yet. Developer signup is not available for now."
      );
      return;
    }

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
          router.push(`/login?role=owner&next=${encodeURIComponent(ownerNextPath)}`);
        }
        return;
      }

      if (currentRole === "agent") {
        if (data.session) {
          router.push(agentNextPath);
        } else {
          router.push(`/login?role=agent&next=${encodeURIComponent(agentNextPath)}`);
        }
        return;
      }

      if (currentRole === "admin") {
        if (data.session) {
          router.push(adminNextPath);
        } else {
          alert(
            lang === "id"
              ? "Akun admin berhasil dibuat. Silakan login."
              : "Admin account created successfully. Please log in."
          );
          router.push(`/login?role=admin&next=${encodeURIComponent(adminNextPath)}`);
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
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] px-4 py-10 sm:px-6 sm:py-16">
      <div className="w-full max-w-xl rounded-[28px] border border-[#e5e5e7] bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:rounded-[32px] sm:p-8">
        <div className="mb-7 text-center sm:mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-[#1C1C1E] sm:text-3xl">
            {lang === "id" ? "Buat akun Anda" : "Create your account"}
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#6e6e73]">
            {lang === "id"
              ? "Pilih cara Anda ingin menggunakan Tetamo terlebih dahulu"
              : "Choose how you want to use Tetamo first"}
          </p>
        </div>

        {!currentRole ? (
          <div className="space-y-4">
            <RoleCard
              active={false}
              icon={<UserRound className="h-5 w-5 text-[#1C1C1E]" />}
              title={lang === "id" ? "Pemilik" : "Owner"}
              desc={
                lang === "id"
                  ? "Untuk pemilik properti yang ingin memilih paket, membuat listing, lalu membayar agar listing aktif."
                  : "For property owners who want to choose a package, create a listing, and then pay to activate it."
              }
              onClick={() => setSelectedRole("owner")}
            />

            <RoleCard
              active={false}
              icon={<BriefcaseBusiness className="h-5 w-5 text-[#1C1C1E]" />}
              title={lang === "id" ? "Agen" : "Agent"}
              desc={
                lang === "id"
                  ? "Untuk agen properti yang harus memilih paket dan membayar sebelum masuk dashboard agen."
                  : "For property agents who must choose a package and pay before entering the agent dashboard."
              }
              onClick={() => setSelectedRole("agent")}
            />

            <RoleCard
              active={false}
              disabled
              badge={lang === "id" ? "Segera" : "Soon"}
              icon={<Building2 className="h-5 w-5 text-[#1C1C1E]" />}
              title="Developer"
              desc={
                lang === "id"
                  ? "Flow developer dan paket license akan segera tersedia."
                  : "Developer flow and license package will be available soon."
              }
            />

            <p className="pt-2 text-center text-sm leading-6 text-[#6e6e73]">
              {lang === "id" ? "Sudah punya akun?" : "Already have an account?"}{" "}
              <Link
                href={footerLoginHref}
                className="font-semibold text-[#1C1C1E] underline underline-offset-4"
              >
                {lang === "id" ? "Masuk" : "Log in"}
              </Link>
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-[#e5e5e7] bg-[#fafafa] px-4 py-3">
              <div>
                <p className="text-xs text-[#6e6e73]">
                  {lang === "id" ? "Peran terpilih" : "Selected role"}
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
                  {lang === "id" ? "Ganti" : "Change"}
                </button>
              ) : null}
            </div>

            {isDeveloperSoon ? (
              <div className="rounded-2xl border border-[#e5e5e7] bg-[#fafafa] p-5 text-center">
                <p className="text-base font-semibold text-[#1C1C1E]">
                  {lang === "id"
                    ? "Paket Developer segera hadir"
                    : "Developer package coming soon"}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#6e6e73]">
                  {lang === "id"
                    ? "Flow developer belum dibuat. Untuk sementara gunakan Owner atau Agent."
                    : "The developer flow is not built yet. For now, please use Owner or Agent."}
                </p>
              </div>
            ) : (
              <>
                {!isAdminSignup ? (
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
                          {lang === "id"
                            ? "Daftar dengan Google"
                            : "Sign up with Google"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOAuthSignup("facebook")}
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#d2d2d7] bg-white px-4 py-3 text-sm font-semibold text-[#1C1C1E] transition hover:bg-[#f8f8f8] disabled:opacity-60"
                      >
                        <FacebookDarkIcon />
                        <span>
                          {lang === "id"
                            ? "Daftar dengan Facebook"
                            : "Sign up with Facebook"}
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
                          {lang === "id"
                            ? "Daftar dengan Apple"
                            : "Sign up with Apple"}
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
                ) : null}

                <div className="space-y-4">
                  <FormInput
                    label={lang === "id" ? "Nama Lengkap" : "Full name"}
                    placeholder={
                      lang === "id"
                        ? "Masukkan nama lengkap Anda"
                        : "Enter your full name"
                    }
                    value={fullName}
                    onChange={setFullName}
                  />

                  <FormInput
                    label="Email"
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
                      lang === "id" ? "Buat kata sandi" : "Create a password"
                    }
                    value={password}
                    onChange={setPassword}
                  />

                  {isAdminSignup ? (
                    <FormInput
                      label="Admin Code"
                      type="password"
                      placeholder={
                        lang === "id"
                          ? "Masukkan admin signup code"
                          : "Enter admin signup code"
                      }
                      value={adminCode}
                      onChange={setAdminCode}
                    />
                  ) : null}

                  <button
                    type="button"
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

                <p className="mt-6 text-center text-sm leading-6 text-[#6e6e73]">
                  {lang === "id" ? "Sudah punya akun?" : "Already have an account?"}{" "}
                  <Link
                    href={footerLoginHref}
                    className="font-semibold text-[#1C1C1E] underline underline-offset-4"
                  >
                    {lang === "id" ? "Masuk" : "Log in"}
                  </Link>
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}