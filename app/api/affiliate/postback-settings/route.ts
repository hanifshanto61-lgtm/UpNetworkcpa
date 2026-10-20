import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

function response(data: Record<string, unknown>, status = 200) {
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
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: auth, error: authError } = await db.auth.getUser(token);
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

  const status = String(profile?.application_status || "").toLowerCase();
  if (!["approved", "active"].includes(status)) {
    return { error: "An approved affiliate account is required.", status: 403 as const };
  }

  return { db, user: auth.user };
}

function validUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2000) return false;

  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password &&
      url.hostname !== "localhost" &&
      !url.hostname.endsWith(".local")
    );
  } catch {
    return false;
  }
}

function safeSetting(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    tracker: row.tracker,
    postback_url: row.postback_url,
    enabled: row.enabled,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function GET(request: NextRequest) {
  try {
    const context = await getContext(request);
    if ("error" in context) {
      return response({ success: false, message: context.error }, context.status);
    }

    const { data, error } = await context.db
      .from("affiliate_postback_settings")
      .select("id,name,tracker,postback_url,enabled,created_at,updated_at")
      .eq("affiliate_user_id", context.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return response({ success: true, settings: data || [] });
  } catch {
    return response({ success: false, message: "Unable to load settings." }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getContext(request);
    if ("error" in context) {
      return response({ success: false, message: context.error }, context.status);
    }

    let body: Record<string, unknown>;
    try {
      const parsed = await request.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Invalid body");
      }
      body = parsed as Record<string, unknown>;
    } catch {
      return response({ success: false, message: "Invalid request body." }, 400);
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const tracker = typeof body.tracker === "string" ? body.tracker.trim() : "other";
    const postbackUrl = body.postback_url;

    if (
      name.length < 1 ||
      name.length > 100 ||
      tracker.length < 1 ||
      tracker.length > 50 ||
      !validUrl(postbackUrl)
    ) {
      return response({
        success: false,
        message: "Enter a name, tracker, and valid HTTPS postback URL.",
      }, 400);
    }

    const { data, error } = await context.db
      .from("affiliate_postback_settings")
      .insert({
        affiliate_user_id: context.user.id,
        name,
        tracker,
        postback_url: postbackUrl,
        enabled: body.enabled !== false,
      })
      .select("id,name,tracker,postback_url,enabled,created_at,updated_at")
      .single();

    if (error) throw error;
    return response({ success: true, setting: data }, 201);
  } catch {
    return response({ success: false, message: "Unable to save setting." }, 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const context = await getContext(request);
    if ("error" in context) {
      return response({ success: false, message: context.error }, context.status);
    }

    let body: Record<string, unknown>;
    try {
      const parsed = await request.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Invalid body");
      }
      body = parsed as Record<string, unknown>;
    } catch {
      return response({ success: false, message: "Invalid request body." }, 400);
    }

    const id = typeof body.id === "string" ? body.id : "";
    const changes: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name || name.length > 100) {
        return response({ success: false, message: "Invalid name." }, 400);
      }
      changes.name = name;
    }

    if (typeof body.tracker === "string") {
      const tracker = body.tracker.trim();
      if (!tracker || tracker.length > 50) {
        return response({ success: false, message: "Invalid tracker." }, 400);
      }
      changes.tracker = tracker;
    }

    if (body.postback_url !== undefined) {
      if (!validUrl(body.postback_url)) {
        return response({ success: false, message: "Invalid HTTPS URL." }, 400);
      }
      changes.postback_url = body.postback_url;
    }

    if (typeof body.enabled === "boolean") changes.enabled = body.enabled;

    if (!id || Object.keys(changes).length === 1) {
      return response({ success: false, message: "No valid changes supplied." }, 400);
    }

    const { data, error } = await context.db
      .from("affiliate_postback_settings")
      .update(changes)
      .eq("id", id)
      .eq("affiliate_user_id", context.user.id)
      .select("id,name,tracker,postback_url,enabled,created_at,updated_at")
      .maybeSingle();

    if (error) throw error;
    if (!data) return response({ success: false, message: "Setting not found." }, 404);

    return response({ success: true, setting: data });
  } catch {
    return response({ success: false, message: "Unable to update setting." }, 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = await getContext(request);
    if ("error" in context) {
      return response({ success: false, message: context.error }, context.status);
    }

    const id = request.nextUrl.searchParams.get("id") || "";
    if (!id) return response({ success: false, message: "Setting ID required." }, 400);

    const { data, error } = await context.db
      .from("affiliate_postback_settings")
      .delete()
      .eq("id", id)
      .eq("affiliate_user_id", context.user.id)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) return response({ success: false, message: "Setting not found." }, 404);

    return response({ success: true });
  } catch {
    return response({ success: false, message: "Unable to delete setting." }, 500);
  }
}