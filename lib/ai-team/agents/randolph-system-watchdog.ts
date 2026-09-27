import "server-only";

import Stripe from "stripe";
import {
  GoogleAuth,
} from "google-auth-library";

import {
  aiTeamSupabaseAdmin,
} from "@/lib/ai-team/core/admin-auth";

import {
  getAppleIapServerClient,
  getAppleSignedDataVerifier,
  TETAMO_PARTNER_IOS_BUNDLE_ID,
} from "@/lib/apple-iap-server";

import {
  TETAMO_PARTNER_ANDROID_PACKAGE,
} from "@/lib/google-play-server";

type HealthStatus =
  | "healthy"
  | "degraded"
  | "down"
  | "unknown";

type CheckType =
  | "live"
  | "configuration"
  | "heartbeat";

type FailureSeverity =
  | "info"
  | "warning"
  | "high"
  | "critical";

type CheckOutcome =
  | "healthy"
  | "failed"
  | "unknown";

type CheckResult = {
  outcome: CheckOutcome;
  message: string;
  latencyMs?: number | null;
  evidence?: Record<
    string,
    unknown
  >;
};

type CheckDefinition = {
  key: string;
  displayName: string;
  category: string;
  checkType: CheckType;
  severityOnFailure:
    FailureSeverity;
  failureThreshold?: number;
  run: () =>
    Promise<CheckResult>;
};

type HealthRow = {
  check_key: string;
  display_name: string;
  category: string;
  check_type: CheckType;
  status: HealthStatus;
  severity_on_failure:
    FailureSeverity;
  message:
    string | null;
  latency_ms:
    number | null;
  consecutive_failures: number;
  last_checked_at:
    string | null;
  last_success_at:
    string | null;
  last_failure_at:
    string | null;
  failure_started_at:
    string | null;
  last_recovered_at:
    string | null;
  evidence:
    Record<
      string,
      unknown
    > | null;
  metadata:
    Record<
      string,
      unknown
    > | null;
  created_at: string;
};

export type RandolphWatchdogRun = {
  startedAt: string;
  completedAt: string;
  skipped: boolean;
  skipReason: string | null;
  total: number;
  healthy: number;
  degraded: number;
  down: number;
  unknown: number;
  incidentsOpened: number;
  incidentsResolved: number;
  checks: Array<{
    key: string;
    displayName: string;
    status: HealthStatus;
    message: string;
    latencyMs:
      number | null;
    consecutiveFailures: number;
  }>;
};

const DEFAULT_TIMEOUT_MS =
  12_000;

function clean(
  value: unknown
) {
  return String(
    value ?? ""
  ).trim();
}

function errorMessage(
  error: unknown
) {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return String(
    error ||
      "Unknown error"
  );
}

function safeErrorMessage(
  error: unknown
) {
  const raw =
    errorMessage(
      error
    );

  return raw
    .replace(
      /Bearer\s+[A-Za-z0-9._~-]+/gi,
      "Bearer [REDACTED]"
    )
    .replace(
      /(sk_(?:live|test|restricted)_[A-Za-z0-9]+)/gi,
      "[REDACTED_STRIPE_KEY]"
    )
    .slice(
      0,
      500
    );
}

async function timedFetch(
  url: string,
  init:
    RequestInit = {},
  timeoutMs =
    DEFAULT_TIMEOUT_MS
) {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      timeoutMs
    );

  const started =
    Date.now();

  try {
    const response =
      await fetch(
        url,
        {
          ...init,

          signal:
            controller.signal,

          cache:
            "no-store",
        }
      );

    return {
      response,
      latencyMs:
        Date.now() -
        started,
    };
  } finally {
    clearTimeout(
      timeout
    );
  }
}

