"use client";

const VIDEO_GUIDES = [
  {
    id: "video-1",
    title: "Cara Memasang Listing di TETAMO",
    desc: "Panduan langkah demi langkah memasang properti Anda.",
    duration: "3:15",
    href: "#",
    thumbnail: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "video-2",
    title: "Cara Menggunakan Dashboard Agen",
    desc: "Pelajari cara mengelola listing dan leads.",
    duration: "4:20",
    href: "#",
    thumbnail: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "video-3",
    title: "Cara Mengatur Jadwal Viewing",
    desc: "Atur jadwal viewing dengan pembeli secara efisien.",
    duration: "2:48",
    href: "#",
    thumbnail: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
  },
];

const ARTICLE_CATEGORIES = [
  {
    id: "agen",
    title: "Panduan Agen",
    desc: "Tips menjadi agen properti yang sukses.",
    href: "#",
  },
  {
    id: "pemilik",
    title: "Panduan Pemilik",
    desc: "Cara menjual atau menyewakan properti dengan lebih cepat.",
    href: "#",
  },
  {
    id: "pembeli",
    title: "Panduan Pembeli",
    desc: "Informasi penting sebelum membeli properti.",
    href: "#",
  },
  {
    id: "pendanaan",
    title: "Pendanaan Properti",
    desc: "Informasi KPR, refinancing, dan pembiayaan properti.",
    href: "#",
  },
  {
    id: "legal",
    title: "Legal & Sertifikat",
    desc: "Penjelasan SHM, HGB, PPJB dan legalitas properti.",
    href: "#",
  },
  {
    id: "investasi",
    title: "Investasi Properti",
    desc: "Strategi investasi dan tren pasar properti.",
    href: "#",
  },
];
const FEATURED_GUIDES = [
  {
    id: "guide-1",
    title: "Cara Menjual Rumah Lebih Cepat",
    desc: "Strategi praktis agar properti Anda cepat menarik pembeli serius.",
  },
  {
    id: "guide-2",
    title: "Kesalahan Umum Saat Membeli Properti",
    desc: "Hal-hal penting yang sering dilewatkan pembeli pertama.",
  },
  {
    id: "guide-3",
    title: "Cara Mengajukan KPR dengan Peluang Disetujui Lebih Tinggi",
    desc: "Tips meningkatkan peluang approval KPR dari bank.",
  },
  {
    id: "guide-4",
    title: "Cara Menentukan Harga Properti",
    desc: "Panduan menentukan harga yang realistis dan menarik pembeli.",
  },
];

export default function EdukasiPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-14">

        {/* HERO */}
        <section className="text-center">
          <h1 className="text-4xl font-bold text-[#1C1C1E]">
            Edukasi Properti TETAMO
          </h1>

          <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
            Panduan, strategi, dan pengetahuan untuk pemilik properti, agen, 
            dan pembeli agar dapat mengambil keputusan yang lebih baik di pasar properti.
          </p>
        </section>

        <div className="h-16" />

        {/* VIDEO GUIDES */}
       <section>
  <h2 className="text-2xl font-semibold text-[#1C1C1E]">
    Video Panduan
  </h2>

  <div className="mt-6 grid md:grid-cols-3 gap-6">
    {VIDEO_GUIDES.map((video) => (
      <div
        key={video.id}
        className="border border-gray-200 rounded-2xl p-5 bg-white shadow-sm"
      >
        <div className="relative overflow-hidden rounded-xl">
          <img
            src={video.thumbnail}
            alt={video.title}
            className="h-40 w-full object-cover"
          />

          <div className="absolute bottom-3 right-3 rounded-full bg-black/75 px-3 py-1 text-xs font-semibold text-white">
            {video.duration}
          </div>
        </div>

        <h3 className="mt-4 font-semibold text-[#1C1C1E]">
          {video.title}
        </h3>

        <p className="text-sm text-gray-500 mt-1">
          {video.desc}
        </p>

        <a
  href="/edukasi/video"
          className="mt-4 inline-flex rounded-xl bg-[#1C1C1E] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition"
        >
          Tonton Video
        </a>
      </div>
    ))}
  </div>
</section>

        <div className="h-20" />

        {/* ARTICLE CATEGORIES */}
        <section>
          <h2 className="text-2xl font-semibold text-[#1C1C1E]">
            Artikel & Panduan
          </h2>

          <div className="mt-6 grid md:grid-cols-3 gap-6">
          {ARTICLE_CATEGORIES.map((item) => (
  <a
    key={item.id}
    href="/edukasi/artikel"
    className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm hover:border-gray-300 transition block"
  >
    <h3 className="font-semibold text-[#1C1C1E]">{item.title}</h3>

    <p className="text-sm text-gray-500 mt-2">
      {item.desc}
    </p>

    <span className="inline-flex mt-4 text-sm font-semibold text-[#1C1C1E]">
      Lihat Panduan →
    </span>
  </a>
))}
          </div>
        </section>

        <div className="h-20" />

        {/* FEATURED GUIDES */}
<section>
  <h2 className="text-2xl font-semibold text-[#1C1C1E]">
    Panduan Pilihan
  </h2>

  <div className="mt-6 grid md:grid-cols-2 gap-6">
    {FEATURED_GUIDES.map((guide) => (
      <div
        key={guide.id}
        className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm"
      >
        <h3 className="font-semibold text-[#1C1C1E]">
          {guide.title}
        </h3>

        <p className="text-sm text-gray-500 mt-2">
          {guide.desc}
        </p>

        <a
  href="/edukasi/artikel"
  className="inline-flex mt-4 text-sm font-semibold text-[#1C1C1E]"
>
  Baca Panduan →
</a>
      </div>
    ))}
  </div>
</section>

<div className="h-20" />

        {/* PREMIUM CONTENT */}
        <section className="bg-gray-50 border border-gray-200 rounded-3xl p-8 text-center">
          <h2 className="text-2xl font-semibold text-[#1C1C1E]">
            Konten Premium
          </h2>

          <p className="text-gray-600 mt-3">
            Beberapa panduan eksklusif hanya tersedia untuk agen TETAMO.
          </p>

          <a
  href="/edukasi/premium"
  className="mt-6 inline-flex items-center gap-2 text-sm bg-white border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-100 transition"
>
  🔒 Strategi Mendapatkan 10 Listing per Bulan
</a>
        </section>

      </div>
    </main>
  );
}