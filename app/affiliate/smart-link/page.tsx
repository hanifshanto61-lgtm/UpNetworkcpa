"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Link2,
  Copy,
  Check,
  ExternalLink,
  Search,
  RefreshCw,
  MousePointerClick,
  TrendingUp,
  DollarSign,
  Target,
  ShieldCheck,
  AlertCircle,
  Sun,
  Moon,
  Zap,
  Globe,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAffiliateTheme } from "../theme-context";

type Offer = {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  country?: string | null;
  payout?: number | string | null;
  status?: string | null;
};

type Stats = {
  totalClicks: number;
  conversions: number;
  earnings: number;
};

export default function SmartLinksPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useAffiliateTheme();

  const dark = theme === "dark";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [affiliateId, setAffiliateId] = useState("");
  const [affiliateName, setAffiliateName] = useState("");

  const [offers, setOffers] = useState<Offer[]>([]);
  const [search, setSearch] = useState("");

  const [copiedId, setCopiedId] = useState("");
  const [origin, setOrigin] = useState("");

  const [stats, setStats] = useState<Stats>({
    totalClicks: 0,
    conversions: 0,
    earnings: 0,
  });

  const pageBg = dark
    ? "bg-[#05070c] text-white"
    : "bg-slate-50 text-slate-900";

  const cardBg = dark
    ? "bg-[#0b1020] border-white/10"
    : "bg-white border-slate-200";

  const muted = dark
    ? "text-slate-400"
    : "text-slate-500";

  const inputStyle = dark
    ? "bg-[#080c17] border-white/10 text-white placeholder:text-slate-600"
    : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400";

  const loadData = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        if (!supabase) {
          throw new Error(
            "Supabase client is not configured."
          );
        }

        const {
          data: sessionData,
          error: sessionError,
        } = await supabase.auth.getSession();

        const session = sessionData.session;

        if (sessionError || !session?.access_token) {
          router.replace("/login");
          return;
        }

        const headers = {
          Authorization:
            `Bearer ${session.access_token}`,
        };

        const dashboardResponse = await fetch(
          "/api/affiliate/dashboard",
          {
            method: "GET",
            headers,
            cache: "no-store",
          }
        );

        const dashboardResult =
          await dashboardResponse.json();

        if (!dashboardResponse.ok) {
          throw new Error(
            dashboardResult?.error ||
              "Unable to load affiliate dashboard."
          );
        }

        const profile =
          dashboardResult?.profile || {};

        const id = String(
          profile.affiliateId ||
          profile.affiliate_id ||
          ""
        ).trim();

        if (!id) {
          throw new Error(
            "Affiliate ID is unavailable."
          );
        }

        setAffiliateId(id);

        setAffiliateName(
          String(
            profile.name ||
            profile.full_name ||
            "Affiliate"
          )
        );

        setStats({
          totalClicks: Number(
            dashboardResult?.stats?.totalClicks || 0
          ),
          conversions: Number(
            dashboardResult?.stats?.conversions || 0
          ),
          earnings: Number(
            dashboardResult?.stats?.earnings || 0
          ),
        });

        const offersResponse = await fetch(
          "/api/affiliate/offers",
          {
            method: "GET",
            headers,
            cache: "no-store",
          }
        );

        const offersResult =
          await offersResponse.json();

        if (!offersResponse.ok) {
          throw new Error(
            offersResult?.message ||
              offersResult?.error ||
              "Unable to load offers."
          );
        }

        const activeOffers = (
          Array.isArray(offersResult?.offers)
            ? offersResult.offers
            : []
        ).filter(
          (offer: Offer) =>
            !offer.status ||
            offer.status.toLowerCase() === "active"
        );

        setOffers(activeOffers);
      } catch (err) {
        console.error(
          "Smart Links loading error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load Smart Links."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    setOrigin(window.location.origin);
    void loadData();
  }, [loadData]);

  const smartLink = useMemo(() => {
    if (!origin || !affiliateId) return "";

    const params = new URLSearchParams({
      aid: affiliateId,
      sl: "default-smartlink",
    });

    return `${origin}/api/track?${params.toString()}`;
  }, [origin, affiliateId]);

  const getOfferLink = useCallback(
    (offerId: string) => {
      if (!origin || !affiliateId) return "";

      const params = new URLSearchParams({
        aid: affiliateId,
        offerId,
      });

      return `${origin}/api/track?${params.toString()}`;
    },
    [origin, affiliateId]
  );

  const filteredOffers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return offers;

    return offers.filter((offer) => {
      return (
        offer.name.toLowerCase().includes(query) ||
        (offer.category || "")
          .toLowerCase()
          .includes(query) ||
        (offer.country || "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [offers, search]);

  async function copyLink(
    link: string,
    id: string
  ) {
    if (!link) {
      setError(
        "Tracking link is unavailable."
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(id);
      setError("");

      window.setTimeout(() => {
        setCopiedId((current) =>
          current === id ? "" : current
        );
      }, 2000);
    } catch {
      setError(
        "Unable to copy link. Please try again."
      );
    }
  }

  function openLink(link: string) {
    if (!link) return;

    window.open(
      link,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function money(value: number) {
    return `$${value.toFixed(2)}`;
  }

  if (loading) {
    return (
      <main
        className={`flex min-h-screen items-center justify-center ${pageBg}`}
      >
        <div className="text-center">
          <div className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />
          <p className={muted}>
            Loading Smart Links...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      className={`min-h-screen transition-colors duration-300 ${pageBg}`}
    >
      {/* Header */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-xl ${
          dark
            ? "border-white/10 bg-[#05070c]/95"
            : "border-slate-200 bg-white/95"
        }`}
      >
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                router.push("/affiliate")
              }
              className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                dark
                  ? "border-white/10 bg-white/5 hover:bg-white/10"
                  : "border-slate-200 bg-slate-50 hover:bg-slate-100"
              }`}
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={19} />
            </button>

            <div>
              <h1 className="text-xl font-black sm:text-2xl">
                Smart Links
              </h1>
              <p className={`text-xs ${muted}`}>
                UpNetwork CPA Affiliate Panel
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleTheme()}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                dark
                  ? "border-white/10 bg-white/5 text-amber-300"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
              aria-label="Toggle theme"
            >
              {dark ? (
                <Sun size={18} />
              ) : (
                <Moon size={18} />
              )}
            </button>

            <button
              type="button"
              onClick={() => void loadData(true)}
              disabled={refreshing}
              className="flex h-10 items-center gap-2 rounded-xl bg-cyan-500 px-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={
                  refreshing ? "animate-spin" : ""
                }
              />
              <span className="hidden sm:inline">
                Refresh
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6">
        {/* Welcome */}
        <section
          className={`relative mb-7 overflow-hidden rounded-3xl border p-6 sm:p-8 ${
            dark
              ? "border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-[#0b1020] to-purple-500/10"
              : "border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-purple-50"
          }`}
        >
          <div className="relative z-10">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-500">
              <Zap size={14} />
              Affiliate Tracking Center
            </div>

            <h2 className="text-2xl font-black sm:text-3xl">
              Your Smart Links
            </h2>

            <p
              className={`mt-2 max-w-2xl text-sm leading-6 ${muted}`}
            >
              Welcome, {affiliateName}. Copy your
              tracking links, promote approved offers,
              and monitor your affiliate performance.
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2">
              <ShieldCheck
                size={16}
                className="text-cyan-400"
              />
              <span className="text-xs font-semibold">
                Affiliate ID:
              </span>
              <span className="font-mono text-xs font-bold text-cyan-500">
                {affiliateId}
              </span>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            <AlertCircle
              size={20}
              className="shrink-0"
            />
            <span>{error}</span>
          </div>
        )}

        {/* Stats */}
        <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-blue-400">
                Total Clicks
              </p>
              <MousePointerClick
                size={20}
                className="text-blue-400"
              />
            </div>
            <p className="text-3xl font-black">
              {stats.totalClicks.toLocaleString()}
            </p>
            <p className={`mt-2 text-xs ${muted}`}>
              All affiliate tracking clicks
            </p>
          </div>

          <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-purple-400">
                Conversions
              </p>
              <TrendingUp
                size={20}
                className="text-purple-400"
              />
            </div>
            <p className="text-3xl font-black">
              {stats.conversions.toLocaleString()}
            </p>
            <p className={`mt-2 text-xs ${muted}`}>
              Recorded conversions
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-emerald-400">
                Earnings
              </p>
              <DollarSign
                size={20}
                className="text-emerald-400"
              />
            </div>
            <p className="text-3xl font-black">
              {money(stats.earnings)}
            </p>
            <p className={`mt-2 text-xs ${muted}`}>
              Dashboard reported earnings
            </p>
          </div>
        </div>

        {/* Default Smart Link */}
        <section
          className={`mb-7 rounded-3xl border p-5 sm:p-7 ${cardBg}`}
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400">
                <Link2 size={24} />
              </div>

              <div>
                <h3 className="text-lg font-black">
                  Default Smart Link
                </h3>
                <p className={`text-xs ${muted}`}>
                  Your personal affiliate Smart Link
                </p>
              </div>
            </div>

            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
              Generated
            </span>
          </div>

          <p className={`mb-3 text-sm ${muted}`}>
            Copy this link to use the configured
            default Smart Link destination.
          </p>

          <div
            className={`mb-4 break-all rounded-xl border p-4 font-mono text-xs leading-6 ${
              dark
                ? "border-white/10 bg-black/20 text-cyan-300"
                : "border-slate-200 bg-slate-50 text-cyan-700"
            }`}
          >
            {smartLink || "Tracking link unavailable"}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                void copyLink(
                  smartLink,
                  "default"
                )
              }
              disabled={!smartLink}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
            >
              {copiedId === "default" ? (
                <Check size={17} />
              ) : (
                <Copy size={17} />
              )}

              {copiedId === "default"
                ? "Copied!"
                : "Copy Smart Link"}
            </button>

            <button
              type="button"
              onClick={() =>
                openLink(smartLink)
              }
              disabled={!smartLink}
              className={`inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition disabled:opacity-50 ${
                dark
                  ? "border-white/10 bg-white/5 hover:bg-white/10"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <ExternalLink size={17} />
              Open Link
            </button>
          </div>

          <p className={`mt-4 text-xs leading-5 ${muted}`}>
            The default Smart Link works when an
            active destination is configured.
            Opening the link records a click.
            Only use it for permitted testing
            or genuine traffic.
          </p>
        </section>

        {/* Offer Tracking Links */}
        <section
          className={`rounded-3xl border p-5 sm:p-7 ${cardBg}`}
        >
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Target
                  size={21}
                  className="text-purple-400"
                />
                <h3 className="text-lg font-black">
                  Offer Tracking Links
                </h3>
              </div>

              <p className={`text-sm ${muted}`}>
                Copy the unique tracking link
                for each available offer.
              </p>
            </div>

            <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 px-4 py-2 text-sm font-bold text-purple-400">
              {offers.length} Active Offers
            </div>
          </div>

          <div className="relative mb-6">
            <Search
              size={19}
              className={`absolute left-4 top-1/2 -translate-y-1/2 ${muted}`}
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search offers by name, category or country..."
              className={`w-full rounded-xl border py-3 pl-12 pr-4 text-sm outline-none transition focus:border-cyan-400 ${inputStyle}`}
            />
          </div>

          {filteredOffers.length === 0 ? (
            <div
              className={`rounded-2xl border border-dashed p-10 text-center ${
                dark
                  ? "border-white/10"
                  : "border-slate-200"
              }`}
            >
              <Target
                size={34}
                className="mx-auto mb-3 text-slate-500"
              />
              <h4 className="font-bold">
                No offers found
              </h4>
              <p className={`mt-2 text-sm ${muted}`}>
                {search
                  ? "Try another search keyword."
                  : "No active offers are available yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOffers.map((offer) => {
                const link = getOfferLink(
                  offer.id
                );

                const copied =
                  copiedId === offer.id;

                return (
                  <article
                    key={offer.id}
                    className={`rounded-2xl border p-4 sm:p-5 ${
                      dark
                        ? "border-white/10 bg-white/[0.025]"
                        : "border-slate-200 bg-slate-50/70"
                    }`}
                  >
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-base font-bold">
                          {offer.name}
                        </h4>

                        {offer.description && (
                          <p
                            className={`mt-2 line-clamp-2 text-xs leading-5 ${muted}`}
                          >
                            {offer.description}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                          {offer.category && (
                            <span className="rounded-lg border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-xs text-purple-400">
                              {offer.category}
                            </span>
                          )}

                          {offer.country && (
                            <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs ${
                              dark
                                ? "border-white/10 text-slate-300"
                                : "border-slate-200 text-slate-600"
                            }`}>
                              <Globe size={12} />
                              {offer.country}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                          Payout
                        </p>
                        <p className="text-lg font-black text-emerald-400">
                          {money(
                            Number(offer.payout || 0)
                          )}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`mb-4 break-all rounded-xl border p-3 font-mono text-xs leading-5 ${
                        dark
                          ? "border-white/10 bg-black/20 text-slate-300"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {link}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void copyLink(
                            link,
                            offer.id
                          )
                        }
                        disabled={!link}
                        className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                      >
                        {copied ? (
                          <Check size={15} />
                        ) : (
                          <Copy size={15} />
                        )}

                        {copied
                          ? "Copied!"
                          : "Copy Link"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openLink(link)
                        }
                        disabled={!link}
                        className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold disabled:opacity-50 ${
                          dark
                            ? "border-white/10 hover:bg-white/10"
                            : "border-slate-200 hover:bg-white"
                        }`}
                      >
                        <ExternalLink size={15} />
                        Open Offer
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Footer */}
        <div
          className={`mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-5 text-xs ${
            dark
              ? "border-white/10 text-slate-500"
              : "border-slate-200 text-slate-500"
          }`}
        >
          <p>
            © UpNetwork CPA — Affiliate Smart Links
          </p>

          <button
            type="button"
            onClick={() =>
              router.push("/affiliate")
            }
            className="inline-flex items-center gap-2 font-semibold text-cyan-500 hover:text-cyan-400"
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </button>
        </div>
      </div>
    </main>
  );
}