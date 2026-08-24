import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

import {
  getAgentPackageById,
} from "../app/data/pricelist";

import type {
  ResponseBodyV2DecodedPayload,
} from "@apple/app-store-server-library";

import {
  getAppleIapServerClient,
  getAppleSignedDataVerifier,
  verifyAppleSignedTransaction,
} from "./apple-iap-server";

type AppleEnvironment =
  | "production"
  | "sandbox";

const APPLE_STATUS = {
  ACTIVE: 1,
  EXPIRED: 2,
  BILLING_RETRY: 3,
  BILLING_GRACE_PERIOD: 4,
  REVOKED: 5,
} as const;

const APPLE_AUTO_RENEW = {
  OFF: 0,
  ON: 1,
} as const;

const APPLE_PRODUCT_TO_PACKAGE = {
  "tetamo.agent.silver.yearly": {
    packageId: "silver",
    billingCycle: "yearly",
  },

  "tetamo.agent.gold.yearly": {
    packageId: "gold",
    billingCycle: "yearly",
  },

  "tetamo.agent.pro.yearly": {
    packageId: "agent-pro",
    billingCycle: "yearly",
  },

  "tetamo.agent.pro.monthly": {
    packageId: "agent-pro",
    billingCycle: "monthly",
  },
} as const;

type SupportedAppleProductId =
  keyof typeof APPLE_PRODUCT_TO_PACKAGE;

function asObject(
  value: unknown
): Record<string, unknown> {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<
      string,
      unknown
    >;
  }

  return {};
}

function asIso(
  value: unknown
): string | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return null;
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date.toISOString();
}

function numberValue(
  value: unknown
): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  return null;
}

function statusName(
  status: number
) {
  switch (status) {
    case APPLE_STATUS.ACTIVE:
      return "active";

    case APPLE_STATUS.EXPIRED:
      return "expired";

    case APPLE_STATUS.BILLING_RETRY:
      return "billing_retry";

    case APPLE_STATUS
      .BILLING_GRACE_PERIOD:
      return "billing_grace_period";

    case APPLE_STATUS.REVOKED:
      return "revoked";

    default:
      return "unknown";
  }
}

function isSupportedProduct(
  productId: string
): productId is
  SupportedAppleProductId {
  return (
    productId in
    APPLE_PRODUCT_TO_PACKAGE
  );
}

function deterministicApplePaymentId(
  transactionId: string
) {
  const hex =
    createHash("sha256")
      .update(
        `tetamo-apple:${transactionId}`
      )
      .digest("hex")
      .slice(0, 32)
      .split("");

  hex[12] = "5";

  hex[16] = (
    (parseInt(hex[16], 16) & 0x3) |
    0x8
  ).toString(16);

  const value = hex.join("");

  return [
    value.slice(0, 8),
    value.slice(8, 12),
    value.slice(12, 16),
    value.slice(16, 20),
    value.slice(20, 32),
  ].join("-");
}

