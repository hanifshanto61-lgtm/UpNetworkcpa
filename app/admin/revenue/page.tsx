'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { RevenueRow } from '@/lib/admin-revenue';
const money=(v:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v);
const box='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900';
const input='w-full rounded-xl border border-slate-300 bg-transparent p-3 dark:border-slate-600';
function sum(rows:RevenueRow[]) {
  const cents=(key:'earnings'|'revenue'|'profit')=>rows.reduce((n,r)=>n+Math.round(r[key]*100),0)/100;
  return {conversions:rows.reduce((n,r)=>n+r.conversions,0),earnings:cents('earnings'),revenue:cents('revenue'),profit:cents('profit'),missing:rows.reduce((n,r)=>n+r.missing_revenue,0)};
}
export default function RevenuePage() {
  const router=useRouter();
  const [rows,setRows]=useState<RevenueRow[]>([]);
  const [from,setFrom]=useState('');
  const [to,setTo]=useState('');
  const [source,setSource]=useState('');
  const [affiliate,setAffiliate]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [loaded,setLoaded]=useState(false);
  const [period,setPeriod]=useState({from:'',to:''});
  const [updated,setUpdated]=useState('');
  const requestId=useRef(0);
  const load=useCallback(async (start:string,end:string)=>{
    const id=++requestId.current;
    setLoading(true);setError('');setLoaded(false);setRows([]);
    try {
      if (!supabase) throw new Error('Supabase is not configured.');
      const {data,error:authError}=await supabase.auth.getSession();
      if(authError || !data.session?.access_token){router.replace('/login');return;}
      const params=new URLSearchParams({from:start,to:end});
      const response=await fetch(`/api/admin/revenue?${params}`,{cache:'no-store',headers:{Authorization:`Bearer ${data.session.access_token}`}});
      if(response.status===401){router.replace('/affiliate');return;}
      const result=await response.json();
      if(!response.ok || !result.success) throw new Error(result.error || 'Unable to load report.');
      if(id!==requestId.current) return;
      setRows(result.rows);setPeriod(result.period);setUpdated(result.generated_at);setSource('');setAffiliate('');setLoaded(true);
    }catch(e){if(id===requestId.current)setError(e instanceof Error?e.message:'Unable to load report.');}
    finally{if(id===requestId.current)setLoading(false);}
  },[router]);
  useEffect(()=>{void load('','');return()=>{requestId.current++;};},[load]);
  const sourceOptions=useMemo(()=>Array.from(new Map(rows.map(r=>[r.source_id,r.source_name]))).sort((a,b)=>a[1].localeCompare(b[1])),[rows]);
  const affiliateOptions=useMemo(()=>Array.from(new Set(rows.map(r=>r.affiliate_id))).sort(),[rows]);
  const filtered=useMemo(()=>rows.filter(r=>(!source || r.source_id===source)&&(!affiliate || r.affiliate_id===affiliate)),[rows,source,affiliate]);
  const totals=sum(filtered);
  const sourceTotals=useMemo(()=>{
    const groups=new Map<string,RevenueRow[]>();
    for(const r of filtered) groups.set(r.source_id,[...(groups.get(r.source_id)||[]),r]);
    return Array.from(groups,([id,items])=>({id,name:items[0].source_name,...sum(items)}));
  },[filtered]);
  function quick(daysAgo:number) {
    const bdDate=new Date(Date.now()+6*3600000-daysAgo*86400000).toISOString().slice(0,10);
    setFrom(bdDate);setTo(bdDate);void load(bdDate,bdDate);
  }
  function download() {
    const escape=(v:string|number)=>`"${String(v).replace(/"/g,'""')}"`;
    const csv=[['Source','Affiliate ID','Conversions','Affiliate earnings USD','Recorded revenue USD (known only)','Your share USD (known only)','Missing revenue records'],...filtered.map(r=>[r.source_name,r.affiliate_id,r.conversions,r.earnings.toFixed(2),r.revenue.toFixed(2),r.profit.toFixed(2),r.missing_revenue])].map(r=>r.map(escape).join(',')).join('\r\n');
    // Guard spreadsheet formula evaluation for editable source/affiliate labels.
    const safeCsv=csv.replace(/"([=+@-])/g,'"\'$1');
    const url=URL.createObjectURL(new Blob(['\ufeff'+safeCsv],{type:'text/csv;charset=utf-8;'}));
    const a=document.createElement('a');a.href=url;a.download='upnetwork-revenue.csv';a.click();URL.revokeObjectURL(url);
  }
  return <main className="min-h-screen bg-slate-100 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:p-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <Link href="/admin" className="inline-block font-semibold text-blue-600 dark:text-cyan-400">← Admin Dashboard</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-sm font-semibold text-blue-600 dark:text-cyan-400">UpNetwork CPA · Admin</p><h1 className="mt-2 text-3xl font-bold">Network Revenue &amp; Profit</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Recorded conversions, affiliate commission and your share · USD</p></div>
        <button disabled={loading} onClick={()=>void load(from,to)} className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{loading?'Loading…':'Refresh'}</button>
      </div>
      <Link href="/admin/sub-ids" className="inline-block rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white">Worker Sub ID Reports →</Link>
      <section className={box}>
        <form onSubmit={e=>{e.preventDefault();void load(from,to);}} className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-2 text-sm font-semibold"><span>From · Bangladesh time</span><input required={false} type="date" min="2000-01-01" max="2100-12-31" className={input} value={from} onChange={e=>setFrom(e.target.value)}/></label>
          <label className="space-y-2 text-sm font-semibold"><span>To · Bangladesh time</span><input type="date" min="2000-01-01" max="2100-12-31" className={input} value={to} onChange={e=>setTo(e.target.value)}/></label>
          <button disabled={loading} className="self-end rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50">Apply dates</button>
        </form>
        <div className="mt-4 flex flex-wrap gap-3">{[['Today',0],['Yesterday',1]].map(([label,days])=><button disabled={loading} key={label} onClick={()=>quick(Number(days))} className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-600">{label}</button>)}<button disabled={loading} onClick={()=>{setFrom('');setTo('');void load('','');}} className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-600">All time</button></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold"><span>Source</span><select disabled={loading} className={input} value={source} onChange={e=>setSource(e.target.value)}><option value="">All sources</option>{sourceOptions.map(([id,name])=><option className="dark:bg-slate-900" key={id} value={id}>{name}</option>)}</select></label>
          <label className="space-y-2 text-sm font-semibold"><span>Affiliate</span><select disabled={loading} className={input} value={affiliate} onChange={e=>setAffiliate(e.target.value)}><option value="">All affiliates</option>{affiliateOptions.map(id=><option className="dark:bg-slate-900" key={id} value={id}>{id}</option>)}</select></label>
        </div>
      </section>
      {error&&<p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">{error}</p>}
      {loading&&<p role="status">Loading revenue report…</p>}
      {loaded&&!loading&&<>
        <p className="text-sm text-slate-500 dark:text-slate-400">Showing conversions: {period.from||'Beginning'} – {period.to||'Present'} · Asia/Dhaka. Updated {new Date(updated).toLocaleString('en-GB',{timeZone:'Asia/Dhaka'})}.</p>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
          ['Conversions',totals.conversions.toLocaleString(),'text-violet-600'],
          [totals.missing?'Recorded revenue · known only':'Recorded revenue',money(totals.revenue),'text-blue-600'],
          ['Affiliate commission',money(totals.earnings),'text-orange-600'],
          [totals.missing?'Your share · known only':'Your share',money(totals.profit),'text-emerald-600'],
        ].map(([label,value,color])=><div key={label} className={box}><p className="text-sm text-slate-500 dark:text-slate-400">{label}</p><p className={`mt-3 text-3xl font-bold ${color}`}>{value}</p></div>)}</section>
        {totals.missing>0&&<p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Revenue is unavailable for {totals.missing} conversion(s). Revenue and your share show known records only. Affiliate commission includes all matching conversions. A complete profit cannot be calculated yet.</p>}
        <section className={box}><h2 className="mb-4 text-xl font-bold">Source totals</h2><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr>{['Source','Conversions','Revenue*','Affiliate commission','Your share*','Missing revenue'].map(h=><th className="border-b border-slate-200 p-3 dark:border-slate-700" key={h}>{h}</th>)}</tr></thead><tbody>{sourceTotals.map(r=><tr key={r.id}><td className="p-3 font-semibold">{r.name}</td><td className="p-3">{r.conversions}</td><td className="p-3">{money(r.revenue)}{r.missing?' *':''}</td><td className="p-3">{money(r.earnings)}</td><td className="p-3">{money(r.profit)}{r.missing?' *':''}</td><td className="p-3">{r.missing}</td></tr>)}</tbody></table></div>{!filtered.length&&<p className="py-6 text-center text-slate-500">No matching recorded conversions.</p>}</section>
        <section className={box}><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Affiliate earnings by source</h2><button disabled={!filtered.length} onClick={download} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-600">Export CSV</button></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead><tr>{['Source','Affiliate ID','Conversions','Revenue*','Affiliate commission','Your share*','Missing revenue'].map(h=><th className="border-b border-slate-200 p-3 dark:border-slate-700" key={h}>{h}</th>)}</tr></thead><tbody>{filtered.map(r=><tr key={JSON.stringify([r.source_id,r.affiliate_id])}><td className="p-3">{r.source_name}</td><td className="p-3 font-semibold">{r.affiliate_id}</td><td className="p-3">{r.conversions}</td><td className="p-3">{money(r.revenue)}{r.missing_revenue?' *':''}</td><td className="p-3">{money(r.earnings)}</td><td className="p-3 text-emerald-600">{money(r.profit)}{r.missing_revenue?' *':''}</td><td className="p-3">{r.missing_revenue}</td></tr>)}</tbody></table></div></section>
      </>}
      <section className={`${box} space-y-2 text-sm text-slate-600 dark:text-slate-400`}>
        <p>* Revenue and your share use stored conversion amounts. Missing amounts are never estimated from current offer prices or commission settings. Your share = recorded revenue − affiliate commission for known records; referral commission, fees and operating costs are not deducted.</p>
        <p>Smart links appear separately by their configured name. Offer network attribution uses the offer’s current network assignment; changing that assignment can change historical grouping. No external network wallet or payment settlement is shown.</p>
        <p>Reports use conversion time, not click time or the daily 3 AM payment release. Undated legacy conversions appear only in All time. Rejected, reversed, refunded and cancelled conversions are excluded. Deleted records cannot appear.</p>
      </section>
    </div>
  </main>;
}