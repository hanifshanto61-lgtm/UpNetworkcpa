import { NextRequest } from "next/server";
import { approvedAffiliate, offerReply, offerError, OfferAccessError } from "@/lib/offer-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Click = {
  click_id: string;
  smartlink_id?: string | null;
  offer_id?: string | null;
  created_at?: string | null;
  converted_at?: string | null;
  status?: string | null;
  payout?: number | string | null;
};
type Point = { date: string; clicks: number; conversions: number; revenue: number };
const DAY = 86400000;

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function converted(row: Click) {
  return Boolean(row.converted_at) || ["converted", "conversion", "approved", "paid"].includes(String(row.status || "").trim().toLowerCase());
}
function sourceKey(row: Click) {
  return row.smartlink_id ? `smartlink:${row.smartlink_id}` : row.offer_id ? `offer:${row.offer_id}` : "legacy";
}
function aggregate(rows: Click[], from: string, to: string, source: string) {
  const points = new Map<string, Point>();
  const end = Date.parse(`${to}T00:00:00Z`);
  for (let day = Date.parse(`${from}T00:00:00Z`); day <= end; day += DAY) {
    const date = new Date(day).toISOString().slice(0, 10);
    points.set(date, { date, clicks: 0, conversions: 0, revenue: 0 });
  }
  const sources = new Set<string>();
  for (const row of rows) {
    const key = sourceKey(row);
    sources.add(key);
    if (source && key !== source) continue;
    const clickDay = String(row.created_at || "").slice(0, 10);
    const clickPoint = points.get(clickDay);
    if (clickPoint) clickPoint.clicks++;
    if (converted(row)) {
      // Attribute earnings to the conversion date, with a legacy fallback.
      const conversionDay = String(row.converted_at || row.created_at || "").slice(0, 10);
      const point = points.get(conversionDay);
      if (point) {
        const payout = Number(row.payout || 0);
        point.conversions++;
        point.revenue += Number.isFinite(payout) ? payout : 0;
      }
    }
  }
  const daily = [...points.values()].map(point => ({ ...point, revenue: Number(point.revenue.toFixed(2)) }));
  const totals = daily.reduce((sum, point) => ({ clicks: sum.clicks + point.clicks, conversions: sum.conversions + point.conversions, revenue: sum.revenue + point.revenue }), { clicks: 0, conversions: 0, revenue: 0 });
  totals.revenue = Number(totals.revenue.toFixed(2));
  return { daily, totals, sourceKeys: [...sources] };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await approvedAffiliate(request);
    const from = request.nextUrl.searchParams.get("from") || "";
    const to = request.nextUrl.searchParams.get("to") || "";
    const source = request.nextUrl.searchParams.get("source") || "";
    if (!validDate(from) || !validDate(to) || from > to) {
      throw new OfferAccessError("Please select a valid date range.", 400);
    }
    const startTime = Date.parse(`${from}T00:00:00Z`);
    const endTime = Date.parse(`${to}T00:00:00Z`) + DAY;
    if (endTime - startTime > 3660 * DAY) {
      throw new OfferAccessError("Please select a range of 10 years or less.", 400);
    }
    const start = new Date(startTime).toISOString();
    const end = new Date(endTime).toISOString();
    const rows: Click[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await auth.client.from("clicks")
        .select("click_id,smartlink_id,offer_id,created_at,converted_at,status,payout")
        .eq("affiliate_id", auth.profile.affiliate_id)
        .or(`and(created_at.gte.${start},created_at.lt.${end}),and(converted_at.gte.${start},converted_at.lt.${end})`)
        .order("click_id", { ascending: true })
        .range(offset, offset + 999);
      if (error) throw error;
      const page = (data || []) as Click[];
      rows.push(...page);
      if (page.length < 1000) break;
    }
    const report = aggregate(rows, from, to, source);
    const options = report.sourceKeys.map(id => ({
      id,
      name: id.startsWith("smartlink:") ? `Smartlink ${id.slice(10)}` : id.startsWith("offer:") ? `Offer ${id.slice(6)}` : "Legacy / Unknown",
    }));
    // Resolve only IDs already present in this affiliate's own report.
    for (const [prefix, table] of [["smartlink:", "smart_links"], ["offer:", "offers"]]) {
      const ids = options.filter(option => option.id.startsWith(prefix)).map(option => option.id.slice(prefix.length));
      for (let offset = 0; offset < ids.length; offset += 100) {
        const { data, error } = await auth.client.from(table).select("id,name").in("id", ids.slice(offset, offset + 100));
        if (error) { console.error("Chart source names unavailable:", table, error); break; }
        for (const row of data || []) {
          const option = options.find(item => item.id === `${prefix}${row.id}`);
          if (option && row.name) option.name = `${prefix === "offer:" ? "Offer: " : ""}${row.name}`;
        }
      }
    }
    return offerReply({ success: true, daily: report.daily, totals: report.totals, sources: options, range: { from, to }, timezone: "UTC", updatedAt: new Date().toISOString() });
  } catch (error) {
    return offerError(error);
  }
}