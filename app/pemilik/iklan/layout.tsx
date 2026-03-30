"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

export type PemilikPlanType = "basic" | "featured";

export type PemilikListingDraft = {
  listingType?: "dijual" | "disewa" | "lelang" | "";
  rentalType?: "bulanan" | "tahunan" | "";
  plan?: PemilikPlanType;
  mode?: "create" | "edit";
  source?: "owner";
  kode?: string;
  postedDate?: string;

  address?: string;
  province?: string;
  city?: string;
  housingName?: string;
  customHousing?: string;
  note?: string;

  propertyType?: string;
  price?: string;
  lt?: string;
  lb?: string;
  bed?: string;
  bath?: string;
  maid?: string;
  furnishing?: string;
  garage?: string;
  floor?: string;

  listrik?: string;
  jenisAir?: string;

  sertifikat?: string;
  jenisTanah?: string;
  jenisZoning?: string;
  jenisKepemilikan?: string;

  title?: string;
  description?: string;

  verification?: {
    relationship?: string;
    representation?: string;
    status?: "pending_verification" | "approved" | "rejected";
  };

  payment?: {
    planId?: string;
    amount?: number;
    currency?: "IDR";
    status?: "unpaid" | "pending" | "paid" | "failed";
    method?: "stripe" | "xendit";
    paidAt?: string;
  };

  fasilitas?: Record<string, boolean>;
  nearby?: Record<string, boolean>;

  photos?: string[];
  coverIndex?: number;
  video?: string;

  mediaFolder?: string;
};

type PemilikDraftCtx = {
  mounted: boolean;
  draft: PemilikListingDraft;
  setDraft: React.Dispatch<React.SetStateAction<PemilikListingDraft>>;
  clearDraft: () => void;
};

const PemilikDraftContext = createContext<PemilikDraftCtx | null>(null);

export function usePemilikDraftListing() {
  const ctx = useContext(PemilikDraftContext);

  if (!ctx) {
    throw new Error(
      "usePemilikDraftListing must be used inside the pemilik listing layout."
    );
  }

  return ctx;
}

function getEmptyDraft(): PemilikListingDraft {
  return {
    listingType: "",
    rentalType: "",

    plan: undefined,
    mode: undefined,
    source: "owner",

    kode: undefined,
    postedDate: undefined,

    address: undefined,
    province: undefined,
    city: undefined,
    housingName: undefined,
    customHousing: undefined,
    note: undefined,

    propertyType: undefined,
    price: undefined,
    lt: undefined,
    lb: undefined,
    bed: undefined,
    bath: undefined,
    maid: undefined,
    furnishing: undefined,
    garage: undefined,
    floor: undefined,

    listrik: undefined,
    jenisAir: undefined,

    sertifikat: undefined,
    jenisTanah: undefined,
    jenisZoning: undefined,
    jenisKepemilikan: undefined,

    title: undefined,
    description: undefined,

    verification: undefined,
    payment: undefined,

    fasilitas: undefined,
    nearby: undefined,

    photos: undefined,
    coverIndex: undefined,
    video: undefined,
    mediaFolder: undefined,
  };
}

export default function PemilikIklanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted] = useState(true);
  const [draft, setDraft] = useState<PemilikListingDraft>(getEmptyDraft());

  const clearDraft = () => {
    setDraft(getEmptyDraft());
  };

  const value = useMemo<PemilikDraftCtx>(
    () => ({
      mounted,
      draft,
      setDraft,
      clearDraft,
    }),
    [mounted, draft]
  );

  return (
    <PemilikDraftContext.Provider value={value}>
      {children}
    </PemilikDraftContext.Provider>
  );
}