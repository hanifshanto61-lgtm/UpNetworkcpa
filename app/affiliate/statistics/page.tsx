import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type AnyRecord = Record<string, any>;

const CONVERSION_STATUSES = [
  "converted",
  "conversion",
  "approved",
  "paid",
];

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

  return Number.isFinite(number)
    ? number
    : 0;
}

function isConverted(row: AnyRecord) {
  const status = normalizeStatus(row.status);

  return (
    CONVERSION_STATUSES.includes(status) ||
    Boolean(row.converted_at)
  );
}

function makeAffiliateId(userId: string) {
  return `UP${userId
    .replace(/-/g, "")
    .slice(0, 10)
    .toUpperCase()}`;
}

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
        return result.data as AnyRecord;
      }
    } catch (error) {
      console.warn(
        "Profile lookup error:",
        error
      );
    }
  }

  return null;
}

export async function GET(
  request: NextRequest
) {
  try {
    /* ---------------------------------------------
       1. SERVER CONFIGURATION
    --------------------------------------------- */

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

    /* ---------------------------------------------
       2. AUTHENTICATION
    --------------------------------------------- */

    const authorization =
      request.headers.get("authorization");

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

    /* ---------------------------------------------
       3. SUPABASE ADMIN CLIENT
    --------------------------------------------- */

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

    /* ---------------------------------------------
       4. VERIFY LOGGED-IN USER
    --------------------------------------------- */

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
          error:
            "Your login session is invalid or expired.",
        },
        { status: 401 }
      );
    }

    /* ---------------------------------------------
       5. FIND AFFILIATE PROFILE
    --------------------------------------------- */

    const profile =
      await findProfile(
        supabaseAdmin,
        user
      );

    let affiliateId =
      profile?.affiliate_id ||
      profile?.affiliateId ||
      profile?.affiliate_code ||
      profile?.code ||
      "";

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
            "Affiliate ID could not be determined.",
        },
        { status: 500 }
      );
    }

    /* ---------------------------------------------
       6. READ DATE RANGE
       
       Example:
       ?from=2025-01-01&to=2026-12-31
    --------------------------------------------- */

    const searchParams =
      request.nextUrl.searchParams;

    const fromDate =
      searchParams.get("from");

    const toDate =
      searchParams.get("to");

    if (!fromDate || !toDate) {
      return NextResponse.json(
        {
          error:
            "Both from and to dates are required.",
        },
        { status: 400 }
      );
    }

    /*
     * Validate YYYY-MM-DD format.
     */
    const datePattern =
      /^\d{4}-\d{2}-\d{2}$/;

    if (
      !datePattern.test(fromDate) ||
      !datePattern.test(toDate)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid date format. Use YYYY-MM-DD.",
        },
        { status: 400 }
      );
    }

    /*
     * String comparison works correctly for
     * YYYY-MM-DD dates.
     */
    if (fromDate > toDate) {
      return NextResponse.json(
        {
          error:
            "From date cannot be later than To date.",
        },
        { status: 400 }
      );
    }

    /*
     * We use an exclusive upper boundary:
     *
     * >= from 00:00:00
     * <  next day after "to"
     *
     * This avoids losing clicks that happen at
     * 23:59:59.xxx on the selected end date.
     */
    const startDateTime =
      `${fromDate}T00:00:00.000Z`;

    const endDate =
      new Date(
        `${toDate}T00:00:00.000Z`
      );

    endDate.setUTCDate(
      endDate.getUTCDate() + 1
    );

    const endDateTime =
      endDate.toISOString();

    /* ---------------------------------------------
       7. LOAD ALL CLICKS FOR THIS AFFILIATE
       
       IMPORTANT:
       This is NOT limited to 20 rows.
       
       Therefore a report can cover:
       2025 → 2026
       2026 → 2027
       etc.
    --------------------------------------------- */

    const {
      data: clicksData,
      error: clicksError,
    } = await supabaseAdmin
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
      .gte(
        "created_at",
        startDateTime
      )
      .lt(
        "created_at",
        endDateTime
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (clicksError) {
      console.error(
        "Statistics clicks query error:",
        clicksError
      );

      return NextResponse.json(
        {
          error:
            "Unable to load statistics data.",
        },
        { status: 500 }
      );
    }

    const clicks =
      (clicksData || []) as AnyRecord[];

    /* ---------------------------------------------
       8. CALCULATE MAIN STATISTICS
    --------------------------------------------- */

    const totalClicks =
      clicks.length;

    let conversions = 0;
    let earnings = 0;

    for (const row of clicks) {
      if (isConverted(row)) {
        conversions += 1;

        earnings +=
          getNumericPayout(
            row.payout
          );
      }
    }

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

    /* ---------------------------------------------
       9. COUNTRY REPORT
    --------------------------------------------- */

    const countryMap =
      new Map<
        string,
        {
          clicks: number;
          conversions: number;
          earnings: number;
        }
      >();

    for (const row of clicks) {
      const country =
        String(
          row.country ||
            "Unknown"
        ).trim() || "Unknown";

      if (!countryMap.has(country)) {
        countryMap.set(country, {
          clicks: 0,
          conversions: 0,
          earnings: 0,
        });
      }

      const item =
        countryMap.get(country)!;

      item.clicks += 1;

      if (isConverted(row)) {
        item.conversions += 1;

        item.earnings +=
          getNumericPayout(
            row.payout
          );
      }
    }

    const countryReport =
      Array.from(
        countryMap.entries()
      )
        .map(
          ([country, value]) => ({
            country,
            ...value,
          })
        )
        .sort(
          (a, b) =>
            b.clicks - a.clicks
        );

    /* ---------------------------------------------
       10. DEVICE REPORT
    --------------------------------------------- */

    const deviceMap =
      new Map<
        string,
        {
          clicks: number;
          conversions: number;
          earnings: number;
        }
      >();

    for (const row of clicks) {
      const device =
        String(
          row.device ||
            "Unknown"
        ).trim() || "Unknown";

      if (!deviceMap.has(device)) {
        deviceMap.set(device, {
          clicks: 0,
          conversions: 0,
          earnings: 0,
        });
      }

      const item =
        deviceMap.get(device)!;

      item.clicks += 1;

      if (isConverted(row)) {
        item.conversions += 1;

        item.earnings +=
          getNumericPayout(
            row.payout
          );
      }
    }

    const deviceReport =
      Array.from(
        deviceMap.entries()
      )
        .map(
          ([device, value]) => ({
            device,
            ...value,
            percentage:
              totalClicks > 0
                ? Number(
                    (
                      (value.clicks /
                        totalClicks) *
                      100
                    ).toFixed(2)
                  )
                : 0,
          })
        )
        .sort(
          (a, b) =>
            b.clicks - a.clicks
        );

    /* ---------------------------------------------
       11. RESPONSE
    --------------------------------------------- */

    return NextResponse.json(
      {
        success: true,

        profile: {
          id: user.id,

          affiliateId,

          email:
            user.email || null,

          name:
            profile?.full_name ||
            profile?.name ||
            profile?.username ||
            profile?.display_name ||
            user.user_metadata
              ?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "Affiliate",
        },

        range: {
          from: fromDate,
          to: toDate,
        },

        stats: {
          totalClicks,

          conversions,

          conversionRate,

          earnings: Number(
            earnings.toFixed(2)
          ),
        },

        countryReport,

        deviceReport,

        /*
         * Full rows for the selected period.
         * This allows the Statistics page to
         * display the detailed report.
         */
        clicks,
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
      "Affiliate statistics error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Affiliate statistics could not be loaded.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  return GET(request);
      }
