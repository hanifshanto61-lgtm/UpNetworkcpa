import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

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
        "Cache-Control":
          "private, no-store, no-cache, max-age=0",
      },
    }
  );
}

function validSecret(received: string, expected: string) {
  const a = createHmac("sha256", "postback-auth")
    .update(received)
    .digest();

  const b = createHmac("sha256", "postback-auth")
    .update(expected)
    .digest();

  return timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    const postbackSecret =
      process.env.POSTBACK_SECRET;

    if (!supabaseUrl || !serviceKey || !postbackSecret) {
      return reply("Postback service unavailable", 503);
    }

    const params = request.nextUrl.searchParams;

    const clickId = (
      params.get("click_id") ||
      params.get("sub1") ||
      ""
    ).trim();

    const receivedToken = (
      params.get("token") || ""
    ).trim();

    const payoutText = (
      params.get("payout") || ""
    ).trim();

    if (
      !receivedToken ||
      !validSecret(receivedToken, postbackSecret)
    ) {
      return reply("Unauthorized postback", 401);
    }

    if (
      !clickId ||
      clickId.length > 200 ||
      !/^[a-zA-Z0-9_-]+$/.test(clickId)
    ) {
      return reply("Invalid Click ID", 400);
    }

    if (
      !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(
        payoutText
      )
    ) {
      return reply("Invalid payout amount", 400);
    }

    const payout = Number(payoutText);

    if (
      !Number.isFinite(payout) ||
      payout < 0 ||
      payout > 1000000
    ) {
      return reply("Invalid payout amount", 400);
    }

    // Direct POST request to the Supabase RPC endpoint.
    // Avoid any cached GET response for conversion writes.
    const rpcResponse = await fetch(
      `${supabaseUrl}/rest/v1/rpc/approve_postback_conversion`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        body: JSON.stringify({
          p_click_id: clickId,
          p_payout: payout,
        }),
      }
    );

    if (!rpcResponse.ok) {
      console.error(
        "Postback RPC HTTP status:",
        rpcResponse.status
      );
      return reply("Conversion processing failed", 500);
    }

    const result: unknown = await rpcResponse.json();

    if (result !== true) {
      return reply(
        "Click not found, already converted, or not eligible",
        409
      );
    }

    return reply("Conversion recorded successfully", 200);
  } catch (error) {
    console.error("Postback processing error:", error);
    return reply("Internal postback error", 500);
  }
}