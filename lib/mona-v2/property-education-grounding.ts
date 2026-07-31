import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type PropertyEducationGroundingInput = {
  customerMessage: string;
  selectedTitle: string;
  selectedContent: string;
};

export type PropertyEducationGroundingResult = {
  covered: boolean;
  confidence: number;
  missingTerms: string[];
  reason: string;
};

const coverageSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    directlyAnswered: {
      type: "boolean",
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
    reason: {
      type: "string",
      maxLength: 400,
    },
  },
  required: [
    "directlyAnswered",
    "confidence",
    "reason",
  ],
} as const;

const criticalPropertyTerms: Array<{
  name: string;
  patterns: string[];
}> = [
  {
    name: "SHM",
    patterns: [
      "shm",
      "sertifikat hak milik",
      "hak milik",
    ],
  },
  {
    name: "HGB",
    patterns: [
      "hgb",
      "hak guna bangunan",
    ],
  },
  {
    name: "HGU",
    patterns: [
      "hgu",
      "hak guna usaha",
    ],
  },
  {
    name: "Hak Pakai",
    patterns: ["hak pakai"],
  },
  {
    name: "AJB",
    patterns: [
      "ajb",
      "akta jual beli",
    ],
  },
  {
    name: "PPJB",
    patterns: [
      "ppjb",
      "perjanjian pengikatan jual beli",
    ],
  },
  {
    name: "PBG",
    patterns: [
      "pbg",
      "persetujuan bangunan gedung",
    ],
  },
  {
    name: "IMB",
    patterns: [
      "imb",
      "izin mendirikan bangunan",
    ],
  },
  {
    name: "SLF",
    patterns: [
      "slf",
      "sertifikat laik fungsi",
    ],
  },
  {
    name: "BPHTB",
    patterns: ["bphtb"],
  },
  {
    name: "PPAT",
    patterns: ["ppat"],
  },
  {
    name: "Hak Tanggungan",
    patterns: ["hak tanggungan"],
  },
  {
    name: "Roya",
    patterns: ["roya"],
  },
  {
    name: "Girik",
    patterns: ["girik"],
  },
  {
    name: "Leasehold",
    patterns: ["leasehold"],
  },
  {
    name: "Freehold",
    patterns: ["freehold"],
  },
  {
    name: "Nominee",
    patterns: ["nominee"],
  },
];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function containsPattern(
  text: string,
  pattern: string
): boolean {
  return text.includes(normalizeText(pattern));
}

function findMissingCriticalTerms(
  customerMessage: string,
  selectedContent: string
): string[] {
  const message = normalizeText(customerMessage);
  const content = normalizeText(selectedContent);

  return criticalPropertyTerms
    .filter((term) => {
      const customerMentionedTerm =
        term.patterns.some((pattern) =>
          containsPattern(message, pattern)
        );

      if (!customerMentionedTerm) {
        return false;
      }

      const sourceContainsTerm =
        term.patterns.some((pattern) =>
          containsPattern(content, pattern)
        );

      return !sourceContainsTerm;
    })
    .map((term) => term.name);
}

export async function validatePropertyEducationCoverage(
  input: PropertyEducationGroundingInput
): Promise<PropertyEducationGroundingResult> {
  const missingTerms = findMissingCriticalTerms(
    input.customerMessage,
    input.selectedContent
  );

  if (missingTerms.length > 0) {
    return {
      covered: false,
      confidence: 1,
      missingTerms,
      reason:
        `The selected education content does not contain the customer's named property terms: ${missingTerms.join(", ")}.`,
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      covered: false,
      confidence: 0,
      missingTerms: [],
      reason:
        "The property education grounding validator is unavailable.",
    };
  }

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "Judge whether the supplied education source explicitly contains enough information to answer the customer's main question. Use only the supplied source.",
        },
        {
          role: "user",
          content: `
Determine whether the selected education content directly and explicitly answers the customer's main question.

STRICT RULES:
- Do not use your own property knowledge.
- A related topic is not enough.
- A passing mention is not enough.
- The source must contain the actual explanation, comparison, steps or facts needed for the answer.
- Mentioning "certificate status" does not explain the difference between SHM and HGB.
- If an important definition, distinction or procedure is absent, return directlyAnswered false.
- Be conservative.

CUSTOMER QUESTION:
${input.customerMessage}

SELECTED EDUCATION TITLE:
${input.selectedTitle}

SELECTED EDUCATION CONTENT:
${input.selectedContent.slice(0, 12000)}
`.trim(),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "property_education_coverage",
          description:
            "Whether the selected approved education directly answers the customer.",
          strict: true,
          schema: coverageSchema,
        },
      },
      temperature: 0,
      max_output_tokens: 250,
      store: false,
    });

    const raw = String(
      response.output_text ?? ""
    ).trim();

    if (!raw) {
      return {
        covered: false,
        confidence: 0,
        missingTerms: [],
        reason:
          "The grounding validator returned no result.",
      };
    }

    const result = JSON.parse(raw) as {
      directlyAnswered: boolean;
      confidence: number;
      reason: string;
    };

    return {
      covered:
        result.directlyAnswered &&
        result.confidence >= 0.9,
      confidence: result.confidence,
      missingTerms: [],
      reason: result.reason,
    };
  } catch (error) {
    console.error(
      "Property education grounding validation failed:",
      error
    );

    return {
      covered: false,
      confidence: 0,
      missingTerms: [],
      reason:
        "Property education grounding validation failed.",
    };
  }
}
