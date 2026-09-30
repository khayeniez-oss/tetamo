import OpenAI from "openai";

import {
  requireTetamoAdmin,
} from "@/lib/ai-team/core/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VoiceRequest = {
  agentKey?: string;
  text?: string;
};

const OPENAI_VOICE_BY_AGENT = {
  jake: "ballad",
  rupert: "onyx",
  randolph: "fable",
  lola: "marin",
  uncle_sam: "ash",
} as const;

type OpenAIAgentKey =
  keyof typeof OPENAI_VOICE_BY_AGENT;

function isOpenAIAgentKey(
  value: string
): value is OpenAIAgentKey {
  return value in OPENAI_VOICE_BY_AGENT;
}

export async function POST(req: Request) {
  const auth = await requireTetamoAdmin(req);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body =
      (await req.json()) as VoiceRequest;

    const agentKey =
      body.agentKey?.trim().toLowerCase();

    const text = body.text?.trim();

    if (!agentKey || !text) {
      return Response.json(
        {
          ok: false,
          error:
            "agentKey and text are required.",
        },
        { status: 400 }
      );
    }

    if (text.length > 5000) {
      return Response.json(
        {
          ok: false,
          error: "Voice text is too long.",
        },
        { status: 400 }
      );
    }

    /*
     * Mona keeps her approved ElevenLabs
     * cloned voice.
     */
    if (agentKey === "mona") {
      const apiKey =
        process.env.ELEVENLABS_API_KEY;

      const voiceId =
        process.env.ELEVENLABS_MONA_VOICE_ID;

      if (!apiKey || !voiceId) {
        console.error(
          "Mona ElevenLabs voice configuration is missing."
        );

        return Response.json(
          {
            ok: false,
            error:
              "Mona voice service is not configured.",
          },
          { status: 500 }
        );
      }

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
          voiceId
        )}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type":
              "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text,
            model_id:
              "eleven_multilingual_v2",
          }),
        }
      );

      if (!response.ok) {
        const errorText =
          await response.text();

        console.error(
          "Mona ElevenLabs TTS failed:",
          response.status,
          errorText
        );

        return Response.json(
          {
            ok: false,
            error:
              "Unable to generate Mona voice.",
          },
          { status: 502 }
        );
      }

      const audio =
        await response.arrayBuffer();

      return new Response(audio, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "no-store",
        },
      });
    }

    /*
     * Internal AI Team voices use OpenAI TTS.
     */
    if (isOpenAIAgentKey(agentKey)) {
      const apiKey =
        process.env.OPENAI_API_KEY;

      if (!apiKey) {
        console.error(
          "OpenAI voice configuration is missing."
        );

        return Response.json(
          {
            ok: false,
            error:
              "OpenAI voice service is not configured.",
          },
          { status: 500 }
        );
      }

      const openai = new OpenAI({
        apiKey,
      });

      const speech =
        await openai.audio.speech.create({
          model: "gpt-4o-mini-tts",
          voice:
            OPENAI_VOICE_BY_AGENT[
              agentKey
            ],
          input: text,
          instructions:
            "Speak naturally and conversationally. Professional, warm and human. Do not sound like a narrator or announcer.",
          response_format: "mp3",
        });

      const audio =
        await speech.arrayBuffer();

      return new Response(audio, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "no-store",
        },
      });
    }

    return Response.json(
      {
        ok: false,
        error: `Voice is not configured for ${agentKey}.`,
      },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      "AI Team voice generation failed:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to generate voice.",
      },
      { status: 500 }
    );
  }
}
