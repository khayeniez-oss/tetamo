import { createClient } from "@supabase/supabase-js";

import {
  buildProposalLocation,
  cleanProposalText,
  extractEnabledLabels,
  formatProposalIdr,
  proposalNumber,
  type AgentProposalData,
  type AgentProposalLanguage,
  type AgentProposalMode,
  type AgentProposalProperty,
} from "@/lib/agent-proposal";
import { getSiteUrl } from "@/lib/seo-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

function isRetryableProposalAuthError(
  error: unknown
) {
  if (!error) {
    return false;
  }

  const candidate =
    error as {
      message?: unknown;
      name?: unknown;
      status?: unknown;
      code?: unknown;
    };

  const message =
    [
      candidate.name,
      candidate.message,
      candidate.code,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

  const status =
    Number(
      candidate.status ||
        0
    );

  return (
    status >= 500 ||
    message.includes(
      "fetch failed"
    ) ||
    message.includes(
      "timeout"
    ) ||
    message.includes(
      "connecttimeout"
    ) ||
    message.includes(
      "connect timeout"
    ) ||
    message.includes(
      "network"
    ) ||
    message.includes(
      "econnreset"
    ) ||
    message.includes(
      "econnrefused"
    )
  );
}

async function waitBeforeProposalAuthRetry() {
  await new Promise<void>(
    (resolve) => {
      setTimeout(
        resolve,
        700
      );
    }
  );
}

type GenerateProposalRequest = {
  mode?: AgentProposalMode;
  language?: AgentProposalLanguage;
  propertyIds?: string[];
  buyerName?: string;
  buyerCompany?: string;
  introduction?: string;
};

type AgentMembershipRow = {
  id: string;
  status: string | null;
  expires_at: string | null;
};

type PropertyImageRow = {
  image_url: string | null;
  sort_order: number | null;
  is_cover: boolean | null;
};

type PropertyRow = {
  [key: string]: any;
  id: string;
  slug: string | null;
  kode: string | null;
  user_id: string | null;

  title: string | null;
  description: string | null;

  price: number | null;
  sale_price: number | null;
  rent_price: number | null;

  province: string | null;
  city: string | null;
  area: string | null;
  address: string | null;

  listing_type: string | null;
  rental_type: string | null;
  sale_type: string | null;
  property_type: string | null;

  building_size: number | null;
  land_size: number | null;
  land_unit: string | null;

  bedrooms: number | null;
  bathrooms: number | null;

  furnishing: string | null;
  certificate: string | null;

  facilities: Record<string, unknown> | null;
  nearby: Record<string, unknown> | null;

  road_access: string | null;
  ownership_type: string | null;
  land_type: string | null;
  zoning_type: string | null;

  source: string | null;
  status: string | null;

  property_images: PropertyImageRow[] | null;
};

function getBearerToken(
  request: Request
) {
  const authHeader =
    request.headers.get(
      "authorization"
    ) || "";

  if (
    !authHeader
      .toLowerCase()
      .startsWith("bearer ")
  ) {
    return "";
  }

  return authHeader
    .slice(7)
    .trim();
}

function isMembershipActive(
  membership:
    | AgentMembershipRow
    | null
) {
  if (!membership) {
    return false;
  }

  if (
    membership.status !==
    "active"
  ) {
    return false;
  }

  if (
    !membership.expires_at
  ) {
    return true;
  }

  const expiresAt =
    new Date(
      membership.expires_at
    );

  if (
    Number.isNaN(
      expiresAt.getTime()
    )
  ) {
    return true;
  }

  return (
    expiresAt.getTime() >=
    Date.now()
  );
}

function normalizeMode(
  value: unknown
): AgentProposalMode {
  return value === "portfolio"
    ? "portfolio"
    : "single";
}

function normalizeLanguage(
  value: unknown
): AgentProposalLanguage {
  return value === "en"
    ? "en"
    : "id";
}

function normalizePropertyIds(
  value: unknown
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) =>
          cleanProposalText(
            item
          )
        )
        .filter(Boolean)
    )
  );
}

