"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Wallet,
  Clock3,
  CheckCircle2,
  XCircle,
  CreditCard,
  RefreshCw,
  Search,
  ShieldCheck,
  Copy,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { verifyAdminAccess } from "@/lib/admin-access";

type Status = "pending" | "approved" | "rejected" | "paid";

type Payment = {
  id: string;
  affiliateId: string;
  amount: number;
  withdrawalFee: number;
  totalDebit: number;
  currency: string;
  paymentMethod: string;
  paymentAddress: string;
  status: Status;
  adminNote: string | null;
  requestedAt: string;
  processedAt: string | null;
};

type Stats = {
  totalRequests: number;
  pendingCount: number;
  approvedCount: number;
  paidCount: number;
  rejectedCount: number;
  pendingAmount: number;
  approvedAmount: number;
  paidAmount: number;
  rejectedAmount: number;
};

const EMPTY_STATS: Stats = {
  totalRequests: 0,
  pendingCount: 0,
  approvedCount: 0,
  paidCount: 0,
  rejectedCount: 0,
  pendingAmount: 0,
  approvedAmount: 0,
  paidAmount: 0,
  rejectedAmount: 0,
};

const money = (value: number) =>
  `$${Number(value || 0).toFixed(2)}`;

const dateText = (value: string | null) =>
  value ? new Date(value).toLocaleString() : "-";

