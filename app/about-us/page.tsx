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

        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (!mounted) return;

        setIsAdmin(data?.role === "admin");
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
    <main className="bg-white text-[#1C1C1E]">
      <section className="relative min-h-[420px] overflow-hidden md:min-h-[580px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroUrl}
          alt="TeTaMo office"
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-black/45" />

        <div className="relative mx-auto flex min-h-[420px] max-w-7xl items-end px-6 pb-12 md:min-h-[580px] md:px-8 md:pb-16">
          <div className="max-w-4xl text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/80 md:text-base">
              {t.pageTitle}
            </p>

            <h1 className="mt-5 text-5xl font-semibold leading-[0.95] tracking-[-0.04em] md:text-7xl">
              TeTaMo
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/90 md:text-2xl md:leading-10">
              {t.pageIntro}
            </p>

            {(isAdmin || authLoading) && (
              <div className="mt-8 flex flex-wrap items-center gap-4">
                {isAdmin && (
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/15">
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
                  <span className="text-sm text-white/75">{t.loading}</span>
                ) : isAdmin ? (
                  <span className="text-sm text-white/75">{t.adminMode}</span>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 md:px-8 md:py-28">
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

      <section className="border-t border-gray-200 bg-[#F7F7F8]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-8 md:py-24">
          <div className="grid gap-10 md:grid-cols-[240px_1fr] md:gap-16">
            <div>
              <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[#1C1C1E] md:text-5xl">
                {t.contactTitle}
              </h2>
            </div>

            <div>
              <EditableParagraph
                value={contactIntroText}
                isAdmin={isAdmin}
                onChange={(value) => updateLocalizedField("contactIntro", value)}
                minHeight="min-h-[120px]"
              />

              <div className="mt-10 space-y-6">
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
      className={`grid gap-8 py-14 md:grid-cols-[240px_1fr] md:gap-16 md:py-20 ${
        last ? "" : "border-b border-gray-200"
      }`}
    >
      <div>
        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[#1C1C1E] md:text-5xl">
          {title}
        </h2>
      </div>

      <div>
        <EditableParagraph
          value={value}
          isAdmin={isAdmin}
          onChange={onChange}
          minHeight="min-h-[220px]"
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
        className={`w-full resize-none border-0 bg-transparent p-0 text-xl leading-9 text-gray-700 outline-none md:text-2xl md:leading-10 ${minHeight}`}
      />
    );
  }

  return (
    <p className="whitespace-pre-line text-xl leading-9 text-gray-700 md:text-2xl md:leading-10">
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
    <div className="grid gap-3 border-b border-gray-200 pb-5 md:grid-cols-[160px_1fr] md:gap-8">
      <div className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
        {label}
      </div>

      <div>
        {isAdmin ? (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full border-0 bg-transparent p-0 text-lg text-[#1C1C1E] outline-none md:text-xl"
          />
        ) : (
          <p className="text-lg text-[#1C1C1E] md:text-xl">{value}</p>
        )}
      </div>
    </div>
  );
}