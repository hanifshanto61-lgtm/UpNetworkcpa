"use client";

import { useEffect, useState } from "react";
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
  UserPlus,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAIL = "islamhanif122@gmail.com";

type Status =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended"
  | "unknown";

type Affiliate = {
  id: string;
  affiliate_id: string;
  name: string;
  email: string;
  phone?: string;
  country?: string;
  city?: string;
  address?: string;
  traffic_source?: string;
  traffic_url?: string;
  social_profile?: string;
  monthly_traffic?: string;
  promotion_method?: string;
  experience?: string;
  previous_networks?: string;
  company_name?: string;
  payment_method?: string;
  referred_by?: string;
  referral_code?: string;
  referral_rate?: number;
  application_status: Status;
  created_at?: string | null;
  updated_at?: string | null;
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

const emptyTotals: Totals = {
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  suspended: 0,
  unknown: 0,
};

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusBadge({ status }: { status: Status }) {
  const config = {
    approved: {
      text: "Approved",
      icon: CheckCircle2,
      className: "bg-emerald-50 text-emerald-700",
    },
    rejected: {
      text: "Rejected",
      icon: XCircle,
      className: "bg-red-50 text-red-700",
    },
    suspended: {
      text: "Suspended",
      icon: PauseCircle,
      className: "bg-orange-50 text-orange-700",
    },
    pending: {
      text: "Pending",
      icon: Clock3,
      className: "bg-amber-50 text-amber-700",
    },
    unknown: {
      text: "Unknown",
      icon: Clock3,
      className: "bg-slate-100 text-slate-600",
    },
  } as const;

  const item = config[status] || config.unknown;
  const Icon = item.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${item.className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {item.text}
    </span>
  );
}

export default function AdminAffiliatesPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Add Affiliate state
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addAffiliateId, setAddAffiliateId] = useState("");
  const [addReferralRate, setAddReferralRate] = useState("5");

  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [totals, setTotals] = useState<Totals>(emptyTotals);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status | "all">("all");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function checkAdmin() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/login");
          return;
        }

        const email = session.user.email?.trim().toLowerCase();

        if (email !== ADMIN_EMAIL.toLowerCase()) {
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        setChecking(false);
      } catch (err) {
        console.error("Admin authentication error:", err);
        router.replace("/login");
      }
    }

    checkAdmin();
  }, [router]);

  async function loadAffiliates() {
    try {
      setLoading(true);
      setError("");

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

      const query = params.toString();

      const response = await fetch(
        `/api/admin/affiliates${query ? `?${query}` : ""}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to load affiliates."
        );
      }

      setAffiliates(
        Array.isArray(result.affiliates)
          ? result.affiliates
          : []
      );

      setTotals(result.totals || emptyTotals);
    } catch (err: unknown) {
      console.error("Affiliate loading error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load affiliates."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!checking) {
      loadAffiliates();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, status]);

  useEffect(() => {
    if (checking) return;

    const timer = setTimeout(() => {
      loadAffiliates();
    }, 400);

    return () => clearTimeout(timer);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function updateStatus(
    affiliate: Affiliate,
    newStatus: Exclude<Status, "unknown">
  ) {
    const confirmed = window.confirm(
      `Are you sure you want to change ${
        affiliate.name || "this affiliate"
      }'s status to ${newStatus}?`
    );

    if (!confirmed) return;

    try {
      setUpdatingId(affiliate.id);
      setError("");
      setSuccess("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/admin/affiliates", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_id: affiliate.id,
          status: newStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to update affiliate."
        );
      }

      setSuccess(
        `${affiliate.name || "Affiliate"} is now ${newStatus}.`
      );

      await loadAffiliates();
    } catch (err: unknown) {
      console.error("Affiliate status update error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update affiliate."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function createAffiliate() {
    const name = addName.trim();
    const email = addEmail.trim().toLowerCase();
    const password = addPassword;
    const affiliateId = addAffiliateId.trim();
    const referralRate = Number(addReferralRate || 5);

    if (!name) {
      setError("Please enter the affiliate name.");
      return;
    }

    if (!email) {
      setError("Please enter the affiliate email.");
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (
      !Number.isFinite(referralRate) ||
      referralRate < 0 ||
      referralRate > 100
    ) {
      setError("Referral rate must be between 0 and 100.");
      return;
    }

    try {
      setAddLoading(true);
      setError("");
      setSuccess("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/admin/affiliates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name,
          email,
          password,
          affiliate_id: affiliateId || undefined,
          referral_rate: referralRate,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to create affiliate."
        );
      }

      setSuccess(
        `Affiliate account created successfully for ${email}.`
      );

      setAddOpen(false);

      setAddName("");
      setAddEmail("");
      setAddPassword("");
      setAddAffiliateId("");
      setAddReferralRate("5");

      await loadAffiliates();
    } catch (err: unknown) {
      console.error("Create affiliate error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create affiliate."
      );
    } finally {
      setAddLoading(false);
    }
  }

  function closeAddModal() {
    if (addLoading) return;

    setAddOpen(false);

    setAddName("");
    setAddEmail("");
    setAddPassword("");
    setAddAffiliateId("");
    setAddReferralRate("5");
  }

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
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              title="Back to Admin"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Users className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-lg font-extrabold sm:text-xl">
                Affiliate Management
              </h1>

              <p className="hidden text-xs text-slate-500 sm:block">
                View and manage all registered affiliates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setError("");
                setSuccess("");
                setAddOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4" />

              <span className="hidden sm:inline">
                Add Affiliate
              </span>

              <span className="sm:hidden">
                Add
              </span>
            </button>

            <button
              type="button"
              onClick={loadAffiliates}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading ? "animate-spin" : ""
                }`}
              />

              <span className="hidden sm:inline">
                Refresh
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {success}
          </div>
        )}

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              key: "all",
              label: "Total",
              value: totals.total,
            },
            {
              key: "pending",
              label: "Pending",
              value: totals.pending,
            },
            {
              key: "approved",
              label: "Approved",
              value: totals.approved,
            },
            {
              key: "rejected",
              label: "Rejected",
              value: totals.rejected,
            },
            {
              key: "suspended",
              label: "Suspended",
              value: totals.suspended,
            },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() =>
                setStatus(item.key as Status | "all")
              }
              className={`rounded-2xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                status === item.key
                  ? "border-blue-300 bg-blue-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <p className="text-sm font-medium text-slate-500">
                {item.label}
              </p>

              <p className="mt-2 text-3xl font-extrabold">
                {item.value}
              </p>
            </button>
          ))}
        </div>

        {/* Search/filter */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search affiliate ID, name, email, phone..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto">
              {[
                ["all", "All"],
                ["pending", "Pending"],
                ["approved", "Approved"],
                ["rejected", "Rejected"],
                ["suspended", "Suspended"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setStatus(key as Status | "all")
                  }
                  className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold ${
                    status === key
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Affiliate list */}
        <div className="mt-6">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-600" />

              <p className="mt-4 font-semibold">
                Loading affiliates...
              </p>
            </div>
          ) : affiliates.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <Users className="mx-auto h-12 w-12 text-slate-300" />

              <h2 className="mt-4 text-lg font-bold">
                No affiliates found
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {search
                  ? "Try another search."
                  : "No affiliate accounts match this filter."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {affiliates.map((affiliate) => {
                const updating =
                  updatingId === affiliate.id;

                return (
                  <div
                    key={affiliate.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="p-5">
                      <div className="flex flex-col gap-5 xl:flex-row xl:justify-between">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                            <UserRound className="h-6 w-6" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-extrabold">
                                {affiliate.name ||
                                  "Unnamed Affiliate"}
                              </h3>

                              <StatusBadge
                                status={
                                  affiliate.application_status
                                }
                              />
                            </div>

                            <p className="mt-1 font-bold text-blue-600">
                              {affiliate.affiliate_id ||
                                "No Affiliate ID"}
                            </p>

                            <p className="mt-2 break-all text-sm text-slate-500">
                              {affiliate.email || "No email"}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              Registered{" "}
                              {formatDate(
                                affiliate.created_at
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Status controls */}
                        <div className="flex flex-wrap gap-2">
                          {affiliate.application_status !==
                            "approved" && (
                            <button
                              type="button"
                              disabled={updating}
                              onClick={() =>
                                updateStatus(
                                  affiliate,
                                  "approved"
                                )
                              }
                              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Approve
                            </button>
                          )}

                          {affiliate.application_status !==
                            "rejected" && (
                            <button
                              type="button"
                              disabled={updating}
                              onClick={() =>
                                updateStatus(
                                  affiliate,
                                  "rejected"
                                )
                              }
                              className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          )}

                          {affiliate.application_status !==
                            "suspended" && (
                            <button
                              type="button"
                              disabled={updating}
                              onClick={() =>
                                updateStatus(
                                  affiliate,
                                  "suspended"
                                )
                              }
                              className="rounded-xl bg-orange-50 px-4 py-2.5 text-sm font-bold text-orange-700 hover:bg-orange-100 disabled:opacity-50"
                            >
                              Suspend
                            </button>
                          )}

                          {affiliate.application_status !==
                            "pending" && (
                            <button
                              type="button"
                              disabled={updating}
                              onClick={() =>
                                updateStatus(
                                  affiliate,
                                  "pending"
                                )
                              }
                              className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                            >
                              Pending
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Basic information */}
                      <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[11px] font-bold uppercase text-slate-400">
                            Phone
                          </p>

                          <p className="mt-1 flex items-center gap-2 break-all text-sm font-semibold">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            {affiliate.phone || "—"}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[11px] font-bold uppercase text-slate-400">
                            Location
                          </p>

                          <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
                            <Globe2 className="h-3.5 w-3.5 text-slate-400" />

                            {[
                              affiliate.city,
                              affiliate.country,
                            ]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[11px] font-bold uppercase text-slate-400">
                            Traffic Source
                          </p>

                          <p className="mt-1 text-sm font-semibold">
                            {affiliate.traffic_source || "—"}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[11px] font-bold uppercase text-slate-400">
                            Monthly Traffic
                          </p>

                          <p className="mt-1 text-sm font-semibold">
                            {affiliate.monthly_traffic || "—"}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[11px] font-bold uppercase text-slate-400">
                            Payment
                          </p>

                          <p className="mt-1 text-sm font-semibold">
                            {affiliate.payment_method || "—"}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[11px] font-bold uppercase text-slate-400">
                            Company
                          </p>

                          <p className="mt-1 flex items-center gap-2 truncate text-sm font-semibold">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            {affiliate.company_name ||
                              "Individual"}
                          </p>
                        </div>
                      </div>

                      {/* Additional information */}
                      <div className="mt-3 grid gap-3 lg:grid-cols-3">
                        <div className="rounded-xl border border-slate-100 p-3">
                          <p className="text-[11px] font-bold uppercase text-slate-400">
                            Promotion Method
                          </p>

                          <p className="mt-1 text-sm">
                            {affiliate.promotion_method ||
                              "—"}
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-100 p-3">
                          <p className="text-[11px] font-bold uppercase text-slate-400">
                            Experience
                          </p>

                          <p className="mt-1 text-sm">
                            {affiliate.experience || "—"}
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-100 p-3">
                          <p className="text-[11px] font-bold uppercase text-slate-400">
                            Previous Networks
                          </p>

                          <p className="mt-1 text-sm">
                            {affiliate.previous_networks ||
                              "—"}
                          </p>
                        </div>
                      </div>

                      {/* Account information */}
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
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
                              {affiliate.referred_by}
                            </b>
                          </span>
                        )}

                        {affiliate.referral_rate !==
                          undefined &&
                          affiliate.referral_rate !==
                            null && (
                            <span>
                              Referral rate:{" "}
                              <b className="text-slate-600">
                                {affiliate.referral_rate}%
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

                      {/* Address */}
                      {affiliate.address && (
                        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                          <b>Address:</b>{" "}
                          {affiliate.address}
                        </div>
                      )}

                      {/* Traffic/social */}
                      {(affiliate.traffic_url ||
                        affiliate.social_profile) && (
                        <div className="mt-3 grid gap-3 lg:grid-cols-2">
                          {affiliate.traffic_url && (
                            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                              <p className="text-[11px] font-bold uppercase text-slate-400">
                                Traffic URL
                              </p>

                              <p className="mt-1 break-all text-sm text-blue-600">
                                {affiliate.traffic_url}
                              </p>
                            </div>
                          )}

                          {affiliate.social_profile && (
                            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                              <p className="text-[11px] font-bold uppercase text-slate-400">
                                Social Profile
                              </p>

                              <p className="mt-1 break-all text-sm text-blue-600">
                                {affiliate.social_profile}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {updating && (
                      <div className="border-t border-blue-100 bg-blue-50 px-5 py-3 text-xs font-semibold text-blue-700">
                        Updating affiliate status...
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Security notice */}
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <ShieldCheck className="h-5 w-5 shrink-0 text-blue-600" />

          <div>
            <p className="text-sm font-bold text-blue-900">
              Admin-only affiliate management
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-700">
              Affiliate data is loaded through the protected
              admin API. Status changes and affiliate creation
              require the authenticated administrator session.
            </p>
          </div>
        </div>
      </div>

      {/* Add Affiliate Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  Add Affiliate
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Create and approve an affiliate account directly.
                </p>
              </div>

              <button
                type="button"
                onClick={closeAddModal}
                disabled={addLoading}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="max-h-[75vh] overflow-y-auto px-5 py-5">
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">
                    Full Name
                  </label>

                  <input
                    type="text"
                    value={addName}
                    onChange={(e) =>
                      setAddName(e.target.value)
                    }
                    placeholder="Affiliate full name"
                    disabled={addLoading}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">
                    Gmail / Email
                  </label>

                  <input
                    type="email"
                    value={addEmail}
                    onChange={(e) =>
                      setAddEmail(e.target.value)
                    }
                    placeholder="affiliate@gmail.com"
                    disabled={addLoading}
                    autoComplete="off"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">
                    Temporary Password
                  </label>

                  <input
                    type="password"
                    value={addPassword}
                    onChange={(e) =>
                      setAddPassword(e.target.value)
                    }
                    placeholder="Minimum 6 characters"
                    disabled={addLoading}
                    autoComplete="new-password"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                  />

                  <p className="mt-1.5 text-xs text-slate-400">
                    Give this password to the affiliate securely.
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">
                    Affiliate ID
                    <span className="ml-1 font-normal text-slate-400">
                      (Optional)
                    </span>
                  </label>

                  <input
                    type="text"
                    value={addAffiliateId}
                    onChange={(e) =>
                      setAddAffiliateId(e.target.value)
                    }
                    placeholder="Leave empty to auto-generate"
                    disabled={addLoading}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                  />

                  <p className="mt-1.5 text-xs text-slate-400">
                    Example: UNCPA1001
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">
                    Referral Rate (%)
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={addReferralRate}
                    onChange={(e) =>
                      setAddReferralRate(e.target.value)
                    }
                    disabled={addLoading}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                  />
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                    <div>
                      <p className="text-sm font-bold text-emerald-900">
                        Account will be approved immediately
                      </p>

                      <p className="mt-1 text-xs leading-5 text-emerald-700">
                        The new affiliate will be created as an
                        approved account and the email will be
                        automatically confirmed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeAddModal}
                disabled={addLoading}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={createAffiliate}
                disabled={
                  addLoading ||
                  !addName.trim() ||
                  !addEmail.trim() ||
                  addPassword.length < 6
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {addLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Create & Approve Affiliate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
                          }
