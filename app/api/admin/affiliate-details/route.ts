import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAGE_SIZE = 1000;
const MAX_ROWS = 50000;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

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

function isConverted(row: any): boolean {
  return (
    Boolean(row.converted_at) ||
    ["converted", "conversion", "approved", "paid"].includes(
      normalize(row.status)
    )
  );
}

async function readAll(
  db: any,
  table: string,
  select: string,
  orderColumn = "created_at"
): Promise<any[]> {
  const rows: any[] = [];
  let offset = 0;
  let totalCount: number | null = null;

  while (true) {
    const { data, error, count } = await db
      .from(table)
      .select(select, { count: "exact" })
      .order(orderColumn, { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }

    if (totalCount === null && count !== null) {
      totalCount = count;
    }

    const page = data || [];

    if (page.length === 0) {
      break;
    }

    rows.push(...page);

    if (rows.length > MAX_ROWS) {
      throw new Error(`${table} report exceeds the supported limit.`);
    }

    // Move by the actual number of rows returned.
    // This also handles Supabase returning fewer rows than requested.
    offset += page.length;

    // Stop only after reading the exact total count.
    if (totalCount !== null && offset >= totalCount) {
      break;
    }

    // Safety fallback if the database does not return an exact count.
    if (totalCount === null && page.length < PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

export async function GET(request: NextRequest) {
  try {
    // Keep existing admin authorization.
    const session = await getAdminSession(request);

    if (!session) {
      return response(
        { success: false, error: "Admin access required." },
        401
      );
    }

    // Use service-role client only after admin verification.
    if (!supabaseAdmin) {
      return response(
        {
          success: false,
          error: "Supabase server configuration is missing.",
        },
        500
      );
    }

    const db = supabaseAdmin;
    const params = request.nextUrl.searchParams;

    const affiliateId = String(
      params.get("affiliate_id") || ""
    ).trim();

    const search = normalize(params.get("search"));
    const statusFilter = normalize(params.get("status"));

    // Load protected admin accounts
    const adminIds = new Set<string>();
    let adminOffset = 0;

    while (true) {
      const { data, error } = await db
        .from("admin_roles")
        .select("user_id")
        .range(adminOffset, adminOffset + 999);

      if (error) {
        throw new Error(`Admin roles: ${error.message}`);
      }

      const rows = data || [];

      for (const row of rows) {
        adminIds.add(String(row.user_id));
      }

      if (rows.length < 1000) break;
      adminOffset += rows.length;
    }

    // Load the same Auth users used by Affiliate Management
    const users: any[] = [];
    let authPage = 1;

    while (authPage <= 20) {
      const { data, error } =
        await db.auth.admin.listUsers({
          page: authPage,
          perPage: 1000,
        });

      if (error) {
        throw new Error(`Auth users: ${error.message}`);
      }

      const pageUsers = data?.users || [];
      users.push(...pageUsers);

      if (pageUsers.length < 1000) break;
      authPage++;
    }

    // Load profiles
    const profileRows: any[] = [];
    let profileOffset = 0;

    while (true) {
      const { data, error } = await db
        .from("profiles")
        .select("*")
        .range(profileOffset, profileOffset + 999);

      if (error) {
        throw new Error(`Profiles: ${error.message}`);
      }

      const page = data || [];

      if (page.length === 0) break;

      profileRows.push(...page);

      if (profileRows.length > MAX_ROWS) {
        throw new Error("Profiles exceed the supported limit.");
      }

      profileOffset += page.length;

      if (page.length < 1000) break;
    }

    const profileMap = new Map<string, any>();

    for (const profile of profileRows) {
      if (profile?.id) {
        profileMap.set(String(profile.id), profile);
      }
    }

    // Build the same affiliate list as Affiliate Management
    const allAffiliates = users
      .filter((user: any) => {
        if (adminIds.has(String(user.id))) return false;

        const metadata = user.user_metadata || {};
        const profile = profileMap.get(String(user.id));

        const accountType = normalize(
          metadata.account_type || profile?.account_type
        );

        return (
          accountType === "affiliate" ||
          Boolean(profile)
        );
      })
      .map((user: any) => {
        const metadata = user.user_metadata || {};
        const profile = profileMap.get(String(user.id)) || {};

        const firstName = String(
          metadata.first_name || profile.first_name || ""
        ).trim();

        const lastName = String(
          metadata.last_name || profile.last_name || ""
        ).trim();

        const fullName =
          [firstName, lastName].filter(Boolean).join(" ") ||
          profile.full_name ||
          metadata.full_name ||
          metadata.username ||
          user.email ||
          "Affiliate";

        const id =
          profile.affiliate_id ||
          metadata.affiliate_id ||
          metadata.affiliateId ||
          metadata.username ||
          `UP${String(user.id).replace(/-/g, "").slice(0, 10).toUpperCase()}`;

        const profileStatus = normalize(profile.application_status);
const metadataStatus = normalize(metadata.application_status);

const validStatuses = [
  "pending",
  "approved",
  "rejected",
  "suspended",
];

const applicationStatus = validStatuses.includes(profileStatus)
  ? profileStatus
  : validStatuses.includes(metadataStatus)
    ? metadataStatus
    : "pending";

        return {
          ...profile,
          id: user.id,
          affiliate_id: id,
          full_name: fullName,
          username: profile.username || metadata.username || "",
          email: user.email || profile.email || "",
          application_status: applicationStatus,
          created_at: user.created_at || profile.created_at || null,
          phone: profile.phone || metadata.phone || "",
          country: profile.country || metadata.country || "",
          city: profile.city || metadata.city || "",
        };
      });

    // Apply affiliate ID, search and status filters
    const matchingProfileRows = allAffiliates
      .filter((profile: any) => {
        if (
          affiliateId &&
          normalize(profile.affiliate_id) !== normalize(affiliateId)
        ) {
          return false;
        }

        if (
          statusFilter &&
          statusFilter !== "all" &&
          normalize(profile.application_status) !== statusFilter
        ) {
          return false;
        }

        if (search) {
          const searchable = [
            profile.affiliate_id,
            profile.email,
            profile.full_name,
            profile.username,
            profile.phone,
          ]
            .join(" ")
            .toLowerCase();

          if (!searchable.includes(search)) return false;
        }

        return true;
      })
      .sort((a: any, b: any) => {
        return (
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        );
      });

    console.info("AFFILIATE DETAILS DIAGNOSTIC:", {
      affiliateManagementSourceCount: allAffiliates.length,
      apiReturnedCount: matchingProfileRows.length,
      statusFilter: statusFilter || "all",
      searchApplied: Boolean(search),
    });

    if (affiliateId && matchingProfileRows.length === 0) {
      return response(
        { success: false, error: "Affiliate not found." },
        404
      );
    }

    const ids = matchingProfileRows
      .map((profile: any) =>
        String(profile.affiliate_id || "").trim()
      )
      .filter(Boolean);

    if (ids.length === 0) {
      return response({
        success: true,
        affiliates: [],
        affiliate: null,
        total: 0,
        message: "No matching affiliates found.",
      });
    }
    // Read existing records only. No database writes are performed.
    const [clicks, payments, referrals, commissions] =
      await Promise.all([
        readAll(
          db,
          "clicks",
          "id,click_id,affiliate_id,offer_id,smartlink_id,country,city,region,postal_code,timezone,device,browser,operating_system,referer,created_at,payout,status,converted_at,gross_revenue,network_profit,traffic_source,campaign,visitor_hash,is_suspicious,user_agent,ip_address,isp,asn,worker_sub_id,review_status,review_note,reviewed_at,reviewed_by,lead_status,lead_status_note,lead_status_updated_at,lead_status_updated_by"
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
        (row: any) =>
          String(row.affiliate_id || "").trim() === id
      );

      // Preserve existing conversion identification rules.
      const affiliateConversions = affiliateClicks
        .filter((row: any) => isConverted(row))
        .map((row: any) => ({
          id: row.id,
          click_id: row.click_id,
          affiliate_id: row.affiliate_id,
          offer_id: row.offer_id,
          smartlink_id: row.smartlink_id,
          country: row.country,
          city: row.city,
          region: row.region,
          postal_code: row.postal_code,
          timezone: row.timezone,
          ip_address: row.ip_address,
          isp: row.isp,
          asn: row.asn,
          device: row.device,
          browser: row.browser,
          operating_system: row.operating_system,
          user_agent: row.user_agent,
          referer: row.referer,
          traffic_source: row.traffic_source,
          campaign: row.campaign,
          worker_sub_id: row.worker_sub_id,
          gross_revenue: row.gross_revenue,
          network_profit: row.network_profit,
          payout: row.payout,
          status: row.status || "converted",
          lead_status: row.lead_status,
          review_status: row.review_status,
          review_note: row.review_note,
          reviewed_at: row.reviewed_at,
          reviewed_by: row.reviewed_by,
          lead_status_note: row.lead_status_note,
          lead_status_updated_at: row.lead_status_updated_at,
          lead_status_updated_by: row.lead_status_updated_by,
          converted_at: row.converted_at,
          created_at: row.created_at,
        }));

      const affiliatePayments = payments.filter(
        (row: any) =>
          String(row.affiliate_id || "").trim() === id
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

      // Preserve existing conversion payout calculation.
      const conversionEarnings = affiliateConversions.reduce(
        (sum: number, row: any) =>
          sum + safeNumber(row.payout),
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

    const reports = matchingProfileRows.map(buildReport);

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
