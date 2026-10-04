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

  const authorization = request.headers.get("authorization");

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return null;
  }

  const accessToken = authorization.replace("Bearer ", "").trim();

  if (!accessToken) {
    return null;
  }

  const { data, error } =
    await supabaseAdmin.auth.getUser(accessToken);

  if (error || !data.user) {
    return null;
  }

  const email =
    data.user.email?.trim().toLowerCase();

  if (email !== ADMIN_EMAIL.toLowerCase()) {
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
   GET AFFILIATES
========================================= */

export async function GET(request: NextRequest) {
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

    const admin = await getAdminUser(request);

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

    const users: any[] = [];

    let page = 1;
    const perPage = 1000;

    while (true) {
      const { data, error } =
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
            details: error.message,
          },
          { status: 500 }
        );
      }

      const pageUsers = data?.users || [];

      users.push(...pageUsers);

      if (pageUsers.length < perPage) {
        break;
      }

      page += 1;

      if (page > 20) {
        break;
      }
    }

    const affiliates = users
      .filter((user) => {
        const metadata =
          user.user_metadata || {};

        const accountType =
          String(
            metadata.account_type || ""
          )
            .trim()
            .toLowerCase();

        return accountType === "affiliate";
      })
      .map((user) => {
        const metadata =
          user.user_metadata || {};

        const status = normalizeStatus(
          metadata.application_status
        );

        const firstName =
          String(
            metadata.first_name || ""
          ).trim();

        const lastName =
          String(
            metadata.last_name || ""
          ).trim();

        const fullName =
          [
            firstName,
            lastName,
          ]
            .filter(Boolean)
            .join(" ") ||
          String(
            metadata.full_name ||
              metadata.username ||
              user.email ||
              "Affiliate"
          ).trim();

        const affiliateId =
          String(
            metadata.affiliate_id ||
              metadata.affiliateId ||
              metadata.username ||
              `UP${user.id
                .replace(/-/g, "")
                .slice(0, 10)
                .toUpperCase()}`
          ).trim();

        const affiliate = {
          id: user.id,
          affiliate_id: affiliateId,
          name: fullName,
          first_name: firstName,
          last_name: lastName,
          email: user.email || "",
          phone:
            metadata.phone ||
            metadata.phone_number ||
            "",
          country:
            metadata.country || "",
          city:
            metadata.city || "",
          traffic_source:
            metadata.traffic_source || "",
          monthly_traffic:
            metadata.monthly_traffic || "",
          promotion_method:
            metadata.promotion_method || "",
          experience:
            metadata.experience || "",
          previous_networks:
            metadata.previous_networks || "",
          company_name:
            metadata.company_name || "",
          payment_method:
            metadata.payment_method || "",
          referred_by:
            metadata.referred_by || "",
          application_status: status,
          created_at:
            user.created_at || null,
          last_sign_in_at:
            user.last_sign_in_at || null,
          email_confirmed:
            Boolean(
              user.email_confirmed_at
            ),
        };

        return affiliate;
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

        return searchable.includes(search);
      })
      .sort((a, b) => {
        const aTime = a.created_at
          ? new Date(a.created_at).getTime()
          : 0;

        const bTime = b.created_at
          ? new Date(b.created_at).getTime()
          : 0;

        return bTime - aTime;
      });

    const allAffiliateUsers = users.filter(
      (user) => {
        const metadata =
          user.user_metadata || {};

        return (
          String(
            metadata.account_type || ""
          )
            .trim()
            .toLowerCase() === "affiliate"
        );
      }
    );

    const totals = {
      total: allAffiliateUsers.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      suspended: 0,
      unknown: 0,
    };

    for (const user of allAffiliateUsers) {
      const metadata =
        user.user_metadata || {};

      const status = normalizeStatus(
        metadata.application_status
      );

      if (
        status in totals
      ) {
        totals[
          status as keyof typeof totals
        ] += 1;
      }
    }

    return NextResponse.json({
      success: true,
      affiliates,
      totals,
    });
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
          error?.message || "Unknown error.",
      },
      { status: 500 }
    );
  }
}

/* =========================================
   UPDATE AFFILIATE STATUS
========================================= */

export async function PATCH(request: NextRequest) {
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

    const admin = await getAdminUser(request);

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
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON body.",
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
        ? body.status.trim().toLowerCase()
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

    const accountType =
      String(
        currentMetadata.account_type ||
          ""
      )
        .trim()
        .toLowerCase();

    if (accountType !== "affiliate") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Selected user is not an affiliate.",
        },
        { status: 400 }
      );
    }

    const updatedMetadata = {
      ...currentMetadata,
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
        "Affiliate status update error:",
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

    /*
     * Try to synchronize the profile table
     * when application_status exists there.
     *
     * This does not break the request if the
     * column/table is not available because
     * auth metadata remains the source of truth.
     */
    try {
      await supabaseAdmin
        .from("profiles")
        .update({
          application_status:
            requestedStatus,
        })
        .eq("id", userId);
    } catch (profileError) {
      console.warn(
        "Profile status sync skipped:",
        profileError
      );
    }

    return NextResponse.json({
      success: true,
      message:
        `Affiliate status changed to ${requestedStatus}.`,
      affiliate: {
        id: updatedUserData.user.id,
        affiliate_id:
          String(
            updatedUserData.user
              .user_metadata
              ?.affiliate_id ||
              updatedUserData.user
                .user_metadata
                ?.affiliateId ||
              updatedUserData.user
                .user_metadata
                ?.username ||
              ""
          ),
        application_status:
          requestedStatus,
      },
    });
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
          error?.message || "Unknown error.",
      },
      { status: 500 }
    );
  }
}
