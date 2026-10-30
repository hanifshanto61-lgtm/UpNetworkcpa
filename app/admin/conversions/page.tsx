"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Download,
  DollarSign,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { verifyAdminAccess } from "@/lib/admin-access";

type Click = {
  id: string | null;
  click_id: string | null;
  affiliate_id: string | null;
  offer_id: string | null;
  smartlink_id?: string | null;
  traffic_source?: string | null;
  referer?: string | null;
  country?: string | null;
  device?: string | null;
  browser?: string | null;
  operating_system?: string | null;
  user_agent?: string | null;
  ip_address?: string | null;
  status: string | null;
  payout: number | string | null;
  converted_at: string | null;
  created_at: string | null;
  review_status?: string | null;
  review_note?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  lead_status?: string | null;
  lead_status_note?: string | null;
  lead_status_updated_at?: string | null;
  lead_status_updated_by?: string | null;
};

type IpCheck = {
  ip: string;
  risk: number | null;
  proxy: boolean | null;
  vpn: boolean | null;
  tor: boolean | null;
  hosting: boolean | null;
  anonymous: boolean | null;
  checked_at: string;
};

type ApiResponse = {
  success: boolean;
  error?: string;
  message?: string;
  clicks?: Click[];
  lead?: Partial<Click>;
};

const REVIEW_OPTIONS = [
  { value: "unreviewed", label: "Unreviewed" },
  { value: "approved", label: "Review Approved" },
  { value: "investigate", label: "Investigate" },
  { value: "fraud", label: "Fraud Suspected" },
];

function isConverted(click: Click) {
  return (
    Boolean(click.converted_at) ||
    ["converted", "conversion", "approved", "paid"].includes(
      (click.status || "").toLowerCase()
    )
  );
}

