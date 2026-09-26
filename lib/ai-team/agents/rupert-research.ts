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

function requiresOfficialIndonesianFindingSource(
  statement: string
) {
  return /\b(law|legal|regulation|regulatory|tax|taxes|taxation|bphtb|pph|ajb|ppjb|notary|notaris|ppat|escrow|land title|certificate|ownership transfer|transfer of ownership|deed of sale|hak milik|hak pakai|hgb|shm)\b/i.test(
    statement
  );
}


function hasUnresolvedCustomerIntentScope(
  topic: string,
  context?: string | null
) {
  const evidenceScope =
    [
      topic,
      context ?? "",
    ]
      .join("\n")
      .toLowerCase();

  return evidenceScope.includes(
    "customer_intent_scope=unresolved"
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

  let summary =
    cleanString(row.summary);

  const rawFindings =
    Array.isArray(row.findings)
      ? row.findings
      : [];

  const findings:
    RupertResearchFinding[] = [];

  let excludedOfficialVerificationCount =
    0;

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
     * Finding-level verification.
     *
     * A broad research topic can lead Rupert into Indonesian
     * legal, tax, title, notary, escrow or transaction-process
     * claims that were not obvious from the original topic.
     *
     * Those claims must not enter the structured factual
     * findings unless that specific finding cites an official
     * Indonesian source.
     */
    if (
      requiresOfficialIndonesianFindingSource(
        statement
      ) &&
      !hasOfficialSource
    ) {
      excludedOfficialVerificationCount +=
        1;

      continue;
    }

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

  if (
    excludedOfficialVerificationCount >
    0
  ) {
    warnings.push(
      `${excludedOfficialVerificationCount} Indonesian legal, tax, title, notary, escrow or transaction-process finding(s) were excluded because the cited evidence did not include an official Indonesian source.`
    );
  }

  /*
   * Summary containment.
   *
   * The model-generated summary has no claim-level source map.
   * Therefore sensitive Indonesian legal, tax, title, notary,
   * escrow or transaction-process claims must not survive in
   * the summary merely because they were mentioned in the raw
   * research memo.
   */
  if (
    summary &&
    requiresOfficialIndonesianFindingSource(
      summary
    )
  ) {
    summary =
      findings.length > 0
        ? `Rupert retained ${findings.length} externally sourced factual finding(s) after evidence filtering. Sensitive Indonesian legal, tax, title, notary, escrow or transaction-process claims were excluded from the summary unless they survived the structured evidence standard. Review the retained findings and warnings for details.`
        : "Rupert did not retain factual findings that met the required evidence standard. Review the research warnings for unresolved or insufficiently verified points.";

    warnings.push(
      "The model-generated research summary was generalized because it contained sensitive Indonesian legal, tax, title, notary, escrow or transaction-process claims without claim-level official-source verification."
    );
  }

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

  const unresolvedCustomerIntent =
    hasUnresolvedCustomerIntentScope(
      cleanTopic,
      context
    );

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

CUSTOMER-INTENT EVIDENCE BOUNDARY
${
  unresolvedCustomerIntent
    ? `
- The supplied internal evidence confirms a recurring
  customer question but DOES NOT identify which specific
  payment event the customers meant.
- Public-web research cannot determine customer intent.
- You may research externally verifiable payment processes,
  terminology, documented policies and publicly documented
  Tetamo information.
- You MUST NOT conclude which payment event these customers
  meant from public-web evidence.
- You MUST explicitly preserve this unresolved distinction
  in the research memo.
`
    : "No special unresolved customer-intent boundary."
}

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

INDONESIAN OFFICIAL-SOURCE RULE

For any factual claim involving Indonesian law, regulation,
tax, BPHTB, PPh, AJB, PPJB, land title, ownership transfer,
certificate, notary, notaris, PPAT or escrow:

- Include it as a factual finding only when that finding is
  supported by an official Indonesian government or regulator
  source from the supplied VALID SOURCE LIST.
- A commercial property website, agency, blog, relocation
  company or general guide is not sufficient verification.
- If official verification is unavailable, omit that factual
  finding and preserve the limitation in warnings.

CUSTOMER-INTENT RULE
${
  unresolvedCustomerIntent
    ? `
The supplied internal evidence does not establish which
payment event the customers meant.

Do NOT turn public-web findings into a claim about customer
intent.

The warnings array MUST preserve that customer-intended
payment event remains unresolved.
`
    : "No special unresolved customer-intent rule."
}

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

  if (
    unresolvedCustomerIntent
  ) {
    const combined =
      [
        structured.summary,

        ...structured.findings.map(
          (finding) =>
            finding.statement
        ),

        ...structured.recommendations,
      ]
        .join(" ");

    /*
     * Do not reject language that merely acknowledges the
     * unresolved question, such as:
     *
     * "We cannot determine what customers meant."
     *
     * Reject only statements that map the recurring inquiries
     * to a specific payment event or transaction meaning.
     */
    const unsupportedIntentClaims = [
      /customers?\s+(?:mean|meant|are referring to|were referring to|refer to|referred to)\s+(?:the\s+)?(?:settlement|settlement payment|payment release|release of funds|sale proceeds|seller proceeds|commission|agent commission|service fee|listing fee|deposit|booking deposit|owner payment|buyer payment)\b/i,

      /(?:customer|customers|customer inquiries?|customer questions?)\s+(?:are|were|is|was)\s+(?:asking about|referring to|about)\s+(?:the\s+)?(?:settlement|settlement payment|payment release|release of funds|sale proceeds|seller proceeds|commission|agent commission|service fee|listing fee|deposit|booking deposit|owner payment|buyer payment)\b/i,

      /(?:the|these)\s+(?:customer\s+)?(?:questions?|inquiries?)\s+(?:mean|meant|refer to|referred to|concern|concerned)\s+(?:the\s+)?(?:settlement|settlement payment|payment release|release of funds|sale proceeds|seller proceeds|commission|agent commission|service fee|listing fee|deposit|booking deposit|owner payment|buyer payment)\b/i,
    ];

    if (
      unsupportedIntentClaims.some(
        (pattern) =>
          pattern.test(
            combined
          )
      )
    ) {
      throw new Error(
        "Rupert research attempted to map unresolved customer intent to a specific payment event using public-web evidence."
      );
    }

    const unresolvedWarning =
      "Customer-intended payment event remains unresolved from the supplied internal evidence; public-web research cannot determine which payment event the customers meant.";

    const alreadyWarned =
      structured.warnings.some(
        (warning) =>
          warning
            .toLowerCase()
            .includes(
              "customer-intended payment event remains unresolved"
            )
      );

    if (!alreadyWarned) {
      structured.warnings.push(
        unresolvedWarning
      );
    }
  }

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
