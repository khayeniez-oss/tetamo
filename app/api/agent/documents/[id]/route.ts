import {
  isAgentDocumentLanguage,
  isAgentDocumentStatus,
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

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

async function getDocumentId(
  context: RouteContext
) {
  const params =
    await context.params;

  return cleanText(
    params.id
  );
}

export async function GET(
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

    const documentId =
      await getDocumentId(
        context
      );

    const {
      data,
      error,
    } =
      await admin
        .from(
          "agent_documents"
        )
        .select(
          "id, user_id, property_id, document_type, template_key, title, language, status, data, template_version, generated_at, created_at, updated_at"
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

    if (error) {
      throw error;
    }

    if (!data) {
      return Response.json(
        {
          error:
            "Document not found.",
        },
        {
          status: 404,
        }
      );
    }

    return Response.json({
      document:
        data as AgentDocumentRecord,
    });
  } catch (error) {
    console.error(
      "Agent document load error:",
      error
    );

    return Response.json(
      {
        error:
          "Unable to load agent document.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
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
      return writeAccess.response;
    }

    const documentId =
      await getDocumentId(
        context
      );

    const body =
      await request.json();

    const updates:
      Record<
        string,
        unknown
      > = {};

    if (
      body?.propertyId !==
      undefined
    ) {
      updates.property_id =
        nullableText(
          body.propertyId
        );
    }

    if (
      body?.title !==
      undefined
    ) {
      const title =
        cleanText(
          body.title
        );

      if (!title) {
        return Response.json(
          {
            error:
              "Document title cannot be empty.",
          },
          {
            status: 400,
          }
        );
      }

      updates.title =
        title;
    }

    if (
      body?.language !==
      undefined
    ) {
      if (
        !isAgentDocumentLanguage(
          body.language
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

      updates.language =
        body.language;
    }

    if (
      body?.status !==
      undefined
    ) {
      if (
        !isAgentDocumentStatus(
          body.status
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

      updates.status =
        body.status;
    }

    if (
      body?.data !==
      undefined
    ) {
      if (
        !isPlainObject(
          body.data
        )
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

      updates.data =
        body.data;
    }

    if (
      body?.templateKey !==
      undefined
    ) {
      updates.template_key =
        nullableText(
          body.templateKey
        );
    }

    if (
      Object.keys(
        updates
      ).length === 0
    ) {
      return Response.json(
        {
          error:
            "No document changes supplied.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data,
      error,
    } =
      await admin
        .from(
          "agent_documents"
        )
        .update(
          updates
        )
        .eq(
          "id",
          documentId
        )
        .eq(
          "user_id",
          auth.user.id
        )
        .select(
          "id, user_id, property_id, document_type, template_key, title, language, status, data, template_version, generated_at, created_at, updated_at"
        )
        .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return Response.json(
        {
          error:
            "Document not found.",
        },
        {
          status: 404,
        }
      );
    }

    return Response.json({
      document:
        data as AgentDocumentRecord,
      access:
        writeAccess.access,
    });
  } catch (error) {
    console.error(
      "Agent document update error:",
      error
    );

    return Response.json(
      {
        error:
          "Unable to update agent document.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
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

    const documentId =
      await getDocumentId(
        context
      );

    const {
      data,
      error,
    } =
      await admin
        .from(
          "agent_documents"
        )
        .delete()
        .eq(
          "id",
          documentId
        )
        .eq(
          "user_id",
          auth.user.id
        )
        .select("id")
        .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return Response.json(
        {
          error:
            "Document not found.",
        },
        {
          status: 404,
        }
      );
    }

    return Response.json({
      deleted: true,
      id: data.id,
    });
  } catch (error) {
    console.error(
      "Agent document delete error:",
      error
    );

    return Response.json(
      {
        error:
          "Unable to delete agent document.",
      },
      {
        status: 500,
      }
    );
  }
}
