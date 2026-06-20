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
  free_entry_point_expires_at: string | null;
  free_entry_point_source: string | null;
  ad_referral_source: string | null;
  ad_referral_payload: unknown | null;
  ad_referral_updated_at: string | null;
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

type ChannelFilterValue =
  | "all_channels"
  | "meta_whatsapp"
  | "twilio_whatsapp"
  | "unknown_channel";

type BadgeTone = "gray" | "green" | "red" | "amber" | "blue" | "purple";

type NewMessageProvider = "meta_cloud_api" | "twilio_whatsapp";

type ConversationStats = {
  total: number;
  metaDirect: number;
  twilio: number;
  adWindowOpen: number;
  needsAdmin: number;
  activeAi: number;
  pausedAi: number;
  handled: number;
};

type PaginationState = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  from: number;
  to: number;
};

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "needs_admin", label: "Needs Admin" },
  { value: "active_ai", label: "AI Active" },
  { value: "paused_ai", label: "AI Paused" },
  { value: "handled", label: "Handled" },
];

const CHANNEL_FILTERS: { value: ChannelFilterValue; label: string }[] = [
  { value: "all_channels", label: "All Sources" },
  { value: "meta_whatsapp", label: "Meta Direct" },
  { value: "twilio_whatsapp", label: "Twilio" },
  { value: "unknown_channel", label: "Unknown" },
];

const MESSAGE_BATCH_SIZE = 30;
const PAGE_SIZE_OPTIONS = [25, 50, 100];

const EMPTY_STATS: ConversationStats = {
  total: 0,
  metaDirect: 0,
  twilio: 0,
  adWindowOpen: 0,
  needsAdmin: 0,
  activeAi: 0,
  pausedAi: 0,
  handled: 0,
};

const EMPTY_PAGINATION: PaginationState = {
  page: 1,
  pageSize: 25,
  totalCount: 0,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
  from: 0,
  to: 0,
};

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

function normalizeChannel(value?: string | null) {
  return String(value || "").toLowerCase().trim();
}

function getChannelMeta(channel?: string | null): {
  key: "meta" | "twilio" | "unknown";
  label: string;
  tone: BadgeTone;
} {
  const clean = normalizeChannel(channel);

  if (clean.includes("meta")) {
    return {
      key: "meta",
      label: "Meta Direct",
      tone: "blue",
    };
  }

  if (clean.includes("twilio")) {
    return {
      key: "twilio",
      label: "Twilio",
      tone: "green",
    };
  }

  return {
    key: "unknown",
    label: "Unknown Source",
    tone: "gray",
  };
}

function getMessageSourceMeta(
  message: Message,
  conversation?: Conversation | null
): {
  label: string;
  tone: BadgeTone;
} {
  const source = String(message.source || "").toLowerCase().trim();
  const channelMeta = getChannelMeta(conversation?.channel);

  if (source === "meta") return { label: "Meta Inbound", tone: "blue" };
  if (source === "tetamo_mona_meta")
    return { label: "Mona via Meta", tone: "blue" };
  if (source === "admin_meta_direct")
    return { label: "Admin via Meta", tone: "blue" };
  if (source.includes("meta")) return { label: "Meta Direct", tone: "blue" };

  if (source === "twilio") return { label: "Twilio Inbound", tone: "green" };
  if (source === "tetamo_ai_twilio_api")
    return { label: "AI via Twilio", tone: "green" };
  if (source === "admin_twilio_direct")
    return { label: "Admin via Twilio", tone: "green" };
  if (source.includes("twilio")) return { label: "Twilio", tone: "green" };

  if (source.includes("handover")) return { label: "Handover", tone: "amber" };
  if (source.includes("admin")) return { label: "Admin", tone: "purple" };

  if (message.ai_generated) {
    return {
      label:
        channelMeta.key === "meta"
          ? "AI via Meta"
          : channelMeta.key === "twilio"
          ? "AI via Twilio"
          : "AI Reply",
      tone: channelMeta.tone,
    };
  }

  if (message.admin_generated) return { label: "Admin Reply", tone: "purple" };

  return {
    label: source || channelMeta.label,
    tone: channelMeta.tone,
  };
}

