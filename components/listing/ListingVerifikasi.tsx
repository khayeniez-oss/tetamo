"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/app/context/LanguageContext";

type VerificationDraft = {
  relationship?: "pemilik" | "keluarga" | "kuasa" | "lainnya" | "";
  otherRelationship?: string;

  sellMode?: "jual_sendiri" | "pakai_agen" | "";
  needAgentRecommendation?: "ya" | "tidak" | "";
  needTransactionSupport?: "ya" | "tidak" | "";

  note?: string;

  ownershipPdfName?: string;
  authorizationPdfName?: string;

  status?: "pending_verification" | "verified" | "rejected";
};

type Props = {
  draft: any;
  setDraft: (fn: any) => void;
  onBack: () => void;
  onNextCreate: () => void;
  onNextEdit: () => void;
};

export default function ListingVerifikasi({
  draft,
  setDraft,
  onBack,
  onNextCreate,
  onNextEdit,
}: Props) {
  const { lang } = useLanguage();

  const t =
    lang === "id"
      ? {
          back: "Kembali",
          pageTitle: "Step 4 • Konfirmasi Kepemilikan",
          subtitle:
            "Untuk menjaga platform tetap premium & terpercaya, kami minta konfirmasi hubungan Anda dengan properti + pilihan bantuan profesional. (Upload PDF masih dummy di V1 UI.)",

          relationshipTitle: "Hubungan dengan Properti",
          relationshipOwner: "Saya pemilik",
          relationshipFamily: "Saya keluarga pemilik",
          relationshipProxy: "Saya pegang surat kuasa",
          relationshipOther: "Lainnya",
          relationshipOtherPlaceholder: "Jelaskan hubungan Anda...",

          sellModeTitle: "Cara Anda ingin menjual/menyewakan",
          sellMyself: "Saya ingin jual sendiri (platform only)",
          sellMyselfDesc:
            "Anda handle komunikasi & negosiasi sendiri. Tetamo bantu exposure + trust layer.",
          useAgent: "Saya ingin pakai agen",
          useAgentDesc:
            "Untuk bantu nego, dokumen, jadwal viewing, & proses closing.",

          needAgentTitle:
            "Apakah Anda butuh TETAMO merekomendasikan agen di area Anda?",
          needAgentYes: "Ya, rekomendasikan agen",
          needAgentNo: "Tidak, saya sudah punya",

          needSupportTitle:
            "Apakah Anda butuh bantuan transaksi (dokumen, cek legalitas, jadwal, serah terima)?",
          needSupportYes: "Ya, saya butuh bantuan transaksi",
          needSupportNo: "Tidak, saya urus sendiri",
          supportNote:
            "Catatan: Tetamo bisa bekerja dengan agen dari berbagai agency — itu normal & aman, selama verifikasi jelas.",

          ownershipPdfTitle: "Bukti Kepemilikan (PDF)",
          ownershipPdfDesc:
            "Contoh: sertifikat/SHM/HGB, atau dokumen pendukung.",
          authorizationPdfTitle: "Surat Kuasa (PDF) — jika ada",
          authorizationPdfDesc:
            "Jika Anda bukan pemilik langsung / diwakilkan.",
          choosePdf: "Pilih PDF",
          noFileYet: "Belum ada file",

          noteTitle: "Catatan (Opsional)",
          notePlaceholder:
            "Contoh: properti milik orang tua, butuh bantuan agen, jam viewing tertentu, dsb.",

          submitEdit: "Submit untuk Persetujuan",
          continueToPayment: "Lanjut ke pembayaran",
          incompleteNote:
            "Lengkapi pilihan wajib (hubungan + mode jual + rekomendasi agen + bantuan transaksi).",
        }
      : {
          back: "Back",
          pageTitle: "Step 4 • Ownership Confirmation",
          subtitle:
            "To keep the platform premium and trusted, we ask you to confirm your relationship to the property and your professional support preferences. (PDF upload is still dummy in V1 UI.)",

          relationshipTitle: "Relationship to the Property",
          relationshipOwner: "I am the owner",
          relationshipFamily: "I am a family member of the owner",
          relationshipProxy: "I hold a power of attorney",
          relationshipOther: "Other",
          relationshipOtherPlaceholder: "Explain your relationship...",

          sellModeTitle: "How you want to sell/rent the property",
          sellMyself: "I want to sell by myself (platform only)",
          sellMyselfDesc:
            "You handle communication and negotiation yourself. Tetamo helps with exposure and trust layer.",
          useAgent: "I want to use an agent",
          useAgentDesc:
            "For negotiation, documents, viewing schedule, and closing process support.",

          needAgentTitle:
            "Do you need TETAMO to recommend an agent in your area?",
          needAgentYes: "Yes, recommend an agent",
          needAgentNo: "No, I already have one",

          needSupportTitle:
            "Do you need transaction support (documents, legal checks, scheduling, handover)?",
          needSupportYes: "Yes, I need transaction support",
          needSupportNo: "No, I will handle it myself",
          supportNote:
            "Note: Tetamo can work with agents from different agencies — that is normal and safe, as long as verification is clear.",

          ownershipPdfTitle: "Proof of Ownership (PDF)",
          ownershipPdfDesc:
            "Example: certificate/SHM/HGB or supporting documents.",
          authorizationPdfTitle: "Power of Attorney (PDF) — if any",
          authorizationPdfDesc:
            "If you are not the direct owner / acting on behalf of the owner.",
          choosePdf: "Choose PDF",
          noFileYet: "No file yet",

          noteTitle: "Note (Optional)",
          notePlaceholder:
            "Example: property belongs to parents, needs agent help, preferred viewing hours, etc.",

          submitEdit: "Submit for Approval",
          continueToPayment: "Continue to Payment",
          incompleteNote:
            "Complete all required choices (relationship + selling mode + agent recommendation + transaction support).",
        };

  const mode: "create" | "edit" =
    (draft as any)?.mode === "edit" ? "edit" : "create";

  const initial = ((draft?.verification || {}) as VerificationDraft) ?? {};

  const [relationship, setRelationship] = useState<VerificationDraft["relationship"]>(
    initial.relationship ?? ""
  );
  const [otherRelationship, setOtherRelationship] = useState<string>(
    initial.otherRelationship ?? ""
  );

  const [sellMode, setSellMode] = useState<VerificationDraft["sellMode"]>(
    initial.sellMode ?? "jual_sendiri"
  );

  const [needAgentRecommendation, setNeedAgentRecommendation] =
    useState<VerificationDraft["needAgentRecommendation"]>(
      initial.needAgentRecommendation ?? ""
    );

  const [needTransactionSupport, setNeedTransactionSupport] =
    useState<VerificationDraft["needTransactionSupport"]>(
      initial.needTransactionSupport ?? ""
    );

  const [note, setNote] = useState<string>(initial.note ?? "");

  const [ownershipPdfName, setOwnershipPdfName] = useState<string>(
    initial.ownershipPdfName ?? ""
  );
  const [authorizationPdfName, setAuthorizationPdfName] = useState<string>(
    initial.authorizationPdfName ?? ""
  );

  const ownershipRef = useRef<HTMLInputElement | null>(null);
  const authorizationRef = useRef<HTMLInputElement | null>(null);

  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    if (!draft) return;

    const v = (draft as any)?.verification ?? {};
    setRelationship(v.relationship ?? "");
    setOtherRelationship(v.otherRelationship ?? "");
    setSellMode(v.sellMode ?? "jual_sendiri");
    setNeedAgentRecommendation(v.needAgentRecommendation ?? "");
    setNeedTransactionSupport(v.needTransactionSupport ?? "");
    setNote(v.note ?? "");
    setOwnershipPdfName(v.ownershipPdfName ?? "");
    setAuthorizationPdfName(v.authorizationPdfName ?? "");

    hydratedRef.current = true;
  }, [draft]);

  useEffect(() => {
    if (!hydratedRef.current) return;

    setDraft((prev: any) => ({
      ...(prev || {}),
      verification: {
        relationship,
        otherRelationship,
        sellMode,
        needAgentRecommendation,
        needTransactionSupport,
        note,
        ownershipPdfName,
        authorizationPdfName,
        status: "pending_verification",
      } satisfies VerificationDraft,
    }));
  }, [
    relationship,
    otherRelationship,
    sellMode,
    needAgentRecommendation,
    needTransactionSupport,
    note,
    ownershipPdfName,
    authorizationPdfName,
    setDraft,
  ]);

  const canSubmit = useMemo(() => {
    if (!relationship) return false;
    if (relationship === "lainnya" && otherRelationship.trim().length < 2) return false;
    if (!sellMode) return false;
    if (!needAgentRecommendation) return false;
    if (!needTransactionSupport) return false;
    return true;
  }, [
    relationship,
    otherRelationship,
    sellMode,
    needAgentRecommendation,
    needTransactionSupport,
  ]);

  function handleNext() {
    if (!canSubmit) return;

    setDraft((prev: any) => ({
      ...(prev || {}),
      verifiedOk: true,
    }));

    if (mode === "edit") {
      onNextEdit();
      return;
    }

    onNextCreate();
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-gray-700 transition hover:text-[#1C1C1E]"
        >
          ← {t.back}
        </button>

        <h1 className="mt-4 text-xl font-bold leading-tight text-[#1C1C1E] sm:text-2xl lg:text-3xl">
          {t.pageTitle}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          {t.subtitle}
        </p>

        <div className="h-6 sm:h-8 md:h-10" />

        <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:mt-8 sm:p-5 md:p-6">
          <div>
            <div className="text-sm font-semibold text-[#1C1C1E]">
              {t.relationshipTitle} <span className="text-red-600">*</span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { key: "pemilik", label: t.relationshipOwner },
                { key: "keluarga", label: t.relationshipFamily },
                { key: "kuasa", label: t.relationshipProxy },
                { key: "lainnya", label: t.relationshipOther },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setRelationship(opt.key as any)}
                  className={[
                    "rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition",
                    relationship === opt.key
                      ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                      : "border-gray-200 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {relationship === "lainnya" && (
              <input
                value={otherRelationship}
                onChange={(e) => setOtherRelationship(e.target.value)}
                placeholder={t.relationshipOtherPlaceholder}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] focus:ring-0"
              />
            )}
          </div>

          <div className="mt-8">
            <div className="text-sm font-semibold text-[#1C1C1E]">
              {t.sellModeTitle} <span className="text-red-600">*</span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setSellMode("jual_sendiri")}
                className={[
                  "rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition",
                  sellMode === "jual_sendiri"
                    ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                    : "border-gray-200 hover:bg-gray-50",
                ].join(" ")}
              >
                {t.sellMyself}
                <div className="mt-1 text-xs font-normal leading-5 opacity-80">
                  {t.sellMyselfDesc}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSellMode("pakai_agen")}
                className={[
                  "rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition",
                  sellMode === "pakai_agen"
                    ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                    : "border-gray-200 hover:bg-gray-50",
                ].join(" ")}
              >
                {t.useAgent}
                <div className="mt-1 text-xs font-normal leading-5 opacity-80">
                  {t.useAgentDesc}
                </div>
              </button>
            </div>
          </div>

          <div className="mt-8">
            <div className="text-sm font-semibold text-[#1C1C1E]">
              {t.needAgentTitle} <span className="text-red-600">*</span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { key: "ya", label: t.needAgentYes },
                { key: "tidak", label: t.needAgentNo },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setNeedAgentRecommendation(opt.key as any)}
                  className={[
                    "rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition",
                    needAgentRecommendation === opt.key
                      ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                      : "border-gray-200 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <div className="text-sm font-semibold text-[#1C1C1E]">
              {t.needSupportTitle} <span className="text-red-600">*</span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { key: "ya", label: t.needSupportYes },
                { key: "tidak", label: t.needSupportNo },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setNeedTransactionSupport(opt.key as any)}
                  className={[
                    "rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition",
                    needTransactionSupport === opt.key
                      ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                      : "border-gray-200 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="mt-2 text-xs leading-5 text-gray-500">
              {t.supportNote}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-2xl border border-gray-200 p-3 sm:p-4">
              <div className="text-sm font-semibold text-[#1C1C1E]">
                {t.ownershipPdfTitle}
              </div>
              <div className="mt-1 text-xs leading-5 text-gray-500">
                {t.ownershipPdfDesc}
              </div>

              <div className="mt-3 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => ownershipRef.current?.click()}
                  className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-gray-100 px-3 py-2 text-xs font-semibold transition hover:bg-gray-50 sm:px-4 sm:text-sm"
                >
                  {t.choosePdf}
                </button>
                <div className="min-w-0 break-words text-xs text-gray-700 sm:text-sm">
                  {ownershipPdfName ? ownershipPdfName : t.noFileYet}
                </div>
                <input
                  ref={ownershipRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setOwnershipPdfName(f?.name ?? "");
                  }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 p-3 sm:p-4">
              <div className="text-sm font-semibold text-[#1C1C1E]">
                {t.authorizationPdfTitle}
              </div>
              <div className="mt-1 text-xs leading-5 text-gray-500">
                {t.authorizationPdfDesc}
              </div>

              <div className="mt-3 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => authorizationRef.current?.click()}
                  className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-gray-100 px-3 py-2 text-xs font-semibold transition hover:bg-gray-50 sm:px-4 sm:text-sm"
                >
                  {t.choosePdf}
                </button>
                <div className="min-w-0 break-words text-xs text-gray-700 sm:text-sm">
                  {authorizationPdfName ? authorizationPdfName : t.noFileYet}
                </div>
                <input
                  ref={authorizationRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setAuthorizationPdfName(f?.name ?? "");
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="text-sm font-semibold text-[#1C1C1E]">
              {t.noteTitle}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.notePlaceholder}
              className="mt-2 min-h-[120px] w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
            />
          </div>

          <div className="mt-8">
            <button
              type="button"
              onClick={handleNext}
              className={[
                "w-full rounded-2xl px-6 py-3.5 text-sm font-semibold transition",
                canSubmit
                  ? "bg-[#1C1C1E] text-white hover:opacity-90"
                  : "bg-gray-200 text-gray-500",
              ].join(" ")}
            >
              {mode === "edit" ? t.submitEdit : t.continueToPayment}
            </button>

            {!canSubmit && (
              <p className="mt-3 text-xs leading-5 text-gray-500">
                {t.incompleteNote}
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}