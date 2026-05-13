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
type OAuthProvider = "google";

function normalizeRole(value: string | null): AllowedRole | null {
  const v = String(value || "").toLowerCase();

  if (v === "owner") return "owner";
  if (v === "agent") return "agent";
  if (v === "developer") return "developer";
  if (v === "admin") return "admin";

  return null;
}

function normalizePhoneNumber(value: string) {
  const raw = String(value || "").trim();

  if (!raw) return "";

  const cleaned = raw.replace(/[^\d+]/g, "");

  if (!cleaned) return "";

  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  if (cleaned.startsWith("00")) {
    return `+${cleaned.slice(2)}`;
  }

  if (cleaned.startsWith("0")) {
    return `+62${cleaned.slice(1)}`;
  }

  if (cleaned.startsWith("62")) {
    return `+${cleaned}`;
  }

  if (cleaned.startsWith("8")) {
    return `+62${cleaned}`;
  }

  return `+${cleaned}`;
}

function isValidInternationalPhone(value: string) {
  if (!value) return false;
  return /^\+[1-9]\d{7,14}$/.test(value);
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

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-[#D8D8DD] bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B7280] shadow-sm">
      {children}
    </span>
  );
}

function FormInput({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  autoComplete,
  inputMode,
  helperText,
}: {
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  inputMode?:
    | "none"
    | "text"
    | "tel"
    | "url"
    | "email"
    | "numeric"
    | "decimal"
    | "search";
  helperText?: string;
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
        inputMode={inputMode}
        className="w-full rounded-2xl border border-[#D8D8DD] bg-white px-4 py-3 text-sm text-[#1C1C1E] outline-none transition placeholder:text-[#8E8E93] focus:border-[#1C1C1E] focus:ring-4 focus:ring-black/5"
      />

      {helperText ? (
        <p className="mt-2 text-xs leading-5 text-[#6E6E73]">{helperText}</p>
      ) : null}
    </div>
  );
}

function PolicyAgreement({
  isID,
  checked,
  onChange,
}: {
  isID: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E7E7EA] bg-[#FAFAFB] px-4 py-3 text-left">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 rounded border-[#D8D8DD] accent-[#111827]"
      />

      <span className="text-xs leading-6 text-[#5F6368] sm:text-sm">
        {isID ? "Saya menyetujui " : "I agree to Tetamo’s "}
        <Link
          href="/terms"
          target="_blank"
          className="font-semibold text-[#111827] underline underline-offset-4"
          onClick={(e) => e.stopPropagation()}
        >
          {isID ? "Syarat & Ketentuan" : "Terms & Conditions"}
        </Link>
        {", "}
        <Link
          href="/privacy-policy"
          target="_blank"
          className="font-semibold text-[#111827] underline underline-offset-4"
          onClick={(e) => e.stopPropagation()}
        >
          {isID ? "Kebijakan Privasi" : "Privacy Policy"}
        </Link>
        {isID ? ", dan " : ", and "}
        <Link
          href="/subscription-policy"
          target="_blank"
          className="font-semibold text-[#111827] underline underline-offset-4"
          onClick={(e) => e.stopPropagation()}
        >
          {isID ? "Kebijakan Berlangganan Tetamo" : "Subscription Policy"}
        </Link>
        .
      </span>
    </label>
  );
}

