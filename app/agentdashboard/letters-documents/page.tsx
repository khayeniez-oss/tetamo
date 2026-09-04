"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  Bell,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import {
  AGENT_LETTER_TEMPLATES,
  getAgentLetterTemplate,
  isAgentLetterTemplateKey,
  type AgentLetterLanguage,
  type AgentLetterTemplateCategory,
  type AgentLetterTemplateKey,
} from "@/lib/agent-letter";

import {
  AGENT_LETTER_UNIVERSAL_NOTICE,
} from "@/lib/agent-letter-legal";

import { supabase } from "@/lib/supabase";

type PropertyRow = {
  id: string;

  kode:
    | string
    | null;

  title:
    | string
    | null;

  title_id:
    | string
    | null;

  city:
    | string
    | null;

  province:
    | string
    | null;

  address:
    | string
    | null;

  property_type:
    | string
    | null;
};

type LetterDocument = {
  id: string;

  property_id:
    | string
    | null;

  document_type:
    "letter";

  template_key:
    | string
    | null;

  title: string;

  language:
    | "id"
    | "en"
    | "bilingual";

  status:
    | "draft"
    | "ready"
    | "completed";

  created_at: string;
  updated_at: string;

  data:
    Record<
      string,
      unknown
    >;
};

const PROPERTY_PAGE_SIZE =
  8;

const CATEGORY_ORDER:
  AgentLetterTemplateCategory[] =
[
  "offers",
  "authorization",
  "tenancy",
  "viewing",
  "other",
];

const CATEGORY_LABELS:
  Record<
    AgentLetterTemplateCategory,
    {
      title: string;
      subtitle: string;
    }
  > =
{
  offers: {
    title:
      "Offers & Intent",

    subtitle:
      "LOI, rental offers and purchase offers.",
  },

  authorization: {
    title:
      "Authorization & Agency",

    subtitle:
      "Authorization, appointment and co-broking documents.",
  },

  tenancy: {
    title:
      "Tenancy & Notices",

    subtitle:
      "Renewal, termination, payment and property notices.",
  },

  viewing: {
    title:
      "Viewing & Handover",

    subtitle:
      "Viewing confirmations, acknowledgements and key handover.",
  },

  other: {
    title:
      "Other",

    subtitle:
      "Flexible professional property correspondence.",
  },
};

function categoryIcon(
  category:
    AgentLetterTemplateCategory
) {
  if (
    category ===
    "authorization"
  ) {
    return ShieldCheck;
  }

  if (
    category ===
    "tenancy"
  ) {
    return Bell;
  }

  if (
    category ===
    "viewing"
  ) {
    return Eye;
  }

  return FileText;
}

function cleanText(
  value: unknown
) {
  return String(
    value || ""
  ).trim();
}

function propertyTitle(
  property:
    PropertyRow
) {
  return (
    cleanText(
      property.title_id
    ) ||
    cleanText(
      property.title
    ) ||
    cleanText(
      property.kode
    ) ||
    "Properti"
  );
}

function propertyLocation(
  property:
    PropertyRow
) {
  return [
    cleanText(
      property.city
    ),

    cleanText(
      property.province
    ),
  ]
    .filter(Boolean)
    .join(", ");
}

function formatDate(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(date);
}

function statusLabel(
  status:
    LetterDocument["status"]
) {
  if (
    status ===
    "completed"
  ) {
    return "Completed";
  }

  if (
    status ===
    "ready"
  ) {
    return "Ready";
  }

  return "Draft";
}

function documentTemplateLabel(
  document:
    LetterDocument
) {
  if (
    document.template_key &&
    isAgentLetterTemplateKey(
      document.template_key
    )
  ) {
    return getAgentLetterTemplate(
      document.template_key
    ).labelId;
  }

  return "Letter & Document";
}

