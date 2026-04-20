"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { ChevronDown, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AgentListingDraftProvider } from "./AgentListingDraftContext";

type AgentProfile = {
  name: string;
  role: string;
  number: string;
  photo: string;
  email: string;
  userId: string | null;
  agency: string;
  address: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  youtube: string;
  linkedin: string;
};

type AgentProfileContextType = {
  agent: AgentProfile;
  setAgent: Dispatch<SetStateAction<AgentProfile>>;
  userId: string | null;
  loadingProfile: boolean;
  hasActiveMembership: boolean;
  membershipEndsAt: string | null;
  loadingMembership: boolean;
  isAgentAccount: boolean;
  membershipPackageName: string;
  membershipListingLimit: number;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  role: string | null;
  phone: string | null;
  agency: string | null;
  address: string | null;
  photo_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  linkedin_url: string | null;
};

type AgentMembershipRow = {
  id: string;
  user_id: string | null;
  payment_id: string | null;
  package_id: string | null;
  package_name: string | null;
  billing_cycle: string | null;
  listing_limit: number | null;
  status: string | null;
  auto_renew: boolean | null;
  starts_at: string | null;
  expires_at: string | null;
  metadata: Record<string, any> | null;
  created_at: string | null;
  updated_at: string | null;
};

type SocialLink = {
  key: "instagram" | "facebook" | "tiktok" | "youtube" | "linkedin";
  label: string;
  href: string;
};

type SectionKey = "overview" | "membership" | "support";

const DEFAULT_AGENT: AgentProfile = {
  name: "Tetamo Agent",
  role: "Property Agent",
  number: "",
  photo:
    "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=300&q=80",
  email: "",
  userId: null,
  agency: "",
  address: "",
  instagram: "",
  facebook: "",
  tiktok: "",
  youtube: "",
  linkedin: "",
};

const ALLOWED_WITHOUT_MEMBERSHIP = [
  "/agentdashboard/paket",
  "/agentdashboard/pembayaran",
  "/agentdashboard/tagihan",
  "/agentdashboard/pengaturan",
];

const AgentProfileContext = createContext<AgentProfileContextType | null>(null);

export function useAgentProfile() {
  const ctx = useContext(AgentProfileContext);

  if (!ctx) {
    throw new Error("useAgentProfile must be used inside AgentDashboardLayout");
  }

  return ctx;
}

function normalizeSocialUrl(value: string) {
  const trimmed = String(value || "").trim();

  if (!trimmed) return "";

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:")
  ) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function isMembershipActive(membership: AgentMembershipRow | null) {
  if (!membership) return false;
  if (membership.status !== "active") return false;

  if (!membership.expires_at) return true;

  const expiresAt = new Date(membership.expires_at);
  if (Number.isNaN(expiresAt.getTime())) return true;

  return expiresAt.getTime() >= Date.now();
}

function getMembershipListingLimit(membership: AgentMembershipRow | null) {
  if (!membership) return 0;

  const direct = Number(membership.listing_limit || 0);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const metadataLimit =
    Number(membership.metadata?.listing_limit || 0) ||
    Number(membership.metadata?.listingLimit || 0) ||
    Number(membership.metadata?.active_listing_limit || 0) ||
    Number(membership.metadata?.activeListingLimit || 0);

  if (Number.isFinite(metadataLimit) && metadataLimit > 0) {
    return metadataLimit;
  }

  return 0;
}

