"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePemilikDraftListing } from "../layout";
import ListingForm from "@/components/listing/ListingForm";

type PlanType = "basic" | "priority" | "featured";

const inputBase =
  "mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10";

export default function PemilikIklanDetailPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { draft, setDraft } = usePemilikDraftListing();

  const currentPlan = useMemo<PlanType>(() => {
    const planFromUrl = searchParams.get("plan");

    if (planFromUrl === "priority") return "priority";
    if (planFromUrl === "featured") return "featured";

    return "basic";
  }, [searchParams]);

  useEffect(() => {
    setDraft((prev: any) => ({
      ...(prev || {}),
      mode: "create",
      source: "owner",
      plan: currentPlan,
    }));
  }, [currentPlan, setDraft]);

  const isValid = useMemo(() => {
    const propertyType = String(draft?.propertyType || "").trim();
    const price = String(draft?.price || "").trim();
    const lt = String(draft?.lt || "").trim();
    const listingType = String(draft?.listingType || "").trim();
    const rentalType = String(draft?.rentalType || "").trim();
    const salePriceRaw = String(draft?.salePrice || "").trim();
    const rentPriceRaw = String(draft?.rentPrice || "").trim();

    const hasSale =
      listingType === "dijual" || listingType === "dijual_disewa";
    const hasRent =
      listingType === "disewa" || listingType === "dijual_disewa";
    const isAuction = listingType === "lelang";

    const salePrice = salePriceRaw || (hasSale ? price : "");
    const rentPrice =
      rentPriceRaw || (listingType === "disewa" ? price : "");

    const hasRequiredPrice = isAuction
      ? price.length > 0
      : hasSale && hasRent
        ? salePrice.length > 0 && rentPrice.length > 0
        : hasSale
          ? salePrice.length > 0
          : hasRent
            ? rentPrice.length > 0
            : false;

    const sertifikat = String(draft?.sertifikat || "").trim();
    const jenisKepemilikan = String(draft?.jenisKepemilikan || "").trim();
    const jenisTanah = String(draft?.jenisTanah || "").trim();
    const jenisZoning = String(draft?.jenisZoning || "").trim();

    const isApartment = ["apartemen", "studio"].includes(propertyType);
    const usesLandSize = !isApartment;
    const requiresRentalType = hasRent;
    const requiresLandLegal = propertyType === "tanah" && (hasSale || isAuction);

    const baseValid =
      propertyType.length > 0 &&
      hasRequiredPrice &&
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
    draft?.salePrice,
    draft?.rentPrice,
    draft?.lt,
    draft?.listingType,
    draft?.rentalType,
    draft?.sertifikat,
    draft?.jenisKepemilikan,
    draft?.jenisTanah,
    draft?.jenisZoning,
  ]);

  function onNext() {
    if (!isValid) return;
    router.push(`/pemilik/iklan/foto?plan=${currentPlan}`);
  }

  function onBack() {
    router.push(`/pemilik/iklan?plan=${currentPlan}`);
  }

  return (
    <ListingForm
      draft={{
        ...(draft || {}),
        mode: "create",
        source: "owner",
        plan: currentPlan,
      }}
      setDraft={setDraft}
      inputBase={inputBase}
      isValid={isValid}
      onBack={onBack}
      onNext={onNext}
      router={router}
    />
  );
}