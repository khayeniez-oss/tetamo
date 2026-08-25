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

function json(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, {
    status,
  });
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

function cleanString(
  value: unknown,
  maxLength = 500
) {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .trim()
    .slice(0, maxLength);
}

function cleanMetadata(
  value: unknown
) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  const metadata =
    value as Record<
      string,
      unknown
    >;

  return {
    app:
      "tetamo-partner",

    device_brand:
      cleanString(
        metadata.device_brand,
        100
      ),

    device_model:
      cleanString(
        metadata.device_model,
        150
      ),

    os_name:
      cleanString(
        metadata.os_name,
        100
      ),

    os_version:
      cleanString(
        metadata.os_version,
        100
      ),
  };
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
          "Unauthorized.",
      },
      401
    );
  }

  let body:
    | Record<
        string,
        unknown
      >
    | null = null;

  try {
    body =
      await req.json();
  } catch {
    body = null;
  }

  if (!body) {
    return json(
      {
        success: false,
        message:
          "Invalid request body.",
      },
      400
    );
  }

  const expoPushToken =
    cleanString(
      body.expo_push_token,
      1000
    );

  const platform =
    cleanString(
      body.platform,
      20
    ).toLowerCase();

  if (!expoPushToken) {
    return json(
      {
        success: false,
        message:
          "Expo push token is required.",
      },
      400
    );
  }

  if (
    platform !== "ios" &&
    platform !== "android"
  ) {
    return json(
      {
        success: false,
        message:
          "Unsupported platform.",
      },
      400
    );
  }

  const now =
    new Date()
      .toISOString();

  const {
    data,
    error,
  } =
    await admin
      .from("push_tokens")
      .upsert(
        {
          user_id:
            user.id,

          expo_push_token:
            expoPushToken,

          platform,

          device_name:
            cleanString(
              body.device_name,
              200
            ),

          app_version:
            cleanString(
              body.app_version,
              100
            ),

          project_id:
            cleanString(
              body.project_id,
              200
            ) || null,

          status:
            "active",

          source:
            "tetamo-partner",

          metadata:
            cleanMetadata(
              body.metadata
            ),

          updated_at:
            now,
        },
        {
          onConflict:
            "expo_push_token",
        }
      )
      .select(
        "id,user_id,platform,status,source"
      )
      .single();

  if (error) {
    console.error(
      "Tetamo Partner push registration failed:",
      error
    );

    return json(
      {
        success: false,
        message:
          "Push registration failed.",
      },
      500
    );
  }

  return json({
    success: true,
    status:
      "registered",
    registration: data,
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
          "Unauthorized.",
      },
      401
    );
  }

  let body:
    | Record<
        string,
        unknown
      >
    | null = null;

  try {
    body =
      await req.json();
  } catch {
    body = null;
  }

  const expoPushToken =
    cleanString(
      body?.expo_push_token,
      1000
    );

  if (!expoPushToken) {
    return json(
      {
        success: false,
        message:
          "Expo push token is required.",
      },
      400
    );
  }

  const {
    error,
  } =
    await admin
      .from("push_tokens")
      .update({
        status:
          "inactive",

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "expo_push_token",
        expoPushToken
      )
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "source",
        "tetamo-partner"
      );

  if (error) {
    console.error(
      "Tetamo Partner push unregister failed:",
      error
    );

    return json(
      {
        success: false,
        message:
          "Push unregister failed.",
      },
      500
    );
  }

  return json({
    success: true,
    status:
      "unregistered",
  });
}
