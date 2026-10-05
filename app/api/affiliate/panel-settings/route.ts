export const dynamic = "force-dynamic";

{ NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request: NextRequest) {
  try {
    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
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

    if (!authorization) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const token = authorization.replace(
      /^Bearer\s+/i,
      ""
    );

    if (!token) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the logged-in affiliate session.
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    // Confirm that this account belongs to an affiliate.
    const { data: profile } = await supabase
      .from("affiliate_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const accountType =
      user.user_metadata?.account_type;

    if (!profile && accountType !== "affiliate") {
      return NextResponse.json(
        {
          error: "Affiliate account required.",
        },
        { status: 403 }
      );
    }

    // Only expose the fields needed by the Affiliate Panel.
    const { data: settings, error: settingsError } =
      await supabase
        .from("affiliate_panel_settings")
        .select("feature_key, enabled")
        .order("display_order", {
          ascending: true,
        });

    if (settingsError) {
      console.error(
        "Affiliate panel settings error:",
        settingsError
      );

      return NextResponse.json(
        {
          error:
            "Unable to load affiliate panel settings.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        settings: settings || [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Affiliate panel settings route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Internal server error.",
      },
      { status: 500 }
    );
  }
}
