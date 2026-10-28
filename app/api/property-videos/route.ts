import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  // Anonymous access deliberately preserves the public database policies.
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const fields = "id,slug,title,title_id,video_url,price,sale_price,rent_price,listing_type,rental_type,property_type,city,province,bedrooms,bathrooms,land_size,land_unit,building_size,created_at";
  const query = (timestamp: boolean) => db.from("properties")
    .select(`${fields}${timestamp ? ",video_published_at" : ""}`)
    .not("video_url", "is", null).neq("video_url", "")
    .not("status", "in", "(draft,pending,pending_approval,pending_payment,rejected,expired,archived)")
    .or("verified_ok.eq.true,verification_status.eq.verified")
    .or("is_paused.is.null,is_paused.eq.false")
    .or("transaction_status.is.null,transaction_status.eq.available")
    .or(`listing_expires_at.is.null,listing_expires_at.gt.${new Date().toISOString()}`)
    .order(timestamp ? "video_published_at" : "created_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false }).limit(10);
  let result = await query(true);
  // Compatibility while the separately reviewed timestamp migration is pending.
  if (result.error?.code === "42703") result = await query(false);
  if (result.error) return Response.json({ videos: [], error: "Video feed unavailable" }, { status: 503 });
  const rows = (result.data || []) as unknown as Array<Record<string, unknown> & { id: string }>;
  const { data: images } = rows.length ? await db.from("property_images").select("property_id,image_url,is_cover,sort_order").in("property_id", rows.map(row => row.id)).order("is_cover", { ascending: false, nullsFirst: false }).order("sort_order", { ascending: true }) : { data: [] };
  const posters = new Map<string, string>();
  for (const image of images || []) if (!posters.has(image.property_id)) posters.set(image.property_id, image.image_url);
  return Response.json({ videos: rows.map(row => ({ ...row, poster: posters.get(row.id) || undefined })) }, { headers: { "Cache-Control": "no-store" } });
}
