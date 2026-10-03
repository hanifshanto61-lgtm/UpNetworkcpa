"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Copy,
  Check,
  Users,
  DollarSign,
  Clock3,
  Wallet,
  UserPlus,
  Percent,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

export default function ReferralsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const [affiliateId, setAffiliateId] = useState("");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [commissions, setCommissions] =
    useState<ReferralCommission[]>([]);

  const [commissionRate, setCommissionRate] = useState(5);
  const [totalCommission, setTotalCommission] = useState(0);
  const [pendingCommission, setPendingCommission] = useState(0);
  const [paidCommission, setPaidCommission] = useState(0);

  useEffect(() => {
    loadReferrals();
  }, []);

  async function loadReferrals() {
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

      const token = sessionData.session.access_token;

      const dashboardResponse = await fetch(
        "/api/affiliate/dashboard",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const dashboardData =
        await dashboardResponse.json();

      if (!dashboardResponse.ok) {
        throw new Error(
          dashboardData?.error ||
            "Unable to load affiliate profile."
        );
      }

      setAffiliateId(
        dashboardData?.profile?.affiliateId || ""
      );

      const referralResponse = await fetch(
        "/api/affiliate/referrals",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const referralData =
        await referralResponse.json();

      if (!referralResponse.ok) {
        throw new Error(
          referralData?.error ||
            "Unable to load referrals."
        );
      }

      setReferrals(
        Array.isArray(referralData.referrals)
          ? referralData.referrals
          : []
      );

      setCommissions(
        Array.isArray(referralData.commissions)
          ? referralData.commissions
          : []
      );

      setCommissionRate(
        Number(referralData.commissionRate || 5)
      );

      setTotalCommission(
        Number(referralData.totalCommission || 0)
      );

      setPendingCommission(
        Number(referralData.pendingCommission || 0)
      );

      setPaidCommission(
        Number(referralData.paidCommission || 0)
      );
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to load referrals."
      );
    } finally {
      setLoading(false);
    }
  }

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

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  }

  function formatDate(
    value?: string | null
  ) {
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

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070c] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />

          <p className="text-sm text-slate-500">
            Loading referrals...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070c] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">

            <button
              onClick={() =>
                router.push("/affiliate")
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-400"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={19} />
            </button>

            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                Referrals
              </h1>

              <p className="mt-1 text-xs text-slate-500">
                Manage your referrals and referral earnings
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/[0.04] px-4 py-2">
            <p className="text-[9px] uppercase tracking-wider text-slate-600">
              Affiliate ID
            </p>

            <p className="mt-0.5 font-mono text-xs font-semibold text-cyan-400">
              {affiliateId || "-"}
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Referral Link */}
        <section className="mb-6 rounded-2xl border border-violet-400/10 bg-white/[0.025] p-5 sm:p-6">

          <div className="mb-4 flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
              <UserPlus size={19} />
            </div>

            <div>
              <h2 className="font-bold">
                Your Referral Link
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Share this link to invite new affiliates.
              </p>
            </div>

          </div>

          <div className="flex flex-col gap-3 sm:flex-row">

            <div className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="break-all font-mono text-xs text-cyan-400">
                {referralLink}
              </p>
            </div>

            <button
              onClick={copyReferralLink}
              className="flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-cyan-300"
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

        {/* Stats */}
        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <StatCard
            title="Total Referrals"
            value={referrals.length.toLocaleString()}
            subtitle="Affiliates referred by you"
            icon={<Users size={19} />}
            iconClass="bg-violet-500/10 text-violet-400"
          />

          <StatCard
            title="Commission Rate"
            value={`${commissionRate}%`}
            subtitle="Current referral commission"
            icon={<Percent size={19} />}
            iconClass="bg-cyan-500/10 text-cyan-400"
          />

          <StatCard
            title="Total Commission"
            value={`$${totalCommission.toFixed(2)}`}
            subtitle="All referral earnings"
            icon={<DollarSign size={19} />}
            iconClass="bg-emerald-500/10 text-emerald-400"
          />

          <StatCard
            title="Pending"
            value={`$${pendingCommission.toFixed(2)}`}
            subtitle="Commission awaiting payment"
            icon={<Clock3 size={19} />}
            iconClass="bg-amber-500/10 text-amber-400"
          />

        </section>

        {/* Paid Commission */}
        <section className="mb-6">

          <div className="rounded-2xl border border-emerald-400/10 bg-white/[0.025] p-5">

            <div className="flex items-center justify-between gap-4">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Wallet size={19} />
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Paid Referral Commission
                  </p>

                  <p className="mt-1 text-2xl font-extrabold text-emerald-400">
                    ${paidCommission.toFixed(2)}
                  </p>
                </div>

              </div>

              <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                Paid
              </span>

            </div>

          </div>

        </section>

        {/* Referred Affiliates */}
        <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">

          <div className="mb-5 flex items-center justify-between gap-4">

            <div>
              <h2 className="text-lg font-bold">
                Referred Affiliates
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Affiliates who joined using your referral link.
              </p>
            </div>

            <span className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate-500">
              {referrals.length} total
            </span>

          </div>

          {referrals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 py-12 text-center">

              <Users
                size={30}
                className="mx-auto mb-3 text-slate-700"
              />

              <p className="text-sm text-slate-500">
                No referrals yet
              </p>

              <p className="mt-1 text-xs text-slate-700">
                Share your referral link to start earning commissions.
              </p>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[650px] text-left text-sm">

                <thead>
                  <tr className="border-b border-white/10 text-xs text-slate-600">

                    <th className="px-3 py-3 font-medium">
                      Affiliate
                    </th>

                    <th className="px-3 py-3 font-medium">
                      Email
                    </th>

                    <th className="px-3 py-3 font-medium">
                      Status
                    </th>

                    <th className="px-3 py-3 font-medium">
                      Joined
                    </th>

                  </tr>
                </thead>

                <tbody>
                  {referrals.map(
                    (referral, index) => (
                      <tr
                        key={
                          referral.id ||
                          referral.affiliateId ||
                          index
                        }
                        className="border-b border-white/5 last:border-0"
                      >

                        <td className="px-3 py-4">

                          <div>
                            <p className="font-semibold text-slate-300">
                              {referral.name ||
                                "Affiliate"}
                            </p>

                            <p className="mt-1 font-mono text-xs text-cyan-500">
                              {referral.affiliateId ||
                                "-"}
                            </p>
                          </div>

                        </td>

                        <td className="px-3 py-4 text-slate-500">
                          {referral.email || "-"}
                        </td>

                        <td className="px-3 py-4">

                          <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                            {referral.status ||
                              "Active"}
                          </span>

                        </td>

                        <td className="px-3 py-4 text-slate-500">
                          {formatDate(
                            referral.joinedAt
                          )}
                        </td>

                      </tr>
                    )
                  )}
                </tbody>

              </table>

            </div>
          )}

        </section>

        {/* Commission History */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">

          <div className="mb-5 flex items-center justify-between gap-4">

            <div>
              <h2 className="text-lg font-bold">
                Commission History
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Referral commissions generated from your affiliates.
              </p>
            </div>

            <span className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate-500">
              {commissions.length} records
            </span>

          </div>

          {commissions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 py-12 text-center">

              <DollarSign
                size={30}
                className="mx-auto mb-3 text-slate-700"
              />

              <p className="text-sm text-slate-500">
                No commission records yet
              </p>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[760px] text-left text-sm">

                <thead>
                  <tr className="border-b border-white/10 text-xs text-slate-600">

                    <th className="px-3 py-3 font-medium">
                      Date
                    </th>

                    <th className="px-3 py-3 font-medium">
                      Affiliate
                    </th>

                    <th className="px-3 py-3 font-medium">
                      Source Earnings
                    </th>

                    <th className="px-3 py-3 font-medium">
                      Rate
                    </th>

                    <th className="px-3 py-3 text-right font-medium">
                      Commission
                    </th>

                  </tr>
                </thead>

                <tbody>
                  {commissions.map(
                    (commission, index) => (
                      <tr
                        key={
                          commission.id ||
                          index
                        }
                        className="border-b border-white/5 last:border-0"
                      >

                        <td className="px-3 py-4 text-slate-500">
                          {formatDate(
                            commission.createdAt
                          )}
                        </td>

                        <td className="px-3 py-4 font-mono text-xs text-cyan-500">
                          {commission.referredAffiliateId ||
                            "-"}
                        </td>

                        <td className="px-3 py-4 text-slate-500">
                          $
                          {Number(
                            commission.sourceEarnings ||
                              0
                          ).toFixed(2)}
                        </td>

                        <td className="px-3 py-4 text-violet-400">
                          {Number(
                            commission.commissionRate ??
                              commissionRate
                          )}
                          %
                        </td>

                        <td className="px-3 py-4 text-right font-bold text-emerald-400">
                          $
                          {Number(
                            commission.commissionAmount ||
                              0
                          ).toFixed(2)}
                        </td>

                      </tr>
                    )
                  )}
                </tbody>

              </table>

            </div>
          )}

        </section>

        <div className="py-8 text-center text-xs text-slate-700">
          UpNetworkCPA • Referrals Dashboard
        </div>

      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconClass,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">

      <div className="flex items-center justify-between gap-3">

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>

        <span className="text-[10px] uppercase tracking-wider text-slate-600">
          {title}
        </span>

      </div>

      <p className="mt-5 text-2xl font-extrabold">
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-600">
        {subtitle}
      </p>

    </div>
  );
              }
