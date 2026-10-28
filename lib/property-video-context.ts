import { parseListingDecimal } from "./listing-numbers";

const types: Record<string, [string, string]> = {
  rumah: ["Rumah", "House"], vila: ["Vila", "Villa"], villa: ["Vila", "Villa"], apartemen: ["Apartemen", "Apartment"], studio: ["Studio", "Studio"], room: ["Kamar", "Room"], tanah: ["Tanah", "Land"], gudang: ["Gudang", "Warehouse"], kantor: ["Kantor", "Office"], ruko: ["Ruko", "Shophouse"], rukos: ["Rukos", "Shophouse / Boarding House"], kos: ["Kos", "Boarding House"], guesthouse: ["Guesthouse", "Guesthouse"], hotel: ["Hotel", "Hotel"], resort: ["Resort", "Resort"], pabrik: ["Pabrik", "Factory"], kios: ["Kios", "Retail Unit"], komersial: ["Komersial", "Commercial"],
};
const purposes: Record<string, [string, string]> = { dijual: ["Dijual", "For Sale"], disewa: ["Disewa", "For Rent"], dijual_disewa: ["Dijual & Disewa", "For Sale & Rent"], lelang: ["Lelang", "Auction"] };
const periods: Record<string, [string, string]> = { harian: ["Harian", "Daily"], daily: ["Harian", "Daily"], bulanan: ["Bulanan", "Monthly"], monthly: ["Bulanan", "Monthly"], tahunan: ["Tahunan", "Yearly"], yearly: ["Tahunan", "Yearly"] };
const furniture: Record<string, [string, string]> = { full: ["Berperabot Lengkap", "Fully Furnished"], fully_furnished: ["Berperabot Lengkap", "Fully Furnished"], semi: ["Semi Furnitur", "Semi Furnished"], semi_furnished: ["Semi Furnitur", "Semi Furnished"], unfurnished: ["Tanpa Furnitur", "Unfurnished"] };

/** Translate known labels; all property facts remain supplied form values. */
export function propertyVideoContext(draft: Record<string, unknown>, base: Record<string, unknown>, lang: string) {
  const id = lang !== "en";
  const text = (value: unknown) => value === undefined || value === null ? "" : String(value).trim();
  const label = (map: Record<string, [string, string]>, value: unknown, fallback: unknown) => map[text(value).toLowerCase()]?.[id ? 0 : 1] || text(fallback);
  const area = (value: unknown, unit: string, fallback: unknown) => {
    const parsed = parseListingDecimal(value);
    return parsed === null ? text(fallback) : `${new Intl.NumberFormat(id ? "id-ID" : "en-GB", { maximumFractionDigits: 2 }).format(parsed)} ${unit}`;
  };
  const listing = text(draft.listingType || draft.listing_type);
  const type = text(draft.propertyType || draft.property_type);
  const unit = text(draft.landUnit || draft.land_unit || "m2");
  const unitLabel = ({ m2: "m²", are: "are", hectare: "ha", ha: "ha", hektar: "ha" } as Record<string, string>)[unit] || unit;
  const sale = text(draft.salePrice || draft.sale_price || draft.price);
  const rent = text(draft.rentPrice || draft.rent_price || draft.price);
  return {
    ...base,
    propertyType: label(types, type, base.propertyType),
    purpose: text(draft.saleType) === "leasehold" ? "Leasehold" : label(purposes, listing, base.purpose),
    rentalType: label(periods, draft.rentalType || draft.rental_type, base.rentalType),
    furnishing: label(furniture, draft.furnishing, base.furnishing),
    bedrooms: text(draft.bed ?? draft.bedrooms ?? base.bedrooms),
    bathrooms: text(draft.bath ?? draft.bathrooms ?? base.bathrooms),
    price: listing === "disewa" ? rent : sale || text(base.price),
    rentPrice: listing === "dijual_disewa" ? rent : "",
    landSize: ["room", "apartemen", "studio"].includes(type) ? "" : area(draft.lt ?? draft.land_size, unitLabel, base.landSize),
    buildingSize: type === "tanah" ? "" : area(draft.lb ?? draft.building_size, "m²", base.buildingSize),
    ownershipTitle: text(draft.saleType) === "leasehold" && text(draft.leaseYears) ? `Leasehold · ${text(draft.leaseYears)} ${id ? "tahun" : "years"}` : text(base.ownershipTitle),
  };
}
