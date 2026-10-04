"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Offer = {
  id: string;
  name: string;
  description: string | null;
  advertiser: string | null;
  payout: number | null;
  currency: string | null;
  country: string | null;
  category: string | null;
  device: string | null;
  tracking_url: string | null;
  image_url: string | null;
  status: string | null;
};

type Profile = {
  affiliate_id: string;
  full_name: string | null;
  email: string | null;
  status: string | null;
};

export default function AffiliateOffersPage() {
  const router = useRouter();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  async function loadOffers() {
    try {
      setLoading(true);
      setError("");

      if (!supabase) {
        throw new Error("Supabase client is not configured.");
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.push("/login");
        return;
      }

      const dashboardResponse = await fetch(
        "/api/affiliate/dashboard",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const dashboardResult =
        await dashboardResponse.json();

      if (
        dashboardResponse.ok &&
        dashboardResult?.profile
      ) {
        setProfile(dashboardResult.profile);
      }

      const response = await fetch(
        "/api/affiliate/offers",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Unable to load available offers."
        );
      }

      const activeOffers = (
        result.offers || []
      ).filter(
        (offer: Offer) =>
          !offer.status ||
          offer.status === "active"
      );

      setOffers(activeOffers);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load offers."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOffers();
  }, []);

  const categories = useMemo(() => {
    const values = offers
      .map((offer) => offer.category)
      .filter(
        (value): value is string =>
          Boolean(value)
      );

    return [
      "All",
      ...Array.from(new Set(values)),
    ];
  }, [offers]);

  const filteredOffers = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return offers.filter((offer) => {
      const matchesSearch =
        !query ||
        offer.name
          .toLowerCase()
          .includes(query) ||
        (offer.advertiser || "")
          .toLowerCase()
          .includes(query) ||
        (offer.category || "")
          .toLowerCase()
          .includes(query) ||
        (offer.country || "")
          .toLowerCase()
          .includes(query);

      const matchesCategory =
        category === "All" ||
        offer.category === category;

      return (
        matchesSearch &&
        matchesCategory
      );
    });
  }, [offers, search, category]);

  function getTrackingLink(
    offer: Offer
  ) {
    if (!profile?.affiliate_id) {
      return "";
    }

    if (typeof window === "undefined") {
      return "";
    }

    const baseUrl = `${window.location.origin}/api/track`;

    const params = new URLSearchParams({
      aid: profile.affiliate_id,
      offer: offer.id,
    });

    return `${baseUrl}?${params.toString()}`;
  }

  async function copyOfferLink(
    offer: Offer
  ) {
    const link = getTrackingLink(offer);

    if (!link) {
      setError(
        "Affiliate ID is unavailable. Please login again."
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(link);

      setCopiedId(offer.id);

      window.setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch {
      setError(
        "Unable to copy the offer link."
      );
    }
  }

  function openOffer(offer: Offer) {
    const link = getTrackingLink(offer);

    if (!link) {
      setError(
        "Affiliate ID is unavailable. Please login again."
      );
      return;
    }

    window.open(
      link,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                router.push("/affiliate")
              }
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              ← Dashboard
            </button>

            <div className="hidden sm:block">
              <p className="text-lg font-bold">
                Offers
              </p>

              <p className="text-xs text-slate-400">
                Available CPA campaigns
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-right">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              Affiliate ID
            </p>

            <p className="text-sm font-bold text-cyan-300">
              {profile?.affiliate_id ||
                "Loading..."}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="mb-8 overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10 p-6 shadow-2xl shadow-cyan-950/20 sm:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-300">
                CPA Offers
              </div>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                Find Offers & Start Earning
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                Browse active campaigns available
                for your affiliate account. Copy
                your unique tracking link and
                promote the offer.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4">
                <p className="text-xs text-slate-500">
                  Active Offers
                </p>

                <p className="mt-1 text-2xl font-black text-white">
                  {offers.length}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4">
                <p className="text-xs text-slate-500">
                  Showing
                </p>

                <p className="mt-1 text-2xl font-black text-cyan-300">
                  {filteredOffers.length}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="text-red-300 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {/* Filters */}
        <section className="mb-7 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search offers, advertiser, country..."
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setCategory(item)
                  }
                  className={`whitespace-nowrap rounded-xl px-4 py-3 text-sm font-bold transition ${
                    category === item
                      ? "bg-cyan-500 text-slate-950"
                      : "border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Loading */}
        {loading && (
          <div className="flex min-h-72 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03]">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-cyan-400" />

              <p className="mt-4 text-sm font-semibold text-slate-400">
                Loading available offers...
              </p>
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading &&
          filteredOffers.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-2xl">
                ◇
              </div>

              <h2 className="mt-5 text-xl font-bold">
                No offers found
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                There are currently no active offers
                matching your search or category.
                Please check again later.
              </p>
            </div>
          )}

        {/* Offers Grid */}
        {!loading &&
          filteredOffers.length > 0 && (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredOffers.map((offer) => {
                const trackingLink =
                  getTrackingLink(offer);

                return (
                  <article
                    key={offer.id}
                    className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-xl shadow-black/10 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-white/[0.06]"
                  >
                    {/* Image */}
                    <div className="relative h-48 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
                      {offer.image_url ? (
                        <img
                          src={offer.image_url}
                          alt={offer.name}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10">
                          <span className="text-6xl font-black text-cyan-400/30">
                            $
                          </span>
                        </div>
                      )}

                      <div className="absolute left-4 top-4 rounded-full border border-emerald-400/20 bg-emerald-500/90 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                        Active
                      </div>

                      {offer.category && (
                        <div className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[10px] font-bold text-white backdrop-blur">
                          {offer.category}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h2 className="truncate text-xl font-black text-white">
                            {offer.name}
                          </h2>

                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {offer.advertiser ||
                              "Direct Advertiser"}
                          </p>
                        </div>

                        <div className="shrink-0 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-right">
                          <p className="text-[9px] uppercase tracking-wider text-emerald-400/70">
                            Payout
                          </p>

                          <p className="font-black text-emerald-300">
                            {offer.currency ||
                              "USD"}{" "}
                            {Number(
                              offer.payout || 0
                            ).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {offer.description && (
                        <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-400">
                          {offer.description}
                        </p>
                      )}

                      {/* Details */}
                      <div className="mt-5 grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">
                          <p className="text-[9px] uppercase tracking-wider text-slate-600">
                            Country
                          </p>

                          <p className="mt-1 truncate text-xs font-bold text-slate-300">
                            {offer.country ||
                              "Worldwide"}
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">
                          <p className="text-[9px] uppercase tracking-wider text-slate-600">
                            Device
                          </p>

                          <p className="mt-1 truncate text-xs font-bold text-slate-300">
                            {offer.device ||
                              "All"}
                          </p>
                        </div>
                      </div>

                      {/* Tracking Link */}
                      <div className="mt-5 rounded-xl border border-cyan-400/10 bg-cyan-400/5 p-3">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-cyan-400/70">
                          Your Tracking Link
                        </p>

                        <div className="flex items-center gap-2">
                          <input
                            readOnly
                            value={
                              trackingLink
                            }
                            className="min-w-0 flex-1 rounded-lg border border-white/5 bg-slate-950 px-3 py-2 text-[10px] text-slate-400 outline-none"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              copyOfferLink(
                                offer
                              )
                            }
                            className="shrink-0 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-cyan-400"
                          >
                            {copiedId ===
                            offer.id
                              ? "Copied!"
                              : "Copy"}
                          </button>
                        </div>
                      </div>

                      {/* Buttons */}
                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            copyOfferLink(
                              offer
                            )
                          }
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                        >
                          {copiedId ===
                          offer.id
                            ? "✓ Link Copied"
                            : "Copy Link"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openOffer(
                              offer
                            )
                          }
                          className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:opacity-90"
                        >
                          Open Offer →
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

        {/* Bottom Info */}
        <section className="mt-8 rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-5">
          <h3 className="font-bold text-cyan-300">
            How your tracking works
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            প্রতিটি Offer-এর জন্য আপনার Affiliate
            ID ব্যবহার করে আলাদা tracking link তৈরি
            হচ্ছে। এই link দিয়ে visitor এলে আগে
            UpNetwork CPA tracking system-এর মাধ্যমে
            click record হবে, তারপর advertiser-এর
            offer URL-এ redirect হবে।
          </p>
        </section>
      </div>
    </main>
  );
  }
