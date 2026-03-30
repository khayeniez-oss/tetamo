import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

const admin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "cancelled"
  | "refunded";

type PaymentMetadata = {
  action?: string | null;
  selectedPlan?: string | null;
  existingPropertyId?: string | null;
  existingPropertyCode?: string | null;
  existingPropertyTitle?: string | null;
  listingType?: string | null;
  draftSnapshot?: string | null;
  productDurationDays?: number | string | null;
  featuredDurationDays?: number | string | null;
};

type PaymentDbRow = {
  id: string;
  user_id: string;
  user_type: string | null;
  flow: string | null;
  product_id: string | null;
  product_type: string | null;
  listing_code: string | null;
  status: PaymentStatus | null;
  metadata: PaymentMetadata | string | null;
  raw_response: Record<string, any> | null;
};

type PropertyLookupRow = {
  id: string;
  user_id: string;
  kode: string | null;
  title: string | null;
  listing_expires_at: string | null;
  featured_expires_at: string | null;
  boost_expires_at: string | null;
  spotlight_expires_at: string | null;
};

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function parseMetadata(value: PaymentDbRow["metadata"]): PaymentMetadata {
  if (!value) return {};

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as PaymentMetadata;
    } catch {
      return {};
    }
  }

  return value as PaymentMetadata;
}

