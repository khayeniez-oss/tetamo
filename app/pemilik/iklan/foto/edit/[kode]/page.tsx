"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { usePemilikDraftListing } from "../../../layout";
import ListingFoto from "@/components/listing/ListingFoto";

export default function Page() {
  const router = useRouter();
  const params = useParams();

  const kodeParam = (params as { kode?: string | string[] })?.kode;
  const kode = Array.isArray(kodeParam) ? kodeParam[0] : kodeParam;

  const { draft, setDraft, clearDraft } = usePemilikDraftListing();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!kode) return;

    setDraft((prev) => ({
      ...(prev || {}),
      mode: "edit",
      kode: String(kode),
      source: "owner",
    }));
  }, [kode, setDraft]);

  function onBack() {
    router.push(`/pemilik/iklan/detail/edit/${String(kode)}`);
  }

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

  async function onNext() {
    if (!kode || saving) return;

    try {
      setSaving(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        alert("Please log in first.");
        return;
      }

      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .select("id, user_id, kode")
        .eq("kode", String(kode))
        .eq("user_id", user.id)
        .maybeSingle();

      if (propertyError) {
        throw propertyError;
      }

      if (!property) {
        throw new Error("Listing not found.");
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, agency")
        .eq("id", user.id)
        .maybeSingle();

      const photos = Array.isArray(draft?.photos)
        ? draft.photos.filter(Boolean)
        : [];

      const coverIndex =
        typeof draft?.coverIndex === "number" ? draft.coverIndex : 0;

      const coverImageUrl = photos[coverIndex] || photos[0] || null;

      const updatePayload: Record<string, any> = {
        source: "owner",

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

        contact_user_id: user.id,
        contact_name:
          cleanText(profile?.full_name) ||
          cleanText(user.user_metadata?.full_name) ||
          cleanText(
            typeof user.email === "string" ? user.email.split("@")[0] : null
          ),
        contact_phone: cleanText(profile?.phone),
        contact_role: "owner",
        contact_agency: cleanText(profile?.agency),

        // send edited owner listing back into approval review
        verification_status: "pending_verification",

        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("properties")
        .update(updatePayload as any)
        .eq("id", property.id)
        .eq("user_id", user.id);

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

        const { error: insertImagesError } = await supabase
          .from("property_images")
          .insert(imageRows);

        if (insertImagesError) {
          throw insertImagesError;
        }
      }

      clearDraft();

      router.push(
        `/pemilik/iklan/sukses?mode=edit&status=pending-approval&kode=${encodeURIComponent(
          String(kode)
        )}`
      );
    } catch (error: any) {
      console.error("Edit listing update error:", error);
      alert(error?.message || "Failed to update listing.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ListingFoto
      draft={{
        ...(draft || {}),
        mode: "edit",
        kode: String(kode),
        source: "owner",
      }}
      setDraft={setDraft}
      onBack={onBack}
      onNext={onNext}
    />
  );
}