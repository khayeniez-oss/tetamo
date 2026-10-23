import { TETAMO_PARTNER_LINKS } from "../../app/data/tetamo-app-links";
import { createHash } from "node:crypto";
import { OWNER_PACKAGES, AGENT_PACKAGES } from "../../app/data/pricelist";
import { TETAMO_PRODUCT_FEATURES } from "../../app/data/tetamo-product";
import { TETAMO_KNOWLEDGE } from "../../app/data/tetamo-knowledge";
import { translateExact } from "./localization";
import type { Fact, Knowledge, Package } from "./types";
import { safeUrl } from "./engine";

export const PARTNER = TETAMO_PARTNER_LINKS;
export type PublicRow = Record<string, unknown>;
export interface ContentSource { read(table: "faq_entries" | "blogs" | "education_videos"): Promise<PublicRow[]> }
const str = (v: unknown) => typeof v === "string" ? v.trim() : "";
function clean(v: unknown): string { return str(v).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 3500); }
export function published(row: PublicRow, kind: "faq" | "article", now: number): boolean {
  if (kind === "faq") return row.is_published === true;
  const date = row.published_at == null ? 0 : Date.parse(String(row.published_at));
  return row.status === "published" && row.access_type === "public" && Number.isFinite(date) && date <= now;
}
export async function loadKnowledge(source: ContentSource, packages: Package[] = [...OWNER_PACKAGES, ...AGENT_PACKAGES], now = Date.now()): Promise<Knowledge> {
  const unavailable: string[] = [];
  const facts: Fact[] = [];
  // Never cache public visibility. Re-read every turn; unpublishing takes effect immediately.
  for (const table of ["faq_entries", "blogs", "education_videos"] as const) {
    try {
      const rows = await source.read(table);
      const kind = table === "faq_entries" ? "faq" : "article";
      for (const row of rows) {
        if (!published(row, kind, now)) continue;
        const slug = encodeURIComponent(str(row.slug));
        const url = kind === "faq" ? "https://www.tetamo.com/faq" : `https://www.tetamo.com/${table === "blogs" ? "blog" : "education"}/${slug}`;
        const en = clean(kind === "faq" ? row.answer_en : row.content || row.excerpt || row.description);
        const idText = clean(kind === "faq" ? row.answer_id : row.content_id || row.excerpt_id || row.description_id);
        if ((!en && !idText) || kind === "article" && !slug || !safeUrl(url)) continue;
        facts.push({ id: `${table}:${str(row.id)}`, kind, title: clean([row.question_en || row.title, row.question_id || row.title_id].filter(Boolean).join(" / ")), en, idText, url });
      }
    } catch { unavailable.push(table); }
  }
  // Only public, live feature summaries. Never expose Mona instructions, internal_only or planned features.
  for (const f of TETAMO_PRODUCT_FEATURES) {
    if (f.status !== "live") continue;
    const publicFacts = f.facts.filter(s => !/\b(mona|should|do not|unless|approved|internal)\b/i.test(s));
    const en = [f.summary, f.customerValue, ...publicFacts].join(" ");
    // An untranslated feature is discoverable, but not returned as an Indonesian answer.
    facts.push({ id: `product:${f.id}`, kind: "product", title: f.name, aliases: f.aliases, en, idText: translateExact(publicFacts), url: "https://www.tetamo.com" });
  }
  for (const role of ["owner", "agent"] as const) {
    const section = TETAMO_KNOWLEDGE.find(s => s.id === `how-${role}-listings-work`);
    if (!section) continue;
    const steps = section.facts.filter(line => new RegExp(role === "owner" ? "^Step (1|2|3|8):" : "^Step (1|2|3|4):").test(line));
    if (steps.length !== 4) continue;
    facts.push({ id: `journey:${role}`, kind: "product", title: `${role} registration and listing`, en: steps.slice(1).map(s => s.replace(/^Step \d+: /, "").split("; do not direct")[0]).join("\n"), idText: translateExact(steps.slice(1)), url: `https://www.tetamo.com/${role === "owner" ? "pemilik" : "signup?role=agent"}` });
  }
  const validPackages = packages.filter(p => Number.isInteger(p.priceIdr) && p.priceIdr > 0 && Number.isInteger(p.maxListings) && p.maxListings > 0 && p.durationDays > 0 && Array.isArray(p.features) && Array.isArray(p.featuresEn));
  if (!validPackages.length) unavailable.push("packages");
  const data = { packages: validPackages, facts, partner: PARTNER, unavailable };
  return { ...data, version: createHash("sha256").update(JSON.stringify(data)).digest("hex").slice(0, 16) };
}
