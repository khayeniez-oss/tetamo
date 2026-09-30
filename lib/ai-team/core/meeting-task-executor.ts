import OpenAI from "openai";

import {
  aiTeamSupabaseAdmin,
} from "@/lib/ai-team/core/admin-auth";

import {
  transitionAssignedAITask,
} from "@/lib/ai-team/core/task-lifecycle";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type AgentKey =
  | "jake"
  | "mona"
  | "rupert"
  | "randolph"
  | "lola"
  | "uncle_sam";

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  expected_outcome: string | null;
  status: string;
  requires_approval: boolean;
  assigned_to_agent_id: string | null;
  source_type: string | null;
  source_id: string | null;
  metadata: Record<string, unknown> | null;
};

type AgentRow = {
  id: string;
  agent_key: AgentKey;
  display_name: string;
  role_title: string | null;
};

type ContributorRequest = {
  agentKey: AgentKey;
  request: string;
};

type ExecutionPlan = {
  needsContributors: boolean;
  contributors: ContributorRequest[];
  ownerInstruction: string;
};

function taskSourceExcerpt(
  task: TaskRow
) {
  const metadata =
    task.metadata ?? {};

  const value =
    metadata.source_excerpt;

  return typeof value === "string"
    ? value.trim()
    : "";
}

function isDirectJakeWorkboardAssignment(
  task: TaskRow,
  owner: AgentRow
) {
  if (owner.agent_key !== "jake") {
    return false;
  }

  const excerpt =
    taskSourceExcerpt(task);

  if (!excerpt) {
    return false;
  }

  const directlyAddressesJake =
    /(?:^|[,.!?;:]\s*)jake\b/i.test(
      excerpt
    );

  if (!directlyAddressesJake) {
    return false;
  }

  const explicitSelfOwnership =
    /\b(?:answer\s+(?:this\s+)?yourself|you\s+are\s+the\s+owner|handle\s+(?:this|it)\s+yourself|do\s+(?:this|it)\s+yourself|create\s+(?:the|this|a)\s+(?:action\s+plan|plan|task\s+breakdown)|turn\s+.*?into\s+tasks|assign\s+(?:an?\s+)?owner|assign\s+owners|prioriti[sz]e|give\s+me\s+(?:the|your)\s+(?:final\s+)?(?:answer|recommendation|conclusion|deliverable)|summari[sz]e|coordinate\s+(?:this|it))\b/i.test(
      excerpt
    );

  if (!explicitSelfOwnership) {
    return false;
  }

  const explicitlyRequestsSpecialists =
    /\b(?:ask|consult|involve|get|obtain|hear\s+from|coordinate\s+with)\b[\s\S]{0,100}\b(?:mona|rupert|randolph|lola|uncle\s+sam|specialist|team)\b/i.test(
      excerpt
    );

  return !explicitlyRequestsSpecialists;
}

function asRecord(
  value: unknown
): Record<string, unknown> {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  return {};
}

function parseJson<T>(
  value: string
): T {
  const cleaned =
    value
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "");

  return JSON.parse(cleaned) as T;
}

async function loadTask(
  taskId: string
): Promise<TaskRow> {
  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_tasks")
      .select(
        "id, title, description, expected_outcome, status, requires_approval, assigned_to_agent_id, source_type, source_id, metadata"
      )
      .eq("id", taskId)
      .single();

  if (error || !data) {
    throw new Error(
      `Unable to load AI task ${taskId}: ${
        error?.message ??
        "not found"
      }`
    );
  }

  return data as TaskRow;
}

async function loadAgents(): Promise<
  AgentRow[]
> {
  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_agents")
      .select(
        "id, agent_key, display_name, role_title"
      )
      .eq("status", "active")
      .eq("enabled", true);

  if (error) {
    throw new Error(
      `Unable to load AI agents: ${error.message}`
    );
  }

  return (data ?? []) as AgentRow[];
}

async function callJson<T>(
  system: string,
  input: string
): Promise<T> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is missing."
    );
  }

  const response =
    await openai.responses.create({
      model:
        process.env
          .AI_TEAM_TASK_MODEL ??
        "gpt-5-mini",

      instructions:
        system,

      input: `Return the response as a valid JSON object.\n\n${input}`,

      text: {
        format: {
          type:
            "json_object",
        },
      },
    });

  return parseJson<T>(
    response.output_text
  );
}

