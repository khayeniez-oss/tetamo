import "server-only";

import OpenAI from "openai";

import type {
  AIAgentKey,
} from "@/lib/ai-team/permissions/agent-permissions";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const JAKE_OPERATIONS_MODEL = "gpt-4.1-mini";

export type JakeOperationsTurn = {
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

export type JakeOperationsAgent = {
  agentKey: AIAgentKey;
  displayName: string;
  roleTitle: string;
};

export type JakeCaptureKind =
  | "task"
  | "decision"
  | "investigation"
  | "follow_up"
  | "reminder"
  | "problem"
  | "defer"
  | "priority_change";

export type JakeOperationalCapture = {
  kind: JakeCaptureKind;

  dedupeKey: string;

  certainty:
    | "confirmed"
    | "tentative";

  title: string;

  description: string | null;

  ownerAgentKey:
    | AIAgentKey
    | null;

  priority:
    | "low"
    | "normal"
    | "high"
    | "critical";

  deadlineText: string | null;

  dueAt: string | null;

  expectedOutcome: string | null;

  requiresApproval: boolean;

  sourceExcerpt: string;
};

type GenerateJakeOperationalCapturesInput = {
  meetingTitle: string;
  recentTurns: JakeOperationsTurn[];
  agents: JakeOperationsAgent[];
};

const VALID_KINDS: JakeCaptureKind[] = [
  "task",
  "decision",
  "investigation",
  "follow_up",
  "reminder",
  "problem",
  "defer",
  "priority_change",
];

const VALID_PRIORITIES = [
  "low",
  "normal",
  "high",
  "critical",
] as const;

function buildMeetingTranscript(
  turns: JakeOperationsTurn[]
) {
  if (turns.length === 0) {
    return "(No meeting context.)";
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
  agents: JakeOperationsAgent[]
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
    // Continue.
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
      // Continue.
    }
  }

  const firstBrace =
    trimmed.indexOf("{");

  const lastBrace =
    trimmed.lastIndexOf("}");

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
      return extracted as Record<
        string,
        unknown
      >;
    }
  } catch {
    return null;
  }

  return null;
}

function cleanOptionalText(
  value: unknown
) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();

  return cleaned || null;
}

function parseAgentKey(
  value: unknown,
  agents: JakeOperationsAgent[]
): AIAgentKey | null {
  if (typeof value !== "string") {
    return null;
  }

  const match = agents.find(
    (agent) =>
      agent.agentKey === value
  );

  return match?.agentKey ?? null;
}

function parseCapture(
  value: unknown,
  agents: JakeOperationsAgent[]
): JakeOperationalCapture | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const row =
    value as Record<string, unknown>;

  const kind =
    typeof row.kind === "string"
      ? row.kind
      : "";

  if (
    !VALID_KINDS.includes(
      kind as JakeCaptureKind
    )
  ) {
    return null;
  }

  const dedupeKey =
    typeof row.dedupeKey === "string"
      ? row.dedupeKey
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_]+/g, "_")
          .replace(/^_+|_+$/g, "")
          .slice(0, 180)
      : "";

  if (!dedupeKey) {
    return null;
  }

  const certainty =
    row.certainty === "tentative"
      ? "tentative"
      : row.certainty === "confirmed"
        ? "confirmed"
        : null;

  if (!certainty) {
    return null;
  }

  const title =
    typeof row.title === "string"
      ? row.title.trim()
      : "";

  if (!title) {
    return null;
  }

  const priority =
    typeof row.priority === "string" &&
    VALID_PRIORITIES.includes(
      row.priority as
        | "low"
        | "normal"
        | "high"
        | "critical"
    )
      ? (
          row.priority as
            | "low"
            | "normal"
            | "high"
            | "critical"
        )
      : "normal";

  const sourceExcerpt =
    typeof row.sourceExcerpt === "string"
      ? row.sourceExcerpt.trim()
      : "";

  if (!sourceExcerpt) {
    return null;
  }

  const dueAt =
    cleanOptionalText(row.dueAt);

  return {
    kind:
      kind as JakeCaptureKind,

    dedupeKey,

    certainty,

    title:
      title.slice(0, 240),

    description:
      cleanOptionalText(
        row.description
      ),

    ownerAgentKey:
      parseAgentKey(
        row.ownerAgentKey,
        agents
      ),

    priority,

    deadlineText:
      cleanOptionalText(
        row.deadlineText
      ),

    dueAt,

    expectedOutcome:
      cleanOptionalText(
        row.expectedOutcome
      ),

    requiresApproval:
      row.requiresApproval === true,

    sourceExcerpt:
      sourceExcerpt.slice(
        0,
        500
      ),
  };
}

