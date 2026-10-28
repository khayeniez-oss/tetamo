"use client";
import { useSyncExternalStore } from "react";
const subscribe = (notify: () => void) => { const timer = setInterval(notify, 60000); return () => clearInterval(timer); };
const snapshot = () => Math.floor(Date.now() / 60000) * 60000;
const serverSnapshot = () => null;
export function formatPostedAge(value: string | null | undefined, lang: string, now: number): string {
  const time = value ? new Date(value).getTime() : NaN;
  if (!Number.isFinite(time) || time > now) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    const today = new Date(now);
    const calendarNow = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const days = Math.floor((calendarNow - time) / 86400000);
    if (days < 0) return "";
    if (days === 0) return lang === "id" ? "Hari ini" : "Today";
    const amount = days < 30 ? days : days < 365 ? Math.floor(days / 30) : Math.floor(days / 365);
    const unit = days < 30 ? "day" : days < 365 ? "month" : "year";
    return new Intl.RelativeTimeFormat(lang === "id" ? "id-ID" : "en-GB", { numeric: "always" }).format(-amount, unit);
  }
  const minutes = Math.floor((now - time) / 60000);
  if (minutes < 1) return lang === "id" ? "Baru saja" : "Just posted";
  const [amount, unit] = minutes < 60 ? [minutes, "minute"] : minutes < 1440 ? [Math.floor(minutes / 60), "hour"] : minutes < 43200 ? [Math.floor(minutes / 1440), "day"] : minutes < 525600 ? [Math.floor(minutes / 43200), "month"] : [Math.floor(minutes / 525600), "year"];
  return new Intl.RelativeTimeFormat(lang === "id" ? "id-ID" : "en-GB", { numeric: "always" }).format(-Number(amount), unit as Intl.RelativeTimeFormatUnit);
}
export function PostedAge({ value, lang }: { value?: string | null; lang: string }) {
  const now = useSyncExternalStore<number | null>(subscribe, snapshot, serverSnapshot);
  const label = now === null ? "" : formatPostedAge(value, lang, now);
  return label ? <span className="block text-[10px] font-normal text-[#8B867D]">{label}</span> : null;
}
