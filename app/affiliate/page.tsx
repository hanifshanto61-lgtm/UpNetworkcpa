"use client";

import { useEffect, useMemo, useState } from "react";
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
  Bot,
  Send,
  HelpCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import NotificationBell from "./notification-bell";
import { useAffiliateTheme } from "./theme-context";

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

  const [panelSettings, setPanelSettings] =
    useState<PanelSettings>(DEFAULT_PANEL_SETTINGS);

  const dark = theme === "dark";

  function featureEnabled(feature: string): boolean {
    return panelSettings[feature] !== false;
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

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

      const dashboardResponse = await fetch(
        "/api/affiliate/dashboard",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        }
      );

      const dashboardData = await dashboardResponse.json();

      if (!dashboardResponse.ok) {
        throw new Error(
          dashboardData?.error ||
            "Unable to load dashboard."
        );
      }

      setProfile(dashboardData.profile || null);

      setClicks(
        Array.isArray(dashboardData.clicks)
          ? dashboardData.clicks
          : []
      );

      setStats({
        totalClicks:
          Number(
            dashboardData?.stats?.totalClicks
          ) || 0,

        conversions:
          Number(
            dashboardData?.stats?.conversions
          ) || 0,

        earnings:
          Number(
            dashboardData?.stats?.earnings
          ) || 0,

        conversionRate:
          Number(
            dashboardData?.stats?.conversionRate
          ) || 0,
      });

      try {
        const settingsResponse = await fetch(
          "/api/affiliate/panel-settings",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            cache: "no-store",
          }
        );

        if (settingsResponse.ok) {
          const settingsData =
            await settingsResponse.json();

          if (
            Array.isArray(
              settingsData?.settings
            )
          ) {
            const nextSettings = {
              ...DEFAULT_PANEL_SETTINGS,
            };

            settingsData.settings.forEach(
              (item: {
                feature_key?: string;
                enabled?: boolean;
              }) => {
                if (
                  item.feature_key &&
                  typeof item.enabled ===
                    "boolean"
                ) {
                  nextSettings[
                    item.feature_key
                  ] = item.enabled;
                }
              }
            );

            setPanelSettings(nextSettings);
          }
        }
      } catch (settingsError) {
        console.error(
          "Affiliate panel settings error:",
          settingsError
        );

        setPanelSettings(
          DEFAULT_PANEL_SETTINGS
        );
      }
    } catch (err: any) {
      console.error(
        "Affiliate dashboard error:",
        err
      );

      setError(
        err?.message ||
          "Unable to load affiliate dashboard."
      );
    } finally {
      setLoading(false);
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
    ? "bg-[#05070c] text-white"
    : "bg-slate-50 text-slate-900";

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
    return (
      <main
        className={`flex min-h-screen items-center justify-center ${pageBg}`}
      >
        <div className="text-center">
          <div
            className={`mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-4 ${
              dark
                ? "border-slate-700 border-t-cyan-400"
                : "border-slate-200 border-t-cyan-500"
            }`}
          />

          <p
            className={`text-sm ${muted}`}
          >
            Loading affiliate dashboard...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      className={`relative min-h-screen overflow-x-hidden transition-colors duration-300 ${pageBg}`}
    >
      {/* Background */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
      >
        <div
          className={`absolute inset-0 ${
            dark
              ? "bg-[#05070c]"
              : "bg-slate-50"
          }`}
        />

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
          className={`sticky top-0 z-40 border-b backdrop-blur-2xl ${
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

              <NotificationBell />

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
                className={`absolute right-4 top-[70px] z-50 w-64 rounded-2xl border p-4 shadow-2xl sm:right-6 ${panelBg} ${border}`}
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
                className={`absolute right-4 top-[70px] z-50 w-64 rounded-2xl border p-4 shadow-2xl sm:right-6 ${panelBg} ${border}`}
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
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9">
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
                className={`relative overflow-hidden rounded-3xl border p-6 shadow-xl sm:p-8 ${
                  dark
                    ? "border-cyan-400/15 bg-gradient-to-br from-cyan-500/[0.12] via-purple-500/[0.06] to-white/[0.02]"
                    : "border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-purple-50"
                }`}
              >
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

                <div className="absolute -bottom-28 right-24 h-56 w-56 rounded-full bg-purple-500/10 blur-3xl" />

                <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                  <div className="max-w-2xl">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-500">
                      <Zap size={12} />
                      Affiliate Dashboard
                    </div>

                    <h1 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
                      Welcome back,{" "}
                      <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                        {profile?.name ||
                          "Affiliate"}
                      </span>
                    </h1>

                    <p
                      className={`mt-3 max-w-xl text-sm leading-6 ${muted}`}
                    >
                      Manage your offers, smart links,
                      traffic, conversions, earnings and
                      referrals from one powerful dashboard.
                    </p>
                  </div>

                  <div
                    className={`hidden rounded-2xl border p-4 lg:block ${
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
                          className={`mt-1 text-[10px] ${faint}`}
                        >
                          Ready to generate traffic
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Stats */}
              <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Total Clicks"
                  value={totalClicks.toLocaleString()}
                  subtitle="All tracked traffic"
                  icon={
                    <MousePointerClick
                      size={21}
                    />
                  }
                  accent="cyan"
                  dark={dark}
                />

                <StatCard
                  title="Conversions"
                  value={conversions.toLocaleString()}
                  subtitle="Approved conversions"
                  icon={
                    <TrendingUp
                      size={21}
                    />
                  }
                  accent="emerald"
                  dark={dark}
                />

                <StatCard
                  title="Conversion Rate"
                  value={`${conversionRate}%`}
                  subtitle="Traffic to conversion"
                  icon={
                    <Activity size={21} />
                  }
                  accent="purple"
                  dark={dark}
                />

                <StatCard
                  title="Earnings"
                  value={`$${earnings.toFixed(
                    2
                  )}`}
                  subtitle="Total recorded payout"
                  icon={
                    <DollarSign
                      size={21}
                    />
                  }
                  accent="amber"
                  dark={dark}
                />
              </section>

              {/* Smart Link */}
              {featureEnabled(
                "smart_links"
              ) && (
                <section
                  className={`relative mt-6 overflow-hidden rounded-2xl border p-5 sm:p-6 ${
                    dark
                      ? "border-cyan-400/15 bg-gradient-to-br from-cyan-500/[0.09] via-cyan-500/[0.03] to-transparent"
                      : "border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-white"
                  }`}
                >
                  <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />

                  <div className="relative z-10">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
                        <Link2 size={21} />
                      </div>

                      <div>
                        <h2 className="font-bold">
                          Your Smart Link
                        </h2>

                        <p
                          className={`mt-1 text-xs ${faint}`}
                        >
                          Use this link to track your traffic
                          and conversions.
                        </p>
                      </div>
                    </div>

                    <div
                      className={`flex flex-col gap-3 rounded-xl border p-3 sm:flex-row ${
                        dark
                          ? "border-cyan-400/10 bg-black/10"
                          : "border-cyan-100 bg-white"
                      }`}
                    >
                      <div
                        className={`min-w-0 flex-1 overflow-hidden rounded-lg px-3 py-3 font-mono text-xs ${
                          dark
                            ? "bg-white/[0.04] text-cyan-300"
                            : "bg-slate-50 text-cyan-700"
                        }`}
                      >
                        <div className="truncate">
                          {smartLink}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={copySmartLink}
                        className={`flex shrink-0 items-center justify-center gap-2 rounded-lg px-5 py-3 text-xs font-bold transition ${
                          copied
                            ? "bg-emerald-500 text-white"
                            : "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20 hover:bg-cyan-400"
                        }`}
                      >
                        {copied ? (
                          <>
                            <Check size={16} />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy size={16} />
                            Copy Link
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* Quick Actions */}
              <section className="mt-6">
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
                className={`relative mt-6 overflow-hidden rounded-2xl border p-5 sm:p-6 ${
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
                                  className={`border-b last:border-0 ${
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
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
            onClick={() =>
              setMenuOpen(false)
            }
          >
            <aside
              className={`absolute left-0 top-0 flex h-full w-[290px] flex-col border-r shadow-2xl ${
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
          featureEnabled(
            "manager_contact"
          ) && (
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
              onClick={() =>
                setManagerOpen(
                  false
                )
              }
            >
              <div
                className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl ${panelBg} ${border}`}
                onClick={(event) =>
                  event.stopPropagation()
                }
              >
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold">
                      Contact Manager
                    </h2>

                    <p
                      className={`mt-1 text-xs ${faint}`}
                    >
                      Choose a panel manager on
                      Telegram.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setManagerOpen(
                        false
                      )
                    }
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      dark
                        ? "bg-white/5 text-slate-400"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-3">
                  {PANEL_MANAGERS.map(
                    (
                      manager,
                      index
                    ) => (
                      <a
                        key={
                          manager.id
                        }
                        href={
                          manager.telegramUrl
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-3 rounded-xl border p-4 transition ${
                          dark
                            ? "border-white/10 bg-white/[0.025] hover:border-cyan-400/30 hover:bg-cyan-400/5"
                            : "border-slate-200 bg-slate-50 hover:border-cyan-300 hover:bg-cyan-50"
                        }`}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-500">
                          <MessageCircle
                            size={19}
                          />
                        </div>

                        <div className="flex-1">
                          <p className="text-sm font-semibold">
                            Manager{" "}
                            {index + 1}
                          </p>

                          <p className="mt-0.5 text-xs text-cyan-500">
                            {
                              manager.telegram
                            }
                          </p>
                        </div>

                        <ChevronRight
                          size={17}
                          className={
                            dark
                              ? "text-slate-700"
                              : "text-slate-400"
                          }
                        />
                      </a>
                    )
                  )}
                </div>
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

  const [messages, setMessages] = useState<
    ChatMessage[]
  >([
    {
      id: 1,
      sender: "bot",
      text:
        "Hello! 👋 Welcome to UpNetwork CPA Support. How can I help you today?",
    },
  ]);

  const [input, setInput] = useState("");

  const quickButtons = [
    {
      label: "Offers",
      action: "offers",
    },
    {
      label: "Smart Links",
      action: "smartlink",
    },
    {
      label: "Earnings",
      action: "earnings",
    },
    {
      label: "Statistics",
      action: "statistics",
    },
    {
      label: "Payments",
      action: "payments",
    },
    {
      label: "Verification",
      action: "verification",
    },
    {
      label: "Talk to Manager",
      action: "manager",
    },
  ];

  function addMessage(
    sender: "bot" | "user",
    text: string
  ) {
    setMessages((current) => [
      ...current,
      {
        id:
          Date.now() +
          Math.random(),
        sender,
        text,
      },
    ]);
  }

  function botReply(action: string) {
    if (action === "offers") {
      addMessage(
        "bot",
        "You can browse available CPA campaigns from the Offers section. Select an offer and use its tracking link according to the campaign rules."
      );
      router.push("/affiliate/offers");
      return;
    }

    if (action === "smartlink") {
      addMessage(
        "bot",
        "Your Smart Link is available on the dashboard. Use it to send traffic and track clicks and conversions."
      );
      router.push("/affiliate/smart-link");
      return;
    }

    if (action === "earnings") {
      addMessage(
        "bot",
        "Your recorded CPA earnings can be checked from the Earnings section."
      );
      router.push("/affiliate/earnings");
      return;
    }

    if (action === "statistics") {
      addMessage(
        "bot",
        "The Statistics section shows your traffic and conversion performance."
      );
      router.push("/affiliate/statistics");
      return;
    }

    if (action === "payments") {
      addMessage(
        "bot",
        "You can check your payment information and payment history from the Payments section."
      );
      router.push("/affiliate/payments");
      return;
    }

    if (action === "verification") {
      addMessage(
        "bot",
        "If your account or email verification has an issue, please contact a manager from the Contact Manager option. They can check your account status."
      );
      return;
    }

    if (action === "manager") {
      addMessage(
        "bot",
        "Sure. I am opening the manager contact options for you."
      );
      openManager();
      return;
    }

    const text = action.toLowerCase();

    if (
      text.includes("offer") ||
      text.includes("campaign")
    ) {
      botReply("offers");
      return;
    }

    if (
      text.includes("smart") ||
      text.includes("link")
    ) {
      botReply("smartlink");
      return;
    }

    if (
      text.includes("earning") ||
      text.includes("income") ||
      text.includes("money")
    ) {
      botReply("earnings");
      return;
    }

    if (
      text.includes("statistic") ||
      text.includes("stats") ||
      text.includes("traffic") ||
      text.includes("click")
    ) {
      botReply("statistics");
      return;
    }

    if (
      text.includes("payment") ||
      text.includes("withdraw")
    ) {
      botReply("payments");
      return;
    }

    if (
      text.includes("verify") ||
      text.includes("verification") ||
      text.includes("email")
    ) {
      botReply("verification");
      return;
    }

    if (
      text.includes("manager") ||
      text.includes("support") ||
      text.includes("help")
    ) {
      botReply("manager");
      return;
    }

    if (
      text.includes("hello") ||
      text.includes("hi") ||
      text.includes("hey") ||
      text.includes("assalamu")
    ) {
      addMessage(
        "bot",
        "Hello! 👋 I can help you with Offers, Smart Links, Statistics, Earnings, Payments, verification, or manager support."
      );
      return;
    }

    if (
      text.includes("ধন্যবাদ") ||
      text.includes("thanks") ||
      text.includes("thank")
    ) {
      addMessage(
        "bot",
        "You're welcome! 😊 If you need anything else, just ask."
      );
      return;
    }

    addMessage(
      "bot",
      "I can help with Offers, Smart Links, Statistics, Earnings, Payments, account verification, or contacting a manager. Please choose one of the options below."
    );
  }

  function handleQuickAction(
    action: string
  ) {
    const button =
      quickButtons.find(
        (item) =>
          item.action === action
      );

    if (button) {
      addMessage(
        "user",
        button.label
      );
    }

    setTimeout(() => {
      botReply(action);
    }, 250);
  }

  function handleSend() {
    const value =
      input.trim();

    if (!value) {
      return;
    }

    addMessage(
      "user",
      value
    );

    setInput("");

    setTimeout(() => {
      botReply(value);
    }, 250);
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
      {/* Floating button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open UpNetwork Support Chat"
          className="fixed bottom-5 right-5 z-[90] flex items-center gap-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-2xl shadow-cyan-500/30 transition hover:-translate-y-1 hover:shadow-cyan-500/40"
        >
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
            <Bot size={19} />

            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-cyan-500" />
          </span>

          <span className="hidden sm:block">
            UpNetwork Support
          </span>
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div
          className={`fixed bottom-4 right-4 z-[90] flex h-[min(680px,calc(100vh-32px))] w-[calc(100vw-32px)] max-w-[390px] flex-col overflow-hidden rounded-3xl border shadow-2xl ${
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
                  <Bot size={22} />
                </div>

                <div>
                  <p className="font-black">
                    UpNetwork Support
                  </p>

                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-cyan-50">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                    Online Support
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                aria-label="Close support chat"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map(
              (message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender ===
                    "user"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  {message.sender ===
                    "bot" && (
                    <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-500">
                      <Bot size={14} />
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-5 ${
                      message.sender ===
                      "user"
                        ? "rounded-br-md bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                        : dark
                          ? "rounded-bl-md bg-white/[0.06] text-slate-300"
                          : "rounded-bl-md bg-slate-100 text-slate-700"
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              )
            )}
          </div>

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
              {quickButtons.map(
                (button) => (
                  <button
                    type="button"
                    key={
                      button.action
                    }
                    onClick={() =>
                      handleQuickAction(
                        button.action
                      )
                    }
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-semibold transition ${
                      dark
                        ? "border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-300"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-600"
                    }`}
                  >
                    {button.label}
                  </button>
                )
              )}
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
                  setInput(
                    event.target.value
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                placeholder="Ask support..."
                className={`min-w-0 flex-1 bg-transparent px-2.5 py-2 text-xs outline-none ${
                  dark
                    ? "text-white placeholder:text-slate-600"
                    : "text-slate-900 placeholder:text-slate-400"
                }`}
              />

              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim()}
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
              UpNetwork CPA Support Assistant
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
  title,
  value,
  subtitle,
  icon,
  accent,
  dark,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  accent:
    | "cyan"
    | "emerald"
    | "purple"
    | "amber";
  dark: boolean;
}) {
  const styles = {
    cyan: {
      darkCard:
        "border-cyan-400/15 bg-gradient-to-br from-cyan-500/[0.12] via-cyan-500/[0.035] to-transparent shadow-[0_0_35px_rgba(34,211,238,0.06)]",
      lightCard:
        "border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-white shadow-sm",
      icon:
        "bg-cyan-500/10 text-cyan-400",
      value: "text-cyan-400",
      line: "bg-cyan-400",
      glow: "bg-cyan-400/10",
    },

    emerald: {
      darkCard:
        "border-emerald-400/15 bg-gradient-to-br from-emerald-500/[0.12] via-emerald-500/[0.035] to-transparent shadow-[0_0_35px_rgba(16,185,129,0.06)]",
      lightCard:
        "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white shadow-sm",
      icon:
        "bg-emerald-500/10 text-emerald-400",
      value: "text-emerald-400",
      line: "bg-emerald-400",
      glow: "bg-emerald-400/10",
    },

    purple: {
      darkCard:
        "border-purple-400/15 bg-gradient-to-br from-purple-500/[0.12] via-purple-500/[0.035] to-transparent shadow-[0_0_35px_rgba(168,85,247,0.06)]",
      lightCard:
        "border-purple-200 bg-gradient-to-br from-purple-50 via-white to-white shadow-sm",
      icon:
        "bg-purple-500/10 text-purple-400",
      value: "text-purple-400",
      line: "bg-purple-400",
      glow: "bg-purple-400/10",
    },

    amber: {
      darkCard:
        "border-amber-400/15 bg-gradient-to-br from-amber-500/[0.12] via-amber-500/[0.035] to-transparent shadow-[0_0_35px_rgba(245,158,11,0.06)]",
      lightCard:
        "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white shadow-sm",
      icon:
        "bg-amber-500/10 text-amber-400",
      value: "text-amber-400",
      line: "bg-amber-400",
      glow: "bg-amber-400/10",
    },
  };

  const style = styles[accent];

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 ${
        dark
          ? style.darkCard
          : style.lightCard
      }`}
    >
      <div
        className={`absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl ${style.glow}`}
      />

      <div
        className={`absolute left-0 top-0 h-1 w-full opacity-70 ${style.line}`}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between gap-3">
          <span
            className={`text-[10px] font-bold uppercase tracking-[0.14em] ${
              dark
                ? "text-slate-500"
                : "text-slate-400"
            }`}
          >
            {title}
          </span>

          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${style.icon}`}
          >
            {icon}
          </div>
        </div>

        <p
          className={`mt-5 text-3xl font-black tracking-tight ${style.value}`}
        >
          {value}
        </p>

        <div className="mt-3 flex items-center gap-2">
          <div
            className={`h-1.5 w-1.5 rounded-full ${style.line}`}
          />

          <p
            className={`text-xs ${
              dark
                ? "text-slate-500"
                : "text-slate-400"
            }`}
          >
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
  accent:
    | "blue"
    | "cyan"
    | "purple"
    | "green";
  onClick: () => void;
  dark: boolean;
}) {
  const styles = {
    blue: {
      dark:
        "border-blue-400/15 bg-blue-500/[0.05] hover:border-blue-400/30 hover:bg-blue-500/[0.09]",
      light:
        "border-blue-100 bg-blue-50/60 hover:border-blue-200 hover:bg-blue-50",
      icon:
        "bg-blue-500/10 text-blue-400",
      arrow:
        "group-hover:text-blue-400",
    },

    cyan: {
      dark:
        "border-cyan-400/15 bg-cyan-500/[0.05] hover:border-cyan-400/30 hover:bg-cyan-500/[0.09]",
      light:
        "border-cyan-100 bg-cyan-50/60 hover:border-cyan-200 hover:bg-cyan-50",
      icon:
        "bg-cyan-500/10 text-cyan-400",
      arrow:
        "group-hover:text-cyan-400",
    },

    purple: {
      dark:
        "border-purple-400/15 bg-purple-500/[0.05] hover:border-purple-400/30 hover:bg-purple-500/[0.09]",
      light:
        "border-purple-100 bg-purple-50/60 hover:border-purple-200 hover:bg-purple-50",
      icon:
        "bg-purple-500/10 text-purple-400",
      arrow:
        "group-hover:text-purple-400",
    },

    green: {
      dark:
        "border-emerald-400/15 bg-emerald-500/[0.05] hover:border-emerald-400/30 hover:bg-emerald-500/[0.09]",
      light:
        "border-emerald-100 bg-emerald-50/60 hover:border-emerald-200 hover:bg-emerald-50",
      icon:
        "bg-emerald-500/10 text-emerald-400",
      arrow:
        "group-hover:text-emerald-400",
    },
  };

  const style = styles[accent];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 hover:-translate-y-0.5 ${
        dark
          ? style.dark
          : style.light
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${style.icon}`}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={`font-bold ${
              dark
                ? "text-slate-200"
                : "text-slate-700"
            }`}
          >
            {title}
          </p>

          <p
            className={`mt-1 text-xs ${
              dark
                ? "text-slate-500"
                : "text-slate-400"
            }`}
          >
            {subtitle}
          </p>
        </div>

        <ChevronRight
          size={17}
          className={`text-slate-500 transition ${style.arrow}`}
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

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return date.toLocaleString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
  }
