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
import { ChevronDown } from "lucide-react";
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

type NavItem = {
  href: string;
  label: string;
  badgeCount?: number;
};

type NavSection = {
  key: string;
  title: string;
  items: NavItem[];
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
    <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#1C1C1E] sm:min-w-[24px] sm:text-[11px]">
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

  function isActive(href: string) {
    return pathname === href;
  }

  function sidebarLinkClass(href: string) {
    return [
      "flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm transition",
      isActive(href)
        ? "bg-white text-[#1C1C1E] font-semibold shadow-sm"
        : "text-white/85 hover:bg-white/10 hover:text-white",
    ].join(" ");
  }

  function mobileLinkClass(href: string) {
    return [
      "flex min-h-[54px] items-center justify-between gap-2 rounded-[22px] border px-4 py-3 text-left text-[13px] font-medium transition sm:text-sm",
      isActive(href)
        ? "border-white bg-white text-[#1C1C1E] shadow-sm"
        : "border-white/10 bg-white/5 text-white/90 hover:bg-white/10",
    ].join(" ");
  }

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

  const navSections = useMemo<NavSection[]>(
    () => [
      {
        key: "overview",
        title: "Overview",
        items: [
          { href: "/admindashboard", label: "Dashboard" },
          { href: "/admindashboard/analytics", label: "Analytics" },
        ],
      },
      {
        key: "marketplace",
        title: "Marketplace",
        items: [
          { href: "/admindashboard/listings", label: "Listings" },
          {
            href: "/admindashboard/leads",
            label: "Leads",
            badgeCount: newLeadsCount,
          },
          { href: "/admindashboard/viewings", label: "Viewings" },
          { href: "/admindashboard/owners", label: "Owners" },
          { href: "/admindashboard/agents", label: "Agents" },
          {
            href: "/admindashboard/approvals",
            label: "Approvals",
            badgeCount: pendingApprovalsCount,
          },
        ],
      },
      {
        key: "revenue",
        title: "Revenue",
        items: [
          { href: "/admindashboard/sales", label: "Sales" },
          { href: "/admindashboard/payments", label: "Payments" },
          { href: "/admindashboard/invoices", label: "Invoices" },
          { href: "/admindashboard/receipts", label: "Receipts" },
          { href: "/admindashboard/pricing-plans", label: "Pricing Plans" },
          {
            href: "/admindashboard/revenue-analytics",
            label: "Revenue Analytics",
          },
        ],
      },
      {
        key: "content",
        title: "Content",
        items: [
          { href: "/admindashboard/blogs", label: "Blogs" },
          { href: "/admindashboard/education", label: "Education" },
          {
            href: "/admindashboard/notifications",
            label: "Notifications",
            badgeCount: adminNotificationCount,
          },
          { href: "/admindashboard/seo", label: "SEO" },
        ],
      },
      {
        key: "platform",
        title: "Platform",
        items: [
          { href: "/admindashboard/support", label: "Support" },
          { href: "/admindashboard/settings", label: "Settings" },
          { href: "/admindashboard/logs", label: "Logs" },
          { href: "/admindashboard/ai-insights", label: "AI Insights" },
          {
            href: "/admindashboard/buyer-requests",
            label: "Buyer Requests",
            badgeCount: newBuyerRequestsCount,
          },
        ],
      },
    ],
    [
      adminNotificationCount,
      newLeadsCount,
      pendingApprovalsCount,
      newBuyerRequestsCount,
    ]
  );

  function getActiveSectionKey(sections: NavSection[], currentPath: string) {
    const found = sections.find((section) =>
      section.items.some((item) => item.href === currentPath)
    );

    return found?.key ?? sections[0]?.key ?? "overview";
  }

  const [openMobileSectionKey, setOpenMobileSectionKey] = useState<string | null>(
  getActiveSectionKey(navSections, pathname)
);

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
    const activeKey = getActiveSectionKey(navSections, pathname);
    setOpenMobileSectionKey(activeKey);
  }, [pathname, navSections]);

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

  const socialLinks = [
    {
      href: "https://www.instagram.com/tetamoid/",
      label: "Instagram",
    },
    {
      href: "https://facebook.com/tetamoindonesia",
      label: "Facebook",
    },
    {
      href: "https://tiktok.com/@tetamo.com",
      label: "TikTok",
    },
  ];

  function renderProfileBlock(compact = false) {
    return (
      <div>
        <div className={compact ? "flex items-start gap-3" : "flex flex-col"}>
          <div
            className={
              compact
                ? "h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/10"
                : "mb-5 h-24 w-24 overflow-hidden rounded-2xl border border-white/10 bg-white/10"
            }
          >
            <img
              src={admin.photo}
              alt={admin.name}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="min-w-0">
            <p
              className={
                compact
                  ? "text-lg font-semibold tracking-tight text-white"
                  : "text-xl font-semibold tracking-tight text-white"
              }
            >
              {admin.name}
            </p>

            <p className="mt-1 text-sm text-white/75">{admin.role}</p>

            <p className="mt-2 text-sm text-white/90">{admin.number || "-"}</p>

            <p className="mt-2 break-all text-xs text-white/55">
              {admin.email || "-"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {socialLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] text-white/85 transition hover:bg-white/20"
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    );
  }

  function renderDesktopNav() {
    return (
      <nav className="mt-6 space-y-6">
        {navSections.map((section) => (
          <div key={section.key}>
            <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/35">
              {section.title}
            </p>

            <div className="space-y-1.5">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={sidebarLinkClass(item.href)}
                >
                  <span>{item.label}</span>
                  <SidebarBadge
                    count={item.badgeCount ?? 0}
                    hidden={isActive(item.href)}
                  />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    );
  }

  function renderMobileAccordionNav() {
    return (
      <div className="mt-5 space-y-3">
        {navSections.map((section) => {
          const isOpen = openMobileSectionKey === section.key;
          const hasActiveItem = section.items.some((item) => isActive(item.href));

          return (
            <div
              key={section.key}
              className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03]"
            >
              <button
                type="button"
                onClick={() =>
                  setOpenMobileSectionKey((prev) =>
                    prev === section.key ? null : section.key
                  )
                }
                className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition ${
                  hasActiveItem ? "bg-white/10" : "bg-transparent hover:bg-white/5"
                }`}
              >
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
                  {section.title}
                </span>

                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-white/70 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isOpen ? (
                <div className="border-t border-white/10 px-4 py-4">
                  <div className="grid grid-cols-2 gap-2">
                    {section.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={mobileLinkClass(item.href)}
                      >
                        <span className="leading-5">{item.label}</span>
                        <SidebarBadge
                          count={item.badgeCount ?? 0}
                          hidden={isActive(item.href)}
                        />
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <AdminProfileContext.Provider
      value={{ admin, setAdmin, platformSettings, setPlatformSettings }}
    >
      <div className="min-h-screen bg-[#F7F7F7] px-4 py-4 sm:px-6 sm:py-6 xl:px-8 xl:py-8">
        <div className="xl:flex xl:items-start xl:gap-6">
          <aside className="hidden xl:flex xl:w-[300px] xl:shrink-0 xl:flex-col">
            <div className="sticky top-6 rounded-[28px] bg-[#1C1C1E] px-6 py-6 text-white shadow-[0_20px_60px_rgba(0,0,0,0.28)] ring-1 ring-white/10">
              {renderProfileBlock(false)}
              <div className="my-6 border-t border-white/10" />
              {renderDesktopNav()}
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-5 xl:hidden">
              <div className="rounded-[28px] bg-[#1C1C1E] px-4 py-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.22)] ring-1 ring-white/10 sm:px-5 sm:py-6">
                {renderProfileBlock(true)}
                <div className="my-5 border-t border-white/10" />
                {renderMobileAccordionNav()}
              </div>
            </div>

            <main className="min-w-0">{children}</main>
          </div>
        </div>
      </div>
    </AdminProfileContext.Provider>
  );
}