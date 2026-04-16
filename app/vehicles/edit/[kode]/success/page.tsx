import { Suspense } from "react";
import SuccessPageClient from "./SuccessPageClient";

export default function VehicleEditSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessPageClient />
    </Suspense>
  );
}