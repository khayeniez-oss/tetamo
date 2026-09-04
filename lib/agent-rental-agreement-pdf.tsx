import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

import {
  calculateRentalAgreedTotal,
  calculateRentalBaseTotal,
  type RentalAgreementData,
} from "@/lib/agent-rental-agreement";

import {
  buildRentalAgreementClauses,
  rentalPartyDisplayName,
  rentalPreviewDate,
  rentalPreviewMoney,
} from "@/lib/agent-rental-agreement-copy";

import type {
  AgentInventoryData,
} from "@/lib/agent-inventory";

import {
  RentalInventoryAppendix,
} from "@/lib/agent-rental-inventory-appendix";

export type RentalAgreementPdfLanguage =
  | "id"
  | "bilingual";

type PdfProps = {
  agreement:
    RentalAgreementData;

  language:
    RentalAgreementPdfLanguage;

  inventory:
    AgentInventoryData | null;
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

function identityLabel(
  party:
    RentalAgreementData["landlord"],
  bilingual: boolean
) {
  if (
    party.identityType ===
    "passport"
  ) {
    return "Passport";
  }

  if (
    party.identityType ===
    "ktp"
  ) {
    return "KTP";
  }

  if (
    party.identityType ===
    "company_registration"
  ) {
    return bilingual
      ? "Registrasi Perusahaan / Company Registration"
      : "Registrasi Perusahaan";
  }

  return bilingual
    ? "Identitas / Identity"
    : "Identitas";
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

      fontSize: 9,

      paddingTop: 36,

      paddingHorizontal:
        38,

      paddingBottom: 52,
    },

    header: {
      borderBottomWidth:
        1,

      borderBottomColor:
        "#CDB683",

      paddingBottom:
        12,

      marginBottom:
        18,
    },

    agencyName: {
      fontSize: 12,

      fontFamily:
        "Helvetica-Bold",

      color:
        "#80652F",

      textTransform:
        "uppercase",

      letterSpacing:
        0.8,
    },

    preparedBy: {
      marginTop: 3,

      fontSize: 7.5,

      color:
        "#77716A",
    },

    title: {
      marginTop: 18,

      textAlign:
        "center",

      fontSize: 18,

      fontFamily:
        "Helvetica-Bold",
    },

    subtitle: {
      marginTop: 4,

      textAlign:
        "center",

      fontSize: 9,

      fontFamily:
        "Helvetica-Bold",

      color:
        "#746D63",

      letterSpacing:
        0.6,
    },

    agreementMeta: {
      marginTop: 16,

      borderTopWidth:
        0.5,

      borderBottomWidth:
        0.5,

      borderColor:
        "#DDD7CC",

      paddingVertical:
        9,
    },

    metaRow: {
      flexDirection:
        "row",

      marginBottom: 3,
    },

    metaLabel: {
      width: 120,

      color:
        "#77716A",

      fontSize: 7.5,
    },

    metaValue: {
      flexGrow: 1,

      fontFamily:
        "Helvetica-Bold",

      fontSize: 8,
    },

    section: {
      marginTop: 17,
    },

    sectionTitle: {
      fontSize: 9.5,

      fontFamily:
        "Helvetica-Bold",

      color:
        "#80652F",

      textTransform:
        "uppercase",

      letterSpacing:
        0.5,

      borderBottomWidth:
        0.5,

      borderBottomColor:
        "#D8C9A9",

      paddingBottom:
        5,

      marginBottom:
        9,
    },

    propertyBox: {
      backgroundColor:
        "#F6F2EA",

      borderRadius: 6,

      padding: 12,
    },

    propertyTitle: {
      fontFamily:
        "Helvetica-Bold",

      fontSize: 10,

      marginBottom: 5,
    },

    smallText: {
      fontSize: 8,

      color:
        "#66615A",

      lineHeight:
        1.4,
    },

    partyGrid: {
      flexDirection:
        "row",

      gap: 10,
    },

    partyCard: {
      flexGrow: 1,

      flexBasis: 0,

      borderWidth: 0.7,

      borderColor:
        "#DED8CC",

      borderRadius: 6,

      padding: 11,

      minHeight: 118,
    },

    partyHeading: {
      fontSize: 8,

      fontFamily:
        "Helvetica-Bold",

      color:
        "#80652F",

      textTransform:
        "uppercase",

      marginBottom: 7,
    },

    partyName: {
      fontSize: 9.5,

      fontFamily:
        "Helvetica-Bold",

      marginBottom: 6,
    },

    partyMeta: {
      fontSize: 7.5,

      color:
        "#5F5A53",

      lineHeight:
        1.5,
    },

    financialBox: {
      borderWidth: 0.7,

      borderColor:
        "#DDD7CC",

      borderRadius: 6,

      overflow:
        "hidden",
    },

    financialRow: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      paddingVertical: 7,

      paddingHorizontal:
        10,

      borderBottomWidth:
        0.5,

      borderBottomColor:
        "#E7E1D8",
    },

    financialLabel: {
      fontSize: 8,

      color:
        "#66615A",
    },

    financialValue: {
      fontSize: 8,

      fontFamily:
        "Helvetica-Bold",
    },

    depositRow: {
      paddingVertical: 8,

      paddingHorizontal:
        10,

      backgroundColor:
        "#FAF7F1",

      borderBottomWidth:
        0.5,

      borderBottomColor:
        "#E7E1D8",
    },

    depositTop: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",
    },

    depositNote: {
      marginTop: 3,

      fontSize: 6.8,

      color:
        "#827C72",
    },

    totalRow: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      paddingVertical: 9,

      paddingHorizontal:
        10,

      backgroundColor:
        "#EEE7D8",
    },

    totalLabel: {
      fontSize: 8.5,

      fontFamily:
        "Helvetica-Bold",

      color:
        "#80652F",
    },

    totalValue: {
      fontSize: 9,

      fontFamily:
        "Helvetica-Bold",
    },

    clause: {
      marginBottom: 14,
    },

    clauseTitle: {
      fontSize: 9,

      fontFamily:
        "Helvetica-Bold",

      marginBottom: 5,
    },

    clauseBody: {
      fontSize: 8.2,

      lineHeight:
        1.55,

      textAlign:
        "justify",

      color:
        "#3E3A36",
    },

    englishClause: {
      marginTop: 7,

      borderLeftWidth:
        1.5,

      borderLeftColor:
        "#CDB683",

      paddingLeft: 8,
    },

    englishTitle: {
      fontSize: 8,

      fontFamily:
        "Helvetica-Bold",

      color:
        "#80652F",

      marginBottom: 4,
    },

    englishBody: {
      fontSize: 7.8,

      lineHeight:
        1.5,

      color:
        "#625D56",

      textAlign:
        "justify",
    },

    signatureSection: {
      marginTop: 24,
    },

    signatureHeading: {
      fontSize: 9.5,

      fontFamily:
        "Helvetica-Bold",

      color:
        "#80652F",

      marginBottom: 18,
    },

    signatures: {
      flexDirection:
        "row",

      gap: 26,
    },

    signatureBox: {
      flexGrow: 1,

      flexBasis: 0,
    },

    signatureSpace: {
      height: 58,

      borderBottomWidth:
        1,

      borderBottomColor:
        "#77716A",

      marginBottom: 6,
    },

    signatureRole: {
      fontSize: 8,

      textAlign:
        "center",

      fontFamily:
        "Helvetica-Bold",
    },

    signatureName: {
      marginTop: 3,

      fontSize: 7.5,

      textAlign:
        "center",

      color:
        "#66615A",
    },

    signatureDate: {
      marginTop: 12,

      fontSize: 7,

      textAlign:
        "center",

      color:
        "#827C72",
    },

    footer: {
      position:
        "absolute",

      left: 38,
      right: 38,
      bottom: 20,

      borderTopWidth:
        0.5,

      borderTopColor:
        "#DDD7CC",

      paddingTop: 6,

      flexDirection:
        "row",

      justifyContent:
        "flex-end",

      fontSize: 6.5,

      color:
        "#918B82",
    },
  });

