import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ApplicationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

function normalizeStatus(value: unknown): ApplicationStatus {
  const status = String(value || "")
    .trim()
    .toLowerCase();

  if (status === "active") return "approved";

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
      console.error(
        "Affiliate access: Supabase configuration missing."
      );

      return NextResponse.json(
        {
          error: "Supabase server configuration is missing.",
        },
        {
          status: 500,
          headers: { "Cache-Control": "no-store" },
        }
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
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
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
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
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
        global: {
          fetch: (url, options = {}) =>
            fetch(url, {
              ...options,
              cache: "no-store",
            }),
        },
      }
    );

    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    const user = authData?.user;

    if (authError || !user) {
      console.warn(
        "Affiliate access: Authentication failed.",
        {
          authError: authError?.message ?? null,
        }
      );

      return NextResponse.json(
        {
          error: "Your login session is invalid or expired.",
        },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id, application_status")
      .eq("id", user.id)
      .maybeSingle();

    // Diagnostic only. Never log access tokens or passwords.
    console.info("Affiliate access diagnostic:", {
      authUserId: user.id,
      profileFound: Boolean(profile),
      applicationStatus:
        profile?.application_status ?? null,
      profileLookupError:
        profileError?.message ?? null,
    });

    if (profileError) {
      console.error(
        "Affiliate profile lookup failed:",
        profileError
      );

      return NextResponse.json(
        {
          allowed: false,
          code: "AFFILIATE_STATUS_UNAVAILABLE",
          error:
            "Unable to verify affiliate account status. Please try again.",
        },
        {
          status: 503,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    if (!profile) {
      return NextResponse.json(
        {
          allowed: false,
          status: "pending",
          code: "AFFILIATE_PROFILE_NOT_FOUND",
          error:
            "Your affiliate profile could not be found. Please contact support.",
        },
        {
          status: 403,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const status = normalizeStatus(
      profile.application_status
    );

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
          headers: { "Cache-Control": "no-store" },
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
          headers: { "Cache-Control": "no-store" },
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
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error(
      "Affiliate access check error:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      {
        error:
          "Unable to verify affiliate account status.",
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}