function parseDraftSnapshot(value?: string | null) {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toPositiveNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

function extendExpiryIso(currentValue: string | null | undefined, days: number) {
  const now = new Date();
  let base = now;

  if (currentValue) {
    const currentDate = new Date(currentValue);
    if (
      !Number.isNaN(currentDate.getTime()) &&
      currentDate.getTime() > now.getTime()
    ) {
      base = currentDate;
    }
  }

  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

function getDataUrlMime(dataUrl: string) {
  const match = dataUrl.match(/^data:(.*?);base64,/);
  return match?.[1] || "image/jpeg";
}

function getFileExtensionFromDataUrl(dataUrl: string) {
  if (dataUrl.startsWith("data:image/png")) return "png";
  if (dataUrl.startsWith("data:image/webp")) return "webp";
  if (dataUrl.startsWith("data:image/gif")) return "gif";
  return "jpg";
}

function dataUrlToBuffer(dataUrl: string): Buffer | null {
  try {
    const parts = dataUrl.split(",");
    if (parts.length < 2) return null;
    return Buffer.from(parts[1], "base64");
  } catch {
    return null;
  }
}

async function getPaymentRecord(
  paymentId: string,
  gatewayReference: string
): Promise<PaymentDbRow | null> {
  if (!admin) {
    throw new Error("Supabase admin client is not configured.");
  }

  if (paymentId) {
    const { data, error } = await admin
      .from("payments")
      .select(
        "id, user_id, user_type, flow, product_id, product_type, listing_code, status, metadata, raw_response"
      )
      .eq("id", paymentId)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as PaymentDbRow;
  }

  if (gatewayReference) {
    const { data, error } = await admin
      .from("payments")
      .select(
        "id, user_id, user_type, flow, product_id, product_type, listing_code, status, metadata, raw_response"
      )
      .eq("gateway_reference", gatewayReference)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as PaymentDbRow;
  }

  return null;
}

async function updatePaymentById(
  paymentId: string,
  values: Record<string, any>
) {
  if (!admin) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { error } = await admin.from("payments").update(values).eq("id", paymentId);

  if (error) throw error;
}

async function findPropertyForActivation(
  userId: string,
  metadata: PaymentMetadata,
  listingCode?: string | null
): Promise<PropertyLookupRow | null> {
  if (!admin) {
    throw new Error("Supabase admin client is not configured.");
  }

  const existingPropertyId = String(metadata.existingPropertyId || "").trim();
  if (existingPropertyId) {
    const { data, error } = await admin
      .from("properties")
      .select(
        "id, user_id, kode, title, listing_expires_at, featured_expires_at, boost_expires_at, spotlight_expires_at"
      )
      .eq("id", existingPropertyId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as PropertyLookupRow;
  }

  const finalListingCode = String(listingCode || metadata.existingPropertyCode || "").trim();
  if (finalListingCode) {
    const { data, error } = await admin
      .from("properties")
      .select(
        "id, user_id, kode, title, listing_expires_at, featured_expires_at, boost_expires_at, spotlight_expires_at"
      )
      .eq("user_id", userId)
      .eq("kode", finalListingCode)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as PropertyLookupRow;
  }

  return null;
}

async function uploadDraftPhotoIfNeeded(
  userId: string,
  propertyId: string,
  photo: string,
  index: number
) {
  if (!admin) {
    throw new Error("Supabase admin client is not configured.");
  }

  if (!photo) return null;

  if (!photo.startsWith("data:image/")) {
    return photo;
  }

  const fileBuffer = dataUrlToBuffer(photo);
  if (!fileBuffer) return null;

  const ext = getFileExtensionFromDataUrl(photo);
  const mime = getDataUrlMime(photo);
  const filePath = `public/${userId}/${propertyId}/${Date.now()}-${index}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from("property-images")
    .upload(filePath, fileBuffer, {
      contentType: mime,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("property-images").getPublicUrl(filePath);

  return publicUrl;
}

async function insertPropertyImagesFromDraft(
  userId: string,
  propertyId: string,
  draft: any
) {
  if (!admin) {
    throw new Error("Supabase admin client is not configured.");
  }

  const photoList: string[] = Array.isArray(draft?.photos) ? draft.photos : [];
  if (photoList.length === 0) return;

  const coverIndex =
    typeof draft?.coverIndex === "number" ? draft.coverIndex : 0;

  const imageRows: Array<{
    property_id: string;
    image_url: string;
    sort_order: number;
    is_cover: boolean;
  }> = [];

  for (let i = 0; i < photoList.length; i++) {
    const photo = photoList[i];
    if (!photo || typeof photo !== "string") continue;

    const finalUrl = await uploadDraftPhotoIfNeeded(userId, propertyId, photo, i);
    if (!finalUrl) continue;

    imageRows.push({
      property_id: propertyId,
      image_url: finalUrl,
      sort_order: i,
      is_cover: i === coverIndex,
    });
  }

  if (imageRows.length === 0) return;

  const { error } = await admin.from("property_images").insert(imageRows);
  if (error) throw error;
}

async function activateNewListing(payment: PaymentDbRow, metadata: PaymentMetadata) {
  if (!admin) {
    throw new Error("Supabase admin client is not configured.");
  }

  const existing = await findPropertyForActivation(
    payment.user_id,
    metadata,
    payment.listing_code
  );

  if (existing?.id) {
    return {
      activatedPropertyId: existing.id,
      activatedListingCode: existing.kode || payment.listing_code || "",
      activationType: "new-listing",
      skippedBecauseAlreadyExists: true,
    };
  }

  const draft = parseDraftSnapshot(metadata.draftSnapshot);
  if (!draft) {
    throw new Error("Draft snapshot tidak ditemukan untuk aktivasi listing baru.");
  }

  const verification = asObject(draft?.verification);
  const listingDurationDays = toPositiveNumber(metadata.productDurationDays, 30);
  const featuredDurationDays = toPositiveNumber(metadata.featuredDurationDays, 0);

  const listingExpiresAt = extendExpiryIso(null, listingDurationDays);
  const featuredExpiresAt =
    featuredDurationDays > 0 ? extendExpiryIso(null, featuredDurationDays) : null;

  const finalKode =
    String(payment.listing_code || draft?.kode || "").trim() || null;

  const propertyPayload = {
    user_id: payment.user_id,

    title: draft?.title ?? "",
    listing_type: draft?.listingType ?? null,
    property_type: draft?.propertyType ?? null,
    price: draft?.price ? Number(draft.price) : null,
    description: draft?.description ?? "",

    status: "pending",

    country: "Indonesia",
    province: draft?.province ?? null,
    city: draft?.city ?? null,
    area: draft?.city ?? null,
    address: draft?.address ?? null,
    housing_name: draft?.housingName ?? null,
    custom_housing: draft?.customHousing ?? null,
    location_note: draft?.note ?? null,

    bedrooms: draft?.bed ? Number(draft.bed) : null,
    bathrooms: draft?.bath ? Number(draft.bath) : null,
    maid_room: draft?.maid ? Number(draft.maid) : null,
    garage: draft?.garage ? Number(draft.garage) : null,
    floor: draft?.floor ? Number(draft.floor) : null,
    building_size: draft?.lb ? Number(draft.lb) : null,
    land_size: draft?.lt ? Number(draft.lt) : null,

    furnishing: draft?.furnishing ?? null,
    electricity: draft?.listrik ?? null,
    water_type: draft?.jenisAir ?? null,

    certificate: draft?.sertifikat ?? null,
    ownership_type: draft?.jenisKepemilikan ?? null,
    land_type: draft?.jenisTanah ?? null,
    zoning_type: draft?.jenisZoning ?? null,

    kode: finalKode,
    posted_date:
      draft?.postedDate || new Date().toISOString().slice(0, 10),
    plan_id: metadata.selectedPlan ?? payment.product_id ?? null,
    source: draft?.source ?? "owner",
    rental_type: draft?.rentalType ?? null,

    facilities: draft?.fasilitas ?? null,
    nearby: draft?.nearby ?? null,

    cover_index:
      typeof draft?.coverIndex === "number" ? draft.coverIndex : 0,
    video_url: draft?.video ?? null,

    relationship: verification.relationship ?? null,
    other_relationship: verification.otherRelationship ?? null,
    sell_mode: verification.sellMode ?? null,
    need_agent_recommendation: verification.needAgentRecommendation ?? null,
    need_transaction_support: verification.needTransactionSupport ?? null,
    verification_note: verification.note ?? null,
    ownership_pdf_name: verification.ownershipPdfName ?? null,
    authorization_pdf_name: verification.authorizationPdfName ?? null,
    verification_status: verification.status ?? "pending_verification",
    verification_data: verification,

    verified_ok: true,

    listing_expires_at: listingExpiresAt,
    featured_expires_at: featuredExpiresAt,
    boost_active: false,
    boost_expires_at: null,
    spotlight_active: false,
    spotlight_expires_at: null,
  };

  const { data: insertedProperty, error: propertyError } = await admin
    .from("properties")
    .insert(propertyPayload)
    .select("id, kode")
    .single();

  if (propertyError || !insertedProperty?.id) {
    throw new Error(propertyError?.message || "Failed to create property.");
  }

  await insertPropertyImagesFromDraft(payment.user_id, insertedProperty.id, draft);

  return {
    activatedPropertyId: insertedProperty.id,
    activatedListingCode:
      insertedProperty.kode || payment.listing_code || finalKode || "",
    activationType: "new-listing",
    skippedBecauseAlreadyExists: false,
  };
}

async function activateRenewListing(payment: PaymentDbRow, metadata: PaymentMetadata) {
  if (!admin) {
    throw new Error("Supabase admin client is not configured.");
  }

  const targetProperty = await findPropertyForActivation(
    payment.user_id,
    metadata,
    payment.listing_code
  );

  if (!targetProperty?.id) {
    throw new Error("Property target untuk renew tidak ditemukan.");
  }

  const listingDurationDays = toPositiveNumber(metadata.productDurationDays, 30);
  const featuredDurationDays = toPositiveNumber(metadata.featuredDurationDays, 0);

  const nextListingExpiresAt = extendExpiryIso(
    targetProperty.listing_expires_at,
    listingDurationDays
  );

  const nextFeaturedExpiresAt =
    featuredDurationDays > 0
      ? extendExpiryIso(targetProperty.featured_expires_at, featuredDurationDays)
      : null;

  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
    posted_date: new Date().toISOString().slice(0, 10),
    listing_expires_at: nextListingExpiresAt,
  };

  if (metadata.selectedPlan) {
    updatePayload.plan_id = metadata.selectedPlan;
  }

  if (featuredDurationDays > 0) {
    updatePayload.featured_expires_at = nextFeaturedExpiresAt;
  }

  const { error } = await admin
    .from("properties")
    .update(updatePayload)
    .eq("id", targetProperty.id)
    .eq("user_id", payment.user_id);

  if (error) throw error;

  return {
    activatedPropertyId: targetProperty.id,
    activatedListingCode: targetProperty.kode || payment.listing_code || "",
    activationType: "renew-listing",
  };
}

async function activateAddon(payment: PaymentDbRow, metadata: PaymentMetadata) {
  if (!admin) {
    throw new Error("Supabase admin client is not configured.");
  }

  const targetProperty = await findPropertyForActivation(
    payment.user_id,
    metadata,
    payment.listing_code
  );

  if (!targetProperty?.id) {
    throw new Error("Property target untuk add-on tidak ditemukan.");
  }

  const addonDurationDays = toPositiveNumber(metadata.productDurationDays, 14);
  const productId = String(payment.product_id || "").toLowerCase();

  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  let activationType = "addon";

  if (productId === "homepage-spotlight") {
    updatePayload.spotlight_active = true;
    updatePayload.spotlight_expires_at = extendExpiryIso(
      targetProperty.spotlight_expires_at,
      addonDurationDays
    );
    activationType = "homepage-spotlight";
  } else {
    updatePayload.boost_active = true;
    updatePayload.boost_expires_at = extendExpiryIso(
      targetProperty.boost_expires_at,
      addonDurationDays
    );
    activationType = "boost-listing";
  }

  const { error } = await admin
    .from("properties")
    .update(updatePayload)
    .eq("id", targetProperty.id)
    .eq("user_id", payment.user_id);

  if (error) throw error;

  return {
    activatedPropertyId: targetProperty.id,
    activatedListingCode: targetProperty.kode || payment.listing_code || "",
    activationType,
  };
}

async function activateAfterPayment(payment: PaymentDbRow) {
  const metadata = parseMetadata(payment.metadata);
  const flow = String(payment.flow || "").toLowerCase();

  if (flow === "new-listing") {
    return activateNewListing(payment, metadata);
  }

  if (flow === "renew-listing") {
    return activateRenewListing(payment, metadata);
  }

  if (flow === "boost-listing" || flow === "homepage-spotlight") {
    return activateAddon(payment, metadata);
  }

  if (flow === "agent-membership") {
    return {
      activatedPropertyId: null,
      activatedListingCode: payment.listing_code || "",
      activationType: "agent-membership",
      skippedBecauseNoMembershipSchema: true,
    };
  }

  return {
    activatedPropertyId: null,
    activatedListingCode: payment.listing_code || "",
    activationType: flow || "unknown",
    skippedBecauseUnknownFlow: true,
  };
}

export async function POST(req: Request) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { message: "Stripe is not configured." },
        { status: 500 }
      );
    }

    if (!admin) {
      return NextResponse.json(
        { message: "Supabase admin is not configured." },
        { status: 500 }
      );
    }

    if (!stripeWebhookSecret) {
      return NextResponse.json(
        { message: "STRIPE_WEBHOOK_SECRET is missing." },
        { status: 500 }
      );
    }

    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { message: "Missing Stripe signature." },
        { status: 400 }
      );
    }

    const body = await req.text();

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      stripeWebhookSecret
    );

    console.log("Stripe webhook event:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentId = session.metadata?.paymentId || "";
      const nowIso = new Date().toISOString();

      const payment = await getPaymentRecord(paymentId, session.id);

      if (!payment) {
        throw new Error("Payment record not found for completed checkout.");
      }

      const existingRawResponse = asObject(payment.raw_response);
      const activationDone = Boolean(existingRawResponse?.activation?.done);

      await updatePaymentById(payment.id, {
        status: "paid",
        paid_at: nowIso,
        updated_at: nowIso,

        gateway: "stripe",
        gateway_reference: session.id,
        provider: "stripe",
        reference: session.id,

        raw_response: {
          ...existingRawResponse,
          stage: "webhook_checkout_completed",
          eventType: event.type,
          eventId: event.id,
          sessionId: session.id,
          paymentStatus: session.payment_status,
          metadata: session.metadata ?? {},
        },
      });

      if (!activationDone) {
        const activationResult = await activateAfterPayment(payment);

        await updatePaymentById(payment.id, {
          updated_at: new Date().toISOString(),
          raw_response: {
            ...existingRawResponse,
            stage: "webhook_checkout_completed",
            eventType: event.type,
            eventId: event.id,
            sessionId: session.id,
            paymentStatus: session.payment_status,
            metadata: session.metadata ?? {},
            activation: {
              done: true,
              processedAt: new Date().toISOString(),
              ...activationResult,
            },
          },
        });

        console.log("Payment activated:", {
          paymentId: payment.id,
          sessionId: session.id,
          activationResult,
        });
      } else {
        console.log("Activation already done, skipping duplicate webhook:", {
          paymentId: payment.id,
          sessionId: session.id,
        });
      }
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentId = session.metadata?.paymentId || "";
      const payment = await getPaymentRecord(paymentId, session.id);

      if (!payment) {
        throw new Error("Payment record not found for expired checkout.");
      }

      const existingRawResponse = asObject(payment.raw_response);
      const nowIso = new Date().toISOString();

      await updatePaymentById(payment.id, {
        status: "expired",
        updated_at: nowIso,
        expires_at: session.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : nowIso,
        gateway: "stripe",
        gateway_reference: session.id,
        provider: "stripe",
        reference: session.id,
        raw_response: {
          ...existingRawResponse,
          stage: "webhook_checkout_expired",
          eventType: event.type,
          eventId: event.id,
          sessionId: session.id,
          metadata: session.metadata ?? {},
        },
      });

      console.log("Payment marked as expired:", {
        paymentId: payment.id,
        sessionId: session.id,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error);

    return NextResponse.json(
      {
        message: error?.message || "Webhook error",
      },
      { status: 400 }
    );
  }
}