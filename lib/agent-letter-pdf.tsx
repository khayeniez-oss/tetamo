import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

import {
  getAgentLetterTemplate,
  getAgentLetterTemplateFields,
  type AgentLetterData,
  type AgentLetterLanguage,
  type AgentLetterSignature,
  type AgentLetterTemplateField,
} from "@/lib/agent-letter";

export type AgentLetterPdfLanguage =
  Extract<
    AgentLetterLanguage,
    "id" | "bilingual"
  >;

type PdfProps = {
  letter:
    AgentLetterData;

  language:
    AgentLetterPdfLanguage;
};

function clean(
  value:
    | string
    | null
    | undefined
) {
  return (
    value?.trim() ||
    ""
  );
}

function displayDate(
  value: string,
  language:
    AgentLetterPdfLanguage
) {
  if (!value) {
    return "-";
  }

  const parsed =
    new Date(
      `${value}T00:00:00`
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
        day:
          "2-digit",

        month:
          "long",

        year:
          "numeric",
      }
    ).format(
      parsed
    );

  if (
    language !==
    "bilingual"
  ) {
    return id;
  }

  const en =
    new Intl.DateTimeFormat(
      "en-AU",
      {
        day:
          "2-digit",

        month:
          "long",

        year:
          "numeric",
      }
    ).format(
      parsed
    );

  return `${id} / ${en}`;
}

function fieldLabel(
  field:
    AgentLetterTemplateField,
  bilingual:
    boolean
) {
  if (
    bilingual &&
    field.labelId !==
      field.labelEn
  ) {
    return (
      `${field.labelId} / ${field.labelEn}`
    );
  }

  return field.labelId;
}

function fieldValue(
  field:
    AgentLetterTemplateField,

  value:
    | string
    | number
    | boolean
    | undefined,

  language:
    AgentLetterPdfLanguage
) {
  if (
    value ===
      undefined ||
    value ===
      null ||
    value ===
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
        (
          item
        ) =>
          item.value ===
          String(
            value
          )
      );

    if (option) {
      if (
        language ===
          "bilingual" &&
        option.labelId !==
          option.labelEn
      ) {
        return (
          `${option.labelId} / ${option.labelEn}`
        );
      }

      return option.labelId;
    }
  }

  if (
    field.type ===
    "date"
  ) {
    return displayDate(
      String(
        value
      ),
      language
    );
  }

  return String(
    value
  );
}

function signatureLabel(
  signature:
    AgentLetterSignature,
  bilingual:
    boolean
) {
  if (bilingual) {
    return (
      signature.label ||
      "-"
    );
  }

  return (
    signature.label
      .split(
        " / "
      )[0] ||
    signature.label ||
    "-"
  );
}

/*
 * Some existing drafts may contain the same greeting
 * at both salutation and the beginning of body.
 *
 * Avoid printing it twice without modifying the saved
 * editable text.
 */
