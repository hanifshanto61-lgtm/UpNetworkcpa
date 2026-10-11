
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  DollarSign,
  Clock3,
  CheckCircle2,
  RefreshCw,
  Percent,
  History,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAIL = "islamhanif122@gmail.com";

type Stats = {
  totalReferrals: number;
  totalCommissions: number;
  totalCommission: number;
  pendingCommission: number;
  paidCommission: number;
};

type Referrer = {
  affiliateId: string;
  referrals: number;
  total: number;
  pending: number;
  paid: number;
};

type Referral = {
  id: string;
  referrerId: string;
  referredId: string;
  status: string | null;
  createdAt: string | null;
};

type Commission = {
  id: string;
  referrerId: string;
  referredId: string;
  clickId: string | null;
  sourceEarnings: number;
  rate: number;
  amount: number;
  status: string;
  createdAt: string | null;
  paidAt: string | null;
};

type ReferralResponse = {
  success: boolean;
  error?: string;
  currency?: string;
  defaultCommissionRate?: number;
  stats?: Stats;
  referrers?: Referrer[];
  referrals?: Referral[];
  commissions?: Commission[];
};

const EMPTY_STATS: Stats = {
  totalReferrals: 0,
  totalCommissions: 0,
  totalCommission: 0,
  pendingCommission: 0,
  paidCommission: 0,
};

