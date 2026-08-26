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

export async function GET(
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

    const token =
      getBearerToken(req);

    if (!token) {
      return json(
        {
          success: false,
          message:
            "Authentication required.",
        },
        401
      );
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
      return json(
        {
          success: false,
          message:
            "Authentication required.",
        },
        401
      );
    }

    return json({
      success: true,
      packageName:
        TETAMO_PARTNER_ANDROID_PACKAGE,
      obfuscatedAccountId:
        getGooglePlayObfuscatedAccountId(
          data.user.id
        ),
    });
  } catch (error) {
    console.error(
      "Google Play purchase context error:",
      error
    );

    return json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      500
    );
  }
}
