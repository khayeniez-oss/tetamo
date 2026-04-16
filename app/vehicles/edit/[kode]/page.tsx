import { Suspense } from "react";
import EditPageClient from "./EditPageClient";

export default function VehicleEditPage() {
  return (
    <Suspense fallback={null}>
      <EditPageClient />
    </Suspense>
  );
}