import { NextRequest } from "next/server";
import {
  approvedAffiliate,
  offerReply,
  offerError,
  offerBody,
} from "@/lib/offer-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DISMISSAL_TABLE =
  "affiliate_lead_notification_dismissals";

type LeadRow = {
  id?: string | null;
  click_id?: string | null;
  country?: string | null;
  payout?: number | string | null;
  converted_at?: string | null;
  created_at?: string | null;
};

function leadNotification(row: LeadRow) {
  const id = row.click_id || row.id;
  const date = row.converted_at || row.created_at;

  if (!id || !date || !Number.isFinite(Date.parse(date))) {
    return null;
  }

  const value = Number(row.payout || 0);
  const payout = Number.isFinite(value) ? value : 0;

  return {
    id: `lead-${id}`,
    type: "lead" as const,
    title: "Lead Received",
    message: `You earned $${payout.toFixed(2)}${
      row.country ? ` · ${row.country}` : ""
    } · Click ${id.slice(0, 12)}`,
    createdAt: new Date(date).toISOString(),
    read: false,
    sound: true,
    data: {
      kind: "lead",
      clickId: id,
      payout,
      country: row.country || "",
      url: "/affiliate/statistics",
    },
  };
}

// GET: Return only this affiliate's lead notifications.
export async function GET(request: NextRequest) {
  try {
    const auth = await approvedAffiliate(request);

    const fields =
      "id,click_id,country,payout,converted_at,created_at";

    const [converted, legacy, dismissals] =
      await Promise.all([
        auth.client
          .from("clicks")
          .select(fields)
          .eq("affiliate_id", auth.profile.affiliate_id)
          .not("converted_at", "is", null)
          .order("converted_at", { ascending: false })
          .order("click_id", { ascending: false })
          .limit(100),

        auth.client
          .from("clicks")
          .select(fields)
          .eq("affiliate_id", auth.profile.affiliate_id)
          .is("converted_at", null)
          .in("status", [
            "converted",
            "conversion",
            "approved",
            "paid",
          ])
          .order("created_at", { ascending: false })
          .order("click_id", { ascending: false })
          .limit(100),

        auth.client
          .from(DISMISSAL_TABLE)
          .select("lead_id")
          .eq("user_id", auth.user.id),
      ]);

    if (converted.error) throw converted.error;
    if (legacy.error) throw legacy.error;
    if (dismissals.error) throw dismissals.error;

    const dismissed = new Set(
      (dismissals.data || []).map((row) => String(row.lead_id))
    );

    const byId = new Map<
      string,
      NonNullable<ReturnType<typeof leadNotification>>
    >();

    for (const row of [
      ...(converted.data || []),
      ...(legacy.data || []),
    ] as LeadRow[]) {
      const item = leadNotification(row);

      if (item) {
        byId.set(item.id, item);
      }
    }

    const notifications = Array.from(byId.values())
      .filter((item) => !dismissed.has(item.id.slice(5)))
      .sort(
        (a, b) =>
          Date.parse(b.createdAt) - Date.parse(a.createdAt)
      )
      .slice(0, 100);

    return offerReply({
      success: true,
      notifications,
      dismissedIds: Array.from(dismissed).map(
        (id) => `lead-${id}`
      ),
    });
  } catch (error) {
    return offerError(error);
  }
}

// POST: Permanently dismiss only this affiliate's lead notifications.
export async function POST(request: NextRequest) {
  try {
    const auth = await approvedAffiliate(request);
    const body = await offerBody(request);

    const ids = body.ids;

    if (
      !Array.isArray(ids) ||
      ids.length < 1 ||
      ids.length > 100 ||
      !ids.every(
        (id) =>
          typeof id === "string" &&
          id.startsWith("lead-") &&
          id.length > 5 &&
          id.length <= 205
      )
    ) {
      return offerReply(
        {
          success: false,
          error: "Invalid lead notification IDs.",
        },
        400
      );
    }

    const uniqueIds = Array.from(
      new Set(ids as string[])
    );

    const rows = uniqueIds.map((id) => ({
      user_id: auth.user.id,
      lead_id: id.slice(5),
    }));

    const { error } = await auth.client
      .from(DISMISSAL_TABLE)
      .upsert(rows, {
        onConflict: "user_id,lead_id",
        ignoreDuplicates: true,
      });

    if (error) throw error;

    return offerReply({
      success: true,
      dismissed: rows.length,
    });
  } catch (error) {
    return offerError(error);
  }
}