function PartyCard({
  party,
  role,
  bilingual,
}: {
  party:
    RentalAgreementData["landlord"];

  role: string;

  bilingual: boolean;
}) {
  return (
    <View
      style={
        styles.partyCard
      }
      wrap={false}
    >
      <Text
        style={
          styles.partyHeading
        }
      >
        {role}
      </Text>

      <Text
        style={
          styles.partyName
        }
      >
        {rentalPartyDisplayName(
          party
        )}
      </Text>

      <Text
        style={
          styles.partyMeta
        }
      >
        {bilingual
          ? "Kewarganegaraan / Nationality"
          : "Kewarganegaraan"}
        :{" "}
        {clean(
          party.nationality
        )}
      </Text>

      <Text
        style={
          styles.partyMeta
        }
      >
        {identityLabel(
          party,
          bilingual
        )}
        :{" "}
        {clean(
          party.identityNumber
        )}
      </Text>

      <Text
        style={
          styles.partyMeta
        }
      >
        {bilingual
          ? "Telepon / Phone"
          : "Telepon"}
        :{" "}
        {clean(
          party.phone
        )}
      </Text>

      <Text
        style={
          styles.partyMeta
        }
      >
        Email:{" "}
        {clean(
          party.email
        )}
      </Text>

      <Text
        style={
          styles.partyMeta
        }
      >
        {bilingual
          ? "Alamat / Address"
          : "Alamat"}
        :{" "}
        {clean(
          party.address
        )}
      </Text>
    </View>
  );
}

