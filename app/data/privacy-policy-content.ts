export type LocalizedText = {
  id: string;
  en: string;
};

export type PrivacyPolicySection = {
  id: string;
  title: LocalizedText;
  body: LocalizedText;
};

export const PRIVACY_POLICY_SECTIONS: PrivacyPolicySection[] = [
  {
    id: "intro",
    title: {
      id: "1. Pendahuluan",
      en: "1. Introduction",
    },
    body: {
      id: `Tanggal Berlaku: {{effectiveDate}}

Selamat datang di {{companyName}}.

Di {{companyName}}, kami berkomitmen untuk menjaga privasi dan keamanan informasi pribadi Anda. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, membagikan, dan melindungi data yang Anda berikan saat menggunakan website dan layanan listing properti kami.

Dengan mengakses dan menggunakan layanan kami, Anda dianggap telah membaca, memahami, dan menyetujui kebijakan ini. Jika Anda tidak setuju dengan praktik kami, mohon hentikan penggunaan layanan kami.

Kebijakan ini berlaku untuk seluruh pengguna {{companyName}}, termasuk pengunjung yang belum terdaftar, pengguna terdaftar, dan pengguna premium, di seluruh layanan kami.`,
      en: `Effective Date: {{effectiveDate}}

Welcome to {{companyName}}.

At {{companyName}}, we are committed to safeguarding the privacy and security of your personal information. This Privacy Policy explains how we collect, use, share, and protect the data you provide while using our website and property listing services.

By accessing and using our services, you confirm that you have read, understood, and agreed to this policy. If you disagree with our practices, please stop using our services.

This policy applies to all {{companyName}} users, including unregistered visitors, registered users, and premium users, across our services.`,
    },
  },
  {
    id: "personal-information",
    title: {
      id: "2. Informasi Pribadi yang Kami Kumpulkan",
      en: "2. Personal Information We Collect",
    },
    body: {
      id: `Untuk menyediakan layanan kami, kami dapat mengumpulkan informasi pribadi yang Anda berikan secara langsung, termasuk namun tidak terbatas pada:

- nama;
- alamat email;
- nomor telepon;
- informasi pembayaran;
- detail komunikasi Anda dengan kami;
- informasi yang Anda kirim saat pendaftaran, mengikuti event, berlangganan newsletter, atau menggunakan layanan lainnya.

Kami juga dapat mengumpulkan informasi dari penggunaan layanan, seperti:
- aktivitas browsing;
- data sesi;
- detail perangkat;
- informasi penggunaan platform secara umum.

Selain itu, kami dapat menerima informasi pribadi dari sumber lain seperti penyedia keamanan, platform media sosial, dan mitra iklan.`,
      en: `To provide our services, we may collect personal information that you provide directly, including but not limited to:

- name;
- email address;
- phone number;
- payment information;
- details of your communications with us;
- information you submit when registering, participating in events, subscribing to newsletters, or using other services.

We may also collect information from your use of the services, such as:
- browsing activity;
- session data;
- device details;
- general platform usage information.

In addition, we may receive personal information from other sources such as security providers, social media platforms, and advertising partners.`,
    },
  },
  {
    id: "users-of-users",
    title: {
      id: "3. Informasi Pengguna dari Pengguna Kami",
      en: "3. Users-of-Users Information",
    },
    body: {
      id: `Kami juga dapat mengumpulkan informasi pribadi yang berkaitan dengan pengunjung atau pengguna dari website atau layanan milik pengguna kami (“Users-of-Users”).

Informasi tersebut kami kumpulkan, simpan, dan proses hanya atas nama pengguna kami dan sesuai dengan arahan mereka. Dalam konteks ini, pengguna kami bertanggung jawab untuk memastikan bahwa mereka memiliki dasar hukum yang sah untuk memberikan data tersebut kepada kami.`,
      en: `We may also collect personal information relating to visitors or users of our users’ websites or services (“Users-of-Users”).

We collect, store, and process such information solely on behalf of our users and in accordance with their instructions. In this context, our users are responsible for ensuring that they have a lawful basis to provide that data to us.`,
    },
  },
  {
    id: "why-we-collect",
    title: {
      id: "4. Mengapa Kami Mengumpulkan Informasi Pribadi",
      en: "4. Why We Collect Personal Information",
    },
    body: {
      id: `Kami menggunakan informasi pribadi Anda untuk berbagai tujuan, termasuk:

- menyediakan dan mengoperasikan layanan kami;
- meningkatkan kualitas layanan dan pengalaman pengguna;
- memberikan bantuan pelanggan;
- mengirim komunikasi layanan;
- melakukan pemasaran, promosi, dan pengembangan bisnis;
- mematuhi kewajiban hukum dan regulasi yang berlaku.

Secara sederhana, kami menggunakan informasi pribadi untuk menjalankan layanan, meningkatkan pengalaman pengguna, dan memenuhi kewajiban hukum kami.`,
      en: `We use your personal information for various purposes, including:

- providing and operating our services;
- improving service quality and user experience;
- delivering customer support;
- sending service communications;
- carrying out marketing, promotions, and business development;
- complying with applicable legal and regulatory obligations.

In simple terms, we use personal information to run our services, improve user experience, and meet our legal obligations.`,
    },
  },
  {
    id: "sharing-information",
    title: {
      id: "5. Bagaimana Kami Membagikan Informasi Pribadi Anda",
      en: "5. How We Share Your Personal Information",
    },
    body: {
      id: `Kami dapat membagikan informasi pribadi Anda kepada pihak ketiga sesuai dengan kebijakan ini, termasuk kepada penyedia layanan yang membantu kami menjalankan hosting, keamanan, billing, analitik, atau layanan pelengkap lainnya.

Kami juga dapat membagikan informasi pribadi:
- untuk memenuhi permintaan hukum, perintah pengadilan, atau kewajiban hukum lainnya;
- untuk melindungi hak, properti, atau keselamatan kami, pengguna kami, Users-of-Users, atau publik;
- kepada afiliasi dan entitas terkait kami;
- dalam hal merger, akuisisi, atau perubahan kontrol perusahaan;
- atas arahan atau izin Anda, termasuk saat layanan pihak ketiga diaktifkan melalui platform kami.

Kami tidak membagikan informasi pribadi sembarangan. Setiap pembagian dilakukan sesuai kebutuhan operasional, hukum, keselamatan, atau persetujuan Anda.`,
      en: `We may share your personal information with third parties in accordance with this policy, including service providers who help us operate hosting, security, billing, analytics, or other complementary services.

We may also share personal information:
- to comply with legal requests, court orders, or other legal obligations;
- to protect our rights, property, or safety, or that of our users, Users-of-Users, or the public;
- with our affiliates and related entities;
- in the event of a merger, acquisition, or change in corporate control;
- upon your direction or permission, including when third-party services are activated through our platform.

We do not share personal information casually. Any sharing is done based on operational need, legal duty, safety, or your permission.`,
    },
  },
  {
    id: "storage-processing",
    title: {
      id: "6. Tempat Penyimpanan dan Pemrosesan Data",
      en: "6. Where We Store and Process Data",
    },
    body: {
      id: `Informasi pribadi Anda dapat disimpan dan diproses secara global, termasuk di yurisdiksi di luar negara tempat Anda tinggal.

Kami melakukan langkah peninjauan yang wajar untuk memastikan bahwa lokasi pemrosesan data memiliki perlindungan yang memadai, dan kami berupaya menjaga standar perlindungan data yang kuat dalam proses tersebut.`,
      en: `Your personal information may be stored and processed globally, including in jurisdictions outside your country of residence.

We take reasonable steps to assess such locations and aim to maintain strong data protection standards throughout the processing of your information.`,
    },
  },
  {
    id: "cookies",
    title: {
      id: "7. Penggunaan Cookies dan Teknologi Serupa",
      en: "7. Use of Cookies and Similar Technologies",
    },
    body: {
      id: `Kami dan penyedia layanan pihak ketiga kami dapat menggunakan Cookies dan teknologi serupa untuk berbagai tujuan, termasuk:

- menjaga stabilitas dan keamanan layanan;
- mengaktifkan fitur tertentu;
- menganalisis performa dan penggunaan;
- melakukan personalisasi;
- mendukung kebutuhan iklan dan pemasaran.

Dengan menggunakan layanan kami, Anda memahami bahwa teknologi seperti Cookies dapat digunakan sesuai dengan fungsi-fungsi tersebut.`,
      en: `We and our third-party service providers may use Cookies and similar technologies for various purposes, including:

- maintaining service stability and security;
- enabling certain features;
- analysing performance and usage;
- personalisation;
- supporting advertising and marketing needs.

By using our services, you understand that technologies such as Cookies may be used for these purposes.`,
    },
  },
  {
    id: "communications",
    title: {
      id: "8. Komunikasi dari Tetamo.com",
      en: "8. Communications from Tetamo.com",
    },
    body: {
      id: `Kami dapat menggunakan informasi pribadi Anda untuk mengirimkan:

1. Pesan promosi
Kami dapat mengirim konten promosi melalui email, SMS, notifikasi, panggilan pemasaran, atau metode lain yang relevan. Anda dapat memilih untuk berhenti menerima komunikasi promosi tertentu.

2. Pesan layanan dan billing
Kami juga dapat mengirim informasi penting mengenai layanan, akun, atau billing Anda. Pesan jenis ini penting untuk penggunaan layanan dan pada umumnya tidak dapat diopt-out selama Anda masih menggunakan layanan kami.`,
      en: `We may use your personal information to send:

1. Promotional messages
We may send promotional content by email, SMS, notifications, marketing calls, or other relevant methods. You may opt out of certain promotional communications.

2. Service and billing messages
We may also send important information about your services, account, or billing. These messages are important for service use and generally cannot be opted out of while you continue using our services.`,
    },
  },
  {
    id: "your-rights",
    title: {
      id: "9. Hak Anda atas Informasi Pribadi",
      en: "9. Your Rights Regarding Personal Information",
    },
    body: {
      id: `Kami percaya bahwa pengguna harus memiliki kendali atas informasi pribadi mereka.

Bergantung pada penggunaan Anda dan hukum yang berlaku, Anda dapat memiliki hak untuk:
- meminta akses ke informasi pribadi Anda;
- menerima salinan data Anda;
- memperbarui atau memperbaiki data Anda;
- meminta penghapusan data;
- membatasi penggunaan tertentu atas informasi pribadi Anda.

Kami akan menangani permintaan tersebut sesuai dengan hukum yang berlaku dan kemampuan operasional yang relevan.`,
      en: `We believe users should have control over their personal information.

Depending on your usage and the applicable law, you may have the right to:
- request access to your personal information;
- receive a copy of your data;
- update or correct your data;
- request deletion of your data;
- restrict certain uses of your personal information.

We will handle such requests in accordance with applicable law and relevant operational limitations.`,
    },
  },
  {
    id: "questions-complaints",
    title: {
      id: "10. Pertanyaan dan Keluhan",
      en: "10. Questions and Complaints",
    },
    body: {
      id: `Jika Anda memiliki pertanyaan, kekhawatiran, atau keluhan terkait pengumpulan, penggunaan, atau pengungkapan informasi pribadi, silakan hubungi kami melalui {{contactEmail}}.

Tim perlindungan data kami akan meninjau dan menanggapi keluhan Anda secepat mungkin. Anda juga dapat mengajukan keluhan kepada otoritas perlindungan data setempat jika diizinkan oleh hukum yang berlaku.`,
      en: `If you have questions, concerns, or complaints regarding the collection, use, or disclosure of personal information, please contact us at {{contactEmail}}.

Our data protection team will review and respond to your complaint as soon as reasonably possible. You may also file a complaint with your local data protection authority where permitted by applicable law.`,
    },
  },
  {
    id: "data-retention",
    title: {
      id: "11. Retensi Data",
      en: "11. Data Retention",
    },
    body: {
      id: `Kami dapat menyimpan informasi pribadi Anda selama akun Anda masih aktif atau selama diperlukan untuk:

- kepatuhan hukum;
- penyelesaian sengketa;
- pencegahan penipuan;
- perlindungan kepentingan sah kami;
- pelaksanaan operasional layanan.

Kami tidak menyimpan data lebih lama dari yang diperlukan untuk tujuan yang relevan, kecuali diwajibkan atau diizinkan oleh hukum.`,
      en: `We may retain your personal information for as long as your account remains active or as needed for:

- legal compliance;
- dispute resolution;
- fraud prevention;
- protection of our legitimate interests;
- service operations.

We do not retain data longer than necessary for the relevant purposes unless required or permitted by law.`,
    },
  },
  {
    id: "security",
    title: {
      id: "12. Keamanan",
      en: "12. Security",
    },
    body: {
      id: `{{companyName}} menerapkan langkah-langkah keamanan yang wajar untuk membantu melindungi informasi pribadi Anda.

Namun, perlindungan absolut tidak dapat dijamin. Karena itu, kami juga menyarankan Anda untuk:
- menggunakan password yang kuat;
- menjaga kerahasiaan akun Anda;
- tidak membagikan informasi sensitif di area yang kurang aman atau publik.

Kami serius terhadap keamanan, tetapi kewaspadaan pengguna juga tetap penting.`,
      en: `{{companyName}} implements reasonable security measures to help protect your personal information.

However, absolute protection cannot be guaranteed. For that reason, we also encourage you to:
- use strong passwords;
- keep your account confidential;
- avoid sharing sensitive information in less secure or public areas.

We take security seriously, but user vigilance remains important.`,
    },
  },
  {
    id: "third-party-websites",
    title: {
      id: "13. Website Pihak Ketiga",
      en: "13. Third-Party Websites",
    },
    body: {
      id: `Layanan kami dapat berisi tautan ke website pihak ketiga. Kami tidak mengontrol dan tidak bertanggung jawab atas praktik privasi website eksternal tersebut.

Saat Anda meninggalkan platform kami dan mengakses website lain, kami menyarankan Anda membaca kebijakan privasi mereka secara terpisah.`,
      en: `Our services may contain links to third-party websites. We do not control and are not responsible for the privacy practices of those external websites.

When you leave our platform and access another website, we recommend that you review their privacy policy separately.`,
    },
  },
  {
    id: "public-forums",
    title: {
      id: "14. Forum Publik dan Konten Pengguna",
      en: "14. Public Forums and User Content",
    },
    body: {
      id: `Harap berhati-hati saat membagikan informasi pribadi di area publik, forum, komentar, atau ruang lain yang dapat diakses umum.

Meskipun kami menyediakan langkah-langkah keamanan, konten yang Anda bagikan di area publik dapat tetap terlihat, tersalin, atau tersimpan oleh pihak lain bahkan setelah Anda menghapusnya.`,
      en: `Please be careful when sharing personal information in public areas, forums, comments, or other publicly accessible spaces.

Although we provide security measures, content you share in public areas may remain visible, copied, or stored by others even after you remove it.`,
    },
  },
  {
    id: "updates-interpretation",
    title: {
      id: "15. Pembaruan dan Penafsiran",
      en: "15. Updates and Interpretation",
    },
    body: {
      id: `Kebijakan Privasi ini dapat diperbarui dari waktu ke waktu sesuai kebutuhan hukum, operasional, atau pengembangan layanan kami.

Kami menyarankan Anda untuk memeriksa halaman ini secara berkala agar mengetahui versi terbaru. Judul, ringkasan, dan penomoran disediakan untuk kemudahan membaca dan tidak mengubah arti ketentuan yang mendasarinya.`,
      en: `This Privacy Policy may be updated from time to time as required by law, operations, or the development of our services.

We encourage you to review this page periodically to stay informed of the latest version. Headings, summaries, and numbering are provided for convenience and do not change the meaning of the underlying provisions.`,
    },
  },
];