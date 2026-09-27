import {
  aiTeamSupabaseAdmin,
  requireTetamoAdmin,
} from "@/lib/ai-team/core/admin-auth";

import {
  buildRevenueAnalytics,
} from "@/lib/reporting/revenue";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type RecordType =
  | "expense"
  | "subscription"
  | "asset";

const EXPENSE_TYPES =
  new Set([
    "software",
    "infrastructure",
    "marketing",
    "communications",
    "office",
    "professional_services",
    "operations",
    "other",
  ]);

const EXPENSE_STATUSES =
  new Set([
    "planned",
    "pending",
    "paid",
    "failed",
    "refunded",
    "cancelled",
  ]);

const SUBSCRIPTION_STATUSES =
  new Set([
    "trial",
    "active",
    "paused",
    "cancelled",
    "expired",
    "review",
  ]);

const BILLING_CYCLES =
  new Set([
    "monthly",
    "quarterly",
    "semiannual",
    "annual",
    "usage_based",
    "other",
  ]);

const VALUE_ASSESSMENTS =
  new Set([
    "keep",
    "replace",
    "consolidate",
    "cancel",
    "review",
  ]);

const ASSET_STATUSES =
  new Set([
    "active",
    "stored",
    "repair",
    "retired",
    "sold",
    "lost",
  ]);

function cleanString(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function cleanNullableString(
  value: unknown
) {
  const result =
    cleanString(value);

  return result ||
    null;
}

function cleanCurrency(
  value: unknown
) {
  const result =
    cleanString(value)
      .toUpperCase();

  if (
    !result ||
    !/^[A-Z]{3,10}$/.test(
      result
    )
  ) {
    return null;
  }

  return result;
}

function cleanAmount(
  value: unknown
) {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const number =
    Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    return null;
  }

  return number;
}

function cleanDate(
  value: unknown
) {
  const result =
    cleanString(value);

  if (!result) {
    return null;
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      result
    )
  ) {
    return null;
  }

  return result;
}

