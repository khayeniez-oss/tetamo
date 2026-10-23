"use client";
import { useState } from "react";

export function ListingAvatar({ src, name }: { src?: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name.trim().split(/\s+/).slice(0, 2).map(s => s[0]).join("").toUpperCase();
  return <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E5DFD2] bg-[#EEE9DF] text-xs font-bold text-[#675B40]">
    {src && !failed ? <img src={src} alt={name} loading="lazy" className="h-full w-full object-cover" onError={() => setFailed(true)} /> : <span aria-label={name}>{initials || "T"}</span>}
  </span>;
}
