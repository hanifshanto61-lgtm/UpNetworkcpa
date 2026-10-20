import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function jsonError(error: string, status = 400) {
  return NextResponse.json(
    { success: false, error },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

function getToken(request: NextRequest) {
  const authorization =
    request.headers.get("authorization") ?? "";

  return authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
}

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase server configuration is missing."
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const token = getToken(request);

    if (!token) {
      return jsonError("Authentication required.", 401);
    }

    const client = getClient();
    const admin = await getAdminSession(request);

    // Admin and Sub-admin: load application conversations.
    if (admin) {
      const { data: messages, error } = await client
        .from("affiliate_application_messages")
        .select(
          "id, affiliate_user_id, sender_user_id, sender_role, message, is_read, created_at"
        )
        .order("created_at", { ascending: true })
        .limit(5000);

      if (error) {
        console.error(
          "Application chat query failed:",
          error.message
        );

        return jsonError(
          "Unable to load application chats.",
          500
        );
      }

      const ids = [
        ...new Set(
          (messages ?? []).map(
            (item) => item.affiliate_user_id
          )
        ),
      ];

      let profiles: any[] = [];

      if (ids.length) {
        const { data, error: profileError } =
          await client
            .from("profiles")
            .select(
              "id, full_name, first_name, last_name, email, username, affiliate_id, application_status"
            )
            .in("id", ids);

        if (profileError) {
          console.error(
            "Application chat profile query failed:",
            profileError.message
          );

          return jsonError(
            "Unable to load applicant details.",
            500
          );
        }

        profiles = data ?? [];
      }

      const profileMap = new Map(
        profiles.map((profile) => [
          profile.id,
          profile,
        ])
      );

      const conversations = ids
        .map((id) => {
          const thread = (messages ?? []).filter(
            (item) => item.affiliate_user_id === id
          );

          return {
            affiliate_user_id: id,
            profile: profileMap.get(id) ?? {},
            messages: thread,
            last_message_at:
              thread[thread.length - 1]?.created_at ??
              null,
            unread_count: thread.filter(
              (item) =>
                item.sender_role === "affiliate" &&
                !item.is_read
            ).length,
          };
        })
        .sort((a, b) =>
          String(b.last_message_at ?? "").localeCompare(
            String(a.last_message_at ?? "")
          )
        );

      return NextResponse.json(
        {
          success: true,
          role: admin.role,
          conversations,
        },
        {
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    // Affiliate: only load their own conversation.
    const { data: authData, error: authError } =
      await client.auth.getUser(token);

    const user = authData?.user;

    if (authError || !user) {
      return jsonError(
        "Invalid or expired session.",
        401
      );
    }

    const { data: messages, error } = await client
      .from("affiliate_application_messages")
      .select(
        "id, affiliate_user_id, sender_user_id, sender_role, message, is_read, created_at"
      )
      .eq("affiliate_user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(500);

    if (error) {
      console.error(
        "Affiliate chat query failed:",
        error.message
      );

      return jsonError(
        "Unable to load your messages.",
        500
      );
    }

    return NextResponse.json(
      {
        success: true,
        role: "affiliate",
        messages: messages ?? [],
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Application chat GET error:", error);

    return jsonError(
      "Unable to load application chat.",
      500
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getToken(request);

    if (!token) {
      return jsonError("Authentication required.", 401);
    }

    const body = await request.json().catch(() => null);

    const message =
      typeof body?.message === "string"
        ? body.message.trim()
        : "";

    if (!message || message.length > 5000) {
      return jsonError(
        "Message must be between 1 and 5000 characters."
      );
    }

    const client = getClient();
    const admin = await getAdminSession(request);

    let affiliateUserId = "";
    let senderUserId = "";
    let senderRole: "affiliate" | "admin";

    if (admin) {
      // Admin/Sub-admin must select an existing affiliate.
      affiliateUserId =
        typeof body?.affiliate_user_id === "string"
          ? body.affiliate_user_id.trim()
          : "";

      senderUserId = admin.userId;
      senderRole = "admin";

      if (!affiliateUserId) {
        return jsonError(
          "Select an affiliate conversation."
        );
      }

      const { data: profile, error } = await client
        .from("profiles")
        .select("id")
        .eq("id", affiliateUserId)
        .maybeSingle();

      if (error || !profile) {
        return jsonError(
          "Affiliate profile not found.",
          404
        );
      }
    } else {
      // Affiliate can only send to their own conversation.
      const { data: authData, error: authError } =
        await client.auth.getUser(token);

      const user = authData?.user;

      if (authError || !user) {
        return jsonError(
          "Invalid or expired session.",
          401
        );
      }

      affiliateUserId = user.id;
      senderUserId = user.id;
      senderRole = "affiliate";
    }

    const { data, error } = await client
      .from("affiliate_application_messages")
      .insert({
        affiliate_user_id: affiliateUserId,
        sender_user_id: senderUserId,
        sender_role: senderRole,
        message,
        is_read: false,
      })
      .select(
        "id, affiliate_user_id, sender_user_id, sender_role, message, is_read, created_at"
      )
      .single();

    if (error) {
      console.error(
        "Application chat insert failed:",
        error.message
      );

      return jsonError("Unable to send message.", 500);
    }

    return NextResponse.json(
      {
        success: true,
        message: data,
      },
      {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Application chat POST error:", error);

    return jsonError(
      "Unable to send message.",
      500
    );
  }
}