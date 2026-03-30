"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import { supabase } from "@/lib/supabase";

type AdminProfile = {
  name: string;
  role: string;
  number: string;
  photo: string;
  email: string;
};

type PlatformSettings = {
  platformName: string;
  supportPhone: string;
  contactEmail: string;
};

type AdminProfileContextType = {
  admin: AdminProfile;
  setAdmin: Dispatch<SetStateAction<AdminProfile>>;
  platformSettings: PlatformSettings;
  setPlatformSettings: Dispatch<SetStateAction<PlatformSettings>>;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  role: string | null;
  phone: string | null;
  photo_url: string | null;
};

type PlatformSettingsRow = {
  id: string;
  platform_name: string | null;
  contact_email: string | null;
  support_phone: string | null;
};

const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  platformName: "Tetamo",
  supportPhone: "",
  contactEmail: "",
};

const DEFAULT_ADMIN: AdminProfile = {
  name: "Tetamo Admin",
  role: "Platform Control Center",
  number: "",
  photo:
    "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=300&q=80",
  email: "",
};

const AdminProfileContext = createContext<AdminProfileContextType | null>(null);

export function useAdminProfile() {
  const ctx = useContext(AdminProfileContext);

  if (!ctx) {
    throw new Error("useAdminProfile must be used inside AdminDashboardLayout");
  }

  return ctx;
}

function SidebarBadge({
  count,
  hidden = false,
}: {
  count: number;
  hidden?: boolean;
}) {
  if (count <= 0 || hidden) return null;

  return (
    <span className="min-w-[24px] h-6 px-2 rounded-full bg-white text-[#1C1C1E] text-xs font-bold flex items-center justify-center">
      {count}
    </span>
  );
}