function isDateOpen(value?: string | null) {
  if (!value) return false;

  const expiry = new Date(value).getTime();

  if (!Number.isFinite(expiry)) return false;

  return expiry > Date.now();
}

function hasDate(value?: string | null) {
  if (!value) return false;

  const expiry = new Date(value).getTime();

  return Number.isFinite(expiry);
}

function getReplyWindowLabel(value?: string | null) {
  return isDateOpen(value) ? "24h Reply Open" : "24h Reply Closed";
}

function getAdWindowLabel(value?: string | null) {
  if (!hasDate(value)) return "No Ad Window";

  return isDateOpen(value) ? "72h Ad Open" : "72h Ad Closed";
}

function getAdWindowTone(value?: string | null): BadgeTone {
  if (!hasDate(value)) return "gray";

  return isDateOpen(value) ? "blue" : "gray";
}

function Badge({
  children,
  tone = "gray",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  const classes: Record<BadgeTone, string> = {
    gray: "bg-gray-100 text-gray-700 border-gray-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    red: "bg-red-50 text-red-700 border-red-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
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
  const [channelFilter, setChannelFilter] =
    useState<ChannelFilterValue>("all_channels");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [stats, setStats] = useState<ConversationStats>(EMPTY_STATS);
  const [pagination, setPagination] =
    useState<PaginationState>(EMPTY_PAGINATION);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [visibleMessageCount, setVisibleMessageCount] =
    useState(MESSAGE_BATCH_SIZE);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [newMessagePhone, setNewMessagePhone] = useState("");
  const [newMessageCustomerName, setNewMessageCustomerName] = useState("");
  const [newMessageText, setNewMessageText] = useState("");
  const [newMessageTemplateName, setNewMessageTemplateName] = useState(
    "tetamo_agent_invite_id_01"
  );
  const [newMessageTemplateLanguage, setNewMessageTemplateLanguage] =
    useState("id");
  const [newMessageProvider, setNewMessageProvider] =
    useState<NewMessageProvider>("meta_cloud_api");
  const [sendingNewMessage, setSendingNewMessage] = useState(false);

  const selectedConversationId = selectedConversation?.id || "";
  const selectedReplyWindowOpen = isDateOpen(
    selectedConversation?.window_expires_at
  );
  const selectedAdWindowOpen = isDateOpen(
    selectedConversation?.free_entry_point_expires_at
  );

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

  async function loadConversations(
    nextFilter = filter,
    nextPage = page,
    nextChannelFilter = channelFilter,
    nextPageSize = pageSize
  ) {
    try {
      setLoadingConversations(true);
      setError("");

      const token = await getAccessToken();

      if (!token) {
        setError("Please log in as admin first.");
        setConversations([]);
        setStats(EMPTY_STATS);
        setPagination(EMPTY_PAGINATION);
        return;
      }

      const params = new URLSearchParams({
        filter: nextFilter,
        channelFilter: nextChannelFilter,
        page: String(nextPage),
        pageSize: String(nextPageSize),
      });

      const response = await fetch(
        `/api/admin/whatsapp/conversations?${params.toString()}`,
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
      setStats((result.stats || EMPTY_STATS) as ConversationStats);
      setPagination((result.pagination || EMPTY_PAGINATION) as PaginationState);

      if (nextConversations.length === 0) {
        setSelectedConversation(null);
        setMessages([]);
        setVisibleMessageCount(MESSAGE_BATCH_SIZE);
        return;
      }

      if (
        !selectedConversationId ||
        !nextConversations.some((item) => item.id === selectedConversationId)
      ) {
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
      setSuccessMessage("");

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

      await loadConversations(filter, page, channelFilter, pageSize);
      await loadMessages(selectedConversationId);
    } catch (err: any) {
      console.error("Update WhatsApp conversation error:", err);
      setError(err?.message || "Failed to update conversation.");
    } finally {
      setActionLoading("");
    }
  }

  async function sendAdminReply() {
    if (!selectedConversationId) return;

    const cleanMessage = replyMessage.trim();

    if (!cleanMessage) {
      setError("Please write a reply before sending.");
      return;
    }

    if (!selectedReplyWindowOpen) {
      setError(
        "The 24-hour reply window is closed. Use an approved template message for this customer."
      );
      return;
    }

    try {
      setSendingReply(true);
      setError("");
      setSuccessMessage("");

      const token = await getAccessToken();

      if (!token) {
        setError("Please log in as admin first.");
        return;
      }

      const response = await fetch("/api/admin/whatsapp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId: selectedConversationId,
          message: cleanMessage,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to send WhatsApp reply.");
      }

      setReplyMessage("");
      setSuccessMessage(
        `Reply sent through ${
          result.provider === "meta" ? "Meta Direct" : "Twilio"
        }. AI remains paused until you resume it.`
      );

      await loadConversations(filter, page, channelFilter, pageSize);
      await loadMessages(selectedConversationId);
    } catch (err: any) {
      console.error("Send WhatsApp reply error:", err);
      setError(err?.message || "Failed to send WhatsApp reply.");
    } finally {
      setSendingReply(false);
    }
  }

  async function sendNewMessage() {
    const cleanPhone = newMessagePhone.trim();
    const cleanTemplateName = newMessageTemplateName.trim();
    const cleanTemplateLanguage = newMessageTemplateLanguage.trim() || "id";
    const cleanMessage = newMessageText.trim();
    const cleanCustomerName = newMessageCustomerName.trim();

    if (!cleanPhone) {
      setError("Please enter a WhatsApp number.");
      return;
    }

    if (!cleanTemplateName) {
      setError("Template name is required.");
      return;
    }

    try {
      setSendingNewMessage(true);
      setError("");
      setSuccessMessage("");

      const token = await getAccessToken();

      if (!token) {
        setError("Please log in as admin first.");
        return;
      }

      const response = await fetch("/api/admin/whatsapp/new-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone: cleanPhone,
          customerName: cleanCustomerName || null,
          message: cleanMessage,
          templateName: cleanTemplateName,
          templateLanguage: cleanTemplateLanguage,
          templateCategory: "marketing",
          sendProvider: newMessageProvider,
          leadType: "manual_admin",
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            result.details?.error?.message ||
            "Failed to create WhatsApp message."
        );
      }

      setNewMessageOpen(false);
      setNewMessagePhone("");
      setNewMessageCustomerName("");
      setNewMessageText("");

      const providerLabel =
        result.provider === "twilio" ? "Twilio" : "Meta Direct";

      setSuccessMessage(
        `Message sent through ${providerLabel}. The conversation is now open in the inbox.`
      );

      setFilter("all");
      setChannelFilter("all_channels");
      setPage(1);

      await loadConversations("all", 1, "all_channels", pageSize);

      if (result.conversationId) {
        await loadMessages(result.conversationId);
      }
    } catch (err: any) {
      console.error("Create WhatsApp message error:", err);
      setError(err?.message || "Failed to create WhatsApp message.");
    } finally {
      setSendingNewMessage(false);
    }
  }

  function loadMoreMessages() {
    setVisibleMessageCount((prev) => prev + MESSAGE_BATCH_SIZE);
  }

  function changeFilter(nextFilter: FilterValue) {
    setFilter(nextFilter);
    setPage(1);
  }

  function changeChannelFilter(nextChannelFilter: ChannelFilterValue) {
    setChannelFilter(nextChannelFilter);
    setPage(1);
  }

  function changePageSize(nextPageSize: number) {
    setPageSize(nextPageSize);
    setPage(1);
  }

  function goToPreviousPage() {
    if (!pagination.hasPreviousPage) return;
    setPage((prev) => Math.max(prev - 1, 1));
  }

  function goToNextPage() {
    if (!pagination.hasNextPage) return;
    setPage((prev) => prev + 1);
  }

  useEffect(() => {
    loadConversations(filter, page, channelFilter, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page, channelFilter, pageSize]);

  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId]);

  useEffect(() => {
    if (conversations.length === 0) {
      setSelectedConversation(null);
      setMessages([]);
      return;
    }

    if (
      !selectedConversationId ||
      !conversations.some((item) => item.id === selectedConversationId)
    ) {
      setSelectedConversation(conversations[0]);
    }
  }, [conversations, selectedConversationId]);

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
              Monitor WhatsApp leads from Meta Direct and Twilio. The 24-hour
              reply window controls normal admin replies, while the 72-hour ad
              window tracks Click-to-WhatsApp ad entry where available.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setError("");
                setSuccessMessage("");
                setNewMessageOpen(true);
              }}
              className="rounded-2xl bg-[#1C1C1E] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
            >
              Create Message
            </button>

            <button
              type="button"
              onClick={() => {
                loadConversations(filter, page, channelFilter, pageSize);
                if (selectedConversationId) loadMessages(selectedConversationId);
              }}
              className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-7">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
              Total
            </p>
            <p className="mt-2 text-2xl font-bold">{stats.total}</p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-500">
              Meta Direct
            </p>
            <p className="mt-2 text-2xl font-bold text-blue-700">
              {stats.metaDirect}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-500">
              Twilio
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">
              {stats.twilio}
            </p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-500">
              72h Ads Open
            </p>
            <p className="mt-2 text-2xl font-bold text-blue-700">
              {stats.adWindowOpen}
            </p>
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

        {successMessage ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        <div className="mt-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
            Status Filter
          </p>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => changeFilter(item.value)}
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

        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
            Channel Source
          </p>
          <div className="flex flex-wrap gap-2">
            {CHANNEL_FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => changeChannelFilter(item.value)}
                className={[
                  "rounded-full border px-4 py-2 text-sm font-semibold transition",
                  channelFilter === item.value
                    ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                ].join(" ")}
              >
                {item.label}
              </button>
            ))}
          </div>
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
              const channelMeta = getChannelMeta(conversation.channel);
              const replyWindowOpen = isDateOpen(conversation.window_expires_at);
              const adWindowTone = getAdWindowTone(
                conversation.free_entry_point_expires_at
              );

              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => {
                    setSelectedConversation(conversation);
                    setError("");
                    setSuccessMessage("");
                    setReplyMessage("");
                  }}
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

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span
                      className={[
                        "rounded-full border px-2 py-1 text-[10px] font-bold",
                        active
                          ? "border-white/20 bg-white/10 text-white"
                          : channelMeta.key === "meta"
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : channelMeta.key === "twilio"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-gray-200 bg-gray-50 text-gray-600",
                      ].join(" ")}
                    >
                      {channelMeta.label}
                    </span>

                    <span
                      className={[
                        "rounded-full border px-2 py-1 text-[10px] font-bold",
                        active
                          ? "border-white/20 bg-white/10 text-white"
                          : replyWindowOpen
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-gray-200 bg-gray-50 text-gray-600",
                      ].join(" ")}
                    >
                      {getReplyWindowLabel(conversation.window_expires_at)}
                    </span>

                    <span
                      className={[
                        "rounded-full border px-2 py-1 text-[10px] font-bold",
                        active
                          ? "border-white/20 bg-white/10 text-white"
                          : adWindowTone === "blue"
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-gray-50 text-gray-600",
                      ].join(" ")}
                    >
                      {getAdWindowLabel(conversation.free_entry_point_expires_at)}
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

          <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-3">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
                <span>
                  Showing {pagination.from}-{pagination.to} of{" "}
                  {pagination.totalCount} conversations
                </span>

                <span>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <select
                  value={pageSize}
                  onChange={(event) => changePageSize(Number(event.target.value))}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 outline-none"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size} per page
                    </option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={goToPreviousPage}
                    disabled={!pagination.hasPreviousPage || loadingConversations}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={goToNextPage}
                    disabled={!pagination.hasNextPage || loadingConversations}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
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
                      <Badge tone={getChannelMeta(selectedConversation.channel).tone}>
                        {getChannelMeta(selectedConversation.channel).label}
                      </Badge>

                      {selectedReplyWindowOpen ? (
                        <Badge tone="green">24h Reply Window Open</Badge>
                      ) : (
                        <Badge tone="gray">24h Reply Window Closed</Badge>
                      )}

                      <Badge
                        tone={getAdWindowTone(
                          selectedConversation.free_entry_point_expires_at
                        )}
                      >
                        {getAdWindowLabel(
                          selectedConversation.free_entry_point_expires_at
                        )}
                      </Badge>

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

                    <div className="mt-4 grid gap-3 text-xs text-gray-500 sm:grid-cols-2">
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                        <p className="font-bold text-gray-700">
                          24h Reply Window
                        </p>
                        <p className="mt-1">
                          Expires: {formatDate(selectedConversation.window_expires_at)}
                        </p>
                        <p className="mt-1">
                          Normal admin text replies use this window.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                        <p className="font-bold text-gray-700">72h Ad Window</p>
                        <p className="mt-1">
                          Expires:{" "}
                          {formatDate(
                            selectedConversation.free_entry_point_expires_at
                          )}
                        </p>
                        <p className="mt-1">
                          Source:{" "}
                          {selectedConversation.ad_referral_source ||
                            selectedConversation.free_entry_point_source ||
                            "No ad referral data"}
                        </p>
                      </div>
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

              <div className="max-h-[640px] space-y-4 overflow-y-auto bg-gray-50 p-4 sm:p-5">
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
                  const sourceMeta = getMessageSourceMeta(
                    message,
                    selectedConversation
                  );

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

                          <span
                            className={[
                              "rounded-full border px-2 py-0.5 font-semibold",
                              isInbound
                                ? "border-gray-200 bg-gray-50"
                                : "border-white/15 bg-white/10",
                            ].join(" ")}
                          >
                            {isInbound ? "Customer" : "Tetamo"}
                          </span>

                          <span
                            className={[
                              "rounded-full border px-2 py-0.5 font-semibold",
                              sourceMeta.tone === "blue"
                                ? isInbound
                                  ? "border-blue-200 bg-blue-50 text-blue-700"
                                  : "border-white/15 bg-white/10 text-white/75"
                                : sourceMeta.tone === "green"
                                ? isInbound
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-white/15 bg-white/10 text-white/75"
                                : sourceMeta.tone === "purple"
                                ? isInbound
                                  ? "border-purple-200 bg-purple-50 text-purple-700"
                                  : "border-white/15 bg-white/10 text-white/75"
                                : "border-gray-200 bg-gray-50",
                            ].join(" ")}
                          >
                            {sourceMeta.label}
                          </span>

                          {message.ai_generated ? <span>AI</span> : null}
                          {message.admin_generated ? <span>Admin</span> : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-gray-100 bg-white p-4 sm:p-5">
                <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold">Admin Reply</p>
                      <p className="mt-1 text-xs text-gray-500">
                        Manual replies use the 24-hour reply window. AI stays
                        paused until you click Resume AI.
                      </p>
                    </div>

                    {selectedReplyWindowOpen ? (
                      <Badge tone="green">Free-text allowed</Badge>
                    ) : (
                      <Badge tone="gray">Template needed</Badge>
                    )}
                  </div>

                  {!selectedReplyWindowOpen ? (
                    <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                      The 24-hour reply window is closed. Normal text replies may
                      be rejected. Use an approved template message for this
                      customer.
                    </div>
                  ) : null}

                  {selectedAdWindowOpen && !selectedReplyWindowOpen ? (
                    <div className="mb-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">
                      This lead still has a 72-hour ad/free-entry window, but the
                      normal free-text reply box is controlled by the 24-hour
                      customer reply window.
                    </div>
                  ) : null}

                  <textarea
                    value={replyMessage}
                    onChange={(event) => setReplyMessage(event.target.value)}
                    disabled={!selectedReplyWindowOpen || sendingReply}
                    rows={4}
                    maxLength={1700}
                    placeholder={
                      selectedReplyWindowOpen
                        ? "Write admin reply to customer..."
                        : "24-hour reply window closed. Approved template needed."
                    }
                    className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] disabled:bg-gray-100 disabled:text-gray-400"
                  />

                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-gray-400">
                      {replyMessage.trim().length}/1700 characters
                    </p>

                    <button
                      type="button"
                      onClick={sendAdminReply}
                      disabled={
                        sendingReply ||
                        !selectedReplyWindowOpen ||
                        !replyMessage.trim()
                      }
                      className="rounded-2xl bg-[#1C1C1E] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {sendingReply ? "Sending..." : "Send Reply"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {newMessageOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-[28px] bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
                  New WhatsApp Message
                </p>
                <h2 className="mt-2 text-xl font-bold">Create Message</h2>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Send an approved WhatsApp template to a customer. When the
                  customer replies, the conversation will appear here and Mona
                  can continue automatically.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!sendingNewMessage) setNewMessageOpen(false);
                }}
                disabled={sendingNewMessage}
                className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-50 disabled:opacity-40"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  WhatsApp Number
                </label>
                <input
                  value={newMessagePhone}
                  onChange={(event) => setNewMessagePhone(event.target.value)}
                  disabled={sendingNewMessage}
                  placeholder="Example: 628123456789"
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] disabled:bg-gray-100"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Use country code. Example Indonesia: 628xxxxxxxxx.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  Customer Name Optional
                </label>
                <input
                  value={newMessageCustomerName}
                  onChange={(event) =>
                    setNewMessageCustomerName(event.target.value)
                  }
                  disabled={sendingNewMessage}
                  placeholder="Customer name"
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  Message / Template Variable
                </label>
                <textarea
                  value={newMessageText}
                  onChange={(event) => setNewMessageText(event.target.value)}
                  disabled={sendingNewMessage}
                  rows={4}
                  maxLength={1000}
                  placeholder="Optional. If your approved template uses {{1}}, this text will be sent as the variable."
                  className="mt-2 w-full resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] disabled:bg-gray-100"
                />
                <p className="mt-1 text-xs text-gray-400">
                  This is not a normal free-text message. It is sent through your
                  approved WhatsApp template.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                    Template Name
                  </label>
                  <input
                    value={newMessageTemplateName}
                    onChange={(event) =>
                      setNewMessageTemplateName(event.target.value)
                    }
                    disabled={sendingNewMessage}
                    className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                    Language
                  </label>
                  <input
                    value={newMessageTemplateLanguage}
                    onChange={(event) =>
                      setNewMessageTemplateLanguage(event.target.value)
                    }
                    disabled={sendingNewMessage}
                    placeholder="id"
                    className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] disabled:bg-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  Send Provider
                </label>
                <select
                  value={newMessageProvider}
                  onChange={(event) =>
                    setNewMessageProvider(
                      event.target.value as NewMessageProvider
                    )
                  }
                  disabled={sendingNewMessage}
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] disabled:bg-gray-100"
                >
                  <option value="meta_cloud_api">Meta Direct</option>
                  <option value="twilio_whatsapp">Twilio</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => {
                  if (!sendingNewMessage) setNewMessageOpen(false);
                }}
                disabled={sendingNewMessage}
                className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={sendNewMessage}
                disabled={
                  sendingNewMessage ||
                  !newMessagePhone.trim() ||
                  !newMessageTemplateName.trim()
                }
                className="rounded-2xl bg-[#1C1C1E] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sendingNewMessage ? "Sending..." : "Send Message"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}