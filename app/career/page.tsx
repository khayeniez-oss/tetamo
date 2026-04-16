"use client";

import { useState } from "react";
import { useLanguage } from "@/app/context/LanguageContext";

const inputBase =
  "mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#1C1C1E] outline-none transition focus:border-[#1C1C1E]";

const labelBase = "text-sm font-medium text-[#1C1C1E]";

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  preferredWorkArea: string;
  careerInterest: string;
  experienceLevel: string;
  workBackground: string;
  yearsExperience: string;
  agency: string;
  propertyFocus: string;
  languages: string;
  notes: string;
  agree: boolean;
};

const initialForm: FormState = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  preferredWorkArea: "",
  careerInterest: "",
  experienceLevel: "",
  workBackground: "",
  yearsExperience: "",
  agency: "",
  propertyFocus: "",
  languages: "",
  notes: "",
  agree: false,
};

export default function CareerPage() {
  const { lang } = useLanguage();
  const isID = lang === "id";

  const t = {
    pageTitle: "Career",
    heroTitle: isID
      ? "Bangun Karier Properti Anda Bersama Tetamo"
      : "Build Your Real Estate Career with Tetamo",
    heroDesc: isID
      ? "Isi form di bawah jika Anda ingin menjadi agen properti, sedang mencari peluang kerja sebagai agen, atau ingin Tetamo merekomendasikan Anda ke agency."
      : "Fill out the form below if you want to become a real estate agent, you are an agent looking for a job opportunity, or you want Tetamo to recommend you to an agency.",
    formTitle: isID ? "Form Karier" : "Career Form",
    formDesc: isID
      ? "Lengkapi data Anda agar tim Tetamo bisa memahami background dan tujuan Anda."
      : "Complete your details so the Tetamo team can understand your background and goals.",
    fullName: isID ? "Nama Lengkap" : "Full Name",
    email: "Email",
    phone: isID ? "Nomor WhatsApp / Telepon" : "WhatsApp / Phone Number",
    location: isID ? "Lokasi Anda" : "Your Location",
    preferredWorkArea: isID
      ? "Area / Kota yang Ingin Anda Fokuskan"
      : "Preferred Area / City to Focus On",
    careerInterest: isID ? "Tujuan Anda" : "Your Goal",
    experienceLevel: isID ? "Level Pengalaman" : "Experience Level",
    workBackground: isID ? "Latar Belakang Kerja" : "Work Background",
    yearsExperience: isID ? "Jumlah Tahun Pengalaman" : "Years of Experience",
    agency: isID ? "Agency Sekarang / Sebelumnya" : "Current / Previous Agency",
    propertyFocus: isID ? "Fokus Properti" : "Property Focus",
    languages: isID ? "Bahasa yang Dikuasai" : "Languages Spoken",
    notes: isID ? "Catatan Tambahan" : "Additional Notes",
    agree: isID
      ? "Saya setuju untuk dihubungi oleh tim Tetamo terkait peluang karier atau rekomendasi agency."
      : "I agree to be contacted by the Tetamo team regarding career opportunities or agency recommendations.",
    submit: isID ? "Kirim Aplikasi" : "Submit Application",
    submitting: isID ? "Mengirim..." : "Submitting...",
    success: isID
      ? "Aplikasi Anda sudah berhasil dikirim."
      : "Your application has been submitted successfully.",
    error: isID
      ? "Terjadi kendala saat mengirim aplikasi."
      : "There was a problem submitting your application.",
    required: isID ? "wajib" : "required",
    rightTitle: isID ? "Cocok Untuk" : "Good Fit For",
    rightPoints: isID
      ? [
          "Pemula yang ingin masuk ke dunia agen properti",
          "Agen yang ingin pindah atau cari peluang baru",
          "Agen independen yang ingin diarahkan ke agency",
          "Orang yang ingin dibantu Tetamo untuk langkah berikutnya",
        ]
      : [
          "Beginners who want to enter the real estate agent industry",
          "Agents looking to move or find a new opportunity",
          "Independent agents who want agency recommendations",
          "People who want Tetamo guidance for the next step",
        ],
  };

  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const res = await fetch("/api/career-applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result?.error || t.error);
      }

      setSuccessMessage(t.success);
      setForm(initialForm);
    } catch (error: any) {
      setErrorMessage(error?.message || t.error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-[#1C1C1E]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B8860B]">
            {t.pageTitle}
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t.heroTitle}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600 sm:text-base">
            {t.heroDesc}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-[32px] border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold">{t.formTitle}</h2>
            <p className="mt-2 text-sm text-gray-500">{t.formDesc}</p>

            {successMessage ? (
              <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                {successMessage}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className={labelBase}>
                    {t.fullName} <span className="text-red-500">({t.required})</span>
                  </label>
                  <input
                    className={inputBase}
                    value={form.fullName}
                    onChange={(e) => updateField("fullName", e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className={labelBase}>{t.email}</label>
                  <input
                    type="email"
                    className={inputBase}
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                  />
                </div>

                <div>
                  <label className={labelBase}>
                    {t.phone} <span className="text-red-500">({t.required})</span>
                  </label>
                  <input
                    className={inputBase}
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className={labelBase}>{t.location}</label>
                  <input
                    className={inputBase}
                    value={form.location}
                    onChange={(e) => updateField("location", e.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={labelBase}>{t.preferredWorkArea}</label>
                  <input
                    className={inputBase}
                    value={form.preferredWorkArea}
                    onChange={(e) =>
                      updateField("preferredWorkArea", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className={labelBase}>
                    {t.careerInterest} <span className="text-red-500">({t.required})</span>
                  </label>
                  <select
                    className={inputBase}
                    value={form.careerInterest}
                    onChange={(e) => updateField("careerInterest", e.target.value)}
                    required
                  >
                    <option value="">
                      {isID ? "Pilih tujuan Anda" : "Select your goal"}
                    </option>
                    <option value="new_agent">
                      {isID
                        ? "Saya ingin menjadi agen properti"
                        : "I want to become a real estate agent"}
                    </option>
                    <option value="looking_for_job">
                      {isID
                        ? "Saya agen dan sedang mencari pekerjaan"
                        : "I am an agent looking for a job"}
                    </option>
                    <option value="recommend_agency">
                      {isID
                        ? "Saya ingin Tetamo merekomendasikan saya ke agency"
                        : "I want Tetamo to recommend me to an agency"}
                    </option>
                  </select>
                </div>

                <div>
                  <label className={labelBase}>
                    {t.experienceLevel} <span className="text-red-500">({t.required})</span>
                  </label>
                  <select
                    className={inputBase}
                    value={form.experienceLevel}
                    onChange={(e) =>
                      updateField("experienceLevel", e.target.value)
                    }
                    required
                  >
                    <option value="">
                      {isID ? "Pilih level pengalaman" : "Select experience level"}
                    </option>
                    <option value="no_experience">
                      {isID ? "Belum ada pengalaman" : "No experience"}
                    </option>
                    <option value="with_experience">
                      {isID ? "Sudah ada pengalaman" : "With experience"}
                    </option>
                  </select>
                </div>

                <div>
                  <label className={labelBase}>{t.workBackground}</label>
                  <select
                    className={inputBase}
                    value={form.workBackground}
                    onChange={(e) => updateField("workBackground", e.target.value)}
                  >
                    <option value="">
                      {isID ? "Pilih background" : "Select background"}
                    </option>
                    <option value="independent">
                      {isID ? "Independent / freelance" : "Independent / freelance"}
                    </option>
                    <option value="agency">
                      {isID ? "Pernah bekerja dengan agency" : "Worked with an agency before"}
                    </option>
                    <option value="both">
                      {isID ? "Pernah kedua-duanya" : "Both independent and agency"}
                    </option>
                  </select>
                </div>

                <div>
                  <label className={labelBase}>{t.yearsExperience}</label>
                  <input
                    type="number"
                    min="0"
                    className={inputBase}
                    value={form.yearsExperience}
                    onChange={(e) =>
                      updateField("yearsExperience", e.target.value)
                    }
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={labelBase}>{t.agency}</label>
                  <input
                    className={inputBase}
                    value={form.agency}
                    onChange={(e) => updateField("agency", e.target.value)}
                  />
                </div>

                <div>
                  <label className={labelBase}>{t.propertyFocus}</label>
                  <input
                    className={inputBase}
                    value={form.propertyFocus}
                    onChange={(e) => updateField("propertyFocus", e.target.value)}
                  />
                </div>

                <div>
                  <label className={labelBase}>{t.languages}</label>
                  <input
                    className={inputBase}
                    value={form.languages}
                    onChange={(e) => updateField("languages", e.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={labelBase}>{t.notes}</label>
                  <textarea
                    rows={5}
                    className={`${inputBase} resize-none`}
                    value={form.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                  />
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-gray-200 p-4">
                <input
                  type="checkbox"
                  checked={form.agree}
                  onChange={(e) => updateField("agree", e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300"
                  required
                />
                <span className="text-sm leading-6 text-gray-700">{t.agree}</span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-[#1C1C1E] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60 sm:w-auto"
              >
                {submitting ? t.submitting : t.submit}
              </button>
            </form>
          </div>

          <div className="rounded-[32px] border border-gray-200 bg-[#FAFAFA] p-5 shadow-sm sm:p-7">
            <h3 className="text-lg font-bold">{t.rightTitle}</h3>

            <div className="mt-4 space-y-3">
              {t.rightPoints.map((point) => (
                <div
                  key={point}
                  className="rounded-2xl border border-gray-200 bg-white p-4 text-sm leading-6 text-gray-700"
                >
                  {point}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}