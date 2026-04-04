"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, ReceiptText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";

type PaymentRow = {
  id: string;
  user_id: string | null;
  billing_record_id?: string | null;
  amount?: number | null;
  amount_idr?: number | null;
  currency?: string | null;
  status?: string | null;
  gateway?: string | null;
  provider?: string | null;
  payment_method?: string | null;
  method?: string | null;
  reference?: string | null;
  provider_reference?: string | null;
  gateway_reference?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  audience?: string | null;
  user_type?: string | null;
  product_name?: string | null;
  product_type?: string | null;
  payment_title?: string | null;
  payment_description?: string | null;
  renewal_label?: string | null;
  billing_note?: string | null;
  billing_cycle?: string | null;
  duration_days?: number | null;
  max_listings?: number | null;
  max_featured_listings?: number | null;
  listing_code?: string | null;
  proof_url?: string | null;
  metadata?: Record<string, any> | null;
  [key: string]: any;
};

type BillingRecordRow = {
  id: string;
  invoice_number?: string | null;
  billing_number?: string | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  amount?: number | null;
  amount_idr?: number | null;
  currency?: string | null;
  created_at?: string | null;
  due_at?: string | null;
  [key: string]: any;
};

type ProfileRow = {
  full_name: string | null;
  email: string | null;
};

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function formatMoney(value: number, currency = "IDR") {
  const safeCurrency = currency || "IDR";

  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: 0,
    }).format(value || 0);
  } catch {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value || 0);
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

