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
  return `UP${userId.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
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
          error: "First name, last name and username are required.",
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
     * Prevent duplicate Affiliate ID / username.
     */
    const { data: existingProfile, error: existingProfileError } =
      await supabaseAdmin
        .from("affiliate_profiles")
        .select("id, affiliate_id")
        .eq("affiliate_id", username)
        .maybeSingle();

    if (existingProfileError) {
      console.error(
        "Affiliate ID lookup error:",
        existingProfileError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to validate Affiliate ID.",
        },
        { status: 500 }
      );
    }

    if (existingProfile) {
      return NextResponse.json(
        {
          success: false,
          error: "This Affiliate ID is already in use.",
        },
        { status: 409 }
      );
    }

    /*
     * Create Auth user server-side.
     *
     * This intentionally avoids the failing public
     * supabase.auth.signUp() request.
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
          traffic_source: String(body.trafficSource || "").trim(),
          traffic_url: String(body.trafficUrl || "").trim(),
          social_profile: String(body.socialProfile || "").trim(),
          monthly_traffic: String(body.monthlyTraffic || "").trim(),
          promotion_method: String(body.promotionMethod || "").trim(),
          experience: String(body.experience || "").trim(),
          previous_networks: String(body.previousNetworks || "").trim(),
          company_name: String(body.companyName || "").trim(),
          payment_method: String(body.paymentMethod || "").trim(),
          application_status: "pending",
          referred_by: String(body.referralCode || "").trim() || null,
        },
      });

    if (authError || !authData?.user) {
      console.error(
        "Server-side affiliate Auth creation error:",
        authError
      );

      const message = authError?.message || "Unable to create account.";

      return NextResponse.json(
        {
          success: false,
          error: message
            .toLowerCase()
            .includes("already")
            ? "An account with this email already exists."
            : message,
        },
        { status: 400 }
      );
    }

    const user = authData.user;

    /*
     * Use the requested username as Affiliate ID.
     * If for any reason it is empty, generate a safe ID.
     */
    const affiliateId =
      username || makeAffiliateId(user.id);

    /*
     * Create the affiliate profile immediately.
     *
     * Status stays pending until admin approval.
     */
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("affiliate_profiles")
        .insert({
          id: user.id,
          affiliate_id: affiliateId,
          full_name: `${firstName} ${lastName}`.trim(),
          email,
          status: "pending",
          referral_code: affiliateId,
          referral_rate: 5,
        })
        .select("*")
        .maybeSingle();

    /*
     * If profile creation fails, remove the Auth user
     * so we do not leave a broken account behind.
     */
    if (profileError || !profile) {
      console.error(
        "Affiliate profile creation error:",
        profileError
      );

      await supabaseAdmin.auth.admin.deleteUser(user.id);

      return NextResponse.json(
        {
          success: false,
          error:
            profileError?.message ||
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
        error: "Something went wrong while creating your account.",
      },
      { status: 500 }
    );
  }
          }
