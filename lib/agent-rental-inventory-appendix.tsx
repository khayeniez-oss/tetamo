import {
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import type {
  AgentInventoryData,
  InventoryCondition,
} from "@/lib/agent-inventory";

import type {
  RentalAgreementData,
} from "@/lib/agent-rental-agreement";

import {
  rentalPartyDisplayName,
} from "@/lib/agent-rental-agreement-copy";

import {
  conditionLabel,
  itemLabel,
  sectionLabel,
} from "@/lib/agent-inventory-pdf";

export type RentalInventoryAppendixLanguage =
  | "id"
  | "bilingual";

type Props = {
  inventory:
    AgentInventoryData;

  agreement:
    RentalAgreementData;

  language:
    RentalInventoryAppendixLanguage;
};

function clean(
  value:
    | string
    | null
    | undefined
) {
  return (
    value?.trim() ||
    "-"
  );
}

function bilingualLabel(
  id: string,
  en: string,
  bilingual: boolean
) {
  if (!bilingual) {
    return id;
  }

  if (id === en) {
    return id;
  }

  return `${id} / ${en}`;
}

function formatDate(
  value: string,
  bilingual: boolean
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

  const id =
    new Intl.DateTimeFormat(
      "id-ID",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }
    ).format(parsed);

  if (!bilingual) {
    return id;
  }

  const en =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }
    ).format(parsed);

  return `${id} / ${en}`;
}

function translatedSection(
  value: string,
  bilingual: boolean
) {
  return bilingualLabel(
    sectionLabel(
      value,
      "id"
    ),
    sectionLabel(
      value,
      "en"
    ),
    bilingual
  );
}

function translatedItem(
  value: string,
  bilingual: boolean
) {
  return bilingualLabel(
    itemLabel(
      value,
      "id"
    ),
    itemLabel(
      value,
      "en"
    ),
    bilingual
  );
}

function translatedCondition(
  value:
    InventoryCondition | null,
  bilingual: boolean
) {
  if (!value) {
    return "-";
  }

  return bilingualLabel(
    conditionLabel(
      value,
      "id"
    ),
    conditionLabel(
      value,
      "en"
    ),
    bilingual
  );
}

