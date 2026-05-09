"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

type Conversation = {
  id: string;
  phone: string | null;
  phone_e164: string | null;
  profile_name: string | null;
  channel: string | null;
  status: string | null;
  ai_enabled: boolean | null;
  handover_to_admin: boolean | null;
  handover_reason: string | null;
  last_inbound_at: string | null;
  window_expires_at: string | null;
  last_message: string | null;
  last_message_direction: string | null;
  last_message_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type Message = {
  id: string;
  conversation_id: string;
  direction: string;
  from_number: string | null;
  to_number: string | null;
  phone: string | null;
  profile_name: string | null;
  message: string | null;
  source: string | null;
  ai_generated: boolean | null;
  admin_generated: boolean | null;
  media_count: number | null;
  created_at: string | null;
};

type FilterValue = "all" | "needs_admin" | "active_ai" | "paused_ai" | "handled";

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "needs_admin", label: "Needs Admin" },
  { value: "active_ai", label: "AI Active" },
  { value: "paused_ai", label: "AI Paused" },
  { value: "handled", label: "Handled" },
];

const MESSAGE_BATCH_SIZE = 30;

function formatDate(value?: string | null) {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("en-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

function shortText(value?: string | null, length = 95) {
  const clean = String(value || "").trim();

  if (!clean) return "-";
  if (clean.length <= length) return clean;

  return `${clean.slice(0, length).trim()}...`;
}

function Badge({
  children,
  tone = "gray",
}: {
  children: ReactNode;
  tone?: "gray" | "green" | "red" | "amber" | "blue";
}) {
  const classes: Record<string, string> = {
    gray: "bg-gray-100 text-gray-700 border-gray-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    red: "bg-red-50 text-red-700 border-red-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${classes[tone]}`}
    >
      {children}
    </span>
  );
}

export default function AdminWhatsappInboxPage() {
  const [filter, setFilter] = useState<FilterValue>("all");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [visibleMessageCount, setVisibleMessageCount] =
    useState(MESSAGE_BATCH_SIZE);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");

  const selectedConversationId = selectedConversation?.id || "";

  const stats = useMemo(() => {
    return {
      total: conversations.length,
      needsAdmin: conversations.filter((item) => item.handover_to_admin).length,
      activeAi: conversations.filter(
        (item) => item.ai_enabled && !item.handover_to_admin
      ).length,
      pausedAi: conversations.filter((item) => !item.ai_enabled).length,
    };
  }, [conversations]);

  const visibleMessages = useMemo(() => {
    if (messages.length <= visibleMessageCount) return messages;
    return messages.slice(messages.length - visibleMessageCount);
  }, [messages, visibleMessageCount]);

  const hiddenMessagesCount = Math.max(messages.length - visibleMessageCount, 0);

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || "";
  }

  async function loadConversations(nextFilter = filter) {
    try {
      setLoadingConversations(true);
      setError("");

      const token = await getAccessToken();

      if (!token) {
        setError("Please log in as admin first.");
        setConversations([]);
        return;
      }

      const response = await fetch(
        `/api/admin/whatsapp/conversations?filter=${nextFilter}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to load WhatsApp conversations.");
      }

      const nextConversations = (result.conversations || []) as Conversation[];
      setConversations(nextConversations);

      if (
        selectedConversationId &&
        !nextConversations.some((item) => item.id === selectedConversationId)
      ) {
        setSelectedConversation(null);
        setMessages([]);
        setVisibleMessageCount(MESSAGE_BATCH_SIZE);
      }

      if (!selectedConversationId && nextConversations.length > 0) {
        setSelectedConversation(nextConversations[0]);
      }
    } catch (err: any) {
      console.error("Load WhatsApp conversations error:", err);
      setError(err?.message || "Failed to load WhatsApp conversations.");
    } finally {
      setLoadingConversations(false);
    }
  }

  async function loadMessages(conversationId: string) {
    if (!conversationId) return;

    try {
      setLoadingMessages(true);
      setError("");

      const token = await getAccessToken();

      if (!token) {
        setError("Please log in as admin first.");
        setMessages([]);
        setVisibleMessageCount(MESSAGE_BATCH_SIZE);
        return;
      }

      const response = await fetch(
        `/api/admin/whatsapp/conversations?conversationId=${conversationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to load WhatsApp messages.");
      }

      setSelectedConversation((result.conversation || null) as Conversation | null);
      setMessages((result.messages || []) as Message[]);
      setVisibleMessageCount(MESSAGE_BATCH_SIZE);
    } catch (err: any) {
      console.error("Load WhatsApp messages error:", err);
      setError(err?.message || "Failed to load WhatsApp messages.");
    } finally {
      setLoadingMessages(false);
    }
  }

  async function updateConversation(action: string) {
    if (!selectedConversationId) return;

    try {
      setActionLoading(action);
      setError("");

      const token = await getAccessToken();

      if (!token) {
        setError("Please log in as admin first.");
        return;
      }

      const response = await fetch("/api/admin/whatsapp/conversations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId: selectedConversationId,
          action,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to update conversation.");
      }

      await loadConversations(filter);
      await loadMessages(selectedConversationId);
    } catch (err: any) {
      console.error("Update WhatsApp conversation error:", err);
      setError(err?.message || "Failed to update conversation.");
    } finally {
      setActionLoading("");
    }
  }

  function loadMoreMessages() {
    setVisibleMessageCount((prev) => prev + MESSAGE_BATCH_SIZE);
  }

  useEffect(() => {
    loadConversations(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId]);

  return (
    <main className="min-h-screen text-[#1C1C1E]">
      <div className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">
              Tetamo AI
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              WhatsApp Inbox
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Monitor WhatsApp leads from Twilio, Meta ads, and Tetamo AI replies.
              Use this inbox to identify conversations that need admin follow-up.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              loadConversations(filter);
              if (selectedConversationId) loadMessages(selectedConversationId);
            }}
            className="rounded-2xl bg-[#1C1C1E] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            Refresh
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
              Total
            </p>
            <p className="mt-2 text-2xl font-bold">{stats.total}</p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-400">
              Needs Admin
            </p>
            <p className="mt-2 text-2xl font-bold text-red-700">
              {stats.needsAdmin}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-500">
              AI Active
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">
              {stats.activeAi}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-500">
              AI Paused
            </p>
            <p className="mt-2 text-2xl font-bold text-amber-800">
              {stats.pausedAi}
            </p>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={[
                "rounded-full border px-4 py-2 text-sm font-semibold transition",
                filter === item.value
                  ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
              ].join(" ")}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="rounded-[28px] border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-sm font-bold">Conversations</h2>
            {loadingConversations ? (
              <span className="text-xs text-gray-400">Loading...</span>
            ) : null}
          </div>

          <div className="max-h-[720px] space-y-2 overflow-y-auto pr-1">
            {!loadingConversations && conversations.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                No conversations found.
              </div>
            ) : null}

            {conversations.map((conversation) => {
              const active = selectedConversationId === conversation.id;

              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedConversation(conversation)}
                  className={[
                    "w-full rounded-2xl border p-4 text-left transition",
                    active
                      ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                      : "border-gray-200 bg-white hover:bg-gray-50",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {conversation.profile_name ||
                          conversation.phone_e164 ||
                          conversation.phone ||
                          "WhatsApp Lead"}
                      </p>
                      <p
                        className={[
                          "mt-1 truncate text-xs",
                          active ? "text-white/65" : "text-gray-500",
                        ].join(" ")}
                      >
                        {conversation.phone_e164 || conversation.phone || "-"}
                      </p>
                    </div>

                    <span
                      className={[
                        "shrink-0 rounded-full px-2 py-1 text-[10px] font-bold",
                        conversation.handover_to_admin
                          ? active
                            ? "bg-red-400 text-white"
                            : "bg-red-50 text-red-700"
                          : conversation.ai_enabled
                          ? active
                            ? "bg-emerald-400 text-white"
                            : "bg-emerald-50 text-emerald-700"
                          : active
                          ? "bg-amber-300 text-[#1C1C1E]"
                          : "bg-amber-50 text-amber-800",
                      ].join(" ")}
                    >
                      {conversation.handover_to_admin
                        ? "Needs Admin"
                        : conversation.ai_enabled
                        ? "AI Active"
                        : "AI Paused"}
                    </span>
                  </div>

                  <p
                    className={[
                      "mt-3 text-sm leading-5",
                      active ? "text-white/80" : "text-gray-600",
                    ].join(" ")}
                  >
                    {shortText(conversation.last_message)}
                  </p>

                  <p
                    className={[
                      "mt-3 text-[11px]",
                      active ? "text-white/50" : "text-gray-400",
                    ].join(" ")}
                  >
                    {formatDate(conversation.last_message_at)}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[28px] border border-gray-200 bg-white shadow-sm">
          {!selectedConversation ? (
            <div className="flex min-h-[420px] items-center justify-center p-6 text-center text-sm text-gray-500">
              Select a conversation to view the message history.
            </div>
          ) : (
            <>
              <div className="border-b border-gray-100 p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold">
                      {selectedConversation.profile_name ||
                        selectedConversation.phone_e164 ||
                        selectedConversation.phone ||
                        "WhatsApp Lead"}
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      {selectedConversation.phone_e164 ||
                        selectedConversation.phone ||
                        "-"}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedConversation.handover_to_admin ? (
                        <Badge tone="red">Needs Admin</Badge>
                      ) : selectedConversation.ai_enabled ? (
                        <Badge tone="green">AI Active</Badge>
                      ) : (
                        <Badge tone="amber">AI Paused</Badge>
                      )}

                      <Badge tone="gray">
                        {selectedConversation.status || "active"}
                      </Badge>

                      {selectedConversation.handover_reason ? (
                        <Badge tone="blue">
                          {selectedConversation.handover_reason}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateConversation("mark_handled")}
                      disabled={Boolean(actionLoading)}
                      className="rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {actionLoading === "mark_handled"
                        ? "Saving..."
                        : "Mark Handled"}
                    </button>

                    <button
                      type="button"
                      onClick={() => updateConversation("resume_ai")}
                      disabled={Boolean(actionLoading)}
                      className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                    >
                      {actionLoading === "resume_ai" ? "Saving..." : "Resume AI"}
                    </button>

                    <button
                      type="button"
                      onClick={() => updateConversation("pause_ai")}
                      disabled={Boolean(actionLoading)}
                      className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                    >
                      {actionLoading === "pause_ai" ? "Saving..." : "Pause AI"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="max-h-[720px] space-y-4 overflow-y-auto bg-gray-50 p-4 sm:p-5">
                {loadingMessages ? (
                  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
                    Loading messages...
                  </div>
                ) : null}

                {!loadingMessages && messages.length === 0 ? (
                  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
                    No messages found.
                  </div>
                ) : null}

                {!loadingMessages && hiddenMessagesCount > 0 ? (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={loadMoreMessages}
                      className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                      Load More ({hiddenMessagesCount} older message
                      {hiddenMessagesCount > 1 ? "s" : ""})
                    </button>
                  </div>
                ) : null}

                {visibleMessages.map((message) => {
                  const isInbound = message.direction === "inbound";
                  const isSystem = message.direction === "system";

                  if (isSystem) {
                    return (
                      <div key={message.id} className="flex justify-center">
                        <div className="max-w-[85%] rounded-full border border-gray-200 bg-white px-4 py-2 text-center text-xs text-gray-500">
                          {message.message}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={message.id}
                      className={`flex ${
                        isInbound ? "justify-start" : "justify-end"
                      }`}
                    >
                      <div
                        className={[
                          "max-w-[88%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[75%]",
                          isInbound
                            ? "rounded-bl-md border border-gray-200 bg-white text-gray-800"
                            : "rounded-br-md bg-[#1C1C1E] text-white",
                        ].join(" ")}
                      >
                        <p className="whitespace-pre-line">
                          {message.message || "-"}
                        </p>

                        <div
                          className={[
                            "mt-2 flex flex-wrap items-center gap-2 text-[11px]",
                            isInbound ? "text-gray-400" : "text-white/55",
                          ].join(" ")}
                        >
                          <span>{formatDate(message.created_at)}</span>
                          {message.ai_generated ? <span>AI</span> : null}
                          {message.admin_generated ? <span>Admin</span> : null}
                          {message.source ? <span>{message.source}</span> : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}