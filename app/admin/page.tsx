"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAIL = "islamhanif122@gmail.com";

const stats = [
  {
    label: "Total Clicks",
    value: "0",
    icon: "↗",
    note: "All tracked clicks",
  },
  {
    label: "Conversions",
    value: "0",
    icon: "✓",
    note: "Confirmed conversions",
  },
  {
    label: "Revenue",
    value: "$0.00",
    icon: "$",
    note: "Total advertiser revenue",
  },
  {
    label: "Payout",
    value: "$0.00",
    icon: "◈",
    note: "Affiliate payouts",
  },
];

const menu = [
  ["Dashboard", "⌂"],
  ["Offers & Links", "▣"],
  ["Clicks", "↗"],
  ["Conversions", "✓"],
  ["Affiliates", "♙"],
  ["Postbacks", "↻"],
  ["Reports", "▤"],
  ["Settings", "⚙"],
];

export default function AdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      if (!supabase) {
        router.replace("/login");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      if (
        session.user.email?.toLowerCase() !==
        ADMIN_EMAIL.toLowerCase()
      ) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      setChecking(false);
    }

    checkAdmin();
  }, [router]);

  async function handleLogout() {
    if (supabase) {
      await supabase.auth.signOut();
    }

    router.replace("/login");
  }

  if (checking) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-blue-500" />
          <p className="text-sm text-slate-300">
            Checking authentication...
          </p>
        </div>
      </main>
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
              <h1 className="font-bold">
                UpNetwork Cpa
              </h1>

              <p className="text-xs text-slate-400">
                Admin Panel
              </p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            {menu.map(([label, icon], index) => (
              <button
                key={label}
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
              onClick={handleLogout}
              className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:bg-red-500/10 hover:text-red-300"
            >
              ↪ Sign out
            </button>
          </div>
        </aside>

        {/* Main Area */}
        <section className="min-w-0 flex-1">

          {/* Header */}
          <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">

            <div>
              <h2 className="text-xl font-bold sm:text-2xl">
                Dashboard
              </h2>

              <p className="text-xs text-slate-500 sm:text-sm">
                Monitor your CPA network performance
              </p>
            </div>

            <div className="flex items-center gap-3">

              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold">
                  Administrator
                </p>

                <p className="text-xs text-slate-500">
                  {ADMIN_EMAIL}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                A
              </div>

            </div>
          </header>

          {/* Dashboard Content */}
          <div className="p-5 sm:p-8">

            {/* Welcome Banner */}
            <div className="mb-7 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white shadow-lg">

              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">

                <div>
                  <p className="mb-1 text-sm font-medium text-blue-100">
                    Welcome to UpNetwork Cpa
                  </p>

                  <h3 className="text-2xl font-extrabold sm:text-3xl">
                    Your network control center
                  </h3>

                  <p className="mt-2 max-w-2xl text-sm text-blue-100">
                    Manage offers, tracking links, affiliates,
                    conversions, postbacks and reports from one place.
                  </p>
                </div>

                <button
                  onClick={() => router.push("/admin/offers")}
                  className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-md transition hover:bg-blue-50"
                >
                  + Add New Offer
                </button>

              </div>
            </div>

            {/* Statistics */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols
