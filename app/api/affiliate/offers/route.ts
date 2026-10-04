import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

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

function makeAffiliateId(userId: string) {
  return `UP${userId
    .replace(/-/g, "")
    .slice(0, 10)
    .toUpperCase()}`;
}

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
    data: authData,
    error: authError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  const user = authData?.user;

  if (authError || !user) {
    return null;
  }

  /*
   * Try all common profile relationships.
   * We use select("*") so this route does not depend
   * on a specific profile column such as "name".
   */
  const possibleProfiles = [
    {
      column: "id",
      value: user.id,
    },
    {
      column: "user_id",
      value: user.id,
    },
    {
      column: "auth_id",
      value: user.id,
    },
    {
      column: "email",
      value: user.email,
    },
  ];

  for (const item of possibleProfiles) {
    if (!item.value) {
      continue;
    }

    try {
      const result = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq(item.column, item.value)
        .maybeSingle();

      if (!result.error && result.data) {
        const profile = result.data;

        let affiliateId =
          profile.affiliate_id ||
          profile.affiliateId ||
          profile.affiliate_code ||
          profile.code ||
          "";

        /*
         * If the profile exists but has no affiliate ID,
         * create a stable ID from the Supabase user ID.
         */
        if (!affiliateId) {
          affiliateId = makeAffiliateId(user.id);

          try {
            const updateResult =
              await supabaseAdmin
                .from("profiles")
                .update({
                  affiliate_id: affiliateId,
                })
                .eq(item.column, item.value)
                .select("*")
                .maybeSingle();

            if (
              !updateResult.error &&
              updateResult.data
            ) {
              return {
                ...updateResult.data,
                affiliate_id:
                  updateResult.data.affiliate_id ||
                  affiliateId,
              };
            }
          } catch (error) {
            console.warn(
              "Affiliate ID update error:",
              error
            );
          }
        }

        return {
          ...profile,
          affiliate_id:
            affiliateId ||
            makeAffiliateId(user.id),
        };
      }
    } catch (error) {
      console.warn(
        "Profile lookup error:",
        error
      );
    }
  }

  /*
   * Profile was not found.
   * Try creating one using the available
   * profile key formats.
   *
   * Record<string, string>[] is intentional here.
   * It prevents TypeScript from locking the array
   * to the first object's shape.
   */
  const affiliateId =
    makeAffiliateId(user.id);

  const createAttempts: Record<string, string>[] = [
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

  for (const payload of createAttempts) {
    try {
      const result =
        await supabaseAdmin
          .from("profiles")
          .insert(payload)
          .select("*")
          .maybeSingle();

      if (!result.error && result.data) {
        return {
          ...result.data,
          affiliate_id:
            result.data.affiliate_id ||
            affiliateId,
        };
      }
    } catch (error) {
      console.warn(
        "Profile creation error:",
        error
      );
    }
  }

  return null;
}

export async function GET(
  request: NextRequest
) {
  try {
    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !supabaseAdmin
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Supabase server configuration is missing.",
        },
        { status: 500 }
      );
    }

    /*
     * Authenticate affiliate.
     */
    const affiliate =
      await getAffiliate(request);

    if (!affiliate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Affiliate authentication failed.",
        },
        { status: 401 }
      );
    }

    /*
     * Get affiliate ID.
     */
    const affiliateId =
      String(
        affiliate.affiliate_id ||
          affiliate.affiliateId ||
          ""
      ).trim();

    if (!affiliateId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Affiliate ID is unavailable.",
        },
        { status: 400 }
      );
    }

    /*
     * Only Active Offers are visible
     * to affiliates.
     */
    const {
      data,
      error,
    } = await supabaseAdmin
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
          message:
            "Unable to load offers from database.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        affiliateId,
        offers: data || [],
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
