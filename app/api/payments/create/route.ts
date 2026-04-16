import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import {
  getAnyProductById,
  getOwnerPackageById,
  getAgentPackageById,
  getAddOnProductById,
  getEducationProductById,
} from "@/app/data/pricelist";
import type {
  TetamoGateway,
  TetamoPayment,
  TetamoPaymentFlow,
  TetamoPaymentMethod,
  TetamoProductType,
  TetamoUserType,
} from "@/types/payment";

export const runtime = "nodejs";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

const authClient =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

type CreatePaymentBody = Partial<TetamoPayment> & {
  successUrl?: string;
  cancelUrl?: string;
};

type PaymentMetadata = Record<
  string,
  string | number | boolean | null | undefined
>;

type BillingCycle = "monthly" | "yearly";
type VehicleType = "car" | "motor";

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
};

type PropertyRow = {
  id: string;
  user_id: string | null;
  title: string | null;
  kode: string | null;
  province: string | null;
  city: string | null;
};

function normalizePaymentMethod(value: unknown): TetamoPaymentMethod {
  const v = String(value || "card").toLowerCase();

  if (
    v === "card" ||
    v === "bank_transfer" ||
    v === "virtual_account" ||
    v === "qris" ||
    v === "ewallet"
  ) {
    return v;
  }

  return "card";
}

function normalizeGateway(
  value: unknown,
  paymentMethod: TetamoPaymentMethod
): TetamoGateway {
  const v = String(value || "").toLowerCase();

  if (v === "stripe" || v === "xendit") {
    return v;
  }

  if (paymentMethod === "card") return "stripe";
  return "xendit";
}

function normalizeUserType(value: unknown): TetamoUserType {
  return String(value || "").toLowerCase() === "agent" ? "agent" : "owner";
}

function normalizeProductType(value: unknown): TetamoProductType {
  const v = String(value || "").toLowerCase();

  if (
    v === "listing" ||
    v === "membership" ||
    v === "addon" ||
    v === "education"
  ) {
    return v;
  }

  return "listing";
}

function normalizeFlow(
  value: unknown,
  fallbackFromProductType: TetamoProductType
): TetamoPaymentFlow {
  const v = String(value || "").toLowerCase();

  if (
    v === "new-listing" ||
    v === "renew-listing" ||
    v === "boost-listing" ||
    v === "homepage-spotlight" ||
    v === "agent-membership" ||
    v === "education-access"
  ) {
    return v;
  }

  if (fallbackFromProductType === "membership") return "agent-membership";
  if (fallbackFromProductType === "education") return "education-access";
  return "new-listing";
}

function normalizeBillingCycle(value: unknown): BillingCycle | null {
  const v = String(value || "").toLowerCase();

  if (v === "monthly" || v === "yearly") {
    return v;
  }

  return null;
}

function getMetadataString(
  metadata: PaymentMetadata | undefined,
  key: string
): string | null {
  const value = metadata?.[key];

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return null;
}

