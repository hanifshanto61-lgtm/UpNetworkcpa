import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "islamhanif122@gmail.com";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function verifyAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: "Missing authorization header",
        },
        { status: 401 }
      ),
    };
  }

  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: "Missing access token",
        },
        { status: 401 }
      ),
    };
  }

  const supabase = getSupabaseAdmin();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    console.error("Admin panel settings auth error:", userError);

    return {
      error: NextResponse.json(
        {
          success: false,
          error: "Invalid or expired authentication token",
        },
        { status: 401 }
      ),
    };
  }

  if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: "Admin access required",
        },
        { status: 403 }
      ),
    };
  }

  return {
    supabase,
    user,
  };
}

/**
 * GET
 * Returns all Affiliate Panel feature settings.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);

    if (auth.error) {
      return auth.error;
    }

    const { supabase } = auth;

    const { data, error } = await supabase
      .from("affiliate_panel_settings")
      .select(
        "id, feature_key, label, description, enabled, display_order, updated_at"
      )
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Panel settings database GET error:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Unable to load affiliate panel feature settings",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        settings: data ?? [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Affiliate panel settings GET exception:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load affiliate panel feature settings",
        details:
          error instanceof Error ? error.message : "Unknown server error",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH
 * Turns an Affiliate Panel feature ON or OFF.
 */
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

    const featureKey = body.feature_key?.trim();

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
        "id, feature_key, label, description, enabled, display_order, updated_at"
      )
      .single();

    if (error) {
      console.error("Panel settings PATCH database error:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Unable to update affiliate panel feature setting",
          details: error.message,
        },
        { status: 500 }
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
    console.error("Affiliate panel settings PATCH exception:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to update affiliate panel feature setting",
        details:
          error instanceof Error ? error.message : "Unknown server error",
      },
      { status: 500 }
    );
  }
