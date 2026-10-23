export async function fetchListingPhotos(ids: string[]): Promise<Record<string, string>> {
  if (!ids.length) return {};
  try {
    const r = await fetch(`/api/public/listing-photos?ids=${encodeURIComponent(ids.slice(0, 12).join(","))}`);
    if (!r.ok) return {};
    const data = await r.json();
    return data.photos || {};
  } catch { return {}; }
}
