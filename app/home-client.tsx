"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Crown,
  Heart,
  Bookmark,
  Share2,
  Star,
} from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { supabase } from "@/lib/supabase";

/* =========================
   MANUAL HOMEPAGE PICKS
========================= */

const FEATURED_PROPERTY_CODES = ["TTM0-E2", "TTM0 -RTLO", "TTM013"];

/* =========================
   TYPES
========================= */

type PropertyImageRow = {
  image_url: string;
  sort_order: number | null;
  is_cover: boolean | null;
};

type HomepagePropertyRow = {
  id: string;
  kode: string | null;
  posted_date: string | null;
  created_at: string | null;
  title: string | null;
  price: number | null;
  province: string | null;
  city: string | null;
  area: string | null;
  building_size: number | null;
  land_size: number | null;
  bedrooms: number | null;
  furnishing: string | null;
  garage: number | string | null;
  listing_type: string | null;
  rental_type: string | null;
  property_type: string | null;
  source: string | null;
  status: string | null;
  verification_status: string | null;
  verified_ok: boolean | null;
  plan_id: string | null;
  is_paused: boolean | null;
  listing_expires_at: string | null;
  featured_expires_at: string | null;
  boost_active: boolean | null;
  boost_expires_at: string | null;
  spotlight_active: boolean | null;
  spotlight_expires_at: string | null;
  transaction_status: string | null;
  contact_user_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_role: string | null;
  contact_agency: string | null;
  property_images: PropertyImageRow[] | null;
};

type HomepageProfileRow = {
  id: string;
  full_name: string | null;
  photo_url: string | null;
  address: string | null;
  agency: string | null;
  phone: string | null;
  role: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  tiktok_url?: string | null;
  linkedin_url?: string | null;
};

type FeaturedProperty = {
  id: string;
  title: string;
  images: string[];
  price: string;
  province: string;
  size: string;
  bed: string;
  furnishing: string;
  garage: string;
  posterName: string;
  postedByType: "owner" | "agent" | "developer";
  whatsapp: string;
  receiverId: string;
  receiverName: string;
  receiverRole: string;
  kode?: string;
  postedDate?: string;
  verifiedListing: boolean;
};

type FeaturedOwnerProperty = {
  id: string;
  title: string;
  ownerName: string;
  ownerWhatsapp: string;
  receiverId: string;
  receiverName: string;
  receiverRole: string;
  images: string[];
  price: string;
  province: string;
  size: string;
  bed: string;
  furnishing: string;
  garage: string;
  kode?: string;
  postedDate?: string;
  ownerApproved: boolean;
};

type FeaturedAgent = {
  id: string;
  name: string;
  photo: string;
  location: string;
  agency: string;
  experience: string;
  whatsapp: string;
  agentVerified: boolean;
  socials?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    linkedin?: string;
  };
};

/* =========================
   HELPERS
========================= */

