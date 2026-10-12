import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

async function verifyAdmin(request: NextRequest) {
  const session = await getAdminSession(request);

  if (!session) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: "Active admin access required",
        },
        { status: 401 }
      ),
    };
  }

  return {
    supabase: session.client,
  };
}

// GET: Load affiliate panel feature settings.
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);

    if (auth.error) {
      return auth.error;
    }

    const { supabase } = auth;

    const { data, error, count } = await supabase
      .from("affiliate_panel_settings")
      .select(
        `
          id,
          feature_key,
          label,
          description,
          enabled,
          display_order,
          updated_at
        `,
        { count: "exact" }
      )
      .order("display_order", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Admin panel settings GET database error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to load affiliate panel feature settings",
          details: error.message,
          code: error.code,
          count: 0,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        settings: data ?? [],
        count: count ?? data?.length ?? 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Admin panel settings GET exception:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to load affiliate panel feature settings",
        details:
          error instanceof Error
            ? error.message
            : "Unknown server error",
        count: 0,
      },
      { status: 500 }
    );
  }
}

// PATCH: Turn an affiliate panel feature ON or OFF.
export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);

    if (auth.error) {
      return auth.error;
    }

    const { supabase } = auth;

    let body: {
      feature_key?: string;
      enabled?: boolean;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON request body",
        },
        { status: 400 }
      );
    }

    const featureKey =
      typeof body.feature_key === "string"
        ? body.feature_key.trim()
        : "";

    if (!featureKey) {
      return NextResponse.json(
        {
          success: false,
          error: "feature_key is required",
        },
        { status: 400 }
      );
    }

    if (typeof body.enabled !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          error: "enabled must be a boolean",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("affiliate_panel_settings")
      .update({
        enabled: body.enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("feature_key", featureKey)
      .select(
        `
          id,
          feature_key,
          label,
          description,
          enabled,
          display_order,
          updated_at
        `
      )
      .single();

    if (error) {
      console.error(
        "Admin panel settings PATCH database error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to update affiliate panel feature setting",
          details: error.message,
          code: error.code,
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: "Feature setting was not found",
          feature_key: featureKey,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        setting: data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Admin panel settings PATCH exception:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to update affiliate panel feature setting",
        details:
          error instanceof Error
            ? error.message
            : "Unknown server error",
      },
      { status: 500 }
    );
  }
}
