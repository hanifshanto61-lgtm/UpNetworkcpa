
import { createHmac, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LEGACY_SMARTLINKS = [
  "https://sexforfuns.com/pY1PVjKw?aid=pkkfxdhdk&kid=hxxfzdzzbgg",
  "https://datesdreamy.com/qw3y42Vq?aid=pkkfxdhdk&kid=hhkbkaaxpzg",
];

type SmartLinkRow = {
  id: string;
  affiliate_id: string | null;
  slug: string;
  destination_url: string | null;
  status: string | null;
  is_global: boolean;
  network_share_percent: number;
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function limited(value: unknown, max = 200): string | null {
  const text = clean(value);
  return text ? text.slice(0, max) : null;
}

function normalizePayout(value: unknown): number {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }

  return Number(amount.toFixed(2));
}

function detectDevice(ua: string): string {
  if (/tablet|ipad/i.test(ua)) return "Tablet";
  if (/mobile|android|iphone/i.test(ua)) return "Mobile";
  return "Desktop";
}

function detectBrowser(ua: string): string {
  if (/edg/i.test(ua)) return "Edge";
  if (/opr|opera/i.test(ua)) return "Opera";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/chrome|crios/i.test(ua)) return "Chrome";
  if (/safari/i.test(ua)) return "Safari";
  return "Other";
}

function detectOS(ua: string): string {
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/android/i.test(ua)) return "Android";
  if (/windows/i.test(ua)) return "Windows";
  if (/mac os|macintosh/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Other";
}

function detectSuspicious(ua: string): boolean {
  return (
    !ua.trim() ||
    /bot|crawler|spider|headless|curl|wget|python-requests|scrapy|selenium|playwright|puppeteer/i.test(
      ua
    )
  );
}

function getHeader(
  request: NextRequest,
  name: string,
  max = 150
): string | null {
  return limited(request.headers.get(name), max);
}

function getCountry(request: NextRequest): string | null {
  return (
    getHeader(request, "x-vercel-ip-country", 10) ||
    getHeader(request, "cf-ipcountry", 10)
  );
}

function getRegion(request: NextRequest): string | null {
  return getHeader(request, "x-vercel-ip-country-region");
}

function getCity(request: NextRequest): string | null {
  const raw = getHeader(request, "x-vercel-ip-city");

  if (!raw) return null;

  try {
    return limited(decodeURIComponent(raw));
  } catch {
    return raw;
  }
}

function getTimezone(request: NextRequest): string | null {
  return getHeader(request, "x-vercel-ip-timezone");
}

function getVisitorHash(
  request: NextRequest,
  ua: string,
  secret: string
): string | null {
  // The IP is used only to calculate a rotating,
  // non-reversible visitor identifier.
  // The raw IP is never saved to the database.
  const ip =
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "";

  if (!ip) return null;

  const day = new Date().toISOString().slice(0, 10);

  return createHmac("sha256", secret)
    .update(`${day}|${ip}|${ua}`)
    .digest("hex");
}

function getTrafficSource(
  request: NextRequest,
  params: URLSearchParams
): string | null {
  const utm =
    limited(params.get("utm_source"), 100) ||
    limited(params.get("source"), 100);

  if (utm) return utm;

  const referrer = request.headers.get("referer");

  if (!referrer) return "Direct / Unknown";

  try {
    const url = new URL(referrer);
    return limited(url.hostname, 100);
  } catch {
    return "Unknown";
  }
}

