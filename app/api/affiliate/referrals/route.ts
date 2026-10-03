import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          error: "Supabase server configuration is missing.",
        },
        { status: 500 }
      );
    }

    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    const accessToken = authorization
      .replace("Bearer ", "")
      .trim();

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

    // Verify logged-in user
    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    const user = authData?.user;

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Your login session is invalid or expired.",
        },
        { status: 401 }
      );
    }

    // Find current affiliate profile
    const possibleLookups = [
      { column: "id", value: user.id },
      { column: "user_id", value: user.id },
      { column: "auth_id", value: user.id },
      { column: "email", value: user.email },
    ];

    let profile: Record<string, any> | null = null;

    for (const lookup of possibleLookups) {
      if (!lookup.value) continue;

      const result = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq(lookup.column, lookup.value)
        .maybeSingle();

      if (!result.error && result.data) {
        profile = result.data;
        break;
      }
    }

    const affiliateId = String(
      profile?.affiliate_id ||
        profile?.affiliateId ||
        profile?.affiliate_code ||
        profile?.code ||
        ""
    ).trim();

    if (!affiliateId) {
      return NextResponse.json({
        success: true,
        affiliateId: "",
        referralLink: "",
        referrals: [],
        totalReferrals: 0,
      });
    }

    /*
     * Referrals are read from profiles.referred_by.
     *
     * The referred_by column must exist in the profiles table.
     * We deliberately do not create fake referral records.
     */
    const referralsResult = await supabaseAdmin
      .from("profiles")
      .select(
        "id, affiliate_id, email, full_name, name, username, display_name, created_at"
      )
      .eq("referred_by", affiliateId)
      .order("created_at", {
        ascending: false,
      });

    if (referralsResult.error) {
      console.error(
        "Referral query error:",
        referralsResult.error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Referral database is not configured yet.",
          affiliateId,
          referralLink: "",
          referrals: [],
          totalReferrals: 0,
        },
        { status: 200 }
      );
    }

    const referrals = (referralsResult.data || []).map(
      (referral: any) => ({
        id: referral.id,
        affiliateId:
          referral.affiliate_id || "",
        email:
          referral.email || "",
        name:
          referral.full_name ||
          referral.name ||
          referral.username ||
          referral.display_name ||
          referral.email?.split("@")[0] ||
          "Affiliate",
        joinedAt:
          referral.created_at || null,
      })
    );

    const origin =
      request.headers.get("origin") ||
      request.headers.get("x-forwarded-proto")
        ? `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get("host")}`
        : "";

    const baseUrl =
      origin ||
      `https://${request.headers.get("host") || ""}`;

    const referralLink = `${baseUrl}/signup?ref=${encodeURIComponent(
      affiliateId
    )}`;

    return NextResponse.json(
      {
        success: true,
        affiliateId,
        referralLink,
        referrals,
        totalReferrals: referrals.length,
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
      "Affiliate referrals API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Could not load referrals.",
      },
      { status: 500 }
    );
  }
      }
