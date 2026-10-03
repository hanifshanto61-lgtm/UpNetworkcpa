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
  const [copied, setCopied] = useState(false);

  async function copySmartLink() {
    try {
      await navigator.clipboard.writeText(SMART_LINK);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("লিংকটি কপি করুন:", SMART_LINK);
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

  function renderDashboard() {
    return (
      <div>
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-slate-900">
            Welcome to your dashboard!
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Track your performance, manage offers and monitor your earnings.
          </p>
        </div>

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
              <p className="mt-2 text-xs text-slate-500">{stat.note}</p>
            </div>
          ))}
        </div>

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
            <h3 className="text-lg font-bold text-slate-900">Quick Actions</h3>
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
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <span className="text-xl">{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderTrackingLinks() {
    return (
      <div>
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-slate-900">
            Tracking Links
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Copy your Smart Link and use it to promote offers.
          </p>
        </div>

        <div className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h4 className="text-lg font-bold text-slate-900">Your Smart Link</h4>
          <p className="mt-2 text-sm text-slate-500">
            Use this link for your affiliate promotions.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              readOnly
              value={SMART_LINK}
              className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
              onFocus={(event) => event.currentTarget.select()}
            />
            <button
              type="button"
              onClick={copySmartLink}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Note: This is the same Smart Link for all affiliates. Individual
            conversion attribution depends on the tracking system.
          </p>
        </div>
      </div>
    );
  }

  function renderOtherPage() {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h3 className="text-2xl font-bold text-slate-900">{activePage}</h3>
        <p className="mt-3 text-sm text-slate-500">
          This section is not connected yet. It will be available after setup.
        </p>
      </div>
    );
  }

  function renderPageContent() {
    if (activePage === "Dashboard") return renderDashboard();
    if (activePage === "Tracking Links") return renderTrackingLinks();
    return renderOtherPage();
  }

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <aside className="hidden w-64 shrink-0 flex-col bg-slate-900 text-white md:flex">
        <div className="border-b border-slate-700 px-6 py-6">
          <h1 className="text-xl font-extrabold">UP Network</h1>
          <p className="mt-1 text-xs text-slate-400">Affiliate Panel</p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5">
          {menu.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setActivePage(item.label)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                activePage === item.label
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span className="w-5 text-center text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="border-t border-slate-700 p-4">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {activePage}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Welcome to your affiliate account
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 md:hidden"
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </header>

        <main className="p-5 pb-24 md:p-8">
          {renderPageContent()}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-10 grid grid-cols-4 border-t border-slate-200 bg-white md:hidden">
          {menu.slice(0, 4).map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setActivePage(item.label)}
              className={`flex flex-col items-center gap-1 px-2 py-3 text-xs font-medium ${
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
