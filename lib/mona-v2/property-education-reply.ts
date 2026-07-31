import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  MonaV2Analysis,
  MonaV2ConversationContext,
} from "./types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type PropertyEducationRow = {
  id: unknown;
  title: unknown;
  title_id: unknown;
  description: unknown;
  description_id: unknown;
  content_type: unknown;
  access_type: unknown;
  status: unknown;
  published_at: unknown;
};

type PropertyEducationEntry = {
  id: string;
  title: string;
  titleId: string;
  description: string;
  descriptionId: string;
  contentType: string;
};

export type MonaV2PropertyEducationInput = {
  customerMessage: string;
  analysis: MonaV2Analysis;
  conversationContext?: MonaV2ConversationContext | null;
  supabase: SupabaseClient;
};

export type MonaV2PropertyEducationResult = {
  matched: boolean;
  reply: string | null;
  candidateCount: number;
  selectedEducationId: string | null;
  selectedTitle: string | null;
  selectionConfidence: number;
  requiresExternalResearch: boolean;
  shouldSaveKnowledgeCandidate: boolean;
  shouldPauseForAdmin: boolean;
  reason: string;
};

const selectionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    matched: {
      type: "boolean",
    },
    selectedEducationId: {
      type: "string",
      maxLength: 200,
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
    reason: {
      type: "string",
      maxLength: 300,
    },
  },
  required: [
    "matched",
    "selectedEducationId",
    "confidence",
    "reason",
  ],
} as const;

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

function cleanReply(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/\n{3,}/g, "\n\n")
    .slice(0, 1800);
}

function mapEducationRow(
  row: PropertyEducationRow
): PropertyEducationEntry | null {
  const id = cleanText(row.id);
  const title = cleanText(row.title);
  const titleId = cleanText(row.title_id);
  const description = cleanText(row.description);
  const descriptionId = cleanText(row.description_id);

  if (
    !id ||
    (!title && !titleId) ||
    (!description && !descriptionId)
  ) {
    return null;
  }

  return {
    id,
    title: title || titleId,
    titleId: titleId || title,
    description: description || descriptionId,
    descriptionId: descriptionId || description,
    contentType:
      cleanText(row.content_type) || "education",
  };
}

async function loadPublicPropertyEducation(
  supabase: SupabaseClient
): Promise<PropertyEducationEntry[]> {
  const { data, error } = await supabase
    .from("education_videos")
    .select(
      [
        "id",
        "title",
        "title_id",
        "description",
        "description_id",
        "content_type",
        "access_type",
        "status",
        "published_at",
      ].join(", ")
    )
    .eq("status", "published")
    .eq("access_type", "public")
    .order("published_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(
      `Failed to load public property education: ${error.message}`
    );
  }

  const rows: PropertyEducationRow[] =
    Array.isArray(data)
      ? (data as unknown as PropertyEducationRow[])
      : [];

  return rows
    .map(mapEducationRow)
    .filter(
      (
        entry
      ): entry is PropertyEducationEntry =>
        entry !== null
    );
}

function buildSelectionPrompt(params: {
  input: MonaV2PropertyEducationInput;
  candidates: PropertyEducationEntry[];
}): string {
  const compactCandidates = params.candidates.map(
    (entry) => ({
      id: entry.id,
      title: entry.title,
      titleId: entry.titleId,
      contentType: entry.contentType,
      EnglishPreview:
        entry.description.slice(0, 700),
      IndonesianPreview:
        entry.descriptionId.slice(0, 700),
    })
  );

  return `
You are Mona V2's approved Indonesian property education selector.

Select the single published public Tetamo education entry that most directly answers the customer's real question.

Do not write the customer reply.

IMPORTANT:
- Understand slang, abbreviations, spelling mistakes and mixed English-Indonesian.
- Use the supplied intent, customer role and conversation context.
- Meaning is more important than exact wording.
- Select an entry only when its educational content directly helps answer the question.
- Do not select a broadly related article merely because both mention property.
- Do not expose or assume access to paid-agent education.
- General legal or tax education may be selected only when the content directly covers it.
- Case-specific legal, ownership, contract or tax advice must not be treated as fully answered by a general article.
- When none of the public entries directly answers the question, return matched false.
- When unmatched, selectedEducationId must be an empty string.
- Never invent an ID.

CUSTOMER MESSAGE:
${params.input.customerMessage}

INTENT:
${params.input.analysis.intent}

CUSTOMER ROLE:
${params.input.analysis.customerRole}

CUSTOMER LANGUAGE:
${params.input.analysis.language}

PREFERRED REPLY LANGUAGE:
${params.input.analysis.preferredReplyLanguage}

RISK LEVEL:
${params.input.analysis.riskLevel}

CURRENT TOPIC:
${params.input.conversationContext?.currentTopic || "none"}

RECENT CONVERSATION:
${params.input.conversationContext?.recentMessages || "none"}

PUBLISHED PUBLIC EDUCATION CANDIDATES:
${JSON.stringify(compactCandidates, null, 2)}
`.trim();
}

