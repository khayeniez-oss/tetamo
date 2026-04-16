import { Suspense } from "react";
import CreatePageClient from "./CreatePageClient";

export default function VehicleCreatePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white text-gray-900" />}>
      <CreatePageClient />
    </Suspense>
  );
}