import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Vercel-CDN-Cache-Control": "no-store",
    },
  });
}

function validId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

export async function GET(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return reply(
        { error: "Server configuration missing." },
        500
      );
    }

    const token = request.headers
      .get("authorization")
      ?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

    if (!token) {
      return reply({ error: "Please log in." }, 401);
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
      return reply(
        { error: "Your session expired." },
        401
      );
    }

    const admin = await getAdminSession(request);

    if (
      !admin &&
      request.nextUrl.searchParams.get("admin") === "1"
    ) {
      return reply(
        { error: "Active admin access required." },
        403
      );
    }

    if (!admin) {
      const { data: profile, error: profileError } =
        await client
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        return reply(
          { error: "Unable to verify your account." },
          500
        );
      }

      if (!profile) {
        return reply(
          { error: "Affiliate account required." },
          403
        );
      }

      const { data: setting, error: settingError } =
        await client
          .from("affiliate_panel_settings")
          .select("enabled")
          .eq("feature_key", "manager_contact")
          .maybeSingle();

      if (settingError) {
        return reply(
          { error: "Unable to load contact settings." },
          500
        );
      }

      if (setting?.enabled === false) {
        return reply({ contacts: [] });
      }
    }

    const { data, error } = await client
      .from("manager_email_contacts")
      .select("id, name, email, telegram")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Manager contacts GET", error);

      return reply(
        {
          error:
            "Unable to load manager contacts. Run the Telegram contact SQL first.",
        },
        500
      );
    }

    return reply({ contacts: data ?? [] });
  } catch (error) {
    console.error("Manager contacts GET", error);

    return reply(
      { error: "Unable to load manager contacts." },
      500
    );
  }
}

async function mutate(
  request: NextRequest,
  method: "POST" | "PATCH" | "DELETE"
) {
  try {
    const session = await getAdminSession(request);

    if (!session) {
      return reply(
        { error: "Active admin access required." },
        401
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return reply({ error: "Invalid JSON." }, 400);
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return reply({ error: "Invalid request." }, 400);
    }

    if (method !== "POST" && !validId(body.id)) {
      return reply(
        { error: "Invalid contact ID." },
        400
      );
    }

    if (method === "DELETE") {
      const { data, error } = await session.client
        .from("manager_email_contacts")
        .delete()
        .eq("id", body.id)
        .select("id")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return reply(
          { error: "Contact not found." },
          404
        );
      }

      return reply({ success: true });
    }

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const telegram =
      typeof body.telegram === "string"
        ? body.telegram
            .trim()
            .replace(/^@/, "")
            .toLowerCase()
        : "";

    if (!name || name.length > 100) {
      return reply(
        {
          error:
            "Enter a manager name (maximum 100 characters).",
        },
        400
      );
    }

    const emailPattern =
      /^[a-z0-9.!#$'*+\-/=^_`{|}~]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;

    if (
      email &&
      (email.length > 254 || !emailPattern.test(email))
    ) {
      return reply(
        { error: "Enter a valid email address." },
        400
      );
    }

    if (
      telegram &&
      !/^[a-z][a-z0-9_]{4,31}$/i.test(telegram)
    ) {
      return reply(
        {
          error:
            "Enter a Telegram username of 5–32 characters, starting with a letter. Use letters, numbers or underscores.",
        },
        400
      );
    }

    if (!email && !telegram) {
      return reply(
        {
          error:
            "Add an email address, a Telegram username, or both.",
        },
        400
      );
    }

    const values = {
      name,
      email: email || null,
      telegram: telegram || null,
    };

    const query =
      method === "POST"
        ? session.client
            .from("manager_email_contacts")
            .insert(values)
        : session.client
            .from("manager_email_contacts")
            .update(values)
            .eq("id", body.id);

    const { data, error } = await query
      .select("id, name, email, telegram")
      .maybeSingle();

    if (error?.code === "23505") {
      return reply(
        {
          error:
            "This email or Telegram username is already listed.",
        },
        409
      );
    }

    if (error) throw error;

    if (!data) {
      return reply(
        { error: "Contact not found." },
        404
      );
    }

    return reply(
      { success: true, contact: data },
      method === "POST" ? 201 : 200
    );
  } catch (error) {
    console.error("Manager contact mutation", error);

    return reply(
      {
        error:
          "Unable to save manager contacts. Run the Telegram contact SQL first.",
      },
      500
    );
  }
}

export async function POST(request: NextRequest) {
  return mutate(request, "POST");
}

export async function PATCH(request: NextRequest) {
  return mutate(request, "PATCH");
}

export async function DELETE(request: NextRequest) {
  return mutate(request, "DELETE");
}