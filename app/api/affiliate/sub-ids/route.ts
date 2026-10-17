import { NextRequest } from 'next/server';
import { approvedAffiliate, offerReply, offerBody, OfferAccessError } from '@/lib/offer-access';
import { SUB_ID_PATTERN, validReportDate, workerReport } from '@/lib/sub-id-report';
export const dynamic='force-dynamic';
export const runtime='nodejs';
function failure(error: unknown) {
  const status=error instanceof OfferAccessError ? error.status : 500;
  console.error('Affiliate Sub ID:',error instanceof Error ? error.message : 'Unknown error');
  return offerReply({success:false,error:error instanceof Error ? error.message : 'Unable to load Sub IDs.'},status);
}
export async function GET(request: NextRequest) {
  try {
    const auth=await approvedAffiliate(request);
    const from=request.nextUrl.searchParams.get('from') || '';
    const to=request.nextUrl.searchParams.get('to') || '';
    if(!validReportDate(from) || !validReportDate(to) || (from && to && from>to)) throw new OfferAccessError('Invalid date range.',400);
    return offerReply(await workerReport(auth.client,auth.profile.affiliate_id,from,to,false));
  } catch(error) {return failure(error);}
}
export async function POST(request: NextRequest) {
  try {
    const auth=await approvedAffiliate(request);
    const body=await offerBody(request);
    const subId=typeof body.sub_id==='string' ? body.sub_id.trim().toLowerCase() : '';
    const name=typeof body.name==='string' ? body.name.trim() : '';
    if(!SUB_ID_PATTERN.test(subId)) throw new OfferAccessError('Sub ID: 1–40 lowercase letters, digits, underscores or hyphens; start with a letter or digit.',400);
    if(!name || name.length>80 || /[\u0000-\u001f\u007f]/.test(name)) throw new OfferAccessError('Enter a worker name (1–80 characters).',400);
    // Ownership is derived from the verified session, never request body fields.
    const {data,error}=await auth.client.from('affiliate_sub_ids').insert({user_id:auth.user.id,affiliate_id:auth.profile.affiliate_id,sub_id:subId,name}).select('sub_id,name,created_at').single();
    if(error?.code==='23505') throw new OfferAccessError('This Sub ID already exists in your account.',409);
    if(error) throw new Error('Unable to create Sub ID. Confirm the Sub ID SQL is installed.');
    return offerReply({success:true,worker:data},201);
  } catch(error) {return failure(error);}
}