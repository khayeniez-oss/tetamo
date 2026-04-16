import { Suspense } from "react";
import SearchPageContent from "./client";

export default function VehicleSearchPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-6 py-10" />}>
      <SearchPageContent />
    </Suspense>
  );
}