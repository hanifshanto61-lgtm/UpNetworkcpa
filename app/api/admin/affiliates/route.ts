import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "islamhanif122@gmail.com";

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

/* =========================================
   ADMIN AUTHENTICATION
========================================= */

async function getAdminUser(request: NextRequest) {
  if (!supabaseAdmin) {
    return null;
  }

  const authorization =
    request.headers.get("authorization");

  if (
    !authorization ||
    !authorization.startsWith("Bearer ")
  ) {
    return null;
  }

  const accessToken = authorization
    .replace("Bearer ", "")
    .trim();

  if (!accessToken) {
    return null;
  }

  const {
    data,
    error,
  } = await supabaseAdmin.auth.getUser(
    accessToken
  );

  if (error || !data.user) {
    return null;
  }

  const email =
    data.user.email?.trim().toLowerCase();

  if (
    email !== ADMIN_EMAIL.toLowerCase()
  ) {
    return null;
  }

  return data.user;
}

/* =========================================
   SAFE STATUS
========================================= */

function normalizeStatus(value: unknown) {
  const status = String(value || "")
    .trim()
    .toLowerCase();

  if (
    status === "approved" ||
    status === "rejected" ||
    status === "suspended" ||
    status === "pending"
  ) {
    return status;
  }

  return "unknown";
}

/* =========================================
   AFFILIATE ID
========================================= */

function makeAffiliateId(userId: string) {
  return `UP${userId
    .replace(/-/g, "")
    .slice(0, 10)
    .toUpperCase()}`;
}

/* =========================================
   LOAD AFFILIATE PROFILE
========================================= */

async function getAffiliateProfile(
  userId: string
) {
  if (!supabaseAdmin) {
    return null;
  }

  try {
    const {
      data,
      error,
    } = await supabaseAdmin
      .from("affiliate_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error(
        "Affiliate profile lookup error:",
        error
      );

      return null;
    }

    return data || null;
  } catch (error) {
    console.error(
      "Affiliate profile lookup exception:",
      error
    );

    return null;
  }
}

/* =========================================
   GET AFFILIATES
========================================= */