function formatShortDate(value: string | null | undefined, locale: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function normalizeStatus(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function getStatusUI(value: string | null | undefined, lang: "id" | "en") {
  const status = normalizeStatus(value);

  if (
    status === "paid" ||
    status === "success" ||
    status === "succeeded" ||
    status === "completed" ||
    status === "settled" ||
    status === "active"
  ) {
    return {
      label: lang === "id" ? "Lunas" : "Paid",
      className: "border-green-200 bg-green-50 text-green-700",
    };
  }

  if (status === "pending") {
    return {
      label: lang === "id" ? "Menunggu" : "Pending",
      className: "border-yellow-200 bg-yellow-50 text-yellow-700",
    };
  }

  if (
    status === "failed" ||
    status === "cancelled" ||
    status === "canceled" ||
    status === "expired"
  ) {
    return {
      label: lang === "id" ? "Gagal" : "Failed",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }

  return {
    label: value || "-",
    className: "border-gray-200 bg-gray-50 text-gray-700",
  };
}

function buildReceiptNumber(payment: PaymentRow | null, billing: BillingRecordRow | null) {
  if (!payment) return "-";

  return (
    billing?.invoice_number ||
    billing?.billing_number ||
    payment.reference ||
    payment.provider_reference ||
    payment.gateway_reference ||
    `RCT-${String(payment.id).slice(0, 8).toUpperCase()}`
  );
}

function buildProductName(payment: PaymentRow | null, billing: BillingRecordRow | null) {
  if (!payment) return "-";

  return (
    payment.payment_title ||
    payment.product_name ||
    billing?.title ||
    (payment.product_type === "addon" ? "Add-On" : "Membership")
  );
}

function buildProductDescription(payment: PaymentRow | null, billing: BillingRecordRow | null) {
  if (!payment) return "-";

  return (
    payment.payment_description ||
    billing?.description ||
    payment.metadata?.paymentDescription ||
    "-"
  );
}

export default function AgentReceiptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { lang } = useLanguage();

  const currentLang = lang === "id" ? "id" : "en";
  const locale = currentLang === "id" ? "id-ID" : "en-GB";
  const receiptId = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [payment, setPayment] = useState<PaymentRow | null>(null);
  const [billingRecord, setBillingRecord] = useState<BillingRecordRow | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadReceipt() {
      setLoading(true);
      setErrorMessage("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          if (!ignore) {
            router.replace(
              `/login?next=${encodeURIComponent(
                `/agentdashboard/pembayaran/receipt/${receiptId}`
              )}`
            );
          }
          return;
        }

        const [paymentRes, profileRes] = await Promise.all([
          supabase
            .from("payments")
            .select("*")
            .eq("id", receiptId)
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", user.id)
            .maybeSingle(),
        ]);

        if (ignore) return;

        if (paymentRes.error || !paymentRes.data) {
          setErrorMessage(
            currentLang === "id"
              ? "Receipt tidak ditemukan."
              : "Receipt was not found."
          );
          setLoading(false);
          return;
        }

        const paymentRow = paymentRes.data as PaymentRow;

        setPayment(paymentRow);
        setProfile((profileRes.data as ProfileRow | null) ?? null);

        if (paymentRow.billing_record_id) {
          const billingRes = await supabase
            .from("billing_records")
            .select("*")
            .eq("id", paymentRow.billing_record_id)
            .maybeSingle();

          if (!ignore && billingRes.data) {
            setBillingRecord(billingRes.data as BillingRecordRow);
          }
        }

        if (!ignore) {
          setLoading(false);
        }
      } catch (error: any) {
        if (!ignore) {
          setErrorMessage(
            error?.message ||
              (currentLang === "id"
                ? "Gagal memuat receipt."
                : "Failed to load receipt.")
          );
          setLoading(false);
        }
      }
    }

    if (receiptId) {
      loadReceipt();
    } else {
      setLoading(false);
      setErrorMessage(
        currentLang === "id"
          ? "ID receipt tidak ditemukan."
          : "Receipt ID was not found."
      );
    }

    return () => {
      ignore = true;
    };
  }, [receiptId, currentLang, router]);

  const amount = useMemo(() => {
    return toNumber(
      payment?.amount_idr ??
        payment?.amount ??
        billingRecord?.amount_idr ??
        billingRecord?.amount ??
        0
    );
  }, [payment, billingRecord]);

  const currency = String(
    payment?.currency || billingRecord?.currency || "IDR"
  ).toUpperCase();

  const statusUI = useMemo(
    () => getStatusUI(payment?.status, currentLang),
    [payment?.status, currentLang]
  );

  const receiptNumber = useMemo(
    () => buildReceiptNumber(payment, billingRecord),
    [payment, billingRecord]
  );

  const productName = useMemo(
    () => buildProductName(payment, billingRecord),
    [payment, billingRecord]
  );

  const productDescription = useMemo(
    () => buildProductDescription(payment, billingRecord),
    [payment, billingRecord]
  );

  const billingCycle = useMemo(() => {
    const cycle = String(
      payment?.billing_cycle || payment?.metadata?.selectedBillingCycle || ""
    ).toLowerCase();

    if (cycle === "monthly") {
      return currentLang === "id" ? "Bulanan" : "Monthly";
    }

    if (cycle === "yearly") {
      return currentLang === "id" ? "Tahunan" : "Yearly";
    }

    return "-";
  }, [payment, currentLang]);

  const durationLabel = useMemo(() => {
    const days = toNumber(
      payment?.duration_days ||
        payment?.metadata?.packageTermDays ||
        payment?.metadata?.productDurationDays ||
        0
    );

    if (!days) return "-";

    return currentLang === "id" ? `${days} hari` : `${days} days`;
  }, [payment, currentLang]);

  const listingCode = useMemo(() => {
    return (
      payment?.listing_code ||
      payment?.metadata?.existingPropertyCode ||
      payment?.metadata?.listingCode ||
      "-"
    );
  }, [payment]);

  const gatewayLabel = useMemo(() => {
    return (
      payment?.gateway ||
      payment?.provider ||
      "-"
    );
  }, [payment]);

  const methodLabel = useMemo(() => {
    return (
      payment?.payment_method ||
      payment?.method ||
      "Card"
    );
  }, [payment]);

  const payerName = useMemo(() => {
    return (
      profile?.full_name ||
      payment?.metadata?.payerName ||
      "-"
    );
  }, [profile, payment]);

  const payerEmail = useMemo(() => {
    return (
      profile?.email ||
      payment?.metadata?.payerEmail ||
      "-"
    );
  }, [profile, payment]);

  const maxListings = toNumber(
    payment?.max_listings ?? payment?.metadata?.maxListings ?? 0
  );

  const maxFeaturedListings = toNumber(
    payment?.max_featured_listings ?? payment?.metadata?.maxFeaturedListings ?? 0
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F7F8]">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 text-sm text-gray-500 shadow-sm sm:p-6">
            {currentLang === "id" ? "Memuat receipt..." : "Loading receipt..."}
          </div>
        </div>
      </main>
    );
  }

  if (errorMessage || !payment) {
    return (
      <main className="min-h-screen bg-[#F7F7F8]">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 shadow-sm sm:p-6">
            {errorMessage}
          </div>

          <div className="mt-4">
            <Link
              href="/agentdashboard/pembayaran"
              className="inline-flex items-center gap-2 rounded-xl bg-[#1C1C1E] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <ArrowLeft className="h-4 w-4" />
              {currentLang === "id" ? "Kembali ke Pembayaran" : "Back to Payments"}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F7F8] text-gray-900">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            onClick={() => router.push("/agentdashboard/pembayaran")}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#1C1C1E] transition hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            {currentLang === "id" ? "Kembali" : "Back"}
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1C1C1E] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Printer className="h-4 w-4" />
            {currentLang === "id" ? "Print Receipt" : "Print Receipt"}
          </button>
        </div>

        <div className="rounded-[28px] border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 sm:h-14 sm:w-14">
                  <Image
                    src="/tetamo-logo-transparent1.png"
                    alt="Tetamo"
                    fill
                    sizes="56px"
                    className="object-contain"
                  />
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                    Tetamo Pty Ltd
                  </p>
                  <h1 className="mt-1 text-xl font-bold tracking-tight text-[#1C1C1E] sm:text-2xl">
                    {currentLang === "id" ? "Receipt Pembayaran" : "Payment Receipt"}
                  </h1>
                </div>
              </div>

              <div className="sm:text-right">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${statusUI.className}`}
                >
                  {statusUI.label}
                </span>

                <div className="mt-3 text-xs text-gray-500">
                  {currentLang === "id" ? "Receipt No." : "Receipt No."}
                </div>
                <div className="mt-1 text-sm font-semibold text-[#1C1C1E]">
                  {receiptNumber}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <ReceiptText className="h-4 w-4 text-[#1C1C1E]" />
                  <h2 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
                    {currentLang === "id" ? "Ringkasan Produk" : "Product Summary"}
                  </h2>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-[11px] text-gray-500">
                      {currentLang === "id" ? "Produk" : "Product"}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-[#1C1C1E]">
                      {productName}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-gray-500">
                      {currentLang === "id" ? "Tipe Produk" : "Product Type"}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-[#1C1C1E]">
                      {String(payment.product_type || "-")}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-gray-500">
                      {currentLang === "id" ? "Tipe Tagihan" : "Billing Type"}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-[#1C1C1E]">
                      {billingCycle}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-gray-500">
                      {currentLang === "id" ? "Durasi" : "Duration"}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-[#1C1C1E]">
                      {durationLabel}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-gray-500">
                      {currentLang === "id" ? "Kode Listing" : "Listing Code"}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-[#1C1C1E]">
                      {listingCode}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-gray-500">
                      {currentLang === "id" ? "Gateway" : "Gateway"}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-[#1C1C1E]">
                      {String(gatewayLabel).toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-gray-100 bg-[#FAFAFA] p-4">
                  <div className="text-[11px] text-gray-500">
                    {currentLang === "id" ? "Deskripsi" : "Description"}
                  </div>
                  <div className="mt-1 text-sm leading-6 text-gray-700">
                    {productDescription}
                  </div>
                </div>

                {payment.renewal_label || payment.billing_note ? (
                  <div className="mt-4 space-y-3">
                    {payment.renewal_label ? (
                      <div className="rounded-2xl border border-gray-100 bg-[#FAFAFA] p-4">
                        <div className="text-[11px] text-gray-500">
                          {currentLang === "id" ? "Label Renewal" : "Renewal Label"}
                        </div>
                        <div className="mt-1 text-sm leading-6 text-gray-700">
                          {payment.renewal_label}
                        </div>
                      </div>
                    ) : null}

                    {payment.billing_note ? (
                      <div className="rounded-2xl border border-gray-100 bg-[#FAFAFA] p-4">
                        <div className="text-[11px] text-gray-500">
                          {currentLang === "id" ? "Catatan Tagihan" : "Billing Note"}
                        </div>
                        <div className="mt-1 text-sm leading-6 text-gray-700">
                          {payment.billing_note}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
                  {currentLang === "id" ? "Informasi Pembayar" : "Payer Information"}
                </h2>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-[11px] text-gray-500">
                      {currentLang === "id" ? "Nama" : "Name"}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-[#1C1C1E]">
                      {payerName}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-gray-500">
                      Email
                    </div>
                    <div className="mt-1 break-all text-sm font-semibold text-[#1C1C1E]">
                      {payerEmail}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
                  {currentLang === "id" ? "Ringkasan Pembayaran" : "Payment Summary"}
                </h2>

                <div className="mt-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm text-gray-500">
                      {currentLang === "id" ? "Tanggal Dibuat" : "Created Date"}
                    </span>
                    <span className="text-right text-sm font-semibold text-[#1C1C1E]">
                      {formatDate(payment.created_at, locale)}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm text-gray-500">
                      {currentLang === "id" ? "Tanggal Bayar" : "Paid Date"}
                    </span>
                    <span className="text-right text-sm font-semibold text-[#1C1C1E]">
                      {formatDate(payment.paid_at, locale)}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm text-gray-500">
                      {currentLang === "id" ? "Metode Pembayaran" : "Payment Method"}
                    </span>
                    <span className="text-right text-sm font-semibold text-[#1C1C1E]">
                      {String(methodLabel).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm text-gray-500">
                      {currentLang === "id" ? "Status" : "Status"}
                    </span>
                    <span className="text-right text-sm font-semibold text-[#1C1C1E]">
                      {statusUI.label}
                    </span>
                  </div>

                  {maxListings > 0 ? (
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm text-gray-500">
                        {currentLang === "id" ? "Maks. Listing" : "Max Listings"}
                      </span>
                      <span className="text-right text-sm font-semibold text-[#1C1C1E]">
                        {maxListings}
                      </span>
                    </div>
                  ) : null}

                  {maxFeaturedListings > 0 ? (
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm text-gray-500">
                        {currentLang === "id"
                          ? "Maks. Listing Unggulan"
                          : "Max Featured Listings"}
                      </span>
                      <span className="text-right text-sm font-semibold text-[#1C1C1E]">
                        {maxFeaturedListings}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-[#1C1C1E]">
                      Total
                    </span>
                    <span className="text-base font-bold text-[#1C1C1E]">
                      {formatMoney(amount, currency)}
                    </span>
                  </div>

                  <div className="mt-1 text-[11px] text-gray-500">
                    {currency}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
                  {currentLang === "id" ? "Catatan Receipt" : "Receipt Notes"}
                </h2>

                <div className="mt-3 space-y-2 text-sm leading-6 text-gray-600">
                  <p>
                    {currentLang === "id"
                      ? "Receipt ini tersimpan di dashboard agen dan dapat digunakan sebagai referensi pembayaran."
                      : "This receipt is saved in the agent dashboard and can be used as payment reference."}
                  </p>
                  <p>
                    {currentLang === "id"
                      ? "Untuk kebutuhan cetak atau screenshot, gunakan tombol Print Receipt di bagian atas."
                      : "For printing or screenshots, use the Print Receipt button at the top."}
                  </p>
                  {payment.proof_url ? (
                    <a
                      href={String(payment.proof_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex text-sm font-semibold text-[#1C1C1E] underline"
                    >
                      {currentLang === "id"
                        ? "Lihat bukti pembayaran"
                        : "View payment proof"}
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 px-5 py-4 text-[11px] text-gray-500 sm:px-6">
            © Tetamo Pty Ltd • {formatShortDate(payment.created_at, locale)}
          </div>
        </div>
      </div>
    </main>
  );
}