import { Suspense } from "react";
import type { Metadata } from "next";
import MotorPageClient from "./MotorPageClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Motor Marketplace Indonesia | Tetamo",
  description:
    "Browse dummy motorbike listings on Tetamo with the same marketplace UI style used for property and car listings.",
};

export default function MotorPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white text-gray-900" />}>
      <MotorPageClient />
    </Suspense>
  );
}