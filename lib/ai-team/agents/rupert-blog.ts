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

const RUPERT_BLOG_MODEL =
  "gpt-4.1-mini";

export type RupertBlogSource = {
  url: string;
  title: string;
  domain: string;
};

export type RupertBlogResearch = {
  reportId: string;
  topic: string;
  summary: string;
  findings: unknown[];
  recommendations: unknown[];
  warnings: string[];
  sources: RupertBlogSource[];
};

export type RupertBlogCategory = {
  name: string;
  slug: string;
};

export type RupertBodyImagePlan = {
  marker: string;
  prompt: string;
  alt: string;
  altId: string;
};

export type RupertCoverImagePlan = {
  prompt: string;
  alt: string;
  altId: string;
};

export type RupertBlogDraft = {
  title: string;
  titleId: string;

  excerpt: string;
  excerptId: string;

  contentHtml: string;
  contentIdHtml: string;

  category: string;

  accessType:
    | "public"
    | "paid_agent";

  proposedPublishAt: string;

  coverImage:
    RupertCoverImagePlan;

  bodyImages:
    RupertBodyImagePlan[];
};

type DraftOptions = {
  categories:
    RupertBlogCategory[];

  nowIso: string;

  timeZone: string;
};

function cleanString(
  value: unknown
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function asRecord(
  value: unknown
): Record<string, unknown> {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value as Record<
        string,
        unknown
      >
    : {};
}

function parseJsonObject(
  value: string
): Record<string, unknown> | null {
  const trimmed =
    value.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const parsed =
      JSON.parse(trimmed);

    if (
      parsed &&
      typeof parsed ===
        "object" &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<
        string,
        unknown
      >;
    }
  } catch {
    // Continue.
  }

  const fenced =
    trimmed.match(
      /```(?:json)?\s*([\s\S]*?)```/i
    );

  if (fenced?.[1]) {
    try {
      const parsed =
        JSON.parse(
          fenced[1].trim()
        );

      if (
        parsed &&
        typeof parsed ===
          "object" &&
        !Array.isArray(parsed)
      ) {
        return parsed as Record<
          string,
          unknown
        >;
      }
    } catch {
      // Continue.
    }
  }

  const firstBrace =
    trimmed.indexOf("{");

  const lastBrace =
    trimmed.lastIndexOf("}");

  if (
    firstBrace === -1 ||
    lastBrace <= firstBrace
  ) {
    return null;
  }

  try {
    const parsed =
      JSON.parse(
        trimmed.slice(
          firstBrace,
          lastBrace + 1
        )
      );

    if (
      parsed &&
      typeof parsed ===
        "object" &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<
        string,
        unknown
      >;
    }
  } catch {
    return null;
  }

  return null;
}

