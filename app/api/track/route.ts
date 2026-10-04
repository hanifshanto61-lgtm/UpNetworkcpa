import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

// ==========================================
// UP NETWORK CPA — TRACKING
// ==========================================

const SMARTLINKS = [
  "https://sexforfuns.com/pY1PVjKw?aid=pkkfxdhdk&kid=hxxfzdzzbgg",
  "https://datesdreamy.com/qw3y42Vq?aid=pkkfxdhdk&kid=hhkbkaaxpzg",
];

function normalizePayout(value: unknown) {
  const payout = Number(value);

  if (!Number.isFinite(payout) || payout < 0) {
    return 0;
  }

  return Number(payout.toFixed(2));
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
          error:
            "Supabase server configuration is missing.",
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

    const { searchParams } =
      new URL(request.url);

    const affiliateId =
      searchParams.get("aid") ||
      searchParams.get("affiliate_id");

    const offerId =
      searchParams.get("offerId") ||
      searchParams.get("offer_id");

    const smartlinkId =
      searchParams.get("sl") ||
      "rotating-smartlink";

    if (!affiliateId) {
      return NextResponse.json(
        {
          error:
            "Affiliate ID is required.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // VALIDATE AFFILIATE
    // ==========================================

    const {
      data: affiliate,
      error: affiliateError,
    } = await supabase
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
          error:
            "Unable to validate affiliate.",
        },
        { status: 500 }
      );
    }

    if (!affiliate) {
      return NextResponse.json(
        {
          error:
            "Invalid affiliate ID.",
        },
        { status: 404 }
      );
    }

    // ==========================================
    // GENERATE CLICK ID
    // ==========================================

    const clickId = randomUUID();

    // ==========================================
    // REQUEST INFORMATION
    // ==========================================

    const userAgent =
      request.headers.get("user-agent") || "";

    const referer =
      request.headers.get("referer") || "";

    const country =
      request.headers.get(
        "x-vercel-ip-country"
      ) ||
      request.headers.get(
        "cf-ipcountry"
      ) ||
      null;

    // ==========================================
    // DEVICE
    // ==========================================

    let device = "Desktop";

    if (/tablet|ipad/i.test(userAgent)) {
      device = "Tablet";
    } else if (
      /mobile|android|iphone/i.test(userAgent)
    ) {
      device = "Mobile";
    }

    // ==========================================
    // BROWSER
    // ==========================================

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

    // ==========================================
    // OFFER TRACKING
    // ==========================================

    if (offerId) {
      const {
        data: offer,
        error: offerError,
      } = await supabase
        .from("offers")
        .select(
          "id, offer_url, payout, currency, status"
        )
        .eq("id", offerId)
        .eq("status", "active")
        .maybeSingle();

      if (offerError) {
        console.error(
          "Offer validation error:",
          offerError
        );

        return NextResponse.json(
          {
            error:
              "Unable to validate offer.",
          },
          { status: 500 }
        );
      }

      if (!offer) {
        return NextResponse.json(
          {
            error:
              "Offer is unavailable or paused.",
          },
          { status: 404 }
        );
      }

      // ==========================================
      // ADMIN CONTROLLED PAYOUT
      // ==========================================

      const offerPayout =
        normalizePayout(
          offer.payout
        );

      // ==========================================
      // SAVE OFFER CLICK
      //
      // First try with offer_id.
      // If the current database does not have
      // offer_id, retry without it.
      // ==========================================

      const clickWithOfferId = {
        click_id: clickId,
        affiliate_id: affiliateId,
        offer_id: offer.id,
        smartlink_id: `offer-${offer.id}`,
        country,
        device,
        browser,
        referer,
        payout: offerPayout,
      };

      let {
        error: clickError,
      } = await supabase
        .from("clicks")
        .insert(clickWithOfferId);

      // ==========================================
      // FALLBACK
      // ==========================================

      if (clickError) {
        console.warn(
          "Offer click insert with offer_id failed. Retrying without offer_id:",
          clickError
        );

        const clickWithoutOfferId = {
          click_id: clickId,
          affiliate_id: affiliateId,
          smartlink_id: `offer-${offer.id}`,
          country,
          device,
          browser,
          referer,
          payout: offerPayout,
        };

        const fallbackResult =
          await supabase
            .from("clicks")
            .insert(clickWithoutOfferId);

        clickError =
          fallbackResult.error;
      }

      // ==========================================
      // FINAL CLICK INSERT ERROR
      // ==========================================

      if (clickError) {
        console.error(
          "Offer click tracking error:",
          clickError
        );

        return NextResponse.json(
          {
            error:
              "Unable to record click.",
            details:
              clickError.message ||
              "Database insert failed.",
          },
          { status: 500 }
        );
      }

      // ==========================================
      // REDIRECT TO OFFER
      // ==========================================

      try {
        const redirectUrl =
          new URL(offer.offer_url);

        redirectUrl.searchParams.set(
          "sub1",
          clickId
        );

        redirectUrl.searchParams.set(
          "sub2",
          affiliateId
        );

        /*
         * Keep offer_id in the outgoing URL
         * for the advertiser/postback system.
         */
        redirectUrl.searchParams.set(
          "offer_id",
          String(offer.id)
        );

        return NextResponse.redirect(
          redirectUrl.toString(),
          302
        );
      } catch (redirectError) {
        console.error(
          "Offer redirect URL error:",
          redirectError
        );

        return NextResponse.json(
          {
            error:
              "Offer URL is invalid.",
          },
          { status: 500 }
        );
      }
    }

    // ==========================================
    // EXISTING SMARTLINK TRACKING
    // ==========================================

    const {
      error: smartlinkClickError,
    } = await supabase
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

    if (smartlinkClickError) {
      console.error(
        "Smartlink click tracking error:",
        smartlinkClickError
      );

      return NextResponse.json(
        {
          error:
            "Unable to record click.",
          details:
            smartlinkClickError.message ||
            "Database insert failed.",
        },
        { status: 500 }
      );
    }

    // ==========================================
    // ROTATE SMARTLINK
    // ==========================================

    const firstByte =
      Number.parseInt(
        clickId
          .replace(/-/g, "")
          .slice(0, 2),
        16
      );

    const smartlink =
      SMARTLINKS[
        firstByte %
          SMARTLINKS.length
      ];

    const redirectUrl =
      new URL(smartlink);

    redirectUrl.searchParams.set(
      "sub1",
      clickId
    );

    redirectUrl.searchParams.set(
      "sub2",
      affiliateId
    );

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
        error:
          "Internal server error.",
      },
      { status: 500 }
    );
  }
}
