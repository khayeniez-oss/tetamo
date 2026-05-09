import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

type PropertyDescriptionRequest = {
  source?: "owner" | "agent" | "admin";
  propertyType?: string;
  location?: string;
  price?: string;
  bedrooms?: string;
  bathrooms?: string;
  landSize?: string;
  buildingSize?: string;
  furnishing?: string;
  features?: string;
  purpose?: string;
  rentalType?: string;
  ownershipTitle?: string;
  nearbyPlaces?: string;
};

type ErrorWithDetails = {
  message?: string;
  code?: string;
  status?: number;
  type?: string;
};

type AiPropertyContent = {
  englishTitle: string;
  indonesianTitle: string;
  englishDescription: string;
  indonesianDescription: string;
  seoTitle: string;
  seoMetaDescription: string;
  socialCaption: string;
  whatsappInquiryMessage: string;
};

const MAX_TITLE = 150;
const MAX_DESCRIPTION = 2000;
const MAX_SEO_META = 160;
const MAX_SOCIAL_CAPTION = 1000;

function cleanJsonText(value: string) {
  const cleaned = value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1).trim();
  }

  return cleaned;
}

function getBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization") || "";

  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authHeader.slice(7).trim();
}

function cleanValue(value?: string) {
  return String(value || "").trim();
}

function limitText(value: unknown, limit: number) {
  return String(value || "").trim().slice(0, limit);
}

function buildFactLine(label: string, value?: string) {
  const clean = cleanValue(value);
  if (!clean) return "";
  return `- ${label}: ${clean}`;
}

function buildPropertyFacts(body: PropertyDescriptionRequest) {
  const facts = [
    buildFactLine("Property type", body.propertyType),
    buildFactLine("Location / address", body.location),
    buildFactLine("Price", body.price),
    buildFactLine("Bedrooms", body.bedrooms),
    buildFactLine("Bathrooms", body.bathrooms),
    buildFactLine("Land size", body.landSize),
    buildFactLine("Building size", body.buildingSize),
    buildFactLine("Furnishing", body.furnishing),
    buildFactLine("Features / facilities", body.features),
    buildFactLine("Purpose", body.purpose),
    buildFactLine("Rental type", body.rentalType),
    buildFactLine("Ownership title / certificate", body.ownershipTitle),
    buildFactLine("Nearby places / hotspots / travel time", body.nearbyPlaces),
  ].filter(Boolean);

  return facts.length
    ? facts.join("\n")
    : "- No property details were provided.";
}

function normalizeSource(source?: string): "owner" | "agent" | "admin" {
  if (source === "agent" || source === "admin" || source === "owner") {
    return source;
  }

  return "owner";
}

function canGenerateSocialCaption(source: "owner" | "agent" | "admin") {
  return source === "agent" || source === "admin";
}

function normalizeAiResult(
  raw: any,
  source: "owner" | "agent" | "admin"
): AiPropertyContent {
  return {
    englishTitle: limitText(raw?.englishTitle, MAX_TITLE),
    indonesianTitle: limitText(raw?.indonesianTitle, MAX_TITLE),
    englishDescription: limitText(raw?.englishDescription, MAX_DESCRIPTION),
    indonesianDescription: limitText(
      raw?.indonesianDescription,
      MAX_DESCRIPTION
    ),
    seoTitle: limitText(raw?.seoTitle, MAX_TITLE),
    seoMetaDescription: limitText(raw?.seoMetaDescription, MAX_SEO_META),

    // Social caption is a selling point for agents/admin only.
    socialCaption: canGenerateSocialCaption(source)
      ? limitText(raw?.socialCaption, MAX_SOCIAL_CAPTION)
      : "",

    // Keep this field for frontend compatibility only.
    // Do not use this route for Tetamo WhatsApp AI auto-reply.
    whatsappInquiryMessage: "",
  };
}

