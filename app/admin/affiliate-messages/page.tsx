"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, Send, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Affiliate = {
  id: string;
  affiliateId: string;
  name: string;
  email: string;
  status: string;
};

export default function AffiliateMessagesPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [recipientType, setRecipientType] = useState<"all" | "single">("all");
  const [affiliateUserId, setAffiliateUserId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const pending = useRef(false);

  async function api(method = "GET", body?: unknown) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      throw new Error("Please log in with your admin account.");
    }

    const response = await fetch("/api/admin/affiliate-messages", {
      method,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Request failed.");
    }

    return result;
  }

  async function loadAffiliates() {
    setLoading(true);
    setError("");

    try {
      const result = await api();
      setAffiliates(result.affiliates || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load affiliates."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAffiliates();
  }, []);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending.current) return;

    pending.current = true;
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const result = await api("POST", {
        recipientType,
        affiliateUserId: recipientType === "single" ? affiliateUserId : "",
        subject,
        message,
      });

      setSuccess(
        `Message sent successfully to ${result.sent} affiliate(s).`
      );
      setSubject("");
      setMessage("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to send message."
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400 disabled:opacity-50";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin" className="text-sm text-cyan-400">
          &larr; Admin Dashboard
        </Link>

        <div className="mt-6 flex items-center gap-3">
          <div className="rounded-xl bg-cyan-500/15 p-3 text-cyan-300">
            <MessageCircle size={25} />
          </div>
          <div>
            <h1 className="text-2xl font-black">Affiliate Messages</h1>
            <p className="mt-1 text-sm text-slate-400">
              Send a private message or an announcement to all affiliates.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <Users className="mb-2 text-cyan-300" size={22} />
            <p className="text-sm text-slate-400">Available affiliates</p>
            <p className="mt-1 text-2xl font-black">
              {loading ? "..." : affiliates.length}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <Send className="mb-2 text-emerald-300" size={22} />
            <p className="text-sm text-slate-400">Delivery mode</p>
            <p className="mt-1 text-lg font-bold">
              {recipientType === "all" ? "All affiliates" : "One affiliate"}
            </p>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-5 rounded-xl bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </p>
        )}

        {success && (
          <p role="status" className="mt-5 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-300">
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
              onChange={(event) => setRecipientType(event.target.value as "all" | "single")}
              disabled={busy}
              className={inputClass}
            >
              <option value="all">All affiliates</option>
              <option value="single">One specific affiliate</option>
            </select>
          </label>

          {recipientType === "single" && (
            <label className="block text-sm">
              Select affiliate
              <select
                value={affiliateUserId}
                onChange={(event) => setAffiliateUserId(event.target.value)}
                required
                disabled={busy || loading}
                className={inputClass}
              >
                <option value="">Choose an affiliate</option>
                {affiliates.map((affiliate) => (
                  <option key={affiliate.id} value={affiliate.id}>
                    {affiliate.name}
                    {affiliate.affiliateId ? ` (${affiliate.affiliateId})` : ""}
                    {affiliate.email ? ` — ${affiliate.email}` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block text-sm">
            Subject
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
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
              onChange={(event) => setMessage(event.target.value)}
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

          <p className="text-xs text-slate-400">
            Messages will appear in the recipient's affiliate message area once that panel is connected.
          </p>
        </form>
      </div>
    </main>
  );
}