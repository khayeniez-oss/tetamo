"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

function generateListingKode() {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `TTM-${year}-${random}`;
}

export default function AgentDeskripsiFotoPage() {
  const router = useRouter();
  const { draft, setDraft, clearDraft } = useAgentListingDraft();

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft((prev) => ({
      ...(prev || {}),
      mode: "create",
      source: "agent",
    }));
  }, [setDraft]);

  function onBack() {
    router.push("/agentdashboard/propertidetail");
  }

  async function onNext() {
    if (saving) return;

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

      const insertPayload = {
        user_id: user.id,
        created_by_user_id: user.id,

        source: "agent",

        // agent create should NOT go live immediately
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
        .insert(insertPayload)
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