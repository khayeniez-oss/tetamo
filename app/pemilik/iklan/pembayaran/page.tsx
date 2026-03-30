import { Suspense } from "react";
import PemilikIklanPembayaranPageClient from "./PemilikIklanPembayaranPageClient";

export default function PemilikIklanPembayaranPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white text-gray-900" />}>
      <PemilikIklanPembayaranPageClient />
    </Suspense>
  );
}