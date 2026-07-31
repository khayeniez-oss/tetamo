import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { runMonaV2 } from "@/lib/mona-v2/orchestrator";
import type {
  MonaV2ConversationContext,
} from "@/lib/mona-v2/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

type MonaV2TestBody = {
  message?: unknown;
  messageType?: unknown;
  conversationContext?: MonaV2ConversationContext | null;
};

export async function POST(request: NextRequest) {
  /*
   * This endpoint exists only for local Mona V2 development.
   * It must never be available from the production website.
   */
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error: "Not found",
      },
      {
        status: 404,
      }
    );
  }

  try {
    const body =
      (await request.json()) as MonaV2TestBody;

    const message = String(
      body.message ?? ""
    ).trim();

    if (!message) {
      return NextResponse.json(
        {
          error: "A test message is required.",
        },
        {
          status: 400,
        }
      );
    }

    const result = await runMonaV2({
      customerMessage: message,
      messageType: String(
        body.messageType ?? "text"
      ),
      conversationContext:
        body.conversationContext ?? null,
      supabase: supabaseAdmin,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "Mona V2 local test endpoint failed:",
      error
    );

    return NextResponse.json(
      {
        error: "Mona V2 test failed.",
      },
      {
        status: 500,
      }
    );
  }
}
