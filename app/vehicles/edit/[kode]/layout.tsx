"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useParams } from "next/navigation";

type VehicleEditDraft = any;

type VehicleEditDraftContextType = {
  draft: VehicleEditDraft;
  setDraft: React.Dispatch<React.SetStateAction<VehicleEditDraft>>;
  resetDraft: () => void;
  hydrateDraft: (data: Partial<VehicleEditDraft>) => void;
  kode: string;
  isDraftHydrated: boolean;
  setIsDraftHydrated: React.Dispatch<React.SetStateAction<boolean>>;
};

const VehicleEditDraftContext =
  createContext<VehicleEditDraftContextType | null>(null);

function createInitialEditDraft(kode: string): VehicleEditDraft {
  return {
    mode: "edit",
    source: "owner",
    plan: "basic",

    id: "",
    kode: kode || "",

    vehicleType: "",
    listingType: "",
    postedDate: "",

    address: "",
    province: "",
    city: "",
    note: "",

    brand: "",
    model: "",
    variant: "",
    title: "",
    description: "",

    year: "",
    price: "",
    transmission: "",
    fuel: "",
    mileage: "",
    color: "",
    condition: "",

    bodyType: "",
    engineCc: "",
    seats: "",
    plateNumber: "",

    contactName: "",
    whatsapp: "",
    email: "",
    relationship: "",
    verificationNote: "",

    verification: {
      relationship: "",
      otherRelationship: "",
      sellMode: "",
      needAgentRecommendation: "",
      needTransactionSupport: "",
      note: "",
      ownershipPdfName: "",
      authorizationPdfName: "",
      status: "pending_verification",
    },

    photos: [],
    coverIndex: 0,
    video: "",
    mediaFolder: "",

    paymentStatus: "",
    paymentMethod: "",

    verifiedOk: false,
  };
}

export function useVehicleEditDraftListing() {
  const context = useContext(VehicleEditDraftContext);

  if (!context) {
    throw new Error(
      "useVehicleEditDraftListing must be used within app/vehicles/edit/[kode]/layout.tsx"
    );
  }

  return context;
}

export default function VehicleEditLayout({
  children,
}: {
  children: ReactNode;
}) {
  const params = useParams();
  const kode =
    typeof params?.kode === "string"
      ? params.kode
      : Array.isArray(params?.kode)
        ? params.kode[0] || ""
        : "";

  const [draft, setDraft] = useState<VehicleEditDraft>(
    createInitialEditDraft(kode)
  );
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);

  function resetDraft() {
    setDraft(createInitialEditDraft(kode));
    setIsDraftHydrated(false);
  }

  function hydrateDraft(data: Partial<VehicleEditDraft>) {
    setDraft((prev: VehicleEditDraft) => ({
      ...createInitialEditDraft(kode),
      ...prev,
      ...data,
      mode: "edit",
      source: "owner",
      kode: String(data?.kode || prev?.kode || kode || ""),
      verification: {
        ...(prev?.verification || {}),
        ...(data?.verification || {}),
      },
    }));
    setIsDraftHydrated(true);
  }

  const value = useMemo(
    () => ({
      draft,
      setDraft,
      resetDraft,
      hydrateDraft,
      kode,
      isDraftHydrated,
      setIsDraftHydrated,
    }),
    [draft, kode, isDraftHydrated]
  );

  return (
    <VehicleEditDraftContext.Provider value={value}>
      {children}
    </VehicleEditDraftContext.Provider>
  );
}