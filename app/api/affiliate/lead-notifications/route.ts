import { NextRequest } from "next/server";
import { approvedAffiliate, offerReply, offerError } from "@/lib/offer-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  if (!id || !date || !Number.isFinite(Date.parse(date))) return null;
  const value = Number(row.payout || 0);
  const payout = Number.isFinite(value) ? value : 0;
  return {
    id: `lead-${id}`,
    type: "lead" as const,
    title: "Lead Received",
    message: `You earned $${payout.toFixed(2)}${row.country ? ` · ${row.country}` : ""} · Click ${id.slice(0, 12)}`,
    createdAt: new Date(date).toISOString(),
    read: false,
    sound: true,
    data: { kind: "lead", clickId: id, payout, country: row.country || "", url: "/affiliate/statistics" },
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await approvedAffiliate(request);
    const fields = "id,click_id,country,payout,converted_at,created_at";
    // A click created earlier can become a new lead today.
    // Never accept an affiliate ID from the caller.
    const [converted, legacy] = await Promise.all([
      auth.client.from("clicks").select(fields)
        .eq("affiliate_id", auth.profile.affiliate_id)
        .not("converted_at", "is", null)
        .order("converted_at", { ascending: false })
        .order("click_id", { ascending: false }).limit(100),
      auth.client.from("clicks").select(fields)
        .eq("affiliate_id", auth.profile.affiliate_id)
        .is("converted_at", null)
        .in("status", ["converted", "conversion", "approved", "paid"])
        .order("created_at", { ascending: false })
        .order("click_id", { ascending: false }).limit(100),
    ]);
    if (converted.error) throw converted.error;
    if (legacy.error) throw legacy.error;
    const byId = new Map<string, NonNullable<ReturnType<typeof leadNotification>>>();
    for (const row of [...(converted.data || []), ...(legacy.data || [])] as LeadRow[]) {
      const item = leadNotification(row);
      if (item) byId.set(item.id, item);
    }
    const notifications = Array.from(byId.values())
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 100);
    return offerReply({ success: true, notifications });
  } catch (error) {
    return offerError(error);
  }
}