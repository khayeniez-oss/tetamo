"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePemilikDraftListing } from "../layout";
import ListingFoto from "@/components/listing/ListingFoto";

type PlanType = "basic" | "featured";

export default function PemilikIklanFotoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { draft, setDraft } = usePemilikDraftListing();

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
    router.push(`/pemilik/iklan/detail?plan=${currentPlan}`);
  }

  function onNext() {
    router.push(`/pemilik/iklan/verifikasi?plan=${currentPlan}`);
  }

  return (
    <main className="min-h-screen bg-white">
      <ListingFoto
        draft={{
          ...(draft || {}),
          mode: "create",
          source: "owner",
          plan: currentPlan,
        }}
        setDraft={setDraft}
        onBack={onBack}
        onNext={onNext}
      />
    </main>
  );
}