
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type ClickRow = {
  id?: string | null;
  click_id?: string | null;
  affiliate_id?: string | null;
  smartlink_id?: string | null;
  offer_id?: string | null;
  country?: string | null;
  device?: string | null;
  browser?: string | null;
  referer?: string | null;
  status?: string | null;
  payout?: number | string | null;
  converted_at?: string | null;
  created_at?: string | null;
};

const CONVERSION_STATUSES = [
  "converted",
  "conversion",
  "approved",
  "paid",
];

function normalizeStatus(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function getPayout(value: unknown): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function isConverted(row: ClickRow): boolean {
  return (
    CONVERSION_STATUSES.includes(
      normalizeStatus(row.status)
    ) || Boolean(row.converted_at)
  );
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
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

    const accessToken =
      authorization.slice(7).trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication token is missing.",
        },
        { status: 401 }
      );
    }

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

    // Verify the logged-in user.
    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    const user = authData?.user;

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Your login session is invalid or expired.",
        },
        { status: 401 }
      );
    }

    // The current database uses public.profiles.
    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, affiliate_id, full_name, email, application_status"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Statistics profile lookup error:",
        profileError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Affiliate profile could not be loaded.",
        },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          error: "Affiliate profile not found.",
        },
        { status: 404 }
      );
    }

    const affiliateId =
      String(profile.affiliate_id ?? "").trim();

    if (!affiliateId) {
      return NextResponse.json(
        {
          success: false,
          error: "Affiliate ID could not be determined.",
        },
        { status: 500 }
      );
    }

    const applicationStatus = normalizeStatus(
      profile.application_status
    );

    if (
      applicationStatus !== "approved" &&
      applicationStatus !== "active"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Your affiliate account is not approved.",
        },
        { status: 403 }
      );
    }

    // Read and validate the selected date range.
    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        {
          success: false,
          error: "Both from and to dates are required.",
        },
        { status: 400 }
      );
    }

    if (!validDate(from) || !validDate(to)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid date format. Use YYYY-MM-DD.",
        },
        { status: 400 }
      );
    }

    if (from > to) {
      return NextResponse.json(
        {
          success: false,
          error: "From Date cannot be later than To Date.",
        },
        { status: 400 }
      );
    }

    // Use an exclusive upper bound so the complete
    // final day is included, regardless of the year.
    const nextDay = new Date(
      `${to}T00:00:00.000Z`
    );

    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const fromTimestamp = `${from}T00:00:00.000Z`;
    const toExclusive = nextDay.toISOString();

    // Load only this affiliate's clicks.
    // Pagination prevents the default 1000-row limit
    // from silently truncating statistics.
    const allClicks: ClickRow[] = [];
    const pageSize = 1000;
    let offset = 0;

    while (true) {
      const {
        data: clickPage,
        error: clicksError,
      } = await supabaseAdmin
        .from("clicks")
        .select(
          "id, click_id, affiliate_id, smartlink_id, offer_id, country, device, browser, referer, status, payout, converted_at, created_at"
        )
        .eq("affiliate_id", affiliateId)
        .gte("created_at", fromTimestamp)
        .lt("created_at", toExclusive)
        .order("created_at", { ascending: false })
        .order("click_id", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (clicksError) {
        console.error(
          "Statistics clicks query error:",
          clicksError
        );

        return NextResponse.json(
          {
            success: false,
            error: "Statistics database query failed.",
          },
          { status: 500 }
        );
      }

      const rows = (clickPage ?? []) as ClickRow[];

      allClicks.push(...rows);

      if (rows.length < pageSize) {
        break;
      }

      offset += pageSize;
    }

    const totalClicks = allClicks.length;

    let conversions = 0;
    let earnings = 0;

    const countryMap = new Map<
      string,
      {
        clicks: number;
        conversions: number;
        earnings: number;
      }
    >();

    const deviceMap = new Map<
      string,
      {
        clicks: number;
        conversions: number;
        earnings: number;
      }
    >();

    for (const click of allClicks) {
      const converted = isConverted(click);
      const payout = converted
        ? getPayout(click.payout)
        : 0;

      if (converted) {
        conversions += 1;
        earnings += payout;
      }

      const country =
        String(click.country || "Unknown").trim() ||
        "Unknown";

      const device =
        String(click.device || "Unknown").trim() ||
        "Unknown";

      if (!countryMap.has(country)) {
        countryMap.set(country, {
          clicks: 0,
          conversions: 0,
          earnings: 0,
        });
      }

      const countryItem = countryMap.get(country)!;

      countryItem.clicks += 1;

      if (converted) {
        countryItem.conversions += 1;
        countryItem.earnings += payout;
      }

      if (!deviceMap.has(device)) {
        deviceMap.set(device, {
          clicks: 0,
          conversions: 0,
          earnings: 0,
        });
      }

      const deviceItem = deviceMap.get(device)!;

      deviceItem.clicks += 1;

      if (converted) {
        deviceItem.conversions += 1;
        deviceItem.earnings += payout;
      }
    }

    const conversionRate =
      totalClicks > 0
        ? Number(
            ((conversions / totalClicks) * 100).toFixed(2)
          )
        : 0;

    const countryReport = Array.from(
      countryMap.entries()
    )
      .map(([country, value]) => ({
        country,
        ...value,
        earnings: Number(value.earnings.toFixed(2)),
      }))
      .sort((a, b) => b.clicks - a.clicks);

    const deviceReport = Array.from(
      deviceMap.entries()
    )
      .map(([device, value]) => ({
        device,
        ...value,
        earnings: Number(value.earnings.toFixed(2)),
        percentage:
          totalClicks > 0
            ? Number(
                ((value.clicks / totalClicks) * 100).toFixed(2)
              )
            : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks);

    return NextResponse.json(
      {
        success: true,

        profile: {
          id: user.id,
          affiliateId,
          affiliate_id: affiliateId,
          email: profile.email || user.email || null,
          name:
            profile.full_name ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "Affiliate",
          status: applicationStatus,
        },

        range: {
          from,
          to,
        },

        stats: {
          totalClicks,
          conversions,
          conversionRate,
          earnings: Number(earnings.toFixed(2)),
        },

        countryReport,
        deviceReport,

        // The page displays the latest 100 rows.
        clicks: allClicks.slice(0, 100),
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
    console.error("Affiliate statistics error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Affiliate statistics could not be loaded.",
      },
      { status: 500 }
    );
  }
}

// Preserve compatibility with the existing route.
export async function POST(request: NextRequest) {
  return GET(request);
}
