import { Suspense } from "react";
import PropertiPageClient from "./PropertiPageClient";

export default function PropertiPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white text-gray-900" />}>
      <PropertiPageClient />
    </Suspense>
  );
}