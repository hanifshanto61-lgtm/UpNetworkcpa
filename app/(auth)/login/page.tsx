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
  RefreshCw,
  Rocket,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAIL = "islamhanif122@gmail.com";

function BrandLogo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
          light
            ? "bg-white/10 ring-1 ring-white/15"
            : "bg-gradient-to-br from-cyan-400 to-blue-700 shadow-lg shadow-blue-600/20"
        }`}
      >
        <svg
          viewBox="0 0 48 48"
          className="h-10 w-10"
          fill="none"
          aria-label="UpNetworkCpa logo"
          role="img"
        >
          <path
            d="M35 5L46 16L34 19L35 5Z"
            fill={light ? "#22D3EE" : "#FFFFFF"}
          />
          <path
            d="M32 17L25 34C21 43 12 44 6 39C1 35 2 28 5 21L10 11C12 7 17 8 18 12C19 14 18 16 17 18L12 29C11 32 13 34 16 32L22 19L32 17Z"
            fill={light ? "#06B6D4" : "#FFFFFF"}
          />
          <path
            d="M24 15L34 12L29 24L21 27L24 15Z"
            fill={light ? "#60A5FA" : "#DBEAFE"}
          />
        </svg>
      </div>

      <div>
        <div
          className={`text-xl font-black tracking-tight sm:text-2xl ${
            light ? "text-white" : "text-slate-950"
          }`}
        >
          UpNetwork<span className="text-cyan-500">Cpa</span>
        </div>
        <div
          className={`text-[10px] font-bold uppercase tracking-[0.22em] ${
            light ? "text-blue-200" : "text-slate-600"
          }`}
        >
          Best CPA Network
        </div>
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
      if (!data.user) throw new Error("Login failed. Please try again.");

      if (data.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        router.replace("/admin");
      } else {
        router.replace("/affiliate");
      }

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

  return (
    <main className="min-h-screen bg-[#06142e] font-sans">
      <div className="grid min-h-screen lg:grid-cols-[60%_40%]">
        {/* LEFT BRAND SECTION */}
        <section className="relative flex flex-col overflow-hidden bg-gradient-to-br from-[#03102d] via-[#06245a] to-[#064b9b] px-6 py-7 text-white sm:px-10 lg:px-10 xl:px-14">
          <div className="pointer-events-none absolute -left-32 top-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />

          <header className="relative z-10 flex flex-wrap items-center justify-between gap-5">
            <BrandLogo light />

            <div className="hidden items-center gap-4 text-xs font-medium text-blue-100 xl:flex">
              <span>More Offers</span>
              <span className="text-cyan-400">•</span>
              <span>Higher Rates</span>
              <span className="text-cyan-400">•</span>
              <span>Bigger Earnings</span>
            </div>
          </header>

          <div className="relative z-10 grid flex-1 items-center gap-8 py-10 xl:grid-cols-[0.95fr_1.05fr] xl:gap-3">
            <div className="max-w-xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100">
                <Zap className="h-4 w-4 text-cyan-300" />
                Your Success, Our Priority
              </div>

              <h1 className="text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl xl:text-[54px]">
                Your Success
                <br />
                <span className="bg-gradient-to-r from-cyan-300 to-sky-400 bg-clip-text text-transparent">
                  Our Priority
                </span>
              </h1>

              <p className="mt-6 max-w-md text-sm leading-6 text-blue-100 sm:text-base">
                Join UpNetworkCpa and start earning with CPA offers, trusted
                advertisers, and reliable tracking tools.
              </p>

              <div className="mt-7 space-y-4">
                {[
                  {
                    icon: Rocket,
                    color: "from-emerald-400 to-green-600",
                    title: "High Paying Offers",
                    desc: "Discover campaigns from advertisers",
                  },
                  {
                    icon: ShieldCheck,
                    color: "from-sky-400 to-blue-600",
                    title: "Reliable Tracking",
                    desc: "Monitor your clicks and conversions",
                  },
                  {
                    icon: Users,
                    color: "from-violet-400 to-purple-600",
                    title: "Dedicated Support",
                    desc: "Help when you need it",
                  },
                  {
                    icon: TrendingUp,
                    color: "from-amber-400 to-orange-500",
                    title: "Track Your Earnings",
                    desc: "Follow your performance and payouts",
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.title} className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${item.color} shadow-lg`}
                      >
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-xs text-blue-200">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dashboard visual preview */}
            <div className="relative mx-auto w-full max-w-[480px] xl:mt-16">
              <div className="absolute -right-3 top-0 h-36 w-36 rounded-full bg-cyan-400/20 blur-3xl" />

              <div className="relative rounded-2xl border border-blue-300/30 bg-[#071831]/95 p-4 shadow-2xl shadow-black/40 sm:p-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
                      <Activity className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">UpNetworkCpa</p>
                      <p className="text-[10px] text-slate-400">
                        Affiliate Dashboard
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-300">
                    ● Overview
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 p-3">
                    <MousePointerClick className="h-4 w-4 text-blue-100" />
                    <p className="mt-3 text-lg font-black">Clicks</p>
                    <p className="mt-1 text-[10px] text-blue-100">
                      Traffic
                    </p>
                  </div>

                  <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 p-3">
                    <CheckCircle2 className="h-4 w-4 text-green-100" />
                    <p className="mt-3 text-lg font-black">Leads</p>
                    <p className="mt-1 text-[10px] text-green-100">
                      Conversions
                    </p>
                  </div>

                  <div className="rounded-xl bg-gradient-to-br from-violet-500 to-indigo-700 p-3">
                    <Wallet className="h-4 w-4 text-violet-100" />
                    <p className="mt-3 text-lg font-black">Earnings</p>
                    <p className="mt-1 text-[10px] text-violet-100">
                      Revenue
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold">Performance Overview</p>
                    <BarChart3 className="h-4 w-4 text-cyan-300" />
                  </div>

                  <div className="mt-4 flex h-24 items-end gap-2">
                    {[30, 48, 38, 68, 46, 76, 57, 86, 62, 94, 72, 100].map(
                      (height, index) => (
                        <div
                          key={index}
                          className="flex-1 rounded-t-sm bg-gradient-to-t from-blue-700 to-cyan-300"
                          style={{ height: `${height}%` }}
                        />
                      )
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
                    <ArrowUpRight className="h-3 w-3 text-emerald-300" />
                    Track your real performance after logging in
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-5 -right-2 hidden w-28 rounded-2xl border border-blue-300/30 bg-[#081831] p-3 shadow-xl sm:block">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-700">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <p className="mt-2 text-center text-[10px] font-bold text-white">
                  UpNetworkCpa
                </p>
                <p className="mt-1 text-center text-[9px] text-blue-200">
                  Affiliate Portal
                </p>
              </div>
            </div>
          </div>

          <footer className="relative z-10 border-t border-white/10 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-blue-100">
                <ShieldCheck className="h-5 w-5 text-cyan-300" />
                <div>
                  <p className="font-bold text-white">
                    Built for Affiliate Success
                  </p>
                  <p className="mt-1 text-[10px] text-blue-200">
                    Your growth is our mission.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[10px] font-semibold text-blue-200">
                <span>Offers</span>
                <span className="text-cyan-400">•</span>
                <span>Tracking</span>
                <span className="text-cyan-400">•</span>
                <span>Earnings</span>
              </div>
            </div>

            <p className="mt-5 text-[10px] text-blue-300/70">
              © {new Date().getFullYear()} UpNetworkCpa. All rights reserved.
            </p>
          </footer>
        </section>

        {/* RIGHT LOGIN SECTION */}
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#f7faff] via-white to-[#edf4ff] px-5 py-8 sm:px-9">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-200/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-cyan-200/25 blur-3xl" />

          <div className="relative z-10 w-full max-w-[460px]">
            <div className="mb-7 flex justify-center">
              <BrandLogo />
            </div>

            <div className="rounded-2xl border border-white bg-white/95 p-6 shadow-[0_20px_70px_rgba(23,65,130,0.12)] sm:p-9">
              <div className="mb-7">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                  Affiliate Login
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-[#10234a] sm:text-4xl">
                  Welcome Back
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Login to your affiliate panel and continue your journey.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
                >
                  {error}
                </div>
              )}

              {message && (
                <div
                  role="status"
                  className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-700"
                >
                  {message}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Email Address
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
                      placeholder="Email Address"
                      className="h-13 w-full rounded-xl border border-blue-100 bg-white py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Password
                  </label>

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
                      placeholder="Password"
                      className="h-13 w-full rounded-xl border border-blue-100 bg-white py-3 pl-12 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-700"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <label className="flex cursor-pointer items-center gap-2 text-slate-600">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(event) => setRemember(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                    />
                    Remember me
                  </label>

                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={resetLoading}
                    className="font-semibold text-blue-600 transition hover:text-blue-800 disabled:opacity-60"
                  >
                    {resetLoading ? "Sending..." : "Forgot Password?"}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-13 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-blue-700 px-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    "Logging in..."
                  ) : (
                    <>
                      <ArrowRight className="h-5 w-5" />
                      Log In
                    </>
                  )}
                </button>
              </form>

              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-medium text-slate-400">OR</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <Link
                href="/signup"
                className="flex min-h-[62px] w-full flex-col items-center justify-center rounded-xl border border-blue-500 px-4 py-3 text-blue-700 transition hover:bg-blue-50"
              >
                <span className="flex items-center gap-2 text-sm font-bold">
                  <Users className="h-4 w-4" />
                  Sign Up
                </span>
                <span className="mt-1 text-xs text-blue-500">
                  Create your affiliate account
                </span>
              </Link>

              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetLoading}
                className="mt-3 flex min-h-[54px] w-full items-center justify-center gap-3 rounded-xl bg-blue-50 px-4 py-3 text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
              >
                <RefreshCw className="h-5 w-5" />
                <span className="text-left">
                  <span className="block text-sm font-bold">
                    {resetLoading ? "Sending..." : "Reset Password"}
                  </span>
                  <span className="mt-1 block text-[10px] text-blue-500">
                    Get a new password via email
                  </span>
                </span>
              </button>

              <div className="mt-6 flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-blue-600" />
                <div>
                  <p className="text-xs font-bold text-[#10234a]">
                    Your security is our top priority
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Never share your password. Keep your account details safe.
                  </p>
                </div>
              </div>
            </div>

            <footer className="mt-6 text-center">
              <p className="text-[11px] text-slate-500">
                © {new Date().getFullYear()} UpNetworkCpa. All rights reserved.
              </p>
              <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-blue-600">
                <Link href="/terms" className="hover:underline">
                  Terms of Service
                </Link>
                <span className="text-slate-300">|</span>
                <Link href="/privacy" className="hover:underline">
                  Privacy Policy
                </Link>
                <span className="text-slate-300">|</span>
                <a href="mailto:support@upnetworkcpa.com" className="hover:underline">
                  Contact Us
                </a>
              </div>
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}
