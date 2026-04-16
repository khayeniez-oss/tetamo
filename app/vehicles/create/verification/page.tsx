import { Suspense } from "react";
import VerificationPageClient from "./VerificationPageClient";

export default function VehiclesCreateVerificationPage() {
  return (
    <Suspense fallback={null}>
      <VerificationPageClient />
    </Suspense>
  );
}