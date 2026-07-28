import type { SupabaseClient } from "@supabase/supabase-js";

export type MonaKnowledgeEntry = {
  id: string;
  category: string;
  canonicalQuestion: string;
  approvedAnswer: string;
  language: string;
  priority: number;
  usageCount: number;
};

type KnowledgeRow = {
  id: string;
  category: string;
  canonical_question: string;
  approved_answer: string;
  language: string;
  status: string;
  priority: number;
  usage_count: number;
};

const MAX_KNOWLEDGE_RESULTS = 6;
const MAX_KNOWLEDGE_CHARACTERS = 7000;

function cleanText(value: unknown): string {
  return String(value || "").trim();
}

function normaliseSearchText(value: string): string {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenise(value: string): string[] {
  return Array.from(
    new Set(
      normaliseSearchText(value)
        .split(" ")
        .filter((token) => token.length >= 3)
    )
  );
}

function mapKnowledgeRow(
  row: KnowledgeRow
): MonaKnowledgeEntry | null {
  const id = cleanText(row.id);
  const category = cleanText(row.category);
  const canonicalQuestion = cleanText(row.canonical_question);
  const approvedAnswer = cleanText(row.approved_answer);
  const language = cleanText(row.language);

  if (!id || !canonicalQuestion || !approvedAnswer) {
    return null;
  }

  return {
    id,
    category: category || "general",
    canonicalQuestion,
    approvedAnswer,
    language: language || "id",
    priority:
      typeof row.priority === "number" &&
      Number.isFinite(row.priority)
        ? row.priority
        : 0,
    usageCount:
      typeof row.usage_count === "number" &&
      Number.isFinite(row.usage_count)
        ? row.usage_count
        : 0,
  };
}

function calculateKnowledgeScore(
  entry: MonaKnowledgeEntry,
  customerMessage: string
): number {
  const normalisedMessage = normaliseSearchText(customerMessage);
  const messageTokens = tokenise(customerMessage);

  const question = normaliseSearchText(entry.canonicalQuestion);
  const answer = normaliseSearchText(entry.approvedAnswer);
  const category = normaliseSearchText(entry.category);

  let score = entry.priority;

  if (question && normalisedMessage === question) {
    score += 100;
  } else if (
    question &&
    normalisedMessage.includes(question)
  ) {
    score += 60;
  } else if (
    question &&
    question.includes(normalisedMessage)
  ) {
    score += 40;
  }

  if (
    category &&
    normalisedMessage.includes(category)
  ) {
    score += 12;
  }

  for (const token of messageTokens) {
    if (question.includes(token)) {
      score += 10;
    }

    if (category.includes(token)) {
      score += 5;
    }

    if (answer.includes(token)) {
      score += 2;
    }
  }

  return score;
}

export async function searchApprovedMonaKnowledge(params: {
  supabase: SupabaseClient;
  customerMessage: string;
  language?: string;
  limit?: number;
}): Promise<MonaKnowledgeEntry[]> {
  const customerMessage = cleanText(params.customerMessage);

  if (!customerMessage) {
    return [];
  }

  const resultLimit = Math.max(
    1,
    Math.min(params.limit || MAX_KNOWLEDGE_RESULTS, 10)
  );

  let query = params.supabase
    .from("knowledge_base_entries")
    .select(
      "id, category, canonical_question, approved_answer, language, status, priority, usage_count"
    )
    .eq("status", "active")
    .order("priority", { ascending: false })
    .limit(250);

  const language = cleanText(params.language).toLowerCase();

  if (language === "id" || language === "en") {
    query = query.in("language", [language, "both"]);
  }

  const { data, error } = await query;

  if (error) {
    console.error(
      "Failed to search Mona Knowledge Base:",
      error
    );

    return [];
  }

  const entries = ((data || []) as KnowledgeRow[])
    .map(mapKnowledgeRow)
    .filter(
      (entry): entry is MonaKnowledgeEntry =>
        Boolean(entry)
    );

  return entries
    .map((entry) => ({
      entry,
      score: calculateKnowledgeScore(
        entry,
        customerMessage
      ),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return b.entry.priority - a.entry.priority;
    })
    .slice(0, resultLimit)
    .map((item) => item.entry);
}

export function formatMonaKnowledge(
  entries: MonaKnowledgeEntry[]
): string {
  if (!entries.length) {
    return [
      "No active approved Tetamo Knowledge Base entry matched this message.",
      "Do not invent an answer.",
      "Reply naturally that confirmed information is not currently available.",
    ].join("\n");
  }

  const sections: string[] = [];
  let totalCharacters = 0;

  for (const entry of entries) {
    const section = [
      `Knowledge ID: ${entry.id}`,
      `Category: ${entry.category}`,
      `Language: ${entry.language}`,
      `Official question: ${entry.canonicalQuestion}`,
      "Official approved answer:",
      entry.approvedAnswer,
    ].join("\n");

    if (
      totalCharacters > 0 &&
      totalCharacters + section.length >
        MAX_KNOWLEDGE_CHARACTERS
    ) {
      break;
    }

    sections.push(section);
    totalCharacters += section.length;
  }

  return sections.join("\n\n---\n\n");
}
