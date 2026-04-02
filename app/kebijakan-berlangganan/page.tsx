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
  const [isEditing, setIsEditing] = useState(false);

  const t = (value: LocalizedText) => (lang === "id" ? value.id : value.en);

  const ui = useMemo(
    () => ({
      backToHome: lang === "id" ? "Kembali ke Beranda" : "Back to Home",
      policyType: lang === "id" ? "Kebijakan Platform" : "Platform Policy",
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
      quickOverview: lang === "id" ? "Ringkasan" : "Overview",
      quickOverviewText:
        lang === "id"
          ? "Klik setiap bagian untuk membuka isi kebijakan berlangganan."
          : "Click each section to open the subscription policy content.",
      lastUpdated: lang === "id" ? "Terakhir diperbarui" : "Last updated",
      stillNeedHelp: lang === "id" ? "Masih butuh bantuan?" : "Still need help?",
      stillNeedHelpText:
        lang === "id"
          ? "Jika Anda memiliki pertanyaan terkait kebijakan berlangganan, silakan hubungi kami."
          : "If you have questions regarding the subscription policy, please contact us.",
    }),
    [lang]
  );

  const lastUpdated = useMemo(
    () => ({
      id: "26 Maret 2026",
      en: "26 March 2026",
    }),
    []
  );

  useEffect(() => {
    let mounted = true;

    async function checkAdminAccess() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          if (mounted) setIsAdmin(false);
          return;
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (!user) {
          setIsAdmin(false);
          return;
        }

        const directRoles = [
          normalizeRole(user.app_metadata?.role),
          normalizeRole(user.user_metadata?.role),
        ];

        if (directRoles.some((role) => isAdminRole(role))) {
          setIsAdmin(true);
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
            return;
          }
        }

        if (mounted) setIsAdmin(false);
      } catch {
        if (mounted) setIsAdmin(false);
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
    key: string,
    type: "label" | "value",
    langKey: "id" | "en",
    value: string
  ) => {
    setDraftPageContent((current) => ({
      ...current,
      metadata: current.metadata.map((item) =>
        item.key === key
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

  const visibleMetadata = visiblePageContent.metadata.filter(
    (item) => item.key !== "contactEmail"
  );

  const contactEmailValue =
    visiblePageContent.metadata.find((item) => item.key === "contactEmail")
      ?.value ?? {
      id: "support@tetamo.com",
      en: "support@tetamo.com",
    };

  const inputClass =
    "w-full rounded-2xl border border-gray-200 bg-white px-3.5 py-2.5 text-[13px] text-gray-900 outline-none focus:border-gray-400 sm:px-4 sm:py-3 sm:text-sm";

  const renderMetaValue = (item: SubscriptionPolicyMetaItem) => {
    const value = t(item.value);

    if (isEditing) {
      return (
        <div className="space-y-3">
          <div>
            <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-500 sm:text-[10px]">
              {ui.indonesianLabel}
            </div>
            <input
              value={item.value.id}
              onChange={(e) =>
                updateMetaField(item.key, "value", "id", e.target.value)
              }
              className={inputClass}
            />
          </div>

          <div>
            <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-500 sm:text-[10px]">
              {ui.englishLabel}
            </div>
            <input
              value={item.value.en}
              onChange={(e) =>
                updateMetaField(item.key, "value", "en", e.target.value)
              }
              className={inputClass}
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
          className="break-all text-[13px] font-medium text-gray-900 underline underline-offset-4 sm:text-sm"
        >
          {value}
        </Link>
      );
    }

    if (item.key === "contactEmail") {
      return (
        <Link
          href={`mailto:${value}`}
          className="break-all text-[13px] font-medium text-gray-900 underline underline-offset-4 sm:text-sm"
        >
          {value}
        </Link>
      );
    }

    return <p className="text-[13px] font-medium text-gray-900 sm:text-sm">{value}</p>;
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111111]">
      <div className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
        <div className="mb-4 sm:mb-5">
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3.5 py-2 text-[11px] font-medium text-gray-700 transition hover:border-gray-300 hover:text-black sm:px-4 sm:text-sm"
          >
            {ui.backToHome}
          </Link>
        </div>

        <div className="overflow-hidden rounded-[20px] border border-gray-200 bg-white shadow-sm sm:rounded-[24px] lg:rounded-[28px]">
          <div className="border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-600 sm:text-[10px]">
                {ui.policyType}
              </span>
            </div>

            <div className="space-y-3.5 sm:space-y-4.5">
              {isEditing ? (
                <>
                  <div>
                    <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-500 sm:text-[10px]">
                      {ui.titleLabel} · {ui.indonesianLabel}
                    </div>
                    <input
                      value={visiblePageContent.title.id}
                      onChange={(e) =>
                        updatePageLocalizedField("title", "id", e.target.value)
                      }
                      className={`${inputClass} text-base font-semibold sm:text-lg lg:text-xl`}
                    />
                  </div>

                  <div>
                    <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-500 sm:text-[10px]">
                      {ui.titleLabel} · {ui.englishLabel}
                    </div>
                    <input
                      value={visiblePageContent.title.en}
                      onChange={(e) =>
                        updatePageLocalizedField("title", "en", e.target.value)
                      }
                      className={`${inputClass} font-medium`}
                    />
                  </div>

                  <div>
                    <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-500 sm:text-[10px]">
                      {ui.summaryLabel} · {ui.indonesianLabel}
                    </div>
                    <textarea
                      value={visiblePageContent.summary.id}
                      onChange={(e) =>
                        updatePageLocalizedField("summary", "id", e.target.value)
                      }
                      rows={4}
                      className={`${inputClass} min-h-[110px] resize-y py-3`}
                    />
                  </div>

                  <div>
                    <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-500 sm:text-[10px]">
                      {ui.summaryLabel} · {ui.englishLabel}
                    </div>
                    <textarea
                      value={visiblePageContent.summary.en}
                      onChange={(e) =>
                        updatePageLocalizedField("summary", "en", e.target.value)
                      }
                      rows={4}
                      className={`${inputClass} min-h-[110px] resize-y py-3`}
                    />
                  </div>
                </>
              ) : (
                <>
                  <h1 className="max-w-4xl text-[1.35rem] font-semibold leading-tight tracking-tight text-[#111111] sm:text-[1.9rem] lg:text-[2.35rem]">
                    {t(visiblePageContent.title)}
                  </h1>
                  <p className="max-w-3xl text-[13px] leading-6 text-gray-600 sm:text-[14px] sm:leading-7 lg:text-[15px]">
                    {t(visiblePageContent.summary)}
                  </p>
                </>
              )}
            </div>

            {isAdmin && (
              <div className="mt-4 flex flex-wrap items-center gap-2.5 sm:mt-5 sm:gap-3">
                {!isEditing ? (
                  <button
                    onClick={startEditing}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#111111] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:opacity-90 sm:text-sm"
                  >
                    <Pencil className="h-4 w-4" />
                    {ui.edit}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={saveEditing}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#111111] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:opacity-90 sm:text-sm"
                    >
                      <Save className="h-4 w-4" />
                      {ui.save}
                    </button>

                    <button
                      onClick={cancelEditing}
                      className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-gray-700 transition hover:border-gray-300 hover:text-black sm:text-sm"
                    >
                      <X className="h-4 w-4" />
                      {ui.cancel}
                    </button>

                    <span className="text-[11px] text-gray-500 sm:text-xs">
                      {ui.editingNote}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="border-b border-gray-200 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
              {visibleMetadata.map((item) => {
                const labelText = t(item.label);

                const icon =
                  item.key === "effectiveDate" ? (
                    <CalendarDays className="h-4 w-4 text-gray-500 sm:h-[18px] sm:w-[18px]" />
                  ) : item.key === "website" ? (
                    <Globe className="h-4 w-4 text-gray-500 sm:h-[18px] sm:w-[18px]" />
                  ) : (
                    <Mail className="h-4 w-4 text-gray-500 sm:h-[18px] sm:w-[18px]" />
                  );

                return (
                  <div
                    key={item.key}
                    className="rounded-[18px] border border-gray-200 bg-gray-50 p-4 sm:rounded-[22px] sm:p-5"
                  >
                    <div className="mb-3 flex items-start gap-3">
                      <div className="rounded-2xl border border-gray-200 bg-white p-2">
                        {icon}
                      </div>

                      {isEditing ? (
                        <div className="w-full space-y-3">
                          <div>
                            <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-500 sm:text-[10px]">
                              {ui.indonesianLabel}
                            </div>
                            <input
                              value={item.label.id}
                              onChange={(e) =>
                                updateMetaField(
                                  item.key,
                                  "label",
                                  "id",
                                  e.target.value
                                )
                              }
                              className={inputClass}
                            />
                          </div>

                          <div>
                            <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-500 sm:text-[10px]">
                              {ui.englishLabel}
                            </div>
                            <input
                              value={item.label.en}
                              onChange={(e) =>
                                updateMetaField(
                                  item.key,
                                  "label",
                                  "en",
                                  e.target.value
                                )
                              }
                              className={inputClass}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="min-w-0">
                          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-500 sm:text-[10px]">
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

          <div className="border-b border-gray-200 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
            <div className="rounded-[18px] border border-gray-200 bg-gray-50 p-4 sm:rounded-[22px] sm:p-5">
              <div className="text-[14px] font-semibold text-[#111111] sm:text-[15px]">
                {ui.quickOverview}
              </div>
              <p className="mt-2 text-[13px] leading-6 text-gray-600 sm:text-sm">
                {ui.quickOverviewText}
              </p>
              <div className="mt-3 text-[11px] text-gray-600 sm:mt-4 sm:text-xs">
                {ui.lastUpdated}: {t(lastUpdated)}
              </div>
            </div>
          </div>

          <div className="px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
            <div className="mb-4">
              <h2 className="text-[15px] font-semibold text-[#111111] sm:text-base lg:text-lg">
                {ui.sectionLabel}
              </h2>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {visibleSections.map((section) => {
                const isOpen = openSections.includes(section.id);
                const isSubSection = section.level === 2;

                return (
                  <div
                    key={section.id}
                    className={`overflow-hidden rounded-[18px] border border-gray-200 bg-white sm:rounded-[22px] lg:rounded-[24px] ${
                      isSubSection ? "ml-0 md:ml-5" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left sm:px-5 sm:py-4.5 lg:px-6"
                    >
                      <div className="min-w-0">
                        <h3
                          className={`leading-6 font-semibold text-[#111111] ${
                            isSubSection
                              ? "text-[13px] sm:text-[14px] lg:text-[15px]"
                              : "text-[13px] sm:text-[15px] lg:text-[17px]"
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
                      <div className="border-t border-gray-200 bg-gray-50 px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
                        {isEditing ? (
                          <div className="space-y-4">
                            <div className="grid gap-4 lg:grid-cols-2">
                              <div>
                                <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-500 sm:text-[10px]">
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
                                  className={inputClass}
                                />
                              </div>

                              <div>
                                <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-500 sm:text-[10px]">
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
                                  className={inputClass}
                                />
                              </div>
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                              <div>
                                <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-500 sm:text-[10px]">
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
                                  className={`${inputClass} min-h-[220px] resize-y py-3`}
                                />
                              </div>

                              <div>
                                <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-500 sm:text-[10px]">
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
                                  className={`${inputClass} min-h-[220px] resize-y py-3`}
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="whitespace-pre-line text-[13px] leading-6 text-gray-700 sm:text-sm sm:leading-7">
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

        <div className="mt-6 rounded-[20px] border border-gray-200 bg-white p-4 shadow-sm sm:mt-8 sm:rounded-[24px] sm:p-5 lg:p-6">
          <div className="text-[15px] font-semibold text-[#111111] sm:text-base lg:text-lg">
            {ui.stillNeedHelp}
          </div>
          <p className="mt-2 text-[13px] leading-6 text-gray-600 sm:text-sm">
            {ui.stillNeedHelpText}
          </p>
          <p className="mt-4 break-all text-[13px] font-semibold text-[#111111] sm:text-sm">
            {t(contactEmailValue)}
          </p>
        </div>
      </div>
    </div>
  );
}