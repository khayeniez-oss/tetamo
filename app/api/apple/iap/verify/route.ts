import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

import {
  getAppleIapServerClient,
  verifyAppleSignedTransaction,
  TETAMO_PARTNER_IOS_BUNDLE_ID,
  type AppleIapEnvironment,
} from "../../../../../lib/apple-iap-server";

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

const APPLE_PRODUCT_TO_PACKAGE = {
  "tetamo.agent.silver.yearly": "silver",
  "tetamo.agent.gold.yearly": "gold",
  "tetamo.agent.pro.yearly": "agent-pro",
} as const;

type TetamoAgentPackageId =
  (typeof APPLE_PRODUCT_TO_PACKAGE)[keyof typeof APPLE_PRODUCT_TO_PACKAGE];

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

  const token =
    header.slice(7).trim();

  return token || null;
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
  } = await admin.auth.getUser(
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

function errorMessage(
  error: unknown
) {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return String(error || "Unknown error");
}

function deterministicApplePaymentId(
  transactionId: string
) {
  const hex =
    crypto
      .createHash("sha256")
      .update(
        `tetamo-apple:${transactionId}`
      )
      .digest("hex")
      .slice(0, 32)
      .split("");

  // Format deterministic hash as a valid UUID.
  hex[12] = "5";

  hex[16] = (
    (parseInt(hex[16], 16) & 0x3) |
    0x8
  ).toString(16);

  const value = hex.join("");

  return [
    value.slice(0, 8),
    value.slice(8, 12),
    value.slice(12, 16),
    value.slice(16, 20),
    value.slice(20, 32),
  ].join("-");
}

async function loadVerifiedAppleTransaction(
  transactionId: string
) {
  const attempts: Array<{
    environment: AppleIapEnvironment;
    error: string;
  }> = [];

  const environments: AppleIapEnvironment[] =
    [
      "production",
      "sandbox",
    ];

  for (
    const environment
    of environments
  ) {
    try {
      const response =
        await getAppleIapServerClient(
          environment
        ).getTransactionInfo(
          transactionId
        );

      const signedTransaction =
        String(
          response
            .signedTransactionInfo ||
            ""
        ).trim();

      if (!signedTransaction) {
        throw new Error(
          "Apple returned no signed transaction."
        );
      }

      const transaction =
        await verifyAppleSignedTransaction(
          signedTransaction,
          environment
        );

      return {
        environment,
        transaction,
        signedTransaction,
      };
    } catch (error) {
      attempts.push({
        environment,
        error:
          errorMessage(error),
      });
    }
  }

  throw new Error(
    `Apple transaction could not be verified. ${attempts
      .map(
        (item) =>
          `${item.environment}: ${item.error}`
      )
      .join(" | ")}`
  );
}

export async function POST(
  req: Request
) {
  if (!admin) {
    return json(
      {
        success: false,
        message:
          "Supabase admin client is not configured.",
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

  let body: Record<
    string,
    any
  >;

  try {
    body =
      asObject(
        await req.json()
      );
  } catch {
    return json(
      {
        success: false,
        message:
          "Invalid JSON request body.",
      },
      400
    );
  }

  const transactionId =
    String(
      body.transactionId || ""
    ).trim();

  const expectedPackageId =
    String(
      body.packageId || ""
    )
      .trim()
      .toLowerCase();

  const expectedBillingCycle =
    body.billingCycle ===
    "monthly"
      ? "monthly"
      : body.billingCycle ===
          "yearly"
        ? "yearly"
        : null;

  if (!transactionId) {
    return json(
      {
        success: false,
        message:
          "Apple transactionId is required.",
      },
      400
    );
  }

  try {
    const {
      environment,
      transaction,
      signedTransaction,
    } =
      await loadVerifiedAppleTransaction(
        transactionId
      );

    const tx =
      transaction as any;

    const verifiedTransactionId =
      String(
        tx.transactionId || ""
      ).trim();

    if (
      verifiedTransactionId !==
      transactionId
    ) {
      return json(
        {
          success: false,
          message:
            "Apple transaction ID does not match.",
        },
        400
      );
    }

    if (
      String(
        tx.bundleId || ""
      ) !==
      TETAMO_PARTNER_IOS_BUNDLE_ID
    ) {
      return json(
        {
          success: false,
          message:
            "Apple transaction belongs to another app.",
        },
        403
      );
    }

    const appleProductId =
      String(
        tx.productId || ""
      ).trim();

    const packageId =
      APPLE_PRODUCT_TO_PACKAGE[
        appleProductId as keyof typeof APPLE_PRODUCT_TO_PACKAGE
      ];

    if (!packageId) {
      return json(
        {
          success: false,
          message:
            "Apple product is not a Tetamo agent membership.",
        },
        400
      );
    }

    if (
      expectedPackageId &&
      expectedPackageId !==
        packageId
    ) {
      return json(
        {
          success: false,
          message:
            "Purchased Apple product does not match selected Tetamo package.",
        },
        409
      );
    }

    const packageConfig =
      getAgentPackageById(
        packageId
      );

    if (!packageConfig) {
      return json(
        {
          success: false,
          message:
            "Tetamo package configuration was not found.",
        },
        500
      );
    }

    const appAccountToken =
      String(
        tx.appAccountToken || ""
      )
        .trim()
        .toLowerCase();

    if (
      !appAccountToken ||
      appAccountToken !==
        user.id.toLowerCase()
    ) {
      return json(
        {
          success: false,
          message:
            "Apple purchase is not linked to the authenticated Tetamo account.",
        },
        403
      );
    }

    if (
      tx.revocationDate
    ) {
      return json(
        {
          success: false,
          message:
            "Apple transaction has been revoked.",
        },
        409
      );
    }

    const purchaseDateMs =
      Number(
        tx.purchaseDate
      );

    const expiresDateMs =
      Number(
        tx.expiresDate
      );

    if (
      !Number.isFinite(
        expiresDateMs
      )
    ) {
      return json(
        {
          success: false,
          message:
            "Apple subscription expiry is missing.",
        },
        400
      );
    }

    if (
      expiresDateMs <=
      Date.now()
    ) {
      return json(
        {
          success: false,
          message:
            "Apple subscription is already expired.",
        },
        409
      );
    }

    const paidAtIso =
      Number.isFinite(
        purchaseDateMs
      )
        ? new Date(
            purchaseDateMs
          ).toISOString()
        : new Date().toISOString();

    const expiresAtIso =
      new Date(
        expiresDateMs
      ).toISOString();

    const billingPlanType =
      String(
        tx.billingPlanType ||
          ""
      ).toUpperCase();

    const billingCycle:
      | "monthly"
      | "yearly" =
      billingPlanType ===
      "MONTHLY"
        ? "monthly"
        : "yearly";

    if (
      billingCycle ===
        "monthly" &&
      packageId !==
        "agent-pro"
    ) {
      return json(
        {
          success: false,
          message:
            "Monthly commitment billing is only available for Agent Pro.",
        },
        400
      );
    }

    if (
      expectedBillingCycle &&
      expectedBillingCycle !==
        billingCycle
    ) {
      return json(
        {
          success: false,
          message:
            "Apple billing plan does not match the selected billing option.",
        },
        409
      );
    }

    const commitmentInfo =
      asObject(
        tx.commitmentInfo
      );

    if (
      billingCycle ===
      "monthly"
    ) {
      const totalBillingPeriods =
        Number(
          commitmentInfo
            .totalBillingPeriods
        );

      if (
        Number.isFinite(
          totalBillingPeriods
        ) &&
        totalBillingPeriods !==
          12
      ) {
        return json(
          {
            success: false,
            message:
              "Apple commitment plan is not a 12-month commitment.",
          },
          400
        );
      }
    }

    const amountTotal =
      billingCycle ===
        "monthly" &&
      packageConfig
        .monthlyPriceIdr
        ? packageConfig
            .monthlyPriceIdr
        : packageConfig
            .priceIdr;

    const durationDays =
      Math.max(
        1,
        Math.ceil(
          (
            expiresDateMs -
            (Number.isFinite(
              purchaseDateMs
            )
              ? purchaseDateMs
              : Date.now())
          ) /
            86_400_000
        )
      );

    const paymentId =
      deterministicApplePaymentId(
        transactionId
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
            "Apple transaction is already associated with another account.",
        },
        409
      );
    }

    const previousMetadata =
      asObject(
        existingPayment?.metadata
      );

    const nowIso =
      new Date().toISOString();

    const signedTransactionSha256 =
      crypto
        .createHash("sha256")
        .update(
          signedTransaction
        )
        .digest("hex");

    const metadata: Record<
      string,
      unknown
    > = {
      ...previousMetadata,
      request_source:
        "api/apple/iap/verify",
      gateway: "apple",
      payment_method:
        "apple_iap",

      packageId,
      packageName:
        packageConfig.name,
      packageTermDays:
        packageConfig
          .packageTermDays,
      listingLimit:
        packageConfig
          .maxListings,

      selectedBillingCycle:
        billingCycle,
      selected_billing_cycle:
        billingCycle,

      apple_transaction_id:
        verifiedTransactionId,
      apple_original_transaction_id:
        tx.originalTransactionId ||
        null,
      apple_product_id:
        appleProductId,
      apple_environment:
        environment,
      apple_app_account_token:
        appAccountToken,
      apple_billing_plan_type:
        billingPlanType ||
        "BILLED_UPFRONT",
      apple_purchase_date:
        paidAtIso,
      apple_expires_at:
        expiresAtIso,
      apple_commitment_info:
        Object.keys(
          commitmentInfo
        ).length
          ? commitmentInfo
          : null,
      apple_signed_transaction_sha256:
        signedTransactionSha256,
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
      user_id: user.id,
      property_id: null,
      source_role: "agent",
      payment_type:
        "package",
      product_id: packageId,
      product_name_snapshot:
        packageConfig.name,
      product_type:
        "membership",
      audience_snapshot:
        null,
      status: "paid",
      currency: "idr",
      amount_subtotal:
        amountTotal,
      amount_discount: 0,
      amount_tax: 0,
      amount_total:
        amountTotal,
      description:
        `${packageConfig.name} Membership - Apple In-App Purchase`,
      plan_name:
        packageConfig.name,
      duration_days:
        durationDays,
      property_title_snapshot:
        null,
      property_code_snapshot:
        null,
      customer_name:
        profileData?.full_name ||
        null,
      customer_email:
        user.email ||
        profileData?.email ||
        null,
      customer_phone:
        profileData?.phone ||
        null,
      checkout_url: null,
      paid_at: paidAtIso,
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
            onConflict: "id",
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
            id: paymentId,
            user_id: user.id,
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
            "apple_iap_verify",
          membershipExpiresAtIso:
            expiresAtIso,
        }
      );

    const finalMetadata = {
      ...metadata,
      activation: {
        done: true,
        processedAt:
          new Date()
            .toISOString(),
        processedBy:
          "apple_iap_verify",
        ...activationResult,
      },
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
          metadata:
            finalMetadata,
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

    return json({
      success: true,
      verified: true,
      shouldFinishTransaction:
        true,
      paymentId,
      transactionId:
        verifiedTransactionId,
      environment,
      appleProductId,
      packageId:
        activationResult.packageId,
      packageName:
        activationResult.packageName,
      billingCycle:
        activationResult.billingCycle,
      listingLimit:
        activationResult.listingLimit,
      startsAt:
        activationResult.startsAt,
      expiresAt:
        activationResult.expiresAt,
      billingPlanType:
        billingPlanType ||
        "BILLED_UPFRONT",
      commitmentInfo:
        Object.keys(
          commitmentInfo
        ).length
          ? commitmentInfo
          : null,
    });
  } catch (error) {
    console.error(
      "Apple IAP verification error:",
      error
    );

    return json(
      {
        success: false,
        message:
          "Apple purchase verification failed.",
        error:
          errorMessage(error),
      },
      500
    );
  }
}
