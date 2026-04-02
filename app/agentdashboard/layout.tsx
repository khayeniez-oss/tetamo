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
import { ChevronDown } from "lucide-react";
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

type SocialLink = {
  key: "instagram" | "facebook" | "tiktok" | "youtube" | "linkedin";
  label: string;
  href: string;
};

type SectionKey = "overview" | "membership" | "support";

type MembershipPaymentRow = {
  id: string;
  status: string | null;
  paid_at: string | null;
  created_at: string | null;
  user_type: string | null;
  product_type: string | null;
  flow: string | null;
  metadata: Record<string, unknown> | null;
};

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

function toPositiveNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function addDaysToIso(dateString: string, days: number) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return null;

  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function resolveMembershipDurationDays(payment: MembershipPaymentRow) {
  const metadata = payment.metadata || {};

  const packageTermDays = toPositiveNumber(metadata.packageTermDays);
  if (packageTermDays) return packageTermDays;

  const selectedBillingCycle = String(metadata.selectedBillingCycle || "").toLowerCase();
  if (selectedBillingCycle === "monthly" || selectedBillingCycle === "yearly") {
    return 365;
  }

  return 365;
}

function resolveMembershipEndDate(payment: MembershipPaymentRow) {
  const baseDate = payment.paid_at || payment.created_at;
  if (!baseDate) return null;

  const durationDays = resolveMembershipDurationDays(payment);
  return addDaysToIso(baseDate, durationDays);
}

function isMembershipPaymentActive(payment: MembershipPaymentRow) {
  const status = String(payment.status || "").toLowerCase();
  if (status !== "paid") return false;

  const endDate = resolveMembershipEndDate(payment);
  if (!endDate) return false;

  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return false;

  return end.getTime() > Date.now();
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
      "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm transition",
      "text-white/45 hover:bg-white/5 hover:text-white/70",
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
          setHasActiveMembership(false);
          setMembershipEndsAt(null);
          setLoadingProfile(false);
          setLoadingMembership(false);
          setHasCheckedAuth(true);
          return;
        }

        const [profileRes, membershipRes] = await Promise.all([
          supabase
            .from("profiles")
            .select(
              "id, full_name, role, phone, agency, address, photo_url, instagram_url, facebook_url, tiktok_url, youtube_url, linkedin_url"
            )
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("payments")
            .select(
              "id, status, paid_at, created_at, user_type, product_type, flow, metadata"
            )
            .eq("user_id", user.id)
            .eq("user_type", "agent")
            .eq("product_type", "membership")
            .order("created_at", { ascending: false })
            .limit(20),
        ]);

        if (ignore) return;

        const profile = (profileRes.data as ProfileRow | null) ?? null;
        const membershipRows = (membershipRes.data || []) as MembershipPaymentRow[];

        const activeMembership =
          membershipRows.find((payment) => isMembershipPaymentActive(payment)) || null;

        setAgent({
          name:
            profile?.full_name ||
            user.user_metadata?.full_name ||
            "Tetamo Agent",
          role:
            profile?.role === "agent"
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

        setHasActiveMembership(Boolean(activeMembership));
        setMembershipEndsAt(
          activeMembership ? resolveMembershipEndDate(activeMembership) : null
        );

        setLoadingProfile(false);
        setLoadingMembership(false);
        setHasCheckedAuth(true);
      } catch {
        if (ignore) return;

        setAgent(DEFAULT_AGENT);
        setHasActiveMembership(false);
        setMembershipEndsAt(null);
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
        setHasActiveMembership(false);
        setMembershipEndsAt(null);
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
    }),
    [agent, loadingProfile, hasActiveMembership, membershipEndsAt, loadingMembership]
  );

  function isRestrictedPathWithoutMembership(path: string) {
    if (hasActiveMembership) return false;

    if (path === "/agentdashboard") return true;
    if (path.startsWith("/agentdashboard/listing-saya")) return true;
    if (path.startsWith("/agentdashboard/leads")) return true;
    if (path.startsWith("/agentdashboard/jadwal-viewing")) return true;
    if (path.startsWith("/agentdashboard/propertilokasi")) return true;
    if (path.startsWith("/agentdashboard/propertidetail")) return true;
    if (path.startsWith("/agentdashboard/deskripsi-foto")) return true;
    if (path.startsWith("/agentdashboard/komisi")) return true;

    return false;
  }

  useEffect(() => {
    if (!hasCheckedAuth || loadingProfile || loadingMembership) return;

    if (!agent.userId) {
      router.replace(
        `/login?role=agent&next=${encodeURIComponent(pathname || "/agentdashboard/paket")}`
      );
      return;
    }

    if (isRestrictedPathWithoutMembership(pathname)) {
      router.replace("/agentdashboard/paket");
    }
  }, [
    pathname,
    router,
    hasCheckedAuth,
    loadingProfile,
    loadingMembership,
    agent.userId,
    hasActiveMembership,
  ]);

  function renderMenuLink(
    href: string,
    label: string,
    options?: { locked?: boolean }
  ) {
    const locked = Boolean(options?.locked);

    if (!locked) {
      return (
        <Link href={href} className={baseMenuItemClass(href)}>
          {label}
        </Link>
      );
    }

    return (
      <button
        type="button"
        onClick={() => router.push("/agentdashboard/paket")}
        className={lockedMenuItemClass()}
      >
        <span>{label}</span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-white/55">
          Lock
        </span>
      </button>
    );
  }

  const isMembershipLocked = !hasActiveMembership;
  const isLoadingState = !hasCheckedAuth || loadingProfile || loadingMembership;

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
                      <div className="text-xs text-white/60">Checking membership...</div>
                    ) : hasActiveMembership ? (
                      <>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
                          Membership Active
                        </p>
                        <p className="mt-1 text-sm text-white/90">
                          Access unlocked
                        </p>
                        <p className="mt-1 text-xs text-white/60">
                          Active until {formatMembershipDate(membershipEndsAt)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-yellow-300">
                          Membership Required
                        </p>
                        <p className="mt-1 text-sm text-white/90">
                          Upgrade to unlock agent tools
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
                      locked: isMembershipLocked,
                    })}
                    {renderMenuLink("/agentdashboard/listing-saya", "Listing Saya", {
                      locked: isMembershipLocked,
                    })}
                    {renderMenuLink("/agentdashboard/leads", "Leads", {
                      locked: isMembershipLocked,
                    })}
                    {renderMenuLink("/agentdashboard/jadwal-viewing", "Jadwal Viewing", {
                      locked: isMembershipLocked,
                    })}
                    {renderMenuLink("/agentdashboard/propertilokasi", "Buat Iklan", {
                      locked: isMembershipLocked,
                    })}
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
                    {renderMenuLink("/agentdashboard/pembayaran", "Pembayaran")}
                    {renderMenuLink("/agentdashboard/komisi", "Komisi", {
                      locked: isMembershipLocked,
                    })}
                    {renderMenuLink("/agentdashboard/sukses", "Sukses")}
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

            <main className="min-w-0 flex-1">
              {children}
            </main>
          </div>
        </div>
      </AgentListingDraftProvider>
    </AgentProfileContext.Provider>
  );
}