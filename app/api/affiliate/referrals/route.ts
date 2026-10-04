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
  try {
    const result = await supabaseAdmin
      .from("affiliate_profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!result.error && result.data) {
      return result.data as AnyRecord;
    }

    if (result.error) {
      console.error(
        "Affiliate profile lookup error:",
        result.error
      );
    }
  } catch (error) {
    console.error(
      "Affiliate profile lookup exception:",
      error
    );
  }

  return null;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export async function GET(request: NextRequest) {
  try {
    /* ------------------------------------------
       1. SUPABASE ADMIN CLIENT
    ------------------------------------------ */

    const supabaseAdmin = getSupabaseAdmin();

    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Supabase server configuration is missing.",
        },
        { status: 500 }
      );
    }

    /* ------------------------------------------
       2. AUTHENTICATION
    ------------------------------------------ */

    const authorization =
      request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
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

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication token is missing.",
        },
        { status: 401 }
      );
    }

    /* ------------------------------------------
       3. VERIFY USER
    ------------------------------------------ */

    const {
      data: authData,
      error: authError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken
      );

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

    /* ------------------------------------------
       4. FIND AFFILIATE PROFILE
    ------------------------------------------ */

    const profile =
      await findAffiliateProfile(
        supabaseAdmin,
        user
      );

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Affiliate profile could not be found.",
          code: "AFFILIATE_PROFILE_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    /* ------------------------------------------
       5. AFFILIATE ID
    ------------------------------------------ */

    const affiliateId = String(
      profile.affiliate_id || ""
    ).trim();

    if (!affiliateId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Affiliate ID is unavailable.",
          code: "AFFILIATE_ID_UNAVAILABLE",
        },
        { status: 400 }
      );
    }

    /* ------------------------------------------
       6. REFERRAL RATE
    ------------------------------------------ */

    const commissionRate = Number(
      profile.referral_rate ?? 5
    );

    /* ------------------------------------------
       7. BUILD REFERRAL LINK
    ------------------------------------------ */

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

    /* ------------------------------------------
       8. LOAD REFERRALS
    ------------------------------------------ */

    const referralsResult =
      await supabaseAdmin
        .from("referrals")
        .select(
          `
            id,
            referrer_affiliate_id,
            referred_user_id,
            referred_affiliate_id,
            status,
            created_at
          `
        )
        .eq(
          "referrer_affiliate_id",
          affiliateId
        )
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
        },
        { status: 500 }
      );
    }

    const referralRows =
      referralsResult.data || [];

    /* ------------------------------------------
       9. LOAD REFERRAL COMMISSIONS
    ------------------------------------------ */

    let commissions: AnyRecord[] = [];

    try {
      const commissionsResult =
        await supabaseAdmin
          .from("referral_commissions")
          .select(
            `
              id,
              affiliate_id,
              referral_id,
              amount,
              status,
              created_at,
              paid_at
            `
          )
          .eq(
            "affiliate_id",
            affiliateId
          )
          .order("created_at", {
            ascending: false,
          });

      if (!commissionsResult.error) {
        commissions =
          commissionsResult.data || [];
      } else {
        console.warn(
          "Referral commission query error:",
          commissionsResult.error
        );
      }
    } catch (error) {
      console.warn(
        "Referral commission loading failed:",
        error
      );
    }

    /* ------------------------------------------
       10. CREATE COMMISSION LOOKUP
    ------------------------------------------ */

    const commissionByReferral =
      new Map<string, AnyRecord>();

    for (const commission of commissions) {
      if (
        commission.referral_id &&
        !commissionByReferral.has(
          commission.referral_id
        )
      ) {
        commissionByReferral.set(
          commission.referral_id,
          commission
        );
      }
    }

    /* ------------------------------------------
       11. FORMAT REFERRALS
    ------------------------------------------ */

    const referrals =
      referralRows.map(
        (referral: AnyRecord) => {
          const commission =
            commissionByReferral.get(
              referral.id
            );

          const referredAffiliateId =
            String(
              referral.referred_affiliate_id ||
                ""
            ).trim();

          return {
            id: referral.id,

            affiliateId:
              referredAffiliateId,

            email: "",

            name:
              referredAffiliateId ||
              "Affiliate",

            status:
              referral.status ||
              "pending",

            joinedAt:
              referral.created_at ||
              null,

            commission:
              commission
                ? Number(
                    commission.amount || 0
                  )
                : 0,

            commissionStatus:
              commission?.status ||
              "pending",
          };
        }
      );

    /* ------------------------------------------
       12. CALCULATE COMMISSIONS
    ------------------------------------------ */

    let totalCommission = 0;
    let pendingCommission = 0;
    let paidCommission = 0;

    for (const commission of commissions) {
      const amount = Number(
        commission.amount || 0
      );

      if (!Number.isFinite(amount)) {
        continue;
      }

      totalCommission += amount;

      const status = String(
        commission.status || "pending"
      )
        .trim()
        .toLowerCase();

      if (status === "paid") {
        paidCommission += amount;
      } else {
        pendingCommission += amount;
      }
    }

    totalCommission =
      roundCurrency(totalCommission);

    pendingCommission =
      roundCurrency(pendingCommission);

    paidCommission =
      roundCurrency(paidCommission);

    /* ------------------------------------------
       13. FORMAT COMMISSIONS
    ------------------------------------------ */

    const formattedCommissions =
      commissions.map(
        (commission: AnyRecord) => ({
          id: commission.id,

          referralId:
            commission.referral_id ||
            null,

          affiliateId:
            commission.affiliate_id ||
            affiliateId,

          amount:
            roundCurrency(
              Number(
                commission.amount || 0
              )
            ),

          status:
            commission.status ||
            "pending",

          createdAt:
            commission.created_at ||
            null,

          paidAt:
            commission.paid_at ||
            null,
        })
      );

    /* ------------------------------------------
       14. FINAL RESPONSE
    ------------------------------------------ */

    return NextResponse.json(
      {
        success: true,

        affiliateId,

        referralLink,

        commissionRate,

        commissionCurrency: "USD",

        totalReferrals:
          referrals.length,

        referrals,

        totalCommission,

        pendingCommission,

        paidCommission,

        commissions:
          formattedCommissions,
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
