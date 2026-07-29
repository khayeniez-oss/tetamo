"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

type RecipientStatusFilter =
  | "all"
  | "pending"
  | "sent"
  | "failed"
  | "skipped";

type VariableDefinition = {
  position?: number;
  key?: string;
  label?: string;
  example?: string;
};

type MetaTemplate = {
  id: string;
  template_name: string;
  display_name: string;
  category: string;
  language_code: string;
  meta_status: string;
  quality_status: string;
  body_text: string | null;
  variable_count: number;
  variable_examples:
    | Record<string, unknown>
    | null;
  variable_definitions:
    | VariableDefinition[]
    | null;
  header_type: string | null;
  footer_text: string | null;
  website_button_text:
    | string
    | null;
  website_url: string | null;
  quick_reply_text: string | null;
  buttons: unknown;
  is_active: boolean;
};

type Campaign = {
  id: string;
  name: string;
  template_name: string;
  template_language: string;
  category: string;
  campaign_type: string;
  send_provider?: string | null;
  status: string;
  total_recipients: number;
  total_sent: number;
  total_failed: number;
  total_skipped: number;
  batch_size: number;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  raw_payload?: Record<
    string,
    unknown
  > | null;
  created_at: string;
  updated_at: string;
};

type Recipient = {
  id: string;
  campaign_id: string;
  phone_e164: string;
  customer_name: string | null;
  lead_type: string | null;
  source: string | null;
  variables:
    | Record<string, unknown>
    | null;
  status: string;
  meta_message_id: string | null;
  send_error?: unknown;
  error_type?: string | null;
  error_summary?: string | null;
  sent_at: string | null;
  failed_at: string | null;
  skipped_at: string | null;
  skip_reason: string | null;
  created_at: string;
};

type RecipientCounts = {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  skipped: number;
};

const META_PROVIDER =
  "meta_cloud_api";

const LEAD_TYPES = [
  {
    value: "unknown",
    label: "Unknown",
  },
  {
    value: "owner",
    label: "Owner",
  },
  {
    value: "agent",
    label: "Agent",
  },
  {
    value: "developer",
    label: "Developer",
  },
  {
    value: "buyer",
    label: "Buyer/Renter",
  },
];

const RECIPIENT_FILTERS: {
  value: RecipientStatusFilter;
  label: string;
}[] = [
  {
    value: "all",
    label: "All",
  },
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "sent",
    label: "Sent",
  },
  {
    value: "failed",
    label: "Failed",
  },
  {
    value: "skipped",
    label: "Skipped",
  },
];

const EMPTY_COUNTS: RecipientCounts = {
  total: 0,
  pending: 0,
  sent: 0,
  failed: 0,
  skipped: 0,
};

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function formatDate(
  value?: string | null
) {
  if (!value) {
    return "-";
  }

  try {
    return new Intl.DateTimeFormat(
      "en-ID",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    ).format(new Date(value));
  } catch {
    return "-";
  }
}

function getStatusClass(
  status?: string | null
) {
  const clean = cleanText(
    status
  ).toLowerCase();

  if (
    clean === "sent" ||
    clean === "completed"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (clean === "failed") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (
    clean === "skipped" ||
    clean === "paused"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (clean === "sending") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-700";
}

function getCategoryClass(
  category?: string | null
) {
  if (
    cleanText(category).toLowerCase() ===
    "utility"
  ) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  return "border-violet-200 bg-violet-50 text-violet-700";
}

function StatusBadge({
  status,
}: {
  status?: string | null;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
        status
      )}`}
    >
      {status || "draft"}
    </span>
  );
}

function CategoryBadge({
  category,
}: {
  category?: string | null;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getCategoryClass(
        category
      )}`}
    >
      {category || "marketing"}
    </span>
  );
}

function ProviderBadge() {
  return (
    <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
      Meta Cloud API
    </span>
  );
}

function safeJson(value: unknown) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(
      value,
      null,
      2
    );
  } catch {
    return String(value);
  }
}

function getRecipientErrorText(
  recipient: Recipient
) {
  const status = cleanText(
    recipient.status
  ).toLowerCase();

  if (recipient.error_summary) {
    return recipient.error_summary;
  }

  if (status === "pending") {
    return "Not sent yet.";
  }

  if (status === "skipped") {
    return (
      recipient.skip_reason ||
      "Skipped."
    );
  }

  if (status === "failed") {
    return (
      safeJson(
        recipient.send_error
      ) || "Failed to send."
    );
  }

  return "-";
}

