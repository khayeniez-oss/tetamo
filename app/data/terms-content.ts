export type LocalizedText = {
  id: string;
  en: string;
};

export type TermsSection = {
  id: string;
  title: LocalizedText;
  body: LocalizedText;
};

export const TERMS_SECTIONS: TermsSection[] = [
  {
    id: "intro",
    title: {
      id: "1. Pendahuluan",
      en: "1. Introduction",
    },
    body: {
      id: `Tanggal Berlaku: {{effectiveDate}}

Selamat datang di {{companyName}}.
Syarat dan Ketentuan ini mengatur penggunaan layanan listing properti yang disediakan oleh {{companyName}} pada website dan platform kami. Dengan membeli, mengakses, atau menggunakan layanan kami, Anda dianggap telah membaca, memahami, dan menyetujui syarat ini. Jika Anda tidak setuju, mohon untuk tidak menggunakan layanan kami.

Di bawah ini adalah ketentuan hukum penting yang berlaku bagi seluruh pengunjung, pengguna, pengiklan, agen, agensi, broker, developer, dan pihak lain yang menggunakan platform kami. Ketentuan ini dibuat untuk melindungi kedua belah pihak dan membantu menciptakan pengalaman penggunaan yang lebih aman, jelas, dan profesional.

Perjanjian ini dapat mencakup:
a. Syarat Pembelian dan Ketentuan Umum;
b. Kebijakan Privasi, Terms of Service, dan Acceptable Use Policy;
c. Sales Order yang relevan;
d. Ketentuan tambahan lain yang kami nyatakan berlaku untuk produk atau layanan tertentu.

Perjanjian ini menggantikan seluruh diskusi, representasi, dan pengaturan sebelumnya antara Anda dan kami mengenai pokok yang sama. Jika ada pertentangan antara dokumen-dokumen tersebut, maka urutan berlakunya mengikuti ketentuan yang kami tentukan dalam perjanjian utama.

Kami berhak memperbarui syarat pembelian atau syarat penggunaan kapan saja melalui platform atau pemberitahuan tertulis. Penggunaan Anda yang berkelanjutan terhadap platform dan layanan akan dianggap sebagai penerimaan atas perubahan tersebut.

Definisi penting:
- “Platform” berarti website, desktop site, mobile site, aplikasi mobile, sistem terkait, dan media lain yang kami operasikan untuk menampilkan listing atau konten.
- “Advertisement Material” atau “Listings” berarti semua materi listing atau promosi yang Anda unggah atau minta kami unggah atas nama Anda.
- “Product/Service” berarti produk atau layanan yang Anda beli, langgani, atau gunakan dari kami.
- “You” berarti pelanggan, pengguna, atau entitas yang menggunakan layanan kami.
- “We / Us / Our / Company” berarti {{companyName}}.`,
      en: `Effective Date: {{effectiveDate}}

Welcome to {{companyName}}.
These Terms and Conditions govern your use of the property listing services provided by {{companyName}} on our website and platform. By purchasing, accessing, or using our services, you confirm that you have read, understood, and accepted these terms. If you disagree, please do not use our services.

Below are important legal terms that apply to all visitors, users, advertisers, agents, agencies, brokers, developers, and any other parties using our platform. These terms are intended to protect both sides and create a safer, clearer, and more professional experience.

This agreement may include:
a. Terms of Purchase and General Terms;
b. Privacy Policy, Terms of Service, and Acceptable Use Policy;
c. The relevant Sales Order;
d. Any additional written terms that we specify as applicable to certain products or services.

This agreement replaces all prior discussions, representations, and arrangements between you and us on the same subject. If there is any inconsistency between the documents, the order of priority will follow the rules set out in the main agreement.

We reserve the right to amend the terms of purchase or terms of use at any time through the platform or by written notice. Your continued use of the platform and services will be treated as acceptance of those changes.

Key definitions:
- “Platform” means the website, desktop site, mobile site, mobile applications, related systems, and other media we operate to display listings or content.
- “Advertisement Material” or “Listings” means all listing or promotional material that you upload or ask us to upload on your behalf.
- “Product/Service” means any product or service you buy, subscribe to, or use from us.
- “You” means the customer, user, or entity using our services.
- “We / Us / Our / Company” means {{companyName}}.`,
    },
  },
  {
    id: "validity-payment",
    title: {
      id: "2. Masa Berlaku dan Pembayaran",
      en: "2. Validity and Payment",
    },
    body: {
      id: `Perjanjian ini mulai berlaku pada tanggal Anda menyetujui Sales Order, mulai menggunakan produk/layanan, atau menandatangani dokumen yang relevan, mana yang terjadi lebih dahulu.

Setiap produk atau layanan berlaku untuk masa aktif yang ditentukan dalam Sales Order atau pemberitahuan tertulis kami. Setelah masa aktif berakhir, layanan akan berakhir secara otomatis kecuali Anda melakukan perpanjangan.

Ketentuan penting:
1. Bagian layanan yang tidak digunakan sampai akhir masa aktif akan hangus otomatis.
2. Bagian yang tidak terpakai tidak dapat dipindahkan ke paket berikutnya.
3. Tidak ada pembatalan Sales Order dan tidak ada refund, kecuali diwajibkan oleh hukum yang berlaku.

Pembayaran:
- Kami hanya wajib mengaktifkan produk/layanan setelah persetujuan Anda atas perjanjian ini dan setelah pembayaran penuh diterima, kecuali kami menyetujui hal lain secara tertulis.
- Harga yang ditampilkan belum termasuk pajak, bea, atau pungutan lain yang mungkin berlaku.
- Invoice dapat dikirim melalui email atau metode elektronik lain yang kami tentukan.
- Kegagalan menerima invoice tidak menghapus kewajiban Anda untuk membayar tepat waktu.
- Keterlambatan pembayaran dapat dikenakan bunga keterlambatan dan langkah penagihan lebih lanjut.
- Anda setuju bahwa kami dapat mengambil langkah hukum yang wajar untuk menagih pembayaran yang jatuh tempo, termasuk biaya hukum yang timbul karena keterlambatan tersebut.`,
      en: `This agreement takes effect on the date you approve the Sales Order, begin using the product/service, or sign the relevant document, whichever happens first.

Each product or service remains valid for the active period stated in the Sales Order or in our written notice. Once that period ends, the service ends automatically unless you renew it.

Important rules:
1. Any unused portion of the service at the end of the active period will be automatically forfeited.
2. Any unused portion cannot be carried forward to the next package.
3. Sales Orders are non-cancellable and non-refundable unless required by applicable law.

Payment:
- We are only required to activate the product/service after you accept this agreement and full payment is received, unless we agree otherwise in writing.
- Prices shown exclude taxes, duties, or other applicable charges.
- Invoices may be sent by email or another electronic method we specify.
- Failure to receive an invoice does not remove your obligation to pay on time.
- Late payments may result in late interest and further recovery action.
- You agree that we may take reasonable legal steps to recover overdue payments, including legal costs caused by the delay.`,
    },
  },
  {
    id: "privacy-confidentiality",
    title: {
      id: "3. Privasi Data dan Kerahasiaan",
      en: "3. Data Privacy and Confidentiality",
    },
    body: {
      id: `Anda setuju bahwa kami dapat mengumpulkan, menggunakan, menyimpan, memproses, dan menampilkan informasi pribadi Anda sesuai dengan Kebijakan Privasi kami, termasuk untuk kebutuhan operasional platform, komunikasi, dan fungsi listing.

Kami dapat menampilkan detail kontak tertentu pada platform agar pengguna dapat menghubungi Anda terkait listing atau layanan yang Anda gunakan.

Anda wajib memastikan bahwa:
- data pribadi dan detail kontak yang diberikan kepada kami akurat, terbaru, dan lengkap;
- alamat email serta nomor telepon Anda aktif dan dipantau secara berkala;
- Anda memberi tahu kami jika ada perubahan detail kontak.

Jika Anda memberikan data pribadi milik staf, agen, atau perwakilan lain kepada kami, Anda menjamin bahwa Anda telah memperoleh persetujuan yang diperlukan dari mereka.

Kerahasiaan:
- Anda wajib menjaga seluruh informasi rahasia yang diperoleh sehubungan dengan perjanjian ini.
- Anda tidak boleh mengungkapkan informasi rahasia kepada pihak lain tanpa persetujuan tertulis kami, kecuali diwajibkan oleh hukum.
- Kewajiban kerahasiaan tetap berlaku meskipun perjanjian ini telah berakhir.
- Anda bertanggung jawab atas kerugian yang timbul jika terjadi pelanggaran kerahasiaan oleh Anda atau pihak yang Anda beri akses.`,
      en: `You agree that we may collect, use, store, process, and display your personal information in accordance with our Privacy Policy, including for platform operations, communications, and listing functionality.

We may display certain contact details on the platform so users can contact you about your listing or the service you use.

You must ensure that:
- the personal information and contact details you provide are accurate, current, and complete;
- your email address and phone number are active and regularly monitored;
- you notify us promptly of any changes to your contact details.

If you provide personal information belonging to your staff, agents, or other representatives, you warrant that you have obtained the necessary consent from them.

Confidentiality:
- You must keep all confidential information obtained in connection with this agreement confidential.
- You must not disclose confidential information to any other party without our written consent, unless required by law.
- Confidentiality obligations survive termination of this agreement.
- You are responsible for losses arising from any confidentiality breach by you or anyone you give access to.`,
    },
  },
  {
    id: "obligations",
    title: {
      id: "4. Kewajiban Anda",
      en: "4. Your Obligations",
    },
    body: {
      id: `Sebagai pengguna, agen, pengiklan, broker, developer, atau pihak lain yang menggunakan platform kami, Anda wajib:

1. menggunakan akun dan langganan hanya untuk tujuan yang sah;
2. mematuhi seluruh hukum, regulasi, standar iklan, dan ketentuan perlindungan konsumen yang berlaku;
3. memastikan seluruh listing, materi iklan, konten, dan informasi yang Anda unggah:
   - tidak melanggar hukum;
   - tidak menyesatkan atau menipu;
   - tidak melanggar hak cipta, merek, privasi, atau hak pihak ketiga;
   - tidak memuat konten fitnah, penipuan, atau materi yang dapat menimbulkan tanggung jawab hukum bagi kami;
   - tidak menggunakan branding, logo, atau watermark kompetitor tanpa izin;
   - tidak mengandung link yang tidak relevan dengan listing atau layanan yang diiklankan.

Anda juga wajib:
- menggunakan kategori yang tepat saat menayangkan listing;
- memastikan bahwa setiap listing mewakili satu properti yang jelas;
- tidak menggunakan bot, software pihak ketiga, hack, mod, scraping, atau metode lain untuk mengambil data dari platform;
- menjaga keamanan akun, username, dan password Anda;
- segera memberi tahu kami jika ada penggunaan akun tanpa izin atau pelanggaran keamanan;
- memperlakukan tim kami dengan sopan dan profesional setiap saat.

Kami berhak memantau akses, membatasi penggunaan, meminta reset password, atau mengambil tindakan lain yang wajar untuk menjaga keamanan dan kualitas platform.`,
      en: `As a user, agent, advertiser, broker, developer, or any other party using our platform, you must:

1. use your account and subscription only for lawful purposes;
2. comply with all applicable laws, regulations, advertising standards, and consumer protection rules;
3. ensure that all listings, advertisements, content, and information you upload:
   - are lawful;
   - are not misleading or deceptive;
   - do not infringe copyright, trademarks, privacy, or third-party rights;
   - do not contain defamatory, fraudulent, or legally risky material for us;
   - do not use competitor branding, logos, or watermarks without permission;
   - do not contain links unrelated to the listing or advertised service.

You must also:
- use the correct category when publishing a listing;
- ensure each listing represents one clear property only;
- not use bots, third-party software, hacks, mods, scraping, or any similar method to collect data from the platform;
- keep your account, username, and password secure;
- notify us immediately if there is unauthorized use of your account or any security breach;
- treat our team politely and professionally at all times.

We reserve the right to monitor access, limit usage, request password resets, or take other reasonable action to protect platform security and quality.`,
    },
  },
  {
    id: "termination",
    title: {
      id: "5. Penghentian atau Penangguhan",
      en: "5. Termination or Suspension",
    },
    body: {
      id: `Kami dapat menangguhkan atau mengakhiri akses Anda ke platform atau layanan jika:
- Anda gagal membayar biaya yang jatuh tempo;
- Anda melanggar perjanjian ini dan tidak memperbaikinya dalam waktu yang wajar;
- informasi, jaminan, atau representasi yang Anda berikan ternyata tidak benar;
- Anda melakukan aktivitas ilegal, curang, atau melanggar hak pihak ketiga;
- diwajibkan oleh hukum, regulator, atau otoritas yang berwenang;
- terjadi gangguan teknis, keamanan, atau perubahan material pada layanan.

Anda juga dapat mengakhiri perjanjian jika kami melakukan pelanggaran material terhadap kewajiban kami dan tidak memperbaikinya dalam jangka waktu yang wajar setelah menerima pemberitahuan dari Anda.

Akibat penghentian atau penangguhan:
1. akses Anda ke platform dan produk/layanan dapat dihentikan;
2. bagian layanan yang belum digunakan dapat hangus;
3. kami dapat menghapus akun, file, konten, atau data terkait sebagaimana diizinkan hukum;
4. biaya yang telah dibayar pada umumnya tidak dapat dikembalikan, kecuali diwajibkan oleh hukum yang berlaku.`,
      en: `We may suspend or terminate your access to the platform or services if:
- you fail to pay fees when due;
- you breach this agreement and do not fix the breach within a reasonable period;
- any information, warranty, or representation you gave is incorrect;
- you engage in illegal, fraudulent, or infringing conduct;
- we are required to do so by law, regulators, or authorities;
- there are technical, security, or material service issues.

You may also terminate the agreement if we materially breach our obligations and fail to remedy the breach within a reasonable period after notice from you.

Effect of termination or suspension:
1. your access to the platform and product/service may end;
2. any unused service may be forfeited;
3. we may delete accounts, files, content, or related data where legally permitted;
4. fees already paid are generally non-refundable unless required by applicable law.`,
    },
  },
  {
    id: "liability-exclusions",
    title: {
      id: "6. Pengecualian dan Batasan Tanggung Jawab",
      en: "6. Exclusions and Limitation of Liability",
    },
    body: {
      id: `Platform dan layanan kami disediakan “apa adanya” dan “sebagaimana tersedia”. Sejauh diizinkan hukum, kami tidak memberikan jaminan bahwa:
- layanan akan selalu tanpa gangguan;
- platform akan selalu aman, tepat waktu, atau bebas error;
- semua kesalahan akan selalu diperbaiki;
- semua informasi pada platform akan selalu lengkap, akurat, atau terbaru.

Kami tidak menjamin:
- jumlah klik, impresi, leads, atau hasil komersial tertentu dari listing Anda;
- bahwa listing Anda akan selalu muncul pada hasil pencarian pengguna tertentu;
- bahwa platform akan selalu tersedia tanpa gangguan internet, server, atau sistem pihak ketiga.

Sejauh diizinkan hukum, kami tidak bertanggung jawab atas:
- kehilangan keuntungan, peluang, goodwill, atau data;
- kerusakan yang timbul dari gangguan teknis, delay, bug, atau kegagalan sistem;
- tindakan, pernyataan, atau perilaku pihak ketiga;
- kehilangan atau kerusakan yang timbul dari materi listing Anda sendiri.

Jika tanggung jawab kami tidak dapat dikecualikan oleh hukum, maka tanggung jawab kami dibatasi pada penyediaan ulang layanan atau biaya penyediaan ulang layanan tersebut, sesuai pilihan kami.`,
      en: `Our platform and services are provided on an “as is” and “as available” basis. To the fullest extent permitted by law, we do not guarantee that:
- the service will always be uninterrupted;
- the platform will always be secure, timely, or error-free;
- all errors will always be corrected;
- all information on the platform will always be complete, accurate, or current.

We do not guarantee:
- any specific number of clicks, impressions, leads, or commercial results from your listing;
- that your listing will always appear in a particular user’s search results;
- that the platform will always be available without internet, server, or third-party interruptions.

To the fullest extent permitted by law, we are not liable for:
- loss of profit, opportunity, goodwill, or data;
- damage caused by technical interruptions, delays, bugs, or system failures;
- acts, statements, or conduct of third parties;
- loss or damage arising from your own listing materials.

Where liability cannot be excluded by law, our liability is limited to re-supplying the service or paying the cost of re-supplying that service, at our option.`,
    },
  },
  {
    id: "indemnity",
    title: {
      id: "7. Ganti Rugi",
      en: "7. Indemnity",
    },
    body: {
      id: `Anda setuju untuk membela, mengganti rugi, dan membebaskan kami, afiliasi kami, serta tim kami dari klaim, tuntutan, kerugian, tanggung jawab, biaya, dan pengeluaran yang timbul dari:
- penggunaan platform oleh Anda;
- materi, listing, atau konten yang Anda unggah atau kirimkan;
- pelanggaran Anda terhadap perjanjian ini;
- pelanggaran Anda terhadap hak kekayaan intelektual, privasi, atau hak pihak ketiga;
- tindakan lalai, penipuan, atau pelanggaran hukum oleh Anda atau wakil Anda.

Kewajiban ganti rugi ini tetap berlaku walaupun perjanjian telah berakhir.`,
      en: `You agree to defend, indemnify, and hold harmless us, our affiliates, and our team from claims, demands, losses, liabilities, costs, and expenses arising from:
- your use of the platform;
- any materials, listings, or content you upload or submit;
- your breach of this agreement;
- your infringement of intellectual property, privacy, or third-party rights;
- any negligent, fraudulent, or unlawful conduct by you or your representatives.

This indemnity obligation survives termination of the agreement.`,
    },
  },
  {
    id: "intellectual-property",
    title: {
      id: "8. Hak Kekayaan Intelektual",
      en: "8. Intellectual Property Rights",
    },
    body: {
      id: `Semua materi, desain, teks, grafik, foto, kode, data, software, dan konten lain yang tersedia di platform kami adalah milik kami atau pemasok konten kami, kecuali dinyatakan lain.

Anda tidak boleh:
- menyalin, mengubah, mendistribusikan, mempublikasikan, atau menggunakan konten platform tanpa izin tertulis dari kami;
- membuat kesan seolah-olah ada hubungan komersial, lisensi, atau kemitraan resmi di luar yang kami setujui secara tertulis.

Namun, sehubungan dengan layanan yang kami berikan kepada Anda, Anda memberi kami lisensi non-eksklusif dan bebas royalti untuk menggunakan nama dagang, logo, merek, dan materi listing Anda untuk tujuan operasional, pemasaran, distribusi, dan promosi bisnis kami, sesuai kebutuhan.

Anda juga mengakui bahwa materi yang Anda unggah ke platform dapat digunakan oleh kami untuk kebutuhan operasional platform dan aktivitas bisnis terkait sebagaimana diizinkan oleh perjanjian ini.`,
      en: `All materials, designs, text, graphics, photos, code, data, software, and other content available on our platform are owned by us or our content suppliers unless stated otherwise.

You must not:
- copy, modify, distribute, publish, or use platform content without our written permission;
- create the impression that there is a commercial relationship, licence, or official partnership beyond what we have agreed in writing.

However, in connection with the services we provide to you, you grant us a non-exclusive, royalty-free licence to use your trade name, logo, branding, and listing materials for operational, marketing, distribution, and promotional purposes where needed.

You also acknowledge that materials you upload to the platform may be used by us for platform operations and related business activities as permitted under this agreement.`,
    },
  },
  {
    id: "governing-law",
    title: {
      id: "9. Hukum yang Berlaku dan Bahasa",
      en: "9. Governing Law and Language",
    },
    body: {
      id: `Perjanjian ini diatur oleh hukum Indonesia, dan setiap sengketa yang timbul sehubungan dengan perjanjian ini tunduk pada yurisdiksi pengadilan yang berwenang di Indonesia, kecuali kami menentukan mekanisme penyelesaian lain secara tertulis.

Apabila syarat ini tersedia dalam lebih dari satu bahasa:
- versi bahasa Inggris dan bahasa Indonesia dapat disediakan untuk kemudahan;
- jika terdapat perbedaan interpretasi, maka versi bahasa Inggris dapat dijadikan acuan utama sepanjang diizinkan oleh hukum yang berlaku.`,
      en: `This agreement is governed by the laws of Indonesia, and any dispute arising in connection with this agreement is subject to the jurisdiction of the competent courts of Indonesia unless we specify another resolution mechanism in writing.

If these terms are made available in more than one language:
- the English and Indonesian versions may be provided for convenience;
- if there is any inconsistency in interpretation, the English version may prevail to the extent permitted by applicable law.`,
    },
  },
  {
    id: "optional-services",
    title: {
      id: "10. Produk / Layanan Opsional",
      en: "10. Optional Products / Services",
    },
    body: {
      id: `Jika Anda membeli layanan tambahan seperti layanan iklan, promosi, atau layanan opsional lainnya, maka ketentuan tambahan berikut dapat berlaku:

1. Anda wajib menyerahkan materi iklan dalam format, waktu, dan metode yang kami tentukan.
2. Kami berhak menolak, menunda, mengubah, atau menghapus materi iklan atas kebijakan kami sendiri.
3. Kami tidak menjamin materi iklan akan tayang tepat pada posisi, waktu, atau format yang Anda inginkan.
4. Anda bertanggung jawab penuh atas isi materi iklan dan konsekuensi hukum dari materi tersebut.
5. Kami dapat memindahkan kategori listing, mengubah format tampilan, atau menghapus materi yang menurut kami melanggar ketentuan.
6. Permintaan penarikan materi yang sudah tayang tidak selalu dapat dilakukan dan pada umumnya tidak disertai refund.

Layanan opsional dapat berubah, dihentikan, atau diperbarui sewaktu-waktu sesuai kebijakan platform.`,
      en: `If you purchase additional services such as advertising, promotion, or other optional services, the following additional terms may apply:

1. You must submit advertising materials in the format, timing, and method we specify.
2. We may reject, delay, modify, or remove advertising materials at our sole discretion.
3. We do not guarantee that advertising materials will be displayed in the exact position, timing, or format you request.
4. You are fully responsible for the content of advertising materials and any legal consequences arising from them.
5. We may re-categorize listings, change display formats, or remove materials that we believe breach our terms.
6. Requests to withdraw material after publication may not always be possible and generally do not include refunds.

Optional services may be changed, discontinued, or updated from time to time according to platform policy.`,
    },
  },
  {
    id: "event-liability",
    title: {
      id: "11. Ketentuan Tanggung Jawab Tambahan",
      en: "11. Additional Liability Terms",
    },
    body: {
      id: `Untuk layanan atau kerja sama tertentu, termasuk event, promosi khusus, atau aktivitas pihak ketiga, kami dapat menetapkan batas tanggung jawab tambahan.

Kami tidak bertanggung jawab atas:
- kehilangan atau kerusakan materi promosi, display, atau barang milik Anda;
- kehilangan pengiriman selama transit;
- tindakan kontraktor resmi, vendor, exhibitor, atau pihak ketiga lain;
- pembatalan atau penundaan kegiatan karena keadaan di luar kendali wajar kami.

Anda tetap bertanggung jawab atas keselamatan, legalitas, dan kelayakan materi atau aktivitas yang Anda bawa ke dalam kerja sama tersebut.`,
      en: `For certain services or collaborations, including events, special promotions, or third-party activities, we may apply additional liability limits.

We are not responsible for:
- loss or damage to your promotional materials, displays, or property;
- loss of shipments during transit;
- acts of official contractors, vendors, exhibitors, or other third parties;
- cancellation or postponement of activities due to circumstances beyond our reasonable control.

You remain responsible for the safety, legality, and suitability of the materials or activities you bring into such arrangements.`,
    },
  },
  {
    id: "affiliate",
    title: {
      id: "12. Ketentuan Program Afiliasi",
      en: "12. Affiliate Program Terms",
    },
    body: {
      id: `Jika Anda mengikuti program afiliasi kami, Anda setuju pada ketentuan berikut:

1. Komisi
Anda dapat menerima komisi atas subscription pelanggan yang memenuhi syarat sesuai persentase dan ketentuan yang kami tetapkan.

2. Pembayaran
Pembayaran komisi dapat dilakukan melalui metode yang kami tentukan dan dapat tunduk pada batas minimum pembayaran.

3. Praktik pemasaran
Afiliasi wajib menggunakan metode promosi yang etis, profesional, dan tidak menyesatkan. Kami dapat mendiskualifikasi afiliasi yang menggunakan metode promosi yang tidak pantas atau merugikan reputasi perusahaan.

4. Penghentian
Kami berhak mengakhiri partisipasi afiliasi kapan saja, dengan atau tanpa sebab, termasuk bila terjadi pelanggaran syarat.

5. Perubahan ketentuan
Kami berhak mengubah ketentuan afiliasi dari waktu ke waktu. Keikutsertaan yang berlanjut dianggap sebagai penerimaan terhadap perubahan tersebut.

6. Kerahasiaan
Informasi terkait komisi, data pelanggan, dan pengaturan internal program afiliasi bersifat rahasia.

Ketentuan program afiliasi dapat berubah sewaktu-waktu.`,
      en: `If you join our affiliate program, you agree to the following terms:

1. Commission
You may receive commission on eligible customer subscriptions according to the percentage and rules we set.

2. Payment
Commission payments may be made through methods we specify and may be subject to minimum payout thresholds.

3. Marketing practices
Affiliates must use ethical, professional, and non-misleading promotional methods. We may disqualify affiliates who use inappropriate methods or harm the company’s reputation.

4. Termination
We may terminate affiliate participation at any time, with or without cause, including for breach of the terms.

5. Changes to terms
We may update affiliate terms from time to time. Continued participation is treated as acceptance of those changes.

6. Confidentiality
Information relating to commission, customer data, and internal affiliate arrangements is confidential.

Affiliate program terms may change at any time.`,
    },
  },
];