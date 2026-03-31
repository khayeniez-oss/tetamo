"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Gem,
  Crown,
  Zap,
  ShieldCheck,
  UserCheck,
  Clock,
} from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/trackEvent";
import { createNotification, notifyAdmins } from "@/lib/notifications";

type Property = {
  verifiedListing: boolean;

  ownerVerified: boolean;
  ownerPendingApproval: boolean;

  agentVerified: boolean;
  agentPendingVerification: boolean;

  developerVerified: boolean;
  developerPendingApproval: boolean;

  spotlight?: boolean;
  featured?: boolean;
  boosted?: boolean;

  id: string;
  jenisListing: "dijual" | "disewa";
  propertyType: string;
  kode?: string;
  postedDate?: string;

  title: string;
  price: string;
  province: string;
  area: string;
  size: string;
  bed: string;
  furnished: string;

  agentName: string;
  agency: string;
  whatsapp: string;
  images: string[];

  postedByType: "owner" | "agent" | "developer";
  receiverId: string;
  receiverName: string;
  receiverWhatsapp: string;

  rankingScore?: number;
};

type PropertyImageRow = {
  image_url: string;
  sort_order: number | null;
  is_cover: boolean | null;
};

type PropertyRow = {
  id: string;
  kode: string | null;
  posted_date: string | null;
  title: string | null;
  price: number | null;
  province: string | null;
  city: string | null;
  area: string | null;
  building_size: number | null;
  land_size: number | null;
  bedrooms: number | null;
  furnishing: string | null;
  listing_type: string | null;
  property_type: string | null;
  source: string | null;
  status: string | null;
  verification_status: string | null;
  verified_ok: boolean | null;
  plan_id: string | null;
  created_at: string | null;
  user_id: string | null;
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
  created_by_user_id: string | null;

  property_images: PropertyImageRow[] | null;
};

function rotateListingsByReceiver(list: Property[]) {
  const grouped: Record<string, Property[]> = {};

  for (const item of list) {
    const key = item.receiverId || item.id;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }

  const receiverIds = Object.keys(grouped);
  const rotated: Property[] = [];

  let pointer = 0;

  while (true) {
    let addedAny = false;

    for (const receiverId of receiverIds) {
      const bucket = grouped[receiverId];
      if (pointer < bucket.length) {
        rotated.push(bucket[pointer]);
        addedAny = true;
      }
    }

    if (!addedAny) break;
    pointer++;
  }

  return rotated;
}

function calculateRanking(p: Property) {
  let score = p.rankingScore ?? 0;

  if (p.spotlight) score += 1000;
  if (p.featured) score += 500;
  if (p.boosted) score += 200;
  if (p.ownerVerified) score += 20;
  if (p.agentVerified) score += 10;
  if (p.developerVerified) score += 10;
  if (p.verifiedListing) score += 10;

  return score;
}

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

