import "server-only";

import OpenAI from "openai";

import type {
  AIAgentKey,
} from "@/lib/ai-team/permissions/agent-permissions";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const JAKE_MODEL = "gpt-4.1-mini";

export type JakeMeetingTurn = {
  turnOrder: number;
  speakerName: string;
  speakerRole?: string | null;
  speakerType:
    | "user"
    | "advisor"
    | "agent"
    | "system";
  content: string;
};

export type JakeMeetingAgent = {
  agentKey: AIAgentKey;
  displayName: string;
  roleTitle: string;
};

export type JakeMeetingDecision =
  | {
      action: "speak";
      reply: string;
      acknowledgeRoom: boolean;
      targetAgentKey: null;
    }
  | {
      action: "handoff";
      reply: null;
      acknowledgeRoom: boolean;
      targetAgentKey: Exclude<
        AIAgentKey,
        "jake"
      >;
    }
  | {
      action: "no_response";
      reply: null;
      acknowledgeRoom: boolean;
      targetAgentKey: null;
    };

export type JakeMeetingPlan = {
  specialistOrder: Exclude<
    AIAgentKey,
    "jake"
  >[];

  needsJakeSynthesis: boolean;
};

type GenerateJakeMeetingPlanInput = {
  meetingTitle: string;
  founderQuestion: string;
  recentTurns: JakeMeetingTurn[];
  agents: JakeMeetingAgent[];
};

type GenerateJakeMeetingDecisionInput = {
  meetingTitle: string;
  recentTurns: JakeMeetingTurn[];
  agents: JakeMeetingAgent[];
};

function buildMeetingTranscript(
  turns: JakeMeetingTurn[]
) {
  if (turns.length === 0) {
    return "(No conversation yet.)";
  }

  return turns
    .map((turn) => {
      const role = turn.speakerRole
        ? ` — ${turn.speakerRole}`
        : "";

      return [
        `Turn ${turn.turnOrder}`,
        `${turn.speakerName}${role}`,
        turn.content,
      ].join("\n");
    })
    .join("\n\n");
}

function buildAgentRoster(
  agents: JakeMeetingAgent[]
) {
  return agents
    .map(
      (agent) =>
        `- ${agent.displayName} (${agent.agentKey}): ${agent.roleTitle}`
    )
    .join("\n");
}

