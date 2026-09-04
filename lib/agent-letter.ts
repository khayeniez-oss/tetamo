export type AgentLetterLanguage =
  | "id"
  | "bilingual";

export type AgentLetterTemplateCategory =
  | "offers"
  | "authorization"
  | "tenancy"
  | "viewing"
  | "other";

export type AgentLetterTemplateKey =
  | "loi"
  | "offer_rent"
  | "offer_purchase"
  | "letter_authorization"
  | "letter_appointment"
  | "co_broking_commission"
  | "lease_renewal_notice"
  | "non_renewal_notice"
  | "early_termination_notice"
  | "notice_to_vacate"
  | "payment_reminder"
  | "inspection_notice"
  | "viewing_confirmation"
  | "viewing_acknowledgement"
  | "key_handover"
  | "general";

export type AgentLetterTemplateDefinition = {
  key: AgentLetterTemplateKey;

  category:
    AgentLetterTemplateCategory;

  labelId: string;
  labelEn: string;

  descriptionId: string;
  descriptionEn: string;

  propertyRecommended:
    boolean;
};

export type AgentLetterSender = {
  name: string;
  agency: string;
  address: string;
  phone: string;
  email: string;
};

export type AgentLetterRecipient = {
  name: string;
  company: string;
  address: string;
  phone: string;
  email: string;
};

export type AgentLetterProperty = {
  id: string;
  code: string;
  title: string;
  address: string;
  location: string;
  propertyType: string;
};

export type AgentLetterTemplateData =
  Record<
    string,
    | string
    | number
    | boolean
  >;

export type AgentLetterSignature = {
  label: string;
  name: string;
  role: string;
};

export type AgentLetterSignatures = {
  primary:
    AgentLetterSignature;

  secondary:
    AgentLetterSignature | null;
};

export type AgentLetterData = {
  version: 1;

  templateKey:
    AgentLetterTemplateKey;

  language:
    AgentLetterLanguage;

  letterDate: string;
  place: string;

  sender:
    AgentLetterSender;

  recipient:
    AgentLetterRecipient;

  property:
    AgentLetterProperty | null;

  subject: string;
  salutation: string;

  body: string;

  additionalNotes: string;

  closing: string;

  /*
   * Kept for backward compatibility with early drafts.
   * New editor/PDF uses signatures below.
   */
  signerName: string;
  signerRole: string;

  signatures:
    AgentLetterSignatures;

  templateData:
    AgentLetterTemplateData;
};

export const AGENT_LETTER_TEMPLATES:
  AgentLetterTemplateDefinition[] =
[
  {
    key:
      "loi",

    category:
      "offers",

    labelId:
      "LOI — Letter of Intent",

    labelEn:
      "LOI — Letter of Intent",

    descriptionId:
      "Surat pernyataan minat untuk menyewa atau membeli properti sebelum perjanjian utama.",

    descriptionEn:
      "Formal expression of intent to rent or purchase before the main agreement.",

    propertyRecommended:
      true,
  },

  {
    key:
      "offer_rent",

    category:
      "offers",

    labelId:
      "Penawaran Sewa",

    labelEn:
      "Offer to Rent",

    descriptionId:
      "Penawaran formal dari calon penyewa kepada pemilik.",

    descriptionEn:
      "Formal rental offer from a prospective tenant to a landlord.",

    propertyRecommended:
      true,
  },

  {
    key:
      "offer_purchase",

    category:
      "offers",

    labelId:
      "Penawaran Pembelian",

    labelEn:
      "Offer to Purchase",

    descriptionId:
      "Penawaran formal pembelian properti.",

    descriptionEn:
      "Formal offer to purchase a property.",

    propertyRecommended:
      true,
  },

  {
    key:
      "letter_authorization",

    category:
      "authorization",

    labelId:
      "Surat Kuasa / Letter of Authorization",

    labelEn:
      "Letter of Authorization",

    descriptionId:
      "Pemberian kewenangan untuk tindakan tertentu terkait properti.",

    descriptionEn:
      "Authorization for defined property-related actions.",

    propertyRecommended:
      true,
  },

  {
    key:
      "letter_appointment",

    category:
      "authorization",

    labelId:
      "Surat Penunjukan Agen",

    labelEn:
      "Letter of Appointment",

    descriptionId:
      "Penunjukan agen atau agensi untuk memasarkan atau menangani properti.",

    descriptionEn:
      "Appointment of an agent or agency for a property.",

    propertyRecommended:
      true,
  },

  {
    key:
      "co_broking_commission",

    category:
      "authorization",

    labelId:
      "Konfirmasi Co-Broking & Komisi",

    labelEn:
      "Co-Broking & Commission Confirmation",

    descriptionId:
      "Konfirmasi kerja sama antar agen serta pembagian komisi.",

    descriptionEn:
      "Confirmation of agent cooperation and commission split.",

    propertyRecommended:
      true,
  },

  {
    key:
      "lease_renewal_notice",

    category:
      "tenancy",

    labelId:
      "Pemberitahuan Perpanjangan Sewa",

    labelEn:
      "Lease Renewal Notice",

    descriptionId:
      "Pemberitahuan atau usulan perpanjangan masa sewa.",

    descriptionEn:
      "Notice or proposal to renew a lease.",

    propertyRecommended:
      true,
  },

  {
    key:
      "non_renewal_notice",

    category:
      "tenancy",

    labelId:
      "Pemberitahuan Tidak Memperpanjang Sewa",

    labelEn:
      "Non-Renewal Notice",

    descriptionId:
      "Pemberitahuan bahwa masa sewa tidak akan diperpanjang.",

    descriptionEn:
      "Notice that a lease will not be renewed.",

    propertyRecommended:
      true,
  },

  {
    key:
      "early_termination_notice",

    category:
      "tenancy",

    labelId:
      "Pemberitahuan Pengakhiran Dini",

    labelEn:
      "Early Termination Notice",

    descriptionId:
      "Pemberitahuan pengakhiran sewa sebelum tanggal berakhir.",

    descriptionEn:
      "Notice proposing termination before the scheduled lease end.",

    propertyRecommended:
      true,
  },

  {
    key:
      "notice_to_vacate",

    category:
      "tenancy",

    labelId:
      "Pemberitahuan Pengosongan Properti",

    labelEn:
      "Notice to Vacate",

    descriptionId:
      "Pemberitahuan terkait tanggal pengosongan properti.",

    descriptionEn:
      "Notice concerning a proposed property vacate date.",

    propertyRecommended:
      true,
  },

  {
    key:
      "payment_reminder",

    category:
      "tenancy",

    labelId:
      "Pengingat Pembayaran",

    labelEn:
      "Payment Reminder",

    descriptionId:
      "Pengingat formal untuk pembayaran terkait properti.",

    descriptionEn:
      "Formal reminder for a property-related payment.",

    propertyRecommended:
      true,
  },

  {
    key:
      "inspection_notice",

    category:
      "tenancy",

    labelId:
      "Pemberitahuan Akses / Inspeksi",

    labelEn:
      "Property Access / Inspection Notice",

    descriptionId:
      "Pemberitahuan akses untuk inspeksi, pemeliharaan, atau keperluan properti.",

    descriptionEn:
      "Notice of access for inspection, maintenance, or another property purpose.",

    propertyRecommended:
      true,
  },

  {
    key:
      "viewing_confirmation",

    category:
      "viewing",

    labelId:
      "Konfirmasi Viewing",

    labelEn:
      "Viewing Confirmation",

    descriptionId:
      "Konfirmasi jadwal viewing dengan calon pembeli atau penyewa.",

    descriptionEn:
      "Confirmation of a scheduled property viewing.",

    propertyRecommended:
      true,
  },

  {
    key:
      "viewing_acknowledgement",

    category:
      "viewing",

    labelId:
      "Pengakuan Viewing",

    labelEn:
      "Viewing Acknowledgement",

    descriptionId:
      "Catatan bahwa klien telah melihat properti melalui agen.",

    descriptionEn:
      "Acknowledgement that a client viewed the property through the agent.",

    propertyRecommended:
      true,
  },

  {
    key:
      "key_handover",

    category:
      "viewing",

    labelId:
      "Serah Terima Kunci / Properti",

    labelEn:
      "Key / Property Handover Letter",

    descriptionId:
      "Konfirmasi sederhana untuk serah terima kunci atau akses properti.",

    descriptionEn:
      "Simple confirmation of property keys or access being handed over.",

    propertyRecommended:
      true,
  },

  {
    key:
      "general",

    category:
      "other",

    labelId:
      "Surat Properti Umum",

    labelEn:
      "General Property Letter",

    descriptionId:
      "Surat profesional yang dapat diedit sepenuhnya untuk kebutuhan lainnya.",

    descriptionEn:
      "Fully editable professional letter for other property matters.",

    propertyRecommended:
      false,
  },
];

export function isAgentLetterTemplateKey(
  value: unknown
): value is AgentLetterTemplateKey {
  return AGENT_LETTER_TEMPLATES
    .some(
      (template) =>
        template.key ===
        value
    );
}

export function getAgentLetterTemplate(
  key:
    AgentLetterTemplateKey
) {
  return (
    AGENT_LETTER_TEMPLATES
      .find(
        (template) =>
          template.key ===
          key
      ) ||
    AGENT_LETTER_TEMPLATES[
      AGENT_LETTER_TEMPLATES.length -
      1
    ]
  );
}

