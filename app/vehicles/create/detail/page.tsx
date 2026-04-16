import { Suspense } from "react";
import VehicleCreateDetailPageClient from "./VehicleCreateDetailPageClient";

export default function VehicleCreateDetailPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white text-gray-900" />}>
      <VehicleCreateDetailPageClient />
    </Suspense>
  );
}