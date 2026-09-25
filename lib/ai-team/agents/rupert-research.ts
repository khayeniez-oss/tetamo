import "server-only";

import OpenAI from "openai";

import {
  requireAgentPermission,
} from "@/lib/ai-team/permissions/agent-permissions";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const RUPERT_RESEARCH_MODEL =
  "gpt-4.1-mini";

export type RupertResearchSource = {
  url: string;
  title: string;
  domain: string;
};

export type RupertResearchFinding = {
  statement: string;
  sourceUrls: string[];
  confidence:
    | "high"
    | "medium"
    | "low";
};

export type RupertResearchResult = {
  topic: string;
  summary: string;
  findings: RupertResearchFinding[];
  recommendations: string[];
  warnings: string[];
  sources: RupertResearchSource[];
  researchText: string;
  responseId: string | null;
  researchedAt: string;
};

type ResearchInput = {
  topic: string;
  context?: string | null;
};

type RawCitation = {
  type?: unknown;
  url?: unknown;
  title?: unknown;
};

type RawSource = {
  url?: unknown;
  title?: unknown;
};

function cleanString(
  value: unknown
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function canonicalizeUrl(
  value: string
) {
  try {
    const url = new URL(value);

    for (
      const key of [
        ...url.searchParams.keys(),
      ]
    ) {
      if (
        key.toLowerCase()
          .startsWith("utm_") ||
        key.toLowerCase() ===
          "fbclid" ||
        key.toLowerCase() ===
          "gclid"
      ) {
        url.searchParams.delete(key);
      }
    }

    return url.toString();
  } catch {
    return value.trim();
  }
}

function getDomain(url: string) {
  try {
    return new URL(url).hostname
      .replace(/^www\./, "")
      .toLowerCase();
  } catch {
    return "";
  }
}

function isOfficialIndonesianDomain(
  domain: string
) {
  const clean =
    domain.toLowerCase();

  return (
    clean.endsWith(".go.id") ||
    clean === "go.id"
  );
}

function isIndonesiaRelevantSource(
  source: RupertResearchSource
) {
  const searchable = [
    source.url,
    source.title,
    source.domain,
  ]
    .join(" ")
    .toLowerCase();

  return (
    source.domain.endsWith(".id") ||
    searchable.includes(
      "indonesia"
    ) ||
    searchable.includes(
      "indonesian"
    )
  );
}

function requiresOfficialIndonesianSource(
  topic: string
) {
  return /\b(law|legal|regulation|regulatory|tax|visa|immigration|ownership|land title|certificate|zoning|hak milik|hak pakai|hgb|shm|ajb|ppjb|notary|notaris)\b/i.test(
    topic
  );
}

function safeParseJson(
  value: string
): unknown {
  try {
    return JSON.parse(value);
  } catch {
    const match =
      value.match(/\{[\s\S]*\}/);

    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function collectSources(
  response: unknown
): RupertResearchSource[] {
  const result =
    response as {
      output?: Array<{
        type?: string;
        action?: {
          sources?: RawSource[];
        };
        content?: Array<{
          type?: string;
          annotations?: RawCitation[];
        }>;
      }>;
    };

  const byUrl =
    new Map<
      string,
      RupertResearchSource
    >();

  for (
    const item of result.output ?? []
  ) {
    /*
     * Complete web-search source list,
     * when returned through:
     * include:
     * ["web_search_call.action.sources"]
     */
    for (
      const source of
        item.action?.sources ?? []
    ) {
      const rawUrl =
        cleanString(source.url);

      if (!rawUrl) continue;

      const url =
        canonicalizeUrl(
          rawUrl
        );

      const title =
        cleanString(source.title);

      byUrl.set(url, {
        url,
        title:
          title ||
          getDomain(url) ||
          "Web source",
        domain: getDomain(url),
      });
    }

    /*
     * Citation annotations on the
     * model's final answer.
     */
    for (
      const content of
        item.content ?? []
    ) {
      for (
        const annotation of
          content.annotations ?? []
      ) {
        if (
          annotation.type !==
          "url_citation"
        ) {
          continue;
        }

        const rawUrl =
          cleanString(
            annotation.url
          );

        if (!rawUrl) continue;

        const url =
          canonicalizeUrl(
            rawUrl
          );

        const title =
          cleanString(
            annotation.title
          );

        const existing =
          byUrl.get(url);

        byUrl.set(url, {
          url,
          title:
            title ||
            existing?.title ||
            getDomain(url) ||
            "Web source",
          domain:
            existing?.domain ||
            getDomain(url),
        });
      }
    }
  }

  return [...byUrl.values()];
}

function normalizeStructuredResearch(
  parsed: unknown,
  sources: RupertResearchSource[]
) {
  const sourceByUrl =
    new Map(
      sources.map(
        (source) => [
          source.url,
          source,
        ]
      )
    );

  const validSourceUrls =
    new Set(
      sourceByUrl.keys()
    );
  const row =
    parsed &&
    typeof parsed === "object"
      ? (parsed as Record<
          string,
          unknown
        >)
      : {};

  const summary =
    cleanString(row.summary);

  const rawFindings =
    Array.isArray(row.findings)
      ? row.findings
      : [];

  const findings:
    RupertResearchFinding[] = [];

  for (
    const item of rawFindings
  ) {
    if (
      !item ||
      typeof item !== "object"
    ) {
      continue;
    }

    const finding =
      item as Record<
        string,
        unknown
      >;

    const statement =
      cleanString(
        finding.statement
      );

    if (!statement) {
      continue;
    }

    const candidateUrls =
      Array.isArray(
        finding.sourceUrls
      )
        ? finding.sourceUrls
        : [];

    const sourceUrls =
      candidateUrls
        .map(cleanString)
        .map(canonicalizeUrl)
        .filter(
          (url) =>
            url &&
            validSourceUrls.has(
              url
            )
        );

    const confidenceRaw =
      cleanString(
        finding.confidence
      ).toLowerCase();

    let confidence:
      RupertResearchFinding["confidence"] =
        confidenceRaw === "high" ||
        confidenceRaw ===
          "medium" ||
        confidenceRaw === "low"
          ? confidenceRaw
          : "medium";

    /*
     * Factual findings without a
     * real research source should
     * not enter the structured
     * factual findings collection.
     */
    if (
      sourceUrls.length === 0
    ) {
      continue;
    }

    const sourceDomains =
      new Set(
        sourceUrls
          .map(getDomain)
          .filter(Boolean)
      );

    const hasOfficialSource =
      sourceUrls.some(
        (url) =>
          isOfficialIndonesianDomain(
            getDomain(url)
          )
      );

    /*
     * Rupert may not label a claim
     * high-confidence merely because
     * one ordinary website says it.
     *
     * High confidence requires either:
     * - an official Indonesian source,
     *   or
     * - at least two independent
     *   source domains.
     */
    if (
      confidence === "high" &&
      !hasOfficialSource &&
      sourceDomains.size < 2
    ) {
      confidence = "medium";
    }

    findings.push({
      statement,
      sourceUrls,
      confidence,
    });
  }

  const recommendations =
    Array.isArray(
      row.recommendations
    )
      ? row.recommendations
          .map(cleanString)
          .filter(Boolean)
      : [];

  const warnings =
    Array.isArray(
      row.warnings
    )
      ? row.warnings
          .map(cleanString)
          .filter(Boolean)
      : [];

  return {
    summary,
    findings,
    recommendations,
    warnings,
  };
}

export async function researchWithRupert({
  topic,
  context,
}: ResearchInput): Promise<RupertResearchResult> {
  requireAgentPermission(
    "rupert",
    "research_public_web"
  );

  const cleanTopic =
    topic.trim();

  if (!cleanTopic) {
    throw new Error(
      "Rupert research topic is required."
    );
  }

  if (
    !process.env.OPENAI_API_KEY
  ) {
    throw new Error(
      "OPENAI_API_KEY is missing."
    );
  }

  /*
   * PHASE 1:
   * Real public-web research.
   *
   * This call MUST search.
   * Rupert cannot substitute model
   * memory for current research.
   */
  const researchResponse =
    await openai.responses.create({
      model:
        RUPERT_RESEARCH_MODEL,

      tools: [
        {
          type: "web_search",
        },
      ],

      tool_choice:
        "required",

      include: [
        "web_search_call.action.sources",
      ],

      input: `
You are Rupert, Tetamo's AI Content & SEO Manager.

Perform factual PUBLIC-WEB research for Tetamo.

RESEARCH TOPIC
${cleanTopic}

ADDITIONAL TETAMO CONTEXT
${context?.trim() || "None supplied."}

RESEARCH STANDARD

- Search the live public web.
- Prefer primary and authoritative sources.
- Do not describe sources collectively as "authoritative"
  unless the evidence actually comes from authoritative,
  primary or official sources. Otherwise say "cited sources"
  or describe the source quality accurately.
- If the research topic is Indonesia-specific, actively
  search Indonesia-relevant sources, including Indonesian
  language searches where useful.
- Do not convert a generic foreign best-practice article
  into an Indonesia-specific factual claim.
- For Indonesian laws, regulations, tax, immigration,
  zoning, land/property ownership, certificates or
  government requirements, official Indonesian government
  or regulator sources are required.
- For statistics and market data, prioritize original
  publishers or clearly reputable research sources.
- Cross-check important claims where practical.
- Distinguish factual findings from interpretation.
- State uncertainty where evidence is incomplete.
- Never invent statistics, search volume, rankings,
  laws, dates, prices or market performance.
- Do not treat competitor marketing claims as established
  fact.
- Do not copy long passages from sources.
- Tetamo is not a legal, tax or regulatory authority.

Return a concise research memo with:
1. Research summary.
2. Important factual findings.
3. Relevant content/SEO implications for Tetamo.
4. Any uncertainty or verification warning.

Confidence standard:
- Do not call a claim high-confidence merely because one
  commercial blog states it.
- Prefer corroboration from independent sources.
- Clearly separate generic property-listing best practices
  from facts specifically about Indonesia.

Use citations for factual claims.
`.trim(),

      max_output_tokens: 2400,
    });

  const researchText =
    researchResponse.output_text
      .trim();

  const sources =
    collectSources(
      researchResponse
    );

  if (
    !researchText ||
    sources.length === 0
  ) {
    throw new Error(
      "Rupert's web research did not return a sourced research result."
    );
  }

  const indonesiaSpecific =
    /\b(indonesia|indonesian)\b/i.test(
      cleanTopic
    );

  if (
    indonesiaSpecific &&
    !sources.some(
      isIndonesiaRelevantSource
    )
  ) {
    throw new Error(
      "Rupert did not find sufficient Indonesia-relevant sources for this Indonesia-specific research topic."
    );
  }

  if (
    requiresOfficialIndonesianSource(
      cleanTopic
    ) &&
    !sources.some(
      (source) =>
        isOfficialIndonesianDomain(
          source.domain
        )
    )
  ) {
    throw new Error(
      "Rupert could not verify this regulatory/legal topic with an official Indonesian source."
    );
  }

  /*
   * PHASE 2:
   * Structure only the material
   * already researched above.
   *
   * This second call has NO web
   * tool. It cannot introduce new
   * research sources.
   */
  const sourceList =
    sources
      .map(
        (source, index) =>
          `${index + 1}. ${source.title}\n${source.url}`
      )
      .join("\n\n");

  const structureResponse =
    await openai.responses.create({
      model:
        RUPERT_RESEARCH_MODEL,

      input: `
Structure the supplied Rupert research memo.

You MUST NOT add new factual claims.

You MUST NOT invent sources.

Every factual finding must cite at least one URL from
the supplied VALID SOURCE LIST.

If a claim cannot be tied to a supplied source URL,
do not include it as a factual finding.

Confidence rules:
- "high" only when evidence is particularly strong.
- A single ordinary commercial/blog source is not enough
  for high confidence.
- Use "medium" for a useful factual claim supported by one
  non-authoritative source.
- Use "low" where evidence is weak or uncertain.
- Put important uncertainty into "warnings".
- Recommendations are Rupert's professional suggestions,
  not factual claims.

Return ONLY valid JSON.

JSON shape:

{
  "summary": "string",
  "findings": [
    {
      "statement": "string",
      "sourceUrls": [
        "https://..."
      ],
      "confidence": "high | medium | low"
    }
  ],
  "recommendations": [
    "string"
  ],
  "warnings": [
    "string"
  ]
}

VALID SOURCE LIST

${sourceList}

RESEARCH MEMO

${researchText}
`.trim(),

      max_output_tokens: 1800,
    });

  const parsed =
    safeParseJson(
      structureResponse.output_text
    );

  const structured =
    normalizeStructuredResearch(
      parsed,
      sources
    );

  return {
    topic: cleanTopic,

    summary:
      structured.summary ||
      researchText.slice(
        0,
        1500
      ),

    findings:
      structured.findings,

    recommendations:
      structured.recommendations,

    warnings:
      structured.warnings,

    sources,

    researchText,

    responseId:
      researchResponse.id ??
      null,

    researchedAt:
      new Date().toISOString(),
  };
}
