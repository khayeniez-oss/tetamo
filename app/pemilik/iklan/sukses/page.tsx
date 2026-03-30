"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";
import {
  getAnyProductById,
  getOwnerPackageById,
  getAgentPackageById,
} from "../../../data/pricelist";

type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "cancelled"
  | "refunded";

type PaymentRow = {
  id: string;
  user_type: string | null;
  flow: string | null;
  product_id: string | null;
  product_type: string | null;
  listing_code: string | null;
  amount: number | null;
  currency: string | null;
  status: PaymentStatus | null;
  gateway: string | null;
  payment_method: string | null;
  checkout_url: string | null;
  gateway_reference: string | null;
  paid_at: string | null;
  expires_at: string | null;
  created_at: string | null;
};

function formatCurrency(
  amount: number | null | undefined,
  currency: string | null | undefined,
  locale: string
) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency || "IDR",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  } catch {
    return `Rp ${(amount || 0).toLocaleString("id-ID")}`;
  }
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeStatus(value?: string | null): PaymentStatus {
  const v = String(value || "").toLowerCase();

  if (
    v === "paid" ||
    v === "failed" ||
    v === "expired" ||
    v === "cancelled" ||
    v === "refunded"
  ) {
    return v;
  }

  return "pending";
}

function humanizeGateway(value?: string | null) {
  if (!value) return "-";
  if (value.toLowerCase() === "stripe") return "Stripe";
  if (value.toLowerCase() === "xendit") return "Xendit";
  return value;
}

function humanizePaymentMethod(value?: string | null) {
  if (!value) return "-";

  const v = value.toLowerCase();

  if (v === "card") return "Card";
  if (v === "bank_transfer") return "Bank Transfer";
  if (v === "virtual_account") return "Virtual Account";
  if (v === "qris") return "QRIS";
  if (v === "ewallet") return "E-Wallet";

  return value;
}

function resolveFlow(
  payment: PaymentRow | null,
  urlFlow: string,
  urlProductId: string
) {
  const flow = String(payment?.flow || urlFlow || "").toLowerCase();
  const productId = String(
    payment?.product_id || urlProductId || ""
  ).toLowerCase();

  if (flow === "agent-membership") return "agent-membership";
  if (flow === "renew-listing") return "renew-listing";
  if (flow === "homepage-spotlight" || productId === "homepage-spotlight") {
    return "homepage-spotlight";
  }
  if (flow === "boost-listing" || productId === "boost-listing") {
    return "boost-listing";
  }

  return "new-listing";
}

function resolveUserType(payment: PaymentRow | null, resolvedFlow: string) {
  const userType = String(payment?.user_type || "").toLowerCase();

  if (userType === "agent") return "agent";
  if (resolvedFlow === "agent-membership") return "agent";
  return "owner";
}

function getProductName(
  productId: string,
  plan: string,
  userType: "owner" | "agent"
) {
  if (productId) {
    const anyProduct = getAnyProductById(productId);
    if (anyProduct?.name) return anyProduct.name;
  }

  if (userType === "agent" && plan) {
    const agentPackage = getAgentPackageById(plan);
    if (agentPackage?.name) return agentPackage.name;
  }

  if (userType === "owner" && plan) {
    const ownerPackage = getOwnerPackageById(plan);
    if (ownerPackage?.name) return ownerPackage.name;
  }

  return "";
}

