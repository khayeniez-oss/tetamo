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

        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (!mounted) return;
        setIsAdmin(data?.role === "admin");
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

  return (
    <main className="min-h-screen bg-white text-[#1C1C1E]">
      <div className="mx-auto max-w-6xl px-6 py-14 md:px-8 md:py-16">
        <div className="mb-10 md:mb-12">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50">
              <ShieldIcon />
            </div>

            <div>
              <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
                {t.title}
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600 md:text-lg">
                {t.subtitle}
              </p>
              <p className="mt-2 text-sm text-gray-500">{t.pageNote}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-gray-500">
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
                className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
              />
            ) : (
              <div className="mt-3 text-lg font-semibold text-[#1C1C1E]">
                {getText(companyName)}
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-gray-500">
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
                className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
              />
            ) : (
              <div className="mt-3 text-lg font-semibold text-[#1C1C1E]">
                {getText(effectiveDate)}
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-gray-500">
              {t.contactEmail}
            </div>
            {isAdmin ? (
              <input
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
              />
            ) : (
              <div className="mt-3 text-lg font-semibold text-[#1C1C1E]">
                {contactEmail}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-[28px] border border-gray-200 bg-gray-50 p-6">
          <div className="text-sm font-semibold text-[#1C1C1E]">
            {t.quickOverview}
          </div>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            {t.quickOverviewText}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <span>{t.publicReadOnly}</span>
            {isAdmin && <span>{t.adminCanEdit}</span>}
            {isAdmin && <span>{t.adminMode}</span>}
            <span>
              {t.lastUpdated}: {getText(lastUpdated)}
            </span>
          </div>
        </div>

        <div className="mt-10 space-y-4">
          {sections.map((section) => {
            const isOpen = openId === section.id;
            const isEditing = editingId === section.id;

            return (
              <div
                key={section.id}
                className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <div className="text-[18px] font-semibold leading-7 text-[#1C1C1E] md:text-[20px]">
                      {getText(section.title)}
                    </div>
                  </div>

                  <span className="mr-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-[#1C1C1E]">
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
                  <div className="border-t border-gray-100 px-6 pb-6 pt-5">
                    <div className="whitespace-pre-line rounded-[24px] bg-gray-50 px-5 py-5 text-[15px] leading-8 text-gray-700 md:text-[16px]">
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
                            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-[#1C1C1E] transition hover:bg-gray-50"
                          >
                            {isEditing ? t.doneEditing : t.editSection}
                          </button>
                        </div>

                        {isEditing && (
                          <div className="mt-5 space-y-4 rounded-[24px] border border-gray-200 bg-white p-5">
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
                              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[15px] font-semibold text-[#1C1C1E] outline-none focus:border-gray-400"
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
                              className="min-h-[260px] w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-[15px] leading-7 text-gray-700 outline-none focus:border-gray-400"
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

        <div className="mt-12 rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-[#1C1C1E]">
            {t.stillNeedHelp}
          </div>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            {t.stillNeedHelpText}
          </p>
          <p className="mt-4 text-sm font-semibold text-[#1C1C1E]">
            {contactEmail}
          </p>
        </div>

        <div className="h-20" />
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