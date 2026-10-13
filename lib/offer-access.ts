import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export class OfferAccessError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

export function offerReply(
  body: unknown,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Vercel-CDN-Cache-Control": "no-store",
    },
  });
}

export function offerError(error: unknown) {
  if (error instanceof OfferAccessError) {
    return offerReply(
      {
        success: false,
        error: error.message,
      },
      error.status
    );
  }

  console.error("Offer access", error);

  return offerReply(
    {
      success: false,
      error:
        "Offer service is unavailable. Please try again.",
    },
    500
  );
}

export function offerServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new OfferAccessError(
      "Server configuration missing.",
      500
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: "no-store",
        }),
    },
  });
}

export async function approvedAffiliate(
  request: NextRequest
) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  if (!token) {
    throw new OfferAccessError(
      "Please log in.",
      401
    );
  }

  const client = offerServerClient();

  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);

  if (error || !user) {
    throw new OfferAccessError(
      "Your session expired. Please log in again.",
      401
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await client
    .from("profiles")
    .select(
      "id, affiliate_id, full_name, application_status"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(
      "Unable to verify affiliate profile."
    );
  }

  const status = String(
    profile?.application_status ?? ""
  )
    .trim()
    .toLowerCase();

  if (
    !profile ||
    !["approved", "active"].includes(status)
  ) {
    throw new OfferAccessError(
      "Approved affiliate account required.",
      403
    );
  }

  if (!profile.affiliate_id) {
    throw new OfferAccessError(
      "Affiliate ID is unavailable.",
      400
    );
  }

  return {
    client,
    user,
    profile,
  };
}

export async function hasOfferApproval(
  client: SupabaseClient,
  userId: string,
  offerId: string
) {
  const { data, error } = await client
    .from("affiliate_offer_requests")
    .select("id")
    .eq("user_id", userId)
    .eq("offer_id", offerId)
    .eq("status", "approved")
    .maybeSingle();

  if (error) {
    console.error(
      "Offer permission lookup",
      error
    );

    throw new OfferAccessError(
      "Unable to verify offer approval.",
      500
    );
  }

  return Boolean(data);
}

export async function offerBody(
  request: NextRequest
): Promise<Record<string, unknown>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new OfferAccessError(
      "Invalid JSON.",
      400
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    throw new OfferAccessError(
      "Invalid request body.",
      400
    );
  }

  return body as Record<string, unknown>;
}

export function rpcOfferError(error: {
  code?: string;
  message?: string;
}) {
  if (error.code === "40001") {
    throw new OfferAccessError(
      "This request has changed. Refresh and try again.",
      409
    );
  }

  if (error.code === "42501") {
    throw new OfferAccessError(
      error.message || "Access denied.",
      403
    );
  }

  if (error.code === "22023") {
    throw new OfferAccessError(
      error.message || "Invalid request.",
      400
    );
  }

  console.error(
    "Offer request database error",
    error
  );

  throw new OfferAccessError(
    "Unable to save offer request. Check that the offer approval SQL is installed.",
    500
  );
}