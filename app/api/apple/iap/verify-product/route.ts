import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

import {
  getAppleIapServerClient,
  verifyAppleSignedTransaction,
  TETAMO_PARTNER_IOS_BUNDLE_ID,
  type AppleIapEnvironment,
} from "../../../../../lib/apple-iap-server";

import {
  getOwnerPackageById,
  getAddOnProductById,
} from "../../../../data/pricelist";

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

const APPLE_CONSUMABLE_PRODUCTS = {
  "tetamo.owner.basic": {
    kind: "owner-package",
    productId: "basic",
  },
  "tetamo.owner.priority": {
    kind: "owner-package",
    productId: "priority",
  },
  "tetamo.owner.featured": {
    kind: "owner-package",
    productId: "featured",
  },
  "tetamo.boost.listing": {
    kind: "addon",
    productId: "boost-listing",
  },
  "tetamo.homepage.spotlight": {
    kind: "addon",
    productId: "homepage-spotlight",
  },
} as const;

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

function positiveNumber(
  value: unknown
) {
  const number =
    Number(value);

  return Number.isFinite(number) &&
    number > 0
    ? number
    : null;
}

function extendExpiryIso(
  currentValue: unknown,
  durationDays: number
) {
  const now =
    Date.now();

  const currentMs =
    currentValue
      ? new Date(
          String(currentValue)
        ).getTime()
      : NaN;

  const base =
    Number.isFinite(currentMs) &&
    currentMs > now
      ? currentMs
      : now;

  return new Date(
    base +
      durationDays *
        86_400_000
  ).toISOString();
}

