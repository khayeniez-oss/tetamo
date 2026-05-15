import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const googleMapsServerApiKey =
  process.env.GOOGLE_MAPS_SERVER_API_KEY ||
  process.env.GOOGLE_PLACES_API_KEY ||
  "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: corsHeaders,
  });
}

function cleanText(value: string | null) {
  return String(value || "").trim();
}

function getGoogleErrorMessage(data: any) {
  return (
    data?.error_message ||
    data?.status ||
    "Google Places request failed."
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(req: Request) {
  try {
    if (!googleMapsServerApiKey) {
      return json(
        {
          ok: false,
          error:
            "GOOGLE_MAPS_SERVER_API_KEY is missing on the Tetamo server.",
        },
        500
      );
    }

    const url = new URL(req.url);
    const type = cleanText(url.searchParams.get("type"));
    const sessionToken = cleanText(url.searchParams.get("sessiontoken"));
    const language = cleanText(url.searchParams.get("language")) || "id";

    if (type === "autocomplete") {
      const input = cleanText(url.searchParams.get("input"));

      if (input.length < 3) {
        return json({
          ok: true,
          status: "ZERO_RESULTS",
          predictions: [],
        });
      }

      const googleUrl =
        "https://maps.googleapis.com/maps/api/place/autocomplete/json" +
        `?input=${encodeURIComponent(input)}` +
        `&key=${encodeURIComponent(googleMapsServerApiKey)}` +
        "&components=country:id" +
        `&language=${encodeURIComponent(language)}` +
        (sessionToken
          ? `&sessiontoken=${encodeURIComponent(sessionToken)}`
          : "");

      const response = await fetch(googleUrl, {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (data?.status === "OK" || data?.status === "ZERO_RESULTS") {
        return json({
          ok: true,
          status: data.status,
          predictions: data.predictions || [],
        });
      }

      return json(
        {
          ok: false,
          status: data?.status || "FAILED",
          error: getGoogleErrorMessage(data),
          predictions: [],
        },
        400
      );
    }

    if (type === "details") {
      const placeId = cleanText(url.searchParams.get("place_id"));

      if (!placeId) {
        return json(
          {
            ok: false,
            error: "place_id is required.",
          },
          400
        );
      }

      const googleUrl =
        "https://maps.googleapis.com/maps/api/place/details/json" +
        `?place_id=${encodeURIComponent(placeId)}` +
        `&key=${encodeURIComponent(googleMapsServerApiKey)}` +
        "&fields=formatted_address,address_component,geometry" +
        `&language=${encodeURIComponent(language)}` +
        (sessionToken
          ? `&sessiontoken=${encodeURIComponent(sessionToken)}`
          : "");

      const response = await fetch(googleUrl, {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (data?.status === "OK") {
        return json({
          ok: true,
          status: data.status,
          result: data.result || null,
        });
      }

      return json(
        {
          ok: false,
          status: data?.status || "FAILED",
          error: getGoogleErrorMessage(data),
          result: null,
        },
        400
      );
    }

    return json(
      {
        ok: false,
        error: "Invalid Google Places request type.",
      },
      400
    );
  } catch (error) {
    return json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Google Places proxy failed.",
      },
      500
    );
  }
}