async function checkWebsite(
  baseUrl: string
): Promise<CheckResult> {
  const url =
    new URL(
      "/",
      baseUrl
    ).toString();

  try {
    const {
      response,
      latencyMs,
    } =
      await timedFetch(
        url,
        {
          method:
            "GET",

          headers: {
            "User-Agent":
              "Tetamo-Randolph-Watchdog/1.0",
          },

          redirect:
            "follow",
        }
      );

    if (
      !response.ok
    ) {
      return {
        outcome:
          "failed",

        message:
          `Tetamo website returned HTTP ${response.status}.`,

        latencyMs,

        evidence: {
          http_status:
            response.status,

          origin:
            new URL(
              response.url ||
                url
            ).origin,
        },
      };
    }

    return {
      outcome:
        "healthy",

      message:
        "Tetamo website responded successfully.",

      latencyMs,

      evidence: {
        http_status:
          response.status,

        origin:
          new URL(
            response.url ||
              url
          ).origin,
      },
    };
  } catch (
    error
  ) {
    return {
      outcome:
        "failed",

      message:
        `Tetamo website check failed: ${safeErrorMessage(error)}`,

      evidence: {
        origin:
          new URL(
            url
          ).origin,
      },
    };
  }
}

async function checkSupabase():
Promise<CheckResult> {
  const started =
    Date.now();

  try {
    const {
      error,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_agents"
        )
        .select(
          "id"
        )
        .limit(
          1
        );

    const latencyMs =
      Date.now() -
      started;

    if (error) {
      return {
        outcome:
          "failed",

        message:
          `Supabase database query failed: ${safeErrorMessage(error)}`,

        latencyMs,

        evidence: {
          query:
            "ai_agents read",
        },
      };
    }

    return {
      outcome:
        "healthy",

      message:
        "Supabase database responded successfully.",

      latencyMs,

      evidence: {
        query:
          "ai_agents read",

        authenticated:
          true,
      },
    };
  } catch (
    error
  ) {
    return {
      outcome:
        "failed",

      message:
        `Supabase check failed: ${safeErrorMessage(error)}`,

      latencyMs:
        Date.now() -
        started,
    };
  }
}

async function checkStripe():
Promise<CheckResult> {
  const secretKey =
    clean(
      process.env
        .STRIPE_SECRET_KEY
    );

  if (!secretKey) {
    return {
      outcome:
        "failed",

      message:
        "STRIPE_SECRET_KEY is not configured.",

      evidence: {
        configured:
          false,
      },
    };
  }

  const started =
    Date.now();

  try {
    const stripe =
      new Stripe(
        secretKey
      );

    const balance =
      await stripe.balance
        .retrieve();

    return {
      outcome:
        "healthy",

      message:
        "Stripe API authenticated successfully.",

      latencyMs:
        Date.now() -
        started,

      evidence: {
        configured:
          true,

        livemode:
          Boolean(
            balance.livemode
          ),
      },
    };
  } catch (
    error
  ) {
    return {
      outcome:
        "failed",

      message:
        `Stripe API check failed: ${safeErrorMessage(error)}`,

      latencyMs:
        Date.now() -
        started,

      evidence: {
        configured:
          true,
      },
    };
  }
}

async function checkHitPay():
Promise<CheckResult> {
  const apiKey =
    clean(
      process.env
        .HITPAY_API_KEY
    );

  const mode =
    clean(
      process.env
        .HITPAY_MODE
    ).toLowerCase() ||
    "live";

  if (!apiKey) {
    return {
      outcome:
        "failed",

      message:
        "HITPAY_API_KEY is not configured.",

      evidence: {
        configured:
          false,
        mode,
      },
    };
  }

  const baseUrl =
    mode ===
        "sandbox" ||
      mode ===
        "test"
      ? "https://api.sandbox.hit-pay.com"
      : "https://api.hit-pay.com";

  try {
    const {
      response,
      latencyMs,
    } =
      await timedFetch(
        `${baseUrl}/v1/payment-requests?limit=1`,
        {
          method:
            "GET",

          headers: {
            Accept:
              "application/json",

            "X-Requested-With":
              "XMLHttpRequest",

            "X-BUSINESS-API-KEY":
              apiKey,
          },
        }
      );

    if (
      !response.ok
    ) {
      return {
        outcome:
          "failed",

        message:
          `HitPay API returned HTTP ${response.status}.`,

        latencyMs,

        evidence: {
          configured:
            true,
          mode,
          http_status:
            response.status,
        },
      };
    }

    return {
      outcome:
        "healthy",

      message:
        "HitPay API authenticated successfully.",

      latencyMs,

      evidence: {
        configured:
          true,
        mode,
        http_status:
          response.status,
      },
    };
  } catch (
    error
  ) {
    return {
      outcome:
        "failed",

      message:
        `HitPay API check failed: ${safeErrorMessage(error)}`,

      evidence: {
        configured:
          true,
        mode,
      },
    };
  }
}

