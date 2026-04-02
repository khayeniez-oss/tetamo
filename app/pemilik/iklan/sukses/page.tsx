import { Suspense } from "react";
import PemilikIklanSuksesPageClient from "./PemilikIklanSuksesPageClient";

function LoadingFallback() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-3xl px-4 py-10 text-center sm:px-6 sm:py-14 md:py-16">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          Loading payment status...
        </div>
      </div>
    </main>
  );
}

export default function PemilikIklanSuksesPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PemilikIklanSuksesPageClient />
    </Suspense>
  );
}