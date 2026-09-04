"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Bath,
  BedDouble,
  Building2,
  FileText,
  Home,
  Languages,
  Loader2,
  MapPin,
  RefreshCw,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  supabase,
} from "@/lib/supabase";

const PROPERTY_PAGE_SIZE = 8;

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

  bedrooms:
    | number
    | null;

  bathrooms:
    | number
    | null;
};

type RentalAgreementLanguage =
  | "id"
  | "bilingual";

type RentalAgreementDocument = {
  id: string;

  user_id: string;

  property_id:
    | string
    | null;

  document_type:
    "rental_agreement";

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

  created_at: string;
  updated_at: string;
};

function propertyTitle(
  property: PropertyRow
) {
  return (
    property.title_id ||
    property.title ||
    property.kode ||
    "Properti"
  );
}

function propertyLocation(
  property: PropertyRow
) {
  const location =
    [
      property.city,
      property.province,
    ]
      .filter(Boolean)
      .join(", ");

  return (
    location ||
    property.address ||
    "-"
  );
}

function statusLabel(
  status:
    RentalAgreementDocument["status"]
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

function formatUpdatedAt(
  value: string
) {
  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(parsed);
}

export default function RentalAgreementPage() {
  const router =
    useRouter();

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
      RentalAgreementDocument[]
    >([]);

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
      RentalAgreementLanguage
    >("id");

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
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  const propertyPageCount =
    Math.max(
      1,
      Math.ceil(
        propertyCount /
          PROPERTY_PAGE_SIZE
      )
    );

  const propertyRangeFrom =
    (propertyPage - 1) *
    PROPERTY_PAGE_SIZE;

  const propertyRangeTo =
    propertyRangeFrom +
    PROPERTY_PAGE_SIZE -
    1;

  const selectedProperty =
    useMemo(
      () =>
        properties.find(
          (property) =>
            property.id ===
            selectedPropertyId
        ) || null,
      [
        properties,
        selectedPropertyId,
      ]
    );

  const visiblePages =
    useMemo(
      () =>
        Array.from(
          {
            length:
              propertyPageCount,
          },
          (_, index) =>
            index + 1
        ).filter(
          (page) =>
            page === 1 ||
            page ===
              propertyPageCount ||
            Math.abs(
              page -
                propertyPage
            ) <= 1
        ),
      [
        propertyPage,
        propertyPageCount,
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
                    property_type,
                    bedrooms,
                    bathrooms
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
                  "id",
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
                "/api/agent/documents?type=rental_agreement",
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
              "Rental Agreement drafts tidak dapat dimuat."
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
            ) as RentalAgreementDocument[]
          );

          setSelectedPropertyId(
            (current) => {
              if (
                propertyRows.some(
                  (
                    property
                  ) =>
                    property.id ===
                    current
                )
              ) {
                return current;
              }

              return (
                propertyRows[0]
                  ?.id ||
                ""
              );
            }
          );
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

  async function createRentalAgreement() {
    if (
      !selectedPropertyId
    ) {
      setErrorMessage(
        "Pilih properti terlebih dahulu."
      );
      return;
    }

    setCreating(true);
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
          "Session login tidak ditemukan. Silakan login kembali."
        );
      }

      const response =
        await fetch(
          "/api/agent/documents/rental-agreement/from-property",
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
                propertyId:
                  selectedPropertyId,

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

      if (!response.ok) {
        if (
          body?.code ===
          "AGENT_DOCUMENT_UPGRADE_REQUIRED"
        ) {
          throw new Error(
            "Rental Agreement tersedia untuk membership Gold dan Agent Pro."
          );
        }

        if (
          body?.code ===
          "AGENT_DOCUMENT_MEMBERSHIP_REQUIRED"
        ) {
          throw new Error(
            "Membership Gold atau Agent Pro aktif diperlukan untuk membuat Rental Agreement."
          );
        }

        throw new Error(
          body?.error ||
          "Rental Agreement tidak dapat dibuat."
        );
      }

      const created =
        body.document as RentalAgreementDocument;

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
        "Rental Agreement draft berhasil dibuat."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Rental Agreement tidak dapat dibuat."
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
            Loading Rental Agreement...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <section className="rounded-[2rem] border border-[#E5E0D7] bg-[#F3EDE2] px-5 py-6 shadow-sm sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9E762F]">
              Agent Tools
            </p>

            <h1 className="mt-2 text-2xl font-black text-[#1C1C1E] sm:text-3xl">
              Rental Agreement
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Buat draft perjanjian sewa properti dari listing Tetamo, lengkapi para pihak dan ketentuan sewa, lalu siapkan dokumen untuk review, PDF, dan penandatanganan.
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
            className="inline-flex items-center gap-2 rounded-xl border border-[#D7C49B] bg-white px-4 py-2.5 text-sm font-bold text-[#80652F] transition hover:bg-[#FAF7F1] disabled:opacity-50"
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
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[#9E762F]">
              Create New Agreement
            </p>

            <h2 className="mt-1 text-xl font-black text-[#1C1C1E]">
              Select Property
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Pilih listing yang akan digunakan sebagai objek sewa.
            </p>
          </div>

          {properties.length ===
          0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-7 text-center">
              <Home className="mx-auto h-8 w-8 text-gray-400" />

              <p className="mt-3 text-sm font-bold text-gray-700">
                Belum ada properti yang dapat dipilih.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-3">
              {properties.map(
                (property) => {
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
                      className={`rounded-2xl border p-4 text-left transition ${
                        selected
                          ? "border-[#B58A3C] bg-[#FBF7EE] ring-1 ring-[#B58A3C]"
                          : "border-gray-200 bg-white hover:border-[#D6C49E]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            selected
                              ? "border-[#B58A3C] bg-[#B58A3C]"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          {selected ? (
                            <div className="h-2 w-2 rounded-full bg-white" />
                          ) : null}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {property.kode ? (
                              <span className="rounded-full bg-[#F3EDE2] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-[#80652F]">
                                {property.kode}
                              </span>
                            ) : null}

                            {property.property_type ? (
                              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                                {
                                  property.property_type
                                }
                              </span>
                            ) : null}
                          </div>

                          <p className="mt-2 line-clamp-2 text-sm font-bold text-[#1C1C1E]">
                            {propertyTitle(
                              property
                            )}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />

                              {propertyLocation(
                                property
                              )}
                            </span>

                            <span className="inline-flex items-center gap-1">
                              <BedDouble className="h-3.5 w-3.5" />

                              {property.bedrooms ??
                                0}
                            </span>

                            <span className="inline-flex items-center gap-1">
                              <Bath className="h-3.5 w-3.5" />

                              {property.bathrooms ??
                                0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          )}

          {propertyCount >
          PROPERTY_PAGE_SIZE ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-500">
                Showing{" "}
                {propertyRangeFrom +
                  1}
                -
                {Math.min(
                  propertyRangeTo +
                    1,
                  propertyCount
                )}{" "}
                of{" "}
                {propertyCount}{" "}
                properties
              </p>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  disabled={
                    propertyPage <=
                    1
                  }
                  onClick={() =>
                    setPropertyPage(
                      (
                        current
                      ) =>
                        Math.max(
                          1,
                          current -
                            1
                        )
                    )
                  }
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                {visiblePages.map(
                  (
                    page,
                    index
                  ) => {
                    const previous =
                      visiblePages[
                        index -
                          1
                      ];

                    return (
                      <div
                        key={page}
                        className="flex items-center gap-1.5"
                      >
                        {previous &&
                        page -
                          previous >
                          1 ? (
                          <span className="px-1 text-xs text-gray-400">
                            …
                          </span>
                        ) : null}

                        <button
                          type="button"
                          onClick={() =>
                            setPropertyPage(
                              page
                            )
                          }
                          className={`h-8 min-w-8 rounded-lg px-2 text-xs font-bold transition ${
                            propertyPage ===
                            page
                              ? "bg-[#17171A] text-white"
                              : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </button>
                      </div>
                    );
                  }
                )}

                <button
                  type="button"
                  disabled={
                    propertyPage >=
                    propertyPageCount
                  }
                  onClick={() =>
                    setPropertyPage(
                      (
                        current
                      ) =>
                        Math.min(
                          propertyPageCount,
                          current +
                            1
                        )
                    )
                  }
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-6 border-t border-gray-100 pt-5">
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-[#B58A3C]" />

              <p className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">
                Document Language
              </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
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
                    className={`rounded-full px-4 py-2 text-xs font-bold transition ${
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

            <p className="mt-3 text-xs leading-5 text-gray-500">
              Untuk kontrak bilingual, dokumen akan menampilkan Bahasa Indonesia dan English dalam satu perjanjian.
            </p>
          </div>

          {selectedProperty ? (
            <div className="mt-5 rounded-2xl bg-[#F7F3EB] p-4">
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-[#A47C2D]" />

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#9E762F]">
                    Selected Property
                  </p>

                  <p className="mt-1 text-sm font-bold text-[#1C1C1E]">
                    {propertyTitle(
                      selectedProperty
                    )}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {propertyLocation(
                      selectedProperty
                    )}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            disabled={
              creating ||
              !selectedPropertyId
            }
            onClick={
              createRentalAgreement
            }
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#17171A] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}

            {creating
              ? "Creating Rental Agreement..."
              : "Create Rental Agreement"}
          </button>
        </section>

        <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[#9E762F]">
              My Documents
            </p>

            <h2 className="mt-1 text-xl font-black text-[#1C1C1E]">
              Rental Agreement Drafts
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Lanjutkan atau review perjanjian sewa yang sudah dibuat.
            </p>
          </div>

          {documents.length ===
          0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <FileText className="mx-auto h-8 w-8 text-gray-400" />

              <p className="mt-3 text-sm font-bold text-gray-700">
                Belum ada Rental Agreement.
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Pilih properti lalu buat draft pertama.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {documents.map(
                (document) => (
                  <div
                    key={
                      document.id
                    }
                    className="rounded-2xl border border-gray-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#1C1C1E]">
                          {
                            document.title
                          }
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Updated{" "}
                          {formatUpdatedAt(
                            document.updated_at
                          )}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-[#F3EDE2] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#80652F]">
                        {statusLabel(
                          document.status
                        )}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400">
                        {document.language ===
                        "bilingual"
                          ? "ID + EN"
                          : "Bahasa Indonesia"}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/agentdashboard/rental-agreement/${document.id}`
                          )
                        }
                        className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-[#17171A] transition hover:bg-gray-50"
                      >
                        Open Agreement
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs leading-5 text-amber-800">
          Tetamo Agent Tools membantu menyiapkan draft dokumen kerja. Isi perjanjian tetap harus diperiksa oleh para pihak dan, bila diperlukan, penasihat hukum atau notaris sebelum ditandatangani.
        </p>
      </div>
    </div>
  );
}
