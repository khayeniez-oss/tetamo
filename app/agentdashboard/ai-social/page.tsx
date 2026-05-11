"use client";

import { useEffect, useMemo, useState, type ElementType, type ReactNode } from "react";
import {
  Copy,
  Globe2,
  Home,
  Loader2,
  Megaphone,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAgentProfile } from "../layout";

type Mode = "listing" | "manual" | "campaign";
type Language = "English" | "Indonesian" | "Bilingual";
type Platform =
  | "All platforms"
  | "Instagram / Facebook"
  | "TikTok / Reels"
  | "LinkedIn"
  | "Ads"
  | "WhatsApp Broadcast";

type Tone =
  | "Professional and friendly"
  | "Luxury"
  | "Direct sales"
  | "Investment-focused"
  | "Agent-focused"
  | "Owner-focused"
  | "Educational"
  | "Warm and conversational";

type PropertyOption = {
  id: string;
  kode: string | null;
  title: string | null;
  price: number | null;
  city: string | null;
  area: string | null;
  province: string | null;
  listing_type: string | null;
  property_type: string | null;
  created_at: string | null;
};

type ManualProperty = {
  title: string;
  propertyType: string;
  listingType: string;
  rentalType: string;
  saleType: string;
  price: string;
  location: string;
  landSize: string;
  buildingSize: string;
  bedrooms: string;
  bathrooms: string;
  features: string;
  nearby: string;
  targetAudience: string;
  notes: string;
};

type CampaignInput = {
  campaignType: string;
  campaignGoal: string;
  targetAudience: string;
  keyMessage: string;
};

type AiSocialResult = {
  instagramFacebookCaption?: string;
  tiktokReelsCaption?: string;
  linkedinCaption?: string;
  shortReelScript?: string;
  adCopy?: {
    primaryText?: string;
    headline?: string;
    description?: string;
  };
  whatsappBroadcast?: string;
  ctaOptions?: string[];
  hashtags?: string[];
  contentNotes?: string;
};

const LANGUAGES: Language[] = ["English", "Indonesian", "Bilingual"];

const PLATFORMS: Platform[] = [
  "All platforms",
  "Instagram / Facebook",
  "TikTok / Reels",
  "LinkedIn",
  "Ads",
  "WhatsApp Broadcast",
];

const TONES: Tone[] = [
  "Professional and friendly",
  "Luxury",
  "Direct sales",
  "Investment-focused",
  "Agent-focused",
  "Owner-focused",
  "Educational",
  "Warm and conversational",
];

const CAMPAIGN_TYPES = [
  "Promote my listings",
  "Introduce myself as an agent",
  "Invite buyers/renters to view properties",
  "Promote direct WhatsApp inquiries",
  "Promote schedule viewing",
  "Promote Tetamo listing exposure",
  "Promote investment property",
  "Promote rental property",
  "General agent brand awareness",
];

const DEFAULT_MANUAL_PROPERTY: ManualProperty = {
  title: "",
  propertyType: "",
  listingType: "For Rent",
  rentalType: "",
  saleType: "",
  price: "",
  location: "",
  landSize: "",
  buildingSize: "",
  bedrooms: "",
  bathrooms: "",
  features: "",
  nearby: "",
  targetAudience: "",
  notes: "",
};

const DEFAULT_CAMPAIGN: CampaignInput = {
  campaignType: "Promote my listings",
  campaignGoal: "",
  targetAudience: "",
  keyMessage: "",
};

