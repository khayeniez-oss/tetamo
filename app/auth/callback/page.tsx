"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    async function handleAuth() {
      try {
        const code = searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("exchangeCodeForSession error:", error);
            router.replace("/login");
            return;
          }
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (profileError) {
          console.error("profile lookup error:", profileError);
          router.replace("/");
          return;
        }

        if (!profile) {
          const fullName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            "";

          const email = user.email || "";

          const { data: newProfile, error: insertError } = await supabase
            .from("profiles")
            .upsert(
              {
                id: user.id,
                email,
                full_name: fullName,
                role: "owner",
              },
              { onConflict: "id" }
            )
            .select("role")
            .single();

          if (cancelled) return;

          if (insertError || !newProfile) {
            console.error("profile upsert error:", insertError);
            router.replace("/");
            return;
          }

          redirectByRole(newProfile.role);
          return;
        }

        redirectByRole(profile.role);
      } catch (error) {
        console.error("Auth callback error:", error);
        if (!cancelled) {
          router.replace("/login");
        }
      }
    }

    function redirectByRole(role: string) {
      if (role === "owner") {
        router.replace("/pemilikdashboard");
        return;
      }

      if (role === "agent") {
        router.replace("/agentdashboard");
        return;
      }

      if (role === "developer") {
        router.replace("/developerdashboard");
        return;
      }

      if (role === "admin") {
        router.replace("/admindashboard");
        return;
      }

      router.replace("/");
    }

    handleAuth();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] text-[#1C1C1E]">
      Signing you in...
    </div>
  );
}