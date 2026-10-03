import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;

    const click_id =
      searchParams.get("click_id") ||
      searchParams.get("s1") ||
      searchParams.get("sub1");

    const payout = searchParams.get("payout") || "0";

    if (!click_id) {
      return new NextResponse("Missing click_id", { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from("clicks")
      .update({
        status: "converted",
        payout: parseFloat(payout),
        converted_at: new Date().toISOString(),
      })
      .eq("click_id", click_id);

    if (error) {
      console.error("Postback update error:", error);
      return new NextResponse("Database update failed", { status: 500 });
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Postback error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