function getStatusUI(status: PaymentStatus, lang: "id" | "en") {
  if (status === "paid") {
    return {
      icon: "✓",
      title: lang === "id" ? "Pembayaran Berhasil" : "Payment Successful",
      boxClass: "bg-green-50 border-green-200 text-green-700",
    };
  }

  if (status === "pending") {
    return {
      icon: "⏳",
      title:
        lang === "id" ? "Pembayaran Sedang Diproses" : "Payment Processing",
      boxClass: "bg-yellow-50 border-yellow-200 text-yellow-700",
    };
  }

  if (status === "expired") {
    return {
      icon: "!",
      title: lang === "id" ? "Pembayaran Kadaluarsa" : "Payment Expired",
      boxClass: "bg-orange-50 border-orange-200 text-orange-700",
    };
  }

  if (status === "cancelled") {
    return {
      icon: "×",
      title: lang === "id" ? "Pembayaran Dibatalkan" : "Payment Cancelled",
      boxClass: "bg-gray-100 border-gray-200 text-gray-700",
    };
  }

  if (status === "refunded") {
    return {
      icon: "↺",
      title: lang === "id" ? "Pembayaran Direfund" : "Payment Refunded",
      boxClass: "bg-sky-50 border-sky-200 text-sky-700",
    };
  }

  return {
    icon: "×",
    title: lang === "id" ? "Pembayaran Gagal" : "Payment Failed",
    boxClass: "bg-red-50 border-red-200 text-red-700",
  };
}

