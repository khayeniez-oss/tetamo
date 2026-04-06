"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

export type AgentListingDraft = {
  listingType?: "dijual" | "disewa" | "lelang" | "";
  rentalType?: "bulanan" | "tahunan" | "";
  mode?: "create" | "edit";
  source?: "agent";
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
  marketType?: string;

  fasilitas?: Record<string, boolean>;
  nearby?: Record<string, boolean>;

  photos?: string[];
  coverIndex?: number;
  video?: string;
  mediaFolder?: string;
};

type AgentDraftCtx = {
  draft: AgentListingDraft;
  setDraft: React.Dispatch<React.SetStateAction<AgentListingDraft>>;
  clearDraft: () => void;
};

const AgentDraftContext = createContext<AgentDraftCtx | null>(null);

function getEmptyDraft(): AgentListingDraft {
  return {
    listingType: "",
    rentalType: "",
    mode: undefined,
    source: "agent",
    kode: undefined,
    postedDate: undefined,

    address: undefined,
    province: undefined,
    city: undefined,
    housingName: undefined,
    customHousing: undefined,
    note: undefined,

    propertyType: undefined,
    marketType: undefined,
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

    fasilitas: undefined,
    nearby: undefined,

    photos: undefined,
    coverIndex: undefined,
    video: undefined,
    mediaFolder: undefined,
  };
}

export function AgentListingDraftProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [draft, setDraft] = useState<AgentListingDraft>(getEmptyDraft());

  const clearDraft = () => {
    setDraft(getEmptyDraft());
  };

  const value = useMemo(
    () => ({
      draft,
      setDraft,
      clearDraft,
    }),
    [draft]
  );

  return (
    <AgentDraftContext.Provider value={value}>
      {children}
    </AgentDraftContext.Provider>
  );
}

export function useAgentListingDraft() {
  const ctx = useContext(AgentDraftContext);

  if (!ctx) {
    throw new Error(
      "useAgentListingDraft must be used inside AgentListingDraftProvider"
    );
  }

  return ctx;
}