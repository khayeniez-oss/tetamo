"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  BriefcaseBusiness,
  ClipboardList,
  Mail,
  MessageSquareMore,
  ShieldCheck,
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
      <label className="mb-2 block text-sm font-medium text-[#1C1C1E]">
        {label}
        {required ? <span className="ml-1 text-[#b42318]">*</span> : null}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-[#d2d2d7] bg-white px-4 py-3 text-sm text-[#1C1C1E] outline-none transition placeholder:text-gray-500 focus:border-[#1C1C1E]"
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
      <label className="mb-2 block text-sm font-medium text-[#1C1C1E]">
        {label}
        {required ? <span className="ml-1 text-[#b42318]">*</span> : null}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={5}
        className="w-full resize-none rounded-2xl border border-[#d2d2d7] bg-white px-4 py-3 text-sm text-[#1C1C1E] outline-none transition placeholder:text-gray-500 focus:border-[#1C1C1E]"
      />
    </div>
  );
}

function InfoCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
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

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const pageText =
    lang === "id"
      ? {
          back: "Kembali ke daftar",
          eyebrow: "Lisensi Developer Tetamo",
          title: "Custom License to Use untuk Developer",
          subtitle:
            "Tetamo tidak menawarkan paket standar untuk Developer. Akses Developer ditawarkan melalui skema License to Use yang disesuaikan dengan kebutuhan proyek, skala bisnis, dan ruang lingkup kerja sama.",
          ctaBoxTitle: "Request a Quotation",
          ctaBoxDesc:
            "Isi detail proyek Anda dan kirim permintaan penawaran. Kami akan meninjau kebutuhan Anda untuk menyiapkan proposal lisensi yang sesuai.",
          whoTitle: "Cocok untuk",
          who1: "Developer perumahan dan cluster",
          who2: "Proyek villa, apartemen, dan mixed-use",
          who3: "Project marketing dan multi-project group",
          scopeTitle: "Apa yang bisa dicakup",
          scope1: "Eksposur proyek dan branded presence di Tetamo",
          scope2: "License to use dengan struktur komersial khusus",
          scope3: "Penyesuaian berdasarkan skala proyek dan kebutuhan bisnis",
          formTitle: "Form Permintaan Penawaran",
          formDesc:
            "Berikan informasi utama proyek Anda agar kami bisa menyiapkan penawaran yang relevan.",
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
          propertyType: "Jenis Properti / Proyek",
          propertyTypePh: "Contoh: Perumahan, Villa, Apartemen, Komersial",
          unitCount: "Jumlah Unit / Project Scope",
          unitCountPh: "Contoh: 120 unit / 3 proyek",
          requirements: "Kebutuhan Anda",
          requirementsPh:
            "Jelaskan apa yang Anda butuhkan dari Tetamo, target, atau kebutuhan khusus lisensi Anda.",
          timeline: "Target Timeline",
          timelinePh: "Contoh: Launch Q3 2026",
          noteTitle: "Catatan",
          noteDesc:
            "Halaman ini belum mengaktifkan paket self-serve untuk Developer. Semua permintaan Developer akan diproses melalui penawaran khusus License to Use.",
          sendEmail: "Kirim via Email",
          sendWhatsApp: "Kirim via WhatsApp",
          success:
            "Permintaan Anda sudah siap dikirim. Silakan lanjutkan dari email atau WhatsApp yang terbuka.",
          altContact: "Atau kembali ke halaman daftar",
          signupLink: "Kembali ke Sign Up",
          requiredAlert: "Mohon lengkapi semua field wajib terlebih dahulu.",
          noMethodAlert:
            "Metode kontak belum dikonfigurasi. Tambahkan email atau WhatsApp Tetamo terlebih dahulu.",
          subject: "Permintaan Penawaran Developer License - Tetamo",
        }
      : {
          back: "Back to signup",
          eyebrow: "Tetamo Developer License",
          title: "Custom License to Use for Developers",
          subtitle:
            "Tetamo does not offer a standard package for Developers. Developer access is offered through a License to Use arrangement tailored to project needs, business scale, and commercial scope.",
          ctaBoxTitle: "Request a Quotation",
          ctaBoxDesc:
            "Share your project details and send a quotation request. We will review your needs and prepare a suitable licensing proposal.",
          whoTitle: "Best for",
          who1: "Housing and residential developers",
          who2: "Villa, apartment, and mixed-use projects",
          who3: "Project marketing teams and multi-project groups",
          scopeTitle: "What the license can cover",
          scope1: "Project exposure and branded presence on Tetamo",
          scope2: "License-to-use structure with custom commercial terms",
          scope3: "Setup tailored to project scale and business requirements",
          formTitle: "Quotation Request Form",
          formDesc:
            "Share the key details below so we can prepare a relevant quotation.",
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
          propertyType: "Property / Project Type",
          propertyTypePh: "Example: Housing, Villa, Apartment, Commercial",
          unitCount: "Unit Count / Project Scope",
          unitCountPh: "Example: 120 units / 3 projects",
          requirements: "Your Requirements",
          requirementsPh:
            "Tell us what you need from Tetamo, your goals, or any special licensing requirements.",
          timeline: "Preferred Timeline",
          timelinePh: "Example: Launch Q3 2026",
          noteTitle: "Note",
          noteDesc:
            "This page does not activate a self-serve Developer package. All Developer requests are handled through a custom License to Use quotation flow.",
          sendEmail: "Send by Email",
          sendWhatsApp: "Send by WhatsApp",
          success:
            "Your request is ready to send. Please continue in the email or WhatsApp window that opened.",
          altContact: "Or go back to the signup page",
          signupLink: "Back to Sign Up",
          requiredAlert: "Please complete all required fields first.",
          noMethodAlert:
            "No contact method is configured yet. Add Tetamo email or WhatsApp first.",
          subject: "Developer License Quotation Request - Tetamo",
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
        ? "Halo Tetamo, saya ingin meminta penawaran untuk Developer License."
        : "Hello Tetamo, I would like to request a quotation for a Developer License."
    }

