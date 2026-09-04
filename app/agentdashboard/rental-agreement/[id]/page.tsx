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
  FileDown,
  FileText,
  Loader2,
  Paperclip,
  Printer,
  Save,
  Share2,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  supabase,
} from "@/lib/supabase";

import {
  calculateRentalAgreedTotal,
  calculateRentalBaseTotal,
  type RentalAgreementData,
  type RentalPaymentFrequency,
  type RentalResponsibility,
} from "@/lib/agent-rental-agreement";

import {
  buildRentalAgreementClauses,
  rentalPartyDisplayName,
  rentalPreviewDate,
  rentalPreviewMoney,
} from "@/lib/agent-rental-agreement-copy";

type FileShareNavigator =
  Navigator & {
    share?: (
      data: ShareData
    ) => Promise<void>;

    canShare?: (
      data: ShareData
    ) => boolean;
  };

type RentalDocument = {
  id: string;
  user_id: string;
  property_id:
    | string
    | null;
  document_type:
    "rental_agreement";
  title: string;
  language:
    | "id"
    | "bilingual";
  status:
    | "draft"
    | "ready"
    | "completed";
  data:
    RentalAgreementData;
  updated_at: string;
};

type InventoryDocument = {
  id: string;
  property_id:
    | string
    | null;
  title: string;
  status:
    | "draft"
    | "ready"
    | "completed";
  updated_at: string;
};

const RENTAL_FORM_COPY = {
  id: {
    back: "Kembali ke Rental Agreement",
    builder: "Pembuat Perjanjian",
    saveDraft: "Simpan Draft",
    saving: "Menyimpan...",

    agreementDetails:
      "Detail Perjanjian",
    agreementNumber:
      "Nomor Perjanjian",
    placeOfAgreement:
      "Tempat Perjanjian",
    agreementDate:
      "Tanggal Perjanjian",
    governingLanguage:
      "Bahasa Acuan",

    landlordTenant:
      "Pemilik & Penyewa",
    landlord:
      "Pemilik",
    tenant:
      "Penyewa",
    individual:
      "Perorangan",
    company:
      "Perusahaan",
    companyName:
      "Nama Perusahaan",
    fullName:
      "Nama Lengkap",
    nationality:
      "Kewarganegaraan",
    identityType:
      "Jenis Identitas",
    identityNumber:
      "Nomor Identitas",
    phone:
      "Nomor Telepon",
    email:
      "Email",
    address:
      "Alamat",

    leaseFinancial:
      "Masa Sewa & Ketentuan Keuangan",
    leaseStart:
      "Mulai Sewa",
    leaseEnd:
      "Akhir Sewa",
    handoverDate:
      "Tanggal Serah Terima",
    currency:
      "Mata Uang",
    rentalAmount:
      "Harga Sewa",
    paymentFrequency:
      "Frekuensi Pembayaran",
    securityDeposit:
      "Deposit Jaminan",
    securityDepositNote:
      "Disimpan terpisah dan tidak termasuk dalam total nilai sewa.",
    paymentSchedule:
      "Jadwal Pembayaran / Rincian Cicilan",
    paymentSchedulePlaceholder:
      "Contoh: 50% saat penandatanganan, 50% sebelum serah terima",

    taxCharges:
      "Pajak / Biaya Tambahan",
    taxExplanation:
      "Pajak tidak dihitung otomatis. Masukkan hanya jumlah yang telah disepakati para pihak.",
    manualAmount:
      "Jumlah Manual",
    taxNotes:
      "Catatan Pajak / Biaya",
    taxPlaceholder:
      "Contoh: Pajak dibayar terpisah oleh penyewa",

    baseRentTotal:
      "Total Dasar Sewa",
    agreedTotal:
      "Total Nilai Sewa",

    totalDateHelper:
      "Lengkapi tanggal mulai dan akhir sewa untuk menghitung total sewa bulanan, triwulanan, 6 bulanan, atau tahunan.",

    utilitiesMaintenance:
      "Utilitas & Perawatan",
    electricity:
      "Listrik",
    water:
      "Air",
    internet:
      "Internet",
    garbage:
      "Sampah",
    banjarCommunityFees:
      "Biaya Banjar / Komunitas",
    banjar:
      "Banjar / Biaya Lingkungan",
    poolMaintenance:
      "Perawatan Kolam",
    gardenMaintenance:
      "Perawatan Taman",
    housekeeping:
      "Housekeeping",

    utilityNotes:
      "Catatan Utilitas Lainnya",
    tenantRoutineMaintenance:
      "Perawatan Rutin oleh Penyewa",
    landlordMaintenance:
      "Perawatan oleh Pemilik",
    minorRepairThreshold:
      "Batas Biaya Perbaikan Kecil",
    damageResponsibility:
      "Tanggung Jawab Kerusakan",
    alterationRules:
      "Aturan Perubahan / Renovasi",

    occupancyRules:
      "Penghuni & Aturan",
    permittedUse:
      "Tujuan Penggunaan",
    maximumOccupants:
      "Jumlah Maksimum Penghuni",
    petsAllowed:
      "Hewan Peliharaan Diizinkan",
    smokingAllowed:
      "Merokok Diizinkan",
    sublettingAllowed:
      "Sub-Sewa Diizinkan",
    occupantNames:
      "Nama Penghuni",
    occupantNamesHelper:
      "Satu nama per baris.",
    sublettingNotes:
      "Ketentuan Tambahan Sub-Sewa",
    houseRules:
      "Aturan Properti",
    houseRulesHelper:
      "Satu aturan per baris.",

    inventoryAttachment:
      "Lampiran Inventory",
    attachInventory:
      "Lampirkan Inventory & Handover Report",
    selectInventory:
      "Pilih Inventory...",

    renewalTermination:
      "Perpanjangan & Pengakhiran",
    renewalAvailable:
      "Perpanjangan Dapat Dibicarakan",
    tenantEarlyTermination:
      "Penyewa Dapat Mengakhiri Lebih Awal",
    landlordEarlyTermination:
      "Pemilik Dapat Mengakhiri Lebih Awal",
    renewalNotes:
      "Ketentuan Tambahan Perpanjangan",
    depositDeductionNotes:
      "Ketentuan Potongan Deposit",
    renewalNoticeDays:
      "Pemberitahuan Perpanjangan (Hari)",
    terminationNoticeDays:
      "Pemberitahuan Pengakhiran (Hari)",
    breachCureDays:
      "Waktu Perbaikan Pelanggaran (Hari)",
    inspectionNoticeHours:
      "Pemberitahuan Inspeksi (Jam)",
    earlyTermination:
      "Ketentuan Tambahan Pengakhiran Dini",
    forceMajeureNotes:
      "Ketentuan Tambahan Keadaan Kahar",
    forceMajeurePlaceholder:
      "Tambahkan ketentuan khusus untuk keadaan kahar jika diperlukan",
    disputeResolution:
      "Ketentuan Tambahan Penyelesaian Perselisihan",

    earlyTerminationPlaceholder:
      "Tambahkan ketentuan pengakhiran dini jika ada",

    disputeResolutionPlaceholder:
      "Tambahkan ketentuan penyelesaian perselisihan jika ada",

    livePreview:
      "Preview Perjanjian",
    livePreviewNote:
      "Draft diperbarui otomatis saat Anda mengisi formulir.",
  },

  bilingual: {
    back:
      "Kembali / Back to Rental Agreements",
    builder:
      "Pembuat Perjanjian / Agreement Builder",
    saveDraft:
      "Simpan Draft / Save Draft",
    saving:
      "Menyimpan / Saving...",

    agreementDetails:
      "Detail Perjanjian / Agreement Details",
    agreementNumber:
      "Nomor Perjanjian / Agreement Number",
    placeOfAgreement:
      "Tempat Perjanjian / Place of Agreement",
    agreementDate:
      "Tanggal Perjanjian / Agreement Date",
    governingLanguage:
      "Bahasa Acuan / Governing Language",

    landlordTenant:
      "Pemilik & Penyewa / Landlord & Tenant",
    landlord:
      "Pemilik / Landlord",
    tenant:
      "Penyewa / Tenant",
    individual:
      "Perorangan / Individual",
    company:
      "Perusahaan / Company",
    companyName:
      "Nama Perusahaan / Company Name",
    fullName:
      "Nama Lengkap / Full Name",
    nationality:
      "Kewarganegaraan / Nationality",
    identityType:
      "Jenis Identitas / Identity Type",
    identityNumber:
      "Nomor Identitas / Identity Number",
    phone:
      "Telepon / Phone",
    email:
      "Email",
    address:
      "Alamat / Address",

    leaseFinancial:
      "Masa Sewa & Keuangan / Lease & Financial Terms",
    leaseStart:
      "Mulai Sewa / Lease Start",
    leaseEnd:
      "Akhir Sewa / Lease End",
    handoverDate:
      "Tanggal Serah Terima / Handover Date",
    currency:
      "Mata Uang / Currency",
    rentalAmount:
      "Harga Sewa / Rental Amount",
    paymentFrequency:
      "Frekuensi Pembayaran / Payment Frequency",
    securityDeposit:
      "Deposit Jaminan / Security Deposit",
    securityDepositNote:
      "Disimpan terpisah dan tidak termasuk dalam total nilai sewa / Held separately and not included in the agreed rent total.",
    paymentSchedule:
      "Jadwal Pembayaran / Payment Schedule",
    paymentSchedulePlaceholder:
      "Contoh / Example: 50% saat penandatanganan, 50% sebelum serah terima",

    taxCharges:
      "Pajak / Biaya Tambahan / Tax & Additional Charges",
    taxExplanation:
      "Pajak tidak dihitung otomatis oleh Tetamo / Tax is not calculated automatically.",
    manualAmount:
      "Jumlah Manual / Manual Amount",
    taxNotes:
      "Catatan Pajak / Tax & Charge Notes",
    taxPlaceholder:
      "Contoh / Example: Tax payable separately by tenant",

    baseRentTotal:
      "Total Dasar Sewa / Base Rent Total",
    agreedTotal:
      "Total Nilai Sewa / Total Rental Value",

    totalDateHelper:
      "Lengkapi tanggal mulai dan akhir sewa untuk menghitung total / Complete the lease start and end dates to calculate the rent total.",

    utilitiesMaintenance:
      "Utilitas & Perawatan / Utilities & Maintenance",
    electricity:
      "Listrik / Electricity",
    water:
      "Air / Water",
    internet:
      "Internet",
    garbage:
      "Sampah / Garbage",
    banjarCommunityFees:
      "Biaya Banjar / Komunitas / Banjar & Community Fees",
    banjar:
      "Banjar / Community Fees",
    poolMaintenance:
      "Perawatan Kolam / Pool Maintenance",
    gardenMaintenance:
      "Perawatan Taman / Garden Maintenance",
    housekeeping:
      "Housekeeping",

    utilityNotes:
      "Catatan Utilitas / Other Utility Notes",
    tenantRoutineMaintenance:
      "Perawatan Rutin Penyewa / Tenant Routine Maintenance",
    landlordMaintenance:
      "Perawatan Pemilik / Landlord Maintenance",
    minorRepairThreshold:
      "Batas Perbaikan Kecil / Minor Repair Threshold",
    damageResponsibility:
      "Tanggung Jawab Kerusakan / Damage Responsibility",
    alterationRules:
      "Aturan Perubahan / Alteration Rules",

    occupancyRules:
      "Penghuni & Aturan / Occupancy & Rules",
    permittedUse:
      "Tujuan Penggunaan / Permitted Use",
    maximumOccupants:
      "Maksimum Penghuni / Maximum Occupants",
    petsAllowed:
      "Hewan Peliharaan / Pets Allowed",
    smokingAllowed:
      "Merokok / Smoking Allowed",
    sublettingAllowed:
      "Sub-Sewa / Subletting Allowed",
    occupantNames:
      "Nama Penghuni / Occupant Names",
    occupantNamesHelper:
      "Satu nama per baris / One name per line.",
    sublettingNotes:
      "Ketentuan Sub-Sewa / Subletting Notes",
    houseRules:
      "Aturan Properti / Property Rules",
    houseRulesHelper:
      "Satu aturan per baris / One rule per line.",

    inventoryAttachment:
      "Lampiran Inventory / Inventory Attachment",
    attachInventory:
      "Lampirkan Inventory & Handover Report / Attach Inventory & Handover Report",
    selectInventory:
      "Pilih Inventory / Select Inventory...",

    renewalTermination:
      "Perpanjangan & Pengakhiran / Renewal & Termination",
    renewalAvailable:
      "Perpanjangan Dapat Dibicarakan / Renewal Available",
    tenantEarlyTermination:
      "Pengakhiran Dini oleh Penyewa / Tenant Early Termination",
    landlordEarlyTermination:
      "Pengakhiran Dini oleh Pemilik / Landlord Early Termination",
    renewalNotes:
      "Ketentuan Perpanjangan / Renewal Notes",
    depositDeductionNotes:
      "Ketentuan Potongan Deposit / Deposit Deduction Terms",
    renewalNoticeDays:
      "Pemberitahuan Perpanjangan / Renewal Notice Days",
    terminationNoticeDays:
      "Pemberitahuan Pengakhiran / Termination Notice Days",
    breachCureDays:
      "Waktu Perbaikan Pelanggaran / Breach Cure Days",
    inspectionNoticeHours:
      "Pemberitahuan Inspeksi / Inspection Notice Hours",
    earlyTermination:
      "Ketentuan Pengakhiran Dini / Early Termination Terms",
    forceMajeureNotes:
      "Ketentuan Keadaan Kahar / Force Majeure Terms",
    forceMajeurePlaceholder:
      "Tambahkan ketentuan khusus keadaan kahar / Add specific force majeure terms if applicable",
    disputeResolution:
      "Penyelesaian Perselisihan / Dispute Resolution",

    earlyTerminationPlaceholder:
      "Tambahkan ketentuan pengakhiran dini / Add early termination terms if applicable",

    disputeResolutionPlaceholder:
      "Tambahkan ketentuan penyelesaian perselisihan / Add dispute resolution terms if applicable",

    livePreview:
      "Preview Perjanjian / Live Agreement Preview",
    livePreviewNote:
      "Draft diperbarui otomatis saat Anda mengisi formulir / Draft updates automatically while you edit.",
  },
} as const;

