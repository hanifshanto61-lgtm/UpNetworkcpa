import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type AnyRecord = Record<string, any>;

const RECENT_CLICKS_LIMIT = 20;

const CONVERSION_STATUSES = [
  "converted",
  "conversion",
  "approved",
  "paid",
];

function makeAffiliateId(userId: string) {
  return `UP${userId
    .replace(/-/g, "")
    .slice(0, 10)
    .toUpperCase()}`;
}

function normalizeStatus(value: any) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getNumericPayout(value: any) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

/**
 * Convert affiliate profile status to dashboard access status.
 *
 * Our current database uses:
 * affiliate_profiles.status
 *
 * Typical values:
 * active
 * pending
 * rejected
 * suspended
 */
function normalizeAffiliateStatus(value: any) {
  const status = normalizeStatus(value);

  if (
    status === "active" ||
    status === "approved"
  ) {
    return "approved";
  }

  if (status === "rejected") {
    return "rejected";
  }

  if (status === "suspended") {
    return "suspended";
  }

  return "pending";
}

/**
 * Find the current affiliate profile.
 *
 * Current schema:
 * public.affiliate_profiles
 *
 * Primary relation:
 * affiliate_profiles.id = auth.users.id
 */
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

/**
 * Create an affiliate profile if one does not exist.
 *
 * This is a fallback for newly approved affiliate
 * accounts that do not yet have a profile row.
 */
async function createAffiliateProfile(
  supabaseAdmin: any,
  user: any,
  affiliateId: string
) {
  try {
    const fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Affiliate";

    const result = await supabaseAdmin
      .from("affiliate_profiles")
      .insert({
        id: user.id,
        affiliate_id: affiliateId,
        full_name: fullName,
        email: user.email || null,
        status: "active",
        referral_code: affiliateId,
        referral_rate: 5,
      })
      .select("*")
      .maybeSingle();

    if (!result.error && result.data) {
      return result.data as AnyRecord;
    }

    if (result.error) {
      console.error(
        "Affiliate profile creation error:",
        result.error
      );
    }
  } catch (error) {
    console.error(
      "Affiliate profile creation exception:",
      error
    );
  }

  return null;
}

