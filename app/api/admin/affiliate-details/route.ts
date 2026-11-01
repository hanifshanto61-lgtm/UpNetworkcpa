import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAGE_SIZE = 1000;
const MAX_ROWS = 50000;

function response(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}

function safeNumber(value: unknown): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

async function readAll(
  db: any,
  table: string,
  select: string,
  orderColumn = "created_at"
): Promise<any[]> {
  const rows: any[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await db
      .from(table)
      .select(select)
      .order(orderColumn, { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }

    const page = data || [];
    rows.push(...page);

    if (rows.length > MAX_ROWS) {
      throw new Error(`${table} report exceeds the supported limit.`);
    }

    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);

    if (!session) {
      return response(
        { success: false, error: "Admin access required." },
        401
      );
    }

    const db = session.client;
    const params = request.nextUrl.searchParams;

    const affiliateId = String(
      params.get("affiliate_id") || ""
    ).trim();

    const search = normalize(params.get("search"));
    const statusFilter = normalize(params.get("status"));

    // Load profiles. Historical archived affiliates are handled
    // separately and are not mixed into the active profile list.
    let profileQuery = db
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (affiliateId) {
      profileQuery = profileQuery.eq("affiliate_id", affiliateId);
    }

    if (statusFilter && statusFilter !== "all") {
      profileQuery = profileQuery.eq(
        "application_status",
        statusFilter
      );
    }

    if (search) {
      profileQuery = profileQuery.or(
        `affiliate_id.ilike.%${search}%,email.ilike.%${search}%,full_name.ilike.%${search}%,username.ilike.%${search}%`
      );
    }

    const { data: profiles, error: profileError } =
      await profileQuery.limit(5000);

    if (profileError) {
      throw new Error(`Profiles: ${profileError.message}`);
    }

    const profileRows = profiles || [];

    if (affiliateId && profileRows.length === 0) {
      return response(
        { success: false, error: "Affiliate not found." },
        404
      );
    }

    const ids = profileRows
      .map((profile: any) => String(profile.affiliate_id || "").trim())
      .filter(Boolean);

    if (ids.length === 0) {
      return response({
        success: true,
        affiliates: [],
        affiliate: null,
        message: "No matching affiliates found.",
      });
    }

    // Read tracking and financial history without modifying it.
    const [clicks, conversions, payments, referrals, commissions] =
      await Promise.all([
        readAll(
          db,
          "clicks",
          "id,click_id,affiliate_id,offer_id,smartlink_id,country,city,region,postal_code,timezone,device,browser,operating_system,referer,created_at,payout,status,converted_at,gross_revenue,network_profit,traffic_source,campaign,visitor_hash,is_suspicious,user_agent,ip_address,isp,asn,worker_sub_id,review_status,review_note,reviewed_at,reviewed_by,lead_status,lead_status_note,lead_status_updated_at,lead_status_updated_by"
        ),
        readAll(
          db,
          "conversions",
          "id,click_id,affiliate_id,payout,status,converted_at,created_at,updated_at"
        ),
        readAll(
          db,
          "payment_requests",
          "id,affiliate_id,amount,currency,payment_method,payment_address,status,admin_note,requested_at,processed_at,created_at,updated_at,withdrawal_fee"
        ),
        readAll(
          db,
          "referrals",
          "id,referrer_affiliate_id,referred_user_id,referred_affiliate_id,status,created_at"
        ),
        readAll(
          db,
          "referral_commissions",
          "id,referrer_affiliate_id,referred_affiliate_id,click_id,source_earnings,commission_rate,commission_amount,status,created_at,paid_at"
        ),
      ]);

    const buildReport = (profile: any) => {
      const id = String(profile.affiliate_id || "").trim();

      const affiliateClicks = clicks.filter(
        (row: any) => String(row.affiliate_id || "").trim() === id
      );

      const affiliateConversions = conversions.filter(
        (row: any) => String(row.affiliate_id || "").trim() === id
      );

      const affiliatePayments = payments.filter(
        (row: any) => String(row.affiliate_id || "").trim() === id
      );

      const affiliateReferrals = referrals.filter(
        (row: any) =>
          String(row.referrer_affiliate_id || "").trim() === id ||
          String(row.referred_affiliate_id || "").trim() === id
      );

      const affiliateCommissions = commissions.filter(
        (row: any) =>
          String(row.referrer_affiliate_id || "").trim() === id ||
          String(row.referred_affiliate_id || "").trim() === id
      );

      const leadCounts = {
        approved: 0,
        pending: 0,
        rejected: 0,
        hold: 0,
        fraud: 0,
        other: 0,
      };

      for (const click of affiliateClicks) {
        const leadStatus = normalize(click.lead_status);
        const reviewStatus = normalize(click.review_status);

        if (reviewStatus === "fraud") {
          leadCounts.fraud++;
        } else if (leadStatus === "approved") {
          leadCounts.approved++;
        } else if (leadStatus === "pending") {
          leadCounts.pending++;
        } else if (leadStatus === "rejected") {
          leadCounts.rejected++;
        } else if (leadStatus === "hold") {
          leadCounts.hold++;
        } else {
          leadCounts.other++;
        }
      }

      const conversionEarnings = affiliateConversions.reduce(
        (sum: number, row: any) => {
          const status = normalize(row.status);
          if (status === "approved" || status === "paid") {
            return sum + safeNumber(row.payout);
          }
          return sum;
        },
        0
      );

      const paymentTotals = {
        pending: 0,
        approved: 0,
        paid: 0,
        rejected: 0,
      };

      for (const payment of affiliatePayments) {
        const status = normalize(payment.status);
        if (status in paymentTotals) {
          paymentTotals[status as keyof typeof paymentTotals] +=
            safeNumber(payment.amount);
        }
      }

      const referralTotal = affiliateReferrals.filter(
        (row: any) =>
          String(row.referrer_affiliate_id || "").trim() === id
      ).length;

      const commissionTotal = affiliateCommissions
        .filter(
          (row: any) =>
            String(row.referrer_affiliate_id || "").trim() === id
        )
        .reduce(
          (sum: number, row: any) =>
            sum + safeNumber(row.commission_amount),
          0
        );

      return {
        affiliate: profile,
        stats: {
          totalClicks: affiliateClicks.length,
          uniqueVisitors: new Set(
            affiliateClicks
              .map((row: any) => row.visitor_hash)
              .filter(Boolean)
          ).size,
          totalConversions: affiliateConversions.length,
          conversionRate:
            affiliateClicks.length > 0
              ? money(
                  (affiliateConversions.length /
                    affiliateClicks.length) *
                    100
                )
              : 0,
          leadCounts,
          conversionEarnings: money(conversionEarnings),
          paymentTotals: {
            pending: money(paymentTotals.pending),
            approved: money(paymentTotals.approved),
            paid: money(paymentTotals.paid),
            rejected: money(paymentTotals.rejected),
          },
          referralCount: referralTotal,
          referralCommissionTotal: money(commissionTotal),
        },
        clicks: affiliateClicks,
        conversions: affiliateConversions,
        payments: affiliatePayments,
        referrals: affiliateReferrals,
        commissions: affiliateCommissions,
      };
    };

    const reports = profileRows.map(buildReport);

    if (affiliateId) {
      return response({
        success: true,
        ...reports[0],
      });
    }

    return response({
      success: true,
      affiliates: reports.map((report: any) => ({
        affiliate: report.affiliate,
        stats: report.stats,
      })),
      total: reports.length,
    });
  } catch (error: any) {
    console.error("Affiliate Details API error:", error);

    return response(
      {
        success: false,
        error: "Unable to load Affiliate Details.",
        details: error?.message || "Unknown server error.",
      },
      500
    );
  }
}