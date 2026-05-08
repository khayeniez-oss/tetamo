"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  usePemilikDraftListing,
  type PemilikListingDraft,
  type PemilikPlanType,
} from "../../layout";
import ListingIklan from "@/components/listing/ListingIklan";

type PropertyImageRow = {
  image_url: string;
  sort_order: number | null;
  is_cover: boolean | null;
};

type DraftRecord = Record<string, unknown>;

function toRecord(value: unknown): DraftRecord {
  if (typeof value === "object" && value !== null) {
    return value as DraftRecord;
  }

  return {};
}

function stringFrom(...values: unknown[]) {
  for (const value of values) {
    if (value !== null && value !== undefined) {
      return String(value);
    }
  }

  return "";
}

function optionalStringFrom(...values: unknown[]) {
  const value = stringFrom(...values);
  return value || undefined;
}

function normalizeOwnerPlanId(
  planId?: string | null
): PemilikPlanType | undefined {
  const value = String(planId || "")
    .trim()
    .toLowerCase();

  if (value === "featured") return "featured";
  if (value === "priority") return "priority";
  if (value === "basic") return "basic";

  return undefined;
}

export default function PemilikIklanEditPage() {
  const router = useRouter();
  const params = useParams<{ kode: string }>();

  const kode = params?.kode ? String(params.kode) : "";
  const { draft, setDraft } = usePemilikDraftListing();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadListing() {
      if (!kode) {
        if (!ignore) {
          setErrorMessage("Kode listing tidak ditemukan.");
          setLoading(false);
        }

        return;
      }

      const draftRecord = toRecord(draft);

      const hasBilingualDraftFields =
        draftRecord.title_id !== undefined &&
        draftRecord.description_id !== undefined;

      if (
        draft?.mode === "edit" &&
        draft?.kode === kode &&
        hasBilingualDraftFields &&
        (draft?.title !== undefined ||
          draft?.address !== undefined ||
          draft?.photos !== undefined)
      ) {
        if (!ignore) {
          setLoading(false);
        }

        return;
      }

      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        if (!ignore) {
          setErrorMessage("Silakan login terlebih dahulu.");
          setLoading(false);
        }

        return;
      }

      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .select("*")
        .eq("kode", kode)
        .eq("user_id", user.id)
        .maybeSingle();

      if (propertyError) {
        if (!ignore) {
          setErrorMessage(propertyError.message || "Gagal memuat listing.");
          setLoading(false);
        }

        return;
      }

      if (!property) {
        if (!ignore) {
          setErrorMessage("Listing tidak ditemukan.");
          setLoading(false);
        }

        return;
      }

      const propertyRecord = toRecord(property);
      const propertyId = stringFrom(propertyRecord.id);

      if (!propertyId) {
        if (!ignore) {
          setErrorMessage("ID listing tidak ditemukan.");
          setLoading(false);
        }

        return;
      }

      const { data: imageRows, error: imageError } = await supabase
        .from("property_images")
        .select("image_url, sort_order, is_cover")
        .eq("property_id", propertyId)
        .order("sort_order", { ascending: true });

      if (imageError) {
        if (!ignore) {
          setErrorMessage(imageError.message || "Gagal memuat foto listing.");
          setLoading(false);
        }

        return;
      }

      const images = ((imageRows || []) as PropertyImageRow[]).sort((a, b) => {
        const coverA = a.is_cover ? 1 : 0;
        const coverB = b.is_cover ? 1 : 0;

        if (coverA !== coverB) return coverB - coverA;

        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      });

      const photoUrls = images.map((img) => img.image_url);
      const coverIndex = Math.max(
        0,
        images.findIndex((img) => Boolean(img.is_cover))
      );

      const verificationStatus = stringFrom(propertyRecord.verification_status);
      const fasilitas = toRecord(
        propertyRecord.fasilitas ?? propertyRecord.facilities
      );
      const nearby = toRecord(propertyRecord.nearby);

      const rawNextDraft: DraftRecord = {
        listingType: stringFrom(propertyRecord.listing_type),
        rentalType: stringFrom(propertyRecord.rental_type),
        plan: normalizeOwnerPlanId(stringFrom(propertyRecord.plan_id)),
        mode: "edit",
        source: "owner",
        kode: stringFrom(propertyRecord.kode, kode),
        postedDate: optionalStringFrom(
          propertyRecord.posted_date,
          propertyRecord.created_at
        ),

        address: stringFrom(propertyRecord.address),
        province: stringFrom(propertyRecord.province),
        city: stringFrom(propertyRecord.city),
        housingName: stringFrom(propertyRecord.housing_name),
        customHousing: stringFrom(propertyRecord.custom_housing),
        note: stringFrom(propertyRecord.note),

        propertyType: stringFrom(propertyRecord.property_type),
        price: stringFrom(propertyRecord.price),

        lt: stringFrom(propertyRecord.lt, propertyRecord.land_size),
        lb: stringFrom(propertyRecord.lb, propertyRecord.building_size),

        bed: stringFrom(propertyRecord.bed, propertyRecord.bedrooms),
        bath: stringFrom(propertyRecord.bath, propertyRecord.bathrooms),
        maid: stringFrom(propertyRecord.maid, propertyRecord.maid_bedrooms),

        furnishing: stringFrom(propertyRecord.furnishing),
        garage: stringFrom(propertyRecord.garage, propertyRecord.garages),
        floor: stringFrom(propertyRecord.floor, propertyRecord.floors),

        listrik: stringFrom(propertyRecord.listrik, propertyRecord.electricity),
        jenisAir: stringFrom(propertyRecord.jenis_air, propertyRecord.water_type),

        sertifikat: stringFrom(
          propertyRecord.sertifikat,
          propertyRecord.certificate
        ),
        jenisTanah: stringFrom(
          propertyRecord.jenis_tanah,
          propertyRecord.land_type
        ),
        jenisZoning: stringFrom(
          propertyRecord.jenis_zoning,
          propertyRecord.zoning_type
        ),
        jenisKepemilikan: stringFrom(
          propertyRecord.jenis_kepemilikan,
          propertyRecord.ownership_type
        ),

        title: stringFrom(propertyRecord.title),
        title_id: stringFrom(propertyRecord.title_id),
        description: stringFrom(propertyRecord.description),
        description_id: stringFrom(propertyRecord.description_id),

        verification: verificationStatus
          ? {
              status: verificationStatus,
            }
          : undefined,

        payment: undefined,

        fasilitas,
        nearby,

        photos: photoUrls,
        coverIndex,
        video: stringFrom(propertyRecord.video, propertyRecord.video_url),
        mediaFolder: optionalStringFrom(propertyRecord.media_folder),
      };

      const nextDraft = rawNextDraft as unknown as PemilikListingDraft;

      if (!ignore) {
        setDraft(nextDraft);
        setLoading(false);
      }
    }

    loadListing();

    return () => {
      ignore = true;
    };
  }, [kode, draft, setDraft]);

  const PROVINCES = useMemo(
    () => ["DKI Jakarta", "Jawa Barat", "Banten", "Bali"],
    []
  );

  const CITIES_BY_PROVINCE = useMemo(
    () => ({
      "DKI Jakarta": ["Jakarta Selatan", "Jakarta Barat", "Jakarta Timur"],
      "Jawa Barat": ["Bandung", "Bekasi", "Bogor"],
      Banten: ["Tangerang", "Serpong"],
      Bali: ["Denpasar", "Badung"],
    }),
    []
  );

  const HOUSING_SUGGESTIONS = useMemo(
    () =>
      ["Alam Sutera", "BSD City", "CitraGarden"].sort((a, b) =>
        a.localeCompare(b)
      ),
    []
  );

  const listingDraft = useMemo(
    () => ({
      ...toRecord(draft),
      mode: "edit",
      source: "owner",
      kode,
    }),
    [draft, kode]
  );

  const handleSetDraft = useCallback(
    (updater: (prev: DraftRecord | null | undefined) => DraftRecord) => {
      setDraft((prev) => {
        const previousDraft = toRecord(prev);
        const updatedDraft = updater(previousDraft);

        return updatedDraft as unknown as PemilikListingDraft;
      });
    },
    [setDraft]
  );

  function onNext() {
    router.push(`/pemilik/iklan/detail/edit/${kode}`);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            Loading listing...
          </div>
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {errorMessage}
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => router.push("/pemilikdashboard")}
              className="rounded-2xl bg-[#1C1C1E] px-5 py-3 text-sm font-semibold text-white"
            >
              Kembali
            </button>
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
        onNext={onNext}
        provinces={PROVINCES}
        citiesByProvince={CITIES_BY_PROVINCE}
        housingSuggestions={HOUSING_SUGGESTIONS}
      />
    </main>
  );
}