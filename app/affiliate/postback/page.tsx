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
  Power,
  Code2,
  Info,
  Pencil,
  FlaskConical,
  History,
  X,
  Save,
} from "lucide-react";

type Setting = {
  id: string;
  name: string;
  tracker: string;
  postback_url: string;
  enabled: boolean;
  created_at?: string;
};

type DeliveryLog = {
  id: string;
  setting_id: string | null;
  event_type: "test" | "conversion";
  status: "pending" | "success" | "failed";
  http_status: number | null;
  response_excerpt: string | null;
  created_at: string;
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
    template: "https://your-tracker.com/postback?clickid={clickid}&sum={sum}",
  },
  {
    value: "keitaro",
    label: "Keitaro",
    template: "https://your-tracker.com/postback?subid={clickid}&payout={sum}",
  },
  {
    value: "redtrack",
    label: "RedTrack",
    template: "https://your-tracker.com/postback?clickid={clickid}&sum={sum}",
  },
  {
    value: "binom",
    label: "Binom 2",
    template: "https://your-tracker.com/postback?cnv_id={clickid}&payout={sum}",
  },
  {
    value: "voluum",
    label: "Voluum",
    template: "https://your-tracker.com/postback?cid={clickid}&payout={sum}",
  },
  {
    value: "bemob",
    label: "BeMob",
    template: "https://your-tracker.com/postback?cid={clickid}&payout={sum}",
  },
  {
    value: "peerclick",
    label: "PeerClick",
    template: "https://your-tracker.com/postback?cid={clickid}&payout={sum}",
  },
  {
    value: "other",
    label: "Custom URL",
    template: "https://your-tracker.com/postback?your_clickid_param={clickid}&your_payout_param={sum}",
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
  {
    value: "{status}",
    label: "{status}",
    description: "Conversion status.",
  },
  {
    value: "{affiliate_id}",
    label: "{affiliate_id}",
    description: "Affiliate ID.",
  },
  {
    value: "{offer_id}",
    label: "{offer_id}",
    description: "Offer ID.",
  },
  {
    value: "{country}",
    label: "{country}",
    description: "Conversion country.",
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

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function statusClass(status: string) {
  if (status === "success") {
    return "bg-emerald-400/10 text-emerald-300";
  }

  if (status === "failed") {
    return "bg-red-400/10 text-red-300";
  }

  return "bg-amber-400/10 text-amber-300";
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
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [telegramLoading, setTelegramLoading] = useState(true);
  const [telegramSaving, setTelegramSaving] = useState(false);

  const [editingId, setEditingId] = useState("");
  const [editName, setEditName] = useState("");
  const [editTracker, setEditTracker] = useState("other");
  const [editUrl, setEditUrl] = useState("");

  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsSettingId, setLogsSettingId] = useState("");
  const [testingId, setTestingId] = useState("");

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

  async function loadLogs(settingId?: string) {
    setLogsLoading(true);
    setError("");

    try {
      const endpoint = settingId
        ? `/api/affiliate/postback-test?setting_id=${encodeURIComponent(settingId)}`
        : "/api/affiliate/postback-test";

      const result = await request(endpoint, "GET");

      setLogs(result.logs || []);
      setLogsSettingId(settingId || "");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to load delivery logs."
      );
    } finally {
      setLogsLoading(false);
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
      if (current.includes(value)) return current;

      const separator = current.includes("?") ? "&" : "?";

      return `${current}${separator}macro=${value}`;
    });
  }

  function insertEditMacro(value: string) {
    setEditUrl((current) => {
      if (!current) return value;
      if (current.includes(value)) return current;

      const separator = current.includes("?") ? "&" : "?";

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
      setError("Enter a valid HTTPS postback URL.");
      return;
    }

    if (!cleanUrl.includes("{clickid}")) {
      setError("The URL must contain the exact {clickid} macro.");
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
      setTracker("affise");

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

  function startEdit(setting: Setting) {
    setEditingId(setting.id);
    setEditName(setting.name);
    setEditTracker(setting.tracker);
    setEditUrl(setting.postback_url);
    setMessage("");
    setError("");
  }

  async function saveEdit(
    event: React.FormEvent<HTMLFormElement>,
    setting: Setting
  ) {
    event.preventDefault();
    setMessage("");
    setError("");

    const cleanUrl = editUrl.trim();

    if (!editName.trim()) {
      setError("Postback name is required.");
      return;
    }

    if (
      !isValidHttpsUrl(cleanUrl) ||
      !cleanUrl.includes("{clickid}")
    ) {
      setError(
        "Enter a valid HTTPS URL containing {clickid}."
      );
      return;
    }

    setBusyId(setting.id);

    try {
      const result = await request(
        "/api/affiliate/postback-settings",
        "PUT",
        {
          id: setting.id,
          name: editName.trim(),
          tracker: editTracker,
          postback_url: cleanUrl,
        }
      );

      setSettings((current) =>
        current.map((item) =>
          item.id === setting.id
            ? result.setting
            : item
        )
      );

      setEditingId("");
      setMessage("Postback updated successfully.");
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

  async function testSetting(setting: Setting) {
    setMessage("");
    setError("");
    setTestingId(setting.id);

    try {
      const result = await request(
        "/api/affiliate/postback-test",
        "POST",
        { setting_id: setting.id }
      );

      setMessage(
        result.message || "Test callback completed."
      );

      await loadLogs(setting.id);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Test callback failed."
      );

      await loadLogs(setting.id);
    } finally {
      setTestingId("");
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

      if (logsSettingId === setting.id) {
        setLogs([]);
        setLogsSettingId("");
      }

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
              if (logsSettingId) {
                void loadLogs(logsSettingId);
              }
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
              <label
                htmlFor="tracker"
                className="mb-2 block text-sm font-semibold"
              >
                Tracker
              </label>

              <select
                id="tracker"
                value={tracker}
                onChange={(e) =>
                  changeTracker(e.target.value)
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-amber-400"
              >
                {trackers.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs text-slate-400">
                Selected tracker: {activeTracker.label}
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
              <label
                htmlFor="postback-url"
                className="mb-2 block text-sm font-semibold"
              >
                Global Postback URL{" "}
                <span className="text-red-400">*</span>
              </label>

              <p className="mb-3 flex items-start gap-2 text-xs leading-5 text-slate-400">
                <Info size={15} className="mt-0.5 shrink-0" />
                Replace the example domain and parameter names with the values required by your tracker.
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
                  Tracker URL Examples
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
                        onClick={() => void copyText(item.template)}
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
              <h3 className="mb-3 text-sm font-semibold">
                Available Macros
              </h3>

              <p className="mb-3 text-xs text-slate-400">
                Click a macro to insert it into the URL.
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
                  Start your Telegram bot before expecting messages. Use your numeric Chat ID, not your @username. The bot token stays on the server.
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
                    onClick={() => void removeTelegramSettings()}
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
                Edit, test and manage your saved tracker integrations.
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
                  {editingId === setting.id ? (
                    <form
                      onSubmit={(event) =>
                        void saveEdit(event, setting)
                      }
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-semibold">
                          Edit Postback
                        </h3>

                        <button
                          type="button"
                          onClick={() => setEditingId("")}
                          className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:bg-slate-800"
                          aria-label="Cancel editing"
                        >
                          <X size={17} />
                        </button>
                      </div>

                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        maxLength={100}
                        required
                        placeholder="Postback name"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-amber-400"
                      />

                      <select
                        value={editTracker}
                        onChange={(e) => {
                          setEditTracker(e.target.value);
                        }}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-amber-400"
                      >
                        {trackers.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>

                      <textarea
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                        maxLength={2000}
                        required
                        rows={4}
                        className="w-full break-all rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 font-mono text-sm outline-none focus:border-amber-400"
                      />

                      <div className="flex flex-wrap gap-2">
                        {macros.map((macro) => (
                          <button
                            key={macro.value}
                            type="button"
                            onClick={() =>
                              insertEditMacro(macro.value)
                            }
                            className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 font-mono text-xs text-cyan-300"
                          >
                            {macro.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          disabled={busyId === setting.id}
                          className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
                        >
                          <Save size={15} />
                          {busyId === setting.id
                            ? "Saving..."
                            : "Save Changes"}
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingId("")}
                          className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
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
                          onClick={() => startEdit(setting)}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
                        >
                          <Pencil size={15} />
                          Edit
                        </button>

                        <button
                          type="button"
                          disabled={
                            !setting.enabled ||
                            testingId === setting.id
                          }
                          onClick={() => void testSetting(setting)}
                          className="inline-flex items-center gap-2 rounded-lg border border-cyan-700/60 px-3 py-2 text-sm text-cyan-300 hover:bg-cyan-950/40 disabled:opacity-50"
                        >
                          <FlaskConical size={15} />
                          {testingId === setting.id
                            ? "Testing..."
                            : "Test"}
                        </button>

                        <button
                          type="button"
                          disabled={busyId === setting.id}
                          onClick={() => void toggleSetting(setting)}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
                        >
                          <Power size={15} />
                          {setting.enabled ? "Disable" : "Enable"}
                        </button>

                        <button
                          type="button"
                          onClick={() => void loadLogs(setting.id)}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
                        >
                          <History size={15} />
                          Logs
                        </button>

                        <button
                          type="button"
                          disabled={busyId === setting.id}
                          onClick={() => void deleteSetting(setting)}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-900 px-3 py-2 text-sm text-red-300 hover:bg-red-950 disabled:opacity-50"
                        >
                          <Trash2 size={15} />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Delivery Logs */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <History size={19} className="text-amber-300" />
                Delivery Logs
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Review test callbacks and conversion delivery results.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadLogs(logsSettingId || undefined)
              }
              disabled={logsLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw size={15} />
              Refresh Logs
            </button>
          </div>

          {logsSettingId && (
            <button
              type="button"
              onClick={() => void loadLogs()}
              className="mb-4 text-xs text-cyan-300 underline"
            >
              Show all postback logs
            </button>
          )}

          {logsLoading ? (
            <p className="py-5 text-sm text-slate-400">
              Loading delivery logs...
            </p>
          ) : logs.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
              No delivery logs loaded. Select Logs on a postback or refresh this section.
            </p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <article
                  key={log.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold capitalize">
                        {log.event_type || "event"}
                      </span>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs capitalize ${statusClass(
                          log.status
                        )}`}
                      >
                        {log.status}
                      </span>
                    </div>

                    <span className="text-xs text-slate-500">
                      {formatDate(log.created_at)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
                    <span>
                      HTTP: {log.http_status ?? "—"}
                    </span>

                    <span>
                      Setting:{" "}
                      {settings.find(
                        (item) => item.id === log.setting_id
                      )?.name || "Postback"}
                    </span>
                  </div>

                  {log.response_excerpt && (
                    <pre className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-900 p-3 text-xs text-slate-400">
                      {log.response_excerpt}
                    </pre>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-xs leading-5 text-slate-500">
          <div className="flex items-start gap-2">
            <Code2 size={16} className="mt-0.5 shrink-0" />
            <p>
              Test sends a TEST_CLICK_ID callback only. It does not create a real conversion or affiliate earnings. Live delivery depends on the server-side conversion integration and the tracker accepting the callback.
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}