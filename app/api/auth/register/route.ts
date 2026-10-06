import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function makeAffiliateId(userId: string) {
  return `UP${userId
    .replace(/-/g, "")
    .slice(0, 10)
    .toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = getAdminClient();

  if (!supabaseAdmin) {
    return NextResponse.json(
      {
        success: false,
        error: "Supabase server configuration is missing.",
      },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    const password = String(body.password || "");

    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const username = String(body.username || "").trim();

    if (!firstName || !lastName || !username) {
      return NextResponse.json(
        {
          success: false,
          error:
            "First name, last name and username are required.",
        },
        { status: 400 }
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid email address is required.",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must be at least 6 characters.",
        },
        { status: 400 }
      );
    }

    /*
     * IMPORTANT:
     * Do NOT query affiliate_profiles before creating
     * the Auth user.
     *
     * The previous lookup was causing:
     * "Unable to validate Affiliate ID."
     */

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,

        user_metadata: {
          account_type: "affiliate",

          first_name: firstName,
          last_name: lastName,
          username,

          phone: String(body.phone || "").trim(),
          country: String(body.country || "").trim(),
          city: String(body.city || "").trim(),
          address: String(body.address || "").trim(),

          traffic_source: String(
            body.trafficSource || ""
          ).trim(),

          traffic_url: String(
            body.trafficUrl || ""
          ).trim(),

          social_profile: String(
            body.socialProfile || ""
          ).trim(),

          monthly_traffic: String(
            body.monthlyTraffic || ""
          ).trim(),

          promotion_method: String(
            body.promotionMethod || ""
          ).trim(),

          experience: String(
            body.experience || ""
          ).trim(),

          previous_networks: String(
            body.previousNetworks || ""
          ).trim(),

          company_name: String(
            body.companyName || ""
          ).trim(),

          payment_method: String(
            body.paymentMethod || ""
          ).trim(),

          application_status: "pending",

          referred_by:
            String(body.referralCode || "").trim() ||
            null,
        },
      });

    /*
     * Auth user creation failed.
     */
    if (authError || !authData?.user) {
      console.error(
        "Server-side affiliate Auth creation error:",
        authError
      );

      const errorMessage =
        authError?.message ||
        "Unable to create account.";

      const lowerMessage =
        errorMessage.toLowerCase();

      if (
        lowerMessage.includes("already") ||
        lowerMessage.includes("exists") ||
        lowerMessage.includes("duplicate")
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "An account with this email already exists.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 400 }
      );
    }

    const user = authData.user;

    /*
     * The username entered during signup becomes
     * the Affiliate ID.
     */
    const affiliateId =
      username || makeAffiliateId(user.id);

    /*
     * Create affiliate profile.
     */
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("affiliate_profiles")
        .insert({
          id: user.id,
          affiliate_id: affiliateId,
          full_name:
            `${firstName} ${lastName}`.trim(),
          email,
          status: "pending",
          referral_code: affiliateId,
          referral_rate: 5,
        })
        .select("*")
        .maybeSingle();

    /*
     * Profile creation failed.
     *
     * Remove the Auth user so we don't leave
     * an incomplete account in Supabase.
     */
    if (profileError || !profile) {
      console.error(
        "Affiliate profile creation error:",
        profileError
      );

      const profileErrorMessage =
        profileError?.message ||
        "Affiliate profile could not be created.";

      const lowerProfileError =
        profileErrorMessage.toLowerCase();

      await supabaseAdmin.auth.admin.deleteUser(
        user.id
      );

      /*
       * Duplicate Affiliate ID.
       */
      if (
        lowerProfileError.includes("duplicate") ||
        lowerProfileError.includes("unique")
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "This Affiliate ID is already in use. Please choose another Affiliate ID.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error:
            "Affiliate profile could not be created. Registration was rolled back.",
        },
        { status: 500 }
      );
    }

    /*
     * Registration completed successfully.
     */
    return NextResponse.json(
      {
        success: true,

        message:
          "Affiliate registration completed successfully. Your application is pending admin approval.",

        affiliate: {
          id: user.id,
          affiliate_id: affiliateId,
          email,
          status: "pending",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Affiliate registration API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong while creating your account.",
      },
      { status: 500 }
    );
  }
}
