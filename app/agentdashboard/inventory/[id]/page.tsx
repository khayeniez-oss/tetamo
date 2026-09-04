"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileDown,
  FileText,
  Loader2,
  Plus,
  Printer,
  Save,
  Share2,
} from "lucide-react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import { supabase } from "@/lib/supabase";

import {
  INVENTORY_CONDITIONS,
  countIncludedInventoryItems,
  countInventoryIssues,
  createCustomInventoryItem,
  type AgentInventoryData,
  type InventoryCondition,
  type InventoryItem,
} from "@/lib/agent-inventory";

type FileShareNavigator =
  Navigator & {
    canShare?: (
      data: {
        files?: File[];
      }
    ) => boolean;

    share?: (
      data: {
        title?: string;
        text?: string;
        files?: File[];
      }
    ) => Promise<void>;
  };

type InventoryDocument = {
  id: string;
  user_id: string;
  property_id: string | null;
  document_type: "inventory";
  title: string;
  language: "id" | "en" | "bilingual";
  status: "draft" | "ready" | "completed";
  data: AgentInventoryData;
  updated_at: string;
};

type InventoryEditorLanguage =
  | "id"
  | "en";

const INVENTORY_COPY = {
  id: {
    back: "Kembali ke Inventory",
    builder: "Pembuat Inventory",
    save: "Simpan Draft",
    saving: "Menyimpan...",
    handoverInfo: "Informasi Serah Terima",
    ownerName: "Nama Pemilik",
    tenantName: "Nama Penyewa",
    handoverDate: "Tanggal Serah Terima",
    agent: "Agen",
    generalNotes: "Catatan Umum",
    checklist: "Checklist Properti",
    itemsCondition: "Barang & Kondisi",
    included: "Terdaftar",
    issues: "Masalah",
    quantity: "Jumlah",
    condition: "Kondisi",
    notes: "Catatan",
    optionalNotes: "Catatan opsional",
    addCustom: "Tambah Barang",
    customPrompt: "Nama barang / appliance:",
    livePreview: "Preview Dokumen",
    previewHelp:
      "Preview berubah otomatis saat checklist diisi.",
    reportTitle:
      "LAPORAN INVENTORY & SERAH TERIMA PROPERTI",
    owner: "Pemilik",
    tenant: "Penyewa",
    handover: "Tanggal Serah Terima",
    empty:
      "Pilih barang inventory untuk membuat dokumen.",
    generated:
      "Dibuat melalui Tetamo Agent Tools.",
    generatePdf: "Buat PDF",
    generatingPdf: "Membuat PDF...",
    downloadPdf: "Download",
    sharePdf: "Bagikan",
    openPdf: "Buka PDF",
    pdfPreview: "Preview PDF",
  },

  en: {
    back: "Back to Inventory",
    builder: "Inventory Builder",
    save: "Save Draft",
    saving: "Saving...",
    handoverInfo: "Handover Information",
    ownerName: "Owner Name",
    tenantName: "Tenant Name",
    handoverDate: "Handover Date",
    agent: "Agent",
    generalNotes: "General Notes",
    checklist: "Property Checklist",
    itemsCondition: "Items & Condition",
    included: "Included",
    issues: "Issues",
    quantity: "Qty",
    condition: "Condition",
    notes: "Notes",
    optionalNotes: "Optional notes",
    addCustom: "Add Custom Item",
    customPrompt: "Item / appliance name:",
    livePreview: "Live Document Preview",
    previewHelp:
      "Preview updates as you complete the checklist.",
    reportTitle:
      "PROPERTY INVENTORY & HANDOVER REPORT",
    owner: "Owner",
    tenant: "Tenant",
    handover: "Handover Date",
    empty:
      "Select inventory items to build the document.",
    generated:
      "Generated through Tetamo Agent Tools.",
    generatePdf: "Generate PDF",
    generatingPdf: "Generating PDF...",
    downloadPdf: "Download",
    sharePdf: "Share",
    openPdf: "Open PDF",
    pdfPreview: "PDF Preview",
  },
} as const;

