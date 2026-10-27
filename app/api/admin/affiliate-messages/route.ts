import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const db =
  url && key
    ? createClient(url, key, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

function reply(
  data: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

// Load affiliates or sent messages for the admin panel.
export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession(request);

    if (!admin) {
      return reply(
        { success: false, error: "Unauthorized." },
        401
      );
    }

    if (!db) {
      return reply(
        {
          success: false,
          error: "Supabase server configuration missing.",
        },
        500
      );
    }

    // Load sent messages when requested by the admin message manager.
    if (request.nextUrl.searchParams.get("view") === "messages") {
      const { data: messages, error } = await db
        .from("affiliate_admin_messages")
        .select("id, subject, message, recipient_type, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      return reply({
        success: true,
        messages: messages || [],
      });
    }

    // Keep the existing affiliate list behavior.
    const { data: profiles, error } = await db
      .from("profiles")
      .select("*")
      .limit(5000);

    if (error) throw error;

    const { data: adminRoles, error: rolesError } = await db
      .from("admin_roles")
      .select("user_id");

    if (rolesError) throw rolesError;

    const adminIds = new Set(
      (adminRoles || []).map((row: any) =>
        String(row.user_id)
      )
    );

    const affiliates = (profiles || [])
      .filter(
        (profile: any) =>
          profile.id &&
          !adminIds.has(String(profile.id))
      )
      .map((profile: any) => ({
        id: String(profile.id),
        affiliateId: String(profile.affiliate_id || ""),
        name: String(
          profile.full_name ||
            profile.name ||
            profile.username ||
            "Affiliate"
        ),
        email: String(profile.email || ""),
        status: String(profile.status || ""),
      }));

    return reply({
      success: true,
      affiliates,
    });
  } catch (error: any) {
    console.error("Admin affiliate messages GET:", error);

    return reply(
      {
        success: false,
        error: error?.message || "Unable to load data.",
      },
      500
    );
  }
}

// Send a message to all affiliates or one selected affiliate.
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession(request);

    if (!admin) {
      return reply(
        { success: false, error: "Unauthorized." },
        401
      );
    }

    if (!db) {
      return reply(
        {
          success: false,
          error: "Supabase server configuration missing.",
        },
        500
      );
    }

    const body = await request.json();

    const subject =
      typeof body.subject === "string"
        ? body.subject.trim()
        : "";

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    const recipientType =
      body.recipientType === "single" ||
      body.recipientType === "all"
        ? body.recipientType
        : "";

    const affiliateUserId =
      typeof body.affiliateUserId === "string"
        ? body.affiliateUserId.trim()
        : "";

    if (!subject || subject.length > 160) {
      return reply(
        {
          success: false,
          error:
            "Subject is required (maximum 160 characters).",
        },
        400
      );
    }

    if (!message || message.length > 10000) {
      return reply(
        {
          success: false,
          error:
            "Message is required (maximum 10,000 characters).",
        },
        400
      );
    }

    if (!recipientType) {
      return reply(
        {
          success: false,
          error: "Choose all affiliates or one affiliate.",
        },
        400
      );
    }

    let recipientIds: string[] = [];

    if (recipientType === "single") {
      if (!affiliateUserId) {
        return reply(
          {
            success: false,
            error: "Select an affiliate.",
          },
          400
        );
      }

      const { data: profile, error } = await db
        .from("profiles")
        .select("id")
        .eq("id", affiliateUserId)
        .maybeSingle();

      if (error) throw error;

      if (!profile) {
        return reply(
          { success: false, error: "Affiliate not found." },
          404
        );
      }

      const { data: adminRole, error: adminRoleError } =
        await db
          .from("admin_roles")
          .select("user_id")
          .eq("user_id", affiliateUserId)
          .maybeSingle();

      if (adminRoleError) throw adminRoleError;

      if (adminRole) {
        return reply(
          {
            success: false,
            error:
              "Admin accounts cannot be message recipients.",
          },
          400
        );
      }

      recipientIds = [String(profile.id)];
    } else {
      const { data: profiles, error } = await db
        .from("profiles")
        .select("id")
        .limit(5000);

      if (error) throw error;

      const { data: adminRoles, error: rolesError } =
        await db
          .from("admin_roles")
          .select("user_id");

      if (rolesError) throw rolesError;

      const adminIds = new Set(
        (adminRoles || []).map((row: any) =>
          String(row.user_id)
        )
      );

      recipientIds = (profiles || [])
        .filter(
          (profile: any) =>
            profile.id &&
            !adminIds.has(String(profile.id))
        )
        .map((profile: any) => String(profile.id));
    }

    if (!recipientIds.length) {
      return reply(
        { success: false, error: "No recipients found." },
        400
      );
    }

    const { data: created, error: createError } = await db
      .from("affiliate_admin_messages")
      .insert({
        sender_user_id: admin.userId,
        subject,
        message,
        recipient_type: recipientType,
      })
      .select("id")
      .single();

    if (createError) throw createError;

    const recipients = recipientIds.map((id) => ({
      message_id: created.id,
      affiliate_user_id: id,
    }));

    for (let i = 0; i < recipients.length; i += 500) {
      const { error } = await db
        .from("affiliate_admin_message_recipients")
        .insert(recipients.slice(i, i + 500));

      if (error) throw error;
    }

    return reply({
      success: true,
      sent: recipientIds.length,
      messageId: created.id,
    });
  } catch (error: any) {
    console.error("Admin affiliate messages POST:", error);

    return reply(
      {
        success: false,
        error: error?.message || "Unable to send message.",
      },
      500
    );
  }
}

// Delete an admin message for all affiliates.
export async function DELETE(request: NextRequest) {
  try {
    const admin = await getAdminSession(request);

    if (!admin) {
      return reply(
        { success: false, error: "Unauthorized." },
        401
      );
    }

    if (!db) {
      return reply(
        {
          success: false,
          error: "Supabase server configuration missing.",
        },
        500
      );
    }

    const body = await request.json();

    const messageId =
      typeof body.messageId === "string"
        ? body.messageId.trim()
        : "";

    if (!messageId) {
      return reply(
        {
          success: false,
          error: "Message ID is required.",
        },
        400
      );
    }

    // Verify the message exists before deleting recipients.
    const { data: existing, error: lookupError } = await db
      .from("affiliate_admin_messages")
      .select("id")
      .eq("id", messageId)
      .maybeSingle();

    if (lookupError) throw lookupError;

    if (!existing) {
      return reply(
        { success: false, error: "Message not found." },
        404
      );
    }

    // Remove recipient records for every affiliate.
    const { error: recipientsError } = await db
      .from("affiliate_admin_message_recipients")
      .delete()
      .eq("message_id", messageId);

    if (recipientsError) throw recipientsError;

    // Delete the original admin message.
    const { error: deleteError } = await db
      .from("affiliate_admin_messages")
      .delete()
      .eq("id", messageId);

    if (deleteError) throw deleteError;

    return reply({ success: true });
  } catch (error: any) {
    console.error("Admin affiliate messages DELETE:", error);

    return reply(
      {
        success: false,
        error: error?.message || "Unable to delete message.",
      },
      500
    );
  }
}