import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const click_id = searchParams.get("click_id") || searchParams.get("sub1") || searchParams.get("aff_sub") || searchParams.get("s1");
    const payout = searchParams.get("payout") || searchParams.get("amount") || 0;

    if (!click_id) {
      return new NextResponse("Missing click_id", { status: 400 });
    }

    // Use SERVICE_ROLE key for postback - bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Find the click first
    const { data: click } = await supabase
      .from("clicks")
      .select("*")
      .eq("click_id", click_id)
      .single();

    if (!click) {
      console.log("Click not found:", click_id);
      return new NextResponse("OK - Click not found but accepted", { status: 200 });
    }

    // Update to converted
    const { error } = await supabase
      .from("clicks")
      .update({ 
        status: "converted",
        payout: parseFloat(payout) || 0,
        converted_at: new Date().toISOString()
      })
      .eq("click_id", click_id);

    if (error) console.log("Update error:", error);
    else console.log("Postback SUCCESS:", click_id, payout);

    return new NextResponse("OK", { status: 200 });
  } catch (e) {
    console.log("Postback Exception:", e.message);
    return new NextResponse("OK", { status: 200 });
  }
}

export async function POST(req) {
  return GET(req);
}
