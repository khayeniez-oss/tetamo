"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

/* =========================
TYPES
========================= */

type Owner = {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  listings: number;
  leads: number;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  role: string | null;
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

/* =========================
HELPERS
========================= */

function cityFromAddress(address?: string | null) {
  if (!address?.trim()) return "-";
  return address;
}

/* =========================
PAGE
========================= */

export default function AdminOwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let ignore = false;

    async function loadOwners() {
      setLoading(true);
      setLoadError("");

      try {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, phone, email, address, role")
          .eq("role", "owner")
          .order("full_name", { ascending: true });

        if (profilesError) throw profilesError;

        const profiles = (profilesData || []) as ProfileRow[];
        const ownerIds = profiles.map((p) => p.id);

        const propertyCounts = new Map<string, number>();
        const leadCounts = new Map<string, number>();

        if (ownerIds.length > 0) {
          const { data: propertiesData, error: propertiesError } =
            await supabase
              .from("properties")
              .select("id, user_id")
              .in("user_id", ownerIds);

          if (propertiesError) throw propertiesError;

          for (const row of propertiesData || []) {
            const userId = row.user_id as string | null;
            if (!userId) continue;
            propertyCounts.set(userId, (propertyCounts.get(userId) || 0) + 1);
          }

          const { data: leadsData, error: leadsError } = await supabase
            .from("leads")
            .select("id, receiver_user_id")
            .in("receiver_user_id", ownerIds);

          if (leadsError) throw leadsError;

          for (const row of leadsData || []) {
            const receiverUserId = row.receiver_user_id as string | null;
            if (!receiverUserId) continue;
            leadCounts.set(
              receiverUserId,
              (leadCounts.get(receiverUserId) || 0) + 1
            );
          }
        }

        const mapped: Owner[] = profiles.map((profile) => ({
          id: profile.id,
          name: profile.full_name || "Unknown Owner",
          phone: profile.phone || "-",
          email: profile.email || "-",
          city: cityFromAddress(profile.address),
          listings: propertyCounts.get(profile.id) || 0,
          leads: leadCounts.get(profile.id) || 0,
        }));

        if (!ignore) {
          setOwners(mapped);
        }
      } catch (error: any) {
        console.log("FULL ERROR:", error);
        console.log("MESSAGE:", error?.message);
        console.log("DETAILS:", error?.details);
        console.log("HINT:", error?.hint);
        console.log("CODE:", error?.code);

        if (!ignore) {
          setLoadError(
            error?.message ||
              error?.details ||
              error?.hint ||
              "Failed to load owners."
          );
          setOwners([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadOwners();

    return () => {
      ignore = true;
    };
  }, []);

  const filteredOwners = useMemo(() => {
    if (!searchQuery.trim()) return owners;

    const words = searchQuery.toLowerCase().split(" ").filter(Boolean);

    return owners.filter((o) => {
      const searchable = `
        ${o.name}
        ${o.phone}
        ${o.email}
        ${o.city}
      `.toLowerCase();

      return words.every((w) => searchable.includes(w));
    });
  }, [searchQuery, owners]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, owners.length]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOwners.length / ITEMS_PER_PAGE)
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginated = filteredOwners.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const startItem =
    filteredOwners.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;

  const endItem = Math.min(page * ITEMS_PER_PAGE, filteredOwners.length);

  async function deleteOwner(owner: Owner) {
    const confirmed = window.confirm(
      `Delete this owner?\n\n${owner.name}\n${owner.email}\n\nThis will delete:\n- owner profile\n- owner listings\n- property image rows\n- leads received by this owner\n\nThis cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(owner.id);

    try {
      const { data: ownerProperties, error: propertiesReadError } =
        await supabase
          .from("properties")
          .select("id")
          .eq("user_id", owner.id);

      if (propertiesReadError) throw propertiesReadError;

      const propertyIds = (ownerProperties || []).map((p) => p.id);

      if (propertyIds.length > 0) {
        const { error: imageDeleteError } = await supabase
          .from("property_images")
          .delete()
          .in("property_id", propertyIds);

        if (imageDeleteError) throw imageDeleteError;
      }

      const { error: leadsDeleteError } = await supabase
        .from("leads")
        .delete()
        .eq("receiver_user_id", owner.id);

      if (leadsDeleteError) throw leadsDeleteError;

      const { error: propertiesDeleteError } = await supabase
        .from("properties")
        .delete()
        .eq("user_id", owner.id);

      if (propertiesDeleteError) throw propertiesDeleteError;

      const { error: profileDeleteError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", owner.id)
        .eq("role", "owner");

      if (profileDeleteError) throw profileDeleteError;

      setOwners((prev) => prev.filter((o) => o.id !== owner.id));

      setToast({
        type: "success",
        message:
          "Owner data has been deleted. Delete the auth user in Supabase Authentication if needed.",
      });
    } catch (error: any) {
      console.error("Failed to delete owner:", error);
      setToast({
        type: "error",
        message: error?.message || "Failed to delete owner.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      {toast ? (
        <div className="fixed right-6 top-6 z-50">
          <div
            className={[
              "min-w-[320px] rounded-2xl border px-4 py-3 shadow-xl backdrop-blur",
              toast.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800",
            ].join(" ")}
          >
            <p className="text-sm font-semibold">
              {toast.type === "success" ? "Success" : "Something went wrong"}
            </p>
            <p className="mt-1 text-sm">{toast.message}</p>
          </div>
        </div>
      ) : null}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1C1C1E]">
          Owners Management
        </h1>
        <p className="text-sm text-gray-500">
          Monitor and manage property owners.
        </p>
      </div>

      {loadError ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      ) : null}

      <div className="relative mt-6">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
          size={18}
        />

        <input
          type="text"
          placeholder="Cari owner, phone, email, kota..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-2xl border border-gray-400 py-3 pl-12 pr-4 text-sm outline-none placeholder-gray-500 focus:border-[#1C1C1E]"
        />
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Loading owners...
            </div>
          ) : paginated.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No owners found.
            </div>
          ) : (
            paginated.map((owner) => {
              const isDeleting = deletingId === owner.id;

              return (
                <div
                  key={owner.id}
                  className="flex items-center justify-between gap-6 p-6"
                >
                  <div className="min-w-0">
                    <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs text-green-700">
                      Active
                    </span>

                    <p className="mt-2 font-medium text-[#1C1C1E]">
                      {owner.name}
                    </p>

                    <p className="text-sm text-gray-500">
                      {owner.phone} • {owner.email}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">{owner.city}</p>

                    <p className="text-xs text-gray-400">
                      Listings: {owner.listings} • Leads: {owner.leads}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => deleteOwner(owner)}
                      disabled={isDeleting}
                      title="Delete owner"
                      className="rounded-lg border border-red-300 bg-red-600 px-3 py-2 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-gray-900">
          Menampilkan {startItem}–{endItem} dari {filteredOwners.length} owner
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border bg-[#1C1C1E] px-3 py-2 text-white disabled:opacity-50"
          >
            Sebelumnya
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`rounded-lg border px-3 py-2 text-sm ${
                page === p
                  ? "border-black bg-black text-white"
                  : "border-gray-400"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border bg-[#1C1C1E] px-3 py-2 text-white disabled:opacity-50"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
}