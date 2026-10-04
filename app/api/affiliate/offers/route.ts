import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type AnyRecord = Record<string, any>;

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

async function getAuthenticatedUser(
  supabaseAdmin: any,
  request: NextRequest
) {
  const authorization =
    request.headers.get("authorization");

  if (
    !authorization ||
    !authorization.startsWith("Bearer ")
  ) {
    return null;
  }

  const accessToken =
    authorization
      .replace("Bearer ", "")
      .trim();

  if (!accessToken) {
    return null;
  }

  const {
    data: authData,
    error: authError,
  } =
    await supabaseAdmin.auth.getUser(
      accessToken
    );

  if (authError || !authData?.user) {
    return null;
  }

  return authData.user;
}

async function getAffiliateProfile(
  supabaseAdmin: any,
  user: any
) {
  try {
    const result =
      await supabaseAdmin
        .from("affiliate_profiles")
        .select(
          "id,affiliate_id,full_name,email,status,referral_code,referral_rate"
        )
        .eq("id", user.id)
        .maybeSingle();

    if (
      !result.error &&
      result.data
    ) {
      return result.data as AnyRecord;
    }

    if (result.error) {
      console.error(
        "Affiliate profile lookup error:",
        result.error
      );
    }
  } catch (error) {
    console.error(
      "Affiliate profile exception:",
      error
    );
  }

  return null;
}

export async function GET(
  request: NextRequest
) {
  try {
    /* ------------------------------------------
       1. SUPABASE CONFIGURATION
    ------------------------------------------ */

    const supabaseAdmin =
      getSupabaseAdmin();

    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Supabase server configuration is missing.",
        },
        { status: 500 }
      );
    }

    /* ------------------------------------------
       2. AUTHENTICATE AFFILIATE
    ------------------------------------------ */

    const user =
      await getAuthenticatedUser(
        supabaseAdmin,
        request
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Affiliate authentication failed.",
        },
        { status: 401 }
      );
    }

    /* ------------------------------------------
       3. LOAD AFFILIATE PROFILE
    ------------------------------------------ */

    const affiliate =
      await getAffiliateProfile(
        supabaseAdmin,
        user
      );

    if (!affiliate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Affiliate profile could not be found.",
          code:
            "AFFILIATE_PROFILE_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    /* ------------------------------------------
       4. CHECK ACCOUNT STATUS
    ------------------------------------------ */

    const accountStatus =
      String(
        affiliate.status || "active"
      )
        .trim()
        .toLowerCase();

    if (
      accountStatus === "suspended" ||
      accountStatus === "rejected"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your affiliate account does not have access to offers.",
          code:
            "AFFILIATE_ACCESS_DENIED",
        },
        { status: 403 }
      );
    }

    /* ------------------------------------------
       5. AFFILIATE ID
    ------------------------------------------ */

    const affiliateId =
      String(
        affiliate.affiliate_id || ""
      ).trim();

    if (!affiliateId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Affiliate ID is unavailable.",
          code:
            "AFFILIATE_ID_UNAVAILABLE",
        },
        { status: 400 }
      );
    }

    /* ------------------------------------------
       6. LOAD ACTIVE OFFERS
    ------------------------------------------ */

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from("offers")
        .select(
          `
            id,
            name,
            description,
            category,
            country,
            payout,
            tracking_url,
            image_url,
            status,
            created_at,
            updated_at
          `
        )
        .eq("status", "active")
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      console.error(
        "Affiliate offers database error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to load offers from database.",
        },
        { status: 500 }
      );
    }

    /* ------------------------------------------
       7. FORMAT OFFERS
    ------------------------------------------ */

    const offers =
      (data || []).map(
        (offer: AnyRecord) => ({
          id: offer.id,

          name:
            offer.name || "Untitled Offer",

          description:
            offer.description || "",

          category:
            offer.category || "",

          country:
            offer.country || "",

          payout:
            Number(
              offer.payout || 0
            ),

          trackingUrl:
            offer.tracking_url || "",

          /*
           * Keep offer_url as an alias so the
           * existing frontend can continue using
           * the same field if it expects it.
           */
          offer_url:
            offer.tracking_url || "",

          imageUrl:
            offer.image_url || "",

          image_url:
            offer.image_url || "",

          status:
            offer.status || "active",

          createdAt:
            offer.created_at || null,

          created_at:
            offer.created_at || null,

          updatedAt:
            offer.updated_at || null,

          updated_at:
            offer.updated_at || null,
        })
      );

    /* ------------------------------------------
       8. FINAL RESPONSE
    ------------------------------------------ */

    return NextResponse.json(
      {
        success: true,

        affiliateId,

        offers,

        totalOffers:
          offers.length,
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",

          Pragma: "no-cache",
        },
      }
    );
  } catch (error) {
    console.error(
      "Affiliate offers exception:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load offers.",
      },
      { status: 500 }
    );
  }
}
