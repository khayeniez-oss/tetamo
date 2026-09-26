import "server-only";

import OpenAI from "openai";

import {
  aiTeamSupabaseAdmin,
} from "@/lib/ai-team/core/admin-auth";

import {
  requireAgentPermission,
} from "@/lib/ai-team/permissions/agent-permissions";


const RUPERT_HANDOFF_MODEL =
  "gpt-4.1-mini";

const INTAKE_SOURCE =
  "rupert_handoff_intake";

const TASK_SOURCE_TYPE =
  "rupert_lola_handoff";


type RupertIntakeOutcome =
  | "accept_for_content"
  | "needs_research"
  | "defer"
  | "decline";


type RecommendedContentType =
  | "faq"
  | "education"
  | "social"
  | "landing_page"
  | "blog"
  | "other";


export type RupertHandoffEvaluation = {
  outcome:
    RupertIntakeOutcome;

  rationale:
    string;

  taskTitle:
    string | null;

  taskDescription:
    string | null;

  researchQuestion:
    string | null;

  recommendedContentType:
    RecommendedContentType | null;

  intakeNote:
    string;
};


type AgentRow = {
  id:
    string;

  agent_key:
    string;

  display_name:
    string;

  role_title:
    string;

  status:
    string;

  enabled:
    boolean;
};


type HandoffRow = {
  id:
    string;

  from_agent_id:
    string;

  to_agent_id:
    string;

  task_id:
    string | null;

  handoff_type:
    string;

  summary:
    string;

  context:
    Record<string, unknown> | null;

  status:
    string;

  accepted_at:
    string | null;

  completed_at:
    string | null;

  created_at:
    string;
};


type InsightRow = {
  id:
    string;

  agent_id:
    string;

  insight_type:
    string;

  title:
    string;

  summary:
    string;

  confidence:
    string;

  priority:
    string;

  related_entity_type:
    string | null;

  related_entity_id:
    string | null;

  status:
    string;

  metadata:
    Record<string, unknown> | null;
};


type TaskRow = {
  id:
    string;

  title:
    string;

  description:
    string | null;

  status:
    string;

  source_type:
    string | null;

  source_id:
    string | null;

  assigned_to_agent_id:
    string | null;

  requested_by_agent_id:
    string | null;

  metadata:
    Record<string, unknown> | null;
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
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value
    )
  ) {
    return {};
  }

  return value as
    Record<string, unknown>;
}


function cleanStringArray(
  value: unknown,
  maxItems = 8
) {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return value
    .map(
      (item) =>
        cleanString(
          item
        )
    )
    .filter(
      Boolean
    )
    .slice(
      0,
      maxItems
    );
}


async function getAgent(
  agentKey: string
): Promise<AgentRow> {
  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_agents"
      )
      .select(
        "id, agent_key, display_name, role_title, status, enabled"
      )
      .eq(
        "agent_key",
        agentKey
      )
      .limit(1)
      .maybeSingle();

  if (
    error ||
    !data
  ) {
    throw (
      error ??
      new Error(
        `AI agent not found: ${agentKey}`
      )
    );
  }

  return data as
    AgentRow;
}


async function getHandoff(
  handoffId: string
): Promise<HandoffRow> {
  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_handoffs"
      )
      .select(
        "id, from_agent_id, to_agent_id, task_id, handoff_type, summary, context, status, accepted_at, completed_at, created_at"
      )
      .eq(
        "id",
        handoffId
      )
      .limit(1)
      .maybeSingle();

  if (
    error ||
    !data
  ) {
    throw (
      error ??
      new Error(
        "AI handoff was not found."
      )
    );
  }

  return data as
    HandoffRow;
}


async function getInsight(
  insightId: string
): Promise<InsightRow> {
  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_insights"
      )
      .select(
        "id, agent_id, insight_type, title, summary, confidence, priority, related_entity_type, related_entity_id, status, metadata"
      )
      .eq(
        "id",
        insightId
      )
      .limit(1)
      .maybeSingle();

  if (
    error ||
    !data
  ) {
    throw (
      error ??
      new Error(
        "Source insight was not found."
      )
    );
  }

  return data as
    InsightRow;
}


