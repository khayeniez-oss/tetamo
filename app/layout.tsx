import "./globals.css";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import { LanguageProvider } from "./context/LanguageContext";
import { CurrencyProvider } from "./context/CurrencyContext";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://www.tetamo.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Tetamo | Property Marketplace Indonesia",
    template: "%s | Tetamo",
  },
  description:
    "Browse properties for sale and rent in Indonesia with Tetamo.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    siteName: "Tetamo",
    type: "website",
    locale: "en_US",
    title: "Tetamo | Property Marketplace Indonesia",
    description:
      "Browse properties for sale and rent in Indonesia with Tetamo.",
    url: `${siteUrl}/`,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-white text-gray-900">
        <LanguageProvider>
          <CurrencyProvider>
            <Navbar />
            {children}
            <FloatingWhatsApp />
            <footer className="border-t border-gray-100 py-10 text-center text-sm text-gray-500">
              ©️ 2025 Tetamo Pty Ltd (ABN 18 689 780 970). All rights reserved.
            </footer>
          </CurrencyProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}