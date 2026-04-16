import Stripe from "https://esm.sh/stripe@14?target=denonext";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);

const cryptoProvider = Stripe.createSubtleCryptoProvider();

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

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
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_invoice_id: string | null;
  receipt_url?: string | null;
  hosted_invoice_url?: string | null;
  invoice_pdf_url?: string | null;
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

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPositiveNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
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

function dataUrlToUint8Array(dataUrl: string): Uint8Array | null {
  try {
    const parts = dataUrl.split(",");
    if (parts.length < 2) return null;

    const binary = atob(parts[1]);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
  } catch {
    return null;
  }
}

async function getPaymentTransactionById(id: string) {
  const { data } = await supabaseAdmin
    .from("payment_transactions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return (data as PaymentTransactionRow | null) ?? null;
}

async function getPaymentTransactionForSession(
  session: Stripe.Checkout.Session
): Promise<PaymentTransactionRow | null> {
  const metadataPaymentId =
    typeof session.metadata?.payment_transaction_id === "string"
      ? session.metadata.payment_transaction_id
      : null;

  if (metadataPaymentId) {
    const payment = await getPaymentTransactionById(metadataPaymentId);
    if (payment) return payment;
  }

  if (session.client_reference_id) {
    const payment = await getPaymentTransactionById(session.client_reference_id);
    if (payment) return payment;
  }

  const { data } = await supabaseAdmin
    .from("payment_transactions")
    .select("*")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();

  return (data as PaymentTransactionRow | null) ?? null;
}

async function getPaymentTransactionForInvoice(
  invoice: Stripe.Invoice
): Promise<PaymentTransactionRow | null> {
  const metadataPaymentId =
    typeof invoice.metadata?.payment_transaction_id === "string"
      ? invoice.metadata.payment_transaction_id
      : null;

  if (metadataPaymentId) {
    const payment = await getPaymentTransactionById(metadataPaymentId);
    if (payment) return payment;
  }

  if (invoice.id) {
    const { data } = await supabaseAdmin
      .from("payment_transactions")
      .select("*")
      .eq("stripe_invoice_id", invoice.id)
      .maybeSingle();

    if (data) return data as PaymentTransactionRow;
  }

  if (typeof invoice.payment_intent === "string" && invoice.payment_intent) {
    const { data } = await supabaseAdmin
      .from("payment_transactions")
      .select("*")
      .eq("stripe_payment_intent_id", invoice.payment_intent)
      .maybeSingle();

    if (data) return data as PaymentTransactionRow;
  }

  return null;
}

async function getPaymentTransactionForCharge(
  charge: Stripe.Charge
): Promise<PaymentTransactionRow | null> {
  const metadataPaymentId =
    typeof charge.metadata?.payment_transaction_id === "string"
      ? charge.metadata.payment_transaction_id
      : null;

  if (metadataPaymentId) {
    const payment = await getPaymentTransactionById(metadataPaymentId);
    if (payment) return payment;
  }

  const { data: byCharge } = await supabaseAdmin
    .from("payment_transactions")
    .select("*")
    .eq("stripe_charge_id", charge.id)
    .maybeSingle();

  if (byCharge) return byCharge as PaymentTransactionRow;

  if (typeof charge.payment_intent === "string" && charge.payment_intent) {
    const { data } = await supabaseAdmin
      .from("payment_transactions")
      .select("*")
      .eq("stripe_payment_intent_id", charge.payment_intent)
      .maybeSingle();

    if (data) return data as PaymentTransactionRow;
  }

  if (typeof charge.invoice === "string" && charge.invoice) {
    const { data } = await supabaseAdmin
      .from("payment_transactions")
      .select("*")
      .eq("stripe_invoice_id", charge.invoice)
      .maybeSingle();

    if (data) return data as PaymentTransactionRow;
  }

  return null;
}

async function markWebhookEvent(
  eventId: string,
  patch: Record<string, unknown>
) {
  await supabaseAdmin
    .from("payment_webhook_events")
    .update({
      ...patch,
      processed_at: new Date().toISOString(),
    })
    .eq("event_id", eventId);
}

function mergeStripeMetadata(
  existingMetadata: Record<string, any>,
  patch: Record<string, unknown>
) {
  return {
    ...existingMetadata,
    stripe: {
      ...asObject(existingMetadata.stripe),
      ...patch,
    },
  };
}

async function fetchStripeArtifactsFromSession(session: Stripe.Checkout.Session) {
  let paymentIntentId: string | null = null;
  let chargeId: string | null = null;
  let receiptUrl: string | null = null;
  let invoiceId: string | null = null;
  let hostedInvoiceUrl: string | null = null;
  let invoicePdfUrl: string | null = null;

  if (typeof session.payment_intent === "string" && session.payment_intent) {
    paymentIntentId = session.payment_intent;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    });

    const latestCharge =
      paymentIntent.latest_charge as Stripe.Charge | string | null;

    if (latestCharge && typeof latestCharge !== "string") {
      chargeId = latestCharge.id;
      receiptUrl = latestCharge.receipt_url ?? null;
    }
  }

  if (typeof session.invoice === "string" && session.invoice) {
    invoiceId = session.invoice;

    const invoice = await stripe.invoices.retrieve(invoiceId);
    hostedInvoiceUrl = invoice.hosted_invoice_url ?? null;
    invoicePdfUrl = invoice.invoice_pdf ?? null;
  }

  return {
    paymentIntentId,
    chargeId,
    receiptUrl,
    invoiceId,
    hostedInvoiceUrl,
    invoicePdfUrl,
  };
}