async function findExistingTask(
  handoffId: string
): Promise<TaskRow | null> {
  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_tasks"
      )
      .select(
        "id, title, description, status, source_type, source_id, assigned_to_agent_id, requested_by_agent_id, metadata"
      )
      .eq(
        "source_type",
        TASK_SOURCE_TYPE
      )
      .eq(
        "source_id",
        handoffId
      )
      .in(
        "status",
        [
          "pending",
          "in_progress",
          "blocked",
          "awaiting_approval",
          "completed",
        ]
      )
      .limit(1)
      .maybeSingle();

  if (error) {
    throw error;
  }

  return (
    data as
      TaskRow | null
  );
}


async function ensureActivity({
  agentId,
  action,
  entityType,
  entityId,
  details,
  idempotencyKey,
}: {
  agentId:
    string;

  action:
    string;

  entityType:
    string;

  entityId:
    string;

  details:
    Record<string, unknown>;

  idempotencyKey?:
    string;
}) {
  let lookup =
    aiTeamSupabaseAdmin
      .from(
        "ai_activity"
      )
      .select(
        "id"
      )
      .eq(
        "agent_id",
        agentId
      )
      .eq(
        "action",
        action
      )
      .eq(
        "entity_type",
        entityType
      )
      .eq(
        "entity_id",
        entityId
      );

  if (idempotencyKey) {
    lookup =
      lookup.eq(
        "details->>evaluation_key",
        idempotencyKey
      );
  }

  const {
    data:
      existing,
    error:
      lookupError,
  } =
    await lookup
      .limit(1)
      .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  if (existing) {
    return;
  }

  const activityDetails =
    idempotencyKey
      ? {
          ...details,

          evaluation_key:
            idempotencyKey,
        }
      : details;

  const {
    error:
      insertError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_activity"
      )
      .insert({
        agent_id:
          agentId,

        actor_user_id:
          null,

        event_type:
          "agent_handoff",

        action,

        entity_type:
          entityType,

        entity_id:
          entityId,

        severity:
          "info",

        details:
          activityDetails,
      });

  if (
    insertError?.code ===
      "23505" &&
    idempotencyKey
  ) {
    return;
  }

  if (insertError) {
    throw insertError;
  }
}


function validateEvidenceSemantics({
  sourceThemeKey,
  evaluation,
}: {
  sourceThemeKey:
    string;

  evaluation:
    RupertHandoffEvaluation;
}) {
  if (
    sourceThemeKey !==
    "payment_timing_after_sale"
  ) {
    return;
  }

  const combined =
    [
      evaluation.rationale,
      evaluation.taskTitle ??
        "",
      evaluation.taskDescription ??
        "",
      evaluation.researchQuestion ??
        "",
      evaluation.intakeNote,
    ]
      .join(" ")
      .toLowerCase();

  /*
   * The source evidence establishes only:
   *
   * "payment timing after a property is sold"
   *
   * It does NOT establish:
   * - payer
   * - recipient
   * - seller/owner role
   * - Tetamo fee
   * - commission
   * - settlement direction
   */
  const unsupportedDirectionalClaims = [
    /\breceiv(?:e|es|ed|ing)\s+(?:the\s+)?(?:payment|money|funds)\b/,
    /\b(?:seller|owner|customer)\s+(?:gets?|got|get|receives?|received|receiving)\s+(?:paid|payment|money|funds)\b/,
    /\bpayment\s+(?:to|for)\s+(?:the\s+)?(?:seller|owner|customer)\b/,
    /\bpaid\s+(?:to|out\s+to)\s+(?:the\s+)?(?:seller|owner|customer)\b/,
    /\bwhen\s+(?:the\s+)?(?:seller|owner|customer)\s+(?:gets?|receives?)\b/,
  ];

  if (
    unsupportedDirectionalClaims
      .some(
        (pattern) =>
          pattern.test(
            combined
          )
      )
  ) {
    throw new Error(
      "Rupert handoff intake introduced unsupported payment-direction semantics."
    );
  }
}


