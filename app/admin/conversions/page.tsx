
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  DollarSign,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAIL = "islamhanif122@gmail.com";

type Click = {
  id: string | null;
  click_id: string | null;
  affiliate_id: string | null;
  offer_id: string | null;
  status: string | null;
  payout: number | string | null;
  converted_at: string | null;
  created_at: string | null;
};

type ApiResponse = {
  success: boolean;
  error?: string;
  message?: string;
  clicks?: Click[];
};

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

function dateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-US");
}

export default function AdminConversionsPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [clicks, setClicks] = useState<Click[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [payouts, setPayouts] = useState<Record<string, string>>({});

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

    if (
      session.user.email?.toLowerCase() !==
      ADMIN_EMAIL.toLowerCase()
    ) {
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

        if (query.trim()) {
          params.set("search", query.trim());
        }

        if (selectedFilter !== "all") {
          params.set("filter", selectedFilter);
        }

        const response = await fetch(
          `/api/admin/conversions?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        const result: ApiResponse = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error || "Unable to load conversions."
          );
        }

        setClicks(result.clicks || []);
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

    initialize();

    return () => {
      active = false;
    };
  }, [getToken, loadClicks, router]);

  async function approveConversion(click: Click) {
    if (!click.click_id || savingId) return;

    const rawPayout = payouts[click.click_id];

    if (
      rawPayout === undefined ||
      rawPayout.trim() === ""
    ) {
      setError("Please enter a payout amount.");
      return;
    }

    const payout = Number(rawPayout);

    if (
      !Number.isFinite(payout) ||
      payout < 0 ||
      payout > 1000000 ||
      !Number.isInteger(payout * 100)
    ) {
      setError(
        "Enter a valid payout between $0 and $1,000,000 (maximum two decimal places)."
      );
      return;
    }

    const confirmed = window.confirm(
      `Approve conversion?\n\nClick ID: ${click.click_id}\nAffiliate: ${click.affiliate_id}\nPayout: ${money(payout)}\n\nThis action cannot be undone here.`
    );

    if (!confirmed) return;

    setSavingId(click.click_id);
    setError("");
    setSuccess("");

    try {
      const token = await getToken();

      const response = await fetch(
        "/api/admin/conversions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            click_id: click.click_id,
            payout,
          }),
        }
      );

      const result: ApiResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Conversion approval failed."
        );
      }

      setSuccess(
        `Conversion approved. ${money(payout)} credited to affiliate ${click.affiliate_id}.`
      );

      await loadClicks(search, filter);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Conversion approval failed."
      );
    } finally {
      setSavingId(null);
    }
  }

  const totalConversions = clicks.filter(isConverted).length;

  const totalEarnings = clicks.reduce(
    (sum, click) =>
      sum +
      (isConverted(click) ? Number(click.payout || 0) : 0),
    0
  );

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
              Review clicks, approve conversions, and manage affiliate payouts.
            </p>
          </div>

          <button
            onClick={() => loadClicks(search, filter)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        <div className="mb-7 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-blue-600">
              <Search className="h-5 w-5" />
              <span className="text-sm font-semibold">
                Loaded Clicks
              </span>
            </div>
            <p className="text-3xl font-extrabold">
              {clicks.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-semibold">
                Conversions
              </span>
            </div>
            <p className="text-3xl font-extrabold">
              {totalConversions}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-violet-600">
              <DollarSign className="h-5 w-5" />
              <span className="text-sm font-semibold">
                Affiliate Earnings
              </span>
            </div>
            <p className="text-3xl font-extrabold">
              {money(totalEarnings)}
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_180px_auto]">
            <div>
              <label className="mb-2 block text-sm font-bold">
                Search Click ID or Affiliate ID
              </label>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    loadClicks(search, filter);
                  }
                }}
                placeholder="Enter Click ID or Affiliate ID"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Status Filter
              </label>
              <select
                value={filter}
                onChange={(event) => {
                  const next = event.target.value;
                  setFilter(next);
                  loadClicks(search, next);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                <option value="all">All Clicks</option>
                <option value="pending">Pending</option>
                <option value="converted">Converted</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => loadClicks(search, filter)}
                disabled={loading}
                className="w-full rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Search
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
            <h2 className="text-lg font-bold">
              Clicks & Conversion History
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Showing up to 200 matching records. Summary cards reflect loaded records only.
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
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Click ID</th>
                    <th className="px-5 py-4">Affiliate</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Click Date</th>
                    <th className="px-5 py-4">Converted</th>
                    <th className="px-5 py-4">Payout</th>
                    <th className="px-5 py-4">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {clicks.map((click, index) => {
                    const converted = isConverted(click);
                    const clickId = click.click_id || "";
                    const status = (click.status || "").toLowerCase();

                    const eligible =
                      !converted &&
                      Boolean(clickId) &&
                      Boolean(click.affiliate_id) &&
                      ["", "click", "pending"].includes(status);

                    return (
                      <tr
                        key={click.id || clickId || index}
                        className="hover:bg-slate-50"
                      >
                        <td className="max-w-[200px] break-all px-5 py-4 font-mono text-xs">
                          {clickId || "—"}
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {click.affiliate_id || "—"}
                        </td>

                        <td className="px-5 py-4">
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
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-500">
                          {dateTime(click.created_at)}
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-500">
                          {dateTime(click.converted_at)}
                        </td>

                        <td className="px-5 py-4">
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

                        <td className="px-5 py-4">
                          {eligible ? (
                            <button
                              onClick={() => approveConversion(click)}
                              disabled={savingId !== null}
                              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {savingId === clickId
                                ? "Approving..."
                                : "Approve"}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">
                              {converted ? "Completed" : "Unavailable"}
                            </span>
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
