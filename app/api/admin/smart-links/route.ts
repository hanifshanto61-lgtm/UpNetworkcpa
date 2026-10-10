
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "islamhanif122@gmail.com";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase server configuration is missing.");
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function verifyAdmin(request: NextRequest) {
  const header = request.headers.get("authorization") || "";

  if (!header.startsWith("Bearer ")) {
    return false;
  }

  const token = header.slice(7).trim();

  if (!token) {
    return false;
  }

  const supabase = getAdminClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user?.email) {
    return false;
  }

  return user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

function unauthorized() {
  return NextResponse.json(
    {
      success: false,
      message: "Unauthorized admin access.",
    },
    { status: 401 }
  );
}

function serverError(error: unknown) {
  console.error("Admin Smart Links API:", error);

  return NextResponse.json(
    {
      success: false,
      message: "An internal server error occurred.",
    },
    { status: 500 }
  );
}

function validUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;

  try {
    const url = new URL(value);

    return (
      (url.protocol === "https:" ||
        url.protocol === "http:") &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function validShare(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100 &&
    Math.round(value * 100) === value * 100
  );
}

function validSlug(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 100 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}

// GET: List all Smart Links
export async function GET(request: NextRequest) {
  try {
    if (!(await verifyAdmin(request))) {
      return unauthorized();
    }

    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("smart_links")
      .select(
        "id, affiliate_id, name, slug, destination_url, status, is_global, network_share_percent, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Smart Links GET:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Unable to load Smart Links.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      smartLinks: data || [],
    });
  } catch (error) {
    return serverError(error);
  }
}

// POST: Create a Global Smart Link
export async function POST(request: NextRequest) {
  try {
    if (!(await verifyAdmin(request))) {
      return unauthorized();
    }

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const slug =
      typeof body.slug === "string"
        ? body.slug.trim()
        : "";

    const destinationUrl =
      typeof body.destination_url === "string"
        ? body.destination_url.trim()
        : "";

    const share =
      body.network_share_percent === undefined
        ? 30
        : body.network_share_percent;

    if (!name || name.length > 150) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid Smart Link name is required.",
        },
        { status: 400 }
      );
    }

    if (!validSlug(slug)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Slug must use lowercase letters, numbers and hyphens.",
        },
        { status: 400 }
      );
    }

    if (!validUrl(destinationUrl)) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid destination URL is required.",
        },
        { status: 400 }
      );
    }

    if (!validShare(share)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Network commission must be between 0 and 100 with up to two decimal places.",
        },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    const { data: existing, error: checkError } =
      await supabase
        .from("smart_links")
        .select("id")
        .eq("slug", slug)
        .eq("is_global", true)
        .limit(1);

    if (checkError) {
      throw checkError;
    }

    if (existing && existing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "This global Smart Link slug already exists.",
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("smart_links")
      .insert({
        affiliate_id: null,
        is_global: true,
        name,
        slug,
        destination_url: destinationUrl,
        network_share_percent: share,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      console.error("Smart Links POST:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Unable to create Smart Link.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        smartLink: data,
      },
      { status: 201 }
    );
  } catch (error) {
    return serverError(error);
  }
}

// PATCH: Update a Global Smart Link
export async function PATCH(request: NextRequest) {
  try {
    if (!(await verifyAdmin(request))) {
      return unauthorized();
    }

    const body = await request.json();

    const id =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid Smart Link ID is required.",
        },
        { status: 400 }
      );
    }

    const updates: Record<string, string | number> = {};

    if (body.name !== undefined) {
      if (
        typeof body.name !== "string" ||
        !body.name.trim() ||
        body.name.trim().length > 150
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid Smart Link name.",
          },
          { status: 400 }
        );
      }

      updates.name = body.name.trim();
    }

    if (body.destination_url !== undefined) {
      if (!validUrl(body.destination_url)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid destination URL.",
          },
          { status: 400 }
        );
      }

      updates.destination_url =
        body.destination_url.trim();
    }

    if (body.network_share_percent !== undefined) {
      if (!validShare(body.network_share_percent)) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Commission must be between 0 and 100 with up to two decimal places.",
          },
          { status: 400 }
        );
      }

      updates.network_share_percent =
        body.network_share_percent;
    }

    if (body.status !== undefined) {
      if (
        body.status !== "active" &&
        body.status !== "paused"
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Status must be active or paused.",
          },
          { status: 400 }
        );
      }

      updates.status = body.status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No valid changes provided.",
        },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("smart_links")
      .update(updates)
      .eq("id", id)
      .eq("is_global", true)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Smart Links PATCH:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Unable to update Smart Link.",
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          message: "Global Smart Link not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      smartLink: data,
    });
  } catch (error) {
    return serverError(error);
  }
}
