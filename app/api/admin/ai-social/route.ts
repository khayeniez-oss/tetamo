import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: {
      persistSession: false,
    },
  }
);

type AdminAuthResult = {
  authorized: boolean;
  userId?: string;
  response?: Response;
};

type GenerateMode = "listing" | "manual" | "campaign";

type GenerateRequest = {
  mode: GenerateMode;
  propertyId?: string;
  manualProperty?: {
    title?: string;
    propertyType?: string;
    listingType?: string;
    rentalType?: string;
    saleType?: string;
    price?: string;
    location?: string;
    landSize?: string;
    buildingSize?: string;
    bedrooms?: string;
    bathrooms?: string;
    features?: string;
    nearby?: string;
    targetAudience?: string;
    notes?: string;
  };
  campaign?: {
    campaignType?: string;
    campaignGoal?: string;
    targetAudience?: string;
    keyMessage?: string;
  };
  platform?: string;
  language?: string;
  tone?: string;
  extraInstruction?: string;
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
      authorized: false,
      response: Response.json(
        { error: "Supabase server environment variables are missing." },
        { status: 500 }
      ),
    };
  }

  const token = getBearerToken(req);

  if (!token) {
    return {
      authorized: false,
      response: Response.json(
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
      authorized: false,
      response: Response.json(
        { error: "Unauthorized. Invalid session." },
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
    console.error("Failed to verify admin profile:", profileError);

    return {
      authorized: false,
      response: Response.json(
        { error: "Unable to verify admin access." },
        { status: 500 }
      ),
    };
  }

  const role = String((profile as any)?.role || "").toLowerCase();
  const isAdmin = role.includes("admin");

  if (!isAdmin) {
    return {
      authorized: false,
      response: Response.json(
        { error: "Forbidden. Admin access is required." },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    userId: user.id,
  };
}

function formatIdr(value: number | null | undefined) {
  if (typeof value !== "number") return "";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

async function getPropertyContext(propertyId: string) {
  const { data, error } = await supabaseAdmin
    .from("properties")
    .select(
      `
      id,
      kode,
      title,
      title_id,
      description,
      description_id,
      price,
      city,
      area,
      address,
      listing_type,
      rental_type,
      sale_type,
      property_type,
      land_size,
      building_size,
      land_unit,
      bedrooms,
      bathrooms,
      facilities,
      road_access,
      ownership_type,
      land_type,
      zoning_type,
      source,
      plan_id,
      status,
      property_images (
        image_url,
        sort_order,
        is_cover
      ),
      profiles:user_id (
        id,
        full_name,
        role
      )
    `
    )
    .eq("id", propertyId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load property for AI social:", error);
    throw new Error("Failed to load selected property.");
  }

  if (!data) {
    throw new Error("Selected property was not found.");
  }

  const row = data as any;
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

  return {
    id: row.id,
    kode: row.kode || "",
    title: row.title || "",
    titleId: row.title_id || "",
    description: row.description || "",
    descriptionId: row.description_id || "",
    price: formatIdr(row.price),
    city: row.city || "",
    area: row.area || "",
    address: row.address || "",
    listingType: row.listing_type || "",
    rentalType: row.rental_type || "",
    saleType: row.sale_type || "",
    propertyType: row.property_type || "",
    landSize: row.land_size || "",
    buildingSize: row.building_size || "",
    landUnit: row.land_unit || "m²",
    bedrooms: row.bedrooms || "",
    bathrooms: row.bathrooms || "",
    facilities: row.facilities || "",
    roadAccess: row.road_access || "",
    ownershipType: row.ownership_type || "",
    landType: row.land_type || "",
    zoningType: row.zoning_type || "",
    source: row.source || "",
    planId: row.plan_id || "",
    ownerOrAgentName: profile?.full_name || "",
    ownerOrAgentRole: profile?.role || "",
  };
}

function buildPrompt(input: GenerateRequest, propertyContext?: any) {
  const platform = input.platform || "All platforms";
  const language = input.language || "Bilingual";
  const tone = input.tone || "Professional and friendly";

  const manual = input.manualProperty || {};
  const campaign = input.campaign || {};

  return `
You are Tetamo AI Social Media Generator.

Your job:
Create ready-to-post social media marketing content for Tetamo, property listings, owners, agents, developers, and Tetamo campaigns.

Tetamo identity:
- Tetamo is an Australian-based SaaS/property marketplace platform under Tetamo Pty Ltd.
- Tetamo serves Indonesia's property market digitally.
- Tetamo is a platform, not a brokerage, not a real estate agency, and not a real estate agent.
- Tetamo helps owners, agents, agencies, developers, buyers, renters, and investors advertise, discover, and inquire about properties.
- Tetamo focuses on clarity, transparency, verified listings, direct WhatsApp inquiry, schedule viewing, bilingual AI title/description, photo/video upload, and better inquiry flow.

Important sales positioning:
- Do not say "we cannot guarantee leads" unless the user specifically asks about guarantees.
- Explain positively that Tetamo helps create better inquiry opportunities through clearer listings, transparency, direct contact, schedule viewing, and better property presentation.
- Do not promise guaranteed leads, guaranteed sales, guaranteed rental, guaranteed ROI, or legal results.
- Sound professional, friendly, helpful, and sales-driven.
- Write like a strong human marketing assistant, not a robotic AI.
- Make the content attractive but not exaggerated.
- Use natural CTA.
- Include relevant property hashtags and Tetamo brand hashtags.
- Avoid overusing emojis. Use only if suitable for the selected platform and tone.

Generation settings:
Mode: ${input.mode}
Platform: ${platform}
Language: ${language}
Tone: ${tone}
Extra instruction: ${input.extraInstruction || "None"}

Selected listing context:
${
  propertyContext
    ? JSON.stringify(propertyContext, null, 2)
    : "No selected Tetamo listing."
}

Manual property context:
${JSON.stringify(manual, null, 2)}

Campaign context:
${JSON.stringify(campaign, null, 2)}

Output format:
Return only valid JSON. No markdown. No code fence.

JSON shape:
{
  "instagramFacebookCaption": "string",
  "tiktokReelsCaption": "string",
  "linkedinCaption": "string",
  "shortReelScript": "string",
  "adCopy": {
    "primaryText": "string",
    "headline": "string",
    "description": "string"
  },
  "whatsappBroadcast": "string",
  "ctaOptions": ["string", "string", "string"],
  "hashtags": ["string", "string", "string", "string", "string", "string", "string", "string"],
  "contentNotes": "string"
}

Rules:
- Instagram/Facebook caption can be medium length.
- TikTok/Reels caption should be shorter and hook-driven.
- LinkedIn caption should sound more professional.
- Reel script should be short and usable for a 15–30 second reel.
- Ad copy should be concise and conversion-focused.
- WhatsApp broadcast should be short, direct, and friendly.
- CTA options should be practical.
- Hashtags should include Tetamo and relevant location/property tags.
- If language is Indonesian, output Indonesian.
- If language is English, output English.
- If language is Bilingual, include English and Indonesian naturally.
`;
}

function safeParseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export async function POST(req: Request) {
  try {
    const auth = await verifyAdmin(req);

    if (!auth.authorized) {
      return auth.response!;
    }

    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "OPENAI_API_KEY is missing." },
        { status: 500 }
      );
    }

    const body = (await req.json()) as GenerateRequest;

    if (!body.mode) {
      return Response.json({ error: "Mode is required." }, { status: 400 });
    }

    let propertyContext: any = null;

    if (body.mode === "listing") {
      if (!body.propertyId) {
        return Response.json(
          { error: "propertyId is required for listing mode." },
          { status: 400 }
        );
      }

      propertyContext = await getPropertyContext(body.propertyId);
    }

    const prompt = buildPrompt(body, propertyContext);

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      temperature: 0.65,
      max_output_tokens: 1800,
    });

    const outputText = normalizeText(response.output_text);
    const parsed = safeParseJson(outputText);

    if (!parsed) {
      return Response.json(
        {
          error: "AI returned an invalid format. Please try again.",
          raw: outputText,
        },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      result: parsed,
    });
  } catch (error: any) {
    console.error("AI social generation error:", error);

    return Response.json(
      {
        error:
          error?.message ||
          "Failed to generate AI social media content. Please try again.",
      },
      { status: 500 }
    );
  }
}