function subjectForTemplate(
  key:
    AgentLetterTemplateKey,
  language:
    AgentLetterLanguage
) {
  const template =
    getAgentLetterTemplate(
      key
    );

  if (
    language ===
    "bilingual"
  ) {
    return `${template.labelId} / ${template.labelEn}`;
  }

  return template.labelId;
}

function bodyId(
  key:
    AgentLetterTemplateKey
) {
  switch (key) {
    case "loi":
      return `Dengan hormat,

Melalui surat ini, Pihak yang Menyampaikan menyatakan maksud dan minat awal untuk melanjutkan pembahasan mengenai rencana transaksi atas properti yang dicantumkan dalam dokumen ini. Jenis transaksi, nilai yang diusulkan, jangka waktu, masa berlaku, serta kondisi utama tercantum pada bagian Ketentuan Utama dan dimaksudkan sebagai dasar pembahasan lebih lanjut antara para pihak.

Kecuali dinyatakan secara tegas sebagai ketentuan yang mengikat, surat ini dimaksudkan sebagai pernyataan awal untuk melanjutkan negosiasi dan penyusunan dokumen transaksi yang lebih lengkap. Surat ini tidak dengan sendirinya mengalihkan hak atas properti, mewajibkan penyelesaian transaksi, atau menggantikan perjanjian utama maupun proses hukum lain yang mungkin diperlukan.

Apabila prinsip-prinsip utama yang disampaikan dapat diterima, para pihak dapat melanjutkan pembahasan, pemeriksaan informasi dan dokumen yang relevan, serta penyusunan perjanjian atau dokumen transaksi yang sesuai sebelum transaksi dilaksanakan.

Setiap perubahan atau tambahan terhadap ketentuan yang diusulkan sebaiknya dibahas dan dicatat secara tertulis oleh para pihak.

Demikian Letter of Intent ini disampaikan dengan itikad baik sebagai dasar untuk melanjutkan proses pembahasan dan negosiasi.`;

    case "offer_rent":
      return `Dengan hormat,

Melalui surat ini, calon penyewa menyampaikan penawaran untuk menyewa properti yang dicantumkan dalam dokumen ini. Nilai penawaran sewa, jangka waktu sewa, tanggal mulai yang diusulkan, deposit, masa berlaku penawaran, serta kondisi khusus tercantum pada bagian Ketentuan Utama.

Penawaran ini disampaikan untuk dipertimbangkan oleh Pemilik dan menjadi dasar pembahasan lebih lanjut mengenai ketentuan sewa. Setiap perubahan terhadap nilai sewa, periode, pembayaran, deposit, penggunaan properti, fasilitas, tanggung jawab para pihak, atau ketentuan lainnya sebaiknya disepakati secara jelas sebelum pelaksanaan sewa.

Apabila penawaran ini diterima, para pihak disarankan untuk menuangkan ketentuan akhir yang telah disepakati dalam Rental Agreement yang lengkap sebelum serah terima atau penggunaan properti dilakukan.

Pembayaran deposit, uang muka, atau pembayaran lain sehubungan dengan penawaran ini harus dilakukan sesuai ketentuan yang telah disepakati dan setelah pihak yang melakukan pembayaran memahami tujuan serta status pembayaran tersebut.

Penawaran ini berlaku sampai dengan tanggal yang tercantum pada bagian Ketentuan Utama, kecuali diperpanjang atau diubah berdasarkan kesepakatan para pihak.

Demikian penawaran sewa ini disampaikan dengan itikad baik untuk dipertimbangkan dan ditindaklanjuti oleh para pihak.`;

    case "offer_purchase":
      return `Dengan hormat,

Melalui surat ini, calon pembeli menyampaikan penawaran untuk membeli properti yang dicantumkan dalam dokumen ini. Harga yang ditawarkan, deposit yang diusulkan, skema pembayaran, target penyelesaian, masa berlaku penawaran, serta kondisi lainnya tercantum pada bagian Ketentuan Utama.

Penawaran ini disampaikan sebagai dasar pembahasan antara calon pembeli dan pihak penjual atau pemilik. Sebelum transaksi dilanjutkan, para pihak sebaiknya memastikan identitas dan kewenangan masing-masing pihak, status serta dokumen properti, ketentuan pembayaran, pajak dan biaya terkait, serta kondisi lain yang dianggap material terhadap transaksi.

Apabila penawaran ini diterima, para pihak dapat melanjutkan ke proses pemeriksaan dokumen dan penyusunan perjanjian atau dokumen transaksi yang sesuai dengan ketentuan hukum yang berlaku.

Surat penawaran ini tidak dengan sendirinya mengalihkan hak atas tanah atau bangunan dan tidak menggantikan akta, proses pertanahan, atau proses PPAT yang diwajibkan untuk pengalihan hak apabila berlaku terhadap transaksi tersebut.

Setiap deposit atau pembayaran yang dilakukan sebelum penyelesaian transaksi harus memiliki dasar, tujuan, status pengembalian atau penggunaannya, serta penerima pembayaran yang dinyatakan secara jelas.

Penawaran ini berlaku sampai dengan tanggal yang tercantum pada bagian Ketentuan Utama, kecuali diperpanjang atau diubah berdasarkan kesepakatan para pihak.

Demikian penawaran pembelian ini disampaikan dengan itikad baik untuk dipertimbangkan dan ditindaklanjuti lebih lanjut.`;

    case "letter_authorization":
      return `Dengan hormat,

Dengan surat ini, Pemberi Kuasa memberikan kuasa kepada Penerima Kuasa untuk melakukan tindakan yang secara khusus dicantumkan pada bagian Ruang Lingkup Kuasa sehubungan dengan properti yang dijelaskan dalam dokumen ini.

Kuasa yang diberikan terbatas pada tindakan yang dinyatakan secara tegas dalam dokumen ini. Penerima Kuasa tidak berwenang melakukan tindakan di luar ruang lingkup tersebut tanpa persetujuan atau kuasa tambahan dari Pemberi Kuasa.

Kecuali dinyatakan secara tegas dan dibuat sesuai dengan persyaratan hukum yang berlaku, surat ini tidak memberikan kewenangan untuk mengalihkan hak atas tanah atau bangunan, menandatangani akta pemindahan hak, membebankan hak atas properti, menerima hasil penjualan, atau melakukan tindakan lain yang memerlukan kewenangan khusus, bentuk tertentu, atau proses notaris dan/atau PPAT.

Kuasa ini berlaku selama periode yang tercantum pada bagian Ketentuan Utama, kecuali dicabut, berakhir, atau berubah sesuai ketentuan yang berlaku dan kesepakatan para pihak.

Penerima Kuasa wajib menggunakan kewenangan yang diberikan dengan itikad baik dan sesuai tujuan pemberian kuasa.

Demikian surat kuasa ini dibuat untuk digunakan sebagaimana mestinya sesuai ruang lingkup kewenangan yang dinyatakan di dalamnya.`;

    case "letter_appointment":
      return `Dengan hormat,

Dengan surat ini, Pemilik menunjuk agen atau agensi yang disebutkan dalam dokumen ini untuk membantu pemasaran dan kegiatan terkait properti sesuai jenis penunjukan, periode, ruang lingkup jasa, dan ketentuan yang tercantum pada bagian Ketentuan Utama.

Penunjukan ini dapat berupa Open Listing, Sole Agency, atau Exclusive Agency sebagaimana dipilih dan disepakati oleh para pihak. Hak serta batasan masing-masing bentuk penunjukan harus dipahami bersama sebelum dokumen digunakan.

Agen atau agensi dapat melaksanakan kegiatan pemasaran, komunikasi dengan calon pembeli atau penyewa, pengaturan viewing, penyampaian informasi properti, serta kegiatan lain yang secara jelas termasuk dalam ruang lingkup penunjukan.

Kecuali diberikan kuasa terpisah yang sah dan dinyatakan secara khusus, penunjukan ini tidak dengan sendirinya memberikan kewenangan kepada agen untuk menandatangani perjanjian atas nama Pemilik, menerima atau menahan dana transaksi, mengalihkan hak atas properti, atau melakukan tindakan hukum lain yang memerlukan kewenangan khusus.

Ketentuan mengenai komisi, cara perhitungan, kondisi timbulnya hak atas komisi, waktu pembayaran, serta biaya lain yang disepakati harus dinyatakan secara jelas dan dipahami oleh para pihak.

Penunjukan ini berlaku selama periode yang tercantum pada bagian Ketentuan Utama dan dapat diakhiri atau diubah sesuai ketentuan yang disepakati oleh para pihak.

Demikian surat penunjukan ini dibuat sebagai dasar hubungan kerja antara Pemilik dan agen atau agensi untuk properti yang dimaksud.`;

    case "co_broking_commission":
      return `Dengan hormat,

Dokumen ini mencatat kesepakatan kerja sama co-broking antara agen atau pihak yang disebutkan untuk menangani peluang transaksi atas properti yang dicantumkan dalam dokumen ini.

Para pihak sepakat untuk melaksanakan peran dan tanggung jawab masing-masing sebagaimana dinyatakan pada bagian Ketentuan Utama, termasuk pihak yang mewakili pemilik atau penjual, pihak yang membawa calon pembeli atau penyewa, serta kegiatan lain yang disepakati dalam proses transaksi.

Pembagian komisi, nilai atau persentase komisi, kondisi yang harus terpenuhi sebelum komisi menjadi terutang, pihak yang bertanggung jawab melakukan pembayaran, dan waktu pembayaran harus dinyatakan secara jelas. Tidak ada hak atas komisi yang seharusnya dianggap timbul di luar ketentuan yang telah disepakati atau perjanjian lain yang berlaku.

Masing-masing pihak bertanggung jawab atas keakuratan informasi yang disampaikan dalam lingkup tugasnya dan tidak boleh membuat pernyataan atau komitmen atas nama pihak lain tanpa kewenangan yang sah.

Apabila sudah terdapat perjanjian antara broker atau agen dengan pemilik, penjual, pembeli, penyewa, atau pengguna jasa lainnya, kerja sama co-broking ini harus dilaksanakan secara konsisten dengan perjanjian tersebut.

Informasi mengenai klien, properti, negosiasi, dan transaksi harus digunakan hanya untuk tujuan kerja sama yang disepakati dan sesuai dengan kewajiban yang berlaku bagi para pihak.

Apabila terjadi perbedaan pendapat mengenai peran, komisi, atau kewajiban lainnya, para pihak akan terlebih dahulu berupaya menyelesaikannya melalui komunikasi dan musyawarah dengan mengacu pada dokumen ini serta perjanjian terkait lainnya.

Demikian konfirmasi kerja sama co-broking dan komisi ini dibuat sebagai catatan kesepakatan para pihak dalam menangani transaksi properti yang dimaksud.`;

    case "lease_renewal_notice":
      return `Dengan hormat,

Melalui surat ini, kami menyampaikan usulan mengenai perpanjangan masa sewa atas properti yang dicantumkan dalam dokumen ini.

Masa sewa saat ini, periode perpanjangan yang diusulkan, nilai sewa yang diusulkan, serta ketentuan utama lainnya tercantum pada bagian Ketentuan Utama.

Perpanjangan sewa tidak dimaksudkan berlaku secara otomatis hanya karena surat ini disampaikan. Ketentuan perpanjangan, termasuk nilai sewa, periode, jadwal dan metode pembayaran, deposit, pemeliharaan, penggunaan properti, serta kewajiban lainnya harus mengikuti kesepakatan para pihak dan Rental Agreement yang berlaku.

Apabila usulan perpanjangan diterima, para pihak sebaiknya mencatat persetujuan tersebut secara tertulis melalui perpanjangan, addendum, Rental Agreement baru, atau dokumen lain yang sesuai sebelum periode sewa berikutnya dimulai.

Seluruh hak dan kewajiban yang masih berlaku berdasarkan Rental Agreement saat ini tetap harus diselesaikan sesuai ketentuan yang telah disepakati.

Demikian usulan perpanjangan masa sewa ini disampaikan dengan itikad baik untuk dipertimbangkan dan dibahas lebih lanjut oleh para pihak.`;

    case "non_renewal_notice":
      return `Dengan hormat,

Melalui surat ini, kami menyampaikan pemberitahuan bahwa masa sewa atas properti yang dicantumkan dalam dokumen ini tidak direncanakan untuk diperpanjang setelah berakhirnya periode sewa yang berlaku.

Tanggal berakhirnya masa sewa dan tanggal pengosongan yang relevan tercantum pada bagian Ketentuan Utama. Pemberitahuan ini harus dibaca bersama dengan Rental Agreement yang berlaku dan tidak dimaksudkan untuk mengubah tanggal berakhir, periode pemberitahuan, atau hak dan kewajiban yang telah disepakati oleh para pihak.

Sebelum berakhirnya masa sewa, para pihak diharapkan menyelesaikan kewajiban yang masih ada sesuai Rental Agreement, termasuk pembayaran yang belum diselesaikan, pemeriksaan kondisi properti apabila diperlukan, penyelesaian utilitas, pengembalian kunci dan akses, serta proses serah terima.

Pengembalian atau pemotongan deposit, apabila ada, harus dilakukan sesuai dengan Rental Agreement dan berdasarkan kondisi serta kewajiban yang dapat dibuktikan.

Pemberitahuan ini tidak menghapus hak atau kewajiban yang masih berlaku sampai dengan berakhirnya hubungan sewa.

Demikian pemberitahuan tidak diperpanjangnya masa sewa ini disampaikan agar para pihak dapat mempersiapkan penyelesaian dan serah terima properti dengan baik.`;

    case "early_termination_notice":
      return `Dengan hormat,

Melalui surat ini, kami menyampaikan pemberitahuan mengenai rencana atau permohonan pengakhiran masa sewa sebelum tanggal berakhir yang sebelumnya ditetapkan atas properti yang dicantumkan dalam dokumen ini.

Tanggal pemberitahuan, tanggal pengakhiran yang diminta, serta alasan pengakhiran tercantum pada bagian Ketentuan Utama.

Pengakhiran lebih awal harus dilakukan berdasarkan hak yang terdapat dalam Rental Agreement, kesepakatan para pihak, atau dasar hukum lain yang berlaku. Apabila Rental Agreement mensyaratkan persetujuan pihak lain untuk pengakhiran lebih awal, surat ini diperlakukan sebagai permohonan atau usulan sampai persetujuan tersebut diperoleh.

Para pihak harus memeriksa dan menyelesaikan kewajiban yang masih berlaku, termasuk pembayaran sewa, biaya atau utilitas, deposit, kondisi properti, pengembalian kunci atau akses, serta kewajiban lain sebagaimana diatur dalam Rental Agreement.

Tanggal pengakhiran yang diusulkan tidak dengan sendirinya membebaskan salah satu pihak dari kewajiban yang telah timbul sebelum tanggal efektif pengakhiran.

Setiap kesepakatan mengenai pengakhiran lebih awal, termasuk penyelesaian pembayaran, pengembalian deposit, pelepasan kewajiban, atau ketentuan serah terima, sebaiknya dicatat secara tertulis oleh para pihak.

Demikian pemberitahuan ini disampaikan dengan itikad baik agar proses pengakhiran sewa dapat dibahas dan diselesaikan sesuai Rental Agreement serta ketentuan yang berlaku.`;

    case "notice_to_vacate":
      return `Dengan hormat,

Melalui surat ini, kami menyampaikan pemberitahuan mengenai pengosongan properti yang dicantumkan dalam dokumen ini berdasarkan keadaan dan ketentuan yang berlaku dalam hubungan sewa para pihak.

Tanggal pengosongan yang diminta serta alasan atau keterangan yang relevan tercantum pada bagian Ketentuan Utama.

Pemberitahuan ini harus digunakan sesuai dengan Rental Agreement dan dasar hak pihak yang mengirim pemberitahuan. Apabila Rental Agreement menetapkan periode pemberitahuan, prosedur, kondisi, atau hak tertentu sebelum pengosongan, ketentuan tersebut tetap harus dipenuhi.

Sebelum pengosongan, para pihak diharapkan mengatur penyelesaian kewajiban yang masih ada, pemeriksaan kondisi properti bila diperlukan, pembayaran yang belum diselesaikan, utilitas, deposit, serta pengembalian seluruh kunci, kartu akses, remote, atau perangkat akses lainnya.

Pengembalian atau pemotongan deposit, apabila ada, harus dilakukan sesuai Rental Agreement dan berdasarkan kewajiban atau kondisi yang dapat dibuktikan.

Pemberitahuan ini merupakan pemberitahuan tertulis dan tidak dengan sendirinya memberikan kewenangan untuk melakukan pengosongan paksa, memasuki properti tanpa hak, memindahkan barang milik penghuni, atau mengambil tindakan lain yang tidak diperbolehkan oleh perjanjian atau hukum yang berlaku.

Demikian pemberitahuan pengosongan ini disampaikan agar para pihak dapat mengatur proses penyelesaian dan serah terima properti dengan tertib.`;

    case "payment_reminder":
      return `Dengan hormat,

Melalui surat ini, kami menyampaikan pengingat mengenai pembayaran yang berkaitan dengan properti atau transaksi yang dicantumkan dalam dokumen ini.

Jumlah pembayaran, mata uang, tanggal jatuh tempo, tujuan pembayaran, dan referensi pembayaran tercantum pada bagian Ketentuan Utama.

Mohon melakukan pemeriksaan terhadap catatan pembayaran Anda dan, apabila jumlah tersebut masih terutang sesuai perjanjian atau kesepakatan yang berlaku, melakukan pembayaran sesuai metode dan instruksi pembayaran yang telah disepakati.

Apabila pembayaran telah dilakukan, mohon mengabaikan pengingat ini dan, apabila diperlukan, menyampaikan bukti pembayaran agar catatan para pihak dapat diperbarui.

Apabila terdapat perbedaan mengenai jumlah, tanggal jatuh tempo, kewajiban pembayaran, atau pencatatan transaksi, para pihak disarankan terlebih dahulu mencocokkan Rental Agreement, invoice, kuitansi, bukti transfer, atau dokumen terkait sebelum mengambil langkah lebih lanjut.

Pengingat ini tidak dimaksudkan untuk mengubah nilai, tanggal, hak, atau kewajiban yang telah ditetapkan dalam perjanjian yang berlaku.

Demikian pengingat pembayaran ini disampaikan dengan itikad baik untuk membantu penyelesaian administrasi pembayaran terkait.`;

    case "inspection_notice":
      return `Dengan hormat,

Melalui surat ini, kami menyampaikan pemberitahuan mengenai rencana akses ke properti yang dicantumkan dalam dokumen ini untuk tujuan inspeksi, pemeriksaan kondisi, pemeliharaan, perbaikan, viewing, atau tujuan lain yang dinyatakan pada bagian Ketentuan Utama.

Tanggal, waktu, tujuan akses, serta periode pemberitahuan yang digunakan tercantum pada bagian Ketentuan Utama.

Pelaksanaan akses harus mengikuti Rental Agreement dan hak yang berlaku bagi para pihak. Pemberitahuan ini tidak dengan sendirinya memberikan hak kepada pengirim atau pihak lain untuk memasuki properti apabila hak akses tersebut tidak terdapat dalam Rental Agreement, tidak disetujui oleh pihak yang berwenang, atau tidak tersedia berdasarkan ketentuan yang berlaku.

Sepanjang memungkinkan, akses sebaiknya dilakukan pada waktu yang telah diberitahukan atau disepakati dengan tetap menghormati penggunaan dan penguasaan properti oleh penghuni yang sah.

Pihak yang melakukan inspeksi atau akses harus membatasi kegiatan pada tujuan yang telah diberitahukan dan menjaga keamanan properti serta barang-barang yang berada di dalamnya.

Apabila tanggal atau waktu yang diusulkan tidak memungkinkan, para pihak dapat berkoordinasi untuk menentukan waktu alternatif sesuai dengan Rental Agreement dan kebutuhan yang wajar.

Demikian pemberitahuan akses atau inspeksi ini disampaikan agar kegiatan dapat dilaksanakan secara tertib dan sesuai dengan ketentuan yang berlaku antara para pihak.`;

    case "viewing_confirmation":
      return `Dengan hormat,

Melalui surat ini, kami mengonfirmasi jadwal viewing untuk properti yang dicantumkan dalam dokumen ini.

Nama klien, tanggal viewing, waktu, serta titik pertemuan tercantum pada bagian Ketentuan Utama. Mohon memastikan seluruh informasi tersebut telah sesuai sebelum jadwal dilaksanakan.

Viewing ini bertujuan memberikan kesempatan kepada calon pembeli atau penyewa untuk melihat kondisi dan karakteristik properti secara langsung serta memperoleh informasi yang relevan sebelum mengambil keputusan lebih lanjut.

Apabila terdapat perubahan jadwal, keterlambatan, atau kebutuhan khusus terkait akses ke properti, mohon menginformasikannya kepada agen atau pihak terkait sesegera mungkin agar pengaturan dapat disesuaikan.

Selama viewing, calon pembeli atau penyewa diharapkan menghormati properti, penghuni, pemilik, dan ketentuan akses yang berlaku.

Konfirmasi viewing ini tidak merupakan penawaran, penerimaan, pemesanan, perjanjian sewa, perjanjian jual beli, atau komitmen untuk melakukan transaksi kecuali secara tegas dinyatakan dalam dokumen terpisah.

Demikian konfirmasi viewing ini disampaikan. Kami berharap proses viewing dapat berlangsung dengan baik dan memberikan informasi yang dibutuhkan oleh para pihak.`;

    case "viewing_acknowledgement":
      return `Dengan hormat,

Dokumen ini mencatat bahwa klien yang disebutkan pada bagian Ketentuan Utama telah melakukan viewing atas properti yang dicantumkan dalam dokumen ini melalui agen atau pihak yang terkait dengan pengaturan viewing tersebut.

Tanggal viewing dan catatan yang relevan tercantum pada bagian Ketentuan Utama.

Dengan menandatangani dokumen ini, para pihak hanya mengakui bahwa viewing atas properti telah dilakukan sebagaimana dicatat. Pengakuan viewing ini tidak dengan sendirinya merupakan persetujuan untuk membeli atau menyewa properti, tidak menciptakan kewajiban untuk melanjutkan transaksi, dan tidak menggantikan dokumen transaksi lainnya.

Dokumen ini juga tidak dengan sendirinya menciptakan hak komisi, eksklusivitas, kewajiban pembayaran, atau larangan berhubungan dengan pihak lain kecuali hak atau kewajiban tersebut telah diatur secara sah dalam perjanjian lain yang berlaku.

Apabila setelah viewing terdapat ketertarikan untuk melanjutkan proses, setiap penawaran, negosiasi, atau kesepakatan berikutnya sebaiknya dicatat melalui dokumen yang sesuai.

Demikian Viewing Acknowledgement ini dibuat sebagai catatan bahwa kegiatan viewing telah dilaksanakan.`;

    case "key_handover":
      return `Dengan hormat,

Dokumen ini mencatat serah terima kunci dan/atau perangkat akses untuk properti yang dicantumkan dalam dokumen ini antara pihak yang menyerahkan dan pihak yang menerima.

Tanggal serah terima, jumlah kunci, jenis kunci atau perangkat akses lainnya, serta catatan tambahan tercantum pada bagian Ketentuan Utama.

Pihak yang menerima mengakui telah menerima kunci dan/atau perangkat akses sebagaimana dicatat dalam dokumen ini. Apabila terdapat kunci, kartu akses, remote, kode akses, atau perangkat lain yang belum diserahkan atau memiliki kondisi tertentu, hal tersebut sebaiknya dicatat secara jelas sebelum dokumen ditandatangani.

Penerimaan kunci atau akses harus digunakan sesuai tujuan penyerahan serta perjanjian atau hubungan hukum yang mendasarinya. Penyerahan kunci tidak dengan sendirinya mengalihkan hak kepemilikan atas properti atau menggantikan Rental Agreement, perjanjian jual beli, berita acara serah terima, atau dokumen lain yang berlaku.

Apabila kunci atau perangkat akses wajib dikembalikan pada akhir masa sewa, penugasan, viewing, atau penggunaan tertentu, kewajiban tersebut tetap mengikuti ketentuan dalam perjanjian atau kesepakatan yang mendasarinya.

Para pihak disarankan memeriksa jumlah dan jenis akses yang diserahkan sebelum menandatangani dokumen ini.

Demikian dokumen serah terima kunci dan akses ini dibuat sebagai bukti pencatatan serah terima antara para pihak.`;

    case "general":
    default:
      return `Dengan hormat,

Melalui surat ini, kami menyampaikan hal yang berkaitan dengan properti yang dicantumkan dalam dokumen ini sebagaimana tercermin dalam perihal surat di atas.

Kami berharap informasi, permohonan, konfirmasi, atau hal lain yang disampaikan melalui surat ini dapat ditinjau dengan baik oleh pihak yang dituju. Apabila terdapat informasi tambahan, dokumen pendukung, klarifikasi, atau tindak lanjut yang diperlukan, para pihak dapat melakukan komunikasi lebih lanjut untuk memastikan bahwa maksud surat dipahami dengan benar.

Setiap informasi mengenai properti, nilai transaksi, kewajiban pembayaran, kewenangan, tanggal, atau ketentuan lain yang memiliki akibat hukum atau komersial harus diperiksa kembali sebelum surat digunakan.

Surat ini dapat disesuaikan, ditambahkan, atau diubah oleh pengguna sesuai dengan tujuan komunikasi yang sebenarnya. Apabila isi surat dimaksudkan untuk menciptakan hak, kewajiban, kuasa, pengakuan utang, penawaran, penerimaan, atau komitmen tertentu, pastikan ketentuan tersebut dinyatakan secara jelas dan sesuai dengan dokumen atau perjanjian lain yang berlaku.

Demikian surat ini disampaikan dengan itikad baik. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.`;
  }
}