function bodyWithoutDuplicateSalutation(
  body: string,
  salutation: string
) {
  const trimmedBody =
    body.trim();

  const trimmedSalutation =
    salutation.trim();

  if (
    !trimmedBody ||
    !trimmedSalutation
  ) {
    return trimmedBody;
  }

  if (
    trimmedBody
      .toLocaleLowerCase()
      .startsWith(
        trimmedSalutation
          .toLocaleLowerCase()
      )
  ) {
    return trimmedBody
      .slice(
        trimmedSalutation.length
      )
      .replace(
        /^\s+/,
        ""
      );
  }

  return trimmedBody;
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

      fontSize:
        9,

      paddingTop:
        36,

      paddingHorizontal:
        38,

      paddingBottom:
        52,

      lineHeight:
        1.5,
    },

    /*
     * Same formal Agent Tools header family
     * used by Rental Agreement.
     */
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

    agency: {
      fontSize:
        12,

      fontFamily:
        "Helvetica-Bold",

      color:
        "#80652F",

      textTransform:
        "uppercase",

      letterSpacing:
        0.8,
    },

    sender: {
      marginTop:
        3,

      fontSize:
        8,

      fontFamily:
        "Helvetica-Bold",

      color:
        "#1C1C1E",
    },

    contact: {
      marginTop:
        3,

      fontSize:
        7.5,

      color:
        "#77716A",

      lineHeight:
        1.4,
    },

    dateBlock: {
      marginBottom:
        16,

      textAlign:
        "right",

      fontSize:
        8,

      color:
        "#66615A",
    },

    recipientBlock: {
      marginBottom:
        4,
    },

    recipientLabel: {
      fontSize:
        7.5,

      fontFamily:
        "Helvetica-Bold",

      color:
        "#77716A",

      textTransform:
        "uppercase",

      letterSpacing:
        0.4,
    },

    recipientName: {
      marginTop:
        4,

      fontSize:
        9.5,

      fontFamily:
        "Helvetica-Bold",
    },

    recipientLine: {
      marginTop:
        2,

      fontSize:
        8,

      color:
        "#66615A",

      lineHeight:
        1.4,
    },

    /*
     * Subject follows the same restrained metadata
     * treatment as Rental Agreement.
     */
    subjectBlock: {
      marginTop:
        16,

      borderTopWidth:
        0.5,

      borderBottomWidth:
        0.5,

      borderColor:
        "#DDD7CC",

      paddingVertical:
        9,
    },

    subjectLabel: {
      fontSize:
        7.5,

      fontFamily:
        "Helvetica-Bold",

      color:
        "#77716A",

      textTransform:
        "uppercase",

      letterSpacing:
        0.5,
    },

    subject: {
      marginTop:
        4,

      fontSize:
        9.5,

      fontFamily:
        "Helvetica-Bold",

      lineHeight:
        1.35,
    },

    /*
     * Shared gold section heading language.
     */
    sectionTitle: {
      fontSize:
        9.5,

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

    /*
     * Same soft beige property treatment
     * as Rental Agreement.
     */
    propertyBox: {
      marginTop:
        17,

      backgroundColor:
        "#F6F2EA",

      borderRadius:
        6,

      padding:
        12,
    },

    propertyTitle: {
      fontSize:
        10,

      fontFamily:
        "Helvetica-Bold",

      marginBottom:
        5,
    },

    smallLine: {
      marginTop:
        2,

      fontSize:
        8,

      color:
        "#66615A",

      lineHeight:
        1.4,
    },

    /*
     * Key Details now follows Inventory's cleaner
     * row-based information treatment.
     */
    terms: {
      marginTop:
        17,
    },

    termRow: {
      flexDirection:
        "row",

      borderBottomWidth:
        0.5,

      borderBottomColor:
        "#E5E0D8",

      paddingVertical:
        6,
    },

    termLabel: {
      width:
        "38%",

      paddingRight:
        10,

      fontSize:
        7.5,

      fontFamily:
        "Helvetica-Bold",

      color:
        "#68635B",
    },

    termValue: {
      width:
        "62%",

      fontSize:
        8.5,

      lineHeight:
        1.4,
    },

    content: {
      marginTop:
        20,
    },

    salutation: {
      marginBottom:
        10,

      fontSize:
        9,

      fontFamily:
        "Helvetica-Bold",
    },

    paragraph: {
      marginBottom:
        8,

      fontSize:
        9,

      lineHeight:
        1.6,

      textAlign:
        "justify",
    },

    separator: {
      marginVertical:
        12,

      borderTopWidth:
        0.5,

      borderTopColor:
        "#D8C9A9",
    },

    /*
     * Additional wording uses the same restrained
     * beige family instead of a generic grey panel.
     */
    additional: {
      marginTop:
        15,

      backgroundColor:
        "#F6F2EA",

      borderRadius:
        6,

      padding:
        11,
    },

    additionalTitle: {
      marginBottom:
        6,

      fontSize:
        7.5,

      fontFamily:
        "Helvetica-Bold",

      color:
        "#80652F",

      textTransform:
        "uppercase",

      letterSpacing:
        0.4,
    },

    additionalBody: {
      fontSize:
        8.5,

      lineHeight:
        1.55,
    },

    closing: {
      marginTop:
        17,

      fontSize:
        9,

      fontFamily:
        "Helvetica-Bold",
    },

    /*
     * Signature proportions follow the Inventory
     * family: generous signing area, clean line,
     * centered identity.
     */
    signatureSection: {
      marginTop:
        30,
    },

    signatureHeading: {
      marginTop:
        8,

      marginBottom:
        18,

      fontSize:
        10,

      fontFamily:
        "Helvetica-Bold",

      color:
        "#80652F",
    },

    signatures: {
      flexDirection:
        "row",

      gap:
        12,
    },

    signatureBox: {
      flexGrow:
        1,

      flexBasis:
        0,
    },

    signatureLine: {
      height:
        52,

      borderBottomWidth:
        1,

      borderBottomColor:
        "#77716A",

      marginBottom:
        6,
    },

    signatureRole: {
      fontSize:
        7.5,

      textAlign:
        "center",

      fontFamily:
        "Helvetica-Bold",
    },

    signatureName: {
      marginTop:
        3,

      fontSize:
        7.5,

      textAlign:
        "center",

      fontFamily:
        "Helvetica-Bold",

      color:
        "#1C1C1E",
    },

    signaturePosition: {
      marginTop:
        2,

      fontSize:
        7,

      textAlign:
        "center",

      color:
        "#6D675F",
    },

    signatureDate: {
      marginTop:
        7,

      fontSize:
        7,

      textAlign:
        "center",

      color:
        "#77716A",
    },

    footer: {
      position:
        "absolute",

      left:
        38,

      right:
        38,

      bottom:
        20,

      borderTopWidth:
        0.4,

      borderTopColor:
        "#E0DDD7",

      paddingTop:
        5,

      textAlign:
        "right",

      fontSize:
        6.5,

      color:
        "#8A8A8F",
    },
  });

