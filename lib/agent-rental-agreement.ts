export type RentalAgreementLanguage =
  | "id"
  | "bilingual";

export type RentalPartyType =
  | "individual"
  | "company";

export type RentalIdentityType =
  | "ktp"
  | "passport"
  | "company_registration"
  | "other";

export type RentalCurrency =
  | "IDR"
  | "USD"
  | "AUD";

export type RentalPaymentFrequency =
  | "full"
  | "monthly"
  | "quarterly"
  | "semiannual"
  | "yearly"
  | "custom";

export type RentalResponsibility =
  | "landlord"
  | "tenant"
  | "included"
  | "shared"
  | "not_applicable";

export type RentalParty = {
  partyType: RentalPartyType;

  fullName: string;
  companyName: string;

  nationality: string;

  identityType:
    RentalIdentityType;

  identityNumber: string;

  address: string;
  phone: string;
  email: string;

  representativeName: string;
  representativeTitle: string;
  representativeAuthority: string;
};

export type RentalProperty = {
  id: string;

  code: string;
  title: string;

  address: string;
  location: string;

  propertyType: string;

  bedrooms: number;
  bathrooms: number;
};

export type RentalAgent = {
  name: string;
  agency: string;
  phone: string;
  email: string;
  address: string;
};

export type RentalFinancialTerms = {
  currency:
    RentalCurrency;

  rentAmount: number;

  paymentFrequency:
    RentalPaymentFrequency;

  paymentScheduleNotes:
    string;

  // Used only when Payment Frequency = Custom.
  manualBaseRentTotal: number;

  // Entered manually by the agent.
  // Tetamo does not calculate tax percentages.
  taxAdditionalCharges: number;

  taxAdditionalChargesNotes:
    string;

  securityDeposit: number;

  depositReturnDays: number;

  latePaymentGraceDays: number;

  paymentMethod: string;

  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
};

export type RentalUtilities = {
  electricity:
    RentalResponsibility;

  water:
    RentalResponsibility;

  internet:
    RentalResponsibility;

  garbage:
    RentalResponsibility;

  banjarCommunityFees:
    RentalResponsibility;

  poolMaintenance:
    RentalResponsibility;

  gardenMaintenance:
    RentalResponsibility;

  housekeeping:
    RentalResponsibility;

  otherNotes: string;
};

export type RentalOccupancyTerms = {
  permittedUse: string;

  maximumOccupants: number;

  occupantNames: string[];

  petsAllowed: boolean;
  smokingAllowed: boolean;

  sublettingAllowed: boolean;

  sublettingNotes: string;
};

export type RentalMaintenanceTerms = {
  tenantRoutineMaintenance:
    string;

  landlordMaintenance:
    string;

  minorRepairThreshold: number;

  damageResponsibility:
    string;

  alterationRules:
    string;

  inspectionNoticeHours: number;
};

export type RentalRenewalTerms = {
  renewalAvailable: boolean;

  renewalNoticeDays: number;

  renewalNotes: string;
};

export type RentalTerminationTerms = {
  tenantEarlyTerminationAllowed:
    boolean;

  landlordEarlyTerminationAllowed:
    boolean;

  noticeDays: number;

  breachCureDays: number;

  earlyTerminationNotes:
    string;

  depositDeductionNotes:
    string;
};

export type RentalInventoryAttachment = {
  enabled: boolean;

  documentId: string;

  documentTitle: string;
};

export type RentalCustomClause = {
  id: string;

  titleId: string;
  titleEn: string;

  bodyId: string;
  bodyEn: string;

  enabled: boolean;
};

export type RentalWitness = {
  name: string;
  identityNumber: string;
  address: string;
};

export type RentalAgreementData = {
  version: 1;

  language:
    RentalAgreementLanguage;

  agreementNumber: string;

  agreementDate: string;

  placeOfAgreement: string;

  governingLanguage:
    "id" | "en";

  landlord:
    RentalParty;

  tenant:
    RentalParty;

  property:
    RentalProperty;

  agent:
    RentalAgent;

  leaseStartDate: string;
  leaseEndDate: string;

  handoverDate: string;

  financial:
    RentalFinancialTerms;

  utilities:
    RentalUtilities;

  occupancy:
    RentalOccupancyTerms;

  maintenance:
    RentalMaintenanceTerms;

  renewal:
    RentalRenewalTerms;

  termination:
    RentalTerminationTerms;

  inventoryAttachment:
    RentalInventoryAttachment;

  houseRules: string[];

  forceMajeureNotes: string;

  disputeResolution: string;

  governingLaw: string;

  customClauses:
    RentalCustomClause[];

  witness1:
    RentalWitness;

  witness2:
    RentalWitness;

  specialNotes: string;
};

function emptyParty():
  RentalParty {
  return {
    partyType:
      "individual",

    fullName: "",
    companyName: "",

    nationality:
      "Indonesia",

    identityType:
      "ktp",

    identityNumber: "",

    address: "",
    phone: "",
    email: "",

    representativeName:
      "",

    representativeTitle:
      "",

    representativeAuthority:
      "",
  };
}

function emptyWitness():
  RentalWitness {
  return {
    name: "",
    identityNumber: "",
    address: "",
  };
}

