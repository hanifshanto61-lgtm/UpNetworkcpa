import { isIP } from "net";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Check = {
  ip: string;
  risk: number | null;
  proxy: boolean | null;
  vpn: boolean | null;
  tor: boolean | null;
  hosting: boolean | null;
  anonymous: boolean | null;
  checked_at: string;
};

const cache = new Map<string, { expires: number; check: Check }>();

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) {
      return reply({ success: false, error: "Admin authorization required." }, 401);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return reply({ success: false, error: "Invalid request body." }, 400);
    }
    const clickId = body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>).click_id : null;
    if (typeof clickId !== "string" || !/^[a-zA-Z0-9_-]{1,200}$/.test(clickId)) {
      return reply({ success: false, error: "A valid Click ID is required." }, 400);
    }

    // Look up the recorded IP, never an arbitrary IP submitted by the browser.
    const { data: click, error } = await session.client
      .from("clicks").select("ip_address").eq("click_id", clickId).maybeSingle();
    if (error) {
      const missing = ["42703", "PGRST204"].includes(error.code);
      return reply({
        success: false,
        error: missing ? "IP recording is not configured yet." : "Unable to read the click IP.",
      }, 503);
    }
    if (!click) return reply({ success: false, error: "Click not found." }, 404);
    const ip = typeof click.ip_address === "string" ? click.ip_address.trim() : "";
    if (!isIP(ip)) {
      return reply({ success: false, error: "No valid IP was recorded for this click." }, 400);
    }

    const cached = cache.get(ip);
    if (cached && cached.expires > Date.now()) {
      return reply({ success: true, check: cached.check });
    }

    const endpoint = new URL(`https://proxycheck.io/v3/${encodeURIComponent(ip)}`);
    endpoint.searchParams.set("ver", "24-June-2026");
    endpoint.searchParams.set("tag", "0");
    const key = process.env.PROXYCHECK_API_KEY?.trim();
    if (key) endpoint.searchParams.set("key", key);

    let response: Response;
    try {
      response = await fetch(endpoint, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      return reply({ success: false, error: "IP check service unavailable. Try again." }, 503);
    }

    let result: Record<string, any>;
    try {
      result = await response.json();
    } catch {
      return reply({ success: false, error: "IP check returned an invalid response." }, 502);
    }
    if (response.status === 429 || result.status === "denied") {
      return reply({ success: false, error: "IP check limit reached. Try later or configure a private PROXYCHECK_API_KEY." }, 429);
    }
    const entry = result[ip];
    if (!response.ok || !["ok", "warning"].includes(result.status) ||
        !entry || typeof entry !== "object" ||
        !entry.detections || typeof entry.detections !== "object") {
      return reply({ success: false, error: "IP check unavailable. No verdict was returned." }, 502);
    }

    const flag = (value: unknown): boolean | null =>
      typeof value === "boolean" ? value : null;
    const detections = entry.detections;
    const check: Check = {
      ip,
      risk: typeof entry.risk === "number" && Number.isFinite(entry.risk) &&
        entry.risk >= 0 && entry.risk <= 100 ? entry.risk : null,
      proxy: flag(detections.proxy),
      vpn: flag(detections.vpn),
      tor: flag(detections.tor),
      hosting: flag(detections.hosting),
      anonymous: flag(detections.anonymous),
      checked_at: new Date().toISOString(),
    };
    if (cache.size >= 500) cache.delete(cache.keys().next().value);
    cache.set(ip, { expires: Date.now() + 10 * 60 * 1000, check });
    return reply({ success: true, check });
  } catch {
    return reply({ success: false, error: "Unable to check this IP." }, 500);
  }
}