
import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export type AdminRole = "super_admin" | "sub_admin";

export async function getAdminSession(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";

  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";

  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase server configuration missing");
  }

  const client = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: authData, error: authError } =
    await client.auth.getUser(token);

  if (authError || !authData.user) {
    return null;
  }

  const { data: admin, error: roleError } = await client
    .from("admin_roles")
    .select("role, is_active")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (
    roleError ||
    !admin ||
    admin.is_active !== true ||
    !["super_admin", "sub_admin"].includes(admin.role)
  ) {
    return null;
  }

  return {
    userId: authData.user.id,
    email: authData.user.email,
    role: admin.role as AdminRole,
    client,
  };
}

export async function getSuperAdminSession(
  request: NextRequest
) {
  const session = await getAdminSession(request);

  if (!session || session.role !== "super_admin") {
    return null;
  }

  return session;
}
