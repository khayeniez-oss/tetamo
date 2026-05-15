"use client";

import { useEffect, useMemo, useState } from "react";

type Role = "owner" | "agent";

function readParam(params: URLSearchParams, key: string) {
  return String(params.get(key) || "").trim();
}

function getSafeRole(value: string): Role {
  return value.toLowerCase() === "agent" ? "agent" : "owner";
}

function buildDeepLink(params: URLSearchParams) {
  const role = getSafeRole(readParam(params, "role"));
  const paymentId = readParam(params, "payment_id");
  const flow =
    readParam(params, "flow") ||
    (role === "agent" ? "agent-membership" : "new-listing");

  const product = readParam(params, "product");
  const plan = readParam(params, "plan");
  const kode = readParam(params, "kode");
  const billing = readParam(params, "billing");
  const packageId = readParam(params, "package");

  const deepLink = new URL(
    role === "agent"
      ? "tetamomobile://agent/payment"
      : "tetamomobile://owner/payment"
  );

  deepLink.searchParams.set("payment", "cancelled");
  deepLink.searchParams.set("source", "mobile");
  deepLink.searchParams.set("role", role);
  deepLink.searchParams.set("flow", flow);

  if (paymentId) deepLink.searchParams.set("payment_id", paymentId);
  if (product) deepLink.searchParams.set("product", product);
  if (plan) deepLink.searchParams.set("plan", plan);
  if (kode) deepLink.searchParams.set("kode", kode);
  if (billing) deepLink.searchParams.set("billing", billing);
  if (packageId) deepLink.searchParams.set("package", packageId);

  return deepLink.toString();
}

export default function MobilePaymentCancelPage() {
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const { deepLink, role, paymentId } = useMemo(() => {
    if (!currentUrl) {
      return {
        deepLink: "tetamomobile://owner/payment?payment=cancelled",
        role: "owner" as Role,
        paymentId: "",
      };
    }

    const url = new URL(currentUrl);
    const params = url.searchParams;

    return {
      deepLink: buildDeepLink(params),
      role: getSafeRole(readParam(params, "role")),
      paymentId: readParam(params, "payment_id"),
    };
  }, [currentUrl]);

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.iconCircle}>!</div>

        <p style={styles.kicker}>PAYMENT NOT COMPLETED</p>

        <h1 style={styles.title}>
          {role === "agent"
            ? "Agent Package Payment Cancelled"
            : "Listing Payment Cancelled"}
        </h1>

        <p style={styles.description}>
          The payment was not completed. You can return to the Tetamo app and
          try again when you are ready.
        </p>

        <div style={styles.statusBox}>
          <p style={styles.statusLabel}>Payment ID</p>
          <p style={styles.statusValue}>{paymentId || "Not available"}</p>
        </div>

        <a href={deepLink} style={styles.primaryButton}>
          Return to Tetamo App
        </a>

        <p style={styles.note}>
          No paid activation is completed unless Tetamo receives confirmed
          payment from the payment provider.
        </p>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#050505",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  card: {
    width: "100%",
    maxWidth: 460,
    borderRadius: 28,
    border: "1px solid #303030",
    background:
      "linear-gradient(180deg, rgba(18,18,18,1), rgba(5,5,5,1))",
    padding: 24,
    textAlign: "center",
    boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
  },
  iconCircle: {
    width: 78,
    height: 78,
    borderRadius: 999,
    background: "#e6c15c",
    color: "#111111",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 42,
    fontWeight: 900,
    margin: "0 auto 16px",
  },
  kicker: {
    color: "#e6c15c",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 1.4,
    margin: 0,
  },
  title: {
    fontSize: 28,
    lineHeight: "34px",
    fontWeight: 900,
    letterSpacing: -0.7,
    margin: "10px 0 0",
  },
  description: {
    color: "#d6d6d6",
    fontSize: 14,
    lineHeight: "21px",
    fontWeight: 650,
    margin: "12px 0 0",
  },
  statusBox: {
    borderRadius: 18,
    border: "1px solid #303030",
    background: "#050505",
    padding: 14,
    marginTop: 18,
  },
  statusLabel: {
    color: "#a9a9a9",
    fontSize: 12,
    fontWeight: 800,
    margin: 0,
  },
  statusValue: {
    color: "#e6c15c",
    fontSize: 13,
    lineHeight: "18px",
    fontWeight: 900,
    wordBreak: "break-all",
    margin: "5px 0 0",
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 18,
    background: "#e6c15c",
    color: "#111111",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 900,
    marginTop: 18,
  },
  note: {
    color: "#a9a9a9",
    fontSize: 12,
    lineHeight: "18px",
    fontWeight: 650,
    margin: "14px 0 0",
  },
};