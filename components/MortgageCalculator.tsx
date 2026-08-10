"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/app/context/LanguageContext";
import {
  Calculator,
  RotateCcw,
  Landmark,
  Percent,
  CalendarDays,
  Home,
} from "lucide-react";

type MortgageCalculatorProps = {
  price: string | number;
  jenisListing: "dijual" | "disewa" | "lelang";
};

type BankPreset = {
  label: string;
  rate: number;
};

function parsePriceToNumber(value: string | number) {
  if (typeof value === "number") return value;
  return Number(String(value).replace(/[^\d]/g, "")) || 0;
}

function formatIDR(value: number) {
  return new Intl.NumberFormat("id-ID").format(Math.round(value));
}

export default function MortgageCalculator({
  price,
  jenisListing,
}: MortgageCalculatorProps) {
  const { lang } = useLanguage();

  const t =
    lang === "id"
      ? {
          eyebrow: "Pembiayaan",
          title: "Simulasi KPR",
          subtitle:
            "Hitung estimasi cicilan berdasarkan harga properti, DP, suku bunga, dan tenor pilihan Anda.",
          reset: "Reset",
          bankPreset: "Pilih Bank / Preset Bunga",
          propertyPrice: "Harga Properti",
          dp: "DP",
          interestRate: "Suku Bunga",
          interestSuffix: "% per tahun",
          tenure: "Tenor",
          years: "Tahun",
          custom: "Kustom",
          downPayment: "Down Payment",
          estimatedLoan: "Estimasi Pinjaman",
          estimatedMonthlyInstallment: "Estimasi Cicilan / Bulan",
          summary: "Ringkasan Simulasi",
          disclaimerTitle: "Catatan",
          disclaimer:
            "KPR ini hanya bersifat estimasi dan bukan penawaran resmi dari bank atau lembaga pembiayaan. Nilai cicilan sebenarnya dapat berbeda tergantung kebijakan bank, profil kredit peminjam, serta biaya tambahan seperti asuransi dan administrasi.",
          auctionNote:
            "Catatan untuk properti lelang: pembiayaan tergantung kebijakan bank, status legal properti, dan hasil verifikasi dokumen.",
        }
      : {
          eyebrow: "Financing Simulation",
          title: "Mortgage Calculator",
          subtitle:
            "Estimate your monthly payment based on the property price, down payment, interest rate, and preferred loan tenure.",
          reset: "Reset",
          bankPreset: "Choose Bank / Interest Preset",
          propertyPrice: "Property Price",
          dp: "Down Payment",
          interestRate: "Interest Rate",
          interestSuffix: "% per year",
          tenure: "Tenure",
          years: "Years",
          custom: "Custom",
          downPayment: "Down Payment",
          estimatedLoan: "Estimated Loan",
          estimatedMonthlyInstallment: "Estimated Monthly Installment",
          summary: "Simulation Summary",
          disclaimerTitle: "Important Note",
          disclaimer:
            "This mortgage is only an estimate and not an official offer from any bank or financing institution. The actual installment amount may vary depending on bank policy, the borrower's credit profile, and additional costs such as insurance and administration fees.",
          auctionNote:
            "Note for auction properties: financing depends on bank policy, the property's legal status, and document verification results.",
        };

  const BANK_PRESETS: BankPreset[] = [
    { label: "BCA", rate: 5.5 },
    { label: "Mandiri", rate: 5.75 },
    { label: "BNI", rate: 6 },
    { label: t.custom, rate: -1 },
  ];

  const propertyPrice = parsePriceToNumber(price);

  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [interestRate, setInterestRate] = useState(6);
  const [tenureYears, setTenureYears] = useState(20);
  const [selectedBank, setSelectedBank] = useState(t.custom);

  const result = useMemo(() => {
    const dpAmount = propertyPrice * (downPaymentPercent / 100);
    const loanAmount = propertyPrice - dpAmount;

    const monthlyRate = interestRate / 100 / 12;
    const totalMonths = tenureYears * 12;

    let monthlyInstallment = 0;

    if (monthlyRate === 0) {
      monthlyInstallment =
        totalMonths > 0 ? loanAmount / totalMonths : 0;
    } else {
      monthlyInstallment =
        (loanAmount * monthlyRate) /
        (1 - Math.pow(1 + monthlyRate, -totalMonths));
    }

    return {
      dpAmount,
      loanAmount,
      monthlyInstallment,
    };
  }, [
    propertyPrice,
    downPaymentPercent,
    interestRate,
    tenureYears,
  ]);

  function handleBankPreset(label: string, rate: number) {
    setSelectedBank(label);

    if (rate >= 0) {
      setInterestRate(rate);
    }
  }

  function resetCalculator() {
    setDownPaymentPercent(20);
    setInterestRate(6);
    setTenureYears(20);
    setSelectedBank(t.custom);
  }

  /* ========================================
      ONLY SHOW FOR SALE / AUCTION
  ======================================== */
  if (jenisListing !== "dijual" && jenisListing !== "lelang") {
    return null;
  }

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-[#E8E2D8] bg-[#F8F6F1] shadow-[0_18px_60px_rgba(0,0,0,0.06)]">

      {/* BACKGROUND DECORATION */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#D8B46A]/15 blur-[90px]" />

      <div className="relative z-10 p-5 sm:p-7 lg:p-8">

        {/* =====================================
            HEADER
        ===================================== */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

          <div className="max-w-2xl">

            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1C1C1E] text-[#D8B46A] shadow-sm">
                <Calculator className="h-4.5 w-4.5" />
              </span>

              <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#B8860B]">
                {t.eyebrow}
              </p>
            </div>

            <h2 className="mt-4 text-2xl font-extrabold tracking-[-0.03em] text-[#1C1C1E] sm:text-[30px]">
              {t.title}
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
              {t.subtitle}
            </p>

          </div>


          <button
            type="button"
            onClick={resetCalculator}
            className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-[#DDD5C7] bg-white px-4 py-2.5 text-xs font-bold text-[#1C1C1E] transition hover:border-[#B8860B] hover:text-[#B8860B]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t.reset}
          </button>

        </div>


        {/* =====================================
            MAIN CALCULATOR
        ===================================== */}
        <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(330px,0.85fr)]">

          {/* =================================
              LEFT — CONTROLS
          ================================= */}
          <div className="rounded-[26px] border border-[#E5DFD4] bg-white p-5 sm:p-6">

            {/* BANK PRESETS */}
            <div>

              <div className="flex items-center gap-2 text-[#1C1C1E]">
                <Landmark className="h-4 w-4 text-[#B8860B]" />

                <label className="text-xs font-extrabold uppercase tracking-[0.08em]">
                  {t.bankPreset}
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">

                {BANK_PRESETS.map((bank) => (
                  <button
                    key={bank.label}
                    type="button"
                    onClick={() =>
                      handleBankPreset(
                        bank.label,
                        bank.rate
                      )
                    }
                    className={[
                      "rounded-full border px-4 py-2.5 text-xs font-bold transition sm:text-sm",
                      selectedBank === bank.label
                        ? "border-[#1C1C1E] bg-[#1C1C1E] text-white shadow-sm"
                        : "border-[#E3DCCE] bg-[#F8F6F1] text-[#1C1C1E] hover:border-[#B8860B] hover:bg-white",
                    ].join(" ")}
                  >
                    {bank.label}

                    {bank.rate >= 0
                      ? ` · ${bank.rate}%`
                      : ""}
                  </button>
                ))}

              </div>

            </div>


            {/* PROPERTY PRICE */}
            <div className="mt-6">

              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-[#B8860B]" />

                <label className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#1C1C1E]">
                  {t.propertyPrice}
                </label>
              </div>

              <div className="mt-3 rounded-[18px] border border-[#E5DFD4] bg-[#F8F6F1] px-4 py-4">

                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                  IDR
                </p>

                <p className="mt-1 text-lg font-extrabold tracking-[-0.02em] text-[#1C1C1E] sm:text-xl">
                  Rp {formatIDR(propertyPrice)}
                </p>

              </div>

            </div>


            {/* DP */}
            <div className="mt-6 rounded-[20px] border border-[#EAE4D9] bg-[#FCFBF8] p-4">

              <div className="flex items-center justify-between gap-4">

                <label className="text-sm font-bold text-[#1C1C1E]">
                  {t.dp}
                </label>

                <span className="rounded-full bg-[#F8F2E5] px-3 py-1.5 text-xs font-extrabold text-[#8A650B]">
                  {downPaymentPercent}%
                </span>

              </div>

              <input
                type="range"
                min={0}
                max={90}
                step={1}
                value={downPaymentPercent}
                onChange={(e) =>
                  setDownPaymentPercent(
                    Number(e.target.value)
                  )
                }
                className="mt-4 w-full cursor-pointer accent-[#B8860B]"
              />

              <div className="mt-3 flex items-center justify-between gap-4">

                <span className="text-xs text-gray-400">
                  0%
                </span>

                <span className="text-sm font-extrabold text-[#1C1C1E]">
                  Rp {formatIDR(result.dpAmount)}
                </span>

                <span className="text-xs text-gray-400">
                  90%
                </span>

              </div>

            </div>


            {/* RATE + TENURE */}
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">

              {/* INTEREST */}
              <div>

                <div className="flex items-center gap-2">

                  <Percent className="h-4 w-4 text-[#B8860B]" />

                  <label className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#1C1C1E]">
                    {t.interestRate}
                  </label>

                </div>

                <div className="relative mt-3">

                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={interestRate}
                    onChange={(e) => {
                      setSelectedBank(t.custom);
                      setInterestRate(
                        Number(e.target.value)
                      );
                    }}
                    className="w-full rounded-[17px] border border-[#E3DCCE] bg-white px-4 py-3.5 pr-14 text-sm font-bold text-[#1C1C1E] outline-none transition focus:border-[#B8860B] focus:ring-2 focus:ring-[#D8B46A]/15"
                  />

                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                    %
                  </span>

                </div>

                <p className="mt-2 text-[10px] text-gray-400">
                  {t.interestSuffix}
                </p>

              </div>


              {/* TENURE */}
              <div>

                <div className="flex items-center gap-2">

                  <CalendarDays className="h-4 w-4 text-[#B8860B]" />

                  <label className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#1C1C1E]">
                    {t.tenure}
                  </label>

                </div>

                <select
                  value={tenureYears}
                  onChange={(e) =>
                    setTenureYears(
                      Number(e.target.value)
                    )
                  }
                  className="mt-3 w-full rounded-[17px] border border-[#E3DCCE] bg-white px-4 py-3.5 text-sm font-bold text-[#1C1C1E] outline-none transition focus:border-[#B8860B] focus:ring-2 focus:ring-[#D8B46A]/15"
                >
                  <option value={5}>
                    5 {t.years}
                  </option>

                  <option value={10}>
                    10 {t.years}
                  </option>

                  <option value={15}>
                    15 {t.years}
                  </option>

                  <option value={20}>
                    20 {t.years}
                  </option>

                  <option value={25}>
                    25 {t.years}
                  </option>
                </select>

              </div>

            </div>

          </div>


          {/* =================================
              RIGHT — RESULT
          ================================= */}
          <aside className="relative overflow-hidden rounded-[26px] bg-[#1C1C1E] p-5 text-white shadow-[0_20px_55px_rgba(0,0,0,0.16)] sm:p-6">

            {/* GOLD GLOW */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#D8B46A]/25 blur-[70px]" />

            <div className="relative z-10">

              <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#D8B46A]">
                {t.summary}
              </p>


              {/* MONTHLY PAYMENT */}
              <div className="mt-5 rounded-[22px] border border-white/10 bg-white/[0.05] p-5">

                <p className="text-xs font-semibold leading-5 text-white/55">
                  {t.estimatedMonthlyInstallment}
                </p>

                <p className="mt-3 break-words text-[26px] font-extrabold leading-tight tracking-[-0.035em] text-white sm:text-[30px] lg:text-[32px]">
                  Rp{" "}
                  {formatIDR(
                    result.monthlyInstallment
                  )}
                </p>

                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#D8B46A]">
                  / {lang === "id" ? "bulan" : "month"}
                </p>

              </div>


              {/* RESULT DETAILS */}
              <div className="mt-5 divide-y divide-white/10">

                <div className="flex items-center justify-between gap-4 py-4">

                  <span className="text-xs text-white/50">
                    {t.propertyPrice}
                  </span>

                  <span className="text-right text-sm font-bold text-white">
                    Rp {formatIDR(propertyPrice)}
                  </span>

                </div>


                <div className="flex items-center justify-between gap-4 py-4">

                  <div>
                    <p className="text-xs text-white/50">
                      {t.downPayment}
                    </p>

                    <p className="mt-1 text-[10px] font-bold text-[#D8B46A]">
                      {downPaymentPercent}%
                    </p>
                  </div>

                  <span className="text-right text-sm font-bold text-white">
                    Rp {formatIDR(result.dpAmount)}
                  </span>

                </div>


                <div className="flex items-center justify-between gap-4 py-4">

                  <span className="text-xs text-white/50">
                    {t.estimatedLoan}
                  </span>

                  <span className="text-right text-sm font-bold text-white">
                    Rp {formatIDR(result.loanAmount)}
                  </span>

                </div>


                <div className="grid grid-cols-2 gap-3 pt-4">

                  <div className="rounded-[17px] border border-white/10 bg-white/[0.04] p-3">

                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/40">
                      {t.interestRate}
                    </p>

                    <p className="mt-2 text-sm font-extrabold text-white">
                      {interestRate}%
                    </p>

                  </div>


                  <div className="rounded-[17px] border border-white/10 bg-white/[0.04] p-3">

                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/40">
                      {t.tenure}
                    </p>

                    <p className="mt-2 text-sm font-extrabold text-white">
                      {tenureYears} {t.years}
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </aside>

        </div>


        {/* =====================================
            DISCLAIMER
        ===================================== */}
        <div className="mt-6 rounded-[22px] border border-[#E5DFD4] bg-white/70 px-4 py-4 sm:px-5">

          <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#B8860B]">
            {t.disclaimerTitle}
          </p>

          <p className="mt-2 text-[11px] leading-6 text-gray-500 sm:text-xs">
            {t.disclaimer}
          </p>

          {jenisListing === "lelang" ? (
            <p className="mt-3 border-t border-[#E8E2D8] pt-3 text-[11px] leading-6 text-gray-500 sm:text-xs">
              {t.auctionNote}
            </p>
          ) : null}

        </div>

      </div>

    </section>
  );
}