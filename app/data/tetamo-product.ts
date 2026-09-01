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
    id: "inventory_ready",
    name: "Inventory Ready",
    audience: ["agent"],
    status: "coming_soon",
    category: "agent_tools",
    priority: 86,
    summary:
      "Inventory Ready is being prepared to help agents conveniently choose available property inventory for client needs.",
    customerValue:
      "Aims to make it faster for agents to find and select suitable ready inventory for clients.",
    facts: [
      "Inventory Ready is coming soon and is not yet a live Tetamo feature.",
      "The planned purpose is to help agents conveniently choose available property inventory.",
      "Mona must always label Inventory Ready as coming soon until its status is changed to live in this registry.",
    ],
    aliases: [
      "inventory ready",
      "ready inventory",
      "inventory property",
      "stok property",
      "stok properti",
    ],
  },
  {
    id: "editable_loi",
    name: "Editable LOI",
    audience: ["agent"],
    status: "coming_soon",
    category: "agent_documents",
    priority: 78,
    summary:
      "An editable Letter of Intent template is being prepared as part of future Tetamo Agent Tools.",
    customerValue:
      "Aims to reduce repetitive document preparation for common agent transaction workflows.",
    facts: [
      "Editable LOI is coming soon and is not yet a live Tetamo feature.",
      "The planned tool is an editable working document/template for agent use.",
      "Do not claim Tetamo provides legal advice, legal execution, notarisation, or guarantees legal validity of a completed document.",
    ],
    aliases: [
      "loi",
      "letter of intent",
      "editable loi",
      "surat minat",
    ],
  },
  {
    id: "editable_rental_agreement",
    name: "Editable Rental Agreement",
    audience: ["agent"],
    status: "coming_soon",
    category: "agent_documents",
    priority: 77,
    summary:
      "An editable rental agreement template is being prepared as part of future Tetamo Agent Tools.",
    customerValue:
      "Aims to make common rental-document preparation more convenient for agents.",
    facts: [
      "Editable Rental Agreement is coming soon and is not yet a live Tetamo feature.",
      "The planned tool is an editable working document/template for agent use.",
      "Do not claim Tetamo provides legal advice, legal execution, notarisation, or guarantees legal validity of a completed document.",
    ],
    aliases: [
      "rental agreement",
      "rent agreement",
      "sewa agreement",
      "perjanjian sewa",
      "editable rental agreement",
    ],
  },
  {
    id: "editable_sale_agreement",
    name: "Editable Sale Agreement",
    audience: ["agent"],
    status: "coming_soon",
    category: "agent_documents",
    priority: 76,
    summary:
      "An editable sale agreement template is being prepared as part of future Tetamo Agent Tools.",
    customerValue:
      "Aims to make common sale-document preparation more convenient for agents.",
    facts: [
      "Editable Sale Agreement is coming soon and is not yet a live Tetamo feature.",
      "The planned tool is an editable working document/template for agent use.",
      "Do not claim Tetamo provides legal advice, legal execution, notarisation, or guarantees legal validity of a completed document.",
    ],
    aliases: [
      "sale agreement",
      "sell agreement",
      "sales agreement",
      "perjanjian jual beli",
      "editable sale agreement",
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
