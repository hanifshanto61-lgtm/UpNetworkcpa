import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  const reply = (body: unknown, status = 200) =>
    NextResponse.json(body, {
      status,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Vercel-CDN-Cache-Control": "no-store",
      },
    });

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return reply(
        { error: "Contact service is unavailable." },
        500
      );
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

    const { data, error } = await client
      .from("manager_email_contacts")
      .select("id, name, email, telegram")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Public manager contacts:", error.message);
      return reply(
        { error: "Unable to load manager contacts." },
        500
      );
    }

    return reply({ contacts: data ?? [] });
  } catch (error) {
    console.error(
      "Public manager contacts:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return reply(
      { error: "Unable to load manager contacts." },
      500
    );
  }
}