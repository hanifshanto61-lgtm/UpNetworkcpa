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
  return `UP${userId.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

function normalizeStatus(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function getNumericPayout(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeAffiliateStatus(value: unknown) {
  const status = normalizeStatus(value);

  if (status === "active" || status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  if (status === "suspended") return "suspended";

  return "pending";
}

/**
 * This project uses public.profiles, not public.affiliate_profiles.
 * Existing profiles columns include:
 * id, affiliate_id, email, full_name, application_status, updated_at.
 */
async function findAffiliateProfile(supabaseAdmin: any, user: any) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Affiliate profile lookup error:", error);
    return null;
  }

  return data as AnyRecord | null;
}

async function createAffiliateProfile(
  supabaseAdmin: any,
  user: any,
  affiliateId: string
) {
  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Affiliate";

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: user.id,
      affiliate_id: affiliateId,
      full_name: fullName,
      email: user.email || null,
      application_status: "approved",
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Affiliate profile creation error:", error);
    return null;
  }

  return data as AnyRecord | null;
}

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Supabase server configuration is missing." },
        { status: 500 }
      );
    }

    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const accessToken = authorization.slice(7).trim();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Authentication token is missing." },
        { status: 401 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    const user = authData?.user;

    if (authError || !user) {
      return NextResponse.json(
        { error: "Your login session is invalid or expired." },
        { status: 401 }
      );
    }

    const accountType = normalizeStatus(user.user_metadata?.account_type);

    if (accountType && accountType !== "affiliate" && accountType !== "admin") {
      return NextResponse.json(
        {
          error: "This account is not an affiliate account.",
          code: "NOT_AFFILIATE",
        },
        { status: 403 }
      );
    }

    let profile = await findAffiliateProfile(supabaseAdmin, user);

    let applicationStatus = normalizeAffiliateStatus(
      profile?.application_status
    );

    const metadataStatus = normalizeStatus(
      user.user_metadata?.application_status
    );

    if (["approved", "rejected", "suspended"].includes(metadataStatus)) {
      applicationStatus = metadataStatus;
    }

    if (!profile) {
      if (applicationStatus !== "approved") {
        return NextResponse.json(
          {
            error: "Your affiliate application is waiting for admin approval.",
            code: "AFFILIATE_PENDING",
            status: "pending",
          },
          { status: 403 }
        );
      }

      profile = await createAffiliateProfile(
        supabaseAdmin,
        user,
        makeAffiliateId(user.id)
      );
    }

    if (!profile) {
      return NextResponse.json(
        {
          error: "Unable to read or create the affiliate profile.",
          code: "AFFILIATE_PROFILE_NOT_FOUND",
        },
        { status: 500 }
      );
    }

    applicationStatus = normalizeAffiliateStatus(
      profile.application_status
    );

    if (["approved", "rejected", "suspended"].includes(metadataStatus)) {
      applicationStatus = metadataStatus;
    }

    if (applicationStatus !== "approved") {
      const rejected = applicationStatus === "rejected";
      const suspended = applicationStatus === "suspended";

      return NextResponse.json(
        {
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
        {
          status: 403,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        }
      );
    }

    let affiliateId = String(profile.affiliate_id || "").trim();

    if (!affiliateId) {
      affiliateId = makeAffiliateId(user.id);

      const { data: updatedProfile, error: updateError } =
        await supabaseAdmin
          .from("profiles")
          .update({
            affiliate_id: affiliateId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id)
          .select("*")
          .maybeSingle();

      if (updateError) {
        console.error("Affiliate ID update error:", updateError);
      } else if (updatedProfile) {
        profile = updatedProfile;
      }
    }

    if (!affiliateId) {
      return NextResponse.json(
        { error: "Affiliate ID could not be created." },
        { status: 500 }
      );
    }

    const profileName =
      profile.full_name ||
      profile.username ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Affiliate";

    let clicks: AnyRecord[] = [];

    const clicksResult = await supabaseAdmin
      .from("clicks")
      .select(
        "click_id, affiliate_id, smartlink_id, country, device, browser, referer, status, payout, converted_at, created_at"
      )
      .eq("affiliate_id", affiliateId)
      .order("created_at", { ascending: false })
      .limit(RECENT_CLICKS_LIMIT);

    if (clicksResult.error) {
      console.error("Recent clicks query error:", clicksResult.error);
    } else {
      clicks = clicksResult.data || [];
    }

    let totalClicks = 0;

    const countResult = await supabaseAdmin
      .from("clicks")
      .select("click_id", { count: "exact", head: true })
      .eq("affiliate_id", affiliateId);

    if (countResult.error) {
      console.error("Total click count error:", countResult.error);
    } else {
      totalClicks = countResult.count || 0;
    }

    let conversions = 0;
    let earnings = 0;

    const conversionResult = await supabaseAdmin
      .from("clicks")
      .select("status, payout, converted_at")
      .eq("affiliate_id", affiliateId)
      .or(
        "status.eq.converted,status.eq.conversion,status.eq.approved,status.eq.paid,converted_at.not.is.null"
      );

    if (conversionResult.error) {
      console.error("Conversion query error:", conversionResult.error);
    } else {
      for (const row of conversionResult.data || []) {
        const status = normalizeStatus(row.status);
        const isConversion =
          CONVERSION_STATUSES.includes(status) || Boolean(row.converted_at);

        if (isConversion) {
          conversions += 1;
          earnings += getNumericPayout(row.payout);
        }
      }
    }

    const conversionRate =
      totalClicks > 0
        ? Number(((conversions / totalClicks) * 100).toFixed(2))
        : 0;

    return NextResponse.json(
      {
        success: true,
        profile: {
          id: user.id,
          affiliateId,
          email: user.email || profile.email || null,
          name: profileName,
          status: profile.application_status || "approved",
          referralCode: affiliateId,
          referralRate: 5,
        },
        clicks,
        stats: {
          totalClicks,
          conversions,
          conversionRate,
          earnings: Number(earnings.toFixed(2)),
        },
        meta: {
          profileFound: true,
          profileLookup: "profiles.id",
          recentClicksLimit: RECENT_CLICKS_LIMIT,
          applicationStatus,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  } catch (error) {
    console.error("Affiliate dashboard error:", error);

    return NextResponse.json(
      { error: "Affiliate dashboard could not be loaded." },
      { status: 500 }
    );
  }
  }
