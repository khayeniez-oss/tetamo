"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "@/app/context/LanguageContext";
import { supabase } from "@/lib/supabase";

type LocalizedCopy = {
  id: string;
  en: string;
};

type PageContent = {
  about: LocalizedCopy;
  mission: LocalizedCopy;
  vision: LocalizedCopy;
  contactIntro: LocalizedCopy;
  email: string;
  whatsapp: string;
  website: string;
};

type EditableKey = "about" | "mission" | "vision" | "contactIntro";

const DEFAULT_HERO =
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1800&q=80";

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

export default function AboutUsPage() {
  const { lang } = useLanguage();
  const isID = lang === "id";

  const t = {
    pageTitle: isID ? "Tentang Kami" : "About Us",
    pageIntro: isID
      ? "TeTaMo dibangun untuk membuat pengalaman properti terasa lebih rapi, lebih kuat, dan lebih terpercaya."
      : "TeTaMo was built to make the property experience feel more organised, more powerful, and more trustworthy.",

    aboutTitle: isID ? "Tentang Kami" : "About Us",
    missionTitle: isID ? "Misi Kami" : "Our Mission",
    visionTitle: isID ? "Visi Kami" : "Our Vision",
    contactTitle: isID ? "Hubungi Kami" : "Contact Us",

    replaceImage: isID ? "Ganti Gambar" : "Replace Image",
    adminMode: isID ? "Mode edit admin aktif" : "Admin edit mode active",
    loading: isID ? "Memuat..." : "Loading...",

    emailLabel: "Email",
    whatsappLabel: "WhatsApp",
    websiteLabel: isID ? "Website" : "Website",
  };

  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [heroUrl, setHeroUrl] = useState(DEFAULT_HERO);

  const [content, setContent] = useState<PageContent>({
    about: {
      id: "TeTaMo adalah platform properti modern yang dirancang untuk mempertemukan pembeli, penyewa, agen, pemilik, dan developer dalam satu tempat yang lebih rapi, lebih jelas, dan lebih terpercaya. Kami percaya bahwa dunia properti tidak seharusnya terasa berantakan, membingungkan, atau penuh distraksi. Karena itu, TeTaMo dibangun untuk menghadirkan pengalaman yang lebih profesional, lebih kuat secara tampilan, dan lebih siap menghubungkan orang dengan peluang yang benar-benar tepat.",
      en: "TeTaMo is a modern property platform built to bring buyers, renters, agents, owners, and developers together in one place that feels cleaner, clearer, and more trustworthy. We believe real estate should not feel messy, confusing, or full of distractions. That is why TeTaMo was created to deliver a more professional experience, stronger presentation, and a better way to connect people with the right property opportunities.",
    },
    mission: {
      id: "Misi kami adalah membantu properti tampil lebih kuat secara online, membantu agen dan pemilik membangun kepercayaan lebih cepat, dan membantu calon pembeli atau penyewa mengambil tindakan dengan lebih mudah. Kami ingin setiap listing terlihat lebih bernilai, setiap profil terasa lebih meyakinkan, dan setiap interaksi di platform mengarah pada hasil yang lebih nyata.",
      en: "Our mission is to help properties stand out more strongly online, help agents and owners build trust faster, and help buyers or renters take action more easily. We want every listing to feel more valuable, every profile to feel more convincing, and every interaction on the platform to lead to more real results.",
    },
    vision: {
      id: "Visi kami adalah menjadikan TeTaMo sebagai real estate hub modern yang tidak hanya menampilkan listing, tetapi juga membangun reputasi, memperkuat eksposur, dan menciptakan hubungan yang lebih langsung antara pasar dan properti. Kami ingin TeTaMo menjadi platform yang terasa premium, mudah dipahami, dan relevan untuk masa depan properti digital di Indonesia dan di luar itu.",
      en: "Our vision is to make TeTaMo a modern real estate hub that does more than display listings. We want it to build reputation, strengthen exposure, and create more direct connections between the market and the property itself. We want TeTaMo to become a platform that feels premium, easy to understand, and relevant to the future of digital real estate in Indonesia and beyond.",
    },
    contactIntro: {
      id: "Untuk pertanyaan, kerja sama, dukungan platform, atau kebutuhan terkait listing, hubungi kami melalui detail di bawah ini.",
      en: "For questions, partnerships, platform support, or listing-related needs, contact us through the details below.",
    },
    email: "inquiry@tetamo.com",
    whatsapp: "+62 000 0000 0000",
    website: "www.tetamo.com",
  });

  useEffect(() => {
    let mounted = true;

    async function loadAdminStatus() {
      try {
        setAuthLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (!user) {
          setIsAdmin(false);
          setAuthLoading(false);
          return;
        }

        const directRoles = [
          normalizeRole(user.app_metadata?.role),
          normalizeRole(user.user_metadata?.role),
        ];

        if (directRoles.some((role) => isAdminRole(role))) {
          setIsAdmin(true);
          setAuthLoading(false);
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
            setAuthLoading(false);
            return;
          }
        }

        if (!mounted) return;
        setIsAdmin(false);
      } catch {
        if (!mounted) return;
        setIsAdmin(false);
      } finally {
        if (!mounted) return;
        setAuthLoading(false);
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

  function updateLocalizedField(key: EditableKey, value: string) {
    setContent((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [isID ? "id" : "en"]: value,
      },
    }));
  }

  const onPickHero: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const nextUrl = URL.createObjectURL(file);

    setHeroUrl((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return nextUrl;
    });
  };

  const aboutText = isID ? content.about.id : content.about.en;
  const missionText = isID ? content.mission.id : content.mission.en;
  const visionText = isID ? content.vision.id : content.vision.en;
  const contactIntroText = isID
    ? content.contactIntro.id
    : content.contactIntro.en;

  return (
    <main className="bg-[#fafafa] text-[#1C1C1E]">
      <section className="relative min-h-[260px] overflow-hidden sm:min-h-[320px] lg:min-h-[460px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroUrl}
          alt="TeTaMo office"
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-black/45" />

        <div className="relative mx-auto flex min-h-[260px] max-w-5xl items-end px-3 pb-5 sm:min-h-[320px] sm:px-5 sm:pb-7 lg:min-h-[460px] lg:px-8 lg:pb-10">
          <div className="max-w-4xl text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80 sm:text-xs">
              {t.pageTitle}
            </p>

            <h1 className="mt-3 text-[2.3rem] font-semibold leading-[0.95] tracking-[-0.05em] sm:mt-4 sm:text-[3.25rem] lg:mt-5 lg:text-[4.75rem]">
              TeTaMo
            </h1>

            <p className="mt-3 max-w-3xl text-[14px] leading-6 text-white/90 sm:mt-4 sm:text-[15px] sm:leading-7 lg:mt-5 lg:text-[18px] lg:leading-8">
              {t.pageIntro}
            </p>

            {(isAdmin || authLoading) && (
              <div className="mt-4 flex flex-wrap items-center gap-2.5 sm:mt-5 sm:gap-3">
                {isAdmin && (
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[13px] font-semibold text-white backdrop-blur transition hover:bg-white/15 sm:px-5 sm:py-2.5 sm:text-sm">
                    {t.replaceImage}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onPickHero}
                    />
                  </label>
                )}

                {authLoading ? (
                  <span className="text-[11px] text-white/75 sm:text-xs">
                    {t.loading}
                  </span>
                ) : isAdmin ? (
                  <span className="text-[11px] text-white/75 sm:text-xs">
                    {t.adminMode}
                  </span>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-3 py-8 sm:px-5 sm:py-10 lg:px-8 lg:py-12">
        <ContentSection
          title={t.aboutTitle}
          value={aboutText}
          isAdmin={isAdmin}
          onChange={(value) => updateLocalizedField("about", value)}
        />

        <ContentSection
          title={t.missionTitle}
          value={missionText}
          isAdmin={isAdmin}
          onChange={(value) => updateLocalizedField("mission", value)}
        />

        <ContentSection
          title={t.visionTitle}
          value={visionText}
          isAdmin={isAdmin}
          onChange={(value) => updateLocalizedField("vision", value)}
          last
        />
      </section>

      <section className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-3 py-8 sm:px-5 sm:py-10 lg:px-8 lg:py-12">
          <div className="grid gap-6 sm:gap-8 lg:grid-cols-[220px_1fr] lg:gap-12">
            <div>
              <h2 className="text-[1.55rem] font-semibold tracking-[-0.03em] text-[#1C1C1E] sm:text-[2rem] lg:text-[2.6rem]">
                {t.contactTitle}
              </h2>
            </div>

            <div>
              <EditableParagraph
                value={contactIntroText}
                isAdmin={isAdmin}
                onChange={(value) => updateLocalizedField("contactIntro", value)}
                minHeight="min-h-[100px] sm:min-h-[110px]"
              />

              <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-5">
                <ContactLine
                  label={t.emailLabel}
                  value={content.email}
                  isAdmin={isAdmin}
                  onChange={(value) =>
                    setContent((prev) => ({ ...prev, email: value }))
                  }
                />

                <ContactLine
                  label={t.whatsappLabel}
                  value={content.whatsapp}
                  isAdmin={isAdmin}
                  onChange={(value) =>
                    setContent((prev) => ({ ...prev, whatsapp: value }))
                  }
                />

                <ContactLine
                  label={t.websiteLabel}
                  value={content.website}
                  isAdmin={isAdmin}
                  onChange={(value) =>
                    setContent((prev) => ({ ...prev, website: value }))
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ContentSection({
  title,
  value,
  isAdmin,
  onChange,
  last = false,
}: {
  title: string;
  value: string;
  isAdmin: boolean;
  onChange: (value: string) => void;
  last?: boolean;
}) {
  return (
    <section
      className={`grid gap-6 py-8 sm:gap-8 sm:py-10 lg:grid-cols-[220px_1fr] lg:gap-12 lg:py-12 ${
        last ? "" : "border-b border-gray-200"
      }`}
    >
      <div>
        <h2 className="text-[1.55rem] font-semibold tracking-[-0.03em] text-[#1C1C1E] sm:text-[2rem] lg:text-[2.6rem]">
          {title}
        </h2>
      </div>

      <div>
        <EditableParagraph
          value={value}
          isAdmin={isAdmin}
          onChange={onChange}
          minHeight="min-h-[180px] sm:min-h-[200px]"
        />
      </div>
    </section>
  );
}

function EditableParagraph({
  value,
  isAdmin,
  onChange,
  minHeight,
}: {
  value: string;
  isAdmin: boolean;
  onChange: (value: string) => void;
  minHeight: string;
}) {
  if (isAdmin) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full resize-y rounded-2xl border border-gray-200 bg-white px-4 py-4 text-[14px] leading-6 text-gray-700 outline-none focus:border-gray-400 sm:text-[15px] sm:leading-7 lg:text-[17px] lg:leading-8 ${minHeight}`}
      />
    );
  }

  return (
    <p className="whitespace-pre-line text-[14px] leading-6 text-gray-700 sm:text-[15px] sm:leading-7 lg:text-[17px] lg:leading-8">
      {value}
    </p>
  );
}

function ContactLine({
  label,
  value,
  isAdmin,
  onChange,
}: {
  label: string;
  value: string;
  isAdmin: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2 border-b border-gray-200 pb-4 sm:gap-3 lg:grid-cols-[140px_1fr] lg:gap-6">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 sm:text-[12px]">
        {label}
      </div>

      <div>
        {isAdmin ? (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] text-[#1C1C1E] outline-none focus:border-gray-400 sm:text-[15px] lg:text-base"
          />
        ) : (
          <p className="break-all text-[14px] text-[#1C1C1E] sm:text-[15px] lg:text-base">
            {value}
          </p>
        )}
      </div>
    </div>
  );
}