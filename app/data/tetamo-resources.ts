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
  listing_tutorial: {
    id: "listing_tutorial",
    name: "Tetamo Listing Tutorial",
    url: "https://www.tetamo.com/blog/how-to-list-my-property-in-tetamo",
    audience: ["agent", "owner"] as TetamoResourceAudience[],
    status: "live",
    purpose:
      "Official step-by-step Tetamo resource for Agents and Property Owners who want guidance on creating a property listing.",
  },
} satisfies Record<string, TetamoResource>;