function normalizeVariableDefinitions(
  template: MetaTemplate | null
) {
  if (!template) {
    return [];
  }

  const count = Math.max(
    0,
    Number(
      template.variable_count || 0
    )
  );

  const definitions =
    Array.isArray(
      template.variable_definitions
    )
      ? template.variable_definitions
      : [];

  const result: Required<VariableDefinition>[] =
    [];

  for (
    let position = 1;
    position <= count;
    position += 1
  ) {
    const matching =
      definitions.find(
        (definition) =>
          Number(
            definition?.position
          ) === position
      );

    result.push({
      position,
      key:
        cleanText(matching?.key) ||
        `variable_${position}`,
      label:
        cleanText(matching?.label) ||
        `Variable {{${position}}}`,
      example:
        cleanText(
          matching?.example
        ) || "",
    });
  }

  return result;
}

function templateDisplayName(
  template: MetaTemplate
) {
  return (
    cleanText(
      template.display_name
    ) ||
    template.template_name
  );
}

export default function WhatsAppCampaignsPage() {
  const [
    campaigns,
    setCampaigns,
  ] = useState<Campaign[]>([]);

  const [
    templates,
    setTemplates,
  ] = useState<MetaTemplate[]>([]);

  const [
    selectedCampaign,
    setSelectedCampaign,
  ] = useState<Campaign | null>(
    null
  );

  const [
    recipients,
    setRecipients,
  ] = useState<Recipient[]>([]);

  const [
    recipientCounts,
    setRecipientCounts,
  ] =
    useState<RecipientCounts>(
      EMPTY_COUNTS
    );

  const [
    recipientStatusFilter,
    setRecipientStatusFilter,
  ] =
    useState<RecipientStatusFilter>(
      "all"
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadingCampaign,
    setLoadingCampaign,
  ] = useState(false);

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    sendingBatch,
    setSendingBatch,
  ] = useState(false);

  const [
    deletingCampaign,
    setDeletingCampaign,
  ] = useState(false);

  const [
    actionLoading,
    setActionLoading,
  ] = useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [name, setName] =
    useState("");

  const [
    templateName,
    setTemplateName,
  ] = useState("");

  const [
    leadType,
    setLeadType,
  ] = useState("agent");

  const [
    batchSize,
    setBatchSize,
  ] = useState(100);

  const [
    recipientText,
    setRecipientText,
  ] = useState("");

  const [
    variableValues,
    setVariableValues,
  ] = useState<
    Record<string, string>
  >({});

  const [
    notes,
    setNotes,
  ] = useState("");

  const selectedTemplate =
    useMemo(() => {
      return (
        templates.find(
          (template) =>
            template.template_name ===
            templateName
        ) || null
      );
    }, [templates, templateName]);

  const variableDefinitions =
    useMemo(() => {
      return normalizeVariableDefinitions(
        selectedTemplate
      );
    }, [selectedTemplate]);

  const campaignPending =
    recipientCounts.pending;

  const campaignFailed =
    recipientCounts.failed;

  async function getAccessToken() {
    const {
      data: { session },
    } =
      await supabase.auth.getSession();

    return (
      session?.access_token || ""
    );
  }

  function applyTemplates(
    nextTemplates: MetaTemplate[]
  ) {
    setTemplates(nextTemplates);

    if (
      nextTemplates.length === 0
    ) {
      setTemplateName("");
      setVariableValues({});
      return;
    }

    const currentStillExists =
      nextTemplates.some(
        (template) =>
          template.template_name ===
          templateName
      );

    if (!currentStillExists) {
      const first =
        nextTemplates[0];

      setTemplateName(
        first.template_name
      );

      const definitions =
        normalizeVariableDefinitions(
          first
        );

      const initialValues: Record<
        string,
        string
      > = {};

      for (const definition of definitions) {
        initialValues[
          String(
            definition.position
          )
        ] =
          definition.example || "";
      }

      setVariableValues(
        initialValues
      );
    }
  }

  async function loadCampaigns() {
    try {
      setLoading(true);
      setError("");

      const token =
        await getAccessToken();

      if (!token) {
        setError(
          "Please log in as admin first."
        );
        setCampaigns([]);
        setTemplates([]);
        return;
      }

      const response = await fetch(
        "/api/admin/whatsapp/template-campaigns",
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Failed to load campaigns."
        );
      }

      setCampaigns(
        (result.campaigns ||
          []) as Campaign[]
      );

      applyTemplates(
        (result.templates ||
          []) as MetaTemplate[]
      );
    } catch (loadError: any) {
      console.error(
        "Load campaigns error:",
        loadError
      );

      setError(
        loadError?.message ||
          "Failed to load campaigns."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadCampaign(
    campaignId: string,
    nextFilter =
      recipientStatusFilter
  ) {
    try {
      setLoadingCampaign(true);
      setError("");

      const token =
        await getAccessToken();

      if (!token) {
        setError(
          "Please log in as admin first."
        );
        return;
      }

      const params =
        new URLSearchParams({
          campaignId,
          includeRecipients: "true",
          recipientStatus:
            nextFilter,
        });

      const response = await fetch(
        `/api/admin/whatsapp/template-campaigns?${params.toString()}`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Failed to load campaign."
        );
      }

      setSelectedCampaign(
        (result.campaign ||
          null) as Campaign | null
      );

      setRecipients(
        (result.recipients ||
          []) as Recipient[]
      );

      setRecipientCounts(
        (result.recipientCounts ||
          EMPTY_COUNTS) as RecipientCounts
      );

      if (
        Array.isArray(
          result.templates
        )
      ) {
        applyTemplates(
          result.templates as MetaTemplate[]
        );
      }
    } catch (loadError: any) {
      console.error(
        "Load campaign detail error:",
        loadError
      );

      setError(
        loadError?.message ||
          "Failed to load campaign."
      );
    } finally {
      setLoadingCampaign(false);
    }
  }

  function handleRecipientFilter(
    nextFilter: RecipientStatusFilter
  ) {
    setRecipientStatusFilter(
      nextFilter
    );

    if (selectedCampaign?.id) {
      loadCampaign(
        selectedCampaign.id,
        nextFilter
      );
    }
  }

  function handleTemplateSelect(
    value: string
  ) {
    setTemplateName(value);

    const template =
      templates.find(
        (item) =>
          item.template_name ===
          value
      );

    const definitions =
      normalizeVariableDefinitions(
        template || null
      );

    const nextValues: Record<
      string,
      string
    > = {};

    for (const definition of definitions) {
      nextValues[
        String(definition.position)
      ] =
        definition.example || "";
    }

    setVariableValues(nextValues);
  }

  function setVariableValue(
    position: number,
    value: string
  ) {
    setVariableValues(
      (current) => ({
        ...current,
        [String(position)]: value,
      })
    );
  }

  function buildDefaultVariables() {
    const result: Record<
      string,
      string
    > = {};

    for (const definition of variableDefinitions) {
      const value = cleanText(
        variableValues[
          String(
            definition.position
          )
        ]
      );

      if (value) {
        result[
          String(
            definition.position
          )
        ] = value;
      }
    }

    return result;
  }

  async function createCampaign() {
    try {
      setCreating(true);
      setError("");
      setSuccess("");

      if (!selectedTemplate) {
        throw new Error(
          "Select an approved Meta template."
        );
      }

      if (!name.trim()) {
        throw new Error(
          "Campaign name is required."
        );
      }

      if (
        !recipientText.trim()
      ) {
        throw new Error(
          "Add at least one recipient phone number."
        );
      }

      const defaultVariables =
        buildDefaultVariables();

      const missing =
        variableDefinitions.filter(
          (definition) =>
            !cleanText(
              defaultVariables[
                String(
                  definition.position
                )
              ]
            )
        );

      if (missing.length > 0) {
        throw new Error(
          `Enter ${missing
            .map(
              (item) =>
                item.label
            )
            .join(", ")}.`
        );
      }

      const token =
        await getAccessToken();

      if (!token) {
        setError(
          "Please log in as admin first."
        );
        return;
      }

      const response = await fetch(
        "/api/admin/whatsapp/template-campaigns",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${token}`,
          },
          body: JSON.stringify({
            name,
            templateName:
              selectedTemplate.template_name,
            leadType,
            batchSize,
            recipients:
              recipientText,
            defaultVariables,
            notes,
            sendProvider:
              META_PROVIDER,
          }),
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Failed to create campaign."
        );
      }

      setSuccess(
        `Campaign created with ${
          result.totalRecipients || 0
        } recipient(s) using Meta Cloud API.`
      );

      setName("");
      setRecipientText("");
      setNotes("");
      setRecipientStatusFilter(
        "all"
      );

      await loadCampaigns();

      if (result.campaignId) {
        await loadCampaign(
          result.campaignId,
          "all"
        );
      }
    } catch (createError: any) {
      console.error(
        "Create campaign error:",
        createError
      );

      setError(
        createError?.message ||
          "Failed to create campaign."
      );
    } finally {
      setCreating(false);
    }
  }

  async function processCampaignBatch(
    action:
      | "continue_pending"
      | "retry_failed"
  ) {
    if (!selectedCampaign?.id) {
      return;
    }

    const isRetryFailed =
      action === "retry_failed";

    if (isRetryFailed) {
      const confirmed =
        window.confirm(
          `Retry ${campaignFailed} failed recipient(s)?\n\nThis only retries failed recipients. Sent recipients will not receive the template again.`
        );

      if (!confirmed) {
        return;
      }
    }

    try {
      setSendingBatch(true);
      setError("");
      setSuccess("");

      const token =
        await getAccessToken();

      if (!token) {
        setError(
          "Please log in as admin first."
        );
        return;
      }

      const response = await fetch(
        "/api/admin/whatsapp/template-campaigns",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${token}`,
          },
          body: JSON.stringify({
            action,
            campaignId:
              selectedCampaign.id,
            batchSize,
          }),
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Failed to process campaign batch."
        );
      }

      setSuccess(
        `${
          isRetryFailed
            ? "Failed-recipient retry"
            : "Pending batch"
        } processed through Meta Cloud API: ${
          result.sentThisBatch || 0
        } sent, ${
          result.failedThisBatch || 0
        } failed, ${
          result.skippedThisBatch || 0
        } skipped. Pending left: ${
          result.pendingLeft || 0
        }.`
      );

      await loadCampaigns();

      await loadCampaign(
        selectedCampaign.id,
        recipientStatusFilter
      );
    } catch (sendError: any) {
      console.error(
        "Campaign batch error:",
        sendError
      );

      setError(
        sendError?.message ||
          "Failed to process campaign batch."
      );
    } finally {
      setSendingBatch(false);
    }
  }

  async function updateCampaignStatus(
    action: "pause" | "resume"
  ) {
    if (!selectedCampaign?.id) {
      return;
    }

    try {
      setActionLoading(action);
      setError("");
      setSuccess("");

      const token =
        await getAccessToken();

      if (!token) {
        setError(
          "Please log in as admin first."
        );
        return;
      }

      const response = await fetch(
        "/api/admin/whatsapp/template-campaigns",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${token}`,
          },
          body: JSON.stringify({
            action,
            campaignId:
              selectedCampaign.id,
          }),
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            `Failed to ${action} campaign.`
        );
      }

      setSuccess(
        `Campaign ${
          action === "pause"
            ? "paused"
            : "resumed"
        }.`
      );

      await loadCampaigns();

      await loadCampaign(
        selectedCampaign.id,
        recipientStatusFilter
      );
    } catch (statusError: any) {
      console.error(
        "Campaign status error:",
        statusError
      );

      setError(
        statusError?.message ||
          `Failed to ${action} campaign.`
      );
    } finally {
      setActionLoading("");
    }
  }

  async function deleteSelectedCampaign() {
    if (!selectedCampaign?.id) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete campaign "${selectedCampaign.name}"?\n\nThis deletes its recipients and send logs and cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingCampaign(true);
      setError("");
      setSuccess("");

      const token =
        await getAccessToken();

      if (!token) {
        setError(
          "Please log in as admin first."
        );
        return;
      }

      const response = await fetch(
        "/api/admin/whatsapp/template-campaigns",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${token}`,
          },
          body: JSON.stringify({
            action:
              "delete_campaign",
            campaignId:
              selectedCampaign.id,
          }),
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Failed to delete campaign."
        );
      }

      setSuccess(
        `Campaign "${selectedCampaign.name}" deleted.`
      );

      setSelectedCampaign(null);
      setRecipients([]);
      setRecipientCounts(
        EMPTY_COUNTS
      );

      await loadCampaigns();
    } catch (deleteError: any) {
      console.error(
        "Delete campaign error:",
        deleteError
      );

      setError(
        deleteError?.message ||
          "Failed to delete campaign."
      );
    } finally {
      setDeletingCampaign(false);
    }
  }

  useEffect(() => {
    loadCampaigns();
  }, []);

  return (
    <main className="min-h-screen text-[#1C1C1E]">
      <div className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">
              Meta WhatsApp
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Template Campaigns
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              Create and send campaigns
              using active, approved Meta
              WhatsApp templates stored in
              Tetamo.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              loadCampaigns();

              if (
                selectedCampaign?.id
              ) {
                loadCampaign(
                  selectedCampaign.id,
                  recipientStatusFilter
                );
              }
            }}
            className="rounded-2xl bg-[#1C1C1E] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            Refresh
          </button>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">
              Create Campaign
            </h2>

            <ProviderBadge />
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                Campaign Name
              </label>

              <input
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value
                  )
                }
                placeholder="Example: Agent Membership Invitation"
                className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                Approved Meta Template
              </label>

              <select
                value={templateName}
                onChange={(event) =>
                  handleTemplateSelect(
                    event.target.value
                  )
                }
                disabled={
                  templates.length === 0
                }
                className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] disabled:bg-gray-100"
              >
                {templates.length === 0 ? (
                  <option value="">
                    No active templates
                  </option>
                ) : null}

                {templates.map(
                  (template) => (
                    <option
                      key={template.id}
                      value={
                        template.template_name
                      }
                    >
                      {templateDisplayName(
                        template
                      )}{" "}
                      —{" "}
                      {
                        template.template_name
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            {selectedTemplate ? (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryBadge
                    category={
                      selectedTemplate.category
                    }
                  />

                  <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    {
                      selectedTemplate.meta_status
                    }
                  </span>
                </div>

                <p className="mt-3 break-all text-xs font-semibold text-gray-800">
                  {
                    selectedTemplate.template_name
                  }
                </p>

                <div className="mt-3 space-y-1 text-xs leading-5 text-gray-600">
                  <p>
                    <span className="font-bold text-gray-800">
                      Language:
                    </span>{" "}
                    {
                      selectedTemplate.language_code
                    }
                  </p>

                  <p>
                    <span className="font-bold text-gray-800">
                      Variables:
                    </span>{" "}
                    {selectedTemplate.variable_count ||
                      0}
                  </p>

                  {selectedTemplate.header_type ? (
                    <p>
                      <span className="font-bold text-gray-800">
                        Header:
                      </span>{" "}
                      {
                        selectedTemplate.header_type
                      }
                    </p>
                  ) : null}

                  {selectedTemplate.footer_text ? (
                    <p>
                      <span className="font-bold text-gray-800">
                        Footer:
                      </span>{" "}
                      {
                        selectedTemplate.footer_text
                      }
                    </p>
                  ) : null}

                  {selectedTemplate.website_button_text ? (
                    <p>
                      <span className="font-bold text-gray-800">
                        Website button:
                      </span>{" "}
                      {
                        selectedTemplate.website_button_text
                      }
                    </p>
                  ) : null}

                  {selectedTemplate.quick_reply_text ? (
                    <p>
                      <span className="font-bold text-gray-800">
                        Quick reply:
                      </span>{" "}
                      {
                        selectedTemplate.quick_reply_text
                      }
                    </p>
                  ) : null}
                </div>

                {selectedTemplate.body_text ? (
                  <div className="mt-4 whitespace-pre-wrap rounded-2xl border border-blue-100 bg-white p-3 text-xs leading-5 text-gray-700">
                    {
                      selectedTemplate.body_text
                    }
                  </div>
                ) : null}
              </div>
            ) : null}

            {variableDefinitions.length >
            0 ? (
              <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div>
                  <p className="text-sm font-bold text-gray-800">
                    Template Variables
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    These values will be
                    used for every recipient
                    unless a recipient has
                    their own variable value.
                  </p>
                </div>

                {variableDefinitions.map(
                  (definition) => (
                    <div
                      key={
                        definition.position
                      }
                    >
                      <label className="text-xs font-bold text-gray-700">
                        {
                          definition.label
                        }{" "}
                        <span className="font-normal text-gray-400">
                          {"{{"}
                          {
                            definition.position
                          }
                          {"}}"}
                        </span>
                      </label>

                      <input
                        value={
                          variableValues[
                            String(
                              definition.position
                            )
                          ] || ""
                        }
                        onChange={(
                          event
                        ) =>
                          setVariableValue(
                            definition.position,
                            event.target
                              .value
                          )
                        }
                        placeholder={
                          definition.example ||
                          `Enter value for {{${definition.position}}}`
                        }
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
                      />
                    </div>
                  )
                )}
              </div>
            ) : selectedTemplate ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
                This template has no body
                variables.
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  Lead Type
                </label>

                <select
                  value={leadType}
                  onChange={(event) =>
                    setLeadType(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
                >
                  {LEAD_TYPES.map(
                    (item) => (
                      <option
                        key={item.value}
                        value={item.value}
                      >
                        {item.label}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  Batch Size
                </label>

                <input
                  type="number"
                  value={batchSize}
                  min={1}
                  max={500}
                  onChange={(event) =>
                    setBatchSize(
                      Number(
                        event.target.value
                      )
                    )
                  }
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                Phone Numbers
              </label>

              <textarea
                value={recipientText}
                onChange={(event) =>
                  setRecipientText(
                    event.target.value
                  )
                }
                rows={10}
                placeholder={`Paste one phone number per line:\n628123456789\n08123456789\n+628123456789`}
                className="mt-2 w-full resize-y rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
              />

              <p className="mt-2 text-xs leading-5 text-gray-500">
                Indonesian numbers
                beginning with 08 or 8 are
                converted to country code 62
                by the backend.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                Internal Notes
              </label>

              <textarea
                value={notes}
                onChange={(event) =>
                  setNotes(
                    event.target.value
                  )
                }
                rows={3}
                placeholder="Optional internal campaign notes"
                className="mt-2 w-full resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
              />
            </div>

            <button
              type="button"
              onClick={createCampaign}
              disabled={
                creating ||
                !name.trim() ||
                !templateName ||
                !recipientText.trim() ||
                templates.length === 0
              }
              className="w-full rounded-2xl bg-[#1C1C1E] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {creating
                ? "Creating..."
                : "Create Meta Campaign"}
            </button>
          </div>
        </section>

        <section className="rounded-[28px] border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-4 sm:p-5">
            <h2 className="text-lg font-bold">
              Campaigns
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              View recipients, continue
              pending sends, retry failed
              recipients, pause campaigns
              or delete test campaigns.
            </p>
          </div>

          <div className="grid gap-0 lg:grid-cols-[360px_minmax(0,1fr)]">
            <div className="max-h-[780px] overflow-y-auto border-b border-gray-100 p-3 lg:border-b-0 lg:border-r">
              {loading ? (
                <p className="p-4 text-sm text-gray-500">
                  Loading campaigns...
                </p>
              ) : null}

              {!loading &&
              campaigns.length === 0 ? (
                <p className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                  No campaigns yet.
                </p>
              ) : null}

              <div className="space-y-2">
                {campaigns.map(
                  (campaign) => {
                    const active =
                      selectedCampaign?.id ===
                      campaign.id;

                    const pending =
                      Math.max(
                        Number(
                          campaign.total_recipients ||
                            0
                        ) -
                          Number(
                            campaign.total_sent ||
                              0
                          ) -
                          Number(
                            campaign.total_failed ||
                              0
                          ) -
                          Number(
                            campaign.total_skipped ||
                              0
                          ),
                        0
                      );

                    return (
                      <button
                        key={campaign.id}
                        type="button"
                        onClick={() =>
                          loadCampaign(
                            campaign.id
                          )
                        }
                        className={[
                          "w-full rounded-2xl border p-4 text-left transition",
                          active
                            ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                            : "border-gray-200 bg-white hover:bg-gray-50",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">
                              {
                                campaign.name
                              }
                            </p>

                            <p
                              className={[
                                "mt-1 truncate text-xs",
                                active
                                  ? "text-white/60"
                                  : "text-gray-500",
                              ].join(
                                " "
                              )}
                            >
                              {
                                campaign.template_name
                              }
                            </p>
                          </div>

                          <span
                            className={[
                              "rounded-full px-2 py-1 text-[10px] font-bold",
                              active
                                ? "bg-white/10 text-white"
                                : "bg-gray-100 text-gray-700",
                            ].join(
                              " "
                            )}
                          >
                            {
                              campaign.status
                            }
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className={[
                              "rounded-full px-2 py-1 text-[10px] font-bold",
                              active
                                ? "bg-white/10 text-white"
                                : "bg-blue-50 text-blue-700",
                            ].join(
                              " "
                            )}
                          >
                            Meta Cloud API
                          </span>

                          <span
                            className={[
                              "rounded-full px-2 py-1 text-[10px] font-bold",
                              active
                                ? "bg-white/10 text-white"
                                : "bg-gray-100 text-gray-700",
                            ].join(
                              " "
                            )}
                          >
                            {
                              campaign.category
                            }
                          </span>
                        </div>

                        <div
                          className={[
                            "mt-3 grid grid-cols-2 gap-2 text-xs",
                            active
                              ? "text-white/70"
                              : "text-gray-500",
                          ].join(" ")}
                        >
                          <span>
                            Pending:{" "}
                            {pending}
                          </span>

                          <span>
                            Sent:{" "}
                            {
                              campaign.total_sent
                            }
                          </span>

                          <span>
                            Failed:{" "}
                            {
                              campaign.total_failed
                            }
                          </span>

                          <span>
                            Skipped:{" "}
                            {
                              campaign.total_skipped
                            }
                          </span>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className="min-h-[520px] p-4 sm:p-5">
              {!selectedCampaign ? (
                <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  Select a campaign to
                  manage sending.
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-bold">
                          {
                            selectedCampaign.name
                          }
                        </h3>

                        <StatusBadge
                          status={
                            selectedCampaign.status
                          }
                        />

                        <ProviderBadge />

                        <CategoryBadge
                          category={
                            selectedCampaign.category
                          }
                        />
                      </div>

                      <p className="mt-2 text-sm text-gray-500">
                        Template:{" "}
                        <span className="font-semibold text-gray-700">
                          {
                            selectedCampaign.template_name
                          }
                        </span>
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        Language:{" "}
                        {
                          selectedCampaign.template_language
                        }{" "}
                        · Type:{" "}
                        {
                          selectedCampaign.campaign_type
                        }
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        Created:{" "}
                        {formatDate(
                          selectedCampaign.created_at
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          processCampaignBatch(
                            "continue_pending"
                          )
                        }
                        disabled={
                          sendingBatch ||
                          deletingCampaign ||
                          selectedCampaign.status ===
                            "paused" ||
                          campaignPending <=
                            0
                        }
                        className="rounded-2xl bg-[#1C1C1E] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {sendingBatch
                          ? "Sending..."
                          : "Continue Pending"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          processCampaignBatch(
                            "retry_failed"
                          )
                        }
                        disabled={
                          sendingBatch ||
                          deletingCampaign ||
                          selectedCampaign.status ===
                            "paused" ||
                          campaignFailed <=
                            0
                        }
                        className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {sendingBatch
                          ? "Sending..."
                          : "Retry Failed"}
                      </button>

                      {selectedCampaign.status ===
                      "paused" ? (
                        <button
                          type="button"
                          onClick={() =>
                            updateCampaignStatus(
                              "resume"
                            )
                          }
                          disabled={
                            Boolean(
                              actionLoading
                            ) ||
                            deletingCampaign
                          }
                          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          {actionLoading ===
                          "resume"
                            ? "Saving..."
                            : "Resume"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            updateCampaignStatus(
                              "pause"
                            )
                          }
                          disabled={
                            Boolean(
                              actionLoading
                            ) ||
                            deletingCampaign
                          }
                          className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                        >
                          {actionLoading ===
                          "pause"
                            ? "Saving..."
                            : "Pause"}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={
                          deleteSelectedCampaign
                        }
                        disabled={
                          deletingCampaign ||
                          sendingBatch
                        }
                        className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingCampaign
                          ? "Deleting..."
                          : "Delete Campaign"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
                    {[
                      {
                        label: "Total",
                        value:
                          recipientCounts.total,
                        className:
                          "border-gray-200 bg-gray-50 text-gray-800",
                      },
                      {
                        label: "Pending",
                        value:
                          recipientCounts.pending,
                        className:
                          "border-gray-200 bg-gray-50 text-gray-800",
                      },
                      {
                        label: "Sent",
                        value:
                          recipientCounts.sent,
                        className:
                          "border-emerald-100 bg-emerald-50 text-emerald-700",
                      },
                      {
                        label: "Failed",
                        value:
                          recipientCounts.failed,
                        className:
                          "border-red-100 bg-red-50 text-red-700",
                      },
                      {
                        label: "Skipped",
                        value:
                          recipientCounts.skipped,
                        className:
                          "border-amber-100 bg-amber-50 text-amber-800",
                      },
                    ].map(
                      (item) => (
                        <div
                          key={
                            item.label
                          }
                          className={`rounded-2xl border p-4 ${item.className}`}
                        >
                          <p className="text-xs font-bold uppercase tracking-[0.14em] opacity-70">
                            {item.label}
                          </p>

                          <p className="mt-2 text-2xl font-bold">
                            {item.value}
                          </p>
                        </div>
                      )
                    )}
                  </div>

                  <div className="mt-5 rounded-2xl border border-gray-200">
                    <div className="border-b border-gray-100 px-4 py-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-sm font-bold">
                            Recipients{" "}
                            {loadingCampaign ? (
                              <span className="font-normal text-gray-400">
                                Loading...
                              </span>
                            ) : null}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            Inspect Meta
                            sending status,
                            errors and message
                            IDs.
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {RECIPIENT_FILTERS.map(
                            (item) => (
                              <button
                                key={
                                  item.value
                                }
                                type="button"
                                onClick={() =>
                                  handleRecipientFilter(
                                    item.value
                                  )
                                }
                                className={[
                                  "rounded-full border px-3 py-1.5 text-xs font-semibold",
                                  recipientStatusFilter ===
                                  item.value
                                    ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
                                ].join(
                                  " "
                                )}
                              >
                                {
                                  item.label
                                }
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="max-h-[520px] overflow-auto">
                      <table className="min-w-[1180px] text-left text-sm">
                        <thead className="sticky top-0 bg-gray-50 text-xs uppercase tracking-[0.12em] text-gray-400">
                          <tr>
                            <th className="px-4 py-3">
                              Phone
                            </th>
                            <th className="px-4 py-3">
                              Name
                            </th>
                            <th className="px-4 py-3">
                              Lead
                            </th>
                            <th className="px-4 py-3">
                              Status
                            </th>
                            <th className="px-4 py-3">
                              Error / Reason
                            </th>
                            <th className="px-4 py-3">
                              Meta Message ID
                            </th>
                            <th className="px-4 py-3">
                              Sent At
                            </th>
                            <th className="px-4 py-3">
                              Failed At
                            </th>
                            <th className="px-4 py-3">
                              Skipped At
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                          {recipients.map(
                            (
                              recipient
                            ) => {
                              const errorText =
                                getRecipientErrorText(
                                  recipient
                                );

                              const rawError =
                                safeJson(
                                  recipient.send_error
                                );

                              return (
                                <tr
                                  key={
                                    recipient.id
                                  }
                                >
                                  <td className="px-4 py-3 font-medium text-gray-800">
                                    +
                                    {
                                      recipient.phone_e164
                                    }
                                  </td>

                                  <td className="px-4 py-3 text-gray-500">
                                    {recipient.customer_name ||
                                      "-"}
                                  </td>

                                  <td className="px-4 py-3 text-gray-500">
                                    {recipient.lead_type ||
                                      "-"}
                                  </td>

                                  <td className="px-4 py-3">
                                    <StatusBadge
                                      status={
                                        recipient.status
                                      }
                                    />
                                  </td>

                                  <td className="max-w-[380px] px-4 py-3 text-xs text-gray-600">
                                    <div
                                      className={[
                                        "rounded-2xl border px-3 py-2 leading-5",
                                        recipient.status ===
                                        "failed"
                                          ? "border-red-200 bg-red-50 text-red-700"
                                          : recipient.status ===
                                              "skipped"
                                            ? "border-amber-200 bg-amber-50 text-amber-800"
                                            : recipient.status ===
                                                "pending"
                                              ? "border-gray-200 bg-gray-50 text-gray-600"
                                              : "border-emerald-100 bg-emerald-50 text-emerald-700",
                                      ].join(
                                        " "
                                      )}
                                    >
                                      {recipient.error_type ? (
                                        <p className="mb-1 font-bold">
                                          Type:{" "}
                                          {
                                            recipient.error_type
                                          }
                                        </p>
                                      ) : null}

                                      <p>
                                        {
                                          errorText
                                        }
                                      </p>

                                      {rawError &&
                                      recipient.status ===
                                        "failed" ? (
                                        <details className="mt-2">
                                          <summary className="cursor-pointer font-semibold">
                                            Raw
                                            error
                                          </summary>

                                          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-white/70 p-2 text-[11px]">
                                            {
                                              rawError
                                            }
                                          </pre>
                                        </details>
                                      ) : null}
                                    </div>
                                  </td>

                                  <td className="max-w-[240px] truncate px-4 py-3 text-xs text-gray-500">
                                    {recipient.meta_message_id ||
                                      "-"}
                                  </td>

                                  <td className="px-4 py-3 text-gray-500">
                                    {formatDate(
                                      recipient.sent_at
                                    )}
                                  </td>

                                  <td className="px-4 py-3 text-gray-500">
                                    {formatDate(
                                      recipient.failed_at
                                    )}
                                  </td>

                                  <td className="px-4 py-3 text-gray-500">
                                    {formatDate(
                                      recipient.skipped_at
                                    )}
                                  </td>
                                </tr>
                              );
                            }
                          )}

                          {recipients.length ===
                          0 ? (
                            <tr>
                              <td
                                colSpan={9}
                                className="px-4 py-8 text-center text-gray-500"
                              >
                                No recipients
                                loaded for this
                                filter.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
