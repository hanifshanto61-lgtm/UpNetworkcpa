import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const smartLink =
  "https://onlyhotdates.com/dTmGzfkC?aid=fzkbxfzxzk&kid=hxxhxzhdpdk";

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      {
        error: "Supabase server configuration is missing.",
      },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { searchParams } = new URL(request.url);

  const affiliateId =
    searchParams.get("aid") ||
    searchParams.get("affiliate_id") ||
    null;

  const smartlinkId =
    searchParams.get("sl") || "default-smartlink";

  const clickId = randomUUID();

  const userAgent = request.headers.get("user-agent") || "";
  const referer = request.headers.get("referer") || "";
  const country =
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    null;

  let device = "Desktop";

  if (/mobile/i.test(userAgent)) {
    device = "Mobile";
  } else if (/tablet|ipad/i.test(userAgent)) {
    device = "Tablet";
  }

  let browser = "Other";

  if (/edg/i.test(userAgent)) {
    browser = "Edge";
  } else if (/chrome/i.test(userAgent)) {
    browser = "Chrome";
  } else if (/firefox/i.test(userAgent)) {
    browser = "Firefox";
  } else if (/safari/i.test(userAgent)) {
    browser = "Safari";
  }

  const { error } = await supabase.from("clicks").insert({
    click_id: clickId,
    affiliate_id: affiliateId,
    smartlink_id: smartlinkId,
    country,
    device,
    browser,
    referer,
  });

  if (error) {
    console.error("Click tracking error:", error);

    return NextResponse.json(
      {
        error: "Unable to record click.",
      },
      { status: 500 }
    );
  }

  const redirectUrl = new URL(smartLink);
  redirectUrl.searchParams.set("sub1", clickId);

  return NextResponse.redirect(redirectUrl.toString());
}