const RESPONSIBILITY_OPTIONS:
  {
    value:
      RentalResponsibility;
    label: string;
  }[] = [
    {
      value: "landlord",
      label: "Pemilik",
    },
    {
      value: "tenant",
      label: "Penyewa",
    },
    {
      value: "included",
      label:
        "Included in Rent",
    },
    {
      value: "shared",
      label: "Shared",
    },
    {
      value:
        "not_applicable",
      label: "N/A",
    },
  ];

const NATIONALITY_OPTIONS = [
  "Indonesia",
  "Australia",
  "United States",
  "United Kingdom",
  "Canada",
  "New Zealand",
  "Singapore",
  "Malaysia",
  "Philippines",
  "China",
  "Hong Kong",
  "Taiwan",
  "Japan",
  "South Korea",
  "India",
  "France",
  "Germany",
  "Netherlands",
  "Belgium",
  "Switzerland",
  "Italy",
  "Spain",
  "Portugal",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Austria",
  "Ireland",
  "Russia",
  "Ukraine",
  "Poland",
  "Czech Republic",
  "South Africa",
  "Brazil",
  "Argentina",
  "Mexico",
  "United Arab Emirates",
  "Saudi Arabia",
  "Thailand",
  "Vietnam",
] as const;

const PAYMENT_OPTIONS:
  {
    value:
      RentalPaymentFrequency;
    label: string;
  }[] = [
    {
      value: "full",
      label:
        "Full / Upfront",
    },
    {
      value: "monthly",
      label: "Monthly",
    },
    {
      value: "quarterly",
      label: "Quarterly",
    },
    {
      value: "semiannual",
      label:
        "Every 6 Months",
    },
    {
      value: "yearly",
      label: "Yearly",
    },
    {
      value: "custom",
      label: "Custom",
    },
  ];