export async function generateJakeOperationalCaptures({
  meetingTitle,
  recentTurns,
  agents,
}: GenerateJakeOperationalCapturesInput): Promise<
  JakeOperationalCapture[]
> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is missing."
    );
  }

  const turns =
    recentTurns.slice(-20);

  const latestTurn =
    turns[turns.length - 1];

  if (
    !latestTurn ||
    latestTurn.speakerType !== "user"
  ) {
    return [];
  }

  const transcript =
    buildMeetingTranscript(turns);

  const roster =
    buildAgentRoster(agents);

  const now =
    new Date().toISOString();

  const prompt = `
You are Jake, Tetamo's AI COO.

This function is Jake's OPERATIONS CAPTURE brain.

It is completely separate from Jake's conversational floor-management function.

Your job here is NOT to answer the Founder and NOT to decide who speaks.

Your only job is to determine whether the FOUNDER'S NEWEST TURN creates operational work, a decision, a problem to record, or another structured management item.

MEETING
${meetingTitle}

CURRENT TIME
${now}

BUSINESS TIMEZONE
Asia/Makassar

AI TEAM
${roster}

RECENT MEETING CONTEXT
${transcript}

NEWEST FOUNDER TURN
${latestTurn.content}

IMPORTANT

Only capture meaning created or changed by the newest Founder turn.

Use prior conversation only to resolve references such as:
"do that tomorrow",
"yes lock that in",
"Randolph handle it",
"come back to this next week".

Do NOT recreate work merely because it appears earlier in the transcript.

Do NOT turn normal conversation, questions, opinions, brainstorming or greetings into tasks.

PRESENCE / CONVERSATIONAL CHECKS ARE NEVER OPERATIONAL CAPTURES.

Examples that must return NO capture:
"Randolph, are you there?"
"Mona, can you hear me?"
"Rupert, what do you think?"
"Everyone okay?"
"Are you ready?"
"Can you explain that?"
"Why did that happen?"
"What does that mean?"

A question becomes operational only when the Founder clearly asks for work to be performed, investigated, followed up, recorded, changed or decided.

Do NOT use keyword-only matching.

Understand the actual operational intent.

CAPTURE TYPES

task
A clear piece of work somebody must do.

investigation
The Founder asks someone to inspect, check, diagnose, verify, find out why, trace or investigate something.

follow_up
Something must be followed up, revisited or checked again later.

reminder
The Founder explicitly wants something remembered for later.

decision
The Founder clearly selects, locks in, approves, rejects or establishes a direction/rule.

problem
The Founder identifies a real issue, risk, failure or operational concern, but does not yet give a clear corrective task.

defer
The Founder explicitly parks, postpones or delays something.

priority_change
The Founder explicitly changes urgency or priority.

CERTAINTY

confirmed:
The Founder is clearly directing, deciding or committing.

Examples:
"Randolph, check Mona's follow-up tomorrow."
"Let's lock this in."
"We're not doing that anymore."
"Rupert needs to rewrite this."
"Come back to this next Friday."

tentative:
The Founder is brainstorming or considering.

Examples:
"Maybe Rupert should look at this."
"We could possibly change it."
"I think we may need Randolph to check."

Tentative items must NOT become committed tasks or decisions yet.

OWNERSHIP

Set ownerAgentKey only when the Founder explicitly assigns the work or the reference is clear from context.

Do not guess an owner merely because a specialist seems suitable.

If no owner is clearly assigned, use null.

DEADLINES

Preserve the Founder's natural deadline in deadlineText.

Examples:
"tomorrow"
"Friday"
"next week"
"before launch"
"today"

Set dueAt only when an actual date/time can be resolved without inventing a clock time.

Never invent 9 AM, 5 PM, end-of-day or another exact time when none was stated.

PRIORITY

Use impact, not dramatic wording.

critical:
Production outage, security/data risk, serious payment/customer harm or active major damage.

high:
Revenue issue, broken follow-up, blocked campaign or major deadline risk.

normal:
Ordinary operational work.

low:
Backlog, optional idea or non-urgent improvement.

APPROVAL

requiresApproval means the task cannot proceed to its risky/external execution stage without a separate Founder approval.

Examples:
publishing externally,
spending money,
refunds,
pricing changes,
production changes,
credential/security changes,
sensitive customer actions,
staff authority changes.

If the Founder explicitly gives exact-scope approval in the newest turn, do not ask for the same approval again.

A task can still require approval later if the Founder only asks someone to prepare, investigate or propose the change.

DECISIONS

If the Founder says:
"I approve..."
"lock that in"
"that's the decision"
"we're going with..."
"from now on..."
capture a confirmed decision.

Do not silently turn a decision into a task unless the Founder also directs work.

DEDUPLICATION KEY

Every capture must include dedupeKey.

dedupeKey identifies the underlying operational work or decision, NOT the exact sentence wording.

Use lowercase snake_case.

It should remain stable when the Founder repeats or rephrases the same instruction.

Ignore:
- polite wording,
- sentence wording,
- repeated confirmation,
- deadline wording when the underlying task itself is unchanged.

Include enough meaning to distinguish genuinely different work.

Examples:

"Randolph, check Mona's follow-up tomorrow."
"Randolph, verify Mona's follow-up system tomorrow."

Both should use something like:

randolph_investigate_mona_followup

"Rupert, rewrite the owner listing caption"
should use something like:

rupert_rewrite_owner_listing_caption

Do NOT reuse a dedupeKey when the Founder clearly creates a separate piece of work.

MULTIPLE ITEMS

One Founder turn may create multiple captures.

Example:
"Randolph investigate the failed scheduler tomorrow, and Rupert hold the campaign until we know what happened."

That should create separate operational captures.

Return ONLY valid JSON in this exact structure:

{
  "captures": [
    {
      "kind": "task | decision | investigation | follow_up | reminder | problem | defer | priority_change",
      "dedupeKey": "stable_lowercase_snake_case_operational_identity",
      "certainty": "confirmed | tentative",
      "title": "short management title",
      "description": "plain-language detail or null",
      "ownerAgentKey": "jake | mona | rupert | randolph | lola | uncle_sam | null",
      "priority": "low | normal | high | critical",
      "deadlineText": "Founder's deadline wording or null",
      "dueAt": "ISO timestamp only if safely resolvable, otherwise null",
      "expectedOutcome": "clear expected result or null",
      "requiresApproval": false,
      "sourceExcerpt": "brief exact excerpt from newest Founder turn"
    }
  ]
}

If there is nothing operational to capture:

{
  "captures": []
}
`.trim();

  const response =
    await openai.responses.create({
      model:
        JAKE_OPERATIONS_MODEL,
      input: prompt,
      temperature: 0.15,
      max_output_tokens: 1200,
    });

  const parsed =
    extractJsonObject(
      response.output_text
    );

  if (!parsed) {
    throw new Error(
      "Jake Operations returned invalid JSON."
    );
  }

  const rawCaptures =
    Array.isArray(parsed.captures)
      ? parsed.captures
      : [];

  return rawCaptures
    .map((capture) =>
      parseCapture(
        capture,
        agents
      )
    )
    .filter(
      (
        capture
      ): capture is JakeOperationalCapture =>
        capture !== null
    )
    .slice(0, 12);
}
