import { Suspense } from "react";
import MediaPageClient from "./MediaPageClient";

export default function VehicleCreateMediaPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white text-gray-900" />}>
      <MediaPageClient />
    </Suspense>
  );
}