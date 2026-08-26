import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

import {
  acknowledgeGooglePlaySubscription,
  getGooglePlayObfuscatedAccountId,
  getGooglePlaySubscriptionPurchase,
} from "../../../../../lib/google-play-server";

import { activateAgentMembership } from "../../../../../lib/agent-membership-server";

import { getAgentPackageById } from "../../../../data/pricelist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(
        supabaseUrl,
        supabaseServiceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )
    : null;

type TetamoAgentPackageId =
  | "silver"
  | "gold"
  | "agent-pro";

type TetamoBillingCycle =
  | "monthly"
  | "yearly";

const GOOGLE_SUBSCRIPTIONS = {
  tetamo_agent_silver: {
    packageId: "silver",
    basePlans: ["yearly"],
  },

  tetamo_agent_gold: {
    packageId: "gold",
    basePlans: ["yearly"],
  },

  tetamo_agent_pro: {
    packageId: "agent-pro",
    basePlans: ["yearly", "monthly"],
  },
} as const satisfies Record<
  string,
  {
    packageId: TetamoAgentPackageId;
    basePlans: readonly TetamoBillingCycle[];
  }
>;

const ACCESS_STATES = new Set([
  "SUBSCRIPTION_STATE_ACTIVE",
  "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
  "SUBSCRIPTION_STATE_CANCELED",
]);

function json(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, {
    status,
  });
}

