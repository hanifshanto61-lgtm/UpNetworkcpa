"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe2,
  LockKeyhole,
  Mail,
  MousePointerClick,
  Rocket,
  Send,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import ContactManagersPreview from "@/components/contact-managers-preview";

function BrandLogo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/file_0000000013688207a03d42a2550c1954.png"
        alt="UpNetwork CPA logo"
        className="h-12 w-12 shrink-0 rounded-xl bg-white object-contain p-1"
      />
      <div>
        <p
          className={`text-xl font-black tracking-tight ${
            light ? "text-white" : "text-slate-950"
          }`}
        >
          UpNetwork<span className="text-cyan-400">Cpa</span>
        </p>
        <p
          className={`mt-1 text-[9px] font-bold uppercase tracking-[0.18em] ${
            light ? "text-blue-200" : "text-slate-500"
          }`}
        >
          Performance Marketing Network
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showMobileLogin, setShowMobileLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) throw loginError;

      if (!data.user || !data.session?.access_token) {
        throw new Error("Login failed. Please try again.");
      }

      const response = await fetch("/api/admin/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
        cache: "no-store",
      });

      if (response.ok) {
        const result = await response.json();
        const role = result?.admin?.role;

        if (
          result?.success === true &&
          (role === "super_admin" || role === "sub_admin")
        ) {
          router.replace("/admin");
          router.refresh();
          return;
        }
      } else if (response.status !== 401) {
        throw new Error(
          "Unable to verify account role. Please try again."
        );
      }

      router.replace("/affiliate");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to log in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Please enter your email address first.");
      return;
    }

    setResetLoading(true);

    try {
      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });

      if (resetError) throw resetError;

      setMessage(
        "If this email is registered, a password reset link will be sent. Please check your inbox."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to request a password reset."
      );
    } finally {
      setResetLoading(false);
    }
  }

  const loginForm = (
    <div className="w-full">
      <div className="mb-6">
        <div className="mb-5">
          <BrandLogo />
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Secure Partner Access
        </div>

        <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
          Welcome back.
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Sign in to access your UpNetwork CPA account.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {message}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-xs font-bold text-slate-700"
          >
            Email address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <label
              htmlFor="password"
              className="text-xs font-bold text-slate-700"
            >
              Password
            </label>
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={resetLoading}
              className="text-xs font-bold text-blue-700 hover:text-blue-900 disabled:opacity-60"
            >
              {resetLoading ? "Sending link..." : "Forgot password?"}
            </button>
          </div>

          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-12 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="h-4 w-4 rounded accent-blue-600"
          />
          Keep me signed in on this device
        </label>

        <button
          type="submit"
          disabled={loading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-sky-500 px-4 text-sm font-bold text-white shadow-lg shadow-blue-700/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            "Signing you in..."
          ) : (
            <>
              Login to your account
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Or continue with
        </span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <a
        href="https://t.me/UpNetworkCpaOfficial"
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-sm font-bold text-sky-800 transition hover:bg-sky-100"
      >
        <Send className="h-5 w-5" />
        Join our Telegram channel
        <ArrowUpRight className="h-4 w-4" />
      </a>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
        <p className="text-[11px] leading-5 text-slate-500">
          Keep your password private and only sign in through the official
          UpNetwork CPA website.
        </p>
      </div>

      <div className="mt-4">
        <ContactManagersPreview />
      </div>

      <p className="mt-5 text-center text-xs text-slate-500">
        New to UpNetwork?{" "}
        <Link
          href="/signup"
          className="font-bold text-blue-700 hover:text-blue-900"
        >
          Create an account
        </Link>
      </p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#f3f6fc] text-slate-900">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] lg:grid-cols-2">
        {/* BRANDING PANEL */}
        <section className="relative isolate flex min-h-screen flex-col overflow-hidden bg-[#07152f] px-5 py-6 text-white sm:px-8 sm:py-8 lg:px-10 xl:px-14">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_10%_10%,rgba(14,165,233,0.22),transparent_36%),radial-gradient(ellipse_at_90%_70%,rgba(37,99,235,0.28),transparent_40%),linear-gradient(145deg,#07152f_0%,#0a2450_55%,#073b70_100%)]" />

          <header className="relative z-10 flex items-center justify-between gap-3">
            <BrandLogo light />
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-[11px] font-semibold text-blue-100 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Affiliate Partner Portal
            </div>
          </header>

          <div className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-8 lg:py-5">
            <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.08] px-3 py-2 text-xs font-semibold text-cyan-100">
              <Zap className="h-4 w-4 text-cyan-300" />
              Grow Smarter. Earn Better.
            </div>

            <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl xl:text-[56px]">
              Turn your traffic
              <br />
              into{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-400 bg-clip-text text-transparent">
                real results.
              </span>
            </h1>

            <p className="mt-4 max-w-lg text-sm leading-6 text-blue-100/80 sm:text-base">
              One partner portal for offers, conversion tracking, affiliate
              performance and earnings.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 sm:p-4">
                <Rocket className="mb-2 h-6 w-6 text-cyan-300" />
                <p className="text-sm font-bold">Quality CPA Offers</p>
                <p className="mt-1 text-xs leading-5 text-blue-100/65">
                  Find campaigns for your audience.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 sm:p-4">
                <Activity className="mb-2 h-6 w-6 text-emerald-300" />
                <p className="text-sm font-bold">Clear Performance</p>
                <p className="mt-1 text-xs leading-5 text-blue-100/65">
                  Monitor clicks and conversions.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 sm:p-4">
                <BarChart3 className="mb-2 h-6 w-6 text-violet-300" />
                <p className="text-sm font-bold">Smart Insights</p>
                <p className="mt-1 text-xs leading-5 text-blue-100/65">
                  Understand campaign activity.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 sm:p-4">
                <Wallet className="mb-2 h-6 w-6 text-amber-300" />
                <p className="text-sm font-bold">Earnings Overview</p>
                <p className="mt-1 text-xs leading-5 text-blue-100/65">
                  Review your affiliate revenue.
                </p>
              </div>
            </div>

            {/* Compact preview on desktop only */}
            <div className="mt-5 hidden rounded-2xl border border-white/10 bg-[#0a1d3b]/90 p-4 xl:block">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-cyan-300">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">Affiliate Overview</p>
                  <p className="mt-1 text-xs text-blue-200/65">
                    Clicks · Conversions · Earnings
                  </p>
                </div>
              </div>
              <div className="mt-4 flex h-12 items-end gap-1.5">
                {[26, 40, 32, 58, 45, 69, 52, 80, 61, 92, 70, 100, 78, 88].map(
                  (height, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-t-sm bg-gradient-to-t from-blue-700 to-cyan-300/90"
                      style={{ height: `${height}%` }}
                    />
                  )
                )}
              </div>
              <p className="mt-2 text-[10px] text-blue-100/50">
                Illustrative preview · Sign in to view your account
              </p>
            </div>

            {/* MOBILE ACTIONS: both buttons visible immediately */}
            <div className="mt-6 grid grid-cols-2 gap-3 lg:hidden">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setMessage("");
                  setShowMobileLogin(true);
                }}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-3 text-sm font-bold text-white shadow-lg"
              >
                Login <ArrowRight className="h-4 w-4" />
              </button>

              <Link
                href="/signup"
                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-3 text-sm font-bold text-white transition hover:bg-white/20"
              >
                <Users className="h-4 w-4" />
                Sign Up
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-blue-100/70 lg:hidden">
              <span className="flex items-center gap-1.5">
                <MousePointerClick className="h-4 w-4 text-cyan-300" />
                Tracking
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                Conversions
              </span>
              <span className="flex items-center gap-1.5">
                <Globe2 className="h-4 w-4 text-violet-300" />
                Global offers
              </span>
            </div>
          </div>

          <footer className="relative z-10 border-t border-white/10 pt-4 text-[10px] text-blue-100/55">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>
                © {new Date().getFullYear()} UpNetworkCpa. All rights reserved.
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/terms" className="hover:text-white">
                  Terms
                </Link>
                <Link href="/privacy" className="hover:text-white">
                  Privacy
                </Link>
                <a
                  href="mailto:support@upnetworkcpa.com"
                  className="hover:text-white"
                >
                  Support
                </a>
              </div>
            </div>
          </footer>
        </section>

        {/* DESKTOP LOGIN + SIGN UP PANEL */}
        <section className="relative hidden min-h-screen items-center justify-center overflow-hidden px-6 py-6 lg:flex xl:px-12">
          <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-blue-200/35 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-cyan-100/60 blur-3xl" />

          <div className="relative z-10 w-full max-w-[440px] rounded-[28px] border border-white bg-white p-6 shadow-[0_25px_90px_rgba(15,40,90,0.12)] xl:p-8">
            {loginForm}

            <div className="mt-5 border-t border-slate-100 pt-5">
              <p className="mb-3 text-center text-xs text-slate-500">
                Don&apos;t have an account yet?
              </p>
              <Link
                href="/signup"
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 transition hover:bg-blue-100"
              >
                <Users className="h-4 w-4" />
                Sign Up — Create an Account
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* MOBILE LOGIN MODAL: stays on the same page */}
      {showMobileLogin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/75 p-3 backdrop-blur-sm sm:p-6 lg:hidden"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowMobileLogin(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Login to UpNetwork CPA"
            className="relative my-auto max-h-[94dvh] w-full max-w-[440px] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7"
          >
            <button
              type="button"
              onClick={() => setShowMobileLogin(false)}
              aria-label="Close login form"
              className="absolute right-3 top-3 z-10 rounded-full border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>

            {loginForm}

            <div className="mt-5 border-t border-slate-100 pt-4 text-center">
              <p className="mb-3 text-xs text-slate-500">
                Don&apos;t have an account yet?
              </p>
              <Link
                href="/signup"
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 transition hover:bg-blue-100"
              >
                <Users className="h-4 w-4" />
                Sign Up — Create an Account
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}