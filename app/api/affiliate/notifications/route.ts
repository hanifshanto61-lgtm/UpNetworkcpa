import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { processPendingPaymentEmails } from "@/lib/payment-notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const TABLE = "affiliate_payment_notifications";

function reply(
  data: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}

async function authenticate(request: NextRequest) {
  const match = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i);

  const token = match?.[1]?.trim();

  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase server configuration missing."
    );
  }

  const client = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } =
    await client.auth.getUser(token);

  if (error || !data.user) return null;

  return {
    client,
    userId: data.user.id,
  };
}

// GET: Read this affiliate's payment notifications.
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);

    if (!auth) {
      return reply(
        {
          success: false,
          error: "Authentication required.",
        },
        401
      );
    }

    const { data, error } = await auth.client
      .from(TABLE)
      .select(
        "id,title,message,created_at,read_at,amount,currency,payment_method"
      )
      .eq("user_id", auth.userId)
      .eq("notification_enabled", true)
      .is("dismissed_at", null)
      .order("created_at", {
        ascending: false,
      })
      .limit(100);

    if (error) throw error;

    return reply({
      success: true,
      notifications: (data || []).map((row) => ({
        id: "payment-" + row.id,
        type: "system",
        title: row.title,
        message: row.message,
        createdAt: row.created_at,
        read: Boolean(row.read_at),
        sound: true,
        data: {
          kind: "payment",
          paymentId: row.id,
          amount: Number(row.amount),
          currency: row.currency,
          paymentMethod: row.payment_method,
          url: "/affiliate/payments",
        },
      })),
    });
  } catch (error) {
    console.error(
      "Affiliate payment notifications GET:",
      error
    );

    return reply(
      {
        success: false,
        error: "Unable to load payment notifications.",
      },
      500
    );
  }
}

// PATCH: Read or dismiss only this affiliate's notifications.
export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticate(request);

    if (!auth) {
      return reply(
        {
          success: false,
          error: "Authentication required.",
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
        throw new Error("Invalid body");
      }

      body = parsed as Record<string, unknown>;
    } catch {
      return reply(
        {
          success: false,
          error: "Invalid request body.",
        },
        400
      );
    }

    const ids = body.ids;
    const action = body.action;

    const uuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (
      (action !== "read" && action !== "dismiss") ||
      !Array.isArray(ids) ||
      ids.length < 1 ||
      ids.length > 100 ||
      !ids.every(
        (id) =>
          typeof id === "string" &&
          uuid.test(id)
      )
    ) {
      return reply(
        {
          success: false,
          error: "Invalid notification action or IDs.",
        },
        400
      );
    }

    const now = new Date().toISOString();

    const changes =
      action === "read"
        ? { read_at: now }
        : { dismissed_at: now };

    const { data, error } = await auth.client
      .from(TABLE)
      .update(changes)
      .eq("user_id", auth.userId)
      .eq("notification_enabled", true)
      .in("id", ids)
      .select("id");

    if (error) throw error;

    return reply({
      success: true,
      updated: data?.length || 0,
    });
  } catch (error) {
    console.error(
      "Affiliate payment notifications PATCH:",
      error
    );

    return reply(
      {
        success: false,
        error: "Unable to update payment notifications.",
      },
      500
    );
  }
}

// POST: Retry only this recipient's pending payment emails.
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);

    if (!auth) {
      return reply(
        {
          success: false,
          error: "Authentication required.",
        },
        401
      );
    }

    await processPendingPaymentEmails(
      auth.client,
      auth.userId
    );

    return reply({
      success: true,
    });
  } catch (error) {
    console.error(
      "Affiliate payment email retry:",
      error
    );

    return reply(
      {
        success: false,
        error: "Unable to process pending payment emails.",
      },
      500
    );
  }
}