async function callText(
  system: string,
  input: string
) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is missing."
    );
  }

  const response =
    await openai.responses.create({
      model:
        process.env
          .AI_TEAM_TASK_MODEL ??
        "gpt-5-mini",

      instructions:
        system,

      input,
    });

  return response.output_text.trim();
}

function ownerSystemPrompt(
  owner: AgentRow
) {
  const roleRules: Record<
    AgentKey,
    string
  > = {
    jake: `
You are Jake, Tetamo's COO and AI Team orchestrator.
Your job is executive coordination, prioritization, task breakdown,
decision synthesis and operational follow-through.
Do not pretend specialist work was completed when it was not.
`,

    mona: `
You are Mona, Tetamo's Sales and WhatsApp enquiries specialist.
Focus on customer/agent/buyer/renter conversations, objections,
follow-up, qualification, packages, sales operations and conversion.
Do not invent customer facts or metrics.
`,

    rupert: `
You are Rupert, Tetamo's Content and SEO specialist.
You are the primary writer for content, scripts, blogs, captions,
SEO materials and tailored written communication assigned to you.
Write practical, clear, grounded, commercially aware and human copy.
Do not sound governmental, grandiose or political.
Do not invent research or claim web research occurred unless verified
research was actually supplied to you.
`,

    randolph: `
You are Randolph, Tetamo's Systems and IT Watchdog.
Focus on technical systems, incidents, reliability, security,
diagnosis and operational technical recommendations.
Never claim a live system check occurred unless evidence is supplied.
`,

    lola: `
You are Lola, Tetamo's Growth Strategist.
Focus on growth, funnel strategy, conversion, campaigns,
positioning, market analysis and measurable commercial outcomes.
Do not invent metrics.
`,

    uncle_sam: `
You are Uncle Sam, Tetamo's Finance and Admin specialist.
Focus on finance, administration, cost control, records,
commercial structure and operational financial reasoning.
Do not invent financial figures.
`,
  };

  return `
${roleRules[owner.agent_key]}

You are executing a REAL Tetamo Workboard task.

Important:
- Produce the actual requested deliverable, not an acknowledgement.
- Use contributor input when supplied.
- Never say you will do the work later.
- Do not claim actions, research, messages, publishing, database changes,
  external checks or customer contact occurred unless evidence says so.
- If the task cannot safely be completed from the supplied information,
  clearly state what is missing rather than fabricating it.
- Never invent Tetamo facts, including pricing, packages, promotions,
  discounts, free offers, trials, guarantees, statistics, case studies,
  customer results, services, product capabilities or availability.
- Never invent internal Tetamo staff, departments, vendors, software,
  analytics tools, advertising tools, experiment platforms, integrations,
  access credentials, dashboards, meetings, calendar slots or operational
  resources that were not supplied as confirmed context.
- Never invent deadlines, publish dates, implementation dates, KPI targets,
  conversion targets, statistical targets, traffic numbers or budgets merely
  to make a plan look concrete.
- Contributor suggestions are evidence or proposals, not automatically
  confirmed Tetamo facts, approved work, available resources or Founder decisions.
- Preserve that distinction in the final deliverable.
- If a useful detail is unconfirmed, omit it from the core deliverable unless
  the task specifically requires a proposal for that detail.
- Merely labeling an invented number, date, channel, cadence, target, asset,
  meeting or operational assumption as "proposed" does not make it necessary.
- Prefer the smallest grounded deliverable that fully satisfies the Founder request.
- Optional ideas may be included only when genuinely useful and must be separated
  from the requested deliverable under a clearly labeled "Proposed options" section.
- Treat a Tetamo business claim as confirmed only when it is explicitly
  supplied in the task, Founder instruction, verified task context or
  specialist evidence provided for this task.
- If a Tetamo fact needed for the deliverable is not confirmed, omit it
  or clearly mark it as requiring Founder confirmation.
- Return only the finished work/result suitable for the Founder to review.
`.trim();
}

