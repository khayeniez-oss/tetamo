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

type AgentAuthResult = {
  authorized: boolean;
  userId?: string;
  agentProfile?: {
    fullName: string;
    agency: string;
    role: string;
    phone: string;
    email?: string;
  };
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

type AgentMembershipRow = {
  id: string;
  status: string | null;
  expires_at: string | null;
};

function getBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization") || "";

  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authHeader.slice(7).trim();
}

function isMembershipActive(membership: AgentMembershipRow | null) {
  if (!membership) return false;
  if (membership.status !== "active") return false;

  if (!membership.expires_at) return true;

  const expiresAt = new Date(membership.expires_at);

  if (Number.isNaN(expiresAt.getTime())) return true;

  return expiresAt.getTime() >= Date.now();
}

async function verifyAgent(req: Request): Promise<AgentAuthResult> {
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
    .select("id, full_name, role, phone, agency")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Failed to verify agent profile:", profileError);

    return {
      authorized: false,
      response: Response.json(
        { error: "Unable to verify agent access." },
        { status: 500 }
      ),
    };
  }

  const role = String((profile as any)?.role || "").toLowerCase();
  const isAgent = role === "agent";

  if (!isAgent) {
    return {
      authorized: false,
      response: Response.json(
        { error: "Forbidden. Agent access is required." },
        { status: 403 }
      ),
    };
  }

  const { data: memberships, error: membershipError } = await supabaseAdmin
    .from("agent_memberships")
    .select("id, status, expires_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (membershipError) {
    console.error("Failed to verify agent membership:", membershipError);

    return {
      authorized: false,
      response: Response.json(
        { error: "Unable to verify agent membership." },
        { status: 500 }
      ),
    };
  }

  const activeMembership =
    ((memberships || []) as AgentMembershipRow[]).find((membership) =>
      isMembershipActive(membership)
    ) || null;

  if (!activeMembership) {
    return {
      authorized: false,
      response: Response.json(
        { error: "Active agent membership is required." },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    userId: user.id,
    agentProfile: {
      fullName: String((profile as any)?.full_name || ""),
      agency: String((profile as any)?.agency || ""),
      role: String((profile as any)?.role || "agent"),
      phone: String((profile as any)?.phone || ""),
      email: user.email || "",
    },
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

async function getAgentPropertyContext(userId: string, propertyId: string) {
  const { data, error } = await supabaseAdmin
    .from("properties")
    .select(
      `
      id,
      kode,
      user_id,
      title,
      title_id,
      description,
      description_id,
      price,
      city,
      area,
      province,
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
      verification_status,
      transaction_status,
      property_images (
        image_url,
        sort_order,
        is_cover
      )
    `
    )
    .eq("id", propertyId)
    .eq("user_id", userId)
    .eq("source", "agent")
    .neq("status", "rejected")
    .maybeSingle();

  if (error) {
    console.error("Failed to load agent property for AI social:", error);
    throw new Error("Failed to load selected listing.");
  }

  if (!data) {
    throw new Error("Selected listing was not found or does not belong to this agent.");
  }

  const row = data as any;

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
    province: row.province || "",
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
    status: row.status || "",
    verificationStatus: row.verification_status || "",
    transactionStatus: row.transaction_status || "",
  };
}

function buildPrompt(input: GenerateRequest, params: {
  propertyContext?: any;
  agentProfile?: AgentAuthResult["agentProfile"];
}) {
  const platform = input.platform || "All platforms";
  const language = input.language || "Bilingual";
  const tone = input.tone || "Professional and friendly";

  const manual = input.manualProperty || {};
  const campaign = input.campaign || {};
  const propertyContext = params.propertyContext || null;
  const agentProfile = params.agentProfile || null;

  return `
You are Tetamo AI Social Media Generator for Agents.

Your job:
Create strong, ready-to-post social media marketing content for Tetamo agents so they can promote their own property listings, attract buyers/renters, and create better inquiry opportunities.

Important context:
- This content is for an agent using Tetamo Agent Dashboard.
- The agent is promoting their own listing or their own agent campaign.
- Tetamo is an Australian-based SaaS/property marketplace platform under Tetamo Pty Ltd.
- Tetamo serves Indonesia's property market digitally.
- Tetamo is a platform, not a brokerage, not a real estate agency, and not a real estate agent.
- Agents use Tetamo to list properties, generate better property content, receive direct inquiries, support schedule viewing, and present listings more clearly.

Agent profile:
${JSON.stringify(agentProfile, null, 2)}

Tetamo selling points agents may mention:
- Better property presentation.
- Direct WhatsApp inquiry flow.
- Schedule viewing support.
- AI-generated bilingual title and description.
- AI social media content support.
- Photo and video upload.
- Clearer, more transparent listing information.
- Verified listing / verified agent trust layer where available.
- Dashboard for managing listings, leads, and viewing activity where available.

IMPORTANT LANGUAGE RULES:
- If language is "English", output everything in English only.
- If language is "Indonesian", output everything in Bahasa Indonesia only.
- If language is "Bilingual", EVERY SINGLE OUTPUT FIELD must contain BOTH English and Bahasa Indonesia.
- For bilingual output, use this structure inside every field:
  EN:
  [English content]

  ID:
  [Bahasa Indonesia content]
- Do not use Malay.
- Do not use Malaysian Bahasa.
- Use Indonesian words naturally: properti, iklan, harga, lokasi, jadwal viewing, pemilik, agent, pembeli, penyewa.
- Do not mix English and Indonesian randomly unless the language is Bilingual.

IMPORTANT SALES RULES:
- The content must sell the property or campaign properly.
- Do not make the caption flat or generic.
- Always include the price when price is available.
- Always include the location or area when available.
- Explain why the location/area is attractive.
- Explain why the property is attractive.
- Explain why a buyer, renter, investor, or owner should take action.
- Include lifestyle appeal where relevant: convenience, access, nearby hotspots, comfort, business potential, investment value, family use, rental demand, area growth, tourism, expat demand, or local accessibility.
- Include a clear invitation/CTA.
- For sale listings, invite buyers/investors to inquire, compare, schedule viewing, or check details.
- For rental listings, invite renters to ask availability, schedule viewing, or contact directly.
- For agent campaigns, position the agent as helpful, professional, responsive, and ready to assist.
- Do not promise guaranteed leads, guaranteed sales, guaranteed rental, guaranteed ROI, or legal results.
- Do not say "we cannot guarantee leads" unless directly asked about guarantees.
- Instead, explain positively that Tetamo helps create better inquiry opportunities through clearer listings, transparency, direct contact, schedule viewing, and better property presentation.
- Be professional, friendly, helpful, and sales-driven.
- Write like a strong human marketing assistant, not a robotic AI.
- Avoid overusing emojis. Use only if suitable.

PROPERTY POST STRUCTURE:
For property listing/manual property content, include these points naturally:
1. Hook/opening line.
2. Property type and purpose: sale/rent/developer project.
3. Location/area.
4. Price, if available.
5. Key property details: bedrooms, bathrooms, land/building size, features, ownership/rental type, road access, zoning, facilities.
6. Lifestyle/location appeal: why the area is attractive or convenient.
7. Why this property is worth considering.
8. Tetamo value: clearer listing, direct WhatsApp inquiry, schedule viewing, transparent property information.
9. Strong CTA to contact/schedule viewing/inquire.

AD COPY RULES:
Ad copy must be persuasive and conversion-focused.
Primary text should include:
- Hook
- Location
- Price if available
- Main property benefits
- Why the area/property is attractive
- Direct invitation to inquire/schedule viewing

Headline should be short and sales-driven.
Description should invite action.

REEL SCRIPT RULES:
Make it usable for a 15–30 second Reel:
- Scene 1: Hook
- Scene 2: Location/property highlight
- Scene 3: Feature/lifestyle appeal
- Scene 4: Price or value point if available
- Scene 5: CTA through Tetamo / contact agent / schedule viewing

HASHTAG RULES:
- Include Tetamo hashtags.
- Include agent/property hashtags where relevant.
- Include location hashtags when available.
- Include property type hashtags when available.
- Include sale/rent/investment hashtags when relevant.
- Return 8 to 14 hashtags.

Generation settings:
Mode: ${input.mode}
Platform: ${platform}
Language: ${language}
Tone: ${tone}
Extra instruction: ${input.extraInstruction || "None"}

Selected agent listing context:
${
  propertyContext
    ? JSON.stringify(propertyContext, null, 2)
    : "No selected agent listing."
}

Manual property context:
${JSON.stringify(manual, null, 2)}

Agent campaign context:
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

Field-specific requirements:
- instagramFacebookCaption: medium length, visual, emotional, and persuasive. Include price/location when available.
- tiktokReelsCaption: hook-driven, shorter, with CTA. If bilingual, include EN and ID.
- linkedinCaption: more professional, business-minded, investment/market positioning where relevant. If bilingual, include EN and ID.
- shortReelScript: 15–30 seconds, scene-based, practical. If bilingual, include EN and ID.
- adCopy.primaryText: must be sales-driven and include property value, area appeal, price if available, and invitation.
- adCopy.headline: short, punchy, conversion-oriented.
- adCopy.description: short CTA.
- whatsappBroadcast: short, direct, friendly, with price/location and CTA. If bilingual, include EN and ID.
- ctaOptions: practical CTA options.
- hashtags: return clean hashtags only.
- contentNotes: short explanation of how the agent can use the content.

Final reminder:
If Bilingual is selected, DO NOT only make one section bilingual. Every output field must have English and Indonesian.
Do not use Malay.
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
    const auth = await verifyAgent(req);

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

      propertyContext = await getAgentPropertyContext(
        auth.userId!,
        body.propertyId
      );
    }

    const prompt = buildPrompt(body, {
      propertyContext,
      agentProfile: auth.agentProfile,
    });

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      temperature: 0.72,
      max_output_tokens: 2600,
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
    console.error("Agent AI social generation error:", error);

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