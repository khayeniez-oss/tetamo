export function formatPostedTimestamp(value: string | null | undefined, lang: string): string {
  if (!value || !/T\d{2}:\d{2}/.test(value)) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", {
    timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) => parts.find(item => item.type === type)?.value || "";
  return `${part("day")} ${part("month")} ${part("year")} · ${part("hour")}:${part("minute")}:${part("second")} WIB`;
}
export function PostedTimestamp({ value, lang, fallback }: { value?: string | null; lang: string; fallback?: string }) {
  const label = formatPostedTimestamp(value, lang);
  return label ? <time dateTime={value!} title={lang === "id" ? "Waktu listing dibuat" : "Listing created at"}>{label}</time> : <span>{fallback || "—"}</span>;
}
