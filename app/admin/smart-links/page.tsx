
"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Link2,
  Loader2,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

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
  status: "active" | "paused";
};

const ADMIN_EMAIL = "islamhanif122@gmail.com";

const emptyForm: SmartLinkForm = {
  name: "",
  slug: "",
  destination_url: "",
  network_share_percent: "30",
  status: "active",
};

function validUrl(value: string) {
  try {
    const url = new URL(value);

    return (
      (url.protocol === "https:" ||
        url.protocol === "http:") &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function normalizeShare(value: number | string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return 30;

  return Math.min(100, Math.max(0, amount));
}

function formatMoney(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [exampleRevenue, setExampleRevenue] =
    useState("100");

  const getAccessToken = useCallback(async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error("Please login again.");
    }

    if (
      session.user.email?.toLowerCase() !==
      ADMIN_EMAIL.toLowerCase()
    ) {
      throw new Error("Admin access required.");
    }

    return session.access_token;
  }, []);

  const loadLinks = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = await getAccessToken();

      const response = await fetch(
        "/api/admin/smart-links",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Unable to load Smart Links."
        );
      }

      setLinks(
        Array.isArray(result.smartLinks)
          ? result.smartLinks
          : []
      );
    } catch (err) {
      const text =
        err instanceof Error
          ? err.message
          : "Unable to load Smart Links.";

      setError(text);

      if (
        text === "Please login again." ||
        text === "Admin access required."
      ) {
        router.replace("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, router]);

  useEffect(() => {
    void loadLinks();
  }, [loadLinks]);

  function updateForm(
    field: keyof SmartLinkForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function startCreate() {
    setMessage("");
    setError("");
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function startEdit(link: SmartLink) {
    setMessage("");
    setError("");
    setEditingId(link.id);

    setForm({
      name: link.name || "",
      slug: link.slug,
      destination_url: link.destination_url || "",
      network_share_percent: String(
        normalizeShare(link.network_share_percent)
      ),
      status:
        link.status === "paused"
          ? "paused"
          : "active",
    });

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSave(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const name = form.name.trim();
    const slug = form.slug.trim();
    const destination = form.destination_url.trim();
    const shareText =
      form.network_share_percent.trim();
    const share = Number(shareText);

    if (!name) {
      setError("Smart Link name is required.");
      return;
    }

    if (
      !editingId &&
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    ) {
      setError(
        "Slug must contain lowercase letters, numbers and hyphens."
      );
      return;
    }

    if (!validUrl(destination)) {
      setError(
        "Please enter a valid HTTP or HTTPS URL."
      );
      return;
    }

    if (
      shareText === "" ||
      !Number.isFinite(share) ||
      share < 0 ||
      share > 100 ||
      Math.abs(share * 100 - Math.round(share * 100)) >
        0.000001
    ) {
      setError(
        "Network commission must be between 0 and 100 with up to two decimal places."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const token = await getAccessToken();

      const payload = editingId
        ? {
            id: editingId,
            name,
            destination_url: destination,
            network_share_percent: share,
            status: form.status,
          }
        : {
            name,
            slug,
            destination_url: destination,
            network_share_percent: share,
          };

      const response = await fetch(
        "/api/admin/smart-links",
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Unable to save Smart Link."
        );
      }

      const wasEditing = Boolean(editingId);

      closeForm();
      await loadLinks();

      setMessage(
        wasEditing
          ? "Smart Link updated successfully."
          : "New Smart Link created successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save Smart Link."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(link: SmartLink) {
    const nextStatus =
      link.status === "active"
        ? "paused"
        : "active";

    try {
      setUpdatingId(link.id);
      setError("");
      setMessage("");

      const token = await getAccessToken();

      const response = await fetch(
        "/api/admin/smart-links",
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: link.id,
            status: nextStatus,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Unable to change status."
        );
      }

      await loadLinks();

      setMessage(
        nextStatus === "active"
          ? "Smart Link activated."
          : "Smart Link paused."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to change status."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const globalLinks = links.filter(
    (link) => link.is_global === true
  );

  const personalLinks = links.filter(
    (link) => link.is_global !== true
  );

  const activeCount = globalLinks.filter(
    (link) => link.status === "active"
  ).length;

  const revenue = Math.max(
    0,
    Number(exampleRevenue) || 0
  );

  const currentShare = normalizeShare(
    form.network_share_percent
  );

  const grossCents = Math.round(revenue * 100);

  const networkCents = Math.round(
    (grossCents * currentShare) / 100
  );

  const networkAmount = networkCents / 100;

  const affiliateAmount =
    (grossCents - networkCents) / 100;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/70">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-500/15 p-3 text-cyan-400">
              <Link2 size={25} />
            </div>

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
            className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold hover:bg-slate-800"
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-7 px-5 py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Global Smart Links
            </p>

            <p className="mt-2 text-3xl font-black text-cyan-400">
              {globalLinks.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Active Smart Links
            </p>

            <p className="mt-2 text-3xl font-black text-emerald-400">
              {activeCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Personal Smart Links
            </p>

            <p className="mt-2 text-3xl font-black text-violet-400">
              {personalLinks.length}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">
              Global Smart Links
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Manage destinations and commission percentages.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void loadLinks()}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw size={17} />
              Refresh
            </button>

            <button
              type="button"
              onClick={startCreate}
              className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-400"
            >
              <Plus size={18} />
              Add Smart Link
            </button>
          </div>
        </div>

        {message && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-700 bg-emerald-950/50 p-4 text-sm text-emerald-300">
            <CheckCircle2 size={18} />
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-800 bg-red-950/50 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {showForm && (
          <section className="rounded-2xl border border-cyan-900 bg-slate-900 p-5 sm:p-7">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold">
                {editingId
                  ? "Edit Smart Link"
                  : "Create Global Smart Link"}
              </h3>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg p-2 hover:bg-slate-800"
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="grid gap-5 md:grid-cols-2"
            >
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Smart Link Name
                </label>

                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    updateForm(
                      "name",
                      event.target.value
                    )
                  }
                  placeholder="Datify Smart Link"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Smart Link Slug
                </label>

                <input
                  required
                  disabled={Boolean(editingId)}
                  value={form.slug}
                  onChange={(event) =>
                    updateForm(
                      "slug",
                      event.target.value
                    )
                  }
                  placeholder="datify-smartlink"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500 disabled:opacity-50"
                />

                <p className="mt-2 text-xs text-slate-400">
                  The slug cannot be changed during editing,
                  so existing tracking links remain valid.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">
                  Destination / Advertiser URL
                </label>

                <input
                  required
                  type="url"
                  value={form.destination_url}
                  onChange={(event) =>
                    updateForm(
                      "destination_url",
                      event.target.value
                    )
                  }
                  placeholder="https://example.com/smartlink"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Network Commission (%)
                </label>

                <input
                  required
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.network_share_percent}
                  onChange={(event) =>
                    updateForm(
                      "network_share_percent",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                />

                <p className="mt-2 text-xs text-slate-400">
                  Affiliate receives the remaining percentage.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Affiliate Commission (%)
                </label>

                <div className="rounded-xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 font-bold text-emerald-400">
                  {(100 - currentShare).toFixed(2)}%
                </div>
              </div>

              <div className="md:col-span-2 rounded-xl border border-slate-700 bg-slate-950 p-5">
                <h4 className="mb-4 font-semibold">
                  Revenue Share Preview
                </h4>

                <label className="mb-2 block text-sm text-slate-400">
                  Example Gross Revenue (USD)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={exampleRevenue}
                  onChange={(event) =>
                    setExampleRevenue(
                      event.target.value
                    )
                  }
                  className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3"
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-amber-500/10 p-4">
                    <p className="text-sm text-amber-300">
                      Network Profit
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                      {formatMoney(networkAmount)}
                    </p>

                    <p className="text-xs text-slate-400">
                      {currentShare.toFixed(2)}%
                    </p>
                  </div>

                  <div className="rounded-xl bg-emerald-500/10 p-4">
                    <p className="text-sm text-emerald-300">
                      Affiliate Earnings
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                      {formatMoney(affiliateAmount)}
                    </p>

                    <p className="text-xs text-slate-400">
                      {(100 - currentShare).toFixed(2)}%
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  This is a preview. Actual earnings
                  require a verified advertiser conversion
                  postback.
                </p>
              </div>

              <div className="md:col-span-2 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <Save size={18} />
                  )}

                  {editingId
                    ? "Save Changes"
                    : "Create Smart Link"}
                </button>

                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-xl border border-slate-700 px-6 py-3 hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-12">
            <Loader2
              size={24}
              className="animate-spin text-cyan-400"
            />
            Loading Smart Links...
          </div>
        ) : globalLinks.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
            <Link2
              size={36}
              className="mx-auto mb-4 text-slate-500"
            />

            <h3 className="text-lg font-bold">
              No Global Smart Links
            </h3>

            <p className="mt-2 text-sm text-slate-400">
              Create your first Smart Link to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {globalLinks.map((link) => {
              const share = normalizeShare(
                link.network_share_percent
              );

              return (
                <div
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
                          {link.status === "active"
                            ? "Active"
                            : "Paused"}
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-slate-500">
                        Slug: {link.slug}
                      </p>

                      <p className="mt-2 break-all text-sm text-slate-400">
                        {link.destination_url ||
                          "No destination"}
                      </p>

                      {link.destination_url && (
                        <a
                          href={link.destination_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-400 hover:underline"
                        >
                          Open Destination
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          startEdit(link)
                        }
                        className="flex items-center gap-2 rounded-xl border border-cyan-800 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-950"
                      >
                        <Edit3 size={16} />
                        Edit
                      </button>

                      <button
                        type="button"
                        disabled={
                          updatingId === link.id
                        }
                        onClick={() =>
                          void toggleStatus(link)
                        }
                        className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
                      >
                        {updatingId === link.id ? (
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                        ) : link.status === "active" ? (
                          <>
                            <PauseCircle size={16} />
                            Pause
                          </>
                        ) : (
                          <>
                            <PlayCircle size={16} />
                            Activate
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-amber-500/10 p-4">
                      <p className="text-sm text-amber-300">
                        Network Share
                      </p>

                      <p className="mt-1 text-2xl font-black">
                        {share.toFixed(2)}%
                      </p>
                    </div>

                    <div className="rounded-xl bg-emerald-500/10 p-4">
                      <p className="text-sm text-emerald-300">
                        Affiliate Share
                      </p>

                      <p className="mt-1 text-2xl font-black">
                        {(100 - share).toFixed(2)}%
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
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck
              size={20}
              className="text-emerald-400"
            />

            <h3 className="font-bold">
              Revenue & Tracking Protection
            </h3>
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            Smart Link settings are managed by
            authorized admins. Updating a destination URL
            keeps the tracking slug unchanged. Commission
            percentages saved here will be used by the
            revenue-sharing system after the postback
            integration is completed.
          </p>
        </div>
      </div>
    </main>
  );
}