function asObject(
  value: unknown
): Record<string, any> {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function getBearerToken(
  req: Request
) {
  const header =
    req.headers.get("authorization") ||
    req.headers.get("Authorization") ||
    "";

  if (
    !header
      .toLowerCase()
      .startsWith("bearer ")
  ) {
    return null;
  }

  return (
    header.slice(7).trim() ||
    null
  );
}

async function getAuthenticatedUser(
  req: Request
) {
  if (!admin) {
    return null;
  }

  const token =
    getBearerToken(req);

  if (!token) {
    return null;
  }

  const {
    data,
    error,
  } =
    await admin.auth.getUser(
      token
    );

  if (
    error ||
    !data.user
  ) {
    return null;
  }

  return data.user;
}

function deterministicGooglePaymentId(
  stableTransactionKey: string
) {
  const hex =
    crypto
      .createHash("sha256")
      .update(
        `tetamo-google:${stableTransactionKey}`
      )
      .digest("hex")
      .slice(0, 32)
      .split("");

  hex[12] = "5";

  hex[16] = (
    (parseInt(hex[16], 16) & 0x3) |
    0x8
  ).toString(16);

  const value =
    hex.join("");

  return [
    value.slice(0, 8),
    value.slice(8, 12),
    value.slice(12, 16),
    value.slice(16, 20),
    value.slice(20, 32),
  ].join("-");
}

function validIso(
  value: unknown
) {
  const text =
    String(value || "").trim();

  if (!text) {
    return null;
  }

  const parsed =
    new Date(text);

  if (
    !Number.isFinite(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return parsed.toISOString();
}

function errorMessage(
  error: unknown
) {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return String(
    error || "Unknown error"
  );
}

export async function POST(
  req: Request
) {
  try {
    if (!admin) {
      return json(
        {
          success: false,
          message:
            "Server database configuration is missing.",
        },
        500
      );
    }

    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      return json(
        {
          success: false,
          message:
            "Authentication required.",
        },
        401
      );
    }

    const body =
      await req.json().catch(
        () => ({})
      );

    const purchaseToken =
      String(
        body?.purchaseToken ||
          ""
      ).trim();

    const requestedProductId =
      String(
        body?.productId ||
          ""
      ).trim();

    const requestedBasePlanId =
      String(
        body?.basePlanId ||
          ""
      )
        .trim()
        .toLowerCase();

    if (
      !purchaseToken ||
      !requestedProductId ||
      !requestedBasePlanId
    ) {
      return json(
        {
          success: false,
          message:
            "purchaseToken, productId and basePlanId are required.",
        },
        400
      );
    }

    const configured =
      GOOGLE_SUBSCRIPTIONS[
        requestedProductId as keyof typeof GOOGLE_SUBSCRIPTIONS
      ];

    if (!configured) {
      return json(
        {
          success: false,
          message:
            "Unsupported Google Play subscription.",
        },
        400
      );
    }

    if (
      !configured.basePlans.includes(
        requestedBasePlanId as never
      )
    ) {
      return json(
        {
          success: false,
          message:
            "Unsupported Google Play base plan.",
        },
        400
      );
    }

    const purchase =
      await getGooglePlaySubscriptionPurchase(
        purchaseToken
      );

    const subscriptionState =
      String(
        purchase.subscriptionState ||
          ""
      );

    if (
      !ACCESS_STATES.has(
        subscriptionState
      )
    ) {
      return json(
        {
          success: false,
          verified: false,
          message:
            `Google subscription is not entitled in state ${subscriptionState || "UNKNOWN"}.`,
        },
        409
      );
    }

    const lineItems =
      Array.isArray(
        purchase.lineItems
      )
        ? purchase.lineItems
        : [];

    const matchingItems =
      lineItems.filter(
        (rawItem) => {
          const item =
            asObject(rawItem);

          const offerDetails =
            asObject(
              item.offerDetails
            );

          return (
            String(
              item.productId ||
                ""
            ) ===
              requestedProductId &&
            String(
              offerDetails
                .basePlanId ||
                ""
            )
              .toLowerCase() ===
              requestedBasePlanId
          );
        }
      );

    if (
      matchingItems.length !== 1
    ) {
      return json(
        {
          success: false,
          verified: false,
          message:
            "Google subscription product/base plan could not be matched uniquely.",
        },
        409
      );
    }

    const lineItem =
      asObject(
        matchingItems[0]
      );

    const expiresAtIso =
      validIso(
        lineItem.expiryTime
      );

    if (!expiresAtIso) {
      return json(
        {
          success: false,
          verified: false,
          message:
            "Google subscription expiry is missing or invalid.",
        },
        409
      );
    }

    if (
      new Date(
        expiresAtIso
      ).getTime() <=
      Date.now()
    ) {
      return json(
        {
          success: false,
          verified: false,
          message:
            "Google subscription has expired.",
        },
        409
      );
    }

    const externalAccountIdentifiers =
      asObject(
        purchase.externalAccountIdentifiers
      );

    const actualAccountId =
      String(
        externalAccountIdentifiers
          .obfuscatedExternalAccountId ||
          ""
      ).trim();

    const expectedAccountId =
      getGooglePlayObfuscatedAccountId(
        user.id
      );

    if (
      !actualAccountId ||
      actualAccountId !==
        expectedAccountId
    ) {
      return json(
        {
          success: false,
          verified: false,
          message:
            "Google purchase is not attributed to the authenticated Tetamo account.",
        },
        409
      );
    }

    const packageId =
      configured.packageId;

    const billingCycle =
      requestedBasePlanId as
        TetamoBillingCycle;

    const packageConfig =
      getAgentPackageById(
        packageId
      );

    if (!packageConfig) {
      return json(
        {
          success: false,
          message:
            "Tetamo Agent package configuration was not found.",
        },
        500
      );
    }

    const paidAtIso =
      validIso(
        purchase.startTime
      ) ||
      new Date()
        .toISOString();

    const amountTotal =
      billingCycle ===
        "monthly" &&
      packageConfig.monthlyPriceIdr
        ? packageConfig
            .monthlyPriceIdr
        : packageConfig
            .priceIdr;

    const durationDays =
      Math.max(
        1,
        Math.ceil(
          (
            new Date(
              expiresAtIso
            ).getTime() -
            new Date(
              paidAtIso
            ).getTime()
          ) /
            86_400_000
        )
      );

    const latestOrderId =
      String(
        lineItem
          .latestSuccessfulOrderId ||
          ""
      ).trim();

    const stableTransactionKey =
      latestOrderId
        ? `order:${latestOrderId}`
        : `token:${purchaseToken}`;

    const paymentId =
      deterministicGooglePaymentId(
        stableTransactionKey
      );

    const {
      data:
        existingPayment,
      error:
        existingPaymentError,
    } =
      await admin
        .from(
          "payment_transactions"
        )
        .select(
          "id, user_id, metadata"
        )
        .eq(
          "id",
          paymentId
        )
        .maybeSingle();

    if (
      existingPaymentError
    ) {
      throw existingPaymentError;
    }

    if (
      existingPayment &&
      existingPayment.user_id !==
        user.id
    ) {
      return json(
        {
          success: false,
          message:
            "Google Play transaction is already associated with another account.",
        },
        409
      );
    }

    const previousMetadata =
      asObject(
        existingPayment?.metadata
      );

    const previousActivation =
      asObject(
        previousMetadata.activation
      );

    const acknowledgementState =
      String(
        purchase
          .acknowledgementState ||
          ""
      );

    if (
      existingPayment &&
      previousActivation.done ===
        true
    ) {
      if (
        acknowledgementState ===
        "ACKNOWLEDGEMENT_STATE_PENDING"
      ) {
        await acknowledgeGooglePlaySubscription(
          requestedProductId,
          purchaseToken
        );
      }

      return json({
        success: true,
        verified: true,
        alreadyProcessed: true,
        serverFinalized: true,
        shouldFinishTransaction:
          false,
        paymentId,
        googleProductId:
          requestedProductId,
        basePlanId:
          requestedBasePlanId,
        packageId,
        billingCycle,
        expiresAt:
          expiresAtIso,
        activation:
          previousActivation,
      });
    }

    const nowIso =
      new Date()
        .toISOString();

    const purchaseTokenSha256 =
      crypto
        .createHash("sha256")
        .update(
          purchaseToken
        )
        .digest("hex");

    const autoRenewingPlan =
      asObject(
        lineItem.autoRenewingPlan
      );

    const autoRenewEnabled =
      autoRenewingPlan
        .autoRenewEnabled ===
      true;

    const metadata: Record<
      string,
      unknown
    > = {
      ...previousMetadata,

      request_source:
        "api/google/play/verify-subscription",

      gateway:
        "google_play",

      payment_method:
        "google_play",

      packageId,
      packageName:
        packageConfig.name,

      packageTermDays:
        durationDays,

      listingLimit:
        packageConfig
          .maxListings,

      selectedBillingCycle:
        billingCycle,

      selected_billing_cycle:
        billingCycle,

      google_product_id:
        requestedProductId,

      google_base_plan_id:
        requestedBasePlanId,

      google_purchase_token_sha256:
        purchaseTokenSha256,

      google_latest_order_id:
        latestOrderId ||
        null,

      google_subscription_state:
        subscriptionState,

      google_acknowledgement_state:
        acknowledgementState,

      google_auto_renew:
        autoRenewEnabled,

      google_region_code:
        purchase.regionCode ||
        null,

      google_purchase_start:
        paidAtIso,

      google_expires_at:
        expiresAtIso,

      google_test_purchase:
        Boolean(
          purchase.testPurchase
        ),

      verified_at:
        nowIso,
    };

    const {
      data:
        profileData,
    } =
      await admin
        .from("profiles")
        .select(
          "full_name, phone, email"
        )
        .eq(
          "id",
          user.id
        )
        .maybeSingle();

    const paymentRow = {
      id: paymentId,
      user_id:
        user.id,
      property_id:
        null,
      source_role:
        "agent",
      payment_type:
        "package",
      product_id:
        packageId,
      product_name_snapshot:
        packageConfig.name,
      product_type:
        "membership",
      audience_snapshot:
        null,
      status:
        "paid",
      currency:
        "idr",
      amount_subtotal:
        amountTotal,
      amount_discount:
        0,
      amount_tax:
        0,
      amount_total:
        amountTotal,
      description:
        `${packageConfig.name} Membership - Google Play`,
      plan_name:
        packageConfig.name,
      duration_days:
        durationDays,
      property_title_snapshot:
        null,
      property_code_snapshot:
        null,
      customer_name:
        profileData
          ?.full_name ||
        null,
      customer_email:
        user.email ||
        profileData?.email ||
        null,
      customer_phone:
        profileData
          ?.phone ||
        null,
      checkout_url:
        null,
      paid_at:
        paidAtIso,
      metadata,
      created_at:
        existingPayment
          ? undefined
          : paidAtIso,
      updated_at:
        nowIso,
    };

    const cleanPaymentRow =
      Object.fromEntries(
        Object.entries(
          paymentRow
        ).filter(
          (
            [, value]
          ) =>
            value !==
            undefined
        )
      );

    const {
      error:
        paymentUpsertError,
    } =
      await admin
        .from(
          "payment_transactions"
        )
        .upsert(
          cleanPaymentRow,
          {
            onConflict:
              "id",
          }
        );

    if (
      paymentUpsertError
    ) {
      throw paymentUpsertError;
    }

    const activationResult =
      await activateAgentMembership(
        {
          admin,
          payment: {
            id:
              paymentId,
            user_id:
              user.id,
            payment_type:
              "package",
            product_id:
              packageId,
            product_name_snapshot:
              packageConfig.name,
            product_type:
              "membership",
            duration_days:
              durationDays,
            amount_total:
              amountTotal,
            currency:
              "idr",
            metadata,
          },
          paidAtIso,
          activatedFrom:
            "google_play_verify_subscription",
          membershipExpiresAtIso:
            expiresAtIso,
        }
      );

    await admin
      .from(
        "agent_memberships"
      )
      .update({
        auto_renew:
          autoRenewEnabled,
        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "payment_id",
        paymentId
      );

    const activation = {
      done: true,
      processedAt:
        new Date()
          .toISOString(),
      processedBy:
        "google_play_verify_subscription",
      ...activationResult,
    };

    const {
      error:
        finalUpdateError,
    } =
      await admin
        .from(
          "payment_transactions"
        )
        .update({
          metadata: {
            ...metadata,
            activation,
          },
          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          paymentId
        );

    if (
      finalUpdateError
    ) {
      throw finalUpdateError;
    }

    if (
      acknowledgementState ===
      "ACKNOWLEDGEMENT_STATE_PENDING"
    ) {
      await acknowledgeGooglePlaySubscription(
        requestedProductId,
        purchaseToken
      );
    }

    return json({
      success: true,
      verified: true,
      serverFinalized: true,
      shouldFinishTransaction:
        false,

      paymentId,

      googleProductId:
        requestedProductId,

      basePlanId:
        requestedBasePlanId,

      packageId,

      packageName:
        packageConfig.name,

      billingCycle,

      subscriptionState,

      autoRenew:
        autoRenewEnabled,

      expiresAt:
        expiresAtIso,

      activation,
    });
  } catch (error) {
    console.error(
      "Google Play subscription verification error:",
      error
    );

    return json(
      {
        success: false,
        verified: false,
        message:
          errorMessage(
            error
          ),
      },
      500
    );
  }
}