export async function GET(
  request: NextRequest
) {
  try {
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

    const admin =
      await getAdminUser(request);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const searchParams =
      request.nextUrl.searchParams;

    const requestedStatus =
      searchParams
        .get("status")
        ?.trim()
        .toLowerCase() || "";

    const search =
      searchParams
        .get("search")
        ?.trim()
        .toLowerCase() || "";

    /* -----------------------------------------
       LOAD ALL AUTH USERS
    ----------------------------------------- */

    const users: any[] = [];

    let page = 1;
    const perPage = 1000;

    while (true) {
      const {
        data,
        error,
      } =
        await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage,
        });

      if (error) {
        console.error(
          "Admin list users error:",
          error
        );

        return NextResponse.json(
          {
            success: false,
            message:
              "Unable to load affiliates.",
            details:
              error.message,
          },
          { status: 500 }
        );
      }

      const pageUsers =
        data?.users || [];

      users.push(...pageUsers);

      if (
        pageUsers.length < perPage
      ) {
        break;
      }

      page += 1;

      if (page > 20) {
        break;
      }
    }

    /* -----------------------------------------
       LOAD AFFILIATE PROFILES
    ----------------------------------------- */

    let profileRows: any[] = [];

    try {
      const {
        data,
        error,
      } =
        await supabaseAdmin
          .from("affiliate_profiles")
          .select("*");

      if (!error) {
        profileRows =
          data || [];
      } else {
        console.error(
          "Affiliate profiles query error:",
          error
        );
      }
    } catch (error) {
      console.error(
        "Affiliate profiles query exception:",
        error
      );
    }

    const profileMap =
      new Map<string, any>();

    for (
      const profile of profileRows
    ) {
      if (profile?.id) {
        profileMap.set(
          String(profile.id),
          profile
        );
      }
    }

    /* -----------------------------------------
       FIND AFFILIATES
    ----------------------------------------- */

    const affiliates = users
      .filter((user) => {
        const metadata =
          user.user_metadata || {};

        const profile =
          profileMap.get(
            String(user.id)
          );

        const accountType =
          String(
            metadata.account_type ||
              profile?.account_type ||
              ""
          )
            .trim()
            .toLowerCase();

        /*
         * Primary rule:
         *
         * Auth metadata says affiliate
         * OR
         * affiliate_profiles contains this user.
         *
         * This fixes the situation where the
         * profile exists but Auth metadata is
         * incomplete.
         */

        return (
          accountType === "affiliate" ||
          Boolean(profile)
        );
      })
      .map((user) => {
        const metadata =
          user.user_metadata || {};

        const profile =
          profileMap.get(
            String(user.id)
          ) || {};

        /* -------------------------------------
           NAME
        ------------------------------------- */

        const firstName =
          String(
            metadata.first_name ||
              profile.first_name ||
              ""
          ).trim();

        const lastName =
          String(
            metadata.last_name ||
              profile.last_name ||
              ""
          ).trim();

        const fullName =
          [
            firstName,
            lastName,
          ]
            .filter(Boolean)
            .join(" ") ||
          String(
            profile.full_name ||
              metadata.full_name ||
              metadata.username ||
              user.email ||
              "Affiliate"
          ).trim();

        /* -------------------------------------
           AFFILIATE ID
        ------------------------------------- */

        const affiliateId =
          String(
            profile.affiliate_id ||
              metadata.affiliate_id ||
              metadata.affiliateId ||
              metadata.username ||
              makeAffiliateId(
                user.id
              )
          ).trim();

        /* -------------------------------------
           STATUS
        ------------------------------------- */

        const metadataStatus =
          normalizeStatus(
            metadata.application_status
          );

        const profileStatus =
          normalizeStatus(
            profile.status
          );

        let status =
          profileStatus !== "unknown"
            ? profileStatus
            : metadataStatus;

        if (
          status === "unknown"
        ) {
          status = "pending";
        }

        /* -------------------------------------
           RETURN AFFILIATE
        ------------------------------------- */

        return {
          id: user.id,

          affiliate_id:
            affiliateId,

          name:
            fullName,

          first_name:
            firstName,

          last_name:
            lastName,

          email:
            user.email ||
            profile.email ||
            "",

          phone:
            profile.phone ||
            metadata.phone ||
            metadata.phone_number ||
            "",

          country:
            profile.country ||
            metadata.country ||
            "",

          city:
            profile.city ||
            metadata.city ||
            "",

          address:
            profile.address ||
            metadata.address ||
            "",

          traffic_source:
            profile.traffic_source ||
            metadata.traffic_source ||
            "",

          traffic_url:
            profile.traffic_url ||
            metadata.traffic_url ||
            "",

          social_profile:
            profile.social_profile ||
            metadata.social_profile ||
            "",

          monthly_traffic:
            profile.monthly_traffic ||
            metadata.monthly_traffic ||
            "",

          promotion_method:
            profile.promotion_method ||
            metadata.promotion_method ||
            "",

          experience:
            profile.experience ||
            metadata.experience ||
            "",

          previous_networks:
            profile.previous_networks ||
            metadata.previous_networks ||
            "",

          company_name:
            profile.company_name ||
            metadata.company_name ||
            "",

          payment_method:
            profile.payment_method ||
            metadata.payment_method ||
            "",

          referred_by:
            profile.referred_by ||
            metadata.referred_by ||
            "",

          referral_code:
            profile.referral_code ||
            metadata.referral_code ||
            affiliateId,

          referral_rate:
            Number(
              profile.referral_rate ??
                metadata.referral_rate ??
                5
            ),

          application_status:
            status,

          created_at:
            user.created_at ||
            profile.created_at ||
            null,

          updated_at:
            profile.updated_at ||
            null,

          last_sign_in_at:
            user.last_sign_in_at ||
            null,

          email_confirmed:
            Boolean(
              user.email_confirmed_at
            ),

          email_confirmed_at:
            user.email_confirmed_at ||
            null,
        };
      })
      .filter((affiliate) => {
        if (
          requestedStatus &&
          requestedStatus !== "all"
        ) {
          if (
            affiliate.application_status !==
            requestedStatus
          ) {
            return false;
          }
        }

        if (!search) {
          return true;
        }

        const searchable = [
          affiliate.affiliate_id,
          affiliate.name,
          affiliate.email,
          affiliate.phone,
          affiliate.country,
          affiliate.city,
          affiliate.company_name,
        ]
          .join(" ")
          .toLowerCase();

        return searchable.includes(
          search
        );
      })
      .sort((a, b) => {
        const aTime =
          a.created_at
            ? new Date(
                a.created_at
              ).getTime()
            : 0;

        const bTime =
          b.created_at
            ? new Date(
                b.created_at
              ).getTime()
            : 0;

        return bTime - aTime;
      });

    /* -----------------------------------------
       TOTALS
    ----------------------------------------- */

    const totals = {
      total: affiliates.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      suspended: 0,
      unknown: 0,
    };

    for (
      const affiliate of affiliates
    ) {
      const status =
        normalizeStatus(
          affiliate.application_status
        );

      if (
        status in totals
      ) {
        totals[
          status as keyof typeof totals
        ] += 1;
      }
    }

    return NextResponse.json(
      {
        success: true,

        affiliates,

        totals,
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
  } catch (error: any) {
    console.error(
      "Admin affiliates GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unexpected server error.",
        details:
          error?.message ||
          "Unknown error.",
      },
      { status: 500 }
    );
  }
}