function mapFurnishing(value?: string | null, lang?: string) {
  if (!value) return "-";

  const v = value.toLowerCase();

  if (v === "full") return lang === "id" ? "Full Furnish" : "Full Furnished";
  if (v === "semi") return lang === "id" ? "Semi Furnish" : "Semi Furnished";
  if (v === "unfurnished") return "Unfurnished";

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

function isListingPublic(row: PropertyRow) {
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

function normalizePostedByType(
  role?: string | null,
  source?: string | null
): "owner" | "agent" | "developer" {
  const value = (role || source || "owner").toLowerCase();

  if (value === "agent") return "agent";
  if (value === "developer") return "developer";
  return "owner";
}

function formatPropertyType(value?: string | null, lang?: string) {
  const raw = String(value || "").trim().toLowerCase();

  if (!raw) return lang === "id" ? "Properti" : "Property";

  if (raw === "tanah") return lang === "id" ? "Tanah" : "Land";
  if (raw === "rumah") return lang === "id" ? "Rumah" : "House";
  if (raw === "villa") return "Villa";
  if (raw === "apartemen") return lang === "id" ? "Apartemen" : "Apartment";
  if (raw === "apartment") return lang === "id" ? "Apartemen" : "Apartment";
  if (raw === "ruko") return lang === "id" ? "Ruko" : "Shophouse";
  if (raw === "rukan") return lang === "id" ? "Rukan" : "Office Unit";
  if (raw === "gudang") return lang === "id" ? "Gudang" : "Warehouse";
  if (raw === "kantor") return lang === "id" ? "Kantor" : "Office";
  if (raw === "kost") return lang === "id" ? "Kost" : "Boarding House";
  if (raw === "kos") return lang === "id" ? "Kos" : "Boarding House";
  if (raw === "hotel") return "Hotel";
  if (raw === "pabrik") return lang === "id" ? "Pabrik" : "Factory";
  if (raw === "toko") return lang === "id" ? "Toko" : "Shop";

  return raw
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function PropertyCard({ p }: { p: Property }) {
  const { lang } = useLanguage();
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const cardViewTrackedRef = useRef(false);

  const next = () =>
    setIdx((prev) => (prev === p.images.length - 1 ? 0 : prev + 1));

  const prev = () =>
    setIdx((prev) => (prev === 0 ? p.images.length - 1 : prev - 1));

  useEffect(() => {
    const node = cardRef.current;
    if (!node || cardViewTrackedRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (
          entry?.isIntersecting &&
          entry.intersectionRatio >= 0.6 &&
          !cardViewTrackedRef.current
        ) {
          cardViewTrackedRef.current = true;

          void trackEvent({
            event_name: "property_card_view",
            property_id: p.id,
            source_page: "marketplace",
            metadata: {
              property_title: p.title,
              property_code: p.kode ?? null,
              listing_type: p.jenisListing,
              property_type: p.propertyType,
              posted_by_type: p.postedByType,
              area: p.area,
              province: p.province,
            },
          });

          observer.disconnect();
        }
      },
      { threshold: [0.6] }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [
    p.id,
    p.title,
    p.kode,
    p.jenisListing,
    p.propertyType,
    p.postedByType,
    p.area,
    p.province,
  ]);

  function postedByLabel() {
    if (lang === "id") {
      if (p.postedByType === "owner") return "Pemilik";
      if (p.postedByType === "developer") return "Developer";
      return "Agen";
    }

    if (p.postedByType === "owner") return "Owner";
    if (p.postedByType === "developer") return "Developer";
    return "Agent";
  }

  function listingTypeBadgeClass() {
    if (p.jenisListing === "dijual") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  function propertyTypeBadgeClass() {
    return "border-white/80 bg-white/95 text-[#1C1C1E]";
  }

  function renderVerificationBadge() {
    if (p.postedByType === "agent") {
      if (p.agentVerified) {
        return (
          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#B8860B] px-3 py-1 text-[11px] font-semibold text-white shadow-sm sm:text-xs">
            <UserCheck size={12} strokeWidth={2.5} />
            {lang === "id" ? "Agen Terverifikasi" : "Verified Agent"}
          </span>
        );
      }

      if (p.agentPendingVerification) {
        return (
          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 shadow-sm sm:text-xs">
            <Clock size={12} strokeWidth={2.5} />
            {lang === "id"
              ? "Menunggu Verifikasi"
              : "Pending for Verification"}
          </span>
        );
      }

      return null;
    }

    if (p.postedByType === "developer") {
      if (p.developerVerified) {
        return (
          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#1C1C1E] px-3 py-1 text-[11px] font-semibold text-white shadow-sm sm:text-xs">
            <ShieldCheck size={12} strokeWidth={2.5} />
            {lang === "id" ? "Developer Terverifikasi" : "Verified Developer"}
          </span>
        );
      }

      if (p.developerPendingApproval) {
        return (
          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[#1C1C1E]/20 bg-white/90 px-3 py-1 text-[11px] font-semibold text-gray-900 shadow-sm sm:text-xs">
            <Clock size={12} strokeWidth={2.5} />
            {lang === "id"
              ? "Menunggu Persetujuan"
              : "Pending for Approval"}
          </span>
        );
      }

      return null;
    }

    if (p.ownerVerified) {
      return (
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#1C1C1E] px-3 py-1 text-[11px] font-semibold text-white shadow-sm sm:text-xs">
          <ShieldCheck size={12} strokeWidth={2.5} />
          {lang === "id" ? "Pemilik Terverifikasi" : "Verified Owner"}
        </span>
      );
    }

    if (p.ownerPendingApproval) {
      return (
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[#1C1C1E]/20 bg-white/90 px-3 py-1 text-[11px] font-semibold text-gray-900 shadow-sm sm:text-xs">
          <Clock size={12} strokeWidth={2.5} />
          {lang === "id"
            ? "Menunggu Persetujuan"
            : "Pending for Approval"}
        </span>
      );
    }

    return null;
  }

  function trackMarketplaceClick(
    event_name:
      | "property_whatsapp_click"
      | "property_view_detail_click"
      | "property_schedule_viewing_click",
    property: Property,
    extraMetadata: Record<string, any> = {}
  ) {
    void trackEvent({
      event_name,
      property_id: property.id,
      source_page: "marketplace",
      metadata: {
        property_title: property.title,
        property_code: property.kode ?? null,
        listing_type: property.jenisListing,
        property_type: property.propertyType,
        posted_by_type: property.postedByType,
        area: property.area,
        province: property.province,
        ...extraMetadata,
      },
    });
  }

  async function requireLogin(nextPath: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert(
        lang === "id"
          ? "Silakan login terlebih dahulu."
          : "Please log in first."
      );
      router.push(`/login?next=${encodeURIComponent(nextPath)}`);
      return null;
    }

    return user;
  }

  async function handleWhatsAppInquiry(property: Property) {
    const user = await requireLogin(`/properti/${property.id}`);
    if (!user) return;

    if (!property.receiverWhatsapp) {
      alert(
        lang === "id"
          ? "Nomor WhatsApp penjual belum tersedia."
          : "Seller WhatsApp number is not available yet."
      );
      return;
    }

    const message =
      lang === "id"
        ? `Halo ${property.receiverName}, saya tertarik dengan properti ini di TETAMO.

Properti: ${property.title}
Kode: ${property.kode ?? "-"}
Lokasi: ${property.area}, ${property.province}
Harga: ${property.price}

Apakah properti ini masih tersedia?`
        : `Hello ${property.receiverName}, I'm interested in this property on TETAMO.

Property: ${property.title}
Code: ${property.kode ?? "-"}
Location: ${property.area}, ${property.province}
Price: ${property.price}

Is this property still available?`;

    const whatsappURL = `https://wa.me/${property.receiverWhatsapp}?text=${encodeURIComponent(
      message
    )}`;

    const popup = window.open("about:blank", "_blank");

    try {
      await trackEvent({
        event_name: "property_whatsapp_click",
        property_id: property.id,
        user_id: user.id,
        source_page: "marketplace",
        metadata: {
          button: "whatsapp",
          property_title: property.title,
          property_code: property.kode ?? null,
          listing_type: property.jenisListing,
          property_type: property.propertyType,
          posted_by_type: property.postedByType,
          area: property.area,
          province: property.province,
          receiver_id: property.receiverId || null,
          receiver_name: property.receiverName || null,
        },
      });

      let senderProfile:
        | {
            full_name: string | null;
            phone: string | null;
            email: string | null;
          }
        | null = null;

      const { data: profileData, error: senderProfileError } = await supabase
        .from("profiles")
        .select("full_name, phone, email")
        .eq("id", user.id)
        .maybeSingle();

      if (senderProfileError) {
        console.error("Failed to load sender profile:", senderProfileError);
      } else {
        senderProfile = profileData;
      }

      const leadPayload = {
        property_id: property.id,
        sender_user_id: user.id,
        sender_name:
          senderProfile?.full_name ||
          (typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : null),
        sender_email: senderProfile?.email || user.email || null,
        sender_phone: senderProfile?.phone || null,

        receiver_user_id: property.receiverId || null,
        receiver_name: property.receiverName || null,
        receiver_role: property.postedByType || "owner",

        assigned_admin_user_id: null,
        admin_visible: true,

        lead_type: "whatsapp",
        source: "whatsapp_button",
        message,
        viewing_date: null,
        viewing_time: null,

        status: "new",
        priority: "normal",
        notes: null,
      };

      const { data: insertedLead, error } = await supabase
        .from("leads")
        .insert(leadPayload)
        .select("id")
        .maybeSingle();

      if (error) {
        console.error("Marketplace WhatsApp lead insert error:", error);
      } else if (insertedLead?.id) {
        await trackEvent({
          event_name: "lead_created",
          property_id: property.id,
          user_id: user.id,
          source_page: "marketplace",
          lead_id: String(insertedLead.id),
          metadata: {
            lead_type: "whatsapp",
            source: "whatsapp_button",
            property_title: property.title,
            property_code: property.kode ?? null,
          },
        });

        try {
          if (property.receiverId) {
            await createNotification({
              userId: property.receiverId,
              relatedUserId: user.id,
              propertyId: property.id,
              leadId: insertedLead.id,
              type: "new_whatsapp_inquiry",
              title: "New WhatsApp inquiry",
              body:
                lang === "id"
                  ? `Ada WhatsApp inquiry baru untuk "${property.title}".`
                  : `There is a new WhatsApp inquiry for "${property.title}".`,
              audience: "user",
              priority: "high",
            });
          }

          await notifyAdmins({
            relatedUserId: user.id,
            propertyId: property.id,
            leadId: insertedLead.id,
            type: "new_whatsapp_inquiry",
            title: "New WhatsApp inquiry",
            body: `New WhatsApp inquiry for "${property.title}".`,
            priority: "high",
          });
        } catch (notifyError) {
          console.error(
            "Failed to notify marketplace WhatsApp inquiry:",
            notifyError
          );
        }
      }
    } catch (err) {
      console.error("Failed to create marketplace WhatsApp lead:", err);
    } finally {
      if (popup) {
        popup.location.href = whatsappURL;
      } else {
        window.location.href = whatsappURL;
      }
    }
  }

  async function handleScheduleViewing(property: Property) {
    const user = await requireLogin(`/properti/${property.id}`);
    if (!user) return;

    trackMarketplaceClick("property_schedule_viewing_click", property, {
      button: "schedule_viewing",
    });

    router.push(`/properti/${property.id}`);
  }

  return (
    <div
      ref={cardRef}
      className={[
        "relative overflow-hidden rounded-3xl border bg-white transition-all duration-300",
        p.spotlight
          ? "border-[#00CFE8] shadow-[0_0_0_1px_#00CFE8,0_18px_42px_rgba(0,207,232,0.20),0_10px_28px_rgba(0,0,0,0.08)] sm:scale-[1.01] sm:-translate-y-1 sm:hover:-translate-y-2 sm:hover:scale-[1.015]"
          : p.featured
          ? "border-[#D4A017] shadow-[0_0_0_1px_#D4A017,0_8px_25px_rgba(212,160,23,0.25)]"
          : p.boosted
          ? "border-slate-200 shadow-[0_0_0_1px_rgba(226,232,240,1),0_10px_28px_rgba(148,163,184,0.18)]"
          : "border-gray-200 shadow-sm",
      ].join(" ")}
    >
      <div className="relative">
        <div className="absolute left-3 top-3 z-20 flex max-w-[calc(100%-24px)] flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {p.spotlight && (
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-extrabold text-[#1C1C1E] shadow-[0_6px_18px_rgba(0,0,0,0.12)] backdrop-blur-sm">
                <Gem size={14} className="text-[#00CFE8]" />
                SPOTLIGHT
              </span>
            )}

            {p.featured && (
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#B8860B] shadow-md">
                <Crown size={14} className="text-[#FFD700]" />
                FEATURED
              </span>
            )}

            {p.boosted && !p.featured && !p.spotlight && (
              <span className="inline-flex w-fit items-center gap-1 rounded-full border border-slate-200 bg-white/95 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-md">
                <Zap size={14} className="text-[#F59E0B]" />
                BOOST
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {renderVerificationBadge()}
          </div>
        </div>

        <Link href={`/properti/${p.id}`} className="block">
          <img
            src={p.images[idx]}
            alt={p.title}
            className="h-60 w-full object-cover sm:h-72 lg:h-80"
          />
        </Link>

        <div className="absolute bottom-3 right-3 rounded-full bg-[#1C1C1E]/85 px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">
          TETAMO
        </div>

        <button
          type="button"
          onClick={prev}
          aria-label="Previous image"
          className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#1C1C1E]/70 text-lg text-white transition hover:bg-[#1C1C1E]"
        >
          ‹
        </button>

        <button
          type="button"
          onClick={next}
          aria-label="Next image"
          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#1C1C1E]/70 text-lg text-white transition hover:bg-[#1C1C1E]"
        >
          ›
        </button>

        <div className="absolute bottom-3 left-3 flex max-w-[calc(100%-96px)] flex-wrap items-center gap-2">
          <div
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold sm:text-xs ${listingTypeBadgeClass()}`}
          >
            {p.jenisListing === "dijual"
              ? lang === "id"
                ? "Dijual"
                : "For Sale"
              : lang === "id"
              ? "Disewa"
              : "For Rent"}
          </div>

          <div
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold shadow-sm sm:text-xs ${propertyTypeBadgeClass()}`}
          >
            {formatPropertyType(p.propertyType, lang)}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="text-xl font-extrabold text-[#1C1C1E] sm:text-2xl">
          {p.price}
        </div>

        <div className="mt-1 text-sm text-gray-500">
          {p.area}, {p.province}
        </div>

        <Link href={`/properti/${p.id}`} className="mt-2 block">
          <h3 className="text-base font-semibold leading-snug text-[#1C1C1E] hover:underline sm:text-lg">
            {p.title}
          </h3>
        </Link>

        <div className="mt-3 text-sm leading-6 text-gray-600">
          {p.size} •{" "}
          {p.bed.replace("Kamar", lang === "id" ? "Kamar" : "Bed")} •{" "}
          {p.furnished}
        </div>

        <div className="mt-3 text-sm leading-6 text-gray-600">
          {postedByLabel()}:{" "}
          <span className="font-semibold text-[#1C1C1E]">{p.agentName}</span>
          {p.agency ? (
            <>
              <span className="text-gray-400"> • </span>
              <span className="text-gray-700">{p.agency}</span>
            </>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs tracking-wide text-gray-500">
          <span>{p.kode}</span>
          <span>•</span>
          <span>{p.postedDate}</span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => handleWhatsAppInquiry(p)}
            className="rounded-2xl bg-[#1C1C1E] px-4 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90 sm:text-base"
          >
            WhatsApp
          </button>

          <Link
            href={`/properti/${p.id}`}
            onClick={() =>
              trackMarketplaceClick("property_view_detail_click", p, {
                button: "view_detail",
              })
            }
            className="rounded-2xl bg-yellow-600 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-yellow-700 sm:text-base"
          >
            {lang === "id" ? "Lihat Detail" : "View Detail"}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => handleScheduleViewing(p)}
          className="mt-3 block w-full rounded-2xl border border-gray-200 px-4 py-3 text-center text-sm font-semibold text-[#1C1C1E] transition hover:bg-gray-50 sm:text-base"
        >
          {lang === "id" ? "Jadwal Viewing" : "Schedule Viewing"}
        </button>
      </div>
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-[#1C1C1E] text-white"
          : "border border-gray-200 bg-white text-[#1C1C1E] hover:bg-gray-50"
      }`}
    >
      {label}
    </Link>
  );
}

export default function PropertiPageClient() {
  const { lang } = useLanguage();
  const sp = useSearchParams();
  const jenisListing = sp.get("jenisListing");

  const [all, setAll] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadProperties() {
      setLoading(true);

      const { data, error } = await supabase
        .from("properties")
        .select(`
          id,
          kode,
          posted_date,
          title,
          price,
          province,
          city,
          area,
          building_size,
          land_size,
          bedrooms,
          furnishing,
          listing_type,
          property_type,
          source,
          status,
          verification_status,
          verified_ok,
          plan_id,
          created_at,
          user_id,
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
          created_by_user_id,
          property_images (
            image_url,
            sort_order,
            is_cover
          )
        `)
        .neq("status", "rejected")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load marketplace properties:", error);
        if (!ignore) {
          setAll([]);
          setLoading(false);
        }
        return;
      }

      const rows = ((data ?? []) as PropertyRow[]).filter(isListingPublic);

      const mapped: Property[] = rows.map((row) => {
        const sortedImages = [...(row.property_images ?? [])].sort((a, b) => {
          const coverA = a.is_cover ? 1 : 0;
          const coverB = b.is_cover ? 1 : 0;

          if (coverA !== coverB) return coverB - coverA;
          return (a.sort_order ?? 0) - (b.sort_order ?? 0);
        });

        const images = sortedImages.length
          ? sortedImages.map((img) => img.image_url)
          : ["/placeholder-property.jpg"];

        const receiverId =
          row.contact_user_id || row.user_id || row.created_by_user_id || "";

        const postedByType = normalizePostedByType(
          row.contact_role,
          row.source
        );

        const isVerified =
          row.verification_status === "verified" || Boolean(row.verified_ok);

        const spotlight = isPromotionActive(
          row.spotlight_active,
          row.spotlight_expires_at
        );

        const featured =
          row.plan_id === "featured" &&
          (!row.featured_expires_at || isFutureDate(row.featured_expires_at));

        const boosted = isPromotionActive(
          row.boost_active,
          row.boost_expires_at
        );

        const ownerPendingApproval =
          postedByType === "owner" &&
          !isVerified &&
          (row.status === "pending_approval" ||
            row.verification_status === "pending_approval");

        const agentPendingVerification =
          postedByType === "agent" &&
          !isVerified &&
          (row.verification_status === "pending_verification" ||
            row.status === "pending_approval");

        const developerPendingApproval =
          postedByType === "developer" &&
          !isVerified &&
          (row.status === "pending_approval" ||
            row.verification_status === "pending_approval");

        const resolvedName = row.contact_name || "Tetamo User";
        const resolvedAgency = row.contact_agency || "";
        const resolvedWhatsapp = normalizeWhatsapp(row.contact_phone);

        return {
          verifiedListing: isVerified,

          ownerVerified: postedByType === "owner" && isVerified,
          ownerPendingApproval,

          agentVerified: postedByType === "agent" && isVerified,
          agentPendingVerification,

          developerVerified: postedByType === "developer" && isVerified,
          developerPendingApproval,

          spotlight,
          featured,
          boosted,

          id: row.id,
          jenisListing: row.listing_type === "disewa" ? "disewa" : "dijual",
          propertyType: row.property_type || "",
          kode: row.kode ?? undefined,
          postedDate: formatPostedDate(row.posted_date || row.created_at),

          title: row.title ?? "-",
          price: formatIdr(row.price ?? 0),
          province: row.province ?? "-",
          area: row.city || row.area || "-",
          size: `${row.building_size ?? row.land_size ?? 0} m²`,
          bed: `${row.bedrooms ?? 0} Kamar`,
          furnished: mapFurnishing(row.furnishing, lang),

          agentName: resolvedName,
          agency: resolvedAgency,
          whatsapp: resolvedWhatsapp,
          images,

          postedByType,
          receiverId,
          receiverName: resolvedName,
          receiverWhatsapp: resolvedWhatsapp,

          rankingScore: 0,
        };
      });

      if (!ignore) {
        setAll(mapped);
        setLoading(false);
      }
    }

    loadProperties();

    return () => {
      ignore = true;
    };
  }, [lang]);

  const filtered = useMemo(() => {
    let list = [...all];

    if (jenisListing === "dijual" || jenisListing === "disewa") {
      list = list.filter((p) => p.jenisListing === jenisListing);
    }

    const spotlight = list
      .filter((p) => p.spotlight)
      .sort((a, b) => calculateRanking(b) - calculateRanking(a));

    const featured = list
      .filter((p) => !p.spotlight && p.featured)
      .sort((a, b) => calculateRanking(b) - calculateRanking(a));

    const boosted = list
      .filter((p) => !p.spotlight && !p.featured && p.boosted)
      .sort((a, b) => calculateRanking(b) - calculateRanking(a));

    const normal = list
      .filter((p) => !p.spotlight && !p.featured && !p.boosted)
      .sort((a, b) => calculateRanking(b) - calculateRanking(a));

    return [
      ...rotateListingsByReceiver(spotlight),
      ...rotateListingsByReceiver(featured),
      ...rotateListingsByReceiver(boosted),
      ...rotateListingsByReceiver(normal),
    ];
  }, [all, jenisListing]);

  const pageSize = 12;
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [jenisListing, all.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  const currentFilterLabel = jenisListing
    ? jenisListing === "dijual"
      ? lang === "id"
        ? "Dijual"
        : "For Sale"
      : lang === "id"
      ? "Disewa"
      : "For Rent"
    : lang === "id"
    ? "Semua properti"
    : "All properties";

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="rounded-3xl bg-[#F7F7F8] px-5 py-6 sm:px-7 sm:py-8">
          <h1 className="text-2xl font-bold text-[#1C1C1E] sm:text-3xl">
            {lang === "id" ? "Marketplace Properti" : "Property Marketplace"}
          </h1>

          <p className="mt-2 text-sm leading-7 text-gray-600 sm:text-base">
            {lang === "id"
              ? "Temukan listing properti dari pemilik, agen, dan developer yang aktif."
              : "Discover active property listings from owners, agents, and developers."}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <FilterChip
              href="/properti"
              active={!jenisListing}
              label={lang === "id" ? "Semua" : "All"}
            />
            <FilterChip
              href="/properti?jenisListing=dijual"
              active={jenisListing === "dijual"}
              label={lang === "id" ? "Dijual" : "For Sale"}
            />
            <FilterChip
              href="/properti?jenisListing=disewa"
              active={jenisListing === "disewa"}
              label={lang === "id" ? "Disewa" : "For Rent"}
            />
          </div>

          <p className="mt-4 text-sm font-medium text-gray-600">
            {lang === "id" ? "Filter aktif:" : "Active filter:"}{" "}
            <span className="font-semibold text-[#1C1C1E]">
              {currentFilterLabel}
            </span>
          </p>
        </div>

        {loading ? (
          <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 sm:text-base">
            {lang === "id" ? "Memuat properti..." : "Loading properties..."}
          </div>
        ) : paged.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 sm:text-base">
            {lang === "id"
              ? "Belum ada properti untuk ditampilkan."
              : "No properties to display yet."}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {paged.map((p) => (
              <PropertyCard key={p.id} p={p} />
            ))}
          </div>
        )}

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-40 sm:w-auto"
          >
            {lang === "id" ? "Sebelumnya" : "Prev"}
          </button>

          <div className="text-sm text-gray-600">
            {lang === "id" ? "Halaman" : "Page"}{" "}
            <span className="font-semibold">{page}</span> /{" "}
            <span className="font-semibold">{totalPages}</span>
          </div>

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-40 sm:w-auto"
          >
            {lang === "id" ? "Berikutnya" : "Next"}
          </button>
        </div>
      </div>
    </main>
  );
}