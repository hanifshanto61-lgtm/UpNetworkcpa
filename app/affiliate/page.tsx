"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Copy,
  Globe2,
  Laptop,
  Link2,
  LogOut,
  MessageCircle,
  MoreVertical,
  MousePointerClick,
  RefreshCw,
  Settings,
  Smartphone,
  Sparkles,
  Target,
  TrendingUp,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  affiliateId: string;
  email?: string | null;
  name?: string | null;
};

type ClickRow = {
  click_id: string;
  affiliate_id: string;
  smartlink_id?: string | null;
  country?: string | null;
  device?: string | null;
  browser?: string | null;
  referer?: string | null;
  status?: string | null;
  payout?: number | null;
  converted_at?: string | null;
  created_at: string;
};

type DailyStat = {
  date: string;
  label: string;
  clicks: number;
  conversions: number;
};

type RecentConversion = {
  clickId: string;
  country: string;
  payout: number;
  convertedAt: string;
};

type ClickStats = {
  today: number;
  yesterday: number;
  month: number;
  total: number;
  leads: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
  daily: DailyStat[];
  recentConversions: RecentConversion[];
};

type Manager = {
  id: string;
  telegram: string;
  telegramUrl: string;
};

const PANEL_MANAGERS: Manager[] = [
  {
    id: "manager-1",
    telegram: "@shuhag1133",
    telegramUrl: "https://t.me/shuhag1133",
  },
  {
    id: "manager-2",
    telegram: "@aminruhul9704",
    telegramUrl: "https://t.me/aminruhul9704",
  },
  {
    id: "manager-3",
    telegram: "@julianus9",
    telegramUrl: "https://t.me/julianus9",
  },
];

