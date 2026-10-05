import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "islamhanif122@gmail.com";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return null;
  }

  const supabase = getAdminClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user?.email) {
    return null;
  }

  if (user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return null;
  }

  return user;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("affiliate_panel_settings")
      .select(
        "id, feature_key, label, description, enabled, display_order, updated_at"
      )
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Panel settings GET error:", error);

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      settings: data || [],
    });
  } catch (error) {
    console.error("Panel settings GET exception:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load panel settings.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const featureKey =
      typeof body.feature_key === "string"
        ? body.feature_key.trim()
        : "";

    const enabled = body.enabled;

    if (!featureKey) {
      return NextResponse.json(
        {
          success: false,
          error: "feature_key is required.",
        },
        { status: 400 }
      );
    }

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          error: "enabled must be true or false.",
        },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("affiliate_panel_settings")
      .update({
        enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("feature_key", featureKey)
      .select(
        "id, feature_key, label, description, enabled, display_order, updated_at"
      )
      .single();

    if (error) {
      console.error("Panel settings PATCH error:", error);

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      setting: data,
      message: `${featureKey} has been ${
        enabled ? "enabled" : "disabled"
      }.`,
    });
  } catch (error) {
    console.error("Panel settings PATCH exception:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update panel setting.",
      },
      { status: 500 }
    );
  }
}
