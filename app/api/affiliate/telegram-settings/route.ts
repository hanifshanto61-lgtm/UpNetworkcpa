import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

function response(
  data: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}

async function getContext(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authorization =
    request.headers.get("authorization") || "";

  if (!url || !key) {
    return {
      error: "Server configuration missing.",
      status: 503,
    };
  }

  if (!authorization.startsWith("Bearer ")) {
    return {
      error: "Authentication required.",
      status: 401,
    };
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return {
      error: "Authentication required.",
      status: 401,
    };
  }

  const db = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: auth, error: authError } =
    await db.auth.getUser(token);

  if (authError || !auth.user) {
    return {
      error: "Invalid or expired session.",
      status: 401,
    };
  }

  const { data: profile, error: profileError } =
    await db
      .from("profiles")
      .select("application_status")
      .eq("id", auth.user.id)
      .maybeSingle();

  if (profileError) {
    return {
      error: "Unable to verify affiliate status.",
      status: 503,
    };
  }

  const status = String(
    profile?.application_status || ""
  ).toLowerCase();

  if (!["approved", "active"].includes(status)) {
    return {
      error: "An approved affiliate account is required.",
      status: 403,
    };
  }

  return {
    db,
    user: auth.user,
  };
}

export async function GET(request: NextRequest) {
  try {
    const context = await getContext(request);

    if ("error" in context) {
      return response(
        {
          success: false,
          message: context.error,
        },
        context.status
      );
    }

    const { data, error } = await context.db
      .from("affiliate_telegram_settings")
      .select("id, chat_id, enabled, created_at, updated_at")
      .eq("affiliate_user_id", context.user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return response({
      success: true,
      settings: data
        ? {
            id: data.id,
            chat_id: data.chat_id,
            enabled: data.enabled,
            created_at: data.created_at,
            updated_at: data.updated_at,
          }
        : null,
    });
  } catch {
    return response(
      {
        success: false,
        message: "Unable to load Telegram settings.",
      },
      500
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getContext(request);

    if ("error" in context) {
      return response(
        {
          success: false,
          message: context.error,
        },
        context.status
      );
    }

    let body: Record<string, unknown>;

    try {
      const parsed = await request.json();

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        throw new Error("Invalid request body");
      }

      body = parsed as Record<string, unknown>;
    } catch {
      return response(
        {
          success: false,
          message: "Invalid request body.",
        },
        400
      );
    }

    const chatId =
      typeof body.chat_id === "string"
        ? body.chat_id.trim()
        : "";

    if (
      !chatId ||
      chatId.length > 100 ||
      !/^-?\d+$/.test(chatId)
    ) {
      return response(
        {
          success: false,
          message: "Enter a valid Telegram Chat ID.",
        },
        400
      );
    }

    const enabled =
      typeof body.enabled === "boolean"
        ? body.enabled
        : true;

    const { data, error } = await context.db
      .from("affiliate_telegram_settings")
      .upsert(
        {
          affiliate_user_id: context.user.id,
          chat_id: chatId,
          enabled,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "affiliate_user_id",
        }
      )
      .select(
        "id, chat_id, enabled, created_at, updated_at"
      )
      .single();

    if (error) {
      throw error;
    }

    return response(
      {
        success: true,
        message: "Telegram settings saved successfully.",
        settings: data,
      },
      200
    );
  } catch {
    return response(
      {
        success: false,
        message: "Unable to save Telegram settings.",
      },
      500
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = await getContext(request);

    if ("error" in context) {
      return response(
        {
          success: false,
          message: context.error,
        },
        context.status
      );
    }

    const { error } = await context.db
      .from("affiliate_telegram_settings")
      .delete()
      .eq("affiliate_user_id", context.user.id);

    if (error) {
      throw error;
    }

    return response({
      success: true,
      message: "Telegram settings removed.",
    });
  } catch {
    return response(
      {
        success: false,
        message: "Unable to remove Telegram settings.",
      },
      500
    );
  }
}