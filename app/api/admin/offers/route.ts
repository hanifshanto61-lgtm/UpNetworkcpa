import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "islamhanif122@gmail.com";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey)
    : null;

async function getAdminUser(request: NextRequest) {
  if (!supabaseAdmin) {
    return null;
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const accessToken = authHeader.replace("Bearer ", "").trim();

  if (!accessToken) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (error || !user) {
    return null;
  }

  if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return null;
  }

  return user;
}

function normalizeStatus(value: unknown) {
  return String(value ?? "active").toLowerCase() === "paused"
    ? "paused"
    : "active";
}

function isValidUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * GET
 * Load all offers for admin
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAdminUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin!
      .from("offers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Admin Offers GET error:", error);

      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      offers: data ?? [],
    });
  } catch (error) {
    console.error("Admin Offers GET exception:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load offers.",
      },
      { status: 500 }
    );
  }
}

/**
 * POST
 * Create a new offer
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAdminUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const advertiser = String(body.advertiser ?? "").trim();

    /*
     * Frontend uses offer_url.
     * Database uses tracking_url.
     */
    const offerUrl = String(
      body.offer_url ?? body.tracking_url ?? ""
    ).trim();

    const description = String(body.description ?? "").trim();
    const category = String(body.category ?? "").trim();
    const country = String(body.country ?? "Worldwide").trim();
    const device = String(body.device ?? "All").trim() || "All";
    const imageUrl = String(body.image_url ?? "").trim();

    const payout = Number(body.payout ?? 0);

    const currency =
      String(body.currency ?? "USD").trim().toUpperCase() || "USD";

    const status = normalizeStatus(body.status);

    if (!name || !advertiser || !offerUrl) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Offer name, advertiser and offer URL are required.",
        },
        { status: 400 }
      );
    }

    if (!isValidUrl(offerUrl)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid offer URL.",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(payout) || payout < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid payout.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin!
      .from("offers")
      .insert({
        name,
        advertiser,
        tracking_url: offerUrl,
        payout,
        currency,
        country,
        category: category || null,
        device,
        description: description || null,
        image_url: imageUrl || null,
        status,
      })
      .select()
      .single();

    if (error) {
      console.error("Admin Offers POST error:", error);

      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      offer: data,
    });
  } catch (error) {
    console.error("Admin Offers POST exception:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create offer.",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH
 * Update an existing offer
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAdminUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const id = String(body.id ?? "").trim();

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Offer ID is required.",
        },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            message: "Offer name is required.",
          },
          { status: 400 }
        );
      }

      updates.name = name;
    }

    if (body.advertiser !== undefined) {
      const advertiser = String(body.advertiser).trim();

      if (!advertiser) {
        return NextResponse.json(
          {
            success: false,
            message: "Advertiser is required.",
          },
          { status: 400 }
        );
      }

      updates.advertiser = advertiser;
    }

    /*
     * Frontend may send offer_url.
     * Database column is tracking_url.
     */
    if (
      body.offer_url !== undefined ||
      body.tracking_url !== undefined
    ) {
      const offerUrl = String(
        body.offer_url ?? body.tracking_url ?? ""
      ).trim();

      if (!offerUrl) {
        return NextResponse.json(
          {
            success: false,
            message: "Offer URL is required.",
          },
          { status: 400 }
        );
      }

      if (!isValidUrl(offerUrl)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid offer URL.",
          },
          { status: 400 }
        );
      }

      updates.tracking_url = offerUrl;
    }

    if (body.payout !== undefined) {
      const payout = Number(body.payout);

      if (!Number.isFinite(payout) || payout < 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid payout.",
          },
          { status: 400 }
        );
      }

      updates.payout = payout;
    }

    if (body.currency !== undefined) {
      updates.currency =
        String(body.currency).trim().toUpperCase() || "USD";
    }

    if (body.country !== undefined) {
      updates.country = String(body.country).trim();
    }

    if (body.category !== undefined) {
      updates.category =
        String(body.category).trim() || null;
    }

    if (body.device !== undefined) {
      updates.device =
        String(body.device).trim() || "All";
    }

    if (body.description !== undefined) {
      updates.description =
        String(body.description).trim() || null;
    }

    if (body.image_url !== undefined) {
      const imageUrl = String(body.image_url).trim();

      if (imageUrl && !isValidUrl(imageUrl)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid image URL.",
          },
          { status: 400 }
        );
      }

      updates.image_url = imageUrl || null;
    }

    if (body.status !== undefined) {
      updates.status = normalizeStatus(body.status);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No changes were provided.",
        },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin!
      .from("offers")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Admin Offers PATCH error:", error);

      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      offer: data,
    });
  } catch (error) {
    console.error("Admin Offers PATCH exception:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update offer.",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE
 * Delete an offer
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAdminUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id")?.trim();

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Offer ID is required.",
        },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin!
      .from("offers")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Admin Offers DELETE error:", error);

      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Offer deleted successfully.",
    });
  } catch (error) {
    console.error("Admin Offers DELETE exception:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete offer.",
      },
      { status: 500 }
    );
  }
      }
