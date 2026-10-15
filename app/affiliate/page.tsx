"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Menu,
  X,
  Home,
  Target,
  Link2,
  BarChart3,
  Wallet,
  Users,
  CreditCard,
  User,
  Settings,
  MessageCircle,
  LogOut,
  Copy,
  Check,
  MousePointerClick,
  TrendingUp,
  DollarSign,
  Activity,
  ChevronRight,
  Sun,
  Moon,
  Zap,
  ShieldCheck,
  Send,
  HelpCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ManagerEmailContacts from "@/components/manager-email-contacts";
import NotificationBell from "./notification-bell";
import DashboardOffers from "./dashboard-offers";
import { useAffiliateTheme } from "./theme-context";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import styles from "./dashboard.module.css";
import { AnimatedMetric, DashboardSkeleton, useMetricChanged } from "./dashboard-motion";
import type { MetricFormat } from "./dashboard-motion";

type ClickRow = {
  click_id?: string;
  affiliate_id?: string;
  smartlink_id?: string;
  country?: string;
  device?: string;
  browser?: string;
  referer?: string;
  status?: string;
  payout?: number | string;
  converted_at?: string | null;
  created_at?: string;
};

type DashboardStats = {
  totalClicks: number;
  conversions: number;
  earnings: number;
  conversionRate: number;
};

type Manager = {
  id: string;
  telegram: string;
  telegramUrl: string;
};

type PanelSettings = Record<string, boolean>;

