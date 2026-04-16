import { Suspense } from "react";
import type { Metadata } from "next";
import MotorPageClient from "./MotorPageClient";

export const dynamic = "force-dynamic";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://www.tetamo.com";

export const metadata: Metadata = {
  title: "Motor Marketplace Indonesia | Tetamo",
  description:
    "Browse motorbike listings across Indonesia on Tetamo. Explore scooters, sport bikes, touring bikes, and more with a cleaner marketplace experience.",
  alternates: {
    canonical: `${SITE_URL}/vehicles/motor`,
  },
  openGraph: {
    title: "Motor Marketplace Indonesia | Tetamo",
    description:
      "Browse motorbike listings across Indonesia on Tetamo. Explore scooters, sport bikes, touring bikes, and more with a cleaner marketplace experience.",
    url: `${SITE_URL}/vehicles/motor`,
    siteName: "Tetamo",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Motor Marketplace Indonesia | Tetamo",
    description:
      "Browse motorbike listings across Indonesia on Tetamo. Explore scooters, sport bikes, touring bikes, and more with a cleaner marketplace experience.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function MotorPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white text-gray-900" />}>
      <MotorPageClient />
    </Suspense>
  );
}