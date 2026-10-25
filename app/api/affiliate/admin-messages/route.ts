import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

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
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase server configuration missing.");
  }

  const client = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await client.auth.getUser(token);

  if (error || !data.user) return null;

  return {
    client,
    userId: data.user.id,
  };
}

// GET: Fetch messages addressed to the signed-in affiliate.
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);

    if (!auth) {
      return reply(
        { success: false, error: "Authentication required." },
        401
      );
    }

    const { data, error } = await auth.client
      .from("affiliate_admin_message_recipients")
      .select(`
        id,
        read_at,
        created_at,
        message:affiliate_admin_messages (
          id,
          subject,
          message,
          created_at
        )
      `)
      .eq("affiliate_user_id", auth.userId)
      .is("dismissed_at", null)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const messages = (data || [])
      .map((row: any) => ({
        recipientId: row.id,
        read: Boolean(row.read_at),
        readAt: row.read_at,
        createdAt: row.message?.created_at || row.created_at,
        id: row.message?.id || "",
        subject: row.message?.subject || "",
        message: row.message?.message || "",
      }))
      .filter((item: any) => Boolean(item.id));

    return reply({
      success: true,
      messages,
      unreadCount: messages.filter((item: any) => !item.read).length,
    });
  } catch (error: any) {
    console.error("Affiliate admin messages GET:", error);

    return reply(
      {
        success: false,
        error: error?.message || "Unable to load messages.",
      },
      500
    );
  }
}

// PATCH: Mark one of this affiliate's messages as read.
export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticate(request);

    if (!auth) {
      return reply(
        { success: false, error: "Authentication required." },
        401
      );
    }

    const body = await request.json();

    const recipientId =
      typeof body.recipientId === "string"
        ? body.recipientId.trim()
        : "";

    if (!recipientId) {
      return reply(
        { success: false, error: "Message recipient ID is required." },
        400
      );
    }

    const { data, error } = await auth.client
      .from("affiliate_admin_message_recipients")
      .update({ read_at: new Date().toISOString() })
      .eq("id", recipientId)
      .eq("affiliate_user_id", auth.userId)
      .select("id")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return reply(
        { success: false, error: "Message not found." },
        404
      );
    }

    return reply({ success: true });
  } catch (error: any) {
    console.error("Affiliate admin messages PATCH:", error);

    return reply(
      {
        success: false,
        error: error?.message || "Unable to mark message as read.",
      },
      500
    );
  }
}