async function checkMetaWhatsApp():
Promise<CheckResult> {
  const accessToken =
    clean(
      process.env
        .META_DIRECT_WHATSAPP_ACCESS_TOKEN
    );

  const phoneNumberId =
    clean(
      process.env
        .META_DIRECT_WHATSAPP_PHONE_NUMBER_ID
    );

  const graphVersion =
    clean(
      process.env
        .META_GRAPH_VERSION
    ) ||
    "v25.0";

  if (
    !accessToken ||
    !phoneNumberId
  ) {
    return {
      outcome:
        "failed",

      message:
        "Meta WhatsApp production credentials are incomplete.",

      evidence: {
        access_token_configured:
          Boolean(
            accessToken
          ),

        phone_number_id_configured:
          Boolean(
            phoneNumberId
          ),

        graph_version:
          graphVersion,
      },
    };
  }

  const url =
    `https://graph.facebook.com/${encodeURIComponent(
      graphVersion
    )}/${encodeURIComponent(
      phoneNumberId
    )}?fields=id,display_phone_number,verified_name`;

  try {
    const {
      response,
      latencyMs,
    } =
      await timedFetch(
        url,
        {
          method:
            "GET",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            Accept:
              "application/json",
          },
        }
      );

    if (
      !response.ok
    ) {
      return {
        outcome:
          "failed",

        message:
          `Meta WhatsApp Graph API returned HTTP ${response.status}.`,

        latencyMs,

        evidence: {
          configured:
            true,

          graph_version:
            graphVersion,

          http_status:
            response.status,
        },
      };
    }

    const payload =
      await response
        .json()
        .catch(
          () =>
            ({})
        ) as
        Record<
          string,
          unknown
        >;

    return {
      outcome:
        "healthy",

      message:
        "Meta WhatsApp phone configuration is reachable.",

      latencyMs,

      evidence: {
        configured:
          true,

        graph_version:
          graphVersion,

        phone_number_id:
          clean(
            payload.id
          ) ||
          phoneNumberId,

        display_phone_number:
          clean(
            payload.display_phone_number
          ) ||
          null,

        verified_name:
          clean(
            payload.verified_name
          ) ||
          null,
      },
    };
  } catch (
    error
  ) {
    return {
      outcome:
        "failed",

      message:
        `Meta WhatsApp check failed: ${safeErrorMessage(error)}`,

      evidence: {
        configured:
          true,

        graph_version:
          graphVersion,
      },
    };
  }
}

async function checkGooglePlay():
Promise<CheckResult> {
  const clientEmail =
    clean(
      process.env
        .GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL
    );

  const rawPrivateKey =
    process.env
      .GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (
    !clientEmail ||
    !rawPrivateKey
  ) {
    return {
      outcome:
        "failed",

      message:
        "Google Play service-account configuration is incomplete.",

      evidence: {
        client_email_configured:
          Boolean(
            clientEmail
          ),

        private_key_configured:
          Boolean(
            rawPrivateKey
          ),

        package:
          TETAMO_PARTNER_ANDROID_PACKAGE,
      },
    };
  }

  const started =
    Date.now();

  try {
    const auth =
      new GoogleAuth({
        credentials: {
          client_email:
            clientEmail,

          private_key:
            rawPrivateKey.replace(
              /\\n/g,
              "\n"
            ),
        },

        scopes: [
          "https://www.googleapis.com/auth/androidpublisher",
        ],
      });

    const token =
      await auth
        .getAccessToken();

    if (!token) {
      throw new Error(
        "Google Play access token could not be created."
      );
    }

    return {
      outcome:
        "healthy",

      message:
        "Google Play service account authenticated successfully.",

      latencyMs:
        Date.now() -
        started,

      evidence: {
        authenticated:
          true,

        package:
          TETAMO_PARTNER_ANDROID_PACKAGE,
      },
    };
  } catch (
    error
  ) {
    return {
      outcome:
        "failed",

      message:
        `Google Play authentication failed: ${safeErrorMessage(error)}`,

      latencyMs:
        Date.now() -
        started,

      evidence: {
        package:
          TETAMO_PARTNER_ANDROID_PACKAGE,
      },
    };
  }
}