function hasEnoughPropertyFacts(body: PropertyDescriptionRequest) {
  return Boolean(
    cleanValue(body.propertyType) ||
      cleanValue(body.location) ||
      cleanValue(body.price) ||
      cleanValue(body.bedrooms) ||
      cleanValue(body.bathrooms) ||
      cleanValue(body.landSize) ||
      cleanValue(body.buildingSize) ||
      cleanValue(body.furnishing) ||
      cleanValue(body.features) ||
      cleanValue(body.purpose) ||
      cleanValue(body.rentalType) ||
      cleanValue(body.ownershipTitle) ||
      cleanValue(body.nearbyPlaces)
  );
}

function buildSocialCaptionInstruction(source: "owner" | "agent" | "admin") {
  if (!canGenerateSocialCaption(source)) {
    return `
Social caption rules:
- Return socialCaption as an empty string.
- Owners should only receive title and description from this route.
`;
  }

  return `
Social caption rules for agent/admin:
- Create a ready-to-copy Instagram/Facebook caption for an agent/admin to promote the listing.
- Target length: 500–700 characters.
- Maximum length: 1,000 characters.
- Do not make it too short.
- Start with a strong hook.
- Mention the property type, location, purpose, and strongest provided features.
- Add lifestyle or area appeal only if supported by the provided location/nearby facts.
- End with a clear call to action.
- Include 6–10 relevant hashtags at the end.
- The caption should feel valuable enough for an agent to copy and post directly.
- The caption may be in English, Indonesian, or light bilingual style depending on the property facts and tone.
- Do not invent facilities, distance, exact travel time, legal claims, ROI, urgency, or availability.
- Do not use fake hype such as "limited offer", "guaranteed ROI", "best investment", or "exclusive" unless supported by the facts.
`;
}

