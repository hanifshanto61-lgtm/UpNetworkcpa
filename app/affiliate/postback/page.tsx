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
  Send,
  Check,
  Power,
  Code2,
  Info,
} from "lucide-react";

type Setting = {
  id: string;
  name: string;
  tracker: string;
  postback_url: string;
  enabled: boolean;
  created_at?: string;
};

type Tracker = {
  value: string;
  label: string;
  template: string;
};

const trackers: Tracker[] = [
  {
    value: "affise",
    label: "Affise",
    template:
      "https://your-tracker.com/postback?clickid={clickid}&sum={sum}",
  },
  {
    value: "keitaro",
    label: "Keitaro",
    template:
      "https://your-tracker.com/postback?subid={clickid}&payout={sum}",
  },
  {
    value: "redtrack",
    label: "RedTrack",
    template:
      "https://your-tracker.com/postback?clickid={clickid}&sum={sum}",
  },
  {
    value: "binom",
    label: "Binom 2",
    template:
      "https://your-tracker.com/postback?cnv_id={clickid}&payout={sum}",
  },
  {
    value: "voluum",
    label: "Voluum",
    template:
      "https://your-tracker.com/postback?cid={clickid}&payout={sum}",
  },
  {
    value: "bemob",
    label: "BeMob",
    template:
      "https://your-tracker.com/postback?cid={clickid}&payout={sum}",
  },
  {
    value: "peerclick",
    label: "PeerClick",
    template:
      "https://your-tracker.com/postback?cid={clickid}&payout={sum}",
  },
  {
    value: "other",
    label: "Custom URL",
    template:
      "https://your-tracker.com/postback?your_clickid_param={clickid}&your_payout_param={sum}",
  },
];

const macros = [
  {
    value: "{clickid}",
    label: "{clickid}",
    description: "Required. Conversion click identifier.",
  },
  {
    value: "{sum}",
    label: "{sum}",
    description: "Conversion payout amount.",
  },
];

function isValidHttpsUrl(value: string) {
  try {
    const parsed = new URL(value);

    return (
      parsed.protocol === "https:" &&
      Boolean(parsed.hostname) &&
      !parsed.username &&
      !parsed.password &&
      parsed.hostname !== "localhost" &&
      !parsed.hostname.endsWith(".local")
    );
  } catch {
    return false;
  }
}

function trackerLabel(value: string) {
  return (
    trackers.find((item) => item.value === value)?.label ||
    value
  );
}

