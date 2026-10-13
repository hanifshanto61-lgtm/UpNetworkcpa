"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

type RequestRow = {
  id: string;
  revision: number;
  offer_name: string;
  affiliate_name: string;
  affiliate_id: string;
  status:
    | "pending"
    | "approved"
    | "rejected"
    | "revoked";
  request_note: string;
  admin_note: string;
  requested_at: string;
};

export default function OfferRequestsPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [notes, setNotes] =
    useState<Record<string, string>>({});

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const pending = useRef(false);
  const loadVersion = useRef(0);

  async function api(
    method: string,
    body?: unknown
  ) {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      throw new Error(
        "Please log in as an admin or sub-admin."
      );
    }

    const response = await fetch(
      `/api/admin/offer-requests?status=${status}&page=${page}`,
      {
        method,
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        ...(body
          ? { body: JSON.stringify(body) }
          : {}),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
          "Unable to process offer request."
      );
    }

    return result;
  }

  async function load(showLoading = true) {
    const version = ++loadVersion.current;

    if (showLoading) {
      setLoading(true);
      setError("");
    }

    try {
      const result = await api("GET");

      if (version !== loadVersion.current) return;

      setRequests(result.requests ?? []);
      setTotal(result.total ?? 0);
    } catch (err) {
      if (version !== loadVersion.current) return;

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load requests."
      );

      setRequests([]);
    } finally {
      if (
        showLoading &&
        version === loadVersion.current
      ) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void load();
  }, [status, page]);

  useAutoRefresh(() => load(false), 15000);

  async function review(
    row: RequestRow,
    decision: string
  ) {
    if (pending.current) return;

    if (
      decision === "revoked" &&
      !window.confirm(
        `Revoke ${row.affiliate_name}'s access to ${row.offer_name}?`
      )
    ) {
      return;
    }

    pending.current = true;
    setBusyId(row.id);
    setError("");
    setMessage("");

    try {
      const key = `${row.id}:${row.revision}`;

      const result = await api("PATCH", {
        id: row.id,
        revision: row.revision,
        decision,
        note: notes[key] ?? row.admin_note,
      });

      setMessage(result.message);
      await load(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to review request."
      );
    } finally {
      pending.current = false;
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin/offers"
          className="text-sm text-cyan-400"
        >
          &larr; Offer Management
        </Link>

        <h1 className="mt-5 text-2xl font-black">
          Offer Access Requests
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Review affiliate application details and approve
          or reject offer access. Affiliates receive an
          Email notification of your decision.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            "pending",
            "approved",
            "rejected",
            "revoked",
            "all",
          ].map((value) => (
            <button
              type="button"
              key={value}
              disabled={busyId !== null}
              onClick={() => {
                setPage(1);
                setStatus(value);
              }}
              className={`rounded-xl px-4 py-2 text-sm font-bold capitalize disabled:opacity-50 ${
                status === value
                  ? "bg-cyan-500 text-slate-950"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              {value}
            </button>
          ))}
        </div>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-500/10 p-4 text-sm text-red-300"
          >
            {error}
          </p>
        )}

        {message && (
          <p
            role="status"
            className="mt-5 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-300"
          >
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={() => void load()}
          disabled={busyId !== null}
          className="mt-4 text-sm text-cyan-400 underline disabled:opacity-50"
        >
          Refresh Requests
        </button>

        {loading ? (
          <p className="mt-6 text-slate-400">
            Loading requests...
          </p>
        ) : requests.length === 0 ? (
          <p className="mt-6 text-slate-400">
            No requests in this view.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {requests.map((row) => {
              const noteKey =
                `${row.id}:${row.revision}`;

              return (
                <article
                  key={row.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold">
                        {row.offer_name}
                      </h2>

                      <p className="mt-1 text-sm text-cyan-400">
                        {row.affiliate_name} — {row.affiliate_id}
                      </p>
                    </div>

                    <span className="h-fit rounded-full bg-slate-800 px-3 py-1 text-xs font-bold capitalize">
                      {row.status}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    Requested:{" "}
                    {new Date(
                      row.requested_at
                    ).toLocaleString()}
                  </p>

                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <h3 className="text-sm font-bold text-white">
                      Application Details
                    </h3>

                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
                      {row.request_note || "Not provided"}
                    </p>
                  </div>

                  {["pending", "approved"].includes(
                    row.status
                  ) ? (
                    <>
                      <label
                        className="mt-4 block text-xs text-slate-400"
                        htmlFor={`note-${row.id}`}
                      >
                        Manager note (included in the decision Email)
                      </label>

                      <textarea
                        id={`note-${row.id}`}
                        value={
                          notes[noteKey] ?? row.admin_note
                        }
                        maxLength={2000}
                        rows={2}
                        disabled={busyId !== null}
                        onChange={(event) =>
                          setNotes((current) => ({
                            ...current,
                            [noteKey]: event.target.value,
                          }))
                        }
                        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white outline-none"
                      />

                      <div className="mt-4 flex gap-3">
                        {row.status === "pending" ? (
                          <>
                            <button
                              type="button"
                              disabled={busyId !== null}
                              onClick={() =>
                                void review(row, "approved")
                              }
                              className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold disabled:opacity-50"
                            >
                              {busyId === row.id
                                ? "Saving..."
                                : "Approve"}
                            </button>

                            <button
                              type="button"
                              disabled={busyId !== null}
                              onClick={() =>
                                void review(row, "rejected")
                              }
                              className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={busyId !== null}
                            onClick={() =>
                              void review(row, "revoked")
                            }
                            className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400 disabled:opacity-50"
                          >
                            Revoke Access
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    row.admin_note && (
                      <p className="mt-4 whitespace-pre-wrap text-sm text-slate-400">
                        Manager note: {row.admin_note}
                      </p>
                    )
                  )}
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3 text-sm">
          <button
            type="button"
            disabled={
              page <= 1 || busyId !== null
            }
            onClick={() =>
              setPage((value) => value - 1)
            }
            className="rounded-xl bg-slate-800 px-4 py-2 disabled:opacity-40"
          >
            Previous
          </button>

          <p className="text-slate-400">
            Page {page} · {total} requests
          </p>

          <button
            type="button"
            disabled={
              page * 50 >= total ||
              busyId !== null
            }
            onClick={() =>
              setPage((value) => value + 1)
            }
            className="rounded-xl bg-slate-800 px-4 py-2 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </main>
  );
}