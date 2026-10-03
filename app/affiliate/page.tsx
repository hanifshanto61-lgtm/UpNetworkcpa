"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const stats = [
  {
    label: "Total Clicks",
    value: "0",
    icon: "↗",
    note: "Your tracked clicks",
  },
  {
    label: "Conversions",
    value: "0",
    icon: "✓",
    note: "Confirmed conversions",
  },
  {
    label: "Earnings",
    value: "$0.00",
    icon: "$",
    note: "Total earnings",
  },
  {
    label: "Pending Payout",
    value: "$0.00",
    icon: "◈",
    note: "Available for payout",
  },
];

const menu = [
  ["Dashboard", "⌂"],
  ["Offers", "▣"],
  ["Tracking Links", "↗"],
  ["Conversions", "✓"],
  ["Earnings", "$"],
  ["Payouts", "◈"],
  ["Reports", "▤"],
  ["Profile", "♙"],
];

export default function AffiliatePage() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);

    if (supabase) {
      await supabase.auth.signOut();
    }

    router.replace("/login");
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
              <h1 className="font-bold">
                UpNetwork CPA
              </h1>

              <p className="text-xs text-slate-400">
                Affiliate Dashboard
              </p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            {menu.map(([label, icon], index) => (
              <button
                key={label}
                type="button"
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                  index === 0
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="w-5 text-center text-lg">
                  {icon}
                </span>

                {label}
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
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-blue-600">
                  UpNetwork CPA
                </span>

                <span className="text-slate-300">
                  /
                </span>

                <h2 className="text-xl font-bold sm:text-2xl">
                  Affiliate Dashboard
                </h2>
              </div>

              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Manage your offers, tracking links and earnings
              </p>
            </div>

            <div className="flex items-center gap-3">

              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold">
                  Affiliate
                </p>