async function generateEvaluation({
  handoff,
  insight,
}: {
  handoff:
    HandoffRow;

  insight:
    InsightRow;
}): Promise<RupertHandoffEvaluation> {
  if (
    !process.env
      .OPENAI_API_KEY
  ) {
    throw new Error(
      "OPENAI_API_KEY is required for Rupert handoff intake."
    );
  }

  const context =
    asRecord(
      handoff.context
    );

  const evidence = {
    handoff: {
      type:
        handoff
          .handoff_type,

      summary:
        handoff.summary,

      recommendation:
        cleanString(
          context
            .recommendation
        ),

      rationale:
        cleanString(
          context
            .rationale
        ),

      hypothesis:
        cleanString(
          context
            .hypothesis
        ),

      primaryKpi:
        cleanString(
          context
            .primary_kpi
        ),

      evaluationPeriod:
        cleanString(
          context
            .evaluation_period
        ),

      recommendedContentTypes:
        cleanStringArray(
          context
            .recommended_content_types
        ),

      sourceThemeKey:
        cleanString(
          context
            .source_theme_key
        ),
    },

    insight: {
      title:
        insight.title,

      summary:
        insight.summary,

      confidence:
        insight.confidence,

      priority:
        insight.priority,

      status:
        insight.status,
    },
  };

  const prompt = `
You are Rupert, Tetamo's internal AI Content & SEO Manager.

Lola, Tetamo's AI Growth Strategist, has handed you ONE
sanitized recurring customer-inquiry opportunity.

This is an INTERNAL intake evaluation.

You are not doing your weekly three-topic planning.
You are deciding whether this specific handoff should enter
your existing content research and drafting workflow.

YOUR ROLE
- evaluate useful Tetamo content opportunities;
- research before making factual claims;
- choose the right content treatment;
- preserve evidence boundaries;
- create internal work only when justified;
- never publish automatically;
- never contact customers;
- never spend money;
- never change pricing;
- never modify production systems.

SEMANTIC PRESERVATION
- Preserve who-does-what-to-whom exactly as supported.
- Do not infer payer, recipient, customer role, fee type,
  commission direction, settlement direction or transaction
  direction when the evidence does not establish it.
- Ambiguity is evidence.
- If an important distinction is missing, use
  needs_research rather than inventing the answer.
- In particular, "payment timing after a property sale"
  does NOT by itself mean:
  seller receives money,
  owner gets paid,
  customer receives funds,
  Tetamo charges after sale,
  settlement timing,
  payment release timing,
  or any other directional payment claim.
- Do not assume Tetamo is a party to, controls, releases,
  settles or has a policy governing that payment unless
  the evidence explicitly establishes it.
- If the exact payment event, payer, recipient or governing
  source is unknown, choose needs_research.

CHOOSE EXACTLY ONE OUTCOME

accept_for_content
The opportunity is sufficiently clear to create one
internal Rupert content task. Research still happens before
drafting and publication still requires approval.

needs_research
The opportunity appears useful, but important factual or
business context is missing. Create one research-first
Rupert task so the ambiguity can be resolved before any
content claim is drafted.

defer
The opportunity may become useful later, but there is not
enough actionable clarity now. Do not create a task.

decline
The handoff is unsuitable, irrelevant, duplicative, or
outside Rupert's content role. Do not create a task.

TASK FIELD RULES

For accept_for_content or needs_research:
- taskTitle must be concise and neutral;
- taskDescription must describe the internal work;
- researchQuestion must state what Rupert must verify;
- recommendedContentType must be one of:
  faq, education, social, landing_page, blog, other.

For defer or decline:
- taskTitle = null
- taskDescription = null
- researchQuestion = null
- recommendedContentType = null

Do not expose chain-of-thought.

SANITIZED HANDOFF EVIDENCE:
${JSON.stringify(
  evidence,
  null,
  2
)}
`.trim();

  const openai =
    new OpenAI({
      apiKey:
        process.env
          .OPENAI_API_KEY,
    });

  const response =
    await openai
      .responses
      .create({
        model:
          RUPERT_HANDOFF_MODEL,

        input:
          prompt,

        max_output_tokens:
          900,

        text: {
          format: {
            type:
              "json_schema",

            name:
              "rupert_handoff_intake",

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
                    "accept_for_content",
                    "needs_research",
                    "defer",
                    "decline",
                  ],
                },

                rationale: {
                  type:
                    "string",
                },

                taskTitle: {
                  type: [
                    "string",
                    "null",
                  ],
                },

                taskDescription: {
                  type: [
                    "string",
                    "null",
                  ],
                },

                researchQuestion: {
                  type: [
                    "string",
                    "null",
                  ],
                },

                recommendedContentType: {
                  type: [
                    "string",
                    "null",
                  ],

                  enum: [
                    "faq",
                    "education",
                    "social",
                    "landing_page",
                    "blog",
                    "other",
                    null,
                  ],
                },

                intakeNote: {
                  type:
                    "string",
                },
              },

              required: [
                "outcome",
                "rationale",
                "taskTitle",
                "taskDescription",
                "researchQuestion",
                "recommendedContentType",
                "intakeNote",
              ],
            },
          },
        },
      });

  const output =
    cleanString(
      response
        .output_text
    );

  if (!output) {
    throw new Error(
      "Rupert handoff intake returned no structured output."
    );
  }

  let parsed:
    RupertHandoffEvaluation;

  try {
    parsed =
      JSON.parse(
        output
      ) as
        RupertHandoffEvaluation;
  } catch {
    throw new Error(
      "Rupert handoff intake returned invalid JSON."
    );
  }

  const validOutcomes:
    RupertIntakeOutcome[] =
      [
        "accept_for_content",
        "needs_research",
        "defer",
        "decline",
      ];

  if (
    !validOutcomes
      .includes(
        parsed.outcome
      )
  ) {
    throw new Error(
      "Rupert handoff intake returned an invalid outcome."
    );
  }

  parsed.rationale =
    cleanString(
      parsed.rationale
    );

  parsed.taskTitle =
    cleanString(
      parsed.taskTitle
    ) ||
    null;

  parsed.taskDescription =
    cleanString(
      parsed.taskDescription
    ) ||
    null;

  parsed.researchQuestion =
    cleanString(
      parsed.researchQuestion
    ) ||
    null;

  parsed.intakeNote =
    cleanString(
      parsed.intakeNote
    );

  const createsTask =
    parsed.outcome ===
      "accept_for_content" ||
    parsed.outcome ===
      "needs_research";

  if (createsTask) {
    if (
      !parsed.taskTitle ||
      !parsed.taskDescription ||
      !parsed.researchQuestion ||
      !parsed
        .recommendedContentType
    ) {
      throw new Error(
        "Rupert accepted a handoff without complete task fields."
      );
    }
  } else {
    parsed.taskTitle =
      null;

    parsed.taskDescription =
      null;

    parsed.researchQuestion =
      null;

    parsed.recommendedContentType =
      null;
  }

  const sourceThemeKey =
    cleanString(
      context
        .source_theme_key
    );

  /*
   * SOURCE-GROUNDED AMBIGUITY RULE
   *
   * This canonical theme proves that customers repeatedly
   * ask about payment timing after a property sale.
   *
   * It deliberately does NOT establish:
   * - which payment event they mean;
   * - payer or recipient;
   * - whether Tetamo is involved in the payment;
   * - whether this is settlement, commission, a platform
   *   fee or another payment.
   *
   * Therefore Rupert must research the meaning before
   * factual content enters production.
   */
  if (
    sourceThemeKey ===
      "payment_timing_after_sale" &&
    (
      parsed.outcome ===
        "accept_for_content" ||
      parsed.outcome ===
        "needs_research"
    )
  ) {
    parsed.outcome =
      "needs_research";

    parsed.rationale =
      "The recurring customer signal is confirmed, but the sanitized evidence does not identify the payment event, payer, recipient, Tetamo's role or the source governing the timing. Rupert must resolve that ambiguity before factual content is drafted.";

    parsed.taskTitle =
      "Research recurring payment-timing question after property sale";

    parsed.taskDescription =
      "Investigate what payment event customers are referring to when they ask about payment timing after a property sale. Establish the payer, recipient, Tetamo's actual role if any, and the verified source governing the timing before recommending or drafting content.";

    parsed.researchQuestion =
      "What externally verifiable payment processes could apply after a property sale, what publicly documented role does Tetamo have if any, and what internal evidence would still be required to determine which payment event these customers meant? Do not infer customer intent from public sources.";

    parsed.recommendedContentType =
      "faq";

    parsed.intakeNote =
      "Recurring demand is established, but the meaning of the payment event is not. Research must resolve the ambiguity before content production.";
  }

  validateEvidenceSemantics({
    sourceThemeKey,

    evaluation:
      parsed,
  });

  return parsed;
}


