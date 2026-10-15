"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

type Point = { date: string; clicks: number; conversions: number; revenue: number };
type Report = {
  daily: Point[];
  totals: { clicks: number; conversions: number; revenue: number };
  sources: { id: string; name: string }[];
  updatedAt: string;
};
type Group = "days" | "weeks" | "months";
const DAY = 86400000;

function utcDate(offset = 0) {
  return new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);
}
function bucket(date: string, group: Group) {
  if (group === "months") return `${date.slice(0, 7)}-01`;
  if (group === "weeks") {
    const value = new Date(`${date}T00:00:00Z`);
    value.setUTCDate(value.getUTCDate() - (value.getUTCDay() + 6) % 7);
    return value.toISOString().slice(0, 10);
  }
  return date;
}
function groupPoints(daily: Point[], group: Group) {
  const map = new Map<string, Point>();
  for (const point of daily) {
    const date = bucket(point.date, group);
    const item = map.get(date) || { date, clicks: 0, conversions: 0, revenue: 0 };
    item.clicks += point.clicks;
    item.conversions += point.conversions;
    item.revenue += point.revenue;
    map.set(date, item);
  }
  return Array.from(map.values()).map(item => ({ ...item, revenue: Number(item.revenue.toFixed(2)) }));
}
function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}
function tickStep(max: number, clicks: boolean) {
  const raw = Math.max(max, clicks ? 4 : 1) / 4;
  const power = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = ([1, 2, 2.5, 5, 10].find(n => n * power >= raw) || 10) * power;
  return clicks ? Math.max(1, Math.ceil(step)) : step;
}