export default function AffiliatePostbackPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [name, setName] = useState("");
  const [tracker, setTracker] = useState("affise");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [chatId, setChatId] = useState("");
  const [telegramEnabled, setTelegramEnabled] =
    useState(true);
  const [telegramLoading, setTelegramLoading] =
    useState(true);
  const [telegramSaving, setTelegramSaving] =
    useState(false);

  async function request(
    endpoint: string,
    method: string,
    body?: Record<string, unknown>,
    id?: string
  ) {
    const { data, error: sessionError } =
      await supabase.auth.getSession();

    const token = data.session?.access_token;

    if (sessionError || !token) {
      throw new Error(
        "Your session expired. Please sign in again."
      );
    }

    const response = await fetch(
      endpoint +
        (id ? `?id=${encodeURIComponent(id)}` : ""),
      {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body
            ? { "Content-Type": "application/json" }
            : {}),
        },
        ...(body
          ? { body: JSON.stringify(body) }
          : {}),
        cache: "no-store",
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Request failed."
      );
    }

    return result;
  }

  async function loadSettings() {
    setLoading(true);
    setError("");

    try {
      const result = await request(
        "/api/affiliate/postback-settings",
        "GET"
      );

      setSettings(result.settings || []);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to load postback settings."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadTelegramSettings() {
    setTelegramLoading(true);

    try {
      const result = await request(
        "/api/affiliate/telegram-settings",
        "GET"
      );

      setChatId(result.settings?.chat_id || "");
      setTelegramEnabled(
        result.settings?.enabled !== false
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to load Telegram settings."
      );
    } finally {
      setTelegramLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
    void loadTelegramSettings();
  }, []);

  function changeTracker(value: string) {
    setTracker(value);

    const selected = trackers.find(
      (item) => item.value === value
    );

    if (selected) {
      setUrl(selected.template);
    }
  }

  function insertMacro(value: string) {
    setUrl((current) => {
      if (!current) return value;

      const separator = current.includes("?") ? "&" : "?";

      if (current.includes(value)) return current;

      return `${current}${separator}macro=${value}`;
    });
  }

  async function copyText(value: string) {
    setMessage("");
    setError("");

    try {
      await navigator.clipboard.writeText(value);
      setMessage("Copied to clipboard.");
    } catch {
      setError(
        "Unable to copy automatically. Please select and copy the text."
      );
    }
  }

  async function saveSetting(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setMessage("");
    setError("");

    const cleanName = name.trim();
    const cleanUrl = url.trim();

    if (!cleanName) {
      setError("Postback name is required.");
      return;
    }

    if (!isValidHttpsUrl(cleanUrl)) {
      setError(
        "Enter a valid HTTPS postback URL."
      );
      return;
    }

    if (!cleanUrl.includes("{clickid}")) {
      setError(
        "The URL must contain the exact {clickid} macro."
      );
      return;
    }

    setSaving(true);

    try {
      await request(
        "/api/affiliate/postback-settings",
        "POST",
        {
          name: cleanName,
          tracker,
          postback_url: cleanUrl,
          enabled: true,
        }
      );

      setName("");
      setUrl("");

      setMessage("Postback setting saved successfully.");

      await loadSettings();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to save postback."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleSetting(setting: Setting) {
    setMessage("");
    setError("");
    setBusyId(setting.id);

    try {
      await request(
        "/api/affiliate/postback-settings",
        "PUT",
        {
          id: setting.id,
          enabled: !setting.enabled,
        }
      );

      setSettings((current) =>
        current.map((item) =>
          item.id === setting.id
            ? { ...item, enabled: !item.enabled }
            : item
        )
      );

      setMessage(
        setting.enabled
          ? "Postback disabled."
          : "Postback enabled."
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to update postback."
      );
    } finally {
      setBusyId("");
    }
  }

  async function deleteSetting(setting: Setting) {
    if (
      !window.confirm(
        `Delete the postback "${setting.name}"?`
      )
    ) {
      return;
    }

    setMessage("");
    setError("");
    setBusyId(setting.id);

    try {
      await request(
        "/api/affiliate/postback-settings",
        "DELETE",
        undefined,
        setting.id
      );

      setSettings((current) =>
        current.filter(
          (item) => item.id !== setting.id
        )
      );

      setMessage("Postback deleted successfully.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to delete postback."
      );
    } finally {
      setBusyId("");
    }
  }

  async function saveTelegramSettings(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setMessage("");
    setError("");
    setTelegramSaving(true);

    try {
      await request(
        "/api/affiliate/telegram-settings",
        "POST",
        {
          chat_id: chatId.trim(),
          enabled: telegramEnabled,
        }
      );

      setMessage(
        "Telegram notification settings saved."
      );

      await loadTelegramSettings();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to save Telegram settings."
      );
    } finally {
      setTelegramSaving(false);
    }
  }

  async function removeTelegramSettings() {
    if (
      !window.confirm(
        "Remove your Telegram notification settings?"
      )
    ) {
      return;
    }

    setMessage("");
    setError("");

    try {
      await request(
        "/api/affiliate/telegram-settings",
        "DELETE"
      );

      setChatId("");
      setTelegramEnabled(true);

      setMessage("Telegram settings removed.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to remove Telegram settings."
      );
    }
  }

  const activeTracker =
    trackers.find((item) => item.value === tracker) ||
    trackers[0];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href="/affiliate"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft size={17} />
          Affiliate Dashboard
        </Link>

        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-400/15 p-3 text-amber-300">
              <Webhook size={27} />
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                Postback Integration
              </h1>

              <p className="mt-1 text-sm text-slate-400">
                Connect your tracker and configure conversion callbacks.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              void loadSettings();
              void loadTelegramSettings();
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm transition hover:bg-slate-800"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </header>

        {message && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-lg border border-emerald-700/50 bg-emerald-950/40 p-3 text-sm text-emerald-300"
          >
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Add Postback */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">
              Add Postback
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Select your tracker, configure the URL, and save your integration.
            </p>
          </div>

          <form onSubmit={saveSetting} className="space-y-6">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400/15 text-xs font-bold text-amber-300">
                  S1
                </span>

                <label
                  htmlFor="tracker"
                  className="text-sm font-semibold"
                >
                  Tracker
                </label>
              </div>

              <select
                id="tracker"
                value={tracker}
                onChange={(e) =>
                  changeTracker(e.target.value)
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-amber-400"
              >
                {trackers.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs text-slate-400">
                {`Selected tracker: ${activeTracker.label}`}
              </p>
            </div>

            <div>
              <label
                htmlFor="postback-name"
                className="mb-2 block text-sm font-semibold"
              >
                Postback Name <span className="text-red-400">*</span>
              </label>

              <input
                id="postback-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
                placeholder="e.g. My Affise Tracker"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400/15 text-xs font-bold text-amber-300">
                  S2
                </span>

                <label
                  htmlFor="postback-url"
                  className="text-sm font-semibold"
                >
                  Global Postback URL{" "}
                  <span className="text-red-400">*</span>
                </label>
              </div>

              <p className="mb-3 flex items-start gap-2 text-xs leading-5 text-slate-400">
                <Info size={15} className="mt-0.5 shrink-0" />
                Select a template and replace the example domain and parameter names with the values required by your tracker.
              </p>

              <textarea
                id="postback-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                maxLength={2000}
                required
                rows={4}
                placeholder="https://your-tracker.com/postback?subid={clickid}&payout={sum}"
                className="w-full break-all rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 font-mono text-sm outline-none focus:border-amber-400"
              />

              <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <h3 className="text-sm font-semibold">
                  Correct Format — Examples
                </h3>

                <div className="mt-3 space-y-3">
                  {trackers.map((item) => (
                    <div
                      key={item.value}
                      className="flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-300">
                          {item.label}
                        </p>

                        <code className="mt-1 block break-all text-xs text-slate-500">
                          {item.template.replace(
                            "https://your-tracker.com",
                            "https://..."
                          )}
                        </code>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          void copyText(item.template)
                        }
                        aria-label={`Copy ${item.label} template`}
                        className="shrink-0 rounded-lg border border-slate-700 p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-xs leading-5 text-slate-500">
                  These are editable examples, not verified account-specific tracker URLs. Confirm parameter names with your tracker before using them.
                </p>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400/15 text-xs font-bold text-amber-300">
                  S3
                </span>

                <h3 className="text-sm font-semibold">
                  Available Macros
                </h3>
              </div>

              <p className="mb-3 text-xs text-slate-400">
                Click a macro to insert it into the URL. Keep the macro spelling exactly as shown.
              </p>

              <div className="flex flex-wrap gap-2">
                {macros.map((macro) => (
                  <button
                    key={macro.value}
                    type="button"
                    onClick={() => insertMacro(macro.value)}
                    className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 font-mono text-sm text-cyan-300 transition hover:bg-cyan-500/20"
                  >
                    {macro.label}
                  </button>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                {macros.map((macro) => (
                  <p
                    key={macro.value}
                    className="text-xs leading-5 text-slate-400"
                  >
                    <code className="text-cyan-300">
                      {macro.value}
                    </code>
                    {" — "}
                    {macro.description}
                  </p>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={18} />
              {saving ? "Saving..." : "Save Postback"}
            </button>
          </form>
        </section>

        {/* Telegram Notifications */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-sky-400/10 p-3 text-sky-300">
              <Send size={22} />
            </div>

            <div>
              <h2 className="text-lg font-semibold">
                Telegram Lead Notifications
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Configure your existing Telegram notification settings.
              </p>
            </div>
          </div>

          {telegramLoading ? (
            <p className="py-4 text-sm text-slate-400">
              Loading Telegram settings...
            </p>
          ) : (
            <form
              onSubmit={saveTelegramSettings}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="telegram-chat-id"
                  className="mb-2 block text-sm font-medium"
                >
                  Telegram Chat ID
                </label>

                <input
                  id="telegram-chat-id"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  maxLength={100}
                  required
                  inputMode="numeric"
                  placeholder="Enter your numeric Telegram Chat ID"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-sky-400"
                />

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Start your Telegram bot before expecting messages. Use your numeric Chat ID, not your @username.
                </p>
              </div>

              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={telegramEnabled}
                  onChange={(e) =>
                    setTelegramEnabled(e.target.checked)
                  }
                  className="h-4 w-4 accent-sky-400"
                />
                Enable Telegram lead notifications
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={telegramSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-sky-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-300 disabled:opacity-50"
                >
                  <Send size={17} />
                  {telegramSaving
                    ? "Saving..."
                    : "Save Telegram Settings"}
                </button>

                {chatId && (
                  <button
                    type="button"
                    onClick={() =>
                      void removeTelegramSettings()
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-red-900 px-4 py-3 text-sm text-red-300 hover:bg-red-950"
                  >
                    <Trash2 size={16} />
                    Remove
                  </button>
                )}
              </div>
            </form>
          )}
        </section>

        {/* Saved Postbacks */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                Your Postbacks
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Manage the postback settings saved to your account.
              </p>
            </div>

            <span className="rounded-full bg-slate-800 px-3 py-1 text-sm">
              {settings.length}
            </span>
          </div>

          {loading ? (
            <p className="py-6 text-sm text-slate-400">
              Loading postbacks...
            </p>
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
                    <div className="min-w-0">
                      <h3 className="break-words font-semibold">
                        {setting.name}
                      </h3>

                      <p className="mt-1 text-sm text-slate-400">
                        {trackerLabel(setting.tracker)}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        setting.enabled
                          ? "bg-emerald-400/10 text-emerald-300"
                          : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {setting.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>

                  <div className="mt-4 break-all rounded-lg bg-slate-950 p-3 font-mono text-xs text-slate-300">
                    {setting.postback_url}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void copyText(setting.postback_url)
                      }
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
                    >
                      <Copy size={15} />
                      Copy URL
                    </button>

                    <button
                      type="button"
                      disabled={busyId === setting.id}
                      onClick={() =>
                        void toggleSetting(setting)
                      }
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
                    >
                      <Power size={15} />
                      {setting.enabled ? "Disable" : "Enable"}
                    </button>

                    <button
                      type="button"
                      disabled={busyId === setting.id}
                      onClick={() =>
                        void deleteSetting(setting)
                      }
                      className="inline-flex items-center gap-2 rounded-lg border border-red-900 px-3 py-2 text-sm text-red-300 hover:bg-red-950 disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-xs leading-5 text-slate-500">
          <div className="flex items-start gap-2">
            <Code2 size={16} className="mt-0.5 shrink-0" />
            <p>
              Postback settings are stored using the existing authenticated API. Saving a URL does not by itself guarantee that conversion callbacks are delivered. Live delivery requires the server-side conversion integration to resolve the macros and send the callback successfully.
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
  }