function bodyEn(
  key:
    AgentLetterTemplateKey
) {
  switch (key) {
    case "loi":
      return `Dear Sir / Madam,

By this Letter of Intent, the Issuing Party expresses its preliminary intention and interest in continuing discussions concerning a proposed transaction involving the property identified in this document. The proposed transaction type, amount, term, validity period, and principal conditions are stated in the Key Details section and are intended to form the basis for further discussions between the parties.

Unless a particular provision is expressly stated to be binding, this letter is intended as a preliminary statement for the continuation of negotiations and preparation of more complete transaction documents. This letter does not by itself transfer any rights in the property, require completion of the transaction, or replace the principal agreement or any other legal process that may be required.

If the principal terms are acceptable, the parties may continue discussions, review relevant information and documents, and prepare the appropriate agreement or transaction documents before proceeding with the transaction.

Any amendment or addition to the proposed terms should be discussed and recorded in writing by the parties.

This Letter of Intent is submitted in good faith as a basis for continuing discussions and negotiations.`;

    case "offer_rent":
      return `Dear Sir / Madam,

By this letter, the prospective tenant submits an offer to rent the property identified in this document. The proposed rental amount, lease term, proposed commencement date, deposit, offer validity period, and any special conditions are stated in the Key Details section.

This offer is submitted for consideration by the Landlord and as a basis for further discussion of the proposed tenancy. Any change to the rent, lease period, payment arrangements, deposit, permitted use, facilities, responsibilities of the parties, or other terms should be clearly agreed before the tenancy is implemented.

If this offer is accepted, the parties are encouraged to record the final agreed terms in a complete Rental Agreement before possession or use of the property begins.

Any deposit, advance payment, or other payment connected with this offer should be made only in accordance with the agreed terms and after the paying party understands the purpose and status of the payment.

This offer remains valid until the date stated in the Key Details section unless extended or amended by agreement between the parties.

This rental offer is submitted in good faith for consideration and further action by the parties.`;

    case "offer_purchase":
      return `Dear Sir / Madam,

By this letter, the prospective buyer submits an offer to purchase the property identified in this document. The offered price, proposed deposit, payment structure, proposed completion timing, validity period, and other conditions are stated in the Key Details section.

This offer is submitted as a basis for discussion between the prospective buyer and the seller or owner. Before proceeding with the transaction, the parties should verify their respective identities and authority, the status and documentation of the property, payment arrangements, applicable taxes and costs, and any other matters material to the transaction.

If this offer is accepted, the parties may proceed with document review and preparation of the appropriate agreement or transaction documents in accordance with applicable legal requirements.

This offer does not by itself transfer rights in land or buildings and does not replace any deed, land-registration process, or PPAT process required for the relevant transfer where applicable.

Any deposit or payment made before completion should have its purpose, status, refund or application terms, and payment recipient clearly recorded.

This offer remains valid until the date stated in the Key Details section unless extended or amended by agreement between the parties.

This purchase offer is submitted in good faith for consideration and further action by the parties.`;

    case "letter_authorization":
      return `Dear Sir / Madam,

By this letter, the Authorizing Party grants authority to the Authorized Party to perform the actions specifically stated in the Scope of Authority in connection with the property identified in this document.

The authority granted is limited to the actions expressly stated in this document. The Authorized Party is not authorized to act outside that scope without further approval or additional authority from the Authorizing Party.

Unless expressly granted and executed in accordance with applicable legal requirements, this letter does not authorize the transfer of rights in land or buildings, execution of instruments transferring property rights, creation of encumbrances over property, receipt of sale proceeds, or other acts requiring special authority, a particular legal form, or a notarial and/or PPAT process.

This authority remains effective for the period stated in the Key Details section unless revoked, terminated, or otherwise changed in accordance with applicable requirements and the agreement of the parties.

The Authorized Party shall exercise the authority granted in good faith and only for the purposes for which it was given.

This Letter of Authorization is issued for use strictly within the scope of authority stated in this document.`;

    case "letter_appointment":
      return `Dear Sir / Madam,

By this letter, the Owner appoints the agent or agency identified in this document to assist with the marketing and property-related activities described in the Key Details section, subject to the selected appointment type, term, service scope, and agreed conditions.

The appointment may be structured as an Open Listing, Sole Agency, or Exclusive Agency arrangement as selected and agreed by the parties. The rights and limitations associated with the selected appointment should be understood by the parties before use.

The agent or agency may carry out marketing activities, communicate with prospective buyers or tenants, arrange property viewings, provide property information, and perform other activities expressly included within the agreed scope of appointment.

Unless separate valid authority is expressly granted, this appointment does not by itself authorize the agent to execute agreements on behalf of the Owner, receive or retain transaction funds, transfer rights in the property, or perform other legal acts requiring special authority.

Any commission arrangement should clearly state the amount or percentage, how it is calculated, the circumstances in which commission becomes payable, the responsible paying party, payment timing, and any other agreed charges.

This appointment remains effective for the period stated in the Key Details section and may be terminated or amended in accordance with the terms agreed between the parties.

This Letter of Appointment records the basis of the working relationship between the Owner and the appointed agent or agency in relation to the identified property.`;

    case "co_broking_commission":
      return `Dear Sir / Madam,

This document records the co-broking cooperation agreed between the agents or parties identified in connection with a potential transaction involving the property stated in this document.

The parties agree to perform their respective roles and responsibilities as stated in the Key Details section, including the party representing the owner or seller, the party introducing the prospective buyer or tenant, and any other activities agreed for the transaction process.

The commission split, commission amount or percentage, conditions that must be satisfied before commission becomes payable, the party responsible for payment, and the payment timing should be stated clearly. No commission entitlement should be assumed beyond the terms agreed in this document or any other applicable agreement.

Each party is responsible for the accuracy of information provided within the scope of its responsibilities and should not make representations or commitments on behalf of another party without proper authority.

Where an existing agreement is already in place between a broker or agent and an owner, seller, buyer, tenant, or other client, this co-broking arrangement should be performed consistently with that agreement.

Information concerning clients, properties, negotiations, and transactions should be used only for the agreed cooperation and in accordance with the obligations applicable to the parties.

If a disagreement arises concerning roles, commission, or other obligations, the parties should first attempt to resolve the matter through communication and amicable discussion with reference to this document and any other relevant agreement.

This Co-Broking & Commission Confirmation records the parties' agreed cooperation in connection with the identified property transaction.`;

    case "lease_renewal_notice":
      return `Dear Sir / Madam,

By this letter, we submit a proposal concerning the renewal of the lease for the property identified in this document.

The current lease expiry, proposed renewal period, proposed rental amount, and other principal terms are stated in the Key Details section.

The lease is not intended to be renewed automatically merely because this letter has been issued. The renewal terms, including rent, duration, payment schedule and method, deposit, maintenance, use of the property, and other obligations remain subject to the parties' agreement and the applicable Rental Agreement.

If the renewal proposal is accepted, the parties should record the agreed terms in writing by way of an extension, addendum, new Rental Agreement, or other appropriate document before the new lease period begins.

Any rights and obligations remaining under the existing Rental Agreement should continue to be performed and settled in accordance with its terms.

This lease renewal proposal is submitted in good faith for consideration and further discussion between the parties.`;

    case "non_renewal_notice":
      return `Dear Sir / Madam,

By this letter, we provide notice that the lease of the property identified in this document is not intended to be renewed following the expiry of the current lease period.

The current lease expiry date and the relevant vacate date are stated in the Key Details section. This notice should be read together with the applicable Rental Agreement and is not intended to alter the agreed expiry date, notice requirements, or existing rights and obligations of the parties.

Before the lease concludes, the parties should settle any remaining obligations under the Rental Agreement, including outstanding payments, any required property-condition inspection, utilities, return of keys and access devices, and the handover process.

Any return or deduction of a deposit should be handled in accordance with the Rental Agreement and supported by the relevant property condition or outstanding obligations.

This notice does not extinguish rights or obligations that continue until the end of the tenancy.

This non-renewal notice is issued so that the parties may make appropriate arrangements for completion of the tenancy and handover of the property.`;

    case "early_termination_notice":
      return `Dear Sir / Madam,

By this letter, we provide notice concerning the proposed or requested termination of the lease for the property identified in this document before the previously agreed expiry date.

The notice date, requested termination date, and reason for the proposed termination are stated in the Key Details section.

An early termination should be based on a right available under the applicable Rental Agreement, an agreement between the parties, or another applicable legal basis. Where the Rental Agreement requires the other party's consent for early termination, this letter should be treated as a request or proposal until that consent is obtained.

The parties should review and settle all continuing obligations, including rent, charges or utilities, deposit arrangements, property condition, return of keys or access devices, and any other obligations arising under the Rental Agreement.

The proposed termination date does not by itself release either party from obligations that arose before the effective termination date.

Any agreement concerning early termination, including payment settlement, deposit return, release of obligations, or handover arrangements, should be recorded in writing by the parties.

This notice is submitted in good faith so that the proposed early termination can be discussed and resolved in accordance with the Rental Agreement and applicable requirements.`;

    case "notice_to_vacate":
      return `Dear Sir / Madam,

By this letter, we provide notice concerning the vacation of the property identified in this document based on the circumstances and terms applicable to the parties' tenancy relationship.

The requested vacate date and the relevant reason or details are stated in the Key Details section.

This notice should be used consistently with the applicable Rental Agreement and the issuing party's existing rights. Where the Rental Agreement establishes a notice period, procedure, condition, or other requirement before vacation of the property, those requirements remain applicable.

Before vacating, the parties should arrange settlement of outstanding obligations, any required property-condition inspection, unpaid amounts, utilities, deposit matters, and return of all keys, access cards, remotes, or other access devices.

Any return or deduction of a deposit should be handled in accordance with the Rental Agreement and supported by the relevant condition or outstanding obligations.

This letter constitutes written notice only and does not by itself authorize forced eviction, unauthorized entry into the property, removal of an occupant's belongings, or any other action not permitted by the agreement or applicable law.

This Notice to Vacate is issued so that the parties can arrange the completion of the tenancy and orderly handover of the property.`;

    case "payment_reminder":
      return `Dear Sir / Madam,

By this letter, we provide a reminder concerning a payment relating to the property or transaction identified in this document.

The amount, currency, due date, payment purpose, and payment reference are stated in the Key Details section.

Please review your payment records and, where the stated amount remains payable under the applicable agreement or arrangement, make payment in accordance with the payment method and instructions previously agreed.

If payment has already been made, please disregard this reminder and, where appropriate, provide the relevant proof of payment so that the parties' records can be updated.

If there is any difference concerning the amount, due date, payment obligation, or transaction record, the parties should first compare the applicable Rental Agreement, invoice, receipt, transfer record, or other relevant documents before taking further action.

This reminder is not intended to amend the amount, date, rights, or obligations established under the applicable agreement.

This payment reminder is issued in good faith to assist with the proper administration and settlement of the relevant payment.`;

    case "inspection_notice":
      return `Dear Sir / Madam,

By this letter, we provide notice of intended access to the property identified in this document for inspection, condition review, maintenance, repair, viewing, or another purpose stated in the Key Details section.

The proposed access date, time, purpose, and notice period used are stated in the Key Details section.

Access should be carried out in accordance with the applicable Rental Agreement and the rights available to the parties. This notice does not by itself create a right for the sender or any other person to enter the property where such access is not permitted under the Rental Agreement, has not been agreed by the authorized party, or is otherwise unavailable under applicable requirements.

Where reasonably possible, access should take place at the notified or agreed time while respecting the lawful occupant's use and possession of the property.

Any person carrying out the inspection or access should limit the activity to the stated purpose and take reasonable care of the property and belongings located within it.

If the proposed date or time is not practicable, the parties may coordinate an alternative time in accordance with the Rental Agreement and their reasonable requirements.

This access or inspection notice is provided so that the proposed activity can be conducted in an orderly manner and consistently with the arrangements applicable between the parties.`;

    case "viewing_confirmation":
      return `Dear Sir / Madam,

By this letter, we confirm the scheduled viewing of the property identified in this document.

The client's name, viewing date, time, and meeting point are stated in the Key Details section. Please ensure that all information is correct before the scheduled viewing takes place.

The viewing is intended to provide the prospective buyer or tenant with an opportunity to inspect the property directly and obtain relevant information before making any further decision.

If there is any change to the schedule, delay, or special access requirement, please notify the agent or relevant party as soon as reasonably possible so that alternative arrangements can be made.

During the viewing, the prospective buyer or tenant is expected to respect the property, its occupants, the owner, and any applicable access arrangements.

This viewing confirmation does not constitute an offer, acceptance, reservation, tenancy agreement, sale and purchase agreement, or commitment to enter into a transaction unless expressly stated in a separate document.

This viewing confirmation is issued to assist the parties in conducting the scheduled viewing in an orderly manner and obtaining the information required for any further consideration.`;

    case "viewing_acknowledgement":
      return `Dear Sir / Madam,

This document records that the client identified in the Key Details section has attended a viewing of the property stated in this document through the agent or party involved in arranging that viewing.

The viewing date and any relevant notes are stated in the Key Details section.

By signing this document, the parties acknowledge only that the property viewing took place as recorded. This acknowledgement does not by itself constitute an agreement to purchase or rent the property, create an obligation to proceed with a transaction, or replace any other transaction document.

This document also does not by itself create an entitlement to commission, exclusivity, payment obligations, or restrictions on dealing with other parties unless those rights or obligations are validly established under another applicable agreement.

If there is an intention to proceed following the viewing, any subsequent offer, negotiation, or agreement should be recorded through the appropriate document.

This Viewing Acknowledgement is prepared as a record that the property viewing has taken place.`;

    case "key_handover":
      return `Dear Sir / Madam,

This document records the handover of keys and/or access devices for the property identified in this document between the handing-over party and the receiving party.

The handover date, number of keys, other keys or access devices, and relevant notes are stated in the Key Details section.

The receiving party acknowledges receipt of the keys and/or access devices recorded in this document. Where any key, access card, remote control, access code, or other device has not been delivered or is subject to a particular condition, that matter should be clearly recorded before signature.

Keys and access received should be used only for the purpose for which they were provided and in accordance with the agreement or legal relationship underlying the handover. Delivery of keys does not by itself transfer ownership rights in the property or replace a Rental Agreement, sale and purchase agreement, handover record, or other applicable document.

Where keys or access devices must be returned at the end of a tenancy, assignment, viewing, or other permitted use, that obligation remains subject to the relevant agreement or arrangement.

The parties should verify the number and type of keys and access devices delivered before signing this document.

This Key Handover record is prepared as evidence of the recorded delivery and receipt between the parties.`;

    case "general":
    default:
      return `Dear Sir / Madam,

By this letter, we address the matter concerning the property identified in this document as reflected in the subject stated above.

We trust that the information, request, confirmation, or other matter communicated through this letter can be appropriately reviewed by the recipient. If additional information, supporting documents, clarification, or further action is required, the parties may communicate further to ensure that the purpose of this letter is correctly understood.

Any information concerning the property, transaction value, payment obligations, authority, dates, or other terms having legal or commercial consequences should be verified before the letter is used.

This letter may be adjusted, supplemented, or amended by the user according to its actual purpose. Where the intended wording creates rights, obligations, authority, an acknowledgement of debt, an offer, an acceptance, or another commitment, those terms should be clearly expressed and checked against any other applicable agreement or document.

This letter is submitted in good faith. Thank you for your attention and cooperation.`;
  }
}

