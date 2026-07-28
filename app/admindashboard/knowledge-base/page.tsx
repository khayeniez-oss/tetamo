"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";

type KnowledgeEntry = {
  id: string;
  category: string;
  canonical_question: string;
  approved_answer: string;
  language: string;
  status: string;
  priority: number;
  usage_count: number;
  created_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type KnowledgeStats = {
  total: number;
  active: number;
  draft: number;
  inactive: number;
  pendingCandidates: number;
};

type KnowledgeForm = {
  id: string;
  canonicalQuestion: string;
  approvedAnswer: string;
  category: string;
  language: string;
  status: string;
  priority: number;
};

type TabValue =
  | "knowledge"
  | "pending"
  | "documents"
  | "test-mona";

type BadgeTone =
  | "gray"
  | "green"
  | "amber"
  | "red"
  | "blue"
  | "purple";

const EMPTY_STATS: KnowledgeStats = {
  total: 0,
  active: 0,
  draft: 0,
  inactive: 0,
  pendingCandidates: 0,
};

const EMPTY_FORM: KnowledgeForm = {
  id: "",
  canonicalQuestion: "",
  approvedAnswer: "",
  category: "general",
  language: "id",
  status: "active",
  priority: 50,
};

const CATEGORY_OPTIONS = [
  { value: "general", label: "General" },
  { value: "payments", label: "Payments" },
  { value: "membership", label: "Agent Membership" },
  { value: "listings", label: "Property Listings" },
  { value: "pricing", label: "Pricing & Packages" },
  { value: "verification", label: "Verification" },
  { value: "viewings", label: "Property Viewings" },
  { value: "agents", label: "Agents" },
  { value: "owners", label: "Property Owners" },
  { value: "property-search", label: "Property Search" },
  { value: "accounts", label: "Accounts & Login" },
  { value: "technical", label: "Technical Help" },
  { value: "legal", label: "Legal & Documents" },
  { value: "support", label: "Human Support" },
] as const;

const TABS: {
  value: TabValue;
  label: string;
  description: string;
}[] = [
  {
    value: "knowledge",
    label: "Knowledge",
    description: "Approved answers Mona can use",
  },
  {
    value: "pending",
    label: "Pending Questions",
    description: "Questions collected from customers",
  },
  {
    value: "documents",
    label: "Documents",
    description: "Import SOPs, FAQs and guides",
  },
  {
    value: "test-mona",
    label: "Test Mona",
    description: "Preview Mona before customers see it",
  },
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

function cleanStatusLabel(value?: string | null) {
  const status = String(value || "").toLowerCase();

  if (status === "active") return "Active";
  if (status === "inactive") return "Inactive";

  return "Draft";
}

function getStatusTone(status?: string | null): BadgeTone {
  const cleanStatus = String(status || "").toLowerCase();

  if (cleanStatus === "active") return "green";
  if (cleanStatus === "inactive") return "gray";

  return "amber";
}

function Badge({
  children,
  tone = "gray",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  const classes: Record<BadgeTone, string> = {
    gray: "border-gray-200 bg-gray-100 text-gray-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    purple: "border-purple-200 bg-purple-50 text-purple-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${classes[tone]}`}
    >
      {children}
    </span>
  );
}

function StatCard({
  label,
  value,
  tone = "gray",
}: {
  label: string;
  value: number;
  tone?: BadgeTone;
}) {
  const classes: Record<BadgeTone, string> = {
    gray: "border-gray-200 bg-gray-50 text-gray-900",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
    red: "border-red-100 bg-red-50 text-red-700",
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    purple: "border-purple-100 bg-purple-50 text-purple-700",
  };

  return (
    <div className={`rounded-2xl border p-4 ${classes[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-65">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

export default function MonaKnowledgePage() {
  const [activeTab, setActiveTab] = useState<TabValue>("knowledge");

  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [stats, setStats] = useState<KnowledgeStats>(EMPTY_STATS);
  const [categories, setCategories] = useState<string[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<KnowledgeForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const drawerTitle = form.id ? "Edit Knowledge" : "Add Knowledge";

  const categoryOptions = useMemo(() => {
    const fixed = CATEGORY_OPTIONS.map((option) => option.value);
    const custom = categories.filter(
      (category) => category && !fixed.includes(category as any)
    );

    return [
      ...CATEGORY_OPTIONS,
      ...custom.map((category) => ({
        value: category,
        label: category
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
      })),
    ];
  }, [categories]);

  const filteredEntries = useMemo(() => {
    return entries;
  }, [entries]);

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || "";
  }

  async function loadKnowledge() {
    try {
      setLoading(true);
      setError("");

      const token = await getAccessToken();

      if (!token) {
        setEntries([]);
        setStats(EMPTY_STATS);
        setError("Please log in as admin first.");
        return;
      }

      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      params.set("status", statusFilter);
      params.set("language", languageFilter);
      params.set("category", categoryFilter);

      const response = await fetch(
        `/api/admin/knowledge-base?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Failed to load Mona Knowledge Centre."
        );
      }

      setEntries((result.entries || []) as KnowledgeEntry[]);
      setStats((result.stats || EMPTY_STATS) as KnowledgeStats);
      setCategories((result.categories || []) as string[]);
    } catch (err: any) {
      console.error("Load Knowledge Centre error:", err);
      setError(
        err?.message || "Failed to load Mona Knowledge Centre."
      );
    } finally {
      setLoading(false);
    }
  }

  function openCreateDrawer() {
    setForm(EMPTY_FORM);
    setError("");
    setSuccessMessage("");
    setDrawerOpen(true);
  }

  function openEditDrawer(entry: KnowledgeEntry) {
    setForm({
      id: entry.id,
      canonicalQuestion: entry.canonical_question,
      approvedAnswer: entry.approved_answer,
      category: entry.category || "general",
      language: entry.language || "id",
      status: entry.status || "draft",
      priority: entry.priority || 0,
    });

    setError("");
    setSuccessMessage("");
    setDrawerOpen(true);
  }

  function closeDrawer() {
    if (saving) return;

    setDrawerOpen(false);
    setForm(EMPTY_FORM);
  }

  async function saveKnowledge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const canonicalQuestion = form.canonicalQuestion.trim();
    const approvedAnswer = form.approvedAnswer.trim();
    const category = form.category.trim() || "general";

    if (!canonicalQuestion) {
      setError("Please enter the customer question.");
      return;
    }

    if (!approvedAnswer) {
      setError("Please enter Mona's approved answer.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const token = await getAccessToken();

      if (!token) {
        setError("Please log in as admin first.");
        return;
      }

      const isEditing = Boolean(form.id);

      const response = await fetch("/api/admin/knowledge-base", {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: form.id || undefined,
          canonicalQuestion,
          approvedAnswer,
          category,
          language: form.language,
          status: form.status,
          priority: form.priority,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Failed to save Knowledge Base entry."
        );
      }

      setDrawerOpen(false);
      setForm(EMPTY_FORM);
      setSuccessMessage(
        isEditing
          ? "Knowledge entry updated successfully."
          : "Knowledge entry added successfully."
      );

      await loadKnowledge();
    } catch (err: any) {
      console.error("Save Knowledge Base entry error:", err);
      setError(
        err?.message || "Failed to save Knowledge Base entry."
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeEntryStatus(
    entry: KnowledgeEntry,
    action: "activate" | "deactivate" | "draft"
  ) {
    try {
      setActionLoading(`${action}:${entry.id}`);
      setError("");
      setSuccessMessage("");

      const token = await getAccessToken();

      if (!token) {
        setError("Please log in as admin first.");
        return;
      }

      const response = await fetch("/api/admin/knowledge-base", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: entry.id,
          action,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Failed to update knowledge status."
        );
      }

      setSuccessMessage(
        action === "activate"
          ? "Knowledge activated. Mona can now use this answer."
          : action === "deactivate"
          ? "Knowledge deactivated. Mona will no longer use this answer."
          : "Knowledge moved back to draft."
      );

      await loadKnowledge();
    } catch (err: any) {
      console.error("Update Knowledge Base status error:", err);
      setError(
        err?.message || "Failed to update knowledge status."
      );
    } finally {
      setActionLoading("");
    }
  }

  async function deleteEntry(entry: KnowledgeEntry) {
    const confirmed = window.confirm(
      `Delete this knowledge entry?\n\n${entry.canonical_question}`
    );

    if (!confirmed) return;

    try {
      setActionLoading(`delete:${entry.id}`);
      setError("");
      setSuccessMessage("");

      const token = await getAccessToken();

      if (!token) {
        setError("Please log in as admin first.");
        return;
      }

      const response = await fetch(
        `/api/admin/knowledge-base?id=${encodeURIComponent(entry.id)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Failed to delete Knowledge Base entry."
        );
      }

      setSuccessMessage("Knowledge entry deleted.");
      await loadKnowledge();
    } catch (err: any) {
      console.error("Delete Knowledge Base entry error:", err);
      setError(
        err?.message || "Failed to delete Knowledge Base entry."
      );
    } finally {
      setActionLoading("");
    }
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setLanguageFilter("all");
    setCategoryFilter("all");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadKnowledge();
    }, 300);

    return () => window.clearTimeout(timer);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, languageFilter, categoryFilter]);

  return (
    <main className="min-h-screen text-[#1C1C1E]">
      <section className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">
              Tetamo AI
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Mona Knowledge Centre
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              Manage the approved information Mona can use when answering
              Tetamo customers. Active knowledge is treated as the trusted
              source before Mona creates an AI-generated response.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openCreateDrawer}
              className="rounded-2xl bg-[#1C1C1E] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
            >
              + Add Knowledge
            </button>

            <button
              type="button"
              onClick={loadKnowledge}
              className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard label="Total Knowledge" value={stats.total} />
          <StatCard label="Active" value={stats.active} tone="green" />
          <StatCard label="Draft" value={stats.draft} tone="amber" />
          <StatCard label="Inactive" value={stats.inactive} tone="gray" />
          <StatCard
            label="Pending Review"
            value={stats.pendingCandidates}
            tone="purple"
          />
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}
      </section>

      <section className="mt-6 rounded-[28px] border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {TABS.map((tab) => {
            const active = activeTab === tab.value;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={[
                  "rounded-2xl border p-4 text-left transition",
                  active
                    ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                ].join(" ")}
              >
                <p className="text-sm font-bold">{tab.label}</p>

                <p
                  className={[
                    "mt-1 text-xs leading-5",
                    active ? "text-white/65" : "text-gray-400",
                  ].join(" ")}
                >
                  {tab.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {activeTab === "knowledge" ? (
        <>
          <section className="mt-6 rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px_170px_190px_auto]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search question, answer or category..."
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
              />

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="inactive">Inactive</option>
              </select>

              <select
                value={languageFilter}
                onChange={(event) =>
                  setLanguageFilter(event.target.value)
                }
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
              >
                <option value="all">All languages</option>
                <option value="id">Indonesian</option>
                <option value="en">English</option>
                <option value="both">Indonesian & English</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value)
                }
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
              >
                <option value="all">All categories</option>

                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={resetFilters}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Reset
              </button>
            </div>
          </section>

          <section className="mt-6 space-y-4">
            {loading ? (
              <div className="rounded-[28px] border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500 shadow-sm">
                Loading Mona’s knowledge...
              </div>
            ) : null}

            {!loading && filteredEntries.length === 0 ? (
              <div className="rounded-[28px] border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
                <p className="text-base font-bold text-gray-800">
                  No knowledge found
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  Add Mona’s first approved question and answer.
                </p>

                <button
                  type="button"
                  onClick={openCreateDrawer}
                  className="mt-5 rounded-2xl bg-[#1C1C1E] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
                >
                  + Add Knowledge
                </button>
              </div>
            ) : null}

            {!loading
              ? filteredEntries.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={getStatusTone(entry.status)}>
                            {cleanStatusLabel(entry.status)}
                          </Badge>

                          <Badge tone="blue">
                            {entry.language === "en"
                              ? "English"
                              : entry.language === "both"
                              ? "Indonesian & English"
                              : "Indonesian"}
                          </Badge>

                          <Badge tone="purple">
                            {entry.category || "general"}
                          </Badge>

                          <Badge tone="gray">
                            Priority {entry.priority || 0}
                          </Badge>

                          <Badge tone="gray">
                            Used {entry.usage_count || 0} times
                          </Badge>
                        </div>

                        <div className="mt-4">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
                            Customer questions
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {entry.canonical_question
                              .split("\n")
                              .map((question) => question.trim())
                              .filter(Boolean)
                              .map((question, index) => (
                                <span
                                  key={`${entry.id}-question-${index}`}
                                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold leading-5 text-gray-800"
                                >
                                  {question}
                                </span>
                              ))}
                          </div>
                        </div>

                        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
                            Mona’s Approved Answer
                          </p>

                          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-700">
                            {entry.approved_answer}
                          </p>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-400">
                          <span>
                            Updated: {formatDate(entry.updated_at)}
                          </span>

                          <span>
                            Created: {formatDate(entry.created_at)}
                          </span>

                          {entry.reviewed_at ? (
                            <span>
                              Approved: {formatDate(entry.reviewed_at)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2 xl:max-w-[260px] xl:justify-end">
                        <button
                          type="button"
                          onClick={() => openEditDrawer(entry)}
                          className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </button>

                        {entry.status !== "active" ? (
                          <button
                            type="button"
                            onClick={() =>
                              changeEntryStatus(entry, "activate")
                            }
                            disabled={Boolean(actionLoading)}
                            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                          >
                            {actionLoading ===
                            `activate:${entry.id}`
                              ? "Activating..."
                              : "Activate"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              changeEntryStatus(entry, "deactivate")
                            }
                            disabled={Boolean(actionLoading)}
                            className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-40"
                          >
                            {actionLoading ===
                            `deactivate:${entry.id}`
                              ? "Saving..."
                              : "Deactivate"}
                          </button>
                        )}

                        {entry.status !== "draft" ? (
                          <button
                            type="button"
                            onClick={() =>
                              changeEntryStatus(entry, "draft")
                            }
                            disabled={Boolean(actionLoading)}
                            className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                          >
                            Draft
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => deleteEntry(entry)}
                          disabled={Boolean(actionLoading)}
                          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40"
                        >
                          {actionLoading === `delete:${entry.id}`
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              : null}
          </section>
        </>
      ) : null}

      {activeTab === "pending" ? (
        <section className="mt-6 rounded-[28px] border border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
          <Badge tone="purple">
            {stats.pendingCandidates} waiting
          </Badge>

          <h2 className="mt-4 text-xl font-bold">
            Pending Customer Questions
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-500">
            This tab will show questions collected from real WhatsApp
            conversations. You will be able to review, edit, approve or
            reject them before Mona learns anything.
          </p>
        </section>
      ) : null}

      {activeTab === "documents" ? (
        <section className="mt-6 rounded-[28px] border border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
          <Badge tone="blue">Document Import</Badge>

          <h2 className="mt-4 text-xl font-bold">
            Import Tetamo Knowledge
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-500">
            This section will allow Tetamo to upload SOPs, FAQs,
            property guides, policies and other documents. Nothing will
            become active until an admin reviews and approves it.
          </p>
        </section>
      ) : null}

      {activeTab === "test-mona" ? (
        <section className="mt-6 rounded-[28px] border border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
          <Badge tone="green">Safe Testing Area</Badge>

          <h2 className="mt-4 text-xl font-bold">Test Mona</h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-500">
            This section will let you send a test customer question and
            see whether Mona used an approved Knowledge Base answer or
            generated a general AI response.
          </p>
        </section>
      ) : null}

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40">
          <button
            type="button"
            aria-label="Close drawer"
            onClick={closeDrawer}
            className="absolute inset-0 h-full w-full cursor-default"
          />

          <div className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
            <form onSubmit={saveKnowledge} className="min-h-full">
              <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-5 py-5 sm:px-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
                      Mona Knowledge
                    </p>

                    <h2 className="mt-2 text-xl font-bold">
                      {drawerTitle}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-gray-500">
                      Keep Mona’s answer natural, helpful and
                      conversational. Avoid making every response sound
                      overly polished or robotic.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeDrawer}
                    disabled={saving}
                    className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="space-y-5 px-5 py-6 sm:px-7">
                <div>
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                        Customer Questions
                      </label>

                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        Add the main question and other ways a customer may ask
                        the same thing. Put one question on each line.
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-[11px] font-bold text-gray-500">
                      {
                        form.canonicalQuestion
                          .split("\n")
                          .map((question) => question.trim())
                          .filter(Boolean).length
                      }{" "}
                      question(s)
                    </span>
                  </div>

                  <textarea
                    value={form.canonicalQuestion}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        canonicalQuestion: event.target.value,
                      }))
                    }
                    disabled={saving}
                    rows={6}
                    maxLength={1800}
                    placeholder={`Kenapa saya menerima pengingat pembayaran?
Saya belum menyelesaikan pembayaran
Bagaimana cara melanjutkan pembayaran?
Saya sudah bayar tetapi masih menerima pesan`}
                    className="mt-3 w-full resize-y rounded-2xl border border-gray-200 px-4 py-3 text-sm leading-7 outline-none focus:border-[#1C1C1E] disabled:bg-gray-100"
                  />

                  <div className="mt-2 flex items-center justify-between gap-4 text-xs">
                    <p className="text-gray-500">
                      Mona can match any of these question variations to the
                      approved answer below.
                    </p>

                    <p className="shrink-0 text-gray-400">
                      {form.canonicalQuestion.length}/1800
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                    Mona’s Approved Answer
                  </label>

                  <textarea
                    value={form.approvedAnswer}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        approvedAnswer: event.target.value,
                      }))
                    }
                    disabled={saving}
                    rows={9}
                    maxLength={4000}
                    placeholder="Write the answer Mona should use. Keep it clear, natural and conversational."
                    className="mt-2 w-full resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm leading-6 outline-none focus:border-[#1C1C1E] disabled:bg-gray-100"
                  />

                  <p className="mt-1 text-right text-xs text-gray-400">
                    {form.approvedAnswer.length}/4000
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                      Category
                    </label>

                    <select
                      value={form.category}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          category: event.target.value,
                        }))
                      }
                      disabled={saving}
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] disabled:bg-gray-100"
                    >
                      {categoryOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <p className="mt-1 text-xs leading-5 text-gray-400">
                      Choose the topic that best matches this answer.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                      Language
                    </label>

                    <select
                      value={form.language}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          language: event.target.value,
                        }))
                      }
                      disabled={saving}
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] disabled:bg-gray-100"
                    >
                      <option value="id">Indonesian</option>
                      <option value="en">English</option>
                      <option value="both">Indonesian & English</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                      Status
                    </label>

                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          status: event.target.value,
                        }))
                      }
                      disabled={saving}
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] disabled:bg-gray-100"
                    >
                      <option value="draft">Draft</option>
                      <option value="active">
                        Active — Mona can use it
                      </option>
                      <option value="inactive">
                        Inactive — Mona cannot use it
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                      Priority
                    </label>

                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={form.priority}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          priority: Number(event.target.value || 0),
                        }))
                      }
                      disabled={saving}
                      className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] disabled:bg-gray-100"
                    />

                    <p className="mt-1 text-xs leading-5 text-gray-400">
                      Higher priority answers are considered first.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-800">
                  Only entries marked as Active will become available to
                  Mona. Draft and inactive answers remain inside the
                  admin Knowledge Centre but cannot be used in customer
                  conversations.
                </div>
              </div>

              <div className="sticky bottom-0 border-t border-gray-100 bg-white px-5 py-4 sm:px-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={closeDrawer}
                    disabled={saving}
                    className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      saving ||
                      !form.canonicalQuestion.trim() ||
                      !form.approvedAnswer.trim()
                    }
                    className="rounded-2xl bg-[#1C1C1E] px-6 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving
                      ? "Saving..."
                      : form.id
                      ? "Save Changes"
                      : "Add Knowledge"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}