const styles =
  StyleSheet.create({
    page: {
      backgroundColor:
        "#FFFFFF",

      color:
        "#1C1C1E",

      fontFamily:
        "Helvetica",

      fontSize: 8,

      paddingTop: 34,
      paddingHorizontal: 36,
      paddingBottom: 52,
    },

    top: {
      borderBottomWidth: 1,

      borderBottomColor:
        "#B58A3C",

      paddingBottom: 14,

      marginBottom: 16,
    },

    appendix: {
      fontSize: 8,

      fontFamily:
        "Helvetica-Bold",

      color:
        "#80652F",

      letterSpacing: 1,

      marginBottom: 6,
    },

    title: {
      fontSize: 18,

      fontFamily:
        "Helvetica-Bold",

      lineHeight: 1.2,
    },

    intro: {
      marginTop: 6,

      fontSize: 7.5,

      lineHeight: 1.45,

      color:
        "#625D56",
    },

    property: {
      borderWidth: 1,

      borderColor:
        "#DDD6C9",

      borderRadius: 7,

      padding: 11,

      marginBottom: 16,
    },

    propertyTitle: {
      fontSize: 11,

      fontFamily:
        "Helvetica-Bold",

      color:
        "#80652F",

      marginBottom: 7,
    },

    meta: {
      fontSize: 7.5,

      lineHeight: 1.45,

      marginBottom: 2,
    },

    section: {
      marginBottom: 14,
    },

    sectionTitle: {
      fontSize: 9,

      fontFamily:
        "Helvetica-Bold",

      color:
        "#80652F",

      paddingBottom: 5,

      borderBottomWidth: 1,

      borderBottomColor:
        "#D8C9A9",
    },

    tableHeader: {
      flexDirection:
        "row",

      backgroundColor:
        "#F1EEE8",

      borderBottomWidth: 1,

      borderBottomColor:
        "#D9D4CB",

      paddingVertical: 6,

      paddingHorizontal: 5,
    },

    row: {
      flexDirection:
        "row",

      borderBottomWidth: 0.5,

      borderBottomColor:
        "#E5E0D8",

      paddingVertical: 6,

      paddingHorizontal: 5,

      minHeight: 23,
    },

    issueRow: {
      backgroundColor:
        "#FFF2EF",
    },

    item: {
      width:
        "36%",

      paddingRight: 4,
    },

    qty: {
      width:
        "9%",

      textAlign:
        "center",

      paddingRight: 3,
    },

    condition: {
      width:
        "20%",

      paddingRight: 4,
    },

    notes: {
      width:
        "35%",
    },

    headerText: {
      fontSize: 6.5,

      fontFamily:
        "Helvetica-Bold",

      color:
        "#68635B",
    },

    rowText: {
      fontSize: 7.5,

      lineHeight: 1.35,
    },

    itemName: {
      fontFamily:
        "Helvetica-Bold",
    },

    issueText: {
      color:
        "#B43A2E",

      fontFamily:
        "Helvetica-Bold",
    },

    notesBox: {
      borderWidth: 1,

      borderColor:
        "#DDD6C9",

      borderRadius: 7,

      padding: 10,

      marginTop: 4,

      marginBottom: 16,
    },

    notesHeading: {
      fontSize: 7.5,

      fontFamily:
        "Helvetica-Bold",

      color:
        "#80652F",

      marginBottom: 5,
    },

    notesText: {
      fontSize: 7.7,

      lineHeight: 1.45,
    },

    acknowledgement: {
      marginTop: 8,

      paddingTop: 14,

      borderTopWidth: 1,

      borderTopColor:
        "#D8C9A9",
    },

    acknowledgementTitle: {
      fontSize: 9,

      fontFamily:
        "Helvetica-Bold",

      color:
        "#80652F",

      marginBottom: 6,
    },

    acknowledgementText: {
      fontSize: 7.6,

      lineHeight: 1.45,

      color:
        "#625D56",

      marginBottom: 18,
    },

    signatures: {
      flexDirection:
        "row",

      gap: 28,
    },

    signatureBox: {
      flexGrow: 1,

      flexBasis: 0,
    },

    signatureSpace: {
      height: 52,

      borderBottomWidth: 1,

      borderBottomColor:
        "#77716A",

      marginBottom: 6,
    },

    signatureRole: {
      textAlign:
        "center",

      fontSize: 7.5,

      fontFamily:
        "Helvetica-Bold",
    },

    signatureName: {
      textAlign:
        "center",

      marginTop: 3,

      fontSize: 7,

      color:
        "#6D675F",
    },

    footer: {
      position:
        "absolute",

      left: 36,
      right: 36,
      bottom: 19,

      borderTopWidth: 0.5,

      borderTopColor:
        "#D8D2C8",

      paddingTop: 7,

      flexDirection:
        "row",

      justifyContent:
        "space-between",

      fontSize: 6.5,

      color:
        "#918B82",
    },
  });

