import { NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/admin-auth';
import { offerReply } from '@/lib/offer-access';
import { validReportDate, workerReport } from '@/lib/sub-id-report';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(request: NextRequest) {
  try {
    const auth=await getAdminSession(request);
    if(!auth) return offerReply({success:false,error:'Admin access required.'},401);
    const affiliate=request.nextUrl.searchParams.get('affiliate_id')?.trim() || '';
    const from=request.nextUrl.searchParams.get('from') || '';
    const to=request.nextUrl.searchParams.get('to') || '';
    if(!affiliate || affiliate.length>200 || !validReportDate(from) || !validReportDate(to) || (from && to && from>to)) return offerReply({success:false,error:'Enter an affiliate ID and valid dates.'},400);
    const {data,error}=await auth.client.from('profiles').select('id').eq('affiliate_id',affiliate).maybeSingle();
    if(error) throw new Error('Unable to validate affiliate.');
    if(!data) return offerReply({success:false,error:'Affiliate not found.'},404);
    return offerReply(await workerReport(auth.client,affiliate,from,to,true));
  } catch(error) {
    return offerReply({success:false,error:error instanceof Error ? error.message : 'Unable to load report.'},500);
  }
}