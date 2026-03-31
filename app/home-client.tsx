"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/app/context/LanguageContext";

/* ===========================
   TYPES (CMS-ready)
=========================== */

type FeaturedProperty = {
  id: string;
  images: string[];
  price: string;
  province: string;
  size: string;
  bed: string;
  furnishing: string;
  garage: string;
  agentName: string;
  whatsapp: string;
  kode?: string;
  postedDate?: string;
  ownerApproved: boolean;
  agentVerified: boolean;
};

type FeaturedAgent = {
  id: string;
  name: string;
  photo: string;
  location: string;
  agency: string;
  experience: string;
  whatsapp: string;
  branding?: string;
  agentVerified: boolean;
  socials?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    linkedin?: string;
  };
};

type FeaturedOwnerProperty = {
  id: string;
  ownerName: string;
  ownerWhatsapp: string;
  images: string[];
  price: string;
  province: string;
  size: string;
  bed: string;
  furnishing: string;
  garage: string;
  kode?: string;
  postedDate?: string;
  ownerApproved: boolean;
};

function translateBed(value: string, lang: string) {
  const count = value.match(/\d+/)?.[0] || value;
  return lang === "id" ? `${count} KT` : `${count} Bed`;
}

function translateGarage(value: string, lang: string) {
  const count = value.match(/\d+/)?.[0] || value;
  return lang === "id" ? `${count} Garasi` : `${count} Garage`;
}

function translateFurnishing(value: string, lang: string) {
  const normalized = value.trim().toLowerCase();

  if (
    normalized.includes("full furnish") ||
    normalized.includes("fully furnished") ||
    normalized.includes("full furnished")
  ) {
    return lang === "id" ? "Furnished" : "Fully Furnished";
  }

  if (
    normalized.includes("semi furnish") ||
    normalized.includes("semi furnished")
  ) {
    return lang === "id" ? "Semi Furnished" : "Semi Furnished";
  }

  if (
    normalized.includes("unfurnished") ||
    normalized.includes("tanpa furnitur")
  ) {
    return lang === "id" ? "Tanpa Furnitur" : "Unfurnished";
  }

  return value;
}

