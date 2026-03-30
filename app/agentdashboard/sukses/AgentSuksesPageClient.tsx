"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/app/context/LanguageContext";

export default function AgentSuksesPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();

  const type = searchParams.get("type");
  const kode = searchParams.get("kode");

  const isSubmittedForApproval = type === "submitted-for-approval";
  const isEditListing = type === "edit-listing";

  const title = isSubmittedForApproval
    ? lang === "id"
      ? "Dikirim untuk Persetujuan"
      : "Submitted for Approval"
    : isEditListing
    ? lang === "id"
      ? "Perubahan Dikirim untuk Persetujuan"
      : "Update Submitted for Approval"
    : lang === "id"
    ? "Berhasil"
    : "Success";

  const description = isSubmittedForApproval
    ? lang === "id"
      ? "Listing Anda telah dikirim dan sekarang menunggu persetujuan admin."
      : "Your listing has been submitted and is now pending admin approval."
    : isEditListing
    ? lang === "id"
      ? "Perubahan listing Anda telah dikirim dan sekarang menunggu persetujuan admin."
      : "Your listing update has been submitted and is now pending admin approval."
    : lang === "id"
    ? "Aksi Anda telah berhasil diselesaikan."
    : "Your action has been completed successfully.";

  const helperText =
    isSubmittedForApproval || isEditListing
      ? lang === "id"
        ? "Listing ini akan muncul sebagai Menunggu Persetujuan di dashboard agent dan di marketplace sampai selesai direview."
        : "This listing will appear as Pending for Approval in your agent dashboard and in the marketplace until it has been reviewed."
      : "";

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-16">
        <div className="w-full rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm md:p-10">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-2xl">
            ✓
          </div>

          <h1 className="text-3xl font-bold text-[#1C1C1E]">{title}</h1>

          <p className="mt-3 text-base text-gray-600">{description}</p>

          {helperText && (
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-500">
              {helperText}
            </p>
          )}

          {kode && (
            <div className="mt-6 rounded-2xl bg-gray-50 px-5 py-4">
              <p className="text-sm text-gray-500">
                {lang === "id" ? "Kode Listing" : "Listing Code"}
              </p>
              <p className="mt-1 text-lg font-semibold text-[#1C1C1E]">
                {kode}
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => router.push("/agentdashboard")}
              className="rounded-2xl bg-[#1C1C1E] px-6 py-3 font-semibold text-white transition hover:opacity-90"
            >
              {lang === "id" ? "Kembali ke Dashboard" : "Back to Dashboard"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/agentdashboard/propertilokasi")}
              className="rounded-2xl border border-gray-200 bg-white px-6 py-3 font-semibold text-[#1C1C1E] transition hover:bg-gray-50"
            >
              {lang === "id"
                ? "Buat Listing Lagi"
                : "Create Another Listing"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}