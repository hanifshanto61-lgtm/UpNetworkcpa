"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Offer = {
  id: string;
  name: string;
  advertiser: string | null;
  tracking_url: string | null;
  payout: number;
  advertiser_payout: number | null;
  network_id: string | null;
  external_offer_id: string | null;
  currency: string | null;
  country: string | null;
  category: string | null;
  device: string | null;
  description: string | null;
  image_url: string | null;
  status: "active" | "paused";
};

type Network = {
  id: string;
  name: string;
  status: string;
  click_id_parameter: string;
};

const emptyForm = {
  name: "",
  advertiser: "",
  offer_url: "",
  network_id: "",
  external_offer_id: "",
  advertiser_payout: "",
  payout: "",
  country: "Worldwide",
  category: "",
  device: "All",
  description: "",
  image_url: "",
  status: "active",
};

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100";

export default function OffersPage() {
  const router = useRouter();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function getToken() {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session?.access_token) {
      throw new Error("Please log in as admin again.");
    }

    return data.session.access_token;
  }

  async function api(
    path: string,
    method = "GET",
    body?: Record<string, unknown>
  ) {
    const token = await getToken();

    const response = await fetch(path, {
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
      throw new Error(result.message || "Request failed.");
    }

    return result;
  }

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [offersResult, networksResult] = await Promise.all([
        api("/api/admin/offers"),
        api("/api/admin/networks"),
      ]);

      setOffers(offersResult.offers || []);
      setNetworks(networksResult.networks || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function change(field: keyof typeof emptyForm, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function resetForm() {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(offer: Offer) {
    setEditingId(offer.id);

    setForm({
      name: offer.name || "",
      advertiser: offer.advertiser || "",
      offer_url: offer.tracking_url || "",
      network_id: offer.network_id || "",
      external_offer_id: offer.external_offer_id || "",
      advertiser_payout:
        offer.advertiser_payout == null
          ? ""
          : String(offer.advertiser_payout),
      payout: String(offer.payout ?? ""),
      country: offer.country || "Worldwide",
      category: offer.category || "",
      device: offer.device || "All",
      description: offer.description || "",
      image_url: offer.image_url || "",
      status: offer.status || "active",
    });

    setShowForm(true);
    setMessage("");
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const affiliatePayout = Number(form.payout);
    const advertiserPayout =
      form.advertiser_payout === ""
        ? null
        : Number(form.advertiser_payout);

    if (
      !Number.isFinite(affiliatePayout) ||
      affiliatePayout < 0 ||
      (advertiserPayout !== null &&
        (!Number.isFinite(advertiserPayout) ||
          advertiserPayout < affiliatePayout))
    ) {
      setError(
        "Advertiser payout must be greater than or equal to affiliate payout."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const body = {
        ...form,
        network_id: form.network_id || null,
        advertiser_payout: advertiserPayout,
        ...(editingId ? { id: editingId } : {}),
      };

      await api(
        "/api/admin/offers",
        editingId ? "PATCH" : "POST",
        body
      );

      resetForm();
      setMessage(
        editingId
          ? "Offer updated successfully."
          : "Offer created successfully."
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save offer."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(offer: Offer) {
    try {
      setBusyId(offer.id);
      setError("");
      setMessage("");

      const status = offer.status === "active" ? "paused" : "active";

      await api("/api/admin/offers", "PATCH", {
        id: offer.id,
        status,
      });

      setMessage(`Offer ${status === "active" ? "activated" : "paused"}.`);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to change status."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deleteOffer(offer: Offer) {
    if (
      !window.confirm(
        `Delete "${offer.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setBusyId(offer.id);
      setError("");
      setMessage("");

      await api(
        `/api/admin/offers?id=${encodeURIComponent(offer.id)}`,
        "DELETE"
      );

      setMessage("Offer deleted successfully.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete offer."
      );
    } finally {
      setBusyId(null);
    }
  }

  const selectedNetwork = networks.find(
    (network) => network.id === form.network_id
  );

  function input(
    label: string,
    field: keyof typeof emptyForm,
    options?: {
      type?: string;
      required?: boolean;
      placeholder?: string;
      step?: string;
    }
  ) {
    return (
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">
          {label}
        </span>
        <input
          className={fieldClass}
          type={options?.type || "text"}
          required={options?.required}
          min={options?.type === "number" ? "0" : undefined}
          step={options?.step}
          placeholder={options?.placeholder}
          value={form[field]}
          onChange={(e) => change(field, e.target.value)}
        />
      </label>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex min-h-20 items-center justify-between gap-4 px-5 sm:px-8">
          <div>
            <h1 className="text-2xl font-bold">Offers & Links</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage offers from multiple CPA networks
            </p>
          </div>
          <button
            onClick={() => router.push("/admin")}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
          >
            ← Dashboard
          </button>
        </div>
      </header>

      <div className="p-5 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Offer Management</h2>
            <p className="text-sm text-slate-500">
              {offers.length} offers · {networks.length} CPA networks
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => router.push("/admin/networks")}
              className="rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-blue-700"
            >
              Manage Networks
            </button>
            <button
              onClick={() => {
                if (showForm && !editingId) {
                  resetForm();
                } else {
                  setForm({ ...emptyForm });
                  setEditingId(null);
                  setShowForm(true);
                  setError("");
                  setMessage("");
                }
              }}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white"
            >
              {showForm && !editingId
                ? "Close Form"
                : "+ Add New Offer"}
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {showForm && (
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="mb-5 text-xl font-bold">
              {editingId ? "Edit Offer" : "Create New Offer"}
            </h3>

            <form
              onSubmit={handleSubmit}
              className="grid gap-5 md:grid-cols-2"
            >
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Select CPA Network
                </span>
                <select
                  className={fieldClass}
                  value={form.network_id}
                  onChange={(e) => change("network_id", e.target.value)}
                >
                  <option value="">Independent / No Network</option>
                  {networks.map((network) => (
                    <option key={network.id} value={network.id}>
                      {network.name}
                      {network.status === "paused" ? " (Paused)" : ""}
                    </option>
                  ))}
                </select>
                {selectedNetwork && (
                  <p className="mt-2 text-xs text-slate-500">
                    Click ID parameter:{" "}
                    <strong>{selectedNetwork.click_id_parameter}</strong>
                  </p>
                )}
              </label>

              {input("Offer Name", "name", {
                required: true,
                placeholder: "Example: Mobile App Install",
              })}

              {input("Advertiser", "advertiser", {
                required: true,
                placeholder: "Advertiser name",
              })}

              {input("External Offer ID", "external_offer_id", {
                placeholder: "Optional network offer ID",
              })}

              {input("Offer / Tracking URL", "offer_url", {
                type: "url",
                required: true,
                placeholder: "https://example.com/offer",
              })}

              {input("Advertiser Payout (USD)", "advertiser_payout", {
                type: "number",
                step: "0.01",
                placeholder: "2.00",
              })}

              {input("Affiliate Payout (USD)", "payout", {
                type: "number",
                required: true,
                step: "0.01",
                placeholder: "1.50",
              })}

              {form.advertiser_payout !== "" &&
                form.payout !== "" && (
                  <div className="rounded-xl bg-emerald-50 p-4 md:col-span-2">
                    <p className="text-sm font-semibold text-emerald-800">
                      Estimated Network Profit per Conversion: $
                      {(
                        Number(form.advertiser_payout) -
                        Number(form.payout)
                      ).toFixed(2)}
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">
                      Actual revenue requires a verified network postback.
                    </p>
                  </div>
                )}

              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Country
                </span>
                <select
                  className={fieldClass}
                  value={form.country}
                  onChange={(e) => change("country", e.target.value)}
                >
                  {[
                    "Worldwide",
                    "United States",
                    "United Kingdom",
                    "Canada",
                    "Australia",
                    "Germany",
                    "France",
                    "Bangladesh",
                    "India",
                  ].map((country) => (
                    <option key={country}>{country}</option>
                  ))}
                </select>
              </label>

              {input("Category", "category", {
                placeholder: "Survey, Dating, App, Finance",
              })}

              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Device
                </span>
                <select
                  className={fieldClass}
                  value={form.device}
                  onChange={(e) => change("device", e.target.value)}
                >
                  {["All", "Mobile", "Desktop", "Android", "iOS"].map(
                    (device) => (
                      <option key={device} value={device}>
                        {device === "All" ? "All Devices" : device}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Status
                </span>
                <select
                  className={fieldClass}
                  value={form.status}
                  onChange={(e) => change("status", e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </label>

              <label className="md:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Description
                </span>
                <textarea
                  rows={4}
                  className={fieldClass}
                  value={form.description}
                  onChange={(e) => change("description", e.target.value)}
                  placeholder="Describe your offer"
                />
              </label>

              <div className="md:col-span-2">
                {input("Image URL", "image_url", {
                  type: "url",
                  placeholder: "https://example.com/image.jpg",
                })}
              </div>

              <div className="flex flex-wrap gap-3 md:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Offer"
                    : "Create Offer"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h3 className="font-bold">Your Offers</h3>
          </div>

          {loading ? (
            <p className="p-8 text-center text-slate-500">
              Loading offers and networks...
            </p>
          ) : offers.length === 0 ? (
            <p className="p-8 text-center text-slate-500">
              No offers yet. Add your first offer.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    {[
                      "Offer",
                      "CPA Network",
                      "Advertiser",
                      "Country",
                      "Affiliate Payout",
                      "Status",
                      "Actions",
                    ].map((heading) => (
                      <th key={heading} className="px-5 py-4">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {offers.map((offer) => (
                    <tr key={offer.id}>
                      <td className="px-5 py-4">
                        <div className="font-semibold">{offer.name}</div>
                        <div className="text-xs text-slate-400">
                          {offer.category || "General"}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm">
                        {networks.find(
                          (network) => network.id === offer.network_id
                        )?.name || "Independent"}
                      </td>
                      <td className="px-5 py-4 text-sm">
                        {offer.advertiser || "—"}
                      </td>
                      <td className="px-5 py-4 text-sm">
                        {offer.country || "Worldwide"}
                      </td>
                      <td className="px-5 py-4 font-bold text-emerald-600">
                        {offer.currency || "USD"}{" "}
                        {Number(offer.payout || 0).toFixed(2)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            offer.status === "active"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {offer.status === "active"
                            ? "Active"
                            : "Paused"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(offer)}
                            disabled={busyId === offer.id}
                            className="rounded-lg border px-3 py-2 text-xs font-bold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleStatus(offer)}
                            disabled={busyId === offer.id}
                            className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700"
                          >
                            {offer.status === "active"
                              ? "Pause"
                              : "Activate"}
                          </button>
                          <button
                            onClick={() => deleteOffer(offer)}
                            disabled={busyId === offer.id}
                            className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}