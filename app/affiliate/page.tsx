"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type MenuKey =
  | "dashboard"
  | "offers"
  | "tracking"
  | "statistics"
  | "conversions"
  | "earnings"
  | "payouts"
  | "reports"
  | "profile";

type ClickRow = {
  click_id: string | null;
  affiliate_id: string | null;
  smartlink_id: string | null;
  country: string | null;
  device: string | null;
  browser: string | null;
  referer: string | null;
  created_at: string | null;
};

type ClickStats = {
  today: number;
  yesterday: number;
  month: number;
  total: number;
  countries: { name: string; clicks: number }[];
  devices: { name: string; clicks: number; percent: number }[];
};

const emptyStats: ClickStats = {
  today: 0,
  yesterday: 0,
  month: 0,
  total: 0,
  countries: [],
  devices: [],
};

export default function AffiliatePage() {
  const router = useRouter();

  const [activeMenu, setActiveMenu] = useState<MenuKey>("dashboard");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState<ClickStats>(emptyStats);

  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    country: "",
    affiliateId: "",
  });

  const [copied, setCopied] = useState(false);

  const smartLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/track?aid=${encodeURIComponent(
          profile.affiliateId
        )}&sl=default-smartlink`
      : "/api/track";

  const manager = {
    username: "@tusarislam123",
    name: "Personal Manager",
    status: "Available",
  };

  useEffect(() => {
    async function loadProfile() {
      if (!supabase) {
        setProfileLoading(false);
        return;
      }

      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (user) {
        setProfile({
          fullName:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            "",
          email: user.email || "",
          phone: user.user_metadata?.phone || "",
          country: user.user_metadata?.country || "",
          affiliateId:
            user.user_metadata?.affiliate_id ||
            user.id.slice(0, 8).toUpperCase(),
        });
      }

      setProfileLoading(false);
    }

    loadProfile();
  }, []);

  useEffect(() => {
    if (!profile.affiliateId || !supabase) return;

    loadClickStats(profile.affiliateId);
  }, [profile.affiliateId]);

  async function loadClickStats(affiliateId: string) {
    if (!supabase) return;

    setStatsLoading(true);

    const { data, error } = await supabase
      .from("clicks")
      .select(
        "click_id, affiliate_id, smartlink_id, country, device, browser, referer, created_at"
      )
      .eq("affiliate_id", affiliateId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Click statistics error:", error);
      setStats(emptyStats);
      setStatsLoading(false);
      return;
    }

    const rows = (data || []) as ClickRow[];

    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const today = rows.filter((row) => {
      if (!row.created_at) return false;
      return new Date(row.created_at) >= todayStart;
    }).length;

    const yesterday = rows.filter((row) => {
      if (!row.created_at) return false;

      const date = new Date(row.created_at);

      return date >= yesterdayStart && date < todayStart;
    }).length;

    const month = rows.filter((row) => {
      if (!row.created_at) return false;
      return new Date(row.created_at) >= monthStart;
    }).length;

    const countryMap: Record<string, number> = {};

    rows.forEach((row) => {
      const country = row.country?.trim() || "Unknown";

      countryMap[country] = (countryMap[country] || 0) + 1;
    });

    const countries = Object.entries(countryMap)
      .map(([name, clicks]) => ({
        name,
        clicks,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);

    const deviceMap: Record<string, number> = {};

    rows.forEach((row) => {
      const device = row.device?.trim() || "Unknown";

      deviceMap[device] = (deviceMap[device] || 0) + 1;
    });

    const devices = Object.entries(deviceMap)
      .map(([name, clicks]) => ({
        name,
        clicks,
        percent:
          rows.length > 0
            ? Math.round((clicks / rows.length) * 100)
            : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks);

    setStats({
      today,
      yesterday,
      month,
      total: rows.length,
      countries,
      devices,
    });

    setStatsLoading(false);
  }

  async function refreshStats() {
    if (!profile.affiliateId) return;

    await loadClickStats(profile.affiliateId);
  }

  async function logout() {
    if (supabase) {
      await supabase.auth.signOut();
    }

    router.push("/login");
  }

  async function saveProfile() {
    if (!supabase) return;

    setProfileSaving(true);
    setProfileMessage("");

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: profile.fullName,
        phone: profile.phone,
        country: profile.country,
        affiliate_id: profile.affiliateId,
      },
    });

    setProfileSaving(false);

    if (error) {
      setProfileMessage(error.message);
    } else {
      setProfileMessage("Profile updated successfully.");
    }
  }

  async function resetPassword() {
    if (!supabase || !profile.email) return;

    const { error } = await supabase.auth.resetPasswordForEmail(
      profile.email,
      {
        redirectTo: `${window.location.origin}/login`,
      }
    );

    if (error) {
      setProfileMessage(error.message);
    } else {
      setProfileMessage("Password reset email sent.");
    }
  }

  async function copySmartLink() {
    try {
      if (!profile.affiliateId) return;

      await navigator.clipboard.writeText(smartLink);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  }

  function openMenu(menu: MenuKey) {
    setActiveMenu(menu);
  }

  const menuItems: {
    key: MenuKey;
    label: string;
    icon: string;
  }[] = [
    { key: "dashboard", label: "Dashboard", icon: "⌂" },
    { key: "offers", label: "Offers", icon: "◈" },
    { key: "tracking", label: "Smartlinks", icon: "↗" },
    { key: "statistics", label: "Statistics", icon: "▥" },
    { key: "conversions", label: "Conversions", icon: "✓" },
    { key: "earnings", label: "Earnings", icon: "$" },
    { key: "payouts", label: "Payouts", icon: "▣" },
    { key: "reports", label: "Reports", icon: "▤" },
    { key: "profile", label: "Profile", icon: "♙" },
  ];

  const pageTitle =
    menuItems.find((item) => item.key === activeMenu)?.label ||
    "Dashboard";

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-800">
      <div className="flex min-h-screen">
        <aside className="hidden w-[250px] flex-shrink-0 border-r border-slate-200 bg-white lg:block">
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="flex h-[76px] items-center border-b border-slate-100 px-6">
              <div>
                <div className="text-2xl font-black tracking-tight text-slate-900">
                  UP<span className="text-blue-600"> Network</span>
                </div>

                <div className="text-[10px] font-semibold uppercase tracking-[3px] text-slate-400">
                  CPA Affiliate
                </div>
              </div>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-4">
              {menuItems.map((item) => {
                const active = activeMenu === item.key;

                return (
                  <button
                    key={item.key}
                    onClick={() => openMenu(item.key)}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                      active
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg text-base">
                      {item.icon}
                    </span>

                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="border-t border-slate-100 p-4">
              <button
                onClick={() => openMenu("profile")}
                className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-slate-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                  {(profile.fullName || profile.email || "A")
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-slate-800">
                    {profile.fullName || "Affiliate"}
                  </div>

                  <div className="truncate text-xs text-slate-400">
                    {profile.affiliateId || "Affiliate ID"}
                  </div>
                </div>
              </button>

              <button
                onClick={logout}
                className="mt-2 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-500 hover:bg-red-50"
              >
                ↪ Logout
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-8">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Affiliate Panel
              </div>

              <h1 className="text-xl font-black text-slate-900">
                {pageTitle}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <div className="text-sm font-bold text-slate-800">
                  {profile.fullName || "Affiliate"}
                </div>

                <div className="text-xs text-slate-400">
                  ID: {profile.affiliateId || "—"}
                </div>
              </div>

              <button
                onClick={() => openMenu("profile")}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 font-bold text-white shadow-md shadow-blue-100"
              >
                {(profile.fullName || profile.email || "A")
                  .charAt(0)
                  .toUpperCase()}
              </button>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] p-4 pb-24 md:p-8">
            {activeMenu === "dashboard" && (
              <div className="space-y-6">
                <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-xl shadow-blue-100 md:p-8">
                  <div className="max-w-3xl">
                    <div className="mb-2 text-sm font-semibold text-blue-100">
                      Welcome back 👋
                    </div>

                    <h2 className="text-2xl font-black md:text-3xl">
                      Welcome to UP Network
                    </h2>

                    <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 md:text-base">
                      Manage your Smartlinks, traffic, conversions and
                      earnings from one modern CPA affiliate dashboard.
                    </p>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => openMenu("tracking")}
                        className="mt-5 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-600 shadow-lg hover:bg-blue-50"
                      >
                        Get Smartlink →
                      </button>

                      <button
                        onClick={refreshStats}
                        disabled={statsLoading}
                        className="mt-5 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/20 disabled:opacity-60"
                      >
                        {statsLoading ? "Refreshing..." : "↻ Refresh Stats"}
                      </button>
                    </div>
                  </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    title="Today Clicks"
                    value={stats.today}
                    icon="👆"
                    subtitle="Today's traffic"
                  />

                  <StatCard
                    title="Yesterday"
                    value={stats.yesterday}
                    icon="📅"
                    subtitle="Yesterday clicks"
                  />

                  <StatCard
                    title="This Month"
                    value={stats.month}
                    icon="📈"
                    subtitle="Current month clicks"
                  />

                  <StatCard
                    title="Total Clicks"
                    value={stats.total}
                    icon="⚡"
                    subtitle="All-time traffic"
                  />
                </section>

                <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black text-slate-900">
                          Traffic Dynamic
                        </h3>

                        <p className="text-sm text-slate-400">
                          Your real click traffic
                        </p>
                      </div>

                      <span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600">
                        {statsLoading ? "Loading..." : "Live Data"}
                      </span>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <MiniMetric
                        title="Revenue"
                        value="$0.00"
                        icon="💰"
                      />

                      <MiniMetric
                        title="Clicks"
                        value={String(stats.total)}
                        icon="👆"
                      />
                    </div>

                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="text-sm font-black text-slate-700">
                          Click Overview
                        </div>

                        <div className="text-xs font-semibold text-slate-400">
                          Total: {stats.total}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <TrafficBox
                          label="Today"
                          value={stats.today}
                        />

                        <TrafficBox
                          label="Yesterday"
                          value={stats.yesterday}
                        />

                        <TrafficBox
                          label="Month"
                          value={stats.month}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-black text-slate-900">
                          Smartlink
                        </h3>

                        <p className="text-sm text-slate-400">
                          Your monetization link
                        </p>
                      </div>

                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-600">
                        Active
                      </span>
                    </div>

                    <div className="mt-5 rounded-xl bg-slate-50 p-4">
                      <div className="break-all text-xs leading-5 text-slate-500">
                        {smartLink}
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <div className="text-xs font-semibold text-blue-500">
                        Total Clicks
                      </div>

                      <div className="mt-1 text-2xl font-black text-blue-700">
                        {stats.total}
                      </div>
                    </div>

                    <button
                      onClick={copySmartLink}
                      disabled={!profile.affiliateId}
                      className="mt-4 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {copied ? "✓ Copied" : "Copy Smartlink"}
                    </button>

                    <button
                      onClick={() => openMenu("tracking")}
                      className="mt-2 w-full rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Manage Smartlinks
                    </button>
                  </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-black text-slate-900">
                          TOP-5 GEOs by Clicks
                        </h3>

                        <p className="text-sm text-slate-400">
                          Your top traffic countries
                        </p>
                      </div>

                      <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">
                        Top 5
                      </span>
                    </div>

                    {stats.countries.length === 0 ? (
                      <EmptyState message="No GEO data yet" />
                    ) : (
                      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                        <div className="grid grid-cols-2 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                          <div>Country</div>
                          <div className="text-right">Clicks</div>
                        </div>

                        {stats.countries.map((country, index) => (
                          <div
                            key={country.name}
                            className="grid grid-cols-2 border-t border-slate-100 px-4 py-3 text-sm"
                          >
                            <div className="font-semibold text-slate-700">
                              <span className="mr-2 text-xs text-slate-400">
                                #{index + 1}
                              </span>
                              {country.name}
                            </div>

                            <div className="text-right font-black text-slate-800">
                              {country.clicks}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">
                        Platform
                      </h3>

                      <p className="text-sm text-slate-400">
                        Traffic by device
                      </p>
                    </div>

                    {stats.devices.length === 0 ? (
                      <EmptyState message="No platform data yet" />
                    ) : (
                      <div className="mt-5 space-y-3">
                        {stats.devices.map((device) => (
                          <div
                            key={device.name}
                            className="rounded-xl border border-slate-200 p-4"
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-bold text-slate-700">
                                {device.name}
                              </div>

                              <div className="text-sm font-black text-slate-900">
                                {device.clicks}
                              </div>
                            </div>

                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-blue-600"
                                style={{
                                  width: `${device.percent}%`,
                                }}
                              />
                            </div>

                            <div className="mt-1 text-right text-[11px] font-semibold text-slate-400">
                              {device.percent}%
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                  <div className="flex flex-col gap-5 md:flex-row">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                      ⚡
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-slate-900">
                        What&apos;s new?
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        We&apos;re continuously improving UP Network to make
                        monetization easier and more convenient for you.
                      </p>

                      <div className="mt-5 grid gap-3 md:grid-cols-2">
                        <Feature
                          icon="💳"
                          title="Payment Request"
                          text="Request your affiliate payout directly from the dashboard."
                        />

                        <Feature
                          icon="🔄"
                          title="Postback Configuration"
                          text="Configure your tracking postback settings."
                        />

                        <Feature
                          icon="👥"
                          title="Referral Statistics"
                          text="Track your referral activity and performance."
                        />

                        <Feature
                          icon="⚡"
                          title="Smart Dashboard"
                          text="Manage your affiliate business from one place."
                        />
                      </div>

                      <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                        Need assistance? Contact your personal manager or
                        network support team.
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-xl font-black text-white">
                        T
                      </div>

                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Personal Manager
                        </div>

                        <div className="mt-1 text-lg font-black text-slate-900">
                          {manager.username}
                        </div>

                        <div className="mt-1 text-sm text-slate-400">
                          {manager.name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-green-50 px-3 py-2 text-xs font-bold text-green-600">
                        ● {manager.status}
                      </span>

                      <button
                        onClick={() =>
                          window.open(
                            "https://t.me/tusarislam123",
                            "_blank"
                          )
                        }
                        className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700"
                      >
                        Contact Manager
                      </button>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="mb-4 text-lg font-black text-slate-900">
                    Quick Actions
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <QuickAction
                      icon="◈"
                      title="Browse Offers"
                      text="Find available CPA offers"
                      onClick={() => openMenu("offers")}
                    />

                    <QuickAction
                      icon="↗"
                      title="Smartlinks"
                      text="Manage your tracking links"
                      onClick={() => openMenu("tracking")}
                    />

                    <QuickAction
                      icon="💳"
                      title="Request Payment"
                      text="Manage your payout"
                      onClick={() => openMenu("payouts")}
                    />

                    <QuickAction
                      icon="♙"
                      title="My Profile"
                      text="Update your account"
                      onClick={() => openMenu("profile")}
                    />
                  </div>
                </section>
              </div>
            )}

            {activeMenu === "profile" && (
              <div className="mx-auto max-w-4xl space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-3xl font-black text-white">
                      {(profile.fullName || profile.email || "A")
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>
                      <h2 className="text-2xl font-black text-slate-900">
                        My Profile
                      </h2>

                      <p className="mt-1 text-sm text-slate-400">
                        Manage your affiliate account information
                      </p>

                      <div className="mt-2 inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-600">
                        ● Active Affiliate
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                  <h3 className="text-lg font-black text-slate-900">
                    Personal Information
                  </h3>

                  <div className="mt-6 grid gap-5 md:grid-cols-2">
                    <InputField
                      label="Full Name"
                      value={profile.fullName}
                      onChange={(value) =>
                        setProfile({
                          ...profile,
                          fullName: value,
                        })
                      }
                    />

                    <InputField
                      label="Phone"
                      value={profile.phone}
                      onChange={(value) =>
                        setProfile({
                          ...profile,
                          phone: value,
                        })
                      }
                    />

                    <InputField
                      label="Country"
                      value={profile.country}
                      onChange={(value) =>
                        setProfile({
                          ...profile,
                          country: value,
                        })
                      }
                    />

                    <InputField
                      label="Email"
                      value={profile.email}
                      disabled
                      onChange={() => {}}
                    />

                    <InputField
                      label="Affiliate ID"
                      value={profile.affiliateId}
                      disabled
                      onChange={() => {}}
                    />
                  </div>

                  <button
                    onClick={saveProfile}
                    disabled={profileSaving || profileLoading}
                    className="mt-6 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {profileSaving ? "Saving..." : "Save Profile"}
                  </button>

                  {profileMessage && (
                    <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-600">
                      {profileMessage}
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-xl font-black text-white">
                        T
                      </div>

                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Your Personal Manager
                        </div>

                        <div className="mt-1 text-lg font-black text-slate-900">
                          {manager.username}
                        </div>

                        <div className="mt-1 text-sm text-green-600">
                          ● {manager.status} for support
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        window.open(
                          "https://t.me/tusarislam123",
                          "_blank"
                        )
                      }
                      className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700"
                    >
                      Contact
                    </button>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                  <h3 className="text-lg font-black text-slate-900">
                    Account Security
                  </h3>

                  <p className="mt-2 text-sm text-slate-400">
                    Change your password securely through your registered
                    email.
                  </p>

                  <button
                    onClick={resetPassword}
                    className="mt-5 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Send Password Reset Email
                  </button>
                </section>
              </div>
            )}

            {activeMenu === "tracking" && (
              <div className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">
                        Smartlinks
                      </h2>

                      <p className="mt-1 text-sm text-slate-400">
                        Your affiliate monetization links
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-green-50 px-4 py-2 text-xs font-bold text-green-600">
                      Active
                    </span>
                  </div>

                  <div className="mt-6 rounded-2xl bg-slate-50 p-5">
                    <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Smartlink
                    </div>

                    <div className="break-all text-sm text-slate-600">
                      {smartLink}
                    </div>
                  </div>

                  <button
                    onClick={copySmartLink}
                    disabled={!profile.affiliateId}
                    className="mt-4 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-100 disabled:opacity-60"
                  >
                    {copied ? "✓ Copied" : "Copy Smartlink"}
                  </button>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <MiniStatBox
                      label="Today"
                      value={stats.today}
                    />

                    <MiniStatBox
                      label="This Month"
                      value={stats.month}
                    />

                    <MiniStatBox
                      label="Total"
                      value={stats.total}
                    />
                  </div>

                  <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-700">
                    <strong>Tracking enabled:</strong> Clicks are recorded by
                    UP Network before the visitor is redirected to the CPA
                    Smartlink.
                  </div>
                </section>
              </div>
            )}

            {activeMenu === "offers" && (
              <GenericPage
                title="Offers"
                subtitle="Browse and manage available CPA offers."
                icon="◈"
                action="Available Offers"
              />
            )}

            {activeMenu === "statistics" && (
              <StatisticsPage
                stats={stats}
                loading={statsLoading}
                onRefresh={refreshStats}
              />
            )}

            {activeMenu === "conversions" && (
              <GenericPage
                title="Conversions"
                subtitle="Track your CPA leads and conversions."
                icon="✓"
                action="Conversion History"
              />
            )}

            {activeMenu === "earnings" && (
              <GenericPage
                title="Earnings"
                subtitle="View your affiliate revenue and EPC."
                icon="$"
                action="Earnings Report"
              />
            )}

            {activeMenu === "payouts" && (
              <GenericPage
                title="Payouts"
                subtitle="Manage payment methods and payment requests."
                icon="▣"
                action="Payment Center"
              />
            )}

            {activeMenu === "reports" && (
              <GenericPage
                title="Reports"
                subtitle="Generate and review detailed affiliate reports."
                icon="▤"
                action="Reports Center"
              />
            )}
          </div>

          <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white px-2 py-2 lg:hidden">
            <div className="grid grid-cols-5 gap-1">
              {[
                {
                  key: "dashboard" as MenuKey,
                  label: "Home",
                  icon: "⌂",
                },
                {
                  key: "offers" as MenuKey,
                  label: "Offers",
                  icon: "◈",
                },
                {
                  key: "tracking" as MenuKey,
                  label: "Links",
                  icon: "↗",
                },
                {
                  key: "statistics" as MenuKey,
                  label: "Stats",
                  icon: "▥",
                },
                {
                  key: "profile" as MenuKey,
                  label: "Profile",
                  icon: "♙",
                },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => openMenu(item.key)}
                  className={`rounded-xl py-2 text-center ${
                    activeMenu === item.key
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-400"
                  }`}
                >
                  <div className="text-lg">{item.icon}</div>
                  <div className="text-[10px] font-bold">
                    {item.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  subtitle,
}: {
  title: string;
  value: number;
  icon: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-400">
            {title}
          </div>

          <div className="mt-2 text-2xl font-black text-slate-900">
            {value.toLocaleString()}
          </div>

          <div className="mt-1 text-xs text-slate-400">
            {subtitle}
          </div>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">
          {icon}
        </div>
      </div>
    </div>
  );
}

function MiniMetric({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
        <span>{icon}</span>
        {title}
      </div>

      <div className="mt-2 text-xl font-black text-slate-900">
        {value}
      </div>
    </div>
  );
}

function TrafficBox({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-white p-4 text-center shadow-sm">
      <div className="text-xs font-semibold text-slate-400">
        {label}
      </div>

      <div className="mt-1 text-xl font-black text-slate-900">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function MiniStatBox({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold text-slate-400">
        {label}
      </div>

      <div className="mt-1 text-xl font-black text-slate-900">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-5 flex min-h-[150px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-400">
      {message}
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex gap-3">
        <div className="text-xl">{icon}</div>

        <div>
          <div className="font-bold text-slate-800">{title}</div>

          <div className="mt-1 text-xs leading-5 text-slate-400">
            {text}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  title,
  text,
  onClick,
}: {
  icon: string;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-600">
        {icon}
      </div>

      <div className="mt-4 font-black text-slate-900">{title}</div>

      <div className="mt-1 text-xs text-slate-400">{text}</div>
    </button>
  );
}

function InputField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-bold text-slate-700">
        {label}
      </div>

      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
            : "border-slate-200 bg-white text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        }`}
      />
    </label>
  );
}

