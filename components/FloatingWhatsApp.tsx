"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Sparkles,
  Headphones,
  Send,
  Loader2,
  LogIn,
  UserPlus,
} from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import { websiteThara, TharaClientError, type BrowserSnapshot } from "@/lib/thara/browser-client";

type SupportConversation = {
  id: string;
  user_id?: string | null;
  guest_session_id?: string | null;
  source?: string | null;
  status?: string | null;
  handoff_requested?: boolean;
  handoff_status?: string;
  created_at?: string;
  updated_at?: string;
  last_message_at?: string | null;
};

type SupportMessage = {
  id: string;
  conversation_id: string;
  sender_type: "user" | "ai" | "admin";
  message_text: string;
  ai_status: string | null;
  suggested_action: string | null;
  suggested_action_label: string | null;
  created_at: string;
};

type AuthPromptMode = "handoff" | null;
type AiFeedbackChoice = "yes" | "no";

// Legacy Scorpio storage is retained untouched; it is never treated as a secure Thara session.

function cleanDisplayText(value: unknown) {
  return String(value || "")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .trim();
}

function getDisplayMessageText(value: string, lang: "en" | "id") {
  const raw = String(value || "").trim();

  if (!raw) return "";

  try {
    const parsed = JSON.parse(raw);

    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed[lang] === "string" &&
      parsed[lang].trim()
    ) {
      return cleanDisplayText(parsed[lang]);
    }

    const fallbackLang = lang === "id" ? "en" : "id";

    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed[fallbackLang] === "string" &&
      parsed[fallbackLang].trim()
    ) {
      return cleanDisplayText(parsed[fallbackLang]);
    }

    if (typeof parsed === "string") {
      return cleanDisplayText(parsed);
    }
  } catch {
    return cleanDisplayText(raw);
  }

  return cleanDisplayText(raw);
}

function LinkifiedMessageText({
  value,
  lang,
}: {
  value: string;
  lang: "en" | "id";
}) {
  const displayText = getDisplayMessageText(value, lang);
  const parts = displayText.split(/(https?:\/\/[^\s]+)/g);

  return (
    <>
      {parts.map((part, index) => {
        const isUrl = /^https?:\/\/[^\s]+$/.test(part);

        if (!isUrl) {
          return <span key={`text-${index}`}>{part}</span>;
        }

        return (
          <a
            key={`url-${index}`}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-800"
          >
            {part}
          </a>
        );
      })}
    </>
  );
}

