"use client";

import { useCallback, useEffect, useMemo, useRef, type ComponentProps } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  usePemilikDraftListing,
  type PemilikListingDraft,
} from "./layout";
import ListingIklan from "@/components/listing/ListingIklan";

type OwnerPlan = "basic" | "priority" | "featured";
type DraftRecord = Record<string, unknown>;

type ListingIklanProps = ComponentProps<typeof ListingIklan>;
type ListingIklanDraft = ListingIklanProps["draft"];
type ListingIklanSetDraft = ListingIklanProps["setDraft"];

function toRecord(value: unknown): DraftRecord {
  if (typeof value === "object" && value !== null) {
    return value as DraftRecord;
  }

  return {};
}

export default function PemilikIklanPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { draft, setDraft, clearDraft } = usePemilikDraftListing();

  const currentPlan = useMemo<OwnerPlan>(() => {
    const planFromUrl = searchParams.get("plan");

    if (planFromUrl === "priority") return "priority";
    if (planFromUrl === "featured") return "featured";

    if (planFromUrl === "basic") return "basic";
    return draft?.plan || "basic";
  }, [searchParams, draft?.plan]);

  const freshStart = searchParams.get("new") === "1";
  const resetStarted = useRef(false);
  useEffect(() => {
    if (!freshStart || resetStarted.current) return;
    resetStarted.current = true;
    clearDraft();
    setDraft(previous => ({ ...previous, plan: currentPlan, mediaFolder: crypto.randomUUID() }));
    router.replace(`/pemilik/iklan?plan=${currentPlan}`);
  }, [freshStart, clearDraft, setDraft, currentPlan, router]);

  const listingDraft = useMemo<ListingIklanDraft>(() => {
    const draftRecord = toRecord(draft);

    return {
      ...draftRecord,
      mode: "create",
      source: "owner",
      plan: currentPlan,
      payment: {
        ...toRecord(draftRecord.payment),
        planId: currentPlan,
      },
    } as unknown as ListingIklanDraft;
  }, [draft, currentPlan]);

  const handleSetDraft = useCallback<ListingIklanSetDraft>(
    (updater) => {
      setDraft((prev) => {
        const previousDraft = toRecord(prev);

        const updatedDraft = updater(
          previousDraft as NonNullable<ListingIklanDraft>
        );

        return updatedDraft as unknown as PemilikListingDraft;
      });
    },
    [setDraft]
  );

  function handleNext() {
    setDraft((prev) => {
      const previousDraft = toRecord(prev);

      return {
        ...previousDraft,
        mode: "create",
        source: "owner",
        plan: currentPlan,
        payment: {
          ...toRecord(previousDraft.payment),
          planId: currentPlan,
        },
      } as unknown as PemilikListingDraft;
    });

    router.push(`/pemilik/iklan/detail?plan=${currentPlan}`);
  }

  function handleReset() {
    clearDraft();
    router.push("/pemilik");
  }

  if (freshStart) return <main className="p-8 text-sm text-gray-500">Menyiapkan listing baru…</main>;

  return (
    <main className="min-h-screen bg-white">
      <ListingIklan
        draft={listingDraft}
        setDraft={handleSetDraft}
        onNext={handleNext}
        onReset={handleReset}
      />
    </main>
  );
}