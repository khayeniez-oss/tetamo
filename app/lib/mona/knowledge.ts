import type { SupabaseClient } from "@supabase/supabase-js";
import {
  OWNER_PACKAGES,
  AGENT_PACKAGES,
} from "../../data/pricelist";
import type { MonaBrainDecision } from "./brain";
import type { MonaSalesGuidance } from "./sales-router";

export type MonaKnowledgeEntry = {
  id: string;
  category: string | null;
  canonicalQuestion: string | null;
  approvedAnswer: string | null;
  language: string | null;
  priority: number | null;
};

export type MonaKnowledgeMatch = {
  entry: MonaKnowledgeEntry;
  score: number;
};

export type MonaKnowledgeResult = {
  needed: boolean;
  retrievalQuery: string;
  matches: MonaKnowledgeMatch[];
  approvedFactsText: string;
};

type RetrieveMonaKnowledgeParams = {
  supabase: SupabaseClient;
  brain: MonaBrainDecision;
  salesGuidance: MonaSalesGuidance;
  language?: "id" | "en" | "mixed" | "unknown";
};

function normalize(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .trim();
}

function tokeniseForSearch(value: string) {
  return Array.from(
    new Set(
      normalize(value)
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2)
    )
  ).slice(0, 80);
}

function scoreKnowledgeEntry(
  searchText: string,
  entry: MonaKnowledgeEntry
) {
  const normalizedSearch = normalize(searchText);
  const searchTokens = tokeniseForSearch(searchText);

  const question = normalize(entry.canonicalQuestion);
  const answer = normalize(entry.approvedAnswer);
  const category = normalize(entry.category);

  let score = 0;

  const questionLines = question
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of questionLines) {
    if (line === normalizedSearch) {
      score += 30;
    } else if (line.length >= 8 && normalizedSearch.includes(line)) {
      score += 15;
    } else if (
      normalizedSearch.length >= 8 &&
      line.includes(normalizedSearch)
    ) {
      score += 12;
    }
  }

  for (const token of searchTokens) {
    if (question.includes(token)) score += 4;
    if (category.includes(token)) score += 2;
    if (answer.includes(token)) score += 1;
  }

  score += Math.max(0, Number(entry.priority || 0)) / 1000;

  return score;
}

function getSalesFactsNeeded(
  salesGuidance: MonaSalesGuidance
): string[] {
  if (!salesGuidance.guidance) {
    return [];
  }

  return salesGuidance.guidance.needsTetamoFacts
    ? salesGuidance.guidance.factsNeeded
    : [];
}