function StatisticsPage({
  stats,
  loading,
  onRefresh,
}: {
  stats: ClickStats;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              Statistics
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Real-time click and traffic statistics
            </p>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Today"
          value={stats.today}
          icon="👆"
          subtitle="Today's clicks"
        />

        <StatCard
          title="Yesterday"
          value={stats.yesterday}
          icon="📅"
          subtitle="Yesterday clicks"
        />

        <StatCard
          title="This Month"
          value={stats.month}
          icon="📈"
          subtitle="Monthly clicks"
        />

        <StatCard
          title="Total"
          value={stats.total}
          icon="⚡"
          subtitle="All-time clicks"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-black text-slate-900">
            Top GEOs
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            Countries generating your traffic
          </p>

          {stats.countries.length === 0 ? (
            <EmptyState message="No GEO data yet" />
          ) : (
            <div className="mt-5 space-y-3">
              {stats.countries.map((country) => (
                <div
                  key={country.name}
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-4"
                >
                  <span className="font-semibold text-slate-700">
                    {country.name}
                  </span>

                  <span className="font-black text-slate-900">
                    {country.clicks}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-black text-slate-900">
            Platforms
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            Traffic by device
          </p>

          {stats.devices.length === 0 ? (
            <EmptyState message="No platform data yet" />
          ) : (
            <div className="mt-5 space-y-3">
              {stats.devices.map((device) => (
                <div
                  key={device.name}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-700">
                      {device.name}
                    </span>

                    <span className="font-black text-slate-900">
                      {device.clicks}
                    </span>
                  </div>

                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-blue-600"
                      style={{
                        width: `${device.percent}%`,
                      }}
                    />
                  </div>

                  <div className="mt-1 text-right text-xs text-slate-400">
                    {device.percent}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function GenericPage({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle: string;
  icon: string;
  action: string;
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600">
          {icon}
        </div>

        <h2 className="mt-5 text-2xl font-black text-slate-900">
          {title}
        </h2>

        <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="text-4xl">📊</div>

        <h3 className="mt-4 font-black text-slate-800">
          {action}
        </h3>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
          This section is ready for the next stage of the CPA
          network system.
        </p>
      </section>
    </div>
  );
                }
