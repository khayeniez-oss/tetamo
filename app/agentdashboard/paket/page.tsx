"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import { AGENT_PACKAGES } from "@/app/data/pricelist";

type ProfileRow = {
  id: string;
  role: string | null;
  full_name: string | null;
  email: string | null;
};

type AgentPackageUI = (typeof AGENT_PACKAGES)[number] & {
  availableBillingCycles?: Array<"monthly" | "yearly">;
  monthlyPriceIdr?: number;
  monthlyCommitmentMonths?: number;
  monthlyBillingNote?: string;
};

export default function AgentPaketPage() {
  const router = useRouter();
  const { lang } = useLanguage();

  const [loadingPage, setLoadingPage] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const sortedPackages = useMemo(() => {
    return ([...AGENT_PACKAGES] as AgentPackageUI[]).sort(
      (a, b) => a.priceIdr - b.priceIdr
    );
  }, []);

  const highestPackageId = sortedPackages[sortedPackages.length - 1]?.id ?? "";

  const [selectedPackageId, setSelectedPackageId] = useState(
    sortedPackages[0]?.id ?? ""
  );

  const selectedPackage =
    sortedPackages.find((pkg) => pkg.id === selectedPackageId) ?? null;

  useEffect(() => {
    let ignore = false;

    async function loadUser() {
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

        const { data: profileRow, error: profileError } = await supabase
          .from("profiles")
          .select("id, role, full_name, email")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          if (!ignore) {
            setErrorMessage(
              profileError.message ||
                (lang === "id"
                  ? "Gagal memuat profil."
                  : "Failed to load profile.")
            );
            setLoadingPage(false);
          }
          return;
        }

        if (!ignore) {
          setProfile((profileRow as ProfileRow) ?? null);
          setLoadingPage(false);
        }
      } catch (error: any) {
        if (!ignore) {
          setErrorMessage(
            error?.message ||
              (lang === "id"
                ? "Gagal memuat halaman."
                : "Failed to load page.")
          );
          setLoadingPage(false);
        }
      }
    }

    loadUser();

    return () => {
      ignore = true;
    };
  }, [lang]);

  function getRecommendedLabel() {
    return lang === "id" ? "Rekomendasi" : "Recommended";
  }

  function getPackageIntro(packageName: string) {
    const name = packageName.toLowerCase();

    if (lang === "id") {
      if (name.includes("silver")) {
        return "Untuk agen yang ingin mulai tampil profesional dengan biaya terjangkau.";
      }
      if (name.includes("gold")) {
        return "Untuk agen aktif yang ingin branding lebih kuat dan visibilitas lebih tinggi.";
      }
      if (name.includes("pro")) {
        return "Untuk agen serius dan agensi yang ingin eksposur premium dan skala lebih besar.";
      }
      return "Pilih paket agen yang paling sesuai dengan kebutuhan bisnis Anda.";
    }

    if (name.includes("silver")) {
      return "For agents who want a professional start at an affordable price.";
    }
    if (name.includes("gold")) {
      return "For active agents who want stronger branding and better visibility.";
    }
    if (name.includes("pro")) {
      return "For serious agents and agencies who want premium exposure and larger scale.";
    }
    return "Choose the package that best fits your business needs.";
  }

  function getBillingLabel(pkg: AgentPackageUI) {
    const available = pkg.availableBillingCycles ?? [pkg.billingCycle];
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

  function getPriceSuffix(pkg: AgentPackageUI) {
    if (lang === "id") {
      return pkg.billingCycle === "monthly" ? "/ bulan" : "/ tahun";
    }
    return pkg.billingCycle === "monthly" ? "/ month" : "/ year";
  }

  function translateFeature(feature: string) {
    if (lang === "id") return feature;

    const map: Record<string, string> = {
      "50 Listing Aktif": "50 Active Listings",
      "100 Listing Aktif": "100 Active Listings",
      "500 Listing Aktif": "500 Active Listings",
      "Membership aktif selama 30 hari": "Membership active for 30 days",
      "Membership aktif selama 1 tahun": "Membership active for 1 year",
      "Website Profil Agen": "Professional Agent Profile Website",
      "Website Profil Agen (Terhubung ke Media Sosial)":
        "Agent Profile Website (Connected to Social Media)",
      "Integrasi Media Sosial": "Social Media Integration",
      "Dashboard Leads": "Leads Dashboard",
      "Jadwal Viewing": "Viewing Schedule",
      "Paket & Tagihan": "Package & Billing",
      "Pembayaran / Receipt": "Payment / Receipt",
      "Analytics / Insights": "Analytics & Insights",
      "Tracking Komisi": "Commission Tracking",
      "Akses Boost & Spotlight": "Access to Boost & Spotlight",
      "1 AI Avatar Video Perkenalan": "1 AI Avatar Introduction Video",
      "3 Listing Unggulan Gratis (90 hari masing-masing)":
        "3 Free Featured Listings (90 days each)",
      "3 Featured Listing Slot": "3 Featured Listing Slots",
      "Visibilitas listing lebih tinggi": "Stronger listing visibility",
      "Penempatan Agen Unggulan": "Featured Agent Placement",
      "Eksposur premium di platform": "Premium exposure across the platform",
      "Slot terbatas (7 agen saja)": "Limited slots (7 agents only)",
      "Tersedia opsi bayar bulanan": "Monthly payment option available",
      "Auto renew aktif secara default": "Auto renew enabled by default",
      "Prioritas Lead dari Buyer, WhatsApp Langsung dari Listing":
        "Priority buyer leads, direct WhatsApp from listing",
      "Optimasi Judul & Deskripsi (SEO Friendly)":
        "Title & Description Optimization (SEO Friendly)",
      "Promosi Featured Listing di Media Sosial TETAMO":
        "Featured Listing Promotion on TETAMO Social Media",
      "Direkomendasikan ke Buyer sesuai Area":
        "Recommended to buyers by area",
      "Support Admin 09.00 – 14.00": "Admin Support 09.00 – 14.00",
    };

    return map[feature] ?? feature;
  }

  async function handleContinue() {
    if (!selectedPackage || submitting) return;

    try {
      setSubmitting(true);
      setErrorMessage("");

      router.push(
        `/agentdashboard/pembayaran?package=${encodeURIComponent(
          selectedPackage.id
        )}&flow=agent-membership`
      );
    } catch (error: any) {
      console.error("Agent package continue error:", error);
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

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#1C1C1E] sm:text-3xl lg:text-4xl">
            {lang === "id" ? "Pilih Paket Agen" : "Choose Agent Package"}
          </h1>

          <p className="mx-auto mt-3 max-w-3xl text-sm leading-6 text-gray-600 sm:text-base sm:leading-7">
            {lang === "id"
              ? "Pilih paket agen yang sesuai dengan kebutuhan Anda. Semua paket berbasis listing aktif dan dapat diperpanjang otomatis dari dashboard."
              : "Choose the agent package that fits your needs. All packages are based on active listings and can auto renew from the dashboard."}
          </p>

          {profile?.full_name ? (
            <p className="mt-3 text-xs text-gray-500 sm:text-sm">
              {lang === "id"
                ? `Login sebagai ${profile.full_name}`
                : `Logged in as ${profile.full_name}`}
            </p>
          ) : null}
        </div>

        {loadingPage ? (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 text-center text-sm text-gray-500 shadow-sm sm:mt-10 sm:p-8">
            {lang === "id" ? "Memuat..." : "Loading..."}
          </div>
        ) : errorMessage ? (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:mt-10 sm:p-6">
            {errorMessage}
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5 lg:gap-6">
              {sortedPackages.map((pkg) => {
                const checked = selectedPackageId === pkg.id;
                const isRecommended = pkg.id === highestPackageId;

                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedPackageId(pkg.id)}
                    className={[
                      "relative flex h-full flex-col rounded-3xl border bg-white p-4 text-left shadow-sm transition sm:p-5 lg:p-6",
                      checked
                        ? "border-[#1C1C1E] ring-1 ring-[#1C1C1E]"
                        : "border-gray-200 hover:border-gray-300",
                    ].join(" ")}
                  >
                    {isRecommended ? (
                      <div className="absolute right-3 top-3 rounded-full bg-[#1C1C1E] px-2.5 py-1 text-[10px] font-semibold text-white sm:right-4 sm:top-4 sm:px-3 sm:text-xs">
                        {getRecommendedLabel()}
                      </div>
                    ) : null}

                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 pr-14 sm:pr-16">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 shrink-0 text-yellow-500 sm:h-5 sm:w-5" />
                          <h3 className="truncate text-lg font-semibold text-[#1C1C1E] sm:text-xl lg:text-2xl">
                            {pkg.name}
                          </h3>
                        </div>

                        <p className="mt-2 text-xs font-medium text-gray-500 sm:text-sm">
                          {getBillingLabel(pkg)}
                        </p>

                        <p className="mt-3 text-xs leading-6 text-gray-600 sm:text-sm sm:leading-7">
                          {getPackageIntro(pkg.name)}
                        </p>
                      </div>

                      <div
                        className={[
                          "mt-1 h-5 w-5 shrink-0 rounded-full border-2 transition sm:h-6 sm:w-6",
                          checked
                            ? "border-[#1C1C1E] bg-[#1C1C1E]"
                            : "border-gray-400 bg-white",
                        ].join(" ")}
                      />
                    </div>

                    <div className="mt-5">
                      <div className="text-2xl font-bold tracking-tight text-[#1C1C1E] sm:text-3xl lg:text-4xl">
                        Rp {pkg.priceIdr.toLocaleString("id-ID")}
                      </div>

                      <div className="mt-1 text-xs text-gray-600 sm:text-sm lg:text-base">
                        {getPriceSuffix(pkg)}
                      </div>

                      {pkg.monthlyPriceIdr ? (
                        <p className="mt-3 text-xs leading-6 text-gray-500 sm:text-sm sm:leading-6">
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

                    <ul className="mt-5 flex-1 space-y-3 text-gray-700">
                      {pkg.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 sm:gap-3">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600 sm:h-5 sm:w-5" />
                          <span className="text-xs leading-6 sm:text-sm sm:leading-7 lg:text-[15px]">
                            {translateFeature(feature)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:gap-4">
              <button
                type="button"
                onClick={handleContinue}
                disabled={!selectedPackage || submitting}
                className="rounded-xl bg-[#1C1C1E] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60 sm:px-8"
              >
                {submitting
                  ? lang === "id"
                    ? "Memproses..."
                    : "Processing..."
                  : lang === "id"
                  ? "Lanjut ke Pembayaran"
                  : "Continue to Payment"}
              </button>

              <p className="text-center text-xs text-gray-500 sm:text-sm">
                {selectedPackage
                  ? lang === "id"
                    ? `Paket terpilih: ${selectedPackage.name}`
                    : `Selected package: ${selectedPackage.name}`
                  : ""}
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}