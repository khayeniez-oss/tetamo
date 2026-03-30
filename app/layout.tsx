import "./globals.css";
import type { Metadata } from "next";
import Navbar from "../components/Navbar";
import { LanguageProvider } from "./context/LanguageContext";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.tetamo.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Tetamo",
    template: "%s | Tetamo",
  },
  description: "Tetamo",
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
          <Navbar />
          {children}
          <footer className="border-t border-gray-100 py-10 text-center text-sm text-gray-500">
            ©️ 2025 Tetamo Pty Ltd (ABN 18 689 780 970). All rights reserved.
          </footer>
        </LanguageProvider>
      </body>
    </html>
  );
}