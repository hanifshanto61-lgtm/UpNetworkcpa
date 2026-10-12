
import { NextRequest, NextResponse } from "next/server";
import { getSuperAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function respond(
  success: boolean,
  message: string,
  status = 200,
  extra: Record<string, unknown> = {}
) {
  return NextResponse.json(
    { success, message, ...extra },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* =========================================
   GET - LIST ADMIN ACCOUNTS
   MAIN ADMIN ONLY
========================================= */

export async function GET(request: NextRequest) {
  try {
    const session = await getSuperAdminSession(request);

    if (!session) {
      return respond(false, "Forbidden.", 403);
    }

    const { data, error } = await session.client
      .from("admin_roles")
      .select("user_id,role,is_active,created_at,updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Admin list error:", error);
      return respond(
        false,
        "Unable to load administrators.",
        500
      );
    }

    const admins = await Promise.all(
      (data || []).map(async (row) => {
        const { data: userData, error: userError } =
          await session.client.auth.admin.getUserById(
            row.user_id
          );

        const user = userError ? null : userData?.user;

        return {
          user_id: row.user_id,
          email: user?.email || "",
          name: user?.user_metadata?.full_name || "",
          role: row.role,
          is_active: row.is_active,
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
      })
    );

    return respond(true, "Administrators loaded.", 200, {
      admins,
    });
  } catch (error) {
    console.error("Admin Management GET error:", error);
    return respond(false, "Internal server error.", 500);
  }
}

/* =========================================
   POST - CREATE SUB ADMIN
   MAIN ADMIN ONLY
========================================= */

export async function POST(request: NextRequest) {
  try {
    const session = await getSuperAdminSession(request);

    if (!session) {
      return respond(false, "Forbidden.", 403);
    }

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return respond(false, "Invalid JSON body.", 400);
    }

    const email = clean(body.email).toLowerCase();
    const name = clean(body.name);
    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!isValidEmail(email)) {
      return respond(
        false,
        "Valid email address is required.",
        400
      );
    }

    if (name.length < 2 || name.length > 100) {
      return respond(
        false,
        "Name must contain 2-100 characters.",
        400
      );
    }

    if (password.length < 12) {
      return respond(
        false,
        "Password must contain at least 12 characters.",
        400
      );
    }

    /* CREATE NEW AUTH USER */

    const { data: created, error: createError } =
      await session.client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          account_type: "admin",
          created_by_admin: session.userId,
        },
      });

    if (createError || !created?.user) {
      console.error("Create sub admin error:", createError);

      return respond(
        false,
        createError?.message ||
          "Unable to create administrator.",
        400
      );
    }

    const newUserId = created.user.id;

    /* ASSIGN SUB ADMIN ROLE ONLY */

    const { error: roleError } = await session.client
      .from("admin_roles")
      .insert({
        user_id: newUserId,
        role: "sub_admin",
        is_active: true,
      });

    if (roleError) {
      console.error("Assign sub admin role error:", roleError);

      const { error: rollbackError } =
        await session.client.auth.admin.deleteUser(
          newUserId
        );

      if (rollbackError) {
        console.error(
          "Sub admin creation rollback failed:",
          rollbackError
        );

        return respond(
          false,
          "Role assignment failed and the new account could not be rolled back. Manual administrator review is required.",
          500
        );
      }

      return respond(
        false,
        "Role assignment failed. New account was rolled back.",
        500
      );
    }

    return respond(
      true,
      "Sub Admin created successfully.",
      201,
      {
        admin: {
          user_id: newUserId,
          email,
          name,
          role: "sub_admin",
          is_active: true,
        },
      }
    );
  } catch (error) {
    console.error("Admin Management POST error:", error);
    return respond(false, "Internal server error.", 500);
  }
}

/* =========================================
   PATCH - ACTIVATE / SUSPEND SUB ADMIN
   MAIN ADMIN ONLY
========================================= */

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSuperAdminSession(request);

    if (!session) {
      return respond(false, "Forbidden.", 403);
    }

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return respond(false, "Invalid JSON body.", 400);
    }

    const userId = clean(body.user_id);
    const isActive = body.is_active;

    if (!userId) {
      return respond(false, "User ID is required.", 400);
    }

    if (typeof isActive !== "boolean") {
      return respond(
        false,
        "is_active must be true or false.",
        400
      );
    }

    /* NEVER CHANGE MAIN ADMIN */

    if (userId === session.userId) {
      return respond(
        false,
        "You cannot modify your own Main Admin account.",
        403
      );
    }

    const { data: target, error: lookupError } =
      await session.client
        .from("admin_roles")
        .select("user_id,role,is_active")
        .eq("user_id", userId)
        .maybeSingle();

    if (lookupError) {
      return respond(
        false,
        "Unable to verify administrator.",
        500
      );
    }

    if (!target) {
      return respond(
        false,
        "Administrator not found.",
        404
      );
    }

    if (target.role !== "sub_admin") {
      return respond(
        false,
        "Main Admin accounts cannot be changed here.",
        403
      );
    }

    const { data: updated, error: updateError } =
      await session.client
        .from("admin_roles")
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("role", "sub_admin")
        .select("user_id,role,is_active")
        .single();

    if (updateError || !updated) {
      console.error("Update sub admin error:", updateError);

      return respond(
        false,
        "Unable to update Sub Admin.",
        500
      );
    }

    return respond(
      true,
      isActive
        ? "Sub Admin activated successfully."
        : "Sub Admin suspended successfully.",
      200,
      {
        admin: updated,
      }
    );
  } catch (error) {
    console.error("Admin Management PATCH error:", error);
    return respond(false, "Internal server error.", 500);
  }
}
