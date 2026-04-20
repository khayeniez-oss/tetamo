"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Building2,
  ClipboardList,
  Mail,
  MessageSquareMore,
  ShieldCheck,
  FileText,
  Send,
  CheckCircle2,
} from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";

type FormState = {
  fullName: string;
  companyName: string;
  email: string;
  whatsapp: string;
  projectName: string;
  projectLocation: string;
  propertyType: string;
  unitCount: string;
  requirements: string;
  timeline: string;
};

const initialForm: FormState = {
  fullName: "",
  companyName: "",
  email: "",
  whatsapp: "",
  projectName: "",
  projectLocation: "",
  propertyType: "",
  unitCount: "",
  requirements: "",
  timeline: "",
};

function InputField({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-[#1C1C1E]">
        {label}
        {required ? <span className="ml-1 text-[#b42318]">*</span> : null}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-[#d2d2d7] bg-white px-4 py-3 text-sm text-[#1C1C1E] outline-none transition placeholder:text-gray-400 focus:border-[#1C1C1E]"
      />
    </div>
  );
}

function TextareaField({
  label,
  placeholder,
  value,
  onChange,
  required = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-[#1C1C1E]">
        {label}
        {required ? <span className="ml-1 text-[#b42318]">*</span> : null}
      </label>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={5}
        className="w-full resize-none rounded-2xl border border-[#d2d2d7] bg-white px-4 py-3 text-sm text-[#1C1C1E] outline-none transition placeholder:text-gray-400 focus:border-[#1C1C1E]"
      />
    </div>
  );
}

function InfoCard({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-3xl border border-[#e5e5e7] bg-white p-5 shadow-sm">
      <div className="mb-3 inline-flex rounded-2xl border border-[#e5e5e7] bg-[#f8f8f8] p-2.5">
        {icon}
      </div>

      <h3 className="text-base font-semibold text-[#1C1C1E]">{title}</h3>

      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#6e6e73]">
        {desc}
      </p>
    </div>
  );
}

export default function DeveloperLicensePage() {
  const { lang } = useLanguage();

  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fallbackEmail = "inquiry@tetamo.com";
  const fallbackWhatsApp = "+6282264778799";

  const contactEmail =
    process.env.NEXT_PUBLIC_TETAMO_CONTACT_EMAIL?.trim() || fallbackEmail;

  const contactWhatsApp =
    process.env.NEXT_PUBLIC_TETAMO_CONTACT_WHATSAPP?.trim() ||
    fallbackWhatsApp;

  const whatsappDigits = useMemo(
    () => contactWhatsApp.replace(/[^\d]/g, ""),
    [contactWhatsApp]
  );

  const pageText = useMemo(
    () =>
      lang === "id"
        ? {
            back: "Kembali ke Sign Up",
            eyebrow: "TETAMO Developer License",
            title: "Request a Quote untuk Menggunakan Lisensi TETAMO",
            subtitle:
              "Halaman ini khusus untuk developer, project owner, dan perusahaan properti yang ingin menggunakan sistem berlisensi TETAMO untuk kebutuhan pemasaran proyek, listing, inquiry buyer/renter, dan workflow digital properti.",
            primaryPoint:
              "Ini bukan paket agent dan bukan paket owner. Ini adalah permintaan penawaran project-based license.",
            requestTitle: "Request a Quote",
            requestDesc:
              "Kirim detail proyek Anda. Tim TETAMO akan meninjau kebutuhan lisensi, skala proyek, dan ruang lingkup penggunaan sebelum mengirimkan penawaran resmi.",
            suitableTitle: "Untuk Siapa",
            suitableDesc:
              "• Developer perumahan, cluster, villa, apartemen, dan mixed-use\n• Project owner yang membutuhkan sistem listing dan inquiry\n• Perusahaan properti yang ingin memakai platform license untuk proyek mereka",
            licenseTitle: "Lisensi Dapat Mencakup",
            licenseDesc:
              "• Project listing dan branded project presence\n• Inquiry buyer/renter dan lead management\n• Digital property workflow untuk project marketing\n• Penggunaan sistem TETAMO berdasarkan ruang lingkup yang disetujui",
            processTitle: "Alur Request",
            process1: "1. Kirim detail proyek",
            process2: "2. TETAMO meninjau scope lisensi",
            process3: "3. TETAMO mengirimkan quotation",
            formTitle: "Developer License Quotation Form",
            formDesc:
              "Isi informasi utama proyek Anda agar kami bisa menyiapkan quotation yang sesuai.",
            fullName: "Nama Lengkap",
            fullNamePh: "Masukkan nama lengkap Anda",
            companyName: "Nama Perusahaan",
            companyNamePh: "Masukkan nama perusahaan",
            email: "Email",
            emailPh: "Masukkan email aktif",
            whatsapp: "WhatsApp / Telepon",
            whatsappPh: "Masukkan nomor WhatsApp / telepon",
            projectName: "Nama Proyek",
            projectNamePh: "Masukkan nama proyek",
            projectLocation: "Lokasi Proyek",
            projectLocationPh: "Contoh: Bali, Jakarta, Surabaya",
            propertyType: "Jenis Proyek",
            propertyTypePh: "Contoh: Villa, Apartemen, Perumahan, Komersial",
            unitCount: "Jumlah Unit / Scope Proyek",
            unitCountPh: "Contoh: 120 unit / 3 proyek / multi-location",
            timeline: "Target Timeline",
            timelinePh: "Contoh: Launch Q3 2026",
            requirements: "Kebutuhan Lisensi",
            requirementsPh:
              "Jelaskan bagaimana proyek Anda ingin menggunakan TETAMO, fitur yang dibutuhkan, jumlah listing, target market, dan kebutuhan workflow.",
            noteTitle: "Catatan Penting",
            noteDesc:
              "Submitting this form does not activate any package. Developer access is reviewed by TETAMO and handled through a formal project-based quotation.",
            sendEmail: "Kirim via Email",
            sendWhatsApp: "Kirim via WhatsApp",
            success:
              "Permintaan Anda sudah siap dikirim. Silakan lanjutkan melalui email atau WhatsApp yang terbuka.",
            requiredAlert: "Mohon lengkapi semua field wajib terlebih dahulu.",
            noMethodAlert:
              "Metode kontak belum dikonfigurasi. Tambahkan email atau WhatsApp TETAMO terlebih dahulu.",
            subject: "Developer License Quotation Request - TETAMO",
          }
        : {
            back: "Back to Sign Up",
            eyebrow: "TETAMO Developer License",
            title: "Request a Quote to Use the TETAMO License",
            subtitle:
              "This page is specifically for developers, project owners, and property companies who want to use TETAMO’s licensed platform system for project marketing, listings, buyer/renter inquiries, and digital property workflow.",
            primaryPoint:
              "This is not an agent package and not an owner listing package. This is a project-based license quotation request.",
            requestTitle: "Request a Quote",
            requestDesc:
              "Send your project details. The TETAMO team will review the license requirements, project scale, and usage scope before sending an official quotation.",
            suitableTitle: "Who This Is For",
            suitableDesc:
              "• Housing, cluster, villa, apartment, and mixed-use developers\n• Project owners who need listing and inquiry systems\n• Property companies that want to use a licensed platform for their project",
            licenseTitle: "The License Can Cover",
            licenseDesc:
              "• Project listings and branded project presence\n• Buyer/renter inquiries and lead management\n• Digital property workflow for project marketing\n• Use of the TETAMO system based on the approved scope",
            processTitle: "Request Flow",
            process1: "1. Submit project details",
            process2: "2. TETAMO reviews the license scope",
            process3: "3. TETAMO sends a quotation",
            formTitle: "Developer License Quotation Form",
            formDesc:
              "Complete the key project information so we can prepare the right quotation.",
            fullName: "Full Name",
            fullNamePh: "Enter your full name",
            companyName: "Company Name",
            companyNamePh: "Enter your company name",
            email: "Email",
            emailPh: "Enter your active email",
            whatsapp: "WhatsApp / Phone",
            whatsappPh: "Enter your WhatsApp / phone number",
            projectName: "Project Name",
            projectNamePh: "Enter your project name",
            projectLocation: "Project Location",
            projectLocationPh: "Example: Bali, Jakarta, Surabaya",
            propertyType: "Project Type",
            propertyTypePh: "Example: Villa, Apartment, Housing, Commercial",
            unitCount: "Unit Count / Project Scope",
            unitCountPh: "Example: 120 units / 3 projects / multi-location",
            timeline: "Target Timeline",
            timelinePh: "Example: Launch Q3 2026",
            requirements: "License Requirements",
            requirementsPh:
              "Explain how your project wants to use TETAMO, features needed, number of listings, target market, and workflow requirements.",
            noteTitle: "Important Note",
            noteDesc:
              "Submitting this form does not activate any package. Developer access is reviewed by TETAMO and handled through a formal project-based quotation.",
            sendEmail: "Send by Email",
            sendWhatsApp: "Send by WhatsApp",
            success:
              "Your request is ready to send. Please continue through the email or WhatsApp window that opened.",
            requiredAlert: "Please complete all required fields first.",
            noMethodAlert:
              "No contact method is configured yet. Add TETAMO email or WhatsApp first.",
            subject: "Developer License Quotation Request - TETAMO",
          },
    [lang]
  );

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const requiredFieldsFilled =
    form.fullName.trim() &&
    form.companyName.trim() &&
    form.email.trim() &&
    form.whatsapp.trim() &&
    form.projectName.trim() &&
    form.projectLocation.trim() &&
    form.propertyType.trim() &&
    form.requirements.trim();

  const messageBody = useMemo(() => {
    return `${
      lang === "id"
        ? "Halo TETAMO, saya ingin meminta quotation untuk Developer License."
        : "Hello TETAMO, I would like to request a quotation for a Developer License."
    }

${pageText.fullName}: ${form.fullName}
${pageText.companyName}: ${form.companyName}
${pageText.email}: ${form.email}
${pageText.whatsapp}: ${form.whatsapp}
${pageText.projectName}: ${form.projectName}
${pageText.projectLocation}: ${form.projectLocation}
${pageText.propertyType}: ${form.propertyType}
${pageText.unitCount}: ${form.unitCount || "-"}
${pageText.timeline}: ${form.timeline || "-"}

${pageText.requirements}:
${form.requirements}`.trim();
  }, [form, lang, pageText]);

  function handleSendEmail() {
    if (!requiredFieldsFilled) {
      alert(pageText.requiredAlert);
      return;
    }

    if (!contactEmail) {
      alert(pageText.noMethodAlert);
      return;
    }

    setSubmitting(true);

    const mailto = `mailto:${contactEmail}?subject=${encodeURIComponent(
      pageText.subject
    )}&body=${encodeURIComponent(messageBody)}`;

    window.location.href = mailto;

    setSubmitting(false);
    setSubmitted(true);
  }

  function handleSendWhatsApp() {
    if (!requiredFieldsFilled) {
      alert(pageText.requiredAlert);
      return;
    }

    if (!whatsappDigits) {
      alert(pageText.noMethodAlert);
      return;
    }

    setSubmitting(true);

    const waUrl = `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
      messageBody
    )}`;

    window.open(waUrl, "_blank", "noopener,noreferrer");

    setSubmitting(false);
    setSubmitted(true);
  }

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-5 sm:mb-6">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-2xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm font-semibold text-[#1C1C1E] transition hover:bg-[#f8f8f8]"
          >
            <ArrowLeft className="h-4 w-4" />
            {pageText.back}
          </Link>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="min-w-0 space-y-6">
            <div className="rounded-[28px] border border-[#e5e5e7] bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:p-7 lg:p-8">
              <div className="inline-flex max-w-full items-center rounded-full border border-[#e5e5e7] bg-[#fafafa] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6e6e73] sm:text-[11px]">
                {pageText.eyebrow}
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#1C1C1E] sm:text-4xl lg:text-5xl">
                {pageText.title}
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-[#6e6e73] sm:text-base">
                {pageText.subtitle}
              </p>

              <div className="mt-5 rounded-3xl border border-[#1C1C1E]/10 bg-[#fafafa] p-4 sm:p-5">
                <p className="text-sm font-semibold leading-6 text-[#1C1C1E] sm:text-base">
                  {pageText.primaryPoint}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <InfoCard
                icon={<Building2 className="h-5 w-5 text-[#1C1C1E]" />}
                title={pageText.suitableTitle}
                desc={pageText.suitableDesc}
              />

              <InfoCard
                icon={<ShieldCheck className="h-5 w-5 text-[#1C1C1E]" />}
                title={pageText.licenseTitle}
                desc={pageText.licenseDesc}
              />
            </div>

            <div className="rounded-[28px] border border-[#e5e5e7] bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:p-7 lg:p-8">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl border border-[#e5e5e7] bg-[#f8f8f8] p-2.5">
                  <ClipboardList className="h-5 w-5 text-[#1C1C1E]" />
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-[#1C1C1E]">
                    {pageText.formTitle}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#6e6e73]">
                    {pageText.formDesc}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <InputField
                  label={pageText.fullName}
                  placeholder={pageText.fullNamePh}
                  value={form.fullName}
                  onChange={(value) => updateField("fullName", value)}
                  required
                />

                <InputField
                  label={pageText.companyName}
                  placeholder={pageText.companyNamePh}
                  value={form.companyName}
                  onChange={(value) => updateField("companyName", value)}
                  required
                />

                <InputField
                  label={pageText.email}
                  type="email"
                  placeholder={pageText.emailPh}
                  value={form.email}
                  onChange={(value) => updateField("email", value)}
                  required
                />

                <InputField
                  label={pageText.whatsapp}
                  placeholder={pageText.whatsappPh}
                  value={form.whatsapp}
                  onChange={(value) => updateField("whatsapp", value)}
                  required
                />

                <InputField
                  label={pageText.projectName}
                  placeholder={pageText.projectNamePh}
                  value={form.projectName}
                  onChange={(value) => updateField("projectName", value)}
                  required
                />

                <InputField
                  label={pageText.projectLocation}
                  placeholder={pageText.projectLocationPh}
                  value={form.projectLocation}
                  onChange={(value) => updateField("projectLocation", value)}
                  required
                />

                <InputField
                  label={pageText.propertyType}
                  placeholder={pageText.propertyTypePh}
                  value={form.propertyType}
                  onChange={(value) => updateField("propertyType", value)}
                  required
                />

                <InputField
                  label={pageText.unitCount}
                  placeholder={pageText.unitCountPh}
                  value={form.unitCount}
                  onChange={(value) => updateField("unitCount", value)}
                />

                <div className="sm:col-span-2">
                  <InputField
                    label={pageText.timeline}
                    placeholder={pageText.timelinePh}
                    value={form.timeline}
                    onChange={(value) => updateField("timeline", value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <TextareaField
                    label={pageText.requirements}
                    placeholder={pageText.requirementsPh}
                    value={form.requirements}
                    onChange={(value) => updateField("requirements", value)}
                    required
                  />
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-[#e5e5e7] bg-[#fafafa] p-4">
                <p className="text-sm font-semibold text-[#1C1C1E]">
                  {pageText.noteTitle}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#6e6e73]">
                  {pageText.noteDesc}
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1C1C1E] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Mail className="h-4 w-4" />
                  {pageText.sendEmail}
                </button>

                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#d2d2d7] bg-white px-4 py-3 text-sm font-semibold text-[#1C1C1E] transition hover:bg-[#f8f8f8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <MessageSquareMore className="h-4 w-4" />
                  {pageText.sendWhatsApp}
                </button>
              </div>

              {submitted ? (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{pageText.success}</p>
                </div>
              ) : null}
            </div>
          </div>

          <aside className="min-w-0 space-y-6 lg:sticky lg:top-28">
            <div className="rounded-[28px] border border-[#e5e5e7] bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:p-7 lg:p-8">
              <div className="mb-4 inline-flex rounded-2xl border border-[#e5e5e7] bg-[#f8f8f8] p-2.5">
                <Send className="h-5 w-5 text-[#1C1C1E]" />
              </div>

              <h2 className="text-xl font-semibold text-[#1C1C1E]">
                {pageText.requestTitle}
              </h2>

              <p className="mt-3 text-sm leading-7 text-[#6e6e73]">
                {pageText.requestDesc}
              </p>
            </div>

            <div className="rounded-[28px] border border-[#e5e5e7] bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-4 inline-flex rounded-2xl border border-[#e5e5e7] bg-[#f8f8f8] p-2.5">
                <FileText className="h-5 w-5 text-[#1C1C1E]" />
              </div>

              <h2 className="text-xl font-semibold text-[#1C1C1E]">
                {pageText.processTitle}
              </h2>

              <div className="mt-5 space-y-3">
                {[pageText.process1, pageText.process2, pageText.process3].map(
                  (item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-[#e5e5e7] bg-[#fafafa] px-4 py-3 text-sm font-medium leading-6 text-[#1C1C1E]"
                    >
                      {item}
                    </div>
                  )
                )}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}