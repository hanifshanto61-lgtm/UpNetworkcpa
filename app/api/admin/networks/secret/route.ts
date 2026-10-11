import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const ADMIN_EMAIL = "islamhanif122@gmail.com";

function reply(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store, no-cache, max-age=0",
      },
    }
  );
}

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase configuration missing");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function authorize(request: NextRequest) {
  const header =
    request.headers.get("authorization") || "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  const token = header.slice(7).trim();

  if (!token) {
    return null;
  }

  const client = getClient();

  const { data, error } =
    await client.auth.getUser(token);

  if (
    error ||
    !data.user ||
    data.user.email?.toLowerCase() !==
      ADMIN_EMAIL.toLowerCase()
  ) {
    return null;
  }

  return client;
}

// FIXED: Correct UUID validation.
// UUID format: 8-4-4-4-12
function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

// GET: Admin-only network secret retrieval.
export async function GET(request: NextRequest) {
  try {
    const client = await authorize(request);

    if (!client) {
      return reply("Unauthorized", 401);
    }

    const networkId = (
      request.nextUrl.searchParams.get("network_id") ||
      ""
    ).trim();

    if (!validUuid(networkId)) {
      return reply("Invalid network ID", 400);
    }

    const { data, error } = await client
      .from("cpa_networks")
      .select("id,name,postback_secret")
      .eq("id", networkId)
      .maybeSingle();

    if (error) {
      console.error(
        "Network secret lookup error:",
        error.message
      );

      return reply(
        "Unable to load network secret",
        500
      );
    }

    if (!data) {
      return reply("Network not found", 404);
    }

    return NextResponse.json(
      {
        success: true,
        network_id: data.id,
        network_name: data.name,
        postback_secret: data.postback_secret,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "private, no-store, no-cache, max-age=0",
          Pragma: "no-cache",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  } catch (error) {
    console.error(
      "Network secret GET error:",
      error
    );

    return reply("Internal server error", 500);
  }
}

// POST: Admin-only network secret rotation.
export async function POST(request: NextRequest) {
  try {
    const client = await authorize(request);

    if (!client) {
      return reply("Unauthorized", 401);
    }

    const body = await request.json();

    const networkId = String(
      body?.network_id || ""
    ).trim();

    if (!validUuid(networkId)) {
      return reply("Invalid network ID", 400);
    }

    if (body?.confirm !== true) {
      return reply(
        "Secret rotation requires confirmation",
        400
      );
    }

    const newSecret = randomBytes(32).toString("hex");

    const { data, error } = await client
      .from("cpa_networks")
      .update({
        postback_secret: newSecret,
        updated_at: new Date().toISOString(),
      })
      .eq("id", networkId)
      .select("id,name,postback_secret")
      .maybeSingle();

    if (error) {
      console.error(
        "Network secret rotation error:",
        error.message
      );

      return reply(
        "Unable to rotate network secret",
        500
      );
    }

    if (!data) {
      return reply("Network not found", 404);
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Network secret rotated successfully",
        network_id: data.id,
        network_name: data.name,
        postback_secret: data.postback_secret,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "private, no-store, no-cache, max-age=0",
          Pragma: "no-cache",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  } catch (error) {
    console.error(
      "Network secret POST error:",
      error
    );

    return reply("Internal server error", 500);
  }
}