"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/app/context/LanguageContext";
import {
  Crown,
  Heart,
  Bookmark,
  Share2,
  Star,
  CarFront,
  Bike,
} from "lucide-react";

type VehicleItem = {
  id: string;
  category: "car" | "motor";
  title: string;
  images: string[];
  price: number;
  location: string;
  year: string;
  transmission: string;
  fuel: string;
  mileage: string;
  posterName: string;
  postedByType: "owner" | "agent" | "dealer";
  whatsapp: string;
  kode?: string;
  postedDate?: string;
  verifiedListing: boolean;
};

type DealerItem = {
  id: string;
  name: string;
  photo: string;
  location: string;
  company: string;
  experience: string;
  whatsapp: string;
  verified: boolean;
};

const FEATURED_VEHICLES: VehicleItem[] = [
  {
    id: "vh-1",
    category: "car",
    title: "Toyota Fortuner VRZ 2023",
    images: [
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80",
    ],
    price: 685000000,
    location: "Jakarta Selatan",
    year: "2023",
    transmission: "Automatic",
    fuel: "Diesel",
    mileage: "18.000 km",
    posterName: "Tetamo Auto Partner",
    postedByType: "dealer",
    whatsapp: "6281234567890",
    kode: "VHC-TTM-001",
    postedDate: "16 Apr 2026",
    verifiedListing: true,
  },
  {
    id: "vh-2",
    category: "car",
    title: "Honda HR-V SE 2022",
    images: [
      "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80",
    ],
    price: 382000000,
    location: "Bandung",
    year: "2022",
    transmission: "Automatic",
    fuel: "Petrol",
    mileage: "24.000 km",
    posterName: "Rama Pratama",
    postedByType: "owner",
    whatsapp: "6281234567891",
    kode: "VHC-TTM-002",
    postedDate: "15 Apr 2026",
    verifiedListing: true,
  },
  {
    id: "vh-3",
    category: "motor",
    title: "Yamaha XMAX Connected 2024",
    images: [
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1622185135505-2d7950039943?auto=format&fit=crop&w=1200&q=80",
    ],
    price: 69000000,
    location: "Denpasar",
    year: "2024",
    transmission: "Automatic",
    fuel: "Petrol",
    mileage: "3.200 km",
    posterName: "Tetamo Moto Partner",
    postedByType: "dealer",
    whatsapp: "6281234567892",
    kode: "VHM-TTM-001",
    postedDate: "14 Apr 2026",
    verifiedListing: true,
  },
];

const OWNER_VEHICLES: VehicleItem[] = [
  {
    id: "ov-1",
    category: "car",
    title: "Mazda CX-5 Elite 2022",
    images: [
      "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=1200&q=80",
    ],
    price: 528000000,
    location: "Denpasar",
    year: "2022",
    transmission: "Automatic",
    fuel: "Petrol",
    mileage: "17.000 km",
    posterName: "Kevin Wijaya",
    postedByType: "owner",
    whatsapp: "6281234567893",
    kode: "VHC-TTM-003",
    postedDate: "13 Apr 2026",
    verifiedListing: true,
  },
  {
    id: "ov-2",
    category: "motor",
    title: "Honda ADV 160 2024",
    images: [
      "https://images.unsplash.com/photo-1622185135825-d5fc1d3f1c7d?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80",
    ],
    price: 42000000,
    location: "Surabaya",
    year: "2024",
    transmission: "Automatic",
    fuel: "Petrol",
    mileage: "1.900 km",
    posterName: "Andre Kurniawan",
    postedByType: "owner",
    whatsapp: "6281234567894",
    kode: "VHM-TTM-002",
    postedDate: "12 Apr 2026",
    verifiedListing: false,
  },
  {
    id: "ov-3",
    category: "car",
    title: "Hyundai Ioniq 5 Prime 2024",
    images: [
      "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1486496572940-2bb2341fdbdf?auto=format&fit=crop&w=1200&q=80",
    ],
    price: 845000000,
    location: "BSD City",
    year: "2024",
    transmission: "Automatic",
    fuel: "Electric",
    mileage: "6.000 km",
    posterName: "Angelina Hartono",
    postedByType: "owner",
    whatsapp: "6281234567895",
    kode: "VHC-TTM-004",
    postedDate: "11 Apr 2026",
    verifiedListing: true,
  },
];