async function checkAppleIap():
Promise<CheckResult> {
  const keyId =
    clean(
      process.env
        .APPLE_IAP_KEY_ID
    );

  const issuerId =
    clean(
      process.env
        .APPLE_IAP_ISSUER_ID
    );

  const privateKey =
    process.env
      .APPLE_IAP_PRIVATE_KEY;

  if (
    !keyId ||
    !issuerId ||
    !privateKey
  ) {
    return {
      outcome:
        "failed",

      message:
        "Apple IAP server configuration is incomplete.",

      evidence: {
        key_id_configured:
          Boolean(
            keyId
          ),

        issuer_id_configured:
          Boolean(
            issuerId
          ),

        private_key_configured:
          Boolean(
            privateKey
          ),

        bundle_id:
          TETAMO_PARTNER_IOS_BUNDLE_ID,
      },
    };
  }

  const started =
    Date.now();

  try {
    getAppleIapServerClient(
      "production"
    );

    getAppleSignedDataVerifier(
      "production"
    );

    return {
      outcome:
        "healthy",

      message:
        "Apple IAP credentials and local verification configuration loaded successfully.",

      latencyMs:
        Date.now() -
        started,

      evidence: {
        configured:
          true,

        verification_scope:
          "configuration_only",

        bundle_id:
          TETAMO_PARTNER_IOS_BUNDLE_ID,
      },
    };
  } catch (
    error
  ) {
    return {
      outcome:
        "failed",

      message:
        `Apple IAP configuration check failed: ${safeErrorMessage(error)}`,

      latencyMs:
        Date.now() -
        started,

      evidence: {
        bundle_id:
          TETAMO_PARTNER_IOS_BUNDLE_ID,
      },
    };
  }
}

async function loadHealthRow(
  checkKey: string
) {
  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_system_health"
      )
      .select(
        [
          "check_key",
          "display_name",
          "category",
          "check_type",
          "status",
          "severity_on_failure",
          "message",
          "latency_ms",
          "consecutive_failures",
          "last_checked_at",
          "last_success_at",
          "last_failure_at",
          "failure_started_at",
          "last_recovered_at",
          "evidence",
          "metadata",
          "created_at",
        ].join(",")
      )
      .eq(
        "check_key",
        checkKey
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  return data
    ? (
        data as unknown as
          HealthRow
      )
    : null;
}

function heartbeatCheck(
  checkKey: string,
  displayName: string,
  maximumAgeHours: number
): CheckDefinition {
  return {
    key:
      checkKey,

    displayName,

    category:
      "scheduled_jobs",

    checkType:
      "heartbeat",

    severityOnFailure:
      "warning",

    failureThreshold:
      2,

    run:
      async () => {
        const row =
          await loadHealthRow(
            checkKey
          );

        if (
          !row
            ?.last_success_at
        ) {
          if (
            !row
          ) {
            return {
              outcome:
                "unknown",

              message:
                `${displayName} has not reported its first heartbeat yet.`,

              evidence: {
                maximum_age_hours:
                  maximumAgeHours,

                grace_period:
                  true,
              },
            };
          }

          const firstObservedMs =
            new Date(
              row.created_at
            ).getTime();

          const waitingHours =
            Number.isFinite(
              firstObservedMs
            )
              ? (
                  Date.now() -
                  firstObservedMs
                ) /
                3_600_000
              : maximumAgeHours +
                1;

          if (
            waitingHours >
            maximumAgeHours
          ) {
            return {
              outcome:
                "failed",

              message:
                `${displayName} has never reported a heartbeat after ${waitingHours.toFixed(
                  1
                )} hours.`,

              evidence: {
                first_observed_at:
                  row.created_at,

                waiting_hours:
                  Number(
                    waitingHours.toFixed(
                      2
                    )
                  ),

                maximum_age_hours:
                  maximumAgeHours,
              },
            };
          }

          return {
            outcome:
              "unknown",

            message:
              `${displayName} is within its first-heartbeat grace period.`,

            evidence: {
              first_observed_at:
                row.created_at,

              waiting_hours:
                Number(
                  waitingHours.toFixed(
                    2
                  )
                ),

              maximum_age_hours:
                maximumAgeHours,

              grace_period:
                true,
            },
          };
        }

        const lastSuccess =
          new Date(
            row.last_success_at
          ).getTime();

        if (
          !Number.isFinite(
            lastSuccess
          )
        ) {
          return {
            outcome:
              "failed",

            message:
              `${displayName} has an invalid heartbeat timestamp.`,

            evidence: {
              maximum_age_hours:
                maximumAgeHours,
            },
          };
        }

        const ageMs =
          Date.now() -
          lastSuccess;

        const ageHours =
          ageMs /
          3_600_000;

        if (
          ageHours >
          maximumAgeHours
        ) {
          return {
            outcome:
              "failed",

            message:
              `${displayName} heartbeat is stale (${ageHours.toFixed(
                1
              )} hours old).`,

            evidence: {
              last_success_at:
                row.last_success_at,

              age_hours:
                Number(
                  ageHours.toFixed(
                    2
                  )
                ),

              maximum_age_hours:
                maximumAgeHours,
            },
          };
        }

        return {
          outcome:
            "healthy",

          message:
            `${displayName} heartbeat is current.`,

          evidence: {
            last_success_at:
              row.last_success_at,

            age_hours:
              Number(
                ageHours.toFixed(
                  2
                )
              ),

            maximum_age_hours:
              maximumAgeHours,
          },
        };
      },
  };
}