export default function TrafficDynamic({ dark }: { dark: boolean }) {
  const [from, setFrom] = useState(() => utcDate(-29));
  const [to, setTo] = useState(() => utcDate());
  const [range, setRange] = useState(() => ({ from: utcDate(-29), to: utcDate() }));
  const [source, setSource] = useState("");
  const [group, setGroup] = useState<Group>("days");
  const [metric, setMetric] = useState<"revenue" | "clicks">("revenue");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [width, setWidth] = useState(640);
  const plotRef = useRef<HTMLDivElement | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  async function load(showLoading = false) {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    if (showLoading) { setLoading(true); setReport(null); setSelected(null); }
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (controller.signal.aborted) return;
      const token = data.session?.access_token;
      if (sessionError || !token) throw new Error("Please log in to view traffic.");
      const params = new URLSearchParams({ ...range, source });
      const response = await fetch(`/api/affiliate/traffic-dynamic?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: controller.signal });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Unable to load traffic.");
      if (controller.signal.aborted) return;
      setReport(result);
      setError("");
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Unable to load traffic.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  useEffect(() => { void load(true); return () => requestRef.current?.abort(); }, [range, source]);
  useAutoRefresh(() => load(false), 15000);
  useEffect(() => {
    if (!plotRef.current) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(300, Math.round(entries[0].contentRect.width))));
    observer.observe(plotRef.current);
    return () => observer.disconnect();
  }, []);

  const points = useMemo(() => groupPoints(report?.daily || [], group), [report, group]);
  const step = tickStep(Math.max(0, ...points.map(point => point[metric])), metric === "clicks");
  const top = step * 4;
  const left = 58, right = width - 18, floor = 226, roof = 18;
  const x = (index: number) => points.length < 2 ? (left + right) / 2 : left + index / (points.length - 1) * (right - left);
  const y = (value: number) => floor - value / top * (floor - roof);
  const line = points.map((point, i) => `${x(i)},${y(point[metric])}`).join(" ");
  const selectedIndex = selected === null ? null : Math.min(selected, points.length - 1);
  const active = selectedIndex === null ? null : points[selectedIndex];
  const tickIndexes = Array.from(new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])).filter(index => index >= 0);
  const ink = dark ? "#cbd5e1" : "#475569";
  const grid = dark ? "#334155" : "#e2e8f0";
  const muted = dark ? "text-slate-400" : "text-slate-500";
  const input = `w-full min-w-0 rounded-xl border p-3 text-sm ${dark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-900"}`;

  function apply() {
    if (!from || !to || from > to) { setError("Please select a valid date range."); return; }
    setError("");
    setRange({ from, to });
  }

  return (
    <section className={`rounded-2xl border p-4 sm:p-6 ${dark ? "border-white/10 bg-slate-900/80 text-white" : "border-slate-200 bg-white text-slate-900"}`}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-bold">Traffic Dynamic</h2><p className={`mt-1 text-xs ${muted}`}>Your affiliate traffic and earnings</p></div>
        <div role="group" aria-label="Chart metric" className={`flex rounded-xl p-1 ${dark ? "bg-white/5" : "bg-slate-100"}`}>
          {(["revenue", "clicks"] as const).map(value => <button key={value} type="button" aria-pressed={metric === value} onClick={() => { setMetric(value); setSelected(null); }} className={`rounded-lg px-4 py-2 text-sm font-semibold ${metric === value ? "bg-cyan-500 text-slate-950" : muted}`}>{value === "revenue" ? "Revenue" : "Clicks"}</button>)}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className={`min-w-0 text-xs ${muted}`}>From (UTC)<input aria-label="Chart start date" type="date" value={from} onChange={event => setFrom(event.target.value)} className={`mt-1 ${input}`} /></label>
        <label className={`min-w-0 text-xs ${muted}`}>To (UTC)<input aria-label="Chart end date" type="date" value={to} onChange={event => setTo(event.target.value)} className={`mt-1 ${input}`} /></label>
        <label className={`min-w-0 text-xs ${muted}`}>Group by<select aria-label="Chart grouping" value={group} onChange={event => { setGroup(event.target.value as Group); setSelected(null); }} className={`mt-1 ${input}`}><option value="days">Days</option><option value="weeks">Weeks</option><option value="months">Months</option></select></label>
        <label className={`min-w-0 text-xs ${muted}`}>Smartlink / Offer<select aria-label="Chart smartlink or offer" value={source} onChange={event => setSource(event.target.value)} className={`mt-1 ${input}`}><option value="">All traffic</option>{source && !report?.sources.some(item => item.id === source) && <option value={source}>{source}</option>}{report?.sources.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <button type="button" onClick={apply} disabled={loading} className="self-end rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">Apply Dates</button>
      </div>
      {error && <div role="alert" className="mt-4 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-600">{error}{report && " Showing the last loaded report."}<button type="button" onClick={() => void load(!report)} className="ml-3 underline">Retry</button></div>}
      <p className={`mt-4 text-xs ${muted}`}>{range.from} → {range.to} · UTC · Revenue is your affiliate payout</p>
      <div ref={plotRef} className="mt-2 min-w-0">
        {loading ? <p role="status" className={`flex h-[280px] items-center justify-center text-sm ${muted}`}>Loading traffic chart...</p> : !report ? <p className={`py-16 text-center text-sm ${muted}`}>Traffic report unavailable.</p> : (
          <>
            <svg role="img" aria-label={`${metric === "revenue" ? "Affiliate revenue in USD" : "Clicks"} by ${group}, ${range.from} to ${range.to}, UTC`} viewBox={`0 0 ${width} 280`} className="h-[280px] w-full" onPointerMove={event => {
              const bounds = event.currentTarget.getBoundingClientRect();
              const position = (event.clientX - bounds.left) / bounds.width * width;
              setSelected(Math.max(0, Math.min(points.length - 1, Math.round((position - left) / (right - left) * (points.length - 1)))));
            }} onPointerLeave={() => setSelected(null)}>
              {[0, 1, 2, 3, 4].map(i => <g key={i}><line x1={left} x2={right} y1={y(step * i)} y2={y(step * i)} stroke={grid} strokeDasharray="4 4" /><text x={left - 8} y={y(step * i) + 4} textAnchor="end" fill={ink} fontSize="11">{metric === "revenue" ? `$${(step * i).toFixed(2)}` : (step * i).toLocaleString("en-US")}</text></g>)}
              {tickIndexes.map(i => <g key={i}><line x1={x(i)} x2={x(i)} y1={roof} y2={floor} stroke={grid} strokeDasharray="4 4" /><text x={x(i)} y={floor + 25} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fill={ink} fontSize="11">{dateLabel(points[i].date)}</text></g>)}
              {points.length > 1 && <polygon points={`${left},${floor} ${line} ${right},${floor}`} fill="#06b6d4" fillOpacity="0.08" />}
              <polyline points={line} fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              {points.length === 1 && <circle cx={x(0)} cy={y(points[0][metric])} r="4" fill="#06b6d4" />}
              {active && selectedIndex !== null && <g><line x1={x(selectedIndex)} x2={x(selectedIndex)} y1={roof} y2={floor} stroke={ink} strokeDasharray="3 3" /><circle cx={x(selectedIndex)} cy={y(active[metric])} r="5" fill="#06b6d4" stroke={dark ? "#0f172a" : "white"} strokeWidth="2" /></g>}
            </svg>
            <div className={`min-h-9 text-center text-xs ${muted}`}>{active ? `${active.date}${group === "weeks" ? " (week starting Monday)" : group === "months" ? " (month)" : ""} · ${active.clicks} clicks · ${active.conversions} leads · $${active.revenue.toFixed(2)}` : report.totals.clicks || report.totals.conversions ? "Touch or move over the graph to inspect a period." : "No traffic in this period. The graph will update automatically."}</div>
            <label className={`block text-xs ${muted}`}>Inspect period<input type="range" aria-label="Inspect chart period" min={0} max={Math.max(0, points.length - 1)} value={selectedIndex ?? 0} onChange={event => setSelected(Number(event.target.value))} className="mt-2 w-full accent-cyan-500" /></label>
          </>
        )}
      </div>
      {report && <div className={`mt-5 grid grid-cols-3 gap-2 border-t pt-4 ${dark ? "border-white/10" : "border-slate-200"}`}>{[["Clicks", report.totals.clicks.toLocaleString()], ["Leads", report.totals.conversions.toLocaleString()], ["Revenue", `$${report.totals.revenue.toFixed(2)}`]].map(([label, value]) => <div key={label}><p className={`text-xs ${muted}`}>{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div>)}</div>}
      <p className={`mt-4 text-xs ${muted}`}>Auto refresh: 15s{report ? ` · Updated ${new Date(report.updatedAt).toLocaleTimeString()}` : ""} · Earnings use the conversion date.</p>
    </section>
  );
}