function getMetadataNumber(
  metadata: PaymentMetadata | undefined,
  key: string
): number | null {
  const value = metadata?.[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveSelectedBillingCycle(
  body: CreatePaymentBody
): BillingCycle | null {
  const metadata = (body?.metadata || {}) as PaymentMetadata;

  return (
    normalizeBillingCycle(metadata.selectedBillingCycle) ||
    normalizeBillingCycle(metadata.billingCycle) ||
    null
  );
}

function normalizeVehicleType(value: unknown): VehicleType | null {
  const v = String(value || "").toLowerCase();

  if (v === "car") return "car";
  if (v === "motor") return "motor";

  return null;
}

function resolveVehicleTypeFromMetadata(
  metadata: PaymentMetadata | undefined
): VehicleType | null {
  return (
    normalizeVehicleType(metadata?.vehicleType) ||
    normalizeVehicleType(metadata?.vehicle_type) ||
    normalizeVehicleType(metadata?.type) ||
    null
  );
}

function isVehicleListingPayment(
  payment: TetamoPayment,
  metadata: PaymentMetadata | undefined
) {
  if (payment.userType !== "owner") return false;
  if (payment.productType !== "listing") return false;

  return Boolean(resolveVehicleTypeFromMetadata(metadata));
}

function resolveProductConfig(
  productId: string,
  userType: TetamoUserType,
  productType: TetamoProductType
) {
  const normalizedProductId = String(productId || "").toLowerCase();

  if (!normalizedProductId) return null;

  if (productType === "membership" && userType === "agent") {
    return getAgentPackageById(normalizedProductId);
  }

  if (productType === "listing" && userType === "owner") {
    return getOwnerPackageById(normalizedProductId);
  }

  if (productType === "addon") {
    return getAddOnProductById(normalizedProductId);
  }

  if (productType === "education") {
    return getEducationProductById(normalizedProductId);
  }

  return getAnyProductById(normalizedProductId);
}

function buildProductName(
  payment: TetamoPayment,
  productConfig: any,
  selectedBillingCycle: BillingCycle | null
) {
  if (payment.productType === "membership") {
    const packageName = productConfig?.name || payment.productId;

    if (selectedBillingCycle === "monthly") {
      return `${packageName} - Monthly Billing`;
    }

    return `${packageName} - Yearly Billing`;
  }

  if (payment.productType === "education") {
    return productConfig?.name || "Education Pass";
  }

  if (payment.productType === "addon") {
    return productConfig?.name || `Tetamo Add-On - ${payment.productId}`;
  }

  if (payment.flow === "renew-listing") {
    return `Tetamo Listing Renewal - ${payment.listingCode || payment.productId}`;
  }

  return productConfig?.name || `Tetamo Listing Payment - ${payment.productId}`;
}

function buildPaymentText(
  payment: TetamoPayment,
  productConfig: any,
  selectedBillingCycle: BillingCycle | null
) {
  const fallbackName = buildProductName(
    payment,
    productConfig,
    selectedBillingCycle
  );

  if (payment.productType === "membership") {
    const packageName = productConfig?.name || payment.productId;

    if (selectedBillingCycle === "monthly") {
      return {
        productName: `${packageName} - Monthly Billing`,
        paymentTitle: `${packageName} Membership - Monthly Billing`,
        paymentDescription:
          productConfig?.paymentDescription ||
          `Monthly billing for ${packageName} membership.`,
        billingNote:
          productConfig?.monthlyBillingNote ||
          productConfig?.billingNote ||
          `Monthly billing is active for this package.`,
      };
    }

    return {
      productName: packageName,
      paymentTitle: productConfig?.paymentTitle || `${packageName} Membership`,
      paymentDescription:
        productConfig?.paymentDescription ||
        `Yearly billing for ${packageName} membership.`,
      billingNote:
        productConfig?.billingNote ||
        `Yearly billing is active for this package.`,
    };
  }

  if (payment.productType === "education") {
    return {
      productName: productConfig?.name || fallbackName,
      paymentTitle: productConfig?.paymentTitle || fallbackName,
      paymentDescription:
        productConfig?.paymentDescription || `Payment for ${fallbackName}.`,
      billingNote:
        productConfig?.billingNote || `Billing note for ${fallbackName}.`,
    };
  }

  if (payment.productType === "addon") {
    return {
      productName: productConfig?.name || fallbackName,
      paymentTitle: productConfig?.paymentTitle || fallbackName,
      paymentDescription:
        productConfig?.paymentDescription || `Payment for ${fallbackName}.`,
      billingNote:
        productConfig?.billingNote || `Billing note for ${fallbackName}.`,
    };
  }

  return {
    productName: productConfig?.name || fallbackName,
    paymentTitle: productConfig?.paymentTitle || fallbackName,
    paymentDescription:
      productConfig?.paymentDescription || `Payment for ${fallbackName}.`,
    billingNote:
      productConfig?.billingNote || `Billing note for ${fallbackName}.`,
  };
}

function buildDefaultSuccessUrl(
  origin: string,
  payment: TetamoPayment,
  metadata?: PaymentMetadata
): string {
  if (
    payment.flow === "education-access" ||
    payment.productType === "education"
  ) {
    const url = new URL("/education", origin);
    url.searchParams.set("payment", "success");
    url.searchParams.set("payment_id", payment.id);
    url.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
    url.searchParams.set("flow", payment.flow);
    url.searchParams.set("product", payment.productId);
    return url.toString();
  }

  if (payment.userType === "agent") {
    const url = new URL("/agentdashboard/tagihan", origin);
    url.searchParams.set("payment", "success");
    url.searchParams.set("payment_id", payment.id);
    url.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
    url.searchParams.set("flow", payment.flow);
    url.searchParams.set("product", payment.productId);
    return url.toString();
  }

  if (isVehicleListingPayment(payment, metadata)) {
    const vehicleType = resolveVehicleTypeFromMetadata(metadata) || "car";
    const url = new URL("/vehicles/create/success", origin);
    url.searchParams.set("payment", "success");
    url.searchParams.set("payment_id", payment.id);
    url.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
    url.searchParams.set("flow", payment.flow);
    url.searchParams.set("product", payment.productId);
    url.searchParams.set("vehicleType", vehicleType);
    url.searchParams.set("plan", payment.productId);

    if (payment.listingCode) {
      url.searchParams.set("kode", payment.listingCode);
    }

    return url.toString();
  }

  const url = new URL("/pemilik/iklan/sukses", origin);
  url.searchParams.set("payment", "success");
  url.searchParams.set("payment_id", payment.id);
  url.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
  url.searchParams.set("flow", payment.flow);
  url.searchParams.set("product", payment.productId);

  if (payment.productType === "listing") {
    url.searchParams.set("plan", payment.productId);
  }

  if (payment.listingCode) {
    url.searchParams.set("kode", payment.listingCode);
  }

  return url.toString();
}

function buildDefaultCancelUrl(
  origin: string,
  payment: TetamoPayment,
  metadata?: PaymentMetadata
): string {
  if (
    payment.flow === "education-access" ||
    payment.productType === "education"
  ) {
    const url = new URL("/education", origin);
    url.searchParams.set("payment", "cancelled");
    url.searchParams.set("payment_id", payment.id);
    url.searchParams.set("flow", payment.flow);
    url.searchParams.set("product", payment.productId);
    return url.toString();
  }

  if (payment.userType === "agent") {
    const url = new URL("/agentdashboard/tagihan", origin);
    url.searchParams.set("payment", "cancelled");
    url.searchParams.set("payment_id", payment.id);
    url.searchParams.set("flow", payment.flow);
    url.searchParams.set("product", payment.productId);
    return url.toString();
  }

  if (isVehicleListingPayment(payment, metadata)) {
    const vehicleType = resolveVehicleTypeFromMetadata(metadata) || "car";
    const url = new URL("/vehicles/create/payment", origin);
    url.searchParams.set("payment", "cancelled");
    url.searchParams.set("payment_id", payment.id);
    url.searchParams.set("flow", payment.flow);
    url.searchParams.set("product", payment.productId);
    url.searchParams.set("vehicleType", vehicleType);
    url.searchParams.set("plan", payment.productId);

    if (payment.listingCode) {
      url.searchParams.set("kode", payment.listingCode);
    }

    return url.toString();
  }

  const url = new URL("/pemilik/iklan/pembayaran", origin);
  url.searchParams.set("payment", "cancelled");
  url.searchParams.set("payment_id", payment.id);

  if (payment.flow === "renew-listing") {
    url.searchParams.set("action", "renew");
  }

  if (
    payment.flow === "boost-listing" ||
    payment.flow === "homepage-spotlight"
  ) {
    url.searchParams.set("flow", "addon");
    url.searchParams.set("product", payment.productId);
  } else {
    url.searchParams.set("flow", payment.flow);
  }

  if (payment.productType === "listing") {
    url.searchParams.set("plan", payment.productId);
  }

  if (payment.listingCode) {
    url.searchParams.set("kode", payment.listingCode);
  }

  return url.toString();
}

function resolveAuthoritativeAmount(
  productId: string,
  userType: TetamoUserType,
  productType: TetamoProductType,
  fallbackAmount: number,
  selectedBillingCycle: BillingCycle | null
) {
  const normalizedProductId = String(productId || "").toLowerCase();

  if (productType === "membership" && userType === "agent") {
    const agentPackage: any = getAgentPackageById(normalizedProductId);

    if (agentPackage) {
      if (
        selectedBillingCycle === "monthly" &&
        typeof agentPackage.monthlyPriceIdr === "number" &&
        agentPackage.monthlyPriceIdr > 0
      ) {
        return agentPackage.monthlyPriceIdr;
      }

      if (
        typeof agentPackage.priceIdr === "number" &&
        agentPackage.priceIdr > 0
      ) {
        return agentPackage.priceIdr;
      }
    }
  }

  if (productType === "education") {
    const educationProduct = getEducationProductById(normalizedProductId);

    if (
      educationProduct &&
      typeof educationProduct.priceIdr === "number" &&
      educationProduct.priceIdr > 0
    ) {
      return educationProduct.priceIdr;
    }
  }

  if (productType === "listing" && userType === "owner") {
    const ownerPackage = getOwnerPackageById(normalizedProductId);

    if (
      ownerPackage &&
      typeof ownerPackage.priceIdr === "number" &&
      ownerPackage.priceIdr > 0
    ) {
      return ownerPackage.priceIdr;
    }
  }

  if (productType === "addon") {
    const addOnProduct = getAddOnProductById(normalizedProductId);

    if (
      addOnProduct &&
      typeof addOnProduct.priceIdr === "number" &&
      addOnProduct.priceIdr > 0
    ) {
      return addOnProduct.priceIdr;
    }
  }

  const anyProduct = getAnyProductById(normalizedProductId);

  if (
    anyProduct &&
    typeof anyProduct.priceIdr === "number" &&
    anyProduct.priceIdr > 0
  ) {
    return anyProduct.priceIdr;
  }

  return Number(fallbackAmount || 0);
}

function mapPaymentType(payment: TetamoPayment): string {
  if (payment.productType === "education") return "education";
  if (payment.productType === "membership") return "package";

  if (payment.productType === "addon") {
    if (payment.productId === "homepage-spotlight") return "spotlight";
    return "boost";
  }

  if (payment.productType === "listing") {
    if (payment.productId === "featured") return "featured";
    return "listing_fee";
  }

  return "other";
}

function mapSourceRole(userType: TetamoUserType): "owner" | "agent" {
  return userType === "agent" ? "agent" : "owner";
}

function toStripeMinorAmount(currency: string, amountMajor: number) {
  const zeroDecimalCurrencies = new Set([
    "bif",
    "clp",
    "djf",
    "gnf",
    "jpy",
    "kmf",
    "krw",
    "mga",
    "pyg",
    "rwf",
    "ugx",
    "vnd",
    "vuv",
    "xaf",
    "xof",
    "xpf",
  ]);

  const normalizedCurrency = String(currency || "idr").toLowerCase();

  if (zeroDecimalCurrencies.has(normalizedCurrency)) {
    return Math.round(amountMajor);
  }

  return Math.round(amountMajor * 100);
}

async function getAuthenticatedUserIdFromBearer(req: Request) {
  if (!authClient) return null;

  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization") || "";

  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const accessToken = authHeader.slice(7).trim();
  if (!accessToken) return null;

  const { data, error } = await authClient.auth.getUser(accessToken);
  if (error || !data.user) {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
  };
}

export async function POST(req: Request) {
  try {
    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Supabase server environment is not configured. Check SUPABASE URL and SERVICE ROLE KEY.",
        },
        { status: 500 }
      );
    }

    const body = (await req.json()) as CreatePaymentBody;
    const bodyMetadata = (body?.metadata || {}) as PaymentMetadata;

    const paymentMethod = normalizePaymentMethod(body?.paymentMethod);
    const userType = normalizeUserType(body?.userType);
    const productType = normalizeProductType(body?.productType);
    const flow = normalizeFlow(body?.flow, productType);
    const gateway = normalizeGateway(body?.gateway, paymentMethod);
    const selectedBillingCycle = resolveSelectedBillingCycle(body);

    const requestedAmount = Number(body?.amount || 0);
    const authoritativeAmount = resolveAuthoritativeAmount(
      String(body?.productId || ""),
      userType,
      productType,
      requestedAmount,
      selectedBillingCycle
    );

    const verifiedUser = await getAuthenticatedUserIdFromBearer(req);
    const bodyUserId = String(body?.userId || "").trim();

    if (verifiedUser?.id && bodyUserId && verifiedUser.id !== bodyUserId) {
      return NextResponse.json(
        {
          success: false,
          message: "Authenticated user does not match request user.",
        },
        { status: 403 }
      );
    }

    const effectiveUserId = verifiedUser?.id || bodyUserId;

    const paymentRequest: TetamoPayment = {
      id: body?.id ?? crypto.randomUUID(),
      userId: effectiveUserId,
      userType,
      flow,
      productId: String(body?.productId || ""),
      productType,
      listingCode: body?.listingCode || "",
      amount: authoritativeAmount,
      currency: "IDR",
      autoRenew: Boolean(body?.autoRenew),
      status: "pending",
      paymentMethod,
      gateway,
      gatewayReferenceId: undefined,
      gatewayCheckoutUrl: undefined,
      createdAt: body?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paidAt: undefined,
      expiresAt: undefined,
      metadata: {
        ...bodyMetadata,
        selectedBillingCycle:
          selectedBillingCycle ||
          getMetadataString(bodyMetadata, "selectedBillingCycle"),
      },
    };

    if (!paymentRequest.userId) {
      return NextResponse.json(
        { success: false, message: "userId is required." },
        { status: 400 }
      );
    }

    if (!paymentRequest.productId) {
      return NextResponse.json(
        { success: false, message: "productId is required." },
        { status: 400 }
      );
    }

    if (!paymentRequest.amount || paymentRequest.amount <= 0) {
      return NextResponse.json(
        { success: false, message: "amount must be greater than 0." },
        { status: 400 }
      );
    }

    const productConfig = resolveProductConfig(
      paymentRequest.productId,
      paymentRequest.userType,
      paymentRequest.productType
    );

    if (!productConfig) {
      return NextResponse.json(
        { success: false, message: "Product configuration not found." },
        { status: 400 }
      );
    }

    const textData = buildPaymentText(
      paymentRequest,
      productConfig,
      selectedBillingCycle
    );

    const requestOrigin = new URL(req.url).origin;
    const successUrl =
      body.successUrl ||
      buildDefaultSuccessUrl(requestOrigin, paymentRequest, bodyMetadata);
    const cancelUrl =
      body.cancelUrl ||
      buildDefaultCancelUrl(requestOrigin, paymentRequest, bodyMetadata);

    const propertyId =
      getMetadataString(bodyMetadata, "existingPropertyId") || null;
    const propertyCodeSnapshot =
      getMetadataString(bodyMetadata, "existingPropertyCode") ||
      paymentRequest.listingCode ||
      null;
    const propertyTitleSnapshotFromBody =
      getMetadataString(bodyMetadata, "existingPropertyTitle") || null;

    let propertySnapshot: PropertyRow | null = null;

    if (propertyId) {
      const { data: propertyData, error: propertyError } = await admin
        .from("properties")
        .select("id, user_id, title, kode, province, city")
        .eq("id", propertyId)
        .maybeSingle();

      if (propertyError) {
        return NextResponse.json(
          {
            success: false,
            message: propertyError.message || "Failed to validate property.",
          },
          { status: 500 }
        );
      }

      if (!propertyData) {
        return NextResponse.json(
          {
            success: false,
            message: "Referenced property was not found.",
          },
          { status: 404 }
        );
      }

      if (
        propertyData.user_id &&
        propertyData.user_id !== paymentRequest.userId
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "You are not allowed to create a payment for this property.",
          },
          { status: 403 }
        );
      }

      propertySnapshot = propertyData as PropertyRow;
    }

    const { data: profileData } = await admin
      .from("profiles")
      .select("id, full_name, phone, email")
      .eq("id", paymentRequest.userId)
      .maybeSingle();

    const profile = (profileData as ProfileRow | null) ?? null;

    const paymentType = mapPaymentType(paymentRequest);
    const sourceRole = mapSourceRole(paymentRequest.userType);
    const audienceSnapshot =
      productType === "education"
        ? String((productConfig as any)?.audience || "all")
        : null;
    const durationDays =
      typeof (productConfig as any)?.durationDays === "number"
        ? Number((productConfig as any).durationDays)
        : null;
    const planName =
      paymentRequest.productType === "listing"
        ? paymentRequest.productId
        : String(productConfig?.name || paymentRequest.productId);

    const vehicleType = resolveVehicleTypeFromMetadata(bodyMetadata);

    const metadata: Record<string, unknown> = {
      ...(paymentRequest.metadata ?? {}),
      request_source: "api/payments/create",
      requested_amount_idr: requestedAmount,
      authoritative_amount_idr: authoritativeAmount,
      selected_billing_cycle: selectedBillingCycle,
      payment_title: textData.paymentTitle,
      payment_description: textData.paymentDescription,
      billing_note: textData.billingNote,
      stripe_currency: "idr",
      stripe_minor_amount: toStripeMinorAmount("idr", paymentRequest.amount),
      vehicle_type: vehicleType,
    };

    const initialInsert = {
      id: paymentRequest.id,
      user_id: paymentRequest.userId,
      property_id: propertySnapshot?.id || propertyId,
      source_role: sourceRole,
      payment_type: paymentType,
      product_id: paymentRequest.productId,
      product_name_snapshot: textData.productName,
      product_type: paymentRequest.productType,
      audience_snapshot: audienceSnapshot,
      status: "pending",
      currency: "idr",
      amount_subtotal: paymentRequest.amount,
      amount_discount: 0,
      amount_tax: 0,
      amount_total: paymentRequest.amount,
      description: textData.paymentDescription,
      plan_name: planName,
      duration_days: durationDays,
      property_title_snapshot:
        propertySnapshot?.title || propertyTitleSnapshotFromBody,
      property_code_snapshot: propertySnapshot?.kode || propertyCodeSnapshot,
      customer_name: profile?.full_name || null,
      customer_email: verifiedUser?.email || profile?.email || null,
      customer_phone: profile?.phone || null,
      checkout_url: null,
      metadata,
      created_at: paymentRequest.createdAt,
      updated_at: paymentRequest.updatedAt,
    };

    const { error: insertError } = await admin
      .from("payment_transactions")
      .insert(initialInsert);

    if (insertError) {
      console.error("payment_transactions insert error:", insertError);

      return NextResponse.json(
        {
          success: false,
          message:
            insertError.message ||
            "Failed to create payment transaction record.",
        },
        { status: 500 }
      );
    }

    if (gateway !== "stripe") {
      const nowIso = new Date().toISOString();

      await admin
        .from("payment_transactions")
        .update({
          status: "failed",
          failed_at: nowIso,
          updated_at: nowIso,
          admin_notes: "Requested gateway is not implemented yet.",
          metadata: {
            ...metadata,
            gateway_not_implemented: gateway,
          },
        })
        .eq("id", paymentRequest.id);

      return NextResponse.json(
        {
          success: false,
          message: "Selected payment method is not implemented yet.",
          paymentId: paymentRequest.id,
        },
        { status: 501 }
      );
    }

    if (!stripe) {
      const nowIso = new Date().toISOString();

      await admin
        .from("payment_transactions")
        .update({
          status: "failed",
          failed_at: nowIso,
          updated_at: nowIso,
          admin_notes: "STRIPE_SECRET_KEY is missing.",
        })
        .eq("id", paymentRequest.id);

      return NextResponse.json(
        {
          success: false,
          message: "Stripe is not configured.",
          paymentId: paymentRequest.id,
        },
        { status: 500 }
      );
    }

    const stripeMinorAmount = toStripeMinorAmount(
      "idr",
      paymentRequest.amount
    );

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      client_reference_id: paymentRequest.id,
      customer_email: verifiedUser?.email || profile?.email || undefined,
      invoice_creation: {
        enabled: true,
      },
      metadata: {
        payment_transaction_id: paymentRequest.id,
        user_id: paymentRequest.userId,
        property_id: propertySnapshot?.id || propertyId || "",
        source_role: sourceRole,
        payment_type: paymentType,
        product_id: paymentRequest.productId,
        product_type: paymentRequest.productType,
        flow: paymentRequest.flow,
        listing_code: propertySnapshot?.kode || propertyCodeSnapshot || "",
        selected_billing_cycle: selectedBillingCycle || "",
        vehicle_type: vehicleType || "",
      },
      line_items: [
        {
          price_data: {
            currency: "idr",
            product_data: {
              name: textData.productName,
              description: textData.paymentDescription || undefined,
            },
            unit_amount: stripeMinorAmount,
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    const nowIso = new Date().toISOString();

    const { error: updateError } = await admin
      .from("payment_transactions")
      .update({
        status: "checkout_created",
        stripe_checkout_session_id: session.id,
        stripe_customer_id:
          typeof session.customer === "string" ? session.customer : null,
        checkout_url: session.url ?? null,
        checkout_expires_at: session.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : null,
        updated_at: nowIso,
        metadata: {
          ...metadata,
          stripe_checkout_session_id: session.id,
          stripe_checkout_url: session.url ?? null,
          stripe_checkout_expires_at: session.expires_at ?? null,
          success_url: successUrl,
          cancel_url: cancelUrl,
        },
      })
      .eq("id", paymentRequest.id);

    if (updateError) {
      console.error("payment_transactions update error:", updateError);

      return NextResponse.json(
        {
          success: false,
          message:
            updateError.message ||
            "Payment created but failed to update checkout data.",
          paymentId: paymentRequest.id,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      gateway: paymentRequest.gateway,
      paymentMethod: paymentRequest.paymentMethod,
      checkoutUrl: session.url ?? "",
      paymentId: paymentRequest.id,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error("Payment create error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Payment creation failed",
      },
      { status: 500 }
    );
  }
}