import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-auth';
import { isRevenueConversion, summarizeRevenue, type RevenueClick } from '@/lib/admin-revenue';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const PAGE = 1000;
const LIMIT = 100000;
function reply(body: Record<string, unknown>, status=200) {
  return NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
}
function validDate(value: string) {
  return !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value && Number(value.slice(0,4)) >= 2000 && Number(value.slice(0,4)) <= 2100);
}
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return reply({success:false,error:'Admin access required.'},401);
    const from = request.nextUrl.searchParams.get('from') || '';
    const to = request.nextUrl.searchParams.get('to') || '';
    if (!validDate(from) || !validDate(to) || (from && to && from > to)) return reply({success:false,error:'Invalid date range.'},400);
    const client = session.client;
    const clicks: RevenueClick[] = [];
    for (let offset=0;;offset+=PAGE) {
      let q = client.from('clicks').select('id,affiliate_id,smartlink_id,offer_id,status,payout,gross_revenue,converted_at').order('id').range(offset,offset+PAGE-1);
      // Revenue belongs to the date of conversion, in Bangladesh time.
      if (from) q=q.gte('converted_at',`${from}T00:00:00+06:00`);
      if (to) q=q.lt('converted_at',new Date(Date.parse(`${to}T00:00:00+06:00`)+86400000).toISOString());
      const {data,error}=await q;
      if (error) throw new Error('Unable to read conversion revenue. Confirm gross_revenue exists in clicks.');
      if (clicks.length+(data?.length || 0)>LIMIT) return reply({success:false,error:'Select a smaller date range (report limit: 100,000 records).'},413);
      clicks.push(...(data || []) as RevenueClick[]);
      if ((data?.length || 0)<PAGE) break;
    }
    const converted=clicks.filter(isRevenueConversion);
    const lookup = async (table: string, columns: string, ids: string[]) => {
      const rows: Record<string,string | null>[]=[];
      const unique=Array.from(new Set(ids));
      for(let i=0;i<unique.length;i+=100) {
        const {data,error}=await client.from(table).select(columns).in('id',unique.slice(i,i+100));
        if(error) throw new Error(`Unable to load ${table} for source attribution.`);
        rows.push(...(data || []) as unknown as Record<string,string | null>[]);
      }
      return new Map(rows.map(r=>[String(r.id),r]));
    };
    const [links,offers]=await Promise.all([
      lookup('smart_links','id,name,slug',converted.flatMap(c=>c.smartlink_id?[c.smartlink_id]:[])),
      lookup('offers','id,network_id',converted.flatMap(c=>c.offer_id?[c.offer_id]:[])),
    ]);
    const networks=await lookup('cpa_networks','id,name',Array.from(offers.values()).flatMap(o=>o.network_id?[o.network_id]:[]));
    const sources: Record<string,{id:string;name:string}>={};
    for(const c of converted) {
      if(c.smartlink_id) {
        const link=links.get(c.smartlink_id);
        sources[c.id]={id:`smartlink:${c.smartlink_id}`,name:`Smart Link: ${link?.name || link?.slug || c.smartlink_id}`};
      } else if(c.offer_id) {
        const offer=offers.get(c.offer_id);
        const network=offer?.network_id ? networks.get(offer.network_id) : null;
        sources[c.id]=offer?.network_id
          ? {id:`network:${offer.network_id}`,name:`Network: ${network?.name || offer.network_id}`}
          : {id:`offer:${c.offer_id}`,name:`Offer without network: ${c.offer_id}`};
      }
    }
    return reply({success:true,rows:summarizeRevenue(converted,sources),period:{from,to,timezone:'Asia/Dhaka'},generated_at:new Date().toISOString()});
  } catch(error) {
    console.error('Admin revenue report failed:',error instanceof Error ? error.message : 'Unknown error');
    return reply({success:false,error:error instanceof Error ? error.message : 'Unable to load revenue report.'},500);
  }
}