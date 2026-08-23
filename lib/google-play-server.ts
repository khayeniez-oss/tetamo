import "server-only";

import { GoogleAuth } from "google-auth-library";

const ANDROID_PUBLISHER_SCOPE =
  "https://www.googleapis.com/auth/androidpublisher";

export const TETAMO_PARTNER_ANDROID_PACKAGE =
  "com.tetamo.partner";

let cachedAuth: GoogleAuth | null = null;

function getGooglePlayCredentials() {
  const clientEmail =
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL?.trim();

  const rawPrivateKey =
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!clientEmail) {
    throw new Error(
      "Missing GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL"
    );
  }

  if (!rawPrivateKey) {
    throw new Error(
      "Missing GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY"
    );
  }

  return {
    client_email: clientEmail,
    private_key: rawPrivateKey.replace(/\\n/g, "\n"),
  };
}

function getGooglePlayAuth() {
  if (cachedAuth) {
    return cachedAuth;
  }

  cachedAuth = new GoogleAuth({
    credentials: getGooglePlayCredentials(),
    scopes: [ANDROID_PUBLISHER_SCOPE],
  });

  return cachedAuth;
}

async function getGooglePlayAccessToken() {
  const accessToken =
    await getGooglePlayAuth().getAccessToken();

  if (!accessToken) {
    throw new Error(
      "Google Play access token could not be created."
    );
  }

  return accessToken;
}

async function googlePlayGet<T>(
  url: string
): Promise<T> {
  const accessToken =
    await getGooglePlayAccessToken();

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const responseText =
      await response.text();

    throw new Error(
      `Google Play API request failed with status ${response.status}: ${responseText.slice(
        0,
        500
      )}`
    );
  }

  return (await response.json()) as T;
}

export async function getGooglePlaySubscriptionPurchase(
  purchaseToken: string,
  packageName = TETAMO_PARTNER_ANDROID_PACKAGE
) {
  const token = purchaseToken.trim();

  if (!token) {
    throw new Error(
      "Google Play subscription purchase token is required."
    );
  }

  const url =
    "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/" +
    `${encodeURIComponent(packageName)}/purchases/subscriptionsv2/tokens/` +
    encodeURIComponent(token);

  return googlePlayGet<Record<string, unknown>>(url);
}

export async function getGooglePlayOneTimePurchase(
  purchaseToken: string,
  packageName = TETAMO_PARTNER_ANDROID_PACKAGE
) {
  const token = purchaseToken.trim();

  if (!token) {
    throw new Error(
      "Google Play one-time purchase token is required."
    );
  }

  const url =
    "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/" +
    `${encodeURIComponent(packageName)}/purchases/productsv2/tokens/` +
    encodeURIComponent(token);

  return googlePlayGet<Record<string, unknown>>(url);
}