const emptyStats: ClickStats = {
  today: 0,
  yesterday: 0,
  month: 0,
  total: 0,
  leads: 0,
  conversions: 0,
  revenue: 0,
  conversionRate: 0,
  daily: [],
  recentConversions: [],
};

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date = new Date()) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  className,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  className: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 p-5 shadow-xl transition hover:-translate-y-1 hover:shadow-2xl ${className}`}
    >
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/10 blur-2xl" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-white/75">
            {title}
          </p>

          <h3 className="mt-3 text-3xl font-bold tracking-tight text-white">
            {value}
          </h3>

          <p className="mt-2 text-xs text-white/70">
            {subtitle}
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-white">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AffiliateDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ClickStats>(emptyStats);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const [error, setError] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);

  // ==================================================
  // LOAD DASHBOARD
  // ==================================================

  const loadDashboard = useCallback(async () => {
    try {
      setError("");

      if (!supabase) {
        throw new Error(
          "Supabase configuration is missing."
        );
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setLoading(false);
        setError("You are not logged in.");
        return;
      }

      // IMPORTANT:
      // Profile and clicks are now loaded through
      // the secure server API.
      const response = await fetch(
        "/api/affiliate/dashboard",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error(
          "Affiliate dashboard API error:",
          data
        );

        throw new Error(
          data?.error ||
            "Unable to load your affiliate profile."
        );
      }

      if (!data?.profile?.affiliateId) {
        throw new Error(
          "Affiliate ID is unavailable."
        );
      }

      // ==================================================
      // PROFILE
      // ==================================================

      const currentProfile: Profile = {
        id: data.profile.id,
        affiliateId: String(
          data.profile.affiliateId
        ),
        email: data.profile.email || null,
        name:
          data.profile.name ||
          data.profile.email?.split("@")[0] ||
          "Affiliate",
      };

      setProfile(currentProfile);

      // ==================================================
      // CLICKS
      // ==================================================

      const rows =
        (data.clicks || []) as ClickRow[];

      const now = new Date();

      const todayStart = startOfDay(now);
      const monthStart = startOfMonth(now);

      const yesterdayStart = new Date(
        todayStart
      );

      yesterdayStart.setDate(
        yesterdayStart.getDate() - 1
      );

      const today = rows.filter(
        (row) =>
          new Date(row.created_at) >=
          todayStart
      ).length;

      const yesterday = rows.filter((row) => {
        const date = new Date(
          row.created_at
        );

        return (
          date >= yesterdayStart &&
          date < todayStart
        );
      }).length;

      const month = rows.filter(
        (row) =>
          new Date(row.created_at) >=
          monthStart
      ).length;

      const total = rows.length;

      // ==================================================
      // CONVERSIONS
      // ==================================================

      const isConverted = (
        row: ClickRow
      ) => {
        const status =
          row.status?.toLowerCase();

        return (
          status === "converted" ||
          status === "conversion" ||
          Boolean(row.converted_at)
        );
      };

      const isLead = (
        row: ClickRow
      ) => {
        const status =
          row.status?.toLowerCase();

        return (
          status === "lead" ||
          status === "converted" ||
          status === "conversion" ||
          Boolean(row.converted_at)
        );
      };

      const conversions =
        rows.filter(isConverted).length;

      const leads =
        rows.filter(isLead).length;

      const revenue = rows.reduce(
        (sum, row) => {
          if (!isConverted(row)) {
            return sum;
          }

          return (
            sum +
            Number(row.payout || 0)
          );
        },
        0
      );

      const conversionRate =
        total > 0
          ? (conversions / total) * 100
          : 0;

      // ==================================================
      // LAST 7 DAYS
      // ==================================================

      const daily: DailyStat[] = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date();

        date.setHours(0, 0, 0, 0);

        date.setDate(
          date.getDate() - i
        );

        const nextDate =
          new Date(date);

        nextDate.setDate(
          nextDate.getDate() + 1
        );

        const dayRows = rows.filter(
          (row) => {
            const created =
              new Date(
                row.created_at
              );

            return (
              created >= date &&
              created < nextDate
            );
          }
        );

        daily.push({
          date: date.toISOString(),
          label:
            new Intl.DateTimeFormat(
              "en-US",
              {
                weekday: "short",
              }
            ).format(date),
          clicks: dayRows.length,
          conversions:
            dayRows.filter(
              isConverted
            ).length,
        });
      }

      // ==================================================
      // RECENT CONVERSIONS
      // ==================================================

      const recentConversions =
        rows
          .filter(isConverted)
          .slice(0, 8)
          .map((row) => ({
            clickId:
              row.click_id,
            country:
              row.country ||
              "Unknown",
            payout:
              Number(
                row.payout || 0
              ),
            convertedAt:
              row.converted_at ||
              row.created_at,
          }));

      setStats({
        today,
        yesterday,
        month,
        total,
        leads,
        conversions,
        revenue,
        conversionRate,
        daily,
        recentConversions,
      });
    } catch (err: any) {
      console.error(
        "Affiliate dashboard error:",
        err
      );

      setError(
        err?.message ||
          "Failed to load dashboard."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ==================================================
  // INITIAL LOAD
  // ==================================================

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // ==================================================
  // CLOSE 3-DOT MENU OUTSIDE CLICK
  // ==================================================

  useEffect(() => {
    const handleClick = (
      event: MouseEvent
    ) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node
        )
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClick
      );
    };
  }, []);

  // ==================================================
  // SMARTLINK
  // ==================================================

  const smartlink = useMemo(() => {
    if (
      typeof window === "undefined" ||
      !profile?.affiliateId
    ) {
      return "";
    }

    const url = new URL(
      "/api/track",
      window.location.origin
    );

    url.searchParams.set(
      "aid",
      profile.affiliateId
    );

    url.searchParams.set(
      "sl",
      "default-smartlink"
    );

    return url.toString();
  }, [profile]);

  // ==================================================
  // COPY SMARTLINK
  // ==================================================

  const copySmartlink =
    async () => {
      if (!smartlink) return;

      try {
        await navigator.clipboard.writeText(
          smartlink
        );

        setCopied(true);

        setTimeout(() => {
          setCopied(false);
        }, 2000);
      } catch (err) {
        console.error(
          "Copy failed:",
          err
        );
      }
    };

  // ==================================================
  // LOGOUT
  // ==================================================

  const handleLogout =
    async () => {
      try {
        setLoggingOut(true);
        setMenuOpen(false);

        if (supabase) {
          await supabase.auth.signOut();
        }

        window.location.href =
          "/login";
      } catch (err) {
        console.error(
          "Logout error:",
          err
        );

        setLoggingOut(false);
        setError(
          "Logout failed. Please try again."
        );
      }
    };

  const maxClicks =
    Math.max(
      ...stats.daily.map(
        (item) => item.clicks
      ),
      1
    );

  // ==================================================
  // LOADING SCREEN
  // ==================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse space-y-6">

            <div className="h-32 rounded-3xl bg-white/5" />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map(
                (item) => (
                  <div
                    key={item}
                    className="h-36 rounded-2xl bg-white/5"
                  />
                )
              )}
            </div>

            <div className="h-96 rounded-3xl bg-white/5" />

          </div>
        </div>
      </div>
    );
  }

  // ==================================================
  // MAIN DASHBOARD
  // ==================================================

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-900">

      <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">

        {/* =================================================
            TOP BAR
        ================================================= */}

        <header className="relative z-50 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg">
              <Zap size={20} />
            </div>

            <div>
              <p className="text-sm font-bold">
                UpNetwork CPA
              </p>

              <p className="text-[11px] text-slate-500">
                Affiliate Panel
              </p>
            </div>

          </div>

          {/* =================================================
              3 DOT MENU
          ================================================= */}

          <div
            ref={menuRef}
            className="relative"
          >

            <button
              type="button"
              onClick={() =>
                setMenuOpen(
                  (value) =>
                    !value
                )
              }
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
              aria-label="Account menu"
            >
              <MoreVertical
                size={21}
              />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-14 w-[290px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

                {/* ACCOUNT HEADER */}

                <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 p-4 text-white">

                  <div className="flex items-center gap-3">

                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-lg font-bold">
                      {(
                        profile?.name ||
                        "A"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0">

                      <p className="truncate text-sm font-bold">
                        {profile?.name ||
                          "Affiliate"}
                      </p>

                      <p className="truncate text-xs text-blue-200">
                        {profile?.email ||
                          "Affiliate Account"}
                      </p>

                      <span className="mt-1 inline-block rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                        ● Online
                      </span>

                    </div>

                  </div>
                </div>

                {/* MENU */}

                <div className="p-2">

                  <button
                    type="button"
                    onClick={() =>
                      setMenuOpen(false)
                    }
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-slate-50"
                  >

                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <User size={17} />
                    </span>

                    <span>
                      <span className="block text-sm font-semibold">
                        My Account
                      </span>

                      <span className="block text-xs text-slate-500">
                        Affiliate ID:{" "}
                        {profile?.affiliateId ||
                          "Loading..."}
                      </span>
                    </span>

                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setManagerOpen(true);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-slate-50"
                  >

                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <MessageCircle
                        size={17}
                      />
                    </span>

                    <span>
                      <span className="block text-sm font-semibold">
                        Contact Manager
                      </span>

                      <span className="block text-xs text-slate-500">
                        Telegram support
                      </span>
                    </span>

                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setMenuOpen(false)
                    }
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-slate-50"
                  >

                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <Settings size={17} />
                    </span>

                    <span>
                      <span className="block text-sm font-semibold">
                        Settings
                      </span>

                      <span className="block text-xs text-slate-500">
                        Account settings
                      </span>
                    </span>

                  </button>

                  <div className="my-2 border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >

                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                      <LogOut size={17} />
                    </span>

                    <span>
                      <span className="block text-sm font-semibold">
                        {loggingOut
                          ? "Logging out..."
                          : "Logout"}
                      </span>

                      <span className="block text-xs text-red-400">
                        Sign out of your account
                      </span>
                    </span>

                  </button>

                </div>
              </div>
            )}
          </div>
        </header>

        {/* =================================================
            HERO
        ================================================= */}

        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 p-6 text-white shadow-2xl md:p-8">

          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />

          <div className="relative">

            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium">
              <Sparkles size={14} />
              Affiliate Dashboard
            </div>

            <h1 className="text-3xl font-bold md:text-4xl">
              Welcome back,{" "}
              {profile?.name ||
                "Affiliate"}{" "}
              👋
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 md:text-base">
              Track your traffic, leads,
              conversions and earnings
              from one place.
            </p>

            <button
              type="button"
              onClick={() => {
                setRefreshing(true);
                loadDashboard();
              }}
              disabled={refreshing}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-slate-900 shadow-lg hover:bg-blue-50 disabled:opacity-60"
            >
              <RefreshCw
                size={17}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>

          </div>
        </section>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* =================================================
            STATS
        ================================================= */}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

          <StatCard
            title="Total Clicks"
            value={formatNumber(
              stats.total
            )}
            subtitle={`${formatNumber(
              stats.today
            )} today`}
            icon={
              <MousePointerClick
                size={23}
              />
            }
            className="bg-gradient-to-br from-blue-500 to-cyan-500"
          />

          <StatCard
            title="Leads"
            value={formatNumber(
              stats.leads
            )}
            subtitle="Qualified actions"
            icon={
              <Users size={23} />
            }
            className="bg-gradient-to-br from-emerald-500 to-teal-500"
          />

          <StatCard
            title="Conversions"
            value={formatNumber(
              stats.conversions
            )}
            subtitle={`${stats.conversionRate.toFixed(
              2
            )}% conversion rate`}
            icon={
              <Target size={23} />
            }
            className="bg-gradient-to-br from-violet-500 to-purple-600"
          />

          <StatCard
            title="Revenue"
            value={formatMoney(
              stats.revenue
            )}
            subtitle="Total earnings"
            icon={
              <CircleDollarSign
                size={23}
              />
            }
            className="bg-gradient-to-br from-orange-500 to-amber-500"
          />

        </section>

        {/* =================================================
            PERFORMANCE + SMARTLINK
        ================================================= */}

        <section className="grid gap-6 lg:grid-cols-3">

          {/* PERFORMANCE */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">

            <div className="flex items-center gap-2">

              <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                <BarChart3 size={19} />
              </div>

              <div>
                <h2 className="font-bold">
                  Performance
                </h2>

                <p className="text-sm text-slate-500">
                  Last 7 days
                </p>
              </div>

            </div>

            <div className="mt-8 flex h-64 items-end gap-2 md:gap-4">

              {stats.daily.map(
                (item) => {
                  const height =
                    Math.max(
                      (item.clicks /
                        maxClicks) *
                        100,
                      item.clicks > 0
                        ? 8
                        : 2
                    );

                  return (
                    <div
                      key={item.date}
                      className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                    >

                      <div className="flex h-full w-full items-end justify-center">

                        <div className="relative h-full w-full max-w-14">

                          <div
                            className="absolute bottom-0 w-full rounded-t-xl bg-gradient-to-t from-blue-600 to-cyan-400 transition-all"
                            style={{
                              height: `${height}%`,
                            }}
                          >

                            <div className="absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[10px] text-white group-hover:block">
                              {item.clicks} clicks
                            </div>

                          </div>

                        </div>

                      </div>

                      <span className="text-xs text-slate-400">
                        {item.label}
                      </span>

                    </div>
                  );
                }
              )}

            </div>

            <div className="mt-5 flex items-center gap-5 border-t border-slate-100 pt-4 text-xs text-slate-500">

              <span>
                Today:{" "}
                <b>
                  {formatNumber(
                    stats.today
                  )}
                </b>
              </span>

              <span>
                Month:{" "}
                <b>
                  {formatNumber(
                    stats.month
                  )}
                </b>
              </span>

            </div>

          </div>

          {/* SMARTLINK */}

          <div className="rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-5 text-white shadow-xl">

            <div className="flex items-center gap-2">

              <div className="rounded-lg bg-white/15 p-2">
                <Link2 size={20} />
              </div>

              <h2 className="font-bold">
                Smartlink
              </h2>

            </div>

            <p className="mt-4 text-sm leading-6 text-purple-100">
              Your personal smartlink
              is ready.
            </p>

            <div className="mt-5 rounded-xl bg-black/15 p-3">

              {smartlink ? (
                <p className="break-all text-xs leading-5">
                  {smartlink}
                </p>
              ) : (
                <p className="text-sm text-red-100">
                  Affiliate ID is unavailable.
                </p>
              )}

            </div>

            <button
              type="button"
              onClick={copySmartlink}
              disabled={!smartlink}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-purple-700 disabled:opacity-50"
            >

              {copied ? (
                <>
                  <CheckCircle2
                    size={17}
                  />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={17} />
                  Copy Smartlink
                </>
              )}

            </button>

            <div className="mt-5 grid grid-cols-2 gap-3">

              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-xs text-purple-100">
                  Clicks
                </p>

                <p className="mt-1 text-xl font-bold">
                  {formatNumber(
                    stats.total
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-xs text-purple-100">
                  Conversions
                </p>

                <p className="mt-1 text-xl font-bold">
                  {formatNumber(
                    stats.conversions
                  )}
                </p>
              </div>

            </div>
          </div>

        </section>

        {/* =================================================
            RECENT CONVERSIONS
        ================================================= */}

        <section className="grid gap-6 lg:grid-cols-3">

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">

            <div className="border-b border-slate-100 p-5">

              <div className="flex items-center gap-2">

                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                  <CheckCircle2
                    size={19}
                  />
                </div>

                <h2 className="font-bold">
                  Recent Conversions
                </h2>

              </div>

              <p className="mt-1 text-sm text-slate-500">
                Latest conversion activity
              </p>

            </div>

            {stats.recentConversions
              .length === 0 ? (

              <div className="flex min-h-52 flex-col items-center justify-center p-6 text-center">

                <div className="rounded-full bg-slate-100 p-4 text-slate-400">
                  <Activity size={25} />
                </div>

                <h3 className="mt-3 font-semibold">
                  No conversions yet
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Your conversions will
                  appear here.
                </p>

              </div>

            ) : (

              <div className="divide-y divide-slate-100">

                {stats.recentConversions.map(
                  (conversion) => (
                    <div
                      key={
                        conversion.clickId
                      }
                      className="flex items-center justify-between gap-4 p-4"
                    >

                      <div className="flex min-w-0 items-center gap-3">

                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                          <CheckCircle2
                            size={18}
                          />
                        </div>

                        <div className="min-w-0">

                          <p className="truncate text-sm font-semibold">
                            {
                              conversion.clickId
                            }
                          </p>

                          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">

                            <Globe2
                              size={12}
                            />

                            {
                              conversion.country
                            }

                            <span>
                              •
                            </span>

                            <Clock3
                              size={12}
                            />

                            {formatDate(
                              conversion.convertedAt
                            )}

                          </div>

                        </div>
                      </div>

                      <div className="shrink-0 text-right">

                        <p className="font-bold text-emerald-600">
                          +
                          {formatMoney(
                            conversion.payout
                          )}
                        </p>

                        <p className="text-xs text-slate-400">
                          Conversion
                        </p>

                      </div>

                    </div>
                  )
                )}

              </div>
            )}

          </div>

          {/* TRAFFIC */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center gap-2">

              <div className="rounded-lg bg-orange-50 p-2 text-orange-600">
                <Globe2 size={19} />
              </div>

              <div>
                <h2 className="font-bold">
                  Traffic Overview
                </h2>

                <p className="text-xs text-slate-500">
                  Traffic tracking
                </p>
              </div>

            </div>

            <div className="mt-6 space-y-3">

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">

                <div className="flex items-center gap-3">

                  <Globe2
                    size={18}
                    className="text-blue-600"
                  />

                  <span className="text-sm font-semibold">
                    GEO Tracking
                  </span>

                </div>

                <span className="text-xs font-bold text-emerald-600">
                  Live
                </span>

              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">

                <div className="flex items-center gap-3">

                  <Smartphone
                    size={18}
                    className="text-violet-600"
                  />

                  <span className="text-sm font-semibold">
                    Mobile
                  </span>

                </div>

                <span className="text-xs font-bold text-emerald-600">
                  Live
                </span>

              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">

                <div className="flex items-center gap-3">

                  <Laptop
                    size={18}
                    className="text-emerald-600"
                  />

                  <span className="text-sm font-semibold">
                    Desktop
                  </span>

                </div>

                <span className="text-xs font-bold text-emerald-600">
                  Live
                </span>

              </div>

            </div>
          </div>

        </section>

        {/* =================================================
            QUICK ACTIONS
        ================================================= */}

        <section>

          <div className="mb-4 flex items-center gap-2">

            <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
              <Zap size={18} />
            </div>

            <div>
              <h2 className="font-bold">
                Quick Actions
              </h2>

              <p className="text-xs text-slate-500">
                Manage your affiliate activity
              </p>
            </div>

          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <Link
              href="/affiliate/offers"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >

              <Target
                size={22}
                className="text-blue-600"
              />

              <h3 className="mt-4 font-semibold">
                Browse Offers
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Find offers and start promoting.
              </p>

            </Link>

            <button
              type="button"
              onClick={copySmartlink}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >

              <Link2
                size={22}
                className="text-violet-600"
              />

              <h3 className="mt-4 font-semibold">
                Smartlinks
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Copy your affiliate smartlink.
              </p>

            </button>

            <button
              type="button"
              onClick={() =>
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                })
              }
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >

              <BarChart3
                size={22}
                className="text-emerald-600"
              />

              <h3 className="mt-4 font-semibold">
                Statistics
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Analyze performance.
              </p>

            </button>

            <button
              type="button"
              onClick={() =>
                setManagerOpen(true)
              }
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >

              <MessageCircle
                size={22}
                className="text-orange-600"
              />

              <h3 className="mt-4 font-semibold">
                Contact Manager
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Contact a panel manager.
              </p>

            </button>

          </div>
        </section>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-xs text-slate-500 shadow-sm sm:flex-row sm:items-center">

          <div className="flex items-center gap-2">

            <span className="h-2 w-2 rounded-full bg-emerald-500" />

            Dashboard connected to live affiliate data

          </div>

          <div className="flex items-center gap-2">

            <TrendingUp size={14} />

            Conversion Rate:

            <span className="font-semibold text-slate-700">
              {stats.conversionRate.toFixed(
                2
              )}
              %
            </span>

          </div>

        </div>

      </main>

      {/* =================================================
          MANAGER MODAL
      ================================================= */}

      {managerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">

          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">

            <div className="flex items-center justify-between bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 p-5 text-white">

              <div>

                <div className="flex items-center gap-2">

                  <MessageCircle
                    size={20}
                  />

                  <h2 className="font-bold">
                    Contact Manager
                  </h2>

                </div>

                <p className="mt-1 text-xs text-blue-200">
                  Choose a panel manager
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setManagerOpen(false)
                }
                className="rounded-xl p-2 hover:bg-white/10"
              >
                <X size={20} />
              </button>

            </div>

            <div className="space-y-3 p-5">

              {PANEL_MANAGERS.map(
                (manager) => (
                  <a
                    key={manager.id}
                    href={
                      manager.telegramUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50"
                  >

                    <div className="flex items-center gap-3">

                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-600">
                        <MessageCircle
                          size={19}
                        />
                      </div>

                      <div>

                        <p className="text-sm font-bold">
                          Panel Manager
                        </p>

                        <p className="text-xs text-slate-500">
                          {manager.telegram}
                        </p>

                      </div>

                    </div>

                    <ChevronRight
                      size={18}
                      className="text-slate-400"
                    />

                  </a>
                )
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