function getSafeReferrer(
  request: NextRequest
): string | null {
  const value = request.headers.get("referer");

  if (!value) return null;

  try {
    // Store only the origin and path, not query strings
    // that might contain personal information.
    const url = new URL(value);

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    return limited(
      `${url.origin}${url.pathname}`,
      500
    );
  } catch {
    return null;
  }
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

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
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

    const {
      data: affiliate,
      error: affiliateError,
    } = await supabase
      .from("profiles")
      .select("id, affiliate_id, application_status")
      .eq("affiliate_id", affiliateId)
      .maybeSingle();

    if (affiliateError) {
      console.error("Affiliate lookup:", affiliateError);

      return errorResponse(
        "Unable to validate affiliate.",
        500
      );
    }

    if (!affiliate) {
      return errorResponse("Invalid affiliate ID.", 404);
    }

    const affiliateStatus = clean(
      affiliate.application_status
    ).toLowerCase();

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

    const referer = getSafeReferrer(request);

    const country = getCountry(request);
    const region = getRegion(request);
    const city = getCity(request);

    const postalCode = getHeader(
      request,
      "x-vercel-ip-postal-code",
      30
    );

    const timezone = getTimezone(request);

    const asn = getHeader(
      request,
      "x-vercel-ip-as-number",
      50
    );

    const device = detectDevice(userAgent);
    const browser = detectBrowser(userAgent);
    const operatingSystem = detectOS(userAgent);

    const trafficSource = getTrafficSource(
      request,
      searchParams
    );

    const campaign =
      limited(searchParams.get("utm_campaign"), 150) ||
      limited(searchParams.get("campaign"), 150);

    const visitorHash = getVisitorHash(
      request,
      userAgent,
      serviceRoleKey
    );

    const isSuspicious = detectSuspicious(userAgent);

    let destination: URL | null = null;
    let payout = 0;
    let trackedOfferId: string | null = null;
    let smartlinkId: string | null = null;

    if (offerId) {
      // Preserve the existing fixed-payout offer flow.
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
        console.error("Offer lookup:", offerError);

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
      // Check for an affiliate's personal Smartlink.
      const {
        data: personalLink,
        error: personalError,
      } = await supabase
        .from("smart_links")
        .select(
          "id, affiliate_id, slug, destination_url, status, is_global, network_share_percent"
        )
        .eq("affiliate_id", affiliateId)
        .eq("slug", smartlinkSlug)
        .maybeSingle();

      if (personalError) {
        console.error(
          "Personal Smartlink lookup:",
          personalError
        );

        return errorResponse(
          "Unable to load Smartlink.",
          500
        );
      }

      let selectedLink =
        (personalLink as SmartLinkRow | null) ?? null;

      if (!selectedLink) {
        if (smartlinkSlug === "default-smartlink") {
          // Preserve the existing global Smartlink rotation.
          const {
            data: globalLinks,
            error: globalError,
          } = await supabase
            .from("smart_links")
            .select(
              "id, affiliate_id, slug, destination_url, status, is_global, network_share_percent"
            )
            .eq("is_global", true)
            .eq("status", "active")
            .order("slug", { ascending: true });

          if (globalError) {
            console.error(
              "Global Smartlink lookup:",
              globalError
            );

            return errorResponse(
              "Unable to load global Smartlinks.",
              500
            );
          }

          const validLinks = (
            (globalLinks ?? []) as SmartLinkRow[]
          ).filter(
            (link) =>
              parseDestination(link.destination_url) !== null
          );

          if (validLinks.length > 0) {
            const randomIndex =
              Number.parseInt(
                clickId.replace(/-/g, "").slice(0, 8),
                16
              ) % validLinks.length;

            selectedLink = validLinks[randomIndex];
          } else {
            // Legacy fallback only when no global
            // Smartlink records exist.
            const {
              count,
              error: countError,
            } = await supabase
              .from("smart_links")
              .select("id", {
                count: "exact",
                head: true,
              })
              .eq("is_global", true);

            if (countError) {
              return errorResponse(
                "Unable to verify Smartlinks.",
                500
              );
            }

            if (count === 0) {
              const randomIndex =
                Number.parseInt(
                  clickId.replace(/-/g, "").slice(0, 8),
                  16
                ) % LEGACY_SMARTLINKS.length;

              destination = parseDestination(
                LEGACY_SMARTLINKS[randomIndex]
              );
            }
          }
        } else {
          // Explicit global Smartlink.
          const {
            data: globalLink,
            error: globalError,
          } = await supabase
            .from("smart_links")
            .select(
              "id, affiliate_id, slug, destination_url, status, is_global, network_share_percent"
            )
            .eq("is_global", true)
            .eq("slug", smartlinkSlug)
            .maybeSingle();

          if (globalError) {
            console.error(
              "Global Smartlink lookup:",
              globalError
            );

            return errorResponse(
              "Unable to load Smartlink.",
              500
            );
          }

          selectedLink =
            (globalLink as SmartLinkRow | null) ?? null;
        }
      }

      if (selectedLink) {
        if (selectedLink.status !== "active") {
          return errorResponse(
            "Smartlink is paused.",
            404
          );
        }

        destination = parseDestination(
          selectedLink.destination_url
        );

        if (!destination) {
          return errorResponse(
            "Smartlink destination is invalid.",
            500
          );
        }

        smartlinkId = selectedLink.id;
      }

      if (!destination) {
        return errorResponse(
          "Smartlink is unavailable.",
          404
        );
      }
    }

    // Save traffic intelligence with the original click.
    const clickData: Record<string, unknown> = {
      click_id: clickId,
      affiliate_id: affiliateId,
      smartlink_id: smartlinkId,

      country,
      region,
      city,
      postal_code: postalCode,
      timezone,

      device,
      browser,
      operating_system: operatingSystem,

      referer,
      traffic_source: trafficSource,
      campaign,

      visitor_hash: visitorHash,
      is_suspicious: isSuspicious,

      // ASN may be available on Vercel.
      // ISP is left unknown unless a reliable
      // provider supplies it.
      asn,
      isp: null,

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
        "Tracking click insert:",
        clickError
      );

      return errorResponse(
        "Unable to record click.",
        500
      );
    }

    // Keep sub1 and sub2 unchanged for Datify Postback.
    const redirectUrl = addTrackingParameters(
      destination,
      clickId,
      affiliateId,
      trackedOfferId || undefined
    );

    return NextResponse.redirect(redirectUrl, {
      status: 302,
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy":
          "strict-origin-when-cross-origin",
      },
    });
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
