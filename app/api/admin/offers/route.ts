import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ADMIN_EMAIL = "islamhanif122@gmail.com";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase server configuration missing");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

type Client = ReturnType<typeof adminClient>;

async function authenticate(
  req: NextRequest
): Promise<Client | null> {
  const header = req.headers.get("authorization") || "";

  if (!header.startsWith("Bearer ")) return null;

  const token = header.slice(7).trim();

  if (!token) return null;

  const client = adminClient();

  const { data, error } = await client.auth.getUser(token);

  if (
    error ||
    data.user?.email?.toLowerCase() !== ADMIN_EMAIL
  ) {
    return null;
  }

  return client;
}

function response(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

function validUrl(value: string) {
  try {
    const url = new URL(value);

    return (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function uuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

function payoutValue(value: unknown): number | null {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const n = Number(value);

  if (
    !Number.isFinite(n) ||
    n < 0 ||
    n > 1000000 ||
    !Number.isInteger(Math.round(n * 100)) ||
    Math.abs(n * 100 - Math.round(n * 100)) > 0.000001
  ) {
    return null;
  }

  return n;
}

async function validateNetwork(
  client: Client,
  id: string | null
) {
  if (id === null) return true;

  if (!uuid(id)) return false;

  const { data, error } = await client
    .from("cpa_networks")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  return !error && !!data;
}

function parseNetworkId(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return s || null;
}

function parseStatus(
  value: unknown
): "active" | "paused" | null {
  const s = String(value ?? "").trim().toLowerCase();

  return s === "active" || s === "paused" ? s : null;
}

// GET: Load all offers
export async function GET(request: NextRequest) {
  try {
    const client = await authenticate(request);

    if (!client) {
      return response("Unauthorized", 401);
    }

    const { data, error } = await client
      .from("offers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Offers GET:", error.message);
      return response("Failed to load offers", 500);
    }

    return NextResponse.json(
      {
        success: true,
        offers: data ?? [],
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Offers GET exception:", error);
    return response("Internal server error", 500);
  }
}

// POST: Create an offer
export async function POST(request: NextRequest) {
  try {
    const client = await authenticate(request);

    if (!client) {
      return response("Unauthorized", 401);
    }

    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const advertiser = String(body.advertiser ?? "").trim();

    const trackingUrl = String(
      body.offer_url ?? body.tracking_url ?? ""
    ).trim();

    const payout = payoutValue(body.payout);
    const status = parseStatus(body.status ?? "active");

    const networkId = parseNetworkId(body.network_id);

    const advertiserPayout = payoutValue(
      body.advertiser_payout
    );

    const externalOfferId = String(
      body.external_offer_id ?? ""
    ).trim();

    const imageUrl = String(body.image_url ?? "").trim();

    if (!name || !advertiser || !trackingUrl) {
      return response(
        "Offer name, advertiser and URL are required",
        400
      );
    }

    if (
      !validUrl(trackingUrl) ||
      (imageUrl && !validUrl(imageUrl))
    ) {
      return response("Invalid URL", 400);
    }

    if (payout === null || !status) {
      return response(
        "Invalid affiliate payout or status",
        400
      );
    }

    if (
      body.advertiser_payout !== undefined &&
      body.advertiser_payout !== "" &&
      advertiserPayout === null
    ) {
      return response("Invalid advertiser payout", 400);
    }

    if (
      advertiserPayout !== null &&
      payout > advertiserPayout
    ) {
      return response(
        "Affiliate payout cannot exceed advertiser payout",
        400
      );
    }

    if (!(await validateNetwork(client, networkId))) {
      return response("CPA network not found", 400);
    }

    const { data, error } = await client
      .from("offers")
      .insert({
        name,
        advertiser,
        tracking_url: trackingUrl,
        payout,
        currency:
          String(body.currency ?? "USD")
            .trim()
            .toUpperCase() || "USD",
        country:
          String(body.country ?? "Worldwide").trim() ||
          "Worldwide",
        category:
          String(body.category ?? "").trim() || null,
        device:
          String(body.device ?? "All").trim() || "All",
        description:
          String(body.description ?? "").trim() || null,
        image_url: imageUrl || null,
        status,
        network_id: networkId,
        external_offer_id: externalOfferId || null,
        advertiser_payout: advertiserPayout,
      })
      .select()
      .single();

    if (error) {
      console.error("Offers POST:", error.message);
      return response("Failed to create offer", 500);
    }

    return NextResponse.json(
      { success: true, offer: data },
      { status: 201 }
    );
  } catch (error) {
    console.error("Offers POST exception:", error);
    return response("Internal server error", 500);
  }
}

// PATCH: Update an offer
export async function PATCH(request: NextRequest) {
  try {
    const client = await authenticate(request);

    if (!client) {
      return response("Unauthorized", 401);
    }

    const body = await request.json();
    const id = String(body.id ?? "").trim();

    if (!uuid(id)) {
      return response("Invalid offer ID", 400);
    }

    const updates: Record<string, unknown> = {};

    for (const key of [
      "name",
      "advertiser",
      "country",
      "device",
      "category",
      "description",
      "image_url",
      "external_offer_id",
    ] as const) {
      if (body[key] === undefined) continue;

      const value = String(body[key] ?? "").trim();

      if (
        (key === "name" || key === "advertiser") &&
        !value
      ) {
        return response(`${key} is required`, 400);
      }

      if (
        key === "image_url" &&
        value &&
        !validUrl(value)
      ) {
        return response("Invalid image URL", 400);
      }

      updates[key] =
        value ||
        (["name", "advertiser", "country", "device"].includes(
          key
        )
          ? key === "country"
            ? "Worldwide"
            : key === "device"
            ? "All"
            : ""
          : null);
    }

    if (
      body.offer_url !== undefined ||
      body.tracking_url !== undefined
    ) {
      const url = String(
        body.offer_url ?? body.tracking_url ?? ""
      ).trim();

      if (!validUrl(url)) {
        return response("Invalid offer URL", 400);
      }

      updates.tracking_url = url;
    }

    if (body.payout !== undefined) {
      const value = payoutValue(body.payout);

      if (value === null) {
        return response("Invalid affiliate payout", 400);
      }

      updates.payout = value;
    }

    if (body.advertiser_payout !== undefined) {
      const value = payoutValue(body.advertiser_payout);

      if (
        body.advertiser_payout !== "" &&
        body.advertiser_payout !== null &&
        value === null
      ) {
        return response("Invalid advertiser payout", 400);
      }

      updates.advertiser_payout = value;
    }

    if (body.network_id !== undefined) {
      const networkId = parseNetworkId(body.network_id);

      if (!(await validateNetwork(client, networkId))) {
        return response("CPA network not found", 400);
      }

      updates.network_id = networkId;
    }

    if (body.status !== undefined) {
      const status = parseStatus(body.status);

      if (!status) {
        return response("Invalid status", 400);
      }

      updates.status = status;
    }

    if (body.currency !== undefined) {
      updates.currency =
        String(body.currency ?? "USD")
          .trim()
          .toUpperCase() || "USD";
    }

    if (!Object.keys(updates).length) {
      return response("No changes provided", 400);
    }

    if (
      updates.payout !== undefined ||
      updates.advertiser_payout !== undefined
    ) {
      const { data: current, error: currentError } =
        await client
          .from("offers")
          .select("payout,advertiser_payout")
          .eq("id", id)
          .maybeSingle();

      if (currentError || !current) {
        return response("Offer not found", 404);
      }

      const affiliate = Number(
        updates.payout ?? current.payout
      );

      const advertiser =
        updates.advertiser_payout !== undefined
          ? updates.advertiser_payout
          : current.advertiser_payout;

      if (
        advertiser !== null &&
        affiliate > Number(advertiser)
      ) {
        return response(
          "Affiliate payout cannot exceed advertiser payout",
          400
        );
      }
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await client
      .from("offers")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Offers PATCH:", error.message);
      return response("Failed to update offer", 500);
    }

    return NextResponse.json({
      success: true,
      offer: data,
    });
  } catch (error) {
    console.error("Offers PATCH exception:", error);
    return response("Internal server error", 500);
  }
}

// DELETE: Delete an offer
export async function DELETE(request: NextRequest) {
  try {
    const client = await authenticate(request);

    if (!client) {
      return response("Unauthorized", 401);
    }

    const id =
      request.nextUrl.searchParams.get("id")?.trim() || "";

    if (!uuid(id)) {
      return response("Invalid offer ID", 400);
    }

    const { error } = await client
      .from("offers")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Offers DELETE:", error.message);

      return response(
        "Failed to delete offer. It may have related clicks",
        409
      );
    }

    return NextResponse.json({
      success: true,
      message: "Offer deleted successfully",
    });
  } catch (error) {
    console.error("Offers DELETE exception:", error);
    return response("Internal server error", 500);
  }
}