async function getUncleSam() {
  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_agents"
      )
      .select(
        "id, agent_key, display_name, role_title"
      )
      .eq(
        "agent_key",
        "uncle_sam"
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function GET(
  req: Request
) {
  const auth =
    await requireTetamoAdmin(
      req
    );

  if (
    !auth.authorized
  ) {
    return auth.response;
  }

  try {
    const [
      revenue,
      expensesResult,
      subscriptionsResult,
      assetsResult,
    ] =
      await Promise.all([
        buildRevenueAnalytics(),

        aiTeamSupabaseAdmin
          .from(
            "business_expenses"
          )
          .select("*")
          .eq(
            "business_key",
            "tetamo"
          )
          .order(
            "expense_date",
            {
              ascending:
                false,
            }
          )
          .limit(200),

        aiTeamSupabaseAdmin
          .from(
            "business_subscriptions"
          )
          .select("*")
          .eq(
            "business_key",
            "tetamo"
          )
          .order(
            "next_renewal_date",
            {
              ascending:
                true,
              nullsFirst:
                false,
            }
          )
          .limit(200),

        aiTeamSupabaseAdmin
          .from(
            "business_assets"
          )
          .select("*")
          .eq(
            "business_key",
            "tetamo"
          )
          .order(
            "purchase_date",
            {
              ascending:
                false,
            }
          )
          .limit(200),
      ]);

    if (
      expensesResult.error
    ) {
      throw expensesResult.error;
    }

    if (
      subscriptionsResult.error
    ) {
      throw subscriptionsResult.error;
    }

    if (
      assetsResult.error
    ) {
      throw assetsResult.error;
    }

    return Response.json({
      ok: true,

      generatedAt:
        new Date()
          .toISOString(),

      revenue,

      expenses:
        expensesResult.data ??
        [],

      subscriptions:
        subscriptionsResult.data ??
        [],

      assets:
        assetsResult.data ??
        [],
    });
  } catch (error) {
    console.error(
      "Uncle Sam finance workspace lookup failed:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to load Uncle Sam's finance workspace.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  req: Request
) {
  const auth =
    await requireTetamoAdmin(
      req
    );

  if (
    !auth.authorized
  ) {
    return auth.response;
  }

  let body:
    Record<string, unknown>;

  try {
    body =
      await req.json();
  } catch {
    return Response.json(
      {
        ok: false,
        error:
          "Invalid request body.",
      },
      {
        status: 400,
      }
    );
  }

  const recordType =
    cleanString(
      body.recordType
    ) as RecordType;

  const rawRecord =
    body.record &&
    typeof body.record ===
      "object" &&
    !Array.isArray(
      body.record
    )
      ? body.record as
          Record<
            string,
            unknown
          >
      : {};

  if (
    ![
      "expense",
      "subscription",
      "asset",
    ].includes(
      recordType
    )
  ) {
    return Response.json(
      {
        ok: false,
        error:
          "Record type must be expense, subscription or asset.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    const uncleSam =
      await getUncleSam();

    if (!uncleSam) {
      return Response.json(
        {
          ok: false,
          error:
            "Uncle Sam is not configured in the AI Team.",
        },
        {
          status: 500,
        }
      );
    }

    let table = "";
    let payload:
      Record<
        string,
        unknown
      > = {};

    if (
      recordType ===
      "expense"
    ) {
      const expenseType =
        cleanString(
          rawRecord
            .expense_type
        );

      const description =
        cleanString(
          rawRecord.description
        );

      const amount =
        cleanAmount(
          rawRecord.amount
        );

      const currency =
        cleanCurrency(
          rawRecord.currency
        );

      const expenseDate =
        cleanDate(
          rawRecord
            .expense_date
        );

      const paymentStatus =
        cleanString(
          rawRecord
            .payment_status
        ) ||
        "paid";

      if (
        !EXPENSE_TYPES.has(
          expenseType
        ) ||
        !description ||
        amount === null ||
        !currency ||
        !expenseDate ||
        !EXPENSE_STATUSES.has(
          paymentStatus
        )
      ) {
        return Response.json(
          {
            ok: false,
            error:
              "Expense record is incomplete or invalid.",
          },
          {
            status: 400,
          }
        );
      }

      table =
        "business_expenses";

      payload = {
        business_key:
          "tetamo",

        expense_type:
          expenseType,

        vendor_name:
          cleanNullableString(
            rawRecord
              .vendor_name
          ),

        description,

        amount,

        currency,

        expense_date:
          expenseDate,

        payment_status:
          paymentStatus,

        source_type:
          "founder_admin_entry",

        receipt_reference:
          cleanNullableString(
            rawRecord
              .receipt_reference
          ),

        metadata: {
          recorded_via:
            "uncle_sam_finance_workspace",

          recorded_by_user_id:
            auth.admin.userId,
        },
      };
    }

    if (
      recordType ===
      "subscription"
    ) {
      const vendorName =
        cleanString(
          rawRecord
            .vendor_name
        );

      const serviceName =
        cleanString(
          rawRecord
            .service_name
        );

      const status =
        cleanString(
          rawRecord.status
        ) ||
        "active";

      const billingCycle =
        cleanNullableString(
          rawRecord
            .billing_cycle
        );

      const amount =
        cleanAmount(
          rawRecord.amount
        );

      const currency =
        rawRecord.currency
          ? cleanCurrency(
              rawRecord.currency
            )
          : null;

      const nextRenewalDate =
        rawRecord
          .next_renewal_date
          ? cleanDate(
              rawRecord
                .next_renewal_date
            )
          : null;

      const valueAssessment =
        cleanNullableString(
          rawRecord
            .value_assessment
        );

      if (
        !vendorName ||
        !serviceName ||
        !SUBSCRIPTION_STATUSES.has(
          status
        ) ||
        (
          billingCycle &&
          !BILLING_CYCLES.has(
            billingCycle
          )
        ) ||
        (
          rawRecord.amount !==
            "" &&
          rawRecord.amount !==
            null &&
          rawRecord.amount !==
            undefined &&
          amount === null
        ) ||
        (
          rawRecord.currency &&
          !currency
        ) ||
        (
          rawRecord
            .next_renewal_date &&
          !nextRenewalDate
        ) ||
        (
          valueAssessment &&
          !VALUE_ASSESSMENTS.has(
            valueAssessment
          )
        )
      ) {
        return Response.json(
          {
            ok: false,
            error:
              "Subscription record is incomplete or invalid.",
          },
          {
            status: 400,
          }
        );
      }

      table =
        "business_subscriptions";

      payload = {
        business_key:
          "tetamo",

        vendor_name:
          vendorName,

        service_name:
          serviceName,

        purpose:
          cleanNullableString(
            rawRecord.purpose
          ),

        billing_cycle:
          billingCycle,

        amount,

        currency,

        status,

        started_at:
          rawRecord.started_at
            ? cleanDate(
                rawRecord
                  .started_at
              )
            : null,

        next_renewal_date:
          nextRenewalDate,

        value_assessment:
          valueAssessment,

        owner_name:
          cleanNullableString(
            rawRecord
              .owner_name
          ),

        business_value:
          cleanNullableString(
            rawRecord
              .business_value
          ),

        notes:
          cleanNullableString(
            rawRecord.notes
          ),

        metadata: {
          recorded_via:
            "uncle_sam_finance_workspace",

          recorded_by_user_id:
            auth.admin.userId,
        },
      };
    }

    if (
      recordType ===
      "asset"
    ) {
      const assetType =
        cleanString(
          rawRecord
            .asset_type
        );

      const assetName =
        cleanString(
          rawRecord
            .asset_name
        );

      const status =
        cleanString(
          rawRecord.status
        ) ||
        "active";

      const purchaseAmount =
        cleanAmount(
          rawRecord
            .purchase_amount
        );

      const currency =
        rawRecord.currency
          ? cleanCurrency(
              rawRecord.currency
            )
          : null;

      const purchaseDate =
        rawRecord
          .purchase_date
          ? cleanDate(
              rawRecord
                .purchase_date
            )
          : null;

      const warrantyDate =
        rawRecord
          .warranty_expires_at
          ? cleanDate(
              rawRecord
                .warranty_expires_at
            )
          : null;

      if (
        !assetType ||
        !assetName ||
        !ASSET_STATUSES.has(
          status
        ) ||
        (
          rawRecord
            .purchase_amount !==
            "" &&
          rawRecord
            .purchase_amount !==
            null &&
          rawRecord
            .purchase_amount !==
            undefined &&
          purchaseAmount ===
            null
        ) ||
        (
          rawRecord.currency &&
          !currency
        ) ||
        (
          rawRecord
            .purchase_date &&
          !purchaseDate
        ) ||
        (
          rawRecord
            .warranty_expires_at &&
          !warrantyDate
        )
      ) {
        return Response.json(
          {
            ok: false,
            error:
              "Asset record is incomplete or invalid.",
          },
          {
            status: 400,
          }
        );
      }

      table =
        "business_assets";

      payload = {
        business_key:
          "tetamo",

        asset_type:
          assetType,

        asset_name:
          assetName,

        vendor_name:
          cleanNullableString(
            rawRecord
              .vendor_name
          ),

        purchase_date:
          purchaseDate,

        purchase_amount:
          purchaseAmount,

        currency,

        status,

        assigned_to:
          cleanNullableString(
            rawRecord
              .assigned_to
          ),

        warranty_expires_at:
          warrantyDate,

        notes:
          cleanNullableString(
            rawRecord.notes
          ),

        metadata: {
          recorded_via:
            "uncle_sam_finance_workspace",

          recorded_by_user_id:
            auth.admin.userId,
        },
      };
    }

    const {
      data:
        savedRecord,
      error:
        saveError,
    } =
      await aiTeamSupabaseAdmin
        .from(table)
        .insert(payload)
        .select("*")
        .single();

    if (
      saveError ||
      !savedRecord
    ) {
      throw (
        saveError ??
        new Error(
          "Finance/admin record was not saved."
        )
      );
    }

    const {
      error:
        activityError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_activity"
        )
        .insert({
          agent_id:
            uncleSam.id,

          actor_user_id:
            auth.admin.userId,

          event_type:
            "finance_admin",

          action:
            `recorded_${recordType}`,

          entity_type:
            table,

          entity_id:
            savedRecord.id,

          severity:
            "info",

          details: {
            record_type:
              recordType,

            recorded_via:
              "uncle_sam_finance_workspace",
          },
        });

    if (
      activityError
    ) {
      console.error(
        "Uncle Sam finance activity log failed:",
        activityError
      );
    }

    return Response.json(
      {
        ok: true,

        recordType,

        record:
          savedRecord,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Uncle Sam finance record creation failed:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to save Uncle Sam's finance/admin record.",
      },
      {
        status: 500,
      }
    );
  }
}
