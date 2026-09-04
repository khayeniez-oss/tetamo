export type InventoryCondition =
  | "new"
  | "good"
  | "fair"
  | "damaged"
  | "missing";

export type InventoryItem = {
  id: string;

  name: string;

  included: boolean;

  quantity: number;

  condition:
    | InventoryCondition
    | null;

  notes: string;

  photoUrls: string[];

  custom: boolean;
};

export type InventorySection = {
  id: string;

  name: string;

  type:
    | "living_room"
    | "dining"
    | "kitchen"
    | "bedroom"
    | "bathroom"
    | "laundry"
    | "outdoor"
    | "pool"
    | "keys_access"
    | "other";

  order: number;

  items: InventoryItem[];
};

export type InventoryParty = {
  name: string;
  phone: string;
  email: string;
  address: string;
};

export type InventoryAgent = InventoryParty & {
  agency: string;
};

export type InventoryProperty = {
  id: string | null;

  code: string;

  title: string;

  address: string;

  location: string;

  propertyType: string;

  bedrooms: number | null;

  bathrooms: number | null;

  hasPool: boolean;
};

export type AgentInventoryData = {
  version: 1;

  property: InventoryProperty;

  agent: InventoryAgent;

  owner: InventoryParty;

  tenant: InventoryParty;

  handoverDate: string;

  generalNotes: string;

  sections: InventorySection[];

  acknowledgements: {
    ownerConfirmed: boolean;
    tenantConfirmed: boolean;
    agentConfirmed: boolean;
  };
};

export type CreateInventoryStructureInput = {
  propertyId?: string | null;

  propertyCode?: string;

  propertyTitle?: string;

  address?: string;

  location?: string;

  propertyType?: string;

  bedrooms?: number | null;

  bathrooms?: number | null;

  hasPool?: boolean;

  agentName?: string;
  agentAgency?: string;
  agentPhone?: string;
  agentEmail?: string;
  agentAddress?: string;
};

export const INVENTORY_CONDITIONS: {
  value: InventoryCondition;
  labelId: string;
  labelEn: string;
}[] = [
  {
    value: "new",
    labelId: "Baru",
    labelEn: "New",
  },
  {
    value: "good",
    labelId: "Baik",
    labelEn: "Good",
  },
  {
    value: "fair",
    labelId: "Cukup",
    labelEn: "Fair",
  },
  {
    value: "damaged",
    labelId: "Rusak",
    labelEn: "Damaged",
  },
  {
    value: "missing",
    labelId: "Tidak Ada",
    labelEn: "Missing",
  },
];

function safeCount(
  value: unknown,
  fallback = 0,
  maximum = 20
) {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    return fallback;
  }

  return Math.min(
    Math.floor(parsed),
    maximum
  );
}

function makeId(
  value: string
) {
  return value
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
}

function createItem(
  sectionId: string,
  name: string
): InventoryItem {
  return {
    id:
      `${sectionId}-${makeId(name)}`,

    name,

    included: false,

    quantity: 1,

    condition: null,

    notes: "",

    photoUrls: [],

    custom: false,
  };
}

function createSection(
  id: string,
  name: string,
  type: InventorySection["type"],
  order: number,
  itemNames: string[]
): InventorySection {
  return {
    id,
    name,
    type,
    order,

    items:
      itemNames.map(
        (name) =>
          createItem(
            id,
            name
          )
      ),
  };
}

const LIVING_ROOM_ITEMS = [
  "Sofa",
  "Coffee Table",
  "Side Table",
  "Television",
  "TV Remote",
  "Air Conditioner",
  "AC Remote",
  "Ceiling Fan",
  "Floor Lamp",
  "Curtains",
  "Carpet / Rug",
  "Decorations",
];

const DINING_ITEMS = [
  "Dining Table",
  "Dining Chairs",
  "Pendant Light",
  "Cabinet / Storage",
  "Decorations",
];

