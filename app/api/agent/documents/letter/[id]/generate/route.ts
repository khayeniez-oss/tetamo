import {
  generateAgentLetterPdf,
  type AgentLetterPdfLanguage,
} from "@/lib/agent-letter-pdf";

import {
  getAgentLetterTemplate,
  isAgentLetterTemplateKey,
  normalizeAgentLetterData,
} from "@/lib/agent-letter";

import {
  getAgentDocumentAdmin,
  getAuthenticatedDocumentUser,
  requireAgentDocumentWriteAccess,
} from "@/lib/agent-document-server";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function clean(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function sanitizeFileName(
  value: string
) {
  return value
    .normalize(
      "NFKD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-zA-Z0-9_-]+/g,
      "-"
    )
    .replace(
      /-+/g,
      "-"
    )
    .replace(
      /^-|-$/g,
      ""
    )
    .slice(
      0,
      100
    );
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const admin =
      getAgentDocumentAdmin();

    const auth =
      await getAuthenticatedDocumentUser(
        request,
        admin
      );

    if (
      !auth.user ||
      auth.response
    ) {
      return auth.response!;
    }

    const writeAccess =
      await requireAgentDocumentWriteAccess(
        admin,
        auth.user.id
      );

    if (
      writeAccess.response
    ) {
      return (
        writeAccess.response
      );
    }

    const params =
      await context.params;

    const documentId =
      clean(
        params.id
      );

    if (!documentId) {
      return Response.json(
        {
          error:
            "Letter & Document ID is required.",
        },
        {
          status:
            400,
        }
      );
    }

    const {
      data:
        document,

      error:
        documentError,
    } =
      await admin
        .from(
          "agent_documents"
        )
        .select(
          "id, user_id, property_id, document_type, template_key, title, language, data"
        )
        .eq(
          "id",
          documentId
        )
        .eq(
          "user_id",
          auth.user.id
        )
        .maybeSingle();

    if (
      documentError
    ) {
      throw documentError;
    }

    if (!document) {
      return Response.json(
        {
          error:
            "Letter & Document tidak ditemukan.",
        },
        {
          status:
            404,
        }
      );
    }

    if (
      document.document_type !==
      "letter"
    ) {
      return Response.json(
        {
          error:
            "Document ini bukan Letter & Document.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      !document.template_key ||
      !isAgentLetterTemplateKey(
        document.template_key
      )
    ) {
      return Response.json(
        {
          error:
            "Template Letter & Document tidak valid.",
        },
        {
          status:
            400,
        }
      );
    }

    const language:
      AgentLetterPdfLanguage =
      document.language ===
        "bilingual"
        ? "bilingual"
        : "id";

    const letter =
      normalizeAgentLetterData(
        document.data,
        document.template_key,
        language
      );

    const pdfBuffer =
      await generateAgentLetterPdf(
        letter,
        language
      );

    const template =
      getAgentLetterTemplate(
        document.template_key
      );

    const reference =
      clean(
        letter.property
          ?.code
      ) ||
      clean(
        letter.property
          ?.title
      ) ||
      clean(
        letter.recipient
          .name
      ) ||
      "document";

    const prefix =
      language ===
      "bilingual"
        ? `${document.template_key}-bilingual`
        : document.template_key;

    const fileName =
      `${sanitizeFileName(
        `${prefix}-${reference}`
      )}.pdf`;

    const generatedAt =
      new Date()
        .toISOString();

    const {
      error:
        updateError,
    } =
      await admin
        .from(
          "agent_documents"
        )
        .update({
          generated_at:
            generatedAt,
        })
        .eq(
          "id",
          documentId
        )
        .eq(
          "user_id",
          auth.user.id
        );

    if (
      updateError
    ) {
      console.warn(
        "Letter PDF generated_at update failed:",
        updateError
      );
    }

    return new Response(
      new Uint8Array(
        pdfBuffer
      ),
      {
        status:
          200,

        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `attachment; filename="${fileName}"`,

          "Cache-Control":
            "no-store",

          "X-Tetamo-Document-Type":
            "letter",

          "X-Tetamo-Letter-Template":
            template.key,

          "X-Tetamo-Document-Language":
            language,
        },
      }
    );
  } catch (error) {
    console.error(
      "Letter PDF generation error:",
      error
    );

    return Response.json(
      {
        error:
          error instanceof
            Error
            ? error.message
            : "PDF Letter & Document tidak dapat dibuat.",
      },
      {
        status:
          500,
      }
    );
  }
}
