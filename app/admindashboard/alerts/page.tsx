"use client";

import { useState, useMemo } from "react";
import { Search, AlertTriangle } from "lucide-react";

type AlertLevel = "HIGH" | "MEDIUM" | "LOW";

type AlertItem = {
  id: string;
  title: string;
  detail: string;
  level: AlertLevel;
  date: string;
};

const DEMO_ALERTS: AlertItem[] = [
  {
    id: "alert_001",
    title: "12 listings pending approval too long",
    detail: "Pending > 24 hours",
    level: "HIGH",
    date: "12 Mar 2026",
  },
  {
    id: "alert_002",
    title: "4 failed payments detected",
    detail: "Review payment verification queue",
    level: "HIGH",
    date: "12 Mar 2026",
  },
  {
    id: "alert_003",
    title: "7 listings missing photos",
    detail: "Incomplete listing content",
    level: "MEDIUM",
    date: "11 Mar 2026",
  },
];

function levelUI(level: AlertLevel) {
  if (level === "HIGH") return "bg-red-50 text-red-700 border-red-200";
  if (level === "MEDIUM") return "bg-yellow-50 text-yellow-700 border-yellow-200";
  return "bg-blue-50 text-blue-700 border-blue-200";
}

export default function AdminAlertsPage() {
  const [alerts] = useState(DEMO_ALERTS);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return alerts;
    const words = searchQuery.toLowerCase().split(" ");
    return alerts.filter((a) => {
      const searchable = `${a.title} ${a.detail} ${a.level}`.toLowerCase();
      return words.every((w) => searchable.includes(w));
    });
  }, [alerts, searchQuery]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1C1C1E]">Alerts</h1>
        <p className="text-sm text-gray-500">
          Critical platform warnings and marketplace health signals.
        </p>
      </div>

      <div className="mt-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
        <input
          type="text"
          placeholder="Cari alert..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border border-gray-400 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-[#1C1C1E] placeholder:text-gray-500"
        />
      </div>

      <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="divide-y divide-gray-100">
          {filtered.map((alert) => (
            <div key={alert.id} className="p-6 flex items-center justify-between gap-6">
              <div>
                <span className={`inline-flex text-xs px-3 py-1 rounded-full border ${levelUI(alert.level)}`}>
                  {alert.level}
                </span>
                <p className="mt-2 font-medium text-[#1C1C1E]">{alert.title}</p>
                <p className="text-sm text-gray-500">{alert.detail}</p>
                <p className="text-xs text-gray-400 mt-1">{alert.date}</p>
              </div>

              <AlertTriangle className="text-gray-400" size={18} />
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-500">No alerts found.</div>
          )}
        </div>
      </div>
    </div>
  );
}