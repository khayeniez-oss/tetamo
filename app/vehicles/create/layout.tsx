"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type VehicleDraft = any;

type VehicleDraftContextType = {
  draft: VehicleDraft;
  setDraft: React.Dispatch<React.SetStateAction<VehicleDraft>>;
  resetDraft: () => void;
};

const VehicleDraftContext = createContext<VehicleDraftContextType | null>(null);

export function useVehicleDraftListing() {
  const context = useContext(VehicleDraftContext);

  if (!context) {
    throw new Error(
      "useVehicleDraftListing must be used within app/vehicles/create/layout.tsx"
    );
  }

  return context;
}

export default function VehicleCreateLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [draft, setDraft] = useState<VehicleDraft>({
    mode: "create",
    source: "owner",
    plan: "basic",

    vehicleType: "",
    listingType: "",
    kode: "",
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

    images: [],
    video: null,

    paymentStatus: "",
    paymentMethod: "",
  });

  function resetDraft() {
    setDraft({
      mode: "create",
      source: "owner",
      plan: "basic",

      vehicleType: "",
      listingType: "",
      kode: "",
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

      images: [],
      video: null,

      paymentStatus: "",
      paymentMethod: "",
    });
  }

  const value = useMemo(
    () => ({
      draft,
      setDraft,
      resetDraft,
    }),
    [draft]
  );

  return (
    <VehicleDraftContext.Provider value={value}>
      {children}
    </VehicleDraftContext.Provider>
  );
}