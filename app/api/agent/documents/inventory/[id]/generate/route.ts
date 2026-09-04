import {
  createClient,
} from "@supabase/supabase-js";

import {
  generateAgentInventoryPdf,
  type InventoryPdfLanguage,
} from "@/lib/agent-inventory-pdf";

import type {
  AgentInventoryData,
} from "@/lib/agent-inventory";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

function clean(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function getBearerToken(
  request: Request
) {
  const authorization =
    request.headers.get(
      "authorization"
    ) || "";

  const match =
    authorization.match(
      /^Bearer\s+(.+)$/i
    );

  return (
    match?.[1]?.trim() ||
    ""
  );
}

function documentIdFromRequest(
  request: Request
) {
  const pathname =
    new URL(
      request.url
    ).pathname;

  const match =
    pathname.match(
      /\/api\/agent\/documents\/inventory\/([^/]+)\/generate\/?$/
    );

  return match?.[1]
    ? decodeURIComponent(
        match[1]
      )
    : "";
}

function sanitizeFileName(
  value: string
) {
  return value
    .normalize("NFKD")
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
    .slice(0, 100);
}

export async function POST(
  request: Request
) {
  try {
    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL ||
      process.env
        .SUPABASE_URL ||
      "";

    const supabaseAnonKey =
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env
        .SUPABASE_ANON_KEY ||
      "";

    if (
      !supabaseUrl ||
      !supabaseAnonKey
    ) {
      return Response.json(
        {
          error:
            "Supabase configuration is missing.",
        },
        {
          status: 500,
        }
      );
    }

    const token =
      getBearerToken(
        request
      );

    if (!token) {
      return Response.json(
        {
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const documentId =
      documentIdFromRequest(
        request
      );

    if (!documentId) {
      return Response.json(
        {
          error:
            "Inventory document ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      createClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          global: {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },

          auth: {
            autoRefreshToken:
              false,
            persistSession:
              false,
          },
        }
      );

    const {
      data: userResult,
      error: userError,
    } =
      await supabase.auth
        .getUser(token);

    const user =
      userResult.user;

    if (
      userError ||
      !user
    ) {
      return Response.json(
        {
          error:
            "Session login tidak valid. Silakan login kembali.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data: accessAllowed,
      error: accessError,
    } =
      await supabase.rpc(
        "has_agent_document_access"
      );

    if (accessError) {
      console.error(
        "Inventory PDF entitlement error:",
        accessError
      );

      return Response.json(
        {
          error:
            "Agent Tools access could not be verified.",
        },
        {
          status: 500,
        }
      );
    }

    if (!accessAllowed) {
      return Response.json(
        {
          error:
            "Gold atau Agent Pro diperlukan untuk membuat PDF Inventory.",
          code:
            "AGENT_DOCUMENT_UPGRADE_REQUIRED",
        },
        {
          status: 403,
        }
      );
    }

    const {
      data: document,
      error: documentError,
    } =
      await supabase
        .from(
          "agent_documents"
        )
        .select(
          `
            id,
            user_id,
            property_id,
            document_type,
            language,
            data
          `
        )
        .eq(
          "id",
          documentId
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

    if (documentError) {
      throw documentError;
    }

    if (!document) {
      return Response.json(
        {
          error:
            "Inventory tidak ditemukan.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      document.document_type !==
      "inventory"
    ) {
      return Response.json(
        {
          error:
            "Document ini bukan Inventory.",
        },
        {
          status: 400,
        }
      );
    }

    const inventory =
      document.data as AgentInventoryData;

    if (
      !inventory ||
      !inventory.property ||
      !Array.isArray(
        inventory.sections
      )
    ) {
      return Response.json(
        {
          error:
            "Data Inventory tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    const language:
      InventoryPdfLanguage =
      document.language ===
      "en"
        ? "en"
        : "id";

    const pdfBuffer =
      await generateAgentInventoryPdf(
        inventory,
        language
      );

    const code =
      clean(
        inventory.property
          .code
      ) ||
      clean(
        inventory.property
          .title
      ) ||
      "property";

    const prefix =
      language === "id"
        ? "tetamo-inventory-serah-terima"
        : "tetamo-property-inventory-handover";

    const fileName =
      `${sanitizeFileName(
        `${prefix}-${code}`
      )}.pdf`;

    const generatedAt =
      new Date()
        .toISOString();

    const {
      error: generatedUpdateError,
    } =
      await supabase
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
          user.id
        );

    if (
      generatedUpdateError
    ) {
      console.warn(
        "Inventory generated_at update failed:",
        generatedUpdateError
      );
    }

    return new Response(
      new Uint8Array(
        pdfBuffer
      ),
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `attachment; filename="${fileName}"`,

          "Cache-Control":
            "no-store",

          "X-Tetamo-Document-Type":
            "inventory",

          "X-Tetamo-Document-Language":
            language,
        },
      }
    );
  } catch (error) {
    console.error(
      "Inventory PDF generation error:",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Inventory PDF tidak dapat dibuat.",
      },
      {
        status: 500,
      }
    );
  }
}
