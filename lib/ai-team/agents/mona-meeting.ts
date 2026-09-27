import "server-only";

import OpenAI from "openai";

import {
  buildRevenueAnalytics,
  type CurrencyTotals,
  type RevenueAnalytics,
} from "@/lib/reporting/revenue";

import {
  requireAgentPermission,
} from "@/lib/ai-team/permissions/agent-permissions";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MONA_MEETING_MODEL = "gpt-4.1-mini";

export type MonaMeetingTurn = {
  turnOrder: number;
  speakerName: string;
  speakerRole?: string | null;
  content: string;
};

export type MonaMeetingReply = {
  reply: string;
  source:
    | "openai"
    | "deterministic_fallback";
  analyticsGeneratedAt: string;
  reportingTimezone: string;
};

type GenerateMonaMeetingReplyInput = {
  question: string;
  recentTurns?: MonaMeetingTurn[];
};

function formatAmount(
  amount: number,
  currency: string
) {
  const code =
    currency.toUpperCase();

  if (code === "IDR") {
    return `Rp ${new Intl.NumberFormat(
      "id-ID",
      {
        maximumFractionDigits: 0,
      }
    ).format(amount)}`;
  }

  try {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: code,
        maximumFractionDigits: 0,
      }
    ).format(amount);
  } catch {
    return `${code} ${new Intl.NumberFormat(
      "en-US"
    ).format(amount)}`;
  }
}

function formatTotals(
  totals: CurrencyTotals
) {
  const entries =
    Object.entries(totals);

  if (entries.length === 0) {
    return "Rp 0";
  }

  return entries
    .map(([currency, amount]) =>
      formatAmount(
        Number(amount || 0),
        currency
      )
    )
    .join(" + ");
}

function buildRevenueFacts(
  analytics: RevenueAnalytics
) {
  const currentTrend =
    analytics.trend[
      analytics.trend.length - 1
    ] ?? null;

  const previousTrend =
    analytics.trend[
      analytics.trend.length - 2
    ] ?? null;

  const topProducts =
    analytics.products
      .slice(0, 5)
      .map(
        (product) =>
          `- ${product.label}: ${product.sales} verified sales, ${formatTotals(product.revenue)}`
      )
      .join("\n");

  return `
REPORTING TIMEZONE
${analytics.reportingTimezone}

DATA GENERATED
${analytics.generatedAt}

TODAY
Verified sales: ${analytics.summary.today.sales}
Verified revenue: ${formatTotals(
    analytics.summary.today.revenue
  )}

CURRENT MONTH
Verified sales: ${analytics.summary.month.sales}
Verified revenue: ${formatTotals(
    analytics.summary.month.revenue
  )}

ALL-TIME VERIFIED
Verified sales: ${analytics.summary.total.sales}
Verified revenue: ${formatTotals(
    analytics.summary.total.revenue
  )}

CUSTOMER TYPE
Owners:
- Sales: ${analytics.customerTypes.owner.sales}
- Revenue: ${formatTotals(
    analytics.customerTypes.owner.revenue
  )}

Agents:
- Sales: ${analytics.customerTypes.agent.sales}
- Revenue: ${formatTotals(
    analytics.customerTypes.agent.revenue
  )}

PAYMENT PROVIDER
HitPay:
- Sales: ${analytics.providers.hitpay.sales}
- Revenue: ${formatTotals(
    analytics.providers.hitpay.revenue
  )}

Stripe:
- Sales: ${analytics.providers.stripe.sales}
- Revenue: ${formatTotals(
    analytics.providers.stripe.revenue
  )}

Apple In-App Purchase:
- Sales: ${analytics.providers.apple.sales}
- Revenue: ${formatTotals(
    analytics.providers.apple.revenue
  )}

Google Play:
- Sales: ${analytics.providers.googlePlay.sales}
- Revenue: ${formatTotals(
    analytics.providers.googlePlay.revenue
  )}

RECENT MONTH
${
  currentTrend
    ? `${currentTrend.label}: ${currentTrend.sales} verified sales, ${formatTotals(currentTrend.revenue)}`
    : "No current trend data."
}

PREVIOUS MONTH
${
  previousTrend
    ? `${previousTrend.label}: ${previousTrend.sales} verified sales, ${formatTotals(previousTrend.revenue)}`
    : "No previous trend data."
}

TOP PRODUCTS BY VERIFIED SALES
${topProducts || "No product sales recorded."}

KNOWN STORE TEST PURCHASES
Transactions: ${analytics.testPaid.sales}
Value represented: ${formatTotals(
    analytics.testPaid.revenue
  )}
These are recognised Apple Sandbox or Google Play test purchases.
They are excluded from verified revenue and must never be described as sales revenue.

UNVERIFIED / MANUAL PAID
Transactions: ${analytics.unverifiedPaid.sales}
Value represented: ${formatTotals(
    analytics.unverifiedPaid.revenue
  )}
These records are marked paid but are not currently supported by recognised provider-verification evidence.
They are excluded from verified revenue and require reconciliation.
Do not assume they are future revenue, real revenue, failed payments or tests.
`.trim();
}

function buildConversation(
  turns: MonaMeetingTurn[]
) {
  if (turns.length === 0) {
    return "(No prior meeting context supplied.)";
  }

  return turns
    .slice(-20)
    .map((turn) => {
      const role =
        turn.speakerRole
          ? ` — ${turn.speakerRole}`
          : "";

      return [
        `Turn ${turn.turnOrder}`,
        `${turn.speakerName}${role}`,
        turn.content,
      ].join("\n");
    })
    .join("\n\n");
}

