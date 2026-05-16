"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
  MessageSquare,
  Send,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const SUPPORT_EMAIL = "support@tetamo.com";

const reportReasons = [
  "Suspicious user or agent",
  "Scam concern",
  "Fake identity",
  "Harassment or abusive behavior",
  "Inappropriate behavior",
  "Safety concern",
  "Other problem",
];

type PageParams = {
  reported_user_id: string;
  name: string;
  role: string;
  listing_code: string;
};

export default function WebsiteReportUserPage() {
  const router = useRouter();

  const [params, setParams] = useState<PageParams>({
    reported_user_id: "",
    name: "",
    role: "",
    listing_code: "",
  });

  const [selectedReason, setSelectedReason] = useState(reportReasons[0]);
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [isCheckingUser, setIsCheckingUser] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);

    setParams({
      reported_user_id:
        search.get("reported_user_id") ||
        search.get("reportedUserId") ||
        search.get("user_id") ||
        "",
      name: search.get("name") || search.get("user_name") || "",
      role: search.get("role") || search.get("user_role") || "",
      listing_code: search.get("listing_code") || search.get("code") || "",
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      setIsLoggedIn(!!user?.id);
      setContactEmail(user?.email || "");
      setIsCheckingUser(false);
    }

    void checkUser();

    return () => {
      mounted = false;
    };
  }, []);

  const userLabel = useMemo(() => {
    if (params.name) return params.name;
    if (params.role) return params.role;
    return "Selected user";
  }, [params.name, params.role]);

  function openSupportEmail() {
    const subject = encodeURIComponent("Tetamo User Report");
    const body = encodeURIComponent(
      [
        "Hello Tetamo,",
        "",
        "I would like to report a user or agent.",
        "",
        `User: ${userLabel}`,
        `Role: ${params.role || "-"}`,
        `Related listing: ${params.listing_code || "-"}`,
        `Reason: ${selectedReason || "-"}`,
        `Contact email: ${contactEmail || "-"}`,
        "",
        "Details:",
        message || "",
      ].join("\n")
    );

    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorText("");

    if (!selectedReason) {
      setErrorText("Please choose a reason for the report.");
      return;
    }

    setIsSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      setIsSubmitting(false);
      setIsLoggedIn(false);
      setErrorText(
        "Please sign in first to submit this report, or send it by email."
      );
      return;
    }

    const { error } = await supabase.from("user_reports").insert({
      reporter_user_id: user.id,
      reported_user_id: isUuid(params.reported_user_id)
        ? params.reported_user_id
        : null,
      listing_code: params.listing_code || null,
      report_type: "user",
      reason: selectedReason,
      message: message.trim() || null,
      source: "tetamo-website",
      metadata: {
        reported_name: params.name || null,
        reported_role: params.role || null,
        related_listing_code: params.listing_code || null,
        contact_email: contactEmail || user.email || null,
        submitted_from: "website",
      },
    });

    setIsSubmitting(false);

    if (error) {
      setErrorText(
        "We could not submit your report. Please try again or contact Tetamo support."
      );
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#050505] px-5 py-10 text-white">
        <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] bg-[#e6c15c]">
            <CheckCircle2 className="h-10 w-10 text-[#111111]" />
          </div>

          <h1 className="text-3xl font-black">Report submitted</h1>

          <p className="mt-3 max-w-md text-sm font-semibold leading-6 text-neutral-300">
            Thank you for helping keep Tetamo safe. Our team will review this
            user report.
          </p>

          <button
            onClick={() => router.push("/")}
            className="mt-8 rounded-2xl bg-[#e6c15c] px-8 py-4 text-sm font-black text-[#111111]"
          >
            Back to Tetamo
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] px-5 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <button
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-[#101010] px-4 py-2 text-xs font-black text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <section className="rounded-[28px] border border-[#705d2c] bg-[#12100a] p-6 shadow-2xl shadow-[#e6c15c]/10">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#705d2c] bg-[#050505]">
            <ShieldAlert className="h-7 w-7 text-[#e6c15c]" />
          </div>

          <p className="text-xs font-black tracking-[0.22em] text-[#e6c15c]">
            SAFETY REPORT
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
            Report a User or Agent
          </h1>

          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-neutral-300">
            Tell Tetamo if a user, agent, or contact looks suspicious, unsafe,
            or inappropriate.
          </p>
        </section>

        <section className="mt-5 rounded-[24px] border border-neutral-800 bg-[#101010] p-5">
          <div className="flex items-start gap-3">
            <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-[#e6c15c]" />

            <div className="min-w-0 flex-1">
              <h2 className="text-base font-black text-white">{userLabel}</h2>

              {params.role ? (
                <p className="mt-2 text-xs font-bold text-[#e6c15c]">
                  Role: {params.role}
                </p>
              ) : null}

              {params.listing_code ? (
                <p className="mt-2 text-xs font-semibold leading-5 text-neutral-400">
                  Related listing: {params.listing_code}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {!isCheckingUser && !isLoggedIn ? (
          <section className="mt-5 rounded-[24px] border border-[#705d2c] bg-[#12100a] p-5">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#e6c15c]" />

              <div>
                <h2 className="text-base font-black text-[#e6c15c]">
                  Sign in required
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-neutral-300">
                  Please sign in to submit a report directly. You can also send
                  the report by email.
                </p>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <a
                    href="/login"
                    className="rounded-full bg-[#e6c15c] px-5 py-3 text-center text-xs font-black text-[#111111]"
                  >
                    Sign In
                  </a>

                  <button
                    onClick={openSupportEmail}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[#705d2c] bg-[#101010] px-5 py-3 text-xs font-black text-white"
                  >
                    <Mail className="h-4 w-4 text-[#e6c15c]" />
                    Email Tetamo
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <form onSubmit={submitReport} className="mt-5 space-y-5">
          <section className="rounded-[24px] border border-neutral-800 bg-[#101010] p-5">
            <label className="text-sm font-black text-white">Reason</label>

            <div className="mt-4 flex flex-wrap gap-2">
              {reportReasons.map((reason) => {
                const active = selectedReason === reason;

                return (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setSelectedReason(reason)}
                    className={[
                      "rounded-full border px-4 py-2 text-xs font-black transition",
                      active
                        ? "border-[#e6c15c] bg-[#e6c15c] text-[#111111]"
                        : "border-neutral-800 bg-[#050505] text-white",
                    ].join(" ")}
                  >
                    {reason}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[24px] border border-neutral-800 bg-[#101010] p-5">
            <label className="text-sm font-black text-white">
              Contact email
            </label>

            <input
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              placeholder="your@email.com"
              className="mt-3 w-full rounded-2xl border border-neutral-800 bg-[#050505] px-4 py-4 text-sm font-semibold text-white outline-none placeholder:text-neutral-600 focus:border-[#e6c15c]"
            />

            <label className="mt-5 block text-sm font-black text-white">
              Additional details
            </label>

            <div className="mt-3 flex gap-3 rounded-2xl border border-neutral-800 bg-[#050505] p-4 focus-within:border-[#e6c15c]">
              <MessageSquare className="mt-1 h-5 w-5 shrink-0 text-[#e6c15c]" />

              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Tell us more about the issue..."
                maxLength={1000}
                rows={7}
                className="w-full resize-none bg-transparent text-sm font-semibold leading-6 text-white outline-none placeholder:text-neutral-600"
              />
            </div>
          </section>

          <section className="flex items-start gap-3 rounded-[20px] border border-[#705d2c]/40 bg-[#e6c15c]/10 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#e6c15c]" />
            <p className="text-xs font-semibold leading-5 text-neutral-300">
              Please do not include sensitive personal information unless it is
              needed for the report.
            </p>
          </section>

          {errorText ? (
            <p className="rounded-2xl border border-red-900 bg-red-950/50 p-4 text-sm font-bold text-red-200">
              {errorText}
            </p>
          ) : null}

          <div className="rounded-[24px] border border-neutral-800 bg-[#101010] p-5">
            <button
              type="submit"
              disabled={!isLoggedIn || isSubmitting}
              className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#e6c15c] text-sm font-black text-[#111111] disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </button>

            <button
              type="button"
              onClick={openSupportEmail}
              className="mt-3 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border border-neutral-800 bg-[#050505] text-sm font-black text-white"
            >
              <Mail className="h-5 w-5 text-[#e6c15c]" />
              Send by Email
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}