function InfoCard({
  title,
  description,
  className = "",
}: {
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-gray-200 bg-white p-4 text-left shadow-sm sm:p-5 ${className}`}
    >
      <h3 className="mb-2 text-base font-semibold text-[#1C1C1E] sm:text-lg">
        {title}
      </h3>
      <p className="text-sm leading-6 text-gray-600 sm:leading-7">
        {description}
      </p>
    </div>
  );
}

function FeaturedOwnerPropertyCard({
  property,
}: {
  property: FeaturedOwnerProperty;
}) {
  const [imgIndex, setImgIndex] = useState(0);
  const { lang } = useLanguage();

  const next = () =>
    setImgIndex((prev) =>
      prev === property.images.length - 1 ? 0 : prev + 1
    );

  const prev = () =>
    setImgIndex((prev) =>
      prev === 0 ? property.images.length - 1 : prev - 1
    );

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
      <div className="relative">
        <div className="absolute left-3 top-3 z-10">
          {property.ownerApproved ? (
            <div className="rounded-full bg-[#1C1C1E] px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">
              {lang === "id" ? "Pemilik Terverifikasi" : "Verified Owner"}
            </div>
          ) : (
            <div className="rounded-full bg-gray-200 px-3 py-1 text-[11px] font-semibold text-gray-800 sm:text-xs">
              {lang === "id" ? "Pending Verifikasi" : "Pending Verification"}
            </div>
          )}
        </div>

        <img
          src={property.images[imgIndex]}
          alt="Property"
          className="h-[320px] w-full object-cover sm:h-[360px] lg:h-[420px]"
        />

        <div className="absolute right-3 top-3 rounded-full bg-[#1C1C1E]/80 px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">
          TETAMO
        </div>

        <button
          onClick={prev}
          type="button"
          className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#1C1C1E]/70 text-lg text-white transition hover:bg-[#1C1C1E]"
          aria-label="Previous image"
        >
          ‹
        </button>

        <button
          onClick={next}
          type="button"
          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#1C1C1E]/70 text-lg text-white transition hover:bg-[#1C1C1E]"
          aria-label="Next image"
        >
          ›
        </button>
      </div>

      <div className="p-4 sm:p-5">
        <h3 className="text-lg font-bold text-[#1C1C1E] sm:text-xl">
          {property.price}
        </h3>

        <p className="mt-1 text-sm text-gray-600">{property.province}</p>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          {property.size} • {translateBed(property.bed, lang)} •{" "}
          {translateFurnishing(property.furnishing, lang)} •{" "}
          {translateGarage(property.garage, lang)}
        </p>

        <div className="mt-3">
          <p className="text-sm text-gray-600">
            {lang === "id" ? "Pemilik:" : "Owner:"}{" "}
            <span className="font-semibold text-[#1C1C1E]">
              {property.ownerName}
            </span>
          </p>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            {property.kode && (
              <span>
                {lang === "id" ? "Kode:" : "Code:"}{" "}
                <span className="font-medium text-gray-700">
                  {property.kode}
                </span>
              </span>
            )}

            {property.postedDate && (
              <span>
                {lang === "id" ? "Tayang:" : "Posted:"}{" "}
                <span className="font-medium text-gray-700">
                  {property.postedDate}
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <a
            href={`https://wa.me/${property.ownerWhatsapp}`}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-[48px] items-center justify-center rounded-2xl bg-[#1C1C1E] px-3 py-3 text-center text-[13px] font-semibold text-white transition hover:opacity-90 sm:text-sm"
          >
            {lang === "id" ? "WhatsApp Pemilik" : "WhatsApp Owner"}
          </a>

          <button
            type="button"
            className="flex min-h-[48px] items-center justify-center rounded-2xl bg-yellow-600 px-3 py-3 text-center text-[13px] font-bold text-white transition hover:bg-yellow-700 sm:text-sm"
          >
            {lang === "id" ? "Lihat Detail" : "View Detail"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FeaturedOwnersSection() {
  const { lang } = useLanguage();

  const owners: FeaturedOwnerProperty[] = [
    {
      id: "p1",
      ownerName: "Bapak Hendra",
      ownerWhatsapp: "6281234567890",
      images: [
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80",
      ],
      price: "Rp 2.200.000.000",
      province: "DKI Jakarta",
      size: "190 m²",
      bed: "3 Bed",
      furnishing: "Full Furnish",
      garage: "2 Garasi",
      kode: "TMO-0001",
      postedDate: "12 Feb 2026",
      ownerApproved: true,
    },
    {
      id: "p2",
      ownerName: "Ibu Sari",
      ownerWhatsapp: "6281234567890",
      images: [
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1572120360610-d971b9d7767c?auto=format&fit=crop&w=1600&q=80",
      ],
      price: "Rp 1.650.000.000",
      province: "Jawa Barat",
      size: "170 m²",
      bed: "4 Bed",
      furnishing: "Semi Furnish",
      garage: "1 Garasi",
      kode: "TMO-0001",
      postedDate: "12 Feb 2026",
      ownerApproved: true,
    },
    {
      id: "p3",
      ownerName: "Pak Wayan",
      ownerWhatsapp: "6281234567890",
      images: [
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1600&q=80",
      ],
      price: "Rp 3.100.000.000",
      province: "Bali",
      size: "240 m²",
      bed: "5 Bed",
      furnishing: "Unfurnished",
      garage: "2 Garasi",
      kode: "TMO-0001",
      postedDate: "12 Feb 2026",
      ownerApproved: true,
    },
  ];

  return (
    <section className="bg-gray-100 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-4 text-center text-2xl font-bold text-[#1C1C1E] sm:text-3xl">
          {lang === "id"
            ? "Properti Pemilik Unggulan"
            : "Featured Owner Properties"}
        </h2>

        <p className="mx-auto mb-10 max-w-2xl px-2 text-center text-sm leading-7 text-gray-600 sm:mb-12 sm:text-base">
          {lang === "id"
            ? "Properti langsung dari pemilik. Transparan, jelas, dan terverifikasi."
            : "Verified properties directly from owners."}
        </p>

        <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 xl:grid-cols-3 xl:gap-10">
          {owners.map((p) => (
            <FeaturedOwnerPropertyCard key={p.id} property={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ===========================
   ICONS
=========================== */

function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#1C1C1E]" fill="none">
      <path
        d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M12 16a4 4 0 100-8 4 4 0 000 8Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M17.5 6.5h.01"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#1C1C1E]" fill="none">
      <path
        d="M14 8h2V5h-2c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.4l.6-3H13V9c0-.6.4-1 1-1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconLinkedIn() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#1C1C1E]" fill="none">
      <path d="M6.5 9.5H4V20h2.5V9.5Z" fill="currentColor" />
      <path
        d="M5.25 8.2a1.45 1.45 0 110-2.9 1.45 1.45 0 010 2.9Z"
        fill="currentColor"
      />
      <path
        d="M20 14.1V20h-2.5v-5.4c0-1.3-.5-2.2-1.7-2.2-1 0-1.6.7-1.9 1.3-.1.3-.1.7-.1 1.1V20H11.3V9.5h2.4v1.4c.3-.6 1.2-1.5 2.8-1.5 1.9 0 3.5 1.2 3.5 3.7Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconTikTok() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#1C1C1E]" fill="none">
      <path
        d="M12.75 2h2.25a4.5 4.5 0 004.5 4.5v2.25a6.75 6.75 0 01-4.5-1.6v6.35a5.25 5.25 0 11-5.25-5.25c.27 0 .54.02.8.07v2.3a3 3 0 102.2 2.88V2z"
        fill="currentColor"
      />
    </svg>
  );
}

function SocialBtn({
  href,
  label,
  children,
}: {
  href?: string;
  label: string;
  children: ReactNode;
}) {
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white transition hover:bg-gray-50"
    >
      {children}
    </a>
  );
}

/* ===========================
   FEATURED PROPERTY CARD
=========================== */

function FeaturedPropertyCard({ property }: { property: FeaturedProperty }) {
  const [imgIndex, setImgIndex] = useState(0);
  const { lang } = useLanguage();

  const next = () =>
    setImgIndex((prev) =>
      prev === property.images.length - 1 ? 0 : prev + 1
    );

  const prev = () =>
    setImgIndex((prev) =>
      prev === 0 ? property.images.length - 1 : prev - 1
    );

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
      <div className="relative">
        <div className="absolute left-3 top-3 z-10">
          {property.agentVerified ? (
            <div className="rounded-full bg-[#1C1C1E] px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">
              {lang === "id" ? "Agen Terverifikasi" : "Verified Agent"}
            </div>
          ) : (
            <div className="rounded-full bg-gray-200 px-3 py-1 text-[11px] font-semibold text-gray-800 sm:text-xs">
              {lang === "id" ? "Agen Pending" : "Pending Agent"}
            </div>
          )}
        </div>

        <img
          src={property.images[imgIndex]}
          alt="Property"
          className="h-[320px] w-full object-cover sm:h-[360px] lg:h-[420px]"
        />

        <div className="absolute right-3 top-3 rounded-full bg-[#1C1C1E]/80 px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">
          TETAMO
        </div>

        <button
          onClick={prev}
          type="button"
          className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#1C1C1E]/70 text-lg text-white transition hover:bg-[#1C1C1E]"
          aria-label="Previous image"
        >
          ‹
        </button>

        <button
          onClick={next}
          type="button"
          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#1C1C1E]/70 text-lg text-white transition hover:bg-[#1C1C1E]"
          aria-label="Next image"
        >
          ›
        </button>
      </div>

      <div className="p-4 sm:p-5">
        <h3 className="text-lg font-bold text-[#1C1C1E] sm:text-xl">
          {property.price}
        </h3>

        <p className="mt-1 text-sm text-gray-600">{property.province}</p>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          {property.size} • {translateBed(property.bed, lang)} •{" "}
          {translateFurnishing(property.furnishing, lang)} •{" "}
          {translateGarage(property.garage, lang)}
        </p>

        <div className="mt-3">
          <p className="text-sm text-gray-600">
            {lang === "id" ? "Agen:" : "Agent:"}{" "}
            <span className="font-semibold text-gray-800">
              {property.agentName}
            </span>
          </p>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            {property.kode && (
              <span>
                {lang === "id" ? "Kode:" : "Code:"}{" "}
                <span className="font-medium text-gray-700">
                  {property.kode}
                </span>
              </span>
            )}

            {property.postedDate && (
              <span>
                {lang === "id" ? "Tayang:" : "Posted:"}{" "}
                <span className="font-medium text-gray-700">
                  {property.postedDate}
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <a
            href={`https://wa.me/${property.whatsapp}?text=${encodeURIComponent(
              lang === "id"
                ? `Halo, saya melihat properti ini di TETAMO dan tertarik.

Properti: ${property.id}
Kode: ${property.kode}
Lokasi: ${property.province}
Harga: ${property.price}

Apakah properti ini masih tersedia?`
                : `Hello, I saw this property on TETAMO and I'm interested.

Property: ${property.id}
Code: ${property.kode}
Location: ${property.province}
Price: ${property.price}

Is this property still available?`
            )}`}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-[48px] items-center justify-center rounded-2xl bg-[#1C1C1E] px-3 py-3 text-center text-[13px] font-semibold text-white transition hover:opacity-90 sm:text-sm"
          >
            WhatsApp
          </a>

          <Link
            href={`/properti/${property.id}`}
            className="flex min-h-[48px] items-center justify-center rounded-2xl bg-yellow-600 px-3 py-3 text-center text-[13px] font-bold text-white transition hover:bg-yellow-700 sm:text-sm"
          >
            {lang === "id" ? "Lihat Detail" : "View Detail"}
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ===========================
   SECTIONS
=========================== */

function FeaturedPropertiesSection() {
  const { lang } = useLanguage();

  const featured: FeaturedProperty[] = [
    {
      id: "p1",
      images: [
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80",
      ],
      price: "Rp 2.500.000.000",
      province: "DKI Jakarta",
      size: "200 m²",
      bed: "3 Bed",
      furnishing: "Full Furnish",
      garage: "2 Garasi",
      agentName: "Gunawan",
      whatsapp: "6281234567890",
      kode: "TMO-0001",
      postedDate: "12 Feb 2026",
      ownerApproved: true,
      agentVerified: true,
    },
    {
      id: "p2",
      images: [
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1572120360610-d971b9d7767c?auto=format&fit=crop&w=1600&q=80",
      ],
      price: "Rp 1.850.000.000",
      province: "Jawa Barat",
      size: "180 m²",
      bed: "4 Bed",
      furnishing: "Semi Furnish",
      garage: "1 Garasi",
      agentName: "Maria",
      whatsapp: "6281234567890",
      kode: "TMO-0001",
      postedDate: "12 Feb 2026",
      ownerApproved: true,
      agentVerified: true,
    },
    {
      id: "p3",
      images: [
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1600&q=80",
      ],
      price: "Rp 3.400.000.000",
      province: "Banten",
      size: "250 m²",
      bed: "5 Bed",
      furnishing: "Unfurnished",
      garage: "2 Garasi",
      agentName: "Andi",
      whatsapp: "6281234567890",
      kode: "TMO-0001",
      postedDate: "12 Feb 2026",
      ownerApproved: true,
      agentVerified: true,
    },
  ];

  return (
    <section className="bg-gray-100 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-10 text-center text-2xl font-bold text-[#1C1C1E] sm:mb-12 sm:text-3xl">
          {lang === "id" ? "Properti Unggulan" : "Featured Properties"}
        </h2>

        <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 xl:grid-cols-3 xl:gap-10">
          {featured.map((p) => (
            <FeaturedPropertyCard key={p.id} property={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedAgentsSection() {
  const { lang } = useLanguage();

  const defaultAgents: FeaturedAgent[] = [
    {
      id: "p1",
      name: "Gunawan",
      photo: "https://randomuser.me/api/portraits/men/32.jpg",
      location: "Jakarta",
      agency: "Century 21",
      branding: "Century 21 Jakarta",
      experience: "8 tahun pengalaman",
      whatsapp: "6281234567890",
      agentVerified: true,
      socials: {
        instagram: "https://instagram.com",
        facebook: "https://facebook.com",
        tiktok: "https://tiktok.com",
        linkedin: "https://linkedin.com",
      },
    },
    {
      id: "p2",
      name: "Maria",
      photo: "https://randomuser.me/api/portraits/women/44.jpg",
      location: "BSD",
      agency: "Ray White",
      branding: "Ray White BSD",
      experience: "5 tahun pengalaman",
      whatsapp: "6281234567890",
      agentVerified: true,
      socials: {
        instagram: "https://instagram.com",
        tiktok: "https://tiktok.com",
      },
    },
    {
      id: "p3",
      name: "Andi",
      photo: "https://randomuser.me/api/portraits/men/76.jpg",
      location: "Surabaya",
      agency: "Independent",
      branding: "Independent Agent",
      experience: "10 tahun pengalaman",
      whatsapp: "6281234567890",
      agentVerified: true,
      socials: {
        instagram: "https://instagram.com",
        facebook: "https://facebook.com",
      },
    },
  ];

  const [agents, setAgents] = useState<FeaturedAgent[]>(defaultAgents);

  useEffect(() => {
    const saved = localStorage.getItem("tetamo_agent_profile");
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);

      const loggedInAgent: FeaturedAgent = {
        id: "logged-agent",
        name: parsed?.name || "Agent Tetamo",
        photo:
          parsed?.photo || "https://randomuser.me/api/portraits/men/32.jpg",
        location: parsed?.address || "Indonesia",
        agency: parsed?.agency || "Tetamo Agent Network",
        branding: parsed?.agency || "Tetamo Agent Network",
        experience: "Agent Tetamo",
        whatsapp: parsed?.number || "",
        agentVerified: true,
        socials: {
          instagram: parsed?.instagram || "",
          facebook: parsed?.facebook || "",
          tiktok: parsed?.tiktok || "",
          linkedin: parsed?.linkedin || "",
        },
      };

      setAgents([loggedInAgent, ...defaultAgents.slice(1)]);
    } catch {
      // ignore invalid localStorage
    }
  }, []);

  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-4 text-center text-2xl font-bold text-[#1C1C1E] sm:text-3xl">
          {lang === "id" ? "Agen Unggulan TeTamo" : "TeTamo Featured Agents"}
        </h2>

        <p className="mx-auto mb-10 max-w-2xl px-2 text-center text-sm leading-7 text-gray-600 sm:mb-12 sm:text-base">
          {lang === "id"
            ? "Profil agen modern yang terhubung dengan media sosial, memudahkan pembeli serius menemukan dan menghubungi Anda secara langsung."
            : "Modern agent profiles connected to social media, making it easy for serious buyers to find and contact you directly."}
        </p>

        <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 xl:grid-cols-3 xl:gap-10">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="relative rounded-3xl border border-gray-200 bg-gray-100 p-5 shadow-sm sm:p-6"
            >
              {agent.agentVerified && (
                <div className="absolute left-3 top-3 rounded-full bg-[#1C1C1E] px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">
                  {lang === "id" ? "Agen Terverifikasi" : "Verified Agent"}
                </div>
              )}

              <div className="mt-8 flex items-start gap-4 sm:mt-10">
                <img
                  src={agent.photo}
                  alt={agent.name}
                  className="h-20 w-20 shrink-0 rounded-2xl object-cover sm:h-24 sm:w-24"
                />

                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-[#1C1C1E] sm:text-lg">
                    {agent.name}
                  </h3>

                  <div className="mt-1 text-sm text-gray-600">
                    {agent.agency}
                  </div>

                  <div className="mt-1 text-sm text-gray-500">
                    {agent.location}
                  </div>

                  <p className="mt-2 text-sm text-gray-500">
                    {agent.experience}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <SocialBtn href={agent.socials?.instagram} label="Instagram">
                  <IconInstagram />
                </SocialBtn>
                <SocialBtn href={agent.socials?.facebook} label="Facebook">
                  <IconFacebook />
                </SocialBtn>
                <SocialBtn href={agent.socials?.tiktok} label="TikTok">
                  <IconTikTok />
                </SocialBtn>
                <SocialBtn href={agent.socials?.linkedin} label="LinkedIn">
                  <IconLinkedIn />
                </SocialBtn>
              </div>

              <a
                href={`https://wa.me/${agent.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-block w-full rounded-2xl bg-[#1C1C1E] px-4 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
              >
                WhatsApp
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ===========================
   HOME PAGE
=========================== */

export default function HomeClient() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [q, setQ] = useState("");

  const goSearch = () => {
    const query = q.trim();
    if (!query) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-gray-900">
      <section className="bg-[#F7F7F8] px-4 pb-10 pt-8 text-center sm:px-6 sm:pb-12 sm:pt-10 md:pt-14 lg:px-8 lg:pb-20 lg:pt-20">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-[#1C1C1E] sm:text-[36px] md:text-5xl lg:text-[52px]">
            {lang === "id"
              ? "Pasang Iklan dan Temukan Properti Anda di TeTaMo"
              : "Advertise and Find Your Property at TeTaMo"}
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-[15px] leading-7 text-[#5F6B7A] sm:mt-5 sm:text-base md:text-lg md:leading-8">
            {lang === "id"
              ? "Platform properti all-in-one di Indonesia — transparan, profesional, dan fokus pada pembeli serius."
              : "Indonesia's all-in-one real estate hub — transparent, professional, and focused on serious buyers."}
          </p>

          <div className="mx-auto mt-7 w-full max-w-3xl rounded-[22px] border border-gray-200 bg-white p-2 shadow-sm sm:mt-8">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") goSearch();
                  }}
                  placeholder={
                    lang === "id"
                      ? "Cari lokasi, harga, agen, properti..."
                      : "Search location, price, agent, property..."
                  }
                  className="h-11 w-full rounded-[16px] border border-transparent px-4 text-[15px] text-[#1C1C1E] placeholder:text-gray-500 focus:border-gray-200 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={goSearch}
                className="h-11 w-[92px] shrink-0 rounded-[16px] bg-[#1C1C1E] px-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                {lang === "id" ? "Cari" : "Search"}
              </button>
            </div>
          </div>

          <div className="mx-auto mt-7 grid max-w-4xl grid-cols-3 gap-2 sm:mt-8 sm:gap-3">
            <Link
              href="/properti"
              className="inline-flex min-h-[58px] items-center justify-center rounded-2xl bg-[#1C1C1E] px-2 py-2 text-center text-[12px] font-semibold leading-[1.2] text-white transition hover:opacity-90 sm:min-h-[60px] sm:px-4 sm:text-sm md:text-base"
            >
              {lang === "id" ? "Lihat Properti" : "View Properties"}
            </Link>

            <Link
              href="/pemilik"
              className="inline-flex min-h-[58px] items-center justify-center rounded-2xl border border-[#1C1C1E] px-2 py-2 text-center text-[12px] font-semibold leading-[1.2] text-[#1C1C1E] transition hover:bg-[#1C1C1E] hover:text-white sm:min-h-[60px] sm:px-4 sm:text-sm md:text-base"
            >
              {lang === "id"
                ? "Iklankan Sebagai Pemilik"
                : "Advertise as Owner"}
            </Link>

            <Link
              href="/pemilik"
              className="inline-flex min-h-[58px] items-center justify-center rounded-2xl bg-[#E5E7EB] px-2 py-2 text-center text-[12px] font-semibold leading-[1.2] text-[#1C1C1E] transition hover:bg-[#D1D5DB] sm:min-h-[60px] sm:px-4 sm:text-sm md:text-base"
            >
              {lang === "id" ? "Daftar Sebagai Agen" : "Register as Agent"}
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          <InfoCard
            title={
              lang === "id" ? "Properti Terverifikasi" : "Verified Properties"
            }
            description={
              lang === "id"
                ? "Properti asli dari agen dan pemilik. Mengurangi duplikasi dan spam."
                : "Properties directly from verified agents and owners. Fewer duplicates, less spam."
            }
          />

          <InfoCard
            title={lang === "id" ? "Jadwal Viewing" : "Schedule a Viewing"}
            description={
              lang === "id"
                ? "Pembeli dan penyewa bisa menjadwalkan viewing langsung lewat Tetamo."
                : "Buyers and renters can directly schedule a viewing through Tetamo."
            }
          />

          <InfoCard
            title={
              lang === "id"
                ? "Agen Media Sosial dan Branding"
                : "Agent Social Media and Branding"
            }
            description={
              lang === "id"
                ? "Profil agen terhubung ke media sosial, lebih banyak eksposur, lebih besar peluang closing."
                : "Agent profiles connect directly to social media for higher exposure and better closing opportunities."
            }
          />
        </div>
      </section>

      <FeaturedPropertiesSection />
      <FeaturedAgentsSection />
      <FeaturedOwnersSection />

      <section className="mt-12 px-4 pb-16 sm:px-6 lg:mt-16 lg:px-8 lg:pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-gray-200 bg-white px-5 py-8 shadow-sm sm:px-8 sm:py-10 lg:px-10 lg:py-12">
            <div className="flex justify-start md:justify-end">
              <div className="w-full max-w-4xl text-left md:text-right">
                <h4 className="mb-5 text-xs font-semibold tracking-[0.2em] text-gray-500">
                  {lang === "id" ? "INFORMASI" : "INFORMATION"}
                </h4>

                <div className="flex flex-col gap-3 text-sm font-medium text-gray-700 sm:flex-row sm:flex-wrap md:justify-end md:gap-x-8 md:gap-y-3">
                  <Link
                    href="/about-us"
                    className="transition hover:text-black"
                  >
                    {lang === "id" ? "Tentang Kami" : "About Us"}
                  </Link>

                  <Link
                    href="/faq"
                    className="transition hover:text-black"
                  >
                    FAQ
                  </Link>

                  <Link
                    href="/kebijakan-berlangganan"
                    className="transition hover:text-black"
                  >
                    {lang === "id"
                      ? "Kebijakan Berlangganan"
                      : "Subscription Policy"}
                  </Link>

                  <Link
                    href="/terms"
                    className="transition hover:text-black"
                  >
                    {lang === "id"
                      ? "Syarat & Ketentuan"
                      : "Terms and Conditions"}
                  </Link>

                  <Link
                    href="/kebijakan-privasi"
                    className="transition hover:text-black"
                  >
                    {lang === "id" ? "Kebijakan Privasi" : "Privacy Policy"}
                  </Link>
                </div>

                <div className="mt-6 border-t border-gray-200 pt-4">
                  <p className="text-xs leading-6 text-gray-500 sm:text-sm">
                    {lang === "id"
                      ? "Hubungi Kami: +61 416 957 890 / +62 823 1355 6606 / +62 822 6477 8799 / inquiry@tetamo.com"
                      : "Contact us: +61 416 957 890 / +62 823 1355 6606 / +62 822 6477 8799 / inquiry@tetamo.com"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}