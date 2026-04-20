"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, PackageCheck } from "lucide-react";
import { useAgentListingDraft } from "@/app/agentdashboard/AgentListingDraftContext";
import ListingForm from "@/components/listing/ListingForm";
import { supabase } from "@/lib/supabase";

type AgentMembershipRow = {
  id: string;
  user_id: string | null;
  package_id: string | null;
  package_name: string | null;
  billing_cycle: string | null;
  listing_limit: number | null;
  status: string | null;
  expires_at: string | null;
  metadata: Record<string, any> | null;
};

type PropertySlotRow = {
  id: string;
  status: string | null;
  source: string | null;
  listing_expires_at: string | null;
  transaction_status: string | null;
};

function isMembershipActive(membership: AgentMembershipRow | null) {
  if (!membership) return false;
  if (membership.status !== "active") return false;

  if (!membership.expires_at) return true;

  const expiresAt = new Date(membership.expires_at);
  if (Number.isNaN(expiresAt.getTime())) return true;

  return expiresAt.getTime() >= new Date().getTime();
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

function isListingSlotUsed(row: PropertySlotRow) {
  if (row.transaction_status === "sold") return false;
  if (row.transaction_status === "rented") return false;
  if (row.status === "rejected") return false;

  if (!row.listing_expires_at) return true;

  const expiresAt = new Date(row.listing_expires_at);
  if (Number.isNaN(expiresAt.getTime())) return true;

  return expiresAt.getTime() >= new Date().getTime();
}

function formatDisplayDate(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function AgentPropertiDetailPage() {
  const router = useRouter();
  const { draft, setDraft } = useAgentListingDraft();

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [accessError, setAccessError] = useState("");
  const [activeMembership, setActiveMembership] =
    useState<AgentMembershipRow | null>(null);
  const [usedSlots, setUsedSlots] = useState(0);

  const inputBase =
    "mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10";

  useEffect(() => {
    setDraft((prev: any) => ({
      ...(prev || {}),
      mode: "create",
      source: "agent",
      plan: undefined,
      payment: undefined,
    }));
  }, [setDraft]);

  useEffect(() => {
    let ignore = false;

    async function checkAgentAccess() {
      setCheckingAccess(true);
      setAccessError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (ignore) return;

        if (authError || !user) {
          router.push("/login?next=/agentdashboard/propertidetail");
          return;
        }

        const [membershipsRes, propertiesRes] = await Promise.all([
          supabase
            .from("agent_memberships")
            .select(
              "id, user_id, package_id, package_name, billing_cycle, listing_limit, status, expires_at, metadata"
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),

          supabase
            .from("properties")
            .select("id, status, source, listing_expires_at, transaction_status")
            .eq("user_id", user.id)
            .eq("source", "agent")
            .or("status.is.null,status.neq.rejected"),
        ]);

        if (ignore) return;

        if (membershipsRes.error) {
          setAccessError(membershipsRes.error.message);
          setCheckingAccess(false);
          return;
        }

        if (propertiesRes.error) {
          setAccessError(propertiesRes.error.message);
          setCheckingAccess(false);
          return;
        }

        const membershipRows = (membershipsRes.data || []) as AgentMembershipRow[];
        const propertyRows = (propertiesRes.data || []) as PropertySlotRow[];

        const currentMembership =
          membershipRows.find((membership) => isMembershipActive(membership)) ||
          null;

        const currentUsedSlots = propertyRows.filter(isListingSlotUsed).length;

        setActiveMembership(currentMembership);
        setUsedSlots(currentUsedSlots);
        setCheckingAccess(false);
      } catch (error: any) {
        if (!ignore) {
          setAccessError(error?.message || "Gagal memeriksa paket agen.");
          setCheckingAccess(false);
        }
      }
    }

    checkAgentAccess();

    return () => {
      ignore = true;
    };
  }, [router]);

  const listingLimit = useMemo(() => {
    return getMembershipListingLimit(activeMembership);
  }, [activeMembership]);

  const remainingSlots = Math.max(listingLimit - usedSlots, 0);

  const canCreateListing =
    Boolean(activeMembership) && listingLimit > 0 && remainingSlots > 0;

  const isValid = useMemo(() => {
    const propertyType = String(draft?.propertyType || "").trim();
    const price = String(draft?.price || "").trim();
    const lt = String(draft?.lt || "").trim();
    const listingType = String(draft?.listingType || "").trim();
    const rentalType = String(draft?.rentalType || "").trim();

    const sertifikat = String(draft?.sertifikat || "").trim();
    const jenisKepemilikan = String(draft?.jenisKepemilikan || "").trim();
    const jenisTanah = String(draft?.jenisTanah || "").trim();
    const jenisZoning = String(draft?.jenisZoning || "").trim();

    const isApartment = ["apartemen", "studio"].includes(propertyType);
    const usesLandSize = !isApartment;
    const requiresRentalType = listingType === "disewa";
    const requiresLandLegal = propertyType === "tanah" && !requiresRentalType;

    const baseValid =
      propertyType.length > 0 &&
      price.length > 0 &&
      (!usesLandSize || lt.length > 0);

    if (!baseValid) return false;

    if (requiresRentalType && rentalType.length === 0) {
      return false;
    }

    if (requiresLandLegal) {
      return (
        sertifikat.length > 0 &&
        jenisKepemilikan.length > 0 &&
        jenisTanah.length > 0 &&
        jenisZoning.length > 0
      );
    }

    return true;
  }, [
    draft?.propertyType,
    draft?.price,
    draft?.lt,
    draft?.listingType,
    draft?.rentalType,
    draft?.sertifikat,
    draft?.jenisKepemilikan,
    draft?.jenisTanah,
    draft?.jenisZoning,
  ]);

  function handleBack() {
    router.push("/agentdashboard/propertilokasi");
  }

  function handleNext() {
    if (!activeMembership) {
      alert("Paket agen belum aktif. Silakan pilih paket terlebih dahulu.");
      router.push("/agentdashboard/paket");
      return;
    }

    if (listingLimit <= 0) {
      alert("Paket Anda belum memiliki limit listing aktif.");
      router.push("/agentdashboard/paket");
      return;
    }

    if (remainingSlots <= 0) {
      alert(
        "Limit listing aktif Anda sudah penuh. Tandai listing sebagai sold/rented atau upgrade paket untuk menambah listing."
      );
      router.push("/agentdashboard/listing-saya");
      return;
    }

    if (!isValid) return;

    router.push("/agentdashboard/deskripsi-foto");
  }

  if (checkingAccess) {
    return (
      <main className="min-h-screen bg-white px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-4xl rounded-3xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
          Memeriksa paket agen...
        </div>
      </main>
    );
  }

  if (accessError) {
    return (
      <main className="min-h-screen bg-white px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-4xl rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Gagal memeriksa akses listing.</p>
              <p className="mt-1 leading-6">{accessError}</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!canCreateListing) {
    return (
      <main className="min-h-screen bg-white px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-50 text-yellow-700">
                <PackageCheck className="h-6 w-6" />
              </div>

              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold text-[#1C1C1E] sm:text-2xl">
                  {!activeMembership
                    ? "Paket agen belum aktif"
                    : "Limit listing aktif sudah penuh"}
                </h1>

                <p className="mt-2 text-sm leading-6 text-gray-600 sm:text-base">
                  {!activeMembership
                    ? "Untuk melanjutkan detail listing, Anda perlu mengaktifkan paket agen terlebih dahulu."
                    : "Anda sudah menggunakan semua slot listing aktif dalam paket Anda. Listing yang sudah sold/rented dapat diganti dengan listing baru."}
                </p>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs text-gray-500">Paket</p>
                    <p className="mt-1 text-sm font-semibold text-[#1C1C1E]">
                      {activeMembership?.package_name || "-"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs text-gray-500">Limit Listing</p>
                    <p className="mt-1 text-sm font-semibold text-[#1C1C1E]">
                      {listingLimit > 0 ? `${usedSlots}/${listingLimit}` : "-"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs text-gray-500">Expired</p>
                    <p className="mt-1 text-sm font-semibold text-[#1C1C1E]">
                      {formatDisplayDate(activeMembership?.expires_at || null)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => router.push("/agentdashboard/paket")}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-[#1C1C1E] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 sm:w-auto"
                  >
                    {!activeMembership ? "Pilih Paket" : "Upgrade Paket"}
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/agentdashboard/listing-saya")}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-[#1C1C1E] shadow-sm hover:bg-gray-50 sm:w-auto"
                  >
                    Kembali ke Listing Saya
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <ListingForm
        draft={{
          ...(draft || {}),
          mode: "create",
          source: "agent",
          plan: undefined,
          payment: undefined,
        }}
        setDraft={setDraft}
        inputBase={inputBase}
        isValid={isValid}
        onBack={handleBack}
        onNext={handleNext}
        showPackageBadge={false}
      />
    </main>
  );
}