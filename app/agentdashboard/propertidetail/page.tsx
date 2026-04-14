"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAgentListingDraft } from "@/app/agentdashboard/AgentListingDraftContext";
import ListingForm from "@/components/listing/ListingForm";

export default function AgentPropertiDetailPage() {
  const router = useRouter();
  const { draft, setDraft } = useAgentListingDraft();

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
    if (!isValid) return;
    router.push("/agentdashboard/deskripsi-foto");
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