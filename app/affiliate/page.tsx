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
      window.setTimeout(() => setCopied(false), 2500);
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
      <>
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
          <div className="rounded-2xl border border-slate-200 bg
