import "server-only";

import {
  aiTeamSupabaseAdmin,
} from "@/lib/ai-team/core/admin-auth";

import {
  classifyInquiryMessages,
  redactInquiryText,
  type InquiryClassification,
} from "@/lib/ai-team/inquiry-intelligence/classifier";

import {
  canAgentPerformAction,
} from "@/lib/ai-team/permissions/agent-permissions";

const BRIDGE_KEY =
  "mona_meta_content_intelligence";

const SOURCE_GROUNDED_RECURRING_THEMES =
  new Set([
    "tetamo_property_listing_process",
    "pricing_value_objection",
    "tetamo_package_selection",
    "tetamo_payment_methods",
    "payment_timing_after_sale",
    "tetamo_pricing_inquiry",
    "property_price_inquiry",
  ]);

type InquirySettings = {
  id: string;
  bridge_key: string;
  enabled: boolean;
  auto_create_insights: boolean;
  auto_create_handoffs: boolean;
  auto_create_tasks: boolean;
  lookback_days: number;
  max_messages_per_run: number;
  minimum_theme_signals: number;
  minimum_content_score: number;
  minimum_growth_score: number;
};

type SourceMessage = {
  id: string;
  conversation_id: string | null;
  message: string | null;
  created_at: string | null;
};

type ThemeSnapshot = {
  id: string;
  theme_key: string;
  title: string;
  signal_count: number;
  distinct_conversation_count: number;
  content_score: number;
  growth_score: number;
  confidence: string;
  status: string;
};

type QualifiedThemeRow = {
  id: string;
  theme_key: string;
  title: string;
  summary: string;
  signal_count: number;
  distinct_conversation_count: number;
  last_seen_at: string | null;
  customer_types: unknown;
  representative_questions: unknown;
  content_score: number;
  growth_score: number;
  confidence: string;
  status: string;
  latest_insight_id: string | null;
};

