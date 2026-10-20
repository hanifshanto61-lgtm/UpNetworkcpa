"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  Copy,
  Plus,
  Trash2,
  RefreshCw,
  Webhook,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

type Setting = {
  id: string;
  name: string;
  tracker: string;
  postback_url: string;
  enabled: boolean;
};

const trackers = [
  { value: "affise", label: "Affise" },
  { value: "keitaro", label: "Keitaro" },
  { value: "redtrack", label: "RedTrack" },
  { value: "binom", label: "Binom 2" },
  { value: "voluum", label: "Voluum" },
  { value: "other", label: "Other" },
];

export default function AffiliatePostbackPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [name, setName] = useState("");
  const [tracker, setTracker] = useState("affise");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function request(
    method: string,
    body?: Record<string, unknown>,
    id?: string
  ) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      throw new Error("Your session expired. Please sign in again.");
    }

    const response = await fetch(
      "/api/affiliate/postback-settings" +
        (id ? `?id=${encodeURIComponent(id)}` : ""),
      {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        cache: "no-store",
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Request failed.");
    }

    return result;
  }

  async function loadSettings() {
    setLoading(true);
    setError("");

    try {
      const result = await request("GET");
      setSettings(result.settings || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  async function saveSetting(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      await request("POST", {
        name,
        tracker,
        postback_url: url.trim(),
        enabled: true,
      });

      setName("");
      setUrl("");
      setMessage("Postback setting saved.");
      await loadSettings();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save setting.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleSetting(setting: Setting) {
    setError("");
    setMessage("");

    try {
      await request("PUT", {
        id: setting.id,
        enabled: !setting.enabled,
      });
      await loadSettings();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update setting.");
    }
  }

  async function deleteSetting(setting: Setting) {
    if (!window.confirm(`Delete "${setting.name}"?`)) return;

    setError("");
    setMessage("");

    try {
      await request("DELETE", undefined, setting.id);
      setMessage("Postback setting deleted.");
      await loadSettings();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete setting.");
    }
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("Copied to clipboard.");
    } catch {
      setError("Unable to copy. Please select and copy the URL manually.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href="/affiliate"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft size={17} /> Affiliate Dashboard
        </Link>

        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-400/15 p-3 text-amber-300">
              <Webhook size={27} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Postback Settings</h1>
              <p className="mt-1 text-sm text-slate-400">
                Manage your own conversion tracking callbacks.
              </p>
            </div>
          </div>

          <button
            onClick={() => void loadSettings()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </header>

        {message && (
          <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-700/50 bg-emerald-950/40 p-3 text-sm text-emerald-300">
            <CheckCircle2 size={18} /> {message}
          </div>
        )}

        {error && (
          <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
          <h2 className="text-lg font-semibold">Add Postback</h2>
          <p className="mb-6 mt-1 text-sm text-slate-400">
            Add the URL supplied by your tracker. Only HTTPS URLs are accepted.
          </p>

          <form onSubmit={saveSetting} className="space-y-5">
            <div>
              <label htmlFor="tracker" className="mb-2 block text-sm font-medium">
                S1 — Tracker
              </label>
              <select
                id="tracker"
                value={tracker}
                onChange={(e) => setTracker(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3"
              >
                {trackers.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="postback-name" className="mb-2 block text-sm font-medium">
                S2 — Postback Name
              </label>
              <input
                id="postback-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
                placeholder="e.g. My Affiliate Tracker"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label htmlFor="postback-url" className="mb-2 block text-sm font-medium">
                S3 — Tracker Postback URL
              </label>
              <textarea
                id="postback-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                maxLength={2000}
                required
                rows={4}
                placeholder="https://your-tracker.example/postback?clickid=..."
                className="w-full break-all rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 font-mono text-sm outline-none focus:border-amber-400"
              />
              <p className="mt-2 text-xs text-slate-400">
                Use your tracker's own URL and macros. Do not paste passwords,
                API keys, or other account secrets into the URL.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-400 px-5 py-3 font-semibold text-slate-950 hover:bg-amber-300 disabled:opacity-50"
            >
              <Plus size={18} />
              {saving ? "Saving..." : "Save Postback"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Your Postbacks</h2>
              <p className="mt-1 text-sm text-slate-400">
                Only settings belonging to your account are shown.
              </p>
            </div>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-sm">
              {settings.length}
            </span>
          </div>

          {loading ? (
            <p className="py-6 text-sm text-slate-400">Loading settings...</p>
          ) : settings.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
              No postbacks yet. Add your first tracker above.
            </p>
          ) : (
            <div className="space-y-4">
              {settings.map((setting) => (
                <article
                  key={setting.id}
                  className="rounded-xl border border-slate-800 p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{setting.name}</h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {trackers.find((t) => t.value === setting.tracker)?.label || setting.tracker}
                      </p>
                    </div>

                    <span className={`rounded-full px-3 py-1 text-xs ${setting.enabled ? "bg-emerald-400/10 text-emerald-300" : "bg-slate-700 text-slate-300"}`}>
                      {setting.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>

                  <div className="mt-4 break-all rounded-lg bg-slate-950 p-3 font-mono text-xs text-slate-300">
                    {setting.postback_url}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => void copyText(setting.postback_url)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
                    >
                      <Copy size={15} /> Copy URL
                    </button>

                    <button
                      onClick={() => void toggleSetting(setting)}
                      className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
                    >
                      {setting.enabled ? "Disable" : "Enable"}
                    </button>

                    <button
                      onClick={() => void deleteSetting(setting)}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-900 px-3 py-2 text-sm text-red-300 hover:bg-red-950"
                    >
                      <Trash2 size={15} /> Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <p className="text-xs leading-5 text-slate-500">
          Saving a URL configures it for your account. Automatic conversion
          delivery and test delivery must be connected to the verified
          conversion processing flow before this setting can send live events.
        </p>
      </div>
    </main>
  );
}