function deterministicSalesReply(
  analytics: RevenueAnalytics
) {
  const month =
    analytics.summary.month;

  const today =
    analytics.summary.today;

  const owner =
    analytics.customerTypes.owner;

  const agent =
    analytics.customerTypes.agent;

  return [
    `This month we have ${month.sales} verified sale${month.sales === 1 ? "" : "s"} worth ${formatTotals(month.revenue)}.`,
    `Today we have ${today.sales} verified sale${today.sales === 1 ? "" : "s"} worth ${formatTotals(today.revenue)}.`,
    `Across the verified payment history, Owners account for ${owner.sales} sales and Agents for ${agent.sales}.`,
    `That is the verified revenue picture I can confirm right now. Lead volume, enquiry conversion and ad performance are not included in this data source yet.`,
  ].join(" ");
}

export async function generateMonaMeetingReply({
  question,
  recentTurns = [],
}: GenerateMonaMeetingReplyInput): Promise<MonaMeetingReply> {
  requireAgentPermission(
    "mona",
    "read_sales_data"
  );

  const analytics =
    await buildRevenueAnalytics();

  const fallbackReply =
    deterministicSalesReply(
      analytics
    );

  if (!process.env.OPENAI_API_KEY) {
    return {
      reply: fallbackReply,
      source:
        "deterministic_fallback",
      analyticsGeneratedAt:
        analytics.generatedAt,
      reportingTimezone:
        analytics.reportingTimezone,
    };
  }

  const revenueFacts =
    buildRevenueFacts(analytics);

  const conversation =
    buildConversation(recentTurns);

  const prompt = `
You are Mona, Tetamo's internal AI Sales Manager.

You are speaking inside Tetamo's private executive Meeting Room with Founder Khaye, Jake the AI COO, KooT the Strategic Adviser, and the specialist AI team.

This is NOT a customer-facing WhatsApp conversation.

YOUR JOB HERE
- Report internal sales and verified revenue clearly.
- Answer naturally like a commercially minded Sales Manager.
- Be warm, concise and useful.
- Use only the evidence provided below for numerical or performance claims.
- Separate what the data proves from what is not yet known.

FACT / INFERENCE / PROPOSAL DISCIPLINE
- FACT: state only what the connected sales/revenue data actually proves.
- INFERENCE / HYPOTHESIS: clearly label a possible explanation when the data does not establish the cause.
- PROPOSAL: clearly frame a recommended next step as a suggestion, not as something already approved or proven.
- Revenue/product mix does not by itself prove customer preference, visibility, trust, onboarding friction, payment friction or package value.
- A payment provider being used more often does not prove that provider is easier, safer or more trusted.
- Do not say a package performs better because of visibility, features or customer appeal unless evidence for that cause is actually supplied.
- If suggesting testimonials, package education, follow-up or payment messaging, present those as proposed tactics to test unless supporting evidence proves the need.

- If Khaye asks "How are sales?", give the most useful concise executive sales update.
- You may compare the current month with the previous month when those figures are provided.
- When referring to all-time figures, say "across the verified payment history" or similar. Do not say "since we started" unless an actual business start date is provided.
- If there are any Unverified / Manual Paid records, briefly flag the count and represented value as requiring reconciliation and explicitly exclude them from verified revenue.
- Do not routinely mention Known Store Test Purchases in a normal sales update unless Khaye asks about testing, payment reconciliation, excluded transactions, or the distinction is otherwise directly relevant.
- Do not call something a conversion problem, lead problem, ad problem or enquiry problem unless corresponding data is actually provided.
- Do not invent leads, enquiries, conversion rates, ad spend, campaign performance, customer sentiment or pipeline numbers.
- Do not claim that an operational action was taken.
- Do not send messages, change pricing, issue refunds, spend money, publish anything or modify systems.
- Do not expose hidden reasoning or chain-of-thought.
- If a requested metric is unavailable, say briefly that it is not connected to this reporting source yet.
- Keep the answer conversational rather than sounding like a dashboard dump.

IMPORTANT DATA SCOPE
Verified revenue below comes from Tetamo's shared revenue reporting engine and may include:
- Stripe transactions confirmed by Stripe payment evidence.
- HitPay transactions confirmed by HitPay payment evidence.
- Apple In-App Purchases verified by Tetamo's Apple server flow in the Production environment.
- Google Play purchases verified by Tetamo's Google server flow and not marked as test purchases.

Known Apple Sandbox and Google Play test purchases are explicitly excluded from verified revenue.

Unverified / Manual Paid records are also excluded from verified revenue until reconciled. Never describe them as upcoming revenue or assume that money was received.

These figures are not automatically the same thing as leads, enquiries, property transactions closed by agents, or customer conversion rates.

VERIFIED SALES DATA
${revenueFacts}

RECENT MEETING CONTEXT
${conversation}

KHAYE'S / MEETING QUESTION
${question}

Reply as Mona in natural spoken language.
Do not use JSON.
`.trim();

  try {
    const response =
      await openai.responses.create({
        model:
          MONA_MEETING_MODEL,
        input: prompt,
        temperature: 0.3,
        max_output_tokens: 500,
      });

    const reply =
      response.output_text.trim();

    if (!reply) {
      return {
        reply: fallbackReply,
        source:
          "deterministic_fallback",
        analyticsGeneratedAt:
          analytics.generatedAt,
        reportingTimezone:
          analytics.reportingTimezone,
      };
    }

    return {
      reply,
      source: "openai",
      analyticsGeneratedAt:
        analytics.generatedAt,
      reportingTimezone:
        analytics.reportingTimezone,
    };
  } catch (error) {
    console.error(
      "Mona Meeting adapter generation failed:",
      error
    );

    return {
      reply: fallbackReply,
      source:
        "deterministic_fallback",
      analyticsGeneratedAt:
        analytics.generatedAt,
      reportingTimezone:
        analytics.reportingTimezone,
    };
  }
}