function sortPropertyImages(
  images:
    | PropertyImageRow[]
    | null
    | undefined
) {
  return [...(images || [])]
    .filter((item) =>
      Boolean(
        cleanProposalText(
          item.image_url
        )
      )
    )
    .sort((a, b) => {
      if (
        Boolean(a.is_cover) !==
        Boolean(b.is_cover)
      ) {
        return a.is_cover
          ? -1
          : 1;
      }

      return (
        Number(
          a.sort_order || 0
        ) -
        Number(
          b.sort_order || 0
        )
      );
    })
    .map((item) =>
      cleanProposalText(
        item.image_url
      )
    )
    .filter(
      (url, index, all) =>
        Boolean(url) &&
        all.indexOf(url) === index
    );
}

function getPropertyPriceText(
  row: PropertyRow
) {
  const listingType =
    cleanProposalText(
      row.listing_type
    ).toLowerCase();

  const salePrice =
    proposalNumber(
      row.sale_price
    );

  const rentPrice =
    proposalNumber(
      row.rent_price
    );

  const generalPrice =
    proposalNumber(
      row.price
    );

  if (
    listingType ===
      "dijual_disewa" &&
    salePrice &&
    rentPrice
  ) {
    return `${formatProposalIdr(
      salePrice
    )} Jual / ${formatProposalIdr(
      rentPrice
    )} Sewa`;
  }

  if (
    listingType ===
    "disewa"
  ) {
    return formatProposalIdr(
      rentPrice ||
        generalPrice
    );
  }

  return formatProposalIdr(
    salePrice ||
      generalPrice ||
      rentPrice
  );
}

function firstNumber(
  ...values: unknown[]
) {
  for (
    const value of values
  ) {
    const parsed =
      proposalNumber(value);

    if (
      parsed !== null
    ) {
      return parsed;
    }
  }

  return null;
}

function firstText(
  ...values: unknown[]
) {
  for (
    const value of values
  ) {
    const text =
      cleanProposalText(
        value
      );

    if (text) {
      return text;
    }
  }

  return "";
}

function mapProperty(
  row: PropertyRow,
  siteUrl: string,
  language: AgentProposalLanguage
): AgentProposalProperty {
  const routeValue =
    cleanProposalText(
      row.slug
    ) ||
    row.id;

  return {
    id: row.id,
    slug:
      cleanProposalText(
        row.slug
      ),
    kode:
      cleanProposalText(
        row.kode
      ),

    title:
      language === "id"
        ? cleanProposalText(
            row.title_id ||
              row.title
          ) || "Properti"
        : cleanProposalText(
            row.title ||
              row.title_id
          ) || "Property",

    description:
      language === "id"
        ? cleanProposalText(
            row.description_id ||
              row.description
          )
        : cleanProposalText(
            row.description_en ||
              row.description
          ),

    priceText:
      getPropertyPriceText(
        row
      ),
    listingType:
      cleanProposalText(
        row.listing_type
      ),
    rentalType:
      cleanProposalText(
        row.rental_type
      ),
    saleType:
      cleanProposalText(
        row.sale_type
      ),
    propertyType:
      cleanProposalText(
        row.property_type
      ),

    location:
      buildProposalLocation(
        row.area,
        row.city,
        row.province
      ),
    address:
      cleanProposalText(
        row.address
      ),

    bedrooms:
      firstNumber(
        row.bedrooms,
        row.bed
      ),
    bathrooms:
      firstNumber(
        row.bathrooms,
        row.bathroom,
        row.bath
      ),
    buildingSize:
      firstNumber(
        row.building_size,
        row.lb
      ),
    landSize:
      firstNumber(
        row.land_size,
        row.lt
      ),
    landUnit:
      firstText(
        row.land_unit,
        row.lt_unit,
        "m²"
      ),

    floors:
      firstNumber(
        row.floors,
        row.floor,
        row.floor_count
      ),
    parking:
      firstNumber(
        row.parking_spaces,
        row.parking,
        row.garage_count,
        row.carport_count
      ),

    furnishing:
      firstText(
        row.furnishing,
        row.furnished
      ),
    certificate:
      firstText(
        row.certificate,
        row.sertifikat
      ),
    roadAccess:
      firstText(
        row.road_access,
        row.akses_jalan
      ),
    ownershipType:
      firstText(
        row.ownership_type,
        row.jenis_kepemilikan,
        row.ownership
      ),
    landType:
      firstText(
        row.land_type,
        row.jenis_tanah
      ),
    zoningType:
      firstText(
        row.zoning_type,
        row.jenis_zoning,
        row.zoning
      ),

    electricity:
      firstText(
        row.electricity,
        row.listrik,
        row.power_capacity
      ),
    water:
      firstText(
        row.water_source,
        row.water,
        row.air,
        row.jenis_air
      ),

    facilities:
      extractEnabledLabels(
        row.facilities
      ),
    nearby:
      extractEnabledLabels(
        row.nearby
      ),

    images:
      sortPropertyImages(
        row.property_images
      ),

    publicUrl:
      `${siteUrl}/properti/${encodeURIComponent(
        routeValue
      )}`,
  };
}

