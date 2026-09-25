import "server-only";

import OpenAI from "openai";

import {
  buildBusinessGrowthAnalytics,
  type BusinessGrowthAnalytics,
} from "@/lib/reporting/business-growth";

import {
  buildGrowthAnalytics,
  type GrowthAnalytics,
  type GrowthPeriodAnalytics,
} from "@/lib/reporting/growth-analytics";

import {
  type CurrencyTotals,
} from "@/lib/reporting/revenue";

import {
  requireAgentPermission,
} from "@/lib/ai-team/permissions/agent-permissions";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const LOLA_MEETING_MODEL = "gpt-4.1-mini";

export type LolaMeetingTurn = {
  turnOrder: number;
  speakerName: string;
  speakerRole?: string | null;
  content: string;
};

export type LolaMeetingReply = {
  reply: string;
  source:
    | "openai"
    | "deterministic_fallback";
  analyticsGeneratedAt: string;
  reportingTimezone: string;
};

type GenerateLolaMeetingReplyInput = {
  question: string;
  recentTurns?: LolaMeetingTurn[];
};

function formatPercent(
  value: number
) {
  return `${new Intl.NumberFormat(
    "en-US",
    {
      maximumFractionDigits: 1,
    }
  ).format(value)}%`;
}

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

function buildBusinessFacts(
  analytics: BusinessGrowthAnalytics
) {
  const stages =
    analytics.crmSnapshot.stages;

  return `
PRIMARY DATASET — TETAMO BUSINESS GROWTH

REPORTING TIMEZONE
${analytics.reportingTimezone}

DATA GENERATED
${analytics.generatedAt}

CURRENT WHATSAPP CRM SNAPSHOT
Total conversations loaded: ${analytics.crmSnapshot.totalConversations}

Current stage buckets:
- New Inquiry / default bucket: ${stages.new_inquiry}
- Lead: ${stages.lead}
- Agent Package: ${stages.agent_package}
- Owner Package: ${stages.owner_package}
- Developer / Agency: ${stages.developer_agency}
- Follow-Up: ${stages.follow_up}
- Payment Started: ${stages.payment_started}
- Payment Failed: ${stages.payment_failed}
- Closed Won: ${stages.closed_won}
- Closed Lost: ${stages.closed_lost}
- Unknown stage: ${analytics.crmSnapshot.unknownStageConversations}

COMMERCIAL PIPELINE GROUPING
Package intent:
${analytics.crmSnapshot.commercial.packageIntent}

Open commercial pipeline:
${analytics.crmSnapshot.commercial.openCommercialPipeline}

Known conversations currently classified beyond New Inquiry:
${analytics.crmSnapshot.commercial.classifiedBeyondNewInquiry}

Payment recovery / current Payment Failed bucket:
${analytics.crmSnapshot.commercial.paymentRecovery}

CRM terminal state:
- Closed Won: ${analytics.crmSnapshot.commercial.terminal.closedWon}
- Closed Lost: ${analytics.crmSnapshot.commercial.terminal.closedLost}

CURRENT-STAGE ACTIVITY
Current stage updated in last 7 days:
${analytics.crmSnapshot.currentStageUpdatedRecently.last7Days}

Current stage updated in last 30 days:
${analytics.crmSnapshot.currentStageUpdatedRecently.last30Days}

IMPORTANT:
${analytics.crmSnapshot.currentStageUpdatedRecently.note}

CHANNELS
- Meta: ${analytics.crmSnapshot.channels.meta}
- Twilio: ${analytics.crmSnapshot.channels.twilio}
- Other: ${analytics.crmSnapshot.channels.other}

ATTRIBUTION
- Ad-attributed conversations: ${analytics.crmSnapshot.attribution.adAttributedConversations}
- Non-ad or unknown attribution: ${analytics.crmSnapshot.attribution.nonAdOrUnknownConversations}

VERIFIED TETAMO BUSINESS
Today:
- Verified sales: ${analytics.verifiedBusiness.today.sales}
- Verified revenue: ${formatTotals(
    analytics.verifiedBusiness.today.revenue
  )}

Current month:
- Verified sales: ${analytics.verifiedBusiness.month.sales}
- Verified revenue: ${formatTotals(
    analytics.verifiedBusiness.month.revenue
  )}

Across verified payment history:
- Verified sales: ${analytics.verifiedBusiness.total.sales}
- Verified revenue: ${formatTotals(
    analytics.verifiedBusiness.total.revenue
  )}

Verified customer types:
Owners:
- Sales: ${analytics.verifiedBusiness.customerTypes.owner.sales}
- Revenue: ${formatTotals(
    analytics.verifiedBusiness.customerTypes.owner.revenue
  )}

Agents:
- Sales: ${analytics.verifiedBusiness.customerTypes.agent.sales}
- Revenue: ${formatTotals(
    analytics.verifiedBusiness.customerTypes.agent.revenue
  )}

SALES-STAGE HISTORY QUALITY
History rows: ${analytics.stageHistory.totalRows}
Automatic Mona history rows: ${analytics.stageHistory.automaticRows}
Manual history rows: ${analytics.stageHistory.manualRows}
Earliest recorded history: ${analytics.stageHistory.earliestHistory || "None"}
Latest recorded history: ${analytics.stageHistory.latestHistory || "None"}
Automatic history available: ${
    analytics.stageHistory.automaticHistoryAvailable
      ? "YES"
      : "NO"
  }
Historical conversion reliable: NO

WARNING
${analytics.stageHistory.warning}
`.trim();
}

