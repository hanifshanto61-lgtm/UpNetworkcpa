import type { SupabaseClient } from '@supabase/supabase-js';
import { isRevenueConversion, summarizeRevenue, type RevenueClick } from './admin-revenue';
export const SUB_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,39}$/;
export type Worker = { sub_id: string; name: string; created_at: string };
export type WorkerReportRow = {
  sub_id: string; source_id: string; source_name: string;
  clicks: number; unique_clicks: number; conversions: number; earnings: number;
  revenue?: number; profit?: number; missing_revenue?: number;
};
type WorkerClick = RevenueClick & { worker_sub_id: string; visitor_hash: string | null };
export function validReportDate(v: string) {
  return !v || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v && Number(v.slice(0,4)) >= 2000 && Number(v.slice(0,4)) <= 2100);
}
export function summarizeWorkers(clicks: WorkerClick[], names: Map<string,string>, admin: boolean): WorkerReportRow[] {
  const groups = new Map<string, { row: WorkerReportRow; visitors: Set<string>; clicks: WorkerClick[] }>();
  for (const c of clicks) {
    const sourceId = c.smartlink_id ? `smartlink:${c.smartlink_id}` : c.offer_id ? `offer:${c.offer_id}` : 'legacy';
    const sourceName = c.smartlink_id ? (names.get(c.smartlink_id) || `Smart Link ${c.smartlink_id}`) : c.offer_id ? `Offer ${c.offer_id}` : 'Global / legacy destination';
    const key = JSON.stringify([c.worker_sub_id, sourceId]);
    const group = groups.get(key) || {row:{sub_id:c.worker_sub_id,source_id:sourceId,source_name:sourceName,clicks:0,unique_clicks:0,conversions:0,earnings:0},visitors:new Set<string>(),clicks:[]};
    group.row.clicks++;
    if(c.visitor_hash) group.visitors.add(c.visitor_hash);
    group.clicks.push(c);
    groups.set(key, group);
  }
  return Array.from(groups.values(), g => {
    const revenue = summarizeRevenue(g.clicks, {});
    const totals = revenue[0]; // Already grouped to one affiliate and source.
    const row = {...g.row, unique_clicks:g.visitors.size, conversions:g.clicks.filter(isRevenueConversion).length, earnings:totals?.earnings || 0};
    return admin ? {...row,revenue:totals?.revenue || 0,profit:totals?.profit || 0,missing_revenue:totals?.missing_revenue || 0} : row;
  }).sort((a,b)=>a.sub_id.localeCompare(b.sub_id) || a.source_name.localeCompare(b.source_name));
}
export async function workerReport(client: SupabaseClient, affiliateId: string, from: string, to: string, admin: boolean) {
  const workers: Worker[] = [];
  for(let offset=0;;offset+=1000) {
    const {data,error}=await client.from('affiliate_sub_ids').select('sub_id,name,created_at').eq('affiliate_id',affiliateId).order('sub_id').range(offset,offset+999);
    if(error) throw new Error('Sub ID setup is unavailable. Run the Sub ID SQL first.');
    if(workers.length+(data?.length||0)>10000) throw new Error('Worker list exceeds the report limit. Contact support.');
    workers.push(...(data || []));
    if((data?.length || 0)<1000) break;
  }
  const clicks: WorkerClick[]=[];
  for(let offset=0;;offset+=1000) {
    let q=client.from('clicks').select('id,affiliate_id,worker_sub_id,smartlink_id,offer_id,status,payout,gross_revenue,converted_at,visitor_hash').eq('affiliate_id',affiliateId).not('worker_sub_id','is',null).order('id').range(offset,offset+999);
    if(from) q=q.gte('created_at',`${from}T00:00:00+06:00`);
    if(to) q=q.lt('created_at',new Date(Date.parse(`${to}T00:00:00+06:00`)+86400000).toISOString());
    const {data,error}=await q;
    if(error) throw new Error('Unable to load worker clicks. Confirm the Sub ID SQL is installed.');
    if(clicks.length+(data?.length || 0)>100000) throw new Error('Select a smaller date range (maximum 100,000 worker clicks).');
    clicks.push(...(data || []) as WorkerClick[]);
    if((data?.length || 0)<1000) break;
  }
  const ids=Array.from(new Set(clicks.flatMap(c=>c.smartlink_id?[c.smartlink_id]:[])));
  const names=new Map<string,string>();
  for(let i=0;i<ids.length;i+=100) {
    const {data,error}=await client.from('smart_links').select('id,name,slug').in('id',ids.slice(i,i+100));
    if(error) throw new Error('Unable to load Smart Link names.');
    for(const r of data || []) names.set(r.id,r.name || r.slug);
  }
  return {success:true,affiliate_id:affiliateId,workers,rows:summarizeWorkers(clicks,names,admin),period:{from,to,timezone:'Asia/Dhaka',basis:'click_created_at'},generated_at:new Date().toISOString()};
}