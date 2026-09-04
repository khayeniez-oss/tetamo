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
  CheckCircle2,
  ClipboardList,
  Home,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type PropertyRow = {
  id: string;
  kode: string | null;

  title: string | null;
  title_id: string | null;

  city: string | null;
  province: string | null;
  address: string | null;

  property_type: string | null;

  bedrooms: number | null;
  bathrooms: number | null;

  facilities: Record<string, unknown> | null;
};

const PROPERTY_PAGE_SIZE = 8;

type InventoryDocument = {
  id: string;

  property_id: string | null;

  document_type: "inventory";

  title: string;

  language:
    | "id"
    | "en"
    | "bilingual";

  status:
    | "draft"
    | "ready"
    | "completed";

  updated_at: string;
  created_at: string;

  data: Record<string, unknown>;
};

function cleanText(
  value: unknown
) {
  return String(value || "").trim();
}

function propertyTitle(
  property: PropertyRow
) {
  return (
    cleanText(property.title_id) ||
    cleanText(property.title) ||
    cleanText(property.kode) ||
    "Properti Tetamo"
  );
}

function propertyLocation(
  property: PropertyRow
) {
  return [
    cleanText(property.city),
    cleanText(property.province),
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
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

function statusLabel(
  status: InventoryDocument["status"]
) {
  if (status === "completed") {
    return "Completed";
  }

  if (status === "ready") {
    return "Ready";
  }

  return "Draft";
}

export default function AgentInventoryPage() {
  const router =
    useRouter();

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    creating,
    setCreating,
  ] =
    useState(false);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    properties,
    setProperties,
  ] =
    useState<PropertyRow[]>(
      []
    );

  const [
    documents,
    setDocuments,
  ] =
    useState<
      InventoryDocument[]
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
    selectedPropertyId,
    setSelectedPropertyId,
  ] =
    useState("");

  const [
    language,
    setLanguage,
  ] =
    useState<
      "id" |
      "en" |
      "bilingual"
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

  const loadPageData =
    useCallback(
      async (
        showRefresh = false
      ) => {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

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
              "Session login tidak ditemukan. Silakan login kembali."
            );
          }

          const userId =
            session.user.id;

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
                    bathrooms,
                    facilities
                  `,
                  {
                    count: "exact",
                  }
                )
                .eq(
                  "user_id",
                  userId
                )
                .order(
                  "id",
                  {
                    ascending: true,
                  }
                )
                .range(
                  propertyRangeFrom,
                  propertyRangeTo
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

          if (
            propertyResult.error
          ) {
            throw new Error(
              `Property load failed: ${propertyResult.error.message}`
            );
          }

          if (
            !documentResponse.ok
          ) {
            const body =
              await documentResponse
                .json()
                .catch(
                  () => ({})
                );

            throw new Error(
              `Document API failed (${documentResponse.status}): ${
                body?.error ||
                "Inventory documents tidak dapat dimuat."
              }`
            );
          }

          const documentBody =
            await documentResponse
              .json();

          const propertyRows =
            (
              propertyResult.data ||
              []
            ) as PropertyRow[];

          const inventoryDocuments =
            (
              documentBody.documents ||
              []
            ) as InventoryDocument[];

          setProperties(
            propertyRows
          );

          setPropertyCount(
            propertyResult.count ||
            0
          );

          setDocuments(
            inventoryDocuments
          );

          setSelectedPropertyId(
            (current) => {
              if (
                current &&
                propertyRows.some(
                  (property) =>
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
              : "Inventory tidak dapat dimuat."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
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

  async function createInventory() {
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
        data: sessionData,
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
          "/api/agent/documents/inventory/from-property",
          {
            method: "POST",

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
            "Inventory & Agent Documents tersedia untuk membership Gold dan Agent Pro."
          );
        }

        if (
          body?.code ===
          "AGENT_DOCUMENT_MEMBERSHIP_REQUIRED"
        ) {
          throw new Error(
            "Membership Gold atau Agent Pro aktif diperlukan untuk membuat Inventory."
          );
        }

        throw new Error(
          body?.error ||
          "Inventory tidak dapat dibuat."
        );
      }

      const created =
        body.document as InventoryDocument;

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
        `Inventory berhasil dibuat: ${created.title}`
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Inventory tidak dapat dibuat."
      );
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#B58A3C]" />

          <p className="mt-3 text-sm font-medium text-gray-500">
            Loading Inventory Tools...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <section className="overflow-hidden rounded-[2rem] border border-[#E5E0D7] bg-[#F3EDE2] shadow-sm">
        <div className="grid gap-6 px-6 py-7 lg:grid-cols-[1fr_auto] lg:px-8 lg:py-9">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#9E762F]">
              <ShieldCheck className="h-4 w-4" />
              Agent Tools
            </div>

            <h1 className="mt-3 text-2xl font-black tracking-tight text-[#1C1C1E] sm:text-3xl">
              Property Inventory & Handover
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 sm:text-base">
              Buat inventory properti secara profesional dari listing Tetamo.
              Kamar, area, dan checklist dasar akan disiapkan otomatis dari
              informasi properti Anda.
            </p>
          </div>

          <button
            type="button"
            disabled={refreshing}
            onClick={() =>
              loadPageData(true)
            }
            className="inline-flex h-fit items-center justify-center gap-2 rounded-xl border border-[#D8C7A7] bg-white px-4 py-2.5 text-sm font-semibold text-[#6F572B] transition hover:bg-[#FBF8F2] disabled:opacity-50"
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
          {successMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F3EDE2] text-[#9E762F]">
              <Plus className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-[#1C1C1E]">
                Create New Inventory
              </h2>

              <p className="mt-1 text-sm leading-5 text-gray-500">
                Pilih salah satu listing Anda untuk membuat checklist inventory otomatis.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <label className="text-xs font-bold uppercase tracking-[0.15em] text-gray-400">
              Select Property
            </label>

            {properties.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                <Home className="mx-auto h-7 w-7 text-gray-400" />

                <p className="mt-3 text-sm font-semibold text-gray-700">
                  Belum ada properti yang dapat dipilih.
                </p>
              </div>
            ) : (
              <div className="mt-3 grid gap-3">
                {properties.map(
                  (property) => {
                    const selected =
                      selectedPropertyId ===
                      property.id;

                    return (
                      <button
                        key={property.id}
                        type="button"
                        onClick={() => {
                          setSelectedPropertyId(
                            property.id
                          );
                          setErrorMessage("");
                          setSuccessMessage("");
                        }}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          selected
                            ? "border-[#B58A3C] bg-[#FBF7EF] shadow-sm"
                            : "border-gray-200 bg-white hover:border-[#D8C7A7] hover:bg-[#FCFAF6]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {property.kode ? (
                                <span className="rounded-full bg-[#17171A] px-2.5 py-1 text-[10px] font-bold text-white">
                                  {property.kode}
                                </span>
                              ) : null}

                              {property.property_type ? (
                                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-600">
                                  {property.property_type}
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-2 font-bold text-[#1C1C1E]">
                              {propertyTitle(
                                property
                              )}
                            </p>

                            {propertyLocation(
                              property
                            ) ? (
                              <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                                <MapPin className="h-3.5 w-3.5" />

                                {propertyLocation(
                                  property
                                )}
                              </p>
                            ) : null}

                            <p className="mt-2 text-xs text-gray-500">
                              {property.bedrooms ??
                                0}{" "}
                              Bedroom
                              {" • "}
                              {property.bathrooms ??
                                0}{" "}
                              Bathroom
                            </p>
                          </div>

                          <div
                            className={`mt-1 h-5 w-5 shrink-0 rounded-full border-2 ${
                              selected
                                ? "border-[#B58A3C] bg-[#B58A3C] shadow-[inset_0_0_0_4px_white]"
                                : "border-gray-300 bg-white"
                            }`}
                          />
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            )}

            {propertyCount >
            PROPERTY_PAGE_SIZE ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                <p className="text-xs font-medium text-gray-500">
                  Showing{" "}
                  {propertyRangeFrom + 1}-
                  {Math.min(
                    propertyRangeTo + 1,
                    propertyCount
                  )}{" "}
                  of {propertyCount} properties
                </p>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={
                      propertyPage <= 1
                    }
                    onClick={() =>
                      setPropertyPage(
                        (current) =>
                          Math.max(
                            1,
                            current - 1
                          )
                      )
                    }
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  {Array.from(
                    {
                      length:
                        propertyPageCount,
                    },
                    (_, index) =>
                      index + 1
                  )
                    .filter(
                      (page) =>
                        page === 1 ||
                        page ===
                          propertyPageCount ||
                        Math.abs(
                          page -
                            propertyPage
                        ) <= 1
                    )
                    .map(
                      (
                        page,
                        index,
                        visiblePages
                      ) => {
                        const previous =
                          visiblePages[
                            index - 1
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
                        (current) =>
                          Math.min(
                            propertyPageCount,
                            current + 1
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
          </div>

          {selectedProperty ? (
            <div className="mt-5 rounded-2xl bg-[#F8F7F4] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                Inventory Language
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ["id", "Bahasa Indonesia"],
                  ["en", "English"],
                  ["bilingual", "Bilingual"],
                ].map(
                  ([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setLanguage(
                          value as
                            | "id"
                            | "en"
                            | "bilingual"
                        )
                      }
                      className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                        language ===
                        value
                          ? "bg-[#17171A] text-white"
                          : "border border-gray-200 bg-white text-gray-600"
                      }`}
                    >
                      {label}
                    </button>
                  )
                )}
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
              createInventory
            }
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B58A3C] px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#9E762F] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Inventory...
              </>
            ) : (
              <>
                <ClipboardList className="h-4 w-4" />
                Create Inventory
              </>
            )}
          </button>
        </section>

        <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-gray-400">
              My Documents
            </p>

            <h2 className="mt-1 text-lg font-bold text-[#1C1C1E]">
              Inventory Drafts
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Inventory yang dibuat akan tersimpan otomatis di akun agen Anda.
            </p>
          </div>

          {documents.length ===
          0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">
              <ClipboardList className="mx-auto h-8 w-8 text-gray-400" />

              <p className="mt-3 text-sm font-semibold text-gray-700">
                Belum ada Inventory.
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                Pilih properti di sebelah kiri lalu buat Inventory pertama Anda.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {documents.map(
                (document) => (
                  <div
                    key={document.id}
                    className="rounded-2xl border border-gray-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#1C1C1E]">
                          {document.title}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Updated{" "}
                          {formatDate(
                            document.updated_at
                          )}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          document.status ===
                          "completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : document.status ===
                                "ready"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {statusLabel(
                          document.status
                        )}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/agentdashboard/inventory/${document.id}`
                        )
                      }
                      className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold text-[#17171A] transition hover:bg-gray-50"
                    >
                      Open Inventory
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