async function getRandolph() {
  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_agents"
      )
      .select(
        "id, enabled, status"
      )
      .eq(
        "agent_key",
        "randolph"
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Randolph is not configured in the AI Team."
    );
  }

  return data as unknown as {
    id: string;
    enabled: boolean;
    status: string;
  };
}

async function findActiveIncident(
  checkKey: string
) {
  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_incidents"
      )
      .select(
        "id, status"
      )
      .eq(
        "related_entity_type",
        "system_health_check"
      )
      .eq(
        "related_entity_id",
        checkKey
      )
      .not(
        "status",
        "in",
        '("resolved","closed")'
      )
      .order(
        "detected_at",
        {
          ascending:
            false,
        }
      )
      .limit(
        1
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  return data as unknown as
    | {
        id: string;
        status: string;
      }
    | null;
}

async function logActivity({
  randolphId,
  action,
  entityId,
  severity,
  details,
}: {
  randolphId: string;
  action: string;
  entityId:
    string | null;
  severity:
    FailureSeverity;
  details:
    Record<
      string,
      unknown
    >;
}) {
  const {
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_activity"
      )
      .insert({
        agent_id:
          randolphId,

        actor_user_id:
          null,

        event_type:
          "system_health",

        action,

        entity_type:
          "system_health_check",

        entity_id:
          entityId,

        severity,

        details,
      });

  if (error) {
    console.error(
      "Randolph watchdog activity log failed:",
      error
    );
  }
}

async function openIncident({
  definition,
  result,
  randolphId,
  checkedAt,
  consecutiveFailures,
}: {
  definition:
    CheckDefinition;
  result:
    CheckResult;
  randolphId: string;
  checkedAt: string;
  consecutiveFailures: number;
}) {
  const existing =
    await findActiveIncident(
      definition.key
    );

  if (existing) {
    return {
      created:
        false,
      incidentId:
        existing.id,
    };
  }

  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_incidents"
      )
      .insert({
        detected_by_agent_id:
          randolphId,

        title:
          `${definition.displayName} health check failing`,

        description:
          result.message,

        surface:
          definition.category,

        platform:
          definition.displayName,

        severity:
          definition.severityOnFailure,

        status:
          "open",

        confidence:
          "confirmed",

        impact_summary:
          "A monitored Tetamo production dependency or scheduled worker has failed repeated automated health checks.",

        probable_cause:
          null,

        evidence: [
          {
            check_key:
              definition.key,

            checked_at:
              checkedAt,

            consecutive_failures:
              consecutiveFailures,

            ...(
              result.evidence ??
              {}
            ),
          },
        ],

        recommended_action:
          "Inspect the affected provider, worker, logs and recent configuration changes. Do not make production changes without Founder approval.",

        related_entity_type:
          "system_health_check",

        related_entity_id:
          definition.key,

        detected_at:
          checkedAt,

        metadata: {
          source:
            "randolph_automated_watchdog",

          check_type:
            definition.checkType,

          automated:
            true,

          safety_note:
            "The watchdog records and diagnoses incidents but does not autonomously deploy fixes or modify production configuration.",
        },
      })
      .select(
        "id"
      )
      .single();

  if (error) {
    if (
      error.code ===
      "23505"
    ) {
      const raced =
        await findActiveIncident(
          definition.key
        );

      return {
        created:
          false,
        incidentId:
          raced?.id ??
          null,
      };
    }

    throw error;
  }

  const incident =
    data as unknown as {
      id: string;
    };

  await logActivity({
    randolphId,

    action:
      "watchdog_incident_opened",

    entityId:
      definition.key,

    severity:
      definition.severityOnFailure,

    details: {
      check_key:
        definition.key,

      display_name:
        definition.displayName,

      incident_id:
        incident.id,

      message:
        result.message,

      consecutive_failures:
        consecutiveFailures,
    },
  });

  return {
    created:
      true,
    incidentId:
      incident.id,
  };
}

