"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OffersPage() {
  const router = useRouter();

  const [showForm, setShowForm] = useState(false);

  const [offerName, setOfferName] = useState("");
  const [advertiser, setAdvertiser] = useState("");
  const [landingUrl, setLandingUrl] = useState("");
  const [payout, setPayout] = useState("");
  const [country, setCountry] = useState("");
  const [status, setStatus] = useState("Active");

  function handleCreateOffer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    alert("Offer form is ready. Database connection will be added next.");

    setOfferName("");
    setAdvertiser("");
    setLandingUrl("");
    setPayout("");
    setCountry("");
    setStatus("Active");
    setShowForm(false);
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="flex min-h-20 items-center justify-between px-5 sm:px-8">
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
        {/* Top Section */}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold">
              Offer Management
            </h2>

            <p className="text-sm text-slate-500">
              Add offers and manage your tracking links.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            {showForm ? "Close Form" : "+ Add New Offer"}
          </button>
        </div>

        {/* Add Offer Form */}
        {showForm && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h3 className="text-xl font-bold">
                Create New Offer
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Enter the basic information for your CPA offer.
              </p>
            </div>

            <form
              onSubmit={handleCreateOffer}
              className="grid gap-5 md:grid-cols-2"
            >
              {/* Offer Name */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Offer Name
                </label>

                <input
                  type="text"
                  required
                  value={offerName}
                  onChange={(e) => setOfferName(e.target.value)}
                  placeholder="Example: Survey Offer"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
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
                  value={advertiser}
                  onChange={(e) => setAdvertiser(e.target.value)}
                  placeholder="Example: Advertiser Name"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              {/* Landing URL */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Landing Page URL
                </label>

                <input
                  type="url"
                  required
                  value={landingUrl}
                  onChange={(e) => setLandingUrl(e.target.value)}
                  placeholder="https://example.com/offer"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
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
                  value={payout}
                  onChange={(e) => setPayout(e.target.value)}
                  placeholder="10.00"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              {/* Country */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Country
                </label>

                <select
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                >
                  <option value="">Select Country</option>
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

              {/* Status */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Status
                </label>

                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                >
                  <option value="Active">Active</option>
                  <option value="Paused">Paused</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex items-end gap-3">
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                  Create Offer
                </button>

                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Offers Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h3 className="font-bold">
              Your Offers
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Offers saved in your CPA network will appear here.
            </p>
          </div>

          <div className="flex min-h-64 items-center justify-center p-8">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600">
                ▣
              </div>

              <h4 className="mt-4 font-bold text-slate-700">
                No offers yet
              </h4>

              <p className="mt-1 max-w-sm text-sm text-slate-400">
                Create your first offer. Database storage and tracking
                links will be connected in the next step.
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
        </div>

        {/* Information */}
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <h3 className="font-bold text-blue-900">
            Next step
          </h3>

          <p className="mt-1 text-sm leading-6 text-blue-800">
            এই পেজের পরের ধাপে Supabase database-এর সঙ্গে যুক্ত করা হবে।
            তখন Create Offer চাপলে offer সত্যিকারভাবে database-এ save হবে
            এবং তার জন্য tracking link তৈরি করা যাবে।
          </p>
        </div>
      </div>
    </main>
  );
}
