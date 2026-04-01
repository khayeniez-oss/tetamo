"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";

type OwnerProfile = {
  name: string;
  agency: string;
  number: string;
  photo: string;
  email: string;
  address: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  linkedinUrl: string;
};

type OwnerProfileContextType = {
  owner: OwnerProfile;
  setOwner: React.Dispatch<React.SetStateAction<OwnerProfile>>;
  userId: string | null;
  loadingProfile: boolean;
};

const OwnerProfileContext = createContext<OwnerProfileContextType | null>(null);

export function useOwnerProfile() {
  const ctx = useContext(OwnerProfileContext);
  if (!ctx) {
    throw new Error("useOwnerProfile must be used inside PemilikDashboardLayout");
  }
  return ctx;
}

const emptyOwner: OwnerProfile = {
  name: "",
  agency: "",
  number: "",
  photo: "",
  email: "",
  address: "",
  instagramUrl: "",
  facebookUrl: "",
  tiktokUrl: "",
  youtubeUrl: "",
  linkedinUrl: "",
};

function SocialButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white transition hover:bg-white/20 sm:px-3 sm:py-1.5 sm:text-xs"
    >
      {label}
    </a>
  );
}

export default function PemilikDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [owner, setOwner] = useState<OwnerProfile>(emptyOwner);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const menuItemClass = (href: string) =>
    [
      "flex items-center justify-center whitespace-nowrap rounded-xl px-2 py-2.5 text-xs font-medium transition sm:px-3 sm:text-sm lg:justify-start lg:px-3 lg:py-3",
      pathname === href
        ? "bg-white/10 text-white font-semibold"
        : "text-white/85 hover:bg-white/10 hover:text-white",
    ].join(" ");

  useEffect(() => {
    let isMounted = true;

    async function loadOwnerProfile() {
      setLoadingProfile(true);
      setAuthorized(false);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (isMounted) {
          setLoadingProfile(false);
          router.replace("/login");
        }
        return;
      }

      if (isMounted) {
        setUserId(user.id);
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(
          "full_name, email, phone, agency, address, photo_url, role, instagram_url, facebook_url, tiktok_url, youtube_url, linkedin_url"
        )
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        if (isMounted) {
          setLoadingProfile(false);
          router.replace("/login");
        }
        return;
      }

      if (profile.role !== "owner") {
        if (isMounted) {
          setLoadingProfile(false);
          router.replace("/");
        }
        return;
      }

      if (isMounted) {
        setOwner({
          name: profile.full_name || "",
          agency: profile.agency || "",
          number: profile.phone || "",
          photo: profile.photo_url || "",
          email: profile.email || user.email || "",
          address: profile.address || "",
          instagramUrl: profile.instagram_url || "",
          facebookUrl: profile.facebook_url || "",
          tiktokUrl: profile.tiktok_url || "",
          youtubeUrl: profile.youtube_url || "",
          linkedinUrl: profile.linkedin_url || "",
        });
        setAuthorized(true);
        setLoadingProfile(false);
      }
    }

    loadOwnerProfile();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-[#F7F7F7] p-4 sm:p-6 lg:p-10">
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="text-sm text-gray-500">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  const socialLinks = [
    { label: "Instagram", href: owner.instagramUrl },
    { label: "Facebook", href: owner.facebookUrl },
    { label: "TikTok", href: owner.tiktokUrl },
    { label: "YouTube", href: owner.youtubeUrl },
    { label: "LinkedIn", href: owner.linkedinUrl },
  ].filter((item) => item.href);

  return (
    <OwnerProfileContext.Provider
      value={{ owner, setOwner, userId, loadingProfile }}
    >
      <div className="min-h-screen bg-[#F7F7F7] p-4 sm:p-6 lg:p-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:gap-6 xl:gap-8">
          <aside
            className="
              w-full
              lg:w-72
              xl:w-80
              lg:min-h-screen
              rounded-3xl
              bg-[#1C1C1E]
              px-4 py-4
              sm:px-5 sm:py-5
              lg:px-8 lg:py-8
              text-white
              shadow-[0_20px_60px_rgba(0,0,0,0.35)]
              ring-1 ring-white/10
            "
          >
            <div className="flex items-start gap-4 lg:flex-col lg:gap-0">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:h-24 sm:w-24 lg:mb-6 lg:h-28 lg:w-28">
                {owner.photo ? (
                  <img
                    src={owner.photo}
                    alt={owner.name || "Owner"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-white/60 sm:text-sm">
                    No Photo
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold tracking-tight sm:text-xl lg:text-2xl">
                  {owner.name || "-"}
                </p>
                <p className="mt-1 truncate text-sm font-medium text-white/90 lg:mt-2 lg:text-base">
                  {owner.agency || "-"}
                </p>
                <p className="mt-1 break-words text-sm text-white/75">
                  {owner.number || "-"}
                </p>

                <div className="mt-3 flex flex-wrap gap-2 lg:mt-5">
                  {socialLinks.length > 0 ? (
                    socialLinks.map((item) => (
                      <SocialButton
                        key={item.label}
                        href={item.href}
                        label={item.label}
                      />
                    ))
                  ) : (
                    <p className="text-xs text-white/50">
                      Belum ada social media
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="my-4 border-t border-white/10 sm:my-5 lg:my-8" />

            <nav className="grid grid-cols-4 gap-2 lg:grid-cols-1 lg:gap-3">
              <Link
                href="/pemilikdashboard"
                className={menuItemClass("/pemilikdashboard")}
              >
                Ringkasan
              </Link>

              <Link
                href="/pemilikdashboard/leads"
                className={menuItemClass("/pemilikdashboard/leads")}
              >
                Leads
              </Link>

              <Link
                href="/pemilikdashboard/tagihan"
                className={menuItemClass("/pemilikdashboard/tagihan")}
              >
                Tagihan
              </Link>

              <Link
                href="/pemilikdashboard/pengaturan"
                className={menuItemClass("/pemilikdashboard/pengaturan")}
              >
                Pengaturan
              </Link>
            </nav>
          </aside>

          <main className="min-w-0 flex-1 py-0 sm:py-1 lg:py-6">
            {children}
          </main>
        </div>
      </div>
    </OwnerProfileContext.Provider>
  );
}