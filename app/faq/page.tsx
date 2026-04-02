"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/app/context/LanguageContext";
import { supabase } from "@/lib/supabase";

type LangText = {
  id: string;
  en: string;
};

type FAQItem = {
  id: string;
  category: LangText;
  question: LangText;
  answer: LangText;
};

const DEFAULT_HERO =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1800&q=80";

const ITEMS_PER_PAGE = 10;

const INITIAL_FAQS: FAQItem[] = [
  {
    id: "faq-1",
    category: { id: "Umum", en: "General" },
    question: {
      id: "Apa itu TeTaMo?",
      en: "What is TeTaMo?",
    },
    answer: {
      id: "TeTaMo adalah platform real estate hub yang membantu pemilik, agen, pembeli, dan penyewa terhubung dalam satu tempat yang lebih rapi, modern, dan mudah dipahami.",
      en: "TeTaMo is a real estate hub platform that helps owners, agents, buyers, and renters connect in one place that feels cleaner, more modern, and easier to understand.",
    },
  },
  {
    id: "faq-2",
    category: { id: "Pemilik", en: "Owners" },
    question: {
      id: "Apakah pemilik boleh menjual sendiri tanpa agen?",
      en: "Can owners sell by themselves without an agent?",
    },
    answer: {
      id: "Boleh. Namun untuk proses yang lebih rapi dan aman, TeTaMo tetap menyarankan bantuan agen saat sudah ada pembeli serius.",
      en: "Yes. However, for a cleaner and safer process, TeTaMo still recommends agent support once there is a serious buyer.",
    },
  },
  {
    id: "faq-3",
    category: { id: "Verifikasi", en: "Verification" },
    question: {
      id: "Bagaimana sistem verifikasi listing di TeTaMo?",
      en: "How does listing verification work on TeTaMo?",
    },
    answer: {
      id: "Listing dapat tampil dengan status seperti Pending Verifikasi atau Terverifikasi agar pengguna lebih mudah memahami tingkat validasi listing.",
      en: "Listings can appear with statuses such as Pending Verification or Verified so users can better understand the listing’s validation level.",
    },
  },
  {
    id: "faq-4",
    category: { id: "Biaya", en: "Fees" },
    question: {
      id: "Apakah TeTaMo mengambil komisi dari penjualan?",
      en: "Does TeTaMo take commission from a sale?",
    },
    answer: {
      id: "Tidak. TeTaMo fokus pada exposure, kejelasan profil, dan kemudahan interaksi antara pihak yang terlibat.",
      en: "No. TeTaMo focuses on exposure, profile clarity, and smoother interaction between the parties involved.",
    },
  },
  {
    id: "faq-5",
    category: { id: "Viewing", en: "Viewing" },
    question: {
      id: "Apakah jadwal viewing bisa dibuat lebih cepat?",
      en: "Can viewing schedules be arranged more quickly?",
    },
    answer: {
      id: "Ya. TeTaMo dirancang agar proses inquiry dan jadwal viewing terasa lebih jelas, lebih cepat, dan lebih terarah.",
      en: "Yes. TeTaMo is designed so the inquiry and viewing process feels clearer, faster, and more structured.",
    },
  },
  {
    id: "faq-6",
    category: { id: "Agen", en: "Agents" },
    question: {
      id: "Apakah agen harus memiliki lisensi untuk bergabung?",
      en: "Do agents need a license to join?",
    },
    answer: {
      id: "TeTaMo mendorong agen memiliki identitas profesional dan legalitas yang jelas untuk membangun kepercayaan yang lebih kuat.",
      en: "TeTaMo encourages agents to have clear professional identity and legal standing in order to build stronger trust.",
    },
  },
  {
    id: "faq-7",
    category: { id: "Listing", en: "Listings" },
    question: {
      id: "Berapa lama listing tayang di TeTaMo?",
      en: "How long does a listing stay live on TeTaMo?",
    },
    answer: {
      id: "Durasi tayang listing mengikuti paket atau masa aktif yang digunakan oleh pemilik atau agen.",
      en: "The listing duration follows the package or active period used by the owner or agent.",
    },
  },
  {
    id: "faq-8",
    category: { id: "Listing", en: "Listings" },
    question: {
      id: "Apakah saya bisa mengedit listing setelah dipublikasikan?",
      en: "Can I edit a listing after it is published?",
    },
    answer: {
      id: "Ya. Pemilik atau agen dapat mengedit data listing sesuai hak akses dashboard mereka.",
      en: "Yes. Owners or agents can edit listing details according to their dashboard access.",
    },
  },
  {
    id: "faq-9",
    category: { id: "Pembeli", en: "Buyers" },
    question: {
      id: "Apakah pembeli harus membuat akun untuk menghubungi agen?",
      en: "Do buyers need an account to contact an agent?",
    },
    answer: {
      id: "Untuk tindakan tertentu, pengguna dapat diminta login terlebih dahulu agar interaksi lebih aman dan lebih tercatat.",
      en: "For certain actions, users may be asked to log in first so interactions are safer and better recorded.",
    },
  },
  {
    id: "faq-10",
    category: { id: "Umum", en: "General" },
    question: {
      id: "Apakah TeTaMo hanya untuk rumah?",
      en: "Is TeTaMo only for houses?",
    },
    answer: {
      id: "Tidak. TeTaMo dapat digunakan untuk rumah, apartemen, villa, tanah, ruko, kantor, dan properti komersial lainnya.",
      en: "No. TeTaMo can be used for houses, apartments, villas, land, shop lots, offices, and other commercial properties.",
    },
  },
  {
    id: "faq-11",
    category: { id: "Listing", en: "Listings" },
    question: {
      id: "Apakah listing sewa dan jual dipisahkan?",
      en: "Are rental and sale listings separated?",
    },
    answer: {
      id: "Ya. Listing dapat dibedakan berdasarkan jenis seperti dijual dan disewa agar pencarian lebih jelas.",
      en: "Yes. Listings can be separated by type such as for sale and for rent so search results are clearer.",
    },
  },
  {
    id: "faq-12",
    category: { id: "Agen", en: "Agents" },
    question: {
      id: "Bagaimana TeTaMo membantu agen mendapatkan buyer?",
      en: "How does TeTaMo help agents get buyers?",
    },
    answer: {
      id: "TeTaMo membantu lewat exposure listing, featured placement, profil agen, dan pengalaman pencarian yang lebih jelas bagi pengguna.",
      en: "TeTaMo helps through listing exposure, featured placement, agent profiles, and a clearer search experience for users.",
    },
  },
  {
    id: "faq-13",
    category: { id: "Pendanaan", en: "Financing" },
    question: {
      id: "Apakah TeTaMo menyediakan simulasi KPR?",
      en: "Does TeTaMo provide mortgage simulations?",
    },
    answer: {
      id: "Untuk listing tertentu, TeTaMo dapat menampilkan estimasi pembiayaan agar pengguna memiliki gambaran awal.",
      en: "For certain listings, TeTaMo can show financing estimates so users have an initial understanding.",
    },
  },
  {
    id: "faq-14",
    category: { id: "Pendanaan", en: "Financing" },
    question: {
      id: "Apakah hasil simulasi KPR adalah angka final?",
      en: "Are mortgage simulation results final numbers?",
    },
    answer: {
      id: "Tidak. Simulasi hanya bersifat estimasi dan angka final bergantung pada kebijakan bank serta profil peminjam.",
      en: "No. The simulation is only an estimate, and final figures depend on the bank’s policy and the borrower’s profile.",
    },
  },
  {
    id: "faq-15",
    category: { id: "Agen", en: "Agents" },
    question: {
      id: "Apakah agen bisa memasang lebih dari satu listing?",
      en: "Can agents post more than one listing?",
    },
    answer: {
      id: "Ya. Jumlah listing aktif tergantung paket atau akses yang digunakan.",
      en: "Yes. The number of active listings depends on the package or access being used.",
    },
  },
  {
    id: "faq-16",
    category: { id: "Pemilik", en: "Owners" },
    question: {
      id: "Apakah pemilik bisa menggunakan TeTaMo tanpa berlangganan agen?",
      en: "Can owners use TeTaMo without subscribing to an agent service?",
    },
    answer: {
      id: "Ya. Pemilik dapat mengiklankan propertinya sendiri sesuai sistem dan paket yang tersedia.",
      en: "Yes. Owners can advertise their property themselves according to the system and packages available.",
    },
  },
  {
    id: "faq-17",
    category: { id: "Listing", en: "Listings" },
    question: {
      id: "Apa itu featured listing?",
      en: "What is a featured listing?",
    },
    answer: {
      id: "Featured listing adalah listing yang mendapatkan penempatan lebih menonjol untuk membantu meningkatkan visibilitas.",
      en: "A featured listing is a listing that gets more prominent placement to help increase visibility.",
    },
  },
  {
    id: "faq-18",
    category: { id: "Listing", en: "Listings" },
    question: {
      id: "Apakah saya bisa mengunggah banyak foto properti?",
      en: "Can I upload many property photos?",
    },
    answer: {
      id: "Ya. Listing yang baik sebaiknya memiliki beberapa foto agar pengguna bisa memahami properti dengan lebih jelas.",
      en: "Yes. A good listing should include several photos so users can understand the property more clearly.",
    },
  },
  {
    id: "faq-19",
    category: { id: "Agen", en: "Agents" },
    question: {
      id: "Apakah TeTaMo cocok untuk agen baru?",
      en: "Is TeTaMo suitable for new agents?",
    },
    answer: {
      id: "Ya. TeTaMo dapat membantu agen baru membangun profil, menampilkan listing, dan terlihat lebih profesional.",
      en: "Yes. TeTaMo can help new agents build a profile, showcase listings, and appear more professional.",
    },
  },
  {
    id: "faq-20",
    category: { id: "Pembeli", en: "Buyers" },
    question: {
      id: "Apakah TeTaMo bisa membantu buyer menemukan agen?",
      en: "Can TeTaMo help buyers find an agent?",
    },
    answer: {
      id: "Ya. Buyer dapat diarahkan ke agen yang sesuai berdasarkan area dan kebutuhan properti.",
      en: "Yes. Buyers can be directed to suitable agents based on area and property needs.",
    },
  },
  {
    id: "faq-21",
    category: { id: "Edukasi", en: "Education" },
    question: {
      id: "Apakah TeTaMo menyediakan edukasi properti?",
      en: "Does TeTaMo provide property education?",
    },
    answer: {
      id: "Ya. TeTaMo dapat memiliki halaman edukasi berisi panduan, artikel, video, dan materi pengetahuan properti.",
      en: "Yes. TeTaMo can include an education section with guides, articles, videos, and property knowledge materials.",
    },
  },
  {
    id: "faq-22",
    category: { id: "Privasi", en: "Privacy" },
    question: {
      id: "Apakah data saya aman di TeTaMo?",
      en: "Is my data safe on TeTaMo?",
    },
    answer: {
      id: "TeTaMo berupaya menjaga data pengguna dengan baik dan menggunakannya sesuai kebutuhan platform.",
      en: "TeTaMo aims to protect user data properly and use it only according to platform needs.",
    },
  },
  {
    id: "faq-23",
    category: { id: "Listing", en: "Listings" },
    question: {
      id: "Apakah saya bisa menghapus listing saya nanti?",
      en: "Can I remove my listing later?",
    },
    answer: {
      id: "Ya. Listing dapat dinonaktifkan, diarsipkan, atau dihapus sesuai fitur yang tersedia.",
      en: "Yes. Listings can be deactivated, archived, or deleted according to the available features.",
    },
  },
  {
    id: "faq-24",
    category: { id: "Support", en: "Support" },
    question: {
      id: "Bagaimana jika saya butuh bantuan dari admin?",
      en: "What if I need help from admin?",
    },
    answer: {
      id: "Anda dapat menghubungi tim TeTaMo melalui halaman kontak atau kanal bantuan yang tersedia.",
      en: "You can contact the TeTaMo team through the contact page or available support channels.",
    },
  },
  {
    id: "faq-25",
    category: { id: "Pemilik", en: "Owners" },
    question: {
      id: "Apakah pemilik bisa menerima inquiry langsung?",
      en: "Can owners receive inquiries directly?",
    },
    answer: {
      id: "Ya. Sistem TeTaMo dapat diarahkan untuk membantu pemilik menerima inquiry dengan lebih langsung dan jelas.",
      en: "Yes. The TeTaMo system can be designed to help owners receive inquiries more directly and clearly.",
    },
  },
  {
    id: "faq-26",
    category: { id: "Agen", en: "Agents" },
    question: {
      id: "Apakah profil agen penting di TeTaMo?",
      en: "Is the agent profile important on TeTaMo?",
    },
    answer: {
      id: "Ya. Profil agen membantu membangun kepercayaan, memperjelas identitas, dan membuat listing terlihat lebih profesional.",
      en: "Yes. The agent profile helps build trust, clarify identity, and make listings look more professional.",
    },
  },
  {
    id: "faq-27",
    category: { id: "Listing", en: "Listings" },
    question: {
      id: "Apakah deskripsi listing yang baik berpengaruh?",
      en: "Does a good listing description matter?",
    },
    answer: {
      id: "Sangat berpengaruh. Deskripsi yang jelas membantu pengguna memahami nilai properti lebih cepat.",
      en: "Very much. A clear description helps users understand the property’s value more quickly.",
    },
  },
  {
    id: "faq-28",
    category: { id: "Search", en: "Search" },
    question: {
      id: "Apakah pengguna bisa mencari properti berdasarkan area?",
      en: "Can users search for property by area?",
    },
    answer: {
      id: "Ya. Pencarian berdasarkan area adalah bagian penting agar pengguna bisa menemukan properti yang relevan lebih cepat.",
      en: "Yes. Searching by area is an important part of helping users find relevant properties faster.",
    },
  },
  {
    id: "faq-29",
    category: { id: "Search", en: "Search" },
    question: {
      id: "Apakah filter pencarian akan terus dikembangkan?",
      en: "Will search filters continue to be improved?",
    },
    answer: {
      id: "Ya. Filter dapat terus dikembangkan agar pengalaman mencari properti menjadi lebih presisi dan nyaman.",
      en: "Yes. Filters can continue to be improved so the property search experience becomes more precise and comfortable.",
    },
  },
  {
    id: "faq-30",
    category: { id: "Pembeli", en: "Buyers" },
    question: {
      id: "Apakah buyer bisa menyimpan properti favorit?",
      en: "Can buyers save favorite properties?",
    },
    answer: {
      id: "Fitur seperti simpan favorit dapat membantu buyer kembali ke listing yang mereka minati dengan lebih mudah.",
      en: "Features such as saved favorites can help buyers return to listings they are interested in more easily.",
    },
  },
  {
    id: "faq-31",
    category: { id: "Listing", en: "Listings" },
    question: {
      id: "Apakah video properti membantu performa listing?",
      en: "Do property videos help listing performance?",
    },
    answer: {
      id: "Ya. Video dapat membantu pengguna memahami suasana, layout, dan kualitas properti dengan lebih cepat.",
      en: "Yes. Videos can help users understand the atmosphere, layout, and quality of a property more quickly.",
    },
  },
  {
    id: "faq-32",
    category: { id: "Developer", en: "Developers" },
    question: {
      id: "Apakah developer bisa menggunakan TeTaMo?",
      en: "Can developers use TeTaMo?",
    },
    answer: {
      id: "Ya. Developer juga bisa menggunakan TeTaMo untuk menampilkan proyek dan unit mereka dengan lebih rapi.",
      en: "Yes. Developers can also use TeTaMo to present their projects and units in a cleaner way.",
    },
  },
  {
    id: "faq-33",
    category: { id: "Support", en: "Support" },
    question: {
      id: "Apakah ada halaman bantuan selain FAQ?",
      en: "Is there a help page besides the FAQ?",
    },
    answer: {
      id: "Ya. FAQ membantu pertanyaan umum, sementara halaman kontak atau support bisa menangani kebutuhan yang lebih spesifik.",
      en: "Yes. The FAQ helps with common questions, while contact or support pages can handle more specific needs.",
    },
  },
  {
    id: "faq-34",
    category: { id: "Listing", en: "Listings" },
    question: {
      id: "Apakah judul listing memengaruhi perhatian pengguna?",
      en: "Does the listing title affect user attention?",
    },
    answer: {
      id: "Ya. Judul listing yang lebih jelas dan lebih kuat dapat membantu menarik perhatian lebih cepat.",
      en: "Yes. A clearer and stronger listing title can help attract attention more quickly.",
    },
  },
  {
    id: "faq-35",
    category: { id: "Branding", en: "Branding" },
    question: {
      id: "Mengapa branding penting untuk agen di TeTaMo?",
      en: "Why is branding important for agents on TeTaMo?",
    },
    answer: {
      id: "Karena branding membantu agen terlihat lebih serius, lebih konsisten, dan lebih mudah dipercaya oleh calon buyer atau tenant.",
      en: "Because branding helps agents appear more serious, more consistent, and easier to trust for potential buyers or tenants.",
    },
  },
  {
    id: "faq-36",
    category: { id: "Listing", en: "Listings" },
    question: {
      id: "Apakah properti komersial juga bisa ditampilkan?",
      en: "Can commercial properties also be displayed?",
    },
    answer: {
      id: "Ya. Properti komersial seperti ruko, kantor, atau properti usaha juga dapat ditampilkan di platform.",
      en: "Yes. Commercial properties such as shop lots, offices, or business properties can also be displayed on the platform.",
    },
  },
  {
    id: "faq-37",
    category: { id: "Pemilik", en: "Owners" },
    question: {
      id: "Apakah pemilik dapat melihat listing mereka sendiri di dashboard?",
      en: "Can owners see their own listings in the dashboard?",
    },
    answer: {
      id: "Ya. Dashboard pemilik dapat membantu mereka memantau listing, status, dan aktivitas terkait properti mereka.",
      en: "Yes. The owner dashboard can help them monitor listings, status, and activity related to their property.",
    },
  },
  {
    id: "faq-38",
    category: { id: "Admin", en: "Admin" },
    question: {
      id: "Apakah admin bisa memperbarui FAQ di masa depan?",
      en: "Can admin update the FAQ in the future?",
    },
    answer: {
      id: "Ya. Halaman ini dirancang agar admin dapat mengedit isi FAQ dan menambahkan pertanyaan baru.",
      en: "Yes. This page is designed so admin can edit FAQ content and add new questions.",
    },
  },
  {
    id: "faq-39",
    category: { id: "Search", en: "Search" },
    question: {
      id: "Apakah search di FAQ hanya untuk halaman ini?",
      en: "Is the FAQ search only for this page?",
    },
    answer: {
      id: "Ya. Search di halaman ini hanya membantu pengguna mencari pertanyaan dan jawaban di dalam FAQ.",
      en: "Yes. The search on this page only helps users search questions and answers inside the FAQ.",
    },
  },
  {
    id: "faq-40",
    category: { id: "Viewing", en: "Viewing" },
    question: {
      id: "Apakah viewing harus selalu melalui chat dulu?",
      en: "Does viewing always need to start through chat first?",
    },
    answer: {
      id: "Tidak selalu. Sistem dapat dikembangkan agar proses viewing terasa lebih langsung namun tetap rapi.",
      en: "Not always. The system can be developed so the viewing process feels more direct while still staying organised.",
    },
  },
];

