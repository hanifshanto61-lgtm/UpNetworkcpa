
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

type ClickRow = {
  click_id?: string | null;
  affiliate_id?: string | null;
  smartlink_id?: string | null;
  country?: string | null;
  device?: string | null;
  browser?: string | null;
  referer?: string | null;
  status?: string | null;
  payout?: number | string | null;
  converted_at?: string | null;
  created_at?: string | null;
};

type SummaryStats = {
  totalClicks: number;
  conversions: number;
  conversionRate: number;
  earnings: number;
};

const RECENT_CLICKS_LIMIT = 20;
const PAGE_SIZE = 1000;
const FALLBACK_TIMEZONE = "UTC";

const CONVERSION_STATUSES = [
  "converted",
  "conversion",
  "approved",
  "paid",
];

function normalizeStatus(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeAffiliateStatus(value: unknown): string {
  const status = normalizeStatus(value);

  if (status === "active" || status === "approved") {
    return "approved";
  }

  if (status === "rejected") return "rejected";
  if (status === "suspended") return "suspended";

  return "pending";
}

function getNumericPayout(value: unknown): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function isConverted(row: ClickRow): boolean {
  return (
    CONVERSION_STATUSES.includes(
      normalizeStatus(row.status)
    ) || Boolean(row.converted_at)
  );
}

function makeAffiliateId(userId: string): string {
  return (
    "UP" +
    userId.replace(/-/g, "").slice(0, 10).toUpperCase()
  );
}

function validTimezone(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > 100
  ) {
    return null;
  }

  const timezone = value.trim();

  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
    });

    return timezone;
  } catch {
    return null;
  }
}

function dateInTimezone(
  value: string | Date,
  timezone: string
): string {
  const date =
    value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find(
    (part) => part.type === "year"
  )?.value;

  const month = parts.find(
    (part) => part.type === "month"
  )?.value;

  const day = parts.find(
    (part) => part.type === "day"
  )?.value;

  return `${year}-${month}-${day}`;
}

function emptySummary(): SummaryStats {
  return {
    totalClicks: 0,
    conversions: 0,
    conversionRate: 0,
    earnings: 0,
  };
}

