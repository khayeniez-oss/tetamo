export type MonaV2Language =
  | "id"
  | "en"
  | "mixed"
  | "unknown";

export type MonaV2Intent =
  | "greeting"
  | "acknowledgement"
  | "language_switch"
  | "mona_identity"
  | "small_talk"
  | "tetamo_info"
  | "tetamo_pricing"
  | "tetamo_listing"
  | "tetamo_membership"
  | "tetamo_payment_general"
  | "account_payment_check"
  | "property_search"
  | "property_education"
  | "buyer_support"
  | "seller_support"
  | "agent_support"
  | "legal_tax_sensitive"
  | "verification_issue"
  | "refund"
  | "complaint"
  | "human_support"
  | "unsubscribe"
  | "automatic_reply"
  | "abuse"
  | "unsupported_media"
  | "unknown";

export type MonaV2CustomerRole =
  | "owner"
  | "agent"
  | "buyer"
  | "renter"
  | "investor"
  | "general"
  | "unknown";

export type MonaV2Emotion =
  | "neutral"
  | "friendly"
  | "interested"
  | "confused"
  | "hesitant"
  | "frustrated"
  | "angry"
  | "urgent"
  | "distressed"
  | "unknown";

export type MonaV2RiskLevel =
  | "low"
  | "medium"
  | "high";

export type MonaV2KnowledgeRoute =
  | "natural_conversation"
  | "tetamo_official"
  | "property_education"
  | "tetamo_system_tool"
  | "admin_handover"
  | "none";

export type MonaV2Action =
  | "reply"
  | "clarify"
  | "use_tool"
  | "handover"
  | "ignore";

export type MonaV2SalesOpportunity =
  | "none"
  | "soft"
  | "relevant";

export type MonaV2Analysis = {
  language: MonaV2Language;

  preferredReplyLanguage: "id" | "en";

  intent: MonaV2Intent;

  customerRole: MonaV2CustomerRole;

  emotion: MonaV2Emotion;

  riskLevel: MonaV2RiskLevel;

  knowledgeRoute: MonaV2KnowledgeRoute;

  action: MonaV2Action;

  salesOpportunity: MonaV2SalesOpportunity;

  confidence: number;

  needsClarification: boolean;

  requiresAccountData: boolean;

  requiresHumanReview: boolean;

  shouldSaveKnowledgeCandidate: boolean;

  reason: string;
};

export type MonaV2ConversationContext = {
  recentMessages?: string | null;

  preferredLanguage?: "id" | "en" | null;

  knownCustomerRole?: MonaV2CustomerRole | null;

  currentTopic?: string | null;

  unresolvedIssue?: string | null;

  campaignContext?: string | null;
};

export type MonaV2AnalyseInput = {
  customerMessage: string;

  messageType?: string | null;

  conversationContext?: MonaV2ConversationContext | null;
};

export type MonaV2Decision = {
  analysis: MonaV2Analysis;

  shouldSearchTetamoKnowledge: boolean;

  shouldSearchPropertyKnowledge: boolean;

  shouldGenerateNaturalReply: boolean;

  shouldUseTetamoTool: boolean;

  shouldPauseForAdmin: boolean;

  shouldIgnore: boolean;
};
