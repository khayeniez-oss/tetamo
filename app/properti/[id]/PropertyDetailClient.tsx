"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import MortgageCalculator from "@/components/MortgageCalculator";
import { useLanguage } from "@/app/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/trackEvent";
import { createNotification, notifyAdmins } from "@/lib/notifications";
import {
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Music2,
  Gem,
  Crown,
  Zap,
  BedDouble,
  Bath,
  Layers3,
  CarFront,
  Droplets,
  Ruler,
  FileText,
  Home,
  Square,
} from "lucide-react";

type VerificationStatus = "pending" | "verified";

type PropertyItem = {
  id: string;
  jenisListing: "dijual" | "disewa";
  title: string;
  price: string;
  province: string;
  area: string;
  size: string;
  bed: string;
  furnished: string;
  certificate: string;
  description: string;
  descriptionEn: string;
  agency: string;
  agentName: string;
  images: string[];
  videoUrl?: string | null;
  photo: string;

  facilities?: Record<string, boolean>;
  nearby?: Record<string, boolean>;

  kodeListing: string;
  postedDate?: string;

  verifiedOwnerStatus?: VerificationStatus;
  verifiedAgent?: boolean;
  boosted?: boolean;
  featured?: boolean;
  spotlight?: boolean;

  verifiedListing: boolean;
  ownerApproved: boolean;
  agentVerified: boolean;

  postedByType: "owner" | "agent" | "developer";
  receiverId: string;
  receiverName: string;
  receiverWhatsapp: string;

  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  linkedinUrl: string;

  buildingSizeValue: number | null;
  landSizeValue: number | null;
  bedroomsValue: number | null;
  bathroomsValue: number | null;
  floorsValue: number | null;
  parkingValue: number | null;
  parkingAvailable: boolean;
  electricityValue: string;
  waterValue: string;
};

type PropertyImageRow = {
  image_url: string;
  sort_order: number | null;
  is_cover: boolean | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  agency: string | null;
  photo_url: string | null;
  email?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  tiktok_url?: string | null;
  youtube_url?: string | null;
  linkedin_url?: string | null;
};

type PropertyRow = {
  [key: string]: any;
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
  certificate: string | null;
  description: string | null;
  description_en: string | null;
  facilities: Record<string, boolean> | null;
  nearby: Record<string, boolean> | null;
  listing_type: string | null;
  source: string | null;
  status: string | null;
  verification_status: string | null;
  verified_ok: boolean | null;
  plan_id: string | null;
  created_at: string | null;
  user_id: string | null;
  video_url: string | null;
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
  profiles: ProfileRow | ProfileRow[] | null;
};

type DetailSpecItem = {
  key: string;
  label: string;
  value: string;
  icon: any;
};

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

function formatNumber(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "";
  return new Intl.NumberFormat("id-ID").format(value);
}

function toNumberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toStringOrEmpty(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
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

function normalizeExternalUrl(url?: string | null) {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:")
  ) {
    return trimmed;
  }
  return `https://${trimmed}`;
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
    PropertyRow,
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

export default function PropertyDetailClient({ id }: { id: string }) {
  const { lang } = useLanguage();

  const [jadwalOpen, setJadwalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [idx, setIdx] = useState(0);

  const [property, setProperty] = useState<PropertyItem | null>(null);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const trackedDetailViewRef = useRef<string | null>(null);

  function openJadwal() {
    setJadwalOpen(true);
  }

  function closeJadwal() {
    setJadwalOpen(false);
  }

  function openJadwalWithTracking() {
    if (!property) return;

    void trackEvent({
      event_name: "property_schedule_viewing_click",
      property_id: property.id,
      source_page: "property_detail",
      metadata: {
        button: "schedule_viewing",
        property_title: property.title,
        property_code: property.kodeListing ?? null,
        listing_type: property.jenisListing,
        posted_by_type: property.postedByType,
        area: property.area,
        province: property.province,
      },
    });

    openJadwal();
  }

  useEffect(() => {
    setIdx(0);
  }, [id]);

  useEffect(() => {
    let ignore = false;

    async function loadProperty() {
      if (!id) {
        if (!ignore) {
          setProperty(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      const [
        { data: propertyData, error: propertyError },
        { data: idRows, error: idsError },
      ] = await Promise.all([
        supabase
          .from("properties")
          .select(`
            *,
            property_images (
              image_url,
              sort_order,
              is_cover
            ),
            profiles:user_id (
              id,
              full_name,
              phone,
              role,
              agency,
              photo_url,
              email,
              instagram_url,
              facebook_url,
              tiktok_url,
              youtube_url,
              linkedin_url
            )
          `)
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("properties")
          .select(
            "id, created_at, status, is_paused, listing_expires_at, transaction_status"
          )
          .neq("status", "rejected")
          .order("created_at", { ascending: false }),
      ]);

      if (propertyError) {
        console.error("Failed to load property detail:", propertyError);
        if (!ignore) {
          setProperty(null);
          setLoading(false);
        }
        return;
      }

      if (idsError) {
        console.error("Failed to load property order:", idsError);
      }

      if (!propertyData) {
        if (!ignore) {
          setProperty(null);
          setOrderedIds(
            ((idRows ?? []) as Array<{
              id: string;
              status: string | null;
              is_paused: boolean | null;
              listing_expires_at: string | null;
              transaction_status: string | null;
            }>)
              .filter((row) =>
                isListingPublic({
                  status: row.status ?? "",
                  is_paused: row.is_paused,
                  listing_expires_at: row.listing_expires_at,
                  transaction_status: row.transaction_status,
                })
              )
              .map((x) => x.id)
          );
          setLoading(false);
        }
        return;
      }

      const row = propertyData as PropertyRow;

      if (!isListingPublic(row)) {
        if (!ignore) {
          setProperty(null);
          setOrderedIds(
            ((idRows ?? []) as Array<{
              id: string;
              status: string | null;
              is_paused: boolean | null;
              listing_expires_at: string | null;
              transaction_status: string | null;
            }>)
              .filter((item) =>
                isListingPublic({
                  status: item.status ?? "",
                  is_paused: item.is_paused,
                  listing_expires_at: item.listing_expires_at,
                  transaction_status: item.transaction_status,
                })
              )
              .map((x) => x.id)
          );
          setLoading(false);
        }
        return;
      }

      const profile = Array.isArray(row.profiles)
        ? row.profiles[0]
        : row.profiles;

      const sortedImages = [...(row.property_images ?? [])].sort((a, b) => {
        const coverA = a.is_cover ? 1 : 0;
        const coverB = b.is_cover ? 1 : 0;

        if (coverA !== coverB) return coverB - coverA;
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      });

      const images = sortedImages.length
        ? sortedImages.map((img) => img.image_url)
        : ["/placeholder-property.jpg"];

      const postedByType = normalizePostedByType(
        row.contact_role,
        row.source
      );

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

      const isVerified =
        row.verification_status === "verified" || Boolean(row.verified_ok);

      const bedroomsValue = toNumberOrNull(row.bedrooms);
      const bathroomsValue = toNumberOrNull(row.bathrooms ?? row.bathroom);
      const floorsValue = toNumberOrNull(
        row.floors ?? row.floor ?? row.floor_count
      );
      const parkingValue = toNumberOrNull(
        row.parking ?? row.parking_spaces ?? row.carport
      );

      const mapped: PropertyItem = {
        verifiedListing: isVerified,
        ownerApproved: postedByType === "owner" && isVerified,
        agentVerified: postedByType === "agent" && isVerified,

        id: row.id,
        jenisListing: row.listing_type === "disewa" ? "disewa" : "dijual",
        title: row.title ?? "-",
        price: formatIdr(row.price ?? 0),
        province: row.province ?? "-",
        area: row.city || row.area || "-",
        size: `${row.building_size ?? row.land_size ?? 0} m²`,
        bed: bedroomsValue
          ? `${bedroomsValue} ${
              lang === "id" ? "Kamar" : bedroomsValue > 1 ? "Beds" : "Bed"
            }`
          : "-",
        furnished: mapFurnishing(row.furnishing, lang),
        certificate: row.certificate ?? "-",
        description: row.description || "-",
        descriptionEn: row.description_en || "",
        facilities: row.facilities ?? {},
        nearby: row.nearby ?? {},
        agency:
          row.contact_agency ||
          profile?.agency ||
          (postedByType === "agent"
            ? "Tetamo Agent"
            : postedByType === "developer"
            ? "Developer"
            : "Owner"),
        agentName: row.contact_name || profile?.full_name || "Tetamo User",
        images,
        videoUrl: row.video_url ?? null,
        photo:
          profile?.photo_url ||
          "https://randomuser.me/api/portraits/men/32.jpg",

        kodeListing: row.kode ?? "-",
        postedDate: formatPostedDate(row.posted_date || row.created_at),

        verifiedOwnerStatus:
          postedByType === "owner" && isVerified ? "verified" : "pending",
        boosted,
        featured,
        spotlight,

        postedByType,
        receiverId: row.contact_user_id || row.user_id || "",
        receiverName: row.contact_name || profile?.full_name || "Tetamo User",
        receiverWhatsapp: normalizeWhatsapp(row.contact_phone),

        instagramUrl: profile?.instagram_url || "",
        facebookUrl: profile?.facebook_url || "",
        tiktokUrl: profile?.tiktok_url || "",
        youtubeUrl: profile?.youtube_url || "",
        linkedinUrl: profile?.linkedin_url || "",

        buildingSizeValue: toNumberOrNull(row.building_size),
        landSizeValue: toNumberOrNull(row.land_size),
        bedroomsValue,
        bathroomsValue,
        floorsValue,
        parkingValue,
        parkingAvailable: Boolean(row.facilities?.fac_parking),
        electricityValue: toStringOrEmpty(
          row.electricity ?? row.listrik ?? row.power_capacity
        ),
        waterValue: toStringOrEmpty(
          row.water_source ?? row.water ?? row.air
        ),
      };

      if (!ignore) {
        setProperty(mapped);
        setOrderedIds(
          ((idRows ?? []) as Array<{
            id: string;
            status: string | null;
            is_paused: boolean | null;
            listing_expires_at: string | null;
            transaction_status: string | null;
          }>)
            .filter((item) =>
              isListingPublic({
                status: item.status ?? "",
                is_paused: item.is_paused,
                listing_expires_at: item.listing_expires_at,
                transaction_status: item.transaction_status,
              })
            )
            .map((x) => x.id)
        );
        setLoading(false);
      }
    }

    loadProperty();

    return () => {
      ignore = true;
    };
  }, [id, lang]);

  useEffect(() => {
    if (!property?.id) return;
    if (trackedDetailViewRef.current === property.id) return;

    trackedDetailViewRef.current = property.id;

    void trackEvent({
      event_name: "property_detail_view",
      property_id: property.id,
      source_page: "property_detail",
      metadata: {
        property_title: property.title,
        property_code: property.kodeListing ?? null,
        listing_type: property.jenisListing,
        posted_by_type: property.postedByType,
        area: property.area,
        province: property.province,
      },
    });
  }, [
    property?.id,
    property?.title,
    property?.kodeListing,
    property?.jenisListing,
    property?.postedByType,
    property?.area,
    property?.province,
  ]);

  const propertyIndex = useMemo(
    () => orderedIds.findIndex((x) => x === id),
    [orderedIds, id]
  );

  const prevId = propertyIndex > 0 ? orderedIds[propertyIndex - 1] : null;
  const nextId =
    propertyIndex >= 0 && propertyIndex < orderedIds.length - 1
      ? orderedIds[propertyIndex + 1]
      : null;

  const nextImg = () =>
    property &&
    setIdx((prev) => (prev === property.images.length - 1 ? 0 : prev + 1));

  const prevImg = () =>
    property &&
    setIdx((prev) => (prev === 0 ? property.images.length - 1 : prev - 1));

  async function handleWhatsAppClick() {
    if (!property) return;

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
Kode: ${property.kodeListing ?? "-"}
Lokasi: ${property.area}, ${property.province}
Harga: ${property.price}

Apakah properti ini masih tersedia?`
        : `Hello ${property.receiverName}, I'm interested in this property on TETAMO.

Property: ${property.title}
Code: ${property.kodeListing ?? "-"}
Location: ${property.area}, ${property.province}
Price: ${property.price}

Is this property still available?`;

    const whatsappURL = `https://wa.me/${
      property.receiverWhatsapp
    }?text=${encodeURIComponent(message)}`;

    const popup = window.open("about:blank", "_blank");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await trackEvent({
        event_name: "property_whatsapp_click",
        property_id: property.id,
        user_id: user?.id ?? null,
        source_page: "property_detail",
        metadata: {
          button: "whatsapp",
          property_title: property.title,
          property_code: property.kodeListing ?? null,
          listing_type: property.jenisListing,
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

      if (user?.id) {
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
      }

      const leadPayload = {
        property_id: property.id,
        sender_user_id: user?.id || null,
        sender_name:
          senderProfile?.full_name ||
          (typeof user?.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : null),
        sender_email: senderProfile?.email || user?.email || null,
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
        console.error("WhatsApp lead insert error:", error);
      } else if (insertedLead?.id && user?.id) {
        await trackEvent({
          event_name: "lead_created",
          property_id: property.id,
          user_id: user.id,
          source_page: "property_detail",
          lead_id: String(insertedLead.id),
          metadata: {
            lead_type: "whatsapp",
            source: "whatsapp_button",
            property_title: property.title,
            property_code: property.kodeListing ?? null,
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
          console.error("Failed to notify WhatsApp inquiry:", notifyError);
        }
      }
    } catch (err) {
      console.error("Failed to create WhatsApp lead:", err);
    } finally {
      if (popup) {
        popup.location.href = whatsappURL;
      } else {
        window.location.href = whatsappURL;
      }
    }
  }

  async function handleViewingRequest() {
    if (!property || !selectedDate || !selectedTime) return;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      alert("Please log in first.");
      return;
    }

    const { data: senderProfile, error: senderProfileError } = await supabase
      .from("profiles")
      .select("full_name, phone, email")
      .eq("id", user.id)
      .maybeSingle();

    if (senderProfileError) {
      console.error("Failed to load sender profile:", senderProfileError);
    }

    const message =
      lang === "id"
        ? `Request viewing untuk ${property.title} pada ${selectedDate} jam ${selectedTime}`
        : `Viewing request for ${property.title} on ${selectedDate} at ${selectedTime}`;

    const leadPayload = {
      property_id: property.id,
      sender_user_id: user.id,
      sender_name:
        senderProfile?.full_name ||
        (typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : "Tetamo User"),
      sender_email: senderProfile?.email || user.email || null,
      sender_phone: senderProfile?.phone || null,

      receiver_user_id: property.receiverId || null,
      receiver_name: property.receiverName || null,
      receiver_role: property.postedByType || "owner",

      assigned_admin_user_id: null,
      admin_visible: true,

      lead_type: "viewing",
      source: "viewing_form",
      message,
      viewing_date: selectedDate,
      viewing_time: selectedTime,

      status: "new",
      priority: "normal",
      notes: null,
    };

    const { data: insertedLead, error } = await supabase
      .from("leads")
      .insert(leadPayload)
      .select("id")
      .single();

    if (error || !insertedLead?.id) {
      console.error("Viewing lead insert error:", error);
      alert(error?.message || "Failed to save viewing request.");
      return;
    }

    await trackEvent({
      event_name: "lead_created",
      property_id: property.id,
      user_id: user.id,
      source_page: "property_detail",
      lead_id: String(insertedLead.id),
      metadata: {
        lead_type: "viewing",
        source: "viewing_form",
        viewing_date: selectedDate,
        viewing_time: selectedTime,
        property_title: property.title,
        property_code: property.kodeListing ?? null,
      },
    });

    try {
      if (property.receiverId) {
        await createNotification({
          userId: property.receiverId,
          relatedUserId: user.id,
          propertyId: property.id,
          leadId: insertedLead.id,
          type: "new_viewing_request",
          title: "New viewing request",
          body:
            lang === "id"
              ? `Ada permintaan viewing untuk "${property.title}" pada ${selectedDate} jam ${selectedTime}.`
              : `There is a new viewing request for "${property.title}" on ${selectedDate} at ${selectedTime}.`,
          audience: "user",
          priority: "high",
        });
      }

      await notifyAdmins({
        relatedUserId: user.id,
        propertyId: property.id,
        leadId: insertedLead.id,
        type: "new_viewing_request",
        title: "New viewing request",
        body: `Viewing requested for "${property.title}" on ${selectedDate} at ${selectedTime}.`,
        priority: "high",
      });
    } catch (notifyError) {
      console.error("Failed to notify viewing request:", notifyError);
    }

    alert(
      lang === "id"
        ? "Jadwal viewing berhasil dikirim."
        : "Viewing request submitted."
    );

    setJadwalOpen(false);
    setSelectedDate("");
    setSelectedTime("");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white text-gray-900">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500">
            {lang === "id" ? "Memuat properti..." : "Loading property..."}
          </div>
        </div>
      </main>
    );
  }

  if (!property) {
    return (
      <main className="min-h-screen bg-white text-gray-900">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <h1 className="text-2xl font-bold">
            {lang === "id" ? "Properti tidak ditemukan" : "Property not found"}
          </h1>
          <Link
            href="/properti"
            className="mt-4 inline-block text-[#1C1C1E] underline"
          >
            {lang === "id" ? "Kembali ke Marketplace" : "Back to Marketplace"}
          </Link>
        </div>
      </main>
    );
  }

  const facilityLabels: Record<string, string> = {
    fac_ac: lang === "id" ? "AC" : "AC",
    fac_pool: lang === "id" ? "Kolam Renang" : "Swimming Pool",
    fac_gym: lang === "id" ? "Gym" : "Gym",
    fac_security: lang === "id" ? "Security 24 Jam" : "24-Hour Security",
    fac_cctv: "CCTV",
    fac_lift: lang === "id" ? "Lift" : "Lift",
    fac_parking: lang === "id" ? "Parkir" : "Parking",
    fac_garden: lang === "id" ? "Taman" : "Garden",
    fac_wifi: "WiFi",
  };

  const nearbyLabels: Record<string, string> = {
    near_toll: lang === "id" ? "Akses Tol" : "Toll Access",
    near_mall: "Mall",
    near_school: lang === "id" ? "Sekolah" : "School",
    near_hospital: lang === "id" ? "Rumah Sakit" : "Hospital",
    near_station: lang === "id" ? "Stasiun" : "Station",
    near_airport: lang === "id" ? "Bandara" : "Airport",
    near_market: lang === "id" ? "Pasar" : "Market",
    near_office: lang === "id" ? "Perkantoran" : "Office Area",
    near_beach: lang === "id" ? "Pantai" : "Beach",
  };

  const activeFacilities = Object.entries(property.facilities ?? {})
    .filter(([, value]) => Boolean(value))
    .map(([key]) => facilityLabels[key] ?? key);

  const activeNearby = Object.entries(property.nearby ?? {})
    .filter(([, value]) => Boolean(value))
    .map(([key]) => nearbyLabels[key] ?? key);

  const socialLinks = [
    {
      key: "instagram",
      href: normalizeExternalUrl(property.instagramUrl),
      icon: Instagram,
      label: "Instagram",
    },
    {
      key: "facebook",
      href: normalizeExternalUrl(property.facebookUrl),
      icon: Facebook,
      label: "Facebook",
    },
    {
      key: "tiktok",
      href: normalizeExternalUrl(property.tiktokUrl),
      icon: Music2,
      label: "TikTok",
    },
    {
      key: "youtube",
      href: normalizeExternalUrl(property.youtubeUrl),
      icon: Youtube,
      label: "YouTube",
    },
    {
      key: "linkedin",
      href: normalizeExternalUrl(property.linkedinUrl),
      icon: Linkedin,
      label: "LinkedIn",
    },
  ].filter((item) => item.href);

  const summaryItems = [
    property.buildingSizeValue
      ? `${formatNumber(property.buildingSizeValue)} m²`
      : "",
    property.bedroomsValue
      ? `${formatNumber(property.bedroomsValue)} ${
          lang === "id"
            ? "Kamar"
            : property.bedroomsValue > 1
            ? "Beds"
            : "Bed"
        }`
      : "",
    property.bathroomsValue
      ? `${formatNumber(property.bathroomsValue)} ${
          lang === "id"
            ? "K. Mandi"
            : property.bathroomsValue > 1
            ? "Baths"
            : "Bath"
        }`
      : "",
    property.furnished !== "-" ? property.furnished : "",
    property.jenisListing === "dijual" && property.certificate !== "-"
      ? property.certificate
      : "",
  ].filter(Boolean);

  const detailSpecs: DetailSpecItem[] = (() => {
    const items: DetailSpecItem[] = [];
    const isSale = property.jenisListing === "dijual";

    const addItem = (
      key: string,
      label: string,
      value: string,
      icon: any
    ) => {
      const cleaned = value.trim();
      if (!cleaned || cleaned === "-") return;
      items.push({ key, label, value: cleaned, icon });
    };

    addItem(
      "bedrooms",
      lang === "id" ? "Kamar Tidur" : "Bedrooms",
      property.bedroomsValue ? formatNumber(property.bedroomsValue) : "",
      BedDouble
    );

    addItem(
      "bathrooms",
      lang === "id" ? "Kamar Mandi" : "Bathrooms",
      property.bathroomsValue ? formatNumber(property.bathroomsValue) : "",
      Bath
    );

    addItem(
      "floors",
      lang === "id" ? "Lantai" : "Floors",
      property.floorsValue ? formatNumber(property.floorsValue) : "",
      Layers3
    );

    addItem(
      "parking",
      lang === "id" ? "Parkir" : "Parking",
      property.parkingValue
        ? `${formatNumber(property.parkingValue)} ${
            lang === "id"
              ? "Slot"
              : property.parkingValue > 1
              ? "Slots"
              : "Slot"
          }`
        : property.parkingAvailable
        ? lang === "id"
          ? "Tersedia"
          : "Available"
        : "",
      CarFront
    );

    addItem(
      "electricity",
      lang === "id" ? "Listrik" : "Electricity",
      property.electricityValue,
      Zap
    );

    addItem(
      "water",
      lang === "id" ? "Air" : "Water",
      property.waterValue,
      Droplets
    );

    addItem(
      "building_size",
      lang === "id" ? "Luas Bangunan" : "Building Size",
      property.buildingSizeValue
        ? `${formatNumber(property.buildingSizeValue)} m²`
        : "",
      Ruler
    );

    if (isSale) {
      addItem(
        "land_size",
        lang === "id" ? "Luas Tanah" : "Land Size",
        property.landSizeValue
          ? `${formatNumber(property.landSizeValue)} m²`
          : "",
        Square
      );
    }

    addItem(
      "furnishing",
      lang === "id" ? "Furnishing" : "Furnishing",
      property.furnished !== "-" ? property.furnished : "",
      Home
    );

    if (isSale) {
      addItem(
        "certificate",
        lang === "id" ? "Sertifikat" : "Certificate",
        property.certificate !== "-" ? property.certificate : "",
        FileText
      );
    }

    return items;
  })();

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/properti"
            className="text-sm underline text-[#1C1C1E] hover:opacity-80"
          >
            {lang === "id" ? "Kembali ke Marketplace" : "Back to Marketplace"}
          </Link>

          <div className="flex items-center gap-2">
            {prevId ? (
              <Link
                href={`/properti/${prevId}`}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold transition hover:bg-gray-50"
              >
                ← {lang === "id" ? "Sebelumnya" : "Previous"}
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold opacity-40"
              >
                ← {lang === "id" ? "Sebelumnya" : "Previous"}
              </button>
            )}

            {nextId ? (
              <Link
                href={`/properti/${nextId}`}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold transition hover:bg-gray-50"
              >
                {lang === "id" ? "Berikutnya" : "Next"} →
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold opacity-40"
              >
                {lang === "id" ? "Berikutnya" : "Next"} →
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 grid items-start gap-10 lg:grid-cols-2">
          <div className="w-full space-y-6">
            <div className="relative overflow-hidden rounded-2xl border border-gray-200">
              <img
                src={property.images[idx]}
                alt={property.title}
                className="h-[560px] w-full object-cover"
              />

              <div className="absolute right-4 top-4 rounded-full bg-[#1C1C1E]/85 px-3 py-1 text-xs font-semibold text-white">
                TETAMO
              </div>

              <div className="absolute bottom-4 left-4 rounded-full border border-gray-200 bg-white/90 px-3 py-1 text-xs font-semibold text-[#1C1C1E]">
                {property.jenisListing === "dijual"
                  ? lang === "id"
                    ? "Dijual"
                    : "For Sale"
                  : lang === "id"
                  ? "Disewa"
                  : "For Rent"}
              </div>

              <button
                type="button"
                onClick={prevImg}
                className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#1C1C1E]/70 text-white"
                aria-label="Previous image"
              >
                ‹
              </button>

              <button
                type="button"
                onClick={nextImg}
                className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#1C1C1E]/70 text-white"
                aria-label="Next image"
              >
                ›
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-10 shadow-sm">
            <div className="text-3xl font-extrabold text-[#1C1C1E]">
              {property.price}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {property.spotlight && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  <Gem className="h-3.5 w-3.5" />
                  Spotlight
                </span>
              )}

              {property.featured && (
                <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                  <Crown className="h-3.5 w-3.5" />
                  Featured
                </span>
              )}

              {property.boosted && (
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                  <Zap className="h-3.5 w-3.5" />
                  Boost
                </span>
              )}

              {property.verifiedListing && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#1C1C1E] px-3 py-1 text-xs font-semibold text-white">
                  {lang === "id" ? "Listing Terverifikasi" : "Verified Listing"}
                </span>
              )}

              {property.ownerApproved && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#1C1C1E]/20 bg-white px-3 py-1 text-xs font-semibold text-[#1C1C1E]">
                  {lang === "id" ? "Pemilik Disetujui" : "Owner Approved"}
                </span>
              )}

              {property.agentVerified && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#1C1C1E]/20 bg-white px-3 py-1 text-xs font-semibold text-[#1C1C1E]">
                  {lang === "id" ? "Agen Terverifikasi" : "Verified Agent"}
                </span>
              )}
            </div>

            <h1 className="mt-6 text-xl font-bold text-[#1C1C1E]">
              {property.title}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-800">
              {summaryItems.map((item, summaryIndex) => (
                <div
                  key={`${item}-${summaryIndex}`}
                  className="flex items-center gap-2"
                >
                  {summaryIndex > 0 && (
                    <span className="font-semibold text-[#1C1C1E]">•</span>
                  )}
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 text-gray-600">{property.province}</div>

            <div className="mt-6 border-t border-gray-200" />

            <div className="mt-4 flex items-start gap-6">
              <div className="h-24 w-24 overflow-hidden rounded-xl border border-gray-200 bg-gray-200">
                <img
                  src={property.photo}
                  alt={property.agentName}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm text-gray-600">
                  <span className="text-gray-500">
                    {lang === "id"
                      ? property.postedByType === "owner"
                        ? "Pemilik :"
                        : property.postedByType === "developer"
                        ? "Developer :"
                        : "Agen :"
                      : property.postedByType === "owner"
                      ? "Owner :"
                      : property.postedByType === "developer"
                      ? "Developer :"
                      : "Agent :"}
                  </span>{" "}
                  <span className="font-semibold text-[#1C1C1E]">
                    {property.agentName}
                  </span>
                  {property.agency && (
                    <>
                      <span className="mx-2 text-gray-700">•</span>
                      <span className="text-gray-600">{property.agency}</span>
                    </>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-10">
                  <div className="text-sm font-semibold text-gray-800">
                    {lang === "id" ? "Kode :" : "Code :"}
                  </div>
                  <div className="text-sm font-semibold text-gray-800">
                    {lang === "id" ? "Tanggal :" : "Date :"}
                  </div>

                  <div className="text-sm text-gray-700">
                    {property.kodeListing}
                  </div>
                  <div className="text-sm text-gray-700">
                    {property.postedDate}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={openJadwalWithTracking}
                className="w-full rounded-2xl bg-[#B8860B] py-3 text-center font-semibold text-white transition hover:opacity-90"
              >
                {lang === "id" ? "Jadwal Viewing" : "Schedule Viewing"}
              </button>
            </div>

            {socialLinks.length > 0 ? (
              <div className="mt-4 flex items-center justify-center gap-3">
                {socialLinks.map((item) => {
                  const Icon = item.icon;

                  return (
                    <a
                      key={item.key}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={item.label}
                      title={item.label}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-[#1C1C1E] transition hover:bg-gray-50"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#1C1C1E]">
            {lang === "id" ? "Detail Properti" : "Property Details"}
          </h2>

          {detailSpecs.length > 0 ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {detailSpecs.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.key}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-white p-2 text-[#1C1C1E] shadow-sm">
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {item.label}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-[#1C1C1E]">
                          {item.value}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-500">
              {lang === "id"
                ? "Belum ada detail properti yang ditampilkan."
                : "No property details to display yet."}
            </p>
          )}
        </div>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-bold text-[#1C1C1E]">
              {lang === "id" ? "Deskripsi Properti" : "Property Description"}
            </h2>

            <p className="mt-3 whitespace-pre-line leading-relaxed text-gray-600">
              {lang === "en"
                ? property.descriptionEn || property.description
                : property.description}
            </p>
          </div>

          <div className="mt-1 flex justify-center">
            <div className="h-[620px] w-[350px] overflow-hidden rounded-2xl border border-gray-200 bg-black">
              {property.videoUrl ? (
                <video
                  src={property.videoUrl}
                  controls
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-100 text-sm text-gray-500">
                  {lang === "id" ? "Belum ada video." : "No video yet."}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#1C1C1E]">
              {lang === "id" ? "Fasilitas" : "Facilities"}
            </h2>

            {activeFacilities.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {activeFacilities.map((item) => (
                  <span
                    key={item}
                    className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-[#1C1C1E]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">
                {lang === "id"
                  ? "Belum ada data fasilitas."
                  : "No facilities data yet."}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#1C1C1E]">
              {lang === "id" ? "Terdekat" : "Nearby"}
            </h2>

            {activeNearby.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {activeNearby.map((item) => (
                  <span
                    key={item}
                    className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-[#1C1C1E]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">
                {lang === "id"
                  ? "Belum ada data lokasi terdekat."
                  : "No nearby data yet."}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleWhatsAppClick}
            className="w-full rounded-2xl bg-[#1C1C1E] py-3 text-center font-semibold text-white transition hover:opacity-90"
          >
            WhatsApp
          </button>

          <button
            type="button"
            onClick={openJadwalWithTracking}
            className="rounded-2xl bg-yellow-600 py-3 text-center font-bold text-white transition hover:bg-yellow-700"
          >
            {lang === "id" ? "Jadwal Viewing" : "Schedule Viewing"}
          </button>
        </div>

        <div className="mt-6">
          <MortgageCalculator
            price={property.price}
            jenisListing={property.jenisListing}
          />
        </div>

        {jadwalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <button
              type="button"
              onClick={closeJadwal}
              className="absolute inset-0 bg-black/50"
              aria-label="Close Jadwal popup"
            />

            <div className="relative z-10 w-[92%] max-w-lg rounded-2xl bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#1C1C1E]">
                  {lang === "id" ? "Jadwal Viewing" : "Schedule Viewing"}
                </h3>

                <button
                  type="button"
                  onClick={closeJadwal}
                  className="rounded-full px-3 py-1 text-sm font-semibold text-[#1C1C1E] hover:bg-gray-100"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-3">
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

                  <div className="mt-4">
                    <button
                      type="button"
                      disabled={!selectedDate || !selectedTime}
                      onClick={handleViewingRequest}
                      className="w-full rounded-2xl bg-yellow-600 py-2 font-bold text-white transition hover:bg-yellow-700 disabled:opacity-40"
                    >
                      {lang === "id" ? "Kirim Jadwal" : "Submit Schedule"}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeJadwal}
                  className="mt-1 w-full rounded-2xl bg-[#1C1C1E] py-2 font-semibold text-white hover:opacity-90"
                >
                  {lang === "id" ? "Tutup" : "Close"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}