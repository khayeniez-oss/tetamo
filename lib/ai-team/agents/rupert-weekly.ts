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

const MODEL =
  "gpt-4.1-mini";

const WEEKLY_TOPICS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: {
      type: "string",
    },
    topics: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          slot: {
            type: "string",
            enum: [
              "timely",
              "educational",
              "evergreen",
            ],
          },
          title: {
            type: "string",
          },
          research_topic: {
            type: "string",
          },
          rationale: {
            type: "string",
          },
        },
        required: [
          "slot",
          "title",
          "research_topic",
          "rationale",
        ],
      },
    },
  },
  required: [
    "summary",
    "topics",
  ],
} as const;

const WEEKLY_VERIFICATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: {
      type: "string",
    },
    verification_notes: {
      type: "string",
    },
    topics: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          slot: {
            type: "string",
            enum: [
              "timely",
              "educational",
              "evergreen",
            ],
          },
          title: {
            type: "string",
          },
          research_topic: {
            type: "string",
          },
          rationale: {
            type: "string",
          },
        },
        required: [
          "slot",
          "title",
          "research_topic",
          "rationale",
        ],
      },
    },
  },
  required: [
    "summary",
    "verification_notes",
    "topics",
  ],
} as const;

const WEEKLY_EDITORIAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: {
      type: "string",
    },
    editorial_notes: {
      type: "string",
    },
    topics: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          slot: {
            type: "string",
            enum: [
              "timely",
              "educational",
              "evergreen",
            ],
          },
          title: {
            type: "string",
          },
          research_topic: {
            type: "string",
          },
          rationale: {
            type: "string",
          },
        },
        required: [
          "slot",
          "title",
          "research_topic",
          "rationale",
        ],
      },
    },
  },
  required: [
    "summary",
    "editorial_notes",
    "topics",
  ],
} as const;

export type RupertWeeklyTopic = {
  slot:
    | "timely"
    | "educational"
    | "evergreen";

  title: string;

  researchTopic: string;

  rationale: string;
};

export type RupertWeeklyPlan = {
  summary: string;

  topics:
    RupertWeeklyTopic[];

  researchMemo: string;

  verificationMemo: string;

  responseId:
    string | null;

  verificationResponseId:
    string | null;
};

