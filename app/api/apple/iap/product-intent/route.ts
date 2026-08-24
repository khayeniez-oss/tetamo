import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    productId: "basic",
  },

  "tetamo.owner.priority": {
    productId: "priority",
  },

  "tetamo.owner.featured": {
    productId: "featured",
  },

  "tetamo.boost.listing": {
    productId: "boost-listing",
  },

  "tetamo.homepage.spotlight": {
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

  const appleProductId =
    String(
      body.appleProductId ||
        ""
    ).trim();

  if (
    !propertyId ||
    !productId ||
    !appleProductId
  ) {
    return json(
      {
        success: false,
        message:
          "propertyId, productId and appleProductId are required.",
      },
      400
    );
  }

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
    mapping.productId !==
    productId
  ) {
    return json(
      {
        success: false,
        message:
          "Apple product does not match the selected Tetamo product.",
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
      "[apple-product-intent] property lookup failed",
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

  const {
    data: purchaseIntent,
    error: intentError,
  } =
    await admin
      .from(
        "apple_iap_purchase_intents"
      )
      .insert({
        user_id:
          user.id,

        property_id:
          property.id,

        product_id:
          productId,

        apple_product_id:
          appleProductId,

        status:
          "pending",
      })
      .select(
        "id,property_id,product_id,apple_product_id,status,created_at"
      )
      .single();

  if (
    intentError ||
    !purchaseIntent
  ) {
    console.error(
      "[apple-product-intent] creation failed",
      intentError
    );

    return json(
      {
        success: false,
        message:
          "Unable to create Apple purchase intent.",
      },
      500
    );
  }

  console.log(
    "[apple-product-intent] created",
    {
      intentId:
        purchaseIntent.id,
      userId:
        user.id,
      propertyId:
        purchaseIntent.property_id,
      productId:
        purchaseIntent.product_id,
      appleProductId:
        purchaseIntent.apple_product_id,
    }
  );

  return json({
    success: true,

    intentId:
      purchaseIntent.id,

    propertyId:
      purchaseIntent.property_id,

    productId:
      purchaseIntent.product_id,

    appleProductId:
      purchaseIntent.apple_product_id,

    status:
      purchaseIntent.status,

    createdAt:
      purchaseIntent.created_at,
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
    data: purchaseIntent,
    error: lookupError,
  } =
    await admin
      .from(
        "apple_iap_purchase_intents"
      )
      .select(
        "id,user_id,status,apple_transaction_id"
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
      "[apple-product-intent] cancel lookup failed",
      lookupError
    );

    return json(
      {
        success: false,
        message:
          "Unable to locate Apple purchase intent.",
      },
      500
    );
  }

  if (!purchaseIntent) {
    return json(
      {
        success: false,
        message:
          "Apple purchase intent was not found.",
      },
      404
    );
  }

  if (
    purchaseIntent.status ===
      "consumed" ||
    purchaseIntent
      .apple_transaction_id
  ) {
    return json(
      {
        success: false,
        message:
          "Completed Apple purchase intent cannot be cancelled.",
      },
      409
    );
  }

  if (
    purchaseIntent.status ===
    "cancelled"
  ) {
    return json({
      success: true,
      alreadyCancelled:
        true,
      intentId:
        purchaseIntent.id,
      status:
        "cancelled",
    });
  }

  if (
    purchaseIntent.status !==
    "pending"
  ) {
    return json(
      {
        success: false,
        message:
          "Apple purchase intent is not pending.",
      },
      409
    );
  }

  const now =
    new Date()
      .toISOString();

  const {
    data: cancelled,
    error: cancelError,
  } =
    await admin
      .from(
        "apple_iap_purchase_intents"
      )
      .update({
        status:
          "cancelled",
        updated_at:
          now,
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
      )
      .select(
        "id,status"
      )
      .maybeSingle();

  if (cancelError) {
    console.error(
      "[apple-product-intent] cancellation failed",
      cancelError
    );

    return json(
      {
        success: false,
        message:
          "Unable to cancel Apple purchase intent.",
      },
      500
    );
  }

  if (!cancelled) {
    return json(
      {
        success: false,
        message:
          "Apple purchase intent changed before cancellation completed.",
      },
      409
    );
  }

  console.log(
    "[apple-product-intent] cancelled",
    {
      intentId:
        cancelled.id,
      userId:
        user.id,
    }
  );

  return json({
    success: true,
    intentId:
      cancelled.id,
    status:
      cancelled.status,
  });
}
