"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Globe,
  CalendarDays,
  Mail,
  Pencil,
  Save,
  X,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { useLanguage } from "@/app/context/LanguageContext";
import {
  subscriptionPolicyPageContent,
  subscriptionPolicySections,
  type LocalizedText,
  type SubscriptionPolicyMetaItem,
  type SubscriptionPolicyPageContent,
  type SubscriptionPolicySection,
} from "@/app/data/subscription-policy-content";

function cloneLocalizedText(value: LocalizedText): LocalizedText {
  return {
    id: value.id,
    en: value.en,
  };
}

function clonePageContent(
  value: SubscriptionPolicyPageContent
): SubscriptionPolicyPageContent {
  return {
    title: cloneLocalizedText(value.title),
    summary: cloneLocalizedText(value.summary),
    metadata: value.metadata.map((item) => ({
      key: item.key,
      label: cloneLocalizedText(item.label),
      value: cloneLocalizedText(item.value),
    })),
  };
}

function cloneSections(
  value: SubscriptionPolicySection[]
): SubscriptionPolicySection[] {
  return value.map((section) => ({
    id: section.id,
    level: section.level,
    title: cloneLocalizedText(section.title),
    body: cloneLocalizedText(section.body),
  }));
}

function normalizeRole(role?: string | null) {
  return (role || "").toLowerCase().replace(/\s+/g, "_");
}

function isAdminRole(role?: string | null) {
  const normalized = normalizeRole(role);
  return (
    normalized === "admin" ||
    normalized === "super_admin" ||
    normalized === "superadmin"
  );
}

