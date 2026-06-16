"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Campaign = {
  id: string;
  name: string;
  template_name: string;
  template_language: string;
  category: string;
  campaign_type: string;
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
  sent_at: string | null;
  failed_at: string | null;
  skipped_at: string | null;
  skip_reason: string | null;
  created_at: string;
};

type TemplateOption = {
  label: string;
  name: string;
  language: string;
  type: string;
  category: "marketing" | "utility";
  variableHint: string;
  note: string;
};

const APPROVED_TEMPLATES: TemplateOption[] = [
  {
    label: "Agent Invite",
    name: "tetamo_agent_invite_id_01",
    language: "en",
    type: "business_initiated",
    category: "marketing",
    variableHint: "Leave empty unless this template has {{1}} in Meta.",
    note: "Use this for agent/owner outreach and business-initiated campaign sending.",
  },
  {
    label: "Listing Follow-up 3 Day",
    name: "tetamo_listing_followup_3_days_id__marketing",
    language: "en",
    type: "followup_3_day",
    category: "marketing",
    variableHint: "No variables.",
    note: "Use for automatic or manual 3-day listing follow-up.",
  },
  {
    label: "Listing Follow-up 14 Day",
    name: "tetamo_listing_followup_14_days_id",
    language: "en",
    type: "followup_14_day",
    category: "marketing",
    variableHint: "No variables.",
    note: "Use for automatic or manual 14-day listing follow-up.",
  },
  {
    label: "Listing Support Follow Up",
    name: "listing_support_follow_up_id",
    language: "en",
    type: "manual_template",
    category: "utility",
    variableHint: '{"1":"Bapak/Ibu"}',
    note: "Utility template. Use when a lead/customer needs listing support follow-up.",
  },
  {
    label: "Payment QRIS Support",
    name: "payment_qris_support_id",
    language: "en",
    type: "manual_template",
    category: "utility",
    variableHint: '{"1":"Bapak/Ibu"}',
    note: "Utility template. Use for payment/QRIS support cases.",
  },
];

const LEAD_TYPES = [
  { value: "unknown", label: "Unknown" },
  { value: "owner", label: "Owner" },
  { value: "agent", label: "Agent" },
  { value: "developer", label: "Developer" },
  { value: "buyer", label: "Buyer/Renter" },
];

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

function getPendingFromCampaign(campaign: Campaign | null) {
  if (!campaign) return 0;

  const total = Number(campaign.total_recipients || 0);
  const done =
    Number(campaign.total_sent || 0) +
    Number(campaign.total_failed || 0) +
    Number(campaign.total_skipped || 0);

  return Math.max(total - done, 0);
}

