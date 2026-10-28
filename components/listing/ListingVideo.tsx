"use client";

import { useState } from "react";
import { Download, Share2 } from "lucide-react";

export default function ListingVideo({ url, title, code, poster, lang = "id" }: {
  url?: string | null; title: string; code: string; poster?: string; lang?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const id = lang === "id";
  if (!url || !/^https?:\/\//i.test(url)) return (
    <section aria-label={id ? "Video properti" : "Property video"} className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
      <p className="text-sm font-semibold text-gray-900">{id ? "Video properti" : "Property video"}</p>
      <p className="mt-1 text-sm text-gray-600">{id ? "Belum ada video tersimpan. Pilih Edit, lalu tambahkan video pada langkah Foto & Video. Setelah disimpan, video dapat diunduh dan dibagikan di sini." : "No saved video yet. Choose Edit, then add a video in the Photos & Video step. Once saved, you can download and share it here."}</p>
    </section>
  );
  const filename = `Tetamo-${code.replace(/[^a-zA-Z0-9_-]/g, "-") || "property"}.mp4`;

  async function readVideo() {
    const response = await fetch(url!);
    if (!response.ok) throw new Error("Video unavailable");
    const blob = await response.blob();
    if (!blob.size || !blob.type.startsWith("video/")) throw new Error("Invalid video");
    return new File([blob], filename, { type: blob.type });
  }

  async function download() {
    setBusy(true); setMessage("");
    try {
      const file = await readVideo();
      const objectUrl = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = objectUrl; anchor.download = filename;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      setMessage(id ? "Unduhan video dimulai." : "Video download started.");
    } catch {
      setMessage(id ? "Video belum dapat diunduh. Buka video lalu gunakan menu simpan." : "Download unavailable. Open the video and use its save menu.");
    } finally { setBusy(false); }
  }

  async function share() {
    setBusy(true); setMessage("");
    try {
      if (navigator.share) {
        // Prefer the file when available; link sharing remains usable without CORS access.
        let file: File | undefined;
        try { file = await readVideo(); } catch { /* Share the saved URL instead. */ }
        if (file && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ title, files: [file] });
        } else {
          await navigator.share({ title, url: url! });
        }
      } else {
        await navigator.clipboard.writeText(url!);
        setMessage(id ? "Tautan video disalin. Tempel untuk membagikan." : "Video link copied. Paste it to share.");
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        setMessage(id ? "Belum dapat membagikan. Gunakan tautan Buka video di bawah." : "Unable to share. Use the Open video link below.");
      }
    } finally { setBusy(false); }
  }

  return (
    <section aria-label={id ? "Video properti" : "Property video"} className="mt-4 max-w-md rounded-2xl border border-gray-200 bg-gray-50 p-3">
      <p className="mb-2 text-sm font-semibold text-gray-900">{id ? "Video properti" : "Property video"}</p>
      <div className="flex flex-wrap items-start gap-3">
      <video src={url} poster={poster} controls playsInline preload="none" aria-label={title} className="aspect-[9/16] w-[120px] shrink-0 rounded-xl bg-black object-contain" />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
        <button type="button" disabled={busy} onClick={download} className="inline-flex items-center gap-2 rounded-xl border border-[#1C1C1E] bg-[#1C1C1E] px-3 py-2 text-sm font-semibold text-white hover:bg-black disabled:cursor-wait disabled:opacity-100"><Download size={16} />{id ? "Unduh video" : "Download video"}</button>
        <button type="button" disabled={busy} onClick={share} className="inline-flex items-center gap-2 rounded-xl border border-gray-400 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100 disabled:cursor-wait disabled:opacity-100"><Share2 size={16} />{id ? "Bagikan video" : "Share video"}</button>
        <a href={url} target="_blank" rel="noopener noreferrer" className="self-center px-2 text-sm underline">{id ? "Buka video" : "Open video"}</a>
      </div>
      </div>
      <p role="status" aria-live="polite" className="mt-2 text-xs text-gray-600">{busy ? (id ? "Menyiapkan video…" : "Preparing video…") : message}</p>
    </section>
  );
}
