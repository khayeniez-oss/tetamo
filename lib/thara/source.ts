import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentSource, PublicRow } from "./knowledge";
export function contentSource(db: SupabaseClient): ContentSource {
  return { async read(table) {
    const rows: PublicRow[] = [];
    const fields = table === "faq_entries"
      ? "id,slug,question_en,question_id,answer_en,answer_id,is_published"
      : table === "blogs"
      ? "id,slug,title,title_id,excerpt,excerpt_id,content,content_id,status,access_type,published_at"
      : "id,slug,title,title_id,description,description_id,status,access_type,published_at";
    // Paginate instead of dropping new FAQs beyond an arbitrary top-60 window.
    for (let offset = 0; offset < 20000; offset += 500) {
      let query = db.from(table).select(fields).order("id").range(offset, offset + 499);
      query = table === "faq_entries" ? query.eq("is_published", true) : query.eq("status", "published").eq("access_type", "public").or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`);
      const { data, error } = await query;
      if (error) throw new Error(`Public content unavailable: ${table}`);
      rows.push(...data as unknown as PublicRow[]);
      if (!data || data.length < 500) return rows;
    }
    throw new Error("Content exceeds retrieval budget"); // Fail closed, never silently omit new FAQs.
  } };
}
