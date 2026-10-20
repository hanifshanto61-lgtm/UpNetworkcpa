"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  MessageCircle,
  RefreshCw,
  Send,
  User,
  Clock,
  AlertCircle,
} from "lucide-react";

type ChatMessage = {
  id: number;
  affiliate_user_id: string;
  sender_user_id: string;
  sender_role: "affiliate" | "admin";
  message: string;
  is_read: boolean;
  created_at: string;
};

type Applicant = {
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
  profile: Applicant;
  messages: ChatMessage[];
  last_message_at: string | null;
  unread_count: number;
};

export default function ApplicationChatsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [accessToken, setAccessToken] = useState("");

  const selected = conversations.find(
    (conversation) => conversation.affiliate_user_id === selectedId
  );

  const loadChats = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      const token = sessionData.session?.access_token;

      if (sessionError || !token) {
        setError("Admin session পাওয়া যায়নি। আবার লগইন করুন।");
        setLoading(false);
        return;
      }

      setAccessToken(token);

      const response = await fetch("/api/application-chat", {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || `Chats load failed (${response.status})`
        );
      }

      if (!Array.isArray(result.conversations)) {
        throw new Error("API থেকে conversations তালিকা পাওয়া যায়নি।");
      }

      setConversations(result.conversations);

      setSelectedId((current) => {
        if (
          current &&
          result.conversations.some(
            (item: Conversation) =>
              item.affiliate_user_id === current
          )
        ) {
          return current;
        }

        return result.conversations[0]?.affiliate_user_id ?? "";
      });

      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "মেসেজ লোড করা যায়নি।"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadChats(true);

    const timer = window.setInterval(() => {
      void loadChats(false);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [loadChats]);

  const sendReply = async () => {
    const message = reply.trim();

    if (!selectedId || !message || sending) return;

    setSending(true);
    setError("");
    setNotice("");

    try {
      const token = accessToken;

      if (!token) {
        throw new Error("Admin session পাওয়া যায়নি। আবার লগইন করুন।");
      }

      const response = await fetch("/api/application-chat", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          affiliate_user_id: selectedId,
          message,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Reply পাঠানো যায়নি।");
      }

      setReply("");
      setNotice("Reply সফলভাবে পাঠানো হয়েছে।");
      await loadChats(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Reply পাঠানো যায়নি।"
      );
    } finally {
      setSending(false);
    }
  };

  const applicantName = (profile: Applicant) =>
    profile.full_name ||
    [profile.first_name, profile.last_name]
      .filter(Boolean)
      .join(" ") ||
    profile.username ||
    profile.email ||
    "Affiliate";

  const formatTime = (date: string | null) => {
    if (!date) return "কোনো মেসেজ নেই";

    return new Date(date).toLocaleString("en-GB", {
      timeZone: "Asia/Dhaka",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <main className="min-h-screen bg-slate-950 p-3 text-white sm:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="rounded-xl border border-slate-700 p-2 hover:bg-slate-800"
              aria-label="Back to admin"
            >
              <ArrowLeft size={20} />
            </Link>

            <div>
              <h1 className="text-2xl font-bold">
                Application Chats
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Pending Affiliate মেসেজ দেখুন ও উত্তর দিন
              </p>
            </div>
          </div>

          <button
            onClick={() => void loadChats(true)}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-medium hover:bg-indigo-500 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </header>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            {notice}
          </div>
        )}

        <div className="grid min-h-[650px] grid-cols-1 gap-4 md:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-800 p-4">
              <h2 className="font-semibold">Conversations</h2>
              <span className="rounded-full bg-indigo-500/20 px-2.5 py-1 text-xs text-indigo-300">
                {conversations.length}
              </span>
            </div>

            <div className="max-h-[600px] overflow-y-auto">
              {loading && conversations.length === 0 ? (
                <p className="p-5 text-sm text-slate-400">
                  মেসেজ লোড হচ্ছে...
                </p>
              ) : conversations.length === 0 ? (
                <div className="p-6 text-center">
                  <MessageCircle
                    size={32}
                    className="mx-auto mb-3 text-slate-600"
                  />
                  <p className="font-medium">এখনও কোনো মেসেজ নেই</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Affiliate প্রথম মেসেজ পাঠালে এখানে দেখা যাবে।
                  </p>
                </div>
              ) : (
                conversations.map((conversation) => {
                  const profile = conversation.profile || {};
                  const lastMessage =
                    conversation.messages[
                      conversation.messages.length - 1
                    ];

                  return (
                    <button
                      key={conversation.affiliate_user_id}
                      onClick={() => {
                        setSelectedId(conversation.affiliate_user_id);
                        setNotice("");
                        setError("");
                      }}
                      className={`w-full border-b border-slate-800 p-4 text-left transition hover:bg-slate-800/70 ${
                        selectedId === conversation.affiliate_user_id
                          ? "bg-indigo-500/10 border-l-2 border-l-indigo-400"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300">
                            <User size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold">
                              {applicantName(profile)}
                            </p>
                            <p className="truncate text-xs text-slate-400">
                              {profile.affiliate_id ||
                                profile.email ||
                                conversation.affiliate_user_id}
                            </p>
                          </div>
                        </div>

                        {conversation.unread_count > 0 && (
                          <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-bold text-slate-950">
                            {conversation.unread_count}
                          </span>
                        )}
                      </div>

                      <p className="mt-3 truncate text-sm text-slate-300">
                        {lastMessage?.message || "মেসেজ নেই"}
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        {formatTime(conversation.last_message_at)}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section className="flex min-h-[500px] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            {!selected ? (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-slate-400">
                <MessageCircle size={44} className="mb-4 opacity-50" />
                <p className="font-semibold text-white">
                  একটি Conversation নির্বাচন করুন
                </p>
                <p className="mt-2 text-sm">
                  Affiliate-এর মেসেজ এখানে দেখা যাবে।
                </p>
              </div>
            ) : (
              <>
                <div className="border-b border-slate-800 p-4">
                  <h2 className="font-semibold">
                    {applicantName(selected.profile || {})}
                  </h2>
                  <p className="mt-1 break-all text-xs text-slate-400">
                    {selected.profile?.email || selected.affiliate_user_id}
                  </p>
                  {selected.profile?.application_status && (
                    <span className="mt-2 inline-block rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
                      {selected.profile.application_status}
                    </span>
                  )}
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-4">
                  {selected.messages.map((item) => {
                    const isAdmin = item.sender_role === "admin";

                    return (
                      <div
                        key={item.id}
                        className={`flex ${
                          isAdmin ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${
                            isAdmin
                              ? "rounded-br-sm bg-indigo-600"
                              : "rounded-bl-sm bg-slate-800"
                          }`}
                        >
                          <p className="mb-1 text-xs font-semibold opacity-75">
                            {isAdmin ? "Admin / Manager" : "Affiliate"}
                          </p>
                          <p className="whitespace-pre-wrap break-words text-sm">
                            {item.message}
                          </p>
                          <p className="mt-2 flex items-center justify-end gap-1 text-[10px] opacity-60">
                            <Clock size={11} />
                            {formatTime(item.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form
                  className="border-t border-slate-800 p-3 sm:p-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void sendReply();
                  }}
                >
                  <div className="flex items-end gap-2">
                    <textarea
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      placeholder="Affiliate-কে উত্তর লিখুন..."
                      maxLength={5000}
                      rows={3}
                      className="min-h-[76px] flex-1 resize-y rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm outline-none focus:border-indigo-500"
                    />

                    <button
                      type="submit"
                      disabled={!reply.trim() || sending}
                      className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send size={17} />
                      <span className="hidden sm:inline">
                        {sending ? "Sending..." : "Reply"}
                      </span>
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    মেসেজ স্বয়ংক্রিয়ভাবে প্রতি ৫ সেকেন্ডে Refresh হবে।
                  </p>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}