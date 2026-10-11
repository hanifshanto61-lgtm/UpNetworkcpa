"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Edit3,
  Globe,
  Loader2,
  PauseCircle,
  Plus,
  RefreshCw,
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

const emptyForm: NetworkForm = {
  name: "",
  website_url: "",
  click_id_parameter: "sub1",
  status: "active",
};

export default function NetworksPage() {
  const router = useRouter();

  const [networks, setNetworks] = useState<Network[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<NetworkForm>(emptyForm);

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

      setMessage(
        `${network.name} is now ${nextStatus}.`
      );
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

  const activeCount = networks.filter(
    (network) => network.status === "active"
  ).length;

  const pausedCount = networks.length - activeCount;

  const inputClass =
    "w-full rounded-xl border border-slate-300 " +
    "bg-white px-4 py-3 text-slate-900 " +
    "outline-none focus:border-blue-500 " +
    "focus:ring-2 focus:ring-blue-100";

  const cardClass =
    "rounded-2xl border border-slate-200 " +
    "bg-white p-5 shadow-sm";

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
              Add and manage multiple advertiser networks.
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
                    Use the parameter required by your network.
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
            <h2 className="text-xl font-bold">
              CPA Network List
            </h2>

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
                      <ShieldCheck
                        size={16}
                        className="text-green-600"
                      />

                      <span className="text-slate-600">
                        Postback credential stored securely
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
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <p className="text-center text-xs text-slate-500">
          UpNetwork CPA — Multi-Network Management
        </p>
      </div>
    </main>
  );
}