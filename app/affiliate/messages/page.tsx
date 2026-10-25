"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, CheckCheck, RefreshCw, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";

type AffiliateMessage = {
  recipientId: string;
  id: string;
  subject: string;
  message: string;
  createdAt: string;
  read: boolean;
  readAt: string | null;
};

export default function AffiliateMessagesPage() {
  const [messages, setMessages] = useState<AffiliateMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const loadMessages = useCallback(async () => {
    setError("");

    try {
      const { data, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const token = data.session?.access_token;

      if (!token) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch("/api/affiliate/admin-messages", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to load messages.");
      }

      setMessages(result.messages || []);
      setUnreadCount(Number(result.unreadCount) || 0);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load messages."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  async function markAsRead(recipientId: string) {
    setBusyId(recipientId);
    setError("");

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch("/api/affiliate/admin-messages", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipientId }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Could not mark as read.");
      }

      setMessages((current) =>
        current.map((item) =>
          item.recipientId === recipientId
            ? { ...item, read: true, readAt: new Date().toISOString() }
            : item
        )
      );

      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not mark as read."
      );
    } finally {
      setBusyId("");
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 text-slate-900 dark:text-white sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/affiliate"
          className="mb-6 inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/70 px-4 py-2 text-sm font-semibold shadow-sm backdrop-blur dark:bg-slate-900/70"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>

        <section className="rounded-3xl border border-white/40 bg-white/85 p-5 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-violet-600 p-3 text-white">
                <MessageCircle size={25} />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold">
                  Messages from Admin
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                  Important updates and announcements from your network.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="rounded-full bg-violet-100 px-3 py-1.5 text-sm font-bold text-violet-800 dark:bg-violet-500/20 dark:text-violet-200">
                {unreadCount} unread
              </span>
              <button
                type="button"
                onClick={() => void loadMessages()}
                className="rounded-xl border border-slate-200 p-2.5 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                aria-label="Refresh messages"
                title="Refresh messages"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-slate-500">
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-slate-300 px-5 py-14 text-center dark:border-slate-700">
              <MessageCircle
                size={38}
                className="mx-auto mb-3 text-slate-400"
              />
              <h2 className="font-bold">No messages yet</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Messages from Admin will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-7 space-y-4">
              {messages.map((item) => (
                <article
                  key={item.recipientId}
                  className={`rounded-2xl border p-5 ${
                    item.read
                      ? "border-slate-200 bg-white/60 dark:border-slate-700 dark:bg-slate-950/30"
                      : "border-violet-300 bg-violet-50/80 dark:border-violet-500/40 dark:bg-violet-500/10"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                          item.read ? "bg-slate-300" : "bg-violet-600"
                        }`}
                      />
                      <div>
                        <h2 className="text-lg font-bold">{item.subject}</h2>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleString()
                            : ""}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        item.read
                          ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          : "bg-violet-600 text-white"
                      }`}
                    >
                      {item.read ? "Read" : "Unread"}
                    </span>
                  </div>

                  <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 dark:text-slate-200">
                    {item.message}
                  </p>

                  {!item.read && (
                    <button
                      type="button"
                      disabled={busyId === item.recipientId}
                      onClick={() => void markAsRead(item.recipientId)}
                      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <CheckCheck size={17} />
                      {busyId === item.recipientId
                        ? "Updating..."
                        : "Mark as read"}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}