const KITCHEN_ITEMS = [
  "Refrigerator",
  "Freezer",
  "Stove / Cooktop",
  "Oven",
  "Microwave",
  "Range Hood",
  "Rice Cooker",
  "Electric Kettle",
  "Water Dispenser",
  "Blender",
  "Toaster",
  "Cookware",
  "Cutlery",
  "Plates / Bowls",
  "Glasses / Cups",
  "Kitchen Utensils",
  "Dining Set",
];

const BEDROOM_ITEMS = [
  "Bed Frame",
  "Mattress",
  "Pillows",
  "Bed Linen",
  "Bedside Tables",
  "Bedside Lamps",
  "Wardrobe",
  "Safe",
  "Television",
  "TV Remote",
  "Air Conditioner",
  "AC Remote",
  "Ceiling Fan",
  "Curtains",
  "Mirror",
];

const BATHROOM_ITEMS = [
  "Shower",
  "Shower Head",
  "Water Heater",
  "Toilet",
  "Wash Basin",
  "Mirror",
  "Bathroom Cabinet",
  "Towel Rack",
  "Towels",
  "Hair Dryer",
  "Exhaust Fan",
];

const LAUNDRY_ITEMS = [
  "Washing Machine",
  "Dryer",
  "Iron",
  "Ironing Board",
  "Laundry Basket",
  "Drying Rack",
];

const OUTDOOR_ITEMS = [
  "Outdoor Table",
  "Outdoor Chairs",
  "Sun Loungers",
  "Outdoor Sofa",
  "Umbrella",
  "Garden Lights",
  "Garden Equipment",
  "Outdoor Fan",
];

const POOL_ITEMS = [
  "Swimming Pool",
  "Pool Pump",
  "Pool Lights",
  "Pool Cleaning Equipment",
  "Pool Towels",
  "Sun Loungers",
];

const KEY_ACCESS_ITEMS = [
  "Main Door Key",
  "Bedroom Keys",
  "Gate Key",
  "Mailbox Key",
  "Remote Gate Control",
  "Access Card",
  "Parking Access",
  "Safe Key",
];

export function createDefaultInventorySections(
  input:
    CreateInventoryStructureInput
): InventorySection[] {
  const sections:
    InventorySection[] = [];

  let order = 1;

  sections.push(
    createSection(
      "living-room",
      "Living Room",
      "living_room",
      order++,
      LIVING_ROOM_ITEMS
    )
  );

  sections.push(
    createSection(
      "dining",
      "Dining Area",
      "dining",
      order++,
      DINING_ITEMS
    )
  );

  sections.push(
    createSection(
      "kitchen",
      "Kitchen",
      "kitchen",
      order++,
      KITCHEN_ITEMS
    )
  );

  const bedrooms =
    safeCount(
      input.bedrooms
    );

  for (
    let bedroom = 1;
    bedroom <= bedrooms;
    bedroom += 1
  ) {
    sections.push(
      createSection(
        `bedroom-${bedroom}`,
        `Bedroom ${bedroom}`,
        "bedroom",
        order++,
        BEDROOM_ITEMS
      )
    );
  }

  const bathrooms =
    safeCount(
      input.bathrooms
    );

  for (
    let bathroom = 1;
    bathroom <= bathrooms;
    bathroom += 1
  ) {
    sections.push(
      createSection(
        `bathroom-${bathroom}`,
        `Bathroom ${bathroom}`,
        "bathroom",
        order++,
        BATHROOM_ITEMS
      )
    );
  }

  sections.push(
    createSection(
      "laundry",
      "Laundry",
      "laundry",
      order++,
      LAUNDRY_ITEMS
    )
  );

  sections.push(
    createSection(
      "outdoor",
      "Outdoor / Garden",
      "outdoor",
      order++,
      OUTDOOR_ITEMS
    )
  );

  if (
    input.hasPool === true
  ) {
    sections.push(
      createSection(
        "pool",
        "Swimming Pool",
        "pool",
        order++,
        POOL_ITEMS
      )
    );
  }

  sections.push(
    createSection(
      "keys-access",
      "Keys & Access",
      "keys_access",
      order++,
      KEY_ACCESS_ITEMS
    )
  );

  return sections;
}

