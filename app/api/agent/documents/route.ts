import {
  isAgentDocumentLanguage,
  isAgentDocumentStatus,
  isAgentDocumentType,
  isPlainObject,
  type AgentDocumentRecord,
} from "@/lib/agent-document";

import {
  getAgentDocumentAdmin,
  getAuthenticatedDocumentUser,
  requireAgentDocumentWriteAccess,
} from "@/lib/agent-document-server";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

function cleanText(
  value: unknown
) {
  return String(
    value || ""
  ).trim();
}

function nullableText(
  value: unknown
) {
  const cleaned =
    cleanText(value);

  return cleaned || null;
}

export async function GET(
  request: Request
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

    const url =
      new URL(request.url);

    const type =
      cleanText(
        url.searchParams.get(
          "type"
        )
      );

    const status =
      cleanText(
        url.searchParams.get(
          "status"
        )
      );

    let query =
      admin
        .from(
          "agent_documents"
        )
        .select(
          "id, user_id, property_id, document_type, template_key, title, language, status, data, template_version, generated_at, created_at, updated_at"
        )
        .eq(
          "user_id",
          auth.user.id
        )
        .order(
          "updated_at",
          {
            ascending: false,
          }
        );

    if (
      type &&
      isAgentDocumentType(type)
    ) {
      query =
        query.eq(
          "document_type",
          type
        );
    }

    if (
      status &&
      isAgentDocumentStatus(
        status
      )
    ) {
      query =
        query.eq(
          "status",
          status
        );
    }

    const {
      data,
      error,
    } = await query;

    if (error) {
      throw error;
    }

    return Response.json({
      documents:
        (data ||
          []) as AgentDocumentRecord[],
    });
  } catch (error) {
    console.error(
      "Agent documents list error:",
      error
    );

    return Response.json(
      {
        error:
          "Unable to load agent documents.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: Request
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
      return writeAccess.response;
    }

    const body =
      await request.json();

    const documentType =
      body?.documentType;

    if (
      !isAgentDocumentType(
        documentType
      )
    ) {
      return Response.json(
        {
          error:
            "Invalid document type.",
        },
        {
          status: 400,
        }
      );
    }

    const language =
      body?.language ??
      "id";

    if (
      !isAgentDocumentLanguage(
        language
      )
    ) {
      return Response.json(
        {
          error:
            "Invalid document language.",
        },
        {
          status: 400,
        }
      );
    }

    const status =
      body?.status ??
      "draft";

    if (
      !isAgentDocumentStatus(
        status
      )
    ) {
      return Response.json(
        {
          error:
            "Invalid document status.",
        },
        {
          status: 400,
        }
      );
    }

    const templateKey =
      nullableText(
        body?.templateKey
      );

    if (
      documentType ===
        "letter" &&
      !templateKey
    ) {
      return Response.json(
        {
          error:
            "Letter documents require a template key.",
        },
        {
          status: 400,
        }
      );
    }

    const data =
      body?.data === undefined
        ? {}
        : body.data;

    if (
      !isPlainObject(data)
    ) {
      return Response.json(
        {
          error:
            "Document data must be an object.",
        },
        {
          status: 400,
        }
      );
    }

    const title =
      cleanText(
        body?.title
      ) ||
      (
        documentType ===
        "inventory"
          ? "Property Inventory"
          : documentType ===
              "rental_agreement"
            ? "Rental Agreement"
            : "Agent Letter"
      );

    const {
      data:
        created,
      error,
    } =
      await admin
        .from(
          "agent_documents"
        )
        .insert({
          user_id:
            auth.user.id,

          property_id:
            nullableText(
              body?.propertyId
            ),

          document_type:
            documentType,

          template_key:
            documentType ===
            "letter"
              ? templateKey
              : null,

          title,
          language,
          status,
          data,

          template_version:
            1,
        })
        .select(
          "id, user_id, property_id, document_type, template_key, title, language, status, data, template_version, generated_at, created_at, updated_at"
        )
        .single();

    if (error) {
      throw error;
    }

    return Response.json(
      {
        document:
          created as AgentDocumentRecord,
        access:
          writeAccess.access,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Agent document create error:",
      error
    );

    return Response.json(
      {
        error:
          "Unable to create agent document.",
      },
      {
        status: 500,
      }
    );
  }
}
