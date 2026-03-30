"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/app/context/LanguageContext";

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
          title: "Simulasi KPR",
          subtitle:
            "Estimasi cicilan berdasarkan harga properti ini. Nilai aktual dapat berbeda tergantung bank, profil kredit, dan kebijakan pembiayaan.",
          reset: "Reset",
          bankPreset: "Pilih Bank / Preset Bunga",
          propertyPrice: "Harga Properti",
          dp: "DP",
          interestRate: "Suku Bunga (% per tahun)",
          tenure: "Tenor (Tahun)",
          years: "Tahun",
          custom: "Kustom",
          downPayment: "Down Payment",
          estimatedLoan: "Estimasi Pinjaman",
          estimatedMonthlyInstallment: "Estimasi Cicilan / Bulan",
          disclaimer:
            "Simulasi KPR ini hanya bersifat estimasi dan bukan penawaran resmi dari bank atau lembaga pembiayaan. Nilai cicilan sebenarnya dapat berbeda tergantung kebijakan bank, profil kredit peminjam, serta biaya tambahan seperti asuransi dan administrasi.",
          auctionNote:
            "Catatan untuk properti lelang: pembiayaan tergantung kebijakan bank, status legal properti, dan hasil verifikasi dokumen.",
        }
      : {
          title: "Mortgage Calculator",
          subtitle:
            "Estimated monthly payment based on this property's price. Actual values may vary depending on the bank, credit profile, and financing policy.",
          reset: "Reset",
          bankPreset: "Choose Bank / Interest Preset",
          propertyPrice: "Property Price",
          dp: "Down Payment",
          interestRate: "Interest Rate (% per year)",
          tenure: "Tenure (Years)",
          years: "Years",
          custom: "Custom",
          downPayment: "Down Payment",
          estimatedLoan: "Estimated Loan",
          estimatedMonthlyInstallment: "Estimated Monthly Installment",
          disclaimer:
            "This mortgage simulation is only an estimate and not an official offer from any bank or financing institution. The actual installment amount may vary depending on bank policy, the borrower's credit profile, and additional costs such as insurance and administration fees.",
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
      monthlyInstallment = loanAmount / totalMonths;
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
  }, [propertyPrice, downPaymentPercent, interestRate, tenureYears]);

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

  if (jenisListing !== "dijual" && jenisListing !== "lelang") {
    return null;
  }

  return (
    <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#1C1C1E]">{t.title}</h2>
          <p className="mt-2 text-sm text-gray-500">{t.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={resetCalculator}
          className="shrink-0 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-[#1C1C1E] transition hover:bg-gray-50"
        >
          {t.reset}
        </button>
      </div>

      <div className="mt-5">
        <label className="block text-sm font-medium text-gray-700">
          {t.bankPreset}
        </label>

        <div className="mt-3 flex flex-wrap gap-2">
          {BANK_PRESETS.map((bank) => (
            <button
              key={bank.label}
              type="button"
              onClick={() => handleBankPreset(bank.label, bank.rate)}
              className={`rounded-full px-4 py-2 text-sm border transition ${
                selectedBank === bank.label
                  ? "bg-[#1C1C1E] text-white border-[#1C1C1E]"
                  : "bg-white text-[#1C1C1E] border-gray-300 hover:bg-gray-50"
              }`}
            >
              {bank.label}
              {bank.rate >= 0 ? ` (${bank.rate}%)` : ""}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t.propertyPrice}
          </label>
          <div className="mt-2 w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-[#1C1C1E]">
            Rp {formatIDR(propertyPrice)}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t.dp} ({downPaymentPercent}%)
          </label>
          <input
            type="range"
            min={0}
            max={90}
            step={1}
            value={downPaymentPercent}
            onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
            className="mt-3 w-full"
          />
          <div className="mt-2 text-sm text-gray-600">
            Rp {formatIDR(result.dpAmount)}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t.interestRate}
          </label>
          <input
            type="number"
            value={interestRate}
            onChange={(e) => {
              setSelectedBank(t.custom);
              setInterestRate(Number(e.target.value));
            }}
            className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t.tenure}
          </label>
          <select
            value={tenureYears}
            onChange={(e) => setTenureYears(Number(e.target.value))}
            className="mt-2 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
          >
            <option value={5}>5 {t.years}</option>
            <option value={10}>10 {t.years}</option>
            <option value={15}>15 {t.years}</option>
            <option value={20}>20 {t.years}</option>
            <option value={25}>25 {t.years}</option>
          </select>
        </div>
      </div>

      <div className="mt-6 space-y-4 rounded-2xl bg-[#F7F7F7] p-6">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{t.downPayment}</span>
          <span className="font-medium text-[#1C1C1E]">
            Rp {formatIDR(result.dpAmount)}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{t.estimatedLoan}</span>
          <span className="font-medium text-[#1C1C1E]">
            Rp {formatIDR(result.loanAmount)}
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 pt-3">
          <span className="text-sm text-gray-600">
            {t.estimatedMonthlyInstallment}
          </span>
          <span className="text-2xl font-bold text-[#1C1C1E]">
            Rp {formatIDR(result.monthlyInstallment)}
          </span>
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-gray-500">
        {t.disclaimer}
      </p>

      {jenisListing === "lelang" && (
        <p className="mt-3 text-xs leading-relaxed text-gray-500">
          {t.auctionNote}
        </p>
      )}
    </div>
  );
}