function bodyForTemplate(
  key:
    AgentLetterTemplateKey,
  language:
    AgentLetterLanguage
) {
  const id =
    bodyId(key);

  if (
    language ===
    "bilingual"
  ) {
    return `${id}\n\n---\n\n${bodyEn(
      key
    )}`;
  }

  return id;
}

function defaultTemplateData(
  key:
    AgentLetterTemplateKey
):
  AgentLetterTemplateData {
  switch (key) {
    case "loi":
      return {
        transactionType: "",
        proposedAmount: "",
        currency: "IDR",
        proposedTerm: "",
        validityDate: "",
        conditions: "",
      };

    case "offer_rent":
      return {
        offeredRent: "",
        currency: "IDR",
        leaseStartDate: "",
        leaseTerm: "",
        securityDeposit: "",
        validityDate: "",
        conditions: "",
      };

    case "offer_purchase":
      return {
        offeredPrice: "",
        currency: "IDR",
        deposit: "",
        paymentTerms: "",
        completionDate: "",
        validityDate: "",
        conditions: "",
      };

    case "letter_authorization":
      return {
        authorityScope: "",
        startDate: "",
        endDate: "",
      };

    case "letter_appointment":
      return {
        appointmentType:
          "open_listing",

        startDate: "",
        endDate: "",
        commission: "",
        scope: "",
      };

    case "co_broking_commission":
      return {
        cooperatingParty: "",
        clientSide: "",
        commissionSplit: "",
        responsibilities: "",
      };

    case "lease_renewal_notice":
      return {
        currentLeaseEnd: "",
        proposedRenewalStart: "",
        proposedRenewalEnd: "",
        proposedRent: "",
        currency: "IDR",
      };

    case "non_renewal_notice":
      return {
        leaseEndDate: "",
        vacateDate: "",
      };

    case "early_termination_notice":
      return {
        noticeDate: "",
        requestedEndDate: "",
        reason: "",
      };

    case "notice_to_vacate":
      return {
        vacateDate: "",
        reason: "",
      };

    case "payment_reminder":
      return {
        amountDue: "",
        currency: "IDR",
        dueDate: "",
        paymentPurpose: "",
        paymentReference: "",
      };

    case "inspection_notice":
      return {
        accessDate: "",
        accessTime: "",
        purpose: "",
        noticeHours: "",
      };

    case "viewing_confirmation":
      return {
        clientName: "",
        viewingDate: "",
        viewingTime: "",
        meetingPoint: "",
      };

    case "viewing_acknowledgement":
      return {
        clientName: "",
        viewingDate: "",
        acknowledgementNotes: "",
      };

    case "key_handover":
      return {
        handoverDate: "",
        keyCount: "",
        accessItems: "",
        handoverNotes: "",
      };

    case "general":
    default:
      return {};
  }
}

