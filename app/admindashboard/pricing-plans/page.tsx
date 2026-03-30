"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* =========================
TYPES
========================= */

type PricingPlan = {
  id: string;
  name: string;
  price: string;
  description: string;
  active: boolean;
};

type PricingPlanRow = {
  id: string;
  plan_name: string | null;
  plan_code: string | null;
  plan_type:
    | "listing"
    | "featured"
    | "boost"
    | "spotlight"
    | "membership"
    | "subscription"
    | "other"
    | null;
  billing_cycle:
    | "one_time"
    | "daily"
    | "weekly"
    | "monthly"
    | "quarterly"
    | "yearly"
    | null;
  price: number | null;
  currency: string | null;
  duration_days: number | null;
  payment_description: string | null;
  billing_note: string | null;
  is_active: boolean | null;
};

/* =========================
HELPERS
========================= */

function formatAmount(value: number | null, currency: string | null) {
  const amount = Number(value ?? 0);
  const code = (currency || "IDR").toUpperCase();

  if (code === "IDR") {
    return `Rp ${new Intl.NumberFormat("id-ID").format(amount)}`;
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${code} ${new Intl.NumberFormat("en-US").format(amount)}`;
  }
}

function formatPlanType(planType: PricingPlanRow["plan_type"]) {
  switch (planType) {
    case "listing":
      return "Listing";
    case "featured":
      return "Featured";
    case "boost":
      return "Boost";
    case "spotlight":
      return "Spotlight";
    case "membership":
      return "Membership";
    case "subscription":
      return "Subscription";
    case "other":
      return "Other";
    default:
      return "";
  }
}

function formatBillingCycle(
  billingCycle: PricingPlanRow["billing_cycle"],
  durationDays: number | null
) {
  switch (billingCycle) {
    case "one_time":
      return durationDays ? `One-time • ${durationDays} days` : "One-time";
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    case "quarterly":
      return "Quarterly";
    case "yearly":
      return "Yearly";
    default:
      return "";
  }
}

function getDescription(row: PricingPlanRow) {
  if (row.payment_description?.trim()) return row.payment_description.trim();
  if (row.billing_note?.trim()) return row.billing_note.trim();

  const left = formatPlanType(row.plan_type);
  const right = formatBillingCycle(row.billing_cycle, row.duration_days);

  if (left && right) return `${left} • ${right}`;
  if (left) return left;
  if (right) return right;

  return "-";
}

/* =========================
PAGE
========================= */

export default function AdminPricingPage() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPlans() {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("pricing_plans")
        .select(
          `
            id,
            plan_name,
            plan_code,
            plan_type,
            billing_cycle,
            price,
            currency,
            duration_days,
            payment_description,
            billing_note,
            is_active
          `
        )
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (!isMounted) return;

      if (error) {
        console.error("Failed to load pricing plans:", error);
        setError("Gagal memuat pricing plans.");
        setPlans([]);
        setLoading(false);
        return;
      }

      const mapped: PricingPlan[] = ((data || []) as PricingPlanRow[]).map(
        (row) => ({
          id: row.id,
          name: row.plan_name?.trim() || row.plan_code?.trim() || "-",
          price: formatAmount(row.price, row.currency),
          description: getDescription(row),
          active: Boolean(row.is_active),
        })
      );

      setPlans(mapped);
      setLoading(false);
    }

    loadPlans();

    return () => {
      isMounted = false;
    };
  }, []);

  async function togglePlan(id: string) {
    const current = plans.find((p) => p.id === id);
    if (!current) return;

    const nextActive = !current.active;

    setSavingId(id);
    setError("");

    const { error } = await supabase
      .from("pricing_plans")
      .update({ is_active: nextActive })
      .eq("id", id);

    if (error) {
      console.error("Failed to toggle pricing plan:", error);
      setError("Gagal mengubah status pricing plan.");
      setSavingId(null);
      return;
    }

    setPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: nextActive } : p))
    );

    setSavingId(null);
  }

  return (
    <div>
      {/* Header */}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1C1C1E]">Pricing Plans</h1>
        <p className="text-sm text-gray-500">
          Kelola harga paket listing Tetamo.
        </p>
      </div>

      {/* Plans */}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading pricing plans...</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : plans.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">Belum ada pricing plan.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="flex items-center justify-between gap-6 p-6"
              >
                {/* LEFT */}

                <div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs ${
                      plan.active
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-gray-200 bg-gray-100 text-gray-700"
                    }`}
                  >
                    {plan.active ? "Active" : "Inactive"}
                  </span>

                  <p className="mt-2 font-semibold text-[#1C1C1E]">
                    {plan.name}
                  </p>

                  <p className="text-sm text-gray-500">{plan.description}</p>

                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {plan.price}
                  </p>
                </div>

                {/* ACTIONS */}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-lg border px-3 py-2 hover:bg-gray-50"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePlan(plan.id)}
                    disabled={savingId === plan.id}
                    className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingId === plan.id
                      ? "Saving..."
                      : plan.active
                      ? "Disable"
                      : "Enable"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}