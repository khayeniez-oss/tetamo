import { Suspense } from "react";
import type { Metadata } from "next";
import CarPageClient from "./CarPageClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Car Marketplace Indonesia | Tetamo",
  description:
    "Browse dummy car listings on Tetamo with the same marketplace UI style used for property listings.",
};

export default function CarPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white text-gray-900" />}>
      <CarPageClient />
    </Suspense>
  );
}