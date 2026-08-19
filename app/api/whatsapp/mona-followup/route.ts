import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: {
      persistSession: false,
    },
  }
);

function cleanEnv(value?: string | null) {
  return String(value || "").trim();
}

function getBearerToken(req: Request) {
  const authorization =
    req.headers.get("authorization") || "";

  if (
    !authorization
      .toLowerCase()
      .startsWith("bearer ")
  ) {
    return "";
  }

  return authorization.slice(7).trim();
}

function verifyCronRequest(req: Request) {
  const cronSecret = cleanEnv(
    process.env.CRON_SECRET
  );

  if (!cronSecret) {
    return {
      authorized: false,
      response: Response.json(
        {
          error:
            "CRON_SECRET is not configured.",
        },
        {
          status: 500,
        }
      ),
    };
  }

  const token = getBearerToken(req);

  if (!token || token !== cronSecret) {
    return {
      authorized: false,
      response: Response.json(
        {
          error:
            "Unauthorized Mona follow-up scheduler request.",
        },
        {
          status: 401,
        }
      ),
    };
  }

  return {
    authorized: true,
    response: null,
  };
}

type ClaimedFollowUp = {
  conversation_id: string;
  claim_token: string;
};

async function runScheduler(req: Request) {
  const auth = verifyCronRequest(req);

  if (!auth.authorized) {
    return auth.response!;
  }

  const { data, error } =
    await supabaseAdmin.rpc(
      "claim_due_mona_followups",
      {
        p_limit: 25,
      }
    );

  if (error) {
    console.error(
      "Failed to claim due Mona follow-ups:",
      error
    );

    return Response.json(
      {
        success: false,
        error:
          "Failed to claim due Mona follow-ups.",
      },
      {
        status: 500,
      }
    );
  }

  const claimed =
    Array.isArray(data)
      ? (data as ClaimedFollowUp[])
      : [];

  if (claimed.length === 0) {
    return Response.json({
      success: true,
      claimed: 0,
      sent: 0,
      silent: 0,
      failed: 0,
      results: [],
    });
  }

  const secret = cleanEnv(
    process.env.CRON_SECRET
  );

  const sendUrl = new URL(
    "/api/admin/whatsapp/send",
    req.url
  );

  const results: Array<{
    conversationId: string;
    action:
      | "sent"
      | "silent"
      | "failed";
    followUpNumber?: number | null;
    reason?: string | null;
    error?: unknown;
  }> = [];

  /*
   * Process sequentially.
   *
   * The SQL claim function already prevents
   * multiple scheduler workers from claiming
   * the same conversation simultaneously.
   */
  for (const item of claimed) {
    const conversationId = String(
      item.conversation_id || ""
    ).trim();

    const claimToken = String(
      item.claim_token || ""
    ).trim();

    if (!conversationId || !claimToken) {
      results.push({
        conversationId:
          conversationId || "unknown",
        action: "failed",
        error:
          "Claim returned incomplete data.",
      });

      continue;
    }

    try {
      const response = await fetch(
        sendUrl,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${secret}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            mode: "mona_followup",
            conversationId,
            claimToken,
          }),
          cache: "no-store",
        }
      );

      const result =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        console.error(
          "Mona follow-up send route failed:",
          {
            conversationId,
            status:
              response.status,
            result,
          }
        );

        results.push({
          conversationId,
          action: "failed",
          error:
            result ||
            `HTTP ${response.status}`,
        });

        continue;
      }

      if (
        result?.action === "sent"
      ) {
        results.push({
          conversationId,
          action: "sent",
          followUpNumber:
            result?.followUpNumber ??
            null,
        });

        continue;
      }

      results.push({
        conversationId,
        action: "silent",
        followUpNumber:
          result?.followUpNumber ??
          null,
        reason:
          result?.reason ||
          null,
      });
    } catch (error) {
      console.error(
        "Mona follow-up scheduler request failed:",
        {
          conversationId,
          error,
        }
      );

      results.push({
        conversationId,
        action: "failed",
        error:
          error instanceof Error
            ? error.message
            : error,
      });
    }
  }

  const sent =
    results.filter(
      (item) =>
        item.action === "sent"
    ).length;

  const silent =
    results.filter(
      (item) =>
        item.action === "silent"
    ).length;

  const failed =
    results.filter(
      (item) =>
        item.action === "failed"
    ).length;

  return Response.json({
    success: failed === 0,
    claimed:
      claimed.length,
    sent,
    silent,
    failed,
    results,
  });
}

export async function GET(req: Request) {
  return runScheduler(req);
}

export async function POST(req: Request) {
  return runScheduler(req);
}
