"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  RefreshCw,
  Users,
  MousePointerClick,
  UserCheck,
  DollarSign,
  ArrowLeft,
  Download,
  Eye,
  Globe,
  CalendarDays,
  CreditCard,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  FileDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { verifyAdminAccess } from "@/lib/admin-access";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Profile = {
  id: string;
  affiliate_id: string;
  full_name?: string;
  username?: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  application_status?: string;
  created_at?: string;
};

type Stats = {
  totalClicks: number;
  uniqueVisitors: number;
  totalConversions: number;
  conversionRate: number;
  leadCounts: {
    approved: number;
    pending: number;
    rejected: number;
    hold: number;
    fraud: number;
    other: number;
  };
  conversionEarnings: number;
  paymentTotals: {
    pending: number;
    approved: number;
    paid: number;
    rejected: number;
  };
  referralCount: number;
  referralCommissionTotal: number;
};

type ClickRow = {
  id: string;
  click_id?: string;
  affiliate_id?: string;
  offer_id?: string;
  smartlink_id?: string;
  country?: string;
  city?: string;
  device?: string;
  browser?: string;
  operating_system?: string;
  created_at?: string;
  converted_at?: string;
  payout?: number;
  status?: string;
  lead_status?: string;
  review_status?: string;
  review_note?: string;
  user_agent?: string;
  ip_address?: string;
  worker_sub_id?: string;
  is_suspicious?: boolean;
};

type ConversionRow = {
  id: string;
  click_id?: string;
  payout?: number;
  status?: string;
  created_at?: string;
  converted_at?: string;
};

type PaymentRow = {
  id: string;
  amount?: number;
  currency?: string;
  payment_method?: string;
  payment_address?: string;
  status?: string;
  requested_at?: string;
  processed_at?: string;
  admin_note?: string;
};

type Report = {
  affiliate: Profile;
  stats: Stats;
  clicks: ClickRow[];
  conversions: ConversionRow[];
  payments: PaymentRow[];
  referrals: any[];
  commissions: any[];
};

type ExportFormat = "csv" | "excel" | "pdf";
type ReportSection =
  | "complete"
  | "leads"
  | "conversions"
  | "payments"
  | "referrals";

const emptyStats: Stats = {
  totalClicks: 0,
  uniqueVisitors: 0,
  totalConversions: 0,
  conversionRate: 0,
  leadCounts: {
    approved: 0,
    pending: 0,
    rejected: 0,
    hold: 0,
    fraud: 0,
    other: 0,
  },
  conversionEarnings: 0,
  paymentTotals: {
    pending: 0,
    approved: 0,
    paid: 0,
    rejected: 0,
  },
  referralCount: 0,
  referralCommissionTotal: 0,
};

function money(value?: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(value?: string) {
  const status = String(value || "").toLowerCase();

  if (["approved", "paid"].includes(status))
    return "bg-emerald-500/10 text-emerald-400";

  if (["pending", "hold"].includes(status))
    return "bg-amber-500/10 text-amber-400";

  if (["rejected", "fraud"].includes(status))
    return "bg-red-500/10 text-red-400";

  if (status === "suspended")
    return "bg-orange-500/10 text-orange-400";

  return "bg-slate-700 text-slate-300";
}

function csvCell(value: unknown) {
  let text = String(value ?? "");

  // Prevent spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) {
    alert("No records available for this report.");
    return;
  }

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.map(csvCell).join(","),
    ...rows.map((row) =>
      headers.map((header) => csvCell(row[header])).join(",")
    ),
  ].join("\r\n");

  saveBlob(
    new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    }),
    filename
  );
}

function downloadExcel(
  filename: string,
  sheets: { name: string; rows: Record<string, unknown>[] }[]
) {
  if (!sheets.some((sheet) => sheet.rows.length)) {
    alert("No records available for this report.");
    return;
  }

  const workbook = XLSX.utils.book_new();

  sheets.forEach((sheet) => {
    const rows = sheet.rows.length ? sheet.rows : [{ Information: "No records found" }];
    const worksheet = XLSX.utils.json_to_sheet(rows);

    const headers = Object.keys(rows[0] || {});
    worksheet["!cols"] = headers.map((header) => ({
      wch: Math.min(
        Math.max(
          header.length + 4,
          ...rows.slice(0, 100).map((row) =>
            String(row[header] ?? "").length + 2
          )
        ),
        45
      ),
    }));

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      sheet.name.slice(0, 31)
    );
  });

  XLSX.writeFile(workbook, filename, {
    bookType: "xlsx",
    compression: true,
  });
}

