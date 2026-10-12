
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type AdminRole = "super_admin" | "sub_admin";

type AdminAccount = {
  user_id: string;
  email: string;
  name: string;
  role: AdminRole;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

type ApiResult = {
  success: boolean;
  message?: string;
  admins?: AdminAccount[];
};

export default function AdminManagementPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [updatingId, setUpdatingId] = useState<string | null>(
    null
  );

  const getToken = async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session?.access_token) {
      throw new Error("Please log in again.");
    }

    return data.session.access_token;
  };

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await supabase.auth.getSession();

      const token = data.session?.access_token;

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/admin/admins", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (response.status === 401 || response.status === 403) {
        setAuthorized(false);
        setError("Only Main Admin can access this page.");
        return;
      }

      const result: ApiResult = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to load administrators."
        );
      }

      setAdmins(result.admins || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load administrators."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    let mounted = true;

    async function verifyMainAdmin() {
      try {
        const { data } = await supabase.auth.getSession();

        const session = data.session;

        if (!session) {
          router.replace("/login");
          return;
        }

        const response = await fetch("/api/admin/me", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        });

        if (!response.ok) {
          if (mounted) {
            setError("Unable to verify Admin access.");
          }
          return;
        }

        const result = await response.json();

        if (!result.success || !result.admin?.is_super_admin) {
          if (mounted) {
            setError(
              "Access denied. Only Main Admin can manage administrators."
            );
          }
          return;
        }

        if (!mounted) return;

        setCurrentUserId(result.admin.user_id);
        setAuthorized(true);
      } catch {
        if (mounted) {
          setError("Unable to verify administrator.");
        }
      } finally {
        if (mounted) {
          setChecking(false);
        }
      }
    }

    verifyMainAdmin();

    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (authorized) {
      loadAdmins();
    }
  }, [authorized, loadAdmins]);

  async function createSubAdmin(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) return;

    setError("");
    setSuccess("");

    if (name.trim().length < 2) {
      setError("Enter the administrator's full name.");
      return;
    }

    if (password.length < 12) {
      setError("Password must contain at least 12 characters.");
      return;
    }

    setSaving(true);

    try {
      const token = await getToken();

      const response = await fetch("/api/admin/admins", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const result: ApiResult = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to create Sub Admin."
        );
      }

      setSuccess("Sub Admin created successfully.");
      setName("");
      setEmail("");
      setPassword("");
      setShowForm(false);

      await loadAdmins();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create Sub Admin."
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateAdmin(
    admin: AdminAccount,
    newStatus: boolean
  ) {
    if (updatingId) return;

    if (admin.role !== "sub_admin") {
      setError("Main Admin accounts cannot be changed.");
      return;
    }

    const confirmed = window.confirm(
      newStatus
        ? `Activate ${admin.email}?`
        : `Suspend ${admin.email}?`
    );

    if (!confirmed) return;

    setUpdatingId(admin.user_id);
    setError("");
    setSuccess("");

    try {
      const token = await getToken();

      const response = await fetch("/api/admin/admins", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: admin.user_id,
          is_active: newStatus,
        }),
      });

      const result: ApiResult = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to update Sub Admin."
        );
      }

      setSuccess(
        newStatus
          ? "Sub Admin activated successfully."
          : "Sub Admin suspended successfully."
      );

      await loadAdmins();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update Sub Admin."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3 text-slate-300">
          <Loader2 className="animate-spin text-cyan-400" />
          Verifying Main Admin...
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-slate-900 p-8 text-center">
          <ShieldOff
            size={42}
            className="mx-auto mb-4 text-red-400"
          />

          <h1 className="text-xl font-bold">
            Access Denied
          </h1>

          <p className="mt-3 text-sm text-slate-400">
            {error || "Only Main Admin can access this page."}
          </p>

          <button
            onClick={() => router.push("/admin")}
            className="mt-6 rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  const subAdmins = admins.filter(
    (admin) => admin.role === "sub_admin"
  );

  const activeSubAdmins = subAdmins.filter(
    (admin) => admin.is_active
  );

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <button
              onClick={() => router.push("/admin")}
              className="mb-4 flex items-center gap-2 text-sm text-slate-400 hover:text-white"
            >
              <ArrowLeft size={17} />
              Back to Dashboard
            </button>

            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-400">
                <ShieldCheck size={27} />
              </div>

              <div>
                <h1 className="text-2xl font-black sm:text-3xl">
                  Admin Management
                </h1>

                <p className="mt-1 text-sm text-slate-400">
                  UpNetwork CPA — Main Admin Control
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setShowForm(!showForm);
              setError("");
              setSuccess("");
            }}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-bold text-slate-950 hover:bg-cyan-400"
          >
            {showForm ? <XCircle size={18} /> : <Plus size={18} />}
            {showForm ? "Close Form" : "Add Sub Admin"}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
          >
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-3 text-cyan-400">
              <Users size={25} />
            </div>
            <p className="text-sm text-slate-400">
              Total Sub Admins
            </p>
            <p className="mt-2 text-3xl font-black">
              {subAdmins.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-3 text-emerald-400">
              <ShieldCheck size={25} />
            </div>
            <p className="text-sm text-slate-400">
              Active Sub Admins
            </p>
            <p className="mt-2 text-3xl font-black">
              {activeSubAdmins.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-3 text-amber-400">
              <ShieldOff size={25} />
            </div>
            <p className="text-sm text-slate-400">
              Suspended Sub Admins
            </p>
            <p className="mt-2 text-3xl font-black">
              {subAdmins.length - activeSubAdmins.length}
            </p>
          </div>
        </div>

        {showForm && (
          <section className="mb-8 rounded-2xl border border-cyan-500/20 bg-slate-900 p-5 sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <UserPlus className="text-cyan-400" />
              <div>
                <h2 className="text-lg font-bold">
                  Create New Sub Admin
                </h2>
                <p className="text-sm text-slate-400">
                  New accounts receive Sub Admin permissions only.
                </p>
              </div>
            </div>

            <form
              onSubmit={createSubAdmin}
              className="grid gap-5 sm:grid-cols-2"
            >
              <div>
                <label
                  htmlFor="admin-name"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Full Name
                </label>

                <input
                  id="admin-name"
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Sub Admin Name"
                  autoComplete="name"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-email"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Email Address
                </label>

                <input
                  id="admin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="admin@example.com"
                  autoComplete="off"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="admin-password"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Temporary Password
                </label>

                <input
                  id="admin-password"
                  type="password"
                  required
                  minLength={12}
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Minimum 12 characters"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Use a unique temporary password and share it
                  securely. Do not reuse your Main Admin password.
                </p>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <UserPlus size={18} />
                  )}
                  {saving
                    ? "Creating Sub Admin..."
                    : "Create Sub Admin"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5">
            <div>
              <h2 className="text-lg font-bold">
                Administrator Accounts
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Manage active and suspended administrators.
              </p>
            </div>

            <button
              onClick={loadAdmins}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-950/70 text-slate-400">
                <tr>
                  <th className="px-5 py-4">Administrator</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Created</th>
                  <th className="px-5 py-4 text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {admins.map((admin) => {
                  const isMain =
                    admin.role === "super_admin";

                  const isSelf =
                    admin.user_id === currentUserId;

                  return (
                    <tr
                      key={admin.user_id}
                      className="hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold">
                          {admin.name || "Administrator"}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          {admin.email}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            isMain
                              ? "bg-purple-500/10 text-purple-300"
                              : "bg-cyan-500/10 text-cyan-300"
                          }`}
                        >
                          {isMain
                            ? "Main Admin"
                            : "Sub Admin"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            admin.is_active
                              ? "bg-emerald-500/10 text-emerald-300"
                              : "bg-red-500/10 text-red-300"
                          }`}
                        >
                          {admin.is_active
                            ? "Active"
                            : "Suspended"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-400">
                        {admin.created_at
                          ? new Date(
                              admin.created_at
                            ).toLocaleDateString()
                          : "—"}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {isMain || isSelf ? (
                          <span className="text-xs text-slate-500">
                            Protected
                          </span>
                        ) : (
                          <button
                            disabled={updatingId !== null}
                            onClick={() =>
                              updateAdmin(
                                admin,
                                !admin.is_active
                              )
                            }
                            className={`rounded-lg px-4 py-2 text-xs font-bold disabled:opacity-50 ${
                              admin.is_active
                                ? "bg-red-500/10 text-red-300 hover:bg-red-500/20"
                                : "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                            }`}
                          >
                            {updatingId === admin.user_id
                              ? "Updating..."
                              : admin.is_active
                                ? "Suspend"
                                : "Activate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {!loading && admins.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center text-slate-400"
                    >
                      No administrator accounts found.
                    </td>
                  </tr>
                )}

                {loading && admins.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center text-slate-400"
                    >
                      Loading administrators...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-slate-500">
          UpNetwork CPA • Secure Admin Management
        </p>
      </div>
    </main>
  );
}
