"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CircleDollarSign,
  CreditCard,
  Laptop,
  Loader2,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

import {
  supabase,
} from "@/lib/supabase";

type CurrencyTotals =
  Record<
    string,
    number
  >;

type ExpenseRow = {
  id: string;
  description: string;
  vendor_name: string | null;
  amount: number;
  currency: string;
  expense_date: string;
  payment_status: string;
  expense_type: string;
  receipt_reference: string | null;
};

type SubscriptionRow = {
  id: string;
  vendor_name: string;
  service_name: string;
  amount: number | null;
  currency: string | null;
  billing_cycle: string | null;
  status: string;
  started_at: string | null;
  next_renewal_date: string | null;
  value_assessment: string | null;
  purpose: string | null;
  owner_name: string | null;
  business_value: string | null;
  notes: string | null;
};

type AssetRow = {
  id: string;
  asset_name: string;
  asset_type: string;
  purchase_amount: number | null;
  currency: string | null;
  status: string;
  vendor_name: string | null;
  purchase_date: string | null;
  assigned_to: string | null;
  warranty_expires_at: string | null;
  notes: string | null;
};

type FinanceResponse = {
  ok: boolean;
  error?: string;

  revenue?: {
    summary: {
      month: {
        sales: number;
        revenue:
          CurrencyTotals;
      };
    };
  };

  expenses?: ExpenseRow[];
  subscriptions?: SubscriptionRow[];
  assets?: AssetRow[];
};

type RecordType =
  | "expense"
  | "subscription"
  | "asset";

function formatTotals(
  totals:
    CurrencyTotals | undefined
) {
  if (!totals) {
    return "—";
  }

  const entries =
    Object.entries(
      totals
    );

  if (!entries.length) {
    return "Rp 0";
  }

  return entries
    .map(
      ([currency, amount]) => {
        if (
          currency === "IDR"
        ) {
          return `Rp ${new Intl.NumberFormat(
            "id-ID",
            {
              maximumFractionDigits:
                0,
            }
          ).format(amount)}`;
        }

        return `${currency} ${new Intl.NumberFormat(
          "en-US",
          {
            maximumFractionDigits:
              2,
          }
        ).format(amount)}`;
      }
    )
    .join(", ");
}

function todayDate() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

async function getAccessToken() {
  const {
    data: {
      session,
    },
    error,
  } =
    await supabase.auth
      .getSession();

  if (error) {
    throw error;
  }

  if (
    !session?.access_token
  ) {
    throw new Error(
      "Admin session not found. Please log in again."
    );
  }

  return session
    .access_token;
}