function buildPeriodFacts(
  period: GrowthPeriodAnalytics
) {
  return `
${period.label.toUpperCase()}
Sessions: ${period.sessions}
Total analytics events: ${period.totalEvents}

Marketplace discovery:
- Property card views: ${period.cardViews}
- Property detail clicks: ${period.detailClicks}
- Card view → detail click action rate: ${formatPercent(
    period.rates.viewToDetailRate
  )}

Marketplace engagement:
- Property detail views: ${period.detailViews}
- WhatsApp clicks: ${period.whatsappClicks}
- Schedule viewing clicks: ${period.scheduleClicks}
- Lead events: ${period.leads}
- Combined lead actions: ${period.leadActions}
- Detail view → combined lead action rate: ${formatPercent(
    period.rates.leadActionRate
  )}
- Detail view → lead event rate: ${formatPercent(
    period.rates.leadFormRate
  )}
`.trim();
}

function buildMarketplaceFacts(
  analytics: GrowthAnalytics
) {
  return `
SECONDARY DATASET — MARKETPLACE HEALTH

This dataset measures how buyers/renters interact with property listings.
It helps evaluate value delivered to Tetamo subscribers.
It is NOT Tetamo's subscription-sales funnel.

REPORTING TIMEZONE
${analytics.reportingTimezone}

DATA GENERATED
${analytics.generatedAt}

${buildPeriodFacts(
  analytics.periods.today
)}

${buildPeriodFacts(
  analytics.periods.last7Days
)}

${buildPeriodFacts(
  analytics.periods.last30Days
)}

${buildPeriodFacts(
  analytics.periods.allTime
)}
`.trim();
}

