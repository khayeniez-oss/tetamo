import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hitpayWebhookSalt = process.env.HITPAY_WEBHOOK_SALT || "";

const hitpayMode = String(process.env.HITPAY_MODE || "live").toLowerCase();

const admin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

const OWNER_LISTING_FALLBACK_DAYS = 365;
const ADDON_FALLBACK_DAYS = 14;
const EDUCATION_FALLBACK_DAYS = 90;

type PaymentTransactionRow = {
  id: string;
  user_id: string | null;
  property_id: string | null;
  source_role: string | null;
  payment_type: string | null;
  product_id: string | null;
  product_name_snapshot: string | null;
  product_type: string | null;
  audience_snapshot: string | null;
  duration_days: number | null;
  status: string | null;
  currency: string | null;
  amount_subtotal: number | null;
  amount_total: number | null;
  property_title_snapshot: string | null;
  property_code_snapshot: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  paid_at: string | null;
  checkout_url?: string | null;
  metadata: Record<string, unknown> | null;
};

type PropertyLookupRow = {
  id: string;
  user_id: string | null;
  kode: string | null;
  title: string | null;
  listing_expires_at: string | null;
  featured_expires_at: string | null;
  boost_expires_at: string | null;
  spotlight_expires_at: string | null;
  status: string | null;
  verification_status: string | null;
};

type VehicleType = "car" | "motor";

