"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/app/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import {
  Crown,
  Heart,
  Bookmark,
  Share2,
  Star,
  CarFront,
  Bike,
} from "lucide-react";

type VehicleCategory = "car" | "motor";
type PostedByType = "owner" | "agent" | "dealer";

type VehicleItem = {
  id: string;
  slug?: string | null;
  category: VehicleCategory;
  title: string;
  images: string[];
  price: number;
  location: string;
  year: string;
  transmission: string;
  fuel: string;
  mileage: string;
  posterName: string;
  postedByType: PostedByType;
  whatsapp?: string | null;
  kode?: string;
  postedDate?: string;
  verifiedListing: boolean;
  contactUserId?: string | null;
  detailHref: string;
  isFeatured: boolean;
};

type DealerItem = {
  id: string;
  name: string;
  photo?: string | null;
  location: string;
  company: string;
  experience: string;
  whatsapp?: string | null;
  verified: boolean;
};

type VehicleRow = {
  id: string;
  kode: string;
  slug: string | null;
  user_id: string | null;
  owner_user_id: string | null;
  agent_user_id: string | null;
  source: string | null;
  listing_type: string | null;
  vehicle_type: string | null;
  title: string | null;
  description: string | null;
  brand: string | null;
  model: string | null;
  variant: string | null;
  year: number | null;
  price: number | null;
  currency: string | null;
  transmission: string | null;
  fuel: string | null;
  mileage: string | null;
  province: string | null;
  city: string | null;
  cover_image_url: string | null;
  is_featured: boolean | null;
  approval_status: string | null;
  listing_status: string | null;
  created_at: string | null;
};

type VehicleMediaRow = {
  vehicle_id: string;
  file_url: string;
  sort_order: number | null;
  is_cover: boolean | null;
  media_type: "photo" | "video";
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

const FALLBACK_FEATURED_VEHICLES: VehicleItem[] = [
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
    detailHref: "/vehicles/car/vh-1",
    isFeatured: true,
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
    detailHref: "/vehicles/car/vh-2",
    isFeatured: true,
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
    detailHref: "/vehicles/motor/vh-3",
    isFeatured: true,
  },
];

const FALLBACK_OWNER_VEHICLES: VehicleItem[] = [
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
    detailHref: "/vehicles/car/ov-1",
    isFeatured: false,
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
    detailHref: "/vehicles/motor/ov-2",
    isFeatured: false,
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
    detailHref: "/vehicles/car/ov-3",
    isFeatured: false,
  },
];

const FALLBACK_FEATURED_DEALERS: DealerItem[] = [
  {
    id: "dealer-1",
    name: "Tetamo Auto Partner",
    photo:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
    location: "Jakarta",
    company: "Tetamo Auto Network",
    experience: "Featured Vehicle Partner",
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
    experience: "Premium Vehicle Partner",
    whatsapp: "6281234567897",
    verified: true,
  },
];

const CATEGORY_FALLBACK_IMAGES: Record<VehicleCategory, string[]> = {
  car: [
    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80",
  ],
  motor: [
    "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1622185135505-2d7950039943?auto=format&fit=crop&w=1200&q=80",
  ],
};

