"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  DollarSign,
  Link2,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAIL = "islamhanif122@gmail.com";

type MenuItem = {
  label: string;
  icon: React.ElementType;
  action: string;
  available: boolean;
};

const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    icon: BarChart3,
    action: "/admin",
    available: true,
  },
  {
    label: "Offers",
    icon: Target,
    action: "/admin/offers",
    available: true,
  },
  {
    label: "Affiliates",
    icon: Users,
    action: "/admin/affiliates",
    available: true,
  },
  {
  label: "Smart Links",
  icon: Link2,
  action: "/admin/smart-links",
  available: true,
  },
  {
    label: "Statistics",
    icon: Activity,
    action: "statistics",
    available: false,
  },
  {
    label: "Earnings",
    icon: DollarSign,
    action: "earnings",
    available: false,
  },
  {
    label: "Referrals",
    icon: UserCheck,
    action: "referrals",
    available: false,
  },
  {
    label: "Payments",
    icon: CreditCard,
    action: "payments",
    available: false,
  },
  {
    label: "Settings",
    icon: Settings,
    action: "settings",
    available: false,
  },
];

type ControlCard = {
  title: string;
  description: string;
  icon: React.ElementType;
  status: "Active" | "Coming next";
  action?: string;
};

const controlCards: ControlCard[] = [
  {
    title: "Affiliate Management",
    description:
      "View affiliates, approve or reject accounts, suspend users and manage affiliate status.",
    icon: Users,
    status: "Active",
    action: "/admin/affiliates",
  },
  {
    title: "Offer Management",
    description:
      "Create, edit, pause, activate and delete CPA offers from the admin panel.",
    icon: Target,
    status: "Active",
    action: "/admin/offers",
  },
  {
  title: "Smart Links",
  description:
    "Manage smart links, tracking destinations and affiliate smart-link access.",
  icon: Link2,
  status: "Active",
  action: "/admin/smart-links",
  },
  {
    title: "Statistics",
    description:
      "Control clicks, conversions, conversion rate, revenue and payout reporting.",
    icon: BarChart3,
    status: "Coming next",
  },
  {
    title: "Earnings",
    description:
      "Review affiliate earnings and manage earning-related information.",
    icon: Wallet,
    status: "Coming next",
  },
  {
    title: "Referral System",
    description:
      "Control referral rates, referral earnings and commission status.",
    icon: TrendingUp,
    status: "Coming next",
  },
  {
    title: "Payments",
    description:
      "Manage payment methods, pending payments, paid payments and payment status.",
    icon: CreditCard,
    status: "Coming next",
  },
];

type PanelSetting = {
  id: number;
  feature_key: string;
  label: string;
  description: string | null;
  enabled: boolean;
  display_order: number;
  updated_at: string;
};

