import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing." },
        { status: 500 }
      );
    }

    const body = await req.json();

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

Tetamo is a property marketplace in Indonesia for owners, agents, developers, buyers, and renters.

Create professional property listing content based only on the information provided.

Important rules:
- Do not invent missing property facts.
- Do not invent prices, permits, ownership title, availability, or legal claims.
- Keep titles under 150 characters.
- Keep descriptions under 2000 characters.
- Write natural English and natural Bahasa Indonesia.
- Make it professional, clear, trustworthy, and suitable for a property marketplace in Indonesia.

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

Return ONLY valid JSON with this exact structure:

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

    const text = response.output_text;

    let result;

    try {
      result = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          error: "AI response was not valid JSON.",
          raw: text,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("AI property description error:", error);

    return NextResponse.json(
      {
        error: "Failed to generate property description.",
      },
      { status: 500 }
    );
  }
}