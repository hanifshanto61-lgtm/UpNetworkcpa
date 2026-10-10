
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ClickRow = {
  id?: string | null;
  click_id?: string | null;
  affiliate_id?: string | null;
  smartlink_id?: string | null;
  offer_id?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  postal_code?: string | null;
  timezone?: string | null;
  device?: string | null;
  browser?: string | null;
  operating_system?: string | null;
  referer?: string | null;
  traffic_source?: string | null;
  campaign?: string | null;
  visitor_hash?: string | null;
  is_suspicious?: boolean | null;
  isp?: string | null;
  asn?: string | null;
  status?: string | null;
  payout?: number | string | null;
  gross_revenue?: number | string | null;
  network_profit?: number | string | null;
  converted_at?: string | null;
  created_at?: string | null;
};

type ReportValue = {
  clicks: number;
  conversions: number;
  earnings: number;
};

const CONVERSION_STATUSES = new Set([
  "converted",
  "conversion",
  "approved",
  "paid",
]);

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function label(value: unknown): string {
  return String(value ?? "").trim() || "Unknown";
}

function amount(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function converted(row: ClickRow): boolean {
  return (
    CONVERSION_STATUSES.has(normalize(row.status)) ||
    Boolean(row.converted_at)
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

function updateReport(
  map: Map<string, ReportValue>,
  key: string,
  isConversion: boolean,
  payout: number
) {
  const item = map.get(key) || {
    clicks: 0,
    conversions: 0,
    earnings: 0,
  };

  item.clicks++;

  if (isConversion) {
    item.conversions++;
    item.earnings += payout;
  }

  map.set(key, item);
}

function buildReport(
  map: Map<string, ReportValue>,
  field: string,
  totalClicks: number
) {
  return Array.from(map.entries())
    .map(([key, value]) => ({
      [field]: key,
      clicks: value.clicks,
      conversions: value.conversions,
      earnings: Number(value.earnings.toFixed(2)),
      percentage:
        totalClicks > 0
          ? Number(
              ((value.clicks / totalClicks) * 100).toFixed(2)
            )
          : 0,
      conversionRate:
        value.clicks > 0
          ? Number(
              (
                (value.conversions / value.clicks) *
                100
              ).toFixed(2)
            )
          : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks);
}

function responseError(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return responseError(
        "Supabase server configuration is missing.",
        500
      );
    }

    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return responseError("Authentication required.", 401);
    }

    const accessToken = authorization.slice(7).trim();

    if (!accessToken) {
      return responseError(
        "Authentication token is missing.",
        401
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    const user = authData?.user;

    if (authError || !user) {
      return responseError(
        "Your login session is invalid or expired.",
        401
      );
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "id, affiliate_id, full_name, email, application_status"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Statistics profile error:", profileError);
      return responseError(
        "Affiliate profile could not be loaded.",
        500
      );
    }

    if (!profile) {
      return responseError("Affiliate profile not found.", 404);
    }

    const affiliateId = String(
      profile.affiliate_id ?? ""
    ).trim();

    if (!affiliateId) {
      return responseError(
        "Affiliate ID could not be determined.",
        500
      );
    }

    const applicationStatus = normalize(
      profile.application_status
    );

    if (
      applicationStatus !== "approved" &&
      applicationStatus !== "active"
    ) {
      return responseError(
        "Your affiliate account is not approved.",
        403
      );
    }

    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    if (!from || !to || !validDate(from) || !validDate(to)) {
      return responseError(
        "Valid from and to dates are required.",
        400
      );
    }

    if (from > to) {
      return responseError(
        "From Date cannot be later than To Date.",
        400
      );
    }

    const nextDay = new Date(`${to}T00:00:00.000Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const fromTimestamp = `${from}T00:00:00.000Z`;
    const toExclusive = nextDay.toISOString();

    const allClicks: ClickRow[] = [];
    const pageSize = 1000;
    let offset = 0;

    while (true) {
      const { data, error } = await supabase
        .from("clicks")
        .select(
          "id, click_id, affiliate_id, smartlink_id, offer_id, country, region, city, postal_code, timezone, device, browser, operating_system, referer, traffic_source, campaign, visitor_hash, is_suspicious, isp, asn, status, payout, gross_revenue, network_profit, converted_at, created_at"
        )
        .eq("affiliate_id", affiliateId)
        .gte("created_at", fromTimestamp)
        .lt("created_at", toExclusive)
        .order("created_at", { ascending: false })
        .order("click_id", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error("Statistics click query:", error);
        return responseError(
          "Statistics database query failed.",
          500
        );
      }

      const rows = (data ?? []) as ClickRow[];

      allClicks.push(...rows);

      if (rows.length < pageSize) break;

      offset += pageSize;
    }

    const totalClicks = allClicks.length;

    let conversions = 0;
    let earnings = 0;
    let grossRevenue = 0;
    let networkProfit = 0;
    let suspiciousClicks = 0;

    const uniqueHashes = new Set<string>();

    const countryMap = new Map<string, ReportValue>();
    const cityMap = new Map<string, ReportValue>();
    const regionMap = new Map<string, ReportValue>();
    const deviceMap = new Map<string, ReportValue>();
    const browserMap = new Map<string, ReportValue>();
    const osMap = new Map<string, ReportValue>();
    const sourceMap = new Map<string, ReportValue>();
    const campaignMap = new Map<string, ReportValue>();
    const smartlinkMap = new Map<string, ReportValue>();
    const dailyMap = new Map<string, ReportValue>();

    for (const click of allClicks) {
      const isConversion = converted(click);

      const payout = isConversion
        ? amount(click.payout)
        : 0;

      if (isConversion) {
        conversions++;
        earnings += payout;
        grossRevenue += amount(click.gross_revenue);
        networkProfit += amount(click.network_profit);
      }

      if (click.is_suspicious === true) {
        suspiciousClicks++;
      }

      if (click.visitor_hash) {
        uniqueHashes.add(click.visitor_hash);
      }

      const country = label(click.country);
      const city = label(click.city);
      const region = label(click.region);
      const device = label(click.device);
      const browser = label(click.browser);
      const os = label(click.operating_system);
      const source = label(click.traffic_source);
      const campaign = label(click.campaign);

      const smartlink = click.smartlink_id
        ? String(click.smartlink_id)
        : click.offer_id
          ? `Offer: ${click.offer_id}`
          : "Legacy / Unknown";

      const date = click.created_at
        ? String(click.created_at).slice(0, 10)
        : "Unknown";

      updateReport(
        countryMap, country, isConversion, payout
      );

      updateReport(
        cityMap,
        `${city}, ${country}`,
        isConversion,
        payout
      );

      updateReport(
        regionMap,
        `${region}, ${country}`,
        isConversion,
        payout
      );

      updateReport(
        deviceMap, device, isConversion, payout
      );

      updateReport(
        browserMap, browser, isConversion, payout
      );

      updateReport(
        osMap, os, isConversion, payout
      );

      updateReport(
        sourceMap, source, isConversion, payout
      );

      updateReport(
        campaignMap, campaign, isConversion, payout
      );

      updateReport(
        smartlinkMap, smartlink, isConversion, payout
      );

      updateReport(
        dailyMap, date, isConversion, payout
      );
    }

    const conversionRate =
      totalClicks > 0
        ? Number(
            ((conversions / totalClicks) * 100).toFixed(2)
          )
        : 0;

    const uniqueVisitors = uniqueHashes.size;

    // Unique visitors are counted only where a visitor
    // hash exists. Old records without hashes are not
    // incorrectly counted as unique visitors.
    const identifiableClicks = allClicks.filter(
      (click) => Boolean(click.visitor_hash)
    ).length;

    const countryReport = buildReport(
      countryMap, "country", totalClicks
    );

    const deviceReport = buildReport(
      deviceMap, "device", totalClicks
    );

    const cityReport = buildReport(
      cityMap, "city", totalClicks
    );

    const regionReport = buildReport(
      regionMap, "region", totalClicks
    );

    const browserReport = buildReport(
      browserMap, "browser", totalClicks
    );

    const osReport = buildReport(
      osMap, "operatingSystem", totalClicks
    );

    const sourceReport = buildReport(
      sourceMap, "source", totalClicks
    );

    const campaignReport = buildReport(
      campaignMap, "campaign", totalClicks
    );

    const smartlinkReport = buildReport(
      smartlinkMap, "smartlinkId", totalClicks
    );

    const dailyReport = buildReport(
      dailyMap, "date", totalClicks
    ).sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    );

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

        range: { from, to },

        stats: {
          totalClicks,
          conversions,
          conversionRate,
          earnings: Number(earnings.toFixed(2)),
          grossRevenue: Number(grossRevenue.toFixed(2)),
          networkProfit: Number(networkProfit.toFixed(2)),
          uniqueVisitors,
          identifiableClicks,
          suspiciousClicks,
          cleanClicks: totalClicks - suspiciousClicks,
        },

        countryReport,
        deviceReport,
        cityReport,
        regionReport,
        browserReport,
        osReport,
        sourceReport,
        campaignReport,
        smartlinkReport,
        dailyReport,

        // Preserve compatibility with the existing
        // Statistics page, which reads "clicks".
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

    return responseError(
      "Affiliate statistics could not be loaded.",
      500
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
