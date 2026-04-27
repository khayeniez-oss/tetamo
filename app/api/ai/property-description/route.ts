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

    const {
      propertyType,
      location,
      price,
      bedrooms,
      bathrooms,
      landSize,
      buildingSize,
      furnishing,
      features,
      purpose,
      rentalType,
      ownershipTitle,
      nearbyPlaces,
    } = body;

    const prompt = `
You are Tetamo AI Partner.

Tetamo is a property marketplace in Indonesia for property owners, agents, developers, buyers, and renters.

Your job is to create professional property listing content based only on the information provided.

Important rules:
- Do not invent missing property facts.
- Do not invent prices, permits, ownership title, availability, or legal claims.
- Keep titles under 150 characters.
- Keep descriptions under 2000 characters.
- Write natural English and natural Bahasa Indonesia.
- Make the content professional, clear, trustworthy, and suitable for a property marketplace in Indonesia.
- Return ONLY valid JSON.
- Do not wrap the JSON in markdown.
- Do not use \`\`\`json.
- Do not add explanation before or after the JSON.

Property details:
Property type: ${propertyType || "Not provided"}
Location: ${location || "Not provided"}
Price: ${price || "Not provided"}
Bedrooms: ${bedrooms || "Not provided"}
Bathrooms: ${bathrooms || "Not provided"}
Land size: ${landSize || "Not provided"}
Building size: ${buildingSize || "Not provided"}
Furnishing: ${furnishing || "Not provided"}
Features: ${features || "Not provided"}
Purpose: ${purpose || "Not provided"}
Rental type: ${rentalType || "Not provided"}
Ownership title: ${ownershipTitle || "Not provided"}
Nearby places: ${nearbyPlaces || "Not provided"}

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

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const rawText = response.output_text || "";
    const cleanedText = cleanJsonText(rawText);

    let result;

    try {
      result = JSON.parse(cleanedText);
    } catch {
      return NextResponse.json(
        {
          error: "AI response was not valid JSON.",
          raw: rawText,
          cleaned: cleanedText,
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