export default function LettersDocumentsPage() {
  const router =
    useRouter();

  const [
    deletingId,
    setDeletingId,
  ] =
    useState<
      string | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    creating,
    setCreating,
  ] =
    useState(false);

  const [
    properties,
    setProperties,
  ] =
    useState<
      PropertyRow[]
    >([]);

  const [
    documents,
    setDocuments,
  ] =
    useState<
      LetterDocument[]
    >([]);

  const [
    propertyPage,
    setPropertyPage,
  ] =
    useState(1);

  const [
    propertyCount,
    setPropertyCount,
  ] =
    useState(0);

  const [
    selectedTemplateKey,
    setSelectedTemplateKey,
  ] =
    useState<
      AgentLetterTemplateKey |
      null
    >(null);

  const [
    selectedPropertyId,
    setSelectedPropertyId,
  ] =
    useState("");

  const [
    language,
    setLanguage,
  ] =
    useState<
      AgentLetterLanguage
    >("id");

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  const propertyRangeFrom =
    (
      propertyPage -
      1
    ) *
    PROPERTY_PAGE_SIZE;

  const propertyRangeTo =
    propertyRangeFrom +
    PROPERTY_PAGE_SIZE -
    1;

  const propertyPageCount =
    Math.max(
      1,

      Math.ceil(
        propertyCount /
        PROPERTY_PAGE_SIZE
      )
    );

  const selectedTemplate =
    useMemo(
      () =>
        selectedTemplateKey
          ? getAgentLetterTemplate(
              selectedTemplateKey
            )
          : null,
      [
        selectedTemplateKey,
      ]
    );

  const selectedProperty =
    useMemo(
      () =>
        properties.find(
          (property) =>
            property.id ===
            selectedPropertyId
        ) ||
        null,
      [
        properties,
        selectedPropertyId,
      ]
    );

  const loadPageData =
    useCallback(
      async (
        mode:
          | "initial"
          | "refresh" =
          "initial"
      ) => {
        if (
          mode ===
          "refresh"
        ) {
          setRefreshing(
            true
          );
        } else {
          setLoading(
            true
          );
        }

        setErrorMessage(
          ""
        );

        try {
          const {
            data:
              sessionData,
          } =
            await supabase
              .auth
              .getSession();

          const session =
            sessionData
              .session;

          if (!session) {
            throw new Error(
              "Session login tidak ditemukan. Silakan login kembali."
            );
          }

          const [
            propertyResult,
            documentResponse,
          ] =
            await Promise.all([
              supabase
                .from(
                  "properties"
                )
                .select(
                  `
                    id,
                    kode,
                    title,
                    title_id,
                    city,
                    province,
                    address,
                    property_type
                  `,
                  {
                    count:
                      "exact",
                  }
                )
                .eq(
                  "user_id",
                  session.user.id
                )
                .order(
                  "kode",
                  {
                    ascending:
                      true,
                  }
                )
                .range(
                  propertyRangeFrom,
                  propertyRangeTo
                ),

              fetch(
                "/api/agent/documents?type=letter",
                {
                  headers: {
                    Authorization:
                      `Bearer ${session.access_token}`,
                  },
                }
              ),
            ]);

          if (
            propertyResult.error
          ) {
            throw new Error(
              `Property load failed: ${propertyResult.error.message}`
            );
          }

          const documentBody =
            await documentResponse
              .json()
              .catch(
                () => ({})
              );

          if (
            !documentResponse.ok
          ) {
            throw new Error(
              documentBody?.error ||
              "Letters & Documents tidak dapat dimuat."
            );
          }

          const propertyRows =
            (
              propertyResult.data ||
              []
            ) as PropertyRow[];

          setProperties(
            propertyRows
          );

          setPropertyCount(
            propertyResult.count ||
            0
          );

          setDocuments(
            (
              documentBody.documents ||
              []
            ) as LetterDocument[]
          );

          /*
           * Property selection is optional,
           * but if the agent changes pages we do not
           * keep a hidden property selected.
           */
          setSelectedPropertyId(
            (current) =>
              propertyRows.some(
                (property) =>
                  property.id ===
                  current
              )
                ? current
                : ""
          );
        } catch (error) {
          setErrorMessage(
            error instanceof
              Error
              ? error.message
              : "Letters & Documents tidak dapat dimuat."
          );
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      [
        propertyRangeFrom,
        propertyRangeTo,
      ]
    );

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  async function deleteDocumentDraft(
    document:
      LetterDocument
  ) {
    if (
      document.status !==
      "draft"
    ) {
      setErrorMessage(
        "Hanya draft yang dapat dihapus dari halaman ini."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Hapus draft "${document.title}"?\n\nDraft ini akan dihapus secara permanen dan tidak dapat dikembalikan.`
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(
      document.id
    );

    setErrorMessage(
      ""
    );

    setSuccessMessage(
      ""
    );

    try {
      const {
        data:
          sessionData,
      } =
        await supabase
          .auth
          .getSession();

      const session =
        sessionData
          .session;

      if (!session) {
        throw new Error(
          "Session login tidak ditemukan. Silakan login kembali."
        );
      }

      const response =
        await fetch(
          `/api/agent/documents/${document.id}`,
          {
            method:
              "DELETE",

            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },
          }
        );

      const body =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (
        !response.ok
      ) {
        throw new Error(
          body?.error ||
          "Draft tidak dapat dihapus."
        );
      }

      setDocuments(
        (
          current
        ) =>
          current.filter(
            (
              item
            ) =>
              item.id !==
              document.id
          )
      );

      setSuccessMessage(
        "Draft berhasil dihapus."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof
          Error
          ? error.message
          : "Draft tidak dapat dihapus."
      );
    } finally {
      setDeletingId(
        null
      );
    }
  }

  async function createDocument() {
    if (
      !selectedTemplateKey
    ) {
      setErrorMessage(
        "Pilih jenis dokumen terlebih dahulu."
      );

      return;
    }

    setCreating(
      true
    );

    setErrorMessage(
      ""
    );

    setSuccessMessage(
      ""
    );

    try {
      const {
        data:
          sessionData,
      } =
        await supabase
          .auth
          .getSession();

      const session =
        sessionData.session;

      if (!session) {
        throw new Error(
          "Session login tidak ditemukan. Silakan login kembali."
        );
      }

      const response =
        await fetch(
          "/api/agent/documents/letter/create",
          {
            method:
              "POST",

            headers: {
              Authorization:
                `Bearer ${session.access_token}`,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                templateKey:
                  selectedTemplateKey,

                propertyId:
                  selectedPropertyId ||
                  null,

                language,
              }),
          }
        );

      const body =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (
        !response.ok
      ) {
        throw new Error(
          body?.error ||
          "Dokumen tidak dapat dibuat."
        );
      }

      const created =
        body.document as
          LetterDocument;

      setDocuments(
        (current) => [
          created,

          ...current.filter(
            (document) =>
              document.id !==
              created.id
          ),
        ]
      );

      setSuccessMessage(
        `Draft berhasil dibuat: ${created.title}`
      );

      router.push(
        `/agentdashboard/letters-documents/${created.id}`
      );
    } catch (error) {
      setErrorMessage(
        error instanceof
          Error
          ? error.message
          : "Dokumen tidak dapat dibuat."
      );
    } finally {
      setCreating(
        false
      );
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[560px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#B58A3C]" />

          <p className="mt-3 text-sm font-medium text-gray-500">
            Loading Letters & Documents...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-12">
      {/* HEADER */}

      <section className="overflow-hidden rounded-[2rem] border border-[#E5D8BC] bg-gradient-to-br from-[#FBF8F1] via-white to-[#F4EAD7] p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#DCC99F] bg-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[#80652F]">
              <FileText className="h-3.5 w-3.5" />
              Agent Tools
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-[#17171A] sm:text-4xl">
              Letters & Documents
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 sm:text-base">
              Buat LOI, surat kuasa, penawaran,
              pemberitahuan, viewing confirmation,
              co-broking documents dan dokumen properti
              profesional lainnya dalam satu tempat.
            </p>
          </div>

          <button
            type="button"
            disabled={
              refreshing
            }
            onClick={() =>
              loadPageData(
                "refresh"
              )
            }
            className="inline-flex h-fit items-center justify-center gap-2 rounded-xl border border-[#D7C49B] bg-white px-4 py-2.5 text-sm font-bold text-[#80652F] transition hover:bg-[#FAF7F1] disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing
                  ? "animate-spin"
                  : ""
              }`}
            />

            Refresh
          </button>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />

          <span>
            {successMessage}
          </span>
        </div>
      ) : null}

      {/* TEMPLATE LIBRARY */}

      <section className="rounded-[2rem] border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#B58A3C]">
            Step 1
          </p>

          <h2 className="mt-1 text-2xl font-black text-[#17171A]">
            Choose a Document
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Pilih template. Semua isi dapat diedit
            sebelum dokumen dibuat menjadi PDF.
          </p>
        </div>

        <div className="mt-7 space-y-8">
          {CATEGORY_ORDER.map(
            (category) => {
              const meta =
                CATEGORY_LABELS[
                  category
                ];

              const Icon =
                categoryIcon(
                  category
                );

              const templates =
                AGENT_LETTER_TEMPLATES
                  .filter(
                    (template) =>
                      template.category ===
                      category
                  );

              return (
                <div
                  key={
                    category
                  }
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F5EFE3] text-[#80652F]">
                      <Icon className="h-4.5 w-4.5" />
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-[#17171A]">
                        {meta.title}
                      </h3>

                      <p className="text-xs text-gray-500">
                        {meta.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {templates.map(
                      (
                        template
                      ) => {
                        const selected =
                          selectedTemplateKey ===
                          template.key;

                        return (
                          <button
                            key={
                              template.key
                            }
                            type="button"
                            onClick={() => {
                              setSelectedTemplateKey(
                                template.key
                              );

                              setErrorMessage(
                                ""
                              );

                              setSuccessMessage(
                                ""
                              );
                            }}
                            className={`group rounded-2xl border p-4 text-left transition ${
                              selected
                                ? "border-[#B58A3C] bg-[#FCF8EF] shadow-sm ring-1 ring-[#DCC99F]"
                                : "border-gray-200 bg-white hover:border-[#D8C49C] hover:bg-[#FCFAF6]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F2EEE7] text-[#80652F]">
                                <FileText className="h-4.5 w-4.5" />
                              </div>

                              {selected ? (
                                <CheckCircle2 className="h-5 w-5 shrink-0 text-[#B58A3C]" />
                              ) : null}
                            </div>

                            <p className="mt-4 text-sm font-black leading-5 text-[#17171A]">
                              {
                                template.labelId
                              }
                            </p>

                            {template.labelEn !==
                            template.labelId ? (
                              <p className="mt-0.5 text-xs font-semibold text-[#80652F]">
                                {
                                  template.labelEn
                                }
                              </p>
                            ) : null}

                            <p className="mt-2 text-xs leading-5 text-gray-500">
                              {
                                template.descriptionId
                              }
                            </p>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      </section>

      {/* CREATE PANEL */}

      {selectedTemplate ? (
        <section className="rounded-[2rem] border border-[#DFCDA7] bg-[#FCFAF6] p-5 shadow-sm sm:p-7">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#B58A3C]">
                Step 2
              </p>

              <h2 className="mt-1 text-xl font-black text-[#17171A]">
                {
                  selectedTemplate.labelId
                }
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {
                  selectedTemplate.descriptionId
                }
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedTemplateKey(
                  null
                );

                setSelectedPropertyId(
                  ""
                );
              }}
              className="text-xs font-bold text-gray-500 hover:text-[#17171A]"
            >
              Change Template
            </button>
          </div>

          <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_340px]">
            {/* PROPERTY */}

            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#B58A3C]" />

                <h3 className="text-sm font-black text-[#17171A]">
                  Link a Property
                  <span className="ml-1 font-medium text-gray-400">
                    (Optional)
                  </span>
                </h3>
              </div>

              <p className="mt-1 text-xs text-gray-500">
                {selectedTemplate.propertyRecommended
                  ? "Recommended for this document. You can still continue without linking a Tetamo listing."
                  : "General documents can be created without linking a property."}
              </p>

              <button
                type="button"
                onClick={() =>
                  setSelectedPropertyId(
                    ""
                  )
                }
                className={`mt-4 w-full rounded-xl border px-4 py-3 text-left transition ${
                  !selectedPropertyId
                    ? "border-[#B58A3C] bg-white ring-1 ring-[#DCC99F]"
                    : "border-gray-200 bg-white hover:border-[#D8C49C]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                    <FileText className="h-4 w-4 text-gray-500" />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-[#17171A]">
                      No Linked Property
                    </p>

                    <p className="text-xs text-gray-500">
                      Draft using manually entered property or general information.
                    </p>
                  </div>
                </div>
              </button>

              {properties.length ===
              0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-gray-200 bg-white px-4 py-6 text-center">
                  <p className="text-sm font-medium text-gray-500">
                    Belum ada properti pada halaman ini.
                  </p>
                </div>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {properties.map(
                    (
                      property
                    ) => {
                      const selected =
                        selectedPropertyId ===
                        property.id;

                      return (
                        <button
                          key={
                            property.id
                          }
                          type="button"
                          onClick={() =>
                            setSelectedPropertyId(
                              property.id
                            )
                          }
                          className={`rounded-xl border p-4 text-left transition ${
                            selected
                              ? "border-[#B58A3C] bg-white ring-1 ring-[#DCC99F]"
                              : "border-gray-200 bg-white hover:border-[#D8C49C]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-wide text-[#B58A3C]">
                                {cleanText(
                                  property.kode
                                ) ||
                                  "PROPERTY"}
                              </p>

                              <p className="mt-1 line-clamp-2 text-sm font-black text-[#17171A]">
                                {propertyTitle(
                                  property
                                )}
                              </p>
                            </div>

                            {selected ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#B58A3C]" />
                            ) : null}
                          </div>

                          <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />

                            <span className="line-clamp-1">
                              {propertyLocation(
                                property
                              ) ||
                                cleanText(
                                  property.address
                                ) ||
                                "-"}
                            </span>
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              )}

              {propertyPageCount >
              1 ? (
                <div className="mt-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={
                      propertyPage <=
                      1
                    }
                    onClick={() =>
                      setPropertyPage(
                        (page) =>
                          Math.max(
                            1,
                            page -
                              1
                          )
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>

                  <p className="text-xs font-semibold text-gray-500">
                    Page{" "}
                    {
                      propertyPage
                    }{" "}
                    of{" "}
                    {
                      propertyPageCount
                    }
                  </p>

                  <button
                    type="button"
                    disabled={
                      propertyPage >=
                      propertyPageCount
                    }
                    onClick={() =>
                      setPropertyPage(
                        (page) =>
                          Math.min(
                            propertyPageCount,
                            page +
                              1
                          )
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </div>

            {/* SETTINGS */}

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#B58A3C]">
                Document Setup
              </p>

              <div className="mt-4">
                <p className="text-xs font-bold text-gray-500">
                  Language
                </p>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(
                    [
                      [
                        "id",
                        "Bahasa Indonesia",
                      ],

                      [
                        "bilingual",
                        "ID + EN",
                      ],
                    ] as const
                  ).map(
                    ([
                      value,
                      label,
                    ]) => (
                      <button
                        key={
                          value
                        }
                        type="button"
                        onClick={() =>
                          setLanguage(
                            value
                          )
                        }
                        className={`rounded-xl px-3 py-3 text-xs font-bold transition ${
                          language ===
                          value
                            ? "bg-[#17171A] text-white"
                            : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {label}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="mt-5 rounded-xl bg-[#F7F3EA] p-4">
                <p className="text-xs font-bold text-[#80652F]">
                  Selected
                </p>

                <p className="mt-1 text-sm font-black text-[#17171A]">
                  {
                    selectedTemplate.labelId
                  }
                </p>

                <p className="mt-3 text-xs text-gray-500">
                  Property
                </p>

                <p className="mt-0.5 text-sm font-semibold text-[#17171A]">
                  {selectedProperty
                    ? (
                        cleanText(
                          selectedProperty.kode
                        ) ||
                        propertyTitle(
                          selectedProperty
                        )
                      )
                    : "No linked property"}
                </p>
              </div>

              <button
                type="button"
                disabled={
                  creating
                }
                onClick={
                  createDocument
                }
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#17171A] px-4 py-3.5 text-sm font-black text-white transition hover:bg-black disabled:opacity-50"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}

                {creating
                  ? "Creating Draft..."
                  : "Create Document Draft"}
              </button>

              <p className="mt-3 text-center text-[11px] leading-4 text-gray-400">
                The shared editor and PDF tools are connected in the next build piece.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* RECENT DOCUMENTS */}

      <section className="rounded-[2rem] border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#B58A3C]">
              Your Documents
            </p>

            <h2 className="mt-1 text-xl font-black text-[#17171A]">
              Recent Letters & Documents
            </h2>
          </div>

          <p className="text-xs font-semibold text-gray-400">
            {
              documents.length
            }{" "}
            document
            {documents.length ===
            1
              ? ""
              : "s"}
          </p>
        </div>

        {documents.length ===
        0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-10 text-center">
            <FileText className="mx-auto h-7 w-7 text-gray-300" />

            <p className="mt-3 text-sm font-bold text-gray-600">
              Belum ada Letters & Documents.
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Pilih template di atas untuk membuat draft pertama.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {documents
              .slice(
                0,
                12
              )
              .map(
                (
                  document
                ) => (
                  <div
                    key={
                      document.id
                    }
                    className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-200 px-4 py-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4EFE4] text-[#80652F]">
                        <FileText className="h-4 w-4" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[#17171A]">
                          {
                            document.title
                          }
                        </p>

                        <p className="mt-0.5 text-xs font-semibold text-[#80652F]">
                          {documentTemplateLabel(
                            document
                          )}
                        </p>

                        <p className="mt-1 text-[11px] text-gray-400">
                          Updated{" "}
                          {formatDate(
                            document.updated_at
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-gray-100 px-3 py-1.5 text-[11px] font-bold text-gray-600">
                        {document.language ===
                        "bilingual"
                          ? "ID + EN"
                          : "ID"}
                      </span>

                      <span className="rounded-full bg-[#F5EFE3] px-3 py-1.5 text-[11px] font-bold text-[#80652F]">
                        {statusLabel(
                          document.status
                        )}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/agentdashboard/letters-documents/${document.id}`
                          )
                        }
                        className="rounded-xl bg-[#17171A] px-3 py-2 text-[11px] font-black text-white transition hover:bg-black"
                      >
                        Open / Edit
                      </button>

                      {document.status ===
                      "draft" ? (
                        <button
                          type="button"
                          disabled={
                            deletingId ===
                            document.id
                          }
                          onClick={() =>
                            deleteDocumentDraft(
                              document
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-[11px] font-black text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId ===
                          document.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}

                          {deletingId ===
                          document.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              )}
          </div>
        )}
      </section>

      {/* LANDING PAGE LEGAL NOTICE */}

      <section className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#B58A3C]" />

          <div>
            <p className="text-xs font-black text-[#17171A]">
              Catatan Penting dari Tetamo
              <span className="font-semibold text-gray-400">
                {" "}
                / Important Tetamo Notice
              </span>
            </p>

            <p className="mt-2 text-xs leading-5 text-gray-600">
              {
                AGENT_LETTER_UNIVERSAL_NOTICE.id
              }
            </p>

            <div className="my-3 border-t border-gray-200" />

            <p className="text-xs leading-5 text-gray-500">
              {
                AGENT_LETTER_UNIVERSAL_NOTICE.en
              }
            </p>

            <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-gray-400">
              Pemberitahuan ini merupakan informasi pada dashboard Tetamo dan tidak menjadi bagian dari dokumen yang dibuat atau PDF yang dihasilkan.
              {" "}
              / This notice is dashboard information and is not part of the created document or generated PDF.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
