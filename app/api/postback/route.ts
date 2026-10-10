
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function reply(message: string, status = 200) {
  return new NextResponse(message, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function validSecret(provided: string, expected: string) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);

  return a.length === b.length && timingSafeEqual(a, b);
}

function parseRevenue(value: string | null): number | null {
  if (value === null || value.trim() === "") {
    return null;
  }

  // Accept non-negative decimal values only.
  if (!/^\d+(?:\.\d{1,4})?$/.test(value.trim())) {
    return NaN;
  }

  const amount = Number(value);

  if (!Number.isFinite(amount) || amount > 1000000000) {
    return NaN;
  }

  return amount;
}

async function handlePostback(req: NextRequest) {
  try {
    const params = new URL(req.url).searchParams;

    const configuredSecret = process.env.POSTBACK_SECRET;

    if (!configuredSecret) {
      console.error("POSTBACK_SECRET is missing.");
      return reply("Server configuration error", 500);
    }

    const providedSecret = params.get("secret") || "";

    if (
      !providedSecret ||
      !validSecret(providedSecret, configuredSecret)
    ) {
      return reply("Unauthorized", 401);
    }

    const clickId = (
      params.get("click_id") ||
      params.get("s1") ||
      params.get("sub1") ||
      ""
    ).trim();

    if (
      !clickId ||
      clickId.length > 128 ||
      !/^[a-zA-Z0-9_-]+$/.test(clickId)
    ) {
      return reply("Invalid click_id", 400);
    }

    const revenueValue =
      params.get("revenue") ??
      params.get("sum") ??
      params.get("payout");

    const grossRevenue = parseRevenue(revenueValue);

    if (grossRevenue !== null && Number.isNaN(grossRevenue)) {
      return reply("Invalid revenue", 400);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Supabase server configuration is missing.");
      return reply("Server configuration error", 500);
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

    // Check the click type before processing.
    const { data: click, error: lookupError } = await supabase
      .from("clicks")
      .select("click_id, smartlink_id, offer_id")
      .eq("click_id", clickId)
      .maybeSingle();

    if (lookupError) {
      console.error("Postback click lookup:", lookupError);
      return reply("Database lookup failed", 500);
    }

    if (!click) {
      return reply("Unknown click_id", 404);
    }

    // Smart Link conversions must include advertiser revenue.
    if (click.smartlink_id && grossRevenue === null) {
      return reply("Missing Smart Link revenue", 400);
    }

    // Database function locks the click row and atomically
    // prevents duplicate conversions.
    const { data, error } = await supabase.rpc(
      "process_cpa_conversion",
      {
        p_click_id: clickId,
        p_gross_revenue: grossRevenue,
      }
    );

    if (error) {
      console.error("Postback conversion RPC:", error);
      return reply("Conversion processing failed", 500);
    }

    const result = data as {
      success?: boolean;
      code?: string;
      affiliate_id?: string;
      payout?: number;
      gross_revenue?: number;
      network_profit?: number;
    } | null;

    if (!result?.success) {
      switch (result?.code) {
        case "CLICK_NOT_FOUND":
          return reply("Unknown click_id", 404);

        case "INVALID_REVENUE":
          return reply("Invalid advertiser revenue", 400);

        case "SMARTLINK_NOT_FOUND":
          return reply("Smart Link not found", 409);

        default:
          console.error("Postback rejected:", result?.code);
          return reply("Conversion rejected", 422);
      }
    }

    if (result.code === "ALREADY_CONVERTED") {
      return reply("OK", 200);
    }

    console.log("CPA conversion recorded:", {
      clickId,
      affiliateId: result.affiliate_id,
      grossRevenue: result.gross_revenue,
      networkProfit: result.network_profit,
      affiliatePayout: result.payout,
    });

    return reply("OK", 200);
  } catch (error) {
    console.error("Postback unexpected error:", error);
    return reply("Internal server error", 500);
  }
}

export async function GET(req: NextRequest) {
  return handlePostback(req);
}

export async function POST(req: NextRequest) {
  return handlePostback(req);
}
