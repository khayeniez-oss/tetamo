import { Suspense } from "react";
import PemilikIklanVerifikasiPageClient from "./PemilikIklanVerifikasiPageClient";

export default function PemilikIklanVerifikasiPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white" />}>
      <PemilikIklanVerifikasiPageClient />
    </Suspense>
  );
}