async function resolveIncident({
  definition,
  randolphId,
  recoveredAt,
}: {
  definition:
    CheckDefinition;
  randolphId: string;
  recoveredAt: string;
}) {
  const active =
    await findActiveIncident(
      definition.key
    );

  if (!active) {
    return false;
  }

  const resolutionSummary =
    `Automated health check recovered at ${recoveredAt}. This confirms the monitored check succeeded again; it does not prove the original root cause was identified.`;

  const {
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_incidents"
      )
      .update({
        status:
          "resolved",

        resolved_at:
          recoveredAt,

        resolution_summary:
          resolutionSummary,
      })
      .eq(
        "id",
        active.id
      )
      .not(
        "status",
        "in",
        '("resolved","closed")'
      );

  if (error) {
    throw error;
  }

  await logActivity({
    randolphId,

    action:
      "watchdog_incident_recovered",

    entityId:
      definition.key,

    severity:
      "info",

    details: {
      check_key:
        definition.key,

      display_name:
        definition.displayName,

      incident_id:
        active.id,

      recovered_at:
        recoveredAt,

      resolution_summary:
        resolutionSummary,
    },
  });

  return true;
}

async function persistResult({
  definition,
  result,
  previous,
  checkedAt,
}: {
  definition:
    CheckDefinition;
  result:
    CheckResult;
  previous:
    HealthRow | null;
  checkedAt: string;
}) {
  if (
    result.outcome ===
    "unknown"
  ) {
    const {
      error,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_system_health"
        )
        .upsert(
          {
            check_key:
              definition.key,

            display_name:
              definition.displayName,

            category:
              definition.category,

            check_type:
              definition.checkType,

            status:
              "unknown",

            severity_on_failure:
              definition.severityOnFailure,

            message:
              result.message,

            latency_ms:
              result.latencyMs ??
              null,

            consecutive_failures:
              previous
                ?.consecutive_failures ??
              0,

            last_checked_at:
              checkedAt,

            last_success_at:
              previous
                ?.last_success_at ??
              null,

            last_failure_at:
              previous
                ?.last_failure_at ??
              null,

            failure_started_at:
              previous
                ?.failure_started_at ??
              null,

            last_recovered_at:
              previous
                ?.last_recovered_at ??
              null,

            evidence:
              result.evidence ??
              {},

            metadata: {
              managed_by:
                "randolph_watchdog",
            },
          },
          {
            onConflict:
              "check_key",
          }
        );

    if (error) {
      throw error;
    }

    return {
      status:
        "unknown" as const,

      consecutiveFailures:
        previous
          ?.consecutive_failures ??
        0,

      recovered:
        false,
    };
  }

  if (
    result.outcome ===
    "healthy"
  ) {
    const previousWasFailing =
      previous?.status ===
        "degraded" ||
      previous?.status ===
        "down";

    const {
      error,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_system_health"
        )
        .upsert(
          {
            check_key:
              definition.key,

            display_name:
              definition.displayName,

            category:
              definition.category,

            check_type:
              definition.checkType,

            status:
              "healthy",

            severity_on_failure:
              definition.severityOnFailure,

            message:
              result.message,

            latency_ms:
              result.latencyMs ??
              null,

            consecutive_failures:
              0,

            last_checked_at:
              checkedAt,

            last_success_at:
              definition.checkType ===
                "heartbeat"
                ? (
                    previous
                      ?.last_success_at ??
                    checkedAt
                  )
                : checkedAt,

            last_failure_at:
              previous
                ?.last_failure_at ??
              null,

            failure_started_at:
              null,

            last_recovered_at:
              previousWasFailing
                ? checkedAt
                : (
                    previous
                      ?.last_recovered_at ??
                    null
                  ),

            evidence:
              result.evidence ??
              {},

            metadata: {
              managed_by:
                "randolph_watchdog",
            },
          },
          {
            onConflict:
              "check_key",
          }
        );

    if (error) {
      throw error;
    }

    return {
      status:
        "healthy" as const,

      consecutiveFailures:
        0,

      recovered:
        previousWasFailing,
    };
  }

  const consecutiveFailures =
    (
      previous
        ?.consecutive_failures ??
      0
    ) + 1;

  const threshold =
    definition
      .failureThreshold ??
    2;

  const status:
    HealthStatus =
      consecutiveFailures >=
      threshold
        ? "down"
        : "degraded";

  const {
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_system_health"
      )
      .upsert(
        {
          check_key:
            definition.key,

          display_name:
            definition.displayName,

          category:
            definition.category,

          check_type:
            definition.checkType,

          status,

          severity_on_failure:
            definition.severityOnFailure,

          message:
            result.message,

          latency_ms:
            result.latencyMs ??
            null,

          consecutive_failures:
            consecutiveFailures,

          last_checked_at:
            checkedAt,

          last_success_at:
            previous
              ?.last_success_at ??
            null,

          last_failure_at:
            checkedAt,

          failure_started_at:
            previous
              ?.failure_started_at ??
            checkedAt,

          last_recovered_at:
            previous
              ?.last_recovered_at ??
            null,

          evidence:
            result.evidence ??
            {},

          metadata: {
            managed_by:
              "randolph_watchdog",

            incident_threshold:
              threshold,
          },
        },
        {
          onConflict:
            "check_key",
        }
      );

  if (error) {
    throw error;
  }

  return {
    status,

    consecutiveFailures,

    recovered:
      false,
  };
}

