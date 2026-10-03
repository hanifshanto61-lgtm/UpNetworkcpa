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
  Sun,
  Moon,
  Percent,
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

type Referral = {
  id?: string;
  affiliateId?: string;
  email?: string;
  name?: string;
  status?: string;
  joinedAt?: string | null;
};

type ReferralCommission = {
  id?: string;
  referredAffiliateId?: string;
  clickId?: string | null;
  sourceEarnings?: number;
  commissionRate?: number;
  commissionAmount?: number;
  status?: string;
  createdAt?: string | null;
  paidAt?: string | null;
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
  const [referralCopied, setReferralCopied] = useState(false);

  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [referralCommissions, setReferralCommissions] = useState<
    ReferralCommission[]
  >([]);

  const [referralLoading, setReferralLoading] = useState(false);
  const [referralError, setReferralError] = useState("");

  const [referralRate, setReferralRate] = useState(5);
  const [totalReferralCommission, setTotalReferralCommission] = useState(0);
  const [pendingReferralCommission, setPendingReferralCommission] =
    useState(0);
  const [paidReferralCommission, setPaidReferralCommission] = useState(0);

  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const [profile, setProfile] = useState<{
    id: string;
    affiliateId: string;
    email: string | null;
    name: string;
  } | null>(null);

  const [clicks, setClicks] = useState<ClickRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("affiliate-theme");

    if (saved === "light" || saved === "dark") {
      setTheme(saved);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, []);

  function changeTheme(next: "light" | "dark") {
    setTheme(next);
    localStorage.setItem("affiliate-theme", next);
  }

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

      await loadReferrals(
        sessionData.session.access_token
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

  async function loadReferrals(accessToken: string) {
    try {
      setReferralLoading(true);
      setReferralError("");

      const response = await fetch(
        "/api/affiliate/referrals",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to load referrals."
        );
      }

      setReferrals(
        Array.isArray(data.referrals)
          ? data.referrals
          : []
      );

      setReferralCommissions(
        Array.isArray(data.commissions)
          ? data.commissions
          : []
      );

      setReferralRate(
        Number(data.commissionRate || 5)
      );

      setTotalReferralCommission(
        Number(data.totalCommission || 0)
      );

      setPendingReferralCommission(
        Number(data.pendingCommission || 0)
      );

      setPaidReferralCommission(
        Number(data.paidCommission || 0)
      );
    } catch (err: any) {
      console.error(
        "Referral loading error:",
        err
      );

      setReferralError(
        err?.message ||
          "Unable to load referrals."
      );

      setReferrals([]);
      setReferralCommissions([]);
      setTotalReferralCommission(0);
      setPendingReferralCommission(0);
      setPaidReferralCommission(0);
    } finally {
      setReferralLoading(false);
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

  const conversions = useMemo(
    () =>
      clicks.filter((row) => {
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
      }).length,
    [clicks]
  );

  const earnings = useMemo(
    () =>
      clicks.reduce((total, row) => {
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

        const payout = Number(
          row.payout || 0
        );

        return (
          total +
          (Number.isFinite(payout)
            ? payout
            : 0)
        );
      }, 0),
    [clicks]
  );

  const conversionRate =
    totalClicks > 0
      ? (
          (conversions / totalClicks) *
          100
        ).toFixed(2)
      : "0.00";

  const affiliateId =
    profile?.affiliateId ||
    "Loading...";

  const smartLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/track?aid=${encodeURIComponent(
          affiliateId
        )}&sl=default-smartlink`
      : `/api/track?aid=${encodeURIComponent(
          affiliateId
        )}&sl=default-smartlink`;

  const referralLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/signup?ref=${encodeURIComponent(
          affiliateId
        )}`
      : `/signup?ref=${encodeURIComponent(
          affiliateId
        )}`;

  async function copyReferralLink() {
    try {
      await navigator.clipboard.writeText(
        referralLink
      );

      setReferralCopied(true);

      setTimeout(
        () => setReferralCopied(false),
        2000
      );
    } catch (err) {
      console.error(err);
    }
  }

  async function copySmartLink() {
    try {
      await navigator.clipboard.writeText(
        smartLink
      );

      setCopied(true);

      setTimeout(
        () => setCopied(false),
        2000
      );
    } catch (err) {
      console.error(err);
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

    const sectionMap: Record<
      string,
      string
    > = {
      offers: "offers",
      smartlinks: "smart-link",
      statistics: "statistics",
      earnings: "earnings",
      referrals: "referrals",
      payments: "payments",
    };

    const sectionId =
      sectionMap[action];

    if (sectionId) {
      setTimeout(() => {
        document
          .getElementById(sectionId)
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 100);
    }
  }

  const dark = theme === "dark";

  const pageBg = dark
    ? "bg-[#05070c] text-white"
    : "bg-slate-50 text-slate-900";

  const panelBg = dark
    ? "bg-[#090d17]"
    : "bg-white";

  const cardBg = dark
    ? "bg-white/[0.025]"
    : "bg-white";

  const border = dark
    ? "border-white/10"
    : "border-slate-200";

  const muted = dark
    ? "text-slate-500"
    : "text-slate-500";

  const faint = dark
    ? "text-slate-600"
    : "text-slate-400";

  if (loading) {
    return (
      <main
        className={`min-h-screen flex items-center justify-center ${pageBg}`}
      >
        <div className="text-center">
          <div
            className={`mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 ${
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
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
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
          className="absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 bg-center bg-contain bg-no-repeat sm:h-[700px] sm:w-[700px] lg:h-[820px] lg:w-[820px]"
          style={{
            backgroundImage:
              "url('/file_000000013688207a03d42a2550c1954.png')",
            opacity: dark ? 0.30 : 0.12,
            filter: dark
              ? "drop-shadow(0 0 35px rgba(245,158,11,0.08))"
              : "drop-shadow(0 0 25px rgba(245,158,11,0.05))",
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            background: dark
              ? "radial-gradient(circle at center, rgba(5,7,12,0.08) 0%, rgba(5,7,12,0.30) 52%, rgba(5,7,12,0.68) 100%)"
              : "radial-gradient(circle at center, rgba(248,250,252,0.10) 0%, rgba(248,250,252,0.52) 55%, rgba(248,250,252,0.88) 100%)",
          }}
        />
      </div>

      <div className="relative z-10">
        <header
          className={`sticky top-0 z-40 border-b backdrop-blur-xl ${
            dark
              ? "border-white/10 bg-[#05070c]/90"
              : "border-slate-200 bg-white/90"
          }`}
        >
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  setMenuOpen(true)
                }
                aria-label="Open menu"
                className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                  dark
                    ? "border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-400"
                    : "border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-600"
                }`}
              >
                <Menu size={21} />
              </button>

              <div>
                <div className="text-lg font-extrabold tracking-tight">
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
              <div
                className={`hidden rounded-xl border px-3 py-2 md:block ${
                  dark
                    ? "border-cyan-400/10 bg-cyan-400/[0.04]"
                    : "border-cyan-100 bg-cyan-50"
                }`}
              >
                <p
                  className={`text-[9px] uppercase tracking-wider ${faint}`}
                >
                  Affiliate ID
                </p>

                <p className="mt-0.5 max-w-[140px] truncate font-mono text-xs font-semibold text-cyan-500">
                  {affiliateId}
                </p>
              </div>

              <button
                onClick={() =>
                  changeTheme(
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
                    ? "border-white/10 bg-white/[0.04] text-amber-300 hover:bg-amber-400/10"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {dark ? (
                  <Sun size={18} />
                ) : (
                  <Moon size={18} />
                )}
              </button>

              <button
                onClick={() => {
                  setProfileOpen(
                    !profileOpen
                  );
                  setSettingsOpen(false);
                }}
                className={`flex h-10 items-center gap-2 rounded-xl border px-3 transition ${
                  dark
                    ? "border-white/10 bg-white/[0.04] hover:border-cyan-400/20 hover:bg-white/[0.07]"
                    : "border-slate-200 bg-white hover:border-cyan-300 hover:bg-cyan-50"
                }`}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-500">
                  <User size={16} />
                </div>

                <span
                  className={`hidden text-xs font-semibold sm:block ${
                    dark
                      ? "text-white"
                      : "text-slate-700"
                  }`}
                >
                  Profile
                </span>
              </button>

              <button
                onClick={() => {
                  setSettingsOpen(
                    !settingsOpen
                  );
                  setProfileOpen(false);
                }}
                aria-label="Settings"
                className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                  dark
                    ? "border-white/10 bg-white/[0.04] text-slate-400 hover:border-cyan-400/20 hover:text-cyan-400"
                    : "border-slate-200 bg-white text-slate-500 hover:border-cyan-300 hover:text-cyan-500"
                }`}
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
                onClick={() => {
                  setProfileOpen(false);
                  setSettingsOpen(true);
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
                onClick={handleLogout}
                className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-red-400 hover:bg-red-500/10"
              >
                <LogOut size={17} />
                Logout
              </button>
            </div>
          )}

          {settingsOpen && (
            <div
              className={`absolute right-4 top-[70px] z-50 w-72 rounded-2xl border p-4 shadow-2xl sm:right-6 ${panelBg} ${border}`}
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                  <Settings size={18} />
                </div>

                <div>
                  <p className="text-sm font-bold">
                    Settings
                  </p>

                  <p
                    className={`text-xs ${faint}`}
                  >
                    Account preferences
                  </p>
                </div>
              </div>

              <div
                className={`rounded-xl border p-3 ${border}`}
              >
                <p
                  className={`mb-3 text-xs font-semibold ${muted}`}
                >
                  Appearance
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      changeTheme("light")
                    }
                    className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-semibold transition ${
                      theme === "light"
                        ? "border-cyan-400 bg-cyan-400/10 text-cyan-500"
                        : dark
                        ? "border-white/10 bg-white/5 text-slate-400"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                    }`}
                  >
                    <Sun size={16} />
                    Light
                  </button>

                  <button
                    onClick={() =>
                      changeTheme("dark")
                    }
                    className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-semibold transition ${
                      theme === "dark"
                        ? "border-cyan-400 bg-cyan-400/10 text-cyan-400"
                        : dark
                        ? "border-white/10 bg-white/5 text-slate-400"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                    }`}
                  >
                    <Moon size={16} />
                    Dark
                  </button>
                </div>
              </div>

              <button
                onClick={() =>
                  setSettingsOpen(false)
                }
                className={`mt-3 w-full rounded-xl py-2.5 text-xs font-semibold ${
                  dark
                    ? "bg-white/5 text-slate-300 hover:bg-white/10"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Close
              </button>
            </div>
          )}
        </header>

        {menuOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={() =>
              setMenuOpen(false)
            }
          />
        )}

        <aside
          className={`fixed left-0 top-0 z-[60] h-full w-[290px] max-w-[88vw] border-r shadow-2xl transition-transform duration-300 ${
            dark
              ? "border-white/10 bg-[#090d17]"
              : "border-slate-200 bg-white"
          } ${
            menuOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col">
            <div
              className={`flex items-center justify-between border-b px-5 py-5 ${
                dark
                  ? "border-white/10"
                  : "border-slate-200"
              }`}
            >
              <div>
                <p className="font-bold">
                  Affiliate Menu
                </p>

                <p
                  className={`mt-1 text-[10px] uppercase tracking-widest ${faint}`}
                >
                  UpNetworkCPA
                </p>
              </div>

              <button
                onClick={() =>
                  setMenuOpen(false)
                }
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  dark
                    ? "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                <X size={18} />
              </button>
            </div>

            <div
              className={`border-b p-5 ${
                dark
                  ? "border-white/10"
                  : "border-slate-200"
              }`}
            >
              <div
                className={`flex items-center gap-3 rounded-2xl border p-3 ${
                  dark
                    ? "border-white/5 bg-white/[0.03]"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-500">
                  <User size={20} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
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
            </div>

            <nav className="flex-1 overflow-y-auto p-4">
              <p
                className={`mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] ${faint}`}
              >
                Dashboard
              </p>

              <div className="space-y-1">
                {mainMenu.map(
                  (item) => {
                    const Icon = item.icon;
                    const active =
                      item.action ===
                      "dashboard";

                    return (
                      <button
                        key={
                          item.label
                        }
                        onClick={() =>
                          navigateMenu(
                            item.action
                          )
                        }
                        className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                          active
                            ? "bg-cyan-400/10 text-cyan-500"
                            : dark
                            ? "text-slate-400 hover:bg-white/5 hover:text-white"
                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <Icon
                          size={18}
                          className={
                            active
                              ? "text-cyan-500"
                              : dark
                              ? "text-slate-600 group-hover:text-cyan-400"
                              : "text-slate-400 group-hover:text-cyan-500"
                          }
                        />

                        <span className="flex-1">
                          {item.label}
                        </span>

                        <ChevronRight
                          size={15}
                        />
                      </button>
                    );
                  }
                )}
              </div>

              <p
                className={`mb-3 mt-7 px-3 text-[10px] font-bold uppercase tracking-[0.2em] ${faint}`}
              >
                Account
              </p>

              <div className="space-y-1">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setProfileOpen(
                      true
                    );
                  }}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ${
                    dark
                      ? "text-slate-400 hover:bg-white/5 hover:text-white"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <User size={18} />
                  <span className="flex-1">
                    My Account
                  </span>
                  <ChevronRight
                    size={15}
                  />
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setSettingsOpen(
                      true
                    );
                  }}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ${
                    dark
                      ? "text-slate-400 hover:bg-white/5 hover:text-white"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Settings size={18} />
                  <span className="flex-1">
                    Settings
                  </span>
                  <ChevronRight
                    size={15}
                  />
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setManagerOpen(
                      true
                    );
                  }}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ${
                    dark
                      ? "text-slate-400 hover:bg-white/5 hover:text-white"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <MessageCircle
                    size={18}
                  />
                  <span className="flex-1">
                    Contact Manager
                  </span>
                  <ChevronRight
                    size={15}
                  />
                </button>
              </div>
            </nav>

            <div
              className={`border-t p-4 ${
                dark
                  ? "border-white/10"
                  : "border-slate-200"
              }`}
            >
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
            <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          <section
            className="mb-7"
            id="dashboard"
          >
            <p className="text-sm font-medium text-cyan-500">
              Welcome back 👋
            </p>

            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {profile?.name ||
                "Affiliate Dashboard"}
            </h1>

            <p
              className={`mt-2 text-sm ${muted}`}
            >
              Track your traffic,
              conversions, earnings and
              affiliate performance.
            </p>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ColorCard
              title="Total Clicks"
              value={totalClicks.toLocaleString()}
              subtitle="All tracked clicks"
              icon={
                <MousePointerClick
                  size={21}
                />
              }
              iconBox="bg-cyan-500/15 text-cyan-500"
              border="hover:border-cyan-400/40"
              glow="bg-cyan-500/10"
              valueClass="text-cyan-500"
              accent="bg-cyan-400"
              dark={dark}
            />

            <ColorCard
              title="Conversions"
              value={conversions.toLocaleString()}
              subtitle="Successful conversions"
              icon={
                <TrendingUp
                  size={21}
                />
              }
              iconBox="bg-emerald-500/15 text-emerald-500"
              border="hover:border-emerald-400/40"
              glow="bg-emerald-500/10"
              valueClass="text-emerald-500"
              accent="bg-emerald-400"
              dark={dark}
            />

            <ColorCard
              title="Earnings"
              value={`$${earnings.toFixed(
                2
              )}`}
              subtitle="Total affiliate earnings"
              icon={
                <DollarSign
                  size={21}
                />
              }
              iconBox="bg-amber-500/15 text-amber-500"
              border="hover:border-amber-400/40"
              glow="bg-amber-500/10"
              valueClass="text-amber-500"
              accent="bg-amber-400"
              dark={dark}
            />

            <ColorCard
              title="Conversion Rate"
              value={`${conversionRate}%`}
              subtitle="Current conversion rate"
              icon={
                <Activity
                  size={21}
                />
              }
              iconBox="bg-violet-500/15 text-violet-500"
              border="hover:border-violet-400/40"
              glow="bg-violet-500/10"
              valueClass="text-violet-500"
              accent="bg-violet-400"
              dark={dark}
            />
          </section>

          <section
            id="offers"
            className="mt-6 scroll-mt-24"
          >
            <div className="mb-4">
              <h2 className="text-lg font-bold">
                Dashboard Files
              </h2>

              <p
                className={`mt-1 text-xs ${faint}`}
              >
                Quick access to your
                affiliate tools.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FileCard
                title="Offers"
                subtitle="Browse available offers"
                icon={<Target size={20} />}
                className="border-yellow-500/10 hover:border-yellow-400/30"
                iconClass="bg-yellow-500/10 text-yellow-500"
                onClick={() =>
                  document
                    .getElementById(
                      "offers"
                    )
                    ?.scrollIntoView({
                      behavior:
                        "smooth",
                      block: "start",
                    })
                }
                dark={dark}
              />

              <FileCard
                title="Smart Links"
                subtitle="Manage tracking links"
                icon={<Link2 size={20} />}
                className="border-cyan-500/10 hover:border-cyan-400/30"
                iconClass="bg-cyan-500/10 text-cyan-500"
                onClick={() =>
                  document
                    .getElementById(
                      "smart-link"
                    )
                    ?.scrollIntoView({
                      behavior:
                        "smooth",
                      block: "start",
                    })
                }
                dark={dark}
              />

              <FileCard
                title="Statistics"
                subtitle="Analyze your traffic"
                icon={
                  <BarChart3
                    size={20}
                  />
                }
                className="border-pink-500/10 hover:border-pink-400/30"
                iconClass="bg-pink-500/10 text-pink-500"
                onClick={() =>
                  document
                    .getElementById(
                      "statistics"
                    )
                    ?.scrollIntoView({
                      behavior:
                        "smooth",
                      block: "start",
                    })
                }
                dark={dark}
              />

              <FileCard
                title="Payments"
                subtitle="Payment information"
                icon={
                  <CreditCard
                    size={20}
                  />
                }
                className="border-indigo-500/10 hover:border-indigo-400/30"
                iconClass="bg-indigo-500/10 text-indigo-500"
                onClick={() =>
                  document
                    .getElementById(
                      "payments"
                    )
                    ?.scrollIntoView({
                      behavior:
                        "smooth",
                      block: "start",
                    })
                }
                dark={dark}
              />
            </div>
          </section>

          <section
            id="smart-link"
            className={`mt-6 scroll-mt-24 overflow-hidden rounded-2xl border p-5 sm:p-6 ${
              dark
                ? "border-cyan-400/10 bg-cyan-400/[0.025]"
                : "border-cyan-100 bg-white"
            }`}
          >
            <div className="flex flex-col gap-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-500">
                    <Link2 size={21} />
                  </div>

                  <div>
                    <h2 className="font-bold">
                      Your Smart Link
                    </h2>

                    <p
                      className={`mt-1 text-xs ${muted}`}
                    >
                      Share this link to
                      track your affiliate
                      traffic.
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
                  Active
                </span>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div
                  className={`min-w-0 flex-1 rounded-xl border px-4 py-3 ${
                    dark
                      ? "border-white/10 bg-black/20"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <p
                    className={`truncate font-mono text-xs ${muted}`}
                  >
                    {smartLink}
                  </p>
                </div>

                <button
                  onClick={
                    copySmartLink
                  }
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
            className="mt-6 scroll-mt-24 grid gap-6 lg:grid-cols-2"
          >
            <div
              className={`rounded-2xl border p-5 ${border} ${cardBg}`}
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="font-bold">
                    Performance
                  </h2>

                  <p
                    className={`mt-1 text-xs ${faint}`}
                  >
                    Current affiliate
                    activity
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10 text-pink-500">
                  <BarChart3
                    size={19}
                  />
                </div>
              </div>

              <div className="space-y-5">
                <ProgressRow
                  label="Clicks"
                  value={totalClicks}
                  max={Math.max(
                    totalClicks,
                    1
                  )}
                  barClass="bg-cyan-400"
                  dark={dark}
                />

                <ProgressRow
                  label="Conversions"
                  value={conversions}
                  max={Math.max(
                    totalClicks,
                    1
                  )}
                  barClass="bg-emerald-400"
                  dark={dark}
                />

                <ProgressRow
                  label="Conversion Rate"
                  value={Number(
                    conversionRate
                  )}
                  max={100}
                  suffix="%"
                  barClass="bg-violet-400"
                  dark={dark}
                />
              </div>
            </div>

            <div
              className={`rounded-2xl border p-5 ${border} ${cardBg}`}
            >
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                  <FileText size={20} />
                </div>

                <div>
                  <h2 className="font-bold">
                    Affiliate Account
                  </h2>

                  <p
                    className={`text-xs ${faint}`}
                  >
                    Account information
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <InfoRow
                  label="Name"
                  value={
                    profile?.name ||
                    "Affiliate"
                  }
                  dark={dark}
                />

                <InfoRow
                  label="Email"
                  value={
                    profile?.email ||
                    "-"
                  }
                  dark={dark}
                />

                <InfoRow
                  label="Affiliate ID"
                  value={affiliateId}
                  dark={dark}
                />

                <InfoRow
                  label="Status"
                  value="Active"
                  valueClass="text-emerald-500"
                  dark={dark}
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
              iconClass="bg-blue-500/10 text-blue-500"
              dark={dark}
            />

            <MiniFile
              icon={
                <Smartphone
                  size={19}
                />
              }
              title="Mobile"
              value={countDevice(
                clicks,
                "mobile"
              ).toLocaleString()}
              subtitle="Mobile traffic"
              iconClass="bg-green-500/10 text-green-500"
              dark={dark}
            />

            <MiniFile
              icon={
                <Monitor
                  size={19}
                />
              }
              title="Desktop"
              value={countDevice(
                clicks,
                "desktop"
              ).toLocaleString()}
              subtitle="Desktop traffic"
              iconClass="bg-purple-500/10 text-purple-500"
              dark={dark}
            />
          </section>

          <section
            id="earnings"
            className={`mt-6 scroll-mt-24 rounded-2xl border p-5 sm:p-6 ${
              dark
                ? "border-amber-400/10 bg-white/[0.025]"
                : "border-amber-200 bg-white shadow-sm"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/10 text-amber-500">
                <Wallet size={20} />
              </div>

              <div>
                <h2 className="font-bold">
                  Earnings
                </h2>

                <p
                  className={`text-xs ${faint}`}
                >
                  Your current affiliate
                  earnings
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-amber-400/10 p-5">
              <p className="text-xs text-amber-500">
                Total Earnings
              </p>

              <p className="mt-1 text-3xl font-extrabold text-amber-500">
                ${earnings.toFixed(2)}
              </p>

              <p
                className={`mt-2 text-xs ${faint}`}
              >
                Based on tracked
                converted activity.
              </p>
            </div>
          </section>

          {/* =========================
              REFERRAL COMMISSION
          ========================== */}

          <section
            id="referrals"
            className={`mt-6 scroll-mt-24 rounded-2xl border p-5 sm:p-6 ${
              dark
                ? "border-violet-400/10 bg-white/[0.025]"
                : "border-violet-200 bg-white shadow-sm"
            }`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-400/10 text-violet-500">
                  <Users size={20} />
                </div>

                <div>
                  <h2 className="font-bold">
                    Referral Program
                  </h2>

                  <p
                    className={`text-xs ${faint}`}
                  >
                    Earn {referralRate}% commission
                    from your referred
                    affiliates.
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-violet-400/10 px-4 py-2 text-center">
                <p className="text-[10px] uppercase tracking-wider text-violet-500">
                  Referred Affiliates
                </p>

                <p className="text-xl font-extrabold text-violet-500">
                  {referrals.length}
                </p>
              </div>
            </div>

            {/* Commission Cards */}

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ReferralStatCard
                title="Commission Rate"
                value={`${referralRate}%`}
                subtitle="Lifetime referral rate"
                icon={
                  <Percent size={18} />
                }
                className="text-violet-500"
                iconClass="bg-violet-500/10 text-violet-500"
                dark={dark}
              />

              <ReferralStatCard
                title="Total Commission"
                value={`$${totalReferralCommission.toFixed(
                  2
                )}`}
                subtitle="All referral earnings"
                icon={
                  <DollarSign
                    size={18}
                  />
                }
                className="text-amber-500"
                iconClass="bg-amber-500/10 text-amber-500"
                dark={dark}
              />

              <ReferralStatCard
                title="Pending"
                value={`$${pendingReferralCommission.toFixed(
                  2
                )}`}
                subtitle="Awaiting payment"
                icon={
                  <Clock3 size={18} />
                }
                className="text-orange-500"
                iconClass="bg-orange-500/10 text-orange-500"
                dark={dark}
              />

              <ReferralStatCard
                title="Paid"
                value={`$${paidReferralCommission.toFixed(
                  2
                )}`}
                subtitle="Successfully paid"
                icon={
                  <Check size={18} />
                }
                className="text-emerald-500"
                iconClass="bg-emerald-500/10 text-emerald-500"
                dark={dark}
              />
            </div>

            {/* Referral Link */}

            <div className="mt-6">
              <p
                className={`mb-2 text-xs font-semibold ${muted}`}
              >
                Your Referral Link
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div
                  className={`min-w-0 flex-1 rounded-xl border px-4 py-3 ${
                    dark
                      ? "border-white/10 bg-black/20"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <p
                    className={`truncate font-mono text-xs ${muted}`}
                  >
                    {referralLink}
                  </p>
                </div>

                <button
                  onClick={
                    copyReferralLink
                  }
                  className="flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-sm font-bold text-white hover:bg-violet-600"
                >
                  {referralCopied ? (
                    <>
                      <Check size={17} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={17} />
                      Copy Referral
                    </>
                  )}
                </button>
              </div>

              <div className="mt-3 rounded-xl border border-violet-400/10 bg-violet-400/5 p-3">
                <p className="text-xs text-violet-500">
                  💰 You earn{" "}
                  <strong>
                    {referralRate}%
                  </strong>{" "}
                  of eligible earnings
                  generated by your
                  referred affiliates.
                </p>
              </div>
            </div>

            {/* Referral List */}

            <div className="mt-6">
              <p
                className={`mb-3 text-xs font-semibold ${muted}`}
              >
                Referred Affiliates
              </p>

              {referralLoading ? (
                <div
                  className={`rounded-xl border p-5 text-center text-sm ${border} ${faint}`}
                >
                  Loading referrals...
                </div>
              ) : referralError ? (
                <div className="rounded-xl border border-amber-300/30 bg-amber-400/10 p-4 text-xs text-amber-600">
                  {referralError}
                </div>
              ) : referrals.length ===
                0 ? (
                <div
                  className={`rounded-xl border border-dashed p-6 text-center ${
                    dark
                      ? "border-white/10"
                      : "border-slate-200"
                  }`}
                >
                  <Users
                    size={28}
                    className="mx-auto mb-2 text-violet-400"
                  />

                  <p
                    className={`text-sm ${muted}`}
                  >
                    No referred
                    affiliates yet.
                  </p>

                  <p
                    className={`mt-1 text-xs ${faint}`}
                  >
                    Share your referral
                    link to invite new
                    affiliates.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {referrals
                    .slice(0, 20)
                    .map(
                      (
                        referral
                      ) => (
                        <div
                          key={
                            referral.id
                          }
                          className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                            dark
                              ? "border-white/10 bg-white/[0.02]"
                              : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {referral.name ||
                                "Affiliate"}
                            </p>

                            <p
                              className={`truncate text-xs ${faint}`}
                            >
                              {referral.affiliateId ||
                                referral.email ||
                                "-"}
                            </p>
                          </div>

                          <span className="shrink-0 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-500">
                            Referred
                          </span>
                        </div>
                      )
                    )}
                </div>
              )}
            </div>

            {/* Commission History */}

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p
                    className={`text-xs font-semibold ${muted}`}
                  >
                    Commission History
                  </p>

                  <p
                    className={`mt-1 text-[10px] ${faint}`}
                  >
                    Your 5% referral earnings
                    from eligible conversions.
                  </p>
                </div>

                <span
                  className={`rounded-lg px-3 py-1.5 text-[10px] ${
                    dark
                      ? "bg-white/5 text-slate-500"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {referralCommissions.length} records
                </span>
              </div>

              {referralCommissions.length ===
              0 ? (
                <div
                  className={`rounded-xl border border-dashed p-6 text-center ${
                    dark
                      ? "border-white/10"
                      : "border-slate-200"
                  }`}
                >
                  <DollarSign
                    size={28}
                    className="mx-auto mb-2 text-amber-400"
                  />

                  <p
                    className={`text-sm ${muted}`}
                  >
                    No referral commission
                    yet.
                  </p>

                  <p
                    className={`mt-1 text-xs ${faint}`}
                  >
                    Commission will appear
                    here when a referred
                    affiliate generates an
                    eligible conversion.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left text-sm">
                    <thead>
                      <tr
                        className={`border-b text-xs ${
                          dark
                            ? "border-white/10 text-slate-600"
                            : "border-slate-200 text-slate-400"
                        }`}
                      >
                        <th className="px-3 py-3 font-medium">
                          Referred Affiliate
                        </th>

                        <th className="px-3 py-3 font-medium">
                          Source Earnings
                        </th>

                        <th className="px-3 py-3 font-medium">
                          Rate
                        </th>

                        <th className="px-3 py-3 font-medium">
                          Commission
                        </th>

                        <th className="px-3 py-3 font-medium">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {referralCommissions
                        .slice(0, 20)
                        .map(
                          (
                            commission,
                            index
                          ) => {
                            const status =
                              String(
                                commission.status ||
                                  "pending"
                              ).toLowerCase();

                            const isPaid =
                              status ===
                              "paid";

                            return (
                              <tr
                                key={
                                  commission.id ||
                                  `${commission.createdAt}-${index}`
                                }
                                className={`border-b last:border-0 ${
                                  dark
                                    ? "border-white/5"
                                    : "border-slate-100"
                                }`}
                              >
                                <td
                                  className={`px-3 py-4 font-mono text-xs ${muted}`}
                                >
                                  {commission.referredAffiliateId ||
                                    "-"}
                                </td>

                                <td
                                  className={`px-3 py-4 ${muted}`}
                                >
                                  $
                                  {Number(
                                    commission.sourceEarnings ||
                                      0
                                  ).toFixed(
                                    2
                                  )}
                                </td>

                                <td className="px-3 py-4 text-violet-500">
                                  {Number(
                                    commission.commissionRate ||
                                      referralRate
                                  ).toFixed(
                                    0
                                  )}
                                  %
                                </td>

                                <td className="px-3 py-4 font-bold text-amber-500">
                                  $
                                  {Number(
                                    commission.commissionAmount ||
                                      0
                                  ).toFixed(
                                    2
                                  )}
                                </td>

                                <td className="px-3 py-4">
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                      isPaid
                                        ? "bg-emerald-400/10 text-emerald-500"
                                        : "bg-orange-400/10 text-orange-500"
                                    }`}
                                  >
                                    {isPaid
                                      ? "Paid"
                                      : "Pending"}
                                  </span>
                                </td>
                              </tr>
                            );
                          }
                        )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <section
            id="payments"
            className={`mt-6 scroll-mt-24 rounded-2xl border p-5 sm:p-6 ${
              dark
                ? "border-indigo-400/10 bg-white/[0.025]"
                : "border-indigo-200 bg-white shadow-sm"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-400/10 text-indigo-500">
                <CreditCard size={20} />
              </div>

              <div>
                <h2 className="font-bold">
                  Payments
                </h2>

                <p
                  className={`text-xs ${faint}`}
                >
                  Payment information and
                  history
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-dashed border-indigo-300/30 p-6 text-center">
              <CreditCard
                size={30}
                className="mx-auto mb-3 text-indigo-400"
              />

              <p className="font-semibold">
                Payment system is being
                connected
              </p>

              <p
                className={`mt-2 text-xs ${faint}`}
              >
                Your earnings remain safely
                tracked. Payment processing
                will be enabled after the
                payment database is connected.
              </p>
            </div>
          </section>

          <section
            className={`mt-6 rounded-2xl border p-5 ${border} ${cardBg}`}
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                  <Clock3 size={19} />
                </div>

                <div>
                  <h2 className="font-bold">
                    Recent Activity
                  </h2>

                  <p
                    className={`mt-1 text-xs ${faint}`}
                  >
                    Latest affiliate activity
                  </p>
                </div>
              </div>

              <span
                className={`rounded-lg px-3 py-1.5 text-xs ${
                  dark
                    ? "bg-white/5 text-slate-500"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {clicks.length} records
              </span>
            </div>

            {clicks.length === 0 ? (
              <div
                className={`rounded-xl border border-dashed py-12 text-center ${
                  dark
                    ? "border-white/10"
                    : "border-slate-200"
                }`}
              >
                <MousePointerClick
                  size={30}
                  className="mx-auto mb-3 text-slate-400"
                />

                <p
                  className={`text-sm ${muted}`}
                >
                  No activity yet
                </p>

                <p
                  className={`mt-1 text-xs ${faint}`}
                >
                  Start sharing your smart
                  link to generate traffic.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead>
                    <tr
                      className={`border-b text-xs ${
                        dark
                          ? "border-white/10 text-slate-600"
                          : "border-slate-200 text-slate-400"
                      }`}
                    >
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
                    {clicks
                      .slice(0, 10)
                      .map(
                        (
                          row,
                          index
                        ) => {
                          const status =
                            String(
                              row.status ||
                                "click"
                            );

                          const converted =
                            [
                              "converted",
                              "conversion",
                              "approved",
                              "paid",
                            ].includes(
                              status.toLowerCase()
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
                                  ? "border-white/5"
                                  : "border-slate-100"
                              }`}
                            >
                              <td
                                className={`px-3 py-4 ${
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
                                className={`px-3 py-4 ${muted}`}
                              >
                                {row.country ||
                                  "-"}
                              </td>

                              <td
                                className={`px-3 py-4 ${muted}`}
                              >
                                {row.device ||
                                  "-"}
                              </td>

                              <td className="px-3 py-4">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                    converted
                                      ? "bg-emerald-400/10 text-emerald-500"
                                      : dark
                                      ? "bg-slate-400/10 text-slate-500"
                                      : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  {converted
                                    ? "Converted"
                                    : "Click"}
                                </span>
                              </td>

                              <td className="px-3 py-4 text-right font-semibold text-cyan-500">
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
                icon={
                  <Target size={20} />
                }
                className="border-yellow-500/10 hover:border-yellow-400/30"
                iconClass="bg-yellow-500/10 text-yellow-500"
                onClick={() =>
                  document
                    .getElementById(
                      "offers"
                    )
                    ?.scrollIntoView({
                      behavior:
                        "smooth",
                      block: "start",
                    })
                }
                dark={dark}
              />

              <FileCard
                title="Copy Smart Link"
                subtitle="Copy your tracking link"
                icon={
                  <Link2 size={20} />
                }
                className="border-cyan-500/10 hover:border-cyan-400/30"
                iconClass="bg-cyan-500/10 text-cyan-500"
                onClick={
                  copySmartLink
                }
                dark={dark}
              />

              <FileCard
                title="Contact Manager"
                subtitle="Talk with your manager"
                icon={
                  <MessageCircle
                    size={20}
                  />
                }
                className="border-green-500/10 hover:border-green-400/30"
                iconClass="bg-green-500/10 text-green-500"
                onClick={() =>
                  setManagerOpen(true)
                }
                dark={dark}
              />
            </div>
          </section>

          <footer
            className={`py-10 text-center text-xs ${
              dark
                ? "text-slate-700"
                : "text-slate-400"
            }`}
          >
            © {new Date().getFullYear()}{" "}
            UpNetworkCPA
            <span className="mx-2">
              •
            </span>
            Affiliate Panel
          </footer>
        </div>

        {managerOpen && (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
            onClick={() =>
              setManagerOpen(false)
            }
          >
            <div
              className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl ${panelBg} ${border}`}
              onClick={(e) =>
                e.stopPropagation()
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
                    Choose a panel manager
                    on Telegram.
                  </p>
                </div>

                <button
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
                          {index +
                            1}
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
  valueClass,
  accent,
  dark,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  iconBox: string;
  border: string;
  glow: string;
  valueClass: string;
  accent: string;
  dark: boolean;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-5 transition duration-300 ${
        dark
          ? "border-white/10 bg-white/[0.025]"
          : "border-slate-200 bg-white shadow-sm"
      } ${border}`}
    >
      <div
        className={`absolute left-0 right-0 top-0 h-[3px] ${accent}`}
      />

      <div
        className={`absolute -right-8 -top-8 h-28 w-28 rounded-full blur-3xl ${glow}`}
      />

      <div className="relative">
        <div className="mb-5 flex items-center justify-between">
          <span
            className={`text-[11px] font-semibold uppercase tracking-wider ${
              dark
                ? "text-slate-500"
                : "text-slate-400"
            }`}
          >
            {title}
          </span>

          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBox}`}
          >
            {icon}
          </div>
        </div>

        <p
          className={`text-2xl font-extrabold tracking-tight ${valueClass}`}
        >
          {value}
        </p>

        <p
          className={`mt-2 text-xs ${
            dark
              ? "text-slate-600"
              : "text-slate-400"
          }`}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function ReferralStatCard({
  title,
  value,
  subtitle,
  icon,
  className,
  iconClass,
  dark,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  className: string;
  iconClass: string;
  dark: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        dark
          ? "border-white/10 bg-white/[0.02]"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>

        <span
          className={`text-[10px] uppercase tracking-wider ${className}`}
        >
          {title}
        </span>
      </div>

      <p
        className={`mt-4 text-2xl font-extrabold ${className}`}
      >
        {value}
      </p>

      <p
        className={`mt-1 text-[10px] ${dark ? "text-slate-600" : "text-slate-400"}`}
      >
        {subtitle}
      </p>
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
  dark,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  className?: string;
  iconClass?: string;
  onClick: () => void;
  dark: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group w-full rounded-2xl border p-5 text-left transition duration-300 ${
        dark
          ? "bg-white/[0.02] hover:bg-white/[0.045]"
          : "bg-white shadow-sm hover:bg-slate-50"
      } ${className || ""}`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            iconClass ||
            (dark
              ? "bg-white/5 text-slate-400"
              : "bg-slate-100 text-slate-500")
          }`}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={`font-semibold ${
              dark
                ? "text-slate-200"
                : "text-slate-700"
            }`}
          >
            {title}
          </p>

          <p
            className={`mt-1 truncate text-xs ${
              dark
                ? "text-slate-600"
                : "text-slate-400"
            }`}
          >
            {subtitle}
          </p>
        </div>

        <ChevronRight
          size={17}
          className={
            dark
              ? "text-slate-700 group-hover:text-slate-400"
              : "text-slate-300 group-hover:text-slate-500"
          }
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
  dark,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  subtitle: string;
  iconClass: string;
  dark: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        dark
          ? "border-white/10 bg-white/[0.025]"
          : "border-slate-200 bg-white shadow-sm"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>

        <div>
          <p
            className={`text-xs ${
              dark
                ? "text-slate-600"
                : "text-slate-400"
            }`}
          >
            {title}
          </p>

          <p className="text-xl font-bold">
            {value}
          </p>
        </div>
      </div>

      <p
        className={`mt-3 text-xs ${
          dark
            ? "text-slate-700"
            : "text-slate-400"
        }`}
      >
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
  dark,
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  barClass: string;
  dark: boolean;
}) {
  const percentage =
    max > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (value / max) * 100
          )
        )
      : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span
          className={
            dark
              ? "text-slate-500"
              : "text-slate-400"
          }
        >
          {label}
        </span>

        <span
          className={`font-semibold ${
            dark
              ? "text-slate-300"
              : "text-slate-600"
          }`}
        >
          {value.toLocaleString()}
          {suffix}
        </span>
      </div>

      <div
        className={`h-2 overflow-hidden rounded-full ${
          dark
            ? "bg-white/5"
            : "bg-slate-100"
        }`}
      >
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
  valueClass = "",
  dark,
}: {
  label: string;
  value: string;
  valueClass?: string;
  dark: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-xl px-3 py-3 ${
        dark
          ? "bg-white/[0.02]"
          : "bg-slate-50"
      }`}
    >
      <span
        className={`text-xs ${
          dark
            ? "text-slate-600"
            : "text-slate-400"
        }`}
      >
        {label}
      </span>

      <span
        className={`max-w-[65%] truncate text-right text-xs font-semibold ${
          valueClass ||
          (dark
            ? "text-slate-300"
            : "text-slate-600")
        }`}
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
  return clicks.filter((row) =>
    String(row.device || "")
      .toLowerCase()
      .includes(type)
  ).length;
}

function formatDate(
  value?: string
) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
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
