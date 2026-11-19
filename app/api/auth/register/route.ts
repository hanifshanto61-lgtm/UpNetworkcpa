import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !anonKey || !serviceKey) {
      return NextResponse.json(
        { success: false, error: "Supabase configuration missing." },
        { status: 500 }
      );
    }

    const body = await request.json();

    const firstName = clean(body.firstName);
    const lastName = clean(body.lastName);
    const username = clean(body.username);
    const email = clean(body.email).toLowerCase();
    const password = body.password;

    const rawTelegram = clean(body.telegramId);
    const telegramId = rawTelegram.replace(/^@/, "");

    if (!firstName || !lastName || !username || !telegramId) {
      return NextResponse.json(
        {
          success: false,
          error: "Name, username and Telegram ID are required.",
        },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_-]{3,40}$/.test(username)) {
      return NextResponse.json(
        { success: false, error: "Invalid username format." },
        { status: 400 }
      );
    }

    if (!/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(telegramId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Enter a valid Telegram username (5–32 characters).",
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

    const supabaseAdmin = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const supabasePublic = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check permanently blocked emails.
    const { data: blockedEmail, error: blockError } =
      await supabaseAdmin
        .from("affiliate_email_blocklist")
        .select("id")
        .eq("email", email)
        .maybeSingle();

    if (blockError) {
      console.error("Email blocklist error:", blockError);
      return NextResponse.json(
        { success: false, error: "Unable to verify email eligibility." },
        { status: 500 }
      );
    }

    if (blockedEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "This email address is not eligible for registration.",
        },
        { status: 403 }
      );
    }

    // Check username availability.
    const { data: existing, error: lookupError } =
      await supabaseAdmin
        .from("profiles")
        .select("id")
        .or(`username.eq.${username},affiliate_id.eq.${username}`)
        .limit(1);

    if (lookupError) {
      console.error("Username lookup error:", lookupError);
      return NextResponse.json(
        { success: false, error: "Unable to validate username." },
        { status: 500 }
      );
    }

    if (existing?.length) {
      return NextResponse.json(
        { success: false, error: "Username is already in use." },
        { status: 409 }
      );
    }

    const fullName = `${firstName} ${lastName}`.trim();

    // IMPORTANT: signUp sends the Supabase verification email.
    // Do not set email_confirm to true.
    const { data: authData, error: authError } =
      await supabasePublic.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: new URL("/login?verified=1", request.url).toString(),
          data: {
            account_type: "affiliate",
            first_name: firstName,
            last_name: lastName,
            full_name: fullName,
            username,
            affiliate_id: username,
            application_status: "pending",
            referred_by: clean(body.referralCode) || null,
          },
        },
      });

    if (authError || !authData.user) {
      console.error("Signup Auth error:", authError);

      const duplicate = /already|registered|exists/i.test(
        authError?.message || ""
      );

      return NextResponse.json(
        {
          success: false,
          error: duplicate
            ? "An account with this email already exists. Please log in."
            : authError?.message || "Unable to create account.",
        },
        { status: duplicate ? 409 : 400 }
      );
    }

    const userId = authData.user.id;

    // Always create the affiliate profile as pending.
    const profileData = {
      id: userId,
      affiliate_id: username,
      username,
      email,
      full_name: fullName,
      referred_by: clean(body.referralCode) || null,
      telegram_id: `@${telegramId}`,
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

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert(profileData);

    if (profileError) {
      console.error("Profile insert error:", profileError);

      // Clean up Auth account if profile creation failed.
      await supabaseAdmin.auth.admin.deleteUser(userId);

      return NextResponse.json(
        {
          success: false,
          error: "Unable to save affiliate profile. Please try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Verification email sent. Please verify your email before logging in.",
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
    console.error("Registration exception:", error);

    return NextResponse.json(
      { success: false, error: "Registration failed. Please try again later." },
      { status: 500 }
    );
  }
}