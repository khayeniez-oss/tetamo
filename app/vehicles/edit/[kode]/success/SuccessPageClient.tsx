"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/app/context/LanguageContext";
import { useVehicleEditDraftListing } from "../layout";

function getMarketplaceHref(vehicleType: string) {
  return String(vehicleType || "").toLowerCase() === "motor"
    ? "/vehicles/motor"
    : "/vehicles/car";
}

export default function SuccessPageClient() {
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  const { draft, kode } = useVehicleEditDraftListing();

  const currentLang: "id" | "en" = lang === "en" ? "en" : "id";

  const status = String(searchParams.get("status") || "").toLowerCase();
  const vehicleTypeFromUrl = String(
    searchParams.get("vehicleType") || ""
  ).toLowerCase();
  const kodeFromUrl = String(searchParams.get("kode") || "").trim();

  const vehicleType =
    vehicleTypeFromUrl ||
    String(draft?.vehicleType || "").toLowerCase() ||
    "car";

  const finalKode = kodeFromUrl || String(draft?.kode || "").trim() || kode || "-";

  const marketplaceHref = useMemo(
    () => getMarketplaceHref(vehicleType),
    [vehicleType]
  );

  const t =
    currentLang === "id"
      ? {
          title:
            status === "pending-approval"
              ? "Dikirim untuk Approval"
              : "Perubahan Berhasil Disimpan",
          description:
            status === "pending-approval"
              ? finalKode && finalKode !== "-"
                ? `Perubahan untuk listing kendaraan ${finalKode} berhasil dikirim dan sekarang menunggu review admin.`
                : "Perubahan listing kendaraan berhasil dikirim dan sekarang menunggu review admin."
              : finalKode && finalKode !== "-"
                ? `Perubahan untuk listing kendaraan ${finalKode} berhasil disimpan.`
                : "Perubahan listing kendaraan berhasil disimpan.",
          points:
            status === "pending-approval"
              ? [
                  "Perubahan listing sudah berhasil dikirim",
                  "Status sekarang pending approval",
                  "Setelah direview, listing akan tampil dengan data terbaru",
                ]
              : [
                  "Perubahan listing berhasil disimpan",
                  "Data kendaraan sudah diperbarui",
                  "Anda bisa cek listing dari marketplace atau dashboard",
                ],
          codeLabel: "Kode Listing",
          vehicleTypeLabel: "Tipe Kendaraan",
          car: "Mobil",
          motor: "Motor",
          toOwnerDashboard: "Ke Owner Dashboard",
          toMarketplace: "Ke Marketplace",
          editAnother: "Edit Lagi",
          pendingBadge: "PENDING APPROVAL",
          savedBadge: "UPDATED",
        }
      : {
          title:
            status === "pending-approval"
              ? "Submitted for Approval"
              : "Changes Saved Successfully",
          description:
            status === "pending-approval"
              ? finalKode && finalKode !== "-"
                ? `Changes for vehicle listing ${finalKode} were submitted successfully and are now pending admin review.`
                : "Your vehicle listing changes were submitted successfully and are now pending admin review."
              : finalKode && finalKode !== "-"
                ? `Changes for vehicle listing ${finalKode} were saved successfully.`
                : "Your vehicle listing changes were saved successfully.",
          points:
            status === "pending-approval"
              ? [
                  "Your listing changes were submitted successfully",
                  "The status is now pending approval",
                  "After review, the listing will show the latest data",
                ]
              : [
                  "Your listing changes were saved successfully",
                  "Vehicle data has been updated",
                  "You can review the listing from the marketplace or dashboard",
                ],
          codeLabel: "Listing Code",
          vehicleTypeLabel: "Vehicle Type",
          car: "Car",
          motor: "Motorbike",
          toOwnerDashboard: "To Owner Dashboard",
          toMarketplace: "To Marketplace",
          editAnother: "Edit Again",
          pendingBadge: "PENDING APPROVAL",
          savedBadge: "UPDATED",
        };

  const vehicleLabel = vehicleType === "motor" ? t.motor : t.car;

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-3xl px-4 py-10 text-center sm:px-6 sm:py-14 md:py-16">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-yellow-200 bg-yellow-50 text-2xl font-bold text-yellow-700">
          ✓
        </div>

        <div className="mt-5 flex justify-center">
          <span className="inline-flex items-center rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-[11px] font-semibold text-yellow-700 sm:text-xs">
            {status === "pending-approval" ? t.pendingBadge : t.savedBadge}
          </span>
        </div>

        <h1 className="mt-5 text-2xl font-bold leading-tight text-[#1C1C1E] sm:mt-6 sm:text-3xl md:text-4xl">
          {t.title}
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-600 sm:text-base">
          {t.description}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 text-left sm:mt-8 sm:grid-cols-2 sm:gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">{t.codeLabel}</p>
            <p className="mt-1 break-words text-sm font-semibold text-[#1C1C1E] sm:text-base">
              {finalKode}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">{t.vehicleTypeLabel}</p>
            <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
              {vehicleLabel}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-gray-200 bg-gray-50 p-5 text-left sm:mt-8 sm:p-6">
          <div className="text-sm font-semibold text-[#1C1C1E]">
            {currentLang === "id" ? "Detail Status" : "Status Details"}
          </div>

          <ul className="mt-4 space-y-3">
            {t.points.map((point, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-sm leading-6 text-gray-700"
              >
                <span className="text-green-600">✓</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:mt-10 sm:grid-cols-3">
          <Link
            href="/ownerdashboard"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-[#1C1C1E] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            {t.toOwnerDashboard}
          </Link>

          <Link
            href={marketplaceHref}
            className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-200 px-6 py-3 text-sm font-semibold transition hover:bg-gray-50"
          >
            {t.toMarketplace}
          </Link>

          <Link
            href={`/vehicles/edit/${encodeURIComponent(finalKode)}`}
            className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-200 px-6 py-3 text-sm font-semibold transition hover:bg-gray-50"
          >
            {t.editAnother}
          </Link>
        </div>
      </div>
    </main>
  );
}