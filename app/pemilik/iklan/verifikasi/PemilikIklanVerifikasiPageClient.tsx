"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { usePemilikDraftListing } from "../layout";
import ListingVerifikasi from "@/components/listing/ListingVerifikasi";

type PlanType = "basic" | "featured";

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function cleanNumber(value: unknown) {
  if (value === null || value === undefined) return null;

  const raw = String(value).replace(/[^\d]/g, "");
  if (!raw) return null;

  const parsed = Number(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

function buildListingCode(existingKode?: string | null) {
  const current = String(existingKode || "").trim();
  if (current) return current;

  const stamp = Date.now().toString().slice(-8);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TTM-${stamp}-${rand}`;
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const parts = dataUrl.split(",");
    if (parts.length < 2) return null;

    const mimeMatch = dataUrl.match(/^data:(.*?);base64,/);
    const mime = mimeMatch?.[1] || "image/jpeg";

    const byteString = atob(parts[1]);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const intArray = new Uint8Array(arrayBuffer);

    for (let i = 0; i < byteString.length; i++) {
      intArray[i] = byteString.charCodeAt(i);
    }

    return new Blob([arrayBuffer], { type: mime });
  } catch {
    return null;
  }
}

function getFileExtensionFromDataUrl(dataUrl: string) {
  if (dataUrl.startsWith("data:image/png")) return "png";
  if (dataUrl.startsWith("data:image/webp")) return "webp";
  if (dataUrl.startsWith("data:image/gif")) return "gif";
  return "jpg";
}

async function uploadDraftPhotoIfNeeded(
  userId: string,
  propertyId: string,
  photo: string,
  index: number
) {
  if (!photo) return null;

  if (!photo.startsWith("data:image/")) {
    return photo;
  }

  const blob = dataUrlToBlob(photo);
  if (!blob) return null;

  const ext = getFileExtensionFromDataUrl(photo);
  const filePath = `public/${userId}/${propertyId}/${Date.now()}-${index}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("property-images")
    .upload(filePath, blob, {
      contentType: blob.type || "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("property-images").getPublicUrl(filePath);

  return publicUrl;
}

async function insertPropertyImagesFromDraft(
  userId: string,
  propertyId: string,
  draft: any
) {
  const photoList: string[] = Array.isArray(draft?.photos) ? draft.photos : [];
  if (photoList.length === 0) return;

  const coverIndex =
    typeof draft?.coverIndex === "number" ? draft.coverIndex : 0;

  const imageRows: Array<{
    property_id: string;
    image_url: string;
    sort_order: number;
    is_cover: boolean;
  }> = [];

  for (let i = 0; i < photoList.length; i++) {
    const photo = photoList[i];
    if (!photo || typeof photo !== "string") continue;

    const finalUrl = await uploadDraftPhotoIfNeeded(userId, propertyId, photo, i);
    if (!finalUrl) continue;

    imageRows.push({
      property_id: propertyId,
      image_url: finalUrl,
      sort_order: i,
      is_cover: i === coverIndex,
    });
  }

  if (imageRows.length === 0) return;

  const { error } = await supabase.from("property_images").insert(imageRows);
  if (error) throw error;
}

export default function PemilikIklanVerifikasiPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { draft, setDraft } = usePemilikDraftListing();
  const [saving, setSaving] = useState(false);

  const currentPlan = useMemo<PlanType>(() => {
    const planFromUrl = searchParams.get("plan");
    return planFromUrl === "featured" ? "featured" : "basic";
  }, [searchParams]);

  useEffect(() => {
    setDraft((prev) => ({
      ...(prev || {}),
      mode: "create",
      source: "owner",
      plan: currentPlan,
    }));
  }, [currentPlan, setDraft]);

  function onBack() {
    router.push(`/pemilik/iklan/foto?plan=${currentPlan}`);
  }

  async function onNextCreate() {
    if (saving) return;

    try {
      setSaving(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        alert("Please log in first.");
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, agency")
        .eq("id", user.id)
        .maybeSingle();

      const today = new Date().toISOString().slice(0, 10);
      const finalKode = buildListingCode(draft?.kode);

      const { data: existingProperty } = await supabase
        .from("properties")
        .select("id, kode")
        .eq("user_id", user.id)
        .eq("kode", finalKode)
        .maybeSingle();

      if (existingProperty?.id) {
        setDraft((prev) => ({
          ...(prev || {}),
          kode: existingProperty.kode || finalKode,
          postedDate: prev?.postedDate || today,
          source: "owner",
          plan: currentPlan,
        }));

        router.push(
          `/pemilik/iklan/pembayaran?plan=${currentPlan}&kode=${encodeURIComponent(
            existingProperty.kode || finalKode
          )}`
        );
        return;
      }

      const verification = (draft?.verification || {}) as Record<string, any>;

      const propertyPayload = {
        user_id: user.id,

        title: cleanText(draft?.title) || "",
        listing_type: cleanText(draft?.listingType),
        property_type: cleanText(draft?.propertyType),
        price: cleanNumber(draft?.price),
        description: cleanText(draft?.description) || "",

        status: "active",

        country: "Indonesia",
        province: cleanText(draft?.province),
        city: cleanText(draft?.city),
        area:
          cleanText(draft?.customHousing) ||
          cleanText(draft?.housingName) ||
          cleanText(draft?.city),
        address: cleanText(draft?.address),
        housing_name: cleanText(draft?.housingName),
        custom_housing: cleanText(draft?.customHousing),
        location_note: cleanText(draft?.note),

        bedrooms: cleanNumber(draft?.bed),
        bathrooms: cleanNumber(draft?.bath),
        maid_room: cleanNumber(draft?.maid),
        garage: cleanNumber(draft?.garage),
        floor: cleanNumber(draft?.floor),
        building_size: cleanNumber(draft?.lb),
        land_size: cleanNumber(draft?.lt),

        furnishing: cleanText(draft?.furnishing),
        electricity: cleanNumber(draft?.listrik),
        water_type: cleanText(draft?.jenisAir),

        certificate: cleanText(draft?.sertifikat),
        ownership_type: cleanText(draft?.jenisKepemilikan),
        land_type: cleanText(draft?.jenisTanah),
        zoning_type: cleanText(draft?.jenisZoning),

        kode: finalKode,
        posted_date: draft?.postedDate || today,
        plan_id: currentPlan,
        source: "owner",
        rental_type: cleanText(draft?.rentalType),

        facilities: draft?.fasilitas ?? null,
        nearby: draft?.nearby ?? null,

        cover_index:
          typeof draft?.coverIndex === "number" ? draft.coverIndex : 0,
        video_url: cleanText(draft?.video),

        relationship: cleanText(verification.relationship),
        other_relationship: cleanText(verification.otherRelationship),
        sell_mode: cleanText(verification.sellMode),
        need_agent_recommendation: cleanText(
          verification.needAgentRecommendation
        ),
        need_transaction_support: cleanText(
          verification.needTransactionSupport
        ),
        verification_note: cleanText(verification.note),
        ownership_pdf_name: cleanText(verification.ownershipPdfName),
        authorization_pdf_name: cleanText(verification.authorizationPdfName),

        verification_status: "approved",
        verification_data: verification,

        verified_ok: true,

        listing_expires_at: null,
        featured_expires_at: null,
        boost_active: false,
        boost_expires_at: null,
        spotlight_active: false,
        spotlight_expires_at: null,

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
      };

      const { data: insertedProperty, error: propertyError } = await supabase
        .from("properties")
        .insert(propertyPayload)
        .select("id, kode")
        .single();

      if (propertyError || !insertedProperty?.id) {
        throw new Error(
          propertyError?.message || "Failed to create property."
        );
      }

      await insertPropertyImagesFromDraft(user.id, insertedProperty.id, draft);

      setDraft((prev) => ({
        ...(prev || {}),
        kode: insertedProperty.kode || finalKode,
        postedDate: prev?.postedDate || today,
        source: "owner",
        plan: currentPlan,
      }));

      router.push(
        `/pemilik/iklan/pembayaran?plan=${currentPlan}&kode=${encodeURIComponent(
          insertedProperty.kode || finalKode
        )}`
      );
    } catch (error: any) {
      console.error("Create listing before payment error:", error);
      alert(error?.message || "Failed to save listing before payment.");
    } finally {
      setSaving(false);
    }
  }

  function onNextEdit() {
    router.push("/pemilikdashboard");
  }

  return (
    <ListingVerifikasi
      draft={{
        ...(draft || {}),
        mode: "create",
        source: "owner",
        plan: currentPlan,
      }}
      setDraft={setDraft}
      onBack={onBack}
      onNextCreate={onNextCreate}
      onNextEdit={onNextEdit}
    />
  );
}