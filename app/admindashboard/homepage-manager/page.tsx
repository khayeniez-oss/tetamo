"use client";

import { useState } from "react";
import { Save } from "lucide-react";

export default function AdminHomepageManagerPage() {
  const [form, setForm] = useState({
    heroTitle: "Find Your Property with Tetamo",
    heroSubtitle: "Trusted property marketplace for buyers, owners, and agents.",
    spotlightCity: "Jakarta Selatan",
    homepageBanner: "New Featured Listings This Week",
    featuredSectionTitle: "Featured Properties",
  });

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1C1E]">Homepage Manager</h1>
          <p className="text-sm text-gray-500">
            Control hero content, spotlight sections, and homepage messaging.
          </p>
        </div>

        <button className="rounded-xl bg-[#1C1C1E] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 flex items-center gap-2">
          <Save size={16} />
          Save Homepage
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-6">
        <div>
          <label className="text-sm font-medium text-gray-700">Hero Title</label>
          <input
            type="text"
            value={form.heroTitle}
            onChange={(e) => updateField("heroTitle", e.target.value)}
            className="mt-2 w-full border border-gray-400 rounded-xl px-4 py-2 outline-none focus:border-[#1C1C1E]"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Hero Subtitle</label>
          <input
            type="text"
            value={form.heroSubtitle}
            onChange={(e) => updateField("heroSubtitle", e.target.value)}
            className="mt-2 w-full border border-gray-400 rounded-xl px-4 py-2 outline-none focus:border-[#1C1C1E]"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Spotlight City</label>
          <input
            type="text"
            value={form.spotlightCity}
            onChange={(e) => updateField("spotlightCity", e.target.value)}
            className="mt-2 w-full border border-gray-400 rounded-xl px-4 py-2 outline-none focus:border-[#1C1C1E]"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Homepage Banner</label>
          <input
            type="text"
            value={form.homepageBanner}
            onChange={(e) => updateField("homepageBanner", e.target.value)}
            className="mt-2 w-full border border-gray-400 rounded-xl px-4 py-2 outline-none focus:border-[#1C1C1E]"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Featured Section Title</label>
          <input
            type="text"
            value={form.featuredSectionTitle}
            onChange={(e) => updateField("featuredSectionTitle", e.target.value)}
            className="mt-2 w-full border border-gray-400 rounded-xl px-4 py-2 outline-none focus:border-[#1C1C1E]"
          />
        </div>
      </div>
    </div>
  );
}