const INVENTORY_ITEM_ID:
  Record<string, string> = {
    "Coffee Table": "Meja Kopi",
    "Side Table": "Meja Samping",
    Television: "Televisi",
    "TV Remote": "Remote TV",
    "Air Conditioner": "AC",
    "AC Remote": "Remote AC",
    "Ceiling Fan": "Kipas Plafon",
    "Floor Lamp": "Lampu Lantai",
    Curtains: "Gorden",
    "Carpet/Rug": "Karpet",
    Decorations: "Dekorasi",

    "Dining Table": "Meja Makan",
    "Dining Chairs": "Kursi Makan",
    "Pendant Light": "Lampu Gantung",
    "Cabinet/Storage":
      "Lemari / Penyimpanan",

    Refrigerator: "Kulkas",
    "Stove/Cooktop": "Kompor",
    "Range Hood": "Penghisap Asap",
    "Rice Cooker": "Penanak Nasi",
    "Electric Kettle": "Ketel Listrik",
    "Water Dispenser": "Dispenser Air",
    Toaster: "Pemanggang Roti",
    Cookware: "Peralatan Masak",
    Cutlery: "Peralatan Makan",
    "Plates/Bowls": "Piring / Mangkuk",
    "Glasses/Cups": "Gelas / Cangkir",
    "Kitchen Utensils":
      "Peralatan Dapur",
    "Dining Set":
      "Perlengkapan Makan",

    "Bed Frame":
      "Rangka Tempat Tidur",
    Mattress: "Kasur",
    Pillows: "Bantal",
    "Bed Linen": "Seprai",
    "Bedside Tables/Lamps":
      "Meja / Lampu Samping Tempat Tidur",
    Wardrobe: "Lemari Pakaian",
    Safe: "Brankas",
    Mirror: "Cermin",

    "Shower/Head":
      "Shower / Kepala Shower",
    "Water Heater": "Pemanas Air",
    "Wash Basin": "Wastafel",
    Cabinet: "Lemari",
    "Towel Rack": "Rak Handuk",
    Towels: "Handuk",
    "Hair Dryer": "Pengering Rambut",
    "Exhaust Fan": "Kipas Exhaust",

    "Washing Machine": "Mesin Cuci",
    Dryer: "Mesin Pengering",
    Iron: "Setrika",
    "Ironing Board": "Papan Setrika",
    "Laundry Basket":
      "Keranjang Laundry",
    "Drying Rack": "Rak Jemur",

    "Outdoor Table/Chairs/Sofa":
      "Meja / Kursi / Sofa Outdoor",
    "Sun Loungers": "Kursi Santai",
    Umbrella: "Payung",
    "Garden Lights/Equipment":
      "Lampu / Peralatan Taman",
    "Outdoor Fan": "Kipas Outdoor",

    "Swimming Pool": "Kolam Renang",
    "Pool Pump": "Pompa Kolam",
    "Pool Lights": "Lampu Kolam",
    "Pool Cleaning Equipment":
      "Peralatan Pembersih Kolam",
    "Pool Towels": "Handuk Kolam",

    "Main Door Key":
      "Kunci Pintu Utama",
    "Bedroom Keys":
      "Kunci Kamar Tidur",
    "Gate Key": "Kunci Gerbang",
    "Mailbox Key":
      "Kunci Kotak Surat",
    "Remote Gate Control":
      "Remote Gerbang",
    "Access Card": "Kartu Akses",
    "Parking Access": "Akses Parkir",
    "Safe Key": "Kunci Brankas",
  };

function inventorySectionLabel(
  value: string,
  language: InventoryEditorLanguage
) {
  if (language === "en") {
    return value;
  }

  if (
    value.startsWith("Bedroom ")
  ) {
    return value.replace(
      "Bedroom",
      "Kamar Tidur"
    );
  }

  if (
    value.startsWith("Bathroom ")
  ) {
    return value.replace(
      "Bathroom",
      "Kamar Mandi"
    );
  }

  const labels:
    Record<string, string> = {
      "Living Room": "Ruang Tamu",
      "Dining Room": "Ruang Makan",
      Kitchen: "Dapur",
      Laundry: "Area Laundry",
      Outdoor: "Area Luar",
      Pool: "Kolam Renang",
      "Keys & Access":
        "Kunci & Akses",
      Other: "Lainnya",
    };

  return labels[value] || value;
}

