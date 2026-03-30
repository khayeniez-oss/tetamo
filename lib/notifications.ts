import { supabase } from "@/lib/supabase";

type NotificationInput = {
  userId: string;
  relatedUserId?: string | null;
  propertyId?: string | null;
  leadId?: string | null;
  type: string;
  title: string;
  body?: string;
  audience?: "user" | "admin";
  priority?: "low" | "normal" | "high";
};

export async function createNotification(input: NotificationInput) {
  const { error } = await supabase.from("notifications").insert({
    user_id: input.userId,
    related_user_id: input.relatedUserId ?? null,
    property_id: input.propertyId ?? null,
    lead_id: input.leadId ?? null,
    type: input.type,
    title: input.title,
    body: input.body ?? "",
    audience: input.audience ?? "user",
    priority: input.priority ?? "normal",
  });

  if (error) {
    console.error("createNotification error:", error);
    throw error;
  }
}

export async function getAdminUserIds() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin");

  if (error) {
    console.error("getAdminUserIds error:", error);
    return [];
  }

  return (data ?? []).map((x) => x.id as string);
}

export async function notifyAdmins(params: {
  relatedUserId?: string | null;
  propertyId?: string | null;
  leadId?: string | null;
  type: string;
  title: string;
  body?: string;
  priority?: "low" | "normal" | "high";
}) {
  const adminIds = await getAdminUserIds();

  await Promise.all(
    adminIds.map((adminId) =>
      createNotification({
        userId: adminId,
        relatedUserId: params.relatedUserId ?? null,
        propertyId: params.propertyId ?? null,
        leadId: params.leadId ?? null,
        type: params.type,
        title: params.title,
        body: params.body ?? "",
        audience: "admin",
        priority: params.priority ?? "normal",
      })
    )
  );
}