async function createOrLoadTask({
  handoff,
  rupert,
  evaluation,
}: {
  handoff:
    HandoffRow;

  rupert:
    AgentRow;

  evaluation:
    RupertHandoffEvaluation;
}) {
  const existing =
    await findExistingTask(
      handoff.id
    );

  if (existing) {
    return {
      task:
        existing,

      created:
        false,
    };
  }

  const context =
    asRecord(
      handoff.context
    );

  const priorityRaw =
    cleanString(
      context.priority
    );

  const priority =
    [
      "low",
      "normal",
      "high",
    ].includes(
      priorityRaw
    )
      ? priorityRaw
      : "normal";

  const expectedOutcome =
    evaluation.outcome ===
      "needs_research"
      ? "Research the recurring customer-inquiry opportunity, resolve unsupported or ambiguous factual assumptions, and prepare a verified content recommendation or draft for Founder approval."
      : "Research and prepare verified Tetamo content based on the recurring customer-inquiry opportunity, then request Founder approval before publication.";

  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_tasks"
      )
      .insert({
        title:
          evaluation
            .taskTitle,

        description:
          evaluation
            .taskDescription,

        requested_by_agent_id:
          handoff
            .from_agent_id,

        assigned_to_agent_id:
          rupert.id,

        requested_by_user_id:
          null,

        priority,

        status:
          "pending",

        source_type:
          TASK_SOURCE_TYPE,

        source_id:
          handoff.id,

        related_entity_type:
          "ai_handoff",

        related_entity_id:
          handoff.id,

        expected_outcome:
          expectedOutcome,

        requires_approval:
          true,

        metadata: {
          handoff_id:
            handoff.id,

          source_insight_id:
            cleanString(
              context
                .source_insight_id
            ),

          source_decision_id:
            cleanString(
              context
                .source_decision_id
            ),

          source_theme_id:
            cleanString(
              context
                .source_theme_id
            ),

          source_theme_key:
            cleanString(
              context
                .source_theme_key
            ),

          intake_source:
            INTAKE_SOURCE,

          intake_outcome:
            evaluation
              .outcome,

          intake_rationale:
            evaluation
              .rationale,

          intake_note:
            evaluation
              .intakeNote,

          recommended_content_type:
            evaluation
              .recommendedContentType,

          recommended_content_types:
            cleanStringArray(
              context
                .recommended_content_types
            ),

          research_topic:
            evaluation
              .researchQuestion,

          planned_title:
            evaluation
              .taskTitle,

          rationale:
            evaluation
              .rationale,

          attempt_count:
            0,

          reporting_timezone:
            "Asia/Makassar",
        },
      })
      .select(
        "id, title, description, status, source_type, source_id, assigned_to_agent_id, requested_by_agent_id, metadata"
      )
      .single();

  if (
    error?.code ===
    "23505"
  ) {
    const winner =
      await findExistingTask(
        handoff.id
      );

    if (!winner) {
      throw error;
    }

    return {
      task:
        winner,

      created:
        false,
    };
  }

  if (
    error ||
    !data
  ) {
    throw (
      error ??
      new Error(
        "Unable to create Rupert handoff task."
      )
    );
  }

  return {
    task:
      data as
        TaskRow,

    created:
      true,
  };
}


