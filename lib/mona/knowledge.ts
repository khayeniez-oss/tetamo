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
  id: unknown;
  category: unknown;
  canonical_question: unknown;
  approved_answer: unknown;
  language: unknown;
  status: unknown;
  priority: unknown;
  usage_count: unknown;
};

type ScoredKnowledgeEntry = {
  entry: MonaKnowledgeEntry;
  score: number;
  languageRank: number;
};

const MAX_DATABASE_RESULTS = 250;
const MAX_KNOWLEDGE_CHARACTERS = 7000;

/**
 * Mona must use only the single best approved Knowledge Base entry.
 * This prevents several similar answers from being mixed together.
 */
const MAX_KNOWLEDGE_RESULTS = 1;

const SEARCH_STOP_WORDS = new Set([
  // English
  "a",
  "an",
  "and",
  "are",
  "can",
  "could",
  "do",
  "does",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "please",
  "the",
  "this",
  "to",
  "u",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
  "would",
  "you",
  "your",

  // Indonesian
  "ada",
  "adalah",
  "aja",
  "aku",
  "anda",
  "apa",
  "apakah",
  "atau",
  "bagaimana",
  "bisa",
  "boleh",
  "buat",
  "dari",
  "dan",
  "di",
  "dengan",
  "ini",
  "itu",
  "ke",
  "kami",
  "kamu",
  "karena",
  "mau",
  "mohon",
  "oleh",
  "pada",
  "saya",
  "sebagai",
  "tentang",
  "tersebut",
  "tidak",
  "tolong",
  "untuk",
  "yang",

  // Short acknowledgements
  "ok",
  "okay",
  "oke",
  "ya",
  "iya",
  "yes",
  "no",
  "belum",
  "gak",
  "nggak",
]);

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

function readNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function normaliseSearchText(value: string): string {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenise(value: string): string[] {
  const normalisedValue = normaliseSearchText(value);

  if (!normalisedValue) {
    return [];
  }

  return Array.from(
    new Set(
      normalisedValue
        .split(" ")
        .filter((token) => token.length >= 2)
        .filter((token) => !SEARCH_STOP_WORDS.has(token))
    )
  );
}

function createBigrams(tokens: string[]): string[] {
  const bigrams: string[] = [];

  for (let index = 0; index < tokens.length - 1; index += 1) {
    bigrams.push(`${tokens[index]} ${tokens[index + 1]}`);
  }

  return bigrams;
}

function countSharedValues(
  firstValues: string[],
  secondValues: string[]
): number {
  const secondSet = new Set(secondValues);

  return firstValues.reduce((count, value) => {
    return secondSet.has(value) ? count + 1 : count;
  }, 0);
}

function splitCanonicalQuestions(value: string): string[] {
  return value
    .split(/\r?\n|\|\|/g)
    .map((question) => cleanText(question))
    .filter(Boolean);
}

function isKnowledgeRow(value: unknown): value is KnowledgeRow {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "canonical_question" in value &&
    "approved_answer" in value
  );
}

function mapKnowledgeRow(
  row: KnowledgeRow
): MonaKnowledgeEntry | null {
  const id = cleanText(row.id);
  const category = cleanText(row.category);
  const canonicalQuestion = cleanText(
    row.canonical_question
  );
  const approvedAnswer = cleanText(
    row.approved_answer
  );
  const language = cleanText(row.language).toLowerCase();

  if (!id || !canonicalQuestion || !approvedAnswer) {
    return null;
  }

  return {
    id,
    category: category || "general",
    canonicalQuestion,
    approvedAnswer,
    language: language || "id",
    priority: readNumber(row.priority),
    usageCount: readNumber(row.usage_count),
  };
}