function formatIdr(value: number | null | undefined) {
  if (typeof value !== "number") return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateLabel(value?: string | null, lang: string = "en") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function translateTransmission(value: string, lang: string) {
  const v = value.toLowerCase();
  if (v === "automatic") return lang === "id" ? "Automatic" : "Automatic";
  if (v === "manual") return lang === "id" ? "Manual" : "Manual";
  if (v === "cvt") return lang === "id" ? "CVT" : "CVT";
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

function buildVehicleDetailHref(category: VehicleCategory, slugOrId: string) {
  return category === "motor"
    ? `/vehicles/motor/${slugOrId}`
    : `/vehicles/car/${slugOrId}`;
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function initialsFromName(name: string) {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function dedupeImages(images: string[]) {
  return Array.from(new Set(images.filter(Boolean)));
}

function mapPostedType(source?: string | null): PostedByType {
  if (source === "owner") return "owner";
  if (source === "agent") return "agent";
  return "dealer";
}

function defaultPosterName(source?: string | null, lang: string = "en") {
  if (source === "owner") {
    return lang === "id" ? "Pemilik Kendaraan" : "Vehicle Owner";
  }
  if (source === "agent") {
    return lang === "id" ? "Agen Kendaraan" : "Vehicle Agent";
  }
  return lang === "id" ? "Partner Kendaraan" : "Vehicle Partner";
}

function SocialBtn({
  href,
  label,
  children,
}: {
  href?: string;
  label: string;
  children: ReactNode;
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
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-2 text-base font-semibold text-[#1C1C1E] sm:text-lg">
        {title}
      </h3>
      <p className="text-sm leading-7 text-gray-600">{description}</p>
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
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <button
          type="button"
          onClick={toggleSave}
          className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 text-center text-[10px] font-semibold shadow-sm transition sm:text-[11px] ${
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
          className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 text-center text-[10px] font-semibold shadow-sm transition sm:text-[11px] ${
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

        <div className="flex min-h-[58px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-2 py-2 text-center shadow-sm">
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
          className="flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl border border-gray-200 bg-white px-2 py-2 text-center shadow-sm transition hover:bg-gray-50"
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
  vehicleId,
  contactUserId,
  category,
  title,
  code,
  whatsapp,
}: {
  vehicleId?: string;
  contactUserId?: string | null;
  category: VehicleCategory;
  title: string;
  code?: string;
  whatsapp?: string | null;
}) {
  const router = useRouter();
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitDisabled = !selectedDate || !selectedTime || submitting;

  async function handleSubmit() {
    if (submitDisabled) return;

    if (!vehicleId || !contactUserId) {
      if (whatsapp) {
        window.open(`https://wa.me/${whatsapp}`, "_blank", "noopener,noreferrer");
        return;
      }

      alert(
        lang === "id"
          ? "Silakan hubungi penjual secara langsung untuk mengatur jadwal viewing atau test drive."
          : "Please contact the seller directly to arrange a viewing or test drive."
      );
      return;
    }

    try {
      setSubmitting(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const nextPath =
          typeof window !== "undefined" ? window.location.pathname : "/vehicles";
        router.push(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      const requestedAt = new Date(`${selectedDate}T${selectedTime}:00`);

      const { error } = await supabase.from("vehicle_viewings").insert({
        vehicle_id: vehicleId,
        owner_user_id: contactUserId,
        requester_user_id: user.id,
        viewing_type: category === "motor" ? "test_ride" : "test_drive",
        requested_at: requestedAt.toISOString(),
        status: "pending",
      });

      if (error) throw error;

      alert(
        lang === "id"
          ? "Permintaan test drive Anda sudah terkirim."
          : "Your test drive request has been sent."
      );

      setOpen(false);
      setSelectedDate("");
      setSelectedTime("");
    } catch (error: any) {
      alert(
        error?.message ||
          (lang === "id"
            ? "Terjadi kendala saat mengirim permintaan test drive."
            : "Something went wrong while sending the test drive request.")
      );
    } finally {
      setSubmitting(false);
    }
  }

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
                onClick={handleSubmit}
                className={[
                  "w-full rounded-2xl px-4 py-3 text-sm font-semibold transition",
                  !submitDisabled
                    ? "bg-[#B8860B] text-white hover:opacity-90"
                    : "cursor-not-allowed bg-gray-200 text-gray-500",
                ].join(" ")}
              >
                {submitting
                  ? lang === "id"
                    ? "Mengirim..."
                    : "Sending..."
                  : lang === "id"
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
    return item.category === "motor"
      ? lang === "id"
        ? "Motor"
        : "Motor"
      : lang === "id"
        ? "Mobil"
        : "Car";
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
              {lang === "id" ? "Sedang Ditinjau" : "Under Review"}
            </div>
          )}
        </div>

        {!ownerMode && item.isFeatured ? (
          <div className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-[#B8860B] px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">
            <Crown className="h-3.5 w-3.5" />
            {lang === "id" ? "Unggulan" : "Featured"}
          </div>
        ) : null}

        <img
          src={item.images[imgIndex]}
          alt={item.title}
          className="h-[240px] w-full object-cover sm:h-[300px] lg:h-[380px]"
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
            {item.kode ? (
              <span>
                {lang === "id" ? "Kode:" : "Code:"}{" "}
                <span className="font-medium text-gray-700">{item.kode}</span>
              </span>
            ) : null}

            {item.postedDate ? (
              <span>
                {lang === "id" ? "Tayang:" : "Posted:"}{" "}
                <span className="font-medium text-gray-700">{item.postedDate}</span>
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            href={item.detailHref}
            className="flex min-h-[48px] items-center justify-center rounded-2xl bg-yellow-600 px-3 py-3 text-center text-[13px] font-bold text-white transition hover:bg-yellow-700 sm:text-sm"
          >
            {lang === "id" ? "Lihat Detail" : "View Detail"}
          </Link>
        </div>

        <ScheduleTestDriveButton
          vehicleId={item.id}
          contactUserId={item.contactUserId}
          category={item.category}
          title={item.title}
          code={item.kode}
          whatsapp={item.whatsapp}
        />

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

function FeaturedVehiclesSection({ items }: { items: VehicleItem[] }) {
  const { lang } = useLanguage();

  return (
    <section id="vehicle-results" className="bg-gray-100 px-4 py-14 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-4 text-center text-2xl font-bold text-[#1C1C1E] sm:text-3xl">
          {lang === "id" ? "Kendaraan Unggulan" : "Featured Vehicles"}
        </h2>

        <p className="mx-auto mb-10 max-w-2xl text-center text-sm leading-7 text-gray-600 sm:mb-12 sm:text-base">
          {lang === "id"
            ? "Pilihan unit yang tampil menonjol untuk membantu pencarian terasa lebih cepat dan lebih fokus."
            : "Highlighted units to make browsing faster, clearer, and easier to compare."}
        </p>

        {items.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 xl:grid-cols-3 xl:gap-10">
            {items.map((item) => (
              <VehicleCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <SectionEmpty
            text={
              lang === "id"
                ? "Kendaraan unggulan akan tampil di sini setelah listing dipublikasikan."
                : "Featured vehicles will appear here after listings are published."
            }
          />
        )}
      </div>
    </section>
  );
}

function FeaturedDealersSection({ dealers }: { dealers: DealerItem[] }) {
  const { lang } = useLanguage();

  return (
    <section className="bg-white px-4 py-14 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-4 text-center text-2xl font-bold text-[#1C1C1E] sm:text-3xl">
          {lang === "id"
            ? "Partner Kendaraan Unggulan TeTamo"
            : "TeTamo Featured Vehicle Partners"}
        </h2>

        <p className="mx-auto mb-10 max-w-2xl px-2 text-center text-sm leading-7 text-gray-600 sm:mb-12 sm:text-base">
          {lang === "id"
            ? "Temukan partner kendaraan dengan profil yang rapi, mudah dihubungi, dan lebih nyaman untuk dijelajahi."
            : "Meet vehicle partners with clean profiles, simple contact access, and a more comfortable browsing experience."}
        </p>

        {dealers.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 xl:grid-cols-3 xl:gap-10">
            {dealers.map((dealer) => {
              const whatsappHref = dealer.whatsapp
                ? `https://wa.me/${dealer.whatsapp}`
                : "#";

              return (
                <div
                  key={dealer.id}
                  className="relative rounded-3xl border border-gray-200 bg-gray-100 p-5 shadow-sm sm:p-6"
                >
                  <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
                    {dealer.verified ? (
                      <div className="rounded-full bg-[#1C1C1E] px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">
                        {lang === "id" ? "Partner Terverifikasi" : "Verified Partner"}
                      </div>
                    ) : null}

                    <div className="inline-flex items-center gap-1 rounded-full bg-[#B8860B] px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">
                      <Crown className="h-3.5 w-3.5" />
                      {lang === "id" ? "Unggulan" : "Featured"}
                    </div>
                  </div>

                  <div className="mt-10 flex items-start gap-4 sm:mt-12">
                    {dealer.photo ? (
                      <img
                        src={dealer.photo}
                        alt={dealer.name}
                        className="h-24 w-24 shrink-0 rounded-2xl object-cover sm:h-28 sm:w-28"
                      />
                    ) : (
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-[#1C1C1E] text-xl font-bold text-white sm:h-28 sm:w-28">
                        {initialsFromName(dealer.name)}
                      </div>
                    )}

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
        ) : (
          <SectionEmpty
            text={
              lang === "id"
                ? "Profil partner kendaraan akan tampil di sini setelah partner aktif dipublikasikan."
                : "Vehicle partner profiles will appear here after active partners are published."
            }
          />
        )}
      </div>
    </section>
  );
}

function OwnerVehiclesSection({ items }: { items: VehicleItem[] }) {
  const { lang } = useLanguage();

  return (
    <section className="bg-gray-100 px-4 py-14 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-4 text-center text-2xl font-bold text-[#1C1C1E] sm:text-3xl">
          {lang === "id"
            ? "Kendaraan Dari Pemilik"
            : "Vehicles From Owners"}
        </h2>

        <p className="mx-auto mb-10 max-w-2xl px-2 text-center text-sm leading-7 text-gray-600 sm:mb-12 sm:text-base">
          {lang === "id"
            ? "Pilihan unit langsung dari pemilik dengan tampilan yang rapi, jelas, dan lebih mudah dihubungi."
            : "A selection of vehicles listed directly by owners with a clean presentation and simpler contact access."}
        </p>

        {items.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 xl:grid-cols-3 xl:gap-10">
            {items.map((item) => (
              <VehicleCard key={item.id} item={item} ownerMode />
            ))}
          </div>
        ) : (
          <SectionEmpty
            text={
              lang === "id"
                ? "Kendaraan dari pemilik akan tampil di sini setelah listing diterbitkan."
                : "Owner vehicle listings will appear here after they are published."
            }
          />
        )}
      </div>
    </section>
  );
}

function buildVehicleItemFromRow(args: {
  row: VehicleRow;
  mediaMap: Map<string, string[]>;
  profileMap: Map<string, string>;
  lang: string;
}): VehicleItem {
  const { row, mediaMap, profileMap, lang } = args;

  const category: VehicleCategory = row.vehicle_type === "motor" ? "motor" : "car";
  const profileName =
    profileMap.get(row.user_id || "") ||
    profileMap.get(row.owner_user_id || "") ||
    profileMap.get(row.agent_user_id || "") ||
    defaultPosterName(row.source, lang);

  const images = dedupeImages([
    row.cover_image_url || "",
    ...(mediaMap.get(row.id) || []),
  ]);

  const finalImages =
    images.length > 0 ? images : CATEGORY_FALLBACK_IMAGES[category];

  const location = [row.city, row.province].filter(Boolean).join(", ");
  const slugOrId = row.slug || row.id;
  const contactUserId = row.owner_user_id || row.agent_user_id || row.user_id;

  return {
    id: row.id,
    slug: row.slug,
    category,
    title: row.title || "-",
    images: finalImages,
    price: Number(row.price || 0),
    location: location || "-",
    year: row.year ? String(row.year) : "-",
    transmission: row.transmission || "-",
    fuel: row.fuel || "-",
    mileage: row.mileage || "-",
    posterName: profileName,
    postedByType: mapPostedType(row.source),
    whatsapp: null,
    kode: row.kode || undefined,
    postedDate: formatDateLabel(row.created_at, lang),
    verifiedListing: row.approval_status === "approved",
    contactUserId,
    detailHref: buildVehicleDetailHref(category, slugOrId),
    isFeatured: Boolean(row.is_featured),
  };
}

async function fetchVehicleRows(): Promise<VehicleRow[]> {
  const selectCols =
    "id,kode,slug,user_id,owner_user_id,agent_user_id,source,listing_type,vehicle_type,title,description,brand,model,variant,year,price,currency,transmission,fuel,mileage,province,city,cover_image_url,is_featured,approval_status,listing_status,created_at";

  const viewResult = await supabase
    .from("vehicle_marketplace_view")
    .select(selectCols)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(30);

  if (!viewResult.error) {
    return (viewResult.data || []) as VehicleRow[];
  }

  const tableResult = await supabase
    .from("vehicles")
    .select(selectCols)
    .is("deleted_at", null)
    .eq("approval_status", "approved")
    .eq("listing_status", "active")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(30);

  if (tableResult.error) throw tableResult.error;

  return (tableResult.data || []) as VehicleRow[];
}

export default function VehiclesPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [q, setQ] = useState("");
  const [liveVehicles, setLiveVehicles] = useState<VehicleItem[]>([]);
  const [dealerCards, setDealerCards] = useState<DealerItem[]>(FALLBACK_FEATURED_DEALERS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);

        const rows = await fetchVehicleRows();
        if (!active) return;

        if (!rows.length) {
          setLiveVehicles([]);
          setDealerCards(FALLBACK_FEATURED_DEALERS);
          setLoading(false);
          return;
        }

        const vehicleIds = rows.map((row) => row.id);

        const mediaResult = await supabase
          .from("vehicle_media")
          .select("vehicle_id,file_url,sort_order,is_cover,media_type")
          .in("vehicle_id", vehicleIds)
          .eq("media_type", "photo")
          .order("is_cover", { ascending: false })
          .order("sort_order", { ascending: true });

        const mediaRows = ((mediaResult.data || []) as VehicleMediaRow[]) || [];
        const mediaMap = new Map<string, string[]>();

        for (const media of mediaRows) {
          const prev = mediaMap.get(media.vehicle_id) || [];
          prev.push(media.file_url);
          mediaMap.set(media.vehicle_id, prev);
        }

        const userIds = Array.from(
          new Set(
            rows
              .flatMap((row) => [row.user_id, row.owner_user_id, row.agent_user_id])
              .filter(Boolean)
          )
        ) as string[];

        const profileMap = new Map<string, string>();

        if (userIds.length > 0) {
          const profileResult = await supabase
            .from("profiles")
            .select("id,full_name")
            .in("id", userIds);

          const profiles = ((profileResult.data || []) as ProfileRow[]) || [];
          profiles.forEach((item) => {
            profileMap.set(item.id, item.full_name?.trim() || "");
          });
        }

        const mappedVehicles = rows.map((row) =>
          buildVehicleItemFromRow({
            row,
            mediaMap,
            profileMap,
            lang,
          })
        );

        const livePartners: DealerItem[] = rows
          .filter((row) => row.source === "agent" || row.source === "admin")
          .slice(0, 3)
          .map((row) => ({
            id: row.id,
            name:
              profileMap.get(row.user_id || "") ||
              profileMap.get(row.agent_user_id || "") ||
              defaultPosterName(row.source, lang),
            photo: null,
            location: [row.city, row.province].filter(Boolean).join(", ") || "-",
            company:
              lang === "id" ? "Partner Kendaraan TeTamo" : "TeTamo Vehicle Partner",
            experience:
              row.is_featured
                ? lang === "id"
                  ? "Partner Unggulan"
                  : "Featured Partner"
                : lang === "id"
                  ? "Partner Aktif"
                  : "Active Partner",
            whatsapp: null,
            verified: row.approval_status === "approved",
          }));

        if (!active) return;

        setLiveVehicles(mappedVehicles);
        setDealerCards(livePartners.length > 0 ? livePartners : FALLBACK_FEATURED_DEALERS);
      } catch {
        if (!active) return;
        setLiveVehicles([]);
        setDealerCards(FALLBACK_FEATURED_DEALERS);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [lang]);

  const showcaseVehicles = useMemo(() => {
    return liveVehicles.length > 0
      ? liveVehicles
      : [...FALLBACK_FEATURED_VEHICLES, ...FALLBACK_OWNER_VEHICLES];
  }, [liveVehicles]);

  const filteredVehicles = useMemo(() => {
    const query = normalizeSearch(q);
    if (!query) return showcaseVehicles;

    return showcaseVehicles.filter((item) =>
      normalizeSearch(
        [
          item.title,
          item.location,
          item.year,
          item.transmission,
          item.fuel,
          item.mileage,
          item.posterName,
          item.kode,
        ]
          .filter(Boolean)
          .join(" ")
      ).includes(query)
    );
  }, [showcaseVehicles, q]);

  const featuredVehicles = useMemo(() => {
    const featured = filteredVehicles.filter((item) => item.isFeatured);
    if (featured.length > 0) return featured.slice(0, 6);
    return filteredVehicles.slice(0, 6);
  }, [filteredVehicles]);

  const ownerVehicles = useMemo(() => {
    return filteredVehicles
      .filter((item) => item.postedByType === "owner")
      .slice(0, 6);
  }, [filteredVehicles]);

  const counts = useMemo(
    () => ({
      featured: featuredVehicles.length,
      ownerVehicles: ownerVehicles.length,
      dealers: dealerCards.length,
    }),
    [featuredVehicles.length, ownerVehicles.length, dealerCards.length]
  );

  const infoCards = useMemo(
    () => [
      {
        title: lang === "id" ? "Pilihan Kendaraan Berkualitas" : "Quality Vehicle Selection",
        description:
          lang === "id"
            ? "Jelajahi pilihan mobil dan motor dengan tampilan yang rapi, detail yang jelas, dan pengalaman browsing yang lebih nyaman."
            : "Explore cars and motorbikes with a cleaner presentation, clearer details, and a more comfortable browsing experience.",
      },
      {
        title: lang === "id" ? "Listing Lebih Terpercaya" : "More Trusted Listings",
        description:
          lang === "id"
            ? "Setiap listing disusun lebih jelas agar proses mencari kendaraan terasa lebih aman, fokus, dan mudah dipahami."
            : "Each listing is presented more clearly so the search feels safer, more focused, and easier to understand.",
      },
      {
        title: lang === "id" ? "Hubungi Penjual Dengan Mudah" : "Simple Seller Contact",
        description:
          lang === "id"
            ? "Terhubung langsung dengan penjual melalui WhatsApp, lihat detail unit, lalu lanjutkan percakapan dengan lebih cepat."
            : "Connect directly with the seller through WhatsApp, review the unit details, and continue the conversation faster.",
      },
      {
        title: lang === "id" ? "Siap Untuk Viewing & Test Drive" : "Ready for Viewing & Test Drive",
        description:
          lang === "id"
            ? "Temukan unit yang sesuai, atur jadwal viewing atau test drive, dan lanjutkan proses dengan langkah yang lebih praktis."
            : "Find the right unit, arrange a viewing or test drive, and continue with a more practical next step.",
      },
    ],
    [lang]
  );

  function handleSearchClick() {
    const query = q.trim();

    if (!query) {
      router.push("/vehicles/search");
      return;
    }

    router.push(`/vehicles/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-gray-900">
      <section className="bg-[#F7F7F8] px-4 pb-10 pt-8 text-center sm:px-6 sm:pb-12 sm:pt-10 md:pt-14 lg:px-8 lg:pb-20 lg:pt-20">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-[28px] font-bold leading-[1.08] tracking-[-0.03em] text-[#1C1C1E] sm:text-[38px] md:text-5xl lg:text-[56px]">
            {lang === "id"
              ? "Temukan Mobil dan Motor di TeTaMo"
              : "Find Cars and Motorbikes on TeTaMo"}
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-[15px] leading-7 text-[#5F6B7A] sm:mt-5 sm:text-base md:text-lg md:leading-8">
            {lang === "id"
              ? "Jelajahi pilihan kendaraan, hubungi penjual dengan mudah, dan atur viewing atau test drive dari satu tempat."
              : "Browse vehicle listings, connect with sellers more easily, and arrange viewings or test drives in one place."}
          </p>

          <div className="mx-auto mt-7 w-full max-w-3xl rounded-[22px] border border-gray-200 bg-white p-2 shadow-sm sm:mt-8">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearchClick();
                  }}
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
                onClick={handleSearchClick}
                className="h-11 w-[92px] shrink-0 rounded-[16px] bg-[#1C1C1E] px-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                {lang === "id" ? "Cari" : "Search"}
              </button>
            </div>
          </div>

          <div className="mx-auto mt-7 grid max-w-4xl grid-cols-1 gap-3 sm:mt-8 sm:grid-cols-3">
            <Link
              href="/vehicles/car"
              className="inline-flex min-h-[56px] items-center justify-center rounded-2xl bg-[#1C1C1E] px-4 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
            >
              {lang === "id" ? "Lihat Mobil" : "View Cars"}
            </Link>

            <Link
              href="/vehicles/motor"
              className="inline-flex min-h-[56px] items-center justify-center rounded-2xl border border-[#1C1C1E] px-4 py-3 text-center text-sm font-semibold text-[#1C1C1E] transition hover:bg-[#1C1C1E] hover:text-white"
            >
              {lang === "id" ? "Lihat Motor" : "View Motor"}
            </Link>

            <Link
              href="/vehicles/create"
              className="inline-flex min-h-[56px] items-center justify-center rounded-2xl bg-[#E5E7EB] px-4 py-3 text-center text-sm font-semibold text-[#1C1C1E] transition hover:bg-[#D1D5DB]"
            >
              {lang === "id" ? "Pasang Kendaraan" : "List Your Vehicle"}
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {infoCards.map((card) => (
            <InfoCard
              key={card.title}
              title={card.title}
              description={card.description}
            />
          ))}
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
              {lang === "id" ? "Partner Kendaraan" : "Vehicle Partners"}
            </p>
            <p className="mt-2 text-3xl font-bold text-[#1C1C1E]">
              {counts.dealers}
            </p>
          </div>
        </div>
      </section>

      <FeaturedVehiclesSection items={featuredVehicles} />
      <FeaturedDealersSection dealers={dealerCards} />
      <OwnerVehiclesSection items={ownerVehicles} />

      <section className="bg-white px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-4xl rounded-[32px] border border-gray-200 bg-[#F7F7F8] p-6 text-center shadow-sm sm:p-10">
          <h2 className="text-2xl font-bold text-[#1C1C1E] sm:text-3xl">
            {lang === "id"
              ? "Siap Pasang Kendaraan Anda?"
              : "Ready to List Your Vehicle?"}
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-gray-600 sm:text-base">
            {lang === "id"
              ? "Pasang mobil atau motor Anda dan tampilkan unit dengan presentasi yang lebih rapi dan mudah ditemukan."
              : "List your car or motorbike and present the unit in a cleaner format that is easier for buyers to discover."}
          </p>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/vehicles/create"
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-[#1C1C1E] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 sm:w-auto"
            >
              {lang === "id" ? "Pasang Kendaraan" : "List Vehicle"}
            </Link>

            <Link
              href="/vehicles/package"
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl border border-[#1C1C1E] px-6 py-3 text-sm font-semibold text-[#1C1C1E] transition hover:bg-[#1C1C1E] hover:text-white sm:w-auto"
            >
              {lang === "id" ? "Lihat Paket" : "View Packages"}
            </Link>
          </div>
        </div>
      </section>

      {!loading && featuredVehicles.length === 0 && ownerVehicles.length === 0 ? (
        <section className="px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionEmpty
              text={
                lang === "id"
                  ? "Belum ada kendaraan yang cocok dengan pencarian Anda."
                  : "There are no vehicles matching your search yet."
              }
            />
          </div>
        </section>
      ) : null}
    </main>
  );
}