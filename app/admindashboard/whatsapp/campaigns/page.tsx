"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type SendProvider = "twilio_whatsapp" | "meta_cloud_api";
type TemplateCategory = "marketing" | "utility";
type RecipientStatusFilter = "all" | "pending" | "sent" | "failed" | "skipped";

type Campaign = {
  id: string;
  name: string;
  template_name: string;
  template_language: string;
  category: string;
  campaign_type: string;
  send_provider?: SendProvider | string | null;
  twilio_content_sid?: string | null;
  twilio_from?: string | null;
  status: string;
  total_recipients: number;
  total_sent: number;
  total_failed: number;
  total_skipped: number;
  batch_size: number;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
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
  variables: Record<string, unknown> | null;
  status: string;
  meta_message_id: string | null;
  twilio_message_sid?: string | null;
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

type TemplateOption = {
  label: string;
  name: string;
  language: string;
  type: string;
  category: TemplateCategory;
  variableHint: string;
  note: string;
  twilioContentSid?: string;
  twilioEnvKey?: string;
};

const META_TEMPLATES: TemplateOption[] = [
  {
    label: "Agent Invite",
    name: "tetamo_agent_invite_id_01",
    language: "id",
    type: "business_initiated",
    category: "marketing",
    variableHint: "Leave empty unless this Meta template has {{1}}.",
    note: "Meta template. Use this for agent/owner outreach and business-initiated campaign sending.",
  },
  {
    label: "Listing Follow-up 3 Day",
    name: "tetamo_listing_followup_3_days_id__marketing",
    language: "id",
    type: "followup_3_day",
    category: "marketing",
    variableHint: "No variables.",
    note: "Meta template. Use for automatic or manual 3-day listing follow-up.",
  },
  {
    label: "Listing Follow-up 14 Day",
    name: "tetamo_listing_followup_14_days_id",
    language: "id",
    type: "followup_14_day",
    category: "marketing",
    variableHint: "No variables.",
    note: "Meta template. Use for automatic or manual 14-day listing follow-up.",
  },
  {
    label: "Listing Support Follow Up",
    name: "listing_support_follow_up_id",
    language: "id",
    type: "manual_template",
    category: "utility",
    variableHint: '{"1":"Bapak/Ibu"}',
    note: "Meta utility template. Use when a lead/customer needs listing support follow-up.",
  },
  {
    label: "Payment QRIS Support",
    name: "payment_qris_support_id",
    language: "id",
    type: "manual_template",
    category: "utility",
    variableHint: '{"1":"Bapak/Ibu"}',
    note: "Meta utility template. Use for payment/QRIS support cases.",
  },
];

const TWILIO_TEMPLATES: TemplateOption[] = [
  {
    label: "Agent Invite",
    name: "tetamo_agent_invite_id_01",
    language: "id",
    type: "business_initiated",
    category: "marketing",
    variableHint: "Leave empty unless this Twilio template has {{1}}.",
    note: "Twilio template. SID is loaded from backend environment variable TWILIO_AGENT_INVITE_CONTENT_SID.",
    twilioEnvKey: "TWILIO_AGENT_INVITE_CONTENT_SID",
  },
  {
    label: "Inquiry Listing Follow Up",
    name: "tetamo_inquiry_listing_follow_up",
    language: "id",
    type: "manual_template",
    category: "utility",
    variableHint: '{"1":"Bapak/Ibu"}',
    note: "Twilio utility template. Use this to follow up with people who asked about listing their property on Tetamo.",
    twilioContentSid: "HXc2fc95a69e87cf12e851d63e1e550228",
  },
];

const LEAD_TYPES = [
  { value: "unknown", label: "Unknown" },
  { value: "owner", label: "Owner" },
  { value: "agent", label: "Agent" },
  { value: "developer", label: "Developer" },
  { value: "buyer", label: "Buyer/Renter" },
];

const RECIPIENT_FILTERS: { value: RecipientStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
  { value: "skipped", label: "Skipped" },
];

const EMPTY_COUNTS: RecipientCounts = {
  total: 0,
  pending: 0,
  sent: 0,
  failed: 0,
  skipped: 0,
};

function getTemplatesForProvider(provider: SendProvider) {
  return provider === "twilio_whatsapp" ? TWILIO_TEMPLATES : META_TEMPLATES;
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("en-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

function getStatusClass(status?: string | null) {
  const clean = String(status || "").toLowerCase();

  if (clean === "sent" || clean === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (clean === "failed") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (clean === "skipped" || clean === "paused") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (clean === "sending") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-700";
}

function getProviderLabel(provider?: string | null) {
  if (provider === "meta_cloud_api") return "Meta Cloud API";
  if (provider === "twilio_whatsapp") return "Twilio WhatsApp";
  return "Unknown Provider";
}

function getProviderClass(provider?: string | null) {
  if (provider === "meta_cloud_api") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (provider === "twilio_whatsapp") {
    return "border-purple-200 bg-purple-50 text-purple-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-700";
}

function safeJson(value: unknown) {
  if (!value) return "";

  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getRecipientErrorText(recipient: Recipient) {
  const status = String(recipient.status || "").toLowerCase();

  if (recipient.error_summary) return recipient.error_summary;

  if (status === "pending") return "Not sent yet.";

  if (status === "skipped") {
    return recipient.skip_reason || "Skipped.";
  }

  if (status === "failed") {
    const raw = safeJson(recipient.send_error);
    return raw || "Failed to send.";
  }

  return "-";
}

function getMessageId(recipient: Recipient) {
  return recipient.twilio_message_sid || recipient.meta_message_id || "-";
}

function StatusBadge({ status }: { status?: string | null }) {
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

function ProviderBadge({ provider }: { provider?: string | null }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getProviderClass(
        provider
      )}`}
    >
      {getProviderLabel(provider)}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default function WhatsAppCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null
  );
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientCounts, setRecipientCounts] =
    useState<RecipientCounts>(EMPTY_COUNTS);
  const [recipientStatusFilter, setRecipientStatusFilter] =
    useState<RecipientStatusFilter>("all");

  const [loading, setLoading] = useState(true);
  const [loadingCampaign, setLoadingCampaign] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sendingBatch, setSendingBatch] = useState(false);
  const [deletingCampaign, setDeletingCampaign] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [sendProvider, setSendProvider] =
    useState<SendProvider>("meta_cloud_api");

  const [templateName, setTemplateName] = useState(META_TEMPLATES[0].name);
  const [templateLanguage, setTemplateLanguage] = useState(
    META_TEMPLATES[0].language
  );
  const [templateCategory, setTemplateCategory] = useState<TemplateCategory>(
    META_TEMPLATES[0].category
  );
  const [campaignType, setCampaignType] = useState(META_TEMPLATES[0].type);
  const [leadType, setLeadType] = useState("agent");
  const [batchSize, setBatchSize] = useState(100);
  const [recipientText, setRecipientText] = useState("");
  const [defaultVariablesText, setDefaultVariablesText] = useState("");
  const [selectedTwilioSidTemplateName, setSelectedTwilioSidTemplateName] =
    useState(TWILIO_TEMPLATES[0].name);

  const templateOptions = useMemo(() => {
    return getTemplatesForProvider(sendProvider);
  }, [sendProvider]);

  const selectedTemplate = useMemo(() => {
    return (
      templateOptions.find((item) => item.name === templateName) ||
      templateOptions[0]
    );
  }, [templateOptions, templateName]);

  const selectedTwilioSidTemplate = useMemo(() => {
    return (
      TWILIO_TEMPLATES.find(
        (item) => item.name === selectedTwilioSidTemplateName
      ) || TWILIO_TEMPLATES[0]
    );
  }, [selectedTwilioSidTemplateName]);

  const isTwilio = sendProvider === "twilio_whatsapp";

  const selectedTwilioContentSid = isTwilio
    ? selectedTwilioSidTemplate.twilioContentSid || ""
    : "";

  const twilioTemplateReady =
    !isTwilio ||
    Boolean(
      selectedTwilioSidTemplate.twilioContentSid ||
        selectedTwilioSidTemplate.twilioEnvKey
    );

  const campaignPending = recipientCounts.pending;
  const campaignFailed = recipientCounts.failed;

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || "";
  }

  function applyTemplateToForm(template: TemplateOption) {
    setTemplateName(template.name);
    setTemplateLanguage(template.language);
    setTemplateCategory(template.category);
    setCampaignType(template.type);

    if (template.variableHint.startsWith("{")) {
      setDefaultVariablesText(template.variableHint);
    } else {
      setDefaultVariablesText("");
    }

    if (template.twilioContentSid || template.twilioEnvKey) {
      setSelectedTwilioSidTemplateName(template.name);
    }
  }

  function handleProviderSelect(value: SendProvider) {
    const nextTemplates = getTemplatesForProvider(value);
    const firstTemplate = nextTemplates[0];

    setSendProvider(value);
    applyTemplateToForm(firstTemplate);

    if (value === "twilio_whatsapp") {
      setSelectedTwilioSidTemplateName(firstTemplate.name);
    }
  }

  function handleTemplateSelect(value: string) {
    const selected =
      templateOptions.find((item) => item.name === value) || templateOptions[0];

    applyTemplateToForm(selected);
  }

  function handleTwilioSidTemplateSelect(value: string) {
    const selected =
      TWILIO_TEMPLATES.find((item) => item.name === value) ||
      TWILIO_TEMPLATES[0];

    setSelectedTwilioSidTemplateName(selected.name);
    applyTemplateToForm(selected);
  }

  async function loadCampaigns() {
    try {
      setLoading(true);
      setError("");

      const token = await getAccessToken();

      if (!token) {
        setError("Please log in as admin first.");
        setCampaigns([]);
        return;
      }

      const response = await fetch("/api/admin/whatsapp/template-campaigns", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to load campaigns.");
      }

      setCampaigns((result.campaigns || []) as Campaign[]);
    } catch (err: any) {
      console.error("Load campaigns error:", err);
      setError(err?.message || "Failed to load campaigns.");
    } finally {
      setLoading(false);
    }
  }

  async function loadCampaign(
    campaignId: string,
    nextRecipientStatusFilter = recipientStatusFilter
  ) {
    try {
      setLoadingCampaign(true);
      setError("");

      const token = await getAccessToken();

      if (!token) {
        setError("Please log in as admin first.");
        return;
      }

      const params = new URLSearchParams({
        campaignId,
        includeRecipients: "true",
        recipientStatus: nextRecipientStatusFilter,
      });

      const response = await fetch(
        `/api/admin/whatsapp/template-campaigns?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to load campaign.");
      }

      setSelectedCampaign((result.campaign || null) as Campaign | null);
      setRecipients((result.recipients || []) as Recipient[]);
      setRecipientCounts(
        (result.recipientCounts || EMPTY_COUNTS) as RecipientCounts
      );
    } catch (err: any) {
      console.error("Load campaign detail error:", err);
      setError(err?.message || "Failed to load campaign.");
    } finally {
      setLoadingCampaign(false);
    }
  }

  function handleRecipientFilter(nextFilter: RecipientStatusFilter) {
    setRecipientStatusFilter(nextFilter);

    if (selectedCampaign?.id) {
      loadCampaign(selectedCampaign.id, nextFilter);
    }
  }

  function parseDefaultVariables() {
    const clean = defaultVariablesText.trim();

    if (!clean) return {};

    try {
      return JSON.parse(clean);
    } catch {
      throw new Error(
        'Template variables must be valid JSON, example: {"1":"Bapak/Ibu"}'
      );
    }
  }

  async function createCampaign() {
    try {
      setCreating(true);
      setError("");
      setSuccess("");

      if (!twilioTemplateReady) {
        throw new Error(
          "This Twilio template is not connected to a Content SID yet."
        );
      }

      const token = await getAccessToken();

      if (!token) {
        setError("Please log in as admin first.");
        return;
      }

      const defaultVariables = parseDefaultVariables();

      const response = await fetch("/api/admin/whatsapp/template-campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          templateName,
          templateLanguage,
          campaignType,
          category: templateCategory,
          leadType,
          batchSize,
          recipients: recipientText,
          defaultVariables,
          sendProvider,
          twilioContentSid: selectedTwilioContentSid,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to create campaign.");
      }

      setSuccess(
        `Campaign created with ${
          result.totalRecipients || 0
        } recipient(s) using ${getProviderLabel(result.sendProvider)}.`
      );

      setName("");
      setRecipientText("");
      setDefaultVariablesText(
        selectedTemplate.variableHint.startsWith("{")
          ? selectedTemplate.variableHint
          : ""
      );
      setRecipientStatusFilter("all");

      await loadCampaigns();

      if (result.campaignId) {
        await loadCampaign(result.campaignId, "all");
      }
    } catch (err: any) {
      console.error("Create campaign error:", err);
      setError(err?.message || "Failed to create campaign.");
    } finally {
      setCreating(false);
    }
  }

  async function processCampaignBatch(
    action: "continue_pending" | "retry_failed"
  ) {
    if (!selectedCampaign?.id) return;

    const isRetryFailed = action === "retry_failed";

    if (isRetryFailed) {
      const confirmed = window.confirm(
        `Retry ${campaignFailed} failed recipient(s)?\n\nThis will only retry recipients with status "failed". It will not resend already sent recipients.`
      );

      if (!confirmed) return;
    }

    try {
      setSendingBatch(true);
      setError("");
      setSuccess("");

      const token = await getAccessToken();

      if (!token) {
        setError("Please log in as admin first.");
        return;
      }

      const response = await fetch("/api/admin/whatsapp/template-campaigns", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          campaignId: selectedCampaign.id,
          batchSize,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to process campaign batch.");
      }

      setSuccess(
        `${isRetryFailed ? "Retry failed" : "Pending batch"} processed via ${getProviderLabel(
          result.sendProvider
        )}: ${result.sentThisBatch || 0} sent, ${
          result.failedThisBatch || 0
        } failed, ${result.skippedThisBatch || 0} skipped, pending left ${
          result.pendingLeft || 0
        }, failed left ${result.failedLeft || 0}.`
      );

      await loadCampaigns();
      await loadCampaign(selectedCampaign.id, recipientStatusFilter);
    } catch (err: any) {
      console.error("Campaign batch action error:", err);
      setError(err?.message || "Failed to process campaign batch.");
    } finally {
      setSendingBatch(false);
    }
  }

  async function updateCampaignStatus(action: "pause" | "resume") {
    if (!selectedCampaign?.id) return;

    try {
      setActionLoading(action);
      setError("");
      setSuccess("");

      const token = await getAccessToken();

      if (!token) {
        setError("Please log in as admin first.");
        return;
      }

      const response = await fetch("/api/admin/whatsapp/template-campaigns", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          campaignId: selectedCampaign.id,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `Failed to ${action} campaign.`);
      }

      setSuccess(`Campaign ${action === "pause" ? "paused" : "resumed"}.`);

      await loadCampaigns();
      await loadCampaign(selectedCampaign.id, recipientStatusFilter);
    } catch (err: any) {
      console.error("Campaign status error:", err);
      setError(err?.message || `Failed to ${action} campaign.`);
    } finally {
      setActionLoading("");
    }
  }

  async function deleteSelectedCampaign() {
    if (!selectedCampaign?.id) return;

    const confirmed = window.confirm(
      `Delete campaign "${selectedCampaign.name}"?\n\nThis will delete the campaign, its recipients, and send logs. This cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeletingCampaign(true);
      setError("");
      setSuccess("");

      const token = await getAccessToken();

      if (!token) {
        setError("Please log in as admin first.");
        return;
      }

      const response = await fetch("/api/admin/whatsapp/template-campaigns", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "delete_campaign",
          campaignId: selectedCampaign.id,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to delete campaign.");
      }

      setSuccess(`Campaign "${selectedCampaign.name}" deleted.`);
      setSelectedCampaign(null);
      setRecipients([]);
      setRecipientCounts(EMPTY_COUNTS);

      await loadCampaigns();
    } catch (err: any) {
      console.error("Delete campaign error:", err);
      setError(err?.message || "Failed to delete campaign.");
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
              WhatsApp Templates
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Template Campaigns
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              Create approved WhatsApp template campaigns for Tetamo outreach,
              listing follow-ups, support messages, and support follow-up
              messages.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              loadCampaigns();
              if (selectedCampaign?.id) {
                loadCampaign(selectedCampaign.id, recipientStatusFilter);
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
          <h2 className="text-lg font-bold">Create Campaign</h2>

          <div className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                Campaign Name
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Example: Listing Inquiry Follow Up Batch 1"
                className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                Send Provider
              </label>
              <select
                value={sendProvider}
                onChange={(event) =>
                  handleProviderSelect(event.target.value as SendProvider)
                }
                className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
              >
                <option value="meta_cloud_api">Meta Cloud API</option>
                <option value="twilio_whatsapp">Twilio WhatsApp</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                Approved Template
              </label>
              <select
                value={templateName}
                onChange={(event) => handleTemplateSelect(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
              >
                {templateOptions.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.label} — {item.name}
                  </option>
                ))}
              </select>

              <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-600">
                <p>
                  <span className="font-bold text-gray-800">Provider:</span>{" "}
                  {getProviderLabel(sendProvider)}
                </p>
                <p>
                  <span className="font-bold text-gray-800">Template:</span>{" "}
                  {selectedTemplate.name}
                </p>
                <p>
                  <span className="font-bold text-gray-800">Language:</span>{" "}
                  {templateLanguage}
                </p>
                <p>
                  <span className="font-bold text-gray-800">Category:</span>{" "}
                  {templateCategory}
                </p>
                <p>
                  <span className="font-bold text-gray-800">Type:</span>{" "}
                  {campaignType}
                </p>
                <p className="mt-1">
                  <span className="font-bold text-gray-800">Variables:</span>{" "}
                  {selectedTemplate.variableHint}
                </p>
                <p className="mt-1">
                  <span className="font-bold text-gray-800">Note:</span>{" "}
                  {selectedTemplate.note}
                </p>
              </div>
            </div>

            {isTwilio ? (
              <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4">
                <p className="text-sm font-bold text-purple-900">
                  Twilio Content SID Mapping
                </p>

                <p className="mt-1 text-xs leading-5 text-purple-700">
                  Choose which Twilio-approved template and SID should be used
                  for this campaign. This controls the ContentSid sent to
                  Twilio.
                </p>

                <div className="mt-4">
                  <label className="text-xs font-bold uppercase tracking-[0.14em] text-purple-500">
                    Select Twilio SID / Template
                  </label>

                  <select
                    value={selectedTwilioSidTemplateName}
                    onChange={(event) =>
                      handleTwilioSidTemplateSelect(event.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-purple-200 bg-white px-4 py-3 text-sm outline-none focus:border-purple-700"
                  >
                    {TWILIO_TEMPLATES.map((item) => (
                      <option key={item.name} value={item.name}>
                        {item.label} —{" "}
                        {item.twilioContentSid
                          ? item.twilioContentSid
                          : item.twilioEnvKey || "Backend SID"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-4 rounded-2xl border border-purple-100 bg-white px-4 py-3 text-sm leading-6 text-purple-800">
                  <p>
                    <span className="font-bold text-purple-950">
                      Selected Twilio Template:
                    </span>{" "}
                    {selectedTwilioSidTemplate.label}
                  </p>

                  <p>
                    <span className="font-bold text-purple-950">
                      Template Name:
                    </span>{" "}
                    {selectedTwilioSidTemplate.name}
                  </p>

                  {selectedTwilioSidTemplate.twilioContentSid ? (
                    <p>
                      <span className="font-bold text-purple-950">
                        Twilio Content SID:
                      </span>{" "}
                      <span className="break-all font-mono text-xs">
                        {selectedTwilioSidTemplate.twilioContentSid}
                      </span>
                    </p>
                  ) : null}

                  {selectedTwilioSidTemplate.twilioEnvKey ? (
                    <p>
                      <span className="font-bold text-purple-950">
                        Twilio SID Source:
                      </span>{" "}
                      <span className="font-mono text-xs">
                        {selectedTwilioSidTemplate.twilioEnvKey}
                      </span>
                    </p>
                  ) : null}

                  <p>
                    <span className="font-bold text-purple-950">
                      Variable:
                    </span>{" "}
                    {selectedTwilioSidTemplate.variableHint}
                  </p>

                  <p>
                    <span className="font-bold text-purple-950">Status:</span>{" "}
                    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                      SID Connected
                    </span>
                  </p>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  Language Code
                </label>
                <input
                  value={templateLanguage}
                  onChange={(event) => setTemplateLanguage(event.target.value)}
                  placeholder="id or en"
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  Batch Size
                </label>
                <input
                  type="number"
                  value={batchSize}
                  min={1}
                  max={200}
                  onChange={(event) =>
                    setBatchSize(Number(event.target.value))
                  }
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                Campaign Type
              </label>
              <select
                value={campaignType}
                onChange={(event) => setCampaignType(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
              >
                <option value="business_initiated">Business Initiated</option>
                <option value="followup_3_day">3-Day Follow-up</option>
                <option value="followup_14_day">14-Day Follow-up</option>
                <option value="manual_template">Manual Template</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                Template Category
              </label>
              <select
                value={templateCategory}
                onChange={(event) =>
                  setTemplateCategory(event.target.value as TemplateCategory)
                }
                className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
              >
                <option value="marketing">Marketing</option>
                <option value="utility">Utility</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                Lead Type
              </label>
              <select
                value={leadType}
                onChange={(event) => setLeadType(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
              >
                {LEAD_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                Phone Numbers
              </label>
              <textarea
                value={recipientText}
                onChange={(event) => setRecipientText(event.target.value)}
                rows={10}
                placeholder={`Paste one phone number per line:\n628123456789\n08123456789\n+628123456789`}
                className="mt-2 w-full resize-y rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
              />
              <p className="mt-2 text-xs leading-5 text-gray-500">
                Indonesian numbers starting with 08 or 8 will be normalized to
                62 automatically by the backend.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                Template Variables Optional
              </label>
              <textarea
                value={defaultVariablesText}
                onChange={(event) =>
                  setDefaultVariablesText(event.target.value)
                }
                rows={3}
                placeholder={`Leave empty if template has no variables.\nExample for {{1}}: {"1":"Bapak/Ibu"}`}
                className="mt-2 w-full resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
              />
              <p className="mt-2 text-xs leading-5 text-gray-500">
                Only add variables if the approved WhatsApp template has
                variables like {"{{1}}"}. For Twilio Inquiry Listing Follow Up,
                use {"{"}"1":"Bapak/Ibu"{"}"} or replace it with the customer
                name.
              </p>
            </div>

            <button
              type="button"
              onClick={createCampaign}
              disabled={
                creating ||
                !name.trim() ||
                !templateName.trim() ||
                !recipientText.trim() ||
                !twilioTemplateReady
              }
              className="w-full rounded-2xl bg-[#1C1C1E] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {creating ? "Creating..." : "Create Campaign"}
            </button>
          </div>
        </section>

        <section className="rounded-[28px] border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-4 sm:p-5">
            <h2 className="text-lg font-bold">Campaigns</h2>
            <p className="mt-1 text-sm text-gray-500">
              Select a campaign to view recipients, see pending/failed errors,
              continue pending sends, retry failed recipients, pause, resume, or
              delete a test campaign.
            </p>
          </div>

          <div className="grid gap-0 lg:grid-cols-[360px_minmax(0,1fr)]">
            <div className="max-h-[780px] overflow-y-auto border-b border-gray-100 p-3 lg:border-b-0 lg:border-r">
              {loading ? (
                <p className="p-4 text-sm text-gray-500">
                  Loading campaigns...
                </p>
              ) : null}

              {!loading && campaigns.length === 0 ? (
                <p className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                  No campaigns yet.
                </p>
              ) : null}

              <div className="space-y-2">
                {campaigns.map((campaign) => {
                  const active = selectedCampaign?.id === campaign.id;
                  const pending = Math.max(
                    Number(campaign.total_recipients || 0) -
                      Number(campaign.total_sent || 0) -
                      Number(campaign.total_failed || 0) -
                      Number(campaign.total_skipped || 0),
                    0
                  );

                  return (
                    <button
                      key={campaign.id}
                      type="button"
                      onClick={() => loadCampaign(campaign.id)}
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
                            {campaign.name}
                          </p>
                          <p
                            className={[
                              "mt-1 truncate text-xs",
                              active ? "text-white/60" : "text-gray-500",
                            ].join(" ")}
                          >
                            {campaign.template_name}
                          </p>
                        </div>

                        <span
                          className={[
                            "rounded-full px-2 py-1 text-[10px] font-bold",
                            active
                              ? "bg-white/10 text-white"
                              : "bg-gray-100 text-gray-700",
                          ].join(" ")}
                        >
                          {campaign.status}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span
                          className={[
                            "rounded-full px-2 py-1 text-[10px] font-bold",
                            active
                              ? "bg-white/10 text-white"
                              : getProviderClass(campaign.send_provider),
                          ].join(" ")}
                        >
                          {getProviderLabel(campaign.send_provider)}
                        </span>

                        <span
                          className={[
                            "rounded-full px-2 py-1 text-[10px] font-bold",
                            active
                              ? "bg-white/10 text-white"
                              : "bg-gray-100 text-gray-700",
                          ].join(" ")}
                        >
                          {campaign.category}
                        </span>
                      </div>

                      <div
                        className={[
                          "mt-3 grid grid-cols-2 gap-2 text-xs",
                          active ? "text-white/70" : "text-gray-500",
                        ].join(" ")}
                      >
                        <span>Pending: {pending}</span>
                        <span>Sent: {campaign.total_sent}</span>
                        <span>Failed: {campaign.total_failed}</span>
                        <span>Skipped: {campaign.total_skipped}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-[520px] p-4 sm:p-5">
              {!selectedCampaign ? (
                <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  Select a campaign to manage sending.
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-bold">
                          {selectedCampaign.name}
                        </h3>
                        <StatusBadge status={selectedCampaign.status} />
                        <ProviderBadge
                          provider={selectedCampaign.send_provider}
                        />
                      </div>

                      <p className="mt-2 text-sm text-gray-500">
                        Template:{" "}
                        <span className="font-semibold text-gray-700">
                          {selectedCampaign.template_name}
                        </span>
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        Language: {selectedCampaign.template_language} ·
                        Category: {selectedCampaign.category} · Type:{" "}
                        {selectedCampaign.campaign_type}
                      </p>

                      {selectedCampaign.send_provider ===
                      "twilio_whatsapp" ? (
                        <p className="mt-1 text-sm text-gray-500">
                          Twilio SID:{" "}
                          <span className="break-all font-semibold text-gray-700">
                            {selectedCampaign.twilio_content_sid ||
                              "Backend environment"}
                          </span>
                        </p>
                      ) : null}

                      <p className="mt-1 text-sm text-gray-500">
                        Created: {formatDate(selectedCampaign.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => processCampaignBatch("continue_pending")}
                        disabled={
                          sendingBatch ||
                          deletingCampaign ||
                          selectedCampaign.status === "paused" ||
                          campaignPending <= 0
                        }
                        className="rounded-2xl bg-[#1C1C1E] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {sendingBatch ? "Sending..." : "Send Pending"}
                      </button>

                      <button
                        type="button"
                        onClick={() => processCampaignBatch("retry_failed")}
                        disabled={
                          sendingBatch ||
                          deletingCampaign ||
                          selectedCampaign.status === "paused" ||
                          campaignFailed <= 0
                        }
                        className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Retry Failed
                      </button>

                      <button
                        type="button"
                        onClick={() => updateCampaignStatus("pause")}
                        disabled={
                          Boolean(actionLoading) ||
                          deletingCampaign ||
                          selectedCampaign.status === "paused"
                        }
                        className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Pause
                      </button>

                      <button
                        type="button"
                        onClick={() => updateCampaignStatus("resume")}
                        disabled={
                          Boolean(actionLoading) ||
                          deletingCampaign ||
                          selectedCampaign.status !== "paused"
                        }
                        className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Resume
                      </button>

                      <button
                        type="button"
                        onClick={deleteSelectedCampaign}
                        disabled={deletingCampaign || sendingBatch}
                        className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {deletingCampaign ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
                    <StatCard label="Total" value={recipientCounts.total} />
                    <StatCard label="Pending" value={recipientCounts.pending} />
                    <StatCard label="Sent" value={recipientCounts.sent} />
                    <StatCard label="Failed" value={recipientCounts.failed} />
                    <StatCard label="Skipped" value={recipientCounts.skipped} />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {RECIPIENT_FILTERS.map((filter) => (
                      <button
                        key={filter.value}
                        type="button"
                        onClick={() => handleRecipientFilter(filter.value)}
                        className={[
                          "rounded-full border px-4 py-2 text-xs font-semibold",
                          recipientStatusFilter === filter.value
                            ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                            : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
                        ].join(" ")}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 max-h-[520px] overflow-y-auto rounded-2xl border border-gray-200">
                    {loadingCampaign ? (
                      <p className="p-4 text-sm text-gray-500">
                        Loading recipients...
                      </p>
                    ) : null}

                    {!loadingCampaign && recipients.length === 0 ? (
                      <p className="p-4 text-sm text-gray-500">
                        No recipients found for this filter.
                      </p>
                    ) : null}

                    {!loadingCampaign && recipients.length > 0 ? (
                      <div className="divide-y divide-gray-100">
                        {recipients.map((recipient) => (
                          <div key={recipient.id} className="p-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div>
                                <p className="text-sm font-bold text-gray-900">
                                  {recipient.customer_name ||
                                    recipient.phone_e164}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  {recipient.phone_e164}
                                </p>
                                <p className="mt-1 text-xs text-gray-400">
                                  {recipient.lead_type || "unknown"} ·{" "}
                                  {recipient.source || "campaign"}
                                </p>
                              </div>

                              <StatusBadge status={recipient.status} />
                            </div>

                            <div className="mt-3 grid gap-2 text-xs text-gray-500 sm:grid-cols-2">
                              <p>
                                <span className="font-semibold text-gray-700">
                                  Message ID:
                                </span>{" "}
                                {getMessageId(recipient)}
                              </p>
                              <p>
                                <span className="font-semibold text-gray-700">
                                  Sent:
                                </span>{" "}
                                {formatDate(recipient.sent_at)}
                              </p>
                            </div>

                            {recipient.status === "failed" ||
                            recipient.status === "skipped" ||
                            recipient.error_summary ? (
                              <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 p-3 text-xs leading-5 text-red-700">
                                {getRecipientErrorText(recipient)}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
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