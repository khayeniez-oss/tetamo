import {
  calculateRentalAgreedTotal,
  calculateRentalBaseTotal,
  type RentalAgreementData,
  type RentalCurrency,
  type RentalPaymentFrequency,
  type RentalResponsibility,
} from "@/lib/agent-rental-agreement";

export type RentalPreviewLanguage =
  | "id"
  | "en";

export type RentalPreviewClause = {
  key: string;
  title: string;
  body: string;
};

function clean(
  value:
    | string
    | null
    | undefined,
  fallback = "-"
) {
  return (
    value?.trim() ||
    fallback
  );
}

function money(
  value: number,
  currency: RentalCurrency,
  language: RentalPreviewLanguage
) {
  if (
    !Number.isFinite(value)
  ) {
    return "-";
  }

  return new Intl.NumberFormat(
    language === "id"
      ? "id-ID"
      : "en-AU",
    {
      style: "currency",
      currency,
      maximumFractionDigits:
        currency === "IDR"
          ? 0
          : 2,
    }
  ).format(value);
}

function dateLabel(
  value: string,
  language: RentalPreviewLanguage
) {
  if (!value) {
    return "-";
  }

  const parsed =
    new Date(
      `${value}T00:00:00Z`
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    language === "id"
      ? "id-ID"
      : "en-GB",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }
  ).format(parsed);
}

function frequencyLabel(
  value: RentalPaymentFrequency,
  language: RentalPreviewLanguage
) {
  const labels = {
    id: {
      full:
        "dibayar penuh di muka",
      monthly:
        "dibayar bulanan",
      quarterly:
        "dibayar setiap 3 bulan",
      semiannual:
        "dibayar setiap 6 bulan",
      yearly:
        "dibayar tahunan",
      custom:
        "sesuai jadwal pembayaran yang disepakati",
    },

    en: {
      full:
        "paid in full in advance",
      monthly:
        "paid monthly",
      quarterly:
        "paid every 3 months",
      semiannual:
        "paid every 6 months",
      yearly:
        "paid yearly",
      custom:
        "paid according to the agreed custom schedule",
    },
  } as const;

  return labels[
    language
  ][value];
}

export function rentalResponsibilityLabel(
  value: RentalResponsibility,
  language: RentalPreviewLanguage
) {
  const labels = {
    id: {
      landlord: "Pemilik",
      tenant: "Penyewa",
      included:
        "Termasuk dalam harga sewa",
      shared:
        "Ditanggung bersama",
      not_applicable:
        "Tidak berlaku",
    },

    en: {
      landlord: "Landlord",
      tenant: "Tenant",
      included:
        "Included in rent",
      shared:
        "Shared responsibility",
      not_applicable:
        "Not applicable",
    },
  } as const;

  return labels[
    language
  ][value];
}

function partyName(
  data:
    RentalAgreementData["landlord"]
) {
  if (
    data.partyType ===
    "company"
  ) {
    return (
      clean(
        data.companyName
      )
    );
  }

  return clean(
    data.fullName
  );
}

