import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
const headers = { "Cache-Control": "public, max-age=60, stale-while-revalidate=120", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request) {
  const ids = [...new Set((new URL(request.url).searchParams.get("ids") || "").split(",").filter(Boolean))];
  if (!ids.length || ids.length > 12 || ids.some(id => !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id))) {
    return NextResponse.json({ error: "Invalid listing IDs" }, { status: 400 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ photos: {} }, { status: 503 });
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  // A public photo is returned only for a currently published, verified listing.
  // Profile IDs, phone numbers, emails and other private profile fields are never returned.
  const result = await db.from("properties").select("id,contact_user_id,user_id,is_paused,listing_expires_at,transaction_status")
    .in("id", ids).eq("status", "active").or("verification_status.eq.verified,verified_ok.eq.true");
  if (result.error) return NextResponse.json({ photos: {} }, { status: 503 });
  const rows = (result.data || []).filter(p => !p.is_paused && (!p.listing_expires_at || new Date(p.listing_expires_at).getTime() > Date.now()) && !["sold", "rented"].includes(String(p.transaction_status || "").toLowerCase()));
  const profileIds = [...new Set(rows.map(p => p.contact_user_id || p.user_id).filter(Boolean))];
  if (!profileIds.length) return NextResponse.json({ photos: {} }, { headers });
  const profiles = await db.from("profiles").select("id,photo_url").in("id", profileIds);
  if (profiles.error) return NextResponse.json({ photos: {} }, { status: 503 });
  const photos: Record<string, string> = {};
  for (const row of rows) {
    const photo = profiles.data?.find(p => p.id === (row.contact_user_id || row.user_id))?.photo_url;
    if (typeof photo === "string" && /^https?:\/\//i.test(photo)) photos[row.id] = photo;
  }
  return NextResponse.json({ photos }, { headers });
}