function defaultSignatures(
  key:
    AgentLetterTemplateKey,

  senderName:
    string
):
  AgentLetterSignatures {
  switch (key) {
    case "letter_appointment":
      return {
        primary: {
          label:
            "Pemilik / Owner",
          name:
            "",
          role:
            "Owner",
        },

        secondary: {
          label:
            "Agen / Agent",
          name:
            senderName,
          role:
            "Agent",
        },
      };

    case "co_broking_commission":
      return {
        primary: {
          label:
            "Agen A / Agent A",
          name:
            senderName,
          role:
            "Agent",
        },

        secondary: {
          label:
            "Agen B / Agent B",
          name:
            "",
          role:
            "Agent",
        },
      };

    case "viewing_acknowledgement":
      return {
        primary: {
          label:
            "Klien / Client",
          name:
            "",
          role:
            "Client",
        },

        secondary: {
          label:
            "Agen / Agent",
          name:
            senderName,
          role:
            "Agent",
        },
      };

    case "key_handover":
      return {
        primary: {
          label:
            "Diserahkan Oleh / Handed Over By",
          name:
            "",
          role:
            "",
        },

        secondary: {
          label:
            "Diterima Oleh / Received By",
          name:
            "",
          role:
            "",
        },
      };

    case "letter_authorization":
      return {
        primary: {
          label:
            "Pemberi Kuasa / Authorizing Party",
          name:
            "",
          role:
            "",
        },

        secondary: {
          label:
            "Penerima Kuasa / Authorized Party",
          name:
            "",
          role:
            "",
        },
      };

    case "offer_rent":
      return {
        primary: {
          label:
            "Calon Penyewa / Prospective Tenant",
          name:
            "",
          role:
            "",
        },

        secondary:
          null,
      };

    case "offer_purchase":
      return {
        primary: {
          label:
            "Calon Pembeli / Prospective Buyer",
          name:
            "",
          role:
            "",
        },

        secondary:
          null,
      };

    case "loi":
      return {
        primary: {
          label:
            "Pihak yang Menyampaikan / Issuing Party",
          name:
            "",
          role:
            "",
        },

        secondary:
          null,
      };

    default:
      return {
        primary: {
          label:
            "Pengirim / Sender",
          name:
            senderName,
          role:
            "",
        },

        secondary:
          null,
      };
  }
}

