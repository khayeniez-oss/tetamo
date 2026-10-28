"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

export default function ShareListingButton({ id, title, lang = "id" }: { id: string; title: string; lang?: string }) {
  const [message, setMessage] = useState("");
  const indonesian = lang === "id";
  async function share() {
    const url = `https://www.tetamo.com/properti/${encodeURIComponent(id)}`;
    setMessage("");
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        setMessage(indonesian ? "Tautan disalin" : "Link copied");
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        setMessage(indonesian ? "Gagal membagikan. Coba lagi." : "Unable to share. Try again.");
      }
    }
  }
  return <span className="inline-flex shrink-0 flex-col items-start gap-1">
    <button type="button" onClick={share} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"><Share2 size={16} />{indonesian ? "Bagikan listing" : "Share listing"}</button>
    <span role="status" aria-live="polite" className="max-w-48 text-xs text-gray-600">{message}</span>
  </span>;
}
