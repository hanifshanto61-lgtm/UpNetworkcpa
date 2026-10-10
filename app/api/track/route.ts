
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Existing fallback destinations are preserved.
const SMARTLINKS = [
  "https://sexforfuns.com/pY1PVjKw?aid=pkkfxdhdk&kid=hxxfzdzzbgg",
  "https://datesdreamy.com/qw3y42Vq?aid=pkkfxdhdk&kid=hhkbkaaxpzg",
];

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizePayout(value: unknown): number {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }

  return Number(amount.toFixed(2));
}

function detectDevice(userAgent: string): string {
  if (/tablet|ipad/i.test(userAgent)) return "Tablet";
  if (/mobile|android|iphone/i.test(userAgent)) return "Mobile";
  return "Desktop";
}

function detectBrowser(userAgent: string): string {
  if (/edg/i.test(userAgent)) return "Edge";
  if (/chrome/i.test(userAgent)) return "Chrome";
  if (/firefox/i.test(userAgent)) return "Firefox";
  if (/safari/i.test(userAgent)) return "Safari";
  return "Other";
}

function parseDestination(value: unknown): URL | null {
  const input = clean(value);

  if (!input) return null;

  try {
    const url = new URL(input);

    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:"
    ) {
      return null;
    }

    if (url.username || url.password) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function addTrackingParameters(
  destination: URL,
  clickId: string,
  affiliateId: string,
  offerId?: string
): string {
  destination.searchParams.set("sub1", clickId);
  destination.searchParams.set("sub2", affiliateId);

  if (offerId) {
    destination.searchParams.set("offer_id", offerId);
  }

  return destination.toString();
}

function errorResponse(
  message: string,
  status: number
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
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
      console.error("Tracking: Supabase configuration missing.");

      return errorResponse(
        "Tracking service is not configured.",
        500
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

    const affiliateId = clean(
      searchParams.get("aid") ||
        searchParams.get("affiliate_id")
    );

    const offerId = clean(
      searchParams.get("offerId") ||
        searchParams.get("offer_id")
    );

    const smartlinkSlug =
      clean(searchParams.get("sl")) ||
      "default-smartlink";

    if (!affiliateId) {
      return errorResponse(
        "Affiliate ID is required.",
        400
      );
    }

    // The current database uses public.profiles.
    const {
      data: affiliate,
      error: affiliateError,
    } = await supabase
      .from("profiles")
      .select("id, affiliate_id, application_status")
      .eq("affiliate_id", affiliateId)
      .maybeSingle();

    if (affiliateError) {
      console.error(
        "Tracking: affiliate lookup failed:",
        affiliateError
      );

      return errorResponse(
        "Unable to validate affiliate.",
        500
      );
    }

    if (!affiliate) {
      return errorResponse(
        "Invalid affiliate ID.",
        404
      );
    }

    const affiliateStatus = clean(
      affiliate.application_status
    ).toLowerCase();

    // Only approved affiliates may generate tracked clicks.
    if (
      affiliateStatus !== "approved" &&
      affiliateStatus !== "active"
    ) {
      return errorResponse(
        "Affiliate account is not approved or active.",
        403
      );
    }

    const clickId = randomUUID();

    const userAgent =
      request.headers.get("user-agent") || "";

    const referer =
      request.headers.get("referer") || null;

    const country =
      request.headers.get("x-vercel-ip-country") ||
      request.headers.get("cf-ipcountry") ||
      null;

    const device = detectDevice(userAgent);
    const browser = detectBrowser(userAgent);

    let destination: URL | null = null;
    let payout = 0;
    let trackedOfferId: string | null = null;
    let smartlinkId: string | null = null;

    if (offerId) {
      // ---------------------------------
      // OFFER TRACKING
      // ---------------------------------
      const {
        data: offer,
        error: offerError,
      } = await supabase
        .from("offers")
        .select(
          "id, name, payout, tracking_url, status"
        )
        .eq("id", offerId)
        .eq("status", "active")
        .maybeSingle();

      if (offerError) {
        console.error(
          "Tracking: offer lookup failed:",
          offerError
        );

        return errorResponse(
          "Unable to validate offer.",
          500
        );
      }

      if (!offer) {
        return errorResponse(
          "Offer is unavailable or paused.",
          404
        );
      }

      destination = parseDestination(
        offer.tracking_url
      );

      if (!destination) {
        return errorResponse(
          "Offer tracking URL is missing or invalid.",
          500
        );
      }

      payout = normalizePayout(offer.payout);
      trackedOfferId = String(offer.id);
    } else {
      // ---------------------------------
      // SMART LINK TRACKING
      // ---------------------------------
      const {
        data: smartlink,
        error: smartlinkError,
      } = await supabase
        .from("smart_links")
        .select(
          "id, affiliate_id, slug, destination_url, status"
        )
        .eq("affiliate_id", affiliateId)
        .eq("slug", smartlinkSlug)
        .eq("status", "active")
        .maybeSingle();

      if (smartlinkError) {
        console.warn(
          "Tracking: smartlink lookup failed:",
          smartlinkError
        );
      }

      if (smartlink) {
        const databaseDestination =
          parseDestination(
            smartlink.destination_url
          );

        if (databaseDestination) {
          destination = databaseDestination;
          smartlinkId = String(smartlink.id);
        } else {
          console.warn(
            "Tracking: invalid smartlink destination:",
            smartlink.id
          );
        }
      }

      // Preserve the existing fallback rotation.
      if (!destination) {
        if (SMARTLINKS.length === 0) {
          return errorResponse(
            "No smartlink destination is configured.",
            503
          );
        }

        const firstByte = Number.parseInt(
          clickId.replace(/-/g, "").slice(0, 2),
          16
        );

        const fallbackIndex =
          firstByte % SMARTLINKS.length;

        destination = parseDestination(
          SMARTLINKS[fallbackIndex]
        );

        // No database smartlink is associated
        // with this fallback click.
        smartlinkId = null;

        if (!destination) {
          return errorResponse(
            "Smartlink destination is invalid.",
            500
          );
        }
      }
    }

    // ---------------------------------
    // RECORD CLICK
    // ---------------------------------
    const clickData: Record<string, unknown> = {
      click_id: clickId,
      affiliate_id: affiliateId,
      smartlink_id: smartlinkId,
      country,
      device,
      browser,
      referer,
      status: "click",
      payout: trackedOfferId ? payout : 0,
    };

    if (trackedOfferId) {
      clickData.offer_id = trackedOfferId;
    }

    const { error: clickError } = await supabase
      .from("clicks")
      .insert(clickData);

    if (clickError) {
      console.error(
        "Tracking: click insert failed:",
        clickError
      );

      return errorResponse(
        "Unable to record click.",
        500
      );
    }

    // ---------------------------------
    // REDIRECT
    // ---------------------------------
    const redirectUrl = addTrackingParameters(
      destination,
      clickId,
      affiliateId,
      trackedOfferId || undefined
    );

    return NextResponse.redirect(
      redirectUrl,
      {
        status: 302,
        headers: {
          "Cache-Control": "no-store",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        },
      }
    );
  } catch (error) {
    console.error(
      "Tracking route unexpected error:",
      error
    );

    return errorResponse(
      "Internal tracking service error.",
      500
    );
  }
}