function buildRetrievalQuery(
  brain: MonaBrainDecision,
  salesGuidance: MonaSalesGuidance
) {
  const parts = [
    brain.customerType !== "unknown"
      ? `Customer type: ${brain.customerType}`
      : "",
    brain.latestMeaning,
    brain.directQuestion || "",
    ...brain.knowledgeRequest,
    ...getSalesFactsNeeded(salesGuidance),
    ...brain.knownContext.importantFacts,
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  return Array.from(new Set(parts)).join("\n");
}

function languageMatches(
  entryLanguage: string | null,
  requestedLanguage: RetrieveMonaKnowledgeParams["language"]
) {
  const language = normalize(entryLanguage || "both");

  if (
    language === "both" ||
    language === "id/en" ||
    language === "en/id"
  ) {
    return true;
  }

  if (requestedLanguage === "mixed" || requestedLanguage === "unknown") {
    return language === "id" || language === "en";
  }

  return language === requestedLanguage;
}

function formatIdr(value: number) {
  return `Rp${new Intl.NumberFormat("id-ID").format(value)}`;
}

function buildStructuredPackageFacts(
  brain: MonaBrainDecision,
  retrievalQuery: string
) {
  const query = normalize(retrievalQuery);

  const asksAboutPackageOrPrice =
    /\b(?:harga|price|biaya|paket|package|membership|listing|silver|gold|agent pro|basic|priority|featured|bulanan|monthly|tahunan|yearly)\b/i.test(
      query
    );

  if (!asksAboutPackageOrPrice) {
    return "";
  }

  const sections: string[] = [];

  if (
    brain.customerType === "owner" ||
    query.includes("owner") ||
    query.includes("pemilik")
  ) {
    const ownerFacts = OWNER_PACKAGES.map((item) => {
      return [
        `${item.name}`,
        `Price: ${formatIdr(item.priceIdr)}`,
        `Duration: ${item.durationDays} days`,
        `Max listings: ${item.maxListings}`,
        `Features: ${item.features.join(" | ")}`,
        `Billing: ${item.billingNote}`,
      ].join("\n");
    }).join("\n\n");

    sections.push(`AUTHORITATIVE OWNER PACKAGE DATA\n${ownerFacts}`);
  }

  if (
    brain.customerType === "agent" ||
    brain.customerType === "agency" ||
    query.includes("agent") ||
    query.includes("agen") ||
    query.includes("agency")
  ) {
    const specificallyNamedAgentPackage =
      query.includes("agent pro")
        ? "agent pro"
        : query.includes("silver")
          ? "silver"
          : query.includes("gold")
            ? "gold"
            : null;

    const asksBillingDetails =
      /\b(?:billing|tagihan|bulanan|monthly|tahunan|yearly|renew|renewal|auto renew|perpanjang|komitmen|commitment|cicilan)\b/i.test(
        query
      );

    const selectedAgentPackages = specificallyNamedAgentPackage
      ? AGENT_PACKAGES.filter(
          (item) => normalize(item.name) === specificallyNamedAgentPackage
        )
      : AGENT_PACKAGES;

    const agentFacts = selectedAgentPackages
      .map((item) => {
        const monthly =
          asksBillingDetails &&
          item.monthlyPriceIdr &&
          item.monthlyCommitmentMonths
            ? ` | Monthly option: ${formatIdr(item.monthlyPriceIdr)} with ${item.monthlyCommitmentMonths}-month commitment`
            : "";

        return [
          `${item.name}`,
          `Yearly price: ${formatIdr(item.priceIdr)}${monthly}`,
          `Duration: ${item.durationDays} days`,
          `Max listings: ${item.maxListings}`,
          `Features: ${item.features.join(" | ")}`,
          ...(asksBillingDetails ? [`Billing: ${item.billingNote}`] : []),
        ].join("\n");
      })
      .join("\n\n");

    sections.push(`AUTHORITATIVE AGENT PACKAGE DATA\n${agentFacts}`);
  }

  return sections.join("\n\n");
}

function formatApprovedFacts(matches: MonaKnowledgeMatch[]) {
  if (!matches.length) {
    return "No relevant approved Tetamo Knowledge Base facts were found.";
  }

  return matches
    .map(({ entry }, index) => {
      return [
        `Approved Tetamo fact ${index + 1}`,
        `Category: ${entry.category || "general"}`,
        `Question/context: ${entry.canonicalQuestion || ""}`,
        `Approved information: ${entry.approvedAnswer || ""}`,
      ].join("\n");
    })
    .join("\n\n");
}

export async function retrieveMonaKnowledge(
  params: RetrieveMonaKnowledgeParams
): Promise<MonaKnowledgeResult> {
  const salesFactsNeeded = getSalesFactsNeeded(
    params.salesGuidance
  );

  const needed =
    params.brain.factualKnowledgeNeeded ||
    salesFactsNeeded.length > 0;

  const retrievalQuery = buildRetrievalQuery(
    params.brain,
    params.salesGuidance
  );

  if (!needed || !retrievalQuery) {
    return {
      needed: false,
      retrievalQuery,
      matches: [],
      approvedFactsText: "",
    };
  }

  const { data, error } = await params.supabase
    .from("knowledge_base_entries")
    .select(
      "id, category, canonical_question, approved_answer, language, priority"
    )
    .eq("status", "active")
    .order("priority", { ascending: false })
    .limit(250);

  if (error) {
    console.error("Failed to retrieve Mona approved knowledge:", error);

    return {
      needed: true,
      retrievalQuery,
      matches: [],
      approvedFactsText:
        "Approved Tetamo knowledge could not be retrieved.",
    };
  }

  const entries: MonaKnowledgeEntry[] = (data || []).map(
    (row: any) => ({
      id: String(row.id),
      category: row.category ?? null,
      canonicalQuestion: row.canonical_question ?? null,
      approvedAnswer: row.approved_answer ?? null,
      language: row.language ?? null,
      priority:
        row.priority === null || row.priority === undefined
          ? null
          : Number(row.priority),
    })
  );

  const rankedMatches = entries
    .filter((entry) =>
      languageMatches(entry.language, params.language)
    )
    .map((entry) => ({
      entry,
      score: scoreKnowledgeEntry(
        retrievalQuery,
        entry
      ),
    }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score);

  const bestScore = rankedMatches[0]?.score || 0;
  const minimumRelevantScore = Math.max(12, bestScore * 0.72);

  const matches = rankedMatches
    .filter((match) => match.score >= minimumRelevantScore)
    .slice(0, 3);

  const structuredPackageFacts = buildStructuredPackageFacts(
    params.brain,
    retrievalQuery
  );

  const knowledgeFacts = formatApprovedFacts(matches);

  return {
    needed: true,
    retrievalQuery,
    matches,
    approvedFactsText: [structuredPackageFacts, knowledgeFacts]
      .filter(Boolean)
      .join("\n\n"),
  };
}
