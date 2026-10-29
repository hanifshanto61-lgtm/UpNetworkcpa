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
  ShieldCheck,
  Send,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import ContactManagersPreview from "@/components/contact-managers-preview";

function BrandLogo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl p-1 ${
          light
            ? "bg-white/10 ring-1 ring-white/20"
            : "bg-white shadow-lg shadow-blue-950/10 ring-1 ring-slate-200"
        }`}
      >
        <img
          src="/file_0000000013688207a03d42a2550c1954.png"
          alt="UpNetwork CPA logo"
          className="h-full w-full object-contain"
        />
      </div>
      <div>
        <p
          className={`text-xl font-black tracking-tight ${
            light ? "text-white" : "text-slate-950"
          }`}
        >
          UpNetwork<span className="text-cyan-400">Cpa</span>
        </p>
        <p
          className={`mt-0.5 text-[9px] font-bold uppercase tracking-[0.24em] ${
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

      const accessToken = data.session.access_token;

      const adminResponse = await fetch("/api/admin/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      if (adminResponse.ok) {
        const adminData = await adminResponse.json();
        const role = adminData?.admin?.role;

        if (
          adminData?.success === true &&
          (role === "super_admin" || role === "sub_admin")
        ) {
          router.replace("/admin");
          router.refresh();
          return;
        }
      } else if (adminResponse.status !== 401) {
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

  return (
    <main className="min-h-screen bg-[#f3f6fc] text-slate-900">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] lg:grid-cols-[1.02fr_0.98fr]">
        {/* PREMIUM BRAND PANEL */}
        <section className="relative isolate flex min-h-[420px] flex-col overflow-hidden bg-[#07152f] px-5 py-6 text-white sm:px-8 sm:py-8 lg:min-h-screen lg:px-10 xl:px-14">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_10%_10%,rgba(14,165,233,0.22),transparent_36%),radial-gradient(ellipse_at_90%_70%,rgba(37,99,235,0.28),transparent_40%),linear-gradient(145deg,#07152f_0%,#0a2450_55%,#073b70_100%)]" />
          <div className="pointer-events-none absolute -right-24 top-24 -z-10 h-72 w-72 rounded-full border border-cyan-300/10" />
          <div className="pointer-events-none absolute -right-12 top-36 -z-10 h-48 w-48 rounded-full border border-cyan-300/10" />

          <header className="relative z-10 flex items-center justify-between gap-4">
            <BrandLogo light />
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-[11px] font-semibold text-blue-100 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
              Affiliate Partner Portal
            </div>
          </header>

          <div className="relative z-10 mx-auto grid w-full max-w-2xl flex-1 items-center gap-10 py-12 lg:py-14">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.08] px-3.5 py-2 text-xs font-semibold text-cyan-100">
                <Zap className="h-4 w-4 text-cyan-300" />
                Grow Smarter. Earn Better.
              </div>

              <h1 className="max-w-xl text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl xl:text-[62px]">
                Turn your traffic
                <br />
                into{" "}
                <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-400 bg-clip-text text-transparent">
                  real results.
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-sm leading-7 text-blue-100/80 sm:text-base">
                One partner portal for offers, conversion tracking, affiliate
                performance and earnings.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur-sm">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-400/15 text-cyan-300">
                    <Rocket className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-bold">Quality CPA Offers</p>
                  <p className="mt-1.5 text-xs leading-5 text-blue-100/65">
                    Explore campaigns suited to your audience.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur-sm">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
                    <Activity className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-bold">Clear Performance</p>
                  <p className="mt-1.5 text-xs leading-5 text-blue-100/65">
                    Keep track of clicks and conversions.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur-sm">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/15 text-violet-300">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-bold">Performance Insights</p>
                  <p className="mt-1.5 text-xs leading-5 text-blue-100/65">
                    Understand your campaign activity.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur-sm">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-bold">Earnings Overview</p>
                  <p className="mt-1.5 text-xs leading-5 text-blue-100/65">
                    Review your affiliate revenue in one place.
                  </p>
                </div>
              </div>

              {/* Illustrative dashboard preview; not live account data */}
              <div className="mt-8 rounded-2xl border border-white/10 bg-[#0a1d3b]/90 p-4 shadow-2xl shadow-black/20 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600">
                      <Activity className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Affiliate Overview</p>
                      <p className="mt-1 text-[11px] text-blue-200/65">
                        A clearer view of your activity
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-semibold text-emerald-300">
                    Performance tools
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="rounded-xl bg-blue-500/10 p-3 ring-1 ring-blue-300/10">
                    <MousePointerClick className="h-4 w-4 text-blue-300" />
                    <p className="mt-3 text-xs font-bold sm:text-sm">Clicks</p>
                    <p className="mt-1 text-[10px] text-blue-100/60">
                      Traffic
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-500/10 p-3 ring-1 ring-emerald-300/10">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    <p className="mt-3 text-xs font-bold sm:text-sm">
                      Conversions
                    </p>
                    <p className="mt-1 text-[10px] text-blue-100/60">Leads</p>
                  </div>
                  <div className="rounded-xl bg-violet-500/10 p-3 ring-1 ring-violet-300/10">
                    <TrendingUp className="h-4 w-4 text-violet-300" />
                    <p className="mt-3 text-xs font-bold sm:text-sm">
                      Earnings
                    </p>
                    <p className="mt-1 text-[10px] text-blue-100/60">
                      Revenue
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex h-14 items-end gap-1.5 sm:h-16">
                  {[26, 40, 32, 58, 45, 69, 52, 80, 61, 92, 70, 100, 78, 88, 65, 96].map(
                    (height, index) => (
                      <div
                        key={index}
                        className="flex-1 rounded-t-sm bg-gradient-to-t from-blue-700 to-cyan-300/90"
                        style={{ height: `${height}%` }}
                      />
                    )
                  )}
                </div>
                <p className="mt-3 text-[10px] text-blue-100/50">
                  Illustration only · Sign in to view your account
                </p>
              </div>
            </div>
          </div>

          <footer className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-[11px] text-blue-100/55">
            <span>
              © {new Date().getFullYear()} UpNetworkCpa. All rights reserved.
            </span>
            <span className="flex items-center gap-2">
              <Globe2 className="h-3.5 w-3.5" />
              Built for affiliate growth
            </span>
          </footer>
        </section>

        {/* LOGIN PANEL */}
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-8 lg:px-10 xl:px-14">
          <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-blue-200/35 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-cyan-100/60 blur-3xl" />

          <div className="relative z-10 w-full max-w-[440px]">
            <div className="mb-8 flex justify-center lg:hidden">
              <BrandLogo />
            </div>

            <div className="rounded-[28px] border border-white bg-white p-6 shadow-[0_25px_90px_rgba(15,40,90,0.12)] sm:p-9">
              <div className="mb-7">
                <div className="mb-5 hidden lg:block">
                  <BrandLogo />
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                  Secure Partner Access
                </div>
                <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-[36px]">
                  Welcome back.
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sign in to access your UpNetwork CPA account.
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
                    className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-slate-700"
                  >
                    Email address
                  </label>
                  <div className="group relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition group-focus-within:text-blue-600" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label
                      htmlFor="password"
                      className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-700"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={resetLoading}
                      className="text-xs font-bold text-blue-700 transition hover:text-blue-900 disabled:opacity-60"
                    >
                      {resetLoading ? "Sending link..." : "Forgot password?"}
                    </button>
                  </div>

                  <div className="group relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition group-focus-within:text-blue-600" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-12 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-blue-700"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-2.5 text-xs font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                  />
                  Keep me signed in on this device
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 px-4 text-sm font-bold text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-700/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    "Signing you in..."
                  ) : (
                    <>
                      Sign in to your account
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  New to UpNetwork?
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <Link
                href="/signup"
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-800"
              >
                <Users className="h-4 w-4" />
                Create an affiliate account
              </Link>

              <a
                href="https://t.me/UpNetworkCpaOfficial"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#229ED9] px-4 py-3 text-white shadow-md shadow-sky-700/10 transition hover:bg-[#168AC0]"
              >
                <Send className="h-5 w-5 shrink-0" />
                <span className="text-left">
                  <span className="block text-sm font-bold">
                    Join our Telegram channel
                  </span>
                  <span className="mt-1 block text-[10px] text-white/80">
                    Offers, news and network updates
                  </span>
                </span>
                <ArrowUpRight className="ml-auto h-4 w-4 shrink-0" />
              </a>

              <div className="mt-5 flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Your account, your responsibility
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">
                    Keep your password private and only sign in through the
                    official UpNetwork CPA website.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <ContactManagersPreview />
              </div>
            </div>

            <footer className="mt-6 px-2 text-center">
              <p className="text-[10px] text-slate-500">
                © {new Date().getFullYear()} UpNetworkCpa · All rights reserved
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] font-medium text-slate-500">
                <Link
                  href="/terms"
                  className="transition hover:text-blue-700"
                >
                  Terms of Service
                </Link>
                <span className="text-slate-300">•</span>
                <Link
                  href="/privacy"
                  className="transition hover:text-blue-700"
                >
                  Privacy Policy
                </Link>
                <span className="text-slate-300">•</span>
                <a
                  href="mailto:support@upnetworkcpa.com"
                  className="transition hover:text-blue-700"
                >
                  Contact Support
                </a>
              </div>
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}