/* =========================================
   UPDATE AFFILIATE STATUS
========================================= */

export async function PATCH(
  request: NextRequest
) {
  try {
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

    const admin =
      await getAdminUser(request);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    let body: any;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid JSON body.",
        },
        { status: 400 }
      );
    }

    const userId =
      typeof body?.user_id === "string"
        ? body.user_id.trim()
        : "";

    const requestedStatus =
      typeof body?.status === "string"
        ? body.status
            .trim()
            .toLowerCase()
        : "";

    const allowedStatuses = [
      "pending",
      "approved",
      "rejected",
      "suspended",
    ];

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Affiliate user ID is required.",
        },
        { status: 400 }
      );
    }

    if (
      !allowedStatuses.includes(
        requestedStatus
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid affiliate status.",
        },
        { status: 400 }
      );
    }

    /* -----------------------------------------
       LOAD USER
    ----------------------------------------- */

    const {
      data: userData,
      error: getUserError,
    } =
      await supabaseAdmin.auth.admin.getUserById(
        userId
      );

    if (
      getUserError ||
      !userData?.user
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Affiliate account not found.",
        },
        { status: 404 }
      );
    }

    const currentUser =
      userData.user;

    const currentMetadata =
      currentUser.user_metadata || {};

    const currentProfile =
      await getAffiliateProfile(
        userId
      );

    const accountType =
      String(
        currentMetadata.account_type ||
          currentProfile?.account_type ||
          ""
      )
        .trim()
        .toLowerCase();

    if (
      accountType !== "affiliate" &&
      !currentProfile
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Selected user is not an affiliate.",
        },
        { status: 400 }
      );
    }

    /* -----------------------------------------
       UPDATE AUTH METADATA
    ----------------------------------------- */

    const updatedMetadata = {
      ...currentMetadata,

      account_type:
        currentMetadata.account_type ||
        "affiliate",

      application_status:
        requestedStatus,

      application_status_updated_at:
        new Date().toISOString(),

      application_status_updated_by:
        admin.id,
    };

    const {
      data: updatedUserData,
      error: updateError,
    } =
      await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          user_metadata:
            updatedMetadata,
        }
      );

    if (
      updateError ||
      !updatedUserData?.user
    ) {
      console.error(
        "Affiliate Auth update error:",
        updateError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to update affiliate status.",
          details:
            updateError?.message ||
            "Unknown error.",
        },
        { status: 500 }
      );
    }

    /* -----------------------------------------
       UPDATE DATABASE PROFILE
    ----------------------------------------- */

    if (currentProfile) {
      try {
        const {
          error: profileUpdateError,
        } =
          await supabaseAdmin
            .from("affiliate_profiles")
            .update({
              status:
                requestedStatus,

              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              userId
            );

        if (
          profileUpdateError
        ) {
          console.error(
            "Affiliate profile status update error:",
            profileUpdateError
          );
        }
      } catch (error) {
        console.error(
          "Affiliate profile update exception:",
          error
        );
      }
    }

    const updatedMetadataResult =
      updatedUserData.user
        .user_metadata || {};

    const affiliateId =
      String(
        currentProfile?.affiliate_id ||
          updatedMetadataResult.affiliate_id ||
          updatedMetadataResult.affiliateId ||
          updatedMetadataResult.username ||
          makeAffiliateId(userId)
      ).trim();

    return NextResponse.json(
      {
        success: true,

        message:
          `Affiliate status changed to ${requestedStatus}.`,

        affiliate: {
          id:
            updatedUserData.user.id,

          affiliate_id:
            affiliateId,

          application_status:
            requestedStatus,
        },
      },
      {
        status: 200,
      }
    );
  } catch (error: any) {
    console.error(
      "Admin affiliates PATCH error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unexpected server error.",
        details:
          error?.message ||
          "Unknown error.",
      },
      { status: 500 }
    );
  }
}