const DEFAULT_PANEL_SETTINGS: PanelSettings = {
  dashboard: true,
  offers: true,
  smart_links: true,
  statistics: true,
  earnings: true,
  referrals: true,
  payments: true,
  profile: true,
  settings: true,
  manager_contact: true,
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

const mainMenu = [
  {
    label: "Dashboard",
    icon: Home,
    action: "dashboard",
    feature: "dashboard",
  },
  {
    label: "Offers",
    icon: Target,
    action: "offers",
    feature: "offers",
  },
  {
    label: "Smart Links",
    icon: Link2,
    action: "smartlinks",
    feature: "smart_links",
  },
  {
    label: "Statistics",
    icon: BarChart3,
    action: "statistics",
    feature: "statistics",
  },
  {
    label: "Earnings",
    icon: Wallet,
    action: "earnings",
    feature: "earnings",
  },
  {
    label: "Referrals",
    icon: Users,
    action: "referrals",
    feature: "referrals",
  },
  {
    label: "Payments",
    icon: CreditCard,
    action: "payments",
    feature: "payments",
  },
];

export default function AffiliatePage() {
  const router = useRouter();
  const { theme, setTheme } = useAffiliateTheme();

  const [menuOpen, setMenuOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const [profile, setProfile] = useState<{
    id: string;
    affiliateId: string;
    email: string | null;
    name: string;
  } | null>(null);

  const [clicks, setClicks] = useState<ClickRow[]>([]);

  const [stats, setStats] = useState<DashboardStats>({
    totalClicks: 0,
    conversions: 0,
    earnings: 0,
    conversionRate: 0,
  });

  const [todayStats, setTodayStats] = useState<DashboardStats>({
    totalClicks: 0,
    conversions: 0,
    earnings: 0,
    conversionRate: 0,
  });
  const [dailyDate, setDailyDate] = useState("");
  const [reportingTimezone, setReportingTimezone] = useState("UTC");

  const [panelSettings, setPanelSettings] =
    useState<PanelSettings>(DEFAULT_PANEL_SETTINGS);

  const dark = theme === "dark";

  function featureEnabled(feature: string): boolean {
    return panelSettings[feature] !== false;
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  // Refresh data every 10 seconds without reloading the page.
  useAutoRefresh(() => loadDashboard(false), 10000);

  async function loadDashboard(showLoading = true) {
    try {
      if (showLoading) {
        setLoading(true);
        setError("");
      }

      if (!supabase) {
        setError("Supabase is not configured.");
        return;
      }

      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        router.replace("/login");
        return;
      }

      const accessToken = sessionData.session.access_token;
      const browserTimezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

      // Start both requests together, after session verification.
      const [dashboardResult, settingsResult] = await Promise.allSettled([
        (async () => {
          const response = await fetch("/api/affiliate/dashboard", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "x-affiliate-timezone": browserTimezone,
            },
            cache: "no-store",
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data?.error || "Unable to load dashboard.");
          }

          return data;
        })(),
        (async () => {
          const response = await fetch("/api/affiliate/panel-settings", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            cache: "no-store",
          });

          if (!response.ok) return null;
          return await response.json();
        })(),
      ]);

      // Retain the existing panel-settings behavior.
      if (settingsResult.status === "fulfilled") {
        const settingsData = settingsResult.value;

        if (Array.isArray(settingsData?.settings)) {
          const nextSettings = { ...DEFAULT_PANEL_SETTINGS };

          settingsData.settings.forEach(
            (item: { feature_key?: string; enabled?: boolean }) => {
              if (item.feature_key && typeof item.enabled === "boolean") {
                nextSettings[item.feature_key] = item.enabled;
              }
            }
          );

          setPanelSettings(nextSettings);
        }
      } else {
        console.error(
          "Affiliate panel settings error:",
          settingsResult.reason
        );
        setPanelSettings(DEFAULT_PANEL_SETTINGS);
      }

      if (dashboardResult.status === "rejected") {
        throw dashboardResult.reason;
      }

      const dashboardData = dashboardResult.value;

      setProfile(dashboardData.profile || null);
      setClicks(
        Array.isArray(dashboardData.clicks) ? dashboardData.clicks : []
      );

      setStats({
        totalClicks: Number(dashboardData?.stats?.totalClicks) || 0,
        conversions: Number(dashboardData?.stats?.conversions) || 0,
        earnings: Number(dashboardData?.stats?.earnings) || 0,
        conversionRate: Number(dashboardData?.stats?.conversionRate) || 0,
      });

      setTodayStats({
        totalClicks: Number(dashboardData?.todayStats?.totalClicks) || 0,
        conversions: Number(dashboardData?.todayStats?.conversions) || 0,
        earnings: Number(dashboardData?.todayStats?.earnings) || 0,
        conversionRate: Number(dashboardData?.todayStats?.conversionRate) || 0,
      });

      setDailyDate(String(dashboardData?.daily?.date || ""));
      setReportingTimezone(String(dashboardData?.daily?.timezone || "UTC"));
    } catch (err: unknown) {
      console.error("Affiliate dashboard error:", err);

      if (showLoading) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load affiliate dashboard."
        );
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  async function handleLogout() {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } finally {
      router.replace("/login");
    }
  }

  function navigateMenu(action: string) {
    setMenuOpen(false);

    const item = mainMenu.find(
      (menuItem) =>
        menuItem.action === action
    );

    if (
      item &&
      !featureEnabled(item.feature)
    ) {
      return;
    }

    if (action === "dashboard") {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    const routes: Record<string, string> = {
      offers: "/affiliate/offers",
      smartlinks: "/affiliate/smart-link",
      statistics: "/affiliate/statistics",
      earnings: "/affiliate/earnings",
      referrals: "/affiliate/referrals",
      payments: "/affiliate/payments",
    };

    const route = routes[action];

    if (route) {
      router.push(route);
    }
  }

  function openManager() {
    if (!featureEnabled("manager_contact")) {
      return;
    }

    setManagerOpen(true);
  }

  function openSettings() {
    if (!featureEnabled("settings")) {
      return;
    }

    setProfileOpen(false);
    setSettingsOpen(false);
    setMenuOpen(false);

    router.push("/affiliate/settings");
  }

  function openProfile() {
    if (!featureEnabled("profile")) {
      return;
    }

    setProfileOpen((value) => !value);
    setSettingsOpen(false);
  }

  function openPanelSettings() {
    if (!featureEnabled("settings")) {
      return;
    }

    setSettingsOpen((value) => !value);
    setProfileOpen(false);
  }

  const totalClicks = stats.totalClicks;
  const conversions = stats.conversions;
  const earnings = stats.earnings;

  const conversionRate =
    Number.isFinite(stats.conversionRate)
      ? stats.conversionRate.toFixed(2)
      : "0.00";

  const affiliateId =
    profile?.affiliateId || "Loading...";

  const smartLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/track?aid=${encodeURIComponent(
          affiliateId
        )}&sl=default-smartlink`
      : `/api/track?aid=${encodeURIComponent(
          affiliateId
        )}&sl=default-smartlink`;

  async function copySmartLink() {
    try {
      await navigator.clipboard.writeText(
        smartLink
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  }

  const visibleMenu = useMemo(
    () =>
      mainMenu.filter((item) =>
        featureEnabled(item.feature)
      ),
    [panelSettings]
  );

  const pageBg = dark
  ? "bg-transparent text-white"
  : "bg-transparent text-slate-900";

  const panelBg = dark
    ? "bg-[#090d17]"
    : "bg-white";

  const border = dark
    ? "border-white/10"
    : "border-slate-200";

  const muted = dark
    ? "text-slate-400"
    : "text-slate-500";

  const faint = dark
    ? "text-slate-600"
    : "text-slate-400";

  if (loading) {
    return <DashboardSkeleton dark={dark} />;
  }

  return (
    <main
      className={`${styles.dashboard} relative min-h-screen overflow-x-hidden transition-colors duration-300 ${pageBg}`}
      data-dashboard-theme={dark ? "dark" : "light"}
    >
      {/* Background */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
      >
        
       <div className="absolute inset-0 bg-transparent" />

        <div
          className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 bg-contain bg-center bg-no-repeat sm:h-[700px] sm:w-[700px]"
          style={{
            backgroundImage:
              "url('/file_000000013688207a03d42a2550c1954.png')",
            opacity: dark ? 0.2 : 0.06,
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            background: dark
              ? "radial-gradient(circle at center, rgba(5,7,12,0.08) 0%, rgba(5,7,12,0.88) 78%)"
              : "radial-gradient(circle at center, rgba(248,250,252,0.15) 0%, rgba(248,250,252,0.94) 78%)",
          }}
        />

        <div className="absolute -left-40 top-20 h-80 w-80 rounded-full bg-cyan-500/5 blur-3xl" />

        <div className="absolute -right-40 top-80 h-96 w-96 rounded-full bg-purple-500/5 blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header
          className={`${styles.topbar} sticky top-0 z-40 border-b backdrop-blur-2xl ${
            dark
              ? "border-white/10 bg-[#05070c]/90"
              : "border-slate-200 bg-white/90"
          }`}
        >
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setMenuOpen(true)
                }
                aria-label="Open menu"
                className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
                  dark
                    ? "border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-400"
                    : "border-slate-200 bg-white text-slate-600 hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-600"
                }`}
              >
                <Menu size={21} />
              </button>

              <div>
                <div className="text-lg font-black tracking-tight">
                  UpNetwork
                  <span className="text-cyan-400">
                    CPA
                  </span>
                </div>

                <div
                  className={`text-[9px] uppercase tracking-[0.22em] ${faint}`}
                >
                  Affiliate Panel
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Affiliate ID */}
              <div
                className={`hidden rounded-xl border px-3 py-2 md:block ${
                  dark
                    ? "border-cyan-400/20 bg-cyan-400/[0.05]"
                    : "border-cyan-100 bg-cyan-50"
                }`}
              >
                <p
                  className={`text-[9px] uppercase tracking-wider ${faint}`}
                >
                  Affiliate ID
                </p>

                <p className="mt-0.5 max-w-[150px] truncate font-mono text-xs font-bold text-cyan-500">
                  {affiliateId}
                </p>
              </div>

              <div className={styles.notifications}><NotificationBell /></div>

              {/* Theme */}
              <button
                type="button"
                onClick={() =>
                  setTheme(
                    dark
                      ? "light"
                      : "dark"
                  )
                }
                aria-label={
                  dark
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
                className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                  dark
                    ? "border-white/10 bg-white/[0.04] text-amber-300 hover:border-amber-300/20 hover:bg-amber-400/10"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {dark ? (
                  <Sun size={18} />
                ) : (
                  <Moon size={18} />
                )}
              </button>

              {/* Profile */}
              {featureEnabled(
                "profile"
              ) && (
                <button
                  type="button"
                  onClick={openProfile}
                  className={`flex h-10 items-center gap-2 rounded-xl border px-3 transition ${
                    dark
                      ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-500">
                    <User size={16} />
                  </div>

                  <span className="hidden text-xs font-semibold sm:block">
                    Profile
                  </span>
                </button>
              )}

              {/* Settings */}
              {featureEnabled(
                "settings"
              ) && (
                <button
                  type="button"
                  onClick={
                    openPanelSettings
                  }
                  aria-label="Settings"
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                    dark
                      ? "border-white/10 bg-white/[0.04] text-slate-400 hover:text-cyan-400"
                      : "border-slate-200 bg-white text-slate-500 hover:text-cyan-500"
                  }`}
                >
                  <Settings size={18} />
                </button>
              )}

              {/* Logout */}
              <button
                type="button"
                onClick={handleLogout}
                className="hidden h-10 items-center gap-2 rounded-xl border border-red-500/10 bg-red-500/[0.04] px-3 text-xs font-semibold text-red-400 transition hover:bg-red-500/10 sm:flex"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>

          {/* Profile dropdown */}
          {profileOpen &&
            featureEnabled(
              "profile"
            ) && (
              <div
                className={`${styles.popover} absolute right-4 top-[70px] z-50 w-64 rounded-2xl border p-4 shadow-2xl sm:right-6 ${panelBg} ${border}`}
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-500">
                    <User size={20} />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">
                      {profile?.name ||
                        "Affiliate"}
                    </p>

                    <p
                      className={`truncate text-xs ${faint}`}
                    >
                      {profile?.email || ""}
                    </p>
                  </div>
                </div>

                <div
                  className={`rounded-xl p-3 ${
                    dark
                      ? "bg-white/[0.03]"
                      : "bg-slate-50"
                  }`}
                >
                  <p
                    className={`text-[10px] uppercase tracking-wider ${faint}`}
                  >
                    Affiliate ID
                  </p>

                  <p className="mt-1 break-all font-mono text-xs text-cyan-500">
                    {affiliateId}
                  </p>
                </div>

                {featureEnabled(
                  "settings"
                ) && (
                  <button
                    type="button"
                    onClick={openSettings}
                    className={`mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm ${
                      dark
                        ? "text-slate-400 hover:bg-white/5 hover:text-white"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Settings size={17} />
                    Profile Settings
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-red-400 hover:bg-red-500/10"
                >
                  <LogOut size={17} />
                  Logout
                </button>
              </div>
            )}

          {/* Settings dropdown */}
          {settingsOpen &&
            featureEnabled(
              "settings"
            ) && (
              <div
                className={`${styles.popover} absolute right-4 top-[70px] z-50 w-64 rounded-2xl border p-4 shadow-2xl sm:right-6 ${panelBg} ${border}`}
              >
                <div className="mb-3">
                  <p className="text-sm font-bold">
                    Panel Settings
                  </p>

                  <p
                    className={`mt-1 text-xs ${faint}`}
                  >
                    Manage your affiliate account.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openSettings}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm ${
                    dark
                      ? "text-slate-400 hover:bg-white/5 hover:text-white"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Settings size={17} />
                  Account Settings
                </button>
              </div>
            )}
        </header>

        {/* Main */}
        <div className={`${styles.content} mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9`}>
          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Dashboard disabled */}
          {!featureEnabled(
            "dashboard"
          ) ? (
            <section
              className={`rounded-3xl border p-10 text-center shadow-xl ${panelBg} ${border}`}
            >
              <ShieldCheck
                size={42}
                className="mx-auto mb-4 text-slate-400"
              />

              <h1 className="text-xl font-black">
                Dashboard Temporarily Unavailable
              </h1>

              <p
                className={`mx-auto mt-2 max-w-md text-sm ${muted}`}
              >
                The administrator has temporarily
                disabled the Affiliate Dashboard.
              </p>
            </section>
          ) : (
            <>
              {/* Welcome Hero */}
              
            <section
              className={`${styles.hero} relative overflow-hidden rounded-3xl border border-white/20 p-6 text-white sm:p-8`}
              >
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

                <div className="absolute -bottom-28 right-24 h-56 w-56 rounded-full bg-purple-500/10 blur-3xl" />

                <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                  <div className="max-w-2xl">
                    <div className={`${styles.heroBadge} mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em]`}>
                      <Zap size={12} />
                      Affiliate Dashboard
                    </div>

                    <h1 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
                      Welcome back,{" "}
                      <span className={styles.heroName}>
                        {profile?.name ||
                          "Affiliate"}
                      </span>
                    </h1>

                    <p
                      className={`${styles.heroDescription} mt-3 max-w-xl text-sm leading-6`}
                    >
                      Manage your offers, smart links,
                      traffic, conversions, earnings and
                      referrals from one powerful dashboard.
                    </p>
                  </div>

                  <div
                    className={`${styles.heroAccount} hidden rounded-2xl border p-4 lg:block ${
                      dark
                        ? "border-white/10 bg-black/10"
                        : "border-slate-200 bg-white/70"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                        <ShieldCheck
                          size={22}
                        />
                      </div>

                      <div>
                        <p className="text-xs font-bold">
                          Account Active
                        </p>

                        <p
                          className={`${styles.heroAccountNote} mt-1 text-[10px]`}
                        >
                          Ready to generate traffic
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Daily performance: affiliate's saved reporting timezone */}
              <section className={`${styles.section} ${styles.daily} mt-6`}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black">Today's Performance</h2>
                    <p className={`mt-1 text-xs ${muted}`}>
                      {dailyDate || "Today"} • {reportingTimezone}
                    </p>
                  </div>
                  <span className={`${styles.liveBadge} rounded-full px-3 py-1 text-xs font-semibold ${
                    dark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-700"
                  }`}>
                    Auto Refresh • 10s
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard title="Today Clicks" value={todayStats.totalClicks.toLocaleString()} numericValue={todayStats.totalClicks}
                    subtitle="Clicks recorded today" icon={<MousePointerClick size={21} />}
                    accent="cyan" dark={dark} />
                  <StatCard title="Today Conversions" value={todayStats.conversions.toLocaleString()} numericValue={todayStats.conversions}
                    subtitle="Conversions recorded today" icon={<TrendingUp size={21} />}
                    accent="emerald" dark={dark} />
                  <StatCard title="Today Conversion Rate" value={`${todayStats.conversionRate.toFixed(2)}%`} numericValue={todayStats.conversionRate} metricFormat="percent"
                    subtitle="Today's conversion rate" icon={<Activity size={21} />}
                    accent="purple" dark={dark} />
                  <StatCard title="Today Earnings" value={`$${todayStats.earnings.toFixed(2)}`} numericValue={todayStats.earnings} metricFormat="currency"
                    subtitle="Earnings recorded today" icon={<DollarSign size={21} />}
                    accent="amber" dark={dark} />
                </div>
              </section>

              {/* Lifetime totals are preserved independently of daily reset */}
              
              {/* Total Affiliate Earnings */}
              <section className={`${styles.section} ${styles.earningsSection} mt-8`}>
            <div className="mb-4">
    <h2 className="text-lg font-black">
      Total Earnings
    </h2>
    <p className={`mt-1 text-xs ${muted}`}>
      Your total recorded affiliate earnings
    </p>
  </div>

  <div className={`${styles.earnings} relative overflow-hidden rounded-3xl border p-6 text-white sm:p-8`}>
    <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

    <div className="relative z-10 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-100">
          Total Affiliate Earnings
        </p>

        <h3 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
          <AnimatedMetric value={earnings} format="currency" />
        </h3>

        <p className="mt-3 text-sm text-emerald-100">
          Your lifetime recorded earnings
        </p>
      </div>

      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 shadow-lg">
        <DollarSign size={34} className="text-white" />
         </div>
       </div>

     <dl className={`${styles.lifetimeMetrics} relative z-10`}>
       <div><dt>Lifetime clicks</dt><dd><AnimatedMetric value={totalClicks} /></dd></div>
       <div><dt>Lifetime conversions</dt><dd><AnimatedMetric value={conversions} /></dd></div>
       <div><dt>Conversion rate</dt><dd><AnimatedMetric value={Number(conversionRate)} format="percent" /></dd></div>
     </dl>
     <div className="relative z-10 mt-6 border-t border-white/20 pt-4">
       <p className="text-xs font-medium text-emerald-100">
        Earnings are updated from your affiliate statistics.
            </p>
               </div>
           </div>
           </section>

              {/* Latest Offers */}
{featureEnabled("offers") && (
  <div className={`${styles.section} mt-6`}>
    <DashboardOffers dark={dark} />
  </div>
)}

              {/* Quick Actions */}
              <section className={`${styles.section} ${styles.actionsSection} mt-6`}>
                <div className="mb-4 flex items-end justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-500">
                      Shortcuts
                    </p>

                    <h2 className="mt-1 text-lg font-black">
                      Quick Actions
                    </h2>
                  </div>

                  <p
                    className={`hidden text-xs sm:block ${faint}`}
                  >
                    Jump directly to important sections
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {featureEnabled(
                    "offers"
                  ) && (
                    <QuickAction
                      title="Browse Offers"
                      subtitle="Find available campaigns"
                      icon={
                        <Target size={20} />
                      }
                      accent="blue"
                      onClick={() =>
                        router.push(
                          "/affiliate/offers"
                        )
                      }
                      dark={dark}
                    />
                  )}

                  {featureEnabled(
                    "smart_links"
                  ) && (
                    <QuickAction
                      title="Smart Links"
                      subtitle="Manage tracking links"
                      icon={
                        <Link2 size={20} />
                      }
                      accent="cyan"
                      onClick={() =>
                        router.push(
                          "/affiliate/smart-link"
                        )
                      }
                      dark={dark}
                    />
                  )}

                  {featureEnabled(
                    "statistics"
                  ) && (
                    <QuickAction
                      title="Statistics"
                      subtitle="Analyze your traffic"
                      icon={
                        <BarChart3 size={20} />
                      }
                      accent="purple"
                      onClick={() =>
                        router.push(
                          "/affiliate/statistics"
                        )
                      }
                      dark={dark}
                    />
                  )}

                  {featureEnabled(
                    "manager_contact"
                  ) && (
                    <QuickAction
                      title="Contact Manager"
                      subtitle="Talk with your manager"
                      icon={
                        <MessageCircle
                          size={20}
                        />
                      }
                      accent="green"
                      onClick={openManager}
                      dark={dark}
                    />
                  )}
                </div>
              </section>

              {/* Recent Activity */}
              <section
                className={`${styles.section} ${styles.activity} ${styles.panel} relative mt-6 overflow-hidden rounded-2xl border p-5 sm:p-6 ${
                  dark
                    ? "border-orange-400/10 bg-gradient-to-br from-orange-500/[0.05] to-transparent"
                    : "border-orange-100 bg-gradient-to-br from-orange-50/70 to-white"
                }`}
              >
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                      <Activity size={19} />
                    </div>

                    <div>
                      <h2 className="font-bold">
                        Recent Activity
                      </h2>

                      <p
                        className={`mt-1 text-xs ${faint}`}
                      >
                        Latest tracked traffic and
                        conversions
                      </p>
                    </div>
                  </div>

                  {featureEnabled(
                    "statistics"
                  ) && (
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          "/affiliate/statistics"
                        )
                      }
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-orange-500 hover:bg-orange-500/10"
                    >
                      View Statistics
                      <ChevronRight
                        size={15}
                      />
                    </button>
                  )}
                </div>

                {clicks.length === 0 ? (
                  <div
                    className={`rounded-xl border border-dashed py-12 text-center ${
                      dark
                        ? "border-white/10 bg-white/[0.015]"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <MousePointerClick
                      size={30}
                      className="mx-auto mb-3 text-slate-400"
                    />

                    <p
                      className={`text-sm font-semibold ${muted}`}
                    >
                      No recent activity
                    </p>

                    <p
                      className={`mt-1 text-xs ${faint}`}
                    >
                      Start sharing your Smart Link or
                      Offer link to generate traffic.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[650px] text-left text-sm">
                      <thead>
                        <tr
                          className={`border-b text-xs ${
                            dark
                              ? "border-white/10 text-slate-500"
                              : "border-slate-200 text-slate-400"
                          }`}
                        >
                          <th className="px-3 py-3 font-semibold">
                            Date
                          </th>

                          <th className="px-3 py-3 font-semibold">
                            Country
                          </th>

                          <th className="px-3 py-3 font-semibold">
                            Device
                          </th>

                          <th className="px-3 py-3 font-semibold">
                            Status
                          </th>

                          <th className="px-3 py-3 text-right font-semibold">
                            Payout
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {clicks
                          .slice(0, 8)
                          .map(
                            (
                              row,
                              index
                            ) => {
                              const status =
                                String(
                                  row.status ||
                                    "click"
                                ).toLowerCase();

                              const converted =
                                [
                                  "converted",
                                  "conversion",
                                  "approved",
                                  "paid",
                                ].includes(
                                  status
                                ) ||
                                Boolean(
                                  row.converted_at
                                );

                              return (
                                <tr
                                  key={
                                    row.click_id ||
                                    `${row.created_at}-${index}`
                                  }
                                  className={`${styles.row} border-b last:border-0 ${
                                    dark
                                      ? "border-white/5 hover:bg-white/[0.02]"
                                      : "border-slate-100 hover:bg-orange-50/30"
                                  } transition`}
                                >
                                  <td
                                    className={`px-3 py-4 text-xs ${
                                      dark
                                        ? "text-slate-400"
                                        : "text-slate-600"
                                    }`}
                                  >
                                    {formatDate(
                                      row.created_at
                                    )}
                                  </td>

                                  <td
                                    className={`px-3 py-4 text-xs ${muted}`}
                                  >
                                    {row.country ||
                                      "-"}
                                  </td>

                                  <td
                                    className={`px-3 py-4 text-xs ${muted}`}
                                  >
                                    {row.device ||
                                      "-"}
                                  </td>

                                  <td className="px-3 py-4">
                                    <span
                                      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                        converted
                                          ? "bg-emerald-500/10 text-emerald-500"
                                          : dark
                                            ? "bg-slate-500/10 text-slate-400"
                                            : "bg-slate-100 text-slate-500"
                                      }`}
                                    >
                                      {converted
                                        ? "Converted"
                                        : "Click"}
                                    </span>
                                  </td>

                                  <td className="px-3 py-4 text-right text-xs font-bold text-emerald-500">
                                    $
                                    {Number(
                                      row.payout ||
                                        0
                                    ).toFixed(
                                      2
                                    )}
                                  </td>
                                </tr>
                              );
                            }
                          )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}

          {/* Footer */}
          <footer
            className={`py-10 text-center text-xs ${
              dark
                ? "text-slate-700"
                : "text-slate-400"
            }`}
          >
            © {new Date().getFullYear()}{" "}
            <span className="font-semibold">
              UpNetworkCPA
            </span>

            <span className="mx-2">
              •
            </span>

            Affiliate Panel
          </footer>
        </div>

        {/* Sidebar */}
        {menuOpen && (
          <div
            className={`${styles.overlay} fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm`}
            onClick={() =>
              setMenuOpen(false)
            }
          >
            <aside
              className={`${styles.sidebar} absolute left-0 top-0 flex h-full w-[290px] flex-col border-r shadow-2xl ${
                dark
                  ? "border-white/10 bg-[#080b12]"
                  : "border-slate-200 bg-white"
              }`}
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div
                className={`flex h-16 items-center justify-between border-b px-5 ${
                  dark
                    ? "border-white/10"
                    : "border-slate-200"
                }`}
              >
                <div>
                  <div className="text-lg font-black">
                    UpNetwork
                    <span className="text-cyan-400">
                      CPA
                    </span>
                  </div>

                  <p
                    className={`text-[9px] uppercase tracking-[0.2em] ${faint}`}
                  >
                    Affiliate Menu
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setMenuOpen(false)
                  }
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    dark
                      ? "bg-white/5 text-slate-400 hover:text-white"
                      : "bg-slate-100 text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <p
                  className={`mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.18em] ${faint}`}
                >
                  Main Menu
                </p>

                <nav className="space-y-1.5">
                  {visibleMenu.map(
                    (item) => {
                      const Icon =
                        item.icon;

                      const active =
                        item.action ===
                        "dashboard";

                      return (
                        <button
                          type="button"
                          key={
                            item.action
                          }
                          onClick={() =>
                            navigateMenu(
                              item.action
                            )
                          }
                          className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                            active
                              ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20"
                              : dark
                                ? "text-slate-400 hover:bg-white/5 hover:text-white"
                                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          <Icon
                            size={18}
                          />

                          <span className="flex-1">
                            {item.label}
                          </span>

                          {!active && (
                            <ChevronRight
                              size={15}
                              className={
                                dark
                                  ? "text-slate-700 group-hover:text-cyan-400"
                                  : "text-slate-300 group-hover:text-cyan-500"
                              }
                            />
                          )}
                        </button>
                      );
                    }
                  )}
                </nav>

                {(featureEnabled(
                  "manager_contact"
                ) ||
                  featureEnabled(
                    "settings"
                  )) && (
                  <div
                    className={`my-5 border-t ${
                      dark
                        ? "border-white/10"
                        : "border-slate-200"
                    }`}
                  />
                )}

                {featureEnabled(
                  "manager_contact"
                ) && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      openManager();
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${
                      dark
                        ? "text-green-400 hover:bg-green-500/10"
                        : "text-green-600 hover:bg-green-50"
                    }`}
                  >
                    <MessageCircle
                      size={18}
                    />
                    Contact Manager
                  </button>
                )}

                {featureEnabled(
                  "settings"
                ) && (
                  <button
                    type="button"
                    onClick={
                      openSettings
                    }
                    className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${
                      dark
                        ? "text-slate-400 hover:bg-white/5 hover:text-white"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Settings
                      size={18}
                    />
                    Settings
                  </button>
                )}
              </div>

              <div
                className={`border-t p-4 ${
                  dark
                    ? "border-white/10"
                    : "border-slate-200"
                }`}
              >
                <button
                  type="button"
                  onClick={
                    handleLogout
                  }
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/10"
                >
                  <LogOut
                    size={18}
                  />
                  Logout
                </button>
              </div>
            </aside>
          </div>
        )}

        
{/* Manager Modal */}
        {managerOpen &&
          featureEnabled("manager_contact") && (
            <div
              className={`${styles.overlay} fixed inset-0 z-[80] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm`}
              onClick={() => setManagerOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="contact-manager-title"
                className={`${styles.modal} max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border p-5 shadow-2xl ${panelBg} ${border}`}
                onClick={(event) =>
                  event.stopPropagation()
                }
              >
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2
                      id="contact-manager-title"
                      className="font-bold"
                    >
                      Contact Manager
                    </h2>

                    <p
                      className={`mt-1 text-xs ${faint}`}
                    >
                      Contact your manager by Email
                      or Telegram.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setManagerOpen(false)
                    }
                    aria-label="Close Contact Manager"
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      dark
                        ? "bg-white/5 text-slate-400"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <X size={18} />
                  </button>
                </div>

                <ManagerEmailContacts
                  dark={dark}
                  affiliateId={affiliateId}
                />
              </div>
            </div>
          )}

        {/* Support Chat Bot */}
        <SupportChatBot
          dark={dark}
          router={router}
          openManager={openManager}
        />
      </div>
    </main>
  );
}

/* =========================================================
   SUPPORT CHAT BOT
   ========================================================= */

type ChatMessage = {
  id: number;
  sender: "bot" | "user";
  text: string;
};
function UpNetworkLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 192 192"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="UpNetwork CPA"
      className="shrink-0 rounded-full"
    >
      <rect width="192" height="192" rx="96" fill="#0B1225" />

      <path
        d="M36 42H65V111C65 132 77 145 96 145C115 145 127 132 127 111V71H156V111C156 150 132 174 96 174C60 174 36 150 36 111Z"
        fill="#2563EB"
      />

      <path
        d="M135 22L174 66H151C143 118 113 145 64 149L54 132C97 125 121 103 126 66H103Z"
        fill="#10D9B0"
      />
    </svg>
  );
}
function SupportChatBot({
  dark,
  router,
  openManager,
}: {
  dark: boolean;
  router: ReturnType<typeof useRouter>;
  openManager: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [chatError, setChatError] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      sender: "bot",
      text:
        "Hello! 👋 I am the UpNetwork CPA AI support assistant. Ask me in English or বাংলা. For account-specific help, choose Talk to Manager.",
    },
  ]);

  const pendingRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = messagesRef.current;

    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages, busy, open]);

  useEffect(() => {
    return () => requestRef.current?.abort();
  }, []);

  const quickButtons = [
    { label: "Offers", action: "offers" },
    { label: "Smart Links", action: "smartlink" },
    { label: "Earnings", action: "earnings" },
    { label: "Statistics", action: "statistics" },
    { label: "Payments", action: "payments" },
    { label: "Verification", action: "verification" },
    { label: "Talk to Manager", action: "manager" },
  ];

  function addMessage(
    sender: "bot" | "user",
    text: string
  ) {
    setMessages((current) => [
      ...current,
      {
        id: Date.now() + Math.random(),
        sender,
        text,
      },
    ]);
  }

  async function askAI(value: string) {
    const question = value.trim();

    if (!question || pendingRef.current) {
      return;
    }

    pendingRef.current = true;
    setBusy(true);
    setChatError("");
    setInput("");

    const messageId = Date.now() + Math.random();

    const nextMessages: ChatMessage[] = [
      ...messages,
      {
        id: messageId,
        sender: "user",
        text: question,
      },
    ];

    setMessages(nextMessages);

    const controller = new AbortController();
    requestRef.current = controller;

    const timer = setTimeout(
      () => controller.abort(),
      40000
    );

    try {
      if (!supabase) {
        throw new Error(
          "Support is not configured. Please contact a manager."
        );
      }

      const { data, error } =
        await supabase.auth.getSession();

      const token = data.session?.access_token;

      if (error || !token) {
        throw new Error(
          "Your session expired. Please log in again."
        );
      }

      const history: {
        role: "user" | "assistant";
        content: string;
      }[] = [];

      let characters = 0;

      for (
        const item of nextMessages.slice(1).reverse()
      ) {
        const content = item.text.slice(0, 2000);

        if (
          history.length >= 12 ||
          characters + content.length > 10000
        ) {
          break;
        }

        history.unshift({
          role:
            item.sender === "user"
              ? "user"
              : "assistant",
          content,
        });

        characters += content.length;
      }

      const response = await fetch(
        "/api/affiliate/support-chat",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: history,
          }),
          signal: controller.signal,
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (
        !response.ok ||
        typeof result.reply !== "string" ||
        !result.reply.trim()
      ) {
        throw new Error(
          result.error ||
            "AI support could not answer. Please try again."
        );
      }

      addMessage("bot", result.reply);
    } catch (error) {
      setMessages((current) =>
        current.filter(
          (item) => item.id !== messageId
        )
      );

      setInput((current) => current || question);

      setChatError(
        controller.signal.aborted
          ? "AI support took too long. Please try again or contact a manager."
          : error instanceof Error
            ? error.message
            : "Unable to connect. Please try again or contact a manager."
      );
    } finally {
      clearTimeout(timer);
      requestRef.current = null;
      pendingRef.current = false;
      setBusy(false);
    }
  }

  function handleQuickAction(action: string) {
    if (action === "manager") {
      setOpen(false);
      openManager();
      return;
    }

    const routes: Record<string, string> = {
      offers: "/affiliate/offers",
      smartlink: "/affiliate/smart-link",
      earnings: "/affiliate/earnings",
      statistics: "/affiliate/statistics",
      payments: "/affiliate/payments",
      verification: "/affiliate/settings",
    };

    const route = routes[action];

    if (route) {
      setOpen(false);
      router.push(route);
    }
  }
  
  function handleSend() {
    void askAI(input);
  }
  
  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open UpNetwork Support Chat"
          className="fixed bottom-5 right-5 z-[90] flex items-center gap-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-2xl shadow-cyan-500/30 transition hover:-translate-y-1 hover:shadow-cyan-500/40"
        >
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
            <UpNetworkLogo size={32} />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-cyan-500" />
          </span>

          <span className="hidden sm:block">
            UpNetwork Support
          </span>
        </button>
      )}

      {open && (
        <div
          className={`${styles.chat} fixed bottom-4 right-4 z-[90] flex h-[min(680px,calc(100vh-32px))] w-[calc(100vw-32px)] max-w-[390px] flex-col overflow-hidden rounded-3xl border shadow-2xl ${
            dark
              ? "border-white/10 bg-[#090d17]"
              : "border-slate-200 bg-white"
          }`}
        >
          {/* Chat header */}
          <div className="relative overflow-hidden bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-4 text-white">
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/10 blur-2xl" />

            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
                  <UpNetworkLogo size={44} />
                </div>

                <div>
                  <p className="font-black">
                    UpNetwork Support
                  </p>

                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-cyan-50">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                    AI Support
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close support chat"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={messagesRef}
            role="log"
            aria-label="Support conversation"
            aria-live="polite"
            className="flex-1 space-y-3 overflow-y-auto p-4"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`${styles.message} flex ${
                  message.sender === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                {message.sender === "bot" && (
                  <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-500">
                    <UpNetworkLogo size={28} />
                  </div>
                )}

                <div
                  className={`max-w-[82%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-xs leading-5 ${
                    message.sender === "user"
                      ? "rounded-br-md bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                      : dark
                        ? "rounded-bl-md bg-white/[0.06] text-slate-300"
                        : "rounded-bl-md bg-slate-100 text-slate-700"
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
          </div>

          {busy && (
            <p
              role="status"
              className="px-4 pb-2 text-xs text-cyan-500"
            >
              AI is thinking…
            </p>
          )}

          {chatError && (
            <div
              role="alert"
              className="mx-4 mb-2 rounded-xl bg-red-500/10 p-3 text-xs text-red-500"
            >
              {chatError}
            </div>
          )}

          {/* Quick buttons */}
          <div
            className={`border-t px-4 pb-3 pt-3 ${
              dark
                ? "border-white/10"
                : "border-slate-200"
            }`}
          >
            <div className="mb-2 flex items-center gap-1.5">
              <HelpCircle
                size={13}
                className="text-cyan-500"
              />

              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  dark
                    ? "text-slate-500"
                    : "text-slate-400"
                }`}
              >
                Quick Help
              </span>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {quickButtons.map((button) => (
                <button
                  type="button"
                  key={button.action}
                  disabled={
                    busy &&
                    button.action !== "manager"
                  }
                  onClick={() =>
                    handleQuickAction(button.action)
                  }
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-semibold transition ${
                    dark
                      ? "border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-300"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-600"
                  }`}
                >
                  {button.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div
            className={`border-t p-3 ${
              dark
                ? "border-white/10 bg-[#070a11]"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div
              className={`flex items-center gap-2 rounded-2xl border p-1.5 ${
                dark
                  ? "border-white/10 bg-white/[0.03]"
                  : "border-slate-200 bg-white"
              }`}
            >
              <input
                type="text"
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                onKeyDown={handleKeyDown}
                placeholder="Ask AI in English or বাংলা..."
                maxLength={2000}
                disabled={busy}
                className={`min-w-0 flex-1 bg-transparent px-2.5 py-2 text-xs outline-none ${
                  dark
                    ? "text-white placeholder:text-slate-600"
                    : "text-slate-900 placeholder:text-slate-400"
                }`}
              />

              <button
                type="button"
                onClick={handleSend}
                disabled={busy || !input.trim()}
                aria-label="Send message"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send size={15} />
              </button>
            </div>

            <p
              className={`mt-2 text-center text-[9px] ${
                dark
                  ? "text-slate-700"
                  : "text-slate-400"
              }`}
            >
              AI replies may be inaccurate.
              Contact a manager to confirm.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================================
   STAT CARD
   ========================================================= */


function StatCard({
  numericValue,
  metricFormat = "integer",
  title,
  value,
  subtitle,
  icon,
  accent,
  dark,
}: {
  numericValue?: number;
  metricFormat?: MetricFormat;
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  accent: "cyan" | "emerald" | "purple" | "amber";
  dark: boolean;
}) {
  const changed = useMetricChanged(numericValue ?? value);
  const variants = {
    cyan: {
      background:
        "from-blue-700 via-blue-600 to-cyan-500",
      shadow: "shadow-blue-500/25",
      icon: "bg-white/20",
      glow: "bg-cyan-200/30",
      line: "bg-cyan-200",
    },
    emerald: {
      background:
        "from-emerald-700 via-emerald-600 to-teal-400",
      shadow: "shadow-emerald-500/25",
      icon: "bg-white/20",
      glow: "bg-green-200/30",
      line: "bg-green-200",
    },
    purple: {
      background:
        "from-violet-800 via-purple-600 to-fuchsia-500",
      shadow: "shadow-purple-500/25",
      icon: "bg-white/20",
      glow: "bg-fuchsia-200/30",
      line: "bg-fuchsia-200",
    },
    amber: {
      background:
        "from-orange-700 via-orange-600 to-amber-400",
      shadow: "shadow-orange-500/25",
      icon: "bg-white/20",
      glow: "bg-yellow-200/30",
      line: "bg-yellow-200",
    },
  };

  const style = variants[accent];

  return (
    <div
      data-accent={accent}
      className={`${styles.metricCard} ${changed ? styles.metricUpdated : ""} group relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br ${style.background} p-5 text-white shadow-xl ${style.shadow} transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-2xl`}
    >
      <div
        className={`${styles.metricGlow} pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl ${style.glow}`}
      />

      <div className="pointer-events-none absolute -bottom-14 -left-10 h-28 w-28 rounded-full bg-white/10 blur-2xl" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <span className={`${styles.metricTitle} text-[11px] font-bold uppercase tracking-[0.12em] text-white/90`}>
            {title}
          </span>

          <div
            className={`${styles.metricIcon} flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${style.icon} text-white shadow-inner`}
          >
            {icon}
          </div>
        </div>

        <p className={`${styles.metricValue} mt-5 break-words text-3xl font-black tracking-tight sm:text-4xl`}>
          {numericValue === undefined ? value : <AnimatedMetric value={numericValue} format={metricFormat} />}
        </p>

        <div className={`${styles.metricFooter} mt-5 flex items-center gap-2 border-t pt-3`}>
          <span
            className={`${styles.metricDot} h-2 w-2 shrink-0 rounded-full ${style.line}`}
          />

          <p className={`${styles.metricSubtitle} text-xs font-medium`}>
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   QUICK ACTION
   ========================================================= */


function QuickAction({
  title,
  subtitle,
  icon,
  accent,
  onClick,
  dark,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  accent: "blue" | "cyan" | "purple" | "green";
  onClick: () => void;
  dark: boolean;
}) {
  const variants = {
    blue: {
      gradient: "from-blue-700 via-blue-600 to-indigo-500",
      shadow: "hover:shadow-blue-500/30",
    },
    cyan: {
      gradient: "from-cyan-700 via-cyan-600 to-sky-400",
      shadow: "hover:shadow-cyan-500/30",
    },
    purple: {
      gradient: "from-violet-800 via-purple-600 to-fuchsia-500",
      shadow: "hover:shadow-purple-500/30",
    },
    green: {
      gradient: "from-emerald-700 via-green-600 to-teal-400",
      shadow: "hover:shadow-emerald-500/30",
    },
  };

  const style = variants[accent];

  return (
    <button
      type="button"
      onClick={onClick}
      data-accent={accent}
      className={`${styles.quickAction} group relative w-full overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br ${style.gradient} p-5 text-left text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-2xl ${style.shadow}`}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/15 blur-2xl" />

      <div className="relative z-10 flex items-center gap-4">
        <div className={`${styles.actionIcon} flex h-12 w-12 shrink-0 items-center justify-center rounded-xl`}>
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <p className={`${styles.actionTitle} font-bold`}>
            {title}
          </p>

          <p className={`${styles.actionSubtitle} mt-1 text-xs`}>
            {subtitle}
          </p>
        </div>

        <ChevronRight
          size={20}
          className={`${styles.actionArrow} shrink-0 transition-transform duration-300 group-hover:translate-x-1`}
        />
      </div>
    </button>
  );
}

/* =========================================================
   DATE FORMATTER
   ========================================================= */

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
   }
