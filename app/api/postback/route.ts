import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

function isValidSecret(provided: string, expected: string) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);

  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;

    const clickId =
      searchParams.get("click_id") ||
      searchParams.get("s1") ||
      searchParams.get("sub1");

    const providedSecret =
      searchParams.get("secret") || "";

    const configuredSecret =
      process.env.POSTBACK_SECRET;

    if (!configuredSecret) {
      console.error(
        "POSTBACK_SECRET is not configured."
      );

      return new NextResponse(
        "Server configuration error",
        {
          status: 500,
        }
      );
    }

    if (!providedSecret) {
      return new NextResponse("Unauthorized", {
        status: 401,
      });
    }

    if (
      !isValidSecret(
        providedSecret,
        configuredSecret
      )
    ) {
      return new NextResponse("Unauthorized", {
        status: 401,
      });
    }

    if (!clickId) {
      return new NextResponse(
        "Missing click_id",
        {
          status: 400,
        }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return new NextResponse(
        "Server configuration error",
        {
          status: 500,
        }
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

    /*
     * Find the original click.
     *
     * IMPORTANT:
     * The payout stored on the click was captured
     * from the Admin-controlled Offer when the
     * affiliate generated the click.
     */
    const { data: click, error: findError } =
      await supabase
        .from("clicks")
        .select(
          "click_id, status, payout, offer_id, affiliate_id"
        )
        .eq("click_id", clickId)
        .maybeSingle();

    if (findError) {
      console.error(
        "Postback lookup error:",
        findError
      );

      return new NextResponse(
        "Database lookup failed",
        {
          status: 500,
        }
      );
    }

    if (!click) {
      return new NextResponse(
        "Unknown click_id",
        {
          status: 404,
        }
      );
    }

    /*
     * Already converted.
     *
     * This makes the postback idempotent and
     * prevents the same conversion from being
     * counted multiple times.
     */
    if (click.status === "converted") {
      return new NextResponse("OK", {
        status: 200,
      });
    }

    /*
     * Use the payout captured at click time.
     *
     * DO NOT trust payout coming from the
     * postback URL.
     *
     * This means an external caller cannot change
     * the affiliate's earning by sending:
     *
     * ?payout=999
     */
    const storedPayout = Number(click.payout);

    const payout =
      Number.isFinite(storedPayout) &&
      storedPayout >= 0
        ? storedPayout
        : 0;

    /*
     * Convert the click.
     */
    const { error: updateError } =
      await supabase
        .from("clicks")
        .update({
          status: "converted",
          payout,
          converted_at:
            new Date().toISOString(),
        })
        .eq("click_id", clickId)
        .neq("status", "converted");

    if (updateError) {
      console.error(
        "Postback update error:",
        updateError
      );

      return new NextResponse(
        "Database update failed",
        {
          status: 500,
        }
      );
    }

    console.log(
      `Conversion recorded: ${clickId} | payout: ${payout}`
    );

    return new NextResponse("OK", {
      status: 200,
    });
  } catch (error) {
    console.error(
      "Postback error:",
      error
    );

    return new NextResponse(
      "Internal server error",
      {
        status: 500,
      }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