function cleanString(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function asRecord(
  value: unknown
): Record<string, unknown> {
  return value &&
    typeof value ===
      "object" &&
    !Array.isArray(value)
    ? value as Record<
        string,
        unknown
      >
    : {};
}

function parseJson(
  value: string
): Record<string, unknown> | null {
  const text =
    value.trim();

  if (!text) {
    return null;
  }

  try {
    const parsed =
      JSON.parse(text);

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
    text.match(
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

  const first =
    text.indexOf("{");

  const last =
    text.lastIndexOf("}");

  if (
    first < 0 ||
    last <= first
  ) {
    return null;
  }

  try {
    const parsed =
      JSON.parse(
        text.slice(
          first,
          last + 1
        )
      );

    return parsed &&
      typeof parsed ===
        "object" &&
      !Array.isArray(parsed)
      ? parsed as Record<
          string,
          unknown
        >
      : null;
  } catch {
    return null;
  }
}

function parseTopicSet(
  parsed:
    Record<string, unknown>,

  stage:
    string
) {
  const summary =
    cleanString(
      parsed.summary
    );

  if (
    !Array.isArray(
      parsed.topics
    )
  ) {
    throw new Error(
      `${stage} contains no topic list.`
    );
  }

  const topics:
    RupertWeeklyTopic[] =
      [];

  for (
    const expected of [
      "timely",
      "educational",
      "evergreen",
    ] as const
  ) {
    const found =
      parsed.topics.find(
        (item) =>
          cleanString(
            asRecord(item)
              .slot
          ) === expected
      );

    const row =
      asRecord(found);

    const title =
      cleanString(
        row.title
      );

    const researchTopic =
      cleanString(
        row.research_topic ??
          row.researchTopic
      );

    const rationale =
      cleanString(
        row.rationale
      );

    if (
      !title ||
      !researchTopic ||
      !rationale
    ) {
      throw new Error(
        `${stage} is missing a complete ${expected} topic.`
      );
    }

    topics.push({
      slot:
        expected,

      title,

      researchTopic,

      rationale,
    });
  }

  if (
    new Set(
      topics.map(
        (topic) =>
          topic.title
            .toLowerCase()
      )
    ).size !== 3
  ) {
    throw new Error(
      `${stage} contains duplicate topics.`
    );
  }

  return {
    summary,
    topics,
  };
}

function findEditorialTitleRisks(
  topics: RupertWeeklyTopic[]
) {
  const risks:
    string[] = [];

  const patterns = [
    {
      pattern:
        /\bdownturn\b/i,

      label:
        "downturn",
    },
    {
      pattern:
        /\bcrash\b/i,

      label:
        "crash",
    },
    {
      pattern:
        /\bcollapse\b/i,

      label:
        "collapse",
    },
    {
      pattern:
        /\bcrisis\b/i,

      label:
        "crisis",
    },
    {
      pattern:
        /\bboom\b/i,

      label:
        "boom",
    },
    {
      pattern:
        /\bsurge\b/i,

      label:
        "surge",
    },
    {
      pattern:
        /\bdominant\b/i,

      label:
        "dominant",
    },
    {
      pattern:
        /\bdefinitive\b/i,

      label:
        "definitive",
    },
    {
      pattern:
        /\bguaranteed?\b/i,

      label:
        "guaranteed",
    },
    {
      pattern:
        /\bbest\b/i,

      label:
        "best",
    },
    {
      pattern:
        /\bsafest\b/i,

      label:
        "safest",
    },
    {
      pattern:
        /\bmatters most\b/i,

      label:
        "matters most",
    },
    {
      pattern:
        /\bfaster sales\b/i,

      label:
        "faster sales",
    },
    {
      pattern:
        /\bsell faster\b/i,

      label:
        "sell faster",
    },
  ];

  for (
    const topic of topics
  ) {
    for (
      const rule of patterns
    ) {
      if (
        rule.pattern.test(
          topic.title
        )
      ) {
        risks.push(
          `${topic.slot}: "${rule.label}" in "${topic.title}"`
        );
      }
    }
  }

  return risks;
}

function findAutonomousTopicRisks(
  topics: RupertWeeklyTopic[]
) {
  const risks:
    string[] = [];

  const restricted = [
    {
      pattern:
        /\bconstitutional court\b/i,

      label:
        "constitutional-court interpretation",
    },
    {
      pattern:
        /\bmahkamah konstitusi\b/i,

      label:
        "constitutional-court interpretation",
    },
    {
      pattern:
        /\bcapital status\b/i,

      label:
        "capital-city legal status",
    },
    {
      pattern:
        /\bindonesia'?s capital\b/i,

      label:
        "capital-city legal status",
    },
    {
      pattern:
        /\bibu kota\b/i,

      label:
        "capital-city legal status",
    },
    {
      pattern:
        /\bpresidential decree\b/i,

      label:
        "presidential-decree interpretation",
    },
    {
      pattern:
        /\bkeputusan presiden\b/i,

      label:
        "presidential-decree interpretation",
    },
    {
      pattern:
        /\bgovernment[- ]backed\b/i,

      label:
        "government-program claim",
    },
    {
      pattern:
        /\bgovernment incentive/i,

      label:
        "government-incentive interpretation",
    },
    {
      pattern:
        /\bloan[- ]to[- ]value\b/i,

      label:
        "financing-rule interpretation",
    },
    {
      pattern:
        /\bfinancing[- ]to[- ]value\b/i,

      label:
        "financing-rule interpretation",
    },
    {
      pattern:
        /\bLTV\b/,

      label:
        "financing-rule interpretation",
    },
    {
      pattern:
        /\bFTV\b/,

      label:
        "financing-rule interpretation",
    },
    {
      pattern:
        /\btax(?:es|ation)?\b/i,

      label:
        "tax interpretation",
    },
    {
      pattern:
        /\bpajak\b/i,

      label:
        "tax interpretation",
    },
    {
      pattern:
        /\bimmigration\b/i,

      label:
        "immigration interpretation",
    },
    {
      pattern:
        /\bvisa\b/i,

      label:
        "immigration interpretation",
    },
    {
      pattern:
        /\bzoning\b/i,

      label:
        "zoning interpretation",
    },
    {
      pattern:
        /\bownership law/i,

      label:
        "ownership-law interpretation",
    },
    {
      pattern:
        /\bland title\b/i,

      label:
        "land-title interpretation",
    },
    {
      pattern:
        /\bSHM\b/,

      label:
        "land-title interpretation",
    },
    {
      pattern:
        /\bHGB\b/,

      label:
        "land-title interpretation",
    },
    {
      pattern:
        /\bhak pakai\b/i,

      label:
        "land-title interpretation",
    },
  ];

  const broadEditorialRisks = [
    {
      pattern:
        /\bdownturn\b/i,

      label:
        "broad market-downturn characterization",
    },
    {
      pattern:
        /\bcrash\b/i,

      label:
        "broad market-crash characterization",
    },
    {
      pattern:
        /\bcollapse\b/i,

      label:
        "broad market-collapse characterization",
    },
    {
      pattern:
        /\bcrisis\b/i,

      label:
        "broad market-crisis characterization",
    },
    {
      pattern:
        /\bboom\b/i,

      label:
        "broad market-boom characterization",
    },
    {
      pattern:
        /\bsurge\b/i,

      label:
        "broad market-surge characterization",
    },
    {
      pattern:
        /\blegal\b/i,

      label:
        "legal interpretation",
    },
    {
      pattern:
        /\bregulatory\b/i,

      label:
        "regulatory interpretation",
    },
  ];

  const unsupportedOutcomeLanguage = [
    {
      pattern:
        /\bfaster sales\b/i,

      label:
        "faster-sales promise",
    },
    {
      pattern:
        /\bsell faster\b/i,

      label:
        "faster-sales promise",
    },
    {
      pattern:
        /\bslower sales\b/i,

      label:
        "unsupported sales-effect claim",
    },
    {
      pattern:
        /\bsales success\b/i,

      label:
        "unsupported sales-success claim",
    },
    {
      pattern:
        /\bsuccessful sale\b/i,

      label:
        "unsupported successful-sale claim",
    },
    {
      pattern:
        /\bchances of a successful sale\b/i,

      label:
        "unsupported sales-outcome claim",
    },
    {
      pattern:
        /\bimprove their chances\b/i,

      label:
        "unsupported outcome-improvement claim",
    },
    {
      pattern:
        /\bsales outcomes?\b/i,

      label:
        "unsupported sales-outcome claim",
    },
    {
      pattern:
        /\btransaction success\b/i,

      label:
        "unsupported transaction-success claim",
    },
    {
      pattern:
        /\bsales performance\b/i,

      label:
        "unsupported sales-performance claim",
    },
    {
      pattern:
        /\blong[- ]term success\b/i,

      label:
        "unsupported investment-success framing",
    },
    {
      pattern:
        /\blost trust\b/i,

      label:
        "unsupported trust-effect claim",
    },
    {
      pattern:
        /\bbetter conversion\b/i,

      label:
        "conversion-performance claim",
    },
    {
      pattern:
        /\bguaranteed\b/i,

      label:
        "guaranteed-outcome claim",
    },
  ];

  for (
    const topic of topics
  ) {
    const fullTopic =
      [
        topic.title,
        topic.researchTopic,
        topic.rationale,
      ]
        .join(" ")
        .trim();

    for (
      const rule of [
        ...broadEditorialRisks,
        ...restricted,
        ...unsupportedOutcomeLanguage,
      ]
    ) {
      if (
        rule.pattern.test(
          fullTopic
        )
      ) {
        risks.push(
          `${topic.slot}: ${rule.label}`
        );
      }
    }
  }

  return Array.from(
    new Set(risks)
  );
}

export async function planRupertWeek({
  weekKey,
  recentTitles,
}: {
  weekKey: string;
  recentTitles: string[];
}): Promise<RupertWeeklyPlan> {
  requireAgentPermission(
    "rupert",
    "research_public_web"
  );

  requireAgentPermission(
    "rupert",
    "create_internal_task"
  );

  if (
    !process.env.OPENAI_API_KEY
  ) {
    throw new Error(
      "OPENAI_API_KEY is missing."
    );
  }

  const nowIso =
    new Date()
      .toISOString();

  /*
   * PHASE 1
   *
   * Broad weekly market/content intelligence.
   */
  const research =
    await openai.responses.create({
      model:
        MODEL,

      tools: [
        {
          type:
            "web_search",
        },
      ],

      tool_choice:
        "required",

      include: [
        "web_search_call.action.sources",
      ],

      input: `
You are Rupert, Tetamo's AI Content & SEO Manager.

Today you are doing Tetamo's WEEKLY CONTENT INTELLIGENCE
research for the Indonesian property market.

WEEK
${weekKey}

CURRENT RUN TIME
${nowIso}

Tetamo is an Indonesian property marketplace.

SEARCH THE LIVE PUBLIC WEB.

Look for useful CURRENT signals across Indonesia including:

- Indonesian property-market developments
- buyer / renter / owner / agent questions
- regulatory or government developments
- financing and housing developments
- market reports and data
- property technology
- location and lifestyle questions
- recurring listing/property mistakes
- practical educational opportunities
- subjects currently being discussed by credible property,
  business or government sources

Do not assume Bali represents all of Indonesia.

Bali-specific topics are welcome where genuinely useful.

FRESHNESS STANDARD

- For a timely topic, prioritize current 2026 evidence.
- Prefer the newest available release when comparing
  quarterly or annual statistics.
- If a policy, incentive, regulation or program has an
  expiry date that has already passed, DO NOT describe it
  as a current measure unless a newer official source
  proves it was extended or replaced.
- Historical information may be mentioned only when
  clearly identified as historical context.

MARKET CLAIM STANDARD

- Do not infer a nationwide boom, downturn, crash,
  recovery, crisis, surge or collapse from:
  one city,
  one property type,
  one housing segment,
  one quarter,
  or one commercial article.
- For broad Indonesia market characterization, prefer
  current primary data such as Bank Indonesia, BPS, OJK,
  ministries or other appropriate official sources.
- If the evidence is mixed, describe it as mixed.
- Distinguish sales movement from price movement.

LEGAL / GOVERNMENT / STATUS STANDARD

For any claim involving:

- laws
- regulations
- tax
- ownership
- land titles
- certificates
- zoning
- permits
- immigration
- government incentives
- official administrative status
- capital-city status
- government programs

a CURRENT primary Indonesian government, regulator,
court or official legal source is required before treating
the claim as established.

If the current official position cannot be verified,
state the uncertainty and do not use the claim as the
premise of a proposed article.

SOURCE QUALITY

- Prefer primary and official Indonesian sources.
- Use reputable research reports where appropriate.
- Commercial blogs may provide leads, but their claims
  must not automatically become Tetamo facts.
- Do not call something "trending" because a single page
  discusses it.
- Do not invent Google search volume.
- Do not invent rankings.
- Do not invent statistics.
- Do not invent laws or dates.
- Tetamo is not a legal, tax or government authority.

Your job in this phase is RESEARCH only.

Produce a factual research memo that can support choosing
three strong Tetamo blog opportunities for this week.

Clearly flag:
- stale information
- weak-source claims
- conflicting evidence
- anything requiring deeper article-level verification
`.trim(),
    });

  const researchMemo =
    research.output_text
      .trim();

  if (!researchMemo) {
    throw new Error(
      "Rupert weekly research returned no memo."
    );
  }

  const recent =
    recentTitles.length
      ? recentTitles
          .slice(0, 50)
          .map(
            (title) =>
              `- ${title}`
          )
          .join("\n")
      : "- None supplied";

  /*
   * PHASE 2
   *
   * Candidate editorial selection.
   */
  const selection =
    await openai.responses.create({
      model:
        MODEL,

      text: {
        format: {
          type:
            "json_schema",

          name:
            "rupert_weekly_topics",

          strict:
            true,

          schema:
            WEEKLY_TOPICS_SCHEMA,
        },
      },

      input: `
You are Rupert, Tetamo's AI Content & SEO Manager.

Using ONLY the research memo below, propose exactly THREE
different Tetamo blog opportunities.

The weekly mix MUST be:

1. timely
   A genuinely current/recent property topic supported by
   the memo.

2. educational
   A practical problem-solving topic useful for owners,
   agents, buyers or renters.

3. evergreen
   A durable SEO/education topic that can stay useful over
   time.

RECENT TETAMO BLOGS / RUPERT RESEARCH SUBJECTS

${recent}

REPETITION RULE

Avoid materially repeating a recent Tetamo article or
recent Rupert research subject unless there has been a
meaningful new development that changes the story.

HEADLINE SAFETY

Do not use strong market/status words such as:

- downturn
- crash
- collapse
- crisis
- boom
- surge
- dominant
- definitive
- guaranteed
- remains the capital
- safest
- best investment

unless the research memo contains sufficiently current,
credible evidence supporting that EXACT scope.

Never turn one segment, city or quarter into a national
headline.

For mixed evidence, prefer accurate framing such as:

- "What the latest data shows"
- "What buyers should understand"
- "Key factors to consider"
- "How the market is changing"

CURRENT-STATUS SAFETY

Do not bake a current law, government policy,
administrative status or legal conclusion into a proposed
title unless the memo contains a current official source
supporting it.

A commercial article is not enough.

Do not invent search volume, rankings, statistics,
regulations, market direction or demand.

RESEARCH MEMO

${researchMemo}

Return ONLY valid JSON:

{
  "summary": "Short explanation of this week's content direction",
  "topics": [
    {
      "slot": "timely",
      "title": "Working article title",
      "research_topic": "Precise research question Rupert should investigate before drafting",
      "rationale": "Why this deserves the timely slot"
    },
    {
      "slot": "educational",
      "title": "Working article title",
      "research_topic": "Precise research question",
      "rationale": "Why this deserves the educational slot"
    },
    {
      "slot": "evergreen",
      "title": "Working article title",
      "research_topic": "Precise research question",
      "rationale": "Why this deserves the evergreen slot"
    }
  ]
}
`.trim(),
    });

  const selectionParsed =
    parseJson(
      selection.output_text
    );

  if (!selectionParsed) {
    throw new Error(
      "Rupert weekly candidate selection was not valid JSON."
    );
  }

  const candidate =
    parseTopicSet(
      selectionParsed,
      "Rupert weekly candidate selection"
    );

  /*
   * PHASE 3
   *
   * Independent live-web verification of the three
   * proposed topics before tasks are created.
   *
   * This is the weekly editorial quality gate.
   */
  const verification =
    await openai.responses.create({
      model:
        MODEL,

      text: {
        format: {
          type:
            "json_schema",

          name:
            "rupert_weekly_verification",

          strict:
            true,

          schema:
            WEEKLY_VERIFICATION_SCHEMA,
        },
      },

      tools: [
        {
          type:
            "web_search",
        },
      ],

      tool_choice:
        "required",

      include: [
        "web_search_call.action.sources",
      ],

      input: `
You are Rupert performing the FINAL FACTUAL GATE on
Tetamo's weekly editorial plan.

CURRENT RUN TIME
${nowIso}

WEEK
${weekKey}

CANDIDATE TOPICS

${JSON.stringify(
  candidate.topics,
  null,
  2
)}

ORIGINAL WEEKLY RESEARCH MEMO

${researchMemo}

SEARCH THE LIVE PUBLIC WEB AGAIN.

Verify whether each candidate topic is safe, current and
properly scoped before Tetamo creates a work task for it.

VERIFY THESE THINGS:

1. TIMELY TOPIC
- Is the development genuinely current?
- Is the newest available data being used?
- Does the headline overgeneralize one city, segment or
  quarter into all of Indonesia?
- Are sales and prices being distinguished correctly?

2. EDUCATIONAL TOPIC
- Is it materially different from recent Tetamo/Rupert
  content?
- Are the claimed mistakes/problems genuinely supported?
- Remove unsupported conversion/sales promises.

3. EVERGREEN TOPIC
- Does it rely on any changing legal, regulatory,
  political, governmental or administrative-status claim?
- If yes, verify it with a current official Indonesian
  primary source.
- If that cannot be verified, REFRAME the topic so the
  uncertain status is not part of the premise.

4. STALE INFORMATION
- Reject or correct any supposedly current claim whose
  supporting policy/date has already expired.
- A past policy may only be used as clearly historical
  context.

5. SOURCE QUALITY
- Current legal/regulatory/government-status claims require
  official sources.
- Broad national market claims require appropriate current
  primary data or strong cross-source support.
- A commercial article alone is not enough.

6. LANGUAGE
Avoid sensational or overconfident terms unless directly
supported by evidence.

If a candidate is weak:
REWRITE it into a safer, useful topic.

If the underlying premise is unsalvageable:
REPLACE it with another strong opportunity from the memo
or your verification research.

RECENT SUBJECTS TO AVOID REPEATING

${recent}

Return ONLY valid JSON:

{
  "summary": "Final verified weekly content direction",
  "verification_notes": "Concise explanation of important corrections or verification decisions",
  "topics": [
    {
      "slot": "timely",
      "title": "Verified working title",
      "research_topic": "Precise article-level research question",
      "rationale": "Evidence-based reason"
    },
    {
      "slot": "educational",
      "title": "Verified working title",
      "research_topic": "Precise article-level research question",
      "rationale": "Evidence-based reason"
    },
    {
      "slot": "evergreen",
      "title": "Verified working title",
      "research_topic": "Precise article-level research question",
      "rationale": "Evidence-based reason"
    }
  ]
}
`.trim(),
    });

  const verificationParsed =
    parseJson(
      verification.output_text
    );

  if (!verificationParsed) {
    throw new Error(
      "Rupert weekly verification was not valid JSON."
    );
  }

  const verified =
    parseTopicSet(
      verificationParsed,
      "Rupert weekly verification"
    );

  const verificationMemo =
    cleanString(
      verificationParsed
        .verification_notes
    ) ||
    "Weekly topics passed Rupert's live-web verification gate.";

  /*
   * PHASE 4
   *
   * Final editorial compliance gate.
   *
   * This deliberately runs AFTER factual verification.
   * Rupert must check freshness one last time and remove
   * unsupported public-facing claims before tasks exist.
   */
  const editorial =
    await openai.responses.create({
      model:
        MODEL,

      text: {
        format: {
          type:
            "json_schema",

          name:
            "rupert_weekly_editorial",

          strict:
            true,

          schema:
            WEEKLY_EDITORIAL_SCHEMA,
        },
      },

      tools: [
        {
          type:
            "web_search",
        },
      ],

      tool_choice:
        "required",

      include: [
        "web_search_call.action.sources",
      ],

      input: `
You are Rupert's FINAL EDITORIAL QUALITY GATE for Tetamo.

CURRENT RUN TIME
${nowIso}

WEEK
${weekKey}

These topics already passed an earlier research and
verification stage:

${JSON.stringify(
  verified.topics,
  null,
  2
)}

Do one final LIVE-WEB freshness and wording check.

THIS CHECK IS STRICT.

AUTONOMOUS WEEKLY CONTENT LANE

These three topics will become autonomous weekly Tetamo
production tasks.

Therefore DO NOT select a topic whose core premise requires
Rupert to interpret or explain:

- constitutional-court decisions
- current capital-city legal status
- presidential decrees
- laws or regulatory requirements
- tax rules
- immigration or visa rules
- zoning rules
- land-title / certificate law
- property-ownership law
- current government incentives
- LTV / FTV eligibility or other financing regulations

Those subjects may be valuable, but they belong in a
separate HUMAN-REVIEWED research opportunity and must not
occupy one of the automatic three weekly production slots.

For autonomous weekly production, prefer lower-risk useful
subjects such as:

- current property-market data described factually
- owner and agent listing practices
- property-search guidance
- viewing checklists
- location evaluation
- property photography / presentation
- agent workflows
- owner communication
- renter / buyer preparation
- property technology
- maintenance and property readiness
- practical marketplace education

Do not promise a commercial outcome such as faster sales,
more enquiries, better conversion or higher returns.

TIMELY DATA

If the timely topic concerns Indonesia's residential
property market, sales or prices:

- Search for the latest available Bank Indonesia
  Residential Property Price Survey.
- Confirm the newest published quarter before finalizing.
- Never present an older quarter as the latest/current
  situation when a newer official release exists.
- An older quarter can be used for comparison, but the
  title must make that context clear.
- Distinguish sales contraction from price movement.
- Do not generalize primary-market survey findings to the
  entire Indonesian property market without qualification.

PUBLIC-FACING CLAIMS

Do not use unsupported or unnecessarily sensational
headline language including:

- downturn
- crash
- collapse
- crisis
- boom
- surge
- dominant
- definitive
- guaranteed
- best
- safest
- matters most
- faster sales
- sell faster

unless an exact claim is genuinely necessary and strongly
supported. Prefer neutral factual wording.

Do NOT promise:

- faster sales
- guaranteed enquiries
- guaranteed buyers
- better conversion
- investment returns
- appreciation

unless reliable evidence actually establishes the claim.

For educational articles, describe the practical benefit
without promising a commercial result.

Examples:

BAD:
"Listing Mistakes and How to Avoid Them for Faster Sales"

BETTER:
"Common Property Listing Mistakes and How to Avoid Them"

BAD:
"Why Location Still Matters Most"

BETTER:
"How to Evaluate Location When Buying Property in Indonesia"

BAD:
"Understanding Q1 Data"
when Q2 official data is already available.

BETTER:
"What the Latest Residential Property Data Shows"

LEGAL / GOVERNMENT CLAIMS

Any changing legal, tax, regulatory, ownership, zoning,
permit, immigration, administrative-status or government
claim still requires a current official Indonesian source.

If uncertain, remove the claim from the article premise.

Do not invent search demand, statistics, rankings,
market direction or user behavior.

Rewrite any topic that fails these rules.

Return ONLY valid JSON:

{
  "summary": "Final editorial direction",
  "editorial_notes": "What was corrected or confirmed",
  "topics": [
    {
      "slot": "timely",
      "title": "Final working title",
      "research_topic": "Precise research question",
      "rationale": "Evidence-based reason"
    },
    {
      "slot": "educational",
      "title": "Final working title",
      "research_topic": "Precise research question",
      "rationale": "Evidence-based reason"
    },
    {
      "slot": "evergreen",
      "title": "Final working title",
      "research_topic": "Precise research question",
      "rationale": "Evidence-based reason"
    }
  ]
}
`.trim(),
    });

  const editorialParsed =
    parseJson(
      editorial.output_text
    );

  if (!editorialParsed) {
    throw new Error(
      "Rupert final editorial gate returned invalid JSON."
    );
  }

  const finalPlan =
    parseTopicSet(
      editorialParsed,
      "Rupert final editorial gate"
    );

  /*
   * Deterministic fail-closed guard.
   *
   * The model gets one chance to repair risky wording.
   * If it still leaks into a title, NO weekly plan is
   * accepted.
   */
  const titleRisks =
    findEditorialTitleRisks(
      finalPlan.topics
    );

  if (
    titleRisks.length
  ) {
    throw new Error(
      "Rupert final editorial gate rejected the weekly plan: " +
      titleRisks.join("; ")
    );
  }

  const editorialNotes =
    cleanString(
      editorialParsed
        .editorial_notes
    ) ||
    "Final editorial quality gate passed.";

  /*
   * Autonomous production is deliberately narrower than
   * Rupert's overall research capability.
   *
   * High-stakes legal/regulatory/current-government topics
   * may still be researched separately, but they cannot
   * silently enter the automatic 3-blog weekly queue.
   */
  const autonomousRisks =
    findAutonomousTopicRisks(
      finalPlan.topics
    );

  if (
    autonomousRisks.length
  ) {
    throw new Error(
      "Rupert autonomous weekly plan rejected: " +
      autonomousRisks.join("; ")
    );
  }

  return {
    summary:
      finalPlan.summary ||
      verified.summary ||
      candidate.summary ||
      "Three-topic verified weekly Tetamo property content plan.",

    topics:
      finalPlan.topics,

    researchMemo,

    verificationMemo:
      [
        "Weekly research verification completed.",
        "",
        "FINAL APPROVED AUTONOMOUS TOPICS:",
        ...finalPlan.topics.map(
          (topic, index) =>
            `${index + 1}. ${topic.slot.toUpperCase()}: ${topic.title}`
        ),
        "",
        "All three topics passed the autonomous-safe editorial gate.",
        "No blog, image or publication action is authorized by this planning result.",
      ].join("\n"),

    responseId:
      research.id ||
      null,

    /*
     * Store the final gate response because this is the
     * version that authorized the task topics.
     */
    verificationResponseId:
      editorial.id ||
      verification.id ||
      null,
  };
}
