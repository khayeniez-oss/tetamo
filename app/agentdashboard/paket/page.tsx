"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Crown,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import { AGENT_PACKAGES } from "@/app/data/pricelist";

type BillingCycle = "monthly" | "yearly";

type ProfileRow = {
  id: string;
  role: string | null;
  full_name: string | null;
  email: string | null;
};

type AgentMembershipRow = {
  id: string;
  user_id: string | null;
  payment_id: string | null;
  package_id: string | null;
  package_name: string | null;
  billing_cycle: string | null;
  listing_limit: number | null;
  status: string | null;
  auto_renew: boolean | null;
  starts_at: string | null;
  expires_at: string | null;
  metadata: Record<string, any> | null;
  created_at: string | null;
  updated_at: string | null;
};

type AgentPackageUI = (typeof AGENT_PACKAGES)[number] & {
  availableBillingCycles?: BillingCycle[];
  monthlyPriceIdr?: number;
  monthlyCommitmentMonths?: number;
  monthlyBillingNote?: string;
  listingLimit?: number;
  activeListings?: number;
};

function formatIdr(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatDate(value: string | null, lang: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function isMembershipActive(membership: AgentMembershipRow | null) {
  if (!membership) return false;
  if (membership.status !== "active") return false;

  if (!membership.expires_at) return true;

  const expiresAt = new Date(membership.expires_at);
  if (Number.isNaN(expiresAt.getTime())) return true;

  return expiresAt.getTime() >= Date.now();
}

function getMembershipListingLimit(membership: AgentMembershipRow | null) {
  if (!membership) return 0;

  const direct = Number(membership.listing_limit || 0);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const fromMetadata =
    Number(membership.metadata?.listing_limit || 0) ||
    Number(membership.metadata?.listingLimit || 0) ||
    Number(membership.metadata?.active_listing_limit || 0) ||
    Number(membership.metadata?.activeListingLimit || 0);

  if (Number.isFinite(fromMetadata) && fromMetadata > 0) return fromMetadata;

  return 0;
}

function isContactPackage(pkg: AgentPackageUI) {
  const name = String(pkg.name || "").toLowerCase();
  const billingCycle = String(pkg.billingCycle || "").toLowerCase();

  return (
    Number(pkg.priceIdr || 0) <= 0 ||
    name.includes("platinum") ||
    name.includes("custom") ||
    name.includes("contact") ||
    billingCycle.includes("contact")
  );
}

function getListingLimit(pkg: AgentPackageUI) {
  const directLimit =
    Number(pkg.listingLimit || 0) || Number(pkg.activeListings || 0);

  if (directLimit > 0) return directLimit;

  const featureText = (pkg.features || []).join(" ");
  const match = featureText.match(/(\d+)\s*(Listing|Listings)/i);

  if (match?.[1]) return Number(match[1]);

  return 0;
}

function getAvailableBillingCycles(pkg: AgentPackageUI): BillingCycle[] {
  if (isContactPackage(pkg)) return [];

  const available = pkg.availableBillingCycles || [];
  const cycles = new Set<BillingCycle>();

  available.forEach((cycle) => cycles.add(cycle));

  if (pkg.billingCycle === "monthly") cycles.add("monthly");
  if (pkg.billingCycle === "yearly") cycles.add("yearly");

  if (pkg.monthlyPriceIdr && pkg.monthlyPriceIdr > 0) cycles.add("monthly");
  if (pkg.priceIdr && pkg.priceIdr > 0) {
    cycles.add(pkg.billingCycle === "monthly" ? "monthly" : "yearly");
  }

  if (cycles.size === 0) cycles.add("yearly");

  return Array.from(cycles);
}

function getDefaultBillingCycle(pkg: AgentPackageUI | null): BillingCycle {
  if (!pkg) return "yearly";

  const cycles = getAvailableBillingCycles(pkg);

  if (pkg.billingCycle === "monthly" && cycles.includes("monthly")) {
    return "monthly";
  }

  if (cycles.includes("yearly")) return "yearly";
  return cycles[0] || "yearly";
}

function getCyclePrice(pkg: AgentPackageUI, cycle: BillingCycle) {
  if (cycle === "monthly") {
    if (pkg.monthlyPriceIdr && pkg.monthlyPriceIdr > 0) {
      return pkg.monthlyPriceIdr;
    }

    if (pkg.billingCycle === "monthly") {
      return pkg.priceIdr;
    }

    return Math.ceil(Number(pkg.priceIdr || 0) / 12);
  }

  return Number(pkg.priceIdr || 0);
}

function getBillingCycleLabel(cycle: string | null | undefined, lang: string) {
  const value = String(cycle || "").toLowerCase();

  if (lang === "id") {
    if (value === "monthly") return "Bulanan";
    if (value === "yearly") return "Tahunan";
    return "-";
  }

  if (value === "monthly") return "Monthly";
  if (value === "yearly") return "Yearly";
  return "-";
}

function translateFeature(feature: string, lang: string) {
  if (lang === "id") return feature;

  const map: Record<string, string> = {
    "30 Listing Aktif": "30 Active Listings",
    "100 Listing Aktif": "100 Active Listings",
    "500 Listing Aktif": "500 Active Listings",
    "Membership aktif selama 1 tahun": "Membership active for 1 year",
    "Website Profil Agen": "Agent Profile Website",
    "Integrasi Media Sosial": "Social Media Integration",
    "Dashboard Leads": "Leads Dashboard",
    "Jadwal Viewing": "Viewing Schedule",
    "Paket & Tagihan": "Packages & Billing",
    "Pembayaran / Receipt": "Payments / Receipt",
    "Analytics / Insights": "Analytics / Insights",
    "Tracking Komisi": "Commission Tracking",
    "Akses Boost & Spotlight": "Access to Boost & Spotlight",
    "1 AI Avatar Video Perkenalan": "1 AI Avatar Introduction Video",
    "3 Listing Unggulan Gratis (90 hari masing-masing)":
      "3 Free Featured Listings (90 days each)",
    "Prioritas visibilitas listing": "Listing visibility priority",
    "Eligible untuk penempatan Agen Unggulan":
      "Eligible for Featured Agent placement",
    "Kesempatan eksposur premium di platform":
      "Opportunity for premium platform exposure",
    "Slot Agen Unggulan terbatas (7 agen)":
      "Limited Featured Agent slots (7 agents)",
    "Tersedia opsi bayar bulanan": "Monthly payment option available",
    "Auto renew aktif secara default": "Auto renew enabled by default",
  };

  return map[feature] ?? feature;
}

function getPackageIntro(packageName: string, lang: string) {
  const name = packageName.toLowerCase();

  if (lang === "id") {
    if (name.includes("starter")) {
      return "Untuk agen yang ingin mulai listing aktif dengan biaya bulanan yang ringan.";
    }

    if (name.includes("silver")) {
      return "Untuk agen yang ingin tampil profesional dengan kapasitas listing lebih besar.";
    }

    if (name.includes("gold")) {
      return "Untuk agen aktif dan agensi kecil yang ingin kapasitas listing lebih kuat dan lebih menonjol.";
    }

    if (name.includes("platinum")) {
      return "Untuk agensi besar atau kebutuhan volume listing khusus.";
    }

    return "Pilih paket agen yang paling sesuai dengan kebutuhan bisnis Anda.";
  }

  if (name.includes("starter")) {
    return "For agents who want to start with active listings and a simple monthly plan.";
  }

  if (name.includes("silver")) {
    return "For agents who want a professional start with a larger listing capacity.";
  }

  if (name.includes("gold")) {
    return "For active agents and small agencies who want stronger capacity and better visibility.";
  }

  if (name.includes("platinum")) {
    return "For larger agencies or custom listing volume needs.";
  }

  return "Choose the package that best fits your business needs.";
}

function getBillingLabel(pkg: AgentPackageUI, lang: string) {
  if (isContactPackage(pkg)) {
    return lang === "id" ? "Hubungi Kami" : "Contact Us";
  }

  const available = getAvailableBillingCycles(pkg);
  const hasMonthly = available.includes("monthly");
  const hasYearly = available.includes("yearly");

  if (lang === "id") {
    if (hasMonthly && hasYearly) return "Tahunan • Opsi bayar bulanan tersedia";
    if (hasMonthly) return "Bulanan";
    return "Tahunan";
  }

  if (hasMonthly && hasYearly) return "Yearly • Monthly option available";
  if (hasMonthly) return "Monthly";
  return "Yearly";
}

function getPriceSuffix(pkg: AgentPackageUI, lang: string) {
  if (isContactPackage(pkg)) return "";

  return lang === "id"
    ? pkg.billingCycle === "monthly"
      ? "/ bulan"
      : "/ tahun"
    : pkg.billingCycle === "monthly"
    ? "/ month"
    : "/ year";
}

function getRecommendedPackageId(packages: AgentPackageUI[]) {
  const goldPackage = packages.find((pkg) =>
    String(pkg.name || "").toLowerCase().includes("gold")
  );

  return goldPackage?.id ?? "";
}

export default function AgentPaketPage() {
  const router = useRouter();
  const { lang } = useLanguage();

  const [loadingPage, setLoadingPage] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [memberships, setMemberships] = useState<AgentMembershipRow[]>([]);

  const sortedPackages = useMemo(() => {
    return ([...AGENT_PACKAGES] as AgentPackageUI[]).sort((a, b) => {
      const aContact = isContactPackage(a);
      const bContact = isContactPackage(b);

      if (aContact && !bContact) return 1;
      if (!aContact && bContact) return -1;

      return getListingLimit(a) - getListingLimit(b);
    });
  }, []);

  const recommendedPackageId = useMemo(() => {
    return getRecommendedPackageId(sortedPackages);
  }, [sortedPackages]);

  const initialSelectedPackageId = useMemo(() => {
    return recommendedPackageId || sortedPackages[0]?.id || "";
  }, [recommendedPackageId, sortedPackages]);

  const [selectedPackageId, setSelectedPackageId] = useState(
    initialSelectedPackageId
  );

  const selectedPackage =
    sortedPackages.find((pkg) => pkg.id === selectedPackageId) ?? null;

  const [selectedBillingCycle, setSelectedBillingCycle] =
    useState<BillingCycle>(() => getDefaultBillingCycle(selectedPackage));

  const activeMembership = useMemo(() => {
    return memberships.find((membership) => isMembershipActive(membership)) || null;
  }, [memberships]);

  const activeListingLimit = useMemo(() => {
    return getMembershipListingLimit(activeMembership);
  }, [activeMembership]);

  const selectedPackageIsContact = selectedPackage
    ? isContactPackage(selectedPackage)
    : false;

  const selectedListingLimit = selectedPackage
    ? getListingLimit(selectedPackage)
    : 0;

  const selectedAvailableBillingCycles = selectedPackage
    ? getAvailableBillingCycles(selectedPackage)
    : [];

  const selectedPrice =
    selectedPackage && !selectedPackageIsContact
      ? getCyclePrice(selectedPackage, selectedBillingCycle)
      : 0;

  useEffect(() => {
    if (!selectedPackage) return;

    const available = getAvailableBillingCycles(selectedPackage);

    if (available.length > 0 && !available.includes(selectedBillingCycle)) {
      setSelectedBillingCycle(getDefaultBillingCycle(selectedPackage));
    }
  }, [selectedPackage, selectedBillingCycle]);

  useEffect(() => {
    let ignore = false;

    async function loadUserAndMembership() {
      setLoadingPage(true);
      setErrorMessage("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          if (!ignore) {
            setErrorMessage(
              lang === "id"
                ? "Silakan login terlebih dahulu."
                : "Please login first."
            );
            setLoadingPage(false);
          }
          return;
        }

        const [profileRes, membershipRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, role, full_name, email")
            .eq("id", user.id)
            .maybeSingle(),

          supabase
            .from("agent_memberships")
            .select(
              "id, user_id, payment_id, package_id, package_name, billing_cycle, listing_limit, status, auto_renew, starts_at, expires_at, metadata, created_at, updated_at"
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
        ]);

        if (ignore) return;

        if (profileRes.error) {
          setErrorMessage(
            profileRes.error.message ||
              (lang === "id" ? "Gagal memuat profil." : "Failed to load profile.")
          );
          setLoadingPage(false);
          return;
        }

        if (membershipRes.error) {
          setErrorMessage(
            membershipRes.error.message ||
              (lang === "id"
                ? "Gagal memuat membership."
                : "Failed to load membership.")
          );
          setLoadingPage(false);
          return;
        }

        const profileRow = (profileRes.data as ProfileRow) ?? null;
        const membershipRows = (membershipRes.data || []) as AgentMembershipRow[];

        setProfile(profileRow);
        setMemberships(membershipRows);

        const currentActive =
          membershipRows.find((membership) => isMembershipActive(membership)) ||
          null;

        if (currentActive?.package_id) {
          const matchingPackage = sortedPackages.find(
            (pkg) => pkg.id === currentActive.package_id
          );

          if (matchingPackage) {
            setSelectedPackageId(matchingPackage.id);
            setSelectedBillingCycle(getDefaultBillingCycle(matchingPackage));
          }
        } else {
          setSelectedPackageId(initialSelectedPackageId);
        }

        setLoadingPage(false);
      } catch (error: any) {
        if (!ignore) {
          setErrorMessage(
            error?.message ||
              (lang === "id" ? "Gagal memuat halaman." : "Failed to load page.")
          );
          setLoadingPage(false);
        }
      }
    }

    loadUserAndMembership();

    return () => {
      ignore = true;
    };
  }, [lang, sortedPackages, initialSelectedPackageId]);

  async function handleContinue() {
    if (!selectedPackage || submitting) return;

    if (selectedPackageIsContact) {
      const subject = encodeURIComponent(
        `Tetamo Agent ${selectedPackage.name} Inquiry`
      );
      const body = encodeURIComponent(
        `Hello Tetamo,\n\nI am interested in the ${
          selectedPackage.name
        } agent package.\n\nName: ${profile?.full_name || ""}\nEmail: ${
          profile?.email || ""
        }\n\nPlease send me more details.`
      );

      window.location.href = `mailto:inquiry@tetamo.com?subject=${subject}&body=${body}`;
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");

      router.push(
        `/agentdashboard/pembayaran?package=${encodeURIComponent(
          selectedPackage.id
        )}&billing=${encodeURIComponent(
          selectedBillingCycle
        )}&flow=agent-membership`
      );
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          (lang === "id"
            ? "Gagal melanjutkan ke pembayaran. Silakan coba lagi."
            : "Failed to continue to payment. Please try again.")
      );
    } finally {
      setSubmitting(false);
    }
  }

  const selectedPackageIsCurrent =
    Boolean(activeMembership?.package_id) &&
    Boolean(selectedPackage?.id) &&
    activeMembership?.package_id === selectedPackage?.id;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#FFFDF8_0%,#FFFFFF_42%,#F7FCFA_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="overflow-hidden rounded-[30px] border border-[#E9E5DA] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="relative px-4 py-7 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.10),transparent_28%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_24%),linear-gradient(to_bottom,rgba(255,255,255,0.98),rgba(255,255,255,1))]" />

            <div className="relative text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E8EC] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B7280] shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                {lang === "id" ? "Agent Package" : "Agent Package"}
              </div>

              <h1 className="mt-4 text-2xl font-black tracking-tight text-[#111827] sm:text-3xl lg:text-4xl">
                {lang === "id" ? "Pilih Paket Agen" : "Choose Agent Package"}
              </h1>

              <p className="mx-auto mt-3 max-w-3xl text-sm leading-6 text-gray-600 sm:text-base sm:leading-7">
                {lang === "id"
                  ? "Pilih paket agen yang sesuai dengan kebutuhan Anda. Paket Gold menjadi pilihan rekomendasi untuk pertumbuhan yang lebih seimbang."
                  : "Choose the agent package that fits your needs. Gold is the recommended package for more balanced growth."}
              </p>

              {profile?.full_name ? (
                <p className="mt-3 text-xs text-gray-500 sm:text-sm">
                  {lang === "id"
                    ? `Login sebagai ${profile.full_name}`
                    : `Logged in as ${profile.full_name}`}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {loadingPage ? (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 text-center text-sm text-gray-500 shadow-sm sm:mt-8 sm:p-8">
            {lang === "id" ? "Memuat..." : "Loading..."}
          </div>
        ) : errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:mt-8 sm:p-6">
            {errorMessage}
          </div>
        ) : (
          <>
            {activeMembership ? (
              <div className="mt-6 rounded-[28px] border border-emerald-200 bg-[linear-gradient(180deg,#F3FFF8_0%,#FFFFFF_100%)] p-4 shadow-sm sm:mt-8 sm:p-5 lg:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-white text-emerald-700 shadow-sm">
                      <PackageCheck className="h-6 w-6" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-emerald-800 sm:text-base">
                        {lang === "id"
                          ? "Membership agen aktif"
                          : "Agent membership active"}
                      </p>

                      <h2 className="mt-1 text-lg font-bold text-[#1C1C1E] sm:text-xl">
                        {activeMembership.package_name || "-"}
                      </h2>

                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-emerald-200 bg-white p-3">
                          <p className="flex items-center gap-2 text-xs text-gray-500">
                            <ShieldCheck className="h-4 w-4" />
                            {lang === "id" ? "Limit Listing" : "Listing Limit"}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[#1C1C1E]">
                            {activeListingLimit > 0
                              ? lang === "id"
                                ? `${activeListingLimit} listing aktif`
                                : `${activeListingLimit} active listings`
                              : "-"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-emerald-200 bg-white p-3">
                          <p className="text-xs text-gray-500">
                            {lang === "id" ? "Tipe Tagihan" : "Billing Type"}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[#1C1C1E]">
                            {getBillingCycleLabel(activeMembership.billing_cycle, lang)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-emerald-200 bg-white p-3">
                          <p className="flex items-center gap-2 text-xs text-gray-500">
                            <CalendarDays className="h-4 w-4" />
                            {lang === "id" ? "Expired" : "Expiry"}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[#1C1C1E]">
                            {formatDate(activeMembership.expires_at, lang)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                    <button
                      type="button"
                      onClick={() => router.push("/agentdashboard/listing-saya")}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-[#111827] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 sm:w-auto"
                    >
                      {lang === "id" ? "Lihat Listing Saya" : "View My Listings"}
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push("/agentdashboard/tagihan")}
                      className="inline-flex w-full items-center justify-center rounded-xl border border-emerald-300 bg-white px-5 py-3 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50 sm:w-auto"
                    >
                      {lang === "id" ? "Lihat Tagihan" : "View Billing"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-4 lg:gap-5">
              {sortedPackages.map((pkg) => {
                const checked = selectedPackageId === pkg.id;
                const isRecommended = pkg.id === recommendedPackageId;
                const contactPackage = isContactPackage(pkg);
                const listingLimit = getListingLimit(pkg);
                const isCurrent =
                  activeMembership?.package_id &&
                  activeMembership.package_id === pkg.id;
                const isGold = String(pkg.name || "")
                  .toLowerCase()
                  .includes("gold");

                const baseCardClass = checked
                  ? "border-[#111827] ring-1 ring-[#111827]"
                  : "border-gray-200 hover:border-gray-300";

                const goldCardClass = isGold
                  ? "bg-[linear-gradient(180deg,#FFF9E8_0%,#FFFFFF_100%)] border-amber-300 shadow-[0_24px_60px_rgba(245,158,11,0.18)] md:-translate-y-2"
                  : "bg-white shadow-[0_12px_34px_rgba(15,23,42,0.05)]";

                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => {
                      setSelectedPackageId(pkg.id);
                      setSelectedBillingCycle(getDefaultBillingCycle(pkg));
                    }}
                    className={[
                      "relative flex h-full flex-col overflow-hidden rounded-[28px] border p-4 text-left transition sm:p-5",
                      baseCardClass,
                      goldCardClass,
                    ].join(" ")}
                  >
                    {isGold ? (
                      <>
                        <div className="pointer-events-none absolute -left-10 top-0 h-32 w-32 rounded-full bg-amber-300/30 blur-3xl" />
                        <div className="pointer-events-none absolute -right-8 bottom-10 h-28 w-28 rounded-full bg-yellow-200/30 blur-3xl" />
                      </>
                    ) : null}

                    <div className="relative flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Crown
                            className={`h-4 w-4 shrink-0 ${
                              isGold ? "text-amber-500" : "text-yellow-500"
                            }`}
                          />
                          <h3 className="text-xl font-semibold leading-tight text-[#1C1C1E] sm:text-2xl">
                            {pkg.name}
                          </h3>
                        </div>

                        <p className="mt-1.5 text-xs font-medium text-gray-500 sm:text-sm">
                          {getBillingLabel(pkg, lang)}
                        </p>

                        {listingLimit > 0 ? (
                          <p className="mt-2 text-sm font-semibold leading-6 text-[#1C1C1E] sm:text-base">
                            {lang === "id"
                              ? `${listingLimit} listing aktif`
                              : `${listingLimit} active listings`}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <div
                          className={[
                            "flex h-5 w-5 items-center justify-center rounded-full border-2 transition sm:h-6 sm:w-6",
                            checked
                              ? "border-[#111827] bg-[#111827]"
                              : "border-gray-400 bg-white",
                          ].join(" ")}
                        >
                          {checked ? (
                            <span className="h-2 w-2 rounded-full bg-white" />
                          ) : null}
                        </div>

                        {isCurrent ? (
                          <div className="rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-semibold text-white sm:px-3 sm:text-[11px]">
                            {lang === "id"
                              ? "Paket Saat Ini"
                              : "Current Package"}
                          </div>
                        ) : isRecommended ? (
                          <div className="rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-semibold text-white shadow-[0_8px_24px_rgba(245,158,11,0.3)] sm:px-3 sm:text-[11px]">
                            {lang === "id" ? "Rekomendasi" : "Recommended"}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <p className="relative mt-3 text-xs leading-5 text-gray-600 sm:text-sm sm:leading-6">
                      {getPackageIntro(pkg.name, lang)}
                    </p>

                    <div className="relative mt-4">
                      <div
                        className={`text-[30px] font-bold leading-none tracking-tight sm:text-[36px] ${
                          isGold ? "text-amber-700" : "text-[#111827]"
                        }`}
                      >
                        {contactPackage
                          ? lang === "id"
                            ? "Hubungi Kami"
                            : "Contact Us"
                          : formatIdr(pkg.priceIdr)}
                      </div>

                      {!contactPackage ? (
                        <div className="mt-1 text-sm text-gray-600 sm:text-base">
                          {getPriceSuffix(pkg, lang)}
                        </div>
                      ) : null}

                      {!contactPackage && pkg.monthlyPriceIdr ? (
                        <p className="mt-2 text-xs leading-5 text-gray-500 sm:text-sm sm:leading-6">
                          {lang === "id"
                            ? `Atau Rp ${pkg.monthlyPriceIdr.toLocaleString(
                                "id-ID"
                              )}/bulan dengan komitmen ${
                                pkg.monthlyCommitmentMonths ?? 12
                              } bulan`
                            : `Or Rp ${pkg.monthlyPriceIdr.toLocaleString(
                                "id-ID"
                              )}/month with a ${
                                pkg.monthlyCommitmentMonths ?? 12
                              }-month commitment`}
                        </p>
                      ) : null}
                    </div>

                    <ul className="relative mt-4 flex-1 space-y-2.5 text-gray-700">
                      {pkg.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <CheckCircle2
                            className={`mt-0.5 h-4 w-4 shrink-0 sm:h-4.5 sm:w-4.5 ${
                              isGold ? "text-amber-600" : "text-green-600"
                            }`}
                          />
                          <span className="text-xs leading-5 sm:text-sm sm:leading-6">
                            {translateFeature(feature, lang)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            {selectedPackage &&
            !selectedPackageIsContact &&
            selectedAvailableBillingCycles.length > 1 ? (
              <div className="mx-auto mt-6 max-w-xl rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                <p className="text-center text-sm font-semibold text-[#1C1C1E]">
                  {lang === "id"
                    ? "Pilih cara pembayaran"
                    : "Choose billing option"}
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {selectedAvailableBillingCycles.map((cycle) => {
                    const checked = selectedBillingCycle === cycle;
                    const price = getCyclePrice(selectedPackage, cycle);

                    return (
                      <button
                        key={cycle}
                        type="button"
                        onClick={() => setSelectedBillingCycle(cycle)}
                        className={[
                          "rounded-2xl border px-4 py-3 text-center transition",
                          checked
                            ? "border-[#111827] bg-[#111827] text-white"
                            : "border-gray-200 bg-white text-[#1C1C1E] hover:bg-gray-50",
                        ].join(" ")}
                      >
                        <div className="text-sm font-semibold">
                          {getBillingCycleLabel(cycle, lang)}
                        </div>
                        <div className="mt-1 text-xs opacity-80">
                          {formatIdr(price)}
                          {cycle === "monthly"
                            ? lang === "id"
                              ? " / bulan"
                              : " / month"
                            : lang === "id"
                            ? " / tahun"
                            : " / year"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={handleContinue}
                disabled={!selectedPackage || submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#111827] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60 sm:w-auto sm:px-8"
              >
                {submitting
                  ? lang === "id"
                    ? "Memproses..."
                    : "Processing..."
                  : selectedPackageIsContact
                  ? lang === "id"
                    ? "Hubungi Kami"
                    : "Contact Us"
                  : selectedPackageIsCurrent
                  ? lang === "id"
                    ? "Perpanjang Paket"
                    : "Renew Package"
                  : activeMembership
                  ? lang === "id"
                    ? "Ubah / Upgrade Paket"
                    : "Change / Upgrade Package"
                  : lang === "id"
                  ? "Lanjut ke Pembayaran"
                  : "Continue to Payment"}
                <ArrowRight className="h-4 w-4" />
              </button>

              <p className="max-w-3xl text-center text-xs leading-5 text-gray-500 sm:text-sm">
                {selectedPackage
                  ? selectedPackageIsContact
                    ? lang === "id"
                      ? `Paket terpilih: ${selectedPackage.name}`
                      : `Selected package: ${selectedPackage.name}`
                    : lang === "id"
                    ? `Paket terpilih: ${
                        selectedPackage.name
                      } • ${getBillingCycleLabel(
                        selectedBillingCycle,
                        lang
                      )} • ${formatIdr(selectedPrice)}${
                        selectedListingLimit > 0
                          ? ` • ${selectedListingLimit} listing aktif`
                          : ""
                      }`
                    : `Selected package: ${
                        selectedPackage.name
                      } • ${getBillingCycleLabel(
                        selectedBillingCycle,
                        lang
                      )} • ${formatIdr(selectedPrice)}${
                        selectedListingLimit > 0
                          ? ` • ${selectedListingLimit} active listings`
                          : ""
                      }`
                  : ""}
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}