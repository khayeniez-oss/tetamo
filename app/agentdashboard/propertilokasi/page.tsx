"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAgentListingDraft } from "@/app/agentdashboard/AgentListingDraftContext";
import ListingIklan from "@/components/listing/ListingIklan";

export default function AgentPropertiLokasiPage() {
  const router = useRouter();
  const { draft, setDraft, clearDraft } = useAgentListingDraft();

  useEffect(() => {
    setDraft((prev: any) => ({
      ...(prev || {}),
      mode: "create",
      source: "agent",
      plan: undefined,
      payment: undefined,
    }));
  }, [setDraft]);

  function handleNext() {
    router.push("/agentdashboard/propertidetail");
  }

  function handleReset() {
    clearDraft();
    router.push("/agentdashboard");
  }

  return (
    <main className="min-h-screen bg-white">
      <ListingIklan
        draft={{
          ...(draft || {}),
          mode: "create",
          source: "agent",
          plan: undefined,
        }}
        setDraft={setDraft}
        onNext={handleNext}
        onReset={handleReset}
      />
    </main>
  );
}