function emptyParty():
  InventoryParty {
  return {
    name: "",
    phone: "",
    email: "",
    address: "",
  };
}

export function createAgentInventoryData(
  input:
    CreateInventoryStructureInput = {}
): AgentInventoryData {
  const bedrooms =
    safeCount(
      input.bedrooms
    );

  const bathrooms =
    safeCount(
      input.bathrooms
    );

  return {
    version: 1,

    property: {
      id:
        input.propertyId ||
        null,

      code:
        String(
          input.propertyCode ||
          ""
        ).trim(),

      title:
        String(
          input.propertyTitle ||
          ""
        ).trim(),

      address:
        String(
          input.address ||
          ""
        ).trim(),

      location:
        String(
          input.location ||
          ""
        ).trim(),

      propertyType:
        String(
          input.propertyType ||
          ""
        ).trim(),

      bedrooms:
        bedrooms > 0
          ? bedrooms
          : null,

      bathrooms:
        bathrooms > 0
          ? bathrooms
          : null,

      hasPool:
        input.hasPool === true,
    },

    agent: {
      name:
        String(
          input.agentName ||
          ""
        ).trim(),

      agency:
        String(
          input.agentAgency ||
          ""
        ).trim(),

      phone:
        String(
          input.agentPhone ||
          ""
        ).trim(),

      email:
        String(
          input.agentEmail ||
          ""
        ).trim(),

      address:
        String(
          input.agentAddress ||
          ""
        ).trim(),
    },

    owner:
      emptyParty(),

    tenant:
      emptyParty(),

    handoverDate: "",

    generalNotes: "",

    sections:
      createDefaultInventorySections(
        {
          ...input,
          bedrooms,
          bathrooms,
        }
      ),

    acknowledgements: {
      ownerConfirmed: false,
      tenantConfirmed: false,
      agentConfirmed: false,
    },
  };
}

export function createCustomInventoryItem(
  sectionId: string,
  name: string
): InventoryItem {
  const cleanName =
    String(name || "")
      .trim();

  return {
    id:
      `${sectionId}-custom-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

    name:
      cleanName ||
      "Custom Item",

    included: true,

    quantity: 1,

    condition: "good",

    notes: "",

    photoUrls: [],

    custom: true,
  };
}

export function countIncludedInventoryItems(
  inventory:
    AgentInventoryData
) {
  return inventory.sections.reduce(
    (
      total,
      section
    ) =>
      total +
      section.items.filter(
        (item) =>
          item.included
      ).length,
    0
  );
}

export function countInventoryIssues(
  inventory:
    AgentInventoryData
) {
  return inventory.sections.reduce(
    (
      total,
      section
    ) =>
      total +
      section.items.filter(
        (item) =>
          item.included &&
          (
            item.condition ===
              "damaged" ||
            item.condition ===
              "missing"
          )
      ).length,
    0
  );
}


function poolTextMatches(
  value: unknown
) {
  const text =
    String(value || "")
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .trim();

  if (!text) {
    return false;
  }

  return (
    text.includes("swimming pool") ||
    text.includes("pool") ||
    text.includes("kolam renang")
  );
}

function facilityEnabled(
  value: unknown
) {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    String(value || "")
      .toLowerCase() === "true"
  );
}

export function detectPoolFromFacilities(
  facilities: unknown
) {
  if (!facilities) {
    return false;
  }

  if (
    typeof facilities === "string"
  ) {
    return poolTextMatches(
      facilities
    );
  }

  if (
    Array.isArray(facilities)
  ) {
    return facilities.some(
      (item) =>
        poolTextMatches(item)
    );
  }

  if (
    typeof facilities !== "object"
  ) {
    return false;
  }

  return Object.entries(
    facilities as Record<
      string,
      unknown
    >
  ).some(
    ([key, value]) => {
      if (
        facilityEnabled(value) &&
        poolTextMatches(key)
      ) {
        return true;
      }

      if (
        typeof value === "string" &&
        poolTextMatches(value)
      ) {
        return true;
      }

      return false;
    }
  );
}
