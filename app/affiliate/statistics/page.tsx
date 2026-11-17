"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  DollarSign,
  Download,
  MousePointerClick,
  RefreshCw,
  Target,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DailyRow = {
  date: string;
  clicks: number;
  uniqueVisitors: number;
  conversions: number;
  earnings: number;
  countries: string[];
  subIds: string[];
  offers: string[];
  cities: string[];
  regions: string[];
  devices: string[];
  browsers: string[];
  operatingSystems: string[];
  trafficSources: string[];
  campaigns: string[];
  smartlinks: string[];
};

type Stats = {
  totalClicks: number;
  conversions: number;
  earnings: number;
  uniqueVisitors: number;
};

type ResponseData = {
  success?: boolean;
  error?: string;
  profile?: {
    affiliateId?: string;
    affiliate_id?: string;
    name?: string;
  };
  stats?: Partial<Stats>;
  dailyRows?: DailyRow[];
};

const EMPTY_STATS: Stats = {
  totalClicks: 0,
  conversions: 0,
  earnings: 0,
  uniqueVisitors: 0,
};

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function getWeekStart(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  result.setHours(0, 0, 0, 0);
  return result;
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function exportDailyCSV(rows: DailyRow[]) {
  const headers = [
    "Date",
    "Clicks",
    "Unique Visitors",
    "Conversions",
    "Earnings",
    "Country",
    "Sub ID",
    "Offer",
    "City",
    "Region / State",
    "Device",
    "Browser",
    "Operating System",
    "Traffic Source",
    "Campaign",
    "Smartlink",
  ];

  const values = rows.map((row) => [
    row.date,
    row.clicks,
    row.uniqueVisitors,
    row.conversions,
    row.earnings,
    (row.countries || []).join(" | "),
    (row.subIds || []).join(" | "),
    (row.offers || []).join(" | "),
    (row.cities || []).join(" | "),
    (row.regions || []).join(" | "),
    (row.devices || []).join(" | "),
    (row.browsers || []).join(" | "),
    (row.operatingSystems || []).join(" | "),
    (row.trafficSources || []).join(" | "),
    (row.campaigns || []).join(" | "),
    (row.smartlinks || []).join(" | "),
  ]);

  const csv = [headers, ...values]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `upnetwork-daily-statistics-${localDate()}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Metric({
  title,
  value,
  icon,
  gradient,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  gradient: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-gradient-to-br ${gradient} p-5 text-white shadow-lg`}
    >
      <div className="mb-3 inline-flex rounded-xl bg-white/15 p-3">
        {icon}
      </div>
      <p className="text-sm text-white/85">{title}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function DetailCell({ values }: { values?: string[] }) {
  const items = (values || []).filter(Boolean);

  if (items.length === 0) {
    return <span className="text-slate-600">—</span>;
  }

  return (
    <div className="flex min-w-[130px] max-w-[260px] flex-wrap gap-1.5">
      {items.map((item, index) => (
        <span
          key={`${item}-${index}`}
          title={item}
          className="max-w-[220px] break-all rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export default function AffiliateStatisticsPage() {
  const router = useRouter();
  const initialDate = localDate();

  const [fromDate, setFromDate] = useState(initialDate);
  const [toDate, setToDate] = useState(initialDate);
  const [appliedFrom, setAppliedFrom] = useState(initialDate);
  const [appliedTo, setAppliedTo] = useState(initialDate);
  const [data, setData] = useState<ResponseData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [visibleCount, setVisibleCount] = useState(15);

  async function load(from: string, to: string) {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.push("/login");
        return;
      }

      const params = new URLSearchParams({ from, to });
      const response = await fetch(
        `/api/affiliate/statistics?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        }
      );

      const json: ResponseData = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || "Unable to load statistics.");
      }

      setData(json);
      setVisibleCount(15);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load statistics."
      );
    } finally {
      setLoading(false);
    }
  }

  // Load once on entry. Automatic timed refresh is intentionally disabled.
  useEffect(() => {
    void load(initialDate, initialDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats: Stats = { ...EMPTY_STATS, ...data.stats };
  const dailyRows = data.dailyRows || [];
  const visibleRows = dailyRows.slice(0, visibleCount);

  function applyCustomDates() {
    if (!fromDate || !toDate || fromDate > toDate) {
      setError("Please select a valid date range.");
      return;
    }

    setAppliedFrom(fromDate);
    setAppliedTo(toDate);
    void load(fromDate, toDate);
  }

  function applyPreset(preset: string) {
    const now = new Date();
    const today = localDate(now);
    let from = today;
    let to = today;

    if (preset === "yesterday") {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      from = localDate(yesterday);
      to = from;
    } else if (preset === "thisWeek") {
      from = localDate(getWeekStart(now));
    } else if (preset === "lastWeek") {
      const thisWeekStart = getWeekStart(now);
      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(thisWeekStart);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
      from = localDate(lastWeekStart);
      to = localDate(lastWeekEnd);
    } else if (preset === "thisMonth") {
      from = localDate(getMonthStart(now));
    } else if (preset === "lastMonth") {
      const firstThisMonth = getMonthStart(now);
      const lastMonthEnd = new Date(firstThisMonth);
      lastMonthEnd.setDate(0);
      const lastMonthStart = new Date(
        lastMonthEnd.getFullYear(),
        lastMonthEnd.getMonth(),
        1
      );
      from = localDate(lastMonthStart);
      to = localDate(lastMonthEnd);
    } else if (preset === "allTime") {
      from = "2000-01-01";
    }

    setFromDate(from);
    setToDate(to);
    setAppliedFrom(from);
    setAppliedTo(to);
    void load(from, to);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/affiliate")}
              className="rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={19} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <CalendarDays className="text-cyan-400" size={24} />
                <h1 className="text-xl font-bold sm:text-2xl">
                  Daily Statistics
                </h1>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                UpNetwork CPA • Complete daily traffic reports
              </p>
            </div>
          </div>

          <button
            onClick={() => void load(appliedFrom, appliedTo)}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </header>

        {data.profile && (
          <div className="mb-5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-sm text-cyan-300">
            Affiliate ID:{" "}
            <strong>
              {data.profile.affiliateId || data.profile.affiliate_id}
            </strong>
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <section className="mb-6 rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <h2 className="mb-4 font-semibold">Date Filter</h2>

          <div className="mb-4 flex flex-wrap gap-2">
            {[
              ["Today", "today"],
              ["Yesterday", "yesterday"],
              ["This Week", "thisWeek"],
              ["Last Week", "lastWeek"],
              ["This Month", "thisMonth"],
              ["Last Month", "lastMonth"],
              ["All Time", "allTime"],
            ].map(([label, value]) => (
              <button
                key={value}
                onClick={() => applyPreset(value)}
                disabled={loading}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:border-cyan-400/50 hover:bg-cyan-500/10 disabled:opacity-50"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
            <label className="text-xs text-slate-400">
              From
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="mt-1 w-full min-w-0 rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-white"
              />
            </label>

            <label className="text-xs text-slate-400">
              To
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="mt-1 w-full min-w-0 rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-white"
              />
            </label>

            <button
              onClick={applyCustomDates}
              disabled={loading}
              className="self-end rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 disabled:opacity-50"
            >
              Apply Custom
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Selected period: {appliedFrom} → {appliedTo}
          </p>
        </section>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            title="Clicks"
            value={loading ? "..." : stats.totalClicks.toLocaleString()}
            icon={<MousePointerClick size={22} />}
            gradient="from-cyan-600 to-blue-800"
          />
          <Metric
            title="Visitors"
            value={loading ? "..." : stats.uniqueVisitors.toLocaleString()}
            icon={<Users size={22} />}
            gradient="from-blue-600 to-indigo-800"
          />
          <Metric
            title="Conversions"
            value={loading ? "..." : stats.conversions.toLocaleString()}
            icon={<Target size={22} />}
            gradient="from-violet-600 to-fuchsia-800"
          />
          <Metric
            title="Earnings"
            value={loading ? "..." : money(stats.earnings)}
            icon={<DollarSign size={22} />}
            gradient="from-emerald-600 to-teal-800"
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
            <div>
              <h2 className="text-lg font-bold">Complete Daily Report</h2>
              <p className="mt-1 text-xs text-slate-400">
                One row per date • Scroll horizontally to view all report details
              </p>
            </div>

            <button
              onClick={() => exportDailyCSV(dailyRows)}
              disabled={dailyRows.length === 0 || loading}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold disabled:opacity-40"
            >
              <Download size={17} />
              Export CSV
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 px-5 py-3 text-xs text-slate-500">
            <span>
              {loading
                ? "Loading daily reports..."
                : `Showing ${visibleRows.length} of ${dailyRows.length} dates`}
            </span>
            <span>Newest date first</span>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[2200px] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-800 text-xs uppercase tracking-wide text-slate-300">
                <tr>
                  {[
                    "Date",
                    "Clicks",
                    "Visitors",
                    "Conversions",
                    "Earnings",
                    "Country",
                    "Sub ID",
                    "Offer",
                    "City",
                    "Region / State",
                    "Device",
                    "Browser",
                    "Operating System",
                    "Traffic Source",
                    "Campaign",
                    "Smartlink",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="whitespace-nowrap border-b border-white/10 px-4 py-4"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {visibleRows.map((row) => (
                  <tr
                    key={row.date}
                    className="border-b border-white/5 align-top hover:bg-white/[0.03]"
                  >
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-cyan-300">
                      {row.date}
                    </td>
                    <td className="px-4 py-4 font-semibold text-white">
                      {row.clicks.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-blue-300">
                      {row.uniqueVisitors.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-violet-300">
                      {row.conversions.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-emerald-400">
                      {money(row.earnings)}
                    </td>
                    <td className="px-4 py-4">
                      <DetailCell values={row.countries} />
                    </td>
                    <td className="px-4 py-4">
                      <DetailCell values={row.subIds} />
                    </td>
                    <td className="px-4 py-4">
                      <DetailCell values={row.offers} />
                    </td>
                    <td className="px-4 py-4">
                      <DetailCell values={row.cities} />
                    </td>
                    <td className="px-4 py-4">
                      <DetailCell values={row.regions} />
                    </td>
                    <td className="px-4 py-4">
                      <DetailCell values={row.devices} />
                    </td>
                    <td className="px-4 py-4">
                      <DetailCell values={row.browsers} />
                    </td>
                    <td className="px-4 py-4">
                      <DetailCell values={row.operatingSystems} />
                    </td>
                    <td className="px-4 py-4">
                      <DetailCell values={row.trafficSources} />
                    </td>
                    <td className="px-4 py-4">
                      <DetailCell values={row.campaigns} />
                    </td>
                    <td className="px-4 py-4">
                      <DetailCell values={row.smartlinks} />
                    </td>
                  </tr>
                ))}

                {!loading && visibleRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={16}
                      className="px-5 py-12 text-center text-sm text-slate-500"
                    >
                      No statistics found for this date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {visibleCount < dailyRows.length && (
            <div className="flex justify-center border-t border-white/10 p-5">
              <button
                onClick={() => setVisibleCount((count) => count + 15)}
                className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold hover:bg-white/10"
              >
                Load More Dates
              </button>
            </div>
          )}
        </section>

        <p className="mt-5 pb-6 text-center text-xs text-slate-500">
          UpNetwork CPA • Daily Statistics • Manual refresh only
        </p>
      </div>
    </main>
  );
}