import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
  },
});

function getBearerToken(req: Request) {
  const header = req.headers.get("authorization") || "";

  if (!header.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return header.slice(7).trim();
}

function membershipIsActive(row: {
  status?: string | null;
  expires_at?: string | null;
}) {
  if (row.status !== "active") return false;
  if (!row.expires_at) return true;

  const expiresAt = new Date(row.expires_at);

  if (Number.isNaN(expiresAt.getTime())) return false;

  return expiresAt.getTime() >= Date.now();
}

async function authenticateAgentPro(req: Request) {
  if (!supabaseUrl || !serviceRoleKey) {
    return {
      error: Response.json(
        { error: "Supabase server environment variables are missing." },
        { status: 500 }
      ),
    };
  }

  const token = getBearerToken(req);

  if (!token) {
    return {
      error: Response.json(
        { error: "Unauthorized. Login is required." },
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
      error: Response.json(
        { error: "Unauthorized. Invalid session." },
        { status: 401 }
      ),
    };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("AI Video profile verification failed:", profileError);

    return {
      error: Response.json(
        { error: "Unable to verify video generation access." },
        { status: 500 }
      ),
    };
  }

  if (!["agent", "owner"].includes(String(profile?.role || "").toLowerCase())) {
    return {
      error: Response.json(
        { error: "Forbidden. Owner or agent access is required." },
        { status: 403 }
      ),
    };
  }

  const { data: memberships, error: membershipError } = await supabaseAdmin
    .from("agent_memberships")
    .select("id, package_id, status, expires_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (membershipError) {
    console.error("AI Video membership verification failed:", membershipError);

    return {
      error: Response.json(
        { error: "Unable to verify video generation access." },
        { status: 500 }
      ),
    };
  }

  const activeMembership =
    (memberships || []).find((membership) =>
      membershipIsActive(membership)
    ) || null;

  if (String(profile?.role || "").toLowerCase() === "agent" && (!activeMembership || !["gold", "agent-pro"].includes(activeMembership.package_id))) {
    return {
      error: Response.json(
        {
          error: "Gold or Agent Pro membership is required.",
          code: "AI_VIDEO_PACKAGE_REQUIRED",
        },
        { status: 403 }
      ),
    };
  }

  return {
    user,
    profile,
    membership: activeMembership,
  };
}

export async function POST(req: Request) {
  const auth = await authenticateAgentPro(req);

  if ("error" in auth) {
    return auth.error;
  }

  let body: {
    mediaFolder?: string;
    propertyId?: string | null;
    language?: "id" | "en";
    audioMode?: "none" | "original" | "recorded";
    ownerPlan?: string;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const sourceRole = String(auth.profile?.role || "").toLowerCase();
  const selectedPackage = sourceRole === "owner" ? String(body.ownerPlan || "") : String(auth.membership?.package_id || "");
  if (sourceRole === "owner" && !["priority", "featured"].includes(selectedPackage)) return Response.json({ error: "AI video generation requires the Owner Priority or Featured package.", code: "AI_VIDEO_PACKAGE_REQUIRED" }, { status: 403 });
  const generationLimit = sourceRole === "owner" ? 1 : selectedPackage === "gold" ? 2 : 3;

  const mediaFolder = String(body.mediaFolder || "").trim();

  if (!mediaFolder) {
    return Response.json(
      { error: "mediaFolder is required." },
      { status: 400 }
    );
  }

  const generationLanguage = body.language === "en" ? "en" : "id";

  const allowedAudioModes = new Set([
    "none",
    "original",
    "recorded",
  ]);

  const audioMode = allowedAudioModes.has(String(body.audioMode))
    ? String(body.audioMode)
    : "none";

  const propertyId: string | null = null;

  if (body.propertyId) {
    return Response.json({ error: "Listing videos can only be generated during Create, not Edit.", code: "LISTING_VIDEO_LOCKED" }, { status: 403 });
  }

  const { data: existingProject, error: existingError } =
    await supabaseAdmin
      .from("ai_property_video_projects")
      .select(
        "id, media_folder, property_id, status, generation_language, audio_mode, successful_generation_count, approved_generation_id, source_role, selected_package, generation_limit"
      )
      .eq("user_id", auth.user.id)
      .eq("media_folder", mediaFolder)
      .maybeSingle();

  if (existingError) {
    console.error("AI Video project lookup failed:", existingError);

    if (["42703", "PGRST204"].includes(existingError.code) || /column.*(source_role|selected_package|generation_limit)/i.test(existingError.message)) {
      return Response.json({ error: "Video generation is not configured: the database video upgrade is required. Your selected photos and music have not been changed.", code: "AI_VIDEO_SCHEMA_REQUIRED" }, { status: 503 });
    }

    return Response.json(
      { error: "Unable to load AI Video project." },
      { status: 500 }
    );
  }

  if (existingProject?.property_id) return Response.json({ error: "Saved listing videos cannot be changed.", code: "LISTING_VIDEO_LOCKED" }, { status: 403 });
  if (existingProject) {
    const { data: updatedProject, error: updateError } =
      await supabaseAdmin
        .from("ai_property_video_projects")
        .update({
          property_id: propertyId || existingProject.property_id,
          generation_language: generationLanguage,
          audio_mode: audioMode,
          source_role: sourceRole, selected_package: selectedPackage, generation_limit: generationLimit,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingProject.id)
        .eq("user_id", auth.user.id)
        .select(
          "id, media_folder, property_id, status, generation_language, audio_mode, successful_generation_count, approved_generation_id, source_role, selected_package, generation_limit"
        )
        .single();

    if (updateError) {
      console.error("AI Video project update failed:", updateError);

      return Response.json(
        { error: "Unable to update AI Video project." },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      created: false,
      generationLimit,
      project: updatedProject,
      agentFullName: String(auth.profile?.full_name || "").trim(),
    });
  }

  const { data: project, error: createError } = await supabaseAdmin
    .from("ai_property_video_projects")
    .insert({
      user_id: auth.user.id,
      source_role: sourceRole, selected_package: selectedPackage, generation_limit: generationLimit,
      media_folder: mediaFolder,
      property_id: propertyId,
      status: "draft",
      generation_language: generationLanguage,
      audio_mode: audioMode,
    })
    .select(
      "id, media_folder, property_id, status, generation_language, audio_mode, successful_generation_count, approved_generation_id, source_role, selected_package, generation_limit"
    )
    .single();

  if (createError) {
    console.error("AI Video project creation failed:", createError);

    return Response.json(
      { error: "Unable to create AI Video project." },
      { status: 500 }
    );
  }

  return Response.json({
    ok: true,
    created: true,
    generationLimit,
    project,
    agentFullName: String(auth.profile?.full_name || "").trim(),
  });
}
