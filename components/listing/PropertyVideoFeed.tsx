"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { PropertyCardFacts } from "./PropertyCardFacts";
import OpeningFrameVideo from "./OpeningFrameVideo";
import ShareListingButton from "./ShareListingButton";

type VideoProperty = {
  poster?: string; id: string; slug: string | null; title: string; title_id: string | null; video_url: string;
  price: number | null; sale_price: number | null; rent_price: number | null;
  listing_type: string; rental_type: string | null; property_type: string;
  city: string | null; province: string | null; bedrooms: number | null; bathrooms: number | null;
  land_size: number | null; land_unit: string | null; building_size: number | null;
};

export default function PropertyVideoFeed({ lang = "id", slider = false, fullWidth = false }: { lang?: string; slider?: boolean; fullWidth?: boolean }) {
  const [videos, setVideos] = useState<VideoProperty[]>([]);
  const [loaded, setLoaded] = useState(false);
  const rail = useRef<HTMLDivElement>(null);
  const id = lang === "id";
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      if (document.visibilityState === "hidden") return;
      try {
        const response = await fetch("/api/property-videos", { signal: controller.signal, cache: "no-store" });
        if (response.ok) setVideos((await response.json()).videos);
      } catch { /* Preserve current cards during a transient network failure. */ }
      finally { if (!controller.signal.aborted) setLoaded(true); }
    }
    void refresh();
    const timer = setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => { controller.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  const money = (value: number | null) => new Intl.NumberFormat(id ? "id-ID" : "en-US", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);
  return <section className={fullWidth ? "my-12 w-full min-w-0" : "mx-auto my-12 w-full max-w-7xl px-4 sm:px-6"} aria-label={id ? "Video properti terbaru" : "Latest property videos"}>
    <div className="mb-5 flex items-center justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-widest text-[#B8860B]">Tetamo Video</p><h2 className="mt-2 text-2xl font-bold">{id ? "Jelajahi properti lewat video" : "Explore properties through video"}</h2><p className="mt-1 text-sm text-gray-500">{id ? "Video terbaru dari properti yang tersedia." : "The latest videos from available properties."}</p></div>
      {slider && <div className="flex gap-2"><button type="button" aria-label={id ? "Video sebelumnya" : "Previous videos"} onClick={() => rail.current?.scrollBy({ left: -rail.current.clientWidth, behavior: "smooth" })} className="rounded-full border p-2"><ChevronLeft size={20} /></button><button type="button" aria-label={id ? "Video berikutnya" : "Next videos"} onClick={() => rail.current?.scrollBy({ left: rail.current.clientWidth, behavior: "smooth" })} className="rounded-full border p-2"><ChevronRight size={20} /></button></div>}
    </div>
    <div ref={rail} className={slider ? "flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4" : "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4"}>
      {videos.slice(0, slider ? 10 : 4).map(property => {
        const title = id ? property.title_id || property.title : property.title;
        const period = ({ daily: id ? "hari" : "day", monthly: id ? "bulan" : "month", yearly: id ? "tahun" : "year", harian: "hari", bulanan: "bulan", tahunan: "tahun" } as Record<string, string>)[property.rental_type || ""];
        const rent = property.listing_type === "disewa";
        return <article key={`${property.id}:${property.video_url}`} className={`overflow-hidden rounded-3xl border border-[#E8E2D8] bg-white ${slider ? "w-[78vw] max-w-[300px] shrink-0 snap-start sm:w-[280px]" : "min-w-0"}`}>
          <OpeningFrameVideo src={property.video_url} label={title} className="aspect-[9/16] w-full bg-black object-contain" />
          <div className="space-y-3 p-4"><p className="text-xs font-semibold text-[#8A650B]">{property.property_type} · {rent ? (id ? "Disewa" : "For rent") : property.listing_type === "dijual_disewa" ? (id ? "Dijual & Disewa" : "Sale & rent") : property.listing_type === "lelang" ? (id ? "Lelang" : "Auction") : (id ? "Dijual" : "For sale")}</p>
            <p className="text-sm text-gray-500">{[property.city, property.province].filter(Boolean).join(", ")}</p>
            <p className="font-bold text-[#9A7119]">{money(rent ? property.rent_price ?? property.price : property.sale_price ?? property.price)}{rent && period ? ` / ${period}` : ""}</p>
            {property.listing_type === "dijual_disewa" && <p className="text-sm">{money(property.rent_price)}{period ? ` / ${period}` : ""}</p>}
            <PropertyCardFacts data={property} lang={lang} />
            <div className="flex flex-wrap items-center gap-2">
              <a href={`/properti/${property.slug || property.id}`} aria-label={`${id ? "Lihat properti" : "View property"}: ${title}`} className="inline-flex min-h-9 items-center gap-1 py-1 text-xs font-semibold text-[#9A7119] underline-offset-4 hover:text-[#6F5010] hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B8860B]">{id ? "Lihat properti" : "View property"}<ArrowUpRight size={13} aria-hidden="true" /></a>
              <ShareListingButton id={property.id} title={title} lang={lang} />
            </div>
          </div>
        </article>;
      })}
    </div>
    {!videos.length && <p className="rounded-2xl bg-[#F8F6F1] p-6 text-sm text-gray-500">{loaded ? (id ? "Video properti terbaru akan tampil di sini setelah tersedia." : "New property videos will appear here when available.") : (id ? "Memuat video…" : "Loading videos…")}</p>}
  </section>;
}
