import { Suspense } from "react";
import MediaPageClient from "./MediaPageClient";

export default function VehicleEditMediaPage() {
  return (
    <Suspense fallback={null}>
      <MediaPageClient />
    </Suspense>
  );
}