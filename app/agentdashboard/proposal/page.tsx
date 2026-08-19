"use client";

import {
  Building2,
  Check,
  ExternalLink,
  Eye,
  FileDown,
  FileText,
  Loader2,
  MapPin,
  Printer,
  Search,
  Share2,
  UserRound,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import QRCode from "qrcode";

import { supabase } from "@/lib/supabase";
import type { AgentProposalData } from "@/lib/agent-proposal";
import { useAgentProfile } from "../layout";

type ProposalMode =
  | "single"
  | "portfolio";

type ProposalLanguage =
  | "id"
  | "en";

type PropertyImageRow = {
  image_url: string | null;
  sort_order: number | null;
  is_cover: boolean | null;
};

type ListingRow = {
  id: string;
  kode: string | null;
  slug: string | null;
  title: string | null;

  price: number | null;
  sale_price: number | null;
  rent_price: number | null;

  city: string | null;
  area: string | null;
  province: string | null;

  property_type: string | null;
  listing_type: string | null;
  rental_type: string | null;

  source: string | null;
  status: string | null;
  transaction_status: string | null;
  is_paused: boolean | null;
  listing_expires_at: string | null;

  property_images:
    | PropertyImageRow[]
    | null;
};

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

function cleanText(
  value: unknown
) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatIdr(
  value: unknown
) {
  const amount =
    Number(value || 0);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return "-";
  }

  return new Intl.NumberFormat(
    "id-ID",
    {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }
  ).format(amount);
}

function listingPrice(
  listing: ListingRow
) {
  const type =
    cleanText(
      listing.listing_type
    ).toLowerCase();

  if (
    type ===
      "dijual_disewa" &&
    Number(
      listing.sale_price || 0
    ) > 0 &&
    Number(
      listing.rent_price || 0
    ) > 0
  ) {
    return `${formatIdr(
      listing.sale_price
    )} / ${formatIdr(
      listing.rent_price
    )}`;
  }

  if (
    type === "disewa"
  ) {
    return formatIdr(
      listing.rent_price ||
        listing.price
    );
  }

  return formatIdr(
    listing.sale_price ||
      listing.price ||
      listing.rent_price
  );
}

function listingLocation(
  listing: ListingRow
) {
  const values = [
    listing.area,
    listing.city,
    listing.province,
  ]
    .map(cleanText)
    .filter(Boolean);

  return Array.from(
    new Set(values)
  ).join(", ");
}

function listingCover(
  listing: ListingRow
) {
  const images = [
    ...(listing.property_images ||
      []),
  ]
    .filter((item) =>
      Boolean(
        cleanText(
          item.image_url
        )
      )
    )
    .sort((a, b) => {
      if (
        Boolean(a.is_cover) !==
        Boolean(b.is_cover)
      ) {
        return a.is_cover
          ? -1
          : 1;
      }

      return (
        Number(
          a.sort_order || 0
        ) -
        Number(
          b.sort_order || 0
        )
      );
    });

  return cleanText(
    images[0]?.image_url
  );
}

function isProposalEligible(
  listing: ListingRow
) {
  if (
    cleanText(
      listing.status
    ).toLowerCase() ===
    "rejected"
  ) {
    return false;
  }

  const transaction =
    cleanText(
      listing.transaction_status
    ).toLowerCase();

  if (
    transaction === "sold" ||
    transaction === "rented"
  ) {
    return false;
  }

  if (
    listing.is_paused
  ) {
    return false;
  }

  if (
    listing.listing_expires_at
  ) {
    const expiresAt =
      new Date(
        listing.listing_expires_at
      );

    if (
      !Number.isNaN(
        expiresAt.getTime()
      ) &&
      expiresAt.getTime() <
        Date.now()
    ) {
      return false;
    }
  }

  return true;
}

function extractErrorMessage(
  value: unknown
) {
  if (
    value &&
    typeof value === "object" &&
    "error" in value
  ) {
    return cleanText(
      (
        value as {
          error?: unknown;
        }
      ).error
    );
  }

  return "";
}

function getProposalPreviewCopy(
  language: ProposalLanguage
) {
  if (language === "en") {
    return {
      proposalTitle: "Property Proposal",
      portfolioTitle: "Property Portfolio",
      preparedFor: "Prepared for",
      presentedBy: "Presented by",
      property: "Property",
      properties: "Properties",
      propertyType: "Property Type",
      listingType: "Listing Type",
      bedrooms: "Bedrooms",
      bathrooms: "Bathrooms",
      buildingSize: "Building Size",
      landSize: "Land Size",
      floors: "Floors",
      parking: "Parking",
      description: "Property Description",
      furnishing: "Furnishing",
      certificate: "Certificate",
      roadAccess: "Road Access",
      ownership: "Ownership",
      landType: "Land Type",
      zoning: "Zoning",
      water: "Water",
      facilities: "Facilities",
      nearby: "Nearby",
      gallery: "Property Gallery",
      photoCount: "photos included in this proposal",
      viewListing: "View Live Listing",
      scanQr: "Scan to view the live listing on Tetamo",
      contactAgent: "Contact Agent",
      backToEdit: "Back to Edit",
      approve: "Approve & Generate PDF",
    };
  }

  return {
    proposalTitle: "Proposal Properti",
    portfolioTitle: "Portfolio Properti",
    preparedFor: "Disiapkan untuk",
    presentedBy: "Dipresentasikan oleh",
    property: "Properti",
    properties: "Properti",
    propertyType: "Jenis Properti",
    listingType: "Tipe Listing",
    bedrooms: "Kamar Tidur",
    bathrooms: "Kamar Mandi",
    buildingSize: "Luas Bangunan",
    landSize: "Luas Tanah",
    floors: "Jumlah Lantai",
    parking: "Parkir",
    description: "Deskripsi Properti",
    furnishing: "Furnishing",
    certificate: "Sertifikat",
    roadAccess: "Akses Jalan",
    ownership: "Kepemilikan",
    landType: "Jenis Tanah",
    zoning: "Zonasi",
    water: "Sumber Air",
    facilities: "Fasilitas",
    nearby: "Lokasi Sekitar",
    gallery: "Galeri Properti",
    photoCount: "foto termasuk dalam proposal ini",
    viewListing: "Lihat Listing di Tetamo",
    scanQr: "Scan untuk melihat listing aktif di Tetamo",
    contactAgent: "Hubungi Agen",
    backToEdit: "Kembali Edit",
    approve: "Setujui & Buat PDF",
  };
}

