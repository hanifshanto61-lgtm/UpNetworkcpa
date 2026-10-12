import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const POSTBACK_ENDPOINT =
  "https://upnetworkcpa.com/api/postback/smartlink";

type Setting = {
  smartlink_id: string;
  enabled: boolean;
  click_id_parameter: string;
  postback_secret: string;
};

const SETTING_COLUMNS =
  "smartlink_id,enabled,click_id_parameter,postback_secret";

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

function validId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

function validParameter(value: string) {
  return (
    /^[a-zA-Z][a-zA-Z0-9_]{0,49}$/.test(value) &&
    !["sub2", "offer_id"].includes(value.toLowerCase())
  );
}

function formatSetting(setting: Setting | null) {
  if (!setting) return null;

  const url = new URL(POSTBACK_ENDPOINT);

  url.searchParams.set("sl_id", setting.smartlink_id);
  url.searchParams.set("token", setting.postback_secret);

  return {
    smartlink_id: setting.smartlink_id,
    enabled: setting.enabled,
    click_id_parameter: setting.click_id_parameter,
    postback_url:
      `${url.toString()}` +
      "&click_id={CLICK_ID}&payout={PAYOUT}",
  };
}

async function authorize(request: NextRequest) {
  const session = await getAdminSession(request);
  return session?.client ?? null;
}

// GET: Load Smart Link postback settings.
export async function GET(request: NextRequest) {
  try {
    const client = await authorize(request);

    if (!client) {
      return reply(
        {
          success: false,
          message: "Admin access required.",
        },
        401
      );
    }

    const id = (
      request.nextUrl.searchParams.get("id") || ""
    ).trim();

    if (!validId(id)) {
      return reply(
        {
          success: false,
          message: "Invalid Smart Link ID.",
        },
        400
      );
    }

    const { data: link, error: linkError } = await client
      .from("smart_links")
      .select("id")
      .eq("id", id)
      .eq("is_global", true)
      .maybeSingle();

    if (linkError) throw linkError;

    if (!link) {
      return reply(
        {
          success: false,
          message: "Smart Link not found.",
        },
        404
      );
    }

    const { data, error } = await client
      .from("smartlink_postback_settings")
      .select(SETTING_COLUMNS)
      .eq("smartlink_id", id)
      .maybeSingle();

    if (error) throw error;

    return reply({
      success: true,
      setting: formatSetting(data as Setting | null),
    });
  } catch {
    return reply(
      {
        success: false,
        message: "Unable to load postback settings.",
      },
      500
    );
  }
}

// POST: Save Smart Link postback settings.
export async function POST(request: NextRequest) {
  try {
    const client = await authorize(request);

    if (!client) {
      return reply(
        {
          success: false,
          message: "Admin access required.",
        },
        401
      );
    }

    let body: Record<string, unknown>;

    try {
      const parsed: unknown = await request.json();

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        throw new Error("Invalid body.");
      }

      body = parsed as Record<string, unknown>;
    } catch {
      return reply(
        {
          success: false,
          message: "Invalid request body.",
        },
        400
      );
    }

    const id =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    const parameter =
      typeof body.click_id_parameter === "string"
        ? body.click_id_parameter.trim()
        : "";

    if (
      !validId(id) ||
      typeof body.enabled !== "boolean" ||
      !validParameter(parameter)
    ) {
      return reply(
        {
          success: false,
          message:
            "Invalid Smart Link, enabled flag, or Click ID parameter.",
        },
        400
      );
    }

    const { data: link, error: linkError } = await client
      .from("smart_links")
      .select("id")
      .eq("id", id)
      .eq("is_global", true)
      .maybeSingle();

    if (linkError) throw linkError;

    if (!link) {
      return reply(
        {
          success: false,
          message: "Smart Link not found.",
        },
        404
      );
    }

    const { data: existing, error: lookupError } =
      await client
        .from("smartlink_postback_settings")
        .select("smartlink_id")
        .eq("smartlink_id", id)
        .maybeSingle();

    if (lookupError) throw lookupError;

    const changes = {
      enabled: body.enabled,
      click_id_parameter: parameter,
      updated_at: new Date().toISOString(),
    };

    if (!existing) {
      const { error: insertError } = await client
        .from("smartlink_postback_settings")
        .insert({
          smartlink_id: id,
          ...changes,
        });

      // Preserve the existing secret if simultaneous
      // requests attempt to create the same settings.
      if (insertError && insertError.code !== "23505") {
        throw insertError;
      }
    }

    const { data, error } = await client
      .from("smartlink_postback_settings")
      .update(changes)
      .eq("smartlink_id", id)
      .select(SETTING_COLUMNS)
      .single();

    if (error) throw error;

    return reply({
      success: true,
      message: "Postback settings saved.",
      setting: formatSetting(data as Setting),
    });
  } catch {
    return reply(
      {
        success: false,
        message: "Unable to save postback settings.",
      },
      500
    );
  }
}
