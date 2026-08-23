import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getAgentPackageById } from "../app/data/pricelist";

export type AgentMembershipPaymentInput = {
  id: string;
  user_id: string | null;
  payment_type: string | null;
  product_id: string | null;
  product_name_snapshot: string | null;
  product_type: string | null;
  duration_days: number | null;
  amount_total: number | null;
  currency: string | null;
  metadata: Record<string, unknown> | null;
};

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function getNumber(
  obj: Record<string, any>,
  key: string
): number | null {
  const value = obj?.[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPositiveNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

function addDaysIso(baseIso: string, days: number) {
  const base = new Date(baseIso);
  base.setUTCDate(base.getUTCDate() + days);

  return base.toISOString();
}

function normalizeMembershipBillingCycle(
  value: unknown
): "monthly" | "yearly" {
  const v = String(value || "").toLowerCase();
  return v === "monthly" ? "monthly" : "yearly";
}

function resolveAgentListingLimit(
  payment: AgentMembershipPaymentInput,
  metadata: Record<string, any>,
  packageId: string
) {
  const directLimit =
    getNumber(metadata, "listingLimit") ||
    getNumber(metadata, "activeListingLimit") ||
    getNumber(metadata, "listing_limit") ||
    getNumber(metadata, "active_listing_limit");

  if (directLimit && directLimit > 0) {
    return directLimit;
  }

  const packageConfig = getAgentPackageById(
    packageId.toLowerCase()
  );

  if (
    packageConfig?.maxListings &&
    packageConfig.maxListings > 0
  ) {
    return packageConfig.maxListings;
  }

  const packageName = String(
    metadata.packageName ||
      payment.product_name_snapshot ||
      ""
  ).toLowerCase();

  const value = `${packageId.toLowerCase()} ${packageName}`;

  if (value.includes("silver")) return 30;
  if (value.includes("gold")) return 100;
  if (value.includes("agent-pro")) return 500;

  return 0;
}

export async function activateAgentMembership({
  admin,
  payment,
  paidAtIso,
  activatedFrom,
  membershipExpiresAtIso,
}: {
  admin: SupabaseClient;
  payment: AgentMembershipPaymentInput;
  paidAtIso: string;
  activatedFrom: string;
  membershipExpiresAtIso?: string | null;
}) {
  if (!payment.user_id) {
    throw new Error(
      "Payment transaction has no user_id for agent membership."
    );
  }

  const metadata = asObject(payment.metadata);

  const rawPackageId = String(
    metadata.packageId ||
      metadata.package_id ||
      payment.product_id ||
      ""
  ).trim();

  if (!rawPackageId) {
    throw new Error(
      "Agent membership payment has no package ID."
    );
  }

  const packageId = rawPackageId.toLowerCase();
  const packageConfig =
    getAgentPackageById(packageId);

  const billingCycle = normalizeMembershipBillingCycle(
    metadata.selectedBillingCycle ||
      metadata.selected_billing_cycle ||
      metadata.billingCycle ||
      metadata.billing_cycle ||
      packageConfig?.billingCycle
  );

  const packageName = String(
    metadata.packageName ||
      metadata.package_name ||
      payment.product_name_snapshot ||
      packageConfig?.name ||
      packageId
  ).trim();

  const listingLimit = resolveAgentListingLimit(
    payment,
    metadata,
    packageId
  );

  const packageTermDays = toPositiveNumber(
    getNumber(metadata, "packageTermDays") ||
      getNumber(metadata, "package_term_days") ||
      getNumber(metadata, "productDurationDays") ||
      payment.duration_days ||
      packageConfig?.packageTermDays,
    billingCycle === "monthly" ? 30 : 365
  );

  const startsAt = paidAtIso;

  let expiresAt: string;

  if (membershipExpiresAtIso) {
    const explicitExpiry = new Date(
      membershipExpiresAtIso
    );

    if (!Number.isFinite(explicitExpiry.getTime())) {
      throw new Error(
        "Invalid explicit agent membership expiry."
      );
    }

    expiresAt = explicitExpiry.toISOString();
  } else {
    expiresAt = addDaysIso(
      paidAtIso,
      packageTermDays
    );
  }

  const nowIso = new Date().toISOString();

  await admin
    .from("agent_memberships")
    .update({
      status: "expired",
      updated_at: nowIso,
    })
    .eq("user_id", payment.user_id)
    .eq("status", "active")
    .neq("payment_id", payment.id);

  const { error } = await admin
    .from("agent_memberships")
    .upsert(
      {
        user_id: payment.user_id,
        payment_id: payment.id,
        package_id: packageId,
        package_name: packageName,
        billing_cycle: billingCycle,
        status: "active",
        auto_renew:
          packageConfig?.autoRenewDefault ?? true,
        starts_at: startsAt,
        expires_at: expiresAt,
        metadata: {
          ...metadata,
          payment_transaction_id: payment.id,
          payment_type: payment.payment_type,
          product_type: payment.product_type,
          product_id: payment.product_id,
          product_name_snapshot:
            payment.product_name_snapshot,
          amount_total: payment.amount_total,
          currency: payment.currency,
          activated_from: activatedFrom,
          activated_at: nowIso,
          package_id: packageId,
          package_name: packageName,
          billing_cycle: billingCycle,
          listing_limit: listingLimit,
          active_listing_limit: listingLimit,
          starts_at: startsAt,
          expires_at: expiresAt,
        },
        updated_at: nowIso,
      },
      { onConflict: "payment_id" }
    );

  if (error) throw error;

  return {
    activationType: "agent-membership",
    agentMembership: true,
    packageId,
    packageName,
    billingCycle,
    listingLimit,
    startsAt,
    expiresAt,
  };
}