function sanitizeGeneratedHtml(
  value: string
) {
  return value
    .replace(
      /<script\b[^>]*>[\s\S]*?<\/script>/gi,
      ""
    )
    .replace(
      /<style\b[^>]*>[\s\S]*?<\/style>/gi,
      ""
    )
    .replace(
      /\son\w+\s*=\s*(["']).*?\1/gi,
      ""
    )
    .replace(
      /javascript:/gi,
      ""
    )
    .trim();
}

function stripHtml(
  value: string
) {
  return value
    .replace(
      /<!--[\s\S]*?-->/g,
      " "
    )
    .replace(
      /<[^>]*>/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function countMarker(
  html: string,
  marker: string
) {
  return html
    .split(
      `<!--${marker}-->`
    )
    .length - 1;
}

export async function draftBlogWithRupert(
  research:
    RupertBlogResearch,

  options:
    DraftOptions
): Promise<RupertBlogDraft> {
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

  if (
    !research.reportId ||
    !research.topic.trim()
  ) {
    throw new Error(
      "A valid Rupert research report is required."
    );
  }

  const categoriesText =
    options.categories.length
      ? options.categories
          .map(
            (category) =>
              `${category.name} [${category.slug}]`
          )
          .join(", ")
      : "No active categories are currently configured.";

  const response =
    await openai.responses.create({
      model:
        RUPERT_BLOG_MODEL,

      input: `
You are Rupert, Tetamo's AI Content & SEO Manager.

Create a COMPLETE bilingual Tetamo blog production draft
using ONLY the research package supplied below.

This is editorial drafting and production planning.
Do NOT perform new factual research in this step.

TETAMO

Tetamo is an Indonesian property marketplace.

CURRENT TIME
${options.nowIso}

EDITORIAL TIME ZONE
${options.timeZone}

AVAILABLE EXISTING BLOG CATEGORIES
${categoriesText}

FACTUAL DISCIPLINE

- Every factual statement must remain supported by the
  supplied research package.
- Never invent laws, regulations, statistics, prices,
  market data, search volume, rankings or performance.
- Never describe ordinary commercial/blog sources as
  authoritative or official.
- Preserve meaningful uncertainty from the research.
- Recommendations must remain recommendations.
- Tetamo is not a regulator, law firm, tax adviser,
  immigration authority or government authority.
- Do not imply legal certainty unsupported by the research.

EDITORIAL STANDARD

- Useful before promotional.
- Human, practical and commercially relevant.
- No generic AI-style opening.
- No keyword stuffing.
- No fake urgency.
- English and Bahasa Indonesia must both sound natural.
- Bahasa Indonesia must be localized naturally, not
  translated mechanically.
- Keep facts aligned between both versions.
- Prefer roughly 700-1100 useful words per language if
  evidence supports that length.
- Write shorter content rather than padding weak evidence.

SEO STANDARD

- Strong human-readable title.
- Natural topic phrases in headings and body.
- Useful H2/H3 structure.
- Do not promise rankings.
- Do not invent keyword/search-volume claims.

CATEGORY

- You MUST choose one of the supplied existing category
  names when categories are available.
- Never invent a category.
- Return the exact category NAME, not the slug.
- If there are no active categories, return an empty string.

ACCESS TYPE

Choose exactly:
- "public" for normal public educational/search content.
- "paid_agent" only if the article is explicitly intended
  as private paid-agent material.

Default to "public" unless the research clearly calls for
paid-agent-only content.

WRITER

The writer will be Rupert. Do not add another byline inside
the article body.

PROPOSED PUBLISH DATE

- Propose a sensible FUTURE publication date/time.
- Return a valid ISO-8601 date/time including +08:00.
- This is a proposal only. It must NOT imply publication
  approval.
- Do not choose a past time.

IMAGE PLAN

The draft must include:
- exactly 1 cover image plan.
- between 1 and 3 body image plans.

Images must be useful editorial visuals, not decoration.

For every image:
- photorealistic / premium editorial property style where
  appropriate.
- no visible text.
- no logos.
- no watermark.
- no fake government seals.
- no fabricated legal documents.
- no UI screenshots pretending to be real products.
- no identifiable real property claims unless the research
  explicitly supports them.

Cover composition:
- designed for a wide responsive crop.
- important subject in the CENTER safe area.
- leave visual breathing room.
- no critical object at extreme edges.

Body images:
- each image must support the nearby section.
- choose placement based on article meaning.
- do not put an image after every heading.

BODY IMAGE MARKERS

For each body image, use markers in this exact sequence:

<!--RUPERT_BODY_IMAGE_1-->
<!--RUPERT_BODY_IMAGE_2-->
<!--RUPERT_BODY_IMAGE_3-->

Use ONLY as many markers as body images you request.

Each requested marker MUST occur exactly once in English
HTML and exactly once in Indonesian HTML, at the equivalent
semantic location in each language.

Do not generate <img> tags yourself. The production system
will replace markers with the final uploaded images.

HTML STANDARD

Allowed content:
<p>
<h2>
<h3>
<ul>
<ol>
<li>
<strong>
<em>
<a href="https://...">
plus the Rupert image-marker comments defined above.

Do NOT output:
<script>
<style>
iframe
forms
embedded code
markdown fences

SOURCE USE

Where useful, naturally link a factual statement to a
relevant supplied source.

Do not create a giant bibliography just because Rupert
consulted many sources.

RESEARCH PACKAGE

${JSON.stringify(
  research,
  null,
  2
)}

OUTPUT

Return ONLY valid JSON using exactly this structure:

{
  "title": "English title",
  "title_id": "Natural Indonesian title",
  "excerpt": "English excerpt",
  "excerpt_id": "Natural Indonesian excerpt",
  "category": "Exact existing category name",
  "access_type": "public",
  "proposed_publish_at": "2026-09-26T10:00:00+08:00",
  "content_html": "<p>...</p><!--RUPERT_BODY_IMAGE_1--><p>...</p>",
  "content_id_html": "<p>...</p><!--RUPERT_BODY_IMAGE_1--><p>...</p>",
  "cover_image": {
    "prompt": "Detailed visual generation prompt",
    "alt": "Natural English alt text",
    "alt_id": "Natural Indonesian alt text"
  },
  "body_images": [
    {
      "marker": "RUPERT_BODY_IMAGE_1",
      "prompt": "Detailed section-specific visual generation prompt",
      "alt": "Natural English alt text",
      "alt_id": "Natural Indonesian alt text"
    }
  ]
}
`.trim(),

      temperature: 0.25,
      max_output_tokens: 8000,
    });

  const parsed =
    parseJsonObject(
      response.output_text
    );

  if (!parsed) {
    throw new Error(
      "Rupert did not return a valid blog production draft."
    );
  }

  const title =
    cleanString(
      parsed.title
    );

  const titleId =
    cleanString(
      parsed.title_id
    );

  const excerpt =
    cleanString(
      parsed.excerpt
    );

  const excerptId =
    cleanString(
      parsed.excerpt_id
    );

  const contentHtml =
    sanitizeGeneratedHtml(
      cleanString(
        parsed.content_html
      )
    );

  const contentIdHtml =
    sanitizeGeneratedHtml(
      cleanString(
        parsed.content_id_html
      )
    );

  if (
    !title ||
    !titleId ||
    !stripHtml(contentHtml) ||
    !stripHtml(contentIdHtml)
  ) {
    throw new Error(
      "Rupert's blog draft is missing required bilingual content."
    );
  }

  const requestedCategory =
    cleanString(
      parsed.category
    );

  let category = "";

  if (
    options.categories.length
  ) {
    const matched =
      options.categories.find(
        (candidate) =>
          candidate.name
            .toLowerCase() ===
            requestedCategory
              .toLowerCase() ||
          candidate.slug
            .toLowerCase() ===
            requestedCategory
              .toLowerCase()
      );

    if (!matched) {
      throw new Error(
        `Rupert did not choose a valid existing blog category. Returned: ${requestedCategory || "(empty)"}`
      );
    }

    category =
      matched.name;
  }

  const accessValue =
    cleanString(
      parsed.access_type
    );

  const accessType:
    | "public"
    | "paid_agent" =
      accessValue ===
      "paid_agent"
        ? "paid_agent"
        : "public";

  const proposedPublishAt =
    cleanString(
      parsed.proposed_publish_at
    );

  const coverRaw =
    asRecord(
      parsed.cover_image
    );

  const coverImage = {
    prompt:
      cleanString(
        coverRaw.prompt
      ),

    alt:
      cleanString(
        coverRaw.alt
      ),

    altId:
      cleanString(
        coverRaw.alt_id
      ),
  };

  if (
    !coverImage.prompt ||
    !coverImage.alt ||
    !coverImage.altId
  ) {
    throw new Error(
      "Rupert did not provide a complete cover image plan."
    );
  }

  if (
    !Array.isArray(
      parsed.body_images
    )
  ) {
    throw new Error(
      "Rupert did not provide body image plans."
    );
  }

  const bodyImages =
    parsed.body_images
      .slice(0, 3)
      .map(
        (
          item,
          index
        ) => {
          const row =
            asRecord(item);

          return {
            marker:
              cleanString(
                row.marker
              ) ||
              `RUPERT_BODY_IMAGE_${index + 1}`,

            prompt:
              cleanString(
                row.prompt
              ),

            alt:
              cleanString(
                row.alt
              ),

            altId:
              cleanString(
                row.alt_id
              ),
          };
        }
      );

  if (
    bodyImages.length < 1
  ) {
    throw new Error(
      "Rupert must plan at least one useful body image."
    );
  }

  for (
    let index = 0;
    index <
    bodyImages.length;
    index += 1
  ) {
    const image =
      bodyImages[index];

    const expectedMarker =
      `RUPERT_BODY_IMAGE_${index + 1}`;

    if (
      image.marker !==
      expectedMarker
    ) {
      throw new Error(
        `Rupert returned an invalid body image marker: ${image.marker}`
      );
    }

    if (
      !image.prompt ||
      !image.alt ||
      !image.altId
    ) {
      throw new Error(
        `Rupert body image ${index + 1} is incomplete.`
      );
    }

    if (
      countMarker(
        contentHtml,
        image.marker
      ) !== 1 ||
      countMarker(
        contentIdHtml,
        image.marker
      ) !== 1
    ) {
      throw new Error(
        `Rupert did not place ${image.marker} exactly once in both language versions.`
      );
    }
  }

  return {
    title,
    titleId,
    excerpt,
    excerptId,
    contentHtml,
    contentIdHtml,
    category,
    accessType,
    proposedPublishAt,
    coverImage,
    bodyImages,
  };
}
