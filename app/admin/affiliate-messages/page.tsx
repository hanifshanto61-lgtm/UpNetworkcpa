"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  MessageCircle,
  Send,
  Users,
  Trash2,
  RefreshCw,
  Mail,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Affiliate = {
  id: string;
  affiliateId: string;
  name: string;
  email: string;
  status: string;
};

type SentMessage = {
  id: string;
  subject: string;
  message: string;
  recipient_type: "all" | "single" | string;
  created_at: string;
};

export default function AffiliateMessagesPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [messages, setMessages] = useState<SentMessage[]>([]);
  const [recipientType, setRecipientType] =
    useState<"all" | "single">("all");
  const [affiliateUserId, setAffiliateUserId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const pending = useRef(false);

  async function api(
    method = "GET",
    body?: unknown,
    query = ""
  ) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      throw new Error("Please log in with your admin account.");
    }

    const response = await fetch(
      `/api/admin/affiliate-messages${query}`,
      {
        method,
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        ...(body !== undefined
          ? { body: JSON.stringify(body) }
          : {}),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Request failed.");
    }

    return result;
  }

  async function loadAffiliates() {
    setLoading(true);

    try {
      const result = await api();
      setAffiliates(result.affiliates || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load affiliates."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(showLoading = true) {
    if (showLoading) setMessagesLoading(true);

    try {
      const result = await api(
        "GET",
        undefined,
        "?view=messages"
      );

      setMessages(result.messages || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load sent messages."
      );
    } finally {
      if (showLoading) setMessagesLoading(false);
    }
  }

  useEffect(() => {
    void loadAffiliates();
    void loadMessages();
  }, []);

  async function sendMessage(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (pending.current) return;

    pending.current = true;
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const result = await api("POST", {
        recipientType,
        affiliateUserId:
          recipientType === "single" ? affiliateUserId : "",
        subject,
        message,
      });

      setSuccess(
        `Message sent successfully to ${result.sent} affiliate(s).`
      );

      setSubject("");
      setMessage("");

      await loadMessages(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send message."
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  async function deleteMessage(item: SentMessage) {
    if (deletingId) return;

    const confirmed = window.confirm(
      `Delete "${item.subject}" for all affiliates? This cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(item.id);
    setError("");
    setSuccess("");

    try {
      await api("DELETE", { messageId: item.id });

      setMessages((current) =>
        current.filter((message) => message.id !== item.id)
      );

      setSuccess(
        "Message deleted for all recipients successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete message."
      );
    } finally {
      setDeletingId("");
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400 disabled:opacity-50";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin" className="text-sm text-cyan-400">
          &larr; Admin Dashboard
        </Link>

        <div className="mt-6 flex items-center gap-3">
          <div className="rounded-xl bg-cyan-500/15 p-3 text-cyan-300">
            <MessageCircle size={25} />
          </div>
          <div>
            <h1 className="text-2xl font-black">
              Affiliate Messages
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Send announcements, manage sent messages, and delete
              messages for all recipients.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <Users className="mb-2 text-cyan-300" size={22} />
            <p className="text-sm text-slate-400">
              Available affiliates
            </p>
            <p className="mt-1 text-2xl font-black">
              {loading ? "..." : affiliates.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <Mail className="mb-2 text-emerald-300" size={22} />
            <p className="text-sm text-slate-400">
              Sent messages
            </p>
            <p className="mt-1 text-2xl font-black">
              {messagesLoading ? "..." : messages.length}
            </p>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-500/10 p-4 text-sm text-red-300"
          >
            {error}
          </p>
        )}

        {success && (
          <p
            role="status"
            className="mt-5 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-300"
          >
            {success}
          </p>
        )}

        <form
          onSubmit={sendMessage}
          className="mt-6 space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-5"
        >
          <h2 className="font-bold">Compose Message</h2>

          <label className="block text-sm">
            Send to
            <select
              value={recipientType}
              onChange={(event) =>
                setRecipientType(
                  event.target.value as "all" | "single"
                )
              }
              disabled={busy}
              className={inputClass}
            >
              <option value="all">All affiliates</option>
              <option value="single">
                One specific affiliate
              </option>
            </select>
          </label>

          {recipientType === "single" && (
            <label className="block text-sm">
              Select affiliate
              <select
                value={affiliateUserId}
                onChange={(event) =>
                  setAffiliateUserId(event.target.value)
                }
                required
                disabled={busy || loading}
                className={inputClass}
              >
                <option value="">Choose an affiliate</option>
                {affiliates.map((affiliate) => (
                  <option
                    key={affiliate.id}
                    value={affiliate.id}
                  >
                    {affiliate.name}
                    {affiliate.affiliateId
                      ? ` (${affiliate.affiliateId})`
                      : ""}
                    {affiliate.email
                      ? ` — ${affiliate.email}`
                      : ""}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block text-sm">
            Subject
            <input
              value={subject}
              onChange={(event) =>
                setSubject(event.target.value)
              }
              required
              maxLength={160}
              disabled={busy}
              className={inputClass}
              placeholder="Enter message subject"
            />
          </label>

          <label className="block text-sm">
            Message
            <textarea
              value={message}
              onChange={(event) =>
                setMessage(event.target.value)
              }
              required
              maxLength={10000}
              rows={7}
              disabled={busy}
              className={inputClass}
              placeholder="Write your message here..."
            />
            <span className="mt-1 block text-right text-xs text-slate-500">
              {message.length}/10000
            </span>
          </label>

          <button
            type="submit"
            disabled={
              busy ||
              loading ||
              !subject.trim() ||
              !message.trim() ||
              (recipientType === "single" && !affiliateUserId)
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={18} />
            {busy ? "Sending..." : "Send Message"}
          </button>
        </form>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">
                Sent Messages
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Deleting a message removes its recipient records
                and original message.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadMessages()}
              disabled={messagesLoading || Boolean(deletingId)}
              className="flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          {messagesLoading ? (
            <p className="py-8 text-center text-sm text-slate-400">
              Loading sent messages...
            </p>
          ) : messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No sent messages found.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {messages.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-bold">
                        {item.subject}
                      </h3>

                      <p className="mt-1 text-xs text-cyan-300">
                        {item.recipient_type === "all"
                          ? "All affiliates"
                          : "Specific affiliate"}
                      </p>

                      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-300">
                        {item.message}
                      </p>

                      <p className="mt-3 text-xs text-slate-500">
                        Sent:{" "}
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString()
                          : "Date unavailable"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void deleteMessage(item)}
                      disabled={
                        Boolean(deletingId) ||
                        messagesLoading
                      }
                      className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-500/30 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      {deletingId === item.id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}