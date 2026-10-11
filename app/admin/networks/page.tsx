"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Loader2,
  PauseCircle,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Network = {
  id: string;
  name: string;
  website_url: string | null;
  click_id_parameter: string;
  status: "active" | "paused";
  created_at: string;
  updated_at: string;
};

type NetworkForm = {
  name: string;
  website_url: string;
  click_id_parameter: string;
  status: "active" | "paused";
};

type SecretData = {
  network_id: string;
  network_name: string;
  postback_secret: string;
};

const emptyForm: NetworkForm = {
  name: "",
  website_url: "",
  click_id_parameter: "sub1",
  status: "active",
};

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white " +
  "px-4 py-3 text-slate-900 outline-none " +
  "focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const cardClass =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

export default function NetworksPage() {
  const router = useRouter();

  const [networks, setNetworks] = useState<Network[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<NetworkForm>(emptyForm);

  const [secretData, setSecretData] = useState<SecretData | null>(
    null
  );
  const [secretLoading, setSecretLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [clickMacro, setClickMacro] = useState("{click_id}");
  const [payoutMacro, setPayoutMacro] = useState("{payout}");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function getToken() {
    if (!supabase) {
      throw new Error("Supabase client is unavailable.");
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error(
        "Your session has expired. Please log in again."
      );
    }

    return session.access_token;
  }

  async function apiRequest(
    method: "GET" | "POST" | "PATCH",
    body?: Record<string, unknown>
  ) {
    const token = await getToken();

    const response = await fetch("/api/admin/networks", {
      method,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "The request could not be completed."
      );
    }

    return result;
  }

  async function secretRequest(
    networkId: string,
    rotate = false
  ): Promise<SecretData> {
    const token = await getToken();

    const endpoint =
      "/api/admin/networks/secret" +
      (rotate
        ? ""
        : `?network_id=${encodeURIComponent(networkId)}`);

    const response = await fetch(endpoint, {
      method: rotate ? "POST" : "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(rotate
          ? { "Content-Type": "application/json" }
          : {}),
      },
      ...(rotate
        ? {
            body: JSON.stringify({
              network_id: networkId,
              confirm: true,
            }),
          }
        : {}),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Unable to retrieve network secret."
      );
    }

    return {
      network_id: result.network_id,
      network_name: result.network_name,
      postback_secret: result.postback_secret,
    };
  }

  async function loadNetworks() {
    try {
      setLoading(true);
      setError("");

      const result = await apiRequest("GET");
      setNetworks(result.networks ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load networks."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNetworks();
  }, []);

  function startAdd() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
    setError("");
    setMessage("");
  }

  function startEdit(network: Network) {
    setEditingId(network.id);
    setForm({
      name: network.name,
      website_url: network.website_url ?? "",
      click_id_parameter: network.click_id_parameter,
      status: network.status,
    });

    setShowForm(true);
    setError("");
    setMessage("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  }

  function changeField<K extends keyof NetworkForm>(
    key: K,
    value: NetworkForm[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  async function saveNetwork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const isEditing = Boolean(editingId);

      await apiRequest(
        isEditing ? "PATCH" : "POST",
        isEditing
          ? { id: editingId, ...form }
          : { ...form }
      );

      cancelForm();
      await loadNetworks();

      setMessage(
        isEditing
          ? "Network updated successfully."
          : "Network created successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save network."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(network: Network) {
    const nextStatus =
      network.status === "active" ? "paused" : "active";

    try {
      setBusyId(network.id);
      setError("");
      setMessage("");

      await apiRequest("PATCH", {
        id: network.id,
        status: nextStatus,
      });

      await loadNetworks();
      setMessage(`${network.name} is now ${nextStatus}.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update status."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function openPostback(network: Network) {
    try {
      setSecretLoading(true);
      setError("");
      setMessage("");
      setSecretData(null);
      setShowSecret(false);
      setClickMacro("{click_id}");
      setPayoutMacro("{payout}");

      const data = await secretRequest(network.id);
      setSecretData(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to open postback settings."
      );
    } finally {
      setSecretLoading(false);
    }
  }

  function closePostback() {
    setSecretData(null);
    setShowSecret(false);
    setClickMacro("{click_id}");
    setPayoutMacro("{payout}");
  }

  async function rotateSecret() {
    if (!secretData) return;

    const confirmed = window.confirm(
      "Rotate this network's secret?\n\n" +
        "The existing postback URL will stop working immediately. " +
        "You must update the URL in the CPA network after rotation."
    );

    if (!confirmed) return;

    try {
      setRotating(true);
      setError("");
      setMessage("");

      const data = await secretRequest(
        secretData.network_id,
        true
      );

      setSecretData(data);
      setShowSecret(false);
      setMessage(
        "Secret rotated. Update the postback URL in your CPA network."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to rotate secret."
      );
    } finally {
      setRotating(false);
    }
  }

  function buildPostbackUrl() {
    if (!secretData) return "";

    const base = "https://upnetworkcpa.com/api/postback/network";

    const params = [
      `network_id=${encodeURIComponent(secretData.network_id)}`,
      `token=${encodeURIComponent(secretData.postback_secret)}`,
      `click_id=${clickMacro.trim() || "{click_id}"}`,
      `payout=${payoutMacro.trim() || "{payout}"}`,
    ];

    return `${base}?${params.join("&")}`;
  }

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${label} copied successfully.`);
      setError("");
    } catch {
      setError("Copy failed. Please copy the value manually.");
    }
  }

  const activeCount = networks.filter(
    (network) => network.status === "active"
  ).length;

  const pausedCount = networks.length - activeCount;

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="mb-3 flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600"
            >
              <ArrowLeft size={16} />
              Back to Admin Dashboard
            </button>

            <h1 className="flex items-center gap-3 text-2xl font-bold md:text-3xl">
              <Building2 className="text-blue-600" />
              Manage CPA Networks
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage advertiser networks, tracking, and secure postbacks.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void loadNetworks()}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={17} />
              Refresh
            </button>

            <button
              type="button"
              onClick={startAdd}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={18} />
              Add Network
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            <CheckCircle2 size={18} />
            {message}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className={cardClass}>
            <p className="text-sm text-slate-500">Total Networks</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {networks.length}
            </p>
          </div>

          <div className={cardClass}>
            <p className="text-sm text-slate-500">Active Networks</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {activeCount}
            </p>
          </div>

          <div className={cardClass}>
            <p className="text-sm text-slate-500">Paused Networks</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">
              {pausedCount}
            </p>
          </div>
        </div>

        {showForm && (
          <section className={cardClass}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingId ? "Edit CPA Network" : "Add CPA Network"}
              </h2>

              <button
                type="button"
                onClick={cancelForm}
                aria-label="Close form"
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveNetwork} className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold">
                    Network Name *
                  </span>

                  <input
                    required
                    maxLength={150}
                    className={inputClass}
                    placeholder="Example: My CPA Network"
                    value={form.name}
                    onChange={(e) =>
                      changeField("name", e.target.value)
                    }
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold">
                    Network Website
                  </span>

                  <input
                    type="url"
                    className={inputClass}
                    placeholder="https://example.com"
                    value={form.website_url}
                    onChange={(e) =>
                      changeField("website_url", e.target.value)
                    }
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold">
                    Click ID Parameter *
                  </span>

                  <input
                    required
                    maxLength={50}
                    pattern="[A-Za-z][A-Za-z0-9_]*"
                    className={inputClass}
                    placeholder="sub1"
                    value={form.click_id_parameter}
                    onChange={(e) =>
                      changeField(
                        "click_id_parameter",
                        e.target.value
                      )
                    }
                  />

                  <p className="text-xs text-slate-500">
                    Examples: sub1, aff_sub, s1, click_id.
                    Do not use sub2 or offer_id.
                  </p>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold">
                    Network Status
                  </span>

                  <select
                    className={inputClass}
                    value={form.status}
                    onChange={(e) =>
                      changeField(
                        "status",
                        e.target.value as "active" | "paused"
                      )
                    }
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}

                  {saving ? "Saving..." : "Save Network"}
                </button>

                <button
                  type="button"
                  onClick={cancelForm}
                  className="rounded-xl border border-slate-300 px-6 py-3 font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        <section className={cardClass}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold">CPA Network List</h2>

            <span className="text-sm text-slate-500">
              {networks.length} network(s)
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
              <Loader2 className="animate-spin" />
              Loading networks...
            </div>
          ) : networks.length === 0 ? (
            <div className="py-16 text-center">
              <Building2
                size={48}
                className="mx-auto text-slate-300"
              />

              <h3 className="mt-4 text-lg font-semibold">
                No CPA Networks Yet
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Click Add Network to create your first network.
              </p>

              <button
                type="button"
                onClick={startAdd}
                className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Add First Network
              </button>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {networks.map((network) => (
                <article
                  key={network.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">
                        {network.name}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Created{" "}
                        {new Date(
                          network.created_at
                        ).toLocaleDateString()}
                      </p>
                    </div>

                    <span
                      className={
                        "rounded-full px-3 py-1 text-xs font-semibold " +
                        (network.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700")
                      }
                    >
                      {network.status === "active"
                        ? "Active"
                        : "Paused"}
                    </span>
                  </div>

                  <div className="mt-5 space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Globe size={16} className="text-blue-500" />

                      {network.website_url ? (
                        <a
                          href={network.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-blue-600 hover:underline"
                        >
                          {network.website_url}
                        </a>
                      ) : (
                        <span className="text-slate-500">
                          No website provided
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <ShieldCheck
                        size={16}
                        className="text-slate-500"
                      />

                      <span className="text-slate-500">
                        Click ID Parameter:
                      </span>

                      <code className="rounded bg-slate-200 px-2 py-1 font-semibold">
                        {network.click_id_parameter}
                      </code>
                    </div>

                    <div className="flex items-center gap-2">
                      <KeyRound
                        size={16}
                        className="text-green-600"
                      />

                      <span className="text-slate-600">
                        Individual Postback Secret
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                    <button
                      type="button"
                      onClick={() => startEdit(network)}
                      className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
                    >
                      <Edit3 size={16} />
                      Edit
                    </button>

                    <button
                      type="button"
                      disabled={busyId === network.id}
                      onClick={() => void toggleStatus(network)}
                      className={
                        "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 " +
                        (network.status === "active"
                          ? "bg-amber-600 hover:bg-amber-700"
                          : "bg-green-600 hover:bg-green-700")
                      }
                    >
                      {busyId === network.id ? (
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />
                      ) : network.status === "active" ? (
                        <PauseCircle size={16} />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}

                      {network.status === "active"
                        ? "Pause Network"
                        : "Activate Network"}
                    </button>

                    <button
                      type="button"
                      disabled={secretLoading}
                      onClick={() => void openPostback(network)}
                      className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {secretLoading ? (
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />
                      ) : (
                        <KeyRound size={16} />
                      )}
                      View Postback URL
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {secretData && (
          <section className={cardClass}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  <ShieldCheck className="text-indigo-600" />
                  Secure Postback Settings
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Network: {secretData.network_name}
                </p>
              </div>

              <button
                type="button"
                onClick={closePostback}
                aria-label="Close postback settings"
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Network ID
                </label>

                <div className="flex gap-2">
                  <input
                    readOnly
                    value={secretData.network_id}
                    className={inputClass}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      void copyText(
                        secretData.network_id,
                        "Network ID"
                      )
                    }
                    className="rounded-xl border border-slate-300 px-4 hover:bg-slate-50"
                    aria-label="Copy Network ID"
                  >
                    <Copy size={18} />
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Postback Secret
                </label>

                <div className="flex gap-2">
                  <input
                    readOnly
                    type={showSecret ? "text" : "password"}
                    value={secretData.postback_secret}
                    className={inputClass}
                  />

                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="rounded-xl border border-slate-300 px-4 hover:bg-slate-50"
                    aria-label={
                      showSecret ? "Hide Secret" : "Show Secret"
                    }
                  >
                    {showSecret ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void copyText(
                        secretData.postback_secret,
                        "Secret"
                      )
                    }
                    className="rounded-xl border border-slate-300 px-4 hover:bg-slate-50"
                    aria-label="Copy Secret"
                  >
                    <Copy size={18} />
                  </button>
                </div>

                <p className="mt-2 text-xs text-amber-700">
                  Keep this secret private. Anyone with this
                  credential may attempt to send postbacks.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold">
                    Network Click ID Macro
                  </span>

                  <input
                    value={clickMacro}
                    onChange={(e) =>
                      setClickMacro(e.target.value)
                    }
                    className={inputClass}
                    placeholder="{click_id}"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold">
                    Network Payout Macro
                  </span>

                  <input
                    value={payoutMacro}
                    onChange={(e) =>
                      setPayoutMacro(e.target.value)
                    }
                    className={inputClass}
                    placeholder="{payout}"
                  />
                </label>
              </div>

              <p className="text-sm text-slate-500">
                Replace the sample macros with the exact
                conversion macros supplied by your CPA network.
                The payout macro is optional if the offer has
                an advertiser payout configured.
              </p>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Generated Postback URL
                </label>

                <textarea
                  readOnly
                  rows={4}
                  value={buildPostbackUrl()}
                  className={`${inputClass} break-all font-mono text-xs`}
                />

                <button
                  type="button"
                  onClick={() =>
                    void copyText(
                      buildPostbackUrl(),
                      "Postback URL"
                    )
                  }
                  className="mt-3 flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                >
                  <Copy size={18} />
                  Copy Postback URL
                </button>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="font-semibold text-amber-900">
                  Rotate Postback Secret
                </h3>

                <p className="mt-2 text-sm text-amber-800">
                  Rotating the secret immediately invalidates
                  the old postback URL. Update the URL at your
                  CPA network before sending new conversions.
                </p>

                <button
                  type="button"
                  disabled={rotating}
                  onClick={() => void rotateSecret()}
                  className="mt-4 flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-3 font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {rotating ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <RotateCcw size={18} />
                  )}

                  {rotating
                    ? "Rotating..."
                    : "Rotate Secret"}
                </button>
              </div>
            </div>
          </section>
        )}

        <p className="text-center text-xs text-slate-500">
          UpNetwork CPA — Multi-Network Management
        </p>
      </div>
    </main>
  );
}