export function createRentalAgreementData(
  input: {
    property:
      RentalProperty;

    agent:
      RentalAgent;

    language?:
      RentalAgreementLanguage;
  }
):
  RentalAgreementData {
  return {
    version: 1,

    language:
      input.language ||
      "id",

    agreementNumber: "",

    agreementDate: "",

    placeOfAgreement:
      "",

    governingLanguage:
      "id",

    landlord:
      emptyParty(),

    tenant:
      emptyParty(),

    property:
      input.property,

    agent:
      input.agent,

    leaseStartDate: "",
    leaseEndDate: "",

    handoverDate: "",

    financial: {
      currency:
        "IDR",

      rentAmount: 0,

      paymentFrequency:
        "yearly",

      paymentScheduleNotes:
        "",

      manualBaseRentTotal:
        0,

      taxAdditionalCharges:
        0,

      taxAdditionalChargesNotes:
        "",

      securityDeposit: 0,

      depositReturnDays:
        14,

      latePaymentGraceDays:
        7,

      paymentMethod: "",

      bankName: "",
      bankAccountName: "",
      bankAccountNumber:
        "",
    },

    utilities: {
      electricity:
        "tenant",

      water:
        "tenant",

      internet:
        "tenant",

      garbage:
        "tenant",

      banjarCommunityFees:
        "landlord",

      poolMaintenance:
        "landlord",

      gardenMaintenance:
        "landlord",

      housekeeping:
        "tenant",

      otherNotes: "",
    },

    occupancy: {
      permittedUse:
        "Residential use only",

      maximumOccupants:
        0,

      occupantNames: [],

      petsAllowed:
        false,

      smokingAllowed:
        false,

      sublettingAllowed:
        false,

      sublettingNotes:
        "",
    },

    maintenance: {
      tenantRoutineMaintenance:
        "",

      landlordMaintenance:
        "",

      minorRepairThreshold:
        0,

      damageResponsibility:
        "",

      alterationRules:
        "",

      inspectionNoticeHours:
        24,
    },

    renewal: {
      renewalAvailable:
        true,

      renewalNoticeDays:
        30,

      renewalNotes: "",
    },

    termination: {
      tenantEarlyTerminationAllowed:
        false,

      landlordEarlyTerminationAllowed:
        false,

      noticeDays:
        30,

      breachCureDays:
        7,

      earlyTerminationNotes:
        "",

      depositDeductionNotes:
        "",
    },

    inventoryAttachment: {
      enabled:
        false,

      documentId: "",

      documentTitle: "",
    },

    houseRules: [],

    forceMajeureNotes:
      "",

    disputeResolution:
      "",

    governingLaw:
      "Laws of the Republic of Indonesia",

    customClauses: [],

    witness1:
      emptyWitness(),

    witness2:
      emptyWitness(),

    specialNotes: "",
  };
}

export function calculateLeaseMonths(
  startDate: string,
  endDate: string
) {
  if (
    !startDate ||
    !endDate
  ) {
    return 0;
  }

  const start =
    new Date(
      `${startDate}T00:00:00Z`
    );

  const end =
    new Date(
      `${endDate}T00:00:00Z`
    );

  if (
    Number.isNaN(
      start.getTime()
    ) ||
    Number.isNaN(
      end.getTime()
    ) ||
    end <= start
  ) {
    return 0;
  }

  let months =
    (
      end.getUTCFullYear() -
      start.getUTCFullYear()
    ) *
      12 +
    (
      end.getUTCMonth() -
      start.getUTCMonth()
    );

  if (
    end.getUTCDate() >
    start.getUTCDate()
  ) {
    months += 1;
  }

  return Math.max(
    1,
    months
  );
}

export function calculateRentalBaseTotal(
  data: RentalAgreementData
) {
  const rate =
    Number(
      data.financial
        .rentAmount || 0
    );

  if (
    !Number.isFinite(rate) ||
    rate < 0
  ) {
    return 0;
  }

  const frequency =
    data.financial
      .paymentFrequency;

  /*
   * Full / upfront means the entered amount
   * is already the total base rent.
   */
  if (
    frequency === "full"
  ) {
    return rate;
  }

  /*
   * Custom schedules cannot be inferred safely,
   * so the agent enters the total manually.
   */
  if (
    frequency === "custom"
  ) {
    const manual =
      Number(
        data.financial
          .manualBaseRentTotal ||
          0
      );

    return (
      Number.isFinite(manual) &&
      manual >= 0
        ? manual
        : 0
    );
  }

  const months =
    calculateLeaseMonths(
      data.leaseStartDate,
      data.leaseEndDate
    );

  if (!months) {
    return 0;
  }

  if (
    frequency === "monthly"
  ) {
    return (
      rate *
      months
    );
  }

  if (
    frequency === "quarterly"
  ) {
    return (
      rate *
      Math.ceil(
        months / 3
      )
    );
  }

  if (
    frequency ===
    "semiannual"
  ) {
    return (
      rate *
      Math.ceil(
        months / 6
      )
    );
  }

  if (
    frequency === "yearly"
  ) {
    return (
      rate *
      Math.ceil(
        months / 12
      )
    );
  }

  return 0;
}

export function calculateRentalAgreedTotal(
  data: RentalAgreementData
) {
  const baseRent =
    calculateRentalBaseTotal(
      data
    );

  const additional =
    Number(
      data.financial
        .taxAdditionalCharges ||
        0
    );

  const safeAdditional =
    Number.isFinite(
      additional
    ) &&
    additional > 0
      ? additional
      : 0;

  return (
    baseRent +
    safeAdditional
  );
}

export function createRentalCustomClause() {
  const id =
    typeof crypto !==
      "undefined" &&
    typeof crypto.randomUUID ===
      "function"
      ? crypto.randomUUID()
      : `clause-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

  return {
    id,

    titleId:
      "Klausul Tambahan",

    titleEn:
      "Additional Clause",

    bodyId: "",
    bodyEn: "",

    enabled: true,
  } satisfies RentalCustomClause;
}
