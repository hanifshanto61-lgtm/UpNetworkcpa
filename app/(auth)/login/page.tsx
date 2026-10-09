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
  ShieldCheck,
  Wallet,
  Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAIL = "islamhanif122@gmail.com";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

      if (loginError) {
        throw loginError;
      }

      if (!data.user) {
        throw new Error("Login failed. Please try again.");
      }

      const normalizedEmail = data.user.email?.toLowerCase();

      if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
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
      setError("Enter your email address first.");
      return;
    }

    setResetLoading(true);

    try {
      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });

      if (resetError) {
        throw resetError;
      }

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
    <main className="min-h-screen bg-[#071225] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[1.04fr_0.96fr]">
        {/* LEFT: BRAND PANEL */}
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#071225] via-[#0b1d3c] to-[#123e83] px-10 py-10 text-white lg:flex lg:flex-col xl:px-16">
          <div className="pointer-events-none absolute -left-32 top-24 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 bottom-16 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-lg shadow-blue-950/30">
              <svg
                viewBox="0 0 48 48"
                className="h-8 w-8"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M8 34V14h6l10 12 10-12h6v20h-7V25L24 36l-9-11v9H8Z"
                  fill="#FFFFFF"
                />
                <path
                  d="M29 10h11v11"
                  stroke="#60A5FA"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M40 10 26 24"
                  stroke="#60A5FA"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div>
              <div className="text-xl font-extrabold tracking-tight">
                UpNetwork<span className="text-blue-400">Cpa</span>
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-blue-200">
                Best CPA Network
              </div>
            </div>
          </div>

          <div className="relative z-10 my-auto max-w-2xl py-12">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-4 py-2 text-xs font-semibold text-blue-100">
              <Zap className="h-4 w-4 text-cyan-300" />
              Your Success, Our Priority
            </div>

            <h1 className="max-w-xl text-4xl font-black leading-[1.13] tracking-tight xl:text-6xl">
              Turn Your Traffic Into{" "}
              <span className="bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
                Real Earnings.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">
              Welcome to your affiliate workspace. Discover offers, track
              performance, and manage your earnings from one powerful panel.
            </p>

            <div className="mt-8 grid max-w-lg grid-cols-2 gap-3">
              {[
                {
                  icon: Globe2,
                  title: "Global Offers",
                  desc: "Explore campaigns",
                },
                {
                  icon: Activity,
                  title: "Reliable Tracking",
                  desc: "Monitor your clicks",
                },
                {
                  icon: Wallet,
                  title: "Clear Earnings",
                  desc: "Track your revenue",
                },
                {
                  icon: ShieldCheck,
                  title: "Secure Account",
                  desc: "Your account matters",
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-sm"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-400/15 text-blue-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold">{item.title}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dashboard preview */}
            <div className="mt-10 max-w-xl rounded-2xl border border-white/15 bg-[#08162c]/80 p-5 shadow-2xl shadow-black/20 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400">
                    AFFILIATE OVERVIEW
                  </p>
                  <h2 className="mt-1 text-lg font-bold">Your performance</h2>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
                  <BarChart3 className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <MousePointerClick className="h-4 w-4 text-sky-300" />
                  <p className="mt-3 text-xl font-extrabold">Clicks</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Track traffic
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  <p className="mt-3 text-xl font-extrabold">Leads</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Monitor results
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <Wallet className="h-4 w-4 text-violet-300" />
                  <p className="mt-3 text-xl font-extrabold">Earnings</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    View payouts
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                <ArrowUpRight className="h-4 w-4 text-cyan-300" />
                Your real account statistics appear after you log in.
              </div>
            </div>
          </div>

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-xs text-slate-400">
            <span>© {new Date().getFullYear()} UpNetworkCpa</span>
            <span>Built for affiliate success</span>
          </div>
        </section>

        {/* RIGHT: LOGIN FORM */}
        <section className="relative flex min-h-screen items-center justify-center bg-[#f5f8ff] px-5 py-10 sm:px-10">
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-blue-200/30 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-indigo-200/30 blur-3xl" />

          <div className="relative z-10 w-full max-w-md">
            {/* Mobile logo */}
            <div className="mb-9 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-600 text-white shadow-lg shadow-blue-900/20">
                <Activity className="h-7 w-7" />
              </div>
              <div>
                <div className="text-xl font-extrabold tracking-tight text-slate-900">
                  UpNetwork<span className="text-blue-600">Cpa</span>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Best CPA Network
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white bg-white p-6 shadow-[0_20px_70px_rgba(25,55,110,0.10)] sm:p-9">
              <div className="mb-8">
                <div className="mb-5 hidden h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 lg:flex">
                  <LockKeyhole className="h-6 w-6" />
                </div>

                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                  Affiliate Portal
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                  Welcome Back
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Log in to your account and continue growing your earnings.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
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
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
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
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
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
                      onChange={(e) => setRemember(e.target.checked)}
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
                    {resetLoading ? "Sending..." : "Forgot password?"}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-700/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Logging in..." : "Log In"}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs text-slate-400">NEW TO OUR NETWORK?</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <Link
                href="/signup"
                className="flex h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
              >
                Create Affiliate Account
              </Link>

              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetLoading}
                className="mt-3 flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-blue-700 disabled:opacity-60"
              >
                Reset Password
              </button>

              <div className="mt-7 flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <p className="text-xs leading-5 text-slate-500">
                  Your account is protected by secure authentication. Never
                  share your password with anyone.
                </p>
              </div>
            </div>

            <p className="mt-6 text-center text-xs leading-5 text-slate-400">
              By logging in, you agree to use the UpNetworkCpa platform
              responsibly.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
