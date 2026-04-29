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
      const nextConversation = (data.conversation ?? null) as SupportConversation | null;

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
        <div className="fixed bottom-24 right-5 z-[70] w-[calc(100vw-2rem)] max-w-[380px] overflow-hidden rounded-[28px] border border-[#e5e5e7] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
          <div className="flex items-start justify-between gap-3 border-b border-[#e5e5e7] bg-[#1C1C1E] px-4 py-4 text-white">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <p className="text-sm font-semibold">Scorpio Assist</p>
              </div>

              <p className="mt-1 text-xs leading-5 text-white/80">
                {isID
                  ? "AI support untuk pertanyaan umum properti dan platform Tetamo."
                  : "AI support for general Tetamo property and platform questions."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
              aria-label={isID ? "Tutup chat" : "Close chat"}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="border-b border-[#e5e5e7] bg-[#fafafa] px-4 py-3">
            <p className="text-xs font-medium text-[#6e6e73]">
              {isID ? "Jam support Tetamo Agent" : "Tetamo Agent support hours"}
            </p>
            <p className="mt-1 text-xs leading-5 text-[#8e8e93]">
              {supportHours}
            </p>
          </div>

          {waitingForAgent ? (
            <div className="border-b border-[#e5e5e7] bg-[#fff8e7] px-4 py-3 text-sm font-medium text-[#8a6b00]">
              {isID
                ? "Menunggu Tetamo Agent bergabung..."
                : "Waiting for Tetamo Agent to join..."}
            </div>
          ) : null}

          <div className="max-h-[360px] min-h-[300px] space-y-3 overflow-y-auto bg-white px-4 py-4">
            {loadingMessages && messages.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-[#6e6e73]">
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
                    <div className="max-w-[85%]">
                      <div
                        className={[
                          "rounded-2xl px-4 py-3 text-sm leading-6",
                          isUser
                            ? "bg-[#1C1C1E] text-white"
                            : "border border-[#e5e5e7] bg-[#fafafa] text-[#1C1C1E]",
                        ].join(" ")}
                      >
                        <p className="whitespace-pre-line">{message.message_text}</p>
                      </div>

                      <div
                        className={`mt-1 text-[11px] text-[#8e8e93] ${
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
                          className="mt-2 flex items-center gap-2 rounded-2xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-xs font-semibold text-[#1C1C1E] transition hover:bg-[#f8f8f8] disabled:opacity-60"
                        >
                          {handoffLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Headphones className="h-4 w-4" />
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
                  <div className="max-w-[88%] rounded-2xl border border-[#e5e5e7] bg-[#fafafa] px-4 py-3 text-sm leading-6 text-[#1C1C1E]">
                    <p>
                      {isID
                        ? "Halo, saya Scorpio Assist. Anda bisa tanya tentang cara pasang properti, paket, atau cara kerja Tetamo."
                        : "Hi, I’m Scorpio Assist. You can ask me about listing property, packages, or how Tetamo works."}
                    </p>
                  </div>
                </div>

                <div className="pt-1">
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-[#8e8e93]">
                    {isID ? "Coba tanya" : "Try asking"}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {starterQuestions.map((question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() => handleStarterQuestion(question)}
                        className="rounded-full border border-[#d2d2d7] bg-white px-3 py-2 text-xs font-medium text-[#1C1C1E] transition hover:bg-[#f8f8f8]"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {authPrompt ? (
              <div className="rounded-2xl border border-[#e5e5e7] bg-[#fafafa] p-4">
                <p className="text-sm font-semibold text-[#1C1C1E]">
                  {isID
                    ? "Login untuk chat dengan Tetamo Agent"
                    : "Log in to chat with Tetamo Agent"}
                </p>

                <p className="mt-2 text-sm leading-6 text-[#6e6e73]">
                  {isID
                    ? "Untuk diteruskan ke Tetamo Agent, silakan login atau daftar terlebih dahulu."
                    : "To continue with Tetamo Agent, please log in or sign up first."}
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 rounded-2xl bg-[#1C1C1E] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    <LogIn className="h-4 w-4" />
                    {isID ? "Login" : "Log in"}
                  </Link>

                  <Link
                    href="/signup"
                    className="flex items-center justify-center gap-2 rounded-2xl border border-[#d2d2d7] bg-white px-4 py-3 text-sm font-semibold text-[#1C1C1E] transition hover:bg-[#f8f8f8]"
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
            <div className="border-t border-[#e5e5e7] bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <div className="border-t border-[#e5e5e7] bg-white p-4">
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
                className="max-h-28 min-h-[48px] flex-1 resize-none rounded-2xl border border-[#d2d2d7] bg-white px-4 py-3 text-sm text-[#1C1C1E] outline-none placeholder:text-[#8e8e93] focus:border-[#1C1C1E]"
              />

              <button
                type="button"
                onClick={() => void handleSendMessage()}
                disabled={sending || !input.trim()}
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1C1C1E] text-white transition hover:opacity-90 disabled:opacity-60"
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
                disabled={handoffLoading || waitingForAgent}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#d2d2d7] bg-white px-4 py-3 text-sm font-semibold text-[#1C1C1E] transition hover:bg-[#f8f8f8] disabled:opacity-60"
              >
                {handoffLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Headphones className="h-4 w-4" />
                )}
                {isID ? "Chat dengan Tetamo Agent" : "Chat with Tetamo Agent"}
              </button>

              <p className="text-[11px] leading-5 text-[#8e8e93]">
                {isID
                  ? "Scorpio Assist terbuka untuk semua pengguna. Login hanya diperlukan untuk Tetamo Agent, riwayat chat tersimpan, dan bantuan khusus akun."
                  : "Scorpio Assist is open to all users. Login is only required for Tetamo Agent, saved chat history, and account-specific help."}
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
        className="fixed bottom-5 right-5 z-[60] inline-flex h-14 items-center gap-2 rounded-full border border-white/20 bg-[#1C1C1E] px-4 pr-5 text-white shadow-[0_12px_30px_rgba(0,0,0,0.28)] transition hover:scale-105 hover:opacity-95"
      >
        <Sparkles className="h-5 w-5 shrink-0" />
        <span className="whitespace-nowrap text-sm font-semibold">
          Scorpio Assist
        </span>
      </button>
    </>
  );
}