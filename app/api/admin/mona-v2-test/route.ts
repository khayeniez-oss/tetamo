import { NextRequest, NextResponse } from "next/server";

import { analyseMonaV2Message } from "@/lib/mona-v2/analyser";
import type {
  MonaV2ConversationContext,
} from "@/lib/mona-v2/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const message = String(body.message ?? "").trim();

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

    const analysis = await analyseMonaV2Message({
      customerMessage: message,
      messageType: String(
        body.messageType ?? "text"
      ),
      conversationContext:
        body.conversationContext ?? null,
    });

    return NextResponse.json({
      message,
      analysis,
    });
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