function formatMembershipDate(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function isAllowedWithoutMembership(pathname: string | null) {
  const current = pathname || "/agentdashboard";

  return ALLOWED_WITHOUT_MEMBERSHIP.some((path) => {
    return current === path || current.startsWith(`${path}/`);
  });
}

export default function AgentDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [agent, setAgent] = useState<AgentProfile>(DEFAULT_AGENT);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingMembership, setLoadingMembership] = useState(true);
  const [hasActiveMembership, setHasActiveMembership] = useState(false);
  const [membershipEndsAt, setMembershipEndsAt] = useState<string | null>(null);
  const [membershipPackageName, setMembershipPackageName] = useState("");
  const [membershipListingLimit, setMembershipListingLimit] = useState(0);
  const [isAgentAccount, setIsAgentAccount] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    overview: true,
    membership: false,
    support: false,
  });

  function baseMenuItemClass(href: string) {
    return [
      "block rounded-2xl px-4 py-3 text-sm transition",
      pathname === href
        ? "bg-white/10 text-white font-semibold"
        : "text-white/85 hover:bg-white/10 hover:text-white",
    ].join(" ");
  }

  function lockedMenuItemClass() {
    return [
      "flex items-center justify-between rounded-2xl px-4 py-3 text-sm transition",
      "text-white/45 hover:bg-white/5",
    ].join(" ");
  }

  function toggleSection(section: SectionKey) {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }

  useEffect(() => {
    let ignore = false;

    async function loadAgentProfileAndMembership() {
      setLoadingProfile(true);
      setLoadingMembership(true);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (ignore) return;

        const user = session?.user ?? null;

        if (!user) {
          setAgent(DEFAULT_AGENT);
          setIsAgentAccount(false);
          setHasActiveMembership(false);
          setMembershipEndsAt(null);
          setMembershipPackageName("");
          setMembershipListingLimit(0);
          setLoadingProfile(false);
          setLoadingMembership(false);
          setHasCheckedAuth(true);
          return;
        }

        const profileRes = await supabase
          .from("profiles")
          .select(
            "id, full_name, role, phone, agency, address, photo_url, instagram_url, facebook_url, tiktok_url, youtube_url, linkedin_url"
          )
          .eq("id", user.id)
          .maybeSingle();

        if (ignore) return;

        const profile = (profileRes.data as ProfileRow | null) ?? null;
        const role = String(profile?.role || "").toLowerCase();
        const agentAccount = role === "agent";

        setAgent({
          name:
            profile?.full_name ||
            user.user_metadata?.full_name ||
            "Tetamo Agent",
          role: agentAccount
            ? "Property Agent"
            : profile?.role
            ? String(profile.role)
            : "Property Agent",
          number: profile?.phone || "",
          photo: profile?.photo_url || DEFAULT_AGENT.photo,
          email: user.email || "",
          userId: user.id,
          agency: profile?.agency || "",
          address: profile?.address || "",
          instagram: profile?.instagram_url || "",
          facebook: profile?.facebook_url || "",
          tiktok: profile?.tiktok_url || "",
          youtube: profile?.youtube_url || "",
          linkedin: profile?.linkedin_url || "",
        });

        setIsAgentAccount(agentAccount);
        setLoadingProfile(false);

        if (!agentAccount) {
          setHasActiveMembership(false);
          setMembershipEndsAt(null);
          setMembershipPackageName("");
          setMembershipListingLimit(0);
          setLoadingMembership(false);
          setHasCheckedAuth(true);
          return;
        }

        const membershipRes = await supabase
          .from("agent_memberships")
          .select(
            "id, user_id, payment_id, package_id, package_name, billing_cycle, listing_limit, status, auto_renew, starts_at, expires_at, metadata, created_at, updated_at"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (ignore) return;

        if (membershipRes.error) {
          throw membershipRes.error;
        }

        const membershipRows =
          (membershipRes.data || []) as AgentMembershipRow[];

        const activeMembership =
          membershipRows.find((membership) => isMembershipActive(membership)) ||
          null;

        setHasActiveMembership(Boolean(activeMembership));
        setMembershipEndsAt(activeMembership?.expires_at || null);
        setMembershipPackageName(activeMembership?.package_name || "");
        setMembershipListingLimit(getMembershipListingLimit(activeMembership));
        setLoadingMembership(false);
        setHasCheckedAuth(true);
      } catch {
        if (ignore) return;

        setAgent(DEFAULT_AGENT);
        setIsAgentAccount(false);
        setHasActiveMembership(false);
        setMembershipEndsAt(null);
        setMembershipPackageName("");
        setMembershipListingLimit(0);
        setLoadingProfile(false);
        setLoadingMembership(false);
        setHasCheckedAuth(true);
      }
    }

    loadAgentProfileAndMembership();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;

      if (!user) {
        setAgent(DEFAULT_AGENT);
        setIsAgentAccount(false);
        setHasActiveMembership(false);
        setMembershipEndsAt(null);
        setMembershipPackageName("");
        setMembershipListingLimit(0);
        setLoadingProfile(false);
        setLoadingMembership(false);
        setHasCheckedAuth(true);
        return;
      }

      loadAgentProfileAndMembership();
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, []);

  const socialLinks = useMemo<SocialLink[]>(() => {
    const links: SocialLink[] = [];

    const instagram = normalizeSocialUrl(agent.instagram);
    const facebook = normalizeSocialUrl(agent.facebook);
    const tiktok = normalizeSocialUrl(agent.tiktok);
    const youtube = normalizeSocialUrl(agent.youtube);
    const linkedin = normalizeSocialUrl(agent.linkedin);

    if (instagram) {
      links.push({ key: "instagram", label: "Instagram", href: instagram });
    }

    if (facebook) {
      links.push({ key: "facebook", label: "Facebook", href: facebook });
    }

    if (tiktok) {
      links.push({ key: "tiktok", label: "TikTok", href: tiktok });
    }

    if (youtube) {
      links.push({ key: "youtube", label: "YouTube", href: youtube });
    }

    if (linkedin) {
      links.push({ key: "linkedin", label: "LinkedIn", href: linkedin });
    }

    return links;
  }, [
    agent.instagram,
    agent.facebook,
    agent.tiktok,
    agent.youtube,
    agent.linkedin,
  ]);

  const contextValue = useMemo<AgentProfileContextType>(
    () => ({
      agent,
      setAgent,
      userId: agent.userId,
      loadingProfile,
      hasActiveMembership,
      membershipEndsAt,
      loadingMembership,
      isAgentAccount,
      membershipPackageName,
      membershipListingLimit,
    }),
    [
      agent,
      loadingProfile,
      hasActiveMembership,
      membershipEndsAt,
      loadingMembership,
      isAgentAccount,
      membershipPackageName,
      membershipListingLimit,
    ]
  );

  const isLoadingState = !hasCheckedAuth || loadingProfile || loadingMembership;
  const currentPath = pathname || "/agentdashboard";

  useEffect(() => {
    if (!hasCheckedAuth || loadingProfile || loadingMembership) return;

    if (!agent.userId) {
      router.replace(
        `/login?role=agent&next=${encodeURIComponent(
          pathname || "/agentdashboard"
        )}`
      );
      return;
    }

    if (isAgentAccount && !hasActiveMembership && !isAllowedWithoutMembership(pathname)) {
      router.replace("/agentdashboard/paket");
    }
  }, [
    pathname,
    router,
    hasCheckedAuth,
    loadingProfile,
    loadingMembership,
    agent.userId,
    isAgentAccount,
    hasActiveMembership,
  ]);

  function renderMenuLink(
    href: string,
    label: string,
    options?: { requiresMembership?: boolean }
  ) {
    const locked =
      Boolean(options?.requiresMembership) &&
      isAgentAccount &&
      !hasActiveMembership;

    if (locked) {
      return (
        <Link href="/agentdashboard/paket" className={lockedMenuItemClass()}>
          <span>{label}</span>
          <Lock className="h-3.5 w-3.5" />
        </Link>
      );
    }

    return (
      <Link href={href} className={baseMenuItemClass(href)}>
        {label}
      </Link>
    );
  }

  if (!isLoadingState && agent.userId && !isAgentAccount) {
    return (
      <AgentProfileContext.Provider value={contextValue}>
        <AgentListingDraftProvider>
          <main className="min-h-screen bg-[#F7F7F7] px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700">
                <Lock className="h-7 w-7" />
              </div>

              <h1 className="mt-5 text-xl font-bold text-[#1C1C1E] sm:text-2xl">
                Agent Account Required
              </h1>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                This dashboard is only available for users registered as Tetamo
                agents.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-[#1C1C1E] px-5 py-3 text-sm font-semibold text-white sm:w-auto"
                >
                  Back to Home
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.push("/login?role=agent");
                    router.refresh();
                  }}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-[#1C1C1E] sm:w-auto"
                >
                  Login as Agent
                </button>
              </div>
            </div>
          </main>
        </AgentListingDraftProvider>
      </AgentProfileContext.Provider>
    );
  }

  return (
    <AgentProfileContext.Provider value={contextValue}>
      <AgentListingDraftProvider>
        <div className="min-h-screen bg-[#F7F7F7] p-4 sm:p-5 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:gap-8">
            <aside
              className="
                w-full
                lg:w-72
                lg:min-h-screen
                rounded-[2rem]
                bg-[#17171A]
                px-4 py-5
                sm:px-5 sm:py-6
                lg:px-6 lg:py-7
                text-white
                shadow-[0_20px_60px_rgba(0,0,0,0.35)]
                ring-1 ring-white/10
                flex flex-col
              "
            >
              <div className="flex items-start gap-4 lg:flex-col lg:items-start lg:gap-0">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[1.4rem] border border-white/10 bg-white/10 sm:h-28 sm:w-28 lg:h-32 lg:w-32">
                  <img
                    src={agent.photo}
                    alt={agent.name}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1 lg:mt-5 lg:w-full">
                  <p className="text-xl font-bold tracking-tight sm:text-2xl">
                    {agent.name}
                  </p>

                  <p className="mt-1 text-base font-semibold text-white/95">
                    {agent.role}
                  </p>

                  {agent.agency ? (
                    <p className="mt-1 text-sm text-white/70">{agent.agency}</p>
                  ) : null}

                  <p className="mt-2 text-sm font-medium text-white/95">
                    {agent.number || "-"}
                  </p>

                  <p className="mt-2 break-all text-xs text-white/60">
                    {agent.email || "-"}
                  </p>

                  {socialLinks.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {socialLinks.map((item) => (
                        <a
                          key={item.key}
                          href={item.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium leading-none text-white transition hover:bg-white/15"
                        >
                          {item.label}
                        </a>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    {isLoadingState ? (
                      <div className="text-xs text-white/60">
                        Checking membership...
                      </div>
                    ) : hasActiveMembership ? (
                      <>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
                          Membership Active
                        </p>
                        <p className="mt-1 text-sm text-white/90">
                          {membershipPackageName || "Agent package active"}
                        </p>
                        <p className="mt-1 text-xs text-white/60">
                          {membershipListingLimit > 0
                            ? `${membershipListingLimit} active listings`
                            : "Listing access unlocked"}
                        </p>
                        <p className="mt-1 text-xs text-white/60">
                          Active until {formatMembershipDate(membershipEndsAt)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-yellow-300">
                          Membership Inactive
                        </p>
                        <p className="mt-1 text-sm text-white/90">
                          Choose a package to unlock listing access
                        </p>
                        <Link
                          href="/agentdashboard/paket"
                          className="mt-3 inline-flex rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#17171A] transition hover:opacity-90"
                        >
                          View Packages
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="my-5 border-t border-white/10 lg:my-7" />

              <nav className="space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-2 lg:border-0 lg:bg-transparent lg:p-0">
                  <button
                    type="button"
                    onClick={() => toggleSection("overview")}
                    className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left"
                  >
                    <span className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                      Overview
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-white/55 transition lg:hidden ${
                        openSections.overview ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <div
                    className={`space-y-2 px-1 pb-1 ${
                      openSections.overview ? "block" : "hidden"
                    } lg:block`}
                  >
                    {renderMenuLink("/agentdashboard", "Dashboard", {
                      requiresMembership: true,
                    })}
                    {renderMenuLink(
                      "/agentdashboard/listing-saya",
                      "Listing Saya",
                      { requiresMembership: true }
                    )}
                    {renderMenuLink("/agentdashboard/leads", "Leads", {
                      requiresMembership: true,
                    })}
                    {renderMenuLink(
                      "/agentdashboard/jadwal-viewing",
                      "Jadwal Viewing",
                      { requiresMembership: true }
                    )}
                    {renderMenuLink(
                      "/agentdashboard/propertilokasi",
                      "Buat Iklan",
                      { requiresMembership: true }
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-2 lg:border-0 lg:bg-transparent lg:p-0">
                  <button
                    type="button"
                    onClick={() => toggleSection("membership")}
                    className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left"
                  >
                    <span className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                      Membership
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-white/55 transition lg:hidden ${
                        openSections.membership ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <div
                    className={`space-y-2 px-1 pb-1 ${
                      openSections.membership ? "block" : "hidden"
                    } lg:block`}
                  >
                    {renderMenuLink("/agentdashboard/paket", "Paket")}
                    {renderMenuLink("/agentdashboard/tagihan", "Tagihan")}
                    {renderMenuLink("/agentdashboard/komisi", "Komisi", {
                      requiresMembership: true,
                    })}
                    {renderMenuLink("/agentdashboard/sukses", "Sukses", {
                      requiresMembership: true,
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-2 lg:border-0 lg:bg-transparent lg:p-0">
                  <button
                    type="button"
                    onClick={() => toggleSection("support")}
                    className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left"
                  >
                    <span className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                      Support
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-white/55 transition lg:hidden ${
                        openSections.support ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <div
                    className={`space-y-2 px-1 pb-1 ${
                      openSections.support ? "block" : "hidden"
                    } lg:block`}
                  >
                    {renderMenuLink("/agentdashboard/pengaturan", "Pengaturan")}
                    <button
                      type="button"
                      onClick={async () => {
                        await supabase.auth.signOut();
                        router.push("/");
                        router.refresh();
                      }}
                      className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm text-white/85 transition hover:bg-white/10 hover:text-white"
                    >
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </nav>
            </aside>

            <main className="min-w-0 flex-1">{children}</main>
          </div>
        </div>
      </AgentListingDraftProvider>
    </AgentProfileContext.Provider>
  );
}