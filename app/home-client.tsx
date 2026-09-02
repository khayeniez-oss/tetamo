"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Crown,
  BriefcaseBusiness,
  MapPin,
  MessageCircle,
  Heart,
  Bookmark,
  Share2,
  Star,
  Eye,
} from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { useCurrency } from "@/app/context/CurrencyContext";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/trackEvent";

/* =========================
   MANUAL HOMEPAGE PICKS
========================= */

const FEATURED_PROPERTY_CODES = ["TTM0-E2", "TTM0 -RTLO", "TTM013"];

const FEATURED_AGENT_NAMES = [
  "Aprianadh",
  "Ir. Gunawan",
  "Jake Wawan Putra",
];

const TETAMO_APP_STORE_URL =
  "https://apps.apple.com/us/app/tetamo/id6771229662";

const TETAMO_PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.tetamo.mobile";

const TETAMO_PARTNER_APP_STORE_URL =
  "https://apps.apple.com/us/app/tetamo-partner/id6804323379";

const TETAMO_PARTNER_PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.tetamo.partner";

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
  view_count: number | null;
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
  viewCount: number;
  images: string[];
  price: string;
  province: string;
  size: string;
  bed: string;
  furnishing: string;
  garage: string;
  posterName: string;
agency: string;
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
  viewCount: number;
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

function formatHomepagePrice(value: number, currency: string) {
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value / 16500);
  }

  if (currency === "AUD") {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(value / 12072);
  }

  return formatIdr(value);
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

function formatCompactNumber(value: number | null | undefined) {
  const safeValue = Number(value ?? 0);

  return new Intl.NumberFormat("en", {
    notation: safeValue >= 1000 ? "compact" : "standard",
    maximumFractionDigits: safeValue >= 1000 ? 1 : 0,
  }).format(safeValue);
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

type HomepageWhatsappLeadInput = {
  propertyId: string;
  propertyTitle: string;
  propertyCode?: string | null;
  receiverWhatsapp: string;
  receiverId: string;
  receiverName: string;
  receiverRole: string;
  price: string;
  location: string;
  lang: string;
  source: string;
};

async function createHomepageWhatsappLeadAndOpen({
  propertyId,
  propertyTitle,
  propertyCode,
  receiverWhatsapp,
  receiverId,
  receiverName,
  receiverRole,
  price,
  location,
  lang,
  source,
}: HomepageWhatsappLeadInput) {
  if (!receiverWhatsapp) return;

  const message =
    lang === "id"
      ? `Halo ${receiverName || ""}, saya melihat properti ini di TETAMO dan tertarik.

Properti: ${propertyTitle}
Kode: ${propertyCode || "-"}
Lokasi: ${location}
Harga: ${price}

Apakah properti ini masih tersedia?`
      : `Hello ${receiverName || ""}, I saw this property on TETAMO and I am interested.

Property: ${propertyTitle}
Code: ${propertyCode || "-"}
Location: ${location}
Price: ${price}

Is this property still available?`;

  const whatsappUrl = `https://wa.me/${receiverWhatsapp}?text=${encodeURIComponent(
    message
  )}`;

  const popup = typeof window !== "undefined" ? window.open("about:blank", "_blank") : null;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await trackEvent({
      event_name: "property_whatsapp_click",
      property_id: propertyId,
      user_id: user?.id ?? null,
      source_page: "homepage",
      metadata: {
        button: "whatsapp",
        source,
        property_title: propertyTitle,
        property_code: propertyCode || null,
        posted_by_type: receiverRole || "owner",
        receiver_id: receiverId || null,
        receiver_name: receiverName || null,
      },
    });

    let senderProfile:
      | {
          full_name: string | null;
          phone: string | null;
          email: string | null;
        }
      | null = null;

    if (user?.id) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, phone, email")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Homepage WhatsApp sender profile error:", profileError);
      } else {
        senderProfile = profileData;
      }
    }

    const { data: insertedLead, error } = await supabase
      .from("leads")
      .insert({
        property_id: propertyId,
        property_code: propertyCode || null,
        property_title: propertyTitle,

        sender_user_id: user?.id || null,
        sender_name:
          senderProfile?.full_name ||
          (typeof user?.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : "Guest"),
        sender_email: senderProfile?.email || user?.email || null,
        sender_phone: senderProfile?.phone || null,

        receiver_user_id: receiverId || null,
        receiver_name: receiverName || null,
        receiver_role: receiverRole || "owner",

        assigned_admin_user_id: null,
        admin_visible: true,

        lead_type: "whatsapp",
        source,
        message,
        viewing_date: null,
        viewing_time: null,

        status: "new",
        priority: "normal",
        notes: null,
      })
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Homepage WhatsApp lead insert error:", error);
    } else if (insertedLead?.id) {
      await trackEvent({
        event_name: "lead_created",
        property_id: propertyId,
        user_id: user?.id ?? null,
        source_page: "homepage",
        lead_id: String(insertedLead.id),
        metadata: {
          lead_type: "whatsapp",
          source,
          property_title: propertyTitle,
          property_code: propertyCode || null,
          receiver_id: receiverId || null,
          receiver_name: receiverName || null,
          receiver_role: receiverRole || "owner",
        },
      });
    }
  } catch (error) {
    console.error("Failed to create homepage WhatsApp lead:", error);
  } finally {
    if (popup) {
      popup.location.href = whatsappUrl;
    } else if (typeof window !== "undefined") {
      window.location.href = whatsappUrl;
    }
  }
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
      view_count,
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


