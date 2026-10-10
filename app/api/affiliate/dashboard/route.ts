
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

const RECENT_CLICKS_LIMIT = 20;
const PAGE_SIZE = 1000;

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

    // Verify the currently logged-in user.
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

    // Read the existing affiliate profile.
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

    // Preserve approved-profile recovery behavior.
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

    // Count all clicks directly in the database.
    // This is independent of the recent-clicks limit.
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

    // Read click records in pages to calculate
    // conversions and earnings across all records.
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

    // The database COUNT is the authoritative
    // total-click metric.
    const totalClicks = databaseClickCount;

    let conversions = 0;
    let earnings = 0;

    for (const click of allClicks) {
      if (isConverted(click)) {
        conversions += 1;
        earnings += getNumericPayout(
          click.payout
        );
      }
    }

    const conversionRate =
      totalClicks > 0
        ? Number(
            (
              (conversions / totalClicks) *
              100
            ).toFixed(2)
          )
        : 0;

    // Log discrepancies for diagnosis.
    // No secret keys or access tokens are logged.
    if (allClicks.length !== totalClicks) {
      console.warn(
        "Dashboard click count mismatch:",
        {
          affiliateId,
          databaseCount: totalClicks,
          fetchedRows: allClicks.length,
        }
      );
    }

    // Keep the response compatible with the
    // existing affiliate dashboard UI.
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
        },

        clicks: allClicks.slice(
          0,
          RECENT_CLICKS_LIMIT
        ),

        stats: {
          totalClicks,
          conversions,
          conversionRate,
          earnings: Number(
            earnings.toFixed(2)
          ),
        },

        meta: {
          profileFound: true,
          profileLookup: "profiles.id",
          recentClicksLimit:
            RECENT_CLICKS_LIMIT,
          applicationStatus,
          clickCountSource:
            "database-exact-count",
          databaseClickCount:
            totalClicks,
          fetchedClickRows:
            allClicks.length,
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