function inventoryItemLabel(
  value: string,
  language: InventoryEditorLanguage
) {
  if (language === "en") {
    return value;
  }

  return (
    INVENTORY_ITEM_ID[value] ||
    value
  );
}

function conditionLabel(
  condition:
    InventoryCondition | null,
  language: InventoryEditorLanguage
) {
  if (!condition) return "-";

  const option =
    INVENTORY_CONDITIONS.find(
      (item) =>
        item.value === condition
    );

  if (!option) {
    return condition;
  }

  return language === "id"
    ? option.labelId
    : option.labelEn;
}

export default function InventoryEditorPage() {
  const params = useParams<{
    id: string;
  }>();

  const router = useRouter();

  const documentId =
    String(params?.id || "");

  const [
    document,
    setDocument,
  ] =
    useState<
      InventoryDocument | null
    >(null);

  const [
    inventory,
    setInventory,
  ] =
    useState<
      AgentInventoryData | null
    >(null);

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
    generating,
    setGenerating,
  ] =
    useState(false);

  const [
    pdfUrl,
    setPdfUrl,
  ] =
    useState<string | null>(
      null
    );

  const [
    pdfFile,
    setPdfFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    generatedFileName,
    setGeneratedFileName,
  ] =
    useState("");

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
    editorLanguage,
    setEditorLanguage,
  ] =
    useState<InventoryEditorLanguage>(
      "id"
    );

  const [
    openSections,
    setOpenSections,
  ] =
    useState<
      Record<string, boolean>
    >({});

  const loadDocument =
    useCallback(
      async () => {
        if (!documentId) {
          return;
        }

        setLoading(true);
        setErrorMessage("");

        try {
          const {
            data: sessionData,
          } =
            await supabase.auth
              .getSession();

          const session =
            sessionData.session;

          if (!session) {
            throw new Error(
              "Session login tidak ditemukan."
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
              .catch(() => ({}));

          if (!response.ok) {
            throw new Error(
              body?.error ||
              "Inventory tidak dapat dimuat."
            );
          }

          if (
            body.document
              ?.document_type !==
            "inventory"
          ) {
            throw new Error(
              "Document ini bukan Inventory."
            );
          }

          const loaded =
            body.document as InventoryDocument;

          setDocument(loaded);
          setInventory(loaded.data);

          setEditorLanguage(
            loaded.language === "en"
              ? "en"
              : "id"
          );

          const sections =
            (
              loaded.data
                ?.sections || []
            ).reduce(
              (
                result:
                  Record<
                    string,
                    boolean
                  >,
                section
              ) => {
                result[
                  section.id
                ] = true;

                return result;
              },
              {}
            );

          setOpenSections(
            sections
          );
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Inventory tidak dapat dimuat."
          );
        } finally {
          setLoading(false);
        }
      },
      [documentId]
    );

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  useEffect(() => {
    if (!pdfUrl) {
      return;
    }

    return () => {
      URL.revokeObjectURL(
        pdfUrl
      );
    };
  }, [pdfUrl]);

  function clearPdfOnly() {
    if (pdfUrl) {
      URL.revokeObjectURL(
        pdfUrl
      );
    }

    setPdfUrl(null);
    setPdfFile(null);
    setGeneratedFileName("");
  }

  const copy =
    INVENTORY_COPY[
      editorLanguage
    ];

  const includedCount =
    useMemo(
      () =>
        inventory
          ? countIncludedInventoryItems(
              inventory
            )
          : 0,
      [inventory]
    );

  const issueCount =
    useMemo(
      () =>
        inventory
          ? countInventoryIssues(
              inventory
            )
          : 0,
      [inventory]
    );

  function updateItem(
    sectionId: string,
    itemId: string,
    changes:
      Partial<InventoryItem>
  ) {
    setInventory(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          sections:
            current.sections.map(
              (section) =>
                section.id !==
                sectionId
                  ? section
                  : {
                      ...section,

                      items:
                        section.items.map(
                          (item) =>
                            item.id !==
                            itemId
                              ? item
                              : {
                                  ...item,
                                  ...changes,
                                }
                        ),
                    }
            ),
        };
      }
    );

    setSuccessMessage("");
  }

  function addCustomItem(
    sectionId: string
  ) {
    const name =
      window.prompt(
        copy.customPrompt
      );

    if (!name?.trim()) {
      return;
    }

    setInventory(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          sections:
            current.sections.map(
              (section) =>
                section.id !==
                sectionId
                  ? section
                  : {
                      ...section,

                      items: [
                        ...section.items,
                        createCustomInventoryItem(
                          section.id,
                          name
                        ),
                      ],
                    }
            ),
        };
      }
    );
  }

  async function saveInventory() {
    if (
      !inventory ||
      !document
    ) {
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const {
        data: sessionData,
      } =
        await supabase.auth
          .getSession();

      const session =
        sessionData.session;

      if (!session) {
        throw new Error(
          "Session login tidak ditemukan."
        );
      }

      const response =
        await fetch(
          `/api/agent/documents/${document.id}`,
          {
            method: "PATCH",

            headers: {
              Authorization:
                `Bearer ${session.access_token}`,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                data:
                  inventory,

                status:
                  document.status,

                language:
                  editorLanguage,
              }),
          }
        );

      const body =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          body?.error ||
          "Inventory tidak dapat disimpan."
        );
      }

      setDocument(
        body.document
      );

      setSuccessMessage(
        "Inventory berhasil disimpan."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Inventory tidak dapat disimpan."
      );
    } finally {
      setSaving(false);
    }
  }

  async function generatePdf() {
    if (
      !inventory ||
      !document
    ) {
      return;
    }

    setGenerating(true);
    setErrorMessage("");
    setSuccessMessage("");
    clearPdfOnly();

    try {
      const {
        data: sessionData,
      } =
        await supabase.auth
          .getSession();

      const session =
        sessionData.session;

      if (!session) {
        throw new Error(
          editorLanguage === "id"
            ? "Session login tidak ditemukan."
            : "Login session not found."
        );
      }

      /*
       * Save the current editor state first so
       * the PDF always reflects what is on screen.
       */
      const saveResponse =
        await fetch(
          `/api/agent/documents/${document.id}`,
          {
            method: "PATCH",

            headers: {
              Authorization:
                `Bearer ${session.access_token}`,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                data:
                  inventory,

                status:
                  document.status,

                language:
                  editorLanguage,
              }),
          }
        );

      const saveBody =
        await saveResponse
          .json()
          .catch(() => ({}));

      if (!saveResponse.ok) {
        throw new Error(
          saveBody?.error ||
          (
            editorLanguage ===
            "id"
              ? "Inventory tidak dapat disimpan sebelum membuat PDF."
              : "Inventory could not be saved before generating the PDF."
          )
        );
      }

      if (
        saveBody.document
      ) {
        setDocument(
          saveBody.document
        );
      }

      const response =
        await fetch(
          `/api/agent/documents/inventory/${document.id}/generate`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },
          }
        );

      if (!response.ok) {
        let message = "";

        try {
          const payload =
            await response
              .json();

          message =
            typeof payload?.error ===
            "string"
              ? payload.error
              : "";
        } catch {
          message = "";
        }

        throw new Error(
          message ||
          (
            editorLanguage ===
            "id"
              ? "PDF Inventory tidak dapat dibuat."
              : "Inventory PDF could not be generated."
          )
        );
      }

      const blob =
        await response
          .blob();

      const disposition =
        response.headers.get(
          "content-disposition"
        ) || "";

      const fileMatch =
        disposition.match(
          /filename="?([^";]+)"?/i
        );

      const fileName =
        fileMatch?.[1] ||
        "tetamo-property-inventory.pdf";

      const file =
        new File(
          [blob],
          fileName,
          {
            type:
              "application/pdf",
          }
        );

      const objectUrl =
        URL.createObjectURL(
          blob
        );

      setPdfFile(file);
      setPdfUrl(
        objectUrl
      );
      setGeneratedFileName(
        fileName
      );

      setSuccessMessage(
        editorLanguage === "id"
          ? "PDF Inventory berhasil dibuat."
          : "Inventory PDF generated successfully."
      );
    } catch (error) {
      console.error(
        "Inventory PDF generation failed:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : (
              editorLanguage ===
              "id"
                ? "PDF Inventory tidak dapat dibuat."
                : "Inventory PDF could not be generated."
            )
      );
    } finally {
      setGenerating(false);
    }
  }

  function downloadPdf() {
    if (!pdfUrl) {
      return;
    }

    const anchor =
      window.document.createElement(
        "a"
      );

    anchor.href =
      pdfUrl;

    anchor.download =
      generatedFileName ||
      "tetamo-property-inventory.pdf";

    window.document.body.appendChild(
      anchor
    );

    anchor.click();
    anchor.remove();
  }

  function openForPrint() {
    if (!pdfUrl) {
      return;
    }

    const opened =
      window.open(
        pdfUrl,
        "_blank"
      );

    if (!opened) {
      setErrorMessage(
        editorLanguage === "id"
          ? "Browser memblokir tab PDF. Izinkan pop-up lalu coba lagi."
          : "The browser blocked the PDF tab. Allow pop-ups and try again."
      );
    }
  }

  async function sharePdf() {
    if (!pdfFile) {
      return;
    }

    const shareNavigator =
      navigator as FileShareNavigator;

    if (
      !shareNavigator.share
    ) {
      setErrorMessage(
        editorLanguage === "id"
          ? "Browser ini belum mendukung share file langsung. Download PDF lalu bagikan melalui WhatsApp atau email."
          : "This browser does not support direct file sharing. Download the PDF and share it through WhatsApp or email."
      );

      return;
    }

    if (
      shareNavigator.canShare &&
      !shareNavigator.canShare({
        files: [
          pdfFile,
        ],
      })
    ) {
      setErrorMessage(
        editorLanguage === "id"
          ? "Browser ini tidak dapat membagikan file PDF langsung. Download PDF lalu bagikan melalui WhatsApp atau email."
          : "This browser cannot share the PDF file directly. Download it and share it through WhatsApp or email."
      );

      return;
    }

    try {
      await shareNavigator.share({
        title:
          editorLanguage === "id"
            ? "Tetamo Inventory & Serah Terima"
            : "Tetamo Property Inventory & Handover",

        files: [
          pdfFile,
        ],
      });
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name ===
          "AbortError"
      ) {
        return;
      }

      setErrorMessage(
        editorLanguage === "id"
          ? "PDF tidak dapat dibagikan."
          : "The PDF could not be shared."
      );
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[560px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#B58A3C]" />

          <p className="mt-3 text-sm font-medium text-gray-500">
            Loading Inventory...
          </p>
        </div>
      </div>
    );
  }

  if (
    !inventory ||
    !document
  ) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
        <p className="font-semibold text-red-700">
          {errorMessage ||
            "Inventory tidak ditemukan."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12">
      <section className="rounded-[2rem] border border-[#E5E0D7] bg-[#F3EDE2] px-5 py-6 shadow-sm sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/agentdashboard/inventory"
                )
              }
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#80652F]"
            >
              <ArrowLeft className="h-4 w-4" />
              {copy.back}
            </button>

            <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-[#9E762F]">
              {copy.builder}
            </p>

            <h1 className="mt-1 text-2xl font-black text-[#1C1C1E]">
              {document.title}
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              {inventory.property.title}
              {inventory.property.location
                ? ` • ${inventory.property.location}`
                : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-[#D8C9A9] bg-white p-1">
              {(
                [
                  ["id", "ID"],
                  ["en", "EN"],
                ] as const
              ).map(
                ([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setEditorLanguage(
                        value
                      );

                      setDocument(
                        (current) =>
                          current
                            ? {
                                ...current,
                                language:
                                  value,
                              }
                            : current
                      );
                    }}
                    className={`rounded-lg px-3.5 py-2 text-xs font-black transition ${
                      editorLanguage ===
                      value
                        ? "bg-[#17171A] text-white"
                        : "text-[#80652F] hover:bg-[#F3EDE2]"
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
                generating ||
                saving
              }
              onClick={
                generatePdf
              }
              className="inline-flex items-center gap-2 rounded-xl border border-[#CDB683] bg-white px-4 py-3 text-sm font-bold text-[#80652F] transition hover:bg-[#F8F3E9] disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}

              {generating
                ? copy.generatingPdf
                : copy.generatePdf}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={
                saveInventory
              }
              className="inline-flex items-center gap-2 rounded-xl bg-[#17171A] px-5 py-3 text-sm font-bold text-white transition hover:bg-black disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              {saving
                ? copy.saving
                : copy.save}
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
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[#1C1C1E]">
              {copy.handoverInfo}
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-gray-400">
                  {copy.ownerName}
                </span>

                <input
                  value={
                    inventory.owner
                      .name
                  }
                  onChange={(event) =>
                    setInventory({
                      ...inventory,
                      owner: {
                        ...inventory.owner,
                        name:
                          event.target
                            .value,
                      },
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm outline-none focus:border-[#B58A3C]"
                />
              </label>

              <label>
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-gray-400">
                  {copy.tenantName}
                </span>

                <input
                  value={
                    inventory.tenant
                      .name
                  }
                  onChange={(event) =>
                    setInventory({
                      ...inventory,
                      tenant: {
                        ...inventory.tenant,
                        name:
                          event.target
                            .value,
                      },
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm outline-none focus:border-[#B58A3C]"
                />
              </label>

              <label>
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-gray-400">
                  {copy.handoverDate}
                </span>

                <input
                  type="date"
                  value={
                    inventory.handoverDate
                  }
                  onChange={(event) =>
                    setInventory({
                      ...inventory,
                      handoverDate:
                        event.target
                          .value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm outline-none focus:border-[#B58A3C]"
                />
              </label>

              <label>
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-gray-400">
                  {copy.agent}
                </span>

                <input
                  readOnly
                  value={
                    inventory.agent
                      .name
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm text-gray-600"
                />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-gray-400">
                {copy.generalNotes}
              </span>

              <textarea
                rows={3}
                value={
                  inventory.generalNotes
                }
                onChange={(event) =>
                  setInventory({
                    ...inventory,
                    generalNotes:
                      event.target
                        .value,
                  })
                }
                className="mt-2 w-full resize-y rounded-xl border border-gray-200 px-3.5 py-3 text-sm outline-none focus:border-[#B58A3C]"
              />
            </label>
          </section>

          <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#9E762F]">
                  {copy.checklist}
                </p>

                <h2 className="mt-1 text-lg font-bold text-[#1C1C1E]">
                  {copy.itemsCondition}
                </h2>
              </div>

              <div className="flex gap-2">
                <span className="rounded-full bg-[#F3EDE2] px-3 py-1.5 text-xs font-bold text-[#80652F]">
                  {includedCount} {copy.included}
                </span>

                {issueCount > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {issueCount} {copy.issues}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {inventory.sections.map(
                (section) => {
                  const open =
                    openSections[
                      section.id
                    ] !== false;

                  return (
                    <div
                      key={
                        section.id
                      }
                      className="overflow-hidden rounded-2xl border border-gray-200"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenSections(
                            (current) => ({
                              ...current,
                              [section.id]:
                                !open,
                            })
                          )
                        }
                        className="flex w-full items-center justify-between bg-[#FAFAF9] px-4 py-3.5 text-left"
                      >
                        <span className="font-bold text-[#1C1C1E]">
                          {inventorySectionLabel(
                            section.name,
                            editorLanguage
                          )}
                        </span>

                        {open ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </button>

                      {open ? (
                        <div className="divide-y divide-gray-100">
                          {section.items.map(
                            (item) => (
                              <div
                                key={
                                  item.id
                                }
                                className={`p-4 ${
                                  item.included
                                    ? "bg-white"
                                    : "bg-gray-50/40"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateItem(
                                        section.id,
                                        item.id,
                                        {
                                          included:
                                            !item.included,

                                          condition:
                                            !item.included &&
                                            !item.condition
                                              ? "good"
                                              : item.condition,
                                        }
                                      )
                                    }
                                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                      item.included
                                        ? "border-[#B58A3C] bg-[#B58A3C] text-white"
                                        : "border-gray-300 bg-white"
                                    }`}
                                  >
                                    {item.included ? (
                                      <Check className="h-3.5 w-3.5" />
                                    ) : null}
                                  </button>

                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-[#1C1C1E]">
                                      {inventoryItemLabel(
                                        item.name,
                                        editorLanguage
                                      )}
                                    </p>

                                    {item.included ? (
                                      <div className="mt-3 grid gap-3 sm:grid-cols-[90px_150px_1fr]">
                                        <label>
                                          <span className="text-[10px] font-bold uppercase text-gray-400">
                                            {copy.quantity}
                                          </span>

                                          <input
                                            type="number"
                                            min={1}
                                            value={
                                              item.quantity
                                            }
                                            onChange={(event) =>
                                              updateItem(
                                                section.id,
                                                item.id,
                                                {
                                                  quantity:
                                                    Math.max(
                                                      1,
                                                      Number(
                                                        event
                                                          .target
                                                          .value
                                                      ) ||
                                                        1
                                                    ),
                                                }
                                              )
                                            }
                                            className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs"
                                          />
                                        </label>

                                        <label>
                                          <span className="text-[10px] font-bold uppercase text-gray-400">
                                            {copy.condition}
                                          </span>

                                          <select
                                            value={
                                              item.condition ||
                                              ""
                                            }
                                            onChange={(event) =>
                                              updateItem(
                                                section.id,
                                                item.id,
                                                {
                                                  condition:
                                                    event
                                                      .target
                                                      .value as InventoryCondition,
                                                }
                                              )
                                            }
                                            className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs"
                                          >
                                            {INVENTORY_CONDITIONS.map(
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
                                                  {
                                                    editorLanguage ===
                                                    "id"
                                                      ? option.labelId
                                                      : option.labelEn
                                                  }
                                                </option>
                                              )
                                            )}
                                          </select>
                                        </label>

                                        <label>
                                          <span className="text-[10px] font-bold uppercase text-gray-400">
                                            {copy.notes}
                                          </span>

                                          <input
                                            value={
                                              item.notes
                                            }
                                            onChange={(event) =>
                                              updateItem(
                                                section.id,
                                                item.id,
                                                {
                                                  notes:
                                                    event
                                                      .target
                                                      .value,
                                                }
                                              )
                                            }
                                            placeholder={copy.optionalNotes}
                                            className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs"
                                          />
                                        </label>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            )
                          )}

                          <div className="p-3">
                            <button
                              type="button"
                              onClick={() =>
                                addCustomItem(
                                  section.id
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[#CDB683] px-3 py-2 text-xs font-bold text-[#80652F]"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              {copy.addCustom}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                }
              )}
            </div>
          </section>
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <section className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#B58A3C]" />

                <p className="text-sm font-bold text-[#1C1C1E]">
                  {pdfUrl
                    ? copy.pdfPreview
                    : copy.livePreview}
                </p>
              </div>

              <p className="mt-1 text-xs text-gray-500">
                {pdfUrl
                  ? generatedFileName
                  : copy.previewHelp}
              </p>
            </div>

            {pdfUrl ? (
              <div className="border-b border-gray-100 bg-white px-5 py-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={
                      downloadPdf
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    <FileDown className="h-4 w-4" />
                    {copy.downloadPdf}
                  </button>

                  <button
                    type="button"
                    onClick={
                      sharePdf
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    <Share2 className="h-4 w-4" />
                    {copy.sharePdf}
                  </button>

                  <button
                    type="button"
                    onClick={
                      openForPrint
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#17171A] px-3 py-2 text-xs font-semibold text-white transition hover:bg-black"
                  >
                    <Printer className="h-4 w-4" />
                    {copy.openPdf}
                  </button>
                </div>
              </div>
            ) : null}

            {pdfUrl ? (
              <div className="bg-[#DCD9D2] p-3 sm:p-4">
                <iframe
                  src={
                    pdfUrl
                  }
                  title="Tetamo Inventory PDF Preview"
                  className="h-[760px] w-full rounded-xl border-0 bg-white shadow-lg"
                />
              </div>
            ) : null}

            <div
              className={
                pdfUrl
                  ? "hidden"
                  : "bg-[#E8E3D9] p-4"
              }
            >
              <div className="mx-auto min-h-[760px] max-w-[600px] bg-white px-8 py-10 shadow-xl">
                <div className="border-b border-[#B58A3C] pb-5">
                  <p className="text-[10px] font-black tracking-[0.25em] text-[#B58A3C]">
                    TETAMO
                  </p>

                  <h2 className="mt-3 text-xl font-black text-[#17171A]">
                    {copy.reportTitle}
                  </h2>

                  <p className="mt-2 text-xs text-gray-500">
                    {inventory.property.code ||
                      "Property"}{" "}
                    •{" "}
                    {inventory.property.title}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 text-xs">
                  <div>
                    <p className="font-bold text-gray-400">
                      {copy.owner}
                    </p>

                    <p className="mt-1 text-gray-800">
                      {inventory.owner.name ||
                        "-"}
                    </p>
                  </div>

                  <div>
                    <p className="font-bold text-gray-400">
                      {copy.tenant}
                    </p>

                    <p className="mt-1 text-gray-800">
                      {inventory.tenant.name ||
                        "-"}
                    </p>
                  </div>

                  <div>
                    <p className="font-bold text-gray-400">
                      Agent
                    </p>

                    <p className="mt-1 text-gray-800">
                      {inventory.agent.name ||
                        "-"}
                    </p>
                  </div>

                  <div>
                    <p className="font-bold text-gray-400">
                      {copy.handover}
                    </p>

                    <p className="mt-1 text-gray-800">
                      {inventory.handoverDate ||
                        "-"}
                    </p>
                  </div>
                </div>

                <div className="mt-7 space-y-6">
                  {inventory.sections.map(
                    (section) => {
                      const included =
                        section.items.filter(
                          (item) =>
                            item.included
                        );

                      if (
                        included.length ===
                        0
                      ) {
                        return null;
                      }

                      return (
                        <div
                          key={
                            section.id
                          }
                        >
                          <p className="border-b border-gray-200 pb-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#80652F]">
                            {inventorySectionLabel(
                              section.name,
                              editorLanguage
                            )}
                          </p>

                          <div className="mt-2 space-y-2">
                            {included.map(
                              (item) => (
                                <div
                                  key={
                                    item.id
                                  }
                                  className="grid grid-cols-[1fr_auto] gap-4 text-xs"
                                >
                                  <div>
                                    <span className="font-semibold text-gray-800">
                                      {
                                        item.quantity
                                      }
                                      ×{" "}
                                      {inventoryItemLabel(
                                        item.name,
                                        editorLanguage
                                      )}
                                    </span>

                                    {item.notes ? (
                                      <p className="mt-0.5 text-[10px] text-gray-500">
                                        {
                                          item.notes
                                        }
                                      </p>
                                    ) : null}
                                  </div>

                                  <span
                                    className={`font-bold ${
                                      item.condition ===
                                        "damaged" ||
                                      item.condition ===
                                        "missing"
                                        ? "text-red-600"
                                        : "text-gray-600"
                                    }`}
                                  >
                                    {conditionLabel(
                                      item.condition,
                                      editorLanguage
                                    )}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}

                  {includedCount ===
                  0 ? (
                    <div className="py-16 text-center">
                      <ClipboardList className="mx-auto h-8 w-8 text-gray-300" />

                      <p className="mt-3 text-xs font-semibold text-gray-400">
                        {copy.empty}
                      </p>
                    </div>
                  ) : null}
                </div>

                {inventory.generalNotes ? (
                  <div className="mt-7 border-t border-gray-200 pt-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">
                      {copy.generalNotes}
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-gray-700">
                      {
                        inventory.generalNotes
                      }
                    </p>
                  </div>
                ) : null}

                <div className="mt-10 border-t border-gray-200 pt-5 text-[9px] text-gray-400">
                  {copy.generated}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
