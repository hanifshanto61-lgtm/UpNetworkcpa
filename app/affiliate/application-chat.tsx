"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  Send,
  X,
  RefreshCw,
  ShieldCheck,
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

export default function ApplicationChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const getToken = useCallback(async () => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error("Your session expired. Please log in again.");
    }

    setUserId(session.user.id);
    return session.access_token;
  }, []);

  const loadMessages = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError("");

    try {
      const token = await getToken();

      const response = await fetch("/api/application-chat", {
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

      setMessages(result.messages ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your messages."
      );
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (!open) return;

    void loadMessages();

    const interval = window.setInterval(() => {
      void loadMessages(false);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [open, loadMessages]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, messages]);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = draft.trim();

    if (!message || sending) return;

    if (message.length > 5000) {
      setError("Message must be 5000 characters or fewer.");
      return;
    }

    setSending(true);
    setError("");

    try {
      const token = await getToken();

      const response = await fetch("/api/application-chat", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to send message.");
      }

      setMessages((current) => [
        ...current,
        result.message as ChatMessage,
      ]);
      setDraft("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send your message."
      );
    } finally {
      setSending(false);
    }
  }

  function formatTime(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString("en-BD", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-400"
      >
        <MessageCircle size={18} />
        Chat with Manager
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-5">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Chat with Manager"
            className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-700 bg-[#090d17] text-white shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-400">
                  <MessageCircle size={21} />
                </div>

                <div>
                  <h2 className="font-bold">Chat with Manager</h2>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                    <ShieldCheck size={13} />
                    Private application conversation
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X size={20} />
              </button>
            </header>

            <div className="flex min-h-[250px] flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
              {loading && messages.length === 0 && (
                <p className="py-10 text-center text-sm text-slate-400">
                  Loading conversation...
                </p>
              )}

              {!loading && messages.length === 0 && !error && (
                <div className="m-auto max-w-xs py-8 text-center">
                  <MessageCircle className="mx-auto mb-3 text-cyan-400" size={32} />
                  <p className="font-semibold">Start a conversation</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Ask the manager about your affiliate application.
                  </p>
                </div>
              )}

              {messages.map((item) => {
                const ownMessage =
                  item.sender_role === "affiliate" &&
                  item.sender_user_id === userId;

                return (
                  <div
                    key={item.id}
                    className={`flex ${ownMessage ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-3 ${
                        ownMessage
                          ? "rounded-br-sm bg-cyan-500 text-slate-950"
                          : "rounded-bl-sm border border-white/10 bg-slate-800 text-white"
                      }`}
                    >
                      <p className="mb-1 text-[11px] font-bold opacity-75">
                        {ownMessage ? "You" : "Manager"}
                      </p>

                      <p className="whitespace-pre-wrap break-words text-sm leading-6">
                        {item.message}
                      </p>

                      <p className="mt-2 text-right text-[10px] opacity-65">
                        {formatTime(item.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}

              {error && (
                <div className="rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
                  {error}
                  <button
                    type="button"
                    onClick={() => void loadMessages()}
                    className="ml-2 inline-flex items-center gap-1 font-bold underline"
                  >
                    <RefreshCw size={12} />
                    Retry
                  </button>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={sendMessage}
              className="border-t border-white/10 p-3"
            >
              <label htmlFor="application-chat-message" className="sr-only">
                Your message
              </label>

              <div className="flex items-end gap-2">
                <textarea
                  id="application-chat-message"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Write your message..."
                  rows={2}
                  maxLength={5000}
                  className="min-w-0 flex-1 resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
                />

                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  aria-label="Send message"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send size={18} />
                </button>
              </div>

              <p className="mt-2 text-[10px] text-slate-500">
                Maximum 5000 characters per message.
              </p>
            </form>
          </section>
        </div>
      )}
    </>
  );
}