function statusColor(status: Status) {
  switch (status) {
    case "approved":
      return "bg-blue-100 text-blue-700";
    case "paid":
      return "bg-green-100 text-green-700";
    case "rejected":
      return "bg-red-100 text-red-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
}

export default function AdminPaymentsPage() {
  const router = useRouter();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const getToken = useCallback(async () => {
    const { data, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !data.session?.access_token) {
      throw new Error("Please log in as admin.");
    }

    if (!(await verifyAdminAccess(data.session.access_token))) {
      throw new Error("Admin access required.");
    }

    return data.session.access_token;
  }, []);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = await getToken();

      const response = await fetch("/api/admin/payments", {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to load payments."
        );
      }

      setPayments(
        Array.isArray(result.payments) ? result.payments : []
      );
      setStats(result.stats || EMPTY_STATS);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load payments."
      );
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return payments.filter((payment) => {
      const matchesStatus =
        filter === "all" || payment.status === filter;

      const matchesSearch =
        !term ||
        [
          payment.affiliateId,
          payment.paymentMethod,
          payment.id,
          payment.status,
        ].some((value) => value.toLowerCase().includes(term));

      return matchesStatus && matchesSearch;
    });
  }, [payments, filter, search]);

  async function updateStatus(
    payment: Payment,
    newStatus: "approved" | "rejected" | "paid"
  ) {
    if (busyId) return;

    const note = notes[payment.id] ?? payment.adminNote ?? "";

    const warning =
      newStatus === "paid"
        ? `Confirm that ${money(payment.amount)} has ACTUALLY been sent to ${payment.affiliateId} using ${payment.paymentMethod}. This action cannot be undone.`
        : `Change payment ${payment.id} from ${payment.status} to ${newStatus}?`;

    if (!window.confirm(warning)) return;

    try {
      setBusyId(payment.id);
      setError("");
      setMessage("");

      const token = await getToken();

      const response = await fetch("/api/admin/payments", {
        method: "PATCH",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId: payment.id,
          status: newStatus,
          adminNote: note,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to update payment."
        );
      }

      await loadPayments();
      setMessage(`Payment request updated to ${newStatus}.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Payment update failed."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function copyAddress(address: string) {
    try {
      await navigator.clipboard.writeText(address);
      setMessage("Payment details copied.");
    } catch {
      setError("Unable to copy payment details.");
    }
  }

  const cards = [
    {
      label: "Pending",
      amount: stats.pendingAmount,
      count: stats.pendingCount,
      icon: Clock3,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Approved",
      amount: stats.approvedAmount,
      count: stats.approvedCount,
      icon: CheckCircle2,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Paid",
      amount: stats.paidAmount,
      count: stats.paidCount,
      icon: CreditCard,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Rejected",
      amount: stats.rejectedAmount,
      count: stats.rejectedCount,
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="rounded-xl border border-slate-200 bg-white p-3"
              aria-label="Back to admin dashboard"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <h1 className="text-2xl font-black">
                Manage Payments
              </h1>
              <p className="text-sm text-slate-500">
                UpNetwork CPA • Admin Panel
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadPayments()}
            disabled={loading || Boolean(busyId)}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </header>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <Wallet className="text-blue-600" size={24} />
            <div>
              <h2 className="font-bold">
                Withdrawal Management
              </h2>
              <p className="text-sm text-slate-500">
                Minimum withdrawal: $50 USD
              </p>
            </div>
          </div>

          <p className="mt-3 text-sm text-slate-600">
            Review each request and verify payment details.
            Mark as Paid only after confirming the actual transfer.
          </p>
        </section>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            {message}
          </div>
        )}

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className={`rounded-2xl border border-slate-200 p-5 ${card.bg}`}
              >
                <div
                  className={`flex items-center justify-between ${card.color}`}
                >
                  <span className="font-semibold">
                    {card.label}
                  </span>
                  <Icon size={22} />
                </div>

                <p className="mt-3 text-2xl font-black">
                  {money(card.amount)}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  {card.count} requests
                </p>
              </div>
            );
          })}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-5">
            <div>
              <h2 className="text-lg font-bold">
                Withdrawal Requests
              </h2>
              <p className="text-sm text-slate-500">
                {filtered.length} shown • {stats.totalRequests} total
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3 top-3 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search affiliate or method"
                  className="w-64 max-w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm"
                />
              </div>

              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value)
                }
                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 p-16 text-slate-500">
              <RefreshCw className="animate-spin" />
              Loading payment requests...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-slate-500">
              No payment requests found.
            </div>
          ) : (
            <div className="grid gap-4 p-4 lg:grid-cols-2">
              {filtered.map((payment) => (
                <article
                  key={payment.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">
                        Affiliate ID
                      </p>
                      <p className="font-bold">
                        {payment.affiliateId}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {dateText(payment.requestedAt)}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusColor(payment.status)}`}
                    >
                      {payment.status}
                    </span>
                  </div>

                  <div className="mb-4 flex items-center justify-between rounded-xl bg-white p-4">
                    <div>
                      <p className="text-xs text-slate-500">
                        Withdrawal Amount
                      </p>
                      <p className="text-2xl font-black">
                        {money(payment.amount)}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Extra fee: {money(payment.withdrawalFee)} · Total balance debit: {money(payment.totalDebit ?? payment.amount)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Send only the withdrawal amount to the affiliate.</p>
                    </div>

                    <CreditCard className="text-blue-600" />
                  </div>

                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-slate-500">
                        Payment Method
                      </p>
                      <p className="font-semibold">
                        {payment.paymentMethod}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">
                        Payment Address / Account
                      </p>
                      <div className="mt-1 flex items-start gap-2">
                        <p className="min-w-0 flex-1 break-all rounded-lg bg-white p-3 font-mono text-xs">
                          {payment.paymentAddress}
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            void copyAddress(payment.paymentAddress)
                          }
                          aria-label="Copy payment address"
                          className="rounded-lg bg-white p-3"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor={`note-${payment.id}`}
                        className="mb-1 block text-slate-500"
                      >
                        Admin Note
                      </label>
                      <textarea
                        id={`note-${payment.id}`}
                        rows={2}
                        maxLength={1000}
                        disabled={
                          payment.status === "paid" ||
                          payment.status === "rejected"
                        }
                        value={
                          notes[payment.id] ??
                          payment.adminNote ??
                          ""
                        }
                        onChange={(event) =>
                          setNotes((current) => ({
                            ...current,
                            [payment.id]: event.target.value,
                          }))
                        }
                        placeholder="Optional payment note"
                        className="w-full rounded-xl border border-slate-300 bg-white p-3 disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {payment.status === "pending" && (
                      <button
                        type="button"
                        disabled={Boolean(busyId)}
                        onClick={() =>
                          void updateStatus(payment, "approved")
                        }
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                      >
                        <CheckCircle2 size={16} />
                        Approve
                      </button>
                    )}

                    {payment.status === "approved" && (
                      <button
                        type="button"
                        disabled={Boolean(busyId)}
                        onClick={() =>
                          void updateStatus(payment, "paid")
                        }
                        className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                      >
                        <CreditCard size={16} />
                        Mark Paid
                      </button>
                    )}

                    {(payment.status === "pending" ||
                      payment.status === "approved") && (
                      <button
                        type="button"
                        disabled={Boolean(busyId)}
                        onClick={() =>
                          void updateStatus(payment, "rejected")
                        }
                        className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                      >
                        <XCircle size={16} />
                        Reject
                      </button>
                    )}

                    {busyId === payment.id && (
                      <span className="flex items-center gap-2 text-sm text-slate-500">
                        <RefreshCw
                          size={16}
                          className="animate-spin"
                        />
                        Updating...
                      </span>
                    )}

                    {(payment.status === "paid" ||
                      payment.status === "rejected") && (
                      <span className="flex items-center gap-2 text-sm text-slate-500">
                        <ShieldCheck size={16} />
                        Final status
                      </span>
                    )}
                  </div>

                  {payment.processedAt && (
                    <p className="mt-4 text-xs text-slate-500">
                      Last processed: {dateText(payment.processedAt)}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}