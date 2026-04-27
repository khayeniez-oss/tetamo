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
You are Tetamo AI Partner, a senior real estate marketing copywriter for Tetamo.

Tetamo is a property marketplace in Indonesia for property owners, agents, developers, buyers, and renters.

Your job is to create premium, professional, persuasive property listing content based only on the information provided.

Main writing goal:
- Do not only describe the property.
- Sell the property through strong, polished, trustworthy real estate copy.
- Tell a short story about the unit, lifestyle, location, and why the property is practical or desirable.
- Make the property sound attractive without exaggerating or inventing facts.
- Write like a professional property agent or real estate marketer, not like a simple form summary.

Writing style:
- Professional, polished, confident, warm, and sales-focused.
- Natural English and natural Bahasa Indonesia.
- Not childish.
- Not robotic.
- Not rushed.
- Avoid boring phrases like "This property is available" as the main opening.
- Avoid repeating the same sentence structure.
- Use smooth paragraph flow.
- Make the description feel ready to publish on a real estate marketplace.

Very important rules:
- Do not invent missing property facts.
- Do not invent prices, permits, ownership title, availability, facilities, nearby places, or legal claims.
- If ownership title is provided, mention it only as provided. Do not say it guarantees legal/security benefits.
- Do not say "luxury", "premium", "exclusive", "beachfront", "near the beach", "high ROI", "investment opportunity", or "close to cafes/shops" unless supported by the provided details.
- If bedrooms, bathrooms, land size, building size, furnishing, features, or nearby places are missing, do not pretend they exist.
- If information is limited, still write professionally, but do not over-explain fake details.
- Keep titles under 150 characters.
- Keep each description under 2000 characters.
- Return ONLY valid JSON.
- Do not wrap the JSON in markdown.
- Do not use \`\`\`json.
- Do not add explanation before or after the JSON.

Description structure:
When enough details are provided, write 2–4 strong paragraphs for each description.

For English description:
1. Start with a polished opening that presents the property and location attractively.
2. Explain the unit clearly: property type, purpose, rental/sale type, furnishing, size, bedrooms, bathrooms, and features if provided.
3. Explain the lifestyle or practical value of the location based only on provided location/nearby details.
4. Mention the best renter/buyer profile when appropriate.
5. End with a professional closing sentence that encourages inquiry.

For Indonesian description:
1. Use natural Indonesian, not direct Google-translate style.
2. Keep it professional and clear for Indonesian property seekers.
3. Make it persuasive but not excessive.
4. Follow the same meaning as the English version.

Title style:
- Create attractive titles that are still accurate.
- Include property type, purpose, location, and strongest feature if provided.
- Do not overstuff the title.
- Do not use all caps.

SEO:
- SEO title must be clear and search-friendly.
- SEO meta description must be under 160 characters if possible.
- Social caption should be short, attractive, and suitable for Tetamo social media.
- WhatsApp inquiry message should sound natural from an interested buyer/renter.

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
      temperature: 0.75,
      max_output_tokens: 1800,
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