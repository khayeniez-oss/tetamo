"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  UserRound,
  X,
  FileDown,
  Printer,
  Share2,
} from "lucide-react";

import {
  getAgentLetterTemplate,
  getAgentLetterTemplateFields,
  isAgentLetterTemplateKey,
  normalizeAgentLetterData,
  type AgentLetterData,
  type AgentLetterProperty,
  type AgentLetterSignature,
  type AgentLetterTemplateField,
} from "@/lib/agent-letter";

import {
  AGENT_LETTER_UNIVERSAL_NOTICE,
  getAgentLetterLegalProfile,
} from "@/lib/agent-letter-legal";

import { supabase } from "@/lib/supabase";

import {
  useParams,
  useRouter,
} from "next/navigation";

type FileShareNavigator =
  Navigator & {
    share?: (
      data: ShareData
    ) => Promise<void>;

    canShare?: (
      data: ShareData
    ) => boolean;
  };

type LetterDocumentRecord = {
  id: string;
  user_id: string;

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

  data:
    Record<
      string,
      unknown
    >;

  template_version:
    number;

  generated_at:
    | string
    | null;

  created_at: string;
  updated_at: string;
};

function cleanText(
  value: unknown
) {
  return String(
    value || ""
  ).trim();
}

function emptyProperty():
  AgentLetterProperty {
  return {
    id: "",
    code: "",
    title: "",
    address: "",
    location: "",
    propertyType: "",
  };
}

