"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Edit3,
  ExternalLink,
  Link2,
  Loader2,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Save,
  Settings,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAIL = "islamhanif122@gmail.com";

type SmartLink = {
  id: string;
  name: string | null;
  slug: string;
  destination_url: string | null;
  status: string | null;
  is_global: boolean;
  affiliate_id: string | null;
  network_share_percent: number | string;
  created_at: string;
};

type SmartLinkForm = {
  name: string;
  slug: string;
  destination_url: string;
  network_share_percent: string;
};

type PostbackSetting = {
  smartlink_id: string;
  enabled: boolean;
  click_id_parameter: string;
  postback_url: string;
};

const emptyForm: SmartLinkForm = {
  name: "",
  slug: "",
  destination_url: "",
  network_share_percent: "30",
};

const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500 disabled:opacity-50";

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-50";

function normalizeShare(value: number | string) {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.min(100, Math.max(0, number))
    : 30;
}

function money(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function validUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.access_token) {
    throw new Error("Please login again.");
  }

  if (
    data.session.user.email?.toLowerCase() !== ADMIN_EMAIL
  ) {
    throw new Error("Admin access required.");
  }

  return data.session.access_token;
}

async function api(
  path: string,
  method = "GET",
  body?: Record<string, unknown>
) {
  const token = await getAccessToken();

  const response = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(
      result.message || result.error || "Request failed."
    );
  }

  return result;
}

function errorText(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to complete the request.";
}