function getMinimumScore(messageTokenCount: number): number {
  if (messageTokenCount <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  if (messageTokenCount === 1) {
    return 650;
  }

  if (messageTokenCount === 2) {
    return 350;
  }

  return 300;
}

function calculateQuestionScore(
  customerMessage: string,
  officialQuestion: string
): number {
  const normalisedMessage = normaliseSearchText(
    customerMessage
  );

  const normalisedQuestion = normaliseSearchText(
    officialQuestion
  );

  if (!normalisedMessage || !normalisedQuestion) {
    return 0;
  }

  if (normalisedMessage === normalisedQuestion) {
    return 1000;
  }

  if (
    normalisedQuestion.length >= 4 &&
    normalisedMessage.includes(normalisedQuestion)
  ) {
    return 850;
  }

  if (
    normalisedMessage.length >= 4 &&
    normalisedQuestion.includes(normalisedMessage)
  ) {
    return 760;
  }

  const messageTokens = tokenise(customerMessage);
  const questionTokens = tokenise(officialQuestion);

  if (!messageTokens.length || !questionTokens.length) {
    return 0;
  }

  const sharedTokenCount = countSharedValues(
    messageTokens,
    questionTokens
  );

  if (sharedTokenCount === 0) {
    return 0;
  }

  const messageCoverage =
    sharedTokenCount / messageTokens.length;

  const questionCoverage =
    sharedTokenCount / questionTokens.length;

  const sharedBigramCount = countSharedValues(
    createBigrams(messageTokens),
    createBigrams(questionTokens)
  );

  return (
    messageCoverage * 420 +
    questionCoverage * 180 +
    sharedTokenCount * 35 +
    sharedBigramCount * 45
  );
}

function calculateKnowledgeScore(
  entry: MonaKnowledgeEntry,
  customerMessage: string
): number {
  const normalisedMessage = normaliseSearchText(
    customerMessage
  );

  const messageTokens = tokenise(customerMessage);

  if (!normalisedMessage || !messageTokens.length) {
    return 0;
  }

  const officialQuestions = splitCanonicalQuestions(
    entry.canonicalQuestion
  );

  let bestQuestionScore = 0;

  for (const officialQuestion of officialQuestions) {
    bestQuestionScore = Math.max(
      bestQuestionScore,
      calculateQuestionScore(
        customerMessage,
        officialQuestion
      )
    );
  }

  const normalisedCategory = normaliseSearchText(
    entry.category
  );

  const categoryTokens = tokenise(entry.category);

  let categoryScore = 0;

  if (
    normalisedCategory &&
    normalisedMessage === normalisedCategory
  ) {
    categoryScore = 700;
  } else if (
    normalisedCategory.length >= 3 &&
    normalisedMessage.includes(normalisedCategory)
  ) {
    categoryScore = 180;
  } else if (categoryTokens.length > 0) {
    const sharedCategoryTokenCount =
      countSharedValues(
        messageTokens,
        categoryTokens
      );

    if (sharedCategoryTokenCount > 0) {
      categoryScore =
        (sharedCategoryTokenCount /
          messageTokens.length) *
        120;
    }
  }

  const relevanceScore = Math.max(
    bestQuestionScore,
    categoryScore
  );

  const minimumScore = getMinimumScore(
    messageTokens.length
  );

  if (relevanceScore < minimumScore) {
    return 0;
  }

  /**
   * Priority is used only as a tiny tie-breaker.
   * It cannot turn an irrelevant result into a match.
   */
  const priorityTieBreaker =
    Math.max(
      0,
      Math.min(entry.priority, 1000)
    ) / 1000;

  return relevanceScore + priorityTieBreaker;
}

function calculateLanguageRank(
  entryLanguage: string,
  customerLanguage?: string
): number {
  const normalisedEntryLanguage = cleanText(
    entryLanguage
  ).toLowerCase();

  const normalisedCustomerLanguage = cleanText(
    customerLanguage
  ).toLowerCase();

  if (!normalisedCustomerLanguage) {
    return 0;
  }

  if (
    normalisedEntryLanguage ===
    normalisedCustomerLanguage
  ) {
    return 2;
  }

  if (
    normalisedEntryLanguage === "both" ||
    normalisedEntryLanguage === "bilingual"
  ) {
    return 1;
  }

  /**
   * Knowledge written in another language remains usable.
   * The reply generator can translate the approved facts.
   */
  return 0;
}

export async function searchApprovedMonaKnowledge(params: {
  supabase: SupabaseClient;
  customerMessage: string;
  language?: string;
  limit?: number;
}): Promise<MonaKnowledgeEntry[]> {
  const customerMessage = cleanText(
    params.customerMessage
  );

  if (!customerMessage) {
    return [];
  }

  const messageTokens = tokenise(customerMessage);

  /**
   * Messages such as "Ya", "Yes", "OK" and "Belum"
   * are not standalone Knowledge Base questions.
   */
  if (!messageTokens.length) {
    return [];
  }

  const requestedLimit = Math.max(
    1,
    Math.min(
      params.limit ?? MAX_KNOWLEDGE_RESULTS,
      MAX_KNOWLEDGE_RESULTS
    )
  );

  const { data, error } = await params.supabase
    .from("knowledge_base_entries")
    .select(
      [
        "id",
        "category",
        "canonical_question",
        "approved_answer",
        "language",
        "status",
        "priority",
        "usage_count",
      ].join(", ")
    )
    .eq("status", "active")
    .order("priority", { ascending: false })
    .limit(MAX_DATABASE_RESULTS);

  if (error) {
    console.error(
      "Failed to search Mona Knowledge Base:",
      error
    );

    return [];
  }

  const rawRows: unknown[] = Array.isArray(data)
    ? data
    : [];

  const entries: MonaKnowledgeEntry[] = rawRows
    .filter(isKnowledgeRow)
    .map(mapKnowledgeRow)
    .filter(
      (
        entry
      ): entry is MonaKnowledgeEntry => entry !== null
    );

  const scoredEntries: ScoredKnowledgeEntry[] =
    entries
      .map((entry) => ({
        entry,
        score: calculateKnowledgeScore(
          entry,
          customerMessage
        ),
        languageRank: calculateLanguageRank(
          entry.language,
          params.language
        ),
      }))
      .filter((item) => item.score > 0);

  scoredEntries.sort((first, second) => {
    if (second.score !== first.score) {
      return second.score - first.score;
    }

    if (
      second.languageRank !== first.languageRank
    ) {
      return (
        second.languageRank -
        first.languageRank
      );
    }

    if (
      second.entry.priority !==
      first.entry.priority
    ) {
      return (
        second.entry.priority -
        first.entry.priority
      );
    }

    return (
      second.entry.usageCount -
      first.entry.usageCount
    );
  });

  return scoredEntries
    .slice(0, requestedLimit)
    .map((item) => item.entry);
}

export function formatMonaKnowledge(
  entries: MonaKnowledgeEntry[]
): string {
  /**
   * No approved match means no fallback prompt.
   *
   * The conversation engine must then:
   * - send no Mona reply,
   * - create a Pending Question,
   * - pause AI,
   * - pass the conversation to admin.
   */
  if (!entries.length) {
    return "";
  }

  const entry = entries[0];

  const approvedAnswer = entry.approvedAnswer.slice(
    0,
    MAX_KNOWLEDGE_CHARACTERS
  );

  return [
    `Knowledge ID: ${entry.id}`,
    `Category: ${entry.category}`,
    `Knowledge language: ${entry.language}`,
    `Official question: ${entry.canonicalQuestion}`,
    "",
    "APPROVED TETAMO KNOWLEDGE:",
    approvedAnswer,
  ].join("\n");
}