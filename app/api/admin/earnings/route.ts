import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAGE_SIZE = 1000;
const MAX_ROWS = 100000;

type ClickRow = {
  click_id: string;
  affiliate_id: string | null;
  status: string | null;
  payout: number | string | null;
  converted_at: string | null;
  created_at: string | null;
};

type PaymentRow = {
  affiliate_id: string;
  amount: number | string;
  withdrawal_fee: number | string;
  status: string;
};

type AffiliateReport = {
  affiliate_id: string;
  clicks: number;
  conversions: number;
  earnings: number;
  paid: number;
  paidFees: number;
  balance: number;
};

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function amount(value: number | string | null): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function isConverted(row: ClickRow): boolean {
  return (
    Boolean(row.converted_at) ||
    ["converted", "conversion", "approved", "paid"].includes(
      String(row.status || "").toLowerCase()
    )
  );
}

function respond(
  data: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);

    if (!session) {
      return respond(
        {
          success: false,
          error: "Admin access required.",
        },
        401
      );
    }

    const db = session.client;

    const reports = new Map<string, AffiliateReport>();

    const getReport = (id: string): AffiliateReport => {
      const existing = reports.get(id);

      if (existing) {
        return existing;
      }

      const newReport: AffiliateReport = {
        affiliate_id: id,
        clicks: 0,
        conversions: 0,
        earnings: 0,
        paid: 0,
        paidFees: 0,
        balance: 0,
      };

      reports.set(id, newReport);

      return newReport;
    };

    let totalClicks = 0;
    let totalConversions = 0;
    let totalEarnings = 0;
    let totalPaid = 0;
    let totalPaidFees = 0;

    const history: Array<{
      click_id: string;
      affiliate_id: string;
      payout: number;
      status: string;
      date: string | null;
    }> = [];

    let offset = 0;

    // Load click and conversion earnings.
    while (true) {
      const { data, error } = await db
        .from("clicks")
        .select(
          "click_id,affiliate_id,status,payout,converted_at,created_at"
        )
        .order("created_at", {
          ascending: false,
        })
        .order("click_id", {
          ascending: false,
        })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.error("Admin earnings clicks:", error);

        return respond(
          {
            success: false,
            error: "Unable to load conversion earnings.",
          },
          500
        );
      }

      const page = (data || []) as ClickRow[];

      if (offset + page.length > MAX_ROWS) {
        return respond(
          {
            success: false,
            error: "Report exceeds the supported record limit.",
          },
          413
        );
      }

      for (const row of page) {
        const id = row.affiliate_id || "Unassigned";
        const report = getReport(id);

        report.clicks++;
        totalClicks++;

        if (!isConverted(row)) {
          continue;
        }

        const payout = amount(row.payout);

        report.conversions++;
        report.earnings += payout;

        totalConversions++;
        totalEarnings += payout;

        history.push({
          click_id: row.click_id,
          affiliate_id: id,
          payout: money(payout),
          status: row.status || "converted",
          date: row.converted_at || row.created_at,
        });
      }

      if (page.length < PAGE_SIZE) {
        break;
      }

      offset += PAGE_SIZE;
    }

    // Load completed payment records.
    offset = 0;

    while (true) {
      const { data, error } = await db
        .from("payment_requests")
        .select("affiliate_id,amount,withdrawal_fee,status")
        .order("id", {
          ascending: false,
        })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.error("Admin earnings payments:", error);

        return respond(
          {
            success: false,
            error: "Unable to load paid payment records.",
          },
          500
        );
      }

      const page = (data || []) as PaymentRow[];

      if (offset + page.length > MAX_ROWS) {
        return respond(
          {
            success: false,
            error:
              "Payment report exceeds the supported record limit.",
          },
          413
        );
      }

      for (const payment of page) {
        if (payment.status !== "paid") {
          continue;
        }

        const value = amount(payment.amount);

        const report = getReport(
          payment.affiliate_id || "Unassigned"
        );

        report.paid += value;
        report.paidFees += amount(payment.withdrawal_fee);
        totalPaidFees += amount(payment.withdrawal_fee);
        totalPaid += value;
      }

      if (page.length < PAGE_SIZE) {
        break;
      }

      offset += PAGE_SIZE;
    }

    const affiliates = Array.from(reports.values())
      .map((item) => ({
        ...item,
        earnings: money(item.earnings),
        paid: money(item.paid),
        paidFees: money(item.paidFees),
        balance: money(item.earnings - item.paid - item.paidFees),
      }))
      .sort((a, b) => b.earnings - a.earnings);

    history.sort((a, b) =>
      String(b.date || "").localeCompare(
        String(a.date || "")
      )
    );

    return respond({
      success: true,
      currency: "USD",
      stats: {
        clicks: totalClicks,
        conversions: totalConversions,
        earnings: money(totalEarnings),
        paid: money(totalPaid),
        paidFees: money(totalPaidFees),
        balance: money(totalEarnings - totalPaid - totalPaidFees),
      },
      affiliates,
      history: history.slice(0, 100),
    });
  } catch (error) {
    console.error("Admin earnings error:", error);

    return respond(
      {
        success: false,
        error: "Unable to load earnings report.",
      },
      500
    );
  }
}