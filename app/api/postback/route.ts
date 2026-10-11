
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function reply(message: string, status: number) {
  return NextResponse.json(
    {
      success: status === 200,
      message,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

function validSecret(received: string, expected: string) {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);

  if (a.length !== b.length) return false;

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
      console.error("Postback configuration missing");
      return reply("Postback service unavailable", 503);
    }

    const params = request.nextUrl.searchParams;

    // Supported CPA network parameter names.
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

    if (!receivedToken || !validSecret(
      receivedToken,
      postbackSecret
    )) {
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

    // The database function performs an atomic update.
    // A previously converted click cannot be approved again.
    const { data, error } = await supabase.rpc(
      "approve_postback_conversion",
      {
        p_click_id: clickId,
        p_payout: payout,
      }
    );

    if (error) {
      console.error(
        "Postback conversion database error:",
        error
      );
      return reply("Conversion processing failed", 500);
    }

    if (data !== true) {
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
