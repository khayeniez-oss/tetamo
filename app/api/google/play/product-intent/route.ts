import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  getGooglePlayObfuscatedAccountId,
  TETAMO_PARTNER_ANDROID_PACKAGE,
} from "../../../../../lib/google-play-server";

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

  const propertyId =
    String(
      body.propertyId ||
        ""
    ).trim();

  const productId =
    String(
      body.productId ||
        ""
    )
      .trim()
      .toLowerCase();

  const googleProductId =
    String(
      body.googleProductId ||
        ""
    ).trim();

  if (
    !propertyId ||
    !productId ||
    !googleProductId
  ) {
    return json(
      {
        success: false,
        message:
          "propertyId, productId and googleProductId are required.",
      },
      400
    );
  }

  const mapping =
    GOOGLE_ONE_TIME_PRODUCTS[
      googleProductId as keyof typeof GOOGLE_ONE_TIME_PRODUCTS
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
    productId
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

  const {
    data: property,
    error: propertyError,
  } =
    await admin
      .from("properties")
      .select(
        "id,user_id"
      )
      .eq(
        "id",
        propertyId
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

  if (propertyError) {
    console.error(
      "[google-product-intent] property lookup failed",
      propertyError
    );

    return json(
      {
        success: false,
        message:
          "Unable to validate the property.",
      },
      500
    );
  }

  if (!property) {
    return json(
      {
        success: false,
        message:
          "Property not found for the authenticated Tetamo account.",
      },
      404
    );
  }

  const obfuscatedAccountId =
    getGooglePlayObfuscatedAccountId(
      user.id
    );

  const {
    data: purchaseIntent,
    error: intentError,
  } =
    await admin
      .from(
        "google_play_purchase_intents"
      )
      .insert({
        user_id:
          user.id,

        property_id:
          property.id,

        product_id:
          productId,

        google_product_id:
          googleProductId,

        obfuscated_account_id:
          obfuscatedAccountId,

        status:
          "pending",
      })
      .select(
        "id,property_id,product_id,google_product_id,status,created_at"
      )
      .single();

  if (
    intentError ||
    !purchaseIntent
  ) {
    console.error(
      "[google-product-intent] creation failed",
      intentError
    );

    return json(
      {
        success: false,
        message:
          "Unable to create Google Play purchase intent.",
      },
      500
    );
  }

  console.log(
    "[google-product-intent] created",
    {
      intentId:
        purchaseIntent.id,
      userId:
        user.id,
      propertyId:
        purchaseIntent.property_id,
      productId:
        purchaseIntent.product_id,
      googleProductId:
        purchaseIntent.google_product_id,
    }
  );

  return json({
    success: true,

    intentId:
      purchaseIntent.id,

    packageName:
      TETAMO_PARTNER_ANDROID_PACKAGE,

    obfuscatedAccountId,

    obfuscatedProfileId:
      purchaseIntent.id,

    propertyId:
      purchaseIntent.property_id,

    productId:
      purchaseIntent.product_id,

    googleProductId:
      purchaseIntent.google_product_id,
  });
}

export async function DELETE(
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

  const intentId =
    String(
      body.intentId ||
        ""
    )
      .trim()
      .toLowerCase();

  if (!intentId) {
    return json(
      {
        success: false,
        message:
          "intentId is required.",
      },
      400
    );
  }

  const {
    data: existingIntent,
    error: lookupError,
  } =
    await admin
      .from(
        "google_play_purchase_intents"
      )
      .select(
        "id,user_id,status"
      )
      .eq(
        "id",
        intentId
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

  if (lookupError) {
    console.error(
      "[google-product-intent] cancellation lookup failed",
      lookupError
    );

    return json(
      {
        success: false,
        message:
          "Unable to find Google Play purchase intent.",
      },
      500
    );
  }

  if (!existingIntent) {
    return json(
      {
        success: false,
        message:
          "Google Play purchase intent was not found.",
      },
      404
    );
  }

  if (
    existingIntent.status ===
    "consumed"
  ) {
    return json(
      {
        success: false,
        message:
          "Completed Google Play purchase intent cannot be cancelled.",
      },
      409
    );
  }

  if (
    existingIntent.status ===
    "cancelled"
  ) {
    return json({
      success: true,
      alreadyCancelled: true,
      intentId,
    });
  }

  const nowIso =
    new Date()
      .toISOString();

  const {
    error: updateError,
  } =
    await admin
      .from(
        "google_play_purchase_intents"
      )
      .update({
        status:
          "cancelled",

        updated_at:
          nowIso,
      })
      .eq(
        "id",
        intentId
      )
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "status",
        "pending"
      );

  if (updateError) {
    console.error(
      "[google-product-intent] cancellation failed",
      updateError
    );

    return json(
      {
        success: false,
        message:
          "Unable to cancel Google Play purchase intent.",
      },
      500
    );
  }

  console.log(
    "[google-product-intent] cancelled",
    {
      intentId,
      userId:
        user.id,
    }
  );

  return json({
    success: true,
    intentId,
  });
}
