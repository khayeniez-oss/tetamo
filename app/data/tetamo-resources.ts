export type TetamoResourceAudience =
  | "agent"
  | "owner"
  | "developer"
  | "buyer_renter"
  | "all";

export type TetamoResource = {
  id: string;
  name: string;
  url: string;
  audience: TetamoResourceAudience[];
  status: "live" | "retired";
  purpose: string;
};

export const TETAMO_RESOURCES = {
  listing_tutorial_agent: {
    id: "listing_tutorial_agent",
    name: "Tetamo Agent Listing Tutorial",
    url: "https://www.tetamo.com/blog/cara-memasang-properti-anda-sebagai-agen-di-tetamo",
    audience: ["agent"] as TetamoResourceAudience[],
    status: "live",
    purpose:
      "Official step-by-step Tetamo resource for Agents who want guidance on creating a property listing.",
  },

  listing_tutorial_owner: {
    id: "listing_tutorial_owner",
    name: "Tetamo Property Owner Listing Tutorial",
    url: "https://www.tetamo.com/blog/how-to-list-my-property-in-tetamo",
    audience: ["owner"] as TetamoResourceAudience[],
    status: "live",
    purpose:
      "Official step-by-step Tetamo resource for Property Owners who want guidance on creating a property listing.",
  },
} satisfies Record<string, TetamoResource>;
