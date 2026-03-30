import { Suspense } from "react";
import PemilikIklanFotoPageClient from "./PemilikIklanFotoPageClient";

export default function PemilikIklanFotoPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white" />}>
      <PemilikIklanFotoPageClient />
    </Suspense>
  );
}