function buildContent(
  status: PaymentStatus,
  resolvedFlow: string,
  kode: string,
  productName: string,
  lang: "id" | "en"
) {
  if (resolvedFlow === "agent-membership") {
    if (status === "paid") {
      return {
        description:
          lang === "id"
            ? `Membership agent Anda berhasil diaktifkan${
                productName ? ` untuk produk ${productName}` : ""
              }.`
            : `Your agent membership has been activated${
                productName ? ` for ${productName}` : ""
              }.`,
        points:
          lang === "id"
            ? [
                "Akun agent siap digunakan",
                "Tagihan membership tersimpan di dashboard agent",
                "Status pembayaran sudah tercatat",
              ]
            : [
                "Your agent account is ready to use",
                "Membership billing is saved in the agent dashboard",
                "The payment status has been recorded",
              ],
      };
    }

    if (status === "pending") {
      return {
        description:
          lang === "id"
            ? "Pembayaran membership agent Anda masih menunggu konfirmasi. Status akan diperbarui otomatis setelah pembayaran terverifikasi."
            : "Your agent membership payment is still waiting for confirmation. The status will update automatically after the payment is verified.",
        points:
          lang === "id"
            ? [
                "Belum ada aktivasi final",
                "Silakan cek status dari dashboard agent",
                "Refresh halaman ini beberapa saat lagi bila perlu",
              ]
            : [
                "There is no final activation yet",
                "Please check the status from the agent dashboard",
                "Refresh this page again in a moment if needed",
              ],
      };
    }

    return {
      description:
        lang === "id"
          ? "Pembayaran membership agent belum berhasil diselesaikan."
          : "The agent membership payment has not been completed successfully.",
      points:
        lang === "id"
          ? [
              "Status pembayaran belum aktif",
              "Silakan cek tagihan dan lanjutkan pembayaran jika masih tersedia",
            ]
          : [
              "The payment status is not active yet",
              "Please check billing and continue the payment if it is still available",
            ],
    };
  }

  if (resolvedFlow === "renew-listing") {
    if (status === "paid") {
      return {
        description:
          lang === "id"
            ? kode
              ? `Perpanjangan listing ${kode} berhasil diproses.`
              : "Perpanjangan listing berhasil diproses."
            : kode
            ? `The renewal for listing ${kode} has been processed successfully.`
            : "The listing renewal has been processed successfully.",
        points:
          lang === "id"
            ? [
                "Masa aktif listing akan diperpanjang sesuai produk",
                "Riwayat pembayaran tersimpan di tagihan pemilik",
              ]
            : [
                "The listing active period will be extended based on the selected product",
                "Payment history is stored in owner billing",
              ],
      };
    }

    if (status === "pending") {
      return {
        description:
          lang === "id"
            ? kode
              ? `Perpanjangan listing ${kode} masih menunggu konfirmasi pembayaran.`
              : "Perpanjangan listing masih menunggu konfirmasi pembayaran."
            : kode
            ? `The renewal for listing ${kode} is still waiting for payment confirmation.`
            : "The listing renewal is still waiting for payment confirmation.",
        points:
          lang === "id"
            ? [
                "Listing belum diperpanjang final",
                "Silakan cek status pembayaran di tagihan",
              ]
            : [
                "The listing has not been renewed finally yet",
                "Please check the payment status in billing",
              ],
      };
    }

    return {
      description:
        lang === "id"
          ? "Perpanjangan listing belum berhasil diselesaikan."
          : "The listing renewal has not been completed successfully.",
      points:
        lang === "id"
          ? [
              "Masa aktif belum diperbarui",
              "Silakan cek tagihan untuk lanjutkan pembayaran",
            ]
          : [
              "The active period has not been updated yet",
              "Please check billing to continue the payment",
            ],
    };
  }

  if (resolvedFlow === "boost-listing") {
    if (status === "paid") {
      return {
        description:
          lang === "id"
            ? kode
              ? `Boost untuk listing ${kode} berhasil diproses.`
              : "Boost listing berhasil diproses."
            : kode
            ? `Boost for listing ${kode} has been processed successfully.`
            : "The listing boost has been processed successfully.",
        points:
          lang === "id"
            ? [
                "Prioritas tampil akan aktif setelah pembayaran terkonfirmasi",
                "Riwayat add-on tersimpan di tagihan pemilik",
              ]
            : [
                "Priority exposure will activate after payment is confirmed",
                "Add-on history is stored in owner billing",
              ],
      };
    }

    if (status === "pending") {
      return {
        description:
          lang === "id"
            ? kode
              ? `Boost untuk listing ${kode} masih menunggu konfirmasi pembayaran.`
              : "Boost listing masih menunggu konfirmasi pembayaran."
            : kode
            ? `Boost for listing ${kode} is still waiting for payment confirmation.`
            : "The listing boost is still waiting for payment confirmation.",
        points:
          lang === "id"
            ? [
                "Boost belum aktif final",
                "Silakan cek tagihan untuk status terbaru",
              ]
            : [
                "The boost is not finally active yet",
                "Please check billing for the latest status",
              ],
      };
    }

    return {
      description:
        lang === "id"
          ? "Pembayaran boost listing belum berhasil diselesaikan."
          : "The listing boost payment has not been completed successfully.",
      points:
        lang === "id"
          ? [
              "Boost belum aktif",
              "Silakan cek tagihan untuk lanjutkan pembayaran",
            ]
          : [
              "The boost is not active yet",
              "Please check billing to continue the payment",
            ],
    };
  }

  if (resolvedFlow === "homepage-spotlight") {
    if (status === "paid") {
      return {
        description:
          lang === "id"
            ? kode
              ? `Homepage Spotlight untuk listing ${kode} berhasil diproses.`
              : "Homepage Spotlight berhasil diproses."
            : kode
            ? `Homepage Spotlight for listing ${kode} has been processed successfully.`
            : "Homepage Spotlight has been processed successfully.",
        points:
          lang === "id"
            ? [
                "Spotlight akan aktif setelah pembayaran terkonfirmasi",
                "Riwayat add-on tersimpan di tagihan pemilik",
              ]
            : [
                "Spotlight will activate after payment is confirmed",
                "Add-on history is stored in owner billing",
              ],
      };
    }

    if (status === "pending") {
      return {
        description:
          lang === "id"
            ? kode
              ? `Homepage Spotlight untuk listing ${kode} masih menunggu konfirmasi pembayaran.`
              : "Homepage Spotlight masih menunggu konfirmasi pembayaran."
            : kode
            ? `Homepage Spotlight for listing ${kode} is still waiting for payment confirmation.`
            : "Homepage Spotlight is still waiting for payment confirmation.",
        points:
          lang === "id"
            ? [
                "Spotlight belum aktif final",
                "Silakan cek tagihan untuk status terbaru",
              ]
            : [
                "Spotlight is not finally active yet",
                "Please check billing for the latest status",
              ],
      };
    }

    return {
      description:
        lang === "id"
          ? "Pembayaran Homepage Spotlight belum berhasil diselesaikan."
          : "The Homepage Spotlight payment has not been completed successfully.",
      points:
        lang === "id"
          ? [
              "Spotlight belum aktif",
              "Silakan cek tagihan untuk lanjutkan pembayaran",
            ]
          : [
              "Spotlight is not active yet",
              "Please check billing to continue the payment",
            ],
    };
  }

  if (status === "paid") {
    return {
      description:
        lang === "id"
          ? kode
            ? `Pembayaran listing ${kode} berhasil diproses. Listing akan mengikuti alur aktivasi TETAMO setelah pembayaran terkonfirmasi.`
            : "Pembayaran listing berhasil diproses. Listing akan mengikuti alur aktivasi TETAMO setelah pembayaran terkonfirmasi."
          : kode
          ? `The payment for listing ${kode} has been processed successfully. The listing will follow the TETAMO activation flow after the payment is confirmed.`
          : "The listing payment has been processed successfully. The listing will follow the TETAMO activation flow after the payment is confirmed.",
      points:
        lang === "id"
          ? [
              "Status pembayaran sudah tercatat",
              "Listing tidak dibuat ulang dari halaman ini",
              "Riwayat pembayaran dapat dilihat di tagihan pemilik",
            ]
          : [
              "The payment status has been recorded",
              "The listing is not recreated from this page",
              "Payment history can be viewed in owner billing",
            ],
    };
  }

  if (status === "pending") {
    return {
      description:
        lang === "id"
          ? "Pembayaran Anda masih menunggu konfirmasi. Status akan diperbarui otomatis setelah webhook atau konfirmasi gateway masuk."
          : "Your payment is still waiting for confirmation. The status will update automatically after the webhook or gateway confirmation arrives.",
      points:
        lang === "id"
          ? [
              "Halaman ini hanya menampilkan status pembayaran",
              "Tidak ada insert listing baru di sini",
              "Silakan cek tagihan untuk update terbaru",
            ]
          : [
              "This page only shows the payment status",
              "No new listing is inserted here",
              "Please check billing for the latest update",
            ],
    };
  }

  return {
    description:
      lang === "id"
        ? "Pembayaran belum berhasil diselesaikan. Silakan cek tagihan untuk melihat status terbaru atau melanjutkan pembayaran."
        : "The payment has not been completed successfully. Please check billing to see the latest status or continue the payment.",
    points:
      lang === "id"
        ? [
            "Tidak ada data listing yang disimpan ulang dari halaman ini",
            "Gunakan halaman tagihan untuk status dan tindakan berikutnya",
          ]
        : [
            "No listing data is re-saved from this page",
            "Use the billing page for status and the next action",
          ],
  };
}