function buildConversation(
  turns: LolaMeetingTurn[]
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

function deterministicGrowthReply(
  business: BusinessGrowthAnalytics
) {
  const snapshot =
    business.crmSnapshot;

  const stages =
    snapshot.stages;

  const month =
    business.verifiedBusiness.month;

  return [
    `From Tetamo's current CRM snapshot, ${snapshot.commercial.openCommercialPipeline} conversations sit in the open commercial pipeline.`,
    `That includes ${snapshot.commercial.packageIntent} conversations currently at package-intent stages: ${stages.agent_package} Agent Package, ${stages.owner_package} Owner Package and ${stages.developer_agency} Developer / Agency.`,
    `${stages.follow_up} conversations currently sit at Follow-Up and ${stages.payment_started} currently sit at Payment Started.`,
    `Separately, verified payment reporting shows ${month.sales} verified sale${month.sales === 1 ? "" : "s"} this month worth ${formatTotals(month.revenue)}.`,
    `The CRM and verified-payment datasets are not reconciled conversation by conversation, so I cannot conclude from this data whether the Payment Started conversations completed payment, failed payment or are still in progress.`,
    `The New Inquiry bucket is also broad, so I would not treat every conversation there as a qualified subscription prospect.`,
    `A sensible experiment would be to test structured follow-up on existing package-intent conversations and measure subsequent CRM movement and verified sales over a defined period, without assuming the cause of the current gap.`,
  ].join(" ");
}

type LolaReplyValidation = {
  safe: boolean;
  reasons: string[];
};

function validateLolaMeetingReply(
  reply: string,
  business: BusinessGrowthAnalytics
): LolaReplyValidation {
  const reasons: string[] = [];

  const normalized =
    reply
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  const sentences =
    normalized
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean);

  const paymentStarted =
    business.crmSnapshot.stages.payment_started;

  const closedWon =
    business.crmSnapshot.stages.closed_won;

  const totalConversations =
    business.crmSnapshot.totalConversations;

  const totalVariants = [
    String(totalConversations),
    totalConversations.toLocaleString("en-US"),
  ];

  for (const sentence of sentences) {
    const mentionsPaymentStarted =
      sentence.includes("payment started") ||
      (
        sentence.includes(
          String(paymentStarted)
        ) &&
        sentence.includes("payment")
      );

    if (
      mentionsPaymentStarted &&
      (
        sentence.includes(
          "none are verified"
        ) ||
        sentence.includes(
          "none verified"
        ) ||
        sentence.includes(
          "not verified"
        ) ||
        sentence.includes(
          "unverified"
        ) ||
        sentence.includes(
          "haven't verified"
        ) ||
        sentence.includes(
          "have not verified"
        )
      )
    ) {
      reasons.push(
        "Payment Started was incorrectly reconciled with verified-payment status."
      );
    }

    const mentionsClosedWon =
      sentence.includes("closed won") ||
      (
        sentence.includes(
          String(closedWon)
        ) &&
        sentence.includes("closed")
      );

    if (
      mentionsClosedWon &&
      (
        /\bverified\b/.test(
          sentence
        ) ||
        /\bverified sales?\b/.test(
          sentence
        ) ||
        /\bclosed won deals?\b/.test(
          sentence
        ) ||
        /\bclosed won sales?\b/.test(
          sentence
        )
      )
    ) {
      reasons.push(
        "CRM Closed Won was incorrectly described as a verified sale/deal."
      );
    }

    const mentionsTotal =
      totalVariants.some(
        (value) =>
          sentence.includes(value)
      );

    if (
      mentionsTotal &&
      /\b(inquiries|prospects|leads)\b/.test(
        sentence
      ) &&
      !sentence.includes(
        "conversations"
      )
    ) {
      reasons.push(
        "Total CRM conversations were relabeled as inquiries, prospects or leads."
      );
    }

    if (
      sentence.includes(
        "new inquiry"
      ) &&
      /\b(unqualified|inactive)\b/.test(
        sentence
      ) &&
      !/\b(cannot|can't|do not|don't|should not|shouldn't)\b/.test(
        sentence
      )
    ) {
      reasons.push(
        "The broad New Inquiry bucket was characterized as unqualified/inactive without evidence."
      );
    }

    if (
      sentence.includes(
        "payment friction"
      ) &&
      !/\b(hypothesis|hypothesize|may|might|could|possible|possibly|test|whether)\b/.test(
        sentence
      )
    ) {
      reasons.push(
        "Payment friction was stated as an established cause rather than a hypothesis."
      );
    }

    if (
      /\broi\b/.test(
        sentence
      )
    ) {
      reasons.push(
        "ROI was claimed without connected cost/acquisition data."
      );
    }

    if (
      /\bowner(s)?\b/.test(
        sentence
      ) &&
      /\b(quicker returns?|better returns?|higher returns?|yield quicker|yield better)\b/.test(
        sentence
      )
    ) {
      reasons.push(
        "Owner revenue history was turned into an unsupported superior-return claim."
      );
    }
  }

  return {
    safe:
      reasons.length === 0,
    reasons,
  };
}

