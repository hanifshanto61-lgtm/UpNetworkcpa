'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Worker, WorkerReportRow } from '@/lib/sub-id-report';
const money=(v:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v);
type Report={affiliate_id:string;workers:Worker[];rows:WorkerReportRow[];period:{from:string;to:string};generated_at:string};
type Choice={id:string;name:string;slug:string};
export default function SubIdManager({admin=false,dark=false,affiliateId='',smartLinks=[]}:{admin?:boolean;dark?:boolean;affiliateId?:string;smartLinks?:Choice[]}) {
  const [report,setReport]=useState<Report|null>(null);
  const [loading,setLoading]=useState(false),[saving,setSaving]=useState(false);
  const [error,setError]=useState(''),[message,setMessage]=useState('');
  const [name,setName]=useState(''),[subId,setSubId]=useState(''),[selected,setSelected]=useState('');
  const [affiliate,setAffiliate]=useState(affiliateId),[from,setFrom]=useState(''),[to,setTo]=useState('');
  const [origin,setOrigin]=useState('');
  const seq=useRef(0),alive=useRef(true);
  const card=dark?'border-white/10 bg-[#0b1020] text-white':'border-slate-200 bg-white text-slate-900';
  const input=`w-full rounded-xl border p-3 text-sm ${dark?'border-white/15 bg-[#080c17] text-white':'border-slate-300 bg-white text-slate-900'}`;
  const button='rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-50';
  async function request(path:string,body?:Record<string,string>) {
    if(!supabase) throw new Error('Supabase is not configured.');
    const {data,error}=await supabase.auth.getSession();
    if(error || !data.session?.access_token) throw new Error('Please log in again.');
    const response=await fetch(path,{method:body?'POST':'GET',cache:'no-store',headers:{Authorization:`Bearer ${data.session.access_token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const result=await response.json();
    if(!response.ok || !result.success) throw new Error(result.error || 'Unable to load Sub IDs.');
    return result;
  }
  const load=useCallback(async (aid:string,start:string,end:string)=>{
    const id=++seq.current;
    setLoading(true);setError('');setReport(null);
    try {
      const params=new URLSearchParams({from:start,to:end,...(admin?{affiliate_id:aid}:{})});
      const result=await request(`/api/${admin?'admin':'affiliate'}/sub-ids?${params}`);
      if(id===seq.current && alive.current) setReport(result);
    }catch(e){if(id===seq.current && alive.current)setError(e instanceof Error?e.message:'Unable to load report.');}
    finally{if(id===seq.current && alive.current)setLoading(false);}
  },[admin]);
  useEffect(()=>{
    alive.current=true;setOrigin(window.location.origin);
    if(!admin) void load(affiliateId,'','');
    return()=>{alive.current=false;seq.current++;};
  },[admin,affiliateId,load]);
  async function create() {
    setSaving(true);setError('');setMessage('');
    try {
      const result=await request('/api/affiliate/sub-ids',{name,sub_id:subId});
      if(!alive.current)return;
      setSelected(result.worker.sub_id);setSubId('');setName('');
      setMessage(`Sub ID ${result.worker.sub_id} created. Copy its worker links below.`);
      await load(affiliateId,from,to);
    }catch(e){if(alive.current)setError(e instanceof Error?e.message:'Unable to create worker.');}
    finally{if(alive.current)setSaving(false);}
  }
  const selectedWorker=report?.workers.find(w=>w.sub_id===selected);
  const choices=[{id:'global',slug:'default-smartlink',name:'Global Smart Link'},...smartLinks.filter(l=>l.slug!=='default-smartlink')];
  function workerLink(slug:string) {
    if(!origin || !selectedWorker || !report)return '';
    return `${origin}/api/track?${new URLSearchParams({aid:report.affiliate_id,sl:slug,sub_id:selectedWorker.sub_id})}`;
  }
  async function copy(slug:string) {
    try {await navigator.clipboard.writeText(workerLink(slug));setMessage('Worker link copied.');setError('');}
    catch{setError('Copy failed. Select and copy the link text manually.');}
  }
  function totals(id:string) {
    const rows=report?.rows.filter(r=>r.sub_id===id) || [];
    return {clicks:rows.reduce((n,r)=>n+r.clicks,0),conversions:rows.reduce((n,r)=>n+r.conversions,0),earnings:rows.reduce((n,r)=>n+Math.round(r.earnings*100),0)/100};
  }
  return <section className={`my-6 rounded-2xl border p-4 sm:p-6 ${card}`}>
    <h2 className="text-xl font-bold">{admin?'Affiliate Worker Reports':'Worker Sub IDs'}</h2>
    <p className="mt-2 text-sm opacity-70">{admin?'View each affiliate’s workers, Smart Link performance and recorded network share.':'Create a Sub ID for each worker and share their tracking link. All earnings belong to your main account; workers do not need a login.'}</p>
    {!admin&&<form className="mt-5 grid gap-3 sm:grid-cols-3" onSubmit={e=>{e.preventDefault();void create();}}>
      <label className="text-sm">Worker name<input className={`${input} mt-2`} value={name} maxLength={80} required onChange={e=>setName(e.target.value)} placeholder="Worker 1"/></label>
      <label className="text-sm">Sub ID<input className={`${input} mt-2`} value={subId} maxLength={40} required pattern="[a-z0-9][a-z0-9_-]{0,39}" onChange={e=>setSubId(e.target.value.toLowerCase())} placeholder="worker1"/><span className="mt-1 block text-xs opacity-60">Lowercase letters, digits, _ or -; permanent ID.</span></label>
      <button disabled={saving||loading} className={`${button} self-start sm:mt-7`}>{saving?'Creating…':'Create Sub ID'}</button>
    </form>}
    <form className={`mt-6 grid gap-3 ${admin?'sm:grid-cols-4':'sm:grid-cols-3'}`} onSubmit={e=>{e.preventDefault();setMessage('');void load(affiliate,from,to);}}>
      {admin&&<label className="text-sm">Affiliate ID<input className={`${input} mt-2`} required value={affiliate} maxLength={200} onChange={e=>{setAffiliate(e.target.value);seq.current++;setReport(null);setLoading(false);}} placeholder="Enter affiliate ID"/></label>}
      <label className="text-sm">From · Bangladesh<input className={`${input} mt-2`} type="date" min="2000-01-01" max="2100-12-31" value={from} onChange={e=>setFrom(e.target.value)}/></label>
      <label className="text-sm">To · Bangladesh<input className={`${input} mt-2`} type="date" min="2000-01-01" max="2100-12-31" value={to} onChange={e=>setTo(e.target.value)}/></label>
      <button disabled={loading||saving} className={`${button} self-end`}>{loading?'Loading…':'Load / Refresh Report'}</button>
    </form>
    <p className="mt-3 text-xs opacity-60">Dates select clicks received in Asia/Dhaka. Leads and earnings are the current conversions from those clicks. Leave dates blank for all time. Reversed and rejected leads are excluded.</p>
    {error&&<p role="alert" className="mt-4 rounded-xl border border-red-500/30 p-3 text-sm text-red-500">{error}</p>}
    {message&&<p role="status" className="mt-4 text-sm text-emerald-500">{message}</p>}
    {loading&&<p role="status" className="mt-4 text-sm">Loading worker report…</p>}
    {report&&<>
      <p className="mt-5 text-xs opacity-60">{report.affiliate_id} · {report.period.from||'Beginning'} – {report.period.to||'Present'} · Updated {new Date(report.generated_at).toLocaleString('en-GB',{timeZone:'Asia/Dhaka'})}</p>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[550px] text-left text-sm"><thead><tr>{['Worker','Sub ID','Clicks','Leads','Affiliate earnings'].map(h=><th className="border-b border-slate-500/20 p-3" key={h}>{h}</th>)}</tr></thead><tbody>{report.workers.map(w=>{const t=totals(w.sub_id);return <tr key={w.sub_id}><td className="p-3">{w.name}</td><td className="p-3 font-mono">{w.sub_id}</td><td className="p-3">{t.clicks}</td><td className="p-3">{t.conversions}</td><td className="p-3 text-emerald-500">{money(t.earnings)}</td></tr>;})}</tbody></table></div>
      {!report.workers.length&&<p className="py-5 text-sm opacity-70">No worker Sub IDs created yet.</p>}
      {!admin&&report.workers.length>0&&<div className="mt-6 rounded-xl border border-cyan-500/25 p-4">
        <label className="text-sm font-semibold">Generate worker links<select className={`${input} mt-2`} value={selectedWorker?.sub_id || ''} onChange={e=>{setSelected(e.target.value);setMessage('');}}><option value="">Select a worker</option>{report.workers.map(w=><option key={w.sub_id} value={w.sub_id}>{w.name} · {w.sub_id}</option>)}</select></label>
        {selectedWorker&&<div className="mt-4 space-y-4">{choices.map(c=><div key={c.id}><p className="mb-2 text-sm font-semibold">{c.name}</p><div className="flex flex-col gap-2 sm:flex-row"><input className={input} readOnly value={workerLink(c.slug)} aria-label={`${c.name} worker link`} onFocus={e=>e.target.select()}/><button type="button" className={button} onClick={()=>void copy(c.slug)}>Copy</button></div></div>)}</div>}
      </div>}
      <h3 className="mt-7 font-bold">Worker performance by destination</h3>
      <div className="mt-3 overflow-x-auto"><table className={`w-full text-left text-sm ${admin?'min-w-[1050px]':'min-w-[700px]'}`}><thead><tr>{['Sub ID','Smart Link / destination','Clicks','Unique clicks','Leads','Affiliate earnings',...(admin?['Revenue*','Your share*','Missing revenue']:[])].map(h=><th className="border-b border-slate-500/20 p-3" key={h}>{h}</th>)}</tr></thead><tbody>{report.rows.map(r=><tr key={JSON.stringify([r.sub_id,r.source_id])}><td className="p-3 font-mono">{r.sub_id}</td><td className="p-3">{r.source_name}</td><td className="p-3">{r.clicks}</td><td className="p-3">{r.unique_clicks}</td><td className="p-3">{r.conversions}</td><td className="p-3">{money(r.earnings)}</td>{admin&&<><td className="p-3">{money(r.revenue||0)}{r.missing_revenue?' *':''}</td><td className="p-3">{money(r.profit||0)}{r.missing_revenue?' *':''}</td><td className="p-3">{r.missing_revenue||0}</td></>}</tr>)}</tbody></table></div>
      {!report.rows.length&&<p className="py-5 text-sm opacity-70">No tracked worker clicks in this period.</p>}
      <p className="mt-4 text-xs opacity-60">Existing links without a Sub ID still contribute to the main account and do not appear here. Unique clicks use known visitor hashes. Global results are grouped by the destination selected for each click.</p>
      {admin&&<p className="mt-3 text-xs opacity-60">* Revenue and your share include known amounts only. Your share = recorded revenue − affiliate earnings for known records, before referrals and costs. Missing revenue is not estimated. This report uses click dates; Network Revenue uses conversion dates. Compare all-time totals.</p>}
    </>}
  </section>;
}