export function buildRentalAgreementClauses(
  data: RentalAgreementData,
  language: RentalPreviewLanguage
): RentalPreviewClause[] {
  const isID =
    language === "id";

  const landlord =
    partyName(
      data.landlord
    );

  const tenant =
    partyName(
      data.tenant
    );

  const currency =
    data.financial.currency;

  const inventoryText =
    data.inventoryAttachment
      .enabled &&
    data.inventoryAttachment
      .documentId
      ? (
          isID
            ? `Laporan Inventory & Serah Terima "${clean(
                data.inventoryAttachment
                  .documentTitle
              )}" dinyatakan sebagai Lampiran 1 dan merupakan bagian dari Perjanjian ini. Lampiran tersebut mencatat barang, perlengkapan, kondisi Properti, dan hal-hal yang diserahkan kepada Penyewa pada saat serah terima.`
            : `The Inventory & Handover Report "${clean(
                data.inventoryAttachment
                  .documentTitle
              )}" is designated as Appendix 1 and forms part of this Agreement. The Appendix records the items, equipment, Property condition, and matters delivered to the Tenant at handover.`
        )
      : (
          isID
            ? "Para Pihak dapat membuat dan menandatangani laporan inventory atau berita acara serah terima terpisah sebagai catatan kondisi Properti pada saat penyerahan."
            : "The Parties may prepare and sign a separate inventory or handover report recording the condition of the Property at handover."
        );

  const occupancy =
    data.occupancy
      .maximumOccupants >
    0
      ? (
          isID
            ? `Jumlah penghuni maksimum adalah ${data.occupancy.maximumOccupants} orang.`
            : `The maximum number of occupants is ${data.occupancy.maximumOccupants}.`
        )
      : "";

  const occupantNames =
    data.occupancy
      .occupantNames
      .map(
        (name) =>
          name.trim()
      )
      .filter(Boolean);

  const occupantNamesText =
    occupantNames.length > 0
      ? (
          isID
            ? `Penghuni yang tercatat: ${occupantNames.join(
                ", "
              )}.`
            : `Recorded occupants: ${occupantNames.join(
                ", "
              )}.`
        )
      : "";

  const houseRules =
    data.houseRules
      .map(
        (rule) =>
          rule.trim()
      )
      .filter(Boolean);

  const houseRulesText =
    houseRules.length > 0
      ? (
          isID
            ? `Aturan Properti yang disepakati: ${houseRules.join(
                "; "
              )}.`
            : `Agreed Property rules: ${houseRules.join(
                "; "
              )}.`
        )
      : "";

  const pets =
    data.occupancy
      .petsAllowed
      ? (
          isID
            ? "Hewan peliharaan diperbolehkan dengan tetap menjaga kebersihan dan tidak mengganggu lingkungan."
            : "Pets are permitted provided cleanliness is maintained and no nuisance is caused."
        )
      : (
          isID
            ? "Hewan peliharaan tidak diperbolehkan kecuali disetujui secara tertulis oleh Pemilik."
            : "Pets are not permitted unless approved in writing by the Landlord."
        );

  const smoking =
    data.occupancy
      .smokingAllowed
      ? (
          isID
            ? "Merokok diperbolehkan sesuai aturan Properti."
            : "Smoking is permitted subject to the Property rules."
        )
      : (
          isID
            ? "Merokok di dalam Properti tidak diperbolehkan."
            : "Smoking inside the Property is not permitted."
        );

  const subletting =
    data.occupancy
      .sublettingAllowed
      ? (
          isID
            ? "Penyewaan kembali atau pengalihan penggunaan diperbolehkan hanya sesuai ketentuan yang disepakati Para Pihak."
            : "Subletting or transfer of use is permitted only in accordance with the terms agreed by the Parties."
        )
      : (
          isID
            ? "Penyewa tidak diperbolehkan menyewakan kembali, mengalihkan, atau menyerahkan penggunaan Properti kepada pihak lain tanpa persetujuan tertulis Pemilik."
            : "The Tenant may not sublet, assign, or transfer use of the Property to another party without the Landlord's written consent."
        );

  const clauses:
    RentalPreviewClause[] = [
      {
        key: "object",

        title:
          isID
            ? "PASAL 1 — OBJEK SEWA"
            : "ARTICLE 1 — LEASED PROPERTY",

        body:
          isID
            ? `Pemilik menyewakan kepada Penyewa dan Penyewa menyewa dari Pemilik properti yang berlokasi di ${clean(
                data.property
                  .address ||
                  data.property
                    .location
              )}, dengan kode listing ${clean(
                data.property.code
              )}, selanjutnya disebut "Properti". Properti digunakan untuk ${clean(
                data.occupancy
                  .permittedUse,
                "keperluan tempat tinggal"
              )}.`
            : `The Landlord leases to the Tenant and the Tenant rents from the Landlord the property located at ${clean(
                data.property
                  .address ||
                  data.property
                    .location
              )}, listing code ${clean(
                data.property.code
              )}, hereinafter referred to as the "Property". The Property shall be used for ${clean(
                data.occupancy
                  .permittedUse,
                "residential purposes"
              )}.`,
      },

      {
        key: "term",

        title:
          isID
            ? "PASAL 2 — JANGKA WAKTU & SERAH TERIMA"
            : "ARTICLE 2 — TERM & HANDOVER",

        body:
          isID
            ? `Masa sewa berlaku sejak ${dateLabel(
                data.leaseStartDate,
                "id"
              )} sampai dengan ${dateLabel(
                data.leaseEndDate,
                "id"
              )}. Serah terima Properti direncanakan pada ${dateLabel(
                data.handoverDate,
                "id"
              )}. Pemilik menyerahkan Properti untuk digunakan sesuai tujuan sewa selama masa perjanjian.`
            : `The lease runs from ${dateLabel(
                data.leaseStartDate,
                "en"
              )} until ${dateLabel(
                data.leaseEndDate,
                "en"
              )}. Handover is scheduled for ${dateLabel(
                data.handoverDate,
                "en"
              )}. The Landlord shall deliver the Property for use in accordance with the purpose of the lease during the agreed term.`,
      },

      {
        key: "rent",

        title:
          isID
            ? "PASAL 3 — HARGA SEWA & PEMBAYARAN"
            : "ARTICLE 3 — RENT & PAYMENT",

        body:
          isID
            ? `Tarif sewa yang disepakati adalah ${money(
                data.financial
                  .rentAmount,
                currency,
                "id"
              )}, ${frequencyLabel(
                data.financial
                  .paymentFrequency,
                "id"
              )}. Total dasar sewa selama jangka waktu Perjanjian adalah ${money(
                calculateRentalBaseTotal(
                  data
                ),
                currency,
                "id"
              )}. Pajak atau biaya tambahan yang dimasukkan berdasarkan kesepakatan Para Pihak adalah ${money(
                data.financial
                  .taxAdditionalCharges ||
                  0,
                currency,
                "id"
              )}. Total nilai yang disepakati adalah ${money(
                calculateRentalAgreedTotal(
                  data
                ),
                currency,
                "id"
              )}. Pembayaran dilakukan melalui ${clean(
                data.financial
                  .paymentMethod,
                "metode pembayaran yang disepakati Para Pihak"
              )}. ${clean(
                data.financial
                  .paymentScheduleNotes,
                ""
              )} ${clean(
                data.financial
                  .taxAdditionalChargesNotes,
                ""
              )}`
            : `The agreed rental rate is ${money(
                data.financial
                  .rentAmount,
                currency,
                "en"
              )}, ${frequencyLabel(
                data.financial
                  .paymentFrequency,
                "en"
              )}. The total base rent for the term of this Agreement is ${money(
                calculateRentalBaseTotal(
                  data
                ),
                currency,
                "en"
              )}. Taxes or additional charges entered according to the agreement of the Parties are ${money(
                data.financial
                  .taxAdditionalCharges ||
                  0,
                currency,
                "en"
              )}. The total agreed contract value is ${money(
                calculateRentalAgreedTotal(
                  data
                ),
                currency,
                "en"
              )}. Payment shall be made through ${clean(
                data.financial
                  .paymentMethod,
                "the payment method agreed by the Parties"
              )}. ${clean(
                data.financial
                  .paymentScheduleNotes,
                ""
              )} ${clean(
                data.financial
                  .taxAdditionalChargesNotes,
                ""
              )}`,
      },

      {
        key: "deposit",

        title:
          isID
            ? "PASAL 4 — DEPOSIT"
            : "ARTICLE 4 — SECURITY DEPOSIT",

        body:
          isID
            ? `Penyewa membayar deposit sebesar ${money(
                data.financial
                  .securityDeposit,
                currency,
                "id"
              )}. Setelah masa sewa berakhir dan Properti dikembalikan, sisa deposit setelah pengurangan yang sah akan dikembalikan paling lambat ${data.financial.depositReturnDays} hari. ${clean(
                data.termination
                  .depositDeductionNotes,
                ""
              )}`
            : `The Tenant shall pay a security deposit of ${money(
                data.financial
                  .securityDeposit,
                currency,
                "en"
              )}. After the lease ends and the Property is returned, the remaining deposit after permitted deductions shall be returned within ${data.financial.depositReturnDays} days. ${clean(
                data.termination
                  .depositDeductionNotes,
                ""
              )}`,
      },

      {
        key: "occupancy",

        title:
          isID
            ? "PASAL 5 — PENGGUNAAN & PENGHUNI"
            : "ARTICLE 5 — USE & OCCUPANCY",

        body:
          isID
            ? `Properti digunakan untuk ${clean(
                data.occupancy
                  .permittedUse,
                "keperluan tempat tinggal"
              )}. ${occupancy} ${occupantNamesText} ${pets} ${smoking} ${subletting} ${clean(
                data.occupancy
                  .sublettingNotes,
                ""
              )} ${houseRulesText}`.trim()
            : `The Property shall be used for ${clean(
                data.occupancy
                  .permittedUse,
                "residential purposes"
              )}. ${occupancy} ${occupantNamesText} ${pets} ${smoking} ${subletting} ${clean(
                data.occupancy
                  .sublettingNotes,
                ""
              )} ${houseRulesText}`.trim(),
      },

      {
        key: "utilities",

        title:
          isID
            ? "PASAL 6 — UTILITAS & BIAYA OPERASIONAL"
            : "ARTICLE 6 — UTILITIES & OPERATING COSTS",

        body:
          isID
            ? `Listrik: ${rentalResponsibilityLabel(
                data.utilities
                  .electricity,
                "id"
              )}; Air: ${rentalResponsibilityLabel(
                data.utilities
                  .water,
                "id"
              )}; Internet: ${rentalResponsibilityLabel(
                data.utilities
                  .internet,
                "id"
              )}; Sampah: ${rentalResponsibilityLabel(
                data.utilities
                  .garbage,
                "id"
              )}; Biaya lingkungan/Banjar: ${rentalResponsibilityLabel(
                data.utilities
                  .banjarCommunityFees,
                "id"
              )}; Perawatan kolam: ${rentalResponsibilityLabel(
                data.utilities
                  .poolMaintenance,
                "id"
              )}; Perawatan taman: ${rentalResponsibilityLabel(
                data.utilities
                  .gardenMaintenance,
                "id"
              )}; Housekeeping: ${rentalResponsibilityLabel(
                data.utilities
                  .housekeeping,
                "id"
              )}. ${clean(
                data.utilities
                  .otherNotes,
                ""
              )}`
            : `Electricity: ${rentalResponsibilityLabel(
                data.utilities
                  .electricity,
                "en"
              )}; Water: ${rentalResponsibilityLabel(
                data.utilities
                  .water,
                "en"
              )}; Internet: ${rentalResponsibilityLabel(
                data.utilities
                  .internet,
                "en"
              )}; Garbage: ${rentalResponsibilityLabel(
                data.utilities
                  .garbage,
                "en"
              )}; Community/Banjar fees: ${rentalResponsibilityLabel(
                data.utilities
                  .banjarCommunityFees,
                "en"
              )}; Pool maintenance: ${rentalResponsibilityLabel(
                data.utilities
                  .poolMaintenance,
                "en"
              )}; Garden maintenance: ${rentalResponsibilityLabel(
                data.utilities
                  .gardenMaintenance,
                "en"
              )}; Housekeeping: ${rentalResponsibilityLabel(
                data.utilities
                  .housekeeping,
                "en"
              )}. ${clean(
                data.utilities
                  .otherNotes,
                ""
              )}`,
      },

      {
        key: "maintenance",

        title:
          isID
            ? "PASAL 7 — PERAWATAN, PERBAIKAN & PERUBAHAN"
            : "ARTICLE 7 — MAINTENANCE, REPAIRS & ALTERATIONS",

        body:
          isID
            ? `Penyewa wajib menggunakan dan menjaga Properti secara wajar serta segera memberitahukan kerusakan yang memerlukan perhatian Pemilik. ${
                data.maintenance
                  .tenantRoutineMaintenance
                  .trim()
                  ? `Tanggung jawab perawatan rutin Penyewa: ${clean(
                      data.maintenance
                        .tenantRoutineMaintenance
                    )}.`
                  : ""
              } ${
                data.maintenance
                  .landlordMaintenance
                  .trim()
                  ? `Tanggung jawab perawatan Pemilik: ${clean(
                      data.maintenance
                        .landlordMaintenance
                    )}.`
                  : ""
              } ${
                data.maintenance
                  .minorRepairThreshold > 0
                  ? `Batas biaya perbaikan kecil yang disepakati adalah ${money(
                      data.maintenance
                        .minorRepairThreshold,
                      currency,
                      "id"
                    )}.`
                  : ""
              } ${
                data.maintenance
                  .damageResponsibility
                  .trim()
                  ? `Tanggung jawab atas kerusakan: ${clean(
                      data.maintenance
                        .damageResponsibility
                    )}.`
                  : ""
              } Perubahan permanen pada Properti hanya dapat dilakukan dengan persetujuan tertulis Pemilik. ${
                data.maintenance
                  .alterationRules
                  .trim()
                  ? clean(
                      data.maintenance
                        .alterationRules
                    )
                  : ""
              }`.trim()
            : `The Tenant shall use and care for the Property reasonably and promptly notify the Landlord of damage requiring the Landlord's attention. ${
                data.maintenance
                  .tenantRoutineMaintenance
                  .trim()
                  ? `Tenant routine maintenance responsibility: ${clean(
                      data.maintenance
                        .tenantRoutineMaintenance
                    )}.`
                  : ""
              } ${
                data.maintenance
                  .landlordMaintenance
                  .trim()
                  ? `Landlord maintenance responsibility: ${clean(
                      data.maintenance
                        .landlordMaintenance
                    )}.`
                  : ""
              } ${
                data.maintenance
                  .minorRepairThreshold > 0
                  ? `The agreed minor-repair cost threshold is ${money(
                      data.maintenance
                        .minorRepairThreshold,
                      currency,
                      "en"
                    )}.`
                  : ""
              } ${
                data.maintenance
                  .damageResponsibility
                  .trim()
                  ? `Responsibility for damage: ${clean(
                      data.maintenance
                        .damageResponsibility
                    )}.`
                  : ""
              } Permanent alterations to the Property may only be made with the Landlord's written approval. ${
                data.maintenance
                  .alterationRules
                  .trim()
                  ? clean(
                      data.maintenance
                        .alterationRules
                    )
                  : ""
              }`.trim(),
      },

      {
        key: "access",

        title:
          isID
            ? "PASAL 8 — AKSES & PEMERIKSAAN"
            : "ARTICLE 8 — ACCESS & INSPECTION",

        body:
          isID
            ? `Pemilik atau pihak yang diberi kuasa dapat melakukan pemeriksaan atau pekerjaan yang diperlukan pada Properti dengan pemberitahuan sekurang-kurangnya ${data.maintenance.inspectionNoticeHours} jam sebelumnya, kecuali dalam keadaan darurat.`
            : `The Landlord or an authorised representative may inspect the Property or carry out necessary work upon at least ${data.maintenance.inspectionNoticeHours} hours' prior notice, except in an emergency.`,
      },

      {
        key: "inventory",

        title:
          isID
            ? "PASAL 9 — INVENTORY & KONDISI PROPERTI"
            : "ARTICLE 9 — INVENTORY & PROPERTY CONDITION",

        body:
          inventoryText,
      },

      {
        key: "renewal",

        title:
          isID
            ? "PASAL 10 — PERPANJANGAN"
            : "ARTICLE 10 — RENEWAL",

        body:
          data.renewal
            .renewalAvailable
            ? (
                isID
                  ? `Perpanjangan masa sewa diperbolehkan untuk dibicarakan, tetapi tidak berlangsung secara otomatis dan tetap memerlukan kesepakatan baru Para Pihak. Penyewa harus menyampaikan permintaan perpanjangan sekurang-kurangnya ${data.renewal.renewalNoticeDays} hari sebelum masa sewa berakhir. ${clean(
                      data.renewal
                        .renewalNotes,
                      ""
                    )}`
                  : `Renewal may be discussed, but it is not automatic and remains subject to a new agreement between the Parties. The Tenant must submit a renewal request at least ${data.renewal.renewalNoticeDays} days before the lease expires. ${clean(
                      data.renewal
                        .renewalNotes,
                      ""
                    )}`
              )
            : (
                isID
                  ? `Perpanjangan masa sewa tidak diberikan berdasarkan Perjanjian ini dan tidak terdapat hak otomatis untuk memperpanjang masa sewa. ${clean(
                      data.renewal
                        .renewalNotes,
                      ""
                    )}`
                  : `Renewal is not granted under this Agreement and there is no automatic right to extend the lease. ${clean(
                      data.renewal
                        .renewalNotes,
                      ""
                    )}`
              ),
      },

      {
        key: "termination",

        title:
          isID
            ? "PASAL 11 — PELANGGARAN & PENGAKHIRAN"
            : "ARTICLE 11 — DEFAULT & TERMINATION",

        body:
          isID
            ? `Jika salah satu pihak melakukan pelanggaran material, pihak tersebut diberikan waktu ${data.termination.breachCureDays} hari untuk memperbaiki pelanggaran setelah menerima pemberitahuan tertulis, apabila pelanggaran tersebut dapat diperbaiki. Pengakhiran lebih awal oleh Penyewa ${
                data.termination
                  .tenantEarlyTerminationAllowed
                  ? "diperbolehkan"
                  : "tidak diperbolehkan kecuali disepakati lain secara tertulis"
              }. Pengakhiran lebih awal oleh Pemilik ${
                data.termination
                  .landlordEarlyTerminationAllowed
                  ? "diperbolehkan"
                  : "tidak diperbolehkan kecuali disepakati lain secara tertulis"
              }. Apabila pengakhiran diperbolehkan berdasarkan Perjanjian ini, pemberitahuan tertulis sekurang-kurangnya ${data.termination.noticeDays} hari harus diberikan. ${clean(
                data.termination
                  .earlyTerminationNotes,
                ""
              )}`.trim()
            : `If either Party commits a material breach, that Party shall have ${data.termination.breachCureDays} days to remedy the breach after written notice where the breach is capable of remedy. Early termination by the Tenant ${
                data.termination
                  .tenantEarlyTerminationAllowed
                  ? "is permitted"
                  : "is not permitted unless otherwise agreed in writing"
              }. Early termination by the Landlord ${
                data.termination
                  .landlordEarlyTerminationAllowed
                  ? "is permitted"
                  : "is not permitted unless otherwise agreed in writing"
              }. Where early termination is permitted under this Agreement, at least ${data.termination.noticeDays} days' written notice must be given. ${clean(
                data.termination
                  .earlyTerminationNotes,
                ""
              )}`.trim(),
      },

      {
        key: "force_majeure",

        title:
          isID
            ? "PASAL 12 — KEADAAN KAHAR"
            : "ARTICLE 12 — FORCE MAJEURE",

        body:
          isID
            ? `Apabila pelaksanaan kewajiban terhambat oleh kejadian di luar kendali wajar Para Pihak, Para Pihak akan segera berkomunikasi dan menentukan penyelesaian yang wajar berdasarkan keadaan yang terjadi. ${clean(
                data.forceMajeureNotes,
                ""
              )}`
            : `If performance is prevented or materially affected by an event beyond the reasonable control of the Parties, the Parties shall communicate promptly and determine a reasonable solution having regard to the circumstances. ${clean(
                data.forceMajeureNotes,
                ""
              )}`,
      },

      {
        key: "law",

        title:
          isID
            ? "PASAL 13 — HUKUM & PENYELESAIAN PERSELISIHAN"
            : "ARTICLE 13 — GOVERNING LAW & DISPUTE RESOLUTION",

        body:
          isID
            ? `Perjanjian ini tunduk pada hukum Republik Indonesia. Para Pihak akan terlebih dahulu berupaya menyelesaikan perselisihan melalui musyawarah. ${clean(
                data.disputeResolution,
                ""
              )}`
            : `This Agreement is governed by the laws of the Republic of Indonesia. The Parties shall first attempt to resolve disputes amicably through discussion. ${clean(
                data.disputeResolution,
                ""
              )}`,
      },
    ];

  if (
    data.language ===
    "bilingual"
  ) {
    clauses.push({
      key: "language",

      title:
        isID
          ? "PASAL 14 — BAHASA"
          : "ARTICLE 14 — LANGUAGE",

      body:
        isID
          ? `Perjanjian ini dibuat dalam Bahasa Indonesia dan Bahasa Inggris. Kedua versi dimaksudkan untuk memberikan pemahaman yang sama. Apabila terdapat perbedaan penafsiran, Para Pihak menyepakati versi ${
              data.governingLanguage ===
              "en"
                ? "Bahasa Inggris"
                : "Bahasa Indonesia"
            } sebagai rujukan.`
          : `This Agreement is prepared in Bahasa Indonesia and English. Both versions are intended to reflect the same understanding. If there is any difference in interpretation, the Parties agree that the ${
              data.governingLanguage ===
              "en"
                ? "English"
                : "Bahasa Indonesia"
            } version shall prevail.`,
    });
  }

  return clauses;
}

