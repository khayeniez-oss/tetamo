import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FEATURED_NAMES = [
  "Aprianadh",
  "Ir. Gunawan",
  "Jake Wawan Putra",
] as const;

const headers = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function isAgentRole(value: unknown) {
  const role = String(value || "").toLowerCase();
  return role.includes("agent") || role.includes("agen");
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { error: "Server configuration unavailable" },
      { status: 503, headers }
    );
  }

  try {
    // Server-only credential. Never return the service role key.
    const db = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Three fixed public picks. No user-supplied search or IDs.
    const lookups = await Promise.all(
      FEATURED_NAMES.map((name) =>
        db
          .from("profiles")
          .select(
            "id,full_name,photo_url,agency,role,instagram_url,facebook_url,tiktok_url,linkedin_url"
          )
          .ilike("full_name", name)
          .limit(3)
      )
    );

    if (lookups.some((result) => result.error)) {
      console.error("Featured agent profile lookup failed");
      return NextResponse.json(
        { error: "Unable to load agents" },
        { status: 503, headers }
      );
    }

    const selected = lookups
      .map((result) =>
        (result.data || []).find((p) => isAgentRole(p.role))
      )
      .filter((p) => p != null);

    // Only published, verified listings can supply
    // public-facing contact details.
    const ids = selected.map((p) => p.id);
    let listings: Array<{
      contact_user_id: string | null;
      contact_phone: string | null;
      city: string | null;
      province: string | null;
      is_paused: boolean | null;
      listing_expires_at: string | null;
      transaction_status: string | null;
    }> = [];

    if (ids.length > 0) {
      const result = await db
        .from("properties")
        .select(
          "contact_user_id,contact_phone,city,province,is_paused,listing_expires_at,transaction_status"
        )
        .in("contact_user_id", ids)
        .eq("status", "active")
        .or("verification_status.eq.verified,verified_ok.eq.true")
        .order("created_at", { ascending: false })
        .limit(100);

      if (result.error) {
        console.error("Public listing contact lookup failed");
      } else {
        listings = (result.data || []).filter((listing) => {
          if (listing.is_paused) return false;

          const status = String(
            listing.transaction_status || ""
          ).toLowerCase();

          if (status === "sold" || status === "rented") {
            return false;
          }

          if (
            listing.listing_expires_at &&
            new Date(listing.listing_expires_at).getTime() <= Date.now()
          ) {
            return false;
          }

          return true;
        });
      }
    }

    const agents = selected.map((profile) => {
      const listing = listings.find(
        (item) => item.contact_user_id === profile.id
      );

      return {
        id: profile.id,
        full_name: profile.full_name,
        photo_url: profile.photo_url,
        agency: profile.agency,
        address: listing?.city || listing?.province || "Indonesia",
        phone: listing?.contact_phone || null,
        role: "agent",
        instagram_url: profile.instagram_url,
        facebook_url: profile.facebook_url,
        tiktok_url: profile.tiktok_url,
        linkedin_url: profile.linkedin_url,
      };
    });

    return NextResponse.json({ agents }, { headers });
  } catch (error) {
    console.error("Featured agents endpoint failed", error);
    return NextResponse.json(
      { error: "Unable to load agents" },
      { status: 500, headers }
    );
  }
}
