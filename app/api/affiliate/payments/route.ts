import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAGE_SIZE = 1000;
const MINIMUM_WITHDRAWAL = 50;
const MAXIMUM_WITHDRAWAL = 1000000;

const PAYMENT_METHODS = [
  "Payoneer",
  "Skrill",
  "Binance Pay",
  "USDT (TRC20)",
  "USDT (ERC20)",
  "Bitcoin (BTC)",
  "Bank Wire Transfer",
] as const;

type ClickRow = {
  status: string | null;
  payout: number | string | null;
  converted_at: string | null;
};

type PaymentRow = {
  id: string;
  affiliate_id: string;
  amount: number | string;
  currency: string;
  payment_method: string;
  payment_address: string;
  status: string;
  admin_note: string | null;
  requested_at: string;
  processed_at: string | null;
  created_at: string;
};

const CONVERTED_STATUSES = new Set([
  "converted",
  "conversion",
  "approved",
  "paid",
]);

function responseError(error: string, status: number) {
  return NextResponse.json(
    { success: false, error },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

function amount(value: unknown): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isConverted(row: ClickRow): boolean {
  const status = String(row.status || "").trim().toLowerCase();
  return (
    CONVERTED_STATUSES.has(status) ||
    Boolean(row.converted_at)
  );
}

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase server configuration is missing.");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

async function authenticate(
  request: NextRequest,
  supabase: ReturnType<typeof createAdminClient>
) {
  const token = getBearerToken(request);

  if (!token) {
    return {
      affiliateId: null,
      error: "Authentication required.",
      status: 401,
    };
  }

  const { data: authData, error: authError } =
    await supabase.auth.getUser(token);

  const user = authData?.user;

  if (authError || !user) {
    return {
      affiliateId: null,
      error: "Invalid or expired session.",
      status: 401,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, affiliate_id, application_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return {
      affiliateId: null,
      error: "Affiliate profile not found.",
      status: 404,
    };
  }

  const applicationStatus = String(
    profile.application_status || ""
  ).trim().toLowerCase();

  if (
    applicationStatus !== "approved" &&
    applicationStatus !== "active"
  ) {
    return {
      affiliateId: null,
      error: "Affiliate account is not approved.",
      status: 403,
    };
  }

  const affiliateId = String(profile.affiliate_id || "").trim();

  if (!affiliateId) {
    return {
      affiliateId: null,
      error: "Affiliate ID is unavailable.",
      status: 400,
    };
  }

  return {
    affiliateId,
    error: null,
    status: 200,
  };
}

async function readAllClicks(
  supabase: ReturnType<typeof createAdminClient>,
  affiliateId: string
): Promise<ClickRow[]> {
  const rows: ClickRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("clicks")
      .select("status, payout, converted_at")
      .eq("affiliate_id", affiliateId)
      .order("created_at", { ascending: false })
      .order("click_id", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error("Unable to load affiliate earnings.");
    }

    const page = (data || []) as ClickRow[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

async function readAllPayments(
  supabase: ReturnType<typeof createAdminClient>,
  affiliateId: string
): Promise<PaymentRow[]> {
  const rows: PaymentRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("payment_requests")
      .select(
        "id, affiliate_id, amount, currency, payment_method, payment_address, status, admin_note, requested_at, processed_at, created_at"
      )
      .eq("affiliate_id", affiliateId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error("Unable to load payment history.");
    }

    const page = (data || []) as PaymentRow[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const auth = await authenticate(request, supabase);

    if (!auth.affiliateId) {
      return responseError(
        auth.error || "Unauthorized.",
        auth.status
      );
    }

    const affiliateId = auth.affiliateId;

    const [clicks, payments] = await Promise.all([
      readAllClicks(supabase, affiliateId),
      readAllPayments(supabase, affiliateId),
    ]);

    let totalEarnings = 0;
    let conversions = 0;

    for (const click of clicks) {
      if (isConverted(click)) {
        conversions++;
        totalEarnings += amount(click.payout);
      }
    }

    let pendingAmount = 0;
    let approvedAmount = 0;
    let paidAmount = 0;
    let rejectedAmount = 0;

    for (const payment of payments) {
      const value = amount(payment.amount);

      switch (String(payment.status).toLowerCase()) {
        case "pending":
          pendingAmount += value;
          break;
        case "approved":
          approvedAmount += value;
          break;
        case "paid":
          paidAmount += value;
          break;
        case "rejected":
          rejectedAmount += value;
          break;
      }
    }

    const reservedAmount =
      pendingAmount + approvedAmount + paidAmount;

    const availableBalance = Math.max(
      0,
      roundMoney(totalEarnings - reservedAmount)
    );

    return NextResponse.json(
      {
        success: true,
        affiliateId,
        currency: "USD",
        stats: {
          totalEarnings: roundMoney(totalEarnings),
          conversions,
          pendingAmount: roundMoney(pendingAmount),
          approvedAmount: roundMoney(approvedAmount),
          paidAmount: roundMoney(paidAmount),
          rejectedAmount: roundMoney(rejectedAmount),
          reservedAmount: roundMoney(reservedAmount),
          availableBalance,
          totalRequests: payments.length,
        },
        payments: payments.map((payment) => ({
          id: payment.id,
          amount: amount(payment.amount),
          currency: payment.currency,
          paymentMethod: payment.payment_method,
          paymentAddress: payment.payment_address,
          status: payment.status,
          adminNote: payment.admin_note,
          requestedAt: payment.requested_at,
          processedAt: payment.processed_at,
        })),
        withdrawalEnabled: true,
        minimumWithdrawal: MINIMUM_WITHDRAWAL,
        paymentMethods: PAYMENT_METHODS,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Affiliate payments GET error:", error);
    return responseError("Unable to load affiliate payments.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const auth = await authenticate(request, adminClient);

    if (!auth.affiliateId) {
      return responseError(
        auth.error || "Unauthorized.",
        auth.status
      );
    }

    const token = getBearerToken(request);

    if (!token) {
      return responseError("Authentication required.", 401);
    }

    let body: Record<string, unknown>;

    try {
      const parsed: unknown = await request.json();

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        return responseError("Invalid request body.", 400);
      }

      body = parsed as Record<string, unknown>;
    } catch {
      return responseError("Invalid JSON request.", 400);
    }

    const requestedAmount = body.amount;
    const paymentMethod = body.paymentMethod;
    const paymentAddress = body.paymentAddress;

    if (
      typeof requestedAmount !== "number" ||
      !Number.isFinite(requestedAmount) ||
      requestedAmount < MINIMUM_WITHDRAWAL ||
      requestedAmount > MAXIMUM_WITHDRAWAL ||
      Math.round(requestedAmount * 100) / 100 !==
        requestedAmount
    ) {
      return responseError(
        "Amount must be between $50 and $1,000,000 USD with at most 2 decimal places.",
        400
      );
    }

    if (
      typeof paymentMethod !== "string" ||
      !PAYMENT_METHODS.some(
        (method) => method === paymentMethod.trim()
      )
    ) {
      return responseError("Unsupported payment method.", 400);
    }

    if (
      typeof paymentAddress !== "string" ||
      paymentAddress.trim().length < 3 ||
      paymentAddress.trim().length > 500
    ) {
      return responseError("Enter a valid payment address.", 400);
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      return responseError(
        "Supabase client configuration is missing.",
        500
      );
    }

    const affiliateClient = createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: requestId, error: rpcError } =
      await affiliateClient.rpc(
        "request_affiliate_withdrawal",
        {
          p_amount: requestedAmount,
          p_payment_method: paymentMethod.trim(),
          p_payment_address: paymentAddress.trim(),
        }
      );

    if (rpcError) {
      const message = String(rpcError.message || "");

      if (message.includes("Insufficient available balance")) {
        return responseError(
          "Insufficient available balance.",
          400
        );
      }

      if (
        message.includes("Minimum withdrawal") ||
        message.includes("Unsupported payment method") ||
        message.includes("Invalid payment address")
      ) {
        return responseError(message, 400);
      }

      if (
        message.includes("Approved affiliate account required")
      ) {
        return responseError(
          "Affiliate account is not approved.",
          403
        );
      }

      if (message.includes("Authentication required")) {
        return responseError("Authentication required.", 401);
      }

      console.error(
        "Withdrawal RPC error:",
        rpcError.code,
        rpcError.message
      );

      return responseError(
        "Unable to submit withdrawal request.",
        500
      );
    }

    if (typeof requestId !== "string" || !requestId) {
      return responseError(
        "Withdrawal request was not confirmed.",
        500
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Withdrawal request submitted successfully.",
        requestId,
        status: "pending",
      },
      {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Affiliate withdrawal POST error:", error);
    return responseError(
      "Unable to submit withdrawal request.",
      500
    );
  }
}