import type {
  AgentLetterTemplateKey,
} from "@/lib/agent-letter";

export type AgentLetterLegalRisk =
  | "standard"
  | "review_required"
  | "heightened";

export type AgentLetterLegalProfile = {
  risk:
    AgentLetterLegalRisk;

  character:
    | "correspondence"
    | "preliminary"
    | "may_create_obligations"
    | "authorization"
    | "underlying_agreement_notice";

  legalBasis:
    string[];

  noticeId:
    string;

  noticeEn:
    string;

  professionalReviewRecommended:
    boolean;

  checkMeterai:
    boolean;

  checkNotaryOrPpat:
    boolean;
};

/*
 * IMPORTANT:
 *
 * These notices belong to the Tetamo editor/interface.
 * They are NOT intended to appear inside the final
 * professional Letter & Document PDF.
 */

export const AGENT_LETTER_UNIVERSAL_NOTICE = {
  id:
    "Tetamo menyediakan template dan membantu menyiapkan draft dokumen berdasarkan informasi yang dimasukkan oleh pengguna serta kerangka hukum Indonesia yang relevan. Template ini bukan nasihat hukum dan tidak menjamin bahwa suatu dokumen sesuai atau memiliki akibat hukum tertentu untuk setiap transaksi atau keadaan. Sebelum menggunakan atau menandatangani dokumen, pastikan identitas dan kewenangan para pihak, detail properti, nilai transaksi, tanggal, kewajiban, ketentuan dalam perjanjian yang mendasari, serta persyaratan hukum lainnya telah diperiksa. Untuk dokumen yang dapat menimbulkan hak atau kewajiban hukum atau memerlukan tindakan notaris, PPAT, perpajakan, Bea Meterai, atau persyaratan lainnya, pertimbangkan pemeriksaan oleh profesional yang berwenang.",

  en:
    "Tetamo provides templates and assists in preparing document drafts using information entered by the user and the relevant Indonesian legal framework. These templates are not legal advice and do not guarantee that a document is suitable or will have a particular legal effect in every transaction or circumstance. Before using or signing a document, verify the identities and authority of the parties, property details, transaction values, dates, obligations, any underlying agreement, and other applicable requirements. Where a document may create legal rights or obligations or may require notarial, PPAT, tax, Stamp Duty, or other formal requirements, consider review by an appropriately qualified professional.",
} as const;


const BASE_CONTRACT_LAW = [
  "KUHPerdata Pasal 1320",
  "KUHPerdata Pasal 1338",
  "UU 24 Tahun 2009",
  "Perpres 63 Tahun 2019",
];

const BROKER_FRAMEWORK = [
  "Permendag 33 Tahun 2025",
  "Permendag 27 Tahun 2025",
];

const LEASE_FRAMEWORK = [
  "KUHPerdata Pasal 1548 dan ketentuan sewa-menyewa terkait",
];


