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
  Wallet,
  DollarSign,
  MousePointerClick,
  TrendingUp,
  CalendarDays,
  RefreshCw,
  Download,
  AlertCircle,
  Sun,
  Moon,
  BarChart3,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAffiliateTheme } from "../theme-context";

type DailyRow = {
  date: string;
  clicks: number;
  conversions: number;
  earnings: number;
};

type Stats = {
  totalClicks: number;
  conversions: number;
  earnings: number;
  conversionRate: number;
};

const EMPTY_STATS: Stats = {
  totalClicks: 0,
  conversions: 0,
  earnings: 0,
  conversionRate: 0,
};

function dateString(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function initialFrom(): string {
  const date = new Date();
  date.setDate(date.getDate() - 29);
  return dateString(date);
}

function money(value: number): string {
  return `$${Number(value || 0).toFixed(2)}`;
}

function numberValue(value: unknown): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function csvCell(value: unknown): string {
  const text = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(text)
    ? `'${text}`
    : text;

  return `"${safe.replace(/"/g, '""')}"`;
}

export default function AffiliateEarningsPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useAffiliateTheme();
  const dark = theme === "dark";

  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(() =>
    dateString(new Date())
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [affiliateId, setAffiliateId] = useState("");
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [dailyRows, setDailyRows] = useState<DailyRow[]>([]);

  const pageBg = dark
    ? "bg-[#05070c] text-white"
    : "bg-slate-50 text-slate-900";

  const cardBg = dark
    ? "border-white/10 bg-[#0b1020]"
    : "border-slate-200 bg-white";

  const muted = dark
    ? "text-slate-400"
    : "text-slate-500";

  const inputClass = dark
    ? "border-white/10 bg-[#0b1020] text-white"
    : "border-slate-200 bg-white text-slate-900";

  const loadEarnings = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }

      if (!from || !to || from > to) {
        throw new Error("Select a valid date range.");
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

      const params = new URLSearchParams({
        from,
        to,
      });

      const response = await fetch(
        `/api/affiliate/statistics?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Unable to load earnings."
        );
      }

      setAffiliateId(
        String(
          result.profile?.affiliateId ||
          result.profile?.affiliate_id ||
          ""
        )
      );

      setStats({
        totalClicks: numberValue(
          result.stats?.totalClicks
        ),
        conversions: numberValue(
          result.stats?.conversions
        ),
        earnings: numberValue(
          result.stats?.earnings
        ),
        conversionRate: numberValue(
          result.stats?.conversionRate
        ),
      });

      const rows: DailyRow[] = Array.isArray(
        result.dailyReport
      )
        ? result.dailyReport.map(
            (item: Record<string, unknown>) => ({
              date: String(item.date || ""),
              clicks: numberValue(item.clicks),
              conversions: numberValue(
                item.conversions
              ),
              earnings: numberValue(item.earnings),
            })
          )
        : [];

      setDailyRows(rows);
    } catch (err) {
      console.error("Earnings loading error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load earnings."
      );
    } finally {
      setLoading(false);
    }
  }, [from, to, router]);

  useEffect(() => {
    void loadEarnings();
  }, [loadEarnings]);

  const sortedRows = useMemo(
    () =>
      [...dailyRows].sort((a, b) =>
        b.date.localeCompare(a.date)
      ),
    [dailyRows]
  );

  const bestDay = useMemo(() => {
    if (dailyRows.length === 0) return null;

    return [...dailyRows].sort(
      (a, b) => b.earnings - a.earnings
    )[0];
  }, [dailyRows]);

  function exportCSV() {
    const headers = [
      "Date",
      "Clicks",
      "Conversions",
      "Earnings USD",
    ];

    const rows = sortedRows.map((row) => [
      row.date,
      row.clicks,
      row.conversions,
      row.earnings.toFixed(2),
    ]);

    const csv = [
      headers.map(csvCell).join(","),
      ...rows.map((row) =>
        row.map(csvCell).join(",")
      ),
    ].join("\r\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `upnetwork-earnings-${from}-to-${to}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <main className={`min-h-screen ${pageBg}`}>
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
              aria-label="Back to dashboard"
              className={`flex h-10 w-10 items-center justify-center rounded-xl border ${inputClass}`}
            >
              <ArrowLeft size={19} />
            </button>

            <div>
              <h1 className="text-xl font-black sm:text-2xl">
                Earnings
              </h1>
              <p className={`text-xs ${muted}`}>
                UpNetwork CPA Affiliate Panel
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={`flex h-10 w-10 items-center justify-center rounded-xl border ${inputClass}`}
          >
            {dark ? (
              <Sun size={18} />
            ) : (
              <Moon size={18} />
            )}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6">
        <section
          className={`mb-7 rounded-3xl border p-6 sm:p-8 ${cardBg}`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
              <Wallet size={25} />
            </div>

            <div>
              <h2 className="text-2xl font-black">
                Earnings Overview
              </h2>
              <p className={`mt-1 text-sm ${muted}`}>
                Affiliate ID: {affiliateId || "Loading..."}
              </p>
            </div>
          </div>

          <p className={`mt-4 text-sm ${muted}`}>
            Review your recorded conversions and
            earnings for a selected date range.
          </p>
        </section>

        <section
          className={`mb-7 rounded-2xl border p-5 ${cardBg}`}
        >
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays
              size={19}
              className="text-cyan-400"
            />
            <h3 className="font-bold">
              Date Range
            </h3>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex-1 sm:max-w-56">
              <span className={`mb-2 block text-xs ${muted}`}>
                From Date
              </span>
              <input
                type="date"
                value={from}
                max={to}
                onChange={(event) =>
                  setFrom(event.target.value)
                }
                className={`w-full rounded-xl border px-3 py-3 text-sm ${inputClass}`}
              />
            </label>

            <label className="flex-1 sm:max-w-56">
              <span className={`mb-2 block text-xs ${muted}`}>
                To Date
              </span>
              <input
                type="date"
                value={to}
                min={from}
                onChange={(event) =>
                  setTo(event.target.value)
                }
                className={`w-full rounded-xl border px-3 py-3 text-sm ${inputClass}`}
              />
            </label>

            <button
              type="button"
              onClick={() => void loadEarnings()}
              disabled={loading}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-cyan-500 px-5 text-sm font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={
                  loading ? "animate-spin" : ""
                }
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={exportCSV}
              disabled={loading || sortedRows.length === 0}
              className={`inline-flex h-12 items-center gap-2 rounded-xl border px-5 text-sm font-bold disabled:opacity-50 ${inputClass}`}
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </section>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            <AlertCircle
              size={20}
              className="shrink-0"
            />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />
              <p className={muted}>
                Loading earnings...
              </p>
            </div>
          </div>
        ) : (
          <>
            <section className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-emerald-400">
                    Total Earnings
                  </span>
                  <DollarSign
                    size={20}
                    className="text-emerald-400"
                  />
                </div>

                <p className="text-3xl font-black">
                  {money(stats.earnings)}
                </p>

                <p className={`mt-2 text-xs ${muted}`}>
                  Recorded conversion earnings
                </p>
              </div>

              <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-purple-400">
                    Conversions
                  </span>
                  <TrendingUp
                    size={20}
                    className="text-purple-400"
                  />
                </div>

                <p className="text-3xl font-black">
                  {stats.conversions.toLocaleString()}
                </p>

                <p className={`mt-2 text-xs ${muted}`}>
                  Converted clicks
                </p>
              </div>

              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-blue-400">
                    Total Clicks
                  </span>
                  <MousePointerClick
                    size={20}
                    className="text-blue-400"
                  />
                </div>

                <p className="text-3xl font-black">
                  {stats.totalClicks.toLocaleString()}
                </p>

                <p className={`mt-2 text-xs ${muted}`}>
                  Clicks in selected date range
                </p>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-amber-400">
                    Conversion Rate
                  </span>
                  <BarChart3
                    size={20}
                    className="text-amber-400"
                  />
                </div>

                <p className="text-3xl font-black">
                  {stats.conversionRate.toFixed(2)}%
                </p>

                <p className={`mt-2 text-xs ${muted}`}>
                  Conversions per click
                </p>
              </div>
            </section>

            <section
              className={`mb-7 rounded-2xl border p-5 ${cardBg}`}
            >
              <h3 className="mb-3 text-lg font-bold">
                Best Earning Day
              </h3>

              {bestDay && bestDay.earnings > 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className={muted}>
                    {bestDay.date}
                  </span>
                  <span className="text-2xl font-black text-emerald-400">
                    {money(bestDay.earnings)}
                  </span>
                </div>
              ) : (
                <p className={`text-sm ${muted}`}>
                  No earnings recorded in this period.
                </p>
              )}
            </section>

            <section
              className={`overflow-hidden rounded-2xl border ${cardBg}`}
            >
              <div className="border-b border-white/10 p-5">
                <h3 className="text-lg font-bold">
                  Daily Earnings Report
                </h3>

                <p className={`mt-1 text-xs ${muted}`}>
                  Earnings are based on recorded
                  conversions. Dates reflect the
                  original click date.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[580px] text-left text-sm">
                  <thead
                    className={
                      dark
                        ? "bg-white/5 text-slate-400"
                        : "bg-slate-50 text-slate-600"
                    }
                  >
                    <tr>
                      <th className="px-5 py-4">
                        Date
                      </th>
                      <th className="px-5 py-4">
                        Clicks
                      </th>
                      <th className="px-5 py-4">
                        Conversions
                      </th>
                      <th className="px-5 py-4">
                        Earnings
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {sortedRows.map((row) => (
                      <tr
                        key={row.date}
                        className="border-t border-white/10"
                      >
                        <td className="px-5 py-4 font-medium">
                          {row.date}
                        </td>
                        <td className="px-5 py-4">
                          {row.clicks.toLocaleString()}
                        </td>
                        <td className="px-5 py-4">
                          {row.conversions.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 font-bold text-emerald-400">
                          {money(row.earnings)}
                        </td>
                      </tr>
                    ))}

                    {sortedRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className={`px-5 py-12 text-center ${muted}`}
                        >
                          No earnings data found for
                          this date range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <p className={`mt-5 text-xs ${muted}`}>
              Earnings shown here are recorded
              affiliate payouts, not confirmed
              withdrawable balances. Payment
              requests and payment history will
              be handled separately.
            </p>
          </>
        )}
      </div>
    </main>
  );
}