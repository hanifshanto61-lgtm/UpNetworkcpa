
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  DollarSign,
  Globe2,
  Headphones,
  Link2,
  Menu,
  MousePointerClick,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Target,
    title: "CPA Offers",
    description:
      "Discover performance-based offers and find opportunities that match your traffic.",
    color: "from-blue-500 to-cyan-400",
  },
  {
    icon: BarChart3,
    title: "Real-Time Statistics",
    description:
      "Monitor clicks, conversions, and earnings from your affiliate dashboard.",
    color: "from-violet-500 to-purple-400",
  },
  {
    icon: Wallet,
    title: "Earnings & Payments",
    description:
      "Keep track of your commissions, payment history, and available earnings.",
    color: "from-emerald-500 to-teal-400",
  },
  {
    icon: Link2,
    title: "Smart Links",
    description:
      "Manage tracking links and connect your traffic to affiliate campaigns.",
    color: "from-orange-500 to-amber-400",
  },
  {
    icon: Users,
    title: "Referral Program",
    description:
      "Invite other affiliates and explore additional earning opportunities.",
    color: "from-pink-500 to-rose-400",
  },
  {
    icon: Headphones,
    title: "Affiliate Support",
    description:
      "Connect with our affiliate managers when you need assistance.",
    color: "from-indigo-500 to-blue-400",
  },
];

