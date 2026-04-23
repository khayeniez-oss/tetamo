"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  usePemilikDraftListing,
  type PemilikListingDraft,
} from "../../layout";
import ListingIklan from "@/components/listing/ListingIklan";

type PropertyImageRow = {
  image_url: string;
  sort_order: number | null;
  is_cover: boolean | null;
};

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

      const hasBilingualDraftFields =
        (draft as any)?.title_id !== undefined &&
        (draft as any)?.description_id !== undefined;

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

      const { data: imageRows, error: imageError } = await supabase
        .from("property_images")
        .select("image_url, sort_order, is_cover")
        .eq("property_id", property.id)
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

      const nextDraft: PemilikListingDraft & Record<string, any> = {
        listingType: property.listing_type ?? "",
        rentalType: property.rental_type ?? "",
        plan:
          property.plan_id === "featured"
            ? "featured"
            : property.plan_id === "basic"
              ? "basic"
              : undefined,
        mode: "edit",
        source: "owner",
        kode: property.kode ?? kode,
        postedDate: property.posted_date ?? property.created_at ?? undefined,

        address: property.address ?? "",
        province: property.province ?? "",
        city: property.city ?? "",
        housingName: property.housing_name ?? "",
        customHousing: property.custom_housing ?? "",
        note: property.note ?? "",

        propertyType: property.property_type ?? "",
        price:
          property.price !== null && property.price !== undefined
            ? String(property.price)
            : "",
        lt:
          property.lt !== null && property.lt !== undefined
            ? String(property.lt)
            : property.land_size !== null && property.land_size !== undefined
              ? String(property.land_size)
              : "",
        lb:
          property.lb !== null && property.lb !== undefined
            ? String(property.lb)
            : property.building_size !== null &&
                property.building_size !== undefined
              ? String(property.building_size)
              : "",
        bed:
          property.bed !== null && property.bed !== undefined
            ? String(property.bed)
            : property.bedrooms !== null && property.bedrooms !== undefined
              ? String(property.bedrooms)
              : "",
        bath:
          property.bath !== null && property.bath !== undefined
            ? String(property.bath)
            : property.bathrooms !== null && property.bathrooms !== undefined
              ? String(property.bathrooms)
              : "",
        maid:
          property.maid !== null && property.maid !== undefined
            ? String(property.maid)
            : property.maid_bedrooms !== null &&
                property.maid_bedrooms !== undefined
              ? String(property.maid_bedrooms)
              : "",
        furnishing: property.furnishing ?? "",
        garage:
          property.garage !== null && property.garage !== undefined
            ? String(property.garage)
            : property.garages !== null && property.garages !== undefined
              ? String(property.garages)
              : "",
        floor:
          property.floor !== null && property.floor !== undefined
            ? String(property.floor)
            : property.floors !== null && property.floors !== undefined
              ? String(property.floors)
              : "",

        listrik:
          property.listrik !== null && property.listrik !== undefined
            ? String(property.listrik)
            : property.electricity !== null && property.electricity !== undefined
              ? String(property.electricity)
              : "",
        jenisAir: property.jenis_air ?? property.water_type ?? "",

        sertifikat: property.sertifikat ?? property.certificate ?? "",
        jenisTanah: property.jenis_tanah ?? property.land_type ?? "",
        jenisZoning: property.jenis_zoning ?? property.zoning_type ?? "",
        jenisKepemilikan:
          property.jenis_kepemilikan ?? property.ownership_type ?? "",

        title: property.title ?? "",
        title_id: (property as any).title_id ?? "",
        description: property.description ?? "",
        description_id: (property as any).description_id ?? "",

        verification: property.verification_status
          ? {
              status: property.verification_status,
            }
          : undefined,

        payment: undefined,

        fasilitas: property.fasilitas ?? property.facilities ?? {},
        nearby: property.nearby ?? {},

        photos: photoUrls,
        coverIndex,
        video: property.video ?? property.video_url ?? "",
        mediaFolder: property.media_folder ?? undefined,
      };

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
        draft={{
          ...(draft || {}),
          mode: "edit",
          source: "owner",
          kode,
        }}
        setDraft={setDraft}
        onNext={onNext}
        provinces={PROVINCES}
        citiesByProvince={CITIES_BY_PROVINCE}
        housingSuggestions={HOUSING_SUGGESTIONS}
      />
    </main>
  );
}