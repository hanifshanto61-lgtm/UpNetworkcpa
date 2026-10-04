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

/**
 * Find affiliate profile safely.
 *
 * Different versions of the project may use:
 * - id
 * - user_id
 * - auth_id
 * - email
 */
async function findProfile(
  supabaseAdmin: any,
  user: any
) {
  const lookups = [
    {
      column: "id",
      value: user.id,
    },
    {
      column: "user_id",
      value: user.id,
    },
    {
      column: "auth_id",
      value: user.id,
    },
    {
      column: "email",
      value: user.email,
    },
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
        return {
          profile: result.data as AnyRecord,
          lookupColumn: lookup.column,
        };
      }
    } catch (error) {
      console.warn(
        "Profile lookup error:",
        error
      );
    }
  }

  return {
    profile: null,
    lookupColumn: null,
  };
}

/**
 * Create profile only when one does not exist.
 *
 * We keep compatibility with the existing
 * project schema.
 */
async function createProfile(
  supabaseAdmin: any,
  user: any,
  affiliateId: string
) {
  const attempts = [
    {
      id: user.id,
      affiliate_id: affiliateId,
    },
    {
      user_id: user.id,
      affiliate_id: affiliateId,
    },
    {
      auth_id: user.id,
      affiliate_id: affiliateId,
    },
  ];

  for (const payload of attempts) {
    try {
      const result = await supabaseAdmin
        .from("profiles")
        .insert(payload)
        .select("*")
        .maybeSingle();

      if (!result.error && result.data) {
        return result.data as AnyRecord;
      }
    } catch (error) {
      console.warn(
        "Profile creation error:",
        error
      );
    }
  }

  return null;
}

/**
 * Convert payout safely to a number.
 */
function getNumericPayout(value: any) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

/**
 * Normalize status for reliable comparison.
 */
function normalizeStatus(value: any) {
  return String(value || "")
    .trim()
    .toLowerCase();
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
      !authorization.startsWith(
        "Bearer "
      )
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
       5. FIND AFFILIATE PROFILE
    ------------------------------------------------- */

    let profileResult =
      await findProfile(
        supabaseAdmin,
        user
      );

    let profile =
      profileResult.profile;

    let affiliateId = "";

    if (profile) {
      affiliateId =
        profile.affiliate_id ||
        profile.affiliateId ||
        profile.affiliate_code ||
        profile.code ||
        "";
    }

    /* -------------------------------------------------
       6. GENERATE AFFILIATE ID IF MISSING
    ------------------------------------------------- */

    if (
      profile &&
      !affiliateId
    ) {
      affiliateId =
        makeAffiliateId(user.id);

      const lookupColumn =
        profileResult.lookupColumn;

      if (lookupColumn) {
        try {
          const updateValue =
            lookupColumn === "email"
              ? user.email
              : user.id;

          const updateResult =
            await supabaseAdmin
              .from("profiles")
              .update({
                affiliate_id:
                  affiliateId,
              })
              .eq(
                lookupColumn,
                updateValue
              )
              .select("*")
              .maybeSingle();

          if (
            !updateResult.error &&
            updateResult.data
          ) {
            profile =
              updateResult.data;

            profileResult = {
              profile:
                updateResult.data,
              lookupColumn,
            };
          }
        } catch (error) {
          console.warn(
            "Affiliate ID update error:",
            error
          );
        }
      }
    }

    /* -------------------------------------------------
       7. CREATE PROFILE IF IT DOES NOT EXIST
    ------------------------------------------------- */

    if (!profile) {
      affiliateId =
        makeAffiliateId(user.id);

      const createdProfile =
        await createProfile(
          supabaseAdmin,
          user,
          affiliateId
        );

      if (createdProfile) {
        profile =
          createdProfile;

        affiliateId =
          createdProfile.affiliate_id ||
          createdProfile.affiliateId ||
          affiliateId;

        profileResult = {
          profile: createdProfile,
          lookupColumn:
            createdProfile.id
              ? "id"
              : createdProfile.user_id
                ? "user_id"
                : createdProfile.auth_id
                  ? "auth_id"
                  : null,
        };
      }
    }

    /* -------------------------------------------------
       8. FINAL AFFILIATE ID SAFETY CHECK
    ------------------------------------------------- */

    if (!affiliateId) {
      affiliateId =
        makeAffiliateId(user.id);
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
       9. AFFILIATE DISPLAY NAME
    ------------------------------------------------- */

    const profileName =
      profile?.full_name ||
      profile?.name ||
      profile?.username ||
      profile?.display_name ||
      user.user_metadata
        ?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Affiliate";

    /* -------------------------------------------------
       10. LOAD RECENT CLICKS ONLY
       
       IMPORTANT:
       We no longer load the entire click table.
       Only the latest 20 records are returned.
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
       11. TOTAL CLICK COUNT
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
       12. CONVERSION COUNT + EARNINGS
       
       Only conversion rows are loaded here,
       instead of every click.
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
       13. CONVERSION RATE
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
       14. RESPONSE
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
        },

        /* Latest 20 activities */
        clicks,

        /* Server-side dashboard metrics */
        stats: {
          totalClicks,

          conversions,

          conversionRate,

          earnings: Number(
            earnings.toFixed(2)
          ),
        },

        meta: {
          profileFound:
            Boolean(profile),

          profileLookup:
            profileResult.lookupColumn ||
            "generated",

          recentClicksLimit:
            RECENT_CLICKS_LIMIT,
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
