"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AllowedRole = "owner" | "agent" | "developer" | "admin";
type AuthFlow = "login" | "signup";

function normalizeRole(value: string | null): AllowedRole | null {
  const v = String(value || "").toLowerCase();

  if (v === "owner") return "owner";
  if (v === "agent") return "agent";
  if (v === "developer") return "developer";
  if (v === "admin") return "admin";
  return null;
}

function normalizeFlow(value: string | null): AuthFlow | null {
  const v = String(value || "").toLowerCase();

  if (v === "login") return "login";
  if (v === "signup") return "signup";
  return null;
}

function getSafeNext(value: string | null): string {
  if (!value) return "";
  if (!value.startsWith("/")) return "";
  if (value.startsWith("//")) return "";
  return value;
}

function getDefaultRedirect(role: AllowedRole, flow: AuthFlow | null): string {
  if (flow === "signup") {
    if (role === "owner") return "/pemilik";
    if (role === "agent") return "/agentdashboard/paket";
    if (role === "admin") return "/admindashboard";
    return "/";
  }

  if (role === "owner") return "/pemilikdashboard";
  if (role === "agent") return "/agentdashboard";
  if (role === "admin") return "/admindashboard";
  return "/";
}

export default function AuthCallbackPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const code = searchParams.get("code");
  const requestedRole = normalizeRole(searchParams.get("role"));
  const flow = normalizeFlow(searchParams.get("flow"));
  const safeNext = getSafeNext(searchParams.get("next"));
  const authError = searchParams.get("error");
  const authErrorDescription = searchParams.get("error_description");

  useEffect(() => {
    let cancelled = false;

    async function handleAuth() {
      try {
        if (authError) {
          console.error("OAuth provider error:", authError, authErrorDescription);
          router.replace("/login");
          return;
        }

        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error("exchangeCodeForSession error:", exchangeError);
            router.replace("/login");
            return;
          }
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          console.error("getSession error:", sessionError);
          router.replace("/login");
          return;
        }

        const user = session.user;

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (profileError) {
          console.error("profile lookup error:", profileError);
          router.replace("/login");
          return;
        }

        let finalRole: AllowedRole =
          normalizeRole(profile?.role) ||
          requestedRole ||
          normalizeRole((user.user_metadata?.role as string | undefined) ?? null) ||
          "owner";

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
                role: finalRole,
              },
              { onConflict: "id" }
            )
            .select("role")
            .single();

          if (cancelled) return;

          if (insertError || !newProfile) {
            console.error("profile upsert error:", insertError);
            router.replace("/login");
            return;
          }

          finalRole = normalizeRole(newProfile.role) || finalRole;
        }

        const target = safeNext || getDefaultRedirect(finalRole, flow);
        router.replace(target);
      } catch (error) {
        console.error("Auth callback error:", error);
        if (!cancelled) {
          router.replace("/login");
        }
      }
    }

    handleAuth();

    return () => {
      cancelled = true;
    };
  }, [
    router,
    code,
    requestedRole,
    flow,
    safeNext,
    authError,
    authErrorDescription,
  ]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] text-[#1C1C1E]">
      Signing you in...
    </div>
  );
}