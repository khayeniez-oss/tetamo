import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  AppStoreServerAPIClient,
  Environment,
  SignedDataVerifier,
  type JWSTransactionDecodedPayload,
} from "@apple/app-store-server-library";

export const TETAMO_PARTNER_IOS_BUNDLE_ID =
  "com.tetamo.partner";

export const TETAMO_PARTNER_APPLE_APP_ID =
  6804323379;

export type AppleIapEnvironment =
  | "sandbox"
  | "production";

const clients: Partial<
  Record<
    AppleIapEnvironment,
    AppStoreServerAPIClient
  >
> = {};

const verifiers: Partial<
  Record<
    AppleIapEnvironment,
    SignedDataVerifier
  >
> = {};

let cachedAppleRootCertificates:
  | Buffer[]
  | null = null;

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

function getAppleRootCertificates() {
  if (
    cachedAppleRootCertificates
  ) {
    return cachedAppleRootCertificates;
  }

  const certificateNames = [
    "AppleIncRootCertificate.cer",
    "AppleRootCA-G2.cer",
    "AppleRootCA-G3.cer",
  ];

  cachedAppleRootCertificates =
    certificateNames.map(
      (certificateName) =>
        readFileSync(
          join(
            process.cwd(),
            "lib",
            "apple-root-certificates",
            certificateName
          )
        )
    );

  return cachedAppleRootCertificates;
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

export function getAppleSignedDataVerifier(
  environment: AppleIapEnvironment
) {
  const existing =
    verifiers[environment];

  if (existing) {
    return existing;
  }

  const verifier =
    new SignedDataVerifier(
      getAppleRootCertificates(),
      true,
      toAppleEnvironment(
        environment
      ),
      TETAMO_PARTNER_IOS_BUNDLE_ID,
      environment === "production"
        ? TETAMO_PARTNER_APPLE_APP_ID
        : undefined
    );

  verifiers[environment] =
    verifier;

  return verifier;
}

export async function verifyAppleSignedTransaction(
  signedTransaction: string,
  environment: AppleIapEnvironment
): Promise<JWSTransactionDecodedPayload> {
  const transaction =
    signedTransaction.trim();

  if (!transaction) {
    throw new Error(
      "Apple signed transaction is required."
    );
  }

  return getAppleSignedDataVerifier(
    environment
  ).verifyAndDecodeTransaction(
    transaction
  );
}
