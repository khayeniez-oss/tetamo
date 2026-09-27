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
  bindingConstraints?: string[];
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

function normalizeSafetyText(
  value: string
) {
  return stripHtml(
    value
  )
    .toLowerCase()
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function validateDraftAgainstResearchConstraints(
  research:
    RupertBlogResearch,

  draft: {
    title: string;
    titleId: string;
    excerpt: string;
    excerptId: string;
    contentHtml: string;
    contentIdHtml: string;
    coverImage:
      RupertCoverImagePlan;
    bodyImages:
      RupertBodyImagePlan[];
  }
) {
  const warningText =
    research.warnings
      .map(cleanString)
      .join("\n")
      .toLowerCase();

  const constraintText =
    (
      research
        .bindingConstraints ??
      []
    )
      .map(cleanString)
      .join("\n")
      .toLowerCase();

  const draftText =
    normalizeSafetyText(
      [
        draft.title,
        draft.titleId,
        draft.excerpt,
        draft.excerptId,
        draft.contentHtml,
        draft.contentIdHtml,
        draft.coverImage.prompt,
        draft.coverImage.alt,
        draft.coverImage.altId,
        ...draft.bodyImages.flatMap(
          (image) => [
            image.prompt,
            image.alt,
            image.altId,
          ]
        ),
      ].join("\n")
    );

  const violations:
    string[] = [];

  const hasExcludedSensitiveTransactionClaims =
    (
      warningText.includes(
        "transaction-process"
      ) ||
      warningText.includes(
        "transaction process"
      ) ||
      warningText.includes(
        "notary"
      ) ||
      warningText.includes(
        "escrow"
      )
    ) &&
    (
      warningText.includes(
        "excluded"
      ) ||
      warningText.includes(
        "unverified"
      ) ||
      warningText.includes(
        "generalized"
      ) ||
      warningText.includes(
        "official-source verification"
      ) ||
      warningText.includes(
        "official indonesian source"
      )
    );

  const hasRestrictedTetamoPaymentRole =
    constraintText.includes(
      "tetamo"
    ) &&
    constraintText.includes(
      "payment"
    ) &&
    (
      constraintText.includes(
        "does not handle"
      ) ||
      constraintText.includes(
        "does not manage"
      ) ||
      constraintText.includes(
        "does not determine"
      ) ||
      constraintText.includes(
        "outside tetamo"
      )
    );

  const checkPatterns = (
    label: string,
    patterns: RegExp[]
  ) => {
    for (
      const pattern of patterns
    ) {
      if (
        pattern.test(
          draftText
        )
      ) {
        violations.push(
          label
        );
        return;
      }
    }
  };

  if (
    hasExcludedSensitiveTransactionClaims
  ) {
    checkPatterns(
      "reintroduced excluded transaction-process claims",
      [
        /\bpayment stages?\b/i,
        /\bpayment schedules?\b/i,
        /\bpayment processes? after\b/i,
        /\bmultiple stages\b/i,
        /\btypical payment\b/i,
        /\bstages? of (?:the )?property (?:purchase|sale) payments?\b/i,
        /\breservation fees?\b/i,
        /\bdown payments?\b/i,
        /\bfinal settlement(?: payments?)?\b/i,
        /\binstallments?\b/i,
        /\bescrow\b/i,
        /\bnotar(?:y|ies)\b/i,
        /\bppat\b/i,

        /\btahapan pembayaran\b/i,
        /\bjadwal pembayaran\b/i,
        /\bproses pembayaran setelah\b/i,
        /\bbeberapa tahapan\b/i,
        /\bbiaya reservasi\b/i,
        /\buang muka\b/i,
        /\bpelunasan\b/i,
        /\bcicilan\b/i,
        /\bnotaris\b/i,
      ]
    );
  }

  if (
    hasRestrictedTetamoPaymentRole
  ) {
    checkPatterns(
      "implied Tetamo payment/transaction control",
      [
        /\btetamo\s+(?:manages?|schedules?|processes?|holds?|reviews?|determines?)\b/i,
        /\btetamo\s+(?:must|should|needs? to)\s+(?:review|hold|manage|schedule|process|determine)\b/i,

        /\btetamo\s+(?:mengelola|menjadwalkan|memproses|menyimpan|meninjau|menentukan)\b/i,
        /\btetamo\s+(?:harus|perlu)\s+(?:meninjau|mengelola|menjadwalkan|memproses|menentukan)\b/i,
      ]
    );

    checkPatterns(
      "invented internal transaction-record requirement",
      [
        /\binternal communications?\b/i,
        /\btransaction records?\b/i,
        /\bagreements? related to (?:the )?(?:property )?sale\b/i,

        /\bkomunikasi internal\b/i,
        /\bcatatan transaksi\b/i,
        /\bperjanjian terkait (?:penjualan|transaksi)\b/i,
      ]
    );
  }

  const uniqueViolations =
    Array.from(
      new Set(
        violations
      )
    );

  if (
    uniqueViolations.length
  ) {
    throw new Error(
      "Rupert final draft failed binding research safety validation: " +
      uniqueViolations.join(
        "; "
      ) +
      ". No blog or approval should be created from this draft."
    );
  }
}

function validateDraftAgainstFounderRedraftQuality(
  research:
    RupertBlogResearch,

  draft: {
    title: string;
    titleId: string;
    excerpt: string;
    excerptId: string;
    contentHtml: string;
    contentIdHtml: string;
  }
) {
  const constraintText =
    (
      research
        .bindingConstraints ??
      []
    )
      .map(cleanString)
      .join("\n")
      .toLowerCase();

  const requiresSpacingCorrection =
    constraintText.includes(
      "spacing"
    ) ||
    constraintText.includes(
      "proofread"
    ) ||
    constraintText.includes(
      "fused word"
    ) ||
    constraintText.includes(
      "missing space"
    );

  if (
    !requiresSpacingCorrection
  ) {
    return;
  }

  const draftText =
    normalizeSafetyText(
      [
        draft.title,
        draft.titleId,
        draft.excerpt,
        draft.excerptId,
        draft.contentHtml,
        draft.contentIdHtml,
      ].join("\n")
    );

  /*
   * Deterministic protection against the exact class of
   * fused-word defects already observed in Rupert output.
   *
   * The model prompt below also requires a complete
   * bilingual proofreading pass for broader typo coverage.
   */
  const fusedWordPatterns = [
    /\binindonesia\b/i,
    /\binthe\b/i,
    /\bandlarge\b/i,
    /\byangterbatas\b/i,
    /\bhalinimenegaskan\b/i,
    /\binimenegaskan\b/i,
    /\beasingcompared\b/i,
    /\bfundsto\b/i,
    /\bbankingindustry\b/i,
    /\bdibandingkankenaikan\b/i,
    /\bbahwafaktor\b/i,
  ];

  if (
    fusedWordPatterns.some(
      (pattern) =>
        pattern.test(
          draftText
        )
    )
  ) {
    throw new Error(
      "Rupert final draft failed Founder redraft quality validation: unresolved fused-word or missing-space errors. No blog or approval should be created from this draft."
    );
  }
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

BINDING FOUNDER / INTERNAL CONSTRAINTS
${
  research.bindingConstraints?.length
    ? research.bindingConstraints
        .map(
          (constraint) =>
            `- ${constraint}`
        )
        .join("\n")
    : "- None supplied."
}

These constraints override recommendations, model knowledge,
and weaker statements elsewhere in the research package.

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
- Research warnings are BINDING editorial constraints.
- If a warning says a claim, finding, topic, or category of
  facts was excluded, unsupported, unverified, generalized,
  or requires stronger evidence, DO NOT reintroduce that
  material from your own knowledge.
- Never reconstruct an excluded claim by calling it
  "typical", "common", "standard", "usual", or similar.
- If recommendations or findings conflict with a research
  warning, follow the stricter warning and OMIT the claim.
- Absence from retained findings does not give permission
  to infer or recreate excluded facts.
- Do not imply Tetamo controls, manages, schedules,
  processes, holds, reviews, or determines property
  payments, settlement funds, transaction records,
  payment records, agreements, escrow records, or similar
  transaction materials unless the retained research
  explicitly establishes that exact Tetamo role and no
  warning contradicts it.
- Do not turn a customer's unresolved or ambiguous question
  into a factual description of how Tetamo operates.
- When evidence is too weak for a useful factual article,
  write a narrower article or explanation rather than
  filling gaps with general property-industry knowledge.

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
- Before returning the final JSON, perform a complete
  bilingual proofreading pass.
- Fix missing spaces, fused words, accidental word
  concatenations, obvious typographical errors, and broken
  English or Indonesian spacing.
- If Founder redraft feedback identifies a proofreading or
  spacing defect, correcting it is mandatory.
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

  validateDraftAgainstResearchConstraints(
    research,
    {
      title,
      titleId,
      excerpt,
      excerptId,
      contentHtml,
      contentIdHtml,
      coverImage,
      bodyImages,
    }
  );

  validateDraftAgainstFounderRedraftQuality(
    research,
    {
      title,
      titleId,
      excerpt,
      excerptId,
      contentHtml,
      contentIdHtml,
    }
  );

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
