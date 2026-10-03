"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Copy,
  Globe2,
  Laptop,
  Link2,
  MousePointerClick,
  RefreshCw,
  Smartphone,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  affiliateId: string;
  email?: string | null;
  name?: string | null;
};

type ClickRow = {
  click_id: string;
  affiliate_id: string;
  smartlink_id?: string | null;
  country?: string | null;
  device?: string | null;
  browser?: string | null;
  referer?: string | null;
  status?: string | null;
  payout?: number | null;
  converted_at?: string | null;
  created_at: string;
};

type DailyStat = {
  date: string;
  label: string;
  clicks: number;
  conversions: number;
};

type RecentConversion = {
  clickId: string;
  country: string;
  payout: number;
  convertedAt: string;
};

type ClickStats = {
  today: number;
  yesterday: number;
  month: number;
  total: number;
  leads: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
  daily: DailyStat[];
  recentConversions: RecentConversion[];
};

const emptyStats: ClickStats = {
  today: 0,
  yesterday: 0,
  month: 0,
  total: 0,
  leads: 0,
  conversions: 0,
  revenue: 0,
  conversionRate: 0,
  daily: [],
  recentConversions: [],
};

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date = new Date()) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  className,
  iconClassName,
  trend,
  prefix,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  className: string;
  iconClassName: string;
  trend?: string;
  prefix?: string;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-white/10 p-5 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${className}`}
    >
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/10 blur-2xl" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-white/75">
            {title}
          </p>

          <div className="mt-3 flex items-baseline gap-1">
            {prefix && (
              <span className="text-xl font-bold text-white/80">
                {prefix}
              </span>
            )}

            <h3 className="text-3xl font-bold tracking-tight text-white">
              {value}
            </h3>
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs text-white/70">
            {trend && (
              <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
                <ArrowUpRight size={12} />
                {trend}
              </span>
            )}

            <span>{subtitle}</span>
          </div>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 shadow-inner ${iconClassName}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AffiliateDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ClickStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        setError("You are not logged in.");
        return;
      }

      // ==========================================
      // LOAD PROFILE
      // ==========================================

      const { data: affiliateProfile, error: profileError } =
        await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        console.error(
          "Profile loading error:",
          profileError
        );

        throw new Error(
          "Unable to load your affiliate profile."
        );
      }

      if (!affiliateProfile) {
        throw new Error(
          "Your affiliate profile does not exist in the profiles table."
        );
      }

      // ==========================================
      // FIND EXISTING AFFILIATE ID
      // ==========================================

      let affiliateId =
        affiliateProfile.affiliate_id ||
        affiliateProfile.affiliateId ||
        affiliateProfile.affiliate_code ||
        affiliateProfile.code ||
        "";

      // ==========================================
      // CREATE AFFILIATE ID IF MISSING
      // ==========================================

      if (!affiliateId) {
        const generatedAffiliateId =
          `UP${user.id
            .replace(/-/g, "")
            .slice(0, 10)
            .toUpperCase()}`;

        const { data: updatedProfile, error: updateError } =
          await supabase
            .from("profiles")
            .update({
              affiliate_id: generatedAffiliateId,
            })
            .eq("id", user.id)
            .select("*")
            .maybeSingle();

        if (updateError) {
          console.error(
            "Affiliate ID creation error:",
            updateError
          );

          throw new Error(
            "Affiliate ID could not be created. Please check the profiles table update permission in Supabase."
          );
        }

        affiliateId =
          updatedProfile?.affiliate_id ||
          generatedAffiliateId;
      }

      affiliateId = String(affiliateId).trim();

      if (!affiliateId) {
        throw new Error(
          "Affiliate ID is still unavailable."
        );
      }

      const affiliateName =
        affiliateProfile.full_name ||
        affiliateProfile.name ||
        user.email?.split("@")[0] ||
        "Affiliate";

      const currentProfile: Profile = {
        id: user.id,
        affiliateId,
        email: user.email,
        name: affiliateName,
      };

      setProfile(currentProfile);

      // ==========================================
      // LOAD CLICKS
      // ==========================================

      const { data: clicks, error: clicksError } =
        await supabase
          .from("clicks")
          .select(
            "click_id, affiliate_id, smartlink_id, country, device, browser, referer, status, payout, converted_at, created_at"
          )
          .eq(
            "affiliate_id",
            affiliateId
          )
          .order("created_at", {
            ascending: false,
          });

      if (clicksError) {
        console.error(
          "Clicks loading error:",
          clicksError
        );

        throw new Error(
          "Unable to load click statistics."
        );
      }

      const rows = (clicks || []) as ClickRow[];

      // ==========================================
      // DATE RANGES
      // ==========================================

      const now = new Date();

      const todayStart = startOfDay(now);

      const yesterdayStart = new Date(
        todayStart
      );

      yesterdayStart.setDate(
        yesterdayStart.getDate() - 1
      );

      const monthStart = startOfMonth(now);

      // ==========================================
      // BASIC STATS
      // ==========================================

      const today = rows.filter(
        (row) =>
          new Date(row.created_at) >=
          todayStart
      ).length;

      const yesterday = rows.filter(
        (row) => {
          const date = new Date(
            row.created_at
          );

          return (
            date >= yesterdayStart &&
            date < todayStart
          );
        }
      ).length;

      const month = rows.filter(
        (row) =>
          new Date(row.created_at) >=
          monthStart
      ).length;

      const total = rows.length;

      // ==========================================
      // CONVERSION DETECTION
      // ==========================================
