"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Activity,
  CheckCircle2,
  DollarSign,
  MousePointerClick,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Stats = {
  clicks: number;
  conversions: number;
  earnings: number;
  conversionRate: number;
};

type Affiliate = {
  affiliate_id: string;
  clicks: number;
  conversions: number;
  earnings: number;
  conversionRate: number;
};

const emptyStats: Stats = {
  clicks: 0,
  conversions: 0,
  earnings: 0,
  conversionRate: 0,
};

const ADMIN_EMAIL = "islamhanif122@gmail.com";

export default function AdminStatisticsPage() {
  const router = useRouter();

  const [stats, setStats] = useState<Stats>(emptyStats);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStatistics = useCallback(
    async (start: string, end: string) => {
      setLoading(true);
      setError("");

      try {
        const { data, error: sessionError } =
          await supabase.auth.getSession();

        const session = data.session;

        if (
          sessionError ||
          !session ||
          session.user.email?.toLowerCase() !==
            ADMIN_EMAIL
        ) {
          router.replace("/login");
          return;
        }

        const params = new URLSearchParams();

        if (start) params.set("from", start);
        if (end) params.set("to", end);

        const response = await fetch(
          `/api/admin/statistics?${params.toString()}`,
          {
            cache: "no-store",
            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error || "Unable to load statistics."
          );
        }

        setStats(result.stats || emptyStats);
        setAffiliates(result.affiliates || []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Statistics could not be loaded."
        );
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    void loadStatistics("", "");
  }, [loadStatistics]);

  const cards = [
    {
      title: "Total Clicks",
      value: stats.clicks.toLocaleString(),
      icon: MousePointerClick,
      color: "text-blue-600",
    },
    {
      title: "Conversions",
      value: stats.conversions.toLocaleString(),
      icon: CheckCircle2,
      color: "text-emerald-600",
    },
    {
      title: "Conversion Rate",
      value: `${stats.conversionRate.toFixed(2)}%`,
      icon: Activity,
      color: "text-violet-600",
    },
    {
      title: "Affiliate Earnings",
      value: `$${stats.earnings.toFixed(2)}`,
      icon: DollarSign,
      color: "text-orange-600",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <button
          onClick={() => router.push("/admin")}
          className="mb-6 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold"
        >
          <ArrowLeft size={17} />
          Admin Dashboard
        </button>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              UpNetwork CPA Admin
            </p>
            <h1 className="mt-1 text-3xl font-extrabold">
              Statistics
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Network performance and affiliate reports
            </p>
          </div>

          <button
            disabled={loading}
            onClick={() => loadStatistics(from, to)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        <section className="mb-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold">
            Date Range Filter (UTC)
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm font-semibold">
              From
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 p-3"
              />
            </label>

            <label className="text-sm font-semibold">
              To
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 p-3"
              />
            </label>

            <div className="flex items-end gap-2">
              <button
                onClick={() => loadStatistics(from, to)}
                disabled={loading}
                className="flex-1 rounded-xl bg-slate-900 p-3 font-semibold text-white disabled:opacity-50"
              >
                Apply
              </button>
              <button
                onClick={() => {
                  setFrom("");
                  setTo("");
                  void loadStatistics("", "");
                }}
                className="rounded-xl border border-slate-200 p-3 font-semibold"
              >
                Reset
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <Icon
                  size={25}
                  className={`mb-4 ${card.color}`}
                />
                <p className="text-sm text-slate-500">
                  {card.title}
                </p>
                <p className="mt-2 text-3xl font-extrabold">
                  {loading ? "..." : card.value}
                </p>
              </div>
            );
          })}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-xl font-bold">
              Affiliate Performance
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Earnings are calculated from converted
              clicks, not advertiser revenue.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {[
                    "Affiliate ID",
                    "Clicks",
                    "Conversions",
                    "CR",
                    "Earnings",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-4 font-semibold"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {!loading &&
                  affiliates.map((affiliate) => (
                    <tr key={affiliate.affiliate_id}>
                      <td className="px-5 py-4 font-bold">
                        {affiliate.affiliate_id}
                      </td>
                      <td className="px-5 py-4">
                        {affiliate.clicks}
                      </td>
                      <td className="px-5 py-4">
                        {affiliate.conversions}
                      </td>
                      <td className="px-5 py-4">
                        {affiliate.conversionRate.toFixed(2)}%
                      </td>
                      <td className="px-5 py-4 font-bold text-emerald-600">
                        ${affiliate.earnings.toFixed(2)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {loading && (
              <p className="p-8 text-center text-slate-500">
                Loading statistics...
              </p>
            )}

            {!loading &&
              !error &&
              affiliates.length === 0 && (
                <p className="p-8 text-center text-slate-500">
                  No matching affiliate activity found.
                </p>
              )}
          </div>
        </section>
      </div>
    </main>
  );
}