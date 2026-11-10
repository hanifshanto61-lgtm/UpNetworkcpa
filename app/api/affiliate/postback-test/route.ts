import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

function reply(
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
  const authorization = request.headers.get("authorization") || "";

  if (!url || !key) {
    return { error: "Server configuration missing.", status: 503 as const };
  }

  if (!authorization.startsWith("Bearer ")) {
    return { error: "Authentication required.", status: 401 as const };
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return { error: "Authentication required.", status: 401 as const };
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
    return { error: "Invalid or expired session.", status: 401 as const };
  }

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("application_status")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (profileError) {
    return { error: "Unable to verify affiliate status.", status: 503 as const };
  }

  const status = String(
    profile?.application_status || ""
  ).toLowerCase();

  if (!["approved", "active"].includes(status)) {
    return {
      error: "An approved affiliate account is required.",
      status: 403 as const,
    };
  }

  return { db, user: auth.user };
}

function replaceTestMacros(template: string) {
  const values: Record<string, string> = {
    clickid: "TEST_CLICK_ID",
    click_id: "TEST_CLICK_ID",
    sum: "0.00",
    payout: "0.00",
    status: "test",
    affiliate_id: "TEST_AFFILIATE",
    offer_id: "TEST_OFFER",
    country: "TEST",
  };

  let result = template;

  for (const [key, value] of Object.entries(values)) {
    const tokens = [
      `{${key}}`,
      `{{${key}}}`,
      `%${key.toUpperCase()}%`,
    ];

    for (const token of tokens) {
      const encodedToken = token
        .replace(/\{/g, "%7B")
        .replace(/\}/g, "%7D");

      const pattern = new RegExp(
        token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
          "|" +
          encodedToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "gi"
      );

      result = result.replace(
        pattern,
        () => encodeURIComponent(value)
      );
    }
  }

  return result;
}

function validExternalHttpsUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();

    if (
      url.protocol !== "https:" ||
      !host ||
      url.username ||
      url.password ||
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host === "metadata.google.internal" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "[::1]" ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      host.startsWith("169.254.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

// Affiliate can view only their own delivery logs.
export async function GET(request: NextRequest) {
  try {
    const context = await getContext(request);

    if ("error" in context) {
      return reply(
        { success: false, message: context.error },
        context.status
      );
    }

    const settingId =
      request.nextUrl.searchParams.get("setting_id");

    let query = context.db
      .from("affiliate_postback_logs")
      .select(
        "id,setting_id,event_type,status,http_status,response_excerpt,created_at"
      )
      .eq("affiliate_user_id", context.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (settingId) {
      query = query.eq("setting_id", settingId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Affiliate postback logs lookup failed:", error.message);
      return reply(
        { success: false, message: "Unable to load delivery logs." },
        500
      );
    }

    return reply({
      success: true,
      logs: data || [],
    });
  } catch {
    return reply(
      { success: false, message: "Unable to load delivery logs." },
      500
    );
  }
}

// Send a test callback without recording a conversion or earnings.
export async function POST(request: NextRequest) {
  try {
    const context = await getContext(request);

    if ("error" in context) {
      return reply(
        { success: false, message: context.error },
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
        throw new Error("Invalid body");
      }

      body = parsed as Record<string, unknown>;
    } catch {
      return reply(
        { success: false, message: "Invalid request body." },
        400
      );
    }

    const settingId =
      typeof body.setting_id === "string"
        ? body.setting_id.trim()
        : "";

    if (!settingId) {
      return reply(
        { success: false, message: "Postback setting ID is required." },
        400
      );
    }

    const { data: setting, error: settingError } =
      await context.db
        .from("affiliate_postback_settings")
        .select("id,postback_url,enabled")
        .eq("id", settingId)
        .eq("affiliate_user_id", context.user.id)
        .maybeSingle();

    if (settingError || !setting) {
      return reply(
        { success: false, message: "Postback setting not found." },
        404
      );
    }

    if (!setting.enabled) {
      return reply(
        { success: false, message: "Enable this postback before testing." },
        400
      );
    }

    const testUrl = replaceTestMacros(
      String(setting.postback_url || "")
    );

    const target = validExternalHttpsUrl(testUrl);

    let logId: string | null = null;

    const { data: log, error: logError } =
      await context.db
        .from("affiliate_postback_logs")
        .insert({
          setting_id: setting.id,
          affiliate_user_id: context.user.id,
          event_type: "test",
          status: "pending",
        })
        .select("id")
        .single();

    if (logError || !log) {
      console.error(
        "Test postback log creation failed:",
        logError?.message
      );

      return reply(
        { success: false, message: "Unable to create test log." },
        500
      );
    }

    logId = String(log.id);

    try {
      if (!target) {
        throw new Error("Invalid or disallowed HTTPS callback URL.");
      }

      const response = await fetch(target.toString(), {
        method: "GET",
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
        headers: {
          "User-Agent": "UpNetworkCPA-Postback-Test/1.0",
          Accept: "*/*",
        },
      });

      const responseText = (
        await response.text()
      ).slice(0, 500);

      const success = response.ok;

      await context.db
        .from("affiliate_postback_logs")
        .update({
          status: success ? "success" : "failed",
          http_status: response.status,
          response_excerpt: responseText,
        })
        .eq("id", logId)
        .eq("affiliate_user_id", context.user.id);

      return reply(
        {
          success,
          message: success
            ? "Test callback delivered. Check your tracker for TEST_CLICK_ID."
            : `Tracker returned HTTP ${response.status}.`,
          http_status: response.status,
          response_excerpt: responseText,
        },
        success ? 200 : 502
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Callback request failed.";

      await context.db
        .from("affiliate_postback_logs")
        .update({
          status: "failed",
          response_excerpt: message.slice(0, 500),
        })
        .eq("id", logId)
        .eq("affiliate_user_id", context.user.id);

      return reply(
        {
          success: false,
          message: "Test callback failed.",
          details: message,
        },
        502
      );
    }
  } catch {
    return reply(
      { success: false, message: "Unable to run test callback." },
      500
    );
  }
}