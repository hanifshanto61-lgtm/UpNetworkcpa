export type RevenueClick = {
  id: string; affiliate_id: string | null; smartlink_id: string | null;
  offer_id: string | null; status: string | null; converted_at: string | null;
  payout: number | string | null; gross_revenue: number | string | null;
};
export type RevenueRow = {
  source_id: string; source_name: string; affiliate_id: string;
  conversions: number; earnings: number; known_earnings: number;
  revenue: number; profit: number; missing_revenue: number;
};
export function isRevenueConversion(c: RevenueClick) {
  const status = String(c.status || '').toLowerCase().trim();
  if (['reversed','rejected','cancelled','canceled','void','refunded','chargeback','deleted','pending','click'].includes(status)) return false;
  return Boolean(c.converted_at) || ['converted','conversion','approved','paid'].includes(status);
}
function amount(value: number | string | null): number | null {
  if (value === null || String(value).trim() === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1000000000) return null;
  return Math.round((n + Number.EPSILON) * 100);
}
export function summarizeRevenue(clicks: RevenueClick[], sources: Record<string, {id: string; name: string}>) {
  const groups = new Map<string, RevenueRow>();
  for (const c of clicks) {
    if (!isRevenueConversion(c)) continue;
    const source = sources[c.id] || {id:'unknown', name:'Unassigned / legacy source'};
    const affiliate = c.affiliate_id || 'Unassigned';
    const key = JSON.stringify([source.id,affiliate]);
    const item = groups.get(key) || {source_id:source.id,source_name:source.name,affiliate_id:affiliate,conversions:0,earnings:0,known_earnings:0,revenue:0,profit:0,missing_revenue:0};
    const payout = amount(c.payout);
    const gross = amount(c.gross_revenue);
    // Zero-initialized smartlink revenue is not proof of a zero-dollar conversion.
    const known = payout !== null && gross !== null && !(gross === 0 && payout > 0);
    if (payout === null) throw new Error('A conversion has an invalid affiliate payout. Review it before reporting.');
    item.conversions++;
    item.earnings += payout;
    if (known) {
      item.known_earnings += payout;
      item.revenue += gross;
      item.profit += gross - payout;
    } else item.missing_revenue++;
    groups.set(key,item);
  }
  return Array.from(groups.values()).map(r=>({...r,earnings:r.earnings/100,known_earnings:r.known_earnings/100,revenue:r.revenue/100,profit:r.profit/100})).sort((a,b)=>b.earnings-a.earnings);
}