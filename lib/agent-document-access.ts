import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  getAgentPackageById,
} from "@/app/data/pricelist";

import {
  resolveAgentDocumentCapabilities,
  type AgentDocumentCapabilities,
} from "@/lib/agent-document-capabilities";

export type {
  AgentDocumentCapabilities,
} from "@/lib/agent-document-capabilities";

export type AgentDocumentAccessResult = {
  allowed: boolean;

  reason:
    | "allowed"
    | "no-active-membership"
    | "package-not-eligible";

  membershipId:
    string | null;

  packageId:
    string;

  packageName:
    string;

  capabilities:
    AgentDocumentCapabilities;
};

type AgentMembershipRow = {
  id: string;

  package_id:
    string | null;

  package_name:
    string | null;

  status:
    string | null;

  expires_at:
    string | null;

  created_at:
    string | null;
};

function clean(
  value: unknown
) {
  return String(
    value || ""
  ).trim();
}

function isMembershipActive(
  membership:
    AgentMembershipRow | null
) {
  if (!membership) {
    return false;
  }

  if (
    membership.status !==
    "active"
  ) {
    return false;
  }

  if (
    !membership.expires_at
  ) {
    return true;
  }

  const expiresAt =
    new Date(
      membership.expires_at
    );

  if (
    Number.isNaN(
      expiresAt.getTime()
    )
  ) {
    return false;
  }

  return (
    expiresAt.getTime() >=
    Date.now()
  );
}

export async function getAgentDocumentAccess(
  admin:
    SupabaseClient,

  userId:
    string
): Promise<AgentDocumentAccessResult> {
  const {
    data,
    error,
  } =
    await admin
      .from(
        "agent_memberships"
      )
      .select(
        "id, package_id, package_name, status, expires_at, created_at"
      )
      .eq(
        "user_id",
        userId
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );

  if (error) {
    throw error;
  }

  const memberships =
    (
      data || []
    ) as
      AgentMembershipRow[];

  const activeMembership =
    memberships.find(
      isMembershipActive
    ) || null;

  if (
    !activeMembership
  ) {
    const capabilities =
      resolveAgentDocumentCapabilities(
        "",
        ""
      );

    return {
      allowed:
        false,

      reason:
        "no-active-membership",

      membershipId:
        null,

      packageId:
        "",

      packageName:
        "",

      capabilities,
    };
  }

  const capabilities =
    resolveAgentDocumentCapabilities(
      activeMembership
        .package_id,

      activeMembership
        .package_name
    );

  const packageId =
    capabilities
      .packageId;

  const packageConfig =
    packageId ===
    "legacy-migrated"
      ? null
      : (
          getAgentPackageById(
            packageId
          ) || null
        );

  return {
    allowed:
      capabilities
        .hasAgentDocuments,

    reason:
      capabilities
        .hasAgentDocuments
        ? "allowed"
        : "package-not-eligible",

    membershipId:
      activeMembership.id,

    packageId,

    packageName:
      clean(
        activeMembership
          .package_name
      ) ||
      packageConfig?.name ||
      packageId,

    capabilities,
  };
}