${pageText.fullName}: ${form.fullName}
${pageText.companyName}: ${form.companyName}
${pageText.email}: ${form.email}
${pageText.whatsapp}: ${form.whatsapp}
${pageText.projectName}: ${form.projectName}
${pageText.projectLocation}: ${form.projectLocation}
${pageText.propertyType}: ${form.propertyType}
${pageText.unitCount}: ${form.unitCount}
${pageText.timeline}: ${form.timeline}

${pageText.requirements}:
${form.requirements}`.trim();
  }, [form, lang, pageText]);

  const handleSendEmail = () => {
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
  };

  const handleSendWhatsApp = () => {
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
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-2xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm font-medium text-[#1C1C1E] transition hover:bg-[#f8f8f8]"
          >
            <ArrowLeft className="h-4 w-4" />
            {pageText.back}
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-[#e5e5e7] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:rounded-[32px] sm:p-8">
              <div className="inline-flex items-center rounded-full border border-[#e5e5e7] bg-[#fafafa] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6e6e73]">
                {pageText.eyebrow}
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#1C1C1E] sm:text-4xl">
                {pageText.title}
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6e6e73] sm:text-base">
                {pageText.subtitle}
              </p>

              <div className="mt-6 rounded-3xl border border-[#e5e5e7] bg-[#fafafa] p-5">
                <h2 className="text-base font-semibold text-[#1C1C1E]">
                  {pageText.ctaBoxTitle}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#6e6e73]">
                  {pageText.ctaBoxDesc}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <InfoCard
                icon={<Building2 className="h-5 w-5 text-[#1C1C1E]" />}
                title={pageText.whoTitle}
                desc={`• ${pageText.who1}\n• ${pageText.who2}\n• ${pageText.who3}`}
              />
              <InfoCard
                icon={<ShieldCheck className="h-5 w-5 text-[#1C1C1E]" />}
                title={pageText.scopeTitle}
                desc={`• ${pageText.scope1}\n• ${pageText.scope2}\n• ${pageText.scope3}`}
              />
            </div>

            <div className="rounded-[28px] border border-[#e5e5e7] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:rounded-[32px] sm:p-8">
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
                <p className="mt-4 text-sm leading-6 text-[#166534]">
                  {pageText.success}
                </p>
              ) : null}

              <p className="mt-5 text-sm leading-6 text-[#6e6e73]">
                {pageText.altContact}{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-[#1C1C1E] underline underline-offset-4"
                >
                  {pageText.signupLink}
                </Link>
              </p>
            </div>
          </div>

          <div className="h-fit rounded-[28px] border border-[#e5e5e7] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:rounded-[32px] sm:p-8">
            <div className="rounded-3xl border border-[#e5e5e7] bg-[#fafafa] p-5">
              <div className="mb-3 inline-flex rounded-2xl border border-[#e5e5e7] bg-white p-2.5">
                <BriefcaseBusiness className="h-5 w-5 text-[#1C1C1E]" />
              </div>
              <h2 className="text-lg font-semibold text-[#1C1C1E]">
                {lang === "id"
                  ? "Mengapa bukan paket standar?"
                  : "Why not a standard package?"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#6e6e73]">
                {lang === "id"
                  ? "Kebutuhan Developer biasanya berbeda dari Owner dan Agent. Karena itu, Tetamo menanganinya melalui penawaran khusus License to Use agar struktur komersial, eksposur proyek, dan ruang lingkup kerja sama dapat disesuaikan."
                  : "Developer needs are usually different from Owner and Agent flows. Tetamo handles them through a custom License to Use quotation so the commercial structure, project exposure, and scope of collaboration can be tailored properly."}
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {[
                lang === "id"
                  ? "Pendekatan yang lebih cocok untuk proyek developer"
                  : "A better fit for developer-scale projects",
                lang === "id"
                  ? "Diskusi komersial yang lebih fleksibel"
                  : "More flexible commercial discussion",
                lang === "id"
                  ? "Lebih jelas daripada memaksakan paket self-serve"
                  : "Clearer than forcing a self-serve package",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-[#e5e5e7] bg-white px-4 py-3 text-sm text-[#1C1C1E]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}