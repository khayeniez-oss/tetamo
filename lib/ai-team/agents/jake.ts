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