import "server-only";

import {
  AppStoreServerAPIClient,
  Environment,
} from "@apple/app-store-server-library";

export const TETAMO_PARTNER_IOS_BUNDLE_ID =
  "com.tetamo.partner";

type AppleIapEnvironment =
  | "sandbox"
  | "production";

const clients: Partial<
  Record<
    AppleIapEnvironment,
    AppStoreServerAPIClient
  >
> = {};

function getAppleIapCredentials() {
  const keyId =
    process.env.APPLE_IAP_KEY_ID?.trim();

  const issuerId =
    process.env.APPLE_IAP_ISSUER_ID?.trim();

  const rawPrivateKey =
    process.env.APPLE_IAP_PRIVATE_KEY;

  if (!keyId) {
    throw new Error(
      "Missing APPLE_IAP_KEY_ID"
    );
  }

  if (!issuerId) {
    throw new Error(
      "Missing APPLE_IAP_ISSUER_ID"
    );
  }

  if (!rawPrivateKey) {
    throw new Error(
      "Missing APPLE_IAP_PRIVATE_KEY"
    );
  }

  return {
    keyId,
    issuerId,
    privateKey:
      rawPrivateKey.replace(
        /\\n/g,
        "\n"
      ),
  };
}

function toAppleEnvironment(
  environment: AppleIapEnvironment
) {
  return environment ===
    "production"
    ? Environment.PRODUCTION
    : Environment.SANDBOX;
}

export function getAppleIapServerClient(
  environment: AppleIapEnvironment
) {
  const existing =
    clients[environment];

  if (existing) {
    return existing;
  }

  const {
    keyId,
    issuerId,
    privateKey,
  } = getAppleIapCredentials();

  const client =
    new AppStoreServerAPIClient(
      privateKey,
      keyId,
      issuerId,
      TETAMO_PARTNER_IOS_BUNDLE_ID,
      toAppleEnvironment(
        environment
      )
    );

  clients[environment] =
    client;

  return client;
}
