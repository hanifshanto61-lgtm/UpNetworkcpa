
"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Activity,
  BarChart3,
  CalendarDays,
  Download,
  DollarSign,
  Filter,
  Globe2,
  MousePointerClick,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ClickRow = {
  click_id?: string | null;
  smartlink_id?: string | null;
  offer_id?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  device?: string | null;
  browser?: string | null;
  operating_system?: string | null;
  traffic_source?: string | null;
  campaign?: string | null;
  referer?: string | null;
  status?: string | null;
  payout?: number | string | null;
  is_suspicious?: boolean | null;
  converted_at?: string | null;
  created_at?: string | null;
};

type ReportItem = {
  clicks: number;
  conversions: number;
  earnings: number;
  percentage?: number;
  conversionRate?: number;
  [key: string]: string | number | undefined;
};

type Stats = {
  totalClicks: number;
  conversions: number;
  conversionRate: number;
  earnings: number;
  uniqueVisitors: number;
  identifiableClicks: number;
  suspiciousClicks: number;
  cleanClicks: number;
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
  clicks?: ClickRow[];
  countryReport?: ReportItem[];
  cityReport?: ReportItem[];
  regionReport?: ReportItem[];
  deviceReport?: ReportItem[];
  browserReport?: ReportItem[];
  osReport?: ReportItem[];
  sourceReport?: ReportItem[];
  campaignReport?: ReportItem[];
  smartlinkReport?: ReportItem[];
  dailyReport?: ReportItem[];
};

const emptyStats: Stats = {
  totalClicks: 0,
  conversions: 0,
  conversionRate: 0,
  earnings: 0,
  uniqueVisitors: 0,
  identifiableClicks: 0,
  suspiciousClicks: 0,
  cleanClicks: 0,
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthStart() {
  const date = new Date();
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), 1)
  ).toISOString().slice(0, 10);
}