function extractJsonObject(
  text: string
): Record<string, unknown> | null {
  const trimmed = text.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const direct = JSON.parse(trimmed);

    if (
      direct &&
      typeof direct === "object" &&
      !Array.isArray(direct)
    ) {
      return direct as Record<string, unknown>;
    }
  } catch {
    // Continue to fenced/object extraction.
  }

  const fencedMatch = trimmed.match(
    /```(?:json)?\s*([\s\S]*?)```/i
  );

  if (fencedMatch?.[1]) {
    try {
      const fenced = JSON.parse(
        fencedMatch[1].trim()
      );

      if (
        fenced &&
        typeof fenced === "object" &&
        !Array.isArray(fenced)
      ) {
        return fenced as Record<string, unknown>;
      }
    } catch {
      // Continue to object extraction.
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (
    firstBrace === -1 ||
    lastBrace === -1 ||
    lastBrace <= firstBrace
  ) {
    return null;
  }

  try {
    const extracted = JSON.parse(
      trimmed.slice(
        firstBrace,
        lastBrace + 1
      )
    );

    if (
      extracted &&
      typeof extracted === "object" &&
      !Array.isArray(extracted)
    ) {
      return extracted as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

function parseJakeMeetingPlan(
  value: Record<string, unknown>,
  agents: JakeMeetingAgent[]
): JakeMeetingPlan | null {
  const allowedSpecialists =
    new Set(
      agents
        .filter(
          (agent) =>
            agent.agentKey !==
            "jake"
        )
        .map(
          (agent) =>
            agent.agentKey
        )
    );

  const rawOrder =
    Array.isArray(
      value.specialistOrder
    )
      ? value.specialistOrder
      : [];

  const specialistOrder: Exclude<
    AIAgentKey,
    "jake"
  >[] = [];

  for (const rawKey of rawOrder) {
    if (
      typeof rawKey !== "string" ||
      rawKey === "jake" ||
      !allowedSpecialists.has(
        rawKey as AIAgentKey
      ) ||
      specialistOrder.includes(
        rawKey as Exclude<
          AIAgentKey,
          "jake"
        >
      )
    ) {
      continue;
    }

    specialistOrder.push(
      rawKey as Exclude<
        AIAgentKey,
        "jake"
      >
    );
  }

  return {
    specialistOrder:
      specialistOrder.slice(
        0,
        5
      ),

    needsJakeSynthesis:
      value.needsJakeSynthesis ===
      true,
  };
}

export async function generateJakeMeetingPlan({
  meetingTitle,
  founderQuestion,
  recentTurns,
  agents,
}: GenerateJakeMeetingPlanInput): Promise<JakeMeetingPlan> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      specialistOrder: [],
      needsJakeSynthesis: true,
    };
  }

  const transcript =
    buildMeetingTranscript(
      recentTurns.slice(-20)
    );

  const roster =
    buildAgentRoster(
      agents.filter(
        (agent) =>
          agent.agentKey !==
          "jake"
      )
    );

  const prompt = `
You are Jake, Tetamo's AI COO.

Your job in this function is ONLY to create the specialist speaking plan for ONE Founder turn.

Do not answer the Founder.
Do not write reasoning.
Do not execute actions.

MEETING
${meetingTitle}

FOUNDER'S CURRENT QUESTION
${founderQuestion}

ACTIVE SPECIALISTS
${roster || "(No active specialists.)"}

RECENT CONTEXT BEFORE / INCLUDING THE FOUNDER TURN
${transcript}

SPECIALIST RESPONSIBILITIES

Mona:
Sales, customer enquiries, sales pipeline, package intent, follow-up status, verified sales and revenue context.

Lola:
Growth strategy, growth experiments, conversion opportunities, commercial hypotheses, campaign strategy.

Rupert:
Content, SEO, educational material, messaging and content support for commercial goals.

Uncle Sam:
Finance, costs, subscriptions, budgets, assets and administrative controls.

Randolph:
Systems, production health, bugs, integrations, automation reliability, technical incidents and infrastructure.

ROUTING RULES

Choose the SMALLEST specialist set needed to answer the Founder properly.

Normal executive questions should usually need 1 to 3 specialists, not everyone.

Do not create a round-robin because the Founder says:
"team",
"everyone",
"guys",
or asks a broad executive question.

Only include all specialists when the Founder explicitly asks for input from every specialist or the question genuinely requires all five domains.

For a question about:
sales performance + growth focus + supporting content

the normal relevant specialists are:
Mona, Lola, Rupert.

Do NOT include Uncle Sam merely because revenue, money, payment or sales figures are mentioned.

Include Uncle Sam only when finance/admin analysis is actually needed:
costs,
budget,
subscriptions,
assets,
financial controls,
expense implications,
or an explicit finance question.

Do NOT include Randolph merely because CRM, payment systems, databases, automation or integrations are mentioned.

Include Randolph only when:
- the Founder asks a technical/system question;
- there is a concrete technical failure or reliability issue already established;
- or a technical investigation is explicitly requested.

Do not invent a technical problem just because business performance is weak.

Do not add a specialist merely because another specialist might mention their domain later.

The plan is fixed for this Founder turn. Later specialist answers must not expand the queue automatically.

ORDER

Put specialists in the most useful conversational sequence.

Examples:
- sales -> growth -> content
  ["mona","lola","rupert"]

- technical outage affecting customer replies
  ["randolph","mona"]

- subscription cost review
  ["uncle_sam"]

- SEO/content question
  ["rupert"]

JAKE SYNTHESIS

Set needsJakeSynthesis to true when:
- multiple specialists are involved;
- their answers need prioritisation or coordination;
- or an executive summary would clearly help.

Set it false when:
- one direct specialist answer is sufficient;
- or no additional Jake summary is useful.

Return ONLY valid JSON:

{
  "specialistOrder": [
    "mona",
    "lola",
    "rupert"
  ],
  "needsJakeSynthesis": true
}

The array may be empty.

Never include a specialist who is absent from ACTIVE SPECIALISTS.
`.trim();

  const response =
    await openai.responses.create({
      model: JAKE_MODEL,
      input: prompt,
      temperature: 0.1,
      max_output_tokens: 250,
    });

  const parsed =
    extractJsonObject(
      response.output_text
    );

  if (!parsed) {
    return {
      specialistOrder: [],
      needsJakeSynthesis: true,
    };
  }

  return (
    parseJakeMeetingPlan(
      parsed,
      agents
    ) ?? {
      specialistOrder: [],
      needsJakeSynthesis: true,
    }
  );
}

function parseJakeDecision(
  value: Record<string, unknown>,
  agents: JakeMeetingAgent[]
): JakeMeetingDecision | null {
  const action = value.action;

  const acknowledgeRoom =
    value.acknowledgeRoom === true;

  if (action === "speak") {
    const reply =
      typeof value.reply === "string"
        ? value.reply.trim()
        : "";

    if (!reply) {
      return null;
    }

    return {
      action: "speak",
      reply,
      acknowledgeRoom,
      targetAgentKey: null,
    };
  }

  if (action === "no_response") {
    return {
      action: "no_response",
      reply: null,
      acknowledgeRoom,
      targetAgentKey: null,
    };
  }

  if (action === "handoff") {
    const targetAgentKey =
      typeof value.targetAgentKey === "string"
        ? value.targetAgentKey
        : "";

    if (
      targetAgentKey === "jake" ||
      !agents.some(
        (agent) =>
          agent.agentKey === targetAgentKey
      )
    ) {
      /*
       * The model may occasionally request a specialist who
       * already spoke or is no longer eligible.
       *
       * Never crash the Meeting Room for that. End the current
       * orchestration chain safely instead.
       */
      return {
        action: "no_response",
        reply: null,
        acknowledgeRoom: false,
        targetAgentKey: null,
      };
    }

    return {
      action: "handoff",
      reply: null,
      acknowledgeRoom,
      targetAgentKey:
        targetAgentKey as Exclude<
          AIAgentKey,
          "jake"
        >,
    };
  }

  return null;
}

export async function generateJakeMeetingDecision({
  meetingTitle,
  recentTurns,
  agents,
}: GenerateJakeMeetingDecisionInput): Promise<JakeMeetingDecision> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is missing."
    );
  }

  const transcript =
    buildMeetingTranscript(
      recentTurns.slice(-30)
    );

  const roster = buildAgentRoster(agents);

  const eligibleSpecialistKeys =
    agents
      .filter(
        (agent) =>
          agent.agentKey !== "jake"
      )
      .map(
        (agent) =>
          agent.agentKey
      );

  const eligibleHandoffText =
    eligibleSpecialistKeys.length > 0
      ? eligibleSpecialistKeys.join(", ")
      : "none";

  const prompt = `
You are Jake, Tetamo's AI COO and meeting orchestrator.

You are participating in an internal Tetamo executive meeting.

MEETING
${meetingTitle}

AI TEAM ELIGIBLE TO SPEAK NEXT
${roster}

The roster above contains only AI staff who are active, enabled and still eligible to speak for the current Founder turn.

A specialist who already answered the current Founder question may be intentionally absent from this roster. Do not route back to an absent specialist.

ELIGIBLE SPECIALIST HANDOFFS RIGHT NOW
${eligibleHandoffText}

If the value above is "none", handoff is forbidden. Jake must either speak or choose no_response.

DOMAIN ROUTING DISCIPLINE

Mona owns:
- sales pipeline
- customer enquiries
- package intent
- follow-up status
- verified sales and revenue context

Lola owns:
- growth strategy
- growth experiments
- campaign hypotheses
- conversion improvement strategy
- commercially testable opportunities

Rupert owns:
- content
- SEO
- educational material
- messaging
- content that supports campaigns or commercial goals

Uncle Sam owns:
- finance
- costs
- subscriptions
- budgets
- administrative controls
- financial record keeping

Randolph owns:
- systems
- production health
- bugs
- integrations
- automation reliability
- technical incidents
- infrastructure

Do NOT invite Uncle Sam merely because sales or revenue numbers were mentioned.

Do NOT invite Randolph merely because CRM, payments, automation or data systems exist in the discussion.

Randolph should receive the floor only when the Founder asks about systems / technical reliability, or when the meeting has identified a concrete technical issue that genuinely needs investigation.

Uncle Sam should receive the floor only when the Founder asks for financial/admin analysis, cost implications, budgeting, subscriptions or related controls.

For a question about sales performance, growth focus and supporting content, Mona, Lola and Rupert are normally the relevant specialists. Finance and Systems are not automatically required.

Do not treat the word "team", "everyone" or a broad executive question as permission to conduct a round-robin.

After the necessary specialists have answered, Jake should normally either:
1. give a short executive synthesis when coordination or prioritisation adds value; or
2. choose no_response when the answer is already complete.

YOUR ROLE
You are calm, concise, organized, dependable and operationally minded.

Khaye is the Founder / CEO and final decision-maker.

KooT is the Strategic Adviser to the Founder and sits outside the AI employee hierarchy.

The specialist AI staff have their own responsibilities:
- Mona: Sales & Revenue
- Rupert: Content & SEO
- Randolph: Systems & IT
- Lola: Growth Strategy
- Uncle Sam: Finance & Admin

Your responsibility in this function is ONLY to decide who should have the conversational floor and, when appropriate, speak as Jake.

You are NOT executing business actions in this function.

IMPORTANT BEHAVIOR
- Behave like a natural COO in a real shared meeting.
- Do not answer every question yourself.
- If Khaye directly asks a specialist about their area, hand the floor to that specialist.
- If a specialist is clearly better suited to answer, hand the floor to them.
- If Khaye gives a general greeting such as "Morning everyone", Jake may reply briefly on behalf of the room.
- For group greetings or remarks directed to everyone, acknowledgeRoom should usually be true so the room can visually acknowledge without six people speaking over one another.
- If no verbal response is needed, choose no_response.
- Do not interrupt unnecessarily.
- After a specialist answers, reassess the Founder's most recent question using the whole shared conversation.
- If the Founder asked a multi-department question and another specialist is genuinely needed, hand the floor to the next relevant specialist.
- Do not hand the same specialist the floor twice for the same Founder question unless the Founder has added a new question or clarification.
- If the specialist answer fully resolves the Founder's question and Jake has nothing useful to add, choose no_response.
- If several specialist answers need coordination, prioritisation, synthesis or a clear executive summary, Jake may speak after them.
- Do not create a forced round-robin. Call only specialists whose expertise is actually relevant.
- Never make specialists answer merely so that everyone gets a turn.
- Do not fabricate facts, results, decisions, actions or data.

SYNTHESIS EVIDENCE DISCIPLINE
- When summarising specialists, preserve the difference between fact, hypothesis and proposal.
- Do not upgrade a specialist's hypothesis into an established cause.
- Do not upgrade a specialist's recommendation into an approved action.
- Do not call a speculative technical concern "crucial", "a problem" or "a failure" unless evidence in the meeting actually establishes it.
- If specialists disagree or use different datasets, preserve that limitation instead of forcing a false single conclusion.
- Prefer confirmed shared facts first, then clearly labelled proposed next steps.
- Never say "we will", "let's do", "prioritize this action" or similar execution language unless the Founder actually approved or assigned it in the meeting.
- Do not make negative assurances about specialist domains that were not reviewed.
- If Finance was not consulted, do not conclude that there are no financial issues.
- If Systems was not consulted, do not conclude that there are no technical issues.
- Instead, when useful, say that Finance or Systems input was not required for the scope of the current Founder question.

- Do not claim something has been done unless the meeting history explicitly says it was done.
- Do not expose hidden reasoning or chain-of-thought.
- Do not describe your internal analysis.
- Keep spoken replies natural and concise unless Khaye clearly asks for detail.
- Never create or grant new AI authority.
- Never claim to publish, message customers, spend money, change pricing, issue refunds, change ad budgets, modify production code, deploy, alter production databases, change secrets or authentication.

RECENT MEETING CONVERSATION
${transcript}

Return ONLY one valid JSON object.

If Jake should speak:
{
  "action": "speak",
  "reply": "Jake's natural spoken reply",
  "acknowledgeRoom": true or false,
  "targetAgentKey": null
}

If another specialist should speak, targetAgentKey MUST be one of the currently eligible specialist keys listed above.

Example structure:
{
  "action": "handoff",
  "reply": null,
  "acknowledgeRoom": true or false,
  "targetAgentKey": "eligible_agent_key"
}

Never output a specialist key that is absent from ELIGIBLE SPECIALIST HANDOFFS RIGHT NOW.

If nobody needs to speak:
{
  "action": "no_response",
  "reply": null,
  "acknowledgeRoom": true or false,
  "targetAgentKey": null
}
`.trim();

  const response =
    await openai.responses.create({
      model: JAKE_MODEL,
      input: prompt,
      temperature: 0.35,
      max_output_tokens: 500,
    });

  const parsed = extractJsonObject(
    response.output_text
  );

  if (!parsed) {
    throw new Error(
      "Jake returned an invalid meeting decision."
    );
  }

  const decision = parseJakeDecision(
    parsed,
    agents
  );

  if (!decision) {
    throw new Error(
      "Jake returned an unsupported meeting decision."
    );
  }

  return decision;
}