async function linkAcceptedHandoff({
  handoff,
  task,
  evaluation,
}: {
  handoff:
    HandoffRow;

  task:
    TaskRow;

  evaluation:
    RupertHandoffEvaluation;
}) {
  const context = {
    ...asRecord(
      handoff.context
    ),

    rupert_intake_source:
      INTAKE_SOURCE,

    rupert_intake_model:
      RUPERT_HANDOFF_MODEL,

    rupert_intake_state:
      "accepted",

    rupert_intake_outcome:
      evaluation.outcome,

    rupert_intake_rationale:
      evaluation.rationale,

    rupert_intake_note:
      evaluation.intakeNote,

    rupert_research_question:
      evaluation
        .researchQuestion,

    rupert_recommended_content_type:
      evaluation
        .recommendedContentType,

    rupert_task_id:
      task.id,

    rupert_intake_evaluated_at:
      new Date()
        .toISOString(),
  };

  const nowIso =
    new Date()
      .toISOString();

  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_handoffs"
      )
      .update({
        task_id:
          task.id,

        status:
          "accepted",

        accepted_at:
          handoff.accepted_at ??
          nowIso,

        context,
      })
      .eq(
        "id",
        handoff.id
      )
      .eq(
        "status",
        "pending"
      )
      .select(
        "id, from_agent_id, to_agent_id, task_id, handoff_type, summary, context, status, accepted_at, completed_at, created_at"
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return data as
      HandoffRow;
  }

  const current =
    await getHandoff(
      handoff.id
    );

  if (
    current.status ===
      "accepted" &&
    current.task_id ===
      task.id
  ) {
    return current;
  }

  throw new Error(
    "Rupert task exists but handoff could not be accepted safely."
  );
}