function buildPrompt(params: {
  propertyFacts: string;
  source: "owner" | "agent" | "admin";
}) {
  const socialCaptionInstruction = buildSocialCaptionInstruction(params.source);

  return `
You are Tetamo AI Partner, a senior real estate marketing copywriter for Tetamo.

Tetamo is a property marketplace in Indonesia for property owners, agents, developers, buyers, renters, and investors.

Your job:
Create accurate, professional, persuasive property listing content based only on the information provided.

Important context:
- The main output is for Tetamo's property listing form.
- English and Indonesian titles/descriptions will be shown on the marketplace.
- Social caption is a value-add for Tetamo agents/admin only.
- WhatsApp AI support is handled separately through Tetamo's official WhatsApp/Twilio flow, so do not create a WhatsApp inquiry message here.

Main writing goal:
- Make the listing feel ready to publish on a real estate marketplace.
- Write like a professional real estate marketer.
- Keep the tone professional, warm, confident, and trustworthy.
- Use natural English and natural Bahasa Indonesia.
- Indonesian must not sound like direct Google Translate.
- Sell the property, but stay honest and factual.

Very important truth rules:
- Use only the property facts provided.
- Do not invent missing property facts.
- Do not invent price, permit, ownership title, availability, facilities, nearby places, road access, travel time, distance, or legal claims.
- Do not invent exact minutes such as "5 minutes to the beach" unless timing or distance was provided.
- If nearby places are provided without minutes, mention the nearby places without adding fake travel time.
- If location is provided but nearby places are not provided, talk about the location carefully without naming unprovided hotspots.
- If ownership title/certificate is provided, mention it only as provided.
- Do not claim the certificate guarantees legal safety.
- Do not say "luxury", "premium", "exclusive", "beachfront", "ocean view", "high ROI", "guaranteed investment", "walking distance", or "close to cafes/shops" unless supported by the provided facts.
- Never mention missing information directly.
- Do not write phrases like "bedrooms are not provided", "size is not provided", "specific details are not provided", or "information is limited".
- If a detail is missing, simply omit it.

Description structure:
For both English and Indonesian descriptions, follow this order:

1. Start with the location.
   - Open with where the property is located.
   - Make the area sound attractive only based on the location provided.
   - If address/area/city/province is provided, use it naturally.

2. Explain the property details.
   - Include property type, sale/rent/auction purpose, price, rental type, furnishing, land size, building size, bedrooms, bathrooms, certificate, and facilities only if provided.

3. Explain nearby area, hotspots, lifestyle, or access.
   - Use nearby places only if provided.
   - Mention timing/distance only if provided.
   - If no nearby details are provided, skip this section naturally.

4. Explain why the property is attractive.
   - Highlight comfort, layout, practical value, location, facilities, visibility, or suitability based on provided facts.
   - Do not overpromise.

5. End with a professional call to action.
   - Encourage the buyer/renter/investor to inquire or schedule a viewing through Tetamo.

English description rules:
- Write 2–4 strong paragraphs.
- Avoid boring openings like "This property is available".
- Keep it polished, natural, and sales-ready.
- Keep under 2000 characters.

Indonesian description rules:
- Use natural Indonesian property marketing language.
- Do not translate word-for-word from English.
- Keep it persuasive, clear, and professional.
- Follow the same meaning as the English version.
- Keep under 2000 characters.

Title rules:
- Create attractive titles that are still accurate.
- Include property type, location, and strongest provided feature when possible.
- Keep each title under 150 characters.
- Do not use all caps.
- Do not overstuff keywords.
- Do not use fake urgency like "limited offer" unless provided.

SEO rules:
- SEO title must be clear and search-friendly.
- SEO meta description should be under 160 characters.
- Use property type, location, purpose, and strongest provided feature where possible.
- Do not stuff keywords.

${socialCaptionInstruction}

WhatsApp message rule:
- Return whatsappInquiryMessage as an empty string.
- Do not create a buyer/renter WhatsApp inquiry message in this route.
- Tetamo's 24/7 WhatsApp AI support will be handled separately through Twilio.

Property facts provided:
${params.propertyFacts}

Return ONLY valid JSON.
Do not wrap the JSON in markdown.
Do not use \`\`\`json.
Do not add explanation before or after the JSON.

Return this exact JSON structure:

{
  "englishTitle": "",
  "indonesianTitle": "",
  "englishDescription": "",
  "indonesianDescription": "",
  "seoTitle": "",
  "seoMetaDescription": "",
  "socialCaption": "",
  "whatsappInquiryMessage": ""
}
`;
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing." },
        { status: 500 }
      );
    }

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        { error: "Supabase server environment variables are missing." },
        { status: 500 }
      );
    }

    const token = getBearerToken(req);

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized. Login is required." },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Invalid session." },
        { status: 401 }
      );
    }

    const body = (await req.json()) as PropertyDescriptionRequest;
    const source = normalizeSource(body.source);

    if (!hasEnoughPropertyFacts(body)) {
      return NextResponse.json(
        {
          error:
            "Please complete the property details before generating AI content.",
        },
        { status: 400 }
      );
    }

    const propertyFacts = buildPropertyFacts(body);
    const prompt = buildPrompt({ propertyFacts, source });

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      temperature: 0.6,
      max_output_tokens: 2400,
    });

    const rawText = response.output_text || "";
    const cleanedText = cleanJsonText(rawText);

    let parsedResult: unknown;

    try {
      parsedResult = JSON.parse(cleanedText);
    } catch {
      console.error("AI response was not valid JSON:", {
        rawText,
        cleanedText,
      });

      return NextResponse.json(
        {
          error: "AI response was not valid JSON. Please try again.",
        },
        { status: 500 }
      );
    }

    const result = normalizeAiResult(parsedResult, source);

    if (
      !result.englishTitle ||
      !result.indonesianTitle ||
      !result.englishDescription ||
      !result.indonesianDescription
    ) {
      return NextResponse.json(
        {
          error:
            "AI did not return complete listing content. Please try again.",
        },
        { status: 500 }
      );
    }

    if (canGenerateSocialCaption(source) && !result.socialCaption) {
      return NextResponse.json(
        {
          error:
            "AI did not return a social media caption. Please try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      data: result,
    });
  } catch (error: unknown) {
    const err = error as ErrorWithDetails;

    console.error("AI property description error:", error);

    return NextResponse.json(
      {
        error: "Failed to generate property description.",
        detail: err?.message || String(error),
        code: err?.code || null,
        status: err?.status || null,
        type: err?.type || null,
      },
      { status: err?.status || 500 }
    );
  }
}