async function planExecution({
  task,
  owner,
  agents,
}: {
  task: TaskRow;
  owner: AgentRow;
  agents: AgentRow[];
}): Promise<ExecutionPlan> {
  /*
   * Explicit Founder assignment to Jake remains Jake-owned.
   * Do not automatically turn it into multi-agent collaboration.
   */
  if (
    isDirectJakeWorkboardAssignment(
      task,
      owner
    )
  ) {
    return {
      needsContributors: false,
      contributors: [],
      ownerInstruction:
        task.expected_outcome ||
        task.title,
    };
  }

  const available =
    agents
      .filter(
        (agent) =>
          agent.id !== owner.id
      )
      .map(
        (agent) =>
          `${agent.agent_key}: ${agent.display_name} — ${agent.role_title ?? "AI Team specialist"}`
      )
      .join("\n");

  const system = `
You plan collaboration for one Tetamo AI Team task.

The assigned owner remains accountable for the final deliverable.

Only request contributors when their specialist knowledge is actually
required to complete this exact task, not merely because their domain is related.

Do not create round-robin collaboration.
Do not delegate the owner's core responsibility away.
Do not recruit contributors merely to make the deliverable broader or more detailed.
Do not turn a direct owner assignment into a team consultation unless the task
requires cross-specialist evidence or the Founder explicitly requested collaboration.
Maximum 3 contributors.

Typical domains:
- Jake: executive coordination and operations
- Mona: sales, enquiries, customer/agent/buyer/renter intelligence
- Rupert: content, SEO and writing
- Randolph: systems and IT
- Lola: growth and conversion strategy
- Uncle Sam: finance and admin

Return JSON only:
{
  "needsContributors": boolean,
  "contributors": [
    {
      "agentKey": "mona|rupert|randolph|lola|uncle_sam|jake",
      "request": "specific contribution needed"
    }
  ],
  "ownerInstruction": "what the owner must finally deliver"
}
`.trim();

  const input = `
OWNER:
${owner.agent_key} — ${owner.display_name}
${owner.role_title ?? ""}

TASK:
${task.title}

DESCRIPTION:
${task.description ?? ""}

EXPECTED OUTCOME:
${task.expected_outcome ?? ""}

AVAILABLE CONTRIBUTORS:
${available}
`.trim();

  const plan =
    await callJson<ExecutionPlan>(
      system,
      input
    );

  const allowed =
    new Set(
      agents
        .filter(
          (agent) =>
            agent.id !== owner.id
        )
        .map(
          (agent) =>
            agent.agent_key
        )
    );

  const contributors =
    Array.isArray(
      plan.contributors
    )
      ? plan.contributors
          .filter(
            (item) =>
              allowed.has(
                item.agentKey
              ) &&
              typeof item.request ===
                "string" &&
              item.request.trim()
          )
          .slice(0, 3)
      : [];

  return {
    needsContributors:
      contributors.length > 0,

    contributors,

    ownerInstruction:
      plan.ownerInstruction ||
      task.expected_outcome ||
      task.title,
  };
}

async function ensureHandoff({
  task,
  owner,
  contributor,
  request,
}: {
  task: TaskRow;
  owner: AgentRow;
  contributor: AgentRow;
  request: string;
}) {
  const {
    data: existing,
    error: existingError,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_handoffs")
      .select(
        "id, status, context"
      )
      .eq(
        "from_agent_id",
        owner.id
      )
      .eq(
        "to_agent_id",
        contributor.id
      )
      .eq(
        "task_id",
        task.id
      )
      .eq(
        "handoff_type",
        "meeting_task_contribution"
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
      .limit(1)
      .maybeSingle();

  if (existingError) {
    throw existingError;
  }

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
          owner.id,

        to_agent_id:
          contributor.id,

        task_id:
          task.id,

        handoff_type:
          "meeting_task_contribution",

        summary:
          request,

        context: {
          source:
            "meeting_task_executor",

          task_title:
            task.title,

          expected_outcome:
            task.expected_outcome,
        },

        status:
          "pending",
      })
      .select(
        "id, status, context"
      )
      .single();

  if (error || !data) {
    throw new Error(
      `Unable to create contributor handoff: ${
        error?.message ??
        "unknown error"
      }`
    );
  }

  return data;
}

async function generateContribution({
  task,
  owner,
  contributor,
  request,
}: {
  task: TaskRow;
  owner: AgentRow;
  contributor: AgentRow;
  request: string;
}) {
  const system =
    ownerSystemPrompt(
      contributor
    ) +
    `

You are NOT the owner of this task.
You are contributing specialist input to ${owner.display_name}.
Answer only the contribution requested.
Do not take ownership of the final deliverable.`;

  const input = `
TASK OWNER:
${owner.display_name}

TASK:
${task.title}

DESCRIPTION:
${task.description ?? ""}

EXPECTED OUTCOME:
${task.expected_outcome ?? ""}

YOUR CONTRIBUTION REQUEST:
${request}
`.trim();

  return callText(
    system,
    input
  );
}

