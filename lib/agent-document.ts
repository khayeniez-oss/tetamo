export type AgentDocumentType =
  | "inventory"
  | "rental_agreement"
  | "letter";

export type AgentDocumentLanguage =
  | "id"
  | "en"
  | "bilingual";

export type AgentDocumentStatus =
  | "draft"
  | "ready"
  | "completed";

export type AgentDocumentRecord = {
  id: string;
  user_id: string;
  property_id: string | null;

  document_type: AgentDocumentType;
  template_key: string | null;

  title: string;
  language: AgentDocumentLanguage;
  status: AgentDocumentStatus;

  data: Record<string, unknown>;

  template_version: number;
  generated_at: string | null;

  created_at: string;
  updated_at: string;
};

export type AgentDocumentCreateInput = {
  propertyId?: string | null;

  documentType: AgentDocumentType;
  templateKey?: string | null;

  title?: string;
  language?: AgentDocumentLanguage;
  status?: AgentDocumentStatus;

  data?: Record<string, unknown>;
};

export type AgentDocumentUpdateInput = {
  propertyId?: string | null;
  templateKey?: string | null;

  title?: string;
  language?: AgentDocumentLanguage;
  status?: AgentDocumentStatus;

  data?: Record<string, unknown>;
};

export const AGENT_DOCUMENT_TYPES: AgentDocumentType[] = [
  "inventory",
  "rental_agreement",
  "letter",
];

export const AGENT_DOCUMENT_LANGUAGES: AgentDocumentLanguage[] = [
  "id",
  "en",
  "bilingual",
];

export const AGENT_DOCUMENT_STATUSES: AgentDocumentStatus[] = [
  "draft",
  "ready",
  "completed",
];

export function isAgentDocumentType(
  value: unknown
): value is AgentDocumentType {
  return AGENT_DOCUMENT_TYPES.includes(
    value as AgentDocumentType
  );
}

export function isAgentDocumentLanguage(
  value: unknown
): value is AgentDocumentLanguage {
  return AGENT_DOCUMENT_LANGUAGES.includes(
    value as AgentDocumentLanguage
  );
}

export function isAgentDocumentStatus(
  value: unknown
): value is AgentDocumentStatus {
  return AGENT_DOCUMENT_STATUSES.includes(
    value as AgentDocumentStatus
  );
}

export function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}
