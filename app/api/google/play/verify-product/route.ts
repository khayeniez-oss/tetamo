import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

import {
  consumeGooglePlayOneTimePurchase,
  getGooglePlayObfuscatedAccountId,
  getGooglePlayOneTimePurchase,
  TETAMO_PARTNER_ANDROID_PACKAGE,
} from "../../../../../lib/google-play-server";

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

const GOOGLE_ONE_TIME_PRODUCTS = {
  tetamo_owner_basic: {
    kind: "owner-package",
    productId: "basic",
  },

  tetamo_owner_priority: {
    kind: "owner-package",
    productId: "priority",
  },

  tetamo_owner_featured: {
    kind: "owner-package",
    productId: "featured",
  },

  tetamo_boost_listing: {
    kind: "addon",
    productId: "boost-listing",
  },

  tetamo_homepage_spotlight: {
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

function storedIsoOrNull(
  value: unknown
) {
  const raw =
    String(
      value || ""
    ).trim();

  if (!raw) {
    return null;
  }

  const time =
    new Date(
      raw
    ).getTime();

  if (
    !Number.isFinite(time)
  ) {
    return null;
  }

  return new Date(
    time
  ).toISOString();
}

function purchaseTokenSha256(
  purchaseToken: string
) {
  return crypto
    .createHash("sha256")
    .update(purchaseToken)
    .digest("hex");
}

function deterministicGooglePaymentId(
  purchaseToken: string
) {
  const hex =
    crypto
      .createHash("sha256")
      .update(
        `tetamo-google-one-time:${purchaseToken}`
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

export async function POST(
  req: Request
) {
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

  const purchaseToken =
    String(
      body.purchaseToken ||
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

  const expectedGoogleProductId =
    String(
      body.googleProductId ||
        ""
    ).trim();

  const requestedIntentId =
    String(
      body.intentId ||
        ""
    )
      .trim()
      .toLowerCase();

  if (!purchaseToken) {
    return json(
      {
        success: false,
        message:
          "Google Play purchaseToken is required.",
      },
      400
    );
  }

  if (
    !expectedProductId ||
    !expectedGoogleProductId ||
    !requestedIntentId
  ) {
    return json(
      {
        success: false,
        message:
          "productId, googleProductId and intentId are required.",
      },
      400
    );
  }

  const mapping =
    GOOGLE_ONE_TIME_PRODUCTS[
      expectedGoogleProductId as keyof typeof GOOGLE_ONE_TIME_PRODUCTS
    ];

  if (!mapping) {
    return json(
      {
        success: false,
        message:
          "Google Play product is not a supported Tetamo one-time product.",
      },
      400
    );
  }

  if (
    mapping.productId !==
    expectedProductId
  ) {
    return json(
      {
        success: false,
        message:
          "Google Play product does not match the selected Tetamo product.",
      },
      409
    );
  }

  try {
    const purchase =
      await getGooglePlayOneTimePurchase(
        purchaseToken
      );

    const purchaseState =
      String(
        asObject(
          purchase.purchaseStateContext
        ).purchaseState ||
          ""
      );

    if (
      purchaseState !==
      "PURCHASED"
    ) {
      return json(
        {
          success: false,
          verified: false,
          message:
            `Google Play purchase is not entitled in state ${purchaseState || "UNKNOWN"}.`,
        },
        409
      );
    }

    const lineItems =
      Array.isArray(
        purchase.productLineItem
      )
        ? purchase.productLineItem
        : [];

    const matchingItems =
      lineItems.filter(
        (rawItem) => {
          const item =
            asObject(rawItem);

          return (
            String(
              item.productId ||
                ""
            ) ===
            expectedGoogleProductId
          );
        }
      );

    if (
      matchingItems.length !==
      1 ||
      lineItems.length !== 1
    ) {
      return json(
        {
          success: false,
          verified: false,
          message:
            "Google Play purchase does not match the selected Tetamo product.",
        },
        409
      );
    }

    const matchingItem =
      asObject(
        matchingItems[0]
      );

    const offerDetails =
      asObject(
        matchingItem
          .productOfferDetails
      );

    const consumptionState =
      String(
        offerDetails
          .consumptionState ||
          ""
      );

    const expectedAccountId =
      getGooglePlayObfuscatedAccountId(
        user.id
      );

    const googleAccountId =
      String(
        purchase
          .obfuscatedExternalAccountId ||
          ""
      )
        .trim()
        .toLowerCase();

    if (
      !googleAccountId ||
      googleAccountId !==
        expectedAccountId.toLowerCase()
    ) {
      return json(
        {
          success: false,
          verified: false,
          message:
            "Google Play purchase does not belong to this Tetamo account.",
        },
        403
      );
    }

    const googleProfileId =
      String(
        purchase
          .obfuscatedExternalProfileId ||
          ""
      )
        .trim()
        .toLowerCase();

    if (
      !googleProfileId ||
      googleProfileId !==
        requestedIntentId
    ) {
      return json(
        {
          success: false,
          verified: false,
          message:
            "Google Play purchase does not match its Tetamo purchase intent.",
        },
        403
      );
    }

    const {
      data: intentRow,
      error: intentLookupError,
    } =
      await admin
        .from(
          "google_play_purchase_intents"
        )
        .select(
          "id,user_id,property_id,product_id,google_product_id,obfuscated_account_id,status,google_purchase_token_sha256,consumed_at"
        )
        .eq(
          "id",
          googleProfileId
        )
        .maybeSingle();

    if (intentLookupError) {
      throw intentLookupError;
    }

    if (!intentRow) {
      return json(
        {
          success: false,
          verified: false,
          message:
            "Google Play purchase intent was not found.",
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
          verified: false,
          message:
            "Google Play purchase intent belongs to another Tetamo account.",
        },
        403
      );
    }

    if (
      String(
        intentRow
          .obfuscated_account_id ||
          ""
      ).toLowerCase() !==
      expectedAccountId.toLowerCase()
    ) {
      return json(
        {
          success: false,
          verified: false,
          message:
            "Google Play purchase intent account attribution is invalid.",
        },
        403
      );
    }

    if (
      String(
        intentRow
          .google_product_id ||
          ""
      ) !==
        expectedGoogleProductId ||
      String(
        intentRow.product_id ||
          ""
      ) !==
        expectedProductId
    ) {
      return json(
        {
          success: false,
          verified: false,
          message:
            "Google Play purchase does not match its Tetamo purchase intent.",
        },
        409
      );
    }

    const resolvedPropertyId =
      String(
        intentRow.property_id ||
          ""
      ).trim();

    if (!resolvedPropertyId) {
      return json(
        {
          success: false,
          verified: false,
          message:
            "Google Play purchase intent is missing its property reference.",
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
          verified: false,
          message:
            "Requested property does not match the Google Play purchase intent.",
        },
        409
      );
    }

    const tokenSha256 =
      purchaseTokenSha256(
        purchaseToken
      );

    if (
      intentRow
        .google_purchase_token_sha256 &&
      String(
        intentRow
          .google_purchase_token_sha256
      ) !==
        tokenSha256
    ) {
      return json(
        {
          success: false,
          verified: false,
          message:
            "Google Play purchase intent has already been used by another purchase.",
        },
        409
      );
    }

    if (
      intentRow.status !==
        "pending" &&
      intentRow.status !==
        "cancelled" &&
      intentRow.status !==
        "consumed"
    ) {
      return json(
        {
          success: false,
          verified: false,
          message:
            "Google Play purchase intent is not available.",
        },
        409
      );
    }

    const paymentId =
      deterministicGooglePaymentId(
        purchaseToken
      );

    const {
      data: existingPayment,
      error:
        existingPaymentError,
    } =
      await admin
        .from(
          "payment_transactions"
        )
        .select(
          "id,user_id,property_id,metadata"
        )
        .eq(
          "id",
          paymentId
        )
        .maybeSingle();

    if (existingPaymentError) {
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
          verified: false,
          message:
            "Google Play transaction is already associated with another account.",
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

    const existingActivationPlan =
      asObject(
        existingMetadata.activationPlan
      );

    const existingActivationPropertyId =
      String(
        existingActivation
          .propertyId ||
          ""
      ).trim();

    const markIntentConsumed =
      async () => {
        const nowIso =
          new Date()
            .toISOString();

        const {
          error,
        } =
          await admin
            .from(
              "google_play_purchase_intents"
            )
            .update({
              status:
                "consumed",

              google_purchase_token_sha256:
                tokenSha256,

              consumed_at:
                intentRow
                  .consumed_at ||
                nowIso,

              updated_at:
                nowIso,
            })
            .eq(
              "id",
              intentRow.id
            )
            .eq(
              "user_id",
              user.id
            );

        if (error) {
          throw error;
        }
      };

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
            verified: false,
            message:
              "Completed Google Play payment is missing its original property reference.",
          },
          409
        );
      }

      if (
        existingActivationPropertyId !==
        resolvedPropertyId
      ) {
        return json(
          {
            success: false,
            verified: false,
            message:
              "Completed Google Play payment property does not match its purchase intent.",
          },
          409
        );
      }

      if (
        consumptionState !==
        "CONSUMPTION_STATE_CONSUMED"
      ) {
        await consumeGooglePlayOneTimePurchase(
          expectedGoogleProductId,
          purchaseToken
        );
      }

      await markIntentConsumed();

      return json({
        success: true,
        verified: true,
        alreadyProcessed: true,
        serverFinalized: true,
        shouldFinishTransaction:
          false,
        isConsumable: true,
        paymentId,
        googleProductId:
          expectedGoogleProductId,
        productId:
          expectedProductId,
        propertyId:
          existingActivationPropertyId,
        activation:
          existingActivation,
      });
    }

    const {
      data: property,
      error: propertyError,
    } =
      await admin
        .from("properties")
        .select(
          "id,user_id,kode,title,source,status,verification_status,listing_expires_at,featured_expires_at,boost_expires_at,spotlight_expires_at"
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
          verified: false,
          message:
            "Property for this Google Play purchase was not found.",
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
          verified: false,
          message:
            "You are not allowed to purchase this product for that property.",
        },
        403
      );
    }

    const purchaseCompletionTime =
      String(
        purchase
          .purchaseCompletionTime ||
          ""
      ).trim();

    const purchaseDate =
      purchaseCompletionTime
        ? new Date(
            purchaseCompletionTime
          )
        : new Date();

    const paidAtIso =
      Number.isFinite(
        purchaseDate.getTime()
      )
        ? purchaseDate
            .toISOString()
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

    const metadata:
      Record<string, unknown> = {
      ...existingMetadata,

      request_source:
        "api/google/play/verify-product",

      gateway:
        "google_play",

      payment_method:
        "google_play",

      propertyId:
        property.id,

      propertyCode:
        property.kode ||
        null,

      google_product_id:
        expectedGoogleProductId,

      google_order_id:
        String(
          purchase.orderId ||
            ""
        ) ||
        null,

      google_purchase_token_sha256:
        tokenSha256,

      google_purchase_state:
        purchaseState,

      google_consumption_state:
        consumptionState ||
        null,

      google_acknowledgement_state:
        String(
          purchase
            .acknowledgementState ||
            ""
        ) ||
        null,

      google_obfuscated_account_id:
        googleAccountId,

      google_obfuscated_profile_id:
        googleProfileId,

      google_purchase_intent_id:
        intentRow.id,

      google_purchase_completion_time:
        paidAtIso,

      google_test_purchase:
        Boolean(
          purchase.testPurchaseContext
        ),

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
      data: profileData,
    } =
      await admin
        .from("profiles")
        .select(
          "full_name,phone,email"
        )
        .eq(
          "id",
          user.id
        )
        .maybeSingle();

    const paymentRow = {
      id:
        paymentId,

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
        `${productName} - Google Play`,

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

    if (paymentUpsertError) {
      throw paymentUpsertError;
    }

    const activationPlanMatches =
      String(
        existingActivationPlan
          .propertyId ||
          ""
      ).trim() ===
        property.id &&
      String(
        existingActivationPlan
          .productId ||
          ""
      ).trim() ===
        mapping.productId &&
      String(
        existingActivationPlan
          .googleProductId ||
          ""
      ).trim() ===
        expectedGoogleProductId;

    const plannedListingExpiresAt =
      activationPlanMatches
        ? storedIsoOrNull(
            existingActivationPlan
              .listingExpiresAt
          )
        : null;

    const plannedFeaturedExpiresAt =
      activationPlanMatches
        ? storedIsoOrNull(
            existingActivationPlan
              .featuredExpiresAt
          )
        : null;

    const plannedBoostExpiresAt =
      activationPlanMatches
        ? storedIsoOrNull(
            existingActivationPlan
              .boostExpiresAt
          )
        : null;

    const plannedSpotlightExpiresAt =
      activationPlanMatches
        ? storedIsoOrNull(
            existingActivationPlan
              .spotlightExpiresAt
          )
        : null;

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
        plannedListingExpiresAt ||
        extendExpiryIso(
          property
            .listing_expires_at,
          durationDays
        );

      updatePayload = {
        ...updatePayload,

        status:
          "active",

        verification_status:
          "pending_verification",

        verified_ok:
          false,

        is_paused:
          false,

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
          plannedFeaturedExpiresAt ||
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
        plannedSpotlightExpiresAt ||
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
        plannedBoostExpiresAt ||
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

    const activationPlan = {
      propertyId:
        property.id,

      propertyCode:
        property.kode ||
        null,

      productId:
        mapping.productId,

      googleProductId:
        expectedGoogleProductId,

      activationType,

      expiresAt,

      listingExpiresAt:
        updatePayload
          .listing_expires_at ||
        null,

      featuredExpiresAt:
        updatePayload
          .featured_expires_at ||
        null,

      boostExpiresAt:
        updatePayload
          .boost_expires_at ||
        null,

      spotlightExpiresAt:
        updatePayload
          .spotlight_expires_at ||
        null,
    };

    const metadataWithActivationPlan = {
      ...metadata,
      activationPlan,
    };

    const {
      error:
        activationPlanError,
    } =
      await admin
        .from(
          "payment_transactions"
        )
        .update({
          metadata:
            metadataWithActivationPlan,

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          paymentId
        );

    if (activationPlanError) {
      throw activationPlanError;
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

    if (propertyUpdateError) {
      throw propertyUpdateError;
    }

    const activation = {
      done:
        true,

      processedAt:
        new Date()
          .toISOString(),

      processedBy:
        "google_play_verify_product",

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
            ...metadataWithActivationPlan,
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

    if (finalUpdateError) {
      throw finalUpdateError;
    }

    /*
     * Consumable Google Play purchases must be consumed
     * after Tetamo has safely granted the entitlement.
     *
     * This also satisfies Google's acknowledgement
     * requirement and makes Boost / Spotlight available
     * for purchase again.
     */
    if (
      consumptionState !==
      "CONSUMPTION_STATE_CONSUMED"
    ) {
      await consumeGooglePlayOneTimePurchase(
        expectedGoogleProductId,
        purchaseToken
      );
    }

    await markIntentConsumed();

    return json({
      success:
        true,

      verified:
        true,

      serverFinalized:
        true,

      shouldFinishTransaction:
        false,

      isConsumable:
        true,

      paymentId,

      googleProductId:
        expectedGoogleProductId,

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
      "Google Play one-time purchase verification error:",
      error
    );

    return json(
      {
        success: false,

        message:
          "Google Play purchase verification failed.",

        error:
          errorMessage(
            error
          ),
      },
      500
    );
  }
}