async function completeHandoff({
  handoffId,
  result,
}: {
  handoffId: string;
  result: string;
}) {
  const now =
    new Date().toISOString();

  const {
    data: row,
    error: loadError,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_handoffs")
      .select(
        "context, accepted_at"
      )
      .eq(
        "id",
        handoffId
      )
      .single();

  if (loadError || !row) {
    throw new Error(
      `Unable to load contributor handoff ${handoffId}.`
    );
  }

  const context = {
    ...asRecord(row.context),

    contribution_result:
      result,

    contribution_completed_at:
      now,
  };

  const {
    error,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_handoffs")
      .update({
        status:
          "completed",

        accepted_at:
          row.accepted_at ??
          now,

        completed_at:
          now,

        context,
      })
      .eq(
        "id",
        handoffId
      );

  if (error) {
    throw error;
  }
}

async function produceOwnerResult({
  task,
  owner,
  ownerInstruction,
  contributions,
  agents,
}: {
  task: TaskRow;
  owner: AgentRow;
  ownerInstruction: string;
  contributions: Array<{
    agent: AgentRow;
    result: string;
  }>;
  agents: AgentRow[];
}) {
  const contributorText =
    contributions.length
      ? contributions
          .map(
            ({
              agent,
              result,
            }) =>
              `### ${agent.display_name} (${agent.agent_key})\n${result}`
          )
          .join("\n\n")
      : "No contributor input was required.";

  const metadata =
    asRecord(
      task.metadata
    );

  const founderFeedback =
    typeof metadata
      .founder_review_feedback ===
      "string"
      ? metadata
          .founder_review_feedback
      : "";

  const originalResult =
    typeof metadata
      .original_result_summary ===
      "string"
      ? metadata
          .original_result_summary
      : "";

  const revisionContext =
    task.source_type ===
      "founder_review"
      ? `
FOUNDER REVISION CONTEXT:

FOUNDER FEEDBACK:
${founderFeedback || "No Founder feedback was supplied."}

ORIGINAL DELIVERABLE:
${originalResult || "No original deliverable was supplied."}

Revision rules:
- Treat the Founder feedback as authoritative for this revision.
- Revise the original deliverable rather than pretending it does not exist.
- Preserve useful parts that do not conflict with the Founder feedback.
- Remove or correct anything the Founder identified as unsupported.
`
      : "";

  const activeRoster =
    agents
      .map(
        (agent) =>
          `${agent.agent_key}: ${agent.display_name} — ${agent.role_title ?? "AI Team member"}`
      )
      .join("\n");

  const input = `
TASK:
${task.title}

DESCRIPTION:
${task.description ?? ""}

EXPECTED OUTCOME:
${task.expected_outcome ?? ""}
${revisionContext}

OWNER EXECUTION INSTRUCTION:
${ownerInstruction}

ACTIVE TETAMO AI TEAM ROSTER:
${activeRoster || "(No active AI Team roster supplied.)"}

AI TEAM ASSIGNMENT RULE:
- If the Founder/task asks you to assign an AI team member, owner, specialist,
  or responsible agent, choose only from the ACTIVE TETAMO AI TEAM ROSTER above.
- Never invent substitute people, departments or job titles such as Product Lead,
  ML Engineer, Data Scientist, Marketing Manager or similar roles unless that
  exact person/role is actually present in the active roster.
- Match assignments strictly to the supplied role titles and task context.
- Do not assign work to an agent merely because that agent is available.
- The assigned action must reasonably belong to that agent's supplied role title.
- Do not silently expand an agent's responsibilities beyond the supplied role title.
- For example, a Systems / IT / Watchdog role must not become a content writer,
  sales collateral creator or marketing owner merely because the task needs one.
- If none of the active AI Team members can legitimately own a required action,
  write "Founder assignment required" rather than inventing an owner.
- Do not reinterpret "AI team member" as a generic software/ML engineering team.
  In this task it means the actual Tetamo AI Team roster supplied above.
- Do not invent a new technical/ML initiative merely because these are AI agents.
  Stay within the business and operational scope actually established by the
  Founder instruction, task and verified context.

SPECIALIST CONTRIBUTIONS:
${contributorText}

Produce the final deliverable now.

FINAL GROUNDING CHECK:
- Follow the Founder's requested scope exactly.
- Do not expand a simple request into unrelated initiatives.
- Planning permission is not factual permission.
- When asked to create a plan, organize the confirmed objective, choose appropriate
  owners from the supplied roster, set only the priority requested by the Founder,
  and define practical actions at the level supported by the task/context.
- Do not invent account counts, lead counts, conversion targets, outreach channels,
  communication cadences, campaign structures, asset quantities, content lengths,
  start dates, deadlines, meeting schedules, tools, integrations, access,
  stakeholder lists, budgets, KPIs or operational requirements unless they were
  explicitly supplied in confirmed task/context.
- Do not add extra fields such as start dates, numeric targets or schedules merely
  to make a plan appear more detailed when the Founder did not request them.
- Separate confirmed facts from proposals.
- If an optional idea would genuinely help, place it separately under
  "Proposed options" and make clear that it is not an approved Tetamo plan.
  Do not mix optional proposals into the requested deliverable as though committed.
- Do not convert contributor recommendations into established Tetamo plans.
- Do not invent staff, tools, systems, dates, meetings, KPIs, access, budgets,
  capabilities or business facts.
- Assign work only when it fits the selected agent's supplied active role title.
- When information is missing, say what requires confirmation instead of
  filling the gap yourself.
`.trim();

  return callText(
    ownerSystemPrompt(owner),
    input
  );
}

export async function executeMeetingTask({
  taskId,
}: {
  taskId: string;
}) {
  const task =
    await loadTask(taskId);

  if (
    task.status !==
      "in_progress" ||
    !task.assigned_to_agent_id
  ) {
    return {
      ok: false,
      skipped: true,
      reason:
        "Task is not an assigned in-progress task.",
    };
  }

  const agents =
    await loadAgents();

  const owner =
    agents.find(
      (agent) =>
        agent.id ===
        task.assigned_to_agent_id
    );

  if (!owner) {
    throw new Error(
      "Assigned task owner is not an active AI agent."
    );
  }

  const plan =
    await planExecution({
      task,
      owner,
      agents,
    });

  const contributions: Array<{
    agent: AgentRow;
    result: string;
  }> = [];

  for (
    const request of
    plan.contributors
  ) {
    const contributor =
      agents.find(
        (agent) =>
          agent.agent_key ===
          request.agentKey
      );

    if (!contributor) {
      continue;
    }

    const handoff =
      await ensureHandoff({
        task,
        owner,
        contributor,
        request:
          request.request,
      });

    const existingContext =
      asRecord(
        handoff.context
      );

    const existingResult =
      existingContext
        .contribution_result;

    if (
      handoff.status ===
        "completed" &&
      typeof existingResult ===
        "string" &&
      existingResult.trim()
    ) {
      contributions.push({
        agent:
          contributor,

        result:
          existingResult,
      });

      continue;
    }

    const result =
      await generateContribution({
        task,
        owner,
        contributor,
        request:
          request.request,
      });

    await completeHandoff({
      handoffId:
        handoff.id,

      result,
    });

    contributions.push({
      agent:
        contributor,

      result,
    });
  }

  const resultSummary =
    await produceOwnerResult({
      task,
      owner,
      ownerInstruction:
        plan.ownerInstruction,
      contributions,
      agents,
    });

  /*
   * Existing lifecycle remains the authority.
   *
   * Approval-required work goes to awaiting_approval.
   * Non-approval work completes with a real result.
   */
  const targetStatus =
    task.requires_approval
      ? "awaiting_approval"
      : "completed";

  const transitioned =
    await transitionAssignedAITask({
      taskId:
        task.id,

      actorAgentKey:
        owner.agent_key,

      nextStatus:
        targetStatus,

      resultSummary,

      transitionSource:
        "meeting_task_executor",
    });

  return {
    ok: true,
    taskId:
      task.id,
    ownerAgentKey:
      owner.agent_key,
    status:
      targetStatus,
    resultSummary,
    contributors:
      contributions.map(
        ({ agent }) =>
          agent.agent_key
      ),
  };
}
