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

export default function AgentPaketPage() {
  const router = useRouter();
  const { lang } = useLanguage();

  const [loadingPage, setLoadingPage] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const sortedPackages = useMemo(() => {
    return [...AGENT_PACKAGES].sort((a, b) => {
      if (a.billingCycle === "monthly" && b.billingCycle === "yearly") return -1;
      if (a.billingCycle === "yearly" && b.billingCycle === "monthly") return 1;
      return a.priceIdr - b.priceIdr;
    });
  }, []);

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
            setErrorMessage("Please login first.");
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
            setErrorMessage(profileError.message || "Failed to load profile.");
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
          setErrorMessage(error?.message || "Failed to load page.");
          setLoadingPage(false);
        }
      }
    }

    loadUser();

    return () => {
      ignore = true;
    };
  }, []);

  function getBillingLabel(cycle: "monthly" | "yearly") {
    if (lang === "id") {
      return cycle === "monthly" ? "Bulanan" : "Tahunan";
    }
    return cycle === "monthly" ? "Monthly" : "Yearly";
  }

  function getDurationLabel(cycle: "monthly" | "yearly") {
    if (lang === "id") {
      return cycle === "monthly" ? "/ bulan" : "/ tahun";
    }
    return cycle === "monthly" ? "/ month" : "/ year";
  }

  function translateFeature(feature: string) {
    if (lang === "id") return feature;

    const map: Record<string, string> = {
      "100 Listing Aktif": "100 Active Listings",
      "Membership aktif selama 30 hari": "Membership active for 30 days",
      "Membership aktif selama 1 tahun": "Membership active for 1 year",
      "Website Profil Agen (Terhubung ke Media Sosial)":
        "Agent Profile Website (Connected to Social Media)",
      "1 AI Avatar Video Perkenalan": "1 AI Avatar Introduction Video",
      "3 Featured Listing Slot": "3 Featured Listing Slots",
      "Prioritas Lead dari Buyer, WhatsApp Langsung dari Listing":
        "Priority buyer leads, direct WhatsApp from listing",
      "Optimasi Judul & Deskripsi (SEO Friendly)":
        "Title & Description Optimization (SEO Friendly)",
      "Promosi Featured Listing di Media Sosial TETAMO":
        "Featured Listing Promotion on TETAMO Social Media",
      "Direkomendasikan ke Buyer sesuai Area":
        "Recommended to Buyers by Area",
      "Support Admin 09.00 – 14.00": "Admin Support 09.00 – 14.00",
      "Auto renew aktif secara default": "Auto renew enabled by default",
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
        error?.message || "Failed to continue to payment. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-[#1C1C1E]">
            {lang === "id" ? "Pilih Paket Agen" : "Choose Agent Package"}
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-gray-600">
            {lang === "id"
              ? "Pilih paket membership agen yang sesuai dengan kebutuhan Anda. Setelah itu langsung lanjut ke pembayaran."
              : "Choose the agent membership package that fits your needs, then continue directly to payment."}
          </p>

          {profile?.full_name ? (
            <p className="mt-3 text-sm text-gray-500">
              {lang === "id"
                ? `Login sebagai ${profile.full_name}`
                : `Logged in as ${profile.full_name}`}
            </p>
          ) : null}
        </div>

        {loadingPage ? (
          <div className="mt-12 rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">
            Loading...
          </div>
        ) : errorMessage ? (
          <div className="mt-12 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : (
          <>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {sortedPackages.map((pkg) => {
                const checked = selectedPackageId === pkg.id;

                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedPackageId(pkg.id)}
                    className={[
                      "rounded-2xl border bg-white p-7 text-left shadow-sm transition",
                      checked
                        ? "border-[#1C1C1E] ring-1 ring-[#1C1C1E]"
                        : "border-gray-200 hover:border-gray-300",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-yellow-500" />
                        <div>
                          <h3 className="text-2xl font-semibold text-[#1C1C1E]">
                            {lang === "id" ? "Property Agent" : "Property Agent"}
                          </h3>
                          <p className="mt-1 text-sm font-medium text-gray-500">
                            {getBillingLabel(pkg.billingCycle)}
                          </p>
                        </div>
                      </div>

                      <div
                        className={[
                          "mt-1 h-6 w-6 rounded-full border-2 transition",
                          checked
                            ? "border-[#1C1C1E] bg-[#1C1C1E]"
                            : "border-gray-400 bg-white",
                        ].join(" ")}
                      />
                    </div>

                    <div className="mt-6">
                      <div className="text-5xl font-bold tracking-tight text-[#1C1C1E]">
                        Rp {pkg.priceIdr.toLocaleString("id-ID")}
                      </div>
                      <div className="mt-2 text-lg text-gray-600">
                        {getDurationLabel(pkg.billingCycle)}
                      </div>
                    </div>

                    <ul className="mt-8 space-y-4 text-gray-700">
                      {pkg.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                          <span className="text-base leading-8">
                            {translateFeature(feature)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            <div className="mt-10 flex flex-col items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleContinue}
                disabled={!selectedPackage || submitting}
                className="rounded-xl bg-[#1C1C1E] px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
              >
                {submitting
                  ? lang === "id"
                    ? "Memproses..."
                    : "Processing..."
                  : lang === "id"
                  ? "Lanjut ke Pembayaran"
                  : "Continue to Payment"}
              </button>

              <p className="text-sm text-gray-500">
                {selectedPackage
                  ? lang === "id"
                    ? `Paket terpilih: ${getBillingLabel(
                        selectedPackage.billingCycle
                      )}`
                    : `Selected package: ${getBillingLabel(
                        selectedPackage.billingCycle
                      )}`
                  : ""}
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}