import "server-only";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import {
  getAgentDocumentAccess,
} from "@/lib/agent-document-access";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

export function getAgentDocumentAdmin():
  SupabaseClient {
  if (
    !supabaseUrl ||
    !supabaseServiceRoleKey
  ) {
    throw new Error(
      "Supabase server configuration is missing."
    );
  }

  return createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function getBearerToken(
  request: Request
) {
  const authorization =
    request.headers.get(
      "authorization"
    ) || "";

  if (
    !authorization
      .toLowerCase()
      .startsWith("bearer ")
  ) {
    return "";
  }

  return authorization
    .slice(7)
    .trim();
}

export async function getAuthenticatedDocumentUser(
  request: Request,
  admin: SupabaseClient
) {
  const token =
    getBearerToken(request);

  if (!token) {
    return {
      user: null,
      response: Response.json(
        {
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      ),
    };
  }

  const {
    data,
    error,
  } = await admin.auth.getUser(
    token
  );

  if (
    error ||
    !data.user
  ) {
    return {
      user: null,
      response: Response.json(
        {
          error:
            "Invalid or expired session.",
        },
        {
          status: 401,
        }
      ),
    };
  }

  return {
    user: data.user,
    response: null,
  };
}

export async function requireAgentDocumentWriteAccess(
  admin: SupabaseClient,
  userId: string
) {
  const access =
    await getAgentDocumentAccess(
      admin,
      userId
    );

  if (access.allowed) {
    return {
      access,
      response: null,
    };
  }

  if (
    access.reason ===
    "no-active-membership"
  ) {
    return {
      access,
      response: Response.json(
        {
          error:
            "Active Gold or Agent Pro membership is required.",
          code:
            "AGENT_DOCUMENT_MEMBERSHIP_REQUIRED",
          packageId:
            access.packageId,
        },
        {
          status: 403,
        }
      ),
    };
  }

  return {
    access,
    response: Response.json(
      {
        error:
          "Agent Tools are available for Gold and Agent Pro memberships.",
        code:
          "AGENT_DOCUMENT_UPGRADE_REQUIRED",
        packageId:
          access.packageId,
        packageName:
          access.packageName,
      },
      {
        status: 403,
      }
    ),
  };
}
