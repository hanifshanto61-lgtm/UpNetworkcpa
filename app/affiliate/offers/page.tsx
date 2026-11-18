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
  offer_number?: number | string | null;
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

type OfferSubId = {
  id: string;
  offer_id: string | null;
  sub_id: string;
  name: string;
  created_at: string;
};

type OfferSubIdReport = {
  sub_id: string;
  source_id: string;
  source_name: string;
  clicks: number;
  unique_clicks: number;
  conversions: number;
  earnings: number;
};

const PAGE_SIZE = 20;

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

function getOfferNumber(offer: Offer) {
  if (
    offer.offer_number !== null &&
    offer.offer_number !== undefined &&
    String(offer.offer_number).trim() !== ""
  ) {
    return `OFF-${offer.offer_number}`;
  }

  const shortId = offer.id
    .replace(/-/g, "")
    .slice(0, 8)
    .toUpperCase();

  return `OFF-${shortId}`;
}

export default function AffiliateOffersPage() {
  const router = useRouter();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [application, setApplication] = useState(emptyApplication);
  const [detailsOffer, setDetailsOffer] = useState<Offer | null>(null);
  const [offerWorkers, setOfferWorkers] = useState<OfferSubId[]>([]);
  const [offerWorkerRows, setOfferWorkerRows] = useState<OfferSubIdReport[]>([]);
  const [workerName, setWorkerName] = useState("");
  const [workerSubId, setWorkerSubId] = useState("");
  const [workersLoading, setWorkersLoading] = useState(false);
  const [workerCreating, setWorkerCreating] = useState(false);
  const [workerMessage, setWorkerMessage] = useState("");
  const [copiedWorkerId, setCopiedWorkerId] = useState<string | null>(null);

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
        full_name: result.profile?.full_name || null,
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
      const offerNumber = getOfferNumber(offer).toLowerCase();

      const searchableValues = [
        offerNumber,
        offer.id,
        offer.name,
        offer.advertiser,
        offer.category,
        offer.country,
        offer.device,
      ];

      const matchesSearch =
        !query ||
        searchableValues.some((value) =>
          (value || "").toLowerCase().includes(query)
        );

      return (
        matchesSearch &&
        (category === "All" || offer.category === category)
      );
    });
  }, [offers, search, category]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOffers.length / PAGE_SIZE)
  );

  const paginatedOffers = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;

    return filteredOffers.slice(
      startIndex,
      startIndex + PAGE_SIZE
    );
  }, [filteredOffers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, category]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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

  function getWorkerTrackingLink(offer: Offer, subId: string) {
    if (
      offer.access_status !== "approved" ||
      !profile?.affiliate_id ||
      typeof window === "undefined"
    ) {
      return "";
    }

    const params = new URLSearchParams({
      aid: profile.affiliate_id,
      offerId: offer.id,
      sub_id: subId,
    });

    return `${window.location.origin}/api/track?${params.toString()}`;
  }

  async function loadOfferSubIds(offer: Offer) {
    setDetailsOffer(offer);
    setOfferWorkers([]);
    setOfferWorkerRows([]);
    setWorkerMessage("");
    setWorkersLoading(true);

    try {
      const accessToken = await token();

      const response = await fetch(
        `/api/affiliate/sub-ids?offer_id=${encodeURIComponent(offer.id)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || result.message || "Unable to load Sub IDs."
        );
      }

      setOfferWorkers(
        Array.isArray(result.workers) ? result.workers : []
      );

      setOfferWorkerRows(
        Array.isArray(result.rows) ? result.rows : []
      );
    } catch (err) {
      setWorkerMessage(
        err instanceof Error
          ? err.message
          : "Unable to load Sub IDs."
      );
    } finally {
      setWorkersLoading(false);
    }
  }

  async function createOfferSubId() {
    if (!detailsOffer || workerCreating) return;

    if (!workerName.trim() || !workerSubId.trim()) {
      setWorkerMessage("Please enter both Sub ID name and Sub ID.");
      return;
    }

    setWorkerCreating(true);
    setWorkerMessage("");

    try {
      const accessToken = await token();

      const response = await fetch("/api/affiliate/sub-ids", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offer_id: detailsOffer.id,
          name: workerName.trim(),
          sub_id: workerSubId.trim().toLowerCase(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || result.message || "Unable to create Sub ID."
        );
      }

      setWorkerName("");
      setWorkerSubId("");
      setWorkerMessage("Sub ID created successfully.");

      await loadOfferSubIds(detailsOffer);
    } catch (err) {
      setWorkerMessage(
        err instanceof Error
          ? err.message
          : "Unable to create Sub ID."
      );
    } finally {
      setWorkerCreating(false);
    }
  }

  async function copyWorkerLink(offer: Offer, subId: string) {
    const link = getWorkerTrackingLink(offer, subId);

    if (!link) {
      setWorkerMessage("Offer approval and Affiliate ID are required.");
      return;
    }

    try {
      await navigator.clipboard.writeText(link);
      setCopiedWorkerId(subId);

      window.setTimeout(() => {
        setCopiedWorkerId((current) =>
          current === subId ? null : current
        );
      }, 2000);
    } catch {
      setWorkerMessage("Unable to copy the Sub ID tracking link.");
    }
  }

  function openOffer(offer: Offer) {
    if (
      offer.access_status !== "approved" ||
      !profile?.affiliate_id
    ) {
      setError("Offer approval and an Affiliate ID are required.");
      return;
    }

    void loadOfferSubIds(offer);
  }

  function handleOfferClick(offer: Offer) {
    const accessStatus = offer.access_status || "not_requested";

    if (accessStatus === "approved") {
      openOffer(offer);
      return;
    }

    if (accessStatus === "pending") {
      setMessage("Your request is waiting for admin approval.");
      return;
    }

    openRequestForm(offer);
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
                <p className="text-xs text-slate-500">Matching Offers</p>
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
            className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm text-emerald-300"
          >
            <span>{message}</span>
            <button
              type="button"
              aria-label="Dismiss message"
              onClick={() => setMessage("")}
            >
              &times;
            </button>
          </div>
        )}

        <section className="mb-7 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-col gap-4 lg:flex-row">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by Offer No., offer name, country..."
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
          <div className="space-y-4">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-black text-white">
                  Available Offers
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Select an offer row to view details or request access.
                </p>
              </div>

              <p className="text-xs font-semibold text-slate-400">
                {filteredOffers.length} offers found
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
              <div className="min-w-[1050px]">
                <div className="grid grid-cols-[75px_105px_minmax(210px,1.7fr)_125px_125px_125px_150px] items-center gap-3 border-b border-white/10 bg-white/[0.06] px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span>Image</span>
                  <span>Offer No.</span>
                  <span>Offer Details</span>
                  <span>Payout</span>
                  <span>GEO</span>
                  <span>Category</span>
                  <span>Access Status</span>
                </div>

                {paginatedOffers.map((offer) => {
                  const accessStatus =
                    offer.access_status || "not_requested";

                  const approved = accessStatus === "approved";
                  const pending = accessStatus === "pending";

                  return (
                    <button
                      key={offer.id}
                      type="button"
                      onClick={() => handleOfferClick(offer)}
                      className="grid w-full grid-cols-[75px_105px_minmax(210px,1.7fr)_125px_125px_125px_150px] items-center gap-3 border-b border-white/5 px-4 py-3 text-left transition last:border-b-0 hover:bg-cyan-400/[0.07] focus:bg-cyan-400/[0.07] focus:outline-none"
                    >
                      <span className="flex h-12 w-16 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-slate-900">
                        {offer.image_url ? (
                          <img
                            src={offer.image_url}
                            alt={offer.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xl font-black text-cyan-400">
                            $
                          </span>
                        )}
                      </span>

                      <span className="text-xs font-black text-cyan-300">
                        {getOfferNumber(offer)}
                      </span>

                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-white">
                          {offer.name}
                        </span>
                        
                        <span className="mt-1 block truncate text-[10px] text-slate-600">
                          {offer.device || "All Devices"}
                        </span>
                      </span>

                      <span className="text-sm font-black text-emerald-300">
                        {offer.currency || "USD"}{" "}
                        {Number(offer.payout || 0).toFixed(2)}
                      </span>

                      <span className="truncate text-xs font-semibold text-slate-300">
                        {offer.country || "Worldwide"}
                      </span>

                      <span className="truncate text-xs text-slate-300">
                        {offer.category || "General"}
                      </span>

                      <span>
                        <span
                          className={`inline-flex rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${
                            approved
                              ? "bg-emerald-400/10 text-emerald-300"
                              : pending
                                ? "bg-amber-400/10 text-amber-300"
                                : accessStatus === "rejected" ||
                                    accessStatus === "revoked"
                                  ? "bg-red-400/10 text-red-300"
                                  : "bg-cyan-400/10 text-cyan-300"
                          }`}
                        >
                          {accessLabels[accessStatus]}
                        </span>
                        <span className="mt-1 block text-[10px] text-slate-600">
                          {approved
                            ? "View Details →"
                            : pending
                              ? "Waiting for approval"
                              : "Click to request →"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row">
              <p className="text-xs text-slate-400">
                Showing{" "}
                {(currentPage - 1) * PAGE_SIZE + 1}
                {" - "}
                {Math.min(
                  currentPage * PAGE_SIZE,
                  filteredOffers.length
                )}
                {" of "}
                {filteredOffers.length} offers
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  disabled={currentPage === 1}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  &larr; Previous
                </button>

                <span className="min-w-24 text-center text-xs font-bold text-cyan-300">
                  Page {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.min(totalPages, page + 1)
                    )
                  }
                  disabled={currentPage >= totalPages}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Next &rarr;
                </button>
              </div>
            </div>
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
              <p className="mb-2 inline-flex rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-300">
                {getOfferNumber(selectedOffer)}
              </p>

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

      {detailsOffer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="offer-details-title"
            className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-cyan-400/20 bg-slate-900 p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-cyan-400">
                  {getOfferNumber(detailsOffer)}
                </p>

                <h2
                  id="offer-details-title"
                  className="mt-1 text-xl font-black text-white"
                >
                  {detailsOffer.name}
                </h2>

                <p className="mt-1 break-all text-xs text-slate-500">
                  Offer ID: {detailsOffer.id}
                </p>
              </div>

              <button
                type="button"
                aria-label="Close offer details"
                onClick={() => setDetailsOffer(null)}
                className="rounded-lg bg-white/10 px-3 py-2 text-white"
              >
                &times;
              </button>
            </div>

            {detailsOffer.image_url && (
              <div className="mt-5 h-48 overflow-hidden rounded-xl border border-white/10 bg-slate-950">
                <img
                  src={detailsOffer.image_url}
                  alt={detailsOffer.name}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            {detailsOffer.description && (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-bold text-white">
                  Offer Description
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                  {detailsOffer.description}
                </p>
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-400">Payout</p>
                <p className="mt-1 font-bold text-emerald-400">
                  {detailsOffer.currency || "USD"}{" "}
                  {Number(detailsOffer.payout || 0).toFixed(2)}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-400">Country</p>
                <p className="mt-1 font-bold text-white">
                  {detailsOffer.country || "Worldwide"}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-400">Category</p>
                <p className="mt-1 font-bold text-white">
                  {detailsOffer.category || "General"}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
              <h3 className="font-bold text-cyan-300">
                Create New Sub ID
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                Create separate tracking IDs for different traffic sources.
              </p>

              <form
                className="mt-4 grid gap-3 sm:grid-cols-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void createOfferSubId();
                }}
              >
                <input
                  required
                  maxLength={80}
                  value={workerName}
                  onChange={(event) => setWorkerName(event.target.value)}
                  placeholder="Sub ID Name (e.g. Facebook Ads)"
                  className={formInput}
                />

                <input
                  required
                  maxLength={100}
                  value={workerSubId}
                  onChange={(event) => setWorkerSubId(event.target.value)}
                  placeholder="Sub ID (e.g. facebook01)"
                  className={formInput}
                />

                <button
                  type="submit"
                  disabled={workerCreating}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50 sm:col-span-2"
                >
                  {workerCreating ? "Creating..." : "+ Create Sub ID"}
                </button>
              </form>

              {workerMessage && (
                <p
                  role="status"
                  className="mt-3 break-words text-sm text-cyan-300"
                >
                  {workerMessage}
                </p>
              )}
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-white">
                  Sub ID Performance Report
                </h3>

                <button
                  type="button"
                  onClick={() => void loadOfferSubIds(detailsOffer)}
                  disabled={workersLoading}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-cyan-300 disabled:opacity-50"
                >
                  {workersLoading ? "Loading..." : "Refresh"}
                </button>
              </div>

              {workersLoading ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  Loading Sub ID report...
                </p>
              ) : offerWorkers.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-white/10 p-6 text-center">
                  <p className="font-bold text-slate-300">
                    No Sub IDs created yet
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Create your first Sub ID using the form above.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {offerWorkers.map((worker) => {
                    const report = offerWorkerRows.find(
                      (row) => row.sub_id === worker.sub_id
                    );

                    const clicks = Number(report?.clicks || 0);
                    const conversions = Number(
                      report?.conversions || 0
                    );
                    const earnings = Number(report?.earnings || 0);

                    const conversionRate =
                      clicks > 0
                        ? (conversions / clicks) * 100
                        : 0;

                    const trackingLink = getWorkerTrackingLink(
                      detailsOffer,
                      worker.sub_id
                    );

                    return (
                      <div
                        key={worker.id}
                        className="rounded-xl border border-white/10 bg-slate-950/60 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-white">
                              {worker.name}
                            </p>
                            <p className="mt-1 text-xs text-cyan-400">
                              Sub ID: {worker.sub_id}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              void copyWorkerLink(
                                detailsOffer,
                                worker.sub_id
                              )
                            }
                            className="rounded-lg bg-cyan-500 px-3 py-2 text-xs font-black text-slate-950"
                          >
                            {copiedWorkerId === worker.sub_id
                              ? "Copied!"
                              : "Copy Tracking Link"}
                          </button>
                        </div>

                        <input
                          readOnly
                          aria-label={`Tracking link for ${worker.sub_id}`}
                          value={trackingLink}
                          onFocus={(event) =>
                            event.currentTarget.select()
                          }
                          className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-400 outline-none"
                        />

                        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                          <div className="rounded-lg bg-white/5 p-3">
                            <p className="text-[10px] text-slate-500">
                              Clicks
                            </p>
                            <p className="mt-1 font-bold text-white">
                              {clicks}
                            </p>
                          </div>

                          <div className="rounded-lg bg-white/5 p-3">
                            <p className="text-[10px] text-slate-500">
                              Unique Clicks
                            </p>
                            <p className="mt-1 font-bold text-white">
                              {Number(report?.unique_clicks || 0)}
                            </p>
                          </div>

                          <div className="rounded-lg bg-white/5 p-3">
                            <p className="text-[10px] text-slate-500">
                              Conversions
                            </p>
                            <p className="mt-1 font-bold text-emerald-400">
                              {conversions}
                            </p>
                          </div>

                          <div className="rounded-lg bg-white/5 p-3">
                            <p className="text-[10px] text-slate-500">
                              Earnings
                            </p>
                            <p className="mt-1 font-bold text-emerald-400">
                              ${earnings.toFixed(2)}
                            </p>
                          </div>

                          <div className="rounded-lg bg-white/5 p-3">
                            <p className="text-[10px] text-slate-500">
                              Conv. Rate
                            </p>
                            <p className="mt-1 font-bold text-cyan-400">
                              {conversionRate.toFixed(2)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
