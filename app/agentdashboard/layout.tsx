"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

export default function AgentDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  const [agent, setAgent] = useState<AgentProfile>(DEFAULT_AGENT);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const menuItemClass = (href: string) =>
    [
      "block rounded-xl px-3 py-3 text-sm transition lg:text-base",
      pathname === href
        ? "bg-white/10 text-white font-semibold"
        : "text-white/85 hover:bg-white/10 hover:text-white",
    ].join(" ");

  useEffect(() => {
    let ignore = false;

    async function loadAgentProfile() {
      setLoadingProfile(true);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          console.error("Failed to load auth user:", authError);
          if (!ignore) setLoadingProfile(false);
          return;
        }

        if (!user) {
          if (!ignore) {
            setAgent(DEFAULT_AGENT);
            setLoadingProfile(false);
          }
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select(
            "id, full_name, role, phone, agency, address, photo_url, instagram_url, facebook_url, tiktok_url, youtube_url, linkedin_url"
          )
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Failed to load agent profile:", profileError);
        }

        const profile = profileData as ProfileRow | null;

        if (!ignore) {
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
          setLoadingProfile(false);
        }
      } catch (error) {
        console.error("Unexpected agent profile load error:", error);
        if (!ignore) {
          setAgent(DEFAULT_AGENT);
          setLoadingProfile(false);
        }
      }
    }

    loadAgentProfile();

    return () => {
      ignore = true;
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
      links.push({
        key: "instagram",
        label: "Instagram",
        href: instagram,
      });
    }

    if (facebook) {
      links.push({
        key: "facebook",
        label: "Facebook",
        href: facebook,
      });
    }

    if (tiktok) {
      links.push({
        key: "tiktok",
        label: "TikTok",
        href: tiktok,
      });
    }

    if (youtube) {
      links.push({
        key: "youtube",
        label: "YouTube",
        href: youtube,
      });
    }

    if (linkedin) {
      links.push({
        key: "linkedin",
        label: "LinkedIn",
        href: linkedin,
      });
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
    }),
    [agent, loadingProfile]
  );

  return (
    <AgentProfileContext.Provider value={contextValue}>
      <AgentListingDraftProvider>
        <div className="min-h-screen bg-[#F7F7F7] p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:gap-8">
            <aside
              className="
                w-full
                lg:w-72
                lg:min-h-screen
                rounded-3xl
                bg-[#1C1C1E]
                px-5 py-6
                sm:px-6 sm:py-7
                lg:px-8 lg:py-8
                text-white
                shadow-[0_20px_60px_rgba(0,0,0,0.35)]
                ring-1 ring-white/10
                flex flex-col
              "
            >
              <div>
                <div className="flex flex-col gap-4 sm:flex-row lg:flex-col lg:gap-0">
                  <div className="h-24 w-24 overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:h-28 sm:w-28 lg:mb-5 lg:h-32 lg:w-32">
                    <img
                      src={agent.photo}
                      alt={agent.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-lg font-bold tracking-tight sm:text-xl lg:text-2xl">
                      {agent.name}
                    </p>

                    <p className="mt-1 text-sm font-bold tracking-tight sm:text-base lg:text-lg">
                      {agent.role}
                    </p>

                    <p className="mt-1 text-sm font-medium">
                      {agent.number || "-"}
                    </p>

                    <p className="mt-2 break-all text-[11px] text-white/60 sm:text-xs">
                      {agent.email || "-"}
                    </p>

                    {socialLinks.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-1.5">
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
                  </div>
                </div>
              </div>

              <div className="my-6 border-t border-white/10 lg:my-8" />

              <nav className="space-y-2 lg:space-y-3">
                <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/40">
                  Overview
                </p>

                <Link
                  href="/agentdashboard"
                  className={menuItemClass("/agentdashboard")}
                >
                  Dashboard
                </Link>

                <Link
                  href="/agentdashboard/listing-saya"
                  className={menuItemClass("/agentdashboard/listing-saya")}
                >
                  Listing Saya
                </Link>

                <Link
                  href="/agentdashboard/leads"
                  className={menuItemClass("/agentdashboard/leads")}
                >
                  Leads
                </Link>

                <Link
                  href="/agentdashboard/propertilokasi"
                  className={menuItemClass("/agentdashboard/propertilokasi")}
                >
                  Buat Iklan
                </Link>

                <p className="mt-5 text-[11px] uppercase tracking-[0.2em] text-white/40 lg:mt-6">
                  Membership
                </p>

                <Link
                  href="/agentdashboard/paket"
                  className={menuItemClass("/agentdashboard/paket")}
                >
                  Paket
                </Link>

                <Link
                  href="/agentdashboard/pembayaran"
                  className={menuItemClass("/agentdashboard/pembayaran")}
                >
                  Pembayaran
                </Link>

                <Link
                  href="/agentdashboard/komisi"
                  className={menuItemClass("/agentdashboard/komisi")}
                >
                  Komisi
                </Link>

                <Link
                  href="/agentdashboard/sukses"
                  className={menuItemClass("/agentdashboard/sukses")}
                >
                  Sukses
                </Link>

                <p className="mt-5 text-[11px] uppercase tracking-[0.2em] text-white/40 lg:mt-6">
                  Support
                </p>

                <Link
                  href="/agentdashboard/pengaturan"
                  className={menuItemClass("/agentdashboard/pengaturan")}
                >
                  Pengaturan
                </Link>
              </nav>
            </aside>

            <main className="min-w-0 flex-1 px-0 py-0 lg:px-2 lg:py-2">
              {children}
            </main>
          </div>
        </div>
      </AgentListingDraftProvider>
    </AgentProfileContext.Provider>
  );
}