async function storeNoTaskOutcome({
  handoff,
  evaluation,
}: {
  handoff:
    HandoffRow;

  evaluation:
    RupertHandoffEvaluation;
}) {
  const context = {
    ...asRecord(
      handoff.context
    ),

    rupert_intake_source:
      INTAKE_SOURCE,

    rupert_intake_model:
      RUPERT_HANDOFF_MODEL,

    rupert_intake_state:
      evaluation.outcome ===
        "defer"
        ? "deferred"
        : "declined",

    rupert_intake_outcome:
      evaluation.outcome,

    rupert_intake_rationale:
      evaluation.rationale,

    rupert_intake_note:
      evaluation.intakeNote,

    rupert_intake_evaluated_at:
      new Date()
        .toISOString(),
  };

  const patch =
    evaluation.outcome ===
      "decline"
      ? {
          status:
            "declined",

          context,
        }
      : {
          context,
        };

  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_handoffs"
      )
      .update(
        patch
      )
      .eq(
        "id",
        handoff.id
      )
      .eq(
        "status",
        "pending"
      )
      .select(
        "id, from_agent_id, to_agent_id, task_id, handoff_type, summary, context, status, accepted_at, completed_at, created_at"
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Rupert handoff changed before intake outcome could be stored."
    );
  }

  return data as
    HandoffRow;
}


