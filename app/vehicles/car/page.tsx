import { Suspense } from "react";
import type { Metadata } from "next";
import CarPageClient from "./CarPageClient";

export const dynamic = "force-dynamic";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://www.tetamo.com";

export const metadata: Metadata = {
  title: "Cars for Sale in Indonesia | Tetamo",
  description:
    "Browse cars for sale across Indonesia on Tetamo. Explore SUVs, sedans, MPVs, EVs, and premium cars with a cleaner listing experience.",
  alternates: {
    canonical: `${SITE_URL}/vehicles/car`,
  },
  openGraph: {
    title: "Cars for Sale in Indonesia | Tetamo",
    description:
      "Browse cars for sale across Indonesia on Tetamo. Explore SUVs, sedans, MPVs, EVs, and premium cars with a cleaner listing experience.",
    url: `${SITE_URL}/vehicles/car`,
    siteName: "Tetamo",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cars for Sale in Indonesia | Tetamo",
    description:
      "Browse cars for sale across Indonesia on Tetamo. Explore SUVs, sedans, MPVs, EVs, and premium cars with a cleaner listing experience.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function CarPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white text-gray-900" />}>
      <CarPageClient />
    </Suspense>
  );
}