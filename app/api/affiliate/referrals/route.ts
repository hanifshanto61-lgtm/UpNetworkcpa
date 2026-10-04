import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type AnyRecord = Record<string, any>;

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function findAffiliateProfile(
  supabaseAdmin: any,
  user: any
) {
  const lookups = [
    { column: "id", value: user.id },
    { column: "user_id", value: user.id },
    { column: "auth_id", value: user.id },
    { column: "email", value: user.email },
  ];

  for (const lookup of lookups) {
    if (!lookup.value) continue;

    try {
      const result = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq(lookup.column, lookup.value)
        .maybeSingle();

      if (!result.error && result.data) {
        return result.data as AnyRecord;
      }
    } catch (error) {
      console.warn("Profile lookup error:", error);
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Supabase server configuration is missing.",
        },
        { status: 500 }
      );
    }

    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    const accessToken = authorization
      .replace("Bearer ", "")
      .trim();

    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    const user = authData?.user;

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your login session is invalid or expired.",
        },
        { status: 401 }
      );
    }

    /*
     * Find current affiliate profile.
     */
    const profile = await findAffiliateProfile(
      supabaseAdmin,
      user
    );

    const affiliateId = String(
      profile?.affiliate_id ||
        profile?.affiliateId ||
        profile?.affiliate_code ||
        profile?.code ||
        ""
    ).trim();

    if (!affiliateId) {
      return NextResponse.json(
        {
          success: true,
          affiliateId: "",
          referralLink: "",
          totalReferrals: 0,
          referrals: [],
          commissionRate: 5,
          totalCommission: 0,
          pendingCommission: 0,
          paidCommission: 0,
          commissionCurrency: "USD",
          commissions: [],
        },
        {
          status: 200,
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    /*
     * ------------------------------------------
     * REFERRALS
     * ------------------------------------------
     *
     * IMPORTANT:
     * Only columns that actually exist in the
     * current profiles table are selected.
     */
    const referralsResult = await supabaseAdmin
      .from("profiles")
      .select(
        "id, affiliate_id, email, full_name, username, created_at, referred_by"
      )
      .eq("referred_by", affiliateId)
      .order("created_at", {
        ascending: false,
      });

    if (referralsResult.error) {
      console.error(
        "Referral query error:",
        referralsResult.error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Referral database could not be loaded.",
          affiliateId,
          referralLink: "",
          totalReferrals: 0,
          referrals: [],
          commissionRate: 5,
          totalCommission: 0,
          pendingCommission: 0,
          paidCommission: 0,
          commissionCurrency: "USD",
          commissions: [],
        },
        { status: 500 }
      );
    }

    const referrals = (
      referralsResult.data || []
    ).map((referral: AnyRecord) => ({
      id: referral.id,

      affiliateId:
        referral.affiliate_id || "",

      email:
        referral.email || "",

      name:
        referral.full_name ||
        referral.username ||
        referral.email?.split("@")[0] ||
        "Affiliate",

      status: "pending",

      joinedAt:
        referral.created_at || null,
    }));

    /*
     * ------------------------------------------
     * REFERRAL COMMISSIONS
     * ------------------------------------------
     *
     * Commission data is optional.
     *
     * If the referral_commissions table is not
     * ready yet, referrals will still load normally.
     */
    let commissions: any[] = [];

    try {
      const commissionsResult =
        await supabaseAdmin
          .from("referral_commissions")
          .select(
            "id, referred_affiliate_id, click_id, source_earnings, commission_rate, commission_amount, status, created_at, paid_at"
          )
          .eq(
            "referrer_affiliate_id",
            affiliateId
          )
          .order("created_at", {
            ascending: false,
          });

      if (!commissionsResult.error) {
        commissions = (
          commissionsResult.data || []
        ).map((commission: AnyRecord) => ({
          id: commission.id,

          referredAffiliateId:
            commission.referred_affiliate_id || "",

          clickId:
            commission.click_id || null,

          sourceEarnings:
            Number(
              commission.source_earnings || 0
            ),

          commissionRate:
            Number(
              commission.commission_rate || 5
            ),

          commissionAmount:
            Number(
              commission.commission_amount || 0
            ),

          status:
            commission.status || "pending",

          createdAt:
            commission.created_at || null,

          paidAt:
            commission.paid_at || null,
        }));
      } else {
        console.warn(
          "Referral commission query skipped:",
          commissionsResult.error
        );
      }
    } catch (error) {
      console.warn(
        "Referral commission query failed:",
        error
      );
    }

    /*
     * ------------------------------------------
     * CALCULATE COMMISSION BALANCES
     * ------------------------------------------
     */
    let totalCommission = 0;
    let pendingCommission = 0;
    let paidCommission = 0;

    for (const commission of commissions) {
      const amount =
        Number(
          commission.commissionAmount
        ) || 0;

      totalCommission += amount;

      if (
        String(commission.status).toLowerCase() ===
        "paid"
      ) {
        paidCommission += amount;
      } else {
        pendingCommission += amount;
      }
    }

    /*
     * Round currency values to 2 decimals.
     */
    totalCommission =
      Math.round(
        totalCommission * 100
      ) / 100;

    pendingCommission =
      Math.round(
        pendingCommission * 100
      ) / 100;

    paidCommission =
      Math.round(
        paidCommission * 100
      ) / 100;

    /*
     * ------------------------------------------
     * BUILD REFERRAL LINK
     * ------------------------------------------
     */
    const forwardedProto =
      request.headers.get(
        "x-forwarded-proto"
      );

    const host =
      request.headers.get("host");

    const requestOrigin =
      request.headers.get("origin");

    let baseUrl =
      requestOrigin?.trim() || "";

    if (!baseUrl && host) {
      baseUrl = `${
        forwardedProto || "https"
      }://${host}`;
    }

    const referralLink = baseUrl
      ? `${baseUrl}/signup?ref=${encodeURIComponent(
          affiliateId
        )}`
      : "";

    /*
     * ------------------------------------------
     * FINAL RESPONSE
     * ------------------------------------------
     */
    return NextResponse.json(
      {
        success: true,

        affiliateId,

        referralLink,

        commissionRate: 5,

        commissionCurrency: "USD",

        totalReferrals:
          referrals.length,

        referrals,

        totalCommission,

        pendingCommission,

        paidCommission,

        commissions,
      },
      {
        status: 200,
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

    return NextResponse.json(
      {
        success: false,
        error:
          "Could not load referral information.",
      },
      { status: 500 }
    );
  }
}
