"use client";

import { useListingDraft } from "@/lib/use-listing-draft";
import React, { createContext, useContext, useMemo } from "react";

export type AgentListingDraft = {
  listingType?: "dijual" | "disewa" | "dijual_disewa" | "lelang" | "";
  rentalType?: "harian" | "bulanan" | "tahunan" | "";
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
  salePrice?: string;
  rentPrice?: string;
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
    salePrice: undefined,
    rentPrice: undefined,
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
  const { draft, setDraft, clearDraft, ready, storageError, demoScope } = useListingDraft("agent", getEmptyDraft);

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
      {demoScope ? <p role="status" className="m-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">DEMO • Draft terpisah dari draft asli Anda. Nilai contoh, tidak dipublikasikan dan tanpa pembayaran.</p> : null}
      {storageError ? <p role="alert" className="p-3 text-sm text-amber-800">Draft storage is unavailable. Keep this tab open until you save your listing.</p> : null}
      {ready ? children : <p role="status" className="p-4">Memuat draft…</p>}
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
