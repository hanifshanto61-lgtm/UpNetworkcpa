"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Globe2,
  MousePointerClick,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";

const benefits = [
  {
    icon: Target,
    title: "Dating & Lead Generation",
    description:
      "Apply for available campaigns that match your audience and traffic sources. Offer access depends on approval and campaign requirements.",
  },
  {
    icon: BarChart3,
    title: "Tracking & Reporting",
    description:
      "Review clicks, conversions, and earnings recorded for your account through your affiliate dashboard.",
  },
  {
    icon: Globe2,
    title: "International Publishers",
    description:
      "We welcome publishers worldwide. Eligible countries and traffic requirements vary by campaign.",
  },
  {
    icon: Users,
    title: "Manager Support",
    description:
      "Contact the network manager through our website to ask about available campaigns and approval requirements.",
  },
];

const steps = [
  "Create your free affiliate account.",
  "Complete your profile with accurate information about your traffic sources.",
  "Review available campaigns and apply for suitable offers.",
  "Wait for approval before promoting an offer.",
];

export default function AffiliateProgramPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/95 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-black tracking-tight">
            UpNetwork <span className="text-cyan-400">CPA</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/10 sm:px-4"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-cyan-400 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300 sm:px-4"
            >
              Join Free
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative px-4 py-20 sm:px-6 sm:py-28">
        <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-24 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl" />

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
            <Globe2 size={16} />
            International Affiliate Program
          </div>

          <h1 className="text-4xl font-black leading-tight sm:text-6xl">
            Grow Your Business with{" "}
            <span className="bg-gradient-to-r from-cyan-300 to-violet-400 bg-clip-text text-transparent">
              UpNetwork CPA
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            Join our affiliate network and explore Dating and Lead Generation
            campaigns. We welcome publishers and performance marketers from
            around the world who can deliver legitimate, quality traffic.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4 font-bold shadow-lg shadow-blue-600/20 hover:opacity-90 sm:px-7"
            >
              Create a Free Account
              <ArrowRight size={18} />
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-4 font-bold hover:bg-white/10 sm:px-7"
            >
              Affiliate Login
            </Link>
          </div>

          <p className="mt-5 text-xs leading-6 text-slate-500">
            Campaign availability, payouts, eligible countries, and traffic
            rules are confirmed according to each offer's requirements.
          </p>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-cyan-400">
              Publisher Benefits
            </p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Everything You Need to Get Started
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <article
                  key={benefit.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-cyan-400/30 hover:bg-white/[0.06]"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                    <Icon size={24} />
                  </div>

                  <h3 className="text-lg font-bold">{benefit.title}</h3>

                  <p className="mt-3 leading-7 text-slate-400">
                    {benefit.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-slate-900/70 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2">
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
              <CheckCircle2 size={25} />
            </div>

            <h2 className="text-3xl font-black">
              How to Join UpNetwork CPA
            </h2>

            <p className="mt-4 leading-7 text-slate-400">
              Start by creating an account. Complete your profile honestly
              so your application can be reviewed for suitable campaigns.
            </p>

            <Link
              href="/signup"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-6 py-3 font-bold text-slate-950 hover:bg-emerald-300"
            >
              Register Now
              <ArrowRight size={18} />
            </Link>
          </div>

          <ol className="space-y-4">
            {steps.map((step, index) => (
              <li
                key={step}
                className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 font-black text-cyan-300">
                  {index + 1}
                </span>

                <span className="leading-6 text-slate-300">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-blue-950 via-slate-900 to-violet-950 p-7 text-center sm:p-12">
          <ShieldCheck size={38} className="mx-auto text-cyan-300" />

          <h2 className="mt-5 text-3xl font-black">
            Quality Traffic. Long-Term Partnerships.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-300">
            Only use traffic sources permitted by each campaign. Fake leads,
            bots, misleading promotions, and prohibited traffic methods are
            not accepted. Obtain offer approval before promoting campaigns.
          </p>

          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-7 py-4 font-bold text-slate-950 hover:bg-cyan-300"
          >
            Apply to Join
            <MousePointerClick size={19} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-8 text-center text-sm text-slate-500">
        <p>© {new Date().getFullYear()} UpNetwork CPA</p>

        <div className="mt-3 flex flex-wrap justify-center gap-5">
          <Link href="/" className="hover:text-white">
            Home
          </Link>
          <Link href="/signup" className="hover:text-white">
            Register
          </Link>
          <Link href="/login" className="hover:text-white">
            Login
          </Link>
        </div>
      </footer>
    </main>
  );
}
