import {
  createAgentLetterData,
  getAgentLetterTemplate,
  isAgentLetterTemplateKey,
  type AgentLetterLanguage,
  type AgentLetterProperty,
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

type PropertyRow = {
  id: unknown;
  kode?: unknown;

  title?: unknown;
  title_id?: unknown;

  province?: unknown;
  city?: unknown;
  address?: unknown;

  property_type?: unknown;
};

type ProfileRow = {
  full_name: string | null;
  agency: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

function cleanText(
  value: unknown
) {
  return String(
    value || ""
  ).trim();
}

function buildLocation(
  city: unknown,
  province: unknown
) {
  return [
    cleanText(city),
    cleanText(province),
  ]
    .filter(Boolean)
    .join(", ");
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

    const templateKey =
      cleanText(
        body?.templateKey
      );

    if (
      !isAgentLetterTemplateKey(
        templateKey
      )
    ) {
      return Response.json(
        {
          error:
            "Invalid Letter & Document template.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Initial Letter & Documents release:
     *
     * - Bahasa Indonesia
     * - Bilingual Bahasa Indonesia + English
     */
    const language:
      AgentLetterLanguage =
      body?.language ===
      "bilingual"
        ? "bilingual"
        : "id";

    const propertyId =
      cleanText(
        body?.propertyId
      );

    const profileResult =
      await admin
        .from(
          "profiles"
        )
        .select(
          "full_name, agency, phone, email, address"
        )
        .eq(
          "id",
          auth.user.id
        )
        .maybeSingle();

    if (
      profileResult.error
    ) {
      throw profileResult.error;
    }

    const profile =
      (
        profileResult.data ||
        {}
      ) as Partial<ProfileRow>;

    let letterProperty:
      AgentLetterProperty | null =
      null;

    if (
      propertyId
    ) {
      /*
       * A selected Tetamo property must belong
       * to the authenticated agent.
       */
      const propertyResult =
        await admin
          .from(
            "properties"
          )
          .select(
            `
              id,
              kode,
              title,
              title_id,
              province,
              city,
              address,
              property_type
            `
          )
          .eq(
            "id",
            propertyId
          )
          .eq(
            "user_id",
            auth.user.id
          )
          .maybeSingle();

      if (
        propertyResult.error
      ) {
        throw propertyResult.error;
      }

      if (
        !propertyResult.data
      ) {
        return Response.json(
          {
            error:
              "Property not found or does not belong to this agent.",

            code:
              "AGENT_PROPERTY_NOT_FOUND",
          },
          {
            status: 404,
          }
        );
      }

      const property =
        propertyResult
          .data as PropertyRow;

      const propertyTitle =
        cleanText(
          property.title_id
        ) ||
        cleanText(
          property.title
        ) ||
        cleanText(
          property.kode
        ) ||
        "Properti";

      letterProperty = {
        id:
          cleanText(
            property.id
          ),

        code:
          cleanText(
            property.kode
          ),

        title:
          propertyTitle,

        address:
          cleanText(
            property.address
          ),

        location:
          buildLocation(
            property.city,
            property.province
          ),

        propertyType:
          cleanText(
            property.property_type
          ),
      };
    }

    const letter =
      createAgentLetterData({
        templateKey,
        language,

        sender: {
          name:
            cleanText(
              profile.full_name
            ),

          agency:
            cleanText(
              profile.agency
            ),

          phone:
            cleanText(
              profile.phone
            ),

          email:
            cleanText(
              profile.email
            ) ||
            cleanText(
              auth.user.email
            ),

          address:
            cleanText(
              profile.address
            ),
        },

        property:
          letterProperty,
      });

    const template =
      getAgentLetterTemplate(
        templateKey
      );

    const propertyReference =
      letterProperty
        ? (
            letterProperty.code ||
            letterProperty.title
          )
        : "";

    const documentTitle =
      propertyReference
        ? `${template.labelId} - ${propertyReference}`
        : template.labelId;

    const {
      data:
        createdDocument,

      error:
        createError,
    } =
      await admin
        .from(
          "agent_documents"
        )
        .insert({
          user_id:
            auth.user.id,

          property_id:
            letterProperty
              ?.id ||
            null,

          document_type:
            "letter",

          template_key:
            templateKey,

          title:
            documentTitle,

          language,

          status:
            "draft",

          data:
            letter,

          template_version:
            1,
        })
        .select(
          "id, user_id, property_id, document_type, template_key, title, language, status, data, template_version, generated_at, created_at, updated_at"
        )
        .single();

    if (
      createError
    ) {
      throw createError;
    }

    return Response.json(
      {
        document:
          createdDocument,

        letterSummary: {
          templateKey,

          templateLabel:
            template.labelId,

          propertyId:
            letterProperty
              ?.id ||
            null,

          propertyCode:
            letterProperty
              ?.code ||
            "",

          propertyTitle:
            letterProperty
              ?.title ||
            "",

          language,
        },

        access:
          writeAccess.access,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Create Letter & Document error:",
      error
    );

    return Response.json(
      {
        error:
          "Unable to create Letter & Document.",
      },
      {
        status: 500,
      }
    );
  }
}
