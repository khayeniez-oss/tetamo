"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePemilikDraftListing } from "../../../layout";
import ListingForm from "@/components/listing/ListingForm";

export default function Page() {
  const router = useRouter();
  const params = useParams();

  const kodeParam = (params as { kode?: string | string[] })?.kode;
  const kode = Array.isArray(kodeParam) ? kodeParam[0] : kodeParam;

  const { draft, setDraft } = usePemilikDraftListing();

  const inputBase =
    "mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-[#1C1C1E] focus:ring-0";

  useEffect(() => {
    if (!kode) return;

    setDraft((prev) => ({
      ...(prev || {}),
      mode: "edit",
      kode: String(kode),
      source: "owner",
    }));
  }, [kode, setDraft]);

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

    const baseValid =
      propertyType.length > 0 &&
      hasRequiredPrice &&
      lt.length > 0;

    if (!baseValid) return false;

    if (hasRent && rentalType.length === 0) {
      return false;
    }

    if (propertyType === "tanah" && (hasSale || isAuction)) {
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

  function onBack() {
    router.push(`/pemilik/iklan/edit/${String(kode)}`);
  }

  function onNext() {
    if (!isValid) return;
    router.push(`/pemilik/iklan/foto/edit/${String(kode)}`);
  }

  return (
    <ListingForm
      draft={{
        ...(draft || {}),
        mode: "edit",
        kode: String(kode),
        source: "owner",
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