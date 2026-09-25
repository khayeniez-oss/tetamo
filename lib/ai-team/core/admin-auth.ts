import "server-only";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export type TetamoAdminIdentity = {
  userId: string;
  role: "admin";
};

export type TetamoAdminAuthResult =
  | {
      authorized: true;
      admin: TetamoAdminIdentity;
    }
  | {
      authorized: false;
      response: Response;
    };

export const aiTeamSupabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

function getBearerToken(req: Request) {
  const authHeader =
    req.headers.get("authorization") || "";

  if (
    !authHeader
      .toLowerCase()
      .startsWith("bearer ")
  ) {
    return "";
  }

  return authHeader.slice(7).trim();
}

export async function requireTetamoAdmin(
  req: Request
): Promise<TetamoAdminAuthResult> {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return {
      authorized: false,
      response: Response.json(
        {
          ok: false,
          error:
            "Supabase server environment is not configured.",
        },
        { status: 500 }
      ),
    };
  }

  const token = getBearerToken(req);

  if (!token) {
    return {
      authorized: false,
      response: Response.json(
        {
          ok: false,
          error:
            "Unauthorized. Login is required.",
        },
        { status: 401 }
      ),
    };
  }

  const {
    data: { user },
    error: userError,
  } = await aiTeamSupabaseAdmin.auth.getUser(
    token
  );

  if (userError || !user) {
    return {
      authorized: false,
      response: Response.json(
        {
          ok: false,
          error:
            "Unauthorized. Invalid session.",
        },
        { status: 401 }
      ),
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await aiTeamSupabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "AI Team admin verification failed:",
      profileError
    );

    return {
      authorized: false,
      response: Response.json(
        {
          ok: false,
          error:
            "Unable to verify admin access.",
        },
        { status: 500 }
      ),
    };
  }

  const role = String(
    profile?.role || ""
  )
    .trim()
    .toLowerCase();

  if (role !== "admin") {
    return {
      authorized: false,
      response: Response.json(
        {
          ok: false,
          error:
            "Forbidden. Admin access is required.",
        },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    admin: {
      userId: user.id,
      role: "admin",
    },
  };
}

/**
 * Allows a protected internal worker to use the same
 * Rupert routes as the human Admin UI.
 *
 * - Admin requests continue through requireTetamoAdmin().
 * - Vercel/internal cron requests must present CRON_SECRET.
 * - Cron work deliberately has no human user_id.
 *
 * Only routes that explicitly call this helper allow cron.
 */
export async function requireTetamoAdminOrCron(
  req: Request
) {
  const secret =
    String(
      process.env.CRON_SECRET ||
        ""
    ).trim();

  const authorization =
    req.headers.get(
      "authorization"
    ) || "";

  const token =
    authorization
      .toLowerCase()
      .startsWith("bearer ")
      ? authorization
          .slice(7)
          .trim()
      : "";

  if (
    secret &&
    token &&
    token === secret
  ) {
    return {
      authorized:
        true as const,

      admin: {
        userId:
          null as string | null,
      },

      authMode:
        "cron" as const,
    };
  }

  return requireTetamoAdmin(
    req
  );
}
