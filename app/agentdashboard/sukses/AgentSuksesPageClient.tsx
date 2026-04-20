"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Home, PlusCircle } from "lucide-react";
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
      ? "Listing Berhasil Dikirim"
      : "Listing Submitted Successfully"
    : isEditListing
    ? lang === "id"
      ? "Perubahan Listing Berhasil Dikirim"
      : "Listing Update Submitted Successfully"
    : lang === "id"
    ? "Berhasil"
    : "Success";

  const description = isSubmittedForApproval
    ? lang === "id"
      ? "Listing Anda telah dikirim dan dapat tampil di marketplace dengan badge Menunggu Verifikasi."
      : "Your listing has been submitted and can appear in the marketplace with a Pending Verification badge."
    : isEditListing
    ? lang === "id"
      ? "Perubahan listing Anda telah dikirim dan dapat tampil dengan status menunggu review admin."
      : "Your listing update has been submitted and can appear with a pending admin review status."
    : lang === "id"
    ? "Aksi Anda telah berhasil diselesaikan."
    : "Your action has been completed successfully.";

  const helperText =
    isSubmittedForApproval || isEditListing
      ? lang === "id"
        ? "Setelah admin menyetujui listing ini, status verifikasi akan diperbarui. Sampai saat itu, listing tetap ditandai sebagai Menunggu Verifikasi agar viewer tahu statusnya masih dalam proses review."
        : "After admin approval, the verification status will be updated. Until then, the listing remains marked as Pending Verification so viewers know it is still under review."
      : "";

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
        <div className="w-full rounded-3xl border border-gray-200 bg-white p-5 text-center shadow-sm sm:p-8 md:p-10">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <h1 className="text-2xl font-bold text-[#1C1C1E] sm:text-3xl">
            {title}
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base sm:leading-7">
            {description}
          </p>

          {helperText ? (
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-500">
              {helperText}
            </p>
          ) : null}

          {kode ? (
            <div className="mx-auto mt-6 max-w-md rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4">
              <p className="text-sm text-gray-500">
                {lang === "id" ? "Kode Listing" : "Listing Code"}
              </p>
              <p className="mt-1 break-all text-lg font-semibold text-[#1C1C1E]">
                {kode}
              </p>
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => router.push("/agentdashboard/listing-saya")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1C1C1E] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 sm:w-auto"
            >
              <Home className="h-4 w-4" />
              {lang === "id" ? "Lihat Listing Saya" : "View My Listings"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/agentdashboard/propertilokasi")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-[#1C1C1E] transition hover:bg-gray-50 sm:w-auto"
            >
              <PlusCircle className="h-4 w-4" />
              {lang === "id" ? "Buat Listing Lagi" : "Create Another Listing"}
            </button>
          </div>

          <p className="mt-5 text-xs leading-5 text-gray-400">
            {lang === "id"
              ? "Jika limit listing Anda sudah penuh, tombol Buat Listing Lagi akan diarahkan ke pengecekan paket agen."
              : "If your listing limit is full, Create Another Listing will go through the agent package check."}
          </p>
        </div>
      </div>
    </main>
  );
}