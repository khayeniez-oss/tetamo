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

const ENTRY_SELECT = `
  id,
  category,
  canonical_question,
  approved_answer,
  language,
  status,
  priority,
  usage_count,
  created_by,
  reviewed_by,
  reviewed_at,
  created_at,
  updated_at
`;

type AdminAuthResult = {
  authorised: boolean;
  userId?: string;
  response?: Response;
};

function getBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization") || "";

  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authHeader.slice(7).trim();
}

async function verifyAdmin(req: Request): Promise<AdminAuthResult> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return {
      authorised: false,
      response: Response.json(
        {
          success: false,
          error: "Supabase server environment variables are missing.",
        },
        { status: 500 }
      ),
    };
  }

  const token = getBearerToken(req);

  if (!token) {
    return {
      authorised: false,
      response: Response.json(
        {
          success: false,
          error: "Unauthorised. Login is required.",
        },
        { status: 401 }
      ),
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return {
      authorised: false,
      response: Response.json(
        {
          success: false,
          error: "Unauthorised. Invalid session.",
        },
        { status: 401 }
      ),
    };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Knowledge Base admin verification error:", profileError);

    return {
      authorised: false,
      response: Response.json(
        {
          success: false,
          error: "Unable to verify admin access.",
        },
        { status: 500 }
      ),
    };
  }

  const role = String((profile as any)?.role || "").toLowerCase();

  if (!role.includes("admin")) {
    return {
      authorised: false,
      response: Response.json(
        {
          success: false,
          error: "Forbidden. Admin access is required.",
        },
        { status: 403 }
      ),
    };
  }

  return {
    authorised: true,
    userId: user.id,
  };
}

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function cleanStatus(value: unknown) {
  const status = cleanText(value).toLowerCase();

  if (["draft", "active", "inactive"].includes(status)) {
    return status;
  }

  return "draft";
}

function cleanLanguage(value: unknown) {
  const language = cleanText(value).toLowerCase();

  if (["id", "en"].includes(language)) {
    return language;
  }

  return "id";
}

function cleanPriority(value: unknown) {
  const priority = Number(value || 0);

  if (!Number.isFinite(priority)) {
    return 0;
  }

  return Math.max(0, Math.min(Math.floor(priority), 100));
}

