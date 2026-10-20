"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type ChatMessage = {
  id: number;
  affiliate_user_id: string;
  sender_user_id: string;
  sender_role: "affiliate" | "admin";
  message: string;
  is_read: boolean;
  created_at: string;
};

type AffiliateProfile = {
  id?: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  username?: string | null;
  affiliate_id?: string | null;
  application_status?: string | null;
};

type Conversation = {
  affiliate_user_id: string;
  profile: AffiliateProfile;
  messages: ChatMessage[];
  last_message_at: string | null;
  unread_count: number;
};

export default function ApplicationChatsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedConversation = useMemo(
    () =>
      conversations.find(
        (item) => item.affiliate_user_id === selectedId
      ) ?? null,
    [conversations, selectedId]
  );

  const loadConversations = useCallback(
    async (showLoader = false) => {
      if (!supabase) {
        setError("Supabase is not configured.");
        setLoading(false);
        return;
      }

      if (showLoader) setRefreshing(true);
      setError("");

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.access_token) {
          router.replace("/login");
          return;
        }

        const token = session.access_token;
        setAccessToken(token);

        const response = await fetch("/api/application-chat", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        const result = await response.json();

        if (response.status === 401 || response.status === 403) {
          router.replace("/affiliate");
          return;
        }

        if (!response.ok || result?.success !== true) {
          throw new Error(
            result?.error || "Unable to load application conversations."
          );
        }

        if (
          !["super_admin", "sub_admin"].includes(result?.role)
        ) {
          router.replace("/affiliate");
          return;
        }

        const nextConversations: Conversation[] = Array.isArray(
          result.conversations
        )
          ? result.conversations
          : [];

        setAuthorized(true);
        setConversations(nextConversations);

        setSelectedId((current) => {
          if (
            current &&
            nextConversations.some(
              (item) => item.affiliate_user_id === current
            )
          ) {
            return current;
          }

          return nextConversations[0]?.affiliate_user_id ?? "";
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load application conversations."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    void loadConversations();

    const interval = window.setInterval(() => {
      void loadConversations();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [loadConversations]);

  async function sendReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = draft.trim();

    if (!message || !selectedId || sending || !accessToken) return;

    if (message.length > 5000) {
      setError("Message must be 5000 characters or fewer.");
      return;
    }

    setSending(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/application-chat", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          affiliate_user_id: selectedId,
          message,
        }),
      });

      const result = await response.json();

      if (!response.ok || result?.success !== true) {
        throw new Error(result?.error || "Unable to send reply.");
      }

      setDraft("");
      setNotice("Reply sent successfully.");

      await loadConversations();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to send reply."
      );
    } finally {
      setSending(false);
    }
  }

  function getAffiliateName(profile: AffiliateProfile) {
    const fullName =
      profile.full_name ||
      [profile.first_name, profile.last_name]
        .filter(Boolean)
        .join(" ");

    return fullName || profile.username || profile.email || "Affiliate";
  }

  function formatTime(value?: string | null) {
    if (!value) return "No messages yet";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString("en-BD", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070c] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />
          <p className="text-sm text-slate-400">
            Loading application chats...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070c] px-3 py-5 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-400">
              <MessageCircle size={24} />
            </div>

            <div>
              <h1 className="text-xl font-black sm:text-2xl">
                Application Chats
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                Reply to affiliate applicants
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800"
            >
              <ArrowLeft size={16} />
              Admin Panel
            </button>

            <button
              type="button"
              onClick={() => void loadConversations(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-3 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </header>

        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4">
          <ShieldCheck size={20} className="text-cyan-400" />
          <p className="text-sm text-slate-300">
            Private applicant conversations. Both admins and sub-admins
            can reply here.
          </p>
          <span className="ml-auto rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
            {conversations.length} conversation
            {conversations.length === 1 ? "" : "s"}
          </span>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
            <button
              type="button"
              onClick={() => void loadConversations(true)}
              className="ml-2 font-bold underline"
            >
              Try again
            </button>
          </div>
        )}

        {notice && (
          <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {notice}
          </div>
        )}

        {!authorized && !error ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-400">
            Verifying admin access...
          </div>
        ) : (
          <section className="grid min-h-[65vh] gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="overflow-hidden rounded-2xl border border-slate-800 bg-[#090d17]">
              <div className="border-b border-white/10 px-4 py-4">
                <h2 className="font-bold">Applicants</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Select a conversation to reply
                </p>
              </div>

              <div className="max-h-[65vh] overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <MessageCircle
                      size={30}
                      className="mx-auto mb-3 text-slate-600"
                    />
                    <p className="text-sm font-semibold text-slate-300">
                      No conversations yet
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Applicants will appear here after they send a
                      message from Chat with Manager.
                    </p>
                  </div>
                ) : (
                  conversations.map((conversation) => {
                    const profile = conversation.profile || {};
                    const active =
                      selectedId === conversation.affiliate_user_id;
                    const lastMessage =
                      conversation.messages[
                        conversation.messages.length - 1
                      ];

                    return (
                      <button
                        key={conversation.affiliate_user_id}
                        type="button"
                        onClick={() => {
                          setSelectedId(conversation.affiliate_user_id);
                          setNotice("");
                          setError("");
                        }}
                        className={`w-full border-b border-white/5 p-4 text-left transition ${
                          active
                            ? "bg-cyan-500/10"
                            : "hover:bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-cyan-400">
                            <UserRound size={19} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-sm font-bold text-white">
                                {getAffiliateName(profile)}
                              </p>

                              {conversation.unread_count > 0 && (
                                <span className="rounded-full bg-cyan-400 px-2 py-0.5 text-[10px] font-black text-slate-950">
                                  {conversation.unread_count}
                                </span>
                              )}
                            </div>

                            <p className="mt-1 truncate text-xs text-slate-500">
                              {profile.affiliate_id ||
                                profile.username ||
                                profile.email ||
                                conversation.affiliate_user_id}
                            </p>

                            <p className="mt-2 truncate text-xs text-slate-400">
                              {lastMessage?.sender_role === "admin"
                                ? "You: "
                                : ""}
                              {lastMessage?.message || "No messages"}
                            </p>

                            <p className="mt-2 text-[10px] text-slate-600">
                              {formatTime(conversation.last_message_at)}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            <section className="flex min-h-[500px] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#090d17]">
              {!selectedConversation ? (
                <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                  <MessageCircle
                    size={42}
                    className="mb-4 text-slate-700"
                  />
                  <h2 className="font-bold text-slate-300">
                    Select an applicant
                  </h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                    Choose a conversation from the left to view messages
                    and reply.
                  </p>
                </div>
              ) : (
                <>
                  <header className="border-b border-white/10 px-4 py-4 sm:px-5">
                    <h2 className="font-bold">
                      {getAffiliateName(selectedConversation.profile || {})}
                    </h2>

                    <p className="mt-1 break-all text-xs text-slate-500">
                      {selectedConversation.profile?.email ||
                        selectedConversation.profile?.affiliate_id ||
                        selectedConversation.affiliate_user_id}
                    </p>

                    <p className="mt-2 text-[10px] uppercase tracking-wider text-cyan-400">
                      Status:{" "}
                      {selectedConversation.profile?.application_status ||
                        "Applicant"}
                    </p>
                  </header>

                  <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-5">
                    {selectedConversation.messages.map((item) => {
                      const isAdmin = item.sender_role === "admin";

                      return (
                        <div
                          key={item.id}
                          className={`flex ${
                            isAdmin ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[90%] rounded-2xl px-4 py-3 sm:max-w-[80%] ${
                              isAdmin
                                ? "rounded-br-sm bg-cyan-500 text-slate-950"
                                : "rounded-bl-sm border border-white/10 bg-slate-800 text-white"
                            }`}
                          >
                            <p className="mb-1 text-[10px] font-bold opacity-70">
                              {isAdmin ? "Admin / Sub-admin" : "Affiliate"}
                            </p>

                            <p className="whitespace-pre-wrap break-words text-sm leading-6">
                              {item.message}
                            </p>

                            <p className="mt-2 text-right text-[10px] opacity-60">
                              {formatTime(item.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <form
                    onSubmit={sendReply}
                    className="border-t border-white/10 p-3 sm:p-4"
                  >
                    <label
                      htmlFor="admin-application-reply"
                      className="sr-only"
                    >
                      Reply to applicant
                    </label>

                    <div className="flex items-end gap-2">
                      <textarea
                        id="admin-application-reply"
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder="Write a reply to the applicant..."
                        rows={2}
                        maxLength={5000}
                        className="min-w-0 flex-1 resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
                      />

                      <button
                        type="submit"
                        disabled={
                          sending ||
                          !draft.trim() ||
                          !selectedId
                        }
                        aria-label="Send reply"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Send size={18} />
                      </button>
                    </div>

                    <p className="mt-2 text-[10px] text-slate-500">
                      Maximum 5000 characters per message.
                    </p>
                  </form>
                </>
              )}
            </section>
          </section>
        )}
      </div>
    </main>
  );
}