function formatProposalPreviewValue(
  value: unknown,
  language: ProposalLanguage
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (
    typeof value === "number"
  ) {
    return value > 0
      ? String(value)
      : "";
  }

  const raw =
    cleanText(value);

  if (
    !raw ||
    raw === "-" ||
    raw === "0"
  ) {
    return "";
  }

  const key =
    raw
      .toLowerCase()
      .replace(/\s+/g, "_");

  const english:
    Record<string, string> = {
    rumah: "House",
    villa: "Villa",
    apartemen: "Apartment",
    apartment: "Apartment",
    tanah: "Land",
    dijual: "For Sale",
    disewa: "For Rent",
    dijual_disewa:
      "For Sale / Rent",
    tanah_hunian:
      "Residential Land",
    permukiman:
      "Residential",
    fully_furnished:
      "Fully Furnished",
    semi_furnished:
      "Semi Furnished",
    unfurnished:
      "Unfurnished",
  };

  const indonesian:
    Record<string, string> = {
    rumah: "Rumah",
    villa: "Villa",
    apartemen: "Apartemen",
    apartment: "Apartemen",
    tanah: "Tanah",
    dijual: "Dijual",
    disewa: "Disewa",
    dijual_disewa:
      "Dijual / Disewa",
    tanah_hunian:
      "Tanah Hunian",
    permukiman:
      "Permukiman",
    fully_furnished:
      "Fully Furnished",
    semi_furnished:
      "Semi Furnished",
    unfurnished:
      "Tanpa Furnitur",
  };

  const mapped =
    language === "en"
      ? english[key]
      : indonesian[key];

  if (mapped) {
    return mapped;
  }

  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function hasProposalPreviewValue(
  value: unknown
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return false;
  }

  if (
    typeof value === "number"
  ) {
    return value > 0;
  }

  const raw =
    cleanText(value);

  return (
    Boolean(raw) &&
    raw !== "-" &&
    raw !== "0"
  );
}

