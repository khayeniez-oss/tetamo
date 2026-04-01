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
      className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white transition hover:bg-white/20"
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
      "block rounded-xl px-3 py-3 text-sm sm:text-[15px] transition",
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
              px-5 py-6
              sm:px-6 sm:py-7
              lg:px-8 lg:py-8
              text-white
              shadow-[0_20px_60px_rgba(0,0,0,0.35)]
              ring-1 ring-white/10
            "
          >
            <div className="flex flex-col sm:flex-row lg:flex-col gap-4 sm:gap-5 lg:gap-0">
              <div className="mb-0 flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:h-28 sm:w-28 lg:mb-6">
                {owner.photo ? (
                  <img
                    src={owner.photo}
                    alt={owner.name || "Owner"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-sm text-white/60">No Photo</span>
                )}
              </div>

              <div className="min-w-0">
                <p className="text-xl font-bold tracking-tight sm:text-2xl">
                  {owner.name || "-"}
                </p>
                <p className="mt-1 text-sm font-medium text-white/90 sm:mt-2 sm:text-base">
                  {owner.agency || "-"}
                </p>
                <p className="mt-1 break-words text-sm text-white/75">
                  {owner.number || "-"}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 sm:mt-5">
              {socialLinks.length > 0 ? (
                socialLinks.map((item) => (
                  <SocialButton
                    key={item.label}
                    href={item.href}
                    label={item.label}
                  />
                ))
              ) : (
                <p className="text-xs text-white/50">Belum ada social media</p>
              )}
            </div>

            <div className="my-6 border-t border-white/10 sm:my-7 lg:my-8" />

            <nav className="space-y-2 sm:space-y-3">
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

          <main className="min-w-0 flex-1 py-1 sm:py-2 lg:py-6">
            {children}
          </main>
        </div>
      </div>
    </OwnerProfileContext.Provider>
  );
}