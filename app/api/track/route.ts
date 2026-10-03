import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

// ==========================================
// UP NETWORK CPA — SMARTLINKS
// ==========================================

const SMARTLINKS = [
  "https://sexforfuns.com/pY1PVjKw?aid=pkkfxdhdk&kid=hxxfzdzzbgg",
  "https://datesdreamy.com/qw3y42Vq?aid=pkkfxdhdk&kid=hhkbkaaxpzg",
];

// ==========================================
// GET /api/track
// ==========================================

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          error: "Supabase server configuration is missing.",
        },
        { status: 500 }
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

    const { searchParams } = new URL(request.url);

    // Affiliate ID
    const affiliateId =
      searchParams.get("aid") ||
      searchParams.get("affiliate_id");

    // Smartlink ID
    const smartlinkId =
      searchParams.get("sl") ||
      "rotating-smartlink";

    // ------------------------------------------
    // Validate affiliate
    // ------------------------------------------

    if (!affiliateId) {
      return NextResponse.json(
        {
          error: "Affiliate ID is required.",
        },
        { status: 400 }
      );
    }

    const { data: affiliate, error: affiliateError } =
      await supabase
        .from("profiles")
        .select("id, affiliate_id")
        .eq("affiliate_id", affiliateId)
        .maybeSingle();

    if (affiliateError) {
      console.error(
        "Affiliate validation error:",
        affiliateError
      );

      return NextResponse.json(
        {
          error: "Unable to validate affiliate.",
        },
        { status: 500 }
      );
    }

    if (!affiliate) {
      return NextResponse.json(
        {
          error: "Invalid affiliate ID.",
        },
        { status: 404 }
      );
    }

    // ------------------------------------------
    // Generate unique click ID
    // ------------------------------------------

    const clickId = randomUUID();

    // ------------------------------------------
    // Request information
    // ------------------------------------------

    const userAgent =
      request.headers.get("user-agent") || "";

    const referer =
      request.headers.get("referer") || "";

    const country =
      request.headers.get("x-vercel-ip-country") ||
      request.headers.get("cf-ipcountry") ||
      null;

    // ------------------------------------------
    // Detect device
    // ------------------------------------------

    let device = "Desktop";

    if (/tablet|ipad/i.test(userAgent)) {
      device = "Tablet";
    } else if (/mobile|android|iphone/i.test(userAgent)) {
      device = "Mobile";
    }

    // ------------------------------------------
    // Detect browser
    // ------------------------------------------

    let browser = "Other";

    if (/edg/i.test(userAgent)) {
      browser = "Edge";
    } else if (/chrome/i.test(userAgent)) {
      browser = "Chrome";
    } else if (/firefox/i.test(userAgent)) {
      browser = "Firefox";
    } else if (/safari/i.test(userAgent)) {
      browser = "Safari";
    }

    // ------------------------------------------
    // Save click
    // ------------------------------------------

    const { error: clickError } = await supabase
      .from("clicks")
      .insert({
        click_id: clickId,
        affiliate_id: affiliateId,
        smartlink_id: smartlinkId,
        country,
        device,
        browser,
        referer,
      });

    if (clickError) {
      console.error(
        "Click tracking error:",
        clickError
      );

      return NextResponse.json(
        {
          error: "Unable to record click.",
        },
        { status: 500 }
      );
    }

    // ------------------------------------------
    // Rotate between the two Smartlinks
    // ------------------------------------------

    const firstByte = Number.parseInt(
      clickId.replace(/-/g, "").slice(0, 2),
      16
    );

    const smartlink =
      SMARTLINKS[firstByte % SMARTLINKS.length];

    // ------------------------------------------
    // Add click ID to external Smartlink
    // ------------------------------------------

    const redirectUrl = new URL(smartlink);

    redirectUrl.searchParams.set(
      "sub1",
      clickId
    );

    // Optional tracking information
    redirectUrl.searchParams.set(
      "sub2",
      affiliateId
    );

    // ------------------------------------------
    // Redirect visitor
    // ------------------------------------------

    return NextResponse.redirect(
      redirectUrl.toString(),
      302
    );
  } catch (error) {
    console.error(
      "Tracking route error:",
      error
    );

    return NextResponse.json(
      {
        error: "Internal server error.",
      },
      { status: 500 }
    );
  }
}