function usd(value: number): string {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(value?: string | null): string {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const normalized = String(status || "pending").toLowerCase();

  let colors =
    "border-slate-500/20 bg-slate-500/10 text-slate-300";

  if (normalized === "paid" || normalized === "active") {
    colors =
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
  } else if (
    normalized === "pending" ||
    normalized === "approved"
  ) {
    colors =
      "border-amber-500/20 bg-amber-500/10 text-amber-400";
  } else if (
    normalized === "rejected" ||
    normalized === "cancelled"
  ) {
    colors =
      "border-red-500/20 bg-red-500/10 text-red-400";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${colors}`}
    >
      {normalized}
    </span>
  );
}

export default function AdminReferralsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authorized, setAuthorized] = useState(false);

  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [rate, setRate] = useState(5);

  const loadReferrals = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        router.replace("/login");
        return;
      }

      const session = sessionData.session;

      if (
        session.user.email?.toLowerCase() !==
        ADMIN_EMAIL.toLowerCase()
      ) {
        router.replace("/affiliate");
        return;
      }

      setAuthorized(true);

      const response = await fetch(
        "/api/admin/referrals",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        }
      );

      const result =
        (await response.json()) as ReferralResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Unable to load referral report."
        );
      }

      setStats(result.stats || EMPTY_STATS);

      setReferrers(
        Array.isArray(result.referrers)
          ? result.referrers
          : []
      );

      setReferrals(
        Array.isArray(result.referrals)
          ? result.referrals
          : []
      );

      setCommissions(
        Array.isArray(result.commissions)
          ? result.commissions
          : []
      );

      setRate(
        Number(result.defaultCommissionRate ?? 5)
      );
    } catch (err) {
      console.error("Admin referrals page:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load referral report."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadReferrals();
  }, [loadReferrals]);

  const cards = [
    {
      title: "Total Referrals",
      value: stats.totalReferrals.toLocaleString(),
      icon: Users,
      color: "text-violet-400",
      background: "bg-violet-500/10",
    },
    {
      title: "Total Commission",
      value: usd(stats.totalCommission),
      icon: DollarSign,
      color: "text-cyan-400",
      background: "bg-cyan-500/10",
    },
    {
      title: "Pending Commission",
      value: usd(stats.pendingCommission),
      icon: Clock3,
      color: "text-amber-400",
      background: "bg-amber-500/10",
    },
    {
      title: "Paid Commission",
      value: usd(stats.paidCommission),
      icon: CheckCircle2,
      color: "text-emerald-400",
      background: "bg-emerald-500/10",
    },
  ];

  if (loading && !authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <RefreshCw
            size={32}
            className="mx-auto mb-4 animate-spin text-cyan-400"
          />
          <p className="text-sm text-slate-400">
            Loading Referral Management...
          </p>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Back to dashboard */}
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="mb-6 inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300 transition hover:border-cyan-500/40 hover:text-white"
        >
          <ArrowLeft size={17} />
          Admin Dashboard
        </button>

        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">
              UpNetwork CPA Admin
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight">
              Referral Management
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Monitor affiliate referrals and commission earnings.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadReferrals()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Refresh Report
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Summary cards */}
        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"
              >
                <div
                  className={`mb-4 inline-flex rounded-xl p-3 ${card.background} ${card.color}`}
                >
                  <Icon size={22} />
                </div>

                <p className="text-sm text-slate-400">
                  {card.title}
                </p>

                <p className="mt-2 text-3xl font-black">
                  {loading ? "..." : card.value}
                </p>
              </div>
            );
          })}
        </section>

        {/* Commission details */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-5">
            <div className="flex items-center gap-3">
              <Percent
                size={22}
                className="text-cyan-400"
              />
              <div>
                <p className="text-xs text-slate-400">
                  Default Referral Commission Rate
                </p>

                <p className="mt-1 text-2xl font-black text-cyan-400">
                  {rate}%
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-violet-500/20 bg-slate-900/60 p-5">
            <div className="flex items-center gap-3">
              <History
                size={22}
                className="text-violet-400"
              />
              <div>
                <p className="text-xs text-slate-400">
                  Commission Records
                </p>

                <p className="mt-1 text-2xl font-black text-violet-400">
                  {stats.totalCommissions}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Referrer performance */}
        <section className="mb-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="border-b border-slate-800 p-5">
            <h2 className="text-lg font-bold">
              Referrer Performance
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Commission and referral totals by affiliate.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead className="bg-slate-800/70 text-slate-400">
                <tr>
                  <th className="px-5 py-4">Referrer ID</th>
                  <th className="px-5 py-4">Referrals</th>
                  <th className="px-5 py-4">Total</th>
                  <th className="px-5 py-4">Pending</th>
                  <th className="px-5 py-4">Paid</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {referrers.map((item) => (
                  <tr key={item.affiliateId}>
                    <td className="px-5 py-4 font-semibold text-cyan-400">
                      {item.affiliateId}
                    </td>

                    <td className="px-5 py-4">
                      {item.referrals}
                    </td>

                    <td className="px-5 py-4">
                      {usd(item.total)}
                    </td>

                    <td className="px-5 py-4 text-amber-400">
                      {usd(item.pending)}
                    </td>

                    <td className="px-5 py-4 text-emerald-400">
                      {usd(item.paid)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && !error && referrers.length === 0 && (
              <p className="p-8 text-center text-sm text-slate-500">
                No referrer records found.
              </p>
            )}
          </div>
        </section>

        {/* Referred affiliates */}
        <section className="mb-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="border-b border-slate-800 p-5">
            <h2 className="text-lg font-bold">
              Referred Affiliates
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Affiliates registered through referral links.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-800/70 text-slate-400">
                <tr>
                  <th className="px-5 py-4">Referrer</th>
                  <th className="px-5 py-4">Referred Affiliate</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Joined</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {referrals.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-4 font-medium text-cyan-400">
                      {item.referrerId || "-"}
                    </td>

                    <td className="px-5 py-4">
                      {item.referredId || "-"}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge
                        status={item.status || "pending"}
                      />
                    </td>

                    <td className="px-5 py-4 text-slate-400">
                      {formatDate(item.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && !error && referrals.length === 0 && (
              <p className="p-8 text-center text-sm text-slate-500">
                No referral records found.
              </p>
            )}
          </div>
        </section>

        {/* Commission history */}
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="border-b border-slate-800 p-5">
            <h2 className="text-lg font-bold">
              Commission History
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Referral commission transactions and statuses.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-slate-800/70 text-slate-400">
                <tr>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Referrer</th>
                  <th className="px-5 py-4">Referred</th>
                  <th className="px-5 py-4">Source Earnings</th>
                  <th className="px-5 py-4">Rate</th>
                  <th className="px-5 py-4">Commission</th>
                  <th className="px-5 py-4">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {commissions.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-4 text-slate-400">
                      {formatDate(item.createdAt)}
                    </td>

                    <td className="px-5 py-4 font-medium text-cyan-400">
                      {item.referrerId || "-"}
                    </td>

                    <td className="px-5 py-4">
                      {item.referredId || "-"}
                    </td>

                    <td className="px-5 py-4">
                      {usd(item.sourceEarnings)}
                    </td>

                    <td className="px-5 py-4">
                      {item.rate}%
                    </td>

                    <td className="px-5 py-4 font-bold text-emerald-400">
                      {usd(item.amount)}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && !error && commissions.length === 0 && (
              <p className="p-8 text-center text-sm text-slate-500">
                No commission records found.
              </p>
            )}
          </div>
        </section>

        <p className="mt-8 text-center text-xs text-slate-600">
          UpNetwork CPA — Admin Referral Management
        </p>
      </div>
    </main>
  );
}
