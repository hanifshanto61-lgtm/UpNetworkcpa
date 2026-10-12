
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        admin: {
          user_id: session.userId,
          email: session.email,
          role: session.role,
          is_super_admin:
            session.role === "super_admin",
          can_manage_admins:
            session.role === "super_admin",
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Admin role verification error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to verify administrator.",
      },
      { status: 500 }
    );
  }
}