function finalizeSummary(
  summary: SummaryStats
): SummaryStats {
  return {
    totalClicks: summary.totalClicks,
    conversions: summary.conversions,
    earnings: Number(summary.earnings.toFixed(2)),
    conversionRate:
      summary.totalClicks > 0
        ? Number(
            (
              (summary.conversions / summary.totalClicks) *
              100
            ).toFixed(2)
          )
        : 0,
  };
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
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse(
        "Supabase server configuration is missing.",
        500
      );
    }

    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return errorResponse(
        "Authentication required.",
        401
      );
    }

    const accessToken =
      authorization.slice(7).trim();

    if (!accessToken) {
      return errorResponse(
        "Authentication token is missing.",
        401
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

    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    const user = authData?.user;

    if (authError || !user) {
      return errorResponse(
        "Your login session is invalid or expired.",
        401
      );
    }

    const accountType = normalizeStatus(
      user.user_metadata?.account_type
    );

    if (
      accountType &&
      accountType !== "affiliate" &&
      accountType !== "admin"
    ) {
      return errorResponse(
        "This account is not an affiliate account.",
        403,
        "NOT_AFFILIATE"
      );
    }

    let {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Dashboard profile query error:",
        profileError
      );

      return errorResponse(
        "Affiliate profile could not be loaded.",
        500
      );
    }

    const metadataStatus = normalizeStatus(
      user.user_metadata?.application_status
    );

    // Preserve approved-profile recovery.
    if (!profile) {
      if (metadataStatus !== "approved") {
        return NextResponse.json(
          {
            success: false,
            error:
              "Your affiliate application is waiting for admin approval.",
            code: "AFFILIATE_PENDING",
            status: "pending",
          },
          { status: 403 }
        );
      }

      const fullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Affiliate";

      const {
        data: createdProfile,
        error: createError,
      } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: user.id,
          affiliate_id: makeAffiliateId(user.id),
          full_name: fullName,
          email: user.email || null,
          application_status: "approved",
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .maybeSingle();

      if (createError || !createdProfile) {
        console.error(
          "Dashboard profile creation error:",
          createError
        );

        return errorResponse(
          "Unable to read or create the affiliate profile.",
          500,
          "AFFILIATE_PROFILE_NOT_FOUND"
        );
      }

      profile = createdProfile;
    }

    let applicationStatus = normalizeAffiliateStatus(
      profile.application_status
    );

    if (
      ["approved", "rejected", "suspended"].includes(
        metadataStatus
      )
    ) {
      applicationStatus = metadataStatus;
    }

    if (applicationStatus !== "approved") {
      const rejected =
        applicationStatus === "rejected";

      const suspended =
        applicationStatus === "suspended";

      return NextResponse.json(
        {
          success: false,
          error: rejected
            ? "Your affiliate application has been rejected."
            : suspended
              ? "Your affiliate account has been suspended."
              : "Your affiliate application is waiting for admin approval.",
          code: rejected
            ? "AFFILIATE_REJECTED"
            : suspended
              ? "AFFILIATE_SUSPENDED"
              : "AFFILIATE_PENDING",
          status: applicationStatus,
        },
        { status: 403 }
      );
    }

    let affiliateId = String(
      profile.affiliate_id ?? ""
    ).trim();

    if (!affiliateId) {
      affiliateId = makeAffiliateId(user.id);

      const {
        data: updatedProfile,
        error: updateError,
      } = await supabaseAdmin
        .from("profiles")
        .update({
          affiliate_id: affiliateId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select("*")
        .maybeSingle();

      if (updateError || !updatedProfile) {
        console.error(
          "Dashboard affiliate ID update error:",
          updateError
        );

        return errorResponse(
          "Affiliate ID could not be updated.",
          500
        );
      }

      profile = updatedProfile;
    }

    const profileName =
      profile.full_name ||
      profile.username ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Affiliate";

    // A saved timezone always takes priority.
    let timezone = validTimezone(profile.timezone);

    if (!timezone) {
      const browserTimezone = validTimezone(
        request.headers.get("x-affiliate-timezone")
      );

      // Only save when the profile has no timezone.
      // This prevents a later login from another
      // country from overwriting the original value.
      if (
        browserTimezone &&
        !String(profile.timezone ?? "").trim()
      ) {
        const {
          data: savedProfile,
          error: timezoneError,
        } = await supabaseAdmin
          .from("profiles")
          .update({
            timezone: browserTimezone,
          })
          .eq("id", user.id)
          .is("timezone", null)
          .select("timezone")
          .maybeSingle();

        if (timezoneError) {
          console.error(
            "Affiliate timezone save error:",
            timezoneError
          );
        }

        if (savedProfile?.timezone) {
          timezone = validTimezone(
            savedProfile.timezone
          );
        }

        // If another request saved the timezone
        // first, read the already-saved value.
        if (!timezone) {
          const { data: currentProfile } =
            await supabaseAdmin
              .from("profiles")
              .select("timezone")
              .eq("id", user.id)
              .maybeSingle();

          timezone = validTimezone(
            currentProfile?.timezone
          );
        }
      }
    }

    // UTC is a temporary reporting fallback,
    // not a replacement for a saved timezone.
    const reportingTimezone =
      timezone || FALLBACK_TIMEZONE;

    const currentDate = dateInTimezone(
      new Date(),
      reportingTimezone
    );

    // Exact all-time click count.
    const {
      count: databaseClickCount,
      error: countError,
    } = await supabaseAdmin
      .from("clicks")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("affiliate_id", affiliateId);

    if (countError) {
      console.error(
        "Dashboard click count error:",
        countError
      );

      return errorResponse(
        "Unable to count affiliate clicks.",
        500
      );
    }

    if (databaseClickCount === null) {
      return errorResponse(
        "Affiliate click count is unavailable.",
        500
      );
    }

    const allClicks: ClickRow[] = [];
    let offset = 0;

    while (true) {
      const {
        data: clickPage,
        error: clicksError,
      } = await supabaseAdmin
        .from("clicks")
        .select(
          "click_id, affiliate_id, smartlink_id, country, device, browser, referer, status, payout, converted_at, created_at"
        )
        .eq("affiliate_id", affiliateId)
        .order("created_at", {
          ascending: false,
        })
        .order("click_id", {
          ascending: false,
        })
        .range(
          offset,
          offset + PAGE_SIZE - 1
        );

      if (clicksError) {
        console.error(
          "Dashboard clicks query error:",
          clicksError
        );

        return errorResponse(
          "Unable to load affiliate clicks.",
          500
        );
      }

      const rows = (clickPage ?? []) as ClickRow[];

      allClicks.push(...rows);

      if (rows.length < PAGE_SIZE) {
        break;
      }

      offset += PAGE_SIZE;
    }

    const todayStats = emptySummary();
    const allTimeStats = emptySummary();

    allTimeStats.totalClicks = databaseClickCount;

    for (const click of allClicks) {
      const clickDate = click.created_at
        ? dateInTimezone(
            click.created_at,
            reportingTimezone
          )
        : "";

      if (clickDate === currentDate) {
        todayStats.totalClicks += 1;
      }

      if (isConverted(click)) {
        const payout = getNumericPayout(
          click.payout
        );

        allTimeStats.conversions += 1;
        allTimeStats.earnings += payout;

        // Use the conversion date, not the
        // original click date, when available.
        const conversionDate = click.converted_at
          ? dateInTimezone(
              click.converted_at,
              reportingTimezone
            )
          : clickDate;

        if (conversionDate === currentDate) {
          todayStats.conversions += 1;
          todayStats.earnings += payout;
        }
      }
    }

    const todaySummary =
      finalizeSummary(todayStats);

    const allTimeSummary =
      finalizeSummary(allTimeStats);

    if (allClicks.length !== databaseClickCount) {
      console.warn(
        "Dashboard click count mismatch:",
        {
          affiliateId,
          databaseCount: databaseClickCount,
          fetchedRows: allClicks.length,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,

        profile: {
          id: user.id,
          affiliateId,
          email:
            user.email ||
            profile.email ||
            null,
          name: profileName,
          status:
            profile.application_status ||
            "approved",
          referralCode: affiliateId,
          referralRate: 5,
          timezone,
        },

        clicks: allClicks.slice(
          0,
          RECENT_CLICKS_LIMIT
        ),

        // Backward compatibility with
        // the current affiliate dashboard.
        stats: allTimeSummary,

        // New daily and all-time statistics.
        todayStats: todaySummary,
        allTimeStats: allTimeSummary,

        daily: {
          date: currentDate,
          timezone: reportingTimezone,
          timezoneSaved: Boolean(timezone),
          stats: todaySummary,
        },

        meta: {
          profileFound: true,
          profileLookup: "profiles.id",
          recentClicksLimit:
            RECENT_CLICKS_LIMIT,
          applicationStatus,
          clickCountSource:
            "database-exact-count",
          databaseClickCount,
          fetchedClickRows:
            allClicks.length,
          reportingDate: currentDate,
          reportingTimezone,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error(
      "Affiliate dashboard error:",
      error
    );

    return errorResponse(
      "Affiliate dashboard could not be loaded.",
      500
    );
  }
}
