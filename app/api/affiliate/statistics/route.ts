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

function getPayout(value: any) {
  const payout = Number(value);

  if (!Number.isFinite(payout)) {
    return 0;
  }

  return payout;
}

function isConverted(row: AnyRecord) {
  const status = normalizeStatus(row.status);

  return (
    CONVERSION_STATUSES.includes(status) ||
    Boolean(row.converted_at)
  );
}

function isInDateRange(
  value: any,
  from: string,
  to: string
) {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const selectedDate = date
    .toISOString()
    .slice(0, 10);

  return (
    selectedDate >= from &&
    selectedDate <= to
  );
}

export async function GET(
  request: NextRequest
) {
  try {
    /* =========================================
       1. SUPABASE CONFIG
    ========================================= */

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "Supabase server configuration is missing.",
        },
        { status: 500 }
      );
    }

    /* =========================================
       2. AUTHORIZATION
    ========================================= */

    const authorization =
      request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
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
          error:
            "Authentication token is missing.",
        },
        { status: 401 }
      );
    }

    /* =========================================
       3. SUPABASE ADMIN CLIENT
    ========================================= */

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    /* =========================================
       4. VERIFY AUTH USER
    ========================================= */

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

    /* =========================================
       5. LOAD AFFILIATE PROFILE

       Current database table:
       public.affiliate_profiles

       Primary key:
       id = auth.users.id
    ========================================= */

    const {
      data: profile,
      error: profileError,
    } =
      await supabaseAdmin
        .from("affiliate_profiles")
        .select(
          "id, affiliate_id, full_name, email, status, referral_code, referral_rate"
        )
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error(
        "Statistics profile error:",
        profileError
      );

      return NextResponse.json(
        {
          error:
            "Affiliate profile could not be loaded.",
          details: profileError.message,
          code:
            profileError.code || null,
          hint:
            profileError.hint || null,
        },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        {
          error:
            "Affiliate profile not found.",
        },
        { status: 404 }
      );
    }

    const affiliateId = String(
      profile.affiliate_id || ""
    ).trim();

    if (!affiliateId) {
      return NextResponse.json(
        {
          error:
            "Affiliate ID could not be determined.",
        },
        { status: 500 }
      );
    }

    /* =========================================
       6. DATE RANGE
    ========================================= */

    const searchParams =
      request.nextUrl.searchParams;

    const from =
      searchParams.get("from");

    const to =
      searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        {
          error:
            "Both from and to dates are required.",
        },
        { status: 400 }
      );
    }

    const datePattern =
      /^\d{4}-\d{2}-\d{2}$/;

    if (
      !datePattern.test(from) ||
      !datePattern.test(to)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid date format. Use YYYY-MM-DD.",
        },
        { status: 400 }
      );
    }

    if (from > to) {
      return NextResponse.json(
        {
          error:
            "From Date cannot be later than To Date.",
        },
        { status: 400 }
      );
    }

    /* =========================================
       7. LOAD CLICKS

       Current database table:
       public.clicks

       We intentionally use select("*")
       so the statistics page remains
       compatible with the current schema.
    ========================================= */

    const {
      data: allClicks,
      error: clicksError,
    } =
      await supabaseAdmin
        .from("clicks")
        .select("*")
        .eq("affiliate_id", affiliateId);

    if (clicksError) {
      console.error(
        "Statistics clicks error:",
        clicksError
      );

      return NextResponse.json(
        {
          error:
            "Statistics database query failed.",
          details:
            clicksError.message,
          code:
            clicksError.code || null,
          hint:
            clicksError.hint || null,
        },
        { status: 500 }
      );
    }

    /* =========================================
       8. DATE FILTER
    ========================================= */

    const clicks =
      (allClicks || [])
        .filter(
          (row: AnyRecord) =>
            isInDateRange(
              row.created_at,
              from,
              to
            )
        )
        .sort(
          (
            a: AnyRecord,
            b: AnyRecord
          ) => {
            const aTime =
              new Date(
                a.created_at || 0
              ).getTime();

            const bTime =
              new Date(
                b.created_at || 0
              ).getTime();

            return bTime - aTime;
          }
        );

    /* =========================================
       9. MAIN STATISTICS
    ========================================= */

    const totalClicks =
      clicks.length;

    let conversions = 0;
    let earnings = 0;

    for (const row of clicks) {
      if (isConverted(row)) {
        conversions += 1;

        earnings += getPayout(
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

    /* =========================================
       10. COUNTRY REPORT
    ========================================= */

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
          row.country || "Unknown"
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

        item.earnings += getPayout(
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

    /* =========================================
       11. DEVICE REPORT
    ========================================= */

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
          row.device || "Unknown"
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

        item.earnings += getPayout(
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

    /* =========================================
       12. RESPONSE
    ========================================= */

    return NextResponse.json(
      {
        success: true,

        profile: {
          id: user.id,

          affiliateId,

          email:
            profile.email ||
            user.email ||
            null,

          name:
            profile.full_name ||
            user.user_metadata
              ?.full_name ||
            user.user_metadata?.name ||
            profile.email?.split("@")[0] ||
            user.email?.split("@")[0] ||
            "Affiliate",

          status:
            profile.status ||
            "active",
        },

        range: {
          from,
          to,
        },

        stats: {
          totalClicks,

          conversions,

          conversionRate,

          earnings:
            Number(
              earnings.toFixed(2)
            ),
        },

        countryReport,

        deviceReport,

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
  } catch (error: any) {
    console.error(
      "Affiliate statistics error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Affiliate statistics could not be loaded.",

        details:
          error?.message ||
          String(error),
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
