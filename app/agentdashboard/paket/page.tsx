"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, CheckCircle2 } from "lucide-react";
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
  if (pkg.priceIdr && pkg.priceIdr > 0) cycles.add(pkg.billingCycle || "yearly");

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

export default function AgentPaketPage() {
  const router = useRouter();
  const { lang } = useLanguage();

  const [loadingPage, setLoadingPage] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const sortedPackages = useMemo(() => {
    return ([...AGENT_PACKAGES] as AgentPackageUI[]).sort((a, b) => {
      const aContact = isContactPackage(a);
      const bContact = isContactPackage(b);

      if (aContact && !bContact) return 1;
      if (!aContact && bContact) return -1;

      return Number(a.priceIdr || 0) - Number(b.priceIdr || 0);
    });
  }, []);

  const highestPaidPackageId =
    [...sortedPackages]
      .filter((pkg) => !isContactPackage(pkg))
      .sort((a, b) => Number(b.priceIdr || 0) - Number(a.priceIdr || 0))[0]
      ?.id ?? "";

  const [selectedPackageId, setSelectedPackageId] = useState(
    sortedPackages[0]?.id ?? ""
  );

  const selectedPackage =
    sortedPackages.find((pkg) => pkg.id === selectedPackageId) ?? null;

  const [selectedBillingCycle, setSelectedBillingCycle] =
    useState<BillingCycle>(() => getDefaultBillingCycle(selectedPackage));

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

  function getContactLabel() {
    return lang === "id" ? "Hubungi Kami" : "Contact Us";
  }

  function getPackageIntro(packageName: string) {
    const name = packageName.toLowerCase();

    if (lang === "id") {
      if (name.includes("starter")) {
        return "Untuk agen yang ingin mulai listing aktif dengan biaya bulanan yang ringan.";
      }

      if (name.includes("silver")) {
        return "Untuk agen yang ingin tampil profesional dengan kapasitas listing lebih besar.";
      }

      if (name.includes("gold")) {
        return "Untuk agen aktif dan agensi kecil yang ingin kapasitas listing lebih kuat.";
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
      return "For active agents and small agencies that need stronger listing capacity.";
    }

    if (name.includes("platinum")) {
      return "For larger agencies or custom listing volume needs.";
    }

    return "Choose the package that best fits your business needs.";
  }

  function getBillingLabel(pkg: AgentPackageUI) {
    if (isContactPackage(pkg)) return getContactLabel();

    const available = getAvailableBillingCycles(pkg);
    const hasMonthly = available.includes("monthly");
    const hasYearly = available.includes("yearly");

    if (lang === "id") {
      if (hasMonthly && hasYearly) {
        return "Tahunan • Opsi bayar bulanan tersedia";
      }

      if (hasMonthly) return "Bulanan";
      return "Tahunan";
    }

    if (hasMonthly && hasYearly) {
      return "Yearly • Monthly option available";
    }

    if (hasMonthly) return "Monthly";
    return "Yearly";
  }

  function getPriceSuffix(pkg: AgentPackageUI) {
    if (isContactPackage(pkg)) return "";

    return lang === "id"
      ? pkg.billingCycle === "monthly"
        ? "/ bulan"
        : "/ tahun"
      : pkg.billingCycle === "monthly"
      ? "/ month"
      : "/ year";
  }

  function getBillingCycleLabel(cycle: BillingCycle) {
    if (lang === "id") {
      return cycle === "monthly" ? "Bulanan" : "Tahunan";
    }

    return cycle === "monthly" ? "Monthly" : "Yearly";
  }

  function translateFeature(feature: string) {
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

  function handleSelectPackage(pkg: AgentPackageUI) {
    setSelectedPackageId(pkg.id);
    setSelectedBillingCycle(getDefaultBillingCycle(pkg));
  }

  async function handleContinue() {
    if (!selectedPackage || submitting) return;

    if (selectedPackageIsContact) {
      const subject = encodeURIComponent(
        `Tetamo Agent ${selectedPackage.name} Inquiry`
      );
      const body = encodeURIComponent(
        `Hello Tetamo,\n\nI am interested in the ${selectedPackage.name} agent package.\n\nName: ${
          profile?.full_name || ""
        }\nEmail: ${profile?.email || ""}\n\nPlease send me more details.`
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
                const isRecommended = pkg.id === highestPaidPackageId;
                const contactPackage = isContactPackage(pkg);
                const listingLimit = getListingLimit(pkg);

                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => handleSelectPackage(pkg)}
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

                        {listingLimit > 0 ? (
                          <p className="mt-2 text-xs font-semibold text-[#1C1C1E] sm:text-sm">
                            {lang === "id"
                              ? `${listingLimit} listing aktif`
                              : `${listingLimit} active listings`}
                          </p>
                        ) : null}

                        <p className="mt-3 text-xs leading-6 text-gray-600 sm:text-sm sm:leading-7">
                          {getPackageIntro(pkg.name)}
                        </p>
                      </div>

                      <div
                        className={[
                          "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition sm:h-6 sm:w-6",
                          checked
                            ? "border-[#1C1C1E] bg-[#1C1C1E]"
                            : "border-gray-400 bg-white",
                        ].join(" ")}
                      >
                        {checked ? (
                          <span className="h-2 w-2 rounded-full bg-white" />
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="text-2xl font-bold tracking-tight text-[#1C1C1E] sm:text-3xl lg:text-4xl">
                        {contactPackage
                          ? getContactLabel()
                          : formatIdr(pkg.priceIdr)}
                      </div>

                      {!contactPackage ? (
                        <div className="mt-1 text-xs text-gray-600 sm:text-sm lg:text-base">
                          {getPriceSuffix(pkg)}
                        </div>
                      ) : null}

                      {!contactPackage && pkg.monthlyPriceIdr ? (
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
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 sm:gap-3"
                        >
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

            {selectedPackage &&
            !selectedPackageIsContact &&
            selectedAvailableBillingCycles.length > 1 ? (
              <div className="mx-auto mt-6 max-w-xl rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                <p className="text-center text-sm font-semibold text-[#1C1C1E]">
                  {lang === "id"
                    ? "Pilih cara pembayaran"
                    : "Choose billing option"}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
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
                            ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                            : "border-gray-200 bg-white text-[#1C1C1E] hover:bg-gray-50",
                        ].join(" ")}
                      >
                        <div className="text-sm font-semibold">
                          {getBillingCycleLabel(cycle)}
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

                {selectedBillingCycle === "monthly" &&
                selectedPackage.monthlyCommitmentMonths ? (
                  <p className="mt-3 text-center text-xs leading-5 text-gray-500">
                    {lang === "id"
                      ? `Pembayaran bulanan berlaku dengan komitmen ${selectedPackage.monthlyCommitmentMonths} bulan.`
                      : `Monthly billing applies with a ${selectedPackage.monthlyCommitmentMonths}-month commitment.`}
                  </p>
                ) : null}
              </div>
            ) : null}

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
                  : selectedPackageIsContact
                  ? getContactLabel()
                  : lang === "id"
                  ? "Lanjut ke Pembayaran"
                  : "Continue to Payment"}
              </button>

              <p className="text-center text-xs text-gray-500 sm:text-sm">
                {selectedPackage
                  ? selectedPackageIsContact
                    ? lang === "id"
                      ? `Paket terpilih: ${selectedPackage.name}`
                      : `Selected package: ${selectedPackage.name}`
                    : lang === "id"
                    ? `Paket terpilih: ${
                        selectedPackage.name
                      } • ${getBillingCycleLabel(
                        selectedBillingCycle
                      )} • ${formatIdr(selectedPrice)}${
                        selectedListingLimit > 0
                          ? ` • ${selectedListingLimit} listing aktif`
                          : ""
                      }`
                    : `Selected package: ${
                        selectedPackage.name
                      } • ${getBillingCycleLabel(
                        selectedBillingCycle
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