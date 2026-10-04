import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type ApplicationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

function normalizeStatus(value: unknown): ApplicationStatus {
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
          error:
            "Authentication token is missing.",
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

    /*
     * Only affiliate accounts are allowed
     * inside /affiliate.
     */
    const accountType = String(
      user.user_metadata?.account_type || ""
    )
      .trim()
      .toLowerCase();

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
     * Affiliate approval status is controlled
     * through Supabase Auth user metadata.
     *
     * Default status = pending.
     */
    const status = normalizeStatus(
      user.user_metadata?.application_status
    );

    /*
     * APPROVED
     */
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

    /*
     * REJECTED
     */
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

    /*
     * SUSPENDED
     */
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

    /*
     * PENDING
     */
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