function formatIdr(value: number | null | undefined) {
  if (typeof value !== "number") return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPostedDate(value?: string | null) {
  if (!value) return "-";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function mapFurnishing(value?: string | null) {
  if (!value) return "-";

  const v = value.toLowerCase();

  if (v === "full") return "Full Furnish";
  if (v === "semi") return "Semi Furnish";
  if (v === "unfurnished") return "Unfurnished";

  return value;
}

function translateBed(value: string, lang: string) {
  const count = value.match(/\d+/)?.[0] || value;
  return lang === "id" ? `${count} KT` : `${count} Bed`;
}

function translateGarage(value: string, lang: string) {
  const count = value.match(/\d+/)?.[0] || value;
  return lang === "id" ? `${count} Garasi` : `${count} Garage`;
}

function translateFurnishing(value: string, lang: string) {
  const normalized = value.trim().toLowerCase();

  if (
    normalized.includes("full furnish") ||
    normalized.includes("fully furnished") ||
    normalized.includes("full furnished")
  ) {
    return lang === "id" ? "Furnished" : "Fully Furnished";
  }

  if (
    normalized.includes("semi furnish") ||
    normalized.includes("semi furnished")
  ) {
    return lang === "id" ? "Semi Furnished" : "Semi Furnished";
  }

  if (
    normalized.includes("unfurnished") ||
    normalized.includes("tanpa furnitur")
  ) {
    return lang === "id" ? "Tanpa Furnitur" : "Unfurnished";
  }

  return value;
}

function normalizeWhatsapp(phone?: string | null) {
  if (!phone) return "";
  const digits = phone.replace(/[^\d]/g, "");

  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;

  return digits;
}

function normalizePropertyCode(value?: string | null) {
  return String(value || "")
    .replace(/\s+/g, "")
    .toUpperCase()
    .trim();
}

function isFutureDate(value?: string | null) {
  if (!value) return false;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;

  return d.getTime() > Date.now();
}

function isPromotionActive(flag?: boolean | null, expiresAt?: string | null) {
  return Boolean(flag) && (!expiresAt || isFutureDate(expiresAt));
}

function normalizeTransactionStatus(value?: string | null) {
  const v = (value || "").trim().toLowerCase();
  if (v === "sold") return "sold";
  if (v === "rented") return "rented";
  return "available";
}

function normalizePostedByType(
  role?: string | null,
  source?: string | null
): "owner" | "agent" | "developer" {
  const value = (role || source || "owner").toLowerCase();

  if (value === "agent") return "agent";
  if (value === "developer") return "developer";
  return "owner";
}

function isListingPublic(
  row: Pick<
    HomepagePropertyRow,
    "status" | "is_paused" | "listing_expires_at" | "transaction_status"
  >
) {
  if (row.status === "rejected") return false;
  if (row.is_paused) return false;

  if (normalizeTransactionStatus(row.transaction_status) !== "available") {
    return false;
  }

  if (row.listing_expires_at && !isFutureDate(row.listing_expires_at)) {
    return false;
  }

  return true;
}

function isVerifiedListing(row: HomepagePropertyRow) {
  return row.verification_status === "verified" || Boolean(row.verified_ok);
}

function hasFeaturedPlacement(row: HomepagePropertyRow) {
  const spotlight = isPromotionActive(
    row.spotlight_active,
    row.spotlight_expires_at
  );

  const featured =
    row.plan_id === "featured" &&
    (!row.featured_expires_at || isFutureDate(row.featured_expires_at));

  const boosted = isPromotionActive(row.boost_active, row.boost_expires_at);

  return spotlight || featured || boosted;
}

function getPromotionRank(row: HomepagePropertyRow) {
  const spotlight = isPromotionActive(
    row.spotlight_active,
    row.spotlight_expires_at
  );

  const featured =
    row.plan_id === "featured" &&
    (!row.featured_expires_at || isFutureDate(row.featured_expires_at));

  const boosted = isPromotionActive(row.boost_active, row.boost_expires_at);

  if (spotlight) return 3;
  if (featured) return 2;
  if (boosted) return 1;
  return 0;
}

function sortRowsByFeaturedNewest(
  a: HomepagePropertyRow,
  b: HomepagePropertyRow
) {
  const promoDiff = getPromotionRank(b) - getPromotionRank(a);
  if (promoDiff !== 0) return promoDiff;

  const timeA = new Date(a.posted_date || a.created_at || 0).getTime();
  const timeB = new Date(b.posted_date || b.created_at || 0).getTime();

  return timeB - timeA;
}

function sortPropertyImages(images?: PropertyImageRow[] | null) {
  return [...(images ?? [])].sort((a, b) => {
    const coverA = a.is_cover ? 1 : 0;
    const coverB = b.is_cover ? 1 : 0;

    if (coverA !== coverB) return coverB - coverA;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
}

function buildPropertyImages(images?: PropertyImageRow[] | null) {
  const sorted = sortPropertyImages(images);
  if (sorted.length > 0) return sorted.map((item) => item.image_url);
  return ["/placeholder-property.jpg"];
}

function getGarageLabel(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "0 Garasi";

  if (typeof value === "number") return `${value} Garasi`;

  const raw = String(value).trim().toLowerCase();
  const num = raw.match(/\d+/)?.[0];

  if (num) return `${num} Garasi`;
  if (raw === "ada") return "1 Garasi";
  if (raw === "tidak_ada" || raw === "tidak ada") return "0 Garasi";

  return String(value);
}

function getMainSize(row: HomepagePropertyRow) {
  const value = row.building_size ?? row.land_size ?? 0;
  return `${value} m²`;
}

async function ensureHomepageAuth(
  router: ReturnType<typeof useRouter>,
  lang: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) return user.id;

  alert(
    lang === "id"
      ? "Silakan login terlebih dahulu."
      : "Please log in first."
  );

  const next =
    typeof window !== "undefined" ? window.location.pathname : "/";

  router.push(`/login?next=${encodeURIComponent(next)}`);
  return null;
}

/* =========================
   DATA
========================= */

async function fetchHomepageProperties() {
  const { data, error } = await supabase
    .from("properties")
    .select(`
      id,
      kode,
      posted_date,
      created_at,
      title,
      price,
      province,
      city,
      area,
      building_size,
      land_size,
      bedrooms,
      furnishing,
      garage,
      listing_type,
      rental_type,
      property_type,
      source,
      status,
      verification_status,
      verified_ok,
      plan_id,
      is_paused,
      listing_expires_at,
      featured_expires_at,
      boost_active,
      boost_expires_at,
      spotlight_active,
      spotlight_expires_at,
      transaction_status,
      contact_user_id,
      contact_name,
      contact_phone,
      contact_role,
      contact_agency,
      property_images (
        image_url,
        sort_order,
        is_cover
      )
    `)
    .neq("status", "rejected")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as HomepagePropertyRow[];
}

async function fetchHomepageProfilesByIds(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return new Map<string, HomepageProfileRow>();
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        photo_url,
        address,
        agency,
        phone,
        role,
        instagram_url,
        facebook_url,
        tiktok_url,
        linkedin_url
      `)
      .in("id", uniqueIds);

    if (error) {
      console.error("Failed to load homepage profile fallback:", error);
      return new Map<string, HomepageProfileRow>();
    }

    return new Map(
      ((data ?? []) as HomepageProfileRow[]).map((profile) => [
        profile.id,
        profile,
      ])
    );
  } catch (error) {
    console.error("Failed to load homepage profile fallback:", error);
    return new Map<string, HomepageProfileRow>();
  }
}

/* =========================
   SMALL UI
========================= */

function InfoCard({
  title,
  description,
  className = "",
}: {
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-gray-200 bg-white p-4 text-left shadow-sm sm:p-5 ${className}`}
    >
      <h3 className="mb-2 text-base font-semibold text-[#1C1C1E] sm:text-lg">
        {title}
      </h3>
      <p className="text-sm leading-6 text-gray-600 sm:leading-7">
        {description}
      </p>
    </div>
  );
}

function SectionEmpty({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
      {text}
    </div>
  );
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

/* =========================
   ICONS
========================= */

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

/* =========================
   ENGAGEMENT + VIEWING
========================= */

function PropertyEngagementBar({
  propertyId,
  propertyTitle,
  propertyProvince,
}: {
  propertyId: string;
  propertyTitle: string;
  propertyProvince: string;
}) {
  const router = useRouter();
  const { lang } = useLanguage();

  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [displayLikeCount, setDisplayLikeCount] = useState(0);
  const [displaySaveCount, setDisplaySaveCount] = useState(0);
  const [displayRatingAverage, setDisplayRatingAverage] = useState(0);
  const [displayRatingCount, setDisplayRatingCount] = useState(0);
  const [displayShareCount, setDisplayShareCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadAuthUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;
      setAuthUserId(user?.id ?? null);
    }

    loadAuthUser();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadEngagement() {
      setLiked(false);
      setSaved(false);
      setUserRating(0);
      setDisplayLikeCount(0);
      setDisplaySaveCount(0);
      setDisplayRatingAverage(0);
      setDisplayRatingCount(0);
      setDisplayShareCount(0);

      try {
        const [summaryRes, savedRes, likedRes, userRatingRes] =
          await Promise.all([
            supabase
              .from("property_engagement_summary")
              .select(
                "save_count, like_count, rating_count, avg_rating, share_count"
              )
              .eq("property_id", propertyId)
              .maybeSingle(),
            authUserId
              ? supabase
                  .from("saved_properties")
                  .select("id")
                  .eq("user_id", authUserId)
                  .eq("property_id", propertyId)
                  .maybeSingle()
              : Promise.resolve({ data: null } as any),
            authUserId
              ? supabase
                  .from("property_likes")
                  .select("id")
                  .eq("user_id", authUserId)
                  .eq("property_id", propertyId)
                  .maybeSingle()
              : Promise.resolve({ data: null } as any),
            authUserId
              ? supabase
                  .from("property_ratings")
                  .select("rating")
                  .eq("user_id", authUserId)
                  .eq("property_id", propertyId)
                  .maybeSingle()
              : Promise.resolve({ data: null } as any),
          ]);

        if (ignore) return;

        if (summaryRes.data) {
          const summary = summaryRes.data as any;
          setDisplaySaveCount(Number(summary.save_count || 0));
          setDisplayLikeCount(Number(summary.like_count || 0));
          setDisplayRatingCount(Number(summary.rating_count || 0));
          setDisplayRatingAverage(
            Number(Number(summary.avg_rating || 0).toFixed(1))
          );
          setDisplayShareCount(Number(summary.share_count || 0));
        }

        setSaved(Boolean(savedRes.data));
        setLiked(Boolean(likedRes.data));
        setUserRating(Number((userRatingRes.data as any)?.rating || 0));
      } catch (error) {
        console.error("Failed to load homepage property engagement:", error);
      }
    }

    loadEngagement();

    return () => {
      ignore = true;
    };
  }, [propertyId, authUserId]);

  async function toggleSave() {
    const userId = await ensureHomepageAuth(router, lang);
    if (!userId) return;

    const currentlySaved = saved;

    setSaved(!currentlySaved);
    setDisplaySaveCount((prev) =>
      Math.max(0, prev + (currentlySaved ? -1 : 1))
    );

    if (currentlySaved) {
      const { error } = await supabase
        .from("saved_properties")
        .delete()
        .eq("user_id", userId)
        .eq("property_id", propertyId);

      if (error) {
        console.error("Failed to remove saved property:", error);
        setSaved(true);
        setDisplaySaveCount((prev) => prev + 1);
      }
      return;
    }

    const { error } = await supabase.from("saved_properties").insert({
      user_id: userId,
      property_id: propertyId,
    });

    if (error) {
      console.error("Failed to save property:", error);
      setSaved(false);
      setDisplaySaveCount((prev) => Math.max(0, prev - 1));
    }
  }

  async function toggleLike() {
    const userId = await ensureHomepageAuth(router, lang);
    if (!userId) return;

    const currentlyLiked = liked;

    setLiked(!currentlyLiked);
    setDisplayLikeCount((prev) =>
      Math.max(0, prev + (currentlyLiked ? -1 : 1))
    );

    if (currentlyLiked) {
      const { error } = await supabase
        .from("property_likes")
        .delete()
        .eq("user_id", userId)
        .eq("property_id", propertyId);

      if (error) {
        console.error("Failed to remove property like:", error);
        setLiked(true);
        setDisplayLikeCount((prev) => prev + 1);
      }
      return;
    }

    const { error } = await supabase.from("property_likes").insert({
      user_id: userId,
      property_id: propertyId,
    });

    if (error) {
      console.error("Failed to like property:", error);
      setLiked(false);
      setDisplayLikeCount((prev) => Math.max(0, prev - 1));
    }
  }

  async function handleRate(nextValue: number) {
    const userId = await ensureHomepageAuth(router, lang);
    if (!userId) return;

    const currentRating = userRating;
    const currentCount = displayRatingCount;
    const currentAverage = displayRatingAverage;
    const nextRating = currentRating === nextValue ? 0 : nextValue;

    let nextCount = currentCount;
    let total = currentAverage * currentCount;

    if (currentRating > 0) {
      total -= currentRating;
      nextCount -= 1;
    }

    if (nextRating > 0) {
      total += nextRating;
      nextCount += 1;
    }

    const nextAverage = nextCount > 0 ? total / nextCount : 0;

    setUserRating(nextRating);
    setDisplayRatingCount(Math.max(nextCount, 0));
    setDisplayRatingAverage(Number(nextAverage.toFixed(1)));

    if (nextRating === 0) {
      const { error } = await supabase
        .from("property_ratings")
        .delete()
        .eq("user_id", userId)
        .eq("property_id", propertyId);

      if (error) {
        console.error("Failed to delete property rating:", error);
        setUserRating(currentRating);
        setDisplayRatingCount(currentCount);
        setDisplayRatingAverage(currentAverage);
      }
      return;
    }

    const { error } = await supabase.from("property_ratings").upsert(
      {
        user_id: userId,
        property_id: propertyId,
        rating: nextRating,
      },
      { onConflict: "user_id,property_id" }
    );

    if (error) {
      console.error("Failed to rate property:", error);
      setUserRating(currentRating);
      setDisplayRatingCount(currentCount);
      setDisplayRatingAverage(currentAverage);
    }
  }

  async function handleShare() {
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/properti/${propertyId}`
        : `/properti/${propertyId}`;

    const shareText =
      lang === "id"
        ? `Lihat properti ini di TETAMO:\n\n${propertyTitle}\n${propertyProvince}`
        : `Check out this property on TETAMO:\n\n${propertyTitle}\n${propertyProvince}`;

    let shareMethod = "copy_link";

    try {
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
      ) {
        await navigator.share({
          title: propertyTitle,
          text: shareText,
          url: shareUrl,
        });
        shareMethod = "native_share";
      } else if (
        typeof navigator !== "undefined" &&
        navigator.clipboard?.writeText
      ) {
        await navigator.clipboard.writeText(shareUrl);
        shareMethod = "copy_link";
        alert(
          lang === "id"
            ? "Link properti berhasil disalin."
            : "Property link copied successfully."
        );
      } else if (typeof window !== "undefined") {
        window.prompt(
          lang === "id"
            ? "Salin link properti ini:"
            : "Copy this property link:",
          shareUrl
        );
        shareMethod = "manual_copy";
      }
    } catch (error: any) {
      if (error?.name === "AbortError") return;

      try {
        if (
          typeof navigator !== "undefined" &&
          navigator.clipboard?.writeText
        ) {
          await navigator.clipboard.writeText(shareUrl);
          shareMethod = "copy_link";
          alert(
            lang === "id"
              ? "Link properti berhasil disalin."
              : "Property link copied successfully."
          );
        } else if (typeof window !== "undefined") {
          window.prompt(
            lang === "id"
              ? "Salin link properti ini:"
              : "Copy this property link:",
            shareUrl
          );
          shareMethod = "manual_copy";
        }
      } catch (fallbackError) {
        console.error("Failed to share property:", fallbackError);
        return;
      }
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) return;

      const { error } = await supabase.from("property_shares").insert({
        property_id: propertyId,
        user_id: user.id,
        share_method: shareMethod,
      });

      if (!error) {
        setDisplayShareCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Failed to save homepage property share:", error);
    }
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
          <span>Save ({displaySaveCount})</span>
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
          <span>Like ({displayLikeCount})</span>
        </button>

        <div className="flex min-h-[60px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-2 py-2 text-center shadow-sm">
          <div className="text-sm font-extrabold text-[#1C1C1E] sm:text-base">
            {displayRatingAverage.toFixed(1)}
          </div>
          <div className="mt-1 text-[10px] text-gray-500 sm:text-[11px]">
            Rating ({displayRatingCount})
          </div>
        </div>

        <button
          type="button"
          onClick={handleShare}
          className="flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl border border-gray-200 bg-white px-2 py-2 text-center shadow-sm transition hover:bg-gray-50"
        >
          <Share2 className="h-4 w-4 text-[#1C1C1E]" />
          <span className="text-[10px] font-semibold text-[#1C1C1E] sm:text-[11px]">
            Share ({displayShareCount})
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

function ScheduleViewingButton({
  propertyId,
  propertyTitle,
  propertyCode,
  receiverId,
  receiverName,
  receiverRole,
}: {
  propertyId: string;
  propertyTitle: string;
  propertyCode?: string;
  receiverId: string;
  receiverName: string;
  receiverRole: string;
}) {
  const router = useRouter();
  const { lang } = useLanguage();

  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleViewingRequest() {
    const userId = await ensureHomepageAuth(router, lang);
    if (!userId) return;

    setSubmitting(true);

    try {
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("full_name, phone, email")
        .eq("id", userId)
        .maybeSingle();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const message =
        lang === "id"
          ? `Request viewing untuk ${propertyTitle} pada ${selectedDate} jam ${selectedTime}`
          : `Viewing request for ${propertyTitle} on ${selectedDate} at ${selectedTime}`;

      const { error } = await supabase.from("leads").insert({
        property_id: propertyId,
        sender_user_id: userId,
        sender_name:
          senderProfile?.full_name ||
          (typeof user?.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : "Tetamo User"),
        sender_email: senderProfile?.email || user?.email || null,
        sender_phone: senderProfile?.phone || null,
        receiver_user_id: receiverId || null,
        receiver_name: receiverName || null,
        receiver_role: receiverRole || "owner",
        assigned_admin_user_id: null,
        admin_visible: true,
        lead_type: "viewing",
        source: "homepage_viewing_form",
        message,
        viewing_date: selectedDate,
        viewing_time: selectedTime,
        status: "new",
        priority: "normal",
        notes: null,
      });

      if (error) {
        console.error("Homepage viewing lead insert error:", error);
        alert(error.message || "Failed to save viewing request.");
        return;
      }

      alert(
        lang === "id"
          ? "Permintaan viewing berhasil dikirim."
          : "Viewing request sent successfully."
      );

      setOpen(false);
      setSelectedDate("");
      setSelectedTime("");
    } catch (error) {
      console.error("Failed to create homepage viewing request:", error);
      alert(
        lang === "id"
          ? "Gagal mengirim permintaan viewing."
          : "Failed to send viewing request."
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
        {lang === "id" ? "Schedule Viewing" : "Schedule Viewing"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-4">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50"
            aria-label="Close Schedule Viewing popup"
          />

          <div className="relative z-10 w-full max-w-lg rounded-3xl bg-white p-5 shadow-xl sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-[#1C1C1E]">
                  {lang === "id" ? "Jadwal Viewing" : "Schedule Viewing"}
                </h3>
                <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                  {propertyTitle}
                  {propertyCode ? ` • ${propertyCode}` : ""}
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
                onClick={handleViewingRequest}
                disabled={!selectedDate || !selectedTime || submitting}
                className={[
                  "w-full rounded-2xl px-4 py-3 text-sm font-semibold transition",
                  selectedDate && selectedTime && !submitting
                    ? "bg-[#B8860B] text-white hover:opacity-90"
                    : "cursor-not-allowed bg-gray-200 text-gray-500",
                ].join(" ")}
              >
                {submitting
                  ? lang === "id"
                    ? "Mengirim..."
                    : "Sending..."
                  : lang === "id"
                    ? "Kirim Permintaan Viewing"
                    : "Send Viewing Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* =========================
   CARDS
========================= */

function FeaturedPropertiesCard({ property }: { property: FeaturedProperty }) {
  const [imgIndex, setImgIndex] = useState(0);
  const { lang } = useLanguage();

  const next = () =>
    setImgIndex((prev) =>
      prev === property.images.length - 1 ? 0 : prev + 1
    );

  const prev = () =>
    setImgIndex((prev) =>
      prev === 0 ? property.images.length - 1 : prev - 1
    );

  const whatsappHref = property.whatsapp
    ? `https://wa.me/${property.whatsapp}?text=${encodeURIComponent(
        lang === "id"
          ? `Halo, saya melihat properti ini di TETAMO dan tertarik.

Kode: ${property.kode || "-"}
Lokasi: ${property.province}
Harga: ${property.price}

Apakah properti ini masih tersedia?`
          : `Hello, I saw this property on TETAMO and I am interested.

Code: ${property.kode || "-"}
Location: ${property.province}
Price: ${property.price}

Is this property still available?`
      )}`
    : "#";

  function getVerifiedBadgeText() {
    if (property.postedByType === "owner") {
      return lang === "id" ? "Pemilik Terverifikasi" : "Verified Owner";
    }

    if (property.postedByType === "developer") {
      return lang === "id" ? "Developer Terverifikasi" : "Verified Developer";
    }

    return lang === "id" ? "Agen Terverifikasi" : "Verified Agent";
  }

  function getPosterLabel() {
    if (property.postedByType === "owner") {
      return lang === "id" ? "Pemilik" : "Owner";
    }

    if (property.postedByType === "developer") {
      return lang === "id" ? "Developer" : "Developer";
    }

    return lang === "id" ? "Agen" : "Agent";
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
      <div className="relative">
        <div className="absolute left-3 top-3 z-10">
          {property.verifiedListing ? (
            <div className="rounded-full bg-[#1C1C1E] px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">
              {getVerifiedBadgeText()}
            </div>
          ) : (
            <div className="rounded-full bg-gray-200 px-3 py-1 text-[11px] font-semibold text-gray-800 sm:text-xs">
              {lang === "id" ? "Pending" : "Pending"}
            </div>
          )}
        </div>

        <img
          src={property.images[imgIndex]}
          alt="Property"
          className="h-[410px] w-full object-cover sm:h-[360px] lg:h-[420px]"
        />

        <div className="absolute right-3 top-3 rounded-full bg-[#1C1C1E]/80 px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">
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
          {property.price}
        </h3>

        <h4 className="mt-2 text-[15px] font-semibold leading-6 text-[#1C1C1E] sm:text-base">
          {property.title}
        </h4>

        <p className="mt-1 text-sm text-gray-600">{property.province}</p>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          {property.size} • {translateBed(property.bed, lang)} •{" "}
          {translateFurnishing(property.furnishing, lang)} •{" "}
          {translateGarage(property.garage, lang)}
        </p>

        <div className="mt-3">
          <p className="text-sm text-gray-600">
            {getPosterLabel()}:{" "}
            <span className="font-semibold text-gray-800">
              {property.posterName}
            </span>
          </p>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            {property.kode && (
              <span>
                {lang === "id" ? "Kode:" : "Code:"}{" "}
                <span className="font-medium text-gray-700">
                  {property.kode}
                </span>
              </span>
            )}

            {property.postedDate && (
              <span>
                {lang === "id" ? "Tayang:" : "Posted:"}{" "}
                <span className="font-medium text-gray-700">
                  {property.postedDate}
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <a
            href={whatsappHref}
            onClick={(e) => {
              if (!property.whatsapp) e.preventDefault();
            }}
            target="_blank"
            rel="noreferrer"
            className={`flex min-h-[48px] items-center justify-center rounded-2xl px-3 py-3 text-center text-[13px] font-semibold text-white transition sm:text-sm ${
              property.whatsapp
                ? "bg-[#1C1C1E] hover:opacity-90"
                : "cursor-not-allowed bg-gray-300"
            }`}
          >
            WhatsApp
          </a>

          <Link
            href={`/properti/${property.id}`}
            className="flex min-h-[48px] items-center justify-center rounded-2xl bg-yellow-600 px-3 py-3 text-center text-[13px] font-bold text-white transition hover:bg-yellow-700 sm:text-sm"
          >
            {lang === "id" ? "Lihat Detail" : "View Detail"}
          </Link>
        </div>

        <ScheduleViewingButton
          propertyId={property.id}
          propertyTitle={property.title}
          propertyCode={property.kode}
          receiverId={property.receiverId}
          receiverName={property.receiverName}
          receiverRole={property.receiverRole}
        />

        <PropertyEngagementBar
          propertyId={property.id}
          propertyTitle={property.title}
          propertyProvince={property.province}
        />
      </div>
    </div>
  );
}

function FeaturedOwnerPropertyCard({
  property,
}: {
  property: FeaturedOwnerProperty;
}) {
  const [imgIndex, setImgIndex] = useState(0);
  const { lang } = useLanguage();

  const next = () =>
    setImgIndex((prev) =>
      prev === property.images.length - 1 ? 0 : prev + 1
    );

  const prev = () =>
    setImgIndex((prev) =>
      prev === 0 ? property.images.length - 1 : prev - 1
    );

  const whatsappHref = property.ownerWhatsapp
    ? `https://wa.me/${property.ownerWhatsapp}`
    : "#";

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
      <div className="relative">
        <div className="absolute left-3 top-3 z-10">
          {property.ownerApproved ? (
            <div className="rounded-full bg-[#1C1C1E] px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">
              {lang === "id" ? "Pemilik Terverifikasi" : "Verified Owner"}
            </div>
          ) : (
            <div className="rounded-full bg-gray-200 px-3 py-1 text-[11px] font-semibold text-gray-800 sm:text-xs">
              {lang === "id" ? "Pending Verifikasi" : "Pending Verification"}
            </div>
          )}
        </div>

        <img
          src={property.images[imgIndex]}
          alt="Property"
          className="h-[320px] w-full object-cover sm:h-[360px] lg:h-[420px]"
        />

        <div className="absolute right-3 top-3 rounded-full bg-[#1C1C1E]/80 px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">
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
          {property.price}
        </h3>

        <h4 className="mt-2 text-[15px] font-semibold leading-6 text-[#1C1C1E] sm:text-base">
          {property.title}
        </h4>

        <p className="mt-1 text-sm text-gray-600">{property.province}</p>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          {property.size} • {translateBed(property.bed, lang)} •{" "}
          {translateFurnishing(property.furnishing, lang)} •{" "}
          {translateGarage(property.garage, lang)}
        </p>

        <div className="mt-3">
          <p className="text-sm text-gray-600">
            {lang === "id" ? "Pemilik:" : "Owner:"}{" "}
            <span className="font-semibold text-[#1C1C1E]">
              {property.ownerName}
            </span>
          </p>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            {property.kode && (
              <span>
                {lang === "id" ? "Kode:" : "Code:"}{" "}
                <span className="font-medium text-gray-700">
                  {property.kode}
                </span>
              </span>
            )}

            {property.postedDate && (
              <span>
                {lang === "id" ? "Tayang:" : "Posted:"}{" "}
                <span className="font-medium text-gray-700">
                  {property.postedDate}
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <a
            href={whatsappHref}
            onClick={(e) => {
              if (!property.ownerWhatsapp) e.preventDefault();
            }}
            target="_blank"
            rel="noreferrer"
            className={`flex min-h-[48px] items-center justify-center rounded-2xl px-3 py-3 text-center text-[13px] font-semibold text-white transition sm:text-sm ${
              property.ownerWhatsapp
                ? "bg-[#1C1C1E] hover:opacity-90"
                : "cursor-not-allowed bg-gray-300"
            }`}
          >
            {lang === "id" ? "WhatsApp Pemilik" : "WhatsApp Owner"}
          </a>

          <Link
            href={`/properti/${property.id}`}
            className="flex min-h-[48px] items-center justify-center rounded-2xl bg-yellow-600 px-3 py-3 text-center text-[13px] font-bold text-white transition hover:bg-yellow-700 sm:text-sm"
          >
            {lang === "id" ? "Lihat Detail" : "View Detail"}
          </Link>
        </div>

        <ScheduleViewingButton
          propertyId={property.id}
          propertyTitle={property.title}
          propertyCode={property.kode}
          receiverId={property.receiverId}
          receiverName={property.receiverName}
          receiverRole={property.receiverRole}
        />

        <PropertyEngagementBar
          propertyId={property.id}
          propertyTitle={property.title}
          propertyProvince={property.province}
        />
      </div>
    </div>
  );
}

