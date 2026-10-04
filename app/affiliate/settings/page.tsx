"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Check,
  CreditCard,
  Globe,
  Loader2,
  Mail,
  Save,
  ShieldCheck,
  User,
  Building2,
  Phone,
  Wallet,
  AlertCircle,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type Settings = {
  userId: string;
  affiliateId: string;

  fullName: string;
  phone: string;
  company: string;

  timezone: string;
  currency: string;

  paymentMethod: string;
  paymentAddress: string;
  paymentNote: string;

  emailNotifications: boolean;
  conversionNotifications: boolean;
  paymentNotifications: boolean;

  email: string | null;
  updatedAt: string | null;
};

const defaultSettings: Settings = {
  userId: "",
  affiliateId: "",

  fullName: "",
  phone: "",
  company: "",

  timezone: "Asia/Dhaka",
  currency: "USD",

  paymentMethod: "",
  paymentAddress: "",
  paymentNote: "",

  emailNotifications: true,
  conversionNotifications: true,
  paymentNotifications: true,

  email: null,
  updatedAt: null,
};

export default function AffiliateSettingsPage() {
  const router = useRouter();

  const [settings, setSettings] =
    useState<Settings>(defaultSettings);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [successMessage, setSuccessMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function getAccessToken() {
    if (!supabase) {
      throw new Error(
        "Supabase is not configured."
      );
    }

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      throw new Error(error.message);
    }

    if (!session?.access_token) {
      router.push("/login");
      return null;
    }

    return session.access_token;
  }

  async function loadSettings() {
    try {
      setLoading(true);
      setErrorMessage("");

      const token = await getAccessToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        "/api/affiliate/settings",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Failed to load settings."
        );
      }

      if (result?.settings) {
        setSettings({
          ...defaultSettings,
          ...result.settings,
        });
      }
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load settings."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setSaving(true);
      setSuccessMessage("");
      setErrorMessage("");

      const token = await getAccessToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        "/api/affiliate/settings",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fullName: settings.fullName,
            phone: settings.phone,
            company: settings.company,

            timezone: settings.timezone,
            currency: settings.currency,

            paymentMethod:
              settings.paymentMethod,

            paymentAddress:
              settings.paymentAddress,

            paymentNote:
              settings.paymentNote,

            emailNotifications:
              settings.emailNotifications,

            conversionNotifications:
              settings.conversionNotifications,

            paymentNotifications:
              settings.paymentNotifications,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Failed to save settings."
        );
      }

      if (result?.settings) {
        setSettings({
          ...defaultSettings,
          ...result.settings,
        });
      }

      setSuccessMessage(
        "Your settings have been saved successfully."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save settings."
      );
    } finally {
      setSaving(false);
    }
  }

  function updateField(
    field: keyof Settings,
    value: string | boolean
  ) {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070b14] text-white flex items-center justify-center px-4">
        <div className="flex items-center gap-3 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading settings...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.push("/affiliate")}
              className="mb-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.07] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </button>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Profile Settings
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Manage your affiliate profile, payment
              address and notification preferences.
            </p>
          </div>
        </div>

        {/* Alerts */}
        {successMessage && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300">
            <Check className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <div className="font-semibold">
                Saved successfully
              </div>

              <div className="mt-1 text-emerald-300/80">
                {successMessage}
              </div>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <div className="font-semibold">
                Something went wrong
              </div>

              <div className="mt-1 text-red-300/80">
                {errorMessage}
              </div>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* Affiliate Profile */}
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-xl">
            <div className="border-b border-white/10 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                  <User className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-semibold">
                    Affiliate Profile
                  </h2>

                  <p className="text-sm text-slate-400">
                    Your account and affiliate information.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Email
                </label>

                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                  <input
                    type="email"
                    value={settings.email || ""}
                    disabled
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-3 text-sm text-slate-400 outline-none"
                  />
                </div>

                <p className="mt-1.5 text-xs text-slate-500">
                  Your login email cannot be changed here.
                </p>
              </div>

              {/* Affiliate ID */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Affiliate ID
                </label>

                <input
                  type="text"
                  value={settings.affiliateId}
                  disabled
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm font-medium text-slate-400 outline-none"
                />

                <p className="mt-1.5 text-xs text-slate-500">
                  This ID is used for your affiliate tracking.
                </p>
              </div>

              {/* Full Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Full Name
                </label>

                <input
                  type="text"
                  value={settings.fullName}
                  onChange={(event) =>
                    updateField(
                      "fullName",
                      event.target.value
                    )
                  }
                  placeholder="Your full name"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-400/50 focus:bg-white/[0.05]"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Phone
                </label>

                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                  <input
                    type="tel"
                    value={settings.phone}
                    onChange={(event) =>
                      updateField(
                        "phone",
                        event.target.value
                      )
                    }
                    placeholder="+880..."
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-400/50 focus:bg-white/[0.05]"
                  />
                </div>
              </div>

              {/* Company */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Company / Brand
                </label>

                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                  <input
                    type="text"
                    value={settings.company}
                    onChange={(event) =>
                      updateField(
                        "company",
                        event.target.value
                      )
                    }
                    placeholder="Company or brand name"
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-400/50 focus:bg-white/[0.05]"
                  />
                </div>
              </div>

              {/* Timezone */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Timezone
                </label>

                <div className="relative">
                  <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                  <select
                    value={settings.timezone}
                    onChange={(event) =>
                      updateField(
                        "timezone",
                        event.target.value
                      )
                    }
                    className="w-full appearance-none rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-3 text-sm text-white outline-none transition focus:border-indigo-400/50"
                  >
                    <option
                      value="Asia/Dhaka"
                      className="bg-slate-900"
                    >
                      Asia/Dhaka (Bangladesh)
                    </option>

                    <option
                      value="Asia/Kolkata"
                      className="bg-slate-900"
                    >
                      Asia/Kolkata (India)
                    </option>

                    <option
                      value="Asia/Dubai"
                      className="bg-slate-900"
                    >
                      Asia/Dubai (UAE)
                    </option>

                    <option
                      value="Europe/London"
                      className="bg-slate-900"
                    >
                      Europe/London
                    </option>

                    <option
                      value="America/New_York"
                      className="bg-slate-900"
                    >
                      America/New_York
                    </option>

                    <option
                      value="America/Los_Angeles"
                      className="bg-slate-900"
                    >
                      America/Los_Angeles
                    </option>

                    <option
                      value="UTC"
                      className="bg-slate-900"
                    >
                      UTC
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Payment */}
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-xl">
            <div className="border-b border-white/10 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                  <Wallet className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-semibold">
                    Payment Address
                  </h2>

                  <p className="text-sm text-slate-400">
                    Where you want to receive your affiliate earnings.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="grid gap-5 sm:grid-cols-2">
                {/* Payment Method */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Payment Method
                  </label>

                  <div className="relative">
                    <CreditCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                    <select
                      value={settings.paymentMethod}
                      onChange={(event) =>
                        updateField(
                          "paymentMethod",
                          event.target.value
                        )
                      }
                      className="w-full appearance-none rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-3 text-sm text-white outline-none transition focus:border-emerald-400/50"
                    >
                      <option
                        value=""
                        className="bg-slate-900"
                      >
                        Select payment method
                      </option>

                      <option
                        value="PayPal"
                        className="bg-slate-900"
                      >
                        PayPal
                      </option>

                      <option
                        value="Bank Transfer"
                        className="bg-slate-900"
                      >
                        Bank Transfer
                      </option>

                      <option
                        value="Payoneer"
                        className="bg-slate-900"
                      >
                        Payoneer
                      </option>

                      <option
                        value="Wise"
                        className="bg-slate-900"
                      >
                        Wise
                      </option>

                      <option
                        value="Crypto"
                        className="bg-slate-900"
                      >
                        Crypto
                      </option>

                      <option
                        value="Other"
                        className="bg-slate-900"
                      >
                        Other
                      </option>
                    </select>
                  </div>
                </div>

                {/* Currency */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Currency
                  </label>

                  <select
                    value={settings.currency}
                    onChange={(event) =>
                      updateField(
                        "currency",
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none transition focus:border-emerald-400/50"
                  >
                    <option
                      value="USD"
                      className="bg-slate-900"
                    >
                      USD — US Dollar
                    </option>

                    <option
                      value="BDT"
                      className="bg-slate-900"
                    >
                      BDT — Bangladeshi Taka
                    </option>

                    <option
                      value="EUR"
                      className="bg-slate-900"
                    >
                      EUR — Euro
                    </option>

                    <option
                      value="GBP"
                      className="bg-slate-900"
                    >
                      GBP — British Pound
                    </option>
                  </select>
                </div>
              </div>

              {/* Payment Address */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Payment Address / Account
                </label>

                <input
                  type="text"
                  value={settings.paymentAddress}
                  onChange={(event) =>
                    updateField(
                      "paymentAddress",
                      event.target.value
                    )
                  }
                  placeholder="Enter your payment email, bank account, wallet address, etc."
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/50 focus:bg-white/[0.05]"
                />
              </div>

              {/* Payment Note */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Payment Note
                </label>

                <textarea
                  value={settings.paymentNote}
                  onChange={(event) =>
                    updateField(
                      "paymentNote",
                      event.target.value
                    )
                  }
                  rows={4}
                  placeholder="Optional payment instructions or additional information..."
                  className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/50 focus:bg-white/[0.05]"
                />
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

                <div className="text-xs leading-5 text-slate-400">
                  Your payment information is stored in your
                  account settings and is only used for
                  affiliate payment processing.
                </div>
              </div>
            </div>
          </section>

          {/* Notifications */}
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-xl">
            <div className="border-b border-white/10 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
                  <Bell className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-semibold">
                    All Settings
                  </h2>

                  <p className="text-sm text-slate-400">
                    Control which account notifications you receive.
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-white/10">
              {/* Email Notifications */}
              <label className="flex cursor-pointer items-center justify-between gap-4 p-5 transition hover:bg-white/[0.02] sm:px-6">
                <div>
                  <div className="font-medium">
                    Email Notifications
                  </div>

                  <div className="mt-1 text-sm text-slate-400">
                    Receive important account and affiliate updates.
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(event) =>
                    updateField(
                      "emailNotifications",
                      event.target.checked
                    )
                  }
                  className="h-5 w-5 shrink-0 accent-indigo-500"
                />
              </label>

              {/* Conversion Notifications */}
              <label className="flex cursor-pointer items-center justify-between gap-4 p-5 transition hover:bg-white/[0.02] sm:px-6">
                <div>
                  <div className="font-medium">
                    Conversion Notifications
                  </div>

                  <div className="mt-1 text-sm text-slate-400">
                    Get notified when your traffic generates conversions.
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={
                    settings.conversionNotifications
                  }
                  onChange={(event) =>
                    updateField(
                      "conversionNotifications",
                      event.target.checked
                    )
                  }
                  className="h-5 w-5 shrink-0 accent-indigo-500"
                />
              </label>

              {/* Payment Notifications */}
              <label className="flex cursor-pointer items-center justify-between gap-4 p-5 transition hover:bg-white/[0.02] sm:px-6">
                <div>
                  <div className="font-medium">
                    Payment Notifications
                  </div>

                  <div className="mt-1 text-sm text-slate-400">
                    Get notified about payment status and earnings.
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={
                    settings.paymentNotifications
                  }
                  onChange={(event) =>
                    updateField(
                      "paymentNotifications",
                      event.target.checked
                    )
                  }
                  className="h-5 w-5 shrink-0 accent-indigo-500"
                />
              </label>
            </div>
          </section>

          {/* Save */}
          <div className="sticky bottom-4 z-20">
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0b101c]/95 p-4 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-slate-500">
                Changes are saved to your affiliate account.
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
  }
