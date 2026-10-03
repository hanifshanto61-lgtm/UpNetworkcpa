"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const SMART_LINK =
  "https://onlyhotdates.com/dTmGzfkC?aid=fzkbxfzxzk&kid=hxxhxzhdpdk";

const menu = [
  { label: "Dashboard", icon: "⌂" },
  { label: "Offers", icon: "▣" },
  { label: "Tracking Links", icon: "↗" },
  { label: "Statistics", icon: "▤" },
  { label: "Conversions", icon: "✓" },
  { label: "Earnings", icon: "$" },
  { label: "Payouts", icon: "◈" },
  { label: "Reports", icon: "▥" },
  { label: "Profile", icon: "♙" },
];

const stats = [
  {
    title: "Total Clicks",
    value: "0",
    change: "No data yet",
    icon: "↗",
    box: "bg-blue-50 text-blue-600",
  },
  {
    title: "Conversions",
    value: "0",
    change: "No conversions yet",
    icon: "✓",
    box: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "Earnings",
    value: "$0.00",
    change: "Current earnings",
    icon: "$",
    box: "bg-violet-50 text-violet-600",
  },
  {
    title: "EPC",
    value: "$0.00",
    change: "Earnings per click",
    icon: "◉",
    box: "bg-orange-50 text-orange-600",
  },
];

export default function AffiliatePage() {
  const router = useRouter();

  const [activePage, setActivePage] = useState("Dashboard");
  const [copied, setCopied] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [period, setPeriod] = useState("Last 30 days");

  async function copySmartLink() {
    try {
      await navigator.clipboard.writeText(SMART_LINK);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      window.prompt("Copy your Smart Link:", SMART_LINK);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);

    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      router.replace("/login");
    }
  }

  function pageTitle() {
    return activePage === "Dashboard"
      ? "Affiliate Dashboard"
      : activePage;
  }

  function renderDashboard() {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome back 👋
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Monitor your affiliate performance and earnings.
            </p>
          </div>

          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500"
          >
            <option>Today</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  {stat.title}
                </p>

                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl font-bold ${stat.box}`}
                >
                  {stat.icon}
                </div>
              </div>

              <div className="mt-5">
                <p className="text-3xl font-extrabold tracking-tight text-slate-900">
                  {stat.value}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  {stat.change}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Performance
                </h2>
                <p className="text-sm text-slate-500">
                  Clicks and conversions
                </p>
              </div>

              <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
                {period}
              </span>
            </div>

            <div className="mt-6 flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl text-slate-300 shadow-sm">
                  ▥
                </div>

                <p className="mt-4 font-semibold text-slate-500">
                  No performance data
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Your clicks and conversions will appear here.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Quick Stats
            </h2>

            <div className="mt-6 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Conversion Rate
                </span>
                <span className="font-bold text-slate-900">0%</span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-0 rounded-full bg-blue-600" />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Pending Earnings
                </span>
                <span className="font-bold text-slate-900">
                  $0.00
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Available Payout
                </span>
                <span className="font-bold text-slate-900">
                  $0.00
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Your Smart Link
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Use this link to promote your affiliate traffic.
              </p>
            </div>

            <button
              type="button"
              onClick={copySmartLink}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              {copied ? "Copied!" : "Copy Smart Link"}
            </button>
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="break-all text-sm text-slate-600">
              {SMART_LINK}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Quick Actions
          </h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Offers", "▣"],
              ["Tracking Links", "↗"],
              ["Statistics", "▤"],
              ["Earnings", "$"],
            ].map(([label, icon]) => (
              <button
                key={label}
                type="button"
                onClick={() => setActivePage(label)}
                className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"
              >
                <span className="text-xl">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderOffers() {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Offers
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Available affiliate offers will appear here.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600">
            ▣
          </div>

          <h2 className="mt-4 text-lg font-bold text-slate-900">
            No offers available yet
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Offers will be displayed here when they are added.
          </p>
        </div>
      </div>
    );
  }

  function renderTrackingLinks() {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Tracking Links
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage your affiliate tracking links.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-slate-900">
                Smart Link
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Your current promotional link
              </p>
            </div>

            <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600">
              Active
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-3 md:flex-row">
            <input
              readOnly
              value={SMART_LINK}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 outline-none"
            />

            <button
              type="button"
              onClick={copySmartLink}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderTablePage(
    title: string,
    description: string,
    icon: string
  ) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {title}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-lg">
                {icon}
              </div>

              <div>
                <h2 className="font-bold text-slate-900">
                  {title}
                </h2>

                <p className="text-xs text-slate-500">
                  No records available
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-16 text-center">
            <p className="font-semibold text-slate-500">
              No data available
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Data will appear here once your account starts generating activity.
            </p>
          </div>
        </div>
      </div>
    );
  }

  function renderProfile() {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Profile
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage your affiliate account information.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-600">
              A
            </div>

            <div>
              <h2 className="font-bold text-slate-900">
                Affiliate Account
              </h2>

              <p className="text-sm text-slate-500">
                UP Network Affiliate
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-500">
                Account Status
              </label>

              <div className="mt-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-600">
                Active
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500">
                Account Type
              </label>

              <div className="mt-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                Affiliate
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderPage() {
    if (activePage === "Dashboard") {
      return renderDashboard();
    }

    if (activePage === "Offers") {
      return renderOffers();
    }

    if (activePage === "Tracking Links") {
      return renderTrackingLinks();
    }

    if (activePage === "Statistics") {
      return renderTablePage(
        "Statistics",
        "Analyze your affiliate traffic and performance.",
        "▤"
      );
    }

    if (activePage === "Conversions") {
      return renderTablePage(
        "Conversions",
        "View your tracked conversions.",
        "✓"
      );
    }

    if (activePage === "Earnings") {
      return renderTablePage(
        "Earnings",
        "Track your affiliate earnings.",
        "$"
      );
    }

    if (activePage === "Payouts") {
      return renderTablePage(
        "Payouts",
        "Manage your affiliate payouts.",
        "◈"
      );
    }

    if (activePage === "Reports") {
      return renderTablePage(
        "Reports",
        "View detailed affiliate reports.",
        "▥"
      );
    }

    if (activePage === "Profile") {
      return renderProfile();
    }

    return renderDashboard();
  }

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-slate-950 text-white md:flex">
        <div className="border-b border-slate-800 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-extrabold">
              UP
            </div>

            <div>
              <h1 className="font-extrabold">UP Network</h1>
              <p className="text-xs text-slate-400">
                Affiliate Platform
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 pt-5">
          <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Main Menu
          </p>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {menu.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setActivePage(item.label)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                activePage === item.label
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <span className="flex w-5 justify-center text-lg">
                {item.icon}
              </span>

              {item.label}
            </button>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-400 transition hover:bg-slate-900 hover:text-white disabled:opacity-50"
          >
            <span>⇥</span>
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="min-w-0 flex-1">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-[76px] items-center justify-between px-5 md:px-8">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {pageTitle()}
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                UP Network Affiliate Panel
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-800">
                  Affiliate
                </p>

                <p className="text-xs text-slate-500">
                  Active account
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-600">
                A
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="hidden rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 lg:block"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-5 pb-24 md:p-8 md:pb-10">
          {renderPage()}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white md:hidden">
          {menu.slice(0, 4).map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setActivePage(item.label)}
              className={`flex flex-col items-center gap-1 px-1 py-3 text-[10px] font-semibold ${
                activePage === item.label
                  ? "text-blue-600"
                  : "text-slate-500"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