function RoleCard({
  active,
  disabled,
  icon,
  title,
  desc,
  badge,
  tone,
  onClick,
}: {
  active?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  title: string;
  desc: string;
  badge?: string;
  tone: "amber" | "emerald" | "slate";
  onClick?: () => void;
}) {
  const toneClasses =
    tone === "amber"
      ? active
        ? "border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-[0_16px_40px_rgba(245,158,11,0.12)]"
        : "border-[#E7E7EA] bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 hover:border-amber-200 hover:shadow-[0_14px_30px_rgba(245,158,11,0.08)]"
      : tone === "emerald"
      ? active
        ? "border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 shadow-[0_16px_40px_rgba(16,185,129,0.12)]"
        : "border-[#E7E7EA] bg-gradient-to-br from-emerald-50/70 via-white to-cyan-50/40 hover:border-emerald-200 hover:shadow-[0_14px_30px_rgba(16,185,129,0.08)]"
      : active
      ? "border-slate-300 bg-gradient-to-br from-slate-50 via-white to-gray-50 shadow-[0_16px_40px_rgba(100,116,139,0.10)]"
      : "border-[#E7E7EA] bg-gradient-to-br from-slate-50/70 via-white to-gray-50/40 hover:border-slate-200 hover:shadow-[0_14px_30px_rgba(100,116,139,0.08)]";

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={[
        "relative w-full rounded-[28px] border p-4 text-left transition sm:p-5",
        disabled ? "cursor-not-allowed opacity-70" : "",
        toneClasses,
      ].join(" ")}
    >
      {badge ? (
        <span className="absolute right-4 top-4 rounded-full bg-[#1C1C1E] px-2.5 py-1 text-[10px] font-semibold text-white">
          {badge}
        </span>
      ) : null}

      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-white/70 bg-white/90 p-2.5 shadow-sm">
          {icon}
        </div>

        <div className="pr-14">
          <div className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
            {title}
          </div>
          <div className="mt-1 text-xs leading-6 text-[#6E6E73] sm:text-sm">
            {desc}
          </div>
        </div>
      </div>
    </button>
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
    <div className={`rounded-[28px] border p-5 sm:p-6 ${cardClass}`}>
      <p className={`text-sm font-semibold ${eyebrowClass}`}>{eyebrow}</p>
      <h3 className="mt-3 text-2xl font-bold leading-tight text-[#111827] sm:text-[32px]">
        {title}
      </h3>
      <p className="mt-4 text-sm leading-7 text-[#6B7280] sm:text-base">
        {description}
      </p>
    </div>
  );
}