export function getAgentLetterLegalProfile(
  key:
    AgentLetterTemplateKey
):
  AgentLetterLegalProfile {
  switch (key) {
    /*
     * -----------------------------------------------------
     * OFFERS & INTENT
     * -----------------------------------------------------
     */

    case "loi":
      return {
        risk:
          "heightened",

        character:
          "preliminary",

        legalBasis: [
          ...BASE_CONTRACT_LAW,
        ],

        noticeId:
          "LOI dapat menimbulkan akibat hukum tergantung pada isi, penerimaan, tindakan para pihak, dan cara ketentuannya dirumuskan. Sebelum digunakan, pastikan dokumen menjelaskan dengan jelas ketentuan mana yang dimaksudkan sebagai pernyataan awal dan apakah ada bagian tertentu yang dimaksudkan mengikat. LOI ini tidak dengan sendirinya mengalihkan hak atas properti.",

        noticeEn:
          "An LOI may have legal consequences depending on its wording, acceptance, the conduct of the parties, and how its terms are expressed. Before use, ensure the document clearly identifies which provisions are preliminary and whether any particular provisions are intended to be binding. This LOI does not by itself transfer property rights.",

        professionalReviewRecommended:
          true,

        checkMeterai:
          true,

        checkNotaryOrPpat:
          false,
      };


    case "offer_rent":
      return {
        risk:
          "review_required",

        character:
          "may_create_obligations",

        legalBasis: [
          ...BASE_CONTRACT_LAW,
          ...LEASE_FRAMEWORK,
        ],

        noticeId:
          "Penawaran sewa dapat menimbulkan kewajiban apabila diterima atau jika para pihak bertindak berdasarkan penawaran tersebut. Periksa nilai sewa, periode, tanggal mulai, deposit, kondisi, masa berlaku penawaran, dan keterkaitannya dengan Rental Agreement sebelum digunakan.",

        noticeEn:
          "A rental offer may create obligations if accepted or acted upon by the parties. Verify the rental amount, term, commencement date, deposit, conditions, offer validity, and its relationship with the Rental Agreement before use.",

        professionalReviewRecommended:
          false,

        checkMeterai:
          true,

        checkNotaryOrPpat:
          false,
      };


    case "offer_purchase":
      return {
        risk:
          "heightened",

        character:
          "may_create_obligations",

        legalBasis: [
          ...BASE_CONTRACT_LAW,
        ],

        noticeId:
          "Penawaran pembelian dapat menimbulkan kewajiban tergantung pada isi dan penerimaannya. Pastikan harga, deposit, syarat pembayaran, kondisi, masa berlaku penawaran, identitas properti, dan kewenangan pihak yang menawarkan telah diperiksa. Dokumen penawaran ini bukan akta pemindahan hak atas tanah dan tidak menggantikan proses pertanahan atau PPAT yang diwajibkan.",

        noticeEn:
          "A purchase offer may create obligations depending on its wording and acceptance. Verify the price, deposit, payment terms, conditions, offer validity, property identity, and authority of the issuing party. This offer is not an instrument transferring land rights and does not replace any required land or PPAT process.",

        professionalReviewRecommended:
          true,

        checkMeterai:
          true,

        checkNotaryOrPpat:
          true,
      };


    /*
     * -----------------------------------------------------
     * AUTHORIZATION & AGENCY
     * -----------------------------------------------------
     */

    case "letter_authorization":
      return {
        risk:
          "heightened",

        character:
          "authorization",

        legalBasis: [
          ...BASE_CONTRACT_LAW,
          "KUHPerdata Pasal 1792",
          "KUHPerdata Pasal 1795",
          "KUHPerdata Pasal 1796",
          "KUHPerdata Pasal 1797",
        ],

        noticeId:
          "Pastikan pemberi kuasa berwenang memberikan kuasa dan ruang lingkup kewenangan dijelaskan secara spesifik. Kuasa umum pada prinsipnya mencakup tindakan pengurusan, sedangkan tindakan tertentu yang bersifat pemilikan atau pengalihan memerlukan kewenangan yang dinyatakan secara tegas dan dapat tunduk pada persyaratan bentuk atau proses hukum lainnya. Jangan menggunakan template umum ini untuk pengalihan hak atas tanah, penandatanganan akta pertanahan, pembebanan hak, atau tindakan khusus lainnya tanpa pemeriksaan profesional.",

        noticeEn:
          "Ensure that the authorizing party has authority to grant the mandate and that its scope is described specifically. A general authority principally covers management acts, while certain ownership or disposal acts require express authority and may be subject to additional form or legal-process requirements. Do not use this general template for transfer of land rights, execution of land instruments, encumbrances, or other special acts without professional review.",

        professionalReviewRecommended:
          true,

        checkMeterai:
          true,

        checkNotaryOrPpat:
          true,
      };


    case "letter_appointment":
      return {
        risk:
          "heightened",

        character:
          "may_create_obligations",

        legalBasis: [
          ...BASE_CONTRACT_LAW,
          ...BROKER_FRAMEWORK,
        ],

        noticeId:
          "Pastikan jenis penunjukan agen, ruang lingkup jasa, properti, masa berlaku, hak dan kewajiban para pihak, komisi, cara dan waktu pembayaran, serta ketentuan pengakhiran telah dinyatakan secara jelas. Penunjukan Open Listing, Sole Agency, dan Exclusive Agency memiliki konsekuensi komersial yang berbeda dan harus dipahami oleh para pihak sebelum ditandatangani.",

        noticeEn:
          "Ensure the appointment type, service scope, property, term, rights and obligations, commission, payment method and timing, and termination provisions are clearly stated. Open Listing, Sole Agency, and Exclusive Agency arrangements have different commercial consequences and should be understood by the parties before signing.",

        professionalReviewRecommended:
          true,

        checkMeterai:
          true,

        checkNotaryOrPpat:
          false,
      };


    case "co_broking_commission":
      return {
        risk:
          "heightened",

        character:
          "may_create_obligations",

        legalBasis: [
          ...BASE_CONTRACT_LAW,
          ...BROKER_FRAMEWORK,
        ],

        noticeId:
          "Untuk kerja sama co-broking, periksa identitas dan kewenangan pihak yang bekerja sama, ruang lingkup jasa, objek properti, pembagian peran, hak dan kewajiban, nilai atau persentase komisi, tata cara dan waktu pembayaran, jangka waktu kerja sama, serta mekanisme penyelesaian perselisihan. Pastikan juga keterkaitannya dengan perjanjian antara broker dan pengguna jasa apabila sudah ada.",

        noticeEn:
          "For co-broking arrangements, verify the identities and authority of the cooperating parties, service scope, property, division of roles, rights and obligations, commission amount or percentage, payment method and timing, cooperation period, and dispute-resolution mechanism. Also verify consistency with any existing agreement between the broker and the client.",

        professionalReviewRecommended:
          true,

        checkMeterai:
          true,

        checkNotaryOrPpat:
          false,
      };


    /*
     * -----------------------------------------------------
     * TENANCY & NOTICES
     * -----------------------------------------------------
     */

    case "lease_renewal_notice":
      return {
        risk:
          "review_required",

        character:
          "underlying_agreement_notice",

        legalBasis: [
          ...BASE_CONTRACT_LAW,
          ...LEASE_FRAMEWORK,
        ],

        noticeId:
          "Periksa Rental Agreement yang berlaku sebelum mengirim pemberitahuan perpanjangan. Pastikan periode pemberitahuan, tanggal akhir sewa, nilai sewa baru, periode perpanjangan, dan ketentuan lain sesuai dengan hak serta kewajiban para pihak.",

        noticeEn:
          "Review the existing Rental Agreement before issuing a renewal notice. Verify the notice period, current lease end date, proposed rent, renewal period, and other terms against the parties' existing rights and obligations.",

        professionalReviewRecommended:
          false,

        checkMeterai:
          false,

        checkNotaryOrPpat:
          false,
      };


    case "non_renewal_notice":
      return {
        risk:
          "review_required",

        character:
          "underlying_agreement_notice",

        legalBasis: [
          ...BASE_CONTRACT_LAW,
          ...LEASE_FRAMEWORK,
        ],

        noticeId:
          "Pastikan Rental Agreement memberikan dasar dan periode pemberitahuan yang sesuai untuk tidak memperpanjang sewa. Template ini tidak mengubah tanggal berakhir atau hak para pihak yang sudah ditetapkan dalam perjanjian.",

        noticeEn:
          "Ensure the Rental Agreement supports the relevant notice period and basis for non-renewal. This template does not change an existing lease end date or any rights already established by the agreement.",

        professionalReviewRecommended:
          false,

        checkMeterai:
          false,

        checkNotaryOrPpat:
          false,
      };


    case "early_termination_notice":
      return {
        risk:
          "heightened",

        character:
          "underlying_agreement_notice",

        legalBasis: [
          ...BASE_CONTRACT_LAW,
          ...LEASE_FRAMEWORK,
        ],

        noticeId:
          "Pastikan pihak yang mengirim pemberitahuan memiliki hak untuk mengakhiri sewa sebelum waktunya berdasarkan Rental Agreement atau dasar hukum lain yang berlaku. Periksa alasan, periode pemberitahuan, tanggal efektif, kewajiban pembayaran, deposit, serah terima, dan ketentuan penyelesaian. Template ini tidak menciptakan hak pengakhiran yang sebelumnya tidak dimiliki.",

        noticeEn:
          "Ensure the issuing party has a right to terminate the lease early under the Rental Agreement or another applicable legal basis. Verify the reason, notice period, effective date, payment obligations, deposit, handover, and settlement provisions. This template does not create a termination right that the party does not otherwise possess.",

        professionalReviewRecommended:
          true,

        checkMeterai:
          false,

        checkNotaryOrPpat:
          false,
      };


    case "notice_to_vacate":
      return {
        risk:
          "heightened",

        character:
          "underlying_agreement_notice",

        legalBasis: [
          ...BASE_CONTRACT_LAW,
          ...LEASE_FRAMEWORK,
        ],

        noticeId:
          "Sebelum menggunakan Notice to Vacate, periksa siapa yang berwenang memberikan pemberitahuan, alasan pengosongan, tanggal efektif, periode pemberitahuan, dan ketentuan Rental Agreement yang mendasarinya. Template ini bukan perintah pengadilan dan tidak memberikan kewenangan pengosongan paksa.",

        noticeEn:
          "Before using a Notice to Vacate, verify who is authorized to issue it, the basis for vacating, the effective date, required notice period, and the relevant Rental Agreement provisions. This template is not a court order and does not authorize forced eviction.",

        professionalReviewRecommended:
          true,

        checkMeterai:
          false,

        checkNotaryOrPpat:
          false,
      };


    case "payment_reminder":
      return {
        risk:
          "review_required",

        character:
          "correspondence",

        legalBasis: [
          ...BASE_CONTRACT_LAW,
        ],

        noticeId:
          "Pastikan jumlah, jatuh tempo, tujuan pembayaran, dan dasar kewajiban pembayaran sesuai dengan perjanjian, invoice, atau catatan transaksi. Jika jumlah atau kewajiban sedang disengketakan, jangan menggambarkannya sebagai utang yang tidak terbantahkan.",

        noticeEn:
          "Verify the amount, due date, payment purpose, and basis for payment against the agreement, invoice, or transaction records. If the amount or obligation is disputed, do not present it as an undisputed debt.",

        professionalReviewRecommended:
          false,

        checkMeterai:
          false,

        checkNotaryOrPpat:
          false,
      };


    case "inspection_notice":
      return {
        risk:
          "review_required",

        character:
          "underlying_agreement_notice",

        legalBasis: [
          ...BASE_CONTRACT_LAW,
          ...LEASE_FRAMEWORK,
        ],

        noticeId:
          "Pastikan hak akses atau inspeksi, alasan akses, periode pemberitahuan, tanggal, dan waktu sesuai dengan Rental Agreement serta ketentuan yang berlaku. Template ini tidak memberikan hak masuk ke properti apabila hak tersebut tidak dimiliki oleh pengirim.",

        noticeEn:
          "Verify the right of access or inspection, purpose, notice period, date, and time against the Rental Agreement and applicable requirements. This template does not grant a right of entry where the issuing party does not otherwise have one.",

        professionalReviewRecommended:
          false,

        checkMeterai:
          false,

        checkNotaryOrPpat:
          false,
      };


    /*
     * -----------------------------------------------------
     * VIEWING & HANDOVER
     * -----------------------------------------------------
     */

    case "viewing_confirmation":
      return {
        risk:
          "standard",

        character:
          "correspondence",

        legalBasis: [
          ...BROKER_FRAMEWORK,
        ],

        noticeId:
          "Periksa nama klien, properti, tanggal, waktu, titik pertemuan, dan detail agen sebelum dikirim. Dokumen ini hanya merupakan konfirmasi viewing kecuali secara tegas memuat ketentuan lain.",

        noticeEn:
          "Verify the client's name, property, date, time, meeting point, and agent details before sending. This document is only a viewing confirmation unless it expressly contains additional terms.",

        professionalReviewRecommended:
          false,

        checkMeterai:
          false,

        checkNotaryOrPpat:
          false,
      };


    case "viewing_acknowledgement":
      return {
        risk:
          "review_required",

        character:
          "correspondence",

        legalBasis: [
          ...BROKER_FRAMEWORK,
        ],

        noticeId:
          "Dokumen ini dapat mencatat bahwa viewing dilakukan melalui agen tertentu, tetapi jangan menggunakannya sebagai satu-satunya dasar hak komisi, eksklusivitas, atau kewajiban klien apabila hal tersebut tidak tercantum dalam perjanjian terpisah yang berlaku.",

        noticeEn:
          "This document may record that a viewing took place through a particular agent, but it should not be treated as the sole basis for commission entitlement, exclusivity, or client obligations unless those matters are established in a separate applicable agreement.",

        professionalReviewRecommended:
          false,

        checkMeterai:
          false,

        checkNotaryOrPpat:
          false,
      };


    case "key_handover":
      return {
        risk:
          "review_required",

        character:
          "correspondence",

        legalBasis: [
          ...LEASE_FRAMEWORK,
        ],

        noticeId:
          "Pastikan pihak yang menyerahkan dan menerima, tanggal serah terima, jumlah kunci, kartu akses atau perangkat akses lainnya, serta kondisi atau catatan yang relevan telah dicatat. Surat serah terima ini tidak dengan sendirinya mengalihkan hak kepemilikan atau menggantikan Rental Agreement.",

        noticeEn:
          "Verify the handing-over and receiving parties, handover date, number of keys, access cards or other access devices, and any relevant condition notes. This handover record does not by itself transfer ownership rights or replace the Rental Agreement.",

        professionalReviewRecommended:
          false,

        checkMeterai:
          false,

        checkNotaryOrPpat:
          false,
      };


    /*
     * -----------------------------------------------------
     * GENERAL
     * -----------------------------------------------------
     */

    case "general":
    default:
      return {
        risk:
          "review_required",

        character:
          "correspondence",

        legalBasis: [
          ...BASE_CONTRACT_LAW,
        ],

        noticeId:
          "Isi dan akibat hukum surat umum bergantung pada apa yang ditulis oleh pengguna. Pastikan surat tidak memberikan kewenangan, janji, pengakuan utang, pengalihan hak, atau kewajiban lain yang tidak dimaksudkan oleh pengirim.",

        noticeEn:
          "The meaning and legal effect of a general letter depend on the wording entered by the user. Ensure the letter does not unintentionally grant authority, make promises, acknowledge debt, transfer rights, or create other obligations that the sender does not intend.",

        professionalReviewRecommended:
          false,

        checkMeterai:
          false,

        checkNotaryOrPpat:
          false,
      };
  }
}
