export type LocalizedText = {
  id: string;
  en: string;
};

export type SubscriptionPolicyMetaItem = {
  key: string;
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
  level: 1 | 2;
  title: LocalizedText;
  body: LocalizedText;
};

export const subscriptionPolicyPageContent: SubscriptionPolicyPageContent = {
  title: {
    id: "KEBIJAKAN BERLANGGANAN TETAMO",
    en: "TETAMO SUBSCRIPTION POLICY",
  },
  summary: {
    id: "Kebijakan ini menjelaskan syarat, biaya, aktivasi, pembatalan, perpanjangan, dan tanggung jawab pengguna atas layanan berlangganan Tetamo.",
    en: "This policy explains the terms, fees, activation, cancellation, renewal, and user responsibilities for Tetamo subscription services.",
  },
  metadata: [
    {
      key: "effectiveDate",
      label: {
        id: "Tanggal Berlaku",
        en: "Effective Date",
      },
      value: {
        id: "1 Januari 2026",
        en: "1 January 2026",
      },
    },
    {
      key: "website",
      label: {
        id: "Website",
        en: "Website",
      },
      value: {
        id: "www.tetamo.com",
        en: "www.tetamo.com",
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
      id: `Kebijakan Berlangganan ini menjelaskan syarat dan ketentuan yang mengatur layanan berbasis langganan yang ditawarkan oleh Tetamo (“Tetamo”, “kami”, “milik kami”, atau “kita”). Dengan berlangganan salah satu paket berbayar Tetamo, Anda setuju untuk mematuhi dan terikat oleh kebijakan ini.

Tetamo menyediakan layanan berlangganan yang dirancang untuk pemilik properti, agen, corporate agent, developer, dan penyedia layanan yang ingin memasang iklan, mempromosikan listing, atau meningkatkan kehadiran mereka di platform kami.`,
      en: `This Subscription Policy outlines the terms and conditions governing subscription-based services offered by Tetamo (“Tetamo,” “we,” “our,” or “us”). By subscribing to any Tetamo paid plan, you agree to comply with and be bound by this policy.

Tetamo provides subscription services designed for property owners, agents, corporate agents, developers, and service providers who wish to list, promote, or enhance their presence on our platform.`,
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
      id: `Tetamo dapat menawarkan berbagai jenis paket berlangganan, termasuk namun tidak terbatas pada paket listing properti, keanggotaan agen, langganan corporate agent, paket developer, serta fitur promosi atau listing unggulan.

Fitur, durasi, kuota, visibilitas, dan manfaat dari setiap paket dapat berbeda. Detail lengkap setiap paket akan ditampilkan pada halaman pembelian, halaman upgrade, atau materi resmi Tetamo yang berlaku pada saat Anda melakukan langganan.`,
      en: `Tetamo may offer various subscription plans, including but not limited to property listing packages, agent memberships, corporate agent subscriptions, developer packages, and promotional or featured listing services.

The features, duration, quotas, visibility, and benefits of each plan may differ. Full details of each plan will be displayed on the applicable purchase page, upgrade page, or official Tetamo materials in effect at the time of subscription.`,
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
      id: `Semua biaya berlangganan harus dibayar sesuai harga yang ditampilkan pada saat pembelian. Dengan melanjutkan pembayaran, Anda menyetujui harga, periode berlangganan, dan fitur yang tercantum pada paket yang dipilih.

Akses ke fitur berbayar dapat dibatasi, ditangguhkan, atau tidak diaktifkan apabila pembayaran belum berhasil diterima, belum diverifikasi, atau kemudian dibatalkan oleh penyedia pembayaran.`,
      en: `All subscription fees must be paid according to the price displayed at the time of purchase. By proceeding with payment, you agree to the price, subscription period, and features stated in the selected plan.

Access to paid features may be limited, suspended, or not activated if payment has not been successfully received, verified, or is later reversed by the payment provider.`,
    },
  },
  {
    id: "3.1",
    level: 2,
    title: {
      id: "3.1 Harga",
      en: "3.1 Pricing",
    },
    body: {
      id: `Harga paket berlangganan Tetamo dapat berbeda berdasarkan jenis pengguna, kategori layanan, jangka waktu paket, atau promosi tertentu. Semua harga yang ditampilkan di platform merupakan harga yang berlaku pada saat transaksi dilakukan, kecuali disebutkan lain secara tertulis.

Tetamo berhak memperbarui harga kapan saja untuk pembelian baru, perpanjangan berikutnya, atau paket yang diubah, dengan pemberitahuan yang wajar sebagaimana dijelaskan dalam kebijakan ini.`,
      en: `Tetamo subscription pricing may vary depending on user type, service category, plan duration, or specific promotions. All prices displayed on the platform are the prices in effect at the time of the transaction, unless otherwise stated in writing.

Tetamo reserves the right to update pricing at any time for new purchases, future renewals, or modified plans, with reasonable notice as described in this policy.`,
    },
  },
  {
    id: "3.2",
    level: 2,
    title: {
      id: "3.2 Metode Pembayaran",
      en: "3.2 Payment Methods",
    },
    body: {
      id: `Tetamo dapat menerima metode pembayaran tertentu yang tersedia di platform, seperti kartu debit, kartu kredit, transfer bank, e-wallet, atau metode pembayaran lain yang didukung dari waktu ke waktu.

Anda bertanggung jawab untuk memastikan bahwa informasi pembayaran yang diberikan akurat, sah, dan masih berlaku. Kegagalan pembayaran, penolakan transaksi, atau pembalikan dana oleh penyedia pembayaran dapat memengaruhi status langganan Anda.`,
      en: `Tetamo may accept certain payment methods available on the platform, such as debit cards, credit cards, bank transfers, e-wallets, or other payment methods supported from time to time.

You are responsible for ensuring that the payment information you provide is accurate, lawful, and valid. Payment failures, transaction rejections, or charge reversals by a payment provider may affect the status of your subscription.`,
    },
  },
  {
    id: "3.3",
    level: 2,
    title: {
      id: "3.3 Siklus Penagihan",
      en: "3.3 Billing Cycle",
    },
    body: {
      id: `Siklus penagihan dapat bersifat bulanan, triwulanan, tahunan, atau untuk jangka waktu tetap tertentu, tergantung pada paket yang Anda pilih. Masa berlangganan dimulai saat paket berhasil diaktifkan, kecuali dinyatakan berbeda pada halaman pembelian.

Apabila suatu paket memiliki perpanjangan otomatis, penagihan berikutnya akan dilakukan pada awal periode perpanjangan yang baru sesuai ketentuan paket tersebut.`,
      en: `The billing cycle may be monthly, quarterly, yearly, or for another fixed period, depending on the plan you select. The subscription term begins when the plan is successfully activated, unless otherwise stated on the purchase page.

If a plan includes auto-renewal, the next billing will occur at the start of the renewed subscription period in accordance with that plan’s terms.`,
    },
  },
  {
    id: "3.4",
    level: 2,
    title: {
      id: "3.4 Pajak",
      en: "3.4 Taxes",
    },
    body: {
      id: `Seluruh pajak, pungutan, biaya administrasi, atau biaya transaksi yang diwajibkan oleh hukum atau oleh penyedia pembayaran dapat ditambahkan ke harga paket apabila berlaku. Anda bertanggung jawab atas kewajiban pajak yang timbul dari penggunaan layanan kami, kecuali apabila secara tegas dinyatakan bahwa pajak sudah termasuk.

Apabila terdapat kewajiban pemotongan atau pelaporan pajak tertentu berdasarkan yurisdiksi Anda, Anda tetap bertanggung jawab untuk memenuhinya sesuai hukum yang berlaku.`,
      en: `Any taxes, levies, administrative charges, or transaction fees required by law or by a payment provider may be added to the plan price where applicable. You are responsible for any tax obligations arising from your use of our services unless taxes are expressly stated to be included.

If your jurisdiction requires any withholding or tax reporting in connection with your payment or use of the service, you remain responsible for complying with those legal requirements.`,
    },
  },
  {
    id: "4",
    level: 1,
    title: {
      id: "4. Aktivasi Berlangganan",
      en: "4. Subscription Activation",
    },
    body: {
      id: `Langganan biasanya akan aktif setelah pembayaran berhasil diterima dan, bila diperlukan, setelah proses verifikasi internal Tetamo selesai dilakukan. Waktu aktivasi dapat berbeda tergantung metode pembayaran, jenis paket, dan kebutuhan verifikasi akun atau konten.

Tetamo berhak menunda aktivasi apabila terdapat indikasi penipuan, pelanggaran kebijakan, data yang tidak akurat, atau kebutuhan pemeriksaan tambahan sebelum layanan diberikan.`,
      en: `A subscription will generally become active after successful receipt of payment and, where required, completion of Tetamo’s internal verification process. Activation timing may vary depending on the payment method, plan type, and any account or content verification requirements.

Tetamo reserves the right to delay activation where there are indications of fraud, policy violations, inaccurate information, or a need for additional review before service is provided.`,
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
      id: `Beberapa paket berlangganan dapat diperpanjang secara otomatis pada akhir masa berlangganan agar layanan tetap berjalan tanpa jeda. Jika paket Anda termasuk auto-renewal, Anda memberi wewenang kepada Tetamo atau penyedia pembayaran kami untuk menagih metode pembayaran yang tersimpan untuk periode berikutnya.

Anda bertanggung jawab untuk menonaktifkan perpanjangan otomatis sebelum tanggal penagihan berikutnya apabila tidak ingin melanjutkan paket. Jika auto-renewal tidak berhasil diproses, layanan dapat berhenti, diturunkan, atau dibatasi sampai pembayaran berikutnya berhasil.`,
      en: `Certain subscription plans may renew automatically at the end of the subscription term so that service continues without interruption. If your plan includes auto-renewal, you authorize Tetamo or our payment provider to charge your saved payment method for the next billing period.

You are responsible for turning off auto-renewal before the next billing date if you do not wish to continue the plan. If auto-renewal cannot be processed successfully, services may stop, downgrade, or be restricted until payment is completed.`,
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
      id: `Pembatalan langganan akan tunduk pada jenis paket, metode pembelian, dan status layanan pada saat pembatalan diminta. Permintaan pembatalan tidak otomatis membatalkan transaksi yang sudah diproses atau menjamin pengembalian dana.

Ketentuan yang lebih spesifik mengenai pembatalan oleh pengguna dan penghentian oleh Tetamo dijelaskan pada subbagian di bawah ini.`,
      en: `Subscription cancellation is subject to the type of plan, purchase method, and service status at the time cancellation is requested. A cancellation request does not automatically reverse a processed transaction or guarantee a refund.

More specific terms regarding user-initiated cancellation and Tetamo-initiated termination are set out in the subsections below.`,
    },
  },
  {
    id: "6.1",
    level: 2,
    title: {
      id: "6.1 Pembatalan oleh Pengguna",
      en: "6.1 User-Initiated Cancellation",
    },
    body: {
      id: `Anda dapat membatalkan langganan sesuai fitur pembatalan yang tersedia di akun Anda atau dengan menghubungi Tetamo melalui saluran resmi yang berlaku. Kecuali diwajibkan oleh hukum, pembatalan biasanya berlaku pada akhir periode berlangganan yang sedang berjalan.

Setelah pembatalan berlaku, Anda dapat kehilangan akses ke fitur premium, prioritas promosi, kuota tertentu, atau manfaat paket lainnya. Biaya yang sudah dibayarkan umumnya tidak dapat dikembalikan untuk sisa periode yang belum digunakan.`,
      en: `You may cancel your subscription using any cancellation feature available in your account or by contacting Tetamo through the applicable official channels. Unless required by law, cancellation will generally take effect at the end of the current subscription period.

Once cancellation takes effect, you may lose access to premium features, promotional priority, plan-specific quotas, or other subscription benefits. Fees already paid are generally not refundable for any unused remainder of the term.`,
    },
  },
  {
    id: "6.2",
    level: 2,
    title: {
      id: "6.2 Penghentian oleh Tetamo",
      en: "6.2 Tetamo-Initiated Termination",
    },
    body: {
      id: `Tetamo dapat menangguhkan, membatasi, atau mengakhiri langganan Anda sewaktu-waktu apabila kami menilai terdapat pelanggaran terhadap syarat layanan, kebijakan platform, hukum yang berlaku, hak pihak ketiga, atau apabila terdapat indikasi penipuan, penyalahgunaan, spam, konten terlarang, atau tunggakan pembayaran.

Dalam keadaan tertentu, Tetamo dapat menghapus manfaat paket, menonaktifkan fitur tertentu, menurunkan visibilitas listing, atau menutup akses akun tanpa kewajiban memberikan pengembalian dana, sejauh diperbolehkan oleh hukum yang berlaku.`,
      en: `Tetamo may suspend, restrict, or terminate your subscription at any time if we determine that there has been a breach of our terms of service, platform policies, applicable law, third-party rights, or if there are signs of fraud, abuse, spam, prohibited content, or unpaid charges.

In certain circumstances, Tetamo may remove plan benefits, disable specific features, reduce listing visibility, or close account access without any obligation to provide a refund, to the extent permitted by applicable law.`,
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
      id: `Kecuali diwajibkan oleh hukum yang berlaku, seluruh pembayaran langganan bersifat final dan tidak dapat dikembalikan setelah layanan diaktifkan, diperpanjang, atau mulai digunakan. Hal ini termasuk biaya untuk fitur promosi, keanggotaan, listing unggulan, dan paket berjangka lainnya.

Tetamo dapat mempertimbangkan refund secara terbatas dalam kasus tertentu, seperti tagihan ganda yang jelas, kesalahan sistem, pembayaran yang tidak sah yang telah diverifikasi, atau keadaan lain yang secara tegas kami setujui. Keputusan refund, jika ada, berada pada kebijakan Tetamo dan/atau ketentuan penyedia pembayaran yang relevan.`,
      en: `Unless required by applicable law, all subscription payments are final and non-refundable once the service has been activated, renewed, or begun to be used. This includes fees for promotional features, memberships, featured listings, and other fixed-term packages.

Tetamo may consider a limited refund in certain cases, such as clear duplicate billing, system error, verified unauthorized payment, or other circumstances expressly approved by us. Any refund decision, if made, remains at Tetamo’s discretion and/or subject to the rules of the relevant payment provider.`,
    },
  },
  {
    id: "8",
    level: 1,
    title: {
      id: "8. Perubahan Paket Berlangganan",
      en: "8. Changes to Subscription Plans",
    },
    body: {
      id: `Tetamo dapat mengubah, mengganti, menambah, menghapus, atau menghentikan paket berlangganan, fitur, kuota, manfaat, struktur harga, atau syarat penggunaan paket kapan saja. Perubahan tersebut dapat berlaku untuk pembelian baru, upgrade, downgrade, atau siklus perpanjangan berikutnya.

Apabila perubahan tersebut berdampak material terhadap langganan aktif Anda, Tetamo akan berupaya memberikan pemberitahuan yang wajar melalui website, dashboard, email, atau saluran resmi lainnya sebelum perubahan berlaku.`,
      en: `Tetamo may change, replace, add, remove, or discontinue subscription plans, features, quotas, benefits, pricing structures, or plan terms at any time. Such changes may apply to new purchases, upgrades, downgrades, or future renewal cycles.

If a change materially affects your active subscription, Tetamo will make reasonable efforts to provide notice through the website, dashboard, email, or other official channels before the change takes effect.`,
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
      id: `Sebagai pengguna layanan berlangganan Tetamo, Anda bertanggung jawab untuk memberikan informasi yang akurat, menjaga keamanan akun, memastikan bahwa materi atau listing yang Anda unggah sah untuk digunakan, dan mematuhi seluruh hukum, peraturan, serta kebijakan platform yang berlaku.

Anda juga bertanggung jawab untuk meninjau detail paket sebelum membeli, memantau status perpanjangan atau pembatalan, serta memastikan metode pembayaran Anda aktif dan valid. Penyalahgunaan layanan, representasi yang menyesatkan, atau pelanggaran hak pihak lain dapat menyebabkan pembatasan atau penghentian layanan.`,
      en: `As a user of Tetamo subscription services, you are responsible for providing accurate information, maintaining account security, ensuring that any materials or listings you upload are lawful and authorized for use, and complying with all applicable laws, regulations, and platform policies.

You are also responsible for reviewing plan details before purchase, monitoring renewal or cancellation status, and keeping your payment method valid and active. Misuse of the service, misleading representations, or infringement of third-party rights may result in service restrictions or termination.`,
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
      id: `Sejauh diizinkan oleh hukum, layanan berlangganan Tetamo disediakan “apa adanya” dan “sebagaimana tersedia”. Tetamo tidak menjamin bahwa layanan akan selalu bebas gangguan, bebas kesalahan, selalu tersedia, atau selalu menghasilkan prospek, penjualan, sewa, engagement, atau hasil komersial tertentu.

Dalam batas maksimum yang diizinkan hukum, Tetamo tidak bertanggung jawab atas kerugian tidak langsung, insidental, khusus, konsekuensial, kehilangan data, kehilangan reputasi, kehilangan keuntungan, atau kerugian bisnis yang timbul dari atau berkaitan dengan penggunaan layanan berlangganan kami.`,
      en: `To the extent permitted by law, Tetamo subscription services are provided “as is” and “as available.” Tetamo does not guarantee that the service will always be uninterrupted, error-free, continuously available, or that it will always generate leads, sales, rentals, engagement, or any particular commercial outcome.

To the maximum extent permitted by law, Tetamo shall not be liable for any indirect, incidental, special, consequential, data loss, reputational loss, loss of profits, or business losses arising out of or related to your use of our subscription services.`,
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
      id: `Tetamo dapat memperbarui atau mengubah Kebijakan Berlangganan ini dari waktu ke waktu untuk mencerminkan perubahan layanan, fitur, operasional, persyaratan hukum, atau praktik bisnis kami. Versi terbaru akan dipublikasikan di website kami dengan tanggal berlaku yang diperbarui.

Dengan tetap menggunakan layanan berlangganan Tetamo setelah perubahan tersebut berlaku, Anda dianggap telah membaca, memahami, dan menyetujui versi kebijakan yang telah diperbarui.`,
      en: `Tetamo may update or modify this Subscription Policy from time to time to reflect changes to our services, features, operations, legal requirements, or business practices. The latest version will be published on our website with an updated effective date.

By continuing to use Tetamo subscription services after such changes take effect, you are deemed to have read, understood, and agreed to the updated version of this policy.`,
    },
  },
];