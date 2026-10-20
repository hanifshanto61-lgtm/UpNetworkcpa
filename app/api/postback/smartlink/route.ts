import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { deliverAffiliateConversion } from "@/lib/affiliate-postback-delivery";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

function reply(
  success: boolean,
  message: string,
  status = 200
) {
  return NextResponse.json(
    { success, message },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    }
  );
}

export async function GET(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return reply(false, "Postback service unavailable.", 503);
    }

    const params = request.nextUrl.searchParams;
    const smartlinkId = (params.get("sl_id") || "").trim();
    const token = (params.get("token") || "").trim();
    const clickId = (params.get("click_id") || "").trim();
    const revenueText = (params.get("payout") || "").trim();

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        smartlinkId
      )
    ) {
      return reply(false, "Invalid Smart Link ID.", 400);
    }

    if (!/^[0-9a-f]{64}$/.test(token)) {
      return reply(false, "Unauthorized postback.", 401);
    }

    if (
      !clickId ||
      clickId.length > 200 ||
      !/^[a-zA-Z0-9_-]+$/.test(clickId)
    ) {
      return reply(false, "Invalid Click ID.", 400);
    }

    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(revenueText)) {
      return reply(false, "Invalid revenue amount.", 400);
    }

    const revenue = Number(revenueText);

    if (!Number.isFinite(revenue) || revenue > 1000000) {
      return reply(false, "Invalid revenue amount.", 400);
    }

    const supabase = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabase.rpc(
      "record_smartlink_postback",
      {
        p_smartlink_id: smartlinkId,
        p_secret: token,
        p_click_id: clickId,
        p_gross_revenue: revenue,
      }
    );

    if (error) {
      console.error("Smart Link postback RPC error:", error.code);
      return reply(false, "Conversion processing failed.", 500);
    }

    switch (data) {
      case "recorded": {
        // Only deliver notifications after the database confirms
        // this is a newly recorded conversion.
        try {
          const { data: conversion, error: conversionError } =
            await supabase
              .from("clicks")
              .select(
                "click_id, affiliate_id, smartlink_id, status, payout, gross_revenue, country"
              )
              .eq("click_id", clickId)
              .eq("smartlink_id", smartlinkId)
              .maybeSingle();

          if (conversionError) {
            console.error(
              "Recorded conversion lookup failed:",
              conversionError.code
            );
          } else if (conversion?.affiliate_id) {
            await deliverAffiliateConversion(supabase, {
              click_id: String(conversion.click_id),
              affiliate_id: String(conversion.affiliate_id),
              status: String(conversion.status || "converted"),
              payout: conversion.payout,
              gross_revenue: conversion.gross_revenue,
              country: conversion.country
                ? String(conversion.country)
                : null,
            });
          }
        } catch {
          // Delivery problems must not undo a recorded conversion.
          console.error("Postback notification delivery failed.");
        }

        return reply(true, "Conversion recorded.");
      }

      case "already_converted":
        // Retries are acknowledged without sending duplicate alerts.
        return reply(true, "Conversion already recorded.");

      case "unauthorized":
        return reply(false, "Unauthorized postback.", 401);

      case "disabled":
        return reply(false, "Smart Link postback is disabled.", 403);

      case "click_not_found":
        return reply(false, "Matching click not found.", 404);

      case "invalid_click_id":
      case "invalid_revenue":
        return reply(false, "Invalid conversion data.", 400);

      case "affiliate_not_found":
      case "ineligible":
      case "duplicate_click_id":
      case "invalid_commission":
        return reply(false, "Conversion requires admin review.", 409);

      default:
        return reply(false, "Unexpected processing result.", 500);
    }
  } catch {
    return reply(false, "Internal postback error.", 500);
  }
}