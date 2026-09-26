import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Force dynamic - important for postback
export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Datify sends these params
    const click_id = searchParams.get("click_id") || searchParams.get("sub1") || searchParams.get("aff_sub") || searchParams.get("s1");
    const payout = searchParams.get("payout") || searchParams.get("amount") || 0;
    const status = searchParams.get("status") || "converted";

    console.log("Postback hit:", { click_id, payout, status, allParams: Object.fromEntries(searchParams) });

    if (!click_id) {
      console.log("Missing click_id");
      return new NextResponse("Missing click_id", { status: 400 });
    }

    // IMPORTANT: Use SERVICE_ROLE key, not ANON
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.log("Missing env vars");
      return new NextResponse("OK - Env missing but accepted", { status: 200 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update the click
    const { data, error } = await supabase
      .from("clicks")
      .update({ 
        status: "converted",
        payout: parseFloat(payout) || 0,
        converted_at: new Date().toISOString()
      })
      .eq("click_id", click_id)
      .select();

    if (error) {
      console.error("Supabase update error:", error);
    } else {
      console.log("Conversion updated:", data);
    }

    // Always return OK to Datify
    return new NextResponse("OK", { status: 200 });

  } catch (e) {
    console.error("Postback error:", e.message);
    return new NextResponse("OK", { status: 200 });
  }
}

export async function POST(req) {
  return GET(req);
}
