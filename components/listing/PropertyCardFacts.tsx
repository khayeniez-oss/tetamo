import { Armchair, Bath, BedDouble, FileCheck2, Layers, Ruler } from "lucide-react";

export type PropertyCardFactsData = {
  property_type?: string | null;
  land_size?: number | null;
  land_unit?: string | null;
  building_size?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  certificate?: string | null;
  furnishing?: string | null;
  ownership_type?: string | null;
};

export function toPropertyCardFacts(row: PropertyCardFactsData): PropertyCardFactsData {
  const { property_type, land_size, land_unit, building_size, bedrooms, bathrooms, certificate, furnishing, ownership_type } = row;
  return { property_type, land_size, land_unit, building_size, bedrooms, bathrooms, certificate, furnishing, ownership_type };
}

export function PropertyCardFacts({ data, lang }: { data: PropertyCardFactsData; lang: string }) {
  const type = String(data.property_type || "").toLowerCase();
  const unit = /apart|studio|flat|kondo|room/.test(type);
  const landOnly = /^(tanah|land|kavling)$/.test(type);
  const positive = (n?: number | null): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;
  const number = (n: number) => new Intl.NumberFormat(lang === "id" ? "id-ID" : "en-GB", { maximumFractionDigits: 2 }).format(n);
  const landUnit = ({ m2: "m²", "m²": "m²", sqm: "m²", are: "are", ha: "ha", hectare: "ha", hektar: "ha" } as Record<string, string>)[String(data.land_unit || "m2").toLowerCase()] || data.land_unit || "m²";
  const furnishing = ({ full: lang === "id" ? "Berperabot" : "Furnished", semi: lang === "id" ? "Semi perabot" : "Semi furnished", unfurnished: lang === "id" ? "Tanpa perabot" : "Unfurnished" } as Record<string, string>)[String(data.furnishing || "").toLowerCase()] || data.furnishing;
  const facts: { label: string; Icon: typeof Ruler }[] = [];
  if (!unit && positive(data.land_size)) facts.push({ label: `${lang === "id" ? "LT" : "Land"} ${number(data.land_size)} ${landUnit}`, Icon: Ruler });
  if (!landOnly && positive(data.building_size)) facts.push({ label: `${unit ? "Unit" : lang === "id" ? "LB" : "Building"} ${number(data.building_size)} m²`, Icon: Layers });
  if (!landOnly && positive(data.bedrooms)) facts.push({ label: `${number(data.bedrooms)} ${lang === "id" ? "KT" : "bed"}`, Icon: BedDouble });
  if (!landOnly && positive(data.bathrooms)) facts.push({ label: `${number(data.bathrooms)} ${lang === "id" ? "KM" : "bath"}`, Icon: Bath });
  if (data.certificate?.trim()) facts.push({ label: data.certificate.trim(), Icon: FileCheck2 });
  if (!landOnly && furnishing && furnishing !== "-") facts.push({ label: furnishing, Icon: Armchair });
  if (data.ownership_type?.trim()) facts.push({ label: data.ownership_type.trim(), Icon: Layers });
  if (!facts.length) return null;
  return <div className="mt-3 flex flex-wrap gap-1.5" aria-label={lang === "id" ? "Detail properti" : "Property facts"}>
    {facts.map(({label, Icon}, i) => <span key={`${i}-${label}`} className="inline-flex items-center gap-1.5 rounded-md bg-[#F6F4EF] px-2 py-1 text-[11px] font-medium leading-4 text-[#55534D]">
      <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[#A78032]" />{label}
    </span>)}
  </div>;
}
