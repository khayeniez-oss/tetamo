"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type BillingStatus =
  | "pending"
  | "checkout_created"
  | "paid"
  | "failed"
  | "overdue"
  | "expired"
  | "canceled"
  | "cancelled"
  | "refunded"
  | "partially_refunded"
  | null;

type AdminInvoiceRow = {
  payment_id: string | null;
  issued_at: string | null;
  paid_at: string | null;
  invoice_status: BillingStatus;
  currency: string | null;
  amount_subtotal: number | null;
  amount_discount: number | null;
  amount_tax: number | null;
  amount_total: number | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  property_id: string | null;
  property_title_snapshot: string | null;
  property_code_snapshot: string | null;
  source_role: string | null;
  payment_type: string | null;
  plan_name: string | null;
  duration_days: number | null;
  description: string | null;
  stripe_invoice_id: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf_url: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  metadata: Record<string, any> | null;
};

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function normalizeBillingStatus(value: string | null | undefined): BillingStatus {
  const v = String(value || "").toLowerCase();

  if (
    v === "pending" ||
    v === "checkout_created" ||
    v === "paid" ||
    v === "failed" ||
    v === "overdue" ||
    v === "expired" ||
    v === "canceled" ||
    v === "cancelled" ||
    v === "refunded" ||
    v === "partially_refunded"
  ) {
    return v as BillingStatus;
  }

  return null;
}