export async function GET(
  request: NextRequest
) {
  try {
    /* -------------------------------------------------
       1. SERVER CONFIGURATION
    ------------------------------------------------- */

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      return NextResponse.json(
        {
          error:
            "Supabase server configuration is missing.",
        },
        { status: 500 }
      );
    }

    /* -------------------------------------------------
       2. AUTHENTICATION
    ------------------------------------------------- */

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        { status: 401 }
      );
    }

    const accessToken =
      authorization
        .replace("Bearer ", "")
        .trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "Authentication token is missing.",
        },
        { status: 401 }
      );
    }

    /* -------------------------------------------------
       3. SUPABASE ADMIN CLIENT
    ------------------------------------------------- */

    const supabaseAdmin =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    /* -------------------------------------------------
       4. VERIFY USER TOKEN
    ------------------------------------------------- */

    const {
      data: authData,
      error: authError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken
      );

    const user = authData?.user;

    if (
      authError ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "Your login session is invalid or expired.",
        },
        { status: 401 }
      );
    }

    /* -------------------------------------------------
       5. ACCOUNT TYPE CHECK
    ------------------------------------------------- */

    const accountType =
      String(
        user.user_metadata
          ?.account_type || ""
      )
        .trim()
        .toLowerCase();

    if (
      accountType &&
      accountType !== "affiliate"
    ) {
      return NextResponse.json(
        {
          error:
            "This account is not an affiliate account.",
          code: "NOT_AFFILIATE",
          status: "rejected",
        },
        { status: 403 }
      );
    }

    /* -------------------------------------------------
       6. FIND AFFILIATE PROFILE
    ------------------------------------------------- */

    let profile =
      await findAffiliateProfile(
        supabaseAdmin,
        user
      );

    /* -------------------------------------------------
       7. DETERMINE APPLICATION STATUS
    ------------------------------------------------- */

    let applicationStatus =
      normalizeAffiliateStatus(
        profile?.status
      );

    /*
     * Auth metadata can override the database status
     * when an admin system explicitly stores one.
     */

    const metadataStatus =
      normalizeStatus(
        user.user_metadata
          ?.application_status
      );

    if (
      metadataStatus === "approved"
    ) {
      applicationStatus =
        "approved";
    }

    if (
      metadataStatus === "rejected"
    ) {
      applicationStatus =
        "rejected";
    }

    if (
      metadataStatus === "suspended"
    ) {
      applicationStatus =
        "suspended";
    }

    /*
     * If there is no profile at all, fail closed.
     * We will only create a profile for an explicitly
     * approved affiliate account.
     */

    if (!profile) {
      if (
        applicationStatus !==
        "approved"
      ) {
        return NextResponse.json(
          {
            error:
              "Your affiliate application is waiting for admin approval.",
            code: "AFFILIATE_PENDING",
            status: "pending",
          },
          {
            status: 403,
            headers: {
              "Cache-Control":
                "no-store, no-cache, must-revalidate",
            },
          }
        );
      }

      const generatedAffiliateId =
        makeAffiliateId(user.id);

      profile =
        await createAffiliateProfile(
          supabaseAdmin,
          user,
          generatedAffiliateId
        );
    }

    /* -------------------------------------------------
       8. FINAL PROFILE CHECK
    ------------------------------------------------- */

    if (!profile) {
      return NextResponse.json(
        {
          error:
            "Unable to read the affiliate profile.",
          code: "AFFILIATE_PROFILE_NOT_FOUND",
        },
        { status: 500 }
      );
    }

    /*
     * If the profile exists and its status is active,
     * the affiliate is allowed to use the dashboard.
     */

    applicationStatus =
      normalizeAffiliateStatus(
        profile.status
      );

    /*
     * Explicit Auth metadata approval/rejection
     * remains authoritative.
     */

    if (
      metadataStatus === "approved"
    ) {
      applicationStatus =
        "approved";
    }

    if (
      metadataStatus === "rejected"
    ) {
      applicationStatus =
        "rejected";
    }

    if (
      metadataStatus === "suspended"
    ) {
      applicationStatus =
        "suspended";
    }

    /* -------------------------------------------------
       9. BLOCK NON-APPROVED AFFILIATES
    ------------------------------------------------- */

    if (
      applicationStatus !==
      "approved"
    ) {
      if (
        applicationStatus ===
        "rejected"
      ) {
        return NextResponse.json(
          {
            error:
              "Your affiliate application has been rejected.",
            code: "AFFILIATE_REJECTED",
            status: "rejected",
          },
          {
            status: 403,
            headers: {
              "Cache-Control":
                "no-store, no-cache, must-revalidate",
            },
          }
        );
      }

      if (
        applicationStatus ===
        "suspended"
      ) {
        return NextResponse.json(
          {
            error:
              "Your affiliate account has been suspended.",
            code: "AFFILIATE_SUSPENDED",
            status: "suspended",
          },
          {
            status: 403,
            headers: {
              "Cache-Control":
                "no-store, no-cache, must-revalidate",
            },
          }
        );
      }

      return NextResponse.json(
        {
          error:
            "Your affiliate application is waiting for admin approval.",
          code: "AFFILIATE_PENDING",
          status: "pending",
        },
        {
          status: 403,
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    /* -------------------------------------------------
       10. AFFILIATE ID
    ------------------------------------------------- */

    let affiliateId =
      profile.affiliate_id ||
      "";

    /*
     * If affiliate_id is somehow missing, generate one
     * and save it to the current affiliate profile.
     */

    if (!affiliateId) {
      affiliateId =
        makeAffiliateId(user.id);

      try {
        const updateResult =
          await supabaseAdmin
            .from("affiliate_profiles")
            .update({
              affiliate_id:
                affiliateId,
              referral_code:
                profile.referral_code ||
                affiliateId,
              updated_at:
                new Date().toISOString(),
            })
            .eq("id", user.id)
            .select("*")
            .maybeSingle();

        if (
          !updateResult.error &&
          updateResult.data
        ) {
          profile =
            updateResult.data;
        }
      } catch (error) {
        console.warn(
          "Affiliate ID update error:",
          error
        );
      }
    }

    affiliateId =
      String(affiliateId).trim();

    if (!affiliateId) {
      return NextResponse.json(
        {
          error:
            "Affiliate ID could not be created.",
        },
        { status: 500 }
      );
    }

    /* -------------------------------------------------
       11. AFFILIATE DISPLAY NAME
    ------------------------------------------------- */

    const profileName =
      profile.full_name ||
      user.user_metadata
        ?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Affiliate";

    /* -------------------------------------------------
       12. LOAD RECENT CLICKS
    ------------------------------------------------- */

    let clicks: AnyRecord[] = [];

    try {
      const clicksResult =
        await supabaseAdmin
          .from("clicks")
          .select(
            [
              "click_id",
              "affiliate_id",
              "smartlink_id",
              "country",
              "device",
              "browser",
              "referer",
              "status",
              "payout",
              "converted_at",
              "created_at",
            ].join(", ")
          )
          .eq(
            "affiliate_id",
            affiliateId
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(
            RECENT_CLICKS_LIMIT
          );

      if (!clicksResult.error) {
        clicks =
          clicksResult.data || [];
      } else {
        console.error(
          "Recent clicks query error:",
          clicksResult.error
        );
      }
    } catch (error) {
      console.error(
        "Clicks loading error:",
        error
      );
    }

    /* -------------------------------------------------
       13. TOTAL CLICK COUNT
    ------------------------------------------------- */

    let totalClicks = 0;

    try {
      const countResult =
        await supabaseAdmin
          .from("clicks")
          .select(
            "click_id",
            {
              count: "exact",
              head: true,
            }
          )
          .eq(
            "affiliate_id",
            affiliateId
          );

      if (
        !countResult.error &&
        typeof countResult.count ===
          "number"
      ) {
        totalClicks =
          countResult.count;
      }
    } catch (error) {
      console.error(
        "Total click count error:",
        error
      );
    }

    /* -------------------------------------------------
       14. CONVERSIONS + EARNINGS
    ------------------------------------------------- */

    let conversions = 0;
    let earnings = 0;

    try {
      const conversionResult =
        await supabaseAdmin
          .from("clicks")
          .select(
            "status, payout, converted_at"
          )
          .eq(
            "affiliate_id",
            affiliateId
          )
          .or(
            "status.eq.converted,status.eq.conversion,status.eq.approved,status.eq.paid,converted_at.not.is.null"
          );

      if (
        !conversionResult.error
      ) {
        const conversionRows =
          conversionResult.data ||
          [];

        for (
          const row of conversionRows
        ) {
          const status =
            normalizeStatus(
              row.status
            );

          const isConversion =
            CONVERSION_STATUSES.includes(
              status
            ) ||
            Boolean(
              row.converted_at
            );

          if (isConversion) {
            conversions += 1;

            earnings +=
              getNumericPayout(
                row.payout
              );
          }
        }
      } else {
        console.error(
          "Conversion query error:",
          conversionResult.error
        );
      }
    } catch (error) {
      console.error(
        "Conversion loading error:",
        error
      );
    }

    /* -------------------------------------------------
       15. CONVERSION RATE
    ------------------------------------------------- */

    const conversionRate =
      totalClicks > 0
        ? Number(
            (
              (conversions /
                totalClicks) *
              100
            ).toFixed(2)
          )
        : 0;

    /* -------------------------------------------------
       16. RESPONSE
    ------------------------------------------------- */

    return NextResponse.json(
      {
        success: true,

        profile: {
          id: user.id,

          affiliateId,

          email:
            user.email || null,

          name: profileName,

          status:
            profile.status ||
            "active",

          referralCode:
            profile.referral_code ||
            affiliateId,

          referralRate:
            Number(
              profile.referral_rate ??
                5
            ),
        },

        clicks,

        stats: {
          totalClicks,

          conversions,

          conversionRate,

          earnings:
            Number(
              earnings.toFixed(2)
            ),
        },

        meta: {
          profileFound: true,

          profileLookup:
            "affiliate_profiles.id",

          recentClicksLimit:
            RECENT_CLICKS_LIMIT,

          applicationStatus,
        },
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
      "Affiliate dashboard error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Affiliate dashboard could not be loaded.",
      },
      { status: 500 }
    );
  }
}
