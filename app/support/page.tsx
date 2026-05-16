"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  Flag,
  HelpCircle,
  Loader2,
  Mail,
  MessageCircle,
  Send,
  ShieldAlert,
  Trash2,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type CategoryKey =
  | "account"
  | "payment"
  | "listing"
  | "safety"
  | "delete_account"
  | "app_issue"
  | "other";

const SUPPORT_EMAIL = "support@tetamo.com";
const WEBSITE_URL = "https://www.tetamo.com";

const categories: { key: CategoryKey; label: string }[] = [
  { key: "account", label: "Account / Login" },
  { key: "payment", label: "Payment / Receipt" },
  { key: "listing", label: "Property Listing" },
  { key: "safety", label: "Report / Safety" },
  { key: "delete_account", label: "Delete Account" },
  { key: "app_issue", label: "Website / App Issue" },
  { key: "other", label: "Other" },
];

export default function PublicSupportPage() {
  const router = useRouter();

  const [category, setCategory] = useState<CategoryKey>("account");
  const [contactEmail, setContactEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [subject, setSubject] = useState("");
  const [messageText, setMessageText] = useState("");
  const [isCheckingUser, setIsCheckingUser] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"success" | "error" | "">("");

  const selectedCategoryLabel = useMemo(() => {
    return categories.find((item) => item.key === category)?.label || category;
  }, [category]);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      setIsLoggedIn(!!user?.id);
      setContactEmail(user?.email || "");
      setFullName(
        String(user?.user_metadata?.full_name || user?.user_metadata?.name || "")
      );
      setIsCheckingUser(false);
    }

    void loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  function openEmailManually() {
    const emailSubject = encodeURIComponent(
      subject.trim() || `Tetamo Support - ${selectedCategoryLabel}`
    );

    const body = encodeURIComponent(
      [
        "Hello Tetamo Support,",
        "",
        messageText.trim() || "I need help with my Tetamo account.",
        "",
        `Category: ${selectedCategoryLabel}`,
        `Name: ${fullName.trim() || "-"}`,
        `Email: ${contactEmail.trim() || "-"}`,
      ].join("\n")
    );

    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${emailSubject}&body=${body}`;
  }

  async function submitSupportRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const safeEmail = contactEmail.trim();
    const safeName = fullName.trim();
    const safeSubject = subject.trim();
    const safeMessage = messageText.trim();

    setNotice("");
    setNoticeType("");

    if (!safeEmail || !safeSubject || !safeMessage) {
      setNoticeType("error");
      setNotice("Please fill in your email, subject, and message.");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        setSubmitting(false);
        setNoticeType("error");
        setNotice(
          "Please sign in to submit directly, or use the email button below."
        );
        return;
      }

      const { error } = await supabase.from("support_requests").insert({
        user_id: user.id,
        email: safeEmail,
        full_name: safeName,
        phone: "",
        role: String(user.user_metadata?.role || ""),
        category,
        subject: safeSubject,
        message: safeMessage,
        status: "pending",
        priority: category === "safety" ? "high" : "normal",
        source: "tetamo-website",
        metadata: {
          submitted_from: "website_support_page",
        },
      });

      if (error) {
        setNoticeType("error");
        setNotice(
          "We could not submit your request. Please send it by email instead."
        );
        setSubmitting(false);
        return;
      }

      setNoticeType("success");
      setNotice("Your support request has been submitted. Tetamo will review it.");
      setSubject("");
      setMessageText("");
      setSubmitting(false);
    } catch (error: any) {
      setNoticeType("error");
      setNotice(error?.message || "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] px-5 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-[#101010] px-4 py-2 text-xs font-black text-white transition hover:border-[#e6c15c]/60"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <section className="rounded-[30px] border border-neutral-800 bg-[#101010] p-6 shadow-2xl shadow-black/30 md:p-8">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#e6c15c]">
            <HelpCircle className="h-8 w-8 text-[#111111]" />
          </div>

          <p className="text-xs font-black tracking-[0.22em] text-[#e6c15c]">
            SUPPORT
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Tetamo Support Center
          </h1>

          <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-neutral-300 md:text-base">
            Contact Tetamo for account, payment, listing, safety, or app support.
          </p>
        </section>

        <section className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="rounded-[26px] border border-neutral-800 bg-[#101010] p-5">
            <SectionHeader
              icon={<MessageCircle className="h-5 w-5 text-[#e6c15c]" />}
              title="Contact Tetamo"
            />

            <button
              type="button"
              onClick={openEmailManually}
              className="mt-4 flex min-h-16 w-full items-center gap-4 rounded-2xl bg-[#e6c15c] p-4 text-left text-[#111111]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/40">
                <Mail className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-black">Email Support</p>
                <p className="truncate text-xs font-bold">{SUPPORT_EMAIL}</p>
              </div>
            </button>

            <a
              href={WEBSITE_URL}
              className="mt-3 flex min-h-16 items-center gap-4 rounded-2xl border border-neutral-800 bg-[#050505] p-4 text-left transition hover:border-[#e6c15c]/50"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-neutral-800 bg-[#101010]">
                <ExternalLink className="h-5 w-5 text-[#e6c15c]" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-white">Open Website</p>
                <p className="truncate text-xs font-bold text-neutral-400">
                  {WEBSITE_URL}
                </p>
              </div>
            </a>
          </div>

          <div className="rounded-[26px] border border-[#705d2c] bg-[#12100a] p-5">
            <SectionHeader
              icon={<ShieldAlert className="h-5 w-5 text-[#e6c15c]" />}
              title="Safety & Reports"
            />

            <p className="mt-2 text-sm font-semibold leading-6 text-neutral-300">
              Report suspicious listings, users, agents, or unsafe activity.
            </p>

            <a
              href="/report/listing"
              className="mt-4 flex min-h-16 items-center gap-4 rounded-2xl border border-[#705d2c]/60 bg-[#050505] p-4 transition hover:border-[#e6c15c]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#705d2c] bg-[#211a0b]">
                <Flag className="h-5 w-5 text-[#e6c15c]" />
              </div>

              <div>
                <p className="text-sm font-black text-white">Report a Listing</p>
                <p className="mt-1 text-xs font-semibold text-neutral-400">
                  Fake listing, wrong details, or suspicious content
                </p>
              </div>
            </a>

            <a
              href="/report/user"
              className="mt-3 flex min-h-16 items-center gap-4 rounded-2xl border border-[#705d2c]/60 bg-[#050505] p-4 transition hover:border-[#e6c15c]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#705d2c] bg-[#211a0b]">
                <UserRound className="h-5 w-5 text-[#e6c15c]" />
              </div>

              <div>
                <p className="text-sm font-black text-white">
                  Report a User / Agent
                </p>
                <p className="mt-1 text-xs font-semibold text-neutral-400">
                  Suspicious account, scam concern, or inappropriate behavior
                </p>
              </div>
            </a>
          </div>
        </section>

        <section className="mt-5 rounded-[24px] border border-[#705d2c] bg-[#211a0b] p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#e6c15c]" />

            <div>
              <h2 className="text-sm font-black text-white">
                Before contacting support
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#f5e6b7]">
                To help us assist faster, include your account email, listing
                code, payment reference, and screenshot if available.
              </p>
            </div>
          </div>
        </section>

        <form
          onSubmit={submitSupportRequest}
          className="mt-5 rounded-[28px] border border-neutral-800 bg-[#101010] p-5 md:p-6"
        >
          <SectionHeader
            icon={<FileText className="h-5 w-5 text-[#e6c15c]" />}
            title="Send Support Request"
          />

          {!isCheckingUser && !isLoggedIn ? (
            <div className="mb-5 rounded-2xl border border-[#705d2c] bg-[#12100a] p-4">
              <p className="text-sm font-black text-[#e6c15c]">
                Sign in required for direct submission
              </p>
              <p className="mt-2 text-xs font-semibold leading-5 text-neutral-300">
                You can still write your request here and send it by email.
              </p>
            </div>
          ) : null}

          <label className="text-sm font-black text-white">Category</label>

          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((item) => {
              const active = category === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setCategory(item.key)}
                  className={[
                    "rounded-full border px-4 py-2 text-xs font-black transition",
                    active
                      ? "border-[#e6c15c] bg-[#e6c15c] text-[#111111]"
                      : "border-neutral-800 bg-[#050505] text-white hover:border-[#e6c15c]/50",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field
              label="Full Name"
              value={fullName}
              onChange={setFullName}
              placeholder="Your name"
            />

            <Field
              label="Contact Email"
              value={contactEmail}
              onChange={setContactEmail}
              placeholder="your@email.com"
              type="email"
            />
          </div>

          <div className="mt-4">
            <Field
              label="Subject"
              value={subject}
              onChange={setSubject}
              placeholder="Example: QRIS payment issue"
            />
          </div>

          <label className="mt-5 block text-sm font-black text-white">
            Message
          </label>

          <textarea
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
            placeholder="Write the issue details. Include listing code, payment reference, or screenshot if needed."
            rows={7}
            className="mt-3 w-full resize-none rounded-2xl border border-neutral-800 bg-[#050505] p-4 text-sm font-semibold leading-6 text-white outline-none placeholder:text-neutral-600 focus:border-[#e6c15c]"
          />

          {notice ? (
            <div
              className={[
                "mt-5 flex items-start gap-3 rounded-2xl border p-4",
                noticeType === "success"
                  ? "border-green-800 bg-green-950/40"
                  : "border-red-900 bg-red-950/40",
              ].join(" ")}
            >
              {noticeType === "success" ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
              ) : (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
              )}

              <p
                className={[
                  "text-sm font-bold leading-6",
                  noticeType === "success" ? "text-green-200" : "text-red-200",
                ].join(" ")}
              >
                {notice}
              </p>
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <button
              type="submit"
              disabled={submitting || !isLoggedIn}
              className="flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-[#e6c15c] text-sm font-black text-[#111111] disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              {submitting ? "Sending..." : "Send to Support"}
            </button>

            <button
              type="button"
              onClick={openEmailManually}
              className="flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-neutral-800 bg-[#050505] text-sm font-black text-white transition hover:border-[#e6c15c]/50"
            >
              <Mail className="h-5 w-5 text-[#e6c15c]" />
              Send Manual Email
            </button>
          </div>
        </form>

        <section className="mt-5 grid gap-3 md:grid-cols-3">
          <SmallLink href="/privacy-policy" title="Privacy Policy" />
          <SmallLink href="/terms" title="Terms" />
          <SmallLink href="/settings/delete-account" title="Delete Account" />
        </section>
      </div>
    </main>
  );
}

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#705d2c] bg-[#211a0b]">
        {icon}
      </div>
      <h2 className="text-base font-black text-white">{title}</h2>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-white">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-3 h-14 w-full rounded-2xl border border-neutral-800 bg-[#050505] px-4 text-sm font-semibold text-white outline-none placeholder:text-neutral-600 focus:border-[#e6c15c]"
      />
    </label>
  );
}

function SmallLink({ href, title }: { href: string; title: string }) {
  return (
    <a
      href={href}
      className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-neutral-800 bg-[#101010] px-4 text-sm font-black text-white transition hover:border-[#e6c15c]/50"
    >
      {title}
      <ExternalLink className="h-4 w-4 text-[#e6c15c]" />
    </a>
  );
}