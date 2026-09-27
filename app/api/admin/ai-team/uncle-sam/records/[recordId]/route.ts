import {
  aiTeamSupabaseAdmin,
  requireTetamoAdmin,
} from "@/lib/ai-team/core/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RecordType =
  | "expense"
  | "subscription"
  | "asset";

type JsonRecord =
  Record<string, unknown>;

type RouteContext = {
  params: Promise<{
    recordId: string;
  }>;
};

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

function asRecord(
  value: unknown
): JsonRecord {
  return value &&
    typeof value ===
      "object" &&
    !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function cleanNullableString(
  value: unknown
) {
  const text =
    cleanString(value);

  return text || null;
}

function cleanCurrency(
  value: unknown
) {
  const currency =
    cleanString(value)
      .toUpperCase();

  if (
    !currency ||
    !/^[A-Z]{3,10}$/.test(
      currency
    )
  ) {
    return null;
  }

  return currency;
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

  const amount =
    Number(value);

  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    return null;
  }

  return amount;
}

function cleanDate(
  value: unknown
) {
  const text =
    cleanString(value);

  if (!text) {
    return null;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(
    text
  )
    ? text
    : null;
}

function getTable(
  recordType: RecordType
) {
  if (
    recordType ===
    "expense"
  ) {
    return "business_expenses";
  }

  if (
    recordType ===
    "subscription"
  ) {
    return "business_subscriptions";
  }

  return "business_assets";
}

function isRecordType(
  value: string
): value is RecordType {
  return (
    value === "expense" ||
    value === "subscription" ||
    value === "asset"
  );
}

function buildUpdatePayload(
  recordType: RecordType,
  record: JsonRecord
) {
  if (
    recordType ===
    "expense"
  ) {
    const expenseType =
      cleanString(
        record.expense_type
      );

    const description =
      cleanString(
        record.description
      );

    const amount =
      cleanAmount(
        record.amount
      );

    const currency =
      cleanCurrency(
        record.currency
      );

    const expenseDate =
      cleanDate(
        record.expense_date
      );

    const paymentStatus =
      cleanString(
        record.payment_status
      );

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
      throw new Error(
        "Expense record is incomplete or invalid."
      );
    }

    return {
      expense_type:
        expenseType,
      description,
      vendor_name:
        cleanNullableString(
          record.vendor_name
        ),
      amount,
      currency,
      expense_date:
        expenseDate,
      payment_status:
        paymentStatus,
      receipt_reference:
        cleanNullableString(
          record.receipt_reference
        ),
    };
  }

  if (
    recordType ===
    "subscription"
  ) {
    const vendorName =
      cleanString(
        record.vendor_name
      );

    const serviceName =
      cleanString(
        record.service_name
      );

    const amount =
      cleanAmount(
        record.amount
      );

    const currency =
      record.currency
        ? cleanCurrency(
            record.currency
          )
        : null;

    const billingCycle =
      cleanNullableString(
        record.billing_cycle
      );

    const status =
      cleanString(
        record.status
      );

    const nextRenewalDate =
      record.next_renewal_date
        ? cleanDate(
            record.next_renewal_date
          )
        : null;

    const startedAt =
      record.started_at
        ? cleanDate(
            record.started_at
          )
        : null;

    const valueAssessment =
      cleanNullableString(
        record.value_assessment
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
        record.amount !== "" &&
        record.amount !== null &&
        record.amount !==
          undefined &&
        amount === null
      ) ||
      (
        record.currency &&
        !currency
      ) ||
      (
        record.next_renewal_date &&
        !nextRenewalDate
      ) ||
      (
        record.started_at &&
        !startedAt
      ) ||
      (
        valueAssessment &&
        !VALUE_ASSESSMENTS.has(
          valueAssessment
        )
      )
    ) {
      throw new Error(
        "Subscription record is incomplete or invalid."
      );
    }

    return {
      vendor_name:
        vendorName,
      service_name:
        serviceName,
      purpose:
        cleanNullableString(
          record.purpose
        ),
      billing_cycle:
        billingCycle,
      amount,
      currency,
      status,
      started_at:
        startedAt,
      next_renewal_date:
        nextRenewalDate,
      value_assessment:
        valueAssessment,
      owner_name:
        cleanNullableString(
          record.owner_name
        ),
      business_value:
        cleanNullableString(
          record.business_value
        ),
      notes:
        cleanNullableString(
          record.notes
        ),
    };
  }

  const assetType =
    cleanString(
      record.asset_type
    );

  const assetName =
    cleanString(
      record.asset_name
    );

  const amount =
    cleanAmount(
      record.purchase_amount
    );

  const currency =
    record.currency
      ? cleanCurrency(
          record.currency
        )
      : null;

  const purchaseDate =
    record.purchase_date
      ? cleanDate(
          record.purchase_date
        )
      : null;

  const warrantyDate =
    record.warranty_expires_at
      ? cleanDate(
          record.warranty_expires_at
        )
      : null;

  const status =
    cleanString(
      record.status
    );

  if (
    !assetType ||
    !assetName ||
    !ASSET_STATUSES.has(
      status
    ) ||
    (
      record.purchase_amount !==
        "" &&
      record.purchase_amount !==
        null &&
      record.purchase_amount !==
        undefined &&
      amount === null
    ) ||
    (
      record.currency &&
      !currency
    ) ||
    (
      record.purchase_date &&
      !purchaseDate
    ) ||
    (
      record.warranty_expires_at &&
      !warrantyDate
    )
  ) {
    throw new Error(
      "Asset record is incomplete or invalid."
    );
  }

  return {
    asset_type:
      assetType,
    asset_name:
      assetName,
    vendor_name:
      cleanNullableString(
        record.vendor_name
      ),
    purchase_date:
      purchaseDate,
    purchase_amount:
      amount,
    currency,
    status,
    assigned_to:
      cleanNullableString(
        record.assigned_to
      ),
    warranty_expires_at:
      warrantyDate,
    notes:
      cleanNullableString(
        record.notes
      ),
  };
}