async function loadVerifiedAppleTransaction(
  transactionId: string
) {
  const attempts: Array<{
    environment: AppleIapEnvironment;
    error: string;
  }> = [];

  const environments:
    AppleIapEnvironment[] = [
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

  let body:
    Record<string, any>;

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
      body.transactionId ||
        ""
    ).trim();

  const requestedPropertyId =
    String(
      body.propertyId ||
        ""
    ).trim();

  const expectedProductId =
    String(
      body.productId ||
        ""
    )
      .trim()
      .toLowerCase();

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
        tx.transactionId ||
          ""
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

    const appAccountToken =
      String(
        tx.appAccountToken ||
          ""
      )
        .trim()
        .toLowerCase();

    if (!appAccountToken) {
      return json(
        {
          success: false,
          message:
            "Apple purchase is missing its Tetamo account token.",
        },
        403
      );
    }

    if (tx.revocationDate) {
      return json(
        {
          success: false,
          message:
            "Apple transaction has been revoked.",
        },
        409
      );
    }

    const appleProductId =
      String(
        tx.productId || ""
      ).trim();

    const mapping =
      APPLE_CONSUMABLE_PRODUCTS[
        appleProductId as keyof typeof APPLE_CONSUMABLE_PRODUCTS
      ];

    if (!mapping) {
      return json(
        {
          success: false,
          message:
            "Apple product is not a supported Tetamo consumable product.",
        },
        400
      );
    }

    if (
      expectedProductId &&
      expectedProductId !==
        mapping.productId
    ) {
      return json(
        {
          success: false,
          message:
            "Purchased Apple product does not match the selected Tetamo product.",
        },
        409
      );
    }

    let resolvedPropertyId =
      requestedPropertyId;

    let serverIntent:
      | {
          id: string;
          user_id: string;
          property_id: string;
          product_id: string;
          apple_product_id: string;
          status: string;
          apple_transaction_id:
            | string
            | null;
          apple_environment:
            | string
            | null;
          consumed_at:
            | string
            | null;
        }
      | null =
      null;

    const legacyAccountToken =
      appAccountToken ===
      user.id.toLowerCase();

    if (!legacyAccountToken) {
      const {
        data: intentRow,
        error: intentLookupError,
      } =
        await admin
          .from(
            "apple_iap_purchase_intents"
          )
          .select(
            "id,user_id,property_id,product_id,apple_product_id,status,apple_transaction_id,apple_environment,consumed_at"
          )
          .eq(
            "id",
            appAccountToken
          )
          .maybeSingle();

      if (intentLookupError) {
        throw intentLookupError;
      }

      if (!intentRow) {
        return json(
          {
            success: false,
            message:
              "Apple purchase intent was not found.",
          },
          403
        );
      }

      if (
        String(
          intentRow.user_id ||
            ""
        ).toLowerCase() !==
        user.id.toLowerCase()
      ) {
        return json(
          {
            success: false,
            message:
              "Apple purchase intent belongs to another Tetamo account.",
          },
          403
        );
      }

      if (
        intentRow.status ===
        "cancelled"
      ) {
        return json(
          {
            success: false,
            message:
              "Apple purchase intent was cancelled.",
          },
          409
        );
      }

      if (
        intentRow.status ===
        "consumed"
      ) {
        if (
          String(
            intentRow
              .apple_transaction_id ||
              ""
          ) !==
          verifiedTransactionId
        ) {
          return json(
            {
              success: false,
              message:
                "Apple purchase intent has already been used by another transaction.",
            },
            409
          );
        }
      } else if (
        intentRow.status !==
        "pending"
      ) {
        return json(
          {
            success: false,
            message:
              "Apple purchase intent is not available.",
          },
          409
        );
      }

      if (
        String(
          intentRow
            .apple_product_id ||
            ""
        ) !==
          appleProductId ||
        String(
          intentRow.product_id ||
            ""
        ) !==
          mapping.productId
      ) {
        return json(
          {
            success: false,
            message:
              "Apple transaction does not match its Tetamo purchase intent.",
          },
          409
        );
      }

      resolvedPropertyId =
        String(
          intentRow.property_id ||
            ""
        ).trim();

      if (!resolvedPropertyId) {
        return json(
          {
            success: false,
            message:
              "Apple purchase intent is missing its property reference.",
          },
          409
        );
      }

      if (
        requestedPropertyId &&
        requestedPropertyId !==
          resolvedPropertyId
      ) {
        return json(
          {
            success: false,
            message:
              "Requested property does not match the Apple purchase intent.",
          },
          409
        );
      }

      serverIntent =
        intentRow;
    }

    const markServerIntentConsumed =
      async () => {
        if (!serverIntent) {
          return;
        }

        const now =
          new Date()
            .toISOString();

        const {
          error:
            intentUpdateError,
        } =
          await admin
            .from(
              "apple_iap_purchase_intents"
            )
            .update({
              status:
                "consumed",

              apple_transaction_id:
                verifiedTransactionId,

              apple_environment:
                environment,

              consumed_at:
                serverIntent
                  .consumed_at ||
                now,

              updated_at:
                now,
            })
            .eq(
              "id",
              serverIntent.id
            )
            .eq(
              "user_id",
              user.id
            );

        if (intentUpdateError) {
          throw intentUpdateError;
        }
      };

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

    const existingMetadata =
      asObject(
        existingPayment?.metadata
      );

    const existingActivation =
      asObject(
        existingMetadata.activation
      );

    const existingActivationPropertyId =
      String(
        existingActivation.propertyId ||
          ""
      ).trim();

    if (
      existingPayment &&
      existingActivation.done ===
        true
    ) {
      if (
        !existingActivationPropertyId
      ) {
        return json(
          {
            success: false,
            message:
              "Completed Apple payment is missing its original property reference.",
          },
          409
        );
      }

      if (
        serverIntent &&
        existingActivationPropertyId !==
          resolvedPropertyId
      ) {
        return json(
          {
            success: false,
            message:
              "Completed Apple payment property does not match its purchase intent.",
          },
          409
        );
      }

      await markServerIntentConsumed();

      return json({
        success: true,
        verified: true,
        alreadyProcessed: true,
        shouldFinishTransaction:
          true,
        isConsumable: true,
        paymentId,
        transactionId:
          verifiedTransactionId,
        appleProductId,
        productId:
          mapping.productId,
        propertyId:
          existingActivationPropertyId,
        activation:
          existingActivation,
      });
    }

    if (!resolvedPropertyId) {
      return json(
        {
          success: false,
          message:
            "propertyId is required for a new Apple purchase.",
        },
        400
      );
    }

    const {
      data: property,
      error: propertyError,
    } =
      await admin
        .from("properties")
        .select(
          "id, user_id, kode, title, source, status, verification_status, listing_expires_at, featured_expires_at, boost_expires_at, spotlight_expires_at"
        )
        .eq(
          "id",
          resolvedPropertyId
        )
        .maybeSingle();

    if (propertyError) {
      throw propertyError;
    }

    if (!property) {
      return json(
        {
          success: false,
          message:
            "Property for this Apple purchase was not found.",
        },
        404
      );
    }

    if (
      property.user_id !==
      user.id
    ) {
      return json(
        {
          success: false,
          message:
            "You are not allowed to purchase this product for that property.",
        },
        403
      );
    }

    const purchaseDateMs =
      Number(
        tx.purchaseDate
      );

    const paidAtIso =
      Number.isFinite(
        purchaseDateMs
      )
        ? new Date(
            purchaseDateMs
          ).toISOString()
        : new Date()
            .toISOString();

    const nowIso =
      new Date()
        .toISOString();

    let productConfig:
      any = null;

    let paymentType:
      string;

    let productType:
      "listing" | "addon";

    let durationDays:
      number;

    let amountTotal:
      number;

    let productName:
      string;

    let sourceRole:
      "owner" | "agent" =
      String(
        property.source ||
          ""
      ).toLowerCase() ===
      "agent"
        ? "agent"
        : "owner";

    if (
      mapping.kind ===
      "owner-package"
    ) {
      productConfig =
        getOwnerPackageById(
          mapping.productId
        );

      if (!productConfig) {
        throw new Error(
          "Tetamo Owner package configuration was not found."
        );
      }

      durationDays =
        positiveNumber(
          productConfig
            .durationDays
        ) || 0;

      if (!durationDays) {
        throw new Error(
          "Owner package duration is not configured."
        );
      }

      amountTotal =
        positiveNumber(
          productConfig
            .priceIdr
        ) || 0;

      if (!amountTotal) {
        throw new Error(
          "Owner package price is not configured."
        );
      }

      productName =
        String(
          productConfig.name ||
            mapping.productId
        );

      productType =
        "listing";

      paymentType =
        mapping.productId ===
        "featured"
          ? "featured"
          : "listing_fee";

      sourceRole =
        "owner";
    } else {
      productConfig =
        getAddOnProductById(
          mapping.productId
        );

      if (!productConfig) {
        throw new Error(
          "Tetamo add-on configuration was not found."
        );
      }

      durationDays =
        positiveNumber(
          productConfig
            .durationDays
        ) || 0;

      if (!durationDays) {
        throw new Error(
          "Add-on duration is not configured."
        );
      }

      amountTotal =
        positiveNumber(
          productConfig
            .priceIdr
        ) || 0;

      if (!amountTotal) {
        throw new Error(
          "Add-on price is not configured."
        );
      }

      productName =
        String(
          productConfig.name ||
            mapping.productId
        );

      productType =
        "addon";

      paymentType =
        mapping.productId ===
        "homepage-spotlight"
          ? "spotlight"
          : "boost";
    }

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
      ...existingMetadata,

      request_source:
        "api/apple/iap/verify-product",

      gateway: "apple",

      payment_method:
        "apple_iap",

      propertyId:
        property.id,

      propertyCode:
        property.kode ||
        null,

      apple_transaction_id:
        verifiedTransactionId,

      apple_product_id:
        appleProductId,

      apple_environment:
        environment,

      apple_app_account_token:
        appAccountToken,

      apple_purchase_intent_id:
        serverIntent?.id ||
        null,

      apple_purchase_date:
        paidAtIso,

      apple_signed_transaction_sha256:
        signedTransactionSha256,

      productDurationDays:
        durationDays,

      selectedPlan:
        mapping.kind ===
        "owner-package"
          ? mapping.productId
          : null,

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
        property.id,
      source_role:
        sourceRole,
      payment_type:
        paymentType,
      product_id:
        mapping.productId,
      product_name_snapshot:
        productName,
      product_type:
        productType,
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
        `${productName} - Apple In-App Purchase`,
      plan_name:
        mapping.productId,
      duration_days:
        durationDays,
      property_title_snapshot:
        property.title ||
        null,
      property_code_snapshot:
        property.kode ||
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
        profileData?.phone ||
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
          ([, value]) =>
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

    let updatePayload:
      Record<string, any> = {
        updated_at:
          nowIso,
    };

    let activationType:
      string;

    let expiresAt:
      string | null =
      null;

    if (
      mapping.kind ===
      "owner-package"
    ) {
      const featuredDurationDays =
        positiveNumber(
          productConfig
            .featuredDurationDays
        ) || 0;

      const listingExpiresAt =
        extendExpiryIso(
          property
            .listing_expires_at,
          durationDays
        );

      updatePayload = {
        ...updatePayload,
        status: "active",
        verification_status:
          "pending_verification",
        verified_ok: false,
        is_paused: false,
        posted_date:
          new Date()
            .toISOString()
            .slice(0, 10),
        plan_id:
          mapping.productId,
        listing_expires_at:
          listingExpiresAt,
      };

      if (
        featuredDurationDays >
        0
      ) {
        updatePayload
          .featured_expires_at =
          extendExpiryIso(
            property
              .featured_expires_at,
            featuredDurationDays
          );
      }

      activationType =
        "owner-listing";

      expiresAt =
        listingExpiresAt;
    } else if (
      mapping.productId ===
      "homepage-spotlight"
    ) {
      const spotlightExpiresAt =
        extendExpiryIso(
          property
            .spotlight_expires_at,
          durationDays
        );

      updatePayload
        .spotlight_active =
        true;

      updatePayload
        .spotlight_expires_at =
        spotlightExpiresAt;

      activationType =
        "homepage-spotlight";

      expiresAt =
        spotlightExpiresAt;
    } else {
      const boostExpiresAt =
        extendExpiryIso(
          property
            .boost_expires_at,
          durationDays
        );

      updatePayload
        .boost_active =
        true;

      updatePayload
        .boost_expires_at =
        boostExpiresAt;

      activationType =
        "boost-listing";

      expiresAt =
        boostExpiresAt;
    }

    const {
      error:
        propertyUpdateError,
    } =
      await admin
        .from("properties")
        .update(
          updatePayload
        )
        .eq(
          "id",
          property.id
        )
        .eq(
          "user_id",
          user.id
        );

    if (
      propertyUpdateError
    ) {
      throw propertyUpdateError;
    }

    const activation = {
      done: true,
      processedAt:
        new Date()
          .toISOString(),
      processedBy:
        "apple_iap_verify_product",
      activationType,
      propertyId:
        property.id,
      propertyCode:
        property.kode ||
        null,
      expiresAt,
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

    await markServerIntentConsumed();

    return json({
      success: true,
      verified: true,

      shouldFinishTransaction:
        true,

      isConsumable:
        true,

      paymentId,

      transactionId:
        verifiedTransactionId,

      environment,

      appleProductId,

      productId:
        mapping.productId,

      productName,

      propertyId:
        property.id,

      activationType,

      expiresAt,
    });
  } catch (error) {
    console.error(
      "Apple consumable IAP verification error:",
      error
    );

    return json(
      {
        success: false,
        message:
          "Apple purchase verification failed.",
        error:
          errorMessage(
            error
          ),
      },
      500
    );
  }
}