const featureDescriptions: Record<string, string> = {
  dashboard: "Controls the main affiliate dashboard.",
  offers: "Controls access to available CPA offers.",
  smart_links: "Controls the Smart Links section.",
  statistics: "Controls statistics and performance reports.",
  earnings: "Controls affiliate earnings information.",
  referrals: "Controls referrals and commission information.",
  payments: "Controls payment information and payment requests.",
  profile: "Controls affiliate profile management.",
  settings: "Controls affiliate account settings.",
  manager_contact: "Controls Telegram manager contact options.",
};

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [adminEmail, setAdminEmail] = useState("");

  const [affiliateCount, setAffiliateCount] = useState(0);
  const [offerCount, setOfferCount] = useState(0);
  const [activeOfferCount, setActiveOfferCount] = useState(0);

  const [settings, setSettings] = useState<PanelSetting[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [updatingFeature, setUpdatingFeature] = useState<string | null>(null);

  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadAdmin() {
      try {
        setLoading(true);
        setError("");

        const { data, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        const session = data.session;

        if (!session?.user?.email) {
          router.replace("/login");
          return;
        }

        const email = session.user.email.toLowerCase();

        if (email !== ADMIN_EMAIL.toLowerCase()) {
          router.replace("/affiliate");
          return;
        }

        if (!mounted) return;

        setAuthorized(true);
        setAdminEmail(session.user.email);

        await loadStats(session.access_token);
        await loadPanelSettings(session.access_token);
      } catch (err) {
        console.error("Admin dashboard error:", err);

        if (!mounted) return;

        setError("Unable to load admin dashboard.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    async function loadStats(accessToken: string) {
      try {
        const headers = {
          Authorization: `Bearer ${accessToken}`,
        };

        const [affiliateResponse, offerResponse] = await Promise.all([
          fetch("/api/admin/affiliates", {
            method: "GET",
            headers,
            cache: "no-store",
          }),
          fetch("/api/admin/offers", {
            method: "GET",
            headers,
            cache: "no-store",
          }),
        ]);

        if (affiliateResponse.ok) {
          const affiliateData = await affiliateResponse.json();

          const affiliates = Array.isArray(affiliateData?.affiliates)
            ? affiliateData.affiliates
            : [];

          setAffiliateCount(
            typeof affiliateData?.total === "number"
              ? affiliateData.total
              : affiliates.length
          );
        }

        if (offerResponse.ok) {
          const offerData = await offerResponse.json();

          const offers = Array.isArray(offerData)
            ? offerData
            : Array.isArray(offerData?.offers)
              ? offerData.offers
              : [];

          setOfferCount(offers.length);

          setActiveOfferCount(
            offers.filter(
              (offer: { status?: string }) =>
                String(offer?.status || "").toLowerCase() === "active"
            ).length
          );
        }
      } catch (err) {
        console.error("Admin stats error:", err);
      }
    }

    async function loadPanelSettings(accessToken: string) {
      try {
        setSettingsLoading(true);

        const response = await fetch("/api/admin/panel-settings", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data?.success) {
          throw new Error(
            data?.error || "Unable to load panel settings."
          );
        }

        if (mounted) {
          setSettings(
            Array.isArray(data.settings) ? data.settings : []
          );
        }
      } catch (err) {
        console.error("Panel settings error:", err);

        if (mounted) {
          setError("Unable to load affiliate panel feature settings.");
        }
      } finally {
        if (mounted) {
          setSettingsLoading(false);
        }
      }
    }

    loadAdmin();

    return () => {
      mounted = false;
    };
  }, [router]);

  const summaryCards = useMemo(
    () => [
      {
        title: "Total Affiliates",
        value: affiliateCount,
        icon: Users,
        description: "Registered affiliate accounts",
      },
      {
        title: "Total Offers",
        value: offerCount,
        icon: Target,
        description: "Offers in the network",
      },
      {
        title: "Active Offers",
        value: activeOfferCount,
        icon: CheckCircle2,
        description: "Currently active offers",
      },
      {
        title: "Controlled Features",
        value: settings.length,
        icon: ShieldCheck,
        description: "Affiliate panel features",
      },
    ],
    [affiliateCount, offerCount, activeOfferCount, settings.length]
  );

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function scrollToSettings() {
    setTimeout(() => {
      document.getElementById("feature-settings")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

  function handleMenu(item: MenuItem) {
    setActiveMenu(item.label);
    setSidebarOpen(false);

    if (!item.available) {
      if (item.label === "Settings") {
        scrollToSettings();
        return;
      }

      const element = document.getElementById("control-center");

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }

      return;
    }

    router.push(item.action);
  }

  function handleControlAction(card: ControlCard) {
    if (!card.action) {
      const element = document.getElementById("control-center");

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }

      return;
    }

    router.push(card.action);
  }

  async function toggleFeature(setting: PanelSetting) {
    if (updatingFeature) return;

    try {
      setUpdatingFeature(setting.feature_key);
      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/admin/panel-settings", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          feature_key: setting.feature_key,
          enabled: !setting.enabled,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error || "Unable to update feature setting."
        );
      }

      const updatedSetting = data.setting as PanelSetting;

      setSettings((current) =>
        current.map((item) =>
          item.feature_key === updatedSetting.feature_key
            ? updatedSetting
            : item
        )
      );
    } catch (err) {
      console.error("Feature toggle error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update feature setting."
      );
    } finally {
      setUpdatingFeature(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />
          <p className="text-sm text-slate-400">
            Loading Admin Panel...
          </p>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-72 border-r border-slate-800 bg-slate-950/95 backdrop-blur-xl transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-800 px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-black tracking-tight">
                  UpNetwork
                  <span className="text-cyan-400">CPA</span>
                </div>

                <div className="mt-1 text-[11px] uppercase tracking-[0.25em] text-slate-500">
                  Admin Control Center
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-5">
            <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Management
            </div>

            <div className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = activeMenu === item.label;

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleMenu(item)}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                      active
                        ? "bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-500/20"
                        : "text-slate-400 hover:bg-slate-900 hover:text-white"
                    }`}
                  >
                    <Icon
                      size={18}
                      className={
                        active
                          ? "text-cyan-400"
                          : "text-slate-500 group-hover:text-slate-300"
                      }
                    />

                    <span className="flex-1">{item.label}</span>

                    {!item.available && item.label !== "Settings" && (
                      <span className="rounded-full border border-slate-700 px-1.5 py-0.5 text-[8px] uppercase tracking-wide text-slate-500">
                        Soon
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-slate-800 p-4">
            <div className="mb-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400">
                  <ShieldCheck size={18} />
                </div>

                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">
                    Administrator
                  </div>

                  <div className="truncate text-[10px] text-slate-500">
                    {adminEmail}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-red-400 transition hover:bg-red-500/10"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <section className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-slate-300 hover:text-white lg:hidden"
              >
                <Menu size={20} />
              </button>

              <div>
                <div className="text-lg font-bold">
                  Admin Dashboard
                </div>

                <div className="text-xs text-slate-500">
                  Manage your entire CPA network from one place
                </div>
              </div>
            </div>

            <div className="hidden items-center gap-3 sm:flex">
              <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-right">
                <div className="text-[9px] uppercase tracking-wider text-slate-500">
                  Admin
                </div>

                <div className="max-w-[220px] truncate text-xs text-slate-300">
                  {adminEmail}
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-slate-400 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <div className="px-4 py-6 sm:px-6 lg:px-8">
          {/* Hero */}
          <section className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-slate-900 to-slate-950 p-6 sm:p-8">
            <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                <ShieldCheck size={13} />
                Full Network Control
              </div>

              <h1 className="max-w-3xl text-2xl font-black tracking-tight sm:text-4xl">
                Welcome to the{" "}
                <span className="text-cyan-400">
                  UpNetwork CPA
                </span>{" "}
                Admin Control Center
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
                Manage affiliates, offers and all affiliate-panel
                features from one central administration system.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/admin/offers")}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400"
                >
                  <Target size={17} />
                  Manage Offers
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/admin/affiliates")}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:border-cyan-500/40 hover:bg-slate-800"
                >
                  <Users size={17} />
                  Manage Affiliates
                </button>

                <button
                  type="button"
                  onClick={scrollToSettings}
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-500/20"
                >
                  <Settings size={17} />
                  Feature Settings
                </button>
              </div>
            </div>
          </section>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Summary */}
          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.title}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-medium text-slate-500">
                        {card.title}
                      </div>

                      <div className="mt-2 text-3xl font-black text-white">
                        {card.value}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-cyan-400">
                      <Icon size={20} />
                    </div>
                  </div>

                  <div className="mt-4 text-[11px] text-slate-500">
                    {card.description}
                  </div>
                </div>
              );
            })}
          </section>

          {/* Quick actions */}
          <section className="mt-8">
            <div className="mb-4">
              <h2 className="text-xl font-bold">
                Quick Actions
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Frequently used administration tools
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <button
                type="button"
                onClick={() => router.push("/admin/offers")}
                className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-left transition hover:-translate-y-0.5 hover:border-cyan-500/30 hover:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-400">
                    <Target size={21} />
                  </div>

                  <ChevronRight
                    size={18}
                    className="text-slate-600 transition group-hover:translate-x-1 group-hover:text-cyan-400"
                  />
                </div>

                <div className="mt-5 text-sm font-bold">
                  Create / Manage Offer
                </div>

                <div className="mt-1 text-xs leading-5 text-slate-500">
                  Add new CPA offers or edit existing offers.
                </div>
              </button>

              <button
                type="button"
                onClick={() => router.push("/admin/affiliates")}
                className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-left transition hover:-translate-y-0.5 hover:border-cyan-500/30 hover:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-400">
                    <Users size={21} />
                  </div>

                  <ChevronRight
                    size={18}
                    className="text-slate-600 transition group-hover:translate-x-1 group-hover:text-cyan-400"
                  />
                </div>

                <div className="mt-5 text-sm font-bold">
                  Manage Affiliates
                </div>

                <div className="mt-1 text-xs leading-5 text-slate-500">
                  Review accounts and change affiliate status.
                </div>
              </button>

              <button
                type="button"
                onClick={scrollToSettings}
                className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-left transition hover:-translate-y-0.5 hover:border-cyan-500/30 hover:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-400">
                    <Settings size={21} />
                  </div>

                  <ChevronRight
                    size={18}
                    className="text-slate-600 transition group-hover:translate-x-1 group-hover:text-cyan-400"
                  />
                </div>

                <div className="mt-5 text-sm font-bold">
                  Feature Control
                </div>

                <div className="mt-1 text-xs leading-5 text-slate-500">
                  Turn affiliate-panel features ON or OFF.
                </div>
              </button>
            </div>
          </section>

          {/* Control center */}
          <section
            id="control-center"
            className="mt-10 scroll-mt-24"
          >
            <div className="mb-5">
              <div className="flex items-center gap-2">
                <Settings size={20} className="text-cyan-400" />

                <h2 className="text-xl font-bold">
                  Network Control Center
                </h2>
              </div>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Central management modules for the UpNetwork CPA
                network.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {controlCards.map((card) => {
                const Icon = card.icon;
                const active = card.status === "Active";

                return (
                  <button
                    key={card.title}
                    type="button"
                    onClick={() => handleControlAction(card)}
                    className={`group rounded-2xl border p-5 text-left transition ${
                      active
                        ? "border-cyan-500/20 bg-slate-900/70 hover:-translate-y-0.5 hover:border-cyan-500/40"
                        : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div
                        className={`rounded-xl p-3 ${
                          active
                            ? "bg-cyan-500/10 text-cyan-400"
                            : "bg-slate-800 text-slate-500"
                        }`}
                      >
                        <Icon size={21} />
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${
                          active
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-slate-800 text-slate-500"
                        }`}
                      >
                        {card.status}
                      </span>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          {card.title}
                        </h3>

                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          {card.description}
                        </p>
                      </div>

                      <ChevronRight
                        size={17}
                        className="shrink-0 text-slate-700 transition group-hover:translate-x-1 group-hover:text-cyan-400"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Feature settings */}
          <section
            id="feature-settings"
            className="mt-10 scroll-mt-24"
          >
            <div className="mb-5">
              <div className="flex items-center gap-2">
                <Settings size={20} className="text-cyan-400" />

                <h2 className="text-xl font-bold">
                  Affiliate Panel Feature Control
                </h2>
              </div>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Turn individual affiliate-panel features ON or OFF.
                Changes are saved to the database immediately.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 sm:p-6">
              {settingsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />
                </div>
              ) : settings.length === 0 ? (
                <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-sm text-yellow-300">
                  No feature settings were found. Please make sure
                  the Step 3 SQL was executed successfully.
                </div>
              ) : (
                <div className="space-y-3">
                  {settings
                    .slice()
                    .sort(
                      (a, b) => a.display_order - b.display_order
                    )
                    .map((setting) => {
                      const isUpdating =
                        updatingFeature === setting.feature_key;

                      const description =
                        setting.description ||
                        featureDescriptions[
                          setting.feature_key
                        ] ||
                        "Affiliate panel feature control.";

                      return (
                        <div
                          key={setting.feature_key}
                          className={`flex flex-col gap-4 rounded-2xl border p-4 transition sm:flex-row sm:items-center sm:justify-between ${
                            setting.enabled
                              ? "border-emerald-500/10 bg-slate-950/60"
                              : "border-slate-800 bg-slate-950/30"
                          }`}
                        >
                          <div className="flex min-w-0 items-start gap-4">
                            <div
                              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                setting.enabled
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-slate-800 text-slate-500"
                              }`}
                            >
                              {setting.enabled ? (
                                <CheckCircle2 size={19} />
                              ) : (
                                <X size={19} />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-bold text-white">
                                  {setting.label}
                                </h3>

                                <span
                                  className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${
                                    setting.enabled
                                      ? "bg-emerald-500/10 text-emerald-400"
                                      : "bg-slate-800 text-slate-500"
                                  }`}
                                >
                                  {setting.enabled
                                    ? "ON"
                                    : "OFF"}
                                </span>
                              </div>

                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                {description}
                              </p>

                              <div className="mt-1 text-[9px] uppercase tracking-wider text-slate-700">
                                {setting.feature_key}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() =>
                              toggleFeature(setting)
                            }
                            aria-label={`Turn ${setting.label} ${
                              setting.enabled ? "off" : "on"
                            }`}
                            className={`relative h-8 w-14 shrink-0 rounded-full border transition ${
                              setting.enabled
                                ? "border-emerald-500/40 bg-emerald-500/20"
                                : "border-slate-700 bg-slate-800"
                            } ${
                              isUpdating
                                ? "cursor-wait opacity-60"
                                : "cursor-pointer"
                            }`}
                          >
                            <span
                              className={`absolute top-1 h-6 w-6 rounded-full shadow-lg transition-all ${
                                setting.enabled
                                  ? "left-7 bg-emerald-400"
                                  : "left-1 bg-slate-500"
                              }`}
                            />

                            {isUpdating && (
                              <span className="absolute inset-0 flex items-center justify-center">
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                              </span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}

              <div className="mt-5 rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-4">
                <div className="flex gap-3">
                  <ShieldCheck
                    size={18}
                    className="mt-0.5 shrink-0 text-cyan-400"
                  />

                  <div>
                    <div className="text-xs font-bold text-cyan-300">
                      Important
                    </div>

                    <p className="mt-1 text-[11px] leading-5 text-slate-500">
                      These switches are now connected to the admin
                      database. The next step is to make the
                      affiliate panel actually respect these ON/OFF
                      values.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Current status */}
          <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                <CheckCircle2 size={22} />
              </div>

              <div>
                <h3 className="font-bold text-white">
                  Admin system connected
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Affiliate and Offer management are connected.
                  Feature settings are now connected to the database.
                  The next stage is enforcing these settings inside
                  the affiliate panel.
                </p>
              </div>
            </div>
          </section>

          <footer className="py-8 text-center text-[11px] text-slate-600">
            UpNetwork CPA Admin Control Center
          </footer>
        </div>
      </section>
    </main>
  );
          }
