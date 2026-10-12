import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminSession } from "@/lib/admin-auth";
import { processPaymentEmail } from "@/lib/payment-notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const PAGE_SIZE = 1000;

type PaymentStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "paid";

type PaymentRow = {
  id: string;
  affiliate_id: string;
  amount: number | string;
  currency: string;
  payment_method: string;
  payment_address: string;
  status: PaymentStatus;
  admin_note: string | null;
  requested_at: string;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
};

function respond(
  success: boolean,
  message: string,
  status = 200
) {
  return NextResponse.json(
    { success, message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase server configuration is missing."
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getAffiliateClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase client configuration is missing."
    );
  }

  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function authorize(request: NextRequest) {
  const session = await getAdminSession(request);

  if (!session) return null;

  const token = request.headers
    .get("authorization")!
    .slice(7)
    .trim();

  return {
    client: session.client,
    token,
  };
}

async function readAllPayments(
  client: ReturnType<typeof getAdminClient>
): Promise<PaymentRow[]> {
  const payments: PaymentRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await client
      .from("payment_requests")
      .select(
        "id,affiliate_id,amount,currency,payment_method,payment_address,status,admin_note,requested_at,processed_at,created_at,updated_at"
      )
      .order("created_at", {
        ascending: false,
      })
      .order("id", {
        ascending: false,
      })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(
        "Unable to load payment requests."
      );
    }

    const page = (data || []) as PaymentRow[];

    payments.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  return payments;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authorize(request);

    if (!auth) {
      return respond(
        false,
        "Admin access required.",
        401
      );
    }

    const payments = await readAllPayments(auth.client);

    let pendingAmount = 0;
    let approvedAmount = 0;
    let paidAmount = 0;
    let rejectedAmount = 0;

    let pendingCount = 0;
    let approvedCount = 0;
    let paidCount = 0;
    let rejectedCount = 0;

    for (const payment of payments) {
      const value = Number(payment.amount || 0);

      const safeAmount =
        Number.isFinite(value) ? value : 0;

      switch (payment.status) {
        case "pending":
          pendingAmount += safeAmount;
          pendingCount++;
          break;

        case "approved":
          approvedAmount += safeAmount;
          approvedCount++;
          break;

        case "paid":
          paidAmount += safeAmount;
          paidCount++;
          break;

        case "rejected":
          rejectedAmount += safeAmount;
          rejectedCount++;
          break;
      }
    }

    return NextResponse.json(
      {
        success: true,
        currency: "USD",
        minimumWithdrawal: 50,

        stats: {
          totalRequests: payments.length,
          pendingCount,
          approvedCount,
          paidCount,
          rejectedCount,
          pendingAmount,
          approvedAmount,
          paidAmount,
          rejectedAmount,
        },

        payments: payments.map((payment) => ({
          id: payment.id,
          affiliateId: payment.affiliate_id,
          amount: Number(payment.amount),
          currency: payment.currency,
          paymentMethod: payment.payment_method,
          paymentAddress: payment.payment_address,
          status: payment.status,
          adminNote: payment.admin_note,
          requestedAt: payment.requested_at,
          processedAt: payment.processed_at,
          createdAt: payment.created_at,
          updatedAt: payment.updated_at,
        })),
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Admin payments GET error:", error);

    return respond(
      false,
      "Unable to load payment requests.",
      500
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authorize(request);

    if (!auth) {
      return respond(
        false,
        "Admin access required.",
        401
      );
    }

    let body: Record<string, unknown>;

    try {
      const parsed: unknown = await request.json();

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        return respond(
          false,
          "Invalid request body.",
          400
        );
      }

      body = parsed as Record<string, unknown>;
    } catch {
      return respond(
        false,
        "Invalid JSON.",
        400
      );
    }

    const requestId = String(
      body.requestId || ""
    ).trim();

    const status = String(
      body.status || ""
    ).trim().toLowerCase();

    const adminNote = String(
      body.adminNote || ""
    ).trim();

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(requestId)) {
      return respond(
        false,
        "Invalid payment request ID.",
        400
      );
    }

    if (
      status !== "approved" &&
      status !== "rejected" &&
      status !== "paid"
    ) {
      return respond(
        false,
        "Invalid payment status.",
        400
      );
    }

    if (adminNote.length > 1000) {
      return respond(
        false,
        "Admin note is too long.",
        400
      );
    }

    // Keep the admin's identity for database authorization.
    const affiliateClient =
      getAffiliateClient(auth.token);

    const { data, error } = await affiliateClient.rpc(
      "admin_update_payment_status",
      {
        p_request_id: requestId,
        p_new_status: status,
        p_admin_note: adminNote || null,
      }
    );

    if (error) {
      const message = String(error.message || "");

      if (
        message.includes(
          "Invalid payment status transition"
        )
      ) {
        return respond(
          false,
          "This payment status change is not allowed. Refresh the list.",
          409
        );
      }

      if (message.includes("Payment request not found")) {
        return respond(
          false,
          "Payment request not found.",
          404
        );
      }

      if (message.includes("Admin access required")) {
        return respond(
          false,
          "Admin access required.",
          403
        );
      }

      console.error(
        "Admin payment status RPC error:",
        error.code,
        error.message
      );

      return respond(
        false,
        "Unable to update payment status.",
        500
      );
    }

    // The Paid transaction has already committed.
    // Its trigger created the notification record.
    const email =
      status === "paid"
        ? await processPaymentEmail(
            auth.client,
            requestId
          )
        : null;

    if (email?.error) {
      console.error(
        "Payment email notification:",
        requestId,
        email.error
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          status === "paid"
            ? "Payment marked Paid."
            : "Payment status updated successfully.",
        result: data,
        emailStatus: email?.status ?? null,
        emailError: email?.error ?? null,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Admin payments PATCH error:", error);

    return respond(
      false,
      "Unable to update payment status.",
      500
    );
  }
}
