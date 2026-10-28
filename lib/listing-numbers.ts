/** Keep the user's decimal separator while editing; never turn 1,2 into 12. */
export function decimalInput(value: string): string {
  return value;
}

/** Measurements accept decimal commas or dots and unambiguous grouped numbers. */
export function parseListingDecimal(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value !== "string") return null;
  let text = value.trim().replace(/[\s\u00a0]/g, "");
  if (!text || !/^[\d.,]+$/.test(text)) return null;
  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    const decimal = comma > dot ? "," : ".";
    const grouping = decimal === "," ? "." : ",";
    const parts = text.split(decimal);
    if (parts.length !== 2 || !/^\d+$/.test(parts[1])) return null;
    const groups = parts[0].split(grouping);
    if (!/^\d{1,3}$/.test(groups[0]) || groups.slice(1).some(part => !/^\d{3}$/.test(part))) return null;
    text = groups.join("") + "." + parts[1];
  } else {
    const parts = text.split(/[.,]/);
    if (parts.length > 2) {
      if (!/^\d{1,3}$/.test(parts[0]) || parts.slice(1).some(part => !/^\d{3}$/.test(part))) return null;
      text = parts.join("");
    } else text = text.replace(",", ".");
  }
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function landAreaInSqm(value: unknown, unit: string): number | null {
  const size = parseListingDecimal(value);
  if (size === null) return null;
  const factor = ({ are: 100, hectare: 10000, ha: 10000, hektar: 10000, acre: 4046.8564224 } as Record<string, number>)[unit] ?? 1;
  return size * factor;
}