function money(value: number | string | null) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function dateTime(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-US");
}

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export default function AdminConversionsPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [clicks, setClicks] = useState<Click[]>([]);
  const [search, setSearch] = useState("");
  const [leadStatuses, setLeadStatuses] = useState<Record<string, string>>({});
  const [leadNotes, setLeadNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("all");
  const [payouts, setPayouts] = useState<Record<string, string>>({});
  const [reviewStatuses, setReviewStatuses] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const [ipChecks, setIpChecks] = useState<Record<string, IpCheck>>({});
  const [checkingIps, setCheckingIps] = useState<Record<string, boolean>>({});
  const [ipErrors, setIpErrors] = useState<Record<string, string>>({});

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getToken = useCallback(async () => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error("Session expired. Please log in again.");
    }

    if (!(await verifyAdminAccess(session.access_token))) {
      throw new Error("Administrator access required.");
    }

    return session.access_token;
  }, []);

  const loadClicks = useCallback(
    async (query = "", selectedFilter = "all") => {
      setLoading(true);
      setError("");

      try {
        const token = await getToken();
        const params = new URLSearchParams();

        if (query.trim()) params.set("search", query.trim());
        if (selectedFilter !== "all") {
          params.set("filter", selectedFilter);
        }

        const response = await fetch(
          `/api/admin/conversions?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }
        );

        const result: ApiResponse = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Unable to load conversions.");
        }

        const records = result.clicks || [];
        setClicks(records);

        setReviewStatuses((previous) => {
          const next = { ...previous };
          for (const click of records) {
            if (click.click_id && next[click.click_id] === undefined) {
              next[click.click_id] = click.review_status || "unreviewed";
            }
          }
          return next;
        });

        setReviewNotes((previous) => {
          const next = { ...previous };
          for (const click of records) {
            if (click.click_id && next[click.click_id] === undefined) {
              next[click.click_id] = click.review_note || "";
            }
          }
          return next;
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load conversions."
        );
      } finally {
        setLoading(false);
      }
    },
    [getToken]
  );

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        await getToken();
        if (!active) return;

        setChecking(false);
        await loadClicks();
      } catch {
        if (active) router.replace("/login");
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [getToken, loadClicks, router]);

  async function checkIp(click: Click) {
    const clickId = click.click_id;

    if (!clickId || !click.ip_address || checkingIps[clickId]) return;

    setCheckingIps((previous) => ({ ...previous, [clickId]: true }));
    setIpErrors((previous) => ({ ...previous, [clickId]: "" }));

    try {
      const token = await getToken();
      const response = await fetch("/api/admin/ip-check", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ click_id: clickId }),
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.check) {
        throw new Error(result.error || "IP check unavailable.");
      }

      setIpChecks((previous) => ({
        ...previous,
        [clickId]: result.check,
      }));
    } catch (err) {
      setIpErrors((previous) => ({
        ...previous,
        [clickId]:
          err instanceof Error ? err.message : "IP check unavailable.",
      }));
    } finally {
      setCheckingIps((previous) => ({
        ...previous,
        [clickId]: false,
      }));
    }
  }

  async function saveReview(click: Click) {
    const clickId = click.click_id;
    if (!clickId || savingId) return;

    const reviewStatus = reviewStatuses[clickId] || "unreviewed";
    const reviewNote = reviewNotes[clickId] || "";

    if (reviewNote.length > 1000) {
      setError("Review note must be 1000 characters or fewer.");
      return;
    }

    const confirmed = window.confirm(
      `Save lead review?\n\nClick ID: ${clickId}\nAffiliate: ${click.affiliate_id || "Unknown"}\nReview: ${reviewStatus}`
    );

    if (!confirmed) return;

    setSavingId(clickId);
    setError("");
    setSuccess("");

    try {
      const token = await getToken();
      const response = await fetch("/api/admin/conversions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "review",
          click_id: clickId,
          review_status: reviewStatus,
          review_note: reviewNote,
        }),
      });

      const result: ApiResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to save lead review.");
      }

      setSuccess(`Review saved for Click ID ${clickId}.`);
      await loadClicks(search, filter);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save lead review."
      );
    } finally {
      setSavingId(null);
    }
  }
  async function saveLeadStatus(click: Click) {
    const clickId = click.click_id;
    if (!clickId || savingId) return;

    if (!isConverted(click)) {
      setError("Only converted leads can have their lead status changed.");
      return;
    }

    const leadStatus = leadStatuses[clickId] || click.lead_status || "pending";
    const leadNote = leadNotes[clickId] ?? click.lead_status_note ?? "";

    if (!["pending", "approved", "hold", "rejected"].includes(leadStatus)) {
      setError("Invalid lead status.");
      return;
    }

    if (leadNote.length > 1000) {
      setError("Lead note must be 1000 characters or fewer.");
      return;
    }

    const confirmed = window.confirm(
      `Update lead status?\n\nClick ID: ${clickId}\nAffiliate: ${click.affiliate_id || "Unknown"}\nNew status: ${leadStatus.toUpperCase()}`
    );

    if (!confirmed) return;

    setSavingId(clickId);
    setError("");
    setSuccess("");

    try {
      const token = await getToken();
      const response = await fetch("/api/admin/conversions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "lead_status",
          click_id: clickId,
          lead_status: leadStatus,
          note: leadNote,
        }),
      });

      const result: ApiResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to update lead status.");
      }

      setSuccess(`Lead status updated to ${leadStatus.toUpperCase()} for ${clickId}.`);
      await loadClicks(search, filter);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update lead status."
      );
    } finally {
      setSavingId(null);
    }
  }
  async function approveConversion(click: Click) {
    const clickId = click.click_id;
    if (!clickId || savingId) return;

    if ((reviewStatuses[clickId] || click.review_status) === "fraud") {
      setError(
        "This lead is marked as suspected fraud. Review it before approving."
      );
      return;
    }

    const rawPayout = payouts[clickId];

    if (rawPayout === undefined || rawPayout.trim() === "") {
      setError("Please enter a payout amount.");
      return;
    }

    const payout = Number(rawPayout);

    if (
      !Number.isFinite(payout) ||
      payout < 0 ||
      payout > 1000000 ||
      payout !== Number(payout.toFixed(2))
    ) {
      setError(
        "Enter a valid payout between $0 and $1,000,000 (maximum two decimal places)."
      );
      return;
    }

    const confirmed = window.confirm(
      `Approve conversion?\n\nClick ID: ${clickId}\nAffiliate: ${click.affiliate_id}\nPayout: ${money(payout)}\n\nThis action cannot be undone here.`
    );

    if (!confirmed) return;

    setSavingId(clickId);
    setError("");
    setSuccess("");

    try {
      const token = await getToken();
      const response = await fetch("/api/admin/conversions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ click_id: clickId, payout }),
      });

      const result: ApiResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Conversion approval failed.");
      }

      setSuccess(
        `Conversion approved. ${money(payout)} credited to affiliate ${click.affiliate_id}.`
      );

      await loadClicks(search, filter);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Conversion approval failed."
      );
    } finally {
      setSavingId(null);
    }
  }

  function downloadCsv() {
    if (!clicks.length) {
      setError("There are no records to download.");
      return;
    }

    const headers = [
      "Click ID",
      "Affiliate ID",
      "Offer ID",
      "Click Status",
      "Payout",
      "IP Address",
      "User Agent",
      "Country",
      "Traffic Source",
      "Referrer",
      "Device",
      "Browser",
      "Operating System",
      "Click Date",
      "Converted At",
      "Review Status",
      "Review Note",
      "Reviewed At",
      "Reviewed By",
    ];

    const rows = clicks.map((click) => [
      click.click_id,
      click.affiliate_id,
      click.offer_id,
      click.status,
      click.payout,
      click.ip_address,
      click.user_agent,
      click.country,
      click.traffic_source,
      click.referer,
      click.device,
      click.browser,
      click.operating_system,
      click.created_at,
      click.converted_at,
      click.review_status || "unreviewed",
      click.review_note,
      click.reviewed_at,
      click.reviewed_by,
    ]);

    const csv = [
      headers.map(csvCell).join(","),
      ...rows.map((row) => row.map(csvCell).join(",")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeAffiliate = search.trim()
      ? search.trim().replace(/[^a-zA-Z0-9_-]/g, "_")
      : "all";

    anchor.href = url;
    anchor.download = `upnetwork-lead-report-${safeAffiliate}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  const totalConversions = clicks.filter(isConverted).length;

  const totalEarnings = clicks.reduce(
    (sum, click) =>
      sum + (isConverted(click) ? Number(click.payout || 0) : 0),
    0
  );

  const fraudCount = clicks.filter(
    (click) => (click.review_status || "unreviewed") === "fraud"
  ).length;

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <RefreshCw className="h-7 w-7 animate-spin text-blue-600" />
        <span className="ml-3 text-slate-600">
          Checking administrator access...
        </span>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <button
          onClick={() => router.push("/admin")}
          className="mb-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin Dashboard
        </button>

        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
              <ShieldCheck className="h-4 w-4" />
              UpNetwork CPA Admin
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Manage Conversions
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Review affiliate leads, inspect IP/User Agent, and export reports.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={downloadCsv}
              disabled={loading || clicks.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Download CSV
            </button>
            <button
              onClick={() => void loadClicks(search, filter)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-blue-700">
              <Search className="h-5 w-5" />
              <span className="text-sm font-semibold">Loaded Clicks</span>
            </div>
            <p className="text-3xl font-extrabold">{clicks.length}</p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-semibold">Conversions</span>
            </div>
            <p className="text-3xl font-extrabold">{totalConversions}</p>
          </div>

          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-violet-700">
              <DollarSign className="h-5 w-5" />
              <span className="text-sm font-semibold">Affiliate Earnings</span>
            </div>
            <p className="text-3xl font-extrabold">{money(totalEarnings)}</p>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-red-700">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-sm font-semibold">Fraud Flagged</span>
            </div>
            <p className="text-3xl font-extrabold">{fraudCount}</p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_220px_auto_auto]">
            <div>
              <label className="mb-2 block text-sm font-bold">
                Search Click ID or Affiliate ID
              </label>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void loadClicks(search, filter);
                  }
                }}
                placeholder="Enter an Affiliate ID for its report"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Filter
              </label>
              <select
                value={filter}
                onChange={(event) => {
                  const next = event.target.value;
                  setFilter(next);
                  void loadClicks(search, next);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                <option value="all">All Clicks</option>
                <option value="pending">Pending Conversion</option>
                <option value="converted">Converted</option>
                <option value="unreviewed">Unreviewed Leads</option>
                <option value="fraud">Fraud Suspected</option>
                <option value="investigate">Investigate</option>
                <option value="review-approved">Review Approved</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => void loadClicks(search, filter)}
                disabled={loading}
                className="w-full rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Search
              </button>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                  void loadClicks("", "all");
                }}
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700"
          >
            {success}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-bold">Affiliate Clicks & Leads</h2>
            <p className="mt-1 text-xs text-slate-500">
              Showing up to 200 matching records. CSV exports the records currently shown.
              Review flags do not automatically change payouts or conversion status.
            </p>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">
              Loading clicks...
            </div>
          ) : clicks.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No matching clicks found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[2200px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-4">Click ID</th>
                    <th className="px-4 py-4">Affiliate ID</th>
                    <th className="px-4 py-4">IP / Check IP</th>
                    <th className="px-4 py-4">Traffic Details</th>
                    <th className="px-4 py-4">User Agent</th>
                    <th className="px-4 py-4">Conversion</th>
                    <th className="px-4 py-4">Review Status</th>
                    <th className="px-4 py-4">Review Note</th>
                    <th className="px-4 py-4">Payout</th>
                    <th className="px-4 py-4">Lead Status</th>
                    <th className="px-4 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {clicks.map((click, index) => {
                    const clickId = click.click_id || "";
                    const converted = isConverted(click);
                    const ipCheck = ipChecks[clickId];
                    const status = (click.status || "").toLowerCase();
                    const reviewStatus =
                      reviewStatuses[clickId] ||
                      click.review_status ||
                      "unreviewed";

                    const eligible =
                      !converted &&
                      Boolean(clickId) &&
                      Boolean(click.affiliate_id) &&
                      ["", "click", "pending"].includes(status);

                    const flag = (value: boolean | null) =>
                      value === null ? "Unknown" : String(value);

                    return (
                      <tr
                        key={click.id || clickId || index}
                        className="align-top hover:bg-slate-50"
                      >
                        <td className="max-w-[190px] break-all px-4 py-4 font-mono text-xs">
                          {clickId || "—"}
                          <p className="mt-2 text-slate-400">
                            {dateTime(click.created_at)}
                          </p>
                        </td>

                        <td className="px-4 py-4 font-semibold">
                          {click.affiliate_id || "—"}
                          <p className="mt-2 text-xs font-normal text-slate-500">
                            Offer: {click.offer_id || "—"}
                          </p>
                        </td>

                        <td className="min-w-[230px] max-w-[280px] px-4 py-4 text-xs">
                          <p className="break-all font-mono font-semibold">
                            {click.ip_address || "Not recorded"}
                          </p>

                          {click.ip_address && clickId && (
                            <button
                              onClick={() => void checkIp(click)}
                              disabled={checkingIps[clickId]}
                              className="mt-2 rounded-lg bg-blue-50 px-3 py-2 font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                            >
                              {checkingIps[clickId] ? "Checking..." : "Check IP"}
                            </button>
                          )}

                          {ipErrors[clickId] && (
                            <p role="alert" className="mt-2 text-red-600">
                              {ipErrors[clickId]}
                            </p>
                          )}

                          {ipCheck && (
                            <div className="mt-3 space-y-1 text-slate-600">
                              <p className="font-semibold">
                                Risk: {ipCheck.risk === null ? "Unknown" : `${ipCheck.risk}/100`}
                              </p>
                              <p>Proxy: {flag(ipCheck.proxy)} · VPN: {flag(ipCheck.vpn)}</p>
                              <p>Tor: {flag(ipCheck.tor)} · Hosting: {flag(ipCheck.hosting)}</p>
                              <p>Anonymous: {flag(ipCheck.anonymous)}</p>
                              <p className="text-slate-400">
                                Checked: {dateTime(ipCheck.checked_at)}
                              </p>
                              <p className="text-slate-400">
                                IP reputation is a signal, not proof of fraud.
                              </p>
                            </div>
                          )}
                        </td>

                        <td className="min-w-[200px] max-w-[260px] px-4 py-4 text-xs">
                          <p className="font-semibold">
                            {click.traffic_source || "Unknown"}
                          </p>
                          <p className="mt-1">
                            Country: {click.country || "Unknown"}
                          </p>
                          <p className="mt-1">
                            Device: {click.device || "Unknown"}
                          </p>
                          <p className="mt-1">
                            Browser: {click.browser || "Unknown"}
                          </p>
                          <p className="mt-1">
                            OS: {click.operating_system || "Unknown"}
                          </p>
                          <details className="mt-2">
                            <summary className="cursor-pointer font-semibold">
                              Referrer
                            </summary>
                            <p className="mt-1 break-all">
                              {click.referer || "Not recorded"}
                            </p>
                          </details>
                        </td>

                        <td className="min-w-[240px] max-w-[320px] px-4 py-4 text-xs">
                          {click.user_agent ? (
                            <details>
                              <summary className="cursor-pointer font-semibold text-blue-600">
                                View User Agent
                              </summary>
                              <p className="mt-2 break-all font-mono text-slate-600">
                                {click.user_agent}
                              </p>
                            </details>
                          ) : (
                            <span className="text-slate-400">Not recorded</span>
                          )}
                        </td>

                        <td className="min-w-[150px] px-4 py-4">
                          {converted ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Converted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                              <Clock3 className="h-3.5 w-3.5" />
                              {click.status || "Pending"}
                            </span>
                          )}
                          <p className="mt-2 text-xs text-slate-500">
                            Converted: {dateTime(click.converted_at)}
                          </p>
                        </td>

                        <td className="min-w-[190px] px-4 py-4">
                          <select
                            value={reviewStatus}
                            onChange={(event) =>
                              setReviewStatuses((previous) => ({
                                ...previous,
                                [clickId]: event.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
                          >
                            {REVIEW_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>

                          <p className="mt-2 text-xs text-slate-500">
                            Saved: {dateTime(click.reviewed_at)}
                          </p>
                        </td>

                        <td className="min-w-[230px] px-4 py-4">
                          <textarea
                            value={reviewNotes[clickId] ?? click.review_note ?? ""}
                            maxLength={1000}
                            rows={3}
                            placeholder="Reason / investigation notes..."
                            onChange={(event) =>
                              setReviewNotes((previous) => ({
                                ...previous,
                                [clickId]: event.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-500"
                          />
                          <p className="mt-1 text-right text-xs text-slate-400">
                            {(reviewNotes[clickId] ?? click.review_note ?? "").length}/1000
                          </p>
                        </td>

                        <td className="min-w-[220px] px-4 py-4">
               {converted ? (
                          <>
                   <select
                  value={leadStatuses[clickId] ?? click.lead_status ?? "pending"}
        onChange={(event) =>
          setLeadStatuses((previous) => ({
            ...previous,
            [clickId]: event.target.value,
          }))
        }
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
      >
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="hold">Hold</option>
        <option value="rejected">Rejected / Fraud</option>
      </select>

      <textarea
        value={leadNotes[clickId] ?? click.lead_status_note ?? ""}
        onChange={(event) =>
          setLeadNotes((previous) => ({
            ...previous,
            [clickId]: event.target.value,
          }))
        }
        maxLength={1000}
        rows={2}
        placeholder="Lead status note..."
        className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
      />

      <button
        onClick={() => void saveLeadStatus(click)}
        disabled={savingId !== null}
        className="mt-2 w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {savingId === clickId ? "Saving..." : "Save Lead Status"}
      </button>
    </>
  ) : (
    <span className="text-xs text-slate-400">Not converted</span>
  )}
</td>
                      
                        <td className="min-w-[130px] px-4 py-4">
                          {converted ? (
                            <span className="font-bold text-emerald-700">
                              {money(click.payout)}
                            </span>
                          ) : eligible ? (
                            <input
                              type="number"
                              min="0"
                              max="1000000"
                              step="0.01"
                              placeholder="0.00"
                              value={payouts[clickId] ?? ""}
                              onChange={(event) =>
                                setPayouts((previous) => ({
                                  ...previous,
                                  [clickId]: event.target.value,
                                }))
                              }
                              className="w-28 rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500"
                            />
                          ) : (
                            "—"
                          )}
                        </td>

                        <td className="min-w-[170px] px-4 py-4">
                          <button
                            onClick={() => void saveReview(click)}
                            disabled={savingId !== null || !clickId}
                            className="mb-2 w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {savingId === clickId ? "Saving..." : "Save Review"}
                          </button>

                          {eligible ? (
                            <button
                              onClick={() => void approveConversion(click)}
                              disabled={savingId !== null || reviewStatus === "fraud"}
                              className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {savingId === clickId ? "Processing..." : "Approve Conversion"}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">
                              {converted ? "Completed" : "Unavailable"}
                            </span>
                          )}

                          {reviewStatus === "fraud" && (
                            <p className="mt-2 text-xs font-semibold text-red-600">
                              Fraud flag blocks approval in this page.
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          UpNetwork CPA — Secure Conversion Management
        </p>
      </div>
    </main>
  );
}
