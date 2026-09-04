import {
  createAgentInventoryData,
  detectPoolFromFacilities,
} from "@/lib/agent-inventory";

import {
  getAgentDocumentAdmin,
  getAuthenticatedDocumentUser,
  requireAgentDocumentWriteAccess,
} from "@/lib/agent-document-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PropertyRow = {
  id: unknown;
  kode?: unknown;

  title?: unknown;
  title_id?: unknown;

  province?: unknown;
  city?: unknown;
  address?: unknown;

  property_type?: unknown;

  bedrooms?: unknown;
  bathrooms?: unknown;

  facilities?: unknown;
};

type ProfileRow = {
  full_name: string | null;
  agency: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function safeNumber(
  ...values: unknown[]
): number | null {
  for (const value of values) {
    const parsed = Number(value);

    if (
      Number.isFinite(parsed) &&
      parsed >= 0
    ) {
      return Math.floor(parsed);
    }
  }

  return null;
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

    if (writeAccess.response) {
      return writeAccess.response;
    }

    const body =
      await request.json();

    const propertyId =
      cleanText(
        body?.propertyId
      );

    if (!propertyId) {
      return Response.json(
        {
          error:
            "Property ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const language =
      body?.language === "en"
        ? "en"
        : body?.language ===
            "bilingual"
          ? "bilingual"
          : "id";

    const [
      propertyResult,
      profileResult,
    ] =
      await Promise.all([
        admin
          .from("properties")
          .select(
            `
              id,
              kode,
              title,
              title_id,
              province,
              city,
              address,
              property_type,
              bedrooms,
              bathrooms,
              facilities
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
          .maybeSingle(),

        admin
          .from("profiles")
          .select(
            "full_name, agency, phone, email, address"
          )
          .eq(
            "id",
            auth.user.id
          )
          .maybeSingle(),
      ]);

    if (propertyResult.error) {
      throw propertyResult.error;
    }

    if (profileResult.error) {
      throw profileResult.error;
    }

    if (!propertyResult.data) {
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
      propertyResult.data as PropertyRow;

    const profile =
      (
        profileResult.data ||
        {}
      ) as Partial<ProfileRow>;

    const bedrooms =
      safeNumber(
        property.bedrooms
      );

    const bathrooms =
      safeNumber(
        property.bathrooms
      );

    const hasPool =
      detectPoolFromFacilities(
        property.facilities
      );

    const propertyTitle =
      language === "en"
        ? (
            cleanText(
              property.title
            ) ||
            cleanText(
              property.title_id
            )
          )
        : (
            cleanText(
              property.title_id
            ) ||
            cleanText(
              property.title
            )
          );

    const finalPropertyTitle =
      propertyTitle ||
      cleanText(
        property.kode
      ) ||
      "Property";

    const inventory =
      createAgentInventoryData({
        propertyId:
          cleanText(
            property.id
          ),

        propertyCode:
          cleanText(
            property.kode
          ),

        propertyTitle:
          finalPropertyTitle,

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

        bedrooms,
        bathrooms,
        hasPool,

        agentName:
          cleanText(
            profile.full_name
          ),

        agentAgency:
          cleanText(
            profile.agency
          ),

        agentPhone:
          cleanText(
            profile.phone
          ),

        agentEmail:
          cleanText(
            profile.email
          ) ||
          cleanText(
            auth.user.email
          ),

        agentAddress:
          cleanText(
            profile.address
          ),
      });

    const documentTitle =
      `Inventory - ${
        cleanText(
          property.kode
        ) ||
        finalPropertyTitle
      }`;

    const {
      data: createdDocument,
      error: createError,
    } =
      await admin
        .from(
          "agent_documents"
        )
        .insert({
          user_id:
            auth.user.id,

          property_id:
            cleanText(
              property.id
            ),

          document_type:
            "inventory",

          template_key:
            null,

          title:
            documentTitle,

          language,

          status:
            "draft",

          data:
            inventory,

          template_version:
            1,
        })
        .select(
          "id, user_id, property_id, document_type, template_key, title, language, status, data, template_version, generated_at, created_at, updated_at"
        )
        .single();

    if (createError) {
      throw createError;
    }

    return Response.json(
      {
        document:
          createdDocument,

        inventorySummary: {
          propertyId:
            cleanText(
              property.id
            ),

          propertyCode:
            cleanText(
              property.kode
            ),

          bedrooms,
          bathrooms,
          hasPool,

          sections:
            inventory.sections
              .length,
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
      "Create inventory from property error:",
      error
    );

    return Response.json(
      {
        error:
          "Unable to create inventory from property.",
      },
      {
        status: 500,
      }
    );
  }
}
