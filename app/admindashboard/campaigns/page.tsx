"use client";

import { useState, useMemo } from "react";
import { Search, Megaphone } from "lucide-react";

type CampaignStatus = "ACTIVE" | "ENDED" | "DRAFT";

type Campaign = {
  id: string;
  name: string;
  channel: string;
  budget: string;
  city: string;
  status: CampaignStatus;
};

const DEMO_CAMPAIGNS: Campaign[] = [
  {
    id: "camp_001",
    name: "Jakarta Featured Push",
    channel: "Instagram Ads",
    budget: "Rp 5.000.000",
    city: "Jakarta Selatan",
    status: "ACTIVE",
  },
  {
    id: "camp_002",
    name: "Bali Investor Drive",
    channel: "Google Ads",
    budget: "Rp 7.500.000",
    city: "Denpasar",
    status: "DRAFT",
  },
];

function statusUI(status: CampaignStatus) {
  if (status === "ACTIVE") return "bg-green-50 text-green-700 border-green-200";
  if (status === "ENDED") return "bg-gray-100 text-gray-700 border-gray-200";
  return "bg-yellow-50 text-yellow-700 border-yellow-200";
}

export default function AdminCampaignsPage() {
  const [campaigns] = useState(DEMO_CAMPAIGNS);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return campaigns;
    const words = searchQuery.toLowerCase().split(" ");
    return campaigns.filter((c) => {
      const searchable = `${c.name} ${c.channel} ${c.city} ${c.status}`.toLowerCase();
      return words.every((w) => searchable.includes(w));
    });
  }, [campaigns, searchQuery]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1C1C1E]">Campaigns</h1>
        <p className="text-sm text-gray-500">
          Monitor promotions, paid campaigns, and growth experiments.
        </p>
      </div>

      <div className="mt-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
        <input
          type="text"
          placeholder="Cari campaign..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border border-gray-400 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-[#1C1C1E] placeholder:text-gray-500"
        />
      </div>

      <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="divide-y divide-gray-100">
          {filtered.map((campaign) => (
            <div key={campaign.id} className="p-6 flex items-center justify-between gap-6">
              <div>
                <span className={`inline-flex text-xs px-3 py-1 rounded-full border ${statusUI(campaign.status)}`}>
                  {campaign.status}
                </span>
                <p className="mt-2 font-medium text-[#1C1C1E]">{campaign.name}</p>
                <p className="text-sm text-gray-500">{campaign.channel} • {campaign.city}</p>
                <p className="text-xs text-gray-400">{campaign.budget}</p>
              </div>

              <Megaphone className="text-gray-400" size={18} />
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-500">No campaigns found.</div>
          )}
        </div>
      </div>
    </div>
  );
}