type HitPayWebhookStatus =
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "cancelled"
  | "refunded";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function getString(obj: Record<string, any>, key: string): string | null {
  const value = obj?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getNumber(obj: Record<string, any>, key: string): number | null {
  const value = obj?.[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPositiveNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

function nullableText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined) return null;

  const raw = String(value).replace(/[^\d.]/g, "");
  if (!raw) return null;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableInteger(value: unknown) {
  if (value === null || value === undefined) return null;

  const raw = String(value).replace(/[^\d]/g, "");
  if (!raw) return null;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDraftSnapshot(value?: string | null) {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
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
  next.setUTCDate(next.getUTCDate() + days);

  return next.toISOString();
}

function addDaysIso(baseIso: string, days: number) {
  const base = new Date(baseIso);
  base.setUTCDate(base.getUTCDate() + days);

  return base.toISOString();
}

function normalizeVehicleType(value: unknown): VehicleType | null {
  const v = String(value || "").toLowerCase();

  if (v === "car") return "car";
  if (v === "motor") return "motor";

  return null;
}

function getVehicleTypeFromMetadata(
  metadata: Record<string, any>
): VehicleType | null {
  return (
    normalizeVehicleType(metadata?.vehicleType) ||
    normalizeVehicleType(metadata?.vehicle_type) ||
    normalizeVehicleType(metadata?.type) ||
    null
  );
}

function isVehicleListingPayment(
  payment: PaymentTransactionRow,
  metadata: Record<string, any>
) {
  const paymentType = String(payment.payment_type || "").toLowerCase();

  if (paymentType !== "listing_fee" && paymentType !== "featured") {
    return false;
  }

  return Boolean(getVehicleTypeFromMetadata(metadata));
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

function normalizeSignature(value: string | null) {
  return String(value || "")
    .trim()
    .replace(/^sha256=/i, "")
    .toLowerCase();
}

function timingSafeCompare(a: string, b: string) {
  if (!a || !b) return false;

  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) return false;

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function verifyHitPaySignature(rawBody: string, signature: string | null) {
  if (!hitpayWebhookSalt) {
    throw new Error("HITPAY_WEBHOOK_SALT is missing.");
  }

  const incomingSignature = normalizeSignature(signature);

  if (!incomingSignature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", hitpayWebhookSalt)
    .update(rawBody, "utf8")
    .digest("hex")
    .toLowerCase();

  return timingSafeCompare(incomingSignature, expectedSignature);
}

function getPrimaryPayment(payload: Record<string, any>) {
  const payments = Array.isArray(payload.payments) ? payload.payments : [];
  return asObject(payments[0]);
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return null;
}

function extractPaymentTransactionId(payload: Record<string, any>) {
  const metadata = asObject(payload.metadata);
  const primaryPayment = getPrimaryPayment(payload);

  return firstText(
    metadata.payment_transaction_id,
    metadata.paymentTransactionId,
    payload.payment_transaction_id,
    payload.paymentTransactionId,
    payload.reference_number,
    payload.referenceNumber,
    primaryPayment.reference_number,
    primaryPayment.referenceNumber
  );
}

function extractHitPayPaymentRequestId(payload: Record<string, any>) {
  const metadata = asObject(payload.metadata);

  return firstText(
    payload.id,
    payload.payment_request_id,
    payload.paymentRequestId,
    metadata.hitpay_payment_request_id,
    metadata.payment_request_id
  );
}

function extractHitPayPaymentId(payload: Record<string, any>) {
  const primaryPayment = getPrimaryPayment(payload);

  return firstText(
    primaryPayment.id,
    payload.payment_id,
    payload.paymentId,
    payload.charge_id,
    payload.chargeId
  );
}

function extractHitPayReferenceNumber(payload: Record<string, any>) {
  const primaryPayment = getPrimaryPayment(payload);

  return firstText(
    payload.reference_number,
    payload.referenceNumber,
    primaryPayment.reference_number,
    primaryPayment.referenceNumber
  );
}

function extractHitPayAmount(payload: Record<string, any>) {
  const primaryPayment = getPrimaryPayment(payload);

  return firstNumber(
    primaryPayment.amount,
    payload.amount,
    payload.amount_total,
    payload.total
  );
}

function extractHitPayCurrency(payload: Record<string, any>) {
  const primaryPayment = getPrimaryPayment(payload);

  return firstText(primaryPayment.currency, payload.currency).toLowerCase();
}

function mapHitPayStatus(
  payload: Record<string, any>,
  eventTypeHeader: string | null
): HitPayWebhookStatus {
  const primaryPayment = getPrimaryPayment(payload);

  const statusText = [
    eventTypeHeader,
    payload.status,
    payload.payment_status,
    primaryPayment.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    statusText.includes("completed") ||
    statusText.includes("succeeded") ||
    statusText.includes("success") ||
    statusText.includes("paid")
  ) {
    return "paid";
  }

  if (statusText.includes("refund")) return "refunded";
  if (statusText.includes("expire")) return "expired";
  if (statusText.includes("cancel")) return "cancelled";
  if (statusText.includes("fail")) return "failed";

  return "pending";
}

function buildHitPayEventId(
  payload: Record<string, any>,
  eventTypeHeader: string | null
) {
  const requestId = extractHitPayPaymentRequestId(payload);
  const paymentId = extractHitPayPaymentId(payload);
  const referenceNumber = extractHitPayReferenceNumber(payload);
  const primaryPayment = getPrimaryPayment(payload);

  const raw = [
    "hitpay",
    eventTypeHeader || "event",
    requestId || "request",
    paymentId || "payment",
    referenceNumber || "reference",
    payload.updated_at || primaryPayment.updated_at || payload.status || "status",
  ]
    .join("_")
    .replace(/[^a-zA-Z0-9_.:-]/g, "_");

  return raw.slice(0, 240);
}

function mergeHitPayMetadata(
  existingMetadata: Record<string, any>,
  patch: Record<string, unknown>
) {
  return {
    ...existingMetadata,
    hitpay: {
      ...asObject(existingMetadata.hitpay),
      ...patch,
    },
  };
}

async function getPaymentTransactionById(id: string) {
  if (!admin || !id) return null;

  const { data } = await admin
    .from("payment_transactions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return (data as PaymentTransactionRow | null) ?? null;
}

async function getPaymentTransactionByMetadata(
  key: string,
  value: string
): Promise<PaymentTransactionRow | null> {
  if (!admin || !key || !value) return null;

  const { data, error } = await admin
    .from("payment_transactions")
    .select("*")
    .contains("metadata", { [key]: value })
    .maybeSingle();

  if (error) {
    console.error(`HitPay metadata lookup error for ${key}:`, error);
    return null;
  }

  return (data as PaymentTransactionRow | null) ?? null;
}

async function getPaymentTransactionForHitPay(payload: Record<string, any>) {
  const paymentTransactionId = extractPaymentTransactionId(payload);
  const referenceNumber = extractHitPayReferenceNumber(payload);
  const requestId = extractHitPayPaymentRequestId(payload);

  const directIdCandidates = Array.from(
    new Set([paymentTransactionId, referenceNumber].filter(Boolean))
  );

  for (const id of directIdCandidates) {
    const payment = await getPaymentTransactionById(id);
    if (payment) return payment;
  }

  if (requestId) {
    const payment =
      (await getPaymentTransactionByMetadata(
        "hitpay_payment_request_id",
        requestId
      )) ||
      (await getPaymentTransactionByMetadata("payment_request_id", requestId));

    if (payment) return payment;
  }

  if (referenceNumber) {
    const payment = await getPaymentTransactionByMetadata(
      "hitpay_reference_number",
      referenceNumber
    );

    if (payment) return payment;
  }

  return null;
}

async function markWebhookEvent(
  eventId: string,
  patch: Record<string, unknown>
) {
  if (!admin || !eventId) return;

  await admin
    .from("payment_webhook_events")
    .update({
      ...patch,
      processed_at: new Date().toISOString(),
    })
    .eq("event_id", eventId);
}

function verifyWebhookPaymentMatchesTransaction(
  payment: PaymentTransactionRow,
  payload: Record<string, any>
) {
  const webhookCurrency = extractHitPayCurrency(payload);
  const expectedCurrency = String(payment.currency || "idr").toLowerCase();

  if (webhookCurrency && webhookCurrency !== expectedCurrency) {
    throw new Error(
      `HitPay currency mismatch. Expected ${expectedCurrency}, received ${webhookCurrency}.`
    );
  }

  const webhookAmount = extractHitPayAmount(payload);
  const expectedAmount = Number(payment.amount_total || 0);

  if (
    webhookAmount !== null &&
    expectedAmount > 0 &&
    Math.abs(webhookAmount - expectedAmount) > 1
  ) {
    throw new Error(
      `HitPay amount mismatch. Expected ${expectedAmount}, received ${webhookAmount}.`
    );
  }
}

async function findPropertyForActivation(
  payment: PaymentTransactionRow,
  metadata: Record<string, any>
): Promise<PropertyLookupRow | null> {
  if (!admin) throw new Error("Supabase admin client is not configured.");

  const userId = payment.user_id;

  if (!userId) {
    throw new Error("Payment transaction has no user_id.");
  }

  const explicitPropertyId =
    payment.property_id || getString(metadata, "existingPropertyId");

  if (explicitPropertyId) {
    const { data, error } = await admin
      .from("properties")
      .select(
        "id, user_id, kode, title, listing_expires_at, featured_expires_at, boost_expires_at, spotlight_expires_at, status, verification_status"
      )
      .eq("id", explicitPropertyId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as PropertyLookupRow;
  }

  const finalListingCode =
    payment.property_code_snapshot ||
    getString(metadata, "existingPropertyCode") ||
    "";

  if (finalListingCode) {
    const { data, error } = await admin
      .from("properties")
      .select(
        "id, user_id, kode, title, listing_expires_at, featured_expires_at, boost_expires_at, spotlight_expires_at, status, verification_status"
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
  if (!admin) throw new Error("Supabase admin client is not configured.");
  if (!photo) return null;

  if (!photo.startsWith("data:image/")) {
    return photo;
  }

  const fileBytes = dataUrlToBuffer(photo);
  if (!fileBytes) return null;

  const ext = getFileExtensionFromDataUrl(photo);
  const mime = getDataUrlMime(photo);
  const filePath = `public/${userId}/${propertyId}/${Date.now()}-${index}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from("property-images")
    .upload(filePath, fileBytes, {
      contentType: mime,
      upsert: false,
    });

  if (uploadError) throw uploadError;

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
  if (!admin) throw new Error("Supabase admin client is not configured.");

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

    const finalUrl = await uploadDraftPhotoIfNeeded(
      userId,
      propertyId,
      photo,
      i
    );

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

function buildOwnerPropertyPayloadFromDraft(
  payment: PaymentTransactionRow,
  metadata: Record<string, any>,
  draft: any
) {
  const verification = asObject(draft?.verification);

  const listingDurationDays = toPositiveNumber(
    getNumber(metadata, "productDurationDays") ?? payment.duration_days,
    OWNER_LISTING_FALLBACK_DAYS
  );

  const featuredDurationDays = toPositiveNumber(
    getNumber(metadata, "featuredDurationDays"),
    0
  );

  const listingExpiresAt = extendExpiryIso(null, listingDurationDays);
  const featuredExpiresAt =
    featuredDurationDays > 0
      ? extendExpiryIso(null, featuredDurationDays)
      : null;

  const finalKode =
    String(
      payment.property_code_snapshot ||
        draft?.kode ||
        getString(metadata, "existingPropertyCode") ||
        ""
    ).trim() || null;

  const landSize = nullableNumber(draft?.lt);

  return {
    user_id: payment.user_id,
    title: nullableText(draft?.title) ?? "",
    title_id: nullableText(draft?.title_id),
    listing_type: nullableText(draft?.listingType),
    property_type: nullableText(draft?.propertyType),
    price: nullableNumber(draft?.price),
    description: nullableText(draft?.description) ?? "",
    description_id: nullableText(draft?.description_id),

    status: "pending",
    verification_status: verification.status ?? "pending_verification",

    country: "Indonesia",
    province: nullableText(draft?.province),
    city: nullableText(draft?.city),
    area:
      nullableText(draft?.customHousing) ||
      nullableText(draft?.housingName) ||
      nullableText(draft?.city),
    address: nullableText(draft?.address),
    housing_name: nullableText(draft?.housingName),
    custom_housing: nullableText(draft?.customHousing),
    location_note: nullableText(draft?.note),

    bedrooms: nullableInteger(draft?.bed),
    bathrooms: nullableInteger(draft?.bath),
    maid_room: nullableInteger(draft?.maid),
    garage: nullableInteger(draft?.garage),
    floor: nullableNumber(draft?.floor),
    building_size: nullableNumber(draft?.lb),
    land_size: landSize,

    furnishing: nullableText(draft?.furnishing),
    electricity: nullableText(draft?.listrik),
    water_type: nullableText(draft?.jenisAir),

    certificate: nullableText(draft?.sertifikat),
    ownership_type: nullableText(draft?.jenisKepemilikan),
    land_type: nullableText(draft?.jenisTanah),
    zoning_type: nullableText(draft?.jenisZoning),

    kode: finalKode,
    posted_date: draft?.postedDate || new Date().toISOString().slice(0, 10),
    plan_id: getString(metadata, "selectedPlan") || payment.product_id || null,
    source: nullableText(draft?.source) ?? "owner",
    rental_type: nullableText(draft?.rentalType),
    market_type: nullableText(draft?.marketType),
    sale_type: nullableText(draft?.saleType),
    lease_years: nullableInteger(draft?.leaseYears),
    lease_until_year: nullableInteger(draft?.leaseUntilYear),
    lease_extendable: nullableText(draft?.leaseExtendable),

    land_unit: nullableText(draft?.landUnit) || (landSize ? "m2" : null),
    unit_floor: nullableText(draft?.unitFloor),
    tower_block: nullableText(draft?.towerBlock),
    ceiling_height: nullableNumber(draft?.ceilingHeight),
    road_access: nullableText(draft?.roadAccess),
    frontage: nullableNumber(draft?.frontage),
    depth: nullableNumber(draft?.depth),
    dimension_text: nullableText(draft?.dimensionText),

    facilities: draft?.fasilitas ?? null,
    nearby: draft?.nearby ?? null,

    cover_index: typeof draft?.coverIndex === "number" ? draft.coverIndex : 0,
    video_url: nullableText(draft?.video),

    relationship: verification.relationship ?? null,
    other_relationship: verification.otherRelationship ?? null,
    sell_mode: verification.sellMode ?? null,
    need_agent_recommendation: verification.needAgentRecommendation ?? null,
    need_transaction_support: verification.needTransactionSupport ?? null,
    verification_note: verification.note ?? null,
    ownership_pdf_name: verification.ownershipPdfName ?? null,
    authorization_pdf_name: verification.authorizationPdfName ?? null,
    verification_data: verification,

    verified_ok: true,

    listing_expires_at: listingExpiresAt,
    featured_expires_at: featuredExpiresAt,
    boost_active: false,
    boost_expires_at: null,
    spotlight_active: false,
    spotlight_expires_at: null,

    updated_at: new Date().toISOString(),
  };
}

async function activateNewListing(
  payment: PaymentTransactionRow,
  metadata: Record<string, any>
) {
  if (!admin) throw new Error("Supabase admin client is not configured.");

  if (!payment.user_id) {
    throw new Error("Payment transaction has no user_id.");
  }

  const existing = await findPropertyForActivation(payment, metadata);
  const draft = parseDraftSnapshot(getString(metadata, "draftSnapshot"));

  if (existing?.id) {
    const listingDurationDays = toPositiveNumber(
      getNumber(metadata, "productDurationDays") ?? payment.duration_days,
      OWNER_LISTING_FALLBACK_DAYS
    );

    const featuredDurationDays = toPositiveNumber(
      getNumber(metadata, "featuredDurationDays"),
      0
    );

    const baseUpdate: Record<string, unknown> = {
      status: "pending",
      verification_status: "pending_verification",
      posted_date: new Date().toISOString().slice(0, 10),
      listing_expires_at: extendExpiryIso(
        existing.listing_expires_at,
        listingDurationDays
      ),
      updated_at: new Date().toISOString(),
      plan_id: getString(metadata, "selectedPlan") || payment.product_id || null,
    };

    if (featuredDurationDays > 0) {
      baseUpdate.featured_expires_at = extendExpiryIso(
        existing.featured_expires_at,
        featuredDurationDays
      );
    }

    if (draft) {
      const fullPayload = buildOwnerPropertyPayloadFromDraft(
        payment,
        metadata,
        draft
      );

      Object.assign(baseUpdate, fullPayload);

      baseUpdate.user_id = payment.user_id;
      baseUpdate.kode =
        existing.kode ||
        payment.property_code_snapshot ||
        getString(metadata, "existingPropertyCode") ||
        fullPayload.kode ||
        null;
    }

    const { error } = await admin
      .from("properties")
      .update(baseUpdate)
      .eq("id", existing.id)
      .eq("user_id", payment.user_id);

    if (error) throw error;

    return {
      activatedPropertyId: existing.id,
      activatedListingCode:
        existing.kode || payment.property_code_snapshot || "",
      activationType: "new-listing",
      reusedExistingProperty: true,
    };
  }

  if (!draft) {
    throw new Error("Draft snapshot tidak ditemukan untuk aktivasi listing baru.");
  }

  const propertyPayload = buildOwnerPropertyPayloadFromDraft(
    payment,
    metadata,
    draft
  );

  const { data: insertedProperty, error: propertyError } = await admin
    .from("properties")
    .insert(propertyPayload)
    .select("id, kode")
    .single();

  if (propertyError || !insertedProperty?.id) {
    throw new Error(propertyError?.message || "Failed to create property.");
  }

  await insertPropertyImagesFromDraft(
    payment.user_id,
    insertedProperty.id,
    draft
  );

  return {
    activatedPropertyId: insertedProperty.id,
    activatedListingCode:
      insertedProperty.kode ||
      payment.property_code_snapshot ||
      propertyPayload.kode ||
      "",
    activationType: "new-listing",
    reusedExistingProperty: false,
  };
}

async function activateRenewListing(
  payment: PaymentTransactionRow,
  metadata: Record<string, any>
) {
  if (!admin) throw new Error("Supabase admin client is not configured.");

  const targetProperty = await findPropertyForActivation(payment, metadata);

  if (!targetProperty?.id) {
    throw new Error("Property target untuk renew tidak ditemukan.");
  }

  const listingDurationDays = toPositiveNumber(
    getNumber(metadata, "productDurationDays") ?? payment.duration_days,
    OWNER_LISTING_FALLBACK_DAYS
  );

  const featuredDurationDays = toPositiveNumber(
    getNumber(metadata, "featuredDurationDays"),
    0
  );

  const nextListingExpiresAt = extendExpiryIso(
    targetProperty.listing_expires_at,
    listingDurationDays
  );

  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
    posted_date: new Date().toISOString().slice(0, 10),
    listing_expires_at: nextListingExpiresAt,
  };

  const selectedPlan = getString(metadata, "selectedPlan");

  if (selectedPlan) {
    updatePayload.plan_id = selectedPlan;
  }

  if (featuredDurationDays > 0) {
    updatePayload.featured_expires_at = extendExpiryIso(
      targetProperty.featured_expires_at,
      featuredDurationDays
    );
  }

  const { error } = await admin
    .from("properties")
    .update(updatePayload)
    .eq("id", targetProperty.id)
    .eq("user_id", payment.user_id);

  if (error) throw error;

  return {
    activatedPropertyId: targetProperty.id,
    activatedListingCode:
      targetProperty.kode || payment.property_code_snapshot || "",
    activationType: "renew-listing",
  };
}

async function activateAddon(
  payment: PaymentTransactionRow,
  metadata: Record<string, any>
) {
  if (!admin) throw new Error("Supabase admin client is not configured.");

  const targetProperty = await findPropertyForActivation(payment, metadata);

  if (!targetProperty?.id) {
    throw new Error("Property target untuk add-on tidak ditemukan.");
  }

  const addonDurationDays = toPositiveNumber(
    getNumber(metadata, "productDurationDays") ?? payment.duration_days,
    ADDON_FALLBACK_DAYS
  );

  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  let activationType = "boost-listing";

  if (
    payment.payment_type === "spotlight" ||
    String(payment.product_id || "").toLowerCase() === "homepage-spotlight"
  ) {
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
  }

  const { error } = await admin
    .from("properties")
    .update(updatePayload)
    .eq("id", targetProperty.id)
    .eq("user_id", payment.user_id);

  if (error) throw error;

  return {
    activatedPropertyId: targetProperty.id,
    activatedListingCode:
      targetProperty.kode || payment.property_code_snapshot || "",
    activationType,
  };
}

async function activateEducationEntitlement(
  payment: PaymentTransactionRow,
  paidAtIso: string
) {
  if (!admin) throw new Error("Supabase admin client is not configured.");

  const metadata = asObject(payment.metadata);

  const durationDays = toPositiveNumber(
    getNumber(metadata, "productDurationDays") ?? payment.duration_days,
    EDUCATION_FALLBACK_DAYS
  );

  const startsAt = paidAtIso;
  const endsAt = addDaysIso(paidAtIso, durationDays);

  const { error } = await admin.from("education_entitlements").upsert(
    {
      user_id: payment.user_id,
      payment_transaction_id: payment.id,
      product_id: payment.product_id ?? "education-pass",
      product_name_snapshot: payment.product_name_snapshot ?? "Education Pass",
      product_type: payment.product_type ?? "education",
      audience_snapshot: payment.audience_snapshot ?? "all",
      status: "active",
      starts_at: startsAt,
      ends_at: endsAt,
      granted_at: paidAtIso,
      metadata,
    },
    { onConflict: "payment_transaction_id" }
  );

  if (error) throw error;

  return {
    educationEntitlement: true,
    startsAt,
    endsAt,
    activationType: "education-access",
  };
}

function normalizeMembershipBillingCycle(value: unknown): "monthly" | "yearly" {
  const v = String(value || "").toLowerCase();
  return v === "monthly" ? "monthly" : "yearly";
}

function resolveAgentListingLimit(
  payment: PaymentTransactionRow,
  metadata: Record<string, any>
) {
  const directLimit =
    getNumber(metadata, "listingLimit") ||
    getNumber(metadata, "activeListingLimit") ||
    getNumber(metadata, "listing_limit") ||
    getNumber(metadata, "active_listing_limit");

  if (directLimit && directLimit > 0) return directLimit;

  const packageId = String(payment.product_id || "").toLowerCase();
  const packageName = String(
    metadata.packageName || payment.product_name_snapshot || ""
  ).toLowerCase();

  const value = `${packageId} ${packageName}`;

  if (value.includes("starter")) return 30;
  if (value.includes("silver")) return 100;
  if (value.includes("gold")) return 500;

  return 0;
}

async function activateAgentMembership(
  payment: PaymentTransactionRow,
  paidAtIso: string
) {
  if (!admin) throw new Error("Supabase admin client is not configured.");

  if (!payment.user_id) {
    throw new Error("Payment transaction has no user_id for agent membership.");
  }

  const metadata = asObject(payment.metadata);

  const billingCycle = normalizeMembershipBillingCycle(
    metadata.selectedBillingCycle ||
      metadata.selected_billing_cycle ||
      metadata.billingCycle ||
      metadata.billing_cycle
  );

  const packageId = String(
    metadata.packageId || metadata.package_id || payment.product_id || ""
  ).trim();

  const packageName = String(
    metadata.packageName ||
      metadata.package_name ||
      payment.product_name_snapshot ||
      packageId
  ).trim();

  const listingLimit = resolveAgentListingLimit(payment, metadata);

  const packageTermDays = toPositiveNumber(
    getNumber(metadata, "packageTermDays") ||
      getNumber(metadata, "package_term_days") ||
      getNumber(metadata, "productDurationDays") ||
      payment.duration_days,
    billingCycle === "monthly" ? 30 : 365
  );

  const startsAt = paidAtIso;
  const expiresAt = addDaysIso(paidAtIso, packageTermDays);
  const nowIso = new Date().toISOString();

  await admin
    .from("agent_memberships")
    .update({
      status: "expired",
      updated_at: nowIso,
    })
    .eq("user_id", payment.user_id)
    .eq("status", "active")
    .neq("payment_id", payment.id);

  const { error } = await admin.from("agent_memberships").upsert(
    {
      user_id: payment.user_id,
      payment_id: payment.id,
      package_id: packageId,
      package_name: packageName,
      billing_cycle: billingCycle,
      status: "active",
      auto_renew: true,
      starts_at: startsAt,
      expires_at: expiresAt,
      metadata: {
        ...metadata,
        payment_transaction_id: payment.id,
        payment_type: payment.payment_type,
        product_type: payment.product_type,
        product_id: payment.product_id,
        product_name_snapshot: payment.product_name_snapshot,
        amount_total: payment.amount_total,
        currency: payment.currency,
        activated_from: "hitpay_webhook",
        activated_at: nowIso,
        package_id: packageId,
        package_name: packageName,
        billing_cycle: billingCycle,
        listing_limit: listingLimit,
        active_listing_limit: listingLimit,
        starts_at: startsAt,
        expires_at: expiresAt,
      },
      updated_at: nowIso,
    },
    { onConflict: "payment_id" }
  );

  if (error) throw error;

  return {
    activationType: "agent-membership",
    agentMembership: true,
    packageId,
    packageName,
    billingCycle,
    listingLimit,
    startsAt,
    expiresAt,
  };
}

async function activateAfterPayment(
  payment: PaymentTransactionRow,
  paidAtIso: string
) {
  const metadata = asObject(payment.metadata);
  const action = String(metadata.action || "").toLowerCase();
  const paymentType = String(payment.payment_type || "").toLowerCase();

  if (paymentType === "education") {
    return activateEducationEntitlement(payment, paidAtIso);
  }

  if (paymentType === "package") {
    return activateAgentMembership(payment, paidAtIso);
  }

  if (paymentType === "boost" || paymentType === "spotlight") {
    return activateAddon(payment, metadata);
  }

  if (paymentType === "listing_fee" || paymentType === "featured") {
    if (isVehicleListingPayment(payment, metadata)) {
      const vehicleType = getVehicleTypeFromMetadata(metadata) || "car";

      return {
        activationType:
          action === "renew"
            ? "vehicle-renew-listing"
            : "vehicle-new-listing",
        vehicleType,
        skippedBecauseVehicleStorageNotWired: true,
      };
    }

    if (action === "renew") {
      return activateRenewListing(payment, metadata);
    }

    return activateNewListing(payment, metadata);
  }

  return {
    activationType: paymentType || "unknown",
    skippedBecauseUnknownFlow: true,
  };
}

async function completePaidHitPayPayment({
  eventId,
  eventType,
  payment,
  payload,
}: {
  eventId: string;
  eventType: string;
  payment: PaymentTransactionRow;
  payload: Record<string, any>;
}) {
  if (!admin) throw new Error("Supabase admin client is not configured.");

  verifyWebhookPaymentMatchesTransaction(payment, payload);

  const metadata = asObject(payment.metadata);
  const existingActivation = asObject(metadata.activation);
  const activationDone = existingActivation.done === true;

  const primaryPayment = getPrimaryPayment(payload);
  const nowIso = new Date().toISOString();
  const paidAtIso =
    payload.updated_at ||
    primaryPayment.updated_at ||
    primaryPayment.created_at ||
    nowIso;

  const nextPaidAt = payment.paid_at || paidAtIso;

  const mergedMetadata = mergeHitPayMetadata(metadata, {
    event_id: eventId,
    event_type: eventType,
    mode: hitpayMode,
    payment_request_id: extractHitPayPaymentRequestId(payload),
    payment_id: extractHitPayPaymentId(payload),
    reference_number: extractHitPayReferenceNumber(payload),
    status: payload.status || null,
    payment_status: primaryPayment.status || null,
    payment_type: primaryPayment.payment_type || null,
    amount: extractHitPayAmount(payload),
    currency: extractHitPayCurrency(payload),
    paid_at: nextPaidAt,
    raw_payload: payload,
  });

  const { error: paymentUpdateError } = await admin
    .from("payment_transactions")
    .update({
      status: "paid",
      customer_name: payload.name || payment.customer_name || null,
      customer_email:
        payload.email ||
        primaryPayment.buyer_email ||
        payment.customer_email ||
        null,
      customer_phone: payload.phone || payment.customer_phone || null,
      paid_at: nextPaidAt,
      updated_at: nowIso,
      metadata: mergedMetadata,
    })
    .eq("id", payment.id);

  if (paymentUpdateError) throw paymentUpdateError;

  if (!activationDone) {
    const activationResult = await activateAfterPayment(
      {
        ...payment,
        status: "paid",
        paid_at: nextPaidAt,
        customer_name: payload.name || payment.customer_name || null,
        customer_email:
          payload.email ||
          primaryPayment.buyer_email ||
          payment.customer_email ||
          null,
        customer_phone: payload.phone || payment.customer_phone || null,
        metadata: mergedMetadata,
      },
      nextPaidAt
    );

    const finalMetadata = {
      ...mergedMetadata,
      activation: {
        done: true,
        processedAt: new Date().toISOString(),
        processedBy: "hitpay_webhook",
        ...activationResult,
      },
    };

    const { error: activationUpdateError } = await admin
      .from("payment_transactions")
      .update({
        metadata: finalMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    if (activationUpdateError) throw activationUpdateError;
  }

  await markWebhookEvent(eventId, {
    processing_status: "processed",
    object_id: extractHitPayPaymentRequestId(payload) || null,
  });
}

async function handleNonPaidHitPayStatus({
  eventId,
  eventType,
  payment,
  payload,
  nextStatus,
}: {
  eventId: string;
  eventType: string;
  payment: PaymentTransactionRow;
  payload: Record<string, any>;
  nextStatus: Exclude<HitPayWebhookStatus, "paid">;
}) {
  if (!admin) throw new Error("Supabase admin client is not configured.");

  if (payment.status === "paid") {
    await markWebhookEvent(eventId, {
      processing_status: "ignored",
      processing_error: `Payment already paid. Ignored HitPay status: ${nextStatus}`,
      object_id: extractHitPayPaymentRequestId(payload) || null,
    });

    return;
  }

  const metadata = asObject(payment.metadata);

  const mergedMetadata = mergeHitPayMetadata(metadata, {
    event_id: eventId,
    event_type: eventType,
    mode: hitpayMode,
    payment_request_id: extractHitPayPaymentRequestId(payload),
    payment_id: extractHitPayPaymentId(payload),
    reference_number: extractHitPayReferenceNumber(payload),
    status: payload.status || null,
    mapped_status: nextStatus,
    raw_payload: payload,
  });

  const patch: Record<string, unknown> = {
    status: nextStatus,
    updated_at: new Date().toISOString(),
    metadata: mergedMetadata,
  };

  if (nextStatus === "failed") {
    patch.failed_at = new Date().toISOString();
  }

  if (nextStatus === "expired") {
    patch.expired_at = new Date().toISOString();
  }

  const { error } = await admin
    .from("payment_transactions")
    .update(patch)
    .eq("id", payment.id);

  if (error) throw error;

  await markWebhookEvent(eventId, {
    processing_status: "processed",
    object_id: extractHitPayPaymentRequestId(payload) || null,
  });
}

export async function GET() {
  return json({
    ok: true,
    message: "Tetamo HitPay webhook endpoint is active.",
  });
}

export async function POST(req: Request) {
  if (!admin) {
    return json(
      {
        ok: false,
        error:
          "Supabase server environment is not configured. Check Supabase URL and service role key.",
      },
      500
    );
  }

  const signature = req.headers.get("hitpay-signature");
  const eventTypeHeader = req.headers.get("hitpay-event-type");
  const eventObjectHeader = req.headers.get("hitpay-event-object");

  const rawBody = await req.text();

  try {
    const isValidSignature = verifyHitPaySignature(rawBody, signature);

    if (!isValidSignature) {
      return json(
        {
          ok: false,
          error: "Invalid HitPay signature.",
        },
        401
      );
    }
  } catch (error) {
    return json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "HitPay signature validation failed.",
      },
      500
    );
  }

  let payload: Record<string, any>;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json(
      {
        ok: false,
        error: "Invalid JSON payload.",
      },
      400
    );
  }

  const eventType =
    eventTypeHeader ||
    `payment_request.${String(payload.status || "unknown").toLowerCase()}`;

  const eventId = buildHitPayEventId(payload, eventTypeHeader);

  const initialInsert = await admin.from("payment_webhook_events").insert({
    provider: "hitpay",
    event_id: eventId,
    event_type: eventType,
    livemode: hitpayMode === "live",
    api_version: null,
    object_id: extractHitPayPaymentRequestId(payload) || null,
    checkout_session_id: null,
    payment_intent_id: null,
    charge_id: null,
    invoice_id: null,
    processing_status: "received",
    payload: {
      provider: "hitpay",
      event_type_header: eventTypeHeader,
      event_object_header: eventObjectHeader,
      signature_present: Boolean(signature),
      body: payload,
    },
  });

  if (initialInsert.error && initialInsert.error.code !== "23505") {
    return json(
      {
        ok: false,
        error: "Failed to log HitPay webhook event.",
        details: initialInsert.error.message,
      },
      500
    );
  }

  try {
    const payment = await getPaymentTransactionForHitPay(payload);

    if (!payment) {
      await markWebhookEvent(eventId, {
        processing_status: "ignored",
        processing_error: "No payment_transactions row found for HitPay event.",
        object_id: extractHitPayPaymentRequestId(payload) || null,
      });

      return json({
        ok: true,
        ignored: true,
        reason: "No payment transaction found.",
      });
    }

    const nextStatus = mapHitPayStatus(payload, eventTypeHeader);

    if (nextStatus === "paid") {
      await completePaidHitPayPayment({
        eventId,
        eventType,
        payment,
        payload,
      });
    } else if (nextStatus === "pending") {
      await markWebhookEvent(eventId, {
        processing_status: "ignored",
        processing_error: "Pending HitPay webhook event ignored.",
        object_id: extractHitPayPaymentRequestId(payload) || null,
      });
    } else {
      await handleNonPaidHitPayStatus({
        eventId,
        eventType,
        payment,
        payload,
        nextStatus,
      });
    }

    return json({
      ok: true,
      eventId,
      status: nextStatus,
      paymentId: payment.id,
    });
  } catch (error) {
    await markWebhookEvent(eventId, {
      processing_status: "failed",
      processing_error:
        error instanceof Error ? error.message : "Unknown processing error.",
      object_id: extractHitPayPaymentRequestId(payload) || null,
    });

    return json(
      {
        ok: false,
        error: "HitPay webhook processing failed.",
        message:
          error instanceof Error ? error.message : "Unknown processing error.",
      },
      500
    );
  }
}