import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

import {
  readFile,
} from "node:fs/promises";

import path from "node:path";

import type {
  AgentInventoryData,
  InventoryCondition,
} from "@/lib/agent-inventory";

export type InventoryPdfLanguage =
  | "id"
  | "en";

type InventoryPdfData = {
  inventory: AgentInventoryData;
  language: InventoryPdfLanguage;
  brandLogoDataUrl: string;
};

const ITEM_LABEL_ID:
  Record<string, string> = {
    Sofa: "Sofa",
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
    Freezer: "Freezer",
    "Stove/Cooktop": "Kompor",
    Oven: "Oven",
    Microwave: "Microwave",
    "Range Hood": "Penghisap Asap",
    "Rice Cooker": "Penanak Nasi",
    "Electric Kettle": "Ketel Listrik",
    "Water Dispenser": "Dispenser Air",
    Blender: "Blender",
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
    Toilet: "Toilet",
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

function dictionary(
  language: InventoryPdfLanguage
) {
  if (language === "en") {
    return {
      title:
        "Property Inventory & Handover Report",
      property:
        "Property",
      propertyCode:
        "Listing Code",
      location:
        "Location",
      propertyType:
        "Property Type",
      owner:
        "Owner",
      tenant:
        "Tenant",
      agent:
        "Agent",
      agency:
        "Agency",
      handoverDate:
        "Handover Date",
      item:
        "Item",
      qty:
        "Qty",
      condition:
        "Condition",
      notes:
        "Notes",
      generalNotes:
        "General Notes",
      noItems:
        "No inventory items were selected.",
      signatures:
        "Acknowledgement & Signatures",
      ownerSignature:
        "Owner Signature",
      tenantSignature:
        "Tenant Signature",
      agentSignature:
        "Agent Signature",
      generated:
        "Generated through Tetamo Agent Tools",
      page:
        "Page",
    };
  }

  return {
    title:
      "Laporan Inventory & Serah Terima Properti",
    property:
      "Properti",
    propertyCode:
      "Kode Listing",
    location:
      "Lokasi",
    propertyType:
      "Jenis Properti",
    owner:
      "Pemilik",
    tenant:
      "Penyewa",
    agent:
      "Agen",
    agency:
      "Agensi",
    handoverDate:
      "Tanggal Serah Terima",
    item:
      "Barang",
    qty:
      "Jumlah",
    condition:
      "Kondisi",
    notes:
      "Catatan",
    generalNotes:
      "Catatan Umum",
    noItems:
      "Belum ada barang inventory yang dipilih.",
    signatures:
      "Persetujuan & Tanda Tangan",
    ownerSignature:
      "Tanda Tangan Pemilik",
    tenantSignature:
      "Tanda Tangan Penyewa",
    agentSignature:
      "Tanda Tangan Agen",
    generated:
      "Dibuat melalui Tetamo Agent Tools",
    page:
      "Halaman",
  };
}

export function sectionLabel(
  value: string,
  language: InventoryPdfLanguage
) {
  if (language === "en") {
    return value;
  }

  if (
    value.startsWith(
      "Bedroom "
    )
  ) {
    return value.replace(
      "Bedroom",
      "Kamar Tidur"
    );
  }

  if (
    value.startsWith(
      "Bathroom "
    )
  ) {
    return value.replace(
      "Bathroom",
      "Kamar Mandi"
    );
  }

  const labels:
    Record<string, string> = {
      "Living Room":
        "Ruang Tamu",
      "Dining Room":
        "Ruang Makan",
      Kitchen:
        "Dapur",
      Laundry:
        "Area Laundry",
      Outdoor:
        "Area Luar",
      Pool:
        "Kolam Renang",
      "Keys & Access":
        "Kunci & Akses",
      Other:
        "Lainnya",
    };

  return (
    labels[value] ||
    value
  );
}

export function itemLabel(
  value: string,
  language: InventoryPdfLanguage
) {
  if (
    language === "en"
  ) {
    return value;
  }

  return (
    ITEM_LABEL_ID[value] ||
    value
  );
}

export function conditionLabel(
  condition:
    InventoryCondition | null,
  language: InventoryPdfLanguage
) {
  if (!condition) {
    return "-";
  }

  const english:
    Record<
      InventoryCondition,
      string
    > = {
      new: "New",
      good: "Good",
      fair: "Fair",
      damaged: "Damaged",
      missing: "Missing",
    };

  const indonesian:
    Record<
      InventoryCondition,
      string
    > = {
      new: "Baru",
      good: "Baik",
      fair: "Cukup",
      damaged: "Rusak",
      missing: "Tidak Ada",
    };

  return language === "id"
    ? indonesian[
        condition
      ]
    : english[
        condition
      ];
}

function formatDate(
  value: string,
  language: InventoryPdfLanguage
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

const styles =
  StyleSheet.create({
    page: {
      backgroundColor:
        "#F8F5EE",
      color:
        "#1C1C1E",
      fontFamily:
        "Helvetica",
      fontSize: 9,
      paddingTop: 32,
      paddingHorizontal: 34,
      paddingBottom: 52,
    },

    header: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      alignItems:
        "center",
      borderBottomWidth: 1,
      borderBottomColor:
        "#B58A3C",
      paddingBottom: 14,
      marginBottom: 18,
    },

    brand: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 10,
    },

    logo: {
      width: 42,
      height: 42,
      objectFit:
        "contain",
    },

    brandName: {
      fontSize: 13,
      fontFamily:
        "Helvetica-Bold",
      letterSpacing: 1.6,
    },

    brandSub: {
      marginTop: 2,
      fontSize: 7,
      color:
        "#8B806E",
    },

    title: {
      fontSize: 21,
      lineHeight: 1.2,
      fontFamily:
        "Helvetica-Bold",
      maxWidth: 330,
    },

    propertyCard: {
      backgroundColor:
        "#EEE7D8",
      borderRadius: 8,
      padding: 14,
      marginBottom: 14,
    },

    propertyTitle: {
      fontSize: 13,
      fontFamily:
        "Helvetica-Bold",
      color:
        "#80652F",
      marginBottom: 8,
    },

    detailsGrid: {
      flexDirection:
        "row",
      flexWrap:
        "wrap",
      gap: 8,
    },

    detailBox: {
      width:
        "48%",
      marginBottom: 5,
    },

    detailLabel: {
      fontSize: 7,
      textTransform:
        "uppercase",
      color:
        "#8B806E",
      letterSpacing: 0.7,
      marginBottom: 2,
    },

    detailValue: {
      fontSize: 9,
      fontFamily:
        "Helvetica-Bold",
    },

    parties: {
      flexDirection:
        "row",
      gap: 8,
      marginBottom: 18,
    },

    partyCard: {
      flexGrow: 1,
      flexBasis: 0,
      borderWidth: 1,
      borderColor:
        "#DED8CC",
      borderRadius: 7,
      padding: 10,
      minHeight: 72,
    },

    partyLabel: {
      fontSize: 7,
      textTransform:
        "uppercase",
      letterSpacing: 0.8,
      color:
        "#9A772B",
      marginBottom: 5,
    },

    partyName: {
      fontFamily:
        "Helvetica-Bold",
      fontSize: 9.5,
      marginBottom: 3,
    },

    partyMeta: {
      fontSize: 7.5,
      color:
        "#66615A",
      lineHeight: 1.35,
    },

    section: {
      marginBottom: 14,
    },

    sectionTitle: {
      fontSize: 10,
      fontFamily:
        "Helvetica-Bold",
      color:
        "#80652F",
      textTransform:
        "uppercase",
      letterSpacing: 0.8,
      borderBottomWidth: 1,
      borderBottomColor:
        "#D8C9A9",
      paddingBottom: 5,
      marginBottom: 0,
    },

    tableHeader: {
      flexDirection:
        "row",
      backgroundColor:
        "#EEEAE2",
      borderBottomWidth: 1,
      borderBottomColor:
        "#D9D4CB",
      paddingVertical: 6,
      paddingHorizontal: 6,
    },

    tableRow: {
      flexDirection:
        "row",
      borderBottomWidth: 0.5,
      borderBottomColor:
        "#E5E0D8",
      paddingVertical: 6,
      paddingHorizontal: 6,
      minHeight: 24,
    },

    issueRow: {
      backgroundColor:
        "#FFF2EF",
    },

    colItem: {
      width:
        "35%",
      paddingRight: 5,
    },

    colQty: {
      width:
        "10%",
      paddingRight: 4,
      textAlign:
        "center",
    },

    colCondition: {
      width:
        "20%",
      paddingRight: 4,
    },

    colNotes: {
      width:
        "35%",
    },

    tableHeaderText: {
      fontSize: 7,
      fontFamily:
        "Helvetica-Bold",
      color:
        "#68635B",
      textTransform:
        "uppercase",
    },

    tableText: {
      fontSize: 8,
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

    empty: {
      borderWidth: 1,
      borderColor:
        "#DDD7CB",
      borderStyle:
        "dashed",
      borderRadius: 7,
      padding: 18,
      color:
        "#827C72",
      textAlign:
        "center",
      marginBottom: 16,
    },

    notesBox: {
      marginTop: 4,
      borderWidth: 1,
      borderColor:
        "#DDD7CB",
      borderRadius: 7,
      padding: 12,
      marginBottom: 18,
    },

    notesLabel: {
      fontSize: 8,
      fontFamily:
        "Helvetica-Bold",
      color:
        "#80652F",
      marginBottom: 5,
    },

    notesText: {
      fontSize: 8.5,
      lineHeight: 1.45,
    },

    signatureHeading: {
      marginTop: 8,
      fontSize: 10,
      fontFamily:
        "Helvetica-Bold",
      color:
        "#80652F",
      marginBottom: 18,
    },

    signatures: {
      flexDirection:
        "row",
      gap: 12,
    },

    signatureBox: {
      flexGrow: 1,
      flexBasis: 0,
    },

    signatureLine: {
      height: 52,
      borderBottomWidth: 1,
      borderBottomColor:
        "#77716A",
      marginBottom: 6,
    },

    signatureLabel: {
      fontSize: 7.5,
      textAlign:
        "center",
      fontFamily:
        "Helvetica-Bold",
    },

    signatureName: {
      marginTop: 3,
      fontSize: 7,
      textAlign:
        "center",
      color:
        "#6D675F",
    },

    footer: {
      position:
        "absolute",
      left: 34,
      right: 34,
      bottom: 20,
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      borderTopWidth: 0.5,
      borderTopColor:
        "#D8D2C8",
      paddingTop: 7,
      color:
        "#918B82",
      fontSize: 6.5,
    },
  });

function PartyCard({
  label,
  name,
  phone,
  email,
  extra,
}: {
  label: string;
  name: string;
  phone?: string;
  email?: string;
  extra?: string;
}) {
  return (
    <View
      style={
        styles.partyCard
      }
    >
      <Text
        style={
          styles.partyLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.partyName
        }
      >
        {clean(name)}
      </Text>

      {extra ? (
        <Text
          style={
            styles.partyMeta
          }
        >
          {extra}
        </Text>
      ) : null}

      {phone ? (
        <Text
          style={
            styles.partyMeta
          }
        >
          {phone}
        </Text>
      ) : null}

      {email ? (
        <Text
          style={
            styles.partyMeta
          }
        >
          {email}
        </Text>
      ) : null}
    </View>
  );
}

function InventoryDocument({
  data,
}: {
  data: InventoryPdfData;
}) {
  const {
    inventory,
    language,
  } = data;

  const copy =
    dictionary(
      language
    );

  const includedSections =
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

  return (
    <Document>
      <Page
        size="A4"
        style={
          styles.page
        }
      >
        <View
          style={
            styles.header
          }
        >
          <View
            style={
              styles.brand
            }
          >
            <Image
              src={
                data.brandLogoDataUrl
              }
              style={
                styles.logo
              }
            />

            <View>
              <Text
                style={
                  styles.brandName
                }
              >
                TETAMO
              </Text>

              <Text
                style={
                  styles.brandSub
                }
              >
                AGENT TOOLS
              </Text>
            </View>
          </View>
        </View>

        <Text
          style={
            styles.title
          }
        >
          {copy.title}
        </Text>

        <View
          style={
            styles.propertyCard
          }
        >
          <Text
            style={
              styles.propertyTitle
            }
          >
            {clean(
              inventory.property
                .title
            )}
          </Text>

          <View
            style={
              styles.detailsGrid
            }
          >
            <View
              style={
                styles.detailBox
              }
            >
              <Text
                style={
                  styles.detailLabel
                }
              >
                {copy.propertyCode}
              </Text>

              <Text
                style={
                  styles.detailValue
                }
              >
                {clean(
                  inventory.property
                    .code
                )}
              </Text>
            </View>

            <View
              style={
                styles.detailBox
              }
            >
              <Text
                style={
                  styles.detailLabel
                }
              >
                {copy.handoverDate}
              </Text>

              <Text
                style={
                  styles.detailValue
                }
              >
                {formatDate(
                  inventory.handoverDate,
                  language
                )}
              </Text>
            </View>

            <View
              style={
                styles.detailBox
              }
            >
              <Text
                style={
                  styles.detailLabel
                }
              >
                {copy.location}
              </Text>

              <Text
                style={
                  styles.detailValue
                }
              >
                {clean(
                  inventory.property
                    .location ||
                    inventory.property
                      .address
                )}
              </Text>
            </View>

            <View
              style={
                styles.detailBox
              }
            >
              <Text
                style={
                  styles.detailLabel
                }
              >
                {copy.propertyType}
              </Text>

              <Text
                style={
                  styles.detailValue
                }
              >
                {clean(
                  inventory.property
                    .propertyType
                )}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={
            styles.parties
          }
        >
          <PartyCard
            label={
              copy.owner
            }
            name={
              inventory.owner
                .name
            }
            phone={
              inventory.owner
                .phone
            }
            email={
              inventory.owner
                .email
            }
          />

          <PartyCard
            label={
              copy.tenant
            }
            name={
              inventory.tenant
                .name
            }
            phone={
              inventory.tenant
                .phone
            }
            email={
              inventory.tenant
                .email
            }
          />

          <PartyCard
            label={
              copy.agent
            }
            name={
              inventory.agent
                .name
            }
            phone={
              inventory.agent
                .phone
            }
            email={
              inventory.agent
                .email
            }
            extra={
              inventory.agent
                .agency
            }
          />
        </View>

        {includedSections.length ===
        0 ? (
          <Text
            style={
              styles.empty
            }
          >
            {copy.noItems}
          </Text>
        ) : (
          includedSections.map(
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
                >
                  {sectionLabel(
                    section.name,
                    language
                  )}
                </Text>

                <View
                  style={
                    styles.tableHeader
                  }
                >
                  <Text
                    style={[
                      styles.colItem,
                      styles.tableHeaderText,
                    ]}
                  >
                    {copy.item}
                  </Text>

                  <Text
                    style={[
                      styles.colQty,
                      styles.tableHeaderText,
                    ]}
                  >
                    {copy.qty}
                  </Text>

                  <Text
                    style={[
                      styles.colCondition,
                      styles.tableHeaderText,
                    ]}
                  >
                    {copy.condition}
                  </Text>

                  <Text
                    style={[
                      styles.colNotes,
                      styles.tableHeaderText,
                    ]}
                  >
                    {copy.notes}
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
                        style={[
                          styles.tableRow,
                          ...(issue
                            ? [
                                styles.issueRow,
                              ]
                            : []),
                        ]}
                        wrap={false}
                      >
                        <Text
                          style={[
                            styles.colItem,
                            styles.tableText,
                            styles.itemName,
                          ]}
                        >
                          {itemLabel(
                            item.name,
                            language
                          )}
                        </Text>

                        <Text
                          style={[
                            styles.colQty,
                            styles.tableText,
                          ]}
                        >
                          {item.quantity}
                        </Text>

                        <Text
                          style={[
                            styles.colCondition,
                            styles.tableText,
                            ...(issue
                              ? [
                                  styles.issueText,
                                ]
                              : []),
                          ]}
                        >
                          {conditionLabel(
                            item.condition,
                            language
                          )}
                        </Text>

                        <Text
                          style={[
                            styles.colNotes,
                            styles.tableText,
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
        )}

        {inventory.generalNotes ? (
          <View
            style={
              styles.notesBox
            }
          >
            <Text
              style={
                styles.notesLabel
              }
            >
              {copy.generalNotes}
            </Text>

            <Text
              style={
                styles.notesText
              }
            >
              {
                inventory.generalNotes
              }
            </Text>
          </View>
        ) : null}

        <Text
          style={
            styles.signatureHeading
          }
        >
          {copy.signatures}
        </Text>

        <View
          style={
            styles.signatures
          }
          wrap={false}
        >
          <View
            style={
              styles.signatureBox
            }
          >
            <View
              style={
                styles.signatureLine
              }
            />

            <Text
              style={
                styles.signatureLabel
              }
            >
              {
                copy.ownerSignature
              }
            </Text>

            <Text
              style={
                styles.signatureName
              }
            >
              {clean(
                inventory.owner
                  .name
              )}
            </Text>
          </View>

          <View
            style={
              styles.signatureBox
            }
          >
            <View
              style={
                styles.signatureLine
              }
            />

            <Text
              style={
                styles.signatureLabel
              }
            >
              {
                copy.tenantSignature
              }
            </Text>

            <Text
              style={
                styles.signatureName
              }
            >
              {clean(
                inventory.tenant
                  .name
              )}
            </Text>
          </View>

          <View
            style={
              styles.signatureBox
            }
          >
            <View
              style={
                styles.signatureLine
              }
            />

            <Text
              style={
                styles.signatureLabel
              }
            >
              {
                copy.agentSignature
              }
            </Text>

            <Text
              style={
                styles.signatureName
              }
            >
              {clean(
                inventory.agent
                  .name
              )}
            </Text>
          </View>
        </View>

        <View
          fixed
          style={
            styles.footer
          }
        >
          <Text>
            {copy.generated}
          </Text>

          <Text
            render={({
              pageNumber,
              totalPages,
            }) =>
              `${copy.page} ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export async function generateAgentInventoryPdf(
  inventory:
    AgentInventoryData,
  language:
    InventoryPdfLanguage
) {
  const logoBuffer =
    await readFile(
      path.join(
        process.cwd(),
        "public",
        "tetamo-logo-transparent1.png"
      )
    );

  const brandLogoDataUrl =
    `data:image/png;base64,${logoBuffer.toString(
      "base64"
    )}`;

  return renderToBuffer(
    <InventoryDocument
      data={{
        inventory,
        language,
        brandLogoDataUrl,
      }}
    />
  );
}
