import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type AnyRecord = Record<string, any>;

function makeAffiliateId(userId: string) {
  return `UP${userId.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

async function findProfile(supabaseAdmin: any, user: any) {
  const lookups = [
    { column: "id", value: user.id },
    { column: "user_id", value: user.id },
    { column: "auth_id", value: user.id },
    { column: "email", value: user.email },
  ];

  for (const lookup of lookups) {
    if (!lookup.value) continue;

    try {
      const result = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq(lookup.column, lookup.value)
        .maybeSingle();

      if (!result.error && result.data) {
        return {
          profile: result.data as AnyRecord,
          lookupColumn: lookup.column,
        };
      }
    } catch (error) {
      console.warn("Profile lookup error:", error);
    }
  }

  return {
    profile: null,
    lookupColumn: null,
  };
}

async function createProfile(
  supabaseAdmin: any,
  user: any,
  affiliateId: string
) {
  const attempts = [
    {
      id: user.id,
      affiliate_id: affiliateId,
    },
    {
      user_id: user.id,
      affiliate_id: affiliateId,
    },
    {
      auth_id: user.id,
      affiliate_id: affiliateId,
    },
  ];

  for (const payload of attempts) {
    try {
      const result = await supabaseAdmin
        .from("profiles")
        .insert(payload)
        .select("*")
        .maybeSingle();

      if (!result.error && result.data) {
        return result.data as AnyRecord;
      }
    } catch (error) {
      console.warn("Profile creation error:", error);
    }
  }

  return null;
}

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

    const {
      data: authData,
      error: authError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken
      );

    const user = authData?.user;

    if (authError || !user) {
      return NextResponse.json(
        {
          error:
            "Your login session is invalid or expired.",
        },
        { status: 401 }
      );
    }

    let profileResult =
      await findProfile(
        supabaseAdmin,
        user
      );

    let profile =
      profileResult.profile;

    let affiliateId = "";

    if (profile) {
      affiliateId =
        profile.affiliate_id ||
        profile.affiliateId ||
        profile.affiliate_code ||
        profile.code ||
        "";
    }

    if (profile && !affiliateId) {
      affiliateId =
        makeAffiliateId(user.id);

      const lookupColumn =
        profileResult.lookupColumn;

      if (lookupColumn) {
        try {
          const updateResult =
            await supabaseAdmin
              .from("profiles")
              .update({
                affiliate_id:
                  affiliateId,
              })
              .eq(
                lookupColumn,
                lookupColumn === "email"
                  ? user.email
                  : user.id
              )
              .select("*")
              .maybeSingle();

          if (
            !updateResult.error &&
            updateResult.data
          ) {
            profile =
              updateResult.data;
          }
        } catch (error) {
          console.warn(
            "Affiliate ID update error:",
            error
          );
        }
      }
    }

    if (!profile) {
      affiliateId =
        makeAffiliateId(user.id);

      const createdProfile =
        await createProfile(
          supabaseAdmin,
          user,
          affiliateId
        );

      if (createdProfile) {
        profile =
          createdProfile;

        affiliateId =
          createdProfile.affiliate_id ||
          createdProfile.affiliateId ||
          affiliateId;
      }
    }

    if (!affiliateId) {
      affiliateId =
        makeAffiliateId(user.id);
    }

    affiliateId =
      String(affiliateId).trim();

    const profileName =
      profile?.full_name ||
      profile?.name ||
      profile?.username ||
      profile?.display_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Affiliate";

    let clicks: AnyRecord[] = [];

    try {
      const clicksResult =
        await supabaseAdmin
          .from("clicks")
          .select(
            "click_id, affiliate_id, smartlink_id, country, device, browser, referer, status, payout, converted_at, created_at"
          )
          .eq(
            "affiliate_id",
            affiliateId
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (!clicksResult.error) {
        clicks =
          clicksResult.data || [];
      }
    } catch (error) {
      console.error(
        "Clicks loading error:",
        error
      );
    }

    return NextResponse.json(
      {
        success: true,

        profile: {
          id: user.id,
          affiliateId,
          email:
            user.email || null,
          name: profileName,
        },

        clicks,

        meta: {
          profileFound:
            Boolean(profile),

          profileLookup:
            profileResult.lookupColumn ||
            "generated",
        },
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
      "Affiliate dashboard error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Affiliate dashboard could not be loaded.",
      },
      { status: 500 }
    );
  }
}
