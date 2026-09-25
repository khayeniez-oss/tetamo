import "server-only";

import { createClient } from "@supabase/supabase-js";

import {
  buildRevenueAnalytics,
  REPORTING_TIME_ZONE,
  type RevenueAnalytics,
} from "@/lib/reporting/revenue";

const PAGE_SIZE = 1000;
const MAX_ROWS = 50000;

const SALES_STAGES = [
  "new_inquiry",
  "lead",
  "agent_package",
  "owner_package",
  "developer_agency",
  "follow_up",
  "payment_started",
  "payment_failed",
  "closed_won",
  "closed_lost",
] as const;

export type BusinessSalesStage =
  (typeof SALES_STAGES)[number];

type ConversationRow = {
  id: string;
  sales_stage: string | null;
  sales_stage_updated_at: string | null;
  channel: string | null;
  ad_referral_source: string | null;
  free_entry_point_source: string | null;
  created_at: string | null;
};

type StageCounts =
  Record<BusinessSalesStage, number>;

export type BusinessGrowthAnalytics = {
  reportingTimezone: string;
  generatedAt: string;

  source: {
    conversationTable: "whatsapp_conversations";
    conversationRowsLoaded: number;
    conversationTotalRows: number | null;
    conversationsTruncated: boolean;

    historyTable: "whatsapp_sales_stage_history";
  };

  crmSnapshot: {
    totalConversations: number;

    stages: StageCounts;

    unknownStageConversations: number;

    commercial: {
      packageIntent: number;
      openCommercialPipeline: number;
      classifiedBeyondNewInquiry: number;
      paymentRecovery: number;

      terminal: {
        closedWon: number;
        closedLost: number;
      };
    };

    currentStageUpdatedRecently: {
      last7Days: number;
      last30Days: number;
      note: string;
    };

    channels: {
      meta: number;
      twilio: number;
      other: number;
    };

    attribution: {
      adAttributedConversations: number;
      nonAdOrUnknownConversations: number;
    };
  };

  stageHistory: {
    totalRows: number;
    automaticRows: number;
    manualRows: number;
    earliestHistory: string | null;
    latestHistory: string | null;

    automaticHistoryAvailable: boolean;
    historicalConversionReliable: false;

    warning: string;
  };

  verifiedBusiness: {
    today: RevenueAnalytics["summary"]["today"];
    month: RevenueAnalytics["summary"]["month"];
    total: RevenueAnalytics["summary"]["total"];

    customerTypes: RevenueAnalytics["customerTypes"];
  };
};

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

const CONVERSATION_SELECT =
  "id, sales_stage, sales_stage_updated_at, channel, ad_referral_source, free_entry_point_source, created_at";

function emptyStageCounts(): StageCounts {
  return {
    new_inquiry: 0,
    lead: 0,
    agent_package: 0,
    owner_package: 0,
    developer_agency: 0,
    follow_up: 0,
    payment_started: 0,
    payment_failed: 0,
    closed_won: 0,
    closed_lost: 0,
  };
}

function normalizeStage(
  value: unknown
): BusinessSalesStage | null {
  const stage = String(value || "")
    .trim()
    .toLowerCase();

  if (!stage) {
    return "new_inquiry";
  }

  return SALES_STAGES.includes(
    stage as BusinessSalesStage
  )
    ? (stage as BusinessSalesStage)
    : null;
}

function cleanLower(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isAfterCutoff(
  value: string | null,
  cutoff: number
) {
  if (!value) return false;

  const time =
    new Date(value).getTime();

  return (
    !Number.isNaN(time) &&
    time >= cutoff
  );
}

async function fetchConversations() {
  const rows: ConversationRow[] = [];

  const countResult =
    await supabaseAdmin
      .from("whatsapp_conversations")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      );

  if (countResult.error) {
    throw countResult.error;
  }

  for (
    let from = 0;
    from < MAX_ROWS;
    from += PAGE_SIZE
  ) {
    const to =
      from + PAGE_SIZE - 1;

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("whatsapp_conversations")
      .select(CONVERSATION_SELECT)
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .range(from, to);

    if (error) {
      throw error;
    }

    const pageRows =
      (data ||
        []) as ConversationRow[];

    rows.push(...pageRows);

    if (
      pageRows.length <
      PAGE_SIZE
    ) {
      break;
    }
  }

  return {
    rows,
    totalCount:
      countResult.count ?? null,

    truncated:
      countResult.count !== null
        ? rows.length <
          countResult.count
        : rows.length >=
          MAX_ROWS,
  };
}

async function countStageHistory() {
  const [
    totalResult,
    automaticResult,
    manualResult,
    earliestResult,
    latestResult,
  ] = await Promise.all([
    supabaseAdmin
      .from(
        "whatsapp_sales_stage_history"
      )
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      ),

    supabaseAdmin
      .from(
        "whatsapp_sales_stage_history"
      )
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .is(
        "changed_by",
        null
      ),

    supabaseAdmin
      .from(
        "whatsapp_sales_stage_history"
      )
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .not(
        "changed_by",
        "is",
        null
      ),

    supabaseAdmin
      .from(
        "whatsapp_sales_stage_history"
      )
      .select("changed_at")
      .order(
        "changed_at",
        {
          ascending: true,
        }
      )
      .limit(1)
      .maybeSingle(),

    supabaseAdmin
      .from(
        "whatsapp_sales_stage_history"
      )
      .select("changed_at")
      .order(
        "changed_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle(),
  ]);

  const errors = [
    totalResult.error,
    automaticResult.error,
    manualResult.error,
    earliestResult.error,
    latestResult.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw errors[0];
  }

  const automaticRows =
    automaticResult.count ?? 0;

  return {
    totalRows:
      totalResult.count ?? 0,

    automaticRows,

    manualRows:
      manualResult.count ?? 0,

    earliestHistory:
      earliestResult.data
        ?.changed_at ?? null,

    latestHistory:
      latestResult.data
        ?.changed_at ?? null,

    automaticHistoryAvailable:
      automaticRows > 0,
  };
}

