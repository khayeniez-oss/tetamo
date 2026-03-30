"use client";

import { Wallet, TrendingUp, Clock } from "lucide-react";

export default function AgentKomisiPage() {
  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1C1C1E]">
          Komisi
        </h1>
        <p className="text-sm text-gray-500">
          Pantau komisi dari transaksi properti yang berhasil.
        </p>
      </div>

      {/* Coming Soon Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">

        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Wallet className="h-8 w-8 text-[#1C1C1E]" />
          </div>
        </div>

        <h2 className="text-xl font-semibold text-[#1C1C1E]">
          Fitur Komisi Segera Hadir
        </h2>

        <p className="text-sm text-gray-500 mt-3 max-w-md mx-auto">
          Saat ini TETAMO beroperasi sebagai marketplace properti. 
          Sistem komisi untuk agen akan tersedia pada fase berikutnya 
          ketika layanan brokerage dan transaksi properti telah diaktifkan.
        </p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-xl mx-auto">

          <div className="border border-gray-200 rounded-xl p-4">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-gray-600" />
            <p className="text-sm font-medium text-[#1C1C1E]">
              Tracking Komisi
            </p>
            <p className="text-xs text-gray-500">
              Lihat komisi dari transaksi properti.
            </p>
          </div>

          <div className="border border-gray-200 rounded-xl p-4">
            <Wallet className="h-6 w-6 mx-auto mb-2 text-gray-600" />
            <p className="text-sm font-medium text-[#1C1C1E]">
              Pembayaran Agen
            </p>
            <p className="text-xs text-gray-500">
              Sistem pembayaran komisi otomatis.
            </p>
          </div>

          <div className="border border-gray-200 rounded-xl p-4">
            <Clock className="h-6 w-6 mx-auto mb-2 text-gray-600" />
            <p className="text-sm font-medium text-[#1C1C1E]">
              Riwayat Transaksi
            </p>
            <p className="text-xs text-gray-500">
              Lihat histori transaksi properti.
            </p>
          </div>

        </div>

        <p className="mt-8 text-xs text-gray-400">
          TETAMO Future Agent Feature
        </p>

      </div>
    </div>
  );
}