function todayDate() {
  return new Date()
    .toISOString()
    .slice(
      0,
      10
    );
}

export function createAgentLetterData(
  input: {
    templateKey:
      AgentLetterTemplateKey;

    language:
      AgentLetterLanguage;

    sender?:
      Partial<
        AgentLetterSender
      >;

    property?:
      AgentLetterProperty | null;
  }
):
  AgentLetterData {
  const sender =
    input.sender ||
    {};

  return {
    version:
      1,

    templateKey:
      input.templateKey,

    language:
      input.language,

    letterDate:
      todayDate(),

    place:
      "",

    sender: {
      name:
        sender.name ||
        "",

      agency:
        sender.agency ||
        "",

      address:
        sender.address ||
        "",

      phone:
        sender.phone ||
        "",

      email:
        sender.email ||
        "",
    },

    recipient: {
      name: "",
      company: "",
      address: "",
      phone: "",
      email: "",
    },

    property:
      input.property ||
      null,

    subject:
      subjectForTemplate(
        input.templateKey,
        input.language
      ),

    salutation:
      input.language ===
      "bilingual"
        ? "Dengan hormat / Dear Sir / Madam,"
        : "Dengan hormat,",

    body:
      bodyForTemplate(
        input.templateKey,
        input.language
      ),

    additionalNotes:
      "",

    closing:
      input.language ===
      "bilingual"
        ? "Hormat kami / Sincerely,"
        : "Hormat kami,",

    signerName:
      sender.name ||
      "",

    signerRole:
      sender.agency
        ? "Agent"
        : "",

    signatures:
      defaultSignatures(
        input.templateKey,
        sender.name ||
        ""
      ),

    templateData:
      defaultTemplateData(
        input.templateKey
      ),
  };
}

