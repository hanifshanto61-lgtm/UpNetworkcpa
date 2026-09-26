import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Supabase client - public access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const click_id = searchParams.get("click_id") || searchParams.get("sub1") || searchParams.get("aff_sub");
    const payout = searchParams.get("payout") || 0;

    if (!click_id) {
      return new NextResponse("Missing click_id", { status: 400 });
    }

    // Find click and update to conversion
    const { data, error } = await supabase
      .from("clicks")
      .update({ 
        status: "converted",
        payout: payout,
        converted_at: new Date().toISOString()
      })
      .eq("click_id", click_id);

    console.log("Postback received:", click_id, payout, error);

    return new NextResponse("OK", { status: 200 });
  } catch (e) {
    return new NextResponse("OK", { status: 200 }); // Always return OK to network
  }
}

export async function POST(req) {
  return GET(req);
}