export default function FloatingWhatsApp() {
  const { lang } = useLanguage();
  const isID = lang === "id";

  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [conversation, setConversation] = useState<SupportConversation | null>(
    null,
  );
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const [humanActive, setHumanActive] = useState(false);
  const busyRef = useRef(false);
  const retryRef = useRef<{ text: string; id: string } | null>(null);
  const generationRef = useRef(0);

  const [loadingConversation, setLoadingConversation] = useState(false);
  const loadingMessages = loadingConversation;
  const [sending, setSending] = useState(false);
  const [handoffLoading, setHandoffLoading] = useState(false);
  const [error, setError] = useState("");
  const [authPrompt, setAuthPrompt] = useState<AuthPromptMode>(null);
  const [aiFeedbackMap, setAiFeedbackMap] = useState<
    Record<string, AiFeedbackChoice>
  >({});

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const olderLoadedRef = useRef(false);
  const authIdentityRef = useRef<string | null | undefined>(undefined);
  const [olderCursor, setOlderCursor] = useState<string | null>(null);
  const [loadingEarlier, setLoadingEarlier] = useState(false);

  const waitingForAgent = conversation?.handoff_status === "waiting_agent";

  const supportHours = useMemo(() => {
    return isID
      ? "Senin - Jumat, 9:00 pagi - 6:00 sore."
      : "Monday - Friday, 9:00 AM - 6:00 PM.";
  }, [isID]);

  const starterQuestions = useMemo(() => {
    return isID
      ? [
          "Bagaimana cara pasang properti di Tetamo?",
          "Apa perbedaan owner dan agent?",
          "Bagaimana paket agent di Tetamo?",
        ]
      : [
          "How do I list my property on Tetamo?",
          "What is the difference between owner and agent?",
          "How do Tetamo agent packages work?",
        ];
  }, [isID]);

  const latestAiMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.sender_type === "ai") {
        return messages[i].id;
      }
    }

    return "";
  }, [messages]);

  function applySnapshot(snapshot: BrowserSnapshot) {
    const sameConversation = conversationIdRef.current === (snapshot.conversation?.id || null);
    if (!sameConversation) olderLoadedRef.current = false;
    conversationIdRef.current = snapshot.conversation?.id || null;
    setConversation(snapshot.conversation);
    setMessages(current => sameConversation ? [...current.filter(item => !snapshot.messages.some(next => next.id === item.id)), ...snapshot.messages] : snapshot.messages);
    if (!olderLoadedRef.current) setOlderCursor(snapshot.hasOlder ? snapshot.cursor || null : null);
    setHumanActive(Boolean(snapshot.conversation && !["ai_active", "waiting_agent"].includes(snapshot.conversation.handoff_status)));
    setUnavailable(false);
  }

  function displayFailure(error: unknown) {
    const pending = error instanceof TharaClientError && error.status === 503 && /activation is pending|not available yet/i.test(error.message);
    setUnavailable(pending);
    setError(pending
      ? (isID ? "Thara belum tersedia untuk publik. Silakan hubungi Tetamo untuk bantuan." : "Thara is not available publicly yet. Please contact Tetamo for help.")
      : (isID ? "Chat belum dapat terhubung. Silakan coba lagi." : "Chat could not connect. Please try again."));
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    generationRef.current++;
    setLoadingConversation(true);
    async function refresh() {
      if (busyRef.current) return;
      const generation = ++generationRef.current;
      try {
        const snapshot = await websiteThara("history");
        if (!cancelled && generation === generationRef.current && !busyRef.current) applySnapshot(snapshot);
      } catch (error) {
        if (!cancelled && generation === generationRef.current && !busyRef.current) displayFailure(error);
      } finally { if (!cancelled) setLoadingConversation(false); }
    }
    void supabase.auth.getSession().then(({ data }) => { if (!cancelled) setUserId(data.session?.user.id ?? null); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      const identity = session?.user.id ?? null;
      if (authIdentityRef.current === identity) return;
      authIdentityRef.current = identity;
      setUserId(identity);
      setConversation(null); setMessages([]); setOlderCursor(null); retryRef.current = null; conversationIdRef.current = null; olderLoadedRef.current = false;
      // Discard any in-flight response from the previous identity.
      generationRef.current++;
    });
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 5000);
    return () => { cancelled = true; subscription.unsubscribe(); window.clearInterval(timer); generationRef.current++; };
  // Reinitialize secure history when authentication or display language changes.
  }, [open, userId, lang]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, waitingForAgent, authPrompt, aiFeedbackMap]);

  async function handleSendMessage() {
    const text = input.trim();
    if (!text || busyRef.current || unavailable) return;
    busyRef.current = true;
    const generation = ++generationRef.current;
    setSending(true); setError(""); setAuthPrompt(null);
    if (retryRef.current?.text !== text) retryRef.current = { text, id: crypto.randomUUID() };
    try {
      const snapshot = await websiteThara("send", { request_id: retryRef.current.id, message_text: text, language: lang });
      if (generation === generationRef.current) {
        applySnapshot(snapshot); setInput(current => current.trim() === text ? "" : current); retryRef.current = null;
      }
    } catch (error) { if (generation === generationRef.current) displayFailure(error); }
    finally { busyRef.current = false; setSending(false); }
  }

  async function loadEarlier() {
    if (!olderCursor || busyRef.current) return;
    busyRef.current = true;
    const generation = ++generationRef.current;
    setLoadingEarlier(true);
    try {
      const snapshot = await websiteThara("history", { before: olderCursor });
      if (generation === generationRef.current) {
        olderLoadedRef.current = true;
        setMessages(current => [...snapshot.messages, ...current.filter(item => !snapshot.messages.some(old => old.id === item.id))]);
        setOlderCursor(snapshot.hasOlder ? snapshot.cursor || null : null);
      }
    } catch (error) { if (generation === generationRef.current) displayFailure(error); }
    finally { busyRef.current = false; setLoadingEarlier(false); }
  }

  async function handleHandoff() {
    if (!userId) { setAuthPrompt("handoff"); return; }
    if (busyRef.current || unavailable) return;
    busyRef.current = true;
    const generation = ++generationRef.current;
    setHandoffLoading(true); setError(""); setAuthPrompt(null);
    try {
      const snapshot = await websiteThara("handoff");
      if (generation === generationRef.current) applySnapshot(snapshot);
    } catch (error) { if (generation === generationRef.current) displayFailure(error); }
    finally { busyRef.current = false; setHandoffLoading(false); }
  }

  function handleAiFeedback(messageId: string, choice: AiFeedbackChoice) {
    setAiFeedbackMap((prev) => ({
      ...prev,
      [messageId]: choice,
    }));
  }

  function formatMessageTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat(isID ? "id-ID" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function handleStarterQuestion(question: string) {
    setInput(question);
  }

  return (
    <>
      {open ? (
        <div className="fixed bottom-24 right-4 z-[70] w-[calc(100vw-2rem)] max-w-[410px] overflow-hidden rounded-[30px] border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(250,250,250,0.96)_100%)] shadow-[0_30px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:right-5">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-10 top-8 h-28 w-28 rounded-full bg-amber-300/20 blur-3xl" />
            <div className="absolute -right-8 top-20 h-32 w-32 rounded-full bg-emerald-300/20 blur-3xl" />
            <div className="absolute bottom-20 left-10 h-24 w-24 rounded-full bg-white/40 blur-2xl" />
          </div>

          <div className="relative border-b border-white/10 bg-[linear-gradient(135deg,#0F172A_0%,#1F2937_55%,#111827_100%)] px-4 py-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-[0_0_24px_rgba(251,191,36,0.22)] backdrop-blur">
                    <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.24),transparent_65%)]" />
                    <Sparkles className="relative z-10 h-5 w-5 text-amber-300" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold tracking-[0.01em]">
                      Thara
                    </p>
                    <p className="mt-0.5 text-xs text-white/70">
                      {isID
                        ? "AI support untuk Tetamo"
                        : "AI support for Tetamo"}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs leading-5 text-white/80">
                  {isID
                    ? "Tanya tentang listing properti, paket, proses signup, dan cara kerja Tetamo."
                    : "Ask about property listing, packages, signup flow, and how Tetamo works."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 transition hover:bg-white/20"
                aria-label={isID ? "Tutup chat" : "Close chat"}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/10 px-3 py-2.5 backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">
                {isID
                  ? "Jam support Tetamo Agent"
                  : "Tetamo Agent support hours"}
              </p>
              <p className="mt-1 text-xs leading-5 text-white/90">
                {supportHours}
              </p>
            </div>
          </div>

          {waitingForAgent || humanActive ? (
            <div className="relative border-b border-amber-200 bg-[linear-gradient(90deg,#FFF7E0_0%,#FFFBEF_100%)] px-4 py-3 text-sm font-medium text-amber-800">
              {isID
                ? (humanActive ? "Percakapan ditangani Tetamo Agent." : "Permintaan bantuan telah diterima Tetamo Agent.")
                : (humanActive ? "A Tetamo Agent is handling this conversation." : "Your request has been sent to Tetamo Agent.")}
            </div>
          ) : null}

          <div className="relative max-h-[380px] min-h-[320px] space-y-3 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.76)_0%,rgba(250,250,250,0.92)_100%)] px-4 py-4">
            {olderCursor && <button type="button" disabled={loadingEarlier || sending || handoffLoading} onClick={() => void loadEarlier()} className="text-xs font-medium text-amber-700 disabled:opacity-50">{loadingEarlier ? (isID ? "Memuat..." : "Loading...") : (isID ? "Muat pesan sebelumnya" : "Load earlier messages")}</button>}
            {loadingMessages && messages.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-[#6E6E73]">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isID ? "Memuat chat..." : "Loading chat..."}
              </div>
            ) : messages.length > 0 ? (
              messages.map((message) => {
                const isUser = message.sender_type === "user";
                const isAi = message.sender_type === "ai";
                const isLatestAiMessage =
                  isAi && message.id === latestAiMessageId;
                const feedbackChoice = aiFeedbackMap[message.id];

                return (
                  <div
                    key={message.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-[86%]">
                      <div
                        className={[
                          "rounded-[22px] px-4 py-3 text-sm leading-6 shadow-sm",
                          isUser
                            ? "bg-[linear-gradient(135deg,#111827_0%,#1F2937_100%)] text-white shadow-[0_10px_30px_rgba(17,24,39,0.25)]"
                            : "border border-[#ECECEF] bg-white/95 text-[#1C1C1E]",
                        ].join(" ")}
                      >
                        {!isUser ? (
                          <div className="mb-2 flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-50">
                              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                            </div>
                            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8E8E93]">
                              Thara
                            </span>
                          </div>
                        ) : null}

                        <p className="whitespace-pre-line">
                          <LinkifiedMessageText
                            value={message.message_text}
                            lang={lang}
                          />
                        </p>
                      </div>

                      <div
                        className={`mt-1 px-1 text-[11px] text-[#8E8E93] ${
                          isUser ? "text-right" : "text-left"
                        }`}
                      >
                        {formatMessageTime(message.created_at)}
                      </div>

                      {isAi &&
                      message.suggested_action === "handoff_to_human" &&
                      !waitingForAgent && !humanActive ? (
                        <button
                          type="button"
                          onClick={() => void handleHandoff()}
                          disabled={handoffLoading}
                          className="mt-2 inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-[linear-gradient(180deg,#FFF9EC_0%,#FFFFFF_100%)] px-4 py-2.5 text-xs font-semibold text-[#1C1C1E] shadow-sm transition hover:opacity-95 disabled:opacity-60"
                        >
                          {handoffLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Headphones className="h-4 w-4 text-amber-600" />
                          )}
                          {message.suggested_action_label ||
                            (isID
                              ? "Chat dengan Tetamo Agent"
                              : "Chat with Tetamo Agent")}
                        </button>
                      ) : null}

                      {isLatestAiMessage && !waitingForAgent && !humanActive ? (
                        <div className="mt-2 rounded-[20px] border border-[#ECECEF] bg-white/95 px-3 py-3 shadow-sm">
                          <p className="text-xs font-semibold text-[#1C1C1E]">
                            {isID
                              ? "Apakah jawaban ini membantu?"
                              : "Did this solve your problem?"}
                          </p>

                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleAiFeedback(message.id, "yes")
                              }
                              className={[
                                "rounded-2xl px-3 py-2 text-xs font-semibold transition",
                                feedbackChoice === "yes"
                                  ? "bg-[#111827] text-white"
                                  : "border border-[#E5E7EB] bg-white text-[#1C1C1E] hover:bg-[#FAFAFA]",
                              ].join(" ")}
                            >
                              {isID ? "Ya, membantu" : "Yes, it helped"}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleAiFeedback(message.id, "no")}
                              className={[
                                "rounded-2xl px-3 py-2 text-xs font-semibold transition",
                                feedbackChoice === "no"
                                  ? "border border-amber-200 bg-amber-50 text-amber-800"
                                  : "border border-[#E5E7EB] bg-white text-[#1C1C1E] hover:bg-[#FAFAFA]",
                              ].join(" ")}
                            >
                              {isID
                                ? "Belum, butuh bantuan"
                                : "No, I need more help"}
                            </button>
                          </div>

                          {feedbackChoice === "yes" ? (
                            <p className="mt-2 text-xs leading-5 text-[#6E6E73]">
                              {isID
                                ? "Senang bisa membantu. Anda bisa tanya lagi kapan saja tentang listing, paket, signup, pembayaran, atau marketplace Tetamo."
                                : "Glad I could help. You can ask me anytime about Tetamo listing, packages, signup, payment, or marketplace."}
                            </p>
                          ) : null}

                          {feedbackChoice === "no" ? (
                            <div className="mt-2">
                              <p className="text-xs leading-5 text-[#6E6E73]">
                                {isID
                                  ? "Maaf kalau jawabannya belum jelas. Silakan tulis bagian yang masih membingungkan, atau lanjut chat dengan Tetamo Agent."
                                  : "Sorry if the answer was not clear yet. Please tell me what part is still confusing, or continue with a Tetamo Agent."}
                              </p>

                              <button
                                type="button"
                                onClick={() => void handleHandoff()}
                                disabled={handoffLoading}
                                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-[linear-gradient(180deg,#FFF9EC_0%,#FFFFFF_100%)] px-3 py-2.5 text-xs font-semibold text-[#1C1C1E] shadow-sm transition hover:opacity-95 disabled:opacity-60"
                              >
                                {handoffLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Headphones className="h-4 w-4 text-amber-600" />
                                )}
                                {isID
                                  ? "Chat dengan Tetamo Agent"
                                  : "Chat with Tetamo Agent"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })
            ) : (
              <>
                <div className="flex justify-start">
                  <div className="max-w-[90%] rounded-[22px] border border-[#ECECEF] bg-white/95 px-4 py-3 text-sm leading-6 text-[#1C1C1E] shadow-sm">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-50">
                        <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8E8E93]">
                        Thara
                      </span>
                    </div>

                    <p>
                      {isID
                        ? "Halo, saya Thara. Anda bisa tanya tentang cara pasang properti, paket, proses signup, atau cara kerja Tetamo."
                        : "Hi, I’m Thara. You can ask me about listing property, packages, signup flow, or how Tetamo works."}
                    </p>
                  </div>
                </div>

                <div className="pt-1">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8E8E93]">
                    {isID ? "Coba tanya" : "Try asking"}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {starterQuestions.map((question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() => handleStarterQuestion(question)}
                        className="rounded-full border border-[#E6E6EB] bg-white px-3 py-2 text-xs font-medium text-[#1C1C1E] shadow-sm transition hover:bg-[#FAFAFA]"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {authPrompt ? (
              <div className="rounded-[24px] border border-[#ECECEF] bg-[linear-gradient(180deg,#FFFFFF_0%,#FAFAFA_100%)] p-4 shadow-sm">
                <p className="text-sm font-semibold text-[#1C1C1E]">
                  {isID
                    ? "Login untuk chat dengan Tetamo Agent"
                    : "Log in to chat with Tetamo Agent"}
                </p>

                <p className="mt-2 text-sm leading-6 text-[#6E6E73]">
                  {isID
                    ? "Untuk diteruskan ke Tetamo Agent, silakan login atau daftar terlebih dahulu."
                    : "To continue with Tetamo Agent, please log in or sign up first."}
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#111827_0%,#1F2937_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(17,24,39,0.22)] transition hover:opacity-95"
                  >
                    <LogIn className="h-4 w-4" />
                    {isID ? "Login" : "Log in"}
                  </Link>

                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-semibold text-[#1C1C1E] shadow-sm transition hover:bg-[#FAFAFA]"
                  >
                    <UserPlus className="h-4 w-4" />
                    {isID ? "Daftar" : "Sign up"}
                  </Link>
                </div>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          {error ? (
            <div className="relative border-t border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <div className="relative border-t border-[#ECECEF] bg-white/95 p-4 backdrop-blur">
            <div className="flex items-end gap-2">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isID ? "Tulis pertanyaan Anda..." : "Write your question..."
                }
                className="max-h-28 min-h-[50px] flex-1 resize-none rounded-[22px] border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#1C1C1E] outline-none placeholder:text-[#8E8E93] focus:border-[#111827] focus:ring-4 focus:ring-black/5"
              />

              <button
                type="button"
                onClick={() => void handleSendMessage()}
                disabled={sending || handoffLoading || loadingConversation || unavailable || !input.trim()}
                className="inline-flex h-[50px] w-[50px] items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#111827_0%,#1F2937_100%)] text-white shadow-[0_12px_28px_rgba(17,24,39,0.25)] transition hover:scale-[1.02] hover:opacity-95 disabled:opacity-60"
                aria-label={isID ? "Kirim pesan" : "Send message"}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void handleHandoff()}
                disabled={
                  handoffLoading || sending || waitingForAgent || humanActive || unavailable || loadingConversation
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-[20px] border border-amber-200 bg-[linear-gradient(180deg,#FFF8E8_0%,#FFFFFF_100%)] px-4 py-3 text-sm font-semibold text-[#1C1C1E] shadow-sm transition hover:opacity-95 disabled:opacity-60"
              >
                {handoffLoading || loadingConversation ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Headphones className="h-4 w-4 text-amber-600" />
                )}
                {isID ? "Chat dengan Tetamo Agent" : "Chat with Tetamo Agent"}
              </button>

              <p className="text-[11px] leading-5 text-[#8E8E93]">
                {isID
                  ? "Login diperlukan untuk bantuan Tetamo Agent dan bantuan khusus akun."
                  : "Log in for Tetamo Agent support and account-specific help."}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={isID ? "Buka Thara" : "Open Thara"}
        title={isID ? "Buka Thara" : "Open Thara"}
        className="fixed bottom-5 right-4 z-[60] inline-flex h-14 items-center gap-2.5 rounded-full border border-white/20 bg-[linear-gradient(135deg,#111827_0%,#1F2937_100%)] px-4 pr-5 text-white shadow-[0_16px_40px_rgba(0,0,0,0.28)] transition hover:scale-[1.02] hover:opacity-95 sm:right-5"
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
          <span className="absolute inset-0 rounded-full bg-amber-300/20 blur-md" />
          <Sparkles className="relative z-10 h-4.5 w-4.5 text-amber-300" />
        </span>

        <span className="whitespace-nowrap text-sm font-semibold tracking-[0.01em]">
          Thara
        </span>
      </button>
    </>
  );
}