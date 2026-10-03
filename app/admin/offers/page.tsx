"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Offer = {
  id: string;
  name: string;
  description: string | null;
  advertiser: string | null;
  payout: number;
  currency: string;
  country: string | null;
  category: string | null;
  device: string | null;
  offer_url: string;
  image_url: string | null;
  status: "active" | "paused";
  created_at: string;
  updated_at: string;
};

const emptyForm = {
  name: "",
  advertiser: "",
  offer_url: "",
  payout: "",
  country: "Worldwide",
  category: "",
  device: "All",
  description: "",
  image_url: "",
  status: "active",
};

export default function OffersPage() {
  const router = useRouter();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function getAccessToken() {
    if (!supabase) {
      throw new Error("Supabase client is not configured.");
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Your admin session has expired. Please login again.");
    }

    return session.access_token;
  }

  async function loadOffers() {
    try {
      setLoading(true);
      setError("");

      const token = await getAccessToken();

      const response = await fetch("/api/admin/offers", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load offers.");
      }

      setOffers(result.offers || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load offers."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOffers();
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(offer: Offer) {
    setEditingId(offer.id);

    setForm({
      name: offer.name || "",
      advertiser: offer.advertiser || "",
      offer_url: offer.offer_url || "",
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

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleChange(
    field: keyof typeof emptyForm,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const token = await getAccessToken();

      const isEditing = Boolean(editingId);

      const response = await fetch("/api/admin/offers", {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(
          isEditing
            ? {
                id: editingId,
                ...form,
              }
            : form
        ),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            (isEditing
              ? "Failed to update offer."
              : "Failed to create offer.")
        );
      }

      setMessage(
        isEditing
          ? "Offer updated successfully."
          : "Offer created successfully."
      );

      resetForm();

      await loadOffers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(offer: Offer) {
    try {
      setError("");
      setMessage("");

      const token = await getAccessToken();

      const nextStatus =
        offer.status === "active" ? "paused" : "active";

      const response = await fetch("/api/admin/offers", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: offer.id,
          status: nextStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to change offer status."
        );
      }

      setMessage(
        nextStatus === "active"
          ? "Offer activated."
          : "Offer paused."
      );

      await loadOffers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to change status."
      );
    }
  }

  async function deleteOffer(offer: Offer) {
    const confirmed = window.confirm(
      `Delete "${offer.name}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setMessage("");

      const token = await getAccessToken();

      const response = await fetch(
        `/api/admin/offers?id=${encodeURIComponent(offer.id)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to delete offer."
        );
      }

      setMessage("Offer deleted successfully.");

      await loadOffers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete offer."
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="flex min-h-20 items-center justify-between gap-4 px-5 sm:px-8">
          <div>
            <h1 className="text-2xl font-bold">
              Offers & Links
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Create and manage your CPA offers
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            ← Dashboard
          </button>
        </div>
      </header>

      <div className="p-5 sm:p-8">
        {/* Top */}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold">
              Offer Management
            </h2>

            <p className="text-sm text-slate-500">
              Add offers that will become available to your affiliates.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (showForm && !editingId) {
                resetForm();
              } else {
                setEditingId(null);
                setForm(emptyForm);
                setShowForm(true);
                setMessage("");
                setError("");
              }
            }}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            {showForm && !editingId
              ? "Close Form"
              : "+ Add New Offer"}
          </button>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h3 className="text-xl font-bold">
                {editingId ? "Edit Offer" : "Create New Offer"}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {editingId
                  ? "Update the offer information below."
                  : "Enter the information for your CPA offer."}
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="grid gap-5 md:grid-cols-2"
            >
              {/* Name */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Offer Name
                </label>

                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) =>
                    handleChange("name", e.target.value)
                  }
                  placeholder="Example: Survey Offer"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              {/* Advertiser */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Advertiser
                </label>

                <input
                  type="text"
                  required
                  value={form.advertiser}
                  onChange={(e) =>
                    handleChange("advertiser", e.target.value)
                  }
                  placeholder="Example: Advertiser Name"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              {/* URL */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Offer / Landing Page URL
                </label>

                <input
                  type="url"
                  required
                  value={form.offer_url}
                  onChange={(e) =>
                    handleChange("offer_url", e.target.value)
                  }
                  placeholder="https://example.com/offer"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              {/* Payout */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Payout (USD)
                </label>

                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={form.payout}
                  onChange={(e) =>
                    handleChange("payout", e.target.value)
                  }
                  placeholder="10.00"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              {/* Country */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Country
                </label>

                <select
                  value={form.country}
                  onChange={(e) =>
                    handleChange("country", e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                >
                  <option value="Worldwide">Worldwide</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Canada">Canada</option>
                  <option value="Australia">Australia</option>
                  <option value="Germany">Germany</option>
                  <option value="France">France</option>
                  <option value="Bangladesh">Bangladesh</option>
                  <option value="India">India</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Category
                </label>

                <input
                  type="text"
                  value={form.category}
                  onChange={(e) =>
                    handleChange("category", e.target.value)
                  }
                  placeholder="Survey, Dating, App, Finance..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              {/* Device */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Device
                </label>

                <select
                  value={form.device}
                  onChange={(e) =>
                    handleChange("device", e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                >
                  <option value="All">All Devices</option>
                  <option value="Mobile">Mobile</option>
                  <option value="Desktop">Desktop</option>
                  <option value="Android">Android</option>
                  <option value="iOS">iOS</option>
                </select>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Description
                </label>

                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    handleChange("description", e.target.value)
                  }
                  placeholder="Describe the offer..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              {/* Image */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Image URL
                </label>

                <input
                  type="url"
                  value={form.image_url}
                  onChange={(e) =>
                    handleChange("image_url", e.target.value)
                  }
                  placeholder="https://example.com/image.jpg"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              {/* Status */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Status
                </label>

                <select
                  value={form.status}
                  onChange={(e) =>
                    handleChange("status", e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex items-end gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Offers */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h3 className="font-bold">
              Your Offers
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Offers stored in your Supabase database.
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center p-8">
              <div className="text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

                <p className="mt-4 text-sm font-semibold text-slate-500">
                  Loading offers...
                </p>
              </div>
            </div>
          ) : offers.length === 0 ? (
            <div className="flex min-h-64 items-center justify-center p-8">
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600">
                  ▣
                </div>

                <h4 className="mt-4 font-bold text-slate-700">
                  No offers yet
                </h4>

                <p className="mt-1 max-w-sm text-sm text-slate-400">
                  Create your first offer and it will be saved
                  directly to Supabase.
                </p>

                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  + Create First Offer
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Offer
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Advertiser
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Country
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Payout
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {offers.map((offer) => (
                    <tr
                      key={offer.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-5">
                        <div className="flex items-center gap-3">
                          {offer.image_url ? (
                            <img
                              src={offer.image_url}
                              alt={offer.name}
                              className="h-11 w-11 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-600">
                              O
                            </div>
                          )}

                          <div>
                            <p className="font-bold text-slate-800">
                              {offer.name}
                            </p>

                            <p className="mt-1 max-w-xs truncate text-xs text-slate-400">
                              {offer.category || "General"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-5 text-sm font-semibold text-slate-600">
                        {offer.advertiser || "—"}
                      </td>

                      <td className="px-5 py-5 text-sm text-slate-600">
                        {offer.country || "Worldwide"}
                      </td>

                      <td className="px-5 py-5">
                        <span className="font-bold text-emerald-600">
                          ${Number(offer.payout).toFixed(2)}
                        </span>
                      </td>

                      <td className="px-5 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
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

                      <td className="px-5 py-5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(offer)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleStatus(offer)}
                            className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                              offer.status === "active"
                                ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            {offer.status === "active"
                              ? "Pause"
                              : "Activate"}
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteOffer(offer)}
                            className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100"
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
        </div>

        {/* Info */}
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <h3 className="font-bold text-blue-900">
            Offer system connected
          </h3>

          <p className="mt-1 text-sm leading-6 text-blue-800">
            এখন Admin Panel থেকে Offer তৈরি করলে সেটি Supabase database-এ
            save হবে। এখান থেকেই Offer edit, pause, activate এবং delete
            করা যাবে। পরের ধাপে এই Active Offer-গুলো Affiliate/Trader
            panel-এ দেখানো হবে।
          </p>
        </div>
      </div>
    </main>
  );
}