async function getUncleSam() {
  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_agents")
      .select("id")
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

export async function PATCH(
  req: Request,
  context: RouteContext
) {
  const auth =
    await requireTetamoAdmin(
      req
    );

  if (!auth.authorized) {
    return auth.response;
  }

  const {
    recordId,
  } =
    await context.params;

  let body:
    JsonRecord;

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
    );

  if (
    !recordId ||
    !isRecordType(
      recordType
    )
  ) {
    return Response.json(
      {
        ok: false,
        error:
          "Record ID and valid record type are required.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    const table =
      getTable(
        recordType
      );

    const {
      data:
        existing,
      error:
        existingError,
    } =
      await aiTeamSupabaseAdmin
        .from(table)
        .select("*")
        .eq(
          "id",
          recordId
        )
        .eq(
          "business_key",
          "tetamo"
        )
        .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (!existing) {
      return Response.json(
        {
          ok: false,
          error:
            "Finance record was not found.",
        },
        {
          status: 404,
        }
      );
    }

    const record =
      asRecord(
        body.record
      );

    let updatePayload:
      Record<string, unknown>;

    try {
      updatePayload =
        buildUpdatePayload(
          recordType,
          record
        );
    } catch (error) {
      return Response.json(
        {
          ok: false,
          error:
            error instanceof
              Error
              ? error.message
              : "Finance record is invalid.",
        },
        {
          status: 400,
        }
      );
    }

    const metadata = {
      ...asRecord(
        existing.metadata
      ),
      last_updated_via:
        "uncle_sam_finance_workspace",
      last_updated_by_user_id:
        auth.admin.userId,
      last_updated_at:
        new Date()
          .toISOString(),
    };

    const {
      data:
        updatedRecord,
      error:
        updateError,
    } =
      await aiTeamSupabaseAdmin
        .from(table)
        .update({
          ...updatePayload,
          metadata,
        })
        .eq(
          "id",
          recordId
        )
        .eq(
          "business_key",
          "tetamo"
        )
        .select("*")
        .single();

    if (updateError) {
      throw updateError;
    }

    const uncleSam =
      await getUncleSam();

    await aiTeamSupabaseAdmin
      .from("ai_activity")
      .insert({
        agent_id:
          uncleSam?.id ??
          null,

        actor_user_id:
          auth.admin.userId,

        event_type:
          "finance_admin",

        action:
          `updated_${recordType}`,

        entity_type:
          table,

        entity_id:
          recordId,

        severity:
          "info",

        details: {
          record_type:
            recordType,

          updated_via:
            "uncle_sam_finance_workspace",

          before:
            existing,

          after:
            updatedRecord,
        },
      });

    return Response.json({
      ok: true,
      recordType,
      record:
        updatedRecord,
    });
  } catch (error) {
    console.error(
      "Uncle Sam finance record update failed:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to update finance/admin record.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  req: Request,
  context: RouteContext
) {
  const auth =
    await requireTetamoAdmin(
      req
    );

  if (!auth.authorized) {
    return auth.response;
  }

  const {
    recordId,
  } =
    await context.params;

  let body:
    JsonRecord;

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
    );

  if (
    !recordId ||
    !isRecordType(
      recordType
    )
  ) {
    return Response.json(
      {
        ok: false,
        error:
          "Record ID and valid record type are required.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    const table =
      getTable(
        recordType
      );

    const {
      data:
        existing,
      error:
        existingError,
    } =
      await aiTeamSupabaseAdmin
        .from(table)
        .select("*")
        .eq(
          "id",
          recordId
        )
        .eq(
          "business_key",
          "tetamo"
        )
        .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (!existing) {
      return Response.json(
        {
          ok: false,
          error:
            "Finance record was not found.",
        },
        {
          status: 404,
        }
      );
    }

    const {
      error:
        deleteError,
    } =
      await aiTeamSupabaseAdmin
        .from(table)
        .delete()
        .eq(
          "id",
          recordId
        )
        .eq(
          "business_key",
          "tetamo"
        );

    if (deleteError) {
      throw deleteError;
    }

    const uncleSam =
      await getUncleSam();

    await aiTeamSupabaseAdmin
      .from("ai_activity")
      .insert({
        agent_id:
          uncleSam?.id ??
          null,

        actor_user_id:
          auth.admin.userId,

        event_type:
          "finance_admin",

        action:
          `removed_${recordType}`,

        entity_type:
          table,

        entity_id:
          recordId,

        severity:
          "warning",

        details: {
          record_type:
            recordType,

          removed_via:
            "uncle_sam_finance_workspace",

          removed_record:
            existing,
        },
      });

    return Response.json({
      ok: true,
      recordType,
      removedId:
        recordId,
    });
  } catch (error) {
    console.error(
      "Uncle Sam finance record removal failed:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to remove finance/admin record.",
      },
      {
        status: 500,
      }
    );
  }
}
