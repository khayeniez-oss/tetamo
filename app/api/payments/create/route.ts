import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import {
  getAnyProductById,
  getOwnerPackageById,
  getAgentPackageById,
  getAddOnProductById,
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

type CreatePaymentBody = Partial<TetamoPayment> & {
  successUrl?: string;
  cancelUrl?: string;
};

type PaymentMetadata = Record<
  string,
  string | number | boolean | null | undefined
>;

type BillingCycle = "monthly" | "yearly";

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

  if (v === "membership" || v === "addon") return v;
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
    v === "agent-membership"
  ) {
    return v;
  }

  if (fallbackFromProductType === "membership") return "agent-membership";
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

function resolveSelectedBillingCycle(body: CreatePaymentBody): BillingCycle | null {
  const metadata = (body?.metadata || {}) as PaymentMetadata;

  return (
    normalizeBillingCycle(metadata.selectedBillingCycle) ||
    normalizeBillingCycle(metadata.billingCycle) ||
    null
  );
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
  const fallbackName = buildProductName(payment, productConfig, selectedBillingCycle);

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

function buildDefaultSuccessUrl(origin: string, payment: TetamoPayment): string {
  if (payment.userType === "agent") {
    const url = new URL("/agentdashboard/tagihan", origin);
    url.searchParams.set("payment", "success");
    url.searchParams.set("payment_id", payment.id);
    url.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
    url.searchParams.set("flow", payment.flow);
    url.searchParams.set("product", payment.productId);
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

function buildDefaultCancelUrl(origin: string, payment: TetamoPayment): string {
  if (payment.userType === "agent") {
    const url = new URL("/agentdashboard/tagihan", origin);
    url.searchParams.set("payment", "cancelled");
    url.searchParams.set("payment_id", payment.id);
    url.searchParams.set("flow", payment.flow);
    url.searchParams.set("product", payment.productId);
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

function toStripeAmountIdr(amount: number) {
  return Math.round(amount * 100);
}

function resolveAuthoritativeAmount(
  productId: string,
  userType: TetamoUserType,
  productType: TetamoProductType,
  fallbackAmount: number,
  selectedBillingCycle: BillingCycle | null
) {
  const normalizedProductId = String(productId || "").toLowerCase();

  if (
    productType === "membership" &&
    userType === "agent"
  ) {
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

  if (anyProduct && typeof anyProduct.priceIdr === "number" && anyProduct.priceIdr > 0) {
    return anyProduct.priceIdr;
  }

  return Number(fallbackAmount || 0);
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

    const paymentRequest: TetamoPayment = {
      id: body?.id ?? crypto.randomUUID(),
      userId: String(body?.userId || ""),
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
        {
          success: false,
          message: "userId is required.",
        },
        { status: 400 }
      );
    }

    if (!paymentRequest.productId) {
      return NextResponse.json(
        {
          success: false,
          message: "productId is required.",
        },
        { status: 400 }
      );
    }

    if (!paymentRequest.amount || paymentRequest.amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "amount must be greater than 0.",
        },
        { status: 400 }
      );
    }

    const productConfig = resolveProductConfig(
      paymentRequest.productId,
      paymentRequest.userType,
      paymentRequest.productType
    );

    const textData = buildPaymentText(
      paymentRequest,
      productConfig,
      selectedBillingCycle
    );

    const requestOrigin = new URL(req.url).origin;
    const successUrl =
      body.successUrl || buildDefaultSuccessUrl(requestOrigin, paymentRequest);
    const cancelUrl =
      body.cancelUrl || buildDefaultCancelUrl(requestOrigin, paymentRequest);

    const initialInsert = {
      id: paymentRequest.id,
      user_id: paymentRequest.userId,
      user_type: paymentRequest.userType,

      flow: paymentRequest.flow,
      product_id: paymentRequest.productId,
      product_type: paymentRequest.productType,
      listing_code: paymentRequest.listingCode || null,

      product_name: textData.productName,
      payment_title: textData.paymentTitle,
      payment_description: textData.paymentDescription,
      billing_note: textData.billingNote,

      amount: paymentRequest.amount,
      currency: paymentRequest.currency,

      auto_renew: paymentRequest.autoRenew,
      status: "pending",

      payment_method: paymentRequest.paymentMethod,
      gateway: paymentRequest.gateway,
      gateway_reference: null,
      checkout_url: null,

      provider: paymentRequest.gateway,
      method: paymentRequest.paymentMethod,
      reference: null,

      paid_at: null,
      expires_at: null,

      metadata: paymentRequest.metadata ?? {},
      raw_response: {
        stage: "created",
        requestedAmount,
        authoritativeAmount,
        selectedBillingCycle,
      },

      created_at: paymentRequest.createdAt,
      updated_at: paymentRequest.updatedAt,
    };

    const { error: insertError } = await admin
      .from("payments")
      .insert(initialInsert);

    if (insertError) {
      console.error("Payments insert error:", insertError);

      return NextResponse.json(
        {
          success: false,
          message: insertError.message || "Failed to create payment record.",
        },
        { status: 500 }
      );
    }

    if (gateway !== "stripe") {
      const nowIso = new Date().toISOString();

      await admin
        .from("payments")
        .update({
          status: "failed",
          failed_at: nowIso,
          updated_at: nowIso,
          raw_response: {
            stage: "gateway_not_implemented",
            gateway,
            message: "Xendit checkout is not implemented yet.",
            selectedBillingCycle,
          },
        })
        .eq("id", paymentRequest.id);

      return NextResponse.json(
        {
          success: false,
          message: "Xendit checkout is not implemented yet.",
          paymentId: paymentRequest.id,
        },
        { status: 501 }
      );
    }

    if (!stripe) {
      const nowIso = new Date().toISOString();

      await admin
        .from("payments")
        .update({
          status: "failed",
          failed_at: nowIso,
          updated_at: nowIso,
          raw_response: {
            stage: "stripe_not_configured",
            message: "STRIPE_SECRET_KEY is missing.",
            selectedBillingCycle,
          },
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

    const stripeAmount = toStripeAmountIdr(paymentRequest.amount);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      client_reference_id: paymentRequest.id,

      metadata: {
        paymentId: paymentRequest.id,
        userId: paymentRequest.userId,
        userType: paymentRequest.userType,
        flow: paymentRequest.flow,
        productId: paymentRequest.productId,
        productType: paymentRequest.productType,
        listingCode: paymentRequest.listingCode || "",
        selectedBillingCycle: selectedBillingCycle || "",
      },

      line_items: [
        {
          price_data: {
            currency: "idr",
            product_data: {
              name: textData.productName,
            },
            unit_amount: stripeAmount,
          },
          quantity: 1,
        },
      ],

      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    const nowIso = new Date().toISOString();

    const { error: updateError } = await admin
      .from("payments")
      .update({
        product_name: textData.productName,
        payment_title: textData.paymentTitle,
        payment_description: textData.paymentDescription,
        billing_note: textData.billingNote,
        checkout_url: session.url ?? null,
        gateway_reference: session.id,
        reference: session.id,
        provider: paymentRequest.gateway,
        method: paymentRequest.paymentMethod,
        updated_at: nowIso,
        expires_at: session.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : null,
        raw_response: {
          stage: "checkout_created",
          gateway: paymentRequest.gateway,
          sessionId: session.id,
          checkoutUrl: session.url,
          expiresAt: session.expires_at ?? null,
          successUrl,
          cancelUrl,
          requestedAmount,
          authoritativeAmount,
          selectedBillingCycle,
          stripeAmount,
        },
      })
      .eq("id", paymentRequest.id);

    if (updateError) {
      console.error("Payments update error:", updateError);

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