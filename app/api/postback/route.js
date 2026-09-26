import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const click_id = req.nextUrl.searchParams.get("click_id");
  console.log("Postback received:", click_id);
  return new NextResponse("OK", { status: 200 });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
