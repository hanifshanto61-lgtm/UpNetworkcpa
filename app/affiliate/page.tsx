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
  Wallet,
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
  name: string;
  telegram: string;
  telegramUrl: string;
  role: string;
};

const PANEL_MANAGERS: Manager[] = [
  {
    id: "manager-1",
    name: "Panel Manager",
    telegram: "@shuhag1133",
    telegramUrl: "https://t.me/shuhag1133",
    role: "Panel Manager",
  },
  {
    id: "manager-2",
    name: "Panel Manager",
    telegram: "@aminruhul9704",
    telegramUrl: "https://t.me/aminruhul9704",
    role: "Panel Manager",
  },
  {
    id: "manager-3",
    name: "Panel Manager",
    telegram: "@julianus9",
    telegramUrl: "https://t.me/julianus9",
    role: "Panel Manager",
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
  iconClassName,
  trend,
  prefix,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  className: string;
  iconClassName: string;
  trend?: string;
  prefix?: string;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-white/10 p-5 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${className}`}
    >
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/10 blur-2xl" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-white/75">{title}</p>

          <div className="mt-3 flex items-baseline gap-1">
            {prefix && (
              <span className="text-xl font-bold text-white/80">
                {prefix}
              </span>
            )}

            <h3 className="text-3xl font-bold tracking-tight text-white">
              {value}
            </h3>
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs text-white/70">
            {trend && (
              <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
                <ArrowUpRight size={12} />
                {trend}
              </span>
            )}

            <span>{subtitle}</span>
          </div>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 shadow-inner ${iconClassName}`}
        >
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

  const loadDashboard = useCallback(async () => {
    try {
      setError("");

      if (!supabase) {
        throw new Error(
          "Supabase configuration is missing. Please contact the administrator."
        );
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        setError("You are not logged in.");
        return;
      }

      // ==========================================
      // LOAD PROFILE
      // ==========================================

      const { data: affiliateProfile, error: profileError } =
        await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        console.error("Profile loading error:", profileError);

        throw new Error("Unable to load your affiliate profile.");
      }

      if (!affiliateProfile) {
        throw new Error(
          "Your affiliate profile does not exist in the profiles table."
        );
      }

      // ==========================================
      // FIND AFFILIATE ID
      // ==========================================

      let affiliateId =
        affiliateProfile.affiliate_id ||
        affiliateProfile.affiliateId ||
        affiliateProfile.affiliate_code ||
        affiliateProfile.code ||
        "";

      // ==========================================
      // CREATE AFFILIATE ID IF MISSING
      // ==========================================

      if (!affiliateId) {
        const generatedAffiliateId = `UP${user.id
          .replace(/-/g, "")
          .slice(0, 10)
          .toUpperCase()}`;

        const { data: updatedProfile, error: updateError } =
          await supabase
            .from("profiles")
            .update({
              affiliate_id: generatedAffiliateId,
            })
            .eq("id", user.id)
            .select("*")
            .maybeSingle();

        if (updateError) {
          console.error(
            "Affiliate ID creation error:",
            updateError
          );

          throw new Error(
            "Affiliate ID could not be created. Please check the profiles table update permission in Supabase."
          );
        }

        affiliateId =
          updatedProfile?.affiliate_id ||
          generatedAffiliateId;
      }

      affiliateId = String(affiliateId).trim();

      if (!affiliateId) {
        throw new Error("Affiliate ID is still unavailable.");
      }

      const affiliateName =
        affiliateProfile.full_name ||
        affiliateProfile.name ||
        user.email?.split("@")[0] ||
        "Affiliate";

      const currentProfile: Profile = {
        id: user.id,
        affiliateId,
        email: user.email,
        name: affiliateName,
      };

      setProfile(currentProfile);

      // ==========================================
      // LOAD CLICKS
      // ==========================================

      const { data: clicks, error: clicksError } = await supabase
        .from("clicks")
        .select(
          "click_id, affiliate_id, smartlink_id, country, device, browser, referer, status, payout, converted_at, created_at"
        )
        .eq("affiliate_id", affiliateId)
        .order("created_at", {
          ascending: false,
        });

      if (clicksError) {
        console.error("Clicks loading error:", clicksError);

        throw new Error("Unable to load click statistics.");
      }

      const rows = (clicks || []) as ClickRow[];

      // ==========================================
      // DATE RANGES
      // ==========================================

      const now = new Date();
      const todayStart = startOfDay(now);

      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);

      const monthStart = startOfMonth(now);

      // ==========================================
      // BASIC STATS
      // ==========================================

      const today = rows.filter(
        (row) => new Date(row.created_at) >= todayStart
      ).length;

      const yesterday = rows.filter((row) => {
        const date = new Date(row.created_at);

        return date >= yesterdayStart && date < todayStart;
      }).length;

      const month = rows.filter(
        (row) => new Date(row.created_at) >= monthStart
      ).length;

      const total = rows.length;

      // ==========================================
      // CONVERSION DETECTION
      // ==========================================

      const isConverted = (row: ClickRow) => {
        const status = row.status?.toLowerCase();

        return (
          status === "converted" ||
          status === "conversion" ||
          Boolean(row.converted_at)
        );
      };

      const isLead = (row: ClickRow) => {
        const status = row.status?.toLowerCase();

        return (
          status === "lead" ||
          status === "converted" ||
          status === "conversion" ||
          Boolean(row.converted_at)
        );
      };

      const conversions = rows.filter(isConverted).length;
      const leads = rows.filter(isLead).length;

      const revenue = rows.reduce((sum, row) => {
        if (!isConverted(row)) {
          return sum;
        }

        return sum + Number(row.payout || 0);
      }, 0);

      const conversionRate =
        total > 0 ? (conversions / total) * 100 : 0;

      // ==========================================
      // LAST 7 DAYS
      // ==========================================

      const daily: DailyStat[] = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date();

        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - i);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const dayRows = rows.filter((row) => {
          const created = new Date(row.created_at);

          return created >= date && created < nextDate;
        });

        daily.push({
          date: date.toISOString(),
          label: new Intl.DateTimeFormat("en-US", {
            weekday: "short",
          }).format(date),
          clicks: dayRows.length,
          conversions: dayRows.filter(isConverted).length,
        });
      }

      // ==========================================
      // RECENT CONVERSIONS
      // ==========================================

      const recentConversions = rows
        .filter(isConverted)
        .slice(0, 8)
        .map((row) => ({
          clickId: row.click_id,
          country: row.country || "Unknown",
          payout: Number(row.payout || 0),
          convertedAt: row.converted_at || row.created_at,
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
      console.error("Affiliate dashboard error:", err);

      setError(
        err?.message || "Failed to load dashboard."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // ==========================================
  // CLOSE MENU WHEN CLICKING OUTSIDE
  // ==========================================

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  // ==========================================
  // SMARTLINK
  // ==========================================

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

  // ==========================================
  // COPY SMARTLINK
  // ==========================================

  const copySmartlink = async () => {
    if (!smartlink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(smartlink);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (copyError) {
      console.error("Copy failed:", copyError);
      setCopied(false);
    }
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = async () => {
    if (!supabase) {
      window.location.href = "/login";
      return;
    }

    try {
      setLoggingOut(true);
      setMenuOpen(false);

      await supabase.auth.signOut();

      window.location.href = "/login";
    } catch (logoutError) {
      console.error("Logout error:", logoutError);
      setLoggingOut(false);
      setError("Logout failed. Please try again.");
    }
  };

  const maxClicks = Math.max(
    ...stats.daily.map((item) => item.clicks),
    1
  );

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-32 rounded-3xl bg-white/5" />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-36 rounded-2xl bg-white/5"
                />
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="h-96 rounded-2xl bg-white/5 lg:col-span-2" />
              <div className="h-96 rounded-2xl bg-white/5" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // DASHBOARD
  // ==========================================

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">

        {/* ======================================
            TOP NAVIGATION
        ====================================== */}

        <header className="relative z-50 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm md:px-5">

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20">
              <Zap size={20} />
            </div>

            <div>
              <p className="text-sm font-bold text-slate-900">
                UpNetwork CPA
              </p>

              <p className="text-[11px] text-slate-500">
                Affiliate Panel
              </p>
            </div>
          </div>

          {/* ==================================
              3 DOT ACCOUNT MENU
          ================================== */}

          <div
            ref={menuRef}
            className="relative"
          >
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              aria-label="Open account menu"
              aria-expanded={menuOpen}
              className="group flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            >
              <MoreVertical
                size={21}
                className="transition group-hover:scale-110"
              />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-14 w-[290px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15">

                {/* USER HEADER */}

                <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 p-4 text-white">
                  <div className="flex items-center gap-3">

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg font-bold ring-1 ring-white/20">
                      {(profile?.name || "A")
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {profile?.name || "Affiliate"}
                      </p>

                      <p className="truncate text-xs text-blue-200">
                        {profile?.email || "Affiliate Account"}
                      </p>

                      <div className="mt-1 inline-flex items-center rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                        ● Online
                      </div>
                    </div>
                  </div>
                </div>

                {/* MENU ITEMS */}

                <div className="p-2">

                  <button
                    type="button"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-50"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <User size={17} />
                    </span>

                    <span>
                      <span className="block text-sm font-semibold text-slate-800">
                        My Account
                      </span>

                      <span className="block text-xs text-slate-500">
                        View your affiliate account
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setManagerOpen(true);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-50"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <MessageCircle size={17} />
                    </span>

                    <span>
                      <span className="block text-sm font-semibold text-slate-800">
                        Contact Manager
                      </span>

                      <span className="block text-xs text-slate-500">
                        Chat with our panel managers
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-50"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                      <Settings size={17} />
                    </span>

                    <span>
                      <span className="block text-sm font-semibold text-slate-800">
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
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-red-50 disabled:opacity-60"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600">
                      <LogOut size={17} />
                    </span>

                    <span>
                      <span className="block text-sm font-semibold text-red-600">
                        {loggingOut
                          ? "Logging out..."
                          : "Logout"}
                      </span>

                      <span className="block text-xs text-slate-500">
                        Sign out of your account
                      </span>
                    </span>
                  </button>

                </div>
              </div>
            )}
          </div>
        </header>

        {/* ======================================
            MANAGER MODAL
        ====================================== */}

        {managerOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">

            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">

              <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 p-6 text-white">

                <button
                  type="button"
                  onClick={() => setManagerOpen(false)}
                  className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                  <MessageCircle size={23} />
                </div>

                <h2 className="mt-4 text-xl font-bold">
                  Contact Panel Manager
                </h2>

                <p className="mt-1 text-sm leading-5 text-blue-200">
                  Choose any manager below to contact the UpNetwork CPA team.
                </p>
              </div>

              <div className="space-y-3 p-4">

                {PANEL_MANAGERS.map((manager) => (
                  <a
                    key={manager.id}
                    href={manager.telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/40 hover:shadow-lg"
                  >
                    <div className="flex items-center gap-3">

                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
                        <MessageCircle size={19} />
                      </div>

                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {manager.name}
                        </p>

                        <p className="text-xs text-slate-500">
                          {manager.telegram}
                        </p>

                        <span className="mt-1 inline-block text-[10px] font-semibold text-emerald-600">
                          Available on Telegram
                        </span>
                      </div>
                    </div>

                    <ChevronRight
                      size={18}
                      className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600"
                    />
                  </a>
                ))}

                <button
                  type="button"
                  onClick={() => setManagerOpen(false)}
                  className="mt-2 w-full rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================
            HERO
        ====================================== */}

        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 p-6 text-white shadow-2xl md:p-8">

          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />

          <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">

            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
                <Sparkles size={14} />
                Affiliate Dashboard
              </div>

              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Welcome back, {profile?.name || "Affiliate"} 👋
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100 md:text-base">
                Track your traffic, leads, conversions and earnings from one place.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setRefreshing(true);
                loadDashboard();
              }}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-blue-50 disabled:opacity-60"
            >
              <RefreshCw
                size={17}
                className={refreshing ? "animate-spin" : ""}
              />

              Refresh
            </button>
          </div>
        </section>

        {/* ERROR */}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ======================================
            KPI CARDS
        ====================================== */}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

          <StatCard
            title="Total Clicks"
            value={formatNumber(stats.total)}
            subtitle={`${formatNumber(stats.today)} today`}
            trend={
              stats.yesterday > 0
                ? `${Math.round(
                    ((stats.today - stats.yesterday) /
                      stats.yesterday) *
                      100
                  )}%`
                : undefined
            }
            icon={<MousePointerClick size={23} />}
            className="bg-gradient-to-br from-blue-500 to-cyan-500"
            iconClassName="text-white"
          />

          <StatCard
            title="Leads"
            value={formatNumber(stats.leads)}
            subtitle="Qualified actions"
            icon={<Users size={23} />}
            className="bg-gradient-to-br from-emerald-500 to-teal-500"
            iconClassName="text-white"
          />

          <StatCard
            title="Conversions"
            value={formatNumber(stats.conversions)}
            subtitle={`${stats.conversionRate.toFixed(2)}% conversion rate`}
            icon={<Target size={23} />}
            className="bg-gradient-to-br from-violet-500 to-purple-600"
            iconClassName="text-white"
          />

          <StatCard
            title="Revenue"
            value={formatMoney(stats.revenue).replace("$", "")}
            prefix="$"
            subtitle="Total earnings"
            icon={<CircleDollarSign size={23} />}
            className="bg-gradient-to-br from-orange-500 to-amber-500"
            iconClassName="text-white"
          />
        </section>

        {/* ======================================
            PERFORMANCE + SMARTLINK
        ====================================== */}

        <section className="grid gap-6 lg:grid-cols-3">

          {/* PERFORMANCE */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">

            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

              <div>
                <div className="flex items-center gap-2">

                  <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                    <BarChart3 size={19} />
                  </div>

                  <h2 className="font-bold text-slate-900">
                    Performance
                  </h2>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Traffic and conversion activity over the last 7 days
                </p>
              </div>

              <div className="flex gap-2 text-xs">

                <span className="rounded-full bg-blue-50 px-3 py-1.5 font-medium text-blue-600">
                  Today: {formatNumber(stats.today)}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-600">
                  Month: {formatNumber(stats.month)}
                </span>

              </div>
            </div>

            <div className="mt-8">

              <div className="flex h-64 items-end gap-2 md:gap-4">

                {stats.daily.map((item) => {

                  const height = Math.max(
                    (item.clicks / maxClicks) * 100,
                    item.clicks > 0 ? 8 : 2
                  );

                  return (
                    <div
                      key={item.date}
                      className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                    >

                      <div className="flex h-full w-full items-end justify-center">

                        <div className="relative flex h-full w-full max-w-14 items-end">

                          <div
                            className="group relative w-full rounded-t-xl bg-gradient-to-t from-blue-600 to-cyan-400 transition-all duration-500"
                            style={{
                              height: `${height}%`,
                            }}
                          >

                            <div className="absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[10px] text-white group-hover:block">
                              {item.clicks} clicks
                            </div>

                            {item.conversions > 0 && (
                              <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500 ring-4 ring-violet-100" />
                            )}

                          </div>
                        </div>
                      </div>

                      <span className="text-xs font-medium text-slate-400">
                        {item.label}
                      </span>

                    </div>
                  );
                })}

              </div>
            </div>

            <div className="mt-5 flex items-center gap-5 border-t border-slate-100 pt-4 text-xs text-slate-500">

              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                Clicks
              </div>

              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                Conversions
              </div>

            </div>
          </div>

          {/* SMARTLINK */}

          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-5 text-white shadow-xl">

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-2">

                <div className="rounded-lg bg-white/15 p-2">
                  <Link2 size={20} />
                </div>

                <h2 className="font-bold">
                  Smartlink
                </h2>

              </div>

              <Zap size={19} />
            </div>

            <p className="mt-4 text-sm leading-6 text-purple-100">
              Your personal smartlink is ready. Share this link with your traffic sources.
            </p>

            <div className="mt-5 rounded-xl border border-white/10 bg-black/15 p-3 backdrop-blur">

              {smartlink ? (
                <p className="break-all text-xs leading-5 text-purple-50">
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
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-purple-700 transition hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? (
                <>
                  <CheckCircle2 size={17} />
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
                  {formatNumber(stats.total)}
                </p>
              </div>

              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-xs text-purple-100">
                  Conversions
                </p>

                <p className="mt-1 text-xl font-bold">
                  {formatNumber(stats.conversions)}
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ======================================
            RECENT CONVERSIONS + TRAFFIC
        ====================================== */}

        <section className="grid gap-6 lg:grid-cols-3">

          {/* RECENT CONVERSIONS */}

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">

            <div className="flex items-center justify-between border-b border-slate-100 p-5">

              <div>
                <div className="flex items-center gap-2">

                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                    <CheckCircle2 size={19} />
                  </div>

                  <h2 className="font-bold text-slate-900">
                    Recent Conversions
                  </h2>

                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Latest conversion activity
                </p>
              </div>

              <span className="flex items-center gap-1 text-sm font-medium text-blue-600">
                Live
                <ChevronRight size={16} />
              </span>

            </div>

            {stats.recentConversions.length === 0 ? (

              <div className="flex min-h-52 flex-col items-center justify-center p-6 text-center">

                <div className="rounded-full bg-slate-100 p-4 text-slate-400">
                  <Activity size={25} />
                </div>

                <h3 className="mt-3 font-semibold text-slate-800">
                  No conversions yet
                </h3>

                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  Your conversions will appear here when your traffic starts converting.
                </p>

              </div>

            ) : (

              <div className="divide-y divide-slate-100">

                {stats.recentConversions.map((conversion) => (

                  <div
                    key={conversion.clickId}
                    className="flex items-center justify-between gap-4 p-4 transition hover:bg-slate-50"
                  >

                    <div className="flex min-w-0 items-center gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <CheckCircle2 size={18} />
                      </div>

                      <div className="min-w-0">

                        <p className="truncate text-sm font-semibold text-slate-800">
                          {conversion.clickId}
                        </p>

                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">

                          <Globe2 size={12} />
                          {conversion.country}

                          <span>•</span>

                          <Clock3 size={12} />
                          {formatDate(conversion.convertedAt)}

                        </div>

                      </div>
                    </div>

                    <div className="shrink-0 text-right">

                      <p className="font-bold text-emerald-600">
                        +{formatMoney(conversion.payout)}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Conversion
                      </p>

                    </div>

                  </div>

                ))}

              </div>
            )}
          </div>

          {/* TRAFFIC OVERVIEW */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center gap-2">

              <div className="rounded-lg bg-orange-50 p-2 text-orange-600">
                <Globe2 size={19} />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">
                  Traffic Overview
                </h2>

                <p className="text-xs text-slate-500">
                  Your traffic sources
                </p>
              </div>

            </div>

            <div className="mt-6 space-y-3">

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">

                <div className="flex items-center gap-3">

                  <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
                    <Globe2 size={17} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold">
                      Total GEO
                    </p>

                    <p className="text-xs text-slate-500">
                      Country tracking
                    </p>
                  </div>

                </div>

                <span className="text-sm font-bold text-emerald-600">
                  Live
                </span>

              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">

                <div className="flex items-center gap-3">

                  <div className="rounded-lg bg-violet-100 p-2 text-violet-600">
                    <Smartphone size={17} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold">
                      Mobile Traffic
                    </p>

                    <p className="text-xs text-slate-500">
                      Device tracking
                    </p>
                  </div>

                </div>

                <span className="text-sm font-bold text-emerald-600">
                  Live
                </span>

              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">

                <div className="flex items-center gap-3">

                  <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
                    <Laptop size={17} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold">
                      Desktop Traffic
                    </p>

                    <p className="text-xs text-slate-500">
                      Device tracking
                    </p>
                  </div>

                </div>

                <span className="text-sm font-bold text-emerald-600">
                  Live
                </span>

              </div>

            </div>
          </div>
        </section>

        {/* ======================================
            QUICK ACTIONS
        ====================================== */}

        <section>

          <div className="mb-4 flex items-center gap-2">

            <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
              <Zap size={18} />
            </div>

            <div>
              <h2 className="font-bold text-slate-900">
                Quick Actions
              </h2>

              <p className="text-xs text-slate-500">
                Manage your affiliate activity quickly
              </p>
            </div>

          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <Link
              href="/affiliate/offers"
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
            >

              <div className="flex items-center justify-between">

                <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                  <Target size={21} />
                </div>

                <ChevronRight
                  size={18}
                  className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-500"
                />

              </div>

              <h3 className="mt-4 font-semibold">
                Browse Offers
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Find offers and start promoting.
              </p>

            </Link>

            <button
              type="button"
              onClick={() => {
                if (smartlink) {
                  copySmartlink();
                }
              }}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-lg"
            >

              <div className="flex items-center justify-between">

                <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
                  <Link2 size={21} />
                </div>

                <ChevronRight
                  size={18}
                  className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-violet-500"
                />

              </div>

              <h3 className="mt-4 font-semibold">
                Smartlinks
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Copy your affiliate smartlink.
              </p>

            </button>

            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg"
            >

              <div className="flex items-center justify-between">

                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                  <BarChart3 size={21} />
                </div>

                <ChevronRight
                  size={18}
                  className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-500"
                />

              </div>

              <h3 className="mt-4 font-semibold">
                Statistics
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Analyze your performance.
              </p>

            </button>

            <button
              type="button"
              onClick={() => setManagerOpen(true)}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg"
            >

              <div className="flex items-center justify-between">

                <div className="rounded-xl bg-orange-50 p-3 text-orange-600">
                  <MessageCircle size={21} />
                </div>

                <ChevronRight
                  size={18}
                  className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-orange-500"
                />

              </div>

              <h3 className="mt-4 font-semibold">
                Contact Manager
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Contact any panel manager on Telegram.
              </p>

            </button>

          </div>
        </section>

        {/* ======================================
            FOOTER
        ====================================== */}

        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-xs text-slate-500 shadow-sm sm:flex-row sm:items-center">

          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />

            Dashboard connected to live affiliate data
          </div>

          <div className="flex items-center gap-2">
            <TrendingUp size={14} />

            Conversion Rate:

            <span className="font-semibold text-slate-700">
              {stats.conversionRate.toFixed(2)}%
            </span>
          </div>

        </div>

      </main>
    </div>
  );
                    }