export default function PemilikIklanSuksesPage() {
  const searchParams = useSearchParams();
  const { lang } = useLanguage();

  const locale = lang === "id" ? "id-ID" : "en-US";

  const t =
    lang === "id"
      ? {
          loadingSubmission: "Memuat status pengiriman...",
          loadingPayment: "Memuat status pembayaran...",
          statusLabel: "Status",
          amountLabel: "Jumlah",
          gatewayLabel: "Gateway",
          methodLabel: "Metode",
          codeLabel: "Kode Listing",
          createdLabel: "Dibuat",
          paidAtLabel: "Dibayar Pada",
          whatNow: "Yang Terjadi Sekarang",
          continuePayment: "Lanjutkan Pembayaran",
          viewMarketplace: "Lihat Marketplace",
          toOwnerBilling: "Ke Tagihan Pemilik",
          toAgentBilling: "Ke Tagihan Agent",
          toOwnerDashboard: "Ke Dashboard Pemilik",
          toAgentDashboard: "Ke Dashboard Agent",
          editApprovalTitle: "Dikirim untuk Persetujuan",
          editApprovalDescription: (kode: string) =>
            kode && kode !== "-"
              ? `Perubahan listing ${kode} berhasil dikirim untuk approval. Listing tetap dapat tampil di marketplace dengan status pending approval sampai ditinjau.`
              : "Perubahan listing berhasil dikirim untuk approval. Listing tetap dapat tampil di marketplace dengan status pending approval sampai ditinjau.",
          editApprovalPoints: [
            "Perubahan listing sudah berhasil dikirim",
            "Status listing sekarang pending approval",
            "Listing tetap bisa tampil di marketplace",
            "Marketplace akan menampilkan label pending approval",
          ],
          editApprovalFooter:
            "Halaman ini menampilkan status submit edit listing. Listing akan tetap mengikuti status pending approval sampai ditinjau.",
          paymentFooter:
            "Halaman ini hanya membaca status pembayaran. Tidak ada proses insert listing atau upload foto di sini lagi.",
          loginFirst: "Silakan login terlebih dahulu.",
          loadPaymentError: "Gagal memuat status pembayaran.",
        }
      : {
          loadingSubmission: "Loading submission status...",
          loadingPayment: "Loading payment status...",
          statusLabel: "Status",
          amountLabel: "Amount",
          gatewayLabel: "Gateway",
          methodLabel: "Method",
          codeLabel: "Listing Code",
          createdLabel: "Created",
          paidAtLabel: "Paid At",
          whatNow: "What Happens Now",
          continuePayment: "Continue Payment",
          viewMarketplace: "View Marketplace",
          toOwnerBilling: "Go to Owner Billing",
          toAgentBilling: "Go to Agent Billing",
          toOwnerDashboard: "Go to Owner Dashboard",
          toAgentDashboard: "Go to Agent Dashboard",
          editApprovalTitle: "Submitted for Approval",
          editApprovalDescription: (kode: string) =>
            kode && kode !== "-"
              ? `Your changes for listing ${kode} have been submitted for approval. The listing can still appear in the marketplace with pending approval status until it is reviewed.`
              : "Your listing changes have been submitted for approval. The listing can still appear in the marketplace with pending approval status until it is reviewed.",
          editApprovalPoints: [
            "Your listing changes have been submitted successfully",
            "The listing status is now pending approval",
            "The listing can still appear in the marketplace",
            "The marketplace will show a pending approval label",
          ],
          editApprovalFooter:
            "This page shows the listing edit submission status. The listing will remain under pending approval until it is reviewed.",
          paymentFooter:
            "This page only reads payment status. No listing insert or photo upload happens here anymore.",
          loginFirst: "Please log in first.",
          loadPaymentError: "Failed to load payment status.",
        };

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [payment, setPayment] = useState<PaymentRow | null>(null);
  const [pollCount, setPollCount] = useState(0);

  const sessionId = String(searchParams.get("session_id") || "");
  const urlFlow = String(searchParams.get("flow") || "");
  const urlPlan = String(searchParams.get("plan") || "").toLowerCase();
  const urlProductId = String(searchParams.get("product") || "").toLowerCase();
  const urlKode = String(searchParams.get("kode") || "");
  const urlPayment = String(searchParams.get("payment") || "").toLowerCase();
  const urlMode = String(searchParams.get("mode") || "").toLowerCase();
  const urlStatus = String(searchParams.get("status") || "").toLowerCase();

  const isEditApprovalFlow =
    urlMode === "edit" && urlStatus === "pending-approval";

  useEffect(() => {
    let ignore = false;

    async function loadPayment() {
      if (isEditApprovalFlow) {
        setPayment(null);
        setErrorMessage("");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (ignore) return;

      if (authError || !user) {
        setPayment(null);
        setLoading(false);
        setErrorMessage(t.loginFirst);
        return;
      }

      let foundPayment: PaymentRow | null = null;

      if (sessionId) {
        const { data } = await supabase
          .from("payments")
          .select(
            "id, user_type, flow, product_id, product_type, listing_code, amount, currency, status, gateway, payment_method, checkout_url, gateway_reference, paid_at, expires_at, created_at"
          )
          .eq("user_id", user.id)
          .eq("gateway_reference", sessionId)
          .maybeSingle();

        if (data) {
          foundPayment = data as PaymentRow;
        }
      }

      if (!foundPayment) {
        let query = supabase
          .from("payments")
          .select(
            "id, user_type, flow, product_id, product_type, listing_code, amount, currency, status, gateway, payment_method, checkout_url, gateway_reference, paid_at, expires_at, created_at"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (urlKode) {
          query = query.eq("listing_code", urlKode);
        }

        const { data, error } = await query;

        if (ignore) return;

        if (error) {
          setPayment(null);
          setLoading(false);
          setErrorMessage(error.message || t.loadPaymentError);
          return;
        }

        const rows = (data || []) as PaymentRow[];

        foundPayment =
          rows.find((item) => {
            const sameProduct =
              !urlProductId ||
              String(item.product_id || "").toLowerCase() === urlProductId;

            const sameFlow =
              !urlFlow || String(item.flow || "").toLowerCase() === urlFlow;

            return sameProduct || sameFlow;
          }) ||
          rows[0] ||
          null;
      }

      setPayment(foundPayment);
      setLoading(false);
    }

    loadPayment();

    return () => {
      ignore = true;
    };
  }, [
    sessionId,
    urlKode,
    urlFlow,
    urlProductId,
    pollCount,
    isEditApprovalFlow,
    t.loginFirst,
    t.loadPaymentError,
  ]);

  const resolvedFlow = useMemo(() => {
    if (isEditApprovalFlow) return "edit-approval";
    return resolveFlow(payment, urlFlow, urlProductId);
  }, [isEditApprovalFlow, payment, urlFlow, urlProductId]);

  const resolvedUserType = useMemo(() => {
    if (isEditApprovalFlow) return "owner" as const;
    return resolveUserType(payment, resolvedFlow);
  }, [isEditApprovalFlow, payment, resolvedFlow]);

  const resolvedStatus = useMemo(() => {
    if (isEditApprovalFlow) return "pending" as PaymentStatus;
    if (urlPayment === "cancelled") return "cancelled" as PaymentStatus;
    return normalizeStatus(payment?.status);
  }, [isEditApprovalFlow, payment?.status, urlPayment]);

  const resolvedKode = isEditApprovalFlow
    ? urlKode || "-"
    : payment?.listing_code || urlKode || "-";

  const productName = isEditApprovalFlow
    ? ""
    : getProductName(
        String(payment?.product_id || urlProductId || ""),
        urlPlan,
        resolvedUserType
      );

  const statusUI = isEditApprovalFlow
    ? {
        icon: "✓",
        title: t.editApprovalTitle,
        boxClass: "bg-yellow-50 border-yellow-200 text-yellow-700",
      }
    : getStatusUI(resolvedStatus, lang);

  const content = isEditApprovalFlow
    ? {
        description: t.editApprovalDescription(resolvedKode),
        points: t.editApprovalPoints,
      }
    : buildContent(
        resolvedStatus,
        resolvedFlow,
        resolvedKode === "-" ? "" : resolvedKode,
        productName,
        lang
      );

  const primaryHref = isEditApprovalFlow
    ? "/marketplace"
    : resolvedUserType === "agent"
    ? "/agentdashboard/tagihan"
    : "/pemilikdashboard/tagihan";

  const secondaryHref = isEditApprovalFlow
    ? "/pemilikdashboard"
    : resolvedUserType === "agent"
    ? "/agentdashboard"
    : "/pemilikdashboard";

  const primaryLabel = isEditApprovalFlow
    ? t.viewMarketplace
    : resolvedUserType === "agent"
    ? t.toAgentBilling
    : t.toOwnerBilling;

  const secondaryLabel = isEditApprovalFlow
    ? t.toOwnerDashboard
    : resolvedUserType === "agent"
    ? t.toAgentDashboard
    : t.toOwnerDashboard;

  const shouldShowContinuePayment =
    !isEditApprovalFlow &&
    resolvedStatus === "pending" &&
    Boolean(payment?.checkout_url);

  const shouldPoll =
    !isEditApprovalFlow &&
    sessionId &&
    pollCount < 5 &&
    (!payment || resolvedStatus === "pending");

  useEffect(() => {
    if (!shouldPoll) return;

    const timer = setTimeout(() => {
      setPollCount((prev) => prev + 1);
    }, 3000);

    return () => clearTimeout(timer);
  }, [shouldPoll]);

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <div
          className={[
            "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border text-2xl font-bold",
            statusUI.boxClass,
          ].join(" ")}
        >
          {statusUI.icon}
        </div>

        <h1 className="mt-6 text-4xl font-bold text-[#1C1C1E]">
          {statusUI.title}
        </h1>

        <p className="mt-3 text-gray-600">{content.description}</p>

        {loading ? (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            {isEditApprovalFlow ? t.loadingSubmission : t.loadingPayment}
          </div>
        ) : null}

        {!loading && errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {errorMessage}
          </div>
        ) : null}

        {!loading && !isEditApprovalFlow && productName ? (
          <div className="mt-6 inline-flex items-center rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-[#1C1C1E]">
            {productName}
          </div>
        ) : null}

        {!loading && !isEditApprovalFlow ? (
          <div className="mt-8 grid grid-cols-1 gap-4 text-left sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">{t.statusLabel}</p>
              <p className="mt-1 font-semibold text-[#1C1C1E]">
                {resolvedStatus}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">{t.amountLabel}</p>
              <p className="mt-1 font-semibold text-[#1C1C1E]">
                {formatCurrency(payment?.amount, payment?.currency, locale)}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">{t.gatewayLabel}</p>
              <p className="mt-1 font-semibold text-[#1C1C1E]">
                {humanizeGateway(payment?.gateway)}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">{t.methodLabel}</p>
              <p className="mt-1 font-semibold text-[#1C1C1E]">
                {humanizePaymentMethod(payment?.payment_method)}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">{t.codeLabel}</p>
              <p className="mt-1 font-semibold text-[#1C1C1E]">
                {resolvedKode}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">{t.createdLabel}</p>
              <p className="mt-1 font-semibold text-[#1C1C1E]">
                {formatDate(payment?.created_at, locale)}
              </p>
            </div>

            {payment?.paid_at ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:col-span-2">
                <p className="text-xs text-gray-500">{t.paidAtLabel}</p>
                <p className="mt-1 font-semibold text-[#1C1C1E]">
                  {formatDate(payment.paid_at, locale)}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {content.points?.length ? (
          <div className="mt-8 rounded-3xl border border-gray-200 bg-gray-50 p-6 text-left">
            <div className="text-sm font-semibold text-[#1C1C1E]">
              {t.whatNow}
            </div>

            <ul className="mt-4 space-y-3">
              {content.points.map((point, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <span className="text-green-600">✓</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {shouldShowContinuePayment ? (
            <a
              href={payment?.checkout_url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl bg-[#1C1C1E] px-6 py-3 font-semibold text-white transition hover:opacity-90"
            >
              {t.continuePayment}
            </a>
          ) : (
            <Link
              href={primaryHref}
              className="rounded-2xl bg-[#1C1C1E] px-6 py-3 font-semibold text-white transition hover:opacity-90"
            >
              {primaryLabel}
            </Link>
          )}

          <Link
            href={secondaryHref}
            className="rounded-2xl border border-gray-200 px-6 py-3 font-semibold transition hover:bg-gray-50"
          >
            {secondaryLabel}
          </Link>
        </div>

        <div className="mt-8 text-xs text-gray-500">
          {isEditApprovalFlow ? t.editApprovalFooter : t.paymentFooter}
        </div>
      </div>
    </main>
  );
}