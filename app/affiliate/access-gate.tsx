"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  Clock3,
  ShieldCheck,
  ShieldX,
  Ban,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AccessStatus =
  | "checking"
  | "pending"
  | "approved"
  | "rejected"
  | "suspended"
  | "error";

export default function AffiliateAccessGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [status, setStatus] =
    useState<AccessStatus>("checking");

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    checkAccess();
  }, []);

  async function checkAccess() {
    try {
      setStatus("checking");
      setMessage("");

      if (!supabase) {
        setStatus("error");
        setMessage(
          "Supabase is not configured."
        );
        return;
      }

      const {
        data: sessionData,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (
        sessionError ||
        !sessionData.session
      ) {
        router.replace("/login");
        return;
      }

      const response = await fetch(
        "/api/affiliate/access",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (response.ok && data?.allowed) {
        setStatus("approved");
        return;
      }

      if (
        data?.code ===
        "AFFILIATE_PENDING"
      ) {
        setStatus("pending");
        setMessage(
          data?.error ||
            "Your application is waiting for admin approval."
        );
        return;
      }

      if (
        data?.code ===
        "AFFILIATE_REJECTED"
      ) {
        setStatus("rejected");
        setMessage(
          data?.error ||
            "Your affiliate application has been rejected."
        );
        return;
      }

      if (
        data?.code ===
        "AFFILIATE_SUSPENDED"
      ) {
        setStatus("suspended");
        setMessage(
          data?.error ||
            "Your affiliate account has been suspended."
        );
        return;
      }

      if (
        response.status === 401
      ) {
        router.replace("/login");
        return;
      }

      setStatus("error");
      setMessage(
        data?.error ||
          "Unable to verify your affiliate account."
      );
    } catch (error) {
      console.error(
        "Affiliate access gate error:",
        error
      );

      setStatus("error");
      setMessage(
        "Unable to verify your affiliate account."
      );
    }
  }

  async function handleLogout() {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } finally {
      router.replace("/login");
    }
  }

  if (status === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070c] px-4 text-white">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
            <ShieldCheck
              size={30}
              className="text-cyan-400"
            />
          </div>

          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />

          <h1 className="text-lg font-bold">
            Checking account access
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Please wait while we verify your
            affiliate approval status.
          </p>
        </div>
      </main>
    );
  }

  if (status === "approved") {
    return <>{children}</>;
  }

  if (status === "pending") {
    return (
      <AccessScreen
        icon={
          <Clock3
            size={34}
            className="text-amber-400"
          />
        }
        title="Application Pending"
        message={
          message ||
          "Your affiliate application is currently waiting for admin approval."
        }
        badge="PENDING APPROVAL"
        badgeClass="border-amber-400/20 bg-amber-400/10 text-amber-400"
        iconClass="border-amber-400/20 bg-amber-400/10"
        onRefresh={checkAccess}
        onLogout={handleLogout}
        showRefresh
      />
    );
  }

  if (status === "rejected") {
    return (
      <AccessScreen
        icon={
          <ShieldX
            size={34}
            className="text-red-400"
          />
        }
        title="Application Rejected"
        message={
          message ||
          "Your affiliate application has been rejected by the network."
        }
        badge="APPLICATION REJECTED"
        badgeClass="border-red-400/20 bg-red-400/10 text-red-400"
        iconClass="border-red-400/20 bg-red-400/10"
        onLogout={handleLogout}
      />
    );
  }

  if (status === "suspended") {
    return (
      <AccessScreen
        icon={
          <Ban
            size={34}
            className="text-red-400"
          />
        }
        title="Account Suspended"
        message={
          message ||
          "Your affiliate account is currently suspended."
        }
        badge="ACCOUNT SUSPENDED"
        badgeClass="border-red-400/20 bg-red-400/10 text-red-400"
        iconClass="border-red-400/20 bg-red-400/10"
        onLogout={handleLogout}
      />
    );
  }

  return (
    <AccessScreen
      icon={
        <ShieldX
          size={34}
          className="text-red-400"
        />
      }
      title="Access Verification Failed"
      message={
        message ||
        "We could not verify your affiliate account."
      }
      badge="ACCESS ERROR"
      badgeClass="border-red-400/20 bg-red-400/10 text-red-400"
      iconClass="border-red-400/20 bg-red-400/10"
      onRefresh={checkAccess}
      onLogout={handleLogout}
      showRefresh
    />
  );
}

function AccessScreen({
  icon,
  title,
  message,
  badge,
  badgeClass,
  iconClass,
  onRefresh,
  onLogout,
  showRefresh = false,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  badge: string;
  badgeClass: string;
  iconClass: string;
  onRefresh?: () => void;
  onLogout: () => void;
  showRefresh?: boolean;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05070c] px-4 text-white">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/[0.04] blur-3xl" />

      <div className="relative z-10 w-full max-w-lg">
        <div className="rounded-3xl border border-white/10 bg-[#090d17]/95 p-7 text-center shadow-2xl backdrop-blur-xl sm:p-10">
          <div
            className={`mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border ${iconClass}`}
          >
            {icon}
          </div>

          <div
            className={`mx-auto mt-6 inline-flex rounded-full border px-3 py-1.5 text-[10px] font-bold tracking-[0.16em] ${badgeClass}`}
          >
            {badge}
          </div>

          <h1 className="mt-5 text-2xl font-black sm:text-3xl">
            {title}
          </h1>

          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-400">
            {message}
          </p>

          {showRefresh &&
            onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-400 transition hover:bg-cyan-400/15"
              >
                <RefreshCw size={17} />
                Check Again
              </button>
            )}

          <button
            type="button"
            onClick={onLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/15 bg-red-500/[0.05] px-5 py-3 text-sm font-bold text-red-400 transition hover:bg-red-500/10"
          >
            <LogOut size={17} />
            Logout
          </button>

          <div className="mt-7 border-t border-white/5 pt-5">
            <p className="text-[11px] leading-5 text-slate-600">
              UpNetwork CPA
              <br />
              Affiliate Network
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
