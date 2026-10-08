"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Network,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WalletCards,
  Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAIL = "islamhanif122@gmail.com";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage(
        "Supabase configuration is missing. Please contact the administrator."
      );
      return;
    }

    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      const signedInEmail = data.user.email?.toLowerCase();

      if (signedInEmail === ADMIN_EMAIL.toLowerCase()) {
        router.replace("/admin");
      } else {
        router.replace("/affiliate");
      }
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#06101f]">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute right-[-80px] top-1/3 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute bottom-[-120px] left-1/3 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.10),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(99,102,241,0.10),transparent_30%)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid w-full overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
          {/* LEFT — BRAND / NETWORK SIDE */}
          <section className="relative hidden min-h-[720px] overflow-hidden border-r border-white/10 p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-indigo-500/10" />

            {/* Decorative lines */}
            <div className="pointer-events-none absolute right-[-80px] top-[-80px] h-72 w-72 rounded-full border border-blue-400/10" />
            <div className="pointer-events-none absolute right-[-45px] top-[-45px] h-56 w-56 rounded-full border border-indigo-400/10" />
            <div className="pointer-events-none absolute bottom-[-110px] left-[-100px] h-72 w-72 rounded-full border border-cyan-400/10" />

            <div className="relative">
              {/* Logo */}
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-xl backdrop-blur">
                  <svg
                    width="34"
                    height="34"
                    viewBox="0 0 64 64"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M16 44L27 33L36 40L49 20"
                      stroke="white"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M39 20H49V30"
                      stroke="white"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="16" cy="44" r="5" fill="white" />
                    <circle cx="27" cy="33" r="5" fill="white" />
                    <circle cx="36" cy="40" r="5" fill="white" />
                    <circle cx="49" cy="20" r="5" fill="white" />
                  </svg>
                </div>

                <div>
                  <p className="text-xl font-extrabold tracking-tight text-white">
                    UpNetwork Cpa
                  </p>
                  <p className="text-xs font-medium text-blue-200/70">
                    Performance • Growth • Network
                  </p>
                </div>
              </div>

              {/* Hero copy */}
              <div className="mt-20 max-w-xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-300/15 bg-blue-400/10 px-3.5 py-1.5 text-xs font-semibold text-blue-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Affiliate Performance Platform
                </div>

                <h1 className="text-4xl font-black leading-tight tracking-tight text-white xl:text-5xl">
                  Turn traffic into
                  <span className="block bg-gradient-to-r from-blue-300 via-cyan-200 to-indigo-300 bg-clip-text text-transparent">
                    measurable results.
                  </span>
                </h1>

                <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">
                  Manage offers, smart links, conversions, earnings and
                  affiliate performance from one professional network portal.
                </p>
              </div>

              {/* Feature cards */}
              <div className="mt-12 grid gap-3">
                <FeatureRow
                  icon={<BarChart3 className="h-5 w-5" />}
                  title="Performance insights"
                  description="Track clicks, conversions and earnings in one place."
                />

                <FeatureRow
                  icon={<WalletCards className="h-5 w-5" />}
                  title="Earnings & payments"
                  description="Keep your revenue and payout information organized."
                />

                <FeatureRow
                  icon={<Zap className="h-5 w-5" />}
                  title="Smart tracking"
                  description="Use smart links and conversion tracking for your campaigns."
                />
              </div>
            </div>

            {/* Bottom badges */}
            <div className="relative mt-10 flex flex-wrap gap-3">
              <BottomBadge icon={<ShieldCheck className="h-4 w-4" />}>
                Secure access
              </BottomBadge>

              <BottomBadge icon={<TrendingUp className="h-4 w-4" />}>
                Performance focused
              </BottomBadge>

              <BottomBadge icon={<Network className="h-4 w-4" />}>
                Affiliate network
              </BottomBadge>
            </div>
          </section>

          {/* RIGHT — LOGIN */}
          <section className="flex min-h-[720px] items-center bg-slate-950/40 p-5 sm:p-8 lg:p-10 xl:p-14">
            <div className="mx-auto w-full max-w-md">
              {/* Mobile brand */}
              <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 64 64"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M16 44L27 33L36 40L49 20"
                      stroke="white"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M39 20H49V30"
                      stroke="white"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="16" cy="44" r="5" fill="white" />
                    <circle cx="27" cy="33" r="5" fill="white" />
                    <circle cx="36" cy="40" r="5" fill="white" />
                    <circle cx="49" cy="20" r="5" fill="white" />
                  </svg>
                </div>

                <div>
                  <p className="text-lg font-extrabold text-white">
                    UpNetwork Cpa
                  </p>
                  <p className="text-[11px] text-blue-200/70">
                    Affiliate Network
                  </p>
                </div>
              </div>

              {/* Login card */}
              <div className="rounded-[28px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
                <div className="mb-8">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300 ring-1 ring-blue-400/20">
                    <LockKeyhole className="h-5 w-5" />
                  </div>

                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-300/80">
                    Affiliate Portal
                  </p>

                  <h2 className="text-3xl font-black tracking-tight text-white">
                    Welcome back
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Sign in to access your UpNetwork Cpa account and manage
                    your affiliate activity.
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  {/* Email */}
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-semibold text-slate-200"
                    >
                      Email Address
                    </label>

                    <div className="group relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-500 transition group-focus-within:text-blue-400" />

                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.045] py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-blue-400/50 focus:bg-blue-400/[0.03] focus:ring-4 focus:ring-blue-500/10"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label
                        htmlFor="password"
                        className="text-sm font-semibold text-slate-200"
                      >
                        Password
                      </label>

                      <span className="text-[11px] font-medium text-slate-500">
                        Secure sign-in
                      </span>
                    </div>

                    <div className="group relative">
                      <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-500 transition group-focus-within:text-blue-400" />

                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.045] py-3.5 pl-11 pr-12 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-blue-400/50 focus:bg-blue-400/[0.03] focus:ring-4 focus:ring-blue-500/10"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={
                          showPassword
                            ? "Hide password"
                            : "Show password"
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-slate-200"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4.5 w-4.5" />
                        ) : (
                          <Eye className="h-4.5 w-4.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Error */}
                  {message && (
                    <div
                      role="alert"
                      className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3.5"
                    >
                      <p className="text-sm leading-6 text-red-200">
                        {message}
                      </p>
                    </div>
                  )}

                  {/* Login button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-900/30 transition hover:from-blue-500 hover:to-indigo-500 hover:shadow-xl hover:shadow-blue-900/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Login to Account
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </form>

                {/* Signup */}
                <div className="mt-7 border-t border-white/10 pt-6 text-center">
                  <p className="text-sm text-slate-400">
                    Don&apos;t have an account?{" "}
                    <Link
                      href="/signup"
                      className="font-bold text-blue-300 transition hover:text-blue-200"
                    >
                      Create Affiliate Account
                    </Link>
                  </p>
                </div>

                {/* Trust row */}
                <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-500">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Protected affiliate portal</span>
                </div>
              </div>

              {/* Footer */}
              <p className="mt-6 text-center text-xs text-slate-600">
                © {new Date().getFullYear()} UpNetwork Cpa. All rights
                reserved.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function FeatureRow({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.035] p-4 transition hover:bg-white/[0.06]">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300 ring-1 ring-blue-400/10">
        {icon}
      </div>

      <div>
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function BottomBadge({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-slate-300">
      {icon}
      {children}
    </div>
  );
}