const FEATURED_DEALERS: DealerItem[] = [
  {
    id: "dealer-1",
    name: "Tetamo Auto Partner",
    photo:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
    location: "Jakarta",
    company: "Tetamo Auto Network",
    experience: "Featured Dealer",
    whatsapp: "6281234567890",
    verified: true,
  },
  {
    id: "dealer-2",
    name: "Prima Motorhouse",
    photo:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80",
    location: "Bandung",
    company: "Prima Motorhouse",
    experience: "Car & Motor Specialist",
    whatsapp: "6281234567896",
    verified: true,
  },
  {
    id: "dealer-3",
    name: "Luxury Wheels ID",
    photo:
      "https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=600&q=80",
    location: "Surabaya",
    company: "Luxury Wheels Indonesia",
    experience: "Premium Vehicles",
    whatsapp: "6281234567897",
    verified: true,
  },
];

function formatIdr(value: number | null | undefined) {
  if (typeof value !== "number") return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function translateTransmission(value: string, lang: string) {
  const v = value.toLowerCase();
  if (v === "automatic") return lang === "id" ? "Automatic" : "Automatic";
  if (v === "manual") return lang === "id" ? "Manual" : "Manual";
  return value;
}

function translateFuel(value: string, lang: string) {
  const v = value.toLowerCase();
  if (v === "petrol") return lang === "id" ? "Bensin" : "Petrol";
  if (v === "diesel") return lang === "id" ? "Diesel" : "Diesel";
  if (v === "electric") return lang === "id" ? "Listrik" : "Electric";
  if (v === "hybrid") return lang === "id" ? "Hybrid" : "Hybrid";
  return value;
}

function SocialBtn({
  href,
  label,
  children,
}: {
  href?: string;
  label: string;
  children: React.ReactNode;
}) {
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white transition hover:bg-gray-50"
    >
      {children}
    </a>
  );
}

function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#1C1C1E]" fill="none">
      <path
        d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M12 16a4 4 0 100-8 4 4 0 000 8Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M17.5 6.5h.01"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#1C1C1E]" fill="none">
      <path
        d="M14 8h2V5h-2c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.4l.6-3H13V9c0-.6.4-1 1-1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconLinkedIn() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#1C1C1E]" fill="none">
      <path d="M6.5 9.5H4V20h2.5V9.5Z" fill="currentColor" />
      <path
        d="M5.25 8.2a1.45 1.45 0 110-2.9 1.45 1.45 0 010 2.9Z"
        fill="currentColor"
      />
      <path
        d="M20 14.1V20h-2.5v-5.4c0-1.3-.5-2.2-1.7-2.2-1 0-1.6.7-1.9 1.3-.1.3-.1.7-.1 1.1V20H11.3V9.5h2.4v1.4c.3-.6 1.2-1.5 2.8-1.5 1.9 0 3.5 1.2 3.5 3.7Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconTikTok() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#1C1C1E]" fill="none">
      <path
        d="M12.75 2h2.25a4.5 4.5 0 004.5 4.5v2.25a6.75 6.75 0 01-4.5-1.6v6.35a5.25 5.25 0 11-5.25-5.25c.27 0 .54.02.8.07v2.3a3 3 0 102.2 2.88V2z"
        fill="currentColor"
      />
    </svg>
  );
}

function SectionEmpty({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
      {text}
    </div>
  );
}

function InfoCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 text-left shadow-sm sm:p-5">
      <h3 className="mb-2 text-base font-semibold text-[#1C1C1E] sm:text-lg">
        {title}
      </h3>
      <p className="text-sm leading-6 text-gray-600 sm:leading-7">
        {description}
      </p>
    </div>
  );
}

