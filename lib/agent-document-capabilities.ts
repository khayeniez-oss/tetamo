import {
  getAgentPackageById,
  type AgentPackage,
} from "@/app/data/pricelist";

export type AgentDocumentCapabilities = {
  packageId: string;

  hasAgentDocuments: boolean;

  hasInventoryTools: boolean;

  hasRentalAgreement: boolean;

  hasProfessionalLetters: boolean;
};

function clean(
  value: unknown
) {
  return String(
    value || ""
  ).trim();
}

function normalizePackageCandidate(
  value: unknown
) {
  return clean(
    value
  )
    .toLowerCase()
    .replace(
      /[_\s]+/g,
      "-"
    )
    .replace(
      /-+/g,
      "-"
    );
}

export function isMigratedAgentMembership(
  packageId: unknown,
  packageName: unknown
) {
  const value =
    `${clean(
      packageId
    )} ${clean(
      packageName
    )}`.toLowerCase();

  return value.includes(
    "migrated"
  );
}

export function resolveAgentPackageId(
  packageId: unknown,
  packageName?: unknown
) {
  const direct =
    normalizePackageCandidate(
      packageId
    );

  if (
    direct ===
    "silver"
  ) {
    return "silver";
  }

  if (
    direct ===
    "gold"
  ) {
    return "gold";
  }

  if (
    direct ===
    "agent-pro"
  ) {
    return "agent-pro";
  }

  const name =
    normalizePackageCandidate(
      packageName
    );

  if (
    name.includes(
      "agent-pro"
    )
  ) {
    return "agent-pro";
  }

  if (
    name.includes(
      "gold"
    )
  ) {
    return "gold";
  }

  if (
    name.includes(
      "silver"
    )
  ) {
    return "silver";
  }

  return (
    direct ||
    name
  );
}

function capabilitiesFromPackage(
  packageConfig:
    AgentPackage | null,

  resolvedPackageId:
    string
): AgentDocumentCapabilities {
  return {
    packageId:
      resolvedPackageId,

    hasAgentDocuments:
      packageConfig
        ?.hasAgentDocuments ===
      true,

    hasInventoryTools:
      packageConfig
        ?.hasInventoryTools ===
      true,

    hasRentalAgreement:
      packageConfig
        ?.hasRentalAgreement ===
      true,

    hasProfessionalLetters:
      packageConfig
        ?.hasProfessionalLetters ===
      true,
  };
}

export function resolveAgentDocumentCapabilities(
  packageId: unknown,
  packageName?: unknown
): AgentDocumentCapabilities {
  if (
    isMigratedAgentMembership(
      packageId,
      packageName
    )
  ) {
    return {
      packageId:
        "legacy-migrated",

      hasAgentDocuments:
        true,

      hasInventoryTools:
        true,

      hasRentalAgreement:
        true,

      hasProfessionalLetters:
        true,
    };
  }

  const resolvedPackageId =
    resolveAgentPackageId(
      packageId,
      packageName
    );

  const packageConfig =
    getAgentPackageById(
      resolvedPackageId
    ) || null;

  return capabilitiesFromPackage(
    packageConfig,
    resolvedPackageId
  );
}
