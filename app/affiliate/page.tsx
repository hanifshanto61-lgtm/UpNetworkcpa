"use client";

import { useEffect, useMemo, useState } from "react";
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
  TrendingUp,
  MousePointerClick,
  DollarSign,
  Activity,
  ChevronRight,
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

const menuItems = [
  {
    label: "Dashboard",
    href: "/affiliate",
    icon: Home,
  },
  {
    label: "Offers",
    href: "/affiliate/offers",
    icon: Target,
  },
  {
    label: "Smart Links",
    href: "/affiliate",
    icon: Link2,
  },
  {
    label: "Statistics",
    href: "/affiliate",
    icon: BarChart3,
  },
  {
    label: "Earnings",
    href: "/affiliate",
    icon: Wallet,
  },
  {
    label: "Referrals",
    href: "/affiliate",
    icon: Users,
  },
  {
    label: "Payments",
    href: "/affiliate",
    icon: CreditCard,
  },
];

export default function AffiliatePage() {
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
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

      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        router.replace("/login");
        return;
      }

      const accessToken = sessionData.session.access_token;

      const response = await fetch(
        "/api/affiliate/dashboard",
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
      await navigator.clipboard.writeText(smartLink);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  }

  function openManagerModal() {
    setMenuOpen(false);
    setManagerOpen(true);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />
          <p className="text-slate-400">
            Loading affiliate dashboard...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* TOP BAR */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* 3 DOT BUTTON */}
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10"
            >
              <Menu size={21} />
            </button>

            <div>
              <div className="text-lg font-bold tracking-tight">
                UpNetwork<span className="text-cyan-400">CPA</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Affiliate Panel
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">
                {profile?.name || "Affiliate"}
              </p>
              <p className="text-xs text-slate-500">
                {profile?.email || ""}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-400/20">
              <User size={19} />
            </div>
          </div>
        </div>
      </header>

      {/* SIDEBAR OVERLAY */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed left-0 top-0 z-[60] h-full w-[290px] max-w-[88vw] border-r border-white/10 bg-slate-950 shadow-2xl transition-transform duration-300 ${
          menuOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* SIDEBAR HEADER */}
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
            <div>
              <p className="font-bold">
                Affiliate Menu
              </p>
              <p className="mt-1 text-xs text-slate-500">
                UpNetworkCPA
              </p>
            </div>

            <button
              onClick={() => setMenuOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X size={19} />
            </button>
          </div>

          {/* PROFILE */}
          <div className="border-b border-white/10 p-5">
            <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-400">
                <User size={20} />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {profile?.name || "Affiliate"}
                </p>

                <p className="truncate text-xs text-slate-500">
                  {profile?.email || ""}
                </p>
              </div>
            </div>
          </div>

          {/* MAIN MENU */}
          <nav className="flex-1 overflow-y-auto p-4">
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              Main Menu
            </p>

            <div className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      setMenuOpen(false);

                      if (
                        item.href !==
                        "/affiliate"
                      ) {
                        router.push(item.href);
                      }
                    }}
                    className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                  >
                    <Icon
                      size={18}
                      className="text-slate-500 transition group-hover:text-cyan-400"
                    />

                    <span className="flex-1">
                      {item.label}
                    </span>

                    <ChevronRight
                      size={15}
                      className="text-slate-700 group-hover:text-slate-400"
                    />
                  </button>
                );
              })}
            </div>

            <p className="mb-3 mt-7 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              Account
            </p>

            <div className="space-y-1">
              <button
                onClick={() => {
                  setMenuOpen(false);
                }}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                <User
                  size={18}
                  className="text-slate-500 group-hover:text-cyan-400"
                />
                <span className="flex-1">
                  My Account
                </span>
                <ChevronRight size={15} />
              </button>

              <button
                onClick={() => {
                  setMenuOpen(false);
                }}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                <Settings
                  size={18}
                  className="text-slate-500 group-hover:text-cyan-400"
                />
                <span className="flex-1">
                  Settings
                </span>
                <ChevronRight size={15} />
              </button>

              <button
                onClick={openManagerModal}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                <MessageCircle
                  size={18}
                  className="text-slate-500 group-hover:text-cyan-400"
                />
                <span className="flex-1">
                  Contact Manager
                </span>
                <ChevronRight size={15} />
              </button>
            </div>
          </nav>

          {/* LOGOUT */}
          <div className="border-t border-white/10 p-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-red-400 transition hover:bg-red-500/10"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* WELCOME */}
        <section className="mb-7">
          <p className="text-sm text-cyan-400">
            Welcome back 👋
          </p>

          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
            {profile?.name || "Affiliate"}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Monitor your affiliate performance,
            clicks and earnings.
          </p>
        </section>

        {/* KPI CARDS */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Clicks"
            value={totalClicks.toLocaleString()}
            icon={<MousePointerClick size={20} />}
          />

          <StatCard
            title="Conversions"
            value={conversions.toLocaleString()}
            icon={<TrendingUp size={20} />}
          />

          <StatCard
            title="Earnings"
            value={`$${earnings.toFixed(2)}`}
            icon={<DollarSign size={20} />}
          />

          <StatCard
            title="Conversion Rate"
            value={`${conversionRate}%`}
            icon={<Activity size={20} />}
          />
        </section>

        {/* SMART LINK */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">
                Your Smart Link
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Share this link to track your
                affiliate traffic.
              </p>
            </div>

            <div className="rounded-lg bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-400">
              Active
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="truncate font-mono text-xs text-slate-400">
                {smartLink}
              </p>
            </div>

            <button
              onClick={copySmartLink}
              className="flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
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
        </section>

        {/* PERFORMANCE */}
        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">
                  Performance
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Your current affiliate activity
                </p>
              </div>

              <BarChart3
                size={20}
                className="text-cyan-400"
              />
            </div>

            <div className="space-y-5">
              <ProgressRow
                label="Clicks"
                value={totalClicks}
                max={Math.max(totalClicks, 1)}
              />

              <ProgressRow
                label="Conversions"
                value={conversions}
                max={Math.max(totalClicks, 1)}
              />

              <ProgressRow
                label="Conversion Rate"
                value={Number(conversionRate)}
                max={100}
                suffix="%"
              />
            </div>
          </div>

          {/* ACCOUNT CARD */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                <User size={20} />
              </div>

              <div>
                <h2 className="font-semibold">
                  Affiliate Account
                </h2>

                <p className="text-xs text-slate-500">
                  Your account information
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

        {/* RECENT CONVERSIONS */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">
                Recent Activity
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Latest tracked affiliate activity
              </p>
            </div>

            <span className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate-400">
              {clicks.length} records
            </span>
          </div>

          {clicks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 py-12 text-center">
              <MousePointerClick
                size={30}
                className="mx-auto mb-3 text-slate-600"
              />

              <p className="text-sm text-slate-400">
                No activity yet
              </p>

              <p className="mt-1 text-xs text-slate-600">
                Start sharing your smart link to
                generate traffic.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-slate-500">
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
                          <td className="px-3 py-4 text-slate-300">
                            {formatDate(
                              row.created_at
                            )}
                          </td>

                          <td className="px-3 py-4 text-slate-400">
                            {row.country || "-"}
                          </td>

                          <td className="px-3 py-4 text-slate-400">
                            {row.device || "-"}
                          </td>

                          <td className="px-3 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                isConverted
                                  ? "bg-emerald-400/10 text-emerald-400"
                                  : "bg-slate-400/10 text-slate-400"
                              }`}
                            >
                              {isConverted
                                ? "Converted"
                                : "Click"}
                            </span>
                          </td>

                          <td className="px-3 py-4 text-right font-medium text-cyan-400">
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

        {/* QUICK ACTIONS */}
        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <QuickAction
            icon={<Target size={20} />}
            title="Browse Offers"
            description="Find offers to promote"
            onClick={() =>
              router.push(
                "/affiliate/offers"
              )
            }
          />

          <QuickAction
            icon={<Link2 size={20} />}
            title="Smart Link"
            description="Copy your tracking link"
            onClick={copySmartLink}
          />

          <QuickAction
            icon={<MessageCircle size={20} />}
            title="Contact Manager"
            description="Talk with your manager"
            onClick={() =>
              setManagerOpen(true)
            }
          />
        </section>

        {/* FOOTER */}
        <footer className="py-8 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} UpNetworkCPA
          {" • "}
          Affiliate Panel
        </footer>
      </div>

      {/* MANAGER MODAL */}
      {managerOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          onClick={() => setManagerOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-5 shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-bold">
                  Contact Manager
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Choose a panel manager on Telegram.
                </p>
              </div>

              <button
                onClick={() =>
                  setManagerOpen(false)
                }
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
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-400/30 hover:bg-cyan-400/5"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400">
                      <MessageCircle
                        size={19}
                      />
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
                      className="text-slate-600"
                    />
                  </a>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ---------------- COMPONENTS ---------------- */

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-400/20">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {title}
        </span>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
          {icon}
        </div>
      </div>

      <p className="text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  max,
  suffix = "",
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
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
        <span className="text-slate-400">
          {label}
        </span>

        <span className="font-medium text-slate-300">
          {value.toLocaleString()}
          {suffix}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-cyan-400 transition-all duration-500"
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
    <div className="flex items-center justify-between gap-4 rounded-xl bg-white/[0.025] px-3 py-3">
      <span className="text-xs text-slate-500">
        {label}
      </span>

      <span
        className={`max-w-[65%] truncate text-right text-xs font-medium ${valueClass}`}
      >
        {value}
      </span>
    </div>
  );
}

function QuickAction({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left transition hover:border-cyan-400/20 hover:bg-white/[0.05]"
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 transition group-hover:bg-cyan-400/15">
        {icon}
      </div>

      <p className="font-semibold">
        {title}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>
    </button>
  );
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
