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
  if (status === "ACTIVE") {
    return {
      label: "Active",
      badge: "bg-green-50 text-green-700 border-green-200",
    };
  }

  if (status === "ENDED") {
    return {
      label: "Ended",
      badge: "bg-gray-100 text-gray-700 border-gray-200",
    };
  }

  return {
    label: "Draft",
    badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
  };
}

export default function AdminCampaignsPage() {
  const [campaigns] = useState(DEMO_CAMPAIGNS);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return campaigns;

    const words = searchQuery.toLowerCase().split(" ").filter(Boolean);

    return campaigns.filter((c) => {
      const searchable = `${c.name} ${c.channel} ${c.city} ${c.status}`.toLowerCase();
      return words.every((w) => searchable.includes(w));
    });
  }, [campaigns, searchQuery]);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold tracking-tight text-[#1C1C1E] sm:text-xl">
          Campaigns
        </h1>
        <p className="text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
          Monitor promotions, paid campaigns, and growth experiments.
        </p>
      </div>

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          size={16}
        />
        <input
          type="text"
          placeholder="Cari campaign..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10 w-full rounded-2xl border border-gray-300 pl-10 pr-4 text-[13px] outline-none focus:border-[#1C1C1E] placeholder:text-gray-400 sm:h-11 sm:pl-11 sm:text-sm"
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="divide-y divide-gray-100">
          {filtered.map((campaign) => {
            const ui = statusUI(campaign.status);

            return (
              <div key={campaign.id} className="px-3.5 py-4 sm:px-5">
                <div className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium sm:text-[11px] ${ui.badge}`}
                        >
                          {ui.label}
                        </span>
                      </div>

                      <p className="mt-2 text-[13px] font-semibold text-[#1C1C1E] sm:text-sm md:text-[15px]">
                        {campaign.name}
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-2.5">
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                            Channel
                          </p>
                          <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-[13px]">
                            {campaign.channel}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                            City
                          </p>
                          <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-[13px]">
                            {campaign.city}
                          </p>
                        </div>

                        <div className="col-span-2 rounded-2xl border border-gray-100 bg-gray-50 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] text-gray-600 sm:text-xs md:text-sm">
                              Budget
                            </p>
                            <p className="text-[12px] font-semibold text-[#1C1C1E] sm:text-[13px]">
                              {campaign.budget}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 xl:w-[120px] xl:shrink-0">
                      <div className="flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-500">
                        <Megaphone size={16} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-500">
              No campaigns found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}