const steps = [
  {
    number: "01",
    title: "Create Your Account",
    description:
      "Register as an affiliate and access your account.",
  },
  {
    number: "02",
    title: "Choose Your Offers",
    description:
      "Explore available campaigns and select suitable offers.",
  },
  {
    number: "03",
    title: "Promote & Track",
    description:
      "Share your tracking links and monitor your campaign performance.",
  },
  {
    number: "04",
    title: "Grow Your Earnings",
    description:
      "Track approved conversions and manage your earnings.",
  },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="min-h-screen overflow-hidden bg-[#080d1c] text-white">
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
        body {
          margin: 0;
        }
      `}</style>

      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#080d1c]/95 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/20">
              <TrendingUp size={25} />
            </div>
            <div>
              <div className="text-xl font-black tracking-tight">
                UpNetwork <span className="text-cyan-400">CPA</span>
              </div>
              <div className="text-[10px] tracking-[0.18em] text-slate-400">
                BEST CPA NETWORK
              </div>
            </div>
          </Link>

          <div className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
            <a href="#home" className="hover:text-cyan-400">Home</a>
            <a href="#features" className="hover:text-cyan-400">Features</a>
            <a href="#how-it-works" className="hover:text-cyan-400">How It Works</a>
            <a href="#about" className="hover:text-cyan-400">About Us</a>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login"
              className="rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold hover:bg-white/10"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-2.5 text-sm font-bold shadow-lg shadow-blue-600/20 hover:opacity-90"
            >
              Sign Up
            </Link>
          </div>

          <button
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg border border-white/15 p-2 md:hidden"
          >
            {menuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </nav>

        {menuOpen && (
          <div className="space-y-1 border-t border-white/10 bg-[#10182c] px-5 py-4 md:hidden">
            {[
              ["Home", "#home"],
              ["Features", "#features"],
              ["How It Works", "#how-it-works"],
              ["About Us", "#about"],
              ["Login", "/login"],
              ["Sign Up", "/signup"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-4 py-3 text-sm text-slate-200 hover:bg-white/10"
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Hero */}
      <section
        id="home"
        className="relative px-5 pb-24 pt-24 lg:px-8 lg:pb-32 lg:pt-32"
      >
        <div className="pointer-events-none absolute left-[-160px] top-10 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="pointer-events-none absolute right-[-120px] top-24 h-96 w-96 rounded-full bg-purple-600/20 blur-3xl" />

        <div className="relative mx-auto max-w-5xl text-center">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-5 py-2 text-xs font-semibold text-cyan-300 sm:text-sm">
            <Zap size={15} />
            Welcome to UpNetwork CPA
          </div>

          <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            Grow Your Traffic.
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
              Maximize Your Potential.
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">
            Your performance marketing journey starts here.
            Explore CPA offers, track your results, manage
            your earnings, and grow with UpNetwork CPA.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-8 py-4 font-bold shadow-xl shadow-blue-600/20 transition hover:scale-105"
            >
              Become an Affiliate
              <ArrowRight size={19} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-8 py-4 font-bold transition hover:bg-white/10"
            >
              Affiliate Login
              <ChevronRight size={19} />
            </Link>
          </div>

          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { icon: Globe2, label: "Global Opportunities" },
              { icon: ShieldCheck, label: "Secure Dashboard" },
              { icon: MousePointerClick, label: "Performance Tracking" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm font-medium text-slate-200"
              >
                <item.icon size={21} className="text-cyan-400" />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-[#0c1428] px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-cyan-400">
              Our Platform
            </p>
            <h2 className="text-3xl font-black sm:text-5xl">
              Everything You Need to Grow
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-slate-400">
              Powerful affiliate tools in one convenient platform.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-white/10 bg-[#111d35] p-7 transition duration-300 hover:-translate-y-1 hover:border-cyan-500/40"
              >
                <div
                  className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color}`}
                >
                  <feature.icon size={27} />
                </div>
                <h3 className="mb-3 text-xl font-bold">
                  {feature.title}
                </h3>
                <p className="leading-7 text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="px-5 py-24 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-cyan-400">
              Getting Started
            </p>
            <h2 className="text-3xl font-black sm:text-5xl">
              How It Works
            </h2>
            <p className="mt-5 text-slate-400">
              Start your affiliate journey in four simple steps.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border border-white/10 bg-white/5 p-7"
              >
                <div className="mb-5 text-5xl font-black text-cyan-400/50">
                  {step.number}
                </div>
                <h3 className="mb-3 text-xl font-bold">
                  {step.title}
                </h3>
                <p className="leading-7 text-slate-400">
                  {step.description}
                </p>
                <CheckCircle2 className="mt-6 text-emerald-400" size={22} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="bg-[#0c1428] px-5 py-24 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-cyan-400">
              About UpNetwork CPA
            </p>
            <h2 className="text-3xl font-black leading-tight sm:text-5xl">
              Built for Affiliate
              <span className="text-cyan-400"> Growth</span>
            </h2>
            <p className="mt-6 leading-8 text-slate-400">
              UpNetwork CPA is an affiliate marketing platform
              designed to connect publishers with performance
              marketing opportunities.
            </p>
            <p className="mt-4 leading-8 text-slate-400">
              Our goal is to provide an organized experience
              for offer discovery, click tracking, conversion
              reporting, referrals, and earnings management.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 font-bold hover:bg-blue-500"
            >
              Join Our Network
              <ArrowRight size={18} />
            </Link>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#172d57] to-[#171334] p-7 shadow-2xl sm:p-10">
            <div className="mb-8 flex items-center gap-3">
              <div className="rounded-xl bg-blue-500/20 p-3">
                <BarChart3 className="text-cyan-400" size={27} />
              </div>
              <div>
                <h3 className="font-bold">Affiliate Dashboard</h3>
                <p className="text-xs text-slate-400">
                  Your performance overview
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: MousePointerClick, label: "Clicks" },
                { icon: Target, label: "Conversions" },
                { icon: DollarSign, label: "Earnings" },
                { icon: Users, label: "Referrals" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-white/10 bg-white/5 p-5"
                >
                  <item.icon size={23} className="mb-4 text-cyan-400" />
                  <p className="text-sm font-semibold">{item.label}</p>
                  <div className="mt-4 h-2 w-full rounded-full bg-white/10">
                    <div className="h-2 w-1/2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 text-center text-xs text-slate-400">
              Dashboard feature preview — not live statistics
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-blue-400/20 bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-800 px-6 py-16 text-center sm:px-12">
          <h2 className="text-3xl font-black sm:text-5xl">
            Ready to Get Started?
          </h2>
          <p className="mx-auto mt-5 max-w-xl leading-7 text-blue-100">
            Join UpNetwork CPA and start exploring affiliate
            marketing opportunities today.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-bold text-blue-800 transition hover:bg-blue-50"
          >
            Create Free Account
            <ArrowRight size={19} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#060a15] px-5 py-12 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-3">
          <div>
            <h3 className="text-2xl font-black">
              UpNetwork <span className="text-cyan-400">CPA</span>
            </h3>
            <p className="mt-4 max-w-sm leading-7 text-slate-400">
              Your Trusted CPA Network. Explore opportunities,
              manage campaigns, and grow your affiliate business.
            </p>
          </div>

          <div>
            <h4 className="mb-5 font-bold">Quick Links</h4>
            <div className="flex flex-col gap-3 text-sm text-slate-400">
              <Link href="/" className="hover:text-white">Home</Link>
              <Link href="/login" className="hover:text-white">Affiliate Login</Link>
              <Link href="/signup" className="hover:text-white">Register</Link>
              <Link href="/affiliate" className="hover:text-white">Dashboard</Link>
            </div>
          </div>

          <div>
            <h4 className="mb-5 font-bold">Our Platform</h4>
            <div className="flex flex-col gap-3 text-sm text-slate-400">
              <a href="#features" className="hover:text-white">Features</a>
              <a href="#how-it-works" className="hover:text-white">How It Works</a>
              <a href="#about" className="hover:text-white">About Us</a>
              <a href="mailto:support@upnetworkcpa.com" className="hover:text-white">
                support@upnetworkcpa.com
              </a>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-7xl border-t border-white/10 pt-7 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} UpNetwork CPA.
          All rights reserved.
        </div>
      </footer>
    </main>
  );
}