function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function converted(row: ClickRow) {
  return (
    ["converted", "conversion", "approved", "paid"].includes(
      String(row.status || "").toLowerCase()
    ) || Boolean(row.converted_at)
  );
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(text)
    ? `'${text}`
    : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function exportCSV(rows: ClickRow[]) {
  const headers = [
    "Date",
    "Click ID",
    "Country",
    "Region",
    "City",
    "Device",
    "Browser",
    "OS",
    "Source",
    "Campaign",
    "Smartlink",
    "Status",
    "Payout",
  ];

  const values = rows.map((r) => [
    r.created_at,
    r.click_id,
    r.country,
    r.region,
    r.city,
    r.device,
    r.browser,
    r.operating_system,
    r.traffic_source,
    r.campaign,
    r.smartlink_id || r.offer_id,
    r.status,
    converted(r) ? r.payout || 0 : 0,
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
  anchor.download = `upnetwork-traffic-${today()}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Metric({
  title,
  value,
  icon,
  color,
  description,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  color: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-lg">
      <div className={`mb-4 inline-flex rounded-xl p-3 ${color}`}>
        {icon}
      </div>
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-1 text-2xl font-bold text-white">
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

function ReportTable({
  title,
  rows,
  field,
}: {
  title: string;
  rows: ReportItem[];
  field: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70">
      <div className="border-b border-white/10 p-5">
        <h2 className="font-semibold text-white">{title}</h2>
        <p className="mt-1 text-xs text-slate-500">
          Clicks, conversions and affiliate earnings
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="p-6 text-sm text-slate-500">
          No data available for this period.
        </p>
      ) : (
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-900 text-xs text-slate-400">
              <tr>
                <th className="px-4 py-3">{title}</th>
                <th className="px-3 py-3 text-right">Clicks</th>
                <th className="px-3 py-3 text-right">Leads</th>
                <th className="px-4 py-3 text-right">Earned</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item, index) => (
                <tr
                  key={`${String(item[field])}-${index}`}
                  className="border-t border-white/5"
                >
                  <td className="max-w-[190px] break-all px-4 py-3 text-slate-200">
                    {String(item[field] || "Unknown")}
                  </td>
                  <td className="px-3 py-3 text-right text-cyan-300">
                    {item.clicks}
                  </td>
                  <td className="px-3 py-3 text-right text-violet-300">
                    {item.conversions}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-400">
                    {money(item.earnings)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function TrendChart({ rows }: { rows: ReportItem[] }) {
  const max = Math.max(
    1,
    ...rows.map((item) => item.clicks)
  );

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
      <h2 className="mb-1 font-semibold">Daily Traffic Trend</h2>
      <p className="mb-5 text-xs text-slate-500">
        Clicks by day for the selected period
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">
          No traffic yet.
        </p>
      ) : (
        <div className="flex min-h-48 items-end gap-2 overflow-x-auto pb-2">
          {rows.map((item, index) => (
            <div
              key={`${String(item.date)}-${index}`}
              className="flex min-w-10 flex-1 flex-col items-center gap-2"
            >
              <span className="text-xs text-cyan-300">
                {item.clicks}
              </span>
              <div className="flex h-36 w-full items-end rounded-md bg-white/5">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-cyan-600 to-blue-400"
                  style={{
                    height: `${Math.max(
                      4,
                      (item.clicks / max) * 100
                    )}%`,
                  }}
                  title={`${String(item.date)}: ${item.clicks} clicks`}
                />
              </div>
              <span className="text-[10px] text-slate-500">
                {String(item.date || "").slice(5)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function AffiliateStatisticsPage() {
  const router = useRouter();

  const [fromDate, setFromDate] = useState(monthStart);
  const [toDate, setToDate] = useState(today);
  const [appliedFrom, setAppliedFrom] = useState(monthStart);
  const [appliedTo, setAppliedTo] = useState(today);

  const [data, setData] = useState<ResponseData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [deviceFilter, setDeviceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tab, setTab] = useState("geography");

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
        throw new Error(
          json.error || "Unable to load statistics."
        );
      }

      setData(json);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load statistics."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(monthStart(), today());
  }, []);

  const stats: Stats = {
    ...emptyStats,
    ...data.stats,
  };

  const clicks = data.clicks || [];

  const filteredClicks = useMemo(() => {
    const term = search.toLowerCase().trim();

    return clicks.filter((row) => {
      const searchable = [
        row.click_id,
        row.country,
        row.region,
        row.city,
        row.device,
        row.browser,
        row.operating_system,
        row.traffic_source,
        row.campaign,
        row.smartlink_id,
        row.offer_id,
        row.status,
      ]
        .join(" ")
        .toLowerCase();

      if (term && !searchable.includes(term)) {
        return false;
      }

      if (
        countryFilter &&
        row.country !== countryFilter
      ) {
        return false;
      }

      if (
        deviceFilter &&
        row.device !== deviceFilter
      ) {
        return false;
      }

      if (statusFilter === "converted" && !converted(row)) {
        return false;
      }

      if (statusFilter === "click" && converted(row)) {
        return false;
      }

      return true;
    });
  }, [
    clicks,
    search,
    countryFilter,
    deviceFilter,
    statusFilter,
  ]);

  const countries = Array.from(
    new Set(clicks.map((r) => r.country).filter(Boolean))
  ) as string[];

  const devices = Array.from(
    new Set(clicks.map((r) => r.device).filter(Boolean))
  ) as string[];

  function applyDates() {
    if (!fromDate || !toDate || fromDate > toDate) {
      setError("Please select a valid date range.");
      return;
    }

    setAppliedFrom(fromDate);
    setAppliedTo(toDate);
    void load(fromDate, toDate);
  }

  function resetDates() {
    const from = monthStart();
    const to = today();

    setFromDate(from);
    setToDate(to);
    setAppliedFrom(from);
    setAppliedTo(to);
    void load(from, to);
  }

  const tabs = [
    { id: "geography", label: "Geography" },
    { id: "devices", label: "Devices & OS" },
    { id: "sources", label: "Traffic Sources" },
    { id: "smartlinks", label: "Smartlinks" },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
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
                <Activity className="text-cyan-400" size={25} />
                <h1 className="text-xl font-bold sm:text-2xl">
                  Traffic Intelligence
                </h1>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                UpNetwork CPA • Advanced Affiliate Analytics
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
              {data.profile.affiliateId ||
                data.profile.affiliate_id}
            </strong>
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <section className="mb-6 rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays size={19} className="text-cyan-400" />
            <h2 className="font-semibold">Date Range</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto]">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="min-w-0 rounded-xl border border-white/10 bg-slate-950 p-3"
            />

            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="min-w-0 rounded-xl border border-white/10 bg-slate-950 p-3"
            />

            <button
              onClick={applyDates}
              disabled={loading}
              className="rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50"
            >
              Apply
            </button>

            <button
              onClick={resetDates}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 disabled:opacity-50"
            >
              <RotateCcw size={16} />
              Reset
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Reporting: {appliedFrom} → {appliedTo} (UTC)
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            title="Total Clicks"
            value={loading ? "..." : stats.totalClicks.toLocaleString()}
            icon={<MousePointerClick size={22} />}
            color="bg-cyan-500/15 text-cyan-400"
            description="All recorded traffic"
          />
          <Metric
            title="Unique Visitors"
            value={loading ? "..." : stats.uniqueVisitors.toLocaleString()}
            icon={<Users size={22} />}
            color="bg-blue-500/15 text-blue-400"
            description={`${stats.identifiableClicks} clicks with visitor identifiers`}
          />
          <Metric
            title="Conversions"
            value={loading ? "..." : stats.conversions.toLocaleString()}
            icon={<Target size={22} />}
            color="bg-violet-500/15 text-violet-400"
            description="Confirmed conversion events"
          />
          <Metric
            title="Affiliate Earnings"
            value={loading ? "..." : money(stats.earnings)}
            icon={<DollarSign size={22} />}
            color="bg-emerald-500/15 text-emerald-400"
            description="Converted click payouts"
          />
          <Metric
            title="Conversion Rate"
            value={`${stats.conversionRate.toFixed(2)}%`}
            icon={<TrendingUp size={22} />}
            color="bg-amber-500/15 text-amber-400"
            description="Conversions / total clicks"
          />
          <Metric
            title="Clean Clicks"
            value={stats.cleanClicks.toLocaleString()}
            icon={<Activity size={22} />}
            color="bg-teal-500/15 text-teal-400"
            description="Clicks not flagged as suspicious"
          />
          <Metric
            title="Suspicious Traffic"
            value={stats.suspiciousClicks.toLocaleString()}
            icon={<ShieldAlert size={22} />}
            color="bg-rose-500/15 text-rose-400"
            description="Heuristic flags, not confirmed fraud"
          />
          <Metric
            title="Countries"
            value={String((data.countryReport || []).length)}
            icon={<Globe2 size={22} />}
            color="bg-indigo-500/15 text-indigo-400"
            description="Includes unknown locations"
          />
        </section>

        <div className="mt-6">
          <TrendChart rows={data.dailyReport || []} />
        </div>

        <section className="mt-6">
          <div className="mb-4 flex flex-wrap gap-2">
            {tabs.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium ${
                  tab === item.id
                    ? "bg-cyan-500 text-slate-950"
                    : "border border-white/10 bg-white/5 text-slate-300"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === "geography" && (
            <div className="grid gap-5 lg:grid-cols-3">
              <ReportTable
                title="Country"
                rows={data.countryReport || []}
                field="country"
              />
              <ReportTable
                title="Region / State"
                rows={data.regionReport || []}
                field="region"
              />
              <ReportTable
                title="City"
                rows={data.cityReport || []}
                field="city"
              />
            </div>
          )}

          {tab === "devices" && (
            <div className="grid gap-5 lg:grid-cols-3">
              <ReportTable
                title="Device"
                rows={data.deviceReport || []}
                field="device"
              />
              <ReportTable
                title="Browser"
                rows={data.browserReport || []}
                field="browser"
              />
              <ReportTable
                title="Operating System"
                rows={data.osReport || []}
                field="operatingSystem"
              />
            </div>
          )}

          {tab === "sources" && (
            <div className="grid gap-5 lg:grid-cols-2">
              <ReportTable
                title="Traffic Source"
                rows={data.sourceReport || []}
                field="source"
              />
              <ReportTable
                title="Campaign"
                rows={data.campaignReport || []}
                field="campaign"
              />
            </div>
          )}

          {tab === "smartlinks" && (
            <ReportTable
              title="Smartlink / Offer ID"
              rows={data.smartlinkReport || []}
              field="smartlinkId"
            />
          )}
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 size={20} className="text-cyan-400" />
                <h2 className="font-semibold">
                  Detailed Traffic History
                </h2>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Latest 100 clicks returned by the report API
              </p>
            </div>

            <button
              onClick={() => exportCSV(filteredClicks)}
              disabled={!filteredClicks.length}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold disabled:opacity-40"
            >
              <Download size={17} />
              Export CSV
            </button>
          </div>

          <div className="grid gap-3 border-b border-white/10 p-4 md:grid-cols-4">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-3.5 text-slate-500"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search traffic..."
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-3 pl-10 pr-3 text-sm"
              />
            </div>

            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950 p-3 text-sm"
            >
              <option value="">All Countries</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>

            <select
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950 p-3 text-sm"
            >
              <option value="">All Devices</option>
              {devices.map((device) => (
                <option key={device} value={device}>
                  {device}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950 p-3 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="click">Clicks Only</option>
              <option value="converted">Converted</option>
            </select>
          </div>

          <div className="flex items-center gap-2 px-5 py-3 text-xs text-slate-500">
            <Filter size={14} />
            Showing {filteredClicks.length} of {clicks.length} recent rows
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase text-slate-400">
                <tr>
                  {[
                    "Date / Time",
                    "Click ID",
                    "Country",
                    "Region",
                    "City",
                    "Device",
                    "Browser",
                    "OS",
                    "Source",
                    "Status",
                    "Payout",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="whitespace-nowrap px-4 py-3"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredClicks.map((row, index) => (
                  <tr
                    key={`${row.click_id || index}`}
                    className="border-t border-white/5 hover:bg-white/[0.03]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                      {row.created_at
                        ? new Date(row.created_at).toLocaleString()
                        : "—"}
                    </td>
                    <td
                      className="max-w-[140px] truncate px-4 py-3 font-mono text-xs text-cyan-300"
                      title={row.click_id || ""}
                    >
                      {row.click_id
                        ? row.click_id.slice(0, 12)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">{row.country || "—"}</td>
                    <td className="px-4 py-3">{row.region || "—"}</td>
                    <td className="px-4 py-3">{row.city || "—"}</td>
                    <td className="px-4 py-3">{row.device || "—"}</td>
                    <td className="px-4 py-3">{row.browser || "—"}</td>
                    <td className="px-4 py-3">
                      {row.operating_system || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {row.traffic_source || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          converted(row)
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-blue-500/15 text-blue-400"
                        }`}
                      >
                        {converted(row)
                          ? "Converted"
                          : row.status || "Click"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-400">
                      {money(
                        converted(row)
                          ? Number(row.payout || 0)
                          : 0
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredClicks.length === 0 && (
              <p className="p-8 text-center text-sm text-slate-500">
                No traffic records match your filters.
              </p>
            )}
          </div>
        </section>

        <p className="mt-5 pb-6 text-center text-xs text-slate-500">
          UpNetwork CPA • Traffic Intelligence
        </p>
      </div>
    </main>
  );
}
