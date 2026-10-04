"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Clock3,
  Users,
  Mail,
  Phone,
  Globe2,
  Building2,
  ChevronLeft,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAIL = "islamhanif122@gmail.com";

type AffiliateStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended"
  | "unknown";

type Affiliate = {
  id: string;
  affiliate_id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  country?: string;
  city?: string;
  traffic_source?: string;
  monthly_traffic?: string;
  promotion_method?: string;
  experience?: string;
  previous_networks?: string;
  company_name?: string;
  payment_method?: string;
  referred_by?: string;
  application_status: AffiliateStatus;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  email_confirmed?: boolean;
};

type Totals = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  suspended: number;
  unknown: number;
};

const EMPTY_TOTALS: Totals = {
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  suspended: 0,
  unknown: 0,
};

const STATUS_TABS: {
  key: AffiliateStatus | "all";
  label: string;
}[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "suspended", label: "Suspended" },
];

function statusLabel(status: AffiliateStatus) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "suspended") return "Suspended";
  if (status === "pending") return "Pending";
  return "Unknown";
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusBadge({
  status,
}: {
  status: AffiliateStatus;
}) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Approved
      </span>
    );
  }

  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
        <XCircle className="h-3.5 w-3.5" />
        Rejected
      </span>
    );
  }

  if (status === "suspended") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
        <PauseCircle className="h-3.5 w-3.5" />
        Suspended
      </span>
    );
  }

  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
        <Clock3 className="h-3.5 w-3.5" />
        Pending
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
      Unknown
    </span>
  );
}