type ExistingThemeInsight = {
  id: string;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function cleanString(
  value: unknown
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function safeSummary(
  value: unknown
) {
  return redactInquiryText(
    cleanString(value)
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function isUsableSourceMessage(
  row: SourceMessage
) {
  const message =
    cleanString(
      row.message
    );

  if (
    !row.id ||
    !row.conversation_id ||
    !row.created_at ||
    !message
  ) {
    return false;
  }

  if (
    /^\[Customer sent\b/i.test(
      message
    )
  ) {
    return false;
  }

  return true;
}

async function loadSettings():
Promise<InquirySettings> {
  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_inquiry_intelligence_settings"
      )
      .select(
        [
          "id",
          "bridge_key",
          "enabled",
          "auto_create_insights",
          "auto_create_handoffs",
          "auto_create_tasks",
          "lookback_days",
          "max_messages_per_run",
          "minimum_theme_signals",
          "minimum_content_score",
          "minimum_growth_score",
        ].join(",")
      )
      .eq(
        "bridge_key",
        BRIDGE_KEY
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load inquiry intelligence settings: ${error.message}`
    );
  }

  if (!data) {
    throw new Error(
      "Inquiry intelligence settings row not found."
    );
  }

  return data as unknown as InquirySettings;
}

async function loadUnprocessedMessages(
  params: {
    limit: number;
    lookbackDays: number;
    sourceMessageIds?: string[];
  }
) {
  const cutoff =
    new Date(
      Date.now() -
        params.lookbackDays *
          24 *
          60 *
          60 *
          1000
    ).toISOString();

  /*
   * READ ONLY from Mona's already-saved source data.
   *
   * Deliberately does not select:
   * phone, profile_name, from_number, to_number or raw_payload.
   */
  let sourceQuery =
    aiTeamSupabaseAdmin
      .from(
        "whatsapp_messages"
      )
      .select(
        "id, conversation_id, message, created_at"
      )
      .eq(
        "direction",
        "inbound"
      )
      .eq(
        "provider",
        "meta"
      )
      .eq(
        "ai_generated",
        false
      )
      .eq(
        "admin_generated",
        false
      );

  if (
    params.sourceMessageIds?.length
  ) {
    sourceQuery =
      sourceQuery.in(
        "id",
        params.sourceMessageIds
      );
  } else {
    sourceQuery =
      sourceQuery.gte(
        "created_at",
        cutoff
      );
  }

  const {
    data,
    error,
  } =
    await sourceQuery
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(
        Math.min(
          Math.max(
            params.limit * 8,
            50
          ),
          500
        )
      );

  if (error) {
    throw new Error(
      `Unable to read Meta inquiry source messages: ${error.message}`
    );
  }

  const candidates =
    (
      (data || []) as unknown as
        SourceMessage[]
    )
      .filter(
        isUsableSourceMessage
      );

  if (
    params.sourceMessageIds?.length
  ) {
    const foundIds =
      new Set(
        candidates.map(
          (row) =>
            row.id
        )
      );

    const missingCount =
      params.sourceMessageIds
        .filter(
          (id) =>
            !foundIds.has(
              id
            )
        )
        .length;

    if (missingCount > 0) {
      throw new Error(
        `Explicit inquiry source selection could not resolve ${missingCount} requested message(s) through the safe Meta inbound filters.`
      );
    }
  }

  if (!candidates.length) {
    return [];
  }

  const candidateIds =
    candidates.map(
      (row) =>
        row.id
    );

  const {
    data: processedRows,
    error: processedError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_inquiry_signals"
      )
      .select(
        "source_message_id"
      )
      .in(
        "source_message_id",
        candidateIds
      );

  if (processedError) {
    throw new Error(
      `Unable to check processed inquiry messages: ${processedError.message}`
    );
  }

  const processedIds =
    new Set(
      (
        processedRows || []
      ).map(
        (row: {
          source_message_id:
            string;
        }) =>
          row.source_message_id
      )
    );

  return candidates
    .filter(
      (row) =>
        !processedIds.has(
          row.id
        )
    )
    .slice(
      0,
      params.limit
    );
}

function shouldCreateInquiryTheme(
  classification:
    InquiryClassification
) {
  if (
    classification.privacyStatus !==
      "sanitized" ||
    !classification.themeKey
  ) {
    return false;
  }

  /*
   * Keep safe low-value messages as audit signals without
   * polluting Lola's aggregated theme universe.
   *
   * Strong model-approved content candidates are allowed.
   *
   * Otherwise, a transferable inquiry must:
   * - represent an actual inquiry/objection/pain point/etc.,
   * - and have meaningful Content or Growth relevance.
   */
  if (
    classification.contentCandidate
  ) {
    return true;
  }

  if (
    classification.inquiryKind ===
      "other"
  ) {
    return false;
  }

  /*
   * These commercial themes are deterministically grounded in
   * the original sanitized customer message by classifier.ts.
   *
   * Once the source itself proves one of these inquiry themes,
   * do not let unstable model relevance scores prevent the
   * signal from participating in recurrence detection.
   *
   * Keep tetamo_property_listing_process out of this set for now:
   * some of its canonicalization paths still depend on
   * model-generated key/title/summary evidence.
   */
  if (
    SOURCE_GROUNDED_RECURRING_THEMES.has(
      classification.themeKey
    )
  ) {
    return true;
  }

  return (
    classification.contentRelevance >=
      60 ||
    classification.growthRelevance >=
      60
  );
}

async function getOrCreateTheme(
  classification:
    InquiryClassification
) {
  if (
    !shouldCreateInquiryTheme(
      classification
    )
  ) {
    return null;
  }

  const {
    data: existing,
    error: existingError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_inquiry_themes"
      )
      .select(
        "id, theme_key"
      )
      .eq(
        "theme_key",
        classification.themeKey
      )
      .maybeSingle();

  if (existingError) {
    throw new Error(
      `Unable to check inquiry theme: ${existingError.message}`
    );
  }

  if (existing?.id) {
    return String(
      existing.id
    );
  }

  const {
    data: created,
    error: createError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_inquiry_themes"
      )
      .insert({
        theme_key:
          classification.themeKey,

        title:
          safeSummary(
            classification.themeTitle
          ) ||
          classification.themeKey,

        summary:
          safeSummary(
            classification.questionSummary
          ) ||
          "Anonymized customer inquiry theme.",

        signal_count:
          0,

        distinct_conversation_count:
          0,

        content_score:
          0,

        growth_score:
          0,

        confidence:
          "unknown",

        status:
          "observing",

        metadata: {
          source:
            "meta_inquiry_intelligence",
        },
      })
      .select(
        "id"
      )
      .single();

  if (
    createError?.code ===
    "23505"
  ) {
    const {
      data: raced,
      error: racedError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_inquiry_themes"
        )
        .select(
          "id"
        )
        .eq(
          "theme_key",
          classification.themeKey
        )
        .single();

    if (
      racedError ||
      !raced?.id
    ) {
      throw new Error(
        "Inquiry theme concurrent creation could not be recovered."
      );
    }

    return String(
      raced.id
    );
  }

  if (
    createError ||
    !created?.id
  ) {
    throw new Error(
      `Unable to create inquiry theme: ${
        createError?.message ||
        "Missing theme id."
      }`
    );
  }

  return String(
    created.id
  );
}

function confidenceLabel(
  params: {
    distinctConversations:
      number;
    averageConfidence:
      number;
  }
) {
  if (
    params.distinctConversations >=
      3 &&
    params.averageConfidence >=
      0.8
  ) {
    return "confirmed";
  }

  if (
    params.distinctConversations >=
      2 &&
    params.averageConfidence >=
      0.7
  ) {
    return "probable";
  }

  if (
    params.averageConfidence >=
    0.5
  ) {
    return "possible";
  }

  return "unknown";
}

async function rebuildTheme(
  params: {
    themeId: string;
    settings:
      InquirySettings;
  }
) {
  const {
    data: theme,
    error: themeError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_inquiry_themes"
      )
      .select(
        "id, status, theme_key"
      )
      .eq(
        "id",
        params.themeId
      )
      .single();

  if (
    themeError ||
    !theme
  ) {
    throw new Error(
      `Unable to load inquiry theme for aggregation: ${
        themeError?.message ||
        "Theme missing."
      }`
    );
  }

  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_inquiry_signals"
      )
      .select(
        [
          "source_conversation_id",
          "source_created_at",
          "customer_type",
          "question_summary",
          "content_relevance",
          "growth_relevance",
          "confidence",
          "content_candidate",
          "privacy_status",
        ].join(",")
      )
      .eq(
        "theme_id",
        params.themeId
      )
      .order(
        "source_created_at",
        {
          ascending:
            true,
        }
      );

  if (error) {
    throw new Error(
      `Unable to aggregate inquiry theme: ${error.message}`
    );
  }

  const rows =
    (data || []) as unknown as
      Array<{
        source_conversation_id:
          string;
        source_created_at:
          string;
        customer_type:
          string;
        question_summary:
          string;
        content_relevance:
          number;
        growth_relevance:
          number;
        confidence:
          number;
        content_candidate:
          boolean;
        privacy_status:
          string;
      }>;

  if (!rows.length) {
    return;
  }

  const conversationIds =
    new Set(
      rows.map(
        (row) =>
          row.source_conversation_id
      )
    );

  const contentScore =
    Math.round(
      rows.reduce(
        (sum, row) =>
          sum +
          Number(
            row.content_relevance ||
            0
          ),
        0
      ) /
        rows.length
    );

  const growthScore =
    Math.round(
      rows.reduce(
        (sum, row) =>
          sum +
          Number(
            row.growth_relevance ||
            0
          ),
        0
      ) /
        rows.length
    );

  const averageConfidence =
    rows.reduce(
      (sum, row) =>
        sum +
        Number(
          row.confidence ||
          0
        ),
      0
    ) /
    rows.length;

  const customerTypeCounts =
    new Map<
      string,
      number
    >();

  for (
    const row of rows
  ) {
    const key =
      cleanString(
        row.customer_type
      ) || "unknown";

    customerTypeCounts.set(
      key,
      (
        customerTypeCounts.get(
          key
        ) || 0
      ) + 1
    );
  }

  const customerTypes =
    Array.from(
      customerTypeCounts.entries()
    )
      .map(
        ([type, count]) => ({
          type,
          count,
        })
      )
      .sort(
        (a, b) =>
          b.count -
          a.count
      );

  const representativeQuestions =
    Array.from(
      new Set(
        rows
          .filter(
            (row) =>
              row.privacy_status ===
              "sanitized"
          )
          .sort(
            (a, b) =>
              Number(
                b.content_relevance
              ) -
              Number(
                a.content_relevance
              )
          )
          .map(
            (row) =>
              safeSummary(
                row.question_summary
              )
          )
          .filter(Boolean)
      )
    )
      .slice(
        0,
        5
      );

  const currentStatus =
    cleanString(
      theme.status
    );

  const protectedStatuses =
    new Set([
      "handed_off",
      "dismissed",
      "resolved",
    ]);

  const hasMinimumRecurrence =
    conversationIds.size >=
    params.settings
      .minimum_theme_signals;

  const isSourceGroundedRecurringTheme =
    SOURCE_GROUNDED_RECURRING_THEMES.has(
      cleanString(
        theme.theme_key
      )
    );

  const meetsModelScoreThresholds =
    contentScore >=
      params.settings
        .minimum_content_score &&
    growthScore >=
      params.settings
        .minimum_growth_score;

  const calculatedStatus =
    hasMinimumRecurrence &&
    (
      isSourceGroundedRecurringTheme ||
      meetsModelScoreThresholds
    )
      ? "qualified"
      : "observing";

  const nextStatus =
    protectedStatuses.has(
      currentStatus
    )
      ? currentStatus
      : calculatedStatus;

  const confidence =
    confidenceLabel({
      distinctConversations:
        conversationIds.size,

      averageConfidence,
    });

  const {
    error: updateError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_inquiry_themes"
      )
      .update({
        signal_count:
          rows.length,

        distinct_conversation_count:
          conversationIds.size,

        first_seen_at:
          rows[0]
            ?.source_created_at ||
          null,

        last_seen_at:
          rows[
            rows.length - 1
          ]
            ?.source_created_at ||
          null,

        customer_types:
          customerTypes,

        representative_questions:
          representativeQuestions,

        content_score:
          contentScore,

        growth_score:
          growthScore,

        confidence,

        status:
          nextStatus,
      })
      .eq(
        "id",
        params.themeId
      );

  if (updateError) {
    throw new Error(
      `Unable to update inquiry theme aggregation: ${updateError.message}`
    );
  }
}

async function loadThemeSnapshots(
  themeIds:
    string[]
): Promise<
  ThemeSnapshot[]
> {
  if (!themeIds.length) {
    return [];
  }

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
          "signal_count",
          "distinct_conversation_count",
          "content_score",
          "growth_score",
          "confidence",
          "status",
        ].join(",")
      )
      .in(
        "id",
        themeIds
      )
      .order(
        "content_score",
        {
          ascending:
            false,
        }
      );

  if (error) {
    throw new Error(
      `Unable to load inquiry theme summary: ${error.message}`
    );
  }

  return (
    data || []
  ) as unknown as
    ThemeSnapshot[];
}

function safeCustomerTypes(
  value: unknown
) {
  if (!Array.isArray(value)) {
    return [];
  }

  const allowed =
    new Set([
      "agent",
      "owner",
      "agency",
      "developer",
      "buyer_renter",
      "unknown",
    ]);

  return value
    .flatMap(
      (item) => {
        if (
          !item ||
          typeof item !==
            "object" ||
          Array.isArray(item)
        ) {
          return [];
        }

        const record =
          item as
            Record<
              string,
              unknown
            >;

        const type =
          cleanString(
            record.type
          );

        const count =
          Math.max(
            0,
            Math.trunc(
              Number(
                record.count
              ) || 0
            )
          );

        if (
          !allowed.has(
            type
          ) ||
          count < 1
        ) {
          return [];
        }

        return [
          {
            type,
            count,
          },
        ];
      }
    )
    .slice(
      0,
      10
    );
}

function safeRepresentativeQuestions(
  value: unknown
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map(
          (item) =>
            safeSummary(
              item
            )
        )
        .filter(Boolean)
    )
  ).slice(
    0,
    5
  );
}

function insightConfidence(
  value: unknown
) {
  const confidence =
    cleanString(
      value
    );

  if (
    confidence ===
      "confirmed" ||
    confidence ===
      "probable" ||
    confidence ===
      "possible"
  ) {
    return confidence;
  }

  return "unknown";
}

function buildThemeEvidenceKey(
  theme:
    QualifiedThemeRow
) {
  return [
    theme.id,
    theme.signal_count,
    theme
      .distinct_conversation_count,
    theme.last_seen_at ||
      "",
    theme.content_score,
    theme.growth_score,
    theme.confidence,
  ].join(":");
}

async function loadLolaInsightOwner() {
  if (
    !canAgentPerformAction(
      "lola",
      "create_insight"
    )
  ) {
    throw new Error(
      "Lola does not have permission to own AI insights."
    );
  }

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
        "lola"
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load Lola AI Team profile: ${error.message}`
    );
  }

  if (!data?.id) {
    throw new Error(
      "Lola is not configured in the AI Team."
    );
  }

  /*
   * Owning an internal insight does NOT execute Lola.
   *
   * status/enabled are deliberately not treated as an
   * execution guard here. No Lola model call occurs.
   */
  return data;
}

async function loadQualifiedThemes(
  settings:
    InquirySettings
): Promise<
  QualifiedThemeRow[]
> {
  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_inquiry_themes"
      )
      .select(
        "id, theme_key, title, summary, signal_count, distinct_conversation_count, last_seen_at, customer_types, representative_questions, content_score, growth_score, confidence, status, latest_insight_id"
      )
      .eq(
        "status",
        "qualified"
      )
      .gte(
        "distinct_conversation_count",
        settings
          .minimum_theme_signals
      )
      .gte(
        "content_score",
        settings
          .minimum_content_score
      )
      .gte(
        "growth_score",
        settings
          .minimum_growth_score
      )
      .order(
        "last_seen_at",
        {
          ascending:
            false,
        }
      )
      .limit(
        100
      );

  if (error) {
    throw new Error(
      `Unable to load qualified inquiry themes: ${error.message}`
    );
  }

  return (
    data || []
  ) as unknown as
    QualifiedThemeRow[];
}

async function findLatestThemeInsight(
  params: {
    agentId: string;
    themeId: string;
  }
): Promise<
  ExistingThemeInsight |
  null
> {
  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_insights"
      )
      .select(
        "id, status, metadata, created_at"
      )
      .eq(
        "agent_id",
        params.agentId
      )
      .eq(
        "related_entity_type",
        "ai_inquiry_theme"
      )
      .eq(
        "related_entity_id",
        params.themeId
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(
        1
      );

  if (error) {
    throw new Error(
      `Unable to inspect existing inquiry insight: ${error.message}`
    );
  }

  return (
    data?.[0] ??
    null
  ) as unknown as
    ExistingThemeInsight |
    null;
}

async function linkThemeToInsight(
  params: {
    themeId: string;
    insightId: string;
  }
) {
  const {
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_inquiry_themes"
      )
      .update({
        latest_insight_id:
          params.insightId,
      })
      .eq(
        "id",
        params.themeId
      );

  if (error) {
    throw new Error(
      `Unable to link inquiry theme to insight: ${error.message}`
    );
  }
}

async function ensureInquiryInsightActivity(
  params: {
    agentId: string;
    actorUserId: string | null;
    insightId: string;
    insightCreatedAt:
      string | null;
    theme:
      QualifiedThemeRow;
    auditContext:
      | "new_insight"
      | "existing_insight"
      | "race_winner";
  }
) {
  const {
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_activity"
      )
      .insert({
        agent_id:
          params.agentId,

        actor_user_id:
          params.actorUserId,

        event_type:
          "inquiry_intelligence",

        action:
          "created_inquiry_theme_insight",

        entity_type:
          "ai_insight",

        entity_id:
          params.insightId,

        task_id:
          null,

        severity:
          "info",

        details: {
          insight_id:
            params.insightId,

          insight_created_at:
            params.insightCreatedAt,

          theme_id:
            params.theme.id,

          theme_key:
            params.theme.theme_key,

          signal_count:
            params.theme
              .signal_count,

          distinct_conversation_count:
            params.theme
              .distinct_conversation_count,

          content_score:
            params.theme
              .content_score,

          growth_score:
            params.theme
              .growth_score,

          confidence:
            insightConfidence(
              params.theme
                .confidence
            ),

          audit_context:
            params.auditContext,

          lola_execution_performed:
            false,

          rupert_handoff_created:
            false,

          task_created:
            false,
        },
      });

  /*
   * The narrow partial unique index guarantees
   * exactly one creation-audit row per inquiry insight.
   *
   * A duplicate therefore means the required audit
   * already exists and is safe to suppress.
   */
  if (
    error?.code ===
    "23505"
  ) {
    return {
      created:
        false,

      alreadyExisted:
        true,
    };
  }

  if (error) {
    throw new Error(
      `Unable to ensure inquiry insight audit activity: ${error.message}`
    );
  }

  return {
    created:
      true,

    alreadyExisted:
      false,
  };
}

async function createQualifiedThemeInsights(
  params: {
    settings:
      InquirySettings;
    actorUserId:
      string | null;
  }
) {
  if (
    !params.settings
      .auto_create_insights
  ) {
    return {
      enabled:
        false,

      eligibleThemes:
        0,

      created:
        0,

      suppressed:
        0,

      insights: [],
    };
  }

  const [
    lola,
    themes,
  ] =
    await Promise.all([
      loadLolaInsightOwner(),

      loadQualifiedThemes(
        params.settings
      ),
    ]);

  let created =
    0;

  let suppressed =
    0;

  const createdInsights:
    Array<{
      insightId:
        string;
      themeId:
        string;
      themeKey:
        string;
    }> = [];

  const activeStatuses =
    new Set([
      "open",
      "reviewing",
      "actioned",
    ]);

  for (
    const theme of
      themes
  ) {
    const evidenceKey =
      buildThemeEvidenceKey(
        theme
      );

    const existing =
      await findLatestThemeInsight({
        agentId:
          String(
            lola.id
          ),

        themeId:
          theme.id,
      });

    if (existing) {
      const existingMetadata =
        existing.metadata &&
        typeof existing.metadata ===
          "object" &&
        !Array.isArray(
          existing.metadata
        )
          ? existing.metadata
          : {};

      const existingEvidenceKey =
        cleanString(
          existingMetadata[
            "theme_evidence_key"
          ]
        );

      const active =
        activeStatuses.has(
          cleanString(
            existing.status
          )
        );

      /*
       * Active insight:
       * never duplicate it.
       *
       * Resolved/dismissed insight:
       * only create a future insight when the aggregate
       * evidence has actually changed.
       */
      if (
        active ||
        existingEvidenceKey ===
          evidenceKey
      ) {
        if (
          theme
            .latest_insight_id !==
          existing.id
        ) {
          await linkThemeToInsight({
            themeId:
              theme.id,

            insightId:
              existing.id,
          });
        }

        await ensureInquiryInsightActivity({
          agentId:
            String(
              lola.id
            ),

          actorUserId:
            params.actorUserId,

          insightId:
            existing.id,

          insightCreatedAt:
            existing.created_at ??
            null,

          theme,

          auditContext:
            "existing_insight",
        });

        suppressed +=
          1;

        continue;
      }
    }

    const questions =
      safeRepresentativeQuestions(
        theme
          .representative_questions
      );

    const customerTypes =
      safeCustomerTypes(
        theme.customer_types
      );

    const title =
      (
        safeSummary(
          theme.title
        ) ||
        "Recurring customer inquiry"
      ).slice(
        0,
        180
      );

    const themeSummary =
      safeSummary(
        theme.summary
      );

    const summary = [
      `Recurring customer inquiry detected across ${theme.distinct_conversation_count} distinct conversations and ${theme.signal_count} sanitized signals.`,

      themeSummary,
    ]
      .filter(Boolean)
      .join(" ")
      .slice(
        0,
        1200
      );

    const {
      data:
        insight,
      error:
        insightError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_insights"
        )
        .insert({
          agent_id:
            lola.id,

          insight_type:
            "trend",

          title:
            `Customer inquiry trend: ${title}`,

          summary,

          confidence:
            insightConfidence(
              theme.confidence
            ),

          priority:
            "normal",

          evidence: [
            {
              source:
                "inquiry_intelligence",

              theme_key:
                theme.theme_key,

              signal_count:
                theme
                  .signal_count,

              distinct_conversation_count:
                theme
                  .distinct_conversation_count,

              content_score:
                theme
                  .content_score,

              growth_score:
                theme
                  .growth_score,

              confidence:
                insightConfidence(
                  theme
                    .confidence
                ),

              customer_types:
                customerTypes,

              representative_questions:
                questions,

              last_seen_at:
                theme
                  .last_seen_at,
            },
          ],

          related_entity_type:
            "ai_inquiry_theme",

          related_entity_id:
            theme.id,

          related_task_id:
            null,

          status:
            "open",

          metadata: {
            source:
              "mona_meta_content_intelligence",

            bridge_key:
              BRIDGE_KEY,

            theme_evidence_key:
              evidenceKey,

            evaluation_state:
              "pending_lola_review",

            lola_execution_performed:
              false,

            rupert_handoff_created:
              false,
          },
        })
        .select(
          "id, status, created_at"
        )
        .single();

    if (
      insightError?.code ===
      "23505"
    ) {
      /*
       * Another worker won the race.
       * The partial unique index guarantees one active
       * Lola insight per inquiry theme.
       */
      const raced =
        await findLatestThemeInsight({
          agentId:
            String(
              lola.id
            ),

          themeId:
            theme.id,
        });

      if (!raced?.id) {
        throw new Error(
          "Duplicate inquiry insight was prevented but the winning insight could not be loaded."
        );
      }

      await linkThemeToInsight({
        themeId:
          theme.id,

        insightId:
          raced.id,
      });

      await ensureInquiryInsightActivity({
        agentId:
          String(
            lola.id
          ),

        actorUserId:
          params.actorUserId,

        insightId:
          raced.id,

        insightCreatedAt:
          raced.created_at ??
          null,

        theme,

        auditContext:
          "race_winner",
      });

      suppressed +=
        1;

      continue;
    }

    if (
      insightError ||
      !insight?.id
    ) {
      throw new Error(
        `Unable to create Lola inquiry insight: ${
          insightError?.message ||
          "Missing insight id."
        }`
      );
    }

    await linkThemeToInsight({
      themeId:
        theme.id,

      insightId:
        insight.id,
    });

    await ensureInquiryInsightActivity({
      agentId:
        String(
          lola.id
        ),

      actorUserId:
        params.actorUserId,

      insightId:
        insight.id,

      insightCreatedAt:
        insight.created_at ??
        null,

      theme,

      auditContext:
        "new_insight",
    });

    created +=
      1;

    createdInsights.push({
      insightId:
        insight.id,

      themeId:
        theme.id,

      themeKey:
        theme.theme_key,
    });
  }

  return {
    enabled:
      true,

    eligibleThemes:
      themes.length,

    created,

    suppressed,

    insights:
      createdInsights,
  };
}

export async function processInquiryIntelligence(
  options?: {
    limit?: number;
    lookbackDays?: number;
    sourceMessageIds?: string[];
    actorUserId?: string | null;
  }
) {
  const settings =
    await loadSettings();

  /*
   * MASTER KILL SWITCH.
   *
   * No source read.
   * No model call.
   * No write.
   */
  if (!settings.enabled) {
    return {
      action:
        "skipped_bridge_disabled" as const,

      bridgeEnabled:
        false,

      writesPerformed:
        false,

      downstreamActionsPerformed:
        false,
    };
  }

  const limit =
    Math.min(
      settings
        .max_messages_per_run,

      Math.max(
        1,
        Number(
          options?.limit ??
          settings
            .max_messages_per_run
        ) || 1
      )
    );

  const lookbackDays =
    Math.min(
      90,
      Math.max(
        1,
        Number(
          options?.lookbackDays ??
          settings
            .lookback_days
        ) || 1
      )
    );

  const explicitSourceSelection =
    options?.sourceMessageIds !==
    undefined;

  const sourceMessageIds =
    Array.from(
      new Set(
        (
          options
            ?.sourceMessageIds ??
          []
        )
          .map(
            cleanString
          )
          .filter(
            Boolean
          )
      )
    );

  if (
    explicitSourceSelection &&
    sourceMessageIds.length === 0
  ) {
    throw new Error(
      "Explicit inquiry source selection is empty."
    );
  }

  if (
    sourceMessageIds.length >
    limit
  ) {
    throw new Error(
      "Explicit inquiry source selection exceeds the allowed run limit."
    );
  }

  const messages =
    await loadUnprocessedMessages({
      limit,
      lookbackDays,

      sourceMessageIds:
        explicitSourceSelection
          ? sourceMessageIds
          : undefined,
    });

  let storedSignals =
    0;

  let duplicateSignals =
    0;

  let privacyBlocked =
    0;

  const touchedThemeIds =
    new Set<string>();

  for (
    let offset = 0;
    offset < messages.length;
    offset += 10
  ) {
    const batch =
      messages.slice(
        offset,
        offset + 10
      );

    const sourceMap =
      new Map<
        string,
        SourceMessage
      >();

    const inputs =
      batch.map(
        (message, index) => {
          const sourceKey =
            `b${offset + index + 1}`;

          sourceMap.set(
            sourceKey,
            message
          );

          return {
            sourceKey,

            text:
              redactInquiryText(
                message.message ||
                ""
              ),
          };
        }
      );

    const classifications =
      await classifyInquiryMessages(
        inputs
      );

    for (
      const classification of
        classifications
    ) {
      const source =
        sourceMap.get(
          classification
            .sourceKey
        );

      if (
        !source?.id ||
        !source.conversation_id ||
        !source.created_at
      ) {
        throw new Error(
          "Inquiry processor source mapping failed."
        );
      }

      const themeId =
        await getOrCreateTheme(
          classification
        );

      if (themeId) {
        touchedThemeIds.add(
          themeId
        );
      }

      const privacyStatus =
        classification
          .privacyStatus;

      if (
        privacyStatus !==
        "sanitized"
      ) {
        privacyBlocked += 1;
      }

      const status =
        privacyStatus ===
        "review_required"
          ? "review_required"
          : privacyStatus ===
              "blocked"
            ? "ignored"
            : themeId
              ? "aggregated"
              : "ignored";

      const {
        error: insertError,
      } =
        await aiTeamSupabaseAdmin
          .from(
            "ai_inquiry_signals"
          )
          .insert({
            source_message_id:
              source.id,

            source_conversation_id:
              source
                .conversation_id,

            source_created_at:
              source.created_at,

            source_provider:
              "meta",

            theme_id:
              themeId,

            language:
              classification
                .language,

            customer_type:
              classification
                .customerType,

            inquiry_kind:
              classification
                .inquiryKind,

            intent:
              null,

            intent_subject:
              null,

            question_summary:
              privacyStatus ===
              "sanitized"
                ? (
                    safeSummary(
                      classification
                        .questionSummary
                    ) ||
                    "Anonymized customer inquiry."
                  )
                : privacyStatus ===
                    "review_required"
                  ? "Inquiry withheld pending privacy review."
                  : "Inquiry withheld by privacy protection.",

            content_relevance:
              classification
                .contentRelevance,

            growth_relevance:
              classification
                .growthRelevance,

            confidence:
              classification
                .confidence,

            content_candidate:
              classification
                .contentCandidate,

            privacy_status:
              privacyStatus,

            status,

            metadata: {
              source:
                "meta_inquiry_intelligence",

              classifier:
                "gpt-4.1-mini",
            },
          });

      if (
        insertError?.code ===
        "23505"
      ) {
        duplicateSignals +=
          1;
        continue;
      }

      if (insertError) {
        throw new Error(
          `Unable to store inquiry signal: ${insertError.message}`
        );
      }

      storedSignals += 1;
    }
  }

  for (
    const themeId of
      touchedThemeIds
  ) {
    await rebuildTheme({
      themeId,
      settings,
    });
  }

  const themes =
    await loadThemeSnapshots(
      Array.from(
        touchedThemeIds
      )
    );

  /*
   * Insight processing is deliberately independent from
   * whether new WhatsApp messages were found this run.
   *
   * This prevents already-qualified themes from becoming
   * stranded while waiting for another customer message.
   */
  const insightProcessing =
    await createQualifiedThemeInsights({
      settings,

      actorUserId:
        options
          ?.actorUserId ??
        null,
    });

  const insightWrites =
    insightProcessing
      .created;

  const action =
    storedSignals > 0 &&
    insightWrites > 0
      ? "stored_signals_and_created_insights"
      : storedSignals > 0
        ? "stored_inquiry_signals"
        : insightWrites > 0
          ? "created_inquiry_insights"
          : "no_unprocessed_messages";

  /*
   * Still deliberately NOT implemented:
   *
   * - no Lola model execution
   * - no ai_handoffs
   * - no ai_tasks
   * - no Rupert production
   * - no content publishing
   */
  return {
    action,

    bridgeEnabled:
      true,

    writesPerformed:
      storedSignals > 0 ||
      insightWrites > 0,

    downstreamActionsPerformed:
      insightWrites > 0,

    processedMessages:
      messages.length,

    storedSignals,
    duplicateSignals,
    privacyBlocked,

    insightsCreated:
      insightWrites,

    insightProcessing,

    downstreamSettings: {
      autoCreateInsights:
        settings
          .auto_create_insights,

      autoCreateHandoffs:
        settings
          .auto_create_handoffs,

      autoCreateTasks:
        settings
          .auto_create_tasks,
    },

    themes,
  };
}
