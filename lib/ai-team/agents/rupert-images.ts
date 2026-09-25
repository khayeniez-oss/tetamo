import "server-only";

import OpenAI from "openai";

import {
  requireAgentPermission,
} from "@/lib/ai-team/permissions/agent-permissions";

const openai =
  new OpenAI({
    apiKey:
      process.env.OPENAI_API_KEY,
  });

type RupertImageKind =
  | "cover"
  | "body";

export type RupertGeneratedImage = {
  bytes: Buffer;
  contentType: "image/webp";
  extension: "webp";
  width: number;
  height: number;
  model: "gpt-image-2";
};

export async function generateRupertEditorialImage(
  input: {
    kind:
      RupertImageKind;

    prompt: string;

    articleTitle: string;
  }
): Promise<RupertGeneratedImage> {
  /*
   * Image creation is part of Rupert's
   * internal draft-content authority.
   * It does not publish anything.
   */
  requireAgentPermission(
    "rupert",
    "draft_content"
  );

  if (
    !process.env.OPENAI_API_KEY
  ) {
    throw new Error(
      "OPENAI_API_KEY is missing."
    );
  }

  const isCover =
    input.kind ===
    "cover";

  const size =
    isCover
      ? ("1792x1024" as const)
      : ("1536x1024" as const);

  const width =
    isCover
      ? 1792
      : 1536;

  const height =
    1024;

  const composition =
    isCover
      ? `
This is the COVER image.

Use a wide landscape editorial composition designed
to crop cleanly inside Tetamo's responsive cover area.
Keep the primary visual subject in the central safe area
because Tetamo displays covers using responsive object-cover
cropping on cards and article pages.

Do not place important details at the extreme edges.
`
      : `
This is a BODY editorial image.

Use a landscape 3:2 composition suitable for placement
inside a long-form property article.
`;

  const finalPrompt = `
Create a premium editorial visual for a Tetamo property
article.

ARTICLE
${input.articleTitle}

VISUAL BRIEF
${input.prompt}

${composition}

VISUAL RULES

- polished, realistic, modern property editorial aesthetic.
- Indonesian context only when relevant to the brief.
- natural architecture, lighting and materials.
- useful visual storytelling, not generic stock-photo energy.
- no visible written text.
- no logos.
- no watermark.
- no fake certificates.
- no fake government seals.
- no fabricated legal documents.
- no fake website/app screenshots.
- no misleading before/after claims.
- no unnecessary people posing for camera.
- avoid obvious AI artifacts.
`.trim();

  const result =
    await openai.images.generate({
      model:
        "gpt-image-2",

      prompt:
        finalPrompt,

      size,

      quality:
        "medium",

      output_format:
        "webp",

      output_compression:
        82,
    });

  const base64 =
    result.data?.[0]
      ?.b64_json;

  if (!base64) {
    throw new Error(
      "Rupert's image generator returned no image data."
    );
  }

  return {
    bytes:
      Buffer.from(
        base64,
        "base64"
      ),

    contentType:
      "image/webp",

    extension:
      "webp",

    width,
    height,

    model:
      "gpt-image-2",
  };
}
