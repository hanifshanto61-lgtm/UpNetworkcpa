import { createHmac, randomUUID } from "crypto";
import { isIP } from "net";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasOfferApproval } from "@/lib/offer-access";
import { SUB_ID_PATTERN } from "@/lib/sub-id-report";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const LEGACY_SMARTLINKS = [
  "https://sexforfuns.com/pY1PVjKw?aid=pkkfxdhdk&kid=hxxfzdzzbgg",
  "https://datesdreamy.com/qw3y42Vq?aid=pkkfxdhdk&kid=hhkbkaaxpzg",
];

const SMARTLINK_COLUMNS =
  "id,affiliate_id,slug,destination_url,status,is_global,network_share_percent";

type SmartLinkRow = {
  id: string;
  affiliate_id: string | null;
  slug: string;
  destination_url: string | null;
  status: string | null;
  is_global: boolean;
  network_share_percent: number | string | null;
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function limited(
  value: unknown,
  max = 200
): string | null {
  const text = clean(value);
  return text ? text.slice(0, max) : null;
}

function normalizePayout(value: unknown): number {
  const amount = Number(value);

  return Number.isFinite(amount) && amount >= 0
    ? Number(amount.toFixed(2))
    : 0;
}

function commission(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    amount > 100 ||
    Math.abs(
      amount * 100 - Math.round(amount * 100)
    ) > 0.000001
  ) {
    return null;
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

function getCity(
  request: NextRequest
): string | null {
  const raw = getHeader(
    request,
    "x-vercel-ip-city"
  );

  if (!raw) return null;

  try {
    return limited(decodeURIComponent(raw));
  } catch {
    return raw;
  }
}

function getVisitorHash(
  request: NextRequest,
  ua: string,
  secret: string
): string | null {
  const ip =
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim() ||
    "";

  if (!ip) return null;

  const day = new Date()
    .toISOString()
    .slice(0, 10);

  return createHmac("sha256", secret)
    .update(`${day}|${ip}|${ua}`)
    .digest("hex");
}

function getTrafficSource(
  request: NextRequest,
  params: URLSearchParams
): string | null {
  const source =
    limited(params.get("utm_source"), 100) ||
    limited(params.get("source"), 100);

  if (source) return source;

  const referrer =
    request.headers.get("referer");

  if (!referrer) return "Direct / Unknown";

  try {
    return limited(
      new URL(referrer).hostname,
      100
    );
  } catch {
    return "Unknown";
  }
}

function getSafeReferrer(
  request: NextRequest
): string | null {
  const value =
    request.headers.get("referer");

  if (!value) return null;

  try {
    const url = new URL(value);

    if (
      !["http:", "https:"].includes(url.protocol)
    ) {
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

function parseDestination(
  value: unknown
): URL | null {
  const input = clean(value);

  if (!input) return null;

  try {
    const url = new URL(input);

    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function validClickIdParameter(
  value: unknown
): string | null {
  const parameter = clean(value);

  if (
    !/^[a-zA-Z][a-zA-Z0-9_]{0,49}$/.test(parameter) ||
    ["sub2", "offer_id"].includes(
      parameter.toLowerCase()
    )
  ) {
    return null;
  }

  return parameter;
}

function addTrackingParameters(
  destination: URL,
  clickId: string,
  affiliateId: string,
  offerId: string | null,
  parameter: string
): string {
  destination.searchParams.set(
    parameter,
    clickId
  );

  destination.searchParams.set(
    "sub2",
    affiliateId
  );

  if (
    offerId &&
    !destination.searchParams.has("offer_id")
  ) {
    destination.searchParams.set(
      "offer_id",
      offerId
    );
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
    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return errorResponse(
        "Tracking service is not configured.",
        500
      );
    }

    const supabase = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            cache: "no-store",
          }),
      },
    });

    const params =
      request.nextUrl.searchParams;

    const affiliateId = clean(
      params.get("aid") ||
        params.get("affiliate_id")
    );

    const offerId = clean(
      params.get("offerId") ||
        params.get("offer_id")
    );

    const slug =
      clean(params.get("sl")) ||
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
      .select(
        "id,affiliate_id,application_status"
      )
      .eq("affiliate_id", affiliateId)
      .maybeSingle();

    if (affiliateError) {
      console.error(
        "Affiliate lookup:",
        affiliateError.code
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

    if (
      !["approved", "active"].includes(
        clean(
          affiliate.application_status
        ).toLowerCase()
      )
    ) {
      return errorResponse(
        "Affiliate account is not approved or active.",
        403
      );
    }

    // No worker lookup or new click column is used for existing links without sub_id.
    const workerSubId = params.has("sub_id") ? clean(params.get("sub_id")) : null;
    if (workerSubId !== null) {
      if (!SUB_ID_PATTERN.test(workerSubId)) return errorResponse("Invalid worker Sub ID.", 400);
      const { data: worker, error: workerError } = await supabase
        .from("affiliate_sub_ids").select("id")
        .eq("affiliate_id", affiliateId).eq("user_id", affiliate.id)
        .eq("sub_id", workerSubId).maybeSingle();
      if (workerError) return errorResponse("Worker tracking is unavailable. Please contact support.", 503);
      if (!worker) return errorResponse("Worker Sub ID does not belong to this affiliate.", 404);
    }

    const clickId = randomUUID();

    let destination: URL | null = null;
    let payout = 0;
    let trackedOfferId: string | null = null;
    let smartlinkId: string | null = null;
    let shareSnapshot: number | null = null;
    let clickIdParameter = "sub1";

    if (offerId) {
      const {
        data: offer,
        error: offerError,
      } = await supabase
        .from("offers")
        .select(
          "id,name,payout,tracking_url,status,network_id"
        )
        .eq("id", offerId)
        .eq("status", "active")
        .maybeSingle();

      if (offerError) {
        console.error(
          "Offer lookup:",
          offerError.code
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

      const approved = await hasOfferApproval(
        supabase,
        affiliate.id,
        String(offer.id)
      );

      if (!approved) {
        return errorResponse(
          "Request this offer and wait for admin approval before promoting it.",
          403
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

      if (offer.network_id) {
        const {
          data: network,
          error: networkError,
        } = await supabase
          .from("cpa_networks")
          .select(
            "status,click_id_parameter"
          )
          .eq("id", offer.network_id)
          .maybeSingle();

        if (networkError) {
          console.error(
            "Network lookup:",
            networkError.code
          );

          return errorResponse(
            "Unable to validate CPA network.",
            500
          );
        }

        if (!network) {
          return errorResponse(
            "CPA network is unavailable.",
            404
          );
        }

        if (network.status !== "active") {
          return errorResponse(
            "CPA network is paused.",
            403
          );
        }

        const parameter =
          validClickIdParameter(
            network.click_id_parameter
          );

        if (!parameter) {
          return errorResponse(
            "Invalid CPA network tracking parameter.",
            500
          );
        }

        clickIdParameter = parameter;
      }

      payout = normalizePayout(
        offer.payout
      );

      trackedOfferId = String(offer.id);
    } else {
      const {
        data: personalLink,
        error: personalError,
      } = await supabase
        .from("smart_links")
        .select(SMARTLINK_COLUMNS)
        .eq("affiliate_id", affiliateId)
        .eq("slug", slug)
        .maybeSingle();

      if (personalError) {
        console.error(
          "Personal link lookup:",
          personalError.code
        );

        return errorResponse(
          "Unable to load Smart Link.",
          500
        );
      }

      let selectedLink =
        (personalLink as SmartLinkRow | null) ??
        null;

      if (
        !selectedLink &&
        slug === "default-smartlink"
      ) {
        const {
          data: globalLinks,
          error: globalError,
        } = await supabase
          .from("smart_links")
          .select(SMARTLINK_COLUMNS)
          .eq("is_global", true)
          .eq("smartlink_group", "global_pool")
          .eq("status", "active")
          .order("slug", {
            ascending: true,
          });

        if (globalError) {
          console.error(
            "Global links lookup:",
            globalError.code
          );

          return errorResponse(
            "Unable to load global Smart Links.",
            500
          );
        }

        const validLinks = (
          (globalLinks || []) as SmartLinkRow[]
        ).filter(
          (link) =>
            parseDestination(
              link.destination_url
            ) !== null
        );

        const selector = Number.parseInt(
          clickId
            .replace(/-/g, "")
            .slice(0, 8),
          16
        );

        if (validLinks.length) {
          selectedLink =
            validLinks[
              selector % validLinks.length
            ];
        } else {
          const {
            count,
            error: countError,
          } = await supabase
            .from("smart_links")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("is_global", true)
            .eq(
              "smartlink_group",
              "global_pool"
            );

          if (countError) {
            return errorResponse(
              "Unable to verify Smart Links.",
              500
            );
          }

          if (count === 0) {
            destination = parseDestination(
              LEGACY_SMARTLINKS[
                selector %
                  LEGACY_SMARTLINKS.length
              ]
            );
          }
        }
      } else if (!selectedLink) {
        const {
          data: globalLink,
          error: globalError,
        } = await supabase
          .from("smart_links")
          .select(SMARTLINK_COLUMNS)
          .eq("is_global", true)
          .eq("slug", slug)
          .maybeSingle();

        if (globalError) {
          console.error(
            "Global link lookup:",
            globalError.code
          );

          return errorResponse(
            "Unable to load Smart Link.",
            500
          );
        }

        selectedLink =
          (globalLink as SmartLinkRow | null) ??
          null;
      }

      if (selectedLink) {
        if (
          selectedLink.status !== "active"
        ) {
          return errorResponse(
            "Smart Link is paused.",
            404
          );
        }

        destination = parseDestination(
          selectedLink.destination_url
        );

        if (!destination) {
          return errorResponse(
            "Smart Link destination is invalid.",
            500
          );
        }

        smartlinkId = selectedLink.id;

        shareSnapshot = commission(
          selectedLink.network_share_percent
        );

        if (shareSnapshot === null) {
          return errorResponse(
            "Smart Link commission is missing or invalid.",
            500
          );
        }

        const {
          data: settings,
          error: settingsError,
        } = await supabase
          .from(
            "smartlink_postback_settings"
          )
          .select("click_id_parameter")
          .eq("smartlink_id", smartlinkId)
          .maybeSingle();

        if (settingsError) {
          console.error(
            "Smart Link settings lookup:",
            settingsError.code
          );

          return errorResponse(
            "Unable to load Smart Link tracking settings.",
            500
          );
        }

        if (settings) {
          const parameter =
            validClickIdParameter(
              settings.click_id_parameter
            );

          if (!parameter) {
            return errorResponse(
              "Invalid Smart Link tracking parameter.",
              500
            );
          }

          clickIdParameter = parameter;
        }
      }

      if (!destination) {
        return errorResponse(
          "Smart Link is unavailable.",
          404
        );
      }
    }

    if (!destination) {
      return errorResponse(
        "Tracking destination is unavailable.",
        404
      );
    }

    const ua =
      request.headers.get("user-agent") ||
      "";

    // Vercel sets these headers at the edge; do not trust caller-supplied IP params.
    const forwardedIp = process.env.VERCEL === "1"
      ? (request.headers.get("x-vercel-forwarded-for") ||
         request.headers.get("x-forwarded-for") || "").split(",")[0].trim()
      : "";
    const ipAddress = isIP(forwardedIp) ? forwardedIp : null;

    const clickData: Record<string, unknown> = {
      ip_address: ipAddress,
      click_id: clickId,
      affiliate_id: affiliateId,
      smartlink_id: smartlinkId,

      country:
        getHeader(
          request,
          "x-vercel-ip-country",
          10
        ) ||
        getHeader(
          request,
          "cf-ipcountry",
          10
        ),

      region: getHeader(
        request,
        "x-vercel-ip-country-region"
      ),

      city: getCity(request),

      postal_code: getHeader(
        request,
        "x-vercel-ip-postal-code",
        30
      ),

      timezone: getHeader(
        request,
        "x-vercel-ip-timezone"
      ),

      user_agent: limited(ua, 2048),
      device: detectDevice(ua),
      browser: detectBrowser(ua),
      operating_system: detectOS(ua),

      referer: getSafeReferrer(request),

      traffic_source: getTrafficSource(
        request,
        params
      ),

      campaign:
        limited(
          params.get("utm_campaign"),
          150
        ) ||
        limited(
          params.get("campaign"),
          150
        ),

      visitor_hash: getVisitorHash(
        request,
        ua,
        key
      ),

      is_suspicious: detectSuspicious(ua),

      asn: getHeader(
        request,
        "x-vercel-ip-as-number",
        50
      ),

      isp: null,
      status: "click",
      payout: trackedOfferId ? payout : 0,
    };

    if (workerSubId !== null) clickData.worker_sub_id = workerSubId;

    if (trackedOfferId) {
      clickData.offer_id = trackedOfferId;
    }

    if (
      smartlinkId &&
      shareSnapshot !== null
    ) {
      clickData.network_share_percent =
        shareSnapshot;

      clickData.gross_revenue = 0;
      clickData.network_profit = 0;
    }

    let { error: clickError } =
      await supabase
        .from("clicks")
        .insert(clickData);

    // Preserve redirects before the new column is available.
    if (
      clickError &&
      ["42703", "PGRST204"].includes(clickError.code) &&
      /user_agent|ip_address/.test(clickError.message)
    ) {
      delete clickData.user_agent;
      delete clickData.ip_address;
      const retry = await supabase.from("clicks").insert(clickData);
      clickError = retry.error;
    }

    if (clickError) {
      console.error(
        "Tracking insert:",
        clickError.code
      );

      return errorResponse(
        "Unable to record click.",
        500
      );
    }

    const redirectUrl =
      addTrackingParameters(
        destination,
        clickId,
        affiliateId,
        trackedOfferId,
        clickIdParameter
      );

    return NextResponse.redirect(
      redirectUrl,
      {
        status: 302,
        headers: {
          "Cache-Control": "no-store",
          "Referrer-Policy":
            "strict-origin-when-cross-origin",
        },
      }
    );
  } catch {
    return errorResponse(
      "Internal tracking service error.",
      500
    );
  }
}