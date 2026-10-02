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
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
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
              <h1 className="font-bold">UpNetwork Cpa</h1>
              <p className="text-xs text-slate-400">
                Admin Panel
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
              className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:bg-red-500/10 hover:text-red-300"
            >
              ↪ Sign out
            </button>
          </div>
        </aside>

        {/* Main Content */}
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

          {/* Dashboard */}
          <div className="p-5 sm:p-8">

            {/* Welcome */}
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
                  type="button"
                  onClick={() => router.push("/admin/offers")}
                  className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-md transition hover:bg-blue-50"
                >
                  + Add New Offer
                </button>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        {stat.label}
                      </p>

                      <p className="mt-2 text-3xl font-extrabold tracking-tight">
                        {stat.value}
                      </p>
                    </div>

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-lg font-bold text-blue-600">
                      {stat.icon}
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-slate-400">
                    {stat.note}
                  </p>
                </div>
              ))}
            </div>

            {/* Overview */}
            <div className="mt-6 grid gap-6 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">
                      Network Overview
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Performance data will appear here after
                      tracking is connected.
                    </p>
                  </div>

                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    Waiting for data
                  </span>
                </div>

                <div className="mt-6 flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                  <div className="text-center">
                    <div className="text-4xl">▥</div>

                    <p className="mt-3 font-semibold text-slate-700">
                      No tracking data yet
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      Add an offer and generate your first tracking link.
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-bold">
                  Quick Actions
                </h3>

                <div className="mt-5 space-y-3">

                  <button
                    type="button"
                    onClick={() => router.push("/admin/offers")}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
                  >
                    <span className="text-xl">＋</span>

                    <span>
                      <b className="block text-sm">
                        Create Offer
                      </b>

                      <small className="text-slate-500">
                        Add a new CPA offer
                      </small>
                    </span>
                  </button>

                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
                  >
                    <span className="text-xl">↗</span>

                    <span>
                      <b className="block text-sm">
                        Tracking Links
                      </b>

                      <small className="text-slate-500">
                        Manage generated links
                      </small>
                    </span>
                  </button>

                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
                  >
                    <span className="text-xl">▤</span>

                    <span>
                      <b className="block text-sm">
                        View Reports
                      </b>

                      <small className="text-slate-500">
                        Analyze network results
                      </small>
                    </span>
                  </button>

                </div>
              </div>
            </div>

            {/* Modules */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-bold">
                    CPA Network Modules
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    The panel is ready to be connected to your Supabase data.
                  </p>
                </div>

                <span className="text-xs font-semibold text-emerald-600">
                  ● Admin access active
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold">
                    Offers & Links
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Create offers and tracking URLs
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold">
                    Conversions
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Track approved conversions
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold">
                    Affiliates
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Manage publishers
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold">
                    Postbacks
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Receive conversion callbacks
                  </p>
                </div>

              </div>
            </div>

          </div>
        </section>
      </div>
    </main>
  );
                        }
