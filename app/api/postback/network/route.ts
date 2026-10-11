import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

function reply(message: string, status: number) {
  return NextResponse.json(
    {
      success: status === 200,
      message,
    },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store, no-cache, max-age=0",
      },
    }
  );
}

function secureCompare(received: string, expected: string) {
  if (!received || !expected) return false;

  const a = createHmac("sha256", "network-postback-auth")
    .update(received)
    .digest();

  const b = createHmac("sha256", "network-postback-auth")
    .update(expected)
    .digest();

  return timingSafeEqual(a, b);
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

function validClickId(value: string) {
  return (
    value.length > 0 &&
    value.length <= 200 &&
    /^[a-zA-Z0-9_-]+$/.test(value)
  );
}

function parsePayout(value: string | null) {
  if (value === null || value.trim() === "") {
    return { valid: true, payout: null as number | null };
  }

  const text = value.trim();

  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(text)) {
    return { valid: false, payout: null };
  }

  const payout = Number(text);

  if (
    !Number.isFinite(payout) ||
    payout < 0 ||
    payout > 1000000
  ) {
    return { valid: false, payout: null };
  }

  return { valid: true, payout };
}

async function processPostback(request: NextRequest) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return reply("Postback service unavailable", 503);
    }

    const params = request.nextUrl.searchParams;

    const networkId = (
      params.get("network_id") || ""
    ).trim();

    const clickId = (
      params.get("click_id") ||
      params.get("sub1") ||
      ""
    ).trim();

    const receivedToken = (
      params.get("token") || ""
    ).trim();

    const payoutResult = parsePayout(
      params.get("payout")
    );

    if (!validUuid(networkId)) {
      return reply("Invalid network ID", 400);
    }

    if (!validClickId(clickId)) {
      return reply("Invalid Click ID", 400);
    }

    if (!payoutResult.valid) {
      return reply("Invalid advertiser payout", 400);
    }

    if (!receivedToken || receivedToken.length > 512) {
      return reply("Unauthorized postback", 401);
    }

    const supabase = createClient(
      supabaseUrl,
      serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const {
      data: network,
      error: networkError,
    } = await supabase
      .from("cpa_networks")
      .select("id,status,postback_secret")
      .eq("id", networkId)
      .maybeSingle();

    if (networkError) {
      console.error(
        "Network postback lookup error:",
        networkError.message
      );

      return reply("Network validation failed", 500);
    }

    if (
      !network ||
      !secureCompare(
        receivedToken,
        network.postback_secret || ""
      )
    ) {
      return reply("Unauthorized postback", 401);
    }

    if (network.status !== "active") {
      return reply("CPA network is paused", 403);
    }

    // Conversion is recorded atomically by the
    // database function, which verifies that
    // the click belongs to this network.
    const {
      data: converted,
      error: conversionError,
    } = await supabase.rpc(
      "approve_network_conversion",
      {
        p_click_id: clickId,
        p_network_id: networkId,
        p_advertiser_payout: payoutResult.payout,
      }
    );

    if (conversionError) {
      console.error(
        "Network conversion RPC error:",
        conversionError.message
      );

      return reply("Conversion processing failed", 500);
    }

    if (converted !== true) {
      return reply(
        "Click not found, already converted, or not eligible",
        409
      );
    }

    return reply(
      "Conversion recorded successfully",
      200
    );
  } catch (error) {
    console.error(
      "Network postback exception:",
      error
    );

    return reply("Internal postback error", 500);
  }
}

// Most CPA networks support GET postbacks.
export async function GET(request: NextRequest) {
  return processPostback(request);
}

// Also support POST requests with URL query parameters.
export async function POST(request: NextRequest) {
  return processPostback(request);
}