export default function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  const [admin, setAdmin] = useState<AdminProfile>(DEFAULT_ADMIN);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(
    DEFAULT_PLATFORM_SETTINGS
  );

  const [adminNotificationCount, setAdminNotificationCount] = useState(0);
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [newBuyerRequestsCount, setNewBuyerRequestsCount] = useState(0);

  const menuItemClass = (href: string) =>
    [
      "block px-3 py-3 rounded-xl transition",
      pathname === href
        ? "bg-white/10 text-white font-semibold"
        : "text-white/85 hover:bg-white/10 hover:text-white",
    ].join(" ");

  const menuItemWithBadgeClass = (href: string) =>
    [menuItemClass(href), "flex items-center justify-between gap-3"].join(" ");

  const notificationsMenuClass = useMemo(
    () => menuItemWithBadgeClass("/admindashboard/notifications"),
    [pathname]
  );

  const leadsMenuClass = useMemo(
    () => menuItemWithBadgeClass("/admindashboard/leads"),
    [pathname]
  );

  const approvalsMenuClass = useMemo(
    () => menuItemWithBadgeClass("/admindashboard/approvals"),
    [pathname]
  );

  const buyerRequestsMenuClass = useMemo(
    () => menuItemWithBadgeClass("/admindashboard/buyer-requests"),
    [pathname]
  );

  async function refreshSidebarCounts() {
    try {
      const [
        notificationsResult,
        leadsResult,
        approvalsResult,
        buyerRequestsResult,
      ] = await Promise.all([
        supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("audience", "admin"),

        supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("status", "new"),

        supabase
          .from("properties")
          .select("*", { count: "exact", head: true })
          .or(
            "status.eq.pending,status.eq.pending_approval,verification_status.eq.pending_verification,verification_status.eq.pending_approval"
          ),

        supabase
          .from("buyer_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "NEW"),
      ]);

      if (notificationsResult.error) {
        console.error(
          "Failed to load notifications count:",
          notificationsResult.error
        );
      }

      if (leadsResult.error) {
        console.error("Failed to load leads count:", leadsResult.error);
      }

      if (approvalsResult.error) {
        console.error("Failed to load approvals count:", approvalsResult.error);
      }

      if (buyerRequestsResult.error) {
        console.error(
          "Failed to load buyer requests count:",
          buyerRequestsResult.error
        );
      }

      setAdminNotificationCount(notificationsResult.count ?? 0);
      setNewLeadsCount(leadsResult.count ?? 0);
      setPendingApprovalsCount(approvalsResult.count ?? 0);
      setNewBuyerRequestsCount(buyerRequestsResult.count ?? 0);
    } catch (error) {
      console.error("Unexpected sidebar count refresh error:", error);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadPlatformSettings() {
      try {
        const { data, error } = await supabase
          .from("platform_settings")
          .select("id, platform_name, contact_email, support_phone")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Failed to load platform settings:", error);
          return;
        }

        const row = data as PlatformSettingsRow | null;

        if (!ignore && row) {
          setPlatformSettings({
            platformName: row.platform_name || "Tetamo",
            supportPhone: row.support_phone || "",
            contactEmail: row.contact_email || "",
          });
        }
      } catch (error) {
        console.error("Unexpected platform settings load error:", error);
      }
    }

    loadPlatformSettings();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadAdminProfile() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          console.error("Failed to load auth user:", authError);
          return;
        }

        if (!user) {
          if (!ignore) {
            setAdmin((prev) => ({
              ...prev,
              name: `${platformSettings.platformName} Admin`,
              number: platformSettings.supportPhone || "",
              email: platformSettings.contactEmail || "",
            }));
          }
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, role, phone, photo_url")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Failed to load admin profile:", profileError);
        }

        const profile = profileData as ProfileRow | null;

        if (!ignore) {
          setAdmin({
            name:
              profile?.full_name ||
              user.user_metadata?.full_name ||
              `${platformSettings.platformName} Admin`,
            role:
              profile?.role === "admin"
                ? "Platform Control Center"
                : profile?.role
                ? String(profile.role)
                : "Platform Control Center",
            number: profile?.phone || platformSettings.supportPhone || "",
            photo: profile?.photo_url || DEFAULT_ADMIN.photo,
            email: user.email || platformSettings.contactEmail || "",
          });
        }
      } catch (error) {
        console.error("Unexpected admin profile load error:", error);
      }
    }

    loadAdminProfile();

    return () => {
      ignore = true;
    };
  }, [platformSettings]);

  useEffect(() => {
    refreshSidebarCounts();
  }, [pathname]);

  useEffect(() => {
    function handlePlatformSettingsUpdated(event: Event) {
      const customEvent = event as CustomEvent<{
        platformName?: string;
        supportPhone?: string;
        contactEmail?: string;
      }>;

      const nextPlatformName = customEvent.detail?.platformName || "Tetamo";
      const nextSupportPhone = customEvent.detail?.supportPhone || "";
      const nextContactEmail = customEvent.detail?.contactEmail || "";

      setPlatformSettings({
        platformName: nextPlatformName,
        supportPhone: nextSupportPhone,
        contactEmail: nextContactEmail,
      });

      setAdmin((prev) => ({
        ...prev,
        name:
          !prev.name ||
          prev.name === "Tetamo Admin" ||
          prev.name.endsWith(" Admin")
            ? `${nextPlatformName} Admin`
            : prev.name,
        number: prev.number || nextSupportPhone,
        email: prev.email || nextContactEmail,
      }));
    }

    function handleAdminProfileUpdated(event: Event) {
      const customEvent = event as CustomEvent<{
        photoUrl?: string;
        fullName?: string;
      }>;

      const nextPhotoUrl = customEvent.detail?.photoUrl || DEFAULT_ADMIN.photo;
      const nextFullName = customEvent.detail?.fullName || admin.name;

      setAdmin((prev) => ({
        ...prev,
        photo: nextPhotoUrl,
        name: nextFullName || prev.name,
      }));
    }

    function handleSidebarRefresh() {
      refreshSidebarCounts();
    }

    window.addEventListener(
      "tetamo-platform-settings-updated",
      handlePlatformSettingsUpdated as EventListener
    );

    window.addEventListener(
      "tetamo-admin-profile-updated",
      handleAdminProfileUpdated as EventListener
    );

    window.addEventListener(
      "tetamo-admin-sidebar-refresh",
      handleSidebarRefresh as EventListener
    );

    window.addEventListener(
      "tetamo-buyer-requests-updated",
      handleSidebarRefresh as EventListener
    );

    window.addEventListener(
      "tetamo-leads-updated",
      handleSidebarRefresh as EventListener
    );

    window.addEventListener(
      "tetamo-approvals-updated",
      handleSidebarRefresh as EventListener
    );

    window.addEventListener(
      "tetamo-notifications-updated",
      handleSidebarRefresh as EventListener
    );

    return () => {
      window.removeEventListener(
        "tetamo-platform-settings-updated",
        handlePlatformSettingsUpdated as EventListener
      );

      window.removeEventListener(
        "tetamo-admin-profile-updated",
        handleAdminProfileUpdated as EventListener
      );

      window.removeEventListener(
        "tetamo-admin-sidebar-refresh",
        handleSidebarRefresh as EventListener
      );

      window.removeEventListener(
        "tetamo-buyer-requests-updated",
        handleSidebarRefresh as EventListener
      );

      window.removeEventListener(
        "tetamo-leads-updated",
        handleSidebarRefresh as EventListener
      );

      window.removeEventListener(
        "tetamo-approvals-updated",
        handleSidebarRefresh as EventListener
      );

      window.removeEventListener(
        "tetamo-notifications-updated",
        handleSidebarRefresh as EventListener
      );
    };
  }, [admin.name]);

  useEffect(() => {
    const notificationsChannel = supabase
      .channel("admin-layout-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          refreshSidebarCounts();
        }
      )
      .subscribe();

    const leadsChannel = supabase
      .channel("admin-layout-leads")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leads",
        },
        () => {
          refreshSidebarCounts();
        }
      )
      .subscribe();

    const approvalsChannel = supabase
      .channel("admin-layout-approvals")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "properties",
        },
        () => {
          refreshSidebarCounts();
        }
      )
      .subscribe();

    const buyerRequestsChannel = supabase
      .channel("admin-layout-buyer-requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "buyer_requests",
        },
        () => {
          refreshSidebarCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(approvalsChannel);
      supabase.removeChannel(buyerRequestsChannel);
    };
  }, []);

  return (
    <AdminProfileContext.Provider
      value={{ admin, setAdmin, platformSettings, setPlatformSettings }}
    >
      <div className="min-h-screen bg-[#F7F7F7] p-10">
        <div className="flex">
          <aside
            className="
              w-72
              bg-[#1C1C1E]
              text-white
              min-h-screen
              px-10 py-10
              flex flex-col
              rounded-3xl
              shadow-[0_20px_60px_rgba(0,0,0,0.35)]
              ring-1 ring-white/10
            "
          >
            <div>
              <div className="flex flex-col">
                <div className="w-36 h-36 rounded-xl overflow-hidden bg-white/10 border border-white/10 mb-6">
                  <img
                    src={admin.photo}
                    alt={admin.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div>
                  <p className="font-bold text-2xl mt-1 tracking-tight">
                    {admin.name}
                  </p>
                  <p className="font-bold text-1xl mt-1 tracking-tight">
                    {admin.role}
                  </p>
                  <p className="text-s font-medium mt-1">
                    {admin.number || "-"}
                  </p>
                  <p className="text-xs text-white/60 mt-2 break-all">
                    {admin.email || "-"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <a
                  href="https://www.instagram.com/tetamoid/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition"
                >
                  Instagram
                </a>

                <a
                  href="https://facebook.com/tetamoindonesia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition"
                >
                  Facebook
                </a>

                <a
                  href="https://tiktok.com/@tetamo.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition"
                >
                  TikTok
                </a>
              </div>
            </div>

            <div className="border-t border-white/10 my-8" />

            <nav className="space-y-3 text-base">
              <p className="text-xs uppercase text-white/40 mt-2">Overview</p>

              <Link
                href="/admindashboard"
                className={menuItemClass("/admindashboard")}
              >
                Dashboard
              </Link>

              <Link
                href="/admindashboard/analytics"
                className={menuItemClass("/admindashboard/analytics")}
              >
                Analytics
              </Link>

              <p className="text-xs uppercase text-white/40 mt-6">Marketplace</p>

              <Link
                href="/admindashboard/listings"
                className={menuItemClass("/admindashboard/listings")}
              >
                Listings
              </Link>

              <Link
                href="/admindashboard/leads"
                className={leadsMenuClass}
              >
                <span>Leads</span>
                <SidebarBadge
                  count={newLeadsCount}
                  hidden={pathname === "/admindashboard/leads"}
                />
              </Link>

              <Link
                href="/admindashboard/viewings"
                className={menuItemClass("/admindashboard/viewings")}
              >
                Viewings
              </Link>

              <Link
                href="/admindashboard/owners"
                className={menuItemClass("/admindashboard/owners")}
              >
                Owners
              </Link>

              <Link
                href="/admindashboard/agents"
                className={menuItemClass("/admindashboard/agents")}
              >
                Agents
              </Link>

              <Link
                href="/admindashboard/approvals"
                className={approvalsMenuClass}
              >
                <span>Approvals</span>
                <SidebarBadge
                  count={pendingApprovalsCount}
                  hidden={pathname === "/admindashboard/approvals"}
                />
              </Link>

              <p className="text-xs uppercase text-white/40 mt-6">Revenue</p>

              <Link
                href="/admindashboard/sales"
                className={menuItemClass("/admindashboard/sales")}
              >
                Sales
              </Link>

              <Link
                href="/admindashboard/payments"
                className={menuItemClass("/admindashboard/payments")}
              >
                Payments
              </Link>

              <Link
                href="/admindashboard/invoices"
                className={menuItemClass("/admindashboard/invoices")}
              >
                Invoices
              </Link>

              <Link
                href="/admindashboard/receipts"
                className={menuItemClass("/admindashboard/receipts")}
              >
                Receipts
              </Link>

              <Link
                href="/admindashboard/pricing-plans"
                className={menuItemClass("/admindashboard/pricing-plans")}
              >
                Pricing Plans
              </Link>

              <Link
                href="/admindashboard/revenue-analytics"
                className={menuItemClass("/admindashboard/revenue-analytics")}
              >
                Revenue Analytics
              </Link>

              <p className="text-xs uppercase text-white/40 mt-6">Content</p>

              <Link
                href="/admindashboard/blogs"
                className={menuItemClass("/admindashboard/blogs")}
              >
                Blogs
              </Link>

              <Link
                href="/admindashboard/notifications"
                className={notificationsMenuClass}
              >
                <span>Notifications</span>
                <SidebarBadge
                  count={adminNotificationCount}
                  hidden={pathname === "/admindashboard/notifications"}
                />
              </Link>

              <Link
                href="/admindashboard/seo"
                className={menuItemClass("/admindashboard/seo")}
              >
                SEO
              </Link>

              <p className="text-xs uppercase text-white/40 mt-6">Platform</p>

              <Link
                href="/admindashboard/support"
                className={menuItemClass("/admindashboard/support")}
              >
                Support
              </Link>

              <Link
                href="/admindashboard/settings"
                className={menuItemClass("/admindashboard/settings")}
              >
                Settings
              </Link>

              <Link
                href="/admindashboard/logs"
                className={menuItemClass("/admindashboard/logs")}
              >
                Logs
              </Link>

              <Link
                href="/admindashboard/ai-insights"
                className={menuItemClass("/admindashboard/ai-insights")}
              >
                AI Insights
              </Link>

              <Link
                href="/admindashboard/buyer-requests"
                className={buyerRequestsMenuClass}
              >
                <span>Buyer Requests</span>
                <SidebarBadge
                  count={newBuyerRequestsCount}
                  hidden={pathname === "/admindashboard/buyer-requests"}
                />
              </Link>
            </nav>
          </aside>

          <main className="flex-1 px-10 py-10">{children}</main>
        </div>
      </div>
    </AdminProfileContext.Provider>
  );
}