function buildChecks(
  baseUrl: string
): CheckDefinition[] {
  return [
    {
      key:
        "tetamo_website",

      displayName:
        "Tetamo Website",

      category:
        "web",

      checkType:
        "live",

      severityOnFailure:
        "high",

      failureThreshold:
        2,

      run:
        () =>
          checkWebsite(
            baseUrl
          ),
    },

    {
      key:
        "supabase_database",

      displayName:
        "Supabase Database",

      category:
        "database",

      checkType:
        "live",

      severityOnFailure:
        "critical",

      failureThreshold:
        2,

      run:
        checkSupabase,
    },

    {
      key:
        "stripe_api",

      displayName:
        "Stripe API",

      category:
        "payments",

      checkType:
        "live",

      severityOnFailure:
        "high",

      failureThreshold:
        2,

      run:
        checkStripe,
    },

    {
      key:
        "hitpay_api",

      displayName:
        "HitPay API",

      category:
        "payments",

      checkType:
        "live",

      severityOnFailure:
        "high",

      failureThreshold:
        2,

      run:
        checkHitPay,
    },

    {
      key:
        "meta_whatsapp",

      displayName:
        "Meta WhatsApp",

      category:
        "messaging",

      checkType:
        "live",

      severityOnFailure:
        "high",

      failureThreshold:
        2,

      run:
        checkMetaWhatsApp,
    },

    {
      key:
        "google_play",

      displayName:
        "Google Play",

      category:
        "mobile_billing",

      checkType:
        "live",

      severityOnFailure:
        "high",

      failureThreshold:
        2,

      run:
        checkGooglePlay,
    },

    {
      key:
        "apple_iap",

      displayName:
        "Apple IAP",

      category:
        "mobile_billing",

      checkType:
        "configuration",

      severityOnFailure:
        "high",

      failureThreshold:
        2,

      run:
        checkAppleIap,
    },

    heartbeatCheck(
      "cron_rupert",
      "Rupert Daily Worker",
      30
    ),

    heartbeatCheck(
      "cron_uncle_sam",
      "Uncle Sam Daily Worker",
      30
    ),
  ];
}