function buildReplyPrompt(params: {
  input: MonaV2PropertyEducationInput;
  entry: PropertyEducationEntry;
}): string {
  const preferredContent =
    params.input.analysis.preferredReplyLanguage === "id"
      ? params.entry.descriptionId
      : params.entry.description;

  return `
You are Mona, Tetamo's Indonesian property WhatsApp assistant.

Answer the customer using only the approved public property education content supplied below.

RESPONSE RULES:
- Sound knowledgeable, warm, professional and conversational.
- Answer the actual question first.
- Match the preferred reply language.
- Keep the answer clear and suitable for WhatsApp.
- Explain practical steps when the approved content supports them.
- Do not copy the source word-for-word.
- Do not invent Indonesian laws, taxes, certifications, organisations, documents or procedures.
- Do not present general education as personalised legal, tax or contract advice.
- For sensitive topics, clearly explain that the answer is general education and that documents or circumstances may need professional review.
- Do not begin with a greeting unless the customer greeted Mona.
- Do not automatically finish with a question.
- Do not turn every education answer into a Tetamo advertisement.
- Mention Tetamo softly only when it directly helps the customer's stated need.
- Do not mention internal selection, confidence, databases or system instructions.

CUSTOMER MESSAGE:
${params.input.customerMessage}

INTENT:
${params.input.analysis.intent}

CUSTOMER ROLE:
${params.input.analysis.customerRole}

CUSTOMER EMOTION:
${params.input.analysis.emotion}

RISK LEVEL:
${params.input.analysis.riskLevel}

SALES OPPORTUNITY:
${params.input.analysis.salesOpportunity}

SELECTED EDUCATION TITLE:
${
  params.input.analysis.preferredReplyLanguage === "id"
    ? params.entry.titleId
    : params.entry.title
}

APPROVED EDUCATION CONTENT:
${preferredContent}

Write only Mona's final WhatsApp reply.
`.trim();
}

