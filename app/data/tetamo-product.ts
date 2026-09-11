export type TetamoProductAudience =
  | "agent"
  | "owner"
  | "buyer_renter"
  | "developer"
  | "all";

export type TetamoProductFeatureStatus =
  | "live"
  | "coming_soon"
  | "planned"
  | "retired"
  | "internal_only"
  | "not_offered";

export type TetamoProductFeature = {
  id: string;
  name: string;
  audience: TetamoProductAudience[];
  status: TetamoProductFeatureStatus;
  category: string;
  priority: number;
  summary: string;
  customerValue: string;
  facts: string[];
  aliases: string[];
};

export const TETAMO_PRODUCT_FEATURES: TetamoProductFeature[] = [
  {
    id: "tetamo_partner",
    name: "Tetamo Partner",
    audience: ["agent", "owner", "developer"],
    status: "live",
    category: "partner_app",
    priority: 100,
    summary:
      "Tetamo Partner is the mobile app for property partners to create and manage property activity.",
    customerValue:
      "Gives agents and owners a dedicated working app for listing and day-to-day property workflows.",
    facts: [
      "Tetamo Partner is live on iOS and Android.",
      "Tetamo Partner is designed for property agents, property owners, developers, and other property partners.",
      "For an Agent or Owner who asks how to list, Mona should make Tetamo Partner the primary self-service route and tell them to download/open Tetamo Partner on iOS or Android.",
      "Tetamo Partner is separate from the Tetamo Marketplace app used for property discovery and browsing.",
    ],
    aliases: [
      "tetamo partner",
      "partner app",
      "app agent",
      "app owner",
      "aplikasi agent",
      "aplikasi owner",
      "ios",
      "android",
      "app store",
      "google play",
    ],
  },
  {
    id: "listing_management",
    name: "Listing Management",
    audience: ["agent", "owner"],
    status: "live",
    category: "listing",
    priority: 96,
    summary:
      "Create, edit, review, and manage property listings through Tetamo Partner and supported Tetamo partner workflows.",
    customerValue:
      "Lets property partners keep their listings current without relying on Tetamo staff to upload or edit for them.",
    facts: [
      "Agents can create property listings.",
      "Agents can edit and manage their existing property listings.",
      "Owners can create property listings for their own property.",
      "Owners can edit and manage their existing property listings.",
      "Listing creation is self-service; Tetamo/Mona does not create or upload the listing on the customer's behalf.",
    ],
    aliases: [
      "create listing",
      "edit listing",
      "manage listing",
      "buat listing",
      "pasang listing",
      "ubah listing",
      "edit iklan",
      "kelola listing",
      "upload property",
    ],
  },
  {
    id: "direct_whatsapp",
    name: "Direct WhatsApp Enquiry",
    audience: ["agent", "owner"],
    status: "live",
    category: "enquiry",
    priority: 94,
    summary:
      "Interested buyers or renters can contact the relevant listing contact directly through WhatsApp from a property listing.",
    customerValue:
      "Reduces friction between property discovery and direct customer conversation.",
    facts: [
      "Tetamo supports direct WhatsApp enquiries from published property listings.",
      "Buyers and renters can WhatsApp the relevant agent or owner directly from the property listing where direct WhatsApp is available.",
    ],
    aliases: [
      "whatsapp direct",
      "direct whatsapp",
      "wa langsung",
      "langsung whatsapp",
      "inquiry whatsapp",
      "enquiry whatsapp",
    ],
  },
  {
    id: "viewing_schedule",
    name: "Jadwal Viewing",
    audience: ["agent", "owner"],
    status: "live",
    category: "lead_workflow",
    priority: 92,
    summary:
      "Manage or receive property viewing requests and viewing schedules through supported Tetamo workflows.",
    customerValue:
      "Helps move a property enquiry toward a real property viewing in an organised way.",
    facts: [
      "Tetamo supports property viewing scheduling where available.",
      "Agents can manage property viewing schedules.",
      "Owners can receive or manage viewing requests where the viewing workflow is available.",
    ],
    aliases: [
      "jadwal viewing",
      "viewing schedule",
      "schedule viewing",
      "booking viewing",
      "atur viewing",
      "jadwal lihat property",
    ],
  },
  {
    id: "leads_dashboard",
    name: "Leads Dashboard",
    audience: ["agent", "owner"],
    status: "live",
    category: "lead_workflow",
    priority: 88,
    summary:
      "Tetamo can record property enquiries and matched buyer/renter information as leads for the relevant property partner.",
    customerValue:
      "Helps agents and owners organise enquiry and buyer/renter follow-up instead of relying only on scattered messages.",
    facts: [
      "Agents can receive and manage property leads related to their listings.",
      "Relevant matched buyer lead information may be available through the Leads page or dashboard.",
      "Owners can receive property enquiries and leads related to their listings.",
    ],
    aliases: [
      "leads dashboard",
      "lead dashboard",
      "leads",
      "buyer leads",
      "manage leads",
      "kelola lead",
    ],
  },
  {
    id: "proposal_portfolio",
    name: "Proposal & Portfolio",
    audience: ["agent"],
    status: "live",
    category: "agent_tools",
    priority: 98,
    summary:
      "Agents can create and print a property proposal or portfolio using a single property or multiple properties.",
    customerValue:
      "Helps agents prepare property selections for clients faster and present suitable properties more professionally.",
    facts: [
      "Proposal & Portfolio is a live Tetamo Agent Tool.",
      "An agent can create a proposal or portfolio using one property.",
      "An agent can create a proposal or portfolio using multiple properties.",
      "The proposal or portfolio can be prepared for printing for a client.",
      "Do not claim Proposal & Portfolio includes e-signature, legal execution, automatic client delivery, or notarisation unless those capabilities are separately approved later.",
    ],
    aliases: [
      "proposal",
      "portfolio",
      "proposal portfolio",
      "property proposal",
      "property portfolio",
      "print proposal",
      "print portfolio",
      "proposal client",
      "portfolio client",
    ],
  },
  {
    id: "generate_ai",
    name: "Generate AI",
    audience: ["agent", "owner"],
    status: "live",
    category: "creation_tools",
    priority: 82,
    summary:
      "Generate AI helps create property listing titles and descriptions from listing information.",
    customerValue:
      "Reduces the time needed to prepare listing copy.",
    facts: [
      "Agents can use Generate AI to help create listing titles and property descriptions.",
      "Owners can use Generate AI to help create listing titles and property descriptions.",
      "Agent workflows may also support additional marketing-content generation where explicitly available.",
    ],
    aliases: [
      "generate ai",
      "ai title",
      "ai description",
      "judul ai",
      "deskripsi ai",
      "buat judul",
      "buat deskripsi",
    ],
  },
  {
    id: "agent_profile",
    name: "Agent Profile",
    audience: ["agent"],
    status: "live",
    category: "agent_brand",
    priority: 72,
    summary:
      "Agents can maintain professional profile information and supported social or agency information in Tetamo.",
    customerValue:
      "Helps agents maintain a professional presence alongside their property listings.",
    facts: [
      "Agents can manage Tetamo profile and professional information.",
      "Agents can add supported agency information and social-media links to their profile.",
    ],
    aliases: [
      "agent profile",
      "profil agent",
      "profile agent",
      "profil profesional",
      "agent website",
    ],
  },
  {
    id: "commission_tracking",
    name: "Commission Tracking",
    audience: ["agent"],
    status: "live",
    category: "agent_tools",
    priority: 65,
    summary:
      "Agents can manually record and track commission information inside Tetamo.",
    customerValue:
      "Gives agents a simple place to track commission records connected to their property work.",
    facts: [
      "Agents can manually record and track commission information inside Tetamo.",
      "Commission records are tracking records only; commission payments are currently handled outside Tetamo.",
    ],
    aliases: [
      "commission tracking",
      "komisi",
      "track commission",
      "catat komisi",
    ],
  },
  {
    id: "visibility_tools",
    name: "Visibility Tools",
    audience: ["agent", "owner"],
    status: "live",
    category: "visibility",
    priority: 70,
    summary:
      "Tetamo provides applicable property visibility options such as Featured, Boost, and Homepage Spotlight.",
    customerValue:
      "Provides optional ways to increase placement or visibility within Tetamo where the selected product supports it.",
    facts: [
      "Tetamo supports Featured, Boost Listing, and Homepage Spotlight where applicable.",
      "Availability, duration, price, and included benefits depend on the applicable package or product.",
      "Visibility tools do not guarantee enquiries, leads, sales, rentals, or closing.",
    ],
    aliases: [
      "featured",
      "boost",
      "spotlight",
      "visibility",
      "exposure",
      "promosi listing",
    ],
  },
  {
    id: "inventory_handover",
    name: "Inventory & Handover",
    audience: ["agent"],
    status: "live",
    category: "agent_documents",
    priority: 97,
    summary:
      "Agents can create a professional property inventory checklist and handover report from a Tetamo listing.",
    customerValue:
      "Helps agents document property condition, inventory items and handover information professionally.",
    facts: [
      "Inventory & Handover is live in Tetamo.",
      "Agents can create it from a Tetamo property listing.",
      "Agents can record inventory condition and handover information.",
      "Agents can generate a PDF for professional use.",
      "It is available through the Tetamo website and Tetamo Partner.",
      "All agents can explore the tool, while creating, saving, full preview and professional output generation require Gold or Agent Pro.",
    ],
    aliases: [
      "inventory & handover",
      "inventory and handover",
      "inventory handover",
      "inventory checklist",
      "property inventory",
      "handover report",
      "serah terima properti",
      "inventory ready",
    ],
  },
  {
    id: "letters_documents",
    name: "Letters & Documents",
    audience: ["agent"],
    status: "live",
    category: "agent_documents",
    priority: 96,
    summary:
      "Agents can create professional property letters and documents for common real-estate workflows.",
    customerValue:
      "Helps agents prepare frequently used property documents more efficiently.",
    facts: [
      "Letters & Documents is live in Tetamo.",
      "LOI is available inside Letters & Documents.",
      "It also includes rental offers, purchase offers, authorization, appointment and co-broking documents.",
      "It includes tenancy notices, viewing confirmations, acknowledgements and key handover documents.",
      "Agents can generate professional document output.",
      "All agents can explore the tool, while creating, saving, full preview and professional output generation require Gold or Agent Pro.",
      "Tetamo does not provide legal advice, legal execution or notarisation through this tool.",
    ],
    aliases: [
      "letters & documents",
      "letters and documents",
      "agent documents",
      "agent letters",
      "loi",
      "letter of intent",
      "editable loi",
      "surat minat",
      "purchase offer",
      "rental offer",
      "appointment letter",
      "authorization letter",
      "co-broking",
      "key handover",
    ],
  },
  {
    id: "rental_agreement",
    name: "Rental Agreement",
    audience: ["agent"],
    status: "live",
    category: "agent_documents",
    priority: 95,
    summary:
      "Agents can create and edit a Rental Agreement from a Tetamo listing and generate a PDF.",
    customerValue:
      "Helps agents prepare rental documentation directly from their property workflow.",
    facts: [
      "Rental Agreement is live in Tetamo.",
      "Agents can create and edit it from a Tetamo listing.",
      "Agents can generate a Rental Agreement PDF.",
      "Inventory & Handover from the same property can be attached when applicable.",
      "It is available through the Tetamo website and Tetamo Partner.",
      "All agents can explore the tool, while creating, saving, full preview and professional output generation require Gold or Agent Pro.",
      "Tetamo does not provide legal advice, legal execution or notarisation through this tool.",
    ],
    aliases: [
      "rental agreement",
      "rent agreement",
      "perjanjian sewa",
      "editable rental agreement",
      "rental contract",
      "kontrak sewa",
    ],
  },
  {
    id: "editable_sale_agreement",
    name: "Sale Agreement",
    audience: ["agent"],
    status: "live",
    category: "agent_documents",
    priority: 94,
    summary:
      "Agents can prepare and edit a Sale Agreement as part of Tetamo Professional Agent Tools.",
    customerValue:
      "Helps agents prepare property sale documentation more efficiently within their Tetamo workflow.",
    facts: [
      "Sale Agreement is live in Tetamo.",
      "Agents can prepare and edit a Sale Agreement.",
      "All agents can explore the tool, while creating, saving, full preview and professional output generation require Gold or Agent Pro.",
      "Tetamo does not provide legal advice, legal execution, notarisation, or guarantee the legal validity of a completed agreement.",
    ],
    aliases: [
      "sale agreement",
      "sales agreement",
      "editable sale agreement",
      "perjanjian jual beli",
      "purchase agreement",
    ],
  },

  {
    id: "notary_solution",
    name: "Notary / Notarisation Service",
    audience: ["agent", "owner"],
    status: "not_offered",
    category: "service_boundary",
    priority: 100,
    summary:
      "Tetamo does not currently offer a notary or notarisation solution.",
    customerValue:
      "This is an explicit product boundary so Mona does not invent a legal/notary service.",
    facts: [
      "Tetamo does not currently provide a notary or notarisation solution.",
      "Tetamo must not claim that documents created or edited in Tetamo are notarised by Tetamo.",
      "Tetamo must not claim it arranges a real notary unless a separate approved service is launched in the future and this registry is updated.",
    ],
    aliases: [
      "notary",
      "notaris",
      "notarise",
      "notarize",
      "notarisation",
      "notarization",
    ],
  },
];

export type MonaCapabilityId =
  | "explain_features"
  | "explain_packages"
  | "recommend_package"
  | "guide_listing"
  | "guide_payment"
  | "send_screenshot"
  | "send_demo"
  | "create_demo_access"
  | "arrange_demo";

export const MONA_CAPABILITIES: Record<MonaCapabilityId, boolean> = {
  explain_features: true,
  explain_packages: true,
  recommend_package: true,
  guide_listing: true,
  guide_payment: true,
  send_screenshot: false,
  send_demo: false,
  create_demo_access: false,
  arrange_demo: false,
};
