const MAX_AGE = 7 * 86400000;
export function listingDraftKey(userId: string, role: string, editCode?: string) {
  return `tetamo:listing-draft:v1:${encodeURIComponent(userId)}:${role}:${editCode ? `edit:${encodeURIComponent(editCode)}` : "create"}`;
}
export function restoreListingDraft<T extends object>(raw: string | null, empty: T, now = Date.now()): T {
  if (!raw) return empty;
  const saved = JSON.parse(raw);
  if (saved?.version !== 1 || typeof saved.savedAt !== "number" || saved.savedAt > now || now - saved.savedAt >= MAX_AGE || !saved.draft || typeof saved.draft !== "object" || Array.isArray(saved.draft)) return empty;
  return { ...empty, ...saved.draft };
}
function durableValue(value: unknown): unknown {
  if (typeof value === "string" && value.startsWith("blob:")) return undefined;
  if (Array.isArray(value)) return value.map(durableValue).filter(item => item !== undefined);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, durableValue(item)]));
  return value;
}
export function serializeListingDraft(draft: object, now = Date.now()) {
  return JSON.stringify({ version: 1, savedAt: now, draft: durableValue(draft) });
}
