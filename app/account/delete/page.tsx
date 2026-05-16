"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Mail,
  ShieldCheck,
  Trash2,
} from "lucide-react";

type Language = "en" | "id";

const SUPPORT_EMAIL = "support@tetamo.com";

export default function AccountDeletePage() {
  const [language, setLanguage] = useState<Language>("en");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [reason, setReason] = useState("");

  const isId = language === "id";

  const t = useMemo(() => {
    if (isId) {
      return {
        badge: "AKUN TETAMO",
        title: "Permintaan Penghapusan Akun",
        subtitle:
          "Gunakan halaman ini untuk meminta penghapusan akun Tetamo dan data pribadi Anda. Halaman ini tersedia untuk pengguna aplikasi mobile dan website.",
        noticeTitle: "Sebelum mengirim permintaan",
        noticeText:
          "Beberapa data seperti riwayat pembayaran, invoice, receipt, catatan transaksi, atau data yang diwajibkan hukum dapat tetap disimpan untuk kebutuhan legal, keamanan, dan akuntansi.",
        formTitle: "Kirim Permintaan",
        fullName: "Nama Lengkap",
        email: "Email Akun Tetamo",
        role: "Role Akun",
        reason: "Alasan Penghapusan",
        fullNamePlaceholder: "Nama lengkap Anda",
        emailPlaceholder: "emailanda@email.com",
        rolePlaceholder: "Owner / Agent / Developer / User",
        reasonPlaceholder:
          "Ceritakan alasan Anda ingin menghapus akun. Ini opsional, tetapi membantu kami memperbaiki Tetamo.",
        button: "Kirim Permintaan via Email",
        support: "Email Support",
        whatHappens: "Apa yang akan terjadi setelah permintaan dikirim?",
        points: [
          "Tim Tetamo akan meninjau permintaan penghapusan akun Anda.",
          "Kami dapat meminta verifikasi tambahan untuk memastikan bahwa permintaan benar berasal dari pemilik akun.",
          "Data profil dapat dihapus atau dianonimkan setelah proses review.",
          "Listing aktif dapat dinonaktifkan atau dihapus sesuai status akun.",
          "Catatan transaksi, invoice, receipt, dan data legal dapat tetap disimpan jika diperlukan oleh hukum.",
        ],
        privacy: "Lihat Kebijakan Privasi",
        privacyUrl: "https://www.tetamo.com/kebijakan-privasi",
      };
    }

    return {
      badge: "TETAMO ACCOUNT",
      title: "Account Deletion Request",
      subtitle:
        "Use this page to request deletion of your Tetamo account and personal data. This page is available for mobile app and website users.",
      noticeTitle: "Before sending your request",
      noticeText:
        "Some records such as payment history, invoices, receipts, transaction records, or data required by law may be retained for legal, security, and accounting purposes.",
      formTitle: "Submit Request",
      fullName: "Full Name",
      email: "Tetamo Account Email",
      role: "Account Role",
      reason: "Reason for Deletion",
      fullNamePlaceholder: "Your full name",
      emailPlaceholder: "your@email.com",
      rolePlaceholder: "Owner / Agent / Developer / User",
      reasonPlaceholder:
        "Tell us why you want to delete your account. This is optional, but it helps us improve Tetamo.",
      button: "Send Request by Email",
      support: "Support Email",
      whatHappens: "What happens after the request is sent?",
      points: [
        "The Tetamo team will review your account deletion request.",
        "We may ask for additional verification to confirm the request is from the account owner.",
        "Profile data may be deleted or anonymized after review.",
        "Active listings may be deactivated or removed based on account status.",
        "Transaction records, invoices, receipts, and legal data may be retained where required by law.",
      ],
      privacy: "View Privacy Policy",
      privacyUrl: "https://www.tetamo.com/kebijakan-privasi",
    };
  }, [isId]);

  function buildMailto() {
    const subject = encodeURIComponent("Tetamo Account Deletion Request");

    const body = encodeURIComponent(
      [
        isId ? "Halo Tetamo Support," : "Hello Tetamo Support,",
        "",
        isId
          ? "Saya ingin mengajukan penghapusan akun Tetamo saya."
          : "I would like to request deletion of my Tetamo account.",
        "",
        `Full Name: ${fullName.trim() || "-"}`,
        `Account Email: ${email.trim() || "-"}`,
        `Account Role: ${role.trim() || "-"}`,
        "",
        `Reason:`,
        reason.trim() || "-",
        "",
        isId
          ? "Saya memahami bahwa beberapa catatan transaksi, invoice, receipt, atau data legal dapat tetap disimpan jika diwajibkan hukum."
          : "I understand that some transaction records, invoices, receipts, or legal data may be retained where required by law.",
      ].join("\n")
    );

    return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  }

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <a
            href="/"
            className="rounded-full border border-[#333] bg-[#101010] px-4 py-2 text-xs font-black text-white"
          >
            Tetamo
          </a>

          <div className="flex overflow-hidden rounded-full border border-[#5b4a24]">
            {(["en", "id"] as Language[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setLanguage(item)}
                className={`px-4 py-2 text-[11px] font-black ${
                  language === item
                    ? "bg-[#e6c15c] text-[#111]"
                    : "bg-transparent text-[#e6c15c]"
                }`}
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <section className="rounded-[30px] border border-[#7f1d1d] bg-[#2a0d0d] p-5 shadow-2xl sm:p-7">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#fecaca] text-[#111]">
            <Trash2 size={28} />
          </div>

          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#fecaca]">
            {t.badge}
          </p>

          <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            {t.title}
          </h1>

          <p className="mt-3 text-sm font-bold leading-6 text-[#fecaca]">
            {t.subtitle}
          </p>
        </section>

        <section className="mt-4 rounded-[24px] border border-[#705d2c] bg-[#211a0b] p-4 sm:p-5">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-[#e6c15c]" size={21} />

            <div>
              <h2 className="text-sm font-black text-white">{t.noticeTitle}</h2>
              <p className="mt-1 text-xs font-bold leading-5 text-[#f5e6b7]">
                {t.noticeText}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-[26px] border border-[#303030] bg-[#101010] p-4 sm:p-5">
          <h2 className="text-base font-black text-white">{t.formTitle}</h2>

          <div className="mt-4 grid gap-3">
            <FormInput
              label={t.fullName}
              value={fullName}
              onChange={setFullName}
              placeholder={t.fullNamePlaceholder}
            />

            <FormInput
              label={t.email}
              value={email}
              onChange={setEmail}
              placeholder={t.emailPlaceholder}
              type="email"
            />

            <FormInput
              label={t.role}
              value={role}
              onChange={setRole}
              placeholder={t.rolePlaceholder}
            />

            <div>
              <label className="mb-2 block text-xs font-black text-white">
                {t.reason}
              </label>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={t.reasonPlaceholder}
                rows={5}
                className="w-full resize-y rounded-[18px] border border-[#303030] bg-[#050505] px-4 py-3 text-sm font-bold leading-6 text-white outline-none placeholder:text-[#777] focus:border-[#705d2c]"
              />
            </div>
          </div>

          <a
            href={buildMailto()}
            className="mt-5 flex min-h-[52px] items-center justify-center gap-2 rounded-[18px] bg-[#991b1b] px-4 text-sm font-black text-white"
          >
            <Mail size={17} />
            {t.button}
          </a>

          <p className="mt-3 break-all text-center text-xs font-bold text-[#a9a9a9]">
            {t.support}: {SUPPORT_EMAIL}
          </p>
        </section>

        <section className="mt-4 rounded-[26px] border border-[#303030] bg-[#101010] p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-[#705d2c] bg-[#211a0b]">
              <ShieldCheck className="text-[#e6c15c]" size={21} />
            </div>
            <h2 className="text-base font-black text-white">{t.whatHappens}</h2>
          </div>

          <div className="space-y-3">
            {t.points.map((point) => (
              <div key={point} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 shrink-0 text-[#22c55e]" size={17} />
                <p className="text-xs font-bold leading-5 text-[#d6d6d6]">
                  {point}
                </p>
              </div>
            ))}
          </div>

          <a
            href={t.privacyUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 flex min-h-[48px] items-center justify-center gap-2 rounded-[17px] border border-[#343434] bg-[#050505] px-4 text-sm font-black text-white"
          >
            <ExternalLink size={16} />
            {t.privacy}
          </a>
        </section>
      </div>
    </main>
  );
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black text-white">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        className="min-h-[50px] w-full rounded-[18px] border border-[#303030] bg-[#050505] px-4 text-sm font-bold text-white outline-none placeholder:text-[#777] focus:border-[#705d2c]"
      />
    </div>
  );
}