function numberValue(
  value: string
) {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}

function moneyInputValue(
  value: number
) {
  const safe =
    Number(value || 0);

  if (
    !Number.isFinite(safe)
  ) {
    return "";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      maximumFractionDigits: 0,
    }
  ).format(safe);
}

function moneyInputNumber(
  value: string
) {
  const cleaned =
    value.replace(
      /[^0-9]/g,
      ""
    );

  if (!cleaned) {
    return 0;
  }

  const parsed =
    Number(cleaned);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}

function rentalRateContext(
  frequency:
    RentalPaymentFrequency
) {
  if (
    frequency === "monthly"
  ) {
    return "per month";
  }

  if (
    frequency === "quarterly"
  ) {
    return "per 3 months";
  }

  if (
    frequency ===
    "semiannual"
  ) {
    return "per 6 months";
  }

  if (
    frequency === "yearly"
  ) {
    return "per year";
  }

  if (
    frequency === "full"
  ) {
    return "for the full lease";
  }

  return "custom payment schedule";
}

export default function RentalAgreementEditorPage() {
  const params =
    useParams<{
      id: string;
    }>();

  const router =
    useRouter();

  const documentId =
    String(
      params?.id ||
      ""
    );

  const [
    documentRecord,
    setDocumentRecord,
  ] =
    useState<
      RentalDocument | null
    >(null);

  const [
    agreement,
    setAgreement,
  ] =
    useState<
      RentalAgreementData | null
    >(null);

  const [
    inventories,
    setInventories,
  ] =
    useState<
      InventoryDocument[]
    >([]);

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

  const loadAgreement =
    useCallback(
      async () => {
        if (
          !documentId
        ) {
          return;
        }

        setLoading(true);
        setErrorMessage("");

        try {
          const {
            data:
              sessionData,
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

          const [
            documentResponse,
            inventoryResponse,
          ] =
            await Promise.all([
              fetch(
                `/api/agent/documents/${documentId}`,
                {
                  headers: {
                    Authorization:
                      `Bearer ${session.access_token}`,
                  },
                }
              ),

              fetch(
                "/api/agent/documents?type=inventory",
                {
                  headers: {
                    Authorization:
                      `Bearer ${session.access_token}`,
                  },
                }
              ),
            ]);

          const body =
            await documentResponse
              .json()
              .catch(
                () => ({})
              );

          if (
            !documentResponse.ok
          ) {
            throw new Error(
              body?.error ||
              "Rental Agreement tidak dapat dimuat."
            );
          }

          if (
            body.document
              ?.document_type !==
            "rental_agreement"
          ) {
            throw new Error(
              "Document ini bukan Rental Agreement."
            );
          }

          const loaded =
            body.document as RentalDocument;

          setDocumentRecord(
            loaded
          );

          setAgreement(
            loaded.data
          );

          const inventoryBody =
            await inventoryResponse
              .json()
              .catch(
                () => ({})
              );

          if (
            inventoryResponse.ok
          ) {
            const matches =
              (
                inventoryBody.documents ||
                []
              )
                .filter(
                  (
                    item:
                      InventoryDocument
                  ) =>
                    !loaded.property_id ||
                    item.property_id ===
                      loaded.property_id
                );

            setInventories(
              matches
            );
          }
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Rental Agreement tidak dapat dimuat."
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
    loadAgreement();
  }, [loadAgreement]);

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

  /*
   * A generated PDF is a snapshot.
   *
   * If the agent changes the agreement after generating it
   * — including changing ID to ID+EN —
   * remove the old PDF preview so an outdated document
   * cannot accidentally be printed.
   */
  useEffect(() => {
    if (!pdfUrl) {
      return;
    }

    clearPdfOnly();

    // The PDF should only be invalidated when agreement data changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agreement]);

  const clausesID =
    useMemo(
      () =>
        agreement
          ? buildRentalAgreementClauses(
              agreement,
              "id"
            )
          : [],
      [
        agreement,
      ]
    );

  const clausesEN =
    useMemo(
      () =>
        agreement
          ? buildRentalAgreementClauses(
              agreement,
              "en"
            )
          : [],
      [
        agreement,
      ]
    );

  const baseRentTotal =
    useMemo(
      () =>
        agreement
          ? calculateRentalBaseTotal(
              agreement
            )
          : 0,
      [agreement]
    );

  const agreedTotal =
    useMemo(
      () =>
        agreement
          ? calculateRentalAgreedTotal(
              agreement
            )
          : 0,
      [agreement]
    );

  async function saveAgreement() {
    if (
      !agreement ||
      !documentRecord
    ) {
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const {
        data:
          sessionData,
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
          `/api/agent/documents/${documentRecord.id}`,
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
                  agreement,

                language:
                  agreement.language,

                status:
                  documentRecord.status,
              }),
          }
        );

      const body =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (!response.ok) {
        throw new Error(
          body?.error ||
          "Rental Agreement tidak dapat disimpan."
        );
      }

      setDocumentRecord(
        body.document
      );

      setSuccessMessage(
        "Rental Agreement berhasil disimpan."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Rental Agreement tidak dapat disimpan."
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  async function generatePdf() {
    if (
      !agreement ||
      !documentRecord
    ) {
      return;
    }

    setGenerating(true);
    setErrorMessage("");
    setSuccessMessage("");
    clearPdfOnly();

    try {
      const {
        data:
          sessionData,
      } =
        await supabase.auth
          .getSession();

      const session =
        sessionData.session;

      if (!session) {
        throw new Error(
          bilingual
            ? "Sesi login tidak ditemukan / Login session not found."
            : "Sesi login tidak ditemukan."
        );
      }

      /*
       * Save what is currently on screen first,
       * so the PDF always matches the editor.
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
                  agreement,

                language:
                  agreement.language,

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
            bilingual
              ? "Rental Agreement tidak dapat disimpan sebelum membuat PDF / Rental Agreement could not be saved before generating the PDF."
              : "Rental Agreement tidak dapat disimpan sebelum membuat PDF."
          )
        );
      }

      if (
        saveBody.document
      ) {
        setDocumentRecord(
          saveBody.document
        );
      }

      const response =
        await fetch(
          `/api/agent/documents/rental-agreement/${documentRecord.id}/generate`,
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
        let message = "";

        try {
          const payload =
            await response.json();

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
            bilingual
              ? "PDF Rental Agreement tidak dapat dibuat / Rental Agreement PDF could not be generated."
              : "PDF Rental Agreement tidak dapat dibuat."
          )
        );
      }

      const blob =
        await response.blob();

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
        (
          bilingual
            ? "rental-agreement.pdf"
            : "perjanjian-sewa.pdf"
        );

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

      setPdfFile(
        file
      );

      setPdfUrl(
        objectUrl
      );

      setGeneratedFileName(
        fileName
      );

      setSuccessMessage(
        bilingual
          ? "PDF berhasil dibuat / PDF generated successfully."
          : "PDF berhasil dibuat."
      );
    } catch (error) {
      console.error(
        "Rental Agreement PDF generation failed:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : (
              bilingual
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

  function downloadPdf() {
    if (!pdfUrl) {
      return;
    }

    const anchor =
      window.document
        .createElement(
          "a"
        );

    anchor.href =
      pdfUrl;

    anchor.download =
      generatedFileName ||
      (
        bilingual
          ? "rental-agreement.pdf"
          : "perjanjian-sewa.pdf"
      );

    window.document.body
      .appendChild(
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
        bilingual
          ? "Browser memblokir tab PDF. Izinkan pop-up lalu coba lagi / The browser blocked the PDF tab. Allow pop-ups and try again."
          : "Browser memblokir tab PDF. Izinkan pop-up lalu coba lagi."
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
        bilingual
          ? "Browser ini belum mendukung berbagi file PDF langsung. Download PDF lalu bagikan melalui WhatsApp atau email / This browser does not support direct PDF sharing."
          : "Browser ini belum mendukung berbagi file PDF langsung. Download PDF lalu bagikan melalui WhatsApp atau email."
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
        bilingual
          ? "Browser ini tidak dapat membagikan file PDF langsung. Download PDF lalu bagikan secara manual / This browser cannot share the PDF directly."
          : "Browser ini tidak dapat membagikan file PDF langsung. Download PDF lalu bagikan secara manual."
      );

      return;
    }

    try {
      await shareNavigator.share({
        title:
          bilingual
            ? "Perjanjian Sewa / Rental Agreement"
            : "Perjanjian Sewa",

        files: [
          pdfFile,
        ],
      });
    } catch (error) {
      if (
        error instanceof
          DOMException &&
        error.name ===
          "AbortError"
      ) {
        return;
      }

      setErrorMessage(
        bilingual
          ? "PDF tidak dapat dibagikan / PDF could not be shared."
          : "PDF tidak dapat dibagikan."
      );
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[560px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#B58A3C]" />
      </div>
    );
  }

  if (
    !agreement ||
    !documentRecord
  ) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
        {errorMessage ||
          "Rental Agreement tidak ditemukan."}
      </div>
    );
  }

  const bilingual =
    agreement.language ===
    "bilingual";

  const formCopy =
    RENTAL_FORM_COPY[
      bilingual
        ? "bilingual"
        : "id"
    ];

  return (
    <div className="space-y-5 pb-12">
      <section className="rounded-[2rem] border border-[#E5E0D7] bg-[#F3EDE2] px-5 py-6 shadow-sm sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/agentdashboard/rental-agreement"
                )
              }
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#80652F]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Rental Agreements
            </button>

            <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-[#9E762F]">
              Agreement Builder
            </p>

            <h1 className="mt-1 text-2xl font-black text-[#1C1C1E]">
              {documentRecord.title}
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              {agreement.property.title}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-[#D8C9A9] bg-white p-1">
              <button
                type="button"
                onClick={() =>
                  setAgreement({
                    ...agreement,
                    language:
                      "id",
                    governingLanguage:
                      "id",
                  })
                }
                className={`rounded-lg px-3 py-2 text-xs font-black ${
                  !bilingual
                    ? "bg-[#17171A] text-white"
                    : "text-[#80652F]"
                }`}
              >
                ID
              </button>

              <button
                type="button"
                onClick={() =>
                  setAgreement({
                    ...agreement,
                    language:
                      "bilingual",
                  })
                }
                className={`rounded-lg px-3 py-2 text-xs font-black ${
                  bilingual
                    ? "bg-[#17171A] text-white"
                    : "text-[#80652F]"
                }`}
              >
                ID + EN
              </button>
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
                ? (
                    bilingual
                      ? "Membuat PDF / Generating..."
                      : "Membuat PDF..."
                  )
                : (
                    bilingual
                      ? "Buat PDF / Generate PDF"
                      : "Buat PDF"
                  )}
            </button>

            <button
              type="button"
              disabled={
                saving
              }
              onClick={
                saveAgreement
              }
              className="inline-flex items-center gap-2 rounded-xl bg-[#17171A] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              {saving
                ? formCopy.saving
                : formCopy.saveDraft}
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

          {/* BASIC AGREEMENT */}

          <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#B58A3C]" />

              <h2 className="text-lg font-black text-[#1C1C1E]">
                {formCopy.agreementDetails}
              </h2>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="text-xs font-bold text-gray-500">
                  Agreement Number
                </span>

                <input
                  value={
                    agreement.agreementNumber
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      agreementNumber:
                        event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>

              <label>
                <span className="text-xs font-bold text-gray-500">
                  Place of Agreement
                </span>

                <input
                  value={
                    agreement.placeOfAgreement
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      placeOfAgreement:
                        event.target.value,
                    })
                  }
                  placeholder="Bali"
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>

              <label>
                <span className="text-xs font-bold text-gray-500">
                  Agreement Date
                </span>

                <input
                  type="date"
                  value={
                    agreement.agreementDate
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      agreementDate:
                        event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>

              {bilingual ? (
                <label>
                  <span className="text-xs font-bold text-gray-500">
                    Governing Language
                  </span>

                  <select
                    value={
                      agreement.governingLanguage
                    }
                    onChange={(event) =>
                      setAgreement({
                        ...agreement,
                        governingLanguage:
                          event.target.value ===
                          "en"
                            ? "en"
                            : "id",
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                  >
                    <option value="id">
                      Bahasa Indonesia
                    </option>

                    <option value="en">
                      English
                    </option>
                  </select>
                </label>
              ) : null}
            </div>
          </section>

          {/* PARTIES */}

          <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-[#B58A3C]" />

              <h2 className="text-lg font-black text-[#1C1C1E]">
                {formCopy.landlordTenant}
              </h2>
            </div>

            {(
              [
                [
                  "landlord",
                  "Landlord / Pemilik",
                ],
                [
                  "tenant",
                  "Tenant / Penyewa",
                ],
              ] as const
            ).map(
              ([
                key,
                title,
              ]) => {
                const party =
                  agreement[
                    key
                  ];

                return (
                  <div
                    key={key}
                    className="mt-5 rounded-2xl border border-gray-200 p-4"
                  >
                    <p className="font-black text-[#1C1C1E]">
                      {title}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <select
                        value={
                          party.partyType
                        }
                        onChange={(event) =>
                          setAgreement({
                            ...agreement,
                            [key]: {
                              ...party,
                              partyType:
                                event.target.value ===
                                "company"
                                  ? "company"
                                  : "individual",
                            },
                          })
                        }
                        className="rounded-xl border border-gray-200 px-3 py-3 text-sm"
                      >
                        <option value="individual">
                          Individual
                        </option>

                        <option value="company">
                          Company
                        </option>
                      </select>

                      <div>
                        <select
                          value={
                            NATIONALITY_OPTIONS.includes(
                              party.nationality as typeof NATIONALITY_OPTIONS[number]
                            )
                              ? party.nationality
                              : "__other__"
                          }
                          onChange={(event) => {
                            const value =
                              event.target.value;

                            setAgreement({
                              ...agreement,
                              [key]: {
                                ...party,
                                nationality:
                                  value === "__other__"
                                    ? ""
                                    : value,
                              },
                            });
                          }}
                          className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                        >
                          {NATIONALITY_OPTIONS.map(
                            (nationality) => (
                              <option
                                key={
                                  nationality
                                }
                                value={
                                  nationality
                                }
                              >
                                {nationality}
                              </option>
                            )
                          )}

                          <option value="__other__">
                            Other
                          </option>
                        </select>

                        {!NATIONALITY_OPTIONS.includes(
                          party.nationality as typeof NATIONALITY_OPTIONS[number]
                        ) ? (
                          <input
                            value={
                              party.nationality
                            }
                            onChange={(event) =>
                              setAgreement({
                                ...agreement,
                                [key]: {
                                  ...party,
                                  nationality:
                                    event.target.value,
                                },
                              })
                            }
                            placeholder="Enter nationality"
                            className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                          />
                        ) : null}
                      </div>

                      {party.partyType ===
                      "company" ? (
                        <input
                          value={
                            party.companyName
                          }
                          onChange={(event) =>
                            setAgreement({
                              ...agreement,
                              [key]: {
                                ...party,
                                companyName:
                                  event.target.value,
                              },
                            })
                          }
                          placeholder="Company Name"
                          className="rounded-xl border border-gray-200 px-3 py-3 text-sm sm:col-span-2"
                        />
                      ) : (
                        <input
                          value={
                            party.fullName
                          }
                          onChange={(event) =>
                            setAgreement({
                              ...agreement,
                              [key]: {
                                ...party,
                                fullName:
                                  event.target.value,
                              },
                            })
                          }
                          placeholder="Full Name"
                          className="rounded-xl border border-gray-200 px-3 py-3 text-sm sm:col-span-2"
                        />
                      )}

                      <select
                        value={
                          party.identityType
                        }
                        onChange={(event) =>
                          setAgreement({
                            ...agreement,
                            [key]: {
                              ...party,
                              identityType:
                                event.target.value as typeof party.identityType,
                            },
                          })
                        }
                        className="rounded-xl border border-gray-200 px-3 py-3 text-sm"
                      >
                        <option value="ktp">
                          KTP
                        </option>
                        <option value="passport">
                          Passport
                        </option>
                        <option value="company_registration">
                          Company Registration
                        </option>
                        <option value="other">
                          Other
                        </option>
                      </select>

                      <input
                        value={
                          party.identityNumber
                        }
                        onChange={(event) =>
                          setAgreement({
                            ...agreement,
                            [key]: {
                              ...party,
                              identityNumber:
                                event.target.value,
                            },
                          })
                        }
                        placeholder="Identity Number"
                        className="rounded-xl border border-gray-200 px-3 py-3 text-sm"
                      />

                      <input
                        value={
                          party.phone
                        }
                        onChange={(event) =>
                          setAgreement({
                            ...agreement,
                            [key]: {
                              ...party,
                              phone:
                                event.target.value,
                            },
                          })
                        }
                        placeholder="Phone"
                        className="rounded-xl border border-gray-200 px-3 py-3 text-sm"
                      />

                      <input
                        value={
                          party.email
                        }
                        onChange={(event) =>
                          setAgreement({
                            ...agreement,
                            [key]: {
                              ...party,
                              email:
                                event.target.value,
                            },
                          })
                        }
                        placeholder="Email"
                        className="rounded-xl border border-gray-200 px-3 py-3 text-sm"
                      />

                      <textarea
                        rows={2}
                        value={
                          party.address
                        }
                        onChange={(event) =>
                          setAgreement({
                            ...agreement,
                            [key]: {
                              ...party,
                              address:
                                event.target.value,
                            },
                          })
                        }
                        placeholder="Address"
                        className="rounded-xl border border-gray-200 px-3 py-3 text-sm sm:col-span-2"
                      />
                    </div>
                  </div>
                );
              }
            )}
          </section>

          {/* LEASE */}

          <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#B58A3C]" />

              <h2 className="text-lg font-black text-[#1C1C1E]">
                {formCopy.leaseFinancial}
              </h2>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <label>
                <span className="text-xs font-bold text-gray-500">
                  Lease Start
                </span>
                <input
                  type="date"
                  value={
                    agreement.leaseStartDate
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      leaseStartDate:
                        event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>

              <label>
                <span className="text-xs font-bold text-gray-500">
                  Lease End
                </span>
                <input
                  type="date"
                  value={
                    agreement.leaseEndDate
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      leaseEndDate:
                        event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>

              <label>
                <span className="text-xs font-bold text-gray-500">
                  Handover Date
                </span>
                <input
                  type="date"
                  value={
                    agreement.handoverDate
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      handoverDate:
                        event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label>
                <span className="text-xs font-bold text-gray-500">
                  Currency
                </span>

                <select
                  value={
                    agreement.financial.currency
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      financial: {
                        ...agreement.financial,
                        currency:
                          event.target.value as typeof agreement.financial.currency,
                      },
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                >
                  <option value="IDR">
                    IDR
                  </option>

                  <option value="USD">
                    USD
                  </option>

                  <option value="AUD">
                    AUD
                  </option>
                </select>
              </label>

              <label>
                <span className="text-xs font-bold text-gray-500">
                  Rental Amount / Rate
                </span>

                <input
                  type="text"
                  inputMode="numeric"
                  value={
                    moneyInputValue(
                      agreement.financial.rentAmount
                    )
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      financial: {
                        ...agreement.financial,
                        rentAmount:
                          moneyInputNumber(
                            event.target.value
                          ),
                      },
                    })
                  }
                  placeholder="12,000,000"
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />

                <p className="mt-1 text-[11px] font-medium text-[#80652F]">
                  {rentalPreviewMoney(
                    agreement.financial.rentAmount,
                    agreement.financial.currency,
                    "id"
                  )}{" "}
                  {rentalRateContext(
                    agreement.financial.paymentFrequency
                  )}
                </p>
              </label>

              <label>
                <span className="text-xs font-bold text-gray-500">
                  Payment Frequency
                </span>

                <select
                  value={
                    agreement.financial.paymentFrequency
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      financial: {
                        ...agreement.financial,
                        paymentFrequency:
                          event.target.value as RentalPaymentFrequency,
                      },
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                >
                  {PAYMENT_OPTIONS.map(
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
                          option.label
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                <span className="text-xs font-bold text-gray-500">
                  Security Deposit
                </span>

                <input
                  type="text"
                  inputMode="numeric"
                  value={
                    moneyInputValue(
                      agreement.financial.securityDeposit
                    )
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      financial: {
                        ...agreement.financial,
                        securityDeposit:
                          moneyInputNumber(
                            event.target.value
                          ),
                      },
                    })
                  }
                  placeholder="12,000,000"
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />

                <p className="mt-1 text-[11px] text-gray-400">
                  Held separately and not included in the agreed rent total.
                </p>
              </label>
            </div>

            <div className="mt-4">
              <p className="text-xs font-bold text-gray-500">
                {formCopy.paymentSchedule}
              </p>

              <textarea
                rows={3}
                value={
                  agreement.financial.paymentScheduleNotes
                }
                onChange={(event) =>
                  setAgreement({
                    ...agreement,
                    financial: {
                      ...agreement.financial,
                      paymentScheduleNotes:
                        event.target.value,
                    },
                  })
                }
                placeholder={formCopy.paymentSchedulePlaceholder}
                className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
              />
            </div>

            {agreement.financial.paymentFrequency ===
            "custom" ? (
              <label className="mt-4 block">
                <span className="text-xs font-bold text-gray-500">
                  Manual Base Rent Total
                </span>

                <input
                  type="text"
                  inputMode="numeric"
                  value={
                    moneyInputValue(
                      agreement.financial.manualBaseRentTotal ??
                      0
                    )
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      financial: {
                        ...agreement.financial,
                        manualBaseRentTotal:
                          moneyInputNumber(
                            event.target.value
                          ),
                      },
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>
            ) : null}

            <div className="mt-5 rounded-2xl border border-[#E4D7BA] bg-[#FBF8F1] p-4">
              <p className="text-xs font-black uppercase tracking-[0.1em] text-[#9E762F]">
                {formCopy.taxCharges}
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                {formCopy.taxExplanation}
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="text-xs font-bold text-gray-500">
                    {formCopy.manualAmount}
                  </span>

                  <input
                    type="text"
                    inputMode="numeric"
                    value={
                      moneyInputValue(
                        agreement.financial.taxAdditionalCharges ??
                        0
                      )
                    }
                    onChange={(event) =>
                      setAgreement({
                        ...agreement,
                        financial: {
                          ...agreement.financial,
                          taxAdditionalCharges:
                            moneyInputNumber(
                              event.target.value
                            ),
                        },
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm"
                  />
                </label>

                <label>
                  <span className="text-xs font-bold text-gray-500">
                    {formCopy.taxNotes}
                  </span>

                  <input
                    value={
                      agreement.financial.taxAdditionalChargesNotes ??
                      ""
                    }
                    onChange={(event) =>
                      setAgreement({
                        ...agreement,
                        financial: {
                          ...agreement.financial,
                          taxAdditionalChargesNotes:
                            event.target.value,
                        },
                      })
                    }
                    placeholder={formCopy.taxPlaceholder}
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm"
                  />
                </label>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200">
              <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-4 py-3 text-sm">
                <span className="text-gray-500">
                  {formCopy.baseRentTotal}
                </span>

                <span className="font-bold text-[#1C1C1E]">
                  {rentalPreviewMoney(
                    baseRentTotal,
                    agreement.financial.currency,
                    "id"
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-4 py-3 text-sm">
                <span className="text-gray-500">
                  {formCopy.taxCharges}
                </span>

                <span className="font-bold text-[#1C1C1E]">
                  {rentalPreviewMoney(
                    agreement.financial.taxAdditionalCharges ??
                      0,
                    agreement.financial.currency,
                    "id"
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 bg-[#17171A] px-4 py-4">
                <span className="text-sm font-black uppercase tracking-[0.08em] text-white">
                  Agreed Total
                </span>

                <span className="text-base font-black text-white">
                  {rentalPreviewMoney(
                    agreedTotal,
                    agreement.financial.currency,
                    "id"
                  )}
                </span>
              </div>
            </div>

            {!agreement.leaseStartDate ||
            !agreement.leaseEndDate ? (
              <p className="mt-2 text-xs font-medium text-amber-600">
                {formCopy.totalDateHelper}
              </p>
            ) : null}
          </section>

          {/* UTILITIES */}

          <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-[#1C1C1E]">
              {formCopy.utilitiesMaintenance}
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {(
                [
                  [
                    "electricity",
                    formCopy.electricity,
                  ],
                  [
                    "water",
                    formCopy.water,
                  ],
                  [
                    "internet",
                    formCopy.internet,
                  ],
                  [
                    "garbage",
                    formCopy.garbage,
                  ],
                  [
                    "banjarCommunityFees",
                    formCopy.banjarCommunityFees,
                  ],
                  [
                    "poolMaintenance",
                    formCopy.poolMaintenance,
                  ],
                  [
                    "gardenMaintenance",
                    formCopy.gardenMaintenance,
                  ],
                  [
                    "housekeeping",
                    formCopy.housekeeping,
                  ],
                ] as const
              ).map(
                ([
                  key,
                  label,
                ]) => (
                  <label
                    key={key}
                  >
                    <span className="text-xs font-bold text-gray-500">
                      {label}
                    </span>

                    <select
                      value={
                        agreement.utilities[
                          key
                        ]
                      }
                      onChange={(event) =>
                        setAgreement({
                          ...agreement,
                          utilities: {
                            ...agreement.utilities,
                            [key]:
                              event.target.value as RentalResponsibility,
                          },
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                    >
                      {RESPONSIBILITY_OPTIONS.map(
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
                              option.label
                            }
                          </option>
                        )
                      )}
                    </select>
                  </label>
                )
              )}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="text-xs font-bold text-gray-500">
                  {formCopy.utilityNotes}
                </span>

                <textarea
                  rows={2}
                  value={
                    agreement.utilities.otherNotes
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      utilities: {
                        ...agreement.utilities,
                        otherNotes:
                          event.target.value,
                      },
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>

              <label>
                <span className="text-xs font-bold text-gray-500">
                  {formCopy.tenantRoutineMaintenance}
                </span>

                <textarea
                  rows={3}
                  value={
                    agreement.maintenance.tenantRoutineMaintenance
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      maintenance: {
                        ...agreement.maintenance,
                        tenantRoutineMaintenance:
                          event.target.value,
                      },
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>

              <label>
                <span className="text-xs font-bold text-gray-500">
                  {formCopy.landlordMaintenance}
                </span>

                <textarea
                  rows={3}
                  value={
                    agreement.maintenance.landlordMaintenance
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      maintenance: {
                        ...agreement.maintenance,
                        landlordMaintenance:
                          event.target.value,
                      },
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>

              <label>
                <span className="text-xs font-bold text-gray-500">
                  {formCopy.minorRepairThreshold}
                </span>

                <input
                  type="number"
                  min={0}
                  value={
                    agreement.maintenance.minorRepairThreshold
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      maintenance: {
                        ...agreement.maintenance,
                        minorRepairThreshold:
                          numberValue(
                            event.target.value
                          ),
                      },
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>

              <label>
                <span className="text-xs font-bold text-gray-500">
                  {formCopy.damageResponsibility}
                </span>

                <input
                  value={
                    agreement.maintenance.damageResponsibility
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      maintenance: {
                        ...agreement.maintenance,
                        damageResponsibility:
                          event.target.value,
                      },
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>

              <label className="sm:col-span-2">
                <span className="text-xs font-bold text-gray-500">
                  {formCopy.alterationRules}
                </span>

                <textarea
                  rows={2}
                  value={
                    agreement.maintenance.alterationRules
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      maintenance: {
                        ...agreement.maintenance,
                        alterationRules:
                          event.target.value,
                      },
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>
            </div>
          </section>

          {/* OCCUPANCY */}

          <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-[#1C1C1E]">
              {formCopy.occupancyRules}
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <input
                value={
                  agreement.occupancy.permittedUse
                }
                onChange={(event) =>
                  setAgreement({
                    ...agreement,
                    occupancy: {
                      ...agreement.occupancy,
                      permittedUse:
                        event.target.value,
                    },
                  })
                }
                placeholder={formCopy.permittedUse}
                className="rounded-xl border border-gray-200 px-3 py-3 text-sm"
              />

              <input
                type="number"
                min={0}
                value={
                  agreement.occupancy.maximumOccupants
                }
                onChange={(event) =>
                  setAgreement({
                    ...agreement,
                    occupancy: {
                      ...agreement.occupancy,
                      maximumOccupants:
                        numberValue(
                          event.target.value
                        ),
                    },
                  })
                }
                placeholder={formCopy.maximumOccupants}
                className="rounded-xl border border-gray-200 px-3 py-3 text-sm"
              />

              {(
                [
                  [
                    "petsAllowed",
                    formCopy.petsAllowed,
                  ],
                  [
                    "smokingAllowed",
                    formCopy.smokingAllowed,
                  ],
                  [
                    "sublettingAllowed",
                    formCopy.sublettingAllowed,
                  ],
                ] as const
              ).map(
                ([
                  key,
                  label,
                ]) => (
                  <label
                    key={key}
                    className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3"
                  >
                    <span className="text-sm font-semibold text-gray-700">
                      {label}
                    </span>

                    <input
                      type="checkbox"
                      checked={
                        agreement.occupancy[
                          key
                        ]
                      }
                      onChange={(event) =>
                        setAgreement({
                          ...agreement,
                          occupancy: {
                            ...agreement.occupancy,
                            [key]:
                              event.target.checked,
                          },
                        })
                      }
                      className="h-4 w-4"
                    />
                  </label>
                )
              )}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="text-xs font-bold text-gray-500">
                  {formCopy.occupantNames}
                </span>

                <textarea
                  rows={4}
                  value={
                    (
                      agreement.occupancy.occupantNames ||
                      []
                    ).join("\n")
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      occupancy: {
                        ...agreement.occupancy,
                        occupantNames:
                          event.target.value
                            .split("\n"),
                      },
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />

                <span className="mt-1 block text-[11px] text-gray-400">
                  {formCopy.occupantNamesHelper}
                </span>
              </label>

              <label>
                <span className="text-xs font-bold text-gray-500">
                  {formCopy.sublettingNotes}
                </span>

                <textarea
                  rows={4}
                  value={
                    agreement.occupancy.sublettingNotes
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      occupancy: {
                        ...agreement.occupancy,
                        sublettingNotes:
                          event.target.value,
                      },
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>

              <label className="sm:col-span-2">
                <span className="text-xs font-bold text-gray-500">
                  {formCopy.houseRules}
                </span>

                <textarea
                  rows={4}
                  value={
                    (
                      agreement.houseRules ||
                      []
                    ).join("\n")
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      houseRules:
                        event.target.value
                          .split("\n"),
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />

                <span className="mt-1 block text-[11px] text-gray-400">
                  {formCopy.houseRulesHelper}
                </span>
              </label>
            </div>
          </section>

          {/* INVENTORY */}

          <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-[#B58A3C]" />

              <h2 className="text-lg font-black text-[#1C1C1E]">
                {formCopy.inventoryAttachment}
              </h2>
            </div>

            <label className="mt-4 flex items-center justify-between rounded-xl border border-gray-200 p-4">
              <span className="text-sm font-semibold text-gray-700">
                {formCopy.attachInventory}
              </span>

              <input
                type="checkbox"
                checked={
                  agreement.inventoryAttachment.enabled
                }
                onChange={(event) =>
                  setAgreement({
                    ...agreement,
                    inventoryAttachment: {
                      ...agreement.inventoryAttachment,
                      enabled:
                        event.target.checked,
                    },
                  })
                }
              />
            </label>

            {agreement.inventoryAttachment.enabled ? (
              <select
                value={
                  agreement.inventoryAttachment.documentId
                }
                onChange={(event) => {
                  const selected =
                    inventories.find(
                      (
                        item
                      ) =>
                        item.id ===
                        event.target.value
                    );

                  setAgreement({
                    ...agreement,
                    inventoryAttachment: {
                      enabled:
                        true,
                      documentId:
                        selected?.id ||
                        "",
                      documentTitle:
                        selected?.title ||
                        "",
                    },
                  });
                }}
                className="mt-4 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
              >
                <option value="">
                  {formCopy.selectInventory}
                </option>

                {inventories.map(
                  (
                    item
                  ) => (
                    <option
                      key={
                        item.id
                      }
                      value={
                        item.id
                      }
                    >
                      {
                        item.title
                      }
                    </option>
                  )
                )}
              </select>
            ) : null}
          </section>

          {/* RENEWAL / TERMINATION */}

          <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-[#1C1C1E]">
              {formCopy.renewalTermination}
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                <span className="text-sm font-semibold text-gray-700">
                  {formCopy.renewalAvailable}
                </span>

                <input
                  type="checkbox"
                  checked={
                    agreement.renewal.renewalAvailable
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      renewal: {
                        ...agreement.renewal,
                        renewalAvailable:
                          event.target.checked,
                      },
                    })
                  }
                  className="h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                <span className="text-sm font-semibold text-gray-700">
                  {formCopy.tenantEarlyTermination}
                </span>

                <input
                  type="checkbox"
                  checked={
                    agreement.termination.tenantEarlyTerminationAllowed
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      termination: {
                        ...agreement.termination,
                        tenantEarlyTerminationAllowed:
                          event.target.checked,
                      },
                    })
                  }
                  className="h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                <span className="text-sm font-semibold text-gray-700">
                  {formCopy.landlordEarlyTermination}
                </span>

                <input
                  type="checkbox"
                  checked={
                    agreement.termination.landlordEarlyTerminationAllowed
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      termination: {
                        ...agreement.termination,
                        landlordEarlyTerminationAllowed:
                          event.target.checked,
                      },
                    })
                  }
                  className="h-4 w-4"
                />
              </label>

              <label>
                <span className="text-xs font-bold text-gray-500">
                  {formCopy.renewalNoticeDays}
                </span>

                <input
                  type="number"
                  min={0}
                  value={
                    agreement.renewal.renewalNoticeDays
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      renewal: {
                        ...agreement.renewal,
                        renewalNoticeDays:
                          numberValue(
                            event.target.value
                          ),
                      },
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>

              <label>
                <span className="text-xs font-bold text-gray-500">
                  {formCopy.terminationNoticeDays}
                </span>

                <input
                  type="number"
                  min={0}
                  value={
                    agreement.termination.noticeDays
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      termination: {
                        ...agreement.termination,
                        noticeDays:
                          numberValue(
                            event.target.value
                          ),
                      },
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>

              <label>
                <span className="text-xs font-bold text-gray-500">
                  {formCopy.breachCureDays}
                </span>

                <input
                  type="number"
                  min={0}
                  value={
                    agreement.termination.breachCureDays
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      termination: {
                        ...agreement.termination,
                        breachCureDays:
                          numberValue(
                            event.target.value
                          ),
                      },
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>

              <label>
                <span className="text-xs font-bold text-gray-500">
                  {formCopy.inspectionNoticeHours}
                </span>

                <input
                  type="number"
                  min={0}
                  value={
                    agreement.maintenance.inspectionNoticeHours
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      maintenance: {
                        ...agreement.maintenance,
                        inspectionNoticeHours:
                          numberValue(
                            event.target.value
                          ),
                      },
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="text-xs font-bold text-gray-500">
                  {formCopy.renewalNotes}
                </span>

                <textarea
                  rows={3}
                  value={
                    agreement.renewal.renewalNotes
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      renewal: {
                        ...agreement.renewal,
                        renewalNotes:
                          event.target.value,
                      },
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>

              <label>
                <span className="text-xs font-bold text-gray-500">
                  {formCopy.depositDeductionNotes}
                </span>

                <textarea
                  rows={3}
                  value={
                    agreement.termination.depositDeductionNotes
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      termination: {
                        ...agreement.termination,
                        depositDeductionNotes:
                          event.target.value,
                      },
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>
            </div>

            <textarea
              rows={3}
              value={
                agreement.termination.earlyTerminationNotes
              }
              onChange={(event) =>
                setAgreement({
                  ...agreement,
                  termination: {
                    ...agreement.termination,
                    earlyTerminationNotes:
                      event.target.value,
                  },
                })
              }
              placeholder={formCopy.earlyTerminationPlaceholder}
              className="mt-4 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
            />

            <div className="mt-5 grid gap-4">
              <label>
                <span className="text-xs font-bold text-gray-500">
                  {formCopy.forceMajeureNotes}
                </span>

                <textarea
                  rows={3}
                  value={
                    agreement.forceMajeureNotes
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      forceMajeureNotes:
                        event.target.value,
                    })
                  }
                  placeholder={
                    formCopy.forceMajeurePlaceholder
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>

              <label>
                <span className="text-xs font-bold text-gray-500">
                  {formCopy.disputeResolution}
                </span>

                <textarea
                  rows={3}
                  value={
                    agreement.disputeResolution
                  }
                  onChange={(event) =>
                    setAgreement({
                      ...agreement,
                      disputeResolution:
                        event.target.value,
                    })
                  }
                  placeholder={
                    formCopy.disputeResolutionPlaceholder
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                />
              </label>
            </div>
          </section>
        </div>

        {/* LIVE PREVIEW */}

        <div className="xl:sticky xl:top-6 xl:self-start">
          <section className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#B58A3C]" />

                <p className="text-sm font-black text-[#1C1C1E]">
                  {pdfUrl
                    ? (
                        bilingual
                          ? "Preview PDF / PDF Preview"
                          : "Preview PDF"
                      )
                    : formCopy.livePreview}
                </p>
              </div>

              <p className="mt-1 text-xs text-gray-500">
                {pdfUrl
                  ? generatedFileName
                  : formCopy.livePreviewNote}
              </p>
            </div>

            {pdfUrl ? (
              <div className="border-b border-gray-100 bg-white px-5 py-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={
                      clearPdfOnly
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#CDB683] bg-[#F8F3E9] px-3 py-2 text-xs font-semibold text-[#80652F] transition hover:bg-[#F2EADB]"
                  >
                    <ArrowLeft className="h-4 w-4" />

                    {bilingual
                      ? "Kembali Edit / Back to Edit"
                      : "Kembali Edit"}
                  </button>

                  <button
                    type="button"
                    onClick={
                      downloadPdf
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    <FileDown className="h-4 w-4" />

                    Download
                  </button>

                  <button
                    type="button"
                    onClick={
                      sharePdf
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    <Share2 className="h-4 w-4" />

                    {bilingual
                      ? "Bagikan / Share"
                      : "Bagikan"}
                  </button>

                  <button
                    type="button"
                    onClick={
                      openForPrint
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#17171A] px-3 py-2 text-xs font-semibold text-white transition hover:bg-black"
                  >
                    <Printer className="h-4 w-4" />

                    {bilingual
                      ? "Buka / Print"
                      : "Buka / Print"}
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
                  title="Rental Agreement PDF Preview"
                  className="h-[760px] w-full rounded-xl border-0 bg-white shadow-lg"
                />
              </div>
            ) : null}

            <div
              className={
                pdfUrl
                  ? "hidden"
                  : "max-h-[calc(100vh-170px)] overflow-y-auto bg-[#E7E2D8] p-4"
              }
            >
              <div className="mx-auto min-h-[840px] max-w-[620px] bg-white px-8 py-10 shadow-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#80652F]">
                  {agreement.agent.agency ||
                    agreement.agent.name ||
                    "AGENT"}
                </p>

                <p className="mt-1 text-[9px] text-gray-500">
                  Disiapkan oleh / Prepared by:{" "}
                  {agreement.agent.name ||
                    "-"}
                </p>

                <h2 className="mt-4 text-center text-xl font-black uppercase text-[#17171A]">
                  PERJANJIAN SEWA PROPERTI
                </h2>

                {bilingual ? (
                  <p className="mt-1 text-center text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
                    PROPERTY RENTAL AGREEMENT
                  </p>
                ) : null}

                <div className="mt-6 border-y border-gray-200 py-4 text-xs leading-5 text-gray-700">
                  <p>
                    No:{" "}
                    {agreement.agreementNumber ||
                      "-"}
                  </p>

                  <p>
                    Tanggal / Date:{" "}
                    {rentalPreviewDate(
                      agreement.agreementDate,
                      "id"
                    )}
                  </p>

                  <p>
                    Properti / Property:{" "}
                    {agreement.property.title}
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-5 text-xs">
                  <div>
                    <p className="font-black uppercase text-[#80652F]">
                      Pemilik
                    </p>

                    <p className="mt-2 font-bold">
                      {rentalPartyDisplayName(
                        agreement.landlord
                      )}
                    </p>

                    <p className="mt-1 text-gray-500">
                      {bilingual
                        ? "Kewarganegaraan / Nationality"
                        : "Kewarganegaraan"}:{" "}
                      {agreement.landlord.nationality ||
                        "-"}
                    </p>

                    <p className="mt-1 text-gray-500">
                      {agreement.landlord.identityType ===
                      "passport"
                        ? "Passport"
                        : agreement.landlord.identityType ===
                          "ktp"
                          ? "KTP"
                          : agreement.landlord.identityType ===
                            "company_registration"
                            ? bilingual
                              ? "Registrasi Perusahaan / Company Registration"
                              : "Registrasi Perusahaan"
                            : bilingual
                              ? "Identitas / Identity"
                              : "Identitas"}:{" "}
                      {agreement.landlord.identityNumber ||
                        "-"}
                    </p>

                    <p className="mt-1 text-gray-500">
                      {bilingual
                        ? "Telepon / Phone"
                        : "Telepon"}:{" "}
                      {agreement.landlord.phone ||
                        "-"}
                    </p>

                    <p className="mt-1 text-gray-500">
                      Email:{" "}
                      {agreement.landlord.email ||
                        "-"}
                    </p>
                  </div>

                  <div>
                    <p className="font-black uppercase text-[#80652F]">
                      Penyewa
                    </p>

                    <p className="mt-2 font-bold">
                      {rentalPartyDisplayName(
                        agreement.tenant
                      )}
                    </p>

                    <p className="mt-1 text-gray-500">
                      {bilingual
                        ? "Kewarganegaraan / Nationality"
                        : "Kewarganegaraan"}:{" "}
                      {agreement.tenant.nationality ||
                        "-"}
                    </p>

                    <p className="mt-1 text-gray-500">
                      {agreement.tenant.identityType ===
                      "passport"
                        ? "Passport"
                        : agreement.tenant.identityType ===
                          "ktp"
                          ? "KTP"
                          : agreement.tenant.identityType ===
                            "company_registration"
                            ? bilingual
                              ? "Registrasi Perusahaan / Company Registration"
                              : "Registrasi Perusahaan"
                            : bilingual
                              ? "Identitas / Identity"
                              : "Identitas"}:{" "}
                      {agreement.tenant.identityNumber ||
                        "-"}
                    </p>

                    <p className="mt-1 text-gray-500">
                      {bilingual
                        ? "Telepon / Phone"
                        : "Telepon"}:{" "}
                      {agreement.tenant.phone ||
                        "-"}
                    </p>

                    <p className="mt-1 text-gray-500">
                      Email:{" "}
                      {agreement.tenant.email ||
                        "-"}
                    </p>
                  </div>
                </div>

                <div className="mt-7 rounded-xl bg-[#F8F4EB] p-4 text-xs">
                  <p className="font-black text-[#80652F]">
                    Ringkasan Sewa
                  </p>

                  <p className="mt-2">
                    {rentalPreviewDate(
                      agreement.leaseStartDate,
                      "id"
                    )}{" "}
                    —{" "}
                    {rentalPreviewDate(
                      agreement.leaseEndDate,
                      "id"
                    )}
                  </p>

                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between gap-4">
                      <span>
                        Tarif Sewa / Rental Rate
                      </span>

                      <span className="font-bold">
                        {rentalPreviewMoney(
                          agreement.financial.rentAmount,
                          agreement.financial.currency,
                          "id"
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span>
                        Total Dasar / Base Rent
                      </span>

                      <span className="font-bold">
                        {rentalPreviewMoney(
                          baseRentTotal,
                          agreement.financial.currency,
                          "id"
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span>
                        Pajak/Biaya Tambahan
                      </span>

                      <span className="font-bold">
                        {rentalPreviewMoney(
                          agreement.financial.taxAdditionalCharges ??
                            0,
                          agreement.financial.currency,
                          "id"
                        )}
                      </span>
                    </div>

                    <div className="mt-2 border-t border-[#E4D7BA] pt-2">
                      <div className="flex justify-between gap-4">
                        <span>
                          {bilingual
                            ? "Deposit Jaminan / Security Deposit"
                            : "Deposit Jaminan"}
                        </span>

                        <span className="font-bold">
                          {rentalPreviewMoney(
                            agreement.financial.securityDeposit,
                            agreement.financial.currency,
                            "id"
                          )}
                        </span>
                      </div>

                      <p className="mt-1 text-[9px] text-gray-500">
                        {bilingual
                          ? "Tidak termasuk dalam total nilai sewa / Not included in the agreed rent total"
                          : "Tidak termasuk dalam total nilai sewa"}
                      </p>
                    </div>

                    <div className="mt-2 flex justify-between gap-4 border-t border-[#E4D7BA] pt-2">
                      <span className="font-black">
                        {bilingual
                          ? "TOTAL NILAI SEWA / TOTAL RENTAL VALUE"
                          : "TOTAL NILAI SEWA"}
                      </span>

                      <span className="font-black">
                        {rentalPreviewMoney(
                          agreedTotal,
                          agreement.financial.currency,
                          "id"
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 space-y-6">
                  {clausesID.map(
                    (
                      clause,
                      index
                    ) => (
                      <div
                        key={
                          clause.key
                        }
                      >
                        <h3 className="text-xs font-black text-[#17171A]">
                          {
                            clause.title
                          }
                        </h3>

                        <p className="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-gray-700">
                          {
                            clause.body
                          }
                        </p>

                        {bilingual &&
                        clausesEN[
                          index
                        ] ? (
                          <div className="mt-3 border-l-2 border-[#D5C49F] pl-3">
                            <h4 className="text-[10px] font-black text-[#80652F]">
                              {
                                clausesEN[
                                  index
                                ].title
                              }
                            </h4>

                            <p className="mt-1 text-[10px] leading-5 text-gray-500">
                              {
                                clausesEN[
                                  index
                                ].body
                              }
                            </p>
                          </div>
                        ) : null}
                      </div>
                    )
                  )}
                </div>

                <div className="mt-10 grid grid-cols-2 gap-8">
                  <div className="pt-14 text-center text-[10px]">
                    <div className="border-t border-gray-500 pt-2">
                      Pemilik / Landlord
                    </div>
                  </div>

                  <div className="pt-14 text-center text-[10px]">
                    <div className="border-t border-gray-500 pt-2">
                      Penyewa / Tenant
                    </div>
                  </div>
                </div>


              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
        <p className="text-xs font-black uppercase tracking-[0.1em] text-amber-800">
          Catatan Penting / Important Notice
        </p>

        <p className="mt-2 text-xs leading-5 text-amber-800">
          Fitur ini disediakan sebagai alat bantu untuk menyusun draft dokumen.
          Tetamo tidak memberikan nasihat hukum, jasa notaris, nasihat pajak,
          atau penentuan kewajiban Bea Meterai. Sebelum dokumen ditandatangani
          atau digunakan, para pihak disarankan memeriksa ketentuan yang berlaku
          untuk transaksi mereka dengan notaris, advokat, konsultan pajak, atau
          profesional lain yang berwenang di Indonesia.
        </p>

        <p className="mt-3 border-t border-amber-200 pt-3 text-xs leading-5 text-amber-700">
          This feature is provided as a document-drafting tool only. Tetamo does
          not provide legal, notarial, tax, or Stamp Duty advice. Before signing
          or using the document, the parties should verify the requirements
          applicable to their transaction with a qualified notary, advocate,
          tax adviser, or other appropriate professional in Indonesia.
        </p>
      </section>
    </div>
  );
}
