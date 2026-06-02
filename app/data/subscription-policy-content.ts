export type LocalizedText = {
  id: string;
  en: string;
};

export type SubscriptionPolicyMetaItem = {
  key: "effectiveDate" | "website" | "contactEmail";
  label: LocalizedText;
  value: LocalizedText;
};

export type SubscriptionPolicyPageContent = {
  title: LocalizedText;
  summary: LocalizedText;
  metadata: SubscriptionPolicyMetaItem[];
};

export type SubscriptionPolicySection = {
  id: string;
  level: number;
  title: LocalizedText;
  body: LocalizedText;
};

export const subscriptionPolicyPageContent: SubscriptionPolicyPageContent = {
  title: {
    id: "Kebijakan Berlangganan",
    en: "Subscription Policy",
  },
  summary: {
    id: "Kebijakan ini menjelaskan syarat, pembayaran, aktivasi, perpanjangan, pembatalan, refund, dan tanggung jawab yang berlaku untuk layanan berlangganan di Tetamo.com.",
    en: "This policy explains the terms, payment rules, activation, renewal, cancellation, refunds, and responsibilities that apply to subscription services on Tetamo.com.",
  },
  metadata: [
    {
      key: "effectiveDate",
      label: {
        id: "Tanggal Berlaku",
        en: "Effective Date",
      },
      value: {
        id: "1 Desember 2024",
        en: "December 1, 2024",
      },
    },
    {
      key: "website",
      label: {
        id: "Website",
        en: "Website",
      },
      value: {
        id: "tetamo.com",
        en: "tetamo.com",
      },
    },
    {
      key: "contactEmail",
      label: {
        id: "Email Kontak",
        en: "Contact Email",
      },
      value: {
        id: "support@tetamo.com",
        en: "support@tetamo.com",
      },
    },
  ],
};