function normalizeRole(role?: string | null) {
  return (role || "").toLowerCase().replace(/\s+/g, "_");
}

function isAdminRole(role?: string | null) {
  const normalized = normalizeRole(role);
  return (
    normalized === "admin" ||
    normalized === "super_admin" ||
    normalized === "superadmin"
  );
}

export default function FAQPage() {
  const { lang } = useLanguage();
  const isID = lang === "id";

  const t = {
    heroTitle: "FAQ",
    heroSubtitle: isID
      ? "Jawaban yang lebih jelas untuk pertanyaan paling umum tentang TeTaMo."
      : "Clearer answers to the most common questions about TeTaMo.",

    replaceImage: isID ? "Ganti Gambar" : "Replace Image",
    addFaq: isID ? "+ Tambah FAQ" : "+ Add FAQ",
    editFaq: isID ? "Edit FAQ" : "Edit FAQ",
    doneEditing: isID ? "Selesai Edit" : "Done Editing",
    deleteFaq: isID ? "Hapus" : "Delete",

    searchPlaceholder: isID
      ? "Cari pertanyaan… contoh: verifikasi, biaya, viewing"
      : "Search questions… example: verification, fees, viewing",
    clear: isID ? "Hapus" : "Clear",
    faqOnlySearch: isID
      ? "Search ini hanya untuk halaman FAQ."
      : "This search is only for the FAQ page.",

    noResults: isID ? "Tidak ada hasil untuk" : "No results for",
    showing: isID ? "Menampilkan" : "Showing",
    of: isID ? "dari" : "of",

    previous: isID ? "Sebelumnya" : "Previous",
    next: isID ? "Berikutnya" : "Next",

    adminMode: isID ? "Mode edit admin aktif" : "Admin edit mode active",
    editNote: isID
      ? "Admin dapat mengedit FAQ satu per satu di bawah jawaban."
      : "Admin can edit FAQs one by one below the answer.",

    categoryPlaceholder: isID ? "Kategori" : "Category",
    questionPlaceholder: isID ? "Tulis pertanyaan" : "Write the question",
    answerPlaceholder: isID ? "Tulis jawaban" : "Write the answer",
  };

  const [heroUrl, setHeroUrl] = useState(DEFAULT_HERO);
  const [faqs, setFaqs] = useState<FAQItem[]>(INITIAL_FAQS);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadAdminStatus() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (!user) {
          setIsAdmin(false);
          return;
        }

        const directRoles = [
          normalizeRole(user.app_metadata?.role),
          normalizeRole(user.user_metadata?.role),
        ];

        if (directRoles.some((role) => isAdminRole(role))) {
          setIsAdmin(true);
          return;
        }

        const tablesToCheck = ["profiles", "users"];

        for (const tableName of tablesToCheck) {
          const { data, error } = await supabase
            .from(tableName)
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

          if (!error && data?.role && isAdminRole(data.role)) {
            if (!mounted) return;
            setIsAdmin(true);
            return;
          }
        }

        if (!mounted) return;
        setIsAdmin(false);
      } catch {
        if (!mounted) return;
        setIsAdmin(false);
      }
    }

    loadAdminStatus();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadAdminStatus();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (heroUrl.startsWith("blob:")) {
        URL.revokeObjectURL(heroUrl);
      }
    };
  }, [heroUrl]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;

    return faqs.filter((item) => {
      const category = isID ? item.category.id : item.category.en;
      const question = isID ? item.question.id : item.question.en;
      const answer = isID ? item.answer.id : item.answer.en;
      return `${category} ${question} ${answer}`.toLowerCase().includes(q);
    });
  }, [faqs, isID, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const paginatedFaqs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  function handleSearchChange(value: string) {
    setQuery(value);
    setCurrentPage(1);
    setOpenId(null);
    setEditId(null);
  }

  function toggleFaq(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
    setEditId((prev) => (prev === id ? prev : null));
  }

  function handleHeroChange(file?: File) {
    if (!file) return;

    const nextUrl = URL.createObjectURL(file);

    setHeroUrl((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return nextUrl;
    });
  }

  function updateFaqField(
    id: string,
    field: "category" | "question" | "answer",
    value: string
  ) {
    setFaqs((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        return {
          ...item,
          [field]: {
            ...item[field],
            [isID ? "id" : "en"]: value,
          },
        };
      })
    );
  }

  function addFaq() {
    const nextId = `faq-${Date.now()}`;

    const newItem: FAQItem = {
      id: nextId,
      category: {
        id: "Baru",
        en: "New",
      },
      question: {
        id: "Tulis pertanyaan baru di sini",
        en: "Write a new question here",
      },
      answer: {
        id: "Tulis jawaban baru di sini",
        en: "Write a new answer here",
      },
    };

    setFaqs((prev) => [newItem, ...prev]);
    setCurrentPage(1);
    setOpenId(nextId);
    setEditId(nextId);
    setQuery("");
  }

  function deleteFaq(id: string) {
    setFaqs((prev) => prev.filter((item) => item.id !== id));
    setOpenId((prev) => (prev === id ? null : prev));
    setEditId((prev) => (prev === id ? null : prev));
  }

  function getText(text: LangText) {
    return isID ? text.id : text.en;
  }

  const inputClass =
    "w-full rounded-2xl border border-gray-200 bg-white px-3.5 py-2.5 text-[13px] text-[#1C1C1E] outline-none focus:border-gray-400 sm:px-4 sm:py-3 sm:text-sm";

  return (
    <main className="min-h-screen bg-[#fafafa] text-[#1C1C1E]">
      <section className="relative h-[220px] overflow-hidden sm:h-[260px] lg:h-[320px]">
        <img
          src={heroUrl}
          alt="FAQ Hero"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/45" />

        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto w-full max-w-5xl px-3 pb-5 sm:px-5 sm:pb-7 lg:px-8 lg:pb-8">
            <div className="max-w-3xl text-white">
              <h1 className="text-[1.9rem] font-semibold tracking-tight sm:text-[2.4rem] lg:text-[3rem]">
                {t.heroTitle}
              </h1>

              <p className="mt-2 max-w-2xl text-[13px] leading-6 text-white/90 sm:mt-3 sm:text-[14px] sm:leading-7 lg:text-[15px]">
                {t.heroSubtitle}
              </p>

              {isAdmin && (
                <div className="mt-4 flex flex-wrap items-center gap-2.5 sm:mt-5 sm:gap-3">
                  <label className="inline-flex cursor-pointer items-center rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[13px] font-semibold text-white backdrop-blur transition hover:bg-white/15 sm:px-5 sm:py-2.5 sm:text-sm">
                    {t.replaceImage}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleHeroChange(e.target.files?.[0])}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={addFaq}
                    className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[13px] font-semibold text-white backdrop-blur transition hover:bg-white/15 sm:px-5 sm:py-2.5 sm:text-sm"
                  >
                    {t.addFaq}
                  </button>

                  <span className="text-[11px] text-white/80 sm:text-xs">
                    {t.adminMode}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-5xl px-3 py-5 sm:px-5 sm:py-7 lg:px-8 lg:py-8">
        <div className="rounded-[20px] border border-gray-200 bg-white px-4 py-3.5 shadow-sm sm:rounded-[24px] sm:px-5 sm:py-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500" aria-hidden>
              🔍
            </span>

            <input
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full bg-transparent text-[13px] text-[#1C1C1E] outline-none placeholder:text-gray-400 sm:text-sm"
            />

            {query.trim().length > 0 && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="rounded-2xl px-2.5 py-1.5 text-[12px] font-semibold text-gray-600 transition hover:bg-gray-50 hover:text-[#1C1C1E] sm:px-3 sm:py-2 sm:text-sm"
              >
                {t.clear}
              </button>
            )}
          </div>
        </div>

        <p className="mt-3 text-[12px] text-gray-500 sm:text-sm">
          {t.faqOnlySearch}
        </p>

        {isAdmin && (
          <p className="mt-1.5 text-[12px] text-gray-500 sm:mt-2 sm:text-sm">
            {t.editNote}
          </p>
        )}

        <div className="mt-6 space-y-3 sm:mt-8 sm:space-y-4">
          {filtered.length === 0 ? (
            <div className="rounded-[20px] border border-gray-200 bg-gray-50 px-5 py-8 text-center text-[14px] text-gray-600 sm:rounded-[24px] sm:px-8 sm:py-10 sm:text-base">
              {t.noResults} <b>“{query}”</b>.
            </div>
          ) : (
            paginatedFaqs.map((item) => {
              const isOpen = openId === item.id;
              const isEditing = editId === item.id;

              return (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-[20px] border border-gray-200 bg-white shadow-sm sm:rounded-[24px]"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(item.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-gray-50 sm:px-5 sm:py-4.5 lg:px-6"
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 sm:text-[12px]">
                        {getText(item.category)}
                      </div>

                      <div className="mt-1 text-[14px] font-semibold leading-6 text-[#1C1C1E] sm:text-[15px] lg:text-[17px]">
                        {getText(item.question)}
                      </div>
                    </div>

                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-[#1C1C1E] sm:h-10 sm:w-10">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className={`transition-transform duration-200 ${
                          isOpen ? "rotate-180" : "rotate-0"
                        }`}
                      >
                        <path
                          d="M6 9l6 6 6-6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5 lg:px-6">
                      <div className="rounded-[18px] bg-gray-50 px-4 py-4 text-[13px] leading-6 text-gray-700 sm:rounded-[22px] sm:px-5 sm:py-5 sm:text-sm sm:leading-7">
                        {getText(item.answer)}
                      </div>

                      {isAdmin && (
                        <div className="mt-4">
                          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                setEditId((prev) =>
                                  prev === item.id ? null : item.id
                                )
                              }
                              className="rounded-full border border-gray-200 px-4 py-2 text-[13px] font-semibold text-[#1C1C1E] transition hover:bg-gray-50 sm:text-sm"
                            >
                              {isEditing ? t.doneEditing : t.editFaq}
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteFaq(item.id)}
                              className="rounded-full border border-red-200 px-4 py-2 text-[13px] font-semibold text-red-600 transition hover:bg-red-50 sm:text-sm"
                            >
                              {t.deleteFaq}
                            </button>
                          </div>

                          {isEditing && (
                            <div className="mt-4 space-y-4 rounded-[18px] border border-gray-200 bg-white p-4 sm:rounded-[22px] sm:p-5">
                              <input
                                value={getText(item.category)}
                                onChange={(e) =>
                                  updateFaqField(
                                    item.id,
                                    "category",
                                    e.target.value
                                  )
                                }
                                placeholder={t.categoryPlaceholder}
                                className={inputClass}
                              />

                              <textarea
                                value={getText(item.question)}
                                onChange={(e) =>
                                  updateFaqField(
                                    item.id,
                                    "question",
                                    e.target.value
                                  )
                                }
                                placeholder={t.questionPlaceholder}
                                className="min-h-[90px] w-full resize-y rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[13px] font-semibold text-[#1C1C1E] outline-none focus:border-gray-400 sm:text-sm"
                              />

                              <textarea
                                value={getText(item.answer)}
                                onChange={(e) =>
                                  updateFaqField(
                                    item.id,
                                    "answer",
                                    e.target.value
                                  )
                                }
                                placeholder={t.answerPlaceholder}
                                className="min-h-[150px] w-full resize-y rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-[13px] leading-6 text-gray-700 outline-none focus:border-gray-400 sm:text-sm sm:leading-7"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {filtered.length > 0 && (
          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <p className="text-[12px] text-gray-500 sm:text-sm">
              {t.showing} {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} {t.of}{" "}
              {filtered.length}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-xl border border-gray-200 px-3 py-2 text-[12px] font-semibold transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:text-sm"
              >
                {t.previous}
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`min-w-[38px] rounded-xl border px-3 py-2 text-[12px] font-semibold transition sm:min-w-[42px] sm:px-4 sm:text-sm ${
                      currentPage === pageNumber
                        ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {pageNumber}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="rounded-xl border border-gray-200 px-3 py-2 text-[12px] font-semibold transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:text-sm"
              >
                {t.next}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}