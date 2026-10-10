
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function errorResponse(
  message: string,
  status: number
) {
  return NextResponse.json(
    { success: false, message },
    { status }
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
        "Supabase server configuration is missing.",
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

    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return errorResponse(
        "Authentication required.",
        401
      );
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return errorResponse(
        "Authentication token is missing.",
        401
      );
    }

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.getUser(token);

    const user = authData?.user;

    if (authError || !user) {
      return errorResponse(
        "Your login session is invalid or expired.",
        401
      );
    }

    // Use the same profiles table as the dashboard.
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "id, affiliate_id, full_name, email, application_status"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Offers profile lookup:",
        profileError
      );

      return errorResponse(
        "Unable to load affiliate profile.",
        500
      );
    }

    if (!profile) {
      return errorResponse(
        "Affiliate profile could not be found.",
        404
      );
    }

    const status = String(
      profile.application_status || ""
    ).trim().toLowerCase();

    if (status !== "approved" && status !== "active") {
      return errorResponse(
        "Your affiliate account is not approved.",
        403
      );
    }

    const affiliateId = String(
      profile.affiliate_id || ""
    ).trim();

    if (!affiliateId) {
      return errorResponse(
        "Affiliate ID is unavailable.",
        400
      );
    }

    const {
      data: offersData,
      error: offersError,
    } = await supabase
      .from("offers")
      .select(
        "id, name, description, category, country, payout, tracking_url, image_url, status, created_at, updated_at"
      )
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (offersError) {
      console.error(
        "Offers database query:",
        offersError
      );

      return errorResponse(
        "Unable to load offers from database.",
        500
      );
    }

    const offers = (offersData || []).map((offer) => ({
      id: offer.id,
      name: offer.name || "Untitled Offer",
      description: offer.description || "",
      advertiser: null,
      category: offer.category || "",
      country: offer.country || "",
      device: null,
      currency: "USD",
      payout: Number(offer.payout || 0),
      tracking_url: offer.tracking_url || "",
      trackingUrl: offer.tracking_url || "",
      offer_url: offer.tracking_url || "",
      image_url: offer.image_url || "",
      imageUrl: offer.image_url || "",
      status: offer.status || "active",
      created_at: offer.created_at || null,
      updated_at: offer.updated_at || null,
    }));

    return NextResponse.json(
      {
        success: true,
        affiliateId,
        profile: {
          affiliate_id: affiliateId,
          full_name: profile.full_name || null,
          email: profile.email || user.email || null,
          status,
        },
        offers,
        totalOffers: offers.length,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error(
      "Affiliate offers API error:",
      error
    );

    return errorResponse(
      "Unable to load available offers.",
      500
    );
  }
}
