import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { processPendingPaymentEmails } from "@/lib/payment-notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function reply(
  data: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}

export async function POST(request: NextRequest) {
  const secret =
    process.env.PAYMENT_EMAIL_JOB_SECRET?.trim();

  if (!secret || secret.length < 32) {
    return reply(
      {
        success: false,
        error:
          "Payment email job secret is not configured.",
      },
      503
    );
  }

  const header =
    request.headers.get("authorization") || "";

  const provided = header.startsWith("Bearer ")
    ? header.slice(7).trim()
    : "";

  const suppliedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(secret);

  if (
    suppliedBytes.length !== expectedBytes.length ||
    !timingSafeEqual(
      suppliedBytes,
      expectedBytes
    )
  ) {
    return reply(
      {
        success: false,
        error: "Unauthorized.",
      },
      401
    );
  }

  try {
    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        "Supabase server configuration missing."
      );
    }

    const client = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const outcomes =
      await processPendingPaymentEmails(client);

    return reply({
      success: true,
      checked: outcomes.length,

      accepted: outcomes.filter(
        (item) => item.status === "sent"
      ).length,

      failed: outcomes.filter(
        (item) => item.status === "failed"
      ).length,

      processing: outcomes.filter(
        (item) => item.status === "processing"
      ).length,

      skipped: outcomes.filter(
        (item) => item.status === "skipped"
      ).length,
    });
  } catch (error) {
    console.error(
      "Scheduled payment email processing failed:",
      error
    );

    return reply(
      {
        success: false,
        error: "Payment email job failed.",
      },
      500
    );
  }
}
