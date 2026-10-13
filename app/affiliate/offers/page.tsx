"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

type AccessStatus =
  | "not_requested"
  | "pending"
  | "approved"
  | "rejected"
  | "revoked";

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
  image_url: string | null;
  status: string | null;
  access_status: AccessStatus;
  access_request?: {
    admin_note?: string;
    revision?: number;
  } | null;
};

type Profile = {
  affiliate_id: string;
  full_name: string | null;
};

const accessLabels: Record<AccessStatus, string> = {
  not_requested: "Request Required",
  pending: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  revoked: "Access Revoked",
};

const emptyApplication = {
  traffic_source: "",
  traffic_geo: "",
  daily_clicks: "",
  promotion_url: "",
  note: "",
};

export default function AffiliateOffersPage() {
  const router = useRouter();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [application, setApplication] = useState(emptyApplication);

  const requestPending = useRef(false);
  const loadPending = useRef(false);

  async function token() {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { data, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !data.session?.access_token) {
      router.replace("/login");
      throw new Error("Please log in again.");
    }

    return data.session.access_token;
  }

  async function loadOffers(showLoading = true) {
    if (loadPending.current || requestPending.current) return;

    loadPending.current = true;

    if (showLoading) {
      setLoading(true);
      setError("");
    }

    try {
      const accessToken = await token();

      const response = await fetch("/api/affiliate/offers", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            result.message ||
            "Unable to load offers."
        );
      }

      if (requestPending.current) return;

      setProfile({
        affiliate_id:
          result.profile?.affiliate_id ||
          result.affiliateId ||
          "",
        full_name:
          result.profile?.full_name || null,
      });

      setOffers(
        (Array.isArray(result.offers) ? result.offers : []).filter(
          (offer: Offer) =>
            !offer.status ||
            offer.status.toLowerCase() === "active"
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load offers."
      );
    } finally {
      loadPending.current = false;

      if (showLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadOffers();
  }, []);

  useAutoRefresh(() => loadOffers(false), 15000);

  const categories = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          offers
            .map((offer) => offer.category)
            .filter(
              (value): value is string => Boolean(value)
            )
        )
      ),
    ],
    [offers]
  );

  const filteredOffers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return offers.filter((offer) => {
      const matchesSearch =
        !query ||
        [
          offer.name,
          offer.advertiser,
          offer.category,
          offer.country,
        ].some((value) =>
          (value || "").toLowerCase().includes(query)
        );

      return (
        matchesSearch &&
        (category === "All" || offer.category === category)
      );
    });
  }, [offers, search, category]);

  function getTrackingLink(offer: Offer) {
    if (
      offer.access_status !== "approved" ||
      !profile?.affiliate_id ||
      typeof window === "undefined"
    ) {
      return "";
    }

    const params = new URLSearchParams({
      aid: profile.affiliate_id,
      offerId: String(offer.id),
    });

    return `${window.location.origin}/api/track?${params.toString()}`;
  }

  async function copyOfferLink(offer: Offer) {
    const link = getTrackingLink(offer);

    if (!link) {
      setError("Offer approval and an Affiliate ID are required.");
      return;
    }

    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(offer.id);

      window.setTimeout(() => {
        setCopiedId((current) =>
          current === offer.id ? null : current
        );
      }, 2000);
    } catch {
      setError("Unable to copy the offer link.");
    }
  }

  function openOffer(offer: Offer) {
    const link = getTrackingLink(offer);

    if (!link) {
      setError("Offer approval and an Affiliate ID are required.");
      return;
    }

    window.open(link, "_blank", "noopener,noreferrer");
  }

  function openRequestForm(offer: Offer) {
    setApplication({ ...emptyApplication });
    setError("");
    setSelectedOffer(offer);
  }

  function changeApplication(
    field: keyof typeof emptyApplication,
    value: string
  ) {
    setApplication((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function requestOffer(offer: Offer) {
    if (
      requestPending.current ||
      ["approved", "pending"].includes(offer.access_status)
    ) {
      return;
    }

    requestPending.current = true;
    setRequestingId(offer.id);
    setError("");
    setMessage("");

    try {
      const accessToken = await token();

      const response = await fetch(
        "/api/affiliate/offer-requests",
        {
          method: "POST",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            offer_id: String(offer.id),
            ...application,
            daily_clicks: Number(application.daily_clicks),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Unable to request offer access."
        );
      }

      setOffers((current) =>
        current.map((item) =>
          item.id === offer.id
            ? {
                ...item,
                access_status: result.request.status,
                access_request: result.request,
              }
            : item
        )
      );

      setMessage(
        result.message ||
          "Request submitted. Please wait for approval."
      );

      setSelectedOffer(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit request."
      );
    } finally {
      requestPending.current = false;
      setRequestingId(null);
    }
  }

  const formInput =
    "mt-2 w-full rounded-xl border border-white/10 " +
    "bg-slate-950 p-3 text-white outline-none " +
    "focus:border-cyan-400/50 disabled:opacity-50";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/affiliate")}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200"
            >
              &larr; Dashboard
            </button>

            <div className="hidden sm:block">
              <p className="text-lg font-bold">Offers</p>
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
                (loading ? "Loading..." : "Unavailable")}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10 p-6 shadow-2xl shadow-cyan-950/20 sm:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-300">
                CPA Offers
              </div>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                Find Offers &amp; Start Earning
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                Request offer access, wait for approval, then copy
                your tracking link and promote the offer.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4">
                <p className="text-xs text-slate-500">
                  Active Offers
                </p>
                <p className="mt-1 text-2xl font-black">
                  {offers.length}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4">
                <p className="text-xs text-slate-500">Showing</p>
                <p className="mt-1 text-2xl font-black text-cyan-300">
                  {filteredOffers.length}
                </p>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300"
          >
            <span>{error}</span>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setError("")}
            >
              &times;
            </button>
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm text-emerald-300"
          >
            {message}
          </div>
        )}

        <section className="mb-7 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-col gap-4 lg:flex-row">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search offers, advertiser, country..."
              aria-label="Search offers"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600"
            />

            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`whitespace-nowrap rounded-xl px-4 py-3 text-sm font-bold ${
                    category === item
                      ? "bg-cyan-500 text-slate-950"
                      : "border border-white/10 bg-white/5 text-slate-400"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex min-h-72 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03]">
            <p className="text-sm text-slate-400">
              Loading available offers...
            </p>
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
            <h2 className="text-xl font-bold">No offers found</h2>
            <p className="mt-2 text-sm text-slate-500">
              No active offers match your search or category.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredOffers.map((offer) => {
              const accessStatus =
                offer.access_status || "not_requested";
              const approved = accessStatus === "approved";
              const pending = accessStatus === "pending";
              const trackingLink = getTrackingLink(offer);

              return (
                <article
                  key={offer.id}
                  className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-xl shadow-black/10 transition hover:-translate-y-1 hover:border-cyan-400/30"
                >
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

                    <div className="absolute left-4 top-4 rounded-full bg-emerald-500/90 px-3 py-1 text-[10px] font-black uppercase">
                      Active
                    </div>

                    {offer.category && (
                      <div className="absolute right-4 top-4 rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold backdrop-blur">
                        {offer.category}
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="truncate text-xl font-black">
                          {offer.name}
                        </h2>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {offer.advertiser || "Direct Advertiser"}
                        </p>
                      </div>

                      <div className="shrink-0 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-right">
                        <p className="text-[9px] uppercase text-emerald-400/70">
                          Payout
                        </p>
                        <p className="font-black text-emerald-300">
                          {offer.currency || "USD"}{" "}
                          {Number(offer.payout || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {offer.description && (
                      <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-400">
                        {offer.description}
                      </p>
                    )}

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">
                        <p className="text-[9px] uppercase text-slate-600">
                          Country
                        </p>
                        <p className="mt-1 truncate text-xs font-bold text-slate-300">
                          {offer.country || "Worldwide"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">
                        <p className="text-[9px] uppercase text-slate-600">
                          Device
                        </p>
                        <p className="mt-1 truncate text-xs font-bold text-slate-300">
                          {offer.device || "All"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/50 p-3">
                      <p
                        className={`text-xs font-bold ${
                          approved
                            ? "text-emerald-400"
                            : "text-amber-300"
                        }`}
                      >
                        Access: {accessLabels[accessStatus]}
                      </p>

                      {pending && (
                        <p className="mt-2 text-xs text-slate-400">
                          Your request is waiting for admin approval.
                        </p>
                      )}

                      {offer.access_request?.admin_note && (
                        <p className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-400">
                          Manager note: {offer.access_request.admin_note}
                        </p>
                      )}
                    </div>

                    {approved ? (
                      <>
                        <div className="mt-5 rounded-xl border border-cyan-400/10 bg-cyan-400/5 p-3">
                          <p className="mb-2 text-[10px] font-bold uppercase text-cyan-400/70">
                            Your Tracking Link
                          </p>
                          <input
                            readOnly
                            aria-label={`Tracking link for ${offer.name}`}
                            value={trackingLink}
                            className="w-full rounded-lg border border-white/5 bg-slate-950 px-3 py-2 text-[10px] text-slate-400 outline-none"
                          />
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => void copyOfferLink(offer)}
                            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold"
                          >
                            {copiedId === offer.id
                              ? "Link Copied"
                              : "Copy Link"}
                          </button>

                          <button
                            type="button"
                            onClick={() => openOffer(offer)}
                            className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-sm font-black text-slate-950"
                          >
                            Open Offer &rarr;
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openRequestForm(offer)}
                        disabled={pending || requestingId !== null}
                        className="mt-5 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                      >
                        {requestingId === offer.id
                          ? "Submitting request..."
                          : pending
                            ? "Awaiting Approval"
                            : ["rejected", "revoked"].includes(accessStatus)
                              ? "Request Access Again"
                              : "Request Access"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <section className="mt-8 rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-5">
          <h3 className="font-bold text-cyan-300">
            How Your Tracking Works
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Once your offer request is approved, your tracking link
            becomes available. UpNetwork CPA records visitor clicks
            before redirecting them to the advertiser.
          </p>
        </section>
      </div>

      {selectedOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="offer-request-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="offer-request-title" className="text-xl font-bold">
                Request Offer Access
              </h2>

              <button
                type="button"
                disabled={requestingId !== null}
                aria-label="Close request form"
                onClick={() => setSelectedOffer(null)}
                className="rounded-lg bg-white/5 px-3 py-2 disabled:opacity-50"
              >
                &times;
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm">
              <p className="font-bold text-cyan-300">
                {selectedOffer.name}
              </p>

              <p className="mt-1 break-all text-xs text-slate-400">
                Offer ID: {selectedOffer.id}
              </p>

              <p className="mt-2">
                Payout: {selectedOffer.currency || "USD"}{" "}
                {Number(selectedOffer.payout || 0).toFixed(2)}
              </p>

              <p className="mt-1">
                Country: {selectedOffer.country || "Worldwide"}
              </p>

              <p className="mt-1">
                Category: {selectedOffer.category || "General"}
              </p>

              {selectedOffer.description && (
                <p className="mt-2 whitespace-pre-wrap text-xs text-slate-400">
                  {selectedOffer.description}
                </p>
              )}
            </div>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300"
              >
                {error}
              </p>
            )}

            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void requestOffer(selectedOffer);
              }}
            >
              <label className="block text-sm">
                Traffic Source *
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  disabled={requestingId !== null}
                  value={application.traffic_source}
                  onChange={(event) =>
                    changeApplication(
                      "traffic_source",
                      event.target.value
                    )
                  }
                  placeholder="Facebook Ads, website, email, social media..."
                  className={formInput}
                />
              </label>

              <label className="block text-sm">
                Target Country *
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  disabled={requestingId !== null}
                  value={application.traffic_geo}
                  onChange={(event) =>
                    changeApplication(
                      "traffic_geo",
                      event.target.value
                    )
                  }
                  placeholder="Country you will send traffic from"
                  className={formInput}
                />
              </label>

              <label className="block text-sm">
                Estimated Daily Clicks *
                <input
                  type="number"
                  required
                  min={1}
                  max={1000000}
                  step={1}
                  disabled={requestingId !== null}
                  value={application.daily_clicks}
                  onChange={(event) =>
                    changeApplication(
                      "daily_clicks",
                      event.target.value
                    )
                  }
                  placeholder="Example: 100"
                  className={formInput}
                />
              </label>

              <label className="block text-sm">
                Website / Promotion URL (optional)
                <input
                  type="url"
                  maxLength={350}
                  disabled={requestingId !== null}
                  value={application.promotion_url}
                  onChange={(event) =>
                    changeApplication(
                      "promotion_url",
                      event.target.value
                    )
                  }
                  placeholder="https://your-website.com"
                  className={formInput}
                />
              </label>

              <label className="block text-sm">
                Promotion Plan *
                <textarea
                  required
                  minLength={10}
                  maxLength={1000}
                  rows={4}
                  disabled={requestingId !== null}
                  value={application.note}
                  onChange={(event) =>
                    changeApplication(
                      "note",
                      event.target.value
                    )
                  }
                  placeholder="Explain how you will promote this offer"
                  className={formInput}
                />
              </label>

              <button
                type="submit"
                disabled={requestingId !== null}
                className="w-full rounded-xl bg-cyan-500 p-3 font-bold text-slate-950 disabled:opacity-50"
              >
                {requestingId !== null
                  ? "Submitting request..."
                  : "Submit Offer Request"}
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}