async function findPropertyForActivation(
  payment: PaymentTransactionRow,
  metadata: Record<string, any>
): Promise<PropertyLookupRow | null> {
  const userId = payment.user_id;
  if (!userId) {
    throw new Error("Payment transaction has no user_id.");
  }

  const explicitPropertyId =
    payment.property_id || getString(metadata, "existingPropertyId");

  if (explicitPropertyId) {
    const { data, error } = await supabaseAdmin
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
    const { data, error } = await supabaseAdmin
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
  if (!photo) return null;

  if (!photo.startsWith("data:image/")) {
    return photo;
  }

  const fileBytes = dataUrlToUint8Array(photo);
  if (!fileBytes) return null;

  const ext = getFileExtensionFromDataUrl(photo);
  const mime = getDataUrlMime(photo);
  const filePath = `public/${userId}/${propertyId}/${Date.now()}-${index}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("property-images")
    .upload(filePath, fileBytes, {
      contentType: mime,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from("property-images").getPublicUrl(filePath);

  return publicUrl;
}

async function insertPropertyImagesFromDraft(
  userId: string,
  propertyId: string,
  draft: any
) {
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

  const { error } = await supabaseAdmin.from("property_images").insert(imageRows);
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
    30
  );

  const featuredDurationDays = toPositiveNumber(
    getNumber(metadata, "featuredDurationDays"),
    0
  );

  const listingExpiresAt = extendExpiryIso(null, listingDurationDays);
  const featuredExpiresAt =
    featuredDurationDays > 0 ? extendExpiryIso(null, featuredDurationDays) : null;

  const finalKode =
    String(
      payment.property_code_snapshot ||
        draft?.kode ||
        getString(metadata, "existingPropertyCode") ||
        ""
    ).trim() || null;

  return {
    user_id: payment.user_id,
    title: draft?.title ?? "",
    listing_type: draft?.listingType ?? null,
    property_type: draft?.propertyType ?? null,
    price: draft?.price ? Number(draft.price) : null,
    description: draft?.description ?? "",

    status: "pending",
    verification_status: verification.status ?? "pending_verification",

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
    plan_id:
      getString(metadata, "selectedPlan") || payment.product_id || null,
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
  if (!payment.user_id) {
    throw new Error("Payment transaction has no user_id.");
  }

  const existing = await findPropertyForActivation(payment, metadata);
  const draft = parseDraftSnapshot(getString(metadata, "draftSnapshot"));

  if (existing?.id) {
    const listingDurationDays = toPositiveNumber(
      getNumber(metadata, "productDurationDays") ?? payment.duration_days,
      30
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

    const { error } = await supabaseAdmin
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

  const { data: insertedProperty, error: propertyError } = await supabaseAdmin
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
  const targetProperty = await findPropertyForActivation(payment, metadata);

  if (!targetProperty?.id) {
    throw new Error("Property target untuk renew tidak ditemukan.");
  }

  const listingDurationDays = toPositiveNumber(
    getNumber(metadata, "productDurationDays") ?? payment.duration_days,
    30
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

  const { error } = await supabaseAdmin
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
  const targetProperty = await findPropertyForActivation(payment, metadata);

  if (!targetProperty?.id) {
    throw new Error("Property target untuk add-on tidak ditemukan.");
  }

  const addonDurationDays = toPositiveNumber(
    getNumber(metadata, "productDurationDays") ?? payment.duration_days,
    14
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

  const { error } = await supabaseAdmin
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
  const metadata = asObject(payment.metadata);
  const durationDays = toPositiveNumber(
    getNumber(metadata, "productDurationDays") ?? payment.duration_days,
    90
  );

  const startsAt = paidAtIso;
  const endsAt = addDaysIso(paidAtIso, durationDays);

  const { error } = await supabaseAdmin.from("education_entitlements").upsert(
    {
      user_id: payment.user_id,
      payment_transaction_id: payment.id,
      product_id: payment.product_id ?? "education-pass",
      product_name_snapshot:
        payment.product_name_snapshot ?? "Education Pass",
      product_type: payment.product_type ?? "education",
      audience_snapshot: payment.audience_snapshot ?? "all",
      status: "active",
      starts_at: startsAt,
      ends_at: endsAt,
      granted_at: paidAtIso,
      metadata: metadata,
    },
    { onConflict: "payment_transaction_id" }
  );

  if (error) {
    throw error;
  }

  return {
    educationEntitlement: true,
    startsAt,
    endsAt,
    activationType: "education-access",
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

async function completePaidPayment(
  event: Stripe.Event,
  payment: PaymentTransactionRow,
  patch: {
    stripeCheckoutSessionId?: string | null;
    stripePaymentIntentId?: string | null;
    stripeChargeId?: string | null;
    stripeInvoiceId?: string | null;
    receiptUrl?: string | null;
    hostedInvoiceUrl?: string | null;
    invoicePdfUrl?: string | null;
    customerName?: string | null;
    customerEmail?: string | null;
    paymentStatus?: string | null;
  },
  paidAtIso: string
) {
  const metadata = asObject(payment.metadata);
  const existingActivation = asObject(metadata.activation);
  const activationDone = existingActivation.done === true;

  const mergedMetadata = mergeStripeMetadata(metadata, {
    event_type: event.type,
    event_id: event.id,
    payment_status: patch.paymentStatus ?? null,
    checkout_session_id:
      patch.stripeCheckoutSessionId ?? payment.stripe_checkout_session_id,
    payment_intent_id:
      patch.stripePaymentIntentId ?? payment.stripe_payment_intent_id,
    charge_id: patch.stripeChargeId ?? payment.stripe_charge_id,
    invoice_id: patch.stripeInvoiceId ?? payment.stripe_invoice_id,
    receipt_url: patch.receiptUrl ?? payment.receipt_url ?? null,
    hosted_invoice_url:
      patch.hostedInvoiceUrl ?? payment.hosted_invoice_url ?? null,
    invoice_pdf_url: patch.invoicePdfUrl ?? payment.invoice_pdf_url ?? null,
  });

  const nextPaidAt = payment.paid_at || paidAtIso;

  const { error: paymentUpdateError } = await supabaseAdmin
    .from("payment_transactions")
    .update({
      status: "paid",
      stripe_checkout_session_id:
        patch.stripeCheckoutSessionId ?? payment.stripe_checkout_session_id,
      stripe_payment_intent_id:
        patch.stripePaymentIntentId ?? payment.stripe_payment_intent_id,
      stripe_charge_id: patch.stripeChargeId ?? payment.stripe_charge_id,
      stripe_invoice_id: patch.stripeInvoiceId ?? payment.stripe_invoice_id,
      receipt_url: patch.receiptUrl ?? payment.receipt_url ?? null,
      hosted_invoice_url:
        patch.hostedInvoiceUrl ?? payment.hosted_invoice_url ?? null,
      invoice_pdf_url: patch.invoicePdfUrl ?? payment.invoice_pdf_url ?? null,
      stripe_event_id_last: event.id,
      customer_name: patch.customerName ?? payment.customer_name ?? null,
      customer_email: patch.customerEmail ?? payment.customer_email ?? null,
      paid_at: nextPaidAt,
      updated_at: new Date().toISOString(),
      metadata: mergedMetadata,
    })
    .eq("id", payment.id);

  if (paymentUpdateError) {
    throw paymentUpdateError;
  }

  if (!activationDone) {
    const activationResult = await activateAfterPayment(
      {
        ...payment,
        stripe_checkout_session_id:
          patch.stripeCheckoutSessionId ?? payment.stripe_checkout_session_id,
        stripe_payment_intent_id:
          patch.stripePaymentIntentId ?? payment.stripe_payment_intent_id,
        stripe_charge_id: patch.stripeChargeId ?? payment.stripe_charge_id,
        stripe_invoice_id: patch.stripeInvoiceId ?? payment.stripe_invoice_id,
        receipt_url: patch.receiptUrl ?? payment.receipt_url ?? null,
        hosted_invoice_url:
          patch.hostedInvoiceUrl ?? payment.hosted_invoice_url ?? null,
        invoice_pdf_url: patch.invoicePdfUrl ?? payment.invoice_pdf_url ?? null,
        metadata: mergedMetadata,
        paid_at: nextPaidAt,
        status: "paid",
      },
      nextPaidAt
    );

    const finalMetadata = {
      ...mergedMetadata,
      activation: {
        done: true,
        processedAt: new Date().toISOString(),
        ...activationResult,
      },
    };

    const { error: activationUpdateError } = await supabaseAdmin
      .from("payment_transactions")
      .update({
        metadata: finalMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    if (activationUpdateError) {
      throw activationUpdateError;
    }
  }

  await markWebhookEvent(event.id, {
    processing_status: "processed",
    checkout_session_id:
      patch.stripeCheckoutSessionId ?? payment.stripe_checkout_session_id,
    payment_intent_id:
      patch.stripePaymentIntentId ?? payment.stripe_payment_intent_id,
    charge_id: patch.stripeChargeId ?? payment.stripe_charge_id,
    invoice_id: patch.stripeInvoiceId ?? payment.stripe_invoice_id,
  });
}

async function handlePaidCheckoutSession(
  event: Stripe.Event,
  session: Stripe.Checkout.Session
) {
  const payment = await getPaymentTransactionForSession(session);

  if (!payment) {
    await markWebhookEvent(event.id, {
      processing_status: "failed",
      processing_error: `No payment_transactions row found for checkout session ${session.id}`,
    });
    return;
  }

  const artifacts = await fetchStripeArtifactsFromSession(session);

  await completePaidPayment(
    event,
    payment,
    {
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: artifacts.paymentIntentId,
      stripeChargeId: artifacts.chargeId,
      stripeInvoiceId: artifacts.invoiceId,
      receiptUrl: artifacts.receiptUrl,
      hostedInvoiceUrl: artifacts.hostedInvoiceUrl,
      invoicePdfUrl: artifacts.invoicePdfUrl,
      customerName: session.customer_details?.name ?? null,
      customerEmail: session.customer_details?.email ?? null,
      paymentStatus: session.payment_status ?? null,
    },
    new Date().toISOString()
  );
}

async function handleInvoicePaid(
  event: Stripe.Event,
  invoice: Stripe.Invoice
) {
  const payment = await getPaymentTransactionForInvoice(invoice);

  if (!payment) {
    await markWebhookEvent(event.id, {
      processing_status: "ignored",
      invoice_id: invoice.id,
      processing_error: `No payment row found for invoice ${invoice.id}`,
    });
    return;
  }

  const paidAtIso =
    invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
      : new Date().toISOString();

  await completePaidPayment(
    event,
    payment,
    {
      stripePaymentIntentId:
        typeof invoice.payment_intent === "string"
          ? invoice.payment_intent
          : null,
      stripeInvoiceId: invoice.id,
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      invoicePdfUrl: invoice.invoice_pdf ?? null,
      customerName: invoice.customer_name ?? null,
      customerEmail: invoice.customer_email ?? null,
      paymentStatus: invoice.status ?? null,
    },
    paidAtIso
  );
}

async function handleChargeSucceeded(
  event: Stripe.Event,
  charge: Stripe.Charge
) {
  const payment = await getPaymentTransactionForCharge(charge);

  if (!payment) {
    await markWebhookEvent(event.id, {
      processing_status: "ignored",
      charge_id: charge.id,
      processing_error: `No payment row found for charge ${charge.id}`,
    });
    return;
  }

  const paidAtIso = new Date(charge.created * 1000).toISOString();

  await completePaidPayment(
    event,
    payment,
    {
      stripePaymentIntentId:
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : null,
      stripeChargeId: charge.id,
      stripeInvoiceId:
        typeof charge.invoice === "string" ? charge.invoice : null,
      receiptUrl: charge.receipt_url ?? null,
      customerName: charge.billing_details?.name ?? null,
      customerEmail: charge.billing_details?.email ?? null,
      paymentStatus: charge.status ?? null,
    },
    paidAtIso
  );
}

async function handleExpiredOrFailedSession(
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
  nextStatus: "expired" | "failed"
) {
  const payment = await getPaymentTransactionForSession(session);

  if (!payment) {
    await markWebhookEvent(event.id, {
      processing_status: "ignored",
      processing_error: `No payment row found for session ${session.id}`,
    });
    return;
  }

  const metadata = asObject(payment.metadata);
  const patch: Record<string, unknown> = {
    status: nextStatus,
    stripe_checkout_session_id: session.id,
    stripe_event_id_last: event.id,
    updated_at: new Date().toISOString(),
    metadata: mergeStripeMetadata(metadata, {
      event_type: event.type,
      event_id: event.id,
      checkout_session_id: session.id,
    }),
  };

  if (nextStatus === "expired") {
    patch.expired_at = new Date().toISOString();
  }

  if (nextStatus === "failed") {
    patch.failed_at = new Date().toISOString();
  }

  const { error } = await supabaseAdmin
    .from("payment_transactions")
    .update(patch)
    .eq("id", payment.id);

  if (error) {
    throw error;
  }

  await markWebhookEvent(event.id, {
    processing_status: "processed",
    checkout_session_id: session.id,
  });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const signature = request.headers.get("Stripe-Signature");
  if (!signature) {
    return json({ error: "Missing Stripe-Signature header" }, 400);
  }

  const body = await request.text();

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET")!,
      undefined,
      cryptoProvider
    );
  } catch (error) {
    return json(
      {
        error: "Invalid Stripe signature",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      400
    );
  }

  const baseObject = event.data.object as Record<string, unknown>;

  const initialInsert = await supabaseAdmin
    .from("payment_webhook_events")
    .insert({
      provider: "stripe",
      event_id: event.id,
      event_type: event.type,
      livemode: event.livemode,
      api_version: event.api_version ?? null,
      object_id: typeof baseObject.id === "string" ? baseObject.id : null,
      checkout_session_id:
        typeof baseObject.id === "string" &&
        String(event.type).startsWith("checkout.session")
          ? baseObject.id
          : null,
      payment_intent_id:
        typeof baseObject.payment_intent === "string"
          ? baseObject.payment_intent
          : null,
      charge_id:
        typeof baseObject.charge === "string" ? baseObject.charge : null,
      invoice_id:
        typeof baseObject.invoice === "string"
          ? baseObject.invoice
          : typeof baseObject.id === "string" &&
            String(event.type).startsWith("invoice.")
          ? baseObject.id
          : null,
      processing_status: "received",
      payload: event,
    });

  if (initialInsert.error) {
    if (initialInsert.error.code === "23505") {
      return json({ ok: true, duplicate: true });
    }

    return json(
      {
        error: "Failed to log webhook event",
        details: initialInsert.error.message,
      },
      500
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await handlePaidCheckoutSession(
          event,
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "invoice.paid":
        await handleInvoicePaid(event, event.data.object as Stripe.Invoice);
        break;

      case "charge.succeeded":
        await handleChargeSucceeded(event, event.data.object as Stripe.Charge);
        break;

      case "checkout.session.async_payment_failed":
        await handleExpiredOrFailedSession(
          event,
          event.data.object as Stripe.Checkout.Session,
          "failed"
        );
        break;

      case "checkout.session.expired":
        await handleExpiredOrFailedSession(
          event,
          event.data.object as Stripe.Checkout.Session,
          "expired"
        );
        break;

      default:
        await markWebhookEvent(event.id, {
          processing_status: "ignored",
          processing_error: `Unhandled event type: ${event.type}`,
        });
        break;
    }

    return json({ ok: true });
  } catch (error) {
    await markWebhookEvent(event.id, {
      processing_status: "failed",
      processing_error:
        error instanceof Error ? error.message : "Unknown processing error",
    });

    return json(
      {
        error: "Webhook processing failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});