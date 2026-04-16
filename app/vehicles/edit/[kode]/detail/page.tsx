import { Suspense } from "react";
import DetailPageClient from "./DetailPageClient";

export default function VehicleEditDetailPage() {
  return (
    <Suspense fallback={null}>
      <DetailPageClient />
    </Suspense>
  );
}