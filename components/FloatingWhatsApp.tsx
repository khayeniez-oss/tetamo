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

const GUEST_SESSION_KEY = "scorpio_assist_guest_session_id";
const GUEST_MESSAGES_KEY = "scorpio_assist_guest_messages";

export default function FloatingWhatsApp() {
  const { lang } = useLanguage();
  const isID = lang === "id";

  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [conversation, setConversation] = useState<SupportConversation | null>(
    null
  );
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState("");
  const [guestSessionId, setGuestSessionId] = useState<string | null>(null);

  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [handoffLoading, setHandoffLoading] = useState(false);
  const [error, setError] = useState("");
  const [authPrompt, setAuthPrompt] = useState<AuthPromptMode>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    let ignore = false;

    async function loadAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!ignore) {
        setUserId(user?.id ?? null);
      }
    }

    if (open) {
      void loadAuth();
    }

    return () => {
      ignore = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (typeof window !== "undefined") {
      const savedGuestSessionId = window.localStorage.getItem(GUEST_SESSION_KEY);
      const savedGuestMessages = window.localStorage.getItem(GUEST_MESSAGES_KEY);

      if (savedGuestSessionId) {
        setGuestSessionId(savedGuestSessionId);
      }

      if (!userId && savedGuestMessages) {
        try {
          const parsed = JSON.parse(savedGuestMessages) as SupportMessage[];
          setMessages(Array.isArray(parsed) ? parsed : []);
        } catch {
          setMessages([]);
        }
      }
    }
  }, [open, userId]);

  useEffect(() => {
    let ignore = false;

    async function loadExistingConversation() {
      if (!open || !userId) return;

      const { data, error } = await supabase
        .from("support_conversations")
        .select(
          "id, user_id, guest_session_id, source, status, handoff_requested, handoff_status, created_at, updated_at, last_message_at"
        )
        .eq("user_id", userId)
        .eq("status", "open")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Failed to load existing conversation:", error);
        return;
      }

      if (!ignore && data) {
        const existing = data as SupportConversation;
        setConversation(existing);
        await refreshMessages(existing.id);
      }
    }

    void loadExistingConversation();

    return () => {
      ignore = true;
    };
  }, [open, userId]);

  useEffect(() => {
    if (!open || !userId || !conversation?.id) return;

    const timer = window.setInterval(() => {
      void refreshConversation(conversation.id);
      void refreshMessages(conversation.id);
    }, 3000);

    return () => {
      window.clearInterval(timer);
    };
  }, [open, userId, conversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, waitingForAgent, authPrompt]);

  function persistGuestState(
    nextGuestSessionId: string,
    nextMessages: SupportMessage[]
  ) {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(GUEST_SESSION_KEY, nextGuestSessionId);
    window.localStorage.setItem(GUEST_MESSAGES_KEY, JSON.stringify(nextMessages));
  }

  async function refreshConversation(conversationId: string) {
    const { data, error } = await supabase
      .from("support_conversations")
      .select(
        "id, user_id, guest_session_id, source, status, handoff_requested, handoff_status, created_at, updated_at, last_message_at"
      )
      .eq("id", conversationId)
      .maybeSingle();

    if (error) {
      console.error("Failed to refresh conversation:", error);
      return;
    }

    if (data) {
      setConversation(data as SupportConversation);
    }
  }

  async function refreshMessages(conversationId: string) {
    setLoadingMessages(true);

    const { data, error } = await supabase
      .from("support_messages")
      .select(
        "id, conversation_id, sender_type, message_text, ai_status, suggested_action, suggested_action_label, created_at"
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to refresh messages:", error);
      setLoadingMessages(false);
      return;
    }

    setMessages((data ?? []) as SupportMessage[]);
    setLoadingMessages(false);
  }

  async function initConversation() {
    if (!userId) return null;

    setLoadingConversation(true);
    setError("");

    try {
      const { data: existing, error: existingError } = await supabase
        .from("support_conversations")
        .select(
          "id, user_id, guest_session_id, source, status, handoff_requested, handoff_status, created_at, updated_at, last_message_at"
        )
        .eq("user_id", userId)
        .eq("status", "open")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingError) throw existingError;

      let activeConversation = existing as SupportConversation | null;

      if (!activeConversation) {
        const { data: created, error: createError } = await supabase
          .from("support_conversations")
          .insert({
            user_id: userId,
            source: "website_chat",
            status: "open",
            handoff_requested: false,
            handoff_status: "ai_active",
          })
          .select(
            "id, user_id, guest_session_id, source, status, handoff_requested, handoff_status, created_at, updated_at, last_message_at"
          )
          .maybeSingle();

        if (createError) throw createError;

        activeConversation = created as SupportConversation | null;
      }

      if (!activeConversation) {
        throw new Error("Failed to create or load support conversation.");
      }

      setConversation(activeConversation);
      await refreshMessages(activeConversation.id);

      return activeConversation;
    } catch (err: any) {
      console.error("Failed to initialize conversation:", err);
      setError(
        err?.message ||
          (isID
            ? "Tidak dapat memulai chat saat ini."
            : "Unable to start chat right now.")
      );
      return null;
    } finally {
      setLoadingConversation(false);
    }
  }

  async function sendGuestMessage(messageText: string) {
    setSending(true);
    setError("");
    setAuthPrompt(null);

    try {
      const body: Record<string, string> = {
        message_text: messageText,
      };

      if (guestSessionId) {
        body.guest_session_id = guestSessionId;
      }

      const { data, error } = await supabase.functions.invoke(
        "scorpio-assist-guest",
        {
          body,
        }
      );

      if (error) throw error;
      if (!data?.ok) {
        throw new Error(data?.error || "Guest chat failed.");
      }

      const nextGuestSessionId = String(data.guest_session_id || "");
      const nextMessages = (data.messages ?? []) as SupportMessage[];
      const nextConversation = (data.conversation ??
        null) as SupportConversation | null;

      if (nextGuestSessionId) {
        setGuestSessionId(nextGuestSessionId);
        persistGuestState(nextGuestSessionId, nextMessages);
      }

      setConversation(nextConversation);
      setMessages(nextMessages);
      setInput("");
    } catch (err: any) {
      console.error("Failed to send guest message:", err);
      setError(
        err?.message ||
          (isID
            ? "Pesan guest gagal dikirim."
            : "Guest message failed to send.")
      );
    } finally {
      setSending(false);
    }
  }

  async function handleSendMessage() {
    const trimmed = input.trim();
    if (!trimmed) return;

    setError("");

    if (!userId) {
      await sendGuestMessage(trimmed);
      return;
    }

    let activeConversation = conversation;

    if (!activeConversation) {
      activeConversation = await initConversation();
    }

    if (!activeConversation) return;

    setSending(true);

    try {
      const { error: insertError } = await supabase.from("support_messages").insert({
        conversation_id: activeConversation.id,
        sender_type: "user",
        message_text: trimmed,
        ai_status: "pending",
      });

      if (insertError) throw insertError;

      setInput("");
      await refreshConversation(activeConversation.id);
      await refreshMessages(activeConversation.id);
    } catch (err: any) {
      console.error("Failed to send message:", err);
      setError(
        err?.message ||
          (isID ? "Pesan gagal dikirim." : "Message failed to send.")
      );
    } finally {
      setSending(false);
    }
  }

  async function handleHandoff() {
    setError("");

    if (!userId) {
      setAuthPrompt("handoff");
      return;
    }

    setAuthPrompt(null);

    let activeConversation = conversation;

    if (!activeConversation) {
      activeConversation = await initConversation();
    }

    if (!activeConversation) return;

    setHandoffLoading(true);

    try {
      const { error: updateError } = await supabase
        .from("support_conversations")
        .update({
          handoff_requested: true,
          handoff_status: "waiting_agent",
          handoff_requested_at: new Date().toISOString(),
          handoff_requested_by: "user",
        })
        .eq("id", activeConversation.id);

      if (updateError) throw updateError;

      await refreshConversation(activeConversation.id);
      await refreshMessages(activeConversation.id);
    } catch (err: any) {
      console.error("Failed to request agent handoff:", err);
      setError(
        err?.message ||
          (isID
            ? "Gagal meminta bantuan Tetamo Agent."
            : "Failed to request a Tetamo Agent.")
      );
    } finally {
      setHandoffLoading(false);
    }
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
                      Scorpio Assist
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
                {isID ? "Jam support Tetamo Agent" : "Tetamo Agent support hours"}
              </p>
              <p className="mt-1 text-xs leading-5 text-white/90">
                {supportHours}
              </p>
            </div>
          </div>

          {waitingForAgent ? (
            <div className="relative border-b border-amber-200 bg-[linear-gradient(90deg,#FFF7E0_0%,#FFFBEF_100%)] px-4 py-3 text-sm font-medium text-amber-800">
              {isID
                ? "Menunggu Tetamo Agent bergabung..."
                : "Waiting for Tetamo Agent to join..."}
            </div>
          ) : null}

          <div className="relative max-h-[380px] min-h-[320px] space-y-3 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.76)_0%,rgba(250,250,250,0.92)_100%)] px-4 py-4">
            {loadingMessages && messages.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-[#6E6E73]">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isID ? "Memuat chat..." : "Loading chat..."}
              </div>
            ) : messages.length > 0 ? (
              messages.map((message) => {
                const isUser = message.sender_type === "user";
                const isAi = message.sender_type === "ai";

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
                              Scorpio Assist
                            </span>
                          </div>
                        ) : null}

                        <p className="whitespace-pre-line">{message.message_text}</p>
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
                      !waitingForAgent ? (
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
                        Scorpio Assist
                      </span>
                    </div>

                    <p>
                      {isID
                        ? "Halo, saya Scorpio Assist. Anda bisa tanya tentang cara pasang properti, paket, proses signup, atau cara kerja Tetamo."
                        : "Hi, I’m Scorpio Assist. You can ask me about listing property, packages, signup flow, or how Tetamo works."}
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
                  isID
                    ? "Tulis pertanyaan Anda..."
                    : "Write your question..."
                }
                className="max-h-28 min-h-[50px] flex-1 resize-none rounded-[22px] border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#1C1C1E] outline-none placeholder:text-[#8E8E93] focus:border-[#111827] focus:ring-4 focus:ring-black/5"
              />

              <button
                type="button"
                onClick={() => void handleSendMessage()}
                disabled={sending || !input.trim()}
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
                disabled={handoffLoading || waitingForAgent || loadingConversation}
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
                  ? "Scorpio Assist terbuka untuk semua pengguna. Login hanya diperlukan untuk bantuan Tetamo Agent, riwayat chat tersimpan, dan bantuan khusus akun."
                  : "Scorpio Assist is open to all users. Login is only required for Tetamo Agent support, saved chat history, and account-specific help."}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={isID ? "Buka Scorpio Assist" : "Open Scorpio Assist"}
        title={isID ? "Buka Scorpio Assist" : "Open Scorpio Assist"}
        className="fixed bottom-5 right-4 z-[60] inline-flex h-14 items-center gap-2.5 rounded-full border border-white/20 bg-[linear-gradient(135deg,#111827_0%,#1F2937_100%)] px-4 pr-5 text-white shadow-[0_16px_40px_rgba(0,0,0,0.28)] transition hover:scale-[1.02] hover:opacity-95 sm:right-5"
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
          <span className="absolute inset-0 rounded-full bg-amber-300/20 blur-md" />
          <Sparkles className="relative z-10 h-4.5 w-4.5 text-amber-300" />
        </span>

        <span className="whitespace-nowrap text-sm font-semibold tracking-[0.01em]">
          Scorpio Assist
        </span>
      </button>
    </>
  );
}