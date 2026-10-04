```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "islamhanif122@gmail.com";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )
    : null;

/* =========================================
   ADMIN AUTHENTICATION
========================================= */

async function getAdminUser(
  request: NextRequest
) {
  if (!supabaseAdmin) {
    return null;
  }

  const authorization =
    request.headers.get(
      "authorization"
    );

  if (
    !authorization ||
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    return null;
  }

  const accessToken =
    authorization
      .replace("Bearer ", "")
      .trim();

  if (!accessToken) {
    return null;
  }

  const {
    data,
    error,
  } =
    await supabaseAdmin.auth.getUser(
      accessToken
    );

  if (
    error ||
    !data.user
  ) {
    return null;
  }

  const email =
    data.user.email
      ?.trim()
      .toLowerCase();

  if (
    email !==
    ADMIN_EMAIL.toLowerCase()
  ) {
    return null;
  }

  return data.user;
}

/* =========================================
   SAFE STATUS
========================================= */

function normalizeStatus(
  value: unknown
) {
  const status =
    String(
      value || ""
    )
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
      await getAdminUser(
        request
      );

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const searchParams =
      request.nextUrl.searchParams;

    const requestedStatus =
      searchParams.get(
        "status"
      )?.trim()
      .toLowerCase() || "";

    const search =
      searchParams.get(
        "search"
      )?.trim()
      .toLowerCase() || "";

    /*
     * Supabase Auth users are used here
     * because the signup application data
     * is stored in auth metadata.
     */
    const users: any[] = [];

    let page = 1;

    const perPage = 1000;

    while (true) {
      const {
        data,
        error,
      } =
        await supabaseAdmin.auth.admin.listUsers(
          {
            page,
            perPage,
          }
        );

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

      users.push(
        ...pageUsers
      );

      if (
        pageUsers.length <
        perPage
      ) {
        break;
      }

      page += 1;

      /*
       * Safety limit so a corrupted
       * account cannot cause an endless loop.
       */
      if (page > 20) {
        break;
      }
    }

    const affiliates =
      users
        .filter((user) => {
          const metadata =
            user.user_metadata ||
            {};

          const accountType =
            String(
              metadata.account_type ||
                ""
            )
              .trim()
              .toLowerCase();

          return (
            accountType ===
            "affiliate"
          );
        })
        .map((user) => {
          const metadata =
            user.user_metadata ||
            {};

          const status =
            normalizeStatus(
              metadata.application_status
            );

          const firstName =
            String(
              metadata.first_name ||
                ""
            ).trim();

          const lastName =
            String(
              metadata.last_name ||
                ""
            ).trim();

          const fullName =
            [
              firstName,
              lastName,
            ]
              .filter(Boolean)
              .join(" ") ||
            metadata.full_name ||
            metadata.username ||
            user.email ||
            "Affiliate";

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

          return {
            id: user.id,

            affiliateId,

            name: String(
              fullName
            ),

            username:
              metadata.username ||
              null,

            email:
              user.email ||
              null,

            phone:
              metadata.phone ||
              null,

            country:
              metadata.country ||
              null,

            city:
              metadata.city ||
              null,

            trafficSource:
              metadata.traffic_source ||
              null,

            monthlyTraffic:
              metadata.monthly_traffic ||
              null,

            promotionMethod:
              metadata.promotion_method ||
              null,

            experience:
              metadata.experience ||
              null,

            previousNetworks:
              metadata.previous_networks ||
              null,

            companyName:
              metadata.company_name ||
              null,

            paymentMethod:
              metadata.payment_method ||
              null,

            referredBy:
              metadata.referred_by ||
              null,

            status,

            emailConfirmed:
              Boolean(
                user.email_confirmed_at
              ),

            createdAt:
              user.created_at,

            lastSignInAt:
              user.last_sign_in_at ||
              null,
          };
        })
        .filter(
          (affiliate) => {
            if (
              requestedStatus &&
              requestedStatus !==
                "all" &&
              affiliate.status !==
                requestedStatus
            ) {
              return false;
            }

            if (!search) {
              return true;
            }

            const searchable =
              [
                affiliate.name,
                affiliate.email,
                affiliate.username,
                affiliate.affiliateId,
                affiliate.country,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchable.includes(
              search
            );
          }
        )
        .sort(
          (
            a,
            b
          ) =>
            new Date(
              b.createdAt
            ).getTime() -
            new Date(
              a.createdAt
            ).getTime()
        );

    return NextResponse.json(
      {
        success: true,

        affiliates,

        totals: {
          total:
            affiliates.length,

          pending:
            affiliates.filter(
              (a) =>
                a.status ===
                "pending"
            ).length,

          approved:
            affiliates.filter(
              (a) =>
                a.status ===
                "approved"
            ).length,

          rejected:
            affiliates.filter(
              (a) =>
                a.status ===
                "rejected"
            ).length,

          suspended:
            affiliates.filter(
              (a) =>
                a.status ===
                "suspended"
            ).length,

          unknown:
            affiliates.filter(
              (a) =>
                a.status ===
                "unknown"
            ).length,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
          Pragma:
            "no-cache",
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
          "Failed to load affiliates.",
        details:
          error?.message ||
          String(error),
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
      await getAdminUser(
        request
      );

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const body =
      await request.json();

    const userId =
      String(
        body.user_id ||
          body.userId ||
          ""
      ).trim();

    const status =
      normalizeStatus(
        body.status
      );

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
      ![
        "pending",
        "approved",
        "rejected",
        "suspended",
      ].includes(status)
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

    /*
     * First read the existing Auth user.
     */
    const {
      data: userData,
      error: userError,
    } =
      await supabaseAdmin.auth.admin.getUserById(
        userId
      );

    if (
      userError ||
      !userData.user
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Affiliate account was not found.",
        },
        { status: 404 }
      );
    }

    const targetUser =
      userData.user;

    const metadata = {
      ...(targetUser.user_metadata ||
        {}),

      application_status:
        status,
    };

    /*
     * Update Supabase Auth metadata.
     *
     * This is the source of truth for
     * the application status because the
     * signup form stores the application
     * there.
     */
    const {
      data: updatedData,
      error:
        updateAuthError,
    } =
      await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          user_metadata:
            metadata,
        }
      );

    if (
      updateAuthError
    ) {
      console.error(
        "Affiliate status update error:",
        updateAuthError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to update affiliate status.",
          details:
            updateAuthError.message,
        },
        { status: 500 }
      );
    }

    /*
     * Also try to synchronize the
     * profiles table if the project has
     * an application_status column.
     *
     * If that column does not exist,
     * we intentionally ignore that error.
     */
    try {
      await supabaseAdmin
        .from("profiles")
        .update({
          application_status:
            status,
        })
        .eq(
          "id",
          userId
        );
    } catch {
      // Auth metadata remains the source of truth.
    }

    return NextResponse.json(
      {
        success: true,

        message:
          `Affiliate status changed to ${status}.`,

        affiliate: {
          id: userId,

          email:
            updatedData.user
              ?.email ||
            targetUser.email ||
            null,

          status,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
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
          "Failed to update affiliate status.",
        details:
          error?.message ||
          String(error),
      },
      { status: 500 }
    );
  }
}
```