export type AgentLetterFieldType =
  | "text"
  | "textarea"
  | "date"
  | "time"
  | "number"
  | "select";

export type AgentLetterFieldOption = {
  value: string;
  labelId: string;
  labelEn: string;
};

export type AgentLetterTemplateField = {
  key: string;

  type:
    AgentLetterFieldType;

  labelId: string;
  labelEn: string;

  placeholderId?: string;
  placeholderEn?: string;

  options?:
    AgentLetterFieldOption[];
};

const CURRENCY_OPTIONS:
  AgentLetterFieldOption[] =
[
  {
    value: "IDR",
    labelId: "IDR",
    labelEn: "IDR",
  },
  {
    value: "USD",
    labelId: "USD",
    labelEn: "USD",
  },
  {
    value: "AUD",
    labelId: "AUD",
    labelEn: "AUD",
  },
];

export function getAgentLetterTemplateFields(
  key:
    AgentLetterTemplateKey
):
  AgentLetterTemplateField[] {
  switch (key) {
    case "loi":
      return [
        {
          key:
            "transactionType",
          type:
            "select",
          labelId:
            "Jenis Transaksi",
          labelEn:
            "Transaction Type",
          options: [
            {
              value:
                "rent",
              labelId:
                "Sewa",
              labelEn:
                "Rent",
            },
            {
              value:
                "purchase",
              labelId:
                "Pembelian",
              labelEn:
                "Purchase",
            },
          ],
        },
        {
          key:
            "proposedAmount",
          type:
            "text",
          labelId:
            "Nilai Penawaran",
          labelEn:
            "Proposed Amount",
        },
        {
          key:
            "currency",
          type:
            "select",
          labelId:
            "Mata Uang",
          labelEn:
            "Currency",
          options:
            CURRENCY_OPTIONS,
        },
        {
          key:
            "proposedTerm",
          type:
            "text",
          labelId:
            "Jangka Waktu yang Diusulkan",
          labelEn:
            "Proposed Term",
        },
        {
          key:
            "validityDate",
          type:
            "date",
          labelId:
            "Berlaku Sampai",
          labelEn:
            "Valid Until",
        },
        {
          key:
            "conditions",
          type:
            "textarea",
          labelId:
            "Ketentuan / Kondisi",
          labelEn:
            "Conditions",
        },
      ];

    case "offer_rent":
      return [
        {
          key:
            "offeredRent",
          type:
            "text",
          labelId:
            "Nilai Penawaran Sewa",
          labelEn:
            "Offered Rent",
        },
        {
          key:
            "currency",
          type:
            "select",
          labelId:
            "Mata Uang",
          labelEn:
            "Currency",
          options:
            CURRENCY_OPTIONS,
        },
        {
          key:
            "leaseStartDate",
          type:
            "date",
          labelId:
            "Tanggal Mulai Sewa",
          labelEn:
            "Lease Start Date",
        },
        {
          key:
            "leaseTerm",
          type:
            "text",
          labelId:
            "Jangka Waktu Sewa",
          labelEn:
            "Lease Term",
        },
        {
          key:
            "securityDeposit",
          type:
            "text",
          labelId:
            "Deposit",
          labelEn:
            "Security Deposit",
        },
        {
          key:
            "validityDate",
          type:
            "date",
          labelId:
            "Penawaran Berlaku Sampai",
          labelEn:
            "Offer Valid Until",
        },
        {
          key:
            "conditions",
          type:
            "textarea",
          labelId:
            "Ketentuan Khusus",
          labelEn:
            "Special Conditions",
        },
      ];

    case "offer_purchase":
      return [
        {
          key:
            "offeredPrice",
          type:
            "text",
          labelId:
            "Harga Penawaran",
          labelEn:
            "Offered Price",
        },
        {
          key:
            "currency",
          type:
            "select",
          labelId:
            "Mata Uang",
          labelEn:
            "Currency",
          options:
            CURRENCY_OPTIONS,
        },
        {
          key:
            "deposit",
          type:
            "text",
          labelId:
            "Deposit",
          labelEn:
            "Deposit",
        },
        {
          key:
            "paymentTerms",
          type:
            "textarea",
          labelId:
            "Skema Pembayaran",
          labelEn:
            "Payment Terms",
        },
        {
          key:
            "completionDate",
          type:
            "date",
          labelId:
            "Target Penyelesaian",
          labelEn:
            "Proposed Completion",
        },
        {
          key:
            "validityDate",
          type:
            "date",
          labelId:
            "Penawaran Berlaku Sampai",
          labelEn:
            "Offer Valid Until",
        },
        {
          key:
            "conditions",
          type:
            "textarea",
          labelId:
            "Ketentuan",
          labelEn:
            "Conditions",
        },
      ];

    case "letter_authorization":
      return [
        {
          key:
            "authorityScope",
          type:
            "textarea",
          labelId:
            "Ruang Lingkup Kuasa",
          labelEn:
            "Scope of Authority",
        },
        {
          key:
            "startDate",
          type:
            "date",
          labelId:
            "Mulai Berlaku",
          labelEn:
            "Effective From",
        },
        {
          key:
            "endDate",
          type:
            "date",
          labelId:
            "Berakhir",
          labelEn:
            "Valid Until",
        },
      ];

    case "letter_appointment":
      return [
        {
          key:
            "appointmentType",
          type:
            "select",
          labelId:
            "Jenis Penunjukan",
          labelEn:
            "Appointment Type",
          options: [
            {
              value:
                "open_listing",
              labelId:
                "Open Listing",
              labelEn:
                "Open Listing",
            },
            {
              value:
                "sole_agency",
              labelId:
                "Sole Agency",
              labelEn:
                "Sole Agency",
            },
            {
              value:
                "exclusive",
              labelId:
                "Exclusive Agency",
              labelEn:
                "Exclusive Agency",
            },
          ],
        },
        {
          key:
            "startDate",
          type:
            "date",
          labelId:
            "Tanggal Mulai",
          labelEn:
            "Start Date",
        },
        {
          key:
            "endDate",
          type:
            "date",
          labelId:
            "Tanggal Berakhir",
          labelEn:
            "End Date",
        },
        {
          key:
            "commission",
          type:
            "text",
          labelId:
            "Komisi",
          labelEn:
            "Commission",
        },
        {
          key:
            "scope",
          type:
            "textarea",
          labelId:
            "Ruang Lingkup Penunjukan",
          labelEn:
            "Appointment Scope",
        },
      ];

    case "co_broking_commission":
      return [
        {
          key:
            "cooperatingParty",
          type:
            "text",
          labelId:
            "Agen / Pihak Rekan",
          labelEn:
            "Cooperating Agent / Party",
        },
        {
          key:
            "clientSide",
          type:
            "text",
          labelId:
            "Pihak Klien",
          labelEn:
            "Client Side",
        },
        {
          key:
            "commissionSplit",
          type:
            "text",
          labelId:
            "Pembagian Komisi",
          labelEn:
            "Commission Split",
        },
        {
          key:
            "responsibilities",
          type:
            "textarea",
          labelId:
            "Peran & Tanggung Jawab",
          labelEn:
            "Roles & Responsibilities",
        },
      ];

    case "lease_renewal_notice":
      return [
        {
          key:
            "currentLeaseEnd",
          type:
            "date",
          labelId:
            "Sewa Saat Ini Berakhir",
          labelEn:
            "Current Lease End",
        },
        {
          key:
            "proposedRenewalStart",
          type:
            "date",
          labelId:
            "Mulai Perpanjangan",
          labelEn:
            "Proposed Renewal Start",
        },
        {
          key:
            "proposedRenewalEnd",
          type:
            "date",
          labelId:
            "Akhir Perpanjangan",
          labelEn:
            "Proposed Renewal End",
        },
        {
          key:
            "proposedRent",
          type:
            "text",
          labelId:
            "Nilai Sewa Baru",
          labelEn:
            "Proposed Rent",
        },
        {
          key:
            "currency",
          type:
            "select",
          labelId:
            "Mata Uang",
          labelEn:
            "Currency",
          options:
            CURRENCY_OPTIONS,
        },
      ];

    case "non_renewal_notice":
      return [
        {
          key:
            "leaseEndDate",
          type:
            "date",
          labelId:
            "Tanggal Berakhir Sewa",
          labelEn:
            "Lease End Date",
        },
        {
          key:
            "vacateDate",
          type:
            "date",
          labelId:
            "Tanggal Pengosongan",
          labelEn:
            "Vacate Date",
        },
      ];

    case "early_termination_notice":
      return [
        {
          key:
            "noticeDate",
          type:
            "date",
          labelId:
            "Tanggal Pemberitahuan",
          labelEn:
            "Notice Date",
        },
        {
          key:
            "requestedEndDate",
          type:
            "date",
          labelId:
            "Tanggal Pengakhiran",
          labelEn:
            "Requested End Date",
        },
        {
          key:
            "reason",
          type:
            "textarea",
          labelId:
            "Alasan",
          labelEn:
            "Reason",
        },
      ];

    case "notice_to_vacate":
      return [
        {
          key:
            "vacateDate",
          type:
            "date",
          labelId:
            "Tanggal Pengosongan",
          labelEn:
            "Vacate Date",
        },
        {
          key:
            "reason",
          type:
            "textarea",
          labelId:
            "Keterangan / Alasan",
          labelEn:
            "Details / Reason",
        },
      ];

    case "payment_reminder":
      return [
        {
          key:
            "amountDue",
          type:
            "text",
          labelId:
            "Jumlah Terutang",
          labelEn:
            "Amount Due",
        },
        {
          key:
            "currency",
          type:
            "select",
          labelId:
            "Mata Uang",
          labelEn:
            "Currency",
          options:
            CURRENCY_OPTIONS,
        },
        {
          key:
            "dueDate",
          type:
            "date",
          labelId:
            "Tanggal Jatuh Tempo",
          labelEn:
            "Due Date",
        },
        {
          key:
            "paymentPurpose",
          type:
            "text",
          labelId:
            "Tujuan Pembayaran",
          labelEn:
            "Payment Purpose",
        },
        {
          key:
            "paymentReference",
          type:
            "text",
          labelId:
            "Referensi Pembayaran",
          labelEn:
            "Payment Reference",
        },
      ];

    case "inspection_notice":
      return [
        {
          key:
            "accessDate",
          type:
            "date",
          labelId:
            "Tanggal Akses",
          labelEn:
            "Access Date",
        },
        {
          key:
            "accessTime",
          type:
            "time",
          labelId:
            "Waktu",
          labelEn:
            "Time",
        },
        {
          key:
            "purpose",
          type:
            "textarea",
          labelId:
            "Tujuan Akses",
          labelEn:
            "Purpose of Access",
        },
        {
          key:
            "noticeHours",
          type:
            "number",
          labelId:
            "Pemberitahuan (Jam)",
          labelEn:
            "Notice (Hours)",
        },
      ];

    case "viewing_confirmation":
      return [
        {
          key:
            "clientName",
          type:
            "text",
          labelId:
            "Nama Klien",
          labelEn:
            "Client Name",
        },
        {
          key:
            "viewingDate",
          type:
            "date",
          labelId:
            "Tanggal Viewing",
          labelEn:
            "Viewing Date",
        },
        {
          key:
            "viewingTime",
          type:
            "time",
          labelId:
            "Waktu Viewing",
          labelEn:
            "Viewing Time",
        },
        {
          key:
            "meetingPoint",
          type:
            "text",
          labelId:
            "Titik Pertemuan",
          labelEn:
            "Meeting Point",
        },
      ];

    case "viewing_acknowledgement":
      return [
        {
          key:
            "clientName",
          type:
            "text",
          labelId:
            "Nama Klien",
          labelEn:
            "Client Name",
        },
        {
          key:
            "viewingDate",
          type:
            "date",
          labelId:
            "Tanggal Viewing",
          labelEn:
            "Viewing Date",
        },
        {
          key:
            "acknowledgementNotes",
          type:
            "textarea",
          labelId:
            "Catatan Viewing",
          labelEn:
            "Viewing Notes",
        },
      ];

    case "key_handover":
      return [
        {
          key:
            "handoverDate",
          type:
            "date",
          labelId:
            "Tanggal Serah Terima",
          labelEn:
            "Handover Date",
        },
        {
          key:
            "keyCount",
          type:
            "number",
          labelId:
            "Jumlah Kunci",
          labelEn:
            "Number of Keys",
        },
        {
          key:
            "accessItems",
          type:
            "text",
          labelId:
            "Kunci / Akses Lainnya",
          labelEn:
            "Other Keys / Access Items",
        },
        {
          key:
            "handoverNotes",
          type:
            "textarea",
          labelId:
            "Catatan Serah Terima",
          labelEn:
            "Handover Notes",
        },
      ];

    case "general":
    default:
      return [];
  }
}


