"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { usePemilikDraftListing } from "./layout";
import ListingIklan from "@/components/listing/ListingIklan";

export default function PemilikIklanPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { draft, setDraft, clearDraft } = usePemilikDraftListing();

  const currentPlan = useMemo<"basic" | "featured">(() => {
    const planFromUrl = searchParams.get("plan");
    return planFromUrl === "featured" ? "featured" : "basic";
  }, [searchParams]);

  useEffect(() => {
    setDraft((prev) => ({
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
        draft={{
          ...(draft || {}),
          mode: "create",
          source: "owner",
          plan: currentPlan,
        }}
        setDraft={setDraft}
        onNext={handleNext}
        onReset={handleReset}
      />
    </main>
  );
}