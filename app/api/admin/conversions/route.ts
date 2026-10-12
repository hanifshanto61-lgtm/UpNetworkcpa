import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

const CONVERTED_STATUSES = [
  "converted",
  "conversion",
  "approved",
  "paid",
];

function respond(
  data: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

async function verifyAdmin(request: NextRequest) {
  return Boolean(await getAdminSession(request));
}

// GET: View clicks and conversion history.
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return respond(
        {
          success: false,
          error: "Supabase server configuration is missing.",
        },
        500
      );
    }

    if (!(await verifyAdmin(request))) {
      return respond(
        {
          success: false,
          error: "Admin authorization required.",
        },
        401
      );
    }

    const search = request.nextUrl.searchParams
      .get("search")
      ?.trim();

    const filter = request.nextUrl.searchParams
      .get("filter")
      ?.trim()
      .toLowerCase();

    let query = supabaseAdmin
      .from("clicks")
      .select(
        "id, click_id, affiliate_id, offer_id, smartlink_id, status, payout, converted_at, created_at"
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(200);

    if (search) {
      if (search.length > 200) {
        return respond(
          {
            success: false,
            error: "Search value is too long.",
          },
          400
        );
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(search)) {
        return respond(
          {
            success: false,
            error: "Search using a Click ID or Affiliate ID.",
          },
          400
        );
      }

      query = query.or(
        `click_id.eq.${search},affiliate_id.eq.${search}`
      );
    }

    if (filter === "converted") {
      query = query.in("status", CONVERTED_STATUSES);
    } else if (filter === "pending") {
      query = query
        .is("converted_at", null)
        .not(
          "status",
          "in",
          '("converted","conversion","approved","paid")'
        );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Admin conversions GET error:", error);

      return respond(
        {
          success: false,
          error: "Unable to load clicks.",
        },
        500
      );
    }

    return respond({
      success: true,
      clicks: data ?? [],
    });
  } catch (error) {
    console.error("Admin conversions GET exception:", error);

    return respond(
      {
        success: false,
        error: "Unable to load conversions.",
      },
      500
    );
  }
}

// POST: Approve a conversion and assign payout.
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return respond(
        {
          success: false,
          error: "Supabase server configuration is missing.",
        },
        500
      );
    }

    if (!(await verifyAdmin(request))) {
      return respond(
        {
          success: false,
          error: "Admin authorization required.",
        },
        401
      );
    }

    let body: Record<string, unknown>;

    try {
      body = await request.json();

      if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body)
      ) {
        throw new Error("Invalid body");
      }
    } catch {
      return respond(
        {
          success: false,
          error: "Invalid request body.",
        },
        400
      );
    }

    const clickId =
      typeof body.click_id === "string"
        ? body.click_id.trim()
        : "";

    if (!clickId) {
      return respond(
        {
          success: false,
          error: "Click ID is required.",
        },
        400
      );
    }

    if (clickId.length > 200) {
      return respond(
        {
          success: false,
          error: "Click ID is too long.",
        },
        400
      );
    }

    if (
      body.payout === undefined ||
      body.payout === null ||
      body.payout === "" ||
      typeof body.payout === "boolean"
    ) {
      return respond(
        {
          success: false,
          error: "A valid payout amount is required.",
        },
        400
      );
    }

    const payout = Number(body.payout);

    if (
      !Number.isFinite(payout) ||
      payout < 0 ||
      payout > 1000000 ||
      !Number.isInteger(payout * 100)
    ) {
      return respond(
        {
          success: false,
          error:
            "Payout must be between 0 and 1,000,000 with at most two decimal places.",
        },
        400
      );
    }

    const { data: click, error: lookupError } =
      await supabaseAdmin
        .from("clicks")
        .select(
          "click_id, affiliate_id, status, converted_at"
        )
        .eq("click_id", clickId)
        .maybeSingle();

    if (lookupError) {
      console.error(
        "Conversion click lookup error:",
        lookupError
      );

      return respond(
        {
          success: false,
          error: "Unable to verify the click.",
        },
        500
      );
    }

    if (!click) {
      return respond(
        {
          success: false,
          error: "Click ID was not found.",
        },
        404
      );
    }

    if (!click.affiliate_id) {
      return respond(
        {
          success: false,
          error: "This click has no assigned affiliate.",
        },
        400
      );
    }

    const currentStatus = String(
      click.status ?? ""
    ).toLowerCase();

    if (
      CONVERTED_STATUSES.includes(currentStatus) ||
      click.converted_at
    ) {
      return respond(
        {
          success: false,
          error: "This click has already been converted.",
        },
        409
      );
    }

    if (
      currentStatus !== "click" &&
      currentStatus !== "pending" &&
      currentStatus !== ""
    ) {
      return respond(
        {
          success: false,
          error:
            "This click cannot be approved in its current status.",
        },
        409
      );
    }

    const { data: affiliate, error: affiliateError } =
      await supabaseAdmin
        .from("profiles")
        .select("affiliate_id, full_name, email")
        .eq("affiliate_id", click.affiliate_id)
        .maybeSingle();

    if (affiliateError || !affiliate) {
      return respond(
        {
          success: false,
          error: "The affiliate profile was not found.",
        },
        404
      );
    }

    // Prevent duplicate approval of the same click.
    let updateQuery = supabaseAdmin
      .from("clicks")
      .update({
        status: "converted",
        payout,
        converted_at: new Date().toISOString(),
      })
      .eq("click_id", clickId)
      .is("converted_at", null);

    if (click.status === null) {
      updateQuery = updateQuery.is("status", null);
    } else {
      updateQuery = updateQuery.eq("status", click.status);
    }

    const { data: updated, error: updateError } =
      await updateQuery.select(
        "click_id, affiliate_id, offer_id, status, payout, converted_at"
      );

    if (updateError) {
      console.error("Conversion approval error:", updateError);

      return respond(
        {
          success: false,
          error: "Unable to approve conversion.",
        },
        500
      );
    }

    if (!updated || updated.length !== 1) {
      return respond(
        {
          success: false,
          error:
            "This click was already updated or its status changed. Refresh and try again.",
        },
        409
      );
    }

    return respond({
      success: true,
      message: "Conversion approved successfully.",
      conversion: updated[0],
      affiliate: {
        affiliate_id: affiliate.affiliate_id,
        full_name: affiliate.full_name,
        email: affiliate.email,
      },
    });
  } catch (error) {
    console.error("Admin conversion POST exception:", error);

    return respond(
      {
        success: false,
        error: "Unable to approve conversion.",
      },
      500
    );
  }
}