function downloadPDF(
  filename: string,
  title: string,
  sheets: { name: string; rows: Record<string, unknown>[] }[]
) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  doc.setFontSize(17);
  doc.text("UpNetwork CPA", 14, 15);

  doc.setFontSize(12);
  doc.text(title, 14, 23);

  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 29);

  let firstTable = true;

  sheets.forEach((sheet) => {
    if (!firstTable) doc.addPage();
    firstTable = false;

    doc.setFontSize(12);
    doc.text(sheet.name, 14, 39);

    const rows = sheet.rows;
    const headers = rows.length
      ? Object.keys(rows[0])
      : ["Information"];

    const body = rows.length
      ? rows.map((row) =>
          headers.map((header) => String(row[header] ?? ""))
        )
      : [["No records found"]];

    autoTable(doc, {
      startY: 44,
      head: [headers],
      body,
      theme: "grid",
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [15, 80, 110],
        textColor: 255,
      },
      margin: {
        left: 14,
        right: 14,
        bottom: 15,
      },
      horizontalPageBreak: true,
      horizontalPageBreakRepeat: 0,
    });
  });

  doc.save(filename);
}

function makeLeadRows(clicks: ClickRow[]) {
  return clicks.map((click) => ({
    Date: formatDate(click.created_at),
    Affiliate_ID: click.affiliate_id || "",
    Click_ID: click.click_id || "",
    Offer_ID: click.offer_id || "",
    Smartlink_ID: click.smartlink_id || "",
    Country: click.country || "",
    City: click.city || "",
    IP_Address: click.ip_address || "",
    Device: click.device || "",
    Operating_System: click.operating_system || "",
    Browser: click.browser || "",
    User_Agent: click.user_agent || "",
    Worker_Sub_ID: click.worker_sub_id || "",
    Payout: Number(click.payout || 0),
    Lead_Status: click.lead_status || "",
    Review_Status: click.review_status || "",
    Review_Note: click.review_note || "",
    Suspicious: click.is_suspicious ? "Yes" : "No",
  }));
}

function makeConversionRows(rows: ConversionRow[]) {
  return rows.map((row) => ({
    Date: formatDate(row.converted_at || row.created_at),
    Conversion_ID: row.id,
    Click_ID: row.click_id || "",
    Payout: Number(row.payout || 0),
    Status: row.status || "",
  }));
}

function makePaymentRows(rows: PaymentRow[]) {
  return rows.map((row) => ({
    Requested: formatDate(row.requested_at),
    Amount: Number(row.amount || 0),
    Currency: row.currency || "",
    Payment_Method: row.payment_method || "",
    Payment_Address: row.payment_address || "",
    Status: row.status || "",
    Processed_At: formatDate(row.processed_at),
    Admin_Note: row.admin_note || "",
  }));
}

function makeReferralRows(referrals: any[], affiliateId: string) {
  return referrals
    .filter((row) => row.referrer_affiliate_id === affiliateId)
    .map((row) => ({
      Referral_ID: row.id || "",
      Referred_Affiliate_ID: row.referred_affiliate_id || "",
      Status: row.status || "",
      Created: formatDate(row.created_at),
    }));
}

function makeCommissionRows(commissions: any[], affiliateId: string) {
  return commissions
    .filter((row) => row.referrer_affiliate_id === affiliateId)
    .map((row) => ({
      Referred_Affiliate_ID: row.referred_affiliate_id || "",
      Click_ID: row.click_id || "",
      Source_Earnings: Number(row.source_earnings || 0),
      Commission_Rate: Number(row.commission_rate || 0),
      Commission_Amount: Number(row.commission_amount || 0),
      Status: row.status || "",
      Created: formatDate(row.created_at),
      Paid_At: formatDate(row.paid_at),
    }));
}

