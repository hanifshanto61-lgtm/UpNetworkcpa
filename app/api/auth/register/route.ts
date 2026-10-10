
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

export async function POST(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return NextResponse.json(
        { success: false, error: "Supabase configuration missing." },
        { status: 500 }
      );
    }

    const supabase = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body = await request.json();

    const firstName = clean(body.firstName);
    const lastName = clean(body.lastName);
    const username = clean(body.username);
    const email = clean(body.email).toLowerCase();
    const password = body.password;

    if (!firstName || !lastName || !username) {
      return NextResponse.json(
        { success: false, error: "Name and username are required." },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_-]{3,40}$/.test(username)) {
      return NextResponse.json(
        {
          success: false,
          error: "Username must be 3–40 characters using letters, numbers, _ or -.",
        },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const { data: existing, error: lookupError } = await supabase
      .from("profiles")
      .select("id")
      .or(`username.eq.${username},affiliate_id.eq.${username}`)
      .limit(1);

    if (lookupError) {
      console.error("Registration profile lookup:", lookupError);
      return NextResponse.json(
        { success: false, error: "Unable to validate username." },
        { status: 500 }
      );
    }

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { success: false, error: "Username is already in use." },
        { status: 409 }
      );
    }

    const fullName = `${firstName} ${lastName}`.trim();

    const profileData = {
      affiliate_id: username,
      username,
      email,
      full_name: fullName,
      referred_by: clean(body.referralCode) || null,
      phone: clean(body.phone),
      country: clean(body.country),
      city: clean(body.city),
      address: clean(body.address),
      traffic_source: clean(body.trafficSource),
      traffic_url: clean(body.trafficUrl),
      social_profile: clean(body.socialProfile),
      monthly_traffic: clean(body.monthlyTraffic),
      promotion_method: clean(body.promotionMethod),
      experience: clean(body.experience),
      previous_networks: clean(body.previousNetworks),
      company_name: clean(body.companyName),
      payment_method: clean(body.paymentMethod),
      application_status: "pending",
    };

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          account_type: "affiliate",
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          username,
          affiliate_id: username,
          application_status: "pending",
          referred_by: profileData.referred_by,
        },
      });

    if (authError || !authData.user) {
      console.error("Registration Auth error:", {
        message: authError?.message,
        code: authError?.code,
        status: authError?.status,
      });

      const duplicate =
        /already|duplicate|registered/i.test(authError?.message || "");

      return NextResponse.json(
        {
          success: false,
          error: duplicate
            ? "An account with this email already exists. Please log in."
            : "Supabase Auth could not create the account. Check Auth logs.",
        },
        { status: duplicate ? 409 : 500 }
      );
    }

    const userId = authData.user.id;

    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        ...profileData,
      });

    if (profileError) {
      console.error("Registration profile insert error:", {
        message: profileError.message,
        code: profileError.code,
        details: profileError.details,
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "Auth account was created, but the affiliate profile could not be saved. Contact the administrator; do not register again with the same email.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Registration successful. Your application is pending admin approval.",
        affiliate: {
          id: userId,
          affiliate_id: username,
          email,
          status: "pending",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration exception:", errorMessage(error));

    return NextResponse.json(
      {
        success: false,
        error: "Registration failed. Please try again later.",
      },
      { status: 500 }
    );
  }
}
