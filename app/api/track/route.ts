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

function detectDevice(userAgent: string) {
  if (/tablet|ipad/i.test(userAgent)) {
    return "Tablet";
  }

  if (/mobile|android|iphone/i.test(userAgent)) {
    return "Mobile";
  }

  return "Desktop";
}

function detectBrowser(userAgent: string) {
  if (/edg/i.test(userAgent)) {
    return "Edge";
  }

  if (/chrome/i.test(userAgent)) {
    return "Chrome";
  }

  if (/firefox/i.test(userAgent)) {
    return "Firefox";
  }

  if (/safari/i.test(userAgent)) {
    return "Safari";
  }

  return "Other";
}

export async function GET(
  request: NextRequest
) {
  try {
    /* ------------------------------------------
       1. SUPABASE CONFIGURATION
    ------------------------------------------ */

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

    const supabase =
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

    /* ------------------------------------------
       2. READ PARAMETERS
    ------------------------------------------ */

    const { searchParams } =
      new URL(request.url);

    const affiliateId =
      searchParams.get("aid") ||
      searchParams.get("affiliate_id");

    const offerId =
      searchParams.get("offerId") ||
      searchParams.get("offer_id");

    const smartlinkSlug =
      searchParams.get("sl") ||
      "default-smartlink";

    if (!affiliateId) {
      return NextResponse.json(
        {
          error:
            "Affiliate ID is required.",
        },
        { status: 400 }
      );
    }

    /* ------------------------------------------
       3. VALIDATE AFFILIATE
       Current schema:
       public.affiliate_profiles
    ------------------------------------------ */

    const {
      data: affiliate,
      error: affiliateError,
    } =
      await supabase
        .from("affiliate_profiles")
        .select(
          "id, affiliate_id, status"
        )
        .eq(
          "affiliate_id",
          affiliateId
        )
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

    /* ------------------------------------------
       4. CHECK AFFILIATE STATUS
    ------------------------------------------ */

    const affiliateStatus =
      String(
        affiliate.status || "active"
      )
        .trim()
        .toLowerCase();

    if (
      affiliateStatus === "suspended" ||
      affiliateStatus === "rejected"
    ) {
      return NextResponse.json(
        {
          error:
            "Affiliate account is not active.",
        },
        { status: 403 }
      );
    }

    /* ------------------------------------------
       5. GENERATE CLICK ID
    ------------------------------------------ */

    const clickId = randomUUID();

    /* ------------------------------------------
       6. REQUEST INFORMATION
    ------------------------------------------ */

    const userAgent =
      request.headers.get(
        "user-agent"
      ) || "";

    const referer =
      request.headers.get(
        "referer"
      ) || null;

    const country =
      request.headers.get(
        "x-vercel-ip-country"
      ) ||
      request.headers.get(
        "cf-ipcountry"
      ) ||
      null;

    const device =
      detectDevice(userAgent);

    const browser =
      detectBrowser(userAgent);

    /* ------------------------------------------
       7. OFFER TRACKING
    ------------------------------------------ */

    if (offerId) {
      const {
        data: offer,
        error: offerError,
      } =
        await supabase
          .from("offers")
          .select(
            `
              id,
              name,
              payout,
              tracking_url,
              image_url,
              status
            `
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

      /* ----------------------------------------
         OFFER PAYOUT
      ---------------------------------------- */

      const offerPayout =
        normalizePayout(
          offer.payout
        );

      /* ----------------------------------------
         SAVE OFFER CLICK
      ---------------------------------------- */

      const clickData = {
        click_id: clickId,

        affiliate_id:
          affiliateId,

        offer_id:
          offer.id,

        smartlink_id:
          null,

        country,

        device,

        browser,

        referer,

        status: "click",

        payout:
          offerPayout,
      };

      const {
        error: clickError,
      } =
        await supabase
          .from("clicks")
          .insert(clickData);

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

      /* ----------------------------------------
         VALIDATE TRACKING URL
      ---------------------------------------- */

      if (
        !offer.tracking_url
      ) {
        return NextResponse.json(
          {
            error:
              "This offer does not have a tracking URL.",
          },
          { status: 500 }
        );
      }

      try {
        const redirectUrl =
          new URL(
            offer.tracking_url
          );

        /* --------------------------------------
           SUB PARAMETERS
        -------------------------------------- */

        redirectUrl.searchParams.set(
          "sub1",
          clickId
        );

        redirectUrl.searchParams.set(
          "sub2",
          affiliateId
        );

        redirectUrl.searchParams.set(
          "offer_id",
          String(offer.id)
        );

        /* --------------------------------------
           REDIRECT
        -------------------------------------- */

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
              "Offer tracking URL is invalid.",
          },
          { status: 500 }
        );
      }
    }

    /* ------------------------------------------
       8. SMARTLINK DATABASE LOOKUP
    ------------------------------------------ */

    let smartlinkUuid:
      string | null = null;

    try {
      const {
        data: smartlink,
        error: smartlinkError,
      } =
        await supabase
          .from("smart_links")
          .select(
            "id, affiliate_id, slug, destination_url, status"
          )
          .eq(
            "affiliate_id",
            affiliateId
          )
          .eq(
            "slug",
            smartlinkSlug
          )
          .eq(
            "status",
            "active"
          )
          .maybeSingle();

      if (
        !smartlinkError &&
        smartlink
      ) {
        smartlinkUuid =
          smartlink.id;
      }
    } catch (error) {
      console.warn(
        "Smartlink lookup failed:",
        error
      );
    }

    /* ------------------------------------------
       9. SAVE SMARTLINK CLICK
    ------------------------------------------ */

    const smartlinkClickData = {
      click_id:
        clickId,

      affiliate_id:
        affiliateId,

      smartlink_id:
        smartlinkUuid,

      country,

      device,

      browser,

      referer,

      status:
        "click",

      payout:
        0,
    };

    const {
      error:
        smartlinkClickError,
    } =
      await supabase
        .from("clicks")
        .insert(
          smartlinkClickData
        );

    if (
      smartlinkClickError
    ) {
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

    /* ------------------------------------------
       10. USE DATABASE SMARTLINK DESTINATION
    ------------------------------------------ */

    if (smartlinkUuid) {
      try {
        const {
          data: smartlink,
        } =
          await supabase
            .from("smart_links")
            .select(
              "destination_url,status"
            )
            .eq(
              "id",
              smartlinkUuid
            )
            .eq(
              "status",
              "active"
            )
            .maybeSingle();

        if (
          smartlink?.destination_url
        ) {
          try {
            const redirectUrl =
              new URL(
                smartlink.destination_url
              );

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
            console.warn(
              "Database smartlink destination URL is invalid:",
              error
            );
          }
        }
      } catch (error) {
        console.warn(
          "Smartlink destination lookup failed:",
          error
        );
      }
    }

    /* ------------------------------------------
       11. FALLBACK SMARTLINK ROTATION
    ------------------------------------------ */

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
