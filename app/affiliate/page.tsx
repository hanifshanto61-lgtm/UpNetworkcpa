"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const menu = [
  { label: "Dashboard", icon: "⌂" },
  { label: "Offers", icon: "▣" },
  { label: "Tracking Links", icon: "↗" },
  { label: "Conversions", icon: "✓" },
  { label: "Earnings", icon: "$" },
  { label: "Payouts", icon: "◈" },
  { label: "Reports", icon: "▤" },
  { label: "Profile", icon: "♙" },
];

const stats = [
  {
    label: "Total Clicks",
    value: "0",
    icon: "↗",
    note: "Your tracked clicks",
    color: "bg-blue-50 text-blue-600",
  },
  {
    label: "Conversions",
    value: "0",
    icon: "✓",
    note: "Confirmed conversions",
    color: "bg-green-50 text-green-600",
  },
  {
    label: "Earnings",
    value: "$0.00",
    icon: "$",
    note: "Total earnings",
    color: "bg-purple-50 text-purple-600",
  },
  {
    label: "Pending Payout",
    value: "$0.00",
    icon: "◈",
    note: "Available for payout",
    color: "bg-orange-50 text-orange-600",
  },
];

export default function AffiliatePage() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [activePage, setActivePage] = useState("Dashboard");

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

  function renderPageContent() {
    if (activePage === "Dashboard") {
      return (
        <>
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-slate-900">
              Welcome to your dashboard!
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Track your performance, manage offers and monitor your earnings.
            </p>
          </div>

          {/* Statistics */}
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">
                    {stat.label}
                  </p>
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl font-bold ${stat.color}`}
                  >
                    {stat.icon}
                  </div>
                </div>

                <h4 className="mt-5 text-3xl font-extrabold text-slate-900">
                  {stat.value}
                </h4>

                <p className="mt-2 text-xs text-slate-500">
                  {stat.note}
                </p>
              </div>
            ))}
          </div>

          {/* Dashboard panels */}
          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">
                  Performance Overview
                </h3>
                <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs text-slate-500">
                  Last 30 days
                </span>
              </div>

              <div className="mt-8 flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                <span className="text-4xl text-slate-300">▤</span>
                <p className="mt-3 text-sm font-medium text-slate-500">
                  No performance data yet
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Your activity will appear here.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">
                Quick Actions
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Quickly access your affiliate tools.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Browse Offers", page: "Offers", icon: "▣" },
                  { label: "Tracking Links", page: "Tracking Links", icon: "↗" },
                  { label: "View Conversions", page: "Conversions", icon: "✓" },
                  { label: "View Earnings", page: "Earnings", icon: "$" },
                ].map((action) => (
                  <button
                    key={action.page}
                    type="button"
                    onClick={() => setActivePage(action.page)}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-lg font-bold text-blue-600">
                      {action.icon}
                    </span>
                    <span className="text-sm font-semibold text-slate-700">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recent activity */}
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">
              Recent Activity
            </h3>

            <div className="mt-6 flex flex-col items-center justify-center py-10 text-center">
              <span className="text-4xl text-slate-300">◷</span>
              <p className="mt-3 text-sm font-semibold text-slate-600">
                No recent activity
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Your latest affiliate activities will appear here.
              </p>
            </div>
          </div>
        </>
      );
    }

    const pageDescriptions: Record<string, string> = {
      Offers: "Browse available affiliate campaigns and offers.",
      "Tracking Links": "Create and manage your affiliate tracking links.",
      Conversions: "Monitor your leads and confirmed conversions.",
      Earnings: "Review your commissions and earnings.",
      Payouts: "Manage your payout information and payment history.",
      Reports: "Review your affiliate performance reports.",
      Profile: "Manage your affiliate account information.",
    };

    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl font-bold text-blue-600">
          {menu.find((item) => item.label === activePage)?.icon}
        </div>

        <h3 className="mt-5 text-2xl font-bold text-slate-900">
          {activePage}
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          {pageDescriptions[activePage]}
        </p>

        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="font-semibold text-slate-600">
            This section is ready for setup
          </p>
          <p className="mt-2 text-sm text-slate-500">
            The page layout is prepared. Its data and features will be connected
            when the required database tables and functions are set up.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActivePage("Dashboard")}
          className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 bg-slate-950 text-white lg:flex lg:flex-col">
          <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-black">
              UP
            </div>

            <div>
              <h1 className="font-bold">UpNetwork CPA</h1>
              <p className="text-xs text-slate-400">Affiliate Dashboard</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            {menu.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setActivePage(item.label)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                  activePage === item.label
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="w-5 text-center text-lg">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="border-t border-white/10 p-4">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
            >
              ↪ {loggingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <section className="min-w-0 flex-1">
          {/* Header */}
          <header className="flex min-h-20 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold text-blue-600">
                  UpNetwork CPA
                </span>

                <span className="text-slate-300">/</span>

                <h2 className="text-xl font-bold sm:text-2xl">
                  {activePage}
                </h2>
              </div>

              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Manage your offers, tracking links and earnings
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold">Affiliate</p>
                <p className="text-xs text-slate-500">Affiliate Account</p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                A
              </div>
            </div>
          </header>

          {/* Mobile Navigation */}
          <div className="overflow-x-auto border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
            <div className="flex min-w-max gap-2">
              {menu.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setActivePage(item.label)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    activePage === item.label
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span className="mr-1">{item.icon}</span>
                  {item.label}
                </button>
              ))}

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-50"
              >
                {loggingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </div>

          {/* Page Content */}
          <div className="p-5 sm:p-8">
            {renderPageContent()}
          </div>

          {/* Footer */}
          <footer className="border-t border-slate-200 bg-white px-5 py-5 text-center text-xs text-slate-500 sm:px-8">
            © {new Date().getFullYear()} UpNetwork CPA. All rights reserved.
          </footer>
        </section>
      </div>
    </main>
  );
}
