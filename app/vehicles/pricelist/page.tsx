"use client";

import Link from "next/link";
import { Check, Crown, Clock3, BadgeCheck, MessageCircle, CalendarDays, CarFront, Bike } from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";

export default function VehiclePricelistPage() {
  const { lang } = useLanguage();
  const isID = lang === "id";

  const t = {
    eyebrow: isID ? "PRICELIST KENDARAAN" : "VEHICLE PRICELIST",
    title: isID
      ? "Pilih Paket Listing Kendaraan Anda"
      : "Choose Your Vehicle Listing Package",
    subtitle: isID
      ? "Harga sederhana dan jelas untuk listing mobil atau motor di TETAMO."
      : "Simple and clear pricing for car or motorbike listings on TETAMO.",

    basic: isID ? "Basic Listing" : "Basic Listing",
    featured: isID ? "Featured Listing" : "Featured Listing",

    basicDesc: isID
      ? "Listing aktif selama 90 hari di marketplace."
      : "Your listing stays active in the marketplace for 90 days.",
    featuredDesc: isID
      ? "Featured selama 30 hari, listing tetap aktif 90 hari."
      : "Featured for 30 days, while the listing stays active for 90 days.",

    active90: isID ? "Aktif 90 Hari" : "Active 90 Days",
    featured30: isID ? "Featured 30 Hari" : "Featured 30 Days",

    includesTitle: isID ? "Yang Sudah Termasuk" : "What’s Included",
    bothPlans: isID ? "Kedua paket sudah termasuk:" : "Both plans already include:",

    ownerPage: isID ? "Halaman owner sendiri" : "Own owner page",
    leads: isID ? "Bisa menerima leads" : "Can receive leads",
    schedule: isID ? "Bisa menerima schedule viewing / test ride" : "Can receive viewing / test ride schedules",
    manage: isID ? "Bisa edit dan kelola listing" : "Can edit and manage listing",
    billing: isID ? "Invoice / receipt / riwayat pembayaran" : "Invoice / receipt / payment history",

    featuredExtraTitle: isID ? "Kelebihan Featured" : "Featured Advantage",
    featuredExtra1: isID ? "Prioritas posisi lebih tinggi di marketplace" : "Higher priority placement in the marketplace",
    featuredExtra2: isID ? "Badge featured lebih menonjol" : "More visible featured badge",
    featuredExtra3: isID ? "Masa featured 30 hari, lalu lanjut normal sampai 90 hari" : "Featured period for 30 days, then continues as a normal listing until day 90",

    suitableTitle: isID ? "Cocok Untuk" : "Suitable For",
    basicFit: isID ? "Owner yang ingin listing normal dengan biaya rendah." : "Owners who want a normal listing at a lower cost.",
    featuredFit: isID ? "Owner yang ingin exposure lebih kuat dan lebih cepat terlihat." : "Owners who want stronger exposure and faster visibility.",

    noteTitle: isID ? "Catatan Penting" : "Important Note",
    noteText: isID
      ? "Featured tidak berarti listing berakhir setelah 30 hari. Featured hanya aktif 30 hari, tetapi listing tetap aktif total 90 hari."
      : "Featured does not mean the listing ends after 30 days. The featured boost lasts 30 days, but the listing remains active for a total of 90 days.",

    ctaTitle: isID ? "Siap Listing Kendaraan Anda?" : "Ready to List Your Vehicle?",
    ctaText: isID
      ? "Anda bisa gunakan halaman ini untuk mobil dan motor. Next step nanti bisa dihubungkan terus ke flow create listing dan pembayaran."
      : "You can use this page for both cars and motorbikes. The next step can later connect this directly to the create listing and payment flow.",

    viewCars: isID ? "Lihat Mobil" : "View Cars",
    viewMotors: isID ? "Lihat Motor" : "View Motor",
    contactUs: isID ? "Hubungi Tetamo" : "Contact Tetamo",

    faqTitle: isID ? "FAQ Singkat" : "Quick FAQ",
    faq1q: isID ? "Apakah owner tetap dapat halaman sendiri di paket Basic?" : "Does the owner still get their own page in the Basic package?",
    faq1a: isID
      ? "Ya. Halaman owner, leads, dan jadwal tetap termasuk di Basic."
      : "Yes. The owner page, leads, and schedule access are still included in Basic.",
    faq2q: isID ? "Apa beda utama Basic dan Featured?" : "What is the main difference between Basic and Featured?",
    faq2a: isID
      ? "Perbedaan utamanya adalah visibilitas. Featured mendapat exposure lebih tinggi selama 30 hari."
      : "The main difference is visibility. Featured gets stronger exposure for 30 days.",
    faq3q: isID ? "Setelah 30 hari apakah listing Featured hilang?" : "After 30 days, does a Featured listing disappear?",
    faq3a: isID
      ? "Tidak. Listing tetap aktif sampai total 90 hari."
      : "No. The listing stays active until the full 90-day period ends.",
  };

  const whatsappText = encodeURIComponent(
    isID
      ? "Hi Tetamo, saya tertarik untuk listing kendaraan saya di platform Anda. Bagaimana prosesnya?"
      : "Hi Tetamo, I’m interested in listing my vehicle on your platform. How does the process work?"
  );

  const whatsappHref = `https://wa.me/6282313556606?text=${whatsappText}`;

  const commonIncludes = [
    { icon: BadgeCheck, text: t.ownerPage },
    { icon: MessageCircle, text: t.leads },
    { icon: CalendarDays, text: t.schedule },
    { icon: Check, text: t.manage },
    { icon: Check, text: t.billing },
  ];

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <section className="border-b border-gray-100 bg-[#F7F7F8]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 sm:text-xs">
              {t.eyebrow}
            </p>

            <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.03em] text-[#1C1C1E] sm:text-4xl lg:text-5xl">
              {t.title}
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-gray-600 sm:text-base">
              {t.subtitle}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                  {t.basic}
                </div>
                <h2 className="mt-4 text-3xl font-extrabold text-[#1C1C1E]">
                  Rp 80,000
                </h2>
                <p className="mt-2 text-sm leading-7 text-gray-600">
                  {t.basicDesc}
                </p>
              </div>

              <div className="rounded-2xl bg-[#F7F7F8] p-3 text-[#1C1C1E]">
                <Clock3 className="h-6 w-6" />
              </div>
            </div>

            <div className="mt-5 inline-flex rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-[#1C1C1E]">
              {t.active90}
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-bold text-[#1C1C1E]">
                {t.includesTitle}
              </h3>

              <div className="mt-4 space-y-3">
                {commonIncludes.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={`${item.text}-${index}`}
                      className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-[#FAFAFA] px-4 py-3"
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#1C1C1E] shadow-sm">
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="text-sm leading-6 text-gray-700">{item.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-[#F7F7F8] p-4">
              <p className="text-sm font-semibold text-[#1C1C1E]">
                {t.suitableTitle}
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-600">{t.basicFit}</p>
            </div>
          </div>

          <div className="rounded-[32px] border border-[#D4A017]/30 bg-white p-6 shadow-[0_0_0_1px_rgba(212,160,23,0.14),0_10px_30px_rgba(212,160,23,0.14)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1 rounded-full bg-[#1C1C1E] px-3 py-1 text-xs font-semibold text-white">
                  <Crown className="h-3.5 w-3.5 text-[#FFD700]" />
                  {t.featured}
                </div>
                <h2 className="mt-4 text-3xl font-extrabold text-[#1C1C1E]">
                  Rp 250,000
                </h2>
                <p className="mt-2 text-sm leading-7 text-gray-600">
                  {t.featuredDesc}
                </p>
              </div>

              <div className="rounded-2xl bg-[#FFF8E6] p-3 text-[#B8860B]">
                <Crown className="h-6 w-6" />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <div className="inline-flex rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-[#1C1C1E]">
                {t.active90}
              </div>
              <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                {t.featured30}
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-bold text-[#1C1C1E]">
                {t.includesTitle}
              </h3>

              <div className="mt-4 space-y-3">
                {commonIncludes.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={`${item.text}-${index}`}
                      className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-[#FAFAFA] px-4 py-3"
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#1C1C1E] shadow-sm">
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="text-sm leading-6 text-gray-700">{item.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-[#FFF8E6] p-4">
              <p className="text-sm font-semibold text-[#1C1C1E]">
                {t.featuredExtraTitle}
              </p>
              <div className="mt-3 space-y-2 text-sm leading-6 text-gray-700">
                <div className="flex gap-2">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#B8860B]" />
                  <span>{t.featuredExtra1}</span>
                </div>
                <div className="flex gap-2">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#B8860B]" />
                  <span>{t.featuredExtra2}</span>
                </div>
                <div className="flex gap-2">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#B8860B]" />
                  <span>{t.featuredExtra3}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-[#F7F7F8] p-4">
              <p className="text-sm font-semibold text-[#1C1C1E]">
                {t.suitableTitle}
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {t.featuredFit}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="rounded-[32px] border border-gray-200 bg-[#F7F7F8] p-6 sm:p-7">
          <h2 className="text-xl font-bold text-[#1C1C1E]">{t.noteTitle}</h2>
          <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
            {t.noteText}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F7F8] text-[#1C1C1E]">
              <CarFront className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-[#1C1C1E]">
              {isID ? "Untuk Mobil" : "For Cars"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {isID
                ? "Gunakan pricelist ini untuk owner yang ingin listing mobil di Tetamo."
                : "Use this pricelist for owners who want to list cars on Tetamo."}
            </p>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F7F8] text-[#1C1C1E]">
              <Bike className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-[#1C1C1E]">
              {isID ? "Untuk Motor" : "For Motorbikes"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {isID
                ? "Gunakan pricelist ini juga untuk owner yang ingin listing motor."
                : "Use this pricelist as well for owners who want to list motorbikes."}
            </p>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F7F8] text-[#1C1C1E]">
              <BadgeCheck className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-[#1C1C1E]">
              {isID ? "Dashboard Owner" : "Owner Dashboard"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {isID
                ? "Leads, schedule, edit listing, invoice, dan status listing tetap termasuk."
                : "Leads, schedule, listing edits, invoices, and listing status remain included."}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-extrabold text-[#1C1C1E]">
            {t.faqTitle}
          </h2>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-[#FAFAFA] p-4">
              <p className="text-sm font-bold text-[#1C1C1E]">{t.faq1q}</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">{t.faq1a}</p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-[#FAFAFA] p-4">
              <p className="text-sm font-bold text-[#1C1C1E]">{t.faq2q}</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">{t.faq2a}</p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-[#FAFAFA] p-4">
              <p className="text-sm font-bold text-[#1C1C1E]">{t.faq3q}</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">{t.faq3a}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8 lg:pb-16">
        <div className="rounded-[32px] bg-[#1C1C1E] p-6 text-white shadow-sm sm:p-8">
          <h2 className="text-2xl font-extrabold sm:text-3xl">{t.ctaTitle}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
            {t.ctaText}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/vehicles/car"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#1C1C1E] transition hover:opacity-90"
            >
              {t.viewCars}
            </Link>

            <Link
              href="/vehicles/motor"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              {t.viewMotors}
            </Link>

            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-2xl border border-[#D4A017]/30 bg-[#B8860B] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {t.contactUs}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}