function makeSummaryRows(report: Report) {
  const stats = report.stats || emptyStats;
  const profile = report.affiliate;

  return [
    { Field: "Affiliate ID", Value: profile.affiliate_id },
    { Field: "Full Name", Value: profile.full_name || "" },
    { Field: "Username", Value: profile.username || "" },
    { Field: "Email", Value: profile.email || "" },
    { Field: "Phone", Value: profile.phone || "" },
    { Field: "Country", Value: profile.country || "" },
    { Field: "City", Value: profile.city || "" },
    { Field: "Account Status", Value: profile.application_status || "" },
    { Field: "Joined", Value: formatDate(profile.created_at) },
    { Field: "Total Clicks", Value: stats.totalClicks },
    { Field: "Unique Visitors", Value: stats.uniqueVisitors },
    { Field: "Conversions", Value: stats.totalConversions },
    { Field: "Conversion Rate", Value: `${stats.conversionRate}%` },
    { Field: "Approved Leads", Value: stats.leadCounts.approved },
    { Field: "Pending Leads", Value: stats.leadCounts.pending },
    { Field: "Rejected Leads", Value: stats.leadCounts.rejected },
    { Field: "Hold Leads", Value: stats.leadCounts.hold },
    { Field: "Fraud Flagged", Value: stats.leadCounts.fraud },
    { Field: "Other Leads", Value: stats.leadCounts.other },
    { Field: "Approved Conversion Earnings", Value: stats.conversionEarnings },
    { Field: "Pending Payments", Value: stats.paymentTotals.pending },
    { Field: "Approved Payments", Value: stats.paymentTotals.approved },
    { Field: "Paid Payments", Value: stats.paymentTotals.paid },
    { Field: "Rejected Payments", Value: stats.paymentTotals.rejected },
    { Field: "Referral Count", Value: stats.referralCount },
    { Field: "Referral Commission", Value: stats.referralCommissionTotal },
  ];
}

function buildExportSheets(
  report: Report,
  section: ReportSection
) {
  const affiliateId = report.affiliate.affiliate_id;

  const all = [
    { name: "Affiliate Summary", rows: makeSummaryRows(report) },
    { name: "Leads", rows: makeLeadRows(report.clicks || []) },
    { name: "Conversions", rows: makeConversionRows(report.conversions || []) },
    { name: "Payments", rows: makePaymentRows(report.payments || []) },
    {
      name: "Referrals",
      rows: makeReferralRows(report.referrals || [], affiliateId),
    },
    {
      name: "Commissions",
      rows: makeCommissionRows(report.commissions || [], affiliateId),
    },
  ];

  if (section === "complete") return all;
  if (section === "leads") return [all[1]];
  if (section === "conversions") return [all[2]];
  if (section === "payments") return [all[3]];
  return [all[4], all[5]];
}

export default function AffiliateDetailsPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const [affiliates, setAffiliates] = useState<
    { affiliate: Profile; stats: Stats }[]
  >([]);

  const [selectedId, setSelectedId] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [activeTab, setActiveTab] = useState("leads");

  const getToken = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      router.replace("/login");
      return null;
    }

    return session.access_token;
  }, [router]);

  const loadAffiliates = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = await getToken();
      if (!token) return;

      const params = new URLSearchParams();

      if (search.trim()) params.set("search", search.trim());
      if (status !== "all") params.set("status", status);

      const response = await fetch(
        `/api/admin/affiliate-details?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.details || data.error || "Unable to load affiliates."
        );
      }

      setAffiliates(Array.isArray(data.affiliates) ? data.affiliates : []);
    } catch (err: any) {
      console.error("Affiliate list error:", err);
      setError(err.message || "Unable to load affiliate details.");
    } finally {
      setLoading(false);
    }
  }, [getToken, search, status]);

  const loadReport = useCallback(
    async (affiliateId: string) => {
      try {
        setDetailLoading(true);
        setError("");

        const token = await getToken();
        if (!token) return;

        const response = await fetch(
          `/api/admin/affiliate-details?affiliate_id=${encodeURIComponent(
            affiliateId
          )}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.details || data.error || "Unable to load affiliate report."
          );
        }

        setReport(data as Report);
        setSelectedId(affiliateId);
      } catch (err: any) {
        console.error("Affiliate report error:", err);
        setError(err.message || "Unable to load affiliate report.");
      } finally {
        setDetailLoading(false);
      }
    },
    [getToken]
  );

  useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      try {
        const token = await getToken();
        if (!token) return;

        const allowed = await verifyAdminAccess(token);

        if (!allowed) {
          router.replace("/affiliate");
          return;
        }

        if (mounted) setChecking(false);
      } catch (err) {
        console.error("Admin access error:", err);
        router.replace("/login");
      }
    }

    void checkAccess();

    return () => {
      mounted = false;
    };
  }, [getToken, router]);

  useEffect(() => {
    if (!checking && !selectedId) {
      void loadAffiliates();
    }
  }, [checking, selectedId, loadAffiliates]);
