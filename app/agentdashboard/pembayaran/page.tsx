import { Suspense } from "react";
import AgentPembayaranPageClient from "./page-client";

export default function AgentPembayaranPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white text-gray-900" />}>
      <AgentPembayaranPageClient />
    </Suspense>
  );
}