import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_REFERRAL_RATE = 5;
const PAGE_SIZE = 1000;

type ReferralRow = {
  id: string;
  referrer_affiliate_id: string;
  referred_user_id: string | null;
  referred_affiliate_id: string;
  status: string;
  created_at: string;
};

type CommissionRow = {
  id: string;
  referrer_affiliate_id: string;
  referred_affiliate_id: string;
  click_id: string | null;
  source_earnings: number | string | null;
  commission_rate: number | string | null;
  commission_amount: number | string | null;
  status: string;
  created_at: string;
  paid_at: string | null;
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase server configuration is missing."
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function safeText(value: unknown): string {
  return String(value ?? "").trim();
}

function safeNumber(value: unknown): number {
  const valueNumber = Number(value ?? 0);

  return Number.isFinite(valueNumber)
    ? valueNumber
    : 0;
}

function roundMoney(value: unknown): number {
  return Math.round(safeNumber(value) * 100) / 100;
}

function errorResponse(
  message: string,
  status: number,
  code?: string
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(code ? { code } : {}),
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminClient();

    // 1. Verify login token.
    const authorization =
      request.headers.get("authorization") || "";

    if (!authorization.startsWith("Bearer ")) {
      return errorResponse(
        "Authentication required.",
        401
      );
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return errorResponse(
        "Authentication token is missing.",
        401
      );
    }

    const {
      data: authData,
      error: authError,
    } = await admin.auth.getUser(token);

    if (authError || !authData.user) {
      return errorResponse(
        "Your login session has expired.",
        401
      );
    }

    const user = authData.user;

    // 2. Read the current profiles table.
    const {
      data: profile,
      error: profileError,
    } = await admin
      .from("profiles")
      .select("id,affiliate_id,application_status")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Referral profile query:",
        profileError.message
      );

      return errorResponse(
        "Unable to load affiliate profile.",
        500
      );
    }

    if (!profile) {
      return errorResponse(
        "Affiliate profile not found.",
        404
      );
    }

    const affiliateId = safeText(
      profile.affiliate_id
    );

    if (!affiliateId) {
      return errorResponse(
        "Affiliate ID is unavailable.",
        400
      );
    }

    const applicationStatus = safeText(
      profile.application_status
    ).toLowerCase();

    if (
      applicationStatus !== "approved" &&
      applicationStatus !== "active"
    ) {
      return errorResponse(
        "Approved affiliate account required.",
        403
      );
    }

    // 3. Build the referral link.
    const referralLink =
      "https://upnetworkcpa.com/signup?ref=" +
      encodeURIComponent(affiliateId);

    // 4. Load referral records.
    const referralRows: ReferralRow[] = [];

    let referralOffset = 0;

    while (true) {
      const {
        data,
        error,
      } = await admin
        .from("referrals")
        .select(
          "id,referrer_affiliate_id,referred_user_id,referred_affiliate_id,status,created_at"
        )
        .eq("referrer_affiliate_id", affiliateId)
        .order("created_at", {
          ascending: false,
        })
        .order("id", {
          ascending: false,
        })
        .range(
          referralOffset,
          referralOffset + PAGE_SIZE - 1
        );

      if (error) {
        console.error(
          "Referral records query:",
          error.message
        );

        return errorResponse(
          "Unable to load referral records.",
          500
        );
      }

      const page = (data ?? []) as ReferralRow[];

      referralRows.push(...page);

      if (page.length < PAGE_SIZE) break;

      referralOffset += PAGE_SIZE;
    }

    // 5. Load commissions using the actual
    // database column names.
    const commissionRows: CommissionRow[] = [];

    let commissionOffset = 0;

    while (true) {
      const {
        data,
        error,
      } = await admin
        .from("referral_commissions")
        .select(
          "id,referrer_affiliate_id,referred_affiliate_id,click_id,source_earnings,commission_rate,commission_amount,status,created_at,paid_at"
        )
        .eq(
          "referrer_affiliate_id",
          affiliateId
        )
        .order("created_at", {
          ascending: false,
        })
        .order("id", {
          ascending: false,
        })
        .range(
          commissionOffset,
          commissionOffset + PAGE_SIZE - 1
        );

      if (error) {
        console.error(
          "Referral commission query:",
          error.message
        );

        return errorResponse(
          "Unable to load referral commissions.",
          500
        );
      }

      const page = (data ?? []) as CommissionRow[];

      commissionRows.push(...page);

      if (page.length < PAGE_SIZE) break;

      commissionOffset += PAGE_SIZE;
    }

    // 6. Calculate commission totals.
    let totalCommission = 0;
    let pendingCommission = 0;
    let paidCommission = 0;

    const commissions = commissionRows.map(
      (row) => {
        const amount = roundMoney(
          row.commission_amount
        );

        const status =
          safeText(row.status).toLowerCase() ||
          "pending";

        totalCommission += amount;

        if (status === "paid") {
          paidCommission += amount;
        } else if (
          status === "pending" ||
          status === "approved"
        ) {
          pendingCommission += amount;
        }

        return {
          id: row.id,
          referralId: null,
          referredAffiliateId:
            row.referred_affiliate_id,
          clickId: row.click_id,
          sourceEarnings: roundMoney(
            row.source_earnings
          ),
          commissionRate: safeNumber(
            row.commission_rate ??
              DEFAULT_REFERRAL_RATE
          ),
          commissionAmount: amount,
          amount,
          status,
          createdAt: row.created_at,
          paidAt: row.paid_at,
        };
      }
    );

    // 7. Calculate per-referred-affiliate
    // commission amounts.
    const commissionByAffiliate =
      new Map<string, number>();

    for (const row of commissionRows) {
      const referredId = safeText(
        row.referred_affiliate_id
      );

      if (!referredId) continue;

      const previous =
        commissionByAffiliate.get(referredId) || 0;

      commissionByAffiliate.set(
        referredId,
        previous +
          roundMoney(row.commission_amount)
      );
    }

    // 8. Format referral records.
    const referrals = referralRows.map(
      (row) => {
        const referredId = safeText(
          row.referred_affiliate_id
        );

        return {
          id: row.id,
          affiliateId: referredId,
          name: referredId || "Affiliate",
          email: "",
          status: row.status || "pending",
          joinedAt: row.created_at,
          commission: roundMoney(
            commissionByAffiliate.get(
              referredId
            ) || 0
          ),
        };
      }
    );

    // 9. Return data for the existing
    // affiliate referrals page.
    return NextResponse.json(
      {
        success: true,
        affiliateId,
        referralLink,
        commissionRate:
          DEFAULT_REFERRAL_RATE,
        commissionCurrency: "USD",
        totalReferrals: referrals.length,
        referrals,
        totalCommission: roundMoney(
          totalCommission
        ),
        pendingCommission: roundMoney(
          pendingCommission
        ),
        paidCommission: roundMoney(
          paidCommission
        ),
        commissions,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  } catch (error) {
    console.error(
      "Affiliate referrals API:",
      error
    );

    return errorResponse(
      "Could not load referral information.",
      500
    );
  }
}