export function RentalInventoryAppendix({
  inventory,
  agreement,
  language,
}: Props) {
  const bilingual =
    language ===
    "bilingual";

  const sections =
    inventory.sections
      .map(
        (section) => ({
          ...section,

          items:
            section.items.filter(
              (item) =>
                item.included
            ),
        })
      )
      .filter(
        (section) =>
          section.items.length >
          0
      );

  const ownerName =
    inventory.owner.name.trim() ||
    rentalPartyDisplayName(
      agreement.landlord
    );

  const tenantName =
    inventory.tenant.name.trim() ||
    rentalPartyDisplayName(
      agreement.tenant
    );

  return (
    <Page
      size="A4"
      style={
        styles.page
      }
      wrap
    >
      <View
        style={
          styles.top
        }
        wrap={false}
      >
        <Text
          style={
            styles.appendix
          }
        >
          {bilingual
            ? "LAMPIRAN 1 / APPENDIX 1"
            : "LAMPIRAN 1"}
        </Text>

        <Text
          style={
            styles.title
          }
        >
          {bilingual
            ? "INVENTORY & SERAH TERIMA / INVENTORY & HANDOVER REPORT"
            : "INVENTORY & SERAH TERIMA"}
        </Text>

        <Text
          style={
            styles.intro
          }
        >
          {bilingual
            ? "Lampiran ini merupakan bagian dari Perjanjian Sewa dan mencatat barang serta kondisi Properti pada saat serah terima. / This Appendix forms part of the Rental Agreement and records the items and condition of the Property at handover."
            : "Lampiran ini merupakan bagian dari Perjanjian Sewa dan mencatat barang serta kondisi Properti pada saat serah terima."}
        </Text>
      </View>

      <View
        style={
          styles.property
        }
        wrap={false}
      >
        <Text
          style={
            styles.propertyTitle
          }
        >
          {clean(
            inventory.property.title ||
            agreement.property.title
          )}
        </Text>

        <Text style={styles.meta}>
          {bilingual
            ? "Kode Properti / Property Code"
            : "Kode Properti"}
          :{" "}
          {clean(
            inventory.property.code ||
            agreement.property.code
          )}
        </Text>

        <Text style={styles.meta}>
          {bilingual
            ? "Tanggal Serah Terima / Handover Date"
            : "Tanggal Serah Terima"}
          :{" "}
          {formatDate(
            inventory.handoverDate,
            bilingual
          )}
        </Text>

        <Text style={styles.meta}>
          {bilingual
            ? "Alamat / Address"
            : "Alamat"}
          :{" "}
          {clean(
            inventory.property.address ||
            inventory.property.location ||
            agreement.property.address ||
            agreement.property.location
          )}
        </Text>

        <Text style={styles.meta}>
          {bilingual
            ? "Pemilik / Landlord"
            : "Pemilik"}
          :{" "}
          {clean(ownerName)}
        </Text>

        <Text style={styles.meta}>
          {bilingual
            ? "Penyewa / Tenant"
            : "Penyewa"}
          :{" "}
          {clean(tenantName)}
        </Text>
      </View>

      {sections.length > 0 ? (
        sections.map(
          (section) => (
            <View
              key={
                section.id
              }
              style={
                styles.section
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
                wrap={false}
              >
                {translatedSection(
                  section.name,
                  bilingual
                )}
              </Text>

              <View
                style={
                  styles.tableHeader
                }
                wrap={false}
              >
                <Text
                  style={[
                    styles.item,
                    styles.headerText,
                  ]}
                >
                  {bilingual
                    ? "Barang / Item"
                    : "Barang"}
                </Text>

                <Text
                  style={[
                    styles.qty,
                    styles.headerText,
                  ]}
                >
                  {bilingual
                    ? "Jml / Qty"
                    : "Jml"}
                </Text>

                <Text
                  style={[
                    styles.condition,
                    styles.headerText,
                  ]}
                >
                  {bilingual
                    ? "Kondisi / Condition"
                    : "Kondisi"}
                </Text>

                <Text
                  style={[
                    styles.notes,
                    styles.headerText,
                  ]}
                >
                  {bilingual
                    ? "Catatan / Notes"
                    : "Catatan"}
                </Text>
              </View>

              {section.items.map(
                (item) => {
                  const issue =
                    item.condition ===
                      "damaged" ||
                    item.condition ===
                      "missing";

                  return (
                    <View
                      key={
                        item.id
                      }
                      style={
                        issue
                          ? [
                              styles.row,
                              styles.issueRow,
                            ]
                          : styles.row
                      }
                      wrap={false}
                    >
                      <Text
                        style={[
                          styles.item,
                          styles.rowText,
                          styles.itemName,
                        ]}
                      >
                        {translatedItem(
                          item.name,
                          bilingual
                        )}
                      </Text>

                      <Text
                        style={[
                          styles.qty,
                          styles.rowText,
                        ]}
                      >
                        {String(
                          item.quantity
                        )}
                      </Text>

                      <Text
                        style={
                          issue
                            ? [
                                styles.condition,
                                styles.rowText,
                                styles.issueText,
                              ]
                            : [
                                styles.condition,
                                styles.rowText,
                              ]
                        }
                      >
                        {translatedCondition(
                          item.condition,
                          bilingual
                        )}
                      </Text>

                      <Text
                        style={[
                          styles.notes,
                          styles.rowText,
                        ]}
                      >
                        {clean(
                          item.notes
                        )}
                      </Text>
                    </View>
                  );
                }
              )}
            </View>
          )
        )
      ) : (
        <View
          style={
            styles.notesBox
          }
        >
          <Text
            style={
              styles.notesText
            }
          >
            {bilingual
              ? "Belum ada barang inventory yang dipilih. / No inventory items were selected."
              : "Belum ada barang inventory yang dipilih."}
          </Text>
        </View>
      )}

      {inventory.generalNotes.trim() ? (
        <View
          style={
            styles.notesBox
          }
          wrap={false}
        >
          <Text
            style={
              styles.notesHeading
            }
          >
            {bilingual
              ? "Catatan Umum / General Notes"
              : "Catatan Umum"}
          </Text>

          <Text
            style={
              styles.notesText
            }
          >
            {inventory.generalNotes}
          </Text>
        </View>
      ) : null}

      <View
        style={
          styles.acknowledgement
        }
        wrap={false}
      >
        <Text
          style={
            styles.acknowledgementTitle
          }
        >
          {bilingual
            ? "Persetujuan Lampiran / Appendix Acknowledgement"
            : "Persetujuan Lampiran"}
        </Text>

        <Text
          style={
            styles.acknowledgementText
          }
        >
          {bilingual
            ? "Pemilik dan Penyewa mengakui bahwa daftar dan kondisi di atas mencerminkan barang serta kondisi Properti pada saat serah terima, kecuali dinyatakan lain dalam catatan. / The Landlord and Tenant acknowledge that the list and conditions above reflect the items and condition of the Property at handover, except as otherwise noted."
            : "Pemilik dan Penyewa mengakui bahwa daftar dan kondisi di atas mencerminkan barang serta kondisi Properti pada saat serah terima, kecuali dinyatakan lain dalam catatan."}
        </Text>

        <View
          style={
            styles.signatures
          }
        >
          <View
            style={
              styles.signatureBox
            }
          >
            <View
              style={
                styles.signatureSpace
              }
            />

            <Text
              style={
                styles.signatureRole
              }
            >
              {bilingual
                ? "Pemilik / Landlord"
                : "Pemilik"}
            </Text>

            <Text
              style={
                styles.signatureName
              }
            >
              {clean(ownerName)}
            </Text>
          </View>

          <View
            style={
              styles.signatureBox
            }
          >
            <View
              style={
                styles.signatureSpace
              }
            />

            <Text
              style={
                styles.signatureRole
              }
            >
              {bilingual
                ? "Penyewa / Tenant"
                : "Penyewa"}
            </Text>

            <Text
              style={
                styles.signatureName
              }
            >
              {clean(tenantName)}
            </Text>
          </View>
        </View>
      </View>

      <View
        fixed
        style={
          styles.footer
        }
      >
        <Text>
          {bilingual
            ? "Lampiran 1 / Appendix 1"
            : "Lampiran 1"}
        </Text>

        <Text
          render={({
            pageNumber,
            totalPages,
          }) =>
            bilingual
              ? `Halaman / Page ${pageNumber} / ${totalPages}`
              : `Halaman ${pageNumber} / ${totalPages}`
          }
        />
      </View>
    </Page>
  );
}
