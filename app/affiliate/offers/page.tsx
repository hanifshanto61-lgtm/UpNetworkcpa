"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  Target,
  Globe,
  Smartphone,
  Monitor,
  RefreshCw,
} from "lucide-react";
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
};

export default function AffiliateOffersPage() {
  const router = useRouter();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [affiliateId, setAffiliateId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function loadOffers() {
    try {
      setLoading(true);
      setError("");

      if (!supabase) {
        throw new Error(
          "Supabase is not configured."
        );
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(
        "/api/affiliate/offers",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to load offers."
        );
      }

      setAffiliateId(
        data.affiliateId || ""
      );

      setOffers(
        Array.isArray(data.offers)
          ? data.offers
          : []
      );
    } catch (err) {
      console.error(err);

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

  function getTrackingLink(
    offerId: string
  ) {
    if (
      typeof window === "undefined" ||
      !affiliateId
    ) {
      return "";
    }

    return `${window.location.origin}/api/track?aid=${encodeURIComponent(
      affiliateId
    )}&offerId=${encodeURIComponent(
      offerId
    )}`;
  }

  async function copyLink(offerId: string) {
    try {
      const link =
        getTrackingLink(offerId);

      if (!link) return;

      await navigator.clipboard.writeText(
        link
      );

      setCopiedId(offerId);

      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  }

  function openTrackingLink(
    offerId: string
  ) {
    const link =
      getTrackingLink(offerId);

    if (!link) return;

    window.open(
      link,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <main className="min-h-screen bg-[#05070c] text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#05070c]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                router.push("/affiliate")
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-400"
            >
              <ArrowLeft size={19} />
            </button>

            <div>
              <div className="text-lg font-extrabold tracking-tight">
                UpNetwork
                <span className="text-cyan-400">
                  CPA
                </span>
              </div>

              <div className="text-[9px] uppercase tracking-[0.22em] text-slate-600">
                Available Offers
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={loadOffers}
            disabled={loading}
            className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-slate-300 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-400 disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            <span className="hidden sm:block">
              Refresh
            </span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Heading */}
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-cyan-400">
            <Target size={20} />

            <span className="text-xs font-bold uppercase tracking-[0.18em]">
              CPA Offers
            </span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Available Offers
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            এখান থেকে Active Offer বেছে নিয়ে আপনার
            affiliate tracking link কপি করুন।
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-400">
            <p className="font-bold">
              Unable to load offers
            </p>

            <p className="mt-1">
              {error}
            </p>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex min-h-72 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.02]">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />

              <p className="mt-4 text-sm text-slate-500">
                Loading available offers...
              </p>
            </div>
          </div>
        ) : offers.length === 0 ? (
          /* Empty */
          <div className="flex min-h-72 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.02] p-8">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-400">
                <Target size={28} />
              </div>

              <h2 className="mt-5 text-lg font-bold">
                No active offers
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                বর্তমানে কোনো Active Offer নেই।
                Admin নতুন Offer Active করলে এখানে
                automatically দেখা যাবে।
              </p>
            </div>
          </div>
        ) : (
          /* Offers */
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {offers.map((offer) => {
              const trackingLink =
                getTrackingLink(offer.id);

              return (
                <article
                  key={offer.id}
                  className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] transition hover:border-cyan-400/25 hover:bg-white/[0.04]"
                >
                  {/* Image */}
                  {offer.image_url ? (
                    <div className="h-44 overflow-hidden bg-slate-900">
                      <img
                        src={offer.image_url}
                        alt={offer.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="flex h-44 items-center justify-center bg-gradient-to-br from-cyan-400/10 to-blue-500/5">
                      <Target
                        size={48}
                        className="text-cyan-400/40"
                      />
                    </div>
                  )}

                  <div className="p-5">
                    {/* Title */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-bold text-white">
                          {offer.name}
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                          {offer.advertiser ||
                            "UpNetworkCPA"}
                        </p>
                      </div>

                      <div className="shrink-0 rounded-xl bg-emerald-400/10 px-3 py-2 text-right">
                        <p className="text-[9px] uppercase tracking-wider text-emerald-400/70">
                          Payout
                        </p>

                        <p className="text-sm font-extrabold text-emerald-400">
                          {offer.currency === "USD"
                            ? "$"
                            : offer.currency}{" "}
                          {Number(
                            offer.payout || 0
                          ).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    {offer.description && (
                      <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-400">
                        {offer.description}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-slate-400">
                        <Globe size={12} />

                        {offer.country ||
                          "Worldwide"}
                      </span>

                      <span className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-slate-400">
                        {String(
                          offer.device || "All"
                        ).toLowerCase() ===
                        "desktop" ? (
                          <Monitor size={12} />
                        ) : (
                          <Smartphone size={12} />
                        )}

                        {offer.device ||
                          "All"}
                      </span>

                      {offer.category && (
                        <span className="rounded-lg border border-cyan-400/10 bg-cyan-400/5 px-2.5 py-1.5 text-[11px] text-cyan-400">
                          {offer.category}
                        </span>
                      )}
                    </div>

                    {/* Tracking URL */}
                    <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-3">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        Your Tracking Link
                      </p>

                      <div className="flex items-center gap-2">
                        <input
                          readOnly
                          value={trackingLink}
                          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] text-slate-400 outline-none"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            copyLink(
                              offer.id
                            )
                          }
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-400 transition hover:bg-cyan-400/20"
                          title="Copy tracking link"
                        >
                          {copiedId ===
                          offer.id ? (
                            <Check
                              size={17}
                            />
                          ) : (
                            <Copy
                              size={17}
                            />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          copyLink(
                            offer.id
                          )
                        }
                        className="flex items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-xs font-bold text-cyan-400 transition hover:bg-cyan-400/10"
                      >
                        {copiedId ===
                        offer.id ? (
                          <>
                            <Check size={15} />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy size={15} />
                            Copy Link
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openTrackingLink(
                            offer.id
                          )
                        }
                        className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-xs font-bold text-black transition hover:bg-cyan-400"
                      >
                        <ExternalLink
                          size={15}
                        />
                        Open Offer
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
                  }