export async function GET(req: Request) {
  const auth = await verifyAdmin(req);

  if (!auth.authorised) {
    return auth.response!;
  }

  try {
    const url = new URL(req.url);

    const search = cleanText(url.searchParams.get("search"));
    const status = cleanText(url.searchParams.get("status")).toLowerCase();
    const language = cleanText(url.searchParams.get("language")).toLowerCase();
    const category = cleanText(url.searchParams.get("category"));

    let query = supabaseAdmin
      .from("knowledge_base_entries")
      .select(ENTRY_SELECT)
      .order("priority", { ascending: false })
      .order("updated_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (language && language !== "all") {
      query = query.eq("language", language);
    }

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    if (search) {
      const escapedSearch = search.replace(/[%_,()]/g, " ");

      query = query.or(
        `canonical_question.ilike.%${escapedSearch}%,approved_answer.ilike.%${escapedSearch}%,category.ilike.%${escapedSearch}%`
      );
    }

    const [
      entriesResult,
      totalResult,
      activeResult,
      draftResult,
      inactiveResult,
      candidatesResult,
    ] = await Promise.all([
      query,

      supabaseAdmin
        .from("knowledge_base_entries")
        .select("id", { count: "exact", head: true }),

      supabaseAdmin
        .from("knowledge_base_entries")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),

      supabaseAdmin
        .from("knowledge_base_entries")
        .select("id", { count: "exact", head: true })
        .eq("status", "draft"),

      supabaseAdmin
        .from("knowledge_base_entries")
        .select("id", { count: "exact", head: true })
        .eq("status", "inactive"),

      supabaseAdmin
        .from("knowledge_base_candidates")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);

    if (entriesResult.error) {
      console.error(
        "Failed to load Knowledge Base entries:",
        entriesResult.error
      );

      return Response.json(
        {
          success: false,
          error: "Failed to load Knowledge Base entries.",
        },
        { status: 500 }
      );
    }

    const countErrors = [
      totalResult.error,
      activeResult.error,
      draftResult.error,
      inactiveResult.error,
      candidatesResult.error,
    ].filter(Boolean);

    if (countErrors.length > 0) {
      console.error("Failed to load Knowledge Base counts:", countErrors);
    }

    const categories = Array.from(
      new Set(
        (entriesResult.data || [])
          .map((entry: any) => cleanText(entry.category))
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    return Response.json({
      success: true,
      entries: entriesResult.data || [],
      categories,
      stats: {
        total: totalResult.count || 0,
        active: activeResult.count || 0,
        draft: draftResult.count || 0,
        inactive: inactiveResult.count || 0,
        pendingCandidates: candidatesResult.count || 0,
      },
    });
  } catch (error) {
    console.error("Knowledge Base GET error:", error);

    return Response.json(
      {
        success: false,
        error: "Failed to load Knowledge Base.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const auth = await verifyAdmin(req);

  if (!auth.authorised) {
    return auth.response!;
  }

  try {
    const body = await req.json();

    const canonicalQuestion = cleanText(body?.canonicalQuestion);
    const approvedAnswer = cleanText(body?.approvedAnswer);
    const category = cleanText(body?.category) || "general";
    const language = cleanLanguage(body?.language);
    const status = cleanStatus(body?.status);
    const priority = cleanPriority(body?.priority);

    if (!canonicalQuestion) {
      return Response.json(
        {
          success: false,
          error: "Question is required.",
        },
        { status: 400 }
      );
    }

    if (!approvedAnswer) {
      return Response.json(
        {
          success: false,
          error: "Answer is required.",
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("knowledge_base_entries")
      .insert({
        canonical_question: canonicalQuestion,
        approved_answer: approvedAnswer,
        category,
        language,
        status,
        priority,
        usage_count: 0,
        created_by: auth.userId,
        reviewed_by: status === "active" ? auth.userId : null,
        reviewed_at: status === "active" ? now : null,
        created_at: now,
        updated_at: now,
      })
      .select(ENTRY_SELECT)
      .single();

    if (error) {
      console.error("Failed to create Knowledge Base entry:", error);

      return Response.json(
        {
          success: false,
          error: "Failed to create Knowledge Base entry.",
        },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      entry: data,
    });
  } catch (error) {
    console.error("Knowledge Base POST error:", error);

    return Response.json(
      {
        success: false,
        error: "Failed to create Knowledge Base entry.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const auth = await verifyAdmin(req);

  if (!auth.authorised) {
    return auth.response!;
  }

  try {
    const body = await req.json();

    const id = cleanText(body?.id);
    const action = cleanText(body?.action);

    if (!id) {
      return Response.json(
        {
          success: false,
          error: "Knowledge Base entry ID is required.",
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    let updatePayload: Record<string, unknown> = {
      updated_at: now,
    };

    if (action === "activate") {
      updatePayload = {
        ...updatePayload,
        status: "active",
        reviewed_by: auth.userId,
        reviewed_at: now,
      };
    } else if (action === "deactivate") {
      updatePayload = {
        ...updatePayload,
        status: "inactive",
      };
    } else if (action === "draft") {
      updatePayload = {
        ...updatePayload,
        status: "draft",
      };
    } else {
      const canonicalQuestion = cleanText(body?.canonicalQuestion);
      const approvedAnswer = cleanText(body?.approvedAnswer);

      if (!canonicalQuestion) {
        return Response.json(
          {
            success: false,
            error: "Question is required.",
          },
          { status: 400 }
        );
      }

      if (!approvedAnswer) {
        return Response.json(
          {
            success: false,
            error: "Answer is required.",
          },
          { status: 400 }
        );
      }

      const status = cleanStatus(body?.status);

      updatePayload = {
        canonical_question: canonicalQuestion,
        approved_answer: approvedAnswer,
        category: cleanText(body?.category) || "general",
        language: cleanLanguage(body?.language),
        status,
        priority: cleanPriority(body?.priority),
        updated_at: now,
        reviewed_by: status === "active" ? auth.userId : null,
        reviewed_at: status === "active" ? now : null,
      };
    }

    const { data, error } = await supabaseAdmin
      .from("knowledge_base_entries")
      .update(updatePayload)
      .eq("id", id)
      .select(ENTRY_SELECT)
      .maybeSingle();

    if (error) {
      console.error("Failed to update Knowledge Base entry:", error);

      return Response.json(
        {
          success: false,
          error: "Failed to update Knowledge Base entry.",
        },
        { status: 500 }
      );
    }

    if (!data) {
      return Response.json(
        {
          success: false,
          error: "Knowledge Base entry was not found.",
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      entry: data,
    });
  } catch (error) {
    console.error("Knowledge Base PATCH error:", error);

    return Response.json(
      {
        success: false,
        error: "Failed to update Knowledge Base entry.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const auth = await verifyAdmin(req);

  if (!auth.authorised) {
    return auth.response!;
  }

  try {
    const url = new URL(req.url);
    const id = cleanText(url.searchParams.get("id"));

    if (!id) {
      return Response.json(
        {
          success: false,
          error: "Knowledge Base entry ID is required.",
        },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("knowledge_base_entries")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Failed to delete Knowledge Base entry:", error);

      return Response.json(
        {
          success: false,
          error: "Failed to delete Knowledge Base entry.",
        },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      deletedId: id,
    });
  } catch (error) {
    console.error("Knowledge Base DELETE error:", error);

    return Response.json(
      {
        success: false,
        error: "Failed to delete Knowledge Base entry.",
      },
      { status: 500 }
    );
  }
}