export const subscriptionPolicySections: SubscriptionPolicySection[] = [
  {
    id: "1",
    level: 1,
    title: {
      id: "1. Pendahuluan",
      en: "1. Introduction",
    },
    body: {
      id: `Tanggal Berlaku: {{effectiveDate}}
Website: {{website}}

{{policyTitle}} ini menjelaskan syarat dan ketentuan yang mengatur layanan berbasis langganan yang ditawarkan oleh {{companyName}} (“{{companyName}}”, “kami”, atau “milik kami”). Dengan berlangganan paket berbayar apa pun di {{companyName}}, Anda setuju untuk mematuhi dan terikat oleh kebijakan ini.

{{companyName}} menyediakan layanan berlangganan yang dirancang untuk pemilik properti, agen, agen korporat, developer, dan penyedia layanan yang ingin memasang listing, mempromosikan, atau meningkatkan kehadiran mereka di platform kami.`,
      en: `Effective Date: {{effectiveDate}}
Website: {{website}}

This {{policyTitle}} outlines the terms and conditions governing subscription-based services offered by {{companyName}} (“{{companyName}},” “we,” “our,” or “us”). By subscribing to any paid plan on {{companyName}}, you agree to comply with and be bound by this policy.

{{companyName}} provides subscription services designed for property owners, agents, corporate agents, developers, and service providers who wish to list, promote, or enhance their presence on our platform.`,
    },
  },
  {
    id: "2",
    level: 1,
    title: {
      id: "2. Paket Berlangganan",
      en: "2. Subscription Plans",
    },
    body: {
      id: `{{companyName}} menawarkan berbagai paket berlangganan, yang dapat mencakup:

- paket listing properti;
- paket membership agen;
- langganan agen korporat;
- paket developer;
- upgrade promosi dan featured listing;
- layanan iklan.

Setiap paket dapat mencakup fitur tertentu seperti:

- jumlah listing aktif yang diperbolehkan;
- featured placement atau prioritas visibilitas;
- akses ke leads dan inquiry;
- dashboard analytics;
- tools pemasaran;
- exposure branding.

Detail lengkap setiap paket berlangganan, termasuk harga dan fitur, disediakan di website {{companyName}}.`,
      en: `{{companyName}} offers various subscription plans, which may include:

- property listing packages;
- agent membership plans;
- corporate agent subscriptions;
- developer packages;
- promotional and featured listing upgrades;
- advertising services.

Each plan may include specific features such as:

- number of active listings allowed;
- featured placement or priority visibility;
- access to leads and inquiries;
- dashboard analytics;
- marketing tools;
- branding exposure.

Full details of each subscription plan, including pricing and features, are provided on the {{companyName}} website.`,
    },
  },
  {
    id: "3",
    level: 1,
    title: {
      id: "3. Biaya Berlangganan & Pembayaran",
      en: "3. Subscription Fees & Payment",
    },
    body: {
      id: `3.1 Harga
Biaya berlangganan ditampilkan di website dan dapat berbeda tergantung paket yang dipilih.

3.2 Metode Pembayaran
Kami menerima metode pembayaran yang disetujui dan tersedia di platform. Semua pembayaran harus dilakukan penuh sebelum layanan berlangganan diaktifkan.

3.3 Siklus Penagihan
Langganan dapat ditagihkan:
- bulanan;
- triwulanan;
- tahunan;

tergantung paket yang dipilih.

3.4 Pajak
Semua biaya berlangganan dapat dikenakan pajak yang berlaku berdasarkan hukum Indonesia atau yurisdiksi terkait.`,
      en: `3.1 Pricing
Subscription fees are displayed on the website and may vary depending on the selected plan.

3.2 Payment Methods
We accept approved payment methods available on the platform. All payments must be made in full before activation of subscription services.

3.3 Billing Cycle
Subscriptions may be billed:
- monthly;
- quarterly;
- annually;

depending on the selected plan.

3.4 Taxes
All subscription fees may be subject to applicable taxes under Indonesian law or the relevant jurisdiction.`,
    },
  },
  {
    id: "4",
    level: 1,
    title: {
      id: "4. Aktivasi Langganan",
      en: "4. Subscription Activation",
    },
    body: {
      id: `Langganan Anda akan diaktifkan hanya setelah:

- konfirmasi pembayaran berhasil;
- verifikasi akun (jika berlaku);
- persetujuan oleh {{companyName}} (untuk paket korporat atau premium).

{{companyName}} berhak memverifikasi identitas, lisensi, atau dokumen bisnis sebelum mengaktifkan paket langganan tertentu.`,
      en: `Your subscription will be activated only after:

- successful payment confirmation;
- account verification (if applicable);
- approval by {{companyName}} (for corporate or premium plans).

{{companyName}} reserves the right to verify identity, licence, or business documentation before activating certain subscription plans.`,
    },
  },
  {
    id: "5",
    level: 1,
    title: {
      id: "5. Perpanjangan Otomatis",
      en: "5. Auto-Renewal",
    },
    body: {
      id: `Kecuali dinyatakan lain, langganan dapat diperpanjang otomatis pada akhir setiap siklus penagihan.

Dengan berlangganan, Anda memberi wewenang kepada {{companyName}} untuk mengenakan biaya perpanjangan yang berlaku menggunakan metode pembayaran yang Anda pilih.

Anda dapat menonaktifkan perpanjangan otomatis kapan saja melalui pengaturan akun Anda sebelum tanggal perpanjangan.`,
      en: `Unless otherwise stated, subscriptions may automatically renew at the end of each billing cycle.

By subscribing, you authorise {{companyName}} to charge the applicable renewal fee using your selected payment method.

You may disable auto-renewal at any time through your account settings before the renewal date.`,
    },
  },
  {
    id: "6",
    level: 1,
    title: {
      id: "6. Kebijakan Pembatalan",
      en: "6. Cancellation Policy",
    },
    body: {
      id: `6.1 Pembatalan oleh Pengguna
Pelanggan dapat membatalkan langganan kapan saja. Namun:

- pembatalan tidak memberi hak kepada pelanggan untuk mendapatkan refund pada periode tagihan berjalan;
- akses tetap aktif hingga akhir masa berlangganan yang telah dibayar.

6.2 Pengakhiran oleh {{companyName}}
{{companyName}} berhak menangguhkan atau mengakhiri langganan jika:

- pengguna melanggar kebijakan platform;
- ditemukan listing yang curang atau menyesatkan;
- lisensi atau dokumen yang diwajibkan tidak valid;
- terjadi sengketa pembayaran atau chargeback.

Tidak ada refund yang akan diberikan dalam kasus pelanggaran kebijakan.`,
      en: `6.1 User-Initiated Cancellation
Subscribers may cancel their subscription at any time. However:

- cancellation does not entitle the subscriber to a refund for the current billing period;
- access will remain active until the end of the paid term.

6.2 {{companyName}}-Initiated Termination
{{companyName}} reserves the right to suspend or terminate subscriptions if:

- the user violates platform policies;
- fraudulent or misleading listings are detected;
- required licences or documentation are invalid;
- payment disputes or chargebacks occur.

No refunds will be issued in cases of policy violation.`,
    },
  },
  {
    id: "7",
    level: 1,
    title: {
      id: "7. Kebijakan Refund",
      en: "7. Refund Policy",
    },
    body: {
      id: `Kecuali dinyatakan lain dalam promosi atau perjanjian tertentu:

- semua pembayaran langganan tidak dapat dikembalikan;
- tidak ada refund parsial untuk waktu yang tidak terpakai;
- tidak ada refund untuk pembatalan lebih awal.

Refund hanya dapat dipertimbangkan dalam kasus:

- pembayaran ganda;
- kesalahan teknis yang disebabkan oleh {{companyName}};
- kesalahan pemrosesan pembayaran.

Semua permintaan refund harus diajukan secara tertulis ke {{contactEmail}}.`,
      en: `Unless otherwise stated in a specific promotion or agreement:

- all subscription payments are non-refundable;
- there are no partial refunds for unused time;
- there are no refunds for early cancellation.

Refunds may only be considered in cases of:

- duplicate payments;
- technical errors caused by {{companyName}};
- payment processing errors.

All refund requests must be submitted in writing to {{contactEmail}}.`,
    },
  },
  {
    id: "8",
    level: 1,
    title: {
      id: "8. Perubahan pada Paket Langganan",
      en: "8. Changes to Subscription Plans",
    },
    body: {
      id: `{{companyName}} berhak untuk:

- mengubah fitur langganan;
- memperbarui harga;
- memperkenalkan tingkatan langganan baru;
- menghentikan paket tertentu.

Pengguna akan diberi pemberitahuan atas perubahan harga yang signifikan sebelum perpanjangan.`,
      en: `{{companyName}} reserves the right to:

- modify subscription features;
- update pricing;
- introduce new subscription tiers;
- discontinue certain plans.

Users will be notified of significant pricing changes prior to renewal.`,
    },
  },
  {
    id: "9",
    level: 1,
    title: {
      id: "9. Tanggung Jawab Pengguna",
      en: "9. User Responsibilities",
    },
    body: {
      id: `Pelanggan setuju untuk:

- memberikan informasi listing yang akurat;
- mematuhi peraturan real estate Indonesia (jika berlaku);
- menjaga lisensi tetap valid bila diwajibkan;
- merespons inquiry secara profesional;
- menghindari posting konten yang menyesatkan, ilegal, atau dilarang.

{{companyName}} bertindak sebagai platform marketplace dan tidak bertanggung jawab atas transaksi yang dilakukan antara para pengguna.`,
      en: `Subscribers agree to:

- provide accurate listing information;
- comply with Indonesian real estate regulations (if applicable);
- maintain valid licences where required;
- respond to inquiries professionally;
- avoid posting misleading, illegal, or prohibited content.

{{companyName}} acts as a marketplace platform and is not responsible for transactions conducted between users.`,
    },
  },
  {
    id: "10",
    level: 1,
    title: {
      id: "10. Batasan Tanggung Jawab",
      en: "10. Limitation of Liability",
    },
    body: {
      id: `{{companyName}} tidak menjamin:

- jumlah leads atau inquiry tertentu;
- konversi penjualan atau penyewaan;
- ranking atau visibilitas tertentu di luar manfaat langganan yang secara jelas dinyatakan.

Kami menyediakan exposure dan tools platform, tetapi keberhasilan tetap bergantung pada kualitas listing, harga, dan kondisi pasar.`,
      en: `{{companyName}} does not guarantee:

- any number of leads or inquiries;
- sales or rental conversions;
- any specific ranking or visibility beyond the stated subscription benefits.

We provide exposure and platform tools, but success still depends on listing quality, pricing, and market conditions.`,
    },
  },
  {
    id: "11",
    level: 1,
    title: {
      id: "11. Perubahan Kebijakan",
      en: "11. Amendments",
    },
    body: {
      id: `{{companyName}} berhak memperbarui Kebijakan Berlangganan ini kapan saja. Versi terbaru akan dipublikasikan di website dengan tanggal berlaku yang diperbarui.`,
      en: `{{companyName}} reserves the right to update this Subscription Policy at any time. The latest version will be published on the website with an updated effective date.`,
    },
  },
];