function isLetterRecord(
  value: unknown
): value is Record<string, unknown> {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function letterText(
  value: unknown,
  fallback = ""
) {
  return typeof value === "string"
    ? value
    : fallback;
}

function normalizeTemplateData(
  value: unknown,
  fallback:
    AgentLetterTemplateData
):
  AgentLetterTemplateData {
  if (!isLetterRecord(value)) {
    return fallback;
  }

  const result:
    AgentLetterTemplateData = {
      ...fallback,
    };

  Object.entries(value)
    .forEach(
      ([key, item]) => {
        if (
          typeof item === "string" ||
          typeof item === "number" ||
          typeof item === "boolean"
        ) {
          result[key] =
            item;
        }
      }
    );

  return result;
}

function normalizeSignature(
  value: unknown,
  fallback:
    AgentLetterSignature
):
  AgentLetterSignature {
  if (!isLetterRecord(value)) {
    return fallback;
  }

  return {
    label:
      letterText(
        value.label,
        fallback.label
      ),

    name:
      letterText(
        value.name,
        fallback.name
      ),

    role:
      letterText(
        value.role,
        fallback.role
      ),
  };
}

export function normalizeAgentLetterData(
  value: unknown,

  templateKey:
    AgentLetterTemplateKey,

  language:
    AgentLetterLanguage
):
  AgentLetterData {
  const fallback =
    createAgentLetterData({
      templateKey,
      language,
      property:
        null,
    });

  if (!isLetterRecord(value)) {
    return fallback;
  }

  const sender =
    isLetterRecord(
      value.sender
    )
      ? value.sender
      : {};

  const recipient =
    isLetterRecord(
      value.recipient
    )
      ? value.recipient
      : {};

  let property:
    AgentLetterProperty | null =
    null;

  if (
    value.property !==
      null &&
    isLetterRecord(
      value.property
    )
  ) {
    property = {
      id:
        letterText(
          value.property.id
        ),

      code:
        letterText(
          value.property.code
        ),

      title:
        letterText(
          value.property.title
        ),

      address:
        letterText(
          value.property.address
        ),

      location:
        letterText(
          value.property.location
        ),

      propertyType:
        letterText(
          value.property.propertyType
        ),
    };
  }

  const rawSignatures =
    isLetterRecord(
      value.signatures
    )
      ? value.signatures
      : {};

  const fallbackSignatures =
    fallback.signatures;

  const primary =
    normalizeSignature(
      rawSignatures.primary,
      fallbackSignatures.primary
    );

  let secondary:
    AgentLetterSignature | null =
    fallbackSignatures.secondary;

  if (
    rawSignatures.secondary ===
    null
  ) {
    secondary =
      null;
  } else if (
    isLetterRecord(
      rawSignatures.secondary
    )
  ) {
    secondary =
      normalizeSignature(
        rawSignatures.secondary,
        fallbackSignatures.secondary || {
          label:
            "Pihak Kedua / Second Party",
          name:
            "",
          role:
            "",
        }
      );
  }

  return {
    ...fallback,

    version:
      1,

    templateKey,

    language:
      value.language ===
      "bilingual"
        ? "bilingual"
        : value.language ===
            "id"
          ? "id"
          : language,

    letterDate:
      letterText(
        value.letterDate,
        fallback.letterDate
      ),

    place:
      letterText(
        value.place,
        fallback.place
      ),

    sender: {
      name:
        letterText(
          sender.name,
          fallback.sender.name
        ),

      agency:
        letterText(
          sender.agency,
          fallback.sender.agency
        ),

      address:
        letterText(
          sender.address,
          fallback.sender.address
        ),

      phone:
        letterText(
          sender.phone,
          fallback.sender.phone
        ),

      email:
        letterText(
          sender.email,
          fallback.sender.email
        ),
    },

    recipient: {
      name:
        letterText(
          recipient.name
        ),

      company:
        letterText(
          recipient.company
        ),

      address:
        letterText(
          recipient.address
        ),

      phone:
        letterText(
          recipient.phone
        ),

      email:
        letterText(
          recipient.email
        ),
    },

    property,

    subject:
      letterText(
        value.subject,
        fallback.subject
      ),

    salutation:
      letterText(
        value.salutation,
        fallback.salutation
      ),

    body:
      letterText(
        value.body,
        fallback.body
      ),

    additionalNotes:
      letterText(
        value.additionalNotes
      ),

    closing:
      letterText(
        value.closing,
        fallback.closing
      ),

    signerName:
      letterText(
        value.signerName,
        fallback.signerName
      ),

    signerRole:
      letterText(
        value.signerRole,
        fallback.signerRole
      ),

    signatures: {
      primary,
      secondary,
    },

    templateData:
      normalizeTemplateData(
        value.templateData,
        fallback.templateData
      ),
  };
}
