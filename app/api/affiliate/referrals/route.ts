import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DatabaseRow = Record<string, unknown>;

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase server configuration missing.");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function number(value: unknown): number {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function currency(value: unknown): number {
  return Math.round(number(value) * 100) / 100;
}

function respond(
  error: string,
  status: number,
  code?: string
) {
  return NextResponse.json(
    {
      success: false,
      error,
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

    const header =
      request.headers.get("authorization") || "";

    if (!header.startsWith("Bearer ")) {
      return respond("Authentication required.", 401);
    }

    const token = header.slice(7).trim();

    if (!token) {
      return respond("Authentication token missing.", 401);
    }

    const {
      data: authData,
      error: authError,
    } = await admin.auth.getUser(token);

    if (authError || !authData.user) {
      return respond(
        "Your login session has expired.",
        401
      );
    }

    const user = authData.user;

    // Use the CURRENT affiliate profile table.
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
        "Referral profile error:",
        profileError.message
      );

      return respond(
        "Unable to load affiliate profile.",
        500
      );
    }

    if (!profile) {
      return respond(
        "Affiliate profile not found.",
        404,
        "AFFILIATE_PROFILE_NOT_FOUND"
      );
    }

    const affiliateId = text(profile.affiliate_id);

    if (!affiliateId) {
      return respond(
        "Affiliate ID has not been assigned.",
        400,
        "AFFILIATE_ID_UNAVAILABLE"
      );
    }

    const applicationStatus =
      text(profile.application_status).toLowerCase();

    if (
      applicationStatus !== "approved" &&
      applicationStatus !== "active"
    ) {
      return respond(
        "Approved affiliate account required.",
        403
      );
    }

    // Existing referral commission rate.
    const commissionRate = 5;

    const referralLink =
      `https://upnetworkcpa.com/signup?ref=` +
      encodeURIComponent(affiliateId);

    // Read only referrals belonging to this affiliate.
    const {
      data: referralData,
      error: referralError,
    } = await admin
      .from("referrals")
      .select("*")
      .eq("referrer_affiliate_id", affiliateId)
      .order("created_at", {
        ascending: false,
      });

    if (referralError) {
      console.error(
        "Referral query error:",
        referralError.message
      );

      return respond(
        "Unable to load referral records.",
        500
      );
    }

    const referralRows =
      (referralData ?? []) as DatabaseRow[];

    // Load commission records for this affiliate.
    const {
      data: commissionData,
      error: commissionError,
    } = await admin
      .from("referral_commissions")
      .select("*")
      .eq("affiliate_id", affiliateId)
      .order("created_at", {
        ascending: false,
      });

    if (commissionError) {
      console.error(
        "Referral commission error:",
        commissionError.message
      );

      return respond(
        "Unable to load referral commissions.",
        500
      );
    }

    const commissionRows =
      (commissionData ?? []) as DatabaseRow[];

    const commissionByReferral = new Map<
      string,
      number
    >();

    for (const row of commissionRows) {
      const referralId = text(row.referral_id);

      if (referralId) {
        commissionByReferral.set(
          referralId,
          (commissionByReferral.get(referralId) || 0) +
            currency(row.amount)
        );
      }
    }

    const referrals = referralRows.map((row) => {
      const id = text(row.id);
      const referredAffiliateId = text(
        row.referred_affiliate_id
      );

      return {
        id,
        affiliateId: referredAffiliateId,
        name: referredAffiliateId || "Affiliate",
        email: "",
        status: text(row.status) || "pending",
        joinedAt: row.created_at || null,
        commission: currency(
          commissionByReferral.get(id) || 0
        ),
      };
    });

    let totalCommission = 0;
    let pendingCommission = 0;
    let paidCommission = 0;

    const commissions = commissionRows.map((row) => {
      const amount = currency(row.amount);
      const status =
        text(row.status).toLowerCase() || "pending";

      totalCommission += amount;

      if (status === "paid") {
        paidCommission += amount;
      } else {
        pendingCommission += amount;
      }

      return {
        id: text(row.id),
        referralId: text(row.referral_id),
        referredAffiliateId:
          text(row.referred_affiliate_id) ||
          text(row.affiliate_id),
        clickId: text(row.click_id) || null,
        sourceEarnings: currency(
          row.source_earnings
        ),
        commissionRate: number(
          row.commission_rate ?? commissionRate
        ),
        commissionAmount: amount,
        amount,
        status,
        createdAt: row.created_at || null,
        paidAt: row.paid_at || null,
      };
    });

    return NextResponse.json(
      {
        success: true,
        affiliateId,
        referralLink,
        commissionRate,
        commissionCurrency: "USD",
        totalReferrals: referrals.length,
        referrals,
        totalCommission: currency(totalCommission),
        pendingCommission: currency(pendingCommission),
        paidCommission: currency(paidCommission),
        commissions,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error(
      "Affiliate referrals API error:",
      error
    );

    return respond(
      "Could not load referral information.",
      500
    );
  }
}