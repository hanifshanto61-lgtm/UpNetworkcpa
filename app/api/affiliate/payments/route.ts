import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  createClient,
} from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAGE_SIZE = 1000;

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

function responseError(
  error: string,
  status: number
) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

function amount(value: unknown): number {
  const number = Number(value ?? 0);

  return Number.isFinite(number)
    ? number
    : 0;
}

function roundMoney(value: number): number {
  return Math.round(
    (value + Number.EPSILON) * 100
  ) / 100;
}

function isConverted(row: ClickRow): boolean {
  const status = String(
    row.status || ""
  ).trim().toLowerCase();

  return (
    CONVERTED_STATUSES.has(status) ||
    Boolean(row.converted_at)
  );
}

function createAdminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

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

function getBearerToken(
  request: NextRequest
): string | null {
  const authorization =
    request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const match = authorization.match(
    /^Bearer\s+(.+)$/i
  );

  return match?.[1]?.trim() || null;
}

async function authenticate(
  request: NextRequest,
  supabase: ReturnType<
    typeof createAdminClient
  >
) {
  const token = getBearerToken(request);

  if (!token) {
    return {
      affiliateId: null,
      error: "Authentication required.",
      status: 401,
    };
  }

  const {
    data: authData,
    error: authError,
  } = await supabase.auth.getUser(token);

  const user = authData?.user;

  if (authError || !user) {
    return {
      affiliateId: null,
      error: "Invalid or expired session.",
      status: 401,
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      "id, affiliate_id, application_status"
    )
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

  const affiliateId = String(
    profile.affiliate_id || ""
  ).trim();

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
  supabase: ReturnType<
    typeof createAdminClient
  >,
  affiliateId: string
): Promise<ClickRow[]> {
  const rows: ClickRow[] = [];

  let offset = 0;

  while (true) {
    const {
      data,
      error,
    } = await supabase
      .from("clicks")
      .select(
        "status, payout, converted_at"
      )
      .eq("affiliate_id", affiliateId)
      .order("created_at", {
        ascending: false,
      })
      .order("click_id", {
        ascending: false,
      })
      .range(
        offset,
        offset + PAGE_SIZE - 1
      );

    if (error) {
      throw new Error(
        "Unable to load affiliate earnings."
      );
    }

    const page = (data || []) as ClickRow[];

    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  return rows;
}

async function readAllPayments(
  supabase: ReturnType<
    typeof createAdminClient
  >,
  affiliateId: string
): Promise<PaymentRow[]> {
  const rows: PaymentRow[] = [];

  let offset = 0;

  while (true) {
    const {
      data,
      error,
    } = await supabase
      .from("payment_requests")
      .select(
        "id, affiliate_id, amount, currency, payment_method, payment_address, status, admin_note, requested_at, processed_at, created_at"
      )
      .eq("affiliate_id", affiliateId)
      .order("created_at", {
        ascending: false,
      })
      .order("id", {
        ascending: false,
      })
      .range(
        offset,
        offset + PAGE_SIZE - 1
      );

    if (error) {
      throw new Error(
        "Unable to load payment history."
      );
    }

    const page = (data || []) as PaymentRow[];

    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  return rows;
}

export async function GET(
  request: NextRequest
) {
  try {
    const supabase = createAdminClient();

    const auth = await authenticate(
      request,
      supabase
    );

    if (!auth.affiliateId) {
      return responseError(
        auth.error || "Unauthorized.",
        auth.status
      );
    }

    const affiliateId = auth.affiliateId;

    const [clicks, payments] =
      await Promise.all([
        readAllClicks(
          supabase,
          affiliateId
        ),
        readAllPayments(
          supabase,
          affiliateId
        ),
      ]);

    let totalEarnings = 0;
    let conversions = 0;

    for (const click of clicks) {
      if (isConverted(click)) {
        conversions++;

        totalEarnings += amount(
          click.payout
        );
      }
    }

    let pendingAmount = 0;
    let approvedAmount = 0;
    let paidAmount = 0;
    let rejectedAmount = 0;

    for (const payment of payments) {
      const value = amount(
        payment.amount
      );

      switch (
        String(payment.status).toLowerCase()
      ) {
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
      pendingAmount +
      approvedAmount +
      paidAmount;

    const availableBalance = Math.max(
      0,
      roundMoney(
        totalEarnings - reservedAmount
      )
    );

    return NextResponse.json(
      {
        success: true,

        affiliateId,

        currency: "USD",

        stats: {
          totalEarnings: roundMoney(
            totalEarnings
          ),
          conversions,
          pendingAmount: roundMoney(
            pendingAmount
          ),
          approvedAmount: roundMoney(
            approvedAmount
          ),
          paidAmount: roundMoney(
            paidAmount
          ),
          rejectedAmount: roundMoney(
            rejectedAmount
          ),
          reservedAmount: roundMoney(
            reservedAmount
          ),
          availableBalance,
          totalRequests: payments.length,
        },

        payments: payments.map(
          (payment) => ({
            id: payment.id,
            amount: amount(
              payment.amount
            ),
            currency:
              payment.currency,
            paymentMethod:
              payment.payment_method,
            paymentAddress:
              payment.payment_address,
            status: payment.status,
            adminNote:
              payment.admin_note,
            requestedAt:
              payment.requested_at,
            processedAt:
              payment.processed_at,
          })
        ),

        withdrawalEnabled: false,

        message:
          "Payment history is available. Withdrawal requests will be enabled after secure balance reservation is configured.",
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error(
      "Affiliate payments GET error:",
      error
    );

    return responseError(
      "Unable to load affiliate payments.",
      500
    );
  }
}

export async function POST(
  _request: NextRequest
) {
  return responseError(
    "Withdrawal requests are temporarily disabled until secure balance reservation is configured.",
    503
  );
}