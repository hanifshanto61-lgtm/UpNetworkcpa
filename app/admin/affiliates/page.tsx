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
className={"inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${item.className}"}
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
  } catch {
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
} catch (err: any) {
  console.error("Affiliate loading error:", err);

  setError(
    err?.message || "Unable to load affiliates."
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
"Are you sure you want to change ${affiliate.name}'s status to ${newStatus}?"
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

  const response = await fetch(
    "/api/admin/affiliates",
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        user_id: affiliate.id,
        status: newStatus,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(
      result.message || "Unable to update affiliate."
    );
  }

  setSuccess(
    `${affiliate.name} is now ${newStatus}.`
  );

  await loadAffiliates();
} catch (err: any) {
  console.error("Affiliate status update error:", err);

  setError(
    err?.message || "Unable to update affiliate."
  );
} finally {
  setUpdatingId(null);
}

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

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {[
        {
          key: "all",
          label: "Total",
          value: totals.total,
          color: "blue",
        },
        {
          key: "pending",
          label: "Pending",
          value: totals.pending,
          color: "amber",
        },
        {
          key: "approved",
          label: "Approved",
          value: totals.approved,
          color: "emerald",
        },
        {
          key: "rejected",
          label: "Rejected",
          value: totals.rejected,
          color: "red",
        },
        {
          key: "suspended",
          label: "Suspended",
          value: totals.suspended,
          color: "orange",
        },
      ].map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() =>
            setStatus(item.key as Status | "all")
          }
          className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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
                            {affiliate.name || "Unnamed Affiliate"}
                          </h3>

                          <StatusBadge
                            status={
                              affiliate.application_status
                            }
                          />
                        </div>

                        <p className="mt-1 font-bold text-blue-600">
                          {affiliate.affiliate_id || "No Affiliate ID"}
                        </p>

                        <p className="mt-2 break-all text-sm text-slate-500">
                          {affiliate.email || "No email"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Registered{" "}
                          {formatDate(affiliate.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {affiliate.application_status !== "approved" && (
                        <button
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

                      {affiliate.application_status !== "rejected" && (
                        <button
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

                      {affiliate.application_status !== "suspended" && (
                        <button
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

                      {affiliate.application_status !== "pending" && (
                        <button
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

                        {[affiliate.city, affiliate.country]
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
                        {affiliate.company_name || "Individual"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 lg:grid-cols-3">
                    <div className="rounded-xl border border-slate-100 p-3">
                      <p className="text-[11px] font-bold uppercase text-slate-400">
                        Promotion Method
                      </p>

                      <p className="mt-1 text-sm">
                        {affiliate.promotion_method || "—"}
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
                        {affiliate.previous_networks || "—"}
                      </p>
                    </div>
                  </div>

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

                    {affiliate.referral_rate !== undefined &&
                      affiliate.referral_rate !== null && (
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
                        {formatDate(affiliate.last_sign_in_at)}
                      </span>
                    )}
                  </div>

                  {affiliate.address && (
                    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                      <b>Address:</b> {affiliate.address}
                    </div>
                  )}

                  {(affiliate.traffic_url ||
                    affiliate.social_profile) && (
                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                      {affiliate.traffic_url && (
                        <span className="text-blue-600">
                          Traffic URL: {affiliate.traffic_url}
                        </span>
                      )}

                      {affiliate.social_profile && (
                        <span className="text-blue-600">
                          Social: {affiliate.social_profile}
                        </span>
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

    <div className="mt-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
      <ShieldCheck className="h-5 w-5 shrink-0 text-blue-600" />

      <div>
        <p className="text-sm font-bold text-blue-900">
          Admin-only affiliate management
        </p>

        <p className="mt-1 text-xs leading-5 text-blue-700">
          Affiliate data is loaded through the protected
          admin API. Status changes require the authenticated
          administrator session.
        </p>
      </div>
    </div>
  </div>
</main>

);
                }
