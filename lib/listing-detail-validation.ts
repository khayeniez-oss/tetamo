import { parseListingDecimal } from "./listing-numbers";
export function listingDetailIssue(draft: Record<string, unknown>, year = new Date().getFullYear()): "measurement" | "lease" | "rent" | "price" | null {
  const type = String(draft.propertyType || "");
  const positive = (value: unknown) => (parseListingDecimal(value) ?? 0) > 0;
  const hasValue = (value: unknown) => value !== undefined && value !== null && String(value).trim() !== "";
  const fields = ["frontage", "depth", "ceilingHeight"];
  if (!["apartemen", "studio", "room"].includes(type)) {
    if (!positive(draft.lt)) return "measurement";
  }
  if (type !== "tanah") fields.push("lb");
  if (fields.some(key => hasValue(draft[key]) && !positive(draft[key]))) return "measurement";
  const listing = String(draft.listingType || "");
  const sale = listing === "dijual" || listing === "dijual_disewa";
  const rent = listing === "disewa" || listing === "dijual_disewa";
  if (sale && !positive(draft.salePrice || draft.price)) return "price";
  if (rent && !positive(draft.rentPrice || (listing === "disewa" ? draft.price : undefined))) return "price";
  if (listing === "lelang" && !positive(draft.price)) return "price";
  if (rent && !["harian", "bulanan", "tahunan"].includes(String(draft.rentalType))) return "rent";
  const leasehold = String(draft.saleType || "") === "leasehold" || /lease|hak sewa/i.test(String(draft.jenisKepemilikan || ""));
  if ((sale || listing === "lelang") && leasehold) {
    const years = parseListingDecimal(draft.leaseYears);
    const until = parseListingDecimal(draft.leaseUntilYear);
    if (!years || !Number.isInteger(years) || !until || !Number.isInteger(until) || until < year || !["ya", "tidak", "tidak_tahu"].includes(String(draft.leaseExtendable))) return "lease";
  }
  return null;
}