function LetterBody({
  body,
}: {
  body:
    string;
}) {
  const lines =
    body.split(
      "\n"
    );

  return (
    <View>
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
              <View
                key={
                  index
                }
                style={
                  styles.separator
                }
              />
            );
          }

          if (
            !line.trim()
          ) {
            return (
              <View
                key={
                  index
                }
                style={{
                  height:
                    3,
                }}
              />
            );
          }

          return (
            <Text
              key={
                index
              }
              style={
                styles.paragraph
              }
            >
              {line}
            </Text>
          );
        }
      )}
    </View>
  );
}

function SignatureBlock({
  signature,
  bilingual,
}: {
  signature:
    AgentLetterSignature;

  bilingual:
    boolean;
}) {
  return (
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
          styles.signatureRole
        }
      >
        {signatureLabel(
          signature,
          bilingual
        )}
      </Text>

      <Text
        style={
          styles.signatureName
        }
      >
        {clean(
          signature.name
        ) || " "}
      </Text>

      {clean(
        signature.role
      ) ? (
        <Text
          style={
            styles.signaturePosition
          }
        >
          {
            signature.role
          }
        </Text>
      ) : null}

      <Text
        style={
          styles.signatureDate
        }
      >
        {bilingual
          ? "Tanggal / Date: __________________"
          : "Tanggal: __________________"}
      </Text>
    </View>
  );
}