export function rentalPartyDisplayName(
  party:
    RentalAgreementData["landlord"]
) {
  return party.partyType ===
    "company"
    ? clean(
        party.companyName
      )
    : clean(
        party.fullName
      );
}

export function rentalPreviewDate(
  value: string,
  language: RentalPreviewLanguage
) {
  return dateLabel(
    value,
    language
  );
}

export function rentalPreviewMoney(
  value: number,
  currency: RentalCurrency,
  language: RentalPreviewLanguage
) {
  return money(
    value,
    currency,
    language
  );
}

export function rentalAgreementDisclaimer(
  language: RentalPreviewLanguage
) {
  if (
    language === "en"
  ) {
    return "This document is a template/draft intended to help the Parties document their rental arrangement. It is not legal advice, a notarial deed, or a guarantee of legal validity. The Parties are responsible for reviewing all information and terms before signing. Where appropriate, the Parties should seek review from a notary, advocate, or other qualified legal professional in Indonesia, including regarding notarisation, Stamp Duty (Bea Meterai), taxation, and any other legal requirements applicable to the transaction.";
  }

  return "Dokumen ini merupakan template/draft untuk membantu Para Pihak mendokumentasikan kesepakatan sewa. Dokumen ini bukan nasihat hukum, bukan akta notaris, dan bukan jaminan keabsahan hukum. Para Pihak bertanggung jawab untuk memeriksa seluruh informasi dan ketentuan sebelum menandatangani. Bila diperlukan, Para Pihak disarankan meminta pemeriksaan dari notaris, advokat, atau profesional hukum yang berwenang di Indonesia, termasuk mengenai kebutuhan notarialisasi, Bea Meterai, kewajiban pajak, dan persyaratan hukum lain yang berlaku pada transaksi tersebut.";
}