function RentalAgreementPdf({
  agreement,
  language,
  inventory,
}: PdfProps) {
  const bilingual =
    language ===
    "bilingual";

  const clausesID =
    buildRentalAgreementClauses(
      agreement,
      "id"
    );

  const clausesEN =
    bilingual
      ? buildRentalAgreementClauses(
          agreement,
          "en"
        )
      : [];

  const baseRent =
    calculateRentalBaseTotal(
      agreement
    );

  const agreedTotal =
    calculateRentalAgreedTotal(
      agreement
    );

  return (
    <Document>
      <Page
        size="A4"
        style={
          styles.page
        }
        wrap
      >
        <View
          style={
            styles.header
          }
        >
          <Text
            style={
              styles.agencyName
            }
          >
            {clean(
              agreement.agent
                .agency ||
                agreement.agent
                  .name
            )}
          </Text>

          <Text
            style={
              styles.preparedBy
            }
          >
            {bilingual
              ? "Disiapkan oleh / Prepared by"
              : "Disiapkan oleh"}
            :{" "}
            {clean(
              agreement.agent
                .name
            )}
          </Text>
        </View>

        <Text
          style={
            styles.title
          }
        >
          PERJANJIAN SEWA
          PROPERTI
        </Text>

        {bilingual ? (
          <Text
            style={
              styles.subtitle
            }
          >
            PROPERTY RENTAL
            AGREEMENT
          </Text>
        ) : null}

        <View
          style={
            styles.agreementMeta
          }
          wrap={false}
        >
          <View
            style={
              styles.metaRow
            }
          >
            <Text
              style={
                styles.metaLabel
              }
            >
              {bilingual
                ? "Nomor / Number"
                : "Nomor"}
            </Text>

            <Text
              style={
                styles.metaValue
              }
            >
              {clean(
                agreement.agreementNumber
              )}
            </Text>
          </View>

          <View
            style={
              styles.metaRow
            }
          >
            <Text
              style={
                styles.metaLabel
              }
            >
              {bilingual
                ? "Tanggal / Date"
                : "Tanggal"}
            </Text>

            <Text
              style={
                styles.metaValue
              }
            >
              {rentalPreviewDate(
                agreement.agreementDate,
                "id"
              )}
            </Text>
          </View>

          <View
            style={
              styles.metaRow
            }
          >
            <Text
              style={
                styles.metaLabel
              }
            >
              {bilingual
                ? "Tempat / Place"
                : "Tempat"}
            </Text>

            <Text
              style={
                styles.metaValue
              }
            >
              {clean(
                agreement.placeOfAgreement
              )}
            </Text>
          </View>
        </View>

        <View
          style={
            styles.section
          }
          wrap={false}
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            {bilingual
              ? "Properti / Property"
              : "Properti"}
          </Text>

          <View
            style={
              styles.propertyBox
            }
          >
            <Text
              style={
                styles.propertyTitle
              }
            >
              {clean(
                agreement.property
                  .title
              )}
            </Text>

            <Text
              style={
                styles.smallText
              }
            >
              {bilingual
                ? "Kode / Code"
                : "Kode"}
              :{" "}
              {clean(
                agreement.property
                  .code
              )}
            </Text>

            <Text
              style={
                styles.smallText
              }
            >
              {bilingual
                ? "Alamat / Address"
                : "Alamat"}
              :{" "}
              {clean(
                agreement.property
                  .address ||
                  agreement.property
                    .location
              )}
            </Text>

            <Text
              style={
                styles.smallText
              }
            >
              {bilingual
                ? "Jenis / Type"
                : "Jenis Properti"}
              :{" "}
              {clean(
                agreement.property
                  .propertyType
              )}
            </Text>
          </View>
        </View>

        <View
          style={
            styles.section
          }
          wrap={false}
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            {bilingual
              ? "Para Pihak / Parties"
              : "Para Pihak"}
          </Text>

          <View
            style={
              styles.partyGrid
            }
          >
            <PartyCard
              party={
                agreement.landlord
              }
              role={
                bilingual
                  ? "PEMILIK / LANDLORD"
                  : "PEMILIK"
              }
              bilingual={
                bilingual
              }
            />

            <PartyCard
              party={
                agreement.tenant
              }
              role={
                bilingual
                  ? "PENYEWA / TENANT"
                  : "PENYEWA"
              }
              bilingual={
                bilingual
              }
            />
          </View>
        </View>

        <View
          style={
            styles.section
          }
          wrap={false}
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            {bilingual
              ? "Ringkasan Keuangan / Financial Summary"
              : "Ringkasan Keuangan"}
          </Text>

          <View
            style={
              styles.financialBox
            }
          >
            <View
              style={
                styles.financialRow
              }
            >
              <Text
                style={
                  styles.financialLabel
                }
              >
                {bilingual
                  ? "Tarif Sewa / Rental Rate"
                  : "Tarif Sewa"}
              </Text>

              <Text
                style={
                  styles.financialValue
                }
              >
                {rentalPreviewMoney(
                  agreement.financial
                    .rentAmount,
                  agreement.financial
                    .currency,
                  "id"
                )}
              </Text>
            </View>

            <View
              style={
                styles.financialRow
              }
            >
              <Text
                style={
                  styles.financialLabel
                }
              >
                {bilingual
                  ? "Total Dasar Sewa / Base Rent"
                  : "Total Dasar Sewa"}
              </Text>

              <Text
                style={
                  styles.financialValue
                }
              >
                {rentalPreviewMoney(
                  baseRent,
                  agreement.financial
                    .currency,
                  "id"
                )}
              </Text>
            </View>

            <View
              style={
                styles.financialRow
              }
            >
              <Text
                style={
                  styles.financialLabel
                }
              >
                {bilingual
                  ? "Pajak / Biaya Tambahan / Tax & Additional Charges"
                  : "Pajak / Biaya Tambahan"}
              </Text>

              <Text
                style={
                  styles.financialValue
                }
              >
                {rentalPreviewMoney(
                  agreement.financial
                    .taxAdditionalCharges ||
                    0,
                  agreement.financial
                    .currency,
                  "id"
                )}
              </Text>
            </View>

            <View
              style={
                styles.depositRow
              }
            >
              <View
                style={
                  styles.depositTop
                }
              >
                <Text
                  style={
                    styles.financialLabel
                  }
                >
                  {bilingual
                    ? "Deposit Jaminan / Security Deposit"
                    : "Deposit Jaminan"}
                </Text>

                <Text
                  style={
                    styles.financialValue
                  }
                >
                  {rentalPreviewMoney(
                    agreement.financial
                      .securityDeposit,
                    agreement.financial
                      .currency,
                    "id"
                  )}
                </Text>
              </View>

              <Text
                style={
                  styles.depositNote
                }
              >
                {bilingual
                  ? "Tidak termasuk dalam total nilai sewa / Not included in the total rental value."
                  : "Tidak termasuk dalam total nilai sewa."}
              </Text>
            </View>

            <View
              style={
                styles.totalRow
              }
            >
              <Text
                style={
                  styles.totalLabel
                }
              >
                {bilingual
                  ? "TOTAL NILAI SEWA / TOTAL RENTAL VALUE"
                  : "TOTAL NILAI SEWA"}
              </Text>

              <Text
                style={
                  styles.totalValue
                }
              >
                {rentalPreviewMoney(
                  agreedTotal,
                  agreement.financial
                    .currency,
                  "id"
                )}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={
            styles.section
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            {bilingual
              ? "Ketentuan Perjanjian / Agreement Terms"
              : "Ketentuan Perjanjian"}
          </Text>

          {clausesID.map(
            (
              clause,
              index
            ) => (
              <View
                key={
                  clause.key
                }
                style={
                  styles.clause
                }
              >
                <Text
                  style={
                    styles.clauseTitle
                  }
                >
                  {
                    clause.title
                  }
                </Text>

                <Text
                  style={
                    styles.clauseBody
                  }
                >
                  {
                    clause.body
                  }
                </Text>

                {bilingual &&
                clausesEN[
                  index
                ] ? (
                  <View
                    style={
                      styles.englishClause
                    }
                  >
                    <Text
                      style={
                        styles.englishTitle
                      }
                    >
                      {
                        clausesEN[
                          index
                        ].title
                      }
                    </Text>

                    <Text
                      style={
                        styles.englishBody
                      }
                    >
                      {
                        clausesEN[
                          index
                        ].body
                      }
                    </Text>
                  </View>
                ) : null}
              </View>
            )
          )}
        </View>

        <View
          style={
            styles.signatureSection
          }
          wrap={false}
        >
          <Text
            style={
              styles.signatureHeading
            }
          >
            {bilingual
              ? "Tanda Tangan / Signatures"
              : "Tanda Tangan"}
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
                {rentalPartyDisplayName(
                  agreement.landlord
                )}
              </Text>

              <Text
                style={
                  styles.signatureDate
                }
              >
                {bilingual
                  ? "Tanggal / Date: ____________"
                  : "Tanggal: ____________"}
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
                {rentalPartyDisplayName(
                  agreement.tenant
                )}
              </Text>

              <Text
                style={
                  styles.signatureDate
                }
              >
                {bilingual
                  ? "Tanggal / Date: ____________"
                  : "Tanggal: ____________"}
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

      {inventory ? (
        <RentalInventoryAppendix
          inventory={
            inventory
          }
          agreement={
            agreement
          }
          language={
            language
          }
        />
      ) : null}
    </Document>
  );
}

export async function generateAgentRentalAgreementPdf(
  agreement:
    RentalAgreementData,
  language:
    RentalAgreementPdfLanguage,
  inventory:
    AgentInventoryData | null = null
) {
  return renderToBuffer(
    <RentalAgreementPdf
      agreement={
        agreement
      }
      language={
        language
      }
      inventory={
        inventory
      }
    />
  );
}