function AgentLetterPdf({
  letter,
  language,
}: PdfProps) {
  const bilingual =
    language ===
    "bilingual";

  const template =
    getAgentLetterTemplate(
      letter.templateKey
    );

  const fields =
    getAgentLetterTemplateFields(
      letter.templateKey
    );

  const populatedFields =
    fields
      .map(
        (
          field
        ) => ({
          field,

          value:
            fieldValue(
              field,
              letter.templateData[
                field.key
              ],
              language
            ),
        })
      )
      .filter(
        (
          item
        ) =>
          Boolean(
            item.value
          )
      );

  const property =
    letter.property;

  const body =
    bodyWithoutDuplicateSalutation(
      letter.body,
      letter.salutation
    );

  const senderContact =
    [
      clean(
        letter.sender
          .address
      ),

      clean(
        letter.sender
          .phone
      ),

      clean(
        letter.sender
          .email
      ),
    ]
      .filter(
        Boolean
      )
      .join(
        " • "
      );

  const propertyLocation =
    property
      ? [
          clean(
            property.address
          ),

          clean(
            property.location
          ),
        ]
          .filter(
            Boolean
          )
          .join(
            " • "
          )
      : "";

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
          <Text
            style={
              styles.agency
            }
          >
            {clean(
              letter.sender
                .agency
            ) ||
              clean(
                letter.sender
                  .name
              ) ||
              "AGENT"}
          </Text>

          {clean(
            letter.sender.name
          ) &&
          clean(
            letter.sender.agency
          ) ? (
            <Text
              style={
                styles.sender
              }
            >
              {
                letter.sender
                  .name
              }
            </Text>
          ) : null}

          {senderContact ? (
            <Text
              style={
                styles.contact
              }
            >
              {
                senderContact
              }
            </Text>
          ) : null}
        </View>

        <View
          style={
            styles.dateBlock
          }
        >
          <Text>
            {[
              clean(
                letter.place
              ),

              displayDate(
                letter.letterDate,
                language
              ),
            ]
              .filter(
                Boolean
              )
              .join(
                ", "
              )}
          </Text>
        </View>

        <View
          style={
            styles.recipientBlock
          }
        >
          <Text
            style={
              styles.recipientLabel
            }
          >
            {bilingual
              ? "Kepada Yth. / To"
              : "Kepada Yth."}
          </Text>

          <Text
            style={
              styles.recipientName
            }
          >
            {clean(
              letter.recipient
                .name
            ) || "-"}
          </Text>

          {clean(
            letter.recipient
              .company
          ) ? (
            <Text
              style={
                styles.recipientLine
              }
            >
              {
                letter.recipient
                  .company
              }
            </Text>
          ) : null}

          {clean(
            letter.recipient
              .address
          ) ? (
            <Text
              style={
                styles.recipientLine
              }
            >
              {
                letter.recipient
                  .address
              }
            </Text>
          ) : null}

          {clean(
            letter.recipient
              .phone
          ) ||
          clean(
            letter.recipient
              .email
          ) ? (
            <Text
              style={
                styles.recipientLine
              }
            >
              {[
                clean(
                  letter.recipient
                    .phone
                ),

                clean(
                  letter.recipient
                    .email
                ),
              ]
                .filter(
                  Boolean
                )
                .join(
                  " • "
                )}
            </Text>
          ) : null}
        </View>

        <View
          style={
            styles.subjectBlock
          }
        >
          <Text
            style={
              styles.subjectLabel
            }
          >
            {bilingual
              ? "Perihal / Subject"
              : "Perihal"}
          </Text>

          <Text
            style={
              styles.subject
            }
          >
            {clean(
              letter.subject
            ) ||
              (
                bilingual
                  ? `${template.labelId} / ${template.labelEn}`
                  : template.labelId
              )}
          </Text>
        </View>

        {property &&
        (
          clean(
            property.title
          ) ||
          clean(
            property.code
          ) ||
          propertyLocation
        ) ? (
          <View
            style={
              styles.propertyBox
            }
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

            <Text
              style={
                styles.propertyTitle
              }
            >
              {clean(
                property.title
              ) ||
                clean(
                  property.code
                )}
            </Text>

            {clean(
              property.code
            ) &&
            clean(
              property.title
            ) ? (
              <Text
                style={
                  styles.smallLine
                }
              >
                {
                  property.code
                }
              </Text>
            ) : null}

            {clean(
              property.propertyType
            ) ? (
              <Text
                style={
                  styles.smallLine
                }
              >
                {bilingual
                  ? "Jenis / Type: "
                  : "Jenis: "}
                {
                  property.propertyType
                }
              </Text>
            ) : null}

            {propertyLocation ? (
              <Text
                style={
                  styles.smallLine
                }
              >
                {
                  propertyLocation
                }
              </Text>
            ) : null}
          </View>
        ) : null}

        {populatedFields.length >
        0 ? (
          <View
            style={
              styles.terms
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              {bilingual
                ? "Ketentuan Utama / Key Details"
                : "Ketentuan Utama"}
            </Text>

            {populatedFields.map(
              (
                item
              ) => (
                <View
                  key={
                    item.field
                      .key
                  }
                  style={
                    styles.termRow
                  }
                >
                  <Text
                    style={
                      styles.termLabel
                    }
                  >
                    {fieldLabel(
                      item.field,
                      bilingual
                    )}
                  </Text>

                  <Text
                    style={
                      styles.termValue
                    }
                  >
                    {
                      item.value
                    }
                  </Text>
                </View>
              )
            )}
          </View>
        ) : null}

        <View
          style={
            styles.content
          }
        >
          {clean(
            letter.salutation
          ) ? (
            <Text
              style={
                styles.salutation
              }
            >
              {
                letter.salutation
              }
            </Text>
          ) : null}

          <LetterBody
            body={
              body
            }
          />

          {clean(
            letter.additionalNotes
          ) ? (
            <View
              style={
                styles.additional
              }
            >
              <Text
                style={
                  styles.additionalTitle
                }
              >
                {bilingual
                  ? "Tambahan / Perubahan Khusus / Additional / Special Wording"
                  : "Tambahan / Perubahan Khusus"}
              </Text>

              <Text
                style={
                  styles.additionalBody
                }
              >
                {
                  letter.additionalNotes
                }
              </Text>
            </View>
          ) : null}

          {clean(
            letter.closing
          ) ? (
            <Text
              style={
                styles.closing
              }
            >
              {
                letter.closing
              }
            </Text>
          ) : null}
        </View>

        <View
          wrap={false}
          style={
            styles.signatureSection
          }
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
            <SignatureBlock
              signature={
                letter.signatures
                  .primary
              }
              bilingual={
                bilingual
              }
            />

            {letter.signatures
              .secondary ? (
              <SignatureBlock
                signature={
                  letter.signatures
                    .secondary
                }
                bilingual={
                  bilingual
                }
              />
            ) : null}
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
    </Document>
  );
}

export async function generateAgentLetterPdf(
  letter:
    AgentLetterData,

  language:
    AgentLetterPdfLanguage
) {
  return renderToBuffer(
    <AgentLetterPdf
      letter={
        letter
      }
      language={
        language
      }
    />
  );
}
