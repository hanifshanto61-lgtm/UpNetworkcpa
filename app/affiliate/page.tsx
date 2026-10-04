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

const mainMenu = [
  {
    label: "Dashboard",
    icon: Home,
    action: "dashboard",
  },
  {
    label: "Offers",
    icon: Target,
    action: "offers",
  },
  {
    label: "Smart Links",
    icon: Link2,
    action: "smartlinks",
  },
  {
    label: "Statistics",
    icon: BarChart3,
    action: "statistics",
  },
  {
    label: "Earnings",
    icon: Wallet,
    action: "earnings",
  },
  {
    label: "Referrals",
    icon: Users,
    action: "referrals",
  },
  {
    label: "Payments",
    icon: CreditCard,
    action: "payments",
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

  const dark = theme === "dark";

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

      const response = await fetch(
        "/api/affiliate/dashboard",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Unable to load dashboard."
        );
      }

      setProfile(data.profile || null);

      setClicks(
        Array.isArray(data.clicks)
          ? data.clicks
          : []
      );
    } catch (err: any) {
      console.error(err);

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

  const totalClicks = clicks.length;

  const conversions = useMemo(() => {
    return clicks.filter((row) => {
      const status = String(
        row.status || ""
      ).toLowerCase();

      return (
        [
          "converted",
          "conversion",
          "approved",
          "paid",
        ].includes(status) ||
        Boolean(row.converted_at)
      );
    }).length;
  }, [clicks]);

  const earnings = useMemo(() => {
    return clicks.reduce((total, row) => {
      const status = String(
        row.status || ""
      ).toLowerCase();

      const converted =
        [
          "converted",
          "conversion",
          "approved",
          "paid",
        ].includes(status) ||
        Boolean(row.converted_at);

      if (!converted) {
        return total;
      }

      const payout = Number(row.payout || 0);

      return (
        total +
        (Number.isFinite(payout) ? payout : 0)
      );
    }, 0);
  }, [clicks]);

  const conversionRate =
    totalClicks > 0
      ? (
          (conversions / totalClicks) *
          100
        ).toFixed(2)
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

          <p className={`text-sm ${muted}`}>
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
          className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 bg-contain bg-center bg-no-repeat opacity-20 sm:h-[700px] sm:w-[700px]"
          style={{
            backgroundImage:
              "url('/file_000000013688207a03d42a2550c1954.png')",
            opacity: dark ? 0.20 : 0.06,
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
                onClick={() => setMenuOpen(true)}
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
                    dark ? "light" : "dark"
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
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(
                    (value) => !value
                  );
                  setSettingsOpen(false);
                }}
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

              {/* Settings */}
              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(
                    (value) => !value
                  );
                  setProfileOpen(false);
                }}
                aria-label="Settings"
                className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                  dark
                    ? "border-white/10 bg-white/[0.04] text-slate-400 hover:text-cyan-400"
                    : "border-slate-200 bg-white text-slate-500 hover:text-cyan-500"
                }`}
              >
                <Settings size={18} />
              </button>

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
          {profileOpen && (
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

              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  router.push(
                    "/affiliate/settings"
                  );
                }}
                className={`mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm ${
                  dark
                    ? "text-slate-400 hover:bg-white/5 hover:text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Settings size={17} />
                Profile Settings
              </button>

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
          {settingsOpen && (
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
                onClick={() => {
                  setSettingsOpen(false);
                  router.push(
                    "/affiliate/settings"
                  );
                }}
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
                    <ShieldCheck size={22} />
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
              subtitle="Tracked traffic"
              icon={
                <MousePointerClick size={21} />
              }
              accent="cyan"
              dark={dark}
            />

            <StatCard
              title="Conversions"
              value={conversions.toLocaleString()}
              subtitle="Approved conversions"
              icon={
                <TrendingUp size={21} />
              }
              accent="emerald"
              dark={dark}
            />

            <StatCard
              title="Conversion Rate"
              value={`${conversionRate}%`}
              subtitle="Traffic to conversion"
              icon={<Activity size={21} />}
              accent="purple"
              dark={dark}
            />

            <StatCard
              title="Earnings"
              value={`$${earnings.toFixed(2)}`}
              subtitle="Total recorded payout"
              icon={<DollarSign size={21} />}
              accent="amber"
              dark={dark}
            />
          </section>

          {/* Smart Link */}
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

              <p className={`hidden text-xs sm:block ${faint}`}>
                Jump directly to important sections
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <QuickAction
                title="Browse Offers"
                subtitle="Find available campaigns"
                icon={<Target size={20} />}
                accent="blue"
                onClick={() =>
                  router.push(
                    "/affiliate/offers"
                  )
                }
                dark={dark}
              />

              <QuickAction
                title="Smart Links"
                subtitle="Manage tracking links"
                icon={<Link2 size={20} />}
                accent="cyan"
                onClick={() =>
                  router.push(
                    "/affiliate/smart-link"
                  )
                }
                dark={dark}
              />

              <QuickAction
                title="Statistics"
                subtitle="Analyze your traffic"
                icon={<BarChart3 size={20} />}
                accent="purple"
                onClick={() =>
                  router.push(
                    "/affiliate/statistics"
                  )
                }
                dark={dark}
              />

              <QuickAction
                title="Contact Manager"
                subtitle="Talk with your manager"
                icon={
                  <MessageCircle size={20} />
                }
                accent="green"
                onClick={() =>
                  setManagerOpen(true)
                }
                dark={dark}
              />
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
                <ChevronRight size={15} />
              </button>
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
                  No activity yet
                </p>

                <p
                  className={`mt-1 text-xs ${faint}`}
                >
                  Start sharing your Smart Link to
                  generate traffic.
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
                      .map((row, index) => {
                        const status = String(
                          row.status || "click"
                        ).toLowerCase();

                        const converted =
                          [
                            "converted",
                            "conversion",
                            "approved",
                            "paid",
                          ].includes(status) ||
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
                              {row.country || "-"}
                            </td>

                            <td
                              className={`px-3 py-4 text-xs ${muted}`}
                            >
                              {row.device || "-"}
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
                                row.payout || 0
                              ).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

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

            <span className="mx-2">•</span>

            Affiliate Panel
          </footer>
        </div>

        {/* Sidebar */}
        {menuOpen && (
          <div
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
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
                  {mainMenu.map((item) => {
                    const Icon = item.icon;

                    const active =
                      item.action ===
                      "dashboard";

                    return (
                      <button
                        type="button"
                        key={item.action}
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
                        <Icon size={18} />

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
                  })}
                </nav>

                <div
                  className={`my-5 border-t ${
                    dark
                      ? "border-white/10"
                      : "border-slate-200"
                  }`}
                />

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setManagerOpen(true);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${
                    dark
                      ? "text-green-400 hover:bg-green-500/10"
                      : "text-green-600 hover:bg-green-50"
                  }`}
                >
                  <MessageCircle size={18} />
                  Contact Manager
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push(
                      "/affiliate/settings"
                    );
                  }}
                  className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${
                    dark
                      ? "text-slate-400 hover:bg-white/5 hover:text-white"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Settings size={18} />
                  Settings
                </button>
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
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/10"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Manager Modal */}
        {managerOpen && (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
            onClick={() =>
              setManagerOpen(false)
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
                    setManagerOpen(false)
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
                  (manager, index) => (
                    <a
                      key={manager.id}
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
                          {manager.telegram}
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
      </div>
    </main>
  );
}

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
  accent: "cyan" | "emerald" | "purple" | "amber";
  dark: boolean;
}) {
  const styles = {
    cyan: {
      darkCard:
        "border-cyan-400/15 bg-gradient-to-br from-cyan-500/[0.12] via-cyan-500/[0.035] to-transparent shadow-[0_0_35px_rgba(34,211,238,0.06)]",
      lightCard:
        "border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-white shadow-sm",
      icon: "bg-cyan-500/10 text-cyan-400",
      value: "text-cyan-400",
      line: "bg-cyan-400",
      glow: "bg-cyan-400/10",
    },

    emerald: {
      darkCard:
        "border-emerald-400/15 bg-gradient-to-br from-emerald-500/[0.12] via-emerald-500/[0.035] to-transparent shadow-[0_0_35px_rgba(16,185,129,0.06)]",
      lightCard:
        "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white shadow-sm",
      icon: "bg-emerald-500/10 text-emerald-400",
      value: "text-emerald-400",
      line: "bg-emerald-400",
      glow: "bg-emerald-400/10",
    },

    purple: {
      darkCard:
        "border-purple-400/15 bg-gradient-to-br from-purple-500/[0.12] via-purple-500/[0.035] to-transparent shadow-[0_0_35px_rgba(168,85,247,0.06)]",
      lightCard:
        "border-purple-200 bg-gradient-to-br from-purple-50 via-white to-white shadow-sm",
      icon: "bg-purple-500/10 text-purple-400",
      value: "text-purple-400",
      line: "bg-purple-400",
      glow: "bg-purple-400/10",
    },

    amber: {
      darkCard:
        "border-amber-400/15 bg-gradient-to-br from-amber-500/[0.12] via-amber-500/[0.035] to-transparent shadow-[0_0_35px_rgba(245,158,11,0.06)]",
      lightCard:
        "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white shadow-sm",
      icon: "bg-amber-500/10 text-amber-400",
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
  const styles = {
    blue: {
      dark:
        "border-blue-400/15 bg-blue-500/[0.05] hover:border-blue-400/30 hover:bg-blue-500/[0.09]",
      light:
        "border-blue-100 bg-blue-50/60 hover:border-blue-200 hover:bg-blue-50",
      icon: "bg-blue-500/10 text-blue-400",
      arrow: "group-hover:text-blue-400",
    },

    cyan: {
      dark:
        "border-cyan-400/15 bg-cyan-500/[0.05] hover:border-cyan-400/30 hover:bg-cyan-500/[0.09]",
      light:
        "border-cyan-100 bg-cyan-50/60 hover:border-cyan-200 hover:bg-cyan-50",
      icon: "bg-cyan-500/10 text-cyan-400",
      arrow: "group-hover:text-cyan-400",
    },

    purple: {
      dark:
        "border-purple-400/15 bg-purple-500/[0.05] hover:border-purple-400/30 hover:bg-purple-500/[0.09]",
      light:
        "border-purple-100 bg-purple-50/60 hover:border-purple-200 hover:bg-purple-50",
      icon: "bg-purple-500/10 text-purple-400",
      arrow: "group-hover:text-purple-400",
    },

    green: {
      dark:
        "border-emerald-400/15 bg-emerald-500/[0.05] hover:border-emerald-400/30 hover:bg-emerald-500/[0.09]",
      light:
        "border-emerald-100 bg-emerald-50/60 hover:border-emerald-200 hover:bg-emerald-50",
      icon: "bg-emerald-500/10 text-emerald-400",
      arrow: "group-hover:text-emerald-400",
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
