"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAgentListingDraft } from "@/app/agentdashboard/AgentListingDraftContext";
import ListingFoto from "@/components/listing/ListingFoto";

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

function toInputValue(value: any) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export default function AgentEditDeskripsiFotoPage() {
  const router = useRouter();
  const params = useParams();
  const { draft, setDraft, clearDraft } = useAgentListingDraft();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");

  const kode = useMemo(() => {
    const raw = params?.kode;
    if (Array.isArray(raw)) return decodeURIComponent(raw[0] || "");
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
        draft?.mode === "edit" &&
        draft?.source === "agent" &&
        draft?.kode === kode;

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

        const { data: imageRows, error: imageError } = await supabase
          .from("property_images")
          .select("image_url, sort_order, is_cover")
          .eq("property_id", property.id)
          .order("sort_order", { ascending: true });

        if (imageError) {
          throw imageError;
        }

        const photos = Array.isArray(imageRows)
          ? imageRows
              .map((item) => item.image_url)
              .filter((url): url is string => Boolean(url))
          : [];

        const coverIndexFromDb = Array.isArray(imageRows)
          ? imageRows.findIndex((item) => item.is_cover)
          : -1;

        const coverIndex = coverIndexFromDb >= 0 ? coverIndexFromDb : 0;

        if (!isMounted) return;

        setDraft((prev: any) => ({
          ...(prev || {}),
          mode: "edit",
          source: "agent",
          plan: undefined,
          payment: undefined,

          propertyId: property.id,
          kode: property.kode,

          listingType: property.listing_type ?? "",
          rentalType: property.rental_type ?? "",
          propertyType: property.property_type ?? "",

          title: property.title ?? "",
          description: property.description ?? "",

          price: toInputValue(property.price),

          address: property.address ?? "",
          province: property.province ?? "",
          city: property.city ?? "",

          housingName: property.housing_name ?? "",
          customHousing: property.custom_housing ?? "",
          note: property.location_note ?? "",

          lt: toInputValue(property.land_size),
          lb: toInputValue(property.building_size),
          bed: toInputValue(property.bedrooms),
          bath: toInputValue(property.bathrooms),
          maid: toInputValue(property.maid_room),
          garage: toInputValue(property.garage),
          floor: toInputValue(property.floor),

          furnishing: property.furnishing ?? "",
          listrik: toInputValue(property.electricity),
          jenisAir: property.water_type ?? "",

          sertifikat: property.certificate ?? "",
          jenisTanah: property.land_type ?? "",
          jenisZoning: property.zoning_type ?? "",
          jenisKepemilikan: property.ownership_type ?? "",

          fasilitas: property.facilities ?? {},
          nearby: property.nearby ?? {},

          video: property.video_url ?? "",
          photos,
          coverIndex,
        }));

        setLoading(false);
      } catch (error: any) {
        console.error("Agent edit deskripsi foto load error:", error);

        if (!isMounted) return;
        setPageError(error?.message || "Gagal memuat data listing.");
        setLoading(false);
      }
    }

    loadPropertyForEdit();

    return () => {
      isMounted = false;
    };
  }, [kode, draft?.kode, draft?.mode, draft?.source, setDraft]);

  function handleBack() {
    router.push(
      `/agentdashboard/propertidetail/edit/${encodeURIComponent(kode)}`
    );
  }

  async function handleNext() {
    if (saving) return;

    try {
      setSaving(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Please log in first.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, phone, agency, role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .select("id, kode")
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

      const photos = Array.isArray(draft?.photos)
        ? draft.photos.filter(Boolean)
        : [];

      const coverIndex =
        typeof draft?.coverIndex === "number" ? draft.coverIndex : 0;

      const coverImageUrl = photos[coverIndex] || photos[0] || null;

      const updatePayload = {
        listing_type: cleanText(draft?.listingType),
        rental_type: cleanText(draft?.rentalType),
        property_type: cleanText(draft?.propertyType),

        title: cleanText(draft?.title),
        description: cleanText(draft?.description),

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

        contact_name: cleanText(profile?.full_name),
        contact_phone: cleanText(profile?.phone),
        contact_role: "agent",
        contact_agency: cleanText(profile?.agency),
      };

      const { error: updateError } = await supabase
        .from("properties")
        .update(updatePayload)
        .eq("id", property.id)
        .eq("user_id", user.id)
        .eq("source", "agent");

      if (updateError) {
        throw updateError;
      }

      const { error: deleteImagesError } = await supabase
        .from("property_images")
        .delete()
        .eq("property_id", property.id);

      if (deleteImagesError) {
        throw deleteImagesError;
      }

      if (photos.length > 0) {
        const imageRows = photos.map((url: string, index: number) => ({
          property_id: property.id,
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
        `/agentdashboard/sukses?type=edit-listing&kode=${encodeURIComponent(
          property.kode
        )}`
      );
    } catch (error: any) {
      console.error("Agent edit listing error:", error);
      alert(error?.message || "Failed to update listing.");
    } finally {
      setSaving(false);
    }
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
      <ListingFoto
        draft={{
          ...(draft || {}),
          mode: "edit",
          source: "agent",
          plan: undefined,
          payment: undefined,
        }}
        setDraft={setDraft}
        onBack={handleBack}
        onNext={handleNext}
      />
    </main>
  );
}