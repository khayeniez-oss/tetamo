import "server-only";

import OpenAI from "openai";

import {
  aiTeamSupabaseAdmin,
} from "@/lib/ai-team/core/admin-auth";

import {
  requireAgentPermission,
} from "@/lib/ai-team/permissions/agent-permissions";

const LOLA_INQUIRY_MODEL =
  "gpt-4.1-mini";

const EVALUATOR_SOURCE =
  "lola_inquiry_evaluator";

const openai =
  new OpenAI({
    apiKey:
      process.env.OPENAI_API_KEY,
  });

type LolaOutcome =
  | "watch"
  | "content_opportunity"
  | "escalate"
  | "dismiss";

type LolaPriority =
  | "low"
  | "normal"
  | "high";

export type LolaInquiryEvaluation = {
  outcome: LolaOutcome;
  priority: LolaPriority;
  recommendation: string;
  rationale: string;
  handoffSummary: string | null;
  recommendedContentTypes: string[];
  hypothesis: string | null;
  primaryKpi: string | null;
  evaluationPeriod: string | null;
};

type AgentRow = {
  id: string;
  agent_key: string;
  display_name: string;
  role_title: string;
  status: string;
  enabled: boolean;
};

type InsightRow = {
  id: string;
  agent_id: string;
  insight_type: string;
  title: string;
  summary: string;
  confidence: string;
  priority: string;
  evidence: unknown;
  related_entity_type: string | null;
  related_entity_id: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type ThemeRow = {
  id: string;
  theme_key: string;
  title: string;
  summary: string;
  signal_count: number;
  distinct_conversation_count: number;
  first_seen_at: string | null;
  last_seen_at: string | null;
  customer_types: unknown;
  representative_questions: unknown;
  content_score: number;
  growth_score: number;
  confidence: string;
  status: string;
};

type DecisionRow = {
  id: string;
  title: string;
  status: string;
  rationale: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type HandoffRow = {
  id: string;
  handoff_type: string;
  summary: string;
  status: string;
  context: Record<string, unknown> | null;
  created_at: string;
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
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as
      Record<string, unknown>;
  }

  return {};
}

function cleanStringArray(
  value: unknown,
  limit = 8
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(cleanString)
    .filter(Boolean)
    .slice(0, limit);
}

function isOperational(
  agent: AgentRow
) {
  return (
    agent.status === "active" &&
    agent.enabled === true
  );
}

async function loadAgent(
  agentKey: "lola" | "rupert"
) {
  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_agents")
      .select(
        "id, agent_key, display_name, role_title, status, enabled"
      )
      .eq(
        "agent_key",
        agentKey
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load ${agentKey} AI Team profile: ${error.message}`
    );
  }

  if (!data) {
    throw new Error(
      `${agentKey} is not configured in the AI Team.`
    );
  }

  return data as unknown as AgentRow;
}

async function loadInsight(
  insightId: string
) {
  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_insights")
      .select(
        [
          "id",
          "agent_id",
          "insight_type",
          "title",
          "summary",
          "confidence",
          "priority",
          "evidence",
          "related_entity_type",
          "related_entity_id",
          "status",
          "metadata",
          "created_at",
        ].join(",")
      )
      .eq(
        "id",
        insightId
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load Lola inquiry insight: ${error.message}`
    );
  }

  if (!data) {
    throw new Error(
      "Lola inquiry insight was not found."
    );
  }

  return data as unknown as InsightRow;
}