function formatIdr(value?: number | null) {
  if (typeof value !== "number") return "";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function shortText(value?: string | null, length = 90) {
  const clean = String(value || "").trim();

  if (!clean) return "-";
  if (clean.length <= length) return clean;

  return `${clean.slice(0, length).trim()}...`;
}

function safeJoin(values?: string[]) {
  if (!values || values.length === 0) return "";
  return values.filter(Boolean).join("\n");
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
      {children}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-3 text-sm text-[#1C1C1E] outline-none transition focus:border-[#1C1C1E]"
      >
        {children}
      </select>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <FieldLabel>{label}</FieldLabel>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-3 text-sm text-[#1C1C1E] outline-none transition placeholder:text-gray-400 focus:border-[#1C1C1E]"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm leading-6 text-[#1C1C1E] outline-none transition placeholder:text-gray-400 focus:border-[#1C1C1E]"
      />
    </div>
  );
}

function OutputCard({
  title,
  value,
  onCopy,
}: {
  title: string;
  value?: string;
  onCopy: (value: string) => void;
}) {
  const clean = String(value || "").trim();

  if (!clean) return null;

  return (
    <div className="rounded-[24px] border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-bold text-[#1C1C1E]">{title}</h3>

        <button
          type="button"
          onClick={() => onCopy(clean)}
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy
        </button>
      </div>

      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-700">
        {clean}
      </p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  title,
  text,
}: {
  icon: ElementType;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[24px] border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1C1C1E] text-white">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-sm font-bold text-[#1C1C1E]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-gray-600">{text}</p>
    </div>
  );
}

export default function AgentAiSocialPage() {
  const { userId, loadingProfile, hasActiveMembership } = useAgentProfile();

  const [mode, setMode] = useState<Mode>("listing");
  const [language, setLanguage] = useState<Language>("Bilingual");
  const [platform, setPlatform] = useState<Platform>("All platforms");
  const [tone, setTone] = useState<Tone>("Agent-focused");
  const [extraInstruction, setExtraInstruction] = useState("");

  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [propertySearch, setPropertySearch] = useState("");

  const [manualProperty, setManualProperty] = useState<ManualProperty>(
    DEFAULT_MANUAL_PROPERTY
  );
  const [campaign, setCampaign] = useState<CampaignInput>(DEFAULT_CAMPAIGN);

  const [loadingProperties, setLoadingProperties] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copyNotice, setCopyNotice] = useState("");
  const [result, setResult] = useState<AiSocialResult | null>(null);

  const filteredProperties = useMemo(() => {
    const query = propertySearch.trim().toLowerCase();

    if (!query) return properties;

    return properties.filter((item) => {
      const searchable = `
        ${item.kode || ""}
        ${item.title || ""}
        ${item.city || ""}
        ${item.area || ""}
        ${item.province || ""}
        ${item.listing_type || ""}
        ${item.property_type || ""}
        ${formatIdr(item.price)}
      `.toLowerCase();

      return searchable.includes(query);
    });
  }, [properties, propertySearch]);

  const selectedProperty = useMemo(() => {
    return properties.find((item) => item.id === selectedPropertyId) || null;
  }, [properties, selectedPropertyId]);

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || "";
  }

  async function loadProperties() {
    if (!userId) {
      setProperties([]);
      setLoadingProperties(false);
      return;
    }

    try {
      setLoadingProperties(true);
      setError("");

      const { data, error: propertyError } = await supabase
        .from("properties")
        .select(
          "id, kode, title, price, city, area, province, listing_type, property_type, created_at"
        )
        .eq("user_id", userId)
        .eq("source", "agent")
        .neq("status", "rejected")
        .order("created_at", { ascending: false })
        .limit(250);

      if (propertyError) throw propertyError;

      const rows = (data || []) as PropertyOption[];
      setProperties(rows);

      if (!selectedPropertyId && rows.length > 0) {
        setSelectedPropertyId(rows[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load agent listings for AI social:", err);
      setError(err?.message || "Failed to load your listings.");
      setProperties([]);
    } finally {
      setLoadingProperties(false);
    }
  }

  async function copyToClipboard(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyNotice("Copied to clipboard.");
      window.setTimeout(() => setCopyNotice(""), 1800);
    } catch {
      setCopyNotice("Copy failed. Please copy manually.");
      window.setTimeout(() => setCopyNotice(""), 2200);
    }
  }

  async function generateContent() {
    try {
      setGenerating(true);
      setError("");
      setResult(null);

      const token = await getAccessToken();

      if (!token) {
        setError("Please log in as agent first.");
        return;
      }

      if (!hasActiveMembership) {
        setError("Active agent membership is required to use AI Social Media.");
        return;
      }

      if (mode === "listing" && !selectedPropertyId) {
        setError("Please select one of your Tetamo listings first.");
        return;
      }

      const response = await fetch("/api/agent/ai-social", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mode,
          propertyId: mode === "listing" ? selectedPropertyId : undefined,
          manualProperty: mode === "manual" ? manualProperty : undefined,
          campaign: mode === "campaign" ? campaign : undefined,
          platform,
          language,
          tone,
          extraInstruction,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to generate content.");
      }

      setResult(payload.result as AiSocialResult);
    } catch (err: any) {
      console.error("Agent AI social generate error:", err);
      setError(err?.message || "Failed to generate social media content.");
    } finally {
      setGenerating(false);
    }
  }

  function updateManual<K extends keyof ManualProperty>(
    key: K,
    value: ManualProperty[K]
  ) {
    setManualProperty((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updateCampaign<K extends keyof CampaignInput>(
    key: K,
    value: CampaignInput[K]
  ) {
    setCampaign((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  useEffect(() => {
    if (!loadingProfile) {
      loadProperties();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingProfile, userId]);

  const adCopyText = result?.adCopy
    ? [
        result.adCopy.primaryText
          ? `Primary Text:\n${result.adCopy.primaryText}`
          : "",
        result.adCopy.headline ? `Headline:\n${result.adCopy.headline}` : "",
        result.adCopy.description
          ? `Description:\n${result.adCopy.description}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n")
    : "";

  const ctaText = safeJoin(result?.ctaOptions);

  const hashtagText = result?.hashtags?.length
    ? result.hashtags
        .map((tag) => {
          const clean = String(tag || "").trim();
          if (!clean) return "";
          return clean.startsWith("#") ? clean : `#${clean}`;
        })
        .filter(Boolean)
        .join(" ")
    : "";

  return (
    <main className="space-y-5 text-[#1C1C1E]">
      {copyNotice ? (
        <div className="fixed right-4 top-4 z-50 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-[#1C1C1E] shadow-xl">
          {copyNotice}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">
              Tetamo Agent AI
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              AI Social Media Generator
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              Generate ready-to-post captions, reel scripts, ad copy, CTAs,
              WhatsApp broadcast copy, and hashtags for your own Tetamo listings
              and agent campaigns.
            </p>
          </div>

          <button
            type="button"
            onClick={generateContent}
            disabled={generating || loadingProfile}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#1C1C1E] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {generating ? "Generating..." : "Generate Content"}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <StatCard
            icon={Home}
            title="Your Listings"
            text="Generate stronger posts using only your own Tetamo agent listings."
          />
          <StatCard
            icon={Megaphone}
            title="Agent Campaigns"
            text="Create content to promote your listings, agent service, viewing invitations, and buyer/renter inquiries."
          />
          <StatCard
            icon={Globe2}
            title="EN / ID / Bilingual"
            text="Generate English, Bahasa Indonesia, or bilingual content for multiple platforms."
          />
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!hasActiveMembership && !loadingProfile ? (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Active agent membership is required to use AI Social Media.
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-5">
          <div className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-base font-bold">Content Source</h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              Choose whether AI should use your Tetamo listing, manual property
              details, or an agent campaign idea.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-2">
              {[
                {
                  value: "listing",
                  label: "My Tetamo Listing",
                  text: "Use one of your own agent listings.",
                },
                {
                  value: "manual",
                  label: "Manual Property",
                  text: "Enter property details manually.",
                },
                {
                  value: "campaign",
                  label: "Agent Campaign",
                  text: "Create agent branding, listing promotion, or buyer/renter content.",
                },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setMode(item.value as Mode);
                    setResult(null);
                  }}
                  className={[
                    "rounded-2xl border p-4 text-left transition",
                    mode === item.value
                      ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                      : "border-gray-200 bg-white hover:bg-gray-50",
                  ].join(" ")}
                >
                  <p className="text-sm font-bold">{item.label}</p>
                  <p
                    className={[
                      "mt-1 text-xs leading-5",
                      mode === item.value ? "text-white/65" : "text-gray-500",
                    ].join(" ")}
                  >
                    {item.text}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-base font-bold">Generation Settings</h2>

            <div className="mt-4 space-y-4">
              <SelectField
                label="Platform"
                value={platform}
                onChange={(value) => setPlatform(value as Platform)}
              >
                {PLATFORMS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="Language"
                value={language}
                onChange={(value) => setLanguage(value as Language)}
              >
                {LANGUAGES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="Tone"
                value={tone}
                onChange={(value) => setTone(value as Tone)}
              >
                {TONES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </SelectField>

              <TextAreaField
                label="Extra Instruction"
                value={extraInstruction}
                onChange={setExtraInstruction}
                rows={3}
                placeholder="Example: Make it more premium, include price clearly, sell the location, focus on viewing CTA..."
              />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {mode === "listing" ? (
            <div className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold">Select Your Listing</h2>
                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    AI will use one of your own Tetamo agent listings.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadProperties}
                  className="rounded-2xl border border-gray-200 p-2.5 text-gray-700 hover:bg-gray-50"
                  title="Refresh listings"
                >
                  <RefreshCcw className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <InputField
                  label="Search Listing"
                  value={propertySearch}
                  onChange={setPropertySearch}
                  placeholder="Search title, code, city, type..."
                />

                <div className="max-h-[430px] space-y-2 overflow-y-auto pr-1">
                  {loadingProperties ? (
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                      Loading your listings...
                    </div>
                  ) : filteredProperties.length === 0 ? (
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                      No listings found.
                    </div>
                  ) : (
                    filteredProperties.map((item) => {
                      const active = selectedPropertyId === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedPropertyId(item.id)}
                          className={[
                            "w-full rounded-2xl border p-4 text-left transition",
                            active
                              ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                              : "border-gray-200 bg-white hover:bg-gray-50",
                          ].join(" ")}
                        >
                          <p className="line-clamp-2 text-sm font-bold">
                            {item.title || "Untitled Listing"}
                          </p>

                          <p
                            className={[
                              "mt-1 text-xs",
                              active ? "text-white/65" : "text-gray-500",
                            ].join(" ")}
                          >
                            {item.kode || "-"} •{" "}
                            {item.city || item.area || item.province || "-"} •{" "}
                            {item.property_type || "-"}
                          </p>

                          <p
                            className={[
                              "mt-2 text-sm font-semibold",
                              active ? "text-white" : "text-[#1C1C1E]",
                            ].join(" ")}
                          >
                            {formatIdr(item.price)}
                          </p>
                        </button>
                      );
                    })
                  )}
                </div>

                {selectedProperty ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    Selected: {shortText(selectedProperty.title, 120)}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {mode === "manual" ? (
            <div className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-base font-bold">Manual Property Details</h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                Use this when the property is not listed in Tetamo yet.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <InputField
                  label="Property Title"
                  value={manualProperty.title}
                  onChange={(value) => updateManual("title", value)}
                  placeholder="Example: Modern Villa for Yearly Rent in Canggu"
                />

                <InputField
                  label="Property Type"
                  value={manualProperty.propertyType}
                  onChange={(value) => updateManual("propertyType", value)}
                  placeholder="Villa, house, land, apartment..."
                />

                <SelectField
                  label="Listing Type"
                  value={manualProperty.listingType}
                  onChange={(value) => updateManual("listingType", value)}
                >
                  <option value="For Rent">For Rent</option>
                  <option value="For Sale">For Sale</option>
                  <option value="Developer Project">Developer Project</option>
                </SelectField>

                <InputField
                  label="Price"
                  value={manualProperty.price}
                  onChange={(value) => updateManual("price", value)}
                  placeholder="Example: Rp 350.000.000 / year"
                />

                <InputField
                  label="Rental Type"
                  value={manualProperty.rentalType}
                  onChange={(value) => updateManual("rentalType", value)}
                  placeholder="Daily / Monthly / Yearly"
                />

                <InputField
                  label="Sale Type"
                  value={manualProperty.saleType}
                  onChange={(value) => updateManual("saleType", value)}
                  placeholder="Freehold / Leasehold / HGB"
                />

                <InputField
                  label="Location"
                  value={manualProperty.location}
                  onChange={(value) => updateManual("location", value)}
                  placeholder="Canggu, Bali"
                />

                <InputField
                  label="Target Audience"
                  value={manualProperty.targetAudience}
                  onChange={(value) => updateManual("targetAudience", value)}
                  placeholder="Expats, families, investors, renters..."
                />

                <InputField
                  label="Land Size"
                  value={manualProperty.landSize}
                  onChange={(value) => updateManual("landSize", value)}
                  placeholder="Example: 3 are / 300 m²"
                />

                <InputField
                  label="Building Size"
                  value={manualProperty.buildingSize}
                  onChange={(value) => updateManual("buildingSize", value)}
                  placeholder="Example: 180 m²"
                />

                <InputField
                  label="Bedrooms"
                  value={manualProperty.bedrooms}
                  onChange={(value) => updateManual("bedrooms", value)}
                  placeholder="Example: 3"
                />

                <InputField
                  label="Bathrooms"
                  value={manualProperty.bathrooms}
                  onChange={(value) => updateManual("bathrooms", value)}
                  placeholder="Example: 3"
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4">
                <TextAreaField
                  label="Key Features"
                  value={manualProperty.features}
                  onChange={(value) => updateManual("features", value)}
                  placeholder="Pool, enclosed living, parking, garden, furnished..."
                />

                <TextAreaField
                  label="Nearby / Lifestyle"
                  value={manualProperty.nearby}
                  onChange={(value) => updateManual("nearby", value)}
                  placeholder="Near beach, cafes, international school, main road access..."
                />

                <TextAreaField
                  label="Additional Notes"
                  value={manualProperty.notes}
                  onChange={(value) => updateManual("notes", value)}
                  placeholder="Any special selling point, restriction, or CTA direction..."
                />
              </div>
            </div>
          ) : null}

          {mode === "campaign" ? (
            <div className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-base font-bold">Agent Campaign Details</h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                Generate content for your agent brand, listings, viewing
                invitations, and buyer/renter inquiries.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <SelectField
                  label="Campaign Type"
                  value={campaign.campaignType}
                  onChange={(value) => updateCampaign("campaignType", value)}
                >
                  {CAMPAIGN_TYPES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </SelectField>

                <InputField
                  label="Target Audience"
                  value={campaign.targetAudience}
                  onChange={(value) => updateCampaign("targetAudience", value)}
                  placeholder="Buyers, renters, investors, owners..."
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4">
                <TextAreaField
                  label="Campaign Goal"
                  value={campaign.campaignGoal}
                  onChange={(value) => updateCampaign("campaignGoal", value)}
                  placeholder="Example: Invite renters to schedule viewing for available villas in Bali."
                />

                <TextAreaField
                  label="Key Message"
                  value={campaign.keyMessage}
                  onChange={(value) => updateCampaign("keyMessage", value)}
                  placeholder="Example: I help buyers and renters find clearer property options through Tetamo with direct inquiry and schedule viewing support."
                />
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={generateContent}
            disabled={generating || loadingProfile}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1C1C1E] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {generating ? "Generating..." : "Generate Social Media Content"}
          </button>
        </div>
      </section>

      <section className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Generated Output</h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              Copy the content you need and adjust final wording before posting.
            </p>
          </div>

          {result ? (
            <button
              type="button"
              onClick={() =>
                copyToClipboard(
                  [
                    result.instagramFacebookCaption
                      ? `Instagram/Facebook:\n${result.instagramFacebookCaption}`
                      : "",
                    result.tiktokReelsCaption
                      ? `TikTok/Reels:\n${result.tiktokReelsCaption}`
                      : "",
                    result.linkedinCaption
                      ? `LinkedIn:\n${result.linkedinCaption}`
                      : "",
                    result.shortReelScript
                      ? `Short Reel Script:\n${result.shortReelScript}`
                      : "",
                    adCopyText ? `Ad Copy:\n${adCopyText}` : "",
                    result.whatsappBroadcast
                      ? `WhatsApp Broadcast:\n${result.whatsappBroadcast}`
                      : "",
                    ctaText ? `CTA Options:\n${ctaText}` : "",
                    hashtagText ? `Hashtags:\n${hashtagText}` : "",
                  ]
                    .filter(Boolean)
                    .join("\n\n---\n\n")
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Copy className="h-4 w-4" />
              Copy All
            </button>
          ) : null}
        </div>

        {!result ? (
          <div className="mt-5 rounded-[24px] border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-3 text-sm font-semibold text-gray-700">
              No content generated yet.
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Choose a source and click Generate Content.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <OutputCard
              title="Instagram / Facebook Caption"
              value={result.instagramFacebookCaption}
              onCopy={copyToClipboard}
            />

            <OutputCard
              title="TikTok / Reels Caption"
              value={result.tiktokReelsCaption}
              onCopy={copyToClipboard}
            />

            <OutputCard
              title="LinkedIn Caption"
              value={result.linkedinCaption}
              onCopy={copyToClipboard}
            />

            <OutputCard
              title="Short Reel Script"
              value={result.shortReelScript}
              onCopy={copyToClipboard}
            />

            <OutputCard
              title="Ad Copy"
              value={adCopyText}
              onCopy={copyToClipboard}
            />

            <OutputCard
              title="WhatsApp Broadcast"
              value={result.whatsappBroadcast}
              onCopy={copyToClipboard}
            />

            <OutputCard
              title="CTA Options"
              value={ctaText}
              onCopy={copyToClipboard}
            />

            <OutputCard
              title="Hashtags"
              value={hashtagText}
              onCopy={copyToClipboard}
            />

            <OutputCard
              title="Content Notes"
              value={result.contentNotes}
              onCopy={copyToClipboard}
            />
          </div>
        )}
      </section>
    </main>
  );
}