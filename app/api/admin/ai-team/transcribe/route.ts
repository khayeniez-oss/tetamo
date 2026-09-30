import OpenAI from "openai";

import {
  requireTetamoAdmin,
} from "@/lib/ai-team/core/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export async function POST(req: Request) {
  const auth = await requireTetamoAdmin(req);

  if (!auth.authorized) {
    return auth.response;
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return Response.json(
      {
        ok: false,
        error:
          "OPENAI_API_KEY is not configured.",
      },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();

    const audio = formData.get("audio");

    if (!(audio instanceof File)) {
      return Response.json(
        {
          ok: false,
          error: "Audio file is required.",
        },
        { status: 400 }
      );
    }

    if (audio.size === 0) {
      return Response.json(
        {
          ok: false,
          error: "Audio recording is empty.",
        },
        { status: 400 }
      );
    }

    if (audio.size > MAX_AUDIO_BYTES) {
      return Response.json(
        {
          ok: false,
          error: "Audio recording is too large.",
        },
        { status: 413 }
      );
    }

    const openai = new OpenAI({
      apiKey,
    });

    const transcription =
      await openai.audio.transcriptions.create({
        file: audio,
        model: "gpt-4o-mini-transcribe",
      });

    const text =
      transcription.text?.trim() ?? "";

    if (!text) {
      return Response.json(
        {
          ok: false,
          error:
            "No speech was detected in the recording.",
        },
        { status: 422 }
      );
    }

    return Response.json({
      ok: true,
      text,
    });
  } catch (error) {
    console.error(
      "AI Team transcription failed:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to transcribe the recording.",
      },
      { status: 500 }
    );
  }
}