/* =========================
   SECTIONS
========================= */

function FeaturedPropertiesSection() {
  const { lang } = useLanguage();
  const [properties, setProperties] = useState<FeaturedProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadFeaturedProperties() {
      try {
        setLoading(true);

        const rows = await fetchHomepageProperties();

        const publicVerifiedRows = rows
          .filter((row) => isListingPublic(row))
          .filter((row) => isVerifiedListing(row));

        const featuredRows = FEATURED_PROPERTY_CODES.map((kode) =>
          publicVerifiedRows.find(
            (row) =>
              normalizePropertyCode(row.kode) === normalizePropertyCode(kode)
          )
        ).filter((row): row is HomepagePropertyRow => Boolean(row));

        const profileIds = Array.from(
          new Set(
            featuredRows
              .map((row) => row.contact_user_id)
              .filter((value): value is string => Boolean(value))
          )
        );

        const profilesMap = await fetchHomepageProfilesByIds(profileIds);

        const mapped = featuredRows.map((row) => {
          const profile = row.contact_user_id
            ? profilesMap.get(row.contact_user_id)
            : null;

          return {
            id: row.id,
            title: row.title ?? "-",
            images: buildPropertyImages(row.property_images),
            price: formatIdr(row.price ?? 0),
            province: row.province ?? row.city ?? row.area ?? "-",
            size: getMainSize(row),
            bed: `${row.bedrooms ?? 0} Bed`,
            furnishing: mapFurnishing(row.furnishing),
            garage: getGarageLabel(row.garage),
            posterName: row.contact_name || profile?.full_name || "Tetamo User",
            postedByType: normalizePostedByType(row.contact_role, row.source),
            whatsapp: normalizeWhatsapp(
              row.contact_phone || profile?.phone || ""
            ),
            receiverId: row.contact_user_id || "",
            receiverName:
              row.contact_name || profile?.full_name || "Tetamo User",
            receiverRole: normalizePostedByType(row.contact_role, row.source),
            kode: row.kode ?? undefined,
            postedDate: formatPostedDate(row.posted_date || row.created_at),
            verifiedListing: isVerifiedListing(row),
          };
        });

        if (!ignore) setProperties(mapped);
      } catch (error) {
        console.error("Failed to load featured properties:", error);
        if (!ignore) setProperties([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadFeaturedProperties();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <section className="bg-gray-100 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-10 text-center text-2xl font-bold text-[#1C1C1E] sm:mb-12 sm:text-3xl">
          {lang === "id" ? "Properti Unggulan" : "Featured Properties"}
        </h2>

        {loading ? (
          <SectionEmpty
            text={
              lang === "id"
                ? "Memuat properti unggulan..."
                : "Loading featured properties..."
            }
          />
        ) : properties.length === 0 ? (
          <SectionEmpty
            text={
              lang === "id"
                ? "Belum ada properti unggulan."
                : "No featured properties yet."
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 xl:grid-cols-3 xl:gap-10">
            {properties.map((p) => (
              <FeaturedPropertiesCard key={p.id} property={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function FeaturedAgentsSection() {
  const { lang } = useLanguage();
  const [agents, setAgents] = useState<FeaturedAgent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadFeaturedAgents() {
      try {
        setLoading(true);

        const rows = await fetchHomepageProperties();

        const agentRows = rows
          .filter((row) => isListingPublic(row))
          .filter((row) => isVerifiedListing(row))
          .filter((row) => hasFeaturedPlacement(row))
          .filter(
            (row) =>
              normalizePostedByType(row.contact_role, row.source) === "agent"
          )
          .sort(sortRowsByFeaturedNewest);

        const uniqueRows = new Map<string, HomepagePropertyRow>();

        for (const row of agentRows) {
          const key =
            row.contact_user_id ||
            row.contact_name ||
            row.contact_phone ||
            row.id;

          if (!uniqueRows.has(key)) {
            uniqueRows.set(key, row);
          }
        }

        const limitedRows = Array.from(uniqueRows.values()).slice(0, 3);

        const profileIds = Array.from(
          new Set(
            limitedRows
              .map((row) => row.contact_user_id)
              .filter((value): value is string => Boolean(value))
          )
        );

        const profilesMap = await fetchHomepageProfilesByIds(profileIds);

        const mapped = limitedRows.map((row) => {
          const profile = row.contact_user_id
            ? profilesMap.get(row.contact_user_id)
            : null;

          return {
            id: row.contact_user_id || row.id,
            name: row.contact_name || profile?.full_name || "Tetamo Agent",
            photo:
              profile?.photo_url ||
              "https://randomuser.me/api/portraits/men/32.jpg",
            location:
              profile?.address ||
              row.province ||
              row.city ||
              row.area ||
              "Indonesia",
            agency:
              row.contact_agency || profile?.agency || "Tetamo Agent Network",
            experience:
              lang === "id"
                ? "Agen Unggulan Tetamo"
                : "Tetamo Featured Agent",
            whatsapp: normalizeWhatsapp(
              row.contact_phone || profile?.phone || ""
            ),
            agentVerified: true,
            socials: {
              instagram: profile?.instagram_url || "",
              facebook: profile?.facebook_url || "",
              tiktok: profile?.tiktok_url || "",
              linkedin: profile?.linkedin_url || "",
            },
          };
        });

        if (!ignore) setAgents(mapped);
      } catch (error) {
        console.error("Failed to load featured agents:", error);
        if (!ignore) setAgents([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadFeaturedAgents();

    return () => {
      ignore = true;
    };
  }, [lang]);

  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-4 text-center text-2xl font-bold text-[#1C1C1E] sm:text-3xl">
          {lang === "id" ? "Agen Unggulan TeTamo" : "TeTamo Featured Agents"}
        </h2>

        <p className="mx-auto mb-10 max-w-2xl px-2 text-center text-sm leading-7 text-gray-600 sm:mb-12 sm:text-base">
          {lang === "id"
            ? "Profil agen modern yang terhubung dengan media sosial, memudahkan pembeli serius menemukan dan menghubungi Anda secara langsung."
            : "Modern agent profiles connected to social media, making it easy for serious buyers to find and contact you directly."}
        </p>

        {loading ? (
          <SectionEmpty
            text={
              lang === "id"
                ? "Memuat agen unggulan..."
                : "Loading featured agents..."
            }
          />
        ) : agents.length === 0 ? (
          <SectionEmpty
            text={
              lang === "id"
                ? "Belum ada agen unggulan."
                : "No featured agents yet."
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 xl:grid-cols-3 xl:gap-10">
            {agents.map((agent) => {
              const whatsappHref = agent.whatsapp
                ? `https://wa.me/${agent.whatsapp}`
                : "#";

              return (
                <div
                  key={agent.id}
                  className="relative rounded-3xl border border-gray-200 bg-gray-100 p-5 shadow-sm sm:p-6"
                >
                  <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
                    {agent.agentVerified && (
                      <div className="rounded-full bg-[#1C1C1E] px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">
                        {lang === "id"
                          ? "Agen Terverifikasi"
                          : "Verified Agent"}
                      </div>
                    )}

                    <div className="inline-flex items-center gap-1 rounded-full bg-[#B8860B] px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">
                      <Crown className="h-3.5 w-3.5" />
                      {lang === "id" ? "Agen Unggulan" : "Featured Agent"}
                    </div>
                  </div>

                  <div className="mt-10 flex items-start gap-4 sm:mt-12">
                    <img
                      src={agent.photo}
                      alt={agent.name}
                      className="h-24 w-24 shrink-0 rounded-2xl object-cover sm:h-28 sm:w-28"
                    />

                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-[#1C1C1E] sm:text-lg">
                        {agent.name}
                      </h3>

                      <div className="mt-1 text-sm text-gray-600">
                        {agent.agency}
                      </div>

                      <div className="mt-1 text-sm text-gray-500">
                        {agent.location}
                      </div>

                      <p className="mt-2 text-sm text-gray-500">
                        {agent.experience}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <SocialBtn href={agent.socials?.instagram} label="Instagram">
                      <IconInstagram />
                    </SocialBtn>
                    <SocialBtn href={agent.socials?.facebook} label="Facebook">
                      <IconFacebook />
                    </SocialBtn>
                    <SocialBtn href={agent.socials?.tiktok} label="TikTok">
                      <IconTikTok />
                    </SocialBtn>
                    <SocialBtn href={agent.socials?.linkedin} label="LinkedIn">
                      <IconLinkedIn />
                    </SocialBtn>
                  </div>

                  <a
                    href={whatsappHref}
                    onClick={(e) => {
                      if (!agent.whatsapp) e.preventDefault();
                    }}
                    target="_blank"
                    rel="noreferrer"
                    className={`mt-5 inline-block w-full rounded-2xl px-4 py-3 text-center text-sm font-semibold text-white transition ${
                      agent.whatsapp
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
        )}
      </div>
    </section>
  );
}

function FeaturedOwnersSection() {
  const { lang } = useLanguage();
  const [owners, setOwners] = useState<FeaturedOwnerProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadFeaturedOwners() {
      try {
        setLoading(true);

        const rows = await fetchHomepageProperties();

        const ownerRows = rows
          .filter((row) => isListingPublic(row))
          .filter((row) => isVerifiedListing(row))
          .filter((row) => hasFeaturedPlacement(row))
          .filter(
            (row) =>
              normalizePostedByType(row.contact_role, row.source) === "owner"
          )
          .sort(sortRowsByFeaturedNewest)
          .slice(0, 3);

        const profileIds = Array.from(
          new Set(
            ownerRows
              .map((row) => row.contact_user_id)
              .filter((value): value is string => Boolean(value))
          )
        );

        const profilesMap = await fetchHomepageProfilesByIds(profileIds);

        const mapped = ownerRows.map((row) => {
          const profile = row.contact_user_id
            ? profilesMap.get(row.contact_user_id)
            : null;

          return {
            id: row.id,
            title: row.title ?? "-",
            ownerName: row.contact_name || profile?.full_name || "Tetamo Owner",
            ownerWhatsapp: normalizeWhatsapp(
              row.contact_phone || profile?.phone || ""
            ),
            receiverId: row.contact_user_id || "",
            receiverName:
              row.contact_name || profile?.full_name || "Tetamo Owner",
            receiverRole: "owner",
            images: buildPropertyImages(row.property_images),
            price: formatIdr(row.price ?? 0),
            province: row.province ?? row.city ?? row.area ?? "-",
            size: getMainSize(row),
            bed: `${row.bedrooms ?? 0} Bed`,
            furnishing: mapFurnishing(row.furnishing),
            garage: getGarageLabel(row.garage),
            kode: row.kode ?? undefined,
            postedDate: formatPostedDate(row.posted_date || row.created_at),
            ownerApproved: true,
          };
        });

        if (!ignore) setOwners(mapped);
      } catch (error) {
        console.error("Failed to load featured owner properties:", error);
        if (!ignore) setOwners([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadFeaturedOwners();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <section className="bg-gray-100 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-4 text-center text-2xl font-bold text-[#1C1C1E] sm:text-3xl">
          {lang === "id"
            ? "Properti Pemilik Unggulan"
            : "Featured Owner Properties"}
        </h2>

        <p className="mx-auto mb-10 max-w-2xl px-2 text-center text-sm leading-7 text-gray-600 sm:mb-12 sm:text-base">
          {lang === "id"
            ? "Properti langsung dari pemilik. Transparan, jelas, dan terverifikasi."
            : "Verified properties directly from owners."}
        </p>

        {loading ? (
          <SectionEmpty
            text={
              lang === "id"
                ? "Memuat properti pemilik..."
                : "Loading owner properties..."
            }
          />
        ) : owners.length === 0 ? (
          <SectionEmpty
            text={
              lang === "id"
                ? "Belum ada properti pemilik unggulan."
                : "No featured owner properties yet."
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 xl:grid-cols-3 xl:gap-10">
            {owners.map((p) => (
              <FeaturedOwnerPropertyCard key={p.id} property={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* =========================
   PAGE
========================= */

export default function HomeClient() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [q, setQ] = useState("");

  const goSearch = () => {
    const query = q.trim();
    if (!query) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-gray-900">
      <section className="bg-[#F7F7F8] px-4 pb-10 pt-8 text-center sm:px-6 sm:pb-12 sm:pt-10 md:pt-14 lg:px-8 lg:pb-20 lg:pt-20">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-[30px] font-bold leading-[1.08] tracking-[-0.03em] text-[#1C1C1E] sm:text-[35px] md:text-5xl lg:text-[42px]">
            {lang === "id"
              ? "Pasang Iklan di TeTamo"
              : "Advertise at TeTamo"}
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-[#5F6B7A] sm:mt-5 sm:text-base md:text-lg md:leading-8">
            {lang === "id"
              ? "PROPERTY • BUSINESS • LIFESTYLE — Transparan, Profesional, dan Fokus pada klien yang serius."
              : "PROPERTY • BUSINESS • LIFESTYLE — Transparent, Professional, and Focused on serious clients."}
          </p>

          <div className="mx-auto mt-7 w-full max-w-3xl rounded-[22px] border border-gray-200 bg-white p-2 shadow-sm sm:mt-8">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") goSearch();
                  }}
                  placeholder={
                    lang === "id"
                      ? "Cari lokasi, harga, agen, properti..."
                      : "Search location, price, agent, property..."
                  }
                  className="h-11 w-full rounded-[16px] border border-transparent px-4 text-[15px] text-[#1C1C1E] placeholder:text-gray-500 focus:border-gray-200 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={goSearch}
                className="h-11 w-[92px] shrink-0 rounded-[16px] bg-[#1C1C1E] px-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                {lang === "id" ? "Cari" : "Search"}
              </button>
            </div>
          </div>

          <div className="mx-auto mt-7 grid max-w-4xl grid-cols-3 gap-2 sm:mt-8 sm:gap-3">
            <Link
              href="/properti"
              className="inline-flex min-h-[58px] items-center justify-center rounded-2xl bg-[#1C1C1E] px-2 py-2 text-center text-[12px] font-semibold leading-[1.2] text-white transition hover:opacity-90 sm:min-h-[60px] sm:px-4 sm:text-sm md:text-base"
            >
              {lang === "id" ? "Lihat Properti" : "View Properties"}
            </Link>

            <Link
              href="/signup?role=owner&next=/pemilik"
              className="inline-flex min-h-[58px] items-center justify-center rounded-2xl border border-[#1C1C1E] px-2 py-2 text-center text-[12px] font-semibold leading-[1.2] text-[#1C1C1E] transition hover:bg-[#1C1C1E] hover:text-white sm:min-h-[60px] sm:px-4 sm:text-sm md:text-base"
            >
              {lang === "id"
                ? "Iklankan Sebagai Pemilik"
                : "Advertise as Owner"}
            </Link>

            <Link
              href="/signup?role=agent&next=/agentdashboard/paket"
              className="inline-flex min-h-[58px] items-center justify-center rounded-2xl bg-[#E5E7EB] px-2 py-2 text-center text-[12px] font-semibold leading-[1.2] text-[#1C1C1E] transition hover:bg-[#D1D5DB] sm:min-h-[60px] sm:px-4 sm:text-sm md:text-base"
            >
              {lang === "id" ? "Daftar Sebagai Agen" : "Register as Agent"}
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          <InfoCard
            title={
              lang === "id" ? "Properti Terverifikasi" : "Verified Properties"
            }
            description={
              lang === "id"
                ? "Properti asli dari agen dan pemilik. Mengurangi duplikasi dan spam."
                : "Properties directly from verified agents and owners. Fewer duplicates, less spam."
            }
          />

          <InfoCard
            title={lang === "id" ? "Jadwal Viewing" : "Schedule a Viewing"}
            description={
              lang === "id"
                ? "Pembeli dan penyewa bisa menjadwalkan viewing langsung lewat Tetamo."
                : "Buyers and renters can directly schedule a viewing through Tetamo."
            }
          />

          <InfoCard
            title={
              lang === "id"
                ? "Agen Media Sosial dan Branding"
                : "Agent Social Media and Branding"
            }
            description={
              lang === "id"
                ? "Profil agen terhubung ke media sosial, lebih banyak eksposur, lebih besar peluang closing."
                : "Agent profiles connect directly to social media for higher exposure and better closing opportunities."
            }
          />
        </div>
      </section>

      <FeaturedPropertiesSection />
      <FeaturedAgentsSection />
      <FeaturedOwnersSection />

      <section className="mt-12 px-4 pb-16 sm:px-6 lg:mt-16 lg:px-8 lg:pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-gray-200 bg-white px-5 py-8 shadow-sm sm:px-8 sm:py-10 lg:px-10 lg:py-12">
            <div className="flex justify-start md:justify-end">
              <div className="w-full max-w-4xl text-left md:text-right">
                <h4 className="mb-5 text-xs font-semibold tracking-[0.2em] text-gray-500">
                  {lang === "id" ? "INFORMASI" : "INFORMATION"}
                </h4>

                <div className="flex flex-col gap-3 text-sm font-medium text-gray-700 sm:flex-row sm:flex-wrap md:justify-end md:gap-x-8 md:gap-y-3">
  <Link
    href="/blog"
    className="transition hover:text-black"
  >
    {lang === "id" ? "Blog" : "Blog"}
  </Link>

  <Link
  href="/education"
  className="transition hover:text-black"
>
  {lang === "id" ? "Edukasi" : "Education"}
</Link>

  <Link href="/about-us" className="transition hover:text-black">
    {lang === "id" ? "Tentang Kami" : "About Us"}
  </Link>

  <Link href="/faq" className="transition hover:text-black">
    FAQ
  </Link>

  <Link
    href="/kebijakan-berlangganan"
    className="transition hover:text-black"
  >
    {lang === "id"
      ? "Kebijakan Berlangganan"
      : "Subscription Policy"}
  </Link>

  <Link href="/terms" className="transition hover:text-black">
    {lang === "id"
      ? "Syarat & Ketentuan"
      : "Terms and Conditions"}
  </Link>

  <Link
    href="/kebijakan-privasi"
    className="transition hover:text-black"
  >
    {lang === "id" ? "Kebijakan Privasi" : "Privacy Policy"}
  </Link>
</div>

                <div className="mt-6 border-t border-gray-200 pt-4">
                  <p className="text-xs leading-6 text-gray-500 sm:text-sm">
                    {lang === "id"
                      ? "Hubungi Kami: +61 416 957 890 / +62 823 1355 6606 / +62 822 6477 8799 / inquiry@tetamo.com"
                      : "Contact us: +61 416 957 890 / +62 823 1355 6606 / +62 822 6477 8799 / inquiry@tetamo.com"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}