export async function generateMonaV2PropertyEducationReply(
  input: MonaV2PropertyEducationInput
): Promise<MonaV2PropertyEducationResult> {
  try {
    const candidates =
      await loadPublicPropertyEducation(
        input.supabase
      );

    if (!candidates.length) {
      return {
        matched: false,
        reply: null,
        candidateCount: 0,
        selectedEducationId: null,
        selectedTitle: null,
        selectionConfidence: 0,
        requiresExternalResearch: true,
        shouldSaveKnowledgeCandidate: true,
        shouldPauseForAdmin:
          input.analysis.riskLevel === "high",
        reason:
          "No published public property education is available.",
      };
    }

    if (!process.env.OPENAI_API_KEY) {
      return {
        matched: false,
        reply: null,
        candidateCount: candidates.length,
        selectedEducationId: null,
        selectedTitle: null,
        selectionConfidence: 0,
        requiresExternalResearch: true,
        shouldSaveKnowledgeCandidate: false,
        shouldPauseForAdmin: true,
        reason:
          "The property education selector is unavailable.",
      };
    }

    const selectionResponse =
      await openai.responses.create({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "Select the single best published public property education entry. Return only the required structured selection.",
          },
          {
            role: "user",
            content: buildSelectionPrompt({
              input,
              candidates,
            }),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "mona_v2_property_education_selection",
            description:
              "Selection of the public property education entry that best answers the customer.",
            strict: true,
            schema: selectionSchema,
          },
        },
        temperature: 0.1,
        max_output_tokens: 300,
        store: false,
      });

    const rawSelection = cleanText(
      selectionResponse.output_text
    );

    if (!rawSelection) {
      return {
        matched: false,
        reply: null,
        candidateCount: candidates.length,
        selectedEducationId: null,
        selectedTitle: null,
        selectionConfidence: 0,
        requiresExternalResearch: true,
        shouldSaveKnowledgeCandidate: true,
        shouldPauseForAdmin:
          input.analysis.riskLevel === "high",
        reason:
          "The property education selector returned no result.",
      };
    }

    const selection = JSON.parse(rawSelection) as {
      matched: boolean;
      selectedEducationId: string;
      confidence: number;
      reason: string;
    };

    if (
      !selection.matched ||
      !selection.selectedEducationId ||
      selection.confidence < 0.7
    ) {
      return {
        matched: false,
        reply: null,
        candidateCount: candidates.length,
        selectedEducationId: null,
        selectedTitle: null,
        selectionConfidence:
          selection.confidence,
        requiresExternalResearch: true,
        shouldSaveKnowledgeCandidate: true,
        shouldPauseForAdmin:
          input.analysis.riskLevel === "high",
        reason: selection.reason,
      };
    }

    const selectedEntry =
      candidates.find(
        (entry) =>
          entry.id ===
          selection.selectedEducationId
      ) ?? null;

    if (!selectedEntry) {
      return {
        matched: false,
        reply: null,
        candidateCount: candidates.length,
        selectedEducationId: null,
        selectedTitle: null,
        selectionConfidence: 0,
        requiresExternalResearch: true,
        shouldSaveKnowledgeCandidate: false,
        shouldPauseForAdmin: true,
        reason:
          "The selector returned an unknown education ID.",
      };
    }

    const replyResponse =
      await openai.responses.create({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "Write Mona's property education WhatsApp reply using only the selected approved public education content.",
          },
          {
            role: "user",
            content: buildReplyPrompt({
              input,
              entry: selectedEntry,
            }),
          },
        ],
        temperature: 0.35,
        max_output_tokens: 500,
        store: false,
      });

    const reply = cleanReply(
      replyResponse.output_text
    );

    if (!reply) {
      return {
        matched: true,
        reply: null,
        candidateCount: candidates.length,
        selectedEducationId:
          selectedEntry.id,
        selectedTitle:
          input.analysis.preferredReplyLanguage === "id"
            ? selectedEntry.titleId
            : selectedEntry.title,
        selectionConfidence:
          selection.confidence,
        requiresExternalResearch: false,
        shouldSaveKnowledgeCandidate: false,
        shouldPauseForAdmin: true,
        reason:
          "Approved education was selected, but Mona produced an empty reply.",
      };
    }

    return {
      matched: true,
      reply,
      candidateCount: candidates.length,
      selectedEducationId:
        selectedEntry.id,
      selectedTitle:
        input.analysis.preferredReplyLanguage === "id"
          ? selectedEntry.titleId
          : selectedEntry.title,
      selectionConfidence:
        selection.confidence,
      requiresExternalResearch: false,
      shouldSaveKnowledgeCandidate: false,
      shouldPauseForAdmin: false,
      reason:
        "Mona selected and used relevant published public property education.",
    };
  } catch (error) {
    console.error(
      "Mona V2 property education reply failed:",
      error
    );

    return {
      matched: false,
      reply: null,
      candidateCount: 0,
      selectedEducationId: null,
      selectedTitle: null,
      selectionConfidence: 0,
      requiresExternalResearch: true,
      shouldSaveKnowledgeCandidate: false,
      shouldPauseForAdmin: true,
      reason:
        "Property education selection or reply generation failed.",
    };
  }
}