function PostbackPanel({ link }: { link: SmartLink }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [parameter, setParameter] = useState("sub1");
  const [setting, setSetting] =
    useState<PostbackSetting | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const dirty =
    setting !== null &&
    (enabled !== setting.enabled ||
      parameter.trim() !== setting.click_id_parameter);

  async function openSettings() {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);
    setLoading(true);
    setLoaded(false);
    setError("");
    setMessage("");

    try {
      const result = await api(
        `/api/admin/smart-links/postback?id=${encodeURIComponent(
          link.id
        )}`
      );

      const next: PostbackSetting | null =
        result.setting || null;

      setSetting(next);
      setEnabled(next?.enabled ?? false);
      setParameter(next?.click_id_parameter || "sub1");
      setLoaded(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();

    const value = parameter.trim();

    if (
      !/^[a-zA-Z][a-zA-Z0-9_]{0,49}$/.test(value) ||
      ["sub2", "offer_id"].includes(value.toLowerCase())
    ) {
      setError(
        "Enter a valid Click ID parameter. sub2 and offer_id are reserved."
      );
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const result = await api(
        "/api/admin/smart-links/postback",
        "POST",
        {
          id: link.id,
          enabled,
          click_id_parameter: value,
        }
      );

      const next = result.setting as PostbackSetting;
      setSetting(next);
      setEnabled(next.enabled);
      setParameter(next.click_id_parameter);
      setMessage("Postback settings saved.");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  async function copyUrl() {
    if (!setting?.postback_url || dirty || saving) return;

    setError("");
    setMessage("");

    try {
      await navigator.clipboard.writeText(
        setting.postback_url
      );
      setMessage("Postback URL copied.");
    } catch {
      setError(
        "Could not copy automatically. Select the URL below and copy it."
      );
    }
  }

  return (
    <div className="mt-5 border-t border-slate-800 pt-4">
      <button
        type="button"
        onClick={() => void openSettings()}
        disabled={loading || saving}
        className={buttonClass}
        aria-expanded={open}
      >
        <Settings size={16} />
        {open ? "Close Postback Setup" : "Postback Setup"}
      </button>

      {open && (
        <div className="mt-4 rounded-xl border border-cyan-900 bg-slate-950 p-4 sm:p-5">
          <h4 className="font-bold text-cyan-300">
            Smart Link Postback
          </h4>

          {loading && (
            <p className="mt-4 flex items-center gap-2 text-sm text-slate-400">
              <Loader2 size={16} className="animate-spin" />
              Loading settings...
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-300"
            >
              {error}
            </p>
          )}

          {message && (
            <p
              role="status"
              className="mt-3 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300"
            >
              {message}
            </p>
          )}

          {loaded && !loading && (
            <form
              onSubmit={saveSettings}
              className="mt-4 space-y-4"
            >
              <label className="flex items-center gap-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={enabled}
                  disabled={saving}
                  onChange={(event) => {
                    setEnabled(event.target.checked);
                    setMessage("");
                  }}
                  className="h-5 w-5 accent-cyan-500"
                />
                Enable conversion postbacks
              </label>

              <div>
                <label
                  htmlFor={`parameter-${link.id}`}
                  className="mb-2 block text-sm text-slate-300"
                >
                  Network Click ID Parameter
                </label>
                <input
                  id={`parameter-${link.id}`}
                  value={parameter}
                  disabled={saving}
                  maxLength={50}
                  required
                  onChange={(event) => {
                    setParameter(event.target.value);
                    setMessage("");
                  }}
                  className={inputClass}
                  placeholder="sub1"
                />
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Use the parameter your CPA network accepts
                  for your Click ID, such as sub1, aff_sub,
                  or aff_click_id. Confirm it with the network.
                </p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Save Postback Settings
              </button>

              {setting && (
                <div className="space-y-3 border-t border-slate-800 pt-4">
                  <p className="text-sm font-semibold">
                    Saved status:{" "}
                    <span
                      className={
                        setting.enabled
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }
                    >
                      {setting.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </p>

                  <label
                    htmlFor={`postback-url-${link.id}`}
                    className="block text-sm text-slate-300"
                  >
                    Postback URL Template
                  </label>

                  <textarea
                    id={`postback-url-${link.id}`}
                    readOnly
                    rows={4}
                    value={setting.postback_url}
                    onFocus={(event) =>
                      event.currentTarget.select()
                    }
                    className={`${inputClass} break-all font-mono text-xs`}
                  />

                  <button
                    type="button"
                    onClick={() => void copyUrl()}
                    disabled={dirty || saving}
                    className={buttonClass}
                  >
                    <Copy size={16} />
                    Copy Postback URL
                  </button>

                  {dirty && (
                    <p className="text-xs text-amber-300">
                      Save your changes before copying the URL.
                    </p>
                  )}

                  <p className="text-xs leading-5 text-slate-400">
                    Replace {"{CLICK_ID}"} and {"{PAYOUT}"} with
                    your network&apos;s actual macros before
                    saving this URL in its postback settings.
                    Payout must be gross revenue in USD.
                    Use approved conversions only.
                  </p>

                  <p className="text-xs leading-5 text-amber-300">
                    Keep this token URL private. Share it only
                    with the CPA network sending conversions.
                  </p>
                </div>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminSmartLinksPage() {
  const router = useRouter();
  const [links, setLinks] = useState<SmartLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(
    null
  );
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(
    null
  );
  const [form, setForm] = useState<SmartLinkForm>(emptyForm);
  const [exampleRevenue, setExampleRevenue] = useState("100");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadLinks = useCallback(async () => {
    setLoading(true);

    try {
      const result = await api("/api/admin/smart-links");
      setLinks(
        Array.isArray(result.smartLinks)
          ? result.smartLinks
          : []
      );
      return true;
    } catch (err) {
      const text = errorText(err);
      setError(text);

      if (
        text === "Please login again." ||
        text === "Admin access required."
      ) {
        router.replace("/login");
      }

      return false;
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadLinks();
  }, [loadLinks]);

  function updateForm(
    field: keyof SmartLinkForm,
    value: string
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function startCreate() {
    setError("");
    setMessage("");
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startEdit(link: SmartLink) {
    setError("");
    setMessage("");
    setEditingId(link.id);
    setForm({
      name: link.name || "",
      slug: link.slug,
      destination_url: link.destination_url || "",
      network_share_percent: String(
        normalizeShare(link.network_share_percent)
      ),
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();

    const name = form.name.trim();
    const slug = form.slug.trim();
    const destination = form.destination_url.trim();
    const shareText = form.network_share_percent.trim();
    const share = Number(shareText);

    if (!name || name.length > 150) {
      setError("Enter a Smart Link name of up to 150 characters.");
      return;
    }

    if (
      !editingId &&
      (slug.length > 100 ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    ) {
      setError(
        "Slug must use lowercase letters, numbers and hyphens, up to 100 characters."
      );
      return;
    }

    if (!validUrl(destination)) {
      setError("Enter a valid HTTP or HTTPS destination URL.");
      return;
    }

    if (
      !shareText ||
      !Number.isFinite(share) ||
      share < 0 ||
      share > 100 ||
      Math.abs(share * 100 - Math.round(share * 100)) >
        0.000001
    ) {
      setError(
        "Commission must be 0–100 with up to two decimal places."
      );
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload: Record<string, unknown> = {
        name,
        destination_url: destination,
        network_share_percent: share,
      };

      if (editingId) payload.id = editingId;
      else payload.slug = slug;

      await api(
        "/api/admin/smart-links",
        editingId ? "PATCH" : "POST",
        payload
      );

      closeForm();
      const refreshed = await loadLinks();

      setMessage(
        refreshed
          ? "Smart Link saved. Open Postback Setup below to configure conversions."
          : "Smart Link saved. Refresh the list to view it."
      );
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(link: SmartLink) {
    if (updatingId) return;

    const status =
      link.status === "active" ? "paused" : "active";

    setUpdatingId(link.id);
    setError("");
    setMessage("");

    try {
      await api("/api/admin/smart-links", "PATCH", {
        id: link.id,
        status,
      });
      await loadLinks();
      setMessage(
        status === "active"
          ? "Smart Link activated."
          : "Smart Link paused."
      );
    } catch (err) {
      setError(errorText(err));
    } finally {
      setUpdatingId(null);
    }
  }

  const globalLinks = links.filter((link) => link.is_global);
  const personalCount = links.filter(
    (link) => !link.is_global
  ).length;
  const activeCount = globalLinks.filter(
    (link) => link.status === "active"
  ).length;

  const share = normalizeShare(form.network_share_percent);
  const rawRevenue = Number(exampleRevenue);
  const revenue = Number.isFinite(rawRevenue)
    ? Math.max(0, rawRevenue)
    : 0;
  const grossCents = Math.round(revenue * 100);
  const networkCents = Math.round(grossCents * share / 100);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/70">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-6">
          <div className="flex items-center gap-3">
            <Link2 size={28} className="text-cyan-400" />
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">
                Smart Link Management
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                UpNetwork CPA Admin Control Center
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/admin")}
            className={buttonClass}
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-5 py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "Global Smart Links",
              count: globalLinks.length,
              color: "text-cyan-400",
            },
            {
              title: "Active Smart Links",
              count: activeCount,
              color: "text-emerald-400",
            },
            {
              title: "Personal Smart Links",
              count: personalCount,
              color: "text-violet-400",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
            >
              <p className="text-sm text-slate-400">
                {card.title}
              </p>
              <p
                className={`mt-2 text-3xl font-black ${card.color}`}
              >
                {card.count}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">
              Global Smart Links
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Manage destinations, commissions and postbacks.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading || saving || updatingId !== null}
              onClick={() => {
                setError("");
                void loadLinks();
              }}
              className={buttonClass}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={startCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-50"
            >
              <Plus size={17} />
              Add Smart Link
            </button>
          </div>
        </div>

        {message && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl border border-emerald-800 bg-emerald-950/50 p-4 text-sm text-emerald-300"
          >
            <CheckCircle2 size={18} />
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-800 bg-red-950/50 p-4 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {showForm && (
          <section className="rounded-2xl border border-cyan-900 bg-slate-900 p-5 sm:p-7">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold">
                {editingId
                  ? "Edit Smart Link"
                  : "Create Global Smart Link"}
              </h3>
              <button
                type="button"
                disabled={saving}
                onClick={closeForm}
                aria-label="Close form"
                className="rounded-lg p-2 hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="grid gap-5 md:grid-cols-2"
            >
              <div>
                <label htmlFor="link-name" className="mb-2 block text-sm">
                  Smart Link Name
                </label>
                <input
                  id="link-name"
                  required
                  maxLength={150}
                  disabled={saving}
                  value={form.name}
                  onChange={(event) =>
                    updateForm("name", event.target.value)
                  }
                  className={inputClass}
                  placeholder="My Smart Link"
                />
              </div>

              <div>
                <label htmlFor="link-slug" className="mb-2 block text-sm">
                  Smart Link Slug
                </label>
                <input
                  id="link-slug"
                  required
                  maxLength={100}
                  disabled={Boolean(editingId) || saving}
                  value={form.slug}
                  onChange={(event) =>
                    updateForm("slug", event.target.value)
                  }
                  className={inputClass}
                  placeholder="my-smartlink"
                />
                <p className="mt-2 text-xs text-slate-400">
                  Existing tracking slugs stay unchanged.
                </p>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="link-url" className="mb-2 block text-sm">
                  Destination / Advertiser URL
                </label>
                <input
                  id="link-url"
                  required
                  type="url"
                  disabled={saving}
                  value={form.destination_url}
                  onChange={(event) =>
                    updateForm(
                      "destination_url",
                      event.target.value
                    )
                  }
                  className={inputClass}
                  placeholder="https://example.com/smartlink"
                />
              </div>

              <div>
                <label htmlFor="link-share" className="mb-2 block text-sm">
                  Network Commission (%)
                </label>
                <input
                  id="link-share"
                  required
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  disabled={saving}
                  value={form.network_share_percent}
                  onChange={(event) =>
                    updateForm(
                      "network_share_percent",
                      event.target.value
                    )
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <p className="mb-2 text-sm">
                  Affiliate Commission (%)
                </p>
                <div className="rounded-xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 font-bold text-emerald-400">
                  {(100 - share).toFixed(2)}%
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 md:col-span-2">
                <h4 className="mb-3 font-semibold">
                  Revenue Share Preview
                </h4>
                <label htmlFor="example-revenue" className="mb-2 block text-sm text-slate-400">
                  Example Gross Revenue (USD)
                </label>
                <input
                  id="example-revenue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={exampleRevenue}
                  onChange={(event) =>
                    setExampleRevenue(event.target.value)
                  }
                  className={inputClass}
                />

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-amber-500/10 p-4">
                    <p className="text-sm text-amber-300">
                      Network Profit
                    </p>
                    <p className="mt-2 text-2xl font-bold">
                      {money(networkCents / 100)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-500/10 p-4">
                    <p className="text-sm text-emerald-300">
                      Affiliate Earnings
                    </p>
                    <p className="mt-2 text-2xl font-bold">
                      {money((grossCents - networkCents) / 100)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 md:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-bold text-slate-950 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Save size={17} />
                  )}
                  {editingId ? "Save Changes" : "Create Smart Link"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={closeForm}
                  className={buttonClass}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl bg-slate-900 p-10">
            <Loader2 size={22} className="animate-spin text-cyan-400" />
            Loading Smart Links...
          </div>
        ) : globalLinks.length === 0 ? (
          <div className="rounded-2xl bg-slate-900 p-10 text-center text-slate-400">
            No Global Smart Links. Add your first Smart Link.
          </div>
        ) : (
          globalLinks.map((link) => {
            const networkShare = normalizeShare(
              link.network_share_percent
            );

            return (
              <section
                key={link.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-bold">
                        {link.name || link.slug}
                      </h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          link.status === "active"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-amber-500/15 text-amber-400"
                        }`}
                      >
                        {link.status === "active" ? "Active" : "Paused"}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      Slug: {link.slug}
                    </p>
                    <p className="mt-2 break-all text-sm text-slate-400">
                      {link.destination_url || "No destination"}
                    </p>

                    {link.destination_url &&
                      validUrl(link.destination_url) && (
                        <a
                          href={link.destination_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-400"
                        >
                          Open Destination
                          <ExternalLink size={13} />
                        </a>
                      )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => startEdit(link)}
                      className={buttonClass}
                    >
                      <Edit3 size={16} />
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={updatingId !== null}
                      onClick={() => void toggleStatus(link)}
                      className={buttonClass}
                    >
                      {updatingId === link.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : link.status === "active" ? (
                        <PauseCircle size={16} />
                      ) : (
                        <PlayCircle size={16} />
                      )}
                      {link.status === "active" ? "Pause" : "Activate"}
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-amber-500/10 p-4">
                    <p className="text-sm text-amber-300">
                      Network Share
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {networkShare.toFixed(2)}%
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-500/10 p-4">
                    <p className="text-sm text-emerald-300">
                      Affiliate Share
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {(100 - networkShare).toFixed(2)}%
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-slate-950 p-3">
                  <p className="mb-2 text-xs text-slate-500">
                    Example Affiliate Tracking Link
                  </p>
                  <code className="block break-all text-xs text-cyan-300">
                    {`https://upnetworkcpa.com/api/track?aid=YOUR_AFFILIATE_ID&sl=${encodeURIComponent(
                      link.slug
                    )}`}
                  </code>
                </div>

                <PostbackPanel link={link} />
              </section>
            );
          })
        )}
      </div>
    </main>
  );
}