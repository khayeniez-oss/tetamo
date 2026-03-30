import { Suspense } from "react";
import PemilikIklanPageClient from "./PemilikIklanPageClient";

export default function PemilikIklanPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white" />}>
      <PemilikIklanPageClient />
    </Suspense>
  );
}