export default function WhatsAppCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null
  );
  const [recipients, setRecipients] = useState<Recipient[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingCampaign, setLoadingCampaign] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sendingBatch, setSendingBatch] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [templateName, setTemplateName] = useState(
    "tetamo_agent_invite_id_01"
  );
  const [templateLanguage, setTemplateLanguage] = useState("en");
  const [templateCategory, setTemplateCategory] = useState<
    "marketing" | "utility"
  >("marketing");
  const [campaignType, setCampaignType] = useState("business_initiated");
  const [leadType, setLeadType] = useState("agent");
  const [batchSize, setBatchSize] = useState(25);
  const [recipientText, setRecipientText] = useState("");
  const [defaultVariablesText, setDefaultVariablesText] = useState("");

  const selectedTemplate = useMemo(() => {
    return (
      APPROVED_TEMPLATES.find((item) => item.name === templateName) ||
      APPROVED_TEMPLATES[0]
    );
  }, [templateName]);

  const stats = useMemo(() => {
    const pending = recipients.filter(
      (item) => item.status === "pending"
    ).length;
    const sent = recipients.filter((item) => item.status === "sent").length;
    const failed = recipients.filter((item) => item.status === "failed").length;
    const skipped = recipients.filter(
      (item) => item.status === "skipped"
    ).length;

    return { pending, sent, failed, skipped };
  }, [recipients]);

  const campaignPending = useMemo(() => {
    if (recipients.length > 0) return stats.pending;
    return getPendingFromCampaign(selectedCampaign);
  }, [recipients.length, selectedCampaign, stats.pending]);

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || "";
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

  async function loadCampaign(campaignId: string) {
    try {
      setLoadingCampaign(true);
      setError("");

      const token = await getAccessToken();

      if (!token) {
        setError("Please log in as admin first.");
        return;
      }

      const response = await fetch(
        `/api/admin/whatsapp/template-campaigns?campaignId=${campaignId}&includeRecipients=true`,
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
    } catch (err: any) {
      console.error("Load campaign detail error:", err);
      setError(err?.message || "Failed to load campaign.");
    } finally {
      setLoadingCampaign(false);
    }
  }

  function handleTemplateSelect(value: string) {
    const selected = APPROVED_TEMPLATES.find((item) => item.name === value);

    setTemplateName(value);

    if (selected) {
      setTemplateLanguage(selected.language);
      setTemplateCategory(selected.category);
      setCampaignType(selected.type);

      if (selected.variableHint.startsWith("{")) {
        setDefaultVariablesText(selected.variableHint);
      } else {
        setDefaultVariablesText("");
      }
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
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to create campaign.");
      }

      setSuccess(
        `Campaign created with ${result.totalRecipients} recipient(s).`
      );

      setName("");
      setRecipientText("");
      setDefaultVariablesText("");

      await loadCampaigns();

      if (result.campaignId) {
        await loadCampaign(result.campaignId);
      }
    } catch (err: any) {
      console.error("Create campaign error:", err);
      setError(err?.message || "Failed to create campaign.");
    } finally {
      setCreating(false);
    }
  }

  async function sendNextBatch() {
    if (!selectedCampaign?.id) return;

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
          action: "send_next_batch",
          campaignId: selectedCampaign.id,
          batchSize,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to send campaign batch.");
      }

      setSuccess(
        `Batch processed: ${result.sentThisBatch} sent, ${result.failedThisBatch} failed, pending left ${result.pendingLeft}.`
      );

      await loadCampaigns();
      await loadCampaign(selectedCampaign.id);
    } catch (err: any) {
      console.error("Send batch error:", err);
      setError(err?.message || "Failed to send campaign batch.");
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
      await loadCampaign(selectedCampaign.id);
    } catch (err: any) {
      console.error("Campaign status error:", err);
      setError(err?.message || `Failed to ${action} campaign.`);
    } finally {
      setActionLoading("");
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
              Send business-initiated WhatsApp messages using approved Meta
              templates. Create campaigns, paste phone numbers, and send safely
              in batches.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              loadCampaigns();
              if (selectedCampaign?.id) loadCampaign(selectedCampaign.id);
            }}
            className="rounded-2xl bg-[#1C1C1E] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            Refresh
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          Start with small batches first, for example 10–25 recipients. Do not
          send 1,000 numbers at once until delivery and template quality look
          healthy.
        </div>

        <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
          Image-header templates are not included yet. Use text-only templates
          first: Agent Invite, 3-day follow-up, 14-day follow-up, listing
          support, and QRIS support.
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
                placeholder="Example: Agent Invite Batch 1"
                className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
              />
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
                {APPROVED_TEMPLATES.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.label} — {item.name}
                  </option>
                ))}
              </select>

              <input
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder="Exact Meta template name"
                className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
              />

              <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-600">
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
                  {selectedTemplate?.variableHint}
                </p>
                <p className="mt-1">
                  <span className="font-bold text-gray-800">Note:</span>{" "}
                  {selectedTemplate?.note}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  Language Code
                </label>
                <input
                  value={templateLanguage}
                  onChange={(event) => setTemplateLanguage(event.target.value)}
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
                  setTemplateCategory(event.target.value as "marketing" | "utility")
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
                rows={8}
                placeholder={`Paste one phone number per line:\n628123456789\n08123456789\n+628123456789`}
                className="mt-2 w-full resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
              />
              <p className="mt-2 text-xs leading-5 text-gray-500">
                Indonesian numbers starting with 08 or 8 will be normalized to
                62 automatically.
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
                Only add variables if the Meta template has variables like{" "}
                {"{{1}}"}. For most campaign templates, leave this empty.
              </p>
            </div>

            <button
              type="button"
              onClick={createCampaign}
              disabled={
                creating ||
                !name.trim() ||
                !templateName.trim() ||
                !recipientText.trim()
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
              Select a campaign to view recipients and send the next batch.
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

                      <div
                        className={[
                          "mt-3 grid grid-cols-3 gap-2 text-xs",
                          active ? "text-white/70" : "text-gray-500",
                        ].join(" ")}
                      >
                        <span>Sent: {campaign.total_sent}</span>
                        <span>Failed: {campaign.total_failed}</span>
                        <span>Total: {campaign.total_recipients}</span>
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
                      <p className="mt-1 text-sm text-gray-500">
                        Created: {formatDate(selectedCampaign.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={sendNextBatch}
                        disabled={
                          sendingBatch ||
                          selectedCampaign.status === "completed" ||
                          selectedCampaign.status === "paused" ||
                          campaignPending <= 0
                        }
                        className="rounded-2xl bg-[#1C1C1E] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {sendingBatch ? "Sending..." : "Send Next Batch"}
                      </button>

                      {selectedCampaign.status === "paused" ? (
                        <button
                          type="button"
                          onClick={() => updateCampaignStatus("resume")}
                          disabled={Boolean(actionLoading)}
                          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          {actionLoading === "resume" ? "Saving..." : "Resume"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => updateCampaignStatus("pause")}
                          disabled={Boolean(actionLoading)}
                          className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                        >
                          {actionLoading === "pause" ? "Saving..." : "Pause"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                        Pending
                      </p>
                      <p className="mt-2 text-2xl font-bold">
                        {campaignPending}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-500">
                        Sent
                      </p>
                      <p className="mt-2 text-2xl font-bold text-emerald-700">
                        {stats.sent || selectedCampaign.total_sent}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-500">
                        Failed
                      </p>
                      <p className="mt-2 text-2xl font-bold text-red-700">
                        {stats.failed || selectedCampaign.total_failed}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-500">
                        Skipped
                      </p>
                      <p className="mt-2 text-2xl font-bold text-amber-800">
                        {stats.skipped || selectedCampaign.total_skipped}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-gray-200">
                    <div className="border-b border-gray-100 px-4 py-3">
                      <p className="text-sm font-bold">
                        Recipients{" "}
                        {loadingCampaign ? (
                          <span className="font-normal text-gray-400">
                            Loading...
                          </span>
                        ) : null}
                      </p>
                    </div>

                    <div className="max-h-[430px] overflow-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="sticky top-0 bg-gray-50 text-xs uppercase tracking-[0.12em] text-gray-400">
                          <tr>
                            <th className="px-4 py-3">Phone</th>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Lead</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Sent At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {recipients.map((recipient) => (
                            <tr key={recipient.id}>
                              <td className="px-4 py-3 font-medium text-gray-800">
                                +{recipient.phone_e164}
                              </td>
                              <td className="px-4 py-3 text-gray-500">
                                {recipient.customer_name || "-"}
                              </td>
                              <td className="px-4 py-3 text-gray-500">
                                {recipient.lead_type || "-"}
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge status={recipient.status} />
                              </td>
                              <td className="px-4 py-3 text-gray-500">
                                {formatDate(recipient.sent_at)}
                              </td>
                            </tr>
                          ))}

                          {recipients.length === 0 ? (
                            <tr>
                              <td
                                colSpan={5}
                                className="px-4 py-8 text-center text-gray-500"
                              >
                                No recipients loaded.
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