// Auto-refresh affiliate list and selected affiliate report every 10 seconds.
useEffect(() => {
  if (checking) return;

  const refreshData = () => {
    // Do not refresh while the browser tab is in the background.
    if (document.visibilityState !== "visible") return;

    // Avoid overlapping requests.
    if (loading || detailLoading) return;

    if (selectedId) {
      void loadReport(selectedId);
    } else {
      void loadAffiliates();
    }
  };

  const interval = window.setInterval(refreshData, 10000);

  return () => window.clearInterval(interval);
}, [
  checking,
  selectedId,
  loading,
  detailLoading,
  loadReport,
  loadAffiliates,
]);
  
  const summary = useMemo(() => {
    return affiliates.reduce(
      (total, item) => {
        const stats = item.stats || emptyStats;
        total.clicks += Number(stats.totalClicks || 0);
        total.conversions += Number(stats.totalConversions || 0);
        total.earnings += Number(stats.conversionEarnings || 0);
        total.affiliates += 1;
        return total;
      },
      { affiliates: 0, clicks: 0, conversions: 0, earnings: 0 }
    );
  }, [affiliates]);

  function exportReport(
    format: ExportFormat,
    section: ReportSection = "complete"
  ) {
    if (!report) return;

    const id = report.affiliate.affiliate_id;
    const sheets = buildExportSheets(report, section);
    const sectionName =
      section === "complete" ? "complete-report" : `${section}-report`;

    const title = `${id} ${sectionName}`;

    try {
      if (format === "csv") {
        const sheet = sheets[0];
        downloadCSV(
          `${title}.csv`,
          sheet.rows
        );
      } else if (format === "excel") {
        downloadExcel(`${title}.xlsx`, sheets);
      } else {
        downloadPDF(`${title}.pdf`, title, sheets);
      }
    } catch (err) {
      console.error("Report export error:", err);
      alert("Unable to generate report. Please try again.");
    }
  }

  function ExportButtons({
    section,
  }: {
    section: ReportSection;
  }) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => exportReport("csv", section)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800"
        >
          <Download size={14} />
          CSV
        </button>
        <button
          onClick={() => exportReport("excel", section)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500"
        >
          <FileSpreadsheet size={14} />
          Excel
        </button>
        <button
          onClick={() => exportReport("pdf", section)}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-500"
        >
          <FileText size={14} />
          PDF
        </button>
      </div>
    );
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">Checking admin access...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">
              UpNetwork CPA / Admin
            </p>
            <h1 className="mt-2 text-2xl font-black md:text-3xl">
              Affiliate Details
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Affiliate performance, lead activity and payment history.
            </p>
          </div>

          <button
            onClick={() => {
              if (selectedId) void loadReport(selectedId);
              else void loadAffiliates();
            }}
            disabled={loading || detailLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading || detailLoading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </header>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!selectedId ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Total Affiliates",
                  value: summary.affiliates,
                  icon: Users,
                },
                {
                  label: "Total Clicks",
                  value: summary.clicks.toLocaleString(),
                  icon: MousePointerClick,
                },
                {
                  label: "Total Conversions",
                  value: summary.conversions.toLocaleString(),
                  icon: UserCheck,
                },
                {
                  label: "Conversion Earnings",
                  value: money(summary.earnings),
                  icon: DollarSign,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-400">{item.label}</p>
                      <Icon size={20} className="text-cyan-400" />
                    </div>
                    <p className="mt-3 text-2xl font-black">{item.value}</p>
                  </div>
                );
              })}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void loadAffiliates();
                    }}
                    placeholder="Search name, email or Affiliate ID..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-sm outline-none focus:border-cyan-500"
                  />
                </div>

                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-cyan-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                  <option value="suspended">Suspended</option>
                </select>

                <button
                  onClick={() => void loadAffiliates()}
                  className="rounded-xl bg-cyan-600 px-5 py-3 text-sm font-bold hover:bg-cyan-500"
                >
                  Search
                </button>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                <h2 className="font-bold">Affiliate Performance List</h2>
                <span className="text-xs text-slate-500">
                  {affiliates.length} affiliates
                </span>
              </div>

              {loading ? (
                <div className="p-12 text-center text-slate-400">
                  Loading affiliate reports...
                </div>
              ) : affiliates.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  No affiliates found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead className="bg-slate-950 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-5 py-4">Affiliate</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4">Clicks</th>
                        <th className="px-5 py-4">Conversions</th>
                        <th className="px-5 py-4">Approved Leads</th>
                        <th className="px-5 py-4">Earnings</th>
                        <th className="px-5 py-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {affiliates.map((item) => {
                        const profile = item.affiliate;
                        const stats = item.stats || emptyStats;

                        return (
                          <tr
                            key={profile.affiliate_id}
                            className="hover:bg-slate-800/50"
                          >
                            <td className="px-5 py-4">
                              <p className="font-bold">
                                {profile.full_name ||
                                  profile.username ||
                                  "Affiliate"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {profile.affiliate_id}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {profile.email || ""}
                              </p>
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                                  profile.application_status
                                )}`}
                              >
                                {profile.application_status || "Unknown"}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              {stats.totalClicks.toLocaleString()}
                            </td>
                            <td className="px-5 py-4">
                              {stats.totalConversions.toLocaleString()}
                            </td>
                            <td className="px-5 py-4 text-emerald-400">
                              {stats.leadCounts?.approved || 0}
                            </td>
                            <td className="px-5 py-4 font-bold text-cyan-300">
                              {money(stats.conversionEarnings)}
                            </td>
                            <td className="px-5 py-4">
                              <button
                                onClick={() =>
                                  void loadReport(profile.affiliate_id)
                                }
                                className="inline-flex items-center gap-2 rounded-lg bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20"
                              >
                                <Eye size={14} />
                                View Details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => {
                  setSelectedId("");
                  setReport(null);
                  setError("");
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold hover:bg-slate-800"
              >
                <ArrowLeft size={16} />
                Back to Affiliates
              </button>

              {report && <ExportButtons section="complete" />}
            </div>

            {detailLoading ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center text-slate-400">
                Loading affiliate details...
              </div>
            ) : report ? (
              <>
                <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-black">
                        {report.affiliate.full_name ||
                          report.affiliate.username ||
                          "Affiliate"}
                      </h2>
                      <p className="mt-1 text-sm text-cyan-300">
                        {report.affiliate.affiliate_id}
                      </p>
                      <p className="mt-2 text-sm text-slate-400">
                        {report.affiliate.email || "No email available"}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {report.affiliate.country || "Country not available"}
                        {report.affiliate.city
                          ? ` · ${report.affiliate.city}`
                          : ""}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Joined: {formatDate(report.affiliate.created_at)}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-4 py-2 text-xs font-bold ${statusClass(
                        report.affiliate.application_status
                      )}`}
                    >
                      {report.affiliate.application_status || "Unknown"}
                    </span>
                  </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    ["Total Clicks", report.stats.totalClicks, MousePointerClick],
                    ["Unique Visitors", report.stats.uniqueVisitors, Users],
                    ["Conversions", report.stats.totalConversions, UserCheck],
                    ["Conversion Rate", `${report.stats.conversionRate}%`, Globe],
                    ["Approved Leads", report.stats.leadCounts.approved, UserCheck],
                    ["Pending Leads", report.stats.leadCounts.pending, CalendarDays],
                    ["Conversion Earnings", money(report.stats.conversionEarnings), DollarSign],
                    ["Paid Amount", money(report.stats.paymentTotals.paid), CreditCard],
                  ].map(([label, value, Icon]: any) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-400">{label}</p>
                        <Icon size={18} className="text-cyan-400" />
                      </div>
                      <p className="mt-3 text-2xl font-black">{value}</p>
                    </div>
                  ))}
                </section>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    ["Rejected Leads", report.stats.leadCounts.rejected],
                    ["Hold Leads", report.stats.leadCounts.hold],
                    ["Fraud Flagged", report.stats.leadCounts.fraud],
                    ["Pending Payments", money(report.stats.paymentTotals.pending)],
                  ].map(([label, value]: any) => (
                    <div
                      key={label}
                      className="rounded-xl border border-slate-800 bg-slate-900 p-4"
                    >
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="mt-2 text-xl font-bold">{value}</p>
                    </div>
                  ))}
                </section>

                <section className="rounded-2xl border border-slate-800 bg-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4">
                    <div className="flex flex-wrap gap-2">
                      {[
                        ["leads", "Lead / Click History"],
                        ["conversions", "Conversions"],
                        ["payments", "Payments"],
                        ["referrals", "Referrals"],
                      ].map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setActiveTab(key)}
                          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                            activeTab === key
                              ? "bg-cyan-500/15 text-cyan-300"
                              : "text-slate-400 hover:bg-slate-800"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {activeTab === "leads" && (
                    <div className="overflow-x-auto">
                      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                        <div>
                          <h3 className="font-bold">Click and Lead Records</h3>
                          <p className="mt-1 text-xs text-slate-500">
                            {report.clicks.length} records
                          </p>
                        </div>
                        <ExportButtons section="leads" />
                      </div>

                      <table className="w-full min-w-[1250px] text-left text-xs">
                        <thead className="bg-slate-950 uppercase text-slate-500">
                          <tr>
                            {[
                              "Date",
                              "Click ID",
                              "Offer ID",
                              "Country",
                              "IP Address",
                              "Device / OS",
                              "Browser",
                              "Worker Sub ID",
                              "Payout",
                              "Lead Status",
                              "Review",
                            ].map((heading) => (
                              <th key={heading} className="px-4 py-3">
                                {heading}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {report.clicks.map((click) => (
                            <tr key={click.id} className="hover:bg-slate-800/40">
                              <td className="whitespace-nowrap px-4 py-3">
                                {formatDate(click.created_at)}
                              </td>
                              <td className="px-4 py-3 font-mono text-cyan-300">
                                {click.click_id || "—"}
                              </td>
                              <td className="px-4 py-3">
                                {click.offer_id || click.smartlink_id || "—"}
                              </td>
                              <td className="px-4 py-3">
                                {click.country || "—"}
                              </td>
                              <td className="px-4 py-3 font-mono">
                                {click.ip_address || "—"}
                              </td>
                              <td className="px-4 py-3">
                                <div>{click.device || "—"}</div>
                                <div className="mt-1 text-slate-500">
                                  {click.operating_system || "—"}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {click.browser || "—"}
                              </td>
                              <td className="px-4 py-3">
                                {click.worker_sub_id || "—"}
                              </td>
                              <td className="px-4 py-3">
                                {money(click.payout)}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`rounded-full px-2 py-1 ${statusClass(click.lead_status)}`}>
                                  {click.lead_status || "Unknown"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`rounded-full px-2 py-1 ${statusClass(click.review_status)}`}>
                                  {click.review_status || "Unreviewed"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {report.clicks.length === 0 && (
                        <p className="p-8 text-center text-sm text-slate-500">
                          No click records found.
                        </p>
                      )}
                    </div>
                  )}

                  {activeTab === "conversions" && (
                    <div className="overflow-x-auto p-4">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h3 className="font-bold">Conversion History</h3>
                        <ExportButtons section="conversions" />
                      </div>

                      <table className="w-full min-w-[650px] text-left text-sm">
                        <thead className="text-xs uppercase text-slate-500">
                          <tr>
                            <th className="px-3 py-3">Date</th>
                            <th className="px-3 py-3">Click ID</th>
                            <th className="px-3 py-3">Payout</th>
                            <th className="px-3 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {report.conversions.map((row) => (
                            <tr key={row.id}>
                              <td className="px-3 py-3">
                                {formatDate(row.converted_at || row.created_at)}
                              </td>
                              <td className="px-3 py-3 font-mono text-cyan-300">
                                {row.click_id || "—"}
                              </td>
                              <td className="px-3 py-3">{money(row.payout)}</td>
                              <td className="px-3 py-3">
                                <span className={`rounded-full px-2 py-1 text-xs ${statusClass(row.status)}`}>
                                  {row.status || "Unknown"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {report.conversions.length === 0 && (
                        <p className="p-8 text-center text-sm text-slate-500">
                          No conversions found.
                        </p>
                      )}
                    </div>
                  )}

                  {activeTab === "payments" && (
                    <div className="overflow-x-auto p-4">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h3 className="font-bold">Payment History</h3>
                        <ExportButtons section="payments" />
                      </div>

                      <table className="w-full min-w-[750px] text-left text-sm">
                        <thead className="text-xs uppercase text-slate-500">
                          <tr>
                            <th className="px-3 py-3">Requested</th>
                            <th className="px-3 py-3">Amount</th>
                            <th className="px-3 py-3">Method</th>
                            <th className="px-3 py-3">Address</th>
                            <th className="px-3 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {report.payments.map((payment) => (
                            <tr key={payment.id}>
                              <td className="px-3 py-3">
                                {formatDate(payment.requested_at)}
                              </td>
                              <td className="px-3 py-3 font-bold">
                                {money(payment.amount)}
                              </td>
                              <td className="px-3 py-3">
                                {payment.payment_method || "—"}
                              </td>
                              <td className="max-w-[220px] truncate px-3 py-3">
                                {payment.payment_address || "—"}
                              </td>
                              <td className="px-3 py-3">
                                <span className={`rounded-full px-2 py-1 text-xs ${statusClass(payment.status)}`}>
                                  {payment.status || "Unknown"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {report.payments.length === 0 && (
                        <p className="p-8 text-center text-sm text-slate-500">
                          No payment history found.
                        </p>
                      )}
                    </div>
                  )}

                  {activeTab === "referrals" && (
                    <div className="overflow-x-auto p-4">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h3 className="font-bold">Referral History</h3>
                        <ExportButtons section="referrals" />
                      </div>

                      <div className="mb-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-slate-950 p-4">
                          <p className="text-xs text-slate-500">
                            Referred Affiliates
                          </p>
                          <p className="mt-2 text-xl font-bold">
                            {report.stats.referralCount}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-950 p-4">
                          <p className="text-xs text-slate-500">
                            Referral Commission
                          </p>
                          <p className="mt-2 text-xl font-bold text-cyan-300">
                            {money(report.stats.referralCommissionTotal)}
                          </p>
                        </div>
                      </div>

                      <table className="w-full min-w-[650px] text-left text-sm">
                        <thead className="text-xs uppercase text-slate-500">
                          <tr>
                            <th className="px-3 py-3">
                              Referred Affiliate ID
                            </th>
                            <th className="px-3 py-3">Status</th>
                            <th className="px-3 py-3">Created</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {report.referrals
                            .filter(
                              (row) =>
                                row.referrer_affiliate_id ===
                                report.affiliate.affiliate_id
                            )
                            .map((row) => (
                              <tr key={row.id}>
                                <td className="px-3 py-3 font-mono">
                                  {row.referred_affiliate_id || "—"}
                                </td>
                                <td className="px-3 py-3">
                                  {row.status || "—"}
                                </td>
                                <td className="px-3 py-3">
                                  {formatDate(row.created_at)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    ["Approved Payments", money(report.stats.paymentTotals.approved)],
                    ["Paid Payments", money(report.stats.paymentTotals.paid)],
                    ["Rejected Payments", money(report.stats.paymentTotals.rejected)],
                    ["Referral Commission", money(report.stats.referralCommissionTotal)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl border border-slate-800 bg-slate-900 p-4"
                    >
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="mt-2 text-xl font-bold">{value}</p>
                    </div>
                  ))}
                </section>

                <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <div className="flex items-center gap-2">
                    <FileDown size={20} className="text-cyan-400" />
                    <h3 className="font-bold">Download Complete Affiliate Report</h3>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    Download the affiliate summary, leads, conversions,
                    payments, referrals and commissions together.
                  </p>
                  <div className="mt-4">
                    <ExportButtons section="complete" />
                  </div>
                </section>
              </>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
