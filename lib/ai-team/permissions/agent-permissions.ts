import "server-only";

export const AI_AGENT_KEYS = [
  "jake",
  "mona",
  "rupert",
  "randolph",
  "lola",
  "uncle_sam",
] as const;

export type AIAgentKey =
  (typeof AI_AGENT_KEYS)[number];

export const AI_ACTIONS = [
  "read_ai_team_data",
  "create_internal_task",
  "update_internal_task",
  "create_report",
  "create_insight",
  "create_handoff",
  "prepare_meeting",
  "create_meeting_item",
  "propose_decision",
  "request_approval",

  "read_sales_data",
  "read_content_data",
  "read_analytics_data",
  "read_finance_data",
  "read_system_data",
  "read_competitor_data",
  "research_public_web",

  "draft_content",
  "propose_growth_experiment",
  "record_incident",
  "diagnose_system_issue",
  "prepare_code_change",

  "publish_content",
  "send_external_message",
  "change_pricing",
  "spend_money",
  "issue_refund",
  "change_ad_budget",
  "modify_production_code",
  "deploy_production",
  "modify_production_database",
  "change_secrets",
  "change_auth_security",
  "grant_agent_authority",
] as const;

export type AIAction =
  (typeof AI_ACTIONS)[number];

type AgentPermissionPolicy = {
  allowed: readonly AIAction[];
  prohibited: readonly AIAction[];
};

const NEVER_AUTONOMOUS_ACTIONS = [
  "publish_content",
  "send_external_message",
  "change_pricing",
  "spend_money",
  "issue_refund",
  "change_ad_budget",
  "modify_production_code",
  "deploy_production",
  "modify_production_database",
  "change_secrets",
  "change_auth_security",
  "grant_agent_authority",
] as const satisfies readonly AIAction[];

export const AGENT_PERMISSION_POLICIES: Record<
  AIAgentKey,
  AgentPermissionPolicy
> = {
  jake: {
    allowed: [
      "read_ai_team_data",
      "create_internal_task",
      "update_internal_task",
      "create_report",
      "create_insight",
      "create_handoff",
      "prepare_meeting",
      "create_meeting_item",
      "propose_decision",
      "request_approval",
      "read_sales_data",
      "read_content_data",
      "read_analytics_data",
      "read_finance_data",
      "read_system_data",
      "read_competitor_data",
    ],
    prohibited: NEVER_AUTONOMOUS_ACTIONS,
  },

  mona: {
    allowed: [
      "read_ai_team_data",
      "create_internal_task",
      "update_internal_task",
      "create_report",
      "create_insight",
      "create_handoff",
      "create_meeting_item",
      "request_approval",
      "read_sales_data",
    ],
    prohibited: NEVER_AUTONOMOUS_ACTIONS,
  },

  rupert: {
    allowed: [
      "read_ai_team_data",
      "create_internal_task",
      "update_internal_task",
      "create_report",
      "create_insight",
      "create_handoff",
      "create_meeting_item",
      "request_approval",
      "read_content_data",
      "read_analytics_data",
      "research_public_web",
      "draft_content",
    ],
    prohibited: NEVER_AUTONOMOUS_ACTIONS,
  },

  randolph: {
    allowed: [
      "read_ai_team_data",
      "create_internal_task",
      "update_internal_task",
      "create_report",
      "create_insight",
      "create_handoff",
      "create_meeting_item",
      "request_approval",
      "read_system_data",
      "record_incident",
      "diagnose_system_issue",
      "prepare_code_change",
    ],
    prohibited: NEVER_AUTONOMOUS_ACTIONS,
  },

  lola: {
    allowed: [
      "read_ai_team_data",
      "create_internal_task",
      "update_internal_task",
      "create_report",
      "create_insight",
      "create_handoff",
      "create_meeting_item",
      "request_approval",
      "read_sales_data",
      "read_content_data",
      "read_analytics_data",
      "read_finance_data",
      "read_competitor_data",
      "propose_growth_experiment",
    ],
    prohibited: NEVER_AUTONOMOUS_ACTIONS,
  },

  uncle_sam: {
    allowed: [
      "read_ai_team_data",
      "create_internal_task",
      "update_internal_task",
      "create_report",
      "create_insight",
      "create_handoff",
      "create_meeting_item",
      "request_approval",
      "read_finance_data",
    ],
    prohibited: NEVER_AUTONOMOUS_ACTIONS,
  },
};

export function isAIAgentKey(
  value: unknown
): value is AIAgentKey {
  return (
    typeof value === "string" &&
    AI_AGENT_KEYS.includes(value as AIAgentKey)
  );
}

export function canAgentPerformAction(
  agent: AIAgentKey,
  action: AIAction
) {
  const policy =
    AGENT_PERMISSION_POLICIES[agent];

  if (
    policy.prohibited.includes(
      action as (typeof policy.prohibited)[number]
    )
  ) {
    return false;
  }

  return policy.allowed.includes(action);
}

export function requireAgentPermission(
  agent: AIAgentKey,
  action: AIAction
) {
  if (!canAgentPerformAction(agent, action)) {
    throw new Error(
      `AI agent "${agent}" is not permitted to perform "${action}".`
    );
  }
}