export async function loadAgentProposalData(
  request: Request
) {
  try {
    if (
      !process.env
        .NEXT_PUBLIC_SUPABASE_URL ||
      !process.env
        .SUPABASE_SERVICE_ROLE_KEY
    ) {
      return Response.json(
        {
          error:
            "Supabase server environment variables are missing.",
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
            "Unauthorized. Login is required.",
        },
        {
          status: 401,
        }
      );
    }

    let authResult:
      | Awaited<
          ReturnType<
            typeof supabaseAdmin.auth.getUser
          >
        >
      | null = null;

    try {
      authResult =
        await supabaseAdmin.auth
          .getUser(token);

      if (
        isRetryableProposalAuthError(
          authResult.error
        )
      ) {
        console.warn(
          "Proposal auth verification temporarily failed. Retrying once:",
          authResult.error
        );

        await waitBeforeProposalAuthRetry();

        authResult =
          await supabaseAdmin.auth
            .getUser(token);
      }
    } catch (error) {
      console.error(
        "Proposal auth verification transport error:",
        error
      );

      return Response.json(
        {
          error:
            "Unable to verify your session because the authentication service could not be reached. Please try again.",
        },
        {
          status: 503,
        }
      );
    }

    const {
      data: {
        user,
      },
      error: userError,
    } = authResult;

    if (
      isRetryableProposalAuthError(
        userError
      )
    ) {
      console.error(
        "Proposal auth verification unavailable after retry:",
        userError
      );

      return Response.json(
        {
          error:
            "Unable to verify your session because the authentication service is temporarily unavailable. Please try again.",
        },
        {
          status: 503,
        }
      );
    }

    if (
      userError ||
      !user
    ) {
      return Response.json(
        {
          error:
            "Unauthorized. Invalid session.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data: profile,
      error: profileError,
    } =
      await supabaseAdmin
        .from("profiles")
        .select(
          "id, full_name, role, phone, agency, photo_url, email, address, instagram_url, facebook_url, tiktok_url, youtube_url, linkedin_url"
        )
        .eq(
          "id",
          user.id
        )
        .maybeSingle();

    if (profileError) {
      console.error(
        "Proposal profile load error:",
        profileError
      );

      return Response.json(
        {
          error:
            "Unable to verify agent profile.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      cleanProposalText(
        (profile as any)
          ?.role
      ).toLowerCase() !==
      "agent"
    ) {
      return Response.json(
        {
          error:
            "Forbidden. Agent access is required.",
        },
        {
          status: 403,
        }
      );
    }

    const {
      data:
        membershipRows,
      error:
        membershipError,
    } =
      await supabaseAdmin
        .from(
          "agent_memberships"
        )
        .select(
          "id, status, expires_at"
        )
        .eq(
          "user_id",
          user.id
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

    if (
      membershipError
    ) {
      console.error(
        "Proposal membership load error:",
        membershipError
      );

      return Response.json(
        {
          error:
            "Unable to verify agent membership.",
        },
        {
          status: 500,
        }
      );
    }

    const activeMembership =
      (
        (
          membershipRows ||
          []
        ) as AgentMembershipRow[]
      ).find(
        isMembershipActive
      ) || null;

    if (
      !activeMembership
    ) {
      return Response.json(
        {
          error:
            "Active agent membership is required.",
        },
        {
          status: 403,
        }
      );
    }

    let body:
      GenerateProposalRequest;

    try {
      body =
        (await request.json()) as GenerateProposalRequest;
    } catch {
      return Response.json(
        {
          error:
            "Invalid request body.",
        },
        {
          status: 400,
        }
      );
    }

    const mode =
      normalizeMode(
        body.mode
      );

    const language =
      normalizeLanguage(
        body.language
      );

    const propertyIds =
      normalizePropertyIds(
        body.propertyIds
      );

    if (
      propertyIds.length === 0
    ) {
      return Response.json(
        {
          error:
            "Select at least one property.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      mode === "single" &&
      propertyIds.length !== 1
    ) {
      return Response.json(
        {
          error:
            "Single Property Proposal requires exactly one property.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data:
        propertyRows,
      error:
        propertiesError,
    } =
      await supabaseAdmin
        .from("properties")
        .select(
          `
            *,
            property_images (
              image_url,
              sort_order,
              is_cover
            )
          `
        )
        .in(
          "id",
          propertyIds
        )
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "source",
          "agent"
        )
        .neq(
          "status",
          "rejected"
        );

    if (
      propertiesError
    ) {
      console.error(
        "Proposal properties load error:",
        propertiesError
      );

      return Response.json(
        {
          error:
            "Unable to load selected properties.",
        },
        {
          status: 500,
        }
      );
    }

    const loadedRows =
      (
        propertyRows ||
        []
      ) as PropertyRow[];

    const loadedMap =
      new Map(
        loadedRows.map(
          (row) => [
            row.id,
            row,
          ]
        )
      );

    const orderedRows =
      propertyIds
        .map((id) =>
          loadedMap.get(id)
        )
        .filter(
          (
            row
          ): row is PropertyRow =>
            Boolean(row)
        );

    if (
      orderedRows.length !==
      propertyIds.length
    ) {
      return Response.json(
        {
          error:
            "One or more selected listings were not found or do not belong to this agent.",
        },
        {
          status: 403,
        }
      );
    }

    const siteUrl =
      getSiteUrl()
        .replace(
          /\/+$/,
          ""
        );

    const proposalData:
      AgentProposalData = {
      mode,
      language,

      buyerName:
        cleanProposalText(
          body.buyerName
        ),
      buyerCompany:
        cleanProposalText(
          body.buyerCompany
        ),
      introduction:
        cleanProposalText(
          body.introduction
        ),

      createdAt:
        new Date()
          .toISOString(),

      agent: {
        id: user.id,
        fullName:
          cleanProposalText(
            (profile as any)
              ?.full_name
          ),
        agency:
          cleanProposalText(
            (profile as any)
              ?.agency
          ),
        phone:
          cleanProposalText(
            (profile as any)
              ?.phone
          ),
        email:
          cleanProposalText(
            (profile as any)
              ?.email ||
              user.email
          ),
        photoUrl:
          cleanProposalText(
            (profile as any)
              ?.photo_url
          ),
        address:
          cleanProposalText(
            (profile as any)
              ?.address
          ),
        instagramUrl:
          cleanProposalText(
            (profile as any)
              ?.instagram_url
          ),
        facebookUrl:
          cleanProposalText(
            (profile as any)
              ?.facebook_url
          ),
        tiktokUrl:
          cleanProposalText(
            (profile as any)
              ?.tiktok_url
          ),
        youtubeUrl:
          cleanProposalText(
            (profile as any)
              ?.youtube_url
          ),
        linkedinUrl:
          cleanProposalText(
            (profile as any)
              ?.linkedin_url
          ),
      },

      properties:
        orderedRows.map(
          (row) =>
            mapProperty(
              row,
              siteUrl,
              language
            )
        ),
    };

    return {
      proposalData,
      mode,
    };
  } catch (error) {
    console.error(
      "Agent proposal data load error:",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Proposal could not be generated.",
      },
      {
        status: 500,
      }
    );
  }
}
