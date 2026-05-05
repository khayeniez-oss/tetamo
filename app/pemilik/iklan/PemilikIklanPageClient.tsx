"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { usePemilikDraftListing } from "./layout";
import ListingIklan from "@/components/listing/ListingIklan";

type OwnerPlan = "basic" | "priority" | "featured";

export default function PemilikIklanPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { draft, setDraft, clearDraft } = usePemilikDraftListing();

  const currentPlan = useMemo<OwnerPlan>(() => {
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
      payment: {
        ...(prev?.payment || {}),
        planId: currentPlan,
      },
    }));
  }, [currentPlan, setDraft]);

  function handleNext() {
    router.push(`/pemilik/iklan/detail?plan=${currentPlan}`);
  }

  function handleReset() {
    clearDraft();
    router.push("/pemilik");
  }

  return (
    <main className="min-h-screen bg-white">
      <ListingIklan
        draft={
          {
            ...(draft || {}),
            mode: "create",
            source: "owner",
            plan: currentPlan,
          } as any
        }
        setDraft={setDraft}
        onNext={handleNext}
        onReset={handleReset}
      />
    </main>
  );
}