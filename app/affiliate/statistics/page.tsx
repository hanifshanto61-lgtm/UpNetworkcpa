"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  MousePointerClick,
  Target,
  DollarSign,
  TrendingUp,
  Globe2,
  Smartphone,
  Monitor,
  Tablet,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ClickRow = {
  click_id?: string;
  affiliate_id?: string;
  smartlink_id?: string | null;
  country?: string | null;
  device?: string | null;
  browser?: string | null;
  referer?: string | null;
  status?: string | null;
  payout?: number | string | null;
  converted_at?: string | null;
  created_at?: string | null;
};

type Profile = {
  affiliate_id?: string;
  name?: string;
  email?: string;
};

export default function AffiliateStatisticsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [clicks, setClicks] = useState<ClickRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("all");

  async function loadReport(showRefresh = false) {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/affiliate/dashboard", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Unable to load affiliate statistics."
        );
      }

      setProfile(data?.profile || null);
      setClicks(Array.isArray(data?.clicks) ? data.clicks : []);
    } catch (err: any) {
      setError(err?.message || "Unable to load statistics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, []);

  const filteredClicks = useMemo(() => {
    if (period === "all") return clicks;

    const now = new Date();
    let start = new Date();

    if (period === "today") {
      start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
    }

    if (period === "7d") {
      start.setDate(now.getDate() - 7);
    }

    if (period === "30d") {
      start.setDate(now.getDate() - 30);
    }

    return clicks.filter((row) => {
      if (!row.created_at) return false;

      const created = new Date(row.created_at);
      return created >= start;
    });
  }, [clicks, period]);

  const totalClicks = filteredClicks.length;

  const totalConversions = filteredClicks.filter((row) => {
    const status = String(row.status || "").toLowerCase();

    return (
      ["converted", "conversion", "approved", "paid"].includes(status) ||
      Boolean(row.converted_at)
    );
  }).length;

  const totalEarnings = filteredClicks.reduce((sum, row) => {
    const status = String(row.status || "").toLowerCase();

    const converted =
      ["converted", "conversion", "approved", "paid"].includes(status) ||
      Boolean(row.converted_at);

    if (!converted) return sum;

    const payout = Number(row.payout || 0);
    return sum + (Number.isFinite(payout) ? payout : 0);
  }, 0);

  const conversionRate =
    totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

  const countryStats = useMemo(() => {
    const map = new Map<
      string,
      { clicks: number; conversions: number; earnings: number }
    >();

    filteredClicks.forEach((row) => {
      const country = row.country || "Unknown";

      if (!map.has(country)) {
        map.set(country, {
          clicks: 0,
          conversions: 0,
          earnings: 0,
        });
      }

      const item = map.get(country)!;
      item.clicks++;

      const status = String(row.status || "").toLowerCase();

      const converted =
        ["converted", "conversion", "approved", "paid"].includes(status) ||
        Boolean(row.converted_at);

      if (converted) {
        item.conversions++;
        item.earnings += Number(row.payout || 0) || 0;
      }
    });

    return Array.from(map.entries())
      .map(([country, value]) => ({
        country,
        ...value,
      }))
      .sort((a, b) => b.clicks - a.clicks);
  }, [filteredClicks]);

  const deviceStats = useMemo(() => {
    const map = new Map<string, number>();

    filteredClicks.forEach((row) => {
      const device = String(row.device || "Unknown");
      map.set(device, (map.get(device) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([device, count]) => ({
        device,
        count,
        percentage:
          totalClicks > 0 ? (count / totalClicks) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredClicks, totalClicks]);

  const recentRows = [...filteredClicks]
    .sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    })
    .slice(0, 20);

  function deviceIcon(device: string) {
    const value = device.toLowerCase();

    if (value.includes("mobile") || value.includes("phone")) {
      return <Smartphone size={17} />;
    }

    if (value.includes("tablet")) {
      return <Tablet size={17} />;
    }

    return <Monitor size={17} />;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/affiliate")}
              className="rounded-xl border border-white/10 bg-white/5 p-2.5 transition hover:bg-white/10"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <BarChart3 size={23} className="text-cyan-400" />
                <h1 className="text-2xl font-bold">
                  Statistics & Report
                </h1>
              </div>

              <p className="mt-1 text-sm text-slate-400">
                Track your affiliate performance and earnings
              </p>
            </div>
          </div>

          <button
            onClick={() => loadReport(true)}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium transition hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* Affiliate ID */}
        {profile?.affiliate_id && (
          <div className="mb-5 rounded-2xl border border-cyan-400/10 bg-cyan-400/5 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-slate-400">
                Affiliate ID
              </span>

              <span className="font-mono text-sm font-semibold text-cyan-300">
                {profile.affiliate_id}
              </span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Period */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <CalendarDays size={17} />
            Period:
          </div>

          {[
            ["all", "All Time"],
            ["today", "Today"],
            ["7d", "Last 7 Days"],
            ["30d", "Last 30 Days"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                period === value
                  ? "bg-cyan-500 text-slate-950"
                  : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<MousePointerClick size={22} />}
            title="Total Clicks"
            value={loading ? "..." : totalClicks.toLocaleString()}
            description="Tracked clicks"
          />

          <StatCard
            icon={<Target size={22} />}
            title="Conversions"
            value={
              loading ? "..." : totalConversions.toLocaleString()
            }
            description="Successful conversions"
          />

          <StatCard
            icon={<DollarSign size={22} />}
            title="Total Earnings"
            value={
              loading ? "..." : `$${totalEarnings.toFixed(2)}`
            }
            description="Conversion revenue"
          />

          <StatCard
            icon={<TrendingUp size={22} />}
            title="Conversion Rate"
            value={
              loading ? "..." : `${conversionRate.toFixed(2)}%`
            }
            description="Clicks to conversions"
          />
        </div>

        {/* Country + Device */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Country */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-5 flex items-center gap-2">
              <Globe2 size={20} className="text-cyan-400" />
              <h2 className="text-lg font-semibold">
                Country Report
              </h2>
            </div>

            {countryStats.length === 0 ? (
              <EmptyState text="No country data available yet." />
            ) : (
              <div className="space-y-3">
                {countryStats.map((item) => (
                  <div
                    key={item.country}
                    className="rounded-xl border border-white/5 bg-white/[0.03] p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">
                          {item.country}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {item.clicks} clicks · {item.conversions} conversions
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-semibold text-emerald-400">
                          ${item.earnings.toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-500">
                          earnings
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-cyan-400"
                        style={{
                          width: `${
                            totalClicks > 0
                              ? Math.min(
                                  100,
                                  (item.clicks / totalClicks) * 100
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Device */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-5 flex items-center gap-2">
              <Smartphone size={20} className="text-purple-400" />
              <h2 className="text-lg font-semibold">
                Device Report
              </h2>
            </div>

            {deviceStats.length === 0 ? (
              <EmptyState text="No device data available yet." />
            ) : (
              <div className="space-y-4">
                {deviceStats.map((item) => (
                  <div key={item.device}>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        {deviceIcon(item.device)}
                        <span>{item.device}</span>
                      </div>

                      <span className="text-sm font-semibold">
                        {item.count}{" "}
                        <span className="text-slate-500">
                          ({item.percentage.toFixed(1)}%)
                        </span>
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-purple-400"
                        style={{
                          width: `${Math.min(
                            100,
                            item.percentage
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Detailed Report */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="border-b border-white/10 px-5 py-5">
            <div className="flex items-center gap-2">
              <BarChart3 size={20} className="text-amber-400" />
              <h2 className="text-lg font-semibold">
                Detailed Report
              </h2>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Latest click and conversion activity
            </p>
          </div>

          {recentRows.length === 0 ? (
            <div className="p-8">
              <EmptyState text="No report data available yet." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Country</th>
                    <th className="px-5 py-4">Device</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Payout</th>
                  </tr>
                </thead>

                <tbody>
                  {recentRows.map((row, index) => {
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
                      Boolean(row.converted_at);

                    return (
                      <tr
                        key={
                          row.click_id ||
                          `${row.created_at}-${index}`
                        }
                        className="border-b border-white/5 last:border-0"
                      >
                        <td className="px-5 py-4 text-slate-300">
                          {row.created_at
                            ? new Date(
                                row.created_at
                              ).toLocaleString()
                            : "-"}
                        </td>

                        <td className="px-5 py-4">
                          {row.country || "Unknown"}
                        </td>

                        <td className="px-5 py-4 text-slate-300">
                          {row.device || "Unknown"}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              converted
                                ? "bg-emerald-400/10 text-emerald-400"
                                : "bg-slate-400/10 text-slate-400"
                            }`}
                          >
                            {converted
                              ? "Converted"
                              : row.status || "Click"}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-semibold text-emerald-400">
                          {converted
                            ? `$${Number(
                                row.payout || 0
                              ).toFixed(2)}`
                            : "$0.00"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="mt-6 text-center text-xs text-slate-600">
          Affiliate Statistics • {profile?.affiliate_id || "Affiliate"}
        </div>
      </div>
    </main>
  );
}

function StatCard({
  icon,
  title,
  value,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.05]">
      <div className="mb-4 flex items-center justify-between">
        <div className="rounded-xl bg-white/5 p-2.5 text-cyan-400">
          {icon}
        </div>

        <BarChart3 size={17} className="text-slate-700" />
      </div>

      <div className="text-sm text-slate-400">{title}</div>

      <div className="mt-1 text-2xl font-bold">
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-600">
        {description}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
      }