function previewDate(
  value: string
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(
      `${value}T00:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day:
        "2-digit",

      month:
        "long",

      year:
        "numeric",
    }
  ).format(date);
}

function signatureLabel(
  value: string,
  bilingual: boolean
) {
  if (bilingual) {
    return value;
  }

  return (
    value.split(
      " / "
    )[0] ||
    value
  );
}

function fieldDisplayValue(
  field:
    AgentLetterTemplateField,

  rawValue:
    string | number | boolean | undefined,

  bilingual:
    boolean
) {
  if (
    rawValue ===
      undefined ||
    rawValue ===
      null ||
    rawValue ===
      ""
  ) {
    return "";
  }

  if (
    field.type ===
      "select" &&
    field.options
  ) {
    const option =
      field.options.find(
        (item) =>
          item.value ===
          String(rawValue)
      );

    if (option) {
      return bilingual &&
        option.labelId !==
        option.labelEn
        ? `${option.labelId} / ${option.labelEn}`
        : option.labelId;
    }
  }

  if (
    field.type ===
    "date"
  ) {
    return previewDate(
      String(rawValue)
    );
  }

  return String(
    rawValue
  );
}

function PreviewBody({
  value,
}: {
  value: string;
}) {
  const lines =
    value.split("\n");

  return (
    <div className="space-y-2 text-[11px] leading-[1.75] text-[#29292D]">
      {lines.map(
        (
          line,
          index
        ) => {
          if (
            line.trim() ===
            "---"
          ) {
            return (
              <div
                key={
                  index
                }
                className="my-4 border-t border-gray-200"
              />
            );
          }

          if (
            !line.trim()
          ) {
            return (
              <div
                key={
                  index
                }
                className="h-1"
              />
            );
          }

          return (
            <p
              key={
                index
              }
            >
              {line}
            </p>
          );
        }
      )}
    </div>
  );
}

export default function LetterDocumentEditorPage() {
  const router =
    useRouter();

  const params =
    useParams<{
      id: string;
    }>();

  const documentId =
    cleanText(
      params?.id
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    documentRecord,
    setDocumentRecord,
  ] =
    useState<
      LetterDocumentRecord |
      null
    >(null);

  const [
    letter,
    setLetter,
  ] =
    useState<
      AgentLetterData |
      null
    >(null);

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

  const [
    generating,
    setGenerating,
  ] =
    useState(false);


  const loadDocument =
    useCallback(
      async () => {
        if (
          !documentId
        ) {
          setErrorMessage(
            "Document ID tidak ditemukan."
          );

          setLoading(
            false
          );

          return;
        }

        setLoading(
          true
        );

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

          const response =
            await fetch(
              `/api/agent/documents/${documentId}`,
              {
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
              "Document tidak dapat dimuat."
            );
          }

          const record =
            body.document as
              LetterDocumentRecord;

          if (
            record.document_type !==
            "letter"
          ) {
            throw new Error(
              "Document ini bukan Letter & Document."
            );
          }

          if (
            !record.template_key ||
            !isAgentLetterTemplateKey(
              record.template_key
            )
          ) {
            throw new Error(
              "Template Letter & Document tidak valid."
            );
          }

          const language =
            record.language ===
            "bilingual"
              ? "bilingual"
              : "id";

          const normalized =
            normalizeAgentLetterData(
              record.data,
              record.template_key,
              language
            );

          setDocumentRecord(
            record
          );

          setLetter(
            normalized
          );
        } catch (error) {
          setErrorMessage(
            error instanceof
              Error
              ? error.message
              : "Document tidak dapat dimuat."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        documentId,
      ]
    );

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  const template =
    useMemo(
      () =>
        letter
          ? getAgentLetterTemplate(
              letter.templateKey
            )
          : null,
      [
        letter,
      ]
    );

  const templateFields =
    useMemo(
      () =>
        letter
          ? getAgentLetterTemplateFields(
              letter.templateKey
            )
          : [],
      [
        letter,
      ]
    );

  const bilingual =
    letter?.language ===
    "bilingual";

  const legalProfile =
    useMemo(
      () =>
        letter
          ? getAgentLetterLegalProfile(
              letter.templateKey
            )
          : null,
      [
        letter,
      ]
    );

  function uiLabel(
    id: string,
    en: string
  ) {
    return bilingual
      ? `${id} / ${en}`
      : id;
  }

  function updateSender(
    key:
      keyof AgentLetterData["sender"],

    value: string
  ) {
    if (!letter) {
      return;
    }

    setLetter({
      ...letter,

      sender: {
        ...letter.sender,
        [key]:
          value,
      },
    });
  }

  function updateRecipient(
    key:
      keyof AgentLetterData["recipient"],

    value: string
  ) {
    if (!letter) {
      return;
    }

    setLetter({
      ...letter,

      recipient: {
        ...letter.recipient,
        [key]:
          value,
      },
    });
  }

  function updateProperty(
    key:
      keyof AgentLetterProperty,

    value: string
  ) {
    if (!letter) {
      return;
    }

    const current =
      letter.property ||
      emptyProperty();

    setLetter({
      ...letter,

      property: {
        ...current,
        [key]:
          value,
      },
    });
  }

  function clearManualProperty() {
    if (
      !letter ||
      documentRecord
        ?.property_id
    ) {
      return;
    }

    setLetter({
      ...letter,
      property:
        null,
    });
  }

  function updateTemplateField(
    key: string,
    value:
      string |
      number |
      boolean
  ) {
    if (!letter) {
      return;
    }

    setLetter({
      ...letter,

      templateData: {
        ...letter.templateData,
        [key]:
          value,
      },
    });
  }

  function updateSignature(
    target:
      "primary"
      | "secondary",

    key:
      keyof AgentLetterSignature,

    value: string
  ) {
    if (!letter) {
      return;
    }

    if (
      target ===
      "primary"
    ) {
      setLetter({
        ...letter,

        signatures: {
          ...letter.signatures,

          primary: {
            ...letter.signatures.primary,
            [key]:
              value,
          },
        },
      });

      return;
    }

    const secondary =
      letter.signatures
        .secondary || {
        label:
          "Pihak Kedua / Second Party",
        name:
          "",
        role:
          "",
      };

    setLetter({
      ...letter,

      signatures: {
        ...letter.signatures,

        secondary: {
          ...secondary,
          [key]:
            value,
        },
      },
    });
  }

  async function saveDraft() {
    if (
      !letter ||
      !documentRecord
    ) {
      return;
    }

    setSaving(
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
          `/api/agent/documents/${documentRecord.id}`,
          {
            method:
              "PATCH",

            headers: {
              Authorization:
                `Bearer ${session.access_token}`,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                language:
                  letter.language,

                data:
                  letter,
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
          "Draft tidak dapat disimpan."
        );
      }

      if (
        body.document
      ) {
        setDocumentRecord(
          body.document as
            LetterDocumentRecord
        );
      }

      setSuccessMessage(
        bilingual
          ? "Draft berhasil disimpan / Draft saved successfully."
          : "Draft berhasil disimpan."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof
          Error
          ? error.message
          : "Draft tidak dapat disimpan."
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  async function generateLetterPdf() {
    if (
      !letter ||
      !documentRecord
    ) {
      return;
    }

    /*
     * Open the PDF tab immediately from the click event.
     * This prevents Safari / Chrome from blocking it
     * after the async PDF generation finishes.
     */
    const pdfWindow =
      window.open(
        "about:blank",
        "_blank"
      );

    if (!pdfWindow) {
      setErrorMessage(
        letter.language ===
          "bilingual"
          ? "Browser memblokir tab PDF. Izinkan pop-up lalu coba lagi / The browser blocked the PDF tab. Allow pop-ups and try again."
          : "Browser memblokir tab PDF. Izinkan pop-up lalu coba lagi."
      );

      return;
    }

    /*
     * Keep the Tetamo editor in front while the PDF
     * is being saved and generated.
     *
     * The reserved tab remains blank only briefly
     * and prevents popup blocking.
     */
    try {
      pdfWindow.blur();
      window.focus();
    } catch {
      // Browser focus behaviour may vary.
    }

    setGenerating(
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
        sessionData
          .session;

      if (!session) {
        throw new Error(
          letter.language ===
            "bilingual"
            ? "Sesi login tidak ditemukan / Login session not found."
            : "Sesi login tidak ditemukan."
        );
      }

      /*
       * Save exactly what is currently shown
       * before generating the PDF.
       */
      const saveResponse =
        await fetch(
          `/api/agent/documents/${documentRecord.id}`,
          {
            method:
              "PATCH",

            headers: {
              Authorization:
                `Bearer ${session.access_token}`,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                data:
                  letter,

                language:
                  letter.language,

                status:
                  documentRecord.status,
              }),
          }
        );

      const saveBody =
        await saveResponse
          .json()
          .catch(
            () => ({})
          );

      if (
        !saveResponse.ok
      ) {
        throw new Error(
          saveBody?.error ||
          (
            letter.language ===
              "bilingual"
              ? "Dokumen tidak dapat disimpan sebelum membuat PDF / Document could not be saved before generating the PDF."
              : "Dokumen tidak dapat disimpan sebelum membuat PDF."
          )
        );
      }

      if (
        saveBody.document
      ) {
        setDocumentRecord(
          saveBody.document as
            LetterDocumentRecord
        );
      }

      const response =
        await fetch(
          `/api/agent/documents/letter/${documentRecord.id}/generate`,
          {
            method:
              "POST",

            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },
          }
        );

      if (
        !response.ok
      ) {
        let message =
          "";

        try {
          const payload =
            await response.json();

          message =
            typeof payload?.error ===
              "string"
              ? payload.error
              : "";
        } catch {
          message =
            "";
        }

        throw new Error(
          message ||
          (
            letter.language ===
              "bilingual"
              ? "PDF tidak dapat dibuat / PDF could not be generated."
              : "PDF tidak dapat dibuat."
          )
        );
      }

      const blob =
        await response.blob();

      const objectUrl =
        URL.createObjectURL(
          blob
        );

      /*
       * Send the newly generated PDF directly
       * to the browser's native PDF viewer.
       *
       * From there the agent can Print or Download
       * using the normal browser PDF controls.
       */
      pdfWindow.location.replace(
        objectUrl
      );

      /*
       * Bring the PDF forward only after the real
       * browser PDF viewer has been loaded.
       */
      window.setTimeout(
        () => {
          try {
            pdfWindow.focus();
          } catch {
            // Browser focus behaviour may vary.
          }
        },
        120
      );

      setSuccessMessage(
        letter.language ===
          "bilingual"
          ? "PDF dibuka di tab baru / PDF opened in a new tab."
          : "PDF dibuka di tab baru."
      );

      /*
       * Keep the Blob URL alive long enough
       * for the PDF viewer to fully load it.
       */
      window.setTimeout(
        () => {
          URL.revokeObjectURL(
            objectUrl
          );
        },
        60000
      );
    } catch (error) {
      pdfWindow.close();

      console.error(
        "Letter PDF generation failed:",
        error
      );

      setErrorMessage(
        error instanceof
          Error
          ? error.message
          : (
              letter.language ===
                "bilingual"
                ? "PDF tidak dapat dibuat / PDF could not be generated."
                : "PDF tidak dapat dibuat."
            )
      );
    } finally {
      setGenerating(
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
            Loading Letter & Document...
          </p>
        </div>
      </div>
    );
  }

  if (
    !letter ||
    !documentRecord ||
    !template
  ) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() =>
            router.push(
              "/agentdashboard/letters-documents"
            )
          }
          className="inline-flex items-center gap-2 text-sm font-bold text-[#80652F]"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
          {errorMessage ||
            "Document tidak dapat dibuka."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}

      <section className="rounded-[2rem] border border-[#E5D8BC] bg-gradient-to-br from-[#FBF8F1] via-white to-[#F4EAD7] p-5 shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/agentdashboard/letters-documents"
                )
              }
              className="inline-flex items-center gap-2 text-xs font-bold text-[#80652F]"
            >
              <ArrowLeft className="h-4 w-4" />

              {uiLabel(
                "Kembali ke Letters & Documents",
                "Back to Letters & Documents"
              )}
            </button>

            <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-[#B58A3C]">
              Letter & Document Builder
            </p>

            <h1 className="mt-1 text-2xl font-black text-[#17171A] sm:text-3xl">
              {
                template.labelId
              }
            </h1>

            {bilingual &&
            template.labelEn !==
              template.labelId ? (
              <p className="mt-1 text-sm font-semibold text-[#80652F]">
                {
                  template.labelEn
                }
              </p>
            ) : null}

            <p className="mt-2 max-w-3xl text-sm text-gray-500">
              {
                documentRecord.title
              }
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-gray-200 bg-white p-1">
              {(
                [
                  [
                    "id",
                    "ID",
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
                      setLetter({
                        ...letter,
                        language:
                          value,
                      })
                    }
                    className={`rounded-lg px-3 py-2 text-xs font-black transition ${
                      letter.language ===
                      value
                        ? "bg-[#17171A] text-white"
                        : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </button>
                )
              )}
            </div>

            <button
              type="button"
              disabled={
                saving
              }
              onClick={
                saveDraft
              }
              className="inline-flex items-center gap-2 rounded-xl bg-[#17171A] px-4 py-3 text-sm font-black text-white transition hover:bg-black disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              {saving
                ? uiLabel(
                    "Menyimpan...",
                    "Saving..."
                  )
                : uiLabel(
                    "Simpan Draft",
                    "Save Draft"
                  )}
            </button>

            <button
              type="button"
              disabled={
                generating ||
                saving
              }
              onClick={
                generateLetterPdf
              }
              className="inline-flex items-center gap-2 rounded-xl border border-[#CDB683] bg-white px-4 py-3 text-sm font-black text-[#80652F] transition hover:bg-[#F8F3E9] disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}

              {generating
                ? uiLabel(
                    "Membuat PDF...",
                    "Generating PDF..."
                  )
                : uiLabel(
                    "Buat PDF",
                    "Generate PDF"
                  )}
            </button>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          {successMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.86fr)]">
        {/* EDITOR */}

        <div className="space-y-5">
          {/* DETAILS */}

          <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#B58A3C]" />

              <h2 className="text-sm font-black text-[#17171A]">
                {uiLabel(
                  "Detail Dokumen",
                  "Document Details"
                )}
              </h2>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="text-xs font-bold text-gray-500">
                  {uiLabel(
                    "Tanggal Surat",
                    "Letter Date"
                  )}
                </span>

                <input
                  type="date"
                  value={
                    letter.letterDate
                  }
                  onChange={(event) =>
                    setLetter({
                      ...letter,
                      letterDate:
                        event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>

              <label>
                <span className="text-xs font-bold text-gray-500">
                  {uiLabel(
                    "Tempat",
                    "Place"
                  )}
                </span>

                <input
                  value={
                    letter.place
                  }
                  onChange={(event) =>
                    setLetter({
                      ...letter,
                      place:
                        event.target.value,
                    })
                  }
                  placeholder="Bali"
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>
            </div>
          </section>

          {/* SENDER */}

          <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-[#B58A3C]" />

              <h2 className="text-sm font-black text-[#17171A]">
                {uiLabel(
                  "Pengirim / Agen",
                  "Sender / Agent"
                )}
              </h2>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {(
                [
                  [
                    "name",
                    "Nama",
                    "Name",
                  ],

                  [
                    "agency",
                    "Agensi",
                    "Agency",
                  ],

                  [
                    "phone",
                    "Telepon",
                    "Phone",
                  ],

                  [
                    "email",
                    "Email",
                    "Email",
                  ],
                ] as const
              ).map(
                ([
                  key,
                  id,
                  en,
                ]) => (
                  <label
                    key={
                      key
                    }
                  >
                    <span className="text-xs font-bold text-gray-500">
                      {uiLabel(
                        id,
                        en
                      )}
                    </span>

                    <input
                      value={
                        letter.sender[
                          key
                        ]
                      }
                      onChange={(event) =>
                        updateSender(
                          key,
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                    />
                  </label>
                )
              )}

              <label className="sm:col-span-2">
                <span className="text-xs font-bold text-gray-500">
                  {uiLabel(
                    "Alamat Pengirim",
                    "Sender Address"
                  )}
                </span>

                <textarea
                  rows={2}
                  value={
                    letter.sender.address
                  }
                  onChange={(event) =>
                    updateSender(
                      "address",
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>
            </div>
          </section>

          {/* RECIPIENT */}

          <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-[#B58A3C]" />

              <h2 className="text-sm font-black text-[#17171A]">
                {uiLabel(
                  "Penerima",
                  "Recipient"
                )}
              </h2>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {(
                [
                  [
                    "name",
                    "Nama Penerima",
                    "Recipient Name",
                  ],

                  [
                    "company",
                    "Perusahaan",
                    "Company",
                  ],

                  [
                    "phone",
                    "Telepon",
                    "Phone",
                  ],

                  [
                    "email",
                    "Email",
                    "Email",
                  ],
                ] as const
              ).map(
                ([
                  key,
                  id,
                  en,
                ]) => (
                  <label
                    key={
                      key
                    }
                  >
                    <span className="text-xs font-bold text-gray-500">
                      {uiLabel(
                        id,
                        en
                      )}
                    </span>

                    <input
                      value={
                        letter.recipient[
                          key
                        ]
                      }
                      onChange={(event) =>
                        updateRecipient(
                          key,
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                    />
                  </label>
                )
              )}

              <label className="sm:col-span-2">
                <span className="text-xs font-bold text-gray-500">
                  {uiLabel(
                    "Alamat Penerima",
                    "Recipient Address"
                  )}
                </span>

                <textarea
                  rows={2}
                  value={
                    letter.recipient.address
                  }
                  onChange={(event) =>
                    updateRecipient(
                      "address",
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>
            </div>
          </section>

          {/* PROPERTY */}

          <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#B58A3C]" />

                <div>
                  <h2 className="text-sm font-black text-[#17171A]">
                    {uiLabel(
                      "Detail Properti",
                      "Property Details"
                    )}
                  </h2>

                  <p className="mt-0.5 text-xs text-gray-400">
                    {documentRecord.property_id
                      ? uiLabel(
                          "Terhubung ke listing Tetamo. Detail pada surat tetap dapat disesuaikan.",
                          "Linked to a Tetamo listing. Letter details can still be adjusted."
                        )
                      : uiLabel(
                          "Tidak ada listing terhubung. Isi properti secara manual bila diperlukan.",
                          "No linked listing. Enter property details manually if required."
                        )}
                  </p>
                </div>
              </div>

              {!documentRecord.property_id &&
              letter.property ? (
                <button
                  type="button"
                  onClick={
                    clearManualProperty
                  }
                  className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-red-600"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </button>
              ) : null}
            </div>

            {!letter.property ? (
              <button
                type="button"
                onClick={() =>
                  setLetter({
                    ...letter,
                    property:
                      emptyProperty(),
                  })
                }
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#D7C49B] bg-[#FCFAF6] px-4 py-3 text-sm font-bold text-[#80652F]"
              >
                <Plus className="h-4 w-4" />

                {uiLabel(
                  "Tambah Detail Properti",
                  "Add Property Details"
                )}
              </button>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {(
                  [
                    [
                      "code",
                      "Kode Properti",
                      "Property Code",
                    ],

                    [
                      "title",
                      "Nama / Judul Properti",
                      "Property Name / Title",
                    ],

                    [
                      "propertyType",
                      "Jenis Properti",
                      "Property Type",
                    ],

                    [
                      "location",
                      "Lokasi",
                      "Location",
                    ],
                  ] as const
                ).map(
                  ([
                    key,
                    id,
                    en,
                  ]) => (
                    <label
                      key={
                        key
                      }
                    >
                      <span className="text-xs font-bold text-gray-500">
                        {uiLabel(
                          id,
                          en
                        )}
                      </span>

                      <input
                        value={
                          letter.property?.[
                            key
                          ] ||
                          ""
                        }
                        onChange={(event) =>
                          updateProperty(
                            key,
                            event.target.value
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                      />
                    </label>
                  )
                )}

                <label className="sm:col-span-2">
                  <span className="text-xs font-bold text-gray-500">
                    {uiLabel(
                      "Alamat Properti",
                      "Property Address"
                    )}
                  </span>

                  <textarea
                    rows={2}
                    value={
                      letter.property.address
                    }
                    onChange={(event) =>
                      updateProperty(
                        "address",
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                  />
                </label>
              </div>
            )}
          </section>

          {/* DYNAMIC TEMPLATE TERMS */}

          {templateFields.length >
          0 ? (
            <section className="rounded-[1.75rem] border border-[#E3D5B6] bg-[#FCFAF6] p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#B58A3C]" />

                <h2 className="text-sm font-black text-[#17171A]">
                  {uiLabel(
                    "Detail Khusus Dokumen",
                    "Document-Specific Details"
                  )}
                </h2>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {templateFields.map(
                  (
                    field
                  ) => {
                    const value =
                      letter.templateData[
                        field.key
                      ];

                    const label =
                      bilingual &&
                      field.labelId !==
                        field.labelEn
                        ? `${field.labelId} / ${field.labelEn}`
                        : field.labelId;

                    if (
                      field.type ===
                      "textarea"
                    ) {
                      return (
                        <label
                          key={
                            field.key
                          }
                          className="sm:col-span-2"
                        >
                          <span className="text-xs font-bold text-gray-500">
                            {label}
                          </span>

                          <textarea
                            rows={3}
                            value={
                              String(
                                value ||
                                ""
                              )
                            }
                            onChange={(event) =>
                              updateTemplateField(
                                field.key,
                                event.target.value
                              )
                            }
                            placeholder={
                              bilingual
                                ? field.placeholderEn ||
                                  field.placeholderId
                                : field.placeholderId
                            }
                            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm"
                          />
                        </label>
                      );
                    }

                    if (
                      field.type ===
                      "select"
                    ) {
                      return (
                        <label
                          key={
                            field.key
                          }
                        >
                          <span className="text-xs font-bold text-gray-500">
                            {label}
                          </span>

                          <select
                            value={
                              String(
                                value ||
                                ""
                              )
                            }
                            onChange={(event) =>
                              updateTemplateField(
                                field.key,
                                event.target.value
                              )
                            }
                            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm"
                          >
                            <option value="">
                              -
                            </option>

                            {field.options?.map(
                              (
                                option
                              ) => (
                                <option
                                  key={
                                    option.value
                                  }
                                  value={
                                    option.value
                                  }
                                >
                                  {bilingual &&
                                  option.labelId !==
                                    option.labelEn
                                    ? `${option.labelId} / ${option.labelEn}`
                                    : option.labelId}
                                </option>
                              )
                            )}
                          </select>
                        </label>
                      );
                    }

                    return (
                      <label
                        key={
                          field.key
                        }
                      >
                        <span className="text-xs font-bold text-gray-500">
                          {label}
                        </span>

                        <input
                          type={
                            field.type ===
                            "date"
                              ? "date"
                              : field.type ===
                                  "time"
                                ? "time"
                                : "text"
                          }
                          inputMode={
                            field.type ===
                            "number"
                              ? "numeric"
                              : undefined
                          }
                          value={
                            String(
                              value ||
                              ""
                            )
                          }
                          onChange={(event) =>
                            updateTemplateField(
                              field.key,
                              event.target.value
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm"
                        />
                      </label>
                    );
                  }
                )}
              </div>
            </section>
          ) : null}

          {/* LETTER CONTENT */}

          <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-sm font-black text-[#17171A]">
              {uiLabel(
                "Isi Dokumen",
                "Document Content"
              )}
            </h2>

            <div className="mt-4 rounded-2xl border border-[#E3D5B6] bg-[#FCFAF6] p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#B58A3C]" />

                <div>
                  <p className="text-xs font-black text-[#17171A]">
                    {uiLabel(
                      "Draft Disiapkan oleh Tetamo",
                      "Draft Prepared by Tetamo"
                    )}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-600">
                    {bilingual
                      ? "Tetamo telah menyiapkan isi dokumen berdasarkan jenis dokumen yang Anda pilih. Baca seluruh isi dengan teliti sebelum digunakan. Anda dapat memperbaiki, menambahkan, menghapus, atau mengubah isi agar sesuai dengan transaksi dan keadaan sebenarnya. / Tetamo has prepared the document content based on the document type you selected. Read the entire document carefully before use. You may correct, add, remove, or change the content so that it accurately reflects the actual transaction and circumstances."
                      : "Tetamo telah menyiapkan isi dokumen berdasarkan jenis dokumen yang Anda pilih. Baca seluruh isi dengan teliti sebelum digunakan. Anda dapat memperbaiki, menambahkan, menghapus, atau mengubah isi agar sesuai dengan transaksi dan keadaan sebenarnya."}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <label>
                <span className="text-xs font-bold text-gray-500">
                  {uiLabel(
                    "Subjek",
                    "Subject"
                  )}
                </span>

                <input
                  value={
                    letter.subject
                  }
                  onChange={(event) =>
                    setLetter({
                      ...letter,
                      subject:
                        event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>

              <label>
                <span className="text-xs font-bold text-gray-500">
                  {uiLabel(
                    "Salam Pembuka",
                    "Salutation"
                  )}
                </span>

                <input
                  value={
                    letter.salutation
                  }
                  onChange={(event) =>
                    setLetter({
                      ...letter,
                      salutation:
                        event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>

              <label>
                <span className="text-xs font-bold text-gray-500">
                  {uiLabel(
                    "Draft Dokumen Tetamo — Dapat Diedit",
                    "Tetamo Document Draft — Editable"
                  )}
                </span>

                <textarea
                  rows={12}
                  value={
                    letter.body
                  }
                  onChange={(event) =>
                    setLetter({
                      ...letter,
                      body:
                        event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm leading-6"
                />

                <span className="mt-2 block text-[11px] leading-5 text-gray-500">
                  {uiLabel(
                    "Isi di atas sudah disiapkan oleh Tetamo. Pastikan fakta, nama, tanggal, nilai, kewenangan, dan ketentuannya benar. Anda dapat mengedit atau menulis ulang bagian apa pun sebelum dokumen digunakan.",
                    "The content above has been prepared by Tetamo. Verify all facts, names, dates, values, authority, and terms. You may edit or rewrite any part before using the document."
                  )}
                </span>
              </label>

              <label>
                <span className="text-xs font-bold text-gray-500">
                  {uiLabel(
                    "Tambahan / Perubahan Khusus",
                    "Additional / Special Wording"
                  )}
                </span>

                <textarea
                  rows={4}
                  value={
                    letter.additionalNotes
                  }
                  onChange={(event) =>
                    setLetter({
                      ...letter,
                      additionalNotes:
                        event.target.value,
                    })
                  }
                  placeholder={uiLabel(
                    "Tambahkan informasi, ketentuan, atau wording khusus yang belum tercantum pada draft di atas.",
                    "Add information, terms, or special wording not already included in the draft above."
                  )}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>

              <label>
                <span className="text-xs font-bold text-gray-500">
                  {uiLabel(
                    "Penutup",
                    "Closing"
                  )}
                </span>

                <input
                  value={
                    letter.closing
                  }
                  onChange={(event) =>
                    setLetter({
                      ...letter,
                      closing:
                        event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>
            </div>
          </section>

          {/* SIGNATURES */}

          <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-black text-[#17171A]">
                {uiLabel(
                  "Tanda Tangan",
                  "Signatures"
                )}
              </h2>

              {!letter.signatures
                .secondary ? (
                <button
                  type="button"
                  onClick={() =>
                    setLetter({
                      ...letter,

                      signatures: {
                        ...letter.signatures,

                        secondary: {
                          label:
                            "Pihak Kedua / Second Party",
                          name:
                            "",
                          role:
                            "",
                        },
                      },
                    })
                  }
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#80652F]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {uiLabel(
                    "Tambah Penanda Tangan",
                    "Add Signer"
                  )}
                </button>
              ) : null}
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {(
                [
                  [
                    "primary",
                    letter.signatures
                      .primary,
                  ],

                  ...(
                    letter.signatures
                      .secondary
                      ? [
                          [
                            "secondary",
                            letter.signatures.secondary,
                          ] as const,
                        ]
                      : []
                  ),
                ] as const
              ).map(
                ([
                  target,
                  signature,
                ]) => (
                  <div
                    key={
                      target
                    }
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black uppercase tracking-wide text-[#80652F]">
                        {signatureLabel(
                          signature.label,
                          Boolean(
                            bilingual
                          )
                        )}
                      </p>

                      {target ===
                      "secondary" ? (
                        <button
                          type="button"
                          onClick={() =>
                            setLetter({
                              ...letter,

                              signatures: {
                                ...letter.signatures,
                                secondary:
                                  null,
                              },
                            })
                          }
                          className="text-gray-400 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-4 space-y-3">
                      <label>
                        <span className="text-[11px] font-bold text-gray-500">
                          {uiLabel(
                            "Label",
                            "Label"
                          )}
                        </span>

                        <input
                          value={
                            signature.label
                          }
                          onChange={(event) =>
                            updateSignature(
                              target,
                              "label",
                              event.target.value
                            )
                          }
                          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                        />
                      </label>

                      <label>
                        <span className="text-[11px] font-bold text-gray-500">
                          {uiLabel(
                            "Nama",
                            "Name"
                          )}
                        </span>

                        <input
                          value={
                            signature.name
                          }
                          onChange={(event) =>
                            updateSignature(
                              target,
                              "name",
                              event.target.value
                            )
                          }
                          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                        />
                      </label>

                      <label>
                        <span className="text-[11px] font-bold text-gray-500">
                          {uiLabel(
                            "Jabatan / Peran",
                            "Role"
                          )}
                        </span>

                        <input
                          value={
                            signature.role
                          }
                          onChange={(event) =>
                            updateSignature(
                              target,
                              "role",
                              event.target.value
                            )
                          }
                          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                        />
                      </label>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        </div>

        {/* LIVE A4 PREVIEW */}

        <div className="xl:sticky xl:top-6 xl:self-start">
          <section className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#B58A3C]" />

                <p className="text-sm font-black text-[#17171A]">
                  {uiLabel(
                    "Preview Dokumen",
                    "Live Document Preview"
                  )}
                </p>
              </div>

              <p className="mt-1 text-xs text-gray-500">
                {uiLabel(
                  "Preview diperbarui otomatis saat Anda mengedit.",
                  "Preview updates automatically while you edit."
                )}
              </p>
            </div>

            <div className="max-h-[calc(100vh-170px)] overflow-y-auto bg-[#E7E2D8] p-4">
              <div className="mx-auto min-h-[900px] max-w-[620px] bg-white px-9 py-10 shadow-xl">
                {/* LETTERHEAD */}

                <div className="border-b border-[#D8C49C] pb-5">
                  <p className="text-[12px] font-black uppercase tracking-[0.13em] text-[#80652F]">
                    {letter.sender.agency ||
                      letter.sender.name ||
                      "AGENT"}
                  </p>

                  {letter.sender
                    .agency &&
                  letter.sender.name ? (
                    <p className="mt-1 text-[10px] font-semibold text-[#29292D]">
                      {
                        letter.sender.name
                      }
                    </p>
                  ) : null}

                  <div className="mt-2 space-y-0.5 text-[9px] leading-4 text-gray-500">
                    {letter.sender.address ? (
                      <p>
                        {
                          letter.sender.address
                        }
                      </p>
                    ) : null}

                    {letter.sender.phone ||
                    letter.sender.email ? (
                      <p>
                        {[
                          letter.sender.phone,
                          letter.sender.email,
                        ]
                          .filter(
                            Boolean
                          )
                          .join(
                            " • "
                          )}
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* DATE */}

                <div className="mt-6 text-right text-[10px] leading-4 text-gray-600">
                  <p>
                    {[
                      letter.place,
                      previewDate(
                        letter.letterDate
                      ),
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        ", "
                      )}
                  </p>
                </div>

                {/* RECIPIENT */}

                <div className="mt-7 text-[10px] leading-5 text-[#29292D]">
                  <p className="font-bold">
                    {uiLabel(
                      "Kepada Yth.",
                      "To"
                    )}
                  </p>

                  <p className="mt-1 font-black">
                    {letter.recipient.name ||
                      "-"}
                  </p>

                  {letter.recipient
                    .company ? (
                    <p>
                      {
                        letter.recipient.company
                      }
                    </p>
                  ) : null}

                  {letter.recipient
                    .address ? (
                    <p className="max-w-[390px] whitespace-pre-line text-gray-500">
                      {
                        letter.recipient.address
                      }
                    </p>
                  ) : null}

                  {letter.recipient
                    .phone ||
                  letter.recipient
                    .email ? (
                    <p className="mt-1 text-gray-500">
                      {[
                        letter.recipient.phone,
                        letter.recipient.email,
                      ]
                        .filter(
                          Boolean
                        )
                        .join(
                          " • "
                        )}
                    </p>
                  ) : null}
                </div>

                {/* SUBJECT */}

                <div className="mt-7 border-y border-gray-100 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-gray-400">
                    {uiLabel(
                      "Perihal",
                      "Subject"
                    )}
                  </p>

                  <p className="mt-1 text-[11px] font-black text-[#17171A]">
                    {letter.subject ||
                      "-"}
                  </p>
                </div>

                {/* PROPERTY */}

                {letter.property &&
                (
                  letter.property
                    .title ||
                  letter.property
                    .code ||
                  letter.property
                    .address ||
                  letter.property
                    .location
                ) ? (
                  <div className="mt-5 rounded-lg border border-[#E6DCC8] bg-[#FCFAF6] p-3">
                    <p className="text-[8px] font-black uppercase tracking-[0.12em] text-[#80652F]">
                      {uiLabel(
                        "Properti",
                        "Property"
                      )}
                    </p>

                    <p className="mt-1 text-[10px] font-black text-[#17171A]">
                      {letter.property
                        .title ||
                        letter.property
                          .code}
                    </p>

                    {letter.property
                      .code &&
                    letter.property
                      .title ? (
                      <p className="mt-0.5 text-[9px] text-gray-500">
                        {
                          letter.property.code
                        }
                      </p>
                    ) : null}

                    <p className="mt-1 text-[9px] leading-4 text-gray-500">
                      {[
                        letter.property.address,
                        letter.property.location,
                      ]
                        .filter(
                          Boolean
                        )
                        .join(
                          " • "
                        )}
                    </p>
                  </div>
                ) : null}

                {/* TEMPLATE TERMS */}

                {templateFields.some(
                  (field) =>
                    fieldDisplayValue(
                      field,
                      letter.templateData[
                        field.key
                      ],
                      Boolean(
                        bilingual
                      )
                    )
                ) ? (
                  <div className="mt-5">
                    <p className="text-[8px] font-black uppercase tracking-[0.12em] text-[#80652F]">
                      {uiLabel(
                        "Ketentuan Utama",
                        "Key Details"
                      )}
                    </p>

                    <div className="mt-2 grid grid-cols-2 gap-x-5 gap-y-3 rounded-lg border border-gray-100 p-3">
                      {templateFields.map(
                        (
                          field
                        ) => {
                          const value =
                            fieldDisplayValue(
                              field,
                              letter.templateData[
                                field.key
                              ],
                              Boolean(
                                bilingual
                              )
                            );

                          if (
                            !value
                          ) {
                            return null;
                          }

                          return (
                            <div
                              key={
                                field.key
                              }
                              className={
                                field.type ===
                                "textarea"
                                  ? "col-span-2"
                                  : ""
                              }
                            >
                              <p className="text-[8px] font-bold uppercase tracking-wide text-gray-400">
                                {bilingual &&
                                field.labelId !==
                                  field.labelEn
                                  ? `${field.labelId} / ${field.labelEn}`
                                  : field.labelId}
                              </p>

                              <p className="mt-0.5 whitespace-pre-line text-[9px] font-semibold leading-4 text-[#29292D]">
                                {value}
                              </p>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                ) : null}

                {/* BODY */}

                <div className="mt-7">
                  <p className="text-[11px] font-semibold text-[#29292D]">
                    {
                      letter.salutation
                    }
                  </p>

                  <div className="mt-4">
                    <PreviewBody
                      value={
                        letter.body
                      }
                    />
                  </div>

                  {letter.additionalNotes ? (
                    <div className="mt-5 rounded-lg bg-gray-50 p-3">
                      <p className="text-[8px] font-black uppercase tracking-[0.1em] text-gray-400">
                        {uiLabel(
                          "Tambahan / Perubahan Khusus",
                          "Additional / Special Wording"
                        )}
                      </p>

                      <p className="mt-1 whitespace-pre-line text-[9px] leading-4 text-gray-600">
                        {
                          letter.additionalNotes
                        }
                      </p>
                    </div>
                  ) : null}

                  <p className="mt-7 text-[10px] font-semibold text-[#29292D]">
                    {
                      letter.closing
                    }
                  </p>
                </div>

                {/* SIGNATURES */}

                <div
                  className={`mt-14 grid gap-10 ${
                    letter.signatures
                      .secondary
                      ? "grid-cols-2"
                      : "grid-cols-1"
                  }`}
                >
                  {[
                    letter.signatures
                      .primary,

                    ...(letter.signatures
                      .secondary
                      ? [
                          letter.signatures.secondary,
                        ]
                      : []),
                  ].map(
                    (
                      signature,
                      index
                    ) => (
                      <div
                        key={
                          index
                        }
                        className="min-w-0"
                      >
                        <p className="text-[8px] font-bold uppercase tracking-wide text-gray-400">
                          {signatureLabel(
                            signature.label,
                            Boolean(
                              bilingual
                            )
                          )}
                        </p>

                        <div className="mt-14 border-t border-gray-400 pt-2">
                          <p className="truncate text-[10px] font-black text-[#17171A]">
                            {signature.name ||
                              " "}
                          </p>

                          {signature.role ? (
                            <p className="mt-0.5 text-[8px] text-gray-500">
                              {
                                signature.role
                              }
                            </p>
                          ) : null}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* LEGAL REVIEW NOTICES — NOT PART OF FINAL PDF */}

      {legalProfile ? (
        <section
          className={`rounded-2xl border px-5 py-4 ${
            legalProfile.risk ===
            "heightened"
              ? "border-red-200 bg-red-50"
              : legalProfile.risk ===
                  "review_required"
                ? "border-amber-200 bg-amber-50"
                : "border-blue-200 bg-blue-50"
          }`}
        >
          <div className="flex items-start gap-3">
            <ShieldCheck
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                legalProfile.risk ===
                "heightened"
                  ? "text-red-700"
                  : legalProfile.risk ===
                      "review_required"
                    ? "text-amber-700"
                    : "text-blue-700"
              }`}
            />

            <div className="min-w-0">
              <p
                className={`text-xs font-black ${
                  legalProfile.risk ===
                  "heightened"
                    ? "text-red-900"
                    : legalProfile.risk ===
                        "review_required"
                      ? "text-amber-900"
                      : "text-blue-900"
                }`}
              >
                {uiLabel(
                  "Periksa Sebelum Digunakan",
                  "Review Before Use"
                )}
              </p>

              <p
                className={`mt-1 text-xs leading-5 ${
                  legalProfile.risk ===
                  "heightened"
                    ? "text-red-800"
                    : legalProfile.risk ===
                        "review_required"
                      ? "text-amber-800"
                      : "text-blue-800"
                }`}
              >
                {bilingual
                  ? `${legalProfile.noticeId} / ${legalProfile.noticeEn}`
                  : legalProfile.noticeId}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {legalProfile.professionalReviewRecommended ? (
                  <span className="rounded-full border border-current/15 bg-white/60 px-2.5 py-1 text-[10px] font-bold">
                    {uiLabel(
                      "Pemeriksaan profesional disarankan",
                      "Professional review recommended"
                    )}
                  </span>
                ) : null}

                {legalProfile.checkMeterai ? (
                  <span className="rounded-full border border-current/15 bg-white/60 px-2.5 py-1 text-[10px] font-bold">
                    {uiLabel(
                      "Periksa kebutuhan Bea Meterai",
                      "Check Stamp Duty requirements"
                    )}
                  </span>
                ) : null}

                {legalProfile.checkNotaryOrPpat ? (
                  <span className="rounded-full border border-current/15 bg-white/60 px-2.5 py-1 text-[10px] font-bold">
                    {uiLabel(
                      "Periksa kebutuhan Notaris / PPAT",
                      "Check Notary / PPAT requirements"
                    )}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4">
        <p className="text-xs font-black text-[#17171A]">
          {uiLabel(
            "Catatan Penting dari Tetamo",
            "Important Tetamo Notice"
          )}
        </p>

        <p className="mt-1 text-xs leading-5 text-gray-600">
          {bilingual
            ? `${AGENT_LETTER_UNIVERSAL_NOTICE.id} / ${AGENT_LETTER_UNIVERSAL_NOTICE.en}`
            : AGENT_LETTER_UNIVERSAL_NOTICE.id}
        </p>

        <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-gray-400">
          {uiLabel(
            "Pemberitahuan ini hanya tampil di dashboard Tetamo dan tidak menjadi bagian dari PDF dokumen.",
            "This notice appears only in the Tetamo dashboard and is not part of the document PDF."
          )}
        </p>
      </section>

    </div>
  );
}
