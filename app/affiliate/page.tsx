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

export default function AffiliatePage() {
  const router = useRouter();

  const [activeMenu, setActiveMenu] = useState<MenuKey>("dashboard");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    country: "",
    affiliateId: "",
  });

  const [copied, setCopied] = useState(false);

  const smartLink =
    "https://onlyhotdates.com/dTmGzfkC?aid=fzkbxfzxzk&kid=hxxhxzhdpdk";

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
    menuItems.find((item) => item.key === activeMenu)?.label || "Dashboard";

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-800">
      <div className="flex min-h-screen">
        {/* SIDEBAR */}
        <aside className="hidden w-[250px] flex-shrink-0 border-r border-slate-200 bg-white lg:block">
          <div className="sticky top-0 flex h-screen flex-col">
            {/* LOGO */}
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

            {/* NAVIGATION */}
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

            {/* USER */}
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

        {/* MAIN */}
        <main className="min-w-0 flex-1">
          {/* HEADER */}
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
            {/* ================= DASHBOARD ================= */}
            {activeMenu === "dashboard" && (
              <div className="space-y-6">
                {/* WELCOME */}
                <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-xl shadow-blue-100 md:p-8">
                  <div className="max-w-3xl">
                    <div className="mb-2 text-sm font-semibold text-blue-100">
                      Welcome back 👋
                    </div>

                    <h2 className="text-2xl font-black md:text-3xl">
                      Welcome to UP Network
                    </h2>

                    <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 md:text-base">
                      Manage your Smartlinks, traffic, conversions and earnings
                      from one modern CPA affiliate dashboard.
                    </p>

                    <button
                      onClick={() => openMenu("tracking")}
                      className="mt-5 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-600 shadow-lg hover:bg-blue-50"
                    >
                      Get Smartlink →
                    </button>
                  </div>
                </section>

                {/* REVENUE CARDS */}
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <RevenueCard
                    title="Today"
                    value="$0.00"
                    icon="💰"
                    subtitle="Today's revenue"
                  />

                  <RevenueCard
                    title="Yesterday"
                    value="$0.00"
                    icon="📅"
                    subtitle="Yesterday revenue"
                  />

                  <RevenueCard
                    title="This Month"
                    value="$0.00"
                    icon="📈"
                    subtitle="Current month"
                  />

                  <RevenueCard
                    title="Total Revenue"
                    value="$0.00"
                    icon="💵"
                    subtitle="All-time revenue"
                  />
                </section>

                {/* TRAFFIC + SMARTLINK */}
                <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black text-slate-900">
                          Traffic Dynamic
                        </h3>

                        <p className="text-sm text-slate-400">
                          Revenue and clicks performance
                        </p>
                      </div>

                      <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none">
                        <option>Last 30 days</option>
                        <option>This month</option>
                        <option>This week</option>
                        <option>Today</option>
                      </select>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <MiniMetric
                        title="Revenue"
                        value="$0.00"
                        icon="💰"
                      />

                      <MiniMetric
                        title="Clicks"
                        value="0"
                        icon="👆"
                      />
                    </div>

                    <div className="mt-5 flex h-[230px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
                      <div className="text-center">
                        <div className="text-3xl">📊</div>
                        <div className="mt-2 font-bold text-slate-600">
                          No traffic data yet
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          Your performance chart will appear here
                        </div>
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

                    <button
                      onClick={copySmartLink}
                      className="mt-4 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700"
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

                {/* GEO + PLATFORM */}
                <section className="grid gap-6 xl:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-black text-slate-900">
                          TOP-5 GEOs by EPC
                        </h3>

                        <p className="text-sm text-slate-400">
                          This month
                        </p>
                      </div>

                      <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">
                        This Month
                      </span>
                    </div>

                    <EmptyTable
                      columns={["Country", "Clicks", "EPC"]}
                      message="No GEO data"
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">
                        Platform
                      </h3>

                      <p className="text-sm text-slate-400">
                        Traffic performance
                      </p>
                    </div>

                    <EmptyTable
                      columns={["Platform", "Leads", "Percent"]}
                      message="No data"
                    />
                  </div>
                </section>

                {/* WHAT'S NEW */}
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

                {/* QUICK ACTIONS */}
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

            {/* ================= PROFILE ================= */}
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

            {/* ================= SMARTLINK ================= */}
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
                    className="mt-4 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-100"
                  >
                    {copied ? "✓ Copied" : "Copy Smartlink"}
                  </button>

                  <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-700">
                    <strong>Tracking note:</strong> For accurate affiliate
                    attribution, Smartlinks should eventually support unique
                    affiliate IDs/subIDs.
                  </div>
                </section>
              </div>
            )}

            {/* ================= OFFERS ================= */}
            {activeMenu === "offers" && (
              <GenericPage
                title="Offers"
                subtitle="Browse and manage available CPA offers."
                icon="◈"
                action="Available Offers"
              />
            )}

            {/* ================= STATISTICS ================= */}
            {activeMenu === "statistics" && (
              <GenericPage
                title="Statistics"
                subtitle="Monitor clicks, revenue, EPC and traffic."
                icon="▥"
                action="Performance Statistics"
              />
            )}

            {/* ================= CONVERSIONS ================= */}
            {activeMenu === "conversions" && (
              <GenericPage
                title="Conversions"
                subtitle="Track your CPA leads and conversions."
                icon="✓"
                action="Conversion History"
              />
            )}

            {/* ================= EARNINGS ================= */}
            {activeMenu === "earnings" && (
              <GenericPage
                title="Earnings"
                subtitle="View your affiliate revenue and EPC."
                icon="$"
                action="Earnings Report"
              />
            )}

            {/* ================= PAYOUTS ================= */}
            {activeMenu === "payouts" && (
              <GenericPage
                title="Payouts"
                subtitle="Manage payment methods and payment requests."
                icon="▣"
                action="Payment Center"
              />
            )}

            {/* ================= REPORTS ================= */}
            {activeMenu === "reports" && (
              <GenericPage
                title="Reports"
                subtitle="Generate and review detailed affiliate reports."
                icon="▤"
                action="Reports Center"
              />
            )}
          </div>

          {/* MOBILE NAV */}
          <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white px-2 py-2 lg:hidden">
            <div className="grid grid-cols-5 gap-1">
              {[
                { key: "dashboard" as MenuKey, label: "Home", icon: "⌂" },
                { key: "offers" as MenuKey, label: "Offers", icon: "◈" },
                { key: "tracking" as MenuKey, label: "Links", icon: "↗" },
                {
                  key: "statistics" as MenuKey,
                  label: "Stats",
                  icon: "▥",
                },
                { key: "profile" as MenuKey, label: "Profile", icon: "♙" },
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
                  <div className="text-[10px] font-bold">{item.label}</div>
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function RevenueCard({
  title,
  value,
  icon,
  subtitle,
}: {
  title: string;
  value: string;
  icon: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-400">{title}</div>

          <div className="mt-2 text-2xl font-black text-slate-900">
            {value}
          </div>

          <div className="mt-1 text-xs text-slate-400">{subtitle}</div>
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

      <div className="mt-2 text-xl font-black text-slate-900">{value}</div>
    </div>
  );
}

function EmptyTable({
  columns,
  message,
}: {
  columns: string[];
  message: string;
}) {
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
      <div
        className="grid bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400"
        style={{
          gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
        }}
      >
        {columns.map((column) => (
          <div key={column}>{column}</div>
        ))}
      </div>

      <div className="flex min-h-[150px] items-center justify-center text-sm font-semibold text-slate-400">
        {message}
      </div>
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
      <div className="mb-2 text-sm font-bold text-slate-700">{label}</div>

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

        <h3 className="mt-4 font-black text-slate-800">{action}</h3>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
          Data will appear here when your CPA tracking and Supabase database
          are connected.
        </p>
      </section>
    </div>
  );
    }
