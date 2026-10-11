"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  DollarSign,
  Wallet,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAIL = "islamhanif122@gmail.com";

type Stats = {
  clicks: number;
  conversions: number;
  earnings: number;
  paid: number;
  balance: number;
};

type Affiliate = {
  affiliate_id: string;
  clicks: number;
  conversions: number;
  earnings: number;
  paid: number;
  balance: number;
};

type History = {
  click_id: string;
  affiliate_id: string;
  payout: number;
  status: string;
  date: string | null;
};

const emptyStats: Stats = {
  clicks: 0,
  conversions: 0,
  earnings: 0,
  paid: 0,
  balance: 0,
};

function usd(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function AdminEarningsPage() {
  const router = useRouter();

  const [stats, setStats] = useState<Stats>(emptyStats);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error: sessionError } =
        await supabase.auth.getSession();

      const session = data.session;

      if (
        sessionError ||
        !session ||
        session.user.email?.toLowerCase() !== ADMIN_EMAIL
      ) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/admin/earnings", {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Unable to load earnings."
        );
      }

      setStats(result.stats || emptyStats);
      setAffiliates(
        Array.isArray(result.affiliates)
          ? result.affiliates
          : []
      );
      setHistory(
        Array.isArray(result.history)
          ? result.history
          : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load earnings."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const cards = [
    {
      label: "Total Affiliate Earnings",
      value: usd(stats.earnings),
      icon: DollarSign,
      color: "text-cyan-400",
    },
    {
      label: "Paid Payments",
      value: usd(stats.paid),
      icon: CheckCircle2,
      color: "text-emerald-400",
    },
    {
      label: "Calculated Balance",
      value: usd(stats.balance),
      icon: Wallet,
      color: "text-amber-400",
    },
    {
      label: "Total Conversions",
      value: stats.conversions.toLocaleString(),
      icon: TrendingUp,
      color: "text-violet-400",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <button
          onClick={() => router.push("/admin")}
          className="mb-7 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm"
        >
          <ArrowLeft size={17} />
          Admin Dashboard
        </button>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-cyan-400">
              UpNetwork CPA Admin
            </p>

            <h1 className="mt-2 text-3xl font-black">
              Earnings Management
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Affiliate earnings and payment overview
            </p>
          </div>

          <button
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-bold text-slate-950 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
              >
                <Icon
                  size={25}
                  className={`mb-4 ${card.color}`}
                />

                <p className="text-sm text-slate-400">
                  {card.label}
                </p>

                <p className="mt-2 text-3xl font-black">
                  {loading ? "..." : card.value}
                </p>
              </div>
            );
          })}
        </section>

        <section className="mb-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-6">
            <h2 className="text-xl font-bold">
              Affiliate Earnings Report
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Conversion earnings minus paid payment requests.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-800/70 text-slate-300">
                <tr>
                  {[
                    "Affiliate ID",
                    "Clicks",
                    "Conversions",
                    "Earnings",
                    "Paid",
                    "Balance",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-4"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {affiliates.map((item) => (
                  <tr key={item.affiliate_id}>
                    <td className="px-5 py-4 font-bold">
                      {item.affiliate_id}
                    </td>
                    <td className="px-5 py-4">
                      {item.clicks}
                    </td>
                    <td className="px-5 py-4">
                      {item.conversions}
                    </td>
                    <td className="px-5 py-4 text-cyan-400">
                      {usd(item.earnings)}
                    </td>
                    <td className="px-5 py-4 text-emerald-400">
                      {usd(item.paid)}
                    </td>
                    <td className="px-5 py-4 font-bold text-amber-400">
                      {usd(item.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && !error && affiliates.length === 0 && (
              <p className="p-8 text-center text-slate-400">
                No earnings records found.
              </p>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-6">
            <h2 className="text-xl font-bold">
              Recent Conversion Earnings
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Latest 100 conversion records
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead className="bg-slate-800/70 text-slate-300">
                <tr>
                  {[
                    "Date",
                    "Affiliate",
                    "Click ID",
                    "Status",
                    "Earnings",
                  ].map((heading) => (
                    <th key={heading} className="px-5 py-4">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {history.map((item, index) => (
                  <tr key={`${item.click_id}-${index}`}>
                    <td className="px-5 py-4 text-slate-400">
                      {item.date
                        ? new Date(item.date).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-5 py-4">
                      {item.affiliate_id}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs">
                      {item.click_id}
                    </td>
                    <td className="px-5 py-4">
                      {item.status}
                    </td>
                    <td className="px-5 py-4 font-bold text-emerald-400">
                      {usd(item.payout)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && !error && history.length === 0 && (
              <p className="p-8 text-center text-slate-400">
                No conversion history found.
              </p>
            )}
          </div>
        </section>

        <p className="mt-6 text-xs leading-6 text-slate-500">
          This is a read-only report based on converted clicks
          and paid payment requests. It does not include referral
          commissions, adjustments or other ledger entries.
          The calculated balance is not an authoritative
          withdrawable balance. Reconcile payment and earnings
          records before making payouts.
        </p>
      </div>
    </main>
  );
}