function getAdmin() {
  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL
      ?.trim() ||
    process.env
      .SUPABASE_URL
      ?.trim();

  const serviceRoleKey =
    process.env
      .SUPABASE_SERVICE_ROLE_KEY
      ?.trim();

  if (
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    throw new Error(
      "Supabase server credentials are missing."
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

export async function reconcileAppleAgentSubscriptionNotification({
  environment,
  notification,
}: {
  environment: AppleEnvironment;
  notification:
    ResponseBodyV2DecodedPayload;
}) {
  const data =
    notification.data;

  if (!data) {
    return {
      handled: false,
      retry: false,
      reason:
        "notification-has-no-subscription-data",
    };
  }

  const verifier =
    getAppleSignedDataVerifier(
      environment
    );

  let notificationTransaction:
    Awaited<
      ReturnType<
        typeof verifyAppleSignedTransaction
      >
    > | null = null;

  let notificationRenewal:
    Awaited<
      ReturnType<
        typeof verifier.verifyAndDecodeRenewalInfo
      >
    > | null = null;

  if (
    data.signedTransactionInfo
  ) {
    const verified =
      await verifyAppleSignedTransaction(
        data.signedTransactionInfo,
        environment
      );

    notificationTransaction =
      verified;
  }

  if (
    data.signedRenewalInfo
  ) {
    notificationRenewal =
      await verifier
        .verifyAndDecodeRenewalInfo(
          data.signedRenewalInfo
        );
  }

  const originalTransactionId =
    String(
      notificationTransaction
        ?.originalTransactionId ||
        notificationRenewal
          ?.originalTransactionId ||
        notificationTransaction
          ?.transactionId ||
        ""
    ).trim();

  const anyTransactionId =
    String(
      notificationTransaction
        ?.transactionId ||
        originalTransactionId ||
        ""
    ).trim();

  if (
    !originalTransactionId ||
    !anyTransactionId
  ) {
    return {
      handled: false,
      retry: false,
      reason:
        "notification-has-no-subscription-transaction",
    };
  }

  const notificationProductId =
    String(
      notificationTransaction
        ?.productId ||
        notificationRenewal
          ?.productId ||
        ""
    ).trim();

  if (
    notificationProductId &&
    !isSupportedProduct(
      notificationProductId
    )
  ) {
    return {
      handled: false,
      retry: false,
      reason:
        "notification-is-not-a-supported-tetamo-agent-product",
      originalTransactionId,
      productId:
        notificationProductId,
    };
  }

  const client =
    getAppleIapServerClient(
      environment
    );

  const statusResponse =
    await client
      .getAllSubscriptionStatuses(
        anyTransactionId
      );

  const candidates: Array<{
    status: number;
    transaction:
      Awaited<
        ReturnType<
          typeof verifyAppleSignedTransaction
        >
      >;
    renewal:
      Awaited<
        ReturnType<
          typeof verifier.verifyAndDecodeRenewalInfo
        >
      > | null;
    signedTransactionInfo: string;
  }> = [];

  for (
    const group of
    statusResponse.data || []
  ) {
    for (
      const item of
      group.lastTransactions || []
    ) {
      if (
        !item.signedTransactionInfo
      ) {
        continue;
      }

      const verified =
        await verifyAppleSignedTransaction(
          item.signedTransactionInfo,
          environment
        );

      const transaction =
        verified;

      if (
        String(
          transaction
            .originalTransactionId ||
            ""
        ) !==
        originalTransactionId
      ) {
        continue;
      }

      let renewal:
        Awaited<
          ReturnType<
            typeof verifier.verifyAndDecodeRenewalInfo
          >
        > | null = null;

      if (
        item.signedRenewalInfo
      ) {
        renewal =
          await verifier
            .verifyAndDecodeRenewalInfo(
              item.signedRenewalInfo
            );
      }

      const status =
        numberValue(
          item.status
        );

      if (status === null) {
        continue;
      }

      candidates.push({
        status,
        transaction,
        renewal,
        signedTransactionInfo:
          item.signedTransactionInfo,
      });
    }
  }

  if (!candidates.length) {
    return {
      handled: false,
      retry: true,
      reason:
        "apple-current-subscription-status-not-found",
      originalTransactionId,
    };
  }

  candidates.sort(
    (a, b) => {
      const aScore =
        numberValue(
          a.transaction.purchaseDate
        ) ||
        numberValue(
          a.transaction.signedDate
        ) ||
        numberValue(
          a.transaction.expiresDate
        ) ||
        0;

      const bScore =
        numberValue(
          b.transaction.purchaseDate
        ) ||
        numberValue(
          b.transaction.signedDate
        ) ||
        numberValue(
          b.transaction.expiresDate
        ) ||
        0;

      return bScore - aScore;
    }
  );

  const current =
    candidates[0];

  const status =
    current.status;

  const transaction =
    current.transaction;

  const renewal =
    current.renewal;

  const productId =
    String(
      transaction.productId ||
      ""
    ).trim();

  if (
    !productId ||
    !isSupportedProduct(
      productId
    )
  ) {
    return {
      handled: false,
      retry: false,
      reason:
        "not-a-supported-tetamo-agent-product",
      originalTransactionId,
      productId:
        productId || null,
      status,
    };
  }

  const config =
    APPLE_PRODUCT_TO_PACKAGE[
      productId
    ];

  const admin =
    getAdmin();

  const {
    data: memberships,
    error: membershipError,
  } =
    await admin
      .from(
        "agent_memberships"
      )
      .select(
        "id,user_id,payment_id,package_id,package_name,billing_cycle,status,auto_renew,starts_at,expires_at,metadata,updated_at"
      )
      .contains(
        "metadata",
        {
          apple_original_transaction_id:
            originalTransactionId,
          apple_environment:
            environment,
        }
      )
      .order(
        "updated_at",
        {
          ascending: false,
        }
      );

  if (membershipError) {
    throw membershipError;
  }

  if (
    !memberships ||
    !memberships.length
  ) {
    return {
      handled: false,
      retry: true,
      reason:
        "matching-apple-membership-not-found",
      originalTransactionId,
      productId,
      status,
    };
  }

  const userIds =
    Array.from(
      new Set(
        memberships
          .map(
            (row) =>
              String(
                row.user_id ||
                ""
              ).trim()
          )
          .filter(Boolean)
      )
    );

  if (
    userIds.length !== 1
  ) {
    throw new Error(
      "Apple subscription chain maps to an invalid number of Tetamo users."
    );
  }

  const appleAccountToken =
    String(
      transaction
        .appAccountToken ||
        notificationTransaction
          ?.appAccountToken ||
        ""
    ).trim();

  if (
    appleAccountToken &&
    appleAccountToken !==
      userIds[0]
  ) {
    throw new Error(
      "Apple appAccountToken does not match the Tetamo membership user."
    );
  }

  const transactionId =
    String(
      transaction.transactionId ||
      ""
    ).trim();

  if (!transactionId) {
    return {
      handled: false,
      retry: true,
      reason:
        "current-apple-transaction-has-no-id",
      originalTransactionId,
      productId,
      status,
    };
  }

  const packageConfig =
    getAgentPackageById(
      config.packageId
    );

  if (!packageConfig) {
    throw new Error(
      "Tetamo package configuration was not found."
    );
  }

  const userId =
    userIds[0];

  const exactMembership =
    memberships.find(
      (row) => {
        const metadata =
          asObject(
            row.metadata
          );

        return (
          String(
            metadata
              .apple_transaction_id ||
              ""
          ) === transactionId
        );
      }
    );

  const now =
    Date.now();

  const nowIso =
    new Date(now)
      .toISOString();

  const transactionExpires =
    numberValue(
      transaction.expiresDate
    );

  const graceExpires =
    numberValue(
      renewal
        ?.gracePeriodExpiresDate
    );

  const revocationDate =
    numberValue(
      transaction.revocationDate
    );

  const entitled =
    status ===
      APPLE_STATUS.ACTIVE ||
    status ===
      APPLE_STATUS
        .BILLING_GRACE_PERIOD;

  let effectiveExpiresMs:
    number;

  if (
    status ===
    APPLE_STATUS.ACTIVE
  ) {
    if (
      transactionExpires ===
      null
    ) {
      return {
        handled: false,
        retry: true,
        reason:
          "active-subscription-has-no-expiry",
        originalTransactionId,
        productId,
        status,
      };
    }

    effectiveExpiresMs =
      transactionExpires;
  } else if (
    status ===
    APPLE_STATUS
      .BILLING_GRACE_PERIOD
  ) {
    const graceEnd =
      graceExpires ||
      transactionExpires;

    if (
      graceEnd === null
    ) {
      return {
        handled: false,
        retry: true,
        reason:
          "grace-period-has-no-expiry",
        originalTransactionId,
        productId,
        status,
      };
    }

    effectiveExpiresMs =
      graceEnd;
  } else if (
    status ===
    APPLE_STATUS.REVOKED
  ) {
    effectiveExpiresMs =
      Math.min(
        revocationDate ||
          transactionExpires ||
          now,
        now
      );
  } else {
    effectiveExpiresMs =
      Math.min(
        transactionExpires ||
          now,
        now
      );
  }

  const effectiveExpiresAt =
    new Date(
      effectiveExpiresMs
    ).toISOString();

  const purchaseDateMs =
    numberValue(
      transaction.purchaseDate
    );

  const paidAtIso =
    purchaseDateMs
      ? new Date(
          purchaseDateMs
        ).toISOString()
      : nowIso;

  let autoRenew =
    exactMembership
      ? Boolean(
          exactMembership
            .auto_renew
        )
      : Boolean(
          packageConfig
            .autoRenewDefault
        );

  if (
    renewal
      ?.autoRenewStatus ===
    APPLE_AUTO_RENEW.ON
  ) {
    autoRenew = true;
  } else if (
    renewal
      ?.autoRenewStatus ===
    APPLE_AUTO_RENEW.OFF
  ) {
    autoRenew = false;
  }

  const paymentId =
    deterministicApplePaymentId(
      transactionId
    );

  const {
    data: existingPayment,
    error:
      existingPaymentError,
  } =
    await admin
      .from(
        "payment_transactions"
      )
      .select(
        "id,user_id,metadata"
      )
      .eq(
        "id",
        paymentId
      )
      .maybeSingle();

  if (existingPaymentError) {
    throw existingPaymentError;
  }

  if (
    existingPayment &&
    existingPayment.user_id !==
      userId
  ) {
    throw new Error(
      "Apple transaction is already associated with another Tetamo user."
    );
  }

  const amountTotal =
    config.billingCycle ===
      "monthly" &&
    packageConfig
      .monthlyPriceIdr
      ? packageConfig
          .monthlyPriceIdr
      : packageConfig
          .priceIdr;

  const durationDays =
    transactionExpires !== null &&
    purchaseDateMs !== null &&
    transactionExpires >
      purchaseDateMs
      ? Math.max(
          1,
          Math.ceil(
            (
              transactionExpires -
              purchaseDateMs
            ) /
              86_400_000
          )
        )
      : Math.max(
          1,
          packageConfig
            .durationDays
        );

  const previousPaymentMetadata =
    asObject(
      existingPayment
        ?.metadata
    );

  const previousMembershipMetadata =
    asObject(
      exactMembership
        ?.metadata
    );

  const billingPlanType =
    String(
      transaction
        .billingPlanType ||
        ""
    ).toUpperCase();

  const commitmentInfo =
    asObject(
      transaction
        .commitmentInfo
    );

  const signedTransactionSha256 =
    createHash("sha256")
      .update(
        current
          .signedTransactionInfo
      )
      .digest("hex");

  const lifecycleMetadata = {
    apple_transaction_id:
      transactionId,

    apple_original_transaction_id:
      originalTransactionId,

    apple_product_id:
      productId,

    apple_environment:
      environment,

    apple_app_account_token:
      appleAccountToken ||
      null,

    apple_billing_plan_type:
      billingPlanType ||
      null,

    apple_purchase_date:
      paidAtIso,

    apple_expires_at:
      asIso(
        transaction.expiresDate
      ),

    apple_commitment_info:
      Object.keys(
        commitmentInfo
      ).length
        ? commitmentInfo
        : null,

    apple_signed_transaction_sha256:
      signedTransactionSha256,

    apple_subscription_status:
      status,

    apple_subscription_status_name:
      statusName(status),

    apple_auto_renew_status:
      renewal
        ?.autoRenewStatus ??
      null,

    apple_is_in_billing_retry_period:
      renewal
        ?.isInBillingRetryPeriod ??
      false,

    apple_grace_period_expires_at:
      asIso(
        renewal
          ?.gracePeriodExpiresDate
      ),

    apple_expiration_intent:
      renewal
        ?.expirationIntent ??
      null,

    apple_revocation_date:
      asIso(
        transaction
          .revocationDate
      ),

    apple_last_notification_uuid:
      notification
        .notificationUUID ||
      null,

    apple_last_notification_type:
      notification
        .notificationType ||
      null,

    apple_last_notification_subtype:
      notification.subtype ||
      null,

    apple_last_notification_signed_at:
      asIso(
        notification.signedDate
      ),

    apple_last_reconciled_at:
      nowIso,
  };

  const paymentMetadata = {
    ...previousPaymentMetadata,

    request_source:
      "api/apple/iap/notifications",

    gateway: "apple",

    payment_method:
      "apple_iap",

    packageId:
      config.packageId,

    packageName:
      packageConfig.name,

    packageTermDays:
      packageConfig
        .packageTermDays,

    listingLimit:
      packageConfig
        .maxListings,

    selectedBillingCycle:
      config.billingCycle,

    selected_billing_cycle:
      config.billingCycle,

    ...lifecycleMetadata,

    verified_at:
      nowIso,
  };

  const {
    data: profileData,
  } =
    await admin
      .from("profiles")
      .select(
        "full_name,phone,email"
      )
      .eq(
        "id",
        userId
      )
      .maybeSingle();

  const paymentRow = {
    id:
      paymentId,

    user_id:
      userId,

    property_id:
      null,

    source_role:
      "agent",

    payment_type:
      "package",

    product_id:
      config.packageId,

    product_name_snapshot:
      packageConfig.name,

    product_type:
      "membership",

    audience_snapshot:
      null,

    status:
      "paid",

    currency:
      "idr",

    amount_subtotal:
      amountTotal,

    amount_discount:
      0,

    amount_tax:
      0,

    amount_total:
      amountTotal,

    description:
      `${packageConfig.name} Membership - Apple In-App Purchase`,

    plan_name:
      packageConfig.name,

    duration_days:
      durationDays,

    property_title_snapshot:
      null,

    property_code_snapshot:
      null,

    customer_name:
      profileData
        ?.full_name ||
      null,

    customer_email:
      profileData
        ?.email ||
      null,

    customer_phone:
      profileData
        ?.phone ||
      null,

    checkout_url:
      null,

    paid_at:
      paidAtIso,

    metadata:
      paymentMetadata,

    created_at:
      existingPayment
        ? undefined
        : paidAtIso,

    updated_at:
      nowIso,
  };

  const cleanPaymentRow =
    Object.fromEntries(
      Object.entries(
        paymentRow
      ).filter(
        (
          [, value]
        ) =>
          value !==
          undefined
      )
    );

  const {
    error:
      paymentUpsertError,
  } =
    await admin
      .from(
        "payment_transactions"
      )
      .upsert(
        cleanPaymentRow,
        {
          onConflict:
            "id",
        }
      );

  if (paymentUpsertError) {
    throw paymentUpsertError;
  }

  const startsAt =
    paidAtIso;

  const membershipMetadata = {
    ...previousMembershipMetadata,
    ...paymentMetadata,

    payment_transaction_id:
      paymentId,

    payment_type:
      "package",

    product_type:
      "membership",

    product_id:
      config.packageId,

    product_name_snapshot:
      packageConfig.name,

    amount_total:
      amountTotal,

    currency:
      "idr",

    activated_from:
      "apple_server_notification",

    activated_at:
      nowIso,

    package_id:
      config.packageId,

    package_name:
      packageConfig.name,

    billing_cycle:
      config.billingCycle,

    listing_limit:
      packageConfig
        .maxListings,

    active_listing_limit:
      packageConfig
        .maxListings,

    starts_at:
      startsAt,

    expires_at:
      effectiveExpiresAt,
  };

  const {
    error:
      membershipUpsertError,
  } =
    await admin
      .from(
        "agent_memberships"
      )
      .upsert(
        {
          user_id:
            userId,

          payment_id:
            paymentId,

          package_id:
            config.packageId,

          package_name:
            packageConfig.name,

          billing_cycle:
            config.billingCycle,

          status:
            entitled
              ? "active"
              : "expired",

          auto_renew:
            autoRenew,

          starts_at:
            startsAt,

          expires_at:
            effectiveExpiresAt,

          metadata:
            membershipMetadata,

          updated_at:
            nowIso,
        },
        {
          onConflict:
            "payment_id",
        }
      );

  if (
    membershipUpsertError
  ) {
    throw membershipUpsertError;
  }

  // Expire ONLY older memberships in this exact
  // Apple subscription chain. HitPay/manual rows
  // cannot match this metadata filter.
  const {
    error:
      expireOldChainError,
  } =
    await admin
      .from(
        "agent_memberships"
      )
      .update({
        status:
          "expired",
        updated_at:
          nowIso,
      })
      .contains(
        "metadata",
        {
          apple_original_transaction_id:
            originalTransactionId,

          apple_environment:
            environment,
        }
      )
      .neq(
        "payment_id",
        paymentId
      );

  if (
    expireOldChainError
  ) {
    throw expireOldChainError;
  }

  const finalPaymentMetadata = {
    ...paymentMetadata,

    activation: {
      done: true,
      processedAt:
        nowIso,
      processedBy:
        "apple_server_notification",

      activationType:
        "agent-membership",

      agentMembership:
        true,

      packageId:
        config.packageId,

      packageName:
        packageConfig.name,

      billingCycle:
        config.billingCycle,

      listingLimit:
        packageConfig
          .maxListings,

      startsAt,

      expiresAt:
        effectiveExpiresAt,
    },
  };

  const {
    error:
      finalPaymentUpdateError,
  } =
    await admin
      .from(
        "payment_transactions"
      )
      .update({
        metadata:
          finalPaymentMetadata,

        updated_at:
          nowIso,
      })
      .eq(
        "id",
        paymentId
      );

  if (
    finalPaymentUpdateError
  ) {
    throw finalPaymentUpdateError;
  }

  return {
    handled: true,
    retry: false,

    reason:
      "apple-subscription-reconciled",

    originalTransactionId,

    transactionId,

    paymentId,

    productId,

    packageId:
      config.packageId,

    billingCycle:
      config.billingCycle,

    status,

    statusName:
      statusName(status),

    autoRenew,

    entitled,

    expiresAt:
      effectiveExpiresAt,
  };
}