function buildCrmSnapshot(
  rows: ConversationRow[]
) {
  const stages =
    emptyStageCounts();

  let unknownStageConversations = 0;

  let meta = 0;
  let twilio = 0;
  let other = 0;

  let adAttributedConversations = 0;

  let updatedLast7Days = 0;
  let updatedLast30Days = 0;

  const now = Date.now();

  const cutoff7 =
    now -
    7 * 24 * 60 * 60 * 1000;

  const cutoff30 =
    now -
    30 * 24 * 60 * 60 * 1000;

  for (const row of rows) {
    const stage =
      normalizeStage(
        row.sales_stage
      );

    if (stage) {
      stages[stage] += 1;
    } else {
      unknownStageConversations += 1;
    }

    const channel =
      cleanLower(row.channel);

    if (
      channel.includes("meta")
    ) {
      meta += 1;
    } else if (
      channel.includes("twilio")
    ) {
      twilio += 1;
    } else {
      other += 1;
    }

    if (
      String(
        row.ad_referral_source ||
          ""
      ).trim() ||
      cleanLower(
        row.free_entry_point_source
      ) ===
        "meta_click_to_whatsapp_ad"
    ) {
      adAttributedConversations += 1;
    }

    if (
      isAfterCutoff(
        row.sales_stage_updated_at,
        cutoff7
      )
    ) {
      updatedLast7Days += 1;
    }

    if (
      isAfterCutoff(
        row.sales_stage_updated_at,
        cutoff30
      )
    ) {
      updatedLast30Days += 1;
    }
  }

  const packageIntent =
    stages.agent_package +
    stages.owner_package +
    stages.developer_agency;

  const openCommercialPipeline =
    stages.lead +
    packageIntent +
    stages.follow_up +
    stages.payment_started;

  const classifiedBeyondNewInquiry =
    stages.lead +
    packageIntent +
    stages.follow_up +
    stages.payment_started +
    stages.payment_failed +
    stages.closed_won +
    stages.closed_lost;

  return {
    totalConversations:
      rows.length,

    stages,

    unknownStageConversations,

    commercial: {
      packageIntent,

      openCommercialPipeline,

      classifiedBeyondNewInquiry,

      paymentRecovery:
        stages.payment_failed,

      terminal: {
        closedWon:
          stages.closed_won,

        closedLost:
          stages.closed_lost,
      },
    },

    currentStageUpdatedRecently: {
      last7Days:
        updatedLast7Days,

      last30Days:
        updatedLast30Days,

      note:
        "These counts describe conversations whose CURRENT sales stage was last updated in the period. They are not historical stage-transition counts.",
    },

    channels: {
      meta,
      twilio,
      other,
    },

    attribution: {
      adAttributedConversations,

      nonAdOrUnknownConversations:
        rows.length -
        adAttributedConversations,
    },
  };
}

export async function buildBusinessGrowthAnalytics(): Promise<BusinessGrowthAnalytics> {
  const [
    conversationResult,
    history,
    revenue,
  ] = await Promise.all([
    fetchConversations(),
    countStageHistory(),
    buildRevenueAnalytics(),
  ]);

  return {
    reportingTimezone:
      REPORTING_TIME_ZONE,

    generatedAt:
      new Date().toISOString(),

    source: {
      conversationTable:
        "whatsapp_conversations",

      conversationRowsLoaded:
        conversationResult.rows.length,

      conversationTotalRows:
        conversationResult.totalCount,

      conversationsTruncated:
        conversationResult.truncated,

      historyTable:
        "whatsapp_sales_stage_history",
    },

    crmSnapshot:
      buildCrmSnapshot(
        conversationResult.rows
      ),

    stageHistory: {
      totalRows:
        history.totalRows,

      automaticRows:
        history.automaticRows,

      manualRows:
        history.manualRows,

      earliestHistory:
        history.earliestHistory,

      latestHistory:
        history.latestHistory,

      automaticHistoryAvailable:
        history.automaticHistoryAvailable,

      historicalConversionReliable:
        false,

      warning:
        "Historical sales-stage conversion is not yet reliable. Older automatic Mona stage changes were not recorded in whatsapp_sales_stage_history. Use the current CRM snapshot for current pipeline state and verified payment reporting for confirmed sales. Do not derive historical inquiry-to-Closed-Won conversion rates from incomplete stage history.",
    },

    verifiedBusiness: {
      today:
        revenue.summary.today,

      month:
        revenue.summary.month,

      total:
        revenue.summary.total,

      customerTypes:
        revenue.customerTypes,
    },
  };
}