function formatAmount(value: number | null, currency: string | null) {
  const amount = Number(value ?? 0);
  const code = (currency || "IDR").toUpperCase();

  if (code === "IDR") {
    return `Rp ${new Intl.NumberFormat("id-ID").format(amount)}`;
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${code} ${new Intl.NumberFormat("en-US").format(amount)}`;
  }
}

function formatDate(value: string | null) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function getStatusLabel(status: BillingStatus) {
  switch ((status || "").toLowerCase()) {
    case "paid":
      return "PAID";
    case "failed":
      return "FAILED";
    case "overdue":
      return "OVERDUE";
    case "expired":
      return "EXPIRED";
    case "canceled":
    case "cancelled":
      return "CANCELLED";
    case "refunded":
    case "partially_refunded":
      return "REFUNDED";
    default:
      return "UNPAID";
  }
}

function getPaymentMetaInfo(metadata: Record<string, any> | null | undefined) {
  const meta = asObject(metadata);
  const hitpayMeta = asObject(meta.hitpay);

  const gateway = String(
    meta.gateway || meta.payment_gateway || hitpayMeta.gateway || ""
  ).toLowerCase();

  const method = String(
    meta.paymentMethod ||
      meta.payment_method ||
      hitpayMeta.paymentMethod ||
      hitpayMeta.payment_method ||
      ""
  ).toLowerCase();

  const qrisReference =
    String(
      meta.hitpay_reference_number ||
        meta.hitpay_payment_request_id ||
        hitpayMeta.reference_number ||
        hitpayMeta.payment_request_id ||
        hitpayMeta.payment_id ||
        ""
    ).trim() || "";

  const isQris = Boolean(
    method === "qris" ||
      gateway === "hitpay" ||
      meta.hitpay_payment_request_id ||
      meta.hitpay_reference_number ||
      hitpayMeta.payment_request_id ||
      hitpayMeta.reference_number ||
      hitpayMeta.payment_id
  );

  return { isQris, qrisReference };
}

function humanizePaymentMethod(invoice: AdminInvoiceRow | null) {
  const info = getPaymentMetaInfo(invoice?.metadata);
  if (info.isQris) return "QRIS";
  return "Debit / Credit Card";
}

function getPaymentReference(invoice: AdminInvoiceRow | null) {
  if (!invoice) return "-";

  const info = getPaymentMetaInfo(invoice.metadata);

  if (info.qrisReference) return info.qrisReference;
  if (invoice.stripe_payment_intent_id?.trim()) return invoice.stripe_payment_intent_id.trim();
  if (invoice.stripe_checkout_session_id?.trim()) return invoice.stripe_checkout_session_id.trim();
  if (invoice.payment_id?.trim()) return invoice.payment_id.trim();

  return "-";
}

function sanitizePublicPaymentText(value: unknown) {
  return String(value || "")
    .replace(/stripe/gi, "secure payment")
    .replace(/xendit/gi, "payment provider")
    .replace(/hitpay/gi, "secure payment")
    .trim();
}

function humanizePaymentType(value?: string | null) {
  const v = String(value || "").toLowerCase();

  if (v === "listing_fee") return "Listing Payment";
  if (v === "featured") return "Featured Listing";
  if (v === "boost") return "Boost Listing";
  if (v === "spotlight") return "Homepage Spotlight";
  if (v === "education") return "Education Pass";
  if (v === "package") return "Membership Package";

  return "Payment";
}

function getInvoiceNumber(invoice: AdminInvoiceRow | null) {
  if (!invoice) return "-";

  if (invoice.stripe_invoice_id?.trim()) {
    return invoice.stripe_invoice_id.trim();
  }

  if (invoice.payment_id?.trim()) {
    return `INV-${invoice.payment_id.slice(0, 8).toUpperCase()}`;
  }

  return "-";
}

function getCustomerRoleLabel(sourceRole: string | null) {
  const v = String(sourceRole || "").toLowerCase();

  if (v === "owner") return "Owner";
  if (v === "agent") return "Agent";
  if (v === "developer") return "Developer";
  if (v === "admin") return "Admin";

  return "-";
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildInvoiceHtml(invoice: AdminInvoiceRow) {
  const meta = asObject(invoice.metadata);

  const subtotal = invoice.amount_subtotal ?? 0;
  const tax = invoice.amount_tax ?? 0;
  const discount = invoice.amount_discount ?? 0;
  const total = invoice.amount_total ?? subtotal + tax - discount;

  const invoiceNumber = getInvoiceNumber(invoice);
  const status = getStatusLabel(invoice.invoice_status);

  const propertyLocation = [meta.property_city, meta.property_province]
    .filter(Boolean)
    .join(", ");

  const paymentMethod = humanizePaymentMethod(invoice);
  const paymentReference = getPaymentReference(invoice);

  const itemTitle = sanitizePublicPaymentText(
    invoice.description ||
      invoice.property_title_snapshot ||
      invoice.plan_name ||
      humanizePaymentType(invoice.payment_type) ||
      "Tetamo Payment"
  );

  const notes =
    sanitizePublicPaymentText(
      meta.admin_notes ||
        meta.billing_note ||
        meta.paymentDescription ||
        meta.payment_description ||
        ""
    ) ||
    "Payment received and recorded by Tetamo. Please keep this invoice for HitPay compliance, accounting, and internal business records.";

  const logoUrl = `${window.location.origin}/tetamo-logo-transparent1.png`;

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(invoiceNumber)} - Tetamo Invoice</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      width: 210mm;
      height: 297mm;
      background: #ffffff;
      font-family: Arial, Helvetica, sans-serif;
      color: #111827;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      width: 210mm;
      height: 297mm;
      padding: 9mm;
      overflow: hidden;
      background: #ffffff;
    }

    .invoice {
      width: 100%;
      height: 100%;
      border: 1px solid #e5e7eb;
      border-radius: 18px;
      overflow: hidden;
      background: #ffffff;
    }

    .hero {
      height: 44mm;
      padding: 9mm 10mm;
      background: linear-gradient(135deg, #111111 0%, #1C1C1E 55%, #3A2A13 100%);
      color: #ffffff;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12mm;
    }

    .brand {
      display: flex;
      gap: 6mm;
      align-items: flex-start;
      min-width: 0;
    }

    .logoBox {
      width: 27mm;
      height: 27mm;
      border-radius: 7mm;
      background: #ffffff;
      border: 1px solid rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3.2mm;
      flex-shrink: 0;
    }

    .logoBox img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .brandSmall {
      margin: 0 0 2.2mm;
      font-size: 8px;
      letter-spacing: 2.4px;
      text-transform: uppercase;
      color: #D8B46A;
      font-weight: 700;
    }

    .brandName {
      margin: 0;
      font-size: 24px;
      line-height: 1;
      font-weight: 800;
    }

    .brandInfo {
      margin: 2.4mm 0 0;
      max-width: 83mm;
      font-size: 9.5px;
      line-height: 1.45;
      color: rgba(255,255,255,0.72);
    }

    .invoiceHead {
      text-align: right;
      flex-shrink: 0;
    }

    .invoiceTitle {
      margin: 0;
      font-size: 30px;
      line-height: 1;
      letter-spacing: -1px;
      font-weight: 900;
    }

    .invoiceNo {
      margin: 3mm 0 0;
      font-size: 10.5px;
      color: rgba(255,255,255,0.82);
      font-weight: 700;
    }

    .badge {
      display: inline-block;
      margin-top: 3mm;
      padding: 1.6mm 3.2mm;
      border-radius: 99px;
      border: 1px solid #bbf7d0;
      background: #ecfdf5;
      color: #047857;
      font-size: 8px;
      font-weight: 900;
      letter-spacing: 1.5px;
    }

    .section {
      padding: 6mm 10mm;
      border-bottom: 1px solid #f1f5f9;
    }

    .topGrid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6mm;
    }

    .box {
      border: 1px solid #eef2f7;
      border-radius: 12px;
      background: #f9fafb;
      padding: 5mm;
    }

    .label {
      margin: 0;
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 1.8px;
      color: #9ca3af;
      font-weight: 800;
    }

    .customer {
      margin: 3mm 0 0;
      font-size: 18px;
      line-height: 1.05;
      font-weight: 800;
    }

    .text {
      margin: 1.5mm 0 0;
      font-size: 10.5px;
      line-height: 1.45;
      color: #4b5563;
    }

    .role {
      display: inline-block;
      margin-top: 3mm;
      padding: 1.5mm 3mm;
      border-radius: 99px;
      border: 1px solid #e5e7eb;
      background: #ffffff;
      font-size: 9px;
      font-weight: 700;
      color: #374151;
    }

    .miniGrid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3mm;
    }

    .mini {
      border: 1px solid #eef2f7;
      border-radius: 10px;
      background: #ffffff;
      padding: 3.2mm;
    }

    .miniValue {
      margin: 1.6mm 0 0;
      font-size: 10px;
      font-weight: 800;
      color: #111827;
      line-height: 1.25;
    }

    .detailsHead {
      display: flex;
      justify-content: space-between;
      gap: 6mm;
      align-items: flex-end;
      margin-bottom: 3mm;
    }

    .ref {
      margin: 0;
      max-width: 86mm;
      font-size: 8.8px;
      color: #6b7280;
      text-align: right;
      word-break: break-word;
    }

    .itemTable {
      border: 1px solid #e5e7eb;
      border-radius: 13px;
      overflow: hidden;
    }

    .tableHeader,
    .tableRow {
      display: grid;
      grid-template-columns: 1fr 40mm;
    }

    .tableHeader {
      background: #f9fafb;
      padding: 3.5mm 5mm;
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 1.8px;
      color: #9ca3af;
      font-weight: 900;
    }

    .tableRow {
      border-top: 1px solid #eef2f7;
      padding: 5mm;
      gap: 5mm;
    }

    .itemTitle {
      margin: 0;
      font-size: 16px;
      line-height: 1.25;
      font-weight: 900;
      color: #111827;
    }

    .itemMeta {
      margin-top: 3mm;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.7mm 5mm;
      font-size: 9.5px;
      color: #4b5563;
      line-height: 1.35;
    }

    .strong {
      font-weight: 800;
      color: #111827;
    }

    .amount {
      text-align: right;
      font-size: 18px;
      font-weight: 900;
      color: #111827;
      white-space: nowrap;
    }

    .bottomGrid {
      display: grid;
      grid-template-columns: 1fr 66mm;
      gap: 6mm;
    }

    .notes {
      border: 1px solid #eef2f7;
      border-radius: 13px;
      background: #f9fafb;
      padding: 4.5mm;
      min-height: 37mm;
    }

    .summary {
      border-radius: 13px;
      background: #1C1C1E;
      color: #ffffff;
      padding: 4.8mm;
    }

    .sumLine {
      display: flex;
      justify-content: space-between;
      gap: 4mm;
      font-size: 10px;
      margin-bottom: 3.2mm;
      color: rgba(255,255,255,0.72);
    }

    .sumLine strong {
      color: #ffffff;
    }

    .totalLine {
      margin-top: 4mm;
      padding-top: 4mm;
      border-top: 1px solid rgba(255,255,255,0.18);
      display: flex;
      justify-content: space-between;
      gap: 4mm;
      align-items: baseline;
    }

    .totalLabel {
      font-size: 12px;
      font-weight: 900;
    }

    .totalAmount {
      font-size: 20px;
      font-weight: 900;
      color: #D8B46A;
      white-space: nowrap;
    }

    .footerGrid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8mm;
      padding: 5.5mm 10mm;
      border-bottom: 1px solid #f1f5f9;
    }

    .footerBottom {
      padding: 4mm 10mm;
      text-align: center;
      font-size: 8.5px;
      color: #9ca3af;
    }
  </style>
</head>

<body>
  <div class="page">
    <div class="invoice">
      <div class="hero">
        <div class="brand">
          <div class="logoBox">
            <img src="${escapeHtml(logoUrl)}" alt="Tetamo" />
          </div>

          <div>
            <p class="brandSmall">Official Payment Invoice</p>
            <h1 class="brandName">Tetamo Pty Ltd</h1>
            <p class="brandInfo">
              ABN 18 689 780 970<br />
              Suite 809 168 Kent Street, Sydney NSW 2000<br />
              www.tetamo.com
            </p>
          </div>
        </div>

        <div class="invoiceHead">
          <h2 class="invoiceTitle">INVOICE</h2>
          <p class="invoiceNo">${escapeHtml(invoiceNumber)}</p>
          <span class="badge">${escapeHtml(status)}</span>
        </div>
      </div>

      <div class="section topGrid">
        <div class="box">
          <p class="label">Bill To</p>
          <p class="customer">${escapeHtml(invoice.customer_name || "Unknown Customer")}</p>
          <p class="text">${escapeHtml(invoice.customer_email || "-")}</p>
          <p class="text">${escapeHtml(invoice.customer_phone || "-")}</p>
          <span class="role">${escapeHtml(getCustomerRoleLabel(invoice.source_role))}</span>
        </div>

        <div class="miniGrid">
          <div class="mini">
            <p class="label">Issue Date</p>
            <p class="miniValue">${escapeHtml(formatDate(invoice.issued_at))}</p>
          </div>

          <div class="mini">
            <p class="label">Paid Date</p>
            <p class="miniValue">${escapeHtml(formatDate(invoice.paid_at))}</p>
          </div>

          <div class="mini">
            <p class="label">Payment Method</p>
            <p class="miniValue">${escapeHtml(paymentMethod)}</p>
          </div>

          <div class="mini">
            <p class="label">Currency</p>
            <p class="miniValue">${escapeHtml((invoice.currency || "IDR").toUpperCase())}</p>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="detailsHead">
          <p class="label">Invoice Details</p>
          <p class="ref">
            Payment Ref:
            <span class="strong">${escapeHtml(paymentReference)}</span>
          </p>
        </div>

        <div class="itemTable">
          <div class="tableHeader">
            <div>Description</div>
            <div style="text-align:right;">Amount</div>
          </div>

          <div class="tableRow">
            <div>
              <p class="itemTitle">${escapeHtml(itemTitle)}</p>

              <div class="itemMeta">
                <div><span class="strong">Bill Type:</span> ${escapeHtml(humanizePaymentType(invoice.payment_type))}</div>
                <div><span class="strong">Plan:</span> ${escapeHtml(invoice.plan_name || "-")}</div>
                <div><span class="strong">Listing Code:</span> ${escapeHtml(invoice.property_code_snapshot || "-")}</div>
                <div><span class="strong">Location:</span> ${escapeHtml(propertyLocation || "-")}</div>
                <div style="grid-column: 1 / -1;"><span class="strong">Property:</span> ${escapeHtml(invoice.property_title_snapshot || "-")}</div>
              </div>
            </div>

            <div class="amount">${escapeHtml(formatAmount(total, invoice.currency))}</div>
          </div>
        </div>
      </div>

      <div class="section bottomGrid">
        <div class="notes">
          <p class="label">Notes</p>
          <p class="text">${escapeHtml(notes)}</p>
        </div>

        <div class="summary">
          <div class="sumLine">
            <span>Subtotal</span>
            <strong>${escapeHtml(formatAmount(subtotal, invoice.currency))}</strong>
          </div>

          <div class="sumLine">
            <span>Tax</span>
            <strong>${escapeHtml(formatAmount(tax, invoice.currency))}</strong>
          </div>

          <div class="sumLine">
            <span>Discount</span>
            <strong>${escapeHtml(formatAmount(discount, invoice.currency))}</strong>
          </div>

          <div class="totalLine">
            <span class="totalLabel">Total Paid</span>
            <span class="totalAmount">${escapeHtml(formatAmount(total, invoice.currency))}</span>
          </div>
        </div>
      </div>

      <div class="footerGrid">
        <div>
          <p class="label">Terms</p>
          <p class="text">
            This invoice was generated by Tetamo for paid marketplace, listing,
            membership, or promotional services.
          </p>
        </div>

        <div>
          <p class="label">Compliance Record</p>
          <p class="text">
            Keep this invoice for HitPay, accounting, payment records, and internal
            business verification requirements.
          </p>
        </div>
      </div>

      <div class="footerBottom">
        Tetamo Pty Ltd · ABN 18 689 780 970 · www.tetamo.com · Official Payment Invoice
      </div>
    </div>
  </div>

  <script>
    window.onload = function () {
      setTimeout(function () {
        window.focus();
        window.print();
      }, 350);
    };
  </script>
</body>
</html>
`;
}

export default function AdminInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const invoiceId = typeof params?.id === "string" ? params.id : "";

  const [invoice, setInvoice] = useState<AdminInvoiceRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadInvoice() {
      if (!invoiceId) {
        setError("Invoice not found.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("admin_invoices_view")
        .select(
          `
            payment_id,
            issued_at,
            paid_at,
            invoice_status,
            currency,
            amount_subtotal,
            amount_discount,
            amount_tax,
            amount_total,
            customer_name,
            customer_email,
            customer_phone,
            property_id,
            property_title_snapshot,
            property_code_snapshot,
            source_role,
            payment_type,
            plan_name,
            duration_days,
            description,
            stripe_invoice_id,
            hosted_invoice_url,
            invoice_pdf_url,
            stripe_checkout_session_id,
            stripe_payment_intent_id,
            metadata
          `
        )
        .eq("payment_id", invoiceId)
        .maybeSingle();

      if (!isMounted) return;

      if (error || !data) {
        console.error("Failed to load invoice detail:", error);
        setError("Gagal memuat invoice.");
        setInvoice(null);
        setLoading(false);
        return;
      }

      const row = data as Omit<AdminInvoiceRow, "invoice_status"> & {
        invoice_status: string | null;
      };

      setInvoice({
        ...row,
        invoice_status: normalizeBillingStatus(row.invoice_status),
      });
      setLoading(false);
    }

    loadInvoice();

    return () => {
      isMounted = false;
    };
  }, [invoiceId]);

  const previewData = useMemo(() => {
    if (!invoice) return null;

    const meta = asObject(invoice.metadata);
    const subtotal = invoice.amount_subtotal ?? 0;
    const tax = invoice.amount_tax ?? 0;
    const discount = invoice.amount_discount ?? 0;
    const total = invoice.amount_total ?? subtotal + tax - discount;

    return {
      invoiceNumber: getInvoiceNumber(invoice),
      status: getStatusLabel(invoice.invoice_status),
      subtotal,
      tax,
      discount,
      total,
      paymentMethod: humanizePaymentMethod(invoice),
      paymentReference: getPaymentReference(invoice),
      propertyLocation: [meta.property_city, meta.property_province]
        .filter(Boolean)
        .join(", "),
      itemTitle: sanitizePublicPaymentText(
        invoice.description ||
          invoice.property_title_snapshot ||
          invoice.plan_name ||
          humanizePaymentType(invoice.payment_type) ||
          "Tetamo Payment"
      ),
    };
  }, [invoice]);

  function handleDownloadA4() {
    if (!invoice) return;

    const printWindow = window.open("", "_blank", "width=900,height=1200");

    if (!printWindow) {
      alert("Please allow pop-ups for Tetamo, then try again.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildInvoiceHtml(invoice));
    printWindow.document.close();
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
        <div className="rounded-[24px] border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
          Loading invoice...
        </div>
      </div>
    );
  }

  if (error || !invoice || !previewData) {
    return (
      <div className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
        <div className="mb-4">
          <Link
            href="/admindashboard/invoices"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-[12px] font-medium text-[#1C1C1E] shadow-sm hover:bg-gray-50 sm:h-11 sm:text-sm"
          >
            <ArrowLeft size={15} />
            Back to Invoices
          </Link>
        </div>

        <div className="rounded-[24px] border border-gray-200 bg-white p-6 text-sm text-red-600 shadow-sm">
          {error || "Invoice not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
      <div className="mb-4 flex flex-col gap-2.5 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/admindashboard/invoices"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-[12px] font-medium text-[#1C1C1E] shadow-sm hover:bg-gray-50 sm:h-11 sm:w-auto sm:text-sm"
        >
          <ArrowLeft size={15} />
          Back to Invoices
        </Link>

        <button
          type="button"
          onClick={handleDownloadA4}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1C1C1E] px-4 text-[12px] font-medium text-white shadow-sm hover:opacity-90 sm:h-11 sm:w-auto sm:text-sm"
        >
          <Download size={15} />
          Download A4 Invoice
        </button>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-[#111111] via-[#1C1C1E] to-[#3A2A13] px-5 py-6 text-white sm:px-8 sm:py-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[24px] border border-white/15 bg-white p-3 shadow-sm">
                <img
                  src="/tetamo-logo-transparent1.png"
                  alt="Tetamo"
                  className="h-full w-full object-contain"
                />
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#D8B46A]">
                  Official Payment Invoice
                </p>
                <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
                  Tetamo Pty Ltd
                </h1>
                <p className="mt-2 max-w-md text-[12px] leading-5 text-white/75 sm:text-sm">
                  ABN 18 689 780 970 · Suite 809 168 Kent Street, Sydney NSW
                  2000 · www.tetamo.com
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-3xl font-bold tracking-tight sm:text-4xl">
                INVOICE
              </p>
              <p className="mt-2 text-sm font-semibold text-white/80">
                {previewData.invoiceNumber}
              </p>
              <span className="mt-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold tracking-[0.18em] text-emerald-700">
                {previewData.status}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-b border-gray-100 px-5 py-5 sm:grid-cols-2 sm:px-8 sm:py-6">
          <div className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Bill To
            </p>
            <p className="mt-3 text-xl font-bold text-[#1C1C1E]">
              {invoice.customer_name || "Unknown Customer"}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {invoice.customer_email || "-"}
            </p>
            <p className="text-sm text-gray-600">
              {invoice.customer_phone || "-"}
            </p>
            <p className="mt-2 inline-flex rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700">
              {getCustomerRoleLabel(invoice.source_role)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                Issue Date
              </p>
              <p className="mt-1 text-sm font-semibold text-[#1C1C1E]">
                {formatDate(invoice.issued_at)}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                Paid Date
              </p>
              <p className="mt-1 text-sm font-semibold text-[#1C1C1E]">
                {formatDate(invoice.paid_at)}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                Payment Method
              </p>
              <p className="mt-1 text-sm font-semibold text-[#1C1C1E]">
                {previewData.paymentMethod}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                Currency
              </p>
              <p className="mt-1 text-sm font-semibold text-[#1C1C1E]">
                {(invoice.currency || "IDR").toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-8 sm:py-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
            Invoice Details
          </p>

          <div className="mt-3 overflow-hidden rounded-3xl border border-gray-200">
            <div className="grid grid-cols-[1fr_150px] bg-gray-50 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
              <p>Description</p>
              <p className="text-right">Amount</p>
            </div>

            <div className="grid gap-4 border-t border-gray-100 px-4 py-5 sm:grid-cols-[1fr_150px]">
              <div>
                <p className="text-xl font-bold leading-snug text-[#1C1C1E]">
                  {previewData.itemTitle}
                </p>

                <div className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                  <p>
                    <span className="font-semibold text-gray-900">
                      Bill Type:
                    </span>{" "}
                    {humanizePaymentType(invoice.payment_type)}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-900">Plan:</span>{" "}
                    {invoice.plan_name || "-"}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-900">
                      Listing Code:
                    </span>{" "}
                    {invoice.property_code_snapshot || "-"}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-900">
                      Location:
                    </span>{" "}
                    {previewData.propertyLocation || "-"}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-2xl font-bold text-[#1C1C1E]">
                  {formatAmount(previewData.total, invoice.currency)}
                </p>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-gray-500">
            Payment Ref:{" "}
            <span className="font-semibold text-gray-900">
              {previewData.paymentReference}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}