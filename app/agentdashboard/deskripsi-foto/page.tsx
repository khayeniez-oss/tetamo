"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, PackageCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAgentListingDraft } from "@/app/agentdashboard/AgentListingDraftContext";
import ListingFoto from "@/components/listing/ListingFoto";

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
  created_at: string | null;
};

type PropertySlotRow = {
  id: string;
  status: string | null;
  source: string | null;
  listing_expires_at: string | null;
  transaction_status: string | null;
};

type AgentAccessResult = {
  user: any | null;
  activeMembership: AgentMembershipRow | null;
  usedSlots: number;
  listingLimit: number;
  remainingSlots: number;
  canCreateListing: boolean;
  authFailed: boolean;
};

function cleanText(value: any) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function cleanNumber(value: any) {
  if (value === null || value === undefined) return null;

  const raw = String(value).replace(/[^\d]/g, "");
  if (!raw) return null;

  const parsed = Number(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

function generateListingKode() {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `TTM-${year}-${random}`;
}

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

async function getAgentAccess(): Promise<AgentAccessResult> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      user: null,
      activeMembership: null,
      usedSlots: 0,
      listingLimit: 0,
      remainingSlots: 0,
      canCreateListing: false,
      authFailed: true,
    };
  }

  const [membershipsRes, propertiesRes] = await Promise.all([
    supabase
      .from("agent_memberships")
      .select(
        "id, user_id, package_id, package_name, billing_cycle, listing_limit, status, expires_at, metadata, created_at"
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

  if (membershipsRes.error) {
    throw membershipsRes.error;
  }

  if (propertiesRes.error) {
    throw propertiesRes.error;
  }

  const membershipRows = (membershipsRes.data || []) as AgentMembershipRow[];
  const propertyRows = (propertiesRes.data || []) as PropertySlotRow[];

  const activeMembership =
    membershipRows.find((membership) => isMembershipActive(membership)) || null;

  const usedSlots = propertyRows.filter(isListingSlotUsed).length;
  const listingLimit = getMembershipListingLimit(activeMembership);
  const remainingSlots = Math.max(listingLimit - usedSlots, 0);

  return {
    user,
    activeMembership,
    usedSlots,
    listingLimit,
    remainingSlots,
    canCreateListing:
      Boolean(activeMembership) && listingLimit > 0 && remainingSlots > 0,
    authFailed: false,
  };
}

export default function AgentDeskripsiFotoPage() {
  const router = useRouter();
  const { draft, setDraft, clearDraft } = useAgentListingDraft();

  const [saving, setSaving] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [accessError, setAccessError] = useState("");
  const [activeMembership, setActiveMembership] =
    useState<AgentMembershipRow | null>(null);
  const [usedSlots, setUsedSlots] = useState(0);
  const [listingLimit, setListingLimit] = useState(0);
  const [remainingSlots, setRemainingSlots] = useState(0);

  useEffect(() => {
    setDraft((prev) => ({
      ...(prev || {}),
      mode: "create",
      source: "agent",
    }));
  }, [setDraft]);

  useEffect(() => {
    let ignore = false;

    async function checkAccess() {
      setCheckingAccess(true);
      setAccessError("");

      try {
        const access = await getAgentAccess();

        if (ignore) return;

        if (access.authFailed) {
          router.push("/login?next=/agentdashboard/deskripsi-foto");
          return;
        }

        setActiveMembership(access.activeMembership);
        setUsedSlots(access.usedSlots);
        setListingLimit(access.listingLimit);
        setRemainingSlots(access.remainingSlots);
        setCheckingAccess(false);
      } catch (error: any) {
        if (!ignore) {
          setAccessError(error?.message || "Gagal memeriksa paket agen.");
          setCheckingAccess(false);
        }
      }
    }

    checkAccess();

    return () => {
      ignore = true;
    };
  }, [router]);

  function onBack() {
    router.push("/agentdashboard/propertidetail");
  }

  async function onNext() {
    if (saving) return;

    try {
      setSaving(true);

      const access = await getAgentAccess();

      if (access.authFailed || !access.user) {
        alert("Please log in first.");
        router.push("/login?next=/agentdashboard/deskripsi-foto");
        return;
      }

      if (!access.activeMembership) {
        alert("Paket agen belum aktif. Silakan pilih paket terlebih dahulu.");
        router.push("/agentdashboard/paket");
        return;
      }

      if (access.listingLimit <= 0) {
        alert("Paket Anda belum memiliki limit listing aktif.");
        router.push("/agentdashboard/paket");
        return;
      }

      if (access.remainingSlots <= 0) {
        alert(
          "Limit listing aktif Anda sudah penuh. Tandai listing sebagai sold/rented atau upgrade paket untuk menambah listing."
        );
        router.push("/agentdashboard/listing-saya");
        return;
      }

      const user = access.user;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, phone, agency, role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      const kode = draft?.kode || generateListingKode();

      const photos = Array.isArray(draft?.photos)
        ? draft.photos.filter(Boolean)
        : [];

      const coverIndex =
        typeof draft?.coverIndex === "number" ? draft.coverIndex : 0;

      const coverImageUrl = photos[coverIndex] || photos[0] || null;

      const insertPayload: Record<string, any> = {
        user_id: user.id,
        created_by_user_id: user.id,

        source: "agent",

        // Agent listing should not go live immediately.
        status: "pending_approval",
        verification_status: "pending_verification",
        verified_ok: false,

        kode,
        posted_date: new Date().toISOString(),

        listing_type: cleanText(draft?.listingType),
        rental_type: cleanText(draft?.rentalType),
        property_type: cleanText(draft?.propertyType),
        market_type: cleanText(draft?.marketType),

        title: cleanText(draft?.title),
        title_id: cleanText((draft as any)?.title_id),

        description: cleanText(draft?.description),
        description_id: cleanText((draft as any)?.description_id),

        price: cleanNumber(draft?.price),

        address: cleanText(draft?.address),
        province: cleanText(draft?.province),
        city: cleanText(draft?.city),
        area:
          cleanText(draft?.customHousing) ||
          cleanText(draft?.housingName) ||
          cleanText(draft?.city),

        housing_name: cleanText(draft?.housingName),
        custom_housing: cleanText(draft?.customHousing),
        location_note: cleanText(draft?.note),

        land_size: cleanNumber(draft?.lt),
        building_size: cleanNumber(draft?.lb),
        bedrooms: cleanNumber(draft?.bed),
        bathrooms: cleanNumber(draft?.bath),
        maid_room: cleanNumber(draft?.maid),
        garage: cleanNumber(draft?.garage),
        floor: cleanNumber(draft?.floor),

        furnishing: cleanText(draft?.furnishing),
        electricity: cleanNumber(draft?.listrik),
        water_type: cleanText(draft?.jenisAir),

        certificate: cleanText(draft?.sertifikat),
        land_type: cleanText(draft?.jenisTanah),
        zoning_type: cleanText(draft?.jenisZoning),
        ownership_type: cleanText(draft?.jenisKepemilikan),

        facilities: draft?.fasilitas ?? {},
        nearby: draft?.nearby ?? {},

        video_url: cleanText(draft?.video),
        cover_image_url: coverImageUrl,

        transaction_status: "available",
        is_paused: false,
        boost_active: false,
        spotlight_active: false,

        contact_user_id: user.id,
        contact_name: cleanText(profile?.full_name),
        contact_phone: cleanText(profile?.phone),
        contact_role: "agent",
        contact_agency: cleanText(profile?.agency),
      };

      const { data: insertedProperty, error: insertError } = await supabase
        .from("properties")
        .insert(insertPayload as any)
        .select("id, kode")
        .single();

      if (insertError) {
        throw insertError;
      }

      if (photos.length > 0) {
        const imageRows = photos.map((url: string, index: number) => ({
          property_id: insertedProperty.id,
          image_url: url,
          sort_order: index,
          is_cover: index === coverIndex,
        }));

        const { error: imageInsertError } = await supabase
          .from("property_images")
          .insert(imageRows);

        if (imageInsertError) {
          throw imageInsertError;
        }
      }

      clearDraft();

      router.push(
        `/agentdashboard/sukses?type=submitted-for-approval&kode=${encodeURIComponent(
          insertedProperty.kode
        )}`
      );
    } catch (error: any) {
      console.error("Agent create listing error:", error);
      alert(error?.message || "Failed to create listing.");
    } finally {
      setSaving(false);
    }
  }

  const canCreateListing =
    Boolean(activeMembership) && listingLimit > 0 && remainingSlots > 0;

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
                    ? "Untuk submit listing, Anda perlu mengaktifkan paket agen terlebih dahulu."
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
      <ListingFoto
        draft={{
          ...(draft || {}),
          mode: "create",
          source: "agent",
        }}
        setDraft={setDraft}
        onBack={onBack}
        onNext={onNext}
      />
    </main>
  );
}