export default function SubscriptionPolicyPage() {
  const { lang } = useLanguage();

  const [pageContent, setPageContent] = useState<SubscriptionPolicyPageContent>(
    () => clonePageContent(subscriptionPolicyPageContent)
  );
  const [draftPageContent, setDraftPageContent] =
    useState<SubscriptionPolicyPageContent>(() =>
      clonePageContent(subscriptionPolicyPageContent)
    );

  const [sections, setSections] = useState<SubscriptionPolicySection[]>(() =>
    cloneSections(subscriptionPolicySections)
  );
  const [draftSections, setDraftSections] = useState<
    SubscriptionPolicySection[]
  >(() => cloneSections(subscriptionPolicySections));

  const [openSections, setOpenSections] = useState<string[]>(["1"]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const t = (value: LocalizedText) => (lang === "id" ? value.id : value.en);

  const ui = useMemo(
    () => ({
      backToHome: lang === "id" ? "Kembali ke Beranda" : "Back to Home",
      policyType: lang === "id" ? "Kebijakan Platform" : "Platform Policy",
      readOnly: lang === "id" ? "Mode Baca" : "Read Only",
      viewerModeText:
        lang === "id"
          ? "Pengunjung hanya dapat membaca halaman ini."
          : "Viewers can only read this page.",
      adminModeText:
        lang === "id"
          ? "Admin dapat mengedit konten halaman ini."
          : "Admins can edit this page content.",
      edit: lang === "id" ? "Edit" : "Edit",
      save: lang === "id" ? "Simpan" : "Save",
      cancel: lang === "id" ? "Batal" : "Cancel",
      editingNote:
        lang === "id"
          ? "Mode edit lokal aktif untuk pratinjau admin."
          : "Local edit mode is active for admin preview.",
      sectionLabel: lang === "id" ? "Bagian Kebijakan" : "Policy Sections",
      titleLabel: lang === "id" ? "Judul" : "Title",
      summaryLabel: lang === "id" ? "Ringkasan" : "Summary",
      bodyLabel: lang === "id" ? "Isi" : "Body",
      indonesianLabel: "ID",
      englishLabel: "EN",
      adminChecking:
        lang === "id"
          ? "Memeriksa akses admin..."
          : "Checking admin access...",
    }),
    [lang]
  );

  useEffect(() => {
    let mounted = true;

    async function checkAdminAccess() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          if (mounted) {
            setIsAdmin(false);
            setCheckingAdmin(false);
          }
          return;
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (!user) {
          setIsAdmin(false);
          setCheckingAdmin(false);
          return;
        }

        const directRoles = [
          normalizeRole(user.app_metadata?.role),
          normalizeRole(user.user_metadata?.role),
        ];

        if (directRoles.some((role) => isAdminRole(role))) {
          setIsAdmin(true);
          setCheckingAdmin(false);
          return;
        }

        const tablesToCheck = ["profiles", "users"];

        for (const tableName of tablesToCheck) {
          const { data, error } = await supabase
            .from(tableName)
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

          if (!error && data?.role && isAdminRole(data.role)) {
            if (!mounted) return;
            setIsAdmin(true);
            setCheckingAdmin(false);
            return;
          }
        }

        if (mounted) {
          setIsAdmin(false);
          setCheckingAdmin(false);
        }
      } catch {
        if (mounted) {
          setIsAdmin(false);
          setCheckingAdmin(false);
        }
      }
    }

    checkAdminAccess();

    return () => {
      mounted = false;
    };
  }, []);

  const toggleSection = (id: string) => {
    setOpenSections((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const startEditing = () => {
    setDraftPageContent(clonePageContent(pageContent));
    setDraftSections(cloneSections(sections));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraftPageContent(clonePageContent(pageContent));
    setDraftSections(cloneSections(sections));
    setIsEditing(false);
  };

  const saveEditing = () => {
    setPageContent(clonePageContent(draftPageContent));
    setSections(cloneSections(draftSections));
    setIsEditing(false);
  };

  const updatePageLocalizedField = (
    field: "title" | "summary",
    langKey: "id" | "en",
    value: string
  ) => {
    setDraftPageContent((current) => ({
      ...current,
      [field]: {
        ...current[field],
        [langKey]: value,
      },
    }));
  };

  const updateMetaField = (
    index: number,
    type: "label" | "value",
    langKey: "id" | "en",
    value: string
  ) => {
    setDraftPageContent((current) => ({
      ...current,
      metadata: current.metadata.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [type]: {
                ...item[type],
                [langKey]: value,
              },
            }
          : item
      ),
    }));
  };

  const updateSectionField = (
    sectionId: string,
    type: "title" | "body",
    langKey: "id" | "en",
    value: string
  ) => {
    setDraftSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              [type]: {
                ...section[type],
                [langKey]: value,
              },
            }
          : section
      )
    );
  };

  const visiblePageContent = isEditing ? draftPageContent : pageContent;
  const visibleSections = isEditing ? draftSections : sections;

  const renderMetaValue = (item: SubscriptionPolicyMetaItem) => {
    const value = t(item.value);

    if (isEditing) {
      const metaIndex = visiblePageContent.metadata.findIndex(
        (metaItem) => metaItem.key === item.key
      );

      return (
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
              {ui.indonesianLabel}
            </div>
            <input
              value={visiblePageContent.metadata[metaIndex].value.id}
              onChange={(e) =>
                updateMetaField(metaIndex, "value", "id", e.target.value)
              }
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
            />
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
              {ui.englishLabel}
            </div>
            <input
              value={visiblePageContent.metadata[metaIndex].value.en}
              onChange={(e) =>
                updateMetaField(metaIndex, "value", "en", e.target.value)
              }
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
            />
          </div>
        </div>
      );
    }

    if (item.key === "website") {
      return (
        <Link
          href={`https://${value.replace(/^https?:\/\//, "")}`}
          target="_blank"
          className="break-all text-sm font-medium text-gray-900 underline underline-offset-4"
        >
          {value}
        </Link>
      );
    }

    if (item.key === "contactEmail") {
      return (
        <Link
          href={`mailto:${value}`}
          className="break-all text-sm font-medium text-gray-900 underline underline-offset-4"
        >
          {value}
        </Link>
      );
    }

    return <p className="text-sm font-medium text-gray-900">{value}</p>;
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111111]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-black"
          >
            {ui.backToHome}
          </Link>
        </div>

        <div className="overflow-hidden rounded-[32px] border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white px-5 py-8 sm:px-8">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600">
                {ui.policyType}
              </span>

              <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600">
                {ui.readOnly}
              </span>

              {checkingAdmin ? (
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600">
                  {ui.adminChecking}
                </span>
              ) : isAdmin ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {ui.adminModeText}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600">
                  {ui.viewerModeText}
                </span>
              )}
            </div>

            <div className="space-y-5">
              {isEditing ? (
                <>
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                      {ui.titleLabel} · {ui.indonesianLabel}
                    </div>
                    <input
                      value={visiblePageContent.title.id}
                      onChange={(e) =>
                        updatePageLocalizedField("title", "id", e.target.value)
                      }
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-2xl font-semibold outline-none focus:border-gray-400"
                    />
                  </div>

                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                      {ui.titleLabel} · {ui.englishLabel}
                    </div>
                    <input
                      value={visiblePageContent.title.en}
                      onChange={(e) =>
                        updatePageLocalizedField("title", "en", e.target.value)
                      }
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-lg font-medium outline-none focus:border-gray-400"
                    />
                  </div>

                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                      {ui.summaryLabel} · {ui.indonesianLabel}
                    </div>
                    <textarea
                      value={visiblePageContent.summary.id}
                      onChange={(e) =>
                        updatePageLocalizedField("summary", "id", e.target.value)
                      }
                      rows={3}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
                    />
                  </div>

                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                      {ui.summaryLabel} · {ui.englishLabel}
                    </div>
                    <textarea
                      value={visiblePageContent.summary.en}
                      onChange={(e) =>
                        updatePageLocalizedField("summary", "en", e.target.value)
                      }
                      rows={3}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
                    />
                  </div>
                </>
              ) : (
                <>
                  <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-[#111111] sm:text-4xl">
                    {t(visiblePageContent.title)}
                  </h1>
                  <p className="max-w-3xl text-sm leading-7 text-gray-600 sm:text-base">
                    {t(visiblePageContent.summary)}
                  </p>
                </>
              )}
            </div>

            {isAdmin && (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {!isEditing ? (
                  <button
                    onClick={startEditing}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#111111] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    <Pencil className="h-4 w-4" />
                    {ui.edit}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={saveEditing}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#111111] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                    >
                      <Save className="h-4 w-4" />
                      {ui.save}
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:text-black"
                    >
                      <X className="h-4 w-4" />
                      {ui.cancel}
                    </button>
                    <span className="text-sm text-gray-500">
                      {ui.editingNote}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="border-b border-gray-200 px-5 py-6 sm:px-8">
            <div className="grid gap-4 md:grid-cols-3">
              {visiblePageContent.metadata.map((item, index) => {
                const labelText = t(item.label);
                const icon =
                  item.key === "effectiveDate" ? (
                    <CalendarDays className="h-5 w-5 text-gray-500" />
                  ) : item.key === "website" ? (
                    <Globe className="h-5 w-5 text-gray-500" />
                  ) : (
                    <Mail className="h-5 w-5 text-gray-500" />
                  );

                return (
                  <div
                    key={item.key}
                    className="rounded-[24px] border border-gray-200 bg-gray-50 p-5"
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <div className="rounded-2xl border border-gray-200 bg-white p-2">
                        {icon}
                      </div>
                      {isEditing ? (
                        <div className="w-full space-y-3">
                          <div>
                            <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                              {ui.indonesianLabel}
                            </div>
                            <input
                              value={visiblePageContent.metadata[index].label.id}
                              onChange={(e) =>
                                updateMetaField(
                                  index,
                                  "label",
                                  "id",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
                            />
                          </div>
                          <div>
                            <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                              {ui.englishLabel}
                            </div>
                            <input
                              value={visiblePageContent.metadata[index].label.en}
                              onChange={(e) =>
                                updateMetaField(
                                  index,
                                  "label",
                                  "en",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                            {labelText}
                          </p>
                        </div>
                      )}
                    </div>

                    {renderMetaValue(item)}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-5 py-6 sm:px-8">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[#111111]">
                {ui.sectionLabel}
              </h2>
            </div>

            <div className="space-y-4">
              {visibleSections.map((section) => {
                const isOpen = openSections.includes(section.id);
                const isSubSection = section.level === 2;

                return (
                  <div
                    key={section.id}
                    className={`overflow-hidden rounded-[28px] border border-gray-200 bg-white ${
                      isSubSection ? "ml-0 sm:ml-6" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
                    >
                      <div className="min-w-0">
                        <h3
                          className={`font-semibold text-[#111111] ${
                            isSubSection ? "text-base" : "text-lg"
                          }`}
                        >
                          {t(section.title)}
                        </h3>
                      </div>

                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-gray-500 transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="border-t border-gray-200 bg-gray-50 px-5 py-5 sm:px-6">
                        {isEditing ? (
                          <div className="space-y-5">
                            <div className="grid gap-4 lg:grid-cols-2">
                              <div>
                                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                                  {ui.titleLabel} · {ui.indonesianLabel}
                                </div>
                                <input
                                  value={section.title.id}
                                  onChange={(e) =>
                                    updateSectionField(
                                      section.id,
                                      "title",
                                      "id",
                                      e.target.value
                                    )
                                  }
                                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
                                />
                              </div>

                              <div>
                                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                                  {ui.titleLabel} · {ui.englishLabel}
                                </div>
                                <input
                                  value={section.title.en}
                                  onChange={(e) =>
                                    updateSectionField(
                                      section.id,
                                      "title",
                                      "en",
                                      e.target.value
                                    )
                                  }
                                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
                                />
                              </div>
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                              <div>
                                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                                  {ui.bodyLabel} · {ui.indonesianLabel}
                                </div>
                                <textarea
                                  value={section.body.id}
                                  onChange={(e) =>
                                    updateSectionField(
                                      section.id,
                                      "body",
                                      "id",
                                      e.target.value
                                    )
                                  }
                                  rows={10}
                                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
                                />
                              </div>

                              <div>
                                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                                  {ui.bodyLabel} · {ui.englishLabel}
                                </div>
                                <textarea
                                  value={section.body.en}
                                  onChange={(e) =>
                                    updateSectionField(
                                      section.id,
                                      "body",
                                      "en",
                                      e.target.value
                                    )
                                  }
                                  rows={10}
                                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="whitespace-pre-line text-sm leading-7 text-gray-700">
                            {t(section.body)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}