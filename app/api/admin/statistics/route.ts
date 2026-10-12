import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAGE_SIZE = 1000;
const MAX_ROWS = 100000;

type Click = {
  affiliate_id: string | null;
  status: string | null;
  payout: number | string | null;
  converted_at: string | null;
  created_at: string | null;
};

function converted(click: Click) {
  return (
    Boolean(click.converted_at) ||
    ["converted", "conversion", "approved", "paid"].includes(
      String(click.status || "").toLowerCase()
    )
  );
}

function reply(
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
      return reply(
        {
          success: false,
          error: "Admin access required.",
        },
        401
      );
    }

    const supabase = session.client;

    const params = request.nextUrl.searchParams;
    const from = params.get("from") || "";
    const to = params.get("to") || "";

    const validDate = (value: string) =>
      !value ||
      (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
        !Number.isNaN(Date.parse(value)));

    if (
      !validDate(from) ||
      !validDate(to) ||
      (from && to && from > to)
    ) {
      return reply(
        {
          success: false,
          error: "Invalid date range.",
        },
        400
      );
    }

    const rows: Click[] = [];
    let offset = 0;

    while (true) {
      let query = supabase
        .from("clicks")
        .select(
          "affiliate_id,status,payout,converted_at,created_at"
        )
        .order("created_at", {
          ascending: false,
        })
        .range(offset, offset + PAGE_SIZE - 1);

      if (from) {
        query = query.gte(
          "created_at",
          `${from}T00:00:00.000Z`
        );
      }

      if (to) {
        const end = new Date(`${to}T00:00:00.000Z`);
        end.setUTCDate(end.getUTCDate() + 1);

        query = query.lt(
          "created_at",
          end.toISOString()
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error("Statistics query error:", error);

        return reply(
          {
            success: false,
            error: "Unable to load statistics.",
          },
          500
        );
      }

      const page = (data || []) as Click[];
      rows.push(...page);

      if (rows.length >= MAX_ROWS) {
        return reply(
          {
            success: false,
            error:
              "Too many records for this report. Select a smaller date range.",
          },
          413
        );
      }

      if (page.length < PAGE_SIZE) break;

      offset += PAGE_SIZE;
    }

    const affiliateMap = new Map<
      string,
      {
        affiliate_id: string;
        clicks: number;
        conversions: number;
        earnings: number;
      }
    >();

    let conversions = 0;
    let earnings = 0;

    for (const click of rows) {
      const affiliateId =
        click.affiliate_id || "Unassigned";

      if (!affiliateMap.has(affiliateId)) {
        affiliateMap.set(affiliateId, {
          affiliate_id: affiliateId,
          clicks: 0,
          conversions: 0,
          earnings: 0,
        });
      }

      const item = affiliateMap.get(affiliateId)!;
      item.clicks++;

      if (converted(click)) {
        const payout = Number(click.payout || 0);

        const amount = Number.isFinite(payout)
          ? payout
          : 0;

        conversions++;
        earnings += amount;
        item.conversions++;
        item.earnings += amount;
      }
    }

    const affiliates = Array.from(
      affiliateMap.values()
    )
      .map((item) => ({
        ...item,
        earnings: Number(item.earnings.toFixed(2)),
        conversionRate: item.clicks
          ? Number(
              (
                (item.conversions / item.clicks) *
                100
              ).toFixed(2)
            )
          : 0,
      }))
      .sort((a, b) => b.earnings - a.earnings);

    return reply({
      success: true,
      stats: {
        clicks: rows.length,
        conversions,
        earnings: Number(earnings.toFixed(2)),
        conversionRate: rows.length
          ? Number(
              (
                (conversions / rows.length) *
                100
              ).toFixed(2)
            )
          : 0,
      },
      affiliates,
      period: {
        from,
        to,
      },
    });
  } catch (error) {
    console.error("Admin statistics error:", error);

    return reply(
      {
        success: false,
        error: "Statistics request failed.",
      },
      500
    );
  }
}
