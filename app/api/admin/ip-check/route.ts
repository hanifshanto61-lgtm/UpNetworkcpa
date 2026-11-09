import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type JsonObject = Record<string, any>;

type IpCheck = {
  ip: string;
  risk: number | null;
  proxy: boolean | null;
  vpn: boolean | null;
  tor: boolean | null;
  hosting: boolean | null;
  anonymous: boolean | null;
  country: string | null;
  region: string | null;
  city: string | null;
  continent: string | null;
  provider: string | null;
  asn: string | null;
  hostname: string | null;
  network_type: string | null;
  confidence: number | null;
  details: JsonObject;
  checked_at: string;
};

const cache = new Map<
  string,
  { expires: number; check: IpCheck }
>();

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}

function validIp(ip: string): boolean {
  const value = ip.trim();

  const ipv4 = value.split(".");
  if (
    ipv4.length === 4 &&
    ipv4.every(
      (part) =>
        /^\d{1,3}$/.test(part) &&
        Number(part) >= 0 &&
        Number(part) <= 255
    )
  ) {
    return true;
  }

  if (!value.includes(":")) return false;

  try {
    const parsed = new URL(`http://[${value}]/`);
    return parsed.hostname.startsWith("[") &&
      parsed.hostname.endsWith("]");
  } catch {
    return false;
  }
}

function booleanValue(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession(request);

    if (!session) {
      return reply({
        success: false,
        error: "Admin authorization required.",
      }, 401);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return reply({
        success: false,
        error: "Invalid request body.",
      }, 400);
    }

    const clickId =
      body &&
      typeof body === "object" &&
      !Array.isArray(body)
        ? (body as Record<string, unknown>).click_id
        : null;

    if (
      typeof clickId !== "string" ||
      !/^[a-zA-Z0-9_-]{1,200}$/.test(clickId)
    ) {
      return reply({
        success: false,
        error: "A valid Click ID is required.",
      }, 400);
    }

    // Always use the IP stored against this Click ID.
    const { data: click, error } = await session.client
      .from("clicks")
      .select("ip_address")
      .eq("click_id", clickId)
      .maybeSingle();

    if (error) {
      return reply({
        success: false,
        error: "Unable to read the recorded click IP.",
      }, 503);
    }

    if (!click) {
      return reply({
        success: false,
        error: "Click not found.",
      }, 404);
    }

    const ip =
      typeof click.ip_address === "string"
        ? click.ip_address.trim()
        : "";

    if (!validIp(ip)) {
      return reply({
        success: false,
        error: "No valid IP was recorded for this click.",
      }, 400);
    }

    const cached = cache.get(ip);

    if (cached && cached.expires > Date.now()) {
      return reply({
        success: true,
        check: cached.check,
        cached: true,
      });
    }

    const endpoint = new URL(
      `https://proxycheck.io/v3/${encodeURIComponent(ip)}`
    );

    endpoint.searchParams.set("ver", "24-June-2026");
    endpoint.searchParams.set("tag", "0");

    const apiKey = process.env.PROXYCHECK_API_KEY?.trim();

    if (apiKey) {
      endpoint.searchParams.set("key", apiKey);
    }

    let response: Response;

    try {
      response = await fetch(endpoint.toString(), {
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      });
    } catch {
      return reply({
        success: false,
        error: "IP service connection failed. Please try again.",
      }, 503);
    }

    let result: JsonObject;

    try {
      result = await response.json();
    } catch {
      return reply({
        success: false,
        error: "IP service returned an invalid response.",
      }, 502);
    }

    if (!response.ok || result.status === "denied") {
      const message =
        typeof result.message === "string"
          ? result.message
          : response.status === 429
            ? "IP check daily limit reached."
            : "IP service rejected this request.";

      return reply({
        success: false,
        error: message,
      }, response.status === 429 ? 429 : 502);
    }

    if (!["ok", "warning"].includes(result.status)) {
      return reply({
        success: false,
        error:
          typeof result.message === "string"
            ? result.message
            : "IP check service returned no valid result.",
      }, 502);
    }

    const entry = result[ip];

    if (!entry || typeof entry !== "object") {
      return reply({
        success: false,
        error: "No IP intelligence data was returned.",
      }, 502);
    }

    const network: JsonObject =
      entry.network && typeof entry.network === "object"
        ? entry.network
        : {};

    const location: JsonObject =
      entry.location && typeof entry.location === "object"
        ? entry.location
        : {};

    const detections: JsonObject =
      entry.detections && typeof entry.detections === "object"
        ? entry.detections
        : {};

    const check: IpCheck = {
      ip,

      risk:
        typeof entry.risk === "number"
          ? entry.risk
          : null,

      proxy: booleanValue(detections.proxy),
      vpn: booleanValue(detections.vpn),
      tor: booleanValue(detections.tor),
      hosting: booleanValue(detections.hosting),
      anonymous: booleanValue(detections.anonymous),

      country: stringValue(location.country),
      region: stringValue(location.region),
      city: stringValue(location.city),
      continent: stringValue(location.continent),

      provider: stringValue(network.provider),
      asn: stringValue(network.asn),
      hostname: stringValue(network.hostname),
      network_type: stringValue(network.type),

      confidence:
        typeof detections.confidence === "number"
          ? detections.confidence
          : null,

      // Keep the full response for the admin report.
      details: entry,

      checked_at: new Date().toISOString(),
    };

    if (cache.size >= 500) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }

    cache.set(ip, {
      expires: Date.now() + 10 * 60 * 1000,
      check,
    });

    return reply({
      success: true,
      check,
      cached: false,
    });
  } catch {
    return reply({
      success: false,
      error: "Unable to check this IP. Please try again.",
    }, 500);
  }
}