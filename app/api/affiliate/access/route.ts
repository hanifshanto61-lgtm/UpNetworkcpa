import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type ApplicationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

function normalizeStatus(value: any): ApplicationStatus {
  const status = String(value || "")
    .trim()
    .toLowerCase();

  if (
    status === "approved" ||
    status === "rejected" ||
    status === "suspended"
  ) {
    return status;
  }

  return "pending";
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

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
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

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "Authentication token is missing.",
        },
        { status: 401 }
      );
    }

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
    } = await supabaseAdmin.auth.getUser(
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

    const accountType = String(
      user.user_metadata?.account_type || ""
    )
      .trim()
      .toLowerCase();

    /*
     * Only affiliate accounts are allowed
     * inside /affiliate.
     */
    if (
      accountType &&
      accountType !== "affiliate"
    ) {
      return NextResponse.json(
        {
          allowed: false,
          status: "rejected",
          code: "NOT_AFFILIATE",
          error:
            "This account is not an affiliate account.",
        },
        { status: 403 }
      );
    }

    /*
     * Approval status is controlled from the
     * Admin Affiliates system through Auth metadata.
     *
     * Default = pending.
     */
    let status = normalizeStatus(
      user.user_metadata?.application_status
    );

    /*
     * Try profiles as a compatibility fallback.
     * Some older accounts may have the status there.
     */
    try {
      const lookupColumns = [
        "id",
        "user_id",
        "auth_id",
      ];

      for (const column of lookupColumns) {
        const result =
          await supabaseAdmin
            .from("profiles")
            .select("application_status")
            .eq(column, user.id)
            .maybeSingle();

        if (
          !result.error &&
          result.data?.application_status
        ) {
          status = normalizeStatus(
            result.data.application_status
          );
          break;
        }
      }
    } catch (error) {
      console.warn(
        "Affiliate profile status lookup failed:",
        error
      );
    }

    if (status === "approved") {
      return NextResponse.json(
        {
          allowed: true,
          status: "approved",
          code: "AFFILIATE_APPROVED",
          user_id: user.id,
          email: user.email || null,
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
    }

    if (status === "rejected") {
      return NextResponse.json(
        {
          allowed: false,
          status: "rejected",
          code: "AFFILIATE_REJECTED",
          error:
            "Your affiliate application has been rejected.",
        },
        {
          status: 403,
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    if (status === "suspended") {
      return NextResponse.json(
        {
          allowed: false,
          status: "suspended",
          code: "AFFILIATE_SUSPENDED",
          error:
            "Your affiliate account has been suspended.",
        },
        {
          status: 403,
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    return NextResponse.json(
      {
        allowed: false,
        status: "pending",
        code: "AFFILIATE_PENDING",
        error:
          "Your affiliate application is waiting for admin approval.",
      },
      {
        status: 403,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error(
      "Affiliate access check error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to verify affiliate account status.",
      },
      { status: 500 }
    );
  }
}
