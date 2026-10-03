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
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (!user) {
    return null;
  }

  if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return null;
  }

  return user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAdminUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin!
      .from("offers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Offers GET error:", error);

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
    console.error("Offers GET exception:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load offers",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAdminUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const advertiser = String(body.advertiser ?? "").trim();
    const offerUrl = String(body.offer_url ?? "").trim();

    const description = String(body.description ?? "").trim();
    const category = String(body.category ?? "").trim();
    const country = String(body.country ?? "Worldwide").trim();
    const device = String(body.device ?? "All").trim();
    const imageUrl = String(body.image_url ?? "").trim();

    const payout = Number(body.payout ?? 0);
    const currency = String(body.currency ?? "USD").trim() || "USD";

    const status =
      String(body.status ?? "active").toLowerCase() === "paused"
        ? "paused"
        : "active";

    if (!name || !advertiser || !offerUrl) {
      return NextResponse.json(
        {
          success: false,
          message: "Offer name, advertiser and offer URL are required.",
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

    try {
      new URL(offerUrl);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid offer URL.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin!
      .from("offers")
      .insert({
        name,
        advertiser,
        offer_url: offerUrl,
        payout,
        currency,
        country,
        category: category || null,
        device: device || "All",
        description: description || null,
        image_url: imageUrl || null,
        status,
      })
      .select()
      .single();

    if (error) {
      console.error("Offers POST error:", error);

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
    console.error("Offers POST exception:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create offer.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAdminUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
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
      updates.name = String(body.name).trim();
    }

    if (body.advertiser !== undefined) {
      updates.advertiser = String(body.advertiser).trim();
    }

    if (body.offer_url !== undefined) {
      const offerUrl = String(body.offer_url).trim();

      try {
        new URL(offerUrl);
      } catch {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid offer URL.",
          },
          { status: 400 }
        );
      }

      updates.offer_url = offerUrl;
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
      updates.currency = String(body.currency).trim() || "USD";
    }

    if (body.country !== undefined) {
      updates.country = String(body.country).trim();
    }

    if (body.category !== undefined) {
      updates.category = String(body.category).trim() || null;
    }

    if (body.device !== undefined) {
      updates.device = String(body.device).trim() || "All";
    }

    if (body.description !== undefined) {
      updates.description = String(body.description).trim() || null;
    }

    if (body.image_url !== undefined) {
      updates.image_url = String(body.image_url).trim() || null;
    }

    if (body.status !== undefined) {
      const status =
        String(body.status).toLowerCase() === "paused"
          ? "paused"
          : "active";

      updates.status = status;
    }

    const { data, error } = await supabaseAdmin!
      .from("offers")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Offers PATCH error:", error);

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
    console.error("Offers PATCH exception:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update offer.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAdminUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
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
      console.error("Offers DELETE error:", error);

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
    });
  } catch (error) {
    console.error("Offers DELETE exception:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete offer.",
      },
      { status: 500 }
    );
  }
                                   }
