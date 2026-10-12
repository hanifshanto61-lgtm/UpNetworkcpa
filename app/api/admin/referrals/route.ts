import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAGE_SIZE = 1000;
const MAX_ROWS = 100000;

type ReferralRow = {
  id: string;
  referrer_affiliate_id: string;
  referred_affiliate_id: string;
  status: string | null;
  created_at: string | null;
};

type CommissionRow = {
  id: string;
  referrer_affiliate_id: string;
  referred_affiliate_id: string;
  click_id: string | null;
  source_earnings: number | string | null;
  commission_rate: number | string | null;
  commission_amount: number | string | null;
  status: string | null;
  created_at: string | null;
  paid_at: string | null;
};

type ReferrerReport = {
  affiliateId: string;
  referrals: number;
  total: number;
  pending: number;
  paid: number;
};

function safeNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function respond(
  data: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);

    if (!session) {
      return respond(
        {
          success: false,
          error: "Admin access required.",
        },
        401
      );
    }

    const db = session.client;

    const referrals: ReferralRow[] = [];
    const commissions: CommissionRow[] = [];

    let offset = 0;

    // Load referral records.
    while (true) {
      const { data, error } = await db
        .from("referrals")
        .select(
          "id,referrer_affiliate_id,referred_affiliate_id,status,created_at"
        )
        .order("created_at", {
          ascending: false,
        })
        .order("id", {
          ascending: false,
        })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.error("Admin referrals query:", error);

        return respond(
          {
            success: false,
            error: "Unable to load referrals.",
          },
          500
        );
      }

      const page = (data || []) as ReferralRow[];

      if (offset + page.length > MAX_ROWS) {
        return respond(
          {
            success: false,
            error: "Referral report exceeds record limit.",
          },
          413
        );
      }

      referrals.push(...page);

      if (page.length < PAGE_SIZE) break;

      offset += PAGE_SIZE;
    }

    offset = 0;

    // Load referral commissions.
    while (true) {
      const { data, error } = await db
        .from("referral_commissions")
        .select(
          "id,referrer_affiliate_id,referred_affiliate_id,click_id,source_earnings,commission_rate,commission_amount,status,created_at,paid_at"
        )
        .order("created_at", {
          ascending: false,
        })
        .order("id", {
          ascending: false,
        })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.error(
          "Admin referral commissions query:",
          error
        );

        return respond(
          {
            success: false,
            error: "Unable to load referral commissions.",
          },
          500
        );
      }

      const page = (data || []) as CommissionRow[];

      if (offset + page.length > MAX_ROWS) {
        return respond(
          {
            success: false,
            error: "Commission report exceeds record limit.",
          },
          413
        );
      }

      commissions.push(...page);

      if (page.length < PAGE_SIZE) break;

      offset += PAGE_SIZE;
    }

    let totalCommission = 0;
    let pendingCommission = 0;
    let paidCommission = 0;

    const referrerMap = new Map<
      string,
      ReferrerReport
    >();

    const getReferrer = (
      affiliateId: string
    ): ReferrerReport => {
      const existing = referrerMap.get(affiliateId);

      if (existing) {
        return existing;
      }

      const report: ReferrerReport = {
        affiliateId,
        referrals: 0,
        total: 0,
        pending: 0,
        paid: 0,
      };

      referrerMap.set(affiliateId, report);

      return report;
    };

    for (const referral of referrals) {
      const affiliateId =
        referral.referrer_affiliate_id || "Unassigned";

      const report = getReferrer(affiliateId);

      report.referrals += 1;
    }

    for (const commission of commissions) {
      const affiliateId =
        commission.referrer_affiliate_id ||
        "Unassigned";

      const report = getReferrer(affiliateId);

      const amount = safeNumber(
        commission.commission_amount
      );

      const status = String(
        commission.status || "pending"
      ).toLowerCase();

      report.total += amount;
      totalCommission += amount;

      if (status === "paid") {
        report.paid += amount;
        paidCommission += amount;
      } else if (
        status === "pending" ||
        status === "approved"
      ) {
        report.pending += amount;
        pendingCommission += amount;
      }
    }

    const referrers = Array.from(
      referrerMap.values()
    )
      .map((item) => ({
        ...item,
        total: money(item.total),
        pending: money(item.pending),
        paid: money(item.paid),
      }))
      .sort((a, b) => b.total - a.total);

    const referralHistory = referrals.map((row) => ({
      id: row.id,
      referrerId: row.referrer_affiliate_id,
      referredId: row.referred_affiliate_id,
      status: row.status || "pending",
      createdAt: row.created_at,
    }));

    const commissionHistory = commissions.map((row) => ({
      id: row.id,
      referrerId: row.referrer_affiliate_id,
      referredId: row.referred_affiliate_id,
      clickId: row.click_id,
      sourceEarnings: money(
        safeNumber(row.source_earnings)
      ),
      rate: safeNumber(row.commission_rate ?? 5),
      amount: money(
        safeNumber(row.commission_amount)
      ),
      status: row.status || "pending",
      createdAt: row.created_at,
      paidAt: row.paid_at,
    }));

    return respond({
      success: true,
      currency: "USD",
      defaultCommissionRate: 5,
      stats: {
        totalReferrals: referrals.length,
        totalCommissions: commissions.length,
        totalCommission: money(totalCommission),
        pendingCommission: money(pendingCommission),
        paidCommission: money(paidCommission),
      },
      referrers,
      referrals: referralHistory,
      commissions: commissionHistory,
    });
  } catch (error) {
    console.error("Admin referrals API error:", error);

    return respond(
      {
        success: false,
        error: "Unable to load referral report.",
      },
      500
    );
  }
}
