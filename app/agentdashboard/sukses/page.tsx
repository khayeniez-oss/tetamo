import { Suspense } from "react";
import AgentSuksesPageClient from "./AgentSuksesPageClient";

export default function AgentSuksesPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white" />}>
      <AgentSuksesPageClient />
    </Suspense>
  );
}