export async function intakeLolaHandoffWithRupert({
  handoffId,
}: {
  handoffId:
    string;

  actorUserId:
    string | null;
}) {
  const [
    rupert,
    lola,
  ] =
    await Promise.all([
      getAgent(
        "rupert"
      ),

      getAgent(
        "lola"
      ),
    ]);

  /*
   * Operational off-switch.
   *
   * No model call and no write when Rupert is not active.
   */
  if (
    rupert.status !==
      "active" ||
    rupert.enabled !==
      true
  ) {
    return {
      action:
        "skipped_rupert_inactive",

      writesPerformed:
        false,

      rupert: {
        status:
          rupert.status,

        enabled:
          rupert.enabled,
      },
    };
  }

  requireAgentPermission(
    "rupert",
    "read_ai_team_data"
  );

  requireAgentPermission(
    "rupert",
    "create_internal_task"
  );

  const handoff =
    await getHandoff(
      handoffId
    );

  if (
    handoff
      .from_agent_id !==
      lola.id ||
    handoff
      .to_agent_id !==
      rupert.id
  ) {
    throw new Error(
      "This handoff is not a Lola to Rupert handoff."
    );
  }

  if (
    handoff
      .handoff_type !==
      "content_opportunity"
  ) {
    throw new Error(
      "Rupert intake only accepts content-opportunity handoffs."
    );
  }

  const context =
    asRecord(
      handoff.context
    );

  if (
    cleanString(
      context.source
    ) !==
      "lola_inquiry_evaluator"
  ) {
    throw new Error(
      "Rupert intake rejected an unsupported handoff source."
    );
  }

  const insightId =
    cleanString(
      context
        .source_insight_id
    );

  if (!insightId) {
    throw new Error(
      "Lola handoff is missing its source insight."
    );
  }

  /*
   * Already successfully accepted.
   */
  if (
    handoff.status ===
      "accepted" &&
    handoff.task_id
  ) {
    const task =
      await findExistingTask(
        handoff.id
      );

    return {
      action:
        "reused_accepted_handoff",

      writesPerformed:
        false,

      handoffId:
        handoff.id,

      taskId:
        task?.id ??
        handoff.task_id,

      status:
        handoff.status,
    };
  }

  /*
   * Terminal no-task result.
   */
  if (
    handoff.status ===
      "declined"
  ) {
    return {
      action:
        "skipped_declined_handoff",

      writesPerformed:
        false,

      handoffId:
        handoff.id,
    };
  }

  if (
    handoff.status !==
      "pending"
  ) {
    throw new Error(
      `Rupert cannot intake handoff in status: ${handoff.status}`
    );
  }

  /*
   * A deferred intake stays pending deliberately, but
   * should not be repeatedly re-evaluated by duplicate calls.
   */
  if (
    cleanString(
      context
        .rupert_intake_state
    ) ===
      "deferred"
  ) {
    return {
      action:
        "skipped_deferred_handoff",

      writesPerformed:
        false,

      handoffId:
        handoff.id,
    };
  }

  /*
   * Recovery path:
   * if a task was created before a previous worker could
   * link the handoff, repair the handoff instead of
   * generating or creating anything again.
   */
  const existingTask =
    await findExistingTask(
      handoff.id
    );

  if (existingTask) {
    const repairedEvaluation:
      RupertHandoffEvaluation =
      {
        outcome:
          cleanString(
            existingTask
              .metadata
              ?.intake_outcome
          ) ===
            "needs_research"
            ? "needs_research"
            : "accept_for_content",

        rationale:
          cleanString(
            existingTask
              .metadata
              ?.intake_rationale
          ) ||
          "Existing Rupert task recovered for this handoff.",

        taskTitle:
          existingTask.title,

        taskDescription:
          existingTask
            .description,

        researchQuestion:
          cleanString(
            existingTask
              .metadata
              ?.research_topic
          ) ||
          null,

        recommendedContentType:
          (
            cleanString(
              existingTask
                .metadata
                ?.recommended_content_type
            ) ||
            "other"
          ) as
            RecommendedContentType,

        intakeNote:
          "Recovered an existing idempotent Rupert task.",
      };

    const repairedHandoff =
      await linkAcceptedHandoff({
        handoff,
        task:
          existingTask,
        evaluation:
          repairedEvaluation,
      });

    return {
      action:
        "repaired_existing_rupert_task",

      writesPerformed:
        true,

      handoffId:
        repairedHandoff.id,

      taskId:
        existingTask.id,

      status:
        repairedHandoff.status,
    };
  }

  const insight =
    await getInsight(
      insightId
    );

  const insightMetadata =
    asRecord(
      insight.metadata
    );

  if (
    cleanString(
      insightMetadata
        .source
    ) !==
      "mona_meta_content_intelligence"
  ) {
    throw new Error(
      "Rupert intake rejected an unsupported source insight."
    );
  }

  const evaluation =
    await generateEvaluation({
      handoff,
      insight,
    });

  const previousRupertTaskId =
    cleanString(
      context
        .previous_rupert_task_id
    );

  const evaluationKey =
    previousRupertTaskId
      ? `${handoff.id}:after_task:${previousRupertTaskId}`
      : `${handoff.id}:initial`;

  await ensureActivity({
    agentId:
      rupert.id,

    action:
      "evaluated_lola_handoff",

    entityType:
      "ai_handoff",

    entityId:
      handoff.id,

    idempotencyKey:
      evaluationKey,

    details: {
      source:
        INTAKE_SOURCE,

      outcome:
        evaluation.outcome,

      source_insight_id:
        insight.id,

      source_theme_key:
        cleanString(
          context
            .source_theme_key
        ),

      previous_rupert_task_id:
        previousRupertTaskId ||
        null,
    },
  });

  if (
    evaluation.outcome ===
      "defer" ||
    evaluation.outcome ===
      "decline"
  ) {
    const updated =
      await storeNoTaskOutcome({
        handoff,
        evaluation,
      });

    return {
      action:
        evaluation.outcome ===
          "defer"
          ? "deferred_lola_handoff"
          : "declined_lola_handoff",

      writesPerformed:
        true,

      handoffId:
        updated.id,

      evaluation,

      task:
        null,
    };
  }

  const {
    task,
    created,
  } =
    await createOrLoadTask({
      handoff,
      rupert,
      evaluation,
    });

  const acceptedHandoff =
    await linkAcceptedHandoff({
      handoff,
      task,
      evaluation,
    });

  await ensureActivity({
    agentId:
      rupert.id,

    action:
      "created_handoff_content_task",

    entityType:
      "ai_task",

    entityId:
      task.id,

    details: {
      source:
        INTAKE_SOURCE,

      handoff_id:
        handoff.id,

      source_insight_id:
        insight.id,

      intake_outcome:
        evaluation.outcome,

      task_created:
        created,
    },
  });

  return {
    action:
      created
        ? "created_rupert_handoff_task"
        : "reused_rupert_handoff_task",

    writesPerformed:
      true,

    handoffId:
      acceptedHandoff.id,

    evaluation,

    task: {
      id:
        task.id,

      status:
        task.status,

      sourceType:
        task.source_type,

      sourceId:
        task.source_id,
    },

    handoff: {
      id:
        acceptedHandoff.id,

      status:
        acceptedHandoff.status,

      taskId:
        acceptedHandoff.task_id,
    },
  };
}
