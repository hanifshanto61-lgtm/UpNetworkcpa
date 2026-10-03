import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

async function getAffiliate(request: NextRequest) {
  if (!supabaseAdmin) {
    return null;
  }

  const authorization =
    request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const accessToken =
    authorization.replace("Bearer ", "").trim();

  if (!accessToken) {
    return null;
  }

  const {
    data: { user },
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (!user) {
    return null;
  }

  const possibleProfiles = [
    { column: "id", value: user.id },
    { column: "user_id", value: user.id },
    { column: "auth_id", value: user.id },
    { column: "email", value: user.email },
  ];

  for (const item of possibleProfiles) {
    if (!item.value) continue;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, affiliate_id, email, name")
      .eq(item.column, item.value)
      .maybeSingle();

    if (profile) {
      return profile;
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const affiliate = await getAffiliate(request);

    if (!affiliate) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin!
      .from("offers")
      .select(
        "id,name,description,advertiser,payout,currency,country,category,device,offer_url,image_url,status,created_at"
      )
      .eq("status", "active")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Affiliate offers error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      affiliateId: affiliate.affiliate_id,
      offers: data || [],
    });
  } catch (error) {
    console.error(
      "Affiliate offers exception:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load offers.",
      },
      { status: 500 }
    );
  }
}