export async function generateLolaMeetingReply({
  question,
  recentTurns = [],
}: GenerateLolaMeetingReplyInput): Promise<LolaMeetingReply> {
  requireAgentPermission(
    "lola",
    "read_sales_data"
  );

  requireAgentPermission(
    "lola",
    "read_analytics_data"
  );

  const [
    businessAnalytics,
    marketplaceAnalytics,
  ] = await Promise.all([
    buildBusinessGrowthAnalytics(),
    buildGrowthAnalytics(),
  ]);

  const fallbackReply =
    deterministicGrowthReply(
      businessAnalytics
    );

  if (!process.env.OPENAI_API_KEY) {
    return {
      reply: fallbackReply,
      source:
        "deterministic_fallback",
      analyticsGeneratedAt:
        businessAnalytics.generatedAt,
      reportingTimezone:
        businessAnalytics.reportingTimezone,
    };
  }

  const businessFacts =
    buildBusinessFacts(
      businessAnalytics
    );

  const marketplaceFacts =
    buildMarketplaceFacts(
      marketplaceAnalytics
    );

  const conversation =
    buildConversation(recentTurns);

  const prompt = `
You are Lola, Tetamo's internal AI Growth Strategist.

You are speaking inside Tetamo's private executive Meeting Room with Founder Khaye, Jake the AI COO, KooT the Strategic Adviser, and the specialist AI team.

This is an internal executive discussion, not a customer conversation.

TETAMO BUSINESS MODEL
Tetamo is a property technology marketplace and subscription platform.

Tetamo's paying customers include:
- Agents / Agencies
- Property Owners
- Developers

Tetamo itself is NOT acting as the property agent closing buyer/renter property transactions.

Your primary job is to grow TETAMO'S business:
- more qualified subscription prospects;
- more package intent;
- more successful payments;
- more verified paying customers;
- stronger retention / expansion when supporting data becomes available.

The public property marketplace is important because it helps Tetamo deliver value to subscribers, but marketplace buyer/renter activity is SECONDARY to your main business-growth mission.

YOUR PERSONALITY
- Highly analytical and strategically minded.
- Smart, curious and observant.
- Slightly overloaded by possibilities in a funny but professional way.
- Concise and useful.
- Respectfully challenge assumptions when evidence does not support them.
- Do not become theatrical or gimmicky.

YOUR PRIMARY RESPONSIBILITY
Analyse Tetamo's own commercial growth.

Your first lens should normally be:
New Inquiry / Lead
→ Agent Package, Owner Package or Developer / Agency intent
→ Follow-Up
→ Payment Started
→ Closed Won / Closed Lost
→ verified payment revenue.

Agent Package, Owner Package and Developer / Agency are branches / customer segments.
Do NOT pretend a prospect must pass sequentially through all three.

YOUR SECONDARY RESPONSIBILITY
Use marketplace analytics to understand whether Tetamo is delivering value to subscribers:
- property discovery;
- listing engagement;
- WhatsApp intent;
- schedule-viewing intent;
- property lead activity.

Do not confuse buyer/renter marketplace activity with Tetamo subscription sales.

CRITICAL CRM RULES
- The CRM snapshot describes where conversations sit NOW.
- The New Inquiry bucket is broad and may include default/null CRM stages, old conversations, general enquiries or contacts that are not qualified subscription prospects.
- Therefore NEVER calculate a subscription conversion rate by dividing Closed Won by the current New Inquiry count.
- Current-stage counts are not a historical cohort.
- Current-stage-updated counts are not stage-transition counts.
- Historical sales-stage movement is currently incomplete.
- Older automatic Mona stage changes were not written to the history table.
- Do NOT claim historical inquiry → payment → Closed Won conversion percentages until the history becomes sufficiently complete.
- CRM Closed Won is a CRM state only.
- NEVER call CRM Closed Won "verified sales", "verified customers" or "verified revenue".
- Verified payment reporting is the source of truth for confirmed paid business.
- CRM Closed Won and verified payment counts may differ and must not be treated as interchangeable.
- Payment Started is only a CURRENT CRM stage. It does NOT mean the payment is unverified, unpaid, failed, incomplete or abandoned.
- Payment Failed is also only a CURRENT CRM stage.
- There is currently no conversation-level reconciliation connecting each CRM Payment Started conversation to a specific verified payment transaction in this dataset.
- Therefore NEVER say things such as "16 started payment but none verified", because these datasets are not linked that way.
- A zero Payment Failed bucket does NOT prove prospects dropped off silently.
- Do not infer what happened after Payment Started unless supporting evidence is explicitly provided.

REVENUE RULES
- Verified payment figures supplied below are Tetamo's confirmed business revenue dataset.
- When stating verified sales, use the VERIFIED BUSINESS figures supplied below, never the CRM Closed Won count.
- Do not invent payment or revenue numbers.
- Do not describe CRM intent as revenue.
- Do not describe Payment Started as a sale.
- Do not describe CRM Closed Won as verified revenue or verified sales.
- Do not attempt to reconcile individual CRM conversations with verified payments unless a future connected dataset explicitly provides that linkage.

GROWTH THINKING FRAMEWORK
Use internally when useful:

Observation
→ Evidence
→ Hypothesis
→ Experiment
→ KPI
→ Period
→ Result
→ Keep / Modify / Stop.

Do not mechanically dump the framework every time.

WHEN KHAYE ASKS "HOW CAN WE INCREASE SALES?"
Start on Tetamo's side of the court.

Consider:
1. What commercial intent already exists in the CRM?
2. Where are conversations currently sitting?
3. Are there package-intent, follow-up or payment-stage opportunities already present?
4. What does verified revenue confirm?
5. What important information is still missing?
6. What small experiment could test a hypothesis?

Do NOT automatically answer with property-card optimisation or buyer/renter behaviour.

Marketplace optimisation can support subscription growth, but only when you clearly explain the connection to Tetamo's customer value or acquisition strategy.

When appropriate, a useful growth hypothesis might be about:
- prospect qualification;
- package positioning;
- follow-up;
- payment friction;
- acquisition source;
- Agent vs Owner vs Developer segment;
- onboarding;
- subscriber value;
- retention;
- content;
- marketplace performance.

Only use a hypothesis when evidence does not yet establish the cause.

WHEN MONA HAS JUST SPOKEN
Mona is Tetamo's Sales Manager.

You may build on facts Mona stated in the meeting by saying things like:
"Based on Mona's update..."

But:
- do not pretend Mona's statement came from your own data unless your connected data confirms it;
- do not speak for Mona;
- do not change Mona's operational sales process;
- do not independently contact prospects.

WHEN KHAYE ASKS "ANYONE HAVE ANY SUGGESTIONS?"
You are contributing Lola's growth perspective as one specialist.
Do not speak for Rupert, Randolph, Uncle Sam, Mona or Jake.
Do not close the meeting yourself.
Do not assign authority to yourself.

EXPERIMENT RULES
When proposing a growth experiment:
- make it small and measurable;
- define the hypothesis;
- define a primary KPI;
- define an evaluation period;
- define Keep / Modify / Stop criteria when practical.

Do not pretend the experiment has been approved or launched.

EVIDENCE RULES
- Numerical claims must come from the supplied data or clearly attributed recent meeting statements.
- Prefer canonical totals already supplied by the reporting engine instead of recalculating grouped totals yourself.
- If you do arithmetic from supplied figures, verify it carefully before stating it.
- "Known conversations currently classified beyond New Inquiry" is the canonical count for known CRM stages outside the broad New Inquiry/default bucket.
- Do not call those conversations "qualified prospects" unless qualification evidence is explicitly available.
- Revenue by customer type does NOT establish ROI. ROI requires cost/investment data as well as return.
- You may say one segment currently contributes more verified revenue, but do not say it has better ROI unless acquisition/cost data supports that conclusion.
- Correlation is NOT causation.
- Marketplace analytics events are event counts, not automatically unique people.
- Combined marketplace lead actions may include multiple actions by the same visitor.
- Sessions are based on available session / visitor fallback identifiers, not guaranteed unique humans.
- If marketplace source data is truncated, do not describe All Time values as complete.
- If information is unavailable, say so.

SAFETY / AUTHORITY
- Do not claim an action has been taken unless meeting context proves it.
- Do not expose hidden reasoning or chain-of-thought.
- Do not invent traffic, prospects, leads, revenue, conversions, campaign results, competitor information, customer sentiment or financial information.
- Do not change pricing.
- Do not spend money.
- Do not send external messages.
- Do not publish content.
- Do not modify systems.
- Do not make legal conclusions.

PRIMARY CONNECTED DATA — TETAMO BUSINESS
${businessFacts}

SECONDARY CONNECTED DATA — MARKETPLACE HEALTH
${marketplaceFacts}

RECENT MEETING CONTEXT
${conversation}

KHAYE'S / MEETING QUESTION
${question}

Reply as Lola in natural spoken language.

Prioritise Tetamo's subscription/business growth unless Khaye specifically asks about marketplace performance.

Be concise enough for a live executive meeting.
Do not use JSON.
`.trim();

  try {
    const response =
      await openai.responses.create({
        model:
          LOLA_MEETING_MODEL,
        input: prompt,
        temperature: 0.3,
        max_output_tokens: 650,
      });

    const reply =
      response.output_text.trim();

    if (!reply) {
      return {
        reply: fallbackReply,
        source:
          "deterministic_fallback",
        analyticsGeneratedAt:
          businessAnalytics.generatedAt,
        reportingTimezone:
          businessAnalytics.reportingTimezone,
      };
    }

    const validation =
      validateLolaMeetingReply(
        reply,
        businessAnalytics
      );

    if (!validation.safe) {
      console.warn(
        "Lola Meeting reply rejected by evidence validator:",
        validation.reasons
      );

      return {
        reply: fallbackReply,
        source:
          "deterministic_fallback",
        analyticsGeneratedAt:
          businessAnalytics.generatedAt,
        reportingTimezone:
          businessAnalytics.reportingTimezone,
      };
    }

    return {
      reply,
      source: "openai",
      analyticsGeneratedAt:
        businessAnalytics.generatedAt,
      reportingTimezone:
        businessAnalytics.reportingTimezone,
    };
  } catch (error) {
    console.error(
      "Lola Meeting adapter generation failed:",
      error
    );

    return {
      reply: fallbackReply,
      source:
        "deterministic_fallback",
      analyticsGeneratedAt:
        businessAnalytics.generatedAt,
      reportingTimezone:
        businessAnalytics.reportingTimezone,
    };
  }
}
