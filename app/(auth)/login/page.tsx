"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, BarChart3, Eye, EyeOff, LockKeyhole, Mail,
  Network, ShieldCheck, TrendingUp, WalletCards, Zap,
  RefreshCw, CheckCircle2,
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
  const [recovering, setRecovering] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setSuccess(false);

    if (!supabase) {
      setMessage("Authentication is not configured. Please contact support.");
      return;
    }

    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      // Keep Supabase's existing session behavior. Remember Me controls
      // the user's preference only; it does not weaken authentication.
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        setMessage(
          error.message.toLowerCase().includes("email not confirmed")
            ? "Please confirm your email before logging in."
            : error.message
        );
        return;
      }

      if (!data.user) {
        setMessage("Login could not be completed. Please try again.");
        return;
      }

      if (data.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        router.replace("/admin");
      } else {
        router.replace("/affiliate");
      }
      router.refresh();
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setMessage("");
    setSuccess(false);

    if (!supabase) {
      setMessage("Authentication is not configured. Please contact support.");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setMessage("Enter your email address first, then click Forgot Password.");
      return;
    }

    setRecovering(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setMessage(error.message);
      } else {
        setSuccess(true);
        setMessage(
          "If an account exists for this email, a password reset link will be sent. Check your inbox and spam folder."
        );
      }
    } catch {
      setMessage("Unable to send the reset email. Please try again.");
    } finally {
      setRecovering(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 lg:grid lg:grid-cols-2">
      <section className="relative hidden min-h-screen overflow-hidden bg-gradient-to-br from-[#061329] via-[#09255a] to-[#0648a5] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="pointer-events-none absolute -right-24 top-20 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-10 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl" />

        <div className="relative flex items-center gap-4">
          <Logo />
          <div>
            <div className="text-2xl font-black tracking-tight">
              UpNetwork <span className="text-cyan-300">Cpa</span>
            </div>
            <p className="text-sm text-blue-100">Best Cpa Network</p>
          </div>
        </div>

        <div className="relative max-w-xl py-12">
          <span className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-cyan-200">
            Affiliate Performance Platform
          </span>
          <h1 className="mt-7 text-5xl font-black leading-tight xl:text-6xl">
            Your Success
            <span className="block text-cyan-300">Our Priority.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-blue-100/90">
            Manage your affiliate offers, smart links, clicks, conversions,
            earnings and payments from one professional dashboard.
          </p>

          <div className="mt-10 space-y-5">
            <Feature icon={<BarChart3 />} title="Performance Insights"
              desc="Monitor clicks and conversions in your dashboard." />
            <Feature icon={<WalletCards />} title="Earnings & Payments"
              desc="Keep track of commissions and payout information." />
            <Feature icon={<Zap />} title="Smart Links & Tracking"
              desc="Organize your campaigns and track affiliate activity." />
            <Feature icon={<ShieldCheck />} title="Protected Account"
              desc="Sign in securely using your registered account." />
          </div>
        </div>

        <div className="relative flex items-center gap-3 border-t border-white/10 pt-6 text-sm text-blue-100/80">
          <ShieldCheck className="h-5 w-5 text-cyan-300" />
          Your growth is our mission.
          <span className="ml-auto">UpNetworkCpa.com</span>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <Logo />
            <div>
              <div className="text-xl font-black">
                UpNetwork <span className="text-blue-600">Cpa</span>
              </div>
              <p className="text-xs text-slate-500">Best Cpa Network</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-9">
            <div className="mb-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <LockKeyhole className="h-6 w-6" />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                Affiliate Portal
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">
                Welcome Back
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Log in to your UpNetworkCpa account and manage your affiliate activity.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input id="email" name="email" type="email" required
                    autoComplete="email" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-semibold">
                  Password
                </label>
                <div className="relative">
                  <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input id="password" name="password"
                    type={showPassword ? "text" : "password"} required
                    autoComplete="current-password" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-12 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 text-sm">
                <label className="flex cursor-pointer items-center gap-2 text-slate-600">
                  <input type="checkbox" checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-blue-600" />
                  Remember me
                </label>
                <button type="button" onClick={handleForgotPassword}
                  disabled={recovering}
                  className="font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-60">
                  {recovering ? "Sending..." : "Forgot Password?"}
                </button>
              </div>

              {message && (
                <div role="alert" className={`rounded-xl border px-4 py-3 text-sm leading-6 ${
                  success
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}>
                  {success && <CheckCircle2 className="mr-1 inline h-4 w-4" />}
                  {message}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:from-blue-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? "Signing in..." : "Log In"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <div className="my-6 flex items-center gap-4 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" /> OR
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <Link href="/signup"
              className="flex w-full items-center justify-center rounded-xl border border-blue-500 px-5 py-3.5 text-sm font-bold text-blue-600 transition hover:bg-blue-50">
              Sign Up — Create Affiliate Account
            </Link>

            <button type="button" onClick={handleForgotPassword}
              disabled={recovering}
              className="mt-4 flex w-full items-center justify-center gap-2 py-2 text-sm font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-60">
              <RefreshCw className="h-4 w-4" />
              Reset Password
            </button>

            <div className="mt-7 flex items-start gap-3 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <p><strong className="text-slate-700">Your security matters.</strong><br />
                Never share your password or password reset link with anyone.</p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} UpNetworkCpa. All rights reserved.
          </p>
          <p className="mt-2 text-center text-xs text-slate-400">
            <Link href="/" className="hover:text-blue-600">Home</Link>
            {" · "}
            <Link href="/signup" className="hover:text-blue-600">Create Account</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function Logo() {
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-700 text-white shadow-lg shadow-blue-900/20">
      <svg width="36" height="36" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <path d="M12 43L25 30L35 39L52 17" stroke="currentColor"
          strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M38 17H52V31" stroke="currentColor"
          strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function Feature({ icon, title, desc }: {
  icon: React.ReactNode; title: string; desc: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-300">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-bold">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-blue-100/70">{desc}</p>
      </div>
    </div>
  );
}