export default function SignupPageClient() {
  const { lang } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const isID = lang === "id";
  const developerLicensePath = "/developer-license";

  const initialRole = normalizeRole(searchParams.get("role"));
  const packageId = searchParams.get("package") || "";
  const planId = searchParams.get("plan") || "";
  const from = searchParams.get("from") || "";
  const next = searchParams.get("next") || "";

  const [selectedRole, setSelectedRole] = useState<AllowedRole | null>(
    initialRole
  );
  const [phoneNumber, setPhoneNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [agreedToPolicies, setAgreedToPolicies] = useState(false);
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
  }, [selectedRole, router, developerLicensePath]);

  const currentRole = selectedRole;
  const isAdminSignup = currentRole === "admin";
  const isDeveloperRole = currentRole === "developer";
  const phoneRequired =
    currentRole === "owner" || currentRole === "agent" || currentRole === "admin";

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

  function getValidatedPhoneForSubmit() {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    if (phoneRequired && !normalizedPhone) {
      alert(
        isID
          ? "Mohon masukkan nomor WhatsApp / telepon Anda."
          : "Please enter your WhatsApp / phone number."
      );
      return null;
    }

    if (normalizedPhone && !isValidInternationalPhone(normalizedPhone)) {
      alert(
        isID
          ? "Mohon masukkan nomor WhatsApp / telepon dengan format internasional yang valid. Contoh: +62 812 3456 7890."
          : "Please enter a valid international WhatsApp / phone number. Example: +62 812 3456 7890."
      );
      return null;
    }

    return normalizedPhone;
  }

  function getValidatedFullNameForSubmit() {
    const trimmedFullName = fullName.trim();

    if (!trimmedFullName) {
      alert(
        isID
          ? "Mohon masukkan nama lengkap Anda."
          : "Please enter your full name."
      );
      return null;
    }

    return trimmedFullName;
  }

  function getOAuthRedirectTo(provider: OAuthProvider) {
    const params = new URLSearchParams();
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const trimmedFullName = fullName.trim();

    if (currentRole) params.set("role", currentRole);
    params.set("provider", provider);
    params.set("flow", "signup");

    if (trimmedFullName) params.set("full_name", trimmedFullName);
    if (normalizedPhone) params.set("phone", normalizedPhone);
    if (packageId) params.set("package", packageId);
    if (planId) params.set("plan", planId);
    if (from) params.set("from", from);
    if (next) params.set("next", next);

    return `${window.location.origin}/auth/callback?${params.toString()}`;
  }

  function alertPolicyAgreementRequired() {
    alert(
      isID
        ? "Silakan setujui Syarat & Ketentuan, Kebijakan Privasi, dan Kebijakan Berlangganan Tetamo terlebih dahulu."
        : "Please agree to Tetamo’s Terms & Conditions, Privacy Policy, and Subscription Policy first."
    );
  }

  async function handleOAuthSignup(provider: OAuthProvider) {
    if (!currentRole) return;

    const trimmedFullName = getValidatedFullNameForSubmit();
    if (trimmedFullName === null) return;

    const normalizedPhone = getValidatedPhoneForSubmit();
    if (normalizedPhone === null) return;

    if (!agreedToPolicies) {
      alertPolicyAgreementRequired();
      return;
    }

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
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getOAuthRedirectTo(provider),
          queryParams: {
            prompt: "select_account",
          },
        },
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

    const trimmedFullName = getValidatedFullNameForSubmit();
    if (trimmedFullName === null) return;

    const normalizedPhone = getValidatedPhoneForSubmit();
    if (normalizedPhone === null) return;

    if (!agreedToPolicies) {
      alertPolicyAgreementRequired();
      return;
    }

    if (isDeveloperRole) {
      router.push(developerLicensePath);
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedAdminCode = adminCode.trim();

    if (!trimmedEmail || !trimmedPassword) {
      alert(
        isID
          ? "Untuk daftar dengan email, mohon isi email dan kata sandi. Atau gunakan daftar dengan Google di bawah."
          : "For email signup, please enter your email and password. Or use Sign up with Google below."
      );
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
            phone: normalizedPhone,
            package: packageId,
            plan: planId,
            from,
            next,
            agreed_to_terms: true,
            agreed_to_policies_at: new Date().toISOString(),
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
            phone: normalizedPhone,
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
  const signupDisabled = isBusy;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#FFFDF8_0%,#FFFFFF_36%,#F6FFFB_100%)] px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
        <section className="overflow-hidden rounded-[32px] border border-[#ECE8DD] bg-[linear-gradient(135deg,#FFF7EA_0%,#F3FFF9_100%)] shadow-[0_24px_60px_rgba(17,24,39,0.07)]">
          <div className="px-5 py-7 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
            <Pill>{isID ? "Tetamo Signup" : "Tetamo Signup"}</Pill>

            <div className="mt-5 max-w-3xl">
              <h1 className="text-[32px] font-black leading-[1.08] tracking-[-0.03em] text-[#0F172A] sm:text-[42px] lg:text-[56px]">
                {isID
                  ? "Mulai akun Tetamo Anda dengan tampilan yang lebih profesional"
                  : "Join Tetamo with a more premium and professional start"}
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-8 text-[#5F6368] sm:text-lg">
                {isID
                  ? "Pilih peran Anda dan lanjutkan ke alur yang sesuai untuk pemilik, agent, developer, atau admin."
                  : "Choose your role and continue to the right flow for owners, agents, developers, or admins."}
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoCard
                eyebrow={isID ? "Untuk Pemilik" : "For Owners"}
                title={
                  isID
                    ? "Mulai listing properti Anda"
                    : "Start listing your property"
                }
                description={
                  isID
                    ? "Cocok untuk pemilik yang ingin tampilan listing lebih menarik dan peluang inquiry yang lebih baik."
                    : "Best for owners who want a more attractive listing presence and better inquiry potential."
                }
                tone="amber"
              />

              <InfoCard
                eyebrow={isID ? "Untuk Agent" : "For Agents"}
                title={
                  isID
                    ? "Bangun profil dan kelola listing"
                    : "Build your profile and manage listings"
                }
                description={
                  isID
                    ? "Ideal untuk agent yang ingin mengelola listing, leads, viewing, dan branding dalam satu alur."
                    : "Ideal for agents who want to manage listings, leads, viewing, and branding in one flow."
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
                {isID ? "Buat Akun TETAMO" : "Create Your TETAMO Account"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#6E6E73]">
                {isID
                  ? "Pilih peran Anda untuk melanjutkan ke alur yang sesuai."
                  : "Choose your role to continue with the right flow."}
              </p>
            </div>

            {!currentRole ? (
              <div className="space-y-4">
                <RoleCard
                  tone="amber"
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
                  tone="emerald"
                  icon={
                    <BriefcaseBusiness className="h-5 w-5 text-[#1C1C1E]" />
                  }
                  title={isID ? "Agent Properti" : "Property Agent"}
                  desc={
                    isID
                      ? "Untuk agent yang ingin memilih paket, mengelola listing, leads, jadwal viewing, dan komisi."
                      : "For agents who want to choose a package, manage listings, leads, viewing schedules, and commissions."
                  }
                  onClick={() => setSelectedRole("agent")}
                />

                <RoleCard
                  tone="slate"
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

                <p className="pt-2 text-center text-sm leading-6 text-[#6E6E73]">
                  {isID ? "Sudah punya akun?" : "Already have an account?"}{" "}
                  <Link
                    href={footerLoginHref}
                    className="font-semibold text-[#111827] underline underline-offset-4"
                  >
                    {isID ? "Masuk" : "Log in"}
                  </Link>
                </p>
              </div>
            ) : (
              <>
                <div className="mb-6 rounded-[24px] border border-[#E8E8EC] bg-gradient-to-r from-[#FAFAFB] to-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-[#6E6E73]">
                        {isID ? "Peran terpilih" : "Selected role"}
                      </p>
                      <p className="text-sm font-semibold text-[#111827]">
                        {roleLabel}
                      </p>
                    </div>

                    {currentRole !== "admin" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRole(null);
                          setAgreedToPolicies(false);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#D8D8DD] bg-white px-3 py-2 text-xs font-medium text-[#111827] transition hover:bg-[#F8F8FA]"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        {isID ? "Ganti" : "Change"}
                      </button>
                    ) : null}
                  </div>
                </div>

                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSignup();
                  }}
                >
                  <FormInput
                    label={isID ? "Nomor WhatsApp / Telepon" : "WhatsApp / Phone Number"}
                    type="tel"
                    placeholder={
                      isID
                        ? "Contoh: +62 812 3456 7890"
                        : "Example: +62 812 3456 7890"
                    }
                    value={phoneNumber}
                    onChange={setPhoneNumber}
                    autoComplete="tel"
                    inputMode="tel"
                    helperText={
                      isID
                        ? "Wajib diisi. Kami menggunakan nomor ini untuk verifikasi akun, dukungan listing, dan komunikasi inquiry properti."
                        : "Required. We use this for account verification, listing support, and property inquiry communication."
                    }
                  />

                  <FormInput
                    label={isID ? "Nama Lengkap" : "Full Name"}
                    placeholder={
                      isID
                        ? "Masukkan nama lengkap Anda"
                        : "Enter your full name"
                    }
                    value={fullName}
                    onChange={setFullName}
                    autoComplete="name"
                  />

                  <FormInput
                    label={
                      isID
                        ? "Email (untuk daftar dengan email)"
                        : "Email (for email signup)"
                    }
                    type="email"
                    placeholder={isID ? "Masukkan email Anda" : "Enter your email"}
                    value={email}
                    onChange={setEmail}
                    autoComplete="email"
                    inputMode="email"
                  />

                  <FormInput
                    label={
                      isID
                        ? "Kata Sandi (untuk daftar dengan email)"
                        : "Password (for email signup)"
                    }
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

                  <PolicyAgreement
                    isID={isID}
                    checked={agreedToPolicies}
                    onChange={setAgreedToPolicies}
                  />

                  <button
                    type="submit"
                    disabled={signupDisabled}
                    className="w-full rounded-2xl bg-[#111827] px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
                  >
                    {loading && !socialLoading
                      ? isID
                        ? "Sedang membuat akun..."
                        : "Creating account..."
                      : isID
                      ? "Buat Akun dengan Email"
                      : "Create Account with Email"}
                  </button>
                </form>

                {!isAdminSignup ? (
                  <>
                    <div className="my-6 flex items-center gap-3">
                      <div className="h-px flex-1 bg-[#E5E5E7]" />
                      <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#6E6E73]">
                        {isID ? "Atau daftar dengan Google" : "Or sign up with Google"}
                      </span>
                      <div className="h-px flex-1 bg-[#E5E5E7]" />
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleOAuthSignup("google")}
                      disabled={signupDisabled}
                      className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#D8D8DD] bg-white px-4 py-3 text-sm font-semibold text-[#111827] transition hover:bg-[#F8F8FA] disabled:opacity-60"
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
                  </>
                ) : null}

                <p className="mt-6 text-center text-sm leading-6 text-[#6E6E73]">
                  {isID ? "Sudah punya akun?" : "Already have an account?"}{" "}
                  <Link
                    href={footerLoginHref}
                    className="font-semibold text-[#111827] underline underline-offset-4"
                  >
                    {isID ? "Masuk" : "Log in"}
                  </Link>
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}