function normalizeProfileName(value?: string | null) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function fetchHomepageProfilesByFeaturedNames(names: string[]) {
  const requestedNames = names.filter(Boolean);

  if (requestedNames.length === 0) {
    return [];
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
      `);

    if (error) {
      console.error("Failed to load manual featured agents:", error);
      return [];
    }

    const rows = (data ?? []) as HomepageProfileRow[];

    return requestedNames
      .map((name) =>
        rows.find(
          (profile) =>
            normalizeProfileName(profile.full_name) ===
            normalizeProfileName(name)
        )
      )
      .filter((profile): profile is HomepageProfileRow => Boolean(profile));
  } catch (error) {
    console.error("Failed to load manual featured agents:", error);
    return [];
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
        property_code: propertyCode || null,
        property_title: propertyTitle,
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

function FeaturedPropertiesCard({
  property,
}: {
  property: FeaturedProperty;
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

  const whatsappHref = property.whatsapp
    ? `https://wa.me/${property.whatsapp}`
    : "#";

  async function handleHomepageWhatsappClick(
    event: MouseEvent<HTMLAnchorElement>
  ) {
    event.preventDefault();

    if (!property.whatsapp) return;

    await createHomepageWhatsappLeadAndOpen({
      propertyId: property.id,
      propertyTitle: property.title,
      propertyCode: property.kode || null,
      receiverWhatsapp: property.whatsapp,
      receiverId: property.receiverId,
      receiverName: property.receiverName,
      receiverRole:
        property.receiverRole || property.postedByType || "owner",
      price: property.price,
      location: property.province,
      lang,
      source: "homepage_featured_property_whatsapp",
    });
  }

  function getVerifiedBadgeText() {
    if (property.postedByType === "owner") {
      return lang === "id"
        ? "Pemilik Terverifikasi"
        : "Verified Owner";
    }

    if (property.postedByType === "developer") {
      return lang === "id"
        ? "Developer Terverifikasi"
        : "Verified Developer";
    }

    return lang === "id"
      ? "Agen Terverifikasi"
      : "Verified Agent";
  }

  function getPosterLabel() {
    if (property.postedByType === "owner") {
      return lang === "id" ? "PEMILIK" : "OWNER";
    }

    if (property.postedByType === "developer") {
      return "DEVELOPER";
    }

    return lang === "id" ? "AGEN" : "AGENT";
  }

  return (
    <article className="group overflow-hidden rounded-[30px] border border-[#E8E2D7] bg-white shadow-[0_16px_45px_rgba(0,0,0,0.07)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_70px_rgba(0,0,0,0.14)]">

      {/* PROPERTY IMAGE */}
      <div className="relative overflow-hidden">
        <Link href={`/properti/${property.id}`} className="block">
          <img
            src={property.images[imgIndex]}
            alt={property.title}
            className="h-[315px] w-full object-cover transition duration-700 group-hover:scale-[1.035] sm:h-[330px]"
          />
        </Link>

        {/* Stronger premium gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/10" />

        {/* Verified badge */}
        <div className="absolute left-4 top-4">
          <div className="rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-[10px] font-bold text-white shadow-lg backdrop-blur-md">
            ✓ {getVerifiedBadgeText()}
          </div>
        </div>

        {/* Tetamo */}
        <div className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#1C1C1E] shadow-sm backdrop-blur">
          TETAMO
        </div>

        {/* Navigation */}
        {property.images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous image"
              className="absolute left-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-xl text-white backdrop-blur-md transition hover:bg-black/70"
            >
              ‹
            </button>

            <button
              type="button"
              onClick={next}
              aria-label="Next image"
              className="absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-xl text-white backdrop-blur-md transition hover:bg-black/70"
            >
              ›
            </button>
          </>
        )}

        {/* PRICE ON IMAGE */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 sm:px-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/65">
                {lang === "id" ? "Harga Properti" : "Property Price"}
              </p>

              <p className="mt-1 text-[24px] font-extrabold tracking-[-0.035em] text-white drop-shadow sm:text-[27px]">
                {property.price}
              </p>
            </div>

            {property.images.length > 1 && (
              <div className="shrink-0 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur">
                {imgIndex + 1} / {property.images.length}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* COMPACT CONTENT */}
      <div className="p-5 sm:p-6">

        {/* Title */}
        <Link href={`/properti/${property.id}`}>
          <h3 className="line-clamp-2 text-[16px] font-extrabold leading-[1.45] tracking-[-0.015em] text-[#1C1C1E] transition hover:text-[#B8860B] sm:text-[17px]">
            {property.title}
          </h3>
        </Link>

        {/* Location */}
        <p className="mt-2 text-sm font-medium text-gray-500">
          📍 {property.province}
        </p>

        {/* SPECS - NO PILLS */}
        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-semibold text-gray-600">
          <span>{property.size}</span>

          <span className="text-[#C8A44D]">•</span>

          <span>{translateBed(property.bed, lang)}</span>

          <span className="text-[#C8A44D]">•</span>

          <span>
            {translateFurnishing(property.furnishing, lang)}
          </span>
        </div>

        {/* AGENT / AGENCY PANEL */}
        <div className="mt-5 rounded-[18px] border border-[#EDE6D8] bg-[#FAF8F3] px-4 py-3.5">
          <div className="flex items-center justify-between gap-4">

            <div className="min-w-0">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#B8860B]">
                {getPosterLabel()}
              </p>

              <p className="mt-1 truncate text-sm font-extrabold text-[#1C1C1E]">
                {property.posterName}
              </p>

              {property.agency && (
                <p className="mt-0.5 truncate text-[12px] font-medium text-gray-500">
                  {property.agency}
                </p>
              )}
            </div>

            {property.kode && (
              <div className="shrink-0 rounded-full border border-[#DDD5C8] bg-white px-3 py-1.5 text-[9px] font-bold tracking-wide text-gray-500">
                {property.kode}
              </div>
            )}
          </div>
        </div>

        {/* CTA HIERARCHY */}
        <div className="mt-5 grid grid-cols-[1.35fr_0.85fr] gap-3">

          {/* MAIN CTA */}
          <Link
            href={`/properti/${property.id}`}
            className="flex min-h-[50px] items-center justify-center rounded-2xl bg-[#B8860B] px-4 py-3 text-center text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(184,134,11,0.20)] transition hover:bg-[#9C7208]"
          >
            {lang === "id"
              ? "Lihat Properti →"
              : "View Property →"}
          </Link>

          {/* SECONDARY CTA */}
          <a
            href={whatsappHref}
            onClick={handleHomepageWhatsappClick}
            target="_blank"
            rel="noreferrer"
            className={`flex min-h-[50px] items-center justify-center rounded-2xl px-3 py-3 text-center text-sm font-bold transition ${
              property.whatsapp
                ? "bg-[#1C1C1E] text-white hover:bg-black"
                : "pointer-events-none bg-gray-200 text-gray-400"
            }`}
          >
            WhatsApp
          </a>
        </div>

        {/* Viewing */}
        <ScheduleViewingButton
          propertyId={property.id}
          propertyTitle={property.title}
          propertyCode={property.kode}
          receiverId={property.receiverId}
          receiverName={property.receiverName}
          receiverRole={property.receiverRole}
        />
      </div>
    </article>
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

  async function handleHomepageOwnerWhatsappClick(
    event: MouseEvent<HTMLAnchorElement>
  ) {
    event.preventDefault();

    if (!property.ownerWhatsapp) return;

    await createHomepageWhatsappLeadAndOpen({
      propertyId: property.id,
      propertyTitle: property.title,
      propertyCode: property.kode || null,
      receiverWhatsapp: property.ownerWhatsapp,
      receiverId: property.receiverId,
      receiverName: property.receiverName,
      receiverRole: property.receiverRole || "owner",
      price: property.price,
      location: property.province,
      lang,
      source: "homepage_featured_owner_whatsapp",
    });
  }

  return (
    <article className="group overflow-hidden rounded-[30px] border border-[#E8E2D7] bg-white shadow-[0_14px_45px_rgba(0,0,0,0.06)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_70px_rgba(0,0,0,0.13)]">

      {/* PROPERTY IMAGE */}
      <div className="relative overflow-hidden">
        <Link href={`/properti/${property.id}`} className="block">
          <img
            src={property.images[imgIndex]}
            alt={property.title}
            className="h-[315px] w-full object-cover transition duration-700 group-hover:scale-[1.035] sm:h-[330px]"
          />
        </Link>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10" />

        {/* OWNER VERIFIED */}
        <div className="absolute left-4 top-4">
          <div className="rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur-md">
            ✓{" "}
            {lang === "id"
              ? "Pemilik Terverifikasi"
              : "Verified Owner"}
          </div>
        </div>

        {/* DIRECT OWNER BADGE */}
        <div className="absolute right-4 top-4 rounded-full bg-[#D8B46A] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#111111]">
          {lang === "id"
            ? "Langsung Pemilik"
            : "Direct Owner"}
        </div>

        {/* IMAGE CONTROLS */}
        {property.images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous image"
              className="absolute left-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-xl text-white backdrop-blur-md transition hover:bg-black/70"
            >
              ‹
            </button>

            <button
              type="button"
              onClick={next}
              aria-label="Next image"
              className="absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-xl text-white backdrop-blur-md transition hover:bg-black/70"
            >
              ›
            </button>
          </>
        )}

        {/* PRICE */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 sm:px-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/60">
                {lang === "id"
                  ? "Harga Properti"
                  : "Property Price"}
              </p>

              <p className="mt-1 text-[24px] font-extrabold tracking-[-0.035em] text-white sm:text-[27px]">
                {property.price}
              </p>
            </div>

            {property.images.length > 1 && (
              <span className="rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur">
                {imgIndex + 1} / {property.images.length}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* DETAILS */}
      <div className="p-5 sm:p-6">

        <Link href={`/properti/${property.id}`}>
          <h3 className="line-clamp-2 text-[16px] font-extrabold leading-[1.45] tracking-[-0.015em] text-[#1C1C1E] transition hover:text-[#B8860B] sm:text-[17px]">
            {property.title}
          </h3>
        </Link>

        <p className="mt-2 text-sm font-medium text-gray-500">
          📍 {property.province}
        </p>

        {/* SPECS */}
        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-semibold text-gray-600">
          <span>{property.size}</span>

          <span className="text-[#C8A44D]">•</span>

          <span>
            {translateBed(property.bed, lang)}
          </span>

          <span className="text-[#C8A44D]">•</span>

          <span>
            {translateFurnishing(
              property.furnishing,
              lang
            )}
          </span>
        </div>

        {/* OWNER */}
        <div className="mt-5 rounded-[18px] border border-[#EDE6D8] bg-[#FAF8F3] px-4 py-3.5">
          <div className="flex items-center justify-between gap-4">

            <div className="min-w-0">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#B8860B]">
                {lang === "id"
                  ? "PEMILIK"
                  : "OWNER"}
              </p>

              <p className="mt-1 truncate text-sm font-extrabold text-[#1C1C1E]">
                {property.ownerName}
              </p>

              <p className="mt-0.5 text-[11px] font-medium text-gray-500">
                {lang === "id"
                  ? "Hubungi pemilik secara langsung"
                  : "Contact the owner directly"}
              </p>
            </div>

            {property.kode && (
              <div className="shrink-0 rounded-full border border-[#DDD5C8] bg-white px-3 py-1.5 text-[9px] font-bold tracking-wide text-gray-500">
                {property.kode}
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-5 grid grid-cols-[1.35fr_0.85fr] gap-3">
          <Link
            href={`/properti/${property.id}`}
            className="flex min-h-[50px] items-center justify-center rounded-2xl bg-[#B8860B] px-4 py-3 text-center text-sm font-extrabold text-white transition hover:bg-[#9C7208]"
          >
            {lang === "id"
              ? "Lihat Properti →"
              : "View Property →"}
          </Link>

          <a
            href={whatsappHref}
            onClick={handleHomepageOwnerWhatsappClick}
            target="_blank"
            rel="noreferrer"
            className={`flex min-h-[50px] items-center justify-center rounded-2xl px-3 py-3 text-center text-sm font-bold transition ${
              property.ownerWhatsapp
                ? "bg-[#1C1C1E] text-white hover:bg-black"
                : "pointer-events-none bg-gray-200 text-gray-400"
            }`}
          >
            WhatsApp
          </a>
        </div>

        <ScheduleViewingButton
          propertyId={property.id}
          propertyTitle={property.title}
          propertyCode={property.kode}
          receiverId={property.receiverId}
          receiverName={property.receiverName}
          receiverRole={property.receiverRole}
        />
      </div>
    </article>
  );
}

/* =========================
   SECTIONS
========================= */

function FeaturedPropertiesSection() {
  const { lang } = useLanguage();
  const { currency } = useCurrency();

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

        /*
          Keep our manually selected homepage properties first.
          If one is missing, expired, or unavailable,
          automatically fill the empty space with another
          verified property.
        */
        const manualRows = FEATURED_PROPERTY_CODES
          .map((kode) =>
            publicVerifiedRows.find(
              (row) =>
                normalizePropertyCode(row.kode) ===
                normalizePropertyCode(kode)
            )
          )
          .filter(
            (row): row is HomepagePropertyRow => Boolean(row)
          );

        const selectedIds = new Set(
          manualRows.map((row) => row.id)
        );

        const fallbackRows = [...publicVerifiedRows]
          .filter((row) => !selectedIds.has(row.id))
          .sort(sortRowsByFeaturedNewest);

        const featuredRows = [
          ...manualRows,
          ...fallbackRows,
        ].slice(0, 3);

        const profileIds = Array.from(
          new Set(
            featuredRows
              .map((row) => row.contact_user_id)
              .filter(
                (value): value is string => Boolean(value)
              )
          )
        );

        const profilesMap =
          await fetchHomepageProfilesByIds(profileIds);

        const mapped: FeaturedProperty[] =
          featuredRows.map((row) => {
            const profile = row.contact_user_id
              ? profilesMap.get(row.contact_user_id)
              : null;

            return {
              id: row.id,

              title:
                row.title ||
                (lang === "id"
                  ? "Properti di Tetamo"
                  : "Property on Tetamo"),

              viewCount: Number(row.view_count ?? 0),

              images: buildPropertyImages(
                row.property_images
              ),

              /*
                Currency follows the global
                IDR / USD / AUD selector.
              */
              price: formatHomepagePrice(
                Number(row.price ?? 0),
                currency
              ),

              province:
                row.city ||
                row.area ||
                row.province ||
                "Indonesia",

              size: getMainSize(row),

              bed: `${row.bedrooms ?? 0} Bed`,

              furnishing: mapFurnishing(
                row.furnishing
              ),

              garage: getGarageLabel(row.garage),

              posterName:
                row.contact_name ||
                profile?.full_name ||
                "Tetamo User",

              agency:
                row.contact_agency ||
                profile?.agency ||
                "",

              postedByType: normalizePostedByType(
                row.contact_role,
                row.source
              ),

              whatsapp: normalizeWhatsapp(
                row.contact_phone ||
                  profile?.phone ||
                  ""
              ),

              receiverId:
                row.contact_user_id || "",

              receiverName:
                row.contact_name ||
                profile?.full_name ||
                "Tetamo User",

              receiverRole: normalizePostedByType(
                row.contact_role,
                row.source
              ),

              kode: row.kode ?? undefined,

              postedDate: formatPostedDate(
                row.posted_date || row.created_at
              ),

              verifiedListing: true,
            };
          });

        if (!ignore) {
          setProperties(mapped);
        }
      } catch (error) {
        console.error(
          "Failed to load featured properties:",
          error
        );

        if (!ignore) {
          setProperties([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadFeaturedProperties();

    return () => {
      ignore = true;
    };
  }, [currency, lang]);

  return (
    <section className="relative overflow-hidden bg-[#F6F3EC] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">

      {/* subtle premium background */}
      <div className="pointer-events-none absolute -right-40 top-0 h-[420px] w-[420px] rounded-full bg-[#D8B46A]/10 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl">

        {/* SECTION HEADER */}
        <div className="mb-10 flex flex-col gap-6 md:mb-12 md:flex-row md:items-end md:justify-between">

          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-[#B8860B]" />

              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#B8860B] sm:text-xs">
                {lang === "id"
                  ? "Pilihan Tetamo"
                  : "Tetamo Selection"}
              </span>
            </div>

            <h2 className="mt-4 text-[32px] font-extrabold leading-tight tracking-[-0.04em] text-[#1C1C1E] sm:text-[40px] lg:text-[44px]">
              {lang === "id"
                ? "Properti Pilihan"
                : "Selected Properties"}
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-7 text-gray-600 sm:text-base">
              {lang === "id"
                ? "Jelajahi properti pilihan dari agen, pemilik dan developer terverifikasi di berbagai lokasi di Indonesia."
                : "Explore selected properties from verified agents, owners and developers across Indonesia."}
            </p>
          </div>

          <Link
            href="/properti"
            className="group inline-flex w-fit shrink-0 items-center gap-3 rounded-full border border-[#1C1C1E] bg-white px-5 py-3 text-sm font-extrabold text-[#1C1C1E] transition duration-200 hover:bg-[#1C1C1E] hover:text-white"
          >
            {lang === "id"
              ? "Lihat Semua Properti"
              : "View All Properties"}

            <span className="transition group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>

        {/* PROPERTY CONTENT */}
        {loading ? (
          <div className="grid grid-cols-1 gap-7 md:grid-cols-2 xl:grid-cols-3">

            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="overflow-hidden rounded-[30px] border border-[#E8E2D7] bg-white"
              >
                <div className="h-[330px] animate-pulse bg-gray-200" />

                <div className="space-y-4 p-6">
                  <div className="h-5 w-4/5 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-2/5 animate-pulse rounded bg-gray-100" />

                  <div className="h-16 animate-pulse rounded-2xl bg-gray-100" />

                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-12 animate-pulse rounded-2xl bg-gray-200" />
                    <div className="h-12 animate-pulse rounded-2xl bg-gray-200" />
                  </div>
                </div>
              </div>
            ))}

          </div>
        ) : properties.length === 0 ? (
          <div className="rounded-[30px] border border-[#E8E2D7] bg-white px-6 py-14 text-center shadow-sm">

            <p className="text-lg font-extrabold text-[#1C1C1E]">
              {lang === "id"
                ? "Properti pilihan sedang diperbarui."
                : "Selected properties are being updated."}
            </p>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              {lang === "id"
                ? "Anda tetap dapat melihat seluruh properti yang tersedia di marketplace Tetamo."
                : "You can still explore all available properties on the Tetamo marketplace."}
            </p>

            <Link
              href="/properti"
              className="mt-5 inline-flex rounded-full bg-[#B8860B] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#9C7208]"
            >
              {lang === "id"
                ? "Lihat Properti →"
                : "View Properties →"}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-7 md:grid-cols-2 xl:grid-cols-3">
            {properties.map((property) => (
              <FeaturedPropertiesCard
                key={property.id}
                property={property}
              />
            ))}
          </div>
        )}

        {/* BOTTOM MARKETPLACE CTA */}
        {properties.length > 0 && !loading && (
          <div className="mt-10 flex justify-center sm:mt-12">
            <Link
              href="/properti"
              className="group inline-flex items-center gap-2 text-sm font-extrabold text-[#1C1C1E] transition hover:text-[#B8860B]"
            >
              {lang === "id"
                ? "Jelajahi semua properti di Tetamo"
                : "Explore all properties on Tetamo"}

              <span className="text-[#B8860B] transition group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        )}

      </div>
    </section>
  );
}

function TetamoTrustSection() {
  const { lang } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-[#111111] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">

      {/* subtle gold glow */}
      <div className="pointer-events-none absolute -left-32 top-0 h-[380px] w-[380px] rounded-full bg-[#B8860B]/10 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">

          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-[#D8B46A]" />

              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#D8B46A] sm:text-xs">
                {lang === "id"
                  ? "Kenapa Tetamo"
                  : "Why Tetamo"}
              </span>
            </div>

            <h2 className="mt-4 max-w-xl text-[32px] font-extrabold leading-[1.08] tracking-[-0.04em] text-white sm:text-[40px] lg:text-[44px]">
              {lang === "id" ? (
                <>
                  Cari properti dengan{" "}
                  <span className="text-[#D8B46A]">
                    lebih mudah.
                  </span>
                </>
              ) : (
                <>
                  Find property{" "}
                  <span className="text-[#D8B46A]">
                    more easily.
                  </span>
                </>
              )}
            </h2>
          </div>

          <div className="max-w-2xl lg:justify-self-end">
            <p className="text-sm leading-7 text-white/60 sm:text-base sm:leading-8">
              {lang === "id"
                ? "Tetamo menghubungkan pencari properti langsung dengan pemilik, agen dan developer melalui marketplace yang lebih sederhana dan transparan."
                : "Tetamo connects property seekers directly with owners, agents and developers through a simpler and more transparent marketplace."}
            </p>
          </div>
        </div>

        {/* TRUST POINTS */}
        <div className="mt-12 grid grid-cols-1 overflow-hidden rounded-[28px] border border-white/10 sm:grid-cols-2 lg:grid-cols-4">

          {/* 01 */}
          <div className="border-b border-white/10 p-6 sm:border-r lg:border-b-0 lg:p-7">
            <span className="text-[11px] font-extrabold tracking-[0.18em] text-[#D8B46A]">
              01
            </span>

            <h3 className="mt-5 text-lg font-extrabold text-white">
              {lang === "id"
                ? "Listing Terverifikasi"
                : "Verified Listings"}
            </h3>

            <p className="mt-3 text-sm leading-6 text-white/50">
              {lang === "id"
                ? "Temukan properti dari pemilik, agen dan developer yang telah melalui proses verifikasi Tetamo."
                : "Discover properties from owners, agents and developers that have gone through Tetamo's verification process."}
            </p>
          </div>

          {/* 02 */}
          <div className="border-b border-white/10 p-6 lg:border-b-0 lg:border-r lg:p-7">
            <span className="text-[11px] font-extrabold tracking-[0.18em] text-[#D8B46A]">
              02
            </span>

            <h3 className="mt-5 text-lg font-extrabold text-white">
              {lang === "id"
                ? "WhatsApp Langsung"
                : "Direct WhatsApp"}
            </h3>

            <p className="mt-3 text-sm leading-6 text-white/50">
              {lang === "id"
                ? "Hubungi pemilik atau agen langsung dari halaman properti tanpa proses yang rumit."
                : "Contact the owner or agent directly from the property page without a complicated process."}
            </p>
          </div>

          {/* 03 */}
          <div className="border-b border-white/10 p-6 sm:border-b-0 sm:border-r lg:p-7">
            <span className="text-[11px] font-extrabold tracking-[0.18em] text-[#D8B46A]">
              03
            </span>

            <h3 className="mt-5 text-lg font-extrabold text-white">
              {lang === "id"
                ? "Jadwalkan Viewing"
                : "Schedule Viewing"}
            </h3>

            <p className="mt-3 text-sm leading-6 text-white/50">
              {lang === "id"
                ? "Pilih tanggal dan waktu untuk mengajukan viewing properti langsung melalui Tetamo."
                : "Choose a date and time to request a property viewing directly through Tetamo."}
            </p>
          </div>

          {/* 04 */}
          <div className="p-6 lg:p-7">
            <span className="text-[11px] font-extrabold tracking-[0.18em] text-[#D8B46A]">
              04
            </span>

            <h3 className="mt-5 text-lg font-extrabold text-white">
              {lang === "id"
                ? "Satu Marketplace"
                : "One Marketplace"}
            </h3>

            <p className="mt-3 text-sm leading-6 text-white/50">
              {lang === "id"
                ? "Cari rumah, apartemen, vila, tanah dan berbagai jenis properti di berbagai wilayah Indonesia."
                : "Search houses, apartments, villas, land and other property types across Indonesia."}
            </p>
          </div>
        </div>

        {/* BOTTOM CTA */}
        <div className="mt-9 flex flex-col gap-4 border-t border-white/10 pt-7 sm:flex-row sm:items-center sm:justify-between">

          <p className="max-w-xl text-sm font-medium leading-6 text-white/55">
            {lang === "id"
              ? "Punya properti untuk dijual atau disewakan? Anda juga bisa memasangnya di Tetamo."
              : "Have a property to sell or rent? You can list it on Tetamo too."}
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/properti"
              className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white hover:text-[#111111]"
            >
              {lang === "id"
                ? "Cari Properti"
                : "Find Property"}
            </Link>

            <Link
              href="/pricelist"
              className="rounded-full bg-[#D8B46A] px-5 py-2.5 text-sm font-extrabold text-[#111111] transition hover:bg-[#C49C4E]"
            >
              {lang === "id"
                ? "Pasang Properti →"
                : "List Property →"}
            </Link>
          </div>
        </div>
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

        const profiles =
          await fetchHomepageProfilesByFeaturedNames(
            FEATURED_AGENT_NAMES
          );

        const mapped = profiles.map((profile) => {
          const name =
            profile.full_name || "Tetamo Agent";

          const fallbackPhoto =
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              name
            )}&background=1C1C1E&color=fff`;

          return {
            id: profile.id,
            name,
            photo:
              profile.photo_url || fallbackPhoto,
            location:
              profile.address || "Indonesia",
            agency:
              profile.agency || "Independent Agent",

            experience:
              lang === "id"
                ? "Agen properti pilihan Tetamo"
                : "Selected Tetamo property agent",

            whatsapp: normalizeWhatsapp(
              profile.phone || ""
            ),

            agentVerified: true,

            socials: {
              instagram:
                profile.instagram_url || "",
              facebook:
                profile.facebook_url || "",
              tiktok:
                profile.tiktok_url || "",
              linkedin:
                profile.linkedin_url || "",
            },
          };
        });

        if (!ignore) {
          setAgents(mapped);
        }
      } catch (error) {
        console.error(
          "Failed to load manual featured agents:",
          error
        );

        if (!ignore) {
          setAgents([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadFeaturedAgents();

    return () => {
      ignore = true;
    };
  }, [lang]);

  return (
    <section className="relative overflow-hidden bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-10 flex flex-col gap-6 md:mb-12 md:flex-row md:items-end md:justify-between">

          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-[#B8860B]" />

              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#B8860B] sm:text-xs">
                {lang === "id"
                  ? "Temukan Agen"
                  : "Find an Agent"}
              </span>
            </div>

            <h2 className="mt-4 text-[32px] font-extrabold tracking-[-0.04em] text-[#1C1C1E] sm:text-[40px] lg:text-[44px]">
              {lang === "id"
                ? "Agen Pilihan Tetamo"
                : "Tetamo Selected Agents"}
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-7 text-gray-600 sm:text-base">
              {lang === "id"
                ? "Terhubung langsung dengan agen properti pilihan Tetamo dan temukan properti yang sesuai dengan kebutuhan Anda."
                : "Connect directly with selected Tetamo property agents and find a property that fits your needs."}
            </p>
          </div>

          <div className="hidden text-right md:block">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
              {lang === "id"
                ? "Hubungi Langsung"
                : "Contact Directly"}
            </p>

            <p className="mt-1 text-sm font-semibold text-[#1C1C1E]">
              WhatsApp · Social Media
            </p>
          </div>
        </div>

        {/* AGENTS */}
        {loading ? (
          <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="overflow-hidden rounded-[30px] border border-gray-200 bg-white"
              >
                <div className="h-[320px] animate-pulse bg-gray-200" />

                <div className="space-y-3 p-6">
                  <div className="h-6 w-2/3 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
                  <div className="h-12 animate-pulse rounded-2xl bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        ) : agents.length === 0 ? (
          <div className="rounded-[30px] border border-gray-200 bg-[#F8F7F4] px-6 py-14 text-center">
            <p className="text-lg font-extrabold text-[#1C1C1E]">
              {lang === "id"
                ? "Agen pilihan sedang diperbarui."
                : "Selected agents are being updated."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">

            {agents.map((agent) => {
              const inquiryMessage =
                lang === "id"
                  ? "Halo " +
                    agent.name +
                    ", saya melihat profil Anda di Tetamo dan ingin bertanya tentang properti."
                  : "Hello " +
                    agent.name +
                    ", I saw your profile on Tetamo and would like to ask about property.";

              const whatsappHref =
                agent.whatsapp
                  ? "https://wa.me/" +
                    agent.whatsapp +
                    "?text=" +
                    encodeURIComponent(
                      inquiryMessage
                    )
                  : "#";

              const hasSocials = Boolean(
                agent.socials?.instagram ||
                agent.socials?.facebook ||
                agent.socials?.tiktok ||
                agent.socials?.linkedin
              );

              return (
                <article
                  key={agent.id}
                  className="group flex h-full flex-col overflow-hidden rounded-[30px] border border-[#E7DFD2] bg-white shadow-[0_16px_46px_rgba(28,28,30,0.08)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_70px_rgba(0,0,0,0.13)]"
                >

                  {/* PHOTO */}
                  <div className="relative h-[260px] overflow-hidden bg-[#1C1C1E] sm:h-[290px]">

                    <img
                      src={agent.photo}
                      alt={agent.name}
                      className="h-full w-full object-cover object-center transition duration-700 group-hover:scale-[1.035]"
                    />

                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />

                    {agent.agentVerified ? (
                      <div className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur-md">
                        ✓{" "}
                        {lang === "id"
                          ? "Agen Terverifikasi"
                          : "Verified Agent"}
                      </div>
                    ) : null}

                    <div className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-[#D8B46A] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#111111]">
                      <Crown className="h-3 w-3" />

                      {lang === "id"
                        ? "Pilihan Tetamo"
                        : "Tetamo Selected"}
                    </div>

                  </div>

                  {/* DETAILS */}
                  <div className="flex flex-1 flex-col p-5 sm:p-6">

                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#B8860B]">
                      {lang === "id"
                        ? "Agen Properti"
                        : "Property Agent"}
                    </p>

                    <h3 className="mt-1.5 text-[24px] font-extrabold leading-tight tracking-[-0.035em] text-[#1C1C1E]">
                      {agent.name}
                    </h3>

                    {/* AGENCY AND LOCATION */}
                    <div className="mt-5 space-y-3 rounded-[18px] bg-[#F8F6F1] p-4">

                      <div className="grid grid-cols-[30px_minmax(0,1fr)] items-start gap-2.5">

                        <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] bg-[#EEE4CF] text-[#9A6F0A]">
                          <BriefcaseBusiness className="h-3.5 w-3.5" />
                        </span>

                        <div className="min-w-0">

                          <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-gray-400">
                            {lang === "id"
                              ? "Agensi"
                              : "Agency"}
                          </p>

                          <p className="mt-1 break-words text-xs font-bold leading-5 text-[#33363B]">
                            {agent.agency}
                          </p>

                        </div>
                      </div>

                      <div className="grid grid-cols-[30px_minmax(0,1fr)] items-start gap-2.5">

                        <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] bg-[#EEE4CF] text-[#9A6F0A]">
                          <MapPin className="h-3.5 w-3.5" />
                        </span>

                        <div className="min-w-0">

                          <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-gray-400">
                            {lang === "id"
                              ? "Lokasi"
                              : "Location"}
                          </p>

                          <p className="mt-1 break-words text-xs font-bold leading-5 text-[#33363B]">
                            {agent.location}
                          </p>

                        </div>
                      </div>

                    </div>

                    {/* SOCIAL LINKS */}
                    <div className="mt-5 flex min-h-[54px] items-center justify-between gap-4 border-t border-gray-100 pt-4">

                      <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-gray-400">
                        {lang === "id"
                          ? "Ikuti Agen"
                          : "Follow Agent"}
                      </p>

                      {hasSocials ? (
                        <div className="flex flex-wrap justify-end gap-2">

                          <SocialBtn
                            href={agent.socials?.instagram}
                            label="Instagram"
                          >
                            <IconInstagram />
                          </SocialBtn>

                          <SocialBtn
                            href={agent.socials?.facebook}
                            label="Facebook"
                          >
                            <IconFacebook />
                          </SocialBtn>

                          <SocialBtn
                            href={agent.socials?.tiktok}
                            label="TikTok"
                          >
                            <IconTikTok />
                          </SocialBtn>

                          <SocialBtn
                            href={agent.socials?.linkedin}
                            label="LinkedIn"
                          >
                            <IconLinkedIn />
                          </SocialBtn>

                        </div>
                      ) : (
                        <p className="text-[10px] font-medium text-gray-400">
                          {lang === "id"
                            ? "Belum tersedia"
                            : "Not available yet"}
                        </p>
                      )}

                    </div>

                    {/* WHATSAPP */}
                    <a
                      href={whatsappHref}
                      onClick={(event) => {
                        if (!agent.whatsapp) {
                          event.preventDefault();
                        }
                      }}
                      target="_blank"
                      rel="noreferrer"
                      className={[
                        "mt-auto flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[15px] px-4 py-3 text-center text-sm font-extrabold transition",
                        agent.whatsapp
                          ? "bg-[#1C1C1E] text-white hover:bg-black"
                          : "pointer-events-none bg-gray-200 text-gray-400",
                      ].join(" ")}
                    >
                      <MessageCircle className="h-4 w-4" />

                      {lang === "id"
                        ? "Hubungi via WhatsApp →"
                        : "Contact via WhatsApp →"}
                    </a>

                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* AGENT SALES CTA */}
        <div className="mt-12 overflow-hidden rounded-[28px] border border-[#E6DDCB] bg-[#F8F5EE] px-6 py-7 sm:px-8 sm:py-8">

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div className="max-w-2xl">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#B8860B]">
                {lang === "id"
                  ? "Untuk Agen Properti"
                  : "For Property Agents"}
              </p>

              <h3 className="mt-2 text-xl font-extrabold tracking-[-0.02em] text-[#1C1C1E] sm:text-2xl">
                {lang === "id"
                  ? "Bangun profil Anda dan promosikan listing di Tetamo."
                  : "Build your profile and promote your listings on Tetamo."}
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                {lang === "id"
                  ? "Tampilkan listing, profil agen dan media sosial Anda dalam satu marketplace properti."
                  : "Showcase your listings, agent profile and social media in one property marketplace."}
              </p>
            </div>

            <Link
              href="/pricelist"
              className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-[#B8860B] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#9C7208]"
            >
              {lang === "id"
                ? "Lihat Paket Agen"
                : "View Agent Packages"}

              <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedOwnersSection() {
  const { lang } = useLanguage();
  const { currency } = useCurrency();

  const [owners, setOwners] =
    useState<FeaturedOwnerProperty[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadFeaturedOwners() {
      try {
        setLoading(true);

        const rows =
          await fetchHomepageProperties();

        const ownerRows = rows
          .filter((row) =>
            isListingPublic(row)
          )
          .filter((row) =>
            isVerifiedListing(row)
          )
          .filter((row) =>
            hasFeaturedPlacement(row)
          )
          .filter(
            (row) =>
              normalizePostedByType(
                row.contact_role,
                row.source
              ) === "owner"
          )
          .sort(sortRowsByFeaturedNewest)
          .slice(0, 3);

        const profileIds = Array.from(
          new Set(
            ownerRows
              .map(
                (row) =>
                  row.contact_user_id
              )
              .filter(
                (value): value is string =>
                  Boolean(value)
              )
          )
        );

        const profilesMap =
          await fetchHomepageProfilesByIds(
            profileIds
          );

        const mapped: FeaturedOwnerProperty[] =
          ownerRows.map((row) => {
            const profile =
              row.contact_user_id
                ? profilesMap.get(
                    row.contact_user_id
                  )
                : null;

            return {
              id: row.id,

              title:
                row.title ||
                (lang === "id"
                  ? "Properti di Tetamo"
                  : "Property on Tetamo"),

              viewCount: Number(
                row.view_count ?? 0
              ),

              ownerName:
                row.contact_name ||
                profile?.full_name ||
                "Tetamo Owner",

              ownerWhatsapp:
                normalizeWhatsapp(
                  row.contact_phone ||
                    profile?.phone ||
                    ""
                ),

              receiverId:
                row.contact_user_id || "",

              receiverName:
                row.contact_name ||
                profile?.full_name ||
                "Tetamo Owner",

              receiverRole: "owner",

              images: buildPropertyImages(
                row.property_images
              ),

              // IDR / USD / AUD
              price: formatHomepagePrice(
                Number(row.price ?? 0),
                currency
              ),

              province:
                row.city ||
                row.area ||
                row.province ||
                "Indonesia",

              size: getMainSize(row),

              bed: `${row.bedrooms ?? 0} Bed`,

              furnishing:
                mapFurnishing(
                  row.furnishing
                ),

              garage:
                getGarageLabel(row.garage),

              kode:
                row.kode ?? undefined,

              postedDate:
                formatPostedDate(
                  row.posted_date ||
                    row.created_at
                ),

              ownerApproved: true,
            };
          });

        if (!ignore) {
          setOwners(mapped);
        }
      } catch (error) {
        console.error(
          "Failed to load featured owner properties:",
          error
        );

        if (!ignore) {
          setOwners([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadFeaturedOwners();

    return () => {
      ignore = true;
    };
  }, [currency, lang]);

  return (
    <section className="relative overflow-hidden bg-[#F6F3EC] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">

      <div className="pointer-events-none absolute -right-32 top-0 h-[380px] w-[380px] rounded-full bg-[#D8B46A]/10 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-10 flex flex-col gap-6 md:mb-12 md:flex-row md:items-end md:justify-between">

          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-[#B8860B]" />

              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#B8860B] sm:text-xs">
                {lang === "id"
                  ? "Langsung dari Pemilik"
                  : "Direct from Owners"}
              </span>
            </div>

            <h2 className="mt-4 text-[32px] font-extrabold tracking-[-0.04em] text-[#1C1C1E] sm:text-[40px] lg:text-[44px]">
              {lang === "id"
                ? "Properti dari Pemilik"
                : "Properties from Owners"}
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-7 text-gray-600 sm:text-base">
              {lang === "id"
                ? "Jelajahi properti yang dipasarkan langsung oleh pemilik terverifikasi dan hubungi mereka melalui Tetamo."
                : "Explore properties marketed directly by verified owners and contact them through Tetamo."}
            </p>
          </div>

          <Link
            href="/properti"
            className="group inline-flex w-fit items-center gap-3 rounded-full border border-[#1C1C1E] bg-white px-5 py-3 text-sm font-extrabold text-[#1C1C1E] transition hover:bg-[#1C1C1E] hover:text-white"
          >
            {lang === "id"
              ? "Lihat Semua Properti"
              : "View All Properties"}

            <span className="transition group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>

        {/* OWNER PROPERTIES */}
        {loading ? (
          <div className="grid grid-cols-1 gap-7 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="overflow-hidden rounded-[30px] border border-[#E8E2D7] bg-white"
              >
                <div className="h-[330px] animate-pulse bg-gray-200" />

                <div className="space-y-4 p-6">
                  <div className="h-5 w-4/5 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
                  <div className="h-16 animate-pulse rounded-2xl bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : owners.length === 0 ? (
          <div className="rounded-[30px] border border-[#E8E2D7] bg-white px-6 py-14 text-center">
            <p className="text-lg font-extrabold text-[#1C1C1E]">
              {lang === "id"
                ? "Properti pemilik sedang diperbarui."
                : "Owner properties are being updated."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-7 md:grid-cols-2 xl:grid-cols-3">
            {owners.map((property) => (
              <FeaturedOwnerPropertyCard
                key={property.id}
                property={property}
              />
            ))}
          </div>
        )}

        {/* OWNER SALES CTA */}
        <div className="mt-12 overflow-hidden rounded-[28px] bg-[#111111] px-6 py-7 text-white sm:px-8 sm:py-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div className="max-w-2xl">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#D8B46A]">
                {lang === "id"
                  ? "Punya Properti?"
                  : "Own a Property?"}
              </p>

              <h3 className="mt-2 text-xl font-extrabold tracking-[-0.02em] text-white sm:text-2xl">
                {lang === "id"
                  ? "Jual atau sewakan properti Anda di Tetamo."
                  : "Sell or rent your property on Tetamo."}
              </h3>

              <p className="mt-2 text-sm leading-6 text-white/55">
                {lang === "id"
                  ? "Pasang properti mulai Rp50.000 dan tayang selama 1 tahun."
                  : "List your property from Rp50,000 and stay live for 1 year."}
              </p>
            </div>

            <Link
              href="/pricelist"
              className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-[#D8B46A] px-6 py-3 text-sm font-extrabold text-[#111111] transition hover:bg-[#C49C4E]"
            >
              {lang === "id"
                ? "Pasang Properti"
                : "List Property"}

              <span>→</span>
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}

function LocationDiscoverySection() {
  const { lang } = useLanguage();

  const [locations, setLocations] = useState<
    {
      name: string;
      province: string;
      image: string;
      propertyCount: number;
    }[]
  >([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadLocations() {
      try {
        setLoading(true);

        const rows = await fetchHomepageProperties();

        const verifiedRows = rows
          .filter((row) => isListingPublic(row))
          .filter((row) => isVerifiedListing(row));

        const locationMap = new Map<
          string,
          {
            name: string;
            province: string;
            image: string;
            propertyCount: number;
          }
        >();

        verifiedRows.forEach((row) => {
          const locationName = String(
            row.city ||
              row.area ||
              row.province ||
              ""
          ).trim();

          if (!locationName) return;

          const key = locationName.toLowerCase();

          const images = buildPropertyImages(
            row.property_images
          );

          const existing = locationMap.get(key);

          if (existing) {
            existing.propertyCount += 1;
            return;
          }

          locationMap.set(key, {
            name: locationName,

            province:
              row.province &&
              row.province !== locationName
                ? row.province
                : "Indonesia",

            image: images[0],

            propertyCount: 1,
          });
        });

        const mapped = Array.from(
          locationMap.values()
        )
          .sort(
            (a, b) =>
              b.propertyCount -
              a.propertyCount
          )
          .slice(0, 6);

        if (!ignore) {
          setLocations(mapped);
        }
      } catch (error) {
        console.error(
          "Failed to load homepage locations:",
          error
        );

        if (!ignore) {
          setLocations([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadLocations();

    return () => {
      ignore = true;
    };
  }, []);

  const mainLocations = locations.slice(0, 3);
  const moreLocations = locations.slice(3, 6);

  return (
    <section className="relative overflow-hidden bg-[#F8F6F1] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">

      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-10 flex flex-col gap-6 md:mb-12 md:flex-row md:items-end md:justify-between">

          <div className="max-w-2xl">

            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-[#B8860B]" />

              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#B8860B] sm:text-xs">
                {lang === "id"
                  ? "Jelajahi Indonesia"
                  : "Explore Indonesia"}
              </span>
            </div>

            <h2 className="mt-4 text-[32px] font-extrabold leading-[1.08] tracking-[-0.04em] text-[#1C1C1E] sm:text-[40px] lg:text-[44px]">
              {lang === "id"
                ? "Temukan Properti di Lokasi Pilihan"
                : "Discover Property by Location"}
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-7 text-gray-600 sm:text-base">
              {lang === "id"
                ? "Mulai pencarian dari kota dan wilayah yang memiliki properti aktif di Tetamo."
                : "Start your search from cities and regions with active properties on Tetamo."}
            </p>
          </div>

          <Link
            href="/search"
            className="group inline-flex w-fit shrink-0 items-center gap-2 text-sm font-extrabold text-[#1C1C1E] transition hover:text-[#B8860B]"
          >
            {lang === "id"
              ? "Cari lokasi lainnya"
              : "Search other locations"}

            <span className="text-[#B8860B] transition group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>

        {/* MAIN LOCATIONS */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-[430px] animate-pulse rounded-[32px] bg-gray-200"
              />
            ))}
          </div>
        ) : mainLocations.length === 0 ? (
          <div className="rounded-[30px] border border-[#E8E2D7] bg-white px-6 py-14 text-center">
            <p className="text-lg font-extrabold text-[#1C1C1E]">
              {lang === "id"
                ? "Lokasi properti sedang diperbarui."
                : "Property locations are being updated."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

              {mainLocations.map((location) => {
                const searchValue =
                  encodeURIComponent(location.name);

                return (
                  <Link
                    key={location.name}
                    href={`/search?q=${searchValue}&query=${searchValue}`}
                    className="group block"
                  >
                    <article className="overflow-hidden rounded-[32px] border border-[#E7E1D6] bg-white shadow-[0_14px_40px_rgba(0,0,0,0.06)] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_25px_60px_rgba(0,0,0,0.12)]">

                      {/* IMAGE */}
                      <div className="relative h-[350px] overflow-hidden sm:h-[390px] lg:h-[420px]">

                        <img
                          src={location.image}
                          alt={
                            lang === "id"
                              ? `Properti di ${location.name}`
                              : `Property in ${location.name}`
                          }
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                        />

                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />

                        {/* LOCATION NAME */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-7">

                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#E3C373]">
                            {location.province}
                          </p>

                          <h3 className="mt-2 text-[30px] font-extrabold leading-none tracking-[-0.04em] text-white sm:text-[34px]">
                            {location.name}
                          </h3>

                        </div>
                      </div>

                      {/* CLEAN WHITE FOOTER */}
                      <div className="flex items-center justify-between gap-4 px-6 py-5">

                        <p className="text-sm font-semibold text-gray-600">
                          {lang === "id"
                            ? "Lihat properti di area ini"
                            : "View properties in this area"}
                        </p>

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1C1C1E] text-lg text-white transition duration-300 group-hover:bg-[#B8860B] group-hover:translate-x-1">
                          →
                        </div>

                      </div>
                    </article>
                  </Link>
                );
              })}

            </div>

            {/* MORE LOCATIONS */}
            {moreLocations.length > 0 && (
              <div className="mt-8 rounded-[26px] border border-[#E7E1D6] bg-white px-5 py-5 sm:px-7">

                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-gray-400">
                    {lang === "id"
                      ? "Lokasi Lainnya"
                      : "More Locations"}
                  </p>

                  <div className="flex flex-wrap gap-x-7 gap-y-3">

                    {moreLocations.map((location) => {
                      const searchValue =
                        encodeURIComponent(
                          location.name
                        );

                      return (
                        <Link
                          key={location.name}
                          href={`/search?q=${searchValue}&query=${searchValue}`}
                          className="group inline-flex items-center gap-2 text-sm font-extrabold text-[#1C1C1E] transition hover:text-[#B8860B]"
                        >
                          {location.name}

                          <span className="text-[#B8860B] transition group-hover:translate-x-1">
                            →
                          </span>
                        </Link>
                      );
                    })}

                  </div>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </section>
  );
}             

function DownloadTetamoAppSection() {
  const { lang } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-[#090909] px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-8 lg:py-24">

      {/* BACKGROUND */}
      <div className="pointer-events-none absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-[#B8860B]/10 blur-[140px]" />

      <div className="pointer-events-none absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-[#D8B46A]/5 blur-[140px]" />

      <div className="relative mx-auto max-w-7xl">

        {/* SECTION INTRO */}
        <div className="grid items-end gap-6 lg:grid-cols-[0.92fr_0.68fr] lg:gap-14">

          <div>

            <div className="flex items-center gap-3">

              <span className="h-px w-10 bg-[#D8B46A]" />

              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#D8B46A] sm:text-xs">
                {lang === "id"
                  ? "Aplikasi Tetamo"
                  : "Tetamo Apps"}
              </span>

            </div>

            <h2 className="mt-5 text-[36px] font-extrabold leading-[1.02] tracking-[-0.05em] text-white sm:text-[46px] lg:text-[58px]">
              {lang === "id" ? (
                <>
                  Dua aplikasi.{" "}

                  <span className="text-[#D8B46A]">
                    Satu ekosistem properti.
                  </span>
                </>
              ) : (
                <>
                  Two apps.{" "}

                  <span className="text-[#D8B46A]">
                    One property ecosystem.
                  </span>
                </>
              )}
            </h2>

          </div>

          <p className="text-sm leading-7 text-white/60 sm:text-base sm:leading-8">
            {lang === "id"
              ? "Temukan properti di Tetamo. Pasang dan kelola listing Anda melalui Tetamo Partner—menghubungkan pencari properti dengan pemilik, agen, dan developer di seluruh Indonesia."
              : "Discover property with Tetamo. List and manage your properties with Tetamo Partner—connecting property seekers with owners, agents, and developers across Indonesia."}
          </p>

        </div>

        {/* TWO-APP GRID */}
        <div className="mt-10 grid items-stretch gap-5 md:grid-cols-2">

          {/* =====================================
              TETAMO MARKETPLACE
          ===================================== */}
          <article className="relative flex h-full flex-col overflow-hidden rounded-[32px] border border-[#D8B46A]/30 bg-[radial-gradient(circle_at_100%_0%,rgba(216,180,106,0.18),transparent_34%),linear-gradient(145deg,#1A1A1A,#101010_72%)] p-6 shadow-[0_30px_74px_rgba(0,0,0,0.34)] sm:p-8">

            <div className="flex items-center gap-4">

              <img
                src="/app-showcase/tetamo-app-icon.png"
                alt="Tetamo marketplace app icon"
                className="h-[68px] w-[68px] shrink-0 rounded-[19px] object-cover shadow-[0_16px_35px_rgba(0,0,0,0.32)] sm:h-[78px] sm:w-[78px] sm:rounded-[22px]"
              />

              <div className="min-w-0">

                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#D8B46A]">
                  TETAMO
                </p>

                <span className="mt-2 inline-flex rounded-full border border-[#D8B46A]/25 bg-[#D8B46A]/10 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-white/70">
                  {lang === "id"
                    ? "Untuk pencari properti"
                    : "For property seekers"}
                </span>

              </div>

            </div>

            <h3 className="mt-7 text-[27px] font-extrabold leading-[1.08] tracking-[-0.045em] text-white sm:text-[34px]">
              {lang === "id"
                ? "Cari, beli, dan sewa properti di Indonesia."
                : "Find, buy, and rent property in Indonesia."}
            </h3>

            <p className="mt-4 text-[13px] leading-6 text-white/60">
              {lang === "id"
                ? "Jelajahi rumah, vila, apartemen, tanah, dan properti lainnya. Hubungi pemilik atau agen dan jadwalkan viewing langsung."
                : "Explore homes, villas, apartments, land, and other properties. Contact owners or agents and schedule viewings directly."}
            </p>

            <div className="mt-6 grid gap-2 sm:grid-cols-3">

              <div className="flex min-h-[58px] items-center justify-center rounded-[15px] border border-white/10 bg-white/[0.045] px-3 text-center text-[11px] font-bold text-white/80">
                {lang === "id"
                  ? "Cari properti"
                  : "Find property"}
              </div>

              <div className="flex min-h-[58px] items-center justify-center rounded-[15px] border border-white/10 bg-white/[0.045] px-3 text-center text-[11px] font-bold text-white/80">
                {lang === "id"
                  ? "Simpan favorit"
                  : "Save favourites"}
              </div>

              <div className="flex min-h-[58px] items-center justify-center rounded-[15px] border border-white/10 bg-white/[0.045] px-3 text-center text-[11px] font-bold text-white/80">
                {lang === "id"
                  ? "Jadwal viewing"
                  : "Schedule viewing"}
              </div>

            </div>

            <div className="mt-auto grid gap-2.5 pt-6 sm:grid-cols-2">

              <a
                href={TETAMO_APP_STORE_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="Download Tetamo on the App Store"
                className="group flex min-h-[58px] items-center justify-between gap-3 rounded-[16px] bg-white px-4 text-[#171717] transition hover:-translate-y-0.5 hover:bg-[#F4F0E8]"
              >
                <span>
                  <span className="block text-[9px] font-semibold opacity-60">
                    {lang === "id"
                      ? "Download di"
                      : "Download on the"}
                  </span>

                  <span className="mt-0.5 block text-[13px] font-extrabold">
                    App Store
                  </span>
                </span>

                <span className="transition group-hover:translate-x-1">
                  →
                </span>
              </a>

              <a
                href={TETAMO_PLAY_STORE_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="Get Tetamo on Google Play"
                className="group flex min-h-[58px] items-center justify-between gap-3 rounded-[16px] border border-[#D8B46A]/75 bg-[#D8B46A] px-4 text-[#171717] transition hover:-translate-y-0.5 hover:bg-[#C59F4F]"
              >
                <span>
                  <span className="block text-[9px] font-semibold opacity-60">
                    {lang === "id"
                      ? "Dapatkan di"
                      : "Get it on"}
                  </span>

                  <span className="mt-0.5 block text-[13px] font-extrabold">
                    Google Play
                  </span>
                </span>

                <span className="transition group-hover:translate-x-1">
                  →
                </span>
              </a>

            </div>

          </article>

          {/* =====================================
              TETAMO PARTNER
          ===================================== */}
          <article className="relative flex h-full flex-col overflow-hidden rounded-[32px] border border-[#E4D8C3] bg-[radial-gradient(circle_at_100%_0%,rgba(216,180,106,0.22),transparent_35%),linear-gradient(145deg,#FBF8F1,#F1EADF_75%)] p-6 text-[#1B1B1B] shadow-[0_30px_74px_rgba(0,0,0,0.23)] sm:p-8">

            <div className="flex items-center gap-4">

              <img
                src="/app-showcase/tetamo-partner-icon.png"
                alt="Tetamo Partner app icon"
                className="h-[68px] w-[68px] shrink-0 rounded-[19px] object-cover shadow-[0_16px_35px_rgba(0,0,0,0.24)] sm:h-[78px] sm:w-[78px] sm:rounded-[22px]"
              />

              <div className="min-w-0">

                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#9A6F0A]">
                  TETAMO PARTNER
                </p>

                <span className="mt-2 inline-flex rounded-full border border-[#9A6F0A]/20 bg-[#D8B46A]/15 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#72540E]">
                  {lang === "id"
                    ? "Pemilik · Agen · Developer"
                    : "Owners · Agents · Developers"}
                </span>

              </div>

            </div>

            <h3 className="mt-7 text-[27px] font-extrabold leading-[1.08] tracking-[-0.045em] text-[#1B1B1B] sm:text-[34px]">
              {lang === "id"
                ? "Pasang dan kelola properti dari ponsel."
                : "List and manage property from your phone."}
            </h3>

            <p className="mt-4 text-[13px] leading-6 text-[#5E584F]">
              {lang === "id"
                ? "Buat listing, kelola leads, pantau properti, dan atur jadwal viewing melalui aplikasi khusus partner Tetamo."
                : "Create listings, manage leads, monitor properties, and arrange viewing schedules through Tetamo's dedicated partner app."}
            </p>

            <div className="mt-6 grid gap-2 sm:grid-cols-3">

              <div className="flex min-h-[58px] items-center justify-center rounded-[15px] border border-[#9A6F0A]/15 bg-white/60 px-3 text-center text-[11px] font-bold text-[#514A40]">
                {lang === "id"
                  ? "Buat listing"
                  : "Create listings"}
              </div>

              <div className="flex min-h-[58px] items-center justify-center rounded-[15px] border border-[#9A6F0A]/15 bg-white/60 px-3 text-center text-[11px] font-bold text-[#514A40]">
                {lang === "id"
                  ? "Kelola leads"
                  : "Manage leads"}
              </div>

              <div className="flex min-h-[58px] items-center justify-center rounded-[15px] border border-[#9A6F0A]/15 bg-white/60 px-3 text-center text-[11px] font-bold text-[#514A40]">
                {lang === "id"
                  ? "Pantau aktivitas"
                  : "Monitor activity"}
              </div>

            </div>

            <div className="mt-auto grid gap-2.5 pt-6 sm:grid-cols-2">

              <a
                href={TETAMO_PARTNER_APP_STORE_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="Download Tetamo Partner on the App Store"
                className="group flex min-h-[58px] items-center justify-between gap-3 rounded-[16px] border border-[#E0D4C0] bg-white px-4 text-[#171717] transition hover:-translate-y-0.5 hover:bg-[#F8F5EF]"
              >
                <span>
                  <span className="block text-[9px] font-semibold opacity-60">
                    {lang === "id"
                      ? "Download di"
                      : "Download on the"}
                  </span>

                  <span className="mt-0.5 block text-[13px] font-extrabold">
                    App Store
                  </span>
                </span>

                <span className="transition group-hover:translate-x-1">
                  →
                </span>
              </a>

              <a
                href={TETAMO_PARTNER_PLAY_STORE_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="Get Tetamo Partner on Google Play"
                className="group flex min-h-[58px] items-center justify-between gap-3 rounded-[16px] border border-[#B8860B] bg-[#D8B46A] px-4 text-[#171717] transition hover:-translate-y-0.5 hover:bg-[#C59F4F]"
              >
                <span>
                  <span className="block text-[9px] font-semibold opacity-60">
                    {lang === "id"
                      ? "Dapatkan di"
                      : "Get it on"}
                  </span>

                  <span className="mt-0.5 block text-[13px] font-extrabold">
                    Google Play
                  </span>
                </span>

                <span className="transition group-hover:translate-x-1">
                  →
                </span>
              </a>

            </div>

          </article>

        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-white/35">

          <span>✓ iOS</span>

          <span>✓ Android</span>

          <span>
            ✓ {lang === "id"
              ? "Bahasa Indonesia & English"
              : "Indonesian & English"}
          </span>

        </div>

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
  const { currency } = useCurrency();
  const [q, setQ] = useState("");

 const [heroProperty, setHeroProperty] = useState<{
  id: string;
  image: string;
  title: string;
  priceValue: number;
  location: string;
} | null>(null);

useEffect(() => {
  let ignore = false;

  async function loadHeroProperty() {
    try {
      const rows = await fetchHomepageProperties();

      const verifiedProperties = rows
        .filter((row) => isListingPublic(row))
        .filter((row) => isVerifiedListing(row));

      const preferredProperty =
        FEATURED_PROPERTY_CODES
          .map((kode) =>
            verifiedProperties.find(
              (row) =>
                normalizePropertyCode(row.kode) ===
                normalizePropertyCode(kode)
            )
          )
          .find(
            (row): row is HomepagePropertyRow =>
              Boolean(row?.property_images?.length)
          ) ||
        verifiedProperties.find(
          (row) => Boolean(row.property_images?.length)
        ) ||
        verifiedProperties[0];

      if (!preferredProperty || ignore) return;

      const images = buildPropertyImages(
        preferredProperty.property_images
      );

      setHeroProperty({
        id: preferredProperty.id,
        image: images[0],
        title: preferredProperty.title || "Properti di Tetamo",
        priceValue: Number(preferredProperty.price || 0),
        location:
          preferredProperty.city ||
          preferredProperty.area ||
          preferredProperty.province ||
          "Indonesia",
      });
    } catch (error) {
      console.error("Failed to load hero property:", error);
    }
  }

  loadHeroProperty();

  return () => {
    ignore = true;
  };
}, []);

const goSearch = () => {
  const query = q.trim();

  if (!query) {
    router.push("/properti");
    return;
  }

  router.push(`/search?q=${encodeURIComponent(query)}`);
};

return (
  <main className="min-h-screen overflow-x-hidden bg-white text-gray-900">
    <section className="relative overflow-hidden bg-[#0D0D0D]">
      {/* Background glow */}
      <div className="pointer-events-none absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-[#B8860B]/10 blur-[130px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-[#D8B46A]/5 blur-[130px]" />

      <div className="relative mx-auto grid min-h-[680px] max-w-7xl grid-cols-1 items-center gap-12 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:px-8 lg:py-20">

        {/* =========================
            LEFT
        ========================= */}
        <div className="max-w-[650px]">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#D8B46A]/30 bg-[#D8B46A]/[0.06] px-4 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D8B46A]" />

            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#D8B46A] sm:text-xs">
              {lang === "id"
                ? "Marketplace Properti Indonesia"
                : "Indonesia Property Marketplace"}
            </span>
          </div>

          {/* Main headline */}
          <h1 className="mt-6 max-w-[640px] text-[42px] font-extrabold leading-[1.02] tracking-[-0.045em] text-white sm:text-[52px] md:text-[58px] lg:text-[62px]">
            {lang === "id" ? (
              <>
                Cari, Beli, Jual &{" "}
                <span className="text-[#D8B46A]">
                  Sewa Properti
                </span>{" "}
                di Indonesia
              </>
            ) : (
              <>
                Find, Buy, Sell &{" "}
                <span className="text-[#D8B46A]">
                  Rent Property
                </span>{" "}
                in Indonesia
              </>
            )}
          </h1>

          {/* Supporting copy */}
          <p className="mt-6 max-w-[590px] text-[15px] leading-7 text-white/65 sm:text-base sm:leading-8 lg:text-[17px]">
            {lang === "id"
              ? "Cari rumah, apartemen, vila, tanah dan properti lainnya untuk dibeli atau disewa. Pemilik dan agen juga dapat memasarkan properti langsung melalui Tetamo."
              : "Find houses, apartments, villas, land and other properties to buy or rent. Owners and agents can also market their properties directly through Tetamo."}
          </p>

          {/* Buy / Rent */}
          <div className="mt-8 flex w-full max-w-[410px] rounded-2xl border border-white/10 bg-white/[0.05] p-1.5">
            <Link
              href="/properti?jenisListing=dijual"
              className="flex-1 rounded-xl bg-white px-5 py-3.5 text-center text-sm font-extrabold text-[#111111] transition duration-200 hover:bg-[#D8B46A]"
            >
              {lang === "id" ? "Beli" : "Buy"}
            </Link>

            <Link
              href="/properti?jenisListing=disewa"
              className="flex-1 rounded-xl px-5 py-3.5 text-center text-sm font-extrabold text-white transition duration-200 hover:bg-white/10"
            >
              {lang === "id" ? "Sewa" : "Rent"}
            </Link>
          </div>

          {/* Search */}
          <div className="mt-4 w-full max-w-[610px] rounded-[22px] bg-white p-2 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") goSearch();
                }}
                placeholder={
                  lang === "id"
                    ? "Cari kota, area, atau properti..."
                    : "Search city, area, or property..."
                }
                className="h-12 min-w-0 flex-1 rounded-2xl bg-transparent px-4 text-sm text-[#1C1C1E] outline-none placeholder:text-gray-400 sm:text-[15px]"
              />

              <button
                type="button"
                onClick={goSearch}
                className="h-12 shrink-0 rounded-2xl bg-[#B8860B] px-5 text-sm font-extrabold text-white transition duration-200 hover:bg-[#9C7208] sm:px-7"
              >
                {lang === "id" ? "Cari" : "Search"}
              </button>
            </div>
          </div>

          {/* Trust strip */}
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-white/55 sm:text-sm">
            <span>
              ✓{" "}
              {lang === "id"
                ? "Listing Terverifikasi"
                : "Verified Listings"}
            </span>

            <span>
              ✓{" "}
              {lang === "id"
                ? "WhatsApp Langsung"
                : "Direct WhatsApp"}
            </span>

            <span>
              ✓{" "}
              {lang === "id"
                ? "Jadwal Viewing"
                : "Schedule Viewing"}
            </span>
          </div>

          {/* Seller CTA */}
          <div className="mt-8 max-w-[610px] border-t border-white/10 pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-white sm:text-[15px]">
                  {lang === "id"
                    ? "Mau jual atau sewakan properti?"
                    : "Want to sell or rent out your property?"}
                </p>

                <p className="mt-1 text-sm text-white/50">
                  {lang === "id"
                    ? "Pasang properti mulai Rp50.000 untuk 1 tahun."
                    : "List your property from Rp50,000 for 1 year."}
                </p>
              </div>

              <Link
                href="/pricelist"
                className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-[#D8B46A]/60 px-5 py-2.5 text-sm font-bold text-[#D8B46A] transition duration-200 hover:bg-[#D8B46A] hover:text-[#111111]"
              >
                {lang === "id"
                  ? "Pasang Properti"
                  : "List Property"}

                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* =========================
            RIGHT — PROPERTY
        ========================= */}
        <div className="relative mx-auto w-full max-w-[570px] lg:max-w-none">
          {/* subtle gold corner */}
          <div className="pointer-events-none absolute -left-5 -top-5 hidden h-28 w-28 rounded-[30px] border border-[#D8B46A]/25 lg:block" />

          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#181818] shadow-[0_35px_90px_rgba(0,0,0,0.5)]">
            {heroProperty ? (
              <Link
                href={`/properti/${heroProperty.id}`}
                className="group block"
              >
                <div className="relative h-[430px] sm:h-[520px] lg:h-[590px]">
                  <img
                    src={heroProperty.image}
                    alt={heroProperty.title}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]"
                  />

                  {/* Image overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/10 to-black/15" />

                  <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-black to-transparent" />

                  {/* Tetamo badge */}
                  <div className="absolute left-5 top-5 rounded-full border border-white/20 bg-black/40 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white backdrop-blur-md">
                    TETAMO
                  </div>

                  {/* Property details */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                    <div className="inline-flex rounded-full bg-[#D8B46A] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#111111] sm:text-[10px]">
                      {lang === "id"
                        ? "Properti Pilihan"
                        : "Selected Property"}
                    </div>

                    <p className="mt-4 text-[28px] font-extrabold leading-none tracking-[-0.03em] text-white sm:text-[34px]">
                      {formatHomepagePrice(heroProperty.priceValue, currency)}
                    </p>

                    <p className="mt-3 line-clamp-2 max-w-[95%] text-sm font-semibold leading-6 text-white/90 sm:text-[15px]">
                      {heroProperty.title}
                    </p>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-4">
                      <p className="text-sm font-medium text-white/65">
                        {heroProperty.location}
                      </p>

                      <span className="text-sm font-bold text-[#D8B46A] transition duration-200 group-hover:translate-x-1">
                        {lang === "id"
                          ? "Lihat Detail →"
                          : "View Details →"}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="flex h-[430px] items-center justify-center sm:h-[520px] lg:h-[590px]">
                <div className="text-center">
                  <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-[#D8B46A]/20" />

                  <p className="mt-4 text-sm text-white/40">
                    {lang === "id"
                      ? "Memuat properti..."
                      : "Loading property..."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>

 <FeaturedPropertiesSection />
<TetamoTrustSection />
<FeaturedAgentsSection />
<FeaturedOwnersSection />
<LocationDiscoverySection />
<DownloadTetamoAppSection />

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
                      ? "Hubungi Kami: +61 416 957 890 / +62 823 2212 2208 / +62 813 3947 717 / +62 822 6477 8799 / inquiry@tetamo.com"
                      : "Contact us: +61 416 957 890 / +62 823 2212 2208 / +62 813 3947 717 / +62 822 6477 8799 / inquiry@tetamo.com"}
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