export default function AgentProposalPage() {
  const {
    agent,
    userId,
    loadingProfile,
    hasActiveMembership,
  } = useAgentProfile();

  const [
    mode,
    setMode,
  ] =
    useState<ProposalMode>(
      "single"
    );

  const [
    language,
    setLanguage,
  ] =
    useState<ProposalLanguage>(
      "id"
    );

  const [
    listings,
    setListings,
  ] = useState<ListingRow[]>(
    []
  );

  const [
    selectedIds,
    setSelectedIds,
  ] = useState<string[]>(
    []
  );

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    buyerName,
    setBuyerName,
  ] = useState("");

  const [
    buyerCompany,
    setBuyerCompany,
  ] = useState("");

  const [
    introduction,
    setIntroduction,
  ] = useState("");

  const [
    loadingListings,
    setLoadingListings,
  ] = useState(true);

  const [
    generating,
    setGenerating,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

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
  ] = useState("");

  const [
    previewData,
    setPreviewData,
  ] = useState<AgentProposalData | null>(
    null
  );

  const [
    previewOpen,
    setPreviewOpen,
  ] = useState(false);

  const [
    previewLoading,
    setPreviewLoading,
  ] = useState(false);

  const [
    previewQrCodes,
    setPreviewQrCodes,
  ] = useState<Record<string, string>>(
    {}
  );

  function clearPdfOnly() {
    setPdfUrl(null);
    setPdfFile(null);
    setGeneratedFileName("");
  }

  function clearGeneratedPdf() {
    clearPdfOnly();
    setPreviewData(null);
    setPreviewOpen(false);
    setPreviewQrCodes({});
  }

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

  useEffect(() => {
    let ignore = false;

    async function loadListings() {
      if (
        loadingProfile
      ) {
        return;
      }

      if (!userId) {
        setListings([]);
        setLoadingListings(
          false
        );
        return;
      }

      setLoadingListings(
        true
      );
      setErrorMessage("");

      const {
        data,
        error,
      } = await supabase
        .from("properties")
        .select(
          `
            id,
            kode,
            slug,
            title,
            price,
            sale_price,
            rent_price,
            city,
            area,
            province,
            property_type,
            listing_type,
            rental_type,
            source,
            status,
            transaction_status,
            is_paused,
            listing_expires_at,
            property_images (
              image_url,
              sort_order,
              is_cover
            )
          `
        )
        .eq(
          "user_id",
          userId
        )
        .eq(
          "source",
          "agent"
        )
        .neq(
          "status",
          "rejected"
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (ignore) {
        return;
      }

      if (error) {
        console.error(
          "Failed to load proposal listings:",
          error
        );

        setListings([]);
        setErrorMessage(
          "Gagal memuat listing agen."
        );
        setLoadingListings(
          false
        );
        return;
      }

      const rows =
        (
          data || []
        ) as unknown as ListingRow[];

      setListings(
        rows.filter(
          isProposalEligible
        )
      );

      setLoadingListings(
        false
      );
    }

    loadListings();

    return () => {
      ignore = true;
    };
  }, [
    userId,
    loadingProfile,
  ]);

  const filteredListings =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return listings;
      }

      return listings.filter(
        (listing) => {
          const haystack = [
            listing.kode,
            listing.title,
            listing.area,
            listing.city,
            listing.province,
            listing.property_type,
          ]
            .map(cleanText)
            .join(" ")
            .toLowerCase();

          return haystack.includes(
            query
          );
        }
      );
    }, [
      listings,
      search,
    ]);

  const selectedListings =
    useMemo(() => {
      const selected =
        new Set(
          selectedIds
        );

      return listings.filter(
        (listing) =>
          selected.has(
            listing.id
          )
      );
    }, [
      listings,
      selectedIds,
    ]);

  const previewLanguage =
    previewData?.language ||
    language;

  const previewCopy =
    getProposalPreviewCopy(
      previewLanguage
    );

  const previewTotalPages =
    previewData
      ? previewData.properties.reduce(
          (
            total,
            property
          ) =>
            total +
            1 +
            Math.ceil(
              Math.max(
                property.images.length -
                  1,
                0
              ) / 6
            ),
          2
        )
      : 0;

  function changeMode(
    nextMode:
      ProposalMode
  ) {
    setMode(nextMode);

    if (
      nextMode ===
        "single" &&
      selectedIds.length > 1
    ) {
      setSelectedIds([
        selectedIds[0],
      ]);
    }

    clearGeneratedPdf();
    setErrorMessage("");
  }

  function toggleListing(
    propertyId: string
  ) {
    if (
      mode === "single"
    ) {
      setSelectedIds([
        propertyId,
      ]);
      clearGeneratedPdf();
      setErrorMessage("");
      return;
    }

    setSelectedIds(
      (current) => {
        if (
          current.includes(
            propertyId
          )
        ) {
          return current.filter(
            (id) =>
              id !==
              propertyId
          );
        }

        return [
          ...current,
          propertyId,
        ];
      }
    );

    clearGeneratedPdf();
    setErrorMessage("");
  }

  async function loadFullPreview() {
    if (
      selectedIds.length === 0
    ) {
      setErrorMessage(
        "Pilih minimal satu listing."
      );
      return;
    }

    if (
      mode === "single" &&
      selectedIds.length !== 1
    ) {
      setErrorMessage(
        "Single Property Proposal hanya dapat menggunakan satu listing."
      );
      return;
    }

    setPreviewLoading(true);
    setErrorMessage("");

    try {
      const {
        data: {
          session,
        },
      } =
        await supabase.auth
          .getSession();

      const token =
        session?.access_token ||
        "";

      if (!token) {
        throw new Error(
          "Session login tidak ditemukan. Silakan login kembali."
        );
      }

      const response =
        await fetch(
          "/api/agent/proposal/preview",
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${token}`,
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
                {
                  mode,
                  language,
                  propertyIds:
                    selectedIds,
                  buyerName,
                  buyerCompany,
                  introduction,
                }
              ),
          }
        );

      const payload =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          extractErrorMessage(
            payload
          ) ||
            "Preview proposal tidak dapat dimuat."
        );
      }

      const proposal =
        payload?.proposal as AgentProposalData | undefined;

      if (!proposal) {
        throw new Error(
          "Data preview proposal tidak ditemukan."
        );
      }

      const qrEntries =
        await Promise.all(
          proposal.properties.map(
            async (property) => [
              property.id,
              await QRCode.toDataURL(
                property.publicUrl,
                {
                  width: 260,
                  margin: 1,
                  errorCorrectionLevel:
                    "M",
                }
              ),
            ] as const
          )
        );

      setPreviewQrCodes(
        Object.fromEntries(
          qrEntries
        )
      );

      setPreviewData(
        proposal
      );
      setPreviewOpen(true);
    } catch (error) {
      console.error(
        "Proposal preview failed:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Preview proposal tidak dapat dimuat."
      );
    } finally {
      setPreviewLoading(
        false
      );
    }
  }

  async function generatePdf() {
    if (
      selectedIds.length === 0
    ) {
      setErrorMessage(
        "Pilih minimal satu listing."
      );
      return;
    }

    if (
      mode === "single" &&
      selectedIds.length !== 1
    ) {
      setErrorMessage(
        "Single Property Proposal hanya dapat menggunakan satu listing."
      );
      return;
    }

    setGenerating(true);
    setErrorMessage("");
    clearPdfOnly();

    try {
      const {
        data: {
          session,
        },
      } =
        await supabase.auth
          .getSession();

      const token =
        session?.access_token ||
        "";

      if (!token) {
        throw new Error(
          "Session login tidak ditemukan. Silakan login kembali."
        );
      }

      const response =
        await fetch(
          "/api/agent/proposal/generate",
          {
            method:
              "POST",
            headers: {
              Authorization:
                `Bearer ${token}`,
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
                {
                  mode,
                  language,
                  propertyIds:
                    selectedIds,
                  buyerName,
                  buyerCompany,
                  introduction,
                }
              ),
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
            extractErrorMessage(
              payload
            );
        } catch {
          message = "";
        }

        throw new Error(
          message ||
            "Proposal tidak dapat dibuat."
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
          mode ===
          "portfolio"
            ? "tetamo-property-portfolio.pdf"
            : "tetamo-property-proposal.pdf"
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

      setPdfFile(file);
      setPdfUrl(
        objectUrl
      );
      setGeneratedFileName(
        fileName
      );

      setPreviewOpen(
        false
      );
    } catch (error) {
      console.error(
        "Proposal generation failed:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Proposal tidak dapat dibuat."
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
      document.createElement(
        "a"
      );

    anchor.href =
      pdfUrl;

    anchor.download =
      generatedFileName ||
      "tetamo-property-proposal.pdf";

    document.body.appendChild(
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
        language === "id"
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
        "Browser ini belum mendukung share file langsung. Download PDF lalu bagikan melalui WhatsApp atau email."
      );
      return;
    }

    if (
      shareNavigator.canShare &&
      !shareNavigator.canShare(
        {
          files: [
            pdfFile,
          ],
        }
      )
    ) {
      setErrorMessage(
        "Browser ini tidak dapat membagikan file PDF langsung. Download PDF lalu bagikan melalui WhatsApp atau email."
      );
      return;
    }

    try {
      await shareNavigator.share(
        {
          title:
            mode ===
            "portfolio"
              ? "Tetamo Property Portfolio"
              : "Tetamo Property Proposal",
          text:
            buyerName
              ? `Property proposal for ${buyerName}`
              : "Tetamo Property Proposal",
          files: [
            pdfFile,
          ],
        }
      );
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name ===
          "AbortError"
      ) {
        return;
      }

      setErrorMessage(
        "PDF belum dapat dibagikan dari browser ini."
      );
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <section className="overflow-hidden rounded-[2rem] border border-[#E5E0D7] bg-[#F3EDE2] shadow-sm">
        <div className="grid gap-6 px-6 py-7 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#B8944E]/25 bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#8B692C]">
              <FileText className="h-3.5 w-3.5" />
              Tetamo Agent Sales Tool
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#1C1C1E] sm:text-4xl">
              Proposal & Portfolio
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625E57] sm:text-base">
              Ubah listing Tetamo Anda menjadi proposal properti profesional yang siap dipresentasikan kepada buyer.
            </p>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/65 px-4 py-3 text-sm text-[#625E57]">
            <p className="font-semibold text-[#1C1C1E]">
              {agent.name}
            </p>
            <p className="mt-0.5 text-xs">
              {agent.agency ||
                "Tetamo Agent"}
            </p>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!hasActiveMembership &&
      !loadingProfile ? (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Membership Agent aktif diperlukan untuk membuat Proposal & Portfolio.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
        <div className="space-y-6">
          <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#17171A] text-white">
                <FileText className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-[#1C1C1E]">
                  1. Pilih Tipe Proposal
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Gunakan satu properti atau buat portfolio beberapa pilihan untuk buyer.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  changeMode(
                    "single"
                  )
                }
                className={`rounded-2xl border p-4 text-left transition ${
                  mode ===
                  "single"
                    ? "border-[#1C1C1E] bg-[#1C1C1E] text-white shadow-md"
                    : "border-gray-200 bg-white text-[#1C1C1E] hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5" />

                  <div>
                    <p className="font-semibold">
                      Single Property
                    </p>

                    <p
                      className={`mt-1 text-xs ${
                        mode ===
                        "single"
                          ? "text-white/65"
                          : "text-gray-500"
                      }`}
                    >
                      Proposal satu listing
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  changeMode(
                    "portfolio"
                  )
                }
                className={`rounded-2xl border p-4 text-left transition ${
                  mode ===
                  "portfolio"
                    ? "border-[#1C1C1E] bg-[#1C1C1E] text-white shadow-md"
                    : "border-gray-200 bg-white text-[#1C1C1E] hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5" />

                  <div>
                    <p className="font-semibold">
                      Buyer Portfolio
                    </p>

                    <p
                      className={`mt-1 text-xs ${
                        mode ===
                        "portfolio"
                          ? "text-white/65"
                          : "text-gray-500"
                      }`}
                    >
                      Beberapa properti pilihan
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                Bahasa PDF
              </span>

              <button
                type="button"
                onClick={() => {
                  setLanguage(
                    "id"
                  );
                  clearGeneratedPdf();
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  language === "id"
                    ? "bg-[#B58A3C] text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                Bahasa Indonesia
              </button>

              <button
                type="button"
                onClick={() => {
                  setLanguage(
                    "en"
                  );
                  clearGeneratedPdf();
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  language === "en"
                    ? "bg-[#B58A3C] text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                English
              </button>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F3EDE2] text-[#8B692C]">
                <Building2 className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-[#1C1C1E]">
                  2. Pilih Properti
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {mode ===
                  "single"
                    ? "Pilih satu listing yang akan dipresentasikan."
                    : "Pilih beberapa listing untuk portfolio buyer."}
                </p>
              </div>

              <span className="rounded-full bg-[#17171A] px-3 py-1 text-xs font-semibold text-white">
                {selectedIds.length} dipilih
              </span>
            </div>

            <div className="relative mt-5">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Cari kode, judul atau lokasi..."
                className="w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#B58A3C] focus:bg-white"
              />
            </div>

            {loadingListings ? (
              <div className="flex min-h-56 items-center justify-center text-sm text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Memuat listing...
              </div>
            ) : filteredListings.length ===
              0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">
                <Building2 className="mx-auto h-8 w-8 text-gray-300" />

                <p className="mt-3 text-sm font-semibold text-gray-700">
                  Tidak ada listing aktif yang dapat digunakan.
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Proposal menggunakan listing Agent yang masih tersedia dan aktif.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                {filteredListings.map(
                  (listing) => {
                    const selected =
                      selectedIds.includes(
                        listing.id
                      );

                    const cover =
                      listingCover(
                        listing
                      );

                    return (
                      <button
                        key={
                          listing.id
                        }
                        type="button"
                        onClick={() =>
                          toggleListing(
                            listing.id
                          )
                        }
                        className={`group flex w-full items-center gap-4 rounded-2xl border p-3 text-left transition ${
                          selected
                            ? "border-[#B58A3C] bg-[#FBF7EF] shadow-sm"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                          {cover ? (
                            <img
                              src={
                                cover
                              }
                              alt={
                                listing.title ||
                                "Property"
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Building2 className="h-6 w-6 text-gray-300" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-[#1C1C1E]">
                            {listing.title ||
                              "Untitled Property"}
                          </p>

                          <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">
                              {listingLocation(
                                listing
                              ) || "-"}
                            </span>
                          </div>

                          <p className="mt-2 text-sm font-bold text-[#9A772B]">
                            {listingPrice(
                              listing
                            )}
                          </p>

                          <p className="mt-1 text-[11px] text-gray-400">
                            {listing.kode ||
                              listing.id}
                          </p>
                        </div>

                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition ${
                            selected
                              ? "border-[#B58A3C] bg-[#B58A3C] text-white"
                              : "border-gray-300 bg-white text-transparent"
                          }`}
                        >
                          <Check className="h-4 w-4" />
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </section>

          <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F3EDE2] text-[#8B692C]">
                <UserRound className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-[#1C1C1E]">
                  3. Buyer & Pengantar
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Personalisasi proposal sebelum dikirim ke calon buyer.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">
                  Nama Buyer / Client
                </span>

                <input
                  value={
                    buyerName
                  }
                  onChange={(
                    event
                  ) => {
                    setBuyerName(
                      event.target
                        .value
                    );
                    clearGeneratedPdf();
                  }}
                  placeholder="Contoh: Mr. John Smith"
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm outline-none transition focus:border-[#B58A3C]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-gray-600">
                  Company
                  <span className="ml-1 font-normal text-gray-400">
                    optional
                  </span>
                </span>

                <input
                  value={
                    buyerCompany
                  }
                  onChange={(
                    event
                  ) => {
                    setBuyerCompany(
                      event.target
                        .value
                    );
                    clearGeneratedPdf();
                  }}
                  placeholder="Company / Investor Group"
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm outline-none transition focus:border-[#B58A3C]"
                />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="text-xs font-semibold text-gray-600">
                Pesan Pengantar
                <span className="ml-1 font-normal text-gray-400">
                  optional
                </span>
              </span>

              <textarea
                rows={5}
                value={
                  introduction
                }
                onChange={(
                  event
                ) => {
                  setIntroduction(
                    event.target
                      .value
                  );
                  clearGeneratedPdf();
                }}
                placeholder="Tuliskan pengantar singkat untuk buyer..."
                className="mt-2 w-full resize-y rounded-xl border border-gray-200 px-3.5 py-3 text-sm leading-6 outline-none transition focus:border-[#B58A3C]"
              />
            </label>
          </section>

          <button
            type="button"
            disabled={
              previewLoading ||
              selectedIds.length ===
                0 ||
              !hasActiveMembership
            }
            onClick={
              loadFullPreview
            }
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#17171A] px-5 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-45"
          >
            {previewLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Menyiapkan Preview...
              </>
            ) : (
              <>
                <Eye className="h-5 w-5" />
                Preview Full Proposal
              </>
            )}
          </button>
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <section className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
              <div>
                <p className="text-sm font-bold text-[#1C1C1E]">
                  {pdfUrl ? "PDF Preview" : "Cover Preview"}
                </p>

                <p className="mt-0.5 text-xs text-gray-500">
                  {pdfUrl
                    ? generatedFileName
                    : `${selectedIds.length} properti dipilih`}
                </p>
              </div>

              {pdfUrl ? (
                <div className="flex flex-wrap gap-2">
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
                    Share
                  </button>

                  <button
                    type="button"
                    onClick={
                      openForPrint
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#17171A] px-3 py-2 text-xs font-semibold text-white transition hover:bg-black"
                  >
                    <Printer className="h-4 w-4" />
                    Open PDF
                  </button>
                </div>
              ) : null}
            </div>

            {pdfUrl ? (
              <div className="bg-[#DCD9D2] p-3 sm:p-4">
                <iframe
                  src={pdfUrl}
                  title="Tetamo Proposal PDF Preview"
                  className="h-[720px] w-full rounded-xl border-0 bg-white shadow-lg"
                />
              </div>
            ) : (
              <div className="min-h-[720px] bg-[#E8E3D9] p-5 sm:p-8">
                <div className="mx-auto flex min-h-[650px] max-w-[470px] flex-col overflow-hidden rounded-sm bg-[#F8F5EE] shadow-2xl">
                  <div className="px-8 pb-6 pt-9">
                    <div className="flex items-center gap-3">
                      <img
                        src="/tetamo-logo-transparent1.png"
                        alt="Tetamo"
                        className="h-12 w-12 object-contain"
                      />

                      <div>
                        <p className="text-lg font-black tracking-[0.08em] text-[#1C1C1E]">
                          TETAMO
                        </p>
                        <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                          Properti • Marketplace
                        </p>
                      </div>
                    </div>

                    <h3 className="mt-5 text-3xl font-bold tracking-tight text-[#1C1C1E]">
                      {mode ===
                      "portfolio"
                        ? previewCopy.portfolioTitle
                        : previewCopy.proposalTitle}
                    </h3>

                    {buyerName ? (
                      <div className="mt-8">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-gray-400">
                          {previewCopy.preparedFor}
                        </p>

                        <p className="mt-2 text-xl font-bold text-[#A57A24]">
                          {buyerName}
                        </p>

                        {buyerCompany ? (
                          <p className="mt-1 text-xs text-gray-500">
                            {buyerCompany}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {introduction ? (
                      <p className="mt-6 line-clamp-5 text-xs leading-5 text-gray-600">
                        {introduction}
                      </p>
                    ) : null}
                  </div>

                  {selectedListings[0] &&
                  listingCover(
                    selectedListings[0]
                  ) ? (
                    <img
                      src={listingCover(
                        selectedListings[0]
                      )}
                      alt=""
                      className="mt-auto h-64 w-full object-cover"
                    />
                  ) : (
                    <div className="mt-auto flex h-64 items-center justify-center bg-[#DDD7CB]">
                      <Building2 className="h-10 w-10 text-[#AAA295]" />
                    </div>
                  )}

                  <div className="flex items-end justify-between gap-4 px-8 py-7">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.14em] text-gray-400">
                        Prepared by
                      </p>

                      <p className="mt-1 text-sm font-bold text-[#1C1C1E]">
                        {agent.name}
                      </p>

                      <p className="mt-1 text-[10px] text-gray-500">
                        {agent.agency ||
                          "Tetamo Partner"}
                      </p>
                    </div>

                    <p className="text-right text-[10px] text-gray-400">
                      {selectedIds.length} selected
                    </p>
                  </div>
                </div>

                <div className="mx-auto mt-5 flex max-w-[470px] items-center justify-center gap-2 text-xs text-gray-500">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Klik Preview Full Proposal untuk melihat seluruh detail, deskripsi dan foto sebelum membuat PDF.
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {previewOpen &&
      previewData ? (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/70 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-[#17171A] px-4 py-3 text-white sm:px-6">
            <div className="min-w-0">
              <p className="text-sm font-bold">
                Full Proposal Preview
              </p>

              <p className="mt-0.5 truncate text-xs text-white/55">
                Periksa semua informasi sebelum membuat PDF.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                disabled={
                  generating
                }
                onClick={
                  generatePdf
                }
                className="inline-flex items-center gap-2 rounded-xl bg-[#B58A3C] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#9E762F] disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4" />
                    Generate PDF
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  setPreviewOpen(
                    false
                  )
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white transition hover:bg-white/10"
                aria-label="Close preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-[#D9D5CC] px-3 py-6 sm:px-6 lg:px-10">
            <div className="mx-auto max-w-[860px] space-y-8">
              <section className="relative mx-auto min-h-[1123px] w-full max-w-[794px] overflow-hidden rounded-sm bg-[#F8F5EE] shadow-2xl">
                <div className="px-7 py-8 sm:px-12 sm:py-12">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <div className="flex items-center gap-4">
                        <img
                          src="/tetamo-logo-transparent1.png"
                          alt="Tetamo"
                          className="h-16 w-16 object-contain sm:h-20 sm:w-20"
                        />

                        <div>
                          <p className="text-xl font-black tracking-[0.08em] text-[#1C1C1E] sm:text-2xl">
                            TETAMO
                          </p>
                          <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                            Properti • Marketplace
                          </p>
                        </div>
                      </div>

                      <h2 className="mt-6 text-3xl font-bold tracking-tight text-[#1C1C1E] sm:text-5xl">
                        {previewData.mode ===
                        "portfolio"
                          ? "Property Portfolio"
                          : "Property Proposal"}
                      </h2>
                    </div>

                    <div className="text-right text-xs text-gray-400">
                      {previewData.properties.length}{" "}
                      {previewData.properties.length === 1
                        ? "Property"
                        : "Properties"}
                    </div>
                  </div>

                  {previewData.buyerName ? (
                    <div className="mt-10">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                        {previewCopy.preparedFor}
                      </p>

                      <p className="mt-2 text-2xl font-bold text-[#A57A24] sm:text-3xl">
                        {previewData.buyerName}
                      </p>

                      {previewData.buyerCompany ? (
                        <p className="mt-1 text-sm text-gray-500">
                          {previewData.buyerCompany}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-10">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                        {previewCopy.preparedFor}
                      </p>

                      <p className="mt-2 text-xl font-semibold text-gray-400">
                        Your Client
                      </p>
                    </div>
                  )}

                  {previewData.introduction ? (
                    <p className="mt-7 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-gray-600">
                      {previewData.introduction}
                    </p>
                  ) : null}

                  <div className="mt-10 border-t border-[#DDD6C9] pt-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                      {previewCopy.presentedBy}
                    </p>

                    <div className="mt-3 flex items-center gap-4">
                      {previewData.agent.photoUrl ? (
                        <img
                          src={
                            previewData.agent.photoUrl
                          }
                          alt={
                            previewData.agent.fullName
                          }
                          className="h-14 w-14 rounded-full object-cover"
                        />
                      ) : null}

                      <div>
                        <p className="font-bold text-[#1C1C1E]">
                          {previewData.agent.fullName ||
                            "Tetamo Agent"}
                        </p>

                        {previewData.agent.agency ? (
                          <p className="mt-0.5 text-xs text-gray-500">
                            {previewData.agent.agency}
                          </p>
                        ) : null}

                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                          {previewData.agent.phone ? (
                            <span>
                              {previewData.agent.phone}
                            </span>
                          ) : null}

                          {previewData.agent.email ? (
                            <span>
                              {previewData.agent.email}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {previewData.properties[0]?.images[0] ? (
                  <img
                    src={
                      previewData.properties[0].images[0]
                    }
                    alt=""
                    className="mt-auto h-[420px] w-full object-cover"
                  />
                ) : null}

                <div className="absolute bottom-4 right-5 rounded-full bg-black/55 px-3 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                  {previewLanguage === "id"
                    ? "Halaman 1"
                    : "Page 1"}
                </div>
              </section>

              {previewData.properties.map(
                (
                  property,
                  propertyIndex
                ) => {
                  const galleryPages =
                    Array.from(
                      {
                        length:
                          Math.ceil(
                            Math.max(
                              property.images
                                .length - 1,
                              0
                            ) / 6
                          ),
                      },
                      (
                        _,
                        galleryPageIndex
                      ) =>
                        property.images.slice(
                          1 +
                            galleryPageIndex *
                              6,
                          1 +
                            (
                              galleryPageIndex +
                              1
                            ) *
                              6
                        )
                    );

                  const pagesBeforeProperty =
                    previewData.properties
                      .slice(
                        0,
                        propertyIndex
                      )
                      .reduce(
                        (
                          total,
                          previousProperty
                        ) =>
                          total +
                          1 +
                          Math.ceil(
                            Math.max(
                              previousProperty
                                .images
                                .length - 1,
                              0
                            ) / 6
                          ),
                        0
                      );

                  const propertyPageNumber =
                    2 +
                    pagesBeforeProperty;

                  return (
                    <div
                      key={
                        property.id
                      }
                      className="space-y-8"
                    >
                  <section
                    className="relative mx-auto min-h-[1123px] w-full max-w-[794px] overflow-hidden rounded-sm bg-[#F8F5EE] shadow-2xl"
                  >
                    <div className="absolute bottom-4 right-5 z-10 rounded-full bg-black/55 px-3 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                      {previewLanguage === "id"
                        ? `Halaman ${propertyPageNumber}`
                        : `Page ${propertyPageNumber}`}
                    </div>

                    <div className="px-6 py-8 pb-16 sm:px-10 sm:py-10 sm:pb-16">
                      <div className="flex flex-col gap-5 border-b border-[#DED8CC] pb-7 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A772B]">
                            Property{" "}
                            {propertyIndex + 1}
                          </p>

                          <h3 className="mt-2 text-2xl font-bold leading-tight text-[#1C1C1E] sm:text-3xl">
                            {property.title}
                          </h3>

                          <div className="mt-3 flex items-start gap-2 text-sm text-gray-500">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>
                              {property.location ||
                                property.address ||
                                "-"}
                            </span>
                          </div>
                        </div>

                        <div className="sm:text-right">
                          <p className="text-2xl font-bold text-[#9A772B]">
                            {property.priceText}
                          </p>

                          <p className="mt-2 text-xs text-gray-400">
                            Listing:{" "}
                            {property.kode ||
                              "-"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                          [
                            previewCopy.propertyType,
                            property.propertyType,
                          ],
                          [
                            previewCopy.listingType,
                            property.listingType,
                          ],
                          [
                            previewCopy.bedrooms,
                            property.bedrooms,
                          ],
                          [
                            previewCopy.bathrooms,
                            property.bathrooms,
                          ],
                          [
                            previewCopy.buildingSize,
                            property.buildingSize
                              ? `${property.buildingSize} m²`
                              : "",
                          ],
                          [
                            previewCopy.landSize,
                            property.landSize
                              ? `${property.landSize} ${property.landUnit || "m²"}`
                              : "",
                          ],
                          [
                            previewCopy.floors,
                            property.floors,
                          ],
                          [
                            previewCopy.parking,
                            property.parking,
                          ],
                        ]
                          .filter(
                            ([, value]) =>
                              hasProposalPreviewValue(
                                value
                              )
                          )
                          .map(
                          ([
                            label,
                            value,
                          ]) => (
                            <div
                              key={
                                String(
                                  label
                                )
                              }
                              className="rounded-2xl border border-[#E5E0D7] bg-white p-4"
                            >
                              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                                {label}
                              </p>

                              <p className="mt-2 text-sm font-bold text-[#1C1C1E]">
                                {formatProposalPreviewValue(
                                  value,
                                  previewLanguage
                                )}
                              </p>
                            </div>
                          )
                        )}
                      </div>

                      <div className="mt-9 grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
                        <div>
                          <h4 className="text-base font-bold text-[#1C1C1E]">
                            {previewCopy.description}
                          </h4>

                          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-600">
                            {property.description ||
                              "-"}
                          </p>
                        </div>

                        <div className="space-y-3">
                          {[
                            [
                              previewCopy.furnishing,
                              property.furnishing,
                            ],
                            [
                              previewCopy.certificate,
                              property.certificate,
                            ],
                            [
                              previewCopy.roadAccess,
                              property.roadAccess,
                            ],
                            [
                              previewCopy.ownership,
                              property.ownershipType,
                            ],
                            [
                              previewCopy.landType,
                              property.landType,
                            ],
                            [
                              previewCopy.zoning,
                              property.zoningType,
                            ],
                            [
                              previewCopy.water,
                              property.water,
                            ],
                          ]
                            .filter(
                              ([, value]) =>
                                Boolean(
                                  value
                                )
                            )
                            .map(
                              ([
                                label,
                                value,
                              ]) => (
                                <div
                                  key={
                                    String(
                                      label
                                    )
                                  }
                                  className="flex items-start justify-between gap-4 border-b border-[#E5E0D7] pb-2 text-sm"
                                >
                                  <span className="text-gray-500">
                                    {label}
                                  </span>

                                  <span className="text-right font-semibold text-[#1C1C1E]">
                                    {formatProposalPreviewValue(
                                      value,
                                      previewLanguage
                                    )}
                                  </span>
                                </div>
                              )
                            )}
                        </div>
                      </div>

                      {property.facilities.length >
                      0 ? (
                        <div className="mt-9">
                          <h4 className="text-base font-bold text-[#1C1C1E]">
                            {previewCopy.facilities}
                          </h4>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {property.facilities.map(
                              (
                                facility
                              ) => (
                                <span
                                  key={
                                    facility
                                  }
                                  className="rounded-full border border-[#DED8CC] bg-white px-3 py-2 text-xs font-medium text-gray-600"
                                >
                                  {facility}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      ) : null}

                      {property.nearby.length >
                      0 ? (
                        <div className="mt-8">
                          <h4 className="text-base font-bold text-[#1C1C1E]">
                            {previewCopy.nearby}
                          </h4>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {property.nearby.map(
                              (
                                item
                              ) => (
                                <span
                                  key={
                                    item
                                  }
                                  className="rounded-full bg-[#EEE8DC] px-3 py-2 text-xs font-medium text-[#6B6254]"
                                >
                                  {item}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-9 rounded-2xl border border-[#DED8CC] bg-white p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                          {previewQrCodes[
                            property.id
                          ] ? (
                            <img
                              src={
                                previewQrCodes[
                                  property.id
                                ]
                              }
                              alt="Tetamo listing QR code"
                              className="h-24 w-24 shrink-0 rounded-lg border border-gray-100 bg-white p-1"
                            />
                          ) : null}

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-[#1C1C1E]">
                              {previewCopy.viewListing}
                            </p>

                            <p className="mt-1 text-xs leading-5 text-gray-500">
                              {previewCopy.scanQr}
                            </p>

                            <a
                              href={
                                property.publicUrl
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#17171A] px-4 py-2.5 text-xs font-bold text-white"
                            >
                              <ExternalLink className="h-4 w-4" />
                              {previewCopy.viewListing}
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>

                  </section>

                  {galleryPages.map(
                    (
                      galleryImages,
                      galleryPageIndex
                    ) => {
                      const galleryPageNumber =
                        propertyPageNumber +
                        galleryPageIndex +
                        1;

                      const galleryStartPhoto =
                        2 +
                        galleryPageIndex *
                          6;

                      const galleryEndPhoto =
                        galleryStartPhoto +
                        galleryImages.length -
                        1;

                      return (
                        <section
                          key={`${property.id}-gallery-${galleryPageIndex}`}
                          className="relative mx-auto min-h-[1123px] w-full max-w-[794px] overflow-hidden rounded-sm bg-white shadow-2xl"
                        >
                          <div className="px-7 py-8 pb-16 sm:px-10 sm:py-10 sm:pb-16">
                            <div className="flex items-end justify-between gap-6 border-b border-[#DED8CC] pb-5">
                              <div>
                                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#A57A24]">
                                  {previewLanguage ===
                                  "id"
                                    ? `Properti ${propertyIndex + 1} • Galeri`
                                    : `Property ${propertyIndex + 1} • Gallery`}
                                </p>

                                <h3 className="mt-2 text-2xl font-bold text-[#1C1C1E]">
                                  {previewCopy.gallery}
                                </h3>

                                <p className="mt-1 max-w-[520px] truncate text-xs text-gray-500">
                                  {property.title}
                                </p>
                              </div>

                              <div className="shrink-0 text-right">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                                  {previewLanguage ===
                                  "id"
                                    ? "Foto"
                                    : "Photos"}
                                </p>

                                <p className="mt-1 text-sm font-bold text-[#1C1C1E]">
                                  {galleryStartPhoto}
                                  {" – "}
                                  {galleryEndPhoto}
                                </p>
                              </div>
                            </div>

                            <div className="mt-6 grid grid-cols-2 gap-3">
                              {galleryImages.map(
                                (
                                  image,
                                  imageIndex
                                ) => {
                                  const isFeature =
                                    imageIndex ===
                                    0;

                                  const isLast =
                                    imageIndex ===
                                    galleryImages.length -
                                      1;

                                  const shouldSpanLast =
                                    !isFeature &&
                                    isLast &&
                                    galleryImages.length %
                                      2 ===
                                      0;

                                  return (
                                    <div
                                      key={`${property.id}-gallery-${galleryPageIndex}-${imageIndex}`}
                                      className={`overflow-hidden rounded-xl bg-[#F2EFE9] ${
                                        isFeature ||
                                        shouldSpanLast
                                          ? "col-span-2"
                                          : ""
                                      }`}
                                    >
                                      <img
                                        src={
                                          image
                                        }
                                        alt={`${property.title} ${galleryStartPhoto + imageIndex}`}
                                        className={`w-full object-cover ${
                                          isFeature
                                            ? "h-[290px]"
                                            : shouldSpanLast
                                              ? "h-[170px]"
                                              : "h-[180px]"
                                        }`}
                                      />
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          </div>

                          <div className="absolute bottom-4 left-7 text-[9px] font-medium text-gray-400 sm:left-10">
                            TETAMO • Properti Marketplace
                          </div>

                          <div className="absolute bottom-4 right-5 rounded-full bg-black/55 px-3 py-1 text-[10px] font-semibold text-white">
                            {previewLanguage ===
                            "id"
                              ? `Halaman ${galleryPageNumber}`
                              : `Page ${galleryPageNumber}`}
                          </div>
                        </section>
                      );
                    }
                  )}
                </div>
                  );
                }
              )}

              <section className="relative mx-auto flex min-h-[1123px] w-full max-w-[794px] flex-col overflow-hidden rounded-sm bg-[#17171A] px-7 py-10 text-white shadow-2xl sm:px-12 sm:py-14">
                <div className="pointer-events-none absolute -right-8 top-[150px] select-none text-[110px] font-black tracking-[-0.08em] text-white/[0.025] sm:text-[145px]">
                  TETAMO
                </div>

                <div className="relative z-10 flex items-center gap-4">
                  <img
                    src="/tetamo-logo-transparent1.png"
                    alt="Tetamo"
                    className="h-16 w-16 rounded-2xl bg-white object-contain p-1"
                  />

                  <div>
                    <p className="text-xl font-black tracking-[0.08em]">
                      TETAMO
                    </p>

                    <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/45">
                      Properti • Marketplace
                    </p>
                  </div>
                </div>

                <div className="relative z-10 my-auto max-w-[650px]">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D2B36F]">
                    {previewCopy.contactAgent}
                  </p>

                  <h2 className="mt-5 max-w-[600px] text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl">
                    {previewLanguage ===
                    "id"
                      ? "Tertarik dengan properti ini?"
                      : "Interested in this property?"}
                  </h2>

                  <p className="mt-5 max-w-[560px] text-sm leading-7 text-white/55">
                    {previewLanguage ===
                    "id"
                      ? "Hubungi agen untuk informasi lebih lanjut, mengatur jadwal viewing, atau membicarakan langkah berikutnya."
                      : "Contact the agent for more information, to arrange a viewing, or to discuss the next step."}
                  </p>

                  <div className="mt-10 rounded-[28px] border border-white/10 bg-white/[0.055] p-6 backdrop-blur-sm sm:p-8">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                      {previewData.agent.photoUrl ? (
                        <img
                          src={
                            previewData.agent.photoUrl
                          }
                          alt={
                            previewData.agent.fullName
                          }
                          className="h-28 w-28 shrink-0 rounded-full border-4 border-white/10 object-cover"
                        />
                      ) : (
                        <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-4 border-white/10 bg-white/10 text-3xl font-black">
                          {previewData.agent.fullName
                            ?.charAt(
                              0
                            )
                            ?.toUpperCase() ||
                            "T"}
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="text-2xl font-black">
                          {previewData.agent.fullName ||
                            "Tetamo Agent"}
                        </p>

                        {previewData.agent.agency ? (
                          <p className="mt-1 text-sm text-[#D2B36F]">
                            {previewData.agent.agency}
                          </p>
                        ) : null}

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          {previewData.agent.phone ? (
                            <div className="rounded-xl bg-black/20 px-4 py-3">
                              <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/35">
                                {previewLanguage ===
                                "id"
                                  ? "Telepon / WhatsApp"
                                  : "Phone / WhatsApp"}
                              </p>

                              <p className="mt-1 text-xs font-semibold text-white/85">
                                {previewData.agent.phone}
                              </p>
                            </div>
                          ) : null}

                          {previewData.agent.email ? (
                            <div className="rounded-xl bg-black/20 px-4 py-3">
                              <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/35">
                                Email
                              </p>

                              <p className="mt-1 break-all text-xs font-semibold text-white/85">
                                {previewData.agent.email}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center gap-4">
                    <div className="h-px w-12 bg-[#D2B36F]" />

                    <p className="text-xs font-semibold tracking-[0.08em] text-white/60">
                      tetamo.com
                    </p>
                  </div>
                </div>

                <div className="relative z-10 mt-auto flex items-end justify-between gap-6 border-t border-white/10 pt-6">
                  <div>
                    <p className="text-xs font-semibold text-white/70">
                      TETAMO
                    </p>

                    <p className="mt-1 text-[9px] text-white/35">
                      {previewLanguage ===
                      "id"
                        ? "Proposal dibuat melalui Tetamo"
                        : "Proposal generated through Tetamo"}
                    </p>
                  </div>
                </div>

                <div className="absolute bottom-4 right-5 z-20 rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold text-white/80">
                  {previewLanguage ===
                  "id"
                    ? `Halaman ${previewTotalPages}`
                    : `Page ${previewTotalPages}`}
                </div>
              </section>

              <div className="flex flex-col items-stretch justify-between gap-3 rounded-2xl bg-white p-4 shadow-lg sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() =>
                    setPreviewOpen(
                      false
                    )
                  }
                  className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-[#1C1C1E]"
                >
                  {previewCopy.backToEdit}
                </button>

                <button
                  type="button"
                  disabled={
                    generating
                  }
                  onClick={
                    generatePdf
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#17171A] px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <FileDown className="h-4 w-4" />
                      {previewCopy.approve}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