function VehicleEngagementBar({
  labelSave,
  labelLike,
  labelShare,
  labelRating,
}: {
  labelSave: string;
  labelLike: string;
  labelShare: string;
  labelRating: string;
}) {
  const [saved, setSaved] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saveCount, setSaveCount] = useState(12);
  const [likeCount, setLikeCount] = useState(20);
  const [shareCount, setShareCount] = useState(7);
  const [ratingAvg, setRatingAvg] = useState(4.8);
  const [ratingCount, setRatingCount] = useState(16);
  const [userRating, setUserRating] = useState(0);

  function toggleSave() {
    const next = !saved;
    setSaved(next);
    setSaveCount((prev) => Math.max(0, prev + (next ? 1 : -1)));
  }

  function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikeCount((prev) => Math.max(0, prev + (next ? 1 : -1)));
  }

  function handleShare() {
    setShareCount((prev) => prev + 1);
  }

  function handleRate(value: number) {
    const current = userRating;
    const next = current === value ? 0 : value;

    let total = ratingAvg * ratingCount;
    let count = ratingCount;

    if (current > 0) {
      total -= current;
      count -= 1;
    }

    if (next > 0) {
      total += next;
      count += 1;
    }

    setUserRating(next);
    setRatingCount(Math.max(0, count));
    setRatingAvg(count > 0 ? Number((total / count).toFixed(1)) : 0);
  }

  return (
    <>
      <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-3">
        <button
          type="button"
          onClick={toggleSave}
          className={`flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 text-center text-[10px] font-semibold shadow-sm transition sm:text-[11px] ${
            saved
              ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
              : "border-gray-200 bg-white text-[#1C1C1E] hover:bg-gray-50"
          }`}
        >
          <Bookmark className="h-4 w-4" />
          <span>
            {labelSave} ({saveCount})
          </span>
        </button>

        <button
          type="button"
          onClick={toggleLike}
          className={`flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 text-center text-[10px] font-semibold shadow-sm transition sm:text-[11px] ${
            liked
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-gray-200 bg-white text-[#1C1C1E] hover:bg-gray-50"
          }`}
        >
          <Heart className="h-4 w-4" />
          <span>
            {labelLike} ({likeCount})
          </span>
        </button>

        <div className="flex min-h-[60px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-2 py-2 text-center shadow-sm">
          <div className="text-sm font-extrabold text-[#1C1C1E] sm:text-base">
            {ratingAvg.toFixed(1)}
          </div>
          <div className="mt-1 text-[10px] text-gray-500 sm:text-[11px]">
            {labelRating} ({ratingCount})
          </div>
        </div>

        <button
          type="button"
          onClick={handleShare}
          className="flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl border border-gray-200 bg-white px-2 py-2 text-center shadow-sm transition hover:bg-gray-50"
        >
          <Share2 className="h-4 w-4 text-[#1C1C1E]" />
          <span className="text-[10px] font-semibold text-[#1C1C1E] sm:text-[11px]">
            {labelShare} ({shareCount})
          </span>
        </button>
      </div>

      <div className="mt-3 flex items-center justify-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => handleRate(value)}
            className={`rounded-full border p-[4px] transition ${
              userRating >= value
                ? "border-amber-200 bg-amber-50 text-amber-500"
                : "border-gray-200 bg-white text-gray-300 hover:bg-gray-50"
            }`}
            aria-label={`Rate ${value}`}
            title={`Rate ${value}`}
          >
            <Star
              className="h-3.5 w-3.5"
              fill={userRating >= value ? "currentColor" : "transparent"}
            />
          </button>
        ))}
      </div>
    </>
  );
}

