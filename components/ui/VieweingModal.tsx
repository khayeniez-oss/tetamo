"use client";

import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  propertyTitle: string;
};

export default function ViewingModal({ open, onClose, propertyTitle }: Props) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl relative">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-black"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold mb-4">
          Jadwal Viewing
        </h2>

        <p className="text-sm text-gray-500 mb-4">
          {propertyTitle}
        </p>

        {/* Date */}
        <div className="mb-3">
          <label className="text-sm font-medium">Pilih Tanggal</label>
          <input
            type="date"
            className="w-full mt-1 border rounded-lg px-3 py-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* Time */}
        <div className="mb-4">
          <label className="text-sm font-medium">Pilih Jam</label>
          <input
            type="time"
            className="w-full mt-1 border rounded-lg px-3 py-2"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>

        {/* Submit */}
        <button
          className="w-full bg-[#1C1C1E] text-white py-3 rounded-xl font-semibold hover:opacity-90"
          onClick={() => {
            alert("Request sent (UI only for now)");
            onClose();
          }}
        >
          Kirim Permintaan
        </button>
      </div>
    </div>
  );
}