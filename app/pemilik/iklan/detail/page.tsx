import { Suspense } from "react";
import PemilikIklanDetailPageClient from "./PemilikIklanDetailPageClient";

export default function PemilikIklanDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <PemilikIklanDetailPageClient />
    </Suspense>
  );
}