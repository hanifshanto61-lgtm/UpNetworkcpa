import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "Supabase server configuration is missing.",
        },
        { status: 500 }
      );
    }

    // ------------------------------------------
    // GET USER ACCESS TOKEN
    // ------------------------------------------

    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    const accessToken =
      authorization.replace("Bearer ", "").trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "Invalid authentication token.",
        },
        { status: 401 }
      );
    }

    // ------------------------------------------
    // SERVER-ONLY SUPABASE CLIENT
    // ------------------------------------------

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // ------------------------------------------
    // VERIFY AUTHENTICATED USER
    // ------------------------------------------

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(
      accessToken
    );

    if (userError || !user) {
      console.error(
        "User authentication error:",
        userError
      );

      return NextResponse.json(
        {
          error: "Your login session is invalid or expired.",
        },
        { status: 401 }
      );
    }

    // ------------------------------------------
    // LOAD PROFILE
    // ------------------------------------------

    let { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error(
        "Profile loading error:",
        profileError
      );

      return NextResponse.json(
        {
          error:
            "Unable to read the affiliate profile.",
          details: profileError.message,
        },
        { status: 500 }
      );
    }

    // ------------------------------------------
    // CREATE PROFILE IF MISSING
    // ------------------------------------------

    if (!profile) {
      const generatedAffiliateId =
        `UP${user.id
          .replace(/-/g, "")
          .slice(0, 10)
          .toUpperCase()}`;

      const {
        data: createdProfile,
        error: createProfileError,
      } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: user.id,
          affiliate_id: generatedAffiliateId,
        })
        .select("*")
        .maybeSingle();

      if (createProfileError) {
        console.error(
          "Profile creation error:",
          createProfileError
        );

        return NextResponse.json(
          {
            error:
              "Your affiliate profile does not exist and could not be created.",
            details:
              createProfileError.message,
          },
          { status: 500 }
        );
      }

      profile = createdProfile;
    }

    // ------------------------------------------
    // GET AFFILIATE ID
    // ------------------------------------------

    let affiliateId =
      profile?.affiliate_id ||
      profile?.affiliateId ||
      profile?.affiliate_code ||
      profile?.code ||
      "";

    // ------------------------------------------
    // GENERATE AFFILIATE ID IF EMPTY
    // ------------------------------------------

    if (!affiliateId) {
      const generatedAffiliateId =
        `UP${user.id
          .replace(/-/g, "")
          .slice(0, 10)
          .toUpperCase()}`;

      const {
        data: updatedProfile,
        error: updateProfileError,
      } = await supabaseAdmin
        .from("profiles")
        .update({
          affiliate_id: generatedAffiliateId,
        })
        .eq("id", user.id)
        .select("*")
        .maybeSingle();

      if (updateProfileError) {
        console.error(
          "Affiliate ID update error:",
          updateProfileError
        );

        return NextResponse.json(
          {
            error:
              "Affiliate ID could not be created.",
            details:
              updateProfileError.message,
          },
          { status: 500 }
        );
      }

      profile =
        updatedProfile || profile;

      affiliateId = generatedAffiliateId;
    }

    affiliateId =
      String(affiliateId).trim();

    if (!affiliateId) {
      return NextResponse.json(
        {
          error:
            "Affiliate ID is unavailable.",
        },
        { status: 500 }
      );
    }

    // ------------------------------------------
    // LOAD CLICKS
    // ------------------------------------------

    const {
      data: clicks,
      error: clicksError,
    } = await supabaseAdmin
      .from("clicks")
      .select(
        "click_id, affiliate_id, smartlink_id, country, device, browser, referer, status, payout, converted_at, created_at"
      )
      .eq(
        "affiliate_id",
        affiliateId
      )
      .order("created_at", {
        ascending: false,
      });

    if (clicksError) {
      console.error(
        "Clicks loading error:",
        clicksError
      );

      return NextResponse.json(
        {
          error:
            "Unable to load click statistics.",
          details:
            clicksError.message,
        },
        { status: 500 }
      );
    }

    // ------------------------------------------
    // PROFILE NAME
    // ------------------------------------------

    const affiliateName =
      profile?.full_name ||
      profile?.name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Affiliate";

    // ------------------------------------------
    // RESPONSE
    // ------------------------------------------

    return NextResponse.json({
      success: true,

      profile: {
        id: user.id,
        affiliateId,
        email: user.email || null,
        name: affiliateName,
      },

      clicks: clicks || [],
    });
  } catch (error: any) {
    console.error(
      "Affiliate dashboard API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Internal server error.",
      },
      { status: 500 }
    );
  }
}
