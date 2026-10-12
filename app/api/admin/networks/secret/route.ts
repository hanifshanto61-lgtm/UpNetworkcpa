import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

function reply(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    {
      status,
      headers: {
        "Cache-Control":
          "private, no-store, no-cache, max-age=0",
      },
    }
  );
}

async function authorize(request: NextRequest) {
  const session = await getAdminSession(request);
  return session?.client ?? null;
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

// GET: Read the network postback secret.
export async function GET(request: NextRequest) {
  try {
    const client = await authorize(request);

    if (!client) {
      return reply("Unauthorized", 401);
    }

    const networkId = (
      request.nextUrl.searchParams.get("network_id") || ""
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
    console.error("Network secret GET error:", error);

    return reply("Internal server error", 500);
  }
}

// POST: Rotate the network postback secret.
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
        message: "Network secret rotated successfully",
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
    console.error("Network secret POST error:", error);

    return reply("Internal server error", 500);
  }
}
