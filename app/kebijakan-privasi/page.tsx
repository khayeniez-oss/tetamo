"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/app/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import {
  PRIVACY_POLICY_SECTIONS,
  type PrivacyPolicySection,
} from "../data/privacy-policy-content";

type LocalizedText = {
  id: string;
  en: string;
};

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

export default function PrivacyPolicyPage() {
  const { lang } = useLanguage();
  const isID = lang === "id";

  const [isAdmin, setIsAdmin] = useState(false);
  const [openId, setOpenId] = useState<string>("intro");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState<LocalizedText>({
    id: "Tetamo.com",
    en: "Tetamo.com",
  });

  const [effectiveDate, setEffectiveDate] = useState<LocalizedText>({
    id: "1 Desember 2024",
    en: "December 1, 2024",
  });

  const [contactEmail, setContactEmail] = useState("support@tetamo.com");

  const [sections, setSections] = useState<PrivacyPolicySection[]>(
    PRIVACY_POLICY_SECTIONS
  );

  const lastUpdated = useMemo(
    () => ({
      id: "26 Maret 2026",
      en: "26 March 2026",
    }),
    []
  );

  const t = {
    title: isID ? "Kebijakan Privasi" : "Privacy Policy",
    subtitle: isID
      ? "Silakan baca setiap bagian di bawah ini untuk memahami bagaimana Tetamo.com mengumpulkan, menggunakan, menyimpan, dan membagikan informasi pribadi Anda."
      : "Please read each section below to understand how Tetamo.com collects, uses, stores, and shares your personal information.",

    pageNote: isID
      ? "Halaman ini bersifat publik untuk dibaca. Edit hanya untuk admin."
      : "This page is public for reading. Editing is for admin only.",

    lastUpdated: isID ? "Terakhir diperbarui" : "Last updated",
    effectiveDate: isID ? "Tanggal berlaku" : "Effective date",
    contactEmail: isID ? "Email kontak" : "Contact email",
    companyName: isID ? "Nama perusahaan" : "Company name",

    adminMode: isID ? "Mode edit admin aktif" : "Admin edit mode active",
    editSection: isID ? "Edit Bagian" : "Edit Section",
    doneEditing: isID ? "Selesai Edit" : "Done Editing",

    quickOverview: isID ? "Ringkasan" : "Overview",
    quickOverviewText: isID
      ? "Klik setiap bagian untuk membuka isi kebijakan privasi."
      : "Click each section to open the contents of the privacy policy.",

    publicReadOnly: isID
      ? "Viewer hanya bisa membaca halaman ini."
      : "Viewers can only read this page.",
    adminCanEdit: isID
      ? "Admin bisa mengedit isi setiap bagian."
      : "Admin can edit the content of each section.",

    stillNeedHelp: isID ? "Masih butuh bantuan?" : "Still need help?",
    stillNeedHelpText: isID
      ? "Jika Anda memiliki pertanyaan atau keluhan terkait privasi dan data pribadi, silakan hubungi kami."
      : "If you have questions or complaints regarding privacy and personal data, please contact us.",

    bodyPlaceholder: isID ? "Tulis isi bagian" : "Write section content",
    titlePlaceholder: isID ? "Tulis judul bagian" : "Write section title",
  };

  useEffect(() => {
    let mounted = true;

    async function loadAdminStatus() {
      try {
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

        if (!mounted) return;
        setIsAdmin(false);
      } catch {
        if (!mounted) return;
        setIsAdmin(false);
      }
    }

    loadAdminStatus();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadAdminStatus();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  function getText(text: LocalizedText) {
    return isID ? text.id : text.en;
  }

  function applyTokens(value: string) {
    return value
      .replaceAll("{{companyName}}", getText(companyName))
      .replaceAll("{{effectiveDate}}", getText(effectiveDate))
      .replaceAll("{{contactEmail}}", contactEmail);
  }

  function updateSectionField(
    id: string,
    field: "title" | "body",
    value: string
  ) {
    setSections((prev) =>
      prev.map((section) =>
        section.id === id
          ? {
              ...section,
              [field]: {
                ...section[field],
                [isID ? "id" : "en"]: value,
              },
            }
          : section
      )
    );
  }

  function toggleSection(id: string) {
    setOpenId((prev) => (prev === id ? "" : id));
    setEditingId((prev) => (prev === id ? prev : null));
  }

  const inputClass =
    "w-full rounded-2xl border border-gray-200 bg-white px-3.5 py-2.5 text-[13px] text-[#1C1C1E] outline-none focus:border-gray-400 sm:px-4 sm:py-3 sm:text-sm";

  return (
    <main className="min-h-screen bg-[#fafafa] text-[#1C1C1E]">
      <div className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
        <div className="mb-6 sm:mb-8 lg:mb-10">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white sm:h-11 sm:w-11">
              <ShieldIcon />
            </div>

            <div className="min-w-0">
              <h1 className="text-[1.4rem] font-semibold leading-tight tracking-tight sm:text-[2rem] lg:text-[2.5rem]">
                {t.title}
              </h1>

              <p className="mt-2 max-w-3xl text-[13px] leading-6 text-gray-600 sm:mt-3 sm:text-[14px] sm:leading-7 lg:text-[15px]">
                {t.subtitle}
              </p>

              <p className="mt-2 text-[11px] text-gray-500 sm:text-xs">
                {t.pageNote}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-[20px] border border-gray-200 bg-white p-4 shadow-sm sm:rounded-[24px] sm:p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 sm:text-[12px]">
              {t.companyName}
            </div>

            {isAdmin ? (
              <input
                value={getText(companyName)}
                onChange={(e) =>
                  setCompanyName((prev) => ({
                    ...prev,
                    [isID ? "id" : "en"]: e.target.value,
                  }))
                }
                className={`${inputClass} mt-3`}
              />
            ) : (
              <div className="mt-3 break-words text-[14px] font-semibold text-[#1C1C1E] sm:text-[15px] lg:text-base">
                {getText(companyName)}
              </div>
            )}
          </div>

          <div className="rounded-[20px] border border-gray-200 bg-white p-4 shadow-sm sm:rounded-[24px] sm:p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 sm:text-[12px]">
              {t.effectiveDate}
            </div>

            {isAdmin ? (
              <input
                value={getText(effectiveDate)}
                onChange={(e) =>
                  setEffectiveDate((prev) => ({
                    ...prev,
                    [isID ? "id" : "en"]: e.target.value,
                  }))
                }
                className={`${inputClass} mt-3`}
              />
            ) : (
              <div className="mt-3 break-words text-[14px] font-semibold text-[#1C1C1E] sm:text-[15px] lg:text-base">
                {getText(effectiveDate)}
              </div>
            )}
          </div>

          <div className="rounded-[20px] border border-gray-200 bg-white p-4 shadow-sm sm:rounded-[24px] sm:p-5 sm:col-span-2 xl:col-span-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 sm:text-[12px]">
              {t.contactEmail}
            </div>

            {isAdmin ? (
              <input
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className={`${inputClass} mt-3`}
              />
            ) : (
              <div className="mt-3 break-all text-[14px] font-semibold text-[#1C1C1E] sm:text-[15px] lg:text-base">
                {contactEmail}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-[20px] border border-gray-200 bg-gray-50 p-4 sm:mt-5 sm:rounded-[24px] sm:p-5">
          <div className="text-[14px] font-semibold text-[#1C1C1E] sm:text-[15px]">
            {t.quickOverview}
          </div>

          <p className="mt-2 text-[13px] leading-6 text-gray-600 sm:text-sm">
            {t.quickOverviewText}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-gray-600 sm:mt-4 sm:text-xs">
            <span>{t.publicReadOnly}</span>
            {isAdmin && <span>{t.adminCanEdit}</span>}
            {isAdmin && <span>{t.adminMode}</span>}
            <span>
              {t.lastUpdated}: {getText(lastUpdated)}
            </span>
          </div>
        </div>

        <div className="mt-6 space-y-3 sm:mt-8 sm:space-y-4">
          {sections.map((section) => {
            const isOpen = openId === section.id;
            const isEditing = editingId === section.id;

            return (
              <div
                key={section.id}
                className="overflow-hidden rounded-[20px] border border-gray-200 bg-white shadow-sm sm:rounded-[24px]"
              >
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-gray-50 sm:px-5 sm:py-4.5 lg:px-6"
                >
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold leading-6 text-[#1C1C1E] sm:text-[15px] lg:text-[17px]">
                      {getText(section.title)}
                    </div>
                  </div>

                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-[#1C1C1E] sm:h-10 sm:w-10">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className={`transition-transform duration-200 ${
                        isOpen ? "rotate-180" : "rotate-0"
                      }`}
                    >
                      <path
                        d="M6 9l6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5 lg:px-6">
                    <div className="whitespace-pre-line rounded-[18px] bg-gray-50 px-4 py-4 text-[13px] leading-6 text-gray-700 sm:rounded-[22px] sm:px-5 sm:py-5 sm:text-sm sm:leading-7">
                      {applyTokens(getText(section.body))}
                    </div>

                    {isAdmin && (
                      <div className="mt-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingId((prev) =>
                                prev === section.id ? null : section.id
                              )
                            }
                            className="rounded-full border border-gray-200 px-4 py-2 text-[13px] font-semibold text-[#1C1C1E] transition hover:bg-gray-50 sm:text-sm"
                          >
                            {isEditing ? t.doneEditing : t.editSection}
                          </button>
                        </div>

                        {isEditing && (
                          <div className="mt-4 space-y-4 rounded-[18px] border border-gray-200 bg-white p-4 sm:rounded-[22px] sm:p-5">
                            <input
                              value={getText(section.title)}
                              onChange={(e) =>
                                updateSectionField(
                                  section.id,
                                  "title",
                                  e.target.value
                                )
                              }
                              placeholder={t.titlePlaceholder}
                              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[13px] font-semibold text-[#1C1C1E] outline-none focus:border-gray-400 sm:text-sm"
                            />

                            <textarea
                              value={getText(section.body)}
                              onChange={(e) =>
                                updateSectionField(
                                  section.id,
                                  "body",
                                  e.target.value
                                )
                              }
                              placeholder={t.bodyPlaceholder}
                              className="min-h-[220px] w-full resize-y rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-[13px] leading-6 text-gray-700 outline-none focus:border-gray-400 sm:min-h-[240px] sm:text-sm sm:leading-7"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-[20px] border border-gray-200 bg-white p-4 shadow-sm sm:mt-10 sm:rounded-[24px] sm:p-5 lg:p-6">
          <div className="text-[15px] font-semibold text-[#1C1C1E] sm:text-base lg:text-lg">
            {t.stillNeedHelp}
          </div>

          <p className="mt-2 text-[13px] leading-6 text-gray-600 sm:text-sm">
            {t.stillNeedHelpText}
          </p>

          <p className="mt-4 break-all text-[13px] font-semibold text-[#1C1C1E] sm:text-sm">
            {contactEmail}
          </p>
        </div>

        <div className="h-8 sm:h-10 lg:h-12" />
      </div>
    </main>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      className="text-[#1C1C1E]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 3L19 6V11C19 16 15.8 20.5 12 22C8.2 20.5 5 16 5 11V6L12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 12.5L11.2 14.2L14.8 10.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}