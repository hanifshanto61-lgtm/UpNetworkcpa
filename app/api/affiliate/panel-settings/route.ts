import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function reply(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return reply(
        { error: "Supabase server configuration missing." },
        500
      );
    }

    const token = request.headers
      .get("authorization")
      ?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

    if (!token) {
      return reply({ error: "Unauthorized." }, 401);
    }

    const client = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, cache: "no-store" }),
      },
    });

    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser(token);

    if (authError || !user) {
      return reply({ error: "Unauthorized." }, 401);
    }

    const { data: profile, error: profileError } =
      await client
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error("Panel settings profile", profileError);

      return reply(
        { error: "Unable to verify affiliate profile." },
        500
      );
    }

    if (!profile) {
      return reply(
        { error: "Affiliate account required." },
        403
      );
    }

    const { data: settings, error } = await client
      .from("affiliate_panel_settings")
      .select("feature_key, enabled")
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Affiliate panel settings", error);

      return reply(
        { error: "Unable to load panel settings." },
        500
      );
    }

    return reply({
      success: true,
      settings: settings ?? [],
      projectRef: new URL(url).hostname.split(".")[0],
      checkedAt: new Date().toISOString(),
      revision: "settings-check-v2",
    });
  } catch (error) {
    console.error("Affiliate panel settings exception", error);

    return reply(
      { error: "Unable to load panel settings." },
      500
    );
  }
}