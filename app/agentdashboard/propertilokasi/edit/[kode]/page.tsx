"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAgentListingDraft } from "@/app/agentdashboard/AgentListingDraftContext";
import ListingIklan from "@/components/listing/ListingIklan";

type DraftRecord = Record<string, unknown>;

type PropertyImageRow = {
  image_url: string | null;
  sort_order: number | null;
  is_cover: boolean | null;
};

function toRecord(value: unknown): DraftRecord {
  if (typeof value === "object" && value !== null) {
    return value as DraftRecord;
  }

  return {};
}

function getString(source: DraftRecord, key: string) {
  const value = source[key];

  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);

  return "";
}

function toInputValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return "Gagal memuat data listing.";
}

export default function AgentEditPropertiLokasiPage() {
  const router = useRouter();
  const params = useParams<{ kode?: string | string[] }>();
  const { draft, setDraft, clearDraft } = useAgentListingDraft();

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const draftRecord = useMemo(() => toRecord(draft), [draft]);

  const draftMode = getString(draftRecord, "mode");
  const draftSource = getString(draftRecord, "source");
  const draftKode = getString(draftRecord, "kode");
  const draftTitleId = draftRecord.title_id;
  const draftDescriptionId = draftRecord.description_id;

  const kode = useMemo(() => {
    const raw = params?.kode;

    if (Array.isArray(raw)) {
      return decodeURIComponent(raw[0] || "");
    }

    return decodeURIComponent(String(raw || ""));
  }, [params]);

  useEffect(() => {
    let isMounted = true;

    async function loadPropertyForEdit() {
      if (!kode) {
        if (!isMounted) return;

        setPageError("Kode listing tidak ditemukan.");
        setLoading(false);
        return;
      }

      const alreadyLoaded =
        draftMode === "edit" &&
        draftSource === "agent" &&
        draftKode === kode &&
        draftTitleId !== undefined &&
        draftDescriptionId !== undefined;

      if (alreadyLoaded) {
        if (!isMounted) return;

        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setPageError("");

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error("Please log in first.");
        }

        const { data: property, error: propertyError } = await supabase
          .from("properties")
          .select("*")
          .eq("kode", kode)
          .eq("source", "agent")
          .eq("user_id", user.id)
          .maybeSingle();

        if (propertyError) {
          throw propertyError;
        }

        if (!property) {
          throw new Error("Listing agent tidak ditemukan.");
        }

        const propertyRecord = toRecord(property);
        const propertyId = getString(propertyRecord, "id");

        const { data: imageRows, error: imageError } = await supabase
          .from("property_images")
          .select("image_url, sort_order, is_cover")
          .eq("property_id", propertyId)
          .order("sort_order", { ascending: true });

        if (imageError) {
          throw imageError;
        }

        const rows = (imageRows || []) as PropertyImageRow[];

        const photos = rows
          .map((item) => item.image_url)
          .filter((url): url is string => Boolean(url));

        const coverIndexFromDb = rows.findIndex((item) =>
          Boolean(item.is_cover)
        );

        const coverIndex = coverIndexFromDb >= 0 ? coverIndexFromDb : 0;

        const nextDraft: DraftRecord = {
          mode: "edit",
          source: "agent",
          plan: undefined,
          payment: undefined,

          propertyId: propertyId,
          kode: getString(propertyRecord, "kode") || kode,

          listingType: getString(propertyRecord, "listing_type"),
          rentalType: getString(propertyRecord, "rental_type"),
          propertyType: getString(propertyRecord, "property_type"),

          title: getString(propertyRecord, "title"),
          title_id: getString(propertyRecord, "title_id"),
          description: getString(propertyRecord, "description"),
          description_id: getString(propertyRecord, "description_id"),

          price: toInputValue(propertyRecord.price),

          address: getString(propertyRecord, "address"),
          province: getString(propertyRecord, "province"),
          city: getString(propertyRecord, "city"),

          housingName: getString(propertyRecord, "housing_name"),
          customHousing: getString(propertyRecord, "custom_housing"),
          note:
            getString(propertyRecord, "location_note") ||
            getString(propertyRecord, "note"),

          lt: toInputValue(
            propertyRecord.land_size ?? propertyRecord.lt
          ),
          lb: toInputValue(
            propertyRecord.building_size ?? propertyRecord.lb
          ),
          bed: toInputValue(
            propertyRecord.bedrooms ?? propertyRecord.bed
          ),
          bath: toInputValue(
            propertyRecord.bathrooms ?? propertyRecord.bath
          ),
          maid: toInputValue(
            propertyRecord.maid_room ?? propertyRecord.maid
          ),
          garage: toInputValue(
            propertyRecord.garage ?? propertyRecord.garages
          ),
          floor: toInputValue(
            propertyRecord.floor ?? propertyRecord.floors
          ),

          furnishing: getString(propertyRecord, "furnishing"),
          listrik: toInputValue(
            propertyRecord.electricity ?? propertyRecord.listrik
          ),
          jenisAir:
            getString(propertyRecord, "water_type") ||
            getString(propertyRecord, "jenis_air"),

          sertifikat:
            getString(propertyRecord, "certificate") ||
            getString(propertyRecord, "sertifikat"),
          jenisTanah:
            getString(propertyRecord, "land_type") ||
            getString(propertyRecord, "jenis_tanah"),
          jenisZoning:
            getString(propertyRecord, "zoning_type") ||
            getString(propertyRecord, "jenis_zoning"),
          jenisKepemilikan:
            getString(propertyRecord, "ownership_type") ||
            getString(propertyRecord, "jenis_kepemilikan"),

          fasilitas: toRecord(
            propertyRecord.facilities ?? propertyRecord.fasilitas
          ),
          nearby: toRecord(propertyRecord.nearby),

          video:
            getString(propertyRecord, "video_url") ||
            getString(propertyRecord, "video"),
          photos,
          coverIndex,
        };

        if (!isMounted) return;

        setDraft((prev) => {
          return {
            ...toRecord(prev),
            ...nextDraft,
          } as never;
        });

        setLoading(false);
      } catch (error) {
        console.error("Agent edit properti lokasi load error:", error);

        if (!isMounted) return;

        setPageError(getErrorMessage(error));
        setLoading(false);
      }
    }

    loadPropertyForEdit();

    return () => {
      isMounted = false;
    };
  }, [
    kode,
    draftMode,
    draftSource,
    draftKode,
    draftTitleId,
    draftDescriptionId,
    setDraft,
  ]);

  const listingDraft = useMemo(
    () => ({
      ...toRecord(draft),
      mode: "edit",
      source: "agent",
      plan: undefined,
      payment: undefined,
    }),
    [draft]
  );

  const handleSetDraft = useCallback(
    (updater: (prev: DraftRecord | null | undefined) => DraftRecord) => {
      setDraft((prev) => {
        const previousDraft = toRecord(prev);
        return updater(previousDraft) as never;
      });
    },
    [setDraft]
  );

  function handleNext() {
    router.push(
      `/agentdashboard/propertidetail/edit/${encodeURIComponent(kode)}`
    );
  }

  function handleReset() {
    clearDraft();
    router.push("/agentdashboard");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-10">
          <div className="text-sm text-gray-500">Loading listing...</div>
        </div>
      </main>
    );
  }

  if (pageError) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-10">
          <div className="w-full rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-[#1C1C1E]">
              Gagal Memuat Listing
            </h1>
            <p className="mt-3 text-sm text-gray-600">{pageError}</p>

            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/agentdashboard")}
                className="rounded-2xl bg-[#1C1C1E] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
              >
                Kembali ke Dashboard
              </button>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-[#1C1C1E] hover:bg-gray-50"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <ListingIklan
        draft={listingDraft}
        setDraft={handleSetDraft}
        onNext={handleNext}
        onReset={handleReset}
      />
    </main>
  );
}