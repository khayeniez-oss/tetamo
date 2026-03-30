import { Suspense } from "react";
import PemilikIklanSuksesPageClient from "./PemilikIklanSuksesPageClient";

export default function PemilikIklanSuksesPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white text-gray-900" />}>
      <PemilikIklanSuksesPageClient />
    </Suspense>
  );
}