function ScheduleTestDriveButton({
  title,
  code,
}: {
  title: string;
  code?: string;
}) {
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const submitDisabled = !selectedDate || !selectedTime;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 w-full rounded-2xl bg-[#B8860B] px-4 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
      >
        {lang === "id" ? "Schedule Test Drive" : "Schedule Test Drive"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-4">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50"
            aria-label="Close Schedule Test Drive popup"
          />

          <div className="relative z-10 w-full max-w-lg rounded-3xl bg-white p-5 shadow-xl sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-[#1C1C1E]">
                  {lang === "id" ? "Jadwal Test Drive" : "Schedule Test Drive"}
                </h3>
                <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                  {title}
                  {code ? ` • ${code}` : ""}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full px-3 py-1 text-sm font-semibold text-[#1C1C1E] hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#1C1C1E]">
                  {lang === "id" ? "Pilih Tanggal" : "Select Date"}
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1C1C1E]">
                  {lang === "id" ? "Pilih Jam" : "Select Time"}
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {["10:00", "11:00", "13:00", "15:00", "17:00"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedTime(t)}
                      className={[
                        "rounded-full border px-4 py-2 text-sm",
                        selectedTime === t
                          ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                          : "border-gray-200 bg-white text-[#1C1C1E]",
                      ].join(" ")}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={submitDisabled}
                onClick={() => {
                  alert(
                    lang === "id"
                      ? "Dummy test drive request sent."
                      : "Dummy test drive request sent."
                  );
                  setOpen(false);
                  setSelectedDate("");
                  setSelectedTime("");
                }}
                className={[
                  "w-full rounded-2xl px-4 py-3 text-sm font-semibold transition",
                  !submitDisabled
                    ? "bg-[#B8860B] text-white hover:opacity-90"
                    : "cursor-not-allowed bg-gray-200 text-gray-500",
                ].join(" ")}
              >
                {lang === "id"
                  ? "Kirim Permintaan Test Drive"
                  : "Send Test Drive Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function VehicleCard({
  item,
  ownerMode = false,
}: {
  item: VehicleItem;
  ownerMode?: boolean;
}) {
  const { lang } = useLanguage();
  const [imgIndex, setImgIndex] = useState(0);

  const next = () =>
    setImgIndex((prev) => (prev === item.images.length - 1 ? 0 : prev + 1));

  const prev = () =>
    setImgIndex((prev) => (prev === 0 ? item.images.length - 1 : prev - 1));

  const whatsappMessage =
    lang === "id"
      ? `Halo, saya melihat kendaraan ini di TETAMO dan tertarik.

Kode: ${item.kode || "-"}
Unit: ${item.title}
Lokasi: ${item.location}
Harga: ${formatIdr(item.price)}

Apakah unit ini masih tersedia?`
      : `Hello, I saw this vehicle on TETAMO and I am interested.

Code: ${item.kode || "-"}
Unit: ${item.title}
Location: ${item.location}
Price: ${formatIdr(item.price)}

Is this unit still available?`;

  const whatsappHref = item.whatsapp
    ? `https://wa.me/${item.whatsapp}?text=${encodeURIComponent(
        whatsappMessage
      )}`
    : "#";

  function getVerifiedBadgeText() {
    if (item.postedByType === "owner") {
      return lang === "id" ? "Pemilik Terverifikasi" : "Verified Owner";
    }

    if (item.postedByType === "dealer") {
      return lang === "id" ? "Dealer Terverifikasi" : "Verified Dealer";
    }

    return lang === "id" ? "Agen Terverifikasi" : "Verified Agent";
  }

  function getPosterLabel() {
    if (item.postedByType === "owner") {
      return lang === "id" ? "Pemilik" : "Owner";
    }

    if (item.postedByType === "dealer") {
      return lang === "id" ? "Dealer" : "Dealer";
    }

    return lang === "id" ? "Agen" : "Agent";
  }

  function getCategoryLabel() {
    if (item.category === "motor") {
      return lang === "id" ? "Motor" : "Motor";
    }
    return lang === "id" ? "Mobil" : "Car";
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
      <div className="relative">
        <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
          <div className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-[#1C1C1E] sm:text-xs">
            {getCategoryLabel()}
          </div>

          {item.verifiedListing ? (
            <div className="rounded-full bg-[#1C1C1E] px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">
              {getVerifiedBadgeText()}
            </div>
          ) : (
            <div className="rounded-full bg-gray-200 px-3 py-1 text-[11px] font-semibold text-gray-800 sm:text-xs">
              {lang === "id" ? "Pending Verifikasi" : "Pending Verification"}
            </div>
          )}
        </div>

        {ownerMode ? null : (
          <div className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-[#B8860B] px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">
            <Crown className="h-3.5 w-3.5" />
            {lang === "id" ? "Unggulan" : "Featured"}
          </div>
        )}

        <img
          src={item.images[imgIndex]}
          alt={item.title}
          className="h-[410px] w-full object-cover sm:h-[360px] lg:h-[420px]"
        />

        <div className="absolute right-3 bottom-3 rounded-full bg-[#1C1C1E]/80 px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">
          TETAMO
        </div>

        <button
          onClick={prev}
          type="button"
          className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#1C1C1E]/70 text-lg text-white transition hover:bg-[#1C1C1E]"
          aria-label="Previous image"
        >
          ‹
        </button>

        <button
          onClick={next}
          type="button"
          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#1C1C1E]/70 text-lg text-white transition hover:bg-[#1C1C1E]"
          aria-label="Next image"
        >
          ›
        </button>
      </div>

      <div className="p-4 sm:p-5">
        <h3 className="text-lg font-bold text-[#1C1C1E] sm:text-xl">
          {formatIdr(item.price)}
        </h3>

        <h4 className="mt-2 text-[15px] font-semibold leading-6 text-[#1C1C1E] sm:text-base">
          {item.title}
        </h4>

        <p className="mt-1 text-sm text-gray-600">{item.location}</p>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          {item.year} • {translateTransmission(item.transmission, lang)} •{" "}
          {translateFuel(item.fuel, lang)} • {item.mileage}
        </p>

        <div className="mt-3">
          <p className="text-sm text-gray-600">
            {getPosterLabel()}:{" "}
            <span className="font-semibold text-gray-800">{item.posterName}</span>
          </p>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            {item.kode && (
              <span>
                {lang === "id" ? "Kode:" : "Code:"}{" "}
                <span className="font-medium text-gray-700">{item.kode}</span>
              </span>
            )}

            {item.postedDate && (
              <span>
                {lang === "id" ? "Tayang:" : "Posted:"}{" "}
                <span className="font-medium text-gray-700">{item.postedDate}</span>
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <a
            href={whatsappHref}
            onClick={(e) => {
              if (!item.whatsapp) e.preventDefault();
            }}
            target="_blank"
            rel="noreferrer"
            className={`flex min-h-[48px] items-center justify-center rounded-2xl px-3 py-3 text-center text-[13px] font-semibold text-white transition sm:text-sm ${
              item.whatsapp
                ? "bg-[#1C1C1E] hover:opacity-90"
                : "cursor-not-allowed bg-gray-300"
            }`}
          >
            WhatsApp
          </a>

          <Link
            href={item.category === "motor" ? "/vehicles/motor" : "/vehicles/car"}
            className="flex min-h-[48px] items-center justify-center rounded-2xl bg-yellow-600 px-3 py-3 text-center text-[13px] font-bold text-white transition hover:bg-yellow-700 sm:text-sm"
          >
            {lang === "id" ? "Lihat Detail" : "View Detail"}
          </Link>
        </div>

        <ScheduleTestDriveButton title={item.title} code={item.kode} />

        <VehicleEngagementBar
          labelSave={lang === "id" ? "Simpan" : "Save"}
          labelLike={lang === "id" ? "Suka" : "Like"}
          labelShare={lang === "id" ? "Bagikan" : "Share"}
          labelRating={lang === "id" ? "Rating" : "Rating"}
        />
      </div>
    </div>
  );
}

function FeaturedVehiclesSection() {
  const { lang } = useLanguage();

  return (
    <section className="bg-gray-100 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-10 text-center text-2xl font-bold text-[#1C1C1E] sm:mb-12 sm:text-3xl">
          {lang === "id" ? "Kendaraan Unggulan" : "Featured Vehicles"}
        </h2>

        <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 xl:grid-cols-3 xl:gap-10">
          {FEATURED_VEHICLES.map((item) => (
            <VehicleCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedDealersSection() {
  const { lang } = useLanguage();

  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-4 text-center text-2xl font-bold text-[#1C1C1E] sm:text-3xl">
          {lang === "id"
            ? "Dealer & Partner Unggulan TeTamo"
            : "TeTamo Featured Dealers & Partners"}
        </h2>

        <p className="mx-auto mb-10 max-w-2xl px-2 text-center text-sm leading-7 text-gray-600 sm:mb-12 sm:text-base">
          {lang === "id"
            ? "Dealer dan partner otomotif pilihan dengan tampilan profil yang bersih, modern, dan mudah dihubungi."
            : "Selected automotive partners with clean, modern profiles and easy contact access."}
        </p>

        <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 xl:grid-cols-3 xl:gap-10">
          {FEATURED_DEALERS.map((dealer) => {
            const whatsappHref = dealer.whatsapp
              ? `https://wa.me/${dealer.whatsapp}`
              : "#";

            return (
              <div
                key={dealer.id}
                className="relative rounded-3xl border border-gray-200 bg-gray-100 p-5 shadow-sm sm:p-6"
              >
                <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
                  {dealer.verified && (
                    <div className="rounded-full bg-[#1C1C1E] px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">
                      {lang === "id" ? "Dealer Terverifikasi" : "Verified Dealer"}
                    </div>
                  )}

                  <div className="inline-flex items-center gap-1 rounded-full bg-[#B8860B] px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">
                    <Crown className="h-3.5 w-3.5" />
                    {lang === "id" ? "Unggulan" : "Featured"}
                  </div>
                </div>

                <div className="mt-10 flex items-start gap-4 sm:mt-12">
                  <img
                    src={dealer.photo}
                    alt={dealer.name}
                    className="h-24 w-24 shrink-0 rounded-2xl object-cover sm:h-28 sm:w-28"
                  />

                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-[#1C1C1E] sm:text-lg">
                      {dealer.name}
                    </h3>

                    <div className="mt-1 text-sm text-gray-600">{dealer.company}</div>
                    <div className="mt-1 text-sm text-gray-500">{dealer.location}</div>
                    <p className="mt-2 text-sm text-gray-500">{dealer.experience}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <SocialBtn href="#" label="Instagram">
                    <IconInstagram />
                  </SocialBtn>
                  <SocialBtn href="#" label="Facebook">
                    <IconFacebook />
                  </SocialBtn>
                  <SocialBtn href="#" label="TikTok">
                    <IconTikTok />
                  </SocialBtn>
                  <SocialBtn href="#" label="LinkedIn">
                    <IconLinkedIn />
                  </SocialBtn>
                </div>

                <a
                  href={whatsappHref}
                  onClick={(e) => {
                    if (!dealer.whatsapp) e.preventDefault();
                  }}
                  target="_blank"
                  rel="noreferrer"
                  className={`mt-5 inline-block w-full rounded-2xl px-4 py-3 text-center text-sm font-semibold text-white transition ${
                    dealer.whatsapp
                      ? "bg-[#1C1C1E] hover:opacity-90"
                      : "cursor-not-allowed bg-gray-300"
                  }`}
                >
                  WhatsApp
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function OwnerVehiclesSection() {
  const { lang } = useLanguage();

  return (
    <section className="bg-gray-100 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-4 text-center text-2xl font-bold text-[#1C1C1E] sm:text-3xl">
          {lang === "id"
            ? "Kendaraan Pemilik Unggulan"
            : "Featured Owner Vehicles"}
        </h2>

        <p className="mx-auto mb-10 max-w-2xl px-2 text-center text-sm leading-7 text-gray-600 sm:mb-12 sm:text-base">
          {lang === "id"
            ? "Unit langsung dari pemilik dengan tampilan yang rapi, jelas, dan siap dipasarkan."
            : "Units directly from owners with a clean, clear, ready-to-market presentation."}
        </p>

        <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 xl:grid-cols-3 xl:gap-10">
          {OWNER_VEHICLES.map((item) => (
            <VehicleCard key={item.id} item={item} ownerMode />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function VehiclesPage() {
  const { lang } = useLanguage();
  const [q, setQ] = useState("");

  const counts = useMemo(
    () => ({
      featured: FEATURED_VEHICLES.length,
      ownerVehicles: OWNER_VEHICLES.length,
      dealers: FEATURED_DEALERS.length,
    }),
    []
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-gray-900">
      <section className="bg-[#F7F7F8] px-4 pb-10 pt-8 text-center sm:px-6 sm:pb-12 sm:pt-10 md:pt-14 lg:px-8 lg:pb-20 lg:pt-20">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-[30px] font-bold leading-[1.08] tracking-[-0.03em] text-[#1C1C1E] sm:text-[35px] md:text-5xl lg:text-[42px]">
            {lang === "id"
              ? "Jual dan Temukan Kendaraan Anda di TeTamo"
              : "Advertise and Find Your Vehicle at TeTamo"}
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-[#5F6B7A] sm:mt-5 sm:text-base md:text-lg md:leading-8">
            {lang === "id"
              ? "Dummy halaman kendaraan dengan UI yang mengikuti homepage properti Tetamo — siap dipakai sementara sebelum listing kendaraan dihubungkan ke database."
              : "A dummy vehicle page that follows the same Tetamo property homepage UI — ready to use temporarily before vehicle listings are connected to the database."}
          </p>

          <div className="mx-auto mt-7 w-full max-w-3xl rounded-[22px] border border-gray-200 bg-white p-2 shadow-sm sm:mt-8">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={
                    lang === "id"
                      ? "Cari mobil, motor, brand, model, lokasi..."
                      : "Search cars, motorbikes, brand, model, location..."
                  }
                  className="h-11 w-full rounded-[16px] border border-transparent px-4 text-[15px] text-[#1C1C1E] placeholder:text-gray-500 focus:border-gray-200 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  alert(
                    lang === "id"
                      ? "Search dummy dulu. Nanti baru disambungkan ke listing kendaraan."
                      : "Dummy search for now. Later this can be connected to vehicle listings."
                  )
                }
                className="h-11 w-[92px] shrink-0 rounded-[16px] bg-[#1C1C1E] px-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                {lang === "id" ? "Cari" : "Search"}
              </button>
            </div>
          </div>

          <div className="mx-auto mt-7 grid max-w-4xl grid-cols-3 gap-2 sm:mt-8 sm:gap-3">
            <Link
              href="/vehicles/car"
              className="inline-flex min-h-[58px] items-center justify-center rounded-2xl bg-[#1C1C1E] px-2 py-2 text-center text-[12px] font-semibold leading-[1.2] text-white transition hover:opacity-90 sm:min-h-[60px] sm:px-4 sm:text-sm md:text-base"
            >
              {lang === "id" ? "Lihat Mobil" : "View Cars"}
            </Link>

            <Link
              href="/vehicles/motor"
              className="inline-flex min-h-[58px] items-center justify-center rounded-2xl border border-[#1C1C1E] px-2 py-2 text-center text-[12px] font-semibold leading-[1.2] text-[#1C1C1E] transition hover:bg-[#1C1C1E] hover:text-white sm:min-h-[60px] sm:px-4 sm:text-sm md:text-base"
            >
              {lang === "id" ? "Lihat Motor" : "View Motor"}
            </Link>

            <Link
              href="/career"
              className="inline-flex min-h-[58px] items-center justify-center rounded-2xl bg-[#E5E7EB] px-2 py-2 text-center text-[12px] font-semibold leading-[1.2] text-[#1C1C1E] transition hover:bg-[#D1D5DB] sm:min-h-[60px] sm:px-4 sm:text-sm md:text-base"
            >
              {lang === "id"
                ? "Daftar Partner / Dealer"
                : "Join as Partner / Dealer"}
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard
            title={lang === "id" ? "Tampilan Premium" : "Premium Layout"}
            description={
              lang === "id"
                ? "UI mengikuti homepage properti Tetamo supaya rasa brand tetap konsisten."
                : "The UI follows the Tetamo property homepage so the brand feel stays consistent."
            }
          />

          <InfoCard
            title={lang === "id" ? "Dummy Listing" : "Dummy Listings"}
            description={
              lang === "id"
                ? "Saat ini masih dummy dulu sambil menunggu struktur vehicle listing siap."
                : "This is using dummy data first while the vehicle listing structure is being prepared."
            }
          />

          <InfoCard
            title={lang === "id" ? "Badge & CTA Sama" : "Same Badges & CTAs"}
            description={
              lang === "id"
                ? "Badge, tombol WhatsApp, View Detail, dan Schedule Test Drive dibuat dengan rasa UI yang sama."
                : "Badges, WhatsApp, View Detail, and Schedule Test Drive use the same UI feel."
            }
          />

          <InfoCard
            title={lang === "id" ? "Siap Diwire Nanti" : "Ready to Wire Later"}
            description={
              lang === "id"
                ? "Nanti halaman ini bisa langsung dihubungkan ke Supabase saat vehicle module siap."
                : "Later this page can be wired directly to Supabase once the vehicle module is ready."
            }
          />
        </div>

        <div className="mx-auto mt-8 grid max-w-7xl grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-gray-200 bg-[#1C1C1E] p-5 text-white shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-white/60">
              {lang === "id" ? "Kendaraan Unggulan" : "Featured Vehicles"}
            </p>
            <p className="mt-2 text-3xl font-bold">{counts.featured}</p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
              {lang === "id" ? "Kendaraan Pemilik" : "Owner Vehicles"}
            </p>
            <p className="mt-2 text-3xl font-bold text-[#1C1C1E]">
              {counts.ownerVehicles}
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
              {lang === "id" ? "Dealer Unggulan" : "Featured Dealers"}
            </p>
            <p className="mt-2 text-3xl font-bold text-[#1C1C1E]">
              {counts.dealers}
            </p>
          </div>
        </div>
      </section>

      <FeaturedVehiclesSection />
      <FeaturedDealersSection />
      <OwnerVehiclesSection />

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-4xl rounded-[32px] border border-gray-200 bg-[#F7F7F8] p-6 text-center shadow-sm sm:p-10">
          <h2 className="text-2xl font-bold text-[#1C1C1E] sm:text-3xl">
            {lang === "id"
              ? "Vehicle Module Tetamo Masih Dummy Dulu"
              : "Tetamo Vehicle Module Is Dummy First"}
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-gray-600 sm:text-base">
            {lang === "id"
              ? "Next step nanti kita bisa pisahkan create/edit listing untuk mobil dan motor, lalu hubungkan ke database dengan rasa UI yang sama."
              : "Later, the next step is to split create/edit listing flows for cars and motorbikes, then connect them to the database with the same UI feel."}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/vehicles/car"
              className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-[#1C1C1E] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {lang === "id" ? "Masuk ke Mobil" : "Go to Cars"}
            </Link>

            <Link
              href="/vehicles/motor"
              className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-[#1C1C1E] px-6 py-3 text-sm font-semibold text-[#1C1C1E] transition hover:bg-[#1C1C1E] hover:text-white"
            >
              {lang === "id" ? "Masuk ke Motor" : "Go to Motor"}
            </Link>
          </div>
        </div>
      </section>

      {FEATURED_VEHICLES.length === 0 ? (
        <section className="px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionEmpty
              text={
                lang === "id"
                  ? "Belum ada dummy kendaraan untuk ditampilkan."
                  : "There are no dummy vehicles to display yet."
              }
            />
          </div>
        </section>
      ) : null}
    </main>
  );
}