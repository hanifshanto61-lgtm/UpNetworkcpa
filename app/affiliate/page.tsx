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
  FileText,
  Globe,
  Smartphone,
  Monitor,
  Clock3,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
  { label: "Dashboard", icon: Home, action: "dashboard" },
  { label: "Offers", icon: Target, action: "offers" },
  { label: "Smart Links", icon: Link2, action: "smartlinks" },
  { label: "Statistics", icon: BarChart3, action: "statistics" },
  { label: "Earnings", icon: Wallet, action: "earnings" },
  { label: "Referrals", icon: Users, action: "referrals" },
  { label: "Payments", icon: CreditCard, action: "payments" },
];

export default function AffiliatePage() {
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const [profile, setProfile] = useState<{
    id: string;
    affiliateId: string;
    email: string | null;
    name: string;
  } | null>(null);

  const [clicks, setClicks] = useState<ClickRow[]>([]);
  const [error, setError] = useState("");

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

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/affiliate/dashboard", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Unable to load dashboard."
        );
      }

      setProfile(data.profile || null);
      setClicks(data.clicks || []);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message || "Unable to load affiliate dashboard."
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

  const totalClicks = clicks.length;

  const conversions = useMemo(() => {
    return clicks.filter((row) => {
      const status = String(row.status || "").toLowerCase();

      return (
        status === "converted" ||
        status === "conversion" ||
        status === "approved" ||
        status === "paid" ||
        Boolean(row.converted_at)
      );
    }).length;
  }, [clicks]);

  const earnings = useMemo(() => {
    return clicks.reduce((total, row) => {
      const status = String(row.status || "").toLowerCase();

      const converted =
        status === "converted" ||
        status === "conversion" ||
        status === "approved" ||
        status === "paid" ||
        Boolean(row.converted_at);

      if (!converted) return total;

      const payout = Number(row.payout || 0);

      return total + (Number.isFinite(payout) ? payout : 0);
    }, 0);
  }, [clicks]);

  const conversionRate =
    totalClicks > 0
      ? ((conversions / totalClicks) * 100).toFixed(2)
      : "0.00";

  const affiliateId = profile?.affiliateId || "Loading...";

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
      await navigator.clipboard.writeText(smartLink);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(error);
    }
  }

  function navigateMenu(action: string) {
    setMenuOpen(false);

    if (action === "dashboard") {
      router.push("/affiliate");
      return;
    }

    if (action === "offers") {
      router.push("/affiliate/offers");
      return;
    }

    if (action === "smartlinks") {
      document
        .getElementById("smart-link")
        ?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (action === "statistics") {
      document
        .getElementById("statistics")
        ?.scrollIntoView({ behavior: "smooth" });
      return;
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#05070c] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />
          <p className="text-sm text-slate-400">
            Loading affiliate dashboard...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#05070c] text-white">

      {/* ================================================= */}
      {/* UPNETWORK CPA LOGO BACKGROUND */}
      {/* ================================================= */}

      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 bg-center bg-no-repeat"
          style={{
            backgroundImage:
              "url('/file_000000013688207a03d42a2550c1954.png')",
            backgroundSize: "min(720px, 82vw)",
            opacity: 0.08,
          }}
        />

        <div className="absolute inset-0 bg-[#05070c]/80" />
      </div>

      <div className="relative z-10">

        {/* ================================================= */}
        {/* TOP BAR */}
        {/* ================================================= */}

        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#05070c]/90 backdrop-blur-xl">

          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">

            <div className="flex items-center gap-3">

              <button
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-400"
              >
                <Menu size={21} />
              </button>

              <div>
                <div className="text-lg font-extrabold tracking-tight">
                  UpNetwork
                  <span className="text-cyan-400">CPA</span>
                </div>

                <div className="text-[9px] uppercase tracking-[0.22em] text-slate-600">
                  Affiliate Panel
                </div>
              </div>

            </div>

            <div className="flex items-center gap-2">

              <div className="hidden rounded-xl border border-cyan-400/10 bg-cyan-400/[0.04] px-3 py-2 md:block">
                <p className="text-[9px] uppercase tracking-wider text-slate-600">
                  Affiliate ID
                </p>

                <p className="mt-0.5 max-w-[140px] truncate font-mono text-xs font-semibold text-cyan-400">
                  {affiliateId}
                </p>
              </div>

              <button
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setSettingsOpen(false);
                }}
                className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 transition hover:border-cyan-400/20 hover:bg-white/[0.07]"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-400">
                  <User size={16} />
                </div>

                <span className="hidden text-xs font-semibold sm:block">
                  Profile
                </span>
              </button>

              <button
                onClick={() => {
                  setSettingsOpen(!settingsOpen);
                  setProfileOpen(false);
                }}
                aria-label="Settings"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 transition hover:border-cyan-400/20 hover:text-cyan-400"
              >
                <Settings size={18} />
              </button>

              <button
                onClick={handleLogout}
                className="hidden h-10 items-center gap-2 rounded-xl border border-red-500/10 bg-red-500/[0.04] px-3 text-xs font-semibold text-red-400 transition hover:bg-red-500/10 sm:flex"
              >
                <LogOut size={16} />
                Logout
              </button>

            </div>
          </div>

          {profileOpen && (
            <div className="absolute right-4 top-[70px] z-50 w-64 rounded-2xl border border-white/10 bg-[#090d17] p-4 shadow-2xl sm:right-6">

              <div className="mb-4 flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-400">
                  <User size={20} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {profile?.name || "Affiliate"}
                  </p>

                  <p className="truncate text-xs text-slate-600">
                    {profile?.email || ""}
                  </p>
                </div>

              </div>

              <div className="rounded-xl bg-white/[0.03] p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-600">
                  Affiliate ID
                </p>

                <p className="mt-1 break-all font-mono text-xs text-cyan-400">
                  {affiliateId}
                </p>
              </div>

              <button
                onClick={() => {
                  setProfileOpen(false);
                  setSettingsOpen(true);
                }}
                className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
              >
                <Settings size={17} />
                Profile Settings
              </button>

              <button
                onClick={handleLogout}
                className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-red-400 hover:bg-red-500/10"
              >
                <LogOut size={17} />
                Logout
              </button>

            </div>
          )}

          {settingsOpen && (
            <div className="absolute right-4 top-[70px] z-50 w-64 rounded-2xl border border-white/10 bg-[#090d17] p-4 shadow-2xl sm:right-6">

              <div className="mb-3 flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                  <Settings size={18} />
                </div>

                <div>
                  <p className="text-sm font-bold">
                    Settings
                  </p>

                  <p className="text-xs text-slate-600">
                    Account preferences
                  </p>
                </div>

              </div>

              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-slate-500">
                Profile and account settings are
                available here.
              </div>

              <button
                onClick={() => setSettingsOpen(false)}
                className="mt-3 w-full rounded-xl bg-white/5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                Close
              </button>

            </div>
          )}

        </header>

        {menuOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
        )}

        <aside
          className={`fixed left-0 top-0 z-[60] h-full w-[290px] max-w-[88vw] border-r border-white/10 bg-[#090d17] shadow-2xl transition-transform duration-300 ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col">

            <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">

              <div>
                <p className="font-bold">
                  Affiliate Menu
                </p>

                <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-600">
                  UpNetworkCPA
                </p>
              </div>

              <button
                onClick={() => setMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>

            </div>

            <div className="border-b border-white/10 p-5">

              <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-400">
                  <User size={20} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {profile?.name || "Affiliate"}
                  </p>

                  <p className="truncate text-xs text-slate-600">
                    {profile?.email || ""}
                  </p>
                </div>

              </div>

            </div>

            <nav className="flex-1 overflow-y-auto p-4">

              <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                Dashboard
              </p>

              <div className="space-y-1">

                {mainMenu.map((item) => {
                  const Icon = item.icon;
                  const active =
                    item.action === "dashboard";

                  return (
                    <button
                      key={item.label}
                      onClick={() =>
                        navigateMenu(item.action)
                      }
                      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                        active
                          ? "bg-cyan-400/10 text-cyan-400"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon
                        size={18}
                        className={
                          active
                            ? "text-cyan-400"
                            : "text-slate-600 group-hover:text-cyan-400"
                        }
                      />

                      <span className="flex-1">
                        {item.label}
                      </span>

                      <ChevronRight
                        size={15}
                        className="text-slate-700"
                      />
                    </button>
                  );
                })}

              </div>

              <p className="mb-3 mt-7 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                Account
              </p>

              <div className="space-y-1">

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setProfileOpen(true);
                  }}
                  className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-400 hover:bg-white/5 hover:text-white"
                >
                  <User
                    size={18}
                    className="text-slate-600 group-hover:text-cyan-400"
                  />

                  <span className="flex-1">
                    My Account
                  </span>

                  <ChevronRight size={15} />
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setSettingsOpen(true);
                  }}
                  className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-400 hover:bg-white/5 hover:text-white"
                >
                  <Settings
                    size={18}
                    className="text-slate-600 group-hover:text-cyan-400"
                  />

                  <span className="flex-1">
                    Settings
                  </span>

                  <ChevronRight size={15} />
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setManagerOpen(true);
                  }}
                  className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-400 hover:bg-white/5 hover:text-white"
                >
                  <MessageCircle
                    size={18}
                    className="text-slate-600 group-hover:text-cyan-400"
                  />

                  <span className="flex-1">
                    Contact Manager
                  </span>

                  <ChevronRight size={15} />
                </button>

              </div>

            </nav>

            <div className="border-t border-white/10 p-4">

              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-red-400 hover:bg-red-500/10"
              >
                <LogOut size={18} />
                Logout
              </button>

            </div>

          </div>
        </aside>

        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:py-9">

          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <section className="mb-7">

            <p className="text-sm font-medium text-cyan-400">
              Welcome back 👋
            </p>

            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {profile?.name || "Affiliate Dashboard"}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Track your traffic, conversions,
              earnings and affiliate performance.
            </p>

          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <ColorCard
              title="Total Clicks"
              value={totalClicks.toLocaleString()}
              subtitle="All tracked clicks"
              icon={<MousePointerClick size={21} />}
              iconBox="bg-blue-500/15 text-blue-400"
              border="hover:border-blue-400/30"
              glow="bg-blue-500/5"
            />

            <ColorCard
              title="Conversions"
              value={conversions.toLocaleString()}
              subtitle="Successful conversions"
              icon={<TrendingUp size={21} />}
              iconBox="bg-emerald-500/15 text-emerald-400"
              border="hover:border-emerald-400/30"
              glow="bg-emerald-500/5"
            />

            <ColorCard
              title="Earnings"
              value={`$${earnings.toFixed(2)}`}
              subtitle="Total affiliate earnings"
              icon={<DollarSign size={21} />}
              iconBox="bg-purple-500/15 text-purple-400"
              border="hover:border-purple-400/30"
              glow="bg-purple-500/5"
            />

            <ColorCard
              title="Conversion Rate"
              value={`${conversionRate}%`}
              subtitle="Current conversion rate"
              icon={<Activity size={21} />}
              iconBox="bg-orange-500/15 text-orange-400"
              border="hover:border-orange-400/30"
              glow="bg-orange-500/5"
            />

          </section>

          <section className="mt-6">

            <div className="mb-4">
              <h2 className="text-lg font-bold">
                Dashboard Files
              </h2>

              <p className="mt-1 text-xs text-slate-600">
                Quick access to your affiliate tools.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              <FileCard
                title="Offers"
                subtitle="Browse available offers"
                icon={<Target size={20} />}
                className="border-yellow-500/10 hover:border-yellow-400/30"
                iconClass="bg-yellow-500/10 text-yellow-400"
                onClick={() =>
                  router.push("/affiliate/offers")
                }
              />

              <FileCard
                title="Smart Links"
                subtitle="Manage tracking links"
                icon={<Link2 size={20} />}
                className="border-cyan-500/10 hover:border-cyan-400/30"
                iconClass="bg-cyan-500/10 text-cyan-400"
                onClick={() =>
                  document
                    .getElementById("smart-link")
                    ?.scrollIntoView({
                      behavior: "smooth",
                    })
                }
              />

              <FileCard
                title="Statistics"
                subtitle="Analyze your traffic"
                icon={<BarChart3 size={20} />}
                className="border-pink-500/10 hover:border-pink-400/30"
                iconClass="bg-pink-500/10 text-pink-400"
                onClick={() =>
                  document
                    .getElementById("statistics")
                    ?.scrollIntoView({
                      behavior: "smooth",
                    })
                }
              />

              <FileCard
                title="Payments"
                subtitle="Payment information"
                icon={<CreditCard size={20} />}
                className="border-indigo-500/10 hover:border-indigo-400/30"
                iconClass="bg-indigo-500/10 text-indigo-400"
                onClick={() => {}}
              />

            </div>

          </section>

          <section
            id="smart-link"
            className="mt-6 overflow-hidden rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.025]"
          >

            <div className="flex flex-col gap-5 p-5 sm:p-6">

              <div className="flex items-start justify-between gap-4">

                <div className="flex items-start gap-3">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-400">
                    <Link2 size={21} />
                  </div>

                  <div>
                    <h2 className="font-bold">
                      Your Smart Link
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Share this link to track your
                      affiliate traffic.
                    </p>
                  </div>

                </div>

                <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                  Active
                </span>

              </div>

              <div className="flex flex-col gap-3 sm:flex-row">

                <div className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="truncate font-mono text-xs text-slate-400">
                    {smartLink}
                  </p>
                </div>

                <button
                  onClick={copySmartLink}
                  className="flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300"
                >
                  {copied ? (
                    <>
                      <Check size={17} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={17} />
                      Copy Link
                    </>
                  )}
                </button>

              </div>

            </div>

          </section>

          <section
            id="statistics"
            className="mt-6 grid gap-6 lg:grid-cols-2"
          >

            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">

              <div className="mb-6 flex items-center justify-between">

                <div>
                  <h2 className="font-bold">
                    Performance
                  </h2>

                  <p className="mt-1 text-xs text-slate-600">
                    Current affiliate activity
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10 text-pink-400">
                  <BarChart3 size={19} />
                </div>

              </div>

              <div className="space-y-5">

                <ProgressRow
                  label="Clicks"
                  value={totalClicks}
                  max={Math.max(totalClicks, 1)}
                  barClass="bg-blue-400"
                />

                <ProgressRow
                  label="Conversions"
                  value={conversions}
                  max={Math.max(totalClicks, 1)}
                  barClass="bg-emerald-400"
                />

                <ProgressRow
                  label="Conversion Rate"
                  value={Number(conversionRate)}
                  max={100}
                  suffix="%"
                  barClass="bg-orange-400"
                />

              </div>

            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">

              <div className="mb-5 flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                  <FileText size={20} />
                </div>

                <div>
                  <h2 className="font-bold">
                    Affiliate Account
                  </h2>

                  <p className="text-xs text-slate-600">
                    Account information
                  </p>
                </div>

              </div>

              <div className="space-y-3">

                <InfoRow
                  label="Name"
                  value={profile?.name || "Affiliate"}
                />

                <InfoRow
                  label="Email"
                  value={profile?.email || "-"}
                />

                <InfoRow
                  label="Affiliate ID"
                  value={affiliateId}
                />

                <InfoRow
                  label="Status"
                  value="Active"
                  valueClass="text-emerald-400"
                />

              </div>

            </div>

          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-3">

            <MiniFile
              icon={<Globe size={19} />}
              title="Traffic"
              value={totalClicks.toLocaleString()}
              subtitle="Tracked visits"
              iconClass="bg-blue-500/10 text-blue-400"
            />

            <MiniFile
              icon={<Smartphone size={19} />}
              title="Mobile"
              value={countDevice(
                clicks,
                "mobile"
              ).toLocaleString()}
              subtitle="Mobile traffic"
              iconClass="bg-green-500/10 text-green-400"
            />

            <MiniFile
              icon={<Monitor size={19} />}
              title="Desktop"
              value={countDevice(
                clicks,
                "desktop"
              ).toLocaleString()}
              subtitle="Desktop traffic"
              iconClass="bg-purple-500/10 text-purple-400"
            />

          </section>

          <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-5">

            <div className="mb-5 flex items-center justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                  <Clock3 size={19} />
                </div>

                <div>
                  <h2 className="font-bold">
                    Recent Activity
                  </h2>

                  <p className="mt-1 text-xs text-slate-600">
                    Latest affiliate activity
                  </p>
                </div>

              </div>

              <span className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate-500">
                {clicks.length} records
              </span>

            </div>

            {clicks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 py-12 text-center">

                <MousePointerClick
                  size={30}
                  className="mx-auto mb-3 text-slate-700"
                />

                <p className="text-sm text-slate-500">
                  No activity yet
                </p>

                <p className="mt-1 text-xs text-slate-700">
                  Start sharing your smart link
                  to generate traffic.
                </p>

              </div>
            ) : (
              <div className="overflow-x-auto">

                <table className="w-full min-w-[680px] text-left text-sm">

                  <thead>
                    <tr className="border-b border-white/10 text-xs text-slate-600">

                      <th className="px-3 py-3 font-medium">
                        Date
                      </th>

                      <th className="px-3 py-3 font-medium">
                        Country
                      </th>

                      <th className="px-3 py-3 font-medium">
                        Device
                      </th>

                      <th className="px-3 py-3 font-medium">
                        Status
                      </th>

                      <th className="px-3 py-3 text-right font-medium">
                        Payout
                      </th>

                    </tr>
                  </thead>

                  <tbody>

                    {clicks.slice(0, 10).map(
                      (row, index) => {

                        const status = String(
                          row.status || "click"
                        );

                        const isConverted =
                          [
                            "converted",
                            "conversion",
                            "approved",
                            "paid",
                          ].includes(
                            status.toLowerCase()
                          ) ||
                          Boolean(row.converted_at);

                        return (
                          <tr
                            key={
                              row.click_id ||
                              `${row.created_at}-${index}`
                            }
                            className="border-b border-white/5 last:border-0"
                          >

                            <td className="px-3 py-4 text-slate-400">
                              {formatDate(
                                row.created_at
                              )}
                            </td>

                            <td className="px-3 py-4 text-slate-500">
                              {row.country || "-"}
                            </td>

                            <td className="px-3 py-4 text-slate-500">
                              {row.device || "-"}
                            </td>

                            <td className="px-3 py-4">

                              <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                  isConverted
                                    ? "bg-emerald-400/10 text-emerald-400"
                                    : "bg-slate-400/10 text-slate-500"
                                }`}
                              >
                                {isConverted
                                  ? "Converted"
                                  : "Click"}
                              </span>

                            </td>

                            <td className="px-3 py-4 text-right font-semibold text-cyan-400">
                              $
                              {Number(
                                row.payout || 0
                              ).toFixed(2)}
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

          <section className="mt-6">

            <div className="mb-4">
              <h2 className="text-lg font-bold">
                Quick Actions
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">

              <FileCard
                title="Browse Offers"
                subtitle="Find offers to promote"
                icon={<Target size={20} />}
                className="border-yellow-500/10 hover:border-yellow-400/30"
                iconClass="bg-yellow-500/10 text-yellow-400"
                onClick={() =>
                  router.push("/affiliate/offers")
                }
              />

              <FileCard
                title="Copy Smart Link"
                subtitle="Copy your tracking link"
                icon={<Link2 size={20} />}
                className="border-cyan-500/10 hover:border-cyan-400/30"
                iconClass="bg-cyan-500/10 text-cyan-400"
                onClick={copySmartLink}
              />

              <FileCard
                title="Contact Manager"
                subtitle="Talk with your manager"
                icon={<MessageCircle size={20} />}
                className="border-green-500/10 hover:border-green-400/30"
                iconClass="bg-green-500/10 text-green-400"
                onClick={() => setManagerOpen(true)}
              />

            </div>

          </section>

          <footer className="py-10 text-center text-xs text-slate-700">
            © {new Date().getFullYear()} UpNetworkCPA
            <span className="mx-2">•</span>
            Affiliate Panel
          </footer>

        </div>

        {managerOpen && (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
            onClick={() => setManagerOpen(false)}
          >

            <div
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[#090d17] p-5 shadow-2xl"
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              <div className="mb-5 flex items-center justify-between">

                <div>
                  <h2 className="font-bold">
                    Contact Manager
                  </h2>

                  <p className="mt-1 text-xs text-slate-600">
                    Choose a panel manager on
                    Telegram.
                  </p>
                </div>

                <button
                  onClick={() => setManagerOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X size={18} />
                </button>

              </div>

              <div className="space-y-3">

                {PANEL_MANAGERS.map(
                  (manager, index) => (
                    <a
                      key={manager.id}
                      href={manager.telegramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-4 transition hover:border-cyan-400/30 hover:bg-cyan-400/5"
                    >

                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-400">
                        <MessageCircle size={19} />
                      </div>

                      <div className="flex-1">

                        <p className="text-sm font-semibold">
                          Manager {index + 1}
                        </p>

                        <p className="mt-0.5 text-xs text-cyan-400">
                          {manager.telegram}
                        </p>

                      </div>

                      <ChevronRight
                        size={17}
                        className="text-slate-700"
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

function ColorCard({
  title,
  value,
  subtitle,
  icon,
  iconBox,
  border,
  glow,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  iconBox: string;
  border: string;
  glow: string;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition duration-300 ${border}`}
    >

      <div
        className={`absolute -right-8 -top-8 h-28 w-28 rounded-full blur-3xl ${glow}`}
      />

      <div className="relative">

        <div className="mb-5 flex items-center justify-between">

          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </span>

          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBox}`}
          >
            {icon}
          </div>

        </div>

        <p className="text-2xl font-extrabold tracking-tight">
          {value}
        </p>

        <p className="mt-2 text-xs text-slate-600">
          {subtitle}
        </p>

      </div>
    </div>
  );
}

function FileCard({
  title,
  subtitle,
  icon,
  className,
  iconClass,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  className?: string;
  iconClass?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group w-full rounded-2xl border bg-white/[0.02] p-5 text-left transition duration-300 hover:bg-white/[0.045] ${className || ""}`}
    >

      <div className="flex items-center gap-4">

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            iconClass || "bg-white/5 text-slate-400"
          }`}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">

          <p className="font-semibold text-slate-200">
            {title}
          </p>

          <p className="mt-1 truncate text-xs text-slate-600">
            {subtitle}
          </p>

        </div>

        <ChevronRight
          size={17}
          className="text-slate-700 transition group-hover:translate-x-1 group-hover:text-slate-400"
        />

      </div>
    </button>
  );
}

function MiniFile({
  icon,
  title,
  value,
  subtitle,
  iconClass,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  subtitle: string;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">

      <div className="flex items-center gap-3">

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>

        <div>

          <p className="text-xs text-slate-600">
            {title}
          </p>

          <p className="text-xl font-bold">
            {value}
          </p>

        </div>

      </div>

      <p className="mt-3 text-xs text-slate-700">
        {subtitle}
      </p>

    </div>
  );
}

function ProgressRow({
  label,
  value,
  max,
  suffix = "",
  barClass,
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  barClass: string;
}) {
  const percentage =
    max > 0
      ? Math.min(
          100,
          Math.max(0, (value / max) * 100)
        )
      : 0;

  return (
    <div>

      <div className="mb-2 flex items-center justify-between text-xs">

        <span className="text-slate-500">
          {label}
        </span>

        <span className="font-semibold text-slate-300">
          {value.toLocaleString()}
          {suffix}
        </span>

      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/5">

        <div
          className={`h-full rounded-full transition-all duration-700 ${barClass}`}
          style={{
            width: `${percentage}%`,
          }}
        />

      </div>

    </div>
  );
}

function InfoRow({
  label,
  value,
  valueClass = "text-slate-300",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-white/[0.02] px-3 py-3">

      <span className="text-xs text-slate-600">
        {label}
      </span>

      <span
        className={`max-w-[65%] truncate text-right text-xs font-semibold ${valueClass}`}
      >
        {value}
      </span>

    </div>
  );
}

function countDevice(
  clicks: ClickRow[],
  type: string
) {
  return clicks.filter((row) => {
    const device = String(
      row.device || ""
    ).toLowerCase();

    return device.includes(type);
  }).length;
}

function formatDate(value?: string) {
  if (!value) return "-";

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