async function loadTheme(
  themeId: string
) {
  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_inquiry_themes"
      )
      .select(
        [
          "id",
          "theme_key",
          "title",
          "summary",
          "signal_count",
          "distinct_conversation_count",
          "first_seen_at",
          "last_seen_at",
          "customer_types",
          "representative_questions",
          "content_score",
          "growth_score",
          "confidence",
          "status",
        ].join(",")
      )
      .eq(
        "id",
        themeId
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load inquiry theme for Lola: ${error.message}`
    );
  }

  if (!data) {
    throw new Error(
      "Inquiry theme for Lola was not found."
    );
  }

  return data as unknown as ThemeRow;
}

async function loadExistingDecision(
  params: {
    lolaId: string;
    insightId: string;
  }
) {
  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_decisions")
      .select(
        "id, title, status, rationale, metadata, created_at"
      )
      .eq(
        "proposed_by_agent_id",
        params.lolaId
      )
      .eq(
        "related_entity_type",
        "ai_insight"
      )
      .eq(
        "related_entity_id",
        params.insightId
      )
      .in(
        "status",
        [
          "proposed",
          "approved",
          "deferred",
        ]
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(10);

  if (error) {
    throw new Error(
      `Unable to check Lola inquiry decisions: ${error.message}`
    );
  }

  return (
    (data || []) as unknown as
      DecisionRow[]
  ).find(
    (row) =>
      asRecord(
        row.metadata
      ).source ===
      EVALUATOR_SOURCE
  ) ?? null;
}

async function loadExistingHandoff(
  params: {
    lolaId: string;
    rupertId: string;
    insightId: string;
  }
) {
  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_handoffs")
      .select(
        "id, handoff_type, summary, status, context, created_at"
      )
      .eq(
        "from_agent_id",
        params.lolaId
      )
      .eq(
        "to_agent_id",
        params.rupertId
      )
      .in(
        "status",
        [
          "pending",
          "accepted",
          "completed",
        ]
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(20);

  if (error) {
    throw new Error(
      `Unable to check Lola to Rupert handoffs: ${error.message}`
    );
  }

  return (
    (data || []) as unknown as
      HandoffRow[]
  ).find(
    (row) => {
      const context =
        asRecord(
          row.context
        );

      return (
        context.source ===
          EVALUATOR_SOURCE &&
        context.source_insight_id ===
          params.insightId
      );
    }
  ) ?? null;
}

function evaluationFromDecision(
  decision: DecisionRow
): LolaInquiryEvaluation | null {
  const metadata =
    asRecord(
      decision.metadata
    );

  const outcome =
    cleanString(
      metadata.outcome
    ) as LolaOutcome;

  if (
    ![
      "watch",
      "content_opportunity",
      "escalate",
      "dismiss",
    ].includes(
      outcome
    )
  ) {
    return null;
  }

  const priority =
    cleanString(
      metadata.priority
    ) as LolaPriority;

  return {
    outcome,

    priority:
      [
        "low",
        "normal",
        "high",
      ].includes(priority)
        ? priority
        : "normal",

    recommendation:
      cleanString(
        metadata.recommendation
      ),

    rationale:
      cleanString(
        decision.rationale
      ),

    handoffSummary:
      cleanString(
        metadata.handoff_summary
      ) || null,

    recommendedContentTypes:
      cleanStringArray(
        metadata
          .recommended_content_types,
        4
      ),

    hypothesis:
      cleanString(
        metadata.hypothesis
      ) || null,

    primaryKpi:
      cleanString(
        metadata.primary_kpi
      ) || null,

    evaluationPeriod:
      cleanString(
        metadata.evaluation_period
      ) || null,
  };
}

function validateEvidenceSemantics(
  params: {
    theme: ThemeRow;
    evaluation:
      LolaInquiryEvaluation;
  }
) {
  if (
    params.theme.theme_key !==
    "payment_timing_after_sale"
  ) {
    return;
  }

  const combined =
    [
      params.evaluation
        .recommendation,
      params.evaluation
        .rationale,
      params.evaluation
        .handoffSummary ?? "",
      params.evaluation
        .hypothesis ?? "",
    ]
      .join(" ")
      .toLowerCase();

  /*
   * The current source-grounded theme establishes only
   * payment timing after a sale.
   *
   * It does NOT establish payer, recipient, seller role,
   * owner role, commission direction or settlement flow.
   */
  const unsupportedDirectionalClaims = [
    /\breceiv(?:e|es|ed|ing)\s+(?:the\s+)?(?:payment|money|funds)\b/,
    /\b(?:seller|owner|customer)\s+(?:gets?|got|get|receives?|received|receiving)\s+(?:paid|payment|money|funds)\b/,
    /\bpayment\s+(?:to|for)\s+(?:the\s+)?(?:seller|owner|customer)\b/,
    /\bpaid\s+(?:to|out\s+to)\s+(?:the\s+)?(?:seller|owner|customer)\b/,
    /\bwhen\s+(?:the\s+)?(?:seller|owner|customer)\s+(?:gets?|receives?)\b/,
  ];

  if (
    unsupportedDirectionalClaims.some(
      (pattern) =>
        pattern.test(
          combined
        )
    )
  ) {
    throw new Error(
      "Lola inquiry evaluation introduced unsupported payment-direction semantics."
    );
  }
}

async function generateEvaluation(
  params: {
    insight: InsightRow;
    theme: ThemeRow;
  }
): Promise<LolaInquiryEvaluation> {
  if (
    !process.env
      .OPENAI_API_KEY
  ) {
    throw new Error(
      "OPENAI_API_KEY is required for Lola inquiry evaluation."
    );
  }

  const evidence = {
    insight: {
      title:
        params.insight.title,

      summary:
        params.insight.summary,

      confidence:
        params.insight.confidence,

      priority:
        params.insight.priority,
    },

    recurringTheme: {
      key:
        params.theme.theme_key,

      title:
        params.theme.title,

      summary:
        params.theme.summary,

      signalCount:
        params.theme.signal_count,

      distinctConversations:
        params.theme
          .distinct_conversation_count,

      firstSeenAt:
        params.theme.first_seen_at,

      lastSeenAt:
        params.theme.last_seen_at,

      customerTypes:
        params.theme.customer_types,

      representativeQuestions:
        cleanStringArray(
          params.theme
            .representative_questions,
          6
        ),

      contentScore:
        params.theme.content_score,

      growthScore:
        params.theme.growth_score,

      confidence:
        params.theme.confidence,

      status:
        params.theme.status,
    },
  };

  const prompt = `
You are Lola, Tetamo's internal AI Growth Strategist.

This is an operational evaluation of an internal customer-intelligence insight.
It is NOT a customer conversation and NOT a Meeting Room performance.

Your existing role remains the same:
- grow Tetamo's subscription business;
- distinguish evidence from hypothesis;
- challenge unsupported assumptions;
- identify useful growth and content opportunities;
- prefer small, measurable experiments;
- do not invent causes, conversion results, revenue or customer sentiment;
- do not publish content;
- do not contact customers;
- do not spend money;
- do not change pricing;
- do not modify systems.

The evidence below is already sanitized and aggregated.
Do not request or infer customer identity.
Do not invent facts beyond it.

SEMANTIC PRESERVATION RULES
- Preserve who-does-what-to-whom exactly as supported by the evidence.
- If payer, recipient, customer role, transaction direction or fee type is not established, keep the wording neutral.
- Do NOT convert "payment timing after a property is sold" into "when the seller receives payment", "when the owner gets paid", "when customers receive money", or similar directional claims unless the evidence explicitly establishes that relationship.
- Ambiguity is evidence too. State that the payment direction is unspecified rather than filling the gap yourself.

Choose exactly one outcome:

watch
Use when the recurring signal may matter but evidence is not yet strong enough to act.

content_opportunity
Use when this recurring customer question/problem is sufficiently clear and useful for Rupert, Tetamo's Content & SEO Manager, to evaluate for FAQ, educational, social, landing-page or blog content.

escalate
Use when Founder or executive judgment is needed before further action.

dismiss
Use when the signal is clearly noise, irrelevant, or not useful enough to pursue.

A content opportunity does NOT mean a blog must be created.
Lola only hands the opportunity to Rupert.
Rupert decides the appropriate content treatment.

If you state a possible cause, frame it as a hypothesis.
Keep the rationale concise and decision-focused.
Do not expose chain-of-thought.

SANITIZED EVIDENCE:
${JSON.stringify(
  evidence,
  null,
  2
)}
`.trim();

  const response =
    await openai.responses.create({
      model:
        LOLA_INQUIRY_MODEL,

      input:
        prompt,

      max_output_tokens:
        900,

      text: {
        format: {
          type:
            "json_schema",

          name:
            "lola_inquiry_evaluation",

          strict:
            true,

          schema: {
            type:
              "object",

            additionalProperties:
              false,

            properties: {
              outcome: {
                type:
                  "string",

                enum: [
                  "watch",
                  "content_opportunity",
                  "escalate",
                  "dismiss",
                ],
              },

              priority: {
                type:
                  "string",

                enum: [
                  "low",
                  "normal",
                  "high",
                ],
              },

              recommendation: {
                type:
                  "string",
              },

              rationale: {
                type:
                  "string",
              },

              handoffSummary: {
                type: [
                  "string",
                  "null",
                ],
              },

              recommendedContentTypes: {
                type:
                  "array",

                maxItems:
                  4,

                items: {
                  type:
                    "string",

                  enum: [
                    "faq",
                    "education",
                    "social",
                    "blog",
                    "landing_page",
                  ],
                },
              },

              hypothesis: {
                type: [
                  "string",
                  "null",
                ],
              },

              primaryKpi: {
                type: [
                  "string",
                  "null",
                ],
              },

              evaluationPeriod: {
                type: [
                  "string",
                  "null",
                ],
              },
            },

            required: [
              "outcome",
              "priority",
              "recommendation",
              "rationale",
              "handoffSummary",
              "recommendedContentTypes",
              "hypothesis",
              "primaryKpi",
              "evaluationPeriod",
            ],
          },
        },
      },
    });

  const raw =
    response.output_text
      .trim();

  if (!raw) {
    throw new Error(
      "Lola returned an empty inquiry evaluation."
    );
  }

  const parsed =
    JSON.parse(
      raw
    ) as LolaInquiryEvaluation;

  if (
    ![
      "watch",
      "content_opportunity",
      "escalate",
      "dismiss",
    ].includes(
      parsed.outcome
    )
  ) {
    throw new Error(
      "Lola returned an invalid inquiry outcome."
    );
  }

  if (
    ![
      "low",
      "normal",
      "high",
    ].includes(
      parsed.priority
    )
  ) {
    throw new Error(
      "Lola returned an invalid inquiry priority."
    );
  }

  parsed.recommendation =
    cleanString(
      parsed.recommendation
    ).slice(
      0,
      1200
    );

  parsed.rationale =
    cleanString(
      parsed.rationale
    ).slice(
      0,
      1200
    );

  parsed.handoffSummary =
    cleanString(
      parsed.handoffSummary
    ).slice(
      0,
      1000
    ) || null;

  parsed.recommendedContentTypes =
    cleanStringArray(
      parsed.recommendedContentTypes,
      4
    );

  parsed.hypothesis =
    cleanString(
      parsed.hypothesis
    ).slice(
      0,
      800
    ) || null;

  parsed.primaryKpi =
    cleanString(
      parsed.primaryKpi
    ).slice(
      0,
      400
    ) || null;

  parsed.evaluationPeriod =
    cleanString(
      parsed.evaluationPeriod
    ).slice(
      0,
      300
    ) || null;

  if (
    !parsed.recommendation ||
    !parsed.rationale
  ) {
    throw new Error(
      "Lola inquiry evaluation is incomplete."
    );
  }

  if (
    parsed.outcome ===
      "content_opportunity" &&
    !parsed.handoffSummary
  ) {
    parsed.handoffSummary =
      parsed.recommendation;
  }

  validateEvidenceSemantics({
    theme:
      params.theme,

    evaluation:
      parsed,
  });

  return parsed;
}

async function ensureActivity(
  params: {
    agentId: string;
    actorUserId:
      | string
      | null;

    eventType: string;
    action: string;
    entityType: string;
    entityId: string;
    details:
      Record<string, unknown>;
  }
) {
  const {
    data: existing,
    error: lookupError,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_activity")
      .select("id")
      .eq(
        "event_type",
        params.eventType
      )
      .eq(
        "action",
        params.action
      )
      .eq(
        "entity_type",
        params.entityType
      )
      .eq(
        "entity_id",
        params.entityId
      )
      .limit(1);

  if (lookupError) {
    throw new Error(
      `Unable to check Lola activity audit: ${lookupError.message}`
    );
  }

  if (
    existing &&
    existing.length > 0
  ) {
    return;
  }

  const {
    error,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_activity")
      .insert({
        agent_id:
          params.agentId,

        actor_user_id:
          params.actorUserId,

        event_type:
          params.eventType,

        action:
          params.action,

        entity_type:
          params.entityType,

        entity_id:
          params.entityId,

        severity:
          "info",

        details:
          params.details,
      });

  if (error) {
    throw new Error(
      `Unable to store Lola activity audit: ${error.message}`
    );
  }
}

async function createDecision(
  params: {
    lola: AgentRow;
    insight: InsightRow;
    theme: ThemeRow;
    evaluation:
      LolaInquiryEvaluation;
  }
) {
  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_decisions")
      .insert({
        title:
          `Lola recommendation: ${params.insight.title}`,

        description:
          params.evaluation
            .recommendation,

        proposed_by_agent_id:
          params.lola.id,

        decision_maker_agent_id:
          null,

        decision_maker_user_id:
          null,

        status:
          "proposed",

        rationale:
          params.evaluation
            .rationale,

        related_entity_type:
          "ai_insight",

        related_entity_id:
          params.insight.id,

        decided_at:
          null,

        metadata: {
          source:
            EVALUATOR_SOURCE,

          source_insight_id:
            params.insight.id,

          source_theme_id:
            params.theme.id,

          source_theme_key:
            params.theme.theme_key,

          outcome:
            params.evaluation
              .outcome,

          priority:
            params.evaluation
              .priority,

          recommendation:
            params.evaluation
              .recommendation,

          handoff_summary:
            params.evaluation
              .handoffSummary,

          recommended_content_types:
            params.evaluation
              .recommendedContentTypes,

          hypothesis:
            params.evaluation
              .hypothesis,

          primary_kpi:
            params.evaluation
              .primaryKpi,

          evaluation_period:
            params.evaluation
              .evaluationPeriod,

          model:
            LOLA_INQUIRY_MODEL,
        },
      })
      .select(
        "id, title, status, rationale, metadata, created_at"
      )
      .single();

  if (
    error?.code ===
    "23505"
  ) {
    return loadExistingDecision({
      lolaId:
        params.lola.id,

      insightId:
        params.insight.id,
    });
  }

  if (
    error ||
    !data
  ) {
    throw new Error(
      `Unable to store Lola inquiry decision: ${
        error?.message ??
        "unknown database error"
      }`
    );
  }

  return data as unknown as DecisionRow;
}

async function ensureRupertHandoff(
  params: {
    lola: AgentRow;
    rupert: AgentRow;
    insight: InsightRow;
    theme: ThemeRow;
    decision: DecisionRow;
    evaluation:
      LolaInquiryEvaluation;
    actorUserId:
      | string
      | null;
  }
) {
  const existing =
    await loadExistingHandoff({
      lolaId:
        params.lola.id,

      rupertId:
        params.rupert.id,

      insightId:
        params.insight.id,
    });

  if (existing) {
    return existing;
  }

  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_handoffs")
      .insert({
        from_agent_id:
          params.lola.id,

        to_agent_id:
          params.rupert.id,

        task_id:
          null,

        handoff_type:
          "content_opportunity",

        summary:
          params.evaluation
            .handoffSummary ??
          params.evaluation
            .recommendation,

        context: {
          source:
            EVALUATOR_SOURCE,

          source_insight_id:
            params.insight.id,

          source_decision_id:
            params.decision.id,

          source_theme_id:
            params.theme.id,

          source_theme_key:
            params.theme.theme_key,

          priority:
            params.evaluation
              .priority,

          recommendation:
            params.evaluation
              .recommendation,

          recommended_content_types:
            params.evaluation
              .recommendedContentTypes,

          hypothesis:
            params.evaluation
              .hypothesis,

          primary_kpi:
            params.evaluation
              .primaryKpi,

          evaluation_period:
            params.evaluation
              .evaluationPeriod,
        },

        status:
          "pending",
      })
      .select(
        "id, handoff_type, summary, status, context, created_at"
      )
      .single();

  if (
    error?.code ===
    "23505"
  ) {
    const winner =
      await loadExistingHandoff({
        lolaId:
          params.lola.id,

        rupertId:
          params.rupert.id,

        insightId:
          params.insight.id,
      });

    if (!winner) {
      throw new Error(
        "Lola to Rupert handoff race occurred but the winning handoff could not be loaded."
      );
    }

    return winner;
  }

  if (
    error ||
    !data
  ) {
    throw new Error(
      `Unable to create Lola to Rupert handoff: ${
        error?.message ??
        "unknown database error"
      }`
    );
  }

  const handoff =
    data as unknown as
      HandoffRow;

  await ensureActivity({
    agentId:
      params.lola.id,

    actorUserId:
      params.actorUserId,

    eventType:
      "agent_handoff",

    action:
      "created_rupert_content_handoff",

    entityType:
      "ai_handoff",

    entityId:
      handoff.id,

    details: {
      source:
        EVALUATOR_SOURCE,

      insight_id:
        params.insight.id,

      decision_id:
        params.decision.id,

      theme_id:
        params.theme.id,

      to_agent_key:
        "rupert",
    },
  });

  return handoff;
}

async function updateInsightAfterEvaluation(
  params: {
    insight: InsightRow;
    decision: DecisionRow;
    evaluation:
      LolaInquiryEvaluation;
    handoff:
      HandoffRow | null;
  }
) {
  const previousMetadata =
    asRecord(
      params.insight.metadata
    );

  const evaluationState =
    params.handoff
      ? "rupert_handoff_pending"
      : params.evaluation
            .outcome ===
          "escalate"
        ? "awaiting_founder_review"
        : params.evaluation
              .outcome ===
            "watch"
          ? "lola_watch"
          : params.evaluation
                .outcome ===
              "dismiss"
            ? "lola_recommends_dismissal"
            : "lola_evaluated";

  const status =
    params.handoff
      ? "actioned"
      : "reviewing";

  const {
    error,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_insights")
      .update({
        status,

        priority:
          params.evaluation
            .priority,

        metadata: {
          ...previousMetadata,

          evaluation_state:
            evaluationState,

          lola_execution_performed:
            true,

          lola_outcome:
            params.evaluation
              .outcome,

          lola_decision_id:
            params.decision.id,

          lola_evaluated_at:
            new Date()
              .toISOString(),

          lola_model:
            LOLA_INQUIRY_MODEL,

          rupert_handoff_created:
            Boolean(
              params.handoff
            ),

          rupert_handoff_id:
            params.handoff
              ?.id ??
            null,
        },
      })
      .eq(
        "id",
        params.insight.id
      );

  if (error) {
    throw new Error(
      `Unable to update Lola inquiry insight: ${error.message}`
    );
  }
}

export async function evaluateInquiryInsightWithLola(
  params: {
    insightId: string;
    actorUserId?:
      | string
      | null;
  }
) {
  requireAgentPermission(
    "lola",
    "read_ai_team_data"
  );

  requireAgentPermission(
    "lola",
    "propose_decision"
  );

  requireAgentPermission(
    "lola",
    "create_handoff"
  );

  const lola =
    await loadAgent(
      "lola"
    );

  /*
   * Operational execution is stricter than merely
   * allowing Lola to own an insight.
   *
   * No model call and no write occurs while Lola is
   * inactive, paused, under maintenance, or disabled.
   */
  if (
    !isOperational(
      lola
    )
  ) {
    return {
      action:
        "skipped_lola_inactive" as const,

      writesPerformed:
        false,

      lola: {
        status:
          lola.status,

        enabled:
          lola.enabled,
      },
    };
  }

  const insight =
    await loadInsight(
      params.insightId
    );

  if (
    insight.agent_id !==
    lola.id
  ) {
    throw new Error(
      "This inquiry insight is not owned by Lola."
    );
  }

  if (
    insight
      .related_entity_type !==
      "ai_inquiry_theme" ||
    !insight
      .related_entity_id
  ) {
    throw new Error(
      "This insight is not linked to an inquiry theme."
    );
  }

  const insightMetadata =
    asRecord(
      insight.metadata
    );

  if (
    insightMetadata.source !==
    "mona_meta_content_intelligence"
  ) {
    throw new Error(
      "This insight is not an Inquiry Intelligence insight."
    );
  }

  const theme =
    await loadTheme(
      insight
        .related_entity_id
    );

  if (
    theme.status !==
    "qualified"
  ) {
    throw new Error(
      "Lola may only evaluate qualified inquiry themes."
    );
  }

  let decision =
    await loadExistingDecision({
      lolaId:
        lola.id,

      insightId:
        insight.id,
    });

  let evaluation:
    LolaInquiryEvaluation;

  let reusedDecision =
    false;

  if (decision) {
    const recovered =
      evaluationFromDecision(
        decision
      );

    if (!recovered) {
      throw new Error(
        "Existing Lola inquiry decision is missing reusable evaluation metadata."
      );
    }

    evaluation =
      recovered;

    reusedDecision =
      true;
  } else {
    evaluation =
      await generateEvaluation({
        insight,
        theme,
      });

    /*
     * A content handoff must never be sent to an
     * inactive/disabled Rupert.
     *
     * Check this BEFORE storing Lola's decision so a
     * blocked downstream agent does not leave a partial
     * first-run evaluation.
     */
    if (
      evaluation.outcome ===
      "content_opportunity"
    ) {
      const rupert =
        await loadAgent(
          "rupert"
        );

      if (
        !isOperational(
          rupert
        )
      ) {
        throw new Error(
          "Rupert is not active and enabled; Lola content handoff was not created."
        );
      }
    }

    decision =
      await createDecision({
        lola,
        insight,
        theme,
        evaluation,
      });

    if (!decision) {
      throw new Error(
        "Lola inquiry decision could not be resolved."
      );
    }
  }

  await ensureActivity({
    agentId:
      lola.id,

    actorUserId:
      params
        .actorUserId ??
      null,

    eventType:
      "lola_inquiry_evaluation",

    action:
      "evaluated_inquiry_insight",

    entityType:
      "ai_decision",

    entityId:
      decision.id,

    details: {
      source:
        EVALUATOR_SOURCE,

      insight_id:
        insight.id,

      theme_id:
        theme.id,

      outcome:
        evaluation.outcome,

      reused_decision:
        reusedDecision,
    },
  });

  let handoff:
    HandoffRow | null =
      null;

  if (
    evaluation.outcome ===
    "content_opportunity"
  ) {
    const rupert =
      await loadAgent(
        "rupert"
      );

    if (
      !isOperational(
        rupert
      )
    ) {
      throw new Error(
        "Rupert is not active and enabled; pending Lola evaluation cannot be handed off."
      );
    }

    handoff =
      await ensureRupertHandoff({
        lola,
        rupert,
        insight,
        theme,
        decision,
        evaluation,

        actorUserId:
          params
            .actorUserId ??
          null,
      });
  }

  await updateInsightAfterEvaluation({
    insight,
    decision,
    evaluation,
    handoff,
  });

  return {
    action:
      reusedDecision
        ? "reused_lola_evaluation"
        : "created_lola_evaluation",

    writesPerformed:
      true,

    insightId:
      insight.id,

    themeId:
      theme.id,

    decision: {
      id:
        decision.id,

      status:
        decision.status,
    },

    evaluation,

    handoff:
      handoff
        ? {
            id:
              handoff.id,

            status:
              handoff.status,

            toAgentKey:
              "rupert",
          }
        : null,
  };
}