export function UncleSamFinanceDesk() {
  const [
    data,
    setData,
  ] =
    useState<
      FinanceResponse | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    notice,
    setNotice,
  ] =
    useState("");

  const [
    recordType,
    setRecordType,
  ] =
    useState<RecordType>(
      "expense"
    );

  const [
    editingRecordId,
    setEditingRecordId,
  ] =
    useState<string | null>(
      null
    );

  const [
    deletingRecordId,
    setDeletingRecordId,
  ] =
    useState<string | null>(
      null
    );

  const [
    form,
    setForm,
  ] =
    useState<
      Record<string, string>
    >({
      expense_type:
        "software",
      description:
        "",
      vendor_name:
        "",
      amount:
        "",
      currency:
        "IDR",
      expense_date:
        todayDate(),
      payment_status:
        "paid",
    });

  const loadWorkspace =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError("");

          const token =
            await getAccessToken();

          const response =
            await fetch(
              "/api/admin/ai-team/uncle-sam/records",
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
                cache:
                  "no-store",
              }
            );

          const payload =
            await response
              .json()
              .catch(
                () =>
                  null
              );

          if (
            !response.ok ||
            !payload ||
            payload.ok !==
              true
          ) {
            throw new Error(
              payload?.error ||
                "Unable to load Uncle Sam's workspace."
            );
          }

          setData(
            payload
          );
        } catch (loadError) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Unable to load Uncle Sam's workspace."
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  useEffect(
    () => {
      void loadWorkspace();
    },
    [
      loadWorkspace,
    ]
  );

  const expenses =
    data?.expenses ??
    [];

  const subscriptions =
    data
      ?.subscriptions ??
    [];

  const assets =
    data?.assets ??
    [];

  const monthRevenue =
    data
      ?.revenue
      ?.summary
      .month;

  const resetForm = (
    next:
      RecordType
  ) => {
    if (
      next ===
      "expense"
    ) {
      setForm({
        expense_type:
          "software",
        description:
          "",
        vendor_name:
          "",
        amount:
          "",
        currency:
          "IDR",
        expense_date:
          todayDate(),
        payment_status:
          "paid",
      });
    }

    if (
      next ===
      "subscription"
    ) {
      setForm({
        vendor_name:
          "",
        service_name:
          "",
        purpose:
          "",
        amount:
          "",
        currency:
          "IDR",
        billing_cycle:
          "monthly",
        status:
          "active",
        next_renewal_date:
          "",
        value_assessment:
          "review",
        owner_name:
          "",
        business_value:
          "",
        notes:
          "",
      });
    }

    if (
      next ===
      "asset"
    ) {
      setForm({
        asset_type:
          "equipment",
        asset_name:
          "",
        vendor_name:
          "",
        purchase_amount:
          "",
        currency:
          "IDR",
        purchase_date:
          todayDate(),
        status:
          "active",
        assigned_to:
          "",
        warranty_expires_at:
          "",
        notes:
          "",
      });
    }
  };

  const changeRecordType = (
    next:
      RecordType
  ) => {
    setEditingRecordId(
      null
    );

    setRecordType(
      next
    );

    resetForm(
      next
    );

    setError("");
    setNotice("");
  };

  const updateField = (
    key: string,
    value: string
  ) => {
    setForm(
      (current) => ({
        ...current,
        [key]:
          value,
      })
    );
  };

  function beginEditExpense(
    row: ExpenseRow
  ) {
    setRecordType(
      "expense"
    );

    setEditingRecordId(
      row.id
    );

    setForm({
      expense_type:
        row.expense_type,
      description:
        row.description,
      vendor_name:
        row.vendor_name ??
        "",
      amount:
        String(
          row.amount
        ),
      currency:
        row.currency,
      expense_date:
        row.expense_date,
      payment_status:
        row.payment_status,
      receipt_reference:
        row.receipt_reference ??
        "",
    });

    setError("");
    setNotice("");

    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    });
  }

  function beginEditSubscription(
    row: SubscriptionRow
  ) {
    setRecordType(
      "subscription"
    );

    setEditingRecordId(
      row.id
    );

    setForm({
      vendor_name:
        row.vendor_name,
      service_name:
        row.service_name,
      purpose:
        row.purpose ??
        "",
      amount:
        row.amount === null
          ? ""
          : String(
              row.amount
            ),
      currency:
        row.currency ??
        "",
      billing_cycle:
        row.billing_cycle ??
        "monthly",
      status:
        row.status,
      started_at:
        row.started_at ??
        "",
      next_renewal_date:
        row.next_renewal_date ??
        "",
      value_assessment:
        row.value_assessment ??
        "review",
      owner_name:
        row.owner_name ??
        "",
      business_value:
        row.business_value ??
        "",
      notes:
        row.notes ??
        "",
    });

    setError("");
    setNotice("");

    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    });
  }

  function beginEditAsset(
    row: AssetRow
  ) {
    setRecordType(
      "asset"
    );

    setEditingRecordId(
      row.id
    );

    setForm({
      asset_type:
        row.asset_type,
      asset_name:
        row.asset_name,
      vendor_name:
        row.vendor_name ??
        "",
      purchase_amount:
        row.purchase_amount ===
        null
          ? ""
          : String(
              row.purchase_amount
            ),
      currency:
        row.currency ??
        "",
      purchase_date:
        row.purchase_date ??
        "",
      status:
        row.status,
      assigned_to:
        row.assigned_to ??
        "",
      warranty_expires_at:
        row.warranty_expires_at ??
        "",
      notes:
        row.notes ??
        "",
    });

    setError("");
    setNotice("");

    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    });
  }

  function cancelEdit() {
    setEditingRecordId(
      null
    );

    resetForm(
      recordType
    );

    setError("");
    setNotice("");
  }

  async function removeRecord(
    type: RecordType,
    id: string,
    label: string
  ) {
    const confirmed =
      window.confirm(
        `Remove "${label}" from Uncle Sam's ${type} register? This removes the finance record but keeps an audit entry of what was removed.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingRecordId(
        id
      );

      setError("");
      setNotice("");

      const token =
        await getAccessToken();

      const response =
        await fetch(
          `/api/admin/ai-team/uncle-sam/records/${id}`,
          {
            method:
              "DELETE",

            headers: {
              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                recordType:
                  type,
              }),
          }
        );

      const payload =
        await response
          .json()
          .catch(
            () => null
          );

      if (
        !response.ok ||
        !payload ||
        payload.ok !== true
      ) {
        throw new Error(
          payload?.error ||
            "Unable to remove record."
        );
      }

      if (
        editingRecordId === id
      ) {
        setEditingRecordId(
          null
        );

        resetForm(
          type
        );
      }

      setNotice(
        `${type.charAt(0).toUpperCase()}${type.slice(
          1
        )} removed successfully.`
      );

      await loadWorkspace();
    } catch (removeError) {
      setError(
        removeError instanceof
          Error
          ? removeError.message
          : "Unable to remove record."
      );
    } finally {
      setDeletingRecordId(
        null
      );
    }
  }

  async function saveRecord() {
    try {
      setSaving(true);
      setError("");
      setNotice("");

      const token =
        await getAccessToken();

      const response =
        await fetch(
          editingRecordId
            ? `/api/admin/ai-team/uncle-sam/records/${editingRecordId}`
            : "/api/admin/ai-team/uncle-sam/records",
          {
            method:
              editingRecordId
                ? "PATCH"
                : "POST",

            headers: {
              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                recordType,
                record:
                  form,
              }),
          }
        );

      const payload =
        await response
          .json()
          .catch(
            () => null
          );

      if (
        !response.ok ||
        !payload ||
        payload.ok !==
          true
      ) {
        throw new Error(
          payload?.error ||
            "Unable to save record."
        );
      }

      setNotice(
        editingRecordId
          ? `${recordType.charAt(0).toUpperCase()}${recordType.slice(
              1
            )} updated successfully.`
          : `${recordType.charAt(0).toUpperCase()}${recordType.slice(
              1
            )} recorded successfully.`
      );

      setEditingRecordId(
        null
      );

      resetForm(
        recordType
      );

      await loadWorkspace();
    } catch (saveError) {
      setError(
        saveError instanceof
          Error
          ? saveError.message
          : "Unable to save record."
      );
    } finally {
      setSaving(false);
    }
  }

  const latestExpenses =
    useMemo(
      () =>
        expenses.slice(
          0,
          6
        ),
      [expenses]
    );

  const latestSubscriptions =
    useMemo(
      () =>
        subscriptions.slice(
          0,
          6
        ),
      [subscriptions]
    );

  const latestAssets =
    useMemo(
      () =>
        assets.slice(
          0,
          6
        ),
      [assets]
    );

  if (loading) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-gray-200 bg-white">
        <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            Finance & Admin
          </p>

          <h2 className="mt-2 text-xl font-semibold text-[#1C1C1E]">
            Uncle Sam
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            Verified revenue plus Tetamo's internal expense,
            subscription and asset registers. These operating
            records do not replace formal accounting or tax
            records.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadWorkspace()
          }
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={
            <CircleDollarSign className="h-5 w-5" />
          }
          label="Verified revenue this month"
          value={formatTotals(
            monthRevenue
              ?.revenue
          )}
          detail={`${monthRevenue?.sales ?? 0} verified sale${
            (
              monthRevenue?.sales ??
              0
            ) === 1
              ? ""
              : "s"
          }`}
        />

        <MetricCard
          icon={
            <ReceiptText className="h-5 w-5" />
          }
          label="Expense records"
          value={String(
            expenses.length
          )}
          detail="Internal operating register"
        />

        <MetricCard
          icon={
            <CreditCard className="h-5 w-5" />
          }
          label="Subscriptions"
          value={String(
            subscriptions.length
          )}
          detail="Recurring services register"
        />

        <MetricCard
          icon={
            <Laptop className="h-5 w-5" />
          }
          label="Assets"
          value={String(
            assets.length
          )}
          detail="Equipment and capital register"
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {(
            [
              "expense",
              "subscription",
              "asset",
            ] as RecordType[]
          ).map(
            (type) => (
              <button
                key={type}
                type="button"
                onClick={() =>
                  changeRecordType(
                    type
                  )
                }
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  recordType ===
                  type
                    ? "bg-[#1C1C1E] text-white"
                    : "border border-gray-200 bg-white text-gray-600"
                }`}
              >
                Add{" "}
                {type}
              </button>
            )
          )}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {recordType ===
          "expense" ? (
            <>
              <SelectField
                label="Expense type"
                value={
                  form.expense_type
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "expense_type",
                    value
                  )
                }
                options={[
                  "software",
                  "infrastructure",
                  "marketing",
                  "communications",
                  "office",
                  "professional_services",
                  "operations",
                  "other",
                ]}
              />

              <TextField
                label="Description"
                value={
                  form.description
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "description",
                    value
                  )
                }
              />

              <TextField
                label="Vendor"
                value={
                  form.vendor_name
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "vendor_name",
                    value
                  )
                }
              />

              <TextField
                label="Amount"
                type="number"
                value={
                  form.amount
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "amount",
                    value
                  )
                }
              />

              <TextField
                label="Currency"
                value={
                  form.currency
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "currency",
                    value
                  )
                }
              />

              <TextField
                label="Expense date"
                type="date"
                value={
                  form.expense_date
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "expense_date",
                    value
                  )
                }
              />

              <SelectField
                label="Payment status"
                value={
                  form.payment_status
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "payment_status",
                    value
                  )
                }
                options={[
                  "planned",
                  "pending",
                  "paid",
                  "failed",
                  "refunded",
                  "cancelled",
                ]}
              />
            </>
          ) : null}

          {recordType ===
          "subscription" ? (
            <>
              <TextField
                label="Vendor"
                value={
                  form.vendor_name
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "vendor_name",
                    value
                  )
                }
              />

              <TextField
                label="Service"
                value={
                  form.service_name
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "service_name",
                    value
                  )
                }
              />

              <TextField
                label="Amount"
                type="number"
                value={
                  form.amount
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "amount",
                    value
                  )
                }
              />

              <TextField
                label="Currency"
                value={
                  form.currency
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "currency",
                    value
                  )
                }
              />

              <SelectField
                label="Billing cycle"
                value={
                  form.billing_cycle
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "billing_cycle",
                    value
                  )
                }
                options={[
                  "monthly",
                  "quarterly",
                  "semiannual",
                  "annual",
                  "usage_based",
                  "other",
                ]}
              />

              <SelectField
                label="Status"
                value={
                  form.status
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "status",
                    value
                  )
                }
                options={[
                  "trial",
                  "active",
                  "paused",
                  "cancelled",
                  "expired",
                  "review",
                ]}
              />

              <TextField
                label="Next renewal"
                type="date"
                value={
                  form
                    .next_renewal_date
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "next_renewal_date",
                    value
                  )
                }
              />

              <SelectField
                label="Value assessment"
                value={
                  form
                    .value_assessment
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "value_assessment",
                    value
                  )
                }
                options={[
                  "keep",
                  "replace",
                  "consolidate",
                  "cancel",
                  "review",
                ]}
              />

              <TextField
                label="Owner / team"
                value={
                  form.owner_name
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "owner_name",
                    value
                  )
                }
              />

              <TextField
                label="Business value"
                value={
                  form
                    .business_value
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "business_value",
                    value
                  )
                }
              />
            </>
          ) : null}

          {recordType ===
          "asset" ? (
            <>
              <TextField
                label="Asset type"
                value={
                  form.asset_type
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "asset_type",
                    value
                  )
                }
              />

              <TextField
                label="Asset name"
                value={
                  form.asset_name
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "asset_name",
                    value
                  )
                }
              />

              <TextField
                label="Vendor"
                value={
                  form.vendor_name
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "vendor_name",
                    value
                  )
                }
              />

              <TextField
                label="Purchase amount"
                type="number"
                value={
                  form
                    .purchase_amount
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "purchase_amount",
                    value
                  )
                }
              />

              <TextField
                label="Currency"
                value={
                  form.currency
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "currency",
                    value
                  )
                }
              />

              <TextField
                label="Purchase date"
                type="date"
                value={
                  form
                    .purchase_date
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "purchase_date",
                    value
                  )
                }
              />

              <SelectField
                label="Status"
                value={
                  form.status
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "status",
                    value
                  )
                }
                options={[
                  "active",
                  "stored",
                  "repair",
                  "retired",
                  "sold",
                  "lost",
                ]}
              />

              <TextField
                label="Assigned to"
                value={
                  form.assigned_to
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "assigned_to",
                    value
                  )
                }
              />

              <TextField
                label="Warranty expiry"
                type="date"
                value={
                  form
                    .warranty_expires_at
                }
                onChange={(
                  value
                ) =>
                  updateField(
                    "warranty_expires_at",
                    value
                  )
                }
              />
            </>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={
              saving
            }
            onClick={() =>
              void saveRecord()
            }
            className="inline-flex items-center gap-2 rounded-xl bg-[#1C1C1E] px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : editingRecordId ? (
              <Pencil className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}

            {editingRecordId
              ? "Update"
              : "Save"}{" "}
            {recordType}
          </button>

          {editingRecordId ? (
            <button
              type="button"
              onClick={
                cancelEdit
              }
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
              Cancel edit
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <RegisterCard
          title="Recent expenses"
          empty="No expenses recorded."
          rows={latestExpenses.map(
            (row) => ({
              id:
                row.id,
              title:
                row.description,
              subtitle:
                `${row.vendor_name || "No vendor"} • ${row.expense_date}`,
              value:
                `${row.currency} ${new Intl.NumberFormat(
                  "en-US"
                ).format(
                  row.amount
                )}`,

              onEdit:
                () =>
                  beginEditExpense(
                    row
                  ),

              onRemove:
                () =>
                  void removeRecord(
                    "expense",
                    row.id,
                    row.description
                  ),

              removing:
                deletingRecordId ===
                row.id,
            })
          )}
        />

        <RegisterCard
          title="Subscriptions"
          empty="No subscriptions recorded."
          rows={latestSubscriptions.map(
            (row) => ({
              id:
                row.id,
              title:
                row.service_name,
              subtitle:
                `${row.vendor_name} • ${row.status}`,
              value:
                row.amount !==
                    null &&
                  row.currency
                  ? `${row.currency} ${new Intl.NumberFormat(
                      "en-US"
                    ).format(
                      row.amount
                    )}`
                  : "Amount not recorded",

              onEdit:
                () =>
                  beginEditSubscription(
                    row
                  ),

              onRemove:
                () =>
                  void removeRecord(
                    "subscription",
                    row.id,
                    row.service_name
                  ),

              removing:
                deletingRecordId ===
                row.id,
            })
          )}
        />

        <RegisterCard
          title="Assets"
          empty="No assets recorded."
          rows={latestAssets.map(
            (row) => ({
              id:
                row.id,
              title:
                row.asset_name,
              subtitle:
                `${row.asset_type} • ${row.status}`,
              value:
                row.purchase_amount !==
                    null &&
                  row.currency
                  ? `${row.currency} ${new Intl.NumberFormat(
                      "en-US"
                    ).format(
                      row.purchase_amount
                    )}`
                  : "Value not recorded",

              onEdit:
                () =>
                  beginEditAsset(
                    row
                  ),

              onRemove:
                () =>
                  void removeRecord(
                    "asset",
                    row.id,
                    row.asset_name
                  ),

              removing:
                deletingRecordId ===
                row.id,
            })
          )}
        />
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon:
    React.ReactNode;
  label:
    string;
  value:
    string;
  detail:
    string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="text-gray-500">
        {icon}
      </div>

      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
        {label}
      </p>

      <p className="mt-2 text-xl font-semibold text-[#1C1C1E]">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-500">
        {detail}
      </p>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label:
    string;
  value:
    string;
  onChange:
    (
      value: string
    ) => void;
  type?:
    string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-gray-600">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-gray-400"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label:
    string;
  value:
    string;
  onChange:
    (
      value: string
    ) => void;
  options:
    string[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-gray-600">
        {label}
      </span>

      <select
        value={value}
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-400"
      >
        {options.map(
          (option) => (
            <option
              key={
                option
              }
              value={
                option
              }
            >
              {option.replace(
                /_/g,
                " "
              )}
            </option>
          )
        )}
      </select>
    </label>
  );
}

function RegisterCard({
  title,
  empty,
  rows,
}: {
  title:
    string;
  empty:
    string;
  rows:
    Array<{
      id: string;
      title: string;
      subtitle: string;
      value: string;
      onEdit: () => void;
      onRemove: () => void;
      removing: boolean;
    }>;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-[#1C1C1E]">
        {title}
      </h3>

      <div className="mt-4 space-y-3">
        {rows.length ? (
          rows.map(
            (row) => (
              <div
                key={
                  row.id
                }
                className="rounded-xl border border-gray-100 bg-gray-50 p-3"
              >
                <p className="text-sm font-semibold text-gray-800">
                  {row.title}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {row.subtitle}
                </p>

                <p className="mt-2 text-xs font-semibold text-gray-700">
                  {row.value}
                </p>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-200 pt-3">
                  <button
                    type="button"
                    onClick={
                      row.onEdit
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>

                  <button
                    type="button"
                    disabled={
                      row.removing
                    }
                    onClick={
                      row.onRemove
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {row.removing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Remove
                  </button>
                </div>
              </div>
            )
          )
        ) : (
          <p className="text-sm text-gray-400">
            {empty}
          </p>
        )}
      </div>
    </div>
  );
}