export default function AdminAffiliatesPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(
    null
  );

  const [affiliates, setAffiliates] = useState<Affiliate[]>(
    []
  );

  const [totals, setTotals] =
    useState<Totals>(EMPTY_TOTALS);

  const [activeTab, setActiveTab] =
    useState<AffiliateStatus | "all">("all");

  const [search, setSearch] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* =========================================
     ADMIN AUTH CHECK
  ========================================= */

  useEffect(() => {
    async function checkAdmin() {
      try {
        if (!supabase) {
          router.replace("/login");
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/login");
          return;
        }

        const email =
          session.user.email?.trim().toLowerCase();

        if (
          email !== ADMIN_EMAIL.toLowerCase()
        ) {
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        setChecking(false);
      } catch {
        router.replace("/login");
      }
    }

    checkAdmin();
  }, [router]);

  /* =========================================
     LOAD AFFILIATES
  ========================================= */

  async function loadAffiliates(
    status: AffiliateStatus | "all" = activeTab
  ) {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      if (!supabase) {
        throw new Error(
          "Supabase client is unavailable."
        );
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace("/login");
        return;
      }

      const params = new URLSearchParams();

      if (status !== "all") {
        params.set("status", status);
      }

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const query =
        params.toString();

      const response = await fetch(
        `/api/admin/affiliates${
          query ? `?${query}` : ""
        }`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        }
      );

      const result =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Unable to load affiliates."
        );
      }

      setAffiliates(
        Array.isArray(result.affiliates)
          ? result.affiliates
          : []
      );

      setTotals(
        result.totals || EMPTY_TOTALS
      );
    } catch (err: any) {
      console.error(
        "Affiliate loading error:",
        err
      );

      setError(
        err?.message ||
          "Unable to load affiliates."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!checking) {
      loadAffiliates(activeTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, activeTab]);

  /* =========================================
     SEARCH
  ========================================= */

  useEffect(() => {
    if (checking) return;

    const timer = setTimeout(() => {
      loadAffiliates(activeTab);
    }, 400);

    return () => clearTimeout(timer);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  /* =========================================
     UPDATE STATUS
  ========================================= */

  async function updateStatus(
    affiliate: Affiliate,
    newStatus: Exclude<
      AffiliateStatus,
      "unknown"
    >
  ) {
    const actionText =
      newStatus === "approved"
        ? "approve"
        : newStatus === "rejected"
        ? "reject"
        : newStatus === "suspended"
        ? "suspend"
        : "move back to pending";

    const confirmed = window.confirm(
      `Are you sure you want to ${actionText} ${affiliate.name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingId(affiliate.id);
      setError("");
      setSuccess("");

      if (!supabase) {
        throw new Error(
          "Supabase client is unavailable."
        );
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(
        "/api/admin/affiliates",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            user_id: affiliate.id,
            status: newStatus,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Unable to update affiliate."
        );
      }

      setSuccess(
        `${affiliate.name} is now ${statusLabel(
          newStatus
        )}.`
      );

      await loadAffiliates(activeTab);
    } catch (err: any) {
      console.error(
        "Affiliate status update error:",
        err
      );

      setError(
        err?.message ||
          "Unable to update affiliate."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  /* =========================================
     FILTERED DATA
  ========================================= */

  const displayedAffiliates = useMemo(
    () => affiliates,
    [affiliates]
  );

  /* =========================================
     LOADING SCREEN
  ========================================= */

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-blue-500" />

          <p className="text-sm text-slate-300">
            Checking admin access...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      {/* =====================================
          HEADER
      ====================================== */}

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() =>
                router.push("/admin")
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
              aria-label="Back to admin dashboard"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Users className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-extrabold sm:text-xl">
                Affiliate Management
              </h1>

              <p className="hidden text-xs text-slate-500 sm:block">
                Review and manage affiliate applications
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              loadAffiliates(activeTab)
            }
            disabled={loading}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading
                  ? "animate-spin"
                  : ""
              }`}
            />

            <span className="hidden sm:inline">
              Refresh
            </span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        {/* =====================================
            ALERTS
        ====================================== */}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {success}
          </div>
        )}

        {/* =====================================
            STAT CARDS
        ====================================== */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <button
            type="button"
            onClick={() =>
              setActiveTab("all")
            }
            className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
              activeTab === "all"
                ? "border-blue-400 ring-2 ring-blue-100"
                : "border-slate-200"
            }`}
          >
            <p className="text-sm font-medium text-slate-500">
              Total Affiliates
            </p>

            <p className="mt-2 text-3xl font-extrabold">
              {totals.total}
            </p>

            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-blue-600">
              <Users className="h-4 w-4" />
              All accounts
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab("pending")
            }
            className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
              activeTab === "pending"
                ? "border-amber-400 ring-2 ring-amber-100"
                : "border-slate-200"
            }`}
          >
            <p className="text-sm font-medium text-slate-500">
              Pending
            </p>

            <p className="mt-2 text-3xl font-extrabold">
              {totals.pending}
            </p>

            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-600">
              <Clock3 className="h-4 w-4" />
              Needs review
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab("approved")
            }
            className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
              activeTab === "approved"
                ? "border-emerald-400 ring-2 ring-emerald-100"
                : "border-slate-200"
            }`}
          >
            <p className="text-sm font-medium text-slate-500">
              Approved
            </p>

            <p className="mt-2 text-3xl font-extrabold">
              {totals.approved}
            </p>

            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Active affiliates
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab("rejected")
            }
            className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
              activeTab === "rejected"
                ? "border-red-400 ring-2 ring-red-100"
                : "border-slate-200"
            }`}
          >
            <p className="text-sm font-medium text-slate-500">
              Rejected
            </p>

            <p className="mt-2 text-3xl font-extrabold">
              {totals.rejected}
            </p>

            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-red-600">
              <XCircle className="h-4 w-4" />
              Declined applications
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab("suspended")
            }
            className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
              activeTab === "suspended"
                ? "border-orange-400 ring-2 ring-orange-100"
                : "border-slate-200"
            }`}
          >
            <p className="text-sm font-medium text-slate-500">
              Suspended
            </p>

            <p className="mt-2 text-3xl font-extrabold">
              {totals.suspended}
            </p>

            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-orange-600">
              <PauseCircle className="h-4 w-4" />
              Temporarily blocked
            </div>
          </button>
        </div>

        {/* =====================================
            SEARCH + TABS
        ====================================== */}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search affiliate ID, name, email, phone..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {STATUS_TABS.map(
                (tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        tab.key
                      )
                    }
                    className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                      activeTab ===
                      tab.key
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* =====================================
            AFFILIATE LIST
        ====================================== */}

        <div className="mt-6">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-600" />

              <p className="mt-4 text-sm font-semibold text-slate-700">
                Loading affiliates...
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Please wait.
              </p>
            </div>
          ) : displayedAffiliates.length ===
            0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <Users className="h-7 w-7 text-slate-400" />
              </div>

              <h2 className="mt-5 text-lg font-bold">
                No affiliates found
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {search
                  ? "Try a different search."
                  : activeTab ===
                    "pending"
                  ? "There are no pending applications."
                  : "No affiliate accounts match this filter."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedAffiliates.map(
                (affiliate) => {
                  const updating =
                    updatingId ===
                    affiliate.id;

                  return (
                    <div
                      key={affiliate.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                      {/* Main row */}
                      <div className="p-5">
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                          {/* Identity */}
                          <div className="flex min-w-0 items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                              <UserRound className="h-6 w-6" />
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-extrabold">
                                  {affiliate.name}
                                </h3>

                                <StatusBadge
                                  status={
                                    affiliate.application_status
                                  }
                                />
                              </div>

                              <p className="mt-1 text-sm font-semibold text-blue-600">
                                {affiliate.affiliate_id}
                              </p>

                              <p className="mt-2 break-all text-sm text-slate-500">
                                {affiliate.email ||
                                  "No email"}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                Applied{" "}
                                {formatDate(
                                  affiliate.created_at
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2">
                            {affiliate.application_status !==
                              "approved" && (
                              <button
                                type="button"
                                disabled={
                                  updating
                                }
                                onClick={() =>
                                  updateStatus(
                                    affiliate,
                                    "approved"
                                  )
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                Approve
                              </button>
                            )}

                            {affiliate.application_status !==
                              "rejected" && (
                              <button
                                type="button"
                                disabled={
                                  updating
                                }
                                onClick={() =>
                                  updateStatus(
                                    affiliate,
                                    "rejected"
                                  )
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <XCircle className="h-4 w-4" />
                                Reject
                              </button>
                            )}

                            {affiliate.application_status !==
                              "suspended" && (
                              <button
                                type="button"
                                disabled={
                                  updating
                                }
                                onClick={() =>
                                  updateStatus(
                                    affiliate,
                                    "suspended"
                                  )
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-bold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <PauseCircle className="h-4 w-4" />
                                Suspend
                              </button>
                            )}

                            {affiliate.application_status !==
                              "pending" && (
                              <button
                                type="button"
                                disabled={
                                  updating
                                }
                                onClick={() =>
                                  updateStatus(
                                    affiliate,
                                    "pending"
                                  )
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Clock3 className="h-4 w-4" />
                                Pending
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Phone
                            </p>

                            <p className="mt-1 flex items-center gap-2 break-all text-sm font-semibold text-slate-700">
                              <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              {affiliate.phone ||
                                "—"}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Location
                            </p>

                            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
                              <Globe2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              {[
                                affiliate.city,
                                affiliate.country,
                              ]
                                .filter(
                                  Boolean
                                )
                                .join(
                                  ", "
                                ) ||
                                "—"}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Traffic
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {affiliate.traffic_source ||
                                "—"}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Monthly Traffic
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {affiliate.monthly_traffic ||
                                "—"}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Payment
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {affiliate.payment_method ||
                                "—"}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Company
                            </p>

                            <p className="mt-1 flex items-center gap-2 truncate text-sm font-semibold text-slate-700">
                              <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              {affiliate.company_name ||
                                "Individual"}
                            </p>
                          </div>
                        </div>

                        {/* Additional info */}
                        <div className="mt-3 grid gap-3 lg:grid-cols-3">
                          <div className="rounded-xl border border-slate-100 bg-white p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Promotion Method
                            </p>

                            <p className="mt-1 text-sm text-slate-700">
                              {affiliate.promotion_method ||
                                "—"}
                            </p>
                          </div>

                          <div className="rounded-xl border border-slate-100 bg-white p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Experience
                            </p>

                            <p className="mt-1 text-sm text-slate-700">
                              {affiliate.experience ||
                                "—"}
                            </p>
                          </div>

                          <div className="rounded-xl border border-slate-100 bg-white p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Previous Networks
                            </p>

                            <p className="mt-1 text-sm text-slate-700">
                              {affiliate.previous_networks ||
                                "—"}
                            </p>
                          </div>
                        </div>

                        {/* Footer information */}
                        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
                          <span className="inline-flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" />
                            Email{" "}
                            {affiliate.email_confirmed
                              ? "confirmed"
                              : "not confirmed"}
                          </span>

                          {affiliate.referred_by && (
                            <span>
                              Referred by:{" "}
                              <b className="text-slate-600">
                                {
                                  affiliate.referred_by
                                }
                              </b>
                            </span>
                          )}

                          {affiliate.last_sign_in_at && (
                            <span>
                              Last login:{" "}
                              {formatDate(
                                affiliate.last_sign_in_at
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Updating indicator */}
                      {updating && (
                        <div className="flex items-center gap-2 border-t border-blue-100 bg-blue-50 px-5 py-3 text-xs font-semibold text-blue-700">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Updating affiliate status...
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>

        {/* =====================================
            SECURITY NOTE
        ====================================== */}

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

          <div>
            <p className="text-sm font-bold text-blue-900">
              Admin-only affiliate management
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-700">
              Status changes are sent through the
              protected admin API and require the
              authenticated administrator session.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
        }