export async function runRandolphSystemWatchdog({
  baseUrl,
  allowInactive = false,
}: {
  baseUrl: string;
  allowInactive?: boolean;
}): Promise<RandolphWatchdogRun> {
  const startedAt =
    new Date()
      .toISOString();

  const randolph =
    await getRandolph();

  if (
    !allowInactive &&
    (
      !randolph.enabled ||
      randolph.status !==
        "active"
    )
  ) {
    const completedAt =
      new Date()
        .toISOString();

    return {
      startedAt,
      completedAt,

      skipped:
        true,

      skipReason:
        "Randolph is inactive in the AI Team registry.",

      total:
        0,

      healthy:
        0,

      degraded:
        0,

      down:
        0,

      unknown:
        0,

      incidentsOpened:
        0,

      incidentsResolved:
        0,

      checks:
        [],
    };
  }

  const definitions =
    buildChecks(
      baseUrl
    );

  const checks:
    RandolphWatchdogRun["checks"] =
      [];

  let incidentsOpened =
    0;

  let incidentsResolved =
    0;

  for (
    const definition
    of definitions
  ) {
    const checkedAt =
      new Date()
        .toISOString();

    const previous =
      await loadHealthRow(
        definition.key
      );

    let result:
      CheckResult;

    try {
      result =
        await definition.run();
    } catch (
      error
    ) {
      result = {
        outcome:
          "failed",

        message:
          `Health check failed unexpectedly: ${safeErrorMessage(error)}`,

        evidence: {
          unexpected_error:
            true,
        },
      };
    }

    const persisted =
      await persistResult({
        definition,
        result,
        previous,
        checkedAt,
      });

    const threshold =
      definition
        .failureThreshold ??
      2;

    if (
      persisted.status ===
        "down" &&
      persisted
        .consecutiveFailures >=
        threshold
    ) {
      const opened =
        await openIncident({
          definition,
          result,
          randolphId:
            randolph.id,
          checkedAt,
          consecutiveFailures:
            persisted
              .consecutiveFailures,
        });

      if (
        opened.created
      ) {
        incidentsOpened +=
          1;
      }
    }

    if (
      persisted.status ===
      "healthy"
    ) {
      const resolved =
        await resolveIncident({
          definition,
          randolphId:
            randolph.id,
          recoveredAt:
            checkedAt,
        });

      if (resolved) {
        incidentsResolved +=
          1;
      }
    }

    checks.push({
      key:
        definition.key,

      displayName:
        definition.displayName,

      status:
        persisted.status,

      message:
        result.message,

      latencyMs:
        result.latencyMs ??
        null,

      consecutiveFailures:
        persisted
          .consecutiveFailures,
    });
  }

  const completedAt =
    new Date()
      .toISOString();

  return {
    startedAt,
    completedAt,

    skipped:
      false,

    skipReason:
      null,

    total:
      checks.length,

    healthy:
      checks.filter(
        (check) =>
          check.status ===
          "healthy"
      ).length,

    degraded:
      checks.filter(
        (check) =>
          check.status ===
          "degraded"
      ).length,

    down:
      checks.filter(
        (check) =>
          check.status ===
          "down"
      ).length,

    unknown:
      checks.filter(
        (check) =>
          check.status ===
          "unknown"
      ).length,

    incidentsOpened,
    incidentsResolved,
    checks,
  };
}

export async function recordSystemHeartbeat({
  checkKey,
  displayName,
  message,
}: {
  checkKey: string;
  displayName: string;
  message: string;
}) {
  const now =
    new Date()
      .toISOString();

  const {
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_system_health"
      )
      .upsert(
        {
          check_key:
            checkKey,

          display_name:
            displayName,

          category:
            "scheduled_jobs",

          check_type:
            "heartbeat",

          status:
            "healthy",

          severity_on_failure:
            "warning",

          message,

          latency_ms:
            null,

          consecutive_failures:
            0,

          last_checked_at:
            now,

          last_success_at:
            now,

          failure_started_at:
            null,

          evidence: {
            heartbeat_at:
              now,
          },

          metadata: {
            managed_by:
              "scheduled_worker",
          },
        },
        {
          onConflict:
            "check_key",
        }
      );

  if (error) {
    throw error;
  }

  return now;
}
