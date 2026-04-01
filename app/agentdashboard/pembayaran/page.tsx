import { Suspense } from "react";
import AgentPembayaranPageClient from "./page-client";

function LoadingFallback() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 text-sm text-gray-500 shadow-sm sm:p-6">
          Loading payment page...
        </div>
      </div>
    </main>
  );
}

export default function AgentPembayaranPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AgentPembayaranPageClient />
    </Suspense>
  );
}