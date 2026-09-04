import {
  createClient,
} from "@supabase/supabase-js";

import {
  generateAgentRentalAgreementPdf,
  type RentalAgreementPdfLanguage,
} from "@/lib/agent-rental-agreement-pdf";

import type {
  RentalAgreementData,
} from "@/lib/agent-rental-agreement";

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
      /\/api\/agent\/documents\/rental-agreement\/([^/]+)\/generate\/?$/
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
    .slice(
      0,
      100
    );
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
            "Rental Agreement document ID is required.",
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
      data:
        userResult,

      error:
        userError,
    } =
      await supabase.auth
        .getUser(
          token
        );

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

    /*
     * Server-side Agent Tools entitlement check.
     *
     * Gold / Agent Pro / active migrated
     * memberships are allowed by the existing RPC.
     */
    const {
      data:
        accessAllowed,

      error:
        accessError,
    } =
      await supabase.rpc(
        "has_agent_document_access"
      );

    if (
      accessError
    ) {
      console.error(
        "Rental Agreement PDF entitlement error:",
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

    if (
      !accessAllowed
    ) {
      return Response.json(
        {
          error:
            "Gold atau Agent Pro diperlukan untuk membuat PDF Rental Agreement.",

          code:
            "AGENT_DOCUMENT_UPGRADE_REQUIRED",
        },
        {
          status: 403,
        }
      );
    }

    const {
      data:
        document,

      error:
        documentError,
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
            title,
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

    if (
      documentError
    ) {
      throw documentError;
    }

    if (
      !document
    ) {
      return Response.json(
        {
          error:
            "Rental Agreement tidak ditemukan.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      document.document_type !==
      "rental_agreement"
    ) {
      return Response.json(
        {
          error:
            "Document ini bukan Rental Agreement.",
        },
        {
          status: 400,
        }
      );
    }

    const agreement =
      document.data as RentalAgreementData;

    if (
      !agreement ||
      !agreement.property ||
      !agreement.landlord ||
      !agreement.tenant ||
      !agreement.financial
    ) {
      return Response.json(
        {
          error:
            "Data Rental Agreement tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * The agreement data is the source of truth for
     * the editor's current language selection.
     *
     * Fall back to the document column for older drafts.
     */
    const language:
      RentalAgreementPdfLanguage =
      agreement.language ===
        "bilingual" ||
      document.language ===
        "bilingual"
        ? "bilingual"
        : "id";

    let inventoryForAppendix:
      AgentInventoryData | null =
      null;

    if (
      agreement
        .inventoryAttachment
        ?.enabled &&
      agreement
        .inventoryAttachment
        .documentId
    ) {
      const {
        data:
          inventoryDocument,
        error:
          inventoryError,
      } =
        await supabase
          .from(
            "agent_documents"
          )
          .select(
            "id, user_id, property_id, document_type, title, data"
          )
          .eq(
            "id",
            agreement
              .inventoryAttachment
              .documentId
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

      if (
        inventoryError
      ) {
        throw inventoryError;
      }

      if (
        !inventoryDocument
      ) {
        return Response.json(
          {
            error:
              "Inventory yang dipilih untuk Lampiran 1 tidak ditemukan.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        inventoryDocument
          .document_type !==
        "inventory"
      ) {
        return Response.json(
          {
            error:
              "Dokumen Lampiran 1 bukan Inventory & Handover Report.",
          },
          {
            status: 400,
          }
        );
      }

      const inventoryData =
        inventoryDocument
          .data as AgentInventoryData;

      if (
        !inventoryData ||
        !inventoryData.property ||
        !Array.isArray(
          inventoryData.sections
        )
      ) {
        return Response.json(
          {
            error:
              "Data Inventory Lampiran 1 tidak valid.",
          },
          {
            status: 400,
          }
        );
      }

      const rentalPropertyId =
        clean(
          document.property_id
        ) ||
        clean(
          agreement.property.id
        );

      const inventoryPropertyId =
        clean(
          inventoryDocument
            .property_id
        ) ||
        clean(
          inventoryData
            .property.id
        );

      if (
        !rentalPropertyId ||
        !inventoryPropertyId ||
        rentalPropertyId !==
          inventoryPropertyId
      ) {
        return Response.json(
          {
            error:
              "Inventory Lampiran 1 harus berasal dari properti yang sama dengan Rental Agreement.",
          },
          {
            status: 400,
          }
        );
      }

      inventoryForAppendix =
        inventoryData;
    }

    const pdfBuffer =
      await generateAgentRentalAgreementPdf(
        agreement,
        language,
        inventoryForAppendix
      );

    const propertyCode =
      clean(
        agreement.property
          .code
      ) ||
      clean(
        agreement.property
          .title
      ) ||
      "property";

    /*
     * No Tetamo branding in the exported contract filename.
     */
    const prefix =
      language ===
      "bilingual"
        ? "rental-agreement-bilingual"
        : "perjanjian-sewa";

    const fileName =
      `${sanitizeFileName(
        `${prefix}-${propertyCode}`
      )}.pdf`;

    const generatedAt =
      new Date()
        .toISOString();

    const {
      error:
        generatedUpdateError,
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
        "Rental Agreement generated_at update failed:",
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
            "rental_agreement",

          "X-Tetamo-Document-Language":
            language,
        },
      }
    );
  } catch (error) {
    console.error(
      "Rental Agreement PDF generation error:",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "PDF Rental Agreement tidak dapat dibuat.",
      },
      {
        status: 500,
      }
    );
  }
}
