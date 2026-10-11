import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ADMIN_EMAIL = "islamhanif122@gmail.com";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase server configuration is missing.");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function authorize(request: NextRequest) {
  const client = getAdminClient();

  const header = request.headers.get("authorization");

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  const token = header.slice(7).trim();

  if (!token) return null;

  const { data, error } = await client.auth.getUser(token);

  if (error || !data.user) return null;

  if (
    data.user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
  ) {
    return null;
  }

  return client;
}

function respond(
  success: boolean,
  message: string,
  status = 200
) {
  return NextResponse.json(
    { success, message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

function validWebsite(value: string) {
  if (!value) return true;

  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function validParameter(value: string) {
  return /^[a-zA-Z][a-zA-Z0-9_]{0,49}$/.test(value);
}

// GET: List networks without exposing secrets
export async function GET(request: NextRequest) {
  try {
    const client = await authorize(request);

    if (!client) {
      return respond(false, "Unauthorized", 401);
    }

    const { data, error } = await client
      .from("cpa_networks")
      .select(
        "id,name,website_url,click_id_parameter,status,created_at,updated_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Networks GET error:", error.message);
      return respond(false, "Failed to load networks", 500);
    }

    return NextResponse.json(
      { success: true, networks: data ?? [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Networks GET exception:", error);
    return respond(false, "Internal server error", 500);
  }
}

// POST: Create a new CPA network
export async function POST(request: NextRequest) {
  try {
    const client = await authorize(request);

    if (!client) {
      return respond(false, "Unauthorized", 401);
    }

    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const website = String(body.website_url ?? "").trim();
    const parameter = String(
      body.click_id_parameter ?? "sub1"
    ).trim();

    if (!name || name.length > 150) {
      return respond(false, "Invalid network name", 400);
    }

    if (!validWebsite(website)) {
      return respond(false, "Invalid website URL", 400);
    }

    if (!validParameter(parameter)) {
      return respond(false, "Invalid Click ID parameter", 400);
    }

    const { data, error } = await client
      .from("cpa_networks")
      .insert({
        name,
        website_url: website || null,
        click_id_parameter: parameter,
        status: "active",
      })
      .select(
        "id,name,website_url,click_id_parameter,status,created_at,updated_at"
      )
      .single();

    if (error) {
      if (error.code === "23505") {
        return respond(false, "Network already exists", 409);
      }

      console.error("Networks POST error:", error.message);
      return respond(false, "Failed to create network", 500);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Network created successfully",
        network: data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Networks POST exception:", error);
    return respond(false, "Internal server error", 500);
  }
}

// PATCH: Update an existing CPA network
export async function PATCH(request: NextRequest) {
  try {
    const client = await authorize(request);

    if (!client) {
      return respond(false, "Unauthorized", 401);
    }

    const body = await request.json();
    const id = String(body.id ?? "").trim();

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ) {
      return respond(false, "Invalid network ID", 400);
    }

    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();

      if (!name || name.length > 150) {
        return respond(false, "Invalid network name", 400);
      }

      updates.name = name;
    }

    if (body.website_url !== undefined) {
      const website = String(body.website_url ?? "").trim();

      if (!validWebsite(website)) {
        return respond(false, "Invalid website URL", 400);
      }

      updates.website_url = website || null;
    }

    if (body.click_id_parameter !== undefined) {
      const parameter = String(
        body.click_id_parameter
      ).trim();

      if (!validParameter(parameter)) {
        return respond(
          false,
          "Invalid Click ID parameter",
          400
        );
      }

      updates.click_id_parameter = parameter;
    }

    if (body.status !== undefined) {
      if (!["active", "paused"].includes(body.status)) {
        return respond(false, "Invalid status", 400);
      }

      updates.status = body.status;
    }

    if (!Object.keys(updates).length) {
      return respond(false, "No changes provided", 400);
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await client
      .from("cpa_networks")
      .update(updates)
      .eq("id", id)
      .select(
        "id,name,website_url,click_id_parameter,status,created_at,updated_at"
      )
      .single();

    if (error) {
      if (error.code === "23505") {
        return respond(false, "Network name already exists", 409);
      }

      console.error("Networks PATCH error:", error.message);
      return respond(false, "Failed to update network", 500);
    }

    return NextResponse.json({
      success: true,
      message: "Network updated successfully",
      network: data,
    });
  } catch (error) {
    console.error("Networks PATCH exception:", error);
    return respond(false, "Internal server error", 500);
  }
}