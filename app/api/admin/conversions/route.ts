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

const REVIEW_STATUSES = [
  "unreviewed",
  "approved",
  "fraud",
  "investigate",
] as const;

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

function applyFilters(
  query: any,
  search: string,
  filter: string
) {
  if (search) {
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
  } else if (
    [
      "unreviewed",
      "fraud",
      "investigate",
      "review-approved",
    ].includes(filter)
  ) {
    const reviewStatus =
      filter === "review-approved" ? "approved" : filter;

    query = query.eq("review_status", reviewStatus);
  }

  return query;
}

function validateSearch(value: string) {
  if (value.length > 200) {
    return "Search value is too long.";
  }

  if (value && !/^[a-zA-Z0-9_-]+$/.test(value)) {
    return "Search using a Click ID or Affiliate ID.";
  }

  return null;
}

// GET: Load click/conversion history.
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

    const search =
      request.nextUrl.searchParams.get("search")?.trim() ?? "";

    const filter =
      request.nextUrl.searchParams
        .get("filter")
        ?.trim()
        .toLowerCase() ?? "all";

    const validationError = validateSearch(search);

    if (validationError) {
      return respond(
        { success: false, error: validationError },
        400
      );
    }

    const selectFields =
      "id, click_id, affiliate_id, offer_id, smartlink_id, status, payout, converted_at, created_at, traffic_source, referer, country, device, browser, operating_system, user_agent, ip_address, review_status, review_note, reviewed_at, reviewed_by";

    let query = supabaseAdmin
      .from("clicks")
      .select(selectFields)
      .order("created_at", { ascending: false })
      .limit(200);

    query = applyFilters(query, search, filter);

    let { data, error } = await query;

    // Compatibility fallback if IP/User Agent columns are unavailable.
    if (
      error &&
      ["42703", "PGRST204"].includes(error.code) &&
      /user_agent|ip_address/.test(error.message)
    ) {
      let fallbackQuery = supabaseAdmin
        .from("clicks")
        .select(
          "id, click_id, affiliate_id, offer_id, smartlink_id, status, payout, converted_at, created_at, traffic_source, referer, country, device, browser, operating_system, review_status, review_note, reviewed_at, reviewed_by"
        )
        .order("created_at", { ascending: false })
        .limit(200);

      fallbackQuery = applyFilters(
        fallbackQuery,
        search,
        filter
      );

      const fallback = await fallbackQuery;

      // FIX: Keep the result type consistent with the main query.
      data = (fallback.data ?? []).map((click) => ({
        ...click,
        user_agent: null,
        ip_address: null,
      })) as typeof data;

      error = fallback.error;
    }

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

// POST: Review a lead OR approve a conversion.
// Review actions update review metadata only.
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
        { success: false, error: "Invalid request body." },
        400
      );
    }

    const clickId =
      typeof body.click_id === "string"
        ? body.click_id.trim()
        : "";

    if (!clickId) {
      return respond(
        { success: false, error: "Click ID is required." },
        400
      );
    }

    if (clickId.length > 200) {
      return respond(
        { success: false, error: "Click ID is too long." },
        400
      );
    }
    // Lead Status: Approved / Hold / Rejected / Pending.
    // This is separate from the existing review_status workflow.
    if (body.action === "lead_status") {
      const leadStatus = String(body.lead_status ?? "")
        .trim()
        .toLowerCase();

      if (
        !["pending", "approved", "hold", "rejected"].includes(
          leadStatus
        )
      ) {
        return respond(
          {
            success: false,
            error: "Invalid lead status.",
          },
          400
        );
      }

      const leadNote =
        typeof body.note === "string"
          ? body.note.trim()
          : "";

      if (leadNote.length > 1000) {
        return respond(
          {
            success: false,
            error: "Lead note must be 1000 characters or fewer.",
          },
          400
        );
      }

      const { data: result, error: rpcError } =
        await supabaseAdmin.rpc("admin_update_lead_status", {
          p_click_id: clickId,
          p_lead_status: leadStatus,
          p_note: leadNote || null,
          p_admin_id: "admin",
        });

      if (rpcError) {
        console.error("Lead status update error:", rpcError);

        return respond(
          {
            success: false,
            error: "Unable to update lead status.",
          },
          500
        );
      }

      return respond({
        success: true,
        message: "Lead status updated successfully.",
        result,
      });
    }
    // Lead review: does not change conversion status or payout.
    if (body.action === "review") {
      const reviewStatus = String(
        body.review_status ?? ""
      )
        .trim()
        .toLowerCase();

      if (
        !REVIEW_STATUSES.includes(
          reviewStatus as (typeof REVIEW_STATUSES)[number]
        )
      ) {
        return respond(
          {
            success: false,
            error: "Invalid lead review status.",
          },
          400
        );
      }

      const reviewNote =
        typeof body.review_note === "string"
          ? body.review_note.trim()
          : "";

      if (reviewNote.length > 1000) {
        return respond(
          {
            success: false,
            error:
              "Review note must be 1000 characters or fewer.",
          },
          400
        );
      }

      const { data: reviewed, error: reviewError } =
        await supabaseAdmin
          .from("clicks")
          .update({
            review_status: reviewStatus,
            review_note: reviewNote || null,
            reviewed_at: new Date().toISOString(),
            reviewed_by: "admin",
          })
          .eq("click_id", clickId)
          .select(
            "click_id, affiliate_id, review_status, review_note, reviewed_at, reviewed_by"
          );

      if (reviewError) {
        console.error("Lead review update error:", reviewError);

        return respond(
          {
            success: false,
            error: "Unable to update lead review.",
          },
          500
        );
      }

      if (!reviewed || reviewed.length !== 1) {
        return respond(
          {
            success: false,
            error: "Lead not found or could not be updated.",
          },
          404
        );
      }

      return respond({
        success: true,
        message: "Lead review saved successfully.",
        lead: reviewed[0],
      });
    }

    // Existing manual conversion approval flow.
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
      payout !== Number(payout.toFixed(2))
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
        .select("click_id, affiliate_id, status, converted_at")
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
        { success: false, error: "Click ID was not found." },
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
        error: "Unable to process the request.",
      },
      500
    );
  }
}
