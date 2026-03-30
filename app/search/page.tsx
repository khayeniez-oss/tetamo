import { Suspense } from "react";
import